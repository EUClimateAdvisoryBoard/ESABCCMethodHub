-- ─────────────────────────────────────────────────────────────────────────────
-- Traceability audit (2026-07-28): sync pw_indicator_points with the corrected
-- values now written to src/data/esabcc-indicators.ts. O1 and L7 already
-- match migration 078's values (the refresh-from-sources.mjs recipes for
-- those two were reconciled back onto the same report-exact basis) so they
-- are not touched again here; everything below is a genuinely new
-- correction from this audit that migration 078 did not cover.
--
--  O3 gross-inland: the stored afterReport figures matched nrg_bal_c's GAE
--     ("Gross available energy") aggregate, not GIC ("Gross inland
--     consumption") — the report's own basis. 2022/2023 corrected, 2024
--     added (previously missing).
--  B2 buildings FEC: the afterReport points dropped the agriculture &
--     forestry leg (FC_OTH_AF_E) from the report's own 3-term formula
--     (households + commercial&public + agriculture&forestry), manufacturing
--     a fake ~7% post-report drop. Both points corrected to the full sum.
--  I5 industry FEC: minor (<0.5%) Eurostat vintage-drift correction.
--  T2a passenger demand: 2022 point refreshed to the current Pocketbook 2025
--     edition (previous figure was from an earlier edition).
--  T3a road share: the recipe's vehicle=CAR_BUS_TOT code no longer exists in
--     tran_hv_psmod (0 values, HTTP 200 — silently reported success before
--     the global empty-fetch guard); recipe now sums CAR+BUS_TOT and these
--     4 points are its first successful output.
--  T5b zero-emission lorries: vehicle=LOR_HVY does not exist in
--     road_eqs_lormot (same silent-empty bug); recipe now uses LOR_GT3P5 in
--     splice mode (a real scope gap vs the report baseline, trend-only).
--     These points did not exist before (recipe previously never wrote any).
--  E4a/E4b capacity additions: the hand-pasted 2023-2025 points were not
--     traceable to the Eurostat sourceUrl on file; 2025 in particular had no
--     underlying Eurostat data at all. Recipes now derive additions as the
--     YoY delta of Eurostat's net-capacity stock (nrg_inf_epcrw): 2022 added,
--     2023/2024 corrected, 2025 removed (no Eurostat data exists for it).
--
-- Idempotent: explicit target values via ON CONFLICT DO UPDATE / guarded
-- DELETE, matching the pattern in migrations 077/078.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.pw_indicator_points (indicator_id, year, value)
values
  ('esabcc-o3-gross-inland', 2022, 15751.6),
  ('esabcc-o3-gross-inland', 2023, 15111.2),
  ('esabcc-o3-gross-inland', 2024, 15023.9),

  ('esabcc-b2-buildings-fec', 2022, 4524.2),
  ('esabcc-b2-buildings-fec', 2023, 4324.2),

  ('esabcc-i5-industry-fec', 2022, 2638.9),
  ('esabcc-i5-industry-fec', 2023, 2501.3),

  ('esabcc-t2a-passenger-demand', 2022, 5625.2),

  ('esabcc-t3a-road-share-passenger', 2021, 86.23),
  ('esabcc-t3a-road-share-passenger', 2022, 84.12),
  ('esabcc-t3a-road-share-passenger', 2023, 83.67),
  ('esabcc-t3a-road-share-passenger', 2024, 83.3),

  ('esabcc-t5b-zev-lorries-stock', 2023, 6513),
  ('esabcc-t5b-zev-lorries-stock', 2024, 9831),

  ('esabcc-e4a-solar-pv-add', 2022, 33.34),
  ('esabcc-e4a-solar-pv-add', 2023, 51.63),
  ('esabcc-e4a-solar-pv-add', 2024, 60.96),

  ('esabcc-e4b-wind-add', 2022, 15.88),
  ('esabcc-e4b-wind-add', 2023, 12.12),
  ('esabcc-e4b-wind-add', 2024, 15.32)
on conflict (indicator_id, year) do update set value = excluded.value;

-- No Eurostat nrg_inf_epcrw data exists for 2025 (latest year available is
-- 2024); these hand-pasted forecast/estimate points are unsupported and must
-- not persist in the DB copy either.
delete from public.pw_indicator_points
where indicator_id in ('esabcc-e4a-solar-pv-add', 'esabcc-e4b-wind-add')
  and year = 2025;

update public.pw_indicators
set source = 'Eurostat (nrg_inf_epcrw)',
    source_url = 'https://doi.org/10.2908/NRG_INF_EPCRW'
where id in ('esabcc-e4a-solar-pv-add', 'esabcc-e4b-wind-add');
