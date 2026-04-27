/**
 * EEA (European Environment Agency) historical data source for the
 * Scenario Explorer.
 *
 * The EEA exposes its indicator data via:
 *   • SDMX 2.1 endpoint:        https://sdmx.eea.europa.eu/
 *   • Datahub item-view CSV:    https://www.eea.europa.eu/datahub/datahubitem-view/...
 *   • Plone REST (JSON):        https://www.eea.europa.eu/api/...
 *   • ArcGIS REST (geospatial): https://discomap.eea.europa.eu/arcgis/rest/services
 *
 * EEA's most-used dataset for the explorer is the EU GHG inventory data
 * viewer (UNFCCC submission), which Eurostat also republishes as
 * env_air_gge — but EEA's version often has a longer history and
 * sector-level breakdowns that Eurostat omits.
 *
 * Because EEA's SDMX dataflows are stable but the dataset codes change
 * less frequently than the underlying file URLs, we hard-code a
 * curated set of dataflow IDs and parse the SDMX-JSON response.
 *
 * NOTE: this module currently exposes a small starter set of dataflows.
 * Adding new variables = adding a new entry below + ensuring the
 * SDMX dataflow ID exists on https://sdmx.eea.europa.eu/.
 */

const EEA_SDMX_BASE = 'https://sdmx.eea.europa.eu/data/dataflow';

// ── Variable registry ──────────────────────────────────────────────────────

export interface EeaVariableSpec {
  /** SDMX dataflow ID — e.g. "GHG_INVENTORY" */
  dataflow: string;
  /** Optional agency / version (defaults to EEA / latest) */
  agency?: string;
  version?: string;
  /** Reported unit string */
  unit: string;
  /** Description shown in the variable picker */
  description?: string;
  /**
   * Optional dimension filters: SDMX dataflows have multiple dimensions
   * (gas, sector, geo, time). To get a clean year × geo cube we filter
   * down all non-geo, non-time dimensions to a single value.
   *
   * Format: `{dimension: 'value'}` — these become URL path components.
   */
  filters?: Record<string, string>;
}

/**
 * Curated EEA variable registry.
 *
 * The keys mirror IIASA-style variable names so the existing dashboard
 * presets and chart renderers work without special-casing.
 */
export const EEA_VARIABLES: Record<string, EeaVariableSpec> = {
  'Emissions|Kyoto Gases': {
    dataflow: 'GHG_INVENTORY',
    unit: 'Mt CO2-equivalent',
    description: 'EEA GHG inventory — total Kyoto gases (UNFCCC submission)',
    filters: { gas: 'GHG', sector: 'TOT_X_LULUCF' },
  },
  'Emissions|CO2': {
    dataflow: 'GHG_INVENTORY',
    unit: 'Mt CO2',
    description: 'EEA GHG inventory — CO2 only',
    filters: { gas: 'CO2', sector: 'TOT_X_LULUCF' },
  },
  'Emissions|CO2|Energy and Industrial Processes': {
    dataflow: 'GHG_INVENTORY',
    unit: 'Mt CO2',
    description: 'EEA — CO2 from energy + industrial processes',
    filters: { gas: 'CO2', sector: 'ENERGY_IND' },
  },
};

// ── Region registry ──────────────────────────────────────────────────────

export const EEA_REGIONS: Record<string, string> = {
  'EU27': 'EU27_2020',
  'EU28': 'EU28',
  'Austria': 'AT',
  'Belgium': 'BE',
  'Bulgaria': 'BG',
  'Croatia': 'HR',
  'Cyprus': 'CY',
  'Czechia': 'CZ',
  'Denmark': 'DK',
  'Estonia': 'EE',
  'Finland': 'FI',
  'France': 'FR',
  'Germany': 'DE',
  'Greece': 'EL',
  'Hungary': 'HU',
  'Ireland': 'IE',
  'Italy': 'IT',
  'Latvia': 'LV',
  'Lithuania': 'LT',
  'Luxembourg': 'LU',
  'Malta': 'MT',
  'Netherlands': 'NL',
  'Poland': 'PL',
  'Portugal': 'PT',
  'Romania': 'RO',
  'Slovakia': 'SK',
  'Slovenia': 'SI',
  'Spain': 'ES',
  'Sweden': 'SE',
  // EEA-EFTA members (non-EU)
  'Iceland': 'IS',
  'Liechtenstein': 'LI',
  'Norway': 'NO',
  // Cooperating countries (not EEA members)
  'Switzerland': 'CH',
  'Turkey': 'TR',
  'United Kingdom': 'UK',
};

const REVERSE_REGIONS: Record<string, string> = Object.fromEntries(
  Object.entries(EEA_REGIONS).map(([label, code]) => [code, label]),
);

// ── Run registry ──────────────────────────────────────────────────────────

export const EEA_RUN_ID = 1001;
export const EEA_MODEL = 'EEA';
export const EEA_SCENARIO = 'Historical (EEA inventory)';

export interface EeaRun {
  id: number;
  model: string;
  scenario: string;
  category: string;
  meta: Record<string, string>;
}

export function eeaRuns(): EeaRun[] {
  return [
    {
      id: EEA_RUN_ID,
      model: EEA_MODEL,
      scenario: EEA_SCENARIO,
      category: 'Historical',
      meta: { source: 'EEA', type: 'observation' },
    },
  ];
}

// ── SDMX-JSON fetcher (lightweight) ──────────────────────────────────────
//
// EEA's SDMX endpoints accept Accept: application/vnd.sdmx.data+json
// and return SDMX-JSON 1.0 documents. The structure is similar to JSON-stat
// but with `dataSets[0].observations` keyed by a colon-separated coordinate
// string, e.g. "0:0:0:5" → value at position (0,0,0,5) along the dataflow's
// dimensions.
//
// Because EEA dataflow schemas vary, we keep this parser conservative: it
// extracts the time dimension index, the geo dimension index, and emits
// (geo, year, value) tuples. Other dimensions are ignored if they're
// already filtered to size-1 by the URL filters.

interface SdmxDimension {
  id: string;
  name?: string;
  values?: { id: string; name?: string }[];
}

interface SdmxJsonResponse {
  data?: {
    structures?: Array<{
      dimensions?: { observation?: SdmxDimension[]; series?: SdmxDimension[] };
    }>;
    dataSets?: Array<{
      observations?: Record<string, [number | null, ...unknown[]]>;
      series?: Record<string, { observations: Record<string, [number | null, ...unknown[]]> }>;
    }>;
  };
}

export interface EeaDatapoint {
  run_id: number;
  year: number;
  value: number;
  unit: string;
  region: string;
  variable: string;
}

export async function fetchEeaVariable(
  variable: string,
  region: string,
): Promise<EeaDatapoint[]> {
  const spec = EEA_VARIABLES[variable];
  if (!spec) {
    throw new Error(`EEA: unknown variable "${variable}"`);
  }

  const geoCode = EEA_REGIONS[region] || region || EEA_REGIONS['EU27'];
  const agency = spec.agency || 'EEA';
  const version = spec.version || 'latest';

  // SDMX URL — filters become path segments in dimension order
  // EEA generally accepts: {base}/{dataflow}/{key}?format=sdmx-json
  // where {key} is dimension values joined by '.', missing dims = wildcard
  const filterParts: string[] = [];
  if (spec.filters) {
    for (const v of Object.values(spec.filters)) filterParts.push(v);
  }
  filterParts.push(geoCode);
  const key = filterParts.join('.');

  const url = `${EEA_SDMX_BASE}/${agency},${spec.dataflow},${version}/${key}?format=sdmx-json`;

  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.sdmx.data+json, application/json' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`EEA ${res.status}: ${text.slice(0, 200)} (url: ${url})`);
  }
  const json = (await res.json()) as SdmxJsonResponse;

  return parseSdmxJson(json, variable, spec.unit);
}

function parseSdmxJson(
  json: SdmxJsonResponse,
  variable: string,
  unit: string,
): EeaDatapoint[] {
  const out: EeaDatapoint[] = [];
  const dataSet = json.data?.dataSets?.[0];
  if (!dataSet) return out;

  // Find time and geo dimension indices
  const obsDims = json.data?.structures?.[0]?.dimensions?.observation || [];
  const seriesDims = json.data?.structures?.[0]?.dimensions?.series || [];

  const timeDimIdx = obsDims.findIndex((d) => d.id === 'TIME_PERIOD' || d.id === 'TIME' || d.id === 'time');
  const timeValues = timeDimIdx >= 0 ? obsDims[timeDimIdx]?.values || [] : [];

  const geoDimIdxInSeries = seriesDims.findIndex((d) => d.id === 'REF_AREA' || d.id === 'GEO' || d.id === 'geo');
  const geoValuesInSeries = geoDimIdxInSeries >= 0 ? seriesDims[geoDimIdxInSeries]?.values || [] : [];

  // SDMX-JSON has two patterns:
  //   1) flat observations object where the key is the full coordinate
  //   2) series-keyed object where each series has its own observations
  if (dataSet.series) {
    for (const [seriesKey, series] of Object.entries(dataSet.series)) {
      // seriesKey is colon-separated dimension positions, e.g. "0:0:5"
      const seriesPositions = seriesKey.split(':').map(Number);
      const geoPos = geoDimIdxInSeries >= 0 ? seriesPositions[geoDimIdxInSeries] : -1;
      const geoCode = geoPos >= 0 ? geoValuesInSeries[geoPos]?.id || '' : '';

      for (const [obsKey, obsVal] of Object.entries(series.observations || {})) {
        const obsPositions = obsKey.split(':').map(Number);
        const timePos = timeDimIdx >= 0 ? obsPositions[timeDimIdx] : 0;
        const timeId = timeValues[timePos]?.id || '';
        const year = parseInt(timeId, 10);
        const value = obsVal?.[0];
        if (!geoCode || !year || value == null || isNaN(value as number)) continue;
        out.push({
          run_id: EEA_RUN_ID,
          year,
          value: value as number,
          unit,
          region: REVERSE_REGIONS[geoCode] || geoCode,
          variable,
        });
      }
    }
  } else if (dataSet.observations) {
    // Flat observations — assume single series
    for (const [obsKey, obsVal] of Object.entries(dataSet.observations)) {
      const obsPositions = obsKey.split(':').map(Number);
      const timePos = timeDimIdx >= 0 ? obsPositions[timeDimIdx] : 0;
      const timeId = timeValues[timePos]?.id || '';
      const year = parseInt(timeId, 10);
      const value = obsVal?.[0];
      if (!year || value == null || isNaN(value as number)) continue;
      out.push({
        run_id: EEA_RUN_ID,
        year,
        value: value as number,
        unit,
        region: '', // unknown — should be present in series form
        variable,
      });
    }
  }

  return out;
}

// ── Helpers exposed to the API route ─────────────────────────────────────

export function eeaVariables(): string[] {
  return Object.keys(EEA_VARIABLES).sort();
}

export function eeaRegions(): string[] {
  return Object.keys(EEA_REGIONS);
}

export function eeaModels(): string[] {
  return [EEA_MODEL];
}

export function eeaScenarios(): string[] {
  return [EEA_SCENARIO];
}
