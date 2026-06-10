'use client';

/**
 * The EU Carbon Iceberg — an illustrative 3D climate metaphor built on the
 * real emissions record.
 *
 * The Panorama donut is reimagined as an iceberg: the donut hole becomes
 * the tip above the waterline, and each underwater facet is one ECL sector,
 * its area sized by that sector's real net emissions (EEA GHG data viewer,
 * via the ESABCC progress-report workbook). Emitters float at the surface
 * and "blow" CO₂ at the berg; the LULUCF forest absorbs it.
 *
 * What is real:
 *   - facet sizes  = sectoral net emissions at the displayed year;
 *   - annual + cumulative totals in the HUD = EEA history to 2022, then the
 *     selected scenario (Member State WAM projections, or a pathway through
 *     the ESABCC 2040 advice midpoint to net zero 2050);
 *   - the sector detail panel (trend, 2030/2040/2050 benchmarks, levers).
 *
 * What is illustrative (and labelled as such in the UI): the melt rate,
 * the sea-level rise, the water temperature tint and the impact markers.
 * Ice mass is mapped from cumulative emissions since 2005 so the two
 * scenarios end 2050 with visibly different icebergs.
 *
 * All motion is suppressed under `prefers-reduced-motion`.
 */

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  PANORAMA_SECTORS,
  TOTAL_PATHWAY,
  YearValue,
} from '@/data/transition-panorama';

export type IcebergScenario = 'wam' | 'advice';

const YEAR_MIN = 2005;
const YEAR_MAX = 2050;
const SECTOR_DATA_MAX = 2022; // sector splits are frozen at the last reported year
const PLAY_MS = 14000;

// Scene geometry (SVG user units).
const W = 1000;
const H = 660;
const CX = 500;
const WL = 248; // the berg's waterline anchor
const R0 = 295; // underwater radius at full mass
const MASS_FLOOR = 0.16;
const MELT_AT_REF = 0.74; // ice lost by 2050 under the WAM reference

/** The 2040-advice pathway: through the advice midpoint to net zero. */
const ADVICE_PATH: YearValue[] = [
  { year: 2022, value: 3333.9 },
  { year: 2030, value: 2149.8 },
  { year: 2040, value: 358.5 }, // midpoint of the 239–478 Mt advice range
  { year: 2050, value: 0 },
];

const EMITTERS: Record<
  string,
  { glyph: string; x: number; label: string; sink?: boolean }
> = {
  'energy-supply': { glyph: '⚡', x: 132, label: 'Energy supply' },
  industry: { glyph: '🏭', x: 232, label: 'Industry' },
  transport: { glyph: '🚗', x: 332, label: 'Transport' },
  buildings: { glyph: '🏠', x: 668, label: 'Buildings' },
  agriculture: { glyph: '🐄', x: 768, label: 'Agriculture' },
  'waste-other': { glyph: '🗑️', x: 868, label: 'Waste & other' },
  lulucf: { glyph: '🌲', x: 948, label: 'LULUCF sink', sink: true },
};

const IMPACTS: { glyph: string; label: string; at: number }[] = [
  { glyph: '🌊', label: 'Sea-level rise', at: 0.18 },
  { glyph: '🔥', label: 'Heatwaves intensify', at: 0.36 },
  { glyph: '🌪️', label: 'Extreme weather', at: 0.55 },
  { glyph: '🐠', label: 'Ecosystems under stress', at: 0.72 },
];

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

/** Total net EU emissions at a year: EEA history, then the scenario. */
function totalAt(year: number, scenario: IcebergScenario): number {
  if (year <= 2022) return valueAt(TOTAL_PATHWAY.historical, year);
  return scenario === 'wam' ? valueAt(TOTAL_PATHWAY.wam, year) : valueAt(ADVICE_PATH, year);
}

/** Cumulative net emissions 2005→year in Mt (annual trapezoid sum). */
function buildCumulative(scenario: IcebergScenario): number[] {
  const cum: number[] = [];
  let acc = 0;
  for (let y = YEAR_MIN; y <= YEAR_MAX; y++) {
    acc += totalAt(y, scenario);
    cum[y - YEAR_MIN] = acc;
  }
  return cum;
}

function cumulativeAt(cum: number[], year: number): number {
  const t = Math.min(Math.max(year, YEAR_MIN), YEAR_MAX) - YEAR_MIN;
  const i = Math.floor(t);
  const f = t - i;
  const a = cum[Math.min(i, cum.length - 1)];
  const b = cum[Math.min(i + 1, cum.length - 1)];
  return a + (b - a) * f;
}

export default function ClimateIceberg({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const hudYearRef = useRef<HTMLSpanElement>(null);
  const hudAnnualRef = useRef<HTMLSpanElement>(null);
  const hudCumRef = useRef<HTMLSpanElement>(null);
  const hudMassRef = useRef<HTMLSpanElement>(null);
  const hudSeaRef = useRef<HTMLSpanElement>(null);
  const apiRef = useRef<{
    applySelection: (id: string | null) => void;
    setYear: (y: number, animate: boolean) => void;
    setScenario: (s: IcebergScenario) => void;
    play: () => void;
    pause: () => void;
  } | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const [yearUi, setYearUi] = useState(SECTOR_DATA_MAX);
  const [playingUi, setPlayingUi] = useState(false);
  const [scenarioUi, setScenarioUi] = useState<IcebergScenario>('wam');

  useEffect(() => {
    const container = containerRef.current;
    const scene = sceneRef.current;
    const stage = stageRef.current;
    if (!container || !scene || !stage) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let yearF = SECTOR_DATA_MAX;
    let scenario: IcebergScenario = 'wam';
    let currentSelection: string | null = null;
    let playTimer: d3.Timer | null = null;

    const cumBy: Record<IcebergScenario, number[]> = {
      wam: buildCumulative('wam'),
      advice: buildCumulative('advice'),
    };
    const CUM_REF = cumBy.wam[cumBy.wam.length - 1]; // WAM cumulative in 2050

    /** Ice mass fraction — ILLUSTRATIVE mapping from real cumulative emissions. */
    function massAt(year: number): number {
      const cum = cumulativeAt(cumBy[scenario], year);
      return Math.max(MASS_FLOOR, 1 - MELT_AT_REF * Math.pow(cum / CUM_REF, 1.08));
    }
    /** 0 → pristine, 1 → reference melt. Drives water/sky/impacts. */
    function heatAt(mass: number): number {
      return Math.min(1, (1 - mass) / MELT_AT_REF);
    }

    const svg = d3
      .select(stage)
      .append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('role', 'group')
      .attr(
        'aria-label',
        'Illustrative iceberg scene: underwater facets sized by real EU sectoral emissions, melting with cumulative emissions',
      )
      .style('width', '100%')
      .style('height', 'auto')
      .style('display', 'block');

    const defs = svg.append('defs');

    const skyGrad = defs.append('linearGradient').attr('id', 'berg-sky').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 1);
    const skyTop = skyGrad.append('stop').attr('offset', '0%');
    const skyBot = skyGrad.append('stop').attr('offset', '100%');

    const waterGrad = defs.append('linearGradient').attr('id', 'berg-water').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 1);
    const waterTop = waterGrad.append('stop').attr('offset', '0%');
    const waterBot = waterGrad.append('stop').attr('offset', '100%');

    const iceGrad = defs.append('linearGradient').attr('id', 'berg-ice').attr('x1', 0).attr('y1', 1).attr('x2', 0.4).attr('y2', 0);
    iceGrad.append('stop').attr('offset', '0%').attr('stop-color', '#cfe2ee');
    iceGrad.append('stop').attr('offset', '60%').attr('stop-color', '#eef6fb');
    iceGrad.append('stop').attr('offset', '100%').attr('stop-color', '#ffffff');

    defs
      .append('filter')
      .attr('id', 'berg-sun-glow')
      .attr('x', '-80%').attr('y', '-80%').attr('width', '260%').attr('height', '260%')
      .append('feGaussianBlur')
      .attr('stdDeviation', 10);

    // ── sky, sun, clouds ────────────────────────────────────────────────────
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', 'url(#berg-sky)')
      .on('click', () => clearSelection());

    const sunHalo = svg.append('circle').attr('cx', 128).attr('cy', 96).attr('filter', 'url(#berg-sun-glow)').attr('opacity', 0.65).attr('pointer-events', 'none');
    const sun = svg.append('circle').attr('cx', 128).attr('cy', 96).attr('pointer-events', 'none');

    const clouds = svg.append('g').attr('aria-hidden', 'true').attr('pointer-events', 'none');
    [
      { x: 320, y: 70, s: 1, cls: 'berg-cloud-a' },
      { x: 620, y: 110, s: 0.7, cls: 'berg-cloud-b' },
      { x: 840, y: 60, s: 0.85, cls: 'berg-cloud-a' },
    ].forEach(c => {
      const g = clouds.append('g').attr('class', c.cls).attr('transform', `translate(${c.x},${c.y}) scale(${c.s})`);
      g.append('ellipse').attr('rx', 46).attr('ry', 15).attr('fill', '#ffffff').attr('opacity', 0.85);
      g.append('ellipse').attr('cx', 30).attr('cy', -8).attr('rx', 28).attr('ry', 12).attr('fill', '#ffffff').attr('opacity', 0.8);
    });

    // ── impact markers (appear as the scene warms) ──────────────────────────
    const impactsG = svg.append('g').attr('pointer-events', 'none');
    const impactNodes = IMPACTS.map((imp, i) => {
      const g = impactsG
        .append('g')
        .attr('transform', `translate(${W - 218},${44 + i * 34})`)
        .style('opacity', 0);
      g.append('text').attr('font-size', 17).attr('dy', '0.32em').text(imp.glyph);
      g.append('text')
        .attr('x', 26)
        .attr('dy', '0.32em')
        .attr('font-size', 12.5)
        .attr('font-weight', 600)
        .attr('fill', '#3D5265')
        .text(imp.label);
      return { ...imp, g };
    });
    impactsG
      .append('text')
      .attr('x', W - 218)
      .attr('y', 24)
      .attr('font-size', 10)
      .attr('letter-spacing', '0.1em')
      .attr('fill', '#3D5265')
      .attr('opacity', 0.7)
      .text('CLIMATE IMPACTS (ILLUSTRATIVE)');

    // ── the iceberg ─────────────────────────────────────────────────────────
    // Facet geometry: an underwater fan from the waterline centre. Jitter is
    // seeded once per facet so melting rescales the shape without reshuffling.
    const rng = d3.randomLcg(7);
    const SAMPLES = 5;
    const facets = PANORAMA_SECTORS.map(s => ({
      sector: s,
      jitter: d3.range(SAMPLES + 1).map(() => 0.88 + rng() * 0.26),
    }));
    const tipJitter = [
      { dx: -0.95, dy: 0 }, { dx: -0.62, dy: -0.52 }, { dx: -0.28, dy: -0.3 },
      { dx: 0.04, dy: -0.95 }, { dx: 0.38, dy: -0.42 }, { dx: 0.7, dy: -0.6 }, { dx: 0.95, dy: 0 },
    ];

    const bergG = svg
      .append('g')
      .attr('class', reduceMotion ? '' : 'berg-bob')
      .style('transform-origin', `${CX}px ${WL}px`);

    const tipPath = bergG.append('path').attr('fill', 'url(#berg-ice)').attr('stroke', '#ffffff').attr('stroke-width', 2);

    const facetG = bergG
      .selectAll<SVGGElement, (typeof facets)[number]>('g.facet')
      .data(facets, d => d.sector.id)
      .join('g')
      .attr('class', 'facet')
      .style('cursor', 'pointer');

    const facetPaths = facetG
      .append('path')
      .attr('stroke', '#eaf4fb')
      .attr('stroke-width', 2)
      .attr('stroke-linejoin', 'round')
      .attr('fill', d => d3.interpolateRgb(d.sector.color, '#bfdcec')(0.32))
      .attr('tabindex', 0)
      .attr('role', 'button')
      .style('outline', 'none');
    facetPaths.append('title');

    const facetLabels = facetG
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('pointer-events', 'none')
      .attr('font-size', 13)
      .attr('font-weight', 600)
      .attr('fill', '#173042');
    const facetValues = facetG
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('pointer-events', 'none')
      .attr('font-size', 11)
      .attr('fill', '#173042')
      .attr('opacity', 0.8);

    // ── water (translucent, drawn over the underwater berg) ────────────────
    // Click-transparent so the facets beneath stay selectable; empty-water
    // clicks fall through to the sky rect, which clears the selection.
    const water = svg.append('rect').attr('x', 0).attr('width', W).attr('fill', 'url(#berg-water)').attr('opacity', 0.62)
      .attr('pointer-events', 'none');

    // god rays + bubbles, faint, inside the water
    const raysG = svg.append('g').attr('aria-hidden', 'true').attr('opacity', 0.5).attr('pointer-events', 'none');
    const rays = [0, 1, 2].map(i =>
      raysG
        .append('polygon')
        .attr('class', `berg-ray berg-ray-${i}`)
        .attr('fill', '#ffffff')
        .attr('opacity', 0.1),
    );
    const bubblesG = svg.append('g').attr('aria-hidden', 'true').attr('pointer-events', 'none');
    d3.range(12).forEach(i => {
      bubblesG
        .append('circle')
        .attr('class', 'berg-bubble')
        .attr('cx', 180 + rng() * 640)
        .attr('r', 1.6 + rng() * 2.4)
        .attr('fill', '#ffffff')
        .attr('opacity', 0)
        .style('animation-delay', `${(rng() * 6).toFixed(2)}s`)
        .style('animation-duration', `${(5 + rng() * 5).toFixed(2)}s`);
    });

    // waves along the (moving) waterline
    const wavesG = svg.append('g').attr('aria-hidden', 'true').attr('pointer-events', 'none');
    const wavePathD = (() => {
      let dd = 'M -80 0';
      for (let x = -80; x < W + 160; x += 40) dd += ` q 10 -7 20 0 q 10 7 20 0`;
      return dd;
    })();
    const wave1 = wavesG.append('path').attr('class', 'berg-wave-a').attr('d', wavePathD).attr('fill', 'none').attr('stroke-width', 3).attr('opacity', 0.65);
    const wave2 = wavesG.append('path').attr('class', 'berg-wave-b').attr('d', wavePathD).attr('fill', 'none').attr('stroke-width', 2).attr('opacity', 0.4);

    // ── emitters at the surface, blowing at the berg ────────────────────────
    // Outer group carries the position (attribute transform); the inner
    // group carries the CSS bob animation — a CSS transform would otherwise
    // override the positioning attribute.
    const emitterG = svg
      .selectAll<SVGGElement, (typeof PANORAMA_SECTORS)[number]>('g.emitter')
      .data(PANORAMA_SECTORS, d => d.id)
      .join('g')
      .attr('class', 'emitter')
      .style('cursor', 'pointer');
    emitterG.append('g').attr('class', `bob ${reduceMotion ? '' : 'berg-bobble'}`);

    const windG = svg.append('g').attr('aria-hidden', 'true').attr('pointer-events', 'none');
    const windPaths = new Map<string, d3.Selection<SVGPathElement, unknown, null, undefined>>();
    PANORAMA_SECTORS.forEach(s => {
      const meta = EMITTERS[s.id];
      windPaths.set(
        s.id,
        windG
          .append('path')
          .attr('class', meta.sink ? 'berg-wind berg-wind-rev' : 'berg-wind')
          .attr('fill', 'none')
          .attr('stroke', meta.sink ? '#2e422f' : '#5c6770')
          .attr('stroke-dasharray', '7 9')
          .attr('stroke-linecap', 'round'),
      );
    });

    emitterG.each(function (d) {
      const meta = EMITTERS[d.id];
      const g = d3.select(this).select<SVGGElement>('g.bob');
      g.append('ellipse').attr('class', 'raft').attr('rx', 30).attr('ry', 7).attr('cy', 9).attr('fill', '#ffffff').attr('opacity', 0.55);
      g.append('circle').attr('cy', 9).attr('r', 3.5).attr('fill', d.color);
      g.append('text').attr('class', 'glyph').attr('text-anchor', 'middle').attr('dy', '0.1em').text(meta.glyph);
      g.append('text')
        .attr('class', 'tag')
        .attr('text-anchor', 'middle')
        .attr('y', 30)
        .attr('font-size', 10.5)
        .attr('font-weight', 600)
        .attr('fill', '#3D5265')
        .text(meta.label);
      g.append('text').attr('class', 'val').attr('text-anchor', 'middle').attr('y', 43).attr('font-size', 10).attr('fill', '#3D5265').attr('opacity', 0.8);
      if (!reduceMotion) {
        d3.range(3).forEach(i => {
          g.append('circle')
            .attr('class', meta.sink ? 'berg-puff berg-puff-absorb' : 'berg-puff')
            .attr('r', 4)
            .attr('cy', -16)
            .attr('fill', meta.sink ? '#4c7a4e' : '#7d868e')
            .style('--berg-dx', `${(meta.x < CX ? 1 : -1) * (38 + i * 8)}px`)
            .style('animation-delay', `${i * 1.1}s`);
        });
      }
      g.append('title');
    });

    // sea-level gauge at the far right
    const gauge = svg.append('g').attr('aria-hidden', 'true').attr('pointer-events', 'none');
    gauge.append('line').attr('x1', W - 26).attr('x2', W - 26).attr('y1', WL - 70).attr('y2', WL + 40).attr('stroke', '#3D5265').attr('stroke-width', 1.5).attr('opacity', 0.55);
    d3.range(0, 12).forEach(i => {
      gauge.append('line').attr('x1', W - 26).attr('x2', W - (i % 5 === 0 ? 14 : 19)).attr('y1', WL + 40 - i * 10).attr('y2', WL + 40 - i * 10).attr('stroke', '#3D5265').attr('opacity', 0.55);
    });
    const gaugeMarker = gauge.append('path').attr('d', 'M 0 0 l 9 -5 v 10 z').attr('fill', '#b04545');

    // ── per-frame scene renderer ────────────────────────────────────────────
    const skyTopColor = d3.interpolateRgb('#cfe5f6', '#f3cba1');
    const skyBotColor = d3.interpolateRgb('#eaf4fb', '#f9e3c8');
    const waterTopColor = d3.interpolateRgb('#7fb4d9', '#7ba2a8');
    const waterBotColor = d3.interpolateRgb('#28456b', '#5e4753');
    const sunColor = d3.interpolateRgb('#f9d66b', '#f26119');

    function facetPolygon(d: (typeof facets)[number], a0: number, a1: number, r: number): string {
      const pts: [number, number][] = [[CX, WL]];
      for (let k = 0; k <= SAMPLES; k++) {
        const phi = a0 + ((a1 - a0) * k) / SAMPLES;
        const rr = r * d.jitter[k];
        pts.push([CX + rr * Math.cos(phi), WL + rr * Math.sin(phi)]);
      }
      return `M ${pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ')} Z`;
    }

    function renderScene() {
      const mass = massAt(yearF);
      const heat = heatAt(mass);
      const s = Math.sqrt(mass);
      const sectorYear = Math.min(yearF, SECTOR_DATA_MAX);
      const waterY = WL - 64 * heat; // sea level rises as the berg melts (illustrative)

      // atmosphere + water
      skyTop.attr('stop-color', skyTopColor(heat));
      skyBot.attr('stop-color', skyBotColor(heat));
      waterTop.attr('stop-color', waterTopColor(heat));
      waterBot.attr('stop-color', waterBotColor(heat));
      water.attr('y', waterY).attr('height', H - waterY);
      sun.attr('r', 30 + 14 * heat).attr('fill', sunColor(heat));
      sunHalo.attr('r', 44 + 26 * heat).attr('fill', sunColor(heat));
      wave1.attr('stroke', d3.interpolateRgb('#bfdcec', '#d9c1b4')(heat));
      wave2.attr('stroke', '#ffffff');
      wavesG.attr('transform', `translate(0,${waterY})`);

      // berg tip (above its own waterline anchor)
      const tipPts = tipJitter
        .map(p => `${(CX + p.dx * 120 * s).toFixed(1)} ${(WL + p.dy * 118 * s).toFixed(1)}`)
        .join(' L ');
      tipPath.attr('d', `M ${tipPts} Z`);

      // facets: spans from real sector shares at the displayed year
      const weights = facets.map(f => Math.abs(valueAt(f.sector.series, sectorYear)));
      const totalW = d3.sum(weights);
      const A0 = Math.PI * 0.06;
      const A1 = Math.PI * 0.94;
      const GAP = 0.018;
      const angular = A1 - A0 - GAP * facets.length;
      let cursor = A0;
      facets.forEach((f, i) => {
        const span = (weights[i] / totalW) * angular;
        const a0 = cursor;
        const a1 = cursor + span;
        cursor = a1 + GAP;
        const g = d3.select(facetG.nodes()[i]) as d3.Selection<SVGGElement, unknown, null, undefined>;
        g.select<SVGPathElement>('path').attr('d', facetPolygon(f, a0, a1, R0 * s));
        const mid = (a0 + a1) / 2;
        const lr = R0 * s * 0.58;
        const lx = CX + lr * Math.cos(mid);
        const ly = WL + lr * Math.sin(mid);
        const wide = span * lr > f.sector.name.length * 6.4;
        g.select<SVGTextElement>('text:nth-of-type(1)')
          .attr('x', lx)
          .attr('y', ly)
          .style('opacity', wide ? 1 : 0)
          .text(f.sector.name);
        g.select<SVGTextElement>('text:nth-of-type(2)')
          .attr('x', lx)
          .attr('y', ly + 15)
          .style('opacity', wide ? 1 : 0)
          .text(`${formatMt(valueAt(f.sector.series, sectorYear))} Mt`);
        g.select('title').text(
          `${f.sector.name}: ${formatMt(valueAt(f.sector.series, sectorYear))} Mt CO₂e (${Math.round(sectorYear)})${f.sector.isSink ? ' — net removals' : ''}`,
        );
      });

      // rays + bubbles track the waterline
      rays.forEach((r, i) => {
        const bx = 320 + i * 160;
        r.attr('points', `${bx},${waterY + 6} ${bx + 46},${waterY + 6} ${bx + 130},${H - 30} ${bx + 30},${H - 30}`);
      });
      bubblesG.selectAll<SVGCircleElement, unknown>('circle').attr('cy', H - 40).style('--berg-rise', `${H - 60 - waterY}px`);

      // emitters ride the surface; size + wind strength from real emissions
      emitterG.each(function (d) {
        const meta = EMITTERS[d.id];
        const v = valueAt(d.series, sectorYear);
        const share = Math.abs(v) / totalW;
        const g = d3.select(this);
        g.attr('transform', `translate(${meta.x},${waterY - 6})`);
        g.select('text.glyph').attr('font-size', 20 + 70 * share);
        g.select('text.val').text(`${formatMt(v)} Mt`);
        g.select('title').text(`${meta.label}: ${formatMt(v)} Mt CO₂e (${Math.round(sectorYear)})`);
        const wind = windPaths.get(d.id)!;
        const tx = CX + (meta.x < CX ? -1 : 1) * 95 * s;
        wind
          .attr('d', `M ${meta.x + (meta.x < CX ? 26 : -26)} ${waterY - 18} Q ${(meta.x + tx) / 2} ${waterY - 64} ${tx} ${WL - 60 * s}`)
          .attr('stroke-width', 1 + 7 * share)
          .attr('opacity', meta.sink ? 0.5 : 0.28 + share * 0.9);
      });

      // impacts + gauge + HUD
      impactNodes.forEach(n => n.g.style('opacity', heat >= n.at ? 1 : 0).style('transition', 'opacity 600ms ease'));
      gaugeMarker.attr('transform', `translate(${W - 14},${waterY})`);

      if (hudYearRef.current) hudYearRef.current.textContent = String(Math.round(yearF));
      if (hudAnnualRef.current) hudAnnualRef.current.textContent = `${formatMt(totalAt(yearF, scenario))} Mt`;
      if (hudCumRef.current) hudCumRef.current.textContent = `${(cumulativeAt(cumBy[scenario], yearF) / 1000).toFixed(1)} Gt`;
      if (hudMassRef.current) hudMassRef.current.textContent = `${Math.round(mass * 100)} %`;
      if (hudSeaRef.current) hudSeaRef.current.textContent = `+${Math.round(heat * 80)} cm`;
    }

    // ── selection ───────────────────────────────────────────────────────────
    function applySelectionStyle() {
      facetPaths
        .attr('stroke', d => (d.sector.id === currentSelection ? '#2c2d2d' : '#eaf4fb'))
        .attr('stroke-width', d => (d.sector.id === currentSelection ? 3 : 2))
        .attr('fill', d =>
          d3.interpolateRgb(d.sector.color, '#bfdcec')(d.sector.id === currentSelection ? 0.08 : 0.32),
        );
      emitterG.select<SVGEllipseElement>('ellipse.raft')
        .attr('opacity', d => (d.id === currentSelection ? 0.95 : 0.55))
        .attr('fill', d => (d.id === currentSelection ? '#fff7d6' : '#ffffff'));
    }

    function clearSelection() {
      if (!currentSelection) return;
      currentSelection = null;
      applySelectionStyle();
      onSelectRef.current(null);
    }

    function select(id: string) {
      currentSelection = id;
      applySelectionStyle();
      onSelectRef.current(id);
    }

    facetPaths
      .attr('aria-label', d => `${d.sector.name} facet — select for details`)
      .on('click', (_e, d) => select(d.sector.id))
      .on('keydown', function (event: KeyboardEvent, d) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select(d.sector.id);
        }
      })
      .on('pointerenter', function () {
        d3.select(this).attr('filter', 'brightness(1.12)');
      })
      .on('pointerleave', function () {
        d3.select(this).attr('filter', null);
      });
    emitterG.on('click', (_e, d) => select(d.id));

    // ── time control ────────────────────────────────────────────────────────
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
        renderScene();
        setYearUi(YEAR_MAX);
        setPlayingUi(false);
        return;
      }
      playTimer = d3.timer(elapsed => {
        const u = Math.min(elapsed / duration, 1);
        yearF = startYear + span * u;
        renderScene();
        setYearUi(Math.round(yearF));
        if (u >= 1) pause();
      });
    }

    function animateYear(toYear: number) {
      if (reduceMotion) {
        yearF = toYear;
        renderScene();
        setYearUi(Math.round(toYear));
        return;
      }
      const fromYear = yearF;
      svg
        .transition('year')
        .duration(420)
        .ease(d3.easeCubicInOut)
        .tween('year', () => {
          const iy = d3.interpolate(fromYear, toYear);
          return (u: number) => {
            yearF = iy(u);
            renderScene();
          };
        });
      setYearUi(Math.round(toYear));
    }

    // ── 3D pointer tilt with springy follow ─────────────────────────────────
    let tiltRaf = 0;
    const tilt = { rx: 0, ry: 0, txr: 0, tyr: 0 };
    function tiltLoop() {
      tilt.rx += (tilt.txr - tilt.rx) * 0.09;
      tilt.ry += (tilt.tyr - tilt.ry) * 0.09;
      scene!.style.transform = `rotateX(${tilt.rx.toFixed(3)}deg) rotateY(${tilt.ry.toFixed(3)}deg)`;
      tiltRaf = requestAnimationFrame(tiltLoop);
    }
    function onTiltMove(event: PointerEvent) {
      const rect = scene!.getBoundingClientRect();
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      tilt.txr = -ny * 5;
      tilt.tyr = nx * 7;
    }
    function onTiltLeave() {
      tilt.txr = 0;
      tilt.tyr = 0;
    }
    if (!reduceMotion) {
      container.addEventListener('pointermove', onTiltMove);
      container.addEventListener('pointerleave', onTiltLeave);
      tiltRaf = requestAnimationFrame(tiltLoop);
    }

    renderScene();
    applySelectionStyle();

    apiRef.current = {
      applySelection(id: string | null) {
        // The detail panel can navigate to subsectors; highlight their sector.
        const sectorId =
          id && PANORAMA_SECTORS.some(s => s.id === id)
            ? id
            : id
              ? PANORAMA_SECTORS.find(s => s.children?.some(c => c.id === id))?.id ?? null
              : null;
        if (sectorId === currentSelection) return;
        currentSelection = sectorId;
        applySelectionStyle();
      },
      setYear(y: number, animate: boolean) {
        pause();
        if (animate) animateYear(y);
        else {
          yearF = y;
          renderScene();
          setYearUi(Math.round(y));
        }
      },
      setScenario(sc: IcebergScenario) {
        scenario = sc;
        setScenarioUi(sc);
        renderScene();
      },
      play,
      pause,
    };

    return () => {
      playTimer?.stop();
      cancelAnimationFrame(tiltRaf);
      container.removeEventListener('pointermove', onTiltMove);
      container.removeEventListener('pointerleave', onTiltLeave);
      apiRef.current = null;
      svg.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    apiRef.current?.applySelection(selectedId);
  }, [selectedId]);

  return (
    <div ref={containerRef} className="relative w-full select-none" style={{ perspective: '1300px' }}>
      <div ref={sceneRef} className="relative will-change-transform" style={{ transformStyle: 'preserve-3d' }}>
        {/* the scene */}
        <div ref={stageRef} className="relative rounded-xl overflow-hidden border border-grey-200 shadow-sm" />

        {/* frosted HUD card floating in front */}
        <div
          className="absolute top-3 left-3 sm:top-4 sm:left-4 pointer-events-none"
          style={{ transform: 'translateZ(46px)' }}
        >
          <div className="bg-white/80 backdrop-blur-[3px] ring-1 ring-white/70 shadow-[0_18px_45px_-16px_rgba(44,45,45,0.45)] rounded-lg px-3.5 py-2.5 text-[11px] text-tertiary leading-tight">
            <div className="flex items-baseline gap-2">
              <span ref={hudYearRef} className="text-[22px] font-bold text-tertiary-dark tabular-nums">{yearUi}</span>
              <span className="uppercase tracking-[0.1em] text-[9.5px]">
                {scenarioUi === 'wam' ? 'Member State projections' : '2040 advice pathway'}
              </span>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5">
              <span>Net emissions</span>
              <span ref={hudAnnualRef} className="font-semibold text-tertiary-dark tabular-nums text-right" />
              <span>Cumulative since 2005</span>
              <span ref={hudCumRef} className="font-semibold text-tertiary-dark tabular-nums text-right" />
              <span>Ice remaining <em className="not-italic opacity-60">(illustr.)</em></span>
              <span ref={hudMassRef} className="font-semibold text-tertiary-dark tabular-nums text-right" />
              <span>Sea level <em className="not-italic opacity-60">(illustr.)</em></span>
              <span ref={hudSeaRef} className="font-semibold text-tertiary-dark tabular-nums text-right" />
            </div>
          </div>
        </div>
      </div>

      {/* controls */}
      <div className="mt-3 flex flex-wrap items-center gap-3 px-1">
        <button
          type="button"
          onClick={() => (playingUi ? apiRef.current?.pause() : apiRef.current?.play())}
          aria-label={playingUi ? 'Pause time-lapse' : 'Play time-lapse 2005 to 2050'}
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
          className="flex-1 min-w-[160px] accent-[#004B7F] cursor-pointer"
        />
        <span className="text-[10px] text-tertiary tabular-nums shrink-0">{YEAR_MAX}</span>
        <div className="flex rounded-full border border-grey-300 overflow-hidden text-[11px] font-medium" role="group" aria-label="Scenario beyond 2022">
          {(
            [
              ['wam', 'Current projections'],
              ['advice', '2040 advice pathway'],
            ] as [IcebergScenario, string][]
          ).map(([sc, label]) => (
            <button
              key={sc}
              type="button"
              onClick={() => apiRef.current?.setScenario(sc)}
              className={`px-3 py-1.5 transition ${
                scenarioUi === sc ? 'bg-primary text-white' : 'bg-white text-tertiary hover:bg-grey-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1.5 px-1 text-[10.5px] text-tertiary">
        History to 2022 is the EEA record; beyond 2022 the slider follows the selected scenario.
        Facet sizes and all numbers are real; melt, sea level and impacts are an illustrative metaphor.
      </p>

      <style jsx global>{`
        @keyframes berg-bob-kf {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(6px) rotate(0.7deg); }
        }
        .berg-bob { animation: berg-bob-kf 9s ease-in-out infinite; }
        .berg-bobble { animation: berg-bob-kf 5s ease-in-out infinite; }

        @keyframes berg-cloud-drift {
          from { transform: translateX(0); }
          to { transform: translateX(60px); }
        }
        .berg-cloud-a { animation: berg-cloud-drift 26s ease-in-out infinite alternate; }
        .berg-cloud-b { animation: berg-cloud-drift 38s ease-in-out infinite alternate-reverse; }

        @keyframes berg-wind-kf {
          to { stroke-dashoffset: -160; }
        }
        .berg-wind { animation: berg-wind-kf 6s linear infinite; }
        .berg-wind-rev { animation-direction: reverse; }

        @keyframes berg-puff-kf {
          0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
          15% { opacity: 0.55; }
          100% { transform: translate(var(--berg-dx, 40px), -52px) scale(1.6); opacity: 0; }
        }
        .berg-puff { animation: berg-puff-kf 3.4s ease-out infinite; }
        @keyframes berg-puff-absorb-kf {
          0% { transform: translate(var(--berg-dx, 40px), -52px) scale(1.4); opacity: 0; }
          20% { opacity: 0.55; }
          100% { transform: translate(0, -4px) scale(0.4); opacity: 0; }
        }
        .berg-puff-absorb { animation: berg-puff-absorb-kf 3.4s ease-in infinite; }

        @keyframes berg-wave-a-kf {
          from { transform: translateX(0); }
          to { transform: translateX(-80px); }
        }
        .berg-wave-a { animation: berg-wave-a-kf 7s linear infinite; }
        .berg-wave-b { animation: berg-wave-a-kf 11s linear infinite reverse; }

        @keyframes berg-bubble-kf {
          0% { transform: translateY(0); opacity: 0; }
          12% { opacity: 0.5; }
          100% { transform: translateY(calc(-1 * var(--berg-rise, 240px))); opacity: 0; }
        }
        .berg-bubble { animation: berg-bubble-kf 7s linear infinite; }

        @keyframes berg-ray-kf {
          0%, 100% { opacity: 0.06; }
          50% { opacity: 0.16; }
        }
        .berg-ray-0 { animation: berg-ray-kf 6s ease-in-out infinite; }
        .berg-ray-1 { animation: berg-ray-kf 8s ease-in-out infinite 1.5s; }
        .berg-ray-2 { animation: berg-ray-kf 7s ease-in-out infinite 3s; }

        @media (prefers-reduced-motion: reduce) {
          .berg-bob, .berg-bobble, .berg-cloud-a, .berg-cloud-b, .berg-wind,
          .berg-puff, .berg-puff-absorb, .berg-wave-a, .berg-wave-b,
          .berg-bubble, .berg-ray-0, .berg-ray-1, .berg-ray-2 {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
