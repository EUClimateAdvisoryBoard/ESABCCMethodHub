/**
 * Beta indicators — provisional progress indicators added on top of the
 * ESABCC report set so that *every* mitigation lever and outcome in the
 * sector assessment-framework flow charts (src/data/sector-frameworks.ts)
 * has at least one linked time series, and so the "Flow charts (beta)" view
 * can carry an adaptation-and-resilience layer.
 *
 * Two arrays:
 *  • BETA_INDICATORS            — new mitigation indicators (group 'beta')
 *  • BETA_ADAPTATION_INDICATORS — climate-adaptation / resilience indicators
 *                                 (group 'beta-adaptation')
 *
 * IMPORTANT — these are flagged `beta: true` on purpose. The SOURCES are real
 * (Eurostat, EEA, JRC/EFFIS, IEA, EU Building Stock Observatory, ECNO) but the
 * SERIES are best-available: some years are interpolated or rounded from news
 * releases / Statistics Explained summaries rather than re-pulled from the live
 * datasets, and a few (CCS capacity, nZEB share, LULUCF per-category fluxes)
 * are genuinely sparse. Each `description` records the confidence and the exact
 * dataset to re-pull before any of these is promoted out of beta.
 *
 * Where the platform already carries a fitting series (ECNO progress-tracker
 * indicators such as `hydrogen-electrolyser-capacity`, `cattle-population`,
 * `household-energy-per-capita`, `water-exploitation-index`,
 * `climate-economic-losses`, `national-adaptation-strategies`) the flow charts
 * link to that existing id rather than duplicating it here.
 */
import type { Indicator } from './ecno-indicators';

// ── New mitigation indicators (one per previously-unlinked lever/outcome) ─────
export const BETA_INDICATORS: Indicator[] = [
  // Energy supply ─────────────────────────────────────────────────────────────
  {
    id: 'beta-fossil-share-gae',
    code: 'E7β',
    name: 'Fossil fuels share of gross available energy',
    category: 'energy-supply',
    unit: '%',
    description:
      'BETA. Share of fossil fuels (solid, oil, gas) in EU-27 gross available energy — the headline measure of fossil-fuel phase-out across the whole energy system. 2021 = 70%, 2022 = 70.9% confirmed from Eurostat releases; 2015–2020 rounded from the published series. Re-pull from Eurostat nrg_ind_ffgae (SDG sdg_07_10) before promotion.',
    source: 'Eurostat (nrg_ind_ffgae / sdg_07_10)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ffgae/default/table?lang=en',
    direction: 'down',
    group: 'beta',
    beta: true,
    isSeed: true,
    data: [
      { year: 2015, value: 73 },
      { year: 2018, value: 72 },
      { year: 2019, value: 71 },
      { year: 2020, value: 70 },
      { year: 2021, value: 70 },
      { year: 2022, value: 70.9 },
    ],
  },
  {
    id: 'beta-ccs-capacity',
    code: 'E8β',
    name: 'Operational CO₂ capture & storage capacity (EU)',
    category: 'energy-supply',
    unit: 'Mt CO₂/yr',
    description:
      'BETA. Operational CO₂ capture-and-storage injection capacity within the EU-27. Currently near zero — the Ravenna (IT) pilot (~25 kt/yr ≈ 0.03 Mt) is the only operational EU injection in 2024; Porthos (NL, 2.5 Mt) and Greensand (DK) start from 2026. Norway (Northern Lights, Sleipner, Snøhvit) is non-EU and excluded. Net-Zero Industry Act target: 50 Mt/yr injection by 2030. Re-pull from the IEA CCUS Projects Explorer / Global CCS Institute CO2RE.',
    source: 'IEA CCUS Projects Database / Global CCS Institute (CO2RE)',
    sourceUrl: 'https://www.iea.org/data-and-statistics/data-tools/ccus-projects-explorer',
    direction: 'up',
    targetValue: 50,
    targetYear: 2030,
    group: 'beta',
    beta: true,
    isSeed: true,
    data: [
      { year: 2023, value: 0.0 },
      { year: 2024, value: 0.03 },
    ],
  },
  {
    id: 'beta-energy-intensity',
    code: 'E9β',
    name: 'Energy intensity of the economy',
    category: 'energy-demand',
    unit: 'kgoe per 1000 EUR',
    description:
      'BETA. Gross available energy per unit of GDP (chain-linked volumes, 2015) — the core energy-efficiency outcome of the energy system. Sharp 2022 drop reflects the energy-crisis demand cut while GDP grew (cross-checked against Eurostat energy-productivity sdg_07_30, which rose to EUR 9.3/kgoe in 2022). Per-year digits should be re-pulled from Eurostat nrg_ind_ei (EI_GDP_CLV15).',
    source: 'Eurostat (nrg_ind_ei / sdg_07_30)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ei/default/table?lang=en',
    direction: 'down',
    group: 'beta',
    beta: true,
    isSeed: true,
    data: [
      { year: 2015, value: 120 },
      { year: 2018, value: 113 },
      { year: 2019, value: 110 },
      { year: 2020, value: 110 },
      { year: 2021, value: 108 },
      { year: 2022, value: 99 },
    ],
  },

  // Industry ───────────────────────────────────────────────────────────────────
  {
    id: 'beta-dmc-per-capita',
    code: 'I8β',
    name: 'Domestic material consumption per capita',
    category: 'industry',
    unit: 't/capita',
    description:
      'BETA. Domestic material consumption (DMC) per capita — proxy for product/material demand reduction. 2018 = 14.9, 2022 = 14.5 t/cap confirmed from Eurostat. NB: distinct from Raw Material Consumption / material footprint (sdg_12_21). Re-pull full series from Eurostat env_ac_mfa / ten00137.',
    source: 'Eurostat (env_ac_mfa / ten00137)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/ten00137/default/table?lang=en',
    direction: 'down',
    group: 'beta',
    beta: true,
    isSeed: true,
    data: [
      { year: 2018, value: 14.9 },
      { year: 2021, value: 14.4 },
      { year: 2022, value: 14.5 },
    ],
  },
  {
    id: 'beta-resource-productivity',
    code: 'I9β',
    name: 'Resource productivity (GDP / DMC)',
    category: 'industry',
    unit: 'EUR/kg',
    description:
      'BETA. GDP (chain-linked, ref. 2015) per kg of domestic material consumption — the headline material-efficiency / circularity measure. Confirmed endpoints: EUR 2.04/kg (2018) → 2.23/kg (2023), +9.2%. Intermediate years move roughly monotonically; re-pull from Eurostat sdg_12_20 / env_ac_rp.',
    source: 'Eurostat (env_ac_rp / sdg_12_20)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/sdg_12_20/default/table?lang=en',
    direction: 'up',
    group: 'beta',
    beta: true,
    isSeed: true,
    data: [
      { year: 2018, value: 2.04 },
      { year: 2020, value: 2.13 },
      { year: 2023, value: 2.23 },
    ],
  },

  // Transport ───────────────────────────────────────────────────────────────────
  {
    id: 'beta-transport-fec',
    code: 'T7β',
    name: 'Final energy consumption in transport',
    category: 'transport',
    unit: 'Mtoe',
    description:
      'BETA. EU-27 final energy consumption of the transport sector — proxy for demand for energy-intensive transport (transport ≈ 32% of EU final energy). ~315 Mtoe pre-pandemic peak (2019), ~275 in the 2020 COVID trough, ~300 in 2022–23. Scope (domestic vs incl. international bunkers) and exact PJ should be confirmed against Eurostat nrg_bal_c before promotion.',
    source: 'Eurostat (nrg_bal_c — transport detailed statistics)',
    sourceUrl: 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Final_energy_consumption_in_transport_-_detailed_statistics',
    direction: 'down',
    group: 'beta',
    beta: true,
    isSeed: true,
    data: [
      { year: 2019, value: 315 },
      { year: 2020, value: 275 },
      { year: 2021, value: 290 },
      { year: 2022, value: 300 },
      { year: 2023, value: 300 },
    ],
  },
  {
    id: 'beta-new-car-co2',
    code: 'T8β',
    name: 'Average CO₂ emissions of new passenger cars (WLTP)',
    category: 'transport',
    unit: 'g CO₂/km',
    description:
      'BETA. Average specific CO₂ emissions of newly-registered EU passenger cars — proxy for new-vehicle efficiency. Series shown on the WLTP basis (from 2021) to avoid the NEDC→WLTP methodology break: 2021 ≈ 116, 2022 = 108, 2023 = 106.4 g/km confirmed. (Earlier NEDC values: ~119.5 in 2015, ~107.5 in 2020 at the 95 g/km milestone.) New cars must be zero-emission from 2035 (Reg. (EU) 2023/851).',
    source: 'EEA — CO₂ monitoring of new passenger cars',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis/indicators/co2-performance-of-new-passenger',
    direction: 'down',
    targetValue: 0,
    targetYear: 2035,
    group: 'beta',
    beta: true,
    isSeed: true,
    data: [
      { year: 2021, value: 116 },
      { year: 2022, value: 108 },
      { year: 2023, value: 106.4 },
    ],
  },

  // Buildings ───────────────────────────────────────────────────────────────────
  {
    id: 'beta-nzeb-new-share',
    code: 'B7β',
    name: 'Share of new dwellings built to nZEB / class-A standard',
    category: 'buildings',
    unit: '%',
    description:
      'BETA — SPARSE / LOW CONFIDENCE. Share of new residential dwellings meeting the nearly-zero-energy / highest energy-performance (class A) standard, proxy for zero-emission new builds. No clean continuous EU-27 series exists; ZEBRA2020 estimated ~1–2% in the mid-2010s. De jure all new buildings must be nZEB from 2021 and zero-emission from 2030 (EPBD recast 2024). Display as indicative only; re-aggregate from the EU Building Stock Observatory.',
    source: 'EU Building Stock Observatory / ZEBRA2020',
    sourceUrl: 'https://building-stock-observatory.energy.ec.europa.eu/database/',
    direction: 'up',
    targetValue: 100,
    targetYear: 2030,
    group: 'beta',
    beta: true,
    isSeed: true,
    data: [
      { year: 2014, value: 1 },
      { year: 2016, value: 2 },
    ],
  },

  // LULUCF ───────────────────────────────────────────────────────────────────────
  {
    id: 'beta-cropland-grassland-flux',
    code: 'L9β',
    name: 'Net GHG flux from cropland & grassland (LULUCF)',
    category: 'lulucf',
    unit: 'Mt CO₂e',
    description:
      'BETA. Combined net GHG emissions from the Cropland (CRF 4.B) and Grassland (4.C) LULUCF categories (positive = net source) — proxy for reducing emissions within land-use categories. EEA reports cropland+grassland+wetlands as a net source of ~70 Mt/yr; with wetlands ≈8.8 Mt the cropland+grassland residual is ~55–60 Mt (cropland dominates). Re-pull exact per-category EU-27 values from the EEA land-use data table.',
    source: 'EEA GHG inventory / UNFCCC CRF (4.B + 4.C)',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis/indicators/greenhouse-gas-emissions-from-land',
    direction: 'down',
    group: 'beta',
    beta: true,
    isSeed: true,
    data: [
      { year: 2021, value: 59 },
      { year: 2022, value: 58 },
      { year: 2023, value: 57 },
    ],
  },
  {
    id: 'beta-wetlands-flux',
    code: 'L10β',
    name: 'Net GHG emissions from wetlands (LULUCF)',
    category: 'lulucf',
    unit: 'Mt CO₂e',
    description:
      'BETA. Net GHG emissions from the Wetlands LULUCF category (CRF 4.D), EU-27 (positive = net source) — proxy for wetland conservation & restoration. ~8.8 Mt CO₂e/yr in recent years, relatively stable. Re-pull the full annual series (CRF 4.D) from the EEA land-use data table.',
    source: 'EEA GHG inventory / UNFCCC CRF (4.D Wetlands)',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis/indicators/greenhouse-gas-emissions-from-land',
    direction: 'down',
    group: 'beta',
    beta: true,
    isSeed: true,
    data: [
      { year: 2021, value: 8.9 },
      { year: 2022, value: 8.8 },
      { year: 2023, value: 8.8 },
    ],
  },
];

// ── Beta adaptation / resilience indicators ───────────────────────────────────
// Sector-specific climate-hazard / resilience series. Where the platform already
// carries a fitting adaptation series from the ECNO tracker, the flow charts link
// to that id instead of duplicating it here:
//   • water-exploitation-index      (WEI+ / water scarcity)
//   • climate-economic-losses       (losses from weather & climate extremes)
//   • national-adaptation-strategies (governance / EUCRA follow-up)
// Several of these adaptation series are genuinely sparse (snapshots, modelled
// baselines or multi-year averages rather than tidy annual EU-27 tables) — that
// is flagged per indicator and is exactly why they ship as beta.
export const BETA_ADAPTATION_INDICATORS: Indicator[] = [
  {
    id: 'beta-adapt-cooling-degree-days',
    code: 'CDDβ',
    name: 'Cooling degree days (EU-27)',
    category: 'adaptation',
    unit: 'CDD index',
    description:
      'BETA (adaptation). Cooling degree days — climate-driven cooling demand and heat stress on the energy system and buildings. EU long-run average ≈ 75; 2020 = 99, 2022 = 140 confirmed from Eurostat Statistics Explained (the 2022 heat year). Re-pull the full EU27_2020 annual series from Eurostat nrg_chdd_a (indic_nrg=CDD).',
    source: 'Eurostat (nrg_chdd_a, JRC-MARS meteorology)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/nrg_chdd_a/default/table',
    direction: 'down',
    group: 'beta-adaptation',
    beta: true,
    isSeed: true,
    data: [
      { year: 2020, value: 99 },
      { year: 2022, value: 140 },
    ],
  },
  {
    id: 'beta-adapt-heat-mortality',
    code: 'HEATβ',
    name: 'Heat-related mortality (Europe, summer)',
    category: 'adaptation',
    unit: 'deaths/yr (summer)',
    description:
      'BETA (adaptation). Modelled heat-related excess deaths during the European summer — a core human-resilience / overheating outcome for buildings. 2022 ≈ 61,700; 2023 ≈ 47,700; 2024 ≈ 62,800 (Ballester/ISGlobal, Nature Medicine; tracked by the EEA European Climate & Health Observatory). NB: covers 32–35 European countries, not strictly EU-27; baselines differ slightly between annual papers.',
    source: 'ISGlobal / Nature Medicine; EEA Climate-ADAPT',
    sourceUrl: 'https://climate-adapt.eea.europa.eu/en/observatory/news-archive-observatory/over-62-700-deaths-associated-with-record-breaking-heat-during-the-summer-of-2024-in-europe',
    direction: 'down',
    group: 'beta-adaptation',
    beta: true,
    isSeed: true,
    data: [
      { year: 2022, value: 61672 },
      { year: 2023, value: 47690 },
      { year: 2024, value: 62775 },
    ],
  },
  {
    id: 'beta-adapt-burnt-area',
    code: 'FIREβ',
    name: 'Annual area burnt by wildfires (EU)',
    category: 'adaptation',
    unit: 'hectares',
    description:
      'BETA (adaptation). Area burnt by wildfires each year, the only true annual fire-disturbance series for EU forests (JRC EFFIS, fires > 30 ha). 2017 = 988,427 ha; 2021 = 500,566; 2022 = 837,212; 2023 = 504,002 ha confirmed from EFFIS reports; 2020 ≈ 340,000 ha approximate. "EU" vs "EU-27" coverage varies by report — extract the full table from the EFFIS statistics portal (.xls).',
    source: 'JRC EFFIS (European Forest Fire Information System)',
    sourceUrl: 'https://forest-fire.emergency.copernicus.eu/apps/effis.statistics/estimates',
    direction: 'down',
    group: 'beta-adaptation',
    beta: true,
    isSeed: true,
    data: [
      { year: 2017, value: 988427 },
      { year: 2020, value: 340000 },
      { year: 2021, value: 500566 },
      { year: 2022, value: 837212 },
      { year: 2023, value: 504002 },
    ],
  },
  {
    id: 'beta-adapt-drought-area',
    code: 'DRGTβ',
    name: 'EU territory under drought warning/alert (peak)',
    category: 'adaptation',
    unit: '% of area (peak)',
    description:
      'BETA (adaptation) — ILLUSTRATIVE / SPARSE. Share of European territory in Combined Drought Indicator "warning + alert" classes (JRC European Drought Observatory). The robustly documented anchor is the August-2022 peak: ~47% warning + ~17% alert ≈ 64% — the most severe drought in ≥500 years. EDO publishes 10-day maps, not an annual series; treat this as a documented peak, not a trend line.',
    source: 'JRC European Drought Observatory (Combined Drought Indicator)',
    sourceUrl: 'https://drought.emergency.copernicus.eu/edov2/php/index.php?id=1052',
    direction: 'down',
    group: 'beta-adaptation',
    beta: true,
    isSeed: true,
    data: [
      { year: 2022, value: 64 },
    ],
  },
  {
    id: 'beta-adapt-flood-exposure',
    code: 'FLOODβ',
    name: 'Population exposed to river flooding (EU baseline)',
    category: 'adaptation',
    unit: 'people/yr',
    description:
      'BETA (adaptation) — BASELINE, not an observed trend. Modelled population annually exposed to river flooding in Europe under current climate ≈ 172,000 people/yr (plus ~100,000/yr to coastal flooding). No-adaptation projections rise to ~252,000 (1.5°C), ~338,000 (2°C), ~484,000 (3°C) by ~2100 (JRC PESETA IV; EEA EUCRA 2024). Present as a baseline/scenario indicator.',
    source: 'JRC PESETA IV / EEA European Climate Risk Assessment (EUCRA)',
    sourceUrl: 'https://climate-adapt.eea.europa.eu/en/eu-adaptation-policy/key-eu-actions/european-climate-risk-assessment',
    direction: 'down',
    group: 'beta-adaptation',
    beta: true,
    isSeed: true,
    data: [
      { year: 2020, value: 172000 },
    ],
  },
  {
    id: 'beta-adapt-forest-disturbance',
    code: 'FORβ',
    name: 'Forest area affected by natural disturbances (Europe)',
    category: 'adaptation',
    unit: 'million m³ wood/yr',
    description:
      'BETA (adaptation) — STRUCTURAL / SPARSE. Wood volume damaged by natural disturbances (storms, fire, drought, insects/pathogens) in European forests, the primary published metric — last-20-year average ≈ 80 million m³/yr, up from ~52–62 m³/yr over 1950–2020 (JRC European Forest Disturbance Atlas; FOREST EUROPE State of Europe’s Forests). 2015 storms alone damaged ~1.76 million ha. Reported as multi-year averages, not a tidy annual EU-27 table.',
    source: 'JRC European Forest Disturbance Atlas / FOREST EUROPE; EEA FISE',
    sourceUrl: 'https://forest.eea.europa.eu/topics/health/threats',
    direction: 'down',
    group: 'beta-adaptation',
    beta: true,
    isSeed: true,
    data: [
      { year: 2020, value: 80 },
    ],
  },
];

/** All beta indicators (mitigation + adaptation), for index/seed convenience. */
export const ALL_BETA_INDICATORS: Indicator[] = [
  ...BETA_INDICATORS,
  ...BETA_ADAPTATION_INDICATORS,
];
