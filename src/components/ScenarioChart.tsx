/**
 * Chart.js line chart for scenario projections with median/percentile envelopes and historical mode.
 */
'use client';

import { useRef, useEffect, useState } from 'react';
import { Chart, registerables, ChartDataset } from 'chart.js';
import { usePreferences } from '@/lib/preferences-context';

Chart.register(...registerables);

interface Props {
  series: { label: string; points: { year: number; value: number }[]; category?: string }[];
  unit: string;
  variable: string;
  region: string;
  compact?: boolean;
  policyGapMode?: boolean;
  /**
   * If true, render each series as its own line and skip the median/percentile
   * envelope. Used for historical observation data (e.g. Eurostat, EEA) where
   * statistical aggregation is meaningless.
   */
  historical?: boolean;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

const PARIS_CATS = new Set(['C1', 'C2']);
const CURRENT_POLICY_CATS = new Set(['C5', 'C6', 'C7', 'C8']);

function computeStats(seriesSubset: Props['series'], allYears: number[]) {
  const median: (number | null)[] = [];
  const p10: (number | null)[] = [];
  const p25: (number | null)[] = [];
  const p75: (number | null)[] = [];
  const p90: (number | null)[] = [];
  for (const year of allYears) {
    const vals = seriesSubset
      .map(s => s.points.find(p => p.year === year)?.value)
      .filter((v): v is number => v != null && !isNaN(v))
      .sort((a, b) => a - b);
    if (vals.length === 0) { median.push(null); p10.push(null); p25.push(null); p75.push(null); p90.push(null); }
    else { median.push(percentile(vals, 50)); p10.push(percentile(vals, 10)); p25.push(percentile(vals, 25)); p75.push(percentile(vals, 75)); p90.push(percentile(vals, 90)); }
  }
  return { median, p10, p25, p75, p90 };
}

// Distinct colours for historical/observation series (one line per region)
const HISTORICAL_COLORS = [
  '#003399', '#FF9933', '#007B6C', '#B83230', '#A530B8',
  '#54728C', '#6667AB', '#0065A4', '#D17B00', '#005B47',
];

// Wong-2011 deuteranope-safe palette — used when the user has the
// colour-blind-safe toggle enabled in preferences.
const HISTORICAL_COLORS_CB = [
  '#000000', '#E69F00', '#56B4E9', '#009E73', '#F0E442',
  '#0072B2', '#D55E00', '#CC79A7', '#56B4E9', '#009E73',
];

export default function ScenarioChart({ series, unit, variable, region, compact, policyGapMode, historical }: Props) {
  const { prefs } = usePreferences();
  const palette = prefs.colorblind_safe ? HISTORICAL_COLORS_CB : HISTORICAL_COLORS;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || series.length === 0) return;

    chartRef.current?.destroy();

    const allYears = [...new Set(series.flatMap(s => s.points.map(p => p.year)))].sort((a, b) => a - b);
    const labels = allYears.map(String);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let datasets: ChartDataset<'line', any>[];

    // ── Historical mode: one line per series, no percentile aggregation ──
    if (historical) {
      datasets = series.map((s, i) => {
        const color = palette[i % palette.length];
        return {
          label: s.label,
          data: allYears.map(y => s.points.find(p => p.year === y)?.value ?? null),
          borderColor: color,
          backgroundColor: color,
          borderWidth: compact ? 2 : 2.5,
          pointRadius: compact ? 1 : 2,
          pointHoverRadius: compact ? 3 : 5,
          tension: 0.25,
          spanGaps: true,
          fill: false,
        };
      });
    } else if (policyGapMode) {
    // ── Policy Gap Mode: compare C1/C2 median vs C5-C8 median ──────────
      const parisSeries = series.filter(s => {
        const cat = s.category || (s.label.match(/\[([^\]]+)\]/)?.[1] || '');
        return PARIS_CATS.has(cat);
      });
      const currentSeries = series.filter(s => {
        const cat = s.category || (s.label.match(/\[([^\]]+)\]/)?.[1] || '');
        return CURRENT_POLICY_CATS.has(cat);
      });
      // Also collect C3/C4 as "intermediate" if present
      const intermediateSeries = series.filter(s => {
        const cat = s.category || (s.label.match(/\[([^\]]+)\]/)?.[1] || '');
        return cat === 'C3' || cat === 'C4';
      });

      const paris = computeStats(parisSeries, allYears);
      const current = computeStats(currentSeries, allYears);
      const intermediate = intermediateSeries.length > 0 ? computeStats(intermediateSeries, allYears) : null;

      datasets = [
        // Current policies P25-P75 band (red)
        { label: '_cp75', data: current.p75, borderColor: 'transparent', backgroundColor: 'transparent', borderWidth: 0, pointRadius: 0, pointHoverRadius: 0, fill: false, tension: 0.3, spanGaps: true, order: 5 },
        { label: 'Current policies range (C5–C8)', data: current.p25, borderColor: 'transparent', backgroundColor: 'rgba(184, 50, 48, 0.12)', borderWidth: 0, pointRadius: 0, pointHoverRadius: 0, fill: '-1', tension: 0.3, spanGaps: true, order: 5 },
        // Paris-aligned P25-P75 band (blue)
        { label: '_pa75', data: paris.p75, borderColor: 'transparent', backgroundColor: 'transparent', borderWidth: 0, pointRadius: 0, pointHoverRadius: 0, fill: false, tension: 0.3, spanGaps: true, order: 4 },
        { label: 'Paris-aligned range (C1–C2)', data: paris.p25, borderColor: 'transparent', backgroundColor: 'rgba(0, 75, 127, 0.15)', borderWidth: 0, pointRadius: 0, pointHoverRadius: 0, fill: '-1', tension: 0.3, spanGaps: true, order: 4 },
        // GAP FILL: shade between the two medians (the policy gap)
        { label: '_gapUpper', data: current.median, borderColor: 'transparent', backgroundColor: 'transparent', borderWidth: 0, pointRadius: 0, pointHoverRadius: 0, fill: false, tension: 0.3, spanGaps: true, order: 3 },
        { label: 'Policy Implementation Gap', data: paris.median, borderColor: 'transparent', backgroundColor: 'rgba(255, 165, 0, 0.25)', borderWidth: 0, pointRadius: 0, pointHoverRadius: 0, fill: '-1', tension: 0.3, spanGaps: true, order: 3 },
        // Current policies median (red)
        {
          label: `Current Policies median C5–C8 (n=${currentSeries.length})`,
          data: current.median,
          borderColor: '#B83230',
          backgroundColor: '#B83230',
          borderWidth: compact ? 2.5 : 3,
          pointRadius: compact ? 1.5 : 2.5,
          pointHoverRadius: compact ? 4 : 6,
          tension: 0.3,
          spanGaps: true,
          fill: false,
          order: 1,
          borderDash: [6, 3],
        },
        // Paris-aligned median (blue)
        {
          label: `Paris-aligned median C1–C2 (n=${parisSeries.length})`,
          data: paris.median,
          borderColor: '#004B7F',
          backgroundColor: '#004B7F',
          borderWidth: compact ? 2.5 : 3,
          pointRadius: compact ? 1.5 : 2.5,
          pointHoverRadius: compact ? 4 : 6,
          tension: 0.3,
          spanGaps: true,
          fill: false,
          order: 1,
        },
      ];

      // Add C3/C4 intermediate if available
      if (intermediate) {
        datasets.push({
          label: `Below 2°C median C3–C4 (n=${intermediateSeries.length})`,
          data: intermediate.median,
          borderColor: '#007B6C',
          backgroundColor: '#007B6C',
          borderWidth: compact ? 2 : 2.5,
          pointRadius: compact ? 1 : 2,
          pointHoverRadius: compact ? 3 : 5,
          tension: 0.3,
          spanGaps: true,
          fill: false,
          order: 2,
          borderDash: [3, 3],
        });
      }

    } else {
    // ── Standard mode: single median across all series ──────────────
    const stats = computeStats(series, allYears);

    datasets = [
      // P10-P90 band (light fill)
      {
        label: 'P90',
        data: stats.p90,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        borderWidth: 0,
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
        tension: 0.3,
        spanGaps: true,
        order: 3,
      },
      {
        label: 'P10–P90 range',
        data: stats.p10,
        borderColor: 'transparent',
        backgroundColor: 'rgba(0, 75, 127, 0.10)',
        borderWidth: 0,
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: '-1', // fill to previous dataset (P90)
        tension: 0.3,
        spanGaps: true,
        order: 3,
      },
      // P25-P75 band (darker fill)
      {
        label: 'P75',
        data: stats.p75,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        borderWidth: 0,
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
        tension: 0.3,
        spanGaps: true,
        order: 2,
      },
      {
        label: 'P25–P75 range',
        data: stats.p25,
        borderColor: 'transparent',
        backgroundColor: 'rgba(0, 75, 127, 0.20)',
        borderWidth: 0,
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: '-1', // fill to previous dataset (P75)
        tension: 0.3,
        spanGaps: true,
        order: 2,
      },
      // Median line (thick, prominent)
      {
        label: `Median (n=${series.length})`,
        data: stats.median,
        borderColor: '#004B7F',
        backgroundColor: '#004B7F',
        borderWidth: compact ? 2.5 : 3,
        pointRadius: compact ? 1.5 : 2.5,
        pointHoverRadius: compact ? 4 : 6,
        tension: 0.3,
        spanGaps: true,
        fill: false,
        order: 1,
      },
    ];
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          title: {
            display: true,
            text: compact
              ? variable.split('|').pop() || variable
              : historical
                ? `${variable} — ${region} (historical)`
                : policyGapMode
                  ? `${variable} — Policy Gap — ${region}`
                  : `${variable} — ${region}`,
            font: { size: compact ? 12 : 14, weight: 'bold' as const },
            color: historical ? '#003399' : policyGapMode ? '#B83230' : '#2E3E4C',
          },
          subtitle: historical ? {
            display: !compact,
            text: 'Historical observations — one line per series, no statistical aggregation',
            font: { size: 10, style: 'italic' as const },
            color: '#808285',
            padding: { bottom: 8 },
          } : policyGapMode ? {
            display: !compact,
            text: 'Orange shaded area = implementation gap between current policies (C5–C8) and Paris-aligned pathways (C1–C2)',
            font: { size: 10, style: 'italic' as const },
            color: '#808285',
            padding: { bottom: 8 },
          } : { display: false },
          legend: {
            display: !compact || policyGapMode || historical,
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: { size: 10 },
              color: '#3D5265',
              usePointStyle: false,
              filter: (item) => {
                const t = item.text || '';
                // Hide invisible boundary/fill datasets
                return t !== 'P90' && t !== 'P75' && !t.startsWith('_');
              },
            },
          },
          tooltip: {
            backgroundColor: '#2E3E4C',
            titleFont: { size: 11 },
            bodyFont: { size: 10 },
            callbacks: {
              label: ctx => {
                const val = ctx.parsed.y;
                const name = ctx.dataset.label || '';
                // Skip invisible boundary datasets
                if (name === 'P90' || name === 'P75' || name.startsWith('_')) return '';
                return `${name}: ${val != null ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'} ${unit}`;
              },
            },
            filter: (item) => {
              const l = item.dataset.label || '';
              return l !== 'P90' && l !== 'P75' && !l.startsWith('_');
            },
          },
          filler: {
            propagate: true,
          },
        },
        scales: {
          x: {
            title: { display: !compact, text: 'Year', color: '#3D5265' },
            grid: { color: '#F3F4F5' },
            ticks: { color: '#808285', maxRotation: 45, font: { size: compact ? 9 : 11 } },
          },
          y: {
            title: { display: true, text: unit || 'Value', color: '#3D5265', font: { size: compact ? 9 : 12 } },
            grid: { color: '#F3F4F5' },
            ticks: { color: '#808285', font: { size: compact ? 9 : 11 } },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); };
  }, [series, unit, variable, region, compact, policyGapMode, prefs.colorblind_safe]);

  // Brush selection (M·02 #1): drag horizontally on the chart to select a
  // year range; a callout shows delta + CAGR between endpoint medians.
  // Disabled in compact mode — too small to drag accurately.
  const [brush, setBrush] = useState<{ x1: number; x2: number; y1: number | null; y2: number | null } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; chart: Chart | null } | null>(null);
  // Synchronized cursor across all visible ScenarioCharts (M·02 #2).
  // Each chart broadcasts the year under the user's cursor on
  // mousemove; every other chart listens and renders a thin vertical
  // line at the corresponding x. Lets two side-by-side scenario
  // panels track each other without explicit pairing.
  const [syncedYear, setSyncedYear] = useState<number | null>(null);
  useEffect(() => {
    function onSync(e: Event) {
      const detail = (e as CustomEvent<{ year: number | null }>).detail;
      setSyncedYear(detail?.year ?? null);
    }
    window.addEventListener('mh:scenario-cursor', onSync as EventListener);
    return () => window.removeEventListener('mh:scenario-cursor', onSync as EventListener);
  }, []);
  function broadcastCursor(year: number | null) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('mh:scenario-cursor', { detail: { year } }));
  }

  function pixelToYear(px: number): number | null {
    const chart = chartRef.current;
    if (!chart || !chart.scales || !chart.scales.x) return null;
    const v = (chart.scales.x as { getValueForPixel?: (p: number) => number | undefined }).getValueForPixel?.(px);
    return typeof v === 'number' ? Math.round(v) : null;
  }

  function medianAtYear(year: number): number | null {
    const vals: number[] = [];
    for (const s of series) {
      const pt = s.points.find(p => p.year === year);
      if (pt && Number.isFinite(pt.value)) vals.push(pt.value);
    }
    if (vals.length === 0) return null;
    vals.sort((a, b) => a - b);
    const mid = Math.floor(vals.length / 2);
    return vals.length % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid];
  }

  function onPointerDown(e: React.PointerEvent) {
    if (compact) return;
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { startX: e.clientX - rect.left, chart: chartRef.current };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    // Broadcast cursor on every move (regardless of brushing) so siblings
    // can sync their vertical-line cursor.
    const rect = overlayRef.current?.getBoundingClientRect();
    if (rect) {
      const localX = e.clientX - rect.left;
      const y = pixelToYear(localX);
      broadcastCursor(y);
    }
    if (!dragRef.current) return;
    if (!rect) return;
    const x1 = Math.min(dragRef.current.startX, e.clientX - rect.left);
    const x2 = Math.max(dragRef.current.startX, e.clientX - rect.left);
    if (Math.abs(x2 - x1) < 6) return; // ignore click-without-drag
    const y1 = pixelToYear(x1);
    const y2 = pixelToYear(x2);
    setBrush({ x1, x2, y1, y2 });
  }
  function onPointerLeave() { broadcastCursor(null); }
  function onPointerUp() {
    dragRef.current = null;
  }
  function clearBrush() { setBrush(null); }

  const callout = (() => {
    if (!brush || brush.y1 == null || brush.y2 == null || brush.y1 === brush.y2) return null;
    const va = medianAtYear(brush.y1);
    const vb = medianAtYear(brush.y2);
    if (va == null || vb == null) return null;
    const deltaAbs = vb - va;
    const deltaPct = va !== 0 ? (deltaAbs / Math.abs(va)) * 100 : null;
    const years = Math.abs(brush.y2 - brush.y1);
    const cagr = (years > 0 && va > 0 && vb > 0) ? (Math.pow(vb / va, 1 / years) - 1) * 100 : null;
    return { va, vb, deltaAbs, deltaPct, cagr, years };
  })();

  // Sonification (M·02 #6): play the median curve as a 3 s pitch line.
  // Useful for screen-reader users (WCAG 1.1.1 — non-text content has an
  // alternative) and for sighted users skimming many series. Web Audio
  // is created lazily on click so we don't request audio context on load.
  function playSonification() {
    if (typeof window === 'undefined' || !window.AudioContext) return;
    // Build the median time-series.
    const allYears = Array.from(new Set(series.flatMap(s => s.points.map(p => p.year)))).sort((a, b) => a - b);
    const points: { year: number; value: number }[] = [];
    for (const y of allYears) {
      const v = medianAtYear(y);
      if (v != null && Number.isFinite(v)) points.push({ year: y, value: v });
    }
    if (points.length < 2) return;
    const vMin = Math.min(...points.map(p => p.value));
    const vMax = Math.max(...points.map(p => p.value));
    const range = vMax - vMin || 1;
    const ctx = new (window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    const total = 3.0; // seconds
    // Map value → 220 Hz (low) … 880 Hz (high).
    const freqAt = (v: number) => 220 + 660 * ((v - vMin) / range);
    osc.frequency.setValueAtTime(freqAt(points[0].value), now);
    points.forEach((p, i) => {
      const t = now + (i / (points.length - 1)) * total;
      osc.frequency.exponentialRampToValueAtTime(Math.max(50, freqAt(p.value)), t);
    });
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + total);
    osc.start(now);
    osc.stop(now + total + 0.05);
    osc.onended = () => { ctx.close().catch(() => {}); };
  }

  return (
    <div className="relative" style={{ height: compact ? 260 : 400 }}>
      <canvas ref={canvasRef} />
      {!compact && (
        <button
          type="button"
          onClick={playSonification}
          className="mh-focus mh-motion-fast absolute top-1 right-1 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--mh-card)] border border-[var(--mh-border)] text-[var(--mh-muted)] hover:text-[var(--mh-status-primary)] hover:border-[var(--mh-status-primary)]"
          style={{ fontSize: 'var(--mh-text-2xs)', fontWeight: 600 }}
          title="Play the median curve as a 3-second pitch line (accessibility)"
          aria-label="Play series as audio"
        >
          🔊 Play
        </button>
      )}
      {!compact && (
        <div
          ref={overlayRef}
          className="absolute inset-0"
          style={{ cursor: 'crosshair' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerLeave}
          onDoubleClick={clearBrush}
          aria-hidden="true"
        >
          {/* Synchronized cursor: thin vertical line at the year another
              chart's pointer is currently over. Skipped while brushing
              (the selection rectangle is the focal). */}
          {!brush && syncedYear != null && (() => {
            const chart = chartRef.current;
            const px = (chart?.scales?.x as { getPixelForValue?: (v: number) => number | undefined } | undefined)?.getPixelForValue?.(syncedYear);
            if (typeof px !== 'number' || !Number.isFinite(px)) return null;
            return (
              <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{
                  left: px,
                  width: 1,
                  background: 'var(--mh-status-info)',
                  opacity: 0.6,
                }}
              >
                <span
                  className="absolute -top-0.5 left-1 mh-tnum"
                  style={{
                    fontSize: 'var(--mh-text-2xs)',
                    color: 'var(--mh-status-info)',
                    background: 'var(--mh-card)',
                    padding: '0 4px',
                    borderRadius: 3,
                    border: '1px solid var(--mh-status-info)',
                  }}
                >
                  {syncedYear}
                </span>
              </div>
            );
          })()}
          {brush && (
            <>
              <div
                className="absolute top-0 bottom-0 bg-[var(--mh-status-primary)]/12 border-l-2 border-r-2 border-[var(--mh-status-primary)] pointer-events-none"
                style={{ left: brush.x1, width: brush.x2 - brush.x1 }}
              />
              {callout && (
                <div
                  className="absolute top-2 px-2 py-1 rounded-md bg-[var(--mh-card)] border border-[var(--mh-status-primary)] shadow-md pointer-events-auto mh-tnum max-w-[min(220px,calc(100%-1rem))]"
                  style={{
                    // Keep the callout fully on-screen on narrow viewports.
                    // Caps `left` so the callout's right edge never exceeds
                    // the chart container; falls back to 8px if the brush
                    // starts near the right edge.
                    left: (() => {
                      const cw = overlayRef.current?.clientWidth ?? 9999;
                      const calloutWidth = Math.min(220, cw - 16);
                      return Math.max(8, Math.min(brush.x1 + 8, cw - calloutWidth - 8));
                    })(),
                    fontSize: 'var(--mh-text-xs)',
                  }}
                >
                  <div className="font-semibold text-[var(--mh-status-primary)]">
                    {brush.y1} → {brush.y2}
                    <button
                      type="button"
                      onClick={clearBrush}
                      className="ml-2 text-[var(--mh-muted)] hover:text-[var(--mh-fg)]"
                      aria-label="Clear selection"
                    >×</button>
                  </div>
                  <div className="text-[var(--mh-fg)]">
                    Δ {callout.deltaAbs >= 0 ? '+' : ''}{callout.deltaAbs.toFixed(2)}
                    {callout.deltaPct != null && <> · {callout.deltaPct >= 0 ? '+' : ''}{callout.deltaPct.toFixed(1)}%</>}
                  </div>
                  {callout.cagr != null && (
                    <div className="text-[var(--mh-muted)]">
                      CAGR {callout.cagr >= 0 ? '+' : ''}{callout.cagr.toFixed(2)}%/yr
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
