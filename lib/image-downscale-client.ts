"use client";

// Browser-only: needs canvas and Image.

/**
 * Longest edge of a reference image sent up with a prompt request.
 *
 * A single phone photo or an untouched logo PNG is routinely 4–12 MB, and base64
 * inflates that by ~1.37× again — so two of them blow straight past the 4.5 MB
 * request-body ceiling on Vercel and the whole generation fails before it starts.
 * These inputs are guidance for the model, never output, so 1536px is ample.
 */
export const REFERENCE_UPLOAD_MAX_EDGE = 1536;

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That image could not be read."));
    image.src = source;
  });
}

export interface DownscaleOptions {
  maxEdge: number;
  /** WebP is roughly 4× smaller than PNG at this quality; PNG keeps it lossless. */
  format?: "png" | "webp" | "jpeg";
  quality?: number;
}

/**
 * Downscales an image to fit `maxEdge` on its longest side, leaving smaller
 * images untouched in size. Returns a data URL.
 *
 * Lossy formats fall back to JPEG where the browser has no WebP encoder (Safari
 * below 14 silently hands back a PNG instead of failing).
 */
export async function downscaleImage(
  source: string,
  { maxEdge, format = "webp", quality = 0.86 }: DownscaleOptions,
): Promise<string> {
  const image = await loadImage(source);
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not prepare the image for upload.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  if (format === "png") return canvas.toDataURL("image/png");

  const encoded = canvas.toDataURL(`image/${format}`, quality);
  return encoded.startsWith(`data:image/${format}`) ? encoded : canvas.toDataURL("image/jpeg", quality);
}

/** Downscales a picked file for upload alongside a prompt request. */
export async function fileToUploadDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await downscaleImage(objectUrl, { maxEdge: REFERENCE_UPLOAD_MAX_EDGE });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
