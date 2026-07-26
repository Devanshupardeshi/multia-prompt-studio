"use client";

import { openaiAuthHeaders } from "@openai-oauth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { readPngResponse } from "@/lib/png-response";
import { Header } from "@/components/prompt-studio/header";
import { PosterStudioClarification } from "@/components/prompt-studio/poster-studio-clarification";
import { PosterStudioForm } from "@/components/prompt-studio/poster-studio-form";
import { PosterStudioOutput, type PosterImageState } from "@/components/prompt-studio/poster-studio-output";
import type { PosterClarificationQuestion, PosterConcept, PosterStudioPayload } from "@/lib/poster-types";
import { validatePosterConcept } from "@/lib/poster-types";

interface ConceptResponse {
  status?: unknown;
  questions?: unknown;
  concept?: unknown;
  json?: unknown;
  error?: unknown;
}

function parseClarificationQuestions(value: unknown): PosterClarificationQuestion[] | null {
  if (!Array.isArray(value)) return null;
  const questions = value.filter(
    (item): item is PosterClarificationQuestion =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as PosterClarificationQuestion).id === "string" &&
      typeof (item as PosterClarificationQuestion).question === "string" &&
      Array.isArray((item as PosterClarificationQuestion).options) &&
      (item as PosterClarificationQuestion).options.length === 3,
  );
  return questions.length > 0 ? questions : null;
}

function errorMessage(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

async function getAuthHeaders() {
  const headers = await openaiAuthHeaders();
  if (Object.keys(headers).length === 0) {
    throw new Error("Sign in with ChatGPT to use Poster Design Studio.");
  }
  return headers;
}

export default function PosterDesignPage() {
  const [concept, setConcept] = useState<PosterConcept | null>(null);
  const [promptJson, setPromptJson] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<PosterStudioPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageState, setImageState] = useState<PosterImageState>({ status: "idle" });
  const [clarification, setClarification] = useState<PosterClarificationQuestion[] | null>(null);
  const conceptRequestId = useRef(0);
  const imageRequestId = useRef(0);

  // The artwork is a multi-megabyte object URL, so release the previous one rather
  // than leaking one per generation.
  const artworkUrl = useRef<string | null>(null);
  const replaceArtworkUrl = useCallback((next: string | null) => {
    if (artworkUrl.current && artworkUrl.current !== next) {
      URL.revokeObjectURL(artworkUrl.current);
    }
    artworkUrl.current = next;
  }, []);

  useEffect(() => () => replaceArtworkUrl(null), [replaceArtworkUrl]);

  const runImage = useCallback(
    async (nextConcept: PosterConcept, payload: PosterStudioPayload, nextPromptJson: string) => {
      const requestId = ++imageRequestId.current;
      setImageState({ status: "loading" });

      let headers: Awaited<ReturnType<typeof openaiAuthHeaders>>;
      try {
        headers = await getAuthHeaders();
      } catch {
        if (imageRequestId.current === requestId) setImageState({ status: "signed-out" });
        return;
      }

      try {
        const response = await fetch("/api/generate-poster-image", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: nextPromptJson,
            negativePrompt: nextConcept.negativePrompt,
            modelCategory: payload.modelCategory,
            referencePosterId: nextConcept.referenceMatch.approvedPosterId,
            width: payload.outputSize.width,
            height: payload.outputSize.height,
          }),
        });
        if (imageRequestId.current !== requestId) return;
        if (response.status === 401) {
          setImageState({ status: "signed-out" });
          return;
        }

        // Success is a binary PNG stream; failures are still JSON.
        if (response.ok && response.headers.get("Content-Type")?.startsWith("image/")) {
          const decoded = await readPngResponse(response);
          if (imageRequestId.current !== requestId) {
            URL.revokeObjectURL(decoded.image);
            return;
          }
          replaceArtworkUrl(decoded.image);
          setImageState({
            status: "success",
            image: decoded.image,
            width: decoded.width,
            height: decoded.height,
            sourceWidth: decoded.sourceWidth,
            sourceHeight: decoded.sourceHeight,
            upscaled: decoded.upscaled,
            quality: "high",
            promptLengthBefore: decoded.number("promptLengthBefore"),
            compactContractLength: decoded.number("compactContractLength"),
            promptLengthAfter: decoded.number("promptLengthAfter"),
          });
          return;
        }

        const result = (await response.json().catch(() => ({}))) as { error?: unknown };
        setImageState({
          status: "error",
          error: errorMessage(result.error, `Artwork generation failed (HTTP ${response.status}).`),
        });
      } catch (requestError) {
        if (imageRequestId.current !== requestId) return;
        setImageState({
          status: "error",
          error: requestError instanceof Error ? requestError.message : "Artwork generation failed.",
        });
      }
    },
    [replaceArtworkUrl],
  );

  const runConcept = useCallback(
    async (payload: PosterStudioPayload) => {
      const requestId = ++conceptRequestId.current;
      imageRequestId.current += 1;
      setLastPayload(payload);
      setConcept(null);
      setPromptJson(null);
      setError(null);
      setClarification(null);
      setImageState({ status: "idle" });
      setIsLoading(true);

      let headers: Awaited<ReturnType<typeof openaiAuthHeaders>>;
      try {
        headers = await getAuthHeaders();
      } catch (authError) {
        if (conceptRequestId.current === requestId) {
          setError(
            authError instanceof Error &&
              !/oauth session not found|not authenticated|unauthenticated/i.test(authError.message)
              ? authError.message
              : "Sign in with ChatGPT to use Poster Design Studio.",
          );
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await fetch("/api/generate-poster", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = (await response.json().catch(() => ({}))) as ConceptResponse;
        if (conceptRequestId.current !== requestId) return;

        if (response.ok && result.status === "clarification") {
          const questions = parseClarificationQuestions(result.questions);
          if (questions) {
            setClarification(questions);
            setIsLoading(false);
            window.setTimeout(() => {
              document.getElementById("poster-studio-clarification")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 80);
            return;
          }
        }

        if (
          response.ok &&
          validatePosterConcept(result.concept, {
            topic: payload.topic,
            expectedCanvas: payload.outputSize,
          }) &&
          typeof result.json === "string" &&
          result.json.trim()
        ) {
          setConcept(result.concept);
          setPromptJson(result.json);
          setIsLoading(false);
          window.setTimeout(() => {
            document.getElementById("poster-studio-output")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 80);
          void runImage(result.concept, payload, result.json);
          return;
        }

        setError(errorMessage(result.error, `Poster concept generation failed (HTTP ${response.status}).`));
      } catch (requestError) {
        if (conceptRequestId.current !== requestId) return;
        setError(requestError instanceof Error ? requestError.message : "Poster concept generation failed.");
      } finally {
        if (conceptRequestId.current === requestId) setIsLoading(false);
      }
    },
    [runImage],
  );

  const regenerate = useCallback(() => {
    if (lastPayload) void runConcept(lastPayload);
  }, [lastPayload, runConcept]);

  const retryImage = useCallback(() => {
    if (concept && lastPayload && promptJson) void runImage(concept, lastPayload, promptJson);
  }, [concept, lastPayload, promptJson, runImage]);

  const submitClarificationAnswers = useCallback(
    (answers: Record<string, string>) => {
      if (!lastPayload) return;
      const questionTexts = Object.fromEntries(
        (clarification ?? [])
          .filter((question) => answers[question.id])
          .map((question) => [question.question, answers[question.id]]),
      );
      void runConcept({ ...lastPayload, clarificationAnswers: questionTexts });
    },
    [clarification, lastPayload, runConcept],
  );

  return (
    <main className="poster-page relative min-h-screen noise-overlay">
      <Header activeStudio="poster" />

      <section className="poster-standard-hero">
        <div className="max-w-[1200px] mx-auto">
          <div className="poster-standard-kicker"><span />MF Corner campaign system</div>
          <h1 className="font-display"><span>Design the poster.</span><span>Keep the campaign.</span></h1>
          <p>
            Build a strict JSON production prompt, match an approved CNBC × Bandhan Mutual
            Fund layout, and render editable poster-ready artwork from the same contract.
          </p>
          <div className="poster-reference-summary" aria-label="Reference coverage">
            <span><strong>13</strong> approved posters</span>
            <span><strong>08</strong> design-system assets</span>
            <span><strong>18</strong> illustration references</span>
            <span>Ubuntu for poster typography</span>
          </div>
        </div>
      </section>

      <div className="max-w-[1200px] mx-auto px-6"><div className="h-px bg-white/5" /></div>

      <div className="poster-standard-content">
        <PosterStudioForm isLoading={isLoading} onGenerate={runConcept} />
      </div>

      {clarification && (
        <>
          <div className="max-w-[1200px] mx-auto px-6"><div className="h-px bg-white/5" /></div>
          <div id="poster-studio-clarification" className="poster-standard-content scroll-mt-24">
            <PosterStudioClarification
              questions={clarification}
              isLoading={isLoading}
              onSubmit={submitClarificationAnswers}
            />
          </div>
        </>
      )}

      <div className="max-w-[1200px] mx-auto px-6"><div className="h-px bg-white/5" /></div>

      <div id="poster-studio-output" className="poster-standard-output scroll-mt-24">
        <PosterStudioOutput
          concept={concept}
          promptJson={promptJson}
          payload={lastPayload}
          isLoading={isLoading}
          error={error}
          imageState={imageState}
          onRegenerate={regenerate}
          onRetryImage={retryImage}
        />
      </div>

      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-baseline gap-1"><span className="font-display text-lg text-white/60">Multia</span><span className="text-[9px] text-white/30 uppercase tracking-widest">.in</span></div>
          <p className="text-xs text-white/25 font-body">Generated artwork stays separate from editable typography and official-logo layers.</p>
          <a href="https://multia.in" target="_blank" rel="noopener noreferrer" className="text-xs text-white/30 hover:text-white/60 transition-colors font-body uppercase tracking-wider">multia.in</a>
        </div>
      </footer>
    </main>
  );
}
