-- ---------------------------------------------------------------------------
-- Seed the Industry Project with the indicator-database and recommendations
-- modules.
--
-- The Industry Project shipped in migration 038 with an empty module list
-- ("Modules to be added as the project scope is defined."). It now reuses the
-- same generic, project-scoped modules as Policy Gap 2.0 — so it inherits the
-- latest workspace functionality:
--   • the Excel-like spreadsheet editor + formula engine on the indicator
--     database (5d43cab), and
--   • the recommendations tracker with status, dated uptake events and the
--     fact-check / verify workflow (c443e19, e77118a).
--
-- Unlike Policy Gap 2.0, the Industry Project is NOT seeded with the ESABCC
-- report indicators / recommendations (those rows are global by id and belong
-- to that report). It starts empty; contributors populate it through the UI.
--
-- Idempotent: re-running is a no-op via the (project_id, id) conflict target,
-- and on a fresh deploy this runs after 038 has created the project row.
-- ---------------------------------------------------------------------------

insert into public.pw_modules (id, project_id, kind, name, description, position, is_seed) values
  ('indicators',      'industry-project', 'indicators',
     'Indicator database',
     'Industrial-decarbonisation indicators. Table + chart view with the Excel-like spreadsheet editor and formula engine; add indicators and round-trip them through Excel.',
     0, true),
  ('recommendations', 'industry-project', 'recommendations',
     'Recommendations tracker',
     'Track recommendations relevant to industrial decarbonisation, with status, dated uptake events and the fact-check / verify workflow.',
     1, true)
on conflict (project_id, id) do nothing;

-- Refresh the now-stale "modules to be added" blurb to match the seeded set.
update public.pw_projects
set description =
  'Analytical workspace dedicated to industrial decarbonisation, with an indicator database and a recommendations tracker.'
where id = 'industry-project'
  and description = 'Analytical workspace dedicated to industrial decarbonisation. Modules to be added as the project scope is defined.';
