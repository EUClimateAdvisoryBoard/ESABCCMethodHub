-- ============================================================================
-- 066 — National Level Climate Policies (beta module)
--
-- Durable store for the EU-27 snapshot of Climate Change Laws of the World
-- (climate-laws.org, Grantham Research Institute at LSE / Climate Policy
-- Radar, CC-BY 4.0). One row holds the whole dataset as jsonb.
--
-- The /national-climate-policies page reads the committed snapshot in
-- `public/data/national-climate-policies.json` as a fallback; once someone
-- presses "Refresh" in the module (POST /api/national-climate-policies),
-- the server fetches current data from api.climatepolicyradar.org and the
-- row written here becomes the source of truth.
--
-- Public read; writes go through the service role in the API route.
-- Idempotent.
-- ============================================================================

create table if not exists public.national_climate_policies_snapshot (
  id            text primary key default 'eu27',
  data          jsonb not null,          -- full PolicyDataset (source block + policies array)
  snapshot_date text not null,           -- ISO date the data was fetched
  policy_count  integer not null,
  refreshed_at  timestamptz not null default now()
);

alter table public.national_climate_policies_snapshot enable row level security;

drop policy if exists "National climate policies are viewable by everyone"
  on public.national_climate_policies_snapshot;
create policy "National climate policies are viewable by everyone"
  on public.national_climate_policies_snapshot for select using (true);
