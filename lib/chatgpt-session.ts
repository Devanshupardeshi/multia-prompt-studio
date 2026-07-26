"use client";

import { openaiAuthHeaders } from "@openai-oauth/react";

// Browser-only: @openai-oauth/react reads IndexedDB and window. Never import this
// from a route handler or server component — those use
// openaiCredentials() from "@openai-oauth/react/server" instead.

export const CHATGPT_SIGN_IN_HINT = "Sign in with ChatGPT (top-right) to use this.";

/**
 * Fetches the headers that prove the caller's ChatGPT session to our API routes.
 * Turns the package's internal "session not found" error into copy the UI can show
 * directly, so every caller does not have to pattern-match error strings.
 */
export async function chatGptAuthHeaders(hint = CHATGPT_SIGN_IN_HINT): Promise<Record<string, string>> {
  let headers: Record<string, string>;

  try {
    headers = await openaiAuthHeaders();
  } catch (error) {
    if (isMissingChatGptSession(error)) throw new Error(hint);
    throw error;
  }

  // Belt-and-braces: the package throws rather than returning {}, but a future
  // version returning an empty object would otherwise send an unauthed request.
  if (Object.keys(headers).length === 0) throw new Error(hint);

  return headers;
}

/** True when the failure means "no ChatGPT session", not a real transport error. */
export function isMissingChatGptSession(error: unknown): boolean {
  return (
    error instanceof Error &&
    /oauth session not found|not authenticated|unauthenticated|sign in with chatgpt/i.test(error.message)
  );
}
