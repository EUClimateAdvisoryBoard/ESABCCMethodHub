/**
 * Compact card displaying a policy's title, domain badge, status, and key metadata.
 */
'use client';
import Link from 'next/link';
import { Policy } from '@/lib/types';

const DOMAIN_COLORS: Record<string, string> = {
  climate: 'bg-secondary text-white',
  energy: 'bg-accent-orange text-white',
  transport: 'bg-accent-violet text-white',
  finance: 'bg-accent-blue text-white',
  'cross-cutting': 'bg-tertiary text-white',
  security: 'bg-accent-red text-white',
  defense: 'bg-grey-500 text-white',
  agriculture: 'bg-accent-green text-white',
  industry: 'bg-accent-purple text-white',
  digital: 'bg-accent-blue text-white',
  trade: 'bg-tertiary text-white',
  circular_economy: 'bg-secondary text-white',
  health: 'bg-accent-red text-white',
  environment: 'bg-accent-green text-white',
  social: 'bg-accent-purple text-white',
  justice: 'bg-accent-violet text-white',
  migration: 'bg-accent-orange text-white',
  education: 'bg-accent-blue text-white',
  consumer: 'bg-tertiary text-white',
  fisheries: 'bg-accent-blue text-white',
};

const STATUS_DOT: Record<string, string> = {
  in_force: 'bg-secondary',
  proposed: 'bg-accent-yellow',
  amended: 'bg-accent-orange',
  repealed: 'bg-accent-red',
};

export default function PolicyCard({ policy }: { policy: Policy }) {
  return (
    <Link href={`/policy-navigator/policy/?id=${policy.id}`}
      className="block bg-white rounded shadow-sm border border-grey-200 p-5 hover:shadow-md hover:border-secondary/30 transition-all">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-bold text-tertiary-dark text-base leading-tight">{policy.short_title}</h3>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${DOMAIN_COLORS[policy.domain] || 'bg-grey-400 text-white'}`}>
          {policy.domain}
        </span>
      </div>
      <p className="text-sm text-tertiary line-clamp-2 mb-3">{policy.summary}</p>
      <div className="flex items-center gap-3 text-xs text-grey-500">
        <span className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${STATUS_DOT[policy.status] || 'bg-grey-400'}`} />
          {policy.status.replace('_', ' ')}
        </span>
        <span className="capitalize">{policy.document_type}</span>
        {policy.celex_number && <span className="font-mono text-tertiary-light">{policy.celex_number}</span>}
        {policy.adoption_date && <span>{policy.adoption_date}</span>}
      </div>
    </Link>
  );
}
