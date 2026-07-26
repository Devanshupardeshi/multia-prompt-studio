"use client";

import { getMaskRect, getRefineUploadSize } from "./poster-refine";
import type { RefineRegion } from "@/components/prompt-studio/poster-refine-panel";

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

export interface RefineUpload {
  image: string;
  mask?: string;
}

/**
 * Prepares the artwork (and optionally a mask) for the refinement request.
 *
 * Mask convention follows the OpenAI edits API: fully transparent pixels are the
 * ones the model may change, everything opaque is preserved. So the mask starts
 * fully opaque and the marked region is cleared out of it.
 */
export async function prepareRefineUpload(
  artworkUrl: string,
  region: RefineRegion | null,
): Promise<RefineUpload> {
  const image = await loadImage(artworkUrl);
  const size = getRefineUploadSize(image.naturalWidth, image.naturalHeight);

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not prepare the artwork for refinement.");
  context.drawImage(image, 0, 0, size.width, size.height);

  if (!region) return { image: toDataUrl(canvas) };

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = size.width;
  maskCanvas.height = size.height;
  const maskContext = maskCanvas.getContext("2d");
  if (!maskContext) throw new Error("This browser could not prepare the selected area.");

  maskContext.fillStyle = "#000000";
  maskContext.fillRect(0, 0, size.width, size.height);
  const rect = getMaskRect(region, size);
  maskContext.clearRect(rect.x, rect.y, rect.width, rect.height);

  return { image: toDataUrl(canvas), mask: toDataUrl(maskCanvas) };
}
