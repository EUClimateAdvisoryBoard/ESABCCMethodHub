-- ─────────────────────────────────────────────────────────────────────────────
-- Reconcile percent-encoding for the six ESABCC '%' indicators that are
-- flagged `duplicateOf` an ECNO indicator carrying the SAME concept and unit
-- as a percent-number (e.g. fossil power share = 42.0, not 0.42).
--
-- The report's underlying-data workbook stores these shares as fractions
-- (0-1); the app renders `value + unit` with no ×100, so they displayed 100×
-- too small and at 100× the scale of their ECNO twin. This migration rescales
-- the five that exist in pw_indicator_points (B3 residential is TS-only and
-- re-seeded ×100 from src/data/esabcc-indicators.ts by the app seeder).
-- Indicators WITHOUT an ECNO twin keep the report's fraction convention.
-- See docs/Indicator-Database-Fact-Check.pdf.
--
-- Idempotent: explicit target values via ON CONFLICT DO UPDATE, so re-running
-- sets the same numbers (NOT an in-place ×N multiply).
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.pw_indicator_points (indicator_id, year, value)
values
  ('esabcc-e2-fossil-power-share', 2005, 51.826),
  ('esabcc-e2-fossil-power-share', 2006, 51.9),
  ('esabcc-e2-fossil-power-share', 2007, 52.603),
  ('esabcc-e2-fossil-power-share', 2008, 50.919),
  ('esabcc-e2-fossil-power-share', 2009, 49.325),
  ('esabcc-e2-fossil-power-share', 2010, 47.849),
  ('esabcc-e2-fossil-power-share', 2011, 48.006),
  ('esabcc-e2-fossil-power-share', 2012, 45.93),
  ('esabcc-e2-fossil-power-share', 2013, 43.067),
  ('esabcc-e2-fossil-power-share', 2014, 40.554),
  ('esabcc-e2-fossil-power-share', 2015, 41.736),
  ('esabcc-e2-fossil-power-share', 2016, 42.24),
  ('esabcc-e2-fossil-power-share', 2017, 43.005),
  ('esabcc-e2-fossil-power-share', 2018, 40.427),
  ('esabcc-e2-fossil-power-share', 2019, 38.312),
  ('esabcc-e2-fossil-power-share', 2020, 35.629),
  ('esabcc-e2-fossil-power-share', 2021, 36.183),
  ('esabcc-e2-fossil-power-share', 2022, 38.757),
  ('esabcc-e5-electrification', 2005, 21.226),
  ('esabcc-e5-electrification', 2006, 21.61),
  ('esabcc-e5-electrification', 2007, 22.198),
  ('esabcc-e5-electrification', 2008, 22.104),
  ('esabcc-e5-electrification', 2009, 22),
  ('esabcc-e5-electrification', 2010, 22.181),
  ('esabcc-e5-electrification', 2011, 22.794),
  ('esabcc-e5-electrification', 2012, 22.889),
  ('esabcc-e5-electrification', 2013, 22.722),
  ('esabcc-e5-electrification', 2014, 23.275),
  ('esabcc-e5-electrification', 2015, 23.175),
  ('esabcc-e5-electrification', 2016, 23.008),
  ('esabcc-e5-electrification', 2017, 22.915),
  ('esabcc-e5-electrification', 2018, 22.868),
  ('esabcc-e5-electrification', 2019, 22.735),
  ('esabcc-e5-electrification', 2020, 23.163),
  ('esabcc-e5-electrification', 2021, 22.754),
  ('esabcc-i6-industry-electrification', 2005, 31.714),
  ('esabcc-i6-industry-electrification', 2006, 32.348),
  ('esabcc-i6-industry-electrification', 2007, 32.215),
  ('esabcc-i6-industry-electrification', 2008, 32.54),
  ('esabcc-i6-industry-electrification', 2009, 32.42),
  ('esabcc-i6-industry-electrification', 2010, 32.635),
  ('esabcc-i6-industry-electrification', 2011, 32.963),
  ('esabcc-i6-industry-electrification', 2012, 33.012),
  ('esabcc-i6-industry-electrification', 2013, 32.918),
  ('esabcc-i6-industry-electrification', 2014, 33.541),
  ('esabcc-i6-industry-electrification', 2015, 33.652),
  ('esabcc-i6-industry-electrification', 2016, 33.481),
  ('esabcc-i6-industry-electrification', 2017, 33.756),
  ('esabcc-i6-industry-electrification', 2018, 33.527),
  ('esabcc-i6-industry-electrification', 2019, 33.537),
  ('esabcc-i6-industry-electrification', 2020, 32.928),
  ('esabcc-i6-industry-electrification', 2021, 33.215),
  ('esabcc-i6-industry-electrification', 2022, 33.3),
  ('esabcc-i6-industry-electrification', 2023, 32.6),
  ('esabcc-t3a-road-share-passenger', 2005, 81.277),
  ('esabcc-t3a-road-share-passenger', 2006, 81.229),
  ('esabcc-t3a-road-share-passenger', 2007, 81.127),
  ('esabcc-t3a-road-share-passenger', 2008, 80.823),
  ('esabcc-t3a-road-share-passenger', 2009, 81.627),
  ('esabcc-t3a-road-share-passenger', 2010, 81.616),
  ('esabcc-t3a-road-share-passenger', 2011, 81.355),
  ('esabcc-t3a-road-share-passenger', 2012, 81.17),
  ('esabcc-t3a-road-share-passenger', 2013, 81.337),
  ('esabcc-t3a-road-share-passenger', 2014, 81.544),
  ('esabcc-t3a-road-share-passenger', 2015, 81.537),
  ('esabcc-t3a-road-share-passenger', 2016, 81.647),
  ('esabcc-t3a-road-share-passenger', 2017, 81.826),
  ('esabcc-t3a-road-share-passenger', 2018, 81.687),
  ('esabcc-t3a-road-share-passenger', 2019, 81.588),
  ('esabcc-t3a-road-share-passenger', 2020, 86.5),
  ('esabcc-t5a-zev-share-newcars', 2010, 0.01),
  ('esabcc-t5a-zev-share-newcars', 2011, 0.07),
  ('esabcc-t5a-zev-share-newcars', 2012, 0.13),
  ('esabcc-t5a-zev-share-newcars', 2013, 0.22),
  ('esabcc-t5a-zev-share-newcars', 2014, 0.33),
  ('esabcc-t5a-zev-share-newcars', 2015, 0.46),
  ('esabcc-t5a-zev-share-newcars', 2016, 0.47),
  ('esabcc-t5a-zev-share-newcars', 2017, 0.68),
  ('esabcc-t5a-zev-share-newcars', 2018, 1.06),
  ('esabcc-t5a-zev-share-newcars', 2019, 1.9),
  ('esabcc-t5a-zev-share-newcars', 2020, 5.39),
  ('esabcc-t5a-zev-share-newcars', 2021, 8.87),
  ('esabcc-t5a-zev-share-newcars', 2022, 13.41),
  ('esabcc-t5a-zev-share-newcars', 2023, 14.6),
  ('esabcc-t5a-zev-share-newcars', 2024, 13.6)
on conflict (indicator_id, year) do update set value = excluded.value;

-- B3 residential renovation-rate 2030 target: 0.018 → 1.8 (TS-only indicator;
-- this UPDATE is a no-op unless the app has already seeded the pw_indicators row).
update public.pw_indicators set target_value = 1.8
  where id = 'esabcc-b3-residential-renovation-rate' and target_value = 0.018;
