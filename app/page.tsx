"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { chatGptAuthHeaders, isMissingChatGptSession } from "@/lib/chatgpt-session";
import { readPngResponse } from "@/lib/png-response";
import { Header } from "@/components/prompt-studio/header";
import { Hero } from "@/components/prompt-studio/hero";
import { InputForm } from "@/components/prompt-studio/input-form";
import { OutputDisplay } from "@/components/prompt-studio/output-display";
import { Footer } from "@/components/prompt-studio/footer";
import { useDailyPromptCount } from "@/lib/use-daily-prompt-count";

import {
  GeneratePayload,
  GenerationMode,
  ImageRenderState,
  isImageMode,
  PromptEngine,
} from "@/lib/shared-types";

// Never auto-wait longer than this for the pool to free up (longer waits ⇒ a daily
// reset, which we surface as a message instead of holding the spinner).
const POOL_WAIT_CAP_MS = 120_000;

// Each mode keeps its OWN result so switching modes never shows another mode's
// prompt — and returning to a mode restores exactly what was there.
type ModeResult = {
  json: string | null;
  error: string | null;
  lastInput?: GeneratePayload;
  lastEngine?: PromptEngine;
  queuedUntil: number | null;
  queueMessage: string | null;
  image?: ImageRenderState;
};

const SIGN_IN_TO_GENERATE =
  "Sign in with ChatGPT (top-right) to generate a prompt with GPT-5.6 Sol.";

export default function Home() {
  const [currentMode, setCurrentMode] = useState<GenerationMode>("standard");
  const [byMode, setByMode] = useState<Record<string, ModeResult>>({});
  const [loadingMode, setLoadingMode] = useState<string | null>(null);
  const { count: dailyPromptCount } = useDailyPromptCount();

  const retryTimer = useRef<number | null>(null);
  const runRef = useRef<(payload: GeneratePayload, engine: PromptEngine) => void>(() => {});

  // One counter per mode so a newer run invalidates an in-flight render, and the
  // object URLs so replacing artwork doesn't leak several MB each time.
  const imageRequestId = useRef<Record<string, number>>({});
  const imageUrls = useRef<Record<string, string>>({});

  const replaceImageUrl = useCallback((mode: string, next: string | null) => {
    const previous = imageUrls.current[mode];
    if (previous && previous !== next) URL.revokeObjectURL(previous);
    if (next) imageUrls.current[mode] = next;
    else delete imageUrls.current[mode];
  }, []);

  useEffect(() => {
    return () => {
      if (retryTimer.current) window.clearTimeout(retryTimer.current);
      Object.values(imageUrls.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const patchMode = useCallback((mode: string, patch: Partial<ModeResult>) => {
    setByMode((prev) => {
      const existing: ModeResult =
        prev[mode] ?? { json: null, error: null, queuedUntil: null, queueMessage: null };
      return { ...prev, [mode]: { ...existing, ...patch } };
    });
  }, []);

  // Pass 2 of the GPT-5.6 Sol flow: hand the finished prompt to GPT Image 2.
  const runGenerateImage = useCallback(
    async (mode: GenerationMode, prompt: string) => {
      const requestId = (imageRequestId.current[mode] ?? 0) + 1;
      imageRequestId.current[mode] = requestId;
      const isStale = () => imageRequestId.current[mode] !== requestId;

      patchMode(mode, { image: { status: "loading" } });

      let authHeaders: Record<string, string>;
      try {
        authHeaders = await chatGptAuthHeaders();
      } catch (authError) {
        if (isStale()) return;
        patchMode(mode, {
          image: isMissingChatGptSession(authError)
            ? { status: "signed-out" }
            : {
                status: "error",
                error: authError instanceof Error ? authError.message : "Could not read the ChatGPT session.",
              },
        });
        return;
      }

      try {
        const response = await fetch("/api/generate-image", {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });

        if (isStale()) return;

        if (response.status === 401) {
          patchMode(mode, { image: { status: "signed-out" } });
          return;
        }

        // Success is a binary PNG stream; failures are still JSON.
        if (response.ok && response.headers.get("Content-Type")?.startsWith("image/")) {
          const decoded = await readPngResponse(response);
          if (isStale()) {
            URL.revokeObjectURL(decoded.image);
            return;
          }
          replaceImageUrl(mode, decoded.image);
          patchMode(mode, {
            image: {
              status: "success",
              image: decoded.image,
              width: decoded.width,
              height: decoded.height,
              sourceWidth: decoded.sourceWidth,
              sourceHeight: decoded.sourceHeight,
              upscaled: decoded.upscaled,
              quality: decoded.quality,
            },
          });
          return;
        }

        const result = await response.json().catch(() => ({}));
        patchMode(mode, {
          image: {
            status: "error",
            error: result.error || `Image generation failed (HTTP ${response.status}).`,
          },
        });
      } catch (err) {
        if (isStale()) return;
        patchMode(mode, {
          image: {
            status: "error",
            error: err instanceof Error ? err.message : "Image generation failed.",
          },
        });
      }
    },
    [patchMode, replaceImageUrl]
  );

  const runGenerate = useCallback(
    async (payload: GeneratePayload, engine: PromptEngine = "gemini") => {
      const mode = payload.mode;
      const viaChatGpt = engine === "chatgpt-5.6-sol";
      setLoadingMode(mode);
      // A new run invalidates whatever render the previous one kicked off.
      imageRequestId.current[mode] = (imageRequestId.current[mode] ?? 0) + 1;
      replaceImageUrl(mode, null);
      patchMode(mode, {
        json: null,
        error: null,
        lastInput: payload,
        lastEngine: engine,
        queuedUntil: null,
        queueMessage: null,
        image: { status: "idle" },
      });

      const clearLoading = () => setLoadingMode((cur) => (cur === mode ? null : cur));

      try {
        // The ChatGPT engine bills the user's own account, so it needs their bearer
        // token attached; the Gemini engine uses the server-side key pool.
        let authHeaders: Record<string, string> = {};
        if (viaChatGpt) {
          try {
            authHeaders = await chatGptAuthHeaders(SIGN_IN_TO_GENERATE);
          } catch (authError) {
            patchMode(mode, {
              error: authError instanceof Error ? authError.message : SIGN_IN_TO_GENERATE,
              queuedUntil: null,
              queueMessage: null,
            });
            clearLoading();
            return;
          }
        }

        const response = await fetch(viaChatGpt ? "/api/generate-chatgpt" : "/api/generate", {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        // Guard against non-JSON responses (e.g. an HTML error page from a proxy).
        const result = await response.json().catch(() => ({}));

        if (response.ok && typeof result.json === "string") {
          patchMode(mode, { json: result.json, error: null, queuedUntil: null, queueMessage: null });
          clearLoading();
          // Pass 2: this engine can render the prompt it just wrote.
          if (viaChatGpt && isImageMode(mode)) {
            void runGenerateImage(mode, result.json);
          }
          return;
        }

        if (viaChatGpt && response.status === 401) {
          patchMode(mode, {
            error: result.error || SIGN_IN_TO_GENERATE,
            queuedUntil: null,
            queueMessage: null,
          });
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
            retryTimer.current = window.setTimeout(() => runRef.current(payload, engine), waitMs);
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

        // No structured error means the platform killed the request before our
        // route could answer (timeout, payload limit) — say which one.
        const fallback =
          response.status === 504 || response.status === 502 || response.status === 524
            ? "The server timed out while generating (the model took too long). Try again — if it keeps happening, shorten the brief or remove attached images."
            : response.status === 413
              ? "Your attached images are too large for the server (limit ~4 MB total). Compress or resize them and try again."
              : `Failed to generate prompt (HTTP ${response.status}). Please try again.`;
        patchMode(mode, {
          error: result.error || fallback,
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
    [patchMode, replaceImageUrl, runGenerateImage]
  );

  useEffect(() => {
    runRef.current = runGenerate;
  }, [runGenerate]);

  const handleGenerate = useCallback(
    (payload: GeneratePayload, engine: PromptEngine = "gemini") => {
      if (retryTimer.current) {
        window.clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
      setCurrentMode(payload.mode);
      runGenerate(payload, engine);
    },
    [runGenerate]
  );

  // Regenerate stays on whichever engine produced the current result.
  const handleRegenerate = useCallback(() => {
    const cur = byMode[currentMode];
    if (cur?.lastInput) handleGenerate(cur.lastInput, cur.lastEngine ?? "gemini");
  }, [byMode, currentMode, handleGenerate]);

  const handleRetryImage = useCallback(() => {
    const cur = byMode[currentMode];
    if (cur?.json) void runGenerateImage(currentMode, cur.json);
  }, [byMode, currentMode, runGenerateImage]);

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
        image={cur?.image ?? { status: "idle" }}
        onRetryImage={handleRetryImage}
      />

      <Footer />
    </main>
  );
}
