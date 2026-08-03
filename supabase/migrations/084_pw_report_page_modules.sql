-- ─────────────────────────────────────────────────────────────────────────────
-- Report pages as Project Workspace modules.
--
-- The two report modules built in Summer Prep (M · 35) each consist of a
-- landing page plus a handful of sub-pages:
--
--   Policy Gap 2.0 Report → the Gap Tracker itself, plus the three internal
--                           notes of this prep cycle (Indicator Check;
--                           Synergies & Trade-offs; Policy Gaps — Transport &
--                           Industry).
--   Industry Report       → Clean Tech, Trade flows, Downstream, the industry
--                           report objectives, and the Optimization model.
--
-- Until now those pages were reachable only from the beta landing pages, so
-- the Project Workspace — where the team actually works — showed the
-- underlying tools (indicators, content analysis, literature watch …) but none
-- of the report surfaces built on them. They now appear as tabs of their
-- project, under the new 'report-page' module kind.
--
-- THESE MODULES ARE NOT STORED IN THIS TABLE. A report-page module is a
-- pointer to a page under /beta/… — its id, name, description and target all
-- live in code (src/data/project-workspace.ts + src/data/workspace-report-
-- pages.ts) and it holds no per-project state a row could carry. Persisting it
-- would buy nothing and cost a deployment-ordering problem: the tabs would be
-- invisible on any environment where the app had shipped but this migration
-- had not run, because the inserts would fail the kind CHECK. So
-- `withReportPageModules()` in src/lib/project-workspace/db.ts merges them into
-- every project read instead, and the seeder skips them on write.
--
-- What this migration is still for:
--   • it widens the pw_modules kind CHECK to allow 'report-page', so any
--     environment that already holds such a row (an earlier revision of this
--     file did insert them) stays valid and writable; and
--   • it removes those seeded rows, because a stored copy of a code-defined
--     module can only drift from the code. The read path dedupes by id, so
--     doing this is invisible to users either way.
--
-- Idempotent: safe to re-run, and a no-op on an environment that never had the
-- rows.
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
    'literature-watch',
    'report-page',
    'custom'
  ));

-- Scoped to seeded rows: a report-page module is never user-created (the
-- Add-tool picker does not offer the kind), but scoping keeps the delete
-- honest about what it is allowed to remove.
delete from public.pw_modules
 where kind = 'report-page'
   and is_seed = true;
