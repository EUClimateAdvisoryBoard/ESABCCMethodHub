# Post-report indicator values — fact-check on the corrected basis (27 July 2026)

*Every `afterReport` value re-checked against a fresh pull from its primary source:*
*150 points across 52 series, 0 live queries, 2026-07-27.*

This supersedes the value fact-check of 22 July 2026
(`summer-prep-indicator-check-afterreport-factcheck-2026-07.md`) for the points it covers.
What changed in between is the basis, not the numbers:

- **O1, T1, L7, L8** are now evaluated on the report's own exact derivations
  (migration 078) instead of the refresh script's year-on-year splice — the splice is
  what made those four drift, as 078 itself noted.
- **O2 (PEC/FEC), E2 (RES), E5, I6** could not be checked at all before: their Eurostat
  queries had gone stale (the EED headline codes were renamed, solar `RA400` was split
  into `RA410`/`RA420`, and `nrg_bal_s` stopped serving the electrification shares as
  ready-made percentages). All three returned 200-with-no-values, so the refresh
  reported "up-to-date" while the series stood still.
- **The share indicators** are compared on the percent-number scale the series is stored
  in, rather than the fraction their seeded calc grid computed.

## Verdict key

| Verdict | Meaning |
| --- | --- |
| CONFIRMED | reproduces from the live primary source (≤ 2 %) |
| REVISION | 2–5 % off — consistent with routine publisher back-revision |
| WRONG | > 5 % off — does not reproduce; needs a decision |
| NO SOURCE YEAR | the source carries no figure for that year yet |
| NOT CHECKABLE | no machine-readable source recipe — the stored figure is a published number, named but not re-derived |

## Headline

**114 of 150 points reproduce from their primary source within 2 %**
— 3 in the revision band, 0 that do not reproduce, and
33 published figures with no machine-readable recipe to check them against.

**How much that proves depends on the recipe.** Read the "Checks" column:

- **level** (57 points) — the source's own figure, converted into the indicator's
  unit, against the stored one. This is a real independent check of the number.
- **trend** (60 points) — the recipe is a splice: the source's year-on-year change
  applied to the report's own last figure. It catches a revision in the source's movement,
  but the level is anchored on the report by construction, so it cannot confirm the level.
  For those series the anchor table below is the thing to read.

## Points that do not reproduce

| Code | Year | Stored | From source | Δ | Verdict | Checks | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E2 (RES) | 2024 | 41.38 | 43.21 | 4.4 % | REVISION | trend | live recipe · splice |
| I6 | 2023 | 32.6 | 33.59 | 3.0 % | REVISION | trend | live recipe · splice |
| I2 (steel, production) | 2025 | 126.2 | 128.8 | 2.1 % | REVISION | trend | live recipe · splice |

## Anchor checks

The same recipe evaluated at the report's own last year, against the report's own figure.
A ratio far from 1.00 means the source is on a different level than the report — for a
spliced series that is expected and harmless (only the trend is used), but it means the
source cannot be quoted as the level.

| Code | Anchor year | Report figure | Source at that year | Source ÷ report | Spliced? | Why the scales differ |
| --- | --- | --- | --- | --- | --- | --- |
| E3 | 2022 | 251 | 0.03 | 0× | yes | Spliced trend proxy for the EEA intensity indicator; hand-check against the EEA-published value when available. |
| E6 | 2021 | 69.91 | 2.255 | 0.032× | yes | Spliced: energy-sector CH₄ mass YoY change × report CO₂-eq baseline. |
| I3 | 2021 | 11.7 | 11.1 | 0.949× | no | Stored as percent-number — the TS series was rescaled ×100 (WP6 unit fix); the old ÷100 recipe failed its anchor check ever since. DB rows realigned by migration 075. |
| L1 | 2022 | -244 | -218 | 0.893× | no | Net sink is negative. Subject to inventory-vintage revision vs the report base year. |
| L6 | 2021 | 231.8 | -296.163 | -1.278× | yes | Spliced: report stores the sink as a positive magnitude (living biomass only) while CRF 4.A is negative net — the ratio preserves the report convention. |
| L7 | 2021 | 97.44 | 116.2 | 1.193× | no | Migration 078: the non-forest land categories, NOT "CRF 4 minus forest" — that would wrongly pull in harvested wood products. |
| I2 (steel, production) | 2021 | 152.8 | 100 | 0.654× | yes | Spliced: steel production-volume index YoY change × report 2021 baseline (152.8 Mt). |
| I2 (cement, production) | 2021 | 182.5 | 100 | 0.548× | yes | Spliced: cement-dominated NACE C235 production-volume index (cement-only C2351 has no EU27 series) YoY change × report 2021 baseline (182.5 Mt). |
| I2 (chemicals, production) | 2021 | 26.84 | 100 | 3.726× | yes | Spliced: basic-chemicals production-volume index YoY change × report 2021 baseline (26.84 Mt). |
| A2 (pig, GHG) | 2021 | 28.58 | 26.55 | 0.929× | yes | Spliced: on-farm swine GHG (CO₂-eq) YoY change × report baseline (anchor 2021 0.929×). Cattle cannot be split into bovine-meat vs dairy in the inventory. |
| A2 (pig, intensity) | 2020 | 1.264 | 0.118 | 0.093× | yes | Spliced ratio: swine GHG ÷ pig production; num/den unit mix cancels in the YoY ratio, only the trend is applied to the report intensity baseline (conceptual 2020 0.931×). |
| A4 (bovine, herd) | 2020 | 60.16 | 76.551 | 1.272× | yes | Spliced: A2000 total cattle includes dairy, report bovine-meat herd is a subset (anchor 1.272×); thousand head → million head. |
| B4 (population) | 2020 | 1.028 | 446437975 | 434278185.798× | yes | Spliced: absolute EU27 average population YoY change × the report’s population index baseline. |

## Series with a level step at the join

These recipes append the source's own level to the report's series. Across every report
year the source sits systematically away from the report's figure by the median below, so
the jump between the last report year and the first appended year is partly basis, not
movement. A reader reading the chart would take it for a trend. This is the one thing in
this pass that a "confirmed" verdict does NOT catch: each of these points reproduces its
source exactly — the source is simply not on the report's level.

| Code | Report years compared | Source ÷ report (median) | Range | What that means |
| --- | --- | --- | --- | --- |
| L1 | 18 | 1.069× | 0.893–1.121× | 7 % step at the 2022→2023 join |
| L7 | 17 | 1.137× | 0.992–1.315× | 14 % step at the 2021→2022 join |

Spliced series are not listed here: a splice re-anchors on the report figure, so its level
offset is cancelled by construction (the anchor table above records it for reference).

**L7 is the one to look at.** Migration 078 adopted CRF 4.B–4.F as "the report's own
basis" because it reproduces the 2022–2024 figures — but it reproduces them because it
produced them. Measured against the report's own 17 published years it runs 14 % high
(0.99–1.32×), so the 97.44 → 121.0 jump at 2021→2022 is mostly basis. Either the report's
Figure 71 has a narrower scope than 4.B–4.F, or these years should be spliced onto the
report level rather than appended at the source level. Worth settling against the report
workbook before the number is quoted.

**L1 is milder.** The 7 % median comes with a wide 0.89–1.12× spread across years, which
looks like ordinary inventory-vintage revision rather than a scope difference — the whole
LULUCF series is re-estimated with each submission. Still worth a line in any chart note.

## What to do about the three

None is a silent error; each is a decision for the sector lead. No stored value was
changed by this pass.

- **E2 (RES) 2024 — 41.38 stored, 43.21 from the source (4.4 %).** The renewables recipe
  changed under it: Eurostat split solar `RA400` into `RA410` (thermal) and `RA420` (PV),
  and the summed legs are fault-tolerant, so the old query quietly dropped whatever it
  could not resolve. The corrected leg set now includes both solar codes and tide. The
  2023 point still matches (1.0 %), so this is the 2024 point moving with the fuller leg
  set — re-run the refresh for this series to adopt it.
- **I6 2023 — 32.6 stored, 33.59 from the source (3.0 %).** The stored value came from
  `nrg_bal_s`, which no longer serves this share; the replacement computes it from the
  `nrg_bal_c` energy balance (industry electricity ÷ industry final energy). A 3 % gap
  between two definitions of the same share is a basis choice, not an error — decide
  which definition the indicator should carry, then refresh.
- **I2 steel 2025 — 126.2 stored, 128.8 from the source (2.1 %).** Both are carry-forwards.
  Eurostat's annual production-volume index for NACE C241 shows 2025 = 84.3, exactly
  equal to 2024 — while cement (C235) and chemicals (C201) both move over the same year.
  A flat repeat in one series and not its neighbours reads as an incomplete year, not a
  flat market. Treat steel 2025 as provisional or drop it until the index moves.

## All points

| Code | Year | Stored | From source | Δ | Verdict | Checks | Basis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| O1 | 2023 | 3118 | 3118 | 0.0 % | CONFIRMED | level | report-exact (078) · direct |
| O1 | 2024 | 3043.2 | 3043.2 | 0.0 % | CONFIRMED | level | report-exact (078) · direct |
| O2 (PEC) | 2022 | 14653.8 | 14644.7 | 0.1 % | CONFIRMED | level | live recipe · direct |
| O2 (PEC) | 2023 | 14083.9 | 14045.2 | 0.3 % | CONFIRMED | level | live recipe · direct |
| O2 (PEC) | 2024 | 13979.3 | 13883 | 0.7 % | CONFIRMED | level | live recipe · direct |
| O2 (FEC) | 2022 | 10711.2 | 10704.7 | 0.1 % | CONFIRMED | level | live recipe · direct |
| O2 (FEC) | 2023 | 10397.2 | 10388.7 | 0.1 % | CONFIRMED | level | live recipe · direct |
| O2 (FEC) | 2024 | 10467 | 10471.8 | 0.0 % | CONFIRMED | level | live recipe · direct |
| O3 | 2022 | 16241.1 | — | — | NOT CHECKABLE | — | — |
| O3 | 2023 | 15575.3 | — | — | NOT CHECKABLE | — | — |
| E1 | 2023 | 746.3 | 746.3 | 0.0 % | CONFIRMED | level | live recipe · direct |
| E1 | 2024 | 689.1 | 689.1 | 0.0 % | CONFIRMED | level | live recipe · direct |
| E2 (fossil) | 2023 | 31.42 | 31.42 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| E2 (fossil) | 2024 | 28.11 | 28.11 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| E2 (RES) | 2023 | 40.01 | 40.4 | 1.0 % | CONFIRMED | trend | live recipe · splice |
| E2 (RES) | 2024 | 41.38 | 43.21 | 4.4 % | REVISION | trend | live recipe · splice |
| E3 | 2023 | 208.7 | 208.7 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| E3 | 2024 | 187.4 | 187.4 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| E4a | 2023 | 56 | — | — | NOT CHECKABLE | — | — |
| E4a | 2024 | 65.5 | — | — | NOT CHECKABLE | — | — |
| E4a | 2025 | 65.1 | — | — | NOT CHECKABLE | — | — |
| E4b/c | 2023 | 16.2 | — | — | NOT CHECKABLE | — | — |
| E4b/c | 2024 | 12.9 | — | — | NOT CHECKABLE | — | — |
| E4b/c | 2025 | 15.1 | — | — | NOT CHECKABLE | — | — |
| E6 | 2022 | 64.46 | 64.46 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| E6 | 2023 | 60.05 | 60.05 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| E6 | 2024 | 57.77 | 57.77 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| I1 | 2023 | 622.1 | 622.1 | 0.0 % | CONFIRMED | level | live recipe · direct |
| I1 | 2024 | 611.4 | 611.4 | 0.0 % | CONFIRMED | level | live recipe · direct |
| I3 | 2022 | 11.4 | 11.4 | 0.0 % | CONFIRMED | level | live recipe · direct |
| I3 | 2023 | 12.1 | 12.1 | 0.0 % | CONFIRMED | level | live recipe · direct |
| I3 | 2024 | 12.2 | 12.2 | 0.0 % | CONFIRMED | level | live recipe · direct |
| I5 | 2022 | 2627.8 | — | — | NOT CHECKABLE | — | — |
| I5 | 2023 | 2497.2 | — | — | NOT CHECKABLE | — | — |
| I6 | 2022 | 33.3 | 33.62 | 1.0 % | CONFIRMED | trend | live recipe · splice |
| I6 | 2023 | 32.6 | 33.59 | 3.0 % | REVISION | trend | live recipe · splice |
| T1 | 2023 | 918.4 | 918.4 | 0.0 % | CONFIRMED | level | report-exact (078) · direct |
| T1 | 2024 | 934.7 | 934.7 | 0.0 % | CONFIRMED | level | report-exact (078) · direct |
| T2a | 2022 | 5617 | — | — | NOT CHECKABLE | — | — |
| T2a | 2023 | 5932 | — | — | NOT CHECKABLE | — | — |
| T2b | 2023 | 2319 | — | — | NOT CHECKABLE | — | — |
| T3b | 2022 | 512 | — | — | NOT CHECKABLE | — | — |
| T3b | 2023 | 582 | — | — | NOT CHECKABLE | — | — |
| T4 | 2023 | 106.4 | — | — | NOT CHECKABLE | — | — |
| T4 | 2024 | 106.8 | — | — | NOT CHECKABLE | — | — |
| T4 | 2025 | 96.7 | — | — | NOT CHECKABLE | — | — |
| T5a | 2023 | 14.6 | — | — | NOT CHECKABLE | — | — |
| T5a | 2024 | 13.6 | — | — | NOT CHECKABLE | — | — |
| T5a | 2025 | 17.4 | — | — | NOT CHECKABLE | — | — |
| T6a | 2022 | 93.41 | 93.41 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| T6a | 2023 | 92.91 | 92.91 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| T6a | 2024 | 93.17 | 93.17 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| B1 | 2023 | 437.3 | 437.3 | 0.0 % | CONFIRMED | level | live recipe · direct |
| B1 | 2024 | 430.7 | 430.7 | 0.0 % | CONFIRMED | level | live recipe · direct |
| B2 | 2022 | 4213.6 | — | — | NOT CHECKABLE | — | — |
| B2 | 2023 | 4037.9 | — | — | NOT CHECKABLE | — | — |
| B5a | 2023 | 42 | — | — | NOT CHECKABLE | — | — |
| B5b | 2023 | 32.2 | — | — | NOT CHECKABLE | — | — |
| B6 | 2023 | 23.96 | — | — | NOT CHECKABLE | — | — |
| B6 | 2024 | 25.5 | — | — | NOT CHECKABLE | — | — |
| A1 | 2023 | 359.9 | 359.9 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A1 | 2024 | 355.7 | 355.7 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| L1 | 2023 | -215.5 | -215.5 | 0.0 % | CONFIRMED | level | live recipe · direct |
| L1 | 2024 | -231 | -231 | 0.0 % | CONFIRMED | level | live recipe · direct |
| L6 | 2022 | 236.7 | 236.7 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| L6 | 2023 | 255.7 | 255.7 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| L6 | 2024 | 258.3 | 258.3 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| L7 | 2022 | 121 | 121 | 0.0 % | CONFIRMED | level | report-exact (078) · direct |
| L7 | 2023 | 135.6 | 135.6 | 0.0 % | CONFIRMED | level | report-exact (078) · direct |
| L7 | 2024 | 123 | 123 | 0.0 % | CONFIRMED | level | report-exact (078) · direct |
| L8 | 2022 | 1698 | 1698 | 0.0 % | CONFIRMED | level | report-exact (078) · direct |
| L8 | 2023 | 1664.9 | 1664.9 | 0.0 % | CONFIRMED | level | report-exact (078) · direct |
| L8 | 2024 | 1663.5 | 1663.5 | 0.0 % | CONFIRMED | level | report-exact (078) · direct |
| F1 | 2023 | 111 | — | — | NOT CHECKABLE | — | — |
| F2 (share) | 2023 | 5.3 | — | — | NOT CHECKABLE | — | — |
| F2 (share) | 2024 | 6.9 | — | — | NOT CHECKABLE | — | — |
| F3 | 2023 | 2.26 | 2.26 | 0.0 % | CONFIRMED | level | live recipe · direct |
| F3 | 2024 | 2.24 | 2.24 | 0.0 % | CONFIRMED | level | live recipe · direct |
| F5 | 2023 | 0.07 | — | — | NOT CHECKABLE | — | — |
| F5 | 2024 | 0.05 | — | — | NOT CHECKABLE | — | — |
| F5 | 2025 | 0.04 | — | — | NOT CHECKABLE | — | — |
| I2 (steel, production) | 2022 | 136.3 | 136.3 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| I2 (steel, production) | 2023 | 125.9 | 125.9 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| I2 (steel, production) | 2024 | 128.8 | 128.8 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| I2 (steel, production) | 2025 | 126.2 | 128.8 | 2.1 % | REVISION | trend | live recipe · splice |
| I2 (cement, production) | 2022 | 174.7 | 174.7 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| I2 (cement, production) | 2023 | 160.8 | 160.8 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| I2 (cement, production) | 2024 | 159.1 | 159.1 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| I2 (chemicals, production) | 2022 | 25.36 | 25.36 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| I2 (chemicals, production) | 2023 | 21.45 | 21.45 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| I2 (chemicals, production) | 2024 | 19.89 | 19.89 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| I2 (chemicals, production) | 2025 | 18.55 | 18.55 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A2 (bovine, production) | 2021 | 6.802 | 6.802 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A2 (bovine, production) | 2022 | 6.64 | 6.64 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A2 (bovine, production) | 2023 | 6.385 | 6.385 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A2 (bovine, production) | 2024 | 6.584 | 6.584 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A2 (bovine, production) | 2025 | 6.32 | 6.32 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A2 (dairy, production) | 2021 | 162.6 | 162.6 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A2 (dairy, production) | 2022 | 162.8 | 162.8 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A2 (dairy, production) | 2023 | 163.7 | 163.7 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A2 (dairy, production) | 2024 | 164.6 | 164.6 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A2 (pig, GHG) | 2022 | 28.01 | 28.01 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A2 (pig, GHG) | 2023 | 26.82 | 26.82 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A2 (pig, GHG) | 2024 | 26.18 | 26.18 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A2 (pig, production) | 2021 | 23.39 | 23.39 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A2 (pig, production) | 2022 | 22.07 | 22.07 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A2 (pig, production) | 2023 | 20.64 | 20.64 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A2 (pig, production) | 2024 | 21.09 | 21.09 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A2 (pig, production) | 2025 | 21.84 | 21.84 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A2 (pig, intensity) | 2021 | 1.219 | 1.219 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A2 (pig, intensity) | 2022 | 1.266 | 1.266 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A2 (pig, intensity) | 2023 | 1.296 | 1.296 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A2 (pig, intensity) | 2024 | 1.238 | 1.238 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A4 (bovine, production) | 2021 | 6.802 | 6.802 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A4 (bovine, production) | 2022 | 6.64 | 6.64 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A4 (bovine, production) | 2023 | 6.385 | 6.385 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A4 (bovine, production) | 2024 | 6.584 | 6.584 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A4 (bovine, production) | 2025 | 6.32 | 6.32 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A4 (bovine, herd) | 2021 | 59.5 | 59.5 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A4 (bovine, herd) | 2022 | 58.79 | 58.79 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A4 (bovine, herd) | 2023 | 57.97 | 57.97 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A4 (bovine, herd) | 2024 | 56.5 | 56.5 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A4 (bovine, herd) | 2025 | 56.26 | 56.26 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A4 (dairy, production) | 2021 | 162.6 | 162.6 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A4 (dairy, production) | 2022 | 162.8 | 162.8 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A4 (dairy, production) | 2023 | 163.7 | 163.7 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A4 (dairy, production) | 2024 | 164.6 | 164.6 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A4 (dairy, herd) | 2021 | 20.21 | 20.21 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A4 (dairy, herd) | 2022 | 20.07 | 20.07 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A4 (dairy, herd) | 2023 | 19.91 | 19.91 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A4 (dairy, herd) | 2024 | 19.22 | 19.22 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A4 (dairy, herd) | 2025 | 19.02 | 19.02 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A4 (pig, production) | 2021 | 23.39 | 23.39 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A4 (pig, production) | 2022 | 22.07 | 22.07 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A4 (pig, production) | 2023 | 20.64 | 20.64 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A4 (pig, production) | 2024 | 21.09 | 21.09 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A4 (pig, production) | 2025 | 21.84 | 21.84 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A4 (pig, herd) | 2021 | 135.9 | 135.9 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A4 (pig, herd) | 2022 | 129 | 129 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A4 (pig, herd) | 2023 | 127.5 | 127.5 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A4 (pig, herd) | 2024 | 126.8 | 126.8 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A4 (pig, herd) | 2025 | 126.1 | 126.1 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| A6 | 2021 | 129 | 129 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A6 | 2022 | 129 | 129 | 0.0 % | CONFIRMED | level | live recipe · direct |
| A6 | 2023 | 129 | 129 | 0.0 % | CONFIRMED | level | live recipe · direct |
| B4 (population) | 2021 | 1.027 | 1.027 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| B4 (population) | 2022 | 1.029 | 1.029 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| B4 (population) | 2023 | 1.033 | 1.033 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| B4 (population) | 2024 | 1.036 | 1.036 | 0.0 % | CONFIRMED | trend | live recipe · splice |
| B4 (population) | 2025 | 1.04 | 1.04 | 0.0 % | CONFIRMED | trend | live recipe · splice |

## Re-running

```bash
node scripts/esabcc-indicators/factcheck-postreport-values.mjs            # fresh pull
node scripts/esabcc-indicators/factcheck-postreport-values.mjs --offline  # cached inputs
```

Raw inputs with their queries: `scripts/esabcc-indicators/factcheck-postreport-inputs.json`.
Machine-readable results: `scripts/esabcc-indicators/factcheck-postreport-results.json`.
