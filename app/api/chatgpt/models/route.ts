import { openaiCredentials } from "@openai-oauth/react/server";
import { NextResponse } from "next/server";
import { discoverChatGptModels, toModelList } from "@/lib/chatgpt-models";
import { isAuthenticationError } from "@/lib/openai-oauth-errors";

export const maxDuration = 30;

/**
 * Lists the prompt models the signed-in ChatGPT account can actually use.
 *
 * Never fails the caller: an unreachable or unsupported /models endpoint returns
 * the default-only list, so the studio degrades to exactly the behaviour it had
 * before discovery existed.
 */
export async function GET(request: Request) {
  try {
    // Reuse the caller's own bearer — same session the generation calls use.
    openaiCredentials(request);

    const authorization = request.headers.get("authorization");
    const accountId = request.headers.get("chatgpt-account-id");
    if (!authorization || !accountId) {
      return NextResponse.json({ models: toModelList([]) });
    }

    const models = await discoverChatGptModels({
      authorization,
      "chatgpt-account-id": accountId,
    });

    return NextResponse.json({ models });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: "Not signed in with ChatGPT" }, { status: 401 });
    }
    console.error("Model discovery error:", error);
    return NextResponse.json({ models: toModelList([]) });
  }
}
