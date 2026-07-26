import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  AVOID_GLOBALLY,
  formatArtDirection,
  formatTopicFigureGuidance,
  getTopicFigureGuidance,
  TOPIC_FIGURE_PATTERNS,
} from "../../lib/poster-figure-vocabulary";
import { buildPosterSystemPrompt } from "../../lib/openai-poster";
import {
  getFinancialNarrativeSeed,
  POSTER_CATEGORIES,
} from "../../lib/poster-reference-system";
import type { PosterModelCategory, PosterStudioPayload } from "../../lib/poster-types";

// These guard the fix for the "3D figures are irrelevant / not Indian" failure.
// Root cause was two-fold: the STYLE categories carried subject suggestions, and the
// SUBJECT seeds described invented apparatus ("input cradle, constraint gate, outcome
// tray") that rendered as lab equipment. Both are structural, so both are tested
// structurally rather than left to prompt review.

function brief(topic: string, overrides: Partial<PosterStudioPayload> = {}): PosterStudioPayload {
  return {
    mode: "poster-design",
    headline: "",
    subheading: "",
    bodyCopy: "",
    cta: "Watch MF Corner today at 2 PM",
    topic,
    modelCategory: "glassmorphism-3d",
    visualDirection: "",
    outputSize: { width: 2160, height: 2700 },
    backgroundChoice: "auto",
    ...overrides,
  } as PosterStudioPayload;
}

// Function-described parts rather than nameable objects — the exact vocabulary that
// produced industrial-looking heroes.
const APPARATUS_WORDS =
  /\b(cradle|constraint gate|outcome tray|accumulator|duration lever|contribution module|sorting mechanism|offset gate|allocation frame|decision instrument|precision instrument|gyroscop|speedometer|dashboard)\w*/i;

const CATEGORY_IDS = Object.keys(POSTER_CATEGORIES) as PosterModelCategory[];

describe("style categories carry no subject vocabulary", () => {
  // If a category names objects, then switching style silently switches subject —
  // which is precisely the bug being fixed.
  const SUBJECT_NOUNS =
    /\b(compass|gyroscope|vault|balance|gauge|meter|bar chart|coin stack|piggy bank|staircase|gear|hourglass|binocular)\w*/i;

  for (const id of CATEGORY_IDS) {
    test(`${id} describes how to render, not what to render`, () => {
      const directive = POSTER_CATEGORIES[id].promptDirective;
      const match = directive.match(SUBJECT_NOUNS);
      assert.equal(
        match,
        null,
        `style category "${id}" names a subject (${match?.[0]}); subjects must come from the topic only`,
      );
    });

    test(`${id} states that it is style-only`, () => {
      assert.match(
        POSTER_CATEGORIES[id].promptDirective,
        /STYLE ONLY/,
        `category "${id}" must declare that it does not choose the subject`,
      );
    });
  }
});

describe("topic drives the subject, with Indian props", () => {
  const REAL_TOPICS: Array<{ topic: string; expect: RegExp }> = [
    { topic: "understanding nifty banknifty and sensex", expect: /tokri|basket|sheaf|taraju/i },
    { topic: "understanding small cap and midcap mutual funds", expect: /paili|seer|tiffin|gullak/i },
    { topic: "how SIP works for first time investors", expect: /gullak|panchang|matka/i },
    { topic: "why diversification matters", expect: /thali|katori|masala dabba|compartment/i },
    { topic: "the power of compounding over 20 years", expect: /banyan|peepal|sapling|grain/i },
    { topic: "handling market volatility and corrections", expect: /lattu|taraju|monsoon/i },
    { topic: "gold ETF vs physical gold", expect: /bangle|jeweller|gold coin/i },
    { topic: "what is inflation doing to your savings", expect: /paili|tokri|grain|note/i },
  ];

  for (const { topic, expect } of REAL_TOPICS) {
    test(`"${topic}" resolves to a topic-appropriate Indian object`, () => {
      const guidance = getTopicFigureGuidance(brief(topic));
      assert.notEqual(guidance.matchedId, null, `no pattern matched "${topic}"`);
      const figures = guidance.figures.join(" ");
      assert.match(figures, expect, `figures for "${topic}" were: ${figures}`);
    });
  }

  test("an unmatched topic still demands a nameable object, not an apparatus", () => {
    const guidance = getTopicFigureGuidance(brief("a topic nothing will match xyzzy"));
    assert.equal(guidance.matchedId, null);
    assert.doesNotMatch(guidance.figures.join(" "), APPARATUS_WORDS);
    assert.match(guidance.figures.join(" "), /gullak|taraju|thali|paili|passbook|bahi-khata/i);
    assert.match(
      guidance.avoid.join(" "),
      /mechanism|apparatus|machine/i,
      "the fallback must explicitly forbid inventing a mechanism",
    );
  });

  test("the same topic yields the same subject regardless of style category", () => {
    const subjects = CATEGORY_IDS.map((modelCategory) =>
      JSON.stringify(getTopicFigureGuidance(brief("how SIP works", { modelCategory })).figures),
    );
    assert.equal(
      new Set(subjects).size,
      1,
      "changing the style category must not change the chosen subject",
    );
  });

  test("every style category specifies the full render stack", () => {
    // A category that omits one of these renders to the model's defaults for that
    // axis, which is where generic AI-looking output comes from.
    for (const id of CATEGORY_IDS) {
      const directive = POSTER_CATEGORIES[id].promptDirective;
      for (const axis of ["CAMERA", "LIGHTING", "MATERIAL", "DEPTH", "FINISH"]) {
        assert.ok(
          directive.includes(`${axis}:`),
          `style category "${id}" is missing its ${axis} spec`,
        );
      }
    }
  });

  test("every style category is distinguishable from the others", () => {
    // Two categories that read the same produce the same picture, which defeats
    // offering the choice at all.
    const shortLabels = CATEGORY_IDS.map((id) => POSTER_CATEGORIES[id].shortLabel);
    assert.equal(new Set(shortLabels).size, shortLabels.length, "short labels must be unique");

    for (const id of CATEGORY_IDS) {
      const directive = POSTER_CATEGORIES[id].promptDirective;
      assert.match(
        directive,
        /Do not|never|Never|zero gloss|no gloss/,
        `style category "${id}" must rule out the neighbouring styles it could collapse into`,
      );
    }
  });

  test("every pattern offers at least two committed options and its own traps", () => {
    for (const pattern of TOPIC_FIGURE_PATTERNS) {
      assert.ok(pattern.figures.length >= 2, `${pattern.id} needs alternatives to choose between`);
      assert.ok(pattern.avoid.length >= 1, `${pattern.id} needs topic-specific traps`);
    }
  });

  test("the index pattern rejects the pie-chart and three-coin failure that shipped", () => {
    const guidance = getTopicFigureGuidance(brief("understanding nifty banknifty and sensex"));
    const avoid = guidance.avoid.join(" ");
    assert.match(avoid, /pie/i, "an index is a weighted basket, not a pie chart");
    assert.match(avoid, /three|trio/i, "an index is a large crowd, not three coins");
  });
});

describe("narrative seeds name objects rather than invented mechanisms", () => {
  const TOPICS = [
    "understanding nifty banknifty and sensex",
    "understanding small cap and midcap mutual funds",
    "large cap and mid cap allocation",
    "how SIP works",
    "why diversification matters",
    "market cycles and volatility",
    "gold ETF vs physical gold",
    "something entirely unmatched",
  ];

  for (const topic of TOPICS) {
    test(`"${topic}" seed avoids apparatus language`, () => {
      const seed = getFinancialNarrativeSeed(brief(topic));
      const text = [
        seed.heroMetaphor,
        seed.relationship,
        ...seed.visualMappings.map((mapping) => mapping.element),
      ].join(" ");
      const match = text.match(APPARATUS_WORDS);
      assert.equal(match, null, `seed for "${topic}" used apparatus word: ${match?.[0]}`);
    });
  }

  test("the large/mid-cap lock is a taraju, not a lab instrument", () => {
    const seed = getFinancialNarrativeSeed(brief("large cap and mid cap funds"));
    assert.match(seed.heroMetaphor, /taraju/i);
    assert.match(seed.heroMetaphor, /coin/i, "both loads must be recognisable money material");
  });
});

describe("'show me different options' excludes what was already shown", () => {
  const REJECTED = [
    "Cane tokri holding many unequal coin-discs as one size-weighted index",
    "Bound sheaf of currency slips representing companies measured as one index",
  ];

  test("rejected options are listed back to the model with a do-not-repeat rule", () => {
    const prompt = buildPosterSystemPrompt(
      brief("understanding nifty banknifty and sensex", { rejectedFigures: REJECTED }),
    );
    assert.match(prompt, /ALREADY REJECTED/);
    for (const figure of REJECTED) {
      assert.ok(prompt.includes(figure), `rejected option missing from prompt: ${figure}`);
    }
    assert.match(prompt, /do not offer a near-variation/i, "rewording must be ruled out too");
  });

  test("a first pass carries no exclusion block", () => {
    const prompt = buildPosterSystemPrompt(brief("understanding nifty banknifty and sensex"));
    assert.doesNotMatch(prompt, /ALREADY REJECTED/);
  });

  test("the exclusion block is dropped once the user has answered", () => {
    const prompt = buildPosterSystemPrompt(
      brief("understanding nifty banknifty and sensex", {
        rejectedFigures: REJECTED,
        clarificationAnswers: { "Which figure should represent this topic?": "A steel gullak" },
      }),
    );
    // Answered briefs take the "produce the concept now" path, never the ask path.
    assert.doesNotMatch(prompt, /ALREADY REJECTED/);
    assert.match(prompt, /CLARIFICATION ALREADY ANSWERED/);
  });
});

describe("index topics get real constituent counts", () => {
  const CASES: Array<{ topic: string; expect: RegExp }> = [
    { topic: "understanding nifty and sensex", expect: /Nifty 50 measures 50 companies/ },
    { topic: "what bank nifty tracks", expect: /Bank Nifty measures 12 companies/ },
    { topic: "sensex explained", expect: /Sensex measures 30 companies/ },
  ];

  for (const { topic, expect } of CASES) {
    test(`"${topic}" carries the real count`, () => {
      const guidance = getTopicFigureGuidance(brief(topic));
      assert.ok(guidance.indexNote, `no index note for "${topic}"`);
      assert.match(guidance.indexNote ?? "", expect);
    });
  }

  test("bank nifty is not mistaken for nifty 50", () => {
    const note = getTopicFigureGuidance(brief("bank nifty basics")).indexNote ?? "";
    assert.match(note, /Bank Nifty measures 12/);
    assert.doesNotMatch(note, /Nifty 50 measures/);
  });

  test("the count must not be drawn as a digit", () => {
    const rendered = formatTopicFigureGuidance(getTopicFigureGuidance(brief("nifty 50 explained")));
    assert.match(rendered, /INDEX FACTS/);
    assert.match(rendered, /Never render the number as a digit/);
  });

  test("non-index topics carry no index note", () => {
    assert.equal(getTopicFigureGuidance(brief("how SIP works")).indexNote, null);
  });
});

describe("art direction refines without overriding the style", () => {
  test("a material choice is stated as a preference the style can veto", () => {
    const direction = formatArtDirection("brass", "auto") ?? "";
    assert.match(direction, /HERO MATERIAL/);
    assert.match(direction, /brass/i);
    assert.match(direction, /preference, not an override/i);
    assert.match(direction, /clay must stay clay/i);
    assert.doesNotMatch(direction, /LIGHTING MOOD/);
  });

  test("a mood choice only shifts temperature and contrast", () => {
    const direction = formatArtDirection("auto", "warm-festive") ?? "";
    assert.match(direction, /LIGHTING MOOD/);
    assert.match(direction, /diyas/i);
    assert.match(direction, /colour-temperature and contrast shift only/i);
  });

  test("auto on both sides adds nothing to the prompt", () => {
    assert.equal(formatArtDirection("auto", "auto"), null);
    assert.equal(formatArtDirection(undefined, undefined), null);
  });

  test("an unknown value is ignored rather than injected raw", () => {
    assert.equal(formatArtDirection("unobtanium", "strobe"), null);
  });
});

describe("the stock-template look is ruled out", () => {
  test("the default Indian mutual-fund template style is named as an anti-reference", () => {
    const globals = AVOID_GLOBALLY.join(" ");
    assert.match(globals, /clip-art/i);
    assert.match(globals, /cartoon families|businessmen/i);
    assert.match(globals, /template/i);
  });
});

describe("the assembled subject brief is usable", () => {
  test("it names the idea, the options and both avoid lists", () => {
    const rendered = formatTopicFigureGuidance(
      getTopicFigureGuidance(brief("why diversification matters")),
    );
    assert.match(rendered, /FINANCIAL IDEA TO MAKE VISIBLE/);
    assert.match(rendered, /SUBJECT OPTIONS/);
    assert.match(rendered, /WRONG FOR THIS TOPIC/);
    assert.match(rendered, /ALSO WRONG FOR THIS AUDIENCE/);
    assert.match(rendered, /thali/i);
  });

  test("Western defaults are ruled out for this audience", () => {
    const globals = AVOID_GLOBALLY.join(" ");
    assert.match(globals, /piggy bank/i);
    assert.match(globals, /dollar/i);
    assert.match(globals, /Wall Street|charging bull/i);
    assert.match(globals, /deities|devotional/i);
    assert.match(globals, /Aadhaar|PAN/);
  });
});
