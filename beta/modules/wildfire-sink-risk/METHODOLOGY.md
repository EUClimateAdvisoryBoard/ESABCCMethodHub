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

Three modes, selectable in the UI:

- **Flat** — held at the anchor (default: the five-year mean) indefinitely.
- **Growth** — anchor compounded at *g* %/yr. **Default: 2.5%/yr.**
- **Trend** — the OLS line through 2021–25, extended. Reaches ~2.1 Mha/yr by
  2040. Offered as a stress case, not a best guess.

The default deliberately anchors on the five-year *mean* rather than the 2025
record, which smooths the record year rather than projecting from a peak.

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
equivalent number of cars removed; and — the most intuitive framing — **months
of the EU's average 2030→2040 net-reduction effort** that the shortfall consumes.

The reference sink path is anchored at 212 Mt (2024) → 310 Mt (2030) → the
chosen 2040 value, linearly interpolated and held flat to 2050.

## 4. Results

2040 sink loss under each named case (all other dials at default):

| Case | Burnt area 2040 | Sink loss 2040 | % of sink | Months of effort | Cumulative 2026–40 |
|---|---|---|---|---|---|
| Held (flat) | 658k ha | 7.1 Mt | 2.2% | 0.5 | 103 Mt |
| Conservative | 953k ha | 13.7 Mt | 4.3% | 1.0 | 130 Mt |
| **Central (default)** | **953k ha** | **23.7 Mt** | **7.5%** | **1.8** | **221 Mt** |
| Trend | 2,090k ha | 90.1 Mt | 28.4% | 6.6 | 788 Mt |
| Severe | 1,944k ha | 112.9 Mt | 35.6% | 8.3 | 1,076 Mt |

The spread — a factor of sixteen between the mildest and harshest case — is the
honest headline. It is why the module ships with sliders rather than a number.

Note that even the **Held** case loses ground, because the five-year mean
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
- The linear recovery ramp simplifies an S-curve and slightly understates the
  early-year deficit.
- Sector figures in the catch-up chart are illustrative residual 2040 emissions
  for scale only — not a Commission scenario read-out.

## 7. Files

| File | Contents |
|---|---|
| `model.ts` | Data, parameters, presets, model functions, assumption registry |
| `page.tsx` | UI — five inline-SVG charts, sliders, documentation table |
| `src/app/beta/wildfire-sink-risk/page.tsx` | Route re-export |

The model is pure and side-effect free; `page.tsx` computes nothing beyond
layout. To reuse the arithmetic elsewhere, import from `model.ts` directly.
