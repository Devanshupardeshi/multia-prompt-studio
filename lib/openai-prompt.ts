import type { OpenAIOAuthProvider } from "@openai-oauth/ai-sdk";
import { generateText, type UserContent } from "ai";
import {
  buildResponseSchema,
  buildUserParts,
  ENHANCE_SYSTEM_PROMPT,
  getSystemPrompt,
  STYLE_EXTRACTION_SCHEMA,
  STYLE_EXTRACTION_SYSTEM_PROMPT,
  validateGeneratedJson,
} from "@/lib/gemini";
import type { GeneratePayload } from "@/lib/shared-types";

// The ChatGPT/Codex OAuth endpoint expects the exact account-catalog slug — do not
// "normalize" this to a shorter alias, and never silently fall back to another
// model: an account without GPT-5.6 Sol should hear about it.
export const OPENAI_PROMPT_MODEL = "gpt-5.6-sol";
export const OPENAI_PROMPT_MODEL_LABEL = "GPT-5.6 Sol";

/**
 * Gemini and this provider want the same request expressed two different ways.
 * Rather than re-implement the per-mode prompt assembly, reuse buildUserParts()
 * and translate its Gemini-shaped parts into AI SDK content — the same trick
 * geminiBodyToOpenRouter() already plays for the OpenRouter path. That is what
 * makes every image mode work here with no mode-specific code.
 */
export function geminiPartsToUserContent(parts: any[]): UserContent {
  const content: Exclude<UserContent, string> = [];

  for (const part of parts) {
    if (typeof part?.text === "string") {
      content.push({ type: "text", text: part.text });
    } else if (part?.inlineData?.data) {
      content.push({
        type: "image",
        image: part.inlineData.data,
        mediaType: part.inlineData.mimeType,
      });
    }
  }

  return content;
}

/**
 * This provider has no responseSchema parameter, so the schema Gemini would get
 * structurally has to travel as text instead. Same schema either way, so the two
 * engines stay comparable and validateGeneratedJson() applies to both.
 */
function buildOpenAISystemPrompt(payload: GeneratePayload): string {
  const responseSchema = buildResponseSchema(payload);

  return `${getSystemPrompt(payload)}

## Required output schema
Return exactly one JSON object matching this schema. Every required field must be present.

${JSON.stringify(responseSchema, null, 2)}

Do not include Markdown fences, an introduction, analysis, or any text outside the JSON object.`;
}

async function callPromptModel(
  openai: OpenAIOAuthProvider,
  system: string,
  content: UserContent,
  repair?: { previousOutput: string; error: string },
): Promise<string> {
  const messages = [
    { role: "user" as const, content },
    ...(repair
      ? [
          { role: "assistant" as const, content: repair.previousOutput },
          {
            role: "user" as const,
            content:
              `Your previous output failed validation with this error: "${repair.error}". ` +
              "Regenerate the COMPLETE JSON object from scratch. Follow the required schema and return raw JSON only.",
          },
        ]
      : []),
  ];

  const result = await generateText({
    model: openai(OPENAI_PROMPT_MODEL),
    system,
    messages,
    providerOptions: {
      openai: {
        reasoningEffort: "high",
      },
    },
  });

  if (!result.text.trim()) {
    throw new Error(`${OPENAI_PROMPT_MODEL_LABEL} returned no prompt content`);
  }

  return result.text.trim();
}

/**
 * Generates the prompt JSON for any image mode (standard / face_swap / mockup)
 * through the caller's ChatGPT OAuth session. Mirrors generatePrompt()'s contract:
 * same schema, same validation, one repair retry, a JSON string on success.
 */
export async function generatePromptWithOpenAI(
  openai: OpenAIOAuthProvider,
  sourcePayload: GeneratePayload,
): Promise<string> {
  // This branch always feeds GPT Image 2, so generate a GPT Image-compatible
  // prompt regardless of the target selected for the separate Gemini branch.
  const payload: GeneratePayload = { ...sourcePayload, targetModel: "gpt-image" };
  const system = buildOpenAISystemPrompt(payload);
  const content = geminiPartsToUserContent(buildUserParts(payload));

  let text = await callPromptModel(openai, system, content);
  let validation = validateGeneratedJson(text, payload);
  if (validation.ok && validation.value) return validation.value;

  text = await callPromptModel(openai, system, content, {
    previousOutput: text,
    error: validation.error ?? "Unknown validation error",
  });
  validation = validateGeneratedJson(text, payload);
  if (validation.ok && validation.value) return validation.value;

  throw new Error(
    `Failed to generate a valid JSON prompt with ${OPENAI_PROMPT_MODEL_LABEL} after repair retry: ${validation.error}`,
  );
}

/** Splits a base64 data URL into its media type and payload. */
function parseDataUrl(dataUrl: string): { mediaType: string; data: string } {
  const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid image data. Expected a base64 data URL.");
  }
  return { mediaType: matches[1], data: matches[2] };
}

/**
 * Magic-enhance: expands a short idea into a dense image description. Same system
 * prompt as the Gemini version so the two stay interchangeable.
 */
export async function enhanceDescriptionWithOpenAI(
  openai: OpenAIOAuthProvider,
  description: string,
): Promise<string> {
  const result = await generateText({
    model: openai(OPENAI_PROMPT_MODEL),
    system: ENHANCE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Enhance this idea for an image prompt:\n<user_description>\n${description}\n</user_description>`,
      },
    ],
    providerOptions: { openai: { reasoningEffort: "low" } },
  });

  const enhanced = result.text.trim();
  if (!enhanced) {
    throw new Error(`${OPENAI_PROMPT_MODEL_LABEL} returned no enhanced description`);
  }

  return enhanced;
}

/**
 * Turns an uploaded reference image into a reusable style directive. The image is
 * sent as a real image part, so the model actually looks at it.
 */
export async function extractStyleWithOpenAI(
  openai: OpenAIOAuthProvider,
  imageDataUrl: string,
): Promise<{ name: string; directive: string }> {
  const image = parseDataUrl(imageDataUrl);

  const result = await generateText({
    model: openai(OPENAI_PROMPT_MODEL),
    // No responseSchema on this provider, so the shape travels as text.
    system: `${STYLE_EXTRACTION_SYSTEM_PROMPT}

## Required output schema
Return exactly one JSON object matching this schema, with no Markdown fences or commentary.

${JSON.stringify(STYLE_EXTRACTION_SCHEMA, null, 2)}`,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Extract the reusable visual style of this image as a directive." },
          { type: "image", image: image.data, mediaType: image.mediaType },
        ],
      },
    ],
    providerOptions: { openai: { reasoningEffort: "low" } },
  });

  // Models sometimes fence JSON even when told not to.
  const raw = result.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

  let parsed: { name?: unknown; directive?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${OPENAI_PROMPT_MODEL_LABEL} returned an unparsable style directive`);
  }

  if (
    typeof parsed?.name !== "string" ||
    typeof parsed?.directive !== "string" ||
    !parsed.name.trim() ||
    !parsed.directive.trim()
  ) {
    throw new Error("Style extraction returned incomplete data");
  }

  return { name: parsed.name.trim(), directive: parsed.directive.trim() };
}
