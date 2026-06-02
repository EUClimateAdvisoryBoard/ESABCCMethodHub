-- ─────────────────────────────────────────────────────────────────────────────
-- Replace the workspace "Policy analysis" module with "Content analysis".
--
-- The legacy `policy-analysis` module (a sectoral-overview mirror) is superseded
-- by a MAXQDA-style qualitative-coding workbench scoped to the project. This:
--   • widens the pw_modules kind CHECK to allow 'content-analysis', and
--   • migrates the existing seeded module rows (id + kind 'policy-analysis')
--     for both report workspaces to the new id + kind, with a fresh blurb.
--
-- Migrating the row id (not just the kind) keeps things idempotent on existing
-- deploys: the runtime seeder (`ensureSeedModules`) inserts the seed module
-- with id 'content-analysis' and `on conflict (project_id, id) do nothing`, so
-- without this rename an existing 'policy-analysis' row would leave a duplicate
-- 'content-analysis' module behind.
--
-- Coded segments themselves live in `content_analysis_segments` keyed by the
-- project id, so this rename does not touch any tagging work.
--
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.pw_modules drop constraint if exists pw_modules_kind_check;
alter table public.pw_modules add constraint pw_modules_kind_check
  check (kind in (
    'indicators',
    'recommendations',
    'member-states',
    'policy-analysis',
    'content-analysis',
    'meetings',
    'custom'
  ));

-- Rename the seeded module rows in place. Guarded so we don't clobber a
-- 'content-analysis' row that already exists for the same project.
update public.pw_modules m
set
  id          = 'content-analysis',
  kind        = 'content-analysis',
  name        = 'Content analysis',
  description =
    'MAXQDA-style qualitative coding for this project. Choose a source — the ' ||
    'EU policy corpus, scientific literature or grey literature & reports — ' ||
    'then mark passages and attach tags & codes. Tags save live and build on ' ||
    'the shared master library, with lenses to compare what each project codes.'
where m.kind = 'policy-analysis'
  and not exists (
    select 1 from public.pw_modules x
    where x.project_id = m.project_id and x.id = 'content-analysis'
  );

-- Migration 047 refreshed the Industry Project blurb to mention "the policy
-- analysis tool"; that tool is now Content analysis, so keep the wording in
-- step (only when it still carries 047's exact text).
update public.pw_projects
  set description = 'Analytical workspace dedicated to industrial decarbonisation — taken in the wider sense of industry (energy-intensive sectors, carbon pricing & leakage, hydrogen and CCU/CCS, clean-tech and circularity). Scoped to industry-tagged policies via the content analysis tool.'
  where id = 'industry-project'
    and description = 'Analytical workspace dedicated to industrial decarbonisation — taken in the wider sense of industry (energy-intensive sectors, carbon pricing & leakage, hydrogen and CCU/CCS, clean-tech and circularity). Scoped to industry-tagged policies via the policy analysis tool.';
