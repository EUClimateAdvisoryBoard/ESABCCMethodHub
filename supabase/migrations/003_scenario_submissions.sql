-- ============================================================================
-- 003 — Scenario data submissions
--
-- Stores externally contributed scenario datasets uploaded via the public
-- "Request New Scenario Data" portal at /scenarios/upload. Each row represents
-- a single submission (a file + metadata). Files are kept in Supabase Storage
-- in the `scenario-submissions` bucket, and a pointer is stored here alongside
-- the contributor's metadata so the Secretariat can screen and analyse them.
-- ============================================================================

create table if not exists public.scenario_submissions (
  id                text primary key,
  call_slug         text,
  submitter_name    text not null default '',
  submitter_email   text not null default '',
  institution       text not null default '',
  model_name        text not null default '',
  scenario_name     text not null default '',
  description       text not null default '',
  file_name         text not null,
  file_size         integer not null default 0,
  file_type         text not null default '',
  storage_path      text,
  public_url        text,
  row_count         integer,
  headers           text[],
  missing_columns   text[],
  year_columns      text[],
  validation_ok     boolean not null default false,
  validation_notes  text,
  review_status     text not null default 'pending'
                    check (review_status in ('pending', 'under_review', 'accepted', 'rejected', 'needs_changes')),
  review_notes      text not null default '',
  api_key           text,
  created_at        timestamptz not null default now(),
  reviewed_at       timestamptz
);

create index if not exists idx_scenario_submissions_created on public.scenario_submissions (created_at desc);
create index if not exists idx_scenario_submissions_status  on public.scenario_submissions (review_status);
create index if not exists idx_scenario_submissions_call    on public.scenario_submissions (call_slug);

alter table public.scenario_submissions enable row level security;

drop policy if exists "Scenario submissions are viewable by everyone" on public.scenario_submissions;
create policy "Scenario submissions are viewable by everyone"
  on public.scenario_submissions for select using (true);

drop policy if exists "Anyone can submit scenario data" on public.scenario_submissions;
create policy "Anyone can submit scenario data"
  on public.scenario_submissions for insert with check (true);

-- Storage bucket for the uploaded files themselves.
insert into storage.buckets (id, name, public)
  values ('scenario-submissions', 'scenario-submissions', true)
  on conflict (id) do nothing;

drop policy if exists "Scenario submissions bucket public read" on storage.objects;
create policy "Scenario submissions bucket public read"
  on storage.objects for select
  using (bucket_id = 'scenario-submissions');

drop policy if exists "Scenario submissions bucket public write" on storage.objects;
create policy "Scenario submissions bucket public write"
  on storage.objects for insert
  with check (bucket_id = 'scenario-submissions');
