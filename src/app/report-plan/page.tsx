'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import PageHero from '@/components/PageHero';
import {
  listPlans,
  createPlan,
  deletePlan,
  type PlanSummary,
} from '@/lib/report-plans/client';

export default function ReportPlanIndexPage() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await listPlans();
    setPlans(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const plan = await createPlan({
      name: newName.trim(),
      description: newDescription.trim(),
    });
    setCreating(false);
    if (!plan) {
      setToast('Could not create the plan. Try again.');
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setNewName('');
    setNewDescription('');
    setShowCreate(false);
    // Navigate directly into the new plan.
    if (typeof window !== 'undefined') {
      window.location.href = `/report-plan/${encodeURIComponent(plan.id)}`;
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete the plan "${name}"? This cannot be undone.`)) return;
    const ok = await deletePlan(id);
    if (ok) {
      setPlans(prev => prev.filter(p => p.id !== id));
    } else {
      setToast('Could not delete the plan.');
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <PageHero
        title="Report Reference Plan"
        subtitle="Plan a report outline, attach literature to each section, and export a Word document ready for the ESABCC Word add-in."
      >
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreate(v => !v)}
            className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white text-xs rounded"
          >
            {showCreate ? 'Cancel' : '+ New plan'}
          </button>
        </div>
      </PageHero>

      <div className="max-w-[1280px] mx-auto px-3 sm:px-4 py-6">
        {toast && (
          <div className="mb-4 px-4 py-2 bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm rounded-lg">
            {toast}
          </div>
        )}

        {showCreate && (
          <div className="bg-white border border-grey-200 shadow-sm rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Create a new report plan</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-tertiary-dark mb-1">Name *</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Carbon Border Adjustment assessment 2026"
                  className="w-full px-3 py-2 bg-white border border-grey-200 rounded-lg text-tertiary-dark text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-tertiary-dark mb-1">Description</label>
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Optional summary of the report's purpose and audience."
                  className="w-full px-3 py-2 bg-white border border-grey-200 rounded-lg text-tertiary-dark text-sm focus:outline-none focus:border-primary h-20"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:bg-grey-200 text-white text-sm rounded-lg"
                >
                  {creating ? 'Creating…' : 'Create plan'}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 bg-grey-100 hover:bg-grey-200 text-tertiary-dark text-sm rounded-lg border border-grey-200"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-tertiary">
                A new plan starts with the default outline (Introduction, Methodology, Results, Discussion, Conclusion). You can edit sections afterwards.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-tertiary">Loading plans…</div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16 text-tertiary">
            <p className="text-lg mb-2">No report plans yet.</p>
            <p className="text-sm">Click <span className="font-semibold">+ New plan</span> to create your first outline.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map(p => (
              <div
                key={p.id}
                className="bg-white border border-grey-200 rounded-xl p-5 shadow-sm flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/report-plan/${encodeURIComponent(p.id)}`}
                      className="block text-base font-semibold text-tertiary-dark hover:text-primary truncate"
                    >
                      {p.name}
                    </Link>
                    {p.description && (
                      <p className="text-xs text-tertiary mt-1 line-clamp-2">{p.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    className="text-xs text-tertiary hover:text-accent-red"
                    title="Delete plan"
                  >
                    ✕
                  </button>
                </div>
                <div className="text-xs text-tertiary flex flex-wrap gap-x-3 gap-y-1">
                  <span>{p.sectionCount} sections</span>
                  <span>{p.referenceCount} references</span>
                  <span>Updated {new Date(p.updatedAt).toLocaleDateString()}</span>
                </div>
                <Link
                  href={`/report-plan/${encodeURIComponent(p.id)}`}
                  className="mt-2 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white text-xs rounded inline-block self-start"
                >
                  Open →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
