-- ─────────────────────────────────────────────────────────────────────────────
-- Align post-report ("afterReport") points with the 2024 report's EXACT
-- derivations, reverse-engineered from the report workbook
-- (ESABCC_report_Towards EU climate neutrality_underlying data.xlsx) and
-- recomputed from the live EU GHG inventory (Eurostat env_air_gge,
-- 2026-07 vintage). Replaces the refresh script's YoY-splice values, whose
-- drift the July-2026 fact-check flagged.
--
--  O1 (Figure 4, "Total (ECL scope)"): net total incl LULUCF (TOTXMEMO)
--     + intl aviation (CRF1D1A) + intl navigation (CRF1D1B). This combo
--     reproduces the report 2005–2022 within 0.1–1.5% every year (the gross
--     TOTX4_MEMO basis used by migration 077 is 3–4% off pre-2017).
--     2023 = 2872.8+122.8+122.4 = 3118.0 ; 2024 = 2786.2+130.0+127.0 = 3043.2.
--  T1 (Figure 32/34): CRF1A3 (domestic transport) + CRF1D1A (intl aviation),
--     NO maritime — reproduces the report within 0.1–0.3% (2005/2010/2016).
--     2023 = 795.6+122.8 = 918.4 ; 2024 = 804.8+130.0 = 934.7.
--  L7 (Figure 71): cropland+grassland+wetlands+settlements&other land
--     (CRF4B+4C+4D+4E+4F) — NOT "CRF4 minus forest", which would wrongly
--     include harvested wood products. Current-vintage values:
--     2022 = 121.0 ; 2023 = 135.6 ; 2024 = 123.0.
--  E6 (Figure 19): derivation = CRF1 CH₄; the report's CO₂e convention runs
--     a constant ~9% above env_air_gge CH4_CO2E (2005–2016 ratio 0.909–0.919),
--     so the existing spliced points correctly continue the report convention
--     — values unchanged, description updated in the TS seed.
--  A4 herd sizes (Figure 59): the workbook's own source column says
--     "EU GHG inventories (CRF tables)" — CRF livestock populations, a basis
--     ~21% (bovine) / ~4% (pig) below the Eurostat Dec survey counts. The
--     spliced values correctly continue that basis; only the source labels
--     were wrong ("Eurostat/FAOSTAT food balances + livestock surveys").
--
-- Idempotent: explicit target values via ON CONFLICT DO UPDATE / UPDATE.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.pw_indicator_points (indicator_id, year, value)
values
  ('esabcc-o1-ghg-total', 2023, 3118.0),
  ('esabcc-o1-ghg-total', 2024, 3043.2),
  ('esabcc-t1-transport-ghg', 2023, 918.4),
  ('esabcc-t1-transport-ghg', 2024, 934.7),
  ('esabcc-l7-nonforest-lulucf', 2022, 121.0),
  ('esabcc-l7-nonforest-lulucf', 2023, 135.6),
  ('esabcc-l7-nonforest-lulucf', 2024, 123.0)
on conflict (indicator_id, year) do update set value = excluded.value;

update public.pw_indicators
set source = 'EU GHG inventory (CRF) livestock populations; 2021+ Eurostat survey trend'
where id in ('esabcc-a4-bovine-herd-size',
             'esabcc-a4-dairy-herd-size',
             'esabcc-a4-pig-herd-size');
