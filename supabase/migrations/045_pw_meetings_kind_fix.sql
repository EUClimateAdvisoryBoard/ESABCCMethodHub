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
