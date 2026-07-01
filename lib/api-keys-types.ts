// Shared types for the API-key admin panel. No server-only imports here, so this
// file is safe to import from client components (the secret `key` is never part
// of any type that crosses to the browser).

export type KeyStatus =
  | "active"
  | "cooling"
  | "exhausted_daily"
  | "invalid"
  | "disabled"
  | "half_open";

export type UsageEventType =
  | "success"
  | "rate_limit_recovered"
  | "user_error"
  | "invalid_key"
  | "pool_drained";

// What the admin UI receives for each key — note: NO `key` field.
export interface SanitizedKey {
  id: string;
  label: string;
  account_label: string;
  key_hint: string;
  status: KeyStatus;
  enabled: boolean;
  cooldown_until: string | null;
  daily_cap: number;
  rpm_cap: number;
  requests_today: number;
  requests_this_minute: number;
  requests_total: number;
  success_total: number;
  error_total: number;
  rate_limit_hits_total: number;
  last_used_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
  priority: number;
  notes: string;
  created_at: string;
}

export interface UsageEvent {
  id: number;
  ts: string;
  key_id: string | null;
  key_hint: string | null;
  mode: string | null;
  http_status: number | null;
  event_type: UsageEventType;
  user_facing: boolean;
  error_message: string | null;
  latency_ms: number | null;
}

export interface PoolSummary {
  total: number;
  active: number;
  cooling: number;
  exhausted_daily: number;
  invalid: number;
  disabled: number;
  half_open: number;
  requests_today: number;
  capacity_today: number; // sum of daily_cap across enabled keys
  remaining_today: number; // capacity - requests_today (floored at 0)
  soonest_recovery_at: string | null; // min(cooldown_until) in the future
}

export interface ErrorCounts {
  total: number;
  userFacing: number;
  recovered: number;
  byType: Record<string, number>;
}

export interface AppSettings {
  daily_prompt_cap: number | null; // null = unlimited
  maintenance_mode: boolean;
  default_model: string;
  provider: "gemini" | "openrouter" | "bedrock";
  openrouter_api_key: string; // never sent to the browser
  openrouter_model: string; // primary model (kept in sync with openrouter_models[0])
  openrouter_models: string[]; // ordered fallback chain; try [0], on 429/5xx fall to next
  bedrock_api_key: string; // AWS Bedrock API key (bearer token); never sent to the browser
  bedrock_region: string; // e.g. "us-east-1"
  bedrock_model: string; // primary model/inference-profile id (synced with bedrock_models[0])
  bedrock_models: string[]; // ordered fallback chain of Bedrock model/inference-profile ids
}

export interface AuditEntry {
  id: string;
  ts: string;
  action: string;
  target: string | null;
  detail: Record<string, unknown> | null;
}

export interface SetupCheck {
  ok: boolean;
  checks: Array<{ name: string; ok: boolean; detail?: string }>;
  keyCount: number;
}

export const KEY_STATUS_META: Record<
  KeyStatus,
  { label: string; tone: "good" | "warn" | "bad" | "muted" }
> = {
  active: { label: "Active", tone: "good" },
  half_open: { label: "Recovering", tone: "warn" },
  cooling: { label: "Cooling", tone: "warn" },
  exhausted_daily: { label: "Daily limit", tone: "bad" },
  invalid: { label: "Invalid", tone: "bad" },
  disabled: { label: "Disabled", tone: "muted" },
};
