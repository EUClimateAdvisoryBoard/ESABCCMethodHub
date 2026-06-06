# Advanced version 1 — the high-data-quality flow chart

This note documents **"Advanced version 1"**, the fourth built-in flow-chart
version in the Indicator module's *Flow charts* view (alongside *ESABCC report
(default)*, *Enhanced flow charts* and *Beta — adaptation & resilience*).

It was built to do two things the earlier boards did not:

1. **Raise data quality.** Every mitigation outcome and lever is enriched with
   indicators chosen for the **length and quality of their historic series** —
   drawn from primary statistical publishers (EEA, Eurostat, EMBER, EAFO/ACEA,
   EHPA, JRC, EFFIS, Copernicus, ECDC, EIOPA) and the peer-reviewed literature
   (Nature, Nature Climate Change, Nature Medicine, Nature Communications,
   Nature Food, Environmental Research Letters, ESSD, the Lancet Countdown).
2. **Put adaptation & resilience on the same level as mitigation.** Every sector
   carries its own adaptation **outcomes, levers and enabling conditions**
   (teal `⛨ adapt` cards) anchored in the EEA European Climate Risk Assessment
   (**EUCRA 2024**) risk clusters — ecosystems, food, health, infrastructure,
   economy & finance. In total the board carries **7 adaptation outcomes and 14
   adaptation levers** beside the mitigation track.

## Where it lives in the code

| Concern | Location |
|---|---|
| Indicator dataset | `src/data/advanced-indicators.ts` (`ADVANCED_INDICATORS`, `ADVANCED_ADAPTATION_INDICATORS`, `ALL_ADVANCED_INDICATORS`) |
| Board factory | `defaultFrameworkBoardAdvancedV1()` in `src/data/sector-frameworks.ts` |
| Version registration | `src/lib/project-workspace/flowchart-versions.ts` (built-in id `advanced-v1`, variant `advanced`) |
| Rendering | a new `'advanced'` variant in `SectorFlow` / `FrameworkBoard` (adaptation rows, **ADV** badge) |
| Sidebar groups | `advanced` / `advanced-adaptation` groups in `IndicatorModule.tsx` |
| Seeding | `src/lib/project-workspace/db.ts` |

The board is variant `'advanced'`: it renders adaptation as a first-class track
(like the beta board) but is badged **ADV**, not β, because the indicators are
high-quality curated series rather than provisional ones. Saved edits persist
per project under `esabcc-framework-board-advanced:<project>`.

## How "high quality" is defined here (and its honest limits)

Unlike the `beta` set (explicitly provisional), every advanced indicator is
chosen for a real, multi-year, well-sourced series. Three honest caveats apply
and are recorded in each indicator's `description`:

- **Portal extraction.** The EEA / Eurostat / EMBER / EFFIS / Copernicus portals
  block automated extraction, so where a value could only be cross-confirmed for
  specific years, those anchor years are included and the description names the
  exact dataset code to export for the gap years. No value is invented.
- **Period averages.** A few flagship science indicators are published as
  multi-decade period averages (the declining EU forest carbon sink, Nature
  2025; crop-loss severity, Brás et al. 2021). These are shown as a small number
  of stepped points at the period midpoint, and the description says so.
- **Scenario projections.** Warming-level / projection figures (the Nature
  Climate Change 2025 coastal-transport damage; JRC PESETA IV flood damage) are
  shown as a present-day baseline point with the projected levels stated in the
  description — not as observed trends.

## Advanced mitigation indicators (group `advanced`)

| Code | Indicator | Unit | Best historic span | Source |
|---|---|---|---|---|
| A-E1 | Renewable share of gross final energy | % | 2004→2024 | Eurostat nrg_ind_ren / sdg_07_40 |
| A-E2 | Wind & solar share of electricity | % | 2020→2025 | EMBER |
| A-E3 | Fossil share of electricity | % | 2019→2025 | EMBER |
| A-E4 | Grid CO₂ intensity of electricity | gCO₂e/kWh | 2020→2024 (EEA series 1990–) | EEA / EMBER |
| A-E5 | Energy-sector methane | Mt CO₂e | 1990, 2020 | EEA GHG inventory |
| A-I1 | EU ETS verified emissions (stationary) | Mt CO₂e | 2005 base, 2020→2024 | EEA EU ETS viewer |
| A-I2 | Circular material use rate | % | 2010→2023 | Eurostat cei_srm030 |
| A-T1 | Average CO₂ of new cars (WLTP) | g CO₂/km | 2021→2023 | EEA |
| A-T2 | BEV share of new cars | % | 2020→2025 | ACEA / EAFO |
| A-T3 | Renewable energy in transport | % | 2021→2024 | Eurostat SHARES |
| A-T4 | Rail share of inland freight | % | 2016→2022 | Eurostat tran_hv_frmod |
| A-B1 | Inability to keep home adequately warm | % | 2012→2024 | Eurostat sdg_07_60 |
| A-B2 | Annual heat pump sales (Europe) | m units/yr | 2016→2023 | EHPA (rolling panel) |
| A-A1 | Organic farming area share | % UAA | 2012, 2022 | Eurostat org_cropar |
| A-A2 | Gross nitrogen balance | kg N/ha | 2002, 2014 (period avg) | Eurostat aei_pr_gnb |
| A-L1 | Net LULUCF sink | Mt CO₂e | 2021→2023 (1991– context) | EEA GHG inventory |
| A-L2 | Forest carbon sink (declining) | Mt CO₂e | 2012/2017/2021 (5-yr avg) | **Nature 2025** (Migliavacca et al.) |
| A-L3 | Drained-peatland emissions | Mt CO₂ | 2019, 2023 | **Nat. Commun. 2025** + inventory |

## Advanced adaptation indicators (group `advanced-adaptation`, EUCRA-anchored)

| Code | Indicator | Unit | Best historic span | Source / paper |
|---|---|---|---|---|
| A-X1 | Economic losses from climate extremes | €bn/yr (decadal) | 1980s→2020–23 | EEA / Munich Re NatCatSERVICE |
| A-X2 | Global mean temperature anomaly (driver) | °C vs 1850–1900 | 2010→2024 | Copernicus C3S / EEA |
| A-X3 | Mean sea-level rise (altimetry) | mm since 1993 | 1993→2024 | Copernicus C3S / Marine |
| A-X4 | Heat-related mortality (Europe) | deaths/yr | 2003, 2022→2024 | **Nature Medicine** (Ballester et al.) |
| A-X5 | West Nile virus locally-acquired cases | cases/yr | 2018→2024 | ECDC; **Nat. Commun. 2024** |
| A-X6 | Area burnt by wildfires (EU) | ha/yr | 2017→2025 | JRC EFFIS |
| A-X7 | Water Exploitation Index Plus | % | 2000, 2018→2022 | EEA / Eurostat sdg_06_60 |
| A-X8 | Crop-loss severity (drought/heat) | % yield loss | period avgs | **ERL 2021** (Brás et al.) |
| A-X9 | Forest canopy mortality | index | period avgs | **Nat. Commun. 2021** (Forzieri et al.); ESSD 2025 |
| A-X10 | Cooling degree days (EU) | CDD index | 1979→2022 | Eurostat nrg_chdd_a |
| A-X11 | Coastal-flood damage to transport | €M/yr | 2020 baseline + scenarios | **Nature Climate Change 2025** |
| A-X12 | Expected annual river-flood damage | €bn/yr | present baseline + scenarios | JRC PESETA IV |
| A-X13 | Insurance protection gap | % uninsured | recent | EEA / EIOPA |
| A-X14 | Cities with adaptation plans | % (up=better) | 2022 | Covenant of Mayors / EEA |

## Flagship science-literature additions

- **The declining EU forest carbon sink** — Migliavacca, Grassi, Bastos et al.,
  *Nature* 643:1203–1213 (2025). The forest sink weakened ≈27% from the 2010–14
  to the 2020–22 average. Paired with the net-LULUCF-sink alarm indicator (the
  −310 Mt 2030 target is currently far off track).
- **Drained-peatland emission hotspots** — *Nature Communications* (2025);
  inventories may under-report by 59–113 Mt CO₂e/yr.
- **Crop-loss severity tripled** — Brás et al., *Environmental Research Letters*
  16:065012 (2021).
- **Coastal-flood risk to European transport** — *Nature Climate Change* (2025).
- **Climate-driven West Nile expansion** — *Nature Communications* (2024),
  paired with the ECDC autochthonous-case series.
- **Heat-related mortality** — the Nature Medicine 2022/2023/2024 trio.

## Provenance

The indicator set was assembled from a multi-stream web-research sweep
(June 2026) across the six sectors and a dedicated cross-sector adaptation
stream, prioritising the longest, cleanest annual series and recent
Nature-family literature. Numbers are research-verified anchor values; before
any of these is treated as a fully row-complete series, re-pull from the dataset
code named in each indicator's `description`.
