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
      'BETA. Share of fossil fuels (solid, oil, gas) in EU-27 gross available energy — the headline measure of fossil-fuel phase-out across the whole energy system. Only research-confirmed years are included (2019–2022; 2021 = 70%, 2022 = 70.9% per Eurostat releases). Re-pull the full series from Eurostat nrg_ind_ffgae (SDG sdg_07_10) to extend it.',
    source: 'Eurostat (nrg_ind_ffgae / sdg_07_10)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ffgae/default/table?lang=en',
    direction: 'down',
    group: 'beta',
    beta: true,
    isSeed: true,
    data: [
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
      'BETA. GDP (chain-linked, ref. 2015) per kg of domestic material consumption — the headline material-efficiency / circularity measure. Only the research-confirmed endpoints are included: EUR 2.04/kg (2018) → 2.23/kg (2023), +9.2%. Re-pull the intermediate years from Eurostat sdg_12_20 / env_ac_rp.',
    source: 'Eurostat (env_ac_rp / sdg_12_20)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/sdg_12_20/default/table?lang=en',
    direction: 'up',
    group: 'beta',
    beta: true,
    isSeed: true,
    data: [
      { year: 2018, value: 2.04 },
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
      'BETA. EU-27 final energy consumption of the transport sector — proxy for demand for energy-intensive transport (transport ≈ 32% of EU final energy). Research-anchored years only: ~315 Mtoe pre-pandemic peak (2019), ~275 in the 2020 COVID trough (≈−13%), ~300 in 2022–23. Values are approximate; scope (domestic vs incl. international bunkers) and exact PJ should be confirmed against Eurostat nrg_bal_c before promotion.',
    source: 'Eurostat (nrg_bal_c — transport detailed statistics)',
    sourceUrl: 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Final_energy_consumption_in_transport_-_detailed_statistics',
    direction: 'down',
    group: 'beta',
    beta: true,
    isSeed: true,
    data: [
      { year: 2019, value: 315 },
      { year: 2020, value: 275 },
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
      'BETA. Combined net GHG emissions from the Cropland (CRF 4.B) and Grassland (4.C) LULUCF categories (positive = net source) — proxy for reducing emissions within land-use categories. The two recent points are a research-derived magnitude: EEA reports cropland+grassland+wetlands as a net source of ~70 Mt/yr and, with wetlands ≈8.8 Mt, the cropland+grassland residual is ~55–60 Mt (cropland dominates). Sign and magnitude are reliable; exact per-category EU-27 values should be re-pulled from the EEA land-use data table.',
    source: 'EEA GHG inventory / UNFCCC CRF (4.B + 4.C)',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis/indicators/greenhouse-gas-emissions-from-land',
    direction: 'down',
    group: 'beta',
    beta: true,
    isSeed: true,
    data: [
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
      { year: 2022, value: 8.8 },
      { year: 2023, value: 8.8 },
    ],
  },
];

// ── Beta adaptation / resilience indicators ───────────────────────────────────
// Sector-fitting climate-resilience series, organised around the EEA European
// Climate Risk Assessment (EUCRA, 2024) risk clusters and powering each sector's
// adaptation sub-framework in the "Flow charts (beta)" view. Where the platform
// already carries a fitting adaptation series from the ECNO tracker, the flow
// charts link to that id instead of duplicating it here:
//   • water-exploitation-index  (WEI+ / water scarcity — energy, industry, agri)
//   • climate-economic-losses   (losses from weather & climate extremes)
// Some of these series are clean annual EU records (cooling degree days, EFFIS
// burnt area, drought impact); others are recent point estimates, scenario
// baselines (coastal transport / energy drought damage) or structural snapshots
// (rail network at risk, flood-prone population, insurance gap). That is flagged
// per indicator and is exactly why they ship as beta.
export const BETA_ADAPTATION_INDICATORS: Indicator[] = [
  {
    id: 'beta-adapt-cooling-degree-days',
    code: 'CDDβ',
    name: 'Cooling degree days (EU-27)',
    category: 'adaptation',
    unit: 'CDD index',
    description:
      'BETA (adaptation). Cooling degree days — climate-driven cooling demand and heat stress on the energy system and buildings. EEA/Eurostat publish a clean annual EU series from 1979 with a clear rising trend (recent years well above the 1979–2020 baseline). EU long-run average ≈ 75; 2020 = 99, 2022 = 140 (the 2022 heat year). Re-pull the full EU27_2020 series from Eurostat nrg_chdd_a (indic_nrg=CDD).',
    source: 'Eurostat (nrg_chdd_a) / EEA Cooling degree days',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis/maps-and-charts/cooling-degree-days',
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
      'BETA (adaptation). Modelled heat-related excess deaths during the European summer — the core human-resilience / overheating outcome for buildings & health (EUCRA "health" cluster, heat flagged most urgent). > 70,000 in the 2003 heatwave (Robine et al.); ≈ 61,700 (2022), ≈ 47,700 (2023), ≈ 62,800 (2024) (Ballester/Masselot et al., Nature Medicine; EEA European Climate & Health Observatory). Modelled estimates covering ~32–35 European countries (not strictly EU-27) on shifting methods, so treat as event markers rather than a smooth trend; cooling degree days is the cleaner annual companion.',
    source: 'Robine et al. 2008; Nature Medicine; EEA Climate-ADAPT',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis/maps-and-charts/trends-in-heat-related-mortality',
    direction: 'down',
    group: 'beta-adaptation',
    beta: true,
    isSeed: true,
    data: [
      { year: 2003, value: 70000 },
      { year: 2022, value: 61672 },
      { year: 2023, value: 47690 },
      { year: 2024, value: 62775 },
    ],
  },
  {
    id: 'beta-adapt-burnt-area',
    code: 'FIREβ',
    name: 'Annual area burnt by wildfires (EU-27)',
    category: 'adaptation',
    unit: 'hectares',
    description:
      'BETA (adaptation). Area burnt by wildfires each year — the canonical EU forest-climate indicator and a clean annual EFFIS series (EU-27), confirmed anchor years: 2017 ≈ 988,427 ha (severe Iberian season); 2021 ≈ 500,566; 2022 ≈ 748,426; 2023 ≈ 468,289; 2024 ≈ 383,317; 2025 ≈ 1,079,538 ha (the most destructive EU season since 2006). 17-year (2006–2024) average ≈ 354,185 ha. Highly volatile year-to-year — read with a multi-year mean. Intermediate years (2006–2016, 2018–2020) are on the EFFIS portal and should be exported to complete the series.',
    source: 'JRC EFFIS (European Forest Fire Information System)',
    sourceUrl: 'https://forest-fire.emergency.copernicus.eu/apps/effis.statistics/estimates',
    direction: 'down',
    group: 'beta-adaptation',
    beta: true,
    isSeed: true,
    data: [
      { year: 2017, value: 988427 },
      { year: 2021, value: 500566 },
      { year: 2022, value: 748426 },
      { year: 2023, value: 468289 },
      { year: 2024, value: 383317 },
      { year: 2025, value: 1079538 },
    ],
  },
  {
    id: 'beta-adapt-drought-impact',
    code: 'DRGTβ',
    name: 'EU ecosystem area impacted by drought',
    category: 'adaptation',
    unit: 'km²',
    description:
      'BETA (adaptation). EU ecosystem area with drought-driven below-average productivity — EEA 8th EAP headline indicator "drought impact on ecosystems" (Copernicus EDO Soil Moisture Index), a clean annual EU series 2000–2024. 2024 ≈ 143,513 km², just above the 2000–2020 average of ≈ 141,229 km² (≈3.5% of EU land); of 2000–2024, 12 years exceeded the median, 8 of them after 2010 (rising trend). Cropland-only impact was ≈ 66,500 km² in 2023. Pull the full annual bars from the EEA viewer to complete the series.',
    source: 'EEA 8th EAP / Copernicus European Drought Observatory (Soil Moisture Index)',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis/indicators/drought-impact-on-ecosystems-in-europe',
    direction: 'down',
    group: 'beta-adaptation',
    beta: true,
    isSeed: true,
    data: [
      { year: 2024, value: 143513 },
    ],
  },
  {
    id: 'beta-adapt-rail-disruption',
    code: 'RAILβ',
    name: 'EU rail network reporting rising extreme-weather impacts',
    category: 'adaptation',
    unit: '% of network (track-km)',
    description:
      'BETA (adaptation) — the best genuinely transport-specific EU resilience signal (replaces the earlier generic flood-exposure proxy). 70% of EU rail infrastructure managers report increasing extreme-weather impacts, covering ≈ 79% of the EU network by track-km; cumulative weather-related rail delay over 2015–2024 ≈ the equivalent of 1–3 full years of EU railway service (EEA TERM; EU Agency for Railways). Floods, windstorms and landslides are the most disruptive hazards. A clean per-year series is not yet public — treat as a structural exposure indicator.',
    source: 'EEA Transport & Environment Reporting Mechanism (TERM); EU Agency for Railways',
    sourceUrl: 'https://www.eea.europa.eu/highlights/europe2019s-transport-network-vulnerable-to',
    direction: 'down',
    group: 'beta-adaptation',
    beta: true,
    isSeed: true,
    data: [
      { year: 2024, value: 79 },
    ],
  },
  {
    id: 'beta-adapt-flood-prone-population',
    code: 'FLOODβ',
    name: 'Population in potential flood-prone areas (EU)',
    category: 'adaptation',
    unit: '% of population',
    description:
      'BETA (adaptation). Share of the population living in potential flood-prone areas — a built-environment resilience measure (EUCRA "infrastructure" cluster). ≈ 12% of Europe’s population (≈ 52 million people) in 2021, highest in DE, FR and IT (EEA / European Climate & Health Observatory). A recent point estimate, updated infrequently rather than a long annual series.',
    source: 'EEA / European Climate & Health Observatory',
    sourceUrl: 'https://climate-adapt.eea.europa.eu/en/observatory/publications-data/analysis-data/exposure-to-potential-flood-prone-areas',
    direction: 'down',
    group: 'beta-adaptation',
    beta: true,
    isSeed: true,
    data: [
      { year: 2021, value: 12 },
    ],
  },
  {
    id: 'beta-adapt-insurance-gap',
    code: 'INSβ',
    name: 'Climate insurance protection gap (EU)',
    category: 'adaptation',
    unit: '% of losses uninsured',
    description:
      'BETA (adaptation). Share of weather- and climate-related losses that are uninsured — the economy & finance resilience measure (EUCRA "economy & finance" cluster; Climate Resilience Dialogue). Only ≈ a quarter to a third of EU climate losses are insured, so roughly 70% are uninsured; most Member States are >50% uninsured and many >90%, and the gap is widening (EEA / EIOPA dashboard). Context: EUR 738 bn of losses 1980–2023, of which EUR 162 bn in 2021–2023 alone.',
    source: 'EEA / EIOPA insurance protection gap dashboard',
    sourceUrl: 'https://www.eea.europa.eu/en/europe-environment-2025/main-report/insurance-protection-gap-for',
    direction: 'down',
    group: 'beta-adaptation',
    beta: true,
    isSeed: true,
    data: [
      { year: 2024, value: 70 },
    ],
  },
  {
    id: 'beta-adapt-transport-coastal-damage',
    code: 'COASTβ',
    name: 'Expected annual flood damage to EU coastal transport',
    category: 'adaptation',
    unit: '€ million/yr',
    description:
      'BETA (adaptation). Expected annual damage to European surface transport infrastructure from coastal flooding — a genuinely transport-specific EUCRA "infrastructure" measure. Baseline (1980–2020) ≈ €722 M/yr with ≈ 1,592 km of network affected per year, rising to ≈ €1,108 M/yr at +1.5 °C and ≈ €1,487 M/yr at +4 °C (Nature Climate Change, 2025). Inland flooding of population & infrastructure is one of EUCRA’s 8 most-urgent risks. Baseline + warming-level projection, not an observed annual series.',
    source: 'Nature Climate Change (2025); EEA EUCRA',
    sourceUrl: 'https://www.nature.com/articles/s41558-025-02510-y',
    direction: 'down',
    group: 'beta-adaptation',
    beta: true,
    isSeed: true,
    data: [
      { year: 2020, value: 722 },
    ],
  },
  {
    id: 'beta-adapt-energy-drought-damage',
    code: 'EDRβ',
    name: 'Drought-related damage to the EU energy sector',
    category: 'adaptation',
    unit: '€ billion/yr',
    description:
      'BETA (adaptation). Climate-driven drought damage to the energy sector (reduced thermal & hydropower output and cooling-water availability) — EEA flags energy as the sector with the largest projected increase in climate damage. JRC PESETA IV: ≈ €1.4 bn/yr today rising to ≈ €3.3 bn/yr at +3 °C (Mediterranean + Atlantic), with southern-Europe hydropower changing −18% to +9%. Scenario estimate, not an observed annual series; cooling degree days is the companion live tracker.',
    source: 'JRC PESETA IV (energy supply)',
    sourceUrl: 'https://joint-research-centre.ec.europa.eu/projects-and-activities/peseta-climate-change-projects/jrc-peseta-iv/energy-supply_en',
    direction: 'down',
    group: 'beta-adaptation',
    beta: true,
    isSeed: true,
    data: [
      { year: 2020, value: 1.4 },
    ],
  },
];

/** All beta indicators (mitigation + adaptation), for index/seed convenience. */
export const ALL_BETA_INDICATORS: Indicator[] = [
  ...BETA_INDICATORS,
  ...BETA_ADAPTATION_INDICATORS,
];
