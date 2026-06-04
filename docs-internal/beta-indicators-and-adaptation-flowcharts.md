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
- **Flow charts** view — a *registry of flow-chart versions* (version selector
  at the top of the view; the beta board is no longer a separate top-level tab).
  Three versions ship built in:
  - **ESABCC report (default)** — 1:1 with the published report figures. The
    mitigation levers/outcomes the report drew *without* a progress indicator
    stay blank, exactly as drawn. Built by `defaultFrameworkBoardReport()`,
    which strips every chip flagged `enhanced` in `src/data/sector-frameworks.ts`.
  - **Enhanced flow charts** — the same frameworks, but every previously empty
    mitigation lever/outcome now shows a white indicator chip (β-marked when it
    links to a beta series, or a reused ECNO series). Those chips are the
    `enhanced: true` refs in the data. Built by `defaultFrameworkBoard()`.
  - **Beta — adaptation & resilience** — a copy of the enhanced frameworks with
    an added adaptation outcome, adaptation lever and adaptation enabling
    condition per sector (all marked `⛨ adapt`, teal cards), wired to the beta
    adaptation indicators and to fitting existing ECNO series.
  Users can create further versions by copying any existing version as a
  foundation, rename any version, and delete custom ones. Versions persist per
  project in localStorage (see `src/lib/project-workspace/flowchart-versions.ts`).

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

## Adaptation as a per-sector sub-framework (EUCRA-anchored)

Rather than bolting one adaptation chip onto each sector, the **Flow charts (beta)**
view now gives **every sector its own adaptation & resilience sub-framework**: one
or more adaptation **outcomes** framed as the relevant **EUCRA 2024 risk cluster**
(ecosystems, food, health, infrastructure, economy & finance), fed by 2–3
adaptation **levers**, plus an adaptation **enabling** condition — all teal
`⛨ adapt` cards. Each adaptation outcome carries a short EUCRA framing note (e.g.
"infrastructure cluster — inland flooding is one of 8 'urgent action needed'
risks"). In total: 7 adaptation outcomes and 13 adaptation levers across the six
sectors (buildings has two outcomes — heat and flood). Motivated by the EU
Adaptation Strategy (2021) and the EEA European Climate Risk Assessment (EUCRA,
EEA Report 01/2024).

### New beta adaptation indicators (group `beta-adaptation`)

| Indicator | Unit | Source | Sector fit |
|---|---|---|---|
| Cooling degree days (EU-27) | CDD index | Eurostat `nrg_chdd_a` / EEA | Energy, Buildings |
| Heat-related mortality (Europe, summer) | deaths/yr | ISGlobal / Nature Medicine; EEA | Buildings/health |
| Annual area burnt by wildfires (EU-27) | hectares | JRC EFFIS | LULUCF/forests |
| Cropland & ecosystem area impacted by drought | km² | EEA 8th EAP / Copernicus EDO | Agriculture, LULUCF |
| EU rail network reporting rising weather impacts | % of network | EEA TERM; EU Agency for Railways | Transport |
| Population in potential flood-prone areas | % of population | EEA / Climate-ADAPT | Buildings |
| Climate insurance protection gap | % uninsured | EEA / EIOPA | Industry, Energy |
| Expected annual flood damage to coastal transport | € million/yr | Nature Climate Change 2025; EUCRA | Transport |
| Drought-related damage to the EU energy sector | € billion/yr | JRC PESETA IV | Energy |

The earlier mismatched chips were replaced: **transport** dropped the generic
"population exposed to river flooding" in favour of the EEA TERM rail-network
measure plus the Nature 2025 coastal-transport damage figures; the weak
"drought peak %", "flood-exposure baseline" and "forest disturbance m³"
indicators were removed.

Existing ECNO adaptation series reused in the layer:
`water-exploitation-index` (WEI+) and `climate-economic-losses`.

### Historical depth

Every adaptation **outcome** card is anchored by a series with real multi-year
history, so no outcome reads as a single recent point:

- Economic losses — 6 yrs (EEA, full record back to 1980 available)
- EFFIS burnt area — confirmed anchors 2017 + 2021–2025 (2006– on the portal)
- Heat-related mortality — 2003 + 2022–2024
- WEI+ water scarcity — 4 yrs (2000– available)
- Cooling degree days — 2020, 2022 (1979– available)
- Ecosystem drought impact — 2024 + the 2000–2020 average

The inherently single-point items (rail network at risk, insurance gap,
flood-prone population, and the PESETA/Nature **projections** for coastal
transport and energy drought damage) are deliberately placed on the
adaptation **levers**, not the outcomes. Several deep series still show only
their confirmed anchor years here because the EEA/Eurostat/EFFIS portals block
automated extraction; each description names the exact table to export to fill
every year.

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
