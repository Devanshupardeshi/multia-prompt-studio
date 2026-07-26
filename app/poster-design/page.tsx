"use client";

import { openaiAuthHeaders } from "@openai-oauth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { readPngResponse } from "@/lib/png-response";
import { readEventStream } from "@/lib/stream-protocol";
import { useChatGptModels } from "@/lib/use-chatgpt-models";
import { prepareRefineImage } from "@/lib/poster-refine-client";
import type { RefineRegion } from "@/components/prompt-studio/poster-refine-panel";
import { Header } from "@/components/prompt-studio/header";
import { PosterStudioClarification } from "@/components/prompt-studio/poster-studio-clarification";
import { PosterStudioForm } from "@/components/prompt-studio/poster-studio-form";
import { ReasoningTrace } from "@/components/prompt-studio/reasoning-trace";
import {
  PosterStudioOutput,
  type PosterImageState,
  type SuccessfulPosterImage,
} from "@/components/prompt-studio/poster-studio-output";
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
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [progress, setProgress] = useState<{ message: string } | null>(null);
  const { models, promptModel, setPromptModel } = useChatGptModels();
  const conceptRequestId = useRef(0);
  const imageRequestId = useRef(0);

  // Re-rolling the same prompt is the cheapest way to a better render, so keep the
  // last few so they can be compared instead of lost. Each is a multi-megabyte
  // object URL, hence the hard cap and the explicit revoke on eviction.
  const MAX_RENDERS = 4;
  const [renders, setRenders] = useState<SuccessfulPosterImage[]>([]);
  const artworkUrls = useRef<string[]>([]);

  const trackArtworkUrl = useCallback((next: string) => {
    artworkUrls.current = [...artworkUrls.current, next];
    while (artworkUrls.current.length > MAX_RENDERS) {
      const evicted = artworkUrls.current.shift();
      if (evicted) URL.revokeObjectURL(evicted);
    }
  }, []);

  const clearArtworkUrls = useCallback(() => {
    artworkUrls.current.forEach((url) => URL.revokeObjectURL(url));
    artworkUrls.current = [];
    setRenders([]);
  }, []);

  useEffect(() => {
    const urls = artworkUrls;
    return () => urls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

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
          trackArtworkUrl(decoded.image);
          const rendered: SuccessfulPosterImage = {
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
          };
          setRenders((current) => [...current, rendered].slice(-MAX_RENDERS));
          setImageState(rendered);
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
    [trackArtworkUrl],
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
      setReasoning("");
      setProgress(null);
      // A new concept invalidates the old renders — they belong to a different prompt.
      clearArtworkUrls();
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
          body: JSON.stringify({ ...payload, promptModel }),
        });

        let result: ConceptResponse = {};
        let streamError: string | null = null;
        let sawResult = false;

        // Validation rejections short-circuit before the stream starts, so they come
        // back as ordinary JSON. Only a 2xx is an event stream.
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as ConceptResponse;
          if (conceptRequestId.current !== requestId) return;
          setProgress(null);
          setError(
            errorMessage(body.error, `Poster concept generation failed (HTTP ${response.status}).`),
          );
          setIsLoading(false);
          return;
        }

        // The concept route streams: status and reasoning arrive while the model
        // works, and the finished contract comes last.
        await readEventStream(response, (event) => {
          if (conceptRequestId.current !== requestId) return;
          if (event.type === "status") setProgress({ message: event.message });
          else if (event.type === "reasoning") {
            setReasoning((current) => (current + event.text).slice(-4000));
          } else if (event.type === "result") {
            sawResult = true;
            result = event.data as ConceptResponse;
          } else if (event.type === "error") streamError = event.error;
        });

        if (conceptRequestId.current !== requestId) return;
        setProgress(null);

        if (streamError) {
          setError(streamError);
          setIsLoading(false);
          return;
        }

        // A 2xx that produced neither a result nor an error means the stream was cut
        // off — almost always the platform killing a long request mid-flight. Saying
        // "HTTP 200" here would be actively misleading.
        if (!sawResult) {
          setError(
            "The connection closed before the poster concept finished. This usually means the request exceeded the hosting time limit — try again, or simplify the brief.",
          );
          setIsLoading(false);
          return;
        }

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

        // A result arrived but neither branch accepted it. Say which part was wrong
        // instead of printing a status code that was 200.
        console.error("Poster concept was rejected by the client:", result);
        setError(
          errorMessage(
            result.error,
            result.status === "clarification"
              ? "The clarifying questions came back in an unexpected shape. Try again."
              : "The poster concept came back incomplete — the production contract or its JSON was missing or failed validation. Try again.",
          ),
        );
      } catch (requestError) {
        if (conceptRequestId.current !== requestId) return;
        setError(requestError instanceof Error ? requestError.message : "Poster concept generation failed.");
      } finally {
        if (conceptRequestId.current === requestId) setIsLoading(false);
      }
    },
    [clearArtworkUrls, promptModel, runImage],
  );

  const regenerate = useCallback(() => {
    if (lastPayload) void runConcept(lastPayload);
  }, [lastPayload, runConcept]);

  // Same prompt, new roll. This is the cheapest quality lever available — the
  // concept is already approved, only the render varies.
  const retryImage = useCallback(() => {
    if (concept && lastPayload && promptJson) void runImage(concept, lastPayload, promptJson);
  }, [concept, lastPayload, promptJson, runImage]);

  // Follow-up edit of the current render. Reuses the same history, so a refinement
  // can be compared against what it came from and reverted by clicking back.
  const refineImage = useCallback(
    async (instruction: string, region: RefineRegion | null, reference: string | null) => {
      if (imageState.status !== "success" || !concept || !lastPayload) return;
      const requestId = ++imageRequestId.current;
      setRefineError(null);
      setIsRefining(true);

      try {
        const [image, referenceImage] = await Promise.all([
          prepareRefineImage(imageState.image),
          reference ? prepareRefineImage(reference) : Promise.resolve(undefined),
        ]);
        const headers = await getAuthHeaders();

        const response = await fetch("/api/refine-poster-image", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction,
            image,
            reference: referenceImage,
            region,
            invariants: {
              canvas: lastPayload.outputSize,
              background: concept.selectedColourCombination.background,
              palette: [
                concept.selectedColourCombination.background,
                ...concept.selectedColourCombination.accents,
              ],
              reserved: [
                ...concept.logoSafeAreas.map((area) => ({
                  label: `${area.logo} logo-safe area`,
                  bounds: area.boundsPercent,
                })),
              ],
            },
          }),
        });

        if (imageRequestId.current !== requestId) return;

        if (response.status === 401) {
          setRefineError("Sign in with ChatGPT to refine the artwork.");
          return;
        }

        if (response.ok && response.headers.get("Content-Type")?.startsWith("image/")) {
          const decoded = await readPngResponse(response);
          if (imageRequestId.current !== requestId) {
            URL.revokeObjectURL(decoded.image);
            return;
          }
          trackArtworkUrl(decoded.image);
          const rendered: SuccessfulPosterImage = {
            status: "success",
            image: decoded.image,
            width: decoded.width,
            height: decoded.height,
            sourceWidth: decoded.sourceWidth,
            sourceHeight: decoded.sourceHeight,
            upscaled: decoded.upscaled,
            quality: "high",
            promptLengthBefore: 0,
            compactContractLength: 0,
            promptLengthAfter: 0,
          };
          setRenders((current) => [...current, rendered].slice(-MAX_RENDERS));
          setImageState(rendered);
          return;
        }

        const result = (await response.json().catch(() => ({}))) as { error?: unknown };
        setRefineError(errorMessage(result.error, `Refinement failed (HTTP ${response.status}).`));
      } catch (requestError) {
        if (imageRequestId.current !== requestId) return;
        setRefineError(
          requestError instanceof Error ? requestError.message : "Refinement failed.",
        );
      } finally {
        if (imageRequestId.current === requestId) setIsRefining(false);
      }
    },
    [concept, imageState, lastPayload, trackArtworkUrl],
  );

  const selectRender = useCallback((index: number) => {
    setRenders((current) => {
      const chosen = current[index];
      if (chosen) setImageState(chosen);
      return current;
    });
  }, []);

  const submitClarificationAnswers = useCallback(
    (answers: Record<string, string>) => {
      if (!lastPayload) return;
      const questionTexts = Object.fromEntries(
        (clarification ?? [])
          .filter((question) => answers[question.id]?.trim())
          .map((question) => [question.question, answers[question.id].trim()]),
      );
      void runConcept({ ...lastPayload, clarificationAnswers: questionTexts });
    },
    [clarification, lastPayload, runConcept],
  );

  // Re-ask for figure options, carrying forward everything already shown so the
  // model has to reach for genuinely different objects instead of rewording.
  const requestDifferentOptions = useCallback(() => {
    if (!lastPayload || !clarification) return;
    const alreadyShown = clarification.flatMap((question) => question.options);
    const rejected = Array.from(
      new Set([...(lastPayload.rejectedFigures ?? []), ...alreadyShown]),
    ).slice(-24);
    void runConcept({ ...lastPayload, clarificationAnswers: undefined, rejectedFigures: rejected });
  }, [clarification, lastPayload, runConcept]);

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
        <PosterStudioForm
              isLoading={isLoading}
              onGenerate={runConcept}
              models={models}
              promptModel={promptModel}
              onPromptModelChange={setPromptModel}
            />
      </div>

      {clarification && (
        <>
          <div className="max-w-[1200px] mx-auto px-6"><div className="h-px bg-white/5" /></div>
          <div id="poster-studio-clarification" className="poster-standard-content scroll-mt-24">
            <PosterStudioClarification
              questions={clarification}
              onRequestDifferentOptions={requestDifferentOptions}
              isLoading={isLoading}
              onSubmit={submitClarificationAnswers}
            />
          </div>
        </>
      )}

      <div className="max-w-[1200px] mx-auto px-6"><div className="h-px bg-white/5" /></div>

      <div id="poster-studio-output" className="poster-standard-output scroll-mt-24">
        <ReasoningTrace
          text={reasoning}
          status={progress?.message ?? null}
          isActive={isLoading}
          idleLabel="Reading the brief"
        />
        <PosterStudioOutput
          concept={concept}
          promptJson={promptJson}
          payload={lastPayload}
          isLoading={isLoading}
          error={error}
          imageState={imageState}
          onRegenerate={regenerate}
          onRetryImage={retryImage}
          renders={renders}
          onSelectRender={selectRender}
          onRefine={refineImage}
          isRefining={isRefining}
          refineError={refineError}
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
