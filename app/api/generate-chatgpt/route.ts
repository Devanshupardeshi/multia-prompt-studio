import { createOpenAIOAuth } from "@openai-oauth/ai-sdk";
import { openaiCredentials } from "@openai-oauth/react/server";
import { NextRequest, NextResponse, after } from "next/server";
import {
  describePromptModelFailure,
  isAuthenticationError,
} from "@/lib/openai-oauth-errors";
import {
  generatePromptWithOpenAI,
  OPENAI_PROMPT_MODEL,
  OPENAI_PROMPT_MODEL_LABEL,
} from "@/lib/openai-prompt";
import { incrementDailyPromptCount } from "@/lib/prompt-count-server";
import { streamingResponse } from "@/lib/stream-protocol";
import { isImageMode, type GeneratePayload, type GenerationMode } from "@/lib/shared-types";

// GPT-5.6 Sol runs with high reasoning effort and may take a repair retry, so this
// needs the same headroom as the Gemini route. Vercel clamps to the plan ceiling.
export const maxDuration = 120;

// This route spends the caller's own ChatGPT quota, not the server's key pool, so
// it is deliberately not behind the maintenance switch. Successful generations are
// still counted, since the Today figure is a usage report, not a limit.

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

  const promptModel =
    typeof (body as { promptModel?: unknown }).promptModel === "string"
      ? ((body as { promptModel: string }).promptModel.trim().slice(0, 60) || undefined)
      : undefined;

  // Streamed for the same reason as the poster route: high-reasoning calls run
  // long, and a response that sends nothing for a minute gets killed in transit.
  return streamingResponse(async (writer) => {
    try {
      // Must stay inside: openaiCredentials() throws synchronously when the request
      // carries no session, and that has to surface as an error event, not a crash.
      const openai = createOpenAIOAuth(openaiCredentials(request));
      const result = await generatePromptWithOpenAI(openai, payload, {
        model: promptModel,
        onStatus: writer.status,
        onReasoning: writer.reasoning,
      });
      // Same daily counter as the Gemini engine, so Today reflects all engines.
      after(() => incrementDailyPromptCount());
      writer.result({ json: result });
    } catch (error) {
      console.error(
        `${OPENAI_PROMPT_MODEL_LABEL} (${OPENAI_PROMPT_MODEL}) prompt API error:`,
        error,
      );

      if (isAuthenticationError(error)) {
        writer.error(
          `Sign in with ChatGPT to generate a prompt with ${OPENAI_PROMPT_MODEL_LABEL}`,
          401,
        );
        return;
      }

      writer.error(describePromptModelFailure(error, OPENAI_PROMPT_MODEL_LABEL), 502);
    }
  });
}
