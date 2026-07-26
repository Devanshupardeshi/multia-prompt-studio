import { createOpenAIOAuth } from "@openai-oauth/ai-sdk";
import { openaiCredentials } from "@openai-oauth/react/server";
import { NextRequest, NextResponse } from "next/server";
import {
  describePromptModelFailure,
  isAuthenticationError,
} from "@/lib/openai-oauth-errors";
import {
  enhanceDescriptionWithOpenAI,
  OPENAI_PROMPT_MODEL_LABEL,
} from "@/lib/openai-prompt";

// Magic-enhance runs on ChatGPT only — no Gemini fallback, so the rewritten brief
// comes from the same model that will write the prompt from it.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }

  const description =
    body && typeof body === "object" && "description" in body
      ? (body as { description?: unknown }).description
      : undefined;

  if (typeof description !== "string" || !description.trim()) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }

  try {
    // Inside the try: openaiCredentials() throws synchronously with no session, and
    // that has to surface as a 401 so the UI can prompt for sign-in.
    const openai = createOpenAIOAuth(openaiCredentials(request));
    const enhanced = await enhanceDescriptionWithOpenAI(openai, description.trim());
    return NextResponse.json({ enhanced });
  } catch (error) {
    console.error("Enhance API error:", error);

    if (isAuthenticationError(error)) {
      return NextResponse.json(
        { error: `Sign in with ChatGPT to use magic enhance (${OPENAI_PROMPT_MODEL_LABEL})` },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: describePromptModelFailure(error, OPENAI_PROMPT_MODEL_LABEL) },
      { status: 502 },
    );
  }
}
