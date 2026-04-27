'use client';

/**
 * PolicyGapChart — renders a single indicator from the policy gap
 * assessment with historical data, benchmark trajectories, and target markers.
 *
 * Visual language:
 *   - Solid line: historical observations (Eurostat / EEA)
 *   - Dashed teal line: required trajectory (linear from latest data to targets)
 *   - Dashed red line: WEM projection (EEA "With Existing Measures") or
 *     fallback 5-year linear trend when projections unavailable
 *   - Dashed amber line: WAM projection (EEA "With Additional Measures")
 *   - Shaded area: policy gap (between WEM/trend and required trajectory)
 *   - ◆ markers: EU legislated targets
 */

import { useRef, useEffect } from 'react';
import {
  Chart,
  registerables,
  ChartDataset,
  PointStyle,
} from 'chart.js';

Chart.register(...registerables);

export interface BenchmarkPoint {
  year: number;
  value: number;
  label: string;
  type: 'target';
}

export interface ProjectionData {
  wem: { year: number; value: number }[];
  wam: { year: number; value: number }[];
}

interface Props {
  /** Historical data points */
  data: { year: number; value: number }[];
  /** Benchmark/target markers */
  benchmarks: BenchmarkPoint[];
  /** EEA WEM/WAM projections (optional — replaces simple trend when present) */
  projections?: ProjectionData;
  /** Chart title */
  title: string;
  /** Y-axis unit */
  unit: string;
  /** Indicator code (O1, E1, etc.) */
  code: string;
  /** Sector color */
  sectorColor: string;
  /** Compact mode */
  compact?: boolean;
  /** Canvas ID for export */
  canvasId?: string;
  /** Optional alternate unit to show alongside primary (e.g. Mtoe → TWh) */
  altUnit?: { unit: string; factor: number };
  /** Optional source attribution override (shown in subtitle) */
  sourceLabel?: string;
}

export default function PolicyGapChart({
  data,
  benchmarks,
  projections,
  title,
  unit,
  code,
  sectorColor,
  compact,
  canvasId,
  altUnit,
  sourceLabel,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;
    chartRef.current?.destroy();

    const sorted = [...data].sort((a, b) => a.year - b.year);
    const lastHistorical = sorted[sorted.length - 1];
    const firstYear = sorted[0].year;

    // Build year range from first data year to max benchmark year
    const maxBenchmarkYear = Math.max(...benchmarks.map(b => b.year), lastHistorical.year + 5);
    const years: number[] = [];
    for (let y = firstYear; y <= maxBenchmarkYear; y++) years.push(y);
    const labels = years.map(String);

    // Historical data series
    const historicalData = years.map(y => {
      const pt = sorted.find(p => p.year === y);
      return pt ? pt.value : null;
    });

    // Linear trajectory from last historical point to first benchmark
    const targetBenchmarks = benchmarks.filter(b => b.type === 'target');
    const nearestTarget = targetBenchmarks.sort((a, b) => a.year - b.year)[0];

    const trajectoryData = years.map(y => {
      if (y < lastHistorical.year || !nearestTarget) return null;
      if (y === lastHistorical.year) return lastHistorical.value;
      if (y > nearestTarget.year) return null;
      // Linear interpolation
      const t = (y - lastHistorical.year) / (nearestTarget.year - lastHistorical.year);
      return lastHistorical.value + t * (nearestTarget.value - lastHistorical.value);
    });

    // Required trajectory (from last historical to furthest target through all benchmarks)
    const allTargets = [...targetBenchmarks].sort((a, b) => a.year - b.year);
    const requiredData = years.map(y => {
      if (y < lastHistorical.year) return null;
      if (y === lastHistorical.year) return lastHistorical.value;

      // Find which segment we're in
      const waypoints = [{ year: lastHistorical.year, value: lastHistorical.value }, ...allTargets];
      for (let i = 0; i < waypoints.length - 1; i++) {
        if (y >= waypoints[i].year && y <= waypoints[i + 1].year) {
          const t = (y - waypoints[i].year) / (waypoints[i + 1].year - waypoints[i].year);
          return waypoints[i].value + t * (waypoints[i + 1].value - waypoints[i].value);
        }
      }
      return null;
    });

    // ── EEA Projections (WEM/WAM) or fallback linear trend ──────────────
    const hasProjections = projections && (projections.wem.length > 0 || projections.wam.length > 0);

    // WEM projection line (With Existing Measures)
    let wemData: (number | null)[] | null = null;
    if (hasProjections && projections.wem.length > 0) {
      const wemMap = new Map(projections.wem.map(p => [p.year, p.value]));
      // Connect from last historical point to first WEM projection
      wemData = years.map(y => {
        if (y < lastHistorical.year) return null;
        if (y === lastHistorical.year) return lastHistorical.value;
        if (wemMap.has(y)) return wemMap.get(y)!;
        // Interpolate between WEM points
        const wemSorted = projections.wem.sort((a, b) => a.year - b.year);
        const allPts = [{ year: lastHistorical.year, value: lastHistorical.value }, ...wemSorted];
        for (let i = 0; i < allPts.length - 1; i++) {
          if (y > allPts[i].year && y < allPts[i + 1].year) {
            const t = (y - allPts[i].year) / (allPts[i + 1].year - allPts[i].year);
            return allPts[i].value + t * (allPts[i + 1].value - allPts[i].value);
          }
        }
        return null;
      });
    }

    // WAM projection line (With Additional Measures)
    let wamData: (number | null)[] | null = null;
    if (hasProjections && projections.wam.length > 0) {
      const wamMap = new Map(projections.wam.map(p => [p.year, p.value]));
      wamData = years.map(y => {
        if (y < lastHistorical.year) return null;
        if (y === lastHistorical.year) return lastHistorical.value;
        if (wamMap.has(y)) return wamMap.get(y)!;
        // Interpolate between WAM points
        const wamSorted = projections.wam.sort((a, b) => a.year - b.year);
        const allPts = [{ year: lastHistorical.year, value: lastHistorical.value }, ...wamSorted];
        for (let i = 0; i < allPts.length - 1; i++) {
          if (y > allPts[i].year && y < allPts[i + 1].year) {
            const t = (y - allPts[i].year) / (allPts[i + 1].year - allPts[i].year);
            return allPts[i].value + t * (allPts[i + 1].value - allPts[i].value);
          }
        }
        return null;
      });
    }

    // Fallback: linear extrapolation of recent trend (last 5 years)
    // Only used when EEA projections are not available
    const recentYears = sorted.slice(-5);
    let trendData: (number | null)[] | null = null;
    if (!hasProjections && recentYears.length >= 3) {
      const n = recentYears.length;
      const sumX = recentYears.reduce((s, p) => s + p.year, 0);
      const sumY = recentYears.reduce((s, p) => s + p.value, 0);
      const sumXY = recentYears.reduce((s, p) => s + p.year * p.value, 0);
      const sumX2 = recentYears.reduce((s, p) => s + p.year * p.year, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      trendData = years.map(y => {
        if (y < lastHistorical.year) return null;
        if (y > lastHistorical.year + 10) return null; // Only project 10 years
        return slope * y + intercept;
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const datasets: ChartDataset<'line', any>[] = [];

    // ── Gap shading & projection lines ─────────────────────────────────
    // Use WEM projection line (or fallback trend) as the upper bound of
    // the policy gap shading.
    const gapUpperData = wemData || trendData;

    if (gapUpperData) {
      datasets.push({
        label: '_gapUpper',
        data: gapUpperData,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        borderWidth: 0,
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
        tension: 0,
        spanGaps: true,
        order: 10,
      });
      datasets.push({
        label: 'Policy gap',
        data: requiredData,
        borderColor: 'transparent',
        backgroundColor: 'rgba(242, 97, 25, 0.12)',
        borderWidth: 0,
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: '-1',
        tension: 0,
        spanGaps: true,
        order: 10,
      });
    }

    // Required trajectory (dashed, dark)
    datasets.push({
      label: 'Required trajectory',
      data: requiredData,
      borderColor: '#608c95',
      backgroundColor: '#608c95',
      borderWidth: compact ? 1.5 : 2,
      pointRadius: 0,
      pointHoverRadius: 3,
      tension: 0,
      spanGaps: true,
      fill: false,
      borderDash: [6, 4],
      order: 3,
    });

    // WEM projection line (EEA "With Existing Measures")
    if (wemData) {
      datasets.push({
        label: 'WEM projection (EEA)',
        data: wemData,
        borderColor: '#b04545',
        backgroundColor: '#b04545',
        borderWidth: compact ? 1.5 : 2,
        pointRadius: compact ? 2 : 3,
        pointHoverRadius: compact ? 3 : 5,
        tension: 0.2,
        spanGaps: true,
        fill: false,
        borderDash: [6, 3],
        order: 4,
      });
    }

    // WAM projection line (EEA "With Additional Measures")
    if (wamData) {
      datasets.push({
        label: 'WAM projection (EEA)',
        data: wamData,
        borderColor: '#d4882c',
        backgroundColor: '#d4882c',
        borderWidth: compact ? 1.5 : 2,
        pointRadius: compact ? 2 : 3,
        pointHoverRadius: compact ? 3 : 5,
        tension: 0.2,
        spanGaps: true,
        fill: false,
        borderDash: [3, 3],
        order: 5,
      });
    }

    // Fallback: simple trend extrapolation (only when no EEA projections)
    if (trendData) {
      datasets.push({
        label: 'Current trend',
        data: trendData,
        borderColor: '#b04545',
        backgroundColor: '#b04545',
        borderWidth: compact ? 1.5 : 2,
        pointRadius: 0,
        pointHoverRadius: 3,
        tension: 0,
        spanGaps: true,
        fill: false,
        borderDash: [3, 3],
        order: 4,
      });
    }

    // Historical data (solid line)
    datasets.push({
      label: 'Historical (Eurostat/EEA)',
      data: historicalData,
      borderColor: sectorColor,
      backgroundColor: sectorColor,
      borderWidth: compact ? 2 : 3,
      pointRadius: compact ? 1 : 2,
      pointHoverRadius: compact ? 3 : 5,
      tension: 0.2,
      spanGaps: false,
      fill: false,
      order: 1,
    });

    // Benchmark markers
    const targetMarkers = years.map(y => {
      const t = benchmarks.find(b => b.year === y && b.type === 'target');
      return t ? t.value : null;
    });
    datasets.push({
      label: 'EU legislated targets',
      data: targetMarkers,
      borderColor: '#3d5584',
      backgroundColor: '#3d5584',
      borderWidth: 0,
      pointRadius: compact ? 6 : 9,
      pointHoverRadius: compact ? 8 : 12,
      pointStyle: 'rectRot' as PointStyle,
      showLine: false,
      fill: false,
      order: 0,
    });

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
            text: compact ? `${code}: ${title.split('—')[0]?.trim() || title}` : `${code} — ${title}`,
            font: { size: compact ? 12 : 14, weight: 'bold' },
            color: sectorColor,
            padding: { bottom: 4 },
          },
          subtitle: {
            display: !compact,
            text: (() => {
              const sourcePart = sourceLabel
                ? `Source: ${sourceLabel}`
                : 'Source: Eurostat / EEA GHG inventory (auto-updated)';
              return hasProjections
                ? `${sourcePart} · Projections: EEA WEM/WAM (Trends & Projections 2024) · Benchmarks: EU Climate Law / EED / Fit for 55 MIX`
                : `${sourcePart} · Benchmarks: EU Climate Law / EED / Fit for 55 MIX (EC, 2021)`;
            })(),
            font: { size: 10, style: 'italic' },
            color: '#808285',
            padding: { bottom: 8 },
          },
          legend: {
            display: !compact,
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: { size: 10 },
              color: '#3D5265',
              usePointStyle: true,
              filter: (item) => !(item.text || '').startsWith('_'),
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
                if (name.startsWith('_')) return '';
                if (val == null) return '';
                // Show benchmark label on hover
                const year = years[ctx.dataIndex];
                const bm = benchmarks.find(b => b.year === year);
                const suffix = bm ? ` (${bm.label})` : '';
                const primary = `${val.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`;
                const secondary = altUnit
                  ? ` / ${(val * altUnit.factor).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${altUnit.unit}`
                  : '';
                return `${name}: ${primary}${secondary}${suffix}`;
              },
            },
            filter: (item) => !(item.dataset.label || '').startsWith('_'),
          },
        },
        scales: {
          x: {
            title: { display: !compact, text: 'Year', color: '#3D5265' },
            grid: { color: '#F3F4F5' },
            ticks: {
              color: '#808285',
              maxRotation: 45,
              font: { size: compact ? 9 : 11 },
              callback: function(val) {
                const year = Number(this.getLabelForValue(val as number));
                // Show every 5 years
                return year % 5 === 0 ? String(year) : '';
              },
            },
          },
          y: {
            title: { display: true, text: unit, color: '#3D5265', font: { size: compact ? 9 : 12 } },
            grid: { color: '#F3F4F5' },
            ticks: { color: '#808285', font: { size: compact ? 9 : 11 } },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); };
  }, [data, benchmarks, projections, title, unit, code, sectorColor, compact, altUnit, sourceLabel]);

  return (
    <div style={{ height: compact ? 280 : 420 }}>
      <canvas ref={canvasRef} id={canvasId} />
    </div>
  );
}
