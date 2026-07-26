"use client";

import { useCallback, useRef, useState } from "react";
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
  onSubmit: (instruction: string, region: RefineRegion | null) => void;
}

const QUICK_EDITS = [
  "Make the hero object smaller and give it more breathing room",
  "Deepen the background and reduce the texture behind the hero",
  "Increase the contrast between the hero and the background",
];

const MIN_REGION = 0.02;

/**
 * Follow-up editing on a finished render. The designer says only what should
 * change; the brief, palette and reserved zones are re-attached by the caller, so
 * nothing has to be restated. Optionally they drag a box over the artwork to limit
 * the change to one area, which becomes the edit mask.
 */
export function PosterRefinePanel({ artwork, isBusy, error, onSubmit }: PosterRefinePanelProps) {
  const [instruction, setInstruction] = useState("");
  const [region, setRegion] = useState<RefineRegion | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
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

  const canSubmit = instruction.trim().length > 0 && !isBusy;

  return (
    <section className="poster-refine" aria-label="Refine the artwork">
      <div className="poster-block-heading">
        <div>
          <span>Follow-up</span>
          <h2>Change something about this artwork</h2>
        </div>
        <p>
          Say only what should change. The brief, palette and reserved zones carry over
          automatically. Drag a box on the artwork to limit the change to one area.
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
          <img src={artwork} alt="Generated poster artwork" draggable={false} />
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
              placeholder="e.g. The hero is too large — scale it down and lower it slightly"
            />
          </label>

          <div className="poster-refine-quick">
            {QUICK_EDITS.map((quick) => (
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

          <div className="poster-refine-actions">
            <button
              type="button"
              className="btn-multia btn-multia-sm"
              disabled={!canSubmit}
              onClick={() => onSubmit(instruction, region)}
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
