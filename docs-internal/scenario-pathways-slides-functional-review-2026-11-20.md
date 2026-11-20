# Scenarios (M · 55) — 2030 rule and slide view, functional review, 2026-11-20

Pass: adds the 2030 rule, the "potential likely setting" preset and a slide
view rebuilding the EEA deck "EU screening settings: potential likely
setting" (PDF, 9 slides, 20 November 2026). AI-compiled — pending Secretariat
verification.

## 2030 cut

Not in the export. Derived in `scripts/build-scenario-pathways.py` as
`100 − (100 − red40) × net_ghg_2030 / net_ghg_2040` (same inventory scaling as
the export's 2040 cut); ESABCC runs (Board metric in red40) are scaled to the
2020 inventory instead. Checked against the two values the PDF prints:
ELEVATE-SSP2-710P 54.5 % and NGFS 5 Delayed transition 47.7 % — both equal.

## Checks against the PDF

| # | PDF item | Result |
|---|---|---|
| 1 | Funnel 1,318 → 657 → 151 → 51 → 48 → 40 (slide 3) | equal; build gate and browser badge |
| 2 | Tolerance table, 24 counts (slide 1) | all equal; build gate |
| 3 | Sources of the 40 (SC 15, ECEMF 9, ESABCC 6, SHAPE 5, Schreyer 2025 3, NAVIGATE 1, Schreyer 2024 1) | equal |
| 4 | By model: REMIND 22, IMAGE 9, PRIMES 6, POLES 2, GCAM 1 | equal |
| 5 | Sector medians 2030/2040/2050 and 2050 bands (slides 4–9) | equal for all six sectors, incl. n = 39 mobility, 37 agri-food, 39 ecosystems |
| 6 | Tiles (industry six, supply four, mobility, buildings, agri-food, ecosystems) | equal, incl. forest n = 19 and livestock "not reported" |
| 7 | Rule strips (slide 2): 3 below 55 %; 14 / 40 / 49 around the 2040 window; 2 / 14 / 24 / 24 in 2050 | equal |
| 8 | Medians in the tolerance table (e.g. 87.7 % · 168 Mt) | equal for the cells spot-checked on screen |

Export parity is unchanged (15,936 / 15,936), because the 2030 rule is off by
default.

## Slide view

Nine slides drawn on a 1280 × 720 stage, recomputed for any setting; sector
slides follow the sector selection; "Present" (full screen, arrow keys) and
"Print / save as PDF" (one slide per page, checked: 9 pages at 16:9).
Differences from the PDF by design: "study years" (not in the export) is
omitted; the model bar for GCAM-PR is labelled GCAM (model family).

## Not covered

- The PDF's medians of the tolerance table were not compared cell by cell.
- Units on the ESABCC limits still inferred (see the first review).
