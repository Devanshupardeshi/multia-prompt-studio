"use client";

import { useEffect, useRef, useState } from "react";

interface FeedbackPromptProps {
  open: boolean;
  /** Thumbnail of what is being rated, if there is one. */
  artwork?: string | null;
  isFailure?: boolean;
  onDismiss: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void> | void;
}

const STARS = [1, 2, 3, 4, 5];

/**
 * Star rating asked once after a render finishes (or after a failure).
 *
 * Deliberately dismissible and non-blocking: the designer has already got their
 * poster, so this must never stand between them and the download. It also never
 * reports its own failure — a telemetry write going wrong is not the user's
 * problem, so a failed submit still closes cleanly.
 */
export function FeedbackPrompt({
  open,
  artwork,
  isFailure,
  onDismiss,
  onSubmit,
}: FeedbackPromptProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [isSending, setIsSending] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Reset between openings so a previous rating never leaks into the next poster.
  useEffect(() => {
    if (open) {
      setRating(0);
      setHovered(0);
      setComment("");
      setIsSending(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  if (!open) return null;

  const send = async () => {
    if (rating < 1 || isSending) return;
    setIsSending(true);
    try {
      await onSubmit(rating, comment.trim());
    } finally {
      onDismiss();
    }
  };

  const shown = hovered || rating;

  return (
    <div className="feedback-scrim" role="presentation" onClick={onDismiss}>
      <div
        ref={dialogRef}
        className="feedback-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="feedback-head">
          <div>
            <span>{isFailure ? "That did not work" : "How did this turn out?"}</span>
            <h2 id="feedback-title">
              {isFailure ? "Tell us what went wrong" : "Rate this poster"}
            </h2>
          </div>
          <button type="button" onClick={onDismiss} aria-label="Dismiss">✕</button>
        </div>

        <div className="feedback-body">
          {artwork && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artwork} alt="" className="feedback-thumb" />
          )}

          <div className="feedback-controls">
            <div
              className="feedback-stars"
              role="radiogroup"
              aria-label="Rating out of 5"
              onMouseLeave={() => setHovered(0)}
            >
              {STARS.map((star) => (
                <button
                  type="button"
                  key={star}
                  role="radio"
                  aria-checked={rating === star}
                  aria-label={`${star} star${star > 1 ? "s" : ""}`}
                  className={star <= shown ? "is-on" : ""}
                  onMouseEnter={() => setHovered(star)}
                  onFocus={() => setHovered(star)}
                  onClick={() => setRating(star)}
                >
                  ★
                </button>
              ))}
              <span className="feedback-stars-label">
                {shown ? `${shown}/5` : "Pick a rating"}
              </span>
            </div>

            <label className="feedback-comment">
              <span>Anything else? (optional)</span>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={2000}
                rows={3}
                placeholder={
                  isFailure
                    ? "What were you trying to make when it failed?"
                    : "e.g. the hero read well but the background felt flat"
                }
              />
            </label>

            <div className="feedback-actions">
              <button
                type="button"
                className="btn-multia btn-multia-sm"
                disabled={rating < 1 || isSending}
                onClick={send}
              >
                {isSending ? "Sending…" : "Send feedback"}
              </button>
              <button type="button" className="feedback-skip" onClick={onDismiss}>
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
