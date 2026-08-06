-- ─────────────────────────────────────────────────────────────────────────────
-- Policy Gap 2.0 — tab order: working tools first, reference spaces last.
--
-- The project's tab bar had grown to nine tabs and no longer read in the order
-- the team works in. The two standing reference collections — the Member state
-- space and the Past recommendations tracker — sat third and fourth, between
-- the tools the prep cycle uses daily (the indicator database, content
-- analysis, literature watch) and the report pages built on them, pushing the
-- Policy Gap Tracker off the visible end of the bar.
--
-- This migration renumbers the stored seed modules so the bar reads:
--
--   Indicator database · Content analysis · Literature watch
--     → [the four report pages, merged in on read]
--     → Member state space · Past recommendations tracker
--
-- Report pages hold no row (see 084_pw_report_page_modules.sql); they are
-- anchored to the module they follow in the seed catalogue by
-- `withReportPageModules()` in src/lib/project-workspace/db.ts, which is why
-- leaving a gap in the numbering is unnecessary — the positions below only
-- have to order the stored modules relative to each other.
--
-- User-added tools keep whatever positions they already hold. A created module
-- takes the row count as its position (5 and upwards here), so it now sits
-- between the report pages and the two reference spaces instead of at the very
-- end; the Reorder / remove dialog moves it wherever the team wants. The gap
-- between 2 and 7 is what leaves room for that.
--
-- Scoped to `is_seed = true` rows of this one project and idempotent: re-running
-- it writes the same four positions.
-- ─────────────────────────────────────────────────────────────────────────────

update public.pw_modules m
   set position = v.position
  from (values
    ('indicators',        0),
    ('content-analysis',  1),
    ('literature-watch',  2),
    ('member-states',     7),
    ('recommendations',   8)
  ) as v(id, position)
 where m.project_id = 'policy-gap-2-0'
   and m.is_seed = true
   and m.id = v.id;
