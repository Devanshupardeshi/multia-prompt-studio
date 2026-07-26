import { createOpenAIOAuth } from "@openai-oauth/ai-sdk";
import { openaiCredentials } from "@openai-oauth/react/server";
import { NextRequest, NextResponse } from "next/server";
import {
  describePromptModelFailure,
  isAuthenticationError,
} from "@/lib/openai-oauth-errors";
import {
  generatePromptWithOpenAI,
  OPENAI_PROMPT_MODEL,
  OPENAI_PROMPT_MODEL_LABEL,
} from "@/lib/openai-prompt";
import { isImageMode, type GeneratePayload, type GenerationMode } from "@/lib/shared-types";

// GPT-5.6 Sol runs with high reasoning effort and may take a repair retry, so this
// needs the same headroom as the Gemini route. Vercel clamps to the plan ceiling.
export const maxDuration = 120;

// This route spends the caller's own ChatGPT quota, not the server's key pool, so
// it is deliberately not behind the maintenance switch or the daily prompt counter.

// Only still-image modes can target GPT Image 2, so only they offer this engine.
// Mirrors the per-mode required fields enforced by /api/generate.
function validateImagePayload(payload: GeneratePayload): string | null {
  if (!isImageMode(payload.mode)) {
    return "GPT-5.6 Sol is only available for the image modes (Standard, Face Swap, Mockup)";
  }
  if (payload.mode === "standard" && !payload.description?.trim()) {
    return "Description is required for standard mode";
  }
  if (payload.mode === "face_swap" && (!payload.sourceFaceImage || !payload.targetPoseImage)) {
    return "Source Face and Target Pose images are required for face swap mode";
  }
  if (payload.mode === "mockup" && !payload.logoImage) {
    return "Logo image is required for mockup mode";
  }
  return null;
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // The form sends the same payload shape as the Gemini route; the engine choice is
  // the endpoint, not a field. Force targetModel so the prompt suits GPT Image 2
  // even if the user left the Gemini-side toggle on Nano Banana.
  const payload = {
    ...(body as GeneratePayload),
    mode: (body as { mode?: GenerationMode }).mode,
    targetModel: "gpt-image",
  } as GeneratePayload;

  const validationError = validateImagePayload(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    // Must stay inside the try: openaiCredentials() throws synchronously when the
    // request carries no session, and that has to surface as a 401, not a 500.
    const openai = createOpenAIOAuth(openaiCredentials(request));
    const result = await generatePromptWithOpenAI(openai, payload);
    return NextResponse.json({ json: result });
  } catch (error) {
    console.error(
      `${OPENAI_PROMPT_MODEL_LABEL} (${OPENAI_PROMPT_MODEL}) prompt API error:`,
      error,
    );

    if (isAuthenticationError(error)) {
      return NextResponse.json(
        { error: `Sign in with ChatGPT to generate a prompt with ${OPENAI_PROMPT_MODEL_LABEL}` },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: describePromptModelFailure(error, OPENAI_PROMPT_MODEL_LABEL) },
      { status: 502 },
    );
  }
}
