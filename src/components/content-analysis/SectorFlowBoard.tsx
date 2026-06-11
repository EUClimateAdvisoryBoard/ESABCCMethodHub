'use client';

/**
 * Sector flow board — the Content Analysis lens that draws, per report
 * sector, the full reasoning chain:
 *
 *   ① Progress reporting → ② Policy analysis → ③ Recommendations
 *
 * with a co-benefits lane (health, air, water, biodiversity, equity, …)
 * hanging off the nodes each benefit springs from. Cards are real data:
 * indicator cards read the live series + target from the indicator
 * database, policy cards come from the Policy Navigator library (and show
 * coded evidence from the active workspace corpus when the corpus contains
 * the instrument), recommendation cards carry the tracker's uptake status.
 *
 * Edges are drawn in a measured SVG overlay (bezier curves between card
 * anchor points, re-measured on resize), so the chart stays a genuine flow
 * chart rather than three disconnected columns. Hovering a card highlights
 * its chain and fades the rest.
 */

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type {
  AnalysisDocument,
  CodeNode,
  CodedSegment,
} from '@/lib/content-analysis/types';
import {
  buildAllSectorFlows,
  policyCorpusEvidence,
  sectorCorpusEvidence,
  CO_BENEFIT_META,
  type SectorFlow,
  type FlowIndicator,
  type FlowPolicy,
  type FlowRec,
  type FlowCoBenefit,
} from '@/lib/content-analysis/sector-flow';
import type { IndicatorDataPoint } from '@/data/ecno-indicators';
import type { RecommendationStatus } from '@/data/esabcc-recommendations';

interface Props {
  documents: AnalysisDocument[];
  codes: CodeNode[];
  segments: CodedSegment[];
}

const REC_STATUS_META: Record<RecommendationStatus, { label: string; color: string }> = {
  'not-addressed': { label: 'Not addressed', color: '#B83230' },
  'in-progress': { label: 'In progress', color: '#D97706' },
  partially: { label: 'Partially addressed', color: '#A16207' },
  addressed: { label: 'Addressed', color: '#00928F' },
};
const REC_STATUS_ORDER: RecommendationStatus[] = [
  'addressed', 'partially', 'in-progress', 'not-addressed',
];

// ── Edge model ───────────────────────────────────────────────────────────────

interface EdgeDef {
  from: string;
  to: string;
  color: string;
  dashed?: boolean;
}

interface RenderedEdge extends EdgeDef {
  d: string;
  /** Arrowhead triangle path ('' for dashed co-benefit stubs). */
  arrow: string;
}

function fmt(v: number): string {
  const a = Math.abs(v);
  const digits = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 1 : 2;
  return v.toLocaleString('en-GB', { maximumFractionDigits: digits });
}

export default function SectorFlowBoard({ documents, codes, segments }: Props) {
  const flows = useMemo(() => buildAllSectorFlows(), []);
  const [activeId, setActiveId] = useState(flows[0].def.sectorId);
  const [focus, setFocus] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const flow = flows.find(f => f.def.sectorId === activeId)!;

  const sectorEvidence = useMemo(
    () => sectorCorpusEvidence(flow.def, documents, codes, segments),
    [flow, documents, codes, segments],
  );

  // ── Edge wiring (logical) ──────────────────────────────────────────────
  const edges = useMemo<EdgeDef[]>(() => {
    const out: EdgeDef[] = [];
    const indCodes = new Set(flow.indicators.map(i => i.code));
    const polIds = new Set(flow.policies.map(p => p.policy.id));
    for (const p of flow.policies) {
      for (const code of p.respondsTo) {
        if (indCodes.has(code)) {
          out.push({ from: `ind:${code}`, to: `pol:${p.policy.id}`, color: flow.sector.color });
        }
      }
    }
    for (const r of flow.recs) {
      for (const pid of r.viaPolicies) {
        if (polIds.has(pid)) {
          out.push({ from: `pol:${pid}`, to: `rec:${r.rec.id}`, color: flow.sector.color });
        }
      }
    }
    for (const cb of flow.coBenefits) {
      const color = CO_BENEFIT_META[cb.dimension].color;
      for (const link of cb.linkedTo) {
        const from = indCodes.has(link)
          ? `ind:${link}`
          : polIds.has(link)
            ? `pol:${link}`
            : `rec:${link}`;
        out.push({ from, to: `cb:${cb.id}`, color, dashed: true });
      }
    }
    return out;
  }, [flow]);

  /** node id → every node reachable through a single edge (plus itself). */
  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const touch = (a: string, b: string) => {
      if (!map.has(a)) map.set(a, new Set([a]));
      map.get(a)!.add(b);
    };
    for (const e of edges) {
      touch(e.from, e.to);
      touch(e.to, e.from);
    }
    return map;
  }, [edges]);

  // ── Edge measurement (geometric) ───────────────────────────────────────
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const nodeEls = useRef(new Map<string, HTMLElement>());
  const setNodeRef = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) nodeEls.current.set(id, el);
      else nodeEls.current.delete(id);
    },
    [],
  );

  const [rendered, setRendered] = useState<RenderedEdge[]>([]);
  const [overlay, setOverlay] = useState({ w: 0, h: 0 });

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const wr = wrap.getBoundingClientRect();
    const out: RenderedEdge[] = [];
    for (const e of edges) {
      const a = nodeEls.current.get(e.from);
      const b = nodeEls.current.get(e.to);
      if (!a || !b) continue;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const hGap = rb.left - ra.right;
      const vGap = rb.top - ra.bottom;
      let d: string;
      let arrow = '';
      if (hGap >= 16 && hGap >= vGap) {
        // left-to-right between columns
        const sx = ra.right - wr.left;
        const sy = ra.top + ra.height / 2 - wr.top;
        const tx = rb.left - wr.left;
        const ty = rb.top + rb.height / 2 - wr.top;
        const dx = Math.max(24, (tx - sx) * 0.45);
        d = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
        if (!e.dashed) arrow = `M ${tx} ${ty} l -7 -4 l 0 8 Z`;
      } else {
        // top-to-bottom (co-benefit lane / stacked small screens)
        const down = rb.top >= ra.bottom;
        const sx = ra.left + ra.width / 2 - wr.left;
        const sy = (down ? ra.bottom : ra.top) - wr.top;
        const tx = rb.left + rb.width / 2 - wr.left;
        const ty = (down ? rb.top : rb.bottom) - wr.top;
        const dy = Math.max(18, Math.abs(ty - sy) * 0.5) * (down ? 1 : -1);
        d = `M ${sx} ${sy} C ${sx} ${sy + dy}, ${tx} ${ty - dy}, ${tx} ${ty}`;
        if (!e.dashed) arrow = `M ${tx} ${ty} l -4 ${down ? -7 : 7} l 8 0 Z`;
      }
      out.push({ ...e, d, arrow });
    }
    setRendered(out);
    setOverlay({ w: wrap.scrollWidth, h: wrap.scrollHeight });
  }, [edges]);

  useLayoutEffect(() => {
    measure();
    // second pass once fonts/layout settle
    const raf = requestAnimationFrame(measure);
    const t = window.setTimeout(measure, 180);
    const wrap = wrapRef.current;
    const ro = wrap ? new ResizeObserver(measure) : null;
    if (wrap && ro) ro.observe(wrap);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, showMore]);

  const dimmed = (id: string) => focus !== null && !(adjacency.get(focus)?.has(id) ?? focus === id);
  const hoverProps = (id: string) => ({
    onMouseEnter: () => setFocus(id),
    onMouseLeave: () => setFocus(f => (f === id ? null : f)),
  });

  const totalRecs = flow.recs.length + flow.moreRecs.length;

  return (
    <div className="space-y-4">
      {/* Sector selector */}
      <div className="flex flex-wrap items-center gap-1.5">
        {flows.map(f => {
          const headline = f.indicators.find(i => i.headline) ?? f.indicators[0];
          const active = f.def.sectorId === activeId;
          return (
            <button
              key={f.def.sectorId}
              type="button"
              onClick={() => { setActiveId(f.def.sectorId); setFocus(null); setShowMore(false); }}
              className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-[11.5px] font-medium transition ${
                active
                  ? 'text-white border-transparent'
                  : 'bg-white text-[#3D5265] border-[#E6E7E8] hover:border-[#8A95A3]'
              }`}
              style={active ? { backgroundColor: f.sector.color } : undefined}
              title={`${f.sector.goal} — headline indicator ${headline?.code}: ${headline?.signal.label.toLowerCase() ?? 'n/a'}`}
            >
              {!active && (
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: f.sector.color }} />
              )}
              {f.sector.name}
              {headline && (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: active ? '#fff' : headline.signal.color, opacity: active ? 0.9 : 1 }}
                />
              )}
            </button>
          );
        })}
        <span className="ml-auto text-[10.5px] text-[#8A95A3]">
          Hover any card to trace its chain · dot = headline-indicator signal
        </span>
      </div>

      {/* Sector banner */}
      <div
        className="rounded-md border px-3 py-2 text-[12px] flex flex-wrap items-baseline gap-x-3 gap-y-1"
        style={{ borderColor: flow.sector.color, backgroundColor: `${flow.sector.color}10` }}
      >
        <span className="font-semibold" style={{ color: flow.sector.color }}>
          {flow.sector.name} — {flow.sector.goal}
        </span>
        <span className="text-[#5B6B7C]">
          Assessment framework {flow.sector.figure}, ESABCC “Towards EU climate neutrality” (2024)
        </span>
      </div>

      {/* The flow chart */}
      <div ref={wrapRef} className="relative">
        {/* Edge overlay */}
        <svg
          className="pointer-events-none absolute left-0 top-0 z-0"
          width={overlay.w}
          height={overlay.h}
          aria-hidden
        >
          {rendered.map((e, i) => {
            const onChain =
              focus !== null && (e.from === focus || e.to === focus);
            const opacity = focus === null ? (e.dashed ? 0.45 : 0.55) : onChain ? 0.95 : 0.07;
            return (
              <g key={i} style={{ transition: 'opacity 150ms' }} opacity={opacity}>
                <path
                  d={e.d}
                  fill="none"
                  stroke={e.color}
                  strokeWidth={onChain ? 2 : 1.4}
                  strokeDasharray={e.dashed ? '3 4' : undefined}
                />
                {e.arrow && <path d={e.arrow} fill={e.color} />}
              </g>
            );
          })}
        </svg>

        {/* Three stages */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-x-10 gap-y-6">
          {/* ① Progress reporting */}
          <section className="space-y-2">
            <StageHeader
              n="①"
              color={flow.sector.color}
              title="Progress reporting"
              sub="What the monitored indicators say"
            />
            {flow.indicators.map(ind => (
              <IndicatorCard
                key={ind.code}
                ind={ind}
                accent={flow.sector.color}
                nodeRef={setNodeRef(`ind:${ind.code}`)}
                dim={dimmed(`ind:${ind.code}`)}
                {...hoverProps(`ind:${ind.code}`)}
              />
            ))}
          </section>

          {/* ② Policy analysis */}
          <section className="space-y-2">
            <StageHeader
              n="②"
              color={flow.sector.color}
              title="Policy analysis"
              sub="The EU instruments responding"
              chip={
                sectorEvidence.segments > 0
                  ? `${sectorEvidence.segments} coded passage${sectorEvidence.segments === 1 ? '' : 's'} in this workspace touch the sector (${sectorEvidence.documents} doc${sectorEvidence.documents === 1 ? '' : 's'})`
                  : undefined
              }
            />
            {flow.policies.map(p => (
              <PolicyCard
                key={p.policy.id}
                item={p}
                evidence={policyCorpusEvidence(p.policy, documents, segments)}
                nodeRef={setNodeRef(`pol:${p.policy.id}`)}
                dim={dimmed(`pol:${p.policy.id}`)}
                {...hoverProps(`pol:${p.policy.id}`)}
              />
            ))}
          </section>

          {/* ③ Recommendations */}
          <section className="space-y-2">
            <StageHeader
              n="③"
              color={flow.sector.color}
              title="Recommendations"
              sub={`ESABCC advice & uptake (${totalRecs} in this chapter)`}
              right={<StatusBar counts={flow.statusCounts} />}
            />
            {flow.recs.map(r => (
              <RecCard
                key={r.rec.id}
                item={r}
                nodeRef={setNodeRef(`rec:${r.rec.id}`)}
                dim={dimmed(`rec:${r.rec.id}`)}
                {...hoverProps(`rec:${r.rec.id}`)}
              />
            ))}
            {flow.moreRecs.length > 0 && (
              <div className="rounded border border-dashed border-[#E6E7E8] px-2.5 py-1.5">
                <button
                  type="button"
                  onClick={() => setShowMore(v => !v)}
                  className="text-[11px] font-medium text-[#0065A4] hover:underline"
                >
                  {showMore ? '▾ Hide' : '▸ Show'} {flow.moreRecs.length} more recommendation
                  {flow.moreRecs.length === 1 ? '' : 's'} in this chapter
                </button>
                {showMore && (
                  <ul className="mt-1.5 space-y-1">
                    {flow.moreRecs.map(r => (
                      <li key={r.id} className="flex items-start gap-1.5 text-[10.5px] leading-snug" title={r.summary}>
                        <span
                          className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: REC_STATUS_META[r.status].color }}
                        />
                        <span className="font-mono text-[#8A95A3] shrink-0">{r.area.split(' ·')[0]}</span>
                        <span className="text-[#3D5265]">{r.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Co-benefits lane */}
        <div className="relative z-10 mt-8">
          <div className="flex items-baseline gap-2 mb-2">
            <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5B6B7C]">
              Co-benefits — what the chain delivers beyond GHG
            </h4>
            <span className="text-[10.5px] text-[#8A95A3]">
              dashed links show the node each benefit springs from
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {flow.coBenefits.map(cb => (
              <CoBenefitCard
                key={cb.id}
                item={cb}
                nodeRef={setNodeRef(`cb:${cb.id}`)}
                dim={dimmed(`cb:${cb.id}`)}
                {...hoverProps(`cb:${cb.id}`)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Legend & sources */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#E6E7E8] pt-2 text-[10.5px] text-[#8A95A3]">
        <span className="font-medium text-[#5B6B7C]">Indicator signal:</span>
        {(['on-track', 'watch', 'off-track'] as const).map(s => (
          <span key={s} className="flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: s === 'on-track' ? '#00928F' : s === 'watch' ? '#D97706' : '#B83230' }}
            />
            {s === 'on-track' ? 'on track' : s === 'watch' ? 'too slow' : 'off track'}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="inline-block h-0 w-5 border-t-2 border-dashed border-[#8A95A3]" /> co-benefit link
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block rounded border border-dashed border-[#B83230] px-1 text-[#B83230]">gap</span>
          recommendation with no instrument yet
        </span>
        <span className="ml-auto">
          Sources: ESABCC 2024 underlying data (+ live refresh) · Policy Navigator library ·
          recommendation status as assessed June 2026.
        </span>
      </div>
    </div>
  );
}

// ── Stage header ─────────────────────────────────────────────────────────────

function StageHeader({
  n, color, title, sub, chip, right,
}: {
  n: string;
  color: string;
  title: string;
  sub: string;
  chip?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="pb-1">
      <div className="flex items-center gap-2">
        <span className="text-[15px] leading-none" style={{ color }}>{n}</span>
        <h3 className="text-[13px] font-semibold text-[#3D5265]">{title}</h3>
        {right && <span className="ml-auto">{right}</span>}
      </div>
      <p className="text-[10.5px] text-[#8A95A3] mt-0.5">{sub}</p>
      {chip && (
        <p className="mt-1 inline-block rounded bg-[#00928F]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#00928F]">
          {chip}
        </p>
      )}
    </div>
  );
}

// ── Cards ────────────────────────────────────────────────────────────────────

type CardHover = {
  nodeRef: (el: HTMLElement | null) => void;
  dim: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

function IndicatorCard({ ind, accent, nodeRef, dim, ...hover }: { ind: FlowIndicator; accent: string } & CardHover) {
  const { indicator, signal } = ind;
  const delta = signal.deltaPct;
  return (
    <div
      ref={nodeRef}
      {...hover}
      className="rounded-md border border-[#E6E7E8] bg-white px-2.5 py-2 transition-opacity"
      style={{ borderLeft: `3px solid ${accent}`, opacity: dim ? 0.3 : 1 }}
      title={`${indicator.description}\n\n${signal.hint}`}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="rounded px-1 font-mono text-[10px] font-semibold"
          style={{ backgroundColor: `${accent}1A`, color: accent }}
        >
          {ind.code}
        </span>
        {ind.headline && (
          <span className="text-[9px] font-mono uppercase tracking-wide text-[#8A95A3]">headline</span>
        )}
        <span
          className="ml-auto rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold"
          style={{ backgroundColor: `${signal.color}18`, color: signal.color }}
        >
          {signal.label}
        </span>
      </div>
      <p className="mt-1 text-[11.5px] font-medium leading-snug text-[#3D5265] line-clamp-2">
        {indicator.name}
      </p>
      <div className="mt-1 flex items-end gap-2">
        <div className="min-w-0">
          {signal.latest && (
            <p className="text-[15px] font-bold leading-none tabular-nums text-[#27313D]">
              {fmt(signal.latest.value)}
              <span className="ml-1 text-[10px] font-normal text-[#8A95A3]">
                {indicator.unit} ({signal.latest.year})
              </span>
            </p>
          )}
          {delta !== undefined && (
            <p
              className="mt-0.5 text-[10px] font-medium tabular-nums"
              style={{ color: signal.improving ? '#00928F' : '#B83230' }}
            >
              {delta >= 0 ? '▲' : '▼'} {fmt(Math.abs(delta))}% since {signal.deltaFromYear}
              {indicator.targetValue !== undefined && indicator.targetYear !== undefined && (
                <span className="ml-1 font-normal text-[#8A95A3]">
                  · target {fmt(indicator.targetValue)} by {indicator.targetYear}
                </span>
              )}
            </p>
          )}
        </div>
        <span className="ml-auto shrink-0">
          <Sparkline series={signal.series} color={signal.color} />
        </span>
      </div>
    </div>
  );
}

function PolicyCard({ item, evidence, nodeRef, dim, ...hover }: {
  item: FlowPolicy;
  evidence: { documents: number; segments: number };
} & CardHover) {
  const p = item.policy;
  return (
    <div
      ref={nodeRef}
      {...hover}
      className="rounded-md border border-[#E6E7E8] bg-white px-2.5 py-2 transition-opacity"
      style={{ opacity: dim ? 0.3 : 1 }}
      title={`${p.scope}\n\nNow: ${p.currentRequirement}\nNext: ${p.futureRequirement}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="rounded bg-[#3D5265]/10 px-1 font-mono text-[10px] font-semibold text-[#3D5265]">
          {p.acronym || p.name.split(' ').slice(0, 2).join(' ')}
        </span>
        <span className="text-[9.5px] uppercase tracking-wide text-[#8A95A3]">{p.instrumentType}</span>
        {p.inForce && <span className="ml-auto text-[9.5px] text-[#8A95A3]">in force {p.inForce}</span>}
      </div>
      <p className="mt-1 text-[11.5px] font-medium leading-snug text-[#3D5265] line-clamp-2">{p.name}</p>
      {evidence.segments > 0 && (
        <p className="mt-1 inline-block rounded bg-[#00928F]/10 px-1.5 py-0.5 text-[9.5px] font-medium text-[#00928F]">
          ✓ {evidence.segments} coded passage{evidence.segments === 1 ? '' : 's'} on this act in the workspace
        </p>
      )}
    </div>
  );
}

function RecCard({ item, nodeRef, dim, ...hover }: { item: FlowRec } & CardHover) {
  const meta = REC_STATUS_META[item.rec.status];
  const code = item.rec.area.split(' ·')[0];
  return (
    <div
      ref={nodeRef}
      {...hover}
      className={`rounded-md bg-white px-2.5 py-2 transition-opacity ${
        item.gap ? 'border border-dashed' : 'border border-[#E6E7E8]'
      }`}
      style={{ opacity: dim ? 0.3 : 1, borderColor: item.gap ? '#B83230' : undefined }}
      title={item.rec.summary}
    >
      <div className="flex items-center gap-1.5">
        <span className="rounded bg-[#0065A4]/10 px-1 font-mono text-[10px] font-semibold text-[#0065A4]">
          {code}
        </span>
        <span
          className="ml-auto rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold"
          style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
        >
          {meta.label}
        </span>
      </div>
      <p className="mt-1 text-[11.5px] font-medium leading-snug text-[#3D5265] line-clamp-3">
        {item.rec.title}
      </p>
      {item.gap ? (
        <p className="mt-1 text-[10px] font-medium text-[#B83230]">
          ⚠ Identified gap — no EU instrument carries this advice yet
        </p>
      ) : (
        item.rec.uptakeEvents.length > 0 && (
          <p className="mt-1 text-[10px] text-[#8A95A3]">
            {item.rec.uptakeEvents.length} uptake event{item.rec.uptakeEvents.length === 1 ? '' : 's'} logged
          </p>
        )
      )}
    </div>
  );
}

function CoBenefitCard({ item, nodeRef, dim, ...hover }: { item: FlowCoBenefit } & CardHover) {
  const meta = CO_BENEFIT_META[item.dimension];
  return (
    <div
      ref={nodeRef}
      {...hover}
      className="rounded-md border border-[#E6E7E8] bg-white px-2.5 py-2 transition-opacity"
      style={{ borderLeft: `3px solid ${meta.color}`, opacity: dim ? 0.3 : 1 }}
    >
      <div className="flex items-center gap-1.5">
        <span aria-hidden className="text-[11px]">{meta.icon}</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: meta.color }}>
          {meta.label}
        </span>
      </div>
      <p className="mt-0.5 text-[11.5px] font-semibold leading-snug text-[#3D5265]">{item.label}</p>
      <p className="mt-0.5 text-[10.5px] leading-snug text-[#5B6B7C]">{item.detail}</p>
      {item.indicator && item.signal?.latest && (
        <p
          className="mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9.5px] font-medium"
          style={{ backgroundColor: `${meta.color}12`, color: '#3D5265' }}
          title={item.indicator.description}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.signal.color }} />
          {item.indicator.name}: {fmt(item.signal.latest.value)} {item.indicator.unit} ({item.signal.latest.year})
        </p>
      )}
    </div>
  );
}

// ── Small bits ───────────────────────────────────────────────────────────────

function Sparkline({ series, color, w = 78, h = 26 }: {
  series: IndicatorDataPoint[];
  color: string;
  w?: number;
  h?: number;
}) {
  if (series.length < 2) return null;
  const pts = series.slice(-18);
  const xs = pts.map(p => p.year);
  const ys = pts.map(p => p.value);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const px = (yr: number) => 2 + ((yr - x0) / Math.max(1, x1 - x0)) * (w - 4);
  const py = (v: number) => (y1 === y0 ? h / 2 : 2 + ((y1 - v) / (y1 - y0)) * (h - 4));
  const dAttr = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${px(p.year).toFixed(1)} ${py(p.value).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} aria-hidden>
      <path d={dAttr} fill="none" stroke={color} strokeWidth={1.4} opacity={0.85} />
      <circle cx={px(last.year)} cy={py(last.value)} r={2.2} fill={color} />
    </svg>
  );
}

function StatusBar({ counts }: { counts: Record<RecommendationStatus, number> }) {
  const total = REC_STATUS_ORDER.reduce((s, k) => s + counts[k], 0);
  if (total === 0) return null;
  const tip = REC_STATUS_ORDER
    .filter(k => counts[k] > 0)
    .map(k => `${counts[k]} ${REC_STATUS_META[k].label.toLowerCase()}`)
    .join(' · ');
  return (
    <span className="flex h-2 w-24 overflow-hidden rounded-full" title={`Chapter uptake: ${tip}`}>
      {REC_STATUS_ORDER.map(k =>
        counts[k] > 0 ? (
          <span
            key={k}
            style={{ width: `${(counts[k] / total) * 100}%`, backgroundColor: REC_STATUS_META[k].color }}
          />
        ) : null,
      )}
    </span>
  );
}
