"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import {
  KEY_STATUS_META,
  type AppSettings,
  type AuditEntry,
  type ErrorCounts,
  type KeyStatus,
  type PoolSummary,
  type SanitizedKey,
  type UsageEvent,
} from "@/lib/api-keys-types";

type Tab = "keys" | "analytics" | "errors" | "settings" | "setup";

// What the settings API returns to the browser — raw OpenRouter key is masked.
type AdminSettings = Omit<AppSettings, "openrouter_api_key" | "bedrock_api_key"> & {
  openrouter_api_key_set?: boolean;
  bedrock_api_key_set?: boolean;
};

interface DailyStat {
  key_id: string;
  date: string;
  requests: number;
  successes: number;
  errors: number;
  rate_limit_hits: number;
  avg_latency_ms: number;
}

interface SetupState {
  ok: boolean;
  checks: Array<{ name: string; ok: boolean; detail?: string }>;
  keyCount: number;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Unauthorized");
  }
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function relTime(iso: string | null, now: number): string {
  if (!iso) return "—";
  const diff = now - new Date(iso).getTime();
  if (diff < 0) return "just now";
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function countdown(iso: string | null, now: number): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return null;
  const s = Math.ceil(ms / 1000);
  if (s < 90) return `${s}s`;
  const m = Math.ceil(s / 60);
  if (m < 90) return `${m}m`;
  return `${Math.ceil(m / 60)}h`;
}

const TONE_CLASS: Record<string, string> = {
  good: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  warn: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  bad: "bg-red-500/10 text-red-300 border-red-500/20",
  muted: "bg-white/5 text-white/40 border-white/10",
};

function StatusBadge({ status, cooldownUntil, now }: { status: KeyStatus; cooldownUntil: string | null; now: number }) {
  const meta = KEY_STATUS_META[status];
  const cd = countdown(cooldownUntil, now);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${TONE_CLASS[meta.tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {meta.label}
      {cd && <span className="opacity-60 tabular-nums">· {cd}</span>}
    </span>
  );
}

const DEFAULT_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
];

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

export function Dashboard() {
  const [tab, setTab] = useState<Tab>("keys");
  const [now, setNow] = useState(() => Date.now());

  const [keys, setKeys] = useState<SanitizedKey[]>([]);
  const [summary, setSummary] = useState<PoolSummary | null>(null);
  const [stats, setStats] = useState<DailyStat[]>([]);

  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [counts, setCounts] = useState<ErrorCounts | null>(null);

  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  const [setup, setSetup] = useState<SetupState | null>(null);
  const [setupSql, setSetupSql] = useState("");
  const [envTemplate, setEnvTemplate] = useState("");

  const tabRef = useRef<Tab>(tab);
  tabRef.current = tab;

  // 1s tick for live countdowns
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const loadKeys = useCallback(async () => {
    const { ok, data } = await api("/api/admin/keys");
    if (ok) {
      setKeys(data.keys || []);
      setSummary(data.summary || null);
      setStats(data.stats || []);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    const { ok, data } = await api("/api/admin/events?limit=120");
    if (ok) {
      setEvents(data.events || []);
      setCounts(data.counts || null);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    const { ok, data } = await api("/api/admin/settings");
    if (ok) {
      setSettings(data.settings || null);
      setAudit(data.audit || []);
    }
  }, []);

  const loadSetup = useCallback(async () => {
    const { ok, data } = await api("/api/admin/setup-check");
    if (ok) {
      setSetup(data.check || null);
      setSetupSql(data.sql || "");
      setEnvTemplate(data.envTemplate || "");
    }
  }, []);

  // poll every 4s: always refresh keys; refresh the active tab's data too
  useEffect(() => {
    loadKeys();
    const id = window.setInterval(() => {
      loadKeys();
      if (tabRef.current === "errors") loadEvents();
    }, 4000);
    return () => window.clearInterval(id);
  }, [loadKeys, loadEvents]);

  useEffect(() => {
    if (tab === "errors") loadEvents();
    if (tab === "settings") loadSettings();
    if (tab === "setup") loadSetup();
  }, [tab, loadEvents, loadSettings, loadSetup]);

  // Load settings once on mount so the header provider badge is always accurate.
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const logout = useCallback(async () => {
    await api("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }, []);

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      <Toaster theme="dark" position="top-right" />

      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Multia Admin</h1>
          <p className="mt-0.5 text-sm text-white/40">Live Gemini key pool &amp; studio controls</p>
        </div>
        <div className="flex items-center gap-2">
          {settings && (
            <span
              title={
                settings.provider === "openrouter" ? settings.openrouter_model
                : settings.provider === "bedrock" ? settings.bedrock_model
                : settings.default_model
              }
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                settings.provider === "openrouter"
                  ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                  : settings.provider === "bedrock"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              ● {settings.provider === "openrouter" ? `OpenRouter · ${settings.openrouter_model}`
                : settings.provider === "bedrock" ? `Bedrock · ${settings.bedrock_model || "no model"}`
                : "Gemini"}
            </span>
          )}
          <a href="/" className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/60 hover:bg-white/5">
            ↗ Studio
          </a>
          <button onClick={logout} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/60 hover:bg-white/5">
            Log out
          </button>
        </div>
      </div>

      <PoolSummaryBar summary={summary} now={now} />

      {/* tabs */}
      <div className="mt-6 flex gap-1 border-b border-white/10">
        {(["keys", "analytics", "errors", "settings", "setup"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm capitalize transition-colors ${
              tab === t ? "border-white text-white" : "border-transparent text-white/40 hover:text-white/70"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "keys" && <KeysTab keys={keys} now={now} onChanged={loadKeys} />}
        {tab === "analytics" && <AnalyticsTab keys={keys} stats={stats} />}
        {tab === "errors" && <ErrorsTab events={events} counts={counts} now={now} />}
        {tab === "settings" && (
          <SettingsTab settings={settings} audit={audit} now={now} onSaved={loadSettings} />
        )}
        {tab === "setup" && <SetupTab setup={setup} sql={setupSql} envTemplate={envTemplate} onRecheck={loadSetup} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// pool summary
// ---------------------------------------------------------------------------

function Chip({ label, value, tone = "muted" }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${TONE_CLASS[tone]}`}>
      <div className="text-lg font-semibold tabular-nums leading-none">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wider opacity-70">{label}</div>
    </div>
  );
}

function PoolSummaryBar({ summary, now }: { summary: PoolSummary | null; now: number }) {
  if (!summary) return null;
  const cooling = summary.cooling + summary.exhausted_daily + summary.half_open;
  const recovery = countdown(summary.soonest_recovery_at, now);
  const usedPct = summary.capacity_today > 0 ? Math.round((summary.requests_today / summary.capacity_today) * 100) : 0;
  return (
    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
      <Chip label="Total keys" value={summary.total} />
      <Chip label="Active" value={summary.active} tone={summary.active > 0 ? "good" : "muted"} />
      <Chip label="Cooling" value={cooling} tone={cooling > 0 ? "warn" : "muted"} />
      <Chip label="Invalid" value={summary.invalid} tone={summary.invalid > 0 ? "bad" : "muted"} />
      <Chip label="Used today" value={`${summary.requests_today}/${summary.capacity_today}`} tone={usedPct >= 90 ? "warn" : "muted"} />
      <Chip
        label={recovery ? `Next free in ${recovery}` : "Remaining today"}
        value={summary.remaining_today}
        tone={summary.remaining_today === 0 ? "bad" : "good"}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Keys tab
// ---------------------------------------------------------------------------

function KeysTab({ keys, now, onChanged }: { keys: SanitizedKey[]; now: number; onChanged: () => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, SanitizedKey[]>();
    for (const k of keys) {
      const g = k.account_label?.trim() || "Ungrouped";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(k);
    }
    return Array.from(map.entries());
  }, [keys]);

  return (
    <div className="space-y-6">
      <AddKeyForm onAdded={onChanged} />
      {keys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/40">
          No keys yet. Add your first Gemini key above — the studio will start using it immediately.
        </div>
      ) : (
        groups.map(([group, groupKeys]) => (
          <div key={group} className="space-y-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/40">
              <span>{group}</span>
              <span className="text-white/25">·</span>
              <span>{groupKeys.length} key{groupKeys.length > 1 ? "s" : ""}</span>
              {group !== "Ungrouped" && groupKeys.length > 1 && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] normal-case text-amber-300">
                  ⚠ same account/project — these share one quota pool
                </span>
              )}
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10">
              {groupKeys.map((k) => (
                <KeyRow key={k.id} k={k} now={now} onChanged={onChanged} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function AddKeyForm({ onAdded }: { onAdded: () => void }) {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const tabCls = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm transition-colors ${
      active ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
    }`;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-1">
        <button type="button" onClick={() => setMode("single")} className={tabCls(mode === "single")}>
          Add a key
        </button>
        <button type="button" onClick={() => setMode("bulk")} className={tabCls(mode === "bulk")}>
          Bulk import
        </button>
      </div>
      {mode === "single" ? <SingleAdd onAdded={onAdded} /> : <BulkAdd onAdded={onAdded} />}
    </div>
  );
}

const inputCls = "rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30";

function SingleAdd({ onAdded }: { onAdded: () => void }) {
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [account, setAccount] = useState("");
  const [dailyCap, setDailyCap] = useState("250");
  const [rpmCap, setRpmCap] = useState("10");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setBusy(true);
    try {
      const { ok, status, data } = await api("/api/admin/keys", {
        method: "POST",
        body: JSON.stringify({
          key: key.trim(),
          label: label.trim(),
          accountLabel: account.trim(),
          dailyCap: Number(dailyCap) || 250,
          rpmCap: Number(rpmCap) || 10,
        }),
      });
      if (ok) {
        toast.success("Key validated & added");
        setKey("");
        setLabel("");
        onAdded();
      } else if (status === 409) {
        toast.error("That key is already in the pool");
      } else {
        toast.error(data.error || "Could not add key");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="grid gap-2 sm:grid-cols-12">
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="AIza… (paste the Gemini API key)" className={`sm:col-span-5 ${inputCls}`} />
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)" className={`sm:col-span-3 ${inputCls}`} />
        <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Account / project" className={`sm:col-span-2 ${inputCls}`} />
        <input value={dailyCap} onChange={(e) => setDailyCap(e.target.value)} inputMode="numeric" title="Daily request cap (RPD)" className={`sm:col-span-1 ${inputCls}`} />
        <input value={rpmCap} onChange={(e) => setRpmCap(e.target.value)} inputMode="numeric" title="Per-minute cap (RPM)" className={`sm:col-span-1 ${inputCls}`} />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-white/30">
          Validated on add via a free models-list call — no quota used. Caps: RPD / RPM.
        </span>
        <button type="submit" disabled={busy || !key.trim()} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-40">
          {busy ? "Validating…" : "Add key"}
        </button>
      </div>
    </form>
  );
}

function BulkAdd({ onAdded }: { onAdded: () => void }) {
  const [text, setText] = useState("");
  const [account, setAccount] = useState("");
  const [dailyCap, setDailyCap] = useState("250");
  const [rpmCap, setRpmCap] = useState("10");
  const [busy, setBusy] = useState(false);

  const count = text.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean).length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const { ok, data } = await api("/api/admin/keys/bulk", {
        method: "POST",
        body: JSON.stringify({
          keys: text,
          accountLabel: account.trim(),
          dailyCap: Number(dailyCap) || 250,
          rpmCap: Number(rpmCap) || 10,
        }),
      });
      if (ok) {
        toast.success(`Imported ${data.added} · ${data.duplicates} duplicate · ${data.invalid.length} invalid`);
        if (data.invalid?.length) {
          const hints = data.invalid.slice(0, 3).map((x: { keyHint: string }) => x.keyHint).join(", ");
          toast.error(`Rejected: ${hints}${data.invalid.length > 3 ? "…" : ""}`);
        }
        setText("");
        onAdded();
      } else {
        toast.error(data.error || "Import failed");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder={"Paste many keys — one per line, or comma/space separated:\nAIzaSy...\nAIzaSy...\nAIzaSy..."}
        className={`w-full font-mono ${inputCls}`}
      />
      <div className="mt-2 grid gap-2 sm:grid-cols-12">
        <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Account / project (applied to all)" className={`sm:col-span-6 ${inputCls}`} />
        <input value={dailyCap} onChange={(e) => setDailyCap(e.target.value)} inputMode="numeric" title="Daily cap for all" className={`sm:col-span-2 ${inputCls}`} />
        <input value={rpmCap} onChange={(e) => setRpmCap(e.target.value)} inputMode="numeric" title="RPM cap for all" className={`sm:col-span-2 ${inputCls}`} />
        <button type="submit" disabled={busy || count === 0} className="sm:col-span-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-40">
          {busy ? "Importing…" : `Import ${count || ""}`}
        </button>
      </div>
      <div className="mt-2 text-[11px] text-white/30">
        {count} key{count === 1 ? "" : "s"} detected · each validated via a free models-list call · duplicates skipped automatically.
      </div>
    </form>
  );
}

function KeyRow({ k, now, onChanged }: { k: SanitizedKey; now: number; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(k.label);
  const [account, setAccount] = useState(k.account_label);
  const [dailyCap, setDailyCap] = useState(String(k.daily_cap));
  const [rpmCap, setRpmCap] = useState(String(k.rpm_cap));
  const [busy, setBusy] = useState(false);

  const successRate =
    k.requests_total > 0 ? Math.round((k.success_total / k.requests_total) * 100) : null;
  const usedPct = k.daily_cap > 0 ? Math.min(100, Math.round((k.requests_today / k.daily_cap) * 100)) : 0;

  const patch = async (body: Record<string, unknown>, msg: string) => {
    setBusy(true);
    try {
      const { ok, data } = await api(`/api/admin/keys/${k.id}`, { method: "PATCH", body: JSON.stringify(body) });
      if (ok) {
        toast.success(msg);
        onChanged();
      } else {
        toast.error(data.error || "Update failed");
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete key ${k.key_hint}? This cannot be undone.`)) return;
    setBusy(true);
    const { ok, data } = await api(`/api/admin/keys/${k.id}`, { method: "DELETE" });
    if (ok) {
      toast.success("Key deleted");
      onChanged();
    } else {
      toast.error(data.error || "Delete failed");
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    const id = toast.loading(`Testing ${k.key_hint}… (uses 1 request)`);
    try {
      const { data } = await api(`/api/admin/keys/${k.id}`, {
        method: "POST",
        body: JSON.stringify({ action: "test" }),
      });
      if (data.ok) toast.success(`${k.key_hint} works · ${data.latencyMs}ms`, { id });
      else toast.error(`${k.key_hint}: ${data.error || "failed"}${data.status ? ` (${data.status})` : ""}`, { id });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const saveEdits = () =>
    patch(
      { label, accountLabel: account, dailyCap: Number(dailyCap) || 0, rpmCap: Number(rpmCap) || 0 },
      "Saved"
    ).then(() => setEditing(false));

  return (
    <div className="border-b border-white/5 last:border-0 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-[140px]">
          <div className="font-mono text-sm text-white/80">{k.key_hint}</div>
          {k.label && <div className="text-[11px] text-white/40">{k.label}</div>}
        </div>

        <StatusBadge status={k.status} cooldownUntil={k.cooldown_until} now={now} />

        {/* daily usage bar */}
        <div className="min-w-[120px] flex-1">
          <div className="flex justify-between text-[11px] text-white/40">
            <span>{k.requests_today}/{k.daily_cap} today</span>
            <span>{successRate !== null ? `${successRate}% ok` : "—"}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full ${usedPct >= 90 ? "bg-red-400" : usedPct >= 60 ? "bg-amber-400" : "bg-emerald-400"}`}
              style={{ width: `${usedPct}%` }}
            />
          </div>
        </div>

        <div className="text-[11px] text-white/40 min-w-[90px]">
          <div>429s: {k.rate_limit_hits_total}</div>
          <div>used {relTime(k.last_used_at, now)}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={test}
            disabled={busy}
            title="Send one real request with this key to confirm it works (uses 1 request)"
            className="rounded-md border border-sky-500/30 px-2 py-1 text-[11px] text-sky-300 hover:bg-sky-500/10 disabled:opacity-40"
          >
            Test
          </button>
          <button
            onClick={() => patch({ enabled: !k.enabled }, k.enabled ? "Disabled" : "Enabled")}
            disabled={busy}
            className={`rounded-md border px-2 py-1 text-[11px] ${
              k.enabled
                ? "border-white/10 text-white/60 hover:bg-white/5"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {k.enabled ? "Disable" : "Enable"}
          </button>
          <button
            onClick={() => setEditing((v) => !v)}
            className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/60 hover:bg-white/5"
          >
            Edit
          </button>
          <button
            onClick={remove}
            disabled={busy}
            className="rounded-md border border-red-500/20 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/10"
          >
            Delete
          </button>
        </div>
      </div>

      {k.last_error && (k.status === "invalid" || k.status === "cooling") && (
        <div className="mt-2 truncate text-[11px] text-red-300/70" title={k.last_error}>
          last error: {k.last_error}
        </div>
      )}

      {editing && (
        <div className="mt-3 grid gap-2 rounded-lg border border-white/10 bg-black/20 p-3 sm:grid-cols-12">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" className="sm:col-span-4 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm outline-none focus:border-white/30" />
          <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Account / project" className="sm:col-span-4 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm outline-none focus:border-white/30" />
          <input value={dailyCap} onChange={(e) => setDailyCap(e.target.value)} inputMode="numeric" title="Daily cap" className="sm:col-span-1 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm outline-none focus:border-white/30" />
          <input value={rpmCap} onChange={(e) => setRpmCap(e.target.value)} inputMode="numeric" title="RPM cap" className="sm:col-span-1 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm outline-none focus:border-white/30" />
          <button onClick={saveEdits} disabled={busy} className="sm:col-span-2 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-black hover:opacity-90 disabled:opacity-40">
            Save
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analytics tab
// ---------------------------------------------------------------------------

function AnalyticsTab({ keys, stats }: { keys: SanitizedKey[]; stats: DailyStat[] }) {
  const byKey = useMemo(() => {
    const map = new Map<string, DailyStat[]>();
    for (const s of stats) {
      if (!map.has(s.key_id)) map.set(s.key_id, []);
      map.get(s.key_id)!.push(s);
    }
    return map;
  }, [stats]);

  const maxReq = Math.max(1, ...stats.map((s) => s.requests));

  if (keys.length === 0) {
    return <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/40">No keys to analyze yet.</div>;
  }

  return (
    <div className="space-y-3">
      {keys.map((k) => {
        const rows = (byKey.get(k.id) || []).slice(-7);
        const totalReq = rows.reduce((a, s) => a + s.requests, 0);
        const totalErr = rows.reduce((a, s) => a + s.errors, 0);
        const ok = totalReq > 0 ? Math.round(((totalReq - totalErr) / totalReq) * 100) : null;
        return (
          <div key={k.id} className="rounded-xl border border-white/10 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-mono text-sm text-white/80">{k.key_hint}{k.label ? ` · ${k.label}` : ""}</div>
              <div className="text-[11px] text-white/40">
                7d: {totalReq} req · {ok !== null ? `${ok}% ok` : "—"} · avg {rows.length ? Math.round(rows.reduce((a, s) => a + s.avg_latency_ms, 0) / rows.length) : 0}ms
              </div>
            </div>
            <div className="flex items-end gap-1.5 h-20">
              {rows.length === 0 && <div className="text-[11px] text-white/30">No activity in the last 7 days.</div>}
              {rows.map((s) => {
                const h = Math.max(4, Math.round((s.requests / maxReq) * 72));
                const errFrac = s.requests > 0 ? s.errors / s.requests : 0;
                return (
                  <div key={s.date} className="flex flex-1 flex-col items-center gap-1" title={`${s.date}: ${s.requests} req, ${s.errors} err`}>
                    <div className="w-full max-w-[28px] overflow-hidden rounded-sm bg-emerald-400/70" style={{ height: h }}>
                      <div className="w-full bg-red-400/80" style={{ height: `${Math.round(errFrac * 100)}%` }} />
                    </div>
                    <span className="text-[9px] text-white/30">{s.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Errors tab
// ---------------------------------------------------------------------------

function ErrorsTab({ events, counts, now }: { events: UsageEvent[]; counts: ErrorCounts | null; now: number }) {
  const errorEvents = events.filter((e) => e.event_type !== "success");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Chip label="User-facing errors (today)" value={counts?.userFacing ?? 0} tone={(counts?.userFacing ?? 0) > 0 ? "bad" : "good"} />
        <Chip label="Recovered silently (today)" value={counts?.recovered ?? 0} tone="warn" />
        <Chip label="All events (today)" value={counts?.total ?? 0} />
        <Chip label="Invalid-key events" value={counts?.byType?.invalid_key ?? 0} tone={(counts?.byType?.invalid_key ?? 0) > 0 ? "bad" : "muted"} />
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <div className="border-b border-white/10 px-4 py-2 text-xs uppercase tracking-wider text-white/40">
          Live event feed
        </div>
        {errorEvents.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-white/40">No errors recorded today. 🎉</div>
        ) : (
          <div className="max-h-[480px] overflow-y-auto">
            {errorEvents.map((e) => (
              <div key={e.id} className="flex items-start gap-3 border-b border-white/5 px-4 py-2.5 last:border-0">
                <span
                  className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] ${
                    e.user_facing ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300"
                  }`}
                >
                  {e.user_facing ? "user-facing" : "recovered"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-white/80" title={e.error_message || ""}>
                    {e.error_message || e.event_type}
                  </div>
                  <div className="text-[11px] text-white/35">
                    {e.http_status ? `HTTP ${e.http_status} · ` : ""}
                    {e.mode ? `${e.mode} · ` : ""}
                    {e.key_hint ? `${e.key_hint} · ` : ""}
                    {relTime(e.ts, now)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings tab
// ---------------------------------------------------------------------------

function SettingsTab({
  settings,
  audit,
  now,
  onSaved,
}: {
  settings: AdminSettings | null;
  audit: AuditEntry[];
  now: number;
  onSaved: () => void;
}) {
  const [cap, setCap] = useState("");
  const [maintenance, setMaintenance] = useState(false);
  const [model, setModel] = useState("gemini-3.6-flash");
  const [provider, setProvider] = useState<"gemini" | "openrouter" | "bedrock">("gemini");
  const [orKey, setOrKey] = useState("");
  const [orModels, setOrModels] = useState<string[]>([]); // ordered fallback chain
  const [orKeySet, setOrKeySet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState<{ id: string; name: string }[]>([]);
  const [modelFilter, setModelFilter] = useState("");
  const [fetchingModels, setFetchingModels] = useState(false);
  // Bedrock (direct AWS, bearer-token API key)
  const [brKey, setBrKey] = useState("");
  const [brKeySet, setBrKeySet] = useState(false);
  const [brRegion, setBrRegion] = useState("us-east-1");
  const [brModels, setBrModels] = useState<string[]>([]); // ordered fallback chain
  const [brModelInput, setBrModelInput] = useState("");
  const [brAvailable, setBrAvailable] = useState<{ id: string; name: string }[]>([]);
  const [brFilter, setBrFilter] = useState("");
  const [brFetching, setBrFetching] = useState(false);

  useEffect(() => {
    if (settings) {
      setCap(settings.daily_prompt_cap === null ? "" : String(settings.daily_prompt_cap));
      setMaintenance(settings.maintenance_mode);
      setModel(settings.default_model);
      setProvider(settings.provider ?? "gemini");
      const chain = settings.openrouter_models?.length
        ? settings.openrouter_models
        : settings.openrouter_model ? [settings.openrouter_model] : [];
      setOrModels(chain);
      setOrKeySet(!!settings.openrouter_api_key_set);
      setOrKey("");
      const brChain = settings.bedrock_models?.length
        ? settings.bedrock_models
        : settings.bedrock_model ? [settings.bedrock_model] : [];
      setBrModels(brChain);
      setBrRegion(settings.bedrock_region || "us-east-1");
      setBrKeySet(!!settings.bedrock_api_key_set);
      setBrKey("");
    }
  }, [settings]);

  const fetchModels = async () => {
    setFetchingModels(true);
    try {
      const { ok, data } = await api("/api/admin/openrouter/models", {
        method: "POST",
        body: JSON.stringify(orKey.trim() ? { key: orKey.trim() } : {}),
      });
      if (ok) {
        setAvailable(data.models ?? []);
        toast.success(`${(data.models ?? []).length} models available`);
      } else {
        toast.error(data.error || "Could not list models");
      }
    } finally {
      setFetchingModels(false);
    }
  };

  const addModel = (id: string) => setOrModels((c) => (c.includes(id) ? c : [...c, id]));
  const removeModel = (id: string) => setOrModels((c) => c.filter((m) => m !== id));
  const promoteModel = (i: number) =>
    setOrModels((c) => (i <= 0 ? c : c.map((m, j) => (j === i - 1 ? c[i] : j === i ? c[i - 1] : m))));

  const addBrModelId = (id: string) => setBrModels((c) => (c.includes(id) ? c : [...c, id]));
  const addBrModel = () => {
    const id = brModelInput.trim();
    if (!id) return;
    addBrModelId(id);
    setBrModelInput("");
  };
  const removeBrModel = (id: string) => setBrModels((c) => c.filter((m) => m !== id));
  const promoteBrModel = (i: number) =>
    setBrModels((c) => (i <= 0 ? c : c.map((m, j) => (j === i - 1 ? c[i] : j === i ? c[i - 1] : m))));

  const fetchBrModels = async () => {
    setBrFetching(true);
    try {
      const { ok, data } = await api("/api/admin/bedrock/models", {
        method: "POST",
        body: JSON.stringify({
          ...(brKey.trim() ? { key: brKey.trim() } : {}),
          ...(brRegion.trim() ? { region: brRegion.trim() } : {}),
        }),
      });
      if (ok) {
        setBrAvailable(data.models ?? []);
        toast.success(`${(data.models ?? []).length} models available`);
      } else {
        toast.error(data.error || "Could not list models");
      }
    } finally {
      setBrFetching(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const { ok, data } = await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          daily_prompt_cap: cap.trim() === "" ? null : Number(cap),
          maintenance_mode: maintenance,
          default_model: model,
          provider,
          openrouter_models: orModels,
          // keep single-model in sync as a fallback for empty chains
          ...(orModels[0] ? { openrouter_model: orModels[0] } : {}),
          // only sent when non-empty — blank keeps the existing key
          ...(orKey.trim() ? { openrouter_api_key: orKey.trim() } : {}),
          bedrock_region: brRegion.trim() || "us-east-1",
          bedrock_models: brModels,
          ...(brKey.trim() ? { bedrock_api_key: brKey.trim() } : {}),
        }),
      });
      if (ok) {
        toast.success("Settings saved");
        onSaved();
      } else {
        toast.error(data.error || "Save failed");
      }
    } finally {
      setBusy(false);
    }
  };

  if (!settings) return <div className="text-sm text-white/40">Loading…</div>;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-xl border border-white/10 p-5">
        <div className="text-sm font-medium text-white/80">Provider</div>
        <div className="grid grid-cols-3 gap-2">
          {(["gemini", "openrouter", "bedrock"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                provider === p ? "border-white bg-white text-black" : "border-white/15 text-white/60 hover:bg-white/5"
              }`}
            >
              {p === "openrouter" ? "OpenRouter" : p === "bedrock" ? "Bedrock" : "Gemini"}
            </button>
          ))}
        </div>

        {provider === "openrouter" && (
          <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-3">
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-white/40">
                OpenRouter API key {orKeySet && <span className="text-emerald-400/70 normal-case">· saved</span>}
              </span>
              <input
                value={orKey}
                onChange={(e) => setOrKey(e.target.value)}
                type="password"
                placeholder={orKeySet ? "•••••••• (leave blank to keep current)" : "sk-or-v1-…"}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
              />
            </label>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-white/40">Model fallback chain</span>
                <button
                  onClick={fetchModels}
                  disabled={fetchingModels}
                  className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-white/70 hover:bg-white/5 disabled:opacity-40"
                >
                  {fetchingModels ? "Testing…" : "Test key & list models"}
                </button>
              </div>

              {/* Selected chain — order = priority; falls to the next on RPM/5xx. */}
              {orModels.length === 0 ? (
                <p className="mt-2 text-[11px] text-white/35">
                  No models selected. Test your key, then pick models below — the first is primary, the rest are
                  fallbacks used automatically when a model&apos;s RPM is exhausted.
                </p>
              ) : (
                <ol className="mt-2 space-y-1">
                  {orModels.map((id, i) => (
                    <li key={id} className="flex items-center gap-2 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs">
                      <span className="w-4 shrink-0 text-white/30">{i + 1}</span>
                      <span className="flex-1 truncate font-mono">{id}</span>
                      {i === 0 && <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300">primary</span>}
                      {i > 0 && (
                        <button onClick={() => promoteModel(i)} title="Move up" className="shrink-0 text-white/40 hover:text-white">↑</button>
                      )}
                      <button onClick={() => removeModel(id)} title="Remove" className="shrink-0 text-white/40 hover:text-red-400">×</button>
                    </li>
                  ))}
                </ol>
              )}

              {/* Available models (after Test) — filterable, click to add. */}
              {available.length > 0 && (
                <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-2">
                  <input
                    value={modelFilter}
                    onChange={(e) => setModelFilter(e.target.value)}
                    placeholder="Filter models (e.g. anthropic, opus)…"
                    className="mb-2 w-full rounded border border-white/10 bg-black/30 px-2 py-1 text-xs outline-none focus:border-white/30"
                  />
                  <div className="max-h-48 space-y-0.5 overflow-y-auto">
                    {available
                      .filter((m) => {
                        const q = modelFilter.trim().toLowerCase();
                        return !q || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
                      })
                      .slice(0, 200)
                      .map((m) => {
                        const picked = orModels.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            onClick={() => (picked ? removeModel(m.id) : addModel(m.id))}
                            className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[11px] transition-colors ${
                              picked ? "bg-emerald-500/10 text-emerald-200" : "text-white/60 hover:bg-white/5"
                            }`}
                          >
                            <span className="w-3 shrink-0">{picked ? "✓" : "+"}</span>
                            <span className="truncate font-mono">{m.id}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
            <p className="text-[11px] text-white/35">
              Routes ALL generation through this single key (e.g. Claude Opus via Bedrock). It tries the primary
              model, falling to the next automatically on a 429 (RPM exhausted) or overload. Parallel modes
              (deep research) are auto-serialized so a low Bedrock quota isn&apos;t blown.
            </p>
          </div>
        )}

        {provider === "bedrock" && (
          <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-3">
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-white/40">
                Bedrock API key {brKeySet && <span className="text-emerald-400/70 normal-case">· saved</span>}
              </span>
              <input
                value={brKey}
                onChange={(e) => setBrKey(e.target.value)}
                type="password"
                placeholder={brKeySet ? "•••••••• (leave blank to keep current)" : "AWS Bedrock API key (bearer token)"}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-white/40">
                AWS region <span className="normal-case text-white/30">· auto from model prefix</span>
              </span>
              <input
                value={brRegion}
                onChange={(e) => setBrRegion(e.target.value)}
                placeholder="us-east-1"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm font-mono outline-none focus:border-white/30"
              />
              <span className="mt-1 block text-[11px] text-white/30">
                Auto-picked from each model&apos;s geo prefix (us./eu./apac.). Only used for bare or global. ids —
                override if you need a specific region.
              </span>
            </label>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-white/40">Model fallback chain</span>
                <button
                  onClick={fetchBrModels}
                  disabled={brFetching}
                  className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-white/70 hover:bg-white/5 disabled:opacity-40"
                >
                  {brFetching ? "Testing…" : "Test key & list models"}
                </button>
              </div>
              {brModels.length === 0 ? (
                <p className="mt-2 text-[11px] text-white/35">
                  Test your key to list models, or type an id below. The first is primary; the rest are fallbacks
                  used automatically when a model&apos;s RPM/TPM is throttled.
                </p>
              ) : (
                <ol className="mt-2 space-y-1">
                  {brModels.map((id, i) => (
                    <li key={id} className="flex items-center gap-2 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs">
                      <span className="w-4 shrink-0 text-white/30">{i + 1}</span>
                      <span className="flex-1 truncate font-mono">{id}</span>
                      {i === 0 && <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">primary</span>}
                      {i > 0 && (
                        <button onClick={() => promoteBrModel(i)} title="Move up" className="shrink-0 text-white/40 hover:text-white">↑</button>
                      )}
                      <button onClick={() => removeBrModel(id)} title="Remove" className="shrink-0 text-white/40 hover:text-red-400">×</button>
                    </li>
                  ))}
                </ol>
              )}

              {/* Detected models (after Test) — filterable, click to add. */}
              {brAvailable.length > 0 && (
                <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-2">
                  <input
                    value={brFilter}
                    onChange={(e) => setBrFilter(e.target.value)}
                    placeholder="Filter models (e.g. opus, claude)…"
                    className="mb-2 w-full rounded border border-white/10 bg-black/30 px-2 py-1 text-xs outline-none focus:border-white/30"
                  />
                  <div className="max-h-48 space-y-0.5 overflow-y-auto">
                    {brAvailable
                      .filter((m) => {
                        const q = brFilter.trim().toLowerCase();
                        return !q || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
                      })
                      .slice(0, 200)
                      .map((m) => {
                        const picked = brModels.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            onClick={() => (picked ? removeBrModel(m.id) : addBrModelId(m.id))}
                            className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[11px] transition-colors ${
                              picked ? "bg-amber-500/10 text-amber-200" : "text-white/60 hover:bg-white/5"
                            }`}
                            title={m.name}
                          >
                            <span className="w-3 shrink-0">{picked ? "✓" : "+"}</span>
                            <span className="truncate font-mono">{m.id}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              <div className="mt-2 flex gap-2">
                <input
                  value={brModelInput}
                  onChange={(e) => setBrModelInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBrModel(); } }}
                  placeholder="or type an id: us.anthropic.claude-opus-4-…-v1:0"
                  className="flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs font-mono outline-none focus:border-white/30"
                />
                <button onClick={addBrModel} className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5">Add</button>
              </div>
            </div>

            <p className="text-[11px] text-white/35">
              Calls AWS Bedrock directly with your Bedrock API key (bearer token) — your full AWS RPM/TPM, no
              OpenRouter middleman or credit reservation. Use the model or cross-region <em>inference-profile</em> id
              from the AWS console (Bedrock → Model catalog / Cross-region inference), e.g.
              <span className="font-mono"> us.anthropic.claude-opus-4-…-v1:0</span> — the region is picked
              automatically from its <span className="font-mono">us./eu./apac.</span> prefix. Parallel modes (deep
              research) are auto-serialized so low default quotas aren&apos;t blown.
            </p>
          </div>
        )}

        <div className="pt-1 text-sm font-medium text-white/80">Global controls</div>

        <label className="block">
          <span className="text-xs uppercase tracking-wider text-white/40">Daily prompt cap</span>
          <input
            value={cap}
            onChange={(e) => setCap(e.target.value)}
            inputMode="numeric"
            placeholder="blank = unlimited"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wider text-white/40">Default Gemini model</span>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            list="model-options"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
          />
          <datalist id="model-options">
            {DEFAULT_MODELS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </label>

        <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2.5">
          <div>
            <div className="text-sm text-white/80">Maintenance mode</div>
            <div className="text-[11px] text-white/40">Pauses generation with a friendly message.</div>
          </div>
          <button
            onClick={() => setMaintenance((v) => !v)}
            className={`relative h-6 w-11 rounded-full transition-colors ${maintenance ? "bg-amber-500" : "bg-white/15"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${maintenance ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>

        <button
          onClick={save}
          disabled={busy}
          className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save settings"}
        </button>
      </div>

      <div className="rounded-xl border border-white/10 p-5">
        <div className="mb-3 text-sm font-medium text-white/80">Audit log</div>
        <div className="max-h-[420px] space-y-2 overflow-y-auto">
          {audit.length === 0 && <div className="text-sm text-white/40">No activity yet.</div>}
          {audit.map((a) => (
            <div key={a.id} className="flex items-baseline justify-between gap-3 text-[12px]">
              <span className="text-white/70">
                {a.action}
                {a.target ? <span className="text-white/30"> · {String(a.target).slice(0, 8)}</span> : null}
              </span>
              <span className="shrink-0 text-white/30">{relTime(a.ts, now)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Setup tab
// ---------------------------------------------------------------------------

function CopyBlock({ title, text }: { title: string; text: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${title} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };
  return (
    <div className="rounded-xl border border-white/10">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="text-xs uppercase tracking-wider text-white/40">{title}</span>
        <button onClick={copy} className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/60 hover:bg-white/5">
          Copy
        </button>
      </div>
      <pre className="max-h-[360px] overflow-auto px-4 py-3 text-[12px] leading-relaxed text-white/70">{text}</pre>
    </div>
  );
}

function SetupTab({
  setup,
  sql,
  envTemplate,
  onRecheck,
}: {
  setup: SetupState | null;
  sql: string;
  envTemplate: string;
  onRecheck: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-white/10 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium text-white/80">Setup status</div>
          <button onClick={onRecheck} className="rounded-md border border-white/10 px-3 py-1.5 text-[12px] text-white/60 hover:bg-white/5">
            Re-check
          </button>
        </div>
        <div className="space-y-1.5">
          {!setup && <div className="text-sm text-white/40">Checking…</div>}
          {setup?.checks.map((c) => (
            <div key={c.name} className="flex items-center gap-2 text-sm">
              <span className={c.ok ? "text-emerald-400" : "text-red-400"}>{c.ok ? "✓" : "✕"}</span>
              <span className="text-white/70">{c.name}</span>
              {c.detail && <span className="text-[11px] text-white/35">— {c.detail}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 p-5 text-sm text-white/60">
        <div className="mb-2 font-medium text-white/80">How to set up (one time)</div>
        <ol className="list-decimal space-y-1 pl-5 text-[13px] text-white/55">
          <li>Add the env vars below to your Vercel project (Settings → Environment Variables), then redeploy.</li>
          <li>Open your Supabase project → SQL Editor → paste the SQL below → Run.</li>
          <li>Come back here, hit <span className="text-white/80">Re-check</span>, then add keys in the Keys tab.</li>
        </ol>
      </div>

      <CopyBlock title=".env (Vercel environment variables)" text={envTemplate} />
      <CopyBlock title="Supabase SQL (run once)" text={sql} />
    </div>
  );
}
