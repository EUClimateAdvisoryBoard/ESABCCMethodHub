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
