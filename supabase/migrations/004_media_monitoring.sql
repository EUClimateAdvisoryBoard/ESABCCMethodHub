-- ============================================================================
-- 004 — Media Monitoring
--
-- Backend for the Media Monitoring module. Users define keyword queries
-- (e.g. "ESABCC", "European Scientific Advisory Board on Climate Change")
-- and a scheduled fetcher pulls matching articles from Google News RSS and
-- other sources into `media_articles`. The dashboard reads from these
-- tables to render coverage analytics, readership-weighted impact, and a
-- map of outlet locations.
-- ============================================================================

create table if not exists public.media_keywords (
  id            uuid primary key default gen_random_uuid(),
  keyword       text not null,
  label         text,
  category      text not null default 'general',
  language      text not null default 'en',
  country       text not null default 'any',
  is_active     boolean not null default true,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists uq_media_keywords_query
  on public.media_keywords (lower(keyword), language, country);

create index if not exists idx_media_keywords_active
  on public.media_keywords (is_active, category);

alter table public.media_keywords enable row level security;

drop policy if exists "Media keywords are viewable by everyone" on public.media_keywords;
create policy "Media keywords are viewable by everyone"
  on public.media_keywords for select using (true);

drop policy if exists "Authenticated users can create media keywords" on public.media_keywords;
create policy "Authenticated users can create media keywords"
  on public.media_keywords for insert with check (auth.uid() is not null);

drop policy if exists "Authors can update their media keywords" on public.media_keywords;
create policy "Authors can update their media keywords"
  on public.media_keywords for update using (auth.uid() = created_by or created_by is null);

drop policy if exists "Authors can delete their media keywords" on public.media_keywords;
create policy "Authors can delete their media keywords"
  on public.media_keywords for delete using (auth.uid() = created_by or created_by is null);

create table if not exists public.media_outlets (
  id                  uuid primary key default gen_random_uuid(),
  domain              text not null unique,
  name                text not null,
  country             text,
  country_name        text,
  tier                text not null default 'regional',
  language            text,
  estimated_readership bigint not null default 0,
  reach_score         numeric not null default 1.0,
  latitude            numeric,
  longitude           numeric,
  logo_url            text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_media_outlets_country on public.media_outlets (country);
create index if not exists idx_media_outlets_tier    on public.media_outlets (tier);

alter table public.media_outlets enable row level security;

drop policy if exists "Media outlets are viewable by everyone" on public.media_outlets;
create policy "Media outlets are viewable by everyone"
  on public.media_outlets for select using (true);

create table if not exists public.media_articles (
  id                  uuid primary key default gen_random_uuid(),
  url                 text not null unique,
  canonical_url       text,
  title               text not null,
  summary             text not null default '',
  full_text           text,
  source_name         text not null default '',
  outlet_id           uuid references public.media_outlets(id) on delete set null,
  outlet_domain       text,
  published_at        timestamptz,
  fetched_at          timestamptz not null default now(),
  language            text,
  country             text,
  author              text,
  image_url           text,
  sentiment           text,
  sentiment_score     numeric,
  estimated_reach     bigint not null default 0,
  matched_keyword_ids uuid[] not null default '{}',
  matched_keywords    text[] not null default '{}',
  created_at          timestamptz not null default now()
);

create index if not exists idx_media_articles_published on public.media_articles (published_at desc);
create index if not exists idx_media_articles_outlet    on public.media_articles (outlet_id);
create index if not exists idx_media_articles_country   on public.media_articles (country);
create index if not exists idx_media_articles_keywords  on public.media_articles using gin (matched_keyword_ids);
create index if not exists idx_media_articles_kw_text   on public.media_articles using gin (matched_keywords);

alter table public.media_articles enable row level security;

drop policy if exists "Media articles are viewable by everyone" on public.media_articles;
create policy "Media articles are viewable by everyone"
  on public.media_articles for select using (true);

create table if not exists public.media_fetch_runs (
  id              uuid primary key default gen_random_uuid(),
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  status          text not null default 'running',
  trigger         text not null default 'manual',
  keywords_count  int not null default 0,
  articles_found  int not null default 0,
  articles_new    int not null default 0,
  error_message   text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_media_fetch_runs_started on public.media_fetch_runs (started_at desc);

alter table public.media_fetch_runs enable row level security;

drop policy if exists "Media fetch runs are viewable by everyone" on public.media_fetch_runs;
create policy "Media fetch runs are viewable by everyone"
  on public.media_fetch_runs for select using (true);

-- Seed data (ESABCC-focused keyword set) lives in migration 005, which
-- expanded the original seed with dozens of additional queries. Keeping
-- it out of this file lets IT re-run this migration without re-seeding.
