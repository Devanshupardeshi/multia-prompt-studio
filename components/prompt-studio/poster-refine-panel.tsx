"use client";

import { useCallback, useRef, useState } from "react";
import { fileToUploadDataUrl } from "@/lib/image-downscale-client";
import { MAX_REFINE_INSTRUCTION_CHARS } from "@/lib/poster-refine";

export interface RefineRegion {
  /** Fractions of the artwork, 0–1. */
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PosterRefinePanelProps {
  artwork: string;
  isBusy: boolean;
  error: string | null;
  /** Defaults to the Poster Studio's copy; the Prompt Studio passes per-mode text. */
  heading?: string;
  hint?: string;
  quickEdits?: string[];
  onSubmit: (
    instruction: string,
    region: RefineRegion | null,
    reference: string | null,
  ) => void;
}

const POSTER_QUICK_EDITS = [
  "Make the hero object smaller and give it more breathing room",
  "Deepen the background and reduce the texture behind the hero",
  "Increase the contrast between the hero and the background",
];

const POSTER_HINT =
  "Say only what should change — the brief, palette and reserved zones carry over automatically. Drag a box to point at an area, and attach a reference if the change is easier to show than to describe.";

const MIN_REGION = 0.02;

/**
 * Follow-up editing on a finished render. The designer says only what should
 * change; the invariants are re-attached server-side, so nothing has to be
 * restated. Optionally they drag a box over the artwork to limit the change to one
 * area, which travels as a described region (the OAuth transport rejects masks).
 *
 * Shared by the Poster Studio and the Prompt Studio's image modes — only the copy
 * and the starter edits differ, since what must be preserved is decided server-side
 * from the mode.
 */
export function PosterRefinePanel({
  artwork,
  isBusy,
  error,
  heading = "Change something about this artwork",
  hint = POSTER_HINT,
  quickEdits = POSTER_QUICK_EDITS,
  onSubmit,
}: PosterRefinePanelProps) {
  const [instruction, setInstruction] = useState("");
  const [region, setRegion] = useState<RefineRegion | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [referenceName, setReferenceName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  const pointOf = useCallback((event: React.PointerEvent) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  }, []);

  const handlePointerDown = (event: React.PointerEvent) => {
    if (isBusy) return;
    const point = pointOf(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag(point);
    setRegion(null);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!drag) return;
    const point = pointOf(event);
    if (!point) return;
    setRegion({
      x: Math.min(drag.x, point.x),
      y: Math.min(drag.y, point.y),
      width: Math.abs(point.x - drag.x),
      height: Math.abs(point.y - drag.y),
    });
  };

  const handlePointerUp = () => {
    setDrag(null);
    // A click rather than a drag means "no region", not a pinprick edit.
    setRegion((current) =>
      current && current.width >= MIN_REGION && current.height >= MIN_REGION ? current : null,
    );
  };

  // Downscaled on pick rather than size-checked, so a big file is accepted
  // instead of rejected — prepareRefineImage caps it again before upload anyway.
  const handleReference = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setReference(await fileToUploadDataUrl(file));
      setReferenceName(file.name);
      setUploadError("");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "That image could not be read.");
    }
  };

  const canSubmit = instruction.trim().length > 0 && !isBusy;

  return (
    <section className="poster-refine" aria-label="Refine the artwork">
      <div className="poster-block-heading">
        <div>
          <span>Follow-up</span>
          <h2>{heading}</h2>
        </div>
        <p>
{hint}
        </p>
      </div>

      <div className="poster-refine-body">
        <div
          ref={surfaceRef}
          className={`poster-refine-surface ${isBusy ? "is-busy" : ""}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          role="presentation"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={artwork} alt="The render being refined" draggable={false} />
          {region && (
            <span
              className="poster-refine-region"
              style={{
                left: `${region.x * 100}%`,
                top: `${region.y * 100}%`,
                width: `${region.width * 100}%`,
                height: `${region.height * 100}%`,
              }}
            />
          )}
          {!region && !drag && <span className="poster-refine-hint">Drag to mark an area (optional)</span>}
        </div>

        <div className="poster-refine-controls">
          <label className="poster-dark-field">
            <span className="poster-dark-label">
              <span>What should change?</span>
              <small>{instruction.length}/{MAX_REFINE_INSTRUCTION_CHARS}</small>
            </span>
            <textarea
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              disabled={isBusy}
              maxLength={MAX_REFINE_INSTRUCTION_CHARS}
              rows={4}
              className="input-multia poster-dark-input w-full px-4 py-3.5 text-[15px] resize-y"
              placeholder="e.g. Make the background darker and keep everything else exactly as it is"
            />
          </label>

          <div className="poster-refine-quick">
            {quickEdits.map((quick) => (
              <button
                type="button"
                key={quick}
                disabled={isBusy}
                onClick={() => setInstruction(quick)}
              >
                {quick}
              </button>
            ))}
          </div>

          <div className="poster-refine-reference">
            {reference ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={reference} alt="Attached reference" />
            ) : (
              <span className="poster-refine-reference-empty" aria-hidden="true" />
            )}
            <div>
              <label className="poster-upload-dark">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={isBusy}
                  onChange={handleReference}
                />
                {reference ? "Replace reference" : "Attach a reference image"}
              </label>
              {reference && (
                <button
                  type="button"
                  className="poster-refine-clear"
                  onClick={() => {
                    setReference(null);
                    setReferenceName("");
                  }}
                >
                  Remove
                </button>
              )}
              <small>
                Optional. Used as guidance for the change only — its style, colour or shape,
                never pasted into the poster.
              </small>
              {referenceName && <p className="poster-file-note">{referenceName}</p>}
              {uploadError && <p className="poster-file-error">{uploadError}</p>}
            </div>
          </div>

          <div className="poster-refine-actions">
            <button
              type="button"
              className="btn-multia btn-multia-sm"
              disabled={!canSubmit}
              onClick={() => onSubmit(instruction, region, reference)}
            >
              {isBusy ? "Refining…" : region ? "Refine this area" : "Refine artwork"}
            </button>
            {region && (
              <button type="button" className="poster-refine-clear" onClick={() => setRegion(null)}>
                Clear area
              </button>
            )}
          </div>

          {error && <p className="poster-file-error">{error}</p>}
        </div>
      </div>
    </section>
  );
}
