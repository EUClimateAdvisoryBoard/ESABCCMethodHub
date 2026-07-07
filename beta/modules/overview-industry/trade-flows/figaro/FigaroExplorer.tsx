'use client';

/**
 * FIGARO explorer — loads the MethodHub-hosted FIGARO extract once and offers
 * three linked views: the analysis dashboard, the full table viewer, and the
 * data provenance / download panel.
 */

import { useEffect, useState } from 'react';
import {
  type FigaroIoData,
  type FigaroGlobalData,
  loadFigaroIo,
  loadFigaroGlobal,
  IO_JSON_PATH,
  GLOBAL_JSON_PATH,
  FIGARO_DATASET_URL,
} from './figaro-data';
import FigaroTableViewer from './FigaroTableViewer';
import FigaroAnalysis from './FigaroAnalysis';

type View = 'analysis' | 'table' | 'data';

const VIEWS: { id: View; label: string; blurb: string }[] = [
  { id: 'analysis', label: 'Analysis dashboard', blurb: 'Import dependence, suppliers, biggest flows' },
  { id: 'table', label: 'Table viewer', blurb: 'The full 70 × 69 IO matrix, filterable' },
  { id: 'data', label: 'The data', blurb: 'Provenance, downloads, reproducibility' },
];

export default function FigaroExplorer() {
  const [view, setView] = useState<View>('analysis');
  const [io, setIo] = useState<FigaroIoData | null>(null);
  const [global, setGlobal] = useState<FigaroGlobalData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFigaroIo().then(setIo).catch((e) => setError(String(e)));
    loadFigaroGlobal().then(setGlobal).catch(() => undefined);
  }, []);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`rounded-lg border px-3 py-1.5 text-left transition ${
              view === v.id ? 'border-primary bg-surface-blue' : 'border-grey-200 bg-white hover:border-grey-400'
            }`}
          >
            <div className={`text-sm font-semibold ${view === v.id ? 'text-primary' : 'text-grey-800'}`}>
              {v.label}
            </div>
            <div className="text-[10px] text-grey-500">{v.blurb}</div>
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-accent-red/40 bg-surface-orange/40 p-4 text-sm text-grey-700">
          Could not load the FIGARO extract ({error}). Regenerate it with{' '}
          <code className="rounded bg-grey-100 px-1 text-[12px]">node scripts/fetch-figaro-io-dataset.mjs</code>.
        </div>
      )}
      {!io && !error && (
        <div className="rounded-lg border border-grey-200 bg-white p-8 text-center text-sm text-grey-500">
          Loading the FIGARO input–output extract (≈0.9 MB, served from the MethodHub)…
        </div>
      )}

      {io && view === 'analysis' && <FigaroAnalysis data={io} global={global} />}
      {io && view === 'table' && <FigaroTableViewer data={io} />}
      {io && view === 'data' && <DataPanel data={io} />}
    </div>
  );
}

function DataPanel({ data }: { data: FigaroIoData }) {
  const row = (k: string, v: React.ReactNode) => (
    <div className="grid grid-cols-[180px_1fr] gap-2 border-b border-grey-100 py-1.5 text-[12px]">
      <div className="font-semibold text-grey-600">{k}</div>
      <div className="text-grey-800">{v}</div>
    </div>
  );
  return (
    <div className="rounded-lg border border-grey-200 bg-white p-4">
      <h3 className="text-sm font-bold text-grey-900">The dataset behind this page</h3>
      <p className="mt-1 max-w-text text-[12px] leading-relaxed text-grey-600">
        The complete Eurostat FIGARO inter-country input–output table (industry by industry, ~11 million
        cells) is imported by <code className="rounded bg-grey-100 px-1">scripts/fetch-figaro-io-dataset.mjs</code>{' '}
        and condensed to the EU-27-as-one-economy account you are browsing: for each origin (intra-EU + 23
        partner areas) the full supplying-industry × using-industry matrix, plus the 50×50 country flow
        matrix and EU export margins. The JSON lives in this repository and is served from the MethodHub —
        no external service is queried when you use these views.
      </p>
      <div className="mt-3">
        {row('Source dataset', (
          <a href={FIGARO_DATASET_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Eurostat naio_10_fcp_ii4 — EU inter-country input–output table (FIGARO) ↗
          </a>
        ))}
        {row('Reference years', data.meta.years.join(', '))}
        {row('Unit', '€ million, current prices (basic prices); cells rounded to €0.1 m')}
        {row('Resolution', '64 NACE A*64 industries + 6 value-added rows × 64 industries + 5 final-demand categories × 24 origins')}
        {row('Aggregation', 'EU-27 destination countries summed (EU-27 treated as one economy); extra-EU↔extra-EU flows not included')}
        {row('Rest-of-world breakdown', (
          <>
            FIGARO names only 23 partner areas; the analysis dashboard decomposes the &quot;Rest of the
            world&quot; block indicatively with EU goods trade by partner country (
            <a
              href="https://ec.europa.eu/eurostat/databrowser/view/ext_tec03/default/table?lang=en"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              ext_tec03 ↗
            </a>
            , TEC/customs attribution — Taiwan, Viet Nam, Gulf states, Ukraine…)
          </>
        ))}
        {row('Last regenerated', data.meta.generated)}
        {row('Download (hosted here)', (
          <span className="flex flex-wrap gap-3">
            <a href={IO_JSON_PATH} download className="text-primary hover:underline">
              figaro-io-eu27.json (~0.9 MB) ⬇
            </a>
            <a href={GLOBAL_JSON_PATH} download className="text-primary hover:underline">
              figaro-global-flows.json (~0.1 MB) ⬇
            </a>
          </span>
        ))}
        {row('Reproduce / refresh', (
          <code className="rounded bg-grey-100 px-1 text-[11px]">node scripts/fetch-figaro-io-dataset.mjs --refresh</code>
        ))}
      </div>
      <p className="mt-3 max-w-text text-[11px] leading-snug text-grey-500">
        Reading guide: a cell is the € value of what row industry (in the origin area) delivered into the
        column&apos;s use in the EU-27. The intra-EU view carries the value-added and adjustment rows
        (B2A3G, D1, D21X31, D29X39, OP_RES, OP_NRES), so each industry column under &quot;All origins&quot;
        sums to that industry&apos;s total output at basic prices. The FIGARO application datasets used
        elsewhere in this module (imports/exports by industry, foreign value added) are derived by Eurostat
        from this same table — small differences against customs statistics are methodological, not errors
        (see the trade-flows Methodology view).
      </p>
    </div>
  );
}
