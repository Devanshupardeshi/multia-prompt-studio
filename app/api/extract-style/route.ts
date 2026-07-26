import { createOpenAIOAuth } from "@openai-oauth/ai-sdk";
import { openaiCredentials } from "@openai-oauth/react/server";
import { NextRequest, NextResponse } from "next/server";
import {
  describePromptModelFailure,
  isAuthenticationError,
} from "@/lib/openai-oauth-errors";
import {
  extractStyleWithOpenAI,
  OPENAI_PROMPT_MODEL_LABEL,
} from "@/lib/openai-prompt";

// "Style from image" runs on ChatGPT only — no Gemini fallback.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "A base64 image data URL is required" },
      { status: 400 },
    );
  }

  const image =
    body && typeof body === "object" && "image" in body
      ? (body as { image?: unknown }).image
      : undefined;

  if (typeof image !== "string" || !image.startsWith("data:")) {
    return NextResponse.json(
      { error: "A base64 image data URL is required" },
      { status: 400 },
    );
  }

  try {
    // Inside the try: openaiCredentials() throws synchronously with no session, and
    // that has to surface as a 401 so the UI can prompt for sign-in.
    const openai = createOpenAIOAuth(openaiCredentials(request));
    const result = await extractStyleWithOpenAI(openai, image);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Extract style API error:", error);

    if (isAuthenticationError(error)) {
      return NextResponse.json(
        {
          error: `Sign in with ChatGPT to extract a style from an image (${OPENAI_PROMPT_MODEL_LABEL})`,
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: describePromptModelFailure(error, OPENAI_PROMPT_MODEL_LABEL) },
      { status: 502 },
    );
  }
}
