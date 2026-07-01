// Server-only library for the live Gemini key pool + admin panel.
// Reads/writes go through the Supabase service-role client. The secret `key`
// column never leaves this module except as the value handed to the Gemini fetch.
//
// Do NOT import this file from a client component — it uses the service-role key.

import { createHash } from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  AppSettings,
  AuditEntry,
  ErrorCounts,
  PoolSummary,
  SanitizedKey,
  SetupCheck,
  UsageEvent,
} from "@/lib/api-keys-types";

export const DEFAULT_MODEL = "gemini-3.5-flash";

// Columns safe to send to the browser — deliberately excludes `key`.
const SAFE_COLUMNS =
  "id,label,account_label,key_hint,status,enabled,cooldown_until,daily_cap,rpm_cap," +
  "requests_today,requests_this_minute,requests_total,success_total,error_total," +
  "rate_limit_hits_total,last_used_at,last_success_at,last_error,last_error_at," +
  "priority,notes,created_at";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

export function fingerprintKey(key: string): string {
  return createHash("sha256").update(key.trim()).digest("hex");
}

export function hintForKey(key: string): string {
  const k = key.trim();
  if (k.length <= 8) return "…" + k.slice(-4);
  return k.slice(0, 6) + "…" + k.slice(-4);
}

export function isPoolDbConfigured(): boolean {
  return !!getSupabaseAdminClient();
}

// ---------------------------------------------------------------------------
// Claim / report — the hot path used by the studio on every generation.
// ---------------------------------------------------------------------------

export interface ClaimedKey {
  id: string;
  key: string;
}

/** True when there is at least one enabled key in the DB pool. */
export async function dbHasKeys(): Promise<boolean> {
  const sb = getSupabaseAdminClient();
  if (!sb) return false;
  const { count, error } = await sb
    .from("gemini_api_keys")
    .select("id", { count: "exact", head: true })
    .eq("enabled", true);
  if (error) return false;
  return (count ?? 0) > 0;
}

/** Atomically claim the best currently-healthy key, or null if the pool is drained. */
export async function claimNextKey(model: string = DEFAULT_MODEL): Promise<ClaimedKey | null> {
  const sb = getSupabaseAdminClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc("claim_next_gemini_key", { p_model: model });
  if (error) {
    console.error("claim_next_gemini_key failed:", error.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !row.id || !row.key) return null;
  return { id: row.id as string, key: row.key as string };
}

/**
 * Returns {id, key} for all usable keys (enabled, not invalid/disabled), preferring
 * those not currently cooling, LRU-first. Used by the parallel deep-research path to
 * distribute many section calls across the pool (reuse allowed when pool < sections).
 * Does NOT bump counters — each section reports its own result afterwards.
 */
export async function listActiveKeySecrets(): Promise<Array<{ id: string; key: string }>> {
  const sb = getSupabaseAdminClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("gemini_api_keys")
    .select("id,key,status,cooldown_until,last_used_at")
    .eq("enabled", true)
    .order("last_used_at", { ascending: true, nullsFirst: true });
  if (error || !data) return [];
  const rows = (data as any[]).filter((k) => k.status !== "invalid" && k.status !== "disabled");
  const now = Date.now();
  const usable = rows.filter((k) => !k.cooldown_until || new Date(k.cooldown_until).getTime() <= now);
  const pool = usable.length ? usable : rows;
  return pool.map((k) => ({ id: k.id as string, key: k.key as string }));
}

export interface ReportOutcome {
  success: boolean;
  httpStatus?: number | null;
  error?: string | null;
  cooldownSeconds?: number | null;
  dailyExhausted?: boolean;
  eventType?: UsageEvent["event_type"] | null;
  userFacing?: boolean;
  mode?: string | null;
  latencyMs?: number | null;
}

/** Record the outcome of a real generation call (sets cooldown, rolls stats + events). */
export async function reportKeyResult(id: string, o: ReportOutcome): Promise<void> {
  const sb = getSupabaseAdminClient();
  if (!sb) return;
  const { error } = await sb.rpc("report_gemini_key_result", {
    p_id: id,
    p_success: o.success,
    p_http_status: o.httpStatus ?? null,
    p_error: o.error ?? null,
    p_cooldown_seconds: o.cooldownSeconds ?? null,
    p_daily_exhausted: o.dailyExhausted ?? false,
    p_event_type: o.eventType ?? null,
    p_user_facing: o.userFacing ?? false,
    p_mode: o.mode ?? null,
    p_latency_ms: o.latencyMs ?? null,
  });
  if (error) console.error("report_gemini_key_result failed:", error.message);
}

/** Log a user-facing failure that did NOT belong to any single key (e.g. pool drained). */
export async function recordPoolEvent(
  eventType: UsageEvent["event_type"],
  errorMessage: string,
  mode?: string | null
): Promise<void> {
  const sb = getSupabaseAdminClient();
  if (!sb) return;
  await sb
    .from("usage_events")
    .insert({
      key_id: null,
      mode: mode ?? null,
      http_status: 503,
      event_type: eventType,
      user_facing: true,
      error_message: errorMessage,
    })
    .then(
      () => {},
      () => {}
    );
}

// ---------------------------------------------------------------------------
// Key validation (free ListModels — does not consume generateContent quota)
// ---------------------------------------------------------------------------

export interface ValidateResult {
  ok: boolean;
  status?: number;
  error?: string;
  modelCount?: number;
}

export async function validateKey(key: string): Promise<ValidateResult> {
  const clean = key.trim();
  if (!clean) return { ok: false, error: "Key is empty" };
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(clean)}&pageSize=1`
    );
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const count = Array.isArray((data as any)?.models) ? (data as any).models.length : 0;
      return { ok: true, status: 200, modelCount: count };
    }
    const body = await res.text().catch(() => "");
    let msg = body;
    try {
      const parsed = JSON.parse(body);
      msg = parsed?.error?.message || body;
    } catch {
      /* keep raw */
    }
    return { ok: false, status: res.status, error: msg || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network error" };
  }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function listKeys(): Promise<SanitizedKey[]> {
  const sb = getSupabaseAdminClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("gemini_api_keys")
    .select(SAFE_COLUMNS)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.error("listKeys failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as SanitizedKey[];
}

export interface AddKeyInput {
  key: string;
  label?: string;
  accountLabel?: string;
  dailyCap?: number;
  rpmCap?: number;
  priority?: number;
  notes?: string;
}

export interface AddKeyResult {
  ok: boolean;
  error?: string;
  duplicate?: boolean;
  id?: string;
}

export async function addKey(input: AddKeyInput): Promise<AddKeyResult> {
  const sb = getSupabaseAdminClient();
  if (!sb) return { ok: false, error: "Supabase is not configured" };

  const key = input.key.trim();
  if (!key) return { ok: false, error: "Key is empty" };

  const fingerprint = fingerprintKey(key);

  // Dedupe by fingerprint
  const { data: existing } = await sb
    .from("gemini_api_keys")
    .select("id")
    .eq("key_fingerprint", fingerprint)
    .maybeSingle();
  if (existing) return { ok: false, duplicate: true, error: "This key is already in the pool" };

  // Validate via free ListModels endpoint
  const v = await validateKey(key);
  if (!v.ok) return { ok: false, error: `Key validation failed (${v.status ?? "?"}): ${v.error ?? "invalid key"}` };

  const { data, error } = await sb
    .from("gemini_api_keys")
    .insert({
      key,
      key_hint: hintForKey(key),
      key_fingerprint: fingerprint,
      label: input.label?.trim() || "",
      account_label: input.accountLabel?.trim() || "",
      daily_cap: input.dailyCap ?? 250,
      rpm_cap: input.rpmCap ?? 10,
      priority: input.priority ?? 100,
      notes: input.notes?.trim() || "",
      status: "active",
      enabled: true,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  const id = (data as any)?.id as string;
  await logAudit("add_key", id, { label: input.label, account: input.accountLabel, hint: hintForKey(key) });
  return { ok: true, id };
}

export async function setKeyEnabled(id: string, enabled: boolean): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseAdminClient();
  if (!sb) return { ok: false, error: "Supabase is not configured" };
  const patch = enabled
    ? { enabled: true, status: "active", cooldown_until: null, half_open: false }
    : { enabled: false, status: "disabled" };
  const { error } = await sb
    .from("gemini_api_keys")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logAudit(enabled ? "enable_key" : "disable_key", id, null);
  return { ok: true };
}

export interface UpdateKeyInput {
  label?: string;
  accountLabel?: string;
  dailyCap?: number;
  rpmCap?: number;
  priority?: number;
  notes?: string;
}

export async function updateKey(id: string, patch: UpdateKeyInput): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseAdminClient();
  if (!sb) return { ok: false, error: "Supabase is not configured" };
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.label !== undefined) update.label = patch.label.trim();
  if (patch.accountLabel !== undefined) update.account_label = patch.accountLabel.trim();
  if (patch.dailyCap !== undefined) update.daily_cap = patch.dailyCap;
  if (patch.rpmCap !== undefined) update.rpm_cap = patch.rpmCap;
  if (patch.priority !== undefined) update.priority = patch.priority;
  if (patch.notes !== undefined) update.notes = patch.notes.trim();
  const { error } = await sb.from("gemini_api_keys").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logAudit("update_key", id, patch as Record<string, unknown>);
  return { ok: true };
}

export async function deleteKey(id: string): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseAdminClient();
  if (!sb) return { ok: false, error: "Supabase is not configured" };
  const { error } = await sb.from("gemini_api_keys").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logAudit("delete_key", id, null);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Manual "Test key" — makes ONE real generation call with a specific key
// (opt-in, costs 1 request) and records the outcome so health updates too.
// ---------------------------------------------------------------------------

export interface TestKeyResult {
  ok: boolean;
  status?: number;
  latencyMs?: number;
  error?: string;
}

export async function testKey(id: string): Promise<TestKeyResult> {
  const sb = getSupabaseAdminClient();
  if (!sb) return { ok: false, error: "Supabase is not configured" };
  const { data, error } = await sb.from("gemini_api_keys").select("key").eq("id", id).maybeSingle();
  if (error || !data) return { ok: false, error: "Key not found" };
  const key = (data as { key: string }).key;
  const model = (await getSettingsCached()).default_model || DEFAULT_MODEL;

  const started = Date.now();
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Reply with the single word: ok" }] }],
          generationConfig: { temperature: 0, thinkingConfig: { thinkingBudget: 0 } },
        }),
      }
    );
    const latencyMs = Date.now() - started;

    if (res.ok) {
      await reportKeyResult(id, { success: true, latencyMs, mode: "admin_test" });
      return { ok: true, status: 200, latencyMs };
    }

    const bodyText = await res.text().catch(() => "");
    const lower = bodyText.toLowerCase();
    const isDaily = res.status === 429 && (lower.includes("per day") || lower.includes("per_day") || lower.includes("daily"));
    const isInvalid = res.status === 400 || res.status === 401 || res.status === 403;
    let msg = bodyText;
    try {
      msg = JSON.parse(bodyText)?.error?.message || bodyText;
    } catch {
      /* keep raw */
    }
    await reportKeyResult(id, {
      success: false,
      httpStatus: res.status,
      error: msg,
      cooldownSeconds: res.status === 429 ? 60 : res.status === 503 ? 15 : null,
      dailyExhausted: isDaily,
      eventType: isInvalid ? "invalid_key" : "rate_limit_recovered",
      mode: "admin_test",
    });
    return { ok: false, status: res.status, latencyMs, error: msg?.slice(0, 300) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network error" };
  }
}

// ---------------------------------------------------------------------------
// Bulk import — paste many keys (newline / comma / space separated). Dedupes
// within the paste and against the pool, validates each via free ListModels.
// ---------------------------------------------------------------------------

export interface BulkAddResult {
  total: number;
  added: number;
  duplicates: number;
  invalid: Array<{ keyHint: string; error: string }>;
}

export async function addKeysBulk(
  rawText: string,
  defaults?: { accountLabel?: string; dailyCap?: number; rpmCap?: number }
): Promise<BulkAddResult> {
  const tokens = rawText
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Dedupe within the paste so we don't validate the same key twice.
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const t of tokens) {
    const fp = fingerprintKey(t);
    if (seen.has(fp)) continue;
    seen.add(fp);
    unique.push(t);
  }

  const result: BulkAddResult = { total: unique.length, added: 0, duplicates: 0, invalid: [] };
  const CONCURRENCY = 4;
  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    const batch = unique.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (key) => {
        const r = await addKey({
          key,
          accountLabel: defaults?.accountLabel,
          dailyCap: defaults?.dailyCap,
          rpmCap: defaults?.rpmCap,
        });
        if (r.ok) result.added += 1;
        else if (r.duplicate) result.duplicates += 1;
        else result.invalid.push({ keyHint: hintForKey(key), error: r.error || "invalid" });
      })
    );
  }
  return result;
}

// ---------------------------------------------------------------------------
// Pool summary
// ---------------------------------------------------------------------------

export async function poolSummary(): Promise<PoolSummary> {
  const keys = await listKeys();
  const summary: PoolSummary = {
    total: keys.length,
    active: 0,
    cooling: 0,
    exhausted_daily: 0,
    invalid: 0,
    disabled: 0,
    half_open: 0,
    requests_today: 0,
    capacity_today: 0,
    remaining_today: 0,
    soonest_recovery_at: null,
  };
  const now = Date.now();
  let soonest = Infinity;
  for (const k of keys) {
    summary[k.status] = (summary[k.status] ?? 0) + 1;
    summary.requests_today += k.requests_today;
    if (k.enabled) summary.capacity_today += k.daily_cap;
    if (k.cooldown_until) {
      const t = new Date(k.cooldown_until).getTime();
      if (t > now && t < soonest) soonest = t;
    }
  }
  summary.remaining_today = Math.max(0, summary.capacity_today - summary.requests_today);
  summary.soonest_recovery_at = soonest === Infinity ? null : new Date(soonest).toISOString();
  return summary;
}

// ---------------------------------------------------------------------------
// Events / error feed
// ---------------------------------------------------------------------------

export async function listEvents(opts: {
  limit?: number;
  sinceIso?: string;
  userFacingOnly?: boolean;
} = {}): Promise<UsageEvent[]> {
  const sb = getSupabaseAdminClient();
  if (!sb) return [];
  let q = sb
    .from("usage_events")
    .select(
      "id,ts,key_id,mode,http_status,event_type,user_facing,error_message,latency_ms,gemini_api_keys(key_hint)"
    )
    .order("ts", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.sinceIso) q = q.gte("ts", opts.sinceIso);
  if (opts.userFacingOnly) q = q.eq("user_facing", true);
  const { data, error } = await q;
  if (error) {
    console.error("listEvents failed:", error.message);
    return [];
  }
  return (data ?? []).map((row: any) => ({
    id: row.id,
    ts: row.ts,
    key_id: row.key_id,
    key_hint: row.gemini_api_keys?.key_hint ?? null,
    mode: row.mode,
    http_status: row.http_status,
    event_type: row.event_type,
    user_facing: row.user_facing,
    error_message: row.error_message,
    latency_ms: row.latency_ms,
  }));
}

export async function errorCountsSince(sinceIso: string): Promise<ErrorCounts> {
  const sb = getSupabaseAdminClient();
  const empty: ErrorCounts = { total: 0, userFacing: 0, recovered: 0, byType: {} };
  if (!sb) return empty;
  const { data, error } = await sb
    .from("usage_events")
    .select("event_type,user_facing")
    .gte("ts", sinceIso)
    .neq("event_type", "success");
  if (error || !data) return empty;
  const counts: ErrorCounts = { total: 0, userFacing: 0, recovered: 0, byType: {} };
  for (const row of data as any[]) {
    counts.total += 1;
    if (row.user_facing) counts.userFacing += 1;
    if (row.event_type === "rate_limit_recovered") counts.recovered += 1;
    counts.byType[row.event_type] = (counts.byType[row.event_type] ?? 0) + 1;
  }
  return counts;
}

export async function pruneEvents(days = 14): Promise<void> {
  const sb = getSupabaseAdminClient();
  if (!sb) return;
  await sb.rpc("prune_usage_events", { p_days: days }).then(
    () => {},
    () => {}
  );
}

// ---------------------------------------------------------------------------
// Daily stats (analytics)
// ---------------------------------------------------------------------------

export interface DailyStatRow {
  key_id: string;
  date: string;
  requests: number;
  successes: number;
  errors: number;
  rate_limit_hits: number;
  avg_latency_ms: number;
}

export async function dailyStats(days = 7): Promise<DailyStatRow[]> {
  const sb = getSupabaseAdminClient();
  if (!sb) return [];
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const { data, error } = await sb
    .from("gemini_key_daily_stats")
    .select("key_id,date,requests,successes,errors,rate_limit_hits,avg_latency_ms")
    .gte("date", since)
    .order("date", { ascending: true });
  if (error) {
    console.error("dailyStats failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as DailyStatRow[];
}

// ---------------------------------------------------------------------------
// Settings (cached for the per-generation hot path)
// ---------------------------------------------------------------------------

let settingsCache: { value: AppSettings; at: number } | null = null;

export async function getSettings(): Promise<AppSettings> {
  const defaults: AppSettings = {
    daily_prompt_cap: null,
    maintenance_mode: false,
    default_model: DEFAULT_MODEL,
    provider: "gemini",
    openrouter_api_key: "",
    openrouter_model: "anthropic/claude-opus-4.6",
    openrouter_models: [],
  };
  const sb = getSupabaseAdminClient();
  if (!sb) return defaults;
  const { data, error } = await sb.from("app_settings").select("key,value");
  if (error || !data) return defaults;
  const map: Record<string, unknown> = {};
  for (const row of data as any[]) map[row.key] = row.value;
  return {
    daily_prompt_cap: (map.daily_prompt_cap as number | null) ?? null,
    maintenance_mode: (map.maintenance_mode as boolean) ?? false,
    default_model: (map.default_model as string) || DEFAULT_MODEL,
    provider: (map.provider as "gemini" | "openrouter") === "openrouter" ? "openrouter" : "gemini",
    openrouter_api_key: (map.openrouter_api_key as string) || "",
    openrouter_model: (map.openrouter_model as string) || "anthropic/claude-opus-4.6",
    openrouter_models: Array.isArray(map.openrouter_models) ? (map.openrouter_models as string[]) : [],
  };
}

export async function getSettingsCached(ttlMs = 7000): Promise<AppSettings> {
  if (settingsCache && Date.now() - settingsCache.at < ttlMs) return settingsCache.value;
  const value = await getSettings();
  settingsCache = { value, at: Date.now() };
  return value;
}

export async function setSetting(
  key: keyof AppSettings,
  value: AppSettings[keyof AppSettings]
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseAdminClient();
  if (!sb) return { ok: false, error: "Supabase is not configured" };
  // The jsonb `value` column is NOT NULL. "Unlimited/unset" (e.g. daily_prompt_cap = null)
  // is stored as a MISSING row — getSettings falls back to defaults — so we never write SQL NULL.
  if (value === null || value === undefined) {
    const { error } = await sb.from("app_settings").delete().eq("key", key);
    if (error) return { ok: false, error: error.message };
    settingsCache = null;
    await logAudit("update_setting", key, { value: null });
    return { ok: true };
  }
  const { error } = await sb
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return { ok: false, error: error.message };
  settingsCache = null; // invalidate
  await logAudit("update_setting", key, { value });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

async function logAudit(action: string, target: string | null, detail: Record<string, unknown> | null): Promise<void> {
  const sb = getSupabaseAdminClient();
  if (!sb) return;
  await sb.from("admin_audit_log").insert({ action, target, detail }).then(
    () => {},
    () => {}
  );
}

export async function listAudit(limit = 50): Promise<AuditEntry[]> {
  const sb = getSupabaseAdminClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("admin_audit_log")
    .select("id,ts,action,target,detail")
    .order("ts", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as unknown as AuditEntry[];
}

// ---------------------------------------------------------------------------
// Setup verifier (used by the in-panel Setup tab)
// ---------------------------------------------------------------------------

export async function setupCheck(): Promise<SetupCheck> {
  const sb = getSupabaseAdminClient();
  const checks: SetupCheck["checks"] = [];

  checks.push({
    name: "Supabase service-role connection",
    ok: !!sb,
    detail: sb ? undefined : "Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in your env",
  });

  if (!sb) return { ok: false, checks, keyCount: 0 };

  const tables = [
    "gemini_api_keys",
    "gemini_key_daily_stats",
    "usage_events",
    "app_settings",
    "admin_audit_log",
  ];
  let allTablesOk = true;
  for (const t of tables) {
    const { error } = await sb.from(t).select("*", { head: true, count: "exact" }).limit(1);
    const ok = !error;
    if (!ok) allTablesOk = false;
    checks.push({ name: `Table ${t}`, ok, detail: error?.message });
  }

  let keyCount = 0;
  if (allTablesOk) {
    const { count } = await sb.from("gemini_api_keys").select("id", { head: true, count: "exact" });
    keyCount = count ?? 0;
    checks.push({
      name: "Keys in pool",
      ok: keyCount > 0,
      detail: keyCount > 0 ? `${keyCount} key(s)` : "Add at least one key in the Keys tab",
    });
  }

  return { ok: !!sb && allTablesOk, checks, keyCount };
}
