"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Header } from "@/components/prompt-studio/header";
import { Hero } from "@/components/prompt-studio/hero";
import { InputForm } from "@/components/prompt-studio/input-form";
import { OutputDisplay } from "@/components/prompt-studio/output-display";
import { Footer } from "@/components/prompt-studio/footer";
import { useDailyPromptCount } from "@/lib/use-daily-prompt-count";

import { GeneratePayload, GenerationMode } from "@/lib/shared-types";

// Never auto-wait longer than this for the pool to free up (longer waits ⇒ a daily
// reset, which we surface as a message instead of holding the spinner).
const POOL_WAIT_CAP_MS = 120_000;

// Each mode keeps its OWN result so switching modes never shows another mode's
// prompt — and returning to a mode restores exactly what was there.
type ModeResult = {
  json: string | null;
  error: string | null;
  lastInput?: GeneratePayload;
  queuedUntil: number | null;
  queueMessage: string | null;
};

export default function Home() {
  const [currentMode, setCurrentMode] = useState<GenerationMode>("standard");
  const [byMode, setByMode] = useState<Record<string, ModeResult>>({});
  const [loadingMode, setLoadingMode] = useState<string | null>(null);
  const { count: dailyPromptCount } = useDailyPromptCount();

  const retryTimer = useRef<number | null>(null);
  const runRef = useRef<(payload: GeneratePayload) => void>(() => {});

  useEffect(() => {
    return () => {
      if (retryTimer.current) window.clearTimeout(retryTimer.current);
    };
  }, []);

  const patchMode = useCallback((mode: string, patch: Partial<ModeResult>) => {
    setByMode((prev) => {
      const existing: ModeResult =
        prev[mode] ?? { json: null, error: null, queuedUntil: null, queueMessage: null };
      return { ...prev, [mode]: { ...existing, ...patch } };
    });
  }, []);

  const runGenerate = useCallback(
    async (payload: GeneratePayload) => {
      const mode = payload.mode;
      setLoadingMode(mode);
      patchMode(mode, {
        json: null,
        error: null,
        lastInput: payload,
        queuedUntil: null,
        queueMessage: null,
      });

      const clearLoading = () => setLoadingMode((cur) => (cur === mode ? null : cur));

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        // Guard against non-JSON responses (e.g. an HTML error page from a proxy).
        const result = await response.json().catch(() => ({}));

        if (response.ok && typeof result.json === "string") {
          patchMode(mode, { json: result.json, error: null, queuedUntil: null, queueMessage: null });
          clearLoading();
          return;
        }

        // Pool drained — queue with a live countdown and auto-retry when a key frees up.
        if (result.poolBusy) {
          const retryAfterMs: number | null =
            typeof result.retryAfterMs === "number" ? result.retryAfterMs : null;

          if (retryAfterMs !== null && retryAfterMs <= POOL_WAIT_CAP_MS) {
            const waitMs = Math.max(1500, retryAfterMs + 1500);
            patchMode(mode, { queuedUntil: Date.now() + waitMs, queueMessage: "Waiting for a free key…" });
            // keep loadingMode = mode so the queue UI stays visible
            retryTimer.current = window.setTimeout(() => runRef.current(payload), waitMs);
            return;
          }

          const when = result.soonestRecoveryAt
            ? new Date(result.soonestRecoveryAt).toLocaleString()
            : null;
          patchMode(mode, {
            error: when
              ? `All keys have hit their daily limit. Capacity returns around ${when}. Please try again later.`
              : result.error || "All keys are busy right now. Please try again shortly.",
            queuedUntil: null,
            queueMessage: null,
          });
          clearLoading();
          return;
        }

        patchMode(mode, {
          error: result.error || "Failed to generate prompt",
          queuedUntil: null,
          queueMessage: null,
        });
        clearLoading();
      } catch (err) {
        patchMode(mode, {
          error: err instanceof Error ? err.message : "Something went wrong",
          queuedUntil: null,
          queueMessage: null,
        });
        clearLoading();
      }
    },
    [patchMode]
  );

  useEffect(() => {
    runRef.current = runGenerate;
  }, [runGenerate]);

  const handleGenerate = useCallback(
    (payload: GeneratePayload) => {
      if (retryTimer.current) {
        window.clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
      setCurrentMode(payload.mode);
      runGenerate(payload);
    },
    [runGenerate]
  );

  const handleRegenerate = useCallback(() => {
    const cur = byMode[currentMode];
    if (cur?.lastInput) handleGenerate(cur.lastInput);
  }, [byMode, currentMode, handleGenerate]);

  // Switching modes just changes which mode is shown — each mode keeps its own
  // inputs (in the form) and its own output (here).
  const handleModeChange = useCallback((mode: GenerationMode) => {
    setCurrentMode(mode);
  }, []);

  const cur = byMode[currentMode];
  const showLoading = loadingMode === currentMode;
  const li = cur?.lastInput;

  return (
    <main className="relative min-h-screen noise-overlay">
      <Header dailyPromptCount={dailyPromptCount} />

      <Hero />

      {/* Divider */}
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="h-px bg-white/5" />
      </div>

      <InputForm onGenerate={handleGenerate} isLoading={showLoading} onModeChange={handleModeChange} />

      {/* Divider */}
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="h-px bg-white/5" />
      </div>

      <OutputDisplay
        json={cur?.json ?? null}
        isLoading={showLoading}
        error={cur?.error ?? null}
        onRegenerate={handleRegenerate}
        mode={currentMode}
        queuedUntil={showLoading ? cur?.queuedUntil ?? null : null}
        queueMessage={showLoading ? cur?.queueMessage ?? null : null}
        hasImage={
          !!(
            (li?.referenceImages && li.referenceImages.length > 0) ||
            li?.sourceFaceImage ||
            li?.targetPoseImage ||
            li?.logoImage ||
            li?.mockupReferenceImage ||
            li?.productImage
          )
        }
      />

      <Footer />
    </main>
  );
}
