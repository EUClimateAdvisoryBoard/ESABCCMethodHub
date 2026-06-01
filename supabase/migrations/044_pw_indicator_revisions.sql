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
