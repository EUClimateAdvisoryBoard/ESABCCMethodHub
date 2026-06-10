'use client';

/**
 * Zoomable radial "panorama" of EU greenhouse-gas emissions.
 *
 * Inner ring: the seven ECL sectors, sized by their latest net emissions
 * (absolute value — LULUCF is a net sink and is drawn hatched).
 * Outer ring: subsector splits (latest available year, scaled to the
 * sector total so the rings stay congruent).
 *
 * Interaction model follows the Swedish Panorama tool (ClimateView):
 * clicking a sector animates it open to the full circle with its
 * subsectors fanned around it; clicking the centre zooms back out.
 * All motion is suppressed under `prefers-reduced-motion`.
 */

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  PANORAMA_SECTORS,
  TOTAL_PATHWAY,
  latestValue,
  baseValue,
} from '@/data/transition-panorama';

interface ArcDatum {
  id: string;
  name: string;
  depth: 1 | 2;
  parentId: string | null;
  color: string;
  isSink: boolean;
  /** Signed latest emissions, Mt CO2e. */
  value: number;
  valueYear: number;
  /** Change vs 2005, %. */
  changePct: number;
  /** Absolute arc weight (subsectors scaled to the sector total). */
  arcValue: number;
  /** Layout when nothing is focused. */
  base: { x0: number; x1: number };
  /** Animated current angles (mutated by transitions). */
  current: { x0: number; x1: number };
}

interface CenterState {
  title: string;
  value: string;
  sub: string;
  focused: boolean;
}

const SECTOR_PAD = 0.014; // rad between sector arcs
const R_HOLE = 96;
const R1_IN = 104;
const R1_OUT = 196;
const R2_IN = 202;
const R2_OUT = 286;
const HOVER_BUMP = 8;

function formatMt(v: number): string {
  const abs = Math.abs(v);
  const s = abs >= 100 ? Math.round(abs).toLocaleString('en-GB') : abs.toFixed(1);
  return v < 0 ? `−${s}` : s;
}

function buildArcData(): ArcDatum[] {
  const arcs: ArcDatum[] = [];
  const sectorAbs = PANORAMA_SECTORS.map(s => Math.abs(latestValue(s).value));
  const totalAbs = d3.sum(sectorAbs);
  const angular = 2 * Math.PI - SECTOR_PAD * PANORAMA_SECTORS.length;

  let cursor = 0;
  PANORAMA_SECTORS.forEach((sector, i) => {
    const latest = latestValue(sector);
    const base = baseValue(sector);
    const span = (sectorAbs[i] / totalAbs) * angular;
    const x0 = cursor;
    const x1 = cursor + span;
    cursor = x1 + SECTOR_PAD;

    arcs.push({
      id: sector.id,
      name: sector.name,
      depth: 1,
      parentId: null,
      color: sector.color,
      isSink: !!sector.isSink,
      value: latest.value,
      valueYear: latest.year,
      changePct: ((latest.value - base.value) / Math.abs(base.value)) * 100,
      arcValue: sectorAbs[i],
      base: { x0, x1 },
      current: { x0, x1 },
    });

    const children = sector.children ?? [];
    if (children.length === 0) return;
    const childAbs = children.map(c => Math.abs(latestValue(c).value));
    const childTotal = d3.sum(childAbs);
    let childCursor = x0;
    children.forEach((child, j) => {
      const cLatest = latestValue(child);
      const cBase = baseValue(child);
      const cSpan = (childAbs[j] / childTotal) * (x1 - x0);
      const shade = d3
        .interpolateRgb(sector.color, '#ffffff')(0.18 + (j * 0.5) / Math.max(children.length - 1, 1));
      arcs.push({
        id: child.id,
        name: child.name,
        depth: 2,
        parentId: sector.id,
        color: child.color || shade,
        isSink: !!child.isSink,
        value: cLatest.value,
        valueYear: cLatest.year,
        changePct: ((cLatest.value - cBase.value) / Math.abs(cBase.value)) * 100,
        // scale to the sector's latest total so rings stay congruent
        arcValue: (childAbs[j] / childTotal) * sectorAbs[i],
        base: { x0: childCursor, x1: childCursor + cSpan },
        current: { x0: childCursor, x1: childCursor + cSpan },
      });
      childCursor += cSpan;
    });
  });
  return arcs;
}

/** Target angles for every arc given the focused sector (or null). */
function layoutFor(arcs: ArcDatum[], focusId: string | null): Map<string, { x0: number; x1: number; visible: boolean }> {
  const out = new Map<string, { x0: number; x1: number; visible: boolean }>();
  if (!focusId) {
    arcs.forEach(a => out.set(a.id, { ...a.base, visible: true }));
    return out;
  }
  const children = arcs.filter(a => a.parentId === focusId);
  const childTotal = d3.sum(children, c => c.arcValue);
  const pad = children.length > 1 ? 0.012 : 0;
  const angular = 2 * Math.PI - pad * children.length;
  let cursor = 0;
  const childAngles = new Map<string, { x0: number; x1: number }>();
  children.forEach(c => {
    const span = (c.arcValue / childTotal) * angular;
    childAngles.set(c.id, { x0: cursor, x1: cursor + span });
    cursor += span + pad;
  });

  arcs.forEach(a => {
    if (a.depth === 1) {
      if (a.id === focusId) {
        out.set(a.id, { x0: 0, x1: 2 * Math.PI, visible: true });
      } else {
        const mid = (a.base.x0 + a.base.x1) / 2;
        out.set(a.id, { x0: mid, x1: mid, visible: false });
      }
    } else if (a.parentId === focusId) {
      out.set(a.id, { ...childAngles.get(a.id)!, visible: true });
    } else {
      const mid = (a.base.x0 + a.base.x1) / 2;
      out.set(a.id, { x0: mid, x1: mid, visible: false });
    }
  });
  return out;
}

export default function PanoramaSunburst({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ applySelection: (id: string | null) => void } | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const [center, setCenter] = useState<CenterState>(() => defaultCenter());

  function defaultCenter(): CenterState {
    // Official ECL-scope total rather than the sector sum (minor scope
    // differences between the report's sectoral figures and Figure 4).
    const last = TOTAL_PATHWAY.historical[TOTAL_PATHWAY.historical.length - 1];
    return {
      title: 'EU net greenhouse-gas emissions',
      value: `${formatMt(last.value)} Mt CO₂e`,
      sub: 'Click a sector to explore its panorama',
      focused: false,
    };
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const arcs = buildArcData();
    let focusId: string | null = null;
    let currentSelection: string | null = null;

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', '-340 -340 680 680')
      .attr('role', 'group')
      .attr('aria-label', 'Radial panorama of EU greenhouse-gas emissions by sector and subsector')
      .style('width', '100%')
      .style('height', 'auto')
      .style('display', 'block');

    // Diagonal hatch overlay for net-removal (sink) arcs.
    const defs = svg.append('defs');
    defs
      .append('pattern')
      .attr('id', 'panorama-sink-hatch')
      .attr('width', 7)
      .attr('height', 7)
      .attr('patternTransform', 'rotate(45)')
      .attr('patternUnits', 'userSpaceOnUse')
      .append('rect')
      .attr('width', 2.5)
      .attr('height', 7)
      .attr('fill', '#ffffff')
      .attr('opacity', 0.45);

    const arcGen = (bump = 0) =>
      d3
        .arc<{ x0: number; x1: number; depth: 1 | 2 }>()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .innerRadius(d => (d.depth === 1 ? R1_IN : R2_IN))
        .outerRadius(d => (d.depth === 1 ? R1_OUT + bump : R2_OUT + bump))
        .cornerRadius(2);

    const arcPath = (a: ArcDatum, bump = 0) =>
      arcGen(bump)({ x0: a.current.x0, x1: a.current.x1, depth: a.depth }) ?? '';

    // Tangential labels (reading along the ring), kept upright by flipping
    // on the left half of the circle. Shown only when the arc is wide
    // enough for the name at the label's font size.
    const labelTransform = (a: ArcDatum) => {
      const deg = (((a.current.x0 + a.current.x1) / 2) * 180) / Math.PI;
      const radius = a.depth === 1 ? (R1_IN + R1_OUT) / 2 : (R2_IN + R2_OUT) / 2;
      const flip = deg > 90 && deg < 270;
      return `rotate(${deg - 90}) translate(${radius},0) rotate(${flip ? -90 : 90})`;
    };

    const labelVisible = (a: ArcDatum) => {
      const width = a.current.x1 - a.current.x0;
      const radius = a.depth === 1 ? (R1_IN + R1_OUT) / 2 : (R2_IN + R2_OUT) / 2;
      const fontPx = a.depth === 1 ? 15 : 12.5;
      return width * radius - 10 > a.name.length * fontPx * 0.56;
    };

    const groups = svg
      .selectAll<SVGGElement, ArcDatum>('g.node')
      .data(arcs, d => d.id)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer');

    const paths = groups
      .append('path')
      .attr('class', 'arc-main')
      .attr('fill', d => d.color)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1)
      .attr('d', d => arcPath(d))
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr(
        'aria-label',
        d => `${d.name}: ${formatMt(d.value)} megatonnes CO2-equivalent in ${d.valueYear}`,
      );

    // Hatch overlay for sinks (forest land, harvested wood, LULUCF total).
    const hatches = groups
      .filter(d => d.isSink)
      .append('path')
      .attr('class', 'arc-hatch')
      .attr('fill', 'url(#panorama-sink-hatch)')
      .attr('pointer-events', 'none')
      .attr('d', d => arcPath(d));

    const labels = groups
      .append('text')
      .attr('class', 'arc-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.32em')
      .attr('pointer-events', 'none')
      .attr('fill', d => (d3.hsl(d.color).l > 0.62 ? '#2c2d2d' : '#ffffff'))
      .style('font-size', d => (d.depth === 1 ? '15px' : '12.5px'))
      .style('font-weight', d => (d.depth === 1 ? 600 : 500))
      .attr('transform', d => labelTransform(d))
      .style('opacity', d => (labelVisible(d) ? 1 : 0))
      .text(d => d.name);

    labels
      .append('tspan')
      .attr('x', 0)
      .attr('dy', '1.25em')
      .style('font-weight', 400)
      .style('font-size', '11px')
      .style('opacity', 0.85)
      .text(d => `${formatMt(d.value)} Mt`);

    const tooltip = tooltipRef.current;

    function showTooltip(event: PointerEvent, d: ArcDatum) {
      if (!tooltip) return;
      const change = `${d.changePct >= 0 ? '+' : '−'}${Math.abs(d.changePct).toFixed(0)} % since 2005`;
      tooltip.innerHTML =
        `<div class="font-semibold">${d.name}</div>` +
        `<div>${formatMt(d.value)} Mt CO₂e (${d.valueYear})${d.isSink ? ' · net removals' : ''}</div>` +
        `<div class="opacity-80">${change}</div>`;
      tooltip.style.opacity = '1';
      moveTooltip(event);
    }

    function moveTooltip(event: PointerEvent) {
      if (!tooltip || !container) return;
      const rect = container.getBoundingClientRect();
      tooltip.style.left = `${event.clientX - rect.left + 14}px`;
      tooltip.style.top = `${event.clientY - rect.top + 10}px`;
    }

    function hideTooltip() {
      if (tooltip) tooltip.style.opacity = '0';
    }

    function setCenterFor(id: string | null) {
      if (!id) {
        setCenter(defaultCenter());
        return;
      }
      const arc = arcs.find(a => a.id === id);
      if (!arc) return;
      setCenter({
        title: arc.name,
        value: `${formatMt(arc.value)} Mt CO₂e`,
        sub: arc.isSink
          ? `Net removals in ${arc.valueYear} · click centre to zoom out`
          : `${arc.valueYear} emissions · click centre to zoom out`,
        focused: true,
      });
    }

    function applySelectionStroke() {
      paths
        .attr('stroke', d => (d.id === currentSelection ? '#2c2d2d' : '#ffffff'))
        .attr('stroke-width', d => (d.id === currentSelection ? 2.5 : 1));
    }

    function animateTo(nextFocus: string | null) {
      focusId = nextFocus;
      const target = layoutFor(arcs, nextFocus);
      const t = svg
        .transition()
        .duration(reduceMotion ? 0 : 760)
        .ease(d3.easeCubicInOut);

      groups
        .transition(t as never)
        .style('pointer-events', d => (target.get(d.id)!.visible ? 'auto' : 'none'))
        .style('opacity', d => (target.get(d.id)!.visible ? 1 : 0))
        .tween('arcs', function (d) {
          const to = target.get(d.id)!;
          const ix0 = d3.interpolate(d.current.x0, to.x0);
          const ix1 = d3.interpolate(d.current.x1, to.x1);
          const g = d3.select(this);
          return (u: number) => {
            d.current.x0 = ix0(u);
            d.current.x1 = ix1(u);
            g.select<SVGPathElement>('path.arc-main').attr('d', arcPath(d));
            g.select<SVGPathElement>('path.arc-hatch').attr('d', arcPath(d));
            g.select<SVGTextElement>('text.arc-label')
              .attr('transform', labelTransform(d))
              .style('opacity', labelVisible(d) ? 1 : 0);
          };
        });
    }

    function select(id: string | null) {
      currentSelection = id;
      applySelectionStroke();
      setCenterFor(focusId ?? id);
      onSelectRef.current(id);
    }

    paths
      .on('pointerenter', function (event: PointerEvent, d) {
        if (d.current.x1 - d.current.x0 < 1e-4) return;
        d3.select(this)
          .transition()
          .duration(reduceMotion ? 0 : 160)
          .attr('d', arcPath(d, HOVER_BUMP));
        d3.select(this.parentElement)
          .select<SVGPathElement>('path.arc-hatch')
          .transition()
          .duration(reduceMotion ? 0 : 160)
          .attr('d', arcPath(d, HOVER_BUMP));
        showTooltip(event, d);
      })
      .on('pointermove', (event: PointerEvent) => moveTooltip(event))
      .on('pointerleave', function (event, d) {
        d3.select(this)
          .transition()
          .duration(reduceMotion ? 0 : 160)
          .attr('d', arcPath(d));
        d3.select(this.parentElement)
          .select<SVGPathElement>('path.arc-hatch')
          .transition()
          .duration(reduceMotion ? 0 : 160)
          .attr('d', arcPath(d));
        hideTooltip();
      })
      .on('click', (_event, d) => {
        hideTooltip();
        if (d.depth === 1) {
          const hasChildren = arcs.some(a => a.parentId === d.id);
          if (hasChildren && focusId !== d.id) animateTo(d.id);
          select(d.id);
        } else {
          if (focusId !== d.parentId) animateTo(d.parentId);
          select(d.id);
        }
      })
      .on('keydown', function (event: KeyboardEvent, d) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          (d3.select(this).on('click') as (e: Event, d: ArcDatum) => void).call(this, event, d);
        }
      });

    // Invisible centre hit-area: zoom out / clear.
    svg
      .append('circle')
      .attr('r', R_HOLE)
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .attr('role', 'button')
      .attr('aria-label', 'Zoom out to all sectors')
      .on('click', () => {
        if (focusId) animateTo(null);
        currentSelection = null;
        applySelectionStroke();
        setCenter(defaultCenter());
        onSelectRef.current(null);
      });

    // Entry animation: arcs sweep open clockwise from their start angle.
    if (!reduceMotion) {
      arcs.forEach(a => {
        a.current = { x0: a.base.x0, x1: a.base.x0 };
      });
      groups.each(function (d) {
        const g = d3.select(this);
        g.select('path.arc-main').attr('d', arcPath(d));
        g.select('path.arc-hatch').attr('d', arcPath(d));
        g.select('text.arc-label').style('opacity', 0);
      });
      groups
        .transition()
        .duration(900)
        .delay(d => (d.base.x0 / (2 * Math.PI)) * 450 + (d.depth === 2 ? 250 : 0))
        .ease(d3.easeCubicOut)
        .tween('sweep', function (d) {
          const ix1 = d3.interpolate(d.base.x0, d.base.x1);
          const g = d3.select(this);
          return (u: number) => {
            d.current.x1 = ix1(u);
            g.select<SVGPathElement>('path.arc-main').attr('d', arcPath(d));
            g.select<SVGPathElement>('path.arc-hatch').attr('d', arcPath(d));
            g.select<SVGTextElement>('text.arc-label')
              .attr('transform', labelTransform(d))
              .style('opacity', labelVisible(d) ? u : 0);
          };
        });
    }

    apiRef.current = {
      applySelection(id: string | null) {
        if (id === currentSelection) return;
        currentSelection = id;
        if (!id) {
          if (focusId) animateTo(null);
          applySelectionStroke();
          setCenter(defaultCenter());
          return;
        }
        const arc = arcs.find(a => a.id === id);
        if (!arc) return;
        const wantedFocus = arc.depth === 2 ? arc.parentId : arcs.some(a => a.parentId === arc.id) ? arc.id : null;
        if (wantedFocus !== focusId && (wantedFocus || focusId)) animateTo(wantedFocus);
        applySelectionStroke();
        setCenterFor(focusId ?? id);
      },
    };

    return () => {
      apiRef.current = null;
      svg.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    apiRef.current?.applySelection(selectedId);
  }, [selectedId]);

  return (
    <div ref={containerRef} className="relative w-full max-w-[640px] mx-auto select-none">
      {/* Centre overlay (HTML for clean wrapping); clicks fall through to the SVG hit-area */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[26%] text-center transition-opacity duration-300">
          <div className="text-[10px] uppercase tracking-[0.12em] text-tertiary leading-tight">
            {center.focused ? 'Sector focus' : 'EU-27 · latest year'}
          </div>
          <div className="mt-1 text-[13px] font-semibold text-tertiary-dark leading-snug">
            {center.title}
          </div>
          <div className="mt-1 text-[15px] font-bold text-tertiary-dark">{center.value}</div>
          <div className="mt-1 text-[10.5px] text-tertiary leading-tight">{center.sub}</div>
        </div>
      </div>
      <div
        ref={tooltipRef}
        className="absolute z-10 pointer-events-none bg-white border border-grey-200 rounded shadow-lg px-2.5 py-1.5 text-[11.5px] text-tertiary-dark transition-opacity duration-150"
        style={{ opacity: 0 }}
      />
    </div>
  );
}
