'use client';

import { useRef, useEffect } from 'react';
import { Chart, registerables, ChartDataset } from 'chart.js';

Chart.register(...registerables);

interface Props {
  series: { label: string; points: { year: number; value: number }[] }[];
  unit: string;
  variable: string;
  region: string;
  compact?: boolean;
}

/**
 * Fan chart showing median line with P10/P25/P75/P90 quantile bands.
 * Computes percentiles across all series for each year.
 */
export default function FanChart({ series, unit, variable, region, compact }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || series.length === 0) return;
    chartRef.current?.destroy();

    const allYears = [...new Set(series.flatMap(s => s.points.map(p => p.year)))].sort((a, b) => a - b);

    // Compute percentiles per year
    const percentile = (arr: number[], p: number) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = (p / 100) * (sorted.length - 1);
      const lo = Math.floor(idx);
      const hi = Math.ceil(idx);
      return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
    };

    const stats = allYears.map(year => {
      const vals = series.map(s => s.points.find(p => p.year === year)?.value).filter((v): v is number => v != null);
      if (vals.length === 0) return { year, p10: null, p25: null, p50: null, p75: null, p90: null, min: null, max: null };
      return {
        year,
        p10: percentile(vals, 10),
        p25: percentile(vals, 25),
        p50: percentile(vals, 50),
        p75: percentile(vals, 75),
        p90: percentile(vals, 90),
        min: Math.min(...vals),
        max: Math.max(...vals),
      };
    });

    const datasets: ChartDataset<'line'>[] = [
      // P10-P90 band (lightest)
      {
        label: 'P10–P90 range',
        data: stats.map(s => s.p90),
        borderColor: 'transparent',
        backgroundColor: '#004B7F15',
        fill: '+1',
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: '_p10',
        data: stats.map(s => s.p10),
        borderColor: 'transparent',
        backgroundColor: '#004B7F15',
        fill: false,
        pointRadius: 0,
        tension: 0.3,
      },
      // P25-P75 band (medium)
      {
        label: 'P25–P75 range',
        data: stats.map(s => s.p75),
        borderColor: 'transparent',
        backgroundColor: '#004B7F25',
        fill: '+1',
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: '_p25',
        data: stats.map(s => s.p25),
        borderColor: 'transparent',
        backgroundColor: '#004B7F25',
        fill: false,
        pointRadius: 0,
        tension: 0.3,
      },
      // Median line
      {
        label: `Median (${series.length} scenarios)`,
        data: stats.map(s => s.p50),
        borderColor: '#004B7F',
        backgroundColor: '#004B7F20',
        borderWidth: 2.5,
        pointRadius: compact ? 1 : 3,
        pointHoverRadius: 5,
        tension: 0.3,
        fill: false,
      },
    ];

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: { labels: allYears.map(String), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          title: {
            display: true,
            text: compact ? `${variable.split('|').pop()} — Spread` : `${variable} — ${region} (Distribution)`,
            font: { size: compact ? 12 : 14, weight: 'bold' },
            color: '#2E3E4C',
          },
          legend: {
            display: !compact,
            position: 'bottom',
            labels: {
              filter: item => !item.text?.startsWith('_'),
              boxWidth: 12, font: { size: 10 }, color: '#3D5265', usePointStyle: true,
            },
          },
          tooltip: {
            backgroundColor: '#2E3E4C',
            callbacks: {
              label: ctx => {
                if (ctx.dataset.label?.startsWith('_')) return '';
                const val = ctx.parsed.y;
                return `${ctx.dataset.label}: ${val != null ? val.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'} ${unit}`;
              },
            },
          },
        },
        scales: {
          x: {
            title: { display: !compact, text: 'Year', color: '#3D5265' },
            grid: { color: '#F3F4F5' },
            ticks: { color: '#808285', font: { size: compact ? 9 : 11 } },
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
  }, [series, unit, variable, region, compact]);

  return (
    <div style={{ height: compact ? 260 : 400 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
