-- Country profiles — EU-27 EEA-style member-state profiles, with the edit /
-- share-link / external-submission workflow.

-- 1. Profile drafts: per-country JSON store of the most recent main-user save.
--    Baseline / seed data is shipped in repo as TypeScript; rows in this table
--    are overrides applied on top.
create table if not exists country_profile_drafts (
  country_code text primary key check (length(country_code) = 2),
  /** JSON patch — same shape as `CountryProfile` in src/data/country-profiles/_types.ts */
  patch jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create index if not exists country_profile_drafts_updated_idx
  on country_profile_drafts (updated_at desc);

-- 2. Share-link tokens: invite external contributors to fill in / propose
--    edits on a specific country profile.
create table if not exists country_profile_share_links (
  token text primary key,
  country_code text not null check (length(country_code) = 2),
  /** Optional restriction — array of CountryProfile section keys. NULL = all. */
  sections text[],
  contributor_name text,
  contributor_email text,
  invitation_message text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  expires_at timestamptz,
  revoked boolean not null default false,
  uses integer not null default 0
);

create index if not exists country_profile_share_links_country_idx
  on country_profile_share_links (country_code);
create index if not exists country_profile_share_links_created_idx
  on country_profile_share_links (created_at desc);

-- 3. Submissions queue: every external contributor save AND every main-user
--    edit creates a row here, so we have an audit log / approval queue.
create table if not exists country_profile_submissions (
  id uuid primary key default gen_random_uuid(),
  country_code text not null check (length(country_code) = 2),
  /** "main" or "external". */
  source text not null check (source in ('main','external')),
  contributor_name text not null,
  contributor_email text,
  message text,
  patch jsonb not null,
  submitted_at timestamptz not null default now(),
  state text not null default 'pending' check (state in ('pending','approved','rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  rejection_reason text,
  /** If submitted via share-link, record which token was used. */
  share_link_token text references country_profile_share_links(token) on delete set null
);

create index if not exists country_profile_submissions_country_idx
  on country_profile_submissions (country_code);
create index if not exists country_profile_submissions_state_idx
  on country_profile_submissions (state, submitted_at desc);

-- RLS — all three tables have permissive read for any authenticated user
-- (the profile data is non-confidential), write requires the signed-in user
-- or, for submissions, an authenticated request from the share-link API.

alter table country_profile_drafts enable row level security;
alter table country_profile_share_links enable row level security;
alter table country_profile_submissions enable row level security;

-- Authenticated users can read drafts.
drop policy if exists "drafts_read_auth" on country_profile_drafts;
create policy "drafts_read_auth" on country_profile_drafts
  for select to authenticated using (true);

-- Only the creator (any signed-in user) can write drafts.
drop policy if exists "drafts_write_auth" on country_profile_drafts;
create policy "drafts_write_auth" on country_profile_drafts
  for all to authenticated using (true) with check (true);

drop policy if exists "share_links_read_auth" on country_profile_share_links;
create policy "share_links_read_auth" on country_profile_share_links
  for select to authenticated using (true);

drop policy if exists "share_links_write_auth" on country_profile_share_links;
create policy "share_links_write_auth" on country_profile_share_links
  for all to authenticated using (true) with check (true);

drop policy if exists "submissions_read_auth" on country_profile_submissions;
create policy "submissions_read_auth" on country_profile_submissions
  for select to authenticated using (true);

drop policy if exists "submissions_write_auth" on country_profile_submissions;
create policy "submissions_write_auth" on country_profile_submissions
  for all to authenticated using (true) with check (true);
