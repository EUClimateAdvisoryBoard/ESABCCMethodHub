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
--
-- 'content-analysis' is included too even though it's only introduced later (in
-- 048): when this whole chain is re-applied to a database that's already past
-- 048 (e.g. the one-shot combined_migrations.sql run), the existing
-- content-analysis module rows would otherwise fail this stricter constraint.
-- The set only ever widens, so this is forward-compatible.
alter table public.pw_modules drop constraint if exists pw_modules_kind_check;
alter table public.pw_modules add constraint pw_modules_kind_check
  check (kind in (
    'indicators',
    'recommendations',
    'member-states',
    'policy-analysis',
    'content-analysis',
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
