/**
 * Registry of live data sources for the seed indicators.
 * -----------------------------------------------------
 * Maps each seed indicator id to the API call that pulls the current
 * EU-27 series, so the "Refresh from source" button in the workspace
 * can replace the embedded snapshot with live values.
 *
 * Two adapters are supported:
 *   - `eurostat` — JSON-stat REST, parsed in `./eurostat.ts`.
 *   - `eea`      — EEA GHG inventory CSV download. The endpoint is the
 *                  same for every inventory indicator; we slice the rows
 *                  by sector/category via a per-indicator filter.
 *
 * Indicators with no entry below cannot be refreshed automatically and
 * the UI hides the button for them.
 */
import 'server-only';

import { fetchEurostatSeries, type EurostatPoint } from './eurostat';

export type LiveSourceKind = 'eurostat' | 'eea';

export interface LiveSourceResult {
  kind: LiveSourceKind;
  /** Human-readable description of where the values came from. */
  source: string;
  /** Year/value pairs ready to upsert. */
  points: EurostatPoint[];
}

interface EurostatConfig {
  kind: 'eurostat';
  dataset: string;
  filters: Record<string, string>;
  label: string;
}

interface EeaInventoryConfig {
  kind: 'eea';
  /** CRF sector code(s) to sum over; e.g. ['1', '2', '3', '4', '5'] for total. */
  crfCodes: string[];
  /** Gas filter — defaults to "All greenhouse gases - (CO2 equivalent)". */
  gas?: string;
  label: string;
}

type LiveSourceConfig = EurostatConfig | EeaInventoryConfig;

const REGISTRY: Record<string, LiveSourceConfig> = {
  // Eurostat — renewable energy share, RED III tracker.
  'res-share': {
    kind: 'eurostat',
    dataset: 'nrg_ind_ren',
    filters: { geo: 'EU27_2020', nrg_bal: 'REN', unit: 'PC' },
    label: 'Eurostat nrg_ind_ren · EU27_2020',
  },
  // Eurostat — final energy consumption, EED tracker.
  'final-energy-consumption': {
    kind: 'eurostat',
    dataset: 'ten00124',
    filters: { geo: 'EU27_2020', unit: 'MTOE', nrg_bal: 'FEC2020-2030' },
    label: 'Eurostat ten00124 · EU27_2020',
  },
  // Eurostat — energy-poverty proxy (population unable to keep home warm).
  'energy-poverty-share': {
    kind: 'eurostat',
    dataset: 'ilc_mdes01',
    filters: {
      geo: 'EU27_2020',
      hhtyp: 'TOTAL',
      incgrp: 'TOTAL',
    },
    label: 'Eurostat ilc_mdes01 · EU27_2020',
  },

  // ── EEA branch ────────────────────────────────────────────────────────────
  // The EEA datahub does not expose a stable, simple REST endpoint that we
  // can hit from a serverless function the way Eurostat's JSON-stat API
  // works. The viewer downloads route through Tableau and item-specific
  // download tokens that rotate. Until a stable endpoint exists, the EEA
  // GHG-inventory indicators are intentionally NOT registered here, even
  // though their live source URL is recorded on each indicator — the
  // refresh button only appears for entries that have an active connector,
  // and EEA-sourced indicators continue to be updated by hand.
  //
  // The `fetchEeaInventory` helper below is structured to make wiring it
  // up trivial once we settle on an endpoint (SDMX/CSV/Parquet) so this
  // stays a single-line change.
};

export function getLiveSourceConfig(indicatorId: string): LiveSourceConfig | null {
  return REGISTRY[indicatorId] ?? null;
}

export function hasLiveSource(indicatorId: string): boolean {
  return indicatorId in REGISTRY;
}

export function listSupportedIndicatorIds(): string[] {
  return Object.keys(REGISTRY);
}

/**
 * Pull the latest series for a registered indicator. Throws if the source is
 * unknown or the fetch fails; the API route translates that into a 4xx/5xx.
 */
export async function fetchLiveSeries(
  indicatorId: string,
  signal?: AbortSignal
): Promise<LiveSourceResult> {
  const cfg = REGISTRY[indicatorId];
  if (!cfg) throw new Error(`No live source registered for "${indicatorId}".`);

  if (cfg.kind === 'eurostat') {
    const points = await fetchEurostatSeries(cfg.dataset, cfg.filters, signal);
    return { kind: 'eurostat', source: cfg.label, points };
  }

  // EEA branch
  const points = await fetchEeaInventory(cfg, signal);
  return { kind: 'eea', source: cfg.label, points };
}

/**
 * EEA GHG inventory pull. The proxy table at the public CSV endpoint below
 * exposes one row per (year, sector_code, gas, country) — we sum across the
 * configured `crfCodes` for the EU-27 total of all gases (CO₂-eq).
 *
 * Endpoint: https://www.eea.europa.eu/en/datahub  → datahubitem
 *   "EEA greenhouse gases — data viewer". The viewer's CSV download URL
 *   stays stable across vintages.
 */
async function fetchEeaInventory(
  cfg: EeaInventoryConfig,
  signal?: AbortSignal
): Promise<EurostatPoint[]> {
  const gas = cfg.gas ?? 'Total (excluding LULUCF) - including indirect CO2';
  // Public viewer CSV — country='EU27', pivoted on year. Stable URL.
  const url =
    'https://www.eea.europa.eu/en/datahub/datahubitem-view/' +
    '3b7fe76c-524a-439a-bfd2-a6e4046302a2/download?format=csv&country=EU27';
  const res = await fetch(url, { signal, cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`EEA datahub returned ${res.status} ${res.statusText}`);
  }
  const csv = await res.text();
  const rows = parseCsv(csv);
  if (rows.length === 0) throw new Error('EEA CSV was empty');

  const header = rows[0].map(h => h.trim().toLowerCase());
  const idx = {
    year: header.findIndex(h => h === 'year'),
    sector: header.findIndex(h => h === 'sector_code' || h === 'crf_code' || h === 'sector'),
    gas: header.findIndex(h => h === 'pollutant_name' || h === 'gas'),
    value: header.findIndex(h => h === 'emissions' || h === 'value'),
  };
  if (idx.year < 0 || idx.sector < 0 || idx.value < 0) {
    throw new Error('EEA CSV is missing expected columns (year, sector, value)');
  }

  const totals = new Map<number, number>();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const code = (r[idx.sector] ?? '').trim();
    if (!cfg.crfCodes.some(c => code === c || code.startsWith(c + '.'))) continue;
    if (idx.gas >= 0 && r[idx.gas] && r[idx.gas].trim() !== gas) continue;
    const year = parseInt(r[idx.year], 10);
    const v = parseFloat(r[idx.value]);
    if (!Number.isFinite(year) || !Number.isFinite(v)) continue;
    totals.set(year, (totals.get(year) ?? 0) + v);
  }
  return [...totals.entries()]
    .map(([year, value]) => ({ year, value: Math.round(value * 10) / 10 }))
    .sort((a, b) => a.year - b.year);
}

/** Minimal CSV parser sufficient for the EEA download (RFC-4180-ish). */
function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (field.length > 0 || row.length > 0) {
        row.push(field);
        out.push(row);
        row = [];
        field = '';
      }
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    out.push(row);
  }
  return out;
}
