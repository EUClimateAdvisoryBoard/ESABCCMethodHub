-- ============================================================================
-- COMBINED MIGRATIONS (001 -> 046)
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

CREATE POLICY "Users can view own libraries"
  ON public.libraries FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id IN (SELECT library_id FROM public.library_members WHERE user_id = auth.uid())
    OR is_shared = true
  );

CREATE POLICY "Authenticated users can create libraries"
  ON public.libraries FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners can update libraries"
  ON public.libraries FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete libraries"
  ON public.libraries FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "Members can view membership"
  ON public.library_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid())
  );

CREATE POLICY "Library owners/admins can manage members"
  ON public.library_members FOR INSERT
  WITH CHECK (
    library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid())
    OR library_id IN (
      SELECT library_id FROM public.library_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Library owners/admins can update members"
  ON public.library_members FOR UPDATE
  USING (
    library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid())
    OR library_id IN (
      SELECT library_id FROM public.library_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

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

CREATE POLICY "read_references" ON public.references FOR SELECT
  USING (
    library_id IN (SELECT library_id FROM public.library_members WHERE user_id = auth.uid())
    OR library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid())
    OR library_id IN (SELECT id FROM public.libraries WHERE is_shared = true)
  );

CREATE POLICY "write_references" ON public.references FOR INSERT
  WITH CHECK (
    library_id IN (SELECT library_id FROM public.library_members WHERE user_id = auth.uid() AND role IN ('editor', 'admin'))
    OR library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid())
  );

CREATE POLICY "update_references" ON public.references FOR UPDATE
  USING (
    library_id IN (SELECT library_id FROM public.library_members WHERE user_id = auth.uid() AND role IN ('editor', 'admin'))
    OR library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid())
  );

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

CREATE POLICY "CSL styles are viewable by everyone"
  ON public.csl_styles FOR SELECT USING (true);

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
create policy "Policy clock events are viewable by everyone"
  on public.policy_clock_events for select using (true);

drop policy if exists "Authors can delete own policy clock events" on public.policy_clock_events;
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
create policy "Users can view own notifications"
  on public.notifications for select using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
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
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  using (auth.uid() is not null);

drop policy if exists "Annotations are viewable by everyone" on public.annotations;
drop policy if exists "Annotations are viewable by authenticated users" on public.annotations;
create policy "Annotations are viewable by authenticated users"
  on public.annotations for select
  using (auth.uid() is not null);

drop policy if exists "Custom tags are viewable by everyone" on public.custom_tags;
drop policy if exists "Custom tags are viewable by authenticated users" on public.custom_tags;
create policy "Custom tags are viewable by authenticated users"
  on public.custom_tags for select
  using (auth.uid() is not null);

drop policy if exists "Comments are viewable by everyone" on public.comments;
drop policy if exists "Comments are viewable by authenticated users" on public.comments;
create policy "Comments are viewable by authenticated users"
  on public.comments for select
  using (auth.uid() is not null);

drop policy if exists "Activity log is viewable by everyone" on public.activity_log;
drop policy if exists "Activity log is viewable by self" on public.activity_log;
drop policy if exists "Activity log is viewable by admins" on public.activity_log;
create policy "Activity log is viewable by self"
  on public.activity_log for select
  using (auth.uid() = user_id);
create policy "Activity log is viewable by admins"
  on public.activity_log for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Shared reading list is viewable by everyone" on public.shared_reading_list;
drop policy if exists "Shared reading list is viewable by authenticated users" on public.shared_reading_list;
create policy "Shared reading list is viewable by authenticated users"
  on public.shared_reading_list for select
  using (auth.uid() is not null);

drop policy if exists "Upvotes are viewable by everyone" on public.reading_list_upvotes;
drop policy if exists "Upvotes are viewable by authenticated users" on public.reading_list_upvotes;
create policy "Upvotes are viewable by authenticated users"
  on public.reading_list_upvotes for select
  using (auth.uid() is not null);

drop policy if exists "Inbound emails are viewable by everyone" on public.inbound_emails;
drop policy if exists "Inbound emails are viewable by authenticated users" on public.inbound_emails;
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
create policy "Deletion requests visible to self"
  on public.deletion_requests for select using (auth.uid() = user_id);

drop policy if exists "Deletion requests visible to admins" on public.deletion_requests;
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
create policy "Custom references readable by authenticated"
  on public.custom_references for select using (auth.uid() is not null);

-- Any authenticated user can add a reference; we record who did it.
drop policy if exists "Authenticated users can insert references" on public.custom_references;
create policy "Authenticated users can insert references"
  on public.custom_references for insert
  with check (auth.uid() is not null and (added_by is null or added_by = auth.uid()));

-- Updates/deletes are gated to the original adder or an admin.
drop policy if exists "Adder or admin can update references" on public.custom_references;
create policy "Adder or admin can update references"
  on public.custom_references for update using (
    added_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Adder or admin can delete references" on public.custom_references;
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
create policy "Connection overrides readable by authenticated"
  on public.connection_overrides for select using (auth.uid() is not null);

drop policy if exists "Authenticated users can write connection overrides"
  on public.connection_overrides;
create policy "Authenticated users can write connection overrides"
  on public.connection_overrides for insert
  with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update connection overrides"
  on public.connection_overrides;
create policy "Authenticated users can update connection overrides"
  on public.connection_overrides for update using (auth.uid() is not null);

drop policy if exists "Authenticated users can delete connection overrides"
  on public.connection_overrides;
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
create policy "Connection verifications readable by authenticated"
  on public.connection_verifications for select using (auth.uid() is not null);

drop policy if exists "Authenticated users can write connection verifications"
  on public.connection_verifications;
create policy "Authenticated users can write connection verifications"
  on public.connection_verifications for insert
  with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update connection verifications"
  on public.connection_verifications;
create policy "Authenticated users can update connection verifications"
  on public.connection_verifications for update using (auth.uid() is not null);

drop policy if exists "Authenticated users can delete connection verifications"
  on public.connection_verifications;
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
create policy "Connection additions readable by authenticated"
  on public.connection_additions for select using (auth.uid() is not null);

drop policy if exists "Authenticated users can add connections"
  on public.connection_additions;
create policy "Authenticated users can add connections"
  on public.connection_additions for insert
  with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update connection additions"
  on public.connection_additions;
create policy "Authenticated users can update connection additions"
  on public.connection_additions for update using (auth.uid() is not null);

drop policy if exists "Authenticated users can delete connection additions"
  on public.connection_additions;
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
create policy "Scenario views readable by owner or shared"
  on public.scenario_views for select using (
    auth.uid() is not null and (is_shared = true or created_by = auth.uid())
  );

drop policy if exists "Authenticated users can create scenario views"
  on public.scenario_views;
create policy "Authenticated users can create scenario views"
  on public.scenario_views for insert
  with check (auth.uid() is not null and (created_by is null or created_by = auth.uid()));

drop policy if exists "Owner can update own scenario views"
  on public.scenario_views;
create policy "Owner can update own scenario views"
  on public.scenario_views for update using (created_by = auth.uid());

drop policy if exists "Owner can delete own scenario views"
  on public.scenario_views;
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
create policy "Shared reading list readable by authenticated"
  on public.shared_reading_list_items for select using (auth.uid() is not null);

drop policy if exists "Authenticated users can add to shared reading list"
  on public.shared_reading_list_items;
create policy "Authenticated users can add to shared reading list"
  on public.shared_reading_list_items for insert
  with check (auth.uid() is not null and (added_by is null or added_by = auth.uid()));

-- Anyone signed in can edit the metadata (notes / priority); the
-- adder column does NOT change. This mirrors the editorial-shared-table
-- semantics already used by `connection_overrides`.
drop policy if exists "Authenticated users can update shared reading list"
  on public.shared_reading_list_items;
create policy "Authenticated users can update shared reading list"
  on public.shared_reading_list_items for update using (auth.uid() is not null);

drop policy if exists "Adder or admin can delete shared reading list items"
  on public.shared_reading_list_items;
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
create policy "Upvotes readable by authenticated"
  on public.shared_reading_list_upvotes for select using (auth.uid() is not null);

drop policy if exists "Users can manage their own upvotes"
  on public.shared_reading_list_upvotes;
create policy "Users can manage their own upvotes"
  on public.shared_reading_list_upvotes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove their own upvotes"
  on public.shared_reading_list_upvotes;
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
create policy "Users read their own preferences"
  on public.user_preferences for select using (user_id = auth.uid());

drop policy if exists "Users insert their own preferences"
  on public.user_preferences;
create policy "Users insert their own preferences"
  on public.user_preferences for insert
  with check (user_id = auth.uid());

drop policy if exists "Users update their own preferences"
  on public.user_preferences;
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
create policy "Workspace member read" on public.workspaces for select using (
  id in (select workspace_id from public.workspace_members where user_id = auth.uid())
);
drop policy if exists "Workspace owner write" on public.workspaces;
create policy "Workspace owner write" on public.workspaces for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Workspace member listing" on public.workspace_members;
create policy "Workspace member listing" on public.workspace_members for select using (
  workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid())
);
drop policy if exists "Workspace owner manages members" on public.workspace_members;
create policy "Workspace owner manages members" on public.workspace_members for all using (
  workspace_id in (select id from public.workspaces where owner_id = auth.uid())
) with check (
  workspace_id in (select id from public.workspaces where owner_id = auth.uid())
);

drop policy if exists "Workspace member reads items" on public.workspace_items;
create policy "Workspace member reads items" on public.workspace_items for select using (
  workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid())
);
drop policy if exists "Workspace member writes items" on public.workspace_items;
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
create policy "Users own their collections" on public.collections for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users own their collection items" on public.collection_items;
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
create policy "Authenticated read history" on public.artefact_history for select
  using (auth.role() = 'authenticated');
drop policy if exists "Authenticated insert history" on public.artefact_history;
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
create policy "Read own or workspace annotations" on public.text_annotations for select using (
  user_id = auth.uid()
  or (workspace_id is not null
      and workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()))
);
drop policy if exists "Insert own annotations" on public.text_annotations;
create policy "Insert own annotations" on public.text_annotations for insert with check (user_id = auth.uid());
drop policy if exists "Update own annotations" on public.text_annotations;
create policy "Update own annotations" on public.text_annotations for update using (user_id = auth.uid());
drop policy if exists "Delete own annotations" on public.text_annotations;
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
create policy "Citations used readable by authenticated"
  on public.citations_used for select using (auth.uid() is not null);

-- Authenticated users can record their own insertions; service role (used by
-- the bridge / Next.js API) bypasses RLS.
drop policy if exists "Authenticated users can record citation usage" on public.citations_used;
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
create unique index if not exists ux_ballots_vote_fingerprint
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
create policy "Climate councils are viewable by everyone"
  on public.climate_councils for select using (true);

-- Authenticated users can edit / add / delete entries (curation model
-- mirrors references and policy clock — anyone signed in can contribute,
-- admins moderate via the audit log).
drop policy if exists "Authenticated users can insert climate councils" on public.climate_councils;
create policy "Authenticated users can insert climate councils"
  on public.climate_councils for insert with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update climate councils" on public.climate_councils;
create policy "Authenticated users can update climate councils"
  on public.climate_councils for update using (auth.uid() is not null);

drop policy if exists "Authenticated users can delete climate councils" on public.climate_councils;
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
create policy "conn_assign_read" on public.connection_assignments
  for select using (auth.role() = 'authenticated');

-- All authenticated users can insert / update / delete assignments.
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
create policy "Authenticated users can update annotations"
  on public.annotations for update
  using (auth.uid() is not null);

drop policy if exists "Users can delete own annotations" on public.annotations;
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
create policy "Authenticated users can read recommendations"
  on public.recommendations for select to authenticated using (true);

create policy "Authenticated users can insert recommendations"
  on public.recommendations for insert to authenticated
  with check (auth.uid() is not null);

create policy "Authenticated users can update recommendations"
  on public.recommendations for update to authenticated
  using (true) with check (true);

create policy "Authenticated users can delete recommendations"
  on public.recommendations for delete to authenticated using (true);

-- policy links
create policy "Authenticated users can read policy links"
  on public.recommendation_policy_links for select to authenticated using (true);

create policy "Authenticated users can insert policy links"
  on public.recommendation_policy_links for insert to authenticated
  with check (true);

create policy "Authenticated users can delete policy links"
  on public.recommendation_policy_links for delete to authenticated using (true);

-- indicator links
create policy "Authenticated users can read indicator links"
  on public.recommendation_indicator_links for select to authenticated using (true);

create policy "Authenticated users can insert indicator links"
  on public.recommendation_indicator_links for insert to authenticated
  with check (true);

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

create policy "pw_policy_codes read"
  on public.pw_policy_codes for select to authenticated using (true);
create policy "pw_policy_codes insert"
  on public.pw_policy_codes for insert to authenticated with check (auth.uid() is not null);
create policy "pw_policy_codes update"
  on public.pw_policy_codes for update to authenticated using (true) with check (true);
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

create policy "pw_indicator_sheets read"   on public.pw_indicator_sheets
  for select to authenticated using (true);
create policy "pw_indicator_sheets insert" on public.pw_indicator_sheets
  for insert to authenticated with check (auth.uid() is not null);
create policy "pw_indicator_sheets update" on public.pw_indicator_sheets
  for update to authenticated using (true) with check (true);
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

create policy "pw_comments read"
  on public.pw_comments for select to authenticated using (true);
create policy "pw_comments insert"
  on public.pw_comments for insert to authenticated with check (auth.uid() is not null);
create policy "pw_comments update"
  on public.pw_comments for update to authenticated using (true) with check (true);
create policy "pw_comments delete"
  on public.pw_comments for delete to authenticated using (auth.uid() = created_by);

-- pw_verifications: a user manages only their OWN vote row.
drop policy if exists "pw_verifications read"   on public.pw_verifications;
drop policy if exists "pw_verifications insert" on public.pw_verifications;
drop policy if exists "pw_verifications update" on public.pw_verifications;
drop policy if exists "pw_verifications delete" on public.pw_verifications;

create policy "pw_verifications read"
  on public.pw_verifications for select to authenticated using (true);
create policy "pw_verifications insert"
  on public.pw_verifications for insert to authenticated with check (auth.uid() = user_id);
create policy "pw_verifications update"
  on public.pw_verifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
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

create policy "pw_indicator_revisions read"
  on public.pw_indicator_revisions for select to authenticated using (true);
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
