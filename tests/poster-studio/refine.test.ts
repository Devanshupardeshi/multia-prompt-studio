import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildPosterRefinePrompt,
  getMaskRect,
  getRefineUploadSize,
  REFINE_UPLOAD_MAX_EDGE,
  type PosterRefineInvariants,
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
    hasMask: false,
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

describe("a marked region becomes a masked edit", () => {
  test("the prompt tells the model to stay inside the mask", () => {
    const prompt = buildPosterRefinePrompt({
      instruction: "Change the background here",
      invariants: INVARIANTS,
      hasMask: true,
    });
    assert.match(prompt, /mask marks the region to change/i);
    assert.match(prompt, /leave every pixel outside it exactly as it is/i);
  });

  test("without a mask it says so instead of referring to one", () => {
    const prompt = buildPosterRefinePrompt({
      instruction: "Change the background",
      invariants: INVARIANTS,
      hasMask: false,
    });
    assert.doesNotMatch(prompt, /attached mask/i);
  });
});

describe("upload sizing keeps the request under the platform limit", () => {
  test("a full-size poster is scaled down to the long-edge cap", () => {
    const size = getRefineUploadSize(2160, 2700);
    assert.equal(Math.max(size.width, size.height), REFINE_UPLOAD_MAX_EDGE);
    // Aspect ratio must survive, or the mask would not line up with the artwork.
    assert.ok(Math.abs(size.width / size.height - 2160 / 2700) < 0.01);
  });

  test("an already-small image is never upscaled", () => {
    assert.deepEqual(getRefineUploadSize(400, 500), { width: 400, height: 500 });
  });
});

describe("mask geometry maps the drawn box onto the uploaded pixels", () => {
  const size = { width: 800, height: 1000 };

  test("a centre box converts to the matching pixel rect", () => {
    const rect = getMaskRect({ x: 0.25, y: 0.5, width: 0.5, height: 0.25 }, size);
    assert.deepEqual(rect, { x: 200, y: 500, width: 400, height: 250 });
  });

  test("a drag that ran past the edge is clamped inside the canvas", () => {
    const rect = getMaskRect({ x: 0.8, y: 0.9, width: 0.5, height: 0.5 }, size);
    assert.equal(rect.x, 640);
    assert.equal(rect.y, 900);
    assert.ok(rect.x + rect.width <= size.width, "must not extend past the right edge");
    assert.ok(rect.y + rect.height <= size.height, "must not extend past the bottom edge");
  });

  test("a negative or zero-size selection still yields a usable rect", () => {
    const rect = getMaskRect({ x: -0.2, y: -0.1, width: 0, height: 0 }, size);
    assert.ok(rect.width >= 1 && rect.height >= 1);
    assert.ok(rect.x >= 0 && rect.y >= 0);
  });
});
