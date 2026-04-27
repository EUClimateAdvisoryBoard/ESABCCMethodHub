'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import PolicyCard from '@/components/PolicyCard';
import { searchPolicies } from '@/data/policies';
import { getAnnotations, getTagColor } from '@/lib/store';
import { Policy, Annotation } from '@/lib/types';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [policyResults, setPolicyResults] = useState<Policy[]>([]);
  const [annotationResults, setAnnotationResults] = useState<Annotation[]>([]);
  const [tab, setTab] = useState<'all' | 'policies' | 'annotations'>('all');

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (!q.trim()) { setPolicyResults([]); setAnnotationResults([]); return; }
    setPolicyResults(searchPolicies(q));
    const allAnns = getAnnotations();
    const lower = q.toLowerCase();
    setAnnotationResults(allAnns.filter(a =>
      a.tag.toLowerCase().includes(lower) ||
      a.text_excerpt.toLowerCase().includes(lower) ||
      a.note.toLowerCase().includes(lower)
    ));
  }, []);

  const totalPolicies = policyResults.length;
  const totalAnnotations = annotationResults.length;
  const total = totalPolicies + totalAnnotations;

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-4 sm:py-8">
      <Link href="/policy-navigator" className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-secondary hover:text-primary transition mb-3">
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
        Back to Policy Navigator
      </Link>
      <h1 className="text-2xl font-bold text-tertiary-dark mb-6">Search</h1>

      <SearchBar value={query} onChange={handleSearch} />

      {query && (
        <div className="mt-6">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-grey-200">
            {[
              { key: 'all', label: `All (${total})` },
              { key: 'policies', label: `Policies (${totalPolicies})` },
              { key: 'annotations', label: `Annotations (${totalAnnotations})` },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as any)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                  tab === t.key ? 'border-secondary text-secondary' : 'border-transparent text-tertiary hover:text-tertiary-dark'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Policy results */}
          {(tab === 'all' || tab === 'policies') && totalPolicies > 0 && (
            <div className="mb-8">
              {tab === 'all' && <h2 className="font-bold text-tertiary-dark text-sm mb-3 uppercase tracking-wider">Policies</h2>}
              <div className="grid gap-3">
                {policyResults.map(p => <PolicyCard key={p.id} policy={p} />)}
              </div>
            </div>
          )}

          {/* Annotation results */}
          {(tab === 'all' || tab === 'annotations') && totalAnnotations > 0 && (
            <div className="mb-8">
              {tab === 'all' && <h2 className="font-bold text-tertiary-dark text-sm mb-3 uppercase tracking-wider">Annotations</h2>}
              <div className="grid gap-3">
                {annotationResults.map(a => (
                  <div key={a.id} className="bg-white rounded border border-grey-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: getTagColor(a.tag) }}>
                        {a.tag.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-grey-500">{a.policy_id}</span>
                    </div>
                    <p className="text-sm text-tertiary italic line-clamp-2">&ldquo;{a.text_excerpt}&rdquo;</p>
                    {a.note && <p className="text-sm text-tertiary-dark mt-1">{a.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {total === 0 && (
            <div className="text-center py-12">
              <p className="text-tertiary">No results found for &ldquo;{query}&rdquo;</p>
            </div>
          )}
        </div>
      )}

      {!query && (
        <div className="text-center py-16">
          <p className="text-tertiary text-sm">Enter a search term to find policies, legislation text, or annotations.</p>
        </div>
      )}
    </div>
  );
}
