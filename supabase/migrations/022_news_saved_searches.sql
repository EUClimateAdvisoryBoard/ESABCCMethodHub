-- 022_news_saved_searches.sql
--
-- Persistent keyword / topic searches for the Secretariat News module.
--
-- Today users scroll the live feed every morning hoping to spot the
-- two or three stories that matter to them. A saved search reverses
-- that: declare the criterion once, then check a counter ("3 new") to
-- see whether anything has landed since you last looked.
--
-- The matching itself is performed at read time against `live-news`
-- and the curated `newsfeed.ts` baseline (no full-text index yet —
-- the feed is small enough that simple substring + tag match is
-- adequate).
--
-- Idempotent: safe to re-run.

create extension if not exists "pgcrypto";

create table if not exists public.news_saved_searches (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  name          text        not null,
  -- Free-text query, case-insensitive. Empty string means "match all".
  query         text        not null default '',
  -- Source filter (subset of SOURCE_OPTIONS keys); empty array = all.
  sources       jsonb       not null default '[]'::jsonb,
  -- Tag filter (lowercase tag list); empty array = all.
  tags          jsonb       not null default '[]'::jsonb,
  -- When true, a future cron job will email the owner about new matches.
  -- Until that job ships, this is just a UI toggle persisted alongside.
  notify        boolean     not null default false,
  -- Bookmark for "what's new since" computations and for the future
  -- email cron; advanced when the user explicitly clicks "Run".
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_news_saved_searches_user
  on public.news_saved_searches (user_id, updated_at desc);

alter table public.news_saved_searches enable row level security;

-- Saved searches are private to the user that created them.
drop policy if exists "Users read their own saved searches"
  on public.news_saved_searches;
create policy "Users read their own saved searches"
  on public.news_saved_searches for select using (user_id = auth.uid());

drop policy if exists "Users insert their own saved searches"
  on public.news_saved_searches;
create policy "Users insert their own saved searches"
  on public.news_saved_searches for insert
  with check (user_id = auth.uid());

drop policy if exists "Users update their own saved searches"
  on public.news_saved_searches;
create policy "Users update their own saved searches"
  on public.news_saved_searches for update using (user_id = auth.uid());

drop policy if exists "Users delete their own saved searches"
  on public.news_saved_searches;
create policy "Users delete their own saved searches"
  on public.news_saved_searches for delete using (user_id = auth.uid());
