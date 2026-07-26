import { getPosterGeometryErrors } from "./poster-geometry";

export type PosterModelCategory =
  | "mixed-media"
  | "glassmorphism-3d"
  | "illustrative";

export type PosterLayoutArchetype =
  | "centered-editorial-stack"
  | "split-brand-copy"
  | "left-copy-right-hero";

// MF Corner is the show name, not a supplied logo asset. It used to reserve a
// third safe area that rendered as an empty labelled box on every poster, so it is
// no longer part of the logo system or the layout.
export type PosterLogoId = "cnbc-tv18" | "bandhan-mutual-fund";

export interface PosterSize {
  width: number;
  height: number;
}

export type PosterBackgroundChoice = "auto" | "prussian-blue" | "maroon-navy";

// CNBC ships a 2x2: channel (TV18 | AWAAZ) x colour (blue for light backgrounds,
// white/reverse for dark ones). The campaign background is always a deep brand
// colour, so the white variants are the correct default.
export type PosterCnbcLogoVariant =
  | "tv18-white"
  | "tv18-blue"
  | "awaaz-white"
  | "awaaz-blue";
export type PosterBandhanLogoVariant = "dark-bg" | "light-bg";

export interface PosterClarificationQuestion {
  id: string;
  question: string;
  options: [string, string, string];
}

export type PosterConceptResult =
  | { status: "clarification"; questions: PosterClarificationQuestion[] }
  | { status: "complete"; concept: PosterConcept };

export interface PosterStudioPayload {
  mode: "poster-design";
  headline: string;
  subheading: string;
  bodyCopy: string;
  cta: string;
  topic: string;
  modelCategory: PosterModelCategory;
  visualDirection: string;
  referencePosterId?: string;
  referenceImage?: string;
  outputSize: PosterSize;
  backgroundChoice: PosterBackgroundChoice;
  // Optional: the variant is now chosen in the editor, not the brief.
  cnbcLogoVariant?: PosterCnbcLogoVariant;
  bandhanLogoVariant?: PosterBandhanLogoVariant;
  clarificationAnswers?: Record<string, string>;
  /** Figure options already shown and rejected, so "show different options" returns new ones. */
  rejectedFigures?: string[];
}

export interface PercentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PosterTextTreatment {
  content: string;
  include: boolean;
  lineBreaks: string[];
  priority: number;
  ubuntuWeight: 400 | 500 | 700;
  fontSizePx: number;
  lineHeight: number;
  letterSpacingEm: number;
  alignment: "left" | "center" | "right";
  maxLineLength: number;
  guidance: string;
}

export interface PosterSafeArea {
  logo: "CNBC" | "Bandhan Mutual Fund";
  boundsPercent: PercentBounds;
  instruction: string;
}

export interface PosterLayer {
  id: string;
  name: string;
  type: "background" | "image" | "text" | "logo" | "cta";
  zIndex: number;
  boundsPercent: PercentBounds;
  editable: boolean;
  notes: string;
  logo?: {
    id: PosterLogoId;
    brandName: string;
    assetPath: string;
    safeAreaBoundsPercent: PercentBounds;
    aspectRatioLocked: true;
    aspectRatio: number;
    fallback: "neutral-labelled-placeholder";
  };
}

export interface PosterFinancialNarrative {
  investorQuestion: string;
  heroMetaphor: string;
  visualMappings: Array<{
    element: string;
    financialMeaning: string;
  }>;
  relationship: string;
  guardrail: string;
}

export interface PosterConcept {
  conceptTitle: string;
  conceptExplanation: string;
  financialNarrative: PosterFinancialNarrative;
  layoutArchetype: PosterLayoutArchetype;
  recommendedLayoutDirection: string;
  referenceMatch: {
    approvedPosterId: string;
    label: string;
    reason: string;
    fidelitySignals: string[];
  };
  textHierarchy: {
    headline: PosterTextTreatment;
    subheading: PosterTextTreatment;
    bodyCopy: PosterTextTreatment;
    cta: PosterTextTreatment;
  };
  placementGuidance: {
    headline: string;
    subheading: string;
    bodyCopy: string;
    cta: string;
    centralVisual: string;
    negativeSpace: string;
    backgroundDetails: string;
  };
  logoSafeAreas: PosterSafeArea[];
  selectedColourCombination: {
    name: string;
    background: string;
    backgroundTreatment: string;
    accents: string[];
    textColours: string[];
    rationale: string;
  };
  selected3DModelReferenceCategory: {
    id: PosterModelCategory;
    label: string;
    application: string;
  };
  masterImageGenerationPrompt: string;
  negativePrompt: string;
  editablePosterLayoutSpecification: {
    canvas: PosterSize & { aspectRatio: string };
    outerMarginPercent: number;
    grid: string;
    layers: PosterLayer[];
    productionNotes: string[];
  };
  finalQualityControlChecklist: string[];
}

export interface PosterImageResult {
  image: string;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  upscaled: boolean;
  quality: "high";
  promptLengthBefore: number;
  compactContractLength: number;
  promptLengthAfter: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isBounds(value: unknown): value is PercentBounds {
  if (!isRecord(value)) return false;
  if (
    !["x", "y", "width", "height"].every(
      (key) => typeof value[key] === "number" && Number.isFinite(value[key]),
    )
  ) {
    return false;
  }
  const bounds = value as unknown as PercentBounds;
  return (
    bounds.x >= 0 &&
    bounds.y >= 0 &&
    bounds.width > 0 &&
    bounds.height > 0 &&
    bounds.x + bounds.width <= 100 &&
    bounds.y + bounds.height <= 100
  );
}

function isTextTreatment(value: unknown): value is PosterTextTreatment {
  if (!isRecord(value)) return false;
  return (
    typeof value.content === "string" &&
    typeof value.include === "boolean" &&
    isStringArray(value.lineBreaks) &&
    typeof value.priority === "number" &&
    [400, 500, 700].includes(value.ubuntuWeight as number) &&
    typeof value.fontSizePx === "number" &&
    typeof value.lineHeight === "number" &&
    typeof value.letterSpacingEm === "number" &&
    ["left", "center", "right"].includes(value.alignment as string) &&
    typeof value.maxLineLength === "number" &&
    typeof value.guidance === "string"
  );
}

function validatePosterConceptShape(value: unknown): value is PosterConcept {
  if (!isRecord(value)) return false;
  if (
    !isString(value.conceptTitle) ||
    !isString(value.conceptExplanation) ||
    ![
      "centered-editorial-stack",
      "split-brand-copy",
      "left-copy-right-hero",
    ].includes(value.layoutArchetype as string) ||
    !isString(value.recommendedLayoutDirection) ||
    !isString(value.masterImageGenerationPrompt) ||
    !isString(value.negativePrompt)
  ) {
    return false;
  }

  if (!isRecord(value.financialNarrative)) return false;
  const financialNarrative = value.financialNarrative;
  if (
    !isString(financialNarrative.investorQuestion) ||
    !isString(financialNarrative.heroMetaphor) ||
    !isString(financialNarrative.relationship) ||
    !isString(financialNarrative.guardrail) ||
    !Array.isArray(financialNarrative.visualMappings) ||
    financialNarrative.visualMappings.length < 2 ||
    !financialNarrative.visualMappings.every(
      (mapping) =>
        isRecord(mapping) &&
        isString(mapping.element) &&
        isString(mapping.financialMeaning),
    )
  ) {
    return false;
  }

  if (!isRecord(value.referenceMatch)) return false;
  if (
    !isString(value.referenceMatch.approvedPosterId) ||
    !isString(value.referenceMatch.label) ||
    !isString(value.referenceMatch.reason) ||
    !isStringArray(value.referenceMatch.fidelitySignals)
  ) {
    return false;
  }

  if (!isRecord(value.textHierarchy)) return false;
  if (
    !isTextTreatment(value.textHierarchy.headline) ||
    !isTextTreatment(value.textHierarchy.subheading) ||
    !isTextTreatment(value.textHierarchy.bodyCopy) ||
    !isTextTreatment(value.textHierarchy.cta)
  ) {
    return false;
  }

  if (!isRecord(value.placementGuidance)) return false;
  const placementGuidance = value.placementGuidance;
  if (
    ![
      "headline",
      "subheading",
      "bodyCopy",
      "cta",
      "centralVisual",
      "negativeSpace",
      "backgroundDetails",
    ].every((key) => typeof placementGuidance[key] === "string")
  ) {
    return false;
  }

  if (
    !Array.isArray(value.logoSafeAreas) ||
    value.logoSafeAreas.length !== 2 ||
    !value.logoSafeAreas.every(
      (area) =>
        isRecord(area) &&
        ["CNBC", "Bandhan Mutual Fund"].includes(area.logo as string) &&
        isBounds(area.boundsPercent) &&
        typeof area.instruction === "string",
    )
  ) {
    return false;
  }

  if (!isRecord(value.selectedColourCombination)) return false;
  if (
    !isString(value.selectedColourCombination.name) ||
    !isString(value.selectedColourCombination.background) ||
    !isString(value.selectedColourCombination.backgroundTreatment) ||
    !isStringArray(value.selectedColourCombination.accents) ||
    !isStringArray(value.selectedColourCombination.textColours) ||
    !isString(value.selectedColourCombination.rationale)
  ) {
    return false;
  }

  if (!isRecord(value.selected3DModelReferenceCategory)) return false;
  if (
    !["mixed-media", "glassmorphism-3d", "illustrative"].includes(
      value.selected3DModelReferenceCategory.id as string,
    ) ||
    !isString(value.selected3DModelReferenceCategory.label) ||
    !isString(value.selected3DModelReferenceCategory.application)
  ) {
    return false;
  }

  if (!isRecord(value.editablePosterLayoutSpecification)) return false;
  const specification = value.editablePosterLayoutSpecification;
  if (
    !isRecord(specification.canvas) ||
    typeof specification.canvas.width !== "number" ||
    typeof specification.canvas.height !== "number" ||
    !isString(specification.canvas.aspectRatio) ||
    typeof specification.outerMarginPercent !== "number" ||
    !isString(specification.grid) ||
    !isStringArray(specification.productionNotes) ||
    !Array.isArray(specification.layers) ||
    !specification.layers.every(
      (layer) =>
        isRecord(layer) &&
        isString(layer.id) &&
        isString(layer.name) &&
        ["background", "image", "text", "logo", "cta"].includes(
          layer.type as string,
        ) &&
        typeof layer.zIndex === "number" &&
        isBounds(layer.boundsPercent) &&
        typeof layer.editable === "boolean" &&
        typeof layer.notes === "string" &&
        (layer.type !== "logo" ||
          (isRecord(layer.logo) &&
            ["cnbc-tv18", "bandhan-mutual-fund"].includes(
              layer.logo.id as string,
            ) &&
            isString(layer.logo.brandName) &&
            isString(layer.logo.assetPath) &&
            isBounds(layer.logo.safeAreaBoundsPercent) &&
            layer.logo.aspectRatioLocked === true &&
            typeof layer.logo.aspectRatio === "number" &&
            layer.logo.aspectRatio > 0 &&
            layer.logo.fallback === "neutral-labelled-placeholder")),
    )
  ) {
    return false;
  }

  return isStringArray(value.finalQualityControlChecklist);
}

export interface PosterConceptValidationOptions {
  topic?: string;
  expectedCanvas?: PosterSize;
  requireGeometry?: boolean;
}

const TOPIC_STOP_WORDS = new Set([
  "about",
  "after",
  "against",
  "before",
  "between",
  "could",
  "from",
  "investing",
  "investment",
  "investor",
  "mutual",
  "fund",
  "funds",
  "should",
  "through",
  "understanding",
  "what",
  "when",
  "where",
  "which",
  "with",
  "your",
]);

function topicTokens(topic: string) {
  return Array.from(
    new Set(
      topic
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, " ")
        .split(/\s+/)
        .map((token) => token.replace(/^-+|-+$/g, ""))
        .filter((token) => token.length >= 3 && !TOPIC_STOP_WORDS.has(token)),
    ),
  );
}

function financialNarrativeText(concept: PosterConcept) {
  return [
    concept.financialNarrative.investorQuestion,
    concept.financialNarrative.heroMetaphor,
    concept.financialNarrative.relationship,
    concept.financialNarrative.guardrail,
    ...concept.financialNarrative.visualMappings.flatMap((mapping) => [
      mapping.element,
      mapping.financialMeaning,
    ]),
  ]
    .join(" ")
    .toLowerCase();
}

export function getPosterConceptValidationErrors(
  value: unknown,
  options: PosterConceptValidationOptions = {},
): string[] {
  if (!validatePosterConceptShape(value)) {
    return ["The poster concept does not match the required production-contract shape."];
  }

  const errors: string[] = [];
  const { width, height } = value.editablePosterLayoutSpecification.canvas;
  if (
    options.expectedCanvas &&
    (width !== options.expectedCanvas.width || height !== options.expectedCanvas.height)
  ) {
    errors.push(
      `Canvas ${width}x${height} does not match the requested ${options.expectedCanvas.width}x${options.expectedCanvas.height}.`,
    );
  }

  const narrative = financialNarrativeText(value);
  if (
    /\b(one physically credible financial system|primary grounded form|secondary connected form|specific part of the supplied topic|main investment subject)\b/i.test(
      narrative,
    )
  ) {
    errors.push("The financial semantic contract still contains a generic placeholder mapping.");
  }

  const tokens = options.topic ? topicTokens(options.topic) : [];
  if (tokens.length > 0 && !tokens.some((token) => narrative.includes(token))) {
    errors.push(
      `The financial semantic contract is not grounded in the supplied topic (${tokens.join(", ")}).`,
    );
  }

  if (options.requireGeometry !== false) {
    errors.push(...getPosterGeometryErrors(value));
  }

  return errors;
}

export function validatePosterConcept(
  value: unknown,
  options: PosterConceptValidationOptions = {},
): value is PosterConcept {
  return getPosterConceptValidationErrors(value, options).length === 0;
}
