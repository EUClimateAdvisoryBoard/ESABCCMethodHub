-- ─────────────────────────────────────────────────────────────────────────────
-- Industry Project — the Policy Gap toolset, scoped to industry.
--
-- This migration:
--   • adds a free-form `tags` array to pw_recommendations (workspace sector
--     tags, layered on top of the source-report label),
--   • backfills the `industry` tag onto the Policy Gap recommendations that
--     drive industrial decarbonisation (Industry chapter + cross-chapter ETS /
--     CBAM / hydrogen / CCU-CCS / clean-tech / circularity advice), and
--   • seeds the Industry Project's four modules (indicators, recommendations,
--     member-states, policy-analysis). The project row itself is created in
--     038_project_workspace.sql.
--
-- Idempotent: re-running it will not duplicate rows or overwrite manual tags.
-- See src/data/esabcc-recommendations.ts (RECOMMENDATION_TAGS) and
-- src/data/industry-indicators.ts for the canonical seed definitions.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.pw_recommendations
  add column if not exists tags text[] not null default '{}';

-- Backfill the industry sector tags on the existing Policy Gap seed rows. Only
-- touches rows that have no tags yet, so manual retagging is preserved.
update public.pw_recommendations
  set tags = array['industry']
  where project_id = 'policy-gap-2-0'
    and tags = '{}'
    and id in (
      'kr12-energy-material-demand-reduction',
      'i1-circular-economy-ceap2',
      'i3-low-emission-industrial-tech'
    );

update public.pw_recommendations
  set tags = array['industry','energy-supply']
  where project_id = 'policy-gap-2-0'
    and tags = '{}'
    and id in (
      'kr3-renewables-investment-outlook',
      'kr10-target-ccs-hydrogen-bioenergy',
      'e6-hydrogen-targeting',
      'e7-ccus-targeting',
      'e8-rd-allocation-review'
    );

update public.pw_recommendations
  set tags = array['industry','carbon-pricing']
  where project_id = 'policy-gap-2-0'
    and tags = '{}'
    and id in (
      'kr7-ets-fit-for-net-zero',
      'i2-carbon-leakage-alternatives',
      'c2-free-allocation-alternatives',
      'c6-expand-climate-revenue'
    );

-- Seed the Industry Project's modules. The indicator and recommendation seed
-- rows themselves are inserted lazily on first render (see db.ts
-- ensureSeedDataFor → 'industry-project'); this just makes the tabs appear.
insert into public.pw_modules (id, project_id, kind, name, description, position, is_seed) values
  ('indicators',      'industry-project', 'indicators',
     'Indicator database',
     'Industry-focused indicators: industrial GHG emissions, energy intensity and electrification, electrolyser capacity, circular material use, the ETS carbon price and free allocation, and clean-tech investment.',
     0, true),
  ('recommendations', 'industry-project', 'recommendations',
     'Recommendations tracker',
     'ESABCC recommendations tagged "industry" — the Industry chapter (I1–I3) plus the cross-chapter advice driving industrial decarbonisation (ETS/CBAM, hydrogen, CCU/CCS, clean-tech, circularity).',
     1, true),
  ('member-states',   'industry-project', 'member-states',
     'Member state space',
     'EEA-style member-state view framed around industrial transition, with the shared per-country profiles.',
     2, true),
  ('policy-analysis', 'industry-project', 'policy-analysis',
     'Policy analysis',
     'Sectoral policy review pre-filtered to industry-tagged policies (ETS, ETS2, CBAM, IED, Net-Zero Industry Act, CRMA, Ecodesign, batteries, REACH, F-gas).',
     3, true)
on conflict (project_id, id) do nothing;

-- Refresh the project description now that its scope is defined.
update public.pw_projects
  set description = 'Analytical workspace dedicated to industrial decarbonisation — the same four tools as Policy Gap 2.0, scoped to industry: industry indicators, the industry-tagged recommendations, industry-tagged policies and a member-state space framed around industrial transition.'
  where id = 'industry-project'
    and description = 'Analytical workspace dedicated to industrial decarbonisation. Modules to be added as the project scope is defined.';
