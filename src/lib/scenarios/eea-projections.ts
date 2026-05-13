/**
 * EEA GHG Projections — fetches projected greenhouse gas emissions
 * from the EEA Discodata SQL API.
 *
 * Member States report GHG projections under the Governance Regulation
 * (EU) 2018/1999 in two scenarios:
 *   - WEM (With Existing Measures): baseline projections with current policies
 *   - WAM (With Additional Measures): projections including planned policies
 *
 * Data source: EEA Datahub — Member States' greenhouse gas (GHG) emission
 * projections (dataset ID: 4b8d94a4-aed7-4e67-a54c-0623a50f48e8)
 *
 * The Discodata SQL API returns JSON with { results: [...] }.
 */

const DISCODATA_BASE = 'https://discodata.eea.europa.eu/sql';

// ── Discodata table discovery ────────────────────────────────────────────
// The exact table name may change with data updates. We try multiple known
// patterns in order of likelihood.

const TABLE_CANDIDATES = [
  '[GHGProjections].[latest].[GHGProjectionsDataflow_latest]',
  '[GHGProjections].[latest].[projections_data_viewer]',
  '[GHGProjections].[latest].[GHGProjectionsDataflow]',
  '[GHGProjections].[latest].[v_GHGProjections]',
  '[GHGProjections].[v1].[GHGProjectionsDataflow_latest]',
];

// ── CRF sector code mapping ─────────────────────────────────────────────
// Maps our policy-gap indicator IDs to the CRF category codes used in
// the EEA projections dataset.

export interface ProjectionMapping {
  /** Our indicator ID (matches PolicyGapIndicator.id) */
  indicatorId: string;
  /** CRF category filter values to try (order of preference) */
  categories: string[];
  /** Gas filter values to try */
  gases: string[];
  /** Scale factor: EEA reports in kt CO2e; our charts use Mt CO2e */
  scale: number;
}

export const PROJECTION_MAPPINGS: ProjectionMapping[] = [
  {
    indicatorId: 'o1-total-ghg',
    categories: [
      'Total (excluding LULUCF, including international aviation)',
      'Total (net emissions, excluding LULUCF)',
      'Total (excluding LULUCF)',
      'Total GHG',
      '1+2+3+5',
    ],
    gases: [
      'Total GHG (net, with indirect CO2)',
      'Total GHG',
      'Aggregate GHGs',
      'GHG',
    ],
    scale: 0.001, // kt → Mt
  },
  {
    indicatorId: 'e1-energy-ghg',
    categories: [
      '1.A.1 - Energy industries',
      '1.A.1',
      'CRF1A1',
      'Energy industries',
    ],
    gases: ['Total GHG (net, with indirect CO2)', 'Total GHG', 'Aggregate GHGs', 'GHG'],
    scale: 0.001,
  },
  {
    indicatorId: 'i1-industry-ghg',
    categories: [
      '1.A.2 - Manufacturing industries and construction',
      '1.A.2',
      'CRF1A2',
      'Manufacturing industries',
    ],
    gases: ['Total GHG (net, with indirect CO2)', 'Total GHG', 'Aggregate GHGs', 'GHG'],
    scale: 0.001,
  },
  {
    indicatorId: 't1-transport-ghg',
    categories: [
      '1.A.3 - Transport',
      '1.A.3',
      'CRF1A3',
      'Transport',
    ],
    gases: ['Total GHG (net, with indirect CO2)', 'Total GHG', 'Aggregate GHGs', 'GHG'],
    scale: 0.001,
  },
  {
    indicatorId: 'b1-buildings-ghg',
    categories: [
      '1.A.4 - Other sectors',
      '1.A.4',
      'CRF1A4',
      'Other sectors',
    ],
    gases: ['Total GHG (net, with indirect CO2)', 'Total GHG', 'Aggregate GHGs', 'GHG'],
    scale: 0.001,
  },
  {
    indicatorId: 'a1-agriculture-ghg',
    categories: [
      '3 - Agriculture',
      '3',
      'CRF3',
      'Agriculture',
    ],
    gases: ['Total GHG (net, with indirect CO2)', 'Total GHG', 'Aggregate GHGs', 'GHG'],
    scale: 0.001,
  },
  {
    indicatorId: 'l1-lulucf',
    categories: [
      '4 - Land use, land-use change and forestry',
      '4',
      'CRF4',
      'LULUCF',
    ],
    gases: ['Total GHG (net, with indirect CO2)', 'Total GHG', 'Aggregate GHGs', 'GHG'],
    scale: 0.001,
  },
  {
    indicatorId: 'e6-methane',
    categories: [
      '1 - Energy',
      '1',
      'CRF1',
      'Energy',
    ],
    gases: ['CH4', 'Methane'],
    scale: 0.001,
  },
];

// ── Response types ──────────────────────────────────────────────────────

export interface ProjectionPoint {
  year: number;
  value: number;
}

export interface IndicatorProjections {
  indicatorId: string;
  wem: ProjectionPoint[];
  wam: ProjectionPoint[];
  source: string;
  lastUpdated: string;
}

// ── Discodata fetch ─────────────────────────────────────────────────────

interface DiscodataRow {
  [key: string]: string | number | null;
}

interface DiscodataResponse {
  results?: DiscodataRow[];
}

/**
 * Try fetching from the Discodata SQL API.
 * Attempts multiple table name candidates until one succeeds.
 */
async function queryDiscodata(
  sql: string,
  signal?: AbortSignal,
): Promise<DiscodataRow[]> {
  const encoded = encodeURIComponent(sql);
  const url = `${DISCODATA_BASE}?query=${encoded}&p=1&nrOfHits=10000`;

  const res = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Discodata ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as DiscodataResponse;
  return json.results || [];
}

/**
 * Discover which table name works and cache it.
 */
let discoveredTable: string | null = null;

async function discoverTable(signal?: AbortSignal): Promise<string> {
  if (discoveredTable) return discoveredTable;

  for (const table of TABLE_CANDIDATES) {
    try {
      const sql = `SELECT TOP 1 * FROM ${table}`;
      await queryDiscodata(sql, signal);
      discoveredTable = table;
      return table;
    } catch {
      // Try next candidate
    }
  }

  throw new Error(
    'Could not discover EEA projections table. Tried: ' +
    TABLE_CANDIDATES.join(', ')
  );
}

/**
 * Build a SQL query to fetch EU-level (or country-level) projections for a
 * given set of category/gas filters. The column names in the EEA projections
 * dataset use year-based column names (Year_2020, Year_2025, etc.) or pivoted
 * rows with a Year column. We handle both patterns.
 *
 * @param countryCode  ISO-2 code for a single Member State (e.g. 'DE'), or
 *                     null/undefined for the EU-27 aggregate.
 */
function buildProjectionQuery(
  table: string,
  categories: string[],
  gases: string[],
  scenarios: string[],
  countryCode?: string | null,
): string {
  const catList = categories.map(c => `'${c.replace(/'/g, "''")}'`).join(',');
  const gasList = gases.map(g => `'${g.replace(/'/g, "''")}'`).join(',');
  const scenList = scenarios.map(s => `'${s.replace(/'/g, "''")}'`).join(',');

  // EEA datasets use CountryCode, Country_code, Member_State, or GeoCode
  const geoFilter = countryCode
    ? `(CountryCode = '${countryCode}' OR Country_code = '${countryCode}')`
    : `(CountryCode = 'EU27' OR CountryCode = 'EU' OR Country_code = 'EU27' OR Country_code = 'EU')`;

  return `SELECT * FROM ${table}
    WHERE ${geoFilter}
    AND (Scenario IN (${scenList}) OR Scenario_type IN (${scenList}))
    AND (Category_name IN (${catList}) OR Category IN (${catList}) OR Sector IN (${catList}))
    AND (Gas IN (${gasList}) OR Pollutant IN (${gasList}))`;
}

/**
 * Parse projection rows into year→value arrays for WEM and WAM.
 *
 * The EEA projections dataset can have data in two formats:
 * 1. Wide format: one row per combination, with columns Year_2020..Year_2050
 * 2. Long format: one row per year, with Year and Value columns
 */
function parseProjectionRows(
  rows: DiscodataRow[],
  scale: number,
): { wem: ProjectionPoint[]; wam: ProjectionPoint[] } {
  const wem: ProjectionPoint[] = [];
  const wam: ProjectionPoint[] = [];

  for (const row of rows) {
    const scenario = String(
      row.Scenario || row.Scenario_type || row.scenario || ''
    ).toUpperCase();
    const isWem = scenario.includes('WEM') && !scenario.includes('WAM');
    const isWam = scenario.includes('WAM');
    const target = isWam ? wam : isWem ? wem : null;
    if (!target) continue;

    // Check for long format (Year + Value columns)
    const yearCol = row.Year || row.year || row.YEAR;
    const valCol = row.Value || row.value || row.VALUE ||
                   row.Emission || row.emission || row.Total;

    if (yearCol != null && valCol != null) {
      const year = typeof yearCol === 'number' ? yearCol : parseInt(String(yearCol), 10);
      const value = typeof valCol === 'number' ? valCol : parseFloat(String(valCol));
      if (!isNaN(year) && !isNaN(value) && year >= 2020 && year <= 2060) {
        target.push({ year, value: value * scale });
      }
      continue;
    }

    // Check for wide format (Year_XXXX columns)
    for (const [key, val] of Object.entries(row)) {
      const yearMatch = key.match(/^(?:Year_?|y|Y)?(\d{4})$/);
      if (yearMatch && val != null) {
        const year = parseInt(yearMatch[1], 10);
        const value = typeof val === 'number' ? val : parseFloat(String(val));
        if (!isNaN(year) && !isNaN(value) && year >= 2020 && year <= 2060) {
          target.push({ year, value: value * scale });
        }
      }
    }
  }

  // Deduplicate by year (take latest/most complete value)
  const dedup = (pts: ProjectionPoint[]) => {
    const map = new Map<number, number>();
    for (const p of pts) map.set(p.year, p.value);
    return Array.from(map.entries())
      .map(([year, value]) => ({ year, value }))
      .sort((a, b) => a.year - b.year);
  };

  return { wem: dedup(wem), wam: dedup(wam) };
}

/**
 * Fetch EEA projections for a single indicator from Discodata.
 *
 * @param countryCode  ISO-2 code for a Member State (e.g. 'DE'), or
 *                     omit/null for EU-27 aggregate.
 */
export async function fetchIndicatorProjections(
  mapping: ProjectionMapping,
  signal?: AbortSignal,
  countryCode?: string | null,
): Promise<IndicatorProjections> {
  const table = await discoverTable(signal);
  const sql = buildProjectionQuery(
    table,
    mapping.categories,
    mapping.gases,
    ['WEM', 'WAM', 'With existing measures', 'With additional measures'],
    countryCode,
  );

  const rows = await queryDiscodata(sql, signal);
  const { wem, wam } = parseProjectionRows(rows, mapping.scale);

  return {
    indicatorId: mapping.indicatorId,
    wem,
    wam,
    source: countryCode ? `EEA Discodata (${countryCode})` : 'EEA Discodata',
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Fetch EEA projections for all mapped indicators.
 *
 * @param countryCode  ISO-2 code for a Member State, or omit for EU-27.
 */
export async function fetchAllProjections(
  signal?: AbortSignal,
  countryCode?: string | null,
): Promise<IndicatorProjections[]> {
  // Try Discodata first; if table discovery fails, return fallback (EU-27 only)
  try {
    await discoverTable(signal);
  } catch {
    console.warn('EEA Discodata table not found, using fallback projections');
    // Fallback data is only available for EU-27
    if (countryCode) return [];
    return getFallbackProjections();
  }

  const results = await Promise.allSettled(
    PROJECTION_MAPPINGS.map(m => fetchIndicatorProjections(m, signal, countryCode)),
  );

  const projections: IndicatorProjections[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled' && (result.value.wem.length > 0 || result.value.wam.length > 0)) {
      projections.push(result.value);
    } else if (!countryCode) {
      // Use EU-27 fallback for this indicator when no country-specific data
      const fb = FALLBACK_PROJECTIONS[PROJECTION_MAPPINGS[i].indicatorId];
      if (fb) {
        projections.push({
          indicatorId: PROJECTION_MAPPINGS[i].indicatorId,
          ...fb,
          source: 'EEA Trends & Projections 2024 (static)',
          lastUpdated: new Date().toISOString(),
        });
      }
    }
  }

  return projections;
}

// ── Fallback projection data ────────────────────────────────────────────
// Aggregated EU-27 values from the EEA "Trends and Projections in Europe
// 2024" report (Report No 11/2024, Oct 2024), Executive Summary Table ES.1
// and sector breakdowns. These are used only when the Discodata API is
// unreachable or the table schema has changed; otherwise the component
// fetches the live figures from the EEA Datahub
// (https://www.eea.europa.eu/en/datahub/datahubitem-view/4b8d94a4-aed7-4e67-a54c-0623a50f48e8)
// so updated submissions (2025 onwards) are picked up automatically.
//
// Units: Mt CO2e (already scaled from the reported kt values).
// Source: EEA Trends and Projections in Europe 2024, Member States'
//         projections (2024 submission under the Governance Regulation).
// Vintage: October 2024 — refresh this block when a newer T&P report is
//          published or if the Discodata schema changes again.

const FALLBACK_PROJECTIONS: Record<string, { wem: ProjectionPoint[]; wam: ProjectionPoint[] }> = {
  'o1-total-ghg': {
    wem: [
      { year: 2025, value: 3330 },
      { year: 2030, value: 3190 },
      { year: 2035, value: 2900 },
      { year: 2040, value: 2620 },
      { year: 2045, value: 2370 },
      { year: 2050, value: 2130 },
    ],
    wam: [
      { year: 2025, value: 3250 },
      { year: 2030, value: 2910 },
      { year: 2035, value: 2480 },
      { year: 2040, value: 2080 },
      { year: 2045, value: 1720 },
      { year: 2050, value: 1400 },
    ],
  },
  'e1-energy-ghg': {
    wem: [
      { year: 2025, value: 850 },
      { year: 2030, value: 680 },
      { year: 2035, value: 550 },
      { year: 2040, value: 440 },
      { year: 2050, value: 280 },
    ],
    wam: [
      { year: 2025, value: 820 },
      { year: 2030, value: 580 },
      { year: 2035, value: 410 },
      { year: 2040, value: 290 },
      { year: 2050, value: 120 },
    ],
  },
  'i1-industry-ghg': {
    wem: [
      { year: 2025, value: 550 },
      { year: 2030, value: 490 },
      { year: 2035, value: 440 },
      { year: 2040, value: 400 },
      { year: 2050, value: 330 },
    ],
    wam: [
      { year: 2025, value: 530 },
      { year: 2030, value: 440 },
      { year: 2035, value: 370 },
      { year: 2040, value: 310 },
      { year: 2050, value: 210 },
    ],
  },
  't1-transport-ghg': {
    wem: [
      { year: 2025, value: 790 },
      { year: 2030, value: 700 },
      { year: 2035, value: 610 },
      { year: 2040, value: 530 },
      { year: 2050, value: 390 },
    ],
    wam: [
      { year: 2025, value: 770 },
      { year: 2030, value: 640 },
      { year: 2035, value: 510 },
      { year: 2040, value: 400 },
      { year: 2050, value: 220 },
    ],
  },
  'b1-buildings-ghg': {
    wem: [
      { year: 2025, value: 480 },
      { year: 2030, value: 400 },
      { year: 2035, value: 340 },
      { year: 2040, value: 290 },
      { year: 2050, value: 210 },
    ],
    wam: [
      { year: 2025, value: 460 },
      { year: 2030, value: 350 },
      { year: 2035, value: 260 },
      { year: 2040, value: 190 },
      { year: 2050, value: 90 },
    ],
  },
  'a1-agriculture-ghg': {
    wem: [
      { year: 2025, value: 385 },
      { year: 2030, value: 375 },
      { year: 2035, value: 365 },
      { year: 2040, value: 355 },
      { year: 2050, value: 340 },
    ],
    wam: [
      { year: 2025, value: 380 },
      { year: 2030, value: 360 },
      { year: 2035, value: 340 },
      { year: 2040, value: 320 },
      { year: 2050, value: 290 },
    ],
  },
  'l1-lulucf': {
    wem: [
      { year: 2025, value: -230 },
      { year: 2030, value: -240 },
      { year: 2035, value: -250 },
      { year: 2040, value: -260 },
      { year: 2050, value: -280 },
    ],
    wam: [
      { year: 2025, value: -240 },
      { year: 2030, value: -270 },
      { year: 2035, value: -300 },
      { year: 2040, value: -340 },
      { year: 2050, value: -390 },
    ],
  },
  'e6-methane': {
    wem: [
      { year: 2025, value: 62 },
      { year: 2030, value: 55 },
      { year: 2035, value: 48 },
      { year: 2040, value: 42 },
      { year: 2050, value: 32 },
    ],
    wam: [
      { year: 2025, value: 60 },
      { year: 2030, value: 48 },
      { year: 2035, value: 38 },
      { year: 2040, value: 30 },
      { year: 2050, value: 18 },
    ],
  },
};

function getFallbackProjections(): IndicatorProjections[] {
  return Object.entries(FALLBACK_PROJECTIONS).map(([indicatorId, data]) => ({
    indicatorId,
    ...data,
    source: 'EEA Trends & Projections 2024 (static)',
    lastUpdated: new Date().toISOString(),
  }));
}

// ── Helpers for the API route ───────────────────────────────────────────

export function getProjectionMapping(indicatorId: string): ProjectionMapping | undefined {
  return PROJECTION_MAPPINGS.find(m => m.indicatorId === indicatorId);
}

export function hasProjectionMapping(indicatorId: string): boolean {
  return PROJECTION_MAPPINGS.some(m => m.indicatorId === indicatorId);
}

// ── Historical projection vintages ──────────────────────────────────────
// Approximate EU-27 WEM/WAM values digitised from EEA Trends and Projections
// reports (2017 and 2021 editions). These are static snapshots used to show
// how Member States' projections have evolved over time.
//
// Values are in Mt CO2e, already at the same scale as FALLBACK_PROJECTIONS.
//
// Sources:
//   2021: EEA Trends and Projections in Europe 2021 (Report No 16/2021)
//         Based on Member States' submissions under Governance Regulation,
//         before the Fit for 55 package was implemented.
//   2017: EEA Trends and Projections in Europe 2017 (Report No 25/2017)
//         Based on Member States' submissions under Decision No 280/2004/EC,
//         pre-Paris Agreement implementation by EU.
//
// Note: values are approximate and for illustrative comparison only.
// Consult the respective EEA reports for exact figures.

export interface LegacyProjectionVintage {
  /** Publication year of the EEA T&P report */
  year: number;
  /** Human-readable label */
  label: string;
  /** Projections per indicator ID */
  byIndicator: Record<string, { wem: ProjectionPoint[]; wam: ProjectionPoint[] }>;
}

export const LEGACY_PROJECTION_VINTAGES: LegacyProjectionVintage[] = [
  {
    year: 2021,
    label: 'EEA T&P 2021',
    byIndicator: {
      'o1-total-ghg': {
        wem: [
          { year: 2025, value: 3590 },
          { year: 2030, value: 3480 },
          { year: 2035, value: 3320 },
          { year: 2040, value: 3160 },
          { year: 2045, value: 3010 },
          { year: 2050, value: 2860 },
        ],
        wam: [
          { year: 2025, value: 3490 },
          { year: 2030, value: 3230 },
          { year: 2035, value: 2940 },
          { year: 2040, value: 2680 },
          { year: 2045, value: 2450 },
          { year: 2050, value: 2220 },
        ],
      },
      'e1-energy-ghg': {
        wem: [
          { year: 2025, value: 1060 },
          { year: 2030, value:  980 },
          { year: 2040, value:  810 },
          { year: 2050, value:  630 },
        ],
        wam: [
          { year: 2025, value: 1010 },
          { year: 2030, value:  850 },
          { year: 2040, value:  610 },
          { year: 2050, value:  380 },
        ],
      },
      'i1-industry-ghg': {
        wem: [
          { year: 2025, value: 650 },
          { year: 2030, value: 620 },
          { year: 2040, value: 570 },
          { year: 2050, value: 510 },
        ],
        wam: [
          { year: 2025, value: 630 },
          { year: 2030, value: 570 },
          { year: 2040, value: 490 },
          { year: 2050, value: 390 },
        ],
      },
      't1-transport-ghg': {
        wem: [
          { year: 2025, value: 870 },
          { year: 2030, value: 840 },
          { year: 2040, value: 760 },
          { year: 2050, value: 670 },
        ],
        wam: [
          { year: 2025, value: 850 },
          { year: 2030, value: 780 },
          { year: 2040, value: 640 },
          { year: 2050, value: 480 },
        ],
      },
      'b1-buildings-ghg': {
        wem: [
          { year: 2025, value: 520 },
          { year: 2030, value: 490 },
          { year: 2040, value: 420 },
          { year: 2050, value: 360 },
        ],
        wam: [
          { year: 2025, value: 500 },
          { year: 2030, value: 440 },
          { year: 2040, value: 340 },
          { year: 2050, value: 230 },
        ],
      },
      'a1-agriculture-ghg': {
        wem: [
          { year: 2025, value: 398 },
          { year: 2030, value: 393 },
          { year: 2040, value: 385 },
          { year: 2050, value: 375 },
        ],
        wam: [
          { year: 2025, value: 390 },
          { year: 2030, value: 378 },
          { year: 2040, value: 360 },
          { year: 2050, value: 340 },
        ],
      },
      'l1-lulucf': {
        wem: [
          { year: 2025, value: -200 },
          { year: 2030, value: -205 },
          { year: 2040, value: -215 },
          { year: 2050, value: -225 },
        ],
        wam: [
          { year: 2025, value: -215 },
          { year: 2030, value: -240 },
          { year: 2040, value: -270 },
          { year: 2050, value: -310 },
        ],
      },
      'e6-methane': {
        wem: [
          { year: 2025, value: 74 },
          { year: 2030, value: 68 },
          { year: 2040, value: 58 },
          { year: 2050, value: 48 },
        ],
        wam: [
          { year: 2025, value: 71 },
          { year: 2030, value: 61 },
          { year: 2040, value: 48 },
          { year: 2050, value: 34 },
        ],
      },
    },
  },
  {
    year: 2017,
    label: 'EEA T&P 2017',
    byIndicator: {
      'o1-total-ghg': {
        wem: [
          { year: 2025, value: 4080 },
          { year: 2030, value: 3980 },
          { year: 2035, value: 3870 },
          { year: 2040, value: 3750 },
          { year: 2050, value: 3510 },
        ],
        wam: [
          { year: 2025, value: 3990 },
          { year: 2030, value: 3780 },
          { year: 2035, value: 3530 },
          { year: 2040, value: 3290 },
          { year: 2050, value: 3010 },
        ],
      },
      'e1-energy-ghg': {
        wem: [
          { year: 2025, value: 1330 },
          { year: 2030, value: 1250 },
          { year: 2040, value: 1100 },
          { year: 2050, value:  950 },
        ],
        wam: [
          { year: 2025, value: 1280 },
          { year: 2030, value: 1150 },
          { year: 2040, value:  940 },
          { year: 2050, value:  720 },
        ],
      },
      'i1-industry-ghg': {
        wem: [
          { year: 2025, value: 740 },
          { year: 2030, value: 720 },
          { year: 2040, value: 690 },
          { year: 2050, value: 650 },
        ],
        wam: [
          { year: 2025, value: 720 },
          { year: 2030, value: 680 },
          { year: 2040, value: 620 },
          { year: 2050, value: 550 },
        ],
      },
      't1-transport-ghg': {
        wem: [
          { year: 2025, value: 1020 },
          { year: 2030, value: 1010 },
          { year: 2040, value:  990 },
          { year: 2050, value:  960 },
        ],
        wam: [
          { year: 2025, value:  990 },
          { year: 2030, value:  940 },
          { year: 2040, value:  870 },
          { year: 2050, value:  780 },
        ],
      },
      'b1-buildings-ghg': {
        wem: [
          { year: 2025, value: 590 },
          { year: 2030, value: 560 },
          { year: 2040, value: 500 },
          { year: 2050, value: 440 },
        ],
        wam: [
          { year: 2025, value: 570 },
          { year: 2030, value: 520 },
          { year: 2040, value: 430 },
          { year: 2050, value: 340 },
        ],
      },
      'a1-agriculture-ghg': {
        wem: [
          { year: 2025, value: 415 },
          { year: 2030, value: 412 },
          { year: 2040, value: 408 },
          { year: 2050, value: 402 },
        ],
        wam: [
          { year: 2025, value: 410 },
          { year: 2030, value: 400 },
          { year: 2040, value: 388 },
          { year: 2050, value: 373 },
        ],
      },
      'l1-lulucf': {
        wem: [
          { year: 2025, value: -180 },
          { year: 2030, value: -183 },
          { year: 2040, value: -188 },
          { year: 2050, value: -193 },
        ],
        wam: [
          { year: 2025, value: -190 },
          { year: 2030, value: -200 },
          { year: 2040, value: -215 },
          { year: 2050, value: -233 },
        ],
      },
      'e6-methane': {
        wem: [
          { year: 2025, value: 90 },
          { year: 2030, value: 86 },
          { year: 2040, value: 79 },
          { year: 2050, value: 71 },
        ],
        wam: [
          { year: 2025, value: 87 },
          { year: 2030, value: 80 },
          { year: 2040, value: 68 },
          { year: 2050, value: 56 },
        ],
      },
    },
  },
];
