'use client';

/**
 * Zoomable radial "panorama" of EU greenhouse-gas emissions.
 *
 * Inner ring: the seven ECL sectors; outer ring: their subsectors — each
 * arc sized by net emissions (absolute value; LULUCF is a net sink and is
 * drawn hatched). Interaction model follows the Swedish Panorama tool
 * (ClimateView): clicking a sector animates it open to the full circle,
 * clicking the centre zooms back out.
 *
 * Showpiece feature: a time-lapse play button that morphs the wheel
 * continuously through the 2005–2022 record (arc weights are interpolated
 * per animation frame), plus restrained hover pop-out and a pulse ring on
 * selection. All motion is suppressed under `prefers-reduced-motion`.
 */

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  PANORAMA_SECTORS,
  TOTAL_PATHWAY,
  YearValue,
} from '@/data/transition-panorama';

interface ArcDatum {
  id: string;
  name: string;
  depth: 1 | 2;
  parentId: string | null;
  sectorIndex: number;
  color: string;
  isSink: boolean;
  series: YearValue[];
  /** Animated current angles (mutated by transitions / the play timer). */
  current: { x0: number; x1: number };
}

interface CenterState {
  title: string;
  sub: string;
  focused: boolean;
}

const YEAR_MIN = 2005;
const YEAR_MAX = 2022;
const PLAY_MS = 9000;

const SECTOR_PAD = 0.014; // rad between sector arcs
const R_HOLE = 96;
const R1_IN = 104;
const R1_OUT = 196;
const R2_IN = 202;
const R2_OUT = 286;
const HOVER_POP = 7;

function formatMt(v: number): string {
  const abs = Math.abs(v);
  const s = abs >= 100 ? Math.round(abs).toLocaleString('en-GB') : abs.toFixed(1);
  return v < 0 ? `−${s}` : s;
}

/** Linear interpolation over a (sparse) annual series, clamped at the ends. */
function valueAt(series: YearValue[], year: number): number {
  const first = series[0];
  const last = series[series.length - 1];
  if (year <= first.year) return first.value;
  if (year >= last.year) return last.value;
  let i = 1;
  while (series[i].year < year) i++;
  const a = series[i - 1];
  const b = series[i];
  const u = (year - a.year) / (b.year - a.year);
  return a.value + (b.value - a.value) * u;
}

function buildArcData(): ArcDatum[] {
  const arcs: ArcDatum[] = [];
  PANORAMA_SECTORS.forEach((sector, i) => {
    arcs.push({
      id: sector.id,
      name: sector.name,
      depth: 1,
      parentId: null,
      sectorIndex: i,
      color: sector.color,
      isSink: !!sector.isSink,
      series: sector.series,
      current: { x0: 0, x1: 0 },
    });
    const children = sector.children ?? [];
    children.forEach((child, j) => {
      const shade = d3
        .interpolateRgb(sector.color, '#ffffff')(0.18 + (j * 0.5) / Math.max(children.length - 1, 1));
      arcs.push({
        id: child.id,
        name: child.name,
        depth: 2,
        parentId: sector.id,
        sectorIndex: i,
        color: child.color || shade,
        isSink: !!child.isSink,
        series: child.series,
        current: { x0: 0, x1: 0 },
      });
    });
  });
  return arcs;
}

interface LayoutEntry {
  x0: number;
  x1: number;
  visible: boolean;
}

/** Target angles for every arc given the focused sector and the year. */
function computeLayout(
  arcs: ArcDatum[],
  focusId: string | null,
  year: number,
): Map<string, LayoutEntry> {
  const out = new Map<string, LayoutEntry>();
  const sectors = arcs.filter(a => a.depth === 1);
  const weights = new Map(sectors.map(s => [s.id, Math.abs(valueAt(s.series, year))]));
  const total = d3.sum(sectors, s => weights.get(s.id)!);
  const angular = 2 * Math.PI - SECTOR_PAD * sectors.length;

  // Overview spans (also used as collapse anchors when a sector is focused).
  const overview = new Map<string, { x0: number; x1: number }>();
  let cursor = 0;
  sectors.forEach(s => {
    const span = (weights.get(s.id)! / total) * angular;
    overview.set(s.id, { x0: cursor, x1: cursor + span });
    cursor += span + SECTOR_PAD;
  });
  sectors.forEach(s => {
    const children = arcs.filter(a => a.parentId === s.id);
    if (children.length === 0) return;
    const cw = children.map(c => Math.abs(valueAt(c.series, year)));
    const cTotal = d3.sum(cw);
    const span = overview.get(s.id)!;
    let cCursor = span.x0;
    children.forEach((c, j) => {
      const cSpan = (cw[j] / cTotal) * (span.x1 - span.x0);
      overview.set(c.id, { x0: cCursor, x1: cCursor + cSpan });
      cCursor += cSpan;
    });
  });

  if (!focusId) {
    arcs.forEach(a => out.set(a.id, { ...overview.get(a.id)!, visible: true }));
    return out;
  }

  const children = arcs.filter(a => a.parentId === focusId);
  const cw = children.map(c => Math.abs(valueAt(c.series, year)));
  const cTotal = d3.sum(cw);
  const pad = children.length > 1 ? 0.012 : 0;
  const childAngular = 2 * Math.PI - pad * children.length;
  let cCursor = 0;
  const focusChildren = new Map<string, { x0: number; x1: number }>();
  children.forEach((c, j) => {
    const span = (cw[j] / cTotal) * childAngular;
    focusChildren.set(c.id, { x0: cCursor, x1: cCursor + span });
    cCursor += span + pad;
  });

  arcs.forEach(a => {
    if (a.id === focusId) {
      out.set(a.id, { x0: 0, x1: 2 * Math.PI, visible: true });
    } else if (a.parentId === focusId) {
      out.set(a.id, { ...focusChildren.get(a.id)!, visible: true });
    } else {
      const o = overview.get(a.id)!;
      const mid = (o.x0 + o.x1) / 2;
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
  const wheelWrapRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const centerValueRef = useRef<HTMLDivElement>(null);
  const centerYearRef = useRef<HTMLSpanElement>(null);
  const apiRef = useRef<{
    applySelection: (id: string | null) => void;
    setYear: (y: number, animate: boolean) => void;
    play: () => void;
    pause: () => void;
  } | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const [center, setCenter] = useState<CenterState>({
    title: 'EU net greenhouse-gas emissions',
    sub: 'Click a sector to explore its panorama',
    focused: false,
  });
  const [yearUi, setYearUi] = useState(YEAR_MAX);
  const [playingUi, setPlayingUi] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const wheelWrapEl = wheelWrapRef.current;
    if (!container || !wheelWrapEl) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const arcs = buildArcData();
    let focusId: string | null = null;
    let currentSelection: string | null = null;
    let yearF = YEAR_MAX;
    let visMap = new Map<string, boolean>(arcs.map(a => [a.id, true]));
    let playTimer: d3.Timer | null = null;

    const svg = d3
      .select(wheelWrapEl)
      .append('svg')
      .attr('viewBox', '-340 -340 680 680')
      .attr('role', 'group')
      .attr('aria-label', 'Radial panorama of EU greenhouse-gas emissions by sector and subsector')
      .style('width', '100%')
      .style('height', 'auto')
      .style('display', 'block');

    // ── defs: hatch for sinks, depth gradient + glow filter per sector ─────
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

    // Single soft lift shadow for hovered / selected arcs.
    defs
      .append('filter')
      .attr('id', 'pano-lift')
      .attr('x', '-40%')
      .attr('y', '-40%')
      .attr('width', '180%')
      .attr('height', '180%')
      .append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 0)
      .attr('stdDeviation', 5)
      .attr('flood-color', '#2c2d2d')
      .attr('flood-opacity', 0.28);

    // Pulse ring fired on selection.
    const pulse = svg
      .append('circle')
      .attr('r', R_HOLE)
      .attr('fill', 'none')
      .attr('stroke', '#00928F')
      .attr('stroke-width', 2)
      .attr('opacity', 0)
      .attr('aria-hidden', 'true');

    // All arcs live inside one group so the entry animation can spin them in.
    const wheel = svg.append('g').attr('class', 'pano-wheel');

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

    const groups = wheel
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
      .attr('tabindex', 0)
      .attr('role', 'button')
      .style('outline', 'none')
      .attr(
        'aria-label',
        d =>
          `${d.name}: ${formatMt(valueAt(d.series, YEAR_MAX))} megatonnes CO2-equivalent in ${Math.min(
            YEAR_MAX,
            d.series[d.series.length - 1].year,
          )}`,
      );

    groups
      .filter(d => d.isSink)
      .append('path')
      .attr('class', 'arc-hatch')
      .attr('fill', 'url(#panorama-sink-hatch)')
      .attr('pointer-events', 'none');

    const labels = groups
      .append('text')
      .attr('class', 'arc-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.32em')
      .attr('pointer-events', 'none')
      .attr('fill', d => (d3.hsl(d.color).l > 0.62 ? '#2c2d2d' : '#ffffff'))
      .style('font-size', d => (d.depth === 1 ? '15px' : '12.5px'))
      .style('font-weight', d => (d.depth === 1 ? 600 : 500))
      .text(d => d.name);

    const valueTspans = labels
      .append('tspan')
      .attr('x', 0)
      .attr('dy', '1.25em')
      .style('font-weight', 400)
      .style('font-size', '11px')
      .style('opacity', 0.85);

    // ── shared render helpers ───────────────────────────────────────────────
    function renderNode(g: d3.Selection<SVGGElement, ArcDatum, null, undefined>, d: ArcDatum) {
      g.select<SVGPathElement>('path.arc-main').attr('d', arcPath(d));
      g.select<SVGPathElement>('path.arc-hatch').attr('d', arcPath(d));
      g.select<SVGTextElement>('text.arc-label')
        .attr('transform', labelTransform(d))
        .style('opacity', labelVisible(d) ? 1 : 0);
    }

    function renderAll() {
      groups.each(function (d) {
        renderNode(d3.select(this), d);
      });
    }

    function updateValueTexts() {
      valueTspans.text(d => `${formatMt(valueAt(d.series, yearF))} Mt`);
    }

    function updateCenterNumbers() {
      const focusArc = focusId ? arcs.find(a => a.id === focusId) : null;
      const value = focusArc
        ? valueAt(focusArc.series, yearF)
        : valueAt(TOTAL_PATHWAY.historical, yearF);
      if (centerValueRef.current) {
        centerValueRef.current.textContent = `${formatMt(value)} Mt CO₂e`;
      }
      if (centerYearRef.current) {
        centerYearRef.current.textContent = String(Math.round(yearF));
      }
    }

    // ── tooltip ─────────────────────────────────────────────────────────────
    const tooltip = tooltipRef.current;

    function showTooltip(event: PointerEvent, d: ArcDatum) {
      if (!tooltip) return;
      const year = Math.round(yearF);
      const v = valueAt(d.series, yearF);
      const v05 = valueAt(d.series, YEAR_MIN);
      const changePct = ((v - v05) / Math.abs(v05)) * 100;
      const change = `${changePct >= 0 ? '+' : '−'}${Math.abs(changePct).toFixed(0)} % since 2005`;
      tooltip.innerHTML =
        `<div class="font-semibold">${d.name}</div>` +
        `<div>${formatMt(v)} Mt CO₂e (${year})${d.isSink ? ' · net removals' : ''}</div>` +
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

    // ── centre / selection state ────────────────────────────────────────────
    function setCenterFor(id: string | null) {
      if (!id) {
        setCenter({
          title: 'EU net greenhouse-gas emissions',
          sub: 'Click a sector to explore its panorama',
          focused: false,
        });
      } else {
        const arc = arcs.find(a => a.id === id);
        if (!arc) return;
        setCenter({
          title: arc.name,
          sub: arc.isSink
            ? 'Net removals · click centre to zoom out'
            : 'Click centre to zoom out',
          focused: true,
        });
      }
      updateCenterNumbers();
    }

    function applySelectionStroke() {
      paths
        .attr('stroke', d => (d.id === currentSelection ? '#2c2d2d' : '#ffffff'))
        .attr('stroke-width', d => (d.id === currentSelection ? 2.5 : 1))
        .attr('filter', d => (d.id === currentSelection ? 'url(#pano-lift)' : null));
    }

    function firePulse(color: string) {
      if (reduceMotion) return;
      pulse
        .interrupt()
        .attr('stroke', color)
        .attr('r', R_HOLE)
        .attr('opacity', 0.7)
        .transition()
        .duration(620)
        .ease(d3.easeCubicOut)
        .attr('r', R_HOLE + 22)
        .attr('opacity', 0)
        .attr('stroke-width', 0.5);
    }

    // ── layout animation ────────────────────────────────────────────────────
    function animateTo(nextFocus: string | null) {
      focusId = nextFocus;
      const target = computeLayout(arcs, nextFocus, yearF);
      visMap = new Map(arcs.map(a => [a.id, target.get(a.id)!.visible]));
      const t = svg
        .transition('layout')
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
          const g = d3.select(this) as d3.Selection<SVGGElement, ArcDatum, null, undefined>;
          return (u: number) => {
            d.current.x0 = ix0(u);
            d.current.x1 = ix1(u);
            renderNode(g, d);
          };
        });
      updateCenterNumbers();
    }

    /** Recompute angles for the current year and paint them immediately. */
    function applyYearInstant() {
      const target = computeLayout(arcs, focusId, yearF);
      arcs.forEach(a => {
        const to = target.get(a.id)!;
        a.current.x0 = to.x0;
        a.current.x1 = to.x1;
      });
      renderAll();
      updateValueTexts();
      updateCenterNumbers();
    }

    function animateYear(toYear: number) {
      const fromYear = yearF;
      if (reduceMotion || Math.abs(toYear - fromYear) < 1e-3) {
        yearF = toYear;
        applyYearInstant();
        setYearUi(Math.round(toYear));
        return;
      }
      svg
        .transition('layout')
        .duration(420)
        .ease(d3.easeCubicInOut)
        .tween('year', () => {
          const iy = d3.interpolate(fromYear, toYear);
          return (u: number) => {
            yearF = iy(u);
            applyYearInstant();
          };
        });
      setYearUi(Math.round(toYear));
    }

    function pause() {
      playTimer?.stop();
      playTimer = null;
      setPlayingUi(false);
    }

    function play() {
      pause();
      const startYear = yearF >= YEAR_MAX - 0.05 ? YEAR_MIN : yearF;
      const span = YEAR_MAX - startYear;
      const duration = (span / (YEAR_MAX - YEAR_MIN)) * PLAY_MS;
      setPlayingUi(true);
      if (reduceMotion) {
        yearF = YEAR_MAX;
        applyYearInstant();
        setYearUi(YEAR_MAX);
        setPlayingUi(false);
        return;
      }
      playTimer = d3.timer(elapsed => {
        const u = Math.min(elapsed / duration, 1);
        yearF = startYear + span * u;
        applyYearInstant();
        setYearUi(Math.round(yearF));
        if (u >= 1) pause();
      });
    }

    // ── hover behaviour ─────────────────────────────────────────────────────
    function popOut(this: SVGPathElement, d: ArcDatum, out: boolean) {
      const mid = (d.current.x0 + d.current.x1) / 2;
      const dx = out ? Math.sin(mid) * HOVER_POP : 0;
      const dy = out ? -Math.cos(mid) * HOVER_POP : 0;
      d3.select(this.parentElement)
        .transition('hover')
        .duration(reduceMotion ? 0 : 240)
        .ease(out ? d3.easeBackOut : d3.easeCubicOut)
        .attr('transform', `translate(${dx},${dy})`);
    }

    function dimOthers(hovered: ArcDatum | null) {
      groups
        .transition('dim')
        .duration(reduceMotion ? 0 : 220)
        .style('opacity', d => {
          if (!visMap.get(d.id)) return 0;
          if (!hovered) return 1;
          const related =
            d.id === hovered.id || d.id === hovered.parentId || d.parentId === hovered.id;
          return related ? 1 : 0.55;
        });
    }

    function hoverEnter(this: SVGPathElement, event: PointerEvent, d: ArcDatum) {
      if (d.current.x1 - d.current.x0 < 1e-4) return;
      popOut.call(this, d, true);
      d3.select(this).attr('filter', 'url(#pano-lift)');
      dimOthers(d);
      showTooltip(event, d);
    }

    function hoverLeave(this: SVGPathElement, _event: unknown, d: ArcDatum) {
      popOut.call(this, d, false);
      if (d.id !== currentSelection) d3.select(this).attr('filter', null);
      dimOthers(null);
      hideTooltip();
    }

    paths
      .on('pointerenter', hoverEnter)
      .on('pointermove', (event: PointerEvent) => moveTooltip(event))
      .on('pointerleave', hoverLeave)
      .on('focus', function (event, d) {
        hoverEnter.call(this, event as never, d);
      })
      .on('blur', function (event, d) {
        hoverLeave.call(this, event, d);
      })
      .on('click', (_event, d) => {
        hideTooltip();
        if (d.depth === 1) {
          const hasChildren = arcs.some(a => a.parentId === d.id);
          if (hasChildren && focusId !== d.id) animateTo(d.id);
        } else if (focusId !== d.parentId) {
          animateTo(d.parentId);
        }
        currentSelection = d.id;
        applySelectionStroke();
        firePulse(PANORAMA_SECTORS[d.sectorIndex].color);
        setCenterFor(focusId ?? d.id);
        onSelectRef.current(d.id);
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
        setCenterFor(null);
        onSelectRef.current(null);
      });

    // ── initial paint + entry animation ─────────────────────────────────────
    const initial = computeLayout(arcs, null, yearF);
    arcs.forEach(a => {
      const to = initial.get(a.id)!;
      a.current = reduceMotion ? { x0: to.x0, x1: to.x1 } : { x0: to.x0, x1: to.x0 };
    });
    renderAll();
    updateValueTexts();
    updateCenterNumbers();
    if (!reduceMotion) {
      groups.each(function () {
        d3.select(this).select('text.arc-label').style('opacity', 0);
      });
      groups
        .transition('sweep')
        .duration(900)
        .delay(d => {
          const to = initial.get(d.id)!;
          return (to.x0 / (2 * Math.PI)) * 450 + (d.depth === 2 ? 250 : 0);
        })
        .ease(d3.easeCubicOut)
        .tween('sweep', function (d) {
          const to = initial.get(d.id)!;
          const ix1 = d3.interpolate(to.x0, to.x1);
          const g = d3.select(this) as d3.Selection<SVGGElement, ArcDatum, null, undefined>;
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

    // ── imperative API for the React shell ──────────────────────────────────
    apiRef.current = {
      applySelection(id: string | null) {
        if (id === currentSelection) return;
        currentSelection = id;
        if (!id) {
          if (focusId) animateTo(null);
          applySelectionStroke();
          setCenterFor(null);
          return;
        }
        const arc = arcs.find(a => a.id === id);
        if (!arc) return;
        const wantedFocus =
          arc.depth === 2 ? arc.parentId : arcs.some(a => a.parentId === arc.id) ? arc.id : null;
        if (wantedFocus !== focusId && (wantedFocus || focusId)) animateTo(wantedFocus);
        applySelectionStroke();
        firePulse(PANORAMA_SECTORS[arc.sectorIndex].color);
        setCenterFor(focusId ?? id);
      },
      setYear(y: number, animate: boolean) {
        pause();
        if (animate) animateYear(y);
        else {
          yearF = y;
          applyYearInstant();
          setYearUi(Math.round(y));
        }
      },
      play,
      pause,
    };

    return () => {
      playTimer?.stop();
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
      <div ref={wheelWrapRef} className="relative">
        {/* Centre overlay (HTML for clean wrapping); clicks fall through to the SVG hit-area */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[26%] text-center">
            <div className="text-[10px] uppercase tracking-[0.12em] text-tertiary leading-tight">
              {center.focused ? 'Sector focus' : 'EU-27'}
              {' · '}
              <span ref={centerYearRef} className="tabular-nums">{YEAR_MAX}</span>
            </div>
            <div className="mt-1 text-[13px] font-semibold text-tertiary-dark leading-snug">
              {center.title}
            </div>
            <div ref={centerValueRef} className="mt-1 text-[15px] font-bold text-tertiary-dark tabular-nums" />
            <div className="mt-1 text-[10.5px] text-tertiary leading-tight">{center.sub}</div>
          </div>
        </div>
      </div>

      <div
        ref={tooltipRef}
        className="absolute z-10 pointer-events-none bg-white border border-grey-200 rounded shadow-lg px-2.5 py-1.5 text-[11.5px] text-tertiary-dark transition-opacity duration-150"
        style={{ opacity: 0 }}
      />

      {/* Time-lapse controls */}
      <div className="mt-3 flex items-center gap-3 px-2">
        <button
          type="button"
          onClick={() => (playingUi ? apiRef.current?.pause() : apiRef.current?.play())}
          aria-label={playingUi ? 'Pause time-lapse' : 'Play time-lapse 2005 to 2022'}
          className="shrink-0 w-9 h-9 rounded-full border border-grey-300 bg-white hover:border-primary hover:text-primary text-tertiary-dark flex items-center justify-center transition shadow-sm"
        >
          {playingUi ? (
            <svg width="11" height="12" viewBox="0 0 11 12" aria-hidden>
              <rect x="0.5" width="3.6" height="12" rx="1" fill="currentColor" />
              <rect x="6.9" width="3.6" height="12" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg width="12" height="13" viewBox="0 0 12 13" aria-hidden>
              <path d="M1.5 1.2a1 1 0 0 1 1.52-.86l8.1 4.8a1 1 0 0 1 0 1.72l-8.1 4.8a1 1 0 0 1-1.52-.86V1.2Z" fill="currentColor" />
            </svg>
          )}
        </button>
        <span className="text-[10px] text-tertiary tabular-nums shrink-0">{YEAR_MIN}</span>
        <input
          type="range"
          min={YEAR_MIN}
          max={YEAR_MAX}
          step={1}
          value={yearUi}
          aria-label="Year"
          onChange={e => apiRef.current?.setYear(Number(e.target.value), true)}
          className="flex-1 accent-[#004B7F] cursor-pointer"
        />
        <span className="text-[10px] text-tertiary tabular-nums shrink-0">{YEAR_MAX}</span>
        <span className="shrink-0 font-mono text-[12px] font-semibold text-tertiary-dark tabular-nums w-11 text-right">
          {yearUi}
        </span>
      </div>
      <p className="mt-1.5 px-2 text-center text-[10.5px] text-tertiary">
        Press play to watch the wheel reshape through the 2005–2022 emissions record.
      </p>
    </div>
  );
}
