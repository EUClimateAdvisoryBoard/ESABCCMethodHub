-- ============================================================================
-- COMBINED MIGRATIONS (001 -> 027)
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

