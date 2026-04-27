'use client';

import { useRef, useEffect } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface Props {
  variable: string;
  unit: string;
  years: number[];
  medianA: (number | null)[];
  medianB: (number | null)[];
  diff: (number | null)[];
  regionA: string;
  regionB: string;
  compact?: boolean;
}

export default function DifferenceChart({ variable, unit, years, medianA, medianB, diff, regionA, regionB, compact }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || years.length === 0) return;
    chartRef.current?.destroy();

    const labels = years.map(String);
    const varShort = variable.split('|').pop() || variable;

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: regionA,
            data: medianA,
            borderColor: '#004B7F',
            backgroundColor: 'rgba(0, 75, 127, 0.1)',
            borderWidth: 2.5,
            pointRadius: compact ? 1 : 2,
            tension: 0.3,
            spanGaps: true,
            fill: false,
            order: 2,
          },
          {
            label: regionB,
            data: medianB,
            borderColor: '#007B6C',
            backgroundColor: 'rgba(0, 123, 108, 0.1)',
            borderWidth: 2.5,
            pointRadius: compact ? 1 : 2,
            tension: 0.3,
            spanGaps: true,
            fill: false,
            order: 2,
          },
          {
            label: `Difference (${regionA} − ${regionB})`,
            data: diff,
            borderColor: '#B83230',
            backgroundColor: diff.map(d => d !== null && d >= 0 ? 'rgba(184, 50, 48, 0.15)' : 'rgba(0, 123, 108, 0.15)'),
            borderWidth: 2,
            borderDash: [6, 3],
            pointRadius: compact ? 0 : 1.5,
            tension: 0.3,
            spanGaps: true,
            fill: 'origin',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          title: {
            display: true,
            text: compact ? varShort : `${varShort} — Regional Comparison`,
            font: { size: compact ? 12 : 14, weight: 'bold' as const },
            color: '#2E3E4C',
          },
          legend: {
            display: true,
            position: 'bottom',
            labels: { boxWidth: 12, font: { size: 10 }, color: '#3D5265', usePointStyle: false },
          },
          tooltip: {
            backgroundColor: '#2E3E4C',
            titleFont: { size: 11 },
            bodyFont: { size: 10 },
            callbacks: {
              label: ctx => {
                const val = ctx.parsed.y;
                return `${ctx.dataset.label}: ${val != null ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'} ${unit}`;
              },
            },
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
  }, [variable, unit, years, medianA, medianB, diff, regionA, regionB, compact]);

  return (
    <div style={{ height: compact ? 280 : 400 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
