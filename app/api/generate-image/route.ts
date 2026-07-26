import { createOpenAIOAuth } from "@openai-oauth/ai-sdk";
import { openaiCredentials } from "@openai-oauth/react/server";
import { generateImage } from "ai";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { correctGptImageWarmCast } from "@/lib/image-color-correction";
import { classifyImageResolution } from "@/lib/image-resolution";
import { isAuthenticationError } from "@/lib/openai-oauth-errors";
import { pngStreamResponse } from "@/lib/png-response";

export const maxDuration = 300;
export const runtime = "nodejs"; // sharp needs the Node runtime

const REQUESTED_LANDSCAPE_EXPORT = {
  size: "3840x2160" as const,
  width: 3840,
  height: 2160,
};

const REQUESTED_PORTRAIT_EXPORT = {
  size: "2160x3840" as const,
  width: 2160,
  height: 3840,
};

type RequestedExport = typeof REQUESTED_LANDSCAPE_EXPORT | typeof REQUESTED_PORTRAIT_EXPORT;

function getDimensions(value: unknown, separator: "x" | ":") {
  if (typeof value !== "string") return null;

  const [rawWidth, rawHeight, ...extra] = value.toLowerCase().split(separator);
  if (extra.length > 0) return null;

  const width = Number(rawWidth);
  const height = Number(rawHeight);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

// Orientation comes from the prompt JSON itself, so the render matches the prompt
// the user is looking at rather than a separate request field that could drift.
function resolveRequestedExport(prompt: string): RequestedExport {
  try {
    const parsed = JSON.parse(prompt) as {
      output?: { aspect_ratio?: unknown; resolution?: unknown };
    };
    const resolution = getDimensions(parsed.output?.resolution, "x");
    const aspectRatio = getDimensions(parsed.output?.aspect_ratio, ":");
    const requestedDimensions = resolution ?? aspectRatio;

    if (requestedDimensions && requestedDimensions.height > requestedDimensions.width) {
      return REQUESTED_PORTRAIT_EXPORT;
    }
  } catch {
    // A raw prompt has no structured orientation, so use the landscape default.
  }

  return REQUESTED_LANDSCAPE_EXPORT;
}

async function createRequestedExportPng(base64: string, output: RequestedExport) {
  const source = Buffer.from(base64, "base64");
  const sourceMetadata = await sharp(source).metadata();

  if (!sourceMetadata.width || !sourceMetadata.height) {
    throw new Error("Unable to read the generated image dimensions");
  }

  const sourceWidth = sourceMetadata.width;
  const sourceHeight = sourceMetadata.height;
  // The model rarely returns the requested size natively, so record whether these
  // pixels were enlarged — the UI says so instead of calling a resample "4K".
  const resolutionState = classifyImageResolution(
    sourceWidth,
    sourceHeight,
    output.width,
    output.height,
  );

  const { data, info } = await correctGptImageWarmCast(
    sharp(source).resize(output.width, output.height, {
      fit: "cover",
      kernel: sharp.kernel.lanczos3,
      position: "centre",
      withoutEnlargement: false,
    }),
  )
    .png({
      adaptiveFiltering: true,
      compressionLevel: 9,
    })
    .toBuffer({ resolveWithObject: true });

  if (info.width !== output.width || info.height !== output.height) {
    throw new Error(
      `Requested export failed: received ${info.width}x${info.height}; expected ${output.size}`,
    );
  }

  return { png: data, sourceWidth, sourceHeight, ...resolutionState };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "Failed to generate image";
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const prompt =
    body && typeof body === "object" && "prompt" in body
      ? (body as { prompt?: unknown }).prompt
      : undefined;

  if (typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const output = resolveRequestedExport(prompt);

  try {
    // Must stay inside the try: openaiCredentials() throws synchronously when the
    // request carries no session, and that has to surface as a 401 (so the UI shows
    // the sign-in nudge) rather than an unhandled 500.
    const openai = createOpenAIOAuth(openaiCredentials(request));

    const result = await generateImage({
      model: openai.image("gpt-image-2"),
      prompt,
      size: output.size,
      providerOptions: {
        openai: {
          quality: "high",
        },
      },
    });

    const exportImage = await createRequestedExportPng(result.image.base64, output);

    return pngStreamResponse(exportImage.png, {
      width: output.width,
      height: output.height,
      sourceWidth: exportImage.sourceWidth,
      sourceHeight: exportImage.sourceHeight,
      native: exportImage.native,
      resampled: exportImage.resampled,
      upscaled: exportImage.upscaled,
      quality: "high",
    });
  } catch (error) {
    console.error("GPT Image 2 render error:", error);

    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: "Not signed in with ChatGPT" }, { status: 401 });
    }

    return NextResponse.json({ error: getErrorMessage(error) }, { status: 502 });
  }
}
