import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  buildStudioRefinePrompt,
  getStudioRefineCopy,
  isStudioRefineMode,
  STUDIO_REFINE_MODES,
} from "../lib/studio-refine";

const canvas = { width: 3840, height: 2160 };

function prompt(mode: (typeof STUDIO_REFINE_MODES)[number], overrides = {}) {
  return buildStudioRefinePrompt({
    instruction: "Make the background darker",
    mode,
    canvas,
    ...overrides,
  });
}

describe("studio refinement locks what each mode must not lose", () => {
  it("locks the identity in a face swap, not just the composition", () => {
    const text = prompt("face_swap");
    assert.match(text, /THE FACE IS LOCKED/);
    // The lighting caveat is the one that matters: "make it warmer" must not be
    // read as licence to re-render the face.
    assert.match(text, /even when the instruction is about lighting/i);
  });

  it("locks the logo artwork in a mockup", () => {
    const text = prompt("mockup");
    assert.match(text, /THE LOGO ARTWORK IS LOCKED/);
    assert.match(text, /physically printed on the surface/);
  });

  it("does not leak another mode's lock", () => {
    assert.doesNotMatch(prompt("standard"), /FACE IS LOCKED|LOGO ARTWORK IS LOCKED/);
    assert.doesNotMatch(prompt("mockup"), /THE FACE IS LOCKED/);
    assert.doesNotMatch(prompt("face_swap"), /THE LOGO ARTWORK IS LOCKED/);
  });

  it("states the canvas and forbids invented text for every mode", () => {
    for (const mode of STUDIO_REFINE_MODES) {
      const text = prompt(mode);
      assert.match(text, /Canvas 3840 x 2160/);
      assert.match(text, /Do not add text/);
      assert.match(text, /Make the background darker/);
    }
  });
});

describe("region and reference handling", () => {
  it("describes a marked region in words, never as a mask", () => {
    const text = prompt("standard", {
      region: { x: 0.7, y: 0.05, width: 0.2, height: 0.2 },
    });
    assert.match(text, /upper right area of the canvas/);
    assert.match(text, /x 70%–90%/);
    assert.doesNotMatch(text, /mask/i);
  });

  it("falls back to a whole-image edit with the smallest possible change", () => {
    assert.match(prompt("standard"), /changing as little as possible/);
  });

  it("tells the model the second image is guidance, not collage material", () => {
    const text = prompt("mockup", { hasReference: true });
    assert.match(text, /ATTACHED IMAGES/);
    assert.match(text, /guidance only/);
    assert.match(text, /Never paste, collage or reproduce the reference/);
  });
});

describe("mode gating", () => {
  it("accepts exactly the three image modes", () => {
    assert.deepEqual([...STUDIO_REFINE_MODES], ["standard", "face_swap", "mockup"]);
    for (const mode of STUDIO_REFINE_MODES) assert.ok(isStudioRefineMode(mode));
    for (const mode of ["poster-design", "video", "3d_website", "", null, 7]) {
      assert.ok(!isStudioRefineMode(mode), `${String(mode)} must not be refinable`);
    }
  });

  it("gives each mode its own starter edits and hint", () => {
    const hints = new Set(STUDIO_REFINE_MODES.map((mode) => getStudioRefineCopy(mode).hint));
    assert.equal(hints.size, STUDIO_REFINE_MODES.length);
    assert.match(getStudioRefineCopy("face_swap").hint, /face is locked/i);
    assert.match(getStudioRefineCopy("mockup").hint, /logo artwork is locked/i);
  });

  it("falls back to standard copy for a mode with no refinement of its own", () => {
    assert.deepEqual(getStudioRefineCopy("deep_research"), getStudioRefineCopy("standard"));
  });
});
