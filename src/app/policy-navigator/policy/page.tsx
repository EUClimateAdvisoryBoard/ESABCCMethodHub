'use client';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Suspense, useState, useEffect } from 'react';
import { setContext } from '@/components/ContextDrawer';
import { getPolicy, getPolicyCitations, policies } from '@/data/policies';
import { getReferencesForPolicy } from '@/lib/policy-references';
import { useRecommendations } from '@/lib/useRecommendations';
import { CONNECTION_TYPES } from '@/lib/connectionTypes';
import { useConnectionOverrides, type EnrichedConnection } from '@/lib/useConnectionOverrides';
import PolicyCard from '@/components/PolicyCard';
import ConnectionArticleReveal from '@/components/ConnectionArticleReveal';
import ConnectionTypesLegend from '@/components/ConnectionTypesLegend';
import EditConnectionModal from '@/components/EditConnectionModal';

const CONNECTION_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = Object.fromEntries(
  Object.values(CONNECTION_TYPES).map(t => [t.id, t.badge]),
);

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
  const { getConnectionsForPolicy } = useConnectionOverrides();
  const [editingConnection, setEditingConnection] = useState<EnrichedConnection | null>(null);

  // If no id, show policy list
  if (!id) {
    return (
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <Link href="/policy-navigator" className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-secondary hover:text-primary transition mb-3">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
          Back to Policy Navigator
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
  const conns = getConnectionsForPolicy(id);
  const cites = getPolicyCitations(id);
  const relatedRefs = getReferencesForPolicy(id, 10);
  const { recommendations: allRecs } = useRecommendations();
  const relatedRecs = allRecs.filter(r => r.policy_ids.includes(id ?? ''));

  // Register the page's context so the global drawer (#6) and assistant
  // (#11) can fetch related items / ground their answers.
  useEffect(() => {
    if (!policy) return;
    setContext({ kind: 'policy', id: policy.id, title: policy.short_title || policy.title });
    return () => setContext(null);
  }, [policy]);

  if (!policy) {
    return (
      <div className="max-w-content mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
        <h1 className="text-2xl font-bold text-tertiary-dark mb-2">Policy Not Found</h1>
        <p className="text-tertiary mb-6">No policy with ID &ldquo;{id}&rdquo; exists.</p>
        <Link href="/policy-navigator" className="text-secondary hover:underline font-medium">Back to Policy Map</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-4 sm:py-8">
      <Link href="/policy-navigator" className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-secondary hover:text-primary transition mb-3">
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
        Back to Policy Navigator
      </Link>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-tertiary mb-6">
        <Link href="/policy-navigator" className="hover:text-secondary">Policy Map</Link>
        <span>/</span>
        <span className="text-tertiary-dark font-medium">{policy.short_title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="bg-white rounded shadow-sm border border-grey-200 p-6">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[policy.status] || 'bg-grey-100 text-tertiary'}`}>
                {policy.status.replace('_', ' ')}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-grey-100 text-tertiary font-medium capitalize">{policy.document_type}</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium capitalize">{policy.domain}</span>
            </div>
            <h1 className="text-2xl font-bold text-tertiary-dark mb-2 leading-tight">{policy.title}</h1>
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
            <div className="bg-white rounded shadow-sm border border-grey-200 p-6">
              <h2 className="font-bold text-tertiary-dark mb-4">Policy Network</h2>
              <ConnectionGraph policyId={id} policyDomain={policy.domain} connections={conns} />
            </div>
          )}

          {/* Connections list */}
          {conns.length > 0 && (
            <div className="bg-white rounded shadow-sm border border-grey-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-tertiary-dark">Connections ({conns.length})</h2>
                <p className="text-[10px] text-grey-500 uppercase tracking-wider">Legislative interdependencies</p>
              </div>
              <div className="mb-5">
                <ConnectionTypesLegend />
              </div>
              <div className="space-y-4">
                {conns.map(c => {
                  const isSource = c.source_policy_id === id;
                  const otherId = isSource ? c.target_policy_id : c.source_policy_id;
                  const otherTitle = isSource ? c.target_title : c.source_title;
                  const otherPolicy = getPolicy(otherId);
                  const colors = CONNECTION_TYPE_COLORS[c.connection_type] || CONNECTION_TYPE_COLORS.complements;
                  const sourcePolicy = getPolicy(c.source_policy_id);
                  const targetPolicy = getPolicy(c.target_policy_id);
                  const typeDef = CONNECTION_TYPES[c.connection_type as keyof typeof CONNECTION_TYPES];

                  return (
                    <div key={c.id} className={`rounded-lg border ${colors.border} bg-white hover:shadow-md transition-shadow`}>
                      {/* Header row */}
                      <div className="flex items-start gap-3 p-4 pb-2">
                        <span
                          className={`text-[10px] px-2.5 py-1 rounded-full font-semibold whitespace-nowrap capitalize ${colors.bg} ${colors.text}`}
                          title={typeDef ? `${typeDef.definition} When to use: ${typeDef.criteria}` : undefined}
                        >
                          {c.connection_type.replace('_', ' ')}
                          {c.isEdited && <span className="ml-1 text-amber-600" aria-label="edited locally">*</span>}
                        </span>
                        <div className="flex-1 min-w-0">
                          <Link href={`/policy-navigator/policy/?id=${otherId}`}
                            className="text-sm font-semibold text-tertiary-dark hover:text-secondary transition inline-flex items-center gap-1.5">
                            {otherTitle || otherId}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-40">
                              <path d="M7 17l9.2-9.2M17 17V7H7" />
                            </svg>
                          </Link>
                          {otherPolicy && (
                            <p className="text-[10px] text-grey-500 mt-0.5 capitalize">{otherPolicy.document_type} &middot; {otherPolicy.domain.replace('_', ' ')}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingConnection(c)}
                          className="shrink-0 text-[10px] px-2 py-1 border border-grey-300 text-tertiary-dark rounded hover:bg-grey-50"
                          aria-label={`Edit connection to ${otherTitle || otherId}`}
                        >
                          Edit
                        </button>
                      </div>

                      {/* Description */}
                      <div className="px-4 pb-3">
                        <p className="text-xs text-tertiary leading-relaxed">{c.description}</p>
                      </div>

                      {/* Article references & legal text links */}
                      {(c.articles_source || c.articles_target || otherPolicy?.eurlex_url) && (
                        <div className="px-4 pb-3 pt-2 border-t border-grey-100 space-y-2">
                          <p className="text-[9px] uppercase tracking-wider text-grey-400 font-semibold">
                            Click a reference to read the exact passage
                          </p>
                          {c.articles_source && sourcePolicy && (
                            <ConnectionArticleReveal
                              policy={sourcePolicy}
                              label={sourcePolicy.short_title}
                              refs={c.articles_source}
                              citeContext={`${c.connection_type.replace('_', ' ')} ${targetPolicy?.short_title || c.target_title || c.target_policy_id}`}
                            />
                          )}
                          {c.articles_target && targetPolicy && (
                            <ConnectionArticleReveal
                              policy={targetPolicy}
                              label={targetPolicy.short_title}
                              refs={c.articles_target}
                              citeContext={`${c.connection_type.replace('_', ' ')} by ${sourcePolicy?.short_title || c.source_title || c.source_policy_id}`}
                            />
                          )}
                          {otherPolicy?.eurlex_url && (
                            <div className="pt-1">
                              <a
                                href={otherPolicy.eurlex_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-secondary hover:underline font-medium inline-flex items-center gap-1"
                              >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                                </svg>
                                View legal text on EUR-Lex
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
                  <Link href={`/policy-navigator/policy/?id=${c.cited_policy_id}`} className="text-secondary hover:underline font-medium">
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

          {/* Related References */}
          {relatedRefs.length > 0 && (
            <div className="bg-white rounded shadow-sm border border-grey-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-tertiary-dark text-sm">Related References ({relatedRefs.length})</h3>
                <Link href="/references" className="text-[10px] text-[#D97706] hover:underline font-medium">View all</Link>
              </div>
              <div className="space-y-2.5">
                {relatedRefs.slice(0, 8).map(ref => (
                  <div key={ref.id} className="text-xs border-b border-grey-100 pb-2 last:border-0 last:pb-0">
                    <p className="text-tertiary-dark leading-snug line-clamp-2">{ref.title}</p>
                    <p className="text-grey-500 mt-0.5">
                      {ref.authors.split(',').slice(0, 2).join(',')} ({ref.year})
                      {ref.doi && (
                        <a href={`https://doi.org/${ref.doi}`} target="_blank" rel="noopener noreferrer"
                          className="ml-1 text-[#D97706] hover:underline">DOI</a>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advisory Board Recommendations */}
          {relatedRecs.length > 0 && (
            <div className="bg-white rounded shadow-sm border border-grey-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-tertiary-dark text-sm">Board Recommendations ({relatedRecs.length})</h3>
                <Link href="/recommendations" className="text-[10px] text-secondary hover:underline font-medium">View all</Link>
              </div>
              <div className="space-y-2.5">
                {relatedRecs.map(rec => (
                  <Link
                    key={rec.id}
                    href={`/recommendations?id=${rec.id}`}
                    className="block text-xs border-b border-grey-100 pb-2.5 last:border-0 last:pb-0 group"
                  >
                    <p className="text-tertiary-dark leading-snug group-hover:text-secondary transition-colors">{rec.short_text}</p>
                    <p className="text-grey-400 mt-0.5">{rec.report_title} · {rec.year}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comments section — full width below */}
      <div className="mt-8">
        <div className="bg-white rounded shadow-sm border border-grey-200 p-6">
          <CommentSection policyId={id} />
        </div>
      </div>

      {editingConnection && (
        <EditConnectionModal
          connection={editingConnection}
          onClose={() => setEditingConnection(null)}
        />
      )}
    </div>
  );
}

export default function PolicyPage() {
  return (
    <Suspense fallback={<div className="max-w-content mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center text-tertiary">Loading...</div>}>
      <PolicyContent />
    </Suspense>
  );
}
