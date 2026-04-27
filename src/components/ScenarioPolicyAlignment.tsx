'use client';
/**
 * Scenario ↔ Policy alignment view (#14).
 *
 * Given a sector (Energy Supply, Transport, Buildings, …), show the EU
 * policies that target that sector — i.e. policies whose `domain`
 * matches the sector mapping. The component is deliberately read-only
 * and lightweight; deeper integration (overlaying policy markers on the
 * gap chart) is left for a follow-up.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { policies } from '@/data/policies';
import {
  POLICY_GAP_SECTORS, SECTOR_COLORS, type PolicyGapSector,
} from '@/lib/scenarios/policy-gap';

const SECTOR_TO_DOMAINS: Record<PolicyGapSector, string[]> = {
  'Overall':       ['climate', 'cross-cutting', 'governance'],
  'Energy Supply': ['energy', 'energy-supply', 'electricity', 'renewables', 'gas'],
  'Industry':      ['industry', 'ets', 'cbam', 'circular-economy'],
  'Transport':     ['transport', 'aviation', 'maritime', 'cars', 'mobility'],
  'Buildings':     ['buildings', 'energy-efficiency'],
  'Agriculture':   ['agriculture', 'cap', 'land-use'],
  'LULUCF':        ['lulucf', 'forests', 'land-use', 'restoration'],
};

interface Props {
  /** Optional initial sector. */
  initialSector?: PolicyGapSector;
}

export default function ScenarioPolicyAlignment({ initialSector = 'Energy Supply' }: Props) {
  const [sector, setSector] = useState<PolicyGapSector>(initialSector);

  const matched = useMemo(() => {
    const domains = (SECTOR_TO_DOMAINS[sector] || []).map(d => d.toLowerCase());
    return policies
      .filter(p => domains.some(d => (p.domain || '').toLowerCase().includes(d)))
      .sort((a, b) => (a.short_title || a.title).localeCompare(b.short_title || b.title));
  }, [sector]);

  return (
    <section className="bg-white dark:bg-[var(--mh-card)] rounded-xl border border-grey-200 dark:border-[var(--mh-border)] p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-grey-500">Scenario × policy</p>
          <h3 className="text-sm font-bold">Policies addressing the gap in {sector}</h3>
        </div>
        <Link href="/policy-navigator" className="text-xs text-secondary hover:underline">Open Policy Navigator →</Link>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {POLICY_GAP_SECTORS.map(s => (
          <button
            key={s}
            onClick={() => setSector(s)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
              sector === s ? 'text-white border-transparent' : 'bg-white text-tertiary border-grey-200'
            }`}
            style={sector === s ? { backgroundColor: SECTOR_COLORS[s] } : undefined}
          >
            {s}
          </button>
        ))}
      </div>
      {matched.length === 0 ? (
        <p className="text-xs text-grey-500">
          No tracked policies map to this sector yet. Add the relevant <code>domain</code> tag in <code>src/data/policies.ts</code>.
        </p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-1.5">
          {matched.map(p => (
            <li key={p.id} className="text-sm">
              <Link href={`/policy-navigator/policy?id=${encodeURIComponent(p.id)}`} className="block px-2 py-1.5 rounded hover:bg-grey-50 dark:hover:bg-[#1D2734] truncate">
                {p.short_title || p.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[10px] text-grey-500 mt-3">
        Mapping derived from each policy&apos;s <code>domain</code> field. Sector groupings live in <code>src/components/ScenarioPolicyAlignment.tsx</code>.
      </p>
    </section>
  );
}
