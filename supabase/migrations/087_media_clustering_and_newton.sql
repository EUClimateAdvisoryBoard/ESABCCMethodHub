-- ---------------------------------------------------------------------------
-- Migration 087: Newton Media imports + clustering by report / member / country
--
-- Completes the coverage pool. Feed coverage (migration 086) reaches what is
-- openly syndicated; the weekly Newton Media export covers print, broadcast
-- and paywalled outlets that no feed reaches. Both land in `media_articles`,
-- distinguished only by `discovery_source`, so every dashboard lens spans the
-- whole pool.
--
-- The Reports / Members / Countries sections are lenses over that one pool,
-- driven by the columns added here and refreshed by a scheduled clustering
-- pass rather than at ingest time — report match-terms and the board roster
-- change, and when they do the whole pool needs re-clustering.
-- ---------------------------------------------------------------------------

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Clustering + Newton provenance on media_articles
-- ═══════════════════════════════════════════════════════════════════════════

-- Board members mentioned. `matched_report_slugs` already exists (migration
-- 008); this is its per-member counterpart.
alter table public.media_articles
  add column if not exists matched_member_slugs text[] not null default '{}';

-- Newton's stable per-article identifier, so re-importing an overlapping
-- weekly export updates rather than duplicates.
alter table public.media_articles
  add column if not exists article_code text;

-- Online / Print / TV / Radio. Feed coverage is always online; the Newton
-- export is the only source of offline coverage, and reporting on print vs
-- online reach is one of the reasons the export is bought.
alter table public.media_articles
  add column if not exists media_type text;

-- Newton's advertising-value equivalent.
alter table public.media_articles
  add column if not exists ave numeric;

-- When clustering last ran for this row, so a re-cluster pass can skip rows
-- already processed under the current ruleset.
alter table public.media_articles
  add column if not exists clustered_at timestamptz;

create index if not exists idx_media_articles_members
  on public.media_articles using gin (matched_member_slugs);

create index if not exists idx_media_articles_reports
  on public.media_articles using gin (matched_report_slugs);

create index if not exists idx_media_articles_clustered
  on public.media_articles (clustered_at nulls first);

-- Newton exports can repeat an article across weekly files; the code is the
-- stable identity. Partial so the many feed-sourced rows (which have no code)
-- are exempt from the constraint.
create unique index if not exists uq_media_articles_article_code
  on public.media_articles (article_code)
  where article_code is not null;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Import audit
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.media_imports (
  id             uuid primary key default gen_random_uuid(),
  filename       text not null,
  source         text not null default 'newton',
  status         text not null default 'success',
  rows_total     int not null default 0,
  rows_imported  int not null default 0,
  rows_new       int not null default 0,
  rows_skipped   int not null default 0,
  -- Skipped-row reasons and the header list, so a change to Newton's export
  -- format shows up as a diagnosable record rather than a short import.
  diagnostics    jsonb,
  error_message  text,
  imported_by    uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists idx_media_imports_created
  on public.media_imports (created_at desc);

alter table public.media_imports enable row level security;

drop policy if exists "Media imports are viewable by everyone" on public.media_imports;
create policy "Media imports are viewable by everyone"
  on public.media_imports for select using (true);

drop policy if exists "Authenticated users can record imports" on public.media_imports;
create policy "Authenticated users can record imports"
  on public.media_imports for insert with check (auth.uid() is not null);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Backfill
-- ═══════════════════════════════════════════════════════════════════════════

-- Existing rows predate clustering. Leaving `clustered_at` null makes them
-- the first batch the clustering pass picks up.
update public.media_articles
  set clustered_at = null
  where clustered_at is not null
    and matched_member_slugs = '{}';
