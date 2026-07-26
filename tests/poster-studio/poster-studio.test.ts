import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  assertModelCanvasMatchesRequested,
  buildLargeMidcapMasterPrompt,
  getLargeMidcapCategoryExecution,
  normalizePosterConcept,
  parseClarificationQuestions,
  parsePosterConcept,
} from "../../lib/openai-poster";
import {
  buildPosterGenerationPrompt,
  stringifyPosterGenerationPrompt,
} from "../../lib/poster-generation-prompt";
import {
  buildPosterImagePrompt,
  compactRendererContract,
  MAX_PROVIDER_PROMPT_CHARS,
  PosterImagePromptValidationError,
} from "../../lib/poster-image-prompt";
import {
  getFinancialNarrativeSeed,
  getPosterOutputSchema,
  POSTER_BACKGROUND_COMBINATIONS,
  POSTER_CATEGORIES,
  selectPosterLayoutArchetype,
} from "../../lib/poster-reference-system";
import {
  getPosterConceptValidationErrors,
  validatePosterConcept,
  type PosterConcept,
  type PosterModelCategory,
} from "../../lib/poster-types";
import {
  boundsContains,
  rectanglesIntersect,
  validatePosterGeometry,
} from "../../lib/poster-geometry";
import {
  evaluatePosterTextFit,
  fitPosterTextTreatment,
  getPosterDownloadDescriptor,
  getPosterPreviewTextStyle,
  getPosterTextRenderMetrics,
  getTextMinimumFontSize,
  loadUbuntuPosterFonts,
  POSTER_CTA_DECORATION,
} from "../../lib/poster-editor-core";
import { classifyImageResolution } from "../../lib/image-resolution";
import {
  DETERMINISTIC_TOPIC_FIXTURES,
  LARGE_MIDCAP_DETERMINISTIC_FIXTURE,
  withCategory,
} from "./fixtures";

const CATEGORIES: PosterModelCategory[] = [
  "mixed-media",
  "glassmorphism-3d",
  "illustrative",
];

function imagePromptInput(
  payload = LARGE_MIDCAP_DETERMINISTIC_FIXTURE,
) {
  const concept = getPosterOutputSchema(payload);
  return {
    concept,
    input: {
      rawContract: stringifyPosterGenerationPrompt(concept, payload),
      negativePrompt: concept.negativePrompt,
      modelCategory: payload.modelCategory,
      categoryDirective:
        POSTER_CATEGORIES[payload.modelCategory].promptDirective,
      width: payload.outputSize.width,
      height: payload.outputSize.height,
    },
  };
}

describe("canonical contract fixtures", () => {
  test("all deterministic topics produce relevant, valid, collision-free contracts", () => {
    for (const payload of [
      LARGE_MIDCAP_DETERMINISTIC_FIXTURE,
      ...DETERMINISTIC_TOPIC_FIXTURES,
    ]) {
      const concept = getPosterOutputSchema(payload);
      assert.equal(
        validatePosterConcept(concept, {
          topic: payload.topic,
          expectedCanvas: payload.outputSize,
        }),
        true,
        payload.topic,
      );
      assert.equal(concept.layoutArchetype, "split-brand-copy");
      assert.equal(concept.textHierarchy.bodyCopy.content, payload.bodyCopy);
      assert.equal(validatePosterGeometry(concept).valid, true);
      assert.doesNotThrow(() => buildPosterGenerationPrompt(concept, payload));
    }
  });

  test("unclassified topics receive topic-grounded semantics", () => {
    for (const topic of [
      "tax-loss harvesting across realised gains and eligible losses",
      "duration risk when bond yields move",
      "sequence risk during early retirement withdrawals",
    ]) {
      const payload = {
        ...LARGE_MIDCAP_DETERMINISTIC_FIXTURE,
        topic,
        headline: `Understanding ${topic}`,
        subheading: `A practical view of ${topic}`,
        bodyCopy: `This supplied body copy remains explicitly grounded in ${topic}.`,
        visualDirection: "",
      };
      const seed = getFinancialNarrativeSeed(payload);
      const semanticText = JSON.stringify(seed).toLowerCase();
      assert.ok(
        topic
          .toLowerCase()
          .split(/\W+/)
          .filter((token) => token.length > 4)
          .some((token) => semanticText.includes(token)),
      );
      assert.doesNotMatch(
        semanticText,
        /one physically credible financial system|primary grounded form/,
      );
    }
  });

  test("generic semantic placeholders are rejected even when structurally valid", () => {
    const concept = structuredClone(
      getPosterOutputSchema(LARGE_MIDCAP_DETERMINISTIC_FIXTURE),
    );
    concept.financialNarrative.heroMetaphor =
      "one physically credible financial system";
    concept.financialNarrative.visualMappings = [
      {
        element: "primary grounded form",
        financialMeaning: "specific part of the supplied topic",
      },
      {
        element: "secondary connected form",
        financialMeaning: "main investment subject",
      },
    ];
    const errors = getPosterConceptValidationErrors(concept, {
      topic: LARGE_MIDCAP_DETERMINISTIC_FIXTURE.topic,
      expectedCanvas: LARGE_MIDCAP_DETERMINISTIC_FIXTURE.outputSize,
    });
    assert.ok(errors.some((error) => /generic placeholder/i.test(error)));
  });

  test("logo layers serialize the official asset contract and neutral fallback", () => {
    const concept = getPosterOutputSchema(
      LARGE_MIDCAP_DETERMINISTIC_FIXTURE,
    );
    const logoLayers = concept.editablePosterLayoutSpecification.layers.filter(
      (layer) => layer.type === "logo",
    );
    assert.equal(logoLayers.length, 2);
    for (const layer of logoLayers) {
      assert.equal(layer.editable, true);
      assert.equal(layer.logo?.aspectRatioLocked, true);
      assert.equal(layer.logo?.fallback, "neutral-labelled-placeholder");
      assert.match(layer.logo?.assetPath ?? "", /^\/api\/poster-logo\?id=.+$/);
      assert.ok(
        boundsContains(
          layer.logo!.safeAreaBoundsPercent,
          layer.boundsPercent,
        ),
      );
    }
    const production = buildPosterGenerationPrompt(
      concept,
      LARGE_MIDCAP_DETERMINISTIC_FIXTURE,
    );
    assert.equal(production.editable_overlay.logo_layers.length, 2);
  });
});

describe("layout and collision gates", () => {
  test("only the three observed archetypes are selectable", () => {
    assert.equal(
      selectPosterLayoutArchetype({
        ...LARGE_MIDCAP_DETERMINISTIC_FIXTURE,
        bodyCopy: "",
        headline: "Short headline",
        subheading: "",
      }),
      "centered-editorial-stack",
    );
    assert.equal(
      selectPosterLayoutArchetype(LARGE_MIDCAP_DETERMINISTIC_FIXTURE),
      "split-brand-copy",
    );
    assert.equal(
      selectPosterLayoutArchetype({
        ...LARGE_MIDCAP_DETERMINISTIC_FIXTURE,
        referencePosterId: "21-july-9",
      }),
      "left-copy-right-hero",
    );
  });

  test("edge contact is allowed but positive-area overlap is rejected", () => {
    assert.equal(
      rectanglesIntersect(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 10, y: 0, width: 10, height: 10 },
      ),
      false,
    );
    assert.equal(
      rectanglesIntersect(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 9.5, y: 0, width: 10, height: 10 },
      ),
      true,
    );
  });

  test("hero/text and out-of-safe-area logo edits fail deterministic validation", () => {
    const concept = structuredClone(
      getPosterOutputSchema(LARGE_MIDCAP_DETERMINISTIC_FIXTURE),
    );
    const headline = concept.editablePosterLayoutSpecification.layers.find(
      (layer) => layer.id === "headline",
    )!;
    headline.boundsPercent = { x: 20, y: 50, width: 50, height: 20 };
    assert.ok(
      validatePosterGeometry(concept).errors.some((error) =>
        /headline.*intersects.*hero|hero.*intersects.*headline/i.test(error),
      ),
    );

    const logo = concept.editablePosterLayoutSpecification.layers.find(
      (layer) => layer.type === "logo",
    )!;
    logo.boundsPercent = { x: 50, y: 50, width: 10, height: 5 };
    assert.ok(
      validatePosterGeometry(concept).errors.some((error) =>
        /safe area/i.test(error),
      ),
    );
  });

  test("model-returned canvas mismatch is rejected, never clamped", () => {
    assert.throws(
      () =>
        assertModelCanvasMatchesRequested(
          { width: 2048, height: 2700, aspectRatio: "4:5" },
          { width: 2160, height: 2700 },
        ),
      /requires exactly 2160x2700/,
    );
    assert.doesNotThrow(() =>
      assertModelCanvasMatchesRequested(
        { width: 2160, height: 2700, aspectRatio: "4:5" },
        { width: 2160, height: 2700 },
      ),
    );
  });
});

describe("structured prompt compaction and category isolation", () => {
  test("required provider fields survive compaction under the hard limit", () => {
    const { input } = imagePromptInput();
    const result = buildPosterImagePrompt(input);
    assert.ok(result.finalLength <= MAX_PROVIDER_PROMPT_CHARS);
    assert.equal(result.rawContractLength, input.rawContract.length);
    const compact = JSON.parse(
      compactRendererContract(
        input.rawContract,
        input,
        MAX_PROVIDER_PROMPT_CHARS,
      ),
    ) as Record<string, any>;
    assert.equal(compact.category.id, input.modelCategory);
    assert.equal(compact.output.width, input.width);
    assert.equal(compact.output.height, input.height);
    assert.equal(compact.composition.logo_safe_areas.length, 2);
    assert.equal(compact.composition.copy_safe_areas.length, 4);
    assert.ok(compact.financial_semantics.visual_mappings.length >= 2);
    assert.ok(compact.financial_semantics.relationship);
    assert.ok(compact.financial_semantics.factual_guardrail);
    assert.equal(compact.explicit_restrictions.generate_text, false);
    assert.equal(
      compact.explicit_restrictions.generate_logos_or_brand_marks,
      false,
    );
  });

  test("oversized optional prose is dropped whole while required fields survive", () => {
    const { concept, input } = imagePromptInput();
    concept.masterImageGenerationPrompt = "OPTIONAL-PROSE ".repeat(20_000);
    const rawContract = stringifyPosterGenerationPrompt(
      concept,
      LARGE_MIDCAP_DETERMINISTIC_FIXTURE,
    );
    const result = buildPosterImagePrompt({ ...input, rawContract });
    assert.ok(result.finalLength <= MAX_PROVIDER_PROMPT_CHARS);
    assert.doesNotMatch(result.text, /OPTIONAL-PROSE/);
    assert.match(result.text, /factual_guardrail/);
    assert.match(result.text, /logo_safe_areas/);
  });

  test("required semantic content that cannot fit fails before provider execution", () => {
    const { concept, input } = imagePromptInput();
    concept.financialNarrative.relationship = "REQUIRED ".repeat(8_000);
    const rawContract = stringifyPosterGenerationPrompt(
      concept,
      LARGE_MIDCAP_DETERMINISTIC_FIXTURE,
    );
    assert.throws(
      () => buildPosterImagePrompt({ ...input, rawContract }),
      PosterImagePromptValidationError,
    );
  });

  test("malformed pre-parse input is rejected rather than sliced", () => {
    const { input } = imagePromptInput();
    assert.throws(
      () => buildPosterImagePrompt({ ...input, rawContract: '{"broken":' }),
      /not valid JSON/,
    );
  });

  test("Large & Midcap category prompts are genuinely distinct and do not leak Mixed Media", () => {
    const prompts = new Map<PosterModelCategory, string>();
    for (const category of CATEGORIES) {
      const payload = withCategory(
        LARGE_MIDCAP_DETERMINISTIC_FIXTURE,
        category,
      );
      const concept = getPosterOutputSchema(payload);
      const prompt = buildLargeMidcapMasterPrompt(
        payload,
        concept,
        concept.financialNarrative,
        concept.selectedColourCombination.background,
        concept.selectedColourCombination.accents,
      );
      prompts.set(category, prompt);
      assert.match(prompt, new RegExp(getLargeMidcapCategoryExecution(category).slice(0, 28)));
      if (category !== "mixed-media") {
        assert.doesNotMatch(prompt, /mixed media/i);
      }
    }
    assert.equal(new Set(prompts.values()).size, 3);
    assert.match(prompts.get("mixed-media")!, /photographic cutout/i);
    assert.match(prompts.get("glassmorphism-3d")!, /controlled refraction/i);
    assert.match(prompts.get("illustrative")!, /simplified graphic forms/i);
  });
});

describe("font readiness, preview/export parity and downloads", () => {
  test("Ubuntu 400, 500 and 700 plus FontFaceSet.ready are awaited", async () => {
    const loaded: string[] = [];
    let readyObserved = false;
    const fonts = {
      load(declaration: string) {
        loaded.push(declaration);
        return Promise.resolve([]);
      },
      check(declaration: string) {
        return loaded.includes(declaration) && readyObserved;
      },
      ready: Promise.resolve().then(() => {
        readyObserved = true;
      }),
    };
    await loadUbuntuPosterFonts(fonts);
    assert.deepEqual(
      loaded.map((item) => item.split(" ")[0]),
      ["400", "500", "700"],
    );
    assert.equal(readyObserved, true);
  });

  test("role- and canvas-relative floors replace a universal 12px floor", () => {
    assert.equal(getTextMinimumFontSize("body", 2160), 34);
    assert.equal(getTextMinimumFontSize("cta", 2160), 24);
    assert.ok(
      getTextMinimumFontSize("headline", 2160) >
        getTextMinimumFontSize("subheading", 2160),
    );
    assert.equal(
      getTextMinimumFontSize("body", 1080),
      Math.round(getTextMinimumFontSize("body", 2160) / 2),
    );
  });

  test("overflow is explicit at the role floor", () => {
    const concept = getPosterOutputSchema(
      LARGE_MIDCAP_DETERMINISTIC_FIXTURE,
    );
    const treatment = {
      ...concept.textHierarchy.bodyCopy,
      fontSizePx: getTextMinimumFontSize("body", 2160),
      lineBreaks: ["X".repeat(300)],
    };
    const result = evaluatePosterTextFit(
      {
        role: "body",
        treatment,
        bounds: { x: 8, y: 76, width: 84, height: 14 },
        canvas: { width: 2160, height: 2700 },
      },
      (text, candidate) => text.length * candidate.fontSizePx * 0.58,
    );
    assert.equal(result.fits, false);
    assert.equal(result.widthFits, false);
  });

  test("fitPosterTextTreatment never drops words even when nothing fits within the ideal line count", () => {
    const concept = getPosterOutputSchema(LARGE_MIDCAP_DETERMINISTIC_FIXTURE);
    const longSubheading = {
      ...concept.textHierarchy.subheading,
      content:
        "Join Ankit Jain and Deepali Rana on CNBC-AWAAZ Faydemanda Funds, presented by Bandhan Mutual Fund, for a conversation on Large & Midcap investing and the role of balancing stability with growth.",
      lineBreaks: [],
    };
    const fit = fitPosterTextTreatment(
      {
        role: "subheading",
        treatment: longSubheading,
        bounds: { x: 48, y: 34, width: 47, height: 8 },
        canvas: concept.editablePosterLayoutSpecification.canvas,
      },
      (text, candidate) => text.length * candidate.fontSizePx * 0.58,
    );
    const renderedWords = fit.treatment.lineBreaks.join(" ").split(/\s+/).filter(Boolean);
    const originalWords = longSubheading.content.split(/\s+/).filter(Boolean);
    assert.deepEqual(
      renderedWords,
      originalWords,
      "every word of the supplied copy must survive fitting, even if the result overflows and needs a clipped-text warning",
    );
  });

  test("Large & Midcap headline and subheading fit without clipping in split-brand-copy", () => {
    const concept = getPosterOutputSchema(LARGE_MIDCAP_DETERMINISTIC_FIXTURE);
    assert.equal(concept.layoutArchetype, "split-brand-copy");
    const canvas = concept.editablePosterLayoutSpecification.canvas;
    const measure = (text: string, candidate: { fontSizePx: number }) =>
      text.length * candidate.fontSizePx * 0.58;

    const headlineFit = fitPosterTextTreatment(
      {
        role: "headline",
        treatment: concept.textHierarchy.headline,
        bounds: { x: 48, y: 16, width: 47, height: 17 },
        canvas,
      },
      measure,
    );
    assert.equal(headlineFit.result.fits, true);
    assert.ok(
      headlineFit.treatment.fontSizePx > getTextMinimumFontSize("headline", canvas.width),
      "headline should not be forced to the hard floor for this fixture",
    );

    const subheadingFit = fitPosterTextTreatment(
      {
        role: "subheading",
        treatment: concept.textHierarchy.subheading,
        bounds: { x: 48, y: 34, width: 47, height: 8 },
        canvas,
      },
      measure,
    );
    assert.equal(subheadingFit.result.fits, true);
    assert.ok(
      subheadingFit.treatment.fontSizePx > getTextMinimumFontSize("subheading", canvas.width),
      "subheading should not be forced to the hard floor for this fixture",
    );
  });

  test("preview and Canvas use the same CTA decoration and line-box centers", () => {
    const concept = getPosterOutputSchema(
      LARGE_MIDCAP_DETERMINISTIC_FIXTURE,
    );
    const treatment = concept.textHierarchy.cta;
    const style = getPosterPreviewTextStyle("cta", treatment, 2160);
    assert.equal(style.background, POSTER_CTA_DECORATION.background);
    assert.equal(typeof style.border, "string");
    assert.match(
      style.border ?? "",
      new RegExp(
        POSTER_CTA_DECORATION.borderColour.replace(/[()]/g, "\\$&"),
      ),
    );
    assert.equal(style.textShadow, "none");
    const metrics = getPosterTextRenderMetrics({
      role: "cta",
      treatment,
      bounds: { x: 3, y: 90, width: 94, height: 8 },
      canvas: { width: 2160, height: 2700 },
    });
    assert.equal(metrics.lines.length, 1);
    assert.equal(
      metrics.firstLineCenterY,
      metrics.top + metrics.height / 2,
    );
  });

  test("the two download paths have unambiguous compositing behavior", () => {
    assert.deepEqual(getPosterDownloadDescriptor("final"), {
      label: "Download final poster",
      includesArtwork: true,
      includesText: true,
      includesLogos: true,
    });
    assert.deepEqual(getPosterDownloadDescriptor("artwork"), {
      label: "Download artwork only",
      includesArtwork: true,
      includesText: false,
      includesLogos: false,
    });
  });
});

describe("reference curation and resolution honesty", () => {
  test("only approved strong material crops are attached", () => {
    assert.deepEqual(
      POSTER_CATEGORIES["mixed-media"].referenceCrops.map((item) => item.file),
      ["image 78.png", "image 80.png", "image 81.png"],
    );
    assert.deepEqual(
      POSTER_CATEGORIES["glassmorphism-3d"].referenceCrops.map(
        (item) => item.file,
      ),
      ["image 92.png", "image 95.png", "image 87.png"],
    );
    assert.deepEqual(
      POSTER_CATEGORIES.illustrative.referenceCrops.map((item) => item.file),
      ["image 101.png", "image 102.png", "image 98.png"],
    );
    assert.doesNotMatch(
      JSON.stringify(POSTER_CATEGORIES.illustrative.referenceCrops),
      /image (99|100)\.png/,
    );
    for (const category of CATEGORIES) {
      for (const reference of POSTER_CATEGORIES[category].referenceCrops) {
        assert.ok(reference.crop);
        assert.ok(reference.crop!.width <= 500);
        assert.ok(reference.crop!.height <= 500);
      }
    }
  });

  test("native, upscaled and downsampled states are distinct", () => {
    assert.deepEqual(classifyImageResolution(3840, 2160, 3840, 2160), {
      native: true,
      resampled: false,
      upscaled: false,
      downsampled: false,
    });
    assert.deepEqual(classifyImageResolution(1536, 1024, 3840, 2160), {
      native: false,
      resampled: true,
      upscaled: true,
      downsampled: false,
    });
    assert.deepEqual(classifyImageResolution(4096, 2304, 3840, 2160), {
      native: false,
      resampled: true,
      upscaled: false,
      downsampled: true,
    });
  });
});

describe("background colour policy", () => {
  test("no approved background combination is white or a pale neutral", () => {
    for (const combo of Object.values(POSTER_BACKGROUND_COMBINATIONS)) {
      assert.notEqual(combo.background.toUpperCase(), "#FEFEFE");
      assert.notEqual(combo.background.toUpperCase(), "#E3E0DC");
    }
  });

  test("auto restricts a model-chosen white background to an approved dark hue", () => {
    const payload = { ...LARGE_MIDCAP_DETERMINISTIC_FIXTURE, backgroundChoice: "auto" as const };
    const concept = normalizePosterConcept(
      {
        selectedColourCombination: {
          name: "Model's own idea",
          background: "#FEFEFE",
          backgroundTreatment: "A soft, light white background.",
          accents: ["#FEFEFE"],
          textColours: ["#0A3253"],
          rationale: "A clean look.",
        },
      },
      payload,
    );
    assert.notEqual(concept.selectedColourCombination.background, "#FEFEFE");
    assert.doesNotMatch(concept.selectedColourCombination.backgroundTreatment, /white/i);
  });

  test("an explicit background choice overrides whatever the model proposes", () => {
    const payload = { ...LARGE_MIDCAP_DETERMINISTIC_FIXTURE, backgroundChoice: "maroon-navy" as const };
    const concept = normalizePosterConcept(
      {
        selectedColourCombination: {
          name: "Model's own idea",
          background: "#0A3253",
          backgroundTreatment: "Solid Prussian Blue.",
          accents: ["#D89828"],
          textColours: ["#FEFEFE"],
          rationale: "Model preferred solid blue.",
        },
      },
      payload,
    );
    assert.deepEqual(
      concept.selectedColourCombination,
      POSTER_BACKGROUND_COMBINATIONS["maroon-navy"],
    );
  });
});

describe("clarification questions", () => {
  test("a valid clarification response parses with generated ids and preserved options", () => {
    const text = JSON.stringify({
      needs_clarification: true,
      questions: [
        { question: "Which tone fits best?", options: ["Formal", "Conversational", "Playful"] },
        { question: "Which time horizon?", options: ["Short-term", "Medium-term", "Long-term"] },
      ],
    });
    const questions = parseClarificationQuestions(text);
    assert.ok(questions);
    assert.equal(questions!.length, 2);
    assert.deepEqual(questions![0], {
      id: "q1",
      question: "Which tone fits best?",
      options: ["Formal", "Conversational", "Playful"],
    });
    assert.equal(questions![1].id, "q2");
  });

  test("a normal concept response (no needs_clarification flag) is not treated as a question", () => {
    const text = JSON.stringify({ conceptTitle: "Some concept", masterImageGenerationPrompt: "..." });
    assert.equal(parseClarificationQuestions(text), null);
  });

  test("malformed JSON returns null instead of throwing", () => {
    assert.equal(parseClarificationQuestions("{not valid json"), null);
  });

  test("a question without exactly 3 options is dropped, not padded or truncated", () => {
    const text = JSON.stringify({
      needs_clarification: true,
      questions: [
        { question: "Bad question", options: ["Only one"] },
        { question: "Good question", options: ["A", "B", "C"] },
      ],
    });
    const questions = parseClarificationQuestions(text);
    assert.ok(questions);
    assert.equal(questions!.length, 1);
    assert.equal(questions![0].question, "Good question");
  });

  test("more than 3 questions are capped at 3", () => {
    const text = JSON.stringify({
      needs_clarification: true,
      questions: Array.from({ length: 5 }, (_, index) => ({
        question: `Question ${index + 1}`,
        options: ["A", "B", "C"],
      })),
    });
    const questions = parseClarificationQuestions(text);
    assert.ok(questions);
    assert.equal(questions!.length, 3);
  });

  test("a repeated clarification attempt after answers were supplied fails instead of succeeding silently", () => {
    const payloadWithAnswers = {
      ...LARGE_MIDCAP_DETERMINISTIC_FIXTURE,
      clarificationAnswers: { "Which tone fits best?": "Formal" },
    };
    const repeatedClarificationText = JSON.stringify({
      needs_clarification: true,
      questions: [{ question: "Again?", options: ["A", "B", "C"] }],
    });
    assert.throws(() => parsePosterConcept(repeatedClarificationText, payloadWithAnswers));

    // The same shape is accepted as an ordinary (if incomplete) concept
    // response when no answers were supplied yet, since the model is still
    // free to ask on the first round — it just isn't a valid concept, so it
    // normalizes via fallback defaults rather than throwing this specific error.
    const payloadWithoutAnswers = { ...LARGE_MIDCAP_DETERMINISTIC_FIXTURE, clarificationAnswers: undefined };
    assert.doesNotThrow(() => parsePosterConcept(repeatedClarificationText, payloadWithoutAnswers));
  });
});

describe("logo variant selection", () => {
  function findLogo(concept: PosterConcept, brandNameIncludes: string) {
    return concept.editablePosterLayoutSpecification.layers.find(
      (layer) => layer.type === "logo" && layer.logo?.brandName.includes(brandNameIncludes),
    );
  }

  test("defaults to the white CNBC TV18 mark and the dark-background Bandhan mark", () => {
    const concept = getPosterOutputSchema(LARGE_MIDCAP_DETERMINISTIC_FIXTURE);
    const cnbc = findLogo(concept, "CNBC");
    assert.equal(cnbc?.logo?.brandName, "CNBC TV18 (white)");
    assert.match(cnbc!.logo!.assetPath, /variant=tv18-white/);
    const bandhan = findLogo(concept, "Bandhan");
    assert.match(bandhan!.logo!.assetPath, /variant=dark-bg/);
  });

  test("an explicit CNBC-AWAAZ / light-background choice changes the resolved asset path", () => {
    const concept = getPosterOutputSchema({
      ...LARGE_MIDCAP_DETERMINISTIC_FIXTURE,
      cnbcLogoVariant: "awaaz-white",
      bandhanLogoVariant: "light-bg",
    });
    const cnbc = findLogo(concept, "CNBC");
    assert.equal(cnbc?.logo?.brandName, "CNBC-AWAAZ (white)");
    assert.match(cnbc!.logo!.assetPath, /variant=awaaz-white/);
    const bandhan = findLogo(concept, "Bandhan");
    assert.match(bandhan!.logo!.assetPath, /variant=light-bg/);
  });
});
