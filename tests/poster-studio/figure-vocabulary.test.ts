import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  AVOID_GLOBALLY,
  formatTopicFigureGuidance,
  getTopicFigureGuidance,
  TOPIC_FIGURE_PATTERNS,
} from "../../lib/poster-figure-vocabulary";
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
    cnbcLogoVariant: "tv18",
    bandhanLogoVariant: "dark-bg",
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
