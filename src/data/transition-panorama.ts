/**
 * EU Transition Panorama — bundled dataset.
 *
 * All series are transcribed from the underlying-data workbook of the
 * Advisory Board's progress report "Towards EU climate neutrality"
 * (`ESABCC_report_Towards EU climate neutrality_underlying data.xlsx`,
 * repo root):
 *
 *   - Historical sector / subsector emissions ......... EEA GHG data viewer
 *     (Figures 4, 8, 11/13, 20/23, 32/34, 45/47, 54/56, 63/65; Mt CO2e,
 *     sector totals to 2022, subsector splits to 2021)
 *   - 2030 benchmarks ................................. Fit for 55 MIX scenario
 *   - 2040 / 2050 advice ranges ....................... ESABCC (2023) "Scientific
 *     advice for the determination of an EU-wide 2040 climate target", built
 *     on the IPCC AR6 scenario database filtered for 1.5°C-compatible EU
 *     pathways (the AR7 scenario database does not exist yet)
 *   - WAM projections ................................. Member States' GHG
 *     projections reported to the EEA
 *
 * Transition-lever statuses are indicative summaries of the assessments in
 * the 2024 progress report — they are labelled as such in the UI.
 */

import { ESABCC } from '@/lib/esabcc-palette';

export interface YearValue {
  year: number;
  value: number; // Mt CO2e
}

export interface PanoramaBenchmark {
  year: number;
  low: number;
  high?: number; // present for ranges (e.g. the 2040 advice corridor)
  label: string;
  source: string;
}

export type LeverStatus =
  | 'on-track'
  | 'mixed'
  | 'too-slow'
  | 'wrong-direction'
  | 'data-gap';

export interface TransitionLever {
  id: string; // progress-report indicator code, e.g. "E4a"
  name: string;
  status: LeverStatus;
  note: string;
}

export interface PanoramaNode {
  id: string;
  name: string;
  color: string;
  /** True for net-removal nodes (LULUCF, forest land, harvested wood). */
  isSink?: boolean;
  /** Historical net emissions, Mt CO2e. */
  series: YearValue[];
  benchmarks?: PanoramaBenchmark[];
  levers?: TransitionLever[];
  children?: PanoramaNode[];
  note?: string;
}

export const LEVER_STATUS_META: Record<LeverStatus, { label: string; color: string }> = {
  'on-track':        { label: 'Broadly on track',  color: ESABCC.forestGreen },
  'mixed':           { label: 'Mixed progress',    color: ESABCC.signature },
  'too-slow':        { label: 'Too slow',          color: ESABCC.lightOrange },
  'wrong-direction': { label: 'Wrong direction',   color: ESABCC.red },
  'data-gap':        { label: 'Data gap',          color: ESABCC.sageGreen },
};

/** Expand a list of values starting at `from` into {year, value} pairs. */
function s(from: number, values: number[]): YearValue[] {
  return values.map((value, i) => ({ year: from + i, value }));
}

const SRC_EEA = 'EEA GHG data viewer';
const SRC_FF55 = 'Fit for 55 MIX scenario';
const SRC_ADVICE =
  'ESABCC (2023), Scientific advice for the determination of an EU-wide 2040 climate target — AR6-based 1.5°C-compatible EU pathways';

/** 1990 base implied by the −55 % 2030 target (2 149.8 Mt = 45 % of 1990). */
export const EU_1990_BASE_MT = 4777.3;

/** EU total net GHG emissions (ECL scope) and the pathway to net zero. */
export const TOTAL_PATHWAY = {
  historical: s(2005, [
    4393.9, 4392.8, 4417.4, 4279.6, 3940.7, 4025.2, 3921.3, 3843.7, 3752.9,
    3626.5, 3680.9, 3696.0, 3796.3, 3711.2, 3564.0, 3195.8, 3393.8, 3333.9,
  ]),
  /** With-additional-measures projections reported by Member States. */
  wam: s(2021, [
    3303.8, 3207.2, 3179.0, 3075.5, 2986.9, 2871.6, 2752.3, 2646.9, 2531.3,
    2429.3, 2358.8, 2289.6, 2223.8, 2161.1, 2094.8, 2046.6, 2002.4, 1962.4,
    1919.4, 1878.2, 1809.6, 1795.0, 1781.9, 1767.9, 1770.4, 1748.0, 1741.2,
    1734.6, 1728.3, 1716.7,
  ]),
  targets: [
    { year: 2030, low: 2149.8, label: '2030 target (−55 % vs 1990)', source: 'European Climate Law' },
    { year: 2040, low: 239, high: 478, label: '2040 advice range (−90 to −95 % vs 1990)', source: SRC_ADVICE },
    { year: 2050, low: 0, label: '2050 climate neutrality', source: 'European Climate Law' },
  ] as PanoramaBenchmark[],
};

export const PANORAMA_SECTORS: PanoramaNode[] = [
  {
    id: 'energy-supply',
    name: 'Energy supply',
    color: ESABCC.signalOrange,
    series: s(2005, [
      1489, 1494, 1504, 1433, 1325, 1343, 1334, 1316, 1254, 1190, 1197, 1169,
      1162, 1099, 974, 842, 902, 924,
    ]),
    benchmarks: [
      { year: 2030, low: 489, label: '2030 benchmark', source: SRC_FF55 },
      { year: 2040, low: 83, high: 141, label: '2040 advice scenarios', source: SRC_ADVICE },
      { year: 2050, low: 50, label: '2050 benchmark', source: 'Climate Target Plan MIX scenario' },
    ],
    levers: [
      { id: 'E4a', name: 'Solar PV capacity additions', status: 'on-track', note: 'Annual additions exceeded the REPowerEU trajectory in recent years.' },
      { id: 'E4b', name: 'Wind capacity additions', status: 'too-slow', note: 'Onshore and offshore additions remain below the pace required for 2030.' },
      { id: 'E5', name: 'Electrification of final energy', status: 'too-slow', note: 'The share of electricity in final energy use is rising too slowly.' },
      { id: 'E1', name: 'Unabated coal phase-out', status: 'mixed', note: 'Coal power emissions fell sharply over 2005–2020 but rebounded in 2021–2022.' },
      { id: 'E6', name: 'Energy-related methane emissions', status: 'too-slow', note: 'Reductions in energy-sector methane are not yet on a 1.5°C-compatible pace.' },
    ],
    children: [
      { id: 'power-solid', name: 'Power & heat — solid fossils', color: '', series: s(2005, [862, 867, 884, 814, 753, 760, 783, 806, 787, 750, 743, 692, 676, 632, 490, 388, 454]) },
      { id: 'power-gas', name: 'Power & heat — fossil gas', color: '', series: s(2005, [216, 222, 234, 245, 225, 234, 214, 187, 157, 134, 147, 172, 189, 176, 202, 198, 195]) },
      { id: 'power-liquid', name: 'Power & heat — liquid & other fossils', color: '', series: s(2005, [119, 113, 100, 96, 94, 89, 81, 81, 75, 76, 78, 80, 77, 75, 73, 66, 68]) },
      { id: 'refineries', name: 'Petroleum refineries', color: '', series: s(2005, [124, 124, 126, 124, 116, 116, 113, 110, 108, 105, 106, 105, 103, 100, 100, 93, 93]) },
      { id: 'energy-other', name: 'Other energy supply', color: '', series: s(2005, [168, 168, 161, 155, 137, 144, 143, 132, 128, 125, 122, 119, 118, 116, 108, 96, 92]) },
    ],
  },
  {
    id: 'industry',
    name: 'Industry',
    color: ESABCC.seaBlue,
    series: s(2005, [
      981.3, 973.8, 995.6, 952.3, 789.4, 838.8, 826.2, 795.7, 775.5, 769.2,
      768.8, 776.2, 791.0, 785.3, 760.1, 719.6, 757.5, 691.3,
    ]),
    benchmarks: [
      { year: 2030, low: 496.4, label: '2030 benchmark', source: SRC_FF55 },
      { year: 2040, low: 89, high: 218, label: '2040 advice scenarios (CO2 only)', source: SRC_ADVICE },
      { year: 2050, low: 77.5, label: '2050 benchmark', source: 'Climate Target Plan MIX scenario' },
    ],
    levers: [
      { id: 'I3', name: 'Circular material use', status: 'too-slow', note: 'The EU circular material use rate has been close to flat for a decade.' },
      { id: 'I4', name: 'GHG intensity of steel, cement & chemicals', status: 'too-slow', note: 'Process emission intensities are declining well below the required pace.' },
      { id: 'I6', name: 'Industrial electrification & fuel switch', status: 'too-slow', note: 'Fossil fuels still dominate industrial final energy use.' },
      { id: 'I7', name: 'Low-carbon production projects', status: 'mixed', note: 'A growing project pipeline in steel and cement, but few at commercial scale.' },
    ],
    children: [
      { id: 'iron-steel', name: 'Iron and steel', color: '', series: s(2005, [193.2, 198.5, 201.9, 186.8, 129.6, 162.1, 158.8, 149.0, 146.6, 147.3, 153.1, 152.1, 155.3, 152.5, 145.4, 127.0, 147.0]) },
      { id: 'chemicals', name: 'Chemicals', color: '', series: s(2005, [194.7, 181.2, 182.8, 171.1, 144.7, 144.5, 140.7, 134.9, 129.8, 123.7, 122.3, 122.0, 127.5, 127.9, 121.3, 120.9, 123.9]) },
      { id: 'cement', name: 'Cement', color: '', series: s(2005, [143.4, 147.2, 163.1, 150.5, 121.3, 119.3, 117.0, 109.9, 105.8, 110.7, 109.0, 109.1, 111.9, 113.7, 113.1, 107.4, 110.2]) },
      { id: 'industry-other', name: 'Other sub-sectors', color: '', series: s(2005, [450.0, 446.9, 447.9, 443.9, 393.9, 412.8, 409.7, 401.9, 393.3, 387.4, 384.4, 393.0, 396.4, 391.2, 380.4, 364.3, 376.4]) },
    ],
  },
  {
    id: 'transport',
    name: 'Transport',
    color: ESABCC.skyBlue,
    series: s(2005, [
      943.5, 956.7, 969.8, 952.3, 921.9, 918.0, 911.1, 880.4, 875.4, 882.7,
      901.8, 925.8, 949.1, 956.8, 965.7, 776.3, 851.9, 906.6,
    ]),
    benchmarks: [
      { year: 2030, low: 697.2, label: '2030 benchmark', source: SRC_FF55 },
      { year: 2040, low: 171.1, label: '2040 advice scenarios', source: SRC_ADVICE },
      { year: 2050, low: 54.8, high: 72.7, label: '2050 advice / benchmark', source: `${SRC_ADVICE}; Sustainable and Smart Mobility Strategy` },
    ],
    levers: [
      { id: 'T5a', name: 'Zero-emission vehicle uptake', status: 'on-track', note: 'ZEV shares in new car registrations have grown rapidly; vans and lorries lag.' },
      { id: 'T2', name: 'Transport demand management', status: 'wrong-direction', note: 'Passenger and freight demand keep growing, offsetting efficiency gains.' },
      { id: 'T3', name: 'Modal shift away from road and air', status: 'too-slow', note: 'Road keeps a stable ~95 % share of inland transport; air traffic is rebounding.' },
      { id: 'T6', name: 'Decarbonisation of transport fuels', status: 'too-slow', note: 'Fossil fuels still cover the vast majority of transport energy use.' },
    ],
    children: [
      { id: 'cars', name: 'Road — cars and motorcycles', color: '', series: s(2005, [491.6, 493.2, 499.7, 492.3, 487.9, 481.7, 475.2, 456.5, 458.8, 468.8, 477.0, 487.7, 493.5, 490.2, 493.4, 415.6, 450.3]) },
      { id: 'hdv', name: 'Road — HDVs and buses', color: '', series: s(2005, [212.7, 217.2, 217.8, 211.1, 199.9, 202.0, 201.6, 196.5, 194.0, 191.8, 196.1, 200.6, 206.1, 208.2, 210.4, 194.4, 209.4]) },
      { id: 'ldt', name: 'Road — light duty trucks', color: '', series: s(2005, [92.0, 93.9, 96.3, 91.9, 88.3, 87.2, 86.9, 83.9, 80.4, 80.5, 82.2, 83.3, 84.6, 85.9, 86.1, 77.5, 88.1]) },
      { id: 'rail-iww', name: 'Railways, inland waterways & others', color: '', series: s(2005, [34.3, 34.4, 33.1, 32.9, 31.1, 30.9, 29.0, 27.4, 26.3, 24.0, 24.8, 25.4, 26.8, 27.6, 27.9, 24.8, 24.5]) },
      { id: 'aviation', name: 'Aviation', color: '', series: s(2005, [112.8, 117.9, 122.9, 124.1, 114.6, 116.2, 118.5, 116.2, 115.9, 117.7, 121.7, 128.7, 138.2, 145.0, 147.9, 64.0, 79.6]) },
    ],
  },
  {
    id: 'buildings',
    name: 'Buildings',
    color: ESABCC.lightOrange,
    note: 'Direct emissions of residential and tertiary buildings (including agriculture energy use, ECL accounting scope).',
    series: s(2005, [
      665.0, 663.4, 589.5, 635.1, 621.4, 656.1, 581.5, 589.6, 593.9, 517.8,
      541.0, 547.7, 545.7, 532.9, 522.8, 519.7, 532.5, 481.8,
    ]),
    benchmarks: [
      { year: 2030, low: 250.3, label: '2030 benchmark', source: SRC_FF55 },
      { year: 2040, low: 83, high: 127, label: '2040 advice scenarios', source: SRC_ADVICE },
      { year: 2050, low: 2, high: 26.4, label: '2050 advice / benchmark', source: `${SRC_ADVICE}; 1.5LIFE scenario, A Clean Planet for All` },
    ],
    levers: [
      { id: 'B3', name: 'Renovation rate and depth', status: 'too-slow', note: 'Deep renovations cover well under 1 % of the residential stock per year.' },
      { id: 'B6', name: 'Heat pump roll-out', status: 'mixed', note: 'Strong growth to 2022, but sales slowed against the REPowerEU objective.' },
      { id: 'B2', name: 'Final energy consumption', status: 'too-slow', note: 'Energy use in buildings is falling more slowly than required.' },
      { id: 'B5', name: 'Fossil fuels in the heating mix', status: 'too-slow', note: 'Gas and oil still dominate residential and tertiary heating.' },
    ],
    children: [
      { id: 'residential', name: 'Residential', color: '', series: s(2005, [426.8, 420.5, 368.6, 399.0, 389.5, 413.0, 362.0, 372.5, 375.1, 316.9, 335.2, 341.3, 338.5, 328.4, 321.2, 319.4, 324.7]) },
      { id: 'tertiary', name: 'Tertiary', color: '', series: s(2005, [238.2, 243.0, 220.9, 236.1, 231.9, 243.1, 219.5, 217.0, 218.8, 200.9, 205.8, 206.4, 207.2, 204.5, 201.6, 200.3, 207.8]) },
    ],
  },
  {
    id: 'agriculture',
    name: 'Agriculture',
    color: ESABCC.sageGreen,
    note: 'Non-CO2 emissions (methane and nitrous oxide). Energy use in agriculture is counted under Buildings in the ECL scope.',
    series: s(2005, [
      380.1, 377.3, 380.2, 377.8, 372.7, 367.5, 366.7, 366.3, 367.9, 372.9,
      374.5, 375.9, 378.2, 375.0, 370.9, 371.9, 368.6, 360.9,
    ]),
    benchmarks: [
      { year: 2030, low: 333.2, label: '2030 benchmark', source: SRC_FF55 },
      { year: 2040, low: 162.7, high: 282.8, label: '2040 advice (demand-side focus to central)', source: SRC_ADVICE },
      { year: 2050, low: 114.3, high: 268.4, label: '2050 advice (demand-side focus to central)', source: SRC_ADVICE },
    ],
    levers: [
      { id: 'A2', name: 'Livestock emission intensity', status: 'too-slow', note: 'Emissions per unit of livestock product are almost flat.' },
      { id: 'A3', name: 'Nitrogen use efficiency', status: 'too-slow', note: 'Fertiliser use and nitrogen efficiency show little structural improvement.' },
      { id: 'A5', name: 'Dietary shift', status: 'too-slow', note: 'Average animal-product consumption remains well above pathway assumptions.' },
      { id: 'A6', name: 'Food waste reduction', status: 'data-gap', note: 'Monitoring only began in 2020; no trend can be assessed yet.' },
    ],
    children: [
      { id: 'enteric', name: 'Enteric fermentation', color: '', series: s(2005, [189.0, 188.0, 188.9, 188.1, 186.4, 184.3, 182.1, 182.1, 182.9, 184.2, 185.9, 186.5, 186.6, 185.6, 183.8, 183.7, 182.5]) },
      { id: 'manure', name: 'Manure management', color: '', series: s(2005, [69.1, 68.6, 68.9, 67.3, 66.9, 64.6, 64.7, 63.8, 63.0, 63.6, 64.3, 64.2, 64.5, 64.3, 63.8, 64.1, 62.9]) },
      { id: 'fertiliser', name: 'Fertiliser use', color: '', series: s(2005, [117.7, 116.4, 117.2, 117.9, 114.3, 113.4, 114.6, 114.6, 116.6, 119.7, 118.7, 119.6, 121.7, 120.0, 118.1, 118.6, 118.0]) },
      { id: 'agri-other', name: 'Other agriculture', color: '', series: s(2005, [4.3, 4.3, 5.2, 4.5, 5.1, 5.1, 5.4, 5.8, 5.4, 5.3, 5.6, 5.6, 5.3, 5.1, 5.1, 5.4, 5.2]) },
    ],
  },
  {
    id: 'lulucf',
    name: 'LULUCF',
    color: ESABCC.forestGreen,
    isSink: true,
    note: 'Land use, land-use change and forestry. Negative values are net removals; the EU sink has weakened by roughly a third since 2005.',
    series: s(2005, [
      -342, -351, -301, -344, -347, -353, -347, -343, -343, -328, -322, -318,
      -250, -258, -247, -241, -230, -244,
    ]),
    benchmarks: [
      { year: 2030, low: -310, label: '2030 target', source: 'LULUCF Regulation (EU) 2023/839' },
      { year: 2040, low: -323, label: '2040 advice scenarios', source: SRC_ADVICE },
      { year: 2050, low: -400, high: -312, label: '2050 benchmark / advice', source: `LULUCF Regulation impact assessment; ${SRC_ADVICE}` },
    ],
    levers: [
      { id: 'L6', name: 'Forest carbon sink', status: 'wrong-direction', note: 'The forest sink has declined by about a third since 2013.' },
      { id: 'L3', name: 'Afforestation and deforestation', status: 'too-slow', note: 'Net forest area gains are too small to rebuild the sink.' },
      { id: 'L5', name: 'Net land take', status: 'too-slow', note: 'Settlement area keeps expanding at the expense of carbon-rich land.' },
      { id: 'L7', name: 'Non-forest land emissions', status: 'too-slow', note: 'Cropland and drained organic soils remain persistent net sources.' },
    ],
    children: [
      { id: 'forest', name: 'Forest land', color: '', isSink: true, series: s(2005, [-415, -411, -367, -431, -450, -433, -426, -424, -441, -402, -391, -382, -313, -307, -294, -292, -281]) },
      { id: 'cropland', name: 'Cropland', color: '', series: s(2005, [42, 42, 46, 48, 46, 37, 36, 36, 39, 36, 30, 26, 27, 25, 22, 22, 23]) },
      { id: 'grassland', name: 'Grassland', color: '', series: s(2005, [33, 27, 34, 31, 33, 31, 33, 34, 41, 24, 22, 21, 25, 16, 18, 19, 25]) },
      { id: 'wetlands', name: 'Wetlands', color: '', series: s(2005, [20, 20, 19, 19, 19, 20, 20, 19, 21, 20, 22, 20, 22, 21, 21, 21, 21]) },
      { id: 'settlements', name: 'Settlements and other land', color: '', series: s(2005, [33, 32, 33, 33, 33, 30, 27, 26, 27, 28, 29, 33, 29, 31, 29, 29, 29]) },
      { id: 'hwp', name: 'Harvested wood products', color: '', isSink: true, series: s(2005, [-56, -63, -67, -45, -29, -38, -38, -34, -31, -35, -36, -37, -41, -46, -44, -41, -47]) },
    ],
  },
  {
    id: 'waste-other',
    name: 'Waste & other',
    color: ESABCC.pansyPurple,
    note: 'Waste management and remaining sources. The progress report tracks this sector at aggregate level only.',
    series: [
      { year: 2005, value: 169.7 },
      { year: 2022, value: 115.1 },
    ],
  },
];

/** Latest historical value of a node's series. */
export function latestValue(node: PanoramaNode): YearValue {
  return node.series[node.series.length - 1];
}

/** First historical value of a node's series (2005 for all nodes). */
export function baseValue(node: PanoramaNode): YearValue {
  return node.series[0];
}

export function findNode(id: string | null): { node: PanoramaNode; parent: PanoramaNode | null } | null {
  if (!id) return null;
  for (const sector of PANORAMA_SECTORS) {
    if (sector.id === id) return { node: sector, parent: null };
    for (const child of sector.children ?? []) {
      if (child.id === id) return { node: child, parent: sector };
    }
  }
  return null;
}

export const DATA_SOURCES = [
  { label: 'Historical emissions', value: 'EEA GHG data viewer (2022 partly proxy data), via the ESABCC progress report underlying-data workbook' },
  { label: '2030 benchmarks', value: 'European Commission "Fit for 55" MIX scenario; LULUCF Regulation (EU) 2023/839' },
  { label: '2040 / 2050 advice ranges', value: 'ESABCC (2023) 2040-target advice — 1.5°C-compatible EU pathways assessed from the IPCC AR6 scenario database' },
  { label: 'Projections', value: "Member States' with-additional-measures (WAM) projections reported to the EEA" },
];
