"use client";

import { useCallback, useRef, useState } from "react";
import type { FeedbackSource } from "./feedback";

/**
 * Client side of the feedback loop.
 *
 * Two paths: `askForRating` opens the popup once a render lands, and `reportError`
 * files a failure silently with no popup — the user already saw the error message,
 * so interrupting them again to say "we noticed" would be obnoxious.
 *
 * Every write is fire-and-forget. Feedback telemetry must never produce a visible
 * failure on top of whatever the user was already doing.
 */

export interface FeedbackContext {
  mode?: string | null;
  topic?: string | null;
  headline?: string | null;
  promptModel?: string | null;
  promptJson?: unknown;
}

async function postFeedback(body: Record<string, unknown>) {
  try {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Nothing to do and nothing worth telling the user.
  }
}

/** Object URLs cannot be posted, so the artwork is read into a data URL first. */
async function toDataUrl(source: string): Promise<string | null> {
  try {
    const response = await fetch(source);
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function useFeedback(source: FeedbackSource) {
  const [isOpen, setIsOpen] = useState(false);
  const [artwork, setArtwork] = useState<string | null>(null);
  const [isFailure, setIsFailure] = useState(false);

  const context = useRef<FeedbackContext>({});
  const imageSize = useRef<{ width: number; height: number } | null>(null);
  // Ask once per render, not once per re-render.
  const askedFor = useRef<string | null>(null);

  const askForRating = useCallback(
    (key: string, options: FeedbackContext & {
      artwork?: string | null;
      width?: number;
      height?: number;
      failed?: boolean;
    }) => {
      if (askedFor.current === key) return;
      askedFor.current = key;
      context.current = options;
      imageSize.current =
        options.width && options.height ? { width: options.width, height: options.height } : null;
      setArtwork(options.artwork ?? null);
      setIsFailure(Boolean(options.failed));
      setIsOpen(true);
    },
    [],
  );

  const submitRating = useCallback(
    async (rating: number, comment: string) => {
      const current = context.current;
      const image = artwork ? await toDataUrl(artwork) : null;

      await postFeedback({
        kind: "rating",
        source,
        rating,
        comment,
        mode: current.mode ?? null,
        topic: current.topic ?? null,
        headline: current.headline ?? null,
        promptModel: current.promptModel ?? null,
        promptJson: current.promptJson ?? null,
        image,
        imageWidth: imageSize.current?.width ?? null,
        imageHeight: imageSize.current?.height ?? null,
      });
    },
    [artwork, source],
  );

  /** Files a failure with no UI. Safe to call from any error branch. */
  const reportError = useCallback(
    (stage: string, message: string, ctx: FeedbackContext = {}) => {
      void postFeedback({
        kind: "error",
        source,
        errorStage: stage,
        errorMessage: message,
        mode: ctx.mode ?? null,
        topic: ctx.topic ?? null,
        headline: ctx.headline ?? null,
        promptModel: ctx.promptModel ?? null,
      });
    },
    [source],
  );

  return {
    isOpen,
    artwork,
    isFailure,
    dismiss: useCallback(() => setIsOpen(false), []),
    askForRating,
    submitRating,
    reportError,
  };
}
