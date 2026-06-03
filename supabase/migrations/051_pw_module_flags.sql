-- ─────────────────────────────────────────────────────────────────────────────
-- Workspace module presentation flags: `featured` (bold tab) and `beta`.
--
-- The seed data (`src/data/project-workspace.ts`) marks Policy Gap 2.0's
-- production-ready tools — Indicator database and Content analysis — as
-- `featured` (rendered with a bold tab label), and the more experimental
-- Member state space and Past recommendations tracker as `beta`. Those flags
-- only ever took effect on the no-database fallback path: the Supabase-backed
-- reads (`listProjects` / `getProject`) and the runtime seeder never carried
-- `featured`/`beta`, and `pw_modules` had no columns for them. On live deploys
-- the flags were therefore silently dropped — the "bold isn't live" symptom.
--
-- This migration:
--   • adds the two boolean columns (default false), and
--   • for Policy Gap 2.0, sets the flags and reorders the tabs so Content
--     analysis sits next to the Indicator database (both bold, positions 0–1)
--     and the two beta modules follow to the right (positions 2–3).
--
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.pw_modules
  add column if not exists featured boolean not null default false,
  add column if not exists beta     boolean not null default false;

-- Indicator database — featured, leftmost.
update public.pw_modules
  set featured = true, beta = false, position = 0
  where project_id = 'policy-gap-2-0' and id = 'indicators';

-- Content analysis — featured, next to the Indicator database.
update public.pw_modules
  set featured = true, beta = false, position = 1
  where project_id = 'policy-gap-2-0' and id = 'content-analysis';

-- Member state space — beta, to the right.
update public.pw_modules
  set beta = true, featured = false, position = 2
  where project_id = 'policy-gap-2-0' and id = 'member-states';

-- Past recommendations tracker — beta, to the right.
update public.pw_modules
  set beta = true, featured = false, position = 3
  where project_id = 'policy-gap-2-0' and id = 'recommendations';
