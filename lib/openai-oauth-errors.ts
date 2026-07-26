// Error classification for the ChatGPT OAuth routes.
//
// Two things make this necessary. First, openaiCredentials() throws its own
// "request headers must include ..." error when the browser sent no session, and
// the AI SDK buries provider 401s several `cause` levels down — so a plain
// message check misses both. Second, the useful upstream text (why Codex refused)
// lives in a JSON `responseBody`, not in `error.message`, which is often just
// "Bad Request".

const AUTH_PATTERN =
  /unauthenticated|unauthorized|not authenticated|oauth session not found|request headers must include|\b401\b/i;

/** True when the failure means "the user is not signed in with ChatGPT". */
export function isAuthenticationError(error: unknown): boolean {
  let current: unknown = error;

  for (let depth = 0; current && depth < 4; depth += 1) {
    if (typeof current !== "object") {
      return typeof current === "string" && AUTH_PATTERN.test(current);
    }

    const candidate = current as {
      cause?: unknown;
      code?: unknown;
      message?: unknown;
      status?: unknown;
      statusCode?: unknown;
    };

    if (candidate.status === 401 || candidate.statusCode === 401) return true;

    const code = typeof candidate.code === "string" ? candidate.code : "";
    const message = typeof candidate.message === "string" ? candidate.message : "";
    if (AUTH_PATTERN.test(`${code} ${message}`)) return true;

    current = candidate.cause;
  }

  return false;
}

/** Digs the real provider message out of the cause chain, preferring responseBody. */
export function extractUpstreamErrorMessage(error: unknown): string | null {
  let current: unknown = error;

  for (let depth = 0; current && depth < 4; depth += 1) {
    if (typeof current === "string") return current;
    if (typeof current !== "object") return null;

    const candidate = current as {
      cause?: unknown;
      message?: unknown;
      responseBody?: unknown;
    };

    if (typeof candidate.responseBody === "string") {
      try {
        const parsed = JSON.parse(candidate.responseBody) as {
          detail?: unknown;
          error?: { message?: unknown } | unknown;
        };

        if (typeof parsed.detail === "string" && parsed.detail.trim()) {
          return parsed.detail.trim();
        }

        if (
          parsed.error &&
          typeof parsed.error === "object" &&
          "message" in parsed.error &&
          typeof parsed.error.message === "string" &&
          parsed.error.message.trim()
        ) {
          return parsed.error.message.trim();
        }
      } catch {
        if (candidate.responseBody.trim()) return candidate.responseBody.trim();
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

  return null;
}

/**
 * An account without GPT-5.6 Sol gets a wall-of-text Codex error. Turn that into
 * one clear sentence, and make it explicit that we do not substitute a model.
 */
export function describePromptModelFailure(error: unknown, modelLabel: string): string {
  const upstream = extractUpstreamErrorMessage(error);

  if (/not supported when using Codex with a ChatGPT account/i.test(upstream ?? "")) {
    return `${modelLabel} is not enabled for this ChatGPT/Codex account yet. The app will not fall back to another model.`;
  }

  return upstream ?? `Failed to generate prompt with ${modelLabel}`;
}
