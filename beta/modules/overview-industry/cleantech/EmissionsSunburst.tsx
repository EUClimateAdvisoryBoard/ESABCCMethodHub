'use client';

/**
 * Clean Tech — ONE figure: the manufacturing emissions wheel.
 * ---------------------------------------------------------------------------
 * A single collapsible sunburst of EU manufacturing (NACE Rev. 2.1 Section C)
 * decarbonisation, and nothing else:
 *
 *   centre   — Section C "Manufacturing", showing the total Mt CO₂ drawn;
 *   ring 1   — the NACE divisions the catalogue covers (17, 19, 20, 23, 24,
 *              10–12), each arc sized by the summed emissions below it;
 *   ring 2   — the subsectors, sized by their sourced Mt CO₂ figure
 *              (`EMISSIONS_MAP`); where the source cannot split a figure
 *              (cement & lime; the chemicals block) the block is divided
 *              evenly for layout only and flagged as such;
 *   ring 3   — each subsector's decarbonisation levers (equal slices of the
 *              parent, layout only).
 *
 * Every level collapses: click an arc to fold its children into it (emissions
 * combine upward) or to open them again (decompose downward); the depth
 * presets fold the whole wheel to any level at once. The connected panel shows,
 * per subsector and per lever, the marginal abatement cost, readiness,
 * barriers, the scaling problem and the real investment decisions (FIDs) —
 * every data point with its source link, nothing invented.
 */

import { useMemo, useRef, useState } from 'react';
import {
  CATALOGUE,
  BRANCH_COLORS,
  CROSS_CUTTING_ENABLERS,
  EMISSIONS_MAP,
  EMISSIONS_MAP_UNSIZED,
  MANUFACTURING_SECTION,
  TECH_METRICS,
  TECH_CLASSIFICATION,
  TECH_CLASS_META,
  type EmissionsMapBlock,
  type Project,
  type Source,
  type Sourced,
  type Subsector,
  type Technology,
  type TechClass,
} from '../cleantech-catalogue';
import {
  NACE_21_INDEX,
  NACE_21_SOURCE,
  naceAncestors,
  naceUri,
  type NaceItem,
} from '../nace-2-1';

/* ----------------------------------------------------------------- helpers */

function SourceLink({ source }: { source: Source }) {
  const label = [source.org, source.year].filter(Boolean).join(', ');
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${source.title}${source.year ? ` (${source.year})` : ''} — ${source.url}`}
      className="inline-flex items-center gap-0.5 align-baseline text-[10.5px] font-medium text-primary-light hover:text-primary hover:underline"
    >
      <span aria-hidden>↗</span>
      <span>{label || 'source'}</span>
    </a>
  );
}

/** Clean-tech vs old-tech pill (with the definition on hover). */
function ClassBadge({ techClass, showDot = false }: { techClass: TechClass; showDot?: boolean }) {
  const meta = TECH_CLASS_META[techClass];
  return (
    <span
      title={meta.definition}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[9px] font-semibold"
      style={{ color: meta.color, borderColor: meta.color, background: `${meta.color}14` }}
    >
      {showDot ? <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} aria-hidden /> : null}
      {meta.label}
    </span>
  );
}

function DataLeaf({ label, datum, accent }: { label: string; datum?: Sourced; accent: string }) {
  if (!datum) return null;
  return (
    <div className="rounded-md border border-grey-200 bg-white p-2.5 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]">
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: accent }} aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">{label}</span>
      </div>
      <div className="mt-1 text-[12px] leading-snug text-grey-800 dark:text-[var(--mh-fg)]">
        {datum.value}
        {datum.note ? <span className="text-grey-500 dark:text-[var(--mh-muted)]"> — {datum.note}</span> : null}
      </div>
      <div className="mt-1">
        <SourceLink source={datum.source} />
      </div>
    </div>
  );
}

const STATUS_STYLE: Record<Project['status'], { label: string; cls: string }> = {
  operational: { label: 'Operational', cls: 'bg-surface-green text-secondary-dark border-secondary-lighter dark:bg-[var(--mh-bg)]' },
  construction: { label: 'Under construction', cls: 'bg-surface-blue text-primary border-primary-lighter dark:bg-[var(--mh-bg)]' },
  fid: { label: 'FID taken', cls: 'bg-surface-teal text-secondary-dark border-secondary-lighter dark:bg-[var(--mh-bg)]' },
  // Finding #15: light-mode text-accent-orange on bg-surface-orange was ≈1.87:1 (fails WCAG AA);
  // #7A4400 on the same peach surface is ≈6.9:1. In dark mode the peach surface is swapped for
  // --mh-bg, where #7A4400 would itself fail (≈2.3:1), so dark mode keeps text-accent-orange
  // (≈8.5:1 on --mh-bg).
  announced: { label: 'Announced (pre-FID)', cls: 'bg-surface-orange text-[#7A4400] border-accent-orange dark:bg-[var(--mh-bg)] dark:text-accent-orange' },
  pilot: { label: 'Pilot / demo', cls: 'bg-surface-yellow text-tertiary border-grey-300 dark:bg-[var(--mh-bg)] dark:border-[var(--mh-border)] dark:text-[var(--mh-fg)]' },
  cancelled: { label: 'Cancelled', cls: 'bg-grey-100 text-accent-red border-grey-300 dark:bg-[var(--mh-bg)] dark:border-[var(--mh-border)]' },
};

function ProjectRow({ project }: { project: Project }) {
  const s = STATUS_STYLE[project.status];
  return (
    <div className="rounded-md border border-grey-200 bg-white p-2.5 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`inline-block rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${s.cls}`}>{s.label}</span>
        <span className="text-[12px] font-semibold text-grey-900 dark:text-[var(--mh-fg)]">{project.name}</span>
      </div>
      <div className="mt-0.5 text-[11px] text-grey-600 dark:text-[var(--mh-muted)]">
        {[project.company, project.location, project.capacity].filter(Boolean).join(' · ')}
      </div>
      {project.fid ? (
        <div className="mt-0.5 text-[11px] text-tertiary dark:text-[var(--mh-muted)]">
          <span className="font-semibold">Investment decision: </span>
          {project.fid}
        </div>
      ) : null}
      <div className="mt-1">
        <SourceLink source={project.source} />
      </div>
    </div>
  );
}

/** 1–9 technology-readiness scale as pips. */
function TrlScale({ low, high }: { low: number; high: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 9 }, (_, i) => {
        const n = i + 1;
        const on = n >= low && n <= high;
        return (
          <span
            key={n}
            title={`TRL ${n}`}
            className={`flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold ${
              // Finding #15: text-grey-400 on bg-grey-100 was ≈1.69:1 (fails WCAG AA); text-tertiary
              // on bg-grey-200 is ≈6.5:1. Dark-mode pair (mh-muted on mh-border) is ≈4.5:1.
              on ? 'text-white' : 'text-tertiary bg-grey-200 dark:bg-[var(--mh-border)] dark:text-[var(--mh-muted)]'
            }`}
            style={on ? { background: n <= 5 ? '#B45309' : n <= 7 ? '#CA8A04' : '#15803D' } : undefined}
          >
            {n}
          </span>
        );
      })}
    </div>
  );
}

/** Inline MAC range bar (single lever), €/tCO₂ on a shared scale. */
function MacBar({ low, high, note }: { low: number; high: number; note?: string }) {
  const MIN = -70;
  const MAX = 400;
  const span = MAX - MIN;
  const clamp = (v: number) => Math.max(MIN, Math.min(MAX, v));
  const l = ((clamp(low) - MIN) / span) * 100;
  const w = ((clamp(high) - clamp(low)) / span) * 100;
  const zero = ((0 - MIN) / span) * 100;
  return (
    <div>
      <div className="relative h-5 w-full rounded bg-grey-100 dark:bg-[var(--mh-bg)]">
        <div className="absolute top-0 bottom-0 border-l border-grey-300 dark:border-[var(--mh-border)]" style={{ left: `${zero}%` }} />
        <div
          className="absolute top-1 bottom-1 rounded"
          style={{ left: `${l}%`, width: `${Math.max(w, 1.5)}%`, background: low < 0 ? '#15803D' : '#0065A4' }}
        />
      </div>
      <div className="mt-0.5 flex justify-between text-[9px] text-grey-400 dark:text-[var(--mh-muted)]">
        <span>−70</span>
        <span>€0</span>
        <span>€400+/tCO₂</span>
      </div>
      <div className="mt-0.5 text-[12px] font-semibold text-grey-900 dark:text-[var(--mh-fg)]">
        €{low}–{high}/tCO₂{note ? <span className="ml-1 text-[10px] font-normal text-grey-500 dark:text-[var(--mh-muted)]">({note})</span> : null}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- wheel colours */

/** Mix a hex colour toward white (f > 0) or black (f < 0), f ∈ [−1, 1]. */
function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => {
    const t = f >= 0 ? c + (255 - c) * f : c * (1 + f);
    return Math.round(Math.max(0, Math.min(255, t)));
  };
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

/* ------------------------------------------------------------- wheel model */

type NodeKind = 'root' | 'division' | 'subsector' | 'lever';

interface WheelNode {
  id: string;
  kind: NodeKind;
  /** Full display name. */
  label: string;
  /** Compact label drawn on the arc. */
  short: string;
  /** Drawn size, Mt CO₂ (aggregated for branches; layout-only where flagged). */
  mt: number;
  /**
   * True when `mt` is the sourced figure itself (or an exact sum of sourced
   * figures); false where a shared block was split evenly for layout, or a
   * lever slice divides its parent's angle.
   */
  exact: boolean;
  color: string;
  depth: number;
  children: WheelNode[];
  /** Angular span, set by layout (radians from 12 o'clock, clockwise). */
  a0: number;
  a1: number;
  // payload
  sub?: Subsector;
  tech?: Technology;
  block?: EmissionsMapBlock;
  naceCode?: string;
  /** Clean-tech vs old-tech class (levers only). */
  techClass?: TechClass;
}

const SHORT_NAME: Record<string, string> = {
  steel: 'Iron & steel',
  aluminium: 'Aluminium',
  cement: 'Cement',
  lime: 'Lime',
  glass: 'Glass',
  ceramics: 'Ceramics',
  ammonia: 'Ammonia',
  hvc: 'HVC / cracking',
  chloralkali: 'Chlor-alkali',
  methanol: 'Methanol',
  refining: 'Refining',
  pulppaper: 'Pulp & paper',
  fooddrink: 'Food & drink',
};

/** The NACE Rev. 2.1 division a code belongs to (self or nearest ancestor). */
function divisionOf(code: string): NaceItem | undefined {
  const self = NACE_21_INDEX[code];
  return [self, ...naceAncestors(code)].find(n => n?.level === 'division');
}

/**
 * Build the full wheel: root (Section C) → divisions → subsectors → levers.
 * Sizes come exclusively from `EMISSIONS_MAP` (sourced Mt CO₂ per block);
 * shared blocks are divided evenly for layout only and flagged `exact: false`.
 */
function buildWheel(): { root: WheelNode; index: Map<string, WheelNode> } {
  // fooddrink spans whole divisions 10–12, which the source cannot split —
  // shown as one combined division arc rather than three invented ones.
  const DIVISION_OVERRIDE: Record<string, { code: string; label: string }> = {
    fooddrink: { code: '10–12', label: 'Food products, beverages & tobacco (divisions 10–12)' },
  };

  interface SubEntry {
    sub: Subsector;
    block: EmissionsMapBlock;
    mt: number;
    exact: boolean;
    divKey: string;
    divLabel: string;
  }

  const entries: SubEntry[] = [];
  EMISSIONS_MAP.forEach(block => {
    block.subsectorIds.forEach(id => {
      const sub = CATALOGUE.find(s => s.id === id);
      if (!sub) return;
      // A block is treated as "shared" (drawn as a starred, non-exact arc with the
      // shared-block caveat) either when the source lumps multiple subsectors
      // together (subsectorIds.length > 1), or when it's explicitly flagged
      // `shared: true` for a different reason (e.g. aluminium: a direct-emissions-only
      // figure that understates the sector's full, indirect-inclusive footprint).
      const shared = block.subsectorIds.length > 1 || !!block.shared;
      const override = DIVISION_OVERRIDE[sub.id];
      const div = override ?? divisionOf(sub.nace[0]);
      if (!div) return;
      entries.push({
        sub,
        block,
        mt: block.mt / block.subsectorIds.length,
        exact: !shared,
        divKey: div.code,
        divLabel: div.label,
      });
    });
  });

  const divisions = new Map<string, { label: string; subs: SubEntry[] }>();
  entries.forEach(e => {
    const d = divisions.get(e.divKey) ?? { label: e.divLabel, subs: [] };
    d.subs.push(e);
    divisions.set(e.divKey, d);
  });

  const divisionNodes: WheelNode[] = [...divisions.entries()]
    .map(([code, d]) => {
      const subs = [...d.subs].sort((a, b) => b.mt - a.mt);
      const branch = subs[0].sub.branch;
      const subNodes: WheelNode[] = subs.map(e => {
        const levers: WheelNode[] = e.sub.technologies.map((tech, i) => ({
          id: `lever:${tech.id}`,
          kind: 'lever' as const,
          label: tech.name,
          short: tech.name,
          mt: e.mt / e.sub.technologies.length,
          exact: false,
          color: shade(BRANCH_COLORS[e.sub.branch], 0.32 + 0.13 * (i % 4)),
          depth: 3,
          children: [],
          a0: 0,
          a1: 0,
          sub: e.sub,
          tech,
          techClass: TECH_CLASSIFICATION[tech.id]?.class,
        }));
        return {
          id: `sub:${e.sub.id}`,
          kind: 'subsector' as const,
          label: e.sub.name,
          short: SHORT_NAME[e.sub.id] ?? e.sub.name,
          mt: e.mt,
          exact: e.exact,
          color: BRANCH_COLORS[e.sub.branch],
          depth: 2,
          children: levers,
          a0: 0,
          a1: 0,
          sub: e.sub,
          block: e.block,
        };
      });
      return {
        id: `div:${code}`,
        kind: 'division' as const,
        label: d.label,
        short: code,
        mt: subs.reduce((n, e) => n + e.mt, 0),
        exact: subs.every(e => e.exact),
        color: shade(BRANCH_COLORS[branch], -0.28),
        depth: 1,
        children: subNodes,
        a0: 0,
        a1: 0,
        naceCode: code,
      };
    })
    .sort((a, b) => b.mt - a.mt);

  const root: WheelNode = {
    id: 'root',
    kind: 'root',
    label: 'NACE Rev. 2.1 Section C — Manufacturing',
    short: 'Section C',
    mt: divisionNodes.reduce((n, d) => n + d.mt, 0),
    exact: true,
    color: '#2c2d2d',
    depth: 0,
    children: divisionNodes,
    a0: 0,
    a1: 2 * Math.PI,
  };

  // angles: children partition the parent's span proportionally to Mt —
  // independent of collapse state, so folding never re-shuffles the wheel.
  const assign = (node: WheelNode) => {
    let a = node.a0;
    const span = node.a1 - node.a0;
    node.children.forEach(child => {
      child.a0 = a;
      a += (child.mt / node.mt) * span;
      child.a1 = a;
      assign(child);
    });
  };
  assign(root);

  const index = new Map<string, WheelNode>();
  const walk = (n: WheelNode) => {
    index.set(n.id, n);
    n.children.forEach(walk);
  };
  walk(root);

  return { root, index };
}

/* ----------------------------------------------------------- svg geometry */

const R_CENTER = 68;
const RING = [0, 54, 80, 46]; // thickness per depth (index = depth)
const R_AT = (depth: number) => {
  let r = R_CENTER;
  for (let d = 1; d <= depth; d++) r += RING[d];
  return r;
};
const R_MAX = R_AT(3);

const polar = (r: number, a: number): [number, number] => [Math.sin(a) * r, -Math.cos(a) * r];

function arcPath(r0: number, r1: number, a0: number, a1: number): string {
  const pad = Math.min(0.005, (a1 - a0) / 5);
  const b0 = a0 + pad;
  const b1 = a1 - pad;
  const large = b1 - b0 > Math.PI ? 1 : 0;
  const [x0, y0] = polar(r1, b0);
  const [x1, y1] = polar(r1, b1);
  const [x2, y2] = polar(r0, b1);
  const [x3, y3] = polar(r0, b0);
  return `M${x0},${y0}A${r1},${r1} 0 ${large} 1 ${x1},${y1}L${x2},${y2}A${r0},${r0} 0 ${large} 0 ${x3},${y3}Z`;
}

function labelTransform(a0: number, a1: number, rMid: number): string {
  const deg = (((a0 + a1) / 2) * 180) / Math.PI;
  return `rotate(${deg - 90}) translate(${rMid},0) rotate(${deg < 180 ? 0 : 180})`;
}

const fmtMt = (mt: number) => (mt >= 10 ? Math.round(mt).toString() : mt.toFixed(mt >= 1 ? 1 : 2));

/* ------------------------------------------------------------ the figure */

export default function EmissionsSunburst() {
  const { root, index } = useMemo(buildWheel, []);

  // levers folded by default: divisions + subsectors visible, detail on demand
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set([...index.values()].filter(n => n.kind === 'subsector').map(n => n.id)),
  );
  const [selectedId, setSelectedId] = useState<string>('root');
  // colour the outer (lever) ring by NACE branch, or by clean-tech vs old-tech
  const [colorMode, setColorMode] = useState<'branch' | 'class'>('branch');
  const wrapRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const selected = index.get(selectedId) ?? root;

  // clean vs old tally across every lever drawn in the wheel
  const classCounts = useMemo(() => {
    let clean = 0;
    let old = 0;
    CATALOGUE.forEach(s =>
      s.technologies.forEach(t => {
        const c = TECH_CLASSIFICATION[t.id]?.class;
        if (c === 'clean') clean += 1;
        else if (c === 'old') old += 1;
      }),
    );
    return { clean, old, total: clean + old };
  }, []);

  const toggle = (id: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  /** Fold the whole wheel so exactly the rings up to `depth` show. */
  const foldTo = (depth: number) =>
    setCollapsed(new Set([...index.values()].filter(n => n.depth === depth && n.children.length).map(n => n.id)));

  const clickArc = (node: WheelNode) => {
    setSelectedId(node.id);
    if (node.children.length) toggle(node.id);
  };

  // visible arcs: everything whose ancestors are all expanded
  const visible: WheelNode[] = useMemo(() => {
    const out: WheelNode[] = [];
    const walk = (n: WheelNode) => {
      if (n.depth > 0) out.push(n);
      if (!collapsed.has(n.id)) n.children.forEach(walk);
    };
    if (!collapsed.has(root.id)) root.children.forEach(walk);
    return out;
  }, [root, collapsed]);

  /* tooltip */
  /** Build the tooltip's HTML content for a node — shared by pointer-hover and keyboard focus. */
  const setTipContent = (node: WheelNode) => {
    const tip = tooltipRef.current;
    if (!tip) return;
    const m = node.tech ? TECH_METRICS[node.tech.id] : undefined;
    const mtLine =
      node.kind === 'lever'
        ? m?.macLowEur != null
          ? `MAC €${m.macLowEur}–${m.macHighEur}/tCO₂ · TRL ${m.trlLow}–${m.trlHigh}`
          : 'open for cost & readiness detail'
        : node.exact
          ? `≈${fmtMt(node.mt)} Mt CO₂`
          : `share of a ≈${fmtMt(node.block?.mt ?? node.mt)} Mt block (not split out in the source)`;
    const classMeta = node.techClass ? TECH_CLASS_META[node.techClass] : undefined;
    const classLine = classMeta
      ? `<div class="text-[10px] font-semibold" style="color:${classMeta.color}">● ${classMeta.label}</div>`
      : '';
    tip.innerHTML =
      `<div class="font-semibold text-[12px]">${node.kind === 'division' ? `${node.short} · ` : ''}${node.label}</div>` +
      `<div class="text-[10.5px] opacity-80">${mtLine}</div>` +
      classLine +
      `<div class="text-[10px] opacity-60">${node.children.length ? (collapsed.has(node.id) ? 'click to expand' : 'click to collapse') : 'click for detail'}</div>`;
    tip.style.opacity = '1';
  };
  /** Pointer-hover: content + position tracking the cursor. */
  const showTip = (e: React.PointerEvent, node: WheelNode) => {
    if (!tooltipRef.current || !wrapRef.current) return;
    setTipContent(node);
    moveTip(e);
  };
  const moveTip = (e: React.PointerEvent) => {
    const tip = tooltipRef.current;
    const wrap = wrapRef.current;
    if (!tip || !wrap) return;
    const r = wrap.getBoundingClientRect();
    tip.style.left = `${e.clientX - r.left + 14}px`;
    tip.style.top = `${e.clientY - r.top + 12}px`;
  };
  /** Keyboard focus: same content, positioned under the focused arc/circle. */
  const focusTip = (e: React.FocusEvent<SVGElement>, node: WheelNode) => {
    const tip = tooltipRef.current;
    const wrap = wrapRef.current;
    if (!tip || !wrap) return;
    setTipContent(node);
    const target = e.currentTarget.getBoundingClientRect();
    const r = wrap.getBoundingClientRect();
    tip.style.left = `${target.left - r.left + target.width / 2}px`;
    tip.style.top = `${target.top - r.top + target.height / 2}px`;
  };
  const hideTip = () => {
    if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
  };

  const V = R_MAX + 6;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      {/* ── the wheel ─────────────────────────────────────────────────────── */}
      <div ref={wrapRef} className="relative mx-auto w-full max-w-[620px] select-none">
        {/* depth presets — fold the whole wheel to one level */}
        <div className="mb-2 flex flex-wrap items-center justify-center gap-1">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">Fold to</span>
          {[
            { d: 0, label: 'Total' },
            { d: 1, label: 'Divisions' },
            { d: 2, label: 'Subsectors' },
            { d: 3, label: 'Levers' },
          ].map(p => (
            <button
              key={p.d}
              type="button"
              onClick={() => foldTo(p.d)}
              className="rounded-full border border-grey-300 bg-white px-2.5 py-0.5 text-[11px] font-medium text-tertiary hover:border-primary hover:text-primary dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)] dark:text-[var(--mh-muted)]"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* colour the lever ring by NACE branch, or by clean-tech vs old-tech */}
        <div className="mb-2 flex flex-wrap items-center justify-center gap-1">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">Colour levers</span>
          {(
            [
              { m: 'branch' as const, label: 'By branch' },
              { m: 'class' as const, label: 'Clean vs old' },
            ]
          ).map(o => {
            const on = colorMode === o.m;
            return (
              <button
                key={o.m}
                type="button"
                onClick={() => {
                  setColorMode(o.m);
                  if (o.m === 'class') foldTo(3); // open the lever ring so the split is visible
                }}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                  on
                    ? 'border-primary bg-primary text-white'
                    : 'border-grey-300 bg-white text-tertiary hover:border-primary hover:text-primary dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)] dark:text-[var(--mh-muted)]'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>

        <svg
          viewBox={`${-V} ${-V} ${2 * V} ${2 * V}`}
          role="group"
          aria-label="Collapsible sunburst of EU manufacturing emissions by NACE division, subsector and decarbonisation lever"
          className="block h-auto w-full"
          style={{ font: '10px var(--font-sans, system-ui, sans-serif)' }}
        >
          {visible.map(node => {
            const r0 = R_AT(node.depth - 1);
            const r1 = R_AT(node.depth);
            const rMid = (r0 + r1) / 2;
            const spanPx = (node.a1 - node.a0) * rMid;
            // in "clean vs old" mode, recolour the lever ring by class and let
            // the branch-coloured context rings recede
            const classColored = colorMode === 'class' && node.kind === 'lever' && node.techClass;
            const fill = classColored ? TECH_CLASS_META[node.techClass!].color : node.color;
            const dimmed = colorMode === 'class' && node.kind !== 'lever';
            const isCollapsed = collapsed.has(node.id);
            const active = node.id === selectedId;
            const textFill = luminance(fill) > 0.6 ? '#1f2937' : '#ffffff';
            const kindLabel =
              node.kind === 'division' ? 'NACE division' : node.kind === 'subsector' ? 'Subsector' : node.kind === 'lever' ? 'Decarbonisation lever' : '';
            const stateLabel = node.children.length
              ? isCollapsed
                ? 'collapsed, activate to expand'
                : 'expanded, activate to collapse'
              : 'activate for detail';
            const ariaLabel = `${kindLabel} ${node.label}, ${stateLabel}`;
            return (
              <g key={node.id}>
                <path
                  d={arcPath(r0, r1, node.a0, node.a1)}
                  fill={fill}
                  fillOpacity={dimmed ? 0.4 : node.kind === 'lever' ? 0.9 : 1}
                  stroke={active ? 'var(--mh-fg, #1f2937)' : 'var(--mh-card, #ffffff)'}
                  strokeWidth={active ? 2 : 0.8}
                  strokeLinejoin="round"
                  className="cursor-pointer transition-[filter] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                  tabIndex={0}
                  role="button"
                  aria-label={ariaLabel}
                  onClick={() => clickArc(node)}
                  onPointerEnter={e => showTip(e, node)}
                  onPointerMove={moveTip}
                  onPointerLeave={hideTip}
                  onFocus={e => focusTip(e, node)}
                  onBlur={hideTip}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                      e.preventDefault();
                      clickArc(node);
                    }
                  }}
                />
                {spanPx > 30 ? (
                  <text
                    pointerEvents="none"
                    textAnchor="middle"
                    transform={labelTransform(node.a0, node.a1, rMid)}
                    fill={textFill}
                    style={{ userSelect: 'none' }}
                  >
                    <tspan
                      x={0}
                      dy={node.kind === 'lever' || spanPx <= 52 ? '0.32em' : '-0.25em'}
                      fontSize={node.kind === 'division' ? 11 : 9.5}
                      fontWeight={600}
                    >
                      {node.kind === 'lever'
                        ? spanPx > 64
                          ? node.short.length > 26
                            ? `${node.short.slice(0, 24)}…`
                            : node.short
                          : ''
                        : node.short}
                    </tspan>
                    {node.kind !== 'lever' && spanPx > 52 ? (
                      <tspan x={0} dy="1.15em" fontSize={8.5} fontWeight={500} opacity={0.85}>
                        {node.exact ? `≈${fmtMt(node.mt)} Mt` : `~${fmtMt(node.mt)} Mt*`}
                        {isCollapsed && node.children.length ? ' ▸' : ''}
                      </tspan>
                    ) : null}
                  </text>
                ) : null}
              </g>
            );
          })}

          {/* centre — Section C, everything combined */}
          <circle
            r={R_CENTER - 2}
            fill={selectedId === 'root' ? 'var(--mh-bg, #f5f7f9)' : 'var(--mh-card, #ffffff)'}
            stroke="var(--mh-border, #d7dbdf)"
            className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
            tabIndex={0}
            role="button"
            aria-label={`NACE Section C — Manufacturing, ${collapsed.has('root') ? 'collapsed, activate to expand the wheel' : 'expanded, activate to combine everything into the total'}`}
            onClick={() => {
              setSelectedId('root');
              toggle('root');
            }}
            onPointerEnter={e => showTip(e, root)}
            onPointerMove={moveTip}
            onPointerLeave={hideTip}
            onFocus={e => focusTip(e, root)}
            onBlur={hideTip}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                setSelectedId('root');
                toggle('root');
              }
            }}
          >
            <title>
              NACE Section C — Manufacturing. Click to {collapsed.has('root') ? 'expand the wheel' : 'combine everything into the total'}.
            </title>
          </circle>
          <text textAnchor="middle" dy="-1.4em" pointerEvents="none" fontSize={12} fontWeight={700} fill="var(--mh-fg, #2c2d2d)">
            Section C
          </text>
          <text textAnchor="middle" dy="-0.2em" pointerEvents="none" fontSize={9} fill="var(--mh-muted, #6b7280)">
            Manufacturing
          </text>
          <text textAnchor="middle" dy="1.3em" pointerEvents="none" fontSize={13} fontWeight={800} fill="#0065A4">
            ≈{Math.round(root.mt)} Mt
          </text>
          <text textAnchor="middle" dy="2.9em" pointerEvents="none" fontSize={8} fill="var(--mh-muted, #9aa2ab)">
            CO₂(e)/yr drawn
          </text>
        </svg>

        <div
          ref={tooltipRef}
          className="pointer-events-none absolute z-20 rounded border border-grey-200 bg-white px-2.5 py-1.5 text-tertiary-dark shadow-lg transition-opacity duration-150 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)] dark:text-[var(--mh-fg)]"
          style={{ opacity: 0, maxWidth: 280 }}
        />

        {/* legend + honesty notes */}
        {colorMode === 'branch' ? (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            {(
              [
                ['Metals', BRANCH_COLORS.Metals],
                ['Non-metallic minerals', BRANCH_COLORS['Non-metallic minerals']],
                ['Chemicals & refining', BRANCH_COLORS['Chemicals & refining']],
                ['Other manufacturing', BRANCH_COLORS['Other manufacturing']],
              ] as const
            ).map(([label, color]) => (
              <span key={label} className="flex items-center gap-1.5 text-[10.5px] text-grey-600 dark:text-[var(--mh-muted)]">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5 text-[10.5px] text-grey-700 dark:text-[var(--mh-muted)]" title={TECH_CLASS_META.clean.definition}>
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: TECH_CLASS_META.clean.color }} />
              <span className="font-semibold">{TECH_CLASS_META.clean.label}</span> — {classCounts.clean} levers
            </span>
            <span className="flex items-center gap-1.5 text-[10.5px] text-grey-700 dark:text-[var(--mh-muted)]" title={TECH_CLASS_META.old.definition}>
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: TECH_CLASS_META.old.color }} />
              <span className="font-semibold">{TECH_CLASS_META.old.label}</span> — {classCounts.old} levers
            </span>
          </div>
        )}
        <p className="mt-1.5 text-center text-[10.5px] leading-relaxed text-grey-500 dark:text-[var(--mh-muted)]">
          Arc size = sourced Mt CO₂ ({fmtMt(root.mt)} Mt drawn). Inner ring = NACE divisions · middle = subsectors ·
          outer = decarbonisation levers (equal slices, layout only). Click any arc to collapse or expand it — emissions
          combine upward, decompose downward. *Starred figures share a block the source cannot split (cement &amp; lime;
          the chemicals block) and are drawn as an even split.{' '}
          {EMISSIONS_MAP_UNSIZED.map(u => (
            <span key={u.subsectorId} title={u.reason}>
              {' '}
              {u.label} is not drawn ({u.reason.split(' — ')[0]}).
            </span>
          ))}
        </p>
        <p className="mt-1 text-center text-[10.5px] leading-relaxed text-grey-500 dark:text-[var(--mh-muted)]">
          The total blends EU ETS 2023 activity data (steel, cement &amp; lime, refining, chemicals) with broader
          sector-association estimates on different boundaries and years (aluminium, glass, ceramics, pulp &amp;
          paper, food &amp; drink) — see each block&apos;s scope badge for its exact basis.
        </p>
        {colorMode === 'class' ? (
          <p className="mt-1 text-center text-[10.5px] leading-relaxed text-grey-500 dark:text-[var(--mh-muted)]">
            <span className="font-semibold text-grey-600 dark:text-[var(--mh-fg)]">Clean vs old is an analytical overlay</span> — the near-zero
            endpoints ({classCounts.clean}) vs the incumbent-based transitional bridges ({classCounts.old}, gas/&ldquo;blue&rdquo;
            routes, blast-furnace CCS, fossil fuel-switching). It is a MethodHub judgement layered on the sourced data, not
            an external taxonomy; open a lever for its rationale.
          </p>
        ) : null}
      </div>

      {/* ── connected detail panel ────────────────────────────────────────── */}
      <aside className="rounded-xl border border-grey-200 bg-white p-4 shadow-sm lg:sticky lg:top-4 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]">
        <DetailPanel
          node={selected}
          onSelect={setSelectedId}
          onShowClasses={() => {
            setColorMode('class');
            foldTo(3);
          }}
        />
      </aside>

      {/* ── cross-cutting enablers — held outside the manufacturing tree, but ── */}
      {/* ── surfaced here so they aren't Excel-only (Finding #19) ────────────── */}
      <div className="lg:col-span-2">
        <CrossCuttingEnablers />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ detail panel */

function DetailPanel({
  node,
  onSelect,
  onShowClasses,
}: {
  node: WheelNode;
  onSelect: (id: string) => void;
  onShowClasses?: () => void;
}) {
  if (node.kind === 'root') {
    let clean = 0;
    let old = 0;
    CATALOGUE.forEach(s =>
      s.technologies.forEach(t => {
        const c = TECH_CLASSIFICATION[t.id]?.class;
        if (c === 'clean') clean += 1;
        else if (c === 'old') old += 1;
      }),
    );
    return (
      <div className="space-y-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">NACE Rev. 2.1 · Section C</div>
          <h3 className="text-base font-bold leading-snug text-grey-900 dark:text-[var(--mh-fg)]">
            Manufacturing — ≈{Math.round(node.mt)} Mt CO₂(e)/yr drawn
          </h3>
          <div className="mt-1 flex flex-wrap gap-x-3">
            <SourceLink source={MANUFACTURING_SECTION.source} />
            <SourceLink source={NACE_21_SOURCE} />
          </div>
        </div>
        <p className="text-[12px] leading-relaxed text-grey-600 dark:text-[var(--mh-muted)]">
          The wheel is scoped to NACE Rev. 2.1 Section&nbsp;C “Manufacturing” (divisions{' '}
          {MANUFACTURING_SECTION.divisionRange}). Every arc is sized by the best available sourced emissions figure —
          EU ETS 2023 activity data where it exists, sector-scope figures elsewhere; hover an arc for its exact scope.
          Click a division to open its subsectors, a subsector for its levers, and any arc again to fold it back in.
          Cross-cutting enablers that sit outside Section C (electrification, CO₂ transport &amp; storage, hydrogen,
          circularity) are covered separately, below the wheel.
        </p>

        {/* clean-tech vs old-tech split */}
        <div className="rounded-lg border border-grey-200 bg-grey-50 p-2.5 dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)]">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">Clean tech vs old tech</div>
          <div className="mt-1.5 flex overflow-hidden rounded" title={`${clean} clean · ${old} old`}>
            <div
              className="flex items-center justify-center py-1 text-[10px] font-bold text-white"
              style={{ width: `${(clean / (clean + old)) * 100}%`, background: TECH_CLASS_META.clean.color }}
            >
              {clean} clean
            </div>
            <div
              className="flex items-center justify-center py-1 text-[10px] font-bold text-white"
              style={{ width: `${(old / (clean + old)) * 100}%`, background: TECH_CLASS_META.old.color }}
            >
              {old} old
            </div>
          </div>
          <p className="mt-1.5 text-[10.5px] leading-snug text-grey-600 dark:text-[var(--mh-muted)]">
            Of the {clean + old} decarbonisation levers, <span className="font-semibold" style={{ color: TECH_CLASS_META.clean.color }}>{clean} are near-zero &ldquo;clean tech&rdquo;</span> and{' '}
            <span className="font-semibold" style={{ color: TECH_CLASS_META.old.color }}>{old} are incumbent-based &ldquo;old / transitional&rdquo;</span> routes (natural-gas &amp; &ldquo;blue&rdquo; hydrogen, blast-furnace CCS, fossil fuel-switching). An analytical overlay, not a sourced datum.
          </p>
          {onShowClasses ? (
            <button
              type="button"
              onClick={onShowClasses}
              className="mt-1.5 inline-block rounded-full border border-primary bg-white px-2.5 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary hover:text-white dark:bg-[var(--mh-card)]"
            >
              Colour the wheel by clean vs old →
            </button>
          ) : null}
        </div>

        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">
            {node.children.length} divisions covered
          </div>
          <div className="space-y-0.5">
            {node.children.map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelect(d.id)}
                className="flex w-full items-baseline gap-2 rounded px-1.5 py-1 text-left hover:bg-grey-50 dark:hover:bg-[var(--mh-bg)]"
              >
                <span className="font-mono text-[11px] font-bold" style={{ color: d.color }}>
                  {d.short}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-grey-700 dark:text-[var(--mh-muted)]">{d.label}</span>
                <span className="text-[11px] font-semibold text-grey-500 dark:text-[var(--mh-muted)]">≈{fmtMt(d.mt)} Mt</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (node.kind === 'division') {
    return (
      <div className="space-y-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded bg-grey-100 px-1.5 py-0.5 font-mono text-xs font-bold text-primary dark:bg-[var(--mh-bg)]">{node.short}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">NACE division</span>
          </div>
          <h3 className="text-base font-bold leading-snug text-grey-900 dark:text-[var(--mh-fg)]">{node.label}</h3>
          {node.naceCode && NACE_21_INDEX[node.naceCode] ? (
            <a
              href={naceUri(node.naceCode)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary-light hover:text-primary hover:underline"
            >
              ↗ Publications Office concept URI
            </a>
          ) : null}
        </div>
        <div className="rounded-lg bg-grey-50 p-2.5 text-[12px] text-grey-800 dark:bg-[var(--mh-bg)] dark:text-[var(--mh-fg)]">
          <span className="font-bold text-grey-900 dark:text-[var(--mh-fg)]">≈{fmtMt(node.mt)} Mt CO₂(e)/yr</span> — the sum of the sourced
          subsector figures below{node.exact ? '' : ' (includes evenly-split shared blocks, marked *)'}.
        </div>
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">
            {node.children.length} subsector{node.children.length > 1 ? 's' : ''}
          </div>
          <div className="space-y-0.5">
            {node.children.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s.id)}
                className="flex w-full items-baseline gap-2 rounded px-1.5 py-1 text-left hover:bg-grey-50 dark:hover:bg-[var(--mh-bg)]"
              >
                <span className="inline-block h-2.5 w-2.5 flex-none self-center rounded-sm" style={{ background: s.color }} />
                <span className="min-w-0 flex-1 truncate text-[12px] text-grey-700 dark:text-[var(--mh-muted)]">{s.label}</span>
                <span className="text-[11px] font-semibold text-grey-500 dark:text-[var(--mh-muted)]">
                  {s.exact ? '≈' : '~'}
                  {fmtMt(s.mt)} Mt{s.exact ? '' : '*'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (node.kind === 'subsector' && node.sub) {
    const sub = node.sub;
    const block = node.block;
    return (
      <div className="space-y-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: node.color }}>
              {sub.branch}
            </span>
            {sub.nace.map(c => (
              <a
                key={c}
                href={naceUri(c)}
                target="_blank"
                rel="noopener noreferrer"
                title={NACE_21_INDEX[c] ? `${c} ${NACE_21_INDEX[c].label}` : c}
                className="rounded-full border border-grey-300 bg-grey-50 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-tertiary hover:border-primary hover:text-primary dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-muted)]"
              >
                {c}
              </a>
            ))}
          </div>
          <h3 className="text-base font-bold leading-snug text-grey-900 dark:text-[var(--mh-fg)]">{sub.name}</h3>
        </div>

        {block ? (
          <div className="rounded-lg bg-grey-50 p-2.5 dark:bg-[var(--mh-bg)]">
            <div className="text-[12px] text-grey-800 dark:text-[var(--mh-fg)]">
              <span className="font-bold text-grey-900 dark:text-[var(--mh-fg)]">≈{fmtMt(block.mt)} Mt CO₂</span>{' '}
              <span className="rounded-full bg-grey-200 px-1.5 py-px text-[9px] font-semibold text-grey-600 dark:bg-[var(--mh-border)] dark:text-[var(--mh-muted)]">{block.scope}</span>
              {block.subsectorIds.length > 1 ? (
                <span className="text-grey-500 dark:text-[var(--mh-muted)]">
                  {' '}
                  — one block covering {block.subsectorIds.length} subsectors; the source does not split it, so the wheel
                  draws an even share.
                </span>
              ) : null}
            </div>
            {block.note ? <p className="mt-0.5 text-[10.5px] leading-snug text-grey-500 dark:text-[var(--mh-muted)]">{block.note}</p> : null}
            <div className="mt-1">
              <SourceLink source={block.source} />
            </div>
          </div>
        ) : null}

        <p className="text-[12px] leading-relaxed text-grey-600 dark:text-[var(--mh-muted)]">{sub.summary}</p>

        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">EU emission profile</div>
          <ul className="space-y-1">
            {sub.emissions.map((e, i) => (
              <li key={i} className="text-[12px] leading-snug text-grey-800 dark:text-[var(--mh-fg)]">
                <span className="font-semibold">{e.value}</span>
                {e.note ? <span className="text-grey-500 dark:text-[var(--mh-muted)]"> — {e.note}</span> : null} <SourceLink source={e.source} />
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">
            {node.children.length} decarbonisation levers — cost, readiness, barriers &amp; investment decisions
          </div>
          <div className="space-y-1">
            {node.children.map(l => {
              const m = l.tech ? TECH_METRICS[l.tech.id] : undefined;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => onSelect(l.id)}
                  className="flex w-full items-baseline gap-2 rounded border border-grey-200 px-2 py-1.5 text-left hover:border-primary hover:bg-grey-50 dark:border-[var(--mh-border)] dark:hover:bg-[var(--mh-bg)]"
                >
                  <span className="inline-block h-2.5 w-2.5 flex-none self-center rounded-sm" style={{ background: l.color }} />
                  <span className="min-w-0 flex-1 text-[12px] font-medium text-grey-800 dark:text-[var(--mh-fg)]">{l.label}</span>
                  {l.techClass ? <ClassBadge techClass={l.techClass} showDot /> : null}
                  <span className="whitespace-nowrap text-[10px] text-grey-500 dark:text-[var(--mh-muted)]">
                    {m?.macLowEur != null ? `€${m.macLowEur}–${m.macHighEur}/t` : 'MAC: see detail'}
                    {m ? ` · TRL ${m.trlLow}–${m.trlHigh}` : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (node.kind === 'lever' && node.tech && node.sub) {
    const tech = node.tech;
    const sub = node.sub;
    const m = TECH_METRICS[tech.id];
    const accent = BRANCH_COLORS[sub.branch];
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onSelect(`sub:${sub.id}`)}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          ← {sub.name}
        </button>
        <h3 className="text-base font-bold leading-snug text-grey-900 dark:text-[var(--mh-fg)]">{tech.name}</h3>
        <p className="text-[12px] leading-relaxed text-grey-600 dark:text-[var(--mh-muted)]">{tech.description}</p>

        {node.techClass ? (
          <div
            className="rounded-lg border p-2.5"
            style={{ borderColor: TECH_CLASS_META[node.techClass].color, background: `${TECH_CLASS_META[node.techClass].color}0d` }}
          >
            <div className="flex items-center gap-1.5">
              <ClassBadge techClass={node.techClass} showDot />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">Classification (analytical overlay)</span>
            </div>
            <p className="mt-1 text-[12px] leading-snug text-grey-800 dark:text-[var(--mh-fg)]">{TECH_CLASSIFICATION[tech.id]?.note}</p>
            <p className="mt-1 text-[10px] leading-snug text-grey-500 dark:text-[var(--mh-muted)]">
              {TECH_CLASS_META[node.techClass].definition} A MethodHub judgement layered on the sourced data below, not an external taxonomy.
            </p>
          </div>
        ) : null}

        <div className="rounded-lg border border-grey-200 bg-white p-2.5 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">Marginal abatement cost</div>
          {m?.macLowEur != null && m.macHighEur != null ? (
            <MacBar low={m.macLowEur} high={m.macHighEur} note={m.costNote} />
          ) : tech.mac ? (
            <div className="text-[12px] text-grey-900 dark:text-[var(--mh-fg)]">{tech.mac.value}</div>
          ) : (
            <div className="text-[12px] text-grey-400 dark:text-[var(--mh-muted)]">Not quantified — see the barrier entries below.</div>
          )}
          <div className="mt-1 flex flex-wrap gap-x-3">
            {m?.macSource ? <SourceLink source={m.macSource} /> : null}
            {tech.mac && tech.mac.source.url !== m?.macSource?.url ? <SourceLink source={tech.mac.source} /> : null}
          </div>
        </div>

        <div className="rounded-lg border border-grey-200 bg-white p-2.5 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">
            Technology readiness (TRL 1–9)
          </div>
          {m ? <TrlScale low={m.trlLow} high={m.trlHigh} /> : null}
          {tech.trl ? (
            <div className="mt-1 text-[11px] text-grey-600 dark:text-[var(--mh-muted)]">
              {tech.trl.value} <SourceLink source={tech.trl.source} />
            </div>
          ) : null}
        </div>

        <DataLeaf label="Scale & availability" datum={tech.availability} accent={accent} />

        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">
            Barriers — cost drivers · readiness · scaling problem
          </div>
          <div className="grid gap-1.5">
            <DataLeaf label="Cost drivers" datum={tech.rationale.costDrivers} accent="#B83230" />
            <DataLeaf label="Readiness barriers" datum={tech.rationale.readinessBarriers} accent="#FF9933" />
            <DataLeaf label="Scaling problem" datum={tech.rationale.scaleProblems} accent="#6667AB" />
          </div>
        </div>

        {tech.projects.length ? (
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">
              Investment decisions &amp; project pipeline ({tech.projects.length})
            </div>
            <div className="grid gap-1.5">
              {tech.projects.map((p, i) => (
                <ProjectRow key={i} project={p} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return null;
}

/* -------------------------------------------------- cross-cutting enablers */

/**
 * Finding #19 — `CROSS_CUTTING_ENABLERS` (electrification/heat pumps, CO₂
 * transport & storage, clean hydrogen, circular economy) is sourced data that
 * previously rendered nowhere but the Excel export. These four subsectors sit
 * outside NACE Section C (see `cleantech-catalogue.ts`'s own docstring) so
 * they are drawn as a separate collapsible block below the wheel rather than
 * as a wheel arc — but every field (status pill, MAC/TRL via `TECH_METRICS`,
 * project fid/source rows) reuses the same row/leaf presentation as the
 * in-wheel subsector & lever detail panels above, so the styling matches.
 */
function CrossCuttingEnablers() {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-xl border border-grey-200 bg-white p-4 shadow-sm dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">
            Beyond the wheel — held outside NACE Section C
          </div>
          <h3 className="text-base font-bold leading-snug text-grey-900 dark:text-[var(--mh-fg)]">
            Cross-cutting enablers — electrification, CO₂ transport &amp; storage, hydrogen, circularity
          </h3>
          <p className="mt-1 text-[12px] leading-snug text-grey-600 dark:text-[var(--mh-muted)]">
            {open
              ? 'Four enabling levers the manufacturing subsectors above depend on — same cost, readiness and project-pipeline evidence as any subsector, just not a NACE Section C activity in its own right.'
              : `${CROSS_CUTTING_ENABLERS.length} enabling levers (electrification & heat pumps, CO₂ transport & storage networks, clean hydrogen supply, circular economy) that the wheel's manufacturing subsectors depend on but that are not Section C activities themselves — click to expand.`}
          </p>
        </div>
        <span
          aria-hidden
          className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-grey-300 text-[15px] font-bold text-tertiary dark:border-[var(--mh-border)] dark:text-[var(--mh-muted)]"
        >
          {open ? '−' : '+'}
        </span>
      </button>

      {open ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {CROSS_CUTTING_ENABLERS.map(sub => (
            <EnablerCard key={sub.id} sub={sub} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function EnablerCard({ sub }: { sub: Subsector }) {
  const accent = BRANCH_COLORS[sub.branch];
  return (
    <div className="rounded-lg border border-grey-200 bg-grey-50 p-3 dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)]">
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: accent }}>
          {sub.branch}
        </span>
        {sub.nace.map(c => (
          <span
            key={c}
            title={NACE_21_INDEX[c] ? `${c} ${NACE_21_INDEX[c].label}` : c}
            className="rounded-full border border-grey-300 bg-white px-1.5 py-0.5 font-mono text-[9px] font-semibold text-tertiary dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)] dark:text-[var(--mh-muted)]"
          >
            {c}
          </span>
        ))}
      </div>
      <h4 className="text-[14px] font-bold leading-snug text-grey-900 dark:text-[var(--mh-fg)]">{sub.name}</h4>
      {sub.naceNote ? (
        <p className="mt-0.5 text-[10px] leading-snug text-grey-500 dark:text-[var(--mh-muted)]">{sub.naceNote}</p>
      ) : null}
      <p className="mt-1 text-[12px] leading-relaxed text-grey-600 dark:text-[var(--mh-muted)]">{sub.summary}</p>

      <ul className="mt-2 space-y-1">
        {sub.emissions.map((e, i) => (
          <li key={i} className="text-[11.5px] leading-snug text-grey-800 dark:text-[var(--mh-fg)]">
            <span className="font-semibold">{e.value}</span>
            {e.note ? <span className="text-grey-500 dark:text-[var(--mh-muted)]"> — {e.note}</span> : null}{' '}
            <SourceLink source={e.source} />
          </li>
        ))}
      </ul>

      <div className="mt-3 space-y-3">
        {sub.technologies.map(tech => {
          const m = TECH_METRICS[tech.id];
          const cls = TECH_CLASSIFICATION[tech.id];
          return (
            <div
              key={tech.id}
              className="rounded-md border border-grey-200 bg-white p-2.5 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[12.5px] font-semibold text-grey-900 dark:text-[var(--mh-fg)]">{tech.name}</span>
                {cls ? <ClassBadge techClass={cls.class} showDot /> : null}
              </div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-grey-600 dark:text-[var(--mh-muted)]">{tech.description}</p>

              <div className="mt-2">
                <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">
                  Marginal abatement cost
                </div>
                {m?.macLowEur != null && m.macHighEur != null ? (
                  <MacBar low={m.macLowEur} high={m.macHighEur} note={m.costNote} />
                ) : tech.mac ? (
                  <div className="text-[12px] text-grey-900 dark:text-[var(--mh-fg)]">{tech.mac.value}</div>
                ) : (
                  <div className="text-[12px] text-grey-400 dark:text-[var(--mh-muted)]">Not quantified — see the barrier entries below.</div>
                )}
                <div className="mt-1 flex flex-wrap gap-x-3">
                  {m?.macSource ? <SourceLink source={m.macSource} /> : null}
                  {tech.mac && tech.mac.source.url !== m?.macSource?.url ? <SourceLink source={tech.mac.source} /> : null}
                </div>
              </div>

              <div className="mt-2">
                <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">
                  Technology readiness (TRL 1–9)
                </div>
                {m ? <TrlScale low={m.trlLow} high={m.trlHigh} /> : null}
                {tech.trl ? (
                  <div className="mt-1 text-[11px] text-grey-600 dark:text-[var(--mh-muted)]">
                    {tech.trl.value} <SourceLink source={tech.trl.source} />
                  </div>
                ) : null}
              </div>

              <div className="mt-2 grid gap-1.5">
                <DataLeaf label="Scale & availability" datum={tech.availability} accent={accent} />
                <DataLeaf label="Cost drivers" datum={tech.rationale.costDrivers} accent="#B83230" />
                <DataLeaf label="Readiness barriers" datum={tech.rationale.readinessBarriers} accent="#FF9933" />
                <DataLeaf label="Scaling problem" datum={tech.rationale.scaleProblems} accent="#6667AB" />
              </div>

              {tech.projects.length ? (
                <div className="mt-2">
                  <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">
                    Investment decisions &amp; project pipeline ({tech.projects.length})
                  </div>
                  <div className="grid gap-1.5">
                    {tech.projects.map((p, i) => (
                      <ProjectRow key={i} project={p} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
