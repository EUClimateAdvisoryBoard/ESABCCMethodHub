/**
 * Advanced indicators — the curated, high-quality indicator set behind the
 * "Advanced version 1" flow chart.
 * --------------------------------------------------------------------------
 * Where the `beta-indicators.ts` set was explicitly provisional (sources real,
 * series best-available), this set is the opposite by design: every entry is
 * chosen for the LENGTH and QUALITY of its historic series and is drawn from a
 * primary statistical publisher (EEA, Eurostat, EMBER, EAFO/ACEA, EHPA, JRC,
 * Copernicus, EFFIS, ECDC, EIOPA) or the peer-reviewed literature (Nature,
 * Nature Climate Change, Nature Medicine, Nature Communications, Nature Food,
 * Environmental Research Letters, ESSD, the Lancet Countdown).
 *
 * Two arrays:
 *  • ADVANCED_INDICATORS            — high-quality MITIGATION indicators
 *                                     (group 'advanced')
 *  • ADVANCED_ADAPTATION_INDICATORS — high-quality climate-ADAPTATION &
 *                                     resilience indicators, anchored in the
 *                                     EEA European Climate Risk Assessment
 *                                     (EUCRA 2024) risk clusters
 *                                     (group 'advanced-adaptation')
 *
 * HONESTY NOTES (what "high quality" does and does not mean here)
 *  • Each `data` array contains research-verified anchor values. Several long
 *    series (Eurostat/EEA/EMBER/EFFIS) are published as complete annual tables
 *    but the live portals block automated extraction, so where a value could
 *    only be cross-confirmed for specific years those years are included and
 *    the `description` names the exact dataset code to export for the gap
 *    years. No value is invented.
 *  • A few flagship SCIENCE-LITERATURE indicators are published as multi-decade
 *    period averages rather than single years (e.g. the declining EU forest
 *    carbon sink, Nature 2025; crop-loss severity, Brás et al. 2021). These are
 *    rendered as a small number of stepped points whose mid-period year is used
 *    as the x-value; the `description` says so explicitly.
 *  • Warming-level / scenario projections (e.g. the Nature Climate Change 2025
 *    coastal-transport damage figures, JRC PESETA IV flood damage) are shown as
 *    a present-day baseline point with the projected levels stated in the
 *    description — they are NOT observed annual trends.
 *  • Scope is EU-27 unless the description says otherwise; some health and
 *    hazard series cover "Europe" (~32–38 countries) and that is flagged.
 */
import type { Indicator } from './ecno-indicators';

// ── High-quality mitigation indicators (group 'advanced') ─────────────────────
export const ADVANCED_INDICATORS: Indicator[] = [
  // Energy supply ──────────────────────────────────────────────────────────────
  {
    id: 'adv-res-share-fec',
    code: 'A-E1',
    name: 'Renewable share of gross final energy consumption',
    category: 'energy-supply',
    unit: '%',
    description:
      'ADVANCED. Renewable energy share of EU-27 gross final energy consumption — the EU SDG 7 / 8th EAP headline energy-transition indicator and one of the cleanest long series available (annual since 2004). Verified anchors: 2004 = 9.6%, 2014 = 16.0%, 2015 = 16.7%, 2020 = 22.1%, 2021 = 21.9%, 2022 = 23.0%, 2023 = 24.5%, 2024 = 25.2%. Binding RED III target 42.5% (indicative 45%) by 2030. Re-pull the gap years 2005–2013 / 2016–2019 from Eurostat nrg_ind_ren (sdg_07_40); note the 15-year hydro-normalisation gives 2004 = 9.6% vs 8.5% in legacy series.',
    source: 'Eurostat (nrg_ind_ren / sdg_07_40, SHARES)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table?lang=en',
    direction: 'up',
    targetValue: 42.5,
    targetYear: 2030,
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2004, value: 9.6 },
      { year: 2014, value: 16.0 },
      { year: 2015, value: 16.7 },
      { year: 2020, value: 22.1 },
      { year: 2021, value: 21.9 },
      { year: 2022, value: 23.0 },
      { year: 2023, value: 24.5 },
      { year: 2024, value: 25.2 },
    ],
  },
  {
    id: 'adv-wind-solar-share',
    code: 'A-E2',
    name: 'Wind & solar share of electricity generation',
    category: 'energy-supply',
    unit: '%',
    description:
      'ADVANCED. Combined wind + solar share of EU-27 electricity generation — EMBER European Electricity Review flagship. Verified anchors: 2020 = 20%, 2024 = 29% (solar ≈ 11, wind ≈ 18), 2025 = 30% (solar ≈ 13, wind ≈ 17). 2025 was the first year wind+solar (30%) generated more EU electricity than fossil fuels (29%). EMBER "Yearly Electricity Data – Europe" holds the full 2000– annual series; re-pull to fill 2015–2023.',
    source: 'EMBER European Electricity Review (Yearly Electricity Data)',
    sourceUrl: 'https://ember-energy.org/latest-insights/european-electricity-review-2025/',
    direction: 'up',
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2020, value: 20 },
      { year: 2024, value: 29 },
      { year: 2025, value: 30 },
    ],
  },
  {
    id: 'adv-fossil-power-share',
    code: 'A-E3',
    name: 'Fossil-fuel share of electricity generation',
    category: 'energy-supply',
    unit: '%',
    description:
      'ADVANCED. Fossil-fuel share of EU-27 electricity generation — EMBER European Electricity Review. Verified anchors: 2019 = 39%, 2020 = 37%, 2024 = 29% (a record low at the time), 2025 = 29% (overtaken by wind+solar for the first time). The coal sub-share fell from ≈25% (2015) to ≈9% (2025). Re-pull 2021–2023 and the full coal/gas split from EMBER.',
    source: 'EMBER European Electricity Review',
    sourceUrl: 'https://ember-energy.org/latest-insights/european-electricity-review-2025/',
    direction: 'down',
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2019, value: 39 },
      { year: 2020, value: 37 },
      { year: 2024, value: 29 },
      { year: 2025, value: 29 },
    ],
  },
  {
    id: 'adv-grid-co2-intensity',
    code: 'A-E4',
    name: 'GHG emission intensity of electricity generation',
    category: 'energy-supply',
    unit: 'gCO₂e/kWh',
    description:
      'ADVANCED. Greenhouse-gas emission intensity of EU-27 electricity generation — EEA indicator (annual series back to 1990) cross-checked with EMBER. Verified anchors: 2020 = 230, 2022 = 292 (gas-crisis + low hydro/nuclear), 2023 = 242 (−17% YoY), 2024 ≈ 215 (≈40% below a decade ago, ≈62% below 1990). Re-pull the full 1990–2024 annual line from the EEA indicator download; reconcile the 2024 value (213 vs ~220 in different framings).',
    source: 'EEA "GHG emission intensity of electricity generation" / EMBER',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis/indicators/greenhouse-gas-emission-intensity-of-1',
    direction: 'down',
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2020, value: 230 },
      { year: 2022, value: 292 },
      { year: 2023, value: 242 },
      { year: 2024, value: 215 },
    ],
  },
  {
    id: 'adv-energy-methane',
    code: 'A-E5',
    name: 'Methane emissions from the energy sector',
    category: 'energy-supply',
    unit: 'Mt CO₂e',
    description:
      'ADVANCED. Energy-sector methane (CH₄) emissions, EU-27, from the EU GHG inventory (UNFCCC CRF) — long inventory series (1990–). Verified anchors: 1990 = 158 (fugitive 129 + combustion 29), 2020 = 64 (fugitive 43 + combustion 21), i.e. ≈ −60% since 1990 as coal mining and gas leakage fell. Increasingly policy-relevant under the 2024 EU Methane Regulation and the Global Methane Pledge (−30% all-sector by 2030 vs 2020). Re-pull 2010, 2015 and 2021–2023 from the EEA GHG data viewer.',
    source: 'EEA GHG inventory (UNFCCC CRF, energy-sector CH₄)',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis/maps-and-charts/methane-emission-trend-eu',
    direction: 'down',
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 1990, value: 158 },
      { year: 2020, value: 64 },
    ],
  },

  // Industry ────────────────────────────────────────────────────────────────────
  {
    id: 'adv-eu-ets-emissions',
    code: 'A-I1',
    name: 'EU ETS verified emissions (stationary installations)',
    category: 'industry',
    unit: 'Mt CO₂e',
    description:
      'ADVANCED. Verified emissions of stationary installations under the EU Emissions Trading System (power + industry) — the single best long decarbonisation series for the traded sectors (annual since 2005, EEA EU ETS data viewer / EUTL). Verified anchors: 2005 ≈ 2,100 (baseline; EEA harmonises 2005–2012 to current scope), 2020 = 1,253 (COVID dip), 2022 = 1,313, 2023 = 1,096 (−17% YoY, the largest-ever annual drop), 2024 = 1,033 (−6% YoY; ≈ −51% vs 2005). ETS cap implies −62% vs 2005 by 2030. Re-pull the full 2005–2024 annual series (and the power vs industry split) from the EEA viewer.',
    source: 'EEA EU ETS data viewer / Union Registry (EUTL)',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis/maps-and-charts/emissions-trading-viewer-1-dashboards',
    direction: 'down',
    targetValue: 800,
    targetYear: 2030,
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2005, value: 2100 },
      { year: 2020, value: 1253 },
      { year: 2022, value: 1313 },
      { year: 2023, value: 1096 },
      { year: 2024, value: 1033 },
    ],
  },
  {
    id: 'adv-circular-material-use',
    code: 'A-I2',
    name: 'Circular material use rate',
    category: 'industry',
    unit: '%',
    description:
      'ADVANCED. Circular material use rate (CMUR) — share of material demand met by recycled materials, EU-27 (Eurostat cei_srm030 / sdg_12_41, 8th EAP + SDG 12 headline, annual since 2010). Verified anchors: 2010 = 10.7%, 2018 = 11.6%, 2020 = 11.6%, 2021 = 11.4%, 2022 = 11.5%, 2023 = 11.8%. The Circular Economy Action Plan aimed to double CMUR by 2030. By material in 2023: metals ≈25%, minerals higher, fossil fuels ≈3%. Re-pull exact decimals for 2011–2017 / 2019 from Eurostat.',
    source: 'Eurostat (cei_srm030 / sdg_12_41)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/cei_srm030/default/table?lang=en',
    direction: 'up',
    targetValue: 23.4,
    targetYear: 2030,
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2010, value: 10.7 },
      { year: 2018, value: 11.6 },
      { year: 2020, value: 11.6 },
      { year: 2021, value: 11.4 },
      { year: 2022, value: 11.5 },
      { year: 2023, value: 11.8 },
    ],
  },

  // Transport ───────────────────────────────────────────────────────────────────
  {
    id: 'adv-new-car-co2',
    code: 'A-T1',
    name: 'Average CO₂ emissions of new passenger cars (WLTP)',
    category: 'transport',
    unit: 'g CO₂/km',
    description:
      'ADVANCED. Average specific CO₂ emissions of newly-registered EU passenger cars — the flagship EEA fleet-efficiency indicator. Shown on the WLTP basis (from 2021) to avoid the NEDC→WLTP methodology break: 2021 ≈ 116, 2022 = 108, 2023 = 106.4 g/km (the EEA reports a slight uptick in 2024). For context the earlier NEDC series fell from 2019 = 122.3 to 2020 = 107.5 g/km at the 95 g/km milestone. New cars must be zero-emission from 2035 (Reg. (EU) 2023/851). Plot NEDC and WLTP as two separate series; re-pull both from EEA SDG_13_31.',
    source: 'EEA — CO₂ performance of new passenger cars',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis/indicators/co2-performance-of-new-passenger',
    direction: 'down',
    targetValue: 0,
    targetYear: 2035,
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2021, value: 116 },
      { year: 2022, value: 108 },
      { year: 2023, value: 106.4 },
    ],
  },
  {
    id: 'adv-bev-share',
    code: 'A-T2',
    name: 'Battery-electric share of new car registrations',
    category: 'transport',
    unit: '% of new registrations',
    description:
      'ADVANCED. Battery-electric vehicle (BEV) share of new passenger-car registrations, EU (ACEA "fuel types" / EAFO). Verified anchors: 2020 = 10.5%, 2021 = 9.1%, 2022 = 12.1%, 2023 = 14.6%, 2024 = 13.6%, 2025 = 17.4% (full year). NB the apparent 2020→2021 dip is a scope artefact (EU-27 vs EU+EFTA+UK, BEV vs all-electrically-chargeable) — lock both years on one consistent EU-27 EAFO basis before promotion. Adding plug-in hybrids gives an electrically-chargeable share of ≈21% in 2024.',
    source: 'ACEA / EAFO (new-car fuel types)',
    sourceUrl: 'https://alternative-fuels-observatory.ec.europa.eu/transport-mode/road/european-union-eu27',
    direction: 'up',
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2020, value: 10.5 },
      { year: 2021, value: 9.1 },
      { year: 2022, value: 12.1 },
      { year: 2023, value: 14.6 },
      { year: 2024, value: 13.6 },
      { year: 2025, value: 17.4 },
    ],
  },
  {
    id: 'adv-res-transport',
    code: 'A-T3',
    name: 'Renewable energy share in transport',
    category: 'transport',
    unit: '%',
    description:
      'ADVANCED. Renewable energy share in EU-27 transport (RED accounting, Eurostat SHARES / nrg_ind_ren). Verified anchors: 2021 = 9.1%, 2022 = 9.6%, 2023 = 10.8%, 2024 = 11.2%. RED III target 29% by 2030 (or a 14.5% GHG-intensity reduction). The SHARES series runs back to 2004; re-pull 2004–2020 (note the RED I→II methodology change ≈2011 affects comparability).',
    source: 'Eurostat (SHARES / nrg_ind_ren, RES-T)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table?lang=en',
    direction: 'up',
    targetValue: 29,
    targetYear: 2030,
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2021, value: 9.1 },
      { year: 2022, value: 9.6 },
      { year: 2023, value: 10.8 },
      { year: 2024, value: 11.2 },
    ],
  },
  {
    id: 'adv-freight-rail-share',
    code: 'A-T4',
    name: 'Rail share of inland freight transport',
    category: 'transport',
    unit: '% of inland tonne-km',
    description:
      'ADVANCED. Rail share of EU-27 inland freight transport (Eurostat tran_hv_frmod) — proxy for the modal shift of freight off road. Verified anchors: 2016 = 6.0% (recent peak), 2020 = 5.3% (low), 2022 = 5.5%; inland waterways ≈ 1.6% (2022); road carries the ≈77% balance. "Inland" excludes maritime. Re-pull the full 2010–2023 road/rail/IWW split.',
    source: 'Eurostat (tran_hv_frmod)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/tran_hv_frmod/default/table?lang=en',
    direction: 'up',
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2016, value: 6.0 },
      { year: 2020, value: 5.3 },
      { year: 2022, value: 5.5 },
    ],
  },

  // Buildings ───────────────────────────────────────────────────────────────────
  {
    id: 'adv-energy-poverty',
    code: 'A-B1',
    name: 'Population unable to keep home adequately warm',
    category: 'buildings',
    unit: '% of population',
    description:
      'ADVANCED. Share of the EU-27 population unable to keep their home adequately warm (Eurostat sdg_07_60, from EU-SILC) — one of the best long social-climate series and the headline energy-poverty / just-transition measure. Verified anchors: 2012 = 11.2%, 2021 = 6.9% (low), 2022 = 9.3%, 2023 = 10.6% (energy-crisis spike), 2024 = 9.2% (partial recovery). Addressed by the Social Climate Fund and the EPBD recast. Re-pull intermediate years 2013–2020.',
    source: 'Eurostat (sdg_07_60 / ilc_mdes01)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/sdg_07_60/default/table?lang=en',
    direction: 'down',
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2012, value: 11.2 },
      { year: 2021, value: 6.9 },
      { year: 2022, value: 9.3 },
      { year: 2023, value: 10.6 },
      { year: 2024, value: 9.2 },
    ],
  },
  {
    id: 'adv-heat-pump-sales',
    code: 'A-B2',
    name: 'Annual heat pump sales (Europe)',
    category: 'buildings',
    unit: 'million units/yr',
    description:
      'ADVANCED — CAVEAT ON PANEL. Annual heat-pump sales (EHPA European Heat Pump Market Report). Verified anchors: 2016 ≈ 1.0 m, 2020 = 1.62 m, 2021 = 2.18 m (+34%), 2022 ≈ 3.0 m (record, +39%), 2023 ≈ 3.0 m (a consistent 14-country panel fell ≈5%), then a ≈21% drop in 2024 and a ≈11% rebound in 2025. IMPORTANT: EHPA covers a rolling panel of 14–21 European countries (NOT EU-27) and revises figures, so treat as indicative of momentum, not a fixed-panel EU-27 series. REPowerEU aspires to ≈10 m additional heat pumps 2022–2027.',
    source: 'EHPA European Heat Pump Market & Statistics Report',
    sourceUrl: 'https://ehpa.org/market-data/',
    direction: 'up',
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2016, value: 1.0 },
      { year: 2020, value: 1.62 },
      { year: 2021, value: 2.18 },
      { year: 2022, value: 3.0 },
      { year: 2023, value: 3.0 },
    ],
  },

  // Agriculture ─────────────────────────────────────────────────────────────────
  {
    id: 'adv-organic-farming',
    code: 'A-A1',
    name: 'Agricultural area under organic farming',
    category: 'agriculture',
    unit: '% of utilised agricultural area',
    description:
      'ADVANCED. Share of EU-27 utilised agricultural area (UAA) under organic farming (Eurostat org_cropar / EEA) — a clean, strongly rising series with a legal-strategy target. Verified endpoints: 2012 = 5.9%, 2022 ≈ 10.5% (16.9 M ha; +7.4 M ha / +79% over the decade). Highest shares: Austria 27%, Estonia 23%, Sweden 20% (2022). Farm-to-Fork / Organic Action Plan target 25% by 2030. Re-pull the monotonic intermediate years 2013–2023.',
    source: 'Eurostat (org_cropar) / EEA',
    sourceUrl: 'https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20240619-3',
    direction: 'up',
    targetValue: 25,
    targetYear: 2030,
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2012, value: 5.9 },
      { year: 2022, value: 10.5 },
    ],
  },
  {
    id: 'adv-nitrogen-balance',
    code: 'A-A2',
    name: 'Gross nitrogen balance (nitrogen surplus)',
    category: 'agriculture',
    unit: 'kg N/ha/yr',
    description:
      'ADVANCED. Gross nitrogen balance — nitrogen surplus on agricultural land (Eurostat aei_pr_gnb), a long agri-environmental series and a core proxy for nutrient-loss / fertiliser pressure. Verified period averages: ≈62.2 kg N/ha (2000–2003) → ≈51.1 kg N/ha (2012–2015), −18%; EU-27 ≈50 kg N/ha (2005–2008). Points below use the mid-period year as the x-value. Farm-to-Fork aims to cut nutrient losses ≥50% and fertiliser use ≥20% by 2030. Re-pull the full annual EU-27 series from aei_pr_gnb (some years have gaps).',
    source: 'Eurostat (aei_pr_gnb — gross nutrient balance)',
    sourceUrl: 'https://ec.europa.eu/eurostat/cache/metadata/en/aei_pr_gnb_esms.htm',
    direction: 'down',
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2002, value: 62.2 },
      { year: 2014, value: 51.1 },
    ],
  },

  // LULUCF ──────────────────────────────────────────────────────────────────────
  {
    id: 'adv-lulucf-net',
    code: 'A-L1',
    name: 'Net LULUCF emissions / removals',
    category: 'lulucf',
    unit: 'Mt CO₂e (negative = net sink)',
    description:
      'ADVANCED — FLAGSHIP. Net LULUCF emissions/removals, EU-27 (EU GHG inventory / UNFCCC CRF). The headline land-sink indicator and an "alarm" series: the sink has WEAKENED from a 1991–2013 average of ≈ −335 Mt CO₂e/yr to a 2014–2023 average of ≈ −198 Mt/yr (≈30% lower). Recent annual anchors: 2021 ≈ −230, 2022 ≈ −236, 2023 ≈ −256 (slight rebound, but the multi-year trend is still toward a weaker sink). The LULUCF Regulation requires a −310 Mt CO₂e net sink by 2030 — currently far off track. Re-pull the full 1990–2023 annual array from the EEA GHG data viewer.',
    source: 'EEA GHG inventory (UNFCCC CRF, LULUCF)',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis/indicators/greenhouse-gas-emissions-from-land',
    direction: 'down',
    targetValue: -310,
    targetYear: 2030,
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2021, value: -230 },
      { year: 2022, value: -236 },
      { year: 2023, value: -256 },
    ],
  },
  {
    id: 'adv-forest-sink-decline',
    code: 'A-L2',
    name: 'Net forest-land carbon sink (declining)',
    category: 'lulucf',
    unit: 'Mt CO₂e/yr (negative = net sink)',
    description:
      'ADVANCED — FLAGSHIP (Nature 2025). Net forest-land carbon sink, EU, from the EU GHG inventory and Migliavacca, Grassi, Bastos et al., "Securing the forest carbon sink for the European Union\'s climate ambition," Nature 643:1203–1213 (2025). Published as 5-year period averages (mid-period year used as x-value): 2010–2014 ≈ −456.9, 2015–2019 ≈ −374.9, 2020–2022 ≈ −332.6 Mt CO₂e/yr — a ≈ −27% weakening. Drivers: ageing stands, higher harvest/salvage logging, droughts, heat, insect outbreaks and fire. Re-pull the continuous annual forest-land flux from the EEA viewer if a yearly line is needed.',
    source: 'Nature 2025 (Migliavacca et al.) / EU GHG inventory',
    sourceUrl: 'https://www.nature.com/articles/s41586-025-08967-3',
    direction: 'down',
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2012, value: -456.9 },
      { year: 2017, value: -374.9 },
      { year: 2021, value: -332.6 },
    ],
  },
  {
    id: 'adv-peatland-emissions',
    code: 'A-L3',
    name: 'GHG emissions from drained peatlands / organic soils',
    category: 'lulucf',
    unit: 'Mt CO₂/yr',
    description:
      'ADVANCED — NOVEL (Nature Communications 2025). GHG emissions from drained organic soils (peatlands), EU. Drained peat is ≈2% of agricultural land but ≈80% of Cropland+Grassland LULUCF emissions and ≈74% of total LULUCF-sector emissions. Inventory anchors: ≈108 Mt CO₂ (2019) → ≈100 Mt (2023). "Identifying hotspots of GHG emissions from drained peatlands in the EU" (Nat. Commun. 2025) finds inventories may UNDER-report by 59–113 Mt CO₂e/yr; hotspots are the North Sea region, eastern Germany, the Baltics + eastern Poland. The Nature Restoration Law sets peatland-rewetting targets. Re-pull the annual organic-soil flux from the CRF tables.',
    source: 'Nature Communications 2025 / EU GHG inventory (organic soils)',
    sourceUrl: 'https://www.nature.com/articles/s41467-025-65841-6',
    direction: 'down',
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2019, value: 108 },
      { year: 2023, value: 100 },
    ],
  },
];

// ── High-quality climate-adaptation & resilience indicators ───────────────────
// (group 'advanced-adaptation') — anchored in the EEA European Climate Risk
// Assessment (EUCRA 2024) clusters: ecosystems, food, health, infrastructure,
// economy & finance. Prioritised for genuine multi-year observed history so the
// first-class adaptation track does not read as a wall of single recent points.
export const ADVANCED_ADAPTATION_INDICATORS: Indicator[] = [
  {
    id: 'adv-adapt-economic-losses',
    code: 'A-X1',
    name: 'Economic losses from weather & climate extremes (long run)',
    category: 'adaptation',
    unit: '€ billion/yr (constant 2023, decadal avg)',
    description:
      'ADVANCED — FLAGSHIP long series. Economic losses from weather- and climate-related extremes in the EU-27 (EEA 8th EAP indicator; Munich Re NatCatSERVICE / CATDAT), the gold-standard long adaptation record (1980–). Shown as decadal averages (constant 2023 prices) to tame year-to-year volatility, plotted at the decade midpoint: 1980s ≈ 8.5, 1990s ≈ 14.0, 2000s ≈ 15.8, 2010s ≈ 17.8, 2020–2023 ≈ 44.5 €bn/yr — a steep recent rise. Cumulative 1980–2023 ≈ €738 bn (€162 bn / 22% in 2021–2023 alone); under a quarter of losses are insured. Re-pull the gapless annual 1980–2023 table in one price base from the EEA.',
    source: 'EEA (8th EAP) / Munich Re NatCatSERVICE / CATDAT',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis/indicators/economic-losses-from-climate-related',
    direction: 'down',
    group: 'advanced-adaptation',
    isSeed: true,
    data: [
      { year: 1985, value: 8.5 },
      { year: 1995, value: 14.0 },
      { year: 2005, value: 15.8 },
      { year: 2015, value: 17.8 },
      { year: 2021, value: 44.5 },
    ],
  },
  {
    id: 'adv-adapt-global-temp',
    code: 'A-X2',
    name: 'Global mean surface temperature anomaly (climate driver)',
    category: 'adaptation',
    unit: '°C above 1850–1900',
    description:
      'ADVANCED — the underlying climate driver, shown as a clean annual series. Global mean surface temperature anomaly relative to pre-industrial (1850–1900), Copernicus C3S / multi-dataset ensemble: 2010 ≈ 0.90, 2015 ≈ 1.07, 2016 ≈ 1.16, 2018 ≈ 1.02, 2019 ≈ 1.20, 2020 ≈ 1.27, 2021 ≈ 1.13, 2022 ≈ 1.16, 2023 ≈ 1.48, 2024 ≈ 1.60 (first year above 1.5 °C). CRITICAL CONTEXT: Europe is the fastest-warming continent, warming ≈2× the global mean — European land was ≈+2.2 °C over 2015–2024 and +2.92 °C in 2024 (warmest on record).',
    source: 'Copernicus C3S / EEA "Global and European temperatures"',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis/indicators/global-and-european-temperatures',
    direction: 'down',
    group: 'advanced-adaptation',
    isSeed: true,
    data: [
      { year: 2010, value: 0.9 },
      { year: 2015, value: 1.07 },
      { year: 2016, value: 1.16 },
      { year: 2018, value: 1.02 },
      { year: 2019, value: 1.2 },
      { year: 2020, value: 1.27 },
      { year: 2021, value: 1.13 },
      { year: 2022, value: 1.16 },
      { year: 2023, value: 1.48 },
      { year: 2024, value: 1.6 },
    ],
  },
  {
    id: 'adv-adapt-sea-level',
    code: 'A-X3',
    name: 'Mean sea-level rise (satellite altimetry)',
    category: 'adaptation',
    unit: 'mm cumulative since 1993',
    description:
      'ADVANCED — long clean satellite record (1993–). Cumulative global mean sea-level rise from satellite altimetry (Copernicus C3S / Marine Service), the canonical coastal-risk driver for transport and buildings. Anchors trace the accelerating observed curve: 1993 = 0, 2000 ≈ 24, 2010 ≈ 57, 2020 ≈ 91, 2024 ≈ 108 mm (total 1993–2023 ≈ 111 mm). The rate roughly doubled from ≈2.1 mm/yr (1993) to ≈4.5 mm/yr (2024). European seas rose ≈3.2 ± 0.8 mm/yr over 1993–2023 with acceleration 0.10 mm/yr². Re-pull the exact area-averaged anomaly series from the CMEMS sea-level product.',
    source: 'Copernicus C3S / Marine Service (CMEMS) satellite altimetry',
    sourceUrl: 'https://climate.copernicus.eu/climate-indicators/sea-level',
    direction: 'down',
    group: 'advanced-adaptation',
    isSeed: true,
    data: [
      { year: 1993, value: 0 },
      { year: 2000, value: 24 },
      { year: 2010, value: 57 },
      { year: 2020, value: 91 },
      { year: 2024, value: 108 },
    ],
  },
  {
    id: 'adv-adapt-heat-mortality',
    code: 'A-X4',
    name: 'Heat-related mortality in Europe (summer)',
    category: 'adaptation',
    unit: 'deaths/yr (summer)',
    description:
      'ADVANCED (EUCRA health cluster — heat is one of the 8 "urgent action needed" risks). Estimated heat-attributable deaths during the European summer (ISGlobal / Nature Medicine series). Verified anchors: 2003 ≈ 70,000 (the landmark heatwave, Robine et al.); 2022 = 61,672 (Ballester et al.); 2023 = 47,690; 2024 = 62,775. Modelled estimates over ≈32–35 European countries (not strictly EU-27) on slightly differing methods/country counts — read as comparable event markers, with cooling degree days as the cleaner annual companion. A full 2015–2024 regional back-series exists in the Lancet Public Health 2024 study (1,368 regions).',
    source: 'Nature Medicine (Ballester/Masselot et al.); EEA Climate-ADAPT',
    sourceUrl: 'https://www.nature.com/articles/s41591-024-03186-1',
    direction: 'down',
    group: 'advanced-adaptation',
    isSeed: true,
    data: [
      { year: 2003, value: 70000 },
      { year: 2022, value: 61672 },
      { year: 2023, value: 47690 },
      { year: 2024, value: 62775 },
    ],
  },
  {
    id: 'adv-adapt-west-nile',
    code: 'A-X5',
    name: 'Locally-acquired West Nile virus cases (Europe)',
    category: 'adaptation',
    unit: 'cases/yr',
    description:
      'ADVANCED — NOVEL (EUCRA health cluster). Locally-acquired (autochthonous) human West Nile virus cases in Europe (ECDC surveillance) — a climate-sensitive vector-borne-disease signal with a genuine multi-year record. Verified anchors: 2018 = 2,083 (peak), 2020 = 336, 2022 = 1,116, 2023 = 709 (9 EU MS), 2024 = 1,436 across 19 countries (record geographic spread; Poland\'s first case). Climate change is a quantified driver of the northward expansion: "Contribution of climate change to the spatial expansion of West Nile virus in Europe," Nature Communications 2024. Re-pull 2011–2021 from the ECDC historical table.',
    source: 'ECDC surveillance; Nature Communications 2024',
    sourceUrl: 'https://www.ecdc.europa.eu/en/west-nile-fever/surveillance-and-disease-data/historical',
    direction: 'down',
    group: 'advanced-adaptation',
    isSeed: true,
    data: [
      { year: 2018, value: 2083 },
      { year: 2020, value: 336 },
      { year: 2022, value: 1116 },
      { year: 2023, value: 709 },
      { year: 2024, value: 1436 },
    ],
  },
  {
    id: 'adv-adapt-burnt-area',
    code: 'A-X6',
    name: 'Annual area burnt by wildfires (EU)',
    category: 'adaptation',
    unit: 'hectares/yr',
    description:
      'ADVANCED (EUCRA ecosystems cluster — wildfire is one of the 8 "urgent action needed" risks). Area burnt by wildfires each year in the EU, the canonical EFFIS/JRC series (satellite, ≈95% coverage; annual since 2006). Verified anchors: 2017 ≈ 988,427 ha, 2021 ≈ 500,566, 2022 ≈ 837,212, 2023 ≈ 504,002, 2024 ≈ 383,317, 2025 ≈ 1,079,538 ha (the first EU season above 1 M ha, ≈39% inside Natura 2000). 2006–2024 average ≈ 354,185 ha; highly volatile, read with a multi-year mean. EFFIS revises figures between releases; re-pull the full 2006–2025 table.',
    source: 'JRC EFFIS (Copernicus EMS)',
    sourceUrl: 'https://forest-fire.emergency.copernicus.eu/apps/effis.statistics/estimates',
    direction: 'down',
    group: 'advanced-adaptation',
    isSeed: true,
    data: [
      { year: 2017, value: 988427 },
      { year: 2021, value: 500566 },
      { year: 2022, value: 837212 },
      { year: 2023, value: 504002 },
      { year: 2024, value: 383317 },
      { year: 2025, value: 1079538 },
    ],
  },
  {
    id: 'adv-adapt-wei',
    code: 'A-X7',
    name: 'Water Exploitation Index Plus (WEI+)',
    category: 'adaptation',
    unit: '% of renewable freshwater used',
    description:
      'ADVANCED (EUCRA food & ecosystems clusters). Water Exploitation Index Plus — ratio of net freshwater use to renewable resources, EU-27 (EEA / Eurostat sdg_06_60; annual since 2000). Anchors: 2000 ≈ 4.9%, 2018 = 5.4%, 2019 = 5.5%, 2020 = 5.3%, 2021 = 5.4%, 2022 = 5.8% (highest on record, +0.9 pp since 2000). The EU aggregate is modest but masks severe seasonal/basin stress (>20% threshold): ≈30% of EU territory and ≈33% of population face water scarcity each year; country WEI+ 2022 reached Cyprus 71, Malta 34, Romania 21. Re-pull the full annual EU-27 array from sdg_06_60.',
    source: 'EEA / Eurostat (sdg_06_60)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/product/page/sdg_06_60',
    direction: 'down',
    group: 'advanced-adaptation',
    isSeed: true,
    data: [
      { year: 2000, value: 4.9 },
      { year: 2018, value: 5.4 },
      { year: 2019, value: 5.5 },
      { year: 2020, value: 5.3 },
      { year: 2021, value: 5.4 },
      { year: 2022, value: 5.8 },
    ],
  },
  {
    id: 'adv-adapt-crop-loss',
    code: 'A-X8',
    name: 'Crop-loss severity from drought & heatwaves',
    category: 'adaptation',
    unit: '% cereal-yield loss per event',
    description:
      'ADVANCED — NOVEL FLAGSHIP (EUCRA food cluster). Severity of cereal-yield losses from drought and heatwaves in Europe, from Brás, Seixas, Carvalhais & Jägermeyr, "Severity of drought and heatwave crop losses tripled over the last five decades in Europe," Environmental Research Letters 16:065012 (2021), based on FAOSTAT + EM-DAT 1961–2018. The average cereal-yield loss per drought/heatwave event ≈ tripled, from −2.2% (1964–1990) to −7.3% (1991–2015); compound hot-droughts reach −30%. Points use the mid-period year as the x-value. Major recent loss years: 2003, 2018, 2022, 2024.',
    source: 'Environmental Research Letters 2021 (Brás et al.)',
    sourceUrl: 'https://iopscience.iop.org/article/10.1088/1748-9326/abf004',
    direction: 'down',
    group: 'advanced-adaptation',
    isSeed: true,
    data: [
      { year: 1977, value: 2.2 },
      { year: 2003, value: 7.3 },
    ],
  },
  {
    id: 'adv-adapt-forest-disturbance',
    code: 'A-X9',
    name: 'Forest canopy mortality from climate disturbances',
    category: 'adaptation',
    unit: 'relative index (1980s = 100)',
    description:
      'ADVANCED — NOVEL (EUCRA ecosystems cluster). Climate-driven forest canopy mortality in Europe (fire, windthrow, bark beetle), from Forzieri et al., "Emergent vulnerability to climate-driven disturbances in European forests," Nature Communications 12:1081 (2021), and the Senf & Seidl / European Forest Disturbance Atlas (ESSD 2025, Landsat 1985–2023). Total canopy mortality roughly DOUBLED over the three decades to ≈2018 (indexed 100 → ≈200 here), with bark-beetle damage up ≈600%; ≈439,000 km² disturbed cumulatively 1985–2023. Points are a stepped index of the doubling; re-pull the annual disturbed-area km² from the ESSD Atlas for a yearly line.',
    source: 'Nature Communications 2021 (Forzieri et al.); ESSD 2025 Forest Disturbance Atlas',
    sourceUrl: 'https://www.nature.com/articles/s41467-021-21399-7',
    direction: 'down',
    group: 'advanced-adaptation',
    isSeed: true,
    data: [
      { year: 1988, value: 100 },
      { year: 2015, value: 200 },
    ],
  },
  {
    id: 'adv-adapt-cooling-degree-days',
    code: 'A-X10',
    name: 'Cooling degree days (EU)',
    category: 'adaptation',
    unit: 'CDD index',
    description:
      'ADVANCED (EUCRA energy & health). Cooling degree days — climate-driven cooling demand and heat stress on buildings and the grid (Eurostat nrg_chdd_a, JRC AGRI4CAST; annual since 1979). The EU aggregate roughly quadrupled: 1979 ≈ 37 → 2020 ≈ 99 → 2022 ≈ 140 (long-run average ≈ 75; most years after 2001 above it). Re-pull the full EU-27 annual aggregate from nrg_chdd_a.',
    source: 'Eurostat (nrg_chdd_a) / EEA',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis/maps-and-charts/cooling-degree-days',
    direction: 'down',
    group: 'advanced-adaptation',
    isSeed: true,
    data: [
      { year: 1979, value: 37 },
      { year: 2020, value: 99 },
      { year: 2022, value: 140 },
    ],
  },
  {
    id: 'adv-adapt-coastal-transport-damage',
    code: 'A-X11',
    name: 'Coastal-flood damage to EU transport infrastructure',
    category: 'adaptation',
    unit: '€ million/yr',
    description:
      'ADVANCED — NOVEL (Nature Climate Change 2025; EUCRA infrastructure cluster, where inland/coastal flooding is among the 8 most-urgent risks). Expected annual damage to European surface transport infrastructure from coastal flooding, from "Coastal flood risk to European surface transport infrastructure at different global warming levels," Nature Climate Change (2025). Baseline 1980–2020 ≈ €722 M/yr with ≈1,592 km of network affected per year, rising to ≈€1,108 M/yr at +1.5 °C and ≈€1,487 M/yr at +4 °C. Roads flood more often; railways carry the larger share of cost. Baseline point shown; the warming levels are projections, not an observed annual series.',
    source: 'Nature Climate Change 2025; EEA EUCRA',
    sourceUrl: 'https://www.nature.com/articles/s41558-025-02510-y',
    direction: 'down',
    group: 'advanced-adaptation',
    isSeed: true,
    data: [
      { year: 2020, value: 722 },
    ],
  },
  {
    id: 'adv-adapt-river-flood-damage',
    code: 'A-X12',
    name: 'Expected annual river-flood damage (EU)',
    category: 'adaptation',
    unit: '€ billion/yr',
    description:
      'ADVANCED (EUCRA infrastructure & economy clusters). Expected annual damage from river floods, EU+UK, from JRC PESETA IV. Present-day ≈ €7.8 bn/yr (≈0.06% of GDP) with ≈170,000 people exposed per year, rising to ≈€48 bn/yr and ≈0.5 M people/yr at +3 °C by 2100 without adaptation. Coastal floods add ≈€1.4 bn/yr today, up to ≈€239 bn/yr by 2100 without adaptation (≈95% avoidable with dyke-raising + mitigation). Present-day baseline shown; the rest are scenario projections.',
    source: 'JRC PESETA IV (river & coastal floods)',
    sourceUrl: 'https://joint-research-centre.ec.europa.eu/peseta-projects/jrc-peseta-iv/river-floods_en',
    direction: 'down',
    group: 'advanced-adaptation',
    isSeed: true,
    data: [
      { year: 2020, value: 7.8 },
    ],
  },
  {
    id: 'adv-adapt-insurance-gap',
    code: 'A-X13',
    name: 'Climate insurance protection gap (EU)',
    category: 'adaptation',
    unit: '% of losses uninsured',
    description:
      'ADVANCED (EUCRA economy & finance cluster). Share of weather- and climate-related losses that are uninsured in Europe (EEA / EIOPA natural-catastrophe protection-gap dashboard, historical view 1980–2024). Only ≈a quarter of losses are insured, so the protection gap is ≈75% and widening; many Member States are >90% uninsured. Context: ≈€738 bn of EU losses 1980–2023, of which ≈€162 bn in 2021–2023 alone. Re-pull the per-peril annual insured-vs-economic-loss series from EIOPA.',
    source: 'EEA / EIOPA protection-gap dashboard',
    sourceUrl: 'https://www.eiopa.europa.eu/tools-and-data/dashboard-insurance-protection-gap-natural-catastrophes_en',
    direction: 'down',
    group: 'advanced-adaptation',
    isSeed: true,
    data: [
      { year: 2024, value: 75 },
    ],
  },
  {
    id: 'adv-adapt-cities-plans',
    code: 'A-X14',
    name: 'European cities with a dedicated adaptation plan',
    category: 'adaptation',
    unit: '% of large cities',
    description:
      'ADVANCED (EUCRA cross-cutting response capacity; direction up = better). Share of large European cities with a dedicated climate-adaptation plan, plus Covenant of Mayors uptake. In 2022 ≈51% of large European cities had a dedicated adaptation plan, and ≈9,000 EU municipalities have joined the Covenant of Mayors. Build the rising series from the Covenant signatory database (annual cumulative counts) and the EEA urban-adaptation briefing.',
    source: 'EU Covenant of Mayors / EEA',
    sourceUrl: 'https://eu-mayors.ec.europa.eu/en/resources/adaptation-resources',
    direction: 'up',
    group: 'advanced-adaptation',
    isSeed: true,
    data: [
      { year: 2022, value: 51 },
    ],
  },
];

/** All advanced indicators (mitigation + adaptation), for index/seed convenience. */
export const ALL_ADVANCED_INDICATORS: Indicator[] = [
  ...ADVANCED_INDICATORS,
  ...ADVANCED_ADAPTATION_INDICATORS,
];
