'use client';

/**
 * MemberStatesHeatmap — EU-27 × indicator grid.
 *
 * Rows are member states; columns are the indicator groups defined in
 * HEATMAP_INDICATORS (GHG, RES, efficiency, air, water, biodiversity,
 * circular, adaptation, NECP delivery). Cells are colour-coded by the
 * country's headline status for that indicator.
 *
 * Clicking a country name opens the country profile; clicking a cell opens
 * the same profile but anchored at the relevant section.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { CountryProfile, HeatmapIndicatorKey } from '@/data/country-profiles/_types';
import { HEATMAP_INDICATORS, STATUS_COLORS, STATUS_LABELS } from '@/data/country-profiles/_types';
import { heatmapStatus } from '@/data/country-profiles';

interface Props {
  profiles: CountryProfile[];
  highlight?: HeatmapIndicatorKey;
  onPickIndicator?: (key: HeatmapIndicatorKey) => void;
}

type SortKey = 'name' | HeatmapIndicatorKey;

const STATUS_RANK: Record<string, number> = {
  'on-track': 0, 'partial': 1, 'concern': 2, 'off-track': 3, 'unknown': 4,
};

export default function MemberStatesHeatmap({
  profiles, highlight, onPickIndicator,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(() => {
    const arr = [...profiles];
    arr.sort((a, b) => {
      if (sortKey === 'name') {
        return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      const sa = STATUS_RANK[heatmapStatus(a, sortKey)];
      const sb = STATUS_RANK[heatmapStatus(b, sortKey)];
      return sortAsc ? sa - sb : sb - sa;
    });
    return arr;
  }, [profiles, sortKey, sortAsc]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortAsc(s => !s);
    else { setSortKey(k); setSortAsc(true); }
  }

  return (
    <div className="bg-white rounded-xl border border-grey-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-grey-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-tertiary-dark">EU-27 indicator heatmap</h3>
          <p className="text-[11px] text-tertiary mt-0.5">
            Click a country for the full profile, or a column header to sort. Colour shows the
            assessed status per indicator.
          </p>
        </div>
        <Legend />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-grey-50">
              <th
                className="sticky left-0 bg-grey-50 px-3 py-2 text-left text-[10px] uppercase tracking-wide text-tertiary z-10 border-r border-grey-200 cursor-pointer hover:bg-grey-100"
                onClick={() => toggleSort('name')}
              >
                Member state {sortKey === 'name' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              {HEATMAP_INDICATORS.map(ind => (
                <th
                  key={ind.key}
                  className={`px-2 py-2 text-left text-[10px] uppercase tracking-wide text-tertiary border-r border-grey-100 cursor-pointer hover:bg-grey-100 ${highlight === ind.key ? 'bg-primary/10' : ''}`}
                  onClick={() => { toggleSort(ind.key); onPickIndicator?.(ind.key); }}
                >
                  <span className="whitespace-nowrap">
                    {ind.label} {sortKey === ind.key ? (sortAsc ? '▲' : '▼') : ''}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(p => (
              <tr key={p.code} className="border-t border-grey-100">
                <td className="sticky left-0 bg-white px-3 py-1.5 font-medium text-tertiary-dark border-r border-grey-100 z-10">
                  <Link href={`/member-states/${p.code}`} className="hover:text-primary">
                    {p.name}{' '}
                    <span className="text-tertiary-light text-[10px]">({p.code})</span>
                  </Link>
                </td>
                {HEATMAP_INDICATORS.map(ind => {
                  const status = heatmapStatus(p, ind.key);
                  const color = STATUS_COLORS[status];
                  return (
                    <td
                      key={ind.key}
                      className="px-1 py-0.5 border-r border-grey-100"
                    >
                      <Link
                        href={`/member-states/${p.code}#${ind.key}`}
                        title={`${p.name} — ${ind.label}: ${STATUS_LABELS[status]}`}
                        className="block w-full h-7 rounded text-[10px] text-white font-medium leading-[1.75rem] text-center hover:opacity-90"
                        style={{ backgroundColor: color }}
                      >
                        {STATUS_LABELS[status].slice(0, 1).toUpperCase()}
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-2 text-[10px] text-tertiary">
      {(['on-track','partial','concern','off-track','unknown'] as const).map(s => (
        <span key={s} className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: STATUS_COLORS[s] }}
          />
          {STATUS_LABELS[s]}
        </span>
      ))}
    </div>
  );
}
