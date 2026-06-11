'use client';

/**
 * Cluster analysis panel — National Level Climate Policies beta module.
 *
 * Renders the pre-computed K-Means / Ward clustering of the climate-laws.org
 * snapshot (see `analysis/cluster_analysis.py` and `analysis/INSIGHTS.md`).
 * Everything shown here is a committed artifact loaded from
 * `/data/national-climate-policies-clusters.json` — nothing is computed in
 * the browser, and the assignments refer to the committed snapshot rather
 * than a live refresh.
 */

import { useState } from 'react';

export interface ClusterSummary {
  id: number;
  label: string;
  n: number;
  lawShare: number;
  medianYear: number;
  topTerms: string[];
  examples: string[];
}

export interface CountryGroup {
  id: number;
  label: string;
  description: string;
  countries: string[];
}

export interface ClusterDataset {
  generatedFrom: string;
  snapshotDate: string;
  method: { policyLevel: string; countryLevel: string; caveat: string };
  clusters: ClusterSummary[];
  assignments: Record<string, number>;
  countryGroups: CountryGroup[];
  figures: { file: string; title: string }[];
}

export const CLUSTER_COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b',
  '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#aec7e8', '#ffbb78',
];

export default function ClusterAnalysisPanel({
  data,
  selectedCluster,
  onSelectCluster,
  onSelectCountry,
}: {
  data: ClusterDataset;
  selectedCluster: number | 'all';
  onSelectCluster: (id: number | 'all') => void;
  onSelectCountry: (code: string) => void;
}) {
  const [openFigure, setOpenFigure] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-tertiary max-w-3xl leading-snug">
        Unsupervised clustering of the {data.snapshotDate} snapshot groups the
        catalogue into <strong>12 policy families</strong> (
        {data.method.policyLevel.toLowerCase()}) and the member states into{' '}
        <strong>{data.countryGroups.length} portfolio types</strong> (
        {data.method.countryLevel.toLowerCase()}). Click a family to filter
        the catalogue below. {data.method.caveat}
      </p>

      {/* Policy families */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {data.clusters.map((c) => {
          const active = selectedCluster === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectCluster(active ? 'all' : c.id)}
              className={`text-left bg-white border rounded p-2.5 transition border-l-4 ${
                active
                  ? 'border-primary ring-2 ring-primary/40'
                  : 'border-grey-200 hover:border-grey-300'
              }`}
              style={{ borderLeftColor: CLUSTER_COLORS[c.id % CLUSTER_COLORS.length] }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-tertiary-dark leading-snug">
                  {c.label}
                </span>
                <span className="text-xs font-bold text-tertiary shrink-0">{c.n}</span>
              </div>
              <div className="text-[10px] uppercase tracking-wide text-tertiary mt-0.5">
                {Math.round(c.lawShare * 100)}% legislative · median {c.medianYear}
              </div>
              <div className="text-[11px] text-tertiary/80 mt-1 leading-snug">
                {c.topTerms.slice(0, 6).join(' · ')}
              </div>
            </button>
          );
        })}
      </div>

      {/* Country typology */}
      <div>
        <h3 className="text-sm font-semibold text-tertiary-dark mb-1.5">
          Country portfolio types
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {data.countryGroups.map((g) => (
            <div key={g.id} className="bg-white border border-grey-200 rounded p-2.5">
              <div className="text-xs font-semibold text-tertiary-dark">
                T{g.id} · {g.label}
              </div>
              <p className="text-[11px] text-tertiary leading-snug mt-1">
                {g.description}
              </p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {g.countries.map((code) => (
                  <button
                    key={code}
                    onClick={() => onSelectCountry(code)}
                    title={`Filter the catalogue to ${code}`}
                    className="text-[10px] px-1.5 py-0.5 rounded-full border border-grey-200 text-tertiary hover:border-primary hover:text-primary transition"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Figures */}
      <div>
        <h3 className="text-sm font-semibold text-tertiary-dark mb-1.5">Figures</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {data.figures.map((f) => (
            <button
              key={f.file}
              type="button"
              onClick={() => setOpenFigure(openFigure === f.file ? null : f.file)}
              className="bg-white border border-grey-200 rounded p-1.5 hover:border-primary transition text-left"
            >
              {/* Static matplotlib exports — plain <img>, no next/image needed */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.file} alt={f.title} className="w-full rounded" loading="lazy" />
              <div className="text-[10px] text-tertiary mt-1 leading-tight">{f.title}</div>
            </button>
          ))}
        </div>
        {openFigure && (
          <div
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setOpenFigure(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={openFigure}
              alt={data.figures.find((f) => f.file === openFigure)?.title ?? ''}
              className="max-w-full max-h-full rounded bg-white"
            />
          </div>
        )}
      </div>

      <p className="text-[11px] text-tertiary">
        Method, full statistics and reproduction steps:{' '}
        <code className="bg-grey-100 px-1 rounded">{data.generatedFrom}</code>{' '}
        (write-up in <code className="bg-grey-100 px-1 rounded">analysis/INSIGHTS.md</code>).
      </p>
    </div>
  );
}
