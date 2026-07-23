-- ─────────────────────────────────────────────────────────────────────────────
-- Apply the corrections from the July-2026 fact-check of all post-report
-- ("afterReport") indicator points (docs-internal/
-- summer-prep-indicator-check-afterreport-factcheck-2026-07.md):
--
--  1. O1 total GHG 2024: 3222.1 → 3017.2 Mt CO₂eq. The live EU GHG inventory
--     (Eurostat env_air_gge, TOTX4_MEMO basis) shows a continued DECREASE in
--     2024; the stored value had the year-on-year direction inverted.
--  2. I2 steel 2025: 128.8 → 126.2 Mt. The stored value was a carry-forward
--     of 2024; worldsteel's Dec-2025 release puts EU-27 crude steel at
--     ≈126.2 Mt (−2.6 % y/y).
--  3. I2 cement 2025: removed. No 2025 production figure has been published
--     by Cembureau/Cement Europe (latest is 2024).
--  4. F5 cleantech investment: rescaled from GDP fractions (0.0007) to
--     percent numbers (0.07) to match the '% of GDP' unit — same
--     percent-encoding reconciliation as migrations 058/075/076, which
--     missed this series.
--  5. Source labels: E4a/E4b post-2022 additions are SolarPower Europe /
--     WindEurope figures, F1's 2023 value is from the EC energy-subsidies
--     report, and F2 (share) 2023+ values are the EEA green-bonds indicator —
--     labels now say so instead of claiming Eurostat/FFST/BloombergNEF alone.
--
-- Idempotent: explicit target values via ON CONFLICT DO UPDATE / plain
-- UPDATE / guarded DELETE.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.pw_indicator_points (indicator_id, year, value)
values
  ('esabcc-o1-ghg-total', 2024, 3017.2),
  ('esabcc-i2-steel-production', 2025, 126.2),
  ('esabcc-f-cleantech-investment', 2018, 0.02),
  ('esabcc-f-cleantech-investment', 2019, 0.03),
  ('esabcc-f-cleantech-investment', 2020, 0.03),
  ('esabcc-f-cleantech-investment', 2021, 0.07),
  ('esabcc-f-cleantech-investment', 2022, 0.06),
  ('esabcc-f-cleantech-investment', 2023, 0.07),
  ('esabcc-f-cleantech-investment', 2024, 0.05),
  ('esabcc-f-cleantech-investment', 2025, 0.04)
on conflict (indicator_id, year) do update set value = excluded.value;

delete from public.pw_indicator_points
where indicator_id = 'esabcc-i2-cement-production' and year = 2025;

update public.pw_indicators
set source = 'Eurostat (nrg_inf_epcrw); 2023+ SolarPower Europe, EU Market Outlook'
where id = 'esabcc-e4a-solar-pv-add';

update public.pw_indicators
set source = 'Eurostat (nrg_inf_epcrw); 2023+ WindEurope annual statistics'
where id = 'esabcc-e4b-wind-add';

update public.pw_indicators
set source = 'Fossil Fuel Subsidy Tracker; 2023: EC Report on Energy Subsidies in the EU (COM(2025)17)'
where id = 'esabcc-f-fossil-subsidies';

update public.pw_indicators
set source = 'BloombergNEF; 2023+ EEA "Green bonds in Europe" (LSEG/Refinitiv)'
where id = 'esabcc-f-green-bonds-share';
