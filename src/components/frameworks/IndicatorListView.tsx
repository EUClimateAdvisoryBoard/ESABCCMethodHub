/**
 * List view of the indicator database — the data that sits "behind" the flow
 * charts. Searchable, filterable by sector category, with the same charts used
 * across the board. The framework board deep-links into this view via a
 * focused indicator id.
 */
'use client';
import { useMemo, useState } from 'react';
import type { Indicator, IndicatorCategory } from '@/data/ecno-indicators';
import IndicatorChart from './IndicatorChart';

const CATEGORY_LABEL: Partial<Record<IndicatorCategory, string>> = {
  emissions: 'Emissions',
  'energy-supply': 'Energy supply',
  'energy-demand': 'Energy demand',
  transport: 'Transport',
  buildings: 'Buildings',
  industry: 'Industry',
  agriculture: 'Agriculture',
  lulucf: 'LULUCF',
  finance: 'Finance',
  fairness: 'Fairness',
};

interface Props {
  indicators: Indicator[];
  focusId?: string | null;
}

export default function IndicatorListView({ indicators, focusId }: Props) {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<IndicatorCategory | 'all'>('all');
  const [selected, setSelected] = useState<string | null>(focusId ?? indicators[0]?.id ?? null);

  const cats = useMemo(() => Array.from(new Set(indicators.map((i) => i.category))), [indicators]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return indicators.filter((i) => {
      if (cat !== 'all' && i.category !== cat) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        (i.code ?? '').toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q)
      );
    });
  }, [indicators, query, cat]);

  const active = indicators.find((i) => i.id === selected) ?? filtered[0] ?? null;
  const latest = active ? [...active.data].sort((a, b) => b.year - a.year)[0] : null;

  return (
    <div className="grid md:grid-cols-[320px_1fr] gap-5">
      {/* list */}
      <div className="space-y-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search indicators…"
          className="w-full border border-[#E6E7E8] dark:border-[var(--mh-border,#333)] rounded-lg px-3 py-2 text-sm bg-white dark:bg-white/5"
        />
        <div className="flex flex-wrap gap-1">
          <FilterChip label="All" active={cat === 'all'} onClick={() => setCat('all')} />
          {cats.map((c) => (
            <FilterChip key={c} label={CATEGORY_LABEL[c] ?? c} active={cat === c} onClick={() => setCat(c)} />
          ))}
        </div>
        <div className="border border-[#E6E7E8] dark:border-[var(--mh-border,#333)] rounded-lg divide-y divide-[#F0F0EE] dark:divide-white/5 max-h-[60vh] overflow-y-auto">
          {filtered.map((i) => (
            <button
              key={i.id}
              onClick={() => setSelected(i.id)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F7F7F3] dark:hover:bg-white/5 ${
                active?.id === i.id ? 'bg-[#F0F4F7] dark:bg-white/10' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {i.code && <span className="text-[10px] font-mono text-gray-400 shrink-0">{i.code}</span>}
                <span className="truncate">{i.name}</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && <div className="px-3 py-4 text-sm text-gray-400">No matches.</div>}
        </div>
      </div>

      {/* detail */}
      <div>
        {active ? (
          <div className="border border-[#E6E7E8] dark:border-[var(--mh-border,#333)] rounded-xl p-5">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <h2 className="text-lg font-semibold">{active.name}</h2>
              {active.code && <span className="text-xs font-mono text-gray-400">{active.code}</span>}
            </div>
            <p className="text-sm text-gray-500 mb-4">{active.description}</p>
            <IndicatorChart indicator={active} height={240} />
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mt-4 text-sm">
              <Meta label="Unit" value={active.unit} />
              {latest && <Meta label={`Latest (${latest.year})`} value={`${latest.value.toLocaleString()}`} />}
              {active.targetValue != null && (
                <Meta label={`Target ${active.targetYear ?? ''}`} value={active.targetValue.toLocaleString()} />
              )}
              <Meta
                label="Source"
                value={
                  <a href={active.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#3D6E8C] hover:underline">
                    {active.source}
                  </a>
                }
              />
            </dl>
          </div>
        ) : (
          <div className="text-sm text-gray-400">Select an indicator.</div>
        )}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] px-2 py-0.5 rounded-full border ${
        active ? 'bg-[#3D6E8C] text-white border-[#3D6E8C]' : 'border-gray-300 text-gray-600 hover:border-[#3D6E8C]'
      }`}
    >
      {label}
    </button>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
