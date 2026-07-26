import type { PercentBounds, PosterModelCategory } from "./poster-types";

const MAX_NEGATIVE_PROMPT_CHARS = 2_200;
export const MAX_PROVIDER_PROMPT_CHARS = 31_500;

export interface PosterImagePromptInput {
  rawContract: string;
  negativePrompt: string;
  modelCategory: PosterModelCategory;
  categoryDirective: string;
  width: number;
  height: number;
}

export interface PosterImagePromptResult {
  text: string;
  rawContractLength: number;
  contractLength: number;
  finalLength: number;
}

export class PosterImagePromptValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PosterImagePromptValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string) {
  if (!isRecord(value)) {
    throw new PosterImagePromptValidationError(
      `The production contract is missing ${label}.`,
    );
  }
  return value;
}

function requireString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new PosterImagePromptValidationError(
      `The production contract is missing ${label}.`,
    );
  }
  return value;
}

function requireBounds(value: unknown, label: string): PercentBounds {
  const bounds = requireRecord(value, label);
  const result = {
    x: Number(bounds.x),
    y: Number(bounds.y),
    width: Number(bounds.width),
    height: Number(bounds.height),
  };
  if (
    !Object.values(result).every(Number.isFinite) ||
    result.x < 0 ||
    result.y < 0 ||
    result.width <= 0 ||
    result.height <= 0 ||
    result.x + result.width > 100 ||
    result.y + result.height > 100
  ) {
    throw new PosterImagePromptValidationError(
      `${label} must contain valid numerical 0–100% bounds.`,
    );
  }
  return result;
}

function validateOutputDimensions(
  output: Record<string, unknown>,
  input: PosterImagePromptInput,
) {
  if (
    ("width" in output && Number(output.width) !== input.width) ||
    ("height" in output && Number(output.height) !== input.height)
  ) {
    throw new PosterImagePromptValidationError(
      `The production contract output does not match the requested ${input.width}x${input.height} canvas.`,
    );
  }
  if (
    typeof output.resolution === "string" &&
    output.resolution.replace(/\s+/g, "").toLowerCase() !==
      `${input.width}x${input.height}`.toLowerCase()
  ) {
    throw new PosterImagePromptValidationError(
      `The production contract resolution ${output.resolution} does not match the requested ${input.width}x${input.height} canvas.`,
    );
  }
}

function extractRequiredContract(
  rawContract: string,
  input: PosterImagePromptInput,
) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContract);
  } catch {
    throw new PosterImagePromptValidationError(
      "The production contract is not valid JSON; image generation was not started.",
    );
  }
  const root = requireRecord(parsed, "root object");
  const settings = requireRecord(root.settings, "settings");
  const output = requireRecord(root.output, "output");
  const composition = requireRecord(root.composition, "composition");
  const artDirection = requireRecord(root.art_direction, "art_direction");
  const semantics = requireRecord(
    artDirection.financial_semantics,
    "art_direction.financial_semantics",
  );
  const restrictions = requireRecord(
    root.explicit_restrictions,
    "explicit_restrictions",
  );

  validateOutputDimensions(output, input);

  const rawMappings = semantics.visual_mappings;
  if (!Array.isArray(rawMappings) || rawMappings.length < 2) {
    throw new PosterImagePromptValidationError(
      "The production contract must retain at least two financial visual mappings.",
    );
  }
  const visualMappings = rawMappings.map((mapping, index) => {
    const entry = requireRecord(
      mapping,
      `financial visual mapping ${index + 1}`,
    );
    return {
      element: requireString(
        entry.element,
        `financial visual mapping ${index + 1}.element`,
      ),
      financial_meaning: requireString(
        entry.financial_meaning,
        `financial visual mapping ${index + 1}.financial_meaning`,
      ),
    };
  });

  // Two supplied marks: CNBC and Bandhan. MF Corner is the show name, not an
  // asset, so it no longer reserves a zone.
  const rawLogoAreas = composition.logo_safe_areas;
  if (!Array.isArray(rawLogoAreas) || rawLogoAreas.length !== 2) {
    throw new PosterImagePromptValidationError(
      "The production contract must retain exactly two numerical logo-safe areas.",
    );
  }
  const logoSafeAreas = rawLogoAreas.map((area, index) => {
    const entry = requireRecord(area, `logo-safe area ${index + 1}`);
    return {
      logo: requireString(entry.logo, `logo-safe area ${index + 1}.logo`),
      bounds_percent: requireBounds(
        entry.bounds_percent,
        `logo-safe area ${index + 1}.bounds_percent`,
      ),
      rule: requireString(entry.rule, `logo-safe area ${index + 1}.rule`),
    };
  });

  const rawCopyAreas = composition.copy_safe_areas;
  if (!Array.isArray(rawCopyAreas) || rawCopyAreas.length !== 4) {
    throw new PosterImagePromptValidationError(
      "The production contract must retain headline, subheading, body-copy and CTA safe areas.",
    );
  }
  const copySafeAreas = rawCopyAreas.map((area, index) => {
    const entry = requireRecord(area, `copy-safe area ${index + 1}`);
    return {
      role: requireString(entry.role, `copy-safe area ${index + 1}.role`),
      include: entry.include === true,
      bounds_percent: requireBounds(
        entry.bounds_percent,
        `copy-safe area ${index + 1}.bounds_percent`,
      ),
      rule: requireString(entry.rule, `copy-safe area ${index + 1}.rule`),
    };
  });

  const requiredFalseRestrictions = [
    "generate_text",
    "generate_letters_or_numerals",
    "generate_logos_or_brand_marks",
    "overlap_logo_safe_areas",
    "overlap_copy_safe_areas",
  ];
  for (const key of requiredFalseRestrictions) {
    if (restrictions[key] !== false) {
      throw new PosterImagePromptValidationError(
        `The production contract must explicitly set ${key} to false.`,
      );
    }
  }

  const required = {
    schema_version: root.schema_version,
    category: {
      id: input.modelCategory,
      label:
        typeof settings.style_category === "string"
          ? settings.style_category
          : input.modelCategory,
      directive: input.categoryDirective,
    },
    output: {
      width: input.width,
      height: input.height,
      aspect_ratio: output.aspect_ratio,
      purpose: output.purpose,
    },
    composition: {
      archetype: composition.archetype,
      hero_bounds_percent: requireBounds(
        composition.hero_bounds_percent,
        "composition.hero_bounds_percent",
      ),
      logo_safe_areas: logoSafeAreas,
      copy_safe_areas: copySafeAreas,
    },
    financial_semantics: {
      investor_question: requireString(
        semantics.investor_question,
        "financial_semantics.investor_question",
      ),
      hero_metaphor: requireString(
        semantics.hero_metaphor,
        "financial_semantics.hero_metaphor",
      ),
      visual_mappings: visualMappings,
      relationship: requireString(
        semantics.relationship,
        "financial_semantics.relationship",
      ),
      factual_guardrail: requireString(
        semantics.factual_guardrail,
        "financial_semantics.factual_guardrail",
      ),
      rejection_test: semantics.rejection_test,
    },
    hero_execution_contract: requireRecord(
      artDirection.hero_execution_contract,
      "art_direction.hero_execution_contract",
    ),
    background_system: requireRecord(
      artDirection.background_system,
      "art_direction.background_system",
    ),
    approved_palette: requireRecord(
      artDirection.approved_palette,
      "art_direction.approved_palette",
    ),
    explicit_restrictions: restrictions,
  };

  const optionalEntries: Array<[string, unknown]> = [
    [
      "composition_guidance",
      {
        archetype_description: composition.archetype_description,
        outer_margin_percent: composition.outer_margin_percent,
        grid: composition.grid,
        hero_placement: composition.hero_placement,
        negative_space: composition.negative_space,
        background_detail: composition.background_detail,
      },
    ],
    [
      "concept_context",
      {
        concept_name: artDirection.concept_name,
        concept: artDirection.concept,
        financial_metaphor: artDirection.financial_metaphor,
        category_construction: artDirection.category_construction,
        rendering_standard: artDirection.rendering_standard,
      },
    ],
    ["approved_reference", settings.approved_reference],
    ["master_prompt", root.prompt],
  ];

  return { required, optionalEntries };
}

export function compactRendererContract(
  rawContract: string,
  input: PosterImagePromptInput,
  maxContractChars: number,
) {
  const { required, optionalEntries } = extractRequiredContract(
    rawContract,
    input,
  );
  const compact: Record<string, unknown> = { ...required };
  let serialized = JSON.stringify(compact);
  if (serialized.length > maxContractChars) {
    throw new PosterImagePromptValidationError(
      "The required image-render contract exceeds the provider limit while preserving category, dimensions, safe areas and financial semantics. Shorten the submitted brief; image generation was not started.",
    );
  }
  const optionalLimit = Math.max(serialized.length, maxContractChars - 1_200);

  for (const [key, value] of optionalEntries) {
    if (value === undefined) continue;
    const candidate = JSON.stringify({ ...compact, [key]: value });
    if (candidate.length <= optionalLimit) {
      compact[key] = value;
      serialized = candidate;
    }
  }
  return serialized;
}

export function getCategoryExecution(category: PosterModelCategory) {
  if (category === "mixed-media") {
    return "Execute Mixed Media Realism only: every hardware/mechanical surface (metal beam, fulcrum, trays, base, hands, currency) must render as if converted to black-and-white or heavily desaturated grayscale photography — a narrow, muted tonal range with no visible hue on the metal itself, like a printed newspaper photograph, NOT a full-colour photograph or render of shiny/polished metal. Use predominantly monochrome photographic cutouts, authentic surface detail, tactile cut or torn paper/card colour accents (colour belongs ONLY on these paper/card accent pieces, never on the metal hardware), restrained halftone/newsprint texture, precise collage edges, shallow analogue depth and one grounded contact shadow. Do not substitute glossy CGI, a full-colour realistic product photograph, plastic characters or an architectural diorama.";
  }
  if (category === "illustrative") {
    return "Execute Dimensional Editorial Illustration only: use bold simplified silhouettes, smooth authored contours, flat approved colour blocks and no more than two adjacent tonal facets for shallow depth. Do not substitute photographic collage, glass transparency, blur, photoreal lighting or generic CGI.";
  }
  if (category === "soft-clay") {
    return "Execute Soft Clay only: matte hand-modelled polymer clay with visible thumbprints, tool marks and softly rounded edges, lit by one broad soft light with a soft grounded contact shadow. Zero gloss anywhere. Do not substitute glossy CGI, glass, metal, photographic collage, paper layers or an isometric model.";
  }
  if (category === "isometric-diorama") {
    return "Execute Isometric Miniature Diorama only: a true isometric or clean 45-degree top-down view of one miniature subject resting on a thin minimal base, physically based matte and satin surfaces, soft key light with ambient occlusion at every contact point. Do not substitute a ground-level photographic angle, glossy glass product rendering, paper layers, clay or photographic collage — and never expand it into a town, street or landscape.";
  }
  if (category === "layered-paper") {
    return "Execute Layered Papercraft only: 3–5 stacked planes of matte cut card with visible paper fibre, crisp cut edges and short soft cast shadows between layers creating all of the depth. Do not substitute torn photographic collage, glass, metal, clay, gradients within a piece or photographic depth-of-field blur.";
  }
  return "Execute Premium 3D / Glassmorphism only: use a mechanically credible product-shot hero in satin metal, frosted ceramic or matte black, with translucent glass limited to functional parts, controlled refraction, one restrained specular highlight and soft grounded contact shadows. Do not substitute paper collage, photographic cutouts, halftone/newsprint or neon spectacle.";
}

function getCategorySpecificNegatives(category: PosterModelCategory) {
  if (category === "mixed-media") {
    return [
      "fully colourised CGI",
      "glossy 3D human avatar",
      "plastic photographic cutout",
      "full-colour realistic metal photograph",
      "shiny chrome or steel product photography",
      "unconverted colour photograph without desaturation",
      "glossy premium 3D product render",
    ];
  }
  if (category === "illustrative") {
    return [
      "photographic cutout",
      "torn-paper collage",
      "glass transparency",
      "photoreal material rendering",
    ];
  }
  return [
    "torn-paper collage",
    "photographic cutout",
    "halftone newsprint",
    "neon glass spectacle",
  ];
}

function composePrompt(
  input: PosterImagePromptInput,
  compactContract: string,
  compactNegativePrompt: string,
) {
  // Ordering follows OpenAI's guidance for the gpt-image family: scene/background
  // first, then subject, then details, then constraints. The background rule used to
  // sit near the bottom with the other composition rules, which is the position the
  // model weighs least — and washed-out or white backgrounds were the result.
  return `FULL POSTER ARTWORK — BACKGROUND AND HERO ILLUSTRATION ONLY.

Create the complete poster-ready artwork described by the compact production contract below at exactly ${input.width} × ${input.height} pixels and the same aspect ratio. This is a printed marketing poster for a financial campaign. Typography and official logos are added later as editable layers, so generate artwork only.

SCENE AND BACKGROUND (establish this first):
Fill the entire canvas edge to edge with the background_system dominant colour and treatment from the contract below — a rich, deep field or gradient built only from the approved_palette core hues. The background is never white, off-white, ivory, cream, pale or empty. Add at most one restrained, topic-relevant texture at low contrast, confined behind the hero. No candlestick grids, dashboards, fake data or generic finance decoration.

SUBJECT:
One central financial metaphor, exactly as specified in the contract, sitting inside composition.hero_bounds_percent.

${compactContract}

REFERENCE-USE RULE: Attached images are construction, material, lighting and finish references only. Never copy their subject, financial relationship, wording, logo, brand or complete composition.

CATEGORY EXECUTION — ONE SELECTED SYSTEM ONLY:
${input.categoryDirective}
${getCategoryExecution(input.modelCategory)}

NON-NEGOTIABLE COMPOSITION RULES:
- Respect every numerical logo-safe area, copy-safe area and hero bound in the contract. Keep reserved regions quiet and empty for the editable overlay.
- Render exactly one topic-relevant financial metaphor. Keep its silhouette fully inside composition.hero_bounds_percent and out of headline, supporting-copy, CTA and logo zones.
- Treat financial_semantics as a construction contract. Every visible component must match one declared visual mapping and communicate the declared relationship.
- Treat hero_execution_contract as a subject lock whenever subject_locked is true. Render every required part and reject every forbidden substitution.
- If the concept uses a balance, both loads must rest on real trays connected through one credible beam and fulcrum.
- Preserve every enabled copy-safe area, especially the body-copy information panel. Never enlarge the hero into it.
- The background established above is mandatory and non-negotiable. Re-check before finishing that the canvas is filled with the approved deep field and is not white, pale or empty.
- Keep the hero simple and immediately recognisable — one clear object built from a small number of parts (a gullak with coins at its slot, a taraju holding two coin stacks, a steel thali with filled katoris), not an elaborate multi-object scene. If a viewer cannot identify the hero object and its financial meaning within one second at thumbnail size, it is too complicated.
- Generate no text, letters, words, numerals, pseudo-text, dial labels, scale markings, logos, brand marks, watermarks, signatures or interface elements.

NEGATIVE PROMPT:
${compactNegativePrompt}`;
}

function buildNegativePrompt(
  input: PosterImagePromptInput,
  compactContract: string,
) {
  const required = [
    "cropped or oversized hero",
    "copy-safe overlap",
    "logo-safe overlap",
    "generated typography",
    "opaque text panel",
    "meaningless sculpture",
    "floating or unsupported parts",
    "disconnected decoration",
    "generic fintech dashboard",
    "rising candlesticks",
    "miniature city",
    "skyline",
    "buildings",
    "bridge",
    "columns",
    "construction",
    "infrastructure diorama",
    "white background",
    "off-white or ivory background",
    "pale or light-neutral background",
    "blank or empty background",
    "cluttered hero with more than one competing subject",
    "ornate multi-part scene",
    "unrecognisable abstract hero",
    ...getCategorySpecificNegatives(input.modelCategory),
  ];
  const supplied = input.negativePrompt
    .split(/[,\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const candidates = Array.from(new Set([...required, ...supplied]));
  const accepted: string[] = [];
  for (const candidate of candidates) {
    const next = [...accepted, candidate].join(", ");
    if (
      next.length <= MAX_NEGATIVE_PROMPT_CHARS &&
      composePrompt(input, compactContract, next).length <=
        MAX_PROVIDER_PROMPT_CHARS
    ) {
      accepted.push(candidate);
    }
  }
  return accepted.join(", ");
}

export function buildPosterImagePrompt(
  input: PosterImagePromptInput,
): PosterImagePromptResult {
  const wrapperLength = composePrompt(input, "", "").length;
  const contractBudget = MAX_PROVIDER_PROMPT_CHARS - wrapperLength;
  const compactContract = compactRendererContract(
    input.rawContract,
    input,
    contractBudget,
  );
  const compactNegativePrompt = buildNegativePrompt(input, compactContract);
  const text = composePrompt(input, compactContract, compactNegativePrompt);

  if (text.length > MAX_PROVIDER_PROMPT_CHARS) {
    throw new PosterImagePromptValidationError(
      "The image-render contract exceeds the 31,500-character provider limit while preserving required safety and semantic fields; image generation was not started.",
    );
  }

  return {
    text,
    rawContractLength: input.rawContract.length,
    contractLength: compactContract.length,
    finalLength: text.length,
  };
}
