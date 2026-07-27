import { createOpenAIOAuth } from "@openai-oauth/ai-sdk";
import { openaiCredentials } from "@openai-oauth/react/server";
import { generateImage } from "ai";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { isAuthenticationError } from "@/lib/openai-oauth-errors";
import { pngStreamResponse } from "@/lib/png-response";
import {
  buildPosterRefinePrompt,
  MAX_REFINE_INSTRUCTION_CHARS,
  type PosterRefineInvariants,
  type PosterRefineRegion,
} from "@/lib/poster-refine";
import type { PercentBounds } from "@/lib/poster-types";
import { buildStudioRefinePrompt, isStudioRefineMode } from "@/lib/studio-refine";

export const maxDuration = 300;
export const runtime = "nodejs";

const DATA_IMAGE = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=\s]+)$/;
const MAX_INPUT_BYTES = 8 * 1024 * 1024;

function decodeDataImage(value: unknown): Buffer | null {
  if (typeof value !== "string") return null;
  const match = value.match(DATA_IMAGE);
  if (!match) return null;
  const buffer = Buffer.from(match[2], "base64");
  return buffer.byteLength > 0 && buffer.byteLength <= MAX_INPUT_BYTES ? buffer : null;
}

function isBounds(value: unknown): value is PercentBounds {
  if (!value || typeof value !== "object") return false;
  const bounds = value as Record<string, unknown>;
  return ["x", "y", "width", "height"].every(
    (key) => typeof bounds[key] === "number" && Number.isFinite(bounds[key]),
  );
}

function parseInvariants(value: unknown): PosterRefineInvariants | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const canvas = source.canvas as Record<string, unknown> | undefined;
  const width = Number(canvas?.width);
  const height = Number(canvas?.height);
  if (!Number.isInteger(width) || !Number.isInteger(height)) return null;
  if (width < 512 || height < 512 || width > 4096 || height > 4096) return null;

  const palette = Array.isArray(source.palette)
    ? source.palette.filter((item): item is string => typeof item === "string").slice(0, 12)
    : [];
  const reserved = Array.isArray(source.reserved)
    ? source.reserved
        .filter(
          (area): area is { label: string; bounds: PercentBounds } =>
            Boolean(area) &&
            typeof area === "object" &&
            typeof (area as { label?: unknown }).label === "string" &&
            isBounds((area as { bounds?: unknown }).bounds),
        )
        .slice(0, 12)
        .map((area) => ({ label: area.label.slice(0, 60), bounds: area.bounds }))
    : [];

  return {
    canvas: { width, height },
    background: typeof source.background === "string" ? source.background.slice(0, 40) : "#0A3253",
    palette,
    reserved,
  };
}

function parseCanvas(value: unknown): { width: number; height: number } | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const width = Number(source.width);
  const height = Number(source.height);
  if (!Number.isInteger(width) || !Number.isInteger(height)) return null;
  if (width < 512 || height < 512 || width > 4096 || height > 4096) return null;
  return { width, height };
}

function parseRegion(value: unknown): PosterRefineRegion | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const numbers = ["x", "y", "width", "height"].map((key) => Number(source[key]));
  if (numbers.some((n) => !Number.isFinite(n))) return null;
  const [x, y, width, height] = numbers;
  if (width <= 0 || height <= 0) return null;
  const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
  return {
    x: clamp01(x),
    y: clamp01(y),
    width: clamp01(x + width) - clamp01(x),
    height: clamp01(y + height) - clamp01(y),
  };
}

/** gpt-image sizes are constrained; mirror the generation route's rule. */
function getModelSize(width: number, height: number) {
  const MAX_PIXELS = 8_294_400;
  const MAX_EDGE = 3840;
  const scale = Math.min(
    1,
    Math.sqrt(MAX_PIXELS / (width * height)),
    MAX_EDGE / width,
    MAX_EDGE / height,
  );
  const floorTo16 = (value: number) => Math.max(512, Math.floor((value * scale) / 16) * 16);
  const w = floorTo16(width);
  const h = floorTo16(height);
  return `${w}x${h}` as `${number}x${number}`;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const source = body as Record<string, unknown>;
  const instruction =
    typeof source.instruction === "string"
      ? source.instruction.trim().slice(0, MAX_REFINE_INSTRUCTION_CHARS)
      : "";
  if (!instruction) {
    return NextResponse.json(
      { error: "Describe what should change about the artwork." },
      { status: 400 },
    );
  }

  const artwork = decodeDataImage(source.image);
  if (!artwork) {
    return NextResponse.json(
      { error: "The artwork to refine is missing or too large." },
      { status: 400 },
    );
  }

  // Optional visual reference for the requested change.
  const reference = source.reference === undefined ? null : decodeDataImage(source.reference);
  if (source.reference !== undefined && !reference) {
    return NextResponse.json(
      { error: "The reference image could not be read, or is too large." },
      { status: 400 },
    );
  }

  // The marked area travels as text, not as an edits-API mask: the ChatGPT OAuth
  // transport rejects `mask`, so sending one fails the whole request.
  const region = parseRegion(source.region);

  // Two callers, one model call. The Poster Studio sends full campaign invariants
  // (palette, reserved logo zones); the Prompt Studio's image modes send a mode
  // whose locks are looked up server-side, so a face swap cannot lose its face.
  let prompt: string;
  let canvas: { width: number; height: number };

  if (source.invariants !== undefined) {
    const invariants = parseInvariants(source.invariants);
    if (!invariants) {
      return NextResponse.json({ error: "Poster invariants are required." }, { status: 400 });
    }
    canvas = invariants.canvas;
    prompt = buildPosterRefinePrompt({
      instruction,
      invariants,
      region,
      hasReference: Boolean(reference),
    });
  } else {
    if (!isStudioRefineMode(source.mode)) {
      return NextResponse.json(
        { error: "Refinement is available for standard, face swap and mockup images." },
        { status: 400 },
      );
    }
    const parsedCanvas = parseCanvas(source.canvas);
    if (!parsedCanvas) {
      return NextResponse.json({ error: "A valid canvas size is required." }, { status: 400 });
    }
    canvas = parsedCanvas;
    prompt = buildStudioRefinePrompt({
      instruction,
      mode: source.mode,
      canvas,
      region,
      hasReference: Boolean(reference),
    });
  }

  try {
    const openai = createOpenAIOAuth(openaiCredentials(request));

    // Passing images routes the provider to /images/edits, which is what preserves
    // the untouched parts of the artwork; a mask narrows that to one region.
    const result = await generateImage({
      model: openai.image("gpt-image-2"),
      prompt: {
        text: prompt,
        images: reference
          ? [new Uint8Array(artwork), new Uint8Array(reference)]
          : [new Uint8Array(artwork)],
      },
      size: getModelSize(canvas.width, canvas.height),
      providerOptions: { openai: { quality: "high" } },
    });

    const decoded = Buffer.from(result.image.base64, "base64");
    const metadata = await sharp(decoded).metadata();
    const png = await sharp(decoded)
      .resize(canvas.width, canvas.height, {
        fit: "fill",
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: false,
      })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();

    return pngStreamResponse(png, {
      width: canvas.width,
      height: canvas.height,
      sourceWidth: metadata.width ?? 0,
      sourceHeight: metadata.height ?? 0,
      native: false,
      resampled: true,
      upscaled: (metadata.width ?? 0) < canvas.width,
      quality: "high",
      extra: {
        renderer: "gpt-image-2-refinement",
        regional: Boolean(region),
        referenced: Boolean(reference),
      },
    });
  } catch (error) {
    console.error("Refinement error:", error);

    if (isAuthenticationError(error)) {
      return NextResponse.json(
        { error: "Sign in with ChatGPT to refine the image." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : "Failed to refine the artwork",
      },
      { status: 502 },
    );
  }
}
