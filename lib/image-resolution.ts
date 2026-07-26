export function classifyImageResolution(
  sourceWidth: number,
  sourceHeight: number,
  outputWidth: number,
  outputHeight: number,
) {
  const native = sourceWidth === outputWidth && sourceHeight === outputHeight;
  return {
    native,
    resampled: !native,
    upscaled: sourceWidth < outputWidth || sourceHeight < outputHeight,
    downsampled: sourceWidth > outputWidth || sourceHeight > outputHeight,
  };
}
