import { NextRequest, NextResponse } from "next/server";
import { isRequestAuthed } from "@/lib/admin-auth";
import { getSettings, setSetting, listAudit } from "@/lib/api-keys";
import type { AppSettings } from "@/lib/api-keys-types";

// Never leak raw provider keys to the browser — expose only whether each is set.
function maskSettings(settings: AppSettings) {
  const { openrouter_api_key, bedrock_api_key, ...rest } = settings;
  return {
    ...rest,
    openrouter_api_key_set: !!openrouter_api_key,
    bedrock_api_key_set: !!bedrock_api_key,
  };
}

export async function GET(req: NextRequest) {
  if (!(await isRequestAuthed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [settings, audit] = await Promise.all([getSettings(), listAudit(40)]);
  return NextResponse.json({ settings: maskSettings(settings), audit });
}

export async function PATCH(req: NextRequest) {
  if (!(await isRequestAuthed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));

  const updates: Array<Promise<{ ok: boolean; error?: string }>> = [];
  if ("daily_prompt_cap" in body) {
    const v = body.daily_prompt_cap;
    if (v === null || typeof v === "number") updates.push(setSetting("daily_prompt_cap", v));
  }
  if (typeof body.maintenance_mode === "boolean") {
    updates.push(setSetting("maintenance_mode", body.maintenance_mode));
  }
  if (typeof body.default_model === "string" && body.default_model.trim()) {
    updates.push(setSetting("default_model", body.default_model.trim()));
  }
  if (body.provider === "gemini" || body.provider === "openrouter" || body.provider === "bedrock") {
    updates.push(setSetting("provider", body.provider));
  }
  // Only overwrite the key when a non-empty value is supplied (blank = keep existing).
  if (typeof body.openrouter_api_key === "string" && body.openrouter_api_key.trim()) {
    updates.push(setSetting("openrouter_api_key", body.openrouter_api_key.trim()));
  }
  if (typeof body.openrouter_model === "string" && body.openrouter_model.trim()) {
    updates.push(setSetting("openrouter_model", body.openrouter_model.trim()));
  }
  // Ordered fallback chain. Also keep openrouter_model in sync with the first entry.
  if (Array.isArray(body.openrouter_models)) {
    const chain = body.openrouter_models
      .filter((m: unknown): m is string => typeof m === "string" && m.trim().length > 0)
      .map((m: string) => m.trim());
    updates.push(setSetting("openrouter_models", chain));
    if (chain.length) updates.push(setSetting("openrouter_model", chain[0]));
  }

  // Bedrock: key (only when non-empty), region, and ordered model chain (syncs bedrock_model).
  if (typeof body.bedrock_api_key === "string" && body.bedrock_api_key.trim()) {
    updates.push(setSetting("bedrock_api_key", body.bedrock_api_key.trim()));
  }
  if (typeof body.bedrock_region === "string" && body.bedrock_region.trim()) {
    updates.push(setSetting("bedrock_region", body.bedrock_region.trim()));
  }
  if (Array.isArray(body.bedrock_models)) {
    const chain = body.bedrock_models
      .filter((m: unknown): m is string => typeof m === "string" && m.trim().length > 0)
      .map((m: string) => m.trim());
    updates.push(setSetting("bedrock_models", chain));
    if (chain.length) updates.push(setSetting("bedrock_model", chain[0]));
  }

  const results = await Promise.all(updates);
  const failed = results.find((r) => !r.ok);
  if (failed) return NextResponse.json({ error: failed.error }, { status: 400 });

  return NextResponse.json({ ok: true, settings: maskSettings(await getSettings()) });
}
