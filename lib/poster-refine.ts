import type { PercentBounds, PosterSize } from "./poster-types";

/**
 * Follow-up refinement of an already-generated poster artwork.
 *
 * The point of this path is that the designer says only what should CHANGE —
 * "hero is too big", "make the background maroon" — and never restates the brief.
 * The context travels with the request instead: the previous artwork goes along as
 * the image being edited, and the campaign invariants below are re-attached by the
 * app. That is what keeps an edit from quietly breaking the palette, the reserved
 * logo zones or the no-text rule that the original generation obeyed.
 */

export interface PosterRefineInvariants {
  canvas: PosterSize;
  background: string;
  palette: string[];
  /** Regions that must stay empty for the editable overlay. */
  reserved: Array<{ label: string; bounds: PercentBounds }>;
}

export interface PosterRefineInput {
  instruction: string;
  invariants: PosterRefineInvariants;
  /** True when the designer marked a specific region to change. */
  hasMask: boolean;
}

export const MAX_REFINE_INSTRUCTION_CHARS = 600;

/**
 * Longest edge of the artwork sent up for editing. The render comes back at full
 * canvas size regardless — this input is guidance, and a full 2160x2700 PNG
 * base64-encoded would blow past the 4.5 MB request limit on Vercel.
 */
export const REFINE_UPLOAD_MAX_EDGE = 1024;

export function getRefineUploadSize(width: number, height: number) {
  const scale = Math.min(1, REFINE_UPLOAD_MAX_EDGE / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Converts a 0–1 region into pixel bounds on the uploaded image, clamped so a drag
 * that ran past the edge still produces a valid rectangle.
 */
export function getMaskRect(
  region: { x: number; y: number; width: number; height: number },
  size: { width: number; height: number },
) {
  const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
  const x = clamp01(region.x);
  const y = clamp01(region.y);
  const width = clamp01(region.width + x) - x;
  const height = clamp01(region.height + y) - y;

  return {
    x: Math.round(x * size.width),
    y: Math.round(y * size.height),
    width: Math.max(1, Math.round(width * size.width)),
    height: Math.max(1, Math.round(height * size.height)),
  };
}

function formatBounds(label: string, bounds: PercentBounds) {
  return `${label}: x ${bounds.x}-${Math.round((bounds.x + bounds.width) * 100) / 100}%, y ${bounds.y}-${Math.round((bounds.y + bounds.height) * 100) / 100}%`;
}

export function buildPosterRefinePrompt(input: PosterRefineInput): string {
  const { instruction, invariants, hasMask } = input;
  const reserved = invariants.reserved.map((area) => formatBounds(area.label, area.bounds)).join("; ");

  return `EDIT THE ATTACHED POSTER ARTWORK. This is a revision of an existing approved render, not a new poster.

WHAT TO CHANGE:
${instruction.trim()}

${
    hasMask
      ? "The attached mask marks the region to change. Apply the instruction inside that region only and leave every pixel outside it exactly as it is."
      : "Apply the instruction to the whole image, changing as little as possible to achieve it."
  }

WHAT MUST NOT CHANGE (unless the instruction explicitly asks for it):
- The overall composition, the hero object and its meaning, and the visual style, material and lighting treatment of the existing artwork.
- Canvas ${invariants.canvas.width} x ${invariants.canvas.height}, same aspect ratio.
- The background stays a rich deep field in ${invariants.background}, never white, pale or empty.
- Approved colours only: ${invariants.palette.join(", ")}.
- These regions stay quiet and completely empty for the editable overlay: ${reserved}.
- Generate no text, letters, words, numerals, pseudo-text, logos, brand marks, watermarks or signatures anywhere in the image.

Return the full poster artwork at the same canvas size, with the requested change applied and everything else preserved.`;
}
