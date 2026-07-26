import {
  DESIGN_SYSTEM,
  POSTER_CATEGORIES,
  getAspectRatio,
  getPosterLayoutProfile,
} from "@/lib/poster-reference-system";
import type {
  PercentBounds,
  PosterConcept,
  PosterStudioPayload,
} from "@/lib/poster-types";
import { getPosterConceptValidationErrors } from "@/lib/poster-types";

export interface PosterGenerationPrompt {
  schema_version: "multia.poster-generation.v6";
  task: string;
  campaign: string;
  prompt: string;
  negative_prompt: string;
  settings: {
    image_model: "gpt-image-2";
    quality: "high";
    style_category_id: PosterStudioPayload["modelCategory"];
    style_category: string;
    reference_mode: "approved-archetype-plus-category-style-references";
    approved_reference: {
      id: string;
      label: string;
      match: string[];
      never_copy: string[];
    };
  };
  output: {
    type: "single_image";
    purpose: "poster_background_and_hero_only";
    layout: "1x1";
    width: number;
    height: number;
    aspect_ratio: string;
    resolution: string;
    typography_mode: "editable_overlay_only";
    logo_mode: "official_assets_or_neutral_placeholders";
  };
  production_pipeline: {
    background_renderer: "gpt_image_2_full_artwork";
    hero_renderer: "gpt_image_2_integrated_hero";
    placement: "model_composed_inside_declared_hero_bounds";
    safe_area_policy: "canonical_geometry_validation_plus_prompt_exclusions";
    editable_finish: "ubuntu_typography_and_official_logo_layers";
  };
  composition: {
    archetype: string;
    archetype_description: string;
    outer_margin_percent: number;
    grid: string;
    hero_bounds_percent: PercentBounds;
    hero_placement: string;
    negative_space: string;
    background_detail: string;
    logo_safe_areas: Array<{
      logo: string;
      bounds_percent: PercentBounds;
      rule: string;
    }>;
    copy_safe_areas: Array<{
      role: "headline" | "subheading" | "body_copy" | "cta";
      include: boolean;
      bounds_percent: PercentBounds;
      rule: string;
    }>;
  };
  art_direction: {
    concept_name: string;
    concept: string;
    financial_metaphor: string;
    financial_semantics: {
      investor_question: string;
      hero_metaphor: string;
      visual_mappings: Array<{
        element: string;
        financial_meaning: string;
      }>;
      relationship: string;
      factual_guardrail: string;
      rejection_test: string;
    };
    hero_execution_contract: {
      subject_locked: boolean;
      one_sentence_read: string;
      required_parts: string[];
      forbidden_substitutions: string[];
      thumbnail_test: string;
      category_fidelity: string;
    };
    category_construction: string;
    background: string;
    background_system: {
      conceptual_role: string;
      depth_and_lighting: string;
      texture_rule: string;
      exclusion_rule: string;
    };
    approved_palette: {
      dominant: string;
      treatment: string;
      accents: string[];
      editable_text_colours: string[];
      allowed_hex_values: string[];
    };
    rendering_standard: string;
  };
  editable_overlay: {
    font_family: "Ubuntu";
    layers: Array<{
      role: "headline" | "subheading" | "body_copy" | "cta";
      include: boolean;
      content: string;
      line_breaks: string[];
      weight: 400 | 500 | 700;
      font_size_px: number;
      line_height: number;
      letter_spacing_em: number;
      alignment: "left" | "center" | "right";
      bounds_percent: PercentBounds;
    }>;
    logo_layers: Array<{
      id: string;
      brand_name: string;
      asset_path: string;
      bounds_percent: PercentBounds;
      safe_area_bounds_percent: PercentBounds;
      aspect_ratio_locked: true;
      fallback: "neutral-labelled-placeholder";
    }>;
  };
  explicit_restrictions: {
    generate_text: false;
    generate_letters_or_numerals: false;
    generate_logos_or_brand_marks: false;
    overlap_logo_safe_areas: false;
    overlap_copy_safe_areas: false;
    invent_financial_claims_or_figures: false;
    use_unapproved_colours: false;
    copy_reference_composition_exactly: false;
    multiple_competing_hero_objects: false;
    semantically_unmapped_visual_elements: false;
    physically_unsupported_balance_parts: false;
    generic_finance_background_decoration: false;
    miniature_architecture_or_city_metaphor: false;
    replace_selected_style_with_generic_cgi: false;
  };
  quality_control: string[];
}

const ALL_APPROVED_COLOURS = [
  ...Object.values(DESIGN_SYSTEM.primary),
  ...DESIGN_SYSTEM.secondary,
];

function isLargeMidcapPayload(payload: PosterStudioPayload) {
  const brief = [
    payload.topic,
    payload.headline,
    payload.subheading,
    payload.bodyCopy,
    payload.visualDirection,
  ]
    .join(" ")
    .toLowerCase();
  return (
    /\b(large|large-cap|large cap|largecap)\b/.test(brief) &&
    /\b(mid|mid-cap|mid cap|midcap)\b/.test(brief)
  );
}

function categoryRenderingStandard(payload: PosterStudioPayload) {
  if (payload.modelCategory === "mixed-media") {
    return "Premium editorial photomontage: one recognisable real-world hero rendered as a predominantly black-and-white or strongly desaturated photographic cutout with authentic surface detail, tactile layered paper/card colour accents, restrained halftone or newsprint texture, precise collage edges, coherent photographic lighting and one grounded contact shadow. If a person is required, use a realistic monochrome editorial photograph with natural anatomy, pose, clothing and proportions—never a glossy 3D avatar, cartoon or synthetic character. Apply approved brand colour selectively; do not colourise the whole photograph. It must not look like a fully CGI miniature, architecture visualisation or 3D diorama.";
  }
  if (payload.modelCategory === "illustrative") {
    return "Premium dimensional editorial illustration: simplified silhouettes, sculpted planes, immaculate contours, controlled material depth and studio lighting. Avoid photoreal miniature scenes, generic clip-art and toy-like rendering.";
  }
  return "Premium physically based 3D product visualisation: credible geometry and scale, thick controlled glass where relevant, satin or polished metal, clean silhouettes, restrained global illumination, accurate perspective and soft grounded contact shadows.";
}

function findBounds(concept: PosterConcept, name: string, fallback: PercentBounds) {
  return (
    concept.editablePosterLayoutSpecification.layers.find((layer) =>
      layer.name.toLowerCase().includes(name),
    )?.boundsPercent ?? fallback
  );
}

export function buildPosterGenerationPrompt(
  concept: PosterConcept,
  payload: PosterStudioPayload,
): PosterGenerationPrompt {
  const validationErrors = getPosterConceptValidationErrors(concept, {
    topic: payload.topic,
    expectedCanvas: payload.outputSize,
  });
  if (validationErrors.length > 0) {
    throw new Error(
      `Poster generation is blocked by the canonical contract: ${validationErrors.join(" ")}`,
    );
  }
  const largeMidcapSubjectLocked = isLargeMidcapPayload(payload);
  const profile = getPosterLayoutProfile(
    concept.layoutArchetype,
    payload.bodyCopy.length,
  );
  const treatments = [
    ["headline", concept.textHierarchy.headline],
    ["subheading", concept.textHierarchy.subheading],
    ["body_copy", concept.textHierarchy.bodyCopy],
    ["cta", concept.textHierarchy.cta],
  ] as const;

  return {
    schema_version: "multia.poster-generation.v6",
    task:
      "Generate one original CNBC × Bandhan Mutual Fund MF Corner campaign background and hero illustration from this production contract.",
    campaign: "CNBC × Bandhan Mutual Fund — MF Corner weekly social campaign",
    prompt: concept.masterImageGenerationPrompt,
    negative_prompt: concept.negativePrompt,
    settings: {
      image_model: "gpt-image-2",
      quality: "high",
      style_category_id: payload.modelCategory,
      style_category: concept.selected3DModelReferenceCategory.label,
      reference_mode: "approved-archetype-plus-category-style-references",
      approved_reference: {
        id: concept.referenceMatch.approvedPosterId,
        label: concept.referenceMatch.label,
        match: concept.referenceMatch.fidelitySignals,
        never_copy: [
          "words or typography",
          "logos or brand marks",
          "the reference hero object",
          "the complete composition pixel-for-pixel",
        ],
      },
    },
    output: {
      type: "single_image",
      purpose: "poster_background_and_hero_only",
      layout: "1x1",
      width: payload.outputSize.width,
      height: payload.outputSize.height,
      aspect_ratio: getAspectRatio(payload.outputSize.width, payload.outputSize.height),
      resolution: `${payload.outputSize.width}x${payload.outputSize.height}`,
      typography_mode: "editable_overlay_only",
      logo_mode: "official_assets_or_neutral_placeholders",
    },
    production_pipeline: {
      background_renderer: "gpt_image_2_full_artwork",
      hero_renderer: "gpt_image_2_integrated_hero",
      placement: "model_composed_inside_declared_hero_bounds",
      safe_area_policy: "canonical_geometry_validation_plus_prompt_exclusions",
      editable_finish: "ubuntu_typography_and_official_logo_layers",
    },
    composition: {
      archetype: concept.layoutArchetype,
      archetype_description: profile.description,
      outer_margin_percent:
        concept.editablePosterLayoutSpecification.outerMarginPercent,
      grid: concept.editablePosterLayoutSpecification.grid,
      hero_bounds_percent: findBounds(concept, "hero", profile.heroBounds),
      hero_placement: concept.placementGuidance.centralVisual,
      negative_space: concept.placementGuidance.negativeSpace,
      background_detail: concept.placementGuidance.backgroundDetails,
      logo_safe_areas: concept.logoSafeAreas.map((area) => ({
        logo: area.logo,
        bounds_percent: area.boundsPercent,
        rule: "Keep completely empty, visually quiet, and free from objects, highlights, shadows, particles and chart lines.",
      })),
      copy_safe_areas: treatments.map(([role, treatment]) => ({
        role,
        include: treatment.include,
        bounds_percent: findBounds(
          concept,
          role === "body_copy" ? "body" : role,
          profile.textZones[role === "body_copy" ? "bodyCopy" : role],
        ),
        rule: treatment.include
          ? role === "body_copy"
            ? "Leave this entire lower information panel visually quiet. The complete supplied body copy will be added here as editable Ubuntu typography; do not reduce or sacrifice this zone for the hero."
            : "Leave this zone visually quiet for later editable typography."
          : "No text layer is planned here; preserve the wider negative-space rhythm.",
      })),
    },
    art_direction: {
      concept_name: concept.conceptTitle,
      concept: concept.conceptExplanation,
      financial_metaphor: concept.placementGuidance.centralVisual,
      financial_semantics: {
        investor_question: concept.financialNarrative.investorQuestion,
        hero_metaphor: concept.financialNarrative.heroMetaphor,
        visual_mappings: concept.financialNarrative.visualMappings.map((mapping) => ({
          element: mapping.element,
          financial_meaning: mapping.financialMeaning,
        })),
        relationship: concept.financialNarrative.relationship,
        factual_guardrail: concept.financialNarrative.guardrail,
        rejection_test:
          "Reject and redesign the hero if any visible component lacks a declared financial meaning, if the relationship is not physically legible, or if the object could illustrate an unrelated topic unchanged.",
      },
      hero_execution_contract: largeMidcapSubjectLocked
        ? {
            subject_locked: true,
            one_sentence_read:
              "One premium precision portfolio balance holding one substantial large-cap weight against several smaller mid-cap weights on a single level beam.",
            required_parts: [
              "one low shared base",
              "one mechanically credible central fulcrum",
              "one continuous perfectly level beam",
              "two real shallow trays connected to that beam",
              "one broad low Prussian-blue calibrated weight resting fully on the left tray",
              "three to five smaller orange/gold calibrated weights resting fully on the right tray",
            ],
            forbidden_substitutions: [
              "buildings or houses",
              "city blocks or skyline",
              "bridge or separate platforms",
              "classical columns or architecture",
              "construction or infrastructure scene",
              "staircase, bar chart or upward arrow",
              "coin piles",
              "two unrelated subjects",
            ],
            thumbnail_test:
              "At small social-media preview size, the silhouette must immediately read as one connected balance instrument; if it reads as architecture, two piles or a diorama, reject and rebuild it.",
            category_fidelity: categoryRenderingStandard(payload),
          }
        : {
            subject_locked: false,
            one_sentence_read: concept.financialNarrative.heroMetaphor,
            required_parts: concept.financialNarrative.visualMappings.map(
              (mapping) => mapping.element,
            ),
            forbidden_substitutions: [
              "unmapped decorative objects",
              "generic finance dashboard",
              "unrelated architecture or miniature scene",
            ],
            thumbnail_test:
              "At small social-media preview size, the hero silhouette and its relationship must remain recognisable and relevant to the supplied topic.",
            category_fidelity: categoryRenderingStandard(payload),
          },
      category_construction: POSTER_CATEGORIES[payload.modelCategory].promptDirective,
      background: concept.placementGuidance.backgroundDetails,
      background_system: {
        conceptual_role:
          "Support the same financial narrative as the hero and establish campaign depth without becoming a second subject.",
        depth_and_lighting:
          "Use one approved dominant colour, restrained tonal depth, one controlled light pool behind or beneath the hero, and a grounded shadow whose direction matches the hero lighting.",
        texture_rule:
          "Use at most one low-opacity, topic-specific financial texture. Keep its contrast lowest behind copy and logo zones and slightly stronger only around the hero field.",
        exclusion_rule:
          "No generic rising candlesticks, dashboard grids, fake data, random market lines, floating debris or unrelated financial icons.",
      },
      approved_palette: {
        dominant: concept.selectedColourCombination.background,
        treatment: concept.selectedColourCombination.backgroundTreatment,
        accents: concept.selectedColourCombination.accents,
        editable_text_colours: concept.selectedColourCombination.textColours,
        allowed_hex_values: ALL_APPROVED_COLOURS,
      },
      rendering_standard: categoryRenderingStandard(payload),
    },
    editable_overlay: {
      font_family: "Ubuntu",
      layers: treatments.map(([role, treatment]) => ({
        role,
        include: treatment.include,
        content: treatment.content,
        line_breaks: treatment.lineBreaks,
        weight: treatment.ubuntuWeight,
        font_size_px: treatment.fontSizePx,
        line_height: treatment.lineHeight,
        letter_spacing_em: treatment.letterSpacingEm,
        alignment: treatment.alignment,
        bounds_percent: findBounds(
          concept,
          role === "body_copy" ? "body" : role,
          profile.textZones[role === "body_copy" ? "bodyCopy" : role],
        ),
      })),
      logo_layers: concept.editablePosterLayoutSpecification.layers
        .filter((layer) => layer.type === "logo" && layer.logo)
        .map((layer) => ({
          id: layer.logo!.id,
          brand_name: layer.logo!.brandName,
          asset_path: layer.logo!.assetPath,
          bounds_percent: layer.boundsPercent,
          safe_area_bounds_percent: layer.logo!.safeAreaBoundsPercent,
          aspect_ratio_locked: layer.logo!.aspectRatioLocked,
          fallback: layer.logo!.fallback,
        })),
    },
    explicit_restrictions: {
      generate_text: false,
      generate_letters_or_numerals: false,
      generate_logos_or_brand_marks: false,
      overlap_logo_safe_areas: false,
      overlap_copy_safe_areas: false,
      invent_financial_claims_or_figures: false,
      use_unapproved_colours: false,
      copy_reference_composition_exactly: false,
      multiple_competing_hero_objects: false,
      semantically_unmapped_visual_elements: false,
      physically_unsupported_balance_parts: false,
      generic_finance_background_decoration: false,
      miniature_architecture_or_city_metaphor: false,
      replace_selected_style_with_generic_cgi: false,
    },
    quality_control: concept.finalQualityControlChecklist,
  };
}

export function stringifyPosterGenerationPrompt(
  concept: PosterConcept,
  payload: PosterStudioPayload,
) {
  return JSON.stringify(buildPosterGenerationPrompt(concept, payload), null, 2);
}
