-- ─────────────────────────────────────────────────────────────────────────────
-- Remove the duplicate legacy "Policy analysis" workspace tab.
--
-- Migration 048 migrated the legacy `policy-analysis` module to `content-analysis`,
-- but only when the project did not ALREADY have a `content-analysis` row (to
-- avoid clobbering it). On deploys where the runtime seeder had already inserted
-- the new `content-analysis` module, that guard left the old `policy-analysis`
-- row in place — so the project shows two tabs ("Content analysis" and
-- "Policy analysis") that render the exact same project-scoped workbench.
--
-- Both render `ContentAnalysisModule`, which is keyed by project id (not module
-- id), so the coded segments in `content_analysis_segments` are shared and are
-- NOT touched by this cleanup — we only drop the redundant tab row.
--
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

delete from public.pw_modules m
where m.kind = 'policy-analysis'
  and exists (
    select 1 from public.pw_modules x
    where x.project_id = m.project_id
      and x.kind = 'content-analysis'
  );
