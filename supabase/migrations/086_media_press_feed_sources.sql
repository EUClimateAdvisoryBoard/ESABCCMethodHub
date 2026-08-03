-- ---------------------------------------------------------------------------
-- Migration 086: Press feed sources (RSS / Google Alerts / Talkwalker Alerts)
--
-- Until now the press channel had exactly one source: Google News RSS search
-- URLs generated from `media_keywords`. That is a single point of failure —
-- Google News rate-limits aggressively, and a change to its feed format
-- silently zeroed the whole dashboard.
--
-- This adds a registry of standing feed URLs that are polled on every press
-- run alongside Google News:
--
--   * 'google_alert'    — the RSS output of a Google Alert
--   * 'talkwalker_alert'— the RSS output of a Talkwalker Alert
--   * 'rss'             — any other RSS/Atom feed (outlet feeds, EU
--                         institution newsrooms, NGO feeds, ...)
--
-- Neither Google Alerts nor Talkwalker Alerts expose an API for *creating*
-- alerts, so each alert is set up once by hand in the respective web UI and
-- its feed URL is registered here. Keyword *matching* stays fully automatic:
-- every item pulled from these feeds is matched against the current
-- `media_keywords` rows at fetch time, so adding a keyword in the Method Hub
-- immediately applies to incoming feed items without touching the alerts.
--
-- `alert_query` stores the query string the alert was created with, so the
-- dashboard can show which keywords are already covered by a standing alert
-- and which are not.
-- ---------------------------------------------------------------------------

create table if not exists public.media_press_sources (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  source_type    text not null default 'rss',
  feed_url       text not null,
  -- The query the alert was created with (Google Alerts / Talkwalker only).
  -- Free text: it mirrors what was typed into the provider's UI.
  alert_query    text,
  -- Optional provenance hints applied to articles from this feed when the
  -- item itself carries none.
  country        text,
  language       text default 'en',
  default_report_slug text,
  is_active      boolean not null default true,
  notes          text,
  -- Per-source health, refreshed on every fetch run so a quietly dead feed
  -- is visible in the dashboard instead of just contributing zero articles.
  last_fetched_at timestamptz,
  last_status     text,
  last_error      text,
  last_item_count int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- One row per feed URL. Re-registering the same alert is a no-op rather than
-- a duplicate that doubles every article's fetch cost.
create unique index if not exists uq_media_press_sources_feed_url
  on public.media_press_sources (lower(feed_url));

create index if not exists idx_media_press_sources_active
  on public.media_press_sources (is_active, source_type);

alter table public.media_press_sources enable row level security;

drop policy if exists "Press sources are viewable by everyone" on public.media_press_sources;
create policy "Press sources are viewable by everyone"
  on public.media_press_sources for select using (true);

drop policy if exists "Authenticated users can insert press sources" on public.media_press_sources;
create policy "Authenticated users can insert press sources"
  on public.media_press_sources for insert with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update press sources" on public.media_press_sources;
create policy "Authenticated users can update press sources"
  on public.media_press_sources for update using (auth.uid() is not null);

drop policy if exists "Authenticated users can delete press sources" on public.media_press_sources;
create policy "Authenticated users can delete press sources"
  on public.media_press_sources for delete using (auth.uid() is not null);

-- ═══════════════════════════════════════════════════════════════════════════
-- Article provenance
-- ═══════════════════════════════════════════════════════════════════════════

-- Which channel an article arrived through, so the dashboard can show (and
-- filter by) whether coverage came from Google News, a standing alert, or a
-- plain RSS feed. Existing rows all came from Google News.
alter table public.media_articles
  add column if not exists discovery_source text not null default 'google_news';

alter table public.media_articles
  add column if not exists press_source_id uuid
    references public.media_press_sources(id) on delete set null;

create index if not exists idx_media_articles_discovery
  on public.media_articles (discovery_source);

-- ═══════════════════════════════════════════════════════════════════════════
-- Fetch-run diagnostics
-- ═══════════════════════════════════════════════════════════════════════════

-- A run that finds nothing because every item was filtered out used to look
-- exactly like a run where the upstream returned nothing. Persist the split
-- so a zero-article run is explainable from the run log alone.
alter table public.media_fetch_runs
  add column if not exists sources_count int not null default 0;

alter table public.media_fetch_runs
  add column if not exists items_seen int not null default 0;

alter table public.media_fetch_runs
  add column if not exists diagnostics jsonb;
