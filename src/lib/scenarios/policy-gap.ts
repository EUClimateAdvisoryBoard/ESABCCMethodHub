/**
 * Policy Gap indicator definitions for the ESABCC Assessment Report 2024
 * "Towards EU climate neutrality: Progress, policy gaps and opportunities"
 *
 * Each indicator specifies:
 *  - How to fetch historical data (Eurostat or EEA API)
 *  - Benchmark/target values from EU climate legislation
 *  - Chart metadata (sector, unit, description)
 *
 * The historical data auto-updates from the live Eurostat / EEA APIs,
 * so charts always show the latest available year.
 */

// ── Benchmark target type ────────────────────────────────────────────────

export interface Benchmark {
  year: number;
  value: number;
  label: string;
  type: 'target';
}

// ── Data source spec ─────────────────────────────────────────────────────

export interface PolicyGapDataSource {
  /** 'eurostat' or 'eea' */
  provider: 'eurostat' | 'eea';
  /** Eurostat dataset code or EEA SDMX dataflow */
  code: string;
  /** Dimension filters */
  filters: Record<string, string>;
  /** Scale factor (e.g. 0.001 to convert kt → Mt) */
  scale?: number;
}

/** Eurostat dataset browser links for source attribution */
export const EUROSTAT_DATASET_URLS: Record<string, string> = {
  env_air_gge: 'https://ec.europa.eu/eurostat/databrowser/view/env_air_gge/default/table?lang=en',
  nrg_bal_c:   'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table?lang=en',
  nrg_ind_ren: 'https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table?lang=en',
  sdg_07_10:   'https://ec.europa.eu/eurostat/databrowser/view/sdg_07_10/default/table?lang=en',
  sdg_07_11:   'https://ec.europa.eu/eurostat/databrowser/view/sdg_07_11/default/table?lang=en',
};

// ── Indicator definition ─────────────────────────────────────────────────

export interface PolicyGapIndicator {
  id: string;
  /** Report indicator code (O1, E1, T1, etc.) */
  code: string;
  /** Sector grouping */
  sector: PolicyGapSector;
  /** Chart title */
  title: string;
  /** Short description */
  description: string;
  /** Y-axis unit */
  unit: string;
  /** Data sources — can be multiple for composite indicators */
  sources: PolicyGapDataSource[];
  /** Benchmark targets from EU legislation */
  benchmarks: Benchmark[];
  /** Report figure number(s) */
  figures: string[];
  /** If true, values are negative (sinks), display inverted */
  invertSign?: boolean;
  /** If true, this is a stacked area / energy mix chart */
  isComposition?: boolean;
  /** Sub-series labels for composition charts */
  compositionLabels?: string[];
  /**
   * Optional denominator source for computing share/ratio indicators.
   * Result = (source[0] / ratioSource) × 100.
   */
  ratioSource?: PolicyGapDataSource;
  /**
   * If true, invert the percentage: display (100 − value).
   * Useful for showing fossil share when data provides renewable share.
   */
  invertPercentage?: boolean;
  /** Optional alternate unit display (e.g. show Mtoe values also as TWh) */
  altUnit?: { unit: string; factor: number; note?: string };
  /** Optional scope/methodology note to display in tooltips & source area */
  scopeNote?: string;
  /** Optional explicit source attribution override (e.g. clarify Eurostat = EEA inventory) */
  sourceLabel?: string;
}

export type PolicyGapSector =
  | 'Overall'
  | 'Energy Supply'
  | 'Industry'
  | 'Transport'
  | 'Buildings'
  | 'Agriculture'
  | 'LULUCF';

export const POLICY_GAP_SECTORS: PolicyGapSector[] = [
  'Overall',
  'Energy Supply',
  'Industry',
  'Transport',
  'Buildings',
  'Agriculture',
  'LULUCF',
];

// ── Sector colors (ESABCC palette) ───────────────────────────────────────

export const SECTOR_COLORS: Record<PolicyGapSector, string> = {
  'Overall':       '#608c95',  // signature teal-grey
  'Energy Supply': '#3d5584',  // seaBlue
  'Industry':      '#4f3a66',  // plum
  'Transport':     '#f26119',  // signalOrange
  'Buildings':     '#f59e2d',  // lightOrange
  'Agriculture':   '#2e422f',  // forestGreen
  'LULUCF':        '#a2c0b6',  // mintGreen
};

// ── Indicator registry ───────────────────────────────────────────────────
//
// Data source notes:
//   - Eurostat env_air_gge: GHG inventory data via Eurostat (same as EEA but
//     accessible via the simpler Eurostat REST API)
//   - Eurostat nrg_bal_c: complete energy balances
//   - src_crf codes follow UNFCCC Common Reporting Format
//   - Benchmarks are from the Fit for 55 MIX scenario (EC, 2021)
//     and Climate Target Plan impact assessment (EC, 2020)

export const POLICY_GAP_INDICATORS: PolicyGapIndicator[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // OVERALL PROGRESS
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'o1-total-ghg',
    code: 'O1',
    sector: 'Overall',
    title: 'Total GHG emissions (excl. LULUCF, incl. intl aviation & maritime)',
    description: 'Total GHG emissions including international aviation and maritime bunkers, excluding LULUCF (Eurostat src_crf TOTX4_MEMO). The -55% by 2030 target in the European Climate Law applies to net emissions (incl. LULUCF): ~2,150 Mt CO2e. The equivalent level excluding LULUCF shown here is ~2,522 Mt CO2e.',
    unit: 'Mt CO2e',
    figures: ['Figure 7', 'Figure 4'],
    scopeNote: 'Scope: excl. LULUCF, incl. international aviation & maritime (TOTX4_MEMO). Alternative net scope (incl. LULUCF) has a 2030 target of ~2,150 Mt CO2e.',
    sourceLabel: 'Eurostat env_air_gge — republication of the EEA GHG inventory (UNFCCC submission)',
    sources: [{
      provider: 'eurostat',
      code: 'env_air_gge',
      filters: { src_crf: 'TOTX4_MEMO', airpol: 'GHG', unit: 'THS_T' },
      scale: 0.001, // kt → Mt
    }],
    benchmarks: [
      { year: 2030, value: 2522, label: '2030 target, -55% vs 1990 (excl. LULUCF equivalent; net target incl. LULUCF: ~2,150)', type: 'target' },
      { year: 2040, value: 1128, label: '2040 proposed target, -80% vs 1990 (EU Climate Law amendment, Feb 2024)', type: 'target' },
      { year: 2050, value: 0, label: '2050 climate neutrality (European Climate Law)', type: 'target' },
    ],
  },
  {
    id: 'o2-primary-energy',
    code: 'O2a',
    sector: 'Overall',
    title: 'Primary energy consumption',
    description: 'Primary energy consumption progress towards the revised Energy Efficiency Directive (EED) target of 992.5 Mtoe by 2030, with Fit for 55 MIX benchmarks for 2040 and 2050.',
    unit: 'Mtoe',
    altUnit: { unit: 'TWh', factor: 11.63, note: '1 Mtoe = 11.63 TWh (IEA conversion)' },
    figures: ['Figure 9'],
    sources: [{
      provider: 'eurostat',
      code: 'sdg_07_10',
      filters: { unit: 'MTOE' },
      scale: 1,
    }],
    benchmarks: [
      { year: 2030, value: 992.5, label: '2030 EED target (992.5 Mtoe / ~11,543 TWh)', type: 'target' },
      { year: 2040, value: 830, label: '2040 Fit for 55 MIX benchmark (~830 Mtoe / ~9,653 TWh)', type: 'target' },
      { year: 2050, value: 670, label: '2050 Fit for 55 MIX benchmark (~670 Mtoe / ~7,792 TWh)', type: 'target' },
    ],
  },
  {
    id: 'o2-final-energy',
    code: 'O2b',
    sector: 'Overall',
    title: 'Final energy consumption',
    description: 'Final energy consumption progress towards the revised EED target of 763 Mtoe by 2030, with Fit for 55 MIX benchmarks for 2040 and 2050.',
    unit: 'Mtoe',
    altUnit: { unit: 'TWh', factor: 11.63, note: '1 Mtoe = 11.63 TWh (IEA conversion)' },
    figures: ['Figure 9'],
    sources: [{
      provider: 'eurostat',
      code: 'sdg_07_11',
      filters: { unit: 'MTOE' },
      scale: 1,
    }],
    benchmarks: [
      { year: 2030, value: 763, label: '2030 EED target (763 Mtoe / ~8,874 TWh)', type: 'target' },
      { year: 2040, value: 620, label: '2040 Fit for 55 MIX benchmark (~620 Mtoe / ~7,211 TWh)', type: 'target' },
      { year: 2050, value: 480, label: '2050 Fit for 55 MIX benchmark (~480 Mtoe / ~5,582 TWh)', type: 'target' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ENERGY SUPPLY
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'e1-energy-ghg',
    code: 'E1',
    sector: 'Energy Supply',
    title: 'Energy supply sector GHG emissions',
    description: 'GHG emissions from energy industries (CRF 1.A.1) and fugitive emissions (CRF 1.B).',
    unit: 'Mt CO2e',
    figures: ['Figure 11', 'Figure 13'],
    sources: [{
      provider: 'eurostat',
      code: 'env_air_gge',
      filters: { src_crf: 'CRF1A1', airpol: 'GHG', unit: 'THS_T' },
      scale: 0.001,
    }],
    benchmarks: [
      { year: 2030, value: 590, label: '2030 Fit for 55 MIX benchmark', type: 'target' },
      { year: 2050, value: 0, label: '2050 net zero', type: 'target' },
    ],
  },
  {
    id: 'e2-res-share',
    code: 'E2',
    sector: 'Energy Supply',
    title: 'Renewable energy share in electricity (excl. biomass)',
    description: 'Share of non-biomass RES in total electricity generation.',
    unit: '%',
    figures: ['Figure 14'],
    sources: [{
      provider: 'eurostat',
      code: 'nrg_ind_ren',
      filters: { nrg_bal: 'REN_ELC' },
    }],
    benchmarks: [
      { year: 2030, value: 65, label: '2030 Fit for 55 MIX benchmark', type: 'target' },
      { year: 2050, value: 95, label: '2050 benchmark', type: 'target' },
    ],
  },
  {
    id: 'e3-grid-intensity',
    code: 'E3',
    sector: 'Energy Supply',
    title: 'Grid GHG emission intensity',
    description: 'Average intensity of GHG emissions from electricity grids (g CO2e/kWh).',
    unit: 'g CO2e/kWh',
    figures: ['Figure 15'],
    sources: [{
      provider: 'eurostat',
      code: 'env_air_gge',
      filters: { src_crf: 'CRF1A1A', airpol: 'CO2', unit: 'THS_T' },
      scale: 0.001, // Will be divided by electricity generation in the component
    }],
    benchmarks: [
      { year: 2030, value: 126, label: '2030 Fit for 55 MIX benchmark', type: 'target' },
      { year: 2050, value: 0, label: '2050 zero emissions', type: 'target' },
    ],
  },
  {
    id: 'e5-electrification',
    code: 'E5',
    sector: 'Energy Supply',
    title: 'Electrification rate',
    description: 'Share of electricity in total final energy use.',
    unit: '%',
    figures: ['Figure 18'],
    sources: [{
      provider: 'eurostat',
      code: 'nrg_bal_c',
      filters: { nrg_bal: 'FC_E', siec: 'E7000', unit: 'TJ' },
    }],
    ratioSource: {
      provider: 'eurostat',
      code: 'nrg_bal_c',
      filters: { nrg_bal: 'FC_E', siec: 'TOTAL', unit: 'TJ' },
    },
    benchmarks: [
      { year: 2030, value: 30, label: '2030 Fit for 55 MIX benchmark', type: 'target' },
      { year: 2050, value: 50, label: '2050 benchmark', type: 'target' },
    ],
  },
  {
    id: 'e6-methane',
    code: 'E6',
    sector: 'Energy Supply',
    title: 'Energy-related methane emissions',
    description: 'CH4 emissions from fuel combustion (CRF 1.A) and fugitive emissions (CRF 1.B).',
    unit: 'Mt CO2e',
    figures: ['Figure 19'],
    sources: [{
      provider: 'eurostat',
      code: 'env_air_gge',
      filters: { src_crf: 'CRF1', airpol: 'CH4_CO2E', unit: 'THS_T' },
      scale: 0.001,
    }],
    benchmarks: [
      { year: 2030, value: 55, label: '2030 Fit for 55 MIX benchmark', type: 'target' },
      { year: 2050, value: 8, label: '2050 benchmark', type: 'target' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // INDUSTRY
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'i1-industry-ghg',
    code: 'I1',
    sector: 'Industry',
    title: 'Industrial GHG emissions',
    description: 'GHG emissions from industrial energy use (CRF 1.A.2) and industrial processes (CRF 2).',
    unit: 'Mt CO2e',
    figures: ['Figure 20', 'Figure 23'],
    sources: [{
      provider: 'eurostat',
      code: 'env_air_gge',
      filters: { src_crf: 'CRF1A2', airpol: 'GHG', unit: 'THS_T' },
      scale: 0.001,
    }],
    benchmarks: [
      { year: 2030, value: 430, label: '2030 Fit for 55 MIX benchmark', type: 'target' },
      { year: 2050, value: 72, label: '2050 benchmark', type: 'target' },
    ],
  },
  {
    id: 'i5-final-energy',
    code: 'I5',
    sector: 'Industry',
    title: 'Final industrial energy use',
    description: 'Final energy consumption in industry.',
    unit: 'TWh',
    figures: ['Figure 27'],
    sources: [{
      provider: 'eurostat',
      code: 'nrg_bal_c',
      filters: { nrg_bal: 'FC_IND_E', siec: 'TOTAL', unit: 'TJ' },
      scale: 0.000278,
    }],
    benchmarks: [
      { year: 2030, value: 2700, label: '2030 Fit for 55 MIX (max)', type: 'target' },
      { year: 2050, value: 2200, label: '2050 benchmark', type: 'target' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // TRANSPORT
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 't1-transport-ghg',
    code: 'T1',
    sector: 'Transport',
    title: 'Transport GHG emissions',
    description: 'GHG emissions from transport (CRF 1.A.3), including international aviation but excluding international maritime.',
    unit: 'Mt CO2e',
    figures: ['Figure 32', 'Figure 34'],
    sources: [{
      provider: 'eurostat',
      code: 'env_air_gge',
      filters: { src_crf: 'CRF1A3', airpol: 'GHG', unit: 'THS_T' },
      scale: 0.001,
    }],
    benchmarks: [
      { year: 2030, value: 710, label: '2030 Fit for 55 MIX benchmark', type: 'target' },
      { year: 2050, value: 88, label: '2050 benchmark (-90%)', type: 'target' },
    ],
  },
  {
    id: 't6-fossil-transport',
    code: 'T6a',
    sector: 'Transport',
    title: 'Share of fossil fuels in transport energy',
    description: 'Share of fossil fuels in total transport energy use (including international bunker fuels). Computed as 100% minus the renewable energy share in transport.',
    unit: '%',
    figures: ['Figure 43'],
    sources: [{
      provider: 'eurostat',
      code: 'nrg_ind_ren',
      filters: { nrg_bal: 'REN_TRA' },
    }],
    invertPercentage: true,
    benchmarks: [
      { year: 2030, value: 86, label: '2030 benchmark', type: 'target' },
      { year: 2050, value: 12, label: '2050 benchmark', type: 'target' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // BUILDINGS
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'b1-buildings-ghg',
    code: 'B1',
    sector: 'Buildings',
    title: 'Buildings sector GHG emissions',
    description: 'GHG emissions from residential and tertiary sectors (CRF 1.A.4), including agricultural energy use.',
    unit: 'Mt CO2e',
    figures: ['Figure 45', 'Figure 47'],
    sources: [{
      provider: 'eurostat',
      code: 'env_air_gge',
      filters: { src_crf: 'CRF1A4', airpol: 'GHG', unit: 'THS_T' },
      scale: 0.001,
    }],
    benchmarks: [
      { year: 2030, value: 340, label: '2030 Fit for 55 MIX benchmark', type: 'target' },
      { year: 2050, value: 17, label: '2050 benchmark', type: 'target' },
    ],
  },
  {
    id: 'b2-buildings-energy',
    code: 'B2',
    sector: 'Buildings',
    title: 'Final energy consumption in buildings',
    description: 'Final energy consumption in residential, commercial, public and agricultural sectors (other final consumption).',
    unit: 'TWh',
    figures: ['Figure 48'],
    sources: [{
      provider: 'eurostat',
      code: 'nrg_bal_c',
      filters: { nrg_bal: 'FC_OTH_E', siec: 'TOTAL', unit: 'TJ' },
      scale: 0.000278,
    }],
    benchmarks: [
      { year: 2030, value: 3800, label: '2030 Fit for 55 MIX benchmark', type: 'target' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // AGRICULTURE
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'a1-agriculture-ghg',
    code: 'A1',
    sector: 'Agriculture',
    title: 'Agricultural non-CO2 emissions',
    description: 'Non-CO2 greenhouse gas emissions from agriculture (CRF 3). Mainly CH4 from livestock and N2O from fertilisers.',
    unit: 'Mt CO2e',
    figures: ['Figure 54', 'Figure 56'],
    sources: [{
      provider: 'eurostat',
      code: 'env_air_gge',
      filters: { src_crf: 'CRF3', airpol: 'GHG', unit: 'THS_T' },
      scale: 0.001,
    }],
    benchmarks: [
      { year: 2030, value: 366, label: '2030 Fit for 55 MIX benchmark', type: 'target' },
      { year: 2050, value: 285, label: '2050 benchmark (~-30%)', type: 'target' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // LULUCF
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'l1-lulucf',
    code: 'L1',
    sector: 'LULUCF',
    title: 'LULUCF net GHG emissions/removals',
    description: 'Net GHG emissions (positive) and removals (negative) in the LULUCF sector (CRF 4).',
    unit: 'Mt CO2e',
    figures: ['Figure 63', 'Figure 65'],
    sources: [{
      provider: 'eurostat',
      code: 'env_air_gge',
      filters: { src_crf: 'CRF4', airpol: 'GHG', unit: 'THS_T' },
      scale: 0.001,
    }],
    benchmarks: [
      { year: 2030, value: -310, label: '2030 LULUCF regulation target', type: 'target' },
      { year: 2050, value: -500, label: '2050 benchmark', type: 'target' },
    ],
  },
  {
    id: 'l8-bioenergy',
    code: 'L8',
    sector: 'LULUCF',
    title: 'Bioenergy use',
    description: 'Total bioenergy use across power, heat, industry, transport and buildings.',
    unit: 'TWh',
    figures: ['Figure 72'],
    sources: [{
      provider: 'eurostat',
      code: 'nrg_bal_c',
      filters: { nrg_bal: 'PPRD', siec: 'R5110-5150_W6000RI', unit: 'TJ' },
      scale: 0.000278,
    }],
    benchmarks: [
      { year: 2030, value: 2000, label: '2030 benchmark', type: 'target' },
      { year: 2050, value: 1700, label: '2050 benchmark', type: 'target' },
    ],
  },
];

/** Get indicators for a sector */
export function getIndicatorsBySector(sector: PolicyGapSector): PolicyGapIndicator[] {
  return POLICY_GAP_INDICATORS.filter(i => i.sector === sector);
}

/** Get a single indicator by ID */
export function getIndicator(id: string): PolicyGapIndicator | undefined {
  return POLICY_GAP_INDICATORS.find(i => i.id === id);
}

/**
 * Build a Eurostat fetch URL for a data source.
 *
 * Routes through the /api/eurostat proxy because the Eurostat
 * dissemination API does not send CORS headers, so direct browser
 * fetches are blocked.
 */
export function buildEurostatUrl(source: PolicyGapDataSource, geoCode: string): string {
  const params = new URLSearchParams({
    dataset: source.code,
    format: 'JSON',
    lang: 'en',
    geo: geoCode,
  });
  for (const [k, v] of Object.entries(source.filters)) {
    params.set(k, v);
  }
  return `/api/eurostat?${params.toString()}`;
}

/** Parse Eurostat JSON-stat 2.0 response into year→value map */
export function parseEurostatResponse(
  json: Record<string, unknown>,
  scale?: number,
): { year: number; value: number }[] {
  const points: { year: number; value: number }[] = [];

  const dimension = json.dimension as Record<string, { category?: { index?: Record<string, number> } }> | undefined;
  const values = json.value as Record<string, number | null> | undefined;

  if (!dimension || !values) return points;

  // Find the time dimension
  const timeDim = dimension.time || dimension.TIME_PERIOD;
  if (!timeDim?.category?.index) return points;

  const timeIndex = timeDim.category.index;
  const s = scale ?? 1;

  for (const [year, idx] of Object.entries(timeIndex)) {
    const val = values[String(idx)];
    if (val != null && !isNaN(val)) {
      points.push({ year: parseInt(year, 10), value: val * s });
    }
  }

  return points.sort((a, b) => a.year - b.year);
}
