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
 * Build a SQL query to fetch EU-level projections for a given set of
 * category/gas filters. The column names in the EEA projections dataset
 * use year-based column names (Year_2020, Year_2025, etc.) or pivoted
 * rows with a Year column. We handle both patterns.
 */
function buildProjectionQuery(
  table: string,
  categories: string[],
  gases: string[],
  scenarios: string[],
): string {
  const catList = categories.map(c => `'${c.replace(/'/g, "''")}'`).join(',');
  const gasList = gases.map(g => `'${g.replace(/'/g, "''")}'`).join(',');
  const scenList = scenarios.map(s => `'${s.replace(/'/g, "''")}'`).join(',');

  // Try common column name patterns for the country code
  // EEA datasets use CountryCode, Country_code, Member_State, or GeoCode
  return `SELECT * FROM ${table}
    WHERE (CountryCode = 'EU27' OR CountryCode = 'EU' OR Country_code = 'EU27' OR Country_code = 'EU')
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
 */
export async function fetchIndicatorProjections(
  mapping: ProjectionMapping,
  signal?: AbortSignal,
): Promise<IndicatorProjections> {
  const table = await discoverTable(signal);
  const sql = buildProjectionQuery(
    table,
    mapping.categories,
    mapping.gases,
    ['WEM', 'WAM', 'With existing measures', 'With additional measures'],
  );

  const rows = await queryDiscodata(sql, signal);
  const { wem, wam } = parseProjectionRows(rows, mapping.scale);

  return {
    indicatorId: mapping.indicatorId,
    wem,
    wam,
    source: 'EEA Discodata',
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Fetch EEA projections for all mapped indicators.
 */
export async function fetchAllProjections(
  signal?: AbortSignal,
): Promise<IndicatorProjections[]> {
  // Try Discodata first; if table discovery fails, return fallback data
  try {
    await discoverTable(signal);
  } catch {
    console.warn('EEA Discodata table not found, using fallback projections');
    return getFallbackProjections();
  }

  const results = await Promise.allSettled(
    PROJECTION_MAPPINGS.map(m => fetchIndicatorProjections(m, signal)),
  );

  const projections: IndicatorProjections[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled' && (result.value.wem.length > 0 || result.value.wam.length > 0)) {
      projections.push(result.value);
    } else {
      // Use fallback for this indicator
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
