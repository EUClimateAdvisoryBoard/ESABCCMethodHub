/**
 * Recommendations tracker for ESABCC policy implementation status.
 */
'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getPolicy } from '@/data/policies';
import { getIndicator } from '@/lib/scenarios/policy-gap';
import {
  useRecommendations,
  type Recommendation,
  type RecommendationDraft,
  type RecommendationStatus,
  EMPTY_DRAFT,
} from '@/lib/useRecommendations';
import RecommendationForm from '@/components/recommendations/RecommendationForm';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<RecommendationStatus, { label: string; badge: string }> = {
  'not-implemented':      { label: 'Not implemented',       badge: 'bg-grey-100 text-grey-600' },
  'partially-implemented': { label: 'Partially implemented', badge: 'bg-accent-orange/15 text-orange-700' },
  'implemented':           { label: 'Implemented',           badge: 'bg-secondary/10 text-secondary' },
  'ongoing':               { label: 'Ongoing',               badge: 'bg-primary/10 text-primary' },
};

// ─── Inline expanded panel ────────────────────────────────────────────────────

function RecommendationPanel({
  rec,
  onEdit,
  onDelete,
  isDeleting,
}: {
  rec: Recommendation;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const linkedPolicies = rec.policy_ids.map(id => getPolicy(id)).filter(Boolean);
  const linkedIndicators = rec.indicator_ids.map(id => getIndicator(id)).filter(Boolean);

  return (
    <div className="border-t border-grey-100 bg-grey-50/50 px-5 py-5 space-y-5">
      {rec.full_text && (
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-grey-400 mb-2">Full recommendation</h4>
          <p className="text-sm text-tertiary-dark leading-relaxed whitespace-pre-wrap">{rec.full_text}</p>
        </div>
      )}

      {rec.justification && (
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-grey-400 mb-2">Justification</h4>
          <p className="text-sm text-tertiary leading-relaxed whitespace-pre-wrap">{rec.justification}</p>
        </div>
      )}

      {rec.assessment && (
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-grey-400 mb-2">Progress assessment</h4>
          <p className="text-sm text-tertiary leading-relaxed whitespace-pre-wrap">{rec.assessment}</p>
        </div>
      )}

      {linkedPolicies.length > 0 && (
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-grey-400 mb-2">
            Policies ({linkedPolicies.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {linkedPolicies.map(p => p && (
              <Link
                key={p.id}
                href={`/policy-navigator/policy?id=${p.id}`}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors font-medium"
              >
                {p.short_title}
                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {linkedIndicators.length > 0 && (
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-grey-400 mb-2">
            Indicators ({linkedIndicators.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {linkedIndicators.map(ind => ind && (
              <Link
                key={ind.id}
                href={`/scenarios?gap=${ind.id}`}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border border-secondary/30 bg-secondary/5 text-secondary hover:bg-secondary/10 transition-colors font-medium"
              >
                <span className="font-bold">{ind.code}</span>
                {ind.title}
                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-grey-200">
        <button
          type="button"
          onClick={onEdit}
          className="text-xs px-3 py-1.5 border border-grey-300 rounded text-tertiary-dark hover:bg-grey-100 transition-colors"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="text-xs px-3 py-1.5 border border-accent-red/30 rounded text-accent-red hover:bg-accent-red/5 transition-colors disabled:opacity-40"
        >
          {isDeleting ? 'Deleting…' : 'Delete'}
        </button>
        <span className="text-[11px] text-grey-400 ml-auto">
          Updated {new Date(rec.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>
    </div>
  );
}

// ─── Recommendation card ──────────────────────────────────────────────────────

function RecommendationCard({
  rec,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  isDeleting,
}: {
  rec: Recommendation;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const cfg = STATUS_CONFIG[rec.status];

  return (
    <div className={`bg-white border rounded-lg transition-shadow ${isExpanded ? 'border-primary/30 shadow-md' : 'border-grey-200 hover:shadow-sm'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-5 py-4"
      >
        <div className="flex items-start gap-4">
          {/* Recommendation number badge */}
          <span className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-primary/8 text-primary font-bold text-sm border border-primary/15">
            {rec.recommendation_number}
          </span>

          <div className="flex-1 min-w-0">
            {/* Top line: report title + year */}
            <p className="text-[11px] text-grey-400 mb-0.5">
              {rec.report_title} · {rec.year}{rec.category ? ` · ${rec.category}` : ''}
            </p>
            {/* Short text */}
            <p className="text-sm font-medium text-tertiary-dark leading-snug">
              {rec.short_text}
            </p>
            {/* Connection counts */}
            <p className="text-xs text-grey-400 mt-1.5">
              {rec.policy_ids.length > 0 && `${rec.policy_ids.length} polic${rec.policy_ids.length === 1 ? 'y' : 'ies'}`}
              {rec.policy_ids.length > 0 && rec.indicator_ids.length > 0 && ' · '}
              {rec.indicator_ids.length > 0 && `${rec.indicator_ids.length} indicator${rec.indicator_ids.length === 1 ? '' : 's'}`}
              {rec.policy_ids.length === 0 && rec.indicator_ids.length === 0 && 'No connections yet'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${cfg.badge}`}>
              {cfg.label}
            </span>
            <svg
              width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
              className={`text-grey-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            >
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
        </div>
      </button>

      {isExpanded && (
        <RecommendationPanel
          rec={rec}
          onEdit={onEdit}
          onDelete={onDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}

// ─── Main page content ────────────────────────────────────────────────────────

function RecommendationsContent() {
  const searchParams = useSearchParams();
  const { recommendations, loading, error, addRecommendation, updateRecommendation, deleteRecommendation } = useRecommendations();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<
    { type: 'add' } | { type: 'edit'; rec: Recommendation } | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<RecommendationStatus | 'all'>('all');

  const formRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef<HTMLDivElement>(null);

  // Auto-expand from URL ?id= param
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) setExpandedId(id);
  }, [searchParams]);

  // Scroll form into view when opened
  useEffect(() => {
    if (formMode) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [formMode]);

  function handleToggle(id: string) {
    setExpandedId(prev => prev === id ? null : id);
    setFormMode(null);
  }

  async function handleSave(draft: RecommendationDraft) {
    setIsSaving(true);
    let err: string | null;
    if (formMode?.type === 'edit') {
      err = await updateRecommendation(formMode.rec.id, draft);
    } else {
      err = await addRecommendation(draft);
    }
    setIsSaving(false);
    if (!err) setFormMode(null);
    return err;
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this recommendation? This cannot be undone.')) return;
    setDeletingId(id);
    await deleteRecommendation(id);
    setDeletingId(null);
    if (expandedId === id) setExpandedId(null);
  }

  const filtered = filterStatus === 'all'
    ? recommendations
    : recommendations.filter(r => r.status === filterStatus);

  // Group by year for display
  const byYear = filtered.reduce<Record<number, Recommendation[]>>((acc, rec) => {
    (acc[rec.year] ??= []).push(rec);
    return acc;
  }, {});
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);

  return (
    <div className="max-w-content mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-bold text-tertiary-dark">Advisory Board Recommendations</h1>
          <p className="text-sm text-grey-500 mt-1">Past recommendations with links to relevant policies and indicators.</p>
        </div>
        {!formMode && (
          <button
            type="button"
            onClick={() => { setFormMode({ type: 'add' }); setExpandedId(null); }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded hover:bg-primary-dark transition-colors"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            Add recommendation
          </button>
        )}
      </div>

      {/* Add/edit form */}
      {formMode && (
        <div ref={formRef} className="mb-8">
          <h2 className="text-sm font-semibold text-tertiary-dark mb-3">
            {formMode.type === 'add' ? 'New recommendation' : `Editing ${formMode.rec.recommendation_number}`}
          </h2>
          <RecommendationForm
            initial={formMode.type === 'edit' ? {
              report_title: formMode.rec.report_title,
              recommendation_number: formMode.rec.recommendation_number,
              year: formMode.rec.year,
              short_text: formMode.rec.short_text,
              full_text: formMode.rec.full_text ?? '',
              justification: formMode.rec.justification ?? '',
              assessment: formMode.rec.assessment ?? '',
              category: formMode.rec.category ?? '',
              status: formMode.rec.status,
              policy_ids: formMode.rec.policy_ids,
              indicator_ids: formMode.rec.indicator_ids,
            } : undefined}
            onSave={handleSave}
            onCancel={() => setFormMode(null)}
            isSaving={isSaving}
          />
        </div>
      )}

      {/* Status filter */}
      {!loading && recommendations.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs text-grey-500">Filter:</span>
          {(['all', ...Object.keys(STATUS_CONFIG)] as (RecommendationStatus | 'all')[]).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                filterStatus === s
                  ? 'bg-primary text-white border-primary'
                  : 'border-grey-300 text-tertiary hover:border-grey-400'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_CONFIG[s as RecommendationStatus].label}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-grey-100 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-accent-red bg-accent-red/5 border border-accent-red/20 rounded px-4 py-3">{error}</p>
      )}

      {!loading && !error && recommendations.length === 0 && (
        <div className="text-center py-16 text-grey-400">
          <p className="text-sm">No recommendations yet.</p>
          <p className="text-xs mt-1">Click &ldquo;Add recommendation&rdquo; to get started.</p>
        </div>
      )}

      {!loading && !error && recommendations.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-grey-400 text-center py-8">No recommendations match the selected filter.</p>
      )}

      {years.map(year => (
        <div key={year} className="mb-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-grey-400 mb-3">{year}</h2>
          <div className="space-y-3">
            {byYear[year].map(rec => (
              <RecommendationCard
                key={rec.id}
                rec={rec}
                isExpanded={expandedId === rec.id}
                onToggle={() => handleToggle(rec.id)}
                onEdit={() => {
                  setFormMode({ type: 'edit', rec });
                  setExpandedId(null);
                }}
                onDelete={() => handleDelete(rec.id)}
                isDeleting={deletingId === rec.id}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RecommendationsPage() {
  return (
    <Suspense fallback={<div className="max-w-content mx-auto px-6 py-8 text-sm text-grey-400">Loading…</div>}>
      <RecommendationsContent />
    </Suspense>
  );
}
