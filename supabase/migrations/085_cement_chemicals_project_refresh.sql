-- ─────────────────────────────────────────────────────────────────────────────
-- I2 (cement, use), I7b, I7c: closing the "no public data export" bucket.
--
-- These three were the last indicators held back on the grounds that their
-- publisher offers no file and no API, so the numbers would have to be read by
-- hand each cycle. All three turned out to be machine-readable without a
-- browser (3 August 2026):
--
--   I2 (cement, use)  Cement Europe (formerly Cembureau) inlines the chart
--                     "Cement Production And Consumption EU 27 & Cement Europe
--                     2000-2024" as a Chart.js dataset in the Key Facts &
--                     Figures page. Its CONSUMPTION EU27 series reproduces
--                     every year the report carries to the tonne (2005 =
--                     232,290,000 t against the report's 232.3 Mt; 2013 =
--                     142.2; 2020 = 159.2; 2021 = 170.5) and continues
--                     2022 = 163.8, 2023 = 150.8, 2024 = 148.1 Mt. The 2024
--                     figure is independently stated in prose in Cement
--                     Europe's 2025 Activity Report ("cement consumption
--                     declined to … 148.1 million tonnes in the EU27").
--
--   I7b               The innovation-projects map moved to
--                     cementeurope.eu/innovation-projects/ and carries its whole
--                     project database inline as a `var markers` array:
--                     124 projects in 21 countries, of which 114 EU-27.
--
--   I7c               Cefic's low-carbon technologies map renders from a public
--                     WordPress REST collection (/wp-json/wp/v2/gips):
--                     238 projects across 19 countries, of which 215 carry at
--                     least one EU-27 country tag.
--
-- CAVEAT, carried in the indicator descriptions rather than here: the two
-- project counts are SNAPSHOTS of each map on the day it was read, not rebuilt
-- series. Neither map dates a project by its announcement — the cement map's
-- only year is the plant's Operational Date, and Cefic's is the website posting
-- date, which clusters in the twice-yearly batches the map is republished in.
-- The report's 62-in-2023 and 171-in-2023 therefore cannot be reproduced from
-- the current maps, and the step from those values to 114/215 is part real
-- growth and part re-curation.
--
-- Recipes: scripts/esabcc-indicators/refresh-from-sources.mjs (kinds
-- 'chartjs-series', 'map-marker-count', 'cefic-project-count').
-- Working note: docs-internal/indicator-check-nopublicapi-close-2026-08-03.md.
--
-- Idempotent: upserts on (indicator_id, year).
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.pw_indicator_points (indicator_id, year, value) values
  ('esabcc-i2-cement-use',           2022, 163.8),
  ('esabcc-i2-cement-use',           2023, 150.8),
  ('esabcc-i2-cement-use',           2024, 148.1),
  ('esabcc-i7b-cement-projects',     2026, 114),
  ('esabcc-i7c-chemicals-projects',  2026, 215)
on conflict (indicator_id, year) do update set value = excluded.value;

-- Source lines, so the workspace's own indicator table names the publisher the
-- values now come from rather than the "data provided on request" route.
update public.pw_indicators
   set source = 'Cement Europe (formerly Cembureau), Key Facts & Figures — CONSUMPTION EU27',
       source_url = 'https://www.cementeurope.eu/about-us/key-facts-figures/'
 where id = 'esabcc-i2-cement-use';

update public.pw_indicators
   set source = 'Cement Europe (formerly Cembureau) map of innovation projects',
       source_url = 'https://www.cementeurope.eu/innovation-projects/'
 where id = 'esabcc-i7b-cement-projects';

update public.pw_indicators
   set source = 'Cefic Low-Carbon Technologies Projects Map (/wp-json/wp/v2/gips)',
       source_url = 'https://cefic.org/solutions-explained/low-carbon-technologies-projects/'
 where id = 'esabcc-i7c-chemicals-projects';
