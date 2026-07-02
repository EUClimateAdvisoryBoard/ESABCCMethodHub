'use client';

/**
 * NACE Rev. 2.1 — the whole classification as ONE connected radial figure.
 * ---------------------------------------------------------------------------
 * A zoomable sunburst of the COMPLETE official NACE Rev. 2.1 tree
 * (1 root → 22 sections → 87 divisions → 287 groups → 651 classes, nothing
 * omitted), with a detail panel wired to the same selection so the picture
 * and its detail are a single object rather than a chart-on-top /
 * text-list-below split.
 *
 * Design language borrowed from module 21 (EU Transition Panorama):
 *   - inner rings = broader activities, outer rings = finer ones, each arc
 *     sized by how many detailed classes it contains;
 *   - click an arc to zoom the wheel into it, click the centre to zoom back;
 *   - a live detail panel (breadcrumb, official Publications Office URI,
 *     sub-activities and — the connection to the rest of the page — the
 *     clean-tech catalogue subsectors mapped onto that code);
 *   - motion suppressed under `prefers-reduced-motion`.
 *
 * The catalogue → NACE mapping is exactly the one used everywhere else on
 * the page (`sub.nace`), so selecting a mapped code jumps straight back up
 * into the tree explorer.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  NACE_21,
  NACE_21_COUNTS,
  NACE_21_INDEX,
  NACE_21_SOURCE,
  naceAncestors,
  naceChildren,
  naceUri,
  type NaceItem,
  type NaceLevel,
} from '../nace-2-1';
import {
  CATALOGUE,
  BRANCH_COLORS,
  type Subsector,
} from '../cleantech-catalogue';
import { naceEmissionFor, NACE_EMISSIONS_BACKBONE } from '../nace-emissions-layer';

/* ----------------------------------------------------------------- types */

interface TreeDatum {
  code: string;
  label: string;
  level: NaceLevel | 'root';
  children?: TreeDatum[];
}

type SunNode = d3.HierarchyRectangularNode<TreeDatum> & {
  current: { x0: number; x1: number; y0: number; y1: number };
  target?: { x0: number; x1: number; y0: number; y1: number };
};

const ROOT_CODE = '__root';

/** Compact source pill (org + year) linking out to the evidence. */
function SrcLink({ source }: { source: { org: string; title: string; url: string; year?: string } }) {
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

const LEVEL_LABEL: Record<NaceLevel | 'root', string> = {
  root: 'Classification',
  section: 'Section',
  division: 'Division',
  group: 'Group',
  class: 'Class',
};

/* --------------------------------------------------------------- helpers */

/** Build the nested NACE tree (root → sections → divisions → groups → classes). */
function buildTree(): TreeDatum {
  const byCode = new Map<string, TreeDatum>(
    NACE_21.map(n => [n.code, { code: n.code, label: n.label, level: n.level, children: [] }]),
  );
  const root: TreeDatum = {
    code: ROOT_CODE,
    label: 'NACE Rev. 2.1',
    level: 'root',
    children: [],
  };
  NACE_21.forEach(n => {
    const node = byCode.get(n.code)!;
    const parent = n.parent ? byCode.get(n.parent)! : root;
    parent.children!.push(node);
  });
  return root;
}

/* ============================================================ the figure */

export default function NaceSunburst({ onSelectSub }: { onSelectSub: (id: string) => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgWrapRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ zoomTo: (code: string) => void } | null>(null);

  const [selectedCode, setSelectedCode] = useState<string>(ROOT_CODE);
  const [query, setQuery] = useState('');

  const onSelectSubRef = useRef(onSelectSub);
  onSelectSubRef.current = onSelectSub;

  // Catalogue → NACE coverage (identical rule to the tree explorer above):
  // `direct` = codes a subsector maps to; `hasMappedBelow` = any ancestor of
  // such a code (so we can flag branches that contain mapped activities).
  const coverage = useMemo(() => {
    const direct = new Map<string, Subsector[]>();
    CATALOGUE.forEach(sub =>
      sub.nace.forEach(code => {
        const list = direct.get(code) ?? [];
        list.push(sub);
        direct.set(code, list);
      }),
    );
    const hasMappedBelow = new Set<string>();
    direct.forEach((_subs, code) => {
      hasMappedBelow.add(code);
      naceAncestors(code).forEach(a => hasMappedBelow.add(a.code));
    });
    return { direct, hasMappedBelow };
  }, []);

  /** Subsectors mapped to a code directly, or inherited from a broader code. */
  const subsForCode = useMemo(
    () =>
      (code: string): { direct: Subsector[]; inherited: Subsector[] } => {
        const direct = coverage.direct.get(code) ?? [];
        const inherited: Subsector[] = [];
        naceAncestors(code).forEach(a =>
          coverage.direct.get(a.code)?.forEach(s => {
            if (!direct.includes(s) && !inherited.includes(s)) inherited.push(s);
          }),
        );
        return { direct, inherited };
      },
    [coverage],
  );

  // ── d3 sunburst (built once, driven imperatively like the panorama) ──────
  useEffect(() => {
    const svgWrap = svgWrapRef.current;
    const wrap = wrapRef.current;
    const tooltip = tooltipRef.current;
    if (!svgWrap || !wrap) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const RADIUS = 300; // svg is drawn in a 2·RADIUS box, scaled to fit
    const VISIBLE_RINGS = 3; // rings shown at once (window into a 4-deep tree)
    const U = RADIUS / (VISIBLE_RINGS + 1); // radial thickness of one ring
    // (ring 0 = the centre disc; rings 1..VISIBLE_RINGS fan outward to RADIUS)

    const data = buildTree();
    const hierarchy = d3
      .hierarchy<TreeDatum>(data)
      .sum(d => (d.children && d.children.length ? 0 : 1)) // arc size = #classes
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const root = d3
      .partition<TreeDatum>()
      .size([2 * Math.PI, hierarchy.height + 1])(hierarchy) as SunNode;
    root.each(d => {
      (d as SunNode).current = { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 };
    });

    // One hue per section; arcs shade lighter with depth. Rainbow gives 22
    // clearly separable hues; saturation is dialled back to sit calmly.
    const sections = root.children ?? [];
    const sectionColor = d3.scaleOrdinal<string, string>(
      sections.map(s => s.data.code),
      d3.quantize(d3.interpolateRainbow, sections.length + 1),
    );
    const fillFor = (d: SunNode): string => {
      let n: SunNode = d;
      while (n.depth > 1 && n.parent) n = n.parent as SunNode;
      const base = d3.hsl(sectionColor(n.data.code));
      base.s = Math.min(base.s * 0.62, 0.6);
      base.l = 0.4 + (d.depth - 1) * 0.13;
      return base.formatHex();
    };

    const arc = d3
      .arc<{ x0: number; x1: number; y0: number; y1: number }>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.004))
      .padRadius(RADIUS * 1.5)
      .innerRadius(d => d.y0 * U)
      .outerRadius(d => Math.max(d.y0 * U, d.y1 * U - 1))
      .cornerRadius(2);

    const arcVisible = (d: { x0: number; x1: number; y0: number; y1: number }) =>
      d.y1 <= VISIBLE_RINGS + 1 && d.y0 >= 1 && d.x1 > d.x0;
    const labelVisible = (d: { x0: number; x1: number; y0: number; y1: number }) =>
      d.y1 <= VISIBLE_RINGS + 1 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.028;

    const labelTransform = (d: { x0: number; x1: number; y0: number; y1: number }) => {
      const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
      const r = ((d.y0 + d.y1) / 2) * U;
      return `rotate(${x - 90}) translate(${r},0) rotate(${x < 180 ? 0 : 180})`;
    };

    const svg = d3
      .select(svgWrap)
      .append('svg')
      .attr('viewBox', `${-RADIUS - 6} ${-RADIUS - 6} ${2 * RADIUS + 12} ${2 * RADIUS + 12}`)
      .attr('role', 'group')
      .attr(
        'aria-label',
        'Zoomable radial sunburst of the complete NACE Rev. 2.1 classification',
      )
      .style('width', '100%')
      .style('height', 'auto')
      .style('display', 'block')
      .style('font', '10px var(--font-sans, system-ui, sans-serif)');

    const nodes = root.descendants().slice(1) as SunNode[]; // drop the root disc

    const path = svg
      .append('g')
      .selectAll<SVGPathElement, SunNode>('path')
      .data(nodes)
      .join('path')
      .attr('fill', d => fillFor(d))
      .attr('fill-opacity', d => (arcVisible(d.current) ? (d.children ? 0.92 : 0.72) : 0))
      .attr('pointer-events', d => (arcVisible(d.current) ? 'auto' : 'none'))
      .attr('stroke', d => (coverage.direct.has(d.data.code) ? '#2c2d2d' : '#ffffff'))
      .attr('stroke-width', d => (coverage.direct.has(d.data.code) ? 1.4 : 0.6))
      .attr('stroke-opacity', d => (arcVisible(d.current) ? 1 : 0))
      .attr('stroke-linejoin', 'round')
      .attr('d', d => arc(d.current) ?? '')
      .style('cursor', d => (d.children ? 'pointer' : 'default'));

    path
      .append('title')
      .text(
        d =>
          `${d.data.code} · ${d.data.label}\n${LEVEL_LABEL[d.data.level]}${
            coverage.direct.has(d.data.code) ? ' · mapped clean-tech subsector' : ''
          }`,
      );

    const label = svg
      .append('g')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .style('user-select', 'none')
      .selectAll<SVGTextElement, SunNode>('text')
      .data(nodes)
      .join('text')
      .attr('dy', '0.32em')
      .attr('fill', d => (d3.hsl(fillFor(d)).l > 0.62 ? '#2c2d2d' : '#ffffff'))
      .attr('fill-opacity', d => (labelVisible(d.current) ? 1 : 0))
      .attr('transform', d => labelTransform(d.current))
      .style('font-size', d => (d.depth === 1 ? '11px' : '9.5px'))
      .style('font-weight', d => (d.depth === 1 ? 600 : 500))
      .text(d => d.data.code);

    // Centre disc: zoom-out target + focus HUD.
    const parentNode = svg
      .append('circle')
      .datum(root)
      .attr('r', U)
      .attr('fill', '#ffffff')
      .attr('stroke', '#e6e8ea')
      .attr('pointer-events', 'all')
      .style('cursor', 'pointer');

    const centreCode = svg
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.2em')
      .attr('pointer-events', 'none')
      .style('font-size', '13px')
      .style('font-weight', 700)
      .attr('fill', '#2c2d2d')
      .text('NACE 2.1');
    const centreSub = svg
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.1em')
      .attr('pointer-events', 'none')
      .style('font-size', '9px')
      .attr('fill', '#6b7280')
      .text(`${NACE_21_COUNTS.total} activities`);

    // ── tooltip ──────────────────────────────────────────────────────────
    function showTip(event: PointerEvent, d: SunNode) {
      if (!tooltip || !wrap) return;
      const mapped = coverage.direct.get(d.data.code);
      tooltip.innerHTML =
        `<div class="font-semibold text-[12px]"><span class="font-mono">${d.data.code}</span> ${d.data.label}</div>` +
        `<div class="text-[10.5px] opacity-80">${LEVEL_LABEL[d.data.level]} · ${
          (d.value ?? 0) || 1
        } class${(d.value ?? 1) === 1 ? '' : 'es'}</div>` +
        (mapped
          ? `<div class="text-[10.5px] mt-0.5 font-medium" style="color:#0065A4">↳ ${mapped
              .map(s => s.name)
              .join(', ')}</div>`
          : '');
      tooltip.style.opacity = '1';
      moveTip(event);
    }
    function moveTip(event: PointerEvent) {
      if (!tooltip || !wrap) return;
      const r = wrap.getBoundingClientRect();
      tooltip.style.left = `${event.clientX - r.left + 14}px`;
      tooltip.style.top = `${event.clientY - r.top + 12}px`;
    }
    function hideTip() {
      if (tooltip) tooltip.style.opacity = '0';
    }

    // ── centre HUD text for a focus node ────────────────────────────────────
    function setCentre(p: SunNode) {
      if (p.depth === 0) {
        centreCode.text('NACE 2.1');
        centreSub.text(`${NACE_21_COUNTS.total} activities`);
      } else {
        centreCode.text(p.data.code);
        centreSub.text(`${LEVEL_LABEL[p.data.level]} · zoom out`);
      }
    }

    // ── zoom / selection ────────────────────────────────────────────────────
    let focus: SunNode = root;

    function zoomTo(p: SunNode) {
      focus = p;
      parentNode.datum(p.parent ?? root);
      setCentre(p);

      root.each(d => {
        const n = d as SunNode;
        n.target = {
          x0: Math.max(0, Math.min(1, (n.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          x1: Math.max(0, Math.min(1, (n.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          y0: Math.max(0, n.y0 - p.depth),
          y1: Math.max(0, n.y1 - p.depth),
        };
      });

      const t = svg.transition().duration(reduceMotion ? 0 : 720).ease(d3.easeCubicInOut);

      path
        .transition(t as never)
        .tween('data', d => {
          const i = d3.interpolate(d.current, d.target!);
          return (u: number) => {
            d.current = i(u);
          };
        })
        .filter(function (d) {
          return !!Number(d3.select(this).attr('fill-opacity')) || arcVisible(d.target!);
        })
        .attr('fill-opacity', d => (arcVisible(d.target!) ? (d.children ? 0.92 : 0.72) : 0))
        .attr('stroke-opacity', d => (arcVisible(d.target!) ? 1 : 0))
        .attr('pointer-events', d => (arcVisible(d.target!) ? 'auto' : 'none'))
        .attrTween('d', d => () => arc(d.current) ?? '');

      label
        .filter(function (d) {
          return !!Number(d3.select(this).attr('fill-opacity')) || labelVisible(d.target!);
        })
        .transition(t as never)
        .attr('fill-opacity', d => (labelVisible(d.target!) ? 1 : 0))
        .attrTween('transform', d => () => labelTransform(d.current));
    }

    function select(d: SunNode) {
      setSelectedCode(d.data.code);
      // zoom so the clicked node's children are on the outer ring: focus the
      // node itself if it has children, else focus its parent.
      const target = d.children ? d : ((d.parent ?? root) as SunNode);
      if (target !== focus) zoomTo(target);
    }

    path
      .on('click', (_event, d) => {
        hideTip();
        select(d);
      })
      .on('pointerenter', (event: PointerEvent, d) => showTip(event, d))
      .on('pointermove', (event: PointerEvent) => moveTip(event))
      .on('pointerleave', hideTip);

    parentNode.on('click', () => {
      const p = (parentNode.datum() as SunNode) ?? root;
      setSelectedCode(p.data.code);
      zoomTo(p);
    });

    // ── imperative API (search results / external jumps) ────────────────────
    const byCode = new Map<string, SunNode>((root.descendants() as SunNode[]).map(d => [d.data.code, d]));
    apiRef.current = {
      zoomTo(code: string) {
        const d = byCode.get(code);
        if (!d) return;
        setSelectedCode(code);
        const target = d.children ? d : ((d.parent ?? root) as SunNode);
        zoomTo(target);
      },
    };

    // entry: gentle spin-in of the wheel
    if (!reduceMotion) {
      const g = svg.selectAll('g');
      g.style('opacity', 0).transition().duration(700).style('opacity', 1);
    }

    return () => {
      apiRef.current = null;
      svg.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverage]);

  // ── detail panel data (React side) ───────────────────────────────────────
  const selected: NaceItem | null =
    selectedCode === ROOT_CODE ? null : NACE_21_INDEX[selectedCode] ?? null;
  const ancestors = selected ? naceAncestors(selected.code) : [];
  const kids = selected ? naceChildren(selected.code) : [];
  const mapped = selected ? subsForCode(selected.code) : { direct: [], inherited: [] };
  const emission = selected ? naceEmissionFor(selected.code) : null;

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return [];
    return NACE_21.filter(
      n => n.code.toLowerCase().startsWith(q) || n.label.toLowerCase().includes(q),
    ).slice(0, 40);
  }, [q]);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      {/* ── the wheel ─────────────────────────────────────────────────────── */}
      <div ref={wrapRef} className="relative mx-auto w-full max-w-[560px] select-none">
        <div ref={svgWrapRef} />
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute z-20 rounded border border-grey-200 bg-white px-2.5 py-1.5 text-tertiary-dark shadow-lg transition-opacity duration-150"
          style={{ opacity: 0, maxWidth: 260 }}
        />
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10.5px] text-grey-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm border-[1.6px] border-[#2c2d2d] bg-white" />
            Mapped to a clean-tech subsector
          </span>
          <span>Inner ring = section · outer rings = divisions → groups → classes</span>
          <span>Arc size = number of detailed classes</span>
        </div>
      </div>

      {/* ── connected detail panel ────────────────────────────────────────── */}
      <aside className="rounded-xl border border-grey-200 bg-white p-4 shadow-sm lg:sticky lg:top-4">
        {/* search */}
        <div className="mb-3">
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Search all ${NACE_21_COUNTS.total} codes & labels…`}
            className="w-full rounded-md border border-grey-300 bg-white px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
          />
          {q ? (
            <div className="mt-1.5 max-h-56 overflow-auto rounded-md border border-grey-200">
              {matches.length ? (
                matches.map(m => (
                  <button
                    key={m.code}
                    type="button"
                    onClick={() => {
                      apiRef.current?.zoomTo(m.code);
                      setQuery('');
                    }}
                    className="flex w-full items-baseline gap-2 px-2 py-1 text-left hover:bg-grey-50"
                  >
                    <span className="font-mono text-[11px] font-bold text-primary">{m.code}</span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-grey-700">{m.label}</span>
                    {coverage.direct.has(m.code) ? (
                      <span className="h-2 w-2 flex-none rounded-full bg-[#2c2d2d]" title="mapped" />
                    ) : null}
                  </button>
                ))
              ) : (
                <div className="px-2 py-2 text-[11px] text-grey-400">No match for “{query}”.</div>
              )}
            </div>
          ) : null}
        </div>

        {selected ? (
          <div className="space-y-3">
            {/* breadcrumb */}
            {ancestors.length ? (
              <nav className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] text-grey-500">
                {ancestors.map((a, i) => (
                  <span key={a.code} className="inline-flex items-center gap-1">
                    {i > 0 ? <span className="text-grey-300">›</span> : null}
                    <button
                      type="button"
                      onClick={() => apiRef.current?.zoomTo(a.code)}
                      className="font-mono hover:text-primary hover:underline"
                    >
                      {a.code}
                    </button>
                  </span>
                ))}
              </nav>
            ) : null}

            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded bg-grey-100 px-1.5 py-0.5 font-mono text-xs font-bold text-primary">
                  {selected.code}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">
                  {LEVEL_LABEL[selected.level]}
                </span>
              </div>
              <h3 className="text-base font-bold leading-snug text-grey-900">{selected.label}</h3>
              <a
                href={naceUri(selected.code)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary-light hover:text-primary hover:underline"
              >
                ↗ Publications Office concept URI
              </a>
            </div>

            {/* emissions & marginal-abatement layer — whole-wheel coverage */}
            {emission ? (
              <div className="rounded-lg border border-grey-200 bg-grey-50 p-2.5">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">
                    Emissions &amp; abatement
                  </span>
                  {emission.inherited ? (
                    <span
                      className="rounded-full bg-grey-200 px-1.5 py-0.5 text-[9px] font-medium text-grey-600"
                      title={`No figure is split out for ${selected.code}; showing the value for the broader activity ${emission.sourceCode}.`}
                    >
                      via {emission.sourceCode}
                    </span>
                  ) : null}
                </div>

                {/* GHG */}
                <div className="text-[13px] font-semibold leading-snug text-grey-900">
                  {emission.data.ghg.value}
                </div>
                {emission.data.ghg.note ? (
                  <p className="mt-0.5 text-[11px] leading-snug text-grey-600">{emission.data.ghg.note}</p>
                ) : null}
                <div className="mt-0.5">
                  <SrcLink source={emission.data.ghg.source} />
                </div>

                {/* trend */}
                {emission.data.trend ? (
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 text-[11px]">
                    <span className="font-semibold text-tertiary">Trend</span>
                    <span className="text-grey-800">{emission.data.trend.value}</span>
                    <SrcLink source={emission.data.trend.source} />
                  </div>
                ) : null}

                {/* marginal abatement cost */}
                {emission.data.mac ? (
                  <div className="mt-1.5 rounded-md border border-grey-200 bg-white p-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">
                      Marginal abatement cost
                    </div>
                    <div className="mt-0.5 text-[12px] font-medium text-grey-900">{emission.data.mac.value}</div>
                    {emission.data.mac.note ? (
                      <p className="mt-0.5 text-[11px] leading-snug text-grey-600">{emission.data.mac.note}</p>
                    ) : null}
                    <div className="mt-0.5">
                      <SrcLink source={emission.data.mac.source} />
                    </div>
                  </div>
                ) : null}

                {/* levers */}
                {emission.data.levers ? (
                  <p className="mt-1.5 text-[11px] leading-snug text-grey-700">
                    <span className="font-semibold text-tertiary">Levers · </span>
                    {emission.data.levers}
                  </p>
                ) : null}

                {emission.data.note ? (
                  <p className="mt-1 text-[10.5px] italic leading-snug text-grey-500">{emission.data.note}</p>
                ) : null}
              </div>
            ) : null}

            {/* mapped catalogue subsectors — the connection back to the tree */}
            {mapped.direct.length || mapped.inherited.length ? (
              <div className="rounded-lg bg-primary/5 p-2.5">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-tertiary">
                  Clean-tech subsectors here
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {mapped.direct.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onSelectSubRef.current(s.id)}
                      title={`Open ${s.name} in the tree explorer`}
                      className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white hover:brightness-110"
                      style={{ background: BRANCH_COLORS[s.branch] }}
                    >
                      {s.name} →
                    </button>
                  ))}
                  {mapped.direct.length === 0 &&
                    mapped.inherited.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onSelectSubRef.current(s.id)}
                        title={`Covered via a broader mapped code — open ${s.name}`}
                        className="rounded-full border px-2 py-0.5 text-[11px] font-medium hover:shadow-sm"
                        style={{ borderColor: `${BRANCH_COLORS[s.branch]}88`, color: BRANCH_COLORS[s.branch] }}
                      >
                        {s.name} →
                      </button>
                    ))}
                </div>
                {mapped.direct.length === 0 ? (
                  <p className="mt-1 text-[10.5px] text-grey-500">Covered via a broader mapped code.</p>
                ) : null}
              </div>
            ) : null}

            {/* children */}
            {kids.length ? (
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-tertiary">
                  {kids.length} {kids.length === 1 ? LEVEL_LABEL[kids[0].level] : `${LEVEL_LABEL[kids[0].level]}s`} within
                </div>
                <div className="max-h-64 space-y-0.5 overflow-auto pr-1">
                  {kids.map(k => (
                    <button
                      key={k.code}
                      type="button"
                      onClick={() => apiRef.current?.zoomTo(k.code)}
                      className="flex w-full items-baseline gap-2 rounded px-1.5 py-1 text-left hover:bg-grey-50"
                    >
                      <span className="font-mono text-[11px] font-bold text-primary">{k.code}</span>
                      <span className="min-w-0 flex-1 text-[12px] text-grey-700">{k.label}</span>
                      {coverage.hasMappedBelow.has(k.code) ? (
                        <span
                          className="h-2 w-2 flex-none rounded-full bg-[#2c2d2d]"
                          title="contains a mapped clean-tech subsector"
                        />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-grey-500">
                Most detailed level (class) — no finer breakdown in NACE Rev. 2.1.
              </p>
            )}
          </div>
        ) : (
          /* nothing selected — overview + section list */
          <div className="space-y-3">
            <p className="text-[12.5px] leading-relaxed text-tertiary">
              The complete Statistical Classification of Economic Activities in the European Community, Rev. 2.1 —{' '}
              <strong>{NACE_21_COUNTS.sections} sections</strong>, {NACE_21_COUNTS.divisions} divisions,{' '}
              {NACE_21_COUNTS.groups} groups and {NACE_21_COUNTS.classes} classes. Click any arc to zoom in; click the
              centre to zoom back out. Arcs outlined in black host a clean-tech catalogue subsector — open it to jump
              back into the tree explorer above.
            </p>
            <p className="rounded-lg bg-grey-50 p-2.5 text-[11px] leading-relaxed text-grey-600">
              Select any activity to see its <strong>EU-27 greenhouse-gas emissions</strong>, trend and — where a
              sectoral estimate exists — its <strong>marginal abatement cost</strong>. Emissions are anchored to{' '}
              <SrcLink source={NACE_EMISSIONS_BACKBONE} />; finer activities inherit the figure of the broadest grouping
              for which official data are split out.
            </p>
            <ul className="space-y-1">
              {naceChildren(undefined).map(sec => (
                <li key={sec.code}>
                  <button
                    type="button"
                    onClick={() => apiRef.current?.zoomTo(sec.code)}
                    className="flex w-full items-center gap-2 rounded border border-grey-200 px-2 py-1.5 text-left hover:border-grey-300 hover:bg-grey-50"
                  >
                    <span className="font-mono text-[11px] font-bold text-primary">{sec.code}</span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-grey-700">{sec.label}</span>
                    {coverage.hasMappedBelow.has(sec.code) ? (
                      <span
                        className="h-2 w-2 flex-none rounded-full bg-[#2c2d2d]"
                        title="contains a mapped clean-tech subsector"
                      />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
