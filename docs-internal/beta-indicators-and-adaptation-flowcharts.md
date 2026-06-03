# Beta indicators & the adaptation flow-chart layer

This note documents the provisional ("beta") indicators added so that **every
mitigation lever and outcome** in the sector assessment-framework flow charts
(the *policy-gap-2-0* project) has a linked time series, plus the new
**adaptation & resilience layer** rendered in the *Flow charts (beta)* view.

All of these ship flagged `beta: true`. The **sources are real**; the **series
are best-available** (some years are interpolated/rounded from publisher news
releases and Statistics Explained summaries, and a few are genuinely sparse —
snapshots, modelled baselines or multi-year averages). Each indicator's
`description` records its confidence and the exact dataset to re-pull before it
is promoted out of beta. Data lives in `src/data/beta-indicators.ts`.

## Where things appear in the UI

- **Indicator Database sidebar** — two new groups: *New beta indicators* and
  *Beta adaptation indicators*. Beta entries carry a `β beta` badge.
- **Flow charts (report)** — the previously empty mitigation levers/outcomes
  now show a white indicator chip (β-marked when it links to a beta series).
- **Flow charts (beta)** — a copy of the six report frameworks with an added
  adaptation outcome, adaptation lever and adaptation enabling condition per
  sector (all marked `⛨ adapt`, teal cards), wired to the beta adaptation
  indicators and to fitting existing ECNO series.

## New mitigation indicators (group `beta`)

| Lever / outcome filled | Indicator | Unit | Source |
|---|---|---|---|
| Energy · Fossil fuel phase-out | Fossil share of gross available energy | % | Eurostat `nrg_ind_ffgae` / `sdg_07_10` |
| Energy · Targeted CCU/CCS | Operational CO₂ capture & storage capacity | Mt CO₂/yr | IEA CCUS Projects DB / Global CCS Institute |
| Energy · Energy efficiency | Energy intensity of the economy | kgoe/1000 EUR | Eurostat `nrg_ind_ei` / `sdg_07_30` |
| Industry · Product demand reduction | Domestic material consumption per capita | t/capita | Eurostat `env_ac_mfa` / `ten00137` |
| Industry · Material efficiency & substitution | Resource productivity (GDP/DMC) | EUR/kg | Eurostat `env_ac_rp` / `sdg_12_20` |
| Transport · Reduce demand (outcome) | Final energy consumption in transport | Mtoe | Eurostat `nrg_bal_c` |
| Transport · Vehicle efficiency | Avg CO₂ of new cars (WLTP) | g CO₂/km | EEA new-car CO₂ monitoring |
| Buildings · Zero-emission new builds | nZEB / class-A share of new dwellings | % | EU Building Stock Observatory / ZEBRA2020 |
| LULUCF · Reduce within-category emissions (outcome) | Net flux from cropland & grassland | Mt CO₂e | EEA GHG inventory (CRF 4.B+4.C) |
| LULUCF · Wetland conservation & restoration | Net GHG emissions from wetlands | Mt CO₂e | EEA GHG inventory (CRF 4.D) |

Three further levers/outcomes were filled by linking to **existing ECNO
series** rather than creating duplicates:

- Industry · New production processes → `hydrogen-electrolyser-capacity`
- Buildings · Energy & material sufficiency → `household-energy-per-capita`
- Agriculture · Reduced production → `cattle-population`

## New beta adaptation indicators (group `beta-adaptation`)

| Indicator | Unit | Source | Used for (sector) |
|---|---|---|---|
| Cooling degree days (EU-27) | CDD index | Eurostat `nrg_chdd_a` | Energy, Buildings |
| Heat-related mortality (Europe, summer) | deaths/yr | ISGlobal / Nature Medicine; EEA Climate-ADAPT | Buildings |
| Annual area burnt by wildfires (EU) | hectares | JRC EFFIS | LULUCF |
| EU territory under drought warning/alert (peak) | % of area | JRC European Drought Observatory | Agriculture |
| Population exposed to river flooding (baseline) | people/yr | JRC PESETA IV / EEA EUCRA | Transport |
| Forest area affected by natural disturbances | million m³/yr | JRC Forest Disturbance Atlas / FOREST EUROPE | LULUCF |

Existing ECNO adaptation series reused in the adaptation layer:
`water-exploitation-index`, `climate-economic-losses`,
`national-adaptation-strategies`.

## Caveats for whoever promotes these out of beta

- Re-pull every series from its linked dataset; portals (Eurostat, EEA, EFFIS,
  EDO) blocked automated fetching during research, so per-year digits marked
  "verify"/"approximate" in the descriptions must be confirmed.
- Watch scope traps: transport FEC differs by ~50 Mtoe with/without
  international bunkers; new-car CO₂ has a hard NEDC→WLTP break at 2021; CCS
  excludes non-EU Norwegian projects; DMC ≠ raw material consumption.
- Heat mortality / flood / drought series cover "Europe" (not strictly EU-27)
  and several are snapshots or modelled baselines, not observed annual trends.
- No EU quantified targets exist for the adaptation indicators (intentionally
  omitted), consistent with the qualitative EU Adaptation Strategy.
