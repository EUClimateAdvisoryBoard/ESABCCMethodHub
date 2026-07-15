'use client';

/**
 * Overview Industry — Trade flows — the explorer.
 * -----------------------------------------------
 * ONE interactive figure for the whole page, redesigned around two ways of
 * reading the data plus the dataset itself:
 *   • Overview      — a single summary dashboard: headline facts, the
 *                     imports-vs-exports balance of all 24 divisions, the
 *                     import-dependency map and the critical-materials board.
 *                     Every division shown is a door into…
 *   • Dependencies  — the critical-dependencies dashboard: every curated
 *                     import dependency (materials, strategic families,
 *                     energy) in one sortable register, aggregated by
 *                     supplier country and by NACE division.
 *   • Division      — the deep-dive: pick ONE NACE Section C division and see
 *                     ALL its information in one place — trade balance and
 *                     split, the input–output chain (imported-input mix,
 *                     origins, destinations), foreign value added, curated
 *                     critical inputs, and the division's own import
 *                     dependencies and critical materials.
 *   • FIGARO data   — the full FIGARO input–output table, imported into the
 *                     MethodHub, with its own table viewer and analysis
 *                     dashboard (sub-page).
 *   • Methodology   — datasets, attribution concepts, formulas, limits.
 * Every number carries a source link; the statistical layers regenerate from
 * `scripts/fetch-trade-flows-io-data.mjs` and
 * `scripts/fetch-figaro-io-dataset.mjs` (see `./trade-data`).
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  DIVISION_TRADE,
  TRADE_BRANCH_COLORS,
  CRITICAL_MATERIALS,
  RISK_HOTSPOTS,
  SECTOR_IO_INPUTS,
  ENERGY_FEEDSTOCK_DEPENDENCY,
  HEADLINE_FACTS,
  REFERENCE_YEAR,
  LATEST_YEAR,
  TEC_YEARS,
  EUROSTAT_USE_TABLE,
  EUROSTAT_FIGARO_IMPORTS,
  EUROSTAT_FIGARO_EXPORTS,
  EUROSTAT_FIGARO_FVA,
  importOriginsFor,
  exportDestinationsFor,
  fvaFor,
  inputMixFor,
  isGroupedInIO,
  figaroIndustryFor,
  IO_GROUP_LABELS,
  IO_GROUP_SKEW_NOTES,
  type Source,
  type TecYear,
  type FigaroPartner,
} from './trade-data';
import TradeBalanceFigure from './TradeBalanceFigure';
import MethodologyPanel from './MethodologyPanel';
import DependenciesDashboard from './DependenciesDashboard';
import DependencyMap from './DependencyMap';

type View = 'overview' | 'dependencies' | 'division' | 'figaro' | 'method';

const VIEWS: { id: View; label: string; blurb: string }[] = [
  { id: 'overview', label: 'Overview', blurb: 'One summary dashboard — all 24 divisions' },
  { id: 'dependencies', label: 'Dependencies dashboard', blurb: 'Critical trade dependencies, in one place' },
  { id: 'division', label: 'Division deep-dive', blurb: 'Pick one division, see everything' },
  { id: 'figaro', label: 'FIGARO IO data', blurb: 'Full input–output table, hosted here' },
  { id: 'method', label: 'Methodology', blurb: 'Datasets, formulas, limits' },
];

const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));

/** Shorten long CPA product names for the input-mix bars. */
const shortProduct = (name: string) => {
  const cut = name.split(/[;,]| except /)[0].trim();
  return cut.length > 38 ? cut.slice(0, 37) + '…' : cut;
};

/** Does a free-text NACE reference ('C27/C29', '… (C20, C23)') mention this division? */
const mentionsDivision = (text: string, code: string) => new RegExp(`\\b${code}\\b`).test(text);

function SourceLink({ src }: { src: Source }) {
  return (
    <a
      href={src.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
      title={`${src.org} — ${src.title}${src.year ? ` (${src.year})` : ''}`}
    >
      {src.org}
      {src.year ? ` ${src.year}` : ''} ↗
    </a>
  );
}

function GroupBadge({ code }: { code: string }) {
  if (!isGroupedInIO(code)) return null;
  const group = figaroIndustryFor(code);
  return (
    <span
      className="rounded bg-grey-100 dark:bg-[var(--mh-bg)] px-1 py-0.5 text-[9px] font-semibold text-grey-500 dark:text-[var(--mh-muted)]"
      title={`The input–output layer publishes this division only as part of the group ${IO_GROUP_LABELS[group] ?? group}.`}
    >
      IO: {IO_GROUP_LABELS[group] ?? group}
    </span>
  );
}

export default function TradeFlowExplorer() {
  const [view, setView] = useState<View>('overview');
  const [division, setDivision] = useState<string>('C24');

  const openDivision = (code: string) => {
    setDivision(code);
    setView('division');
  };

  return (
    <div>
      {/* view switcher */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`rounded-lg border px-3 py-1.5 text-left transition ${
              view === v.id
                ? 'border-primary bg-surface-blue dark:bg-primary/15'
                : 'border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] hover:border-grey-400 dark:hover:border-[var(--mh-muted)]'
            }`}
          >
            <div className={`text-sm font-semibold ${view === v.id ? 'text-primary' : 'text-grey-800 dark:text-[var(--mh-fg)]'}`}>
              {v.label}
            </div>
            <div className="text-[10px] text-grey-500 dark:text-[var(--mh-muted)]">{v.blurb}</div>
          </button>
        ))}
      </div>

      {view === 'overview' && <OverviewDashboard onOpenDivision={openDivision} />}
      {view === 'dependencies' && <DependenciesDashboard onOpenDivision={openDivision} />}
      {view === 'division' && <DivisionProfile code={division} onSelect={setDivision} />}
      {view === 'figaro' && <FigaroTeaser />}
      {view === 'method' && <MethodologyPanel />}
    </div>
  );
}

/* ============================================================ OVERVIEW view */

function OverviewDashboard({ onOpenDivision }: { onOpenDivision: (code: string) => void }) {
  const [showIntra, setShowIntra] = useState(false);
  const [year, setYear] = useState<TecYear>(REFERENCE_YEAR);

  return (
    <div className="space-y-4">
      {/* headline stat strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {HEADLINE_FACTS.map((f) => (
          <div key={f.label} className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-3">
            <div className="text-2xl font-bold text-grey-900 dark:text-[var(--mh-fg)]">{f.value}</div>
            <div className="mt-0.5 text-xs font-semibold text-grey-700 dark:text-[var(--mh-muted)]">{f.label}</div>
            <div className="mt-1 text-[11px] leading-snug text-grey-500 dark:text-[var(--mh-muted)]">{f.detail}</div>
            <div className="mt-1 text-[10px]">
              <SourceLink src={f.src} />
            </div>
          </div>
        ))}
      </div>

      {/* trade balance — the door into the division deep-dive */}
      <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-grey-600 dark:text-[var(--mh-muted)]">
            EU-27 extra-EU imports (red) vs exports (colour by branch), € bn, {year}. Sorted by net balance.{' '}
            <span className="font-semibold text-primary">Click a division to open its full profile.</span>
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex overflow-hidden rounded border border-grey-200 dark:border-[var(--mh-border)] text-[11px]">
              {TEC_YEARS.map((y) => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  className={`px-2 py-0.5 font-semibold transition ${
                    year === y ? 'bg-primary text-white' : 'bg-white dark:bg-[var(--mh-card)] text-grey-600 dark:text-[var(--mh-muted)] hover:bg-grey-50 dark:hover:bg-[var(--mh-bg)]'
                  }`}
                  title={
                    y === REFERENCE_YEAR
                      ? 'Reference year — aligns with the input–output layer (FIGARO / use table)'
                      : 'Latest trade data; the IO layer still refers to 2023'
                  }
                >
                  {y}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-[11px] text-grey-600 dark:text-[var(--mh-muted)]">
              <input type="checkbox" checked={showIntra} onChange={(e) => setShowIntra(e.target.checked)} />
              show intra-EU
            </label>
          </div>
        </div>
        <TradeBalanceFigure selected={null} onSelect={onOpenDivision} showIntra={showIntra} year={year} />
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-grey-500 dark:text-[var(--mh-muted)]">
          {Object.entries(TRADE_BRANCH_COLORS).map(([b, c]) => (
            <span key={b} className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* import-dependency map */}
      <DependencyMap />

      {/* critical materials */}
      <MaterialsView />
    </div>
  );
}

/* ==================================================== DIVISION deep-dive view */

function DivisionProfile({ code, onSelect }: { code: string; onSelect: (c: string) => void }) {
  const [year, setYear] = useState<TecYear>(REFERENCE_YEAR);

  const div = DIVISION_TRADE.find((d) => d.code === code);
  const io = SECTOR_IO_INPUTS.find((s) => s.code === code);
  const fva = fvaFor(code);
  const mix = inputMixFor(code);
  const origins = importOriginsFor(code);
  const destinations = exportDestinationsFor(code);
  const skew = IO_GROUP_SKEW_NOTES[code];
  const materials = CRITICAL_MATERIALS.filter((m) => mentionsDivision(m.usedIn, code));
  const risks = RISK_HOTSPOTS.filter((h) => mentionsDivision(h.naceDivision, code));
  const energy = ENERGY_FEEDSTOCK_DEPENDENCY.filter((e) => mentionsDivision(e.naceRelevance, code));

  if (!div) return null;

  const color = TRADE_BRANCH_COLORS[div.branch];
  const f = div.flows[year];
  const fRef = div.flows[REFERENCE_YEAR];
  const fLatest = div.flows[LATEST_YEAR];
  const netExt = f.expExt - f.impExt;
  const netDelta = fLatest.expExt - fLatest.impExt - (fRef.expExt - fRef.impExt);
  const totalTrade = f.impExt + f.expExt + f.impInt + f.expInt;
  const extraShare = totalTrade > 0 ? ((f.impExt + f.expExt) / totalTrade) * 100 : 0;
  const outExtra = fRef.expExt;
  const outIntra = fRef.expInt;
  const outTotal = outExtra + outIntra;
  const maxInput = mix?.topImported[0]?.valueBn ?? 1;

  const tradeBar = (label: string, extra: number, intra: number, extraColor: string) => {
    const w = (v: number) => `${(v / Math.max(f.impExt + f.impInt, f.expExt + f.expInt, 1)) * 100}%`;
    return (
      <div className="mb-1.5">
        <div className="flex justify-between text-[10px] text-grey-500 dark:text-[var(--mh-muted)]">
          <span>{label}</span>
          <span>
            extra €{fmt(extra)}bn · intra €{fmt(intra)}bn
          </span>
        </div>
        <div className="flex h-3 overflow-hidden rounded bg-grey-100 dark:bg-[var(--mh-bg)]">
          <div style={{ width: w(extra), background: extraColor }} />
          <div style={{ width: w(intra), background: extraColor, opacity: 0.35 }} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* division picker */}
      <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-3">
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-xs text-grey-500 dark:text-[var(--mh-muted)]">Section C division:</span>
          {DIVISION_TRADE.map((d) => (
            <button
              key={d.code}
              onClick={() => onSelect(d.code)}
              title={d.label}
              className={`rounded border px-1.5 py-0.5 text-[11px] transition ${
                d.code === code
                  ? 'border-primary bg-surface-blue dark:bg-primary/15 font-semibold text-primary'
                  : 'border-grey-200 dark:border-[var(--mh-border)] text-grey-600 dark:text-[var(--mh-muted)] hover:border-grey-400 dark:hover:border-[var(--mh-muted)]'
              }`}
            >
              {d.code}
            </button>
          ))}
        </div>
      </div>

      {/* header + KPIs */}
      <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: color }}>
              {div.code}
            </span>
            <h3 className="text-lg font-bold text-grey-900 dark:text-[var(--mh-fg)]">{div.label}</h3>
            <GroupBadge code={div.code} />
          </div>
          <div className="flex overflow-hidden rounded border border-grey-200 dark:border-[var(--mh-border)] text-[11px]">
            {TEC_YEARS.map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-2 py-0.5 font-semibold transition ${
                  year === y ? 'bg-primary text-white' : 'bg-white dark:bg-[var(--mh-card)] text-grey-600 dark:text-[var(--mh-muted)] hover:bg-grey-50 dark:hover:bg-[var(--mh-bg)]'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1.5 max-w-text text-xs leading-snug text-grey-600 dark:text-[var(--mh-muted)]">{div.note}</p>

        <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          <div className="rounded bg-grey-50 dark:bg-[var(--mh-bg)] p-2">
            <div className={`text-base font-bold ${netExt >= 0 ? 'text-secondary' : 'text-accent-red'}`}>
              {netExt >= 0 ? '+' : ''}€{fmt(netExt)}bn
            </div>
            <div className="text-[9px] text-grey-500 dark:text-[var(--mh-muted)]">extra-EU balance {year}</div>
          </div>
          <div className="rounded bg-grey-50 dark:bg-[var(--mh-bg)] p-2">
            <div className="text-base font-bold text-grey-800 dark:text-[var(--mh-fg)]">{extraShare.toFixed(0)}%</div>
            <div className="text-[9px] text-grey-500 dark:text-[var(--mh-muted)]">extra-EU share of trade</div>
          </div>
          <div className="rounded bg-grey-50 dark:bg-[var(--mh-bg)] p-2">
            <div className="text-base font-bold text-grey-800 dark:text-[var(--mh-fg)]">{mix ? `${mix.importedShare.toFixed(0)}%` : '—'}</div>
            <div className="text-[9px] text-grey-500 dark:text-[var(--mh-muted)]">inputs imported (IO, {REFERENCE_YEAR})</div>
          </div>
          <div className="rounded bg-grey-50 dark:bg-[var(--mh-bg)] p-2">
            <div className="text-base font-bold text-grey-800 dark:text-[var(--mh-fg)]">{fva ? `${fva.fvaPct}%` : '—'}</div>
            <div className="text-[9px] text-grey-500 dark:text-[var(--mh-muted)]">foreign value added in exports</div>
          </div>
        </div>

        <div className="mt-3 max-w-xl">
          {tradeBar('Imports', f.impExt, f.impInt, '#B83230')}
          {tradeBar('Exports', f.expExt, f.expInt, color)}
          <p className="text-[9px] text-grey-400 dark:text-[var(--mh-muted)]">
            Solid = extra-EU · faded = intra-EU. {REFERENCE_YEAR}→{LATEST_YEAR} extra-EU balance:{' '}
            {netDelta >= 0 ? '+' : ''}€{fmt(netDelta)}bn (current prices — price and volume effects mixed).
            Source: Eurostat ext_tec01, {year} (enterprise-based — see Methodology).
          </p>
        </div>

        {fva && (
          <div className="mt-3 max-w-xl rounded bg-surface-blue dark:bg-primary/15 p-2 text-[11px] text-grey-700 dark:text-[var(--mh-muted)]">
            <span className="font-semibold">Foreign value added in exports: {fva.fvaPct}%</span> (FIGARO{' '}
            {REFERENCE_YEAR})
            {fva.origins.length > 0 && (
              <>
                {' '}
                — of which{' '}
                {fva.origins
                  .filter((o) => o.code !== 'WRL_REST')
                  .slice(0, 3)
                  .map((o) => `${o.name} ${o.pctOfExports.toFixed(1)}pp`)
                  .join(', ')}
              </>
            )}
            . <SourceLink src={EUROSTAT_FIGARO_FVA} />
          </div>
        )}
      </div>

      {/* the input–output chain */}
      <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-4">
        <h4 className="mb-3 text-sm font-bold text-grey-900 dark:text-[var(--mh-fg)]">The input–output chain</h4>
        <div className="grid gap-3 md:grid-cols-[1.15fr_auto_1fr] md:items-stretch">
          {/* INPUTS */}
          <div className="rounded-lg border border-accent-red/30 bg-surface-orange/40 dark:bg-accent-red/10 p-3">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-accent-red">
              ◄ Imported inputs (what, how much, from where)
            </div>

            {mix && mix.intermediateInputsBn > 0 && (
              <div className="mb-3 rounded bg-white/80 dark:bg-[var(--mh-card)]/80 p-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-semibold text-grey-800 dark:text-[var(--mh-fg)]">
                    Imported intermediate inputs (IO use table, {REFERENCE_YEAR})
                  </span>
                  <span className="text-sm font-bold text-accent-red">{mix.importedShare}%</span>
                </div>
                <div className="text-[10px] text-grey-500 dark:text-[var(--mh-muted)]">
                  €{fmt(mix.importedInputsBn)}bn of €{fmt(mix.intermediateInputsBn)}bn total inputs
                </div>
                <div className="mt-2 space-y-1">
                  {mix.topImported.slice(0, 6).map((t) => (
                    <div key={t.product} className="flex items-center gap-1.5">
                      <span className="w-40 shrink-0 truncate text-[10px] text-grey-700 dark:text-[var(--mh-muted)]" title={t.name}>
                        {shortProduct(t.name)}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-sm bg-grey-100 dark:bg-[var(--mh-bg)]">
                        <div
                          className="h-full bg-accent-red/80"
                          style={{ width: `${(t.valueBn / maxInput) * 100}%` }}
                        />
                      </div>
                      <span className="w-14 shrink-0 text-right text-[9px] font-semibold text-grey-600 dark:text-[var(--mh-muted)]">
                        €{fmt(t.valueBn)}bn
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-1 text-[9px]">
                  <SourceLink src={EUROSTAT_USE_TABLE} />
                </div>
              </div>
            )}

            {origins && origins.partners.length > 0 && (
              <div className="mb-3 rounded bg-white/80 dark:bg-[var(--mh-card)]/80 p-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-grey-500 dark:text-[var(--mh-muted)]">
                  Import origins of this division&apos;s products (FIGARO, {REFERENCE_YEAR})
                </div>
                <div className="mt-1">
                  <PartnerColumn title="" partners={origins.partners} accent="#B83230" />
                </div>
                <p className="mt-1 text-[9px] leading-snug text-grey-400 dark:text-[var(--mh-muted)]">
                  {skew ? skew + ' ' : ''}
                  <SourceLink src={EUROSTAT_FIGARO_IMPORTS} />
                </p>
              </div>
            )}

            {io && (
              <>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-grey-500 dark:text-[var(--mh-muted)]">
                  Named critical inputs (curated layer)
                </div>
                <ul className="space-y-2">
                  {io.inputs.map((inp) => (
                    <li key={inp.name} className="rounded bg-white/70 dark:bg-[var(--mh-card)]/70 p-2">
                      <div className="text-xs font-semibold text-grey-800 dark:text-[var(--mh-fg)]">{inp.name}</div>
                      <div className="text-[11px] text-grey-600 dark:text-[var(--mh-muted)]">{inp.suppliers}</div>
                      <div className="text-[9px]">
                        <SourceLink src={inp.src} />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* SECTOR NODE */}
          <div className="flex flex-col items-center justify-center gap-2 px-2">
            <div className="hidden text-2xl text-grey-300 dark:text-[var(--mh-muted)] md:block">→</div>
            <div className="rounded-xl px-4 py-3 text-center text-white shadow" style={{ background: color }}>
              <div className="text-xs font-bold">{div.code}</div>
              <div className="text-sm font-semibold">{div.label}</div>
              {mix && mix.intermediateInputsBn > 0 && (
                <div className="mt-1 text-[10px] opacity-90">€{fmt(mix.intermediateInputsBn)}bn inputs consumed</div>
              )}
              {fva && <div className="mt-0.5 text-[10px] opacity-90">{fva.fvaPct}% foreign value added in exports</div>}
            </div>
            <div className="hidden text-2xl text-grey-300 dark:text-[var(--mh-muted)] md:block">→</div>
          </div>

          {/* OUTPUTS */}
          <div className="rounded-lg border border-secondary/30 bg-surface-green/60 dark:bg-secondary/15 p-3">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-secondary">
              Where the output sells ►
            </div>
            <div className="space-y-3">
              <FlowBar label="Intra-EU exports (to other member states)" value={outIntra} total={outTotal} color="#00928F" />
              <FlowBar label="Extra-EU exports (to the world)" value={outExtra} total={outTotal} color="#007B6C" />
            </div>
            {destinations && destinations.partners.length > 0 && (
              <div className="mt-3">
                <div className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-grey-500 dark:text-[var(--mh-muted)]">
                  Top extra-EU destinations (FIGARO, {REFERENCE_YEAR})
                </div>
                <PartnerColumn title="" partners={destinations.partners} accent={color} />
                <div className="mt-1 text-[9px]">
                  <SourceLink src={EUROSTAT_FIGARO_EXPORTS} />
                </div>
              </div>
            )}
            <p className="mt-3 text-[10px] leading-snug text-grey-500 dark:text-[var(--mh-muted)]">
              Split of observed exports, € bn, {REFERENCE_YEAR}. Extra-EU €{fmt(outExtra)}bn vs intra-EU €
              {fmt(outIntra)}bn. Domestic own-use is not shown (not a trade flow). Source: Eurostat ext_tec01.
            </p>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-snug text-grey-500 dark:text-[var(--mh-muted)]">
          Reads left→right as an input–output chain: the imported-input mix straight from the EU-27 use
          table, the origin countries of those imports (FIGARO), the named critical materials below the
          2-digit radar (curated) — and where the output goes. Attribution concepts differ by design — see
          the Methodology view.
        </p>
      </div>

      {/* division-specific dependencies */}
      {(materials.length > 0 || risks.length > 0 || energy.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {(materials.length > 0 || energy.length > 0) && (
            <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-4">
              <h4 className="text-sm font-bold text-grey-900 dark:text-[var(--mh-fg)]">Critical materials &amp; feedstocks used by {div.code}</h4>
              <p className="mt-1 text-[11px] text-grey-500 dark:text-[var(--mh-muted)]">
                Curated EC/JRC layer, filtered to this division. Bar = dominant supplier&apos;s share of EU
                supply.
              </p>
              <div className="mt-2 space-y-1.5">
                {materials.map((m) => {
                  const share = m.supplierShare ?? 0;
                  const china = /china/i.test(m.topSupplier);
                  return (
                    <div key={m.material} className="grid grid-cols-[150px_1fr] items-center gap-2">
                      <div className="text-[11px] font-medium text-grey-800 dark:text-[var(--mh-fg)]" title={`${m.usedIn} — ${m.note}`}>
                        {m.material}
                        {m.strategic && <span className="ml-1 text-[8px] font-bold text-[#7A4400] dark:text-[#FFB366]">SRM</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-4 flex-1 overflow-hidden rounded bg-grey-100 dark:bg-[var(--mh-bg)]">
                          <div
                            className="flex h-full items-center justify-end pr-1 text-[9px] font-bold text-white"
                            style={{ width: `${Math.max(share, 12)}%`, background: china ? '#B83230' : '#004B7F' }}
                          >
                            {share ? `${share}%` : 'n/a'}
                          </div>
                        </div>
                        <div className="w-24 shrink-0 text-[10px] text-grey-600 dark:text-[var(--mh-muted)]">{m.topSupplier}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {energy.length > 0 && (
                <ul className="mt-3 space-y-2 border-t border-grey-100 dark:border-[var(--mh-border)] pt-2">
                  {energy.map((e) => (
                    <li key={e.item}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[11px] font-semibold text-grey-800 dark:text-[var(--mh-fg)]">
                          {e.item} <span className="font-normal text-grey-400 dark:text-[var(--mh-muted)]">({e.year})</span>
                        </span>
                        {e.dependencyPct != null && (
                          <span className="text-sm font-bold text-accent-red">{e.dependencyPct}%</span>
                        )}
                      </div>
                      <div className="text-[10px] leading-snug text-grey-500 dark:text-[var(--mh-muted)]">
                        {e.note} <SourceLink src={e.src} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {materials.length === 0 && energy.length === 0 && (
                <p className="mt-2 text-[11px] text-grey-500 dark:text-[var(--mh-muted)]">No curated material dependency mapped to this division.</p>
              )}
            </div>
          )}

          {risks.length > 0 && (
            <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-4">
              <h4 className="text-sm font-bold text-grey-900 dark:text-[var(--mh-fg)]">Import dependencies touching {div.code}</h4>
              <p className="mt-1 text-[11px] text-grey-500 dark:text-[var(--mh-muted)]">
                From the import-dependency map (import reliance × supplier concentration) — this
                division&apos;s entries.
              </p>
              <ul className="mt-2 space-y-2">
                {risks.map((h) => (
                  <li key={h.label} className="rounded bg-grey-50 dark:bg-[var(--mh-bg)] p-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] font-semibold text-grey-800 dark:text-[var(--mh-fg)]">{h.label}</span>
                      <span className="shrink-0 text-[10px] text-grey-600 dark:text-[var(--mh-muted)]">{h.supplier}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-grey-600 dark:text-[var(--mh-muted)]">
                      <span>reliance {(h.importReliance * 100).toFixed(0)}%</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-sm bg-grey-200 dark:bg-[var(--mh-border)]">
                        <div className="h-full bg-accent-red/80" style={{ width: `${h.importReliance * 100}%` }} />
                      </div>
                      <span>concentration {(h.supplierConcentration * 100).toFixed(0)}%</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-sm bg-grey-200 dark:bg-[var(--mh-border)]">
                        <div className="h-full bg-primary/80" style={{ width: `${h.supplierConcentration * 100}%` }} />
                      </div>
                    </div>
                    <div className="mt-0.5 text-[9px]">
                      <SourceLink src={h.src} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-surface-blue/60 dark:bg-primary/15 p-3 text-[12px] text-grey-700 dark:text-[var(--mh-muted)]">
        Want the raw numbers behind this profile? The full FIGARO input–output matrix (this division is
        industry <span className="font-mono font-semibold">{figaroIndustryFor(code)}</span>{' '}
        in the A*64 classification) is hosted on the MethodHub —{' '}
        <Link href="/beta/overview-industry/trade-flows/figaro" className="font-semibold text-primary hover:underline">
          open the table viewer &amp; analysis dashboard →
        </Link>
      </div>
    </div>
  );
}

/* ======================================================== FIGARO teaser view */

function FigaroTeaser() {
  return (
    <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded border border-primary-lighter bg-surface-blue dark:bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          naio_10_fcp_ii4 · 2022–2023
        </span>
        <span className="rounded bg-grey-200 dark:bg-[var(--mh-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-tertiary">
          Hosted on the MethodHub
        </span>
      </div>
      <h3 className="mt-2 text-lg font-bold text-grey-900 dark:text-[var(--mh-fg)]">The full FIGARO input–output table lives here now</h3>
      <p className="mt-2 max-w-text text-sm text-grey-600 dark:text-[var(--mh-muted)]">
        The complete Eurostat FIGARO inter-country input–output table (~11 million cells, industry by
        industry) is imported by <code className="rounded bg-grey-100 dark:bg-[var(--mh-bg)] px-1 text-[12px]">scripts/fetch-figaro-io-dataset.mjs</code>{' '}
        and condensed to the EU-27 as one economy: 64 supplying industries + value added × 64 using
        industries + final demand, for intra-EU supply and each of the 23 extra-EU partner areas. The JSON is
        committed to this repository and served from this site — browsable as a filterable{' '}
        <span className="font-semibold">table viewer</span> and an{' '}
        <span className="font-semibold">analysis dashboard</span> (import dependence of every industry, who
        supplies the EU, the largest imported flows, export destinations), with CSV export of any slice.
      </p>
      <Link
        href="/beta/overview-industry/trade-flows/figaro"
        className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
      >
        Open the FIGARO explorer →
      </Link>
    </div>
  );
}

/* ---------------------------------------------------------- shared sub-parts */

function PartnerColumn({ title, partners, accent }: { title: string; partners: FigaroPartner[]; accent: string }) {
  const shown = partners.slice(0, 5);
  const max = Math.max(...shown.map((p) => p.pctOfExtra), 1);
  return (
    <div className="rounded bg-grey-50 dark:bg-[var(--mh-bg)] p-1.5">
      {title && (
        <div className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-grey-500 dark:text-[var(--mh-muted)]">{title}</div>
      )}
      <div className="space-y-1">
        {shown.map((p) => (
          <div key={p.code} className="flex items-center gap-1">
            <span className="w-16 shrink-0 truncate text-[10px] text-grey-700 dark:text-[var(--mh-muted)]" title={p.name}>
              {p.name}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-sm bg-grey-200 dark:bg-[var(--mh-border)]">
              <div style={{ width: `${(p.pctOfExtra / max) * 100}%`, background: accent }} className="h-full" />
            </div>
            <span className="w-8 shrink-0 text-right text-[9px] font-semibold text-grey-600 dark:text-[var(--mh-muted)]">{p.pctOfExtra}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlowBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-[11px] text-grey-600 dark:text-[var(--mh-muted)]">
        <span>{label}</span>
        <span className="font-semibold">{pct.toFixed(0)}%</span>
      </div>
      <div className="mt-0.5 h-4 overflow-hidden rounded bg-white dark:bg-[var(--mh-card)]">
        <div className="flex h-full items-center justify-end pr-1 text-[9px] font-bold text-white" style={{ width: `${Math.max(pct, 8)}%`, background: color }}>
          €{fmt(value)}bn
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- materials view */

function MaterialsView() {
  const rows = [...CRITICAL_MATERIALS].sort((a, b) => (b.supplierShare ?? 0) - (a.supplierShare ?? 0));
  const isChina = (s: string) => /china/i.test(s);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-4">
        <h4 className="text-sm font-bold text-grey-900 dark:text-[var(--mh-fg)]">Critical materials — who the EU depends on</h4>
        <p className="mb-3 mt-1 text-xs text-grey-600 dark:text-[var(--mh-muted)]">
          Critical &amp; strategic raw materials the EU manufactures with but barely produces, ranked by the
          dominant supplier&apos;s share of EU supply. The bar is that supplier&apos;s share; the label names
          the country. China (red) holds a commanding share of most of them.
        </p>
        <div className="space-y-1.5">
          {rows.map((m) => {
            const share = m.supplierShare ?? 0;
            const china = isChina(m.topSupplier);
            return (
              <div key={m.material} className="grid grid-cols-[150px_1fr] items-center gap-2">
                <div className="text-[11px] font-medium text-grey-800 dark:text-[var(--mh-fg)]" title={m.usedIn}>
                  {m.material}
                  {m.strategic && <span className="ml-1 text-[8px] font-bold text-[#7A4400] dark:text-[#FFB366]">SRM</span>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 flex-1 overflow-hidden rounded bg-grey-100 dark:bg-[var(--mh-bg)]">
                    <div
                      className="flex h-full items-center justify-end pr-1 text-[9px] font-bold text-white"
                      style={{ width: `${Math.max(share, 12)}%`, background: china ? '#B83230' : '#004B7F' }}
                    >
                      {share ? `${share}%` : 'n/a'}
                    </div>
                  </div>
                  <div className="w-24 shrink-0 text-[10px] text-grey-600 dark:text-[var(--mh-muted)]">{m.topSupplier}</div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[10px] text-grey-400 dark:text-[var(--mh-muted)]">
          SRM = Strategic Raw Material under the Critical Raw Materials Act (Reg. (EU) 2024/1252). Share = of
          EU supply (sourcing stage), as reported by the EC/JRC; customs trade shares differ.
        </p>
      </div>

      {/* energy / feedstock side panel */}
      <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-4">
        <h4 className="text-sm font-bold text-grey-900 dark:text-[var(--mh-fg)]">Energy &amp; feedstock reliance</h4>
        <p className="mt-1 text-[11px] text-grey-600 dark:text-[var(--mh-muted)]">
          The other input dependency — behind refining (C19) and chemicals (C20). Live Eurostat{' '}
          <code className="rounded bg-grey-100 dark:bg-[var(--mh-bg)] px-1 text-[10px]">nrg_ind_id</code> values.
        </p>
        <ul className="mt-3 space-y-2.5">
          {ENERGY_FEEDSTOCK_DEPENDENCY.map((e) => (
            <li key={e.item}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-semibold text-grey-800 dark:text-[var(--mh-fg)]">
                  {e.item} <span className="font-normal text-grey-400 dark:text-[var(--mh-muted)]">({e.year})</span>
                </span>
                {e.dependencyPct != null && (
                  <span className="text-sm font-bold text-accent-red">{e.dependencyPct}%</span>
                )}
              </div>
              <div className="text-[10px] leading-snug text-grey-500 dark:text-[var(--mh-muted)]">
                {e.note} <SourceLink src={e.src} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
