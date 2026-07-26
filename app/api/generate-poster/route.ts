import { createOpenAIOAuth } from "@openai-oauth/ai-sdk";
import { openaiCredentials } from "@openai-oauth/react/server";
import { NextRequest, NextResponse } from "next/server";
import {
  generatePosterConcept,
  POSTER_PROMPT_MODEL,
  POSTER_PROMPT_MODEL_LABEL,
} from "@/lib/openai-poster";
import { DEFAULT_PROMPT_MODEL } from "@/lib/chatgpt-models";
import { streamingResponse } from "@/lib/stream-protocol";
import { stringifyPosterGenerationPrompt } from "@/lib/poster-generation-prompt";
import { APPROVED_POSTERS, POSTER_CATEGORIES } from "@/lib/poster-reference-system";
import type {
  PosterHeroMaterial,
  PosterLightingMood,
  PosterBackgroundChoice,
  PosterBandhanLogoVariant,
  PosterCnbcLogoVariant,
  PosterModelCategory,
  PosterStudioPayload,
} from "@/lib/poster-types";
import { getPosterConceptValidationErrors } from "@/lib/poster-types";

export const maxDuration = 180;
export const runtime = "nodejs";

// Derived from the registry rather than restated, so adding a style category cannot
// silently 400 here while the form happily offers it.
const CATEGORIES = Object.keys(POSTER_CATEGORIES) as PosterModelCategory[];

function getText(body: Record<string, unknown>, key: string, maxLength: number) {
  const value = body[key];
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function parsePayload(body: unknown): PosterStudioPayload | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const source = body as Record<string, unknown>;
  if (source.mode !== "poster-design") return null;

  const headline = getText(source, "headline", 180);
  const topic = getText(source, "topic", 300);
  if (!headline || !topic) return null;

  if (!CATEGORIES.includes(source.modelCategory as PosterModelCategory)) return null;
  if (!source.outputSize || typeof source.outputSize !== "object") return null;

  const outputSize = source.outputSize as Record<string, unknown>;
  const width = Number(outputSize.width);
  const height = Number(outputSize.height);
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 512 ||
    height < 512 ||
    width > 4096 ||
    height > 4096 ||
    width / height < 0.4 ||
    width / height > 2.5
  ) {
    return null;
  }

  const requestedPosterId = getText(source, "referencePosterId", 60);
  const referencePosterId = APPROVED_POSTERS.some(
    (poster) => poster.id === requestedPosterId,
  )
    ? requestedPosterId
    : undefined;
  const referenceImage =
    typeof source.referenceImage === "string" &&
    /^data:image\/[A-Za-z0-9.+-]+;base64,/.test(source.referenceImage)
      ? source.referenceImage
      : undefined;

  const BACKGROUND_CHOICES: PosterBackgroundChoice[] = [
    "auto",
    "prussian-blue",
    "maroon-navy",
  ];
  const backgroundChoice = BACKGROUND_CHOICES.includes(
    source.backgroundChoice as PosterBackgroundChoice,
  )
    ? (source.backgroundChoice as PosterBackgroundChoice)
    : "auto";

  const CNBC_LOGO_VARIANTS: PosterCnbcLogoVariant[] = [
    "tv18-white",
    "tv18-blue",
    "awaaz-white",
    "awaaz-blue",
  ];
  const cnbcLogoVariant = CNBC_LOGO_VARIANTS.includes(
    source.cnbcLogoVariant as PosterCnbcLogoVariant,
  )
    ? (source.cnbcLogoVariant as PosterCnbcLogoVariant)
    : "tv18-white";

  const BANDHAN_LOGO_VARIANTS: PosterBandhanLogoVariant[] = ["dark-bg", "light-bg"];
  const bandhanLogoVariant = BANDHAN_LOGO_VARIANTS.includes(
    source.bandhanLogoVariant as PosterBandhanLogoVariant,
  )
    ? (source.bandhanLogoVariant as PosterBandhanLogoVariant)
    : "dark-bg";

  const rawAnswers = source.clarificationAnswers;
  let clarificationAnswers: Record<string, string> | undefined;
  if (isRecord(rawAnswers)) {
    const entries = Object.entries(rawAnswers)
      .filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === "string" && typeof entry[1] === "string" && entry[1].trim().length > 0,
      )
      .slice(0, 3)
      .map(([question, answer]) => [question.slice(0, 300), answer.slice(0, 200)] as const);
    if (entries.length > 0) clarificationAnswers = Object.fromEntries(entries);
  }

  const HERO_MATERIALS: PosterHeroMaterial[] = [
    "auto",
    "brass",
    "steel",
    "terracotta",
    "gold",
    "paper-currency",
  ];
  const heroMaterial = HERO_MATERIALS.includes(source.heroMaterial as PosterHeroMaterial)
    ? (source.heroMaterial as PosterHeroMaterial)
    : "auto";

  const LIGHTING_MOODS: PosterLightingMood[] = [
    "auto",
    "studio-neutral",
    "warm-festive",
    "cool-editorial",
  ];
  const lightingMood = LIGHTING_MOODS.includes(source.lightingMood as PosterLightingMood)
    ? (source.lightingMood as PosterLightingMood)
    : "auto";

  const rawRejected = source.rejectedFigures;
  const rejectedFigures = Array.isArray(rawRejected)
    ? rawRejected
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .slice(0, 24)
        .map((item) => item.slice(0, 200))
    : undefined;

  return {
    mode: "poster-design",
    headline,
    subheading: getText(source, "subheading", 280),
    bodyCopy: getText(source, "bodyCopy", 1200),
    cta: getText(source, "cta", 180),
    topic,
    modelCategory: source.modelCategory as PosterModelCategory,
    visualDirection: getText(source, "visualDirection", 1200),
    referencePosterId,
    referenceImage,
    outputSize: { width, height },
    backgroundChoice,
    heroMaterial,
    lightingMood,
    cnbcLogoVariant,
    bandhanLogoVariant,
    clarificationAnswers,
    rejectedFigures: rejectedFigures?.length ? rejectedFigures : undefined,
    promptModel:
      typeof source.promptModel === "string" && source.promptModel.trim()
        ? source.promptModel.trim().slice(0, 60)
        : DEFAULT_PROMPT_MODEL,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function getErrorMessage(error: unknown): string {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    if (typeof current === "string" && current.trim()) return current.trim();
    if (typeof current !== "object") break;
    const candidate = current as {
      cause?: unknown;
      message?: unknown;
      responseBody?: unknown;
    };
    if (typeof candidate.responseBody === "string") {
      try {
        const parsed = JSON.parse(candidate.responseBody) as {
          detail?: unknown;
          error?: { message?: unknown };
        };
        if (typeof parsed.detail === "string") return parsed.detail;
        if (typeof parsed.error?.message === "string") return parsed.error.message;
      } catch {
        // Continue to the ordinary error message.
      }
    }
    if (
      typeof candidate.message === "string" &&
      candidate.message.trim() &&
      candidate.message !== "Bad Request"
    ) {
      return candidate.message.trim();
    }
    current = candidate.cause;
  }
  return `Failed to generate a poster concept with ${POSTER_PROMPT_MODEL_LABEL}`;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload = parsePayload(body);
  if (!payload) {
    return NextResponse.json(
      {
        error:
          "Headline, topic, model category and a valid output size are required.",
      },
      { status: 400 },
    );
  }

  // Streamed: this call runs 30–90s, and a response that sends nothing for that
  // long is what platforms kill mid-flight. Bytes now flow from the first moment,
  // carrying the reasoning trace with them.
  return streamingResponse(async (writer) => {
    try {
      const openai = createOpenAIOAuth(openaiCredentials(request));
      const result = await generatePosterConcept(openai, payload, {
        model: payload.promptModel,
        onStatus: writer.status,
        onReasoning: writer.reasoning,
      });

      if (result.status === "clarification") {
        writer.result({ status: "clarification", questions: result.questions });
        return;
      }

      writer.status("Validating the production contract");
      const { concept } = result;
      const validationErrors = getPosterConceptValidationErrors(concept, {
        topic: payload.topic,
        expectedCanvas: payload.outputSize,
      });
      if (validationErrors.length > 0) {
        writer.error(
          `Poster generation was blocked by the canonical contract: ${validationErrors.join(" ")}`,
          422,
        );
        return;
      }

      writer.result({
        status: "complete",
        concept,
        json: stringifyPosterGenerationPrompt(concept, payload),
      });
    } catch (error) {
      console.error(
        `${POSTER_PROMPT_MODEL_LABEL} (${POSTER_PROMPT_MODEL}) poster API error:`,
        error,
      );

      if (isAuthenticationError(error)) {
        writer.error("Sign in with ChatGPT to use Poster Design Studio.", 401);
        return;
      }

      const message = getErrorMessage(error);
      writer.error(
        /not supported when using Codex with a ChatGPT account/i.test(message)
          ? `${payload.promptModel ?? POSTER_PROMPT_MODEL} is not enabled for this ChatGPT/Codex account. Poster Studio will not fall back to another model.`
          : message,
        502,
      );
    }
  });
}
