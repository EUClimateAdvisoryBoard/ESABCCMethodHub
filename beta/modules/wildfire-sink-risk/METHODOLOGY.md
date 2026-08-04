# M · 41 — Wildfires & the Land Sink

**Status:** beta, illustrative arithmetic only. Not an ESABCC position, not a
projection, not suitable for citation as a quantitative finding.

A back-of-the-envelope model that converts the last five years of EU wildfire
into a carbon-sink shortfall, extrapolates it to 2050, and translates that
shortfall into the extra mitigation burden it places on every other sector
under the 2040 (−90%) and 2050 (net-zero) targets.

Route: `/beta/wildfire-sink-risk` · Model: `model.ts` · UI: `page.tsx`

---

## 1. The question

The EU's 2040 target is a **net** target: gross emissions minus the land sink.
The land sink is therefore a load-bearing structural assumption, sized at over
300 MtCO₂e/yr — and it is the only pillar of the target that can be destroyed
by weather.

So: if wildfire keeps running at the rate of the last five years, how much of
that pillar is lost, and who pays for it?

## 2. Data

### Burnt area — EFFIS, EU-27

| Year | Hectares | Note |
|---|---|---|
| 2021 | 449,342 | Quiet by recent standards |
| 2022 | 837,212 | Record at the time; fires in 26 of 27 Member States |
| 2023 | 504,002 | Includes Alexandroupolis, ~96,000 ha — largest single EU fire on record |
| 2024 | 419,298 | Mildest of the five; ~80% of 2023 |
| 2025 | **1,079,538** | All-time EFFIS record; 7,783 fires in 25 Member States |

- Five-year total: **3,289,392 ha**; mean **657,878 ha/yr**
- Long-run 2006–2024 mean: **~550,000 ha/yr** (derived — the JRC described 2025
  as "nearly double the 2006–2024 average")
- OLS slope through the five points: **+84,248 ha/yr** (≈ +12.8%/yr of the mean)

Source: Copernicus EMS / EFFIS and the JRC *Forest Fires in Europe, Middle East
and North Africa* annual reports.

### Policy anchors

| Anchor | Value | Source |
|---|---|---|
| 1990 net GHG baseline | 4,649 MtCO₂e | EU GHG inventory |
| 2030 net allowance (−55%) | 2,092 MtCO₂e | European Climate Law |
| 2030 LULUCF target | 310 MtCO₂e | Regulation (EU) 2023/839 |
| 2040 target | −90% net vs 1990 | European Climate Law as amended (in force April 2026) |
| 2040 LULUCF assumption | 215 / **317** / 376 MtCO₂e | Commission 2040 impact assessment |
| ESABCC advice | −90 to −95%; removals within 100–400 MtCO₂ | ESABCC 2040 advice |
| Sink outturn | 198 Mt (2023), 212 Mt (2024 est.), 268 Mt (2016–18 avg) | EU inventory / EEA |

## 3. Method

### 3.1 Burnt-area projection

Growth rate is **the** control of the module: it is a prominent slider (0–15%/yr)
at the top of the page, with five preset extremes, and the headline figure and
both target cards move with it live. No growth rate is presented as central or
blessed — the spread is the finding.

Three modes:

- **Flat** — held at the anchor (default: the five-year mean) indefinitely.
- **Growth** — anchor compounded at *g* %/yr. **Default: 5%/yr**, stated in the
  code as a starting point rather than a forecast.
- **Trend** — the OLS line through 2021–25, extended. Reaches ~2.1 Mha/yr by
  2040 — the same place 8%/yr compound reaches (2.087 vs 2.090 Mha), which is
  why 8%/yr is labelled "recent record continues".

The projection anchors on the five-year *mean* rather than the 2025 record, so
it does not project from a peak.

### 3.1a Saturation guard

Unbounded compound growth is nonsense over 25 years: at 12%/yr the naive formula
reaches 11 Mha in 2050, roughly 7% of all EU forest burning every year. Burnt
area is therefore capped at **`MAX_ANNUAL_HA` = 5 Mha/yr** — about five times the
2025 record, so it never binds in any plausible scenario. Where it does bind, the
UI names the year and says the projection has saturated.

### 3.2 Three carbon terms per burnt hectare

**(a) Combustion.** `area × fuelLoad`, default **42 tCO₂/ha**. Back-solved from
CAMS, which measured ~12.5 MtC ≈ 45.8 MtCO₂ from the EU's 1.08 Mha in 2025. The
model reproduces the observed record year to within ~1% by construction.

**(b) Post-fire decomposition.** Fire kills more biomass than it consumes. A
share of the combustion-equivalent carbon (default **25%**) is released evenly
over a decay window (default **10 years**).

**(c) Foregone removals.** The term that compounds. Each year's fires create a
cohort of land that under-delivers until it recovers. A cohort burnt *k* years
ago carries a deficit of `forestShare × seqRate × max(0, 1 − k/R)`, where *R* is
recovery time (default **20 years**). Defaults: forest share **50%**, removal
rate **2.5 tCO₂/ha/yr**.

Only the forest fraction is counted, because scrub and grassland regrow within a
few years and are close to carbon-neutral over the cycle.

### 3.3 The baseline subtraction — the key methodological choice

The LULUCF inventory and Member State projections **already contain a normal
amount of fire.** Charging the full fire impact against the target would
double-count and would roughly double every number in the module.

So the model runs the cohort machinery twice — once on the projected burnt-area
path, once on a counterfactual path held at the embedded baseline (default
550,000 ha/yr) — and differences them. The pre-existing "normal" fire load
cancels exactly, including its cohort history. Only the **excess** is charged
against the target.

A negative value in a mild year (e.g. 2021, −4.5 Mt) is real and is displayed as
such.

### 3.4 Target feasibility

```
netAllowed(2040)  = 4,649 × (1 − target%/100)          = 465 Mt at −90%
grossPlanned      = netAllowed + referenceSink          = 782 Mt
grossActual       = netAllowed + referenceSink − loss
extraBurden       = loss
```

Because the target is net, a sink shortfall converts **one-for-one** into a
deeper gross cut required from every other sector. The module reports that
burden as: a share of the gross budget; a share of the planned sink; an
equivalent number of cars removed; and **months of the EU's average 2030→2040
net-reduction effort** that the shortfall consumes.

The two headline framings, shown as large cards directly under the growth dial,
state the consequence as a missed target rather than as a quantity of carbon:

```
effectiveReductionPct = (1 − (netAllowed + loss) / 4,649) × 100
ppMissed              = loss / 4,649 × 100
engineeredCostBn      = loss × €400/t
```

So a −90% target quietly becomes −89.0%, and net zero in 2050 quietly becomes
net **positive**.

### 3.5 Choosing an honest denominator

**The percentage-of-1990 framing badly understates the result, and the module
says so on the page.** The 1990 baseline is 4,649 Mt, so one percentage point is
**46.5 Mt** — the scale is too coarse to show a loss of this size, and "−89.0%
instead of −90%" reads as a rounding error when it is not one.

Three denominators are reported instead, all of which mean something:

| Denominator | At 5%/yr | At 15%/yr |
|---|---|---|
| **Planned sink *improvement*** (212 → 317 Mt, i.e. +105 Mt) | **44%** | **229%** |
| **All net emissions still allowed in 2040** (465 Mt) | **10%** | **52%** |
| Gross budget for all other sectors (782 Mt) | 6% | 31% |
| Percentage points of the 1990 baseline | 1.0 pp | 5.2 pp |

The first is the headline on the 2040 card: the EU must *grow* the sink by
105 Mt, and fire takes back nearly half of that gain at 5%/yr, and more than all
of it above ~11%/yr.

The loss is also shown against whole national inventories (2023, excl. LULUCF):
Germany 672 Mt, Poland 348 Mt, Spain 270 Mt, EU-27 3,100 Mt. Only figures that
could be verified directly are used — no mid-sized country is quoted from
memory to sharpen a comparison.

### 3.6 The outer bound — no sink at all

`collapse(year, p)` answers a separate question: what the targets look like if
the land sink is gone entirely, from any cause. **This is not a wildfire
projection and the module does not claim fire alone gets there.** It is included
because it is the only way to show how much of the architecture rests on land.

| | 2040 | 2050 |
|---|---|---|
| Sink lost | 317 Mt | 317 Mt |
| Gross budget for other sectors | 782 → 465 Mt (**41% deeper cut**) | 317 → **0 Mt** |
| Reduction achieved if nobody compensates | −83.2% | −93.2% |
| Engineered removals to replace it | €127 bn/yr | €127 bn/yr |
| Share of Spain's entire emissions | 117% | 117% |

Net zero in 2050 without a land sink is not net zero — it is **absolute** zero. Both cards assume no other sector compensates — that is the point of
presenting them that way; in reality the gap is closed by cutting harder
elsewhere, which is the bill the module exists to price.

The €400/tCO₂ engineered-removal cost is order-of-magnitude only (2040–50
DACCS-class projections span roughly €200–600/t). It is applied solely to the
2050 gap, where gross emissions are already at their residual floor and there is
no cheaper option left.

The reference sink path is anchored at 212 Mt (2024) → 310 Mt (2030) → the
chosen 2040 value, linearly interpolated and held flat to 2050.

## 4. Results

### By growth rate — the headline table

All other dials at default. "2040 achieved" is the reduction the EU actually
reaches if no other sector compensates; "2050 miss" is how far net zero is
missed by.

| Growth rate | Burnt area 2040 | Sink loss 2040 | 2040 achieved | Months of effort | 2050 miss | Removals cost | Cap binds |
|---|---|---|---|---|---|---|---|
| **0%/yr** — stops worsening | 658k ha | 7 Mt | **−89.8%** | 0.5 | **+7 Mt** | €3 bn/yr | — |
| **2.5%/yr** — slow | 953k ha | 24 Mt | **−89.5%** | 1.8 | **+40 Mt** | €16 bn/yr | — |
| **5%/yr** — steady (default) | 1,368k ha | 47 Mt | **−89.0%** | 3.4 | **+98 Mt** | €39 bn/yr | — |
| **8%/yr** — recent record continues | 2,087k ha | 85 Mt | **−88.2%** | 6.3 | **+226 Mt** | €90 bn/yr | — |
| **12%/yr** — compounding | 3,601k ha | 166 Mt | **−86.4%** | 12.2 | **+281 Mt** | €113 bn/yr | 2043 |

Each **46.5 Mt** of lost sink costs one percentage point of the 2040 target.

### By named preset

These vary several dials at once, not just growth.

| Preset | Burnt area 2040 | Sink loss 2040 | 2040 achieved | 2050 miss | Cumulative 2026–40 |
|---|---|---|---|---|---|
| Fires stop getting worse | 658k ha | 7 Mt | −89.8% | +7 Mt | 103 Mt |
| Conservative — small durable loss | 1,368k ha | 27 Mt | −89.4% | +57 Mt | 220 Mt |
| Default — 5%/yr worsening | 1,368k ha | 47 Mt | −89.0% | +98 Mt | 369 Mt |
| The recent record continues | 2,090k ha | 90 Mt | −88.1% | +145 Mt | 788 Mt |
| Hotter fires, slower recovery | 3,424k ha | 221 Mt | −85.3% | +386 Mt | 1,716 Mt |

The spread — a factor of thirty between mildest and harshest — is the honest
headline. It is why growth rate is a slider rather than a number.

Note that even the **0%/yr** case loses ground, because the five-year mean
(658k ha/yr) already sits above the long-run average (550k ha/yr) that the
projections assume. Fire does not have to get worse to be a problem; it only has
to stay where it now is.

## 5. Sensitivity

The tornado chart sweeps each dial across a plausible range with all others
held at current settings, and ranks by the span of the resulting 2040 loss.
Ranges are judgement calls about what a reasonable sceptic would accept — **not**
statistical confidence intervals. The ordering is the useful output: it tells
you which argument is worth having.

| Dial | Swept range |
|---|---|
| Burnt-area growth | 0–6 %/yr |
| Fire already in projections | 450–700k ha/yr |
| Combustion per hectare | 25–65 tCO₂/ha |
| Forest share of burnt area | 30–75% |
| Removals on forest land | 1.2–4.5 tCO₂/ha/yr |
| Recovery time | 8–40 yr |
| Post-fire decomposition | 5–50% |

## 5a. Live 2026 season data

The page opens with a live section fed by the Copernicus EFFIS statistics API,
proxied through `/api/effis` with a 30-minute server-side cache:

| Upstream endpoint | What it provides |
|---|---|
| `statistics/v2/effis/weeklyaoi?aoi=EU&year=2026` | Weekly cumulative EU-27 burnt area and fire counts, with the 2006–25 min/avg/max envelope per week |
| `statistics/v2/emissions/weeklyaoi?aoi=EU&year=2026` | CAMS wildfire emissions (CO₂ and other species), weekly cumulative, tonnes |
| `rda-stats?year=2026` | EFFIS rapid-damage-assessment estimate of the season total, including fires not yet fully mapped |

All three are open Copernicus data (base URL `api2.effis.emergency.copernicus.eu`).
The live map uses the EFFIS WMS (`maps.effis.emergency.copernicus.eu/effis`):
fire-danger forecast (`mf010.fwi`), current-season burnt-area polygons
(`modis.ba.poly.season`) and VIIRS thermal hotspots from the last 24 h
(`viirs.hs`).

**Year-end projection.** Full-year 2026 burnt area is projected from the season
to date plus the historical cumulative envelope: the low / central / high
estimates add the quietest / average / worst *remainder-of-season* in the
2006–25 record to this year's observed head start, and a fourth,
`proportional`, estimate assumes the season keeps running at its current
multiple of the seasonal norm. This is a spread of historical remainders, not
a confidence interval. The carbon consequence of the projected season reuses
the same per-hectare parameters as the interactive model (`seasonSinkImpact`
in `live.ts`), including the baseline subtraction of §3.3, so the live section
and the sliders cannot drift apart.

If the API route or the upstream service is unreachable, the section falls
back to an embedded snapshot of the same payload and labels itself
accordingly; in-season EFFIS figures are provisional and revised as new fires
are mapped.

## 6. Known limitations

**Understates the problem:**
- Soil and peat carbon loss is ignored entirely.
- Repeat burns that convert forest permanently to shrub are not modelled;
  recovery always completes.
- Fire–climate feedbacks, drought and bark beetle interactions are not modelled.
- EFFIS maps fires above roughly 30 ha, so true burnt area is higher.
- 39% of the 2025 burnt area (424,023 ha) fell inside Natura 2000 sites — the
  land the sink strategy leans on hardest — which the model does not weight.

**Overstates the problem:**
- Adaptation, fuel management and improved suppression are only representable
  through the growth-rate dial.
- Salvage logging can move some carbon into harvested wood products rather than
  leaving it to decay.
- If projections already assume more than 550k ha/yr of fire, the baseline
  subtraction is too small.

**Structural:**
- The EU is treated as a single pool. Real fire risk is overwhelmingly Iberian
  and Mediterranean, and so is the exposed sink.
- Compound growth is a crude model of a process that is really driven by fire
  weather, fuel state and ignition. Above roughly 8%/yr the projection is best
  read as "implausibly bad" rather than as a number, and above the 5 Mha/yr cap
  it is not a projection at all.
- The linear recovery ramp simplifies an S-curve and slightly understates the
  early-year deficit.
- Sector figures in the catch-up chart are illustrative residual 2040 emissions
  for scale only — not a Commission scenario read-out.

## 7. Sub-analyses (`analyses/`, routes `/beta/wildfire-sink-risk/analyses/…`)

Seven deep-dive analyses (A1-A7) run the module's cohort machinery into policy
questions the single-pool EU model cannot answer, plus a synthesis overview
page whose every headline number is imported from the analysis models at
default settings (so the summary cannot drift from the pages). All inherit the
module's status: beta, illustrative, not citable as quantitative findings.

Shared data layer (`analyses/data.ts`, generated, provenance in header):
EFFIS per-country annual estimates and the EU-wide weekly-product annual
series fetched from the open Copernicus API on 2026-08-04, plus Annex IIa of
Regulation (EU) 2023/839 copied verbatim from the Official Journal (fetched
from the Publications Office). The EFFIS API products differ a few percent
from the JRC-report figures used in `model.ts`; every analysis stays inside
one product for any within-product comparison, and this is documented in the
data file and on the pages. `model.ts` exports its cohort function as
`cohortImpact` so the analyses reuse the machinery instead of duplicating it.

| # | Slug | Question | Key result at defaults |
|---|---|---|---|
| A1 | `member-states` | Per-country cohort runs vs Annex IIa 2030 targets | Spain's 2030 fire loss ≈ 169% of its entire required sink improvement; 4 countries hold ~75% of EU fire but ~27% of the sink obligation |
| A2 | `disturbance-flexibility` | How much fire can legally leave the compliance accounts (Art 10/13b, Annex VI)? | ~51 Mt excludable 2026-30; foregone removals have no route; Art 13b voids itself once the Union misses 310 Mt by > 20 Mt |
| A3 | `prevention` | €/tCO₂ of an avoided hectare vs €400/t removals | ~77.5 tCO₂ lifecycle per hectare → ~€39/t at conservative dials, ~10× cheaper than engineered removals |
| A4 | `hindcast` | Cohort model run backwards over EFFIS 2006-2024 | Fire explains ~2-18% of the observed ~70 Mt sink decline; 2025 fire drag is the record. Validates the baseline subtraction |
| A5 | `crcf-reversal` | CRCF buffer-pool sizing under fire scenarios | ~13% of certified units reversed by fire alone over 20 yr at 5%/yr — most of a typical all-causes registry buffer |
| A6 | `natura2000` | Weighting by the 39% Natura 2000 burnt share | Protected land burnt at ≈2.8× the outside rate in 2025; ~7.6% of the network burns cumulatively by 2040 at 5%/yr |
| A7 | `fwi-scenarios` | Which dial settings does the climate literature support? | Mean climate signal (Turco et al. 2018, warming-adjusted) ≈ 0.5-1.5%/yr at 2 °C by 2050, vs 12.8%/yr observed 2021-25 trend |

Each analysis directory holds a pure `model.ts` (assumptions and reasoning in
the header) and a `page.tsx` presentation layer; `analyses/lib.tsx` carries the
shared shell/controls; `analyses/page.tsx` is the synthesis. The synthesis page
also maps the findings onto the Policy Gap report's four-type gap taxonomy with
four concrete integration routes (candidate tracker rows, a Ch. 9 fire
indicator, a LULUCF risk box, a costed prevention recommendation).

## 8. Files

| File | Contents |
|---|---|
| `model.ts` | Data, parameters, presets, model functions, assumption registry |
| `analyses/data.ts` | Generated data layer: EFFIS country/EU snapshots, Annex IIa (OJ verbatim) |
| `analyses/lib.tsx` | Shared shell, controls and registry for the A1-A7 pages |
| `analyses/page.tsx` | Synthesis overview — computed findings + Policy Gap report mapping |
| `analyses/<slug>/model.ts` | Pure model for each analysis (A1-A7) |
| `analyses/<slug>/page.tsx` | Presentation layer for each analysis |
| `live.ts` | Live-season types, fetch-with-fallback, year-end projection, season carbon impact |
| `LiveSeason.tsx` | Live 2026 tracker — stat band, seasonal-trend chart, projection cards |
| `LiveFireMap.tsx` | Leaflet map with EFFIS WMS layers (danger forecast, burnt areas, hotspots) |
| `page.tsx` | UI — inline-SVG charts, sliders, documentation table |
| `src/app/api/effis/route.ts` | Cached proxy for the EFFIS statistics API |
| `src/app/beta/wildfire-sink-risk/page.tsx` | Route re-export |

The model is pure and side-effect free; `page.tsx` computes nothing beyond
layout. To reuse the arithmetic elsewhere, import from `model.ts` directly.
