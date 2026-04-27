-- ============================================================================
-- 008 — Social media monitoring + ESABCC report clustering
--
-- Adds the infrastructure needed to (a) cluster existing press coverage by
-- the ESABCC report it talks about and (b) track LinkedIn + other social
-- posts the same way. The goal is a single board-member-facing dashboard
-- where each report has a card showing both press and social traction.
-- ============================================================================

alter table public.media_articles
  add column if not exists matched_report_slugs text[] not null default '{}';

create index if not exists idx_media_articles_report_slugs
  on public.media_articles using gin (matched_report_slugs);

alter table public.media_fetch_runs
  add column if not exists channel text not null default 'press';

create index if not exists idx_media_fetch_runs_channel
  on public.media_fetch_runs (channel, started_at desc);

-- media_social_sources: LinkedIn profiles, company pages, hashtags, etc.
create table if not exists public.media_social_sources (
  id               uuid primary key default gen_random_uuid(),
  platform         text not null default 'linkedin',
  handle           text not null,
  source_type      text not null default 'account',
  display_name     text,
  profile_url      text,
  feed_url         text,
  country          text,
  language         text default 'en',
  default_report_slug text,
  is_board_member  boolean not null default false,
  is_active        boolean not null default true,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index if not exists uq_media_social_sources_platform_handle
  on public.media_social_sources (platform, lower(handle));

create index if not exists idx_media_social_sources_active
  on public.media_social_sources (is_active, platform);

alter table public.media_social_sources enable row level security;

drop policy if exists "Social sources are viewable by everyone" on public.media_social_sources;
create policy "Social sources are viewable by everyone"
  on public.media_social_sources for select using (true);

drop policy if exists "Authenticated users can manage social sources" on public.media_social_sources;
create policy "Authenticated users can manage social sources"
  on public.media_social_sources for insert with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update social sources" on public.media_social_sources;
create policy "Authenticated users can update social sources"
  on public.media_social_sources for update using (auth.uid() is not null);

drop policy if exists "Authenticated users can delete social sources" on public.media_social_sources;
create policy "Authenticated users can delete social sources"
  on public.media_social_sources for delete using (auth.uid() is not null);

-- media_social_posts: one row per deduplicated social post
create table if not exists public.media_social_posts (
  id                  uuid primary key default gen_random_uuid(),
  platform            text not null default 'linkedin',
  post_url            text not null unique,
  external_id         text,
  author_handle       text,
  author_name         text,
  author_profile_url  text,
  source_id           uuid references public.media_social_sources(id) on delete set null,
  content             text not null default '',
  excerpt             text,
  language            text,
  country             text,
  posted_at           timestamptz,
  fetched_at          timestamptz not null default now(),
  like_count          int,
  comment_count       int,
  share_count         int,
  impression_count    bigint,
  estimated_reach     bigint not null default 0,
  image_url           text,
  link_url            text,
  sentiment           text,
  sentiment_score     numeric,
  matched_keyword_ids uuid[] not null default '{}',
  matched_keywords    text[] not null default '{}',
  matched_report_slugs text[] not null default '{}',
  raw                 jsonb,
  created_at          timestamptz not null default now()
);

create index if not exists idx_media_social_posts_posted    on public.media_social_posts (posted_at desc);
create index if not exists idx_media_social_posts_platform  on public.media_social_posts (platform, posted_at desc);
create index if not exists idx_media_social_posts_author    on public.media_social_posts (author_handle);
create index if not exists idx_media_social_posts_keywords  on public.media_social_posts using gin (matched_keywords);
create index if not exists idx_media_social_posts_reports   on public.media_social_posts using gin (matched_report_slugs);

alter table public.media_social_posts enable row level security;

drop policy if exists "Social posts are viewable by everyone" on public.media_social_posts;
create policy "Social posts are viewable by everyone"
  on public.media_social_posts for select using (true);
