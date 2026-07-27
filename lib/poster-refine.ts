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

/** Marked area, as fractions of the artwork (0–1). */
export interface PosterRefineRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PosterRefineInput {
  instruction: string;
  invariants: PosterRefineInvariants;
  /** Set when the designer marked an area to change. */
  region?: PosterRefineRegion | null;
  /** Set when the designer attached a visual reference for the change. */
  hasReference?: boolean;
}

/**
 * Turns a marked box into words.
 *
 * The ChatGPT OAuth transport rejects the edits API's `mask` parameter, so a
 * region cannot be enforced pixel-wise. Describing it precisely — a named position
 * plus exact percentages — is what is actually available, and vision models follow
 * it reasonably well when the untouched-everything-else rule is stated alongside.
 */
export function describeRefineRegion(region: PosterRefineRegion): string {
  const centreX = region.x + region.width / 2;
  const centreY = region.y + region.height / 2;
  const vertical = centreY < 0.34 ? "upper" : centreY > 0.66 ? "lower" : "middle";
  const horizontal = centreX < 0.34 ? "left" : centreX > 0.66 ? "right" : "centre";
  const position = horizontal === "centre" ? `${vertical}-centre` : `${vertical} ${horizontal}`;

  const pct = (value: number) => Math.round(value * 1000) / 10;
  return `the ${position} area of the canvas, spanning x ${pct(region.x)}%–${pct(
    region.x + region.width,
  )}% and y ${pct(region.y)}%–${pct(region.y + region.height)}%`;
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

function formatBounds(label: string, bounds: PercentBounds) {
  return `${label}: x ${bounds.x}-${Math.round((bounds.x + bounds.width) * 100) / 100}%, y ${bounds.y}-${Math.round((bounds.y + bounds.height) * 100) / 100}%`;
}

export function buildPosterRefinePrompt(input: PosterRefineInput): string {
  const { instruction, invariants, region, hasReference } = input;
  const reserved = invariants.reserved.map((area) => formatBounds(area.label, area.bounds)).join("; ");

  const attachments = hasReference
    ? "ATTACHED IMAGES: the first is the poster artwork to edit. The second is a visual reference the designer supplied for the requested change — read its style, colour, shape or material as guidance only. Never paste, collage or reproduce the reference itself into the poster."
    : "ATTACHED IMAGE: the poster artwork to edit.";

  return `EDIT THE ATTACHED POSTER ARTWORK. This is a revision of an existing approved render, not a new poster.

${attachments}

WHAT TO CHANGE:
${instruction.trim()}

${
    region
      ? `WHERE: apply the change ONLY inside ${describeRefineRegion(region)}. Everything outside that area must come through completely unchanged — same shapes, same colours, same detail, pixel for pixel.`
      : "Apply the instruction to the whole image, changing as little as possible to achieve it."
  }

WHAT MUST NOT CHANGE (unless the instruction explicitly asks for it):
- The overall composition, the hero object and its meaning, and the visual style, material and lighting treatment of the existing artwork.
- Canvas ${invariants.canvas.width} x ${invariants.canvas.height}, same aspect ratio.
- The background stays a rich deep field in ${invariants.background}, never white, pale or empty.
- The background field and any type colour stay on the approved palette: ${invariants.palette.join(", ")}. The hero keeps its own real material colours.
- These regions stay quiet and completely empty for the editable overlay: ${reserved}.
- Generate no text, letters, words, numerals, pseudo-text, logos, brand marks, watermarks or signatures anywhere in the image.

Return the full poster artwork at the same canvas size, with the requested change applied and everything else preserved.`;
}
