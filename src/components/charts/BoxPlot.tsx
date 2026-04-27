'use client';

import { useRef, useEffect } from 'react';

const PALETTE = ['#004B7F','#007B6C','#B83230','#6667AB','#FF9933','#00928F','#A530B8','#0065A4'];

interface Props {
  /** Each box is a category (year, variable, region) */
  boxes: { label: string; values: number[] }[];
  unit: string;
  title: string;
  compact?: boolean;
}

/**
 * Box-and-whisker plot rendered with Canvas.
 * Shows min, P25, median, P75, max for each category.
 */
export default function BoxPlot({ boxes, unit, title, compact }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || boxes.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: compact ? 30 : 40, right: 20, bottom: compact ? 40 : 50, left: compact ? 55 : 70 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    // Compute stats
    const percentile = (arr: number[], p: number) => {
      const s = [...arr].sort((a, b) => a - b);
      const i = (p / 100) * (s.length - 1);
      const lo = Math.floor(i);
      const hi = Math.ceil(i);
      return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo);
    };

    const stats = boxes.map(b => {
      const vals = b.values.filter(v => !isNaN(v));
      if (vals.length === 0) return { label: b.label, min: 0, q1: 0, med: 0, q3: 0, max: 0, n: 0 };
      return {
        label: b.label,
        min: Math.min(...vals),
        q1: percentile(vals, 25),
        med: percentile(vals, 50),
        q3: percentile(vals, 75),
        max: Math.max(...vals),
        n: vals.length,
      };
    });

    // Y range
    const allMin = Math.min(...stats.map(s => s.min));
    const allMax = Math.max(...stats.map(s => s.max));
    const range = allMax - allMin || 1;
    const yMin = allMin - range * 0.05;
    const yMax = allMax + range * 0.05;

    const yScale = (v: number) => pad.top + plotH * (1 - (v - yMin) / (yMax - yMin));

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Title
    ctx.fillStyle = '#2E3E4C';
    ctx.font = `bold ${compact ? 12 : 14}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(title, w / 2, compact ? 18 : 24);

    // Y axis ticks
    ctx.fillStyle = '#808285';
    ctx.font = `${compact ? 9 : 11}px system-ui, sans-serif`;
    ctx.textAlign = 'right';
    const nTicks = compact ? 4 : 6;
    for (let i = 0; i <= nTicks; i++) {
      const val = yMin + (yMax - yMin) * (i / nTicks);
      const y = yScale(val);
      ctx.fillText(val.toLocaleString(undefined, { maximumFractionDigits: 0 }), pad.left - 8, y + 3);
      ctx.strokeStyle = '#F3F4F5';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
    }

    // Y label
    ctx.save();
    ctx.translate(12, pad.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#3D5265';
    ctx.font = `${compact ? 9 : 11}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(unit, 0, 0);
    ctx.restore();

    // Draw boxes
    const boxW = Math.min(60, plotW / stats.length * 0.6);
    const gap = plotW / stats.length;

    stats.forEach((s, i) => {
      const cx = pad.left + gap * (i + 0.5);
      const color = PALETTE[i % PALETTE.length];

      if (s.n === 0) return;

      // Whisker (min to max)
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, yScale(s.min));
      ctx.lineTo(cx, yScale(s.max));
      ctx.stroke();

      // Min/max caps
      ctx.beginPath();
      ctx.moveTo(cx - boxW * 0.2, yScale(s.min));
      ctx.lineTo(cx + boxW * 0.2, yScale(s.min));
      ctx.moveTo(cx - boxW * 0.2, yScale(s.max));
      ctx.lineTo(cx + boxW * 0.2, yScale(s.max));
      ctx.stroke();

      // Box (Q1 to Q3)
      const boxTop = yScale(s.q3);
      const boxBot = yScale(s.q1);
      ctx.fillStyle = color + '30';
      ctx.fillRect(cx - boxW / 2, boxTop, boxW, boxBot - boxTop);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - boxW / 2, boxTop, boxW, boxBot - boxTop);

      // Median line
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - boxW / 2, yScale(s.med));
      ctx.lineTo(cx + boxW / 2, yScale(s.med));
      ctx.stroke();

      // Label
      ctx.fillStyle = '#808285';
      ctx.font = `${compact ? 8 : 10}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(s.label, cx, h - (compact ? 10 : 14));
      if (!compact) {
        ctx.fillStyle = '#AAAAAA';
        ctx.font = '9px system-ui, sans-serif';
        ctx.fillText(`n=${s.n}`, cx, h - 4);
      }
    });

  }, [boxes, unit, title, compact]);

  return (
    <div style={{ height: compact ? 260 : 400 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
