"use client";

import { getRefineUploadSize } from "./poster-refine";

// Browser-only: needs canvas and Image.

function toDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The artwork could not be read for refinement."));
    image.src = source;
  });
}

/**
 * Downscales an image for upload.
 *
 * Everything sent up is capped at the long-edge limit: a full 2160x2700 PNG
 * base64-encoded would exceed the platform request limit, and the render comes
 * back at full canvas size regardless — these inputs are guidance, not output.
 *
 * Note there is no mask here. The ChatGPT OAuth transport rejects the edits API's
 * `mask` parameter, so a marked area travels as a described region in the prompt
 * instead (see describeRefineRegion).
 */
export async function prepareRefineImage(source: string): Promise<string> {
  const image = await loadImage(source);
  const size = getRefineUploadSize(image.naturalWidth, image.naturalHeight);

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not prepare the image for refinement.");
  context.drawImage(image, 0, 0, size.width, size.height);

  return toDataUrl(canvas);
}
