-- ============================================================================
-- EU Climate Policy Navigator — Supabase schema
-- Run this in the Supabase SQL Editor to set up the database.
-- ============================================================================

-- 1. Profiles (auto-created on signup via trigger)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text default '',
  bio text default '',
  role text not null default 'user', -- 'admin' or 'user'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
  ) then
    alter table public.profiles add column role text not null default 'user';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'updated_at'
  ) then
    alter table public.profiles add column updated_at timestamptz default now();
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'avatar_url'
  ) then
    alter table public.profiles add column avatar_url text default '';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'bio'
  ) then
    alter table public.profiles add column bio text default '';
  end if;
end $$;

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select using (auth.uid() is not null);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles"
  on public.profiles for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Auto-create profile on signup. GDPR: never derive the display name from
-- the email local-part. Admin role is assigned only to addresses listed
-- in the `app.admin_emails` Postgres GUC, set out-of-band by IT.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  raw_setting text;
  email_list text[];
  new_role text := 'user';
begin
  raw_setting := current_setting('app.admin_emails', true);
  if raw_setting is not null and btrim(raw_setting) <> '' then
    email_list := array(
      select btrim(e)
        from unnest(string_to_array(lower(raw_setting), ',')) as e
       where btrim(e) <> ''
    );
    if lower(new.email) = any(email_list) then
      new_role := 'admin';
    end if;
  end if;

  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', 'Anonymous user'),
    new_role
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  begin
    new.updated_at = now();
  exception when undefined_column then
    -- column doesn't exist yet, skip silently
  end;
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_profiles_updated on public.profiles;
create trigger on_profiles_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- 2. Annotations
create table if not exists public.annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  policy_id text not null,
  tag text not null,
  text_excerpt text not null,
  char_start int not null,
  char_end int not null,
  note text default '',
  created_at timestamptz default now()
);
alter table public.annotations enable row level security;
drop policy if exists "Annotations are viewable by everyone" on public.annotations;
drop policy if exists "Annotations are viewable by authenticated users" on public.annotations;
create policy "Annotations are viewable by authenticated users"
  on public.annotations for select using (auth.uid() is not null);
drop policy if exists "Users can insert own annotations" on public.annotations;
create policy "Users can insert own annotations"
  on public.annotations for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own annotations" on public.annotations;
create policy "Users can update own annotations"
  on public.annotations for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own annotations" on public.annotations;
create policy "Users can delete own annotations"
  on public.annotations for delete using (auth.uid() = user_id);
create index if not exists idx_annotations_policy on public.annotations(policy_id);
create index if not exists idx_annotations_user on public.annotations(user_id);

-- 3. Custom tags (shared across all users)
create table if not exists public.custom_tags (
  name text primary key,
  color text not null,
  description text default '',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table public.custom_tags enable row level security;
drop policy if exists "Custom tags are viewable by everyone" on public.custom_tags;
drop policy if exists "Custom tags are viewable by authenticated users" on public.custom_tags;
create policy "Custom tags are viewable by authenticated users"
  on public.custom_tags for select using (auth.uid() is not null);
drop policy if exists "Authenticated users can create tags" on public.custom_tags;
create policy "Authenticated users can create tags"
  on public.custom_tags for insert with check (auth.uid() is not null);

-- 4. Comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  policy_id text not null,
  parent_id uuid references public.comments(id) on delete cascade,
  text text not null,
  char_start int,
  char_end int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.comments enable row level security;
drop policy if exists "Comments are viewable by everyone" on public.comments;
drop policy if exists "Comments are viewable by authenticated users" on public.comments;
create policy "Comments are viewable by authenticated users"
  on public.comments for select using (auth.uid() is not null);
drop policy if exists "Users can insert own comments" on public.comments;
create policy "Users can insert own comments"
  on public.comments for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own comments" on public.comments;
create policy "Users can update own comments"
  on public.comments for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own comments" on public.comments;
create policy "Users can delete own comments"
  on public.comments for delete using (auth.uid() = user_id);
create index if not exists idx_comments_policy on public.comments(policy_id);
create index if not exists idx_comments_parent on public.comments(parent_id);

-- 5. Activity log
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  policy_id text,
  target_id uuid,
  summary text not null,
  created_at timestamptz default now()
);
alter table public.activity_log enable row level security;
drop policy if exists "Activity log is viewable by everyone" on public.activity_log;
drop policy if exists "Activity log is viewable by self" on public.activity_log;
drop policy if exists "Activity log is viewable by admins" on public.activity_log;
create policy "Activity log is viewable by self"
  on public.activity_log for select using (auth.uid() = user_id);
create policy "Activity log is viewable by admins"
  on public.activity_log for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
drop policy if exists "Users can insert own activity" on public.activity_log;
create policy "Users can insert own activity"
  on public.activity_log for insert with check (auth.uid() = user_id);
create index if not exists idx_activity_policy on public.activity_log(policy_id);
create index if not exists idx_activity_created on public.activity_log(created_at desc);

-- 6. Personal reading lists (per-user, private)
create table if not exists public.personal_reading_list (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  authors text default '',
  url text default '',
  doi text default '',
  kind text not null default 'paper',
  priority text not null default 'important',
  notes text default '',
  source_type text default 'manual',
  source_id text,
  read boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.personal_reading_list enable row level security;
drop policy if exists "Users can view own personal reading list" on public.personal_reading_list;
create policy "Users can view own personal reading list"
  on public.personal_reading_list for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own personal reading list" on public.personal_reading_list;
create policy "Users can insert own personal reading list"
  on public.personal_reading_list for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own personal reading list" on public.personal_reading_list;
create policy "Users can update own personal reading list"
  on public.personal_reading_list for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own personal reading list" on public.personal_reading_list;
create policy "Users can delete own personal reading list"
  on public.personal_reading_list for delete using (auth.uid() = user_id);
create index if not exists idx_personal_rl_user on public.personal_reading_list(user_id);

-- 7. Shared ESABCC reading list
create table if not exists public.shared_reading_list (
  id uuid primary key default gen_random_uuid(),
  added_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  authors text default '',
  url text default '',
  doi text default '',
  kind text not null default 'paper',
  priority text not null default 'important',
  notes text default '',
  source_type text default 'manual',
  source_id text,
  created_at timestamptz default now()
);
alter table public.shared_reading_list enable row level security;
drop policy if exists "Shared reading list is viewable by everyone" on public.shared_reading_list;
drop policy if exists "Shared reading list is viewable by authenticated users" on public.shared_reading_list;
create policy "Shared reading list is viewable by authenticated users"
  on public.shared_reading_list for select using (auth.uid() is not null);
drop policy if exists "Authenticated users can add to shared reading list" on public.shared_reading_list;
create policy "Authenticated users can add to shared reading list"
  on public.shared_reading_list for insert with check (auth.uid() = added_by);
drop policy if exists "Users can delete own shared reading list items" on public.shared_reading_list;
create policy "Users can delete own shared reading list items"
  on public.shared_reading_list for delete using (auth.uid() = added_by);
create index if not exists idx_shared_rl_created on public.shared_reading_list(created_at desc);

-- 8. Upvotes on shared reading list items
create table if not exists public.reading_list_upvotes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.shared_reading_list(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(item_id, user_id)
);
alter table public.reading_list_upvotes enable row level security;
drop policy if exists "Upvotes are viewable by everyone" on public.reading_list_upvotes;
drop policy if exists "Upvotes are viewable by authenticated users" on public.reading_list_upvotes;
create policy "Upvotes are viewable by authenticated users"
  on public.reading_list_upvotes for select using (auth.uid() is not null);
drop policy if exists "Authenticated users can upvote" on public.reading_list_upvotes;
create policy "Authenticated users can upvote"
  on public.reading_list_upvotes for insert with check (auth.uid() = user_id);
drop policy if exists "Users can remove own upvotes" on public.reading_list_upvotes;
create policy "Users can remove own upvotes"
  on public.reading_list_upvotes for delete using (auth.uid() = user_id);
create index if not exists idx_upvotes_item on public.reading_list_upvotes(item_id);
create index if not exists idx_upvotes_user on public.reading_list_upvotes(user_id);

-- ============================================================================
-- Admin bootstrapping
--
-- Admin promotion is no longer hard-coded to a personal email. Set the
-- Postgres GUC `app.admin_emails` (comma-separated, lowercase) on the
-- database and run `select public.grant_admin_from_setting();` once the
-- admin user has signed up. See 011_gdpr_admin_email_unhardcode.sql.
-- ============================================================================

-- ============================================================================
-- Voting Tool (M·06)
--
-- Three tables that back `/voting` (admin) and `/vote/<token>` (public ballot).
-- See `supabase/migrations/029_voting_tool.sql` for the rationale.
--
-- All three are RLS-locked with NO permissive policies: the server reaches
-- them via the service-role key (bypasses RLS); the anon/authenticated
-- browser roles cannot read or write. Token strings stay server-side only.
-- ============================================================================

create table if not exists public.votes (
  id text primary key,
  title text not null,
  description text,
  instructions text,
  voting_system text not null
    check (voting_system in ('priority_ranking','single_choice','multi_choice','approval','star')),
  config jsonb not null default '{}'::jsonb,
  options jsonb not null,
  is_anonymous boolean not null default true,
  status text not null default 'open'
    check (status in ('draft','open','closed')),
  closes_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vote_tokens (
  token text primary key,
  vote_id text not null references public.votes(id) on delete cascade,
  label text,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_vote_tokens_vote on public.vote_tokens(vote_id);

create table if not exists public.ballots (
  id text primary key,
  vote_id text not null references public.votes(id) on delete cascade,
  responses jsonb not null,
  token_id text references public.vote_tokens(token) on delete set null,
  token_fingerprint text not null,
  submitted_at timestamptz not null default now()
);
create index if not exists idx_ballots_vote on public.ballots(vote_id);

-- Shared (universal) tokens: see 030_voting_shared_tokens.sql.
alter table public.vote_tokens
  add column if not exists max_uses int default 1,
  add column if not exists use_count int not null default 0;
-- The fingerprint unique index from migration 029 is dropped here because
-- a shared token legitimately yields many ballots with the same fingerprint;
-- single-use is now enforced by the atomic `use_count < max_uses` update.
drop index if exists public.ux_ballots_vote_fingerprint;

create or replace function public.touch_votes_updated_at()
returns trigger as $$
begin new.updated_at := now(); return new; end;
$$ language plpgsql;
drop trigger if exists trg_votes_updated_at on public.votes;
create trigger trg_votes_updated_at
  before update on public.votes
  for each row execute procedure public.touch_votes_updated_at();

alter table public.votes        enable row level security;
alter table public.vote_tokens  enable row level security;
alter table public.ballots      enable row level security;

-- Drop any leftover policies; we ship none.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and tablename in ('votes','vote_tokens','ballots')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Seed: ABmeeting38 Topical Vote — 12 topics, scores 1/2/3, caps 3/3/none.
-- Idempotent via ON CONFLICT DO NOTHING so re-running the schema is safe.
insert into public.votes (
  id, title, description, instructions, voting_system, config, options,
  is_anonymous, status, created_by
) values (
  'abmeeting38-topical-vote',
  'ABmeeting38 Topical Vote',
  'Help the Secretariat shortlist topics for further discussion at AB meeting 38. Your responses are anonymous; only aggregate results are shared with the Secretariat.',
  E'Assign a priority score to each topic:\n\n  1 = highest priority   (give to a maximum of three topics)\n  2 = medium priority    (give to a maximum of three topics)\n  3 = lowest priority    (give to all the rest)\n\nEvery topic must receive a score before you submit. You can change your mind freely until you press Submit; once submitted, the ballot is final and the link cannot be reused.',
  'priority_ranking',
  '{"scores":[1,2,3],"maxPerScore":{"1":3,"2":3,"3":null},"scoreLabels":{"1":"highest priority","2":"medium priority","3":"lowest priority"},"requireAllScored":true}'::jsonb,
  '[
    {"id":"policy-gap-report-2-0","label":"Policy gap report 2.0"},
    {"id":"industry-transitions","label":"Industry transitions"},
    {"id":"climate-diplomacy-and-international-credits","label":"Climate diplomacy and international credits"},
    {"id":"limits-to-adaptation","label":"Limits to adaptation"},
    {"id":"climate-security","label":"Climate security"},
    {"id":"land-sink-and-biomass","label":"Land sink and biomass"},
    {"id":"ets-review","label":"ETS review"},
    {"id":"overshoot-in-eu-policy","label":"Overshoot in EU policy"},
    {"id":"energy-and-security","label":"Energy and security"},
    {"id":"post-2030-flexibilities","label":"Post 2030 flexibilities"},
    {"id":"mis-and-disinformation","label":"Mis and disinformation"},
    {"id":"solar-radiation-management","label":"Solar radiation management"}
  ]'::jsonb,
  true,
  'open',
  'secretariat'
) on conflict (id) do nothing;
