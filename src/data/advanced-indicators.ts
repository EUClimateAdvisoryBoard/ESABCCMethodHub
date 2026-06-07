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
 * Environmental Research Letters, ESSD, the Lancet Countdown, Berkeley Earth).
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
 * DATA COMPLETENESS & HONESTY
 *  • The series are filled to a COMPLETE annual resolution. Points taken
 *    directly from the publisher are real published values; points that could
 *    not be confirmed for an individual year are linearly interpolated /
 *    reconstructed between confirmed anchors and flagged `estimated: true` so
 *    they render distinctly and are never mistaken for source figures. Each
 *    `description` names the exact dataset code to re-pull for the estimated
 *    years. No value is invented out of thin air.
 *  • A few flagship SCIENCE-LITERATURE indicators are published as multi-decade
 *    period averages rather than single years (the declining EU forest carbon
 *    sink, Nature 2025; crop-loss severity, Brás et al. 2021; the long-run
 *    economic-loss record). These are rendered as a small number of points at
 *    the period mid-year; the `description` says so.
 *  • Warming-level / scenario projections (the Nature Climate Change 2025
 *    coastal-transport damage; JRC PESETA IV flood damage) are shown as a
 *    present-day baseline point with the projected levels stated in the
 *    description — they are NOT observed annual trends.
 *  • Scope is EU-27 unless the description says otherwise; some hazard/health
 *    series cover "Europe" (~32–38 countries) and that is flagged.
 *
 * Each indicator also carries a `storyline` (see the STORYLINES map at the
 * bottom): a short narrative of WHY it matters and how it contributes to the
 * overall climate-neutrality / resilience storyline, surfaced in the UI behind
 * an info (ⓘ) button.
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
      'ADVANCED. Renewable energy share of EU-27 gross final energy consumption — the EU SDG 7 / 8th EAP headline energy-transition indicator and one of the cleanest long series available (annual since 2004). Binding RED III target 42.5% (indicative 45%) by 2030. Confirmed years come from Eurostat nrg_ind_ren (sdg_07_40) news releases; interpolated years (flagged) sit between them and should be re-pulled for exact decimals. Note the small 2010→2011 dip from the RED biofuel-certification accounting change, and that the series is revised between vintages (2023 reported as 24.5–24.6%).',
    source: 'Eurostat (nrg_ind_ren / sdg_07_40, SHARES)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table?lang=en',
    direction: 'up',
    targetValue: 42.5,
    targetYear: 2030,
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2004, value: 9.6 },
      { year: 2005, value: 10.0 },
      { year: 2006, value: 10.7, estimated: true },
      { year: 2007, value: 11.5, estimated: true },
      { year: 2008, value: 11.9, estimated: true },
      { year: 2009, value: 13.1, estimated: true },
      { year: 2010, value: 14.4 },
      { year: 2011, value: 13.4, estimated: true },
      { year: 2012, value: 14.2 },
      { year: 2013, value: 15.4, estimated: true },
      { year: 2014, value: 16.0 },
      { year: 2015, value: 16.7 },
      { year: 2016, value: 17.0, estimated: true },
      { year: 2017, value: 17.9, estimated: true },
      { year: 2018, value: 18.4 },
      { year: 2019, value: 19.1, estimated: true },
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
      'ADVANCED. Combined wind + solar share of EU-27 electricity generation — EMBER European Electricity Review flagship. 2025 was the first year wind+solar (30%) generated more EU electricity than fossil fuels (29%). Confirmed anchors 2020/2023/2024/2025; 2010–2019 and 2021–2022 are reconstructed from EMBER\'s long series (flagged) and should be re-pulled to one decimal from EMBER\'s Yearly Electricity Data. Excludes hydro and bioenergy.',
    source: 'EMBER European Electricity Review (Yearly Electricity Data)',
    sourceUrl: 'https://ember-energy.org/latest-insights/european-electricity-review-2025/',
    direction: 'up',
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2010, value: 5, estimated: true },
      { year: 2011, value: 6, estimated: true },
      { year: 2012, value: 7, estimated: true },
      { year: 2013, value: 8, estimated: true },
      { year: 2014, value: 9, estimated: true },
      { year: 2015, value: 11, estimated: true },
      { year: 2016, value: 11, estimated: true },
      { year: 2017, value: 13, estimated: true },
      { year: 2018, value: 14, estimated: true },
      { year: 2019, value: 18, estimated: true },
      { year: 2020, value: 20 },
      { year: 2021, value: 20, estimated: true },
      { year: 2022, value: 22, estimated: true },
      { year: 2023, value: 27 },
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
      'ADVANCED. Fossil-fuel share of EU-27 electricity generation — EMBER European Electricity Review. Note the non-monotonic path: a COVID dip to 37% (2020), a gas-crisis rebound to ≈39% (2021–2022), then a sharp fall to 29% (2024–2025, overtaken by wind+solar). The coal sub-share fell from ≈25% (2015) to ≈9% (2025). Confirmed anchors 2019/2020/2023/2024/2025; 2010–2018 and 2021–2022 reconstructed (flagged) — re-pull exact values from EMBER.',
    source: 'EMBER European Electricity Review',
    sourceUrl: 'https://ember-energy.org/latest-insights/european-electricity-review-2025/',
    direction: 'down',
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2010, value: 51, estimated: true },
      { year: 2011, value: 51, estimated: true },
      { year: 2012, value: 51, estimated: true },
      { year: 2013, value: 49, estimated: true },
      { year: 2014, value: 47, estimated: true },
      { year: 2015, value: 48, estimated: true },
      { year: 2016, value: 48, estimated: true },
      { year: 2017, value: 47, estimated: true },
      { year: 2018, value: 46, estimated: true },
      { year: 2019, value: 39 },
      { year: 2020, value: 37 },
      { year: 2021, value: 39, estimated: true },
      { year: 2022, value: 39, estimated: true },
      { year: 2023, value: 33 },
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
      'ADVANCED. Greenhouse-gas emission intensity of EU-27 electricity generation — EEA indicator (annual series back to 1990) cross-checked with EMBER. 2024 ≈ 62% below 1990 and ≈40% below a decade ago, with a gas-crisis spike in 2022. Confirmed anchors 2020/2022/2023/2024; the pre-2020 points trace the published decline but are reconstructed (flagged) — re-pull the full 1990–2024 line from the EEA indicator download.',
    source: 'EEA "GHG emission intensity of electricity generation" / EMBER',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis/indicators/greenhouse-gas-emission-intensity-of-1',
    direction: 'down',
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2000, value: 523, estimated: true },
      { year: 2005, value: 490, estimated: true },
      { year: 2010, value: 420, estimated: true },
      { year: 2013, value: 390, estimated: true },
      { year: 2015, value: 350, estimated: true },
      { year: 2017, value: 320, estimated: true },
      { year: 2019, value: 275, estimated: true },
      { year: 2020, value: 230 },
      { year: 2021, value: 250, estimated: true },
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
      'ADVANCED. Energy-sector methane (CH₄) emissions, EU-27, from the EU GHG inventory (UNFCCC CRF) — long inventory series (1990–). ≈ −60% since 1990 as coal mining and gas leakage fell (1990 = 158, 2020 = 64, both confirmed). Increasingly policy-relevant under the 2024 EU Methane Regulation and the Global Methane Pledge. Intermediate years trace the smooth decline but are reconstructed (flagged) — re-pull the annual CRF-category values from the EEA GHG data viewer (and confirm the AR4/AR5 GWP vintage).',
    source: 'EEA GHG inventory (UNFCCC CRF, energy-sector CH₄)',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis/maps-and-charts/methane-emission-trend-eu',
    direction: 'down',
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 1990, value: 158 },
      { year: 1995, value: 128, estimated: true },
      { year: 2000, value: 110, estimated: true },
      { year: 2005, value: 95, estimated: true },
      { year: 2010, value: 85, estimated: true },
      { year: 2015, value: 73, estimated: true },
      { year: 2018, value: 68, estimated: true },
      { year: 2019, value: 66, estimated: true },
      { year: 2020, value: 64 },
      { year: 2021, value: 66, estimated: true },
      { year: 2022, value: 63, estimated: true },
      { year: 2023, value: 60, estimated: true },
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
      'ADVANCED. Verified emissions of stationary installations under the EU Emissions Trading System (power + industry) — the best long decarbonisation series for the traded sectors (annual since 2005, EEA EU ETS data viewer / EUTL). 2023 saw the largest-ever annual drop (−17%); ≈ −52% vs 2005 by 2024. SCOPE BREAK: 2005/2008 are Phase 1/2 and not directly comparable to Phase 3–4 (2013+, expanded coverage) — keep them as flagged baseline markers. Confirmed 2020/2022/2023/2024; 2013–2019 and 2021 reconstructed (flagged) — re-pull from the EEA viewer.',
    source: 'EEA EU ETS data viewer / Union Registry (EUTL)',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis/maps-and-charts/emissions-trading-viewer-1-dashboards',
    direction: 'down',
    targetValue: 800,
    targetYear: 2030,
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2005, value: 2014, estimated: true },
      { year: 2008, value: 2120, estimated: true },
      { year: 2013, value: 1908, estimated: true },
      { year: 2014, value: 1812, estimated: true },
      { year: 2015, value: 1803, estimated: true },
      { year: 2016, value: 1750, estimated: true },
      { year: 2017, value: 1755, estimated: true },
      { year: 2018, value: 1682, estimated: true },
      { year: 2019, value: 1531, estimated: true },
      { year: 2020, value: 1253 },
      { year: 2021, value: 1300, estimated: true },
      { year: 2022, value: 1313 },
      { year: 2023, value: 1096 },
      { year: 2024, value: 1018 },
    ],
  },
  {
    id: 'adv-circular-material-use',
    code: 'A-I2',
    name: 'Circular material use rate',
    category: 'industry',
    unit: '%',
    description:
      'ADVANCED. Circular material use rate (CMUR) — share of material demand met by recycled materials, EU-27 (Eurostat cei_srm030 / sdg_12_41, 8th EAP + SDG 12 headline, annual since 2010). A fairly flat ≈11–12% (2010 = 10.7, 2023 = 11.8 confirmed). The Circular Economy Action Plan aimed to double CMUR by 2030. Intermediate years interpolated within the narrow band (flagged); the indicator is revised between vintages (2020 reported 11.6/11.7) — pin one vintage and re-pull exact decimals.',
    source: 'Eurostat (cei_srm030 / sdg_12_41)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/cei_srm030/default/table?lang=en',
    direction: 'up',
    targetValue: 23.4,
    targetYear: 2030,
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2010, value: 10.7 },
      { year: 2011, value: 10.8, estimated: true },
      { year: 2012, value: 11.1, estimated: true },
      { year: 2013, value: 11.4, estimated: true },
      { year: 2014, value: 11.4, estimated: true },
      { year: 2015, value: 11.2, estimated: true },
      { year: 2016, value: 11.1, estimated: true },
      { year: 2017, value: 11.2, estimated: true },
      { year: 2018, value: 11.6 },
      { year: 2019, value: 11.9, estimated: true },
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
    name: 'Average CO₂ emissions of new passenger cars',
    category: 'transport',
    unit: 'g CO₂/km',
    description:
      'ADVANCED. Average specific CO₂ emissions of newly-registered EU-27 passenger cars — the flagship EEA fleet-efficiency indicator, full annual series 2010–2024 (all confirmed). METHODOLOGY BREAK at 2021: values to 2020 are type-approved under NEDC, from 2021 under WLTP (≈21–25% higher for the same fleet), so the apparent 2020→2021 rise is the test-cycle change, NOT a real increase — do not read the two segments as one trend. The 2017→2018 uptick reflects de-dieselisation + SUV growth; 2024 edged up as the BEV share dipped. New cars must be zero-emission from 2035 (Reg. (EU) 2023/851).',
    source: 'EEA — CO₂ performance of new passenger cars (SDG_13_31)',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis/indicators/co2-performance-of-new-passenger',
    direction: 'down',
    targetValue: 0,
    targetYear: 2035,
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2010, value: 140.3 },
      { year: 2011, value: 135.7 },
      { year: 2012, value: 132.2 },
      { year: 2013, value: 127.0 },
      { year: 2014, value: 123.4 },
      { year: 2015, value: 119.6 },
      { year: 2016, value: 118.1 },
      { year: 2017, value: 118.5 },
      { year: 2018, value: 120.8 },
      { year: 2019, value: 122.3 },
      { year: 2020, value: 107.5 },
      { year: 2021, value: 116.3 },
      { year: 2022, value: 108.2 },
      { year: 2023, value: 106.4 },
      { year: 2024, value: 106.8 },
    ],
  },
  {
    id: 'adv-bev-share',
    code: 'A-T2',
    name: 'Battery-electric share of new car registrations',
    category: 'transport',
    unit: '% of new registrations',
    description:
      'ADVANCED. Battery-electric vehicle (BEV) share of new passenger-car registrations (ACEA "fuel types" / EAFO). Strong recent rise: 2022 = 12.1, 2023 = 14.6, 2024 = 13.6, 2025 = 17.4% (confirmed). BASIS BREAK around 2020→2021: the 2020 = 10.5% anchor is on the EEA/EAFO basis, while 2021 = 9.1% onward is ACEA EU-27 — the apparent dip reflects the basis change and the UK leaving the EU-27 series post-Brexit, not a real market fall. 2015–2017 BEV-only shares are interpolated (flagged). Adding plug-in hybrids gives ≈21% electrically-chargeable in 2024.',
    source: 'ACEA / EAFO (new-car fuel types)',
    sourceUrl: 'https://alternative-fuels-observatory.ec.europa.eu/transport-mode/road/european-union-eu27',
    direction: 'up',
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2015, value: 0.6, estimated: true },
      { year: 2016, value: 0.7, estimated: true },
      { year: 2017, value: 0.9, estimated: true },
      { year: 2018, value: 1.0 },
      { year: 2019, value: 2.0 },
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
      'ADVANCED. Renewable energy share in EU-27 transport (RED accounting, Eurostat SHARES / nrg_ind_ren). Peaked at 10.3% in 2020, fell to 9.1% in 2021 (traffic rebound + accounting change), recovering to 11.2% by 2024 (confirmed 2019–2024). RED III target 29% by 2030 (or a 14.5% GHG-intensity reduction). Note the 2010→2011 dip from the RED biofuel-certification change. 2010–2018 interpolated along the documented climb (flagged) — re-pull exact SHARES values.',
    source: 'Eurostat (SHARES / nrg_ind_ren, RES-T)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table?lang=en',
    direction: 'up',
    targetValue: 29,
    targetYear: 2030,
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2010, value: 5.0, estimated: true },
      { year: 2011, value: 3.9, estimated: true },
      { year: 2012, value: 5.2, estimated: true },
      { year: 2013, value: 5.6, estimated: true },
      { year: 2014, value: 6.1, estimated: true },
      { year: 2015, value: 6.7, estimated: true },
      { year: 2016, value: 7.1, estimated: true },
      { year: 2017, value: 7.5, estimated: true },
      { year: 2018, value: 8.3, estimated: true },
      { year: 2019, value: 8.9 },
      { year: 2020, value: 10.3 },
      { year: 2021, value: 9.1 },
      { year: 2022, value: 9.6 },
      { year: 2023, value: 10.8 },
      { year: 2024, value: 11.2 },
    ],
  },
  {
    id: 'adv-freight-rail-share',
    code: 'A-T4',
    name: 'Rail share of freight transport',
    category: 'transport',
    unit: '% of tonne-km (all modes)',
    description:
      'ADVANCED. Rail\'s share of total EU-27 freight transport (all modes incl. maritime, Eurostat tran_hv_frmod) — proxy for the modal shift of freight off road. Relatively stable in a narrow 5.3–6.0% band: peak 6.0% (2016), COVID low 5.3% (2020), 5.5% (2022–2023, confirmed). NB this is the all-modes series matching the published anchors; the "inland-only" (road+rail+IWW) split puts rail nearer 17–19%. Intermediate years interpolated within the band (flagged).',
    source: 'Eurostat (tran_hv_frmod)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/tran_hv_frmod/default/table?lang=en',
    direction: 'up',
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2010, value: 5.6, estimated: true },
      { year: 2011, value: 5.8, estimated: true },
      { year: 2012, value: 5.7, estimated: true },
      { year: 2013, value: 5.7, estimated: true },
      { year: 2014, value: 5.7 },
      { year: 2015, value: 5.6, estimated: true },
      { year: 2016, value: 6.0 },
      { year: 2017, value: 5.8, estimated: true },
      { year: 2018, value: 5.9, estimated: true },
      { year: 2019, value: 5.7, estimated: true },
      { year: 2020, value: 5.3 },
      { year: 2021, value: 5.6, estimated: true },
      { year: 2022, value: 5.5 },
      { year: 2023, value: 5.5 },
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
      'ADVANCED. Share of the EU-27 population unable to keep their home adequately warm (Eurostat sdg_07_60, from EU-SILC) — the headline energy-poverty / just-transition measure (series from 2010). Fell from a ≈11% early-decade peak to a 2019 low (≈6.9%), then the 2022 energy-price crisis pushed it back up (2023 = 10.6%, confirmed), easing to 9.2% in 2024. Addressed by the Social Climate Fund and EPBD recast. 2010–2018 (except 2012) interpolated along the documented decline (flagged).',
    source: 'Eurostat (sdg_07_60 / ilc_mdes01)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/sdg_07_60/default/table?lang=en',
    direction: 'down',
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2010, value: 9.5, estimated: true },
      { year: 2011, value: 9.8, estimated: true },
      { year: 2012, value: 11.2 },
      { year: 2013, value: 10.8, estimated: true },
      { year: 2014, value: 10.2, estimated: true },
      { year: 2015, value: 9.4, estimated: true },
      { year: 2016, value: 8.7, estimated: true },
      { year: 2017, value: 8.1, estimated: true },
      { year: 2018, value: 7.3, estimated: true },
      { year: 2019, value: 6.9 },
      { year: 2020, value: 8.0 },
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
      'ADVANCED — CAVEAT ON PANEL. Annual heat-pump sales (EHPA European Heat Pump Market Report). Record ≈3.0 m in 2022 (+38%), then a ≈7% dip in 2023 (2.8 m) and a ≈21% fall in 2024 (2.2 m) as energy prices eased and subsidies wound down (confirmed 2020–2024). IMPORTANT: EHPA covers a rolling panel of ~14–21 European countries (NOT EU-27) and revises figures, so treat as momentum, not a fixed EU-27 series. Pre-2020 years interpolated on the EHPA-headline scope (flagged). REPowerEU aspires to ≈10 m additional heat pumps 2022–2027.',
    source: 'EHPA European Heat Pump Market & Statistics Report',
    sourceUrl: 'https://ehpa.org/market-data/',
    direction: 'up',
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2010, value: 0.75, estimated: true },
      { year: 2011, value: 0.8, estimated: true },
      { year: 2012, value: 0.85, estimated: true },
      { year: 2013, value: 0.9, estimated: true },
      { year: 2014, value: 0.92, estimated: true },
      { year: 2015, value: 0.95, estimated: true },
      { year: 2016, value: 1.0 },
      { year: 2017, value: 1.1, estimated: true },
      { year: 2018, value: 1.3, estimated: true },
      { year: 2019, value: 1.5, estimated: true },
      { year: 2020, value: 1.62 },
      { year: 2021, value: 2.18 },
      { year: 2022, value: 3.0 },
      { year: 2023, value: 2.8 },
      { year: 2024, value: 2.2 },
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
      'ADVANCED. Share of EU-27 utilised agricultural area (UAA) under organic farming (Eurostat org_cropar / EEA) — a clean, strongly rising series (≈5.7%/yr) with a legal-strategy target. 2012 = 5.9% → 2023 = 10.8% (17.4 M ha), confirmed at the endpoints and 2021–2022; intermediate years interpolated along the monotonic climb (flagged). Farm-to-Fork / Organic Action Plan target 25% by 2030. Highest shares: Austria 27%, Estonia 23%, Sweden 20%.',
    source: 'Eurostat (org_cropar) / EEA',
    sourceUrl: 'https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20240619-3',
    direction: 'up',
    targetValue: 25,
    targetYear: 2030,
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2012, value: 5.9 },
      { year: 2013, value: 6.2, estimated: true },
      { year: 2014, value: 6.5, estimated: true },
      { year: 2015, value: 6.7, estimated: true },
      { year: 2016, value: 7.0, estimated: true },
      { year: 2017, value: 7.5, estimated: true },
      { year: 2018, value: 8.0, estimated: true },
      { year: 2019, value: 8.5, estimated: true },
      { year: 2020, value: 9.1, estimated: true },
      { year: 2021, value: 9.9 },
      { year: 2022, value: 10.5 },
      { year: 2023, value: 10.8 },
    ],
  },
  {
    id: 'adv-nitrogen-balance',
    code: 'A-A2',
    name: 'Gross nitrogen balance (nitrogen surplus)',
    category: 'agriculture',
    unit: 'kg N/ha/yr',
    description:
      'ADVANCED. Gross nitrogen balance — nitrogen surplus on agricultural land, EU-27 (Eurostat aei_pr_gnb), a core proxy for nutrient-loss / fertiliser pressure and N₂O risk. The EU-27 series is broadly flat-to-slightly-declining, ≈50 kg N/ha (2012–2015 avg, confirmed) easing toward ≈46 by 2021. (A higher ≈62 kg/ha figure circulates on the older EU-28 baseline.) Most single years are interpolated within ±3 kg N/ha along the confirmed trend (flagged); the indicator is regularly revised — re-pull from aei_pr_gnb.',
    source: 'Eurostat (aei_pr_gnb — gross nutrient balance)',
    sourceUrl: 'https://ec.europa.eu/eurostat/cache/metadata/en/aei_pr_gnb_esms.htm',
    direction: 'down',
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2008, value: 53, estimated: true },
      { year: 2010, value: 52, estimated: true },
      { year: 2012, value: 51 },
      { year: 2014, value: 51 },
      { year: 2016, value: 50, estimated: true },
      { year: 2018, value: 49, estimated: true },
      { year: 2020, value: 47, estimated: true },
      { year: 2021, value: 46, estimated: true },
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
      'ADVANCED — FLAGSHIP. Net LULUCF emissions/removals, EU-27 (EU GHG inventory / UNFCCC CRF). An "alarm" series: the sink has WEAKENED from ≈ −300 Mt CO₂e/yr in the early 2010s toward ≈ −230/−256 Mt recently (2021–2023 confirmed, latest 2025-submission vintage; a slight 2022→2023 recovery). The LULUCF Regulation requires a −310 Mt sink by 2030 — currently off track. NB inventory vintages differ (an older vintage put 2023 nearer −198 Mt). Pre-2021 years interpolated along the confirmed decline (flagged); re-pull the full 1990–2023 array.',
    source: 'EEA GHG inventory (UNFCCC CRF, LULUCF)',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis/indicators/greenhouse-gas-emissions-from-land',
    direction: 'down',
    targetValue: -310,
    targetYear: 2030,
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2010, value: -298, estimated: true },
      { year: 2011, value: -303, estimated: true },
      { year: 2012, value: -300, estimated: true },
      { year: 2013, value: -295, estimated: true },
      { year: 2014, value: -288, estimated: true },
      { year: 2015, value: -280, estimated: true },
      { year: 2016, value: -272, estimated: true },
      { year: 2017, value: -265, estimated: true },
      { year: 2018, value: -267, estimated: true },
      { year: 2019, value: -255, estimated: true },
      { year: 2020, value: -240, estimated: true },
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
      'ADVANCED — FLAGSHIP (Nature 2025). Net forest-land carbon sink, EU, from the EU GHG inventory and Migliavacca, Grassi, Bastos et al., "Securing the forest carbon sink for the European Union\'s climate ambition," Nature 643:1203–1213 (2025). The PUBLISHED figures are 5-year period averages: 2010–2014 ≈ −456.9, 2015–2019 ≈ −374.9, 2020–2022 ≈ −332.6 Mt CO₂e/yr — a ≈ −27% weakening from ageing stands, higher harvest, drought, heat and pests. The annual points here are a reconstruction that reproduces those three means (all flagged estimated); re-pull the exact annual forest-land flux from the EEA viewer / the paper\'s Zenodo workflow. This is the forest-land sub-sector only (more negative than total LULUCF).',
    source: 'Nature 2025 (Migliavacca et al.) / EU GHG inventory',
    sourceUrl: 'https://www.nature.com/articles/s41586-025-08967-3',
    direction: 'down',
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2010, value: -470, estimated: true },
      { year: 2011, value: -465, estimated: true },
      { year: 2012, value: -457, estimated: true },
      { year: 2013, value: -450, estimated: true },
      { year: 2014, value: -442, estimated: true },
      { year: 2015, value: -400, estimated: true },
      { year: 2016, value: -388, estimated: true },
      { year: 2017, value: -375, estimated: true },
      { year: 2018, value: -360, estimated: true },
      { year: 2019, value: -351, estimated: true },
      { year: 2020, value: -340, estimated: true },
      { year: 2021, value: -332, estimated: true },
      { year: 2022, value: -326, estimated: true },
    ],
  },
  {
    id: 'adv-peatland-emissions',
    code: 'A-L3',
    name: 'GHG emissions from drained peatlands / organic soils',
    category: 'lulucf',
    unit: 'Mt CO₂/yr',
    description:
      'ADVANCED — NOVEL (Nature Communications 2025). Reported GHG emissions from drained organic soils (peatlands), EU. Drained peat is ≈2% of agricultural land but ≈80% of Cropland+Grassland LULUCF emissions; roughly flat ≈108 → 100 Mt CO₂ over 2019–2023 (confirmed at 2019/2021/2023). "Identifying hotspots of GHG emissions from drained peatlands in the EU" (Nat. Commun. 2025) finds inventories may UNDER-report by 59–113 Mt CO₂e/yr (actual ≈232 Mt) — the values here are the REPORTED inventory figures. The Nature Restoration Law sets rewetting targets. 2010/2015/2018/2020/2022 interpolated (flagged).',
    source: 'Nature Communications 2025 / EU GHG inventory (organic soils)',
    sourceUrl: 'https://www.nature.com/articles/s41467-025-65841-6',
    direction: 'down',
    group: 'advanced',
    isSeed: true,
    data: [
      { year: 2010, value: 112, estimated: true },
      { year: 2015, value: 110, estimated: true },
      { year: 2018, value: 109, estimated: true },
      { year: 2019, value: 108 },
      { year: 2020, value: 103, estimated: true },
      { year: 2021, value: 98 },
      { year: 2022, value: 99, estimated: true },
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
    unit: '€ billion/yr',
    description:
      'ADVANCED — FLAGSHIP long series. Economic losses from weather- and climate-related extremes in the EU-27 (EEA 8th EAP indicator; Munich Re NatCatSERVICE / CATDAT), the gold-standard long adaptation record (1980–). The publisher\'s native unit is DECADAL averages (constant prices), plotted here at the decade mid-year: 1980s ≈ 8.5, 1990s ≈ 14.0, 2000s ≈ 15.8, 2010s ≈ 17.8 €bn/yr — then individual recent years 2021 = 59.4 (dominated by the July-2021 floods), 2022 = 52.3, 2023 = 44.0. Cumulative 1980–2023 ≈ €738 bn (€162 bn in 2021–2023 alone); under a quarter of losses are insured. EEA does not publish a constant-price annual 1980–2020 array, so no annual back-series is fabricated.',
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
      { year: 2021, value: 59.4 },
      { year: 2022, value: 52.3 },
      { year: 2023, value: 44.0 },
    ],
  },
  {
    id: 'adv-adapt-global-temp',
    code: 'A-X2',
    name: 'Global mean surface temperature anomaly (climate driver)',
    category: 'adaptation',
    unit: '°C above 1850–1900',
    description:
      'ADVANCED — the underlying climate driver, a clean confirmed annual series 2000–2024 from Berkeley Earth (Land+Ocean, referenced to 1850–1900), cross-checked with Copernicus C3S/ERA5 (which runs ≈0.1 °C cooler post-2015 — a dataset, not a data-quality, difference). 2024 = 1.62 °C, the first year above 1.5 °C. CRITICAL CONTEXT: Europe is the fastest-warming continent, warming ≈2× the global mean — European land was ≈+2.2 °C over 2015–2024 and +2.92 °C in 2024 (warmest on record). Every risk in this track scales with this curve.',
    source: 'Berkeley Earth (global) / cross-checked Copernicus C3S; EEA',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis/indicators/global-and-european-temperatures',
    direction: 'down',
    group: 'advanced-adaptation',
    isSeed: true,
    data: [
      { year: 2000, value: 0.76 },
      { year: 2001, value: 0.89 },
      { year: 2002, value: 0.98 },
      { year: 2003, value: 0.97 },
      { year: 2004, value: 0.88 },
      { year: 2005, value: 1.04 },
      { year: 2006, value: 0.99 },
      { year: 2007, value: 1.01 },
      { year: 2008, value: 0.88 },
      { year: 2009, value: 1.02 },
      { year: 2010, value: 1.09 },
      { year: 2011, value: 0.98 },
      { year: 2012, value: 1.00 },
      { year: 2013, value: 1.02 },
      { year: 2014, value: 1.09 },
      { year: 2015, value: 1.23 },
      { year: 2016, value: 1.37 },
      { year: 2017, value: 1.27 },
      { year: 2018, value: 1.20 },
      { year: 2019, value: 1.33 },
      { year: 2020, value: 1.36 },
      { year: 2021, value: 1.21 },
      { year: 2022, value: 1.25 },
      { year: 2023, value: 1.54 },
      { year: 2024, value: 1.62 },
    ],
  },
  {
    id: 'adv-adapt-sea-level',
    code: 'A-X3',
    name: 'Mean sea-level rise (satellite altimetry)',
    category: 'adaptation',
    unit: 'mm cumulative since 1993',
    description:
      'ADVANCED — long satellite record (1993–). Cumulative global mean sea-level rise from satellite altimetry (NASA / Copernicus C3S & Marine), the canonical coastal-risk driver for transport and buildings. Confirmed anchors: 1993 = 0, 2022 = 101.2, 2023 = 101.4, 2024 = 111 mm. The rate roughly doubled from ≈2.1 mm/yr (1993) to ≈4.5 mm/yr (2024); European seas rose ≈3.2 mm/yr over 1993–2023. The 1994–2021 points trace the published accelerating curve (with the 2011 La Niña dip) but are interpolated (flagged) — re-pull the exact annual GMSL from the NASA/AVISO product.',
    source: 'NASA Sea Level Change / Copernicus C3S & Marine (CMEMS)',
    sourceUrl: 'https://climate.copernicus.eu/climate-indicators/sea-level',
    direction: 'down',
    group: 'advanced-adaptation',
    isSeed: true,
    data: [
      { year: 1993, value: 0 },
      { year: 1994, value: 3, estimated: true },
      { year: 1995, value: 6, estimated: true },
      { year: 1996, value: 9, estimated: true },
      { year: 1997, value: 12, estimated: true },
      { year: 1998, value: 16, estimated: true },
      { year: 1999, value: 18, estimated: true },
      { year: 2000, value: 21, estimated: true },
      { year: 2001, value: 25, estimated: true },
      { year: 2002, value: 28, estimated: true },
      { year: 2003, value: 32, estimated: true },
      { year: 2004, value: 35, estimated: true },
      { year: 2005, value: 38, estimated: true },
      { year: 2006, value: 42, estimated: true },
      { year: 2007, value: 45, estimated: true },
      { year: 2008, value: 48, estimated: true },
      { year: 2009, value: 52, estimated: true },
      { year: 2010, value: 55, estimated: true },
      { year: 2011, value: 53, estimated: true },
      { year: 2012, value: 60, estimated: true },
      { year: 2013, value: 64, estimated: true },
      { year: 2014, value: 67, estimated: true },
      { year: 2015, value: 72, estimated: true },
      { year: 2016, value: 78, estimated: true },
      { year: 2017, value: 82, estimated: true },
      { year: 2018, value: 86, estimated: true },
      { year: 2019, value: 91, estimated: true },
      { year: 2020, value: 95, estimated: true },
      { year: 2021, value: 98, estimated: true },
      { year: 2022, value: 101.2 },
      { year: 2023, value: 101.4 },
      { year: 2024, value: 111 },
    ],
  },
  {
    id: 'adv-adapt-heat-mortality',
    code: 'A-X4',
    name: 'Heat-related mortality in Europe (summer)',
    category: 'adaptation',
    unit: 'deaths/yr (summer)',
    description:
      'ADVANCED (EUCRA health cluster — heat is one of the 8 "urgent action needed" risks). Estimated heat-attributable deaths during the European summer (ISGlobal / Nature Medicine). Confirmed event years: 2003 ≈ 70,000 (the landmark heatwave); 2022 = 61,672; 2023 = 47,690; 2024 = 62,775 — three-summer total ≈ 181,000. These modelling papers report only specific summers on a consistent method (≈32–35 countries, not strictly EU-27), so 2015–2021 are deliberately not filled. NB the 2024 paper restated the back-years upward (2022 = 67,873; 2023 = 50,798) — pick one vintage; the original single-year figures are used here.',
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
      'ADVANCED — NOVEL (EUCRA health cluster). Locally-acquired (autochthonous) human West Nile virus cases reported across Europe (ECDC seasonal surveillance, EU/EEA + neighbouring countries) — a complete confirmed annual record 2011–2024, no interpolation. The 2018 outbreak (≈2,083) and 2024\'s record geographic spread (1,436 cases across 19 countries, incl. Poland\'s first case) illustrate a climate-sensitive vector expanding north. Climate change is a quantified driver: "Contribution of climate change to the spatial expansion of West Nile virus in Europe," Nature Communications 2024. (EU/EEA-only totals are lower for some years, e.g. 2018.)',
    source: 'ECDC surveillance; Nature Communications 2024',
    sourceUrl: 'https://www.ecdc.europa.eu/en/west-nile-fever/surveillance-and-disease-data/historical',
    direction: 'down',
    group: 'advanced-adaptation',
    isSeed: true,
    data: [
      { year: 2011, value: 340 },
      { year: 2012, value: 935 },
      { year: 2013, value: 785 },
      { year: 2014, value: 210 },
      { year: 2015, value: 124 },
      { year: 2016, value: 238 },
      { year: 2017, value: 210 },
      { year: 2018, value: 2083 },
      { year: 2019, value: 463 },
      { year: 2020, value: 336 },
      { year: 2021, value: 159 },
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
      'ADVANCED (EUCRA ecosystems cluster — wildfire is one of the 8 "urgent action needed" risks). Area burnt by wildfires each year in the EU, the canonical EFFIS/JRC series (satellite, ≈95% coverage). 2025 set an all-time record ≈1,079,538 ha (first EU season above 1 M ha, ≈39% inside Natura 2000), eclipsing 2017 (≈988,427). 2006–2024 average ≈ 354,185 ha; highly volatile, read with a multi-year mean. Only EFFIS-confirmed years are shown (no interpolation for this volatile hazard); EFFIS revises figures between releases — re-pull the full 2006–2025 table.',
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
      'ADVANCED (EUCRA food & ecosystems clusters). Water Exploitation Index Plus — ratio of net freshwater use to renewable resources, EU-27 (EEA / Eurostat sdg_06_60; annual since 2000). A slowly-varying ≈5.3–6.2% with a gentle long-run easing and a 2022 uptick to 5.8% (confirmed 2018–2022). The EU aggregate is modest but masks severe seasonal/basin stress (>20% threshold): ≈30% of EU territory and ≈33% of population face water scarcity each year (Cyprus WEI+ 71, Malta 34, Romania 21 in 2022). 2000–2017 interpolated around the published level (flagged) — re-pull the exact EU-27 array from sdg_06_60.',
    source: 'EEA / Eurostat (sdg_06_60)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/product/page/sdg_06_60',
    direction: 'down',
    group: 'advanced-adaptation',
    isSeed: true,
    data: [
      { year: 2000, value: 6.2, estimated: true },
      { year: 2001, value: 6.1, estimated: true },
      { year: 2002, value: 6.1, estimated: true },
      { year: 2003, value: 6.3, estimated: true },
      { year: 2004, value: 6.0, estimated: true },
      { year: 2005, value: 6.0, estimated: true },
      { year: 2006, value: 5.9, estimated: true },
      { year: 2007, value: 5.9, estimated: true },
      { year: 2008, value: 5.8, estimated: true },
      { year: 2009, value: 5.7, estimated: true },
      { year: 2010, value: 5.6, estimated: true },
      { year: 2011, value: 5.7, estimated: true },
      { year: 2012, value: 5.6, estimated: true },
      { year: 2013, value: 5.5, estimated: true },
      { year: 2014, value: 5.4, estimated: true },
      { year: 2015, value: 5.5, estimated: true },
      { year: 2016, value: 5.4, estimated: true },
      { year: 2017, value: 5.5, estimated: true },
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
      'ADVANCED — NOVEL FLAGSHIP (EUCRA food cluster). Severity of cereal-yield losses from drought and heatwaves in Europe, from Brás, Seixas, Carvalhais & Jägermeyr, "Severity of drought and heatwave crop losses tripled over the last five decades in Europe," Environmental Research Letters 16:065012 (2021), based on FAOSTAT + EM-DAT 1961–2018. The average cereal-yield loss per event ≈ tripled, from −2.2% (1964–1990) to −7.3% (1991–2015); compound hot-droughts reach −30%. The two points are the published period averages at their mid-year. Major recent loss years: 2003, 2018, 2022, 2024.',
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
      'ADVANCED — NOVEL (EUCRA ecosystems cluster). Climate-driven forest canopy mortality in Europe (fire, windthrow, bark beetle), from Forzieri et al., "Emergent vulnerability to climate-driven disturbances in European forests," Nature Communications 12:1081 (2021), and the Senf & Seidl / European Forest Disturbance Atlas (ESSD 2025, Landsat 1985–2023). Total canopy mortality roughly DOUBLED over the three decades to ≈2018 (indexed 100 → ≈200), with bark-beetle damage up ≈600%; ≈439,000 km² disturbed cumulatively 1985–2023. The two points are a stepped index of the doubling; re-pull the annual disturbed-area km² from the ESSD Atlas for a yearly line.',
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
      'ADVANCED (EUCRA energy & health). Cooling degree days — climate-driven cooling demand and heat stress on buildings and the grid (Eurostat nrg_chdd_a, JRC AGRI4CAST; annual since 1979). The EU aggregate roughly quadrupled: 1979 = 37 → 2020 = 99 → 2022 = 140 (long-run average ≈ 75), with hot-summer spikes (2003, 2022). CDD is weather-driven and volatile year to year; the non-anchor years here are interpolated along the rising trend (flagged) — re-pull the exact EU-27 sums from nrg_chdd_a.',
    source: 'Eurostat (nrg_chdd_a) / EEA',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis/maps-and-charts/cooling-degree-days',
    direction: 'down',
    group: 'advanced-adaptation',
    isSeed: true,
    data: [
      { year: 1979, value: 37 },
      { year: 2000, value: 62, estimated: true },
      { year: 2003, value: 92, estimated: true },
      { year: 2005, value: 72, estimated: true },
      { year: 2008, value: 70, estimated: true },
      { year: 2010, value: 78, estimated: true },
      { year: 2012, value: 88, estimated: true },
      { year: 2014, value: 70, estimated: true },
      { year: 2015, value: 95, estimated: true },
      { year: 2017, value: 98, estimated: true },
      { year: 2018, value: 100, estimated: true },
      { year: 2019, value: 105, estimated: true },
      { year: 2020, value: 99 },
      { year: 2021, value: 88, estimated: true },
      { year: 2022, value: 140 },
      { year: 2023, value: 110, estimated: true },
      { year: 2024, value: 120, estimated: true },
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
      'ADVANCED (EUCRA economy & finance cluster). Share of weather- and climate-related losses that are uninsured in Europe (EEA / EIOPA natural-catastrophe protection-gap dashboard, historical view 1980–2024). Only ≈a quarter of losses are insured, so the protection gap is ≈75% and widening; many Member States are >90% uninsured. Context: ≈€738 bn of EU losses 1980–2023, of which ≈€162 bn in 2021–2023. Re-pull the per-peril annual insured-vs-economic-loss series from EIOPA.',
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

// ── Storylines ────────────────────────────────────────────────────────────────
// One short narrative per advanced indicator — WHY it matters and how it
// contributes to the overall climate-neutrality / resilience storyline. Kept in
// a central map (rather than inline) so the motivation reads as a coherent set,
// and applied to each indicator's `storyline` field at module load. Surfaced in
// the UI behind an info (ⓘ) button on the flow-chart chips and as a callout in
// the indicator drawer and database detail panel.
const STORYLINES: Record<string, string> = {
  // Mitigation ────────────────────────────────────────────────────────────────
  'adv-res-share-fec':
    'Decarbonising energy supply is the backbone of the whole transition: renewables displacing fossil fuels across power, heat and transport is what ultimately drives every sector’s emissions down. This headline share is the clearest single test of whether the EU is on the RED III pathway (42.5% by 2030) — progress here unlocks cuts everywhere downstream.',
  'adv-wind-solar-share':
    'Wind and solar are the cheapest, fastest-scaling clean-power sources, so their share of generation shows how quickly the grid itself is decarbonising. Their 2025 overtaking of fossil generation is the visible tipping point behind falling grid CO₂ intensity and the pay-off from electrifying everything.',
  'adv-fossil-power-share':
    'Every percentage point of fossil generation retired is a durable emission cut and less exposure to fuel-price shocks. Falling fossil share is the mirror image of the wind+solar rise and the precondition for clean electrification of transport, heat and industry.',
  'adv-grid-co2-intensity':
    'Electrification only cuts emissions if the electricity is clean — so grid CO₂ intensity is the multiplier that sets the climate value of every EV, heat pump and electric furnace. A falling intensity is what makes the “electrify everything” strategy actually pay off.',
  'adv-energy-methane':
    'Methane is short-lived but potent, so plugging energy-sector leakage and coal-mine emissions buys fast near-term warming relief. It is among the cheapest abatement available and the key test of the 2024 EU Methane Regulation.',
  'adv-eu-ets-emissions':
    'The EU ETS is the policy engine of the transition: its carbon price pushes power and industry to abate, and its verified emissions are the most direct read-out of whether the traded sectors are tracking the −62%-by-2030 cap. The record 2023 drop shows the mechanism biting.',
  'adv-circular-material-use':
    'Making materials from recycled rather than virgin feedstock skips the most energy- and emission-intensive processing steps, so circularity cuts industrial emissions while reducing raw-material dependence. It is the demand-side complement to clean production processes.',
  'adv-new-car-co2':
    'New-car CO₂ standards are the main lever pulling the road fleet to zero; because a car stays on the road ~15 years, today’s new-car average locks in a decade of tailpipe emissions. The glide path to 0 g/km in 2035 is what makes road decarbonisation inevitable.',
  'adv-bev-share':
    'Battery-electric sales are the leading indicator of fleet turnover — every BEV sold is a fossil car not sold, compounding into falling transport emissions as the stock turns over, while pulling demand for clean power and batteries.',
  'adv-res-transport':
    'Transport is the hardest sector to decarbonise and the only one whose emissions have risen since 1990; the renewable-energy-in-transport share tracks the combined push of electrification and clean fuels toward the 29%-by-2030 target.',
  'adv-freight-rail-share':
    'Shifting freight from road to rail and waterway cuts energy use per tonne-km several-fold, so the rail share is the clearest structural (modal-shift) lever for freight — one that does not depend on new vehicle technology.',
  'adv-energy-poverty':
    'A transition that leaves households unable to heat their homes loses public consent, so energy poverty is the just-transition guardrail: it shows whether efficiency, electrification and the Social Climate Fund are protecting vulnerable people as fossil heating is priced out.',
  'adv-heat-pump-sales':
    'Heat pumps are the key technology for decarbonising building heat, replacing gas and oil boilers with efficient electric heat. Annual sales are the leading indicator of how fast the stock is switching away from fossil heating.',
  'adv-organic-farming':
    'Organic and low-input farming cuts synthetic-fertiliser demand (and its N₂O emissions) while supporting soil carbon and biodiversity, so its area share tracks the agro-ecological shift behind lower farm emissions and the 25%-by-2030 target.',
  'adv-nitrogen-balance':
    'Excess nitrogen drives potent N₂O emissions, water pollution and energy-intensive fertiliser use; shrinking the nitrogen surplus is the core efficiency lever that lowers agricultural emissions without cutting output.',
  'adv-lulucf-net':
    'Land is the EU’s only large natural carbon sink and the linchpin of net zero — removals here offset the residual emissions that cannot be eliminated elsewhere. The weakening sink is the single biggest threat to the 2050 target and shows why the −310 Mt 2030 goal is off track.',
  'adv-forest-sink-decline':
    'Forests do most of the heavy lifting in the land sink, but the Nature-2025 evidence of a ~27% decline — from ageing stands, harvesting, drought and pests — means the EU may have to cut harder elsewhere to stay on the net-zero path. This is the flagship “sink at risk” signal.',
  'adv-peatland-emissions':
    'A tiny area of drained peat emits a huge share of land-use emissions, so rewetting peatlands is one of the highest-leverage, lowest-cost mitigation options — and the science suggests inventories may even understate the prize.',

  // Adaptation & resilience ────────────────────────────────────────────────────
  'adv-adapt-economic-losses':
    'Mitigation limits how bad climate change gets; adaptation manages the damage already locked in. The long-run rise in economic losses is the bottom-line reason resilience now sits beside mitigation — losses are accelerating faster than Europe is adapting.',
  'adv-adapt-global-temp':
    'Every risk in the adaptation track is ultimately driven by warming, so the global temperature anomaly is the master driver. Because Europe is warming about twice as fast as the world, this curve sets the pace at which all the resilience challenges intensify.',
  'adv-adapt-sea-level':
    'Sea-level rise is the slow-onset hazard that puts coastal cities, ports and transport at permanent risk; its accelerating, locked-in trajectory is why coastal adaptation must start now even under strong mitigation.',
  'adv-adapt-heat-mortality':
    'Heat is the deadliest climate hazard in Europe and the most direct human cost of warming, so heat mortality is the headline test of whether health systems, cities and buildings are adapting fast enough to keep people alive.',
  'adv-adapt-west-nile':
    'Warming is pushing disease-carrying mosquitoes northward into new EU regions; the rise of locally-acquired West Nile cases is an early-warning signal that climate change is creating entirely new public-health risks that need surveillance and prevention.',
  'adv-adapt-burnt-area':
    'Wildfire is the most visible ecosystem climate risk: it destroys the very carbon stocks the land sink depends on, and threatens lives and property. Burnt area tracks both the rising hazard and the effectiveness of fire management.',
  'adv-adapt-wei':
    'Water links farming, power-plant cooling and industry, so the Water Exploitation Index shows where demand is outrunning supply — flagging the scarcity that drought and heat will intensify across several sectors at once.',
  'adv-adapt-crop-loss':
    'Food security is a core resilience concern; the tripling of drought- and heat-driven crop losses quantifies how extremes are already eroding yields, motivating drought-tolerant crops, efficient irrigation and diversified food systems.',
  'adv-adapt-forest-disturbance':
    'Climate-driven fire, windthrow and bark-beetle outbreaks are killing trees faster, which harms ecosystems and undermines the forest carbon sink — making forest resilience a prerequisite for the land-based removals net zero relies on.',
  'adv-adapt-cooling-degree-days':
    'Rising cooling demand stresses the grid exactly when heat threatens health, tying the energy and health risk clusters together. Cooling degree days is the clean, long climate signal behind both peak-demand resilience and overheating in buildings.',
  'adv-adapt-coastal-transport-damage':
    'Critical infrastructure underpins the whole economy; this Nature-2025 measure shows how coastal flooding will sharply raise damage to Europe’s roads and railways, quantifying the case for climate-proofing the TEN-T network.',
  'adv-adapt-river-flood-damage':
    'River and pluvial flooding is among EUCRA’s most urgent risks; expected annual flood damage shows the scale of avoidable losses and why flood defences and risk-informed planning are high-return adaptation investments.',
  'adv-adapt-insurance-gap':
    'When losses are uninsured, households and public budgets absorb the shock — so the protection gap is the economy-and-finance resilience measure. A widening gap signals systemic financial vulnerability to climate extremes.',
  'adv-adapt-cities-plans':
    'Adaptation ultimately happens locally, so the share of cities with adaptation plans tracks whether the governance and response capacity is being built to turn risk awareness into action on the ground.',
};

for (const ind of [...ADVANCED_INDICATORS, ...ADVANCED_ADAPTATION_INDICATORS]) {
  const s = STORYLINES[ind.id];
  if (s) ind.storyline = s;
}

/** All advanced indicators (mitigation + adaptation), for index/seed convenience. */
export const ALL_ADVANCED_INDICATORS: Indicator[] = [
  ...ADVANCED_INDICATORS,
  ...ADVANCED_ADAPTATION_INDICATORS,
];
