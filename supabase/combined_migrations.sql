-- ============================================================================
-- COMBINED MIGRATIONS (001 -> 052)
-- Auto-generated from supabase/migrations/*.sql for one-shot SQL Editor runs.
-- Wrap is intentionally absent: each source migration is idempotent
-- (CREATE ... IF NOT EXISTS / DROP ... IF EXISTS), so re-running is safe.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 001_reference_manager_tables.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- Reference Manager — Supabase schema extension
-- Adds literature/citation management tables to the EU Climate Policy Navigator
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.libraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.libraries ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.library_members (
  library_id UUID REFERENCES public.libraries(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('viewer', 'editor', 'admin')) DEFAULT 'viewer',
  PRIMARY KEY (library_id, user_id)
);

ALTER TABLE public.library_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own libraries" ON public.libraries;
CREATE POLICY "Users can view own libraries"
  ON public.libraries FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id IN (SELECT library_id FROM public.library_members WHERE user_id = auth.uid())
    OR is_shared = true
  );

DROP POLICY IF EXISTS "Authenticated users can create libraries" ON public.libraries;
CREATE POLICY "Authenticated users can create libraries"
  ON public.libraries FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Owners can update libraries" ON public.libraries;
CREATE POLICY "Owners can update libraries"
  ON public.libraries FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can delete libraries" ON public.libraries;
CREATE POLICY "Owners can delete libraries"
  ON public.libraries FOR DELETE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Members can view membership" ON public.library_members;
CREATE POLICY "Members can view membership"
  ON public.library_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Library owners/admins can manage members" ON public.library_members;
CREATE POLICY "Library owners/admins can manage members"
  ON public.library_members FOR INSERT
  WITH CHECK (
    library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid())
    OR library_id IN (
      SELECT library_id FROM public.library_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Library owners/admins can update members" ON public.library_members;
CREATE POLICY "Library owners/admins can update members"
  ON public.library_members FOR UPDATE
  USING (
    library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid())
    OR library_id IN (
      SELECT library_id FROM public.library_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Library owners/admins can remove members" ON public.library_members;
CREATE POLICY "Library owners/admins can remove members"
  ON public.library_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID REFERENCES public.libraries(id) ON DELETE CASCADE,
  csl_json JSONB NOT NULL,
  item_type TEXT NOT NULL,
  title TEXT NOT NULL,
  authors JSONB,
  year INTEGER,
  doi TEXT,
  abstract TEXT,
  container_title TEXT,
  citation_key TEXT,
  tags TEXT[],
  notes TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  fts TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(abstract, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(container_title, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(notes, '')), 'D')
  ) STORED
);

CREATE INDEX IF NOT EXISTS references_fts_idx ON public.references USING gin(fts);
CREATE UNIQUE INDEX IF NOT EXISTS references_citation_key_idx ON public.references(library_id, citation_key);
CREATE INDEX IF NOT EXISTS references_library_idx ON public.references(library_id);
CREATE INDEX IF NOT EXISTS references_doi_idx ON public.references(doi);
CREATE INDEX IF NOT EXISTS references_year_idx ON public.references(year);

ALTER TABLE public.references ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_references" ON public.references;
CREATE POLICY "read_references" ON public.references FOR SELECT
  USING (
    library_id IN (SELECT library_id FROM public.library_members WHERE user_id = auth.uid())
    OR library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid())
    OR library_id IN (SELECT id FROM public.libraries WHERE is_shared = true)
  );

DROP POLICY IF EXISTS "write_references" ON public.references;
CREATE POLICY "write_references" ON public.references FOR INSERT
  WITH CHECK (
    library_id IN (SELECT library_id FROM public.library_members WHERE user_id = auth.uid() AND role IN ('editor', 'admin'))
    OR library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_references" ON public.references;
CREATE POLICY "update_references" ON public.references FOR UPDATE
  USING (
    library_id IN (SELECT library_id FROM public.library_members WHERE user_id = auth.uid() AND role IN ('editor', 'admin'))
    OR library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_references" ON public.references;
CREATE POLICY "delete_references" ON public.references FOR DELETE
  USING (
    library_id IN (SELECT library_id FROM public.library_members WHERE user_id = auth.uid() AND role IN ('editor', 'admin'))
    OR library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.update_references_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS references_updated_at ON public.references;
CREATE TRIGGER references_updated_at
  BEFORE UPDATE ON public.references
  FOR EACH ROW EXECUTE FUNCTION public.update_references_updated_at();

CREATE TABLE IF NOT EXISTS public.csl_styles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  xml TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.csl_styles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CSL styles are viewable by everyone" ON public.csl_styles;
CREATE POLICY "CSL styles are viewable by everyone"
  ON public.csl_styles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can add styles" ON public.csl_styles;
CREATE POLICY "Authenticated users can add styles"
  ON public.csl_styles FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- ----------------------------------------------------------------------------
-- 002_inbound_emails.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 002 — Inbound emails store
--
-- Persistent backend for the Secretariat News Feed. Every forwarded newsletter
-- (via the Pipedream webhook → /api/inbound-email) is written here so that the
-- feed survives cold starts, redeployments, and is the permanent basis for the
-- monthly Brussels Bulletin.
-- ============================================================================

create table if not exists public.inbound_emails (
  id                text primary key,
  title             text not null,
  summary           text not null default '',
  full_text         text not null default '',
  ai_summary        text,
  detailed_analysis text,
  is_daily_special  boolean not null default false,
  special_kind      text,
  source            text not null default 'email_news_in',
  source_label      text not null default 'Email News-In',
  from_display      text not null default '',
  url               text not null default '#',
  published_date    timestamptz not null default now(),
  received_date     timestamptz not null default now(),
  tags              text[] not null default '{}',
  is_external       boolean not null default true,
  type              text not null default 'newsletter',
  created_at        timestamptz not null default now()
);

alter table public.inbound_emails
  add column if not exists detailed_analysis text,
  add column if not exists is_daily_special  boolean not null default false,
  add column if not exists special_kind      text;

create index if not exists idx_inbound_emails_received   on public.inbound_emails (received_date desc);
create index if not exists idx_inbound_emails_published  on public.inbound_emails (published_date desc);
create index if not exists idx_inbound_emails_daily_special
  on public.inbound_emails (is_daily_special, received_date desc);

alter table public.inbound_emails enable row level security;

drop policy if exists "Inbound emails are viewable by everyone" on public.inbound_emails;
drop policy if exists "Inbound emails are viewable by authenticated users" on public.inbound_emails;
DROP POLICY IF EXISTS "Inbound emails are viewable by authenticated users" ON public.inbound_emails;
create policy "Inbound emails are viewable by authenticated users"
  on public.inbound_emails for select using (auth.uid() is not null);


-- ----------------------------------------------------------------------------
-- 003_scenario_submissions.sql
-- ----------------------------------------------------------------------------

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
DROP POLICY IF EXISTS "Scenario submissions are viewable by everyone" ON public.scenario_submissions;
create policy "Scenario submissions are viewable by everyone"
  on public.scenario_submissions for select using (true);

drop policy if exists "Anyone can submit scenario data" on public.scenario_submissions;
DROP POLICY IF EXISTS "Anyone can submit scenario data" ON public.scenario_submissions;
create policy "Anyone can submit scenario data"
  on public.scenario_submissions for insert with check (true);

-- Storage bucket for the uploaded files themselves.
insert into storage.buckets (id, name, public)
  values ('scenario-submissions', 'scenario-submissions', true)
  on conflict (id) do nothing;

drop policy if exists "Scenario submissions bucket public read" on storage.objects;
DROP POLICY IF EXISTS "Scenario submissions bucket public read" ON storage.objects;
create policy "Scenario submissions bucket public read"
  on storage.objects for select
  using (bucket_id = 'scenario-submissions');

drop policy if exists "Scenario submissions bucket public write" on storage.objects;
DROP POLICY IF EXISTS "Scenario submissions bucket public write" ON storage.objects;
create policy "Scenario submissions bucket public write"
  on storage.objects for insert
  with check (bucket_id = 'scenario-submissions');


-- ----------------------------------------------------------------------------
-- 004_media_monitoring.sql
-- ----------------------------------------------------------------------------

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
DROP POLICY IF EXISTS "Media keywords are viewable by everyone" ON public.media_keywords;
create policy "Media keywords are viewable by everyone"
  on public.media_keywords for select using (true);

drop policy if exists "Authenticated users can create media keywords" on public.media_keywords;
DROP POLICY IF EXISTS "Authenticated users can create media keywords" ON public.media_keywords;
create policy "Authenticated users can create media keywords"
  on public.media_keywords for insert with check (auth.uid() is not null);

drop policy if exists "Authors can update their media keywords" on public.media_keywords;
DROP POLICY IF EXISTS "Authors can update their media keywords" ON public.media_keywords;
create policy "Authors can update their media keywords"
  on public.media_keywords for update using (auth.uid() = created_by or created_by is null);

drop policy if exists "Authors can delete their media keywords" on public.media_keywords;
DROP POLICY IF EXISTS "Authors can delete their media keywords" ON public.media_keywords;
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
DROP POLICY IF EXISTS "Media outlets are viewable by everyone" ON public.media_outlets;
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
DROP POLICY IF EXISTS "Media articles are viewable by everyone" ON public.media_articles;
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
DROP POLICY IF EXISTS "Media fetch runs are viewable by everyone" ON public.media_fetch_runs;
create policy "Media fetch runs are viewable by everyone"
  on public.media_fetch_runs for select using (true);

-- Seed data (ESABCC-focused keyword set) lives in migration 005, which
-- expanded the original seed with dozens of additional queries. Keeping
-- it out of this file lets IT re-run this migration without re-seeding.


-- ----------------------------------------------------------------------------
-- 005_expand_media_keywords.sql
-- ----------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Migration 005: Expand media monitoring keywords
--
-- Problems addressed:
--   1. Only 7 articles found in 12 months — far too few given two major
--      ESABCC reports and significant press coverage.
--   2. Missing multilingual keywords (DE, FR, ES, IT, NL) — most European
--      outlets publish in their national language.
--   3. No report-specific keywords to capture coverage of ESABCC publications.
--   4. No policy-context keywords that catch articles mentioning the board
--      alongside EU climate legislation.
--   5. New tag categories needed: board_quote (individual board member
--      citation), institution_quote (ESABCC as institution), report
--      (coverage of specific publications).
--   6. Remove Ottmar Edenhofer "ESABCC chair" designation (not confirmed).
--
-- All inserts use ON CONFLICT DO NOTHING so re-running is safe.
-- ---------------------------------------------------------------------------

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Remove / update Ottmar Edenhofer chair designation
-- ═══════════════════════════════════════════════════════════════════════════

-- Update the label if it says "ESABCC chair" (set in live DB)
update public.media_keywords
  set label = 'TU Berlin / PIK',
      category = 'person',
      updated_at = now()
  where lower(keyword) = 'ottmar edenhofer'
    and (label ilike '%chair%' or label ilike '%ESABCC chair%');

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. ESABCC institutional keywords — broader variations (EN)
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.media_keywords (keyword, label, category, language, country) values
  -- Broader English variations
  ('EU climate board',                                    'EU climate board',              'institution_quote', 'en', 'any'),
  ('EU climate science advisory',                         'EU science advisory',           'institution_quote', 'en', 'any'),
  ('EU scientific advisory board climate',                'Advisory board ref',            'institution_quote', 'en', 'any'),
  ('European climate advisory',                           'European climate advisory',     'institution_quote', 'en', 'any'),
  ('climate advisory board Europe',                       'Climate advisory Europe',       'institution_quote', 'en', 'any'),
  ('EU climate scientists',                               'EU climate scientists',         'institution_quote', 'en', 'any'),
  ('EU independent climate advice',                       'Independent advice',            'institution_quote', 'en', 'any'),
  ('European Climate Law advisory board',                 'ECL advisory board',            'institution_quote', 'en', 'any'),
  ('ESABCC recommendation',                               'ESABCC recommendation',         'institution_quote', 'en', 'any'),
  ('ESABCC advice',                                       'ESABCC advice',                 'institution_quote', 'en', 'any'),
  ('ESABCC assessment',                                   'ESABCC assessment',             'institution_quote', 'en', 'any'),
  ('ESABCC opinion',                                      'ESABCC opinion',                'institution_quote', 'en', 'any')
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ESABCC in other EU languages
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.media_keywords (keyword, label, category, language, country) values
  -- German
  ('Europäischer Wissenschaftlicher Beirat für Klimawandel',  'ESABCC full name (DE)',     'institution_quote', 'de', 'any'),
  ('EU-Klimabeirat',                                          'EU climate board (DE)',      'institution_quote', 'de', 'any'),
  ('Klimabeirat EU',                                          'Climate board EU (DE)',      'institution_quote', 'de', 'any'),
  ('EU Klimawissenschaftlicher Beirat',                       'EU science board (DE)',      'institution_quote', 'de', 'any'),
  ('ESABCC',                                                  'ESABCC acronym (DE)',        'institution_quote', 'de', 'any'),
  ('Wissenschaftlicher Beirat Klimawandel',                   'Science board climate (DE)', 'institution_quote', 'de', 'any'),

  -- French
  ('Comité consultatif scientifique européen sur le changement climatique', 'ESABCC full name (FR)', 'institution_quote', 'fr', 'any'),
  ('ESABCC',                                                  'ESABCC acronym (FR)',        'institution_quote', 'fr', 'any'),
  ('comité scientifique climat européen',                     'EU science climate (FR)',    'institution_quote', 'fr', 'any'),
  ('conseil scientifique climat UE',                          'EU climate council (FR)',    'institution_quote', 'fr', 'any'),

  -- Spanish
  ('Comité Consultivo Científico Europeo sobre el Cambio Climático', 'ESABCC full name (ES)', 'institution_quote', 'es', 'any'),
  ('ESABCC',                                                  'ESABCC acronym (ES)',        'institution_quote', 'es', 'any'),
  ('consejo asesor científico clima UE',                      'EU climate advisor (ES)',    'institution_quote', 'es', 'any'),

  -- Italian
  ('Comitato consultivo scientifico europeo sui cambiamenti climatici', 'ESABCC full name (IT)', 'institution_quote', 'it', 'any'),
  ('ESABCC',                                                  'ESABCC acronym (IT)',        'institution_quote', 'it', 'any'),
  ('comitato scientifico clima UE',                           'EU climate committee (IT)',  'institution_quote', 'it', 'any'),

  -- Dutch
  ('Europees Wetenschappelijk Adviescomité over klimaatverandering', 'ESABCC full name (NL)', 'institution_quote', 'nl', 'any'),
  ('ESABCC',                                                  'ESABCC acronym (NL)',        'institution_quote', 'nl', 'any'),
  ('EU-klimaatadviesraad',                                    'EU climate council (NL)',    'institution_quote', 'nl', 'any'),

  -- Polish
  ('Europejski Naukowy Komitet Doradczy ds. Zmiany Klimatu',  'ESABCC full name (PL)',     'institution_quote', 'pl', 'any'),
  ('ESABCC',                                                  'ESABCC acronym (PL)',        'institution_quote', 'pl', 'any'),

  -- Danish
  ('ESABCC',                                                  'ESABCC acronym (DA)',        'institution_quote', 'da', 'any'),
  ('EU klimarådgivning',                                      'EU climate advice (DA)',     'institution_quote', 'da', 'any'),

  -- Swedish
  ('ESABCC',                                                  'ESABCC acronym (SV)',        'institution_quote', 'sv', 'any'),
  ('EU klimatvetenskapligt råd',                              'EU climate science (SV)',    'institution_quote', 'sv', 'any'),

  -- Portuguese
  ('ESABCC',                                                  'ESABCC acronym (PT)',        'institution_quote', 'pt', 'any'),
  ('Comité Científico Europeu sobre Alterações Climáticas',   'ESABCC full name (PT)',     'institution_quote', 'pt', 'any'),

  -- Greek
  ('ESABCC',                                                  'ESABCC acronym (EL)',        'institution_quote', 'el', 'any'),
  ('Ευρωπαϊκό Επιστημονικό Συμβουλευτικό Σώμα για την Κλιματική Αλλαγή', 'ESABCC full name (EL)', 'institution_quote', 'el', 'any'),

  -- Finnish
  ('ESABCC',                                                  'ESABCC acronym (FI)',        'institution_quote', 'fi', 'any')
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Report-specific keywords — the 2 major ESABCC publications
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.media_keywords (keyword, label, category, language, country) values
  -- Report 1: Scientific advice for the determination of an EU-wide 2040 climate target (2023/2024)
  ('EU 2040 climate target',                              '2040 target report',           'report',  'en', 'any'),
  ('EU 2040 climate target ESABCC',                       '2040 target + ESABCC',         'report',  'en', 'any'),
  ('2040 greenhouse gas reduction',                       '2040 GHG reduction',           'report',  'en', 'any'),
  ('EU 2040 emissions target',                            '2040 emissions target',        'report',  'en', 'any'),
  ('90% emission reduction 2040',                         '90% by 2040',                  'report',  'en', 'any'),
  ('EU-Klimaziel 2040',                                   '2040 target (DE)',             'report',  'de', 'any'),
  ('objectif climatique UE 2040',                         '2040 target (FR)',             'report',  'fr', 'any'),

  -- Report 2: Towards EU climate neutrality — progress, policy gaps and opportunities
  ('Towards EU climate neutrality',                       'Neutrality report',            'report',  'en', 'any'),
  ('EU climate neutrality progress',                      'Neutrality progress',          'report',  'en', 'any'),
  ('ESABCC climate neutrality report',                    'ESABCC neutrality report',     'report',  'en', 'any'),
  ('EU climate policy gaps',                              'Policy gaps',                  'report',  'en', 'any'),
  ('EU Klimaneutralität',                                 'Neutrality (DE)',              'report',  'de', 'any'),
  ('neutralité climatique UE',                            'Neutrality (FR)',              'report',  'fr', 'any'),

  -- General report references
  ('ESABCC report',                                       'ESABCC report general',        'report',  'en', 'any'),
  ('ESABCC Bericht',                                      'ESABCC report (DE)',           'report',  'de', 'any'),
  ('rapport ESABCC',                                      'ESABCC report (FR)',           'report',  'fr', 'any'),
  ('European Climate Law scientific advice',              'ECL scientific advice',        'report',  'en', 'any'),
  ('EU climate scientific assessment',                    'EU climate assessment',        'report',  'en', 'any')
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. EU climate policy context keywords
--    (Catch articles about EU climate policy that reference the board)
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.media_keywords (keyword, label, category, language, country) values
  ('European Climate Law',                                'European Climate Law',         'policy',  'en', 'any'),
  ('EU climate law advisory',                             'ECL advisory',                 'policy',  'en', 'any'),
  ('EU climate neutrality 2050',                          'EU 2050 neutrality',           'policy',  'en', 'any'),
  ('EU Fit for 55',                                       'Fit for 55',                   'policy',  'en', 'any'),
  ('EU Green Deal climate',                               'Green Deal climate',           'policy',  'en', 'any'),
  ('EU climate governance',                               'Climate governance',           'policy',  'en', 'any'),
  ('EU Klimagesetz',                                      'Climate law (DE)',             'policy',  'de', 'any'),
  ('Loi européenne sur le climat',                        'Climate law (FR)',             'policy',  'fr', 'any'),
  ('Ley Europea del Clima',                               'Climate law (ES)',             'policy',  'es', 'any'),
  ('Legge europea sul clima',                             'Climate law (IT)',             'policy',  'it', 'any'),
  ('Europese klimaatwet',                                 'Climate law (NL)',             'policy',  'nl', 'any')
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Board member keywords — ensure all 15 members have proper coverage
--    with board_quote category for individual citation tracking
-- ═══════════════════════════════════════════════════════════════════════════

-- Update existing person-category board members to board_quote where appropriate
-- (Keep 'person' for backward compat, add new board_quote entries for quote tracking)

insert into public.media_keywords (keyword, label, category, language, country) values
  -- Annela Anger-Kraavi
  ('Annela Anger-Kraavi climate',                         'Anger-Kraavi + climate',       'board_quote', 'en', 'any'),
  ('Anger-Kraavi',                                        'Anger-Kraavi surname',         'board_quote', 'en', 'any'),

  -- Constantinos Cartalis
  ('Constantinos Cartalis climate',                       'Cartalis + climate',           'board_quote', 'en', 'any'),
  ('Cartalis ESABCC',                                     'Cartalis + ESABCC',            'board_quote', 'en', 'any'),
  ('Κωνσταντίνος Καρτάλης',                               'Cartalis (EL)',                'board_quote', 'el', 'any'),

  -- Suraje Dessai
  ('Suraje Dessai climate',                               'Dessai + climate',             'board_quote', 'en', 'any'),
  ('Dessai ESABCC',                                       'Dessai + ESABCC',              'board_quote', 'en', 'any'),

  -- Laura Diaz Anadon
  ('Laura Díaz Anadón',                                   'Diaz Anadon (accented)',       'board_quote', 'en', 'any'),
  ('Diaz Anadon climate',                                 'Diaz Anadon + climate',        'board_quote', 'en', 'any'),
  ('Laura Diaz Anadon climate',                           'Diaz Anadon full + climate',   'board_quote', 'en', 'any'),

  -- Ottmar Edenhofer (kept as board member, NOT as chair)
  ('Edenhofer climate',                                   'Edenhofer + climate',          'board_quote', 'en', 'any'),
  ('Edenhofer ESABCC',                                    'Edenhofer + ESABCC',           'board_quote', 'en', 'any'),
  ('Ottmar Edenhofer Klimawandel',                        'Edenhofer (DE)',               'board_quote', 'de', 'any'),

  -- Vera Eory
  ('Vera Eory climate',                                   'Eory + climate',               'board_quote', 'en', 'any'),
  ('Eory ESABCC',                                         'Eory + ESABCC',                'board_quote', 'en', 'any'),

  -- Lena Kitzing
  ('Lena Kitzing climate',                                'Kitzing + climate',            'board_quote', 'en', 'any'),
  ('Lena Kitzing energy',                                 'Kitzing + energy',             'board_quote', 'en', 'any'),
  ('Kitzing ESABCC',                                      'Kitzing + ESABCC',             'board_quote', 'en', 'any'),

  -- Kati Kulovesi
  ('Kati Kulovesi climate',                               'Kulovesi + climate',           'board_quote', 'en', 'any'),
  ('Kulovesi ESABCC',                                     'Kulovesi + ESABCC',            'board_quote', 'en', 'any'),
  ('Kati Kulovesi',                                       'Kulovesi (FI)',                'board_quote', 'fi', 'any'),

  -- Lars J. Nilsson
  ('Lars Nilsson climate',                                'Nilsson + climate',            'board_quote', 'en', 'any'),
  ('Nilsson ESABCC',                                      'Nilsson + ESABCC',             'board_quote', 'en', 'any'),
  ('Lars J Nilsson',                                      'Nilsson no period',            'board_quote', 'en', 'any'),
  ('Lars Nilsson',                                        'Nilsson (SV)',                 'board_quote', 'sv', 'any'),

  -- Åsa Persson
  ('Åsa Persson climate',                                 'Persson + climate',            'board_quote', 'en', 'any'),
  ('Asa Persson climate',                                 'Persson alt + climate',        'board_quote', 'en', 'any'),
  ('Persson ESABCC',                                      'Persson + ESABCC',             'board_quote', 'en', 'any'),
  ('Åsa Persson',                                         'Persson (SV)',                 'board_quote', 'sv', 'any'),

  -- Keywan Riahi
  ('Keywan Riahi climate',                                'Riahi + climate',              'board_quote', 'en', 'any'),
  ('Riahi ESABCC',                                        'Riahi + ESABCC',               'board_quote', 'en', 'any'),
  ('Keywan Riahi IIASA',                                  'Riahi + IIASA',                'board_quote', 'en', 'any'),

  -- Jean-François Soussana
  ('Soussana climate',                                    'Soussana + climate',           'board_quote', 'en', 'any'),
  ('Soussana ESABCC',                                     'Soussana + ESABCC',            'board_quote', 'en', 'any'),
  ('Jean-François Soussana climat',                       'Soussana (FR)',                'board_quote', 'fr', 'any'),
  ('Soussana INRAE climat',                               'Soussana INRAE (FR)',          'board_quote', 'fr', 'any'),

  -- Giorgio Vacchiano
  ('Giorgio Vacchiano clima',                             'Vacchiano (IT)',               'board_quote', 'it', 'any'),
  ('Vacchiano climate',                                   'Vacchiano + climate',          'board_quote', 'en', 'any'),
  ('Vacchiano ESABCC',                                    'Vacchiano + ESABCC',           'board_quote', 'en', 'any'),

  -- Detlef van Vuuren
  ('Detlef van Vuuren climate',                           'van Vuuren + climate',         'board_quote', 'en', 'any'),
  ('van Vuuren ESABCC',                                   'van Vuuren + ESABCC',          'board_quote', 'en', 'any'),
  ('van Vuuren PBL',                                      'van Vuuren + PBL',             'board_quote', 'en', 'any'),
  ('Detlef van Vuuren klimaat',                           'van Vuuren (NL)',              'board_quote', 'nl', 'any'),

  -- Zinta Zommers
  ('Zinta Zommers climate',                               'Zommers + climate',            'board_quote', 'en', 'any'),
  ('Zommers ESABCC',                                      'Zommers + ESABCC',             'board_quote', 'en', 'any')
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Affiliated institutions — expanded
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.media_keywords (keyword, label, category, language, country) values
  ('INRAE climate',                                       'INRAE + climate',              'institution', 'en', 'any'),
  ('INRAE changement climatique',                         'INRAE + climate (FR)',         'institution', 'fr', 'any'),
  ('University of Cambridge climate policy',              'Cambridge climate policy',     'institution', 'en', 'any'),
  ('University of Leeds climate',                         'Leeds climate',                'institution', 'en', 'any'),
  ('Lund University climate',                             'Lund climate',                 'institution', 'en', 'any'),
  ('DTU energy transition',                               'DTU energy',                   'institution', 'en', 'any'),
  ('Scotland Rural College climate',                      'SRUC climate',                 'institution', 'en', 'any'),
  ('KTH climate action',                                  'KTH climate',                  'institution', 'en', 'any'),
  ('Stockholm Environment Institute climate',             'SEI climate',                  'institution', 'en', 'any'),
  ('PIK Potsdam Klimaforschung',                          'PIK (DE)',                     'institution', 'de', 'any'),
  ('University of Milan forest climate',                  'Milan forest climate',         'institution', 'en', 'any'),
  ('University of Eastern Finland climate law',           'UEF climate law',              'institution', 'en', 'any'),
  ('University of Toronto climate',                       'Toronto climate',              'institution', 'en', 'any')
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. Update existing ESABCC-category keywords to institution_quote
--    (retroactively tag the original 5 ESABCC keywords for consistency)
-- ═══════════════════════════════════════════════════════════════════════════

-- Keep the original 'esabcc' category for the core keywords, but ensure
-- articles matched by them are also recognisable as institutional quotes.
-- No update needed — the category filter in the dashboard already groups them.


-- ----------------------------------------------------------------------------
-- 006_custom_posts.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 006 — Custom (internal) posts store
--
-- Persistent backend for user-authored internal posts on the Secretariat
-- News Feed (the "Share a New Item" form at /news-feed → Post tab). Before
-- this table, posts were only kept in the browser's localStorage under the
-- key 'nf-custom-items', which meant they disappeared whenever the user
-- cleared storage, switched device, or used a different browser.
-- ============================================================================

create table if not exists public.custom_posts (
  id                text primary key,
  title             text not null,
  summary           text not null default '',
  ai_summary        text,
  source            text not null default 'internal',
  source_label      text not null default 'ESABCC Secretariat',
  url               text not null default '',
  published_date    date not null default current_date,
  added_date        date not null default current_date,
  added_by          text not null default '',
  author_id         uuid references auth.users(id) on delete set null,
  type              text not null default 'internal_note',
  tags              text[] not null default '{}',
  is_external       boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_custom_posts_added_date on public.custom_posts (added_date desc);
create index if not exists idx_custom_posts_created    on public.custom_posts (created_at desc);
create index if not exists idx_custom_posts_author     on public.custom_posts (author_id);

alter table public.custom_posts enable row level security;

drop policy if exists "Custom posts are viewable by everyone" on public.custom_posts;
DROP POLICY IF EXISTS "Custom posts are viewable by everyone" ON public.custom_posts;
create policy "Custom posts are viewable by everyone"
  on public.custom_posts for select using (true);


-- ----------------------------------------------------------------------------
-- 007_policy_clock_events.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 007 — Policy Clock user-authored events + notifications table
--
-- Persistent backend for dates added through the "Post New" tab on the
-- Secretariat News Feed. Each row represents a single dated event that is
-- merged into the Policy Clock timeline alongside the curated OJ deadlines
-- and the live RSS feed items.
-- ============================================================================

create table if not exists public.policy_clock_events (
  id                text primary key,
  event_date        date not null,
  end_date          date,
  event_time        text,
  title             text not null,
  description       text not null default '',
  category          text not null,
  source_label      text not null default 'User-added',
  source_url        text,
  location          text,
  importance        text not null default 'normal',
  tags              text[] not null default '{}',
  added_by          text not null default '',
  author_id         uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_policy_clock_events_date       on public.policy_clock_events (event_date desc);
create index if not exists idx_policy_clock_events_category   on public.policy_clock_events (category);
create index if not exists idx_policy_clock_events_importance on public.policy_clock_events (importance);

alter table public.policy_clock_events enable row level security;

drop policy if exists "Policy clock events are viewable by everyone" on public.policy_clock_events;
DROP POLICY IF EXISTS "Policy clock events are viewable by everyone" ON public.policy_clock_events;
create policy "Policy clock events are viewable by everyone"
  on public.policy_clock_events for select using (true);

drop policy if exists "Authors can delete own policy clock events" on public.policy_clock_events;
DROP POLICY IF EXISTS "Authors can delete own policy clock events" ON public.policy_clock_events;
create policy "Authors can delete own policy clock events"
  on public.policy_clock_events for delete using (auth.uid() = author_id);

-- Notifications (idempotent)
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null default 'system',
  title       text not null,
  message     text not null default '',
  link        text not null default '',
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications (user_id, read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
create policy "Users can view own notifications"
  on public.notifications for select using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update using (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 008_media_social_and_reports.sql
-- ----------------------------------------------------------------------------

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
DROP POLICY IF EXISTS "Social sources are viewable by everyone" ON public.media_social_sources;
create policy "Social sources are viewable by everyone"
  on public.media_social_sources for select using (true);

drop policy if exists "Authenticated users can manage social sources" on public.media_social_sources;
DROP POLICY IF EXISTS "Authenticated users can manage social sources" ON public.media_social_sources;
create policy "Authenticated users can manage social sources"
  on public.media_social_sources for insert with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update social sources" on public.media_social_sources;
DROP POLICY IF EXISTS "Authenticated users can update social sources" ON public.media_social_sources;
create policy "Authenticated users can update social sources"
  on public.media_social_sources for update using (auth.uid() is not null);

drop policy if exists "Authenticated users can delete social sources" on public.media_social_sources;
DROP POLICY IF EXISTS "Authenticated users can delete social sources" ON public.media_social_sources;
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
DROP POLICY IF EXISTS "Social posts are viewable by everyone" ON public.media_social_posts;
create policy "Social posts are viewable by everyone"
  on public.media_social_posts for select using (true);


-- ----------------------------------------------------------------------------
-- 009_drop_social_search_sources.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 009 — Drop LinkedIn phrase-search sources
--
-- Migration 008 seeded `media_social_sources` rows with source_type='keyword'
-- so the server-side fetcher could run `site:linkedin.com "<phrase>"`
-- queries against Brave / Google News. In practice those search backends
-- only return LinkedIn's stub meta pages ("We cannot provide a description
-- for this page right now") because LinkedIn blocks crawlers from reading
-- post content — the results were garbage.
--
-- The social fetcher now only pulls sources that have an explicit `feed_url`
-- (RSS.app bridges etc.). Post capture happens via the browser extension or
-- the manual-paste form, both posting to /api/media-monitoring/social/ingest.
--
-- This migration drops the now-unused phrase-search rows.
-- ============================================================================

delete from public.media_social_sources
 where source_type = 'keyword';


-- ----------------------------------------------------------------------------
-- 010_gdpr_rls_hardening.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 010 — GDPR: tighten public-read RLS policies
--
-- The original schema used `using (true)` on profiles, annotations, comments,
-- activity_log, reading lists, upvotes and inbound_emails. That allowed any
-- anonymous visitor to read the full behavioural trail of every user — a
-- direct violation of GDPR Art. 5(1)(f) (integrity and confidentiality) and
-- Art. 6 (no lawful basis for public processing of internal staff data).
--
-- Scope: this is an internal ESABCC secretariat tool. There is no legitimate
-- reason for unauthenticated visitors to read user-generated content. All
-- previously-public reads now require an authenticated session.
-- ============================================================================

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  using (auth.uid() is not null);

drop policy if exists "Annotations are viewable by everyone" on public.annotations;
drop policy if exists "Annotations are viewable by authenticated users" on public.annotations;
DROP POLICY IF EXISTS "Annotations are viewable by authenticated users" ON public.annotations;
create policy "Annotations are viewable by authenticated users"
  on public.annotations for select
  using (auth.uid() is not null);

drop policy if exists "Custom tags are viewable by everyone" on public.custom_tags;
drop policy if exists "Custom tags are viewable by authenticated users" on public.custom_tags;
DROP POLICY IF EXISTS "Custom tags are viewable by authenticated users" ON public.custom_tags;
create policy "Custom tags are viewable by authenticated users"
  on public.custom_tags for select
  using (auth.uid() is not null);

drop policy if exists "Comments are viewable by everyone" on public.comments;
drop policy if exists "Comments are viewable by authenticated users" on public.comments;
DROP POLICY IF EXISTS "Comments are viewable by authenticated users" ON public.comments;
create policy "Comments are viewable by authenticated users"
  on public.comments for select
  using (auth.uid() is not null);

drop policy if exists "Activity log is viewable by everyone" on public.activity_log;
drop policy if exists "Activity log is viewable by self" on public.activity_log;
drop policy if exists "Activity log is viewable by admins" on public.activity_log;
DROP POLICY IF EXISTS "Activity log is viewable by self" ON public.activity_log;
create policy "Activity log is viewable by self"
  on public.activity_log for select
  using (auth.uid() = user_id);
DROP POLICY IF EXISTS "Activity log is viewable by admins" ON public.activity_log;
create policy "Activity log is viewable by admins"
  on public.activity_log for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Shared reading list is viewable by everyone" on public.shared_reading_list;
drop policy if exists "Shared reading list is viewable by authenticated users" on public.shared_reading_list;
DROP POLICY IF EXISTS "Shared reading list is viewable by authenticated users" ON public.shared_reading_list;
create policy "Shared reading list is viewable by authenticated users"
  on public.shared_reading_list for select
  using (auth.uid() is not null);

drop policy if exists "Upvotes are viewable by everyone" on public.reading_list_upvotes;
drop policy if exists "Upvotes are viewable by authenticated users" on public.reading_list_upvotes;
DROP POLICY IF EXISTS "Upvotes are viewable by authenticated users" ON public.reading_list_upvotes;
create policy "Upvotes are viewable by authenticated users"
  on public.reading_list_upvotes for select
  using (auth.uid() is not null);

drop policy if exists "Inbound emails are viewable by everyone" on public.inbound_emails;
drop policy if exists "Inbound emails are viewable by authenticated users" on public.inbound_emails;
DROP POLICY IF EXISTS "Inbound emails are viewable by authenticated users" ON public.inbound_emails;
create policy "Inbound emails are viewable by authenticated users"
  on public.inbound_emails for select
  using (auth.uid() is not null);


-- ----------------------------------------------------------------------------
-- 011_gdpr_admin_email_unhardcode.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 011 — GDPR: stop hard-coding a personal email in source / database
--
-- The original `handle_new_user()` trigger and the bootstrap UPDATE both
-- contained a specific staff member's email. That is:
--   * personal data committed to the git history of every clone (Art. 5(1)(c)
--     data minimisation, Art. 32 confidentiality);
--   * a privilege-bootstrapping mechanism that bypasses any controlled
--     access-grant process.
--
-- The trigger is reduced to a generic "create profile with role=user".
-- Admin bootstrapping is now an explicit operational step driven by the
-- Postgres GUC `app.admin_emails`.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', 'Anonymous user'),
    'user'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace function public.grant_admin_from_setting()
returns integer as $$
declare
  raw_setting text;
  email_list text[];
  updated_count integer;
begin
  raw_setting := current_setting('app.admin_emails', true);
  if raw_setting is null or btrim(raw_setting) = '' then
    return 0;
  end if;

  email_list := string_to_array(lower(raw_setting), ',');
  email_list := array(select btrim(e) from unnest(email_list) as e where btrim(e) <> '');

  with promoted as (
    update public.profiles p
       set role = 'admin'
      from auth.users u
     where p.id = u.id
       and lower(u.email) = any(email_list)
       and p.role <> 'admin'
     returning p.id
  )
  select count(*) into updated_count from promoted;

  return updated_count;
end;
$$ language plpgsql security definer;

-- Run the bootstrap once on migration apply. If the GUC is unset, this is
-- a no-op. IT sets the GUC before applying this migration in production.
select public.grant_admin_from_setting();


-- ----------------------------------------------------------------------------
-- 012_gdpr_data_retention.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 012 — GDPR: data-retention policy and purge function
--
-- GDPR Art. 5(1)(e) (storage limitation) requires personal data to be kept
-- "no longer than is necessary". The original schema had no retention on
-- activity_log (a behavioural audit trail) or inbound_emails (which keep
-- third-party sender addresses).
--
-- Adds:
--   * tunable retention windows via Postgres GUCs
--       app.activity_log_retention_days  (default 365)
--       app.inbound_email_retention_days (default 730)
--       app.soft_delete_grace_days       (default 30)
--   * a single `public.purge_expired_personal_data()` function
-- ============================================================================

create or replace function public._gdpr_int_setting(name text, fallback integer)
returns integer as $$
declare
  raw_setting text;
  parsed integer;
begin
  raw_setting := current_setting(name, true);
  if raw_setting is null or btrim(raw_setting) = '' then
    return fallback;
  end if;
  begin
    parsed := raw_setting::integer;
  exception when others then
    return fallback;
  end;
  if parsed < 1 then
    return fallback;
  end if;
  return parsed;
end;
$$ language plpgsql stable;

create or replace function public.purge_expired_personal_data()
returns jsonb as $$
declare
  retain_activity_days  integer := public._gdpr_int_setting('app.activity_log_retention_days', 365);
  retain_inbound_days   integer := public._gdpr_int_setting('app.inbound_email_retention_days', 730);
  deleted_activity      integer := 0;
  deleted_inbound       integer := 0;
  redacted_inbound      integer := 0;
begin
  with d as (
    delete from public.activity_log
     where created_at < now() - make_interval(days => retain_activity_days)
     returning 1
  )
  select count(*) into deleted_activity from d;

  with d as (
    delete from public.inbound_emails
     where received_date < now() - make_interval(days => retain_inbound_days)
     returning 1
  )
  select count(*) into deleted_inbound from d;

  with u as (
    update public.inbound_emails
       set from_display = case
             when position('@' in from_display) > 0
               then '<redacted>@' || split_part(split_part(from_display, '@', 2), '>', 1)
             else '<redacted>'
           end
     where received_date < now() - interval '180 days'
       and from_display !~ '^<redacted>'
       and from_display <> ''
     returning 1
  )
  select count(*) into redacted_inbound from u;

  return jsonb_build_object(
    'deleted_activity_log',       deleted_activity,
    'deleted_inbound_emails',     deleted_inbound,
    'redacted_inbound_senders',   redacted_inbound,
    'activity_retention_days',    retain_activity_days,
    'inbound_retention_days',     retain_inbound_days,
    'ran_at',                     now()
  );
end;
$$ language plpgsql security definer;

create or replace view public.my_retention_overview as
  select
    auth.uid() as user_id,
    (select count(*) from public.activity_log where user_id = auth.uid())              as activity_log_rows,
    (select min(created_at) from public.activity_log where user_id = auth.uid())       as activity_oldest,
    (select count(*) from public.annotations where user_id = auth.uid())               as annotation_rows,
    (select count(*) from public.comments where user_id = auth.uid())                  as comment_rows,
    (select count(*) from public.personal_reading_list where user_id = auth.uid())     as personal_reading_list_rows,
    (select count(*) from public.shared_reading_list where added_by = auth.uid())      as shared_reading_list_rows;


-- ----------------------------------------------------------------------------
-- 013_gdpr_account_deletion.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 013 — GDPR: self-service account deletion with grace period
--
-- GDPR Art. 17 (right to erasure) requires data subjects to be able to
-- request deletion of their own data. The original schema only allowed
-- admins to delete accounts via the auth.admin API.
--
-- This migration introduces a 30-day soft-delete workflow:
--   * users POST  /api/user/delete-request  → row inserted here
--   * users DELETE /api/user/delete-request → cancelled_at set (Art. 17(3)
--     allows the data subject to withdraw the request before erasure)
--   * the weekly retention cron calls process_pending_deletions() which
--     hard-deletes any rows whose scheduled_for is in the past and which
--     have not been cancelled.
-- The grace period gives the user time to recover from accidental requests
-- and gives the controller time to honour any legal-obligation holds.
-- ============================================================================

create table if not exists public.deletion_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  requested_at  timestamptz not null default now(),
  scheduled_for timestamptz not null,
  cancelled_at  timestamptz,
  reason        text default '',
  unique(user_id)
);

alter table public.deletion_requests enable row level security;

drop policy if exists "Deletion requests visible to self" on public.deletion_requests;
DROP POLICY IF EXISTS "Deletion requests visible to self" ON public.deletion_requests;
create policy "Deletion requests visible to self"
  on public.deletion_requests for select using (auth.uid() = user_id);

drop policy if exists "Deletion requests visible to admins" on public.deletion_requests;
DROP POLICY IF EXISTS "Deletion requests visible to admins" ON public.deletion_requests;
create policy "Deletion requests visible to admins"
  on public.deletion_requests for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create index if not exists idx_deletion_requests_scheduled
  on public.deletion_requests(scheduled_for) where cancelled_at is null;

create or replace function public.process_pending_deletions()
returns integer as $$
declare
  victim record;
  count_erased integer := 0;
begin
  for victim in
    select id, user_id
      from public.deletion_requests
     where cancelled_at is null
       and scheduled_for <= now()
  loop
    delete from auth.users where id = victim.user_id;
    delete from public.deletion_requests where id = victim.id;
    count_erased := count_erased + 1;
  end loop;
  return count_erased;
end;
$$ language plpgsql security definer;

create or replace function public.purge_expired_personal_data()
returns jsonb as $$
declare
  retain_activity_days  integer := public._gdpr_int_setting('app.activity_log_retention_days', 365);
  retain_inbound_days   integer := public._gdpr_int_setting('app.inbound_email_retention_days', 730);
  deleted_activity      integer := 0;
  deleted_inbound       integer := 0;
  redacted_inbound      integer := 0;
  deleted_users         integer := 0;
begin
  with d as (
    delete from public.activity_log
     where created_at < now() - make_interval(days => retain_activity_days)
     returning 1
  )
  select count(*) into deleted_activity from d;

  with d as (
    delete from public.inbound_emails
     where received_date < now() - make_interval(days => retain_inbound_days)
     returning 1
  )
  select count(*) into deleted_inbound from d;

  with u as (
    update public.inbound_emails
       set from_display = case
             when position('@' in from_display) > 0
               then '<redacted>@' || split_part(split_part(from_display, '@', 2), '>', 1)
             else '<redacted>'
           end
     where received_date < now() - interval '180 days'
       and from_display !~ '^<redacted>'
       and from_display <> ''
     returning 1
  )
  select count(*) into redacted_inbound from u;

  deleted_users := public.process_pending_deletions();

  return jsonb_build_object(
    'deleted_activity_log',       deleted_activity,
    'deleted_inbound_emails',     deleted_inbound,
    'redacted_inbound_senders',   redacted_inbound,
    'erased_users',               deleted_users,
    'activity_retention_days',    retain_activity_days,
    'inbound_retention_days',     retain_inbound_days,
    'ran_at',                     now()
  );
end;
$$ language plpgsql security definer;


-- ----------------------------------------------------------------------------
-- 014_gdpr_consent.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 014 — GDPR: per-user consent flags
--
-- LLM features (AI summaries, Brussels Bulletin generation) send text to
-- third-party providers (Anthropic, OpenAI, Google, Azure OpenAI). Some
-- providers process data outside the EEA. To rely on Art. 6(1)(a) consent
-- and document Art. 49 SCC-backed transfers, we record per-user consent
-- explicitly with a timestamp.
-- ============================================================================

alter table public.profiles
  add column if not exists llm_consent_at timestamptz,
  add column if not exists analytics_consent_at timestamptz;

comment on column public.profiles.llm_consent_at is
  'GDPR Art. 6(1)(a): timestamp at which the user opted in to AI summaries '
  'using third-party LLM providers. Null = no consent on file. Cleared on '
  'withdrawal. The privacy notice describes the providers in scope.';

comment on column public.profiles.analytics_consent_at is
  'Reserved: timestamp of opt-in to optional UI-state local-storage features '
  '(news-feed reading list, Brussels Bulletin draft history, etc.). Null = '
  'only strictly-necessary storage allowed.';


-- ----------------------------------------------------------------------------
-- 015_gdpr_admin_audit_log.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 015 — GDPR: tamper-resistant audit log of admin actions
--
-- GDPR Art. 5(2) (accountability) requires the controller to demonstrate
-- compliance. Sensitive operations (granting / revoking admin roles,
-- scheduling deletions, immediate erasures, retention purges) need a
-- per-action record with actor, target, action, and timestamp.
-- ============================================================================

create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid not null references auth.users(id) on delete set null,
  action      text not null,
  target_type text,
  target_id   text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_admin_audit_created on public.admin_audit_log(created_at desc);
create index if not exists idx_admin_audit_actor   on public.admin_audit_log(actor_id);
create index if not exists idx_admin_audit_target  on public.admin_audit_log(target_type, target_id);

alter table public.admin_audit_log enable row level security;

drop policy if exists "Admin audit log is viewable by admins" on public.admin_audit_log;
DROP POLICY IF EXISTS "Admin audit log is viewable by admins" ON public.admin_audit_log;
create policy "Admin audit log is viewable by admins"
  on public.admin_audit_log for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- No insert/update/delete policies: only service-role contexts may write.


-- ----------------------------------------------------------------------------
-- 016_gdpr_admin_email_trigger.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 016 — GDPR: close the admin-bootstrap gap
--
-- Migration 011 moved the admin email allowlist out of source, but left a
-- hole: if a user is created via a path that doesn't go through the app
-- (e.g. the Supabase dashboard), the handle_new_user() trigger only set
-- role='user' and `grant_admin_from_setting()` had to be run manually to
-- promote them. On a fresh database, if nobody runs that function, nobody
-- has admin and there's no recovery from the UI.
--
-- Fix: the trigger itself now consults the same `app.admin_emails` GUC
-- that grant_admin_from_setting() uses, so promotion happens at insert
-- regardless of how the auth.users row was created.
-- ============================================================================

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


-- ----------------------------------------------------------------------------
-- 017_content_analysis_codes.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 017 — Content analysis: coded segments + AI code suggestions
--
-- Persistent backend for the content analysis workbench
-- (/content-analysis). Writes happen server-side through
-- /api/content-analysis/segments and /api/content-analysis/suggestions
-- using the SERVICE ROLE key, so reads are public (the workbench renders
-- for the whole team) but clients can't write directly.
-- ============================================================================

create table if not exists public.content_analysis_segments (
  id             text primary key,
  document_id    text not null,
  code_id        text not null,
  block_id       text,
  start_char     integer not null,
  end_char       integer not null,
  text           text not null default '',
  note           text not null default '',
  project_id     text,
  author_id      uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_ca_segments_document on public.content_analysis_segments (document_id);
create index if not exists idx_ca_segments_code     on public.content_analysis_segments (code_id);
create index if not exists idx_ca_segments_project  on public.content_analysis_segments (project_id);
create index if not exists idx_ca_segments_created  on public.content_analysis_segments (created_at desc);

alter table public.content_analysis_segments enable row level security;

drop policy if exists "Coded segments are viewable by everyone" on public.content_analysis_segments;
DROP POLICY IF EXISTS "Coded segments are viewable by everyone" ON public.content_analysis_segments;
create policy "Coded segments are viewable by everyone"
  on public.content_analysis_segments for select using (true);

create table if not exists public.content_analysis_suggestions (
  id             text primary key,
  document_id    text not null,
  code_id        text not null,
  block_id       text,
  start_char     integer not null,
  end_char       integer not null,
  quote          text not null default '',
  rationale      text not null default '',
  confidence     double precision not null default 0,
  model          text,
  created_at     timestamptz not null default now()
);

create index if not exists idx_ca_suggestions_document on public.content_analysis_suggestions (document_id);
create index if not exists idx_ca_suggestions_created  on public.content_analysis_suggestions (created_at desc);

alter table public.content_analysis_suggestions enable row level security;

drop policy if exists "Code suggestions are viewable by everyone" on public.content_analysis_suggestions;
DROP POLICY IF EXISTS "Code suggestions are viewable by everyone" ON public.content_analysis_suggestions;
create policy "Code suggestions are viewable by everyone"
  on public.content_analysis_suggestions for select using (true);


-- ----------------------------------------------------------------------------
-- 018_custom_references_store.sql
-- ----------------------------------------------------------------------------

-- 018_custom_references_store.sql
--
-- Replace the GitHub-Contents-API-as-database hack for custom references.
--
-- Previously, `src/lib/references/custom-store.ts` PUT a JSON blob to
-- `public/data/custom-references.json` in the source repo via the GitHub
-- Contents API using `REFS_GITHUB_TOKEN`. That meant user-entered
-- reference metadata (titles, DOIs, authors, source tags) was replicated
-- into GitHub on every add — a GDPR / EU-sovereignty problem the hosting
-- architecture diagram couldn't account for.
--
-- This migration introduces a proper `custom_references` table. The app
-- layer writes here directly; the GitHub path is retired.
--
-- Idempotent: safe to run on an already-upgraded database.

create table if not exists public.custom_references (
  id            text primary key,
  doi           text        default '',
  title         text        not null,
  authors       text        default '',
  year          text        default '',
  journal       text        default '',
  type          text        default '',
  volume        text        default '',
  issue         text        default '',
  pages         text        default '',
  url           text        default '',
  full_citation text        default '',
  source        text        not null default 'web',    -- 'web' | 'vba'
  pdf_url       text        default '',                 -- Supabase Storage / S3 public URL
  added_by      uuid        references auth.users(id) on delete set null,
  added_at      timestamptz not null default now()
);

create index if not exists idx_custom_references_doi
  on public.custom_references (doi) where doi <> '';
create index if not exists idx_custom_references_added_at
  on public.custom_references (added_at desc);

alter table public.custom_references enable row level security;

-- Authenticated staff can read the full library.
drop policy if exists "Custom references readable by authenticated" on public.custom_references;
DROP POLICY IF EXISTS "Custom references readable by authenticated" ON public.custom_references;
create policy "Custom references readable by authenticated"
  on public.custom_references for select using (auth.uid() is not null);

-- Any authenticated user can add a reference; we record who did it.
drop policy if exists "Authenticated users can insert references" on public.custom_references;
DROP POLICY IF EXISTS "Authenticated users can insert references" ON public.custom_references;
create policy "Authenticated users can insert references"
  on public.custom_references for insert
  with check (auth.uid() is not null and (added_by is null or added_by = auth.uid()));

-- Updates/deletes are gated to the original adder or an admin.
drop policy if exists "Adder or admin can update references" on public.custom_references;
DROP POLICY IF EXISTS "Adder or admin can update references" ON public.custom_references;
create policy "Adder or admin can update references"
  on public.custom_references for update using (
    added_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Adder or admin can delete references" on public.custom_references;
DROP POLICY IF EXISTS "Adder or admin can delete references" ON public.custom_references;
create policy "Adder or admin can delete references"
  on public.custom_references for delete using (
    added_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Service-role webhook writes (e.g. from the Word VBA "Add reference"
-- bridge) bypass RLS in code; no explicit policy needed.


-- ----------------------------------------------------------------------------
-- 019_connection_review_state.sql
-- ----------------------------------------------------------------------------

-- 019_connection_review_state.sql
--
-- Persist the Policy Navigator "Review & approve connections" workflow.
--
-- Until now, every approve / reject / needs-info decision in the
-- ConnectionsReviewTable was written to `localStorage` only (see the
-- comment block in `src/lib/useConnectionOverrides.ts` that planned a
-- "future iteration" to mirror state to Supabase). That meant a
-- reviewer's work survived only as long as their browser cache —
-- a redeploy, a different device, or an incognito tab and it was gone.
--
-- This migration creates the three tables the hook will sync to:
--
--   • connection_overrides     — per-connection edits to type/description/articles
--   • connection_verifications — per-connection approve/reject/needs-info decision
--   • connection_additions     — user-created connections that don't exist in code
--
-- All three are keyed by the integer connection id used in
-- `src/data/policies.ts`. There is one row per connection (not per
-- reviewer) because the UI displays a single current decision; the
-- reviewer column records who last touched it.
--
-- Idempotent: safe to re-run.

-- ── connection_overrides ─────────────────────────────────────────────────────
create table if not exists public.connection_overrides (
  connection_id    integer     primary key,
  connection_type  text,
  description      text,
  articles_source  text,
  articles_target  text,
  edited_by        uuid        references auth.users(id) on delete set null,
  updated_at       timestamptz not null default now()
);

create index if not exists idx_connection_overrides_updated_at
  on public.connection_overrides (updated_at desc);

alter table public.connection_overrides enable row level security;

drop policy if exists "Connection overrides readable by authenticated"
  on public.connection_overrides;
DROP POLICY IF EXISTS "Connection overrides readable by authenticated" ON public.connection_overrides;
create policy "Connection overrides readable by authenticated"
  on public.connection_overrides for select using (auth.uid() is not null);

drop policy if exists "Authenticated users can write connection overrides"
  on public.connection_overrides;
DROP POLICY IF EXISTS "Authenticated users can write connection overrides" ON public.connection_overrides;
create policy "Authenticated users can write connection overrides"
  on public.connection_overrides for insert
  with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update connection overrides"
  on public.connection_overrides;
DROP POLICY IF EXISTS "Authenticated users can update connection overrides" ON public.connection_overrides;
create policy "Authenticated users can update connection overrides"
  on public.connection_overrides for update using (auth.uid() is not null);

drop policy if exists "Authenticated users can delete connection overrides"
  on public.connection_overrides;
DROP POLICY IF EXISTS "Authenticated users can delete connection overrides" ON public.connection_overrides;
create policy "Authenticated users can delete connection overrides"
  on public.connection_overrides for delete using (auth.uid() is not null);

-- ── connection_verifications ─────────────────────────────────────────────────
create table if not exists public.connection_verifications (
  connection_id    integer     primary key,
  status           text        not null check (status in ('unverified','verified','rejected','needs_review')),
  reviewer_name    text        not null default '',
  reviewer_user_id uuid        references auth.users(id) on delete set null,
  reviewer_note    text,
  reviewed_at      timestamptz not null default now()
);

create index if not exists idx_connection_verifications_status
  on public.connection_verifications (status);
create index if not exists idx_connection_verifications_reviewed_at
  on public.connection_verifications (reviewed_at desc);

alter table public.connection_verifications enable row level security;

drop policy if exists "Connection verifications readable by authenticated"
  on public.connection_verifications;
DROP POLICY IF EXISTS "Connection verifications readable by authenticated" ON public.connection_verifications;
create policy "Connection verifications readable by authenticated"
  on public.connection_verifications for select using (auth.uid() is not null);

drop policy if exists "Authenticated users can write connection verifications"
  on public.connection_verifications;
DROP POLICY IF EXISTS "Authenticated users can write connection verifications" ON public.connection_verifications;
create policy "Authenticated users can write connection verifications"
  on public.connection_verifications for insert
  with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update connection verifications"
  on public.connection_verifications;
DROP POLICY IF EXISTS "Authenticated users can update connection verifications" ON public.connection_verifications;
create policy "Authenticated users can update connection verifications"
  on public.connection_verifications for update using (auth.uid() is not null);

drop policy if exists "Authenticated users can delete connection verifications"
  on public.connection_verifications;
DROP POLICY IF EXISTS "Authenticated users can delete connection verifications" ON public.connection_verifications;
create policy "Authenticated users can delete connection verifications"
  on public.connection_verifications for delete using (auth.uid() is not null);

-- ── connection_additions ─────────────────────────────────────────────────────
-- The id sequence starts at 100_000 — well above the max id shipped in
-- src/data/policies.ts (currently ~90) so user-added rows never collide
-- with the base set even after years of new shipped connections.
create sequence if not exists public.connection_additions_id_seq
  start with 100000
  increment by 1
  no cycle;

create table if not exists public.connection_additions (
  id               integer     primary key default nextval('public.connection_additions_id_seq'),
  source_policy_id text        not null,
  target_policy_id text        not null,
  connection_type  text        not null,
  description      text        not null default '',
  articles_source  text,
  articles_target  text,
  added_by         uuid        references auth.users(id) on delete set null,
  added_at         timestamptz not null default now()
);

alter sequence public.connection_additions_id_seq owned by public.connection_additions.id;

create index if not exists idx_connection_additions_added_at
  on public.connection_additions (added_at desc);

alter table public.connection_additions enable row level security;

drop policy if exists "Connection additions readable by authenticated"
  on public.connection_additions;
DROP POLICY IF EXISTS "Connection additions readable by authenticated" ON public.connection_additions;
create policy "Connection additions readable by authenticated"
  on public.connection_additions for select using (auth.uid() is not null);

drop policy if exists "Authenticated users can add connections"
  on public.connection_additions;
DROP POLICY IF EXISTS "Authenticated users can add connections" ON public.connection_additions;
create policy "Authenticated users can add connections"
  on public.connection_additions for insert
  with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update connection additions"
  on public.connection_additions;
DROP POLICY IF EXISTS "Authenticated users can update connection additions" ON public.connection_additions;
create policy "Authenticated users can update connection additions"
  on public.connection_additions for update using (auth.uid() is not null);

drop policy if exists "Authenticated users can delete connection additions"
  on public.connection_additions;
DROP POLICY IF EXISTS "Authenticated users can delete connection additions" ON public.connection_additions;
create policy "Authenticated users can delete connection additions"
  on public.connection_additions for delete using (auth.uid() is not null);


-- ----------------------------------------------------------------------------
-- 020_scenario_views.sql
-- ----------------------------------------------------------------------------

-- 020_scenario_views.sql
--
-- Saved / shareable scenario views for the Data & Scenario Explorer.
--
-- The `ScenarioExplorer` component carries a non-trivial amount of UI
-- state (database, models, scenarios, variables, regions, climate
-- categories, SSP narratives, RCPs, view mode, comparison mode, …).
-- Today every visit rebuilds that state from scratch. Analysts who
-- return to the same filter combination day after day end up re-picking
-- the same dropdowns each morning.
--
-- This migration backs a "Saved views" feature: name a snapshot of the
-- current filters, restore it later, optionally share it via a URL of
-- the form `/scenarios?view=<uuid>`.
--
-- Idempotent: safe to re-run.

create extension if not exists "pgcrypto";

create table if not exists public.scenario_views (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  description text        default '',
  -- Opaque blob owned by the client component. Schema-on-read so we can
  -- evolve the state shape without a migration each time.
  state       jsonb       not null,
  -- When true, every authenticated user can read the row (shareable
  -- URLs). When false, only the owner sees it. Owner can always edit.
  is_shared   boolean     not null default true,
  created_by  uuid        references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_scenario_views_created_by
  on public.scenario_views (created_by);
create index if not exists idx_scenario_views_updated_at
  on public.scenario_views (updated_at desc);

alter table public.scenario_views enable row level security;

drop policy if exists "Scenario views readable by owner or shared"
  on public.scenario_views;
DROP POLICY IF EXISTS "Scenario views readable by owner or shared" ON public.scenario_views;
create policy "Scenario views readable by owner or shared"
  on public.scenario_views for select using (
    auth.uid() is not null and (is_shared = true or created_by = auth.uid())
  );

drop policy if exists "Authenticated users can create scenario views"
  on public.scenario_views;
DROP POLICY IF EXISTS "Authenticated users can create scenario views" ON public.scenario_views;
create policy "Authenticated users can create scenario views"
  on public.scenario_views for insert
  with check (auth.uid() is not null and (created_by is null or created_by = auth.uid()));

drop policy if exists "Owner can update own scenario views"
  on public.scenario_views;
DROP POLICY IF EXISTS "Owner can update own scenario views" ON public.scenario_views;
create policy "Owner can update own scenario views"
  on public.scenario_views for update using (created_by = auth.uid());

drop policy if exists "Owner can delete own scenario views"
  on public.scenario_views;
DROP POLICY IF EXISTS "Owner can delete own scenario views" ON public.scenario_views;
create policy "Owner can delete own scenario views"
  on public.scenario_views for delete using (created_by = auth.uid());


-- ----------------------------------------------------------------------------
-- 021_news_shared_reading_list.sql
-- ----------------------------------------------------------------------------

-- 021_news_shared_reading_list.sql
--
-- Server-back the Secretariat News "Shared reading list" + its upvotes.
--
-- Until now both the items and the upvote count lived in localStorage
-- under `nf-shared-reading-list`. That meant:
--
--   • One person adds an item — nobody else ever sees it.
--   • Upvotes are a per-browser tally, so the count is meaningless.
--   • A browser clear / different device wipes everything.
--
-- This migration moves the shared list behind Supabase. The personal
-- reading list (`nf-reading-list`) stays in localStorage — it is per-
-- user-per-browser by design and not subject to the same loss class.
--
-- Idempotent: safe to re-run.

create extension if not exists "pgcrypto";

create table if not exists public.shared_reading_list_items (
  id            uuid        primary key default gen_random_uuid(),
  title         text        not null,
  authors       text        not null default '',
  url           text        not null default '',
  doi           text        default '',
  kind          text        not null default 'paper'
                  check (kind in ('paper','report','book','article','news','other')),
  priority      text        not null default 'important'
                  check (priority in ('must-read','important','nice-to-have')),
  notes         text        not null default '',
  source_type   text        default '',
  reference_id  text        default '',
  added_by      uuid        references auth.users(id) on delete set null,
  added_by_name text        not null default 'Anonymous',
  added_at      timestamptz not null default now()
);

create index if not exists idx_shared_reading_list_added_at
  on public.shared_reading_list_items (added_at desc);

alter table public.shared_reading_list_items enable row level security;

drop policy if exists "Shared reading list readable by authenticated"
  on public.shared_reading_list_items;
DROP POLICY IF EXISTS "Shared reading list readable by authenticated" ON public.shared_reading_list_items;
create policy "Shared reading list readable by authenticated"
  on public.shared_reading_list_items for select using (auth.uid() is not null);

drop policy if exists "Authenticated users can add to shared reading list"
  on public.shared_reading_list_items;
DROP POLICY IF EXISTS "Authenticated users can add to shared reading list" ON public.shared_reading_list_items;
create policy "Authenticated users can add to shared reading list"
  on public.shared_reading_list_items for insert
  with check (auth.uid() is not null and (added_by is null or added_by = auth.uid()));

-- Anyone signed in can edit the metadata (notes / priority); the
-- adder column does NOT change. This mirrors the editorial-shared-table
-- semantics already used by `connection_overrides`.
drop policy if exists "Authenticated users can update shared reading list"
  on public.shared_reading_list_items;
DROP POLICY IF EXISTS "Authenticated users can update shared reading list" ON public.shared_reading_list_items;
create policy "Authenticated users can update shared reading list"
  on public.shared_reading_list_items for update using (auth.uid() is not null);

drop policy if exists "Adder or admin can delete shared reading list items"
  on public.shared_reading_list_items;
DROP POLICY IF EXISTS "Adder or admin can delete shared reading list items" ON public.shared_reading_list_items;
create policy "Adder or admin can delete shared reading list items"
  on public.shared_reading_list_items for delete using (
    added_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ── upvotes ─────────────────────────────────────────────────────────────────
-- One row per (item, user) pair. Existence-of-row encodes the upvote;
-- counting is a simple GROUP BY at read time. No "downvotes" — the UI
-- is a binary toggle.
create table if not exists public.shared_reading_list_upvotes (
  item_id    uuid        not null references public.shared_reading_list_items(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  voted_at   timestamptz not null default now(),
  primary key (item_id, user_id)
);

create index if not exists idx_shared_reading_list_upvotes_item
  on public.shared_reading_list_upvotes (item_id);

alter table public.shared_reading_list_upvotes enable row level security;

drop policy if exists "Upvotes readable by authenticated"
  on public.shared_reading_list_upvotes;
DROP POLICY IF EXISTS "Upvotes readable by authenticated" ON public.shared_reading_list_upvotes;
create policy "Upvotes readable by authenticated"
  on public.shared_reading_list_upvotes for select using (auth.uid() is not null);

drop policy if exists "Users can manage their own upvotes"
  on public.shared_reading_list_upvotes;
DROP POLICY IF EXISTS "Users can manage their own upvotes" ON public.shared_reading_list_upvotes;
create policy "Users can manage their own upvotes"
  on public.shared_reading_list_upvotes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove their own upvotes"
  on public.shared_reading_list_upvotes;
DROP POLICY IF EXISTS "Users can remove their own upvotes" ON public.shared_reading_list_upvotes;
create policy "Users can remove their own upvotes"
  on public.shared_reading_list_upvotes for delete using (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 022_news_saved_searches.sql
-- ----------------------------------------------------------------------------

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
DROP POLICY IF EXISTS "Users read their own saved searches" ON public.news_saved_searches;
create policy "Users read their own saved searches"
  on public.news_saved_searches for select using (user_id = auth.uid());

drop policy if exists "Users insert their own saved searches"
  on public.news_saved_searches;
DROP POLICY IF EXISTS "Users insert their own saved searches" ON public.news_saved_searches;
create policy "Users insert their own saved searches"
  on public.news_saved_searches for insert
  with check (user_id = auth.uid());

drop policy if exists "Users update their own saved searches"
  on public.news_saved_searches;
DROP POLICY IF EXISTS "Users update their own saved searches" ON public.news_saved_searches;
create policy "Users update their own saved searches"
  on public.news_saved_searches for update using (user_id = auth.uid());

drop policy if exists "Users delete their own saved searches"
  on public.news_saved_searches;
DROP POLICY IF EXISTS "Users delete their own saved searches" ON public.news_saved_searches;
create policy "Users delete their own saved searches"
  on public.news_saved_searches for delete using (user_id = auth.uid());


-- ----------------------------------------------------------------------------
-- 023_user_preferences.sql
-- ----------------------------------------------------------------------------

-- 023_user_preferences.sql
--
-- Per-user UI / UX preferences.
--
-- Backs the /profile/preferences panel and the global PreferencesProvider.
-- All keys default to "system" / "off" so existing users notice no change
-- on rollout. Local-only preferences live in localStorage; this table holds
-- the durable, cross-device subset.
--
-- Idempotent: safe to re-run.

create extension if not exists "pgcrypto";

create table if not exists public.user_preferences (
  user_id              uuid        primary key references auth.users(id) on delete cascade,
  -- 'system' | 'light' | 'dark'
  theme                text        not null default 'system',
  -- 'comfortable' | 'compact'
  density              text        not null default 'comfortable',
  -- 'immediate' | 'daily' | 'weekly' | 'off'
  notify_frequency     text        not null default 'immediate',
  -- master switch for the (future) email digest cron
  email_digest         boolean     not null default false,
  -- 'apa' | 'chicago' | 'harvard' | 'bibtex' (default M·01 export style)
  default_citation     text        not null default 'apa',
  -- ISO 639-1 language code for AI summaries
  ai_summary_language  text        not null default 'en',
  -- whether the user has dismissed the onboarding tour for each module
  -- shape: { "references": true, "scenarios": false, ... }
  onboarding_seen      jsonb       not null default '{}'::jsonb,
  -- whether keyboard shortcuts are enabled
  shortcuts_enabled    boolean     not null default true,
  -- whether the user has opted into the public contributor leaderboard
  public_profile       boolean     not null default false,
  updated_at           timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "Users read their own preferences"
  on public.user_preferences;
DROP POLICY IF EXISTS "Users read their own preferences" ON public.user_preferences;
create policy "Users read their own preferences"
  on public.user_preferences for select using (user_id = auth.uid());

drop policy if exists "Users insert their own preferences"
  on public.user_preferences;
DROP POLICY IF EXISTS "Users insert their own preferences" ON public.user_preferences;
create policy "Users insert their own preferences"
  on public.user_preferences for insert
  with check (user_id = auth.uid());

drop policy if exists "Users update their own preferences"
  on public.user_preferences;
DROP POLICY IF EXISTS "Users update their own preferences" ON public.user_preferences;
create policy "Users update their own preferences"
  on public.user_preferences for update using (user_id = auth.uid());

-- For #18 leaderboard: allow everyone to read display name + role of users
-- who have opted into public profile. We expose this through a SECURITY
-- DEFINER function rather than relaxing RLS on `profiles`.
create or replace function public.user_has_public_profile(uid uuid)
returns boolean
language sql stable
as $$
  select coalesce((select public_profile from public.user_preferences where user_id = uid), false);
$$;


-- ----------------------------------------------------------------------------
-- 024_workspaces_collections_history.sql
-- ----------------------------------------------------------------------------

-- 024_workspaces_collections_history.sql
--
-- Schema for several brainstorm features:
--   #3  team workspaces (shared research projects)
--   #13 personal cross-module collections
--   #20 change-history timeline on editable artefacts
--   #17 polymorphic inline annotations on any text view
--
-- All RLS-locked: every row references either auth.uid() (personal)
-- or a workspace membership row.
--
-- Idempotent: safe to re-run.

create extension if not exists "pgcrypto";

-- ─── #3 Team Workspaces ─────────────────────────────────────────────────────

create table if not exists public.workspaces (
  id          uuid        primary key default gen_random_uuid(),
  owner_id    uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,
  description text        not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid       not null references public.workspaces(id) on delete cascade,
  user_id      uuid       not null references auth.users(id) on delete cascade,
  -- 'owner' | 'editor' | 'viewer'
  role         text       not null default 'editor',
  added_at     timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.workspace_items (
  id           uuid       primary key default gen_random_uuid(),
  workspace_id uuid       not null references public.workspaces(id) on delete cascade,
  -- 'reference' | 'policy' | 'news' | 'scenario_view' | 'segment'
  kind         text       not null,
  ref_id       text       not null,
  note         text       not null default '',
  added_by     uuid       not null references auth.users(id) on delete cascade,
  added_at     timestamptz not null default now(),
  unique (workspace_id, kind, ref_id)
);

create index if not exists idx_workspace_items_ws on public.workspace_items (workspace_id, added_at desc);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_items enable row level security;

-- Members can read; owners can insert/update/delete; new workspaces are
-- created with the creator as their first 'owner' membership row.
drop policy if exists "Workspace member read" on public.workspaces;
DROP POLICY IF EXISTS "Workspace member read" ON public.workspaces;
create policy "Workspace member read" on public.workspaces for select using (
  id in (select workspace_id from public.workspace_members where user_id = auth.uid())
);
drop policy if exists "Workspace owner write" on public.workspaces;
DROP POLICY IF EXISTS "Workspace owner write" ON public.workspaces;
create policy "Workspace owner write" on public.workspaces for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Workspace member listing" on public.workspace_members;
DROP POLICY IF EXISTS "Workspace member listing" ON public.workspace_members;
create policy "Workspace member listing" on public.workspace_members for select using (
  workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid())
);
drop policy if exists "Workspace owner manages members" on public.workspace_members;
DROP POLICY IF EXISTS "Workspace owner manages members" ON public.workspace_members;
create policy "Workspace owner manages members" on public.workspace_members for all using (
  workspace_id in (select id from public.workspaces where owner_id = auth.uid())
) with check (
  workspace_id in (select id from public.workspaces where owner_id = auth.uid())
);

drop policy if exists "Workspace member reads items" on public.workspace_items;
DROP POLICY IF EXISTS "Workspace member reads items" ON public.workspace_items;
create policy "Workspace member reads items" on public.workspace_items for select using (
  workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid())
);
drop policy if exists "Workspace member writes items" on public.workspace_items;
DROP POLICY IF EXISTS "Workspace member writes items" ON public.workspace_items;
create policy "Workspace member writes items" on public.workspace_items for all using (
  workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid() and role in ('owner','editor'))
) with check (
  workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid() and role in ('owner','editor'))
);

-- ─── #13 Personal Collections ───────────────────────────────────────────────

create table if not exists public.collections (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,
  emoji       text        not null default '📁',
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.collection_items (
  id            uuid        primary key default gen_random_uuid(),
  collection_id uuid        not null references public.collections(id) on delete cascade,
  user_id       uuid        not null references auth.users(id) on delete cascade,
  kind          text        not null,    -- 'reference' | 'policy' | 'news' | 'segment'
  ref_id        text        not null,
  added_at      timestamptz not null default now(),
  unique (collection_id, kind, ref_id)
);

create index if not exists idx_collection_items_user on public.collection_items (user_id, added_at desc);

alter table public.collections enable row level security;
alter table public.collection_items enable row level security;

drop policy if exists "Users own their collections" on public.collections;
DROP POLICY IF EXISTS "Users own their collections" ON public.collections;
create policy "Users own their collections" on public.collections for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users own their collection items" on public.collection_items;
DROP POLICY IF EXISTS "Users own their collection items" ON public.collection_items;
create policy "Users own their collection items" on public.collection_items for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── #20 Change-history timeline ────────────────────────────────────────────
-- Polymorphic audit log of artefact edits. `artefact_kind` is one of
-- 'connection' | 'code' | 'annotation' | 'policy_review' (extendable).
-- `before` / `after` are snapshot JSON blobs the application interprets.

create table if not exists public.artefact_history (
  id            uuid        primary key default gen_random_uuid(),
  artefact_kind text        not null,
  artefact_id   text        not null,
  user_id       uuid        references auth.users(id) on delete set null,
  reason        text        not null default '',
  before        jsonb       not null default '{}'::jsonb,
  after         jsonb       not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_artefact_history_target on public.artefact_history (artefact_kind, artefact_id, created_at desc);

alter table public.artefact_history enable row level security;

-- Anyone authenticated can read the history of any artefact (it's audit
-- data); writers are limited to authenticated users so anon CSRF can't
-- pollute the log.
drop policy if exists "Authenticated read history" on public.artefact_history;
DROP POLICY IF EXISTS "Authenticated read history" ON public.artefact_history;
create policy "Authenticated read history" on public.artefact_history for select
  using (auth.role() = 'authenticated');
drop policy if exists "Authenticated insert history" on public.artefact_history;
DROP POLICY IF EXISTS "Authenticated insert history" ON public.artefact_history;
create policy "Authenticated insert history" on public.artefact_history for insert
  with check (auth.role() = 'authenticated' and user_id = auth.uid());

-- ─── #17 Polymorphic inline annotations ─────────────────────────────────────
-- Today annotations only attach to PDFs. This generalised store lets the
-- M·03 news cards and M·04 policy article views emit highlights too.

create table if not exists public.text_annotations (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  -- Kind of host artefact: 'news' | 'policy_article' | 'reference_abstract'
  host_kind   text        not null,
  host_id     text        not null,
  -- The exact substring the user highlighted, plus a small offset so we
  -- can re-anchor if the host text is reflowed.
  selected    text        not null,
  offset_hint int         not null default 0,
  note        text        not null default '',
  workspace_id uuid       references public.workspaces(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_text_annotations_host on public.text_annotations (host_kind, host_id, created_at desc);
create index if not exists idx_text_annotations_user on public.text_annotations (user_id, created_at desc);

alter table public.text_annotations enable row level security;

-- Personal annotations are private unless attached to a workspace, in
-- which case all members of that workspace can read.
drop policy if exists "Read own or workspace annotations" on public.text_annotations;
DROP POLICY IF EXISTS "Read own or workspace annotations" ON public.text_annotations;
create policy "Read own or workspace annotations" on public.text_annotations for select using (
  user_id = auth.uid()
  or (workspace_id is not null
      and workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()))
);
drop policy if exists "Insert own annotations" on public.text_annotations;
DROP POLICY IF EXISTS "Insert own annotations" ON public.text_annotations;
create policy "Insert own annotations" on public.text_annotations for insert with check (user_id = auth.uid());
drop policy if exists "Update own annotations" on public.text_annotations;
DROP POLICY IF EXISTS "Update own annotations" ON public.text_annotations;
create policy "Update own annotations" on public.text_annotations for update using (user_id = auth.uid());
drop policy if exists "Delete own annotations" on public.text_annotations;
DROP POLICY IF EXISTS "Delete own annotations" ON public.text_annotations;
create policy "Delete own annotations" on public.text_annotations for delete using (user_id = auth.uid());


-- ----------------------------------------------------------------------------
-- 025_references_funding.sql
-- ----------------------------------------------------------------------------

-- 025: add funding metadata to references.
--
-- Funding entries follow the CrossRef shape (name + DOI prefix + award list).
-- We lift it out of csl_json into its own column so we can aggregate the
-- "EU-funded share" of a report library cheaply via a GIN index, instead of
-- scanning every csl_json blob.
--
-- Existing rows backfill from csl_json->'funder' so DOI-imported references
-- pick up funding info without a re-import.

ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS funding JSONB;

UPDATE public.references
SET funding = csl_json -> 'funder'
WHERE funding IS NULL
  AND csl_json ? 'funder';

CREATE INDEX IF NOT EXISTS references_funding_idx
  ON public.references USING gin (funding);


-- ----------------------------------------------------------------------------
-- 026_policy_clock_events_policy_id.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 026 — Universal policy id on Policy Clock events
--
-- Adds a `policy_id` column to `public.policy_clock_events` so a user-added
-- timeline event can be linked back to a tracked policy. The id matches
-- `Policy.id` in `src/data/policies.ts` (e.g. 'eu-climate-law', 'cbam-regulation')
-- and is the same identifier used by the Policy Navigator, the Content
-- Analysis module, and the synthetic policy citations in the Reference
-- Manager. This is what makes a Policy Clock event clickable through to
-- every other module that shares the same policy corpus.
--
-- The column is nullable because not every event is policy-specific
-- (general Council agenda items, Commission communications, etc.).
-- ============================================================================

alter table public.policy_clock_events
  add column if not exists policy_id text;

create index if not exists idx_policy_clock_events_policy_id
  on public.policy_clock_events (policy_id)
  where policy_id is not null;


-- ----------------------------------------------------------------------------
-- 027_content_analysis_project_locks.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 027 — Project locks (soft-locking for collaborative content analysis)
--
-- Soft locking is the "one editor at a time per project" model. While a
-- holder is in the row, other workbench tabs render the project read-only
-- with a "Request edit access" button.
--
-- Lifecycle:
--   • Acquire — POST /api/content-analysis/locks  (insert if no row, or
--               steal if heartbeat is older than STALE_AFTER_SECONDS).
--   • Heartbeat — PATCH /api/content-analysis/locks every ~30s while the
--               editor tab is alive. Updates `heartbeat_at`.
--   • Release — DELETE /api/content-analysis/locks (sendBeacon on tab
--               close), or implicit when heartbeat times out.
--
-- The table is intentionally tiny (one row per project at most). It does
-- not store edit history — every successful mutation already lands in
-- the existing content_analysis_segments / content_codes tables.
-- ============================================================================

create table if not exists public.content_analysis_project_locks (
  project_id   text primary key,
  -- Stable per-browser identifier from the client. Today the workbench
  -- generates a uuid in localStorage and ships it via the X-MH-Client-Id
  -- header; once OIDC lands this column carries the OIDC `sub` instead
  -- (no schema change — same string id semantics).
  holder_id    text not null,
  -- Human label shown in the lock pill ("Alice", "Bob's tablet").
  -- Kept denormalised because there's no users table when the workbench
  -- runs without auth.
  holder_name  text not null,
  acquired_at  timestamptz not null default now(),
  heartbeat_at timestamptz not null default now(),
  -- Pending hand-off request from a watcher. The watcher's display name
  -- gets parked here when they POST to acquire while the lock is held;
  -- the holder's next heartbeat returns it so the UI can show "Bob is
  -- asking for the lock — hand off?". Cleared when the lock is released
  -- (or stolen, or handed off).
  request_pending  text,
  requested_at     timestamptz
);

-- For older instances that already created the table without the
-- request columns, add them on re-run. Idempotent.
alter table public.content_analysis_project_locks
  add column if not exists request_pending text;
alter table public.content_analysis_project_locks
  add column if not exists requested_at timestamptz;

create index if not exists idx_ca_locks_heartbeat
  on public.content_analysis_project_locks (heartbeat_at);

alter table public.content_analysis_project_locks enable row level security;

-- Reads are public — every workbench tab needs to see the current holder
-- to decide whether to render the disabled banner. Writes are
-- service-role-only and gated by the API route.
drop policy if exists "Project locks are viewable by everyone"
  on public.content_analysis_project_locks;
DROP POLICY IF EXISTS "Project locks are viewable by everyone" ON public.content_analysis_project_locks;
create policy "Project locks are viewable by everyone"
  on public.content_analysis_project_locks for select using (true);



-- ----------------------------------------------------------------------------
-- 028_citations_used.sql
-- ----------------------------------------------------------------------------

-- 028: track citation insertions ("citations_used") + funding on custom_references.
--
-- Two bits of bookkeeping rolled into one migration because they answer the
-- same question: "how many of the references cited in our reports are EU-
-- funded?"
--
--   1. `custom_references.funding` lets the inline Reference Manager save the
--      Crossref funder array the same way the production `references` table
--      does (see migration 025). Without this, references added via the web
--      app or the Word VBA bridge had no way to carry funding metadata.
--
--   2. `citations_used` is a thin event log: every time the Word add-in
--      inserts a citation, it appends a row here with the reference id, the
--      Word document id, and (when set) the active Report Plan. Aggregating
--      this table by funding gives us the EU-funded share per report.
--
-- The Word add-in already pins the active Report Plan to a per-document
-- setting (`Office.context.document.settings`); the add-in passes both the
-- document id and the plan id when it logs an insertion.
--
-- Idempotent.

-- ── 1. funding column on custom_references ──────────────────────────────────

alter table public.custom_references
  add column if not exists funding jsonb;

create index if not exists idx_custom_references_funding
  on public.custom_references using gin (funding);

-- ── 2. citations_used event log ─────────────────────────────────────────────

create table if not exists public.citations_used (
  id            uuid primary key default gen_random_uuid(),
  -- reference_id is intentionally text (not a foreign key): it can point at
  -- either `references.id` (uuid) or `custom_references.id` (text), and the
  -- add-in does not always know which store the citation came from.
  reference_id  text        not null,
  -- Word's per-document persistent id (Office.context.document.url or a
  -- generated guid stored alongside the plan in document settings). The add-
  -- in is responsible for stability across saves.
  document_key  text        not null,
  -- Optional Report Plan id the document is scoped to. Lets us report
  -- "EU-funded share for plan X" without scanning every document.
  plan_id       text,
  -- Snapshot fields so analytics queries don't have to join across
  -- references / custom_references at read time.
  doi           text,
  funding       jsonb,
  inserted_by   uuid        references auth.users(id) on delete set null,
  inserted_at   timestamptz not null default now()
);

create index if not exists idx_citations_used_reference_id
  on public.citations_used (reference_id);
create index if not exists idx_citations_used_document_key
  on public.citations_used (document_key);
create index if not exists idx_citations_used_plan_id
  on public.citations_used (plan_id) where plan_id is not null;
create index if not exists idx_citations_used_funding
  on public.citations_used using gin (funding);

alter table public.citations_used enable row level security;

-- Authenticated staff can read the log (analytics dashboards).
drop policy if exists "Citations used readable by authenticated" on public.citations_used;
DROP POLICY IF EXISTS "Citations used readable by authenticated" ON public.citations_used;
create policy "Citations used readable by authenticated"
  on public.citations_used for select using (auth.uid() is not null);

-- Authenticated users can record their own insertions; service role (used by
-- the bridge / Next.js API) bypasses RLS.
drop policy if exists "Authenticated users can record citation usage" on public.citations_used;
DROP POLICY IF EXISTS "Authenticated users can record citation usage" ON public.citations_used;
create policy "Authenticated users can record citation usage"
  on public.citations_used for insert
  with check (auth.uid() is not null and (inserted_by is null or inserted_by = auth.uid()));


-- ----------------------------------------------------------------------------
-- 029_voting_tool.sql
-- ----------------------------------------------------------------------------

-- 029: Voting Tool (M·06) — votes, single-use tokens, ballots.
--
-- Stores polls created by MethodHub users plus the ballots submitted by
-- externals via /vote/<token>. Three tables:
--
--   votes        — config + options (jsonb) for each poll.
--   vote_tokens  — single-use credentials. The raw token IS the credential;
--                  we keep it server-side but RLS denies all client reads.
--   ballots      — submitted responses. In anonymous mode `token_id` is
--                  NULL and only `token_fingerprint` (sha256 of voteId+token)
--                  is stored, so admins cannot link a ballot to a token.
--
-- Authorisation model
-- -------------------
-- Every voting endpoint runs server-side using the service-role key, so it
-- bypasses RLS. We still enable RLS on every table and ship NO permissive
-- policies, which means the anon and authenticated roles cannot reach these
-- rows from the browser. Belt-and-braces against accidental client reads.
--
-- Idempotent.

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
  -- token_id is NULL in anonymous mode so a ballot cannot be linked to a
  -- specific participant. Non-anonymous votes keep it for admin attribution.
  token_id text references public.vote_tokens(token) on delete set null,
  -- sha256(voteId || ' ' || token). Used to enforce single-use without
  -- revealing which token was redeemed.
  token_fingerprint text not null,
  submitted_at timestamptz not null default now()
);

create index if not exists idx_ballots_vote on public.ballots(vote_id);
-- NOTE: migration 029 originally created this as a UNIQUE index. Migration
-- 030 (shared tokens) drops it because shared tokens legitimately produce
-- many ballots with the same (vote_id, token_fingerprint). When re-running
-- this combined file against a database that has accumulated such rows,
-- the UNIQUE creation would fail. Create a non-unique index instead — the
-- subsequent DROP INDEX IF EXISTS in 030 still applies, and the final
-- database state is identical.
create index if not exists ux_ballots_vote_fingerprint
  on public.ballots(vote_id, token_fingerprint);

-- updated_at trigger for votes ------------------------------------------------
create or replace function public.touch_votes_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_votes_updated_at on public.votes;
create trigger trg_votes_updated_at
  before update on public.votes
  for each row execute procedure public.touch_votes_updated_at();

-- RLS: lock everything down. Server reaches these tables via the service-role
-- key which bypasses RLS; no other role gets access.
alter table public.votes        enable row level security;
alter table public.vote_tokens  enable row level security;
alter table public.ballots      enable row level security;

-- Drop any policies that may have been created in earlier dev runs, so this
-- migration is safe to re-apply.
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

-- Seed: ABmeeting38 Topical Vote ----------------------------------------------
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


-- ----------------------------------------------------------------------------
-- 030_voting_shared_tokens.sql
-- ----------------------------------------------------------------------------

-- 030: Voting Tool — shared (multi-use) tokens.
--
-- Adds support for "universal" voting links: a single token that any number
-- of participants can use to submit a ballot, instead of pre-minting one
-- single-use token per participant.
--
-- Approach
-- --------
--   * `vote_tokens.max_uses` — null means unlimited; an integer caps the
--     number of ballots that can be submitted via this token. Existing
--     rows default to `1` (single-use), preserving prior semantics.
--   * `vote_tokens.use_count` — atomic counter, incremented on every
--     successful submission. Combined with `max_uses` in a single
--     UPDATE … WHERE clause, this gives us a race-free reservation.
--   * The `(vote_id, token_fingerprint)` unique index on `ballots` is
--     dropped: a shared token legitimately produces many ballots, all of
--     which share the same fingerprint. Single-use is now enforced
--     entirely by the atomic `use_count < max_uses` update on the token
--     row, which is sufficient.
--
-- Idempotent.

alter table public.vote_tokens
  add column if not exists max_uses int default 1,
  add column if not exists use_count int not null default 0;

-- The `default 1` above backfills every existing row with max_uses=1, so
-- pre-migration tokens keep their single-use semantics. New shared tokens
-- are minted with max_uses=null (unlimited) explicitly.

drop index if exists public.ux_ballots_vote_fingerprint;


-- ----------------------------------------------------------------------------
-- 031_voting_reset_epoch.sql
-- ----------------------------------------------------------------------------

-- 031: Voting Tool — reset epoch.
--
-- Lets an admin "reset" a vote: drop every ballot, clear every token's
-- use_count, and force participants whose browsers had a localStorage
-- "already submitted" flag set to be allowed to vote again.
--
-- We can't reach into a participant's browser to clear localStorage, so we
-- version the flag instead: every ballot page reads `votes.reset_epoch`
-- and tags its localStorage key with that integer
-- (`esabcc-vote-submitted:<voteId>:<epoch>`). When the admin bumps the
-- epoch on the server, every existing browser flag is silently orphaned
-- and the page treats the participant as a fresh voter.
--
-- Idempotent.

alter table public.votes
  add column if not exists reset_epoch int not null default 0;


-- ----------------------------------------------------------------------------
-- 032_voting_ranking_systems.sql
-- ----------------------------------------------------------------------------

-- 032: Voting Tool — add `average_ranking` and `ranked_voting` voting systems.
--
-- Extends the check constraint on `votes.voting_system` so polls can be saved
-- with the two ranking-based systems exposed in the vote builder:
--
--   average_ranking — voters order all options 1..N; result is the mean rank
--                     per option (lower = stronger preference).
--   ranked_voting   — instant-runoff: each round counts top-remaining
--                     preferences and eliminates the lowest until a majority
--                     winner emerges.
--
-- Idempotent: drops the prior constraint (whatever its current shape) and
-- recreates it with the expanded value list.

alter table public.votes
  drop constraint if exists votes_voting_system_check;

alter table public.votes
  add constraint votes_voting_system_check
  check (voting_system in (
    'priority_ranking',
    'single_choice',
    'multi_choice',
    'approval',
    'star',
    'average_ranking',
    'ranked_voting'
  ));


-- ----------------------------------------------------------------------------
-- 033_climate_councils.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 033 — EU Climate Councils
--
-- Stores the catalogue of climate advisory councils across the EU27,
-- candidate / accession countries and selected sub-national bodies, as
-- mapped in the May 2026 "Mapping of climate advisory councils in Europe"
-- overview. The table is the single source of truth backing the
-- /eu-climate-councils page (list + Leaflet map + edit panel).
--
-- One row per body. The page seeds the table with the 67 bodies on first
-- load if the table is empty; subsequent edits made by signed-in users
-- are persisted here.
-- ============================================================================

create table if not exists public.climate_councils (
  id              text primary key,                -- stable slug, e.g. 'fr-hcc'
  country_code    text not null,                   -- ISO-2 country (or 'EU' for the EU body)
  country_name    text not null,
  body_name       text not null,                   -- English-language name
  body_original   text not null default '',        -- original-language name
  level           text not null default 'national',-- 'eu' | 'national' | 'subnational'
  region          text not null default '',        -- sub-national region (Vienna, Catalonia, etc.)
  status          text not null default 'active_statutory'
                  check (status in (
                    'active_statutory',
                    'active_no_statute',
                    'inter_ministerial',
                    'partial_proxy',
                    'legislated_not_operational',
                    'dormant',
                    'abolished',
                    'none'
                  )),
  established     text not null default '',        -- free-text year/period
  statutory       text not null default '',        -- 'Yes' | 'Secondary' | 'No' | ''
  url             text not null default '',        -- official website
  legal_basis_url text not null default '',
  notes           text not null default '',        -- mandate / notable features (markdown ok)
  lat             double precision,                -- map pin latitude
  lon             double precision,                -- map pin longitude
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_climate_councils_country on public.climate_councils (country_code);
create index if not exists idx_climate_councils_status  on public.climate_councils (status);
create index if not exists idx_climate_councils_level   on public.climate_councils (level);

-- Auto-bump updated_at on edit.
create or replace function public.climate_councils_touch_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists climate_councils_touch on public.climate_councils;
create trigger climate_councils_touch
  before update on public.climate_councils
  for each row execute function public.climate_councils_touch_updated_at();

alter table public.climate_councils enable row level security;

-- Public read: the catalogue is openly browsable.
drop policy if exists "Climate councils are viewable by everyone" on public.climate_councils;
DROP POLICY IF EXISTS "Climate councils are viewable by everyone" ON public.climate_councils;
create policy "Climate councils are viewable by everyone"
  on public.climate_councils for select using (true);

-- Authenticated users can edit / add / delete entries (curation model
-- mirrors references and policy clock — anyone signed in can contribute,
-- admins moderate via the audit log).
drop policy if exists "Authenticated users can insert climate councils" on public.climate_councils;
DROP POLICY IF EXISTS "Authenticated users can insert climate councils" ON public.climate_councils;
create policy "Authenticated users can insert climate councils"
  on public.climate_councils for insert with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update climate councils" on public.climate_councils;
DROP POLICY IF EXISTS "Authenticated users can update climate councils" ON public.climate_councils;
create policy "Authenticated users can update climate councils"
  on public.climate_councils for update using (auth.uid() is not null);

drop policy if exists "Authenticated users can delete climate councils" on public.climate_councils;
DROP POLICY IF EXISTS "Authenticated users can delete climate councils" ON public.climate_councils;
create policy "Authenticated users can delete climate councils"
  on public.climate_councils for delete using (auth.uid() is not null);


-- ----------------------------------------------------------------------------
-- 033_connection_assignments.sql
-- ----------------------------------------------------------------------------

-- Migration 033: connection_assignments
-- Tracks which reviewer a connection has been assigned to for review.
-- Independent of verification status so assignments survive approve/reject actions.

create table if not exists public.connection_assignments (
  connection_id   integer      not null primary key,
  assignee_user_id uuid        references auth.users(id) on delete set null,
  assignee_name   text         not null,
  assigned_by     uuid         references auth.users(id) on delete set null,
  assigned_at     timestamptz  not null default now()
);

alter table public.connection_assignments enable row level security;

-- All authenticated users can read assignments (shared editorial view).
DROP POLICY IF EXISTS "conn_assign_read" ON public.connection_assignments;
create policy "conn_assign_read" on public.connection_assignments
  for select using (auth.role() = 'authenticated');

-- All authenticated users can insert / update / delete assignments.
DROP POLICY IF EXISTS "conn_assign_write" ON public.connection_assignments;
create policy "conn_assign_write" on public.connection_assignments
  for all using (auth.role() = 'authenticated');

create index if not exists connection_assignments_assignee_idx
  on public.connection_assignments (assignee_user_id);


-- ----------------------------------------------------------------------------
-- 034_voting_runoff_systems_safety.sql
-- ----------------------------------------------------------------------------

-- 034: Voting Tool — re-apply the voting_system check constraint.
--
-- Migration 032 first added `average_ranking` and `ranked_voting` to the
-- allow-list on `votes.voting_system`. Some deployments missed that
-- migration, so "Find clear winner" — which now defaults to
-- `average_ranking` — fails with `votes_voting_system_check`. This file
-- is an idempotent safety re-apply: drop the constraint (whatever its
-- current shape) and recreate it with the full set of values the app
-- actually writes today.
--
-- Safe to run repeatedly. If 032 has already been applied, this is a
-- no-op in effect.

alter table public.votes
  drop constraint if exists votes_voting_system_check;

alter table public.votes
  add constraint votes_voting_system_check
  check (voting_system in (
    'priority_ranking',
    'single_choice',
    'multi_choice',
    'approval',
    'star',
    'average_ranking',
    'ranked_voting'
  ));


-- ----------------------------------------------------------------------------
-- 035_climate_councils_custom_fields.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 035 — climate_councils.custom_fields
--
-- Adds a free-form jsonb column for curator-added key/value pairs.
-- The union of keys used across all rows defines the optional fields
-- offered to every body in the edit UI ("Add field" / "More fields").
-- ============================================================================

alter table public.climate_councils
  add column if not exists custom_fields jsonb not null default '{}'::jsonb;


-- ----------------------------------------------------------------------------
-- 036_annotations_collaborative_editing.sql
-- ----------------------------------------------------------------------------

-- Allow any authenticated user to update or delete any annotation.
-- Annotations are a collaborative tool used by a closed team; restricting
-- edits to the original author makes them unwieldy in practice.

drop policy if exists "Users can update own annotations" on public.annotations;
DROP POLICY IF EXISTS "Authenticated users can update annotations" ON public.annotations;
create policy "Authenticated users can update annotations"
  on public.annotations for update
  using (auth.uid() is not null);

drop policy if exists "Users can delete own annotations" on public.annotations;
DROP POLICY IF EXISTS "Authenticated users can delete annotations" ON public.annotations;
create policy "Authenticated users can delete annotations"
  on public.annotations for delete
  using (auth.uid() is not null);


-- ----------------------------------------------------------------------------
-- 037_recommendations.sql
-- ----------------------------------------------------------------------------

-- ── Recommendations module ───────────────────────────────────────────────────
-- Stores Advisory Board recommendations and their links to policies
-- (src/data/policies.ts ids) and Policy Gap indicators
-- (src/lib/scenarios/policy-gap.ts ids, e.g. 'o1-total-ghg').

create table if not exists public.recommendations (
  id                   uuid        primary key default gen_random_uuid(),
  report_title         text        not null,
  recommendation_number text       not null,
  year                 integer     not null,
  short_text           text        not null,
  full_text            text,
  justification        text,
  assessment           text,
  category             text,
  status               text        not null default 'not-implemented'
                                   check (status in (
                                     'not-implemented',
                                     'partially-implemented',
                                     'implemented',
                                     'ongoing'
                                   )),
  created_by           uuid        references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists public.recommendation_policy_links (
  recommendation_id uuid not null references public.recommendations(id) on delete cascade,
  policy_id         text not null,
  primary key (recommendation_id, policy_id)
);

create table if not exists public.recommendation_indicator_links (
  recommendation_id uuid not null references public.recommendations(id) on delete cascade,
  indicator_id      text not null,
  primary key (recommendation_id, indicator_id)
);

-- ── updated_at trigger ───────────────────────────────────────────────────────

create or replace function public.recommendations_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists trg_recommendations_updated_at on public.recommendations;
create trigger trg_recommendations_updated_at
  before update on public.recommendations
  for each row execute function public.recommendations_touch_updated_at();

-- ── Row-level security ───────────────────────────────────────────────────────
-- Any authenticated user can read and write — the site is already private
-- and recommendations are a collaborative team resource.

alter table public.recommendations enable row level security;
alter table public.recommendation_policy_links enable row level security;
alter table public.recommendation_indicator_links enable row level security;

-- recommendations
DROP POLICY IF EXISTS "Authenticated users can read recommendations" ON public.recommendations;
create policy "Authenticated users can read recommendations"
  on public.recommendations for select to authenticated using (true);

DROP POLICY IF EXISTS "Authenticated users can insert recommendations" ON public.recommendations;
create policy "Authenticated users can insert recommendations"
  on public.recommendations for insert to authenticated
  with check (auth.uid() is not null);

DROP POLICY IF EXISTS "Authenticated users can update recommendations" ON public.recommendations;
create policy "Authenticated users can update recommendations"
  on public.recommendations for update to authenticated
  using (true) with check (true);

DROP POLICY IF EXISTS "Authenticated users can delete recommendations" ON public.recommendations;
create policy "Authenticated users can delete recommendations"
  on public.recommendations for delete to authenticated using (true);

-- policy links
DROP POLICY IF EXISTS "Authenticated users can read policy links" ON public.recommendation_policy_links;
create policy "Authenticated users can read policy links"
  on public.recommendation_policy_links for select to authenticated using (true);

DROP POLICY IF EXISTS "Authenticated users can insert policy links" ON public.recommendation_policy_links;
create policy "Authenticated users can insert policy links"
  on public.recommendation_policy_links for insert to authenticated
  with check (true);

DROP POLICY IF EXISTS "Authenticated users can delete policy links" ON public.recommendation_policy_links;
create policy "Authenticated users can delete policy links"
  on public.recommendation_policy_links for delete to authenticated using (true);

-- indicator links
DROP POLICY IF EXISTS "Authenticated users can read indicator links" ON public.recommendation_indicator_links;
create policy "Authenticated users can read indicator links"
  on public.recommendation_indicator_links for select to authenticated using (true);

DROP POLICY IF EXISTS "Authenticated users can insert indicator links" ON public.recommendation_indicator_links;
create policy "Authenticated users can insert indicator links"
  on public.recommendation_indicator_links for insert to authenticated
  with check (true);

DROP POLICY IF EXISTS "Authenticated users can delete indicator links" ON public.recommendation_indicator_links;
create policy "Authenticated users can delete indicator links"
  on public.recommendation_indicator_links for delete to authenticated using (true);


-- ----------------------------------------------------------------------------
-- 038_project_workspace.sql
-- ----------------------------------------------------------------------------

-- ─────────────────────────────────────────────────────────────────────────────
-- Project Workspace (M·19) — projects, modules, indicators, recommendations,
-- member-state matrix, sectoral-policy annotations.
--
-- All tables are scoped to a `project_id`. Authenticated users can read and
-- write everything (same posture as 037_recommendations.sql).
--
-- Seed data is inserted at the bottom of this file with `on conflict do nothing`
-- so the migration is idempotent — re-running it will not duplicate rows.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.pw_projects (
  id            text        primary key,
  name          text        not null,
  description   text        not null default '',
  is_seed       boolean     not null default false,
  created_by    uuid        references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.pw_modules (
  id            text        not null,
  project_id    text        not null references public.pw_projects(id) on delete cascade,
  kind          text        not null check (kind in (
                              'indicators',
                              'recommendations',
                              'member-states',
                              'policy-analysis',
                              'custom'
                            )),
  name          text        not null,
  description   text        not null default '',
  position      integer     not null default 0,
  is_seed       boolean     not null default false,
  created_at    timestamptz not null default now(),
  primary key (project_id, id)
);

create table if not exists public.pw_indicators (
  id            text        primary key,
  project_id    text        not null references public.pw_projects(id) on delete cascade,
  name          text        not null,
  category      text        not null,
  unit          text        not null,
  description   text        not null default '',
  source        text        not null default '',
  source_url    text        not null default '',
  direction     text        not null default 'down' check (direction in ('up','down')),
  target_value  double precision,
  target_year   integer,
  is_seed       boolean     not null default false,
  created_by    uuid        references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists pw_indicators_project_idx on public.pw_indicators(project_id);

create table if not exists public.pw_indicator_points (
  indicator_id  text        not null references public.pw_indicators(id) on delete cascade,
  year          integer     not null,
  value         double precision not null,
  updated_at    timestamptz not null default now(),
  primary key (indicator_id, year)
);

create table if not exists public.pw_recommendations (
  id            text        primary key,
  project_id    text        not null references public.pw_projects(id) on delete cascade,
  area          text        not null default '',
  title         text        not null,
  summary       text        not null default '',
  status        text        not null default 'not-addressed' check (status in (
                              'not-addressed','in-progress','partially','addressed'
                            )),
  is_seed       boolean     not null default false,
  created_by    uuid        references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists pw_recommendations_project_idx on public.pw_recommendations(project_id);

create table if not exists public.pw_recommendation_events (
  id              uuid        primary key default gen_random_uuid(),
  recommendation_id text      not null references public.pw_recommendations(id) on delete cascade,
  occurred_at     date        not null,
  note            text        not null,
  source_url      text        not null default '',
  created_by      uuid        references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists pw_rec_events_rec_idx on public.pw_recommendation_events(recommendation_id);

create table if not exists public.pw_member_state_cells (
  project_id    text        not null references public.pw_projects(id) on delete cascade,
  country_code  text        not null,
  sector_id     text        not null,
  status        text        not null default 'empty',
  note          text        not null default '',
  updated_by    uuid        references auth.users(id) on delete set null,
  updated_at    timestamptz not null default now(),
  primary key (project_id, country_code, sector_id)
);

-- Sectoral-overview annotations made from inside the workspace's
-- policy-analysis module. They are read by both the workspace and the
-- EU Policy Navigator's "Sectoral overview" tab so edits propagate.
create table if not exists public.pw_policy_annotations (
  id            uuid        primary key default gen_random_uuid(),
  project_id    text        not null references public.pw_projects(id) on delete cascade,
  policy_id     text        not null,
  -- 'approve' / 'disapprove' / 'fact-check' / 'edit' / 'comment'
  kind          text        not null check (kind in (
                              'approve','disapprove','fact-check','edit','comment'
                            )),
  field         text        not null default '',     -- e.g. 'meaning', 'currentRequirement'
  value         text        not null default '',     -- new text / fact-check verdict / comment body
  status        text        not null default 'open' check (status in ('open','resolved')),
  created_by    uuid        references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists pw_policy_ann_project_idx on public.pw_policy_annotations(project_id);
create index if not exists pw_policy_ann_policy_idx on public.pw_policy_annotations(policy_id);

-- ── updated_at triggers ──────────────────────────────────────────────────────
create or replace function public.pw_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists trg_pw_projects_updated_at on public.pw_projects;
create trigger trg_pw_projects_updated_at
  before update on public.pw_projects
  for each row execute function public.pw_touch_updated_at();

drop trigger if exists trg_pw_indicators_updated_at on public.pw_indicators;
create trigger trg_pw_indicators_updated_at
  before update on public.pw_indicators
  for each row execute function public.pw_touch_updated_at();

drop trigger if exists trg_pw_recommendations_updated_at on public.pw_recommendations;
create trigger trg_pw_recommendations_updated_at
  before update on public.pw_recommendations
  for each row execute function public.pw_touch_updated_at();

-- ── Row-level security ───────────────────────────────────────────────────────
alter table public.pw_projects                enable row level security;
alter table public.pw_modules                 enable row level security;
alter table public.pw_indicators              enable row level security;
alter table public.pw_indicator_points        enable row level security;
alter table public.pw_recommendations         enable row level security;
alter table public.pw_recommendation_events   enable row level security;
alter table public.pw_member_state_cells      enable row level security;
alter table public.pw_policy_annotations      enable row level security;

do $$
declare
  t text;
  tbls text[] := array[
    'pw_projects','pw_modules','pw_indicators','pw_indicator_points',
    'pw_recommendations','pw_recommendation_events','pw_member_state_cells',
    'pw_policy_annotations'
  ];
begin
  foreach t in array tbls loop
    execute format('drop policy if exists "%s read"     on public.%I', t, t);
    execute format('drop policy if exists "%s insert"   on public.%I', t, t);
    execute format('drop policy if exists "%s update"   on public.%I', t, t);
    execute format('drop policy if exists "%s delete"   on public.%I', t, t);

    execute format(
      'create policy "%s read"   on public.%I for select to authenticated using (true)',
      t, t
    );
    execute format(
      'create policy "%s insert" on public.%I for insert to authenticated with check (auth.uid() is not null)',
      t, t
    );
    execute format(
      'create policy "%s update" on public.%I for update to authenticated using (true) with check (true)',
      t, t
    );
    execute format(
      'create policy "%s delete" on public.%I for delete to authenticated using (true)',
      t, t
    );
  end loop;
end $$;

-- ── Seed projects + modules ──────────────────────────────────────────────────
insert into public.pw_projects (id, name, description, is_seed) values
  ('policy-gap-2-0',  'Policy Gap 2.0',
     'Successor analysis to the 2024 ESABCC progress report — indicators, recommendation tracking, member-state space and sectoral policy analysis.',
     true),
  ('industry-project','Industry Project',
     'Analytical workspace dedicated to industrial decarbonisation. Modules to be added as the project scope is defined.',
     true)
on conflict (id) do nothing;

insert into public.pw_modules (id, project_id, kind, name, description, position, is_seed) values
  ('indicators',      'policy-gap-2-0', 'indicators',
     'Indicator database',
     'EU-level progress indicators (ECNO framework + custom). Table + chart view, editable in the UI.',
     0, true),
  ('recommendations', 'policy-gap-2-0', 'recommendations',
     'Past recommendations tracker',
     'Recommendations from the 2024 ESABCC progress report, with status and dated uptake events.',
     1, true),
  ('member-states',   'policy-gap-2-0', 'member-states',
     'Member state space',
     'EU-27 × sector matrix — placeholder cells for member-state specific findings (filled in over time).',
     2, true),
  ('policy-analysis', 'policy-gap-2-0', 'policy-analysis',
     'Policy analysis',
     'Sectoral policy review. Mirrors the Sectoral overview in the EU Policy Navigator; edits made here propagate to the navigator.',
     3, true)
on conflict (project_id, id) do nothing;


-- ----------------------------------------------------------------------------
-- 039_country_profiles.sql
-- ----------------------------------------------------------------------------

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


-- ----------------------------------------------------------------------------
-- 039_workspace_followups.sql
-- ----------------------------------------------------------------------------

-- ─────────────────────────────────────────────────────────────────────────────
-- Project Workspace follow-ups — wires the three open items from M·19:
--   1. Indicator refresh log so live Eurostat / EEA pulls can record their
--      provenance per indicator (success or failure).
--   2. A free-form content store for the "custom" module kind so user-added
--      modules render an editable scratchpad instead of a placeholder.
--   3. Promotion of policy-analysis "Suggested edit" annotations into a
--      canonical override layer that the EU Policy Navigator reads back, so
--      promoting an edit no longer requires editing the SECTOR_POLICIES
--      data file by hand.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Per-indicator refresh log. One row per attempt; the latest row tells the
--    UI when (and from where) the indicator was last refreshed.
create table if not exists public.pw_indicator_refreshes (
  id            uuid        primary key default gen_random_uuid(),
  indicator_id  text        not null references public.pw_indicators(id) on delete cascade,
  source        text        not null,           -- 'eurostat' | 'eea' | …
  ok            boolean     not null,
  points_added  integer     not null default 0,
  message       text        not null default '',
  refreshed_at  timestamptz not null default now(),
  refreshed_by  uuid        references auth.users(id) on delete set null
);

create index if not exists pw_indicator_refreshes_indicator_idx
  on public.pw_indicator_refreshes(indicator_id, refreshed_at desc);

-- 2. Markdown/plain-text scratchpad for "custom" modules. One row per
--    (project, module) pair; nullable until the user first edits it.
create table if not exists public.pw_custom_module_content (
  project_id    text        not null,
  module_id     text        not null,
  content       text        not null default '',
  updated_by    uuid        references auth.users(id) on delete set null,
  updated_at    timestamptz not null default now(),
  primary key (project_id, module_id),
  foreign key (project_id, module_id)
    references public.pw_modules(project_id, id) on delete cascade
);

-- 3. Promotion timestamp on annotations. Non-null = the suggested edit has
--    been promoted into the canonical sectoral-policy view, i.e. it overrides
--    the bundled SECTOR_POLICIES text everywhere it is rendered.
alter table public.pw_policy_annotations
  add column if not exists promoted_at timestamptz;

create index if not exists pw_policy_ann_promoted_idx
  on public.pw_policy_annotations(policy_id) where promoted_at is not null;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.pw_indicator_refreshes    enable row level security;
alter table public.pw_custom_module_content  enable row level security;

do $$
declare
  t text;
  tbls text[] := array['pw_indicator_refreshes','pw_custom_module_content'];
begin
  foreach t in array tbls loop
    execute format('drop policy if exists "%s read"   on public.%I', t, t);
    execute format('drop policy if exists "%s insert" on public.%I', t, t);
    execute format('drop policy if exists "%s update" on public.%I', t, t);
    execute format('drop policy if exists "%s delete" on public.%I', t, t);

    execute format(
      'create policy "%s read"   on public.%I for select to authenticated using (true)',
      t, t
    );
    execute format(
      'create policy "%s insert" on public.%I for insert to authenticated with check (auth.uid() is not null)',
      t, t
    );
    execute format(
      'create policy "%s update" on public.%I for update to authenticated using (true) with check (true)',
      t, t
    );
    execute format(
      'create policy "%s delete" on public.%I for delete to authenticated using (true)',
      t, t
    );
  end loop;
end $$;

-- ── updated_at trigger on custom_module_content ──────────────────────────────
drop trigger if exists trg_pw_custom_content_updated_at on public.pw_custom_module_content;
create trigger trg_pw_custom_content_updated_at
  before update on public.pw_custom_module_content
  for each row execute function public.pw_touch_updated_at();


-- ----------------------------------------------------------------------------
-- 040_pw_policy_codes.sql
-- ----------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Project-scoped, copy-on-write code assignments per policy.
--
-- The EU Policy Navigator carries a shared "master" code taxonomy
-- (see src/lib/content-analysis/seed.ts and POLICY_MASTER_TAGS). Inside a
-- workspace project, analysts need their own coding overlay for the same
-- policy: they can soft-remove a master code, or add custom (hierarchical)
-- codes — without touching the master set used by the navigator.
--
-- Rows are written lazily: while a project has no rows for a policy, the
-- UI shows the master codes as-is. The first edit forks the master codes
-- into rows (one per master tag, source='master', removed=false), then
-- applies the change. Custom codes are inserted as source='custom' rows
-- with their own label / color / optional parent.
-- ---------------------------------------------------------------------------

create table if not exists public.pw_policy_codes (
  id              uuid        primary key default gen_random_uuid(),
  project_id      text        not null references public.pw_projects(id) on delete cascade,
  policy_id       text        not null,
  -- Stable master code id (e.g. 'code-ets') for source='master',
  -- or a generated id (e.g. 'proj-<uuid>') for source='custom'.
  code_id         text        not null,
  source          text        not null check (source in ('master','custom')),
  -- Only set for source='custom'. May reference a master code id
  -- ('code-pricing') or another project code id ('proj-...').
  parent_code_id  text,
  -- Only meaningful for source='custom' (master codes resolve via catalog).
  label           text        not null default '',
  color           text        not null default '#94A3B8',
  -- Only meaningful for source='master': true = user removed it from the
  -- project copy. Soft delete so it can be restored.
  removed         boolean     not null default false,
  created_by      uuid        references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (project_id, policy_id, code_id)
);

create index if not exists pw_policy_codes_project_idx
  on public.pw_policy_codes(project_id);
create index if not exists pw_policy_codes_policy_idx
  on public.pw_policy_codes(project_id, policy_id);

drop trigger if exists trg_pw_policy_codes_updated_at on public.pw_policy_codes;
create trigger trg_pw_policy_codes_updated_at
  before update on public.pw_policy_codes
  for each row execute function public.pw_touch_updated_at();

alter table public.pw_policy_codes enable row level security;

drop policy if exists "pw_policy_codes read"   on public.pw_policy_codes;
drop policy if exists "pw_policy_codes insert" on public.pw_policy_codes;
drop policy if exists "pw_policy_codes update" on public.pw_policy_codes;
drop policy if exists "pw_policy_codes delete" on public.pw_policy_codes;

DROP POLICY IF EXISTS "pw_policy_codes read" ON public.pw_policy_codes;
create policy "pw_policy_codes read"
  on public.pw_policy_codes for select to authenticated using (true);
DROP POLICY IF EXISTS "pw_policy_codes insert" ON public.pw_policy_codes;
create policy "pw_policy_codes insert"
  on public.pw_policy_codes for insert to authenticated with check (auth.uid() is not null);
DROP POLICY IF EXISTS "pw_policy_codes update" ON public.pw_policy_codes;
create policy "pw_policy_codes update"
  on public.pw_policy_codes for update to authenticated using (true) with check (true);
DROP POLICY IF EXISTS "pw_policy_codes delete" ON public.pw_policy_codes;
create policy "pw_policy_codes delete"
  on public.pw_policy_codes for delete to authenticated using (true);


-- ----------------------------------------------------------------------------
-- 040_seed_full_ecno_indicators.sql
-- ----------------------------------------------------------------------------

-- ─────────────────────────────────────────────────────────────────────────────
-- Materialise the full ECNO indicator seed set directly into pw_indicators
-- and pw_indicator_points for the "policy-gap-2-0" project.
--
-- Until now the seed list lived only in src/data/ecno-indicators.ts and was
-- copied into Postgres lazily on first project page load. Doing it here in
-- SQL means the rows exist in the database from migration time, independent
-- of whether the Next.js seeder ever runs.
--
-- Both inserts are idempotent (on conflict do nothing) so re-running the
-- migration is safe — and the app-level seeder remains as a fallback for
-- any indicator IDs added to the TS file after this migration was authored.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.pw_indicators
  (id, project_id, name, category, unit, description, source, source_url,
   direction, target_value, target_year, is_seed)
values
  ('ghg-total-net', 'policy-gap-2-0', 'Net GHG emissions (excl. LULUCF)', 'emissions', 'Mt CO₂eq', 'Total EU-27 net greenhouse gas emissions excluding LULUCF, reported under the UNFCCC inventory.', 'EEA GHG inventory', 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2', 'down', 850, 2030, true),
  ('res-share', 'policy-gap-2-0', 'Renewable energy share in gross final energy consumption', 'energy-supply', '%', 'Share of energy from renewable sources in gross final energy consumption (RED III binding 2030 target: 42.5%, indicative 45%).', 'Eurostat (nrg_ind_ren)', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table', 'up', 42.5, 2030, true),
  ('power-sector-ghg', 'policy-gap-2-0', 'Power sector GHG emissions', 'energy-supply', 'Mt CO₂eq', 'GHG emissions from public electricity and heat production (CRF 1.A.1.a/b/c). ECNO block: Electricity.', 'EEA GHG inventory (CRF 1.A.1)', 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2', 'down', null, null, true),
  ('solar-pv-additions', 'policy-gap-2-0', 'Annual solar PV capacity additions', 'energy-supply', 'GW/yr', 'Net new solar photovoltaic capacity installed each year across the EU-27. ECNO block: Electricity.', 'IRENA renewable capacity statistics', 'https://www.irena.org/Data/View-data-by-topic/Capacity-and-Generation/Statistics-Time-Series', 'up', null, null, true),
  ('wind-additions', 'policy-gap-2-0', 'Annual wind capacity additions', 'energy-supply', 'GW/yr', 'Net new onshore and offshore wind capacity commissioned each year in the EU-27. ECNO block: Electricity.', 'IRENA renewable capacity statistics', 'https://www.irena.org/Data/View-data-by-topic/Capacity-and-Generation/Statistics-Time-Series', 'up', null, null, true),
  ('battery-storage-capacity', 'policy-gap-2-0', 'Stationary battery storage capacity', 'energy-supply', 'GW', 'Installed stationary battery storage capacity (grid-scale + behind-the-meter) in the EU-27. ECNO block: Electricity.', 'IRENA renewable capacity statistics', 'https://www.irena.org/Data/View-data-by-topic/Capacity-and-Generation/Statistics-Time-Series', 'up', null, null, true),
  ('fossil-power-share', 'policy-gap-2-0', 'Fossil share of electricity generation', 'energy-supply', '%', 'Share of gross electricity generation produced from coal, oil and gas in the EU-27. Required to fall sharply to align with the 2040 climate target. ECNO block: Electricity.', 'Eurostat (nrg_bal_peh)', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_peh/default/table', 'down', null, null, true),
  ('smart-meter-rollout', 'policy-gap-2-0', 'Electricity smart meter penetration', 'energy-supply', '%', 'Share of consumption points equipped with a smart electricity meter. Tracks Electricity-Directive rollout obligations. ECNO block: Electricity.', 'JRC smart-meter benchmarking', 'https://joint-research-centre.ec.europa.eu/scientific-activities-z/smart-electricity-systems-and-interoperability_en', 'up', null, null, true),
  ('final-energy-consumption', 'policy-gap-2-0', 'Final energy consumption', 'energy-demand', 'Mtoe', 'EU final energy consumption. EED 2030 indicative target: 763 Mtoe.', 'Eurostat (nrg_bal_c)', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table', 'down', 763, 2030, true),
  ('end-use-electrification', 'policy-gap-2-0', 'Electricity share of final energy demand', 'energy-demand', '%', 'Share of final energy consumption supplied as electricity (all sectors). Used as a proxy for end-use electrification progress. ECNO block: Electricity.', 'Eurostat (nrg_bal_c)', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table', 'up', null, null, true),
  ('ev-share-new-cars', 'policy-gap-2-0', 'Battery-electric vehicle share of new car registrations', 'transport', '%', 'Share of new passenger car registrations that are battery-electric. Tracks progress towards the CO₂-emission standards for new cars (100% ZEV by 2035).', 'EEA / ACEA', 'https://www.eea.europa.eu/en/datahub/datahubitem-view/fa8b1229-3db6-495d-b18e-9c9b3267c02b', 'up', 100, 2035, true),
  ('zev-share-car-stock', 'policy-gap-2-0', 'Zero-emission share of passenger car stock', 'transport', '%', 'Cumulative share of zero-emission vehicles in the on-the-road passenger car fleet across the EU-27. ECNO block: Mobility.', 'Eurostat road vehicle stock (road_eqs_carpda)', 'https://ec.europa.eu/eurostat/databrowser/view/road_eqs_carpda/default/table', 'up', 93.5, 2050, true),
  ('zev-charging-points', 'policy-gap-2-0', 'Public EV charging points deployed', 'transport', 'thousand points', 'Cumulative count of publicly accessible alternative-fuel recharging points across the EU-27 (AC + DC). Used to track AFIR rollout. ECNO block: Mobility.', 'EAFO', 'https://alternative-fuels-observatory.ec.europa.eu/transport-mode/road/european-union-eu27', 'up', null, null, true),
  ('road-passenger-share', 'policy-gap-2-0', 'Road share of inland passenger transport', 'transport', '%', 'Share of inland passenger transport (passenger-kilometres) carried by cars, buses and coaches. ECNO block: Mobility.', 'Eurostat (tran_hv_psmod)', 'https://ec.europa.eu/eurostat/databrowser/view/tran_hv_psmod/default/table', 'down', 77.5, 2050, true),
  ('rail-passenger-share', 'policy-gap-2-0', 'Rail share of inland passenger transport', 'transport', '%', 'Share of inland passenger-kilometres travelled by rail (trains + trams + metros). ECNO block: Mobility.', 'Eurostat (tran_hv_psmod)', 'https://ec.europa.eu/eurostat/databrowser/view/tran_hv_psmod/default/table', 'up', null, null, true),
  ('rail-iww-freight-share', 'policy-gap-2-0', 'Rail and inland waterway share of freight transport', 'transport', '%', 'Share of inland tonne-kilometres carried by rail or inland waterways (the rest is hauled by road). ECNO block: Mobility.', 'Eurostat (tran_hv_frmod)', 'https://ec.europa.eu/eurostat/databrowser/view/tran_hv_frmod/default/table', 'up', null, null, true),
  ('rail-electrification', 'policy-gap-2-0', 'Share of electrified railway lines', 'transport', '%', 'Share of total operational railway track length that is electrified. ECNO block: Mobility.', 'Eurostat (rail_if_electri)', 'https://ec.europa.eu/eurostat/databrowser/view/rail_if_electri/default/table', 'up', null, null, true),
  ('zev-share-van-stock', 'policy-gap-2-0', 'Zero-emission share of light commercial vehicle stock', 'transport', '%', 'Share of N1 light commercial vehicles in the EU-27 fleet that are zero-emission. Tracks the 2035 zero-emission target for new vans. ECNO block: Mobility.', 'Eurostat (road_eqs_lormot)', 'https://ec.europa.eu/eurostat/databrowser/view/road_eqs_lormot/default/table', 'up', 100, 2050, true),
  ('zev-share-truck-stock', 'policy-gap-2-0', 'Zero-emission share of heavy-duty vehicle stock', 'transport', '%', 'Share of heavy-duty trucks and buses in the EU-27 fleet that are zero-emission (battery-electric or fuel-cell). ECNO block: Mobility.', 'Eurostat (road_eqs_lormot)', 'https://ec.europa.eu/eurostat/databrowser/view/road_eqs_lormot/default/table', 'up', null, null, true),
  ('building-renovation-rate', 'policy-gap-2-0', 'Energy-related building renovation rate', 'buildings', '%/yr', 'Weighted annual energy renovation rate of the EU building stock. EPBD recast (2024) requires Member States to at least double the deep-renovation rate.', 'JRC / Commission staff working document', 'https://commission.europa.eu/topics/energy-efficiency/energy-efficient-buildings_en', 'up', 2, 2030, true),
  ('buildings-ghg', 'policy-gap-2-0', 'Operational GHG emissions from buildings', 'buildings', 'Mt CO₂eq', 'Direct GHG emissions from energy use in residential and commercial/institutional buildings (CRF 1.A.4.a/b). ECNO block: Buildings.', 'EEA GHG inventory (CRF 1.A.4)', 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2', 'down', null, null, true),
  ('heat-pump-stock', 'policy-gap-2-0', 'Installed heat pump stock', 'buildings', 'million units', 'Cumulative installed base of heat pumps for space heating across the EU-27. REPowerEU targets 60 million units by 2030. ECNO block: Buildings.', 'EHPA Market Report', 'https://www.ehpa.org/market-data/', 'up', 60, 2030, true),
  ('heat-pump-sales', 'policy-gap-2-0', 'Annual heat pump sales', 'buildings', 'thousand units', 'New heat pump units sold per year across the EU-27 (all heat-pump types). ECNO block: Buildings.', 'EHPA Market Report', 'https://www.ehpa.org/market-data/', 'up', null, null, true),
  ('renewable-heating-cooling', 'policy-gap-2-0', 'Renewable share in heating and cooling', 'buildings', '%', 'Share of energy used for heating and cooling that comes from renewable sources. RED III indicative 2030 target: 49% (with annual +1.1pp average increment). ECNO block: Buildings.', 'Eurostat (nrg_ind_ren, nrg_bal=REN_H_C)', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table', 'up', 49, 2030, true),
  ('floor-space-per-capita', 'policy-gap-2-0', 'Average residential floor space per resident', 'buildings', 'm²/person', 'Average residential floor area per EU resident. A rising trend pushes sectoral energy demand up even if per-m² intensity falls. ECNO block: Buildings.', 'Eurostat / EU-SILC (ilc_lvho03)', 'https://ec.europa.eu/eurostat/databrowser/view/ilc_lvho03/default/table', 'down', null, null, true),
  ('industry-ghg', 'policy-gap-2-0', 'Industrial process and energy-use GHG emissions', 'industry', 'Mt CO₂eq', 'Combined GHG emissions from industrial energy use (CRF 1.A.2) and industrial processes & product use (CRF 2), EU-27.', 'EEA GHG inventory', 'https://www.eea.europa.eu/en/datahub', 'down', null, null, true),
  ('industry-electrification', 'policy-gap-2-0', 'Electricity share of industrial energy use', 'industry', '%', 'Share of final energy used by industry that is supplied as electricity. A key driver of process decarbonisation. ECNO block: Industry.', 'Eurostat (nrg_bal_c)', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table', 'up', null, null, true),
  ('hydrogen-electrolyser-capacity', 'policy-gap-2-0', 'Installed electrolyser capacity', 'industry', 'MW', 'Cumulative installed water-electrolyser capacity in the EU-27, a proxy for renewable hydrogen ramp-up. REPowerEU 2030 target: 10 Mt RFNBO production. ECNO block: Industry / Clean Technologies.', 'IEA / Clean Hydrogen Joint Undertaking', 'https://www.clean-hydrogen.europa.eu/knowledge-management/sria-key-performance-indicators-kpis_en', 'up', null, null, true),
  ('agri-ghg', 'policy-gap-2-0', 'Agriculture GHG emissions', 'agriculture', 'Mt CO₂eq', 'EU-27 agriculture-sector GHG emissions (CRF 3). ECNO block: Agrifood.', 'EEA GHG inventory', 'https://www.eea.europa.eu/en/datahub', 'down', null, null, true),
  ('lulucf-net-removal', 'policy-gap-2-0', 'LULUCF net removals', 'lulucf', 'Mt CO₂eq', 'Net carbon removals from Land Use, Land-Use Change & Forestry. LULUCF Regulation 2030 target: -310 Mt CO₂eq (i.e. removal of 310 Mt). ECNO block: Carbon Dioxide Removal.', 'EEA GHG inventory', 'https://www.eea.europa.eu/en/datahub', 'down', -310, 2030, true),
  ('clean-tech-investment', 'policy-gap-2-0', 'Clean-energy investment', 'finance', 'bn EUR', 'Annual EU clean-energy investment (renewables, grids, efficiency, electrified transport). Sourced from IEA World Energy Investment.', 'IEA World Energy Investment', 'https://www.iea.org/reports/world-energy-investment-2024', 'up', null, null, true),
  ('energy-poverty-share', 'policy-gap-2-0', 'Population unable to keep home adequately warm', 'fairness', '%', 'Share of EU population reporting inability to keep their home adequately warm — proxy indicator for energy poverty.', 'Eurostat (ilc_mdes01)', 'https://ec.europa.eu/eurostat/databrowser/view/ilc_mdes01/default/table', 'down', null, null, true),
  ('environmental-employment', 'policy-gap-2-0', 'Employment in environmental goods and services', 'fairness', 'million FTE', 'Full-time-equivalent employment in the EU environmental goods and services sector. A proxy for green-job creation. ECNO block: Just & Fair Transition.', 'Eurostat (env_ac_egss1)', 'https://ec.europa.eu/eurostat/databrowser/view/env_ac_egss1/default/table', 'up', null, null, true),
  ('cattle-population', 'policy-gap-2-0', 'EU cattle herd size', 'agriculture', 'million head', 'Number of bovine animals on EU-27 farms. Enteric fermentation from cattle is the largest single source of agricultural methane. ECNO block: Agrifood.', 'Eurostat (apro_mt_lscatl)', 'https://ec.europa.eu/eurostat/databrowser/view/apro_mt_lscatl/default/table', 'down', null, null, true),
  ('nitrogen-fertiliser-use', 'policy-gap-2-0', 'Mineral nitrogen fertiliser consumption', 'agriculture', 'kt N', 'Total mineral nitrogen fertiliser applied on EU-27 agricultural land — drives N₂O emissions and ammonia losses. ECNO block: Agrifood.', 'Eurostat (aei_fm_usefert)', 'https://ec.europa.eu/eurostat/databrowser/view/aei_fm_usefert/default/table', 'down', null, null, true),
  ('organic-farming-share', 'policy-gap-2-0', 'Organic share of utilised agricultural area', 'agriculture', '%', 'Share of utilised agricultural area under organic farming (in-conversion or certified). Farm-to-Fork 2030 target: 25%. ECNO block: Agrifood.', 'Eurostat (sdg_02_40)', 'https://ec.europa.eu/eurostat/databrowser/view/sdg_02_40/default/table', 'up', 25, 2030, true),
  ('food-waste-per-capita', 'policy-gap-2-0', 'Food waste generated per capita', 'agriculture', 'kg/person/yr', 'Total food waste across the EU-27 food chain, per resident. The Waste Framework Directive sets binding 2030 reduction targets vs. 2020. ECNO block: Agrifood.', 'Eurostat (env_wasfw)', 'https://ec.europa.eu/eurostat/databrowser/view/env_wasfw/default/table', 'down', null, null, true),
  ('forest-net-sink', 'policy-gap-2-0', 'Forest land net carbon removals', 'lulucf', 'Mt CO₂eq', 'Net CO₂ removals from forest land (CRF 4.A), EU-27. The sink has been weakening since the mid-2010s due to harvest pressure, disturbances and ageing stands. ECNO block: Carbon Dioxide Removal.', 'EEA GHG inventory (CRF 4.A)', 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2', 'down', null, null, true),
  ('harvested-wood-pool', 'policy-gap-2-0', 'Harvested wood products carbon pool change', 'lulucf', 'Mt CO₂eq', 'Annual change in the carbon stock of harvested wood products (CRF 4.G). Negative values indicate net carbon storage in long-lived wood products. ECNO block: Carbon Dioxide Removal.', 'EEA GHG inventory (CRF 4.G)', 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2', 'down', null, null, true),
  ('engineered-cdr-capacity', 'policy-gap-2-0', 'Engineered CDR operational capacity', 'lulucf', 'kt CO₂/yr', 'Capacity of operational engineered carbon-removal facilities in the EU-27 (DACCS, BECCS, BiCRS, ocean alkalinity). Tracks the EU 2040 Industrial Carbon Management Strategy ramp-up. ECNO block: Carbon Dioxide Removal.', 'IEA CCUS projects database', 'https://www.iea.org/data-and-statistics/data-product/ccus-projects-database', 'up', null, null, true),
  ('battery-mfg-capacity', 'policy-gap-2-0', 'EU battery cell manufacturing capacity', 'industry', 'GWh/yr', 'Operational lithium-ion battery cell manufacturing capacity in the EU-27. Net-Zero Industry Act targets 40% of EU annual demand from domestic production by 2030. ECNO block: Clean Technologies.', 'JRC strategic technologies for the green deal', 'https://joint-research-centre.ec.europa.eu/scientific-activities-z/strategic-technologies-green-deal_en', 'up', null, null, true),
  ('solar-pv-mfg-capacity', 'policy-gap-2-0', 'EU solar PV module manufacturing capacity', 'industry', 'GW/yr', 'Annual solar PV module assembly capacity located in the EU-27. NZIA 2030 benchmark: 40% of annual deployment supplied domestically. ECNO block: Clean Technologies.', 'JRC strategic technologies for the green deal', 'https://joint-research-centre.ec.europa.eu/scientific-activities-z/strategic-technologies-green-deal_en', 'up', null, null, true),
  ('electrolyser-mfg-capacity', 'policy-gap-2-0', 'EU electrolyser manufacturing capacity', 'industry', 'GW/yr', 'Announced electrolyser production capacity from EU-located manufacturers. ECNO block: Clean Technologies.', 'Clean Hydrogen Joint Undertaking / IEA Hydrogen Production Projects', 'https://www.iea.org/data-and-statistics/data-product/hydrogen-production-and-infrastructure-projects-database', 'up', null, null, true),
  ('clean-tech-trade-balance', 'policy-gap-2-0', 'EU clean-tech goods trade balance', 'industry', 'bn EUR', 'Net trade balance for the EU-27 in clean energy goods (solar, wind, batteries, heat pumps, EVs). Negative values indicate net imports. ECNO block: Clean Technologies.', 'Eurostat Comext', 'https://ec.europa.eu/eurostat/web/international-trade-in-goods/data/database', 'up', null, null, true),
  ('eu-ets-price', 'policy-gap-2-0', 'EU ETS allowance price', 'finance', 'EUR/t CO₂eq', 'Annual average secondary-market spot price of EU ETS allowances (EUA). Used as the headline carbon-price signal for the EU. ECNO block: Finance.', 'ICE EUA futures (settlement)', 'https://www.eex.com/en/market-data/environmental-markets/emissions-auctions', 'up', null, null, true),
  ('fossil-subsidies', 'policy-gap-2-0', 'EU fossil-fuel subsidies', 'finance', 'bn EUR', 'Sum of identified direct and indirect fossil-fuel subsidies across EU-27 Member States. ECNO block: Finance.', 'Commission State of the Energy Union (fossil-fuel subsidies)', 'https://energy.ec.europa.eu/topics/energy-strategy/energy-union_en', 'down', null, null, true),
  ('green-bond-issuance', 'policy-gap-2-0', 'EU green bond issuance', 'finance', 'bn EUR', 'Annual EU-aligned green bond issuance from sovereign, corporate and supranational issuers domiciled in the EU-27. ECNO block: Finance.', 'Climate Bonds Initiative — Green Bond Database', 'https://www.climatebonds.net/market/data/', 'up', null, null, true),
  ('energy-rdd-budget', 'policy-gap-2-0', 'Public energy research, development and demonstration budgets', 'finance', 'bn EUR', 'Public RD&D spending on energy across EU-27 Member States, IEA basis. ECNO block: Finance.', 'IEA Energy Technology RD&D Budgets', 'https://www.iea.org/data-and-statistics/data-product/energy-technology-rd-and-d-budget-database-2', 'up', null, null, true),
  ('carbon-pricing-coverage', 'policy-gap-2-0', 'Share of EU emissions covered by carbon pricing', 'emissions', '%', 'Share of EU-27 GHG emissions covered by an explicit carbon-pricing instrument (EU ETS, ETS2, or national carbon tax). ECNO block: Governance.', 'World Bank Carbon Pricing Dashboard', 'https://carbonpricingdashboard.worldbank.org/', 'up', null, null, true),
  ('national-climate-laws', 'policy-gap-2-0', 'Member States with a binding national climate law', 'emissions', 'count', 'Number of EU-27 Member States that have adopted a binding national climate-neutrality or framework climate law. ECNO block: Governance.', 'Ecologic Institute / EEA national policy database', 'https://www.eea.europa.eu/en/topics/at-a-glance/climate/policies-and-targets', 'up', null, null, true),
  ('necp-implementation-score', 'policy-gap-2-0', 'NECP implementation completeness score', 'emissions', 'score 0–100', 'Aggregate Commission assessment of how completely Member States have implemented their National Energy and Climate Plans. Higher is better. ECNO block: Governance.', 'Commission NECP assessments', 'https://commission.europa.eu/energy-climate-change-environment/implementation-eu-countries/energy-and-climate-governance-and-reporting/national-energy-and-climate-plans_en', 'up', null, null, true),
  ('meat-consumption-per-capita', 'policy-gap-2-0', 'Per-capita meat consumption', 'fairness', 'kg/person/yr', 'Average annual meat consumption per EU-27 resident across bovine, pig, poultry and sheep & goat meat. ECNO block: Lifestyles.', 'Eurostat / DG AGRI meat balance sheets', 'https://agriculture.ec.europa.eu/data-and-analysis/markets/overviews/market-observatories/meat_en', 'down', null, null, true),
  ('air-passengers-per-capita', 'policy-gap-2-0', 'Air passenger journeys per capita', 'fairness', 'journeys/person/yr', 'Total air passengers carried (arrivals + departures, including transfer) per EU-27 resident. Proxy for aviation demand. ECNO block: Lifestyles.', 'Eurostat (avia_paoc)', 'https://ec.europa.eu/eurostat/databrowser/view/avia_paoc/default/table', 'down', null, null, true),
  ('household-energy-per-capita', 'policy-gap-2-0', 'Per-capita household final energy consumption', 'fairness', 'kgoe/person', 'Final energy consumed by households across the EU-27, divided by population. Captures behaviour, efficiency and floor-space effects together. ECNO block: Lifestyles.', 'Eurostat (nrg_bal_c, sector households)', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table', 'down', null, null, true),
  ('climate-economic-losses', 'policy-gap-2-0', 'Climate-related economic losses', 'fairness', 'bn EUR/yr', 'Annual reported economic losses from weather and climate-related events in the EU-27 (CATDAT / EEA indicator). ECNO block: Adaptation.', 'EEA indicator CLIM039', 'https://www.eea.europa.eu/en/analysis/indicators/economic-losses-from-climate-related', 'down', null, null, true),
  ('water-exploitation-index', 'policy-gap-2-0', 'Water exploitation index', 'fairness', '%', 'Ratio of total freshwater abstraction to long-term mean freshwater resources, EU-27 aggregate. Values above 20% indicate water stress. ECNO block: Adaptation.', 'EEA / Eurostat (env_wat_bal)', 'https://ec.europa.eu/eurostat/databrowser/view/env_wat_bal/default/table', 'down', null, null, true),
  ('national-adaptation-strategies', 'policy-gap-2-0', 'Member States with an adopted national adaptation strategy', 'fairness', 'count', 'Count of EU-27 Member States that have a national adaptation strategy or plan recorded in the Climate-ADAPT platform. ECNO block: Adaptation.', 'EEA Climate-ADAPT', 'https://climate-adapt.eea.europa.eu/en/countries-regions/countries', 'up', null, null, true),
  ('international-climate-finance', 'policy-gap-2-0', 'EU international public climate finance', 'finance', 'bn EUR', 'Public climate finance flowing from the EU-27 and EU institutions to developing countries (mitigation + adaptation). ECNO block: External Action.', 'Commission progress reports under Reg. 2018/1999', 'https://climate.ec.europa.eu/eu-action/international-action-climate-change/eu-climate-finance_en', 'up', null, null, true),
  ('cbam-import-coverage', 'policy-gap-2-0', 'Imports covered by CBAM reporting', 'finance', 'Mt CO₂eq', 'Embedded emissions in EU-27 imports of CBAM-covered goods (iron & steel, aluminium, cement, fertiliser, electricity, hydrogen) as reported during the CBAM transitional period. ECNO block: External Action.', 'DG TAXUD CBAM transitional registry', 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en', 'down', null, null, true),
  ('embodied-import-emissions', 'policy-gap-2-0', 'Embodied GHG emissions in EU imports', 'finance', 'Mt CO₂eq', 'Total GHG emissions embodied in goods and services imported into the EU-27, based on consumption-based accounting. ECNO block: External Action.', 'JRC consumption-based emissions / EDGAR', 'https://edgar.jrc.ec.europa.eu/', 'down', null, null, true)
on conflict (id) do nothing;

insert into public.pw_indicator_points (indicator_id, year, value)
values
  ('ghg-total-net', 2018, 3893),
  ('ghg-total-net', 2019, 3743),
  ('ghg-total-net', 2020, 3457),
  ('ghg-total-net', 2021, 3635),
  ('ghg-total-net', 2022, 3548),
  ('ghg-total-net', 2023, 3225),
  ('res-share', 2018, 18),
  ('res-share', 2019, 19.1),
  ('res-share', 2020, 22),
  ('res-share', 2021, 21.9),
  ('res-share', 2022, 23),
  ('res-share', 2023, 24.5),
  ('power-sector-ghg', 2018, 953),
  ('power-sector-ghg', 2019, 829),
  ('power-sector-ghg', 2020, 726),
  ('power-sector-ghg', 2021, 793),
  ('power-sector-ghg', 2022, 786),
  ('power-sector-ghg', 2023, 622),
  ('solar-pv-additions', 2019, 16),
  ('solar-pv-additions', 2020, 21),
  ('solar-pv-additions', 2021, 28),
  ('solar-pv-additions', 2022, 41),
  ('solar-pv-additions', 2023, 56),
  ('solar-pv-additions', 2024, 65),
  ('wind-additions', 2019, 13),
  ('wind-additions', 2020, 14),
  ('wind-additions', 2021, 11),
  ('wind-additions', 2022, 16),
  ('wind-additions', 2023, 16),
  ('wind-additions', 2024, 13),
  ('battery-storage-capacity', 2020, 2.5),
  ('battery-storage-capacity', 2021, 4),
  ('battery-storage-capacity', 2022, 7.5),
  ('battery-storage-capacity', 2023, 14),
  ('battery-storage-capacity', 2024, 25),
  ('fossil-power-share', 2018, 42),
  ('fossil-power-share', 2019, 38),
  ('fossil-power-share', 2020, 35),
  ('fossil-power-share', 2021, 37),
  ('fossil-power-share', 2022, 38),
  ('fossil-power-share', 2023, 32),
  ('smart-meter-rollout', 2018, 34),
  ('smart-meter-rollout', 2020, 43),
  ('smart-meter-rollout', 2022, 56),
  ('smart-meter-rollout', 2023, 60),
  ('final-energy-consumption', 2018, 1064),
  ('final-energy-consumption', 2019, 1053),
  ('final-energy-consumption', 2020, 962),
  ('final-energy-consumption', 2021, 1018),
  ('final-energy-consumption', 2022, 977),
  ('final-energy-consumption', 2023, 940),
  ('end-use-electrification', 2018, 22.1),
  ('end-use-electrification', 2019, 22.4),
  ('end-use-electrification', 2020, 22.8),
  ('end-use-electrification', 2021, 22.9),
  ('end-use-electrification', 2022, 22.9),
  ('end-use-electrification', 2023, 23.2),
  ('ev-share-new-cars', 2019, 1.9),
  ('ev-share-new-cars', 2020, 6.2),
  ('ev-share-new-cars', 2021, 9.1),
  ('ev-share-new-cars', 2022, 12.1),
  ('ev-share-new-cars', 2023, 14.6),
  ('ev-share-new-cars', 2024, 13.6),
  ('zev-share-car-stock', 2019, 0.3),
  ('zev-share-car-stock', 2020, 0.6),
  ('zev-share-car-stock', 2021, 1),
  ('zev-share-car-stock', 2022, 1.5),
  ('zev-share-car-stock', 2023, 2.3),
  ('zev-share-car-stock', 2024, 2.8),
  ('zev-charging-points', 2019, 180),
  ('zev-charging-points', 2020, 250),
  ('zev-charging-points', 2021, 330),
  ('zev-charging-points', 2022, 460),
  ('zev-charging-points', 2023, 630),
  ('zev-charging-points', 2024, 830),
  ('road-passenger-share', 2018, 82.7),
  ('road-passenger-share', 2019, 82.1),
  ('road-passenger-share', 2020, 84.6),
  ('road-passenger-share', 2021, 83.5),
  ('road-passenger-share', 2022, 81.4),
  ('road-passenger-share', 2023, 80.6),
  ('rail-passenger-share', 2018, 7.9),
  ('rail-passenger-share', 2019, 8.2),
  ('rail-passenger-share', 2020, 5.7),
  ('rail-passenger-share', 2021, 6.5),
  ('rail-passenger-share', 2022, 7.6),
  ('rail-passenger-share', 2023, 7.8),
  ('rail-iww-freight-share', 2018, 23.7),
  ('rail-iww-freight-share', 2019, 23.5),
  ('rail-iww-freight-share', 2020, 23.1),
  ('rail-iww-freight-share', 2021, 22.9),
  ('rail-iww-freight-share', 2022, 22.1),
  ('rail-iww-freight-share', 2023, 22),
  ('rail-electrification', 2018, 55.6),
  ('rail-electrification', 2019, 55.8),
  ('rail-electrification', 2020, 56.1),
  ('rail-electrification', 2021, 56.4),
  ('rail-electrification', 2022, 56.5),
  ('zev-share-van-stock', 2020, 0.4),
  ('zev-share-van-stock', 2021, 0.7),
  ('zev-share-van-stock', 2022, 1.1),
  ('zev-share-van-stock', 2023, 1.6),
  ('zev-share-truck-stock', 2020, 0.1),
  ('zev-share-truck-stock', 2021, 0.15),
  ('zev-share-truck-stock', 2022, 0.2),
  ('zev-share-truck-stock', 2023, 0.3),
  ('building-renovation-rate', 2018, 1),
  ('building-renovation-rate', 2019, 1),
  ('building-renovation-rate', 2020, 1),
  ('building-renovation-rate', 2021, 1.1),
  ('building-renovation-rate', 2022, 1.2),
  ('buildings-ghg', 2018, 510),
  ('buildings-ghg', 2019, 491),
  ('buildings-ghg', 2020, 474),
  ('buildings-ghg', 2021, 506),
  ('buildings-ghg', 2022, 446),
  ('buildings-ghg', 2023, 420),
  ('heat-pump-stock', 2019, 13.5),
  ('heat-pump-stock', 2020, 15),
  ('heat-pump-stock', 2021, 17.1),
  ('heat-pump-stock', 2022, 20),
  ('heat-pump-stock', 2023, 22.5),
  ('heat-pump-stock', 2024, 24.5),
  ('heat-pump-sales', 2019, 1620),
  ('heat-pump-sales', 2020, 1830),
  ('heat-pump-sales', 2021, 2180),
  ('heat-pump-sales', 2022, 3000),
  ('heat-pump-sales', 2023, 2640),
  ('heat-pump-sales', 2024, 2100),
  ('renewable-heating-cooling', 2018, 21.7),
  ('renewable-heating-cooling', 2019, 22.5),
  ('renewable-heating-cooling', 2020, 23.9),
  ('renewable-heating-cooling', 2021, 23),
  ('renewable-heating-cooling', 2022, 24.8),
  ('renewable-heating-cooling', 2023, 26.2),
  ('floor-space-per-capita', 2018, 41.1),
  ('floor-space-per-capita', 2019, 41.4),
  ('floor-space-per-capita', 2020, 42),
  ('floor-space-per-capita', 2021, 42.5),
  ('floor-space-per-capita', 2022, 42.9),
  ('industry-ghg', 2018, 813),
  ('industry-ghg', 2019, 793),
  ('industry-ghg', 2020, 740),
  ('industry-ghg', 2021, 775),
  ('industry-ghg', 2022, 728),
  ('industry-ghg', 2023, 670),
  ('industry-electrification', 2018, 33),
  ('industry-electrification', 2019, 33.5),
  ('industry-electrification', 2020, 34.4),
  ('industry-electrification', 2021, 33.4),
  ('industry-electrification', 2022, 33),
  ('industry-electrification', 2023, 34.1),
  ('hydrogen-electrolyser-capacity', 2020, 60),
  ('hydrogen-electrolyser-capacity', 2021, 100),
  ('hydrogen-electrolyser-capacity', 2022, 170),
  ('hydrogen-electrolyser-capacity', 2023, 260),
  ('hydrogen-electrolyser-capacity', 2024, 440),
  ('agri-ghg', 2018, 387),
  ('agri-ghg', 2019, 386),
  ('agri-ghg', 2020, 383),
  ('agri-ghg', 2021, 378),
  ('agri-ghg', 2022, 372),
  ('agri-ghg', 2023, 367),
  ('lulucf-net-removal', 2018, -266),
  ('lulucf-net-removal', 2019, -251),
  ('lulucf-net-removal', 2020, -234),
  ('lulucf-net-removal', 2021, -230),
  ('lulucf-net-removal', 2022, -216),
  ('lulucf-net-removal', 2023, -224),
  ('clean-tech-investment', 2019, 175),
  ('clean-tech-investment', 2020, 195),
  ('clean-tech-investment', 2021, 245),
  ('clean-tech-investment', 2022, 305),
  ('clean-tech-investment', 2023, 360),
  ('energy-poverty-share', 2018, 7.3),
  ('energy-poverty-share', 2019, 6.9),
  ('energy-poverty-share', 2020, 7.5),
  ('energy-poverty-share', 2021, 6.9),
  ('energy-poverty-share', 2022, 9.3),
  ('energy-poverty-share', 2023, 10.6),
  ('environmental-employment', 2018, 1.78),
  ('environmental-employment', 2019, 1.83),
  ('environmental-employment', 2020, 1.86),
  ('environmental-employment', 2021, 1.92),
  ('environmental-employment', 2022, 1.98),
  ('environmental-employment', 2023, 2.03),
  ('cattle-population', 2018, 78.1),
  ('cattle-population', 2019, 77.4),
  ('cattle-population', 2020, 76.6),
  ('cattle-population', 2021, 75.5),
  ('cattle-population', 2022, 74.6),
  ('cattle-population', 2023, 73.4),
  ('nitrogen-fertiliser-use', 2018, 10800),
  ('nitrogen-fertiliser-use', 2019, 10650),
  ('nitrogen-fertiliser-use', 2020, 10500),
  ('nitrogen-fertiliser-use', 2021, 10580),
  ('nitrogen-fertiliser-use', 2022, 9700),
  ('nitrogen-fertiliser-use', 2023, 9900),
  ('organic-farming-share', 2018, 7.5),
  ('organic-farming-share', 2019, 8.1),
  ('organic-farming-share', 2020, 9.1),
  ('organic-farming-share', 2021, 9.6),
  ('organic-farming-share', 2022, 10.5),
  ('organic-farming-share', 2023, 10.8),
  ('food-waste-per-capita', 2020, 131),
  ('food-waste-per-capita', 2021, 132),
  ('food-waste-per-capita', 2022, 132),
  ('forest-net-sink', 2018, -344),
  ('forest-net-sink', 2019, -316),
  ('forest-net-sink', 2020, -302),
  ('forest-net-sink', 2021, -287),
  ('forest-net-sink', 2022, -271),
  ('forest-net-sink', 2023, -281),
  ('harvested-wood-pool', 2018, -41),
  ('harvested-wood-pool', 2019, -36),
  ('harvested-wood-pool', 2020, -32),
  ('harvested-wood-pool', 2021, -38),
  ('harvested-wood-pool', 2022, -33),
  ('harvested-wood-pool', 2023, -30),
  ('engineered-cdr-capacity', 2020, 5),
  ('engineered-cdr-capacity', 2021, 10),
  ('engineered-cdr-capacity', 2022, 20),
  ('engineered-cdr-capacity', 2023, 60),
  ('engineered-cdr-capacity', 2024, 130),
  ('battery-mfg-capacity', 2020, 60),
  ('battery-mfg-capacity', 2021, 85),
  ('battery-mfg-capacity', 2022, 140),
  ('battery-mfg-capacity', 2023, 195),
  ('battery-mfg-capacity', 2024, 260),
  ('solar-pv-mfg-capacity', 2020, 6),
  ('solar-pv-mfg-capacity', 2021, 7.5),
  ('solar-pv-mfg-capacity', 2022, 8.5),
  ('solar-pv-mfg-capacity', 2023, 9.5),
  ('solar-pv-mfg-capacity', 2024, 10),
  ('electrolyser-mfg-capacity', 2021, 1),
  ('electrolyser-mfg-capacity', 2022, 2.5),
  ('electrolyser-mfg-capacity', 2023, 4),
  ('electrolyser-mfg-capacity', 2024, 6.5),
  ('clean-tech-trade-balance', 2019, -4),
  ('clean-tech-trade-balance', 2020, -8),
  ('clean-tech-trade-balance', 2021, -15),
  ('clean-tech-trade-balance', 2022, -22),
  ('clean-tech-trade-balance', 2023, -32),
  ('eu-ets-price', 2019, 25),
  ('eu-ets-price', 2020, 25),
  ('eu-ets-price', 2021, 53),
  ('eu-ets-price', 2022, 81),
  ('eu-ets-price', 2023, 84),
  ('eu-ets-price', 2024, 65),
  ('fossil-subsidies', 2018, 56),
  ('fossil-subsidies', 2019, 56),
  ('fossil-subsidies', 2020, 49),
  ('fossil-subsidies', 2021, 56),
  ('fossil-subsidies', 2022, 123),
  ('fossil-subsidies', 2023, 111),
  ('green-bond-issuance', 2019, 110),
  ('green-bond-issuance', 2020, 145),
  ('green-bond-issuance', 2021, 280),
  ('green-bond-issuance', 2022, 240),
  ('green-bond-issuance', 2023, 295),
  ('green-bond-issuance', 2024, 320),
  ('energy-rdd-budget', 2018, 5.5),
  ('energy-rdd-budget', 2019, 5.8),
  ('energy-rdd-budget', 2020, 6.3),
  ('energy-rdd-budget', 2021, 7.5),
  ('energy-rdd-budget', 2022, 9),
  ('energy-rdd-budget', 2023, 10.2),
  ('carbon-pricing-coverage', 2018, 39),
  ('carbon-pricing-coverage', 2020, 41),
  ('carbon-pricing-coverage', 2022, 43),
  ('carbon-pricing-coverage', 2024, 78),
  ('national-climate-laws', 2018, 4),
  ('national-climate-laws', 2020, 8),
  ('national-climate-laws', 2022, 13),
  ('national-climate-laws', 2024, 17),
  ('necp-implementation-score', 2021, 45),
  ('necp-implementation-score', 2022, 50),
  ('necp-implementation-score', 2023, 58),
  ('necp-implementation-score', 2024, 63),
  ('meat-consumption-per-capita', 2018, 70.4),
  ('meat-consumption-per-capita', 2019, 70.2),
  ('meat-consumption-per-capita', 2020, 69.8),
  ('meat-consumption-per-capita', 2021, 70.1),
  ('meat-consumption-per-capita', 2022, 68.5),
  ('meat-consumption-per-capita', 2023, 67.2),
  ('air-passengers-per-capita', 2018, 2.3),
  ('air-passengers-per-capita', 2019, 2.39),
  ('air-passengers-per-capita', 2020, 0.69),
  ('air-passengers-per-capita', 2021, 0.85),
  ('air-passengers-per-capita', 2022, 1.85),
  ('air-passengers-per-capita', 2023, 2.21),
  ('household-energy-per-capita', 2018, 590),
  ('household-energy-per-capita', 2019, 580),
  ('household-energy-per-capita', 2020, 597),
  ('household-energy-per-capita', 2021, 605),
  ('household-energy-per-capita', 2022, 555),
  ('household-energy-per-capita', 2023, 535),
  ('climate-economic-losses', 2018, 16),
  ('climate-economic-losses', 2019, 13),
  ('climate-economic-losses', 2020, 12),
  ('climate-economic-losses', 2021, 56),
  ('climate-economic-losses', 2022, 52),
  ('climate-economic-losses', 2023, 44),
  ('water-exploitation-index', 2018, 5.4),
  ('water-exploitation-index', 2019, 5.5),
  ('water-exploitation-index', 2020, 5.3),
  ('water-exploitation-index', 2021, 5.4),
  ('national-adaptation-strategies', 2018, 20),
  ('national-adaptation-strategies', 2020, 23),
  ('national-adaptation-strategies', 2022, 25),
  ('national-adaptation-strategies', 2024, 26),
  ('international-climate-finance', 2018, 21.7),
  ('international-climate-finance', 2019, 23.2),
  ('international-climate-finance', 2020, 23.4),
  ('international-climate-finance', 2021, 23),
  ('international-climate-finance', 2022, 28.5),
  ('international-climate-finance', 2023, 31.2),
  ('cbam-import-coverage', 2024, 60),
  ('embodied-import-emissions', 2018, 905),
  ('embodied-import-emissions', 2019, 870),
  ('embodied-import-emissions', 2020, 805),
  ('embodied-import-emissions', 2021, 875),
  ('embodied-import-emissions', 2022, 855)
on conflict (indicator_id, year) do nothing;


-- ----------------------------------------------------------------------------
-- 041_seed_esabcc_report_indicators.sql
-- ----------------------------------------------------------------------------

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed the 51 ESABCC report progress indicators (O1-O3, E1-E6, I1-I7,
-- T1-T6, B1-B6, A1-A7, L1-L8, finance/innovation F1-F5) plus their
-- historical time series into pw_indicators / pw_indicator_points for
-- the 'policy-gap-2-0' project.
--
-- Companion to 040_seed_full_ecno_indicators.sql — same rationale:
-- the app-level seeder in src/lib/project-workspace/db.ts cannot
-- insert these rows when the server uses the anon key, because the
-- pw_indicators RLS policy requires auth.uid() is not null. Seeding
-- here in a migration sidesteps that.
--
-- Both inserts are idempotent (on conflict do nothing).
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.pw_indicators
  (id, project_id, name, category, unit, description, source, source_url,
   direction, target_value, target_year, is_seed)
values
  ('esabcc-o1-ghg-total', 'policy-gap-2-0', 'Total EU GHG emissions (European Climate Law scope)', 'emissions', 'Mt CO₂eq', 'ESABCC progress indicator O1. Total EU-27 GHG emissions in the scope of the European Climate Law (EU-27 plus international aviation and maritime). 2030 target: -55% vs 1990; 2050: climate neutrality; ESABCC 2040 advice range: -90 to -95%.', 'EEA GHG data viewer', 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2', 'down', 2150.0, 2030, true),
  ('esabcc-o2-pec', 'policy-gap-2-0', 'Primary energy consumption (EU-27)', 'energy-demand', 'TWh', 'ESABCC progress indicator O2 (primary energy component). EED 2030 indicative benchmark applies; Climate Target Plan MIX 2050 trajectory used as longer-run benchmark.', 'Eurostat (nrg_bal_c)', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table', 'down', null, null, true),
  ('esabcc-o2-fec', 'policy-gap-2-0', 'Final energy consumption (EU-27)', 'energy-demand', 'TWh', 'ESABCC progress indicator O2 (final energy component). 2030 EED indicative benchmark: 763 Mtoe (~8 875 TWh).', 'Eurostat (nrg_bal_c)', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table', 'down', null, null, true),
  ('esabcc-o3-gross-inland', 'policy-gap-2-0', 'Gross inland energy consumption (EU-27)', 'energy-demand', 'TWh', 'ESABCC progress indicator O3. Gross inland energy consumption covering all fuels and renewables. Benchmark from Climate Target Plan MIX 2050 scenario.', 'Eurostat (nrg_bal_c)', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table', 'down', null, null, true),
  ('esabcc-e1-energy-supply-ghg', 'policy-gap-2-0', 'Energy supply GHG emissions', 'energy-supply', 'Mt CO₂eq', 'ESABCC progress indicator E1. Total energy supply emissions: public power & heat, refineries and other energy industries. Fit-for-55 MIX gives the 2030 benchmark.', 'EEA GHG data viewer', 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2', 'down', null, null, true),
  ('esabcc-e2-fossil-power-share', 'policy-gap-2-0', 'Fossil share of EU electricity mix', 'energy-supply', '%', 'ESABCC progress indicator E2 (fossil component). Share of fossil fuels in total electricity generation; complements the renewable share to highlight the substitution pace.', 'Eurostat (nrg_bal_peh)', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_peh/default/table', 'down', null, null, true),
  ('esabcc-e2-res-noBio-power-share', 'policy-gap-2-0', 'Non-biomass renewable share of EU electricity mix', 'energy-supply', '%', 'ESABCC progress indicator E2 (renewables component). Share of non-biomass renewables (wind, solar PV, hydro, geothermal) in total electricity generation.', 'Eurostat (nrg_bal_peh)', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_peh/default/table', 'up', null, null, true),
  ('esabcc-e3-grid-co2-intensity', 'policy-gap-2-0', 'Average GHG intensity of EU electricity', 'energy-supply', 'g CO₂eq/kWh', 'ESABCC progress indicator E3. Average EU electricity GHG intensity (Scope-2). Fit-for-55 MIX 2030 benchmark plus 1.5TECH 2050 trajectory.', 'EEA', 'https://www.eea.europa.eu/en/analysis/indicators/greenhouse-gas-emission-intensity-of-1', 'down', null, null, true),
  ('esabcc-e4a-solar-pv-add', 'policy-gap-2-0', 'Annual solar PV capacity additions (EU)', 'energy-supply', 'GW/yr', 'ESABCC progress indicator E4a. Net new solar photovoltaic capacity commissioned per year across the EU-27.', 'Eurostat (nrg_inf_epcrw)', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_inf_epcrw/default/table', 'up', null, null, true),
  ('esabcc-e4b-wind-add', 'policy-gap-2-0', 'Annual wind capacity additions (EU)', 'energy-supply', 'GW/yr', 'ESABCC progress indicators E4b (onshore) and E4c (offshore). Net new wind capacity commissioned per year, all axes.', 'Eurostat (nrg_inf_epcrw)', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_inf_epcrw/default/table', 'up', null, null, true),
  ('esabcc-e5-electrification', 'policy-gap-2-0', 'Electrification rate of final energy use', 'energy-demand', '%', 'ESABCC progress indicator E5. Share of electricity in total final energy consumption; Fit-for-55 MIX gives the 2030 benchmark.', 'Eurostat (nrg_bal_c)', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table', 'up', null, null, true),
  ('esabcc-e6-energy-ch4', 'policy-gap-2-0', 'Energy-related methane emissions (EU-27)', 'energy-supply', 'Mt CO₂eq', 'ESABCC progress indicator E6. Methane emissions from fuel combustion and fugitives. Aligned with the Methane Regulation.', 'EEA GHG data viewer', 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2', 'down', null, null, true),
  ('esabcc-i1-industry-ghg', 'policy-gap-2-0', 'Industrial GHG emissions', 'industry', 'Mt CO₂eq', 'ESABCC progress indicator I1. Industrial CO₂ plus other GHGs (combustion + process emissions). Fit-for-55 MIX 2030 benchmark.', 'EEA GHG data viewer', 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2', 'down', null, null, true),
  ('esabcc-i3-circular-mat-use', 'policy-gap-2-0', 'Circular material use rate (EU)', 'industry', '%', 'ESABCC progress indicator I3. Share of material input from recycled sources. Circular Economy Action Plan benchmark: 23.4% by 2030.', 'Eurostat (sdg_12_41)', 'https://ec.europa.eu/eurostat/databrowser/view/sdg_12_41/default/table', 'up', 23.400, 2030, true),
  ('esabcc-i4-steel-ghg-intensity', 'policy-gap-2-0', 'GHG intensity of EU steel production', 'industry', 't CO₂/t', 'ESABCC progress indicator I4 (steel component). Total emissions (combustion + process) per tonne of crude steel produced.', 'EEA + Eurofer', 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2', 'down', null, null, true),
  ('esabcc-i4-cement-ghg-intensity', 'policy-gap-2-0', 'GHG intensity of EU cement production', 'industry', 't CO₂/t', 'ESABCC progress indicator I4 (cement component). Total emissions per tonne of cement produced.', 'EEA + Cembureau', 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2', 'down', null, null, true),
  ('esabcc-i4-chemicals-ghg-intensity', 'policy-gap-2-0', 'GHG intensity of EU base organic chemicals', 'industry', 't CO₂/t', 'ESABCC progress indicator I4 (chemicals component). Combustion + process emissions per tonne of ethylene, propylene, methanol etc.', 'EEA + Eurostat (DS-056120)', 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2', 'down', null, null, true),
  ('esabcc-i5-industry-fec', 'policy-gap-2-0', 'Industrial final energy consumption (EU)', 'industry', 'TWh', 'ESABCC progress indicator I5. Final energy use in manufacturing industries (excluding non-energy use).', 'Eurostat (nrg_bal_c)', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table', 'down', null, null, true),
  ('esabcc-i6-industry-electrification', 'policy-gap-2-0', 'Electricity share of industrial final energy use', 'industry', '%', 'ESABCC progress indicator I6. Share of electricity in industrial final energy use (excluding non-energy use). Climate Target Plan benchmarks for 2030 and 2050.', 'Eurostat (nrg_bal_c)', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table', 'up', null, null, true),
  ('esabcc-t1-transport-ghg', 'policy-gap-2-0', 'Transport GHG emissions (EU)', 'transport', 'Mt CO₂eq', 'ESABCC progress indicator T1. All EU-27 transport GHG emissions (road, rail, IWW, aviation). Fit-for-55 MIX 2030 benchmark.', 'EEA GHG data viewer', 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2', 'down', null, null, true),
  ('esabcc-t2a-passenger-demand', 'policy-gap-2-0', 'Total passenger transport demand', 'transport', 'Gpkm', 'ESABCC progress indicator T2a. Total passenger-kilometres travelled across all inland and air modes.', 'Eurostat Statistical Pocketbook', 'https://transport.ec.europa.eu/facts-funding/studies-data/eu-transport-figures-statistical-pocketbook_en', 'down', null, null, true),
  ('esabcc-t2b-freight-demand', 'policy-gap-2-0', 'Total freight transport demand', 'transport', 'Gtkm', 'ESABCC progress indicator T2b. Total freight tonne-kilometres across road, rail and inland waterways.', 'Eurostat Statistical Pocketbook', 'https://transport.ec.europa.eu/facts-funding/studies-data/eu-transport-figures-statistical-pocketbook_en', 'down', null, null, true),
  ('esabcc-t3a-road-share-passenger', 'policy-gap-2-0', 'Road share of motorised inland passenger transport', 'transport', '%', 'ESABCC progress indicator T3a. Passenger-side road share (cars + two-wheelers) of motorised inland transport, excluding aviation, maritime and active modes.', 'Eurostat Statistical Pocketbook', 'https://transport.ec.europa.eu/facts-funding/studies-data/eu-transport-figures-statistical-pocketbook_en', 'down', null, null, true),
  ('esabcc-t3b-air-passenger', 'policy-gap-2-0', 'Intra-EU air passenger transport', 'transport', 'Gpkm', 'ESABCC progress indicator T3b. Intra-EU passenger-kilometres travelled by air; Fit-for-55 MIX 2030 plus 1.5LIFE/TECH 2050 benchmarks.', 'Eurostat Statistical Pocketbook', 'https://transport.ec.europa.eu/facts-funding/studies-data/eu-transport-figures-statistical-pocketbook_en', 'down', null, null, true),
  ('esabcc-t4-car-co2-intensity', 'policy-gap-2-0', 'Average CO₂ intensity of new passenger cars (WLTP)', 'transport', 'g CO₂/km', 'ESABCC progress indicator T4. Average tailpipe CO₂ intensity of newly registered cars, WLTP basis. Reg (EU) 2023/851 sets 0 g/km from 2035.', 'EEA', 'https://www.eea.europa.eu/en/analysis/indicators/co2-performance-of-new-passenger', 'down', 0, 2035, true),
  ('esabcc-t5a-zev-share-newcars', 'policy-gap-2-0', 'ZEV share of new passenger car registrations', 'transport', '%', 'ESABCC progress indicator T5a. Battery-electric + fuel-cell share of new passenger car registrations.', 'EU Alternative Fuels Observatory', 'https://alternative-fuels-observatory.ec.europa.eu/', 'up', 100.0, 2035, true),
  ('esabcc-t5b-zev-lorries-stock', 'policy-gap-2-0', 'Zero-emission lorries in the EU fleet', 'transport', 'vehicles', 'ESABCC progress indicator T5b. Stock of zero-emission heavy-duty lorries on EU roads.', 'EU Alternative Fuels Observatory', 'https://alternative-fuels-observatory.ec.europa.eu/', 'up', null, null, true),
  ('esabcc-t6a-fossil-transport-share', 'policy-gap-2-0', 'Fossil share of transport energy use', 'transport', '%', 'ESABCC progress indicator T6a. Fossil share of transport energy use including international bunker fuels.', 'Eurostat (nrg_bal_c)', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table', 'down', null, null, true),
  ('esabcc-t6b-foodcrop-biofuels', 'policy-gap-2-0', 'Use of first-generation (food-crop) biofuels in transport', 'transport', 'TWh', 'ESABCC progress indicator T6b. Energy from first-generation biofuels (food/feed crops) used in the transport sector.', 'SHARES summary', 'https://ec.europa.eu/eurostat/web/energy/data/shares', 'down', null, null, true),
  ('esabcc-b1-buildings-ghg', 'policy-gap-2-0', 'Residential + tertiary building GHG emissions', 'buildings', 'Mt CO₂eq', 'ESABCC progress indicator B1. Direct GHG emissions from heating, cooling and cooking in residential and tertiary buildings.', 'EEA GHG data viewer', 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2', 'down', null, null, true),
  ('esabcc-b2-buildings-fec', 'policy-gap-2-0', 'Final energy consumption in buildings', 'buildings', 'TWh', 'ESABCC progress indicator B2. Final energy consumption in residential plus tertiary buildings (heating, cooling, appliances, lighting).', 'Eurostat (nrg_bal_c)', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table', 'down', null, null, true),
  ('esabcc-b5a-residential-fossil-share', 'policy-gap-2-0', 'Fossil share of residential energy mix', 'buildings', '%', 'ESABCC progress indicator B5a (fossil component). Share of fossil fuels in residential final energy consumption.', 'Eurostat (nrg_bal_c)', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table', 'down', null, null, true),
  ('esabcc-b5b-tertiary-fossil-share', 'policy-gap-2-0', 'Fossil share of tertiary energy mix', 'buildings', '%', 'ESABCC progress indicator B5b (fossil component). Share of fossil fuels in tertiary sector final energy consumption.', 'Eurostat (nrg_bal_c)', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table', 'down', null, null, true),
  ('esabcc-b6-heat-pump-stock', 'policy-gap-2-0', 'EU stock of installed heat pumps', 'buildings', 'million units', 'ESABCC progress indicator B6. Cumulative stock of heat pumps. REPowerEU 2030 objective requires 60 million units.', 'European Heat Pump Association', 'https://www.ehpa.org/market-data/', 'up', 60.000, 2030, true),
  ('esabcc-a1-agri-nonco2', 'policy-gap-2-0', 'Agricultural non-CO₂ emissions', 'agriculture', 'Mt CO₂eq', 'ESABCC progress indicator A1. Non-CO₂ emissions from EU agriculture (enteric fermentation, manure, fertiliser, other).', 'EEA GHG data viewer', 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2', 'down', null, null, true),
  ('esabcc-a3-fertiliser-use', 'policy-gap-2-0', 'Total fertiliser nitrogen use (EU)', 'agriculture', 'Mt N', 'ESABCC progress indicator A3 (total use). Total nitrogen applied as inorganic + organic fertiliser. Farm-to-Fork 2030 benchmark: 20% reduction vs 2018.', 'EU GHG inventory (CRF)', 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2', 'down', null, null, true),
  ('esabcc-a3-nue', 'policy-gap-2-0', 'Nitrogen use efficiency in EU agriculture', 'agriculture', '%', 'ESABCC progress indicator A3 (efficiency component). Share of applied N that ends up in harvested products.', 'Ludemann et al. 2023', 'https://doi.org/10.1093/jambio/lxac084', 'up', null, null, true),
  ('esabcc-a7-bioenergy-feedstock', 'policy-gap-2-0', 'Agricultural products used as bioenergy feedstock', 'agriculture', 'Mt fresh', 'ESABCC progress indicator A7. Cereal and oilseed crops diverted to bioenergy. Climate Target Plan 2030 benchmark for sustainable levels.', 'JRC medium-term outlook', 'https://datam.jrc.ec.europa.eu/datam/mashup/AGRICULTURAL_OUTLOOK/', 'down', null, null, true),
  ('esabcc-l1-lulucf-net', 'policy-gap-2-0', 'LULUCF net GHG balance', 'lulucf', 'Mt CO₂eq', 'ESABCC progress indicator L1. Net GHG balance for land use, land-use change and forestry (negative = net removals). LULUCF Regulation 2030 target: net -310 Mt CO₂eq.', 'EEA GHG data viewer', 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2', 'down', -310.0, 2030, true),
  ('esabcc-l3-afforestation', 'policy-gap-2-0', 'Annual afforested area', 'lulucf', 'thousand ha/yr', 'ESABCC progress indicator L3. Annual area of land newly classified as forest (afforestation).', 'EU GHG inventory (CRF)', 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2', 'up', null, null, true),
  ('esabcc-l4-deforestation', 'policy-gap-2-0', 'Annual deforested area', 'lulucf', 'thousand ha/yr', 'ESABCC progress indicator L4. Annual area of forest converted to other land uses (deforestation).', 'EU GHG inventory (CRF)', 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2', 'down', null, null, true),
  ('esabcc-l5-settlement-area', 'policy-gap-2-0', 'Annual settlement area increase (net land take proxy)', 'lulucf', 'thousand ha/yr', 'ESABCC progress indicator L5. Annual increase in settlement area used as proxy for net land take. 7th EAP no-net-land-take 2050 target.', 'EU GHG inventory (CRF)', 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2', 'down', 0, 2050, true),
  ('esabcc-l6-forest-sink', 'policy-gap-2-0', 'Forest land living-biomass carbon sink', 'lulucf', 'Mt CO₂eq', 'ESABCC progress indicator L6. Net removals attributed to living forest biomass (negative = removals).', 'EU GHG inventory (CRF)', 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2', 'down', null, null, true),
  ('esabcc-l7-nonforest-lulucf', 'policy-gap-2-0', 'Non-forest LULUCF net GHG emissions', 'lulucf', 'Mt CO₂eq', 'ESABCC progress indicator L7. Net GHG balance from cropland, grassland, wetlands and settlements (positive = net emissions).', 'EU GHG inventory (CRF)', 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2', 'down', null, null, true),
  ('esabcc-l8-bioenergy-use', 'policy-gap-2-0', 'Total bioenergy use (EU-27)', 'lulucf', 'TWh', 'ESABCC progress indicator L8. Final consumption of bioenergy across power, heat, transport, industry and other sectors.', 'Eurostat (nrg_bal_c)', 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table', 'down', null, null, true),
  ('esabcc-f-fossil-subsidies', 'policy-gap-2-0', 'EU fossil-fuel subsidies (FFST)', 'finance', 'billion EUR', 'ESABCC chapter on finance. Total EU fossil-fuel subsidies estimated by the Fossil Fuel Subsidy Tracker. Should fall to zero per Council conclusions.', 'Fossil Fuel Subsidy Tracker', 'https://fossilfuelsubsidytracker.org/', 'down', 0, 2025, true),
  ('esabcc-f-green-bonds', 'policy-gap-2-0', 'EU green bond issuance', 'finance', 'billion EUR', 'ESABCC chapter on finance. Annual green bond issuance by EU issuers (sovereign + corporate).', 'BloombergNEF', 'https://about.bnef.com/clean-energy-investment/', 'up', null, null, true),
  ('esabcc-f-green-bonds-share', 'policy-gap-2-0', 'Green share of EU bond issuance', 'finance', '%', 'ESABCC chapter on finance. Green bonds as a share of total EU bond issuance.', 'BloombergNEF', 'https://about.bnef.com/clean-energy-investment/', 'up', null, null, true),
  ('esabcc-f-gerd', 'policy-gap-2-0', 'EU R&D expenditure (GERD)', 'finance', '% of GDP', 'ESABCC chapter on innovation. Gross domestic expenditure on research and development as a share of GDP. Lisbon agenda target: 3%.', 'Eurostat (rd_e_gerdtot)', 'https://ec.europa.eu/eurostat/databrowser/view/rd_e_gerdtot/default/table', 'up', 3.0000, 2030, true),
  ('esabcc-f-climate-patents-share', 'policy-gap-2-0', 'Climate-related share of EU patent filings', 'finance', '%', 'ESABCC chapter on innovation. Climate-mitigation patents as a share of all EU patent filings (OECD ENV-Tech taxonomy).', 'OECD Green Growth Indicators', 'https://www.oecd.org/environment/indicators-modelling-outlooks/', 'up', null, null, true),
  ('esabcc-f-cleantech-investment', 'policy-gap-2-0', 'Cleantech investment in the EU', 'finance', '% of GDP', 'ESABCC chapter on innovation. Total cleantech investment (public + private) relative to EU GDP.', 'Cleantech for Europe', 'https://www.cleantechforeurope.com/publications/', 'up', null, null, true)
on conflict (id) do nothing;

insert into public.pw_indicator_points (indicator_id, year, value)
values
  ('esabcc-o1-ghg-total', 2005, 4393.9),
  ('esabcc-o1-ghg-total', 2006, 4392.8),
  ('esabcc-o1-ghg-total', 2007, 4417.4),
  ('esabcc-o1-ghg-total', 2008, 4279.6),
  ('esabcc-o1-ghg-total', 2009, 3940.7),
  ('esabcc-o1-ghg-total', 2010, 4025.2),
  ('esabcc-o1-ghg-total', 2011, 3921.3),
  ('esabcc-o1-ghg-total', 2012, 3843.7),
  ('esabcc-o1-ghg-total', 2013, 3752.9),
  ('esabcc-o1-ghg-total', 2014, 3626.5),
  ('esabcc-o1-ghg-total', 2015, 3680.9),
  ('esabcc-o1-ghg-total', 2016, 3696.0),
  ('esabcc-o1-ghg-total', 2017, 3796.3),
  ('esabcc-o1-ghg-total', 2018, 3711.2),
  ('esabcc-o1-ghg-total', 2019, 3564.0),
  ('esabcc-o1-ghg-total', 2020, 3195.8),
  ('esabcc-o1-ghg-total', 2021, 3393.8),
  ('esabcc-o1-ghg-total', 2022, 3333.9),
  ('esabcc-o2-pec', 2005, 17419.0),
  ('esabcc-o2-pec', 2006, 17573.0),
  ('esabcc-o2-pec', 2007, 17331.0),
  ('esabcc-o2-pec', 2008, 17314.0),
  ('esabcc-o2-pec', 2009, 16319.0),
  ('esabcc-o2-pec', 2010, 16951.0),
  ('esabcc-o2-pec', 2011, 16423.0),
  ('esabcc-o2-pec', 2012, 16238.0),
  ('esabcc-o2-pec', 2013, 16098.0),
  ('esabcc-o2-pec', 2014, 15473.0),
  ('esabcc-o2-pec', 2015, 15732.0),
  ('esabcc-o2-pec', 2016, 15864.0),
  ('esabcc-o2-pec', 2017, 16094.0),
  ('esabcc-o2-pec', 2018, 16018.0),
  ('esabcc-o2-pec', 2019, 15748.0),
  ('esabcc-o2-pec', 2020, 14372.0),
  ('esabcc-o2-pec', 2021, 15248.0),
  ('esabcc-o2-fec', 2005, 12110.0),
  ('esabcc-o2-fec', 2006, 12163.0),
  ('esabcc-o2-fec', 2007, 11962.0),
  ('esabcc-o2-fec', 2008, 12057.0),
  ('esabcc-o2-fec', 2009, 11407.0),
  ('esabcc-o2-fec', 2010, 11915.0),
  ('esabcc-o2-fec', 2011, 11451.0),
  ('esabcc-o2-fec', 2012, 11427.0),
  ('esabcc-o2-fec', 2013, 11401.0),
  ('esabcc-o2-fec', 2014, 10918.0),
  ('esabcc-o2-fec', 2015, 11140.0),
  ('esabcc-o2-fec', 2016, 11361.0),
  ('esabcc-o2-fec', 2017, 11502.0),
  ('esabcc-o2-fec', 2018, 11532.0),
  ('esabcc-o2-fec', 2019, 11467.0),
  ('esabcc-o2-fec', 2020, 10540.0),
  ('esabcc-o2-fec', 2021, 11263.0),
  ('esabcc-o3-gross-inland', 2005, 18652.0),
  ('esabcc-o3-gross-inland', 2006, 18809.0),
  ('esabcc-o3-gross-inland', 2007, 18570.0),
  ('esabcc-o3-gross-inland', 2008, 18524.0),
  ('esabcc-o3-gross-inland', 2009, 17430.0),
  ('esabcc-o3-gross-inland', 2010, 18131.0),
  ('esabcc-o3-gross-inland', 2011, 17597.0),
  ('esabcc-o3-gross-inland', 2012, 17372.0),
  ('esabcc-o3-gross-inland', 2013, 17200.0),
  ('esabcc-o3-gross-inland', 2014, 16610.0),
  ('esabcc-o3-gross-inland', 2015, 16842.0),
  ('esabcc-o3-gross-inland', 2016, 16982.0),
  ('esabcc-o3-gross-inland', 2017, 17338.0),
  ('esabcc-o3-gross-inland', 2018, 17228.0),
  ('esabcc-o3-gross-inland', 2019, 16960.0),
  ('esabcc-o3-gross-inland', 2020, 15585.0),
  ('esabcc-o3-gross-inland', 2021, 16534.0),
  ('esabcc-e1-energy-supply-ghg', 2005, 1489.0),
  ('esabcc-e1-energy-supply-ghg', 2006, 1494.0),
  ('esabcc-e1-energy-supply-ghg', 2007, 1504.0),
  ('esabcc-e1-energy-supply-ghg', 2008, 1433.0),
  ('esabcc-e1-energy-supply-ghg', 2009, 1325.0),
  ('esabcc-e1-energy-supply-ghg', 2010, 1343.0),
  ('esabcc-e1-energy-supply-ghg', 2011, 1334.0),
  ('esabcc-e1-energy-supply-ghg', 2012, 1316.0),
  ('esabcc-e1-energy-supply-ghg', 2013, 1254.0),
  ('esabcc-e1-energy-supply-ghg', 2014, 1190.0),
  ('esabcc-e1-energy-supply-ghg', 2015, 1197.0),
  ('esabcc-e1-energy-supply-ghg', 2016, 1169.0),
  ('esabcc-e1-energy-supply-ghg', 2017, 1162.0),
  ('esabcc-e1-energy-supply-ghg', 2018, 1099.0),
  ('esabcc-e1-energy-supply-ghg', 2019, 974.0),
  ('esabcc-e1-energy-supply-ghg', 2020, 842.0),
  ('esabcc-e1-energy-supply-ghg', 2021, 902.0),
  ('esabcc-e1-energy-supply-ghg', 2022, 924.0),
  ('esabcc-e2-fossil-power-share', 2005, 0.51826),
  ('esabcc-e2-fossil-power-share', 2006, 0.51900),
  ('esabcc-e2-fossil-power-share', 2007, 0.52603),
  ('esabcc-e2-fossil-power-share', 2008, 0.50919),
  ('esabcc-e2-fossil-power-share', 2009, 0.49325),
  ('esabcc-e2-fossil-power-share', 2010, 0.47849),
  ('esabcc-e2-fossil-power-share', 2011, 0.48006),
  ('esabcc-e2-fossil-power-share', 2012, 0.45930),
  ('esabcc-e2-fossil-power-share', 2013, 0.43067),
  ('esabcc-e2-fossil-power-share', 2014, 0.40554),
  ('esabcc-e2-fossil-power-share', 2015, 0.41736),
  ('esabcc-e2-fossil-power-share', 2016, 0.42240),
  ('esabcc-e2-fossil-power-share', 2017, 0.43005),
  ('esabcc-e2-fossil-power-share', 2018, 0.40427),
  ('esabcc-e2-fossil-power-share', 2019, 0.38312),
  ('esabcc-e2-fossil-power-share', 2020, 0.35629),
  ('esabcc-e2-fossil-power-share', 2021, 0.36183),
  ('esabcc-e2-fossil-power-share', 2022, 0.38757),
  ('esabcc-e2-res-noBio-power-share', 2005, 0.14264),
  ('esabcc-e2-res-noBio-power-share', 2006, 0.14489),
  ('esabcc-e2-res-noBio-power-share', 2007, 0.15047),
  ('esabcc-e2-res-noBio-power-share', 2008, 0.16090),
  ('esabcc-e2-res-noBio-power-share', 2009, 0.17672),
  ('esabcc-e2-res-noBio-power-share', 2010, 0.19144),
  ('esabcc-e2-res-noBio-power-share', 2011, 0.18791),
  ('esabcc-e2-res-noBio-power-share', 2012, 0.21246),
  ('esabcc-e2-res-noBio-power-share', 2013, 0.23889),
  ('esabcc-e2-res-noBio-power-share', 2014, 0.25273),
  ('esabcc-e2-res-noBio-power-share', 2015, 0.25319),
  ('esabcc-e2-res-noBio-power-share', 2016, 0.25592),
  ('esabcc-e2-res-noBio-power-share', 2017, 0.25383),
  ('esabcc-e2-res-noBio-power-share', 2018, 0.27605),
  ('esabcc-e2-res-noBio-power-share', 2019, 0.29075),
  ('esabcc-e2-res-noBio-power-share', 2020, 0.33230),
  ('esabcc-e2-res-noBio-power-share', 2021, 0.32076),
  ('esabcc-e2-res-noBio-power-share', 2022, 0.33756),
  ('esabcc-e3-grid-co2-intensity', 2005, 379.0),
  ('esabcc-e3-grid-co2-intensity', 2006, 377.0),
  ('esabcc-e3-grid-co2-intensity', 2007, 386.0),
  ('esabcc-e3-grid-co2-intensity', 2008, 363.0),
  ('esabcc-e3-grid-co2-intensity', 2009, 350.0),
  ('esabcc-e3-grid-co2-intensity', 2010, 335.0),
  ('esabcc-e3-grid-co2-intensity', 2011, 342.0),
  ('esabcc-e3-grid-co2-intensity', 2012, 339.0),
  ('esabcc-e3-grid-co2-intensity', 2013, 322.0),
  ('esabcc-e3-grid-co2-intensity', 2014, 313.0),
  ('esabcc-e3-grid-co2-intensity', 2015, 313.0),
  ('esabcc-e3-grid-co2-intensity', 2016, 303.0),
  ('esabcc-e3-grid-co2-intensity', 2017, 302.0),
  ('esabcc-e3-grid-co2-intensity', 2018, 289.0),
  ('esabcc-e3-grid-co2-intensity', 2019, 255.0),
  ('esabcc-e3-grid-co2-intensity', 2020, 228.0),
  ('esabcc-e3-grid-co2-intensity', 2021, 238.0),
  ('esabcc-e3-grid-co2-intensity', 2022, 251.0),
  ('esabcc-e4a-solar-pv-add', 2006, 0.94474),
  ('esabcc-e4a-solar-pv-add', 2007, 1.7612),
  ('esabcc-e4a-solar-pv-add', 2008, 5.3990),
  ('esabcc-e4a-solar-pv-add', 2009, 6.3413),
  ('esabcc-e4a-solar-pv-add', 2010, 13.167),
  ('esabcc-e4a-solar-pv-add', 2011, 22.254),
  ('esabcc-e4a-solar-pv-add', 2012, 16.903),
  ('esabcc-e4a-solar-pv-add', 2013, 8.3634),
  ('esabcc-e4a-solar-pv-add', 2014, 3.9105),
  ('esabcc-e4a-solar-pv-add', 2015, 4.0661),
  ('esabcc-e4a-solar-pv-add', 2016, 3.8153),
  ('esabcc-e4a-solar-pv-add', 2017, 4.7323),
  ('esabcc-e4a-solar-pv-add', 2018, 7.8259),
  ('esabcc-e4a-solar-pv-add', 2019, 16.151),
  ('esabcc-e4a-solar-pv-add', 2020, 18.273),
  ('esabcc-e4a-solar-pv-add', 2021, 25.703),
  ('esabcc-e4b-wind-add', 2006, 5.9316),
  ('esabcc-e4b-wind-add', 2007, 6.8207),
  ('esabcc-e4b-wind-add', 2008, 5.3095),
  ('esabcc-e4b-wind-add', 2009, 9.3227),
  ('esabcc-e4b-wind-add', 2010, 5.8067),
  ('esabcc-e4b-wind-add', 2011, 13.616),
  ('esabcc-e4b-wind-add', 2012, 8.4535),
  ('esabcc-e4b-wind-add', 2013, 6.5593),
  ('esabcc-e4b-wind-add', 2014, 9.0170),
  ('esabcc-e4b-wind-add', 2015, 9.2463),
  ('esabcc-e4b-wind-add', 2016, 9.4488),
  ('esabcc-e4b-wind-add', 2017, 13.181),
  ('esabcc-e4b-wind-add', 2018, 6.5665),
  ('esabcc-e4b-wind-add', 2019, 8.3957),
  ('esabcc-e4b-wind-add', 2020, 7.4540),
  ('esabcc-e4b-wind-add', 2021, 10.717),
  ('esabcc-e5-electrification', 2005, 0.21226),
  ('esabcc-e5-electrification', 2006, 0.21610),
  ('esabcc-e5-electrification', 2007, 0.22198),
  ('esabcc-e5-electrification', 2008, 0.22104),
  ('esabcc-e5-electrification', 2009, 0.22000),
  ('esabcc-e5-electrification', 2010, 0.22181),
  ('esabcc-e5-electrification', 2011, 0.22794),
  ('esabcc-e5-electrification', 2012, 0.22889),
  ('esabcc-e5-electrification', 2013, 0.22722),
  ('esabcc-e5-electrification', 2014, 0.23275),
  ('esabcc-e5-electrification', 2015, 0.23175),
  ('esabcc-e5-electrification', 2016, 0.23008),
  ('esabcc-e5-electrification', 2017, 0.22915),
  ('esabcc-e5-electrification', 2018, 0.22868),
  ('esabcc-e5-electrification', 2019, 0.22735),
  ('esabcc-e5-electrification', 2020, 0.23163),
  ('esabcc-e5-electrification', 2021, 0.22754),
  ('esabcc-e6-energy-ch4', 2005, 110.1),
  ('esabcc-e6-energy-ch4', 2006, 105.8),
  ('esabcc-e6-energy-ch4', 2007, 101.9),
  ('esabcc-e6-energy-ch4', 2008, 102.1),
  ('esabcc-e6-energy-ch4', 2009, 96.449),
  ('esabcc-e6-energy-ch4', 2010, 97.018),
  ('esabcc-e6-energy-ch4', 2011, 93.066),
  ('esabcc-e6-energy-ch4', 2012, 93.858),
  ('esabcc-e6-energy-ch4', 2013, 90.942),
  ('esabcc-e6-energy-ch4', 2014, 85.824),
  ('esabcc-e6-energy-ch4', 2015, 86.298),
  ('esabcc-e6-energy-ch4', 2016, 83.530),
  ('esabcc-e6-energy-ch4', 2017, 82.699),
  ('esabcc-e6-energy-ch4', 2018, 79.691),
  ('esabcc-e6-energy-ch4', 2019, 73.214),
  ('esabcc-e6-energy-ch4', 2020, 69.625),
  ('esabcc-e6-energy-ch4', 2021, 69.905),
  ('esabcc-i1-industry-ghg', 2005, 981.3),
  ('esabcc-i1-industry-ghg', 2006, 973.8),
  ('esabcc-i1-industry-ghg', 2007, 995.6),
  ('esabcc-i1-industry-ghg', 2008, 952.3),
  ('esabcc-i1-industry-ghg', 2009, 789.4),
  ('esabcc-i1-industry-ghg', 2010, 838.8),
  ('esabcc-i1-industry-ghg', 2011, 826.2),
  ('esabcc-i1-industry-ghg', 2012, 795.7),
  ('esabcc-i1-industry-ghg', 2013, 775.5),
  ('esabcc-i1-industry-ghg', 2014, 769.2),
  ('esabcc-i1-industry-ghg', 2015, 768.8),
  ('esabcc-i1-industry-ghg', 2016, 776.2),
  ('esabcc-i1-industry-ghg', 2017, 791.0),
  ('esabcc-i1-industry-ghg', 2018, 785.3),
  ('esabcc-i1-industry-ghg', 2019, 760.1),
  ('esabcc-i1-industry-ghg', 2020, 719.6),
  ('esabcc-i1-industry-ghg', 2021, 757.5),
  ('esabcc-i1-industry-ghg', 2022, 691.3),
  ('esabcc-i3-circular-mat-use', 2010, 0.10800),
  ('esabcc-i3-circular-mat-use', 2011, 0.10300),
  ('esabcc-i3-circular-mat-use', 2012, 0.11100),
  ('esabcc-i3-circular-mat-use', 2013, 0.11300),
  ('esabcc-i3-circular-mat-use', 2014, 0.11200),
  ('esabcc-i3-circular-mat-use', 2015, 0.11300),
  ('esabcc-i3-circular-mat-use', 2016, 0.11500),
  ('esabcc-i3-circular-mat-use', 2017, 0.11500),
  ('esabcc-i3-circular-mat-use', 2018, 0.11700),
  ('esabcc-i3-circular-mat-use', 2019, 0.12000),
  ('esabcc-i3-circular-mat-use', 2020, 0.11700),
  ('esabcc-i3-circular-mat-use', 2021, 0.11700),
  ('esabcc-i4-steel-ghg-intensity', 2008, 1.0098),
  ('esabcc-i4-steel-ghg-intensity', 2009, 1.0024),
  ('esabcc-i4-steel-ghg-intensity', 2010, 0.99422),
  ('esabcc-i4-steel-ghg-intensity', 2011, 0.94457),
  ('esabcc-i4-steel-ghg-intensity', 2012, 0.93710),
  ('esabcc-i4-steel-ghg-intensity', 2013, 0.94990),
  ('esabcc-i4-steel-ghg-intensity', 2014, 0.93783),
  ('esabcc-i4-steel-ghg-intensity', 2015, 0.98710),
  ('esabcc-i4-steel-ghg-intensity', 2016, 0.98607),
  ('esabcc-i4-steel-ghg-intensity', 2017, 0.96558),
  ('esabcc-i4-steel-ghg-intensity', 2018, 0.95261),
  ('esabcc-i4-steel-ghg-intensity', 2019, 0.96751),
  ('esabcc-i4-steel-ghg-intensity', 2020, 0.96049),
  ('esabcc-i4-steel-ghg-intensity', 2021, 0.96225),
  ('esabcc-i4-cement-ghg-intensity', 2005, 0.59873),
  ('esabcc-i4-cement-ghg-intensity', 2006, 0.57444),
  ('esabcc-i4-cement-ghg-intensity', 2007, 0.62302),
  ('esabcc-i4-cement-ghg-intensity', 2008, 0.61587),
  ('esabcc-i4-cement-ghg-intensity', 2009, 0.61302),
  ('esabcc-i4-cement-ghg-intensity', 2010, 0.64292),
  ('esabcc-i4-cement-ghg-intensity', 2011, 0.62482),
  ('esabcc-i4-cement-ghg-intensity', 2012, 0.66730),
  ('esabcc-i4-cement-ghg-intensity', 2013, 0.67402),
  ('esabcc-i4-cement-ghg-intensity', 2014, 0.70294),
  ('esabcc-i4-cement-ghg-intensity', 2015, 0.68949),
  ('esabcc-i4-cement-ghg-intensity', 2016, 0.68247),
  ('esabcc-i4-cement-ghg-intensity', 2017, 0.67514),
  ('esabcc-i4-cement-ghg-intensity', 2018, 0.63237),
  ('esabcc-i4-cement-ghg-intensity', 2019, 0.65355),
  ('esabcc-i4-cement-ghg-intensity', 2020, 0.62368),
  ('esabcc-i4-cement-ghg-intensity', 2021, 0.60380),
  ('esabcc-i4-chemicals-ghg-intensity', 2013, 0.80434),
  ('esabcc-i4-chemicals-ghg-intensity', 2014, 0.73135),
  ('esabcc-i4-chemicals-ghg-intensity', 2015, 0.78741),
  ('esabcc-i4-chemicals-ghg-intensity', 2016, 0.75142),
  ('esabcc-i4-chemicals-ghg-intensity', 2017, 0.77912),
  ('esabcc-i4-chemicals-ghg-intensity', 2018, 0.79047),
  ('esabcc-i4-chemicals-ghg-intensity', 2019, 0.76832),
  ('esabcc-i4-chemicals-ghg-intensity', 2020, 0.78795),
  ('esabcc-i4-chemicals-ghg-intensity', 2021, 0.86644),
  ('esabcc-i4-chemicals-ghg-intensity', 2022, 0.76704),
  ('esabcc-i5-industry-fec', 2005, 3199.7),
  ('esabcc-i5-industry-fec', 2006, 3135.2),
  ('esabcc-i5-industry-fec', 2007, 3189.8),
  ('esabcc-i5-industry-fec', 2008, 3083.2),
  ('esabcc-i5-industry-fec', 2009, 2665.4),
  ('esabcc-i5-industry-fec', 2010, 2836.2),
  ('esabcc-i5-industry-fec', 2011, 2841.2),
  ('esabcc-i5-industry-fec', 2012, 2787.7),
  ('esabcc-i5-industry-fec', 2013, 2753.4),
  ('esabcc-i5-industry-fec', 2014, 2713.3),
  ('esabcc-i5-industry-fec', 2015, 2715.7),
  ('esabcc-i5-industry-fec', 2016, 2765.6),
  ('esabcc-i5-industry-fec', 2017, 2791.9),
  ('esabcc-i5-industry-fec', 2018, 2819.9),
  ('esabcc-i5-industry-fec', 2019, 2782.4),
  ('esabcc-i5-industry-fec', 2020, 2685.6),
  ('esabcc-i5-industry-fec', 2021, 2795.2),
  ('esabcc-i6-industry-electrification', 2005, 0.31714),
  ('esabcc-i6-industry-electrification', 2006, 0.32348),
  ('esabcc-i6-industry-electrification', 2007, 0.32215),
  ('esabcc-i6-industry-electrification', 2008, 0.32540),
  ('esabcc-i6-industry-electrification', 2009, 0.32420),
  ('esabcc-i6-industry-electrification', 2010, 0.32635),
  ('esabcc-i6-industry-electrification', 2011, 0.32963),
  ('esabcc-i6-industry-electrification', 2012, 0.33012),
  ('esabcc-i6-industry-electrification', 2013, 0.32918),
  ('esabcc-i6-industry-electrification', 2014, 0.33541),
  ('esabcc-i6-industry-electrification', 2015, 0.33652),
  ('esabcc-i6-industry-electrification', 2016, 0.33481),
  ('esabcc-i6-industry-electrification', 2017, 0.33756),
  ('esabcc-i6-industry-electrification', 2018, 0.33527),
  ('esabcc-i6-industry-electrification', 2019, 0.33537),
  ('esabcc-i6-industry-electrification', 2020, 0.32928),
  ('esabcc-i6-industry-electrification', 2021, 0.33215),
  ('esabcc-t1-transport-ghg', 2005, 943.5),
  ('esabcc-t1-transport-ghg', 2006, 956.7),
  ('esabcc-t1-transport-ghg', 2007, 969.8),
  ('esabcc-t1-transport-ghg', 2008, 952.3),
  ('esabcc-t1-transport-ghg', 2009, 921.9),
  ('esabcc-t1-transport-ghg', 2010, 918.0),
  ('esabcc-t1-transport-ghg', 2011, 911.1),
  ('esabcc-t1-transport-ghg', 2012, 880.4),
  ('esabcc-t1-transport-ghg', 2013, 875.4),
  ('esabcc-t1-transport-ghg', 2014, 882.7),
  ('esabcc-t1-transport-ghg', 2015, 901.8),
  ('esabcc-t1-transport-ghg', 2016, 925.8),
  ('esabcc-t1-transport-ghg', 2017, 949.1),
  ('esabcc-t1-transport-ghg', 2018, 956.8),
  ('esabcc-t1-transport-ghg', 2019, 965.7),
  ('esabcc-t1-transport-ghg', 2020, 776.3),
  ('esabcc-t1-transport-ghg', 2021, 851.9),
  ('esabcc-t1-transport-ghg', 2022, 906.6),
  ('esabcc-t2a-passenger-demand', 2005, 5225.9),
  ('esabcc-t2a-passenger-demand', 2006, 5287.1),
  ('esabcc-t2a-passenger-demand', 2007, 5360.8),
  ('esabcc-t2a-passenger-demand', 2008, 5389.9),
  ('esabcc-t2a-passenger-demand', 2009, 5410.6),
  ('esabcc-t2a-passenger-demand', 2010, 5388.2),
  ('esabcc-t2a-passenger-demand', 2011, 5400.6),
  ('esabcc-t2a-passenger-demand', 2012, 5346.8),
  ('esabcc-t2a-passenger-demand', 2013, 5412.2),
  ('esabcc-t2a-passenger-demand', 2014, 5490.2),
  ('esabcc-t2a-passenger-demand', 2015, 5625.4),
  ('esabcc-t2a-passenger-demand', 2016, 5763.7),
  ('esabcc-t2a-passenger-demand', 2017, 5843.2),
  ('esabcc-t2a-passenger-demand', 2018, 5913.9),
  ('esabcc-t2a-passenger-demand', 2019, 5992.2),
  ('esabcc-t2a-passenger-demand', 2020, 4435.8),
  ('esabcc-t2b-freight-demand', 2005, 2121.4),
  ('esabcc-t2b-freight-demand', 2006, 2193.5),
  ('esabcc-t2b-freight-demand', 2007, 2273.8),
  ('esabcc-t2b-freight-demand', 2008, 2245.1),
  ('esabcc-t2b-freight-demand', 2009, 1992.3),
  ('esabcc-t2b-freight-demand', 2010, 2088.6),
  ('esabcc-t2b-freight-demand', 2011, 2084.6),
  ('esabcc-t2b-freight-demand', 2012, 2016.7),
  ('esabcc-t2b-freight-demand', 2013, 2053.3),
  ('esabcc-t2b-freight-demand', 2014, 2067.1),
  ('esabcc-t2b-freight-demand', 2015, 2107.9),
  ('esabcc-t2b-freight-demand', 2016, 2173.8),
  ('esabcc-t2b-freight-demand', 2017, 2265.8),
  ('esabcc-t2b-freight-demand', 2018, 2257.1),
  ('esabcc-t2b-freight-demand', 2019, 2312.4),
  ('esabcc-t2b-freight-demand', 2020, 2254.0),
  ('esabcc-t3a-road-share-passenger', 2005, 0.81277),
  ('esabcc-t3a-road-share-passenger', 2006, 0.81229),
  ('esabcc-t3a-road-share-passenger', 2007, 0.81127),
  ('esabcc-t3a-road-share-passenger', 2008, 0.80823),
  ('esabcc-t3a-road-share-passenger', 2009, 0.81627),
  ('esabcc-t3a-road-share-passenger', 2010, 0.81616),
  ('esabcc-t3a-road-share-passenger', 2011, 0.81355),
  ('esabcc-t3a-road-share-passenger', 2012, 0.81170),
  ('esabcc-t3a-road-share-passenger', 2013, 0.81337),
  ('esabcc-t3a-road-share-passenger', 2014, 0.81544),
  ('esabcc-t3a-road-share-passenger', 2015, 0.81537),
  ('esabcc-t3a-road-share-passenger', 2016, 0.81647),
  ('esabcc-t3a-road-share-passenger', 2017, 0.81826),
  ('esabcc-t3a-road-share-passenger', 2018, 0.81687),
  ('esabcc-t3a-road-share-passenger', 2019, 0.81588),
  ('esabcc-t3a-road-share-passenger', 2020, 0.86500),
  ('esabcc-t3b-air-passenger', 2005, 361.3),
  ('esabcc-t3b-air-passenger', 2006, 376.4),
  ('esabcc-t3b-air-passenger', 2007, 392.2),
  ('esabcc-t3b-air-passenger', 2008, 383.8),
  ('esabcc-t3b-air-passenger', 2009, 361.8),
  ('esabcc-t3b-air-passenger', 2010, 377.3),
  ('esabcc-t3b-air-passenger', 2011, 408.5),
  ('esabcc-t3b-air-passenger', 2012, 402.1),
  ('esabcc-t3b-air-passenger', 2013, 406.0),
  ('esabcc-t3b-air-passenger', 2014, 425.6),
  ('esabcc-t3b-air-passenger', 2015, 451.8),
  ('esabcc-t3b-air-passenger', 2016, 492.6),
  ('esabcc-t3b-air-passenger', 2017, 538.4),
  ('esabcc-t3b-air-passenger', 2018, 571.8),
  ('esabcc-t3b-air-passenger', 2019, 585.5),
  ('esabcc-t3b-air-passenger', 2020, 177.9),
  ('esabcc-t4-car-co2-intensity', 2020, 130.3),
  ('esabcc-t4-car-co2-intensity', 2021, 114.1),
  ('esabcc-t4-car-co2-intensity', 2022, 108.2),
  ('esabcc-t5a-zev-share-newcars', 2010, 0.00010),
  ('esabcc-t5a-zev-share-newcars', 2011, 0.00070),
  ('esabcc-t5a-zev-share-newcars', 2012, 0.00130),
  ('esabcc-t5a-zev-share-newcars', 2013, 0.00220),
  ('esabcc-t5a-zev-share-newcars', 2014, 0.00330),
  ('esabcc-t5a-zev-share-newcars', 2015, 0.00460),
  ('esabcc-t5a-zev-share-newcars', 2016, 0.00470),
  ('esabcc-t5a-zev-share-newcars', 2017, 0.00680),
  ('esabcc-t5a-zev-share-newcars', 2018, 0.01060),
  ('esabcc-t5a-zev-share-newcars', 2019, 0.01900),
  ('esabcc-t5a-zev-share-newcars', 2020, 0.05390),
  ('esabcc-t5a-zev-share-newcars', 2021, 0.08870),
  ('esabcc-t5a-zev-share-newcars', 2022, 0.13410),
  ('esabcc-t5b-zev-lorries-stock', 2015, 71.000),
  ('esabcc-t5b-zev-lorries-stock', 2016, 117.0),
  ('esabcc-t5b-zev-lorries-stock', 2017, 151.0),
  ('esabcc-t5b-zev-lorries-stock', 2018, 227.0),
  ('esabcc-t5b-zev-lorries-stock', 2019, 601.0),
  ('esabcc-t5b-zev-lorries-stock', 2020, 964.0),
  ('esabcc-t5b-zev-lorries-stock', 2021, 2150.0),
  ('esabcc-t5b-zev-lorries-stock', 2022, 3794.0),
  ('esabcc-t6a-fossil-transport-share', 2005, 0.97693),
  ('esabcc-t6a-fossil-transport-share', 2006, 0.97248),
  ('esabcc-t6a-fossil-transport-share', 2007, 0.96783),
  ('esabcc-t6a-fossil-transport-share', 2008, 0.96314),
  ('esabcc-t6a-fossil-transport-share', 2009, 0.95722),
  ('esabcc-t6a-fossil-transport-share', 2010, 0.95306),
  ('esabcc-t6a-fossil-transport-share', 2011, 0.95080),
  ('esabcc-t6a-fossil-transport-share', 2012, 0.94663),
  ('esabcc-t6a-fossil-transport-share', 2013, 0.95000),
  ('esabcc-t6a-fossil-transport-share', 2014, 0.94800),
  ('esabcc-t6a-fossil-transport-share', 2015, 0.94861),
  ('esabcc-t6a-fossil-transport-share', 2016, 0.95056),
  ('esabcc-t6a-fossil-transport-share', 2017, 0.94843),
  ('esabcc-t6a-fossil-transport-share', 2018, 0.94507),
  ('esabcc-t6a-fossil-transport-share', 2019, 0.94395),
  ('esabcc-t6a-fossil-transport-share', 2020, 0.93223),
  ('esabcc-t6a-fossil-transport-share', 2021, 0.93436),
  ('esabcc-t6b-foodcrop-biofuels', 2005, 80.362),
  ('esabcc-t6b-foodcrop-biofuels', 2006, 107.1),
  ('esabcc-t6b-foodcrop-biofuels', 2007, 104.8),
  ('esabcc-t6b-foodcrop-biofuels', 2008, 111.3),
  ('esabcc-t6b-foodcrop-biofuels', 2009, 109.7),
  ('esabcc-t6b-foodcrop-biofuels', 2010, 110.7),
  ('esabcc-t6b-foodcrop-biofuels', 2011, 116.8),
  ('esabcc-t6b-foodcrop-biofuels', 2012, 124.9),
  ('esabcc-t6b-foodcrop-biofuels', 2013, 128.3),
  ('esabcc-t6b-foodcrop-biofuels', 2014, 122.9),
  ('esabcc-t6b-foodcrop-biofuels', 2015, 118.1),
  ('esabcc-b1-buildings-ghg', 2005, 665.0),
  ('esabcc-b1-buildings-ghg', 2006, 663.4),
  ('esabcc-b1-buildings-ghg', 2007, 589.5),
  ('esabcc-b1-buildings-ghg', 2008, 635.1),
  ('esabcc-b1-buildings-ghg', 2009, 621.4),
  ('esabcc-b1-buildings-ghg', 2010, 656.1),
  ('esabcc-b1-buildings-ghg', 2011, 581.5),
  ('esabcc-b1-buildings-ghg', 2012, 589.6),
  ('esabcc-b1-buildings-ghg', 2013, 593.9),
  ('esabcc-b1-buildings-ghg', 2014, 517.8),
  ('esabcc-b1-buildings-ghg', 2015, 541.0),
  ('esabcc-b1-buildings-ghg', 2016, 547.7),
  ('esabcc-b1-buildings-ghg', 2017, 545.7),
  ('esabcc-b1-buildings-ghg', 2018, 532.9),
  ('esabcc-b1-buildings-ghg', 2019, 522.8),
  ('esabcc-b1-buildings-ghg', 2020, 519.7),
  ('esabcc-b1-buildings-ghg', 2021, 532.5),
  ('esabcc-b1-buildings-ghg', 2022, 481.8),
  ('esabcc-b2-buildings-fec', 2005, 4899.7),
  ('esabcc-b2-buildings-fec', 2006, 4928.3),
  ('esabcc-b2-buildings-fec', 2007, 4656.5),
  ('esabcc-b2-buildings-fec', 2008, 4921.5),
  ('esabcc-b2-buildings-fec', 2009, 4894.4),
  ('esabcc-b2-buildings-fec', 2010, 5168.7),
  ('esabcc-b2-buildings-fec', 2011, 4712.0),
  ('esabcc-b2-buildings-fec', 2012, 4871.4),
  ('esabcc-b2-buildings-fec', 2013, 4929.8),
  ('esabcc-b2-buildings-fec', 2014, 4449.7),
  ('esabcc-b2-buildings-fec', 2015, 4629.8),
  ('esabcc-b2-buildings-fec', 2016, 4721.9),
  ('esabcc-b2-buildings-fec', 2017, 4778.3),
  ('esabcc-b2-buildings-fec', 2018, 4757.0),
  ('esabcc-b2-buildings-fec', 2019, 4707.6),
  ('esabcc-b2-buildings-fec', 2020, 4625.9),
  ('esabcc-b2-buildings-fec', 2021, 4878.7),
  ('esabcc-b5a-residential-fossil-share', 2005, 0.56612),
  ('esabcc-b5a-residential-fossil-share', 2006, 0.55726),
  ('esabcc-b5a-residential-fossil-share', 2007, 0.51742),
  ('esabcc-b5a-residential-fossil-share', 2008, 0.52642),
  ('esabcc-b5a-residential-fossil-share', 2009, 0.51881),
  ('esabcc-b5a-residential-fossil-share', 2010, 0.51870),
  ('esabcc-b5a-residential-fossil-share', 2011, 0.50365),
  ('esabcc-b5a-residential-fossil-share', 2012, 0.49742),
  ('esabcc-b5a-residential-fossil-share', 2013, 0.49653),
  ('esabcc-b5a-residential-fossil-share', 2014, 0.47284),
  ('esabcc-b5a-residential-fossil-share', 2015, 0.47990),
  ('esabcc-b5a-residential-fossil-share', 2016, 0.48443),
  ('esabcc-b5a-residential-fossil-share', 2017, 0.47891),
  ('esabcc-b5a-residential-fossil-share', 2018, 0.46978),
  ('esabcc-b5a-residential-fossil-share', 2019, 0.46525),
  ('esabcc-b5a-residential-fossil-share', 2020, 0.46744),
  ('esabcc-b5a-residential-fossil-share', 2021, 0.45582),
  ('esabcc-b5b-tertiary-fossil-share', 2005, 0.46978),
  ('esabcc-b5b-tertiary-fossil-share', 2006, 0.46655),
  ('esabcc-b5b-tertiary-fossil-share', 2007, 0.42854),
  ('esabcc-b5b-tertiary-fossil-share', 2008, 0.43894),
  ('esabcc-b5b-tertiary-fossil-share', 2009, 0.43256),
  ('esabcc-b5b-tertiary-fossil-share', 2010, 0.42838),
  ('esabcc-b5b-tertiary-fossil-share', 2011, 0.40797),
  ('esabcc-b5b-tertiary-fossil-share', 2012, 0.40900),
  ('esabcc-b5b-tertiary-fossil-share', 2013, 0.42421),
  ('esabcc-b5b-tertiary-fossil-share', 2014, 0.39977),
  ('esabcc-b5b-tertiary-fossil-share', 2015, 0.40365),
  ('esabcc-b5b-tertiary-fossil-share', 2016, 0.40134),
  ('esabcc-b5b-tertiary-fossil-share', 2017, 0.38967),
  ('esabcc-b5b-tertiary-fossil-share', 2018, 0.37706),
  ('esabcc-b5b-tertiary-fossil-share', 2019, 0.37125),
  ('esabcc-b5b-tertiary-fossil-share', 2020, 0.37283),
  ('esabcc-b5b-tertiary-fossil-share', 2021, 0.38737),
  ('esabcc-b6-heat-pump-stock', 2005, 1.1000),
  ('esabcc-b6-heat-pump-stock', 2006, 1.6000),
  ('esabcc-b6-heat-pump-stock', 2007, 2.1700),
  ('esabcc-b6-heat-pump-stock', 2008, 2.9800),
  ('esabcc-b6-heat-pump-stock', 2009, 3.7100),
  ('esabcc-b6-heat-pump-stock', 2010, 4.5000),
  ('esabcc-b6-heat-pump-stock', 2011, 5.3000),
  ('esabcc-b6-heat-pump-stock', 2012, 6.0300),
  ('esabcc-b6-heat-pump-stock', 2013, 6.7800),
  ('esabcc-b6-heat-pump-stock', 2014, 7.5500),
  ('esabcc-b6-heat-pump-stock', 2015, 8.4300),
  ('esabcc-b6-heat-pump-stock', 2016, 9.4100),
  ('esabcc-b6-heat-pump-stock', 2017, 10.500),
  ('esabcc-b6-heat-pump-stock', 2018, 11.780),
  ('esabcc-b6-heat-pump-stock', 2019, 13.210),
  ('esabcc-b6-heat-pump-stock', 2020, 14.770),
  ('esabcc-b6-heat-pump-stock', 2021, 16.870),
  ('esabcc-b6-heat-pump-stock', 2022, 19.790),
  ('esabcc-a1-agri-nonco2', 2005, 380.1),
  ('esabcc-a1-agri-nonco2', 2006, 377.3),
  ('esabcc-a1-agri-nonco2', 2007, 380.2),
  ('esabcc-a1-agri-nonco2', 2008, 377.8),
  ('esabcc-a1-agri-nonco2', 2009, 372.7),
  ('esabcc-a1-agri-nonco2', 2010, 367.5),
  ('esabcc-a1-agri-nonco2', 2011, 366.7),
  ('esabcc-a1-agri-nonco2', 2012, 366.3),
  ('esabcc-a1-agri-nonco2', 2013, 367.9),
  ('esabcc-a1-agri-nonco2', 2014, 372.9),
  ('esabcc-a1-agri-nonco2', 2015, 374.5),
  ('esabcc-a1-agri-nonco2', 2016, 375.9),
  ('esabcc-a1-agri-nonco2', 2017, 378.2),
  ('esabcc-a1-agri-nonco2', 2018, 375.0),
  ('esabcc-a1-agri-nonco2', 2019, 370.9),
  ('esabcc-a1-agri-nonco2', 2020, 371.9),
  ('esabcc-a1-agri-nonco2', 2021, 368.6),
  ('esabcc-a1-agri-nonco2', 2022, 360.9),
  ('esabcc-a3-fertiliser-use', 2005, 14.901),
  ('esabcc-a3-fertiliser-use', 2006, 14.808),
  ('esabcc-a3-fertiliser-use', 2007, 15.010),
  ('esabcc-a3-fertiliser-use', 2008, 14.783),
  ('esabcc-a3-fertiliser-use', 2009, 14.304),
  ('esabcc-a3-fertiliser-use', 2010, 14.368),
  ('esabcc-a3-fertiliser-use', 2011, 14.598),
  ('esabcc-a3-fertiliser-use', 2012, 14.720),
  ('esabcc-a3-fertiliser-use', 2013, 14.900),
  ('esabcc-a3-fertiliser-use', 2014, 15.196),
  ('esabcc-a3-fertiliser-use', 2015, 15.412),
  ('esabcc-a3-fertiliser-use', 2016, 15.514),
  ('esabcc-a3-fertiliser-use', 2017, 15.725),
  ('esabcc-a3-fertiliser-use', 2018, 15.569),
  ('esabcc-a3-fertiliser-use', 2019, 15.053),
  ('esabcc-a3-fertiliser-use', 2020, 15.239),
  ('esabcc-a3-fertiliser-use', 2021, 15.010),
  ('esabcc-a3-nue', 2005, 46.821),
  ('esabcc-a3-nue', 2006, 44.636),
  ('esabcc-a3-nue', 2007, 42.011),
  ('esabcc-a3-nue', 2008, 52.450),
  ('esabcc-a3-nue', 2009, 52.287),
  ('esabcc-a3-nue', 2010, 46.899),
  ('esabcc-a3-nue', 2011, 49.498),
  ('esabcc-a3-nue', 2012, 46.835),
  ('esabcc-a3-nue', 2013, 50.192),
  ('esabcc-a3-nue', 2014, 52.692),
  ('esabcc-a3-nue', 2015, 49.928),
  ('esabcc-a3-nue', 2016, 47.750),
  ('esabcc-a3-nue', 2017, 49.603),
  ('esabcc-a3-nue', 2018, 47.740),
  ('esabcc-a3-nue', 2019, 50.899),
  ('esabcc-a3-nue', 2020, 49.033),
  ('esabcc-a7-bioenergy-feedstock', 2005, 7.0211),
  ('esabcc-a7-bioenergy-feedstock', 2006, 9.0117),
  ('esabcc-a7-bioenergy-feedstock', 2007, 11.496),
  ('esabcc-a7-bioenergy-feedstock', 2008, 13.994),
  ('esabcc-a7-bioenergy-feedstock', 2009, 16.884),
  ('esabcc-a7-bioenergy-feedstock', 2010, 18.755),
  ('esabcc-a7-bioenergy-feedstock', 2011, 19.867),
  ('esabcc-a7-bioenergy-feedstock', 2012, 19.583),
  ('esabcc-a7-bioenergy-feedstock', 2013, 20.398),
  ('esabcc-a7-bioenergy-feedstock', 2014, 22.090),
  ('esabcc-a7-bioenergy-feedstock', 2015, 20.522),
  ('esabcc-a7-bioenergy-feedstock', 2016, 20.358),
  ('esabcc-a7-bioenergy-feedstock', 2017, 22.281),
  ('esabcc-a7-bioenergy-feedstock', 2018, 22.288),
  ('esabcc-a7-bioenergy-feedstock', 2019, 22.141),
  ('esabcc-a7-bioenergy-feedstock', 2020, 22.954),
  ('esabcc-a7-bioenergy-feedstock', 2021, 23.891),
  ('esabcc-l1-lulucf-net', 2005, -342.0),
  ('esabcc-l1-lulucf-net', 2006, -351.0),
  ('esabcc-l1-lulucf-net', 2007, -301.0),
  ('esabcc-l1-lulucf-net', 2008, -344.0),
  ('esabcc-l1-lulucf-net', 2009, -347.0),
  ('esabcc-l1-lulucf-net', 2010, -353.0),
  ('esabcc-l1-lulucf-net', 2011, -347.0),
  ('esabcc-l1-lulucf-net', 2012, -343.0),
  ('esabcc-l1-lulucf-net', 2013, -343.0),
  ('esabcc-l1-lulucf-net', 2014, -328.0),
  ('esabcc-l1-lulucf-net', 2015, -322.0),
  ('esabcc-l1-lulucf-net', 2016, -318.0),
  ('esabcc-l1-lulucf-net', 2017, -250.0),
  ('esabcc-l1-lulucf-net', 2018, -258.0),
  ('esabcc-l1-lulucf-net', 2019, -247.0),
  ('esabcc-l1-lulucf-net', 2020, -241.0),
  ('esabcc-l1-lulucf-net', 2021, -230.0),
  ('esabcc-l1-lulucf-net', 2022, -244.0),
  ('esabcc-l3-afforestation', 2005, 488.0),
  ('esabcc-l3-afforestation', 2006, 435.7),
  ('esabcc-l3-afforestation', 2007, 407.4),
  ('esabcc-l3-afforestation', 2008, 338.0),
  ('esabcc-l3-afforestation', 2009, 334.0),
  ('esabcc-l3-afforestation', 2010, 301.0),
  ('esabcc-l3-afforestation', 2011, 288.3),
  ('esabcc-l3-afforestation', 2012, 282.8),
  ('esabcc-l3-afforestation', 2013, 294.5),
  ('esabcc-l3-afforestation', 2014, 266.7),
  ('esabcc-l3-afforestation', 2015, 272.8),
  ('esabcc-l3-afforestation', 2016, 298.1),
  ('esabcc-l3-afforestation', 2017, 343.2),
  ('esabcc-l3-afforestation', 2018, 299.8),
  ('esabcc-l3-afforestation', 2019, 310.2),
  ('esabcc-l3-afforestation', 2020, 297.7),
  ('esabcc-l3-afforestation', 2021, 326.8),
  ('esabcc-l4-deforestation', 2005, -125.9),
  ('esabcc-l4-deforestation', 2006, -129.8),
  ('esabcc-l4-deforestation', 2007, -138.5),
  ('esabcc-l4-deforestation', 2008, -122.7),
  ('esabcc-l4-deforestation', 2009, -127.5),
  ('esabcc-l4-deforestation', 2010, -132.7),
  ('esabcc-l4-deforestation', 2011, -112.7),
  ('esabcc-l4-deforestation', 2012, -110.3),
  ('esabcc-l4-deforestation', 2013, -141.7),
  ('esabcc-l4-deforestation', 2014, -125.1),
  ('esabcc-l4-deforestation', 2015, -121.8),
  ('esabcc-l4-deforestation', 2016, -143.4),
  ('esabcc-l4-deforestation', 2017, -119.1),
  ('esabcc-l4-deforestation', 2018, -115.2),
  ('esabcc-l4-deforestation', 2019, -114.0),
  ('esabcc-l4-deforestation', 2020, -112.9),
  ('esabcc-l4-deforestation', 2021, -114.5),
  ('esabcc-l5-settlement-area', 2006, 401.2),
  ('esabcc-l5-settlement-area', 2007, 231.9),
  ('esabcc-l5-settlement-area', 2008, 225.9),
  ('esabcc-l5-settlement-area', 2009, 236.6),
  ('esabcc-l5-settlement-area', 2010, 232.0),
  ('esabcc-l5-settlement-area', 2011, 228.5),
  ('esabcc-l5-settlement-area', 2012, 231.9),
  ('esabcc-l5-settlement-area', 2013, 155.9),
  ('esabcc-l5-settlement-area', 2014, 265.3),
  ('esabcc-l5-settlement-area', 2015, 125.6),
  ('esabcc-l5-settlement-area', 2016, 179.2),
  ('esabcc-l5-settlement-area', 2017, 141.5),
  ('esabcc-l5-settlement-area', 2018, 164.3),
  ('esabcc-l5-settlement-area', 2019, 149.3),
  ('esabcc-l5-settlement-area', 2020, 157.5),
  ('esabcc-l5-settlement-area', 2021, 142.2),
  ('esabcc-l6-forest-sink', 2005, 361.8),
  ('esabcc-l6-forest-sink', 2006, 356.5),
  ('esabcc-l6-forest-sink', 2007, 319.8),
  ('esabcc-l6-forest-sink', 2008, 392.1),
  ('esabcc-l6-forest-sink', 2009, 397.4),
  ('esabcc-l6-forest-sink', 2010, 389.1),
  ('esabcc-l6-forest-sink', 2011, 380.5),
  ('esabcc-l6-forest-sink', 2012, 382.7),
  ('esabcc-l6-forest-sink', 2013, 391.1),
  ('esabcc-l6-forest-sink', 2014, 362.0),
  ('esabcc-l6-forest-sink', 2015, 342.9),
  ('esabcc-l6-forest-sink', 2016, 337.4),
  ('esabcc-l6-forest-sink', 2017, 287.6),
  ('esabcc-l6-forest-sink', 2018, 267.2),
  ('esabcc-l6-forest-sink', 2019, 245.1),
  ('esabcc-l6-forest-sink', 2020, 246.7),
  ('esabcc-l6-forest-sink', 2021, 231.8),
  ('esabcc-l7-nonforest-lulucf', 2005, 127.8),
  ('esabcc-l7-nonforest-lulucf', 2006, 121.8),
  ('esabcc-l7-nonforest-lulucf', 2007, 131.9),
  ('esabcc-l7-nonforest-lulucf', 2008, 130.7),
  ('esabcc-l7-nonforest-lulucf', 2009, 130.9),
  ('esabcc-l7-nonforest-lulucf', 2010, 117.8),
  ('esabcc-l7-nonforest-lulucf', 2011, 115.9),
  ('esabcc-l7-nonforest-lulucf', 2012, 114.6),
  ('esabcc-l7-nonforest-lulucf', 2013, 128.0),
  ('esabcc-l7-nonforest-lulucf', 2014, 108.2),
  ('esabcc-l7-nonforest-lulucf', 2015, 103.1),
  ('esabcc-l7-nonforest-lulucf', 2016, 100.4),
  ('esabcc-l7-nonforest-lulucf', 2017, 103.3),
  ('esabcc-l7-nonforest-lulucf', 2018, 94.002),
  ('esabcc-l7-nonforest-lulucf', 2019, 89.439),
  ('esabcc-l7-nonforest-lulucf', 2020, 91.215),
  ('esabcc-l7-nonforest-lulucf', 2021, 97.441),
  ('esabcc-l8-bioenergy-use', 2005, 896.4),
  ('esabcc-l8-bioenergy-use', 2006, 972.1),
  ('esabcc-l8-bioenergy-use', 2007, 1075.9),
  ('esabcc-l8-bioenergy-use', 2008, 1192.6),
  ('esabcc-l8-bioenergy-use', 2009, 1270.3),
  ('esabcc-l8-bioenergy-use', 2010, 1406.2),
  ('esabcc-l8-bioenergy-use', 2011, 1374.0),
  ('esabcc-l8-bioenergy-use', 2012, 1504.2),
  ('esabcc-l8-bioenergy-use', 2013, 1505.7),
  ('esabcc-l8-bioenergy-use', 2014, 1474.3),
  ('esabcc-l8-bioenergy-use', 2015, 1515.4),
  ('esabcc-l8-bioenergy-use', 2016, 1524.4),
  ('esabcc-l8-bioenergy-use', 2017, 1570.7),
  ('esabcc-l8-bioenergy-use', 2018, 1642.1),
  ('esabcc-l8-bioenergy-use', 2019, 1679.0),
  ('esabcc-l8-bioenergy-use', 2020, 1684.1),
  ('esabcc-l8-bioenergy-use', 2021, 1795.7),
  ('esabcc-f-fossil-subsidies', 2010, 46.097),
  ('esabcc-f-fossil-subsidies', 2011, 49.078),
  ('esabcc-f-fossil-subsidies', 2012, 48.053),
  ('esabcc-f-fossil-subsidies', 2013, 48.375),
  ('esabcc-f-fossil-subsidies', 2014, 48.247),
  ('esabcc-f-fossil-subsidies', 2015, 44.222),
  ('esabcc-f-fossil-subsidies', 2016, 45.004),
  ('esabcc-f-fossil-subsidies', 2017, 47.586),
  ('esabcc-f-fossil-subsidies', 2018, 53.773),
  ('esabcc-f-fossil-subsidies', 2019, 51.529),
  ('esabcc-f-fossil-subsidies', 2020, 50.785),
  ('esabcc-f-fossil-subsidies', 2021, 56.000),
  ('esabcc-f-fossil-subsidies', 2022, 122.0),
  ('esabcc-f-green-bonds', 2012, 0.39100),
  ('esabcc-f-green-bonds', 2013, 0.56000),
  ('esabcc-f-green-bonds', 2014, 7.9940),
  ('esabcc-f-green-bonds', 2015, 9.5850),
  ('esabcc-f-green-bonds', 2016, 22.450),
  ('esabcc-f-green-bonds', 2017, 68.989),
  ('esabcc-f-green-bonds', 2018, 57.200),
  ('esabcc-f-green-bonds', 2019, 113.9),
  ('esabcc-f-green-bonds', 2020, 141.8),
  ('esabcc-f-green-bonds', 2021, 261.5),
  ('esabcc-f-green-bonds', 2022, 243.0),
  ('esabcc-f-green-bonds-share', 2012, 0.00080),
  ('esabcc-f-green-bonds-share', 2013, 0.00098),
  ('esabcc-f-green-bonds-share', 2014, 0.00828),
  ('esabcc-f-green-bonds-share', 2015, 0.00849),
  ('esabcc-f-green-bonds-share', 2016, 0.01693),
  ('esabcc-f-green-bonds-share', 2017, 0.04179),
  ('esabcc-f-green-bonds-share', 2018, 0.03186),
  ('esabcc-f-green-bonds-share', 2019, 0.04817),
  ('esabcc-f-green-bonds-share', 2020, 0.04573),
  ('esabcc-f-green-bonds-share', 2021, 0.08080),
  ('esabcc-f-green-bonds-share', 2022, 0.06735),
  ('esabcc-f-gerd', 2012, 2.0200),
  ('esabcc-f-gerd', 2013, 2.0800),
  ('esabcc-f-gerd', 2014, 2.1000),
  ('esabcc-f-gerd', 2015, 2.1100),
  ('esabcc-f-gerd', 2016, 2.1200),
  ('esabcc-f-gerd', 2017, 2.1200),
  ('esabcc-f-gerd', 2018, 2.1500),
  ('esabcc-f-gerd', 2019, 2.1900),
  ('esabcc-f-gerd', 2020, 2.2300),
  ('esabcc-f-gerd', 2021, 2.3100),
  ('esabcc-f-gerd', 2022, 2.2700),
  ('esabcc-f-climate-patents-share', 2008, 11.920),
  ('esabcc-f-climate-patents-share', 2009, 13.280),
  ('esabcc-f-climate-patents-share', 2010, 13.760),
  ('esabcc-f-climate-patents-share', 2011, 14.300),
  ('esabcc-f-climate-patents-share', 2012, 14.120),
  ('esabcc-f-climate-patents-share', 2013, 13.130),
  ('esabcc-f-climate-patents-share', 2014, 12.930),
  ('esabcc-f-climate-patents-share', 2015, 12.750),
  ('esabcc-f-climate-patents-share', 2016, 12.650),
  ('esabcc-f-climate-patents-share', 2017, 12.910),
  ('esabcc-f-climate-patents-share', 2018, 12.930),
  ('esabcc-f-climate-patents-share', 2019, 11.940),
  ('esabcc-f-cleantech-investment', 2018, 0.00016),
  ('esabcc-f-cleantech-investment', 2019, 0.00028),
  ('esabcc-f-cleantech-investment', 2020, 0.00031),
  ('esabcc-f-cleantech-investment', 2021, 0.00072),
  ('esabcc-f-cleantech-investment', 2022, 0.00060)
on conflict (indicator_id, year) do nothing;


-- ----------------------------------------------------------------------------
-- 042_pw_indicator_sheets.sql
-- ----------------------------------------------------------------------------

-- ─────────────────────────────────────────────────────────────────────────────
-- Per-indicator Excel sheet layout for the Indicator Database round-trip.
--
-- The Indicator Database module (Policy Gap 2.0) can be exported to a single
-- workbook — one tab per indicator — edited offline, and re-uploaded to update
-- the plotted series. The canonical plotted series stays in
-- pw_indicator_points. THIS table stores the *rest* of each tab: helper
-- columns and the formulas a user added to compute the final "Value" column.
--
-- Storing the layout lets a fresh download from the website reproduce the
-- user's calc columns (multipliers, intermediate workings, …) which are
-- hidden from the normal chart/table viewer but visible in the spreadsheet.
--
-- `layout` shape (see src/lib/project-workspace/indicator-excel.ts):
--   {
--     "headers": ["Value", "Raw imports", "Multiplier"],   // columns after Year
--     "rows": [
--       { "year": 2018, "cells": [ {"f":"C2*D2","v":3893}, 3893, 1.0 ] }
--     ]
--   }
-- A cell is a primitive (number|string|null) or {"f": formula, "v": lastResult}.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.pw_indicator_sheets (
  indicator_id  text        primary key references public.pw_indicators(id) on delete cascade,
  layout        jsonb       not null default '{}'::jsonb,
  updated_by    uuid        references auth.users(id) on delete set null,
  updated_at    timestamptz not null default now()
);

drop trigger if exists trg_pw_indicator_sheets_updated_at on public.pw_indicator_sheets;
create trigger trg_pw_indicator_sheets_updated_at
  before update on public.pw_indicator_sheets
  for each row execute function public.pw_touch_updated_at();

-- ── Row-level security ───────────────────────────────────────────────────────
alter table public.pw_indicator_sheets enable row level security;

drop policy if exists "pw_indicator_sheets read"   on public.pw_indicator_sheets;
drop policy if exists "pw_indicator_sheets insert" on public.pw_indicator_sheets;
drop policy if exists "pw_indicator_sheets update" on public.pw_indicator_sheets;
drop policy if exists "pw_indicator_sheets delete" on public.pw_indicator_sheets;

DROP POLICY IF EXISTS "pw_indicator_sheets read" ON public.pw_indicator_sheets;
create policy "pw_indicator_sheets read"   on public.pw_indicator_sheets
  for select to authenticated using (true);
DROP POLICY IF EXISTS "pw_indicator_sheets insert" ON public.pw_indicator_sheets;
create policy "pw_indicator_sheets insert" on public.pw_indicator_sheets
  for insert to authenticated with check (auth.uid() is not null);
DROP POLICY IF EXISTS "pw_indicator_sheets update" ON public.pw_indicator_sheets;
create policy "pw_indicator_sheets update" on public.pw_indicator_sheets
  for update to authenticated using (true) with check (true);
DROP POLICY IF EXISTS "pw_indicator_sheets delete" ON public.pw_indicator_sheets;
create policy "pw_indicator_sheets delete" on public.pw_indicator_sheets
  for delete to authenticated using (true);


-- ----------------------------------------------------------------------------
-- 042_pw_recommendation_report.sql
-- ----------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Source-report label for workspace recommendations.
--
-- Recommendations in the Project Workspace tracker are drawn from a specific
-- ESABCC publication (e.g. "Towards EU climate neutrality", Jan 2024, or the
-- June 2023 2040-target advice). These columns record which report each
-- recommendation comes from so the UI can show a per-recommendation report
-- label and group by report.
--
-- See src/data/esabcc-recommendations.ts (RECOMMENDATION_REPORTS) for the
-- canonical id / label / url of each report.
-- ---------------------------------------------------------------------------

alter table public.pw_recommendations
  add column if not exists report_id    text not null default '',
  add column if not exists report_label text not null default '',
  add column if not exists report_url   text not null default '';

-- Backfill existing seed rows: every recommendation seeded so far comes from
-- the January 2024 "Towards EU climate neutrality" report.
update public.pw_recommendations
set
  report_id    = 'towards-eu-climate-neutrality-2024',
  report_label = 'Towards EU climate neutrality (Jan 2024)',
  report_url   = 'https://climate-advisory-board.europa.eu/reports-and-publications/towards-eu-climate-neutrality-progress-policy-gaps-and-opportunities'
where is_seed = true
  and report_label = ''
  and id <> 'advice-2023-2040-target';


-- ----------------------------------------------------------------------------
-- 043_pw_collaboration.sql
-- ----------------------------------------------------------------------------

-- ─────────────────────────────────────────────────────────────────────────────
-- Project Workspace collaboration layer.
--
-- Gives every workspace module the same no-code collaboration primitives,
-- all persisted in Postgres (nothing lives only in the browser):
--
--   1. pw_comments       — threaded discussion attached to ANY workspace
--                          target (indicator, recommendation, member-state
--                          cell, policy, module, project). Supports @mentions
--                          (stored as an array of mentioned user ids) and a
--                          resolved flag so review threads can be closed.
--
--   2. pw_verifications  — one row per (target, user) recording whether that
--                          user has "verified" or "disputed" the target, with
--                          an optional note. The UI rolls these up into a
--                          verified/disputed count + the current user's vote.
--
-- @mention notifications are written into the existing public.notifications
-- table server-side (service role), since that table only allows users to
-- read/update their OWN rows.
--
-- Same authorisation posture as the rest of the workspace (038/039): any
-- authenticated user can read everything and write; deletes on comments are
-- restricted to the author.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.pw_comments (
  id            uuid        primary key default gen_random_uuid(),
  project_id    text        not null references public.pw_projects(id) on delete cascade,
  -- 'indicator' | 'recommendation' | 'member-state-cell' | 'policy' | 'module' | 'project'
  target_kind   text        not null,
  target_id     text        not null,
  parent_id     uuid        references public.pw_comments(id) on delete cascade,
  body          text        not null,
  mentions      uuid[]      not null default '{}',
  resolved      boolean     not null default false,
  created_by    uuid        references auth.users(id) on delete set null,
  author_name   text        not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists pw_comments_target_idx
  on public.pw_comments(project_id, target_kind, target_id, created_at);

create table if not exists public.pw_verifications (
  project_id    text        not null references public.pw_projects(id) on delete cascade,
  target_kind   text        not null,
  target_id     text        not null,
  user_id       uuid        not null references auth.users(id) on delete cascade,
  status        text        not null check (status in ('verified','disputed')),
  note          text        not null default '',
  user_name     text        not null default '',
  updated_at    timestamptz not null default now(),
  primary key (project_id, target_kind, target_id, user_id)
);

create index if not exists pw_verifications_target_idx
  on public.pw_verifications(project_id, target_kind, target_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.pw_comments      enable row level security;
alter table public.pw_verifications enable row level security;

-- pw_comments: read/insert/update open to authenticated; delete = author only.
drop policy if exists "pw_comments read"   on public.pw_comments;
drop policy if exists "pw_comments insert" on public.pw_comments;
drop policy if exists "pw_comments update" on public.pw_comments;
drop policy if exists "pw_comments delete" on public.pw_comments;

DROP POLICY IF EXISTS "pw_comments read" ON public.pw_comments;
create policy "pw_comments read"
  on public.pw_comments for select to authenticated using (true);
DROP POLICY IF EXISTS "pw_comments insert" ON public.pw_comments;
create policy "pw_comments insert"
  on public.pw_comments for insert to authenticated with check (auth.uid() is not null);
DROP POLICY IF EXISTS "pw_comments update" ON public.pw_comments;
create policy "pw_comments update"
  on public.pw_comments for update to authenticated using (true) with check (true);
DROP POLICY IF EXISTS "pw_comments delete" ON public.pw_comments;
create policy "pw_comments delete"
  on public.pw_comments for delete to authenticated using (auth.uid() = created_by);

-- pw_verifications: a user manages only their OWN vote row.
drop policy if exists "pw_verifications read"   on public.pw_verifications;
drop policy if exists "pw_verifications insert" on public.pw_verifications;
drop policy if exists "pw_verifications update" on public.pw_verifications;
drop policy if exists "pw_verifications delete" on public.pw_verifications;

DROP POLICY IF EXISTS "pw_verifications read" ON public.pw_verifications;
create policy "pw_verifications read"
  on public.pw_verifications for select to authenticated using (true);
DROP POLICY IF EXISTS "pw_verifications insert" ON public.pw_verifications;
create policy "pw_verifications insert"
  on public.pw_verifications for insert to authenticated with check (auth.uid() = user_id);
DROP POLICY IF EXISTS "pw_verifications update" ON public.pw_verifications;
create policy "pw_verifications update"
  on public.pw_verifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
DROP POLICY IF EXISTS "pw_verifications delete" ON public.pw_verifications;
create policy "pw_verifications delete"
  on public.pw_verifications for delete to authenticated using (auth.uid() = user_id);

-- ── updated_at triggers ──────────────────────────────────────────────────────
drop trigger if exists trg_pw_comments_updated_at on public.pw_comments;
create trigger trg_pw_comments_updated_at
  before update on public.pw_comments
  for each row execute function public.pw_touch_updated_at();

drop trigger if exists trg_pw_verifications_updated_at on public.pw_verifications;
create trigger trg_pw_verifications_updated_at
  before update on public.pw_verifications
  for each row execute function public.pw_touch_updated_at();


-- ----------------------------------------------------------------------------
-- 044_industry_project.sql
-- ----------------------------------------------------------------------------

-- ─────────────────────────────────────────────────────────────────────────────
-- Industry Project — the Policy Gap toolset, scoped to industry.
--
-- This migration:
--   • adds a free-form `tags` array to pw_recommendations (workspace sector
--     tags, layered on top of the source-report label),
--   • backfills the `industry` tag onto the Policy Gap recommendations that
--     drive industrial decarbonisation (Industry chapter + cross-chapter ETS /
--     CBAM / hydrogen / CCU-CCS / clean-tech / circularity advice), and
--   • seeds the Industry Project's four modules (indicators, recommendations,
--     member-states, policy-analysis). The project row itself is created in
--     038_project_workspace.sql.
--
-- Companion to 044_pw_industry_modules.sql (which seeds the indicators +
-- recommendations modules with a 2-module scope). This file sorts first, so on
-- a fresh deploy it seeds all four modules and that companion becomes a no-op;
-- the inserts and the description update below are written to converge to the
-- same end-state whichever migration ran first.
--
-- Idempotent: re-running it will not duplicate rows or overwrite manual tags.
-- See src/data/esabcc-recommendations.ts (RECOMMENDATION_TAGS) and
-- src/data/industry-indicators.ts for the canonical seed definitions.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.pw_recommendations
  add column if not exists tags text[] not null default '{}';

-- Backfill the industry sector tags on the existing Policy Gap seed rows. Only
-- touches rows that have no tags yet, so manual retagging is preserved.
update public.pw_recommendations
  set tags = array['industry']
  where project_id = 'policy-gap-2-0'
    and tags = '{}'
    and id in (
      'kr12-energy-material-demand-reduction',
      'i1-circular-economy-ceap2',
      'i3-low-emission-industrial-tech'
    );

update public.pw_recommendations
  set tags = array['industry','energy-supply']
  where project_id = 'policy-gap-2-0'
    and tags = '{}'
    and id in (
      'kr3-renewables-investment-outlook',
      'kr10-target-ccs-hydrogen-bioenergy',
      'e6-hydrogen-targeting',
      'e7-ccus-targeting',
      'e8-rd-allocation-review'
    );

update public.pw_recommendations
  set tags = array['industry','carbon-pricing']
  where project_id = 'policy-gap-2-0'
    and tags = '{}'
    and id in (
      'kr7-ets-fit-for-net-zero',
      'i2-carbon-leakage-alternatives',
      'c2-free-allocation-alternatives',
      'c6-expand-climate-revenue'
    );

-- Seed the Industry Project's modules. The indicator and recommendation seed
-- rows themselves are inserted lazily on first render (see db.ts
-- ensureSeedDataFor → 'industry-project'); this just makes the tabs appear.
insert into public.pw_modules (id, project_id, kind, name, description, position, is_seed) values
  ('indicators',      'industry-project', 'indicators',
     'Indicator database',
     'Industry-focused indicators: industrial GHG emissions, energy intensity and electrification, electrolyser capacity, circular material use, the ETS carbon price and free allocation, and clean-tech investment.',
     0, true),
  ('recommendations', 'industry-project', 'recommendations',
     'Recommendations tracker',
     'ESABCC recommendations tagged "industry" — the Industry chapter (I1–I3) plus the cross-chapter advice driving industrial decarbonisation (ETS/CBAM, hydrogen, CCU/CCS, clean-tech, circularity).',
     1, true),
  ('member-states',   'industry-project', 'member-states',
     'Member state space',
     'EEA-style member-state view framed around industrial transition, with the shared per-country profiles.',
     2, true),
  ('policy-analysis', 'industry-project', 'policy-analysis',
     'Policy analysis',
     'Sectoral policy review pre-filtered to industry-tagged policies (ETS, ETS2, CBAM, IED, Net-Zero Industry Act, CRMA, Ecodesign, batteries, REACH, F-gas).',
     3, true)
on conflict (project_id, id) do nothing;

-- Refresh the project description now that its scope is defined. Matches either
-- the original 038 blurb or the 2-module description from
-- 044_pw_industry_modules.sql, so the four-tool scope wins regardless of which
-- migration ran first — but never clobbers a hand-edited description.
update public.pw_projects
  set description = 'Analytical workspace dedicated to industrial decarbonisation — the same four tools as Policy Gap 2.0, scoped to industry: industry indicators, the industry-tagged recommendations, industry-tagged policies and a member-state space framed around industrial transition.'
  where id = 'industry-project'
    and description in (
      'Analytical workspace dedicated to industrial decarbonisation. Modules to be added as the project scope is defined.',
      'Analytical workspace dedicated to industrial decarbonisation, with an indicator database and a recommendations tracker.'
    );


-- ----------------------------------------------------------------------------
-- 044_pw_indicator_revisions.sql
-- ----------------------------------------------------------------------------

-- ─────────────────────────────────────────────────────────────────────────────
-- pw_indicator_revisions — audit log + version archive for the Indicator
-- Database (M·19, Policy Gap 2.0).
--
-- Covers BOTH clusters shown in the module — the "existing" indicators rebuilt
-- from the 2024 ESABCC progress report and the "additional" ECNO / user-added
-- indicators — because both are stored in the same pw_indicators /
-- pw_indicator_points / pw_indicator_sheets tables.
--
-- Every change to an indicator's data (the plotted series, the calc-grid
-- layout/helper columns, the metadata, an Excel import, a refresh-from-source,
-- a create / delete / restore) writes one immutable row here. Each row records:
--
--   • WHO  — `changed_by` (auth user id) and `changed_by_name` (resolved
--            display name, kept denormalised so the history reads even if the
--            profile is later renamed or removed),
--   • WHEN — `changed_at`,
--   • WHAT — `action` + a human-readable `summary`, and
--   • A FULL SNAPSHOT of the indicator AS IT WAS AFTER the change (`snapshot`:
--            metadata + points + grid layout) so any prior version can be
--            restored ("go back to it").
--
-- The snapshot lets us archive even deleted indicators, so `indicator_id` is a
-- plain text column (no FK to pw_indicators): the archive survives a delete.
-- `project_id` keeps the FK so the archive is scoped/cleaned with its project.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.pw_indicator_revisions (
  id              bigint      generated always as identity primary key,
  indicator_id    text        not null,
  project_id      text        not null references public.pw_projects(id) on delete cascade,
  action          text        not null check (action in (
                    'create','edit-sheet','import','refresh',
                    'point-upsert','point-delete','metadata','restore','delete'
                  )),
  summary         text        not null default '',
  -- { metadata: {...} | null, points: [{year,value}], layout: {...} | null }
  snapshot        jsonb       not null default '{}'::jsonb,
  changed_by      uuid        references auth.users(id) on delete set null,
  changed_by_name text        not null default '',
  changed_at      timestamptz not null default now()
);

create index if not exists pw_indicator_revisions_indicator_idx
  on public.pw_indicator_revisions(indicator_id, changed_at desc);
create index if not exists pw_indicator_revisions_project_idx
  on public.pw_indicator_revisions(project_id, changed_at desc);

-- ── Row-level security ───────────────────────────────────────────────────────
-- Append-only archive: any authenticated user may read and insert. There are
-- deliberately NO update / delete policies, so those operations are denied by
-- RLS — the history cannot be rewritten from the app.
alter table public.pw_indicator_revisions enable row level security;

drop policy if exists "pw_indicator_revisions read"   on public.pw_indicator_revisions;
drop policy if exists "pw_indicator_revisions insert" on public.pw_indicator_revisions;

DROP POLICY IF EXISTS "pw_indicator_revisions read" ON public.pw_indicator_revisions;
create policy "pw_indicator_revisions read"
  on public.pw_indicator_revisions for select to authenticated using (true);
DROP POLICY IF EXISTS "pw_indicator_revisions insert" ON public.pw_indicator_revisions;
create policy "pw_indicator_revisions insert"
  on public.pw_indicator_revisions for insert to authenticated with check (auth.uid() is not null);


-- ----------------------------------------------------------------------------
-- 044_pw_industry_modules.sql
-- ----------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Seed the Industry Project with the indicator-database and recommendations
-- modules.
--
-- The Industry Project shipped in migration 038 with an empty module list
-- ("Modules to be added as the project scope is defined."). It now reuses the
-- same generic, project-scoped modules as Policy Gap 2.0 — so it inherits the
-- latest workspace functionality:
--   • the Excel-like spreadsheet editor + formula engine on the indicator
--     database (5d43cab), and
--   • the recommendations tracker with status, dated uptake events and the
--     fact-check / verify workflow (c443e19, e77118a).
--
-- Unlike Policy Gap 2.0, the Industry Project is NOT seeded with the ESABCC
-- report indicators / recommendations (those rows are global by id and belong
-- to that report). It starts empty; contributors populate it through the UI.
--
-- Idempotent: re-running is a no-op via the (project_id, id) conflict target,
-- and on a fresh deploy this runs after 038 has created the project row.
-- ---------------------------------------------------------------------------

insert into public.pw_modules (id, project_id, kind, name, description, position, is_seed) values
  ('indicators',      'industry-project', 'indicators',
     'Indicator database',
     'Industrial-decarbonisation indicators. Table + chart view with the Excel-like spreadsheet editor and formula engine; add indicators and round-trip them through Excel.',
     0, true),
  ('recommendations', 'industry-project', 'recommendations',
     'Recommendations tracker',
     'Track recommendations relevant to industrial decarbonisation, with status, dated uptake events and the fact-check / verify workflow.',
     1, true)
on conflict (project_id, id) do nothing;

-- Refresh the now-stale "modules to be added" blurb to match the seeded set.
update public.pw_projects
set description =
  'Analytical workspace dedicated to industrial decarbonisation, with an indicator database and a recommendations tracker.'
where id = 'industry-project'
  and description = 'Analytical workspace dedicated to industrial decarbonisation. Modules to be added as the project scope is defined.';


-- ----------------------------------------------------------------------------
-- 044_pw_meetings.sql
-- ----------------------------------------------------------------------------

-- ─────────────────────────────────────────────────────────────────────────────
-- Project Workspace — Meetings module.
--
-- Adds a fifth purpose-built module kind ("meetings") and the tables behind
-- it. Everything is project-scoped (like indicators / recommendations) so all
-- meeting modules within a project share the same store and contributors see
-- the same state:
--
--   1. pw_meetings           — one row per meeting. Holds the meeting type, the
--                              date it took place, and three free-text bodies
--                              (notes, summary, minutes) that are edited
--                              collaboratively with autosave. `key_points` is a
--                              JSON array of the "main three things" an LLM
--                              pulls out of the notes/minutes. `audio_url` is an
--                              optional pointer to a recording.
--
--   2. pw_meeting_milestones — milestones plotted on the project timeline. A
--                              milestone may hang off a meeting (meeting_id) or
--                              stand alone on the timeline. `sort_order` lets the
--                              UI re-order items the user drags around.
--
-- Threaded discussion + @mentions reuse the existing pw_comments table with
-- target_kind = 'meeting' (no schema change needed there).
--
-- Authorisation mirrors the rest of the workspace (038/043): any authenticated
-- user can read and write; deletes are open to authenticated users too.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Allow the new module kind ────────────────────────────────────────────────
-- The kind CHECK constraint was created inline in 038 as pw_modules_kind_check.
-- Drop and recreate it with 'meetings' added.
alter table public.pw_modules drop constraint if exists pw_modules_kind_check;
alter table public.pw_modules add constraint pw_modules_kind_check
  check (kind in (
    'indicators',
    'recommendations',
    'member-states',
    'policy-analysis',
    'custom',
    'meetings'
  ));

-- ── Meetings ──────────────────────────────────────────────────────────────────
create table if not exists public.pw_meetings (
  id            uuid        primary key default gen_random_uuid(),
  project_id    text        not null references public.pw_projects(id) on delete cascade,
  title         text        not null default '',
  -- 'team' | 'subgroup' | 'champion' | 'publication' | 'external' | 'plenary' | 'other'
  meeting_type  text        not null default 'team',
  occurred_at   timestamptz not null default now(),
  location      text        not null default '',
  attendees     text        not null default '',
  notes         text        not null default '',
  summary       text        not null default '',
  minutes       text        not null default '',
  -- The "main three things" an LLM extracts from the notes/minutes.
  key_points    jsonb       not null default '[]'::jsonb,
  audio_url     text        not null default '',
  created_by    uuid        references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists pw_meetings_project_idx
  on public.pw_meetings(project_id, occurred_at);

-- ── Milestones ──────────────────────────────────────────────────────────────
create table if not exists public.pw_meeting_milestones (
  id              uuid        primary key default gen_random_uuid(),
  project_id      text        not null references public.pw_projects(id) on delete cascade,
  -- Optional: a milestone can hang off a specific meeting or stand alone.
  meeting_id      uuid        references public.pw_meetings(id) on delete set null,
  title           text        not null default '',
  -- 'publication' | 'subgroup' | 'champion' | 'review' | 'deadline' | 'other'
  milestone_type  text        not null default 'publication',
  target_date     date        not null default current_date,
  status          text        not null default 'planned'
                              check (status in ('planned','in-progress','done','at-risk')),
  description     text        not null default '',
  -- Drag-to-reorder index within the project timeline.
  sort_order      integer     not null default 0,
  created_by      uuid        references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists pw_milestones_project_idx
  on public.pw_meeting_milestones(project_id, target_date);

-- ── updated_at triggers (function defined in 038) ────────────────────────────
drop trigger if exists trg_pw_meetings_updated_at on public.pw_meetings;
create trigger trg_pw_meetings_updated_at
  before update on public.pw_meetings
  for each row execute function public.pw_touch_updated_at();

drop trigger if exists trg_pw_milestones_updated_at on public.pw_meeting_milestones;
create trigger trg_pw_milestones_updated_at
  before update on public.pw_meeting_milestones
  for each row execute function public.pw_touch_updated_at();

-- ── Row-level security ───────────────────────────────────────────────────────
alter table public.pw_meetings           enable row level security;
alter table public.pw_meeting_milestones  enable row level security;

do $$
declare
  t text;
  tbls text[] := array['pw_meetings','pw_meeting_milestones'];
begin
  foreach t in array tbls loop
    execute format('drop policy if exists "%s read"   on public.%I', t, t);
    execute format('drop policy if exists "%s insert" on public.%I', t, t);
    execute format('drop policy if exists "%s update" on public.%I', t, t);
    execute format('drop policy if exists "%s delete" on public.%I', t, t);

    execute format(
      'create policy "%s read"   on public.%I for select to authenticated using (true)', t, t);
    execute format(
      'create policy "%s insert" on public.%I for insert to authenticated with check (auth.uid() is not null)', t, t);
    execute format(
      'create policy "%s update" on public.%I for update to authenticated using (true) with check (true)', t, t);
    execute format(
      'create policy "%s delete" on public.%I for delete to authenticated using (true)', t, t);
  end loop;
end $$;

-- ── Seed the Meetings module into both report workspaces ─────────────────────
insert into public.pw_modules (id, project_id, kind, name, description, position, is_seed) values
  ('meetings', 'policy-gap-2-0', 'meetings',
     'Meetings',
     'Track every meeting for this report — notes, summaries and minutes, the AI-extracted three key takeaways, milestones and a project timeline.',
     4, true),
  ('meetings', 'industry-project', 'meetings',
     'Meetings',
     'Track every meeting for this report — notes, summaries and minutes, the AI-extracted three key takeaways, milestones and a project timeline.',
     4, true)
on conflict (project_id, id) do nothing;


-- ----------------------------------------------------------------------------
-- 045_pw_meetings_kind_fix.sql
-- ----------------------------------------------------------------------------

-- ─────────────────────────────────────────────────────────────────────────────
-- Re-apply the bits of 044_pw_meetings.sql that the live database is missing:
--   • the pw_modules kind CHECK constraint widened to include 'meetings'
--   • the seeded Meetings module rows for both report workspaces
--
-- Idempotent: safe to run even if 044_pw_meetings.sql has already taken effect.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.pw_modules drop constraint if exists pw_modules_kind_check;
alter table public.pw_modules add constraint pw_modules_kind_check
  check (kind in (
    'indicators',
    'recommendations',
    'member-states',
    'policy-analysis',
    'custom',
    'meetings'
  ));

insert into public.pw_modules (id, project_id, kind, name, description, position, is_seed) values
  ('meetings', 'policy-gap-2-0', 'meetings',
     'Meetings',
     'Track every meeting for this report — notes, summaries and minutes, the AI-extracted three key takeaways, milestones and a project timeline.',
     4, true),
  ('meetings', 'industry-project', 'meetings',
     'Meetings',
     'Track every meeting for this report — notes, summaries and minutes, the AI-extracted three key takeaways, milestones and a project timeline.',
     4, true)
on conflict (project_id, id) do nothing;


-- ----------------------------------------------------------------------------
-- 046_pw_project_phases.sql
-- ----------------------------------------------------------------------------

-- ─────────────────────────────────────────────────────────────────────────────
-- Project Workspace — Phases / Gantt blocks.
--
-- Adds `pw_project_phases`: project-scoped time blocks with a title, start
-- date, end date and colour. Used by the Progress tab in the Meetings &
-- Progress module to render a Gantt chart, with the existing milestone
-- flags (pw_meeting_milestones) overlaid on top.
--
-- This is a SEPARATE entity from meetings and milestones: a phase is a span
-- of time (e.g. "Draft chapter 1", "Subgroup review window"), not a point.
--
-- Authorisation mirrors the rest of the workspace (038/043/044): any
-- authenticated user can read and write.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.pw_project_phases (
  id            uuid        primary key default gen_random_uuid(),
  project_id    text        not null references public.pw_projects(id) on delete cascade,
  title         text        not null default '',
  start_date    date        not null default current_date,
  end_date      date        not null default current_date,
  color         text        not null default '#004B7F',
  description   text        not null default '',
  sort_order    integer     not null default 0,
  created_by    uuid        references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists pw_phases_project_idx
  on public.pw_project_phases(project_id, start_date);

-- updated_at trigger (function defined in 038)
drop trigger if exists trg_pw_phases_updated_at on public.pw_project_phases;
create trigger trg_pw_phases_updated_at
  before update on public.pw_project_phases
  for each row execute function public.pw_touch_updated_at();

-- Row-level security — mirror the pattern used in 044.
alter table public.pw_project_phases enable row level security;

do $$
declare
  t text := 'pw_project_phases';
begin
  execute format('drop policy if exists "%s read"   on public.%I', t, t);
  execute format('drop policy if exists "%s insert" on public.%I', t, t);
  execute format('drop policy if exists "%s update" on public.%I', t, t);
  execute format('drop policy if exists "%s delete" on public.%I', t, t);

  execute format(
    'create policy "%s read"   on public.%I for select to authenticated using (true)', t, t);
  execute format(
    'create policy "%s insert" on public.%I for insert to authenticated with check (auth.uid() is not null)', t, t);
  execute format(
    'create policy "%s update" on public.%I for update to authenticated using (true) with check (true)', t, t);
  execute format(
    'create policy "%s delete" on public.%I for delete to authenticated using (true)', t, t);
end $$;


-- ----------------------------------------------------------------------------
-- 047_pw_industry_policy_only.sql
-- ----------------------------------------------------------------------------

delete from public.pw_modules
where project_id = 'industry-project'
  and is_seed = true
  and id in ('indicators', 'recommendations', 'member-states', 'meetings');

delete from public.pw_modules
where project_id = 'policy-gap-2-0'
  and is_seed = true
  and id = 'meetings';

update public.pw_projects
  set description = 'Analytical workspace dedicated to industrial decarbonisation — taken in the wider sense of industry (energy-intensive sectors, carbon pricing & leakage, hydrogen and CCU/CCS, clean-tech and circularity). Scoped to industry-tagged policies via the policy analysis tool.'
  where id = 'industry-project'
    and description = 'Analytical workspace dedicated to industrial decarbonisation — the same four tools as Policy Gap 2.0, scoped to industry: industry indicators, the industry-tagged recommendations, industry-tagged policies and a member-state space framed around industrial transition.';


-- ----------------------------------------------------------------------------
-- 048_pw_content_analysis_module.sql
-- ----------------------------------------------------------------------------

alter table public.pw_modules drop constraint if exists pw_modules_kind_check;
alter table public.pw_modules add constraint pw_modules_kind_check
  check (kind in (
    'indicators',
    'recommendations',
    'member-states',
    'policy-analysis',
    'content-analysis',
    'meetings',
    'custom'
  ));

update public.pw_modules m
set
  id          = 'content-analysis',
  kind        = 'content-analysis',
  name        = 'Content analysis',
  description =
    'MAXQDA-style qualitative coding for this project. Choose a source — the ' ||
    'EU policy corpus, scientific literature or grey literature & reports — ' ||
    'then mark passages and attach tags & codes. Tags save live and build on ' ||
    'the shared master library, with lenses to compare what each project codes.'
where m.kind = 'policy-analysis'
  and not exists (
    select 1 from public.pw_modules x
    where x.project_id = m.project_id and x.id = 'content-analysis'
  );

update public.pw_projects
  set description = 'Analytical workspace dedicated to industrial decarbonisation — taken in the wider sense of industry (energy-intensive sectors, carbon pricing & leakage, hydrogen and CCU/CCS, clean-tech and circularity). Scoped to industry-tagged policies via the content analysis tool.'
  where id = 'industry-project'
    and description = 'Analytical workspace dedicated to industrial decarbonisation — taken in the wider sense of industry (energy-intensive sectors, carbon pricing & leakage, hydrogen and CCU/CCS, clean-tech and circularity). Scoped to industry-tagged policies via the policy analysis tool.';


-- ----------------------------------------------------------------------------
-- 049_content_analysis_codes_table.sql
-- ----------------------------------------------------------------------------

create table if not exists public.content_analysis_codes (
  id             text primary key,
  parent_id      text,
  name           text not null,
  description    text not null default '',
  color          text not null default '#00928F',
  scope          text not null default 'project',
  project_id     text,
  author_id      uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_ca_codes_project on public.content_analysis_codes (project_id);
create index if not exists idx_ca_codes_parent  on public.content_analysis_codes (parent_id);

alter table public.content_analysis_codes enable row level security;

drop policy if exists "Content analysis codes are viewable by everyone" on public.content_analysis_codes;
create policy "Content analysis codes are viewable by everyone"
  on public.content_analysis_codes for select using (true);


-- ----------------------------------------------------------------------------
-- 050_content_analysis_master_tag_status.sql
-- ----------------------------------------------------------------------------

create table if not exists public.content_analysis_master_tag_status (
  policy_id          text        not null,
  code_id            text        not null,
  origin             text        not null default 'human' check (origin in ('ai','human')),
  confirmed_by       uuid        references auth.users(id) on delete set null,
  confirmed_by_name  text,
  confirmed_at       timestamptz not null default now(),
  primary key (policy_id, code_id)
);

create index if not exists ca_master_tag_status_policy_idx
  on public.content_analysis_master_tag_status(policy_id);

alter table public.content_analysis_master_tag_status enable row level security;

drop policy if exists "ca_master_tag_status read"   on public.content_analysis_master_tag_status;
drop policy if exists "ca_master_tag_status insert" on public.content_analysis_master_tag_status;
drop policy if exists "ca_master_tag_status update" on public.content_analysis_master_tag_status;
drop policy if exists "ca_master_tag_status delete" on public.content_analysis_master_tag_status;

create policy "ca_master_tag_status read"
  on public.content_analysis_master_tag_status for select using (true);
create policy "ca_master_tag_status insert"
  on public.content_analysis_master_tag_status for insert to authenticated with check (auth.uid() is not null);
create policy "ca_master_tag_status update"
  on public.content_analysis_master_tag_status for update to authenticated using (true) with check (true);
create policy "ca_master_tag_status delete"
  on public.content_analysis_master_tag_status for delete to authenticated using (true);


-- ----------------------------------------------------------------------------
-- 051_pw_module_flags.sql
-- ----------------------------------------------------------------------------

alter table public.pw_modules
  add column if not exists featured boolean not null default false,
  add column if not exists beta     boolean not null default false;

update public.pw_modules
  set featured = true, beta = false, position = 0
  where project_id = 'policy-gap-2-0' and id = 'indicators';

update public.pw_modules
  set featured = true, beta = false, position = 1
  where project_id = 'policy-gap-2-0' and id = 'content-analysis';

update public.pw_modules
  set beta = true, featured = false, position = 2
  where project_id = 'policy-gap-2-0' and id = 'member-states';

update public.pw_modules
  set beta = true, featured = false, position = 3
  where project_id = 'policy-gap-2-0' and id = 'recommendations';

-- ----------------------------------------------------------------------------
-- 052_indicator_derivation_descriptions.sql
-- ----------------------------------------------------------------------------

-- ─────────────────────────────────────────────────────────────────────────────
-- DERIVATION DESCRIPTIONS for the indicator calc-space layouts (scientific + caveats).
--
-- Companion to 045_seed_indicator_derivations.sql: same 45 layouts, each with a
-- documented `derivation` field — what it measures, the steps, every column and
-- why it's needed, the readable formula, the scientific reasoning, and an honest
-- '⚠ Caveat' where the derivation is approximate or is really the published
-- series. `do update` so it refreshes the rows 045 seeded.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.pw_indicator_sheets (indicator_id, layout)
values
  ('esabcc-o1-ghg-total', '{"columns":[{"header":"Value","source":"EEA GHG data viewer","formula":{"expr":"([International aviation]+[Energy supply]+[Industry]+[Transport]+[Buildings and agriculture energy]+[Agriculture (non-energy)]+[LULUCF]+[Waste and other sectors])+[International maritime]*(0.6374552000704592)"}},{"header":"International aviation","source":"EEA GHG data viewer","formula":{"expr":"[1.D.1.a - International Aviation]/1000"}},{"header":"Energy supply","source":"EEA GHG data viewer","formula":{"expr":"([1.A.1 - Energy Industries]+[1.B - Fugitive Emissions from Fuels])/1000"}},{"header":"Industry","source":"EEA GHG data viewer","formula":{"expr":"([1.A.2 - Manufacturing Industries and Construction]+[2 - Industrial Processes and Product Use])/1000"}},{"header":"Transport","source":"EEA GHG data viewer","formula":{"expr":"([1.A.3 - Transport])/1000"}},{"header":"Buildings and agriculture energy","source":"EEA GHG data viewer","formula":{"expr":"[1.A.4 - Other Sectors]/1000"}},{"header":"Agriculture (non-energy)","source":"EEA GHG data viewer","formula":{"expr":"[3 - Agriculture]/1000"}},{"header":"LULUCF","source":"EEA GHG data viewer","formula":{"expr":"[4 - Land Use, Land-Use Change and Forestry]/1000"}},{"header":"Waste and other sectors","source":"EEA GHG data viewer","formula":{"expr":"[Total net emissions (UNFCCC)]/1000-[LULUCF]-[Agriculture (non-energy)]-[Buildings and agriculture energy]-[Transport]-[Industry]-[Energy supply]"}},{"header":"International maritime","source":"EEA GHG data viewer","formula":{"expr":"[1.D.1.b - International Navigation]/1000"}},{"header":"1.D.1.a - International Aviation","source":"EEA GHG data viewer"},{"header":"1.A.1 - Energy Industries","source":"EEA GHG data viewer"},{"header":"1.B - Fugitive Emissions from Fuels","source":"EEA GHG data viewer"},{"header":"1.A.2 - Manufacturing Industries and Construction","source":"EEA GHG data viewer"},{"header":"2 - Industrial Processes and Product Use","source":"EEA GHG data viewer"},{"header":"1.A.3 - Transport","source":"EEA GHG data viewer"},{"header":"1.A.4 - Other Sectors","source":"EEA GHG data viewer"},{"header":"3 - Agriculture","source":"EEA GHG data viewer"},{"header":"4 - Land Use, Land-Use Change and Forestry","source":"EEA GHG data viewer"},{"header":"Total net emissions (UNFCCC)","source":"EEA GHG data viewer"},{"header":"1.D.1.b - International Navigation","source":"EEA GHG data viewer"}],"rows":[{"year":2005,"cells":[4393.8544455997635,96.09354678675581,1489.2308635829077,981.2737567577378,847.3858950621939,665.0392409976354,389.22393811242966,-342.10947613129105,169.72820383495673,153.7182167242595,96093.5467867558,1383791.909747243,105438.95383566488,556523.7994334318,424749.957324306,847385.8950621939,665039.2409976354,389223.9381124297,-342109.47613129107,4199772.422216571,153718.2167242595]},{"year":2006,"cells":[4392.775467577483,101.16153164168031,1494.1525158714342,973.7864643499324,855.4935985864113,663.4478326795688,386.0797416515591,-351.29638360007004,165.07888080560292,164.5155386288674,101161.53164168031,1391298.0674825914,102854.44838884297,546025.3443937633,427761.11995616904,855493.5985864113,663447.8326795688,386079.74165155913,-351296.38360007,4186742.650344439,164515.5386288674]},{"year":2007,"cells":[4417.407290145159,105.83006652528978,1503.6684597010162,995.6181345482117,863.9873624702656,589.4946612543916,389.0772087221159,-300.6172864973615,160.921824873461,171.66203763915254,105830.06652528977,1405513.6499988372,98154.80970217913,558821.7373136887,436796.39723452297,863987.3624702656,589494.6612543917,389077.2087221159,-300617.2864973615,4202150.3650721,171662.03763915255]},{"year":2008,"cells":[4279.585840278024,107.39422934415084,1433.2435942116344,952.3384468636497,844.9242604683492,635.0700212689056,386.57500981647684,-344.26277168343694,156.26092312467927,169.48975685141957,107394.22934415084,1336603.937452088,96639.65675954637,539298.5581894323,413039.88867421733,844924.2604683492,635070.0212689056,386575.00981647684,-344262.77168343693,4064149.4840702577,169489.75685141957]},{"year":2009,"cells":[3940.7241952743284,98.72774136248265,1325.218058629576,789.4283062560586,823.1230306433681,621.3870525601142,381.54065426293414,-347.02232862364394,152.2621873960495,150.69214711366692,98727.74136248264,1235822.2176750025,89395.84095457353,447681.1654271635,341747.14082889515,823123.0306433681,621387.0525601142,381540.6542629341,-347022.32862364396,3745936.961124457,150692.14711366693]},{"year":2010,"cells":[4025.1679359813015,100.36770316810103,1343.1400819540474,838.8144426930774,817.6393284119875,656.0914267227739,376.26183201603794,-352.5901909498173,148.79456088393545,151.61653881006123,100367.70316810103,1254197.964069834,88942.11788421345,480724.96661687526,358089.4760762021,817639.3284119875,656091.4267227739,376261.83201603795,-352590.1909498173,3828151.481732043,151616.53881006123]},{"year":2011,"cells":[3921.327326180008,102.83706419913365,1333.8554743473871,826.1534544181018,808.2404255515237,581.491159158799,375.71068571010153,-347.27380043837763,144.41493657978413,150.43869222959532,102837.06419913365,1245598.7563612096,88256.71798617767,468688.8421073754,357464.6123107264,808240.4255515237,581491.159158799,375710.6857101015,-347273.80043837766,3722592.33532732,150438.69222959533]},{"year":2012,"cells":[3843.6804107039684,101.71127123502156,1315.879554492708,795.6704345418054,778.706749671909,589.5709624305605,375.5351288160272,-342.6335989882684,139.94722738270434,140.0767945914176,101711.27123502156,1228497.2835891915,87382.27090351634,450892.5625642318,344777.87197757367,778706.749671909,589570.9624305605,375535.12881602725,-342633.59898826835,3652676.4583474463,140076.79459141762]},{"year":2013,"cells":[3752.9156894502776,102.66152771785798,1254.011429032349,775.5323410327082,772.7140098053934,593.8985478671879,377.7110600038942,-342.6049051712324,134.70936924287935,132.21683643011187,102661.52771785799,1167766.6278561049,86244.80117624416,432830.4669897874,342701.8740429208,772714.0098053934,593898.5478671879,377711.0600038942,-342604.9051712324,3565971.8518131794,132216.83643011187]},{"year":2014,"cells":[3626.522573504807,104.67025158665994,1189.727706691921,769.1653962810484,778.0782800394794,517.7746481601745,382.76323233658485,-327.8027208805995,130.23006267327492,128.5042723115443,104670.25158665994,1106411.9525673406,83315.75412458043,419987.19537616114,349178.2009048872,778078.2800394794,517774.64816017443,382763.2323365848,-327802.7208805995,3439936.605301883,128504.27231154431]},{"year":2015,"cells":[3680.8567617873755,108.53022557563203,1196.674215241051,768.8490453104929,793.2395374683889,541.0008190923381,384.28024043367134,-322.4238390120482,128.37176831057582,129.16162478268836,108530.22557563204,1113952.039429784,82722.17581126672,428994.70467562927,339854.3406348636,793239.5374683889,541000.8190923381,384280.24043367134,-322423.83901204815,3489991.7868444696,129161.62478268836]},{"year":2016,"cells":[3695.985235691014,115.07396257317444,1168.514883806718,776.2196706376404,810.7491666258904,547.7346214553677,386.35086308623397,-318.48652483153614,125.12436669127283,132.87871153438044,115073.96257317445,1089116.5887234109,79398.29508330715,434138.46733066376,342081.20330697665,810749.1666258904,547734.6214553677,386350.86308623396,-318486.52483153617,3496207.047471587,132878.71153438045]},{"year":2017,"cells":[3796.2808470131636,124.16225316137847,1162.1379242862579,791.0360996422826,824.9806709826406,545.7283094760611,388.16274656214773,-249.7958911803428,124.02069564713202,134.67305377086453,124162.25316137847,1083340.062104683,78797.86218157514,441345.54675687663,349690.55288540595,824980.6709826406,545728.3094760611,388162.74656214775,-249795.89118034282,3586270.555416179,134673.05377086453]},{"year":2018,"cells":[3711.2042053823952,130.35831223435034,1098.7821738414586,785.2766078383684,826.4830160983558,532.9322957141745,385.1440777511664,-257.78904072107576,122.15263891490508,137.83576273435258,130358.31223435035,1023654.3690424642,75127.8047989946,442369.91823639435,342906.68960197404,826483.0160983559,532932.2957141745,385144.07775116636,-257789.04072107578,3492981.7694373527,137835.76273435258]},{"year":2019,"cells":[3564.0272825354205,132.9766899599499,973.8049218740019,760.1281294160046,832.7329627801805,522.8230782422734,380.24796301831776,-247.3176236412184,121.55657002231908,136.59719279718294,132976.6899599499,905334.0532878421,68470.86858615991,428579.8953015269,331548.23411447776,832732.9627801805,522823.0782422734,380247.96301831777,-247317.6236412184,3343976.0017118794,136597.19279718294]},{"year":2020,"cells":[3195.8242692285844,56.110153869940774,841.5181786770137,719.6003290198165,720.1815179737462,519.7136736162479,381.9568334369566,-241.03805792704637,120.63001056849816,121.0306700531797,56110.153869940776,778122.0885059792,63396.090171034564,412771.8756989454,306828.45332087105,720181.5179737462,519713.6736162479,381956.8334369566,-241038.05792704638,3062562.4853652325,121030.67005317971]},{"year":2021,"cells":[3393.756578286026,69.7543328862993,901.6247143957199,757.4740937960399,782.100692712838,532.5338870926787,378.43047321885814,-229.9846664172722,119.53645060086433,129.0860910553474,69754.3328862993,840446.6098716129,61178.10452410704,439540.13245647895,317933.96133956104,782100.6927128381,532533.8870926787,378430.4732188581,-229984.6664172722,3241715.645399727,129086.09105534741]},{"year":2022,"cells":[3333.911785052191,103.28233849,924.3341574,691.32881325,803.30064018,481.83207029,370.64949144999997,-243.76728937000001,115.14677466000023,137.74268167,103282.33849,863591.50089,60742.65651,398202.32207,293126.49118,803300.64018,481832.07029,370649.49145,-243767.28937,3142824.65786,137742.68167]}],"derivation":"Total EU GHG emissions (European Climate Law scope)  (Mt CO₂eq)\n\nWhat it measures: ESABCC progress indicator O1. Total EU-27 GHG emissions in the scope of the European Climate Law (EU-27 plus international aviation and maritime). 2030 target: -55% vs 1990; 2050: climate neutrality; ESABCC 2040 advice range: -90 to -95%.\n\nHow it''s calculated:\n  1. Each component is first built from the detailed source rows (combined and unit-scaled as needed).\n  2. Add up International aviation, Energy supply, Industry, Transport, Buildings and agriculture energy, Agriculture, LULUCF, Waste and other sectors, and International maritime.\n\nWhy it''s done this way:\n  This is an accounting identity: the source reports these categories as mutually exclusive and exhaustive, so their sum is the total by construction — no modelling assumption is introduced, only disaggregated official data are re-aggregated.\n\n⚠ Caveat:\n  International maritime is included at a fixed scope factor (≈0.64) — confirm it matches the intended European Climate Law attribution. ''Waste and other sectors'' is a residual (total net emissions minus the listed sectors), so it absorbs any unlisted items.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in Mt CO₂eq.\n  • International aviation — intermediate step, computed as 1.D.1.a - International Aviation ÷ 1000. It prepares this component from the detailed source rows so the final line can combine them.\n  • Energy supply — intermediate step, computed as (1.A.1 - Energy Industries + 1.B - Fugitive Emissions from Fuels) ÷ 1000. It prepares this component from the detailed source rows so the final line can combine them.\n  • Industry — intermediate step, computed as (1.A.2 - Manufacturing Industries and Construction + 2 - Industrial Processes and Product Use) ÷ 1000. It prepares this component from the detailed source rows so the final line can combine them.\n  • Transport — intermediate step, computed as (1.A.3 - Transport) ÷ 1000. It prepares this component from the detailed source rows so the final line can combine them.\n  • Buildings and agriculture energy — intermediate step, computed as 1.A.4 - Other Sectors ÷ 1000. It prepares this component from the detailed source rows so the final line can combine them.\n  • Agriculture — intermediate step, computed as 3 - Agriculture ÷ 1000. It prepares this component from the detailed source rows so the final line can combine them.\n  • LULUCF — intermediate step, computed as 4 - Land Use, Land - Use Change and Forestry ÷ 1000. It prepares this component from the detailed source rows so the final line can combine them.\n  • Waste and other sectors — intermediate step, computed as Total net emissions ÷ 1000 - LULUCF - Agriculture - Buildings and agriculture energy - Transport - Industry - Energy supply. It prepares this component from the detailed source rows so the final line can combine them.\n  • International maritime — intermediate step, computed as 1.D.1.b - International Navigation ÷ 1000. It prepares this component from the detailed source rows so the final line can combine them.\n  • 1.D.1.a - International Aviation — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • 1.A.1 - Energy Industries — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • 1.B - Fugitive Emissions from Fuels — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • 1.A.2 - Manufacturing Industries and Construction — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • 2 - Industrial Processes and Product Use — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • 1.A.3 - Transport — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • 1.A.4 - Other Sectors — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • 3 - Agriculture — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • 4 - Land Use, Land-Use Change and Forestry — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Total net emissions — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • 1.D.1.b - International Navigation — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = (International aviation + Energy supply + Industry + Transport + Buildings and agriculture energy + Agriculture + LULUCF + Waste and other sectors) + International maritime × (0.6375)\n  International aviation = 1.D.1.a - International Aviation ÷ 1000\n  Energy supply = (1.A.1 - Energy Industries + 1.B - Fugitive Emissions from Fuels) ÷ 1000\n  Industry = (1.A.2 - Manufacturing Industries and Construction + 2 - Industrial Processes and Product Use) ÷ 1000\n  Transport = (1.A.3 - Transport) ÷ 1000\n  Buildings and agriculture energy = 1.A.4 - Other Sectors ÷ 1000\n  Agriculture = 3 - Agriculture ÷ 1000\n  LULUCF = 4 - Land Use, Land - Use Change and Forestry ÷ 1000\n  Waste and other sectors = Total net emissions ÷ 1000 - LULUCF - Agriculture - Buildings and agriculture energy - Transport - Industry - Energy supply\n  International maritime = 1.D.1.b - International Navigation ÷ 1000\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-o2-pec', '{"columns":[{"header":"Value","source":"Eurostat (nrg_bal_c)","formula":{"expr":"[PEC (Mtoe)] * [Mtoe → TWh]"}},{"header":"PEC (Mtoe)","source":"Eurostat (nrg_bal_c)"},{"header":"Mtoe → TWh","source":"IEA unit converter"}],"rows":[{"year":2005,"cells":[17418.93834463,1497.759101,11.63]},{"year":2006,"cells":[17573.14537597,1511.018519,11.63]},{"year":2007,"cells":[17330.618577840003,1490.164968,11.63]},{"year":2008,"cells":[17314.322354350003,1488.7637450000002,11.63]},{"year":2009,"cells":[16319.305609150002,1403.207705,11.63]},{"year":2010,"cells":[16951.3531363,1457.55401,11.63]},{"year":2011,"cells":[16423.06420094,1412.129338,11.63]},{"year":2012,"cells":[16237.603940380002,1396.182626,11.63]},{"year":2013,"cells":[16097.665162910002,1384.150057,11.63]},{"year":2014,"cells":[15473.2085135,1330.45645,11.63]},{"year":2015,"cells":[15731.959615200001,1352.70504,11.63]},{"year":2016,"cells":[15864.123842340003,1364.0691180000001,11.63]},{"year":2017,"cells":[16093.571949520001,1383.798104,11.63]},{"year":2018,"cells":[16018.454488950003,1377.339165,11.63]},{"year":2019,"cells":[15747.90439172,1354.076044,11.63]},{"year":2020,"cells":[14372.129238620002,1235.780674,11.63]},{"year":2021,"cells":[15248.247818560001,1311.113312,11.63]}],"derivation":"Primary energy consumption (EU-27)  (TWh)\n\nWhat it measures: ESABCC progress indicator O2 (primary energy component). EED 2030 indicative benchmark applies; Climate Target Plan MIX 2050 trajectory used as longer-run benchmark.\n\nHow it''s calculated:\n  1. Take the raw PEC, reported in Mtoe.\n  2. Convert it from Mtoe to TWh.\n\nWhy it''s done this way:\n  A unit conversion is an exact linear rescaling (e.g. 1 toe ≡ 11.63 MWh): it expresses the source''s Mtoe data in TWh without changing the underlying physical quantity or introducing any assumption.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in TWh.\n  • PEC — raw input from Eurostat (nrg_bal_c). This is the published series the indicator reports; no further breakdown is available in the source.\n  • Mtoe → TWh — unit-conversion factor (Mtoe → TWh). Needed because the source reports Mtoe but the indicator is shown in TWh; multiplying by it only changes the unit, not the underlying quantity.\n\nFormula:\n  Value = PEC × Mtoe → TWh\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-o2-fec', '{"columns":[{"header":"Value","source":"Eurostat (nrg_bal_c)","formula":{"expr":"[FEC (Mtoe)] * [Mtoe → TWh]"}},{"header":"FEC (Mtoe)","source":"Eurostat (nrg_bal_c)"},{"header":"Mtoe → TWh","source":"IEA unit converter"}],"rows":[{"year":2005,"cells":[12109.82318984,1041.257368,11.63]},{"year":2006,"cells":[12163.190049960001,1045.846092,11.63]},{"year":2007,"cells":[11961.649523380001,1028.516726,11.63]},{"year":2008,"cells":[12056.965967950002,1036.712465,11.63]},{"year":2009,"cells":[11407.05188819,980.8299129999999,11.63]},{"year":2010,"cells":[11914.97147168,1024.503136,11.63]},{"year":2011,"cells":[11450.91417733,984.6013909999999,11.63]},{"year":2012,"cells":[11427.20272399,982.5625729999999,11.63]},{"year":2013,"cells":[11401.459056079999,980.3490159999999,11.63]},{"year":2014,"cells":[10918.07830739,938.785753,11.63]},{"year":2015,"cells":[11140.02857683,957.870041,11.63]},{"year":2016,"cells":[11361.160047750001,976.8839250000001,11.63]},{"year":2017,"cells":[11502.07301217,989.0002589999999,11.63]},{"year":2018,"cells":[11531.881434860003,991.5633220000001,11.63]},{"year":2019,"cells":[11466.808014450002,985.968015,11.63]},{"year":2020,"cells":[10539.724471770001,906.253179,11.63]},{"year":2021,"cells":[11262.798287680002,968.426336,11.63]}],"derivation":"Final energy consumption (EU-27)  (TWh)\n\nWhat it measures: ESABCC progress indicator O2 (final energy component). 2030 EED indicative benchmark: 763 Mtoe (~8 875 TWh).\n\nHow it''s calculated:\n  1. Take the raw FEC, reported in Mtoe.\n  2. Convert it from Mtoe to TWh.\n\nWhy it''s done this way:\n  A unit conversion is an exact linear rescaling (e.g. 1 toe ≡ 11.63 MWh): it expresses the source''s Mtoe data in TWh without changing the underlying physical quantity or introducing any assumption.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in TWh.\n  • FEC — raw input from Eurostat (nrg_bal_c). This is the published series the indicator reports; no further breakdown is available in the source.\n  • Mtoe → TWh — unit-conversion factor (Mtoe → TWh). Needed because the source reports Mtoe but the indicator is shown in TWh; multiplying by it only changes the unit, not the underlying quantity.\n\nFormula:\n  Value = FEC × Mtoe → TWh\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-o3-gross-inland', '{"columns":[{"header":"Value","source":"Eurostat (nrg_bal_c)","formula":{"expr":"[Gross inland (ktoe)] * [ktoe → TWh]"}},{"header":"Gross inland (ktoe)","source":"Eurostat (nrg_bal_c)"},{"header":"ktoe → TWh","source":"IEA unit converter"}],"rows":[{"year":2005,"cells":[18652.096214959998,1603791.592,0.01163]},{"year":2006,"cells":[18808.78903087,1617264.749,0.01163]},{"year":2007,"cells":[18569.90175983,1596724.141,0.01163]},{"year":2008,"cells":[18524.24162388,1592798.076,0.01163]},{"year":2009,"cells":[17430.29279504,1498735.408,0.01163]},{"year":2010,"cells":[18130.769311609998,1558965.547,0.01163]},{"year":2011,"cells":[17597.326530119997,1513097.724,0.01163]},{"year":2012,"cells":[17372.23313688,1493743.176,0.01163]},{"year":2013,"cells":[17200.24742921,1478955.067,0.01163]},{"year":2014,"cells":[16610.14288067,1428215.209,0.01163]},{"year":2015,"cells":[16842.21620449,1448169.923,0.01163]},{"year":2016,"cells":[16981.77682088,1460169.976,0.01163]},{"year":2017,"cells":[17338.1042506,1490808.62,0.01163]},{"year":2018,"cells":[17227.87927414,1481330.978,0.01163]},{"year":2019,"cells":[16959.99918068,1458297.436,0.01163]},{"year":2020,"cells":[15585.31193267,1340095.609,0.01163]},{"year":2021,"cells":[16533.976394100002,1421666.07,0.01163]}],"derivation":"Gross inland energy consumption (EU-27)  (TWh)\n\nWhat it measures: ESABCC progress indicator O3. Gross inland energy consumption covering all fuels and renewables. Benchmark from Climate Target Plan MIX 2050 scenario.\n\nHow it''s calculated:\n  1. Take the raw Gross inland, reported in ktoe.\n  2. Convert it from ktoe to TWh.\n\nWhy it''s done this way:\n  A unit conversion is an exact linear rescaling (e.g. 1 toe ≡ 11.63 MWh): it expresses the source''s ktoe data in TWh without changing the underlying physical quantity or introducing any assumption.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in TWh.\n  • Gross inland — raw input from Eurostat (nrg_bal_c). This is the published series the indicator reports; no further breakdown is available in the source.\n  • ktoe → TWh — unit-conversion factor (ktoe → TWh). Needed because the source reports ktoe but the indicator is shown in TWh; multiplying by it only changes the unit, not the underlying quantity.\n\nFormula:\n  Value = Gross inland × ktoe → TWh\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-e1-energy-supply-ghg', '{"columns":[{"header":"Value","source":"EEA / EU GHG inventory (UNFCCC CRF), EU-27","formula":{"expr":"([Power and heat]+[Petroleum refineries]+[Other (mining, gas transport, …)]+[Fugitive emissions]+[Total (reported, no breakdown)])"}},{"header":"Power and heat","source":"CRF table (2023 submission): 1.A.1.a (total)"},{"header":"Petroleum refineries","source":"CRF table (2023 submission): 1.A.1.b (total)"},{"header":"Other (mining, gas transport, …)","source":"CRF table (2023 submission): 1.A.1.c (total)"},{"header":"Fugitive emissions","source":"EEA inventory CSV: 1.B (given as CO2e total)"},{"header":"Total (reported, no breakdown)","source":"EEA / EU GHG inventory (UNFCCC CRF), EU-27"}],"rows":[{"year":2005,"cells":[1489.230863547243,1196.7582458460263,123.98705961012415,63.04660429109262,105.43895380000001,0.0]},{"year":2006,"cells":[1494.1525158825912,1202.2871586886665,124.13657103932623,64.87433775459844,102.8544484,0.0]},{"year":2007,"cells":[1503.668459698837,1217.0337780451016,126.0325001798641,62.44737177387138,98.1548097,0.0]},{"year":2008,"cells":[1433.2435942120883,1154.0902877042429,123.85014069512097,58.663509052724464,96.63965676,0.0]},{"year":2009,"cells":[1325.2180586250024,1071.7236287739076,116.49915436559944,47.5994345354952,89.39584095,0.0]},{"year":2010,"cells":[1343.140081949834,1083.1597856188062,115.76435969146951,55.27381875955815,88.94211788000001,0.0]},{"year":2011,"cells":[1333.855474351209,1078.116924470295,113.0561118340927,54.42572005682139,88.25671799,0.0]},{"year":2012,"cells":[1315.8795544891916,1073.8854674238546,109.90615796098554,44.70565820435123,87.38227090000001,0.0]},{"year":2013,"cells":[1254.011429036105,1017.828197834809,107.89153983016224,42.0468901911337,86.24480118,0.0]},{"year":2014,"cells":[1189.7277066873407,959.9153430101976,104.83732149796218,41.65928805918095,83.31575412,0.0]},{"year":2015,"cells":[1196.674215239784,968.478226654539,105.92321766926835,39.550595105976775,82.72217581,0.0]},{"year":2016,"cells":[1168.5148838034108,943.7780432166106,105.36763183034792,39.970913676452234,79.39829508,0.0]},{"year":2017,"cells":[1162.1379242846829,941.4613738822286,103.0793338102074,38.79935441224699,78.79786218,0.0]},{"year":2018,"cells":[1098.782173842464,882.6337398417216,99.76282735267915,41.25780184806324,75.12780479999999,0.0]},{"year":2019,"cells":[973.8049218778422,765.3394265641642,100.06290830640184,39.931718417276095,68.47086859,0.0]},{"year":2020,"cells":[841.5181786759792,652.2738549169003,93.1745498914046,32.67368369767437,63.39609017,0.0]},{"year":2021,"cells":[901.6247143916128,716.9830013629618,92.82853754286684,30.63507096578415,61.17810452,0.0]},{"year":2022,"cells":[924.3341574,0.0,0.0,0.0,0.0,924.3341574]}],"derivation":"Energy supply GHG emissions  (Mt CO₂eq)\n\nWhat it measures: ESABCC progress indicator E1. Total energy supply emissions: public power & heat, refineries and other energy industries. Fit-for-55 MIX gives the 2030 benchmark.\n\nHow it''s calculated:\n  1. Add up Power and heat, Petroleum refineries, Other, Fugitive emissions, and Total.\n\nWhy it''s done this way:\n  This is an accounting identity: the source reports these categories as mutually exclusive and exhaustive, so their sum is the total by construction — no modelling assumption is introduced, only disaggregated official data are re-aggregated.\n\n⚠ Caveat:\n  The sectoral breakdown is available 2005–2021; the 2022 point uses the reported total only (the four components are blank that year).\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in Mt CO₂eq.\n  • Power and heat — raw input from CRF table (2023 submission): 1.A.1.a (total). It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Petroleum refineries — raw input from CRF table (2023 submission): 1.A.1.b (total). It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Other — raw input from CRF table (2023 submission): 1.A.1.c (total). It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Fugitive emissions — raw input from EEA inventory CSV: 1.B (given as CO2e total). It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Total — raw input from EEA / EU GHG inventory (UNFCCC CRF), EU-27. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = (Power and heat + Petroleum refineries + Other + Fugitive emissions + Total)\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-e2-fossil-power-share', '{"columns":[{"header":"Value","source":"Eurostat energy balances (EU-27 gross electricity generation)","formula":{"expr":"([Solid fossil fuels]+[Natural & manufactured gases]+[Oil products & other fossils]) / [Total]"}},{"header":"Solid fossil fuels","source":"See 4bis tab for sources and categorisation details"},{"header":"Natural & manufactured gases","source":"See 4bis tab for sources and categorisation details"},{"header":"Oil products & other fossils","source":"See 4bis tab for sources and categorisation details"},{"header":"Total","source":"Eurostat energy balances, EU27 gross electricity generation"}],"rows":[{"year":2005,"cells":[0.5182598412168846,808.8822210000001,548.315303,154.208875,2916.31008]},{"year":2006,"cells":[0.5190010238230972,816.4990429999999,575.616132,148.089791,2967.6337719999997]},{"year":2007,"cells":[0.5260279545909439,828.805419,609.4216759999999,130.798327,2982.779542999999]},{"year":2008,"cells":[0.509190394861697,757.053054,647.726098,119.77217100000001,2994.069288]},{"year":2009,"cells":[0.49325477071156254,703.574826,590.1233000000001,108.36709700000002,2842.476761000001]},{"year":2010,"cells":[0.4784934067243079,701.230144,622.051201,102.46654799999999,2979.6604780000002]},{"year":2011,"cells":[0.4800622207203677,724.8267979999999,591.3915999999999,93.754159,2937.0621060000003]},{"year":2012,"cells":[0.4593046726777745,742.7146720000001,516.165104,88.875442,2934.338138]},{"year":2013,"cells":[0.4306696422458046,728.930201,446.60268799999994,80.468727,2916.3922710000006]},{"year":2014,"cells":[0.4055448339374518,692.768867,388.686239,76.986364,2856.5065389999995]},{"year":2015,"cells":[0.41736263875956736,705.028993,428.52983400000005,77.023162,2900.5518860000006]},{"year":2016,"cells":[0.4224018314341565,659.0611759999999,498.1137,77.09005499999999,2922.01605]},{"year":2017,"cells":[0.43004707566060235,638.838938,557.9138810000001,73.831413,2954.5235950000006]},{"year":2018,"cells":[0.4042712201996516,595.507,522.4296,69.824422,2938.030121]},{"year":2019,"cells":[0.38311501152285704,450.933123,599.577544,61.430867,2902.370047]},{"year":2020,"cells":[0.35629252352813934,352.40512800000005,586.4874719999999,53.223137,2784.5539030000004]},{"year":2021,"cells":[0.36183279962004866,419.00388799999996,579.8584930000001,52.69121,2906.1864819999996]},{"year":2022,"cells":[0.38756501538805416,453.17999900000007,571.6867760000001,61.786480000000005,2803.796039]}],"derivation":"Fossil share of EU electricity mix  (%)\n\nWhat it measures: ESABCC progress indicator E2 (fossil component). Share of fossil fuels in total electricity generation; complements the renewable share to highlight the substitution pace.\n\nHow it''s calculated:\n  1. Add up Solid fossil fuels, Natural & manufactured gases, and Oil products & other fossils.\n  2. Divide that by Total to get its share of the total.\n\nWhy it''s done this way:\n  Normalising by the total removes the effect of overall volume and isolates the compositional shift (the fuel/modal mix) — which is the quantity of policy interest, and makes years with different total demand directly comparable.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in %.\n  • Solid fossil fuels — raw input. It is one of the components measured against the total to form the share, so it has to be captured to reproduce the figure.\n  • Natural & manufactured gases — raw input. It is one of the components measured against the total to form the share, so it has to be captured to reproduce the figure.\n  • Oil products & other fossils — raw input. It is one of the components measured against the total to form the share, so it has to be captured to reproduce the figure.\n  • Total — the total, used as the denominator. Dividing by it turns the components into a share.\n\nFormula:\n  Value = (Solid fossil fuels + Natural & manufactured gases + Oil products & other fossils) ÷ Total\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-e2-res-noBio-power-share', '{"columns":[{"header":"Value","source":"Eurostat energy balances (EU-27 gross electricity generation)","formula":{"expr":"([Renewable - hydro]+[Renewable - solar]+[Renewable - wind]+[Renewable - other non-bio]) / [Total]"}},{"header":"Renewable - hydro","source":"See 4bis tab for sources and categorisation details"},{"header":"Renewable - solar","source":"See 4bis tab for sources and categorisation details"},{"header":"Renewable - wind","source":"See 4bis tab for sources and categorisation details"},{"header":"Renewable - other non-bio","source":"See 4bis tab for sources and categorisation details"},{"header":"Total","source":"Eurostat energy balances, EU27 gross electricity generation"}],"rows":[{"year":2005,"cells":[0.14263847656419304,340.546184,1.4586880000000002,68.094587,5.878568,2916.31008]},{"year":2006,"cells":[0.14489278665615615,342.707881,2.48947,78.711461,6.079915,2967.6337719999997]},{"year":2007,"cells":[0.15046829392848632,338.893876,3.774527,99.907526,6.237820000000001,2982.779542999999]},{"year":2008,"cells":[0.16090041600934385,354.877833,7.437621,113.234843,6.196697,2994.069288]},{"year":2009,"cells":[0.1767180445912535,357.662569,14.103981,124.555918,5.994467,2842.476761000001]},{"year":2010,"cells":[0.19143946775535947,401.279583,23.224063,139.842164,6.078805999999999,2979.6604780000002]},{"year":2011,"cells":[0.18791174925192405,332.84879700000005,47.288533,165.346899,6.424249,2937.0621060000003]},{"year":2012,"cells":[0.21246360156192742,359.551397,70.14140800000001,187.468916,6.278327999999999,2934.338138]},{"year":2013,"cells":[0.23889139706199689,396.650775,84.13560100000001,209.474806,6.439842,2916.3922710000006]},{"year":2014,"cells":[0.25272895690717695,398.608494,94.172878,222.356661,6.783885000000001,2856.5065389999995]},{"year":2015,"cells":[0.25319329867695384,363.23762800000003,100.85686199999999,263.204743,7.101067,2900.5518860000006]},{"year":2016,"cells":[0.25591779278556664,372.71119500000003,101.036686,266.814627,7.23339,2922.01605]},{"year":2017,"cells":[0.2538305110404779,322.463411,107.934943,312.313129,7.236751,2954.5235950000006]},{"year":2018,"cells":[0.27605294894796617,370.23443599999996,113.06662399999999,320.61589799999996,7.134921,2938.030121]},{"year":2019,"cells":[0.29075197970439914,345.642675,123.884579,367.117813,7.2247699999999995,2902.370047]},{"year":2020,"cells":[0.33230112478810214,375.486539,145.11675599999998,397.481079,7.22602,2784.5539030000004]},{"year":2021,"cells":[0.3207619434519137,374.849021,163.76427299999997,386.53956400000004,7.0411660000000005,2906.1864819999996]},{"year":2022,"cells":[0.33755535703572626,308.58113299999997,209.64428700000002,421.26459,6.946363,2803.796039]}],"derivation":"Non-biomass renewable share of EU electricity mix  (%)\n\nWhat it measures: ESABCC progress indicator E2 (renewables component). Share of non-biomass renewables (wind, solar PV, hydro, geothermal) in total electricity generation.\n\nHow it''s calculated:\n  1. Add up Renewable - hydro, Renewable - solar, Renewable - wind, and Renewable - other non-bio.\n  2. Divide that by Total to get its share of the total.\n\nWhy it''s done this way:\n  Normalising by the total removes the effect of overall volume and isolates the compositional shift (the fuel/modal mix) — which is the quantity of policy interest, and makes years with different total demand directly comparable.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in %.\n  • Renewable - hydro — raw input. It is one of the components measured against the total to form the share, so it has to be captured to reproduce the figure.\n  • Renewable - solar — raw input. It is one of the components measured against the total to form the share, so it has to be captured to reproduce the figure.\n  • Renewable - wind — raw input. It is one of the components measured against the total to form the share, so it has to be captured to reproduce the figure.\n  • Renewable - other non-bio — raw input. It is one of the components measured against the total to form the share, so it has to be captured to reproduce the figure.\n  • Total — the total, used as the denominator. Dividing by it turns the components into a share.\n\nFormula:\n  Value = (Renewable - hydro + Renewable - solar + Renewable - wind + Renewable - other non - bio) ÷ Total\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-e3-grid-co2-intensity', '{"columns":[{"header":"Value","source":"EEA: GHG intensity of electricity generation in Europe (EU-27)","formula":{"expr":"[Historical]"}},{"header":"Historical","source":"EEA: GHG intensity of electricity generation in Europe"}],"rows":[{"year":2005,"cells":[379,379]},{"year":2006,"cells":[377,377]},{"year":2007,"cells":[386,386]},{"year":2008,"cells":[363,363]},{"year":2009,"cells":[350,350]},{"year":2010,"cells":[335,335]},{"year":2011,"cells":[342,342]},{"year":2012,"cells":[339,339]},{"year":2013,"cells":[322,322]},{"year":2014,"cells":[313,313]},{"year":2015,"cells":[313,313]},{"year":2016,"cells":[303,303]},{"year":2017,"cells":[302,302]},{"year":2018,"cells":[289,289]},{"year":2019,"cells":[255,255]},{"year":2020,"cells":[228,228]},{"year":2021,"cells":[238,238]},{"year":2022,"cells":[251,251]}],"derivation":"Average GHG intensity of EU electricity  (g CO₂eq/kWh)\n\nWhat it measures: ESABCC progress indicator E3. Average EU electricity GHG intensity (Scope-2). Fit-for-55 MIX 2030 benchmark plus 1.5TECH 2050 trajectory.\n\nHow it''s calculated:\n  1. Take Historical.\n\nWhy it''s done this way:\n  The published figure comes straight from this single source series.\n\n⚠ Caveat:\n  Not independently derived: the published EEA grid-intensity series is used directly rather than rebuilt from emissions ÷ generation.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in g CO₂eq/kWh.\n  • Historical — raw input from EEA: GHG intensity of electricity generation in Europe. This is the published series the indicator reports; no further breakdown is available in the source.\n\nFormula:\n  Value = Historical\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-e4a-solar-pv-add', '{"columns":[{"header":"Value","source":"Eurostat NRG_INF_EPCRW (annual change in cumulative solar-PV capacity)","formula":{"expr":"([Solar PV cumulative capacity (MW)] - [Solar PV cumulative capacity (MW) (previous year)]) / 1000.0"}},{"header":"Solar PV cumulative capacity (MW)","source":"Eurostat NRG_INF_EPCRW (cumulative installed capacity, EU-27)"},{"header":"Solar PV cumulative capacity (MW) (previous year)","source":"Eurostat NRG_INF_EPCRW (cumulative installed capacity, EU-27)"}],"rows":[{"year":2006,"cells":[0.944737,3213.924,2269.187]},{"year":2007,"cells":[1.7612089999999998,4975.133,3213.924]},{"year":2008,"cells":[5.399049000000001,10374.182,4975.133]},{"year":2009,"cells":[6.3413070000000005,16715.489,10374.182]},{"year":2010,"cells":[13.166868,29882.357,16715.489]},{"year":2011,"cells":[22.253751999999995,52136.109,29882.357]},{"year":2012,"cells":[16.903309000000007,69039.418,52136.109]},{"year":2013,"cells":[8.363410999999992,77402.829,69039.418]},{"year":2014,"cells":[3.9104640000000073,81313.293,77402.829]},{"year":2015,"cells":[4.066077999999994,85379.371,81313.293]},{"year":2016,"cells":[3.8152690000000002,89194.64,85379.371]},{"year":2017,"cells":[4.732316000000006,93926.956,89194.64]},{"year":2018,"cells":[7.825901999999988,101752.858,93926.956]},{"year":2019,"cells":[16.15067700000001,117903.535,101752.858]},{"year":2020,"cells":[18.272828000000008,136176.363,117903.535]},{"year":2021,"cells":[25.702859999999987,161879.223,136176.363]}],"derivation":"Annual solar PV capacity additions (EU)  (GW/yr)\n\nWhat it measures: ESABCC progress indicator E4a. Net new solar photovoltaic capacity commissioned per year across the EU-27.\n\nHow it''s calculated:\n  1. Take this year''s Solar PV cumulative capacity and subtract last year''s value (then rescaled to GW/yr).\n\nWhy it''s done this way:\n  The annual flow is the first difference of the cumulative stock, which recovers the capacity added each year. Note this is a NET figure (gross additions minus retirements), not gross installations.\n\n⚠ Caveat:\n  Computed as the year-on-year change in cumulative installed capacity, i.e. NET additions (new minus decommissioned), which can differ from gross installations.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in GW/yr.\n  • Solar PV cumulative capacity — raw input from Eurostat NRG_INF_EPCRW (cumulative installed capacity, EU-27). It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Solar PV cumulative capacity (MW) — raw input from Eurostat NRG_INF_EPCRW (cumulative installed capacity, EU-27). It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = (Solar PV cumulative capacity - Solar PV cumulative capacity (MW)) ÷ 1000\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-e4b-wind-add', '{"columns":[{"header":"Value","source":"Eurostat NRG_INF_EPCRW (annual change in cumulative onshore-wind capacity)","formula":{"expr":"([Onshore wind cumulative capacity (MW)] - [Onshore wind cumulative capacity (MW) (previous year)]) / 1000.0"}},{"header":"Onshore wind cumulative capacity (MW)","source":"Eurostat NRG_INF_EPCRW (cumulative installed capacity, EU-27)"},{"header":"Onshore wind cumulative capacity (MW) (previous year)","source":"Eurostat NRG_INF_EPCRW (cumulative installed capacity, EU-27)"}],"rows":[{"year":2006,"cells":[5.931610000000001,43350.74,37419.13]},{"year":2007,"cells":[6.820707999999999,50171.448,43350.74]},{"year":2008,"cells":[5.309486000000004,55480.934,50171.448]},{"year":2009,"cells":[9.322743000000003,64803.677,55480.934]},{"year":2010,"cells":[5.806681999999993,70610.359,64803.677]},{"year":2011,"cells":[13.616061000000002,84226.42,70610.359]},{"year":2012,"cells":[8.453471000000006,92679.891,84226.42]},{"year":2013,"cells":[6.5592739999999905,99239.165,92679.891]},{"year":2014,"cells":[9.01697600000001,108256.141,99239.165]},{"year":2015,"cells":[9.246289999999993,117502.431,108256.141]},{"year":2016,"cells":[9.448816000000006,126951.247,117502.431]},{"year":2017,"cells":[13.18133799999999,140132.585,126951.247]},{"year":2018,"cells":[6.566493000000016,146699.078,140132.585]},{"year":2019,"cells":[8.395685999999987,155094.764,146699.078]},{"year":2020,"cells":[7.453985000000015,162548.749,155094.764]},{"year":2021,"cells":[10.717114000000002,173265.863,162548.749]}],"derivation":"Annual wind capacity additions (EU)  (GW/yr)\n\nWhat it measures: ESABCC progress indicators E4b (onshore) and E4c (offshore). Net new wind capacity commissioned per year, all axes.\n\nHow it''s calculated:\n  1. Take this year''s Onshore wind cumulative capacity and subtract last year''s value (then rescaled to GW/yr).\n\nWhy it''s done this way:\n  The annual flow is the first difference of the cumulative stock, which recovers the capacity added each year. Note this is a NET figure (gross additions minus retirements), not gross installations.\n\n⚠ Caveat:\n  Captures onshore wind only, computed as the year-on-year change in cumulative capacity (NET additions). If the indicator is meant to include offshore wind, this understates total additions.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in GW/yr.\n  • Onshore wind cumulative capacity — raw input from Eurostat NRG_INF_EPCRW (cumulative installed capacity, EU-27). It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Onshore wind cumulative capacity (MW) — raw input from Eurostat NRG_INF_EPCRW (cumulative installed capacity, EU-27). It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = (Onshore wind cumulative capacity - Onshore wind cumulative capacity (MW)) ÷ 1000\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-e5-electrification', '{"columns":[{"header":"Value","source":"Eurostat energy balances (EU-27 final energy consumption)","formula":{"expr":"[FEC - electricity]/[FEC - total]"}},{"header":"FEC - electricity","source":"Energy balance"},{"header":"FEC - total","source":"Energy balance"}],"rows":[{"year":2005,"cells":[0.21226068310926854,2435673.703,11474916.915]},{"year":2006,"cells":[0.21609799386931078,2487965.274,11513134.525]},{"year":2007,"cells":[0.22198161757419457,2507601.539,11296437.815]},{"year":2008,"cells":[0.22104492393031613,2521047.666,11405137.115]},{"year":2009,"cells":[0.22000347723593397,2392832.602,10876339.92]},{"year":2010,"cells":[0.22181357915717143,2510655.33,11318762.988]},{"year":2011,"cells":[0.227940412852502,2475454.023,10860092.741]},{"year":2012,"cells":[0.22888663739142331,2484050.673,10852755.326]},{"year":2013,"cells":[0.22722082618542366,2461276.146,10832088.71]},{"year":2014,"cells":[0.23275251440156663,2409216.082,10350977.682]},{"year":2015,"cells":[0.231752140187806,2449964.432,10571485.683]},{"year":2016,"cells":[0.2300779220139655,2481183.966,10784102.813]},{"year":2017,"cells":[0.22915196776708946,2505582.737,10934153.267]},{"year":2018,"cells":[0.22867538697362455,2505721.003,10957545.699]},{"year":2019,"cells":[0.22735028038910207,2478845.571,10903199.973]},{"year":2020,"cells":[0.23163306857887586,2384326.183,10293548.316]},{"year":2021,"cells":[0.22753911217468767,2487203.789,10930884.652]}],"derivation":"Electrification rate of final energy use  (%)\n\nWhat it measures: ESABCC progress indicator E5. Share of electricity in total final energy consumption; Fit-for-55 MIX gives the 2030 benchmark.\n\nHow it''s calculated:\n  1. Divide FEC - electricity by FEC - total to get its share of the total.\n\nWhy it''s done this way:\n  Normalising by the total removes the effect of overall volume and isolates the compositional shift (the fuel/modal mix) — which is the quantity of policy interest, and makes years with different total demand directly comparable.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in %.\n  • FEC - electricity — raw input from Energy balance. It is one of the components measured against the total to form the share, so it has to be captured to reproduce the figure.\n  • FEC - total — the total, used as the denominator. Dividing by it turns the components into a share.\n\nFormula:\n  Value = FEC - electricity ÷ FEC - total\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-e6-energy-ch4', '{"columns":[{"header":"Value","source":"EEA / EU GHG inventory (UNFCCC CRF Table 1s1 & 1s2, CH4), EU-27","formula":{"expr":"([Fuel combustion]+[Fugitive - solid fuels]+[Fugitive - other])"}},{"header":"Fuel combustion","source":"Sum of below"},{"header":"Fugitive - solid fuels","source":"CRF Table 1s1 & 1s2"},{"header":"Fugitive - other","source":"CRF Table 1s1 & 1s2"}],"rows":[{"year":2005,"cells":[110.14730120633581,25.699131218289406,52.8315854181241,31.616584569922303]},{"year":2006,"cells":[105.80498211590329,25.886458400972394,49.49190640968661,30.426617305244278]},{"year":2007,"cells":[101.85735357031533,26.443408527088444,46.35706082534897,29.056884217877915]},{"year":2008,"cells":[102.06874981556626,27.937110413956916,45.609765902095496,28.521873499513838]},{"year":2009,"cells":[96.44907299760963,27.643605158609034,41.596252295110226,27.209215543890377]},{"year":2010,"cells":[97.0179240279073,29.33178661169264,40.16641671519278,27.51972070102189]},{"year":2011,"cells":[93.06607229453269,26.57230662709831,39.84312604488972,26.65063962254466]},{"year":2012,"cells":[93.85845581242853,28.153293528620466,40.07079647107277,25.634365812735304]},{"year":2013,"cells":[90.94158763378712,28.02216466422844,37.68075968792657,25.23866328163211]},{"year":2014,"cells":[85.82441255482452,25.171525600613315,36.39667748713047,24.256209467080737]},{"year":2015,"cells":[86.29813361633171,25.869736033546054,37.40270435291585,23.025693229869802]},{"year":2016,"cells":[83.52954733662548,25.95711318460804,35.334772205796384,22.23766194622106]},{"year":2017,"cells":[82.69895588064199,26.25607488050714,34.719671496379945,21.723209503754894]},{"year":2018,"cells":[79.69135533686641,26.586889587375843,32.41012205897192,20.694343690518643]},{"year":2019,"cells":[73.21374172569416,25.94378265274558,28.018347108801883,19.251611964146704]},{"year":2020,"cells":[69.62488675649519,25.267465622882064,26.121439277725575,18.235981855887538]},{"year":2021,"cells":[69.90510003144043,26.523282177150016,25.62160457337648,17.760213280913934]}],"derivation":"Energy-related methane emissions (EU-27)  (Mt CO₂eq)\n\nWhat it measures: ESABCC progress indicator E6. Methane emissions from fuel combustion and fugitives. Aligned with the Methane Regulation.\n\nHow it''s calculated:\n  1. Add up Fuel combustion, Fugitive - solid fuels, and Fugitive - other.\n\nWhy it''s done this way:\n  This is an accounting identity: the source reports these categories as mutually exclusive and exhaustive, so their sum is the total by construction — no modelling assumption is introduced, only disaggregated official data are re-aggregated.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in Mt CO₂eq.\n  • Fuel combustion — raw input from Sum of below. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Fugitive - solid fuels — raw input from CRF Table 1s1 & 1s2. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Fugitive - other — raw input from CRF Table 1s1 & 1s2. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = (Fuel combustion + Fugitive - solid fuels + Fugitive - other)\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-i1-industry-ghg', '{"columns":[{"header":"Value","source":"EEA GHG data viewer","formula":{"expr":"([1.A.2 - Manufacturing Industries and Construction]+[2 - Industrial Processes and Product Use])/1000"}},{"header":"1.A.2 - Manufacturing Industries and Construction","source":"EEA GHG data viewer"},{"header":"2 - Industrial Processes and Product Use","source":"EEA GHG data viewer"}],"rows":[{"year":2005,"cells":[981.2737567577374,556523.7994334318,424749.95732430555]},{"year":2006,"cells":[973.7864643499324,546025.3443937633,427761.11995616904]},{"year":2007,"cells":[995.6181345482117,558821.7373136887,436796.39723452297]},{"year":2008,"cells":[952.3384468636497,539298.5581894323,413039.88867421733]},{"year":2009,"cells":[789.4283062560586,447681.1654271635,341747.14082889515]},{"year":2010,"cells":[838.8144426930774,480724.96661687526,358089.4760762021]},{"year":2011,"cells":[826.1534544181018,468688.8421073754,357464.6123107264]},{"year":2012,"cells":[795.6704345418054,450892.5625642318,344777.87197757367]},{"year":2013,"cells":[775.5323410327082,432830.4669897874,342701.8740429208]},{"year":2014,"cells":[769.1653962810484,419987.19537616114,349178.2009048872]},{"year":2015,"cells":[768.8490453104929,428994.70467562927,339854.3406348636]},{"year":2016,"cells":[776.2196706376404,434138.46733066376,342081.20330697665]},{"year":2017,"cells":[791.0360996422826,441345.54675687663,349690.55288540595]},{"year":2018,"cells":[785.2766078383684,442369.91823639435,342906.68960197404]},{"year":2019,"cells":[760.1281294160046,428579.8953015269,331548.23411447776]},{"year":2020,"cells":[719.6003290198165,412771.8756989454,306828.45332087105]},{"year":2021,"cells":[757.4740937960399,439540.13245647895,317933.96133956104]},{"year":2022,"cells":[691.32881325,398202.32207,293126.49118]}],"derivation":"Industrial GHG emissions  (Mt CO₂eq)\n\nWhat it measures: ESABCC progress indicator I1. Industrial CO₂ plus other GHGs (combustion + process emissions). Fit-for-55 MIX 2030 benchmark.\n\nHow it''s calculated:\n  1. Subtract 2 - Industrial Processes and Product Use from the first (then rescaled to Mt CO₂eq).\n\nWhy it''s done this way:\n  The indicator is the net difference between these two quantities.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in Mt CO₂eq.\n  • 1.A.2 - Manufacturing Industries and Construction — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • 2 - Industrial Processes and Product Use — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = (1.A.2 - Manufacturing Industries and Construction + 2 - Industrial Processes and Product Use) ÷ 1000\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-i3-circular-mat-use', '{"columns":[{"header":"Value","source":"Eurostat SDG_12_41"}],"rows":[{"year":2010,"cells":[0.108]},{"year":2011,"cells":[0.103]},{"year":2012,"cells":[0.111]},{"year":2013,"cells":[0.113]},{"year":2014,"cells":[0.112]},{"year":2015,"cells":[0.113]},{"year":2016,"cells":[0.115]},{"year":2017,"cells":[0.115]},{"year":2018,"cells":[0.117]},{"year":2019,"cells":[0.12]},{"year":2020,"cells":[0.117]},{"year":2021,"cells":[0.117]}],"derivation":"Circular material use rate (EU)  (%)\n\nWhat it measures: ESABCC progress indicator I3. Share of material input from recycled sources. Circular Economy Action Plan benchmark: 23.4% by 2030.\n\nHow it''s calculated:\n  1. This indicator is published directly by the source, so no calculation is applied — the plotted series is the reported data itself.\n\nWhy it''s done this way:\n  It is an observation, not a reconstruction: the source already provides exactly this quantity, and it cannot be regenerated from more primitive inputs here because the source does not expose them.\n\n⚠ Caveat:\n  Published Eurostat indicator (sdg_12_41) stored directly — there is no calculation to reproduce.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in %.\n\nFormula:\n  Value = (entered directly)\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-i4-steel-ghg-intensity', '{"columns":[{"header":"Value","source":"Calculated: emissions / production","formula":{"expr":"[Total emissions (Mt CO2e)] / [Production (Mt)]"}},{"header":"Total emissions (Mt CO2e)","source":"EEA GHG data viewer"},{"header":"Production (Mt)","source":"Eurofer data"}],"rows":[{"year":2008,"cells":[1.0097606385719309,186.83827584807668,185.032243]},{"year":2009,"cells":[1.0023752948062048,129.57683584178383,129.269782]},{"year":2010,"cells":[0.9942154091251288,162.1331940215793,163.076525]},{"year":2011,"cells":[0.9445747251675461,158.78095307233838,168.097821]},{"year":2012,"cells":[0.9371032654780299,149.00263628651714,159.003433]},{"year":2013,"cells":[0.9499003748230939,146.586416374428,154.317674]},{"year":2014,"cells":[0.9378266519219984,147.29970275758265,157.064957]},{"year":2015,"cells":[0.9870975475586252,153.12719091307923,155.128732]},{"year":2016,"cells":[0.9860735603636457,152.14899184908688,154.297811]},{"year":2017,"cells":[0.965584199606772,155.3325935740678,160.86903]},{"year":2018,"cells":[0.9526084801410623,152.4799965457901,160.065756]},{"year":2019,"cells":[0.9675127509495892,145.36341629684426,150.244445]},{"year":2020,"cells":[0.9604945353665726,126.99395379015225,132.217258]},{"year":2021,"cells":[0.9622519347796314,147.01485496641223,152.782083]}],"derivation":"GHG intensity of EU steel production  (t CO₂/t)\n\nWhat it measures: ESABCC progress indicator I4 (steel component). Total emissions (combustion + process) per tonne of crude steel produced.\n\nHow it''s calculated:\n  1. Divide Total emissions by Production.\n\nWhy it''s done this way:\n  Dividing the emissions flux by physical output yields a specific emission factor (t CO₂/t) — a measure of process carbon efficiency that is independent of how much is produced.\n\n⚠ Caveat:\n  Emissions (EEA inventory) and production (industry association) use different system boundaries; small scope mismatches can bias the ratio.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in t CO₂/t.\n  • Total emissions — raw input from EEA GHG data viewer. It is one of the two quantities the indicator divides, so it has to be captured to reproduce the figure.\n  • Production — the total, used as the denominator. Dividing by it turns the components into a per-unit figure.\n\nFormula:\n  Value = Total emissions ÷ Production\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-i4-cement-ghg-intensity', '{"columns":[{"header":"Value","source":"Calculated: emissions / production","formula":{"expr":"[Total emissions (Mt CO2e)] / [Production (Mt)]"}},{"header":"Total emissions (Mt CO2e)","source":"EEA EU ETS data viewer"},{"header":"Production (Mt)","source":"Cembureau data"}],"rows":[{"year":2005,"cells":[0.598729767416617,143.411945,239.527]},{"year":2006,"cells":[0.5744356499029938,147.152606,256.169]},{"year":2007,"cells":[0.6230233182589033,163.114981,261.812]},{"year":2008,"cells":[0.615865875468069,150.489906,244.355]},{"year":2009,"cells":[0.6130206728922847,121.311887,197.892]},{"year":2010,"cells":[0.6429220409108786,119.34111800000001,185.623]},{"year":2011,"cells":[0.6248217299803436,116.976625,187.216]},{"year":2012,"cells":[0.6672964775604632,109.895055,164.687]},{"year":2013,"cells":[0.6740219052957438,105.817395,156.994]},{"year":2014,"cells":[0.7029439771464847,110.73125,157.525]},{"year":2015,"cells":[0.6894909049510461,109.01402800000001,158.108]},{"year":2016,"cells":[0.6824735666837635,109.10977899999999,159.874]},{"year":2017,"cells":[0.6751431313143506,111.867166,165.694]},{"year":2018,"cells":[0.6323728197027676,113.695574,179.792]},{"year":2019,"cells":[0.6535495079542105,113.098703,173.053]},{"year":2020,"cells":[0.6236766145467425,107.416447,172.231]},{"year":2021,"cells":[0.603801017808917,110.223272,182.549]}],"derivation":"GHG intensity of EU cement production  (t CO₂/t)\n\nWhat it measures: ESABCC progress indicator I4 (cement component). Total emissions per tonne of cement produced.\n\nHow it''s calculated:\n  1. Divide Total emissions by Production.\n\nWhy it''s done this way:\n  Dividing the emissions flux by physical output yields a specific emission factor (t CO₂/t) — a measure of process carbon efficiency that is independent of how much is produced.\n\n⚠ Caveat:\n  Emissions (EEA inventory) and production (industry association) use different system boundaries; small scope mismatches can bias the ratio.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in t CO₂/t.\n  • Total emissions — raw input from EEA EU ETS data viewer. It is one of the two quantities the indicator divides, so it has to be captured to reproduce the figure.\n  • Production — the total, used as the denominator. Dividing by it turns the components into a per-unit figure.\n\nFormula:\n  Value = Total emissions ÷ Production\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-i4-chemicals-ghg-intensity', '{"columns":[{"header":"Value","source":"Calculated: emissions / production","formula":{"expr":"[Total emissions (Mt CO2e)]/([Production - ethylene (Mt)]+[Production - propylene (Mt)]+[Production - aromatics (Mt)])"}},{"header":"Production - ethylene (Mt)","source":"Eurostat DS-056121"},{"header":"Production - propylene (Mt)","source":"Eurostat DS-056121"},{"header":"Production - aromatics (Mt)","source":"Eurostat DS-056121"},{"header":"Total emissions (Mt CO2e)","source":"EEA EU ETS data viewer (activity code 42)"}],"rows":[{"year":2013,"cells":[0.8043391388618945,16.096332642,12.935620514,12.531401634000002,33.431033]},{"year":2014,"cells":[0.7313454725625014,19.039978442,13.387043378,13.196808848,33.366782]},{"year":2015,"cells":[0.787408974321791,17.404165881,12.872032557,12.395655827999999,33.600201]},{"year":2016,"cells":[0.7514166342140416,18.037565013,12.929713739,13.49189806,33.407365]},{"year":2017,"cells":[0.779121114004644,18,13.1281964,12.520337042,34.007494]},{"year":2018,"cells":[0.7904667488610742,17.439047298,12.756552859,12.625467331000001,33.84863]},{"year":2019,"cells":[0.7683199053812234,16.628416309,12.435085625,12.585374759,31.999661]},{"year":2020,"cells":[0.7879517419889741,16.477749296,11.59056535,12.373500888999999,31.866199]},{"year":2021,"cells":[0.8664397142334833,15.649568262,12.109003905,11.427169717000002,33.952083]},{"year":2022,"cells":[0.7670409175911003,13.558041401,11.168238016,12.77828695,28.767537]}],"derivation":"GHG intensity of EU base organic chemicals  (t CO₂/t)\n\nWhat it measures: ESABCC progress indicator I4 (chemicals component). Combustion + process emissions per tonne of ethylene, propylene, methanol etc.\n\nHow it''s calculated:\n  1. Divide Total emissions by Production - ethylene, Production - propylene, and Production - aromatics.\n\nWhy it''s done this way:\n  Dividing the emissions flux by physical output yields a specific emission factor (t CO₂/t) — a measure of process carbon efficiency that is independent of how much is produced.\n\n⚠ Caveat:\n  Emissions cover base organic chemicals, while production is only ethylene + propylene + aromatics; if the emissions boundary is wider than these products, the intensity is biased high.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in t CO₂/t.\n  • Production - ethylene — the total, used as the denominator. Dividing by it turns the components into a per-unit figure.\n  • Production - propylene — the total, used as the denominator. Dividing by it turns the components into a per-unit figure.\n  • Production - aromatics — the total, used as the denominator. Dividing by it turns the components into a per-unit figure.\n  • Total emissions — raw input from EEA EU ETS data viewer (activity code 42). It is one of the two quantities the indicator divides, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = Total emissions ÷ (Production - ethylene + Production - propylene + Production - aromatics)\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-i5-industry-fec', '{"columns":[{"header":"Value","source":"Eurostat energy balances","formula":{"expr":"[Total]*(11.630000000000003)"}},{"header":"Total","source":"Eurostat energy balances"}],"rows":[{"year":2005,"cells":[3199.7067040200013,275.12525400000004]},{"year":2006,"cells":[3135.17333429,269.57638299999996]},{"year":2007,"cells":[3189.8280889800008,274.275846]},{"year":2008,"cells":[3083.2069006200013,265.10807400000004]},{"year":2009,"cells":[2665.3687498000004,229.18045999999998]},{"year":2010,"cells":[2836.2442809300005,243.873111]},{"year":2011,"cells":[2841.1573162800005,244.295556]},{"year":2012,"cells":[2787.7423428500006,239.702695]},{"year":2013,"cells":[2753.3852410800005,236.748516]},{"year":2014,"cells":[2713.2530302100004,233.297767]},{"year":2015,"cells":[2715.6941206900005,233.507663]},{"year":2016,"cells":[2765.6047308900006,237.799203]},{"year":2017,"cells":[2791.9385980400007,240.063508]},{"year":2018,"cells":[2819.883301600001,242.46632]},{"year":2019,"cells":[2782.356489850001,239.239595]},{"year":2020,"cells":[2685.6380720400007,230.923308]},{"year":2021,"cells":[2795.19896387,240.34384899999998]}],"derivation":"Industrial final energy consumption (EU)  (TWh)\n\nWhat it measures: ESABCC progress indicator I5. Final energy use in manufacturing industries (excluding non-energy use).\n\nHow it''s calculated:\n  1. Take Total.\n\nWhy it''s done this way:\n  The published figure comes straight from this single source series.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in TWh.\n  • Total — raw input from Eurostat energy balances. This is the published series the indicator reports; no further breakdown is available in the source.\n\nFormula:\n  Value = Total × (11.63)\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-i6-industry-electrification', '{"columns":[{"header":"Value","source":"Eurostat energy balances","formula":{"expr":"[electricity]/[Total energy use]"}},{"header":"electricity","source":"Eurostat energy balances","formula":{"expr":"[Electricity]"}},{"header":"Total energy use","source":"Eurostat energy balances","formula":{"expr":"[Total]"}},{"header":"Electricity","source":"Eurostat energy balances"},{"header":"Total","source":"Eurostat energy balances"}],"rows":[{"year":2005,"cells":[0.3171376990350729,87.25259,275.12525400000004,87.25259,275.12525400000004]},{"year":2006,"cells":[0.32347845916457757,87.20215300000001,269.57638299999996,87.20215300000001,269.57638299999996]},{"year":2007,"cells":[0.32215150290704053,88.358376,274.275846,88.358376,274.275846]},{"year":2008,"cells":[0.3253961439137459,86.265145,265.10807400000004,86.265145,265.10807400000004]},{"year":2009,"cells":[0.32420226401500374,74.30082399999999,229.18045999999998,74.30082399999999,229.18045999999998]},{"year":2010,"cells":[0.32635016494294855,79.58803,243.873111,79.58803,243.873111]},{"year":2011,"cells":[0.32963440399218724,80.52822,244.295556,80.52822,244.295556]},{"year":2012,"cells":[0.3301170101571032,79.12993700000001,239.702695,79.12993700000001,239.702695]},{"year":2013,"cells":[0.3291846737489159,77.933983,236.748516,77.933983,236.748516]},{"year":2014,"cells":[0.3354141705093988,78.25137699999999,233.297767,78.25137699999999,233.297767]},{"year":2015,"cells":[0.33652292601635087,78.580682,233.507663,78.580682,233.507663]},{"year":2016,"cells":[0.3348091751173783,79.61735499999999,237.799203,79.61735499999999,237.799203]},{"year":2017,"cells":[0.3375648205557339,81.03699499999999,240.063508,81.03699499999999,240.063508]},{"year":2018,"cells":[0.3352720452061136,81.292179,242.46632,81.292179,242.46632]},{"year":2019,"cells":[0.33536905544418766,80.233557,239.239595,80.233557,239.239595]},{"year":2020,"cells":[0.3292776188707638,76.037877,230.923308,76.037877,230.923308]},{"year":2021,"cells":[0.33215479960129957,79.831363,240.34384899999998,79.831363,240.34384899999998]}],"derivation":"Electricity share of industrial final energy use  (%)\n\nWhat it measures: ESABCC progress indicator I6. Share of electricity in industrial final energy use (excluding non-energy use). Climate Target Plan benchmarks for 2030 and 2050.\n\nHow it''s calculated:\n  1. Divide electricity by Total energy use to get its share of the total.\n\nWhy it''s done this way:\n  Normalising by the total removes the effect of overall volume and isolates the compositional shift (the fuel/modal mix) — which is the quantity of policy interest, and makes years with different total demand directly comparable.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in %.\n  • electricity — intermediate step, computed as Electricity. It prepares this component from the detailed source rows so the final line can combine them.\n  • Total energy use — intermediate step, computed as Total. It prepares this component from the detailed source rows so the final line can combine them.\n  • Electricity — raw input from Eurostat energy balances. It is one of the components measured against the total to form the share, so it has to be captured to reproduce the figure.\n  • Total — raw input from Eurostat energy balances. It is one of the components measured against the total to form the share, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = electricity ÷ Total energy use\n  electricity = Electricity\n  Total energy use = Total\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-t1-transport-ghg', '{"columns":[{"header":"Value","source":"EEA GHG data viewer","formula":{"expr":"[Road - cars and motorcycles]+[Road - HDV and buses]+[Road - Light Duty Trucks]+[- of which Railways, IWW]+[Aviation]+[- of which Other]"}},{"header":"Road - cars and motorcycles","source":"EEA GHG data viewer","formula":{"expr":"([1.A.3.b.i - Cars]+[1.A.3.b.iv - Motorcycles])/1000"}},{"header":"Road - HDV and buses","source":"EEA GHG data viewer","formula":{"expr":"([1.A.3.b.iii - Heavy duty trucks and buses]/1000)"}},{"header":"Road - Light Duty Trucks","source":"EEA GHG data viewer","formula":{"expr":"[1.A.3.b.ii - Light duty trucks]/1000"}},{"header":"- of which Railways, IWW","source":"EEA GHG data viewer","formula":{"expr":"([1.A.3.c - Railways]+[1.A.3.d - Domestic Navigation])/1000"}},{"header":"Aviation","source":"EEA GHG data viewer","formula":{"expr":"[- of which domestic]+[- of which international]"}},{"header":"- of which Other","source":"EEA GHG data viewer","formula":{"expr":"([1.A.3.b.v - Other Road Transportation]+[1.A.3.e - Other Transportation])/1000"}},{"header":"1.A.3.b.i - Cars","source":"EEA GHG data viewer"},{"header":"1.A.3.b.iv - Motorcycles","source":"EEA GHG data viewer"},{"header":"1.A.3.b.iii - Heavy duty trucks and buses","source":"EEA GHG data viewer"},{"header":"1.A.3.b.ii - Light duty trucks","source":"EEA GHG data viewer"},{"header":"1.A.3.c - Railways","source":"EEA GHG data viewer"},{"header":"1.A.3.d - Domestic Navigation","source":"EEA GHG data viewer"},{"header":"- of which domestic","source":"EEA GHG data viewer","formula":{"expr":"[1.A.3.a - Domestic Aviation]/1000"}},{"header":"- of which international","source":"EEA GHG data viewer","formula":{"expr":"[1.D.1.a - International Aviation]/1000"}},{"header":"1.A.3.b.v - Other Road Transportation","source":"EEA GHG data viewer"},{"header":"1.A.3.e - Other Transportation","source":"EEA GHG data viewer"},{"header":"1.A.3.a - Domestic Aviation","source":"EEA GHG data viewer"},{"header":"1.D.1.a - International Aviation","source":"EEA GHG data viewer"}],"rows":[{"year":2005,"cells":[943.4794418489497,491.58833576011546,212.7302574256924,92.04230337506155,25.950326377208526,112.82793517007606,8.340283740795623,480541.4195306973,11046.916229418199,212730.2574256924,92042.30337506154,6282.695167411506,19667.631209797022,16.73438838332025,96.09354678675581,180.6838115240363,8159.599929271587,16734.388383320253,96093.5467867558]},{"year":2006,"cells":[956.6551302280916,493.1741368783332,217.24944792882386,93.92994691200832,26.15656796881962,117.85364152620495,8.291389013901703,482224.75375653064,10949.383121802539,217249.44792882385,93929.94691200832,6156.417396309589,20000.15057251003,16.692109884524644,101.16153164168031,157.33260337182892,8134.056410529875,16692.109884524645,101161.53164168031]},{"year":2007,"cells":[969.8174289955552,499.67276974915893,217.80182945346203,96.30567083674808,25.441667639729175,122.93405357386976,7.661437742587314,488774.54312789737,10898.226621261592,217801.82945346204,96305.67083674808,6401.818138696881,19039.84950103229,17.10398704857998,105.83006652528978,163.83156536217373,7497.60617722514,17103.98704857998,105830.06652528977]},{"year":2008,"cells":[952.3184898125002,492.32041008432606,211.14004238098437,91.87921238634594,24.622827853680054,124.12270875519829,8.233288351965392,480951.2322424596,11369.177841866458,211140.04238098438,91879.21238634594,6161.826653202413,18461.00120047764,16.728479411047438,107.39422934415084,186.51477398788194,8046.77357797751,16728.47941104744,107394.22934415084]},{"year":2009,"cells":[921.8507720058507,487.9210483024831,199.94251536864363,88.31886645627057,23.94244276390242,114.56913758564497,7.1567615289060855,476868.11132925283,11052.936973230293,199942.51536864362,88318.86645627057,5442.484407282776,18499.958356619645,15.841396223162322,98.72774136248265,198.40964360068116,6958.351885305405,15841.396223162323,98727.74136248264]},{"year":2010,"cells":[918.0070315800886,481.6907915749007,201.98021440968085,87.236197633999,24.040785001353434,116.17546668640333,6.883576273751153,470814.6376809535,10876.153893947201,201980.21440968086,87236.19763399899,5426.9684912172825,18613.816510136152,15.807763518302293,100.36770316810103,136.74853421824494,6746.827739532908,15807.763518302294,100367.70316810103]},{"year":2011,"cells":[911.0774897506574,475.2136597130573,201.5614929994726,86.85032675061244,22.311976216546576,118.46107244748154,6.67896162348684,464550.594446394,10663.06526666333,201561.4929994726,86850.32675061244,5457.213375383851,16854.762841162727,15.624008248347884,102.83706419913365,136.6343876429492,6542.327235843891,15624.008248347884,102837.06419913365]},{"year":2012,"cells":[880.4180209069307,456.50393725448805,196.46002548516933,83.85226061375874,21.33917646169814,116.19091727639557,6.071703815420856,446069.6603040501,10434.276950437981,196460.02548516932,83852.26061375874,5276.009745269003,16063.16671642914,14.479646041374007,101.71127123502156,127.10938378564595,5944.59443163521,14479.646041374008,101711.27123502156]},{"year":2013,"cells":[875.3755375232514,458.7905704073035,194.03132104278404,80.35377327952888,19.64880035366834,115.94145472388968,6.6096177160768965,448657.4457588319,10133.124648471596,194031.32104278405,80353.77327952888,4953.910265344102,14694.890088324239,13.279927006031706,102.66152771785798,114.26927523236381,6495.348440844533,13279.927006031705,102661.52771785799]},{"year":2014,"cells":[882.7485316261393,468.7673818929578,191.77593189016386,80.45877839013461,18.48471663490465,117.74347684774402,5.5182459702344,458349.5111173873,10417.870775570571,191775.93189016386,80458.77839013461,4537.944268875722,13946.772366028927,13.073225261084081,104.67025158665994,92.23786169576029,5426.008108538639,13073.22526108408,104670.25158665994]},{"year":2015,"cells":[901.7697630440209,477.0173293278015,196.11616918484043,82.20036075816839,19.236871530194648,121.68147088098956,5.517561362026378,466627.86468510557,10389.46464269595,196116.16918484043,82200.36075816839,4540.918845670133,14695.952684524515,13.151245305357527,108.53022557563203,92.8007694897789,5424.7605925366,13151.245305357526,108530.22557563204]},{"year":2016,"cells":[925.8231291990649,487.7360992956641,200.624424101592,83.34427680641123,19.92266136418032,128.69712969288457,5.498537938332722,477579.9281676082,10156.171128055834,200624.424101592,83344.27680641123,4409.64316114178,15513.01820303854,13.623167119710132,115.07396257317444,103.72531985885338,5394.812618473869,13623.167119710131,115073.96257317445]},{"year":2017,"cells":[949.142924144019,493.4827909802039,206.07286066193862,84.58723581226081,20.807252701135013,138.16512645326827,6.027657535212434,483452.27248147514,10030.51849872875,206072.8606619386,84587.23581226081,4337.338002892178,16469.914698242836,14.002873291889808,124.16225316137847,110.31668812923492,5917.340847083199,14002.873291889808,124162.25316137847]},{"year":2018,"cells":[956.8413283327061,490.15449848991346,208.22081622555243,85.92318140081304,21.408392510078606,144.98001789257742,6.1544218137711155,480336.43331231526,9818.065177598211,208220.81622555244,85923.18140081303,4142.605103300223,17265.787406778385,14.621705658227093,130.35831223435034,108.99286400363182,6045.4289497674845,14621.705658227092,130358.31223435035]},{"year":2019,"cells":[965.7096527401304,493.3919874020098,210.35703259333403,86.14386612410132,22.049218385219085,147.90307220288796,5.86447603257816,483220.2505014302,10171.736900579635,210357.03259333404,86143.86612410132,4107.9692642148575,17941.249121004228,14.92638224293806,132.9766899599499,102.56367900477146,5761.91235357339,14926.38224293806,132976.6899599499]},{"year":2020,"cells":[776.2916718436867,415.5527221129108,194.38262126578542,77.53864236736868,20.04656074714412,64.03229870976347,4.7388266407143,406560.92396827094,8991.798144639868,194382.62126578542,77538.64236736868,3660.556040153515,16386.004706990607,7.922144839822689,56.110153869940774,103.48195117850506,4635.344689535795,7922.144839822689,56110.153869940776]},{"year":2021,"cells":[851.8550255991374,450.2530775903579,209.37061450838843,88.12101624361766,19.72661561140952,79.57079693236325,4.812904713000657,440486.9945554133,9766.083034944579,209370.61450838842,88121.01624361766,3751.1540616932343,15975.461549716285,9.81646404606395,69.7543328862993,121.30410590041177,4691.600607100246,9816.464046063951,69754.3328862993]}],"derivation":"Transport GHG emissions (EU)  (Mt CO₂eq)\n\nWhat it measures: ESABCC progress indicator T1. All EU-27 transport GHG emissions (road, rail, IWW, aviation). Fit-for-55 MIX 2030 benchmark.\n\nHow it''s calculated:\n  1. Each component is first built from the detailed source rows (combined and unit-scaled as needed).\n  2. Add up Road - cars and motorcycles, Road - HDV and buses, Road - Light Duty Trucks, - of which Railways, IWW, Aviation, and - of which Other.\n\nWhy it''s done this way:\n  This is an accounting identity: the source reports these categories as mutually exclusive and exhaustive, so their sum is the total by construction — no modelling assumption is introduced, only disaggregated official data are re-aggregated.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in Mt CO₂eq.\n  • Road - cars and motorcycles — intermediate step, computed as (1.A.3.b.i - Cars + 1.A.3.b.iv - Motorcycles) ÷ 1000. It prepares this component from the detailed source rows so the final line can combine them.\n  • Road - HDV and buses — intermediate step, computed as (1.A.3.b.iii - Heavy duty trucks and buses ÷ 1000). It prepares this component from the detailed source rows so the final line can combine them.\n  • Road - Light Duty Trucks — intermediate step, computed as 1.A.3.b.ii - Light duty trucks ÷ 1000. It prepares this component from the detailed source rows so the final line can combine them.\n  • - of which Railways, IWW — intermediate step, computed as (1.A.3.c - Railways + 1.A.3.d - Domestic Navigation) ÷ 1000. It prepares this component from the detailed source rows so the final line can combine them.\n  • Aviation — intermediate step, computed as - of which domestic + - of which international. It prepares this component from the detailed source rows so the final line can combine them.\n  • - of which Other — intermediate step, computed as (1.A.3.b.v - Other Road Transportation + 1.A.3.e - Other Transportation) ÷ 1000. It prepares this component from the detailed source rows so the final line can combine them.\n  • 1.A.3.b.i - Cars — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • 1.A.3.b.iv - Motorcycles — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • 1.A.3.b.iii - Heavy duty trucks and buses — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • 1.A.3.b.ii - Light duty trucks — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • 1.A.3.c - Railways — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • 1.A.3.d - Domestic Navigation — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • - of which domestic — intermediate step, computed as 1.A.3.a - Domestic Aviation ÷ 1000. It prepares this component from the detailed source rows so the final line can combine them.\n  • - of which international — intermediate step, computed as 1.D.1.a - International Aviation ÷ 1000. It prepares this component from the detailed source rows so the final line can combine them.\n  • 1.A.3.b.v - Other Road Transportation — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • 1.A.3.e - Other Transportation — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • 1.A.3.a - Domestic Aviation — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • 1.D.1.a - International Aviation — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = Road - cars and motorcycles + Road - HDV and buses + Road - Light Duty Trucks + - of which Railways, IWW + Aviation + - of which Other\n  Road - cars and motorcycles = (1.A.3.b.i - Cars + 1.A.3.b.iv - Motorcycles) ÷ 1000\n  Road - HDV and buses = (1.A.3.b.iii - Heavy duty trucks and buses ÷ 1000)\n  Road - Light Duty Trucks = 1.A.3.b.ii - Light duty trucks ÷ 1000\n  - of which Railways, IWW = (1.A.3.c - Railways + 1.A.3.d - Domestic Navigation) ÷ 1000\n  Aviation = - of which domestic + - of which international\n  - of which Other = (1.A.3.b.v - Other Road Transportation + 1.A.3.e - Other Transportation) ÷ 1000\n  - of which domestic = 1.A.3.a - Domestic Aviation ÷ 1000\n  - of which international = 1.D.1.a - International Aviation ÷ 1000\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-t2a-passenger-demand', '{"columns":[{"header":"Value","source":"Eurostat Statistical Pocketbook 2022","formula":{"expr":"[cars and 2-wheels]+[buses and coaches]+[rail]+[aviation]"}},{"header":"cars and 2-wheels","source":"Eurostat Statistical Pocketbook 2022","formula":{"expr":"[Passenger Cars]+[Powered 2-wheelers]"}},{"header":"buses and coaches","source":"Eurostat Statistical Pocketbook 2022","formula":{"expr":"[Buses & Coaches]"}},{"header":"rail","source":"Eurostat Statistical Pocketbook 2022","formula":{"expr":"[Railways]+[Tram & Metro]"}},{"header":"aviation","source":"Eurostat Statistical Pocketbook 2022","formula":{"expr":"[Air]"}},{"header":"Passenger Cars","source":"Eurostat Statistical Pocketbook 2022"},{"header":"Powered 2-wheelers","source":"Eurostat Statistical Pocketbook 2022"},{"header":"Buses & Coaches","source":"Eurostat Statistical Pocketbook 2022"},{"header":"Railways","source":"Eurostat Statistical Pocketbook 2022"},{"header":"Tram & Metro","source":"Eurostat Statistical Pocketbook 2022"},{"header":"Air","source":"Eurostat Statistical Pocketbook 2022"}],"rows":[{"year":2005,"cells":[5225.9,3953.7999999999997,497.8,413.0,361.3,3839.2,114.6,497.8,339.8,73.2,361.3]},{"year":2006,"cells":[5287.099999999999,3988.9,497.8,424.0,376.4,3875.3,113.6,497.8,349.4,74.6,376.4]},{"year":2007,"cells":[5360.8,4030.9,507.9,429.79999999999995,392.2,3921.3,109.6,507.9,353.4,76.4,392.2]},{"year":2008,"cells":[5389.9,4046.1,514.1,445.90000000000003,383.8,3931.6,114.5,514.1,366.6,79.3,383.8]},{"year":2009,"cells":[5410.599999999999,4121.2,489.7,437.9,361.8,4009.2,112,489.7,359.3,78.6,361.8]},{"year":2010,"cells":[5388.200000000001,4089.7000000000003,482.2,439.0,377.3,3975.9,113.8,482.2,358.3,80.7,377.3]},{"year":2011,"cells":[5400.599999999999,4061.2999999999997,485.6,445.20000000000005,408.5,3943.6,117.7,485.6,364.1,81.1,408.5]},{"year":2012,"cells":[5346.8,4013.6,481.6,449.5,402.1,3898.5,115.1,481.6,367.3,82.2,402.1]},{"year":2013,"cells":[5412.2,4071.8999999999996,480.5,453.8,406,3957.2,114.7,480.5,371.8,82,406]},{"year":2014,"cells":[5490.2,4129.9,476.2,458.5,425.6,4012.5,117.4,476.2,376.3,82.2,425.6]},{"year":2015,"cells":[5625.4,4218.4,493.4,461.8,451.8,4101,117.4,493.4,381.6,80.2,451.8]},{"year":2016,"cells":[5763.700000000001,4303.7,498.3,469.1,492.6,4185,118.7,498.3,386.5,82.6,492.6]},{"year":2017,"cells":[5843.2,4340.7,479,485.1,538.4,4228.5,112.2,479,400.8,84.3,538.4]},{"year":2018,"cells":[5913.900000000001,4363.8,484.1,494.20000000000005,571.8,4257,106.8,484.1,407.3,86.9,571.8]},{"year":2019,"cells":[5992.2,4411.2,487.5,508.0,585.5,4299.9,111.3,487.5,420.9,87.1,585.5]},{"year":2020,"cells":[4435.799999999999,3683.1,293.6,281.2,177.9,3583,100.1,293.6,227.3,53.9,177.9]}],"derivation":"Total passenger transport demand  (Gpkm)\n\nWhat it measures: ESABCC progress indicator T2a. Total passenger-kilometres travelled across all inland and air modes.\n\nHow it''s calculated:\n  1. Each component is first built from the detailed source rows (combined and unit-scaled as needed).\n  2. Add up cars and 2-wheels, buses and coaches, rail, and aviation.\n\nWhy it''s done this way:\n  This is an accounting identity: the source reports these categories as mutually exclusive and exhaustive, so their sum is the total by construction — no modelling assumption is introduced, only disaggregated official data are re-aggregated.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in Gpkm.\n  • cars and 2-wheels — intermediate step, computed as Passenger Cars + Powered 2 - wheelers. It prepares this component from the detailed source rows so the final line can combine them.\n  • buses and coaches — intermediate step, computed as Buses & Coaches. It prepares this component from the detailed source rows so the final line can combine them.\n  • rail — intermediate step, computed as Railways + Tram & Metro. It prepares this component from the detailed source rows so the final line can combine them.\n  • aviation — intermediate step, computed as Air. It prepares this component from the detailed source rows so the final line can combine them.\n  • Passenger Cars — raw input from Eurostat Statistical Pocketbook 2022. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Powered 2-wheelers — raw input from Eurostat Statistical Pocketbook 2022. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Buses & Coaches — raw input from Eurostat Statistical Pocketbook 2022. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Railways — raw input from Eurostat Statistical Pocketbook 2022. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Tram & Metro — raw input from Eurostat Statistical Pocketbook 2022. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Air — raw input from Eurostat Statistical Pocketbook 2022. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = cars and 2 - wheels + buses and coaches + rail + aviation\n  cars and 2-wheels = Passenger Cars + Powered 2 - wheelers\n  buses and coaches = Buses & Coaches\n  rail = Railways + Tram & Metro\n  aviation = Air\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-t2b-freight-demand', '{"columns":[{"header":"Value","source":"Eurostat Statistical Pocketbook 2022","formula":{"expr":"[Road]+[Rail]+[IWW]"}},{"header":"Road","source":"Eurostat Statistical Pocketbook 2022","formula":{"expr":"[Road (2)]"}},{"header":"Rail","source":"Eurostat Statistical Pocketbook 2022","formula":{"expr":"[Rail (2)]"}},{"header":"IWW","source":"Eurostat Statistical Pocketbook 2022","formula":{"expr":"[Inland Waterway]"}},{"header":"Road (2)","source":"Eurostat Statistical Pocketbook 2022"},{"header":"Rail (2)","source":"Eurostat Statistical Pocketbook 2022"},{"header":"Inland Waterway","source":"Eurostat Statistical Pocketbook 2022"}],"rows":[{"year":2005,"cells":[2121.362039974329,1588.1540655743293,394.59700000000004,138.61097439999998,1588.1540655743293,394.59700000000004,138.61097439999998]},{"year":2006,"cells":[2193.4575513386717,1638.7945822386714,416.24600000000004,138.4169691,1638.7945822386714,416.24600000000004,138.4169691]},{"year":2007,"cells":[2273.7700389755346,1697.6440389755346,430.72400000000005,145.402,1697.6440389755346,430.72400000000005,145.402]},{"year":2008,"cells":[2245.0506408826395,1676.4616408826394,421.6859999999999,146.90300000000002,1676.4616408826394,421.6859999999999,146.90300000000002]},{"year":2009,"cells":[1992.2915860635596,1515.3165860635595,344.369,132.60600000000002,1515.3165860635595,344.369,132.60600000000002]},{"year":2010,"cells":[2088.6125344262564,1558.2925344262567,374.955,155.36499999999998,1558.2925344262567,374.955,155.36499999999998]},{"year":2011,"cells":[2084.5781993737637,1541.6311993737638,401.12199999999984,141.82500000000002,1541.6311993737638,401.12199999999984,141.82500000000002]},{"year":2012,"cells":[2016.7014120467425,1481.6904120467425,385.18899999999996,149.822,1481.6904120467425,385.18899999999996,149.822]},{"year":2013,"cells":[2053.26703982845,1516.36403982845,384.3190000000001,152.58400000000003,1516.36403982845,384.3190000000001,152.58400000000003]},{"year":2014,"cells":[2067.0736235799927,1527.4346235799926,388.93199999999996,150.70699999999997,1527.4346235799926,388.93199999999996,150.70699999999997]},{"year":2015,"cells":[2107.8556827709112,1561.987682770911,398.5170000000001,147.35100000000003,1561.987682770911,398.5170000000001,147.35100000000003]},{"year":2016,"cells":[2173.8147300951773,1619.7477300951773,407.4580000000001,146.60899999999995,1619.7477300951773,407.4580000000001,146.60899999999995]},{"year":2017,"cells":[2265.815196750172,1707.3138634168388,411.278,147.22333333333333,1707.3138634168388,411.278,147.22333333333333]},{"year":2018,"cells":[2257.112777777778,1707.496,418.31399999999996,131.30277777777778,1707.496,418.31399999999996,131.30277777777778]},{"year":2019,"cells":[2312.405,1764.787,407.921,139.69700000000003,1764.787,407.921,139.69700000000003]},{"year":2020,"cells":[2254.034,1744.986,377.3070000000001,131.741,1744.986,377.3070000000001,131.741]}],"derivation":"Total freight transport demand  (Gtkm)\n\nWhat it measures: ESABCC progress indicator T2b. Total freight tonne-kilometres across road, rail and inland waterways.\n\nHow it''s calculated:\n  1. Each component is first built from the detailed source rows (combined and unit-scaled as needed).\n  2. Add up Road, Rail, and IWW.\n\nWhy it''s done this way:\n  This is an accounting identity: the source reports these categories as mutually exclusive and exhaustive, so their sum is the total by construction — no modelling assumption is introduced, only disaggregated official data are re-aggregated.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in Gtkm.\n  • Road — intermediate step, computed as Road. It prepares this component from the detailed source rows so the final line can combine them.\n  • Rail — intermediate step, computed as Rail. It prepares this component from the detailed source rows so the final line can combine them.\n  • IWW — intermediate step, computed as Inland Waterway. It prepares this component from the detailed source rows so the final line can combine them.\n  • Road — raw input from Eurostat Statistical Pocketbook 2022. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Rail — raw input from Eurostat Statistical Pocketbook 2022. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Inland Waterway — raw input from Eurostat Statistical Pocketbook 2022. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = Road + Rail + IWW\n  Road = Road\n  Rail = Rail\n  IWW = Inland Waterway\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-t3a-road-share-passenger', '{"columns":[{"header":"Value","source":"Eurostat Statistical Pocketbook 2022","formula":{"expr":"([Passenger Cars]+[Powered 2-wheelers])/([Passenger Cars]+[Powered 2-wheelers]+[Buses & Coaches]+[Railways]+[Tram & Metro])"}},{"header":"Passenger Cars","source":"Eurostat Statistical Pocketbook 2022"},{"header":"Powered 2-wheelers","source":"Eurostat Statistical Pocketbook 2022"},{"header":"Buses & Coaches","source":"Eurostat Statistical Pocketbook 2022"},{"header":"Railways","source":"Eurostat Statistical Pocketbook 2022"},{"header":"Tram & Metro","source":"Eurostat Statistical Pocketbook 2022"}],"rows":[{"year":2005,"cells":[0.8127698063561238,3839.2,114.6,497.8,339.8,73.2]},{"year":2006,"cells":[0.8122874539271387,3875.3,113.6,497.8,349.4,74.6]},{"year":2007,"cells":[0.8112748057803004,3921.3,109.6,507.9,353.4,76.4]},{"year":2008,"cells":[0.8082339545754179,3931.6,114.5,514.1,366.6,79.3]},{"year":2009,"cells":[0.8162731738234827,4009.2,112,489.7,359.3,78.6]},{"year":2010,"cells":[0.8161607695224411,3975.9,113.8,482.2,358.3,80.7]},{"year":2011,"cells":[0.8135454017347408,3943.6,117.7,485.6,364.1,81.1]},{"year":2012,"cells":[0.8116973729447692,3898.5,115.1,481.6,367.3,82.2]},{"year":2013,"cells":[0.8133714194398944,3957.2,114.7,480.5,371.8,82]},{"year":2014,"cells":[0.8154444576077085,4012.5,117.4,476.2,376.3,82.2]},{"year":2015,"cells":[0.8153703417349621,4101,117.4,493.4,381.6,80.2]},{"year":2016,"cells":[0.8164709453434766,4185,118.7,498.3,386.5,82.6]},{"year":2017,"cells":[0.8182589353038757,4228.5,112.2,479,400.8,84.3]},{"year":2018,"cells":[0.8168697703150446,4257,106.8,484.1,407.3,86.9]},{"year":2019,"cells":[0.8158765975548856,4299.9,111.3,487.5,420.9,87.1]},{"year":2020,"cells":[0.8650038751497218,3583,100.1,293.6,227.3,53.9]}],"derivation":"Road share of motorised inland passenger transport  (%)\n\nWhat it measures: ESABCC progress indicator T3a. Passenger-side road share (cars + two-wheelers) of motorised inland transport, excluding aviation, maritime and active modes.\n\nHow it''s calculated:\n  1. Add up Passenger Cars and Powered 2-wheelers.\n  2. Divide that by Passenger Cars, Powered 2-wheelers, Buses & Coaches, Railways, and Tram & Metro to get its share of the total.\n\nWhy it''s done this way:\n  Normalising by the total removes the effect of overall volume and isolates the compositional shift (the fuel/modal mix) — which is the quantity of policy interest, and makes years with different total demand directly comparable.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in %.\n  • Passenger Cars — the total, used as the denominator. Dividing by it turns the components into a share.\n  • Powered 2-wheelers — the total, used as the denominator. Dividing by it turns the components into a share.\n  • Buses & Coaches — the total, used as the denominator. Dividing by it turns the components into a share.\n  • Railways — the total, used as the denominator. Dividing by it turns the components into a share.\n  • Tram & Metro — the total, used as the denominator. Dividing by it turns the components into a share.\n\nFormula:\n  Value = (Passenger Cars + Powered 2 - wheelers) ÷ (Passenger Cars + Powered 2 - wheelers + Buses & Coaches + Railways + Tram & Metro)\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-t3b-air-passenger', '{"columns":[{"header":"Value","source":"Eurostat Statistical Pocketbook 2022","formula":{"expr":"[Air passenger demand (Gpkm)]"}},{"header":"Air passenger demand (Gpkm)","source":"Eurostat Statistical Pocketbook 2022"}],"rows":[{"year":2005,"cells":[361.3,361.3]},{"year":2006,"cells":[376.4,376.4]},{"year":2007,"cells":[392.2,392.2]},{"year":2008,"cells":[383.8,383.8]},{"year":2009,"cells":[361.8,361.8]},{"year":2010,"cells":[377.3,377.3]},{"year":2011,"cells":[408.5,408.5]},{"year":2012,"cells":[402.1,402.1]},{"year":2013,"cells":[406,406]},{"year":2014,"cells":[425.6,425.6]},{"year":2015,"cells":[451.8,451.8]},{"year":2016,"cells":[492.6,492.6]},{"year":2017,"cells":[538.4,538.4]},{"year":2018,"cells":[571.8,571.8]},{"year":2019,"cells":[585.5,585.5]},{"year":2020,"cells":[177.9,177.9]}],"derivation":"Intra-EU air passenger transport  (Gpkm)\n\nWhat it measures: ESABCC progress indicator T3b. Intra-EU passenger-kilometres travelled by air; Fit-for-55 MIX 2030 plus 1.5LIFE/TECH 2050 benchmarks.\n\nHow it''s calculated:\n  1. Take Air passenger demand.\n\nWhy it''s done this way:\n  The published figure comes straight from this single source series.\n\n⚠ Caveat:\n  Taken directly from the published Eurostat series; there is no underlying decomposition to recompute.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in Gpkm.\n  • Air passenger demand — raw input from Eurostat Statistical Pocketbook 2022. This is the published series the indicator reports; no further breakdown is available in the source.\n\nFormula:\n  Value = Air passenger demand\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-t4-car-co2-intensity', '{"columns":[{"header":"Value","source":"EEA","formula":{"expr":"[New-car CO2 intensity WLTP (gCO2/km)]"}},{"header":"New-car CO2 intensity WLTP (gCO2/km)","source":"EEA"}],"rows":[{"year":2020,"cells":[130.3,130.3]},{"year":2021,"cells":[114.1,114.1]},{"year":2022,"cells":[108.2,108.2]}],"derivation":"Average CO₂ intensity of new passenger cars (WLTP)  (g CO₂/km)\n\nWhat it measures: ESABCC progress indicator T4. Average tailpipe CO₂ intensity of newly registered cars, WLTP basis. Reg (EU) 2023/851 sets 0 g/km from 2035.\n\nHow it''s calculated:\n  1. Take New-car CO2 intensity WLTP.\n\nWhy it''s done this way:\n  The published figure comes straight from this single source series.\n\n⚠ Caveat:\n  Published series used directly; only 2020–2022 and on the WLTP test basis (not comparable with older NEDC figures).\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in g CO₂/km.\n  • New-car CO2 intensity WLTP — raw input from EEA. This is the published series the indicator reports; no further breakdown is available in the source.\n\nFormula:\n  Value = New - car CO2 intensity WLTP\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-t5a-zev-share-newcars', '{"columns":[{"header":"Value","source":"EU alternative fuel observatory, EEA for 2022","formula":{"expr":"[ZEV]"}},{"header":"ZEV","source":"EU alternative fuel observatory","formula":{"expr":"[BEV]+[H2]"}},{"header":"BEV","source":"EU alternative fuel observatory, EEA for 2022"},{"header":"H2","source":"EU alternative fuel observatory"}],"rows":[{"year":2010,"cells":[0.0001,0.0001,0.0001,0]},{"year":2011,"cells":[0.0007000000000000001,0.0007000000000000001,0.0007000000000000001,0]},{"year":2012,"cells":[0.0013,0.0013,0.0013,0]},{"year":2013,"cells":[0.0022,0.0022,0.0022,0]},{"year":2014,"cells":[0.0033,0.0033,0.0033,0]},{"year":2015,"cells":[0.0046,0.0046,0.0046,0]},{"year":2016,"cells":[0.004699999999999999,0.004699999999999999,0.004699999999999999,0]},{"year":2017,"cells":[0.0068000000000000005,0.0068000000000000005,0.0068000000000000005,0]},{"year":2018,"cells":[0.0106,0.0106,0.0106,0]},{"year":2019,"cells":[0.019,0.019,0.019,0]},{"year":2020,"cells":[0.0539,0.0539,0.0538,0.0001]},{"year":2021,"cells":[0.0887,0.0887,0.0886,0.0001]},{"year":2022,"cells":[0.1341,0.1341,0.134,0.0001]}],"derivation":"ZEV share of new passenger car registrations  (%)\n\nWhat it measures: ESABCC progress indicator T5a. Battery-electric + fuel-cell share of new passenger car registrations.\n\nHow it''s calculated:\n  1. Add up BEV and H2.\n\nWhy it''s done this way:\n  This is an accounting identity: the source reports these categories as mutually exclusive and exhaustive, so their sum is the total by construction — no modelling assumption is introduced, only disaggregated official data are re-aggregated.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in %.\n  • ZEV — intermediate step, computed as BEV + H2. It prepares this component from the detailed source rows so the final line can combine them.\n  • BEV — raw input from EU alternative fuel observatory, EEA for 2022. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • H2 — raw input from EU alternative fuel observatory. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = ZEV\n  ZEV = BEV + H2\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-t5b-zev-lorries-stock', '{"columns":[{"header":"Value","source":"EU alternative fuel observatory","formula":{"expr":"[ZEV]"}},{"header":"ZEV","source":"EU alternative fuel observatory","formula":{"expr":"[BEV]+[H2]"}},{"header":"BEV","source":"EU alternative fuel observatory"},{"header":"H2","source":"EU alternative fuel observatory"}],"rows":[{"year":2015,"cells":[null,null,71,0]},{"year":2016,"cells":[117,117,113,4]},{"year":2017,"cells":[151,151,145,6]},{"year":2018,"cells":[227,227,222,5]},{"year":2019,"cells":[601,601,594,7]},{"year":2020,"cells":[964,964,955,9]},{"year":2021,"cells":[2150,2150,2136,14]},{"year":2022,"cells":[3794,3794,3739,55]}],"derivation":"Zero-emission lorries in the EU fleet  (vehicles)\n\nWhat it measures: ESABCC progress indicator T5b. Stock of zero-emission heavy-duty lorries on EU roads.\n\nHow it''s calculated:\n  1. Add up BEV and H2.\n\nWhy it''s done this way:\n  This is an accounting identity: the source reports these categories as mutually exclusive and exhaustive, so their sum is the total by construction — no modelling assumption is introduced, only disaggregated official data are re-aggregated.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in vehicles.\n  • ZEV — intermediate step, computed as BEV + H2. It prepares this component from the detailed source rows so the final line can combine them.\n  • BEV — raw input from EU alternative fuel observatory. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • H2 — raw input from EU alternative fuel observatory. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = ZEV\n  ZEV = BEV + H2\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-t6a-fossil-transport-share', '{"columns":[{"header":"Value","source":"Energy balances","formula":{"expr":"[% fossil]"}},{"header":"% fossil","formula":{"expr":"([Solid fossil fuels]+[Manufactured gases]+[Peat and peat products]+[Natural gas]+[Oil and petroleum products (excluding biofuel portion)]+[Solid fossil fuels (2)]+[Manufactured gases (2)]+[Peat and peat products (2)]+[Natural gas (2)]+[Oil and petroleum products (excluding biofuel portion) (2)]+[Solid fossil fuels (3)]+[Manufactured gases (3)]+[Peat and peat products (3)]+[Natural gas (3)]+[Oil and petroleum products (excluding biofuel portion) (3)])/([Total]+[Total (2)]+[Total (3)])"}},{"header":"Solid fossil fuels","source":"Eurostat energy balance"},{"header":"Manufactured gases","source":"Eurostat energy balance"},{"header":"Peat and peat products","source":"Eurostat energy balance"},{"header":"Natural gas","source":"Eurostat energy balance"},{"header":"Oil and petroleum products (excluding biofuel portion)","source":"Eurostat energy balance"},{"header":"Solid fossil fuels (2)","source":"Eurostat energy balance"},{"header":"Manufactured gases (2)","source":"Eurostat energy balance"},{"header":"Peat and peat products (2)","source":"Eurostat energy balance"},{"header":"Natural gas (2)","source":"Eurostat energy balance"},{"header":"Oil and petroleum products (excluding biofuel portion) (2)","source":"Eurostat energy balance"},{"header":"Solid fossil fuels (3)","source":"Eurostat energy balance"},{"header":"Manufactured gases (3)","source":"Eurostat energy balance"},{"header":"Peat and peat products (3)","source":"Eurostat energy balance"},{"header":"Natural gas (3)","source":"Eurostat energy balance"},{"header":"Oil and petroleum products (excluding biofuel portion) (3)","source":"Eurostat energy balance"},{"header":"Total","source":"Eurostat energy balance"},{"header":"Total (2)","source":"Eurostat energy balance"},{"header":"Total (3)","source":"Eurostat energy balance"}],"rows":[{"year":2005,"cells":[0.9769331338757148,0.9769331338757148,5.489,0,0,2787.873,270483.07,0,0,0,0,47197.778,0,0,0,0,31148.203,281578.768,47197.778,31148.203]},{"year":2006,"cells":[0.9724751438022436,0.9724751438022436,1.116,0,0,2679.47,274348.895,0,0,0,0,50311.868,0,0,0,0,32737.146,287221.113,50311.868,32737.146]},{"year":2007,"cells":[0.9678336766845199,0.9678336766845199,0.993,0,0,2770.754,276889.839,0,0,0,0,52464.315,0,0,0,0,34156.138,291835.11,52464.315,34156.138]},{"year":2008,"cells":[0.9631357609815848,0.9631357609815848,1.021,0,0,2895.259,271182.008,0,0,0,0,51884.183,0,0,0,0,34790.878,287886.204,51884.183,34790.878]},{"year":2009,"cells":[0.9572174248733273,0.9572174248733273,0.483,0,0,2537.443,262752.135,0,0,0,0,46334.866,0,0,0,0,31853.638,280641.743,46334.866,31853.638]},{"year":2010,"cells":[0.9530627050045178,0.9530627050045178,0.476,0,0,2660.352,260489.882,0,0,0,0,46700.957,0,0,0,0,32120.035,279992.442,46700.957,32120.035]},{"year":2011,"cells":[0.950802394085314,0.950802394085314,0.469,0,0,3032.095,258278.301,0,0,0,0,46535.697,0,0,0,0,33070.273,278951.01,46535.697,33070.273]},{"year":2012,"cells":[0.9466316820352649,0.9466316820352649,0.477,0,0,2833.788,247925.899,0,0,0,0,43487.329,0,0,0,0,32613.426,269187.624,43487.329,32613.426]},{"year":2013,"cells":[0.9500028645155765,0.9500028645155765,0.488,0,0,3119.998,245368.584,0,0,0,0.315,41030.449,0,0,0,0,32756.397,265449.955,41030.763,32756.397]},{"year":2014,"cells":[0.947999272277486,0.947999272277486,1.154,0,0,2993.783,248039.318,0,0,0,0.523,39835.806,0,0,0,0,33171.779,268808.993,39836.329,33171.779]},{"year":2015,"cells":[0.9486074176655519,0.9486074176655519,1.192,0,0,3031.348,251580.015,0,0,0,5.384,40306.194,0,0,0,0,34568.166,272463.417,40311.578,34568.166]},{"year":2016,"cells":[0.950561697566515,0.950561697566515,1.159,0,0,3198.345,257911.861,0,0,0,1.771,41538.432,0,0,0,0,36227.853,278736.337,41540.203,36227.853]},{"year":2017,"cells":[0.9484261114537299,0.9484261114537299,1.357,0,0,3304.196,262345.946,0,0,0,49.946,42128.09,0,0,0,0,38957.262,284509.207,42178.037,38957.262]},{"year":2018,"cells":[0.9450699323665971,0.9450699323665971,1,0,0,3488.227,262127.378,0,0,0,62.757,43336.539,0,0,0,0,41014.912,285944.665,43415.986,41014.917]},{"year":2019,"cells":[0.9439528593405081,0.9439528593405081,0.581,0,0,3705.199,264124.082,0,0,0,142.47,42915.162,0,0,0,0,41791.909,288722.807,43105.004,41791.909]},{"year":2020,"cells":[0.9322268929380393,0.9322268929380393,0.351,0,0,3066.1,227702.745,0,0,0,180.764,38583.15,0,0,0,0,18041.534,251439.587,39000.265,18041.534]},{"year":2021,"cells":[0.9343557793164442,0.9343557793164442,0.412,0,0,3718.087,249154.434,0,0,0,264.047,40330.599,0,0,0,0,21496.071,274834.948,40760.758,21496.071]}],"derivation":"Fossil share of transport energy use  (%)\n\nWhat it measures: ESABCC progress indicator T6a. Fossil share of transport energy use including international bunker fuels.\n\nHow it''s calculated:\n  1. Add up Oil and petroleum products and Oil and petroleum products (excluding biofuel portion).\n  2. Divide that by Total to get its share of the total.\n\nWhy it''s done this way:\n  Normalising by the total removes the effect of overall volume and isolates the compositional shift (the fuel/modal mix) — which is the quantity of policy interest, and makes years with different total demand directly comparable.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in %.\n  • % fossil — intermediate step, computed as (Solid fossil fuels + Manufactured gases + Peat and peat products + Natural gas + Oil and petroleum products + Solid fossil fuels + Manufactured gases + Peat and peat products + Natural gas + Oil and petroleum products (excluding biofuel portion) + Solid fossil fuels + Manufactured gases + Peat and peat products + Natural gas + Oil and petroleum products (excluding biofuel portion)) ÷ (Total + Total + Total). It prepares this component from the detailed source rows so the final line can combine them.\n  • Solid fossil fuels — raw input from Eurostat energy balance. It is one of the components measured against the total to form the share, so it has to be captured to reproduce the figure.\n  • Manufactured gases — a constant factor applied in the calculation.\n  • Peat and peat products — a constant factor applied in the calculation.\n  • Natural gas — raw input from Eurostat energy balance. It is one of the components measured against the total to form the share, so it has to be captured to reproduce the figure.\n  • Oil and petroleum products — raw input from Eurostat energy balance. It is one of the components measured against the total to form the share, so it has to be captured to reproduce the figure.\n  • Solid fossil fuels — a constant factor applied in the calculation.\n  • Manufactured gases — a constant factor applied in the calculation.\n  • Peat and peat products — a constant factor applied in the calculation.\n  • Natural gas — raw input from Eurostat energy balance. It is one of the components measured against the total to form the share, so it has to be captured to reproduce the figure.\n  • Oil and petroleum products (excluding biofuel portion) — raw input from Eurostat energy balance. It is one of the components measured against the total to form the share, so it has to be captured to reproduce the figure.\n  • Solid fossil fuels — a constant factor applied in the calculation.\n  • Manufactured gases — a constant factor applied in the calculation.\n  • Peat and peat products — a constant factor applied in the calculation.\n  • Natural gas — a constant factor applied in the calculation.\n  • Oil and petroleum products (excluding biofuel portion) — raw input from Eurostat energy balance. It is one of the components measured against the total to form the share, so it has to be captured to reproduce the figure.\n  • Total — the total, used as the denominator. Dividing by it turns the components into a share.\n  • Total — the total, used as the denominator. Dividing by it turns the components into a share.\n  • Total — the total, used as the denominator. Dividing by it turns the components into a share.\n\nFormula:\n  Value = % fossil\n  % fossil = (Solid fossil fuels + Manufactured gases + Peat and peat products + Natural gas + Oil and petroleum products + Solid fossil fuels + Manufactured gases + Peat and peat products + Natural gas + Oil and petroleum products (excluding biofuel portion) + Solid fossil fuels + Manufactured gases + Peat and peat products + Natural gas + Oil and petroleum products (excluding biofuel portion)) ÷ (Total + Total + Total)\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-t6b-foodcrop-biofuels', '{"columns":[{"header":"Value","source":"SHARES summary sheet","formula":{"expr":"[Biofuels from food crops (Mtoe)] * [Mtoe → TWh]"}},{"header":"Biofuels from food crops (Mtoe)","source":"SHARES summary sheet"},{"header":"Mtoe → TWh","source":"IEA unit converter"}],"rows":[{"year":2005,"cells":[80.362137,6.9098999999999995,11.63]},{"year":2006,"cells":[107.10764800000001,9.2096,11.63]},{"year":2007,"cells":[104.822353,9.0131,11.63]},{"year":2008,"cells":[111.25955800000003,9.566600000000001,11.63]},{"year":2009,"cells":[109.70811600000002,9.433200000000001,11.63]},{"year":2010,"cells":[110.703644,9.518799999999999,11.63]},{"year":2011,"cells":[116.75938500000001,10.0395,11.63]},{"year":2012,"cells":[124.865495,10.7365,11.63]},{"year":2013,"cells":[128.261455,11.0285,11.63]},{"year":2014,"cells":[122.874439,10.565299999999999,11.63]},{"year":2015,"cells":[118.09334600000003,10.154200000000001,11.63]}],"derivation":"Use of first-generation (food-crop) biofuels in transport  (TWh)\n\nWhat it measures: ESABCC progress indicator T6b. Energy from first-generation biofuels (food/feed crops) used in the transport sector.\n\nHow it''s calculated:\n  1. Take the raw Biofuels from food crops, reported in Mtoe.\n  2. Convert it from Mtoe to TWh.\n\nWhy it''s done this way:\n  A unit conversion is an exact linear rescaling (e.g. 1 toe ≡ 11.63 MWh): it expresses the source''s Mtoe data in TWh without changing the underlying physical quantity or introducing any assumption.\n\n⚠ Caveat:\n  Year alignment is uncertain — the source workbook''s columns were labelled 2011–2021 but map onto the published 2005–2015 range. Confirm the correct years before relying on this.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in TWh.\n  • Biofuels from food crops — raw input from SHARES summary sheet. This is the published series the indicator reports; no further breakdown is available in the source.\n  • Mtoe → TWh — unit-conversion factor (Mtoe → TWh). Needed because the source reports Mtoe but the indicator is shown in TWh; multiplying by it only changes the unit, not the underlying quantity.\n\nFormula:\n  Value = Biofuels from food crops × Mtoe → TWh\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-b1-buildings-ghg', '{"columns":[{"header":"Value","source":"EEA GHG data viewer (UNFCCC CRF)","formula":{"expr":"[Residential (CRF 1.A.4.b)]+[Tertiary (CRF 1.A.4.a)]+[Agriculture & fisheries energy (CRF 1.A.4.c)]"}},{"header":"Residential (CRF 1.A.4.b)","source":"EEA / UNFCCC inventory CRF Table 1.A(a)s4"},{"header":"Tertiary (CRF 1.A.4.a)","source":"EEA / UNFCCC inventory CRF Table 1.A(a)s4"},{"header":"Agriculture & fisheries energy (CRF 1.A.4.c)","source":"EEA / UNFCCC inventory CRF Table 1.A(a)s4"}],"rows":[{"year":2005,"cells":[665.0392409976354,426.8048486219644,154.3626039143487,83.87178846132228]},{"year":2006,"cells":[663.4478326795687,420.478847350464,162.01644886977272,80.95253645933205]},{"year":2007,"cells":[589.4946612543916,368.5614683549124,142.7845651177743,78.14862778170493]},{"year":2008,"cells":[635.0700212689056,399.005212707691,157.0020964387047,79.06271212250992]},{"year":2009,"cells":[621.3870525601141,389.51003567241133,154.306085680938,77.57093120676474]},{"year":2010,"cells":[656.0914267227739,412.9524927561005,163.29737913388203,79.84155483279135]},{"year":2011,"cells":[581.4911591587988,362.0069820055989,140.57009233623006,78.9140848169699]},{"year":2012,"cells":[589.5709624305606,372.5484894975496,140.71548900304438,76.30698392996658]},{"year":2013,"cells":[593.8985478671877,375.12387610261135,142.47916935855022,76.29550240602613]},{"year":2014,"cells":[517.7746481601744,316.9145959151957,124.8706464175849,75.98940582739368]},{"year":2015,"cells":[541.0008190923381,335.1602553423199,130.48530676840943,75.35525698160882]},{"year":2016,"cells":[547.7346214553676,341.31848003471134,130.89357112535978,75.52257029529639]},{"year":2017,"cells":[545.7283094760612,338.5408877789356,131.28435590921788,75.90306578790768]},{"year":2018,"cells":[532.9322957141745,328.3919622628258,127.58943558563323,76.95089786571549]},{"year":2019,"cells":[522.8230782422734,321.1751820670957,125.15035348565097,76.49754268952675]},{"year":2020,"cells":[519.7136736162479,319.38421303496597,122.10588395712497,78.223576624157]},{"year":2021,"cells":[532.5338870926786,324.73676140580284,129.90279769673663,77.89432799013916]}],"derivation":"Residential + tertiary building GHG emissions  (Mt CO₂eq)\n\nWhat it measures: ESABCC progress indicator B1. Direct GHG emissions from heating, cooling and cooking in residential and tertiary buildings.\n\nHow it''s calculated:\n  1. Add up Residential, Tertiary, and Agriculture & fisheries energy.\n\nWhy it''s done this way:\n  This is an accounting identity: the source reports these categories as mutually exclusive and exhaustive, so their sum is the total by construction — no modelling assumption is introduced, only disaggregated official data are re-aggregated.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in Mt CO₂eq.\n  • Residential — raw input from EEA / UNFCCC inventory CRF Table 1.A(a)s4. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Tertiary — raw input from EEA / UNFCCC inventory CRF Table 1.A(a)s4. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Agriculture & fisheries energy — raw input from EEA / UNFCCC inventory CRF Table 1.A(a)s4. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = Residential + Tertiary + Agriculture & fisheries energy\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-b2-buildings-fec', '{"columns":[{"header":"Value","source":"Eurostat energy balances","formula":{"expr":"([Residential households (TJ)]+[Tertiary commercial & public services (TJ)]+[Agriculture & forestry (TJ)]) * [TJ → TWh (EJ2TWh/1e6)]"}},{"header":"Tertiary commercial & public services (TJ)","source":"Eurostat energy balances"},{"header":"Residential households (TJ)","source":"Eurostat energy balances"},{"header":"Agriculture & forestry (TJ)","source":"Eurostat energy balances"},{"header":"TJ → TWh (EJ2TWh/1e6)","source":"Named Refs&Conversions"}],"rows":[{"year":2005,"cells":[4899.6957689192395,5358277.234,11150492.886,1129993.538,0.00027778]},{"year":2006,"cells":[4928.27670589824,5568843.689,11111542.839,1061267.68,0.00027778]},{"year":2007,"cells":[4656.4652903132,5287873.17,10435067.658,1040200.112,0.00027778]},{"year":2008,"cells":[4921.46712225534,5617879.957,11064263.457,1034996.489,0.00027778]},{"year":2009,"cells":[4894.3881034027,5624745.467,10985678.508,1009232.24,0.00027778]},{"year":2010,"cells":[5168.69555034472,5860782.63,11678549.973,1067822.521,0.00027778]},{"year":2011,"cells":[4712.0432432666,5371888.051,10546610.545,1044721.374,0.00027778]},{"year":2012,"cells":[4871.36366976426,5490871.928,11012084.043,1033812.946,0.00027778]},{"year":2013,"cells":[4929.83010054752,5556912.212,11141041.576,1049292.596,0.00027778]},{"year":2014,"cells":[4449.65024636164,5167985.017,9824051.512,1026576.209,0.00027778]},{"year":2015,"cells":[4629.77826070756,5380841.638,10259138.645,1027088.119,0.00027778]},{"year":2016,"cells":[4721.875081087341,5450012.051,10503570.81,1045031.442,0.00027778]},{"year":2017,"cells":[4778.30054582078,5605356.875,10538533.582,1057853.894,0.00027778]},{"year":2018,"cells":[4756.95178642096,5512433.223,10456263.458,1156192.751,0.00027778]},{"year":2019,"cells":[4707.6385666405795,5382855.9,10390886.484,1173620.877,0.00027778]},{"year":2020,"cells":[4625.87070778072,5074802.382,10388387.813,1189811.129,0.00027778]},{"year":2021,"cells":[4878.72409948056,5416746.214,10959828.581,1186691.457,0.00027778]}],"derivation":"Final energy consumption in buildings  (TWh)\n\nWhat it measures: ESABCC progress indicator B2. Final energy consumption in residential plus tertiary buildings (heating, cooling, appliances, lighting).\n\nHow it''s calculated:\n  1. Take the raw figures for Residential households, Tertiary commercial & public services, and Agriculture & forestry, reported in TJ.\n  2. Add them together to get the total.\n  3. Convert that total from TJ to TWh.\n\nWhy it''s done this way:\n  A unit conversion is an exact linear rescaling (e.g. 1 toe ≡ 11.63 MWh): it expresses the source''s TJ data in TWh without changing the underlying physical quantity or introducing any assumption.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in TWh.\n  • Tertiary commercial & public services — raw input from Eurostat energy balances. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Residential households — raw input from Eurostat energy balances. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Agriculture & forestry — raw input from Eurostat energy balances. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • TJ → TWh — unit-conversion factor (TJ → TWh). Needed because the source reports TJ but the indicator is shown in TWh; multiplying by it only changes the unit, not the underlying quantity.\n\nFormula:\n  Value = (Residential households + Tertiary commercial & public services + Agriculture & forestry) × TJ → TWh\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-b5a-residential-fossil-share', '{"columns":[{"header":"Value","source":"Eurostat energy balances","formula":{"expr":"([Other fossils (solids, …)]+[Liquid fossils]+[Natural gas])/[Total]"}},{"header":"Other fossils (solids, …)","source":"Eurostat energy balance"},{"header":"Liquid fossils","source":"Eurostat energy balance"},{"header":"Natural gas","source":"Eurostat energy balance"},{"header":"Total","source":"calculated","formula":{"expr":"([Other fossils (solids, …)]+[Liquid fossils]+[Natural gas]+[Electricity]+[District heating]+[Renewables - bio]+[Renewables - other])"}},{"header":"Electricity","source":"Eurostat energy balance"},{"header":"District heating","source":"Eurostat energy balance"},{"header":"Renewables - bio","source":"Eurostat energy balance"},{"header":"Renewables - other","source":"Eurostat energy balance"}],"rows":[{"year":2005,"cells":[0.5661234957320129,9237.906,52606.552,88923.519,266316.41000000003,57535.929,22254.138,34654.51499999999,1103.8509999999999]},{"year":2006,"cells":[0.5572634569462567,10214.345,50544.129,87134.815,265392.04600000003,58934.424,21313.442,35862.283,1388.6080000000002]},{"year":2007,"cells":[0.5174243703531684,9163.505,39674.239,80121.407,249232.851,58535.992,21659.582,38347.466,1730.66]},{"year":2008,"cells":[0.5264187333963796,9724.203,45449.054,83938.626,264260.89,59852.566,21413.184,41687.748,2195.509]},{"year":2009,"cells":[0.518810966352605,9878.538999999999,41516.874,84730.833,262381.20399999997,60152.637,21360.257,42011.505999999994,2730.558]},{"year":2010,"cells":[0.5186988086114181,11416.98,41083.057,92180.353,278929.482,62776.295,23677.195,44508.723000000005,3286.879]},{"year":2011,"cells":[0.5036464204178995,9900.838000000002,36193.663,80771.228,251894.432,60526.228,21267.579,39968.784999999996,3266.111]},{"year":2012,"cells":[0.49741507568154203,10161.539,35601.929,85062.74,263012.149,61813.091,21519.539,45132.963,3720.348]},{"year":2013,"cells":[0.49652929470957347,9821.436,35792.314,86508.378,266091.305,61544.727,22623.038,45665.024999999994,4136.387]},{"year":2014,"cells":[0.47284393975349526,8804.607,31221.26,70920.886,234637.14699999997,58618.234,20186.481,40391.96399999999,4493.715]},{"year":2015,"cells":[0.4799027247466485,8701.244999999999,32054.46,76833.896,245027.992,59488.019,21084.388,41850.10600000001,5015.878000000001]},{"year":2016,"cells":[0.48442799764193356,9006.828,30787.212,81737.671,250876.728,60514.434,22096.583,41199.443999999996,5534.5560000000005]},{"year":2017,"cells":[0.47891402939636735,8917.467,30221.252,81410.204,251713.07499999995,60921.992,22151.031,41537.78,6553.349]},{"year":2018,"cells":[0.46978225390372674,8344.016,28508.875,80473.873,249747.11800000002,60699.591,21103.143,43508.32,7109.3]},{"year":2019,"cells":[0.4652536540397004,6776.026,29071.42,79623.462,248189.148,60522.618,20857.857,43573.318,7764.447]},{"year":2020,"cells":[0.4674425794212967,6925.547,30460.023,78599.934,248127.811,61271.582,20414.4,42105.458999999995,8350.866]},{"year":2021,"cells":[0.4558169985732281,6630.588,24998.342,87709.745,261812.69099999996,64265.362,22600.253,45777.600999999995,9830.8]}],"derivation":"Fossil share of residential energy mix  (%)\n\nWhat it measures: ESABCC progress indicator B5a (fossil component). Share of fossil fuels in residential final energy consumption.\n\nHow it''s calculated:\n  1. Add up Other fossils, Liquid fossils, and Natural gas.\n  2. Divide that by Total to get its share of the total.\n\nWhy it''s done this way:\n  Normalising by the total removes the effect of overall volume and isolates the compositional shift (the fuel/modal mix) — which is the quantity of policy interest, and makes years with different total demand directly comparable.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in %.\n  • Other fossils — raw input from Eurostat energy balance. It is one of the components measured against the total to form the share, so it has to be captured to reproduce the figure.\n  • Liquid fossils — raw input from Eurostat energy balance. It is one of the components measured against the total to form the share, so it has to be captured to reproduce the figure.\n  • Natural gas — raw input from Eurostat energy balance. It is one of the components measured against the total to form the share, so it has to be captured to reproduce the figure.\n  • Total — intermediate step, computed as (Other fossils + Liquid fossils + Natural gas + Electricity + District heating + Renewables - bio + Renewables - other). It prepares this component from the detailed source rows so the final line can combine them.\n  • Electricity — raw input from Eurostat energy balance. It is one of the components measured against the total to form the share, so it has to be captured to reproduce the figure.\n  • District heating — raw input from Eurostat energy balance. It is one of the components measured against the total to form the share, so it has to be captured to reproduce the figure.\n  • Renewables - bio — raw input from Eurostat energy balance. It is one of the components measured against the total to form the share, so it has to be captured to reproduce the figure.\n  • Renewables - other — raw input from Eurostat energy balance. It is one of the components measured against the total to form the share, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = (Other fossils + Liquid fossils + Natural gas) ÷ Total\n  Total = (Other fossils + Liquid fossils + Natural gas + Electricity + District heating + Renewables - bio + Renewables - other)\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-b5b-tertiary-fossil-share', '{"columns":[{"header":"Value","source":"Eurostat energy balances","formula":{"expr":"([Other fossils (solids/liquid) (tertiary, ktoe)]+[Liquid fossils (tertiary, ktoe)]+[Natural gas (tertiary, ktoe)]) / ([Other fossils (solids/liquid) (tertiary, ktoe)]+[Liquid fossils (tertiary, ktoe)]+[Natural gas (tertiary, ktoe)]+[Electricity (tertiary, ktoe)]+[District heating (tertiary, ktoe)]+[Renewables - bio (tertiary, ktoe)]+[Renewables - other (tertiary, ktoe)])"}},{"header":"Other fossils (solids/liquid) (tertiary, ktoe)","source":"Eurostat energy balances"},{"header":"Liquid fossils (tertiary, ktoe)","source":"Eurostat energy balances"},{"header":"Natural gas (tertiary, ktoe)","source":"Eurostat energy balances"},{"header":"Electricity (tertiary, ktoe)","source":"Eurostat energy balances"},{"header":"District heating (tertiary, ktoe)","source":"Eurostat energy balances"},{"header":"Renewables - bio (tertiary, ktoe)","source":"Eurostat energy balances"},{"header":"Renewables - other (tertiary, ktoe)","source":"Eurostat energy balances"}],"rows":[{"year":2005,"cells":[0.4697753263078172,1365.466,22059.443,36697.19,55783.099,9443.122,2077.3129999999996,554.9050000000002]},{"year":2006,"cells":[0.46654900527690674,1615.0420000000001,21220.915,39219.694,58875.454,9269.039,2218.2309999999998,591.556]},{"year":2007,"cells":[0.4285423875138351,1588.8319999999997,17277.784,35257.868,59786.689,9313.546,2435.1580000000004,639.1439999999998]},{"year":2008,"cells":[0.4389385571603232,1689.4809999999998,19699.341,37508.152,61733.909,10028.203,2786.4809999999998,734.8850000000002]},{"year":2009,"cells":[0.4325611479963074,1920.9969999999998,18082.639,38108.172,62379.792,10075.193,2999.4960000000005,777.2789999999995]},{"year":2010,"cells":[0.4283759334390723,1842.4050000000002,17761.063,40361.891,63959.279,11765.404,3452.1719999999996,840.8110000000006]},{"year":2011,"cells":[0.40796739342164745,1564.9140000000002,15799.021,34980.884,62312.395,9739.004,2889.9649999999997,1020.1960000000004]},{"year":2012,"cells":[0.4090011642789581,1322.2720000000002,15811.523,36505.94,63101.616,10016.038,3259.626000000001,1131.1079999999993]},{"year":2013,"cells":[0.42420996831383556,1342.061,16352.81,38608.582,62667.405,9072.083,3441.1869999999994,1241.3080000000004]},{"year":2014,"cells":[0.3997675943979453,1176.151,14633.463,33536.068,60735.267,8517.167,3135.737,1702.0699999999997]},{"year":2015,"cells":[0.403646450377031,1213.214,14666.912,35996.272,63039.824,8460.624,3336.378,1806.172]},{"year":2016,"cells":[0.4013427834894141,1079.346,14633.104,36530.9,63580.814,8854.487,3525.547,1967.1969999999997]},{"year":2017,"cells":[0.3896696785690813,1093.0639999999999,14667.041,36409.67,63711.05,9236.06,3795.445,4969.719000000001]},{"year":2018,"cells":[0.37705907920989373,1016.742,10804.322,37823.474,63646.466,9247.382,3986.427,5137.679]},{"year":2019,"cells":[0.37125220298055517,927.1109999999999,10633.18,36170.811,62403.236,9116.666,4037.0520000000006,5279.806]},{"year":2020,"cells":[0.3728307369653704,897.6719999999999,9736.805,34561.708,58248.449,8468.086,3966.8250000000003,5344.861999999999]},{"year":2021,"cells":[0.38736503455267957,1067.861,10844.84,38176.16,59875.546,9396.939,4288.104,5657.164]}],"derivation":"Fossil share of tertiary energy mix  (%)\n\nWhat it measures: ESABCC progress indicator B5b (fossil component). Share of fossil fuels in tertiary sector final energy consumption.\n\nHow it''s calculated:\n  1. Add up Other fossils (solids/liquid), Liquid fossils, and Natural gas.\n  2. Divide that by Other fossils (solids/liquid), Liquid fossils, Natural gas, Electricity, District heating, Renewables - bio, and Renewables - other to get its share of the total.\n\nWhy it''s done this way:\n  Normalising by the total removes the effect of overall volume and isolates the compositional shift (the fuel/modal mix) — which is the quantity of policy interest, and makes years with different total demand directly comparable.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in %.\n  • Other fossils (solids/liquid) — the total, used as the denominator. Dividing by it turns the components into a share.\n  • Liquid fossils — the total, used as the denominator. Dividing by it turns the components into a share.\n  • Natural gas — the total, used as the denominator. Dividing by it turns the components into a share.\n  • Electricity — the total, used as the denominator. Dividing by it turns the components into a share.\n  • District heating — the total, used as the denominator. Dividing by it turns the components into a share.\n  • Renewables - bio — the total, used as the denominator. Dividing by it turns the components into a share.\n  • Renewables - other — the total, used as the denominator. Dividing by it turns the components into a share.\n\nFormula:\n  Value = (Other fossils (solids ÷ liquid) + Liquid fossils + Natural gas) ÷ (Other fossils (solids ÷ liquid) + Liquid fossils + Natural gas + Electricity + District heating + Renewables - bio + Renewables - other)\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-b6-heat-pump-stock', '{"columns":[{"header":"Value","source":"EHPA annual report","formula":{"expr":"[Total heat-pump stock (thousand units)] * [thousand → million (/1000)]"}},{"header":"Total heat-pump stock (thousand units)","source":"EHPA annual report"},{"header":"thousand → million (/1000)"}],"rows":[{"year":2005,"cells":[1.1,1100,0.001]},{"year":2006,"cells":[1.6,1600,0.001]},{"year":2007,"cells":[2.17,2170,0.001]},{"year":2008,"cells":[2.98,2980,0.001]},{"year":2009,"cells":[3.71,3710,0.001]},{"year":2010,"cells":[4.5,4500,0.001]},{"year":2011,"cells":[5.3,5300,0.001]},{"year":2012,"cells":[6.03,6030,0.001]},{"year":2013,"cells":[6.78,6780,0.001]},{"year":2014,"cells":[7.55,7550,0.001]},{"year":2015,"cells":[8.43,8430,0.001]},{"year":2016,"cells":[9.41,9410,0.001]},{"year":2017,"cells":[10.5,10500,0.001]},{"year":2018,"cells":[11.78,11780,0.001]},{"year":2019,"cells":[13.21,13210,0.001]},{"year":2020,"cells":[14.77,14770,0.001]},{"year":2021,"cells":[16.87,16870,0.001]},{"year":2022,"cells":[19.79,19790,0.001]}],"derivation":"EU stock of installed heat pumps  (million units)\n\nWhat it measures: ESABCC progress indicator B6. Cumulative stock of heat pumps. REPowerEU 2030 objective requires 60 million units.\n\nHow it''s calculated:\n  1. Take the raw Total heat-pump stock, reported in thousand.\n  2. Convert it from thousand to million.\n\nWhy it''s done this way:\n  A unit conversion is an exact linear rescaling (e.g. 1 toe ≡ 11.63 MWh): it expresses the source''s thousand data in million units without changing the underlying physical quantity or introducing any assumption.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in million units.\n  • Total heat-pump stock — raw input from EHPA annual report. This is the published series the indicator reports; no further breakdown is available in the source.\n  • thousand → million — unit-conversion factor (thousand → million). Needed because the source reports thousand but the indicator is shown in million; multiplying by it only changes the unit, not the underlying quantity.\n\nFormula:\n  Value = Total heat - pump stock × thousand → million\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-a1-agri-nonco2', '{"columns":[{"header":"Value","source":"EEA GHG data viewer","formula":{"expr":"[Enteric fermentation]+[Manure management]+[Fertilizer use]+[Other]"}},{"header":"Enteric fermentation","source":"EEA GHG data viewer"},{"header":"Manure management","source":"EEA GHG data viewer"},{"header":"Fertilizer use","source":"EEA GHG data viewer"},{"header":"Other","source":"EEA GHG data viewer"}],"rows":[{"year":2005,"cells":[380.0561707229802,189.01042749141558,69.08823467669878,117.67972448941138,4.277784065454455]},{"year":2006,"cells":[377.29450206580276,187.98271151369175,68.59881916912724,116.36457053575248,4.348400847231289]},{"year":2007,"cells":[380.212189540364,188.920788936153,68.89885160712971,117.15944851505891,5.233100482022394]},{"year":2008,"cells":[377.76148815108473,188.12321184793373,67.31439187545898,117.87195232306489,4.451932104627133]},{"year":2009,"cells":[372.74538282140566,186.40297925605577,66.94339492744402,114.33474252775099,5.064266110154932]},{"year":2010,"cells":[367.4831212578172,184.31825473661073,64.59833355888863,113.44434151611263,5.122191446205193]},{"year":2011,"cells":[366.7267330077965,182.1059946206142,64.68538725850802,114.55726510845247,5.378086020221744]},{"year":2012,"cells":[366.27471057822106,182.09599302227707,63.783446353228946,114.62183694491189,5.773434257803146]},{"year":2013,"cells":[367.903281572724,182.87487670228046,63.01164458656165,116.62336387978179,5.3933964041000735]},{"year":2014,"cells":[372.8643531257118,184.16848885163995,63.61213189740968,119.73776822400438,5.345964152657757]},{"year":2015,"cells":[374.4810732905481,185.8812770994882,64.25818752651736,118.73613715732535,5.605471507217175]},{"year":2016,"cells":[375.92520023727593,186.477187072414,64.24736803751625,119.61501939897151,5.585625728374154]},{"year":2017,"cells":[378.156356858128,186.64579374586103,64.51316552423758,121.73857484733233,5.258822740697056]},{"year":2018,"cells":[374.9891321948632,185.63822192731556,64.26715709564823,119.99454321579562,5.089209956103801]},{"year":2019,"cells":[370.86908458744256,183.81563989541507,63.777673732175806,118.13703229908408,5.138738660767601]},{"year":2020,"cells":[371.900620709123,183.7484125647313,64.09086899450296,118.62947452869902,5.431864621189746]},{"year":2021,"cells":[368.6119002421649,182.5454973719479,62.90260958350251,117.99412784629206,5.1696654404224205]}],"derivation":"Agricultural non-CO₂ emissions  (Mt CO₂eq)\n\nWhat it measures: ESABCC progress indicator A1. Non-CO₂ emissions from EU agriculture (enteric fermentation, manure, fertiliser, other).\n\nHow it''s calculated:\n  1. Add up Enteric fermentation, Manure management, Fertilizer use, and Other.\n\nWhy it''s done this way:\n  This is an accounting identity: the source reports these categories as mutually exclusive and exhaustive, so their sum is the total by construction — no modelling assumption is introduced, only disaggregated official data are re-aggregated.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in Mt CO₂eq.\n  • Enteric fermentation — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Manure management — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Fertilizer use — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Other — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = Enteric fermentation + Manure management + Fertilizer use + Other\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-a3-fertiliser-use', '{"columns":[{"header":"Value","source":"EU CRF tables","formula":{"expr":"[Inorganic Fertiliser]+[Organic Fertiliser]"}},{"header":"Inorganic Fertiliser","source":"EU CRF tables"},{"header":"Organic Fertiliser","source":"EU CRF tables"}],"rows":[{"year":2005,"cells":[14.900540568726257,9.972314315540503,4.928226253185754]},{"year":2006,"cells":[14.807648426782457,9.886453393674014,4.921195033108443]},{"year":2007,"cells":[15.00952123863999,10.015004471145598,4.9945167674943916]},{"year":2008,"cells":[14.783450700814338,9.833705209792534,4.949745491021804]},{"year":2009,"cells":[14.304165762178826,9.356478855127195,4.94768690705163]},{"year":2010,"cells":[14.367613177575858,9.449582847684674,4.918030329891184]},{"year":2011,"cells":[14.59843905954939,9.615092249730374,4.983346809819016]},{"year":2012,"cells":[14.720364920842464,9.729680555999458,4.990684364843006]},{"year":2013,"cells":[14.899956503688335,9.851372714685843,5.0485837890024925]},{"year":2014,"cells":[15.196473858068817,10.06780302304376,5.128670835025056]},{"year":2015,"cells":[15.411741270080917,10.243902261147205,5.167839008933711]},{"year":2016,"cells":[15.513608025099554,10.344739177168147,5.168868847931406]},{"year":2017,"cells":[15.724607247554154,10.500076044018597,5.224531203535557]},{"year":2018,"cells":[15.569135833396725,10.354157828782753,5.214978004613973]},{"year":2019,"cells":[15.053402931932506,9.869732052951326,5.18367087898118]},{"year":2020,"cells":[15.238611094478252,9.989040628204519,5.249570466273733]},{"year":2021,"cells":[15.00953969208918,9.844834599761363,5.164705092327817]}],"derivation":"Total fertiliser nitrogen use (EU)  (Mt N)\n\nWhat it measures: ESABCC progress indicator A3 (total use). Total nitrogen applied as inorganic + organic fertiliser. Farm-to-Fork 2030 benchmark: 20% reduction vs 2018.\n\nHow it''s calculated:\n  1. Add up Inorganic Fertiliser and Organic Fertiliser.\n\nWhy it''s done this way:\n  This is an accounting identity: the source reports these categories as mutually exclusive and exhaustive, so their sum is the total by construction — no modelling assumption is introduced, only disaggregated official data are re-aggregated.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in Mt N.\n  • Inorganic Fertiliser — raw input from EU CRF tables. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Organic Fertiliser — raw input from EU CRF tables. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = Inorganic Fertiliser + Organic Fertiliser\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-a3-nue', '{"columns":[{"header":"Value","source":"FAOSTAT","formula":{"expr":"[Nitrogen Use Efficiency]"}},{"header":"Nitrogen Use Efficiency","source":"FAOSTAT"}],"rows":[{"year":2005,"cells":[46.8205,46.8205]},{"year":2006,"cells":[44.6363,44.6363]},{"year":2007,"cells":[42.0115,42.0115]},{"year":2008,"cells":[52.45,52.45]},{"year":2009,"cells":[52.2869,52.2869]},{"year":2010,"cells":[46.8992,46.8992]},{"year":2011,"cells":[49.4984,49.4984]},{"year":2012,"cells":[46.8351,46.8351]},{"year":2013,"cells":[50.1924,50.1924]},{"year":2014,"cells":[52.6923,52.6923]},{"year":2015,"cells":[49.9285,49.9285]},{"year":2016,"cells":[47.7499,47.7499]},{"year":2017,"cells":[49.6026,49.6026]},{"year":2018,"cells":[47.7405,47.7405]},{"year":2019,"cells":[50.8986,50.8986]},{"year":2020,"cells":[49.0335,49.0335]}],"derivation":"Nitrogen use efficiency in EU agriculture  (%)\n\nWhat it measures: ESABCC progress indicator A3 (efficiency component). Share of applied N that ends up in harvested products.\n\nHow it''s calculated:\n  1. Take Nitrogen Use Efficiency.\n\nWhy it''s done this way:\n  The published figure comes straight from this single source series.\n\n⚠ Caveat:\n  Not independently derived: nitrogen-use efficiency is taken as the published FAOSTAT ratio. The underlying nitrogen input/output terms are not in the source workbook, so updating raw data will not recompute it.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in %.\n  • Nitrogen Use Efficiency — raw input from FAOSTAT. This is the published series the indicator reports; no further breakdown is available in the source.\n\nFormula:\n  Value = Nitrogen Use Efficiency\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-a7-bioenergy-feedstock', '{"columns":[{"header":"Value","source":"JRC","formula":{"expr":"[Cereal crops]+[Oilseed crops and products]"}},{"header":"Cereal crops","source":"see above","formula":{"expr":"[Cereal crops for bioenergy]"}},{"header":"Oilseed crops and products","source":"see above","formula":{"expr":"[Vegetable oils for bioenergy]"}},{"header":"Cereal crops for bioenergy","source":"JRC"},{"header":"Vegetable oils for bioenergy","source":"JRC"}],"rows":[{"year":2005,"cells":[7.021061072,4.2,2.821061072,4.2,2.821061072]},{"year":2006,"cells":[9.011669341000001,5,4.011669341,5,4.011669341]},{"year":2007,"cells":[11.49608494,5.8,5.69608494,5.8,5.69608494]},{"year":2008,"cells":[13.994250428,6.9,7.094250428,6.9,7.094250428]},{"year":2009,"cells":[16.884303261,8.2,8.684303261,8.2,8.684303261]},{"year":2010,"cells":[18.755223547,8.9,9.855223547,8.9,9.855223547]},{"year":2011,"cells":[19.867157023,10.4,9.467157023,10.4,9.467157023]},{"year":2012,"cells":[19.582617406,9.8,9.782617406,9.8,9.782617406]},{"year":2013,"cells":[20.398416379,10.4,9.998416379,10.4,9.998416379]},{"year":2014,"cells":[22.089817789999998,11,11.08981779,11,11.08981779]},{"year":2015,"cells":[20.522129210000003,9.9,10.62212921,9.9,10.62212921]},{"year":2016,"cells":[20.357640624,10.5,9.857640624,10.5,9.857640624]},{"year":2017,"cells":[22.28081859,11.2,11.08081859,11.2,11.08081859]},{"year":2018,"cells":[22.28782877,11.3,10.98782877,11.3,10.98782877]},{"year":2019,"cells":[22.140525699999998,11.5,10.6405257,11.5,10.6405257]},{"year":2020,"cells":[22.95356017,12.1,10.85356017,12.1,10.85356017]},{"year":2021,"cells":[23.89101612,13.4,10.49101612,13.4,10.49101612]}],"derivation":"Agricultural products used as bioenergy feedstock  (Mt fresh)\n\nWhat it measures: ESABCC progress indicator A7. Cereal and oilseed crops diverted to bioenergy. Climate Target Plan 2030 benchmark for sustainable levels.\n\nHow it''s calculated:\n  1. Each component is first built from the detailed source rows (combined and unit-scaled as needed).\n  2. Add up Cereal crops and Oilseed crops and products.\n\nWhy it''s done this way:\n  This is an accounting identity: the source reports these categories as mutually exclusive and exhaustive, so their sum is the total by construction — no modelling assumption is introduced, only disaggregated official data are re-aggregated.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in Mt fresh.\n  • Cereal crops — intermediate step, computed as Cereal crops for bioenergy. It prepares this component from the detailed source rows so the final line can combine them.\n  • Oilseed crops and products — intermediate step, computed as Vegetable oils for bioenergy. It prepares this component from the detailed source rows so the final line can combine them.\n  • Cereal crops for bioenergy — raw input from JRC. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Vegetable oils for bioenergy — raw input from JRC. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = Cereal crops + Oilseed crops and products\n  Cereal crops = Cereal crops for bioenergy\n  Oilseed crops and products = Vegetable oils for bioenergy\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-l1-lulucf-net', '{"columns":[{"header":"Value","source":"EEA GHG data viewer","formula":{"expr":"[4 - Land Use, Land-Use Change and Forestry] / 1000"}},{"header":"4 - Land Use, Land-Use Change and Forestry","source":"EEA GHG data viewer"}],"rows":[{"year":2005,"cells":[-342.10947613129105,-342109.47613129107]},{"year":2006,"cells":[-351.29638360007004,-351296.38360007]},{"year":2007,"cells":[-300.6172864973615,-300617.2864973615]},{"year":2008,"cells":[-344.26277168343694,-344262.77168343693]},{"year":2009,"cells":[-347.02232862364394,-347022.32862364396]},{"year":2010,"cells":[-352.5901909498173,-352590.1909498173]},{"year":2011,"cells":[-347.27380043837763,-347273.80043837766]},{"year":2012,"cells":[-342.6335989882684,-342633.59898826835]},{"year":2013,"cells":[-342.6049051712324,-342604.9051712324]},{"year":2014,"cells":[-327.8027208805995,-327802.7208805995]},{"year":2015,"cells":[-322.4238390120482,-322423.83901204815]},{"year":2016,"cells":[-318.48652483153614,-318486.52483153617]},{"year":2017,"cells":[-249.7958911803428,-249795.89118034282]},{"year":2018,"cells":[-257.78904072107576,-257789.04072107578]},{"year":2019,"cells":[-247.3176236412184,-247317.6236412184]},{"year":2020,"cells":[-241.03805792704637,-241038.05792704638]},{"year":2021,"cells":[-229.9846664172722,-229984.6664172722]},{"year":2022,"cells":[-243.76728937000001,-243767.28937]}],"derivation":"LULUCF net GHG balance  (Mt CO₂eq)\n\nWhat it measures: ESABCC progress indicator L1. Net GHG balance for land use, land-use change and forestry (negative = net removals). LULUCF Regulation 2030 target: net -310 Mt CO₂eq.\n\nHow it''s calculated:\n  1. Take 4 - Land Use, Land-Use Change and Forestry (then rescaled to Mt CO₂eq).\n\nWhy it''s done this way:\n  The published figure comes straight from this single source series.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in Mt CO₂eq.\n  • 4 - Land Use, Land-Use Change and Forestry — raw input from EEA GHG data viewer. This is the published series the indicator reports; no further breakdown is available in the source.\n\nFormula:\n  Value = 4 - Land Use, Land - Use Change and Forestry ÷ 1000\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-l3-afforestation', '{"columns":[{"header":"Value","source":"CRF table","formula":{"expr":"([cropland to forest land]+[grassland to forest land]+[wetland to forest land]+[settlement to forest land]+[other land to forest land])"}},{"header":"cropland to forest land","source":"CRF table"},{"header":"grassland to forest land","source":"CRF table"},{"header":"wetland to forest land","source":"CRF table"},{"header":"settlement to forest land","source":"CRF table"},{"header":"other land to forest land","source":"CRF table"}],"rows":[{"year":2005,"cells":[487.9976335742529,124.84573991381494,335.03115520220297,10.40708993849702,12.51505903033184,5.19858948940615]},{"year":2006,"cells":[435.6537393638476,104.22352788484035,299.23581652202574,14.49760919507597,12.42378028033184,5.27300548157363]},{"year":2007,"cells":[407.4334445802046,175.5147288329287,198.29155458287596,12.9868068460835,16.26594001413797,4.37441430417847]},{"year":2008,"cells":[337.9529559214583,134.7487974368951,175.29187812142797,9.24545116643491,14.17217275621926,4.49465644048103]},{"year":2009,"cells":[334.0264526841264,127.75937722063628,178.42467649802222,8.58729382013216,11.44245743823526,7.81264770710052]},{"year":2010,"cells":[300.9564355783984,100.36457548152705,169.56038253332176,10.22026899203518,15.25009196744076,5.56111660407362]},{"year":2011,"cells":[288.3071882951564,92.34977357224362,162.8501747711339,10.759436039654231,14.83764860203051,7.51015531009412]},{"year":2012,"cells":[282.8422124264864,87.28074678474366,166.9922819204094,8.440665086728611,14.85730412504265,5.27121450956206]},{"year":2013,"cells":[294.4838757561195,80.82068098233016,178.98562454377202,9.33281706897737,20.42961041154442,4.91514274949556]},{"year":2014,"cells":[266.7433745345174,67.86317389892169,171.35175966476032,12.72204792164086,11.41454663640942,3.39184641278513]},{"year":2015,"cells":[272.84736574935727,66.05110073349869,170.72445908363767,15.965876686680229,13.65846524979171,6.44746399574897]},{"year":2016,"cells":[298.14161999561867,75.00631726890926,188.74919649942723,16.700426650293558,12.97049482968327,4.71518474730536]},{"year":2017,"cells":[343.2354137572588,112.26120997651522,199.307042711844,15.47935308948262,7.93320182968327,8.25460614973374]},{"year":2018,"cells":[299.8215582241222,83.03449791244952,176.44138616912505,21.09963238973356,12.17769182968327,7.06834992313074]},{"year":2019,"cells":[310.1746361535124,81.84283207806054,184.71788654951015,22.796585611406282,14.31267131023145,6.504660604304]},{"year":2020,"cells":[297.7152282434816,81.22627627606651,184.06452450303723,15.86226809073933,10.90525054489726,5.65690882874124]},{"year":2021,"cells":[326.7589901525719,93.60039578999809,190.97774109191582,20.98788930878024,14.46689811421859,6.72606584765916]}],"derivation":"Annual afforested area  (thousand ha/yr)\n\nWhat it measures: ESABCC progress indicator L3. Annual area of land newly classified as forest (afforestation).\n\nHow it''s calculated:\n  1. Add up cropland to forest land, grassland to forest land, wetland to forest land, settlement to forest land, and other land to forest land.\n\nWhy it''s done this way:\n  This is an accounting identity: the source reports these categories as mutually exclusive and exhaustive, so their sum is the total by construction — no modelling assumption is introduced, only disaggregated official data are re-aggregated.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in thousand ha/yr.\n  • cropland to forest land — raw input from CRF table. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • grassland to forest land — raw input from CRF table. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • wetland to forest land — raw input from CRF table. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • settlement to forest land — raw input from CRF table. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • other land to forest land — raw input from CRF table. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = (cropland to forest land + grassland to forest land + wetland to forest land + settlement to forest land + other land to forest land)\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-l4-deforestation', '{"columns":[{"header":"Value","source":"CRF table","formula":{"expr":"-([forest to cropland]+[forest to grassland]+[forest to wetland]+[forest to settlement]+[forest to other land])"}},{"header":"forest to cropland","source":"CRF table"},{"header":"forest to grassland","source":"CRF table"},{"header":"forest to wetland","source":"CRF table"},{"header":"forest to settlement","source":"CRF table"},{"header":"forest to other land","source":"CRF table"}],"rows":[{"year":2005,"cells":[-125.94031744273292,33.31823936037565,40.91458494570012,5.83211218729248,43.86536522613505,2.01001572322963]},{"year":2006,"cells":[-129.78837399873294,31.68132636037565,41.684667626700126,6.83853888729248,45.752062729135055,3.83177839522963]},{"year":2007,"cells":[-138.54180541198636,23.24178654903808,49.068144665015915,10.09834812434793,52.58262388435481,3.5509021892296304]},{"year":2008,"cells":[-122.74188649064034,22.34129389927489,39.056934930643365,11.67190877775451,47.235624258737936,2.43612462422963]},{"year":2009,"cells":[-127.48059668157451,23.88165042081853,37.7554405912693,10.40940343903053,50.78265784198327,4.65144438847288]},{"year":2010,"cells":[-132.6965447241292,21.481525094793568,43.56680358584407,15.13695022223169,46.928713804120314,5.58255201713955]},{"year":2011,"cells":[-112.7347218277904,23.15909917548037,36.56550300679497,7.479606132571931,43.18636943480357,2.34414407813955]},{"year":2012,"cells":[-110.29006185807738,20.78182851112642,33.48094202959565,9.63573318900193,44.09905999181383,2.29249813653955]},{"year":2013,"cells":[-141.70748023379116,28.13310237089014,60.17551253266059,7.434351107334139,43.75494823576674,2.20956598713955]},{"year":2014,"cells":[-125.1396853098111,24.8412717581328,42.64301042664288,8.56373660735414,46.77923030254171,2.31243621513955]},{"year":2015,"cells":[-121.76432725881114,27.79247360892223,39.76131971047198,7.85383260735414,44.40546495092325,1.95123638113955]},{"year":2016,"cells":[-143.4432685806893,27.51862577792783,41.40109378265352,14.19424278357167,57.93372372065008,2.39558251588622]},{"year":2017,"cells":[-119.12566324336933,26.33429216172984,35.725451569895434,12.06280804413167,41.87043673702617,3.13267473058622]},{"year":2018,"cells":[-115.19006072429926,26.45795511016461,35.40580701590129,2.9885183848216696,44.66378209198547,5.67399812142622]},{"year":2019,"cells":[-113.98370289864586,26.44900865330473,34.638349157820336,4.10722546957167,44.48522610706291,4.30389351088622]},{"year":2020,"cells":[-112.91812305823431,26.55596363234225,34.53647599348453,4.50254491385167,42.87064908966964,4.45248942888622]},{"year":2021,"cells":[-114.52994860791408,26.37885600164519,35.36807225047758,4.31556212301857,44.15901247931788,4.308445753454859]}],"derivation":"Annual deforested area  (thousand ha/yr)\n\nWhat it measures: ESABCC progress indicator L4. Annual area of forest converted to other land uses (deforestation).\n\nHow it''s calculated:\n  1. Add up forest to cropland, forest to grassland, forest to wetland, forest to settlement, and forest to other land — reported as a negative value (it represents a loss/removal).\n\nWhy it''s done this way:\n  This is an accounting identity: the source reports these categories as mutually exclusive and exhaustive, so their sum is the total by construction — no modelling assumption is introduced, only disaggregated official data are re-aggregated.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in thousand ha/yr.\n  • forest to cropland — raw input from CRF table. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • forest to grassland — raw input from CRF table. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • forest to wetland — raw input from CRF table. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • forest to settlement — raw input from CRF table. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • forest to other land — raw input from CRF table. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = -(forest to cropland + forest to grassland + forest to wetland + forest to settlement + forest to other land)\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-l5-settlement-area', '{"columns":[{"header":"Value","source":"EU CRF","formula":{"expr":"[Settlement area (kha)] - [Settlement area, previous year (kha)]"}},{"header":"Settlement area (kha)","source":"EU CRF"},{"header":"Settlement area, previous year (kha)","source":"EU CRF"}],"rows":[{"year":2006,"cells":[401.1932124450759,25279.947485437573,24878.754272992497]},{"year":2007,"cells":[231.93072364233012,25511.878209079903,25279.947485437573]},{"year":2008,"cells":[225.8563395697529,25737.734548649656,25511.878209079903]},{"year":2009,"cells":[236.55833969975356,25974.29288834941,25737.734548649656]},{"year":2010,"cells":[232.01301003732806,26206.305898386738,25974.29288834941]},{"year":2011,"cells":[228.45056036303504,26434.756458749773,26206.305898386738]},{"year":2012,"cells":[231.94095441418904,26666.69741316396,26434.756458749773]},{"year":2013,"cells":[155.8901018634606,26822.587515027422,26666.69741316396]},{"year":2014,"cells":[265.2911194371336,27087.878634464556,26822.587515027422]},{"year":2015,"cells":[125.57669410957897,27213.455328574135,27087.878634464556]},{"year":2016,"cells":[179.18642471923886,27392.641753293374,27213.455328574135]},{"year":2017,"cells":[141.46489158360419,27534.106644876978,27392.641753293374]},{"year":2018,"cells":[164.33094171945777,27698.437586596436,27534.106644876978]},{"year":2019,"cells":[149.25088031767154,27847.688466914107,27698.437586596436]},{"year":2020,"cells":[157.54236404463154,28005.23083095874,27847.688466914107]},{"year":2021,"cells":[142.16969832046743,28147.400529279206,28005.23083095874]}],"derivation":"Annual settlement area increase (net land take proxy)  (thousand ha/yr)\n\nWhat it measures: ESABCC progress indicator L5. Annual increase in settlement area used as proxy for net land take. 7th EAP no-net-land-take 2050 target.\n\nHow it''s calculated:\n  1. Take this year''s Settlement area and subtract last year''s value.\n\nWhy it''s done this way:\n  The annual flow is the first difference of the cumulative stock, which recovers the capacity added each year. Note this is a NET figure (gross additions minus retirements), not gross installations.\n\n⚠ Caveat:\n  Used as a proxy for net land take — it is the annual change in settlement area, not a direct measurement of land take.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in thousand ha/yr.\n  • Settlement area — raw input from EU CRF. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Settlement area, previous year — raw input from EU CRF. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = Settlement area - Settlement area, previous year\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-l6-forest-sink', '{"columns":[{"header":"Value","source":"EU GHG inventory CRF","formula":{"expr":"([Carbon stock gain in living biomass]+[Carbon stock loss in living biomass]) * 0.003664"}},{"header":"Carbon stock gain in living biomass","source":"EU GHG inventory CRF"},{"header":"Carbon stock loss in living biomass","source":"EU GHG inventory CRF"}],"rows":[{"year":2005,"cells":[361.7553158376532,207379.81327731995,-108647.46725175958]},{"year":2006,"cells":[356.51215015913397,206916.63427266973,-109615.28324670522]},{"year":2007,"cells":[319.75285657874764,206146.02553512066,-118877.23280074631]},{"year":2008,"cells":[392.09028867981135,218343.4324759636,-111331.89080570942]},{"year":2009,"cells":[397.4427710492324,220287.80260727013,-111815.43059601674]},{"year":2010,"cells":[389.0693197196301,219703.98307324256,-113516.94166504659]},{"year":2011,"cells":[380.4576910060881,219467.88460490768,-115631.17854429412]},{"year":2012,"cells":[382.7163270034361,219573.06023293623,-115119.91421671459]},{"year":2013,"cells":[391.07149514414635,219562.61292857517,-112829.12626259636]},{"year":2014,"cells":[361.98171860844633,216997.78918216712,-118203.65200737282]},{"year":2015,"cells":[342.9237578305207,213886.8459289117,-120294.11726337658]},{"year":2016,"cells":[337.3538314429094,216230.89092571574,-124158.3386760134]},{"year":2017,"cells":[287.58911812182157,212622.7923346734,-134132.3124979317]},{"year":2018,"cells":[267.1561473433706,210749.78581342337,-137835.99014110607]},{"year":2019,"cells":[245.09631704537574,205781.42621340053,-138888.3265831124]},{"year":2020,"cells":[246.71294054715932,205587.36575222082,-138253.04791729743]},{"year":2021,"cells":[231.75979402198345,204988.07275204523,-141734.8538595825]}],"derivation":"Forest land living-biomass carbon sink  (Mt CO₂eq)\n\nWhat it measures: ESABCC progress indicator L6. Net removals attributed to living forest biomass (negative = removals).\n\nHow it''s calculated:\n  1. Add up Carbon stock gain in living biomass and Carbon stock loss in living biomass.\n\nWhy it''s done this way:\n  This is an accounting identity: the source reports these categories as mutually exclusive and exhaustive, so their sum is the total by construction — no modelling assumption is introduced, only disaggregated official data are re-aggregated.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in Mt CO₂eq.\n  • Carbon stock gain in living biomass — raw input from EU GHG inventory CRF. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Carbon stock loss in living biomass — raw input from EU GHG inventory CRF. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = (Carbon stock gain in living biomass + Carbon stock loss in living biomass) × 0.003664\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-l7-nonforest-lulucf', '{"columns":[{"header":"Value","source":"EEA GHG data viewer","formula":{"expr":"([4.B - Cropland]+[4.C - Grassland]+[4.D - Wetlands]+[4.E - Settlements]+[4.F - Other Land]+[4.H - Other LULUCF]) * 0.001"}},{"header":"4.B - Cropland","source":"EEA GHG data viewer"},{"header":"4.C - Grassland","source":"EEA GHG data viewer"},{"header":"4.D - Wetlands","source":"EEA GHG data viewer"},{"header":"4.E - Settlements","source":"EEA GHG data viewer"},{"header":"4.F - Other Land","source":"EEA GHG data viewer"},{"header":"4.H - Other LULUCF","source":"EEA GHG data viewer"}],"rows":[{"year":2005,"cells":[127.84885103555519,41885.53425752837,32510.711081314494,20342.633478671014,31372.47531632753,996.0482301247856,741.448671589]},{"year":2006,"cells":[121.83910295518749,42292.71847651808,27337.3261531531,19996.684255048407,29132.045071322733,2406.758732125177,673.5702670200001]},{"year":2007,"cells":[131.93088180108273,46325.95223374323,33798.482800358346,18814.035616085213,31382.477634862524,991.204401472444,618.7291145610001]},{"year":2008,"cells":[130.72584437323036,47762.40103886886,31158.825769213843,19020.27565720151,31168.626718128216,1041.6689199469322,574.0462698709999]},{"year":2009,"cells":[130.93784425615013,46350.099702714964,32804.09480950376,18775.734370687795,31187.659990446187,1282.9889069523952,537.2664758450001]},{"year":2010,"cells":[117.77413475557313,36721.83150255705,31258.860638103983,20203.806078134243,27887.391763832155,1195.4509248080851,506.7938481376]},{"year":2011,"cells":[115.88420163762632,36216.021077214355,32793.28038378709,19884.201192290882,25402.424176706292,1104.5820204376878,483.69278719000005]},{"year":2012,"cells":[114.63267032567613,36317.39548750013,33714.568394643415,18656.85199674396,24349.698525816864,1129.4697728067404,464.68614816499996]},{"year":2013,"cells":[128.0248706076292,38971.129448076485,40699.159635874574,21154.751048074468,25666.818358516295,1084.0397304747635,448.9723866126]},{"year":2014,"cells":[108.24816840327107,36049.32332552515,23694.8825455224,20163.3243364918,26768.591693427355,1136.1194428113572,435.927059493]},{"year":2015,"cells":[103.07932578357935,30257.074080196024,21547.002939445894,22092.72679723136,27576.62073681327,1180.7630640354055,425.1381658574]},{"year":2016,"cells":[100.35692642528642,25855.203989966096,21169.805021232565,20224.480182398143,31537.096950792027,1154.7278924921804,415.61238840539994]},{"year":2017,"cells":[103.2931295164574,27354.586303049684,25072.843377392957,21688.376968527802,27604.46441605618,1165.208596127795,407.64985530300004]},{"year":2018,"cells":[94.00169154390036,25495.219947681715,16449.560015010768,21436.102788851178,28513.481781041803,1706.3472664195046,400.9797448954]},{"year":2019,"cells":[89.43860753122817,21646.503136414118,18244.112195613357,20796.37730009013,27175.251617226462,1180.914747992109,395.448533892]},{"year":2020,"cells":[91.2147572749346,22368.511518801126,18543.529602015915,21449.86892665799,27265.66564140092,1196.2999588040593,390.8816272546]},{"year":2021,"cells":[97.44075961538142,22646.39783576392,24955.053501122915,21269.811792639,26988.93925864455,1192.6245825610356,387.93264465]}],"derivation":"Non-forest LULUCF net GHG emissions  (Mt CO₂eq)\n\nWhat it measures: ESABCC progress indicator L7. Net GHG balance from cropland, grassland, wetlands and settlements (positive = net emissions).\n\nHow it''s calculated:\n  1. Add up 4.B - Cropland, 4.C - Grassland, 4.D - Wetlands, 4.E - Settlements, 4.F - Other Land, and 4.H - Other LULUCF.\n\nWhy it''s done this way:\n  This is an accounting identity: the source reports these categories as mutually exclusive and exhaustive, so their sum is the total by construction — no modelling assumption is introduced, only disaggregated official data are re-aggregated.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in Mt CO₂eq.\n  • 4.B - Cropland — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • 4.C - Grassland — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • 4.D - Wetlands — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • 4.E - Settlements — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • 4.F - Other Land — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • 4.H - Other LULUCF — raw input from EEA GHG data viewer. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = (4.B - Cropland + 4.C - Grassland + 4.D - Wetlands + 4.E - Settlements + 4.F - Other Land + 4.H - Other LULUCF) × 0.001\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb),
  ('esabcc-l8-bioenergy-use', '{"columns":[{"header":"Value","source":"Eurostat energy balance","formula":{"expr":"([Power and heat: Primary solid biofuels]+[Power and heat: Charcoal]+[Power and heat: Pure biogasoline]+[Power and heat: Blended biogasoline]+[Power and heat: Pure biodiesels]+[Power and heat: Blended biodiesels]+[Power and heat: Pure bio jet kerosene]+[Power and heat: Blended bio jet kerosene]+[Power and heat: Other liquid biofuels]+[Power and heat: Biogases]+[Industry: Primary solid biofuels]+[Industry: Charcoal]+[Industry: Pure biogasoline]+[Industry: Blended biogasoline]+[Industry: Pure biodiesels]+[Industry: Blended biodiesels]+[Industry: Pure bio jet kerosene]+[Industry: Blended bio jet kerosene]+[Industry: Other liquid biofuels]+[Industry: Biogases]+[Transport: Primary solid biofuels]+[Transport: Charcoal]+[Transport: Pure biogasoline]+[Transport: Blended biogasoline]+[Transport: Pure biodiesels]+[Transport: Blended biodiesels]+[Transport: Pure bio jet kerosene]+[Transport: Blended bio jet kerosene]+[Transport: Other liquid biofuels]+[Transport: Biogases]+[Other sectors: Primary solid biofuels]+[Other sectors: Charcoal]+[Other sectors: Pure biogasoline]+[Other sectors: Blended biogasoline]+[Other sectors: Pure biodiesels]+[Other sectors: Blended biodiesels]+[Other sectors: Pure bio jet kerosene]+[Other sectors: Blended bio jet kerosene]+[Other sectors: Other liquid biofuels]+[Other sectors: Biogases]) * 0.001"}},{"header":"Power and heat: Primary solid biofuels","source":"energy balance"},{"header":"Power and heat: Charcoal","source":"energy balance"},{"header":"Power and heat: Pure biogasoline","source":"energy balance"},{"header":"Power and heat: Blended biogasoline","source":"energy balance"},{"header":"Power and heat: Pure biodiesels","source":"energy balance"},{"header":"Power and heat: Blended biodiesels","source":"energy balance"},{"header":"Power and heat: Pure bio jet kerosene","source":"energy balance"},{"header":"Power and heat: Blended bio jet kerosene","source":"energy balance"},{"header":"Power and heat: Other liquid biofuels","source":"energy balance"},{"header":"Power and heat: Biogases","source":"energy balance"},{"header":"Industry: Primary solid biofuels","source":"energy balance"},{"header":"Industry: Charcoal","source":"energy balance"},{"header":"Industry: Pure biogasoline","source":"energy balance"},{"header":"Industry: Blended biogasoline","source":"energy balance"},{"header":"Industry: Pure biodiesels","source":"energy balance"},{"header":"Industry: Blended biodiesels","source":"energy balance"},{"header":"Industry: Pure bio jet kerosene","source":"energy balance"},{"header":"Industry: Blended bio jet kerosene","source":"energy balance"},{"header":"Industry: Other liquid biofuels","source":"energy balance"},{"header":"Industry: Biogases","source":"energy balance"},{"header":"Transport: Primary solid biofuels","source":"energy balance"},{"header":"Transport: Charcoal","source":"energy balance"},{"header":"Transport: Pure biogasoline","source":"energy balance"},{"header":"Transport: Blended biogasoline","source":"energy balance"},{"header":"Transport: Pure biodiesels","source":"energy balance"},{"header":"Transport: Blended biodiesels","source":"energy balance"},{"header":"Transport: Pure bio jet kerosene","source":"energy balance"},{"header":"Transport: Blended bio jet kerosene","source":"energy balance"},{"header":"Transport: Other liquid biofuels","source":"energy balance"},{"header":"Transport: Biogases","source":"energy balance"},{"header":"Other sectors: Primary solid biofuels","source":"energy balance"},{"header":"Other sectors: Charcoal","source":"energy balance"},{"header":"Other sectors: Pure biogasoline","source":"energy balance"},{"header":"Other sectors: Blended biogasoline","source":"energy balance"},{"header":"Other sectors: Pure biodiesels","source":"energy balance"},{"header":"Other sectors: Blended biodiesels","source":"energy balance"},{"header":"Other sectors: Pure bio jet kerosene","source":"energy balance"},{"header":"Other sectors: Blended bio jet kerosene","source":"energy balance"},{"header":"Other sectors: Other liquid biofuels","source":"energy balance"},{"header":"Other sectors: Biogases","source":"energy balance"}],"rows":[{"year":2005,"cells":[896.3854430000001,164104.332,0,6454.615,0,17620.64,0,0,0,5673.882,22981.133,199345.482,171.111,0,1.733,0.677,42.046,0,0,230.951,1530.049,7.864,0,92.159,6228.402,11283.492,17212.74,0,0,1696.31,0,433247.502,2489.039,0,72.533,339.462,571.213,0,0,261.3,4726.776]},{"year":2006,"cells":[972.0654600000001,174969.609,0,9707.165,0,24534.078,0,0,0,8271.97,25942.633,207534.157,179.667,0,2.07,4.504,178.028,0,0,506.874,1351.062,7.03,0,106.67,9677.332,19615.94,23963.742,0,0,7050.42,0,447735.163,2486.05,0,87.203,349.498,1346.269,0,0,675.185,5783.141]},{"year":2007,"cells":[1075.9482029999995,183274.444,0,12366.48,0,43572.87,0,0,0,4926.736,37618.637,215460.945,171.111,0,2.46,2.404,298.432,0,0,640.785,1790.342,16.197,0,166.789,12521.524,19535.293,43990.075,0,0,8256.715,0,476947.058,3179.457,0,104.805,798.319,1903.77,0,0,824.015,7578.54]},{"year":2008,"cells":[1192.621662,202074.777,0,19619.537,0,70563.715,0,0,0,5506.914,45957.729,207137.574,436.333,0,3.203,2.466,329.435,0,0,1250.876,1552.163,1.753,0,188.995,19497.558,12420.581,68471.726,0,0,3357.445,221.67,519431.005,3013.484,0,164.078,692.451,1616.235,0,0,808.683,8301.276]},{"year":2009,"cells":[1270.256041,217786.843,0,24059.307,0,93601.753,0,0,0,10314.912,52179.243,204216.188,222.444,0,2.708,7.307,428.916,0,0,995.092,1903.97,0.919,0,188.337,23885.804,5941.212,91954.921,0,0,883.452,259.183,522911.208,4050.954,0,160.98,396.163,2236.838,0,0,1414.662,10252.725]},{"year":2010,"cells":[1406.1823869999996,257534.265,0,28028.452,0,104794.637,0,0,0,12830.382,60329.74,219870.824,85.556,0.03,2.928,15.953,449.05,0,0,940.647,3574.416,0.086,0,266.151,28575.893,6419.342,103490.793,0,0,602.652,321.691,557961.404,4017.172,0,177.809,295.856,2147.737,0,0,1317.551,12131.37]},{"year":2011,"cells":[1373.96253,255453.042,0,28089.302,0,112777.528,0,0,0,8366.45,76821.349,219628.873,85.556,0,3.42,34.156,465.226,0,0,503.496,3949.935,0.364,0,323.489,29158.612,4834.156,112229.807,0,0,191.675,822.308,499386.409,4193.423,0,199.525,139.566,2218.155,0,0,598.834,13487.874]},{"year":2012,"cells":[1504.2288879999999,287713.128,0,28373.948,0,125982.657,0,0,0,9238.421,92870.045,213283.065,85.556,10.471,3.241,22.954,756.167,0,0,165.803,2634.923,0.365,0,338.24,28391.595,3500.495,123723.405,0,0,185.374,1142.907,561599.938,4621.624,0,227.027,188.285,2693.427,0,0,229.528,16246.299]},{"year":2013,"cells":[1505.7149620000002,291684.305,0,26724.414,0,111173.898,10.278,0,0,10973.93,107159.001,216596.685,96.807,12.838,3.04,23.711,759.173,0,0,254.388,3358.469,3.692,0,292.131,26387.954,2296.807,109722.477,0,0,48.134,1355.767,570560.179,4483.024,0,214.227,173.918,2729.411,0,0,246.217,18370.087]},{"year":2014,"cells":[1474.3263689999999,293392.067,0,26432.067,0,120701.752,10.278,0,0,11663.528,114866.093,219163.446,96.65,14.496,2.86,74.32,877.913,0,0,442.742,3629.316,3.692,0,252.36,26312.495,4171.505,118883.897,0,0,90.676,1429.432,503708.303,4369.424,0,204.883,271.854,2902.607,0,0,260.658,20097.055]},{"year":2015,"cells":[1515.4360879999995,298222.057,0,27441.63,0,119256.327,20.556,0,0,12864.803,119559.138,227848.516,96.492,17.566,2.711,89.054,1058.156,0,0,319.516,3593.657,0.637,0,243.849,26819.71,4843.304,117829.293,0,0,45.262,1480.612,524177.56,4495.224,0,183.447,274.194,2992.058,0,0,304.23,21356.529]},{"year":2016,"cells":[1524.401703,304271.558,0,27263.683,0,117261.488,10.278,0,0,12402.728,121834.215,236864.389,96.383,0,2.353,166.468,1609.307,0,0,439.393,3859.314,1.748,0,123.653,26532.308,3794.673,115492.313,0,0,45.123,1537.013,517953.795,4137.818,0,162.536,357.673,4268.548,0,0,321.032,23591.913]},{"year":2017,"cells":[1570.70551,312410.142,0,29042.607,0,128558.103,13.587,0,0,11680.658,124093.253,238161.752,99.202,0,1.756,390.905,1902.936,0,0,378.78,4485.214,1.489,0,88.557,28067.39,5831.785,125118.071,0,0,19.648,1748.556,524108.114,4341.313,0,180.578,640.353,4983.159,0,0,347.807,24009.795]},{"year":2018,"cells":[1642.1005989999999,317735.01,0.167,31362.43,0,145347.2,11.906,0,0,11944.37,124776.732,240546.693,89.541,0,41.276,435.761,3116.328,0,0,820.627,4737.841,0.488,0,69.613,30166.822,5682.091,139813.526,0,0,7.974,1788.903,549148.716,4462.967,0,223.752,591.255,5413.652,0,0,534.485,23230.473]},{"year":2019,"cells":[1678.9740789999998,332665.14,6.833,32815.067,0,149101.339,11.478,0,0,12882.295,127449.813,245080.04,86.269,0,40.494,335.273,3237.223,0,0,844.421,5452.62,0.407,0,43.402,31413.82,5383.157,145302.759,0,0,15.18,1877.897,550665.408,4208.496,0,191.899,427.068,5629.701,0,0,612.448,23194.132]},{"year":2020,"cells":[1684.09564,341979.283,0,32710.338,0,155275.687,11.929,0,0,12275.861,132721.135,244203.963,86.261,0,39.757,332.252,3124.552,0,0,1420.072,6069.95,0.423,0,40.207,30844.576,5037.271,148039.893,0,0,8.574,2078.783,533390.709,3723.283,0,223.696,464.234,6169.91,0,0,644.428,23178.613]},{"year":2021,"cells":[1795.6962299999998,384161.476,0,36531.809,0,158092.28,54.976,0,0,11634.687,138700.057,245631.234,86.261,0,40.482,262.269,3560.056,0,0,1304.164,5913.059,0.334,0,29.639,35123.005,5441.528,152780.422,0,0,18.4,1366.588,582656.724,3648.893,0,244.062,457.353,6359.96,0,0,476.599,21119.913]}],"derivation":"Total bioenergy use (EU-27)  (TWh)\n\nWhat it measures: ESABCC progress indicator L8. Final consumption of bioenergy across power, heat, transport, industry and other sectors.\n\nHow it''s calculated:\n  1. Take the raw figures for Power and heat: Primary solid biofuels, Power and heat: Charcoal, Power and heat: Pure biogasoline, Power and heat: Pure biodiesels, Power and heat: Blended biodiesels, Power and heat: Other liquid biofuels, Power and heat: Biogases, Industry: Primary solid biofuels, Industry: Charcoal, Industry: Pure biogasoline, Industry: Blended biogasoline, Industry: Pure biodiesels, Industry: Blended biodiesels, Industry: Other liquid biofuels, Industry: Biogases, Transport: Primary solid biofuels, Transport: Pure biogasoline, Transport: Blended biogasoline, Transport: Pure biodiesels, Transport: Blended biodiesels, Transport: Other liquid biofuels, Transport: Biogases, Other sectors: Primary solid biofuels, Other sectors: Charcoal, Other sectors: Blended biogasoline, Other sectors: Pure biodiesels, Other sectors: Blended biodiesels, Other sectors: Other liquid biofuels, and Other sectors: Biogases.\n  2. Add them together to get the total.\n  3. Convert that total to the chart''s unit.\n\nWhy it''s done this way:\n  A unit conversion is an exact linear rescaling (e.g. 1 toe ≡ 11.63 MWh): it expresses the source''s native-unit data in TWh without changing the underlying physical quantity or introducing any assumption.\n\nThe columns in this sheet (and why each is needed):\n  • Value — the final number plotted on the website, in TWh.\n  • Power and heat: Primary solid biofuels — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Power and heat: Charcoal — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Power and heat: Pure biogasoline — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Power and heat: Blended biogasoline — a constant factor applied in the calculation.\n  • Power and heat: Pure biodiesels — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Power and heat: Blended biodiesels — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Power and heat: Pure bio jet kerosene — a constant factor applied in the calculation.\n  • Power and heat: Blended bio jet kerosene — a constant factor applied in the calculation.\n  • Power and heat: Other liquid biofuels — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Power and heat: Biogases — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Industry: Primary solid biofuels — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Industry: Charcoal — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Industry: Pure biogasoline — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Industry: Blended biogasoline — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Industry: Pure biodiesels — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Industry: Blended biodiesels — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Industry: Pure bio jet kerosene — a constant factor applied in the calculation.\n  • Industry: Blended bio jet kerosene — a constant factor applied in the calculation.\n  • Industry: Other liquid biofuels — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Industry: Biogases — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Transport: Primary solid biofuels — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Transport: Charcoal — a constant factor applied in the calculation.\n  • Transport: Pure biogasoline — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Transport: Blended biogasoline — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Transport: Pure biodiesels — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Transport: Blended biodiesels — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Transport: Pure bio jet kerosene — a constant factor applied in the calculation.\n  • Transport: Blended bio jet kerosene — a constant factor applied in the calculation.\n  • Transport: Other liquid biofuels — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Transport: Biogases — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Other sectors: Primary solid biofuels — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Other sectors: Charcoal — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Other sectors: Pure biogasoline — a constant factor applied in the calculation.\n  • Other sectors: Blended biogasoline — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Other sectors: Pure biodiesels — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Other sectors: Blended biodiesels — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Other sectors: Pure bio jet kerosene — a constant factor applied in the calculation.\n  • Other sectors: Blended bio jet kerosene — a constant factor applied in the calculation.\n  • Other sectors: Other liquid biofuels — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n  • Other sectors: Biogases — raw input from energy balance. It is one of the source categories that are added together to form the total, so it has to be captured to reproduce the figure.\n\nFormula:\n  Value = (Power and heat: Primary solid biofuels + Power and heat: Charcoal + Power and heat: Pure biogasoline + Power and heat: Blended biogasoline + Power and heat: Pure biodiesels + Power and heat: Blended biodiesels + Power and heat: Pure bio jet kerosene + Power and heat: Blended bio jet kerosene + Power and heat: Other liquid biofuels + Power and heat: Biogases + Industry: Primary solid biofuels + Industry: Charcoal + Industry: Pure biogasoline + Industry: Blended biogasoline + Industry: Pure biodiesels + Industry: Blended biodiesels + Industry: Pure bio jet kerosene + Industry: Blended bio jet kerosene + Industry: Other liquid biofuels + Industry: Biogases + Transport: Primary solid biofuels + Transport: Charcoal + Transport: Pure biogasoline + Transport: Blended biogasoline + Transport: Pure biodiesels + Transport: Blended biodiesels + Transport: Pure bio jet kerosene + Transport: Blended bio jet kerosene + Transport: Other liquid biofuels + Transport: Biogases + Other sectors: Primary solid biofuels + Other sectors: Charcoal + Other sectors: Pure biogasoline + Other sectors: Blended biogasoline + Other sectors: Pure biodiesels + Other sectors: Blended biodiesels + Other sectors: Pure bio jet kerosene + Other sectors: Blended bio jet kerosene + Other sectors: Other liquid biofuels + Other sectors: Biogases) × 0.001\n\nEverything recomputes live — change a raw input and the plotted value (and any intermediate columns) update automatically, using the same formulas as the original source workbook."}'::jsonb)
on conflict (indicator_id) do update set layout = excluded.layout;
