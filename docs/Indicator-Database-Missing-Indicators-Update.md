# Indicator Database — adding the missing report figures

_June 2026 completeness pass_

## Why this was done

The Indicator Database rebuilt the ESABCC 2024 report
(_Towards EU climate neutrality_) progress indicators from the report's
own underlying-data workbooks. A review against the report's figure list
found that several **named "Indicator" figures were missing** — in most
cases because they are *multi-panel* figures (one chart per material or
per livestock product) or *categorical* figures (counts / period averages)
that the original year-based extractor skipped.

This pass adds every missing named indicator. Following the convention
already used for the split indicators (E2 → fossil + renewables, I4 →
steel/cement/chemicals, A3 → use + NUE, O2 → PEC + FEC), **each plotted
series becomes its own Indicator-Database entry**, because the database
stores one line series per entry. The result is 46 new entries across 11
report indicators.

| Code | Figure | Title | New entries |
|------|--------|-------|-------------|
| I2 | 24 | Production, use and trade balance of steel, cement, base organic chemicals | 8 |
| I7a | 29 | Low-carbon projects in the steel sector | 1 |
| I7b | 30 | Low-carbon projects in the cement sector | 1 |
| I7c | 31 | Low-carbon projects in the chemicals sector | 1 |
| A2 | 57 | Livestock products: production, GHG emissions, GHG intensity | 9 |
| A4 | 59 | Livestock products: production, consumption, herd size | 9 |
| A5 | 60 | Average animal-product consumption | 3 |
| A6 | 61 | Food waste in the EU (2020) | 1 |
| B3 | 49 | Residential annual renovation rate and depth | 2 |
| B4 | 50 | Population and surface area of homes and businesses | 5 |
| L2 | 66 | Change in surface area per land-use category | 6 |

## How it was done

All values were read back from the report's own workbooks — the
consolidated underlying-data workbook
(`ESABCC_report_..._underlying data.xlsx`, the same source as
`scripts/esabcc-indicators/extract.json`) and, where a figure only exists
in the chapter working file, from the per-chapter workbooks
(`Ch5/7/9 ... final indicators and graphs.xlsx`).

The generator `scripts/esabcc-indicators/build.py` was extended with two
provenance modes so the recipes stay the single source of truth (see the
`NEW_RECIPES` block, which carries a derivation comment per indicator):

- **`seriesPos`** — pick an exact series out of the underlying-data
  workbook by its position in the sheet. The multi-panel figures repeat
  the same labels (`Production`, `Use`, `GHG emissions`, …) once per
  material/product, so a label match alone is ambiguous; the position
  disambiguates which panel (e.g. Figure 24 series 0–2 = Steel, 5–6 =
  Cement, 10–12 = base organic chemicals).
- **`dataPoints`** — inline values taken verbatim from the cited sheet,
  for figures the year-based extractor can't represent (categorical
  project counts, single-year snapshots) or that only live in a chapter
  working file (L2 area time series).

The new entries are produced with `build.py --new-only` and appended into
`src/data/esabcc-indicators.ts`. A full regen is deliberately **not** run,
because the committed file also carries `afterReport` points injected by
the live-source refresh (migration 055 backfill) that a blind rebuild
would drop.

## Per-indicator derivation notes

### I2 — production, use and trade balance (Figure 24, Mt)
Three panels (Steel, Cement, base organic chemicals), each plotting
Production, Use and Trade balance. Taken as the published series.
**Decision:** the workbook's *Cement* "Trade balance" row is a stray copy
of the *Steel* row (byte-identical values), so it was **omitted** rather
than propagated as a wrong figure — Cement keeps Production + Use only.
Steel and chemicals keep all three series (8 entries). Production/use are
flagged `direction: down` and trade balance `up`, but I2 is a context
indicator with no policy target.

### I7a / I7b / I7c — low-carbon projects (Figures 29/30/31)
These are **categorical project counts** (technology group × project
scale/status), not a time series. Each is stored as a single snapshot
point at the report's data vintage (2023) carrying the headline project
count, with the full technology/scale split written into the description:

- **I7a steel** — 48 projects (R&D 6, pilot 8, demo 5, full scale 29),
  technologies DRI / H₂ / EAF / CCS-CCU / other. Source: Green Steel Tracker.
- **I7b cement** — 62 projects (unspecified 5, R&D 22, pilot 24, demo 7,
  full scale 4), technologies CCS-CCU / material substitution / fuel
  switch / efficiency / mineralisation.
- **I7c chemicals** — 171 projects (renewables 54, chemical recycling 28,
  H₂ & derivatives 27, CCS-CCU 18, efficiency 15, biochemicals 14,
  mechanical recycling 13, e-cracker 2), split planned/started.

Counts are sums of the chapter-workbook summary tables on sheet
`I7a,b&c. Low carbon projects`.

### A2 — livestock products (Figure 57)
Panels Bovine meat / Dairy products / Pig meat, each with GHG emissions
(Mt CO₂eq, 2010–2021), Production (Mt) and GHG intensity (t CO₂eq/t,
2010–2020). GHG intensity is the report's own emissions ÷ production ratio.
9 entries.

### A4 — production, consumption, herd size (Figure 59)
Same three panels, each with Consumption (Mt), Production (Mt) and Herd
size (million heads), 2010–2020. 9 entries.

### A5 — average animal-product consumption (Figure 60)
Per-capita consumption (kcal/cap/day) for the three product groups,
2010–2021. The report's 2050 "sustainable and healthy diet" benchmark is
carried as the `targetValue` (bovine 48, dairy 301, pig 187). 3 entries.

### A6 — food waste (Figure 61)
Single-year (2020) breakdown by source. Stored as the headline EU total
(131 kg/cap/year) with the source split — households 70, food processing
26, primary production 14, restaurants 12, retail 9 — documented in the
description, and the Farm-to-Fork 2030 benchmark (≈65.5 kg) as the target.

### B3 — residential renovation rate and depth (Figure 49)
The figure reports **period-average weighted renovation rates**, not an
annual series: the 2016–2020 historic rate and the 2026–2030 Climate
Target Plan scenario rate, split Light/Medium/Deep. Stored as the weighted
rate with the historic value at 2020 and the 2030 scenario as the target —
Residential 1.0 % → 1.8 %, Commercial 0.6 % → 1.1 %. 2 entries.

### B4 — population and surface area (Figure 50)
Five structural drivers of buildings energy demand, indexed to 2005 = 1.0:
total dwellings, average floor area per dwelling, total residential floor
surface, EU population, total tertiary floor surface (2005–2020). 5 entries.

### L2 — change in surface area per land-use category (Figure 66)
Figure 66 plots only the net 2005→2021 change per category. The database
instead stores the **full underlying EU-CRF area time series** (million ha,
2005–2021) from the chapter workbook sheet
`L2. Areas per land-use category`, which is richer and lets the published
change recompute as `last − first` year. Six categories: Cropland,
Grassland, Wetland, Settlements, Forest land, Other. 6 entries.

## Verifying / regenerating

```bash
# Re-print just the new entries (matches what was appended):
python3 scripts/esabcc-indicators/build.py --new-only

# Inspect a panel in the source workbook:
python3 scripts/esabcc-indicators/extract.py | less   # underlying-data workbook
```

A full `build.py` (no flag) still emits the whole array including these
new recipes, for the eventual case where the file is rebuilt from scratch
and the `afterReport` refresh is re-applied afterwards.
