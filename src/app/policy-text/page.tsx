'use client';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { getPolicy, getPolicyCitations, getPolicyConnections, fetchPolicyFullText, policies } from '@/data/policies';
import FullTextViewer from '@/components/FullTextViewer';
import AnnotationPanel from '@/components/AnnotationPanel';
import CommentSection from '@/components/CommentSection';

function PolicyTextContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [refreshKey, setRefreshKey] = useState(0);
  const [fullText, setFullText] = useState<string | null | undefined>(undefined); // undefined = loading
  const [activeTab, setActiveTab] = useState<'annotations' | 'comments'>('annotations');

  const policy = id ? getPolicy(id) : undefined;
  const citations = id ? getPolicyCitations(id) : [];
  const policyConnections = id ? getPolicyConnections(id) : [];

  // Always fetch full text eagerly — this is the main purpose of this page
  useEffect(() => {
    if (!id) return;
    fetchPolicyFullText(id).then(text => {
      if (text && text.length > (policy?.full_text?.length || 0)) {
        setFullText(text);
      } else {
        setFullText(policy?.full_text || text);
      }
    });
  }, [id, policy]);

  if (!id) {
    return (
      <div className="max-w-content mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
        <h1 className="text-2xl font-bold text-tertiary-dark mb-2">No Policy Selected</h1>
        <Link href="/" className="text-secondary hover:underline">Back to Policy Map</Link>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="max-w-content mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
        <h1 className="text-2xl font-bold text-tertiary-dark mb-2">Policy Not Found</h1>
        <Link href="/" className="text-secondary hover:underline">Back to Policy Map</Link>
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
        <Link href={`/policy/?id=${id}`} className="hover:text-secondary">{policy.short_title}</Link>
        <span>/</span>
        <span className="text-tertiary-dark font-medium">Full Text</span>
      </nav>

      {/* Annotatable text view with sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-grey-200 p-6 md:p-8">
            {/* Policy header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-tertiary-dark mb-1">{policy.short_title}</h1>
                <p className="text-sm text-tertiary">{policy.title}</p>
                <div className="flex items-center gap-3 mt-2">
                  {policy.status && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      policy.status === 'in_force' ? 'bg-green-100 text-green-700' :
                      policy.status === 'amended' ? 'bg-amber-100 text-amber-700' :
                      policy.status === 'proposed' ? 'bg-blue-100 text-blue-700' :
                      'bg-grey-100 text-grey-600'
                    }`}>
                      {policy.status.replace(/_/g, ' ')}
                    </span>
                  )}
                  {policy.document_type && (
                    <span className="text-xs text-tertiary capitalize">{policy.document_type}</span>
                  )}
                  {policy.adoption_date && (
                    <span className="text-xs text-tertiary">Adopted: {policy.adoption_date}</span>
                  )}
                </div>
              </div>
              {policy.eurlex_url && (
                <a href={policy.eurlex_url} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 ml-4 inline-flex items-center gap-1.5 text-xs text-secondary hover:underline border border-secondary/20 rounded px-2.5 py-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  EUR-Lex
                </a>
              )}
            </div>

            <div className="border-t border-grey-200 pt-6">
              {fullText === undefined ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-tertiary">Loading legislative text...</p>
                  </div>
                </div>
              ) : fullText ? (
                <FullTextViewer
                  policyId={id}
                  text={fullText}
                  citations={citations}
                  policyConnections={policyConnections}
                  allPolicies={policies}
                  onAnnotationsChange={() => setRefreshKey(k => k + 1)}
                />
              ) : (
                <div className="py-8">
                  <p className="text-tertiary mb-3">The full legislative text could not be loaded from EUR-Lex at this time.</p>
                  {policy.summary && (
                    <div className="bg-grey-50 rounded p-4 mb-4">
                      <h3 className="font-bold text-tertiary-dark text-sm mb-2">Policy Summary</h3>
                      <p className="text-sm text-tertiary leading-relaxed">{policy.summary}</p>
                    </div>
                  )}
                  <p className="text-xs text-tertiary mb-2">You can access the full text directly:</p>
                  {policy.eurlex_url && (
                    <a href={policy.eurlex_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-secondary hover:underline border border-secondary/20 rounded px-3 py-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      Open on EUR-Lex
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Comments section below the document */}
          {fullText && (
            <div className="bg-white rounded-lg shadow-sm border border-grey-200 p-6 md:p-8 mt-6">
              <CommentSection policyId={id} refreshKey={refreshKey} />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-[88px] space-y-4">
            {/* Tab switcher */}
            <div className="bg-white rounded-lg shadow-sm border border-grey-200">
              <div className="flex border-b border-grey-200">
                <button
                  onClick={() => setActiveTab('annotations')}
                  className={`flex-1 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
                    activeTab === 'annotations'
                      ? 'text-secondary border-b-2 border-secondary bg-secondary/5'
                      : 'text-tertiary hover:text-tertiary-dark'
                  }`}>
                  <span className="flex items-center justify-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Annotations
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`flex-1 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
                    activeTab === 'comments'
                      ? 'text-secondary border-b-2 border-secondary bg-secondary/5'
                      : 'text-tertiary hover:text-tertiary-dark'
                  }`}>
                  <span className="flex items-center justify-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                    Comments
                  </span>
                </button>
              </div>

              <div className="p-4">
                {activeTab === 'annotations' ? (
                  <AnnotationPanel policyId={id} refreshKey={refreshKey} />
                ) : (
                  <div className="text-sm">
                    <CommentSection policyId={id} refreshKey={refreshKey} />
                  </div>
                )}
              </div>
            </div>

            {/* Cross-References panel */}
            {policyConnections.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-grey-200 p-4">
                <h3 className="text-xs font-bold text-tertiary-dark uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                  </svg>
                  Cross-References ({policyConnections.length})
                </h3>
                <div className="space-y-2">
                  {policyConnections.map(conn => {
                    const isSource = conn.source_policy_id === id;
                    const linkedId = isSource ? conn.target_policy_id : conn.source_policy_id;
                    const linkedTitle = isSource ? conn.target_title : conn.source_title;
                    const linkedHasText = policies.find(p => p.id === linkedId)?.full_text;
                    const typeColors: Record<string, string> = {
                      amends: '#F59E0B',
                      implements: '#10B981',
                      references: '#3B82F6',
                      complements: '#8B5CF6',
                      repeals: '#EF4444',
                      is_part_of: '#06B6D4',
                    };
                    return (
                      <div key={conn.id} className="border border-grey-100 rounded-lg p-2.5 hover:border-secondary/30 hover:bg-secondary/5 transition group">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: typeColors[conn.connection_type] || '#6B7280' }} />
                          <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: typeColors[conn.connection_type] || '#6B7280' }}>
                            {conn.connection_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <Link href={`/policy-text/?id=${linkedId}`}
                          className="text-sm font-medium text-tertiary-dark hover:text-secondary transition flex items-center gap-1">
                          {linkedTitle}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-0 group-hover:opacity-100 transition">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </Link>
                        <p className="text-[11px] text-tertiary mt-0.5 leading-snug">{conn.description}</p>
                        {linkedHasText && (
                          <Link href={`/policy-text/?id=${linkedId}`}
                            className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-secondary hover:underline font-medium">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                              <line x1="16" y1="17" x2="8" y2="17" />
                            </svg>
                            View full text
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick reference: How to annotate */}
            <div className="bg-white rounded-lg shadow-sm border border-grey-200 p-4">
              <h3 className="text-xs font-bold text-tertiary-dark uppercase tracking-wider mb-3">How to Annotate</h3>
              <div className="space-y-2 text-xs text-tertiary">
                <div className="flex items-start gap-2">
                  <span className="bg-secondary/10 text-secondary rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">1</span>
                  <span>Select text in the document by clicking and dragging</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-secondary/10 text-secondary rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">2</span>
                  <span>Choose a tag category (e.g. policy gap, strong commitment)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-secondary/10 text-secondary rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">3</span>
                  <span>Add an optional note explaining your annotation</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-secondary/10 text-secondary rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">4</span>
                  <span>Click Save to add your annotation to the document</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PolicyTextPage() {
  return (
    <Suspense fallback={<div className="max-w-content mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center text-tertiary">Loading...</div>}>
      <PolicyTextContent />
    </Suspense>
  );
}
