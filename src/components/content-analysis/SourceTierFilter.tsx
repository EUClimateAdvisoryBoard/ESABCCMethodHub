'use client';

// ---------------------------------------------------------------------------
// Source-tier filter — the missing "differentiate by type of source" control
// for the overview views (Chapter view, Reading responsibility).
//
// The Code view is scoped to one source tier at a time via the header's
// "Source:" tabs. The overview views, by contrast, read ACROSS every tier —
// which is the point (one reading list per chapter, one responsibility list per
// person) — but that mixed everything together, so the only way to see just the
// policy, scientific or grey documents was to go back to the Code view. This
// chip row restores that differentiation in-place: pick a tier to narrow the
// list to it, or "All sources" to see the mix. Each chip carries its own count
// so the split is legible at a glance.
//
// The tiers, labels and icons come from the shared `source-tier` module, so this
// control never drifts from the Code view's source tabs.
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import {
  sourceTierOf,
  SOURCE_TIER_META,
  SOURCE_TIERS,
  type AnalysisDocument,
  type SourceTier,
} from '@/lib/content-analysis/service';

/** The selected tier, or `'all'` for the unfiltered mix. */
export type SourceTierFilterValue = SourceTier | 'all';

/** Narrow a document list to the chosen source tier (`'all'` is a no-op). */
export function filterBySourceTier(
  documents: AnalysisDocument[],
  value: SourceTierFilterValue,
): AnalysisDocument[] {
  if (value === 'all') return documents;
  return documents.filter(d => sourceTierOf(d) === value);
}

export default function SourceTierFilter({
  documents,
  value,
  onChange,
  className,
}: {
  /** The full (unfiltered) document set — used to count each tier's chip. */
  documents: AnalysisDocument[];
  value: SourceTierFilterValue;
  onChange: (value: SourceTierFilterValue) => void;
  className?: string;
}) {
  const counts = useMemo(() => {
    const m: Record<SourceTier, number> = { policy: 0, scientific: 0, grey: 0 };
    for (const d of documents) m[sourceTierOf(d)] += 1;
    return m;
  }, [documents]);

  const options: Array<{
    id: SourceTierFilterValue;
    label: string;
    icon?: string;
    count: number;
    hint: string;
  }> = [
    { id: 'all', label: 'All sources', count: documents.length, hint: 'Show every source tier together.' },
    ...SOURCE_TIERS.map(t => ({
      id: t as SourceTierFilterValue,
      label: SOURCE_TIER_META[t].label,
      icon: SOURCE_TIER_META[t].icon,
      count: counts[t],
      hint: SOURCE_TIER_META[t].hint,
    })),
  ];

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className ?? ''}`}>
      <span className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold">
        Source:
      </span>
      {options.map(o => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            title={o.hint}
            className={`text-[11px] px-2 py-1 rounded border transition inline-flex items-center gap-1 ${
              on
                ? 'bg-primary text-white border-primary'
                : 'border-grey-200 text-tertiary hover:border-tertiary'
            }`}
          >
            {o.icon && <span aria-hidden>{o.icon}</span>}
            {o.label}
            <span className={`font-mono ${on ? 'text-white/80' : 'text-tertiary-light'}`}>
              {o.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
