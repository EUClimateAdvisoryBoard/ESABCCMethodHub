'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { policies, connections } from '@/data/policies';
import { fetchAnnotationStats, getTagColor, DEFAULT_TAGS } from '@/lib/store';
import { useState, useEffect } from 'react';

const AnalyticsCharts = dynamic(() => import('@/components/AnalyticsCharts'), { ssr: false });
const ActivityFeed = dynamic(() => import('@/components/ActivityFeed'), { ssr: false });

type Tab = 'policy-data' | 'user-activity';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<{ total: number; byTag: Record<string, number>; byPolicy: Record<string, number> } | null>(null);
  const [tab, setTab] = useState<Tab>('policy-data');

  useEffect(() => { fetchAnnotationStats().then(setStats); }, []);

  const domains = [...new Set(policies.map(p => p.domain))];
  const statuses = [...new Set(policies.map(p => p.status))];
  const docTypes = [...new Set(policies.map(p => p.document_type))];

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-4 sm:py-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-secondary hover:text-primary transition mb-3">
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
        Back to Method Hub
      </Link>
      <h1 className="text-2xl font-bold text-tertiary-dark mb-6">Analytics Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Policies', value: policies.length, color: 'text-primary' },
          { label: 'Connections', value: connections.length, color: 'text-secondary' },
          { label: 'Domains', value: domains.length, color: 'text-tertiary' },
          { label: 'Annotations', value: stats?.total || 0, color: 'text-accent-violet' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded shadow-sm border border-grey-200 p-5">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-tertiary mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 border-b border-grey-200">
        {[
          { key: 'policy-data' as Tab, label: 'Policy Data' },
          { key: 'user-activity' as Tab, label: 'User Activity' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition ${
              tab === t.key ? 'border-secondary text-secondary' : 'border-transparent text-tertiary hover:text-tertiary-dark'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'policy-data' ? (
        <div className="space-y-8">
          {/* Domain breakdown */}
          <div className="bg-white rounded shadow-sm border border-grey-200 p-6">
            <h2 className="font-bold text-tertiary-dark text-sm mb-4 uppercase tracking-wider">Policies by Domain</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {domains.sort().map(d => {
                const count = policies.filter(p => p.domain === d).length;
                const pct = Math.round((count / policies.length) * 100);
                return (
                  <div key={d} className="p-3 rounded border border-grey-100">
                    <p className="text-lg font-bold text-tertiary-dark">{count}</p>
                    <p className="text-xs text-tertiary capitalize">{d.replace('_', ' ')}</p>
                    <div className="mt-2 h-1 bg-grey-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status breakdown */}
          <div className="bg-white rounded shadow-sm border border-grey-200 p-6">
            <h2 className="font-bold text-tertiary-dark text-sm mb-4 uppercase tracking-wider">Policies by Status</h2>
            <div className="flex flex-wrap gap-4">
              {statuses.map(s => {
                const count = policies.filter(p => p.status === s).length;
                return (
                  <div key={s} className="flex items-center gap-2 px-4 py-2 bg-grey-50 rounded">
                    <span className="text-lg font-bold text-tertiary-dark">{count}</span>
                    <span className="text-sm text-tertiary capitalize">{s.replace('_', ' ')}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Document type breakdown */}
          <div className="bg-white rounded shadow-sm border border-grey-200 p-6">
            <h2 className="font-bold text-tertiary-dark text-sm mb-4 uppercase tracking-wider">By Document Type</h2>
            <div className="flex flex-wrap gap-4">
              {docTypes.map(dt => {
                const count = policies.filter(p => p.document_type === dt).length;
                return (
                  <div key={dt} className="flex items-center gap-2 px-4 py-2 bg-grey-50 rounded">
                    <span className="text-lg font-bold text-tertiary-dark">{count}</span>
                    <span className="text-sm text-tertiary capitalize">{dt}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Connection analysis */}
          <div className="bg-white rounded shadow-sm border border-grey-200 p-6">
            <h2 className="font-bold text-tertiary-dark text-sm mb-4 uppercase tracking-wider">Most Connected Policies</h2>
            <div className="space-y-2">
              {policies
                .map(p => ({
                  ...p,
                  connCount: connections.filter(c => c.source_policy_id === p.id || c.target_policy_id === p.id).length,
                }))
                .sort((a, b) => b.connCount - a.connCount)
                .slice(0, 10)
                .map(p => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="w-12 text-right">
                      <span className="text-sm font-bold text-primary">{p.connCount}</span>
                    </div>
                    <div className="flex-1 h-2 bg-grey-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary/60 rounded-full"
                        style={{ width: `${(p.connCount / Math.max(...policies.map(pp => connections.filter(c => c.source_policy_id === pp.id || c.target_policy_id === pp.id).length))) * 100}%` }} />
                    </div>
                    <span className="text-sm text-tertiary-dark w-64 truncate">{p.short_title}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Charts */}
          {policies.length > 0 && (
            <AnalyticsCharts policies={policies} connections={connections} />
          )}
        </div>
      ) : (
        /* User Activity tab */
        <div className="space-y-6">
          {/* Annotation stats */}
          <div className="bg-white rounded shadow-sm border border-grey-200 p-6">
            <h2 className="font-bold text-tertiary-dark text-sm mb-4 uppercase tracking-wider">Annotation Summary</h2>
            {stats && stats.total > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-tertiary">
                  <span className="text-2xl font-bold text-accent-violet">{stats.total}</span> annotations across{' '}
                  <span className="font-bold text-tertiary-dark">{Object.keys(stats.byPolicy).length}</span> policies
                  using <span className="font-bold text-tertiary-dark">{Object.keys(stats.byTag).length}</span> tags.
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.byTag).sort((a, b) => b[1] - a[1]).map(([tag, count]) => (
                    <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: getTagColor(tag) }}>
                      {tag.replace(/_/g, ' ')} ({count})
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-grey-500 italic">No annotations yet. Start annotating policies to see stats here.</p>
            )}
          </div>

          {/* Tag reference */}
          <div className="bg-white rounded shadow-sm border border-grey-200 p-6">
            <h2 className="font-bold text-tertiary-dark mb-4 text-sm uppercase tracking-wider">Available Tags</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {DEFAULT_TAGS.map(tag => (
                <div key={tag.name} className="flex items-start gap-3 p-3 rounded border border-grey-100">
                  <span className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: tag.color }} />
                  <div>
                    <p className="text-sm font-medium text-tertiary-dark">{tag.name.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-tertiary">{tag.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Global activity feed */}
          <div className="bg-white rounded shadow-sm border border-grey-200 p-6">
            <h2 className="font-bold text-tertiary-dark text-sm mb-4 uppercase tracking-wider">Global Activity Feed</h2>
            <ActivityFeed limit={50} />
          </div>
        </div>
      )}
    </div>
  );
}
