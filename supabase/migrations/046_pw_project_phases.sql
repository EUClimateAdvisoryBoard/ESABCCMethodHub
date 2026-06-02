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
