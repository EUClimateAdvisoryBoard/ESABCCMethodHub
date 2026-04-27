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
