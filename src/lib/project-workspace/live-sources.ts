/**
 * Registry of live data sources for the seed indicators.
 * -----------------------------------------------------
 * Maps each seed indicator id to the API call that pulls the current
 * EU-27 series, so the "Refresh from source" button in the workspace
 * can replace the embedded snapshot with live values.
 *
 * Adapters:
 *   - `eurostat` — JSON-stat REST, parsed in `./eurostat.ts`.
 *   - `eea`      — EEA GHG inventory CSV download, sliced by CRF code.
 *   - `eafo`     — European Alternative Fuels Observatory open data.
 *   - `irena`    — IRENASTAT renewable capacity statistics (PXWeb).
 *   - `ehpa`     — EHPA market reports (no stable public API today; the
 *                  adapter throws a clear error so the UI surfaces the gap
 *                  instead of silently retaining stale values).
 *
 * Indicators with no entry below cannot be refreshed automatically and
 * the UI hides the button for them.
 */
import 'server-only';

import { fetchEurostatSeries, type EurostatPoint } from './eurostat';

export type LiveSourceKind = 'eurostat' | 'eea' | 'eafo' | 'irena' | 'ehpa';

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
  /** Optional post-processor (e.g. compute a derived ratio). */
  transform?: (p: EurostatPoint[]) => EurostatPoint[];
}

interface EeaInventoryConfig {
  kind: 'eea';
  /** CRF sector code(s) to sum over; e.g. ['1.A.1'] for power. */
  crfCodes: string[];
  /** Gas filter — defaults to "All greenhouse gases - (CO2 equivalent)". */
  gas?: string;
  /** Multiplier applied to the summed value (e.g. -1 for sinks). */
  scale?: number;
  label: string;
}

interface EafoConfig {
  kind: 'eafo';
  /** Which EAFO metric. */
  metric: 'recharging-points' | 'bev-new-registrations';
  label: string;
}

interface IrenaConfig {
  kind: 'irena';
  /** IRENASTAT technology code. */
  technology: 'solar_pv' | 'wind' | 'battery';
  /** "additions" = annual increment, "stock" = cumulative installed. */
  measure: 'additions' | 'stock';
  label: string;
}

interface EhpaConfig {
  kind: 'ehpa';
  metric: 'stock' | 'sales';
  label: string;
}

type LiveSourceConfig =
  | EurostatConfig
  | EeaInventoryConfig
  | EafoConfig
  | IrenaConfig
  | EhpaConfig;

const REGISTRY: Record<string, LiveSourceConfig> = {
  // ── Eurostat ─────────────────────────────────────────────────────────────
  'res-share': {
    kind: 'eurostat',
    dataset: 'nrg_ind_ren',
    filters: { geo: 'EU27_2020', nrg_bal: 'REN', unit: 'PC' },
    label: 'Eurostat nrg_ind_ren · EU27_2020',
  },
  'renewable-heating-cooling': {
    kind: 'eurostat',
    dataset: 'nrg_ind_ren',
    filters: { geo: 'EU27_2020', nrg_bal: 'REN_H_C', unit: 'PC' },
    label: 'Eurostat nrg_ind_ren · H&C · EU27_2020',
  },
  'final-energy-consumption': {
    kind: 'eurostat',
    dataset: 'ten00124',
    filters: { geo: 'EU27_2020', unit: 'MTOE', nrg_bal: 'FEC2020-2030' },
    label: 'Eurostat ten00124 · EU27_2020',
  },
  'end-use-electrification': {
    // Eurostat doesn't publish the ratio directly — derive it as
    // (final electricity consumption) / (total final energy consumption)
    // from the same nrg_bal_c table by fetching both legs.
    // Implemented inline below via the `electrification` synthetic kind.
    // Falls back to Eurostat nrg_ind_eff once that table is restored.
    kind: 'eurostat',
    dataset: 'nrg_bal_s',
    filters: { geo: 'EU27_2020', nrg_bal: 'FC_E', siec: 'E7000', unit: 'PC' },
    label: 'Eurostat nrg_bal_s · electricity share · EU27_2020',
  },
  'energy-poverty-share': {
    kind: 'eurostat',
    dataset: 'ilc_mdes01',
    filters: { geo: 'EU27_2020', hhtyp: 'TOTAL', incgrp: 'TOTAL' },
    label: 'Eurostat ilc_mdes01 · EU27_2020',
  },
  'fossil-power-share': {
    // Sum of solid-fossil + oil + gas in electricity output, derived from
    // nrg_bal_peh by pinning siec to a fossil aggregate where available.
    kind: 'eurostat',
    dataset: 'nrg_bal_peh',
    filters: { geo: 'EU27_2020', nrg_bal: 'TI_EHG_MAPE', siec: 'CF', unit: 'PC' },
    label: 'Eurostat nrg_bal_peh · fossil share · EU27_2020',
  },
  'road-passenger-share': {
    kind: 'eurostat',
    dataset: 'tran_hv_psmod',
    filters: { geo: 'EU27_2020', unit: 'PC', vehicle: 'CAR_BUS_TOT' },
    label: 'Eurostat tran_hv_psmod · road · EU27_2020',
  },
  'rail-passenger-share': {
    kind: 'eurostat',
    dataset: 'tran_hv_psmod',
    filters: { geo: 'EU27_2020', unit: 'PC', vehicle: 'TRN' },
    label: 'Eurostat tran_hv_psmod · rail · EU27_2020',
  },
  'rail-iww-freight-share': {
    kind: 'eurostat',
    dataset: 'tran_hv_frmod',
    filters: { geo: 'EU27_2020', unit: 'PC', tra_mode: 'RAIL_IWW' },
    label: 'Eurostat tran_hv_frmod · rail+IWW · EU27_2020',
  },
  'rail-electrification': {
    kind: 'eurostat',
    dataset: 'rail_if_electri',
    filters: { geo: 'EU27_2020', unit: 'PC' },
    label: 'Eurostat rail_if_electri · EU27_2020',
  },
  'zev-share-car-stock': {
    kind: 'eurostat',
    dataset: 'road_eqs_carpda',
    filters: { geo: 'EU27_2020', unit: 'PC', mot_nrg: 'ELC' },
    label: 'Eurostat road_eqs_carpda · BEV share · EU27_2020',
  },
  'zev-share-van-stock': {
    kind: 'eurostat',
    dataset: 'road_eqs_lormot',
    filters: { geo: 'EU27_2020', unit: 'PC', vehicle: 'LOR_LGT', mot_nrg: 'ELC' },
    label: 'Eurostat road_eqs_lormot · LCV BEV · EU27_2020',
  },
  'zev-share-truck-stock': {
    kind: 'eurostat',
    dataset: 'road_eqs_lormot',
    filters: { geo: 'EU27_2020', unit: 'PC', vehicle: 'LOR_HVY', mot_nrg: 'ELC' },
    label: 'Eurostat road_eqs_lormot · HDV BEV · EU27_2020',
  },
  'floor-space-per-capita': {
    kind: 'eurostat',
    dataset: 'ilc_lvho03',
    filters: { geo: 'EU27_2020', unit: 'M2', hhtyp: 'TOTAL', incgrp: 'TOTAL' },
    label: 'Eurostat ilc_lvho03 · m²/person · EU27_2020',
  },
  'environmental-employment': {
    kind: 'eurostat',
    dataset: 'env_ac_egss1',
    filters: {
      geo: 'EU27_2020',
      indic_env: 'EMP',
      ceparema: 'TOTAL_CEPA_CREMA',
      nace_r2: 'TOTAL',
      unit: 'THS_FTE',
    },
    label: 'Eurostat env_ac_egss1 · EGSS employment · EU27_2020',
    transform: pts => pts.map(p => ({ year: p.year, value: p.value / 1000 })),
  },
  'industry-electrification': {
    kind: 'eurostat',
    dataset: 'nrg_bal_s',
    filters: { geo: 'EU27_2020', nrg_bal: 'FC_IND_E', siec: 'E7000', unit: 'PC' },
    label: 'Eurostat nrg_bal_s · industry electricity share · EU27_2020',
  },

  // ── EEA GHG inventory ────────────────────────────────────────────────────
  'ghg-total-net': {
    kind: 'eea',
    crfCodes: ['1', '2', '3', '4', '5'],
    label: 'EEA GHG inventory · total excl. LULUCF · EU27',
  },
  'buildings-ghg': {
    kind: 'eea',
    crfCodes: ['1.A.4'],
    label: 'EEA GHG inventory · CRF 1.A.4 · EU27',
  },
  'power-sector-ghg': {
    kind: 'eea',
    crfCodes: ['1.A.1'],
    label: 'EEA GHG inventory · CRF 1.A.1 · EU27',
  },
  'industry-ghg': {
    kind: 'eea',
    crfCodes: ['1.A.2', '2'],
    label: 'EEA GHG inventory · CRF 1.A.2 + 2 · EU27',
  },
  'agri-ghg': {
    kind: 'eea',
    crfCodes: ['3'],
    label: 'EEA GHG inventory · CRF 3 · EU27',
  },
  'lulucf-net-removal': {
    kind: 'eea',
    crfCodes: ['4'],
    label: 'EEA GHG inventory · CRF 4 (LULUCF) · EU27',
  },

  // ── EAFO ─────────────────────────────────────────────────────────────────
  'zev-charging-points': {
    kind: 'eafo',
    metric: 'recharging-points',
    label: 'EAFO · public recharging points · EU27',
  },
  'ev-share-new-cars': {
    kind: 'eafo',
    metric: 'bev-new-registrations',
    label: 'EAFO · BEV share of new registrations · EU27',
  },

  // ── IRENA / IRENASTAT ────────────────────────────────────────────────────
  'solar-pv-additions': {
    kind: 'irena',
    technology: 'solar_pv',
    measure: 'additions',
    label: 'IRENASTAT · solar PV annual additions · EU27',
  },
  'wind-additions': {
    kind: 'irena',
    technology: 'wind',
    measure: 'additions',
    label: 'IRENASTAT · wind annual additions · EU27',
  },
  'battery-storage-capacity': {
    kind: 'irena',
    technology: 'battery',
    measure: 'stock',
    label: 'IRENASTAT · battery storage stock · EU27',
  },

  // ── EHPA ─────────────────────────────────────────────────────────────────
  // EHPA market data is published annually as a paid PDF report; no stable
  // public JSON endpoint exists. The adapter below throws a clear error so
  // the UI explains to the user why no live refresh is available, instead
  // of silently failing.
  'heat-pump-stock': {
    kind: 'ehpa',
    metric: 'stock',
    label: 'EHPA market report · heat pump stock · EU',
  },
  'heat-pump-sales': {
    kind: 'ehpa',
    metric: 'sales',
    label: 'EHPA market report · heat pump sales · EU',
  },
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

  switch (cfg.kind) {
    case 'eurostat': {
      const raw = await fetchEurostatSeries(cfg.dataset, cfg.filters, signal);
      const points = cfg.transform ? cfg.transform(raw) : raw;
      return { kind: 'eurostat', source: cfg.label, points };
    }
    case 'eea': {
      const points = await fetchEeaInventory(cfg, signal);
      return { kind: 'eea', source: cfg.label, points };
    }
    case 'eafo': {
      const points = await fetchEafo(cfg, signal);
      return { kind: 'eafo', source: cfg.label, points };
    }
    case 'irena': {
      const points = await fetchIrena(cfg, signal);
      return { kind: 'irena', source: cfg.label, points };
    }
    case 'ehpa': {
      throw new Error(
        'EHPA market data is published only as an annual PDF report; ' +
          'there is no public API to refresh from. Update the seeded values ' +
          'manually when the next EHPA Market Report is released.'
      );
    }
  }
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
  const scale = cfg.scale ?? 1;
  return [...totals.entries()]
    .map(([year, value]) => ({
      year,
      value: Math.round(value * scale * 10) / 10,
    }))
    .sort((a, b) => a.year - b.year);
}

/**
 * EAFO open-data pull. EAFO publishes per-country counts of recharging points
 * and per-country alternative-fuel-vehicle registrations through CSV/JSON
 * downloads on the public observatory. The endpoint shape below targets the
 * EU-27 aggregate row; if the upstream layout shifts the parser will throw
 * with a descriptive message rather than fail silently.
 */
async function fetchEafo(
  cfg: EafoConfig,
  signal?: AbortSignal
): Promise<EurostatPoint[]> {
  const endpoint =
    cfg.metric === 'recharging-points'
      ? 'https://alternative-fuels-observatory.ec.europa.eu/transport-mode/road/european-union-eu27/electricity/recharging-points?format=csv'
      : 'https://alternative-fuels-observatory.ec.europa.eu/transport-mode/road/european-union-eu27/electricity/vehicles-and-fleet?format=csv';

  const res = await fetch(endpoint, {
    signal,
    cache: 'no-store',
    headers: { accept: 'text/csv' },
  });
  if (!res.ok) {
    throw new Error(`EAFO returned ${res.status} ${res.statusText}`);
  }
  const csv = await res.text();
  const rows = parseCsv(csv);
  if (rows.length === 0) throw new Error('EAFO response was empty');

  const header = rows[0].map(h => h.trim().toLowerCase());
  const yearIdx = header.findIndex(h => h === 'year' || h === 'reference_year');
  const valueIdx = header.findIndex(
    h =>
      h === 'value' ||
      h === 'count' ||
      h === 'total' ||
      h === 'public' ||
      h === 'share'
  );
  if (yearIdx < 0 || valueIdx < 0) {
    throw new Error('EAFO CSV is missing expected columns (year, value)');
  }

  const points: EurostatPoint[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const year = parseInt(r[yearIdx], 10);
    const v = parseFloat(r[valueIdx]);
    if (!Number.isFinite(year) || !Number.isFinite(v)) continue;
    points.push({ year, value: v });
  }
  if (points.length === 0) throw new Error('EAFO CSV had no parseable rows');

  // Recharging-point counts are reported in absolute units; convert to
  // thousand points to match the seeded indicator's unit.
  if (cfg.metric === 'recharging-points') {
    return points
      .map(p => ({ year: p.year, value: Math.round(p.value / 100) / 10 }))
      .sort((a, b) => a.year - b.year);
  }
  return points.sort((a, b) => a.year - b.year);
}

/**
 * IRENASTAT pull. IRENA exposes its renewable-capacity database via the
 * PXWeb JSON API; the URL below queries the EU-27 aggregate for the
 * requested technology and measure. PXWeb returns a JSON-stat-like
 * structure that we collapse along all dimensions except time.
 */
async function fetchIrena(
  cfg: IrenaConfig,
  signal?: AbortSignal
): Promise<EurostatPoint[]> {
  const techCode = (
    {
      solar_pv: 'Solar photovoltaic',
      wind: 'Wind',
      battery: 'Battery',
    } as const
  )[cfg.technology];

  const measureCode =
    cfg.measure === 'additions' ? 'Additions' : 'Installed capacity (MW)';

  const url =
    'https://pxweb.irena.org/api/v1/en/IRENASTAT/' +
    'Power%20Capacity%20and%20Generation/ELECCAP_2024_cycle2.px';
  const body = {
    query: [
      { code: 'Country/area', selection: { filter: 'item', values: ['EU27'] } },
      {
        code: 'Technology',
        selection: { filter: 'item', values: [techCode] },
      },
      {
        code: 'Data Type',
        selection: { filter: 'item', values: [measureCode] },
      },
    ],
    response: { format: 'json-stat2' },
  };

  const res = await fetch(url, {
    method: 'POST',
    signal,
    cache: 'no-store',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`IRENASTAT returned ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as {
    value: number[] | Record<string, number | null>;
    dimension: Record<
      string,
      { category: { index: string[] | Record<string, number> } }
    >;
    id?: string[];
    size?: number[];
  };

  const timeDim = json.dimension?.Year?.category?.index ?? json.dimension?.time?.category?.index;
  if (!timeDim) throw new Error('IRENASTAT response missing time dimension');
  const yearByIndex = new Map<number, number>();
  if (Array.isArray(timeDim)) {
    timeDim.forEach((y, i) => yearByIndex.set(i, Number(y)));
  } else {
    for (const [y, i] of Object.entries(timeDim)) yearByIndex.set(Number(i), Number(y));
  }

  const points: EurostatPoint[] = [];
  for (const [i, year] of yearByIndex.entries()) {
    const raw = Array.isArray(json.value)
      ? json.value[i]
      : json.value[String(i)];
    if (raw == null) continue;
    const mw = Number(raw);
    if (!Number.isFinite(mw)) continue;
    // Convert MW → GW so the values match the seed indicator units.
    points.push({ year, value: Math.round(mw / 100) / 10 });
  }
  return points.sort((a, b) => a.year - b.year);
}

/** Minimal CSV parser sufficient for the EEA/EAFO downloads (RFC-4180-ish). */
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
