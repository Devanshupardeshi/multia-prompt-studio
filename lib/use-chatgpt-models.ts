"use client";

import { useEffect, useState } from "react";
import { chatGptAuthHeaders } from "./chatgpt-session";
import { DEFAULT_PROMPT_MODEL, toModelList, type ChatGptModel } from "./chatgpt-models";

/**
 * Which ChatGPT models this account can run, for the model picker.
 *
 * Retried with backoff rather than fetched once: the OAuth session is read
 * asynchronously out of IndexedDB, so on first paint there is usually no session
 * yet, and the user may sign in seconds after the page loads. A single mount-time
 * attempt silently missed both, which is exactly how the picker stayed hidden on a
 * Pro account.
 *
 * Always degrades to the default-only list, so a failure here can never stop
 * anyone from generating.
 */
const RETRY_DELAYS_MS = [0, 1000, 2000, 4000, 8000, 16000];

export function useChatGptModels() {
  const [models, setModels] = useState<ChatGptModel[]>(() => toModelList([]));
  const [promptModel, setPromptModel] = useState(DEFAULT_PROMPT_MODEL);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      for (const delay of RETRY_DELAYS_MS) {
        if (cancelled) return;
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        if (cancelled) return;

        try {
          const headers = await chatGptAuthHeaders();
          const response = await fetch("/api/chatgpt/models", { headers });
          if (!response.ok) continue;

          const body = (await response.json()) as { models?: ChatGptModel[] };
          if (cancelled || !Array.isArray(body.models) || body.models.length === 0) continue;

          setModels(body.models);
          // More than the default means discovery genuinely worked; stop retrying.
          if (body.models.length > 1) return;
        } catch {
          // Not signed in yet, or discovery unreachable — try again shortly.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { models, promptModel, setPromptModel };
}
