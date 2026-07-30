import { createOpenAIOAuth } from "@openai-oauth/ai-sdk";
import { openaiCredentials } from "@openai-oauth/react/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { generateImage } from "ai";
import { NextResponse } from "next/server";
import sharp from "sharp";
import {
  getApprovedPoster,
  POSTER_CATEGORIES,
} from "@/lib/poster-reference-system";
import {
  buildPosterImagePrompt,
  PosterImagePromptValidationError,
} from "@/lib/poster-image-prompt";
import { POSTER_MODEL_CATEGORIES } from "@/lib/poster-types";
import type { PosterModelCategory } from "@/lib/poster-types";
import { pngStreamResponse } from "@/lib/png-response";
import { correctGptImageWarmCast } from "@/lib/image-color-correction";

export const maxDuration = 300;
export const runtime = "nodejs";

const MAX_MODEL_PIXELS = 8_294_400;
const MAX_MODEL_EDGE = 3840;

interface ImageRequestBody {
  prompt: string;
  negativePrompt: string;
  modelCategory: PosterModelCategory;
  referencePosterId: string;
  width: number;
  height: number;
}

function parseBody(value: unknown): ImageRequestBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const width = Number(body.width);
  const height = Number(body.height);
  if (
    typeof body.prompt !== "string" ||
    !body.prompt.trim() ||
    typeof body.negativePrompt !== "string" ||
    // Derived, not restated — a hardcoded copy here would 400 a new style at the
    // render step even after its concept generated successfully.
    !POSTER_MODEL_CATEGORIES.includes(body.modelCategory as PosterModelCategory) ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 512 ||
    height < 512 ||
    width > 4096 ||
    height > 4096 ||
    body.prompt.length > 250_000 ||
    body.negativePrompt.length > 64_000
  ) {
    return null;
  }
  return {
    prompt: body.prompt.trim(),
    negativePrompt: body.negativePrompt.trim(),
    modelCategory: body.modelCategory as PosterModelCategory,
    referencePosterId:
      typeof body.referencePosterId === "string" ? body.referencePosterId : "",
    width,
    height,
  };
}

function getLargestModelSize(width: number, height: number) {
  const ratio = width / height;
  let targetWidth: number;
  let targetHeight: number;

  if (ratio >= 1) {
    targetWidth = Math.min(MAX_MODEL_EDGE, Math.sqrt(MAX_MODEL_PIXELS * ratio));
    targetHeight = targetWidth / ratio;
    if (targetHeight > MAX_MODEL_EDGE) {
      targetHeight = MAX_MODEL_EDGE;
      targetWidth = targetHeight * ratio;
    }
  } else {
    targetHeight = Math.min(MAX_MODEL_EDGE, Math.sqrt(MAX_MODEL_PIXELS / ratio));
    targetWidth = targetHeight * ratio;
    if (targetWidth > MAX_MODEL_EDGE) {
      targetWidth = MAX_MODEL_EDGE;
      targetHeight = targetWidth / ratio;
    }
  }

  const modelWidth = Math.max(512, Math.floor(targetWidth / 16) * 16);
  const modelHeight = Math.max(512, Math.floor(targetHeight / 16) * 16);
  return {
    width: modelWidth,
    height: modelHeight,
    size: `${modelWidth}x${modelHeight}` as `${number}x${number}`,
  };
}

async function loadStyleReferences(categoryId: PosterModelCategory) {
  const category = POSTER_CATEGORIES[categoryId];
  return Promise.all(
    category.referenceCrops.map(async (reference) => {
      const source = await readFile(
        path.join(process.cwd(), "Poster Design", reference.folder, reference.file),
      );
      let pipeline = sharp(source).rotate();
      if (reference.crop) pipeline = pipeline.extract(reference.crop);
      const data = await pipeline
        .resize({ width: 1100, height: 1100, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 86, chromaSubsampling: "4:4:4" })
        .toBuffer();
      return new Uint8Array(data);
    }),
  );
}

async function createExactPosterPng(base64: string, width: number, height: number) {
  const source = Buffer.from(base64, "base64");
  const metadata = await sharp(source).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Unable to read the generated poster artwork dimensions");
  }

  const data = await correctGptImageWarmCast(
    sharp(source).resize(width, height, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    }),
  )
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  return {
    data,
    sourceWidth: metadata.width,
    sourceHeight: metadata.height,
    upscaled: metadata.width < width || metadata.height < height,
  };
}

function isAuthenticationError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    if (typeof current === "string") {
      return /unauthenticated|unauthorized|not authenticated|oauth session not found|\b401\b/i.test(
        current,
      );
    }
    if (typeof current !== "object") return false;
    const candidate = current as {
      cause?: unknown;
      message?: unknown;
      status?: unknown;
      statusCode?: unknown;
    };
    if (candidate.status === 401 || candidate.statusCode === 401) return true;
    if (
      typeof candidate.message === "string" &&
      /unauthenticated|unauthorized|not authenticated|oauth session not found|\b401\b/i.test(
        candidate.message,
      )
    ) {
      return true;
    }
    current = candidate.cause;
  }
  return false;
}

/**
 * A content-policy refusal, as opposed to a broken request or an expired session.
 *
 * The provider returns a bare 403 whose message is just "Forbidden", which is
 * indistinguishable from a transport problem unless the status is checked. Walks
 * the cause chain the same way the auth check does, since the AI SDK wraps the
 * original response error several layers deep.
 */
function isPolicyRefusal(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    if (typeof current === "string") {
      return /\bforbidden\b|\b403\b|content policy|safety system|moderation/i.test(current);
    }
    if (typeof current !== "object") return false;
    const candidate = current as {
      cause?: unknown;
      message?: unknown;
      status?: unknown;
      statusCode?: unknown;
    };
    if (candidate.status === 403 || candidate.statusCode === 403) return true;
    if (
      typeof candidate.message === "string" &&
      /\bforbidden\b|\b403\b|content policy|safety system|moderation/i.test(candidate.message)
    ) {
      return true;
    }
    current = candidate.cause;
  }
  return false;
}

export async function POST(request: Request) {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const body = parseBody(value);
  if (!body) {
    return NextResponse.json(
      { error: "A valid master prompt, category and output size are required." },
      { status: 400 },
    );
  }

  try {
    const category = POSTER_CATEGORIES[body.modelCategory];
    const poster = getApprovedPoster(body.referencePosterId);
    if (!poster) {
      return NextResponse.json(
        { error: "The approved poster reference could not be resolved." },
        { status: 400 },
      );
    }
    const promptResult = buildPosterImagePrompt({
      rawContract: body.prompt,
      negativePrompt: body.negativePrompt,
      modelCategory: body.modelCategory,
      categoryDirective: category.promptDirective,
      width: body.width,
      height: body.height,
    });
    const modelSize = getLargestModelSize(body.width, body.height);
    const styleReferences = await loadStyleReferences(body.modelCategory);

    const openai = createOpenAIOAuth(openaiCredentials(request));
    const result = await generateImage({
      model: openai.image("gpt-image-2"),
      // Text-specified categories ship no crop assets. Send a plain string rather
      // than an empty images array so the provider gets a well-formed request.
      prompt: styleReferences.length
        ? { text: promptResult.text, images: styleReferences.slice(0, 3) }
        : promptResult.text,
      size: modelSize.size,
      providerOptions: {
        openai: {
          quality: "high",
        },
      },
    });

    const artwork = await createExactPosterPng(
      result.image.base64,
      body.width,
      body.height,
    );

    // Streamed as binary rather than a base64 data URL in JSON: a 2160x2700 PNG is
    // several MB, and base64 in a JSON body exceeds what a Vercel function can
    // return. The client rebuilds an object URL, which stays same-origin so the
    // editor can still composite it to a canvas and export.
    return pngStreamResponse(artwork.data, {
      width: body.width,
      height: body.height,
      sourceWidth: artwork.sourceWidth,
      sourceHeight: artwork.sourceHeight,
      native: !artwork.upscaled && artwork.sourceWidth === body.width && artwork.sourceHeight === body.height,
      resampled: artwork.sourceWidth !== body.width || artwork.sourceHeight !== body.height,
      upscaled: artwork.upscaled,
      quality: "high",
      extra: {
        requestedModelSize: modelSize.size,
        promptLengthBefore: promptResult.rawContractLength,
        compactContractLength: promptResult.contractLength,
        promptLengthAfter: promptResult.finalLength,
        renderer: "gpt-image-2-full-poster-artwork",
      },
    });
  } catch (error) {
    console.error("Poster image API error:", error);
    if (error instanceof PosterImagePromptValidationError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    if (isAuthenticationError(error)) {
      return NextResponse.json(
        { error: "Sign in with ChatGPT to generate the poster artwork." },
        { status: 401 },
      );
    }
    // A bare "Forbidden" is the provider's HTTP status text and tells the designer
    // nothing. A 403 here is a content-policy refusal, not a broken request — and
    // the usual trigger is the currency: asking for an accurate banknote reads as
    // counterfeiting. Say that, since the fix is to restage rather than retry.
    if (isPolicyRefusal(error)) {
      return NextResponse.json(
        {
          error:
            "The image model refused this prompt on content policy. The usual cause is money rendered too literally — a flat, front-on, complete banknote reads as a reproduction. Regenerate, or steer the concept toward coins, a folded or angled note, or a different approved object.",
        },
        { status: 422 },
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : "Failed to generate poster artwork",
      },
      { status: 502 },
    );
  }
}
