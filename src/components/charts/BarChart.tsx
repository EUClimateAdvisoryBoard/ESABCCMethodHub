'use client';

import { useRef, useEffect } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const PALETTE = [
  '#004B7F','#007B6C','#B83230','#6667AB','#FF9933',
  '#00928F','#A530B8','#0065A4','#54728C','#8B5E3C',
  '#75C9DB','#74CBC8','#478EA5','#3D5265','#00665A',
];

interface Props {
  /** Each item is a group (e.g. a year or region) with multiple bars */
  groups: { label: string; values: { name: string; value: number }[] }[];
  unit: string;
  title: string;
  stacked?: boolean;
  horizontal?: boolean;
  compact?: boolean;
}

/**
 * Grouped or stacked bar chart.
 * Use for comparing values across regions, years, or categories.
 */
export default function BarChart({ groups, unit, title, stacked, horizontal, compact }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || groups.length === 0) return;
    chartRef.current?.destroy();

    // Collect all unique bar names across groups
    const allNames = [...new Set(groups.flatMap(g => g.values.map(v => v.name)))];

    const datasets = allNames.map((name, i) => ({
      label: name,
      data: groups.map(g => {
        const match = g.values.find(v => v.name === name);
        return match ? match.value : 0;
      }),
      backgroundColor: PALETTE[i % PALETTE.length] + 'CC',
      borderColor: PALETTE[i % PALETTE.length],
      borderWidth: 1,
      borderRadius: 3,
    }));

    const chartType = horizontal ? 'bar' as const : 'bar' as const;

    chartRef.current = new Chart(canvasRef.current, {
      type: chartType,
      data: { labels: groups.map(g => g.label), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: horizontal ? 'y' : 'x',
        interaction: { mode: 'index', intersect: false },
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: compact ? 12 : 14, weight: 'bold' },
            color: '#2E3E4C',
          },
          legend: {
            display: allNames.length <= 10,
            position: 'bottom',
            labels: { boxWidth: 10, font: { size: 10 }, color: '#3D5265' },
          },
          tooltip: {
            backgroundColor: '#2E3E4C',
            callbacks: {
              label: ctx => {
                const val = ctx.parsed[horizontal ? 'x' : 'y'];
                return `${ctx.dataset.label}: ${val != null ? val.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'} ${unit}`;
              },
            },
          },
        },
        scales: {
          x: {
            stacked: !!stacked,
            grid: { color: '#F3F4F5' },
            ticks: { color: '#808285', font: { size: compact ? 9 : 11 } },
          },
          y: {
            stacked: !!stacked,
            title: { display: !horizontal, text: unit, color: '#3D5265', font: { size: compact ? 9 : 12 } },
            grid: { color: '#F3F4F5' },
            ticks: { color: '#808285', font: { size: compact ? 9 : 11 } },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); };
  }, [groups, unit, title, stacked, horizontal, compact]);

  return (
    <div style={{ height: compact ? 260 : 400 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
