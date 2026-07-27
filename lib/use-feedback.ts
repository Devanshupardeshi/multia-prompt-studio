"use client";

import { useCallback, useRef, useState } from "react";
import type { FeedbackSource } from "./feedback";
import { downscaleImage } from "./image-downscale-client";

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

/** Longest edge of the stored thumbnail. The admin view shows it ~96px wide. */
const THUMBNAIL_MAX_EDGE = 768;

/**
 * Downscales the artwork to a small data URL.
 *
 * A 3840×2160 PNG is 5–20 MB, and ~1.37× that again as base64 — well past the
 * 4.5 MB request-body ceiling on Vercel, so the whole rating used to vanish with
 * a 413 that nothing surfaced. The admin panel renders a 96px thumbnail and the
 * real dimensions travel separately, so a 768px WebP is all that needs storing.
 */
async function toThumbnailDataUrl(source: string): Promise<string | null> {
  try {
    return await downscaleImage(source, { maxEdge: THUMBNAIL_MAX_EDGE, quality: 0.85 });
  } catch (error) {
    console.warn("Could not build a feedback thumbnail; sending the rating alone:", error);
    return null;
  }
}

async function postFeedback(body: Record<string, unknown>) {
  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    // Not shown to the user, but a silent drop is impossible to diagnose otherwise.
    // The route answers 200 with `ok: false` on a rejected write, so check both.
    if (!response.ok) {
      console.warn(`Feedback was not recorded (HTTP ${response.status}).`);
      return;
    }
    const result = await response.json().catch(() => null);
    if (result && result.ok === false) {
      console.warn("Feedback was rejected:", result.error ?? "unknown reason");
    }
  } catch (error) {
    console.warn("Feedback could not be sent:", error);
  }
}

/**
 * `dismissed` is the "Not now" state — the popup is gone but a reopen pill stays,
 * so a designer who wanted to look at the poster first can still rate it.
 * `sent` is terminal for that poster: one rating per render, never asked twice.
 */
export type FeedbackState = "hidden" | "open" | "dismissed" | "sent";

export function useFeedback(source: FeedbackSource) {
  const [state, setState] = useState<FeedbackState>("hidden");
  const [artwork, setArtwork] = useState<string | null>(null);
  const [isFailure, setIsFailure] = useState(false);

  const context = useRef<FeedbackContext>({});
  const imageSize = useRef<{ width: number; height: number } | null>(null);
  // Ask once per poster, not once per re-render.
  const askedFor = useRef<string | null>(null);
  // Posters already rated. A refinement of a rated poster must not ask again.
  const rated = useRef(new Set<string>());

  const askForRating = useCallback(
    (key: string, options: FeedbackContext & {
      artwork?: string | null;
      width?: number;
      height?: number;
      failed?: boolean;
    }) => {
      if (rated.current.has(key)) return;
      // A refinement of a poster still awaiting a rating refreshes the thumbnail
      // and context, but must not re-open a dialog the designer already closed.
      const alreadyAsked = askedFor.current === key;

      askedFor.current = key;
      context.current = options;
      imageSize.current =
        options.width && options.height ? { width: options.width, height: options.height } : null;
      setArtwork(options.artwork ?? null);
      setIsFailure(Boolean(options.failed));
      if (!alreadyAsked) setState("open");
    },
    [],
  );

  const submitRating = useCallback(
    async (rating: number, comment: string) => {
      const current = context.current;
      // Closed before the upload so this poster can never be rated twice, even if
      // the (deliberately slow) data-URL read is still in flight.
      setState("sent");
      if (askedFor.current) rated.current.add(askedFor.current);
      const image = artwork ? await toThumbnailDataUrl(artwork) : null;

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
    isOpen: state === "open",
    /** True after "Not now": show the reopen pill until it is rated. */
    canReopen: state === "dismissed",
    artwork,
    isFailure,
    dismiss: useCallback(() => setState((current) => (current === "open" ? "dismissed" : current)), []),
    reopen: useCallback(() => setState((current) => (current === "sent" ? current : "open")), []),
    askForRating,
    submitRating,
    reportError,
  };
}
