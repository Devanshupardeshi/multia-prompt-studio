import { NextRequest, NextResponse } from "next/server";
import { isRequestAuthed } from "@/lib/admin-auth";
import { getSettings } from "@/lib/api-keys";

// List the models available to the OpenRouter key so the admin can build a
// fallback chain. Uses the just-typed key if provided (so you can test before
// saving), else the saved one. The key never leaves the server.
export async function POST(req: NextRequest) {
  if (!(await isRequestAuthed(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const typed = typeof body.key === "string" ? body.key.trim() : "";
  const key = typed || (await getSettings()).openrouter_api_key;
  if (!key) {
    return NextResponse.json({ error: "No OpenRouter API key provided or saved." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Network error" }, { status: 502 });
  }

  const raw = await res.text();
  let data: any = null;
  try { data = JSON.parse(raw); } catch { /* non-JSON */ }
  if (!res.ok || data?.error) {
    return NextResponse.json(
      { error: `OpenRouter ${res.status}: ${data?.error?.message || raw.slice(0, 200)}` },
      { status: res.status === 401 ? 401 : 400 }
    );
  }

  const models = (data?.data ?? [])
    .map((m: any) => ({ id: m.id as string, name: (m.name as string) || (m.id as string) }))
    .filter((m: any) => m.id)
    .sort((a: any, b: any) => a.id.localeCompare(b.id));

  return NextResponse.json({ ok: true, models });
}
