-- ─────────────────────────────────────────────────────────────────────────────
-- I2 (chemicals, steel trade): PRODCOM/Comext refresh + the Figure 24 year fix
--
-- Companion to the 30 July 2026 source pass. Two separate things happen here.
--
-- 1. NEW DATA. PRODCOM is reachable after all — not on the main dissemination
--    host, but on the parallel Comext stack at /eurostat/api/comext/ — so the
--    three I2 (chemicals) series and the I2 (steel) trade balance are no longer
--    frozen at their report values. They are now computed the way the report
--    computed them, from the report's own seven products (ds-059358/ds-059367)
--    and from CPA 2410 extra-EU trade (ds-059366, successor to DS-059268).
--
-- 2. A YEAR-LABEL CORRECTION, which is why the chemicals rows are DELETED
--    before being re-inserted rather than upserted. The report's Figure 24
--    labels its base-organic-chemicals panel 2005-2021. PRODCOM puts the
--    identical values — matching to 12 significant digits across eleven of the
--    seventeen years — at 2006-2022. Three independent checks say PRODCOM's
--    labels are the right ones:
--      • the 2009 financial-crisis trough sits at PRODCOM 2009 and at report
--        "2008" (EU petrochemical output fell in 2009, not 2008);
--      • the same report's Figure 26 sheet, built from the sibling PRODCOM
--        total-production dataset, aligns with PRODCOM exactly (2013 ethylene
--        16.096 Mt, propylene 12.936 Mt in both);
--      • the report's steel panel, taken from the same figure, aligns exactly
--        too (its trade balance reproduces to 5e-5) — so this is one shifted
--        panel, not a systematic offset.
--    An upsert would leave the stale 2005 row behind and shift every value
--    onto the wrong year, so the three series are rewritten whole.
--
-- Idempotent: re-running deletes and re-inserts the same rows.
-- ─────────────────────────────────────────────────────────────────────────────

delete from public.pw_indicator_points
 where indicator_id in (
   'esabcc-i2-chemicals-production',
   'esabcc-i2-chemicals-use',
   'esabcc-i2-chemicals-trade-balance'
 );

insert into public.pw_indicator_points (indicator_id, year, value)
values
  ('esabcc-i2-chemicals-production', 2006, 33.52),
  ('esabcc-i2-chemicals-production', 2007, 36.25),
  ('esabcc-i2-chemicals-production', 2008, 31.12),
  ('esabcc-i2-chemicals-production', 2009, 28.08),
  ('esabcc-i2-chemicals-production', 2010, 30.66),
  ('esabcc-i2-chemicals-production', 2011, 32.08),
  ('esabcc-i2-chemicals-production', 2012, 31.2),
  ('esabcc-i2-chemicals-production', 2013, 29.59),
  ('esabcc-i2-chemicals-production', 2014, 30.58),
  ('esabcc-i2-chemicals-production', 2015, 30.13),
  ('esabcc-i2-chemicals-production', 2016, 30.14),
  ('esabcc-i2-chemicals-production', 2017, 31.96),
  ('esabcc-i2-chemicals-production', 2018, 29.64),
  ('esabcc-i2-chemicals-production', 2019, 28.35),
  ('esabcc-i2-chemicals-production', 2020, 28.01),
  ('esabcc-i2-chemicals-production', 2021, 28.72),
  ('esabcc-i2-chemicals-production', 2022, 26.84),
  ('esabcc-i2-chemicals-production', 2023, 23.07),
  ('esabcc-i2-chemicals-production', 2024, 24.75),
  ('esabcc-i2-chemicals-production', 2025, 21.59),
  ('esabcc-i2-chemicals-use', 2006, 35.99),
  ('esabcc-i2-chemicals-use', 2007, 39.39),
  ('esabcc-i2-chemicals-use', 2008, 33.35),
  ('esabcc-i2-chemicals-use', 2009, 29.56),
  ('esabcc-i2-chemicals-use', 2010, 32.74),
  ('esabcc-i2-chemicals-use', 2011, 33.95),
  ('esabcc-i2-chemicals-use', 2012, 32.58),
  ('esabcc-i2-chemicals-use', 2013, 30.98),
  ('esabcc-i2-chemicals-use', 2014, 31.76),
  ('esabcc-i2-chemicals-use', 2015, 31.54),
  ('esabcc-i2-chemicals-use', 2016, 31.7),
  ('esabcc-i2-chemicals-use', 2017, 33.75),
  ('esabcc-i2-chemicals-use', 2018, 31.72),
  ('esabcc-i2-chemicals-use', 2019, 31.19),
  ('esabcc-i2-chemicals-use', 2020, 30.39),
  ('esabcc-i2-chemicals-use', 2021, 31.34),
  ('esabcc-i2-chemicals-use', 2022, 29.11),
  ('esabcc-i2-chemicals-use', 2023, 24.31),
  ('esabcc-i2-chemicals-use', 2024, 26.2),
  ('esabcc-i2-chemicals-use', 2025, 22.95),
  ('esabcc-i2-chemicals-trade-balance', 2006, -2.474),
  ('esabcc-i2-chemicals-trade-balance', 2007, -3.144),
  ('esabcc-i2-chemicals-trade-balance', 2008, -2.234),
  ('esabcc-i2-chemicals-trade-balance', 2009, -1.479),
  ('esabcc-i2-chemicals-trade-balance', 2010, -2.081),
  ('esabcc-i2-chemicals-trade-balance', 2011, -1.874),
  ('esabcc-i2-chemicals-trade-balance', 2012, -1.382),
  ('esabcc-i2-chemicals-trade-balance', 2013, -1.396),
  ('esabcc-i2-chemicals-trade-balance', 2014, -1.183),
  ('esabcc-i2-chemicals-trade-balance', 2015, -1.406),
  ('esabcc-i2-chemicals-trade-balance', 2016, -1.56),
  ('esabcc-i2-chemicals-trade-balance', 2017, -1.791),
  ('esabcc-i2-chemicals-trade-balance', 2018, -2.084),
  ('esabcc-i2-chemicals-trade-balance', 2019, -2.838),
  ('esabcc-i2-chemicals-trade-balance', 2020, -2.38),
  ('esabcc-i2-chemicals-trade-balance', 2021, -2.619),
  ('esabcc-i2-chemicals-trade-balance', 2022, -2.268),
  ('esabcc-i2-chemicals-trade-balance', 2023, -1.239),
  ('esabcc-i2-chemicals-trade-balance', 2024, -1.457),
  ('esabcc-i2-chemicals-trade-balance', 2025, -1.357),
  ('esabcc-i2-steel-trade-balance', 2008, -19.02),
  ('esabcc-i2-steel-trade-balance', 2009, 0.1428),
  ('esabcc-i2-steel-trade-balance', 2010, -2.915),
  ('esabcc-i2-steel-trade-balance', 2011, -8.426),
  ('esabcc-i2-steel-trade-balance', 2012, 3.113),
  ('esabcc-i2-steel-trade-balance', 2013, -3.513),
  ('esabcc-i2-steel-trade-balance', 2014, -5.43),
  ('esabcc-i2-steel-trade-balance', 2015, -14.21),
  ('esabcc-i2-steel-trade-balance', 2016, -16.22),
  ('esabcc-i2-steel-trade-balance', 2017, -16.43),
  ('esabcc-i2-steel-trade-balance', 2018, -23.3),
  ('esabcc-i2-steel-trade-balance', 2019, -18.51),
  ('esabcc-i2-steel-trade-balance', 2020, -15.18),
  ('esabcc-i2-steel-trade-balance', 2021, -25.77),
  ('esabcc-i2-steel-trade-balance', 2022, -26.955),
  ('esabcc-i2-steel-trade-balance', 2023, -23.706),
  ('esabcc-i2-steel-trade-balance', 2024, -23.78),
  ('esabcc-i2-steel-trade-balance', 2025, -30.891)
on conflict (indicator_id, year) do update set value = excluded.value;
