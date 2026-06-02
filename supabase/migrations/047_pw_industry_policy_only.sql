-- ---------------------------------------------------------------------------
-- Scope the Industry Project down to a single tool: Policy analysis.
--
-- The Industry Project previously shipped four tools plus Meetings (seeded by
-- 038 / 044_industry_project / 044_pw_industry_modules / 045). It is now scoped
-- to the industry-tagged policy analysis only, so we drop the seeded
--   • indicator database
--   • recommendations tracker
--   • member-state space
--   • meetings
-- modules. Policy Gap 2.0 also drops its seeded Meetings module.
--
-- Only seed rows (is_seed = true) are removed, so any module a user explicitly
-- created under one of these ids is left untouched. Indicator / recommendation
-- DATA rows are left in place — they are no longer surfaced by any module and
-- removing them would be destructive to anything contributors have entered.
--
-- Idempotent: re-running deletes nothing once the rows are gone.
-- ---------------------------------------------------------------------------

delete from public.pw_modules
where project_id = 'industry-project'
  and is_seed = true
  and id in ('indicators', 'recommendations', 'member-states', 'meetings');

delete from public.pw_modules
where project_id = 'policy-gap-2-0'
  and is_seed = true
  and id = 'meetings';

-- Refresh the Industry Project blurb to match its new single-tool scope, but
-- only when it still carries the previous four-tool description (never clobber
-- a hand-edited one).
update public.pw_projects
  set description = 'Analytical workspace dedicated to industrial decarbonisation — taken in the wider sense of industry (energy-intensive sectors, carbon pricing & leakage, hydrogen and CCU/CCS, clean-tech and circularity). Scoped to industry-tagged policies via the policy analysis tool.'
  where id = 'industry-project'
    and description = 'Analytical workspace dedicated to industrial decarbonisation — the same four tools as Policy Gap 2.0, scoped to industry: industry indicators, the industry-tagged recommendations, industry-tagged policies and a member-state space framed around industrial transition.';
