import type sharp from "sharp";

// GPT Image 2 renders consistently skew warm — a visible yellow/amber cast across
// the whole frame, most noticeable on skin tones and anything meant to be neutral
// white or grey. This is a per-channel linear correction (output = a*input + b),
// not a hue rotation: a hue rotation would smear every other color around the
// wheel to fix just this one cast. Pulling red and green down slightly and
// pushing blue up slightly restores a closer-to-neutral white point without
// touching saturation, contrast, or any other hue.
//
// Values are tuned by eye against GPT Image 2 output, kept mild on purpose — this
// corrects a color cast, it is not meant to grade the image.
const RED_GAIN = 0.965;
const GREEN_GAIN = 0.975;
const BLUE_GAIN = 1.05;
const BLUE_OFFSET = 2;

/**
 * Applies the warm-cast correction to a sharp pipeline in place (sharp's methods
 * mutate and return `this`, so this is safe to drop into an existing chain).
 * Alpha is untouched — `linear()` only ever applies to color channels.
 */
export function correctGptImageWarmCast(pipeline: sharp.Sharp): sharp.Sharp {
  return pipeline.linear(
    [RED_GAIN, GREEN_GAIN, BLUE_GAIN],
    [0, 0, BLUE_OFFSET],
  );
}
