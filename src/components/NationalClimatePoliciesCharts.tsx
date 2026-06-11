'use client';

/**
 * NationalClimatePoliciesCharts — illustrations for the National Level
 * Climate Policies beta module.
 *
 * Four chart.js canvases derived live from the climate-laws.org catalogue:
 *   1. Adoption timeline — laws vs policies per year, with the cumulative
 *      acquis overlaid (follows the page's active filters).
 *   2. Geography mix — laws vs policies per geography (EU level + member
 *      states), sorted by depth (always catalogue-wide, so the country
 *      filter has a stable reference).
 *   3. Sector coverage — instruments per sector, split by category
 *      (follows the active filters).
 *   4. Policy instruments — the ten most used instrument types
 *      (follows the active filters).
 *
 * Each canvas has a PNG export, mirroring the Climate Finance module.
 */

import Chart from 'chart.js/auto';
import { useEffect, useRef } from 'react';
import type { ClimatePolicy } from '@/lib/climate-laws-types';

const LAW_COLOR = '#1B5E20';
const POLICY_COLOR = '#00928F';

interface Props {
  /** Full catalogue (member-state mix chart). */
  policies: ClimatePolicy[];
  /** Catalogue after the page's filters (timeline, sector, instrument charts). */
  filtered: ClimatePolicy[];
  /** Human label for the filtered scope, e.g. "EU-27" or "France". */
  scopeLabel: string;
}

function useChart(
  ref: React.RefObject<HTMLCanvasElement | null>,
  config: () => object,
  deps: unknown[],
) {
  const chart = useRef<Chart | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    chart.current?.destroy();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chart.current = new Chart(ref.current, config() as any);
    return () => { chart.current?.destroy(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function ExportBar({ id }: { id: string }) {
  const download = () => {
    const canvas = document.getElementById(id)?.querySelector('canvas');
    if (!canvas) return;
    canvas.toBlob(b => {
      if (!b) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = `${id}.png`;
      a.click();
    });
  };
  return (
    <div className="flex gap-1.5 mt-2">
      <button
        onClick={download}
        className="text-[10px] px-2 py-0.5 rounded bg-grey-100 text-tertiary hover:bg-grey-200 transition"
      >
        PNG
      </button>
    </div>
  );
}

export default function NationalClimatePoliciesCharts({ policies, filtered, scopeLabel }: Props) {
  const timelineRef = useRef<HTMLCanvasElement>(null);
  const mixRef = useRef<HTMLCanvasElement>(null);
  const sectorRef = useRef<HTMLCanvasElement>(null);
  const instrumentRef = useRef<HTMLCanvasElement>(null);

  // ── 1. Adoption timeline ──────────────────────────────────────────────
  useChart(timelineRef, () => {
    const dated = filtered.filter(p => p.year != null);
    const years = dated.map(p => p.year as number);
    const maxYear = years.length ? Math.max(...years) : new Date().getFullYear();
    // Lump anything before 1990 into one bucket so the axis stays readable.
    const start = 1990;
    const labels: string[] = [`≤${start - 1}`];
    for (let y = start; y <= maxYear; y++) labels.push(String(y));
    const bucket = (y: number) => (y < start ? 0 : y - start + 1);
    const laws = labels.map(() => 0);
    const pols = labels.map(() => 0);
    dated.forEach(p => {
      const i = bucket(p.year as number);
      if (p.category === 'Law') laws[i] += 1;
      else pols[i] += 1;
    });
    let running = 0;
    const cumulative = labels.map((_, i) => (running += laws[i] + pols[i]));
    return {
      data: {
        labels,
        datasets: [
          { type: 'bar', label: 'Legislative acts', data: laws, backgroundColor: LAW_COLOR, stack: 'a' },
          { type: 'bar', label: 'Executive policies', data: pols, backgroundColor: POLICY_COLOR, stack: 'a' },
          {
            type: 'line', label: 'Cumulative acquis', data: cumulative,
            borderColor: '#3D5265', borderWidth: 1.5, pointRadius: 0, yAxisID: 'y1', tension: 0.2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: `Adoption of climate laws & policies per year — ${scopeLabel}`, font: { size: 13 } },
          legend: { position: 'bottom' as const, labels: { boxWidth: 10, font: { size: 10 } } },
        },
        scales: {
          x: { stacked: true, ticks: { font: { size: 9 }, maxRotation: 60, minRotation: 60 } },
          y: { stacked: true, title: { display: true, text: 'Adopted per year' } },
          y1: { position: 'right' as const, grid: { drawOnChartArea: false }, title: { display: true, text: 'Cumulative' } },
        },
      },
    };
  }, [filtered, scopeLabel]);

  // ── 2. Member-state mix ───────────────────────────────────────────────
  useChart(mixRef, () => {
    const byCountry = new Map<string, { laws: number; pols: number }>();
    policies.forEach(p => {
      const cur = byCountry.get(p.countryName) ?? { laws: 0, pols: 0 };
      if (p.category === 'Law') cur.laws += 1;
      else cur.pols += 1;
      byCountry.set(p.countryName, cur);
    });
    const rows = Array.from(byCountry.entries())
      .sort((a, b) => (b[1].laws + b[1].pols) - (a[1].laws + a[1].pols));
    return {
      type: 'bar',
      data: {
        labels: rows.map(([name]) => name),
        datasets: [
          { label: 'Legislative acts', data: rows.map(([, v]) => v.laws), backgroundColor: LAW_COLOR },
          { label: 'Executive policies', data: rows.map(([, v]) => v.pols), backgroundColor: POLICY_COLOR },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y' as const,
        plugins: {
          title: { display: true, text: 'Catalogue per geography (EU level + member states) — laws vs policies', font: { size: 13 } },
          legend: { position: 'bottom' as const, labels: { boxWidth: 10, font: { size: 10 } } },
        },
        scales: {
          x: { stacked: true, title: { display: true, text: 'Instruments' } },
          y: { stacked: true, ticks: { font: { size: 10 }, autoSkip: false } },
        },
      },
    };
  }, [policies]);

  // ── 3. Sector coverage ────────────────────────────────────────────────
  useChart(sectorRef, () => {
    const bySector = new Map<string, { laws: number; pols: number }>();
    filtered.forEach(p => {
      p.sectors.forEach(s => {
        const cur = bySector.get(s) ?? { laws: 0, pols: 0 };
        if (p.category === 'Law') cur.laws += 1;
        else cur.pols += 1;
        bySector.set(s, cur);
      });
    });
    const rows = Array.from(bySector.entries())
      .sort((a, b) => (b[1].laws + b[1].pols) - (a[1].laws + a[1].pols));
    return {
      type: 'bar',
      data: {
        labels: rows.map(([s]) => s),
        datasets: [
          { label: 'Legislative acts', data: rows.map(([, v]) => v.laws), backgroundColor: LAW_COLOR },
          { label: 'Executive policies', data: rows.map(([, v]) => v.pols), backgroundColor: POLICY_COLOR },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y' as const,
        plugins: {
          title: { display: true, text: `Sector coverage — ${scopeLabel}`, font: { size: 13 } },
          legend: { position: 'bottom' as const, labels: { boxWidth: 10, font: { size: 10 } } },
        },
        scales: {
          x: { stacked: true, title: { display: true, text: 'Instruments naming the sector' } },
          y: { stacked: true, ticks: { font: { size: 10 }, autoSkip: false } },
        },
      },
    };
  }, [filtered, scopeLabel]);

  // ── 4. Top policy instruments ─────────────────────────────────────────
  useChart(instrumentRef, () => {
    const counts = new Map<string, number>();
    filtered.forEach(p => p.instruments.forEach(i => counts.set(i, (counts.get(i) ?? 0) + 1)));
    const rows = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    return {
      type: 'bar',
      data: {
        labels: rows.map(([i]) => i),
        datasets: [{ label: 'Instruments', data: rows.map(([, n]) => n), backgroundColor: POLICY_COLOR, borderRadius: 3 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y' as const,
        plugins: {
          title: { display: true, text: `Most used policy instruments — ${scopeLabel}`, font: { size: 13 } },
          legend: { display: false },
        },
        scales: {
          x: { title: { display: true, text: 'Laws & policies using the instrument' } },
          y: { ticks: { font: { size: 10 }, autoSkip: false } },
        },
      },
    };
  }, [filtered, scopeLabel]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div id="ncp-timeline" className="bg-white border border-grey-200 rounded p-3">
        <div className="h-[300px]"><canvas ref={timelineRef} /></div>
        <ExportBar id="ncp-timeline" />
      </div>
      <div id="ncp-country-mix" className="bg-white border border-grey-200 rounded p-3">
        <div className="h-[300px]"><canvas ref={mixRef} /></div>
        <ExportBar id="ncp-country-mix" />
      </div>
      <div id="ncp-sectors" className="bg-white border border-grey-200 rounded p-3">
        <div className="h-[300px]"><canvas ref={sectorRef} /></div>
        <ExportBar id="ncp-sectors" />
      </div>
      <div id="ncp-instruments" className="bg-white border border-grey-200 rounded p-3">
        <div className="h-[300px]"><canvas ref={instrumentRef} /></div>
        <ExportBar id="ncp-instruments" />
      </div>
    </div>
  );
}
