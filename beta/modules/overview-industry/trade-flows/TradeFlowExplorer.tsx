'use client';

/**
 * Overview Industry — Trade flows — the explorer.
 * -----------------------------------------------
 * ONE interactive figure for the whole page, in five linked views:
 *   • Balance     — diverging bars of extra-EU imports vs exports for all 24
 *                   NACE Section C divisions (Eurostat ext_tec01, 2023/2024
 *                   toggle), with a detail drawer per division.
 *   • Supply      — the input–output chain: the division's REAL imported-input
 *                   mix from the EU-27 use table (which products, € bn, share
 *                   imported), import origins from FIGARO, the curated
 *                   critical-materials layer, and where the output sells.
 *   • Risk        — the high-risk quadrant: import reliance × supplier
 *                   concentration; the top-right corner is where a single
 *                   foreign supplier can choke an EU value chain.
 *   • Materials   — critical raw materials by EU import reliance & dominant
 *                   supplier (the China-concentration story, laid bare).
 *   • Methodology — the full method write-up: datasets, attribution concepts,
 *                   formulas, consistency gaps, reproducibility.
 * Every number carries a source link; the statistical layers regenerate from
 * `scripts/fetch-trade-flows-io-data.mjs` (see `./trade-data`).
 */

import { useState } from 'react';
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
  type DivisionTrade,
  type TecYear,
  type FigaroPartner,
} from './trade-data';
import TradeBalanceFigure from './TradeBalanceFigure';
import MethodologyPanel from './MethodologyPanel';

type View = 'balance' | 'supply' | 'risk' | 'materials' | 'method';

const VIEWS: { id: View; label: string; blurb: string }[] = [
  { id: 'balance', label: 'Trade balance', blurb: 'Imports vs exports, all 24 divisions' },
  { id: 'supply', label: 'Supply chains', blurb: 'Input → sector → output flows' },
  { id: 'risk', label: 'Import-risk map', blurb: 'Reliance × supplier concentration' },
  { id: 'materials', label: 'Critical materials', blurb: 'Who the EU depends on' },
  { id: 'method', label: 'Methodology', blurb: 'Datasets, formulas, limits' },
];

const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));

/** Shorten long CPA product names for the input-mix bars. */
const shortProduct = (name: string) => {
  const cut = name.split(/[;,]| except /)[0].trim();
  return cut.length > 38 ? cut.slice(0, 37) + '…' : cut;
};

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
      className="rounded bg-grey-100 px-1 py-0.5 text-[9px] font-semibold text-grey-500"
      title={`The input–output layer publishes this division only as part of the group ${IO_GROUP_LABELS[group] ?? group}.`}
    >
      IO: {IO_GROUP_LABELS[group] ?? group}
    </span>
  );
}

export default function TradeFlowExplorer() {
  const [view, setView] = useState<View>('balance');
  const [showIntra, setShowIntra] = useState(false);
  const [year, setYear] = useState<TecYear>(REFERENCE_YEAR);
  const [selected, setSelected] = useState<string | null>('C19');
  const [supplyCode, setSupplyCode] = useState<string>('C24');

  const sel = DIVISION_TRADE.find((d) => d.code === selected) ?? null;

  return (
    <div>
      {/* headline stat strip */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {HEADLINE_FACTS.map((f) => (
          <div key={f.label} className="rounded-lg border border-grey-200 bg-white p-3">
            <div className="text-2xl font-bold text-grey-900">{f.value}</div>
            <div className="mt-0.5 text-xs font-semibold text-grey-700">{f.label}</div>
            <div className="mt-1 text-[11px] leading-snug text-grey-500">{f.detail}</div>
            <div className="mt-1 text-[10px]">
              <SourceLink src={f.src} />
            </div>
          </div>
        ))}
      </div>

      {/* view switcher */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`rounded-lg border px-3 py-1.5 text-left transition ${
              view === v.id
                ? 'border-primary bg-surface-blue'
                : 'border-grey-200 bg-white hover:border-grey-400'
            }`}
          >
            <div className={`text-sm font-semibold ${view === v.id ? 'text-primary' : 'text-grey-800'}`}>
              {v.label}
            </div>
            <div className="text-[10px] text-grey-500">{v.blurb}</div>
          </button>
        ))}
      </div>

      {/* ============================================ BALANCE view */}
      {view === 'balance' && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-lg border border-grey-200 bg-white p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-grey-600">
                EU-27 extra-EU imports (red) vs exports (colour by branch), € bn, {year}. Sorted by net
                balance — top = biggest surplus, bottom = deficit. Click a bar for detail.
              </p>
              <div className="flex shrink-0 items-center gap-3">
                <div className="flex overflow-hidden rounded border border-grey-200 text-[11px]">
                  {TEC_YEARS.map((y) => (
                    <button
                      key={y}
                      onClick={() => setYear(y)}
                      className={`px-2 py-0.5 font-semibold transition ${
                        year === y ? 'bg-primary text-white' : 'bg-white text-grey-600 hover:bg-grey-50'
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
                <label className="flex items-center gap-1.5 text-[11px] text-grey-600">
                  <input
                    type="checkbox"
                    checked={showIntra}
                    onChange={(e) => setShowIntra(e.target.checked)}
                  />
                  show intra-EU
                </label>
              </div>
            </div>
            <TradeBalanceFigure selected={selected} onSelect={setSelected} showIntra={showIntra} year={year} />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-grey-500">
              {Object.entries(TRADE_BRANCH_COLORS).map(([b, c]) => (
                <span key={b} className="inline-flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
                  {b}
                </span>
              ))}
            </div>
          </div>
          <DivisionDetail div={sel} year={year} onOpenSupply={(c) => { setSupplyCode(c); setView('supply'); }} />
        </div>
      )}

      {/* ============================================ SUPPLY view */}
      {view === 'supply' && (
        <SupplyChainView code={supplyCode} onSelect={setSupplyCode} />
      )}

      {/* ============================================ RISK view */}
      {view === 'risk' && <RiskQuadrant />}

      {/* ============================================ MATERIALS view */}
      {view === 'materials' && <MaterialsView />}

      {/* ============================================ METHODOLOGY view */}
      {view === 'method' && <MethodologyPanel />}
    </div>
  );
}

/* ----------------------------------------------------- division detail drawer */

function DivisionDetail({
  div,
  year,
  onOpenSupply,
}: {
  div: DivisionTrade | null;
  year: TecYear;
  onOpenSupply: (code: string) => void;
}) {
  if (!div) {
    return (
      <div className="rounded-lg border border-dashed border-grey-300 bg-grey-50 p-4 text-sm text-grey-500">
        Click a division to see its intra/extra-EU split, net balance and dependency story.
      </div>
    );
  }
  const f = div.flows[year];
  const fPrev = div.flows[REFERENCE_YEAR];
  const fLatest = div.flows[LATEST_YEAR];
  const netExt = f.expExt - f.impExt;
  const netDelta = fLatest.expExt - fLatest.impExt - (fPrev.expExt - fPrev.impExt);
  const totalTrade = f.impExt + f.expExt + f.impInt + f.expInt;
  const extraShare = totalTrade > 0 ? ((f.impExt + f.expExt) / totalTrade) * 100 : 0;
  const io = SECTOR_IO_INPUTS.find((s) => s.code === div.code);
  const fva = fvaFor(div.code);
  const mix = inputMixFor(div.code);
  const origins = importOriginsFor(div.code);
  const destinations = exportDestinationsFor(div.code);
  const skew = IO_GROUP_SKEW_NOTES[div.code];
  const color = TRADE_BRANCH_COLORS[div.branch];

  const bar = (label: string, extra: number, intra: number, extraColor: string) => {
    const w = (v: number) => `${(v / (f.impExt + f.impInt + f.expExt + f.expInt)) * 100}%`;
    return (
      <div className="mb-1.5">
        <div className="flex justify-between text-[10px] text-grey-500">
          <span>{label}</span>
          <span>
            extra €{fmt(extra)}bn · intra €{fmt(intra)}bn
          </span>
        </div>
        <div className="flex h-3 overflow-hidden rounded bg-grey-100">
          <div style={{ width: w(extra), background: extraColor }} />
          <div style={{ width: w(intra), background: extraColor, opacity: 0.35 }} />
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-grey-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: color }}>
          {div.code}
        </span>
        <h3 className="text-base font-bold text-grey-900">{div.label}</h3>
        <GroupBadge code={div.code} />
      </div>
      <p className="mt-1.5 text-xs leading-snug text-grey-600">{div.note}</p>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded bg-grey-50 p-1.5">
          <div className={`text-sm font-bold ${netExt >= 0 ? 'text-secondary' : 'text-accent-red'}`}>
            {netExt >= 0 ? '+' : ''}€{fmt(netExt)}bn
          </div>
          <div className="text-[9px] text-grey-500">extra-EU balance {year}</div>
        </div>
        <div className="rounded bg-grey-50 p-1.5">
          <div className="text-sm font-bold text-grey-800">{extraShare.toFixed(0)}%</div>
          <div className="text-[9px] text-grey-500">extra-EU share of trade</div>
        </div>
        <div className="rounded bg-grey-50 p-1.5">
          <div className="text-sm font-bold text-grey-800">{mix ? `${mix.importedShare.toFixed(0)}%` : '—'}</div>
          <div className="text-[9px] text-grey-500">inputs imported (IO, 2023)</div>
        </div>
      </div>
      <p className="mt-1 text-[9px] text-grey-400">
        2023→2024 extra-EU balance: {netDelta >= 0 ? '+' : ''}€{fmt(netDelta)}bn (current prices — price and
        volume effects mixed).
      </p>

      <div className="mt-3">
        {bar('Imports', f.impExt, f.impInt, '#B83230')}
        {bar('Exports', f.expExt, f.expInt, color)}
        <p className="text-[9px] text-grey-400">
          Solid = extra-EU · faded = intra-EU. Source: Eurostat ext_tec01, {year} (enterprise-based — see
          Methodology).
        </p>
      </div>

      {fva && (
        <div className="mt-3 rounded bg-surface-blue p-2 text-[11px] text-grey-700">
          <span className="font-semibold">Foreign value added in exports: {fva.fvaPct}%</span> (FIGARO 2023)
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

      {origins && destinations && (
        <div className="mt-3">
          <div className="mb-1 text-[11px] font-semibold text-grey-700">
            Extra-EU trade in this division&apos;s products (FIGARO, 2023)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <PartnerColumn title="Imports from" partners={origins.partners} accent="#B83230" />
            <PartnerColumn title="Exports to" partners={destinations.partners} accent={color} />
          </div>
          <p className="mt-1 text-[9px] leading-snug text-grey-400">
            Shares of extra-EU flows; FIGARO names 23 partners, the remainder is &quot;Rest of the
            world&quot;.{' '}
            {skew ? skew + ' ' : ''}
            <SourceLink src={EUROSTAT_FIGARO_IMPORTS} />
          </p>
        </div>
      )}

      {io && (
        <div className="mt-3">
          <div className="mb-1 text-[11px] font-semibold text-grey-700">Critical imported inputs (curated)</div>
          <ul className="space-y-1">
            {io.inputs.map((inp) => (
              <li key={inp.name} className="text-[11px] leading-snug text-grey-600">
                <span className="font-medium text-grey-800">{inp.name}</span> — {inp.suppliers}{' '}
                <SourceLink src={inp.src} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() => onOpenSupply(div.code)}
        className="mt-3 text-[11px] font-semibold text-primary hover:underline"
      >
        See the full input–output chain →
      </button>
    </div>
  );
}

/* ----------------------------------------------------------- supply-chain view */

function SupplyChainView({ code, onSelect }: { code: string; onSelect: (c: string) => void }) {
  const div = DIVISION_TRADE.find((d) => d.code === code);
  const io = SECTOR_IO_INPUTS.find((s) => s.code === code);
  const fva = fvaFor(code);
  const mix = inputMixFor(code);
  const origins = importOriginsFor(code);
  const destinations = exportDestinationsFor(code);

  if (!div) return null;

  // Output split: the trade-observed destination split (intra-EU vs extra-EU
  // exports); domestic own-use is not a trade flow and is not invented here.
  const f = div.flows[REFERENCE_YEAR];
  const outExtra = f.expExt;
  const outIntra = f.expInt;
  const outTotal = outExtra + outIntra;
  const maxInput = mix?.topImported[0]?.valueBn ?? 1;

  return (
    <div className="rounded-lg border border-grey-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-1">
        <span className="mr-1 text-xs text-grey-500">Division:</span>
        {DIVISION_TRADE.map((d) => (
          <button
            key={d.code}
            onClick={() => onSelect(d.code)}
            title={d.label}
            className={`rounded border px-1.5 py-0.5 text-[11px] transition ${
              d.code === code
                ? 'border-primary bg-surface-blue font-semibold text-primary'
                : 'border-grey-200 text-grey-600 hover:border-grey-400'
            }`}
          >
            {d.code}
          </button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold text-grey-900">
          {div.code} · {div.label}
        </h3>
        <GroupBadge code={div.code} />
      </div>

      <div className="grid gap-3 md:grid-cols-[1.15fr_auto_1fr] md:items-stretch">
        {/* INPUTS */}
        <div className="rounded-lg border border-accent-red/30 bg-surface-orange/40 p-3">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-accent-red">
            ◄ Imported inputs (what, how much, from where)
          </div>

          {mix && mix.intermediateInputsBn > 0 && (
            <div className="mb-3 rounded bg-white/80 p-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-semibold text-grey-800">
                  Imported intermediate inputs (IO use table, 2023)
                </span>
                <span className="text-sm font-bold text-accent-red">{mix.importedShare}%</span>
              </div>
              <div className="text-[10px] text-grey-500">
                €{fmt(mix.importedInputsBn)}bn of €{fmt(mix.intermediateInputsBn)}bn total inputs
              </div>
              <div className="mt-2 space-y-1">
                {mix.topImported.slice(0, 6).map((t) => (
                  <div key={t.product} className="flex items-center gap-1.5">
                    <span className="w-40 shrink-0 truncate text-[10px] text-grey-700" title={t.name}>
                      {shortProduct(t.name)}
                    </span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-sm bg-grey-100">
                      <div
                        className="h-full bg-accent-red/80"
                        style={{ width: `${(t.valueBn / maxInput) * 100}%` }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right text-[9px] font-semibold text-grey-600">
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
            <div className="mb-3 rounded bg-white/80 p-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-grey-500">
                Import origins of this division&apos;s products (FIGARO, 2023)
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {origins.partners.slice(0, 6).map((p) => (
                  <span key={p.code} className="rounded bg-white px-1.5 py-0.5 text-[10px] text-grey-700 shadow-sm">
                    {p.name} <span className="font-semibold text-accent-red">{p.pctOfExtra}%</span>
                  </span>
                ))}
              </div>
              <div className="mt-1 text-[9px]">
                <SourceLink src={EUROSTAT_FIGARO_IMPORTS} />
              </div>
            </div>
          )}

          {io && (
            <>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-grey-500">
                Named critical inputs (curated layer)
              </div>
              <ul className="space-y-2">
                {io.inputs.map((inp) => (
                  <li key={inp.name} className="rounded bg-white/70 p-2">
                    <div className="text-xs font-semibold text-grey-800">{inp.name}</div>
                    <div className="text-[11px] text-grey-600">{inp.suppliers}</div>
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
          <div className="hidden text-2xl text-grey-300 md:block">→</div>
          <div
            className="rounded-xl px-4 py-3 text-center text-white shadow"
            style={{ background: TRADE_BRANCH_COLORS[div.branch] }}
          >
            <div className="text-xs font-bold">{div.code}</div>
            <div className="text-sm font-semibold">{div.label}</div>
            {mix && mix.intermediateInputsBn > 0 && (
              <div className="mt-1 text-[10px] opacity-90">€{fmt(mix.intermediateInputsBn)}bn inputs consumed</div>
            )}
            {fva && (
              <div className="mt-0.5 text-[10px] opacity-90">{fva.fvaPct}% foreign value added in exports</div>
            )}
          </div>
          <div className="hidden text-2xl text-grey-300 md:block">→</div>
        </div>

        {/* OUTPUTS */}
        <div className="rounded-lg border border-secondary/30 bg-surface-green/60 p-3">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-secondary">
            Where the output sells ►
          </div>
          <div className="space-y-3">
            <FlowBar label="Intra-EU exports (to other member states)" value={outIntra} total={outTotal} color="#00928F" />
            <FlowBar label="Extra-EU exports (to the world)" value={outExtra} total={outTotal} color="#007B6C" />
          </div>
          {destinations && destinations.partners.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-grey-500">
                Top extra-EU destinations (FIGARO, 2023)
              </div>
              <div className="flex flex-wrap gap-1">
                {destinations.partners.slice(0, 6).map((p) => (
                  <span key={p.code} className="rounded bg-white px-1.5 py-0.5 text-[10px] text-grey-700">
                    {p.name} <span className="font-semibold text-secondary">{p.pctOfExtra}%</span>
                  </span>
                ))}
              </div>
              <div className="mt-1 text-[9px]">
                <SourceLink src={EUROSTAT_FIGARO_EXPORTS} />
              </div>
            </div>
          )}
          <p className="mt-3 text-[10px] leading-snug text-grey-500">
            Split of observed exports, € bn, {REFERENCE_YEAR}. Extra-EU €{fmt(outExtra)}bn vs intra-EU €
            {fmt(outIntra)}bn. Domestic own-use is not shown (not a trade flow). Source: Eurostat ext_tec01.
          </p>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-grey-500">
        Reads left→right as an input–output chain. The red column stacks three depths of the{' '}
        <span className="font-semibold text-accent-red">input</span> side: the imported-input mix straight
        from the EU-27 use table (products and € bn), the origin countries of those imports (FIGARO), and
        the named critical materials below the 2-digit radar (curated). The green column is where the{' '}
        <span className="font-semibold text-secondary">output</span> goes. Attribution concepts differ by
        design — see the Methodology view.
      </p>
    </div>
  );
}

function PartnerColumn({ title, partners, accent }: { title: string; partners: FigaroPartner[]; accent: string }) {
  const shown = partners.slice(0, 5);
  const max = Math.max(...shown.map((p) => p.pctOfExtra), 1);
  return (
    <div className="rounded bg-grey-50 p-1.5">
      <div className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-grey-500">{title}</div>
      <div className="space-y-1">
        {shown.map((p) => (
          <div key={p.code} className="flex items-center gap-1">
            <span className="w-16 shrink-0 truncate text-[10px] text-grey-700" title={p.name}>
              {p.name}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-sm bg-grey-200">
              <div style={{ width: `${(p.pctOfExtra / max) * 100}%`, background: accent }} className="h-full" />
            </div>
            <span className="w-8 shrink-0 text-right text-[9px] font-semibold text-grey-600">{p.pctOfExtra}%</span>
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
      <div className="flex justify-between text-[11px] text-grey-600">
        <span>{label}</span>
        <span className="font-semibold">{pct.toFixed(0)}%</span>
      </div>
      <div className="mt-0.5 h-4 overflow-hidden rounded bg-white">
        <div className="flex h-full items-center justify-end pr-1 text-[9px] font-bold text-white" style={{ width: `${Math.max(pct, 8)}%`, background: color }}>
          €{fmt(value)}bn
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- risk quadrant */

function RiskQuadrant() {
  const W = 720;
  const H = 470;
  const M = { t: 20, r: 150, b: 50, l: 62 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const x = (v: number) => M.l + v * iw; // import reliance 0..1
  const y = (v: number) => M.t + (1 - v) * ih; // supplier concentration 0..1
  const isChina = (s: string) => /china/i.test(s);

  // jitter identical points deterministically so bubbles/labels don't stack
  const placed = RISK_HOTSPOTS.map((h, i) => ({
    ...h,
    px: x(h.importReliance) - (h.importReliance >= 0.995 ? (i % 3) * 10 : 0),
    py: y(h.supplierConcentration) + (h.supplierConcentration >= 0.995 ? (i % 2) * 11 : 0),
    flip: x(h.importReliance) > M.l + iw * 0.6,
  }));

  // anti-overlap for labels: within each side, push labels apart vertically and
  // draw a thin connector back to the bubble when a label is nudged.
  const LBL_GAP = 12;
  for (const side of [true, false]) {
    const grp = placed.filter((h) => h.flip === side).sort((a, b) => a.py - b.py) as (typeof placed[number] & { ly?: number })[];
    let lastY = -Infinity;
    for (const h of grp) {
      const want = h.py;
      h.ly = want - lastY < LBL_GAP ? lastY + LBL_GAP : want;
      lastY = h.ly;
    }
  }

  return (
    <div className="rounded-lg border border-grey-200 bg-white p-3">
      <p className="mb-2 text-xs text-grey-600">
        Every bubble is an import dependency of EU manufacturing. →right = more of EU demand is imported;
        ↑up = more concentrated in a single supplier. The shaded <span className="font-semibold text-accent-red">top-right</span>{' '}
        corner is the danger zone — near-total reliance on one country. Red = China-dominated.
      </p>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 560 }} role="img" aria-label="Import-risk quadrant">
          {/* danger zone */}
          <rect x={x(0.75)} y={y(1)} width={x(1) - x(0.75)} height={y(0.75) - y(1)} fill="#B83230" opacity={0.07} />
          <text x={x(0.995)} y={y(0.965)} textAnchor="end" fontSize={10} fontWeight={700} className="fill-accent-red" opacity={0.7}>
            HIGH-RISK ZONE
          </text>
          {/* grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={x(t)} y1={M.t} x2={x(t)} y2={M.t + ih} stroke="#EEF0F1" />
              <line x1={M.l} y1={y(t)} x2={M.l + iw} y2={y(t)} stroke="#EEF0F1" />
              <text x={x(t)} y={M.t + ih + 16} textAnchor="middle" fontSize={9} className="fill-grey-400">
                {(t * 100).toFixed(0)}%
              </text>
              <text x={M.l - 8} y={y(t) + 3} textAnchor="end" fontSize={9} className="fill-grey-400">
                {(t * 100).toFixed(0)}%
              </text>
            </g>
          ))}
          {/* axis titles */}
          <text x={M.l + iw / 2} y={H - 6} textAnchor="middle" fontSize={11} fontWeight={600} className="fill-grey-600">
            Import reliance — share of EU demand met by imports →
          </text>
          <text transform={`rotate(-90 14 ${M.t + ih / 2})`} x={14} y={M.t + ih / 2} textAnchor="middle" fontSize={11} fontWeight={600} className="fill-grey-600">
            Supplier concentration — largest single supplier ↑
          </text>

          {placed.map((h) => {
            const china = isChina(h.supplier);
            const ly = (h as typeof h & { ly?: number }).ly ?? h.py;
            const lx = h.flip ? h.px - 10 : h.px + 10;
            const label = h.label.length > 24 ? h.label.slice(0, 23) + '…' : h.label;
            return (
              <g key={h.label}>
                {Math.abs(ly - h.py) > 1 && (
                  <line x1={h.px} y1={h.py} x2={lx} y2={ly - 3} stroke="#CBD3DA" strokeWidth={0.75} />
                )}
                <circle cx={h.px} cy={h.py} r={7} fill={china ? '#B83230' : '#004B7F'} opacity={0.82} stroke="#fff" strokeWidth={1.5}>
                  <title>{`${h.label} — ${h.supplier}: reliance ${(h.importReliance * 100).toFixed(0)}%, concentration ${(h.supplierConcentration * 100).toFixed(0)}% (${h.naceDivision})`}</title>
                </circle>
                <text x={lx} y={ly} textAnchor={h.flip ? 'end' : 'start'} fontSize={9} className="fill-grey-700">
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-grey-500">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent-red" /> China-dominated supply
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" /> Other single supplier
        </span>
        <span>
          x-axis: EC import reliance, IR = (M−X)/(P+M−X); y-axis: largest supplier&apos;s share of EU supply
          (concentration proxy). Curated from EC/JRC sources — definitions &amp; caveats in Methodology.
        </span>
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
      <div className="rounded-lg border border-grey-200 bg-white p-4">
        <p className="mb-3 text-xs text-grey-600">
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
                <div className="text-[11px] font-medium text-grey-800" title={m.usedIn}>
                  {m.material}
                  {m.strategic && <span className="ml-1 text-[8px] font-bold text-accent-orange">SRM</span>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 flex-1 overflow-hidden rounded bg-grey-100">
                    <div
                      className="flex h-full items-center justify-end pr-1 text-[9px] font-bold text-white"
                      style={{ width: `${Math.max(share, 12)}%`, background: china ? '#B83230' : '#004B7F' }}
                    >
                      {share ? `${share}%` : 'n/a'}
                    </div>
                  </div>
                  <div className="w-24 shrink-0 text-[10px] text-grey-600">{m.topSupplier}</div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[10px] text-grey-400">
          SRM = Strategic Raw Material under the Critical Raw Materials Act (Reg. (EU) 2024/1252). Share = of
          EU supply (sourcing stage), as reported by the EC/JRC; customs trade shares differ.
        </p>
      </div>

      {/* energy / feedstock side panel */}
      <div className="rounded-lg border border-grey-200 bg-white p-4">
        <h3 className="text-sm font-bold text-grey-900">Energy &amp; feedstock reliance</h3>
        <p className="mt-1 text-[11px] text-grey-600">
          The other input dependency — behind refining (C19) and chemicals (C20). Live Eurostat{' '}
          <code className="rounded bg-grey-100 px-1 text-[10px]">nrg_ind_id</code> values.
        </p>
        <ul className="mt-3 space-y-2.5">
          {ENERGY_FEEDSTOCK_DEPENDENCY.map((e) => (
            <li key={e.item}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-semibold text-grey-800">
                  {e.item} <span className="font-normal text-grey-400">({e.year})</span>
                </span>
                {e.dependencyPct != null && (
                  <span className="text-sm font-bold text-accent-red">{e.dependencyPct}%</span>
                )}
              </div>
              <div className="text-[10px] leading-snug text-grey-500">
                {e.note} <SourceLink src={e.src} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
