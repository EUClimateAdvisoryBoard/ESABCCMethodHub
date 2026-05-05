'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PolicyNewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  date: string;
  policy_ids: string[];
  source: string;
}

interface Props {
  policyId?: string;
  limit?: number;
}

/** Map policy IDs to short human-readable labels for badges. */
const POLICY_LABELS: Record<string, string> = {
  'eu-climate-law': 'Climate Law',
  'eu-ets-directive': 'EU ETS',
  'effort-sharing-regulation': 'Effort Sharing',
  'lulucf-regulation': 'LULUCF',
  'renewable-energy-directive': 'RED II',
  'energy-efficiency-directive': 'Energy Efficiency',
  'cbam-regulation': 'CBAM',
  'taxonomy-regulation': 'EU Taxonomy',
  sfdr: 'SFDR',
  'co2-cars-regulation': 'CO2 Cars',
  'afir-regulation': 'AFIR',
  'epbd-recast': 'EPBD',
  'eu-green-deal': 'Green Deal',
  'fit-for-55': 'Fit for 55',
  'social-climate-fund': 'Social Climate Fund',
  'methane-regulation': 'Methane Reg.',
  'nature-restoration-law': 'Nature Restoration',
  csrd: 'CSRD',
  'fueleu-maritime': 'FuelEU Maritime',
  'refueleu-aviation': 'ReFuelEU Aviation',
  'governance-regulation': 'Governance',
  'industrial-emissions-directive': 'IED',
  'net-zero-industry-act': 'NZIA',
  'critical-raw-materials-act': 'CRM Act',
  'deforestation-regulation': 'Deforestation',
  'ai-act': 'AI Act',
  'digital-services-act': 'DSA',
  'digital-markets-act': 'DMA',
  'data-act': 'Data Act',
  'cyber-resilience-act': 'CRA',
  'eu-uk-tca': 'EU-UK TCA',
  'batteries-regulation': 'Batteries',
  'ecodesign-sustainable-products': 'Ecodesign',
  'cap-strategic-plans': 'CAP',
  ehds: 'EHDS',
  'f-gas-regulation': 'F-Gas',
  'waste-framework-directive': 'Waste FD',
  'packaging-waste-regulation': 'Packaging',
  'nis2-directive': 'NIS2',
  'dora-regulation': 'DORA',
  'european-chips-act': 'Chips Act',
  'foreign-subsidies-regulation': 'Foreign Subsidies',
  csddd: 'CSDDD',
  'euro-7-regulation': 'Euro 7',
};

export default function PolicyNewsFeed({ policyId, limit }: Props) {
  const [items, setItems] = useState<PolicyNewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = policyId
      ? `/api/policy-news?policy_id=${encodeURIComponent(policyId)}`
      : '/api/policy-news';

    fetch(url)
      .then(r => r.json())
      .then(data => {
        const all: PolicyNewsItem[] = data.items ?? [];
        setItems(limit ? all.slice(0, limit) : all);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [policyId, limit]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-grey-500 italic">No related news articles found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map(item => {
        const dateStr = new Date(item.date).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

        return (
          <article
            key={item.id}
            className="border-b border-grey-200 pb-4 last:border-0 last:pb-0"
          >
            <div className="flex items-center gap-2 mb-1">
              <time className="text-xs text-grey-500">{dateStr}</time>
            </div>
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <h4 className="text-sm font-semibold text-tertiary-dark group-hover:text-secondary transition leading-snug">
                  {item.title}
                </h4>
              </a>
            ) : (
              <h4 className="text-sm font-semibold text-tertiary-dark leading-snug">
                {item.title}
              </h4>
            )}
            <p className="text-xs text-tertiary mt-1 leading-relaxed line-clamp-2">
              {item.summary}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {item.policy_ids.map(pid => (
                <Link
                  key={pid}
                  href={`/policy-navigator/policy/?id=${pid}`}
                  className="text-[11px] sm:text-[10px] px-2 py-1 sm:py-0.5 min-h-[28px] sm:min-h-0 inline-flex items-center rounded bg-primary/10 dark:bg-primary/20 text-primary dark:text-secondary-lighter font-medium hover:bg-primary/20 active:bg-primary/25 transition"
                >
                  {POLICY_LABELS[pid] || pid}
                </Link>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
