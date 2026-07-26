import assert from "node:assert/strict";
import { describe, test } from "node:test";
import sharp from "sharp";
import { correctGptImageWarmCast } from "../lib/image-color-correction";

// Synthesizes a pixel that looks like GPT Image 2's warm cast on something meant
// to be neutral white (R and G near max, B pulled down) and checks the correction
// actually closes that gap rather than leaving it or overcorrecting into a blue cast.
async function correctedPixel(r: number, g: number, b: number) {
  const source = await sharp({
    create: { width: 1, height: 1, channels: 3, background: { r, g, b } },
  })
    .png()
    .toBuffer();

  const { data } = await correctGptImageWarmCast(sharp(source))
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { r: data[0], g: data[1], b: data[2] };
}

describe("GPT Image warm-cast correction", () => {
  test("closes the red/blue gap on a warm-shifted near-white pixel", async () => {
    const before = { r: 255, g: 255, b: 230 }; // the amber cast GPT Image 2 produces
    const after = await correctedPixel(before.r, before.g, before.b);

    const gapBefore = before.r - before.b;
    const gapAfter = after.r - after.b;

    assert.ok(gapAfter < gapBefore, `expected the R-B gap to shrink: ${gapBefore} -> ${gapAfter}`);
    assert.ok(gapAfter >= 0, `correction should not overshoot into a visible blue cast, got gap ${gapAfter}`);
  });

  test("stays mild — no channel moves by more than a few percent", async () => {
    const after = await correctedPixel(200, 180, 150);
    assert.ok(Math.abs(after.r - 200) <= 10, "red should only be nudged, not graded");
    assert.ok(Math.abs(after.g - 180) <= 10, "green should only be nudged, not graded");
    assert.ok(Math.abs(after.b - 150) <= 15, "blue should only be nudged, not graded");
  });

  test("leaves a genuinely neutral pixel close to neutral", async () => {
    const after = await correctedPixel(128, 128, 128);
    const spread = Math.max(after.r, after.g, after.b) - Math.min(after.r, after.g, after.b);
    // The correction is a fixed mild gain, so a perfectly neutral pixel picks up a
    // small blue lift too (~5%) — that is expected, not a regression. Only flag a
    // spread big enough to read as a visible new cast.
    assert.ok(spread <= 16, `a neutral grey should not pick up a strong new cast, spread was ${spread}`);
  });
});
