import { describeRefineRegion, type PosterRefineRegion } from "./poster-refine";
import type { GenerationMode } from "./shared-types";

/**
 * Follow-up refinement for the Prompt Studio's image modes.
 *
 * Same idea as the poster path: the designer says only what should CHANGE and the
 * context travels with the request, so the brief never has to be restated. What
 * differs is what must be protected. A poster protects its palette and reserved
 * logo zones; standard mode protects the subject and style; face swap protects the
 * identity it just matched; mockup protects the logo artwork and the product it is
 * printed on. Refining without those locks is how a "make the background darker"
 * request comes back with a different face on it.
 */

export const STUDIO_REFINE_MODES = ["standard", "face_swap", "mockup"] as const;
export type StudioRefineMode = (typeof STUDIO_REFINE_MODES)[number];

export function isStudioRefineMode(mode: unknown): mode is StudioRefineMode {
  return typeof mode === "string" && (STUDIO_REFINE_MODES as readonly string[]).includes(mode);
}

interface ModeProfile {
  /** What the attached image is, in the model's terms. */
  subject: string;
  /** Locks specific to this mode, on top of the shared ones. */
  locks: string[];
  /** Starter instructions offered in the UI. */
  quickEdits: string[];
  /** One line of guidance shown above the field. */
  hint: string;
}

const MODE_PROFILES: Record<StudioRefineMode, ModeProfile> = {
  standard: {
    subject: "the generated image",
    locks: [
      "The subject and what it is doing, unless the instruction is about the subject itself.",
      "The rendering style, material treatment and lighting direction of the existing image.",
    ],
    quickEdits: [
      "Change the background, keep the subject exactly as it is",
      "Make the subject smaller and give it more breathing room",
      "Warm up the lighting and deepen the shadows",
      "Remove the clutter around the subject",
    ],
    hint: "Say only what should change — the subject, style and lighting carry over automatically.",
  },
  face_swap: {
    subject: "the generated face-swap image",
    locks: [
      "THE FACE IS LOCKED. Identity, bone structure, eye shape and spacing, nose, mouth, jawline, skin tone and any distinguishing marks must come through completely unchanged. This holds even when the instruction is about lighting, colour or grade — relight the scene around the face, never re-render the face itself.",
      "The head pose, gaze direction and the way the face meets the neck and hair.",
      "The rendering style and photographic treatment of the existing image.",
    ],
    quickEdits: [
      "Change the background, keep the face untouched",
      "Match the lighting on the body to the face",
      "Soften the edge where the face meets the hair",
      "Adjust the clothing, leave the face and pose alone",
    ],
    hint: "The face is locked automatically — describe the scene, lighting or clothing you want changed.",
  },
  mockup: {
    subject: "the generated product mockup",
    locks: [
      "THE LOGO ARTWORK IS LOCKED. Its shapes, proportions, letterforms, spacing and colours must come through exactly, and it must stay physically printed on the surface — following its curvature, sharing its lighting and picking up its material. Never redraw, re-letter, restyle or straighten it.",
      "The product itself: its type, form, material and the surface the artwork sits on, unless the instruction is about the product.",
      "The perspective and camera angle, unless the instruction asks for a different one.",
    ],
    quickEdits: [
      "Change the surface and background, keep the product and logo identical",
      "Move to a cleaner studio setup with softer shadows",
      "Show the product from a slightly higher angle",
      "Change the product colour, keep the logo exactly as printed",
    ],
    hint: "The logo artwork is locked automatically — describe the product, surface, angle or lighting.",
  },
};

export function getStudioRefineProfile(mode: StudioRefineMode) {
  return MODE_PROFILES[mode];
}

/** UI copy for a mode, safe to call with any mode (falls back to standard). */
export function getStudioRefineCopy(mode: GenerationMode) {
  return MODE_PROFILES[isStudioRefineMode(mode) ? mode : "standard"];
}

export interface StudioRefineInput {
  instruction: string;
  mode: StudioRefineMode;
  canvas: { width: number; height: number };
  region?: PosterRefineRegion | null;
  hasReference?: boolean;
}

export function buildStudioRefinePrompt(input: StudioRefineInput): string {
  const { instruction, mode, canvas, region, hasReference } = input;
  const profile = MODE_PROFILES[mode];

  const attachments = hasReference
    ? `ATTACHED IMAGES: the first is ${profile.subject} to edit. The second is a visual reference the designer supplied for the requested change — read its style, colour, shape or material as guidance only. Never paste, collage or reproduce the reference itself into the image.`
    : `ATTACHED IMAGE: ${profile.subject} to edit.`;

  return `EDIT THE ATTACHED IMAGE. This is a revision of an existing approved render, not a new image.

${attachments}

WHAT TO CHANGE:
${instruction.trim()}

${
    region
      ? `WHERE: apply the change ONLY inside ${describeRefineRegion(region)}. Everything outside that area must come through completely unchanged — same shapes, same colours, same detail, pixel for pixel.`
      : "Apply the instruction to the whole image, changing as little as possible to achieve it."
  }

WHAT MUST NOT CHANGE (unless the instruction explicitly asks for it):
${profile.locks.map((lock) => `- ${lock}`).join("\n")}
- Canvas ${canvas.width} x ${canvas.height}, same aspect ratio and framing.
- Do not add text, letters, words, numerals, watermarks or signatures that are not already part of the image.

Return the full image at the same canvas size, with the requested change applied and everything else preserved.`;
}
