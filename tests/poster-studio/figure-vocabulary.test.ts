import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  AVOID_GLOBALLY,
  formatArtDirection,
  INDIAN_CURRENCY_SPEC,
  formatTopicFigureGuidance,
  getTopicFigureGuidance,
  TOPIC_FIGURE_PATTERNS,
} from "../../lib/poster-figure-vocabulary";
import { buildPosterSystemPrompt } from "../../lib/openai-poster";
import {
  getFinancialNarrativeSeed,
  getPosterOutputSchema,
  POSTER_CATEGORIES,
} from "../../lib/poster-reference-system";
import {
  getPosterConceptValidationErrors,
  POSTER_MODEL_CATEGORIES,
} from "../../lib/poster-types";
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

describe("every style category survives the whole contract chain", () => {
  // A hardcoded category list in the shape validator once let a new style pass the
  // form and the route, then fail with "does not match the production-contract
  // shape" only after a paid model call. Every category must validate end to end.
  for (const id of CATEGORY_IDS) {
    test(`${id} produces a concept that passes contract validation`, () => {
      const payload = brief("understanding nifty and sensex", {
        headline: "Understanding index funds",
        modelCategory: id,
      });
      const errors = getPosterConceptValidationErrors(getPosterOutputSchema(payload), {
        topic: payload.topic,
        expectedCanvas: payload.outputSize,
      });
      assert.deepEqual(errors, [], `${id} failed contract validation`);
    });
  }

  test("the registry and the validated union cannot drift apart", () => {
    assert.deepEqual(
      [...POSTER_MODEL_CATEGORIES].sort(),
      [...CATEGORY_IDS].sort(),
      "POSTER_CATEGORIES and POSTER_MODEL_CATEGORIES must list the same styles",
    );
  });
});

describe("the vocabulary grounds without dictating one fixed prop", () => {
  // The first version handed the model three fixed options and said "choose ONE",
  // so every diversification poster became a steel thali. These lock in the fix.
  test("the full prop vocabulary reaches the model, not just the topic examples", () => {
    const rendered = formatTopicFigureGuidance(
      getTopicFigureGuidance(brief("why diversification matters")),
    );
    // All ten prop groups, not only the three worked examples.
    for (const prop of ["gullak", "taraju", "bahi-khata", "passbook", "bangles", "banyan", "UPI"]) {
      assert.ok(rendered.includes(prop), `prop vocabulary is missing "${prop}"`);
    }
  });

  test("it asks the model to invent for this brief rather than pick from a menu", () => {
    const rendered = formatTopicFigureGuidance(
      getTopicFigureGuidance(brief("why diversification matters")),
    );
    assert.match(rendered, /INVENT THE SUBJECT FOR THIS SPECIFIC BRIEF/);
    assert.match(rendered, /not because it appears in a list/i);
    assert.doesNotMatch(rendered, /choose ONE and commit/i);
    assert.match(rendered, /WORKED EXAMPLES/);
  });

  test("two briefs on the same topic do not open with the same example", () => {
    const leads = [
      "Why one fund is not enough",
      "Spread your risk across assets",
      "How balanced funds work",
      "One portfolio, many roles",
    ].map(
      (headline) =>
        getTopicFigureGuidance(brief("why diversification matters", { headline })).figures[0],
    );
    assert.ok(new Set(leads).size > 1, "every headline led with the identical example");
  });

  test("asking for different options rotates the lead example", () => {
    const first = getTopicFigureGuidance(brief("why diversification matters")).figures[0];
    const second = getTopicFigureGuidance(
      brief("why diversification matters", { rejectedFigures: ["one"] }),
    ).figures[0];
    assert.notEqual(first, second, "a re-ask must not lead with the same example");
  });

  test("rotation is deterministic, so a retry reproduces the same prompt", () => {
    const once = getTopicFigureGuidance(brief("why diversification matters", { headline: "A" }));
    const twice = getTopicFigureGuidance(brief("why diversification matters", { headline: "A" }));
    assert.deepEqual(once.figures, twice.figures);
  });

  test("rotation preserves every option rather than dropping any", () => {
    const base = getTopicFigureGuidance(brief("why diversification matters")).figures;
    const rotated = getTopicFigureGuidance(
      brief("why diversification matters", { rejectedFigures: ["a", "b"] }),
    ).figures;
    assert.deepEqual([...base].sort(), [...rotated].sort());
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
    assert.match(rendered, /INDIAN MONEY VOCABULARY/);
    assert.match(rendered, /WORKED EXAMPLES/);
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

// The designer's own visual direction used to travel only in the brief body, where it
// lost every argument against a numbered worked example — so every poster came back
// with the same taraju and steel-thali-with-katoris heroes regardless of what was
// typed into the field.
describe("the designer's visual direction outranks the examples", () => {
  test("it appears in the subject brief, marked binding, above the examples", () => {
    const rendered = formatTopicFigureGuidance(
      getTopicFigureGuidance(
        brief("why diversification matters", {
          visualDirection: "No thali, no katoris. Use a bank passbook.",
        }),
      ),
    );

    assert.match(rendered, /DESIGNER'S VISUAL DIRECTION — BINDING/);
    assert.match(rendered, /No thali, no katoris\. Use a bank passbook\./);
    assert.ok(
      rendered.indexOf("DESIGNER'S VISUAL DIRECTION") < rendered.indexOf("WORKED EXAMPLES"),
      "the binding direction must be stated before the examples it overrides",
    );
  });

  test("no such section exists when the field is left blank", () => {
    const rendered = formatTopicFigureGuidance(getTopicFigureGuidance(brief("sip basics")));
    assert.doesNotMatch(rendered, /VISUAL DIRECTION/);
  });

  test("it is carried through to the figure-options question", () => {
    const prompt = buildPosterSystemPrompt(
      brief("sip basics", { visualDirection: "Lean on the passbook, not vessels." }),
    );
    assert.match(prompt, /Lean on the passbook, not vessels\./);
    assert.match(prompt, /binding on this question/);
  });
});

describe("no topic gets a hard-locked subject", () => {
  test("an unrelated brief is told not to default to a weighing metaphor", () => {
    const prompt = buildPosterSystemPrompt(brief("how SIP builds wealth over 10 years"));
    assert.match(prompt, /No subject is pre-locked, for any topic/);
    assert.doesNotMatch(prompt, /subject is LOCKED/);
  });

  test("a large-cap vs mid-cap brief is no longer locked either", () => {
    const prompt = buildPosterSystemPrompt(
      brief("large cap vs mid cap: how to split your portfolio"),
    );
    assert.doesNotMatch(prompt, /subject is LOCKED/);
    assert.doesNotMatch(prompt, /precision portfolio balance/);
    // The figure question is what makes it correctable, so it must always run.
    assert.match(prompt, /MANDATORY HERO-FIGURE QUESTION/);
  });

  test("every brief still gets the figure question, whatever the visual direction says", () => {
    const prompt = buildPosterSystemPrompt(
      brief("what an index really measures", {
        visualDirection: "Avoid the usual large cap / mid cap balance cliché.",
      }),
    );
    assert.match(prompt, /No subject is pre-locked, for any topic/);
    assert.match(prompt, /MANDATORY HERO-FIGURE QUESTION/);
  });
});

describe("the unmatched-topic fallback does not always name the same props", () => {
  test("the leading prop varies across briefs", () => {
    // Rotation is a hash, so any single pair may collide; what matters is that the
    // fallback is not the one fixed list that made gullak/taraju/thali the house style.
    const leads = new Set(
      [
        "understanding expense ratio",
        "what is an exit load",
        "how NAV is calculated",
        "what is a folio number",
        "reading a fund factsheet",
        "what does AUM mean",
      ].map((topic) => getTopicFigureGuidance(brief(topic)).figures[0]),
    );
    assert.ok(leads.size > 1, `expected varied fallback props, got ${leads.size}`);
  });
});

// Image models default to American money — green notes, a $ sign, a blank gold
// disc — because that is what dominates their training data. For a CNBC × Bandhan
// campaign that is a credibility failure, not a style slip, so the spec is asserted
// structurally rather than left to prompt review.
describe("all currency is Indian, specified exactly", () => {
  test("every circulating denomination is named with its real colour and motif", () => {
    const pairs: Array<[string, RegExp]> = [
      ["₹10", /chocolate brown/i],
      ["₹20", /greenish yellow/i],
      ["₹50", /cyan-blue/i],
      ["₹100", /lavender/i],
      ["₹200", /saffron yellow/i],
      ["₹500", /stone grey/i],
    ];
    for (const [note, colour] of pairs) {
      const line = INDIAN_CURRENCY_SPEC.split("\n").find((l) => l.startsWith(`- ${note}:`));
      assert.ok(line, `${note} is not specified`);
      assert.match(line!, colour, `${note} is missing its real colour`);
    }
    for (const motif of [/Konark/, /Ellora/, /Hampi/, /Rani ki Vav/, /Sanchi/, /Red Fort/]) {
      assert.match(INDIAN_CURRENCY_SPEC, motif);
    }
  });

  test("coin metals are specified, since 'a coin' renders as a generic gold token", () => {
    assert.match(INDIAN_CURRENCY_SPEC, /₹1:.*stainless steel/);
    assert.match(INDIAN_CURRENCY_SPEC, /₹5:.*nickel-brass/);
    assert.match(INDIAN_CURRENCY_SPEC, /₹10:.*bimetallic/);
    assert.match(INDIAN_CURRENCY_SPEC, /₹20:.*(dodecagonal|twelve-sided)/);
    assert.match(INDIAN_CURRENCY_SPEC, /Lion Capital of Ashoka/);
  });

  test("real texture and engraved figures are demanded, not just colour", () => {
    assert.match(INDIAN_CURRENCY_SPEC, /PHYSICAL FIDELITY/);
    assert.match(INDIAN_CURRENCY_SPEC, /intaglio/i);
    assert.match(INDIAN_CURRENCY_SPEC, /cotton-rag/i);
    assert.match(INDIAN_CURRENCY_SPEC, /security thread/i);
    assert.match(INDIAN_CURRENCY_SPEC, /guilloche/i);
    assert.match(INDIAN_CURRENCY_SPEC, /struck relief/i);
    assert.match(INDIAN_CURRENCY_SPEC, /tarnish/i);
  });

  test("style may simplify the material but never the identity", () => {
    assert.match(INDIAN_CURRENCY_SPEC, /MATERIAL TREATMENT FOLLOWS THE STYLE CATEGORY/);
    assert.match(INDIAN_CURRENCY_SPEC, /Simplify the execution, never the identity/);
  });

  test("foreign money and stand-in tokens are ruled out explicitly", () => {
    for (const banned of [/dollars/i, /euros/i, /green-toned banknotes/i, /\$, €, £/, /blank unmarked gold/i, /flat vector or emoji-style/i, /₹2000/, /pre-2016/]) {
      assert.match(INDIAN_CURRENCY_SPEC, banned);
    }
  });

  test("the typography carve-out keeps the no-generated-text rule intact", () => {
    // Without this the spec and the poster's no-text rule contradict each other,
    // and the model resolves the conflict by inventing garbled numerals.
    assert.match(INDIAN_CURRENCY_SPEC, /do not attempt legible denomination numerals/i);
    assert.match(INDIAN_CURRENCY_SPEC, /never invent garbled pseudo-numerals/i);
    assert.match(INDIAN_CURRENCY_SPEC, /Everything pictorial .* is required in full detail/);
  });

  test("it reaches both the concept brief and the render prompt", () => {
    const rendered = formatTopicFigureGuidance(getTopicFigureGuidance(brief("sip basics")));
    assert.match(rendered, /CURRENCY SPECIFICATION/);
    assert.ok(rendered.includes(INDIAN_CURRENCY_SPEC), "the concept brief must carry the full spec");

    // The concept's master prompt is model-authored, so the render prompt has to
    // restate the spec itself rather than trust it to survive.
    assert.match(AVOID_GLOBALLY.join(" "), /CURRENCY SPECIFICATION, which is absolute/);
  });
});
