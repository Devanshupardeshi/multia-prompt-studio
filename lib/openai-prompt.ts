import type { OpenAIOAuthProvider } from "@openai-oauth/ai-sdk";
import { generateText, type UserContent } from "ai";
import {
  buildResponseSchema,
  buildUserParts,
  getSystemPrompt,
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
function geminiPartsToUserContent(parts: any[]): UserContent {
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
