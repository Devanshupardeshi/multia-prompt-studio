import { DEFAULT_CODEX_BASE_URL } from "@openai-oauth/core";

/**
 * Which text model writes the prompts and poster concepts.
 *
 * The model list is account-dependent — Codex exposes what the signed-in ChatGPT
 * plan allows, and it changes over time. Rather than hardcode one id and hard-fail
 * with "not enabled for this account", we ask the account what it has and let the
 * designer choose. gpt-5.6-sol stays the default everywhere; discovery only adds
 * options, it never silently switches models.
 */

export const DEFAULT_PROMPT_MODEL = "gpt-5.6-sol";
export const DEFAULT_PROMPT_MODEL_LABEL = "GPT-5.6 Sol";

/** The image model is fixed — it is the only one Codex exposes for images. */
export const IMAGE_MODEL = "gpt-image-2";

export interface ChatGptModel {
  id: string;
  label: string;
  /** True for the model we default to and recommend. */
  isDefault: boolean;
}

const KNOWN_LABELS: Record<string, string> = {
  "gpt-5.6-sol": "GPT-5.6 Sol",
  "gpt-5.6-terra": "GPT-5.6 Terra",
};

/** Turns a raw model id into something worth putting in a dropdown. */
export function labelForModel(id: string): string {
  if (KNOWN_LABELS[id]) return KNOWN_LABELS[id];
  return id
    .replace(/[-_]/g, " ")
    .replace(/\bgpt\b/i, "GPT")
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

/** Image and embedding ids are not prompt-writing models; keep them out of the picker. */
function isPromptModel(id: string): boolean {
  return !/image|embed|whisper|tts|audio|moderation/i.test(id);
}

export function toModelList(ids: string[]): ChatGptModel[] {
  const unique = Array.from(new Set(ids.filter(isPromptModel)));
  if (!unique.includes(DEFAULT_PROMPT_MODEL)) unique.unshift(DEFAULT_PROMPT_MODEL);

  return unique
    .map((id) => ({ id, label: labelForModel(id), isDefault: id === DEFAULT_PROMPT_MODEL }))
    // Default first, then alphabetical — the recommended choice should never be
    // buried halfway down the list.
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.label.localeCompare(b.label));
}

/**
 * Codex's model catalogue is NOT an OpenAI-shaped `/v1/models` response. It lives at
 * `/models?client_version=…` — the query parameter is required, the array is
 * `models` (not `data`), and each entry is keyed by `slug` (not `id`), with
 * snake_case metadata. All of that is mirrored from @openai-oauth/core's own
 * fetchCodexModelCatalog, which is unfortunately not exported from the package root.
 */
const CODEX_CLIENT_VERSION = "0.144.1";

interface CodexModelEntry {
  slug?: unknown;
  visibility?: unknown;
  supported_in_api?: unknown;
}

/** Same rule the library uses: usable via the API and meant to be listed. */
function isPublicModel(entry: CodexModelEntry): boolean {
  const visibility = typeof entry.visibility === "string" ? entry.visibility : undefined;
  return (
    entry.supported_in_api !== false && (visibility === undefined || visibility === "list")
  );
}

/**
 * Asks the account which models it can use. Returns the default-only list on any
 * failure: discovery is a convenience, never a prerequisite for generating.
 */
export async function discoverChatGptModels(
  headers: Record<string, string>,
): Promise<ChatGptModel[]> {
  try {
    const url = `${DEFAULT_CODEX_BASE_URL}/models?client_version=${encodeURIComponent(
      CODEX_CLIENT_VERSION,
    )}`;
    const response = await fetch(url, { headers });
    if (!response.ok) return toModelList([]);

    const body = (await response.json()) as { models?: CodexModelEntry[] };
    const slugs = Array.isArray(body.models)
      ? body.models
          .filter(isPublicModel)
          .map((entry) => entry.slug)
          .filter((slug): slug is string => typeof slug === "string")
      : [];

    return toModelList(slugs);
  } catch {
    return toModelList([]);
  }
}
