'use client';

/**
 * Overview Industry — Trade flows — the explorer.
 * -----------------------------------------------
 * ONE interactive figure for the whole page, in four linked views:
 *   • Balance   — diverging bars of extra-EU imports vs exports for all 24
 *                 NACE Section C divisions (real Eurostat data), with a detail
 *                 drawer per division.
 *   • Supply    — an input→sector→output strip (mini-Sankey): imported inputs &
 *                 their origins, the sector, and where its output goes.
 *   • Risk      — the high-risk quadrant: import reliance × supplier
 *                 concentration; the top-right corner is where a single foreign
 *                 supplier can choke an EU value chain.
 *   • Materials — critical raw materials by EU import reliance & dominant
 *                 supplier (the China-concentration story, laid bare).
 * Every number carries a source link; the data lives in `./trade-data`.
 */

import { useState } from 'react';
import {
  DIVISION_TRADE,
  DIVISION_TRADE_TOTAL,
  TRADE_BRANCH_COLORS,
  CRITICAL_MATERIALS,
  RISK_HOTSPOTS,
  SECTOR_IO_INPUTS,
  SECTOR_IO_FVA,
  ENERGY_FEEDSTOCK_DEPENDENCY,
  HEADLINE_FACTS,
  partnersFor,
  PARTNER_SKEW_NOTES,
  type Source,
  type DivisionTrade,
  type PartnerShare,
} from './trade-data';
import TradeBalanceFigure from './TradeBalanceFigure';

type View = 'balance' | 'supply' | 'risk' | 'materials';

const VIEWS: { id: View; label: string; blurb: string }[] = [
  { id: 'balance', label: 'Trade balance', blurb: 'Imports vs exports, all 24 divisions' },
  { id: 'supply', label: 'Supply chains', blurb: 'Input → sector → output flows' },
  { id: 'risk', label: 'Import-risk map', blurb: 'Reliance × supplier concentration' },
  { id: 'materials', label: 'Critical materials', blurb: 'Who the EU depends on' },
];

const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));

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

export default function TradeFlowExplorer() {
  const [view, setView] = useState<View>('balance');
  const [showIntra, setShowIntra] = useState(false);
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
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs text-grey-600">
                EU-27 extra-EU imports (red) vs exports (colour by branch), € bn, 2023. Sorted by net
                balance — top = biggest surplus, bottom = deficit. Click a bar for detail.
              </p>
              <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-grey-600">
                <input
                  type="checkbox"
                  checked={showIntra}
                  onChange={(e) => setShowIntra(e.target.checked)}
                />
                show intra-EU
              </label>
            </div>
            <TradeBalanceFigure selected={selected} onSelect={setSelected} showIntra={showIntra} />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-grey-500">
              {Object.entries(TRADE_BRANCH_COLORS).map(([b, c]) => (
                <span key={b} className="inline-flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
                  {b}
                </span>
              ))}
            </div>
          </div>
          <DivisionDetail div={sel} onOpenSupply={(c) => { setSupplyCode(c); setView('supply'); }} />
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
    </div>
  );
}

/* ----------------------------------------------------- division detail drawer */

function DivisionDetail({
  div,
  onOpenSupply,
}: {
  div: DivisionTrade | null;
  onOpenSupply: (code: string) => void;
}) {
  if (!div) {
    return (
      <div className="rounded-lg border border-dashed border-grey-300 bg-grey-50 p-4 text-sm text-grey-500">
        Click a division to see its intra/extra-EU split, net balance and dependency story.
      </div>
    );
  }
  const netExt = div.expExt - div.impExt;
  const totalTrade = div.impExt + div.expExt + div.impInt + div.expInt;
  const extraShare = ((div.impExt + div.expExt) / totalTrade) * 100;
  const importIntensity = (div.impExt / (div.impExt + div.expExt)) * 100;
  const io = SECTOR_IO_INPUTS.find((s) => s.code === div.code);
  const fva = SECTOR_IO_FVA.find((s) => s.code === div.code);
  const partners = partnersFor(div.code);
  const skew = PARTNER_SKEW_NOTES[div.code];
  const color = TRADE_BRANCH_COLORS[div.branch];

  const bar = (label: string, extra: number, intra: number, extraColor: string) => {
    const max = Math.max(
      DIVISION_TRADE_TOTAL.impExt,
      ...DIVISION_TRADE.map((d) => d.impExt + d.impInt),
      ...DIVISION_TRADE.map((d) => d.expExt + d.expInt),
    );
    const w = (v: number) => `${(v / (div.impExt + div.impInt + div.expExt + div.expInt)) * 100}%`;
    void max;
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
      <div className="flex items-center gap-2">
        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: color }}>
          {div.code}
        </span>
        <h3 className="text-base font-bold text-grey-900">{div.label}</h3>
      </div>
      <p className="mt-1.5 text-xs leading-snug text-grey-600">{div.note}</p>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded bg-grey-50 p-1.5">
          <div className={`text-sm font-bold ${netExt >= 0 ? 'text-secondary' : 'text-accent-red'}`}>
            {netExt >= 0 ? '+' : ''}€{fmt(netExt)}bn
          </div>
          <div className="text-[9px] text-grey-500">extra-EU balance</div>
        </div>
        <div className="rounded bg-grey-50 p-1.5">
          <div className="text-sm font-bold text-grey-800">{importIntensity.toFixed(0)}%</div>
          <div className="text-[9px] text-grey-500">imports / total trade</div>
        </div>
        <div className="rounded bg-grey-50 p-1.5">
          <div className="text-sm font-bold text-grey-800">{extraShare.toFixed(0)}%</div>
          <div className="text-[9px] text-grey-500">extra-EU share</div>
        </div>
      </div>

      <div className="mt-3">
        {bar('Imports', div.impExt, div.impInt, '#B83230')}
        {bar('Exports', div.expExt, div.expInt, color)}
        <p className="text-[9px] text-grey-400">Solid = extra-EU · faded = intra-EU. Source: Eurostat ext_tec01, 2023.</p>
      </div>

      {fva && (
        <div className="mt-3 rounded bg-surface-blue p-2 text-[11px] text-grey-700">
          <span className="font-semibold">Foreign value added in exports: {fva.foreignValueAddedPct}%{fva.fvaApprox ? '≈' : ''}</span>{' '}
          — {fva.fvaNote}. <SourceLink src={fva.fvaSrc} />
        </div>
      )}

      {partners && (
        <div className="mt-3">
          <div className="mb-1 text-[11px] font-semibold text-grey-700">Where extra-EU trade goes</div>
          <div className="grid grid-cols-2 gap-2">
            <PartnerColumn title="Imports from" partners={partners.importPartners} accent="#B83230" />
            <PartnerColumn title="Exports to" partners={partners.exportPartners} accent={color} />
          </div>
          <p className="mt-1 text-[9px] leading-snug text-grey-400">
            {partners.sitc} proxy ({partners.covers.length > 1 ? `covers ${partners.covers.join(', ')}` : 'division-level'}).{' '}
            {skew ? skew + ' ' : ''}
            <SourceLink src={partners.src} />
          </p>
        </div>
      )}

      {io && (
        <div className="mt-3">
          <div className="mb-1 text-[11px] font-semibold text-grey-700">Critical imported inputs</div>
          <ul className="space-y-1">
            {io.inputs.map((inp) => (
              <li key={inp.name} className="text-[11px] leading-snug text-grey-600">
                <span className="font-medium text-grey-800">{inp.name}</span> — {inp.suppliers}{' '}
                <SourceLink src={inp.src} />
              </li>
            ))}
          </ul>
          <button
            onClick={() => onOpenSupply(div.code)}
            className="mt-2 text-[11px] font-semibold text-primary hover:underline"
          >
            See the supply-chain flow →
          </button>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- supply-chain view */

function SupplyChainView({ code, onSelect }: { code: string; onSelect: (c: string) => void }) {
  const io = SECTOR_IO_INPUTS.find((s) => s.code === code);
  const div = DIVISION_TRADE.find((d) => d.code === code);
  const fva = SECTOR_IO_FVA.find((s) => s.code === code);
  const partners = partnersFor(code);
  const withIo = SECTOR_IO_INPUTS.map((s) => s.code);

  if (!io || !div) return null;

  // Output split: domestic use is a residual proxy we do NOT invent — we show
  // the trade-observed split (intra-EU exports vs extra-EU exports) plus imports.
  const outExtra = div.expExt;
  const outIntra = div.expInt;
  const outTotal = outExtra + outIntra;

  return (
    <div className="rounded-lg border border-grey-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-grey-500">Sector:</span>
        {withIo.map((c) => {
          const d = DIVISION_TRADE.find((x) => x.code === c)!;
          return (
            <button
              key={c}
              onClick={() => onSelect(c)}
              className={`rounded border px-2 py-0.5 text-[11px] transition ${
                c === code ? 'border-primary bg-surface-blue text-primary font-semibold' : 'border-grey-200 text-grey-600 hover:border-grey-400'
              }`}
            >
              {c} · {d.label.length > 20 ? d.label.slice(0, 19) + '…' : d.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        {/* INPUTS */}
        <div className="rounded-lg border border-accent-red/30 bg-surface-orange/40 p-3">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-accent-red">
            ◄ Imported inputs (where they come from)
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
            {fva && (
              <div className="mt-1 text-[10px] opacity-90">
                {fva.foreignValueAddedPct}%{fva.fvaApprox ? '≈' : ''} foreign value added
              </div>
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
          {partners && (
            <div className="mt-3">
              <div className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-grey-500">
                Top extra-EU destinations ({partners.sitc} proxy)
              </div>
              <div className="flex flex-wrap gap-1">
                {partners.exportPartners.map((p) => (
                  <span key={p.region} className="rounded bg-white px-1.5 py-0.5 text-[10px] text-grey-700">
                    {p.region} <span className="font-semibold text-secondary">{p.pct}%</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="mt-3 text-[10px] leading-snug text-grey-500">
            Split of observed exports, € bn, 2023. Extra-EU €{fmt(outExtra)}bn vs intra-EU €{fmt(outIntra)}bn.
            Domestic own-use is not shown (not a trade flow). Source: Eurostat ext_tec01.
          </p>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-grey-500">
        Reads left→right as an input–output chain: the red column is what this division must{' '}
        <span className="font-semibold text-accent-red">import</span> and from whom; the green column is
        where its <span className="font-semibold text-secondary">output</span> goes. The badge on the sector
        node is its foreign value-added share (import content of exports) from OECD TiVA.
      </p>
    </div>
  );
}

function PartnerColumn({ title, partners, accent }: { title: string; partners: PartnerShare[]; accent: string }) {
  const max = Math.max(...partners.map((p) => p.pct), 1);
  return (
    <div className="rounded bg-grey-50 p-1.5">
      <div className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-grey-500">{title}</div>
      <div className="space-y-1">
        {partners.map((p) => (
          <div key={p.region} className="flex items-center gap-1">
            <span className="w-16 shrink-0 truncate text-[10px] text-grey-700" title={p.region}>
              {p.region}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-sm bg-grey-200">
              <div style={{ width: `${(p.pct / max) * 100}%`, background: accent }} className="h-full" />
            </div>
            <span className="w-7 shrink-0 text-right text-[9px] font-semibold text-grey-600">{p.pct}%</span>
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
        <span>Axes: EC/JRC critical-materials shares & Eurostat energy dependency. Concentration = largest supplier&apos;s share (HHI proxy).</span>
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
          The other input dependency — behind refining (C19) and chemicals (C20).
        </p>
        <ul className="mt-3 space-y-2.5">
          {ENERGY_FEEDSTOCK_DEPENDENCY.map((e) => (
            <li key={e.item}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-semibold text-grey-800">{e.item}</span>
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
