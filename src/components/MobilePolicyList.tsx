'use client';
/**
 * Mobile-friendly list view of the policy network (#10).
 *
 * On viewports below md, the D3 force graph is replaced by a swipeable
 * list grouped by domain, with connection counts and tap-to-expand
 * connection details. Same data, far higher legibility.
 */
import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Policy } from '@/lib/types';
import { connections as ALL_CONNECTIONS } from '@/data/policies';

interface Props {
  policies: Policy[];
}

export default function MobilePolicyList({ policies }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');

  const grouped = useMemo(() => {
    const map = new Map<string, Policy[]>();
    for (const p of policies) {
      if (filter && p.domain !== filter) continue;
      const list = map.get(p.domain) || [];
      list.push(p);
      map.set(p.domain, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [policies, filter]);

  const domains = useMemo(() => Array.from(new Set(policies.map(p => p.domain))).sort(), [policies]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('')}
          className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
            !filter ? 'bg-primary text-white border-primary' : 'bg-white text-tertiary border-grey-200'
          }`}
        >
          All ({policies.length})
        </button>
        {domains.map(d => (
          <button
            key={d}
            onClick={() => setFilter(d)}
            className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              filter === d ? 'bg-primary text-white border-primary' : 'bg-white text-tertiary border-grey-200'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {grouped.map(([domain, items]) => (
        <details key={domain} open={!!filter} className="bg-white rounded-lg border border-grey-200 overflow-hidden">
          <summary className="px-3 py-2 cursor-pointer text-[13px] font-semibold text-tertiary-dark flex items-center justify-between">
            <span>{domain} ({items.length})</span>
            <span className="text-[10px] text-tertiary">tap to expand</span>
          </summary>
          <ul className="divide-y divide-grey-100">
            {items.map(p => {
              const isOpen = openId === p.id;
              const cs = ALL_CONNECTIONS.filter(c => c.source_policy_id === p.id);
              return (
                <li key={p.id} className="px-3 py-2.5">
                  <button
                    onClick={() => setOpenId(isOpen ? null : p.id)}
                    aria-expanded={isOpen}
                    className="w-full text-left"
                  >
                    <p className="text-[13px] font-semibold text-tertiary-dark">{p.short_title || p.title}</p>
                    <p className="text-[11px] text-tertiary mt-0.5">
                      {p.celex_number ? `CELEX ${p.celex_number}` : p.document_type} · {cs.length} connections
                    </p>
                  </button>
                  {isOpen && (
                    <div className="mt-2 pl-3 border-l-2 border-secondary/30 space-y-1">
                      {cs.length === 0 && (
                        <p className="text-[11px] text-tertiary italic">No outgoing connections recorded.</p>
                      )}
                      {cs.slice(0, 8).map((c, i) => (
                        <p key={i} className="text-[11px] text-tertiary">
                          <span className="text-[10px] font-mono uppercase tracking-wide text-secondary mr-1">{c.connection_type}</span>
                          → {c.target_policy_id}
                        </p>
                      ))}
                      <Link
                        href={`/policy-navigator/policy?id=${encodeURIComponent(p.id)}`}
                        className="inline-block text-[11px] text-primary underline-offset-2 hover:underline mt-1"
                      >
                        Open detail →
                      </Link>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      ))}
    </div>
  );
}
