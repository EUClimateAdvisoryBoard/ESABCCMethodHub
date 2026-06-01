-- ---------------------------------------------------------------------------
-- Source-report label for workspace recommendations.
--
-- Recommendations in the Project Workspace tracker are drawn from a specific
-- ESABCC publication (e.g. "Towards EU climate neutrality", Jan 2024, or the
-- June 2023 2040-target advice). These columns record which report each
-- recommendation comes from so the UI can show a per-recommendation report
-- label and group by report.
--
-- See src/data/esabcc-recommendations.ts (RECOMMENDATION_REPORTS) for the
-- canonical id / label / url of each report.
-- ---------------------------------------------------------------------------

alter table public.pw_recommendations
  add column if not exists report_id    text not null default '',
  add column if not exists report_label text not null default '',
  add column if not exists report_url   text not null default '';

-- Backfill existing seed rows: every recommendation seeded so far comes from
-- the January 2024 "Towards EU climate neutrality" report.
update public.pw_recommendations
set
  report_id    = 'towards-eu-climate-neutrality-2024',
  report_label = 'Towards EU climate neutrality (Jan 2024)',
  report_url   = 'https://climate-advisory-board.europa.eu/reports-and-publications/towards-eu-climate-neutrality-progress-policy-gaps-and-opportunities'
where is_seed = true
  and report_label = ''
  and id <> 'advice-2023-2040-target';
