import { clampBoundsToContainer } from "./poster-geometry";
import type {
  PercentBounds,
  PosterSize,
  PosterTextTreatment,
} from "./poster-types";

export type PosterEditableTextRole = "headline" | "subheading" | "body" | "cta";

export const POSTER_CTA_DECORATION = {
  background: "rgba(10, 50, 83, 0.82)",
  borderColour: "rgba(254, 254, 254, 0.76)",
  borderWidthCanvasRatio: 0.001,
  radiusHeightRatio: 0.16,
} as const;

const ROLE_MINIMUM_WIDTH_RATIOS: Record<PosterEditableTextRole, number> = {
  headline: 0.038,
  subheading: 0.02,
  body: 0.0157,
  cta: 0.011,
};

export function getTextMinimumFontSize(
  role: PosterEditableTextRole,
  canvasWidth: number,
) {
  return Math.max(8, Math.round(canvasWidth * ROLE_MINIMUM_WIDTH_RATIOS[role]));
}

export function getRenderedTextLines(
  treatment: PosterTextTreatment,
  role: PosterEditableTextRole,
) {
  const lines = (
    treatment.lineBreaks.length > 0
      ? treatment.lineBreaks
      : [treatment.content]
  )
    .map((line) => line.trim())
    .filter(Boolean);
  return role === "cta" ? lines.map((line) => line.toUpperCase()) : lines;
}

export function getPosterPreviewTextStyle(
  role: PosterEditableTextRole,
  treatment: PosterTextTreatment,
  canvasWidth: number,
) {
  return {
    fontSize: `${(treatment.fontSizePx / canvasWidth) * 100}cqw`,
    fontWeight: treatment.ubuntuWeight,
    lineHeight: treatment.lineHeight,
    letterSpacing: `${treatment.letterSpacingEm}em`,
    textAlign: treatment.alignment,
    textShadow: "none",
    boxShadow: "none",
    ...(role === "cta"
      ? {
          background: POSTER_CTA_DECORATION.background,
          border: `${POSTER_CTA_DECORATION.borderWidthCanvasRatio * 100}cqw solid ${POSTER_CTA_DECORATION.borderColour}`,
          borderRadius: `${POSTER_CTA_DECORATION.radiusHeightRatio * 100}%`,
        }
      : {}),
  };
}

export interface PosterTextFitInput {
  role: PosterEditableTextRole;
  treatment: PosterTextTreatment;
  bounds: PercentBounds;
  canvas: PosterSize;
}

export interface PosterTextFitResult {
  fits: boolean;
  widthFits: boolean;
  heightFits: boolean;
  minimumFontSize: number;
  widestLinePx: number;
  availableWidthPx: number;
  renderedHeightPx: number;
  availableHeightPx: number;
}

export type MeasurePosterText = (
  text: string,
  treatment: PosterTextTreatment,
) => number;

export function evaluatePosterTextFit(
  input: PosterTextFitInput,
  measureText: MeasurePosterText,
): PosterTextFitResult {
  const { role, treatment, bounds, canvas } = input;
  const lines = getRenderedTextLines(treatment, role);
  const horizontalInsetRatio = role === "cta" ? 0.1 : 0.05;
  const availableWidthPx =
    (bounds.width / 100) * canvas.width * (1 - horizontalInsetRatio);
  const availableHeightPx = (bounds.height / 100) * canvas.height * 0.9;
  const trackingPx = treatment.fontSizePx * treatment.letterSpacingEm;
  const widestLinePx =
    lines.length > 0
      ? Math.max(
          ...lines.map(
            (line) =>
              measureText(line, treatment) +
              Math.max(0, line.length - 1) * trackingPx,
          ),
        )
      : 0;
  const renderedHeightPx =
    lines.length * treatment.fontSizePx * treatment.lineHeight;
  const widthFits = widestLinePx <= availableWidthPx + 0.5;
  const heightFits = renderedHeightPx <= availableHeightPx + 0.5;
  return {
    fits: widthFits && heightFits,
    widthFits,
    heightFits,
    minimumFontSize: getTextMinimumFontSize(role, canvas.width),
    widestLinePx,
    availableWidthPx,
    renderedHeightPx,
    availableHeightPx,
  };
}

const ROLE_MAX_LINES: Record<PosterEditableTextRole, number> = {
  headline: 3,
  subheading: 3,
  body: 8,
  cta: 1,
};

function wrapWordsToWidth(
  words: string[],
  treatment: PosterTextTreatment,
  measureText: MeasurePosterText,
  fontSizePx: number,
  availableWidthPx: number,
  trackingPx: number,
): string[] {
  const candidate = { ...treatment, fontSizePx };
  const lineWidth = (line: string) =>
    measureText(line, candidate) + Math.max(0, line.length - 1) * trackingPx;
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word;
    if (!current || lineWidth(attempt) <= availableWidthPx) {
      current = attempt;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Re-wraps into more lines before shrinking below the readable floor: the
 * fixed `treatment.lineBreaks` a model or default proposes can be too few
 * lines for a narrow column even though the frame has plenty of spare
 * height, which previously forced fontSizePx straight to the floor and
 * still overflowed on width alone.
 */
export function fitPosterTextTreatment(
  input: PosterTextFitInput,
  measureText: MeasurePosterText,
) {
  const { role, treatment, bounds, canvas } = input;
  const initial = evaluatePosterTextFit(input, measureText);
  if (initial.fits) {
    return { treatment: input.treatment, result: initial };
  }

  const horizontalInsetRatio = role === "cta" ? 0.1 : 0.05;
  const availableWidthPx =
    (bounds.width / 100) * canvas.width * (1 - horizontalInsetRatio);
  const availableHeightPx = (bounds.height / 100) * canvas.height * 0.9;
  const minimumFontSize = getTextMinimumFontSize(role, canvas.width);
  const maxLines = ROLE_MAX_LINES[role];
  const words = treatment.content.trim().split(/\s+/).filter(Boolean);
  const startFontSize = Math.max(treatment.fontSizePx, minimumFontSize);

  let best: { fontSizePx: number; lines: string[] } | null = null;
  for (let fontSizePx = startFontSize; fontSizePx >= minimumFontSize; fontSizePx -= 1) {
    const trackingPx = fontSizePx * treatment.letterSpacingEm;
    const lines =
      words.length > 0
        ? wrapWordsToWidth(
            words,
            treatment,
            measureText,
            fontSizePx,
            availableWidthPx,
            trackingPx,
          )
        : [treatment.content];
    if (lines.length > maxLines) continue;
    const renderedHeightPx = lines.length * fontSizePx * treatment.lineHeight;
    const widestLinePx = Math.max(
      ...lines.map(
        (line) =>
          measureText(line, { ...treatment, fontSizePx }) +
          Math.max(0, line.length - 1) * trackingPx,
      ),
    );
    if (
      widestLinePx <= availableWidthPx + 0.5 &&
      renderedHeightPx <= availableHeightPx + 0.5
    ) {
      best = { fontSizePx, lines };
      break;
    }
  }

  if (!best) {
    // Genuinely does not fit even at the floor within the ideal max line
    // count: wrap ALL of it at the floor size regardless of line count.
    // Every word must survive — silently dropping the tail of required
    // copy is worse than showing it small, and the caller's overflow
    // check will correctly flag heightFits: false so the UI's "text
    // clipped" warning fires honestly instead of hiding lost content.
    const trackingPx = minimumFontSize * treatment.letterSpacingEm;
    const lines =
      words.length > 0
        ? wrapWordsToWidth(
            words,
            treatment,
            measureText,
            minimumFontSize,
            availableWidthPx,
            trackingPx,
          )
        : [treatment.content];
    best = { fontSizePx: minimumFontSize, lines };
  }

  const fittedTreatment = {
    ...treatment,
    fontSizePx: best.fontSizePx,
    lineBreaks: best.lines,
  };
  return {
    treatment: fittedTreatment,
    result: evaluatePosterTextFit(
      { ...input, treatment: fittedTreatment },
      measureText,
    ),
  };
}

export interface PosterTextRenderMetrics {
  left: number;
  top: number;
  width: number;
  height: number;
  inset: number;
  textX: number;
  lineBoxHeight: number;
  firstLineCenterY: number;
  lines: string[];
}

export function getPosterTextRenderMetrics(
  input: PosterTextFitInput,
): PosterTextRenderMetrics {
  const { treatment, bounds, canvas, role } = input;
  const left = (bounds.x / 100) * canvas.width;
  const top = (bounds.y / 100) * canvas.height;
  const width = (bounds.width / 100) * canvas.width;
  const height = (bounds.height / 100) * canvas.height;
  const inset = width * (role === "cta" ? 0.05 : 0.025);
  const lineBoxHeight = treatment.fontSizePx * treatment.lineHeight;
  const lines = getRenderedTextLines(treatment, role);
  const totalHeight = lines.length * lineBoxHeight;
  const firstLineCenterY = top + (height - totalHeight) / 2 + lineBoxHeight / 2;
  const textX =
    treatment.alignment === "center"
      ? left + width / 2
      : treatment.alignment === "right"
        ? left + width - inset
        : left + inset;
  return {
    left,
    top,
    width,
    height,
    inset,
    textX,
    lineBoxHeight,
    firstLineCenterY,
    lines,
  };
}

export interface FontFaceSetLike {
  load(font: string): PromiseLike<unknown>;
  check(font: string): boolean;
  readonly ready: PromiseLike<unknown>;
}

export async function loadUbuntuPosterFonts(fonts: FontFaceSetLike) {
  const declarations = [
    '400 32px "Ubuntu"',
    '500 32px "Ubuntu"',
    '700 32px "Ubuntu"',
  ];
  await Promise.all(declarations.map((declaration) => fonts.load(declaration)));
  await fonts.ready;
  const missing = declarations.filter((declaration) => !fonts.check(declaration));
  if (missing.length > 0) {
    throw new Error(
      "Ubuntu 400, 500 and 700 must finish loading before poster measurement or export.",
    );
  }
  return declarations;
}

export function scaleAspectLockedLogoBounds(
  current: PercentBounds,
  safeArea: PercentBounds,
  aspectRatio: number,
  canvas: PosterSize,
  nextWidthPercent: number,
) {
  const width = Math.min(Math.max(nextWidthPercent, 1), safeArea.width);
  const height =
    (width * canvas.width) / (Math.max(aspectRatio, 0.01) * canvas.height);
  const centered = {
    x: current.x + (current.width - width) / 2,
    y: current.y + (current.height - height) / 2,
    width,
    height,
  };
  return clampBoundsToContainer(centered, safeArea);
}

export function getPosterDownloadDescriptor(kind: "final" | "artwork") {
  return kind === "final"
    ? {
        label: "Download final poster",
        includesArtwork: true,
        includesText: true,
        includesLogos: true,
      }
    : {
        label: "Download artwork only",
        includesArtwork: true,
        includesText: false,
        includesLogos: false,
      };
}
