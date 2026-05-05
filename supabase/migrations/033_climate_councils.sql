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
