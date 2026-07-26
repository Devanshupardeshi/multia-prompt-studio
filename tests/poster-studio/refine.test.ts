import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildPosterRefinePrompt,
  describeRefineRegion,
  getRefineUploadSize,
  REFINE_UPLOAD_MAX_EDGE,
  type PosterRefineInvariants,
  type PosterRefineRegion,
} from "../../lib/poster-refine";

const INVARIANTS: PosterRefineInvariants = {
  canvas: { width: 2160, height: 2700 },
  background: "#0A3253",
  palette: ["#0A3253", "#D89828", "#C9EAFB"],
  reserved: [
    { label: "CNBC logo-safe area", bounds: { x: 3, y: 3, width: 13, height: 6 } },
    { label: "headline-safe area", bounds: { x: 10, y: 31, width: 80, height: 12 } },
  ],
};

describe("the refinement prompt carries context the designer does not restate", () => {
  const prompt = buildPosterRefinePrompt({
    instruction: "The hero is too large — scale it down",
    invariants: INVARIANTS,
    region: null,
  });

  test("it is framed as an edit of the existing artwork, not a new poster", () => {
    assert.match(prompt, /EDIT THE ATTACHED POSTER ARTWORK/);
    assert.match(prompt, /not a new poster/i);
  });

  test("the designer's instruction is passed through verbatim", () => {
    assert.match(prompt, /The hero is too large — scale it down/);
  });

  test("the campaign invariants are re-attached automatically", () => {
    assert.match(prompt, /2160 x 2700/);
    assert.match(prompt, /#0A3253/);
    assert.match(prompt, /#D89828/);
    assert.match(prompt, /CNBC logo-safe area: x 3-16%/);
    assert.match(prompt, /headline-safe area/);
    assert.match(prompt, /no text, letters, words, numerals/i);
  });

  test("it protects everything the instruction did not ask to change", () => {
    assert.match(prompt, /WHAT MUST NOT CHANGE/);
    assert.match(prompt, /changing as little as possible/i);
  });
});

describe("a marked region travels as text, since OAuth rejects edit masks", () => {
  test("the region is described by position and exact percentages", () => {
    const prompt = buildPosterRefinePrompt({
      instruction: "Change the background here",
      invariants: INVARIANTS,
      region: { x: 0.1, y: 0.7, width: 0.3, height: 0.2 },
    });
    assert.match(prompt, /lower left area/i);
    assert.match(prompt, /x 10%–40%/);
    assert.match(prompt, /y 70%–90%/);
    assert.match(prompt, /outside that area must come through completely unchanged/i);
  });

  test("it never mentions a mask, which would fail on this transport", () => {
    const prompt = buildPosterRefinePrompt({
      instruction: "Change the background",
      invariants: INVARIANTS,
      region: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
    });
    assert.doesNotMatch(prompt, /mask/i);
  });

  test("without a region it edits the whole image conservatively", () => {
    const prompt = buildPosterRefinePrompt({
      instruction: "Change the background",
      invariants: INVARIANTS,
      region: null,
    });
    assert.match(prompt, /changing as little as possible/i);
    assert.doesNotMatch(prompt, /mask/i);
  });
});

describe("region descriptions name a position a designer would recognise", () => {
  const CASES: Array<{ region: PosterRefineRegion; expect: RegExp }> = [
    { region: { x: 0.4, y: 0.0, width: 0.2, height: 0.2 }, expect: /upper-centre/ },
    { region: { x: 0.0, y: 0.4, width: 0.2, height: 0.2 }, expect: /middle left/ },
    { region: { x: 0.7, y: 0.7, width: 0.3, height: 0.3 }, expect: /lower right/ },
    { region: { x: 0.3, y: 0.8, width: 0.4, height: 0.2 }, expect: /lower-centre/ },
  ];
  for (const { region, expect } of CASES) {
    test(`${JSON.stringify(region)} reads as ${expect.source}`, () => {
      assert.match(describeRefineRegion(region), expect);
    });
  }
});

describe("an attached reference is explained rather than pasted", () => {
  test("the prompt names both images and forbids collaging the reference", () => {
    const prompt = buildPosterRefinePrompt({
      instruction: "Match this texture",
      invariants: INVARIANTS,
      region: null,
      hasReference: true,
    });
    assert.match(prompt, /the first is the poster artwork to edit/i);
    assert.match(prompt, /second is a visual reference/i);
    assert.match(prompt, /Never paste, collage or reproduce the reference/i);
  });

  test("with no reference it describes a single attachment", () => {
    const prompt = buildPosterRefinePrompt({
      instruction: "Make it smaller",
      invariants: INVARIANTS,
      region: null,
    });
    assert.match(prompt, /ATTACHED IMAGE: the poster artwork to edit/);
    assert.doesNotMatch(prompt, /second is a visual reference/i);
  });
});

describe("upload sizing keeps the request under the platform limit", () => {
  test("a full-size poster is scaled down to the long-edge cap", () => {
    const size = getRefineUploadSize(2160, 2700);
    assert.equal(Math.max(size.width, size.height), REFINE_UPLOAD_MAX_EDGE);
    // Aspect ratio must survive so the described region still maps to what is seen.
    assert.ok(Math.abs(size.width / size.height - 2160 / 2700) < 0.01);
  });

  test("an already-small image is never upscaled", () => {
    assert.deepEqual(getRefineUploadSize(400, 500), { width: 400, height: 500 });
  });
});
