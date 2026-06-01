/**
 * Seed indicators for the Project Workspace "Indicator Database" module.
 * ----------------------------------------------------------------------
 * Built from the ECNO (European Climate Neutrality Observatory) indicator
 * framework. Each indicator declares its public open-data source so that a
 * follow-up wiring step can replace the embedded values with live pulls
 * from Eurostat / EEA / European Commission portals.
 *
 * Values below are the latest publicly available EU-27 figures at the time
 * of seeding (per the cited sources). They are intentionally short
 * time-series — enough to render a chart out of the box; longer history
 * should come from the live API connectors when wired up.
 *
 * Sources:
 *   • ECNO indicator framework — https://climateobservatory.eu
 *   • EEA GHG inventory        — https://www.eea.europa.eu/en/datahub
 *   • Eurostat NRG / SDG       — https://ec.europa.eu/eurostat
 */

export type IndicatorCategory =
  | 'emissions'
  | 'energy-supply'
  | 'energy-demand'
  | 'transport'
  | 'buildings'
  | 'industry'
  | 'agriculture'
  | 'lulucf'
  | 'finance'
  | 'fairness';

export interface IndicatorDataPoint {
  year: number;
  value: number;
}

export interface Indicator {
  id: string;
  name: string;
  category: IndicatorCategory;
  unit: string;
  description: string;
  source: string;
  sourceUrl: string;
  /** Target value at the target year (if defined by EU law or strategy). */
  targetValue?: number;
  targetYear?: number;
  /** Direction of progress: "down" means lower-is-better. */
  direction: 'up' | 'down';
  data: IndicatorDataPoint[];
  /** True for ECNO/seed indicators; user-added ones are false. */
  isSeed: boolean;
}

export const ECNO_INDICATORS: Indicator[] = [
  {
    id: 'ghg-total-net',
    name: 'Net GHG emissions (excl. LULUCF)',
    category: 'emissions',
    unit: 'Mt CO₂eq',
    description:
      'Total EU-27 net greenhouse gas emissions excluding LULUCF, ' +
      'reported under the UNFCCC inventory.',
    source: 'EEA GHG inventory',
    sourceUrl: 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2',
    targetValue: 850,
    targetYear: 2030,
    direction: 'down',
    isSeed: true,
    data: [
      { year: 2018, value: 3893 },
      { year: 2019, value: 3743 },
      { year: 2020, value: 3457 },
      { year: 2021, value: 3635 },
      { year: 2022, value: 3548 },
      { year: 2023, value: 3225 },
    ],
  },
  {
    id: 'res-share',
    name: 'Renewable energy share in gross final energy consumption',
    category: 'energy-supply',
    unit: '%',
    description:
      'Share of energy from renewable sources in gross final energy ' +
      'consumption (RED III binding 2030 target: 42.5%, indicative 45%).',
    source: 'Eurostat (nrg_ind_ren)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table',
    targetValue: 42.5,
    targetYear: 2030,
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2018, value: 18.0 },
      { year: 2019, value: 19.1 },
      { year: 2020, value: 22.0 },
      { year: 2021, value: 21.9 },
      { year: 2022, value: 23.0 },
      { year: 2023, value: 24.5 },
    ],
  },
  {
    id: 'final-energy-consumption',
    name: 'Final energy consumption',
    category: 'energy-demand',
    unit: 'Mtoe',
    description:
      'EU final energy consumption. EED 2030 indicative target: 763 Mtoe.',
    source: 'Eurostat (nrg_bal_c)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table',
    targetValue: 763,
    targetYear: 2030,
    direction: 'down',
    isSeed: true,
    data: [
      { year: 2018, value: 1064 },
      { year: 2019, value: 1053 },
      { year: 2020, value: 962 },
      { year: 2021, value: 1018 },
      { year: 2022, value: 977 },
      { year: 2023, value: 940 },
    ],
  },
  {
    id: 'ev-share-new-cars',
    name: 'Battery-electric vehicle share of new car registrations',
    category: 'transport',
    unit: '%',
    description:
      'Share of new passenger car registrations that are battery-electric. ' +
      'Tracks progress towards the CO₂-emission standards for new cars (100% ZEV by 2035).',
    source: 'EEA / ACEA',
    sourceUrl: 'https://www.eea.europa.eu/en/datahub/datahubitem-view/fa8b1229-3db6-495d-b18e-9c9b3267c02b',
    targetValue: 100,
    targetYear: 2035,
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2019, value: 1.9 },
      { year: 2020, value: 6.2 },
      { year: 2021, value: 9.1 },
      { year: 2022, value: 12.1 },
      { year: 2023, value: 14.6 },
      { year: 2024, value: 13.6 },
    ],
  },
  {
    id: 'building-renovation-rate',
    name: 'Energy-related building renovation rate',
    category: 'buildings',
    unit: '%/yr',
    description:
      'Weighted annual energy renovation rate of the EU building stock. ' +
      'EPBD recast (2024) requires Member States to at least double the deep-renovation rate.',
    source: 'JRC / Commission staff working document',
    sourceUrl: 'https://commission.europa.eu/topics/energy-efficiency/energy-efficient-buildings_en',
    targetValue: 2.0,
    targetYear: 2030,
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2018, value: 1.0 },
      { year: 2019, value: 1.0 },
      { year: 2020, value: 1.0 },
      { year: 2021, value: 1.1 },
      { year: 2022, value: 1.2 },
    ],
  },
  {
    id: 'industry-ghg',
    name: 'Industrial process and energy-use GHG emissions',
    category: 'industry',
    unit: 'Mt CO₂eq',
    description:
      'Combined GHG emissions from industrial energy use (CRF 1.A.2) and ' +
      'industrial processes & product use (CRF 2), EU-27.',
    source: 'EEA GHG inventory',
    sourceUrl: 'https://www.eea.europa.eu/en/datahub',
    direction: 'down',
    isSeed: true,
    data: [
      { year: 2018, value: 813 },
      { year: 2019, value: 793 },
      { year: 2020, value: 740 },
      { year: 2021, value: 775 },
      { year: 2022, value: 728 },
      { year: 2023, value: 670 },
    ],
  },
  {
    id: 'agri-ghg',
    name: 'Agriculture GHG emissions',
    category: 'agriculture',
    unit: 'Mt CO₂eq',
    description: 'EU-27 agriculture-sector GHG emissions (CRF 3).',
    source: 'EEA GHG inventory',
    sourceUrl: 'https://www.eea.europa.eu/en/datahub',
    direction: 'down',
    isSeed: true,
    data: [
      { year: 2018, value: 387 },
      { year: 2019, value: 386 },
      { year: 2020, value: 383 },
      { year: 2021, value: 378 },
      { year: 2022, value: 372 },
      { year: 2023, value: 367 },
    ],
  },
  {
    id: 'lulucf-net-removal',
    name: 'LULUCF net removals',
    category: 'lulucf',
    unit: 'Mt CO₂eq',
    description:
      'Net carbon removals from Land Use, Land-Use Change & Forestry. ' +
      'LULUCF Regulation 2030 target: -310 Mt CO₂eq (i.e. removal of 310 Mt).',
    source: 'EEA GHG inventory',
    sourceUrl: 'https://www.eea.europa.eu/en/datahub',
    targetValue: -310,
    targetYear: 2030,
    direction: 'down',
    isSeed: true,
    data: [
      { year: 2018, value: -266 },
      { year: 2019, value: -251 },
      { year: 2020, value: -234 },
      { year: 2021, value: -230 },
      { year: 2022, value: -216 },
      { year: 2023, value: -224 },
    ],
  },
  {
    id: 'clean-tech-investment',
    name: 'Clean-energy investment',
    category: 'finance',
    unit: 'bn EUR',
    description:
      'Annual EU clean-energy investment (renewables, grids, efficiency, ' +
      'electrified transport). Sourced from IEA World Energy Investment.',
    source: 'IEA World Energy Investment',
    sourceUrl: 'https://www.iea.org/reports/world-energy-investment-2024',
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2019, value: 175 },
      { year: 2020, value: 195 },
      { year: 2021, value: 245 },
      { year: 2022, value: 305 },
      { year: 2023, value: 360 },
    ],
  },
  {
    id: 'energy-poverty-share',
    name: 'Population unable to keep home adequately warm',
    category: 'fairness',
    unit: '%',
    description:
      'Share of EU population reporting inability to keep their home ' +
      'adequately warm — proxy indicator for energy poverty.',
    source: 'Eurostat (ilc_mdes01)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/ilc_mdes01/default/table',
    direction: 'down',
    isSeed: true,
    data: [
      { year: 2018, value: 7.3 },
      { year: 2019, value: 6.9 },
      { year: 2020, value: 7.5 },
      { year: 2021, value: 6.9 },
      { year: 2022, value: 9.3 },
      { year: 2023, value: 10.6 },
    ],
  },
];

/**
 * Indicators with a registered live-source connector (see
 * `src/lib/project-workspace/live-sources.ts`). The UI uses this list to
 * enable the "Refresh from source" button. Keep in sync with the registry
 * — entries missing from one place but present in the other are silently
 * unreachable.
 */
export const LIVE_REFRESHABLE_INDICATORS: ReadonlySet<string> = new Set([
  // Wired against Eurostat's JSON-stat REST API. EEA-sourced indicators
  // still update by hand because the datahub lacks a stable REST endpoint;
  // see live-sources.ts for the parked EEA scaffolding.
  'res-share',
  'final-energy-consumption',
  'energy-poverty-share',
]);

export const INDICATOR_CATEGORIES: { id: IndicatorCategory; label: string }[] = [
  { id: 'emissions',     label: 'Emissions' },
  { id: 'energy-supply', label: 'Energy supply' },
  { id: 'energy-demand', label: 'Energy demand' },
  { id: 'transport',     label: 'Transport' },
  { id: 'buildings',     label: 'Buildings' },
  { id: 'industry',      label: 'Industry' },
  { id: 'agriculture',   label: 'Agriculture' },
  { id: 'lulucf',        label: 'LULUCF' },
  { id: 'finance',       label: 'Finance' },
  { id: 'fairness',      label: 'Fairness & jobs' },
];
