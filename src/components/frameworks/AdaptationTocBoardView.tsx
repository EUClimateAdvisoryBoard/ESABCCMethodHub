/**
 * Adaptation–Mitigation ToC — modular board view.
 *
 * The interactive successor to the static Adaptation–Mitigation Theory of
 * Change SVG: the same six-layer policy logic (Impact → Outcomes → Outputs →
 * Activities → Inputs → Assumptions) rendered as expandable layer bands, each
 * holding mitigation / adaptation / risk nodes with live indicator chips, plus
 * an expandable hazard-pathways band for the detail diagram (hazards →
 * physical impacts → the levers they undermine).
 *
 * Like Advanced versions 7 and 8 this is a computed, read-only analytical
 * view: clicking a chip opens the shared indicator data drawer, and "Open in
 * indicator list" hands the id back to the parent module.
 */
'use client';
import { useCallback, useMemo, useState } from 'react';
import type { Indicator } from '@/data/ecno-indicators';
import { FRAMEWORK_INDICATOR_INDEX } from '@/data/sector-frameworks';
import {
  defaultAdaptationTocBoard,
  type TocChip,
  type TocLayer,
  type TocNode,
  type TocNodeKind,
} from '@/data/adaptation-toc-board';
import IndicatorDetail from './IndicatorDetail';
import type { OpenIndicatorPayload } from './SectorFlow';

interface Props {
  allIndicators: Indicator[];
  onOpenInList?: (id: string) => void;
}

const KIND_STYLE: Record<
  TocNodeKind,
  { border: string; bg: string; title: string; dot: string; label: string }
> = {
  mitigation: { border: '#0F6E56', bg: '#E1F5EE', title: '#085041', dot: '#0F6E56', label: 'Mitigation' },
  adaptation: { border: '#993C1D', bg: '#FAECE7', title: '#712B13', dot: '#993C1D', label: 'Adaptation' },
  risk: { border: '#A32D2D', bg: '#FCEBEB', title: '#791F1F', dot: '#A32D2D', label: 'Risk / pressure' },
  lever: { border: '#5F5E5A', bg: '#F1EFE8', title: '#444441', dot: '#5F5E5A', label: 'Mitigation lever' },
  enabler: { border: '#854F0B', bg: '#FAEEDA', title: '#633806', dot: '#854F0B', label: 'Enabling condition' },
  assumption: { border: '#5F5E5A', bg: '#F8F7F2', title: '#444441', dot: '#9c9a92', label: 'Assumption' },
};

const HAZARD_STYLE = { border: '#185FA5', bg: '#E6F1FB', title: '#0C447C' };

interface Trend {
  baseYear: number;
  pct: number;
  improving: boolean;
}

function fmt(value: number, decimals = 0): string {
  return value.toLocaleString('en-GB', { maximumFractionDigits: decimals });
}

function latestPoint(ind: Indicator) {
  const data = [...ind.data].sort((a, b) => a.year - b.year);
  return data[data.length - 1];
}

/** Change from the closest point ≥10 years before the latest (or the first point). */
function trendFor(ind: Indicator): Trend | null {
  const data = [...ind.data].sort((a, b) => a.year - b.year);
  if (data.length < 2) return null;
  const last = data[data.length - 1];
  const base = [...data].filter((d) => d.year <= last.year - 10).pop() ?? data[0];
  if (base.year === last.year || base.value === 0) return null;
  const pct = ((last.value - base.value) / Math.abs(base.value)) * 100;
  return { baseYear: base.year, pct, improving: ind.direction === 'down' ? pct < 0 : pct > 0 };
}

function TrendBadge({ trend }: { trend: Trend | null }) {
  if (!trend) return <span className="text-[10px] text-tertiary-light">single reference point</span>;
  const cls = trend.improving ? 'bg-teal-50 text-teal-800 border-teal-200' : 'bg-red-50 text-red-800 border-red-200';
  const arrow = trend.pct < 0 ? '▼' : '▲';
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      {arrow} {Math.abs(trend.pct) >= 10 ? Math.round(Math.abs(trend.pct)) : Math.abs(trend.pct).toFixed(1)}%
      <span className="font-normal opacity-75">since {trend.baseYear}</span>
    </span>
  );
}

export default function AdaptationTocBoardView({ allIndicators, onOpenInList }: Props) {
  const board = useMemo(() => defaultAdaptationTocBoard(), []);
  const [drawer, setDrawer] = useState<OpenIndicatorPayload | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const sectionIds = useMemo(() => [...board.layers.map((l) => l.id), 'hazards'], [board]);

  const lookup = useMemo(() => {
    const m = new Map<string, Indicator>();
    for (const i of allIndicators) m.set(i.id, i);
    return m;
  }, [allIndicators]);
  const resolve = useCallback(
    (ids: string[]) =>
      ids
        .map((id) => lookup.get(id) ?? FRAMEWORK_INDICATOR_INDEX[id])
        .filter(Boolean) as Indicator[],
    [lookup],
  );
  const drawerIndicators = useMemo(() => (drawer ? resolve(drawer.indicatorIds) : []), [drawer, resolve]);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allCollapsed = collapsed.size === sectionIds.length;
  const toggleAll = () => setCollapsed(allCollapsed ? new Set() : new Set(sectionIds));

  const totals = useMemo(() => {
    const nodes = board.layers.flatMap((l) => l.nodes);
    const chipCount = (ns: { chips: TocChip[] }[]) => ns.reduce((n, x) => n + x.chips.length, 0);
    return {
      mitigation: nodes.filter((n) => n.kind === 'mitigation' || n.kind === 'lever').length,
      adaptation: nodes.filter((n) => n.kind === 'adaptation').length,
      risk: nodes.filter((n) => n.kind === 'risk').length + board.impacts.length,
      chips: chipCount(nodes) + chipCount(board.impacts),
    };
  }, [board]);

  const openChip = (chip: TocChip) =>
    setDrawer({ title: chip.label, code: chip.code, indicatorIds: chip.indicatorIds });

  return (
    <div>
      {/* Overarching goal banner */}
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 mb-4">
        <div className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold mb-0.5">
          One overarching goal — EU energy supply sector
        </div>
        <div className="text-base font-bold text-tertiary-dark leading-snug">
          A decarbonised and climate-resilient EU energy supply by 2050
        </div>
        <p className="text-xs text-tertiary mt-1 max-w-3xl">
          The mitigation chain of the report framework, with climate adaptation integrated at every
          layer — without disrupting the causal logic. Based on EUCRA Chapter 8 (EEA, 2024).
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          {(['mitigation', 'adaptation', 'risk'] as const).map((kind) => (
            <span
              key={kind}
              className="inline-flex items-center gap-1.5 rounded-md bg-white border border-grey-200 px-2 py-1"
            >
              <span className="w-2 h-2 rounded-full" style={{ background: KIND_STYLE[kind].dot }} />
              <span className="font-semibold text-tertiary-dark">{KIND_STYLE[kind].label}</span>
            </span>
          ))}
        </div>
      </div>

      <p className="text-sm text-tertiary mb-4 max-w-3xl">
        <span className="font-semibold" style={{ color: '#993C1D' }}>
          Adaptation–Mitigation Theory of Change:
        </span>{' '}
        the six-layer policy logic read top-down —{' '}
        <span className="font-semibold">Impact → Outcomes → Outputs → Activities → Inputs</span>, with{' '}
        <span className="font-semibold">Assumptions made explicit</span> at the base. Each layer pairs the
        existing mitigation framework (teal) with the new adaptation additions (coral) and the adaptation
        pressures working against the chain (red). Every node carries live indicator chips from the
        database (ESABCC report set E1–E6 and O2, plus candidate proxies for the proposed E7 resilience
        indicator) — click a chip to open the data behind it. The hazard-pathways band at the bottom zooms
        into the Activities layer: five climate hazards → physical impacts → the levers they undermine.
      </p>

      {/* Headline figures */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {[
          { chip: board.layers[0].nodes[0].chips[0], label: 'E1 · supply GHG' },
          { chip: board.layers[1].nodes[0].chips[0], label: 'E2 · fossil share' },
          { chip: board.layers[2].nodes[1].chips[0], label: 'E4a · solar additions' },
          { chip: board.layers[1].nodes[3].chips[0], label: 'E7 proxy · cooling degree days' },
        ].map(({ chip, label }) => {
          const ind = resolve(chip.indicatorIds)[0];
          if (!ind) return null;
          const last = latestPoint(ind);
          return (
            <button
              key={label}
              type="button"
              onClick={() => openChip(chip)}
              className="rounded-lg border border-grey-200 bg-white px-3 py-2 text-left hover:border-grey-300 hover:shadow-sm transition-shadow"
            >
              <div className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold">{label}</div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-tertiary-dark">
                  {last ? fmt(last.value * (chip.scale ?? 1), chip.decimals) : '—'}
                </span>
                <span className="text-[10px] text-tertiary">
                  {ind.unit} · {last?.year}
                  {last?.estimated ? ' (est.)' : ''}
                </span>
              </div>
              <div className="mt-0.5">
                <TrendBadge trend={trendFor(ind)} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Totals + expand control */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px]">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-grey-200 px-2 py-1">
          <span className="w-2 h-2 rounded-full" style={{ background: KIND_STYLE.mitigation.dot }} />
          <span className="font-semibold text-tertiary-dark">Mitigation</span>
          <span className="text-tertiary-light">· {totals.mitigation} nodes</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-grey-200 px-2 py-1">
          <span className="w-2 h-2 rounded-full" style={{ background: KIND_STYLE.adaptation.dot }} />
          <span className="font-semibold text-tertiary-dark">Adaptation</span>
          <span className="text-tertiary-light">· {totals.adaptation} nodes</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-grey-200 px-2 py-1">
          <span className="w-2 h-2 rounded-full" style={{ background: KIND_STYLE.risk.dot }} />
          <span className="font-semibold text-tertiary-dark">Risk / pressure</span>
          <span className="text-tertiary-light">· {totals.risk} nodes</span>
        </span>
        <span className="text-tertiary-light">{totals.chips} indicator chips</span>
        <button
          type="button"
          onClick={toggleAll}
          className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-md border border-grey-200 text-tertiary-dark hover:bg-grey-50"
        >
          {allCollapsed ? 'Expand all' : 'Collapse all'}
        </button>
      </div>

      {/* The six-layer chain */}
      <div className="text-[11px] space-y-0">
        {board.layers.map((layer, i) => (
          <div key={layer.id}>
            <LayerBand
              layer={layer}
              open={!collapsed.has(layer.id)}
              onToggle={() => toggle(layer.id)}
              resolve={resolve}
              onOpenChip={openChip}
            />
            {i < board.layers.length - 1 && (
              <div className="flex justify-center py-0.5" aria-hidden="true">
                <span className="text-tertiary-light text-base leading-none">↓</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Hazard pathways */}
      <div className="mt-4">
        <section
          className="rounded-xl border overflow-hidden bg-white"
          style={{ borderColor: '#A32D2D55' }}
        >
          <button
            type="button"
            onClick={() => toggle('hazards')}
            className="w-full flex items-start gap-3 px-3 py-2 text-left text-white"
            style={{ background: '#A32D2D' }}
            aria-expanded={!collapsed.has('hazards')}
          >
            <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/25 font-bold text-[13px]">
              ⚠
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-[13px] leading-tight">
                Hazard pathways into the mitigation levers
              </span>
              <span className="block text-white/85 text-[10.5px] leading-snug mt-0.5">
                Zooms into the Activities layer: climate hazards → physical impacts → the levers each
                impact undermines.
              </span>
            </span>
            <span className="ml-auto shrink-0 flex items-center gap-2 self-center">
              <span className="text-white/80 text-[10px] font-mono">
                {board.hazards.length} hazards · {board.impacts.length} impacts
              </span>
              <span className="text-white/80">{collapsed.has('hazards') ? '▸' : '▾'}</span>
            </span>
          </button>
          {!collapsed.has('hazards') && (
            <div className="p-3 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {board.hazards.map((h) => (
                  <span
                    key={h.id}
                    className="inline-flex items-center rounded-md border px-2 py-1 text-[10.5px] font-semibold"
                    style={{
                      borderColor: HAZARD_STYLE.border,
                      background: HAZARD_STYLE.bg,
                      color: HAZARD_STYLE.title,
                    }}
                  >
                    {h.name}
                  </span>
                ))}
                <span className="text-[10px] text-tertiary-light self-center">
                  → drive the physical impacts below
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {board.impacts.map((impact) => {
                  const style = KIND_STYLE.risk;
                  const hazardNames = impact.hazardIds
                    .map((id) => board.hazards.find((h) => h.id === id)?.name)
                    .filter(Boolean);
                  return (
                    <div
                      key={impact.id}
                      className="rounded-lg border p-2.5 flex flex-col gap-1.5"
                      style={{ borderColor: `${style.border}66`, background: style.bg }}
                    >
                      <div className="font-semibold text-[12px] leading-snug" style={{ color: style.title }}>
                        {impact.title}
                      </div>
                      <p className="text-[10.5px] leading-snug text-tertiary">{impact.detail}</p>
                      <div className="text-[10px] text-tertiary">
                        <span className="font-semibold" style={{ color: HAZARD_STYLE.title }}>
                          Driven by:
                        </span>{' '}
                        {hazardNames.join(' · ')}
                      </div>
                      <div className="text-[10px] text-tertiary">
                        <span className="font-semibold" style={{ color: style.title }}>
                          Undermines:
                        </span>{' '}
                        {impact.undermines.join(' · ')}
                      </div>
                      {impact.chips.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {impact.chips.map((chip) => (
                            <ChipButton
                              key={`${impact.id}-${chip.code}-${chip.label}`}
                              chip={chip}
                              accent={style.border}
                              resolve={resolve}
                              onOpen={openChip}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      <p className="text-xs text-tertiary-light mt-4 px-1">
        Source: Advisory Board (2024) assessment framework for the energy supply sector, adapted to
        integrate climate adaptation considerations from the European Climate Risk Assessment (EUCRA,
        EEA 2024). Indicator series: ESABCC report underlying data (E1–E6, O2) with post-report
        refreshes, plus EEA / Eurostat / JRC adaptation series as candidate proxies for the proposed E7
        resilience indicator.
      </p>

      {drawer && (
        <IndicatorDetail
          title={drawer.title}
          code={drawer.code}
          indicators={drawerIndicators}
          onClose={() => setDrawer(null)}
          onOpenInList={
            onOpenInList
              ? (id) => {
                  onOpenInList(id);
                  setDrawer(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

function LayerBand({
  layer,
  open,
  onToggle,
  resolve,
  onOpenChip,
}: {
  layer: TocLayer;
  open: boolean;
  onToggle: () => void;
  resolve: (ids: string[]) => Indicator[];
  onOpenChip: (chip: TocChip) => void;
}) {
  const chips = layer.nodes.reduce((n, x) => n + x.chips.length, 0);
  return (
    <section className="rounded-xl border overflow-hidden bg-white" style={{ borderColor: `${layer.color}55` }}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-3 px-3 py-2 text-left text-white"
        style={{ background: layer.color }}
        aria-expanded={open}
      >
        <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/25 font-bold text-[13px]">
          {layer.index}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-[13px] leading-tight">
            {layer.name} <span className="font-normal text-white/75">— {layer.role}</span>
          </span>
          <span className="block text-white/85 text-[10.5px] leading-snug mt-0.5">{layer.blurb}</span>
        </span>
        <span className="ml-auto shrink-0 flex items-center gap-2 self-center">
          <span className="text-white/80 text-[10px] font-mono">
            {layer.nodes.length} nodes{chips > 0 ? ` · ${chips} ind.` : ''}
          </span>
          <span className="text-white/80">{open ? '▾' : '▸'}</span>
        </span>
      </button>
      {open && (
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {layer.nodes.map((node) => (
            <NodeCard key={node.id} node={node} resolve={resolve} onOpenChip={onOpenChip} />
          ))}
        </div>
      )}
    </section>
  );
}

function NodeCard({
  node,
  resolve,
  onOpenChip,
}: {
  node: TocNode;
  resolve: (ids: string[]) => Indicator[];
  onOpenChip: (chip: TocChip) => void;
}) {
  const style = KIND_STYLE[node.kind];
  return (
    <div
      className="rounded-lg border p-2.5 flex flex-col gap-1.5"
      style={{ borderColor: `${style.border}66`, background: style.bg }}
    >
      <div className="flex items-start gap-1.5">
        <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: style.dot }} />
        <div className="min-w-0">
          <div className="font-semibold text-[12px] leading-snug" style={{ color: style.title }}>
            {node.title}
          </div>
          {node.subtitle && <p className="text-[10.5px] leading-snug text-tertiary mt-0.5">{node.subtitle}</p>}
        </div>
      </div>
      {node.badge && (
        <span
          className={`self-start inline-flex items-center rounded px-1.5 py-0.5 text-[9.5px] font-semibold ${
            node.badge.tone === 'synergy' ? 'bg-teal-100 text-teal-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {node.badge.label}
        </span>
      )}
      {node.chips.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {node.chips.map((chip) => (
            <ChipButton
              key={`${node.id}-${chip.code}-${chip.label}`}
              chip={chip}
              accent={style.border}
              resolve={resolve}
              onOpen={onOpenChip}
            />
          ))}
        </div>
      )}
      {node.note && <p className="text-[10px] text-tertiary leading-snug italic">{node.note}</p>}
    </div>
  );
}

function ChipButton({
  chip,
  accent,
  resolve,
  onOpen,
}: {
  chip: TocChip;
  accent: string;
  resolve: (ids: string[]) => Indicator[];
  onOpen: (chip: TocChip) => void;
}) {
  const ind = resolve(chip.indicatorIds)[0];
  const last = ind ? latestPoint(ind) : undefined;
  const trend = ind ? trendFor(ind) : null;
  const arrow = trend ? (trend.pct < 0 ? '▼' : '▲') : null;
  return (
    <button
      type="button"
      onClick={() => onOpen(chip)}
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] border bg-white cursor-pointer hover:ring-1 max-w-full"
      style={{ borderColor: `${accent}66` }}
      title={ind ? `${chip.label} — ${ind.name} (${ind.source})` : chip.label}
    >
      <span className="font-mono font-semibold shrink-0" style={{ color: accent }}>
        {chip.code}
      </span>
      <span className="max-w-[150px] truncate text-gray-800">{chip.label}</span>
      {ind && last && (
        <span className="shrink-0 font-semibold text-gray-800">
          {fmt(last.value * (chip.scale ?? 1), chip.decimals)}
          <span className="font-normal text-tertiary-light"> {ind.unit}</span>
        </span>
      )}
      {arrow && (
        <span className={`shrink-0 ${trend!.improving ? 'text-teal-700' : 'text-red-700'}`}>{arrow}</span>
      )}
      {!ind && <span className="italic text-tertiary-light">no data</span>}
    </button>
  );
}
