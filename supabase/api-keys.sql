-- =============================================================================
-- Multia Prompt Studio — Live API-Key Admin Panel + Self-Healing Key Pool
-- Paste this ENTIRE file into the Supabase SQL Editor and run it once.
-- (The admin panel's "Setup" tab shows this same SQL with a Copy button.)
--
-- What it creates:
--   gemini_api_keys        – the live pool of Gemini keys + per-key health/quota
--   gemini_key_daily_stats – per-key per-day rollup for the analytics charts
--   usage_events           – append-only event/error feed (live + pruned)
--   app_settings           – runtime config (daily cap, maintenance, model)
--   admin_audit_log        – who added/removed/disabled keys & changed settings
--   claim_next_gemini_key()    – atomic "give me a healthy key" (SKIP LOCKED)
--   report_gemini_key_result() – record outcome, set cooldown, roll stats+events
--
-- All tables are SERVICE-ROLE ONLY. The browser never touches them; the admin
-- panel reads/writes exclusively through server API routes. Keys never leave
-- the server.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------

create table if not exists public.gemini_api_keys (
  id                    uuid primary key default gen_random_uuid(),
  label                 text not null default '',
  account_label         text not null default '',            -- Google account / project group
  key                   text not null,                        -- the secret key (service-role only)
  key_hint              text not null default '',             -- e.g. "AIzaSy…aB3d" for display
  key_fingerprint       text not null,                        -- sha256(key) for dedupe
  status                text not null default 'active'
                          check (status in ('active','cooling','exhausted_daily','invalid','disabled','half_open')),
  enabled               boolean not null default true,
  cooldown_until        timestamptz,                          -- key is unusable until this moment
  half_open             boolean not null default false,       -- single-trial recovery lock
  daily_cap             integer not null default 250,         -- predictive RPD guard
  rpm_cap               integer not null default 10,          -- predictive RPM guard
  requests_today        integer not null default 0,
  daily_reset_date      date,                                 -- Pacific date the day-counter belongs to
  minute_window_start   timestamptz,                          -- start of the current 60s window
  requests_this_minute  integer not null default 0,
  requests_total        bigint  not null default 0,
  success_total         bigint  not null default 0,
  error_total           bigint  not null default 0,
  rate_limit_hits_total bigint  not null default 0,
  last_used_at          timestamptz,
  last_success_at       timestamptz,
  last_error            text,
  last_error_at         timestamptz,
  priority              integer not null default 100,         -- lower = preferred
  notes                 text not null default '',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (key_fingerprint)
);

create table if not exists public.gemini_key_daily_stats (
  key_id          uuid not null references public.gemini_api_keys(id) on delete cascade,
  date            date not null,                              -- Pacific date bucket
  requests        integer not null default 0,
  successes       integer not null default 0,
  errors          integer not null default 0,
  rate_limit_hits integer not null default 0,
  avg_latency_ms  integer not null default 0,
  primary key (key_id, date)
);

create table if not exists public.usage_events (
  id            bigint generated always as identity primary key,
  ts            timestamptz not null default now(),
  key_id        uuid references public.gemini_api_keys(id) on delete set null,
  mode          text,
  http_status   integer,
  event_type    text not null default 'success'
                  check (event_type in ('success','rate_limit_recovered','user_error','invalid_key','pool_drained')),
  user_facing   boolean not null default false,               -- did the end user actually see an error?
  error_message text,
  latency_ms    integer,
  event_date    date not null default ((now() at time zone 'America/Los_Angeles')::date)
);

create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id     uuid primary key default gen_random_uuid(),
  ts     timestamptz not null default now(),
  action text not null,
  target text,
  detail jsonb
);

-- Seed runtime config (no-op if already present)
insert into public.app_settings (key, value) values
  ('daily_prompt_cap', 'null'::jsonb),          -- null = unlimited
  ('maintenance_mode', 'false'::jsonb),
  ('default_model',    '"gemini-3.5-flash"'::jsonb),
  ('provider',         '"gemini"'::jsonb),        -- 'gemini' | 'openrouter' | 'bedrock'
  ('openrouter_api_key', '""'::jsonb),            -- set from the admin panel (Settings)
  ('openrouter_model', '"anthropic/claude-opus-4.6"'::jsonb),  -- primary (synced with chain[0])
  ('openrouter_models', '[]'::jsonb),             -- ordered fallback chain, set from Settings
  ('bedrock_api_key',  '""'::jsonb),              -- AWS Bedrock API key (bearer), set from Settings
  ('bedrock_region',   '"us-east-1"'::jsonb),
  ('bedrock_model',    '""'::jsonb),              -- primary (synced with bedrock chain[0])
  ('bedrock_models',   '[]'::jsonb)               -- ordered fallback chain of model/inference-profile ids
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- 2. Indexes
-- ----------------------------------------------------------------------------
create index if not exists idx_gemini_keys_claim
  on public.gemini_api_keys (last_used_at asc nulls first, priority asc)
  where enabled = true;
create index if not exists idx_usage_events_ts on public.usage_events (ts desc);
create index if not exists idx_usage_events_date on public.usage_events (event_date);

-- ----------------------------------------------------------------------------
-- 3. RLS — deny everyone except service_role (which bypasses RLS).
--    Nothing here is ever read by the anon/browser client.
-- ----------------------------------------------------------------------------
alter table public.gemini_api_keys      enable row level security;
alter table public.gemini_key_daily_stats enable row level security;
alter table public.usage_events         enable row level security;
alter table public.app_settings         enable row level security;
alter table public.admin_audit_log      enable row level security;

grant all on public.gemini_api_keys        to service_role;
grant all on public.gemini_key_daily_stats to service_role;
grant all on public.usage_events           to service_role;
grant all on public.app_settings           to service_role;
grant all on public.admin_audit_log        to service_role;
grant usage, select on sequence public.usage_events_id_seq to service_role;

-- ----------------------------------------------------------------------------
-- 4. claim_next_gemini_key — atomically hand out the best healthy key.
--    Uses FOR UPDATE SKIP LOCKED so concurrent presses never collide.
--    Predictively skips keys at their RPM or RPD cap. Lazily rolls the
--    per-day (Pacific midnight) and per-minute (60s) windows. Marks a
--    recovering key half_open with a 15s safety lock (single-trial).
-- ----------------------------------------------------------------------------
create or replace function public.claim_next_gemini_key(p_model text default null)
returns public.gemini_api_keys
language plpgsql
as $$
declare
  claimed        public.gemini_api_keys;
  pacific_today  date := (now() at time zone 'America/Los_Angeles')::date;
  was_recovering boolean;
begin
  select * into claimed
  from public.gemini_api_keys k
  where k.enabled = true
    and k.status not in ('invalid','disabled')
    and (k.cooldown_until is null or k.cooldown_until <= now())
    and (
      k.daily_reset_date is distinct from pacific_today   -- new PT day → counter stale → ok
      or k.requests_today < k.daily_cap                    -- still under daily cap
    )
    and (
      k.minute_window_start is null
      or k.minute_window_start < now() - interval '60 seconds'  -- minute window expired → ok
      or k.requests_this_minute < k.rpm_cap                     -- still under per-minute cap
    )
  order by k.last_used_at asc nulls first, k.priority asc
  for update skip locked
  limit 1;

  if claimed.id is null then
    return null;  -- pool drained / everything cooling
  end if;

  was_recovering := claimed.status in ('cooling','exhausted_daily','half_open');

  -- roll the per-day window
  if claimed.daily_reset_date is distinct from pacific_today then
    claimed.requests_today := 0;
    claimed.daily_reset_date := pacific_today;
  end if;

  -- roll the per-minute window
  if claimed.minute_window_start is null
     or claimed.minute_window_start < now() - interval '60 seconds' then
    claimed.minute_window_start := now();
    claimed.requests_this_minute := 0;
  end if;

  update public.gemini_api_keys
  set requests_today       = claimed.requests_today + 1,
      requests_this_minute = claimed.requests_this_minute + 1,
      requests_total       = requests_total + 1,
      minute_window_start  = claimed.minute_window_start,
      daily_reset_date     = claimed.daily_reset_date,
      last_used_at         = now(),
      -- recovering key → mark half_open + short safety lock so concurrent
      -- claimers skip it until this trial reports back (or the lock expires).
      half_open      = was_recovering,
      status         = case when was_recovering then 'half_open' else 'active' end,
      cooldown_until = case when was_recovering then now() + interval '15 seconds' else null end,
      updated_at     = now()
  where id = claimed.id
  returning * into claimed;

  return claimed;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. report_gemini_key_result — record the outcome of a real generation call.
--    Sets cooldown by limit type, rolls daily stats, appends a usage_event.
-- ----------------------------------------------------------------------------
create or replace function public.report_gemini_key_result(
  p_id              uuid,
  p_success         boolean,
  p_http_status     integer default null,
  p_error           text    default null,
  p_cooldown_seconds integer default null,
  p_daily_exhausted boolean default false,
  p_event_type      text    default null,
  p_user_facing     boolean default false,
  p_mode            text    default null,
  p_latency_ms      integer default null
)
returns void
language plpgsql
as $$
declare
  pacific_today date := (now() at time zone 'America/Los_Angeles')::date;
  new_status    text;
  new_cooldown  timestamptz;
begin
  if p_success then
    update public.gemini_api_keys
    set status          = 'active',
        half_open       = false,
        cooldown_until  = null,
        success_total   = success_total + 1,
        last_success_at = now(),
        last_error      = null,
        updated_at      = now()
    where id = p_id;
  else
    if p_daily_exhausted then
      new_status   := 'exhausted_daily';
      new_cooldown := ((pacific_today + 1)::timestamp) at time zone 'America/Los_Angeles'; -- next PT midnight
    elsif p_http_status in (400, 401, 403) then
      new_status   := 'invalid';
      new_cooldown := null;
    else
      new_status   := 'cooling';
      new_cooldown := now() + make_interval(secs => coalesce(p_cooldown_seconds, 60));
    end if;

    update public.gemini_api_keys
    set status               = new_status,
        half_open            = false,
        enabled              = case when new_status = 'invalid' then false else enabled end,
        cooldown_until       = new_cooldown,
        error_total          = error_total + 1,
        rate_limit_hits_total = rate_limit_hits_total + case when p_http_status = 429 then 1 else 0 end,
        last_error           = p_error,
        last_error_at        = now(),
        updated_at           = now()
    where id = p_id;
  end if;

  -- daily rollup (running average for latency)
  insert into public.gemini_key_daily_stats as s
    (key_id, date, requests, successes, errors, rate_limit_hits, avg_latency_ms)
  values (
    p_id, pacific_today, 1,
    case when p_success then 1 else 0 end,
    case when p_success then 0 else 1 end,
    case when p_http_status = 429 then 1 else 0 end,
    coalesce(p_latency_ms, 0)
  )
  on conflict (key_id, date) do update set
    requests        = s.requests + 1,
    successes       = s.successes + (case when p_success then 1 else 0 end),
    errors          = s.errors + (case when p_success then 0 else 1 end),
    rate_limit_hits = s.rate_limit_hits + (case when p_http_status = 429 then 1 else 0 end),
    avg_latency_ms  = case
      when coalesce(p_latency_ms, 0) > 0
        then ((s.avg_latency_ms * s.requests) + p_latency_ms) / (s.requests + 1)
      else s.avg_latency_ms
    end;

  -- live event feed
  insert into public.usage_events
    (key_id, mode, http_status, event_type, user_facing, error_message, latency_ms, event_date)
  values (
    p_id, p_mode, p_http_status,
    coalesce(p_event_type, case when p_success then 'success' else 'user_error' end),
    p_user_facing, p_error, p_latency_ms, pacific_today
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. prune_usage_events — keep the event feed small (call from pg_cron if you
--    have it, or it's invoked opportunistically by the server).
-- ----------------------------------------------------------------------------
create or replace function public.prune_usage_events(p_days integer default 14)
returns integer
language plpgsql
as $$
declare
  removed integer;
begin
  delete from public.usage_events where ts < now() - make_interval(days => p_days);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. Permissions — only the server (service_role) may run these.
-- ----------------------------------------------------------------------------
revoke execute on function public.claim_next_gemini_key(text) from public;
revoke execute on function public.report_gemini_key_result(uuid, boolean, integer, text, integer, boolean, text, boolean, text, integer) from public;
revoke execute on function public.prune_usage_events(integer) from public;
grant execute on function public.claim_next_gemini_key(text) to service_role;
grant execute on function public.report_gemini_key_result(uuid, boolean, integer, text, integer, boolean, text, boolean, text, integer) to service_role;
grant execute on function public.prune_usage_events(integer) to service_role;
