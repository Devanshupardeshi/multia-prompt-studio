import { NextRequest, NextResponse } from "next/server";
import { isRequestAuthed } from "@/lib/admin-auth";
import { getSettings } from "@/lib/api-keys";

// List the invokable Bedrock ids for the fallback chain: cross-region inference profiles
// (what you invoke for Claude 3.5+/4.x) plus on-demand foundation models. Uses the just-typed
// key/region if provided (test before saving), else the saved ones. Key never leaves the server.
export async function POST(req: NextRequest) {
  if (!(await isRequestAuthed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const saved = await getSettings();
  const key = (typeof body.key === "string" && body.key.trim()) || saved.bedrock_api_key;
  const region = (typeof body.region === "string" && body.region.trim()) || saved.bedrock_region || "us-east-1";
  if (!key) {
    return NextResponse.json({ error: "No Bedrock API key provided or saved." }, { status: 400 });
  }

  const base = `https://bedrock.${region}.amazonaws.com`;
  const headers = { Authorization: `Bearer ${key}` };
  const get = async (path: string) => {
    const res = await fetch(`${base}${path}`, { headers });
    const raw = await res.text();
    let data: any = null;
    try { data = JSON.parse(raw); } catch { /* non-JSON */ }
    return { res, data, raw };
  };

  const out: { id: string; name: string }[] = [];
  let firstErr = "";
  try {
    const p = await get("/inference-profiles?maxResults=1000");
    if (p.res.ok) {
      for (const s of p.data?.inferenceProfileSummaries ?? []) {
        if (s.inferenceProfileId) {
          out.push({ id: s.inferenceProfileId, name: `${s.inferenceProfileName || s.inferenceProfileId} · inference profile` });
        }
      }
    } else {
      firstErr = `${p.res.status}: ${p.data?.message || p.raw.slice(0, 160)}`;
    }
  } catch (e) {
    firstErr = e instanceof Error ? e.message : "network error";
  }

  try {
    const m = await get("/foundation-models");
    if (m.res.ok) {
      for (const s of m.data?.modelSummaries ?? []) {
        if (!s.modelId) continue;
        if (Array.isArray(s.outputModalities) && !s.outputModalities.includes("TEXT")) continue;
        out.push({ id: s.modelId, name: s.modelName || s.modelId });
      }
    }
  } catch { /* foundation-models optional; profiles are the important ones */ }

  const seen = new Set<string>();
  const models = out
    .filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)))
    .sort((a, b) => a.id.localeCompare(b.id));

  if (models.length === 0) {
    return NextResponse.json(
      {
        error: firstErr
          ? `Could not list models (${firstErr}). Your key may lack bedrock:ListInferenceProfiles / ListFoundationModels — type the model id manually instead.`
          : "No models found for this region. Type the model id manually.",
      },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true, models });
}
