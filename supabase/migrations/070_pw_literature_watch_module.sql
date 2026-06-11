-- ─────────────────────────────────────────────────────────────────────────────
-- Literature watch module for the Project Workspace.
--
-- A daily GitHub Action (.github/workflows/daily-publication-screening.yml)
-- screens the relevant scientific journals via Crossref and commits a daily
-- markdown report plus a rolling suggestions archive under
-- public/data/publication-screening/. The new 'literature-watch' module kind
-- renders those suggestions inside each project (matched to the project's
-- keyword profile) and lets the team read the daily reports.
--
-- This migration:
--   • widens the pw_modules kind CHECK to allow 'literature-watch', and
--   • seeds the module row for both seed projects (idempotent; the runtime
--     seeder `ensureSeedModules` does the same lazily for fresh deploys).
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
    'custom'
  ));

insert into public.pw_modules (id, project_id, kind, name, description, position, is_seed, beta)
values
  (
    'literature-watch',
    'policy-gap-2-0',
    'literature-watch',
    'Literature watch',
    'New peer-reviewed publications from the relevant journals, screened ' ||
    'every morning and matched to this project. Read the daily screening ' ||
    'report and pick the papers worth a closer look.',
    (select coalesce(max(position), -1) + 1 from public.pw_modules where project_id = 'policy-gap-2-0'),
    true,
    true
  ),
  (
    'literature-watch',
    'industry-project',
    'literature-watch',
    'Literature watch',
    'New peer-reviewed publications on industrial decarbonisation — steel, ' ||
    'cement, hydrogen, CBAM, CCS/CCU — screened every morning from the ' ||
    'relevant journals and matched to this project.',
    (select coalesce(max(position), -1) + 1 from public.pw_modules where project_id = 'industry-project'),
    true,
    true
  )
on conflict (project_id, id) do nothing;
