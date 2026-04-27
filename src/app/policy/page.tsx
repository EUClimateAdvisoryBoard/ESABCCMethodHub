'use client';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Suspense, useState } from 'react';
import { getPolicy, getPolicyConnections, getPolicyCitations, policies } from '@/data/policies';
import PolicyCard from '@/components/PolicyCard';

const ConnectionGraph = dynamic(() => import('@/components/ConnectionGraph'), { ssr: false });
const CommentSection = dynamic(() => import('@/components/CommentSection'), { ssr: false });
const ActivityFeed = dynamic(() => import('@/components/ActivityFeed'), { ssr: false });
const PolicyNewsFeed = dynamic(() => import('@/components/PolicyNewsFeed'), { ssr: false });

const STATUS_COLORS: Record<string, string> = {
  in_force: 'bg-secondary/10 text-secondary', proposed: 'bg-accent-yellow/20 text-yellow-700',
  amended: 'bg-accent-orange/20 text-orange-700', repealed: 'bg-accent-red/10 text-accent-red',
};

function PolicyContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  // If no id, show policy list
  if (!id) {
    return (
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-secondary hover:text-primary transition mb-3">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
          Back to Method Hub
        </Link>
        <h1 className="text-2xl font-bold text-tertiary-dark mb-6">All Policies</h1>
        {policies.length === 0 ? (
          <p className="text-tertiary">No policies loaded yet. Add data to <code className="bg-grey-100 px-1.5 py-0.5 rounded text-xs">src/data/policies.ts</code>.</p>
        ) : (
          <div className="grid gap-4">
            {policies.map(p => <PolicyCard key={p.id} policy={p} />)}
          </div>
        )}
      </div>
    );
  }

  const policy = getPolicy(id);
  const conns = getPolicyConnections(id);
  const cites = getPolicyCitations(id);

  if (!policy) {
    return (
      <div className="max-w-content mx-auto px-4 sm:px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-tertiary-dark mb-2">Policy Not Found</h1>
        <p className="text-tertiary mb-6">No policy with ID &ldquo;{id}&rdquo; exists.</p>
        <Link href="/" className="text-secondary hover:underline font-medium">Back to Policy Map</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-4 sm:py-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-secondary hover:text-primary transition mb-3">
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
        Back to Method Hub
      </Link>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-tertiary mb-6">
        <Link href="/" className="hover:text-secondary">Policy Map</Link>
        <span>/</span>
        <span className="text-tertiary-dark font-medium">{policy.short_title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8">
        <div className="lg:col-span-2 space-y-5 sm:space-y-6">
          {/* Header */}
          <div className="bg-white rounded shadow-sm border border-grey-200 p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[policy.status] || 'bg-grey-100 text-tertiary'}`}>
                {policy.status.replace('_', ' ')}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-grey-100 text-tertiary font-medium capitalize">{policy.document_type}</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium capitalize">{policy.domain}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-tertiary-dark mb-2 leading-tight wrap-anywhere">{policy.title}</h1>
            {policy.celex_number && <p className="text-sm font-mono text-tertiary-light mb-3">CELEX: {policy.celex_number}</p>}
            <p className="text-sm text-tertiary leading-relaxed">{policy.summary}</p>
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-grey-200 text-sm text-tertiary">
              {policy.adoption_date && <span>Adopted: <strong className="text-tertiary-dark">{policy.adoption_date}</strong></span>}
              {policy.entry_into_force && <span>In force: <strong className="text-tertiary-dark">{policy.entry_into_force}</strong></span>}
              {policy.eurlex_url && (
                <a href={policy.eurlex_url} target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline inline-flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18h6" /><path d="M10 22h4" />
                    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5C8.26 12.26 8.72 13.02 8.91 14" />
                  </svg>
                  View on EUR-Lex
                </a>
              )}
            </div>
          </div>

          {/* Connection graph */}
          {conns.length > 0 && (
            <div className="bg-white rounded shadow-sm border border-grey-200 p-4 sm:p-6">
              <h2 className="font-bold text-tertiary-dark mb-4">Policy Network</h2>
              <ConnectionGraph policyId={id} policyDomain={policy.domain} connections={conns} />
            </div>
          )}

          {/* Connections list */}
          {conns.length > 0 && (
            <div className="bg-white rounded shadow-sm border border-grey-200 p-4 sm:p-6">
              <h2 className="font-bold text-tertiary-dark mb-4">Connections ({conns.length})</h2>
              <div className="space-y-3">
                {conns.map(c => {
                  const isSource = c.source_policy_id === id;
                  const otherId = isSource ? c.target_policy_id : c.source_policy_id;
                  const otherTitle = isSource ? c.target_title : c.source_title;
                  return (
                    <Link key={c.id} href={`/policy/?id=${otherId}`}
                      className="flex items-start gap-3 p-3 rounded border border-grey-200 hover:border-secondary/30 transition">
                      <span className="text-xs px-2 py-0.5 rounded bg-grey-100 text-tertiary font-medium whitespace-nowrap capitalize">
                        {c.connection_type.replace('_', ' ')}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-tertiary-dark">{otherTitle || otherId}</p>
                        <p className="text-xs text-tertiary">{c.description}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {cites.length > 0 && (
            <div className="bg-white rounded shadow-sm border border-grey-200 p-5">
              <h3 className="font-bold text-tertiary-dark text-sm mb-3">Citations ({cites.length})</h3>
              {cites.slice(0, 10).map(c => (
                <div key={c.id} className="text-xs text-tertiary py-1.5 border-b border-grey-100 last:border-0">
                  <Link href={`/policy/?id=${c.cited_policy_id}`} className="text-secondary hover:underline font-medium">
                    {c.cited_policy_title}
                  </Link>
                  {c.article_number && <span className="text-grey-500 ml-1">({c.article_number})</span>}
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded shadow-sm border border-grey-200 p-5">
            <h3 className="font-bold text-tertiary-dark text-sm mb-3">Details</h3>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-grey-500 text-xs">Type</dt><dd className="text-tertiary-dark capitalize">{policy.document_type}</dd></div>
              <div><dt className="text-grey-500 text-xs">Domain</dt><dd className="text-tertiary-dark capitalize">{policy.domain}</dd></div>
              <div><dt className="text-grey-500 text-xs">Status</dt><dd className="text-tertiary-dark capitalize">{policy.status.replace('_', ' ')}</dd></div>
              {policy.celex_number && <div><dt className="text-grey-500 text-xs">CELEX</dt><dd className="text-tertiary-dark font-mono text-xs">{policy.celex_number}</dd></div>}
              <div><dt className="text-grey-500 text-xs">Last Updated</dt><dd className="text-tertiary-dark">{policy.last_updated}</dd></div>
            </dl>
          </div>

          {/* Activity feed for this policy */}
          <div className="bg-white rounded shadow-sm border border-grey-200 p-5">
            <h3 className="font-bold text-tertiary-dark text-sm mb-3">Recent Activity</h3>
            <ActivityFeed policyId={id} limit={15} />
          </div>

          {/* Related news from Politico */}
          <div className="bg-white rounded shadow-sm border border-grey-200 p-5">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-tertiary-dark text-sm">Related News</h3>
            </div>
            <p className="text-[10px] text-grey-500 mb-3">
              From <span className="font-bold tracking-wide">POLITICO</span> Europe
            </p>
            <PolicyNewsFeed policyId={id} limit={5} />
          </div>
        </div>
      </div>

      {/* Comments section — full width below */}
      <div className="mt-6 sm:mt-8">
        <div className="bg-white rounded shadow-sm border border-grey-200 p-4 sm:p-6">
          <CommentSection policyId={id} />
        </div>
      </div>
    </div>
  );
}

export default function PolicyPage() {
  return (
    <Suspense fallback={<div className="max-w-content mx-auto px-4 sm:px-6 py-20 text-center text-tertiary">Loading...</div>}>
      <PolicyContent />
    </Suspense>
  );
}
