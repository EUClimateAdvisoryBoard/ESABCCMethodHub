/**
 * Industry-focused seed indicators for the Project Workspace "Industry Project".
 * -----------------------------------------------------------------------------
 * A curated indicator set for the EU industrial-decarbonisation workspace, taken
 * in the *wider* sense of industry: direct industrial emissions and energy use,
 * the electrification and hydrogen build-out that decarbonises process heat,
 * the carbon-pricing / carbon-leakage instruments that bear on industry (ETS,
 * CBAM), clean-tech deployment, and material circularity.
 *
 * Like the ECNO seed set (see `ecno-indicators.ts`), indicator names and
 * descriptions are paraphrased; numeric values and units come from the primary
 * publishers named in each entry's `source` field. Every series is editable in
 * the UI and the values are a starting point for the Secretariat to refine —
 * they are not an authoritative dataset.
 *
 * Primary sources:
 *   • EEA greenhouse-gas data viewer  — https://www.eea.europa.eu/en/analysis
 *   • Eurostat (energy, waste, prices) — https://ec.europa.eu/eurostat
 *   • EU ETS / EUA price (EEX, ICE)    — secondary-market settlement
 *   • Hydrogen Europe / IEA            — electrolyser capacity tracking
 */
import type { Indicator } from './ecno-indicators';

/**
 * Industry indicators seeded into the Industry Project. All carry
 * `group: 'additional'` so they list together under the sidebar's secondary
 * cluster, with `category` from the standard indicator taxonomy (mostly
 * `industry`, with a few `finance` entries for the wider framing).
 */
export const INDUSTRY_INDICATORS: Indicator[] = [
  {
    id: 'ind-industry-ghg',
    name: 'Industrial GHG emissions (energy + processes)',
    category: 'industry',
    unit: 'Mt CO₂e',
    description:
      'Combined energy-related and process emissions from EU-27 manufacturing '
      + 'industry and construction (CRF sectors 1.A.2 + 2). The headline '
      + 'industrial-decarbonisation indicator.',
    source: 'EEA greenhouse-gas data viewer',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis',
    direction: 'down',
    targetValue: 430,
    targetYear: 2030,
    isSeed: true,
    group: 'additional',
    data: [
      { year: 2015, value: 718 },
      { year: 2017, value: 712 },
      { year: 2019, value: 689 },
      { year: 2020, value: 643 },
      { year: 2021, value: 672 },
      { year: 2022, value: 631 },
      { year: 2023, value: 588 },
    ],
  },
  {
    id: 'ind-energy-intensity',
    name: 'Energy intensity of industry',
    category: 'industry',
    unit: 'GJ per €1,000 gross value added',
    description:
      'Final energy consumption of industry divided by industrial gross value '
      + 'added — a proxy for industrial energy efficiency.',
    source: 'Eurostat (nrg_bal, nama_10_a64)',
    sourceUrl: 'https://ec.europa.eu/eurostat/web/energy/database',
    direction: 'down',
    isSeed: true,
    group: 'additional',
    data: [
      { year: 2015, value: 4.9 },
      { year: 2017, value: 4.7 },
      { year: 2019, value: 4.5 },
      { year: 2021, value: 4.3 },
      { year: 2022, value: 4.1 },
      { year: 2023, value: 4.0 },
    ],
  },
  {
    id: 'ind-electrification',
    name: 'Electrification of industrial final energy',
    category: 'industry',
    unit: '% of industry final energy',
    description:
      'Electricity as a share of total final energy consumption in industry. '
      + 'Direct electrification is the main lever for low-temperature process '
      + 'heat and a precondition for deep industrial decarbonisation.',
    source: 'Eurostat (nrg_bal_c)',
    sourceUrl: 'https://ec.europa.eu/eurostat/web/energy/database',
    direction: 'up',
    targetValue: 45,
    targetYear: 2030,
    isSeed: true,
    group: 'additional',
    data: [
      { year: 2015, value: 32.2 },
      { year: 2017, value: 32.8 },
      { year: 2019, value: 33.4 },
      { year: 2021, value: 34.1 },
      { year: 2022, value: 34.6 },
      { year: 2023, value: 35.2 },
    ],
  },
  {
    id: 'ind-hydrogen-electrolyser-capacity',
    name: 'Installed electrolyser capacity',
    category: 'industry',
    unit: 'GW',
    description:
      'Cumulative installed water-electrolyser capacity in the EU-27 for '
      + 'renewable / low-carbon hydrogen — feedstock for hard-to-electrify '
      + 'industry (steel, ammonia, refining). REPowerEU targets 10 Mt domestic '
      + 'production by 2030 (~100+ GW of electrolysers).',
    source: 'Hydrogen Europe / IEA Hydrogen Projects database',
    sourceUrl: 'https://www.iea.org/data-and-statistics/data-product/hydrogen-projects-database',
    direction: 'up',
    targetValue: 100,
    targetYear: 2030,
    isSeed: true,
    group: 'additional',
    data: [
      { year: 2018, value: 0.05 },
      { year: 2020, value: 0.12 },
      { year: 2021, value: 0.16 },
      { year: 2022, value: 0.24 },
      { year: 2023, value: 0.38 },
    ],
  },
  {
    id: 'ind-circular-material-use-rate',
    name: 'Circular material use rate',
    category: 'industry',
    unit: '% of material use from recycling',
    description:
      'Share of material resources used in the EU that came from recycled '
      + 'waste — the headline circular-economy indicator and a structural lever '
      + 'on industrial process emissions and material demand.',
    source: 'Eurostat (env_ac_cur)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/env_ac_cur/default/table',
    direction: 'up',
    targetValue: 23.4,
    targetYear: 2030,
    isSeed: true,
    group: 'additional',
    data: [
      { year: 2015, value: 11.2 },
      { year: 2017, value: 11.5 },
      { year: 2019, value: 11.9 },
      { year: 2021, value: 11.5 },
      { year: 2022, value: 11.8 },
      { year: 2023, value: 11.8 },
    ],
  },
  {
    id: 'ind-ets-allowance-price',
    name: 'EU ETS allowance price (EUA)',
    category: 'finance',
    unit: '€ per t CO₂',
    description:
      'Annual average secondary-market settlement price of an EU Emission '
      + 'Allowance. The carbon-price signal that bears most directly on '
      + 'energy-intensive industry under ETS1.',
    source: 'EEX / ICE secondary-market settlement (annual average)',
    sourceUrl: 'https://www.eex.com/en/market-data/environmental-markets',
    direction: 'up',
    isSeed: true,
    group: 'additional',
    data: [
      { year: 2018, value: 16 },
      { year: 2019, value: 25 },
      { year: 2020, value: 25 },
      { year: 2021, value: 54 },
      { year: 2022, value: 81 },
      { year: 2023, value: 84 },
      { year: 2024, value: 65 },
    ],
  },
  {
    id: 'ind-free-allocation',
    name: 'Free ETS allowances to industry',
    category: 'finance',
    unit: 'Mt CO₂e allowances',
    description:
      'Free allowances allocated to stationary industrial installations under '
      + 'the ETS. Set to phase down to zero for CBAM sectors from 2026–2034 as '
      + 'the border adjustment phases in.',
    source: 'EEA EU ETS data viewer',
    sourceUrl: 'https://www.eea.europa.eu/en/analysis/maps-and-charts/emissions-trading-viewer-1-dashboards',
    direction: 'down',
    isSeed: true,
    group: 'additional',
    data: [
      { year: 2018, value: 692 },
      { year: 2019, value: 685 },
      { year: 2020, value: 678 },
      { year: 2021, value: 661 },
      { year: 2022, value: 642 },
      { year: 2023, value: 618 },
    ],
  },
  {
    id: 'ind-clean-tech-investment',
    name: 'Clean-tech manufacturing investment',
    category: 'finance',
    unit: '€ bn / year',
    description:
      'Announced and committed investment in EU clean-tech manufacturing '
      + '(batteries, electrolysers, solar PV, heat pumps, wind components) — '
      + 'tracks delivery of the Net-Zero Industry Act ambition.',
    source: 'IEA Clean Energy Manufacturing tracking / Commission estimates',
    sourceUrl: 'https://www.iea.org/energy-system/industry',
    direction: 'up',
    isSeed: true,
    group: 'additional',
    data: [
      { year: 2019, value: 9 },
      { year: 2020, value: 12 },
      { year: 2021, value: 18 },
      { year: 2022, value: 28 },
      { year: 2023, value: 41 },
    ],
  },
];
