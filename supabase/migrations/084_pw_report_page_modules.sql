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
-- of the report surfaces built on them. This migration puts each sub-page into
-- its project as a tab.
--
-- The new 'report-page' module kind holds a pointer, not a copy: the page keeps
-- living under /beta/… and the module renders its description and a link. The
-- per-page copy is in src/data/workspace-report-pages.ts, keyed by module id,
-- so the ids below are load-bearing.
--
-- This migration:
--   • widens the pw_modules kind CHECK to allow 'report-page', and
--   • seeds the nine module rows (idempotent; the runtime seeder
--     `ensureSeedModules` does the same lazily for fresh deploys).
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
    'literature-watch',
    'report-page',
    'custom'
  ));

-- ── Policy Gap 2.0 Report ────────────────────────────────────────────────────
-- Positions continue after whatever the project already has, in the same order
-- as SEED_PROJECTS, so the existing default tab (Indicator database) is
-- unchanged.
insert into public.pw_modules (id, project_id, kind, name, description, position, is_seed, featured)
select v.id, 'policy-gap-2-0', 'report-page', v.name, v.description,
       (select coalesce(max(position), -1) from public.pw_modules where project_id = 'policy-gap-2-0') + v.pos_offset,
       true, v.featured
from (values
  ('gap-tracker', 'Policy Gap Tracker',
   'Every policy, ambition and implementation gap and inconsistency the Board identified across all 12 report chapters — editable, filterable and exportable, with the verbatim report quote and page behind each finding.',
   1, true),
  ('indicator-check', 'Indicator Check',
   'Note 1 · all sectors. What has moved, data-wise, since the last report: the report''s progress indicators read for movement against their own baseline, on this project''s indicator database.',
   2, false),
  ('synergies-tradeoffs', 'Synergies & Trade-offs',
   'Note 2 · industry & transport. Where cutting emissions also builds climate resilience — and where it works against it — mapped subsector by subsector.',
   3, false),
  ('policy-gaps-sectors', 'Policy Gaps — Transport & Industry',
   'Note 3 · extends the gap tracker. Do the transport- and industry-tagged gaps still exist after the legislation adopted since the report, and where are the candidates for additional ones?',
   4, false)
) as v(id, name, description, pos_offset, featured)
on conflict (project_id, id) do nothing;

-- ── Industry Report ──────────────────────────────────────────────────────────
insert into public.pw_modules (id, project_id, kind, name, description, position, is_seed, featured)
select v.id, 'industry-project', 'report-page', v.name, v.description,
       (select coalesce(max(position), -1) from public.pw_modules where project_id = 'industry-project') + v.pos_offset,
       true, v.featured
from (values
  ('cleantech', 'Clean Tech',
   'The collapsible emissions wheel of EU manufacturing (NACE Section C → subsectors → levers with cost, readiness and real investment decisions), plus the clean-tech industries'' role outside industry.',
   1, true),
  ('trade-flows', 'Trade flows',
   'The input–output map of EU-27 manufacturing trade with its critical-dependencies dashboard, on live Eurostat data.',
   2, false),
  ('downstream', 'Downstream',
   'The review of EU lead-market policies (procurement, quotas, CBAM) documented along the five Better Regulation criteria.',
   3, false),
  ('report-objectives', 'Industry report — objectives',
   'Roadmap & clean-tech syntheses and the report objectives, with a fully sourced Excel download.',
   4, false),
  ('optimization', 'Optimization',
   'A SEAMAPS-style least-cost optimization model (Julia/JuMP) of the EU energy-intensive subsectors — sourced inputs, the commented solver code, sensitivity runs and the key findings.',
   5, false)
) as v(id, name, description, pos_offset, featured)
on conflict (project_id, id) do nothing;
