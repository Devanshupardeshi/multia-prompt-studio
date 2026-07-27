-- Studio feedback: user star ratings after a render, plus automatically captured
-- failures. Paste the whole file into the Supabase SQL Editor.
--
-- Two kinds of row live here, distinguished by `kind`:
--   'rating' — a person rated a generated image and optionally wrote a comment
--   'error'  — the app recorded a failure with no human involved
-- Keeping them in one table means the admin view shows successes and failures on
-- one timeline, which is what makes the ratings interpretable.

create table if not exists public.studio_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  kind text not null check (kind in ('rating', 'error')),
  -- Which studio produced it: 'poster' or 'prompt-studio'.
  source text not null,
  -- Poster style category, or the Prompt Studio generation mode.
  mode text,

  -- 1..5, always null on 'error' rows.
  rating smallint check (rating is null or (rating >= 1 and rating <= 5)),
  comment text,

  -- Set on 'error' rows; also set when a rating is left on a failed run.
  error_message text,
  -- Which step failed, e.g. 'concept', 'artwork', 'refine'.
  error_stage text,

  -- Enough context to understand the rating without opening the app.
  topic text,
  headline text,
  prompt_model text,

  -- Path inside the 'studio-feedback' storage bucket. Null for error rows and for
  -- ratings where the image could not be uploaded.
  image_path text,
  image_width integer,
  image_height integer,

  -- The full production contract, so a poster can be reproduced from a rating.
  prompt_json jsonb,
  metadata jsonb
);

create index if not exists studio_feedback_created_at_idx
  on public.studio_feedback (created_at desc);
create index if not exists studio_feedback_kind_idx
  on public.studio_feedback (kind, created_at desc);

alter table public.studio_feedback enable row level security;

-- No anon access at all: feedback is written by the server with the service role
-- and read only by the admin panel, which is already behind its own auth.
revoke all on public.studio_feedback from anon, authenticated;
grant select, insert, update, delete on public.studio_feedback to service_role;

-- ---------------------------------------------------------------------------
-- Storage bucket for the rated images.
-- Private on purpose — the admin panel serves them through signed URLs, so the
-- generated artwork never becomes publicly guessable.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'studio-feedback',
  'studio-feedback',
  false,
  10485760, -- 10 MB per image
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

-- Service role only; the anon key must never touch these objects.
drop policy if exists "Service role manages studio feedback images" on storage.objects;
create policy "Service role manages studio feedback images"
on storage.objects
for all
to service_role
using (bucket_id = 'studio-feedback')
with check (bucket_id = 'studio-feedback');
