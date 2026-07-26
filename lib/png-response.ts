// Returns a rendered PNG to the browser as a streamed binary body.
//
// Why not `{ image: "data:image/png;base64,..." }` like a normal JSON response:
// base64 inflates the payload ~1.37x, and a 4K or 2160x2700 poster PNG is already
// several megabytes. That lands past the size a Vercel function can return as a
// single buffered payload — it works under `next dev`, which has no such limit, and
// then fails once deployed. Streaming the raw bytes avoids both the inflation and
// the buffered-payload ceiling.
//
// The client turns this into an object URL. That keeps the image same-origin, so
// the poster editor can still composite it onto a canvas and export — a
// cross-origin URL would taint the canvas and break toBlob().

const CHUNK_BYTES = 256 * 1024;

export interface PngMetadata {
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  native: boolean;
  resampled: boolean;
  upscaled: boolean;
  quality: string;
  /** Extra route-specific numbers, sent as X-Image-<key> headers. */
  extra?: Record<string, string | number | boolean>;
}

/** Header name the client reads a metadata field back from. */
export function pngMetadataHeader(key: string): string {
  return `x-image-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
}

export function pngStreamResponse(png: Buffer, meta: PngMetadata): Response {
  // Chunked so the platform treats this as a streaming response rather than one
  // buffered payload.
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let offset = 0; offset < png.length; offset += CHUNK_BYTES) {
        controller.enqueue(
          new Uint8Array(png.subarray(offset, Math.min(offset + CHUNK_BYTES, png.length))),
        );
      }
      controller.close();
    },
  });

  const headers = new Headers({
    "Content-Type": "image/png",
    "Content-Length": String(png.length),
    "Cache-Control": "no-store",
  });

  const fields: Record<string, string | number | boolean> = {
    width: meta.width,
    height: meta.height,
    sourceWidth: meta.sourceWidth,
    sourceHeight: meta.sourceHeight,
    native: meta.native,
    resampled: meta.resampled,
    upscaled: meta.upscaled,
    quality: meta.quality,
    ...meta.extra,
  };

  for (const [key, value] of Object.entries(fields)) {
    headers.set(pngMetadataHeader(key), String(value));
  }

  // Response headers are not readable from JS on a same-origin fetch unless the
  // browser is told which ones to surface. Same-origin usually exposes everything,
  // but being explicit keeps this working behind a proxy or CDN.
  headers.set("Access-Control-Expose-Headers", [...headers.keys()].join(", "));

  return new Response(stream, { headers });
}

export interface DecodedPngResponse {
  /** Object URL for the PNG. Same-origin, so it is canvas-safe. Revoke when done. */
  image: string;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  native: boolean;
  resampled: boolean;
  upscaled: boolean;
  quality: string;
  number: (key: string) => number;
  text: (key: string) => string;
}

/**
 * Client counterpart of pngStreamResponse: turns the binary body into an object URL
 * and reads the metadata back off the headers. Caller owns the URL and must
 * URL.revokeObjectURL() it once the image is replaced or unmounted.
 */
export async function readPngResponse(response: Response): Promise<DecodedPngResponse> {
  const blob = await response.blob();
  const text = (key: string) => response.headers.get(pngMetadataHeader(key)) ?? "";
  const number = (key: string) => {
    const value = Number(text(key));
    return Number.isFinite(value) ? value : 0;
  };

  return {
    image: URL.createObjectURL(blob),
    width: number("width"),
    height: number("height"),
    sourceWidth: number("sourceWidth"),
    sourceHeight: number("sourceHeight"),
    native: text("native") === "true",
    resampled: text("resampled") === "true",
    upscaled: text("upscaled") === "true",
    quality: text("quality") || "high",
    number,
    text,
  };
}
