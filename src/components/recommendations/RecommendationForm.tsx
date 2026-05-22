'use client';
import { useState } from 'react';
import { policies } from '@/data/policies';
import { POLICY_GAP_INDICATORS, POLICY_GAP_SECTORS } from '@/lib/scenarios/policy-gap';
import {
  type RecommendationDraft,
  type RecommendationStatus,
  EMPTY_DRAFT,
} from '@/lib/useRecommendations';

interface Props {
  initial?: RecommendationDraft;
  onSave: (draft: RecommendationDraft) => Promise<string | null>;
  onCancel: () => void;
  isSaving: boolean;
}

const STATUS_OPTIONS: { value: RecommendationStatus; label: string }[] = [
  { value: 'not-implemented',      label: 'Not implemented' },
  { value: 'partially-implemented', label: 'Partially implemented' },
  { value: 'implemented',           label: 'Implemented' },
  { value: 'ongoing',               label: 'Ongoing' },
];

export default function RecommendationForm({ initial, onSave, onCancel, isSaving }: Props) {
  const [draft, setDraft] = useState<RecommendationDraft>(initial ?? EMPTY_DRAFT);
  const [step, setStep] = useState<1 | 2>(1);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [policySearch, setPolicySearch] = useState('');

  function set<K extends keyof RecommendationDraft>(key: K, value: RecommendationDraft[K]) {
    setDraft(d => ({ ...d, [key]: value }));
  }

  function togglePolicy(id: string) {
    set('policy_ids', draft.policy_ids.includes(id)
      ? draft.policy_ids.filter(p => p !== id)
      : [...draft.policy_ids, id]);
  }

  function toggleIndicator(id: string) {
    set('indicator_ids', draft.indicator_ids.includes(id)
      ? draft.indicator_ids.filter(i => i !== id)
      : [...draft.indicator_ids, id]);
  }

  const step1Valid =
    draft.report_title.trim() !== '' &&
    draft.recommendation_number.trim() !== '' &&
    draft.year > 1990 &&
    draft.short_text.trim() !== '';

  async function handleSave() {
    setSaveError(null);
    const err = await onSave(draft);
    if (err) setSaveError(err);
  }

  const filteredPolicies = policies.filter(p =>
    policySearch === '' ||
    p.short_title.toLowerCase().includes(policySearch.toLowerCase()) ||
    p.domain.toLowerCase().includes(policySearch.toLowerCase())
  );

  return (
    <div className="bg-white border border-grey-200 rounded-lg shadow-sm">
      {/* Step indicator */}
      <div className="flex items-center gap-0 border-b border-grey-200">
        {([1, 2] as const).map(n => (
          <button
            key={n}
            type="button"
            onClick={() => n === 2 ? step1Valid && setStep(2) : setStep(1)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              step === n
                ? 'text-primary border-b-2 border-primary -mb-px bg-white'
                : 'text-grey-500 hover:text-tertiary-dark'
            } ${n === 2 && !step1Valid ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {n === 1 ? 'Step 1 — Details' : 'Step 2 — Connections'}
          </button>
        ))}
      </div>

      <div className="p-6">
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-grey-600 mb-1">Report title <span className="text-accent-red">*</span></label>
                <input
                  type="text"
                  value={draft.report_title}
                  onChange={e => set('report_title', e.target.value)}
                  placeholder="e.g. Annual Report 2024"
                  className="w-full border border-grey-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-grey-600 mb-1">Rec. number <span className="text-accent-red">*</span></label>
                <input
                  type="text"
                  value={draft.recommendation_number}
                  onChange={e => set('recommendation_number', e.target.value)}
                  placeholder="e.g. R1, 2.3"
                  className="w-full border border-grey-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-grey-600 mb-1">Year <span className="text-accent-red">*</span></label>
                <input
                  type="number"
                  value={draft.year}
                  onChange={e => set('year', parseInt(e.target.value) || draft.year)}
                  min={2000}
                  max={2100}
                  className="w-full border border-grey-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-grey-600 mb-1">Category</label>
                <input
                  type="text"
                  value={draft.category}
                  onChange={e => set('category', e.target.value)}
                  placeholder="e.g. Energy transition"
                  className="w-full border border-grey-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-grey-600 mb-1">Status</label>
                <select
                  value={draft.status}
                  onChange={e => set('status', e.target.value as RecommendationStatus)}
                  className="w-full border border-grey-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-white"
                >
                  {STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-grey-600 mb-1">
                Short text <span className="text-accent-red">*</span>
                <span className="font-normal text-grey-400 ml-1">— summary shown on the card (1–2 sentences)</span>
              </label>
              <textarea
                value={draft.short_text}
                onChange={e => set('short_text', e.target.value)}
                rows={2}
                className="w-full border border-grey-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-grey-600 mb-1">Full recommendation text</label>
              <textarea
                value={draft.full_text}
                onChange={e => set('full_text', e.target.value)}
                rows={4}
                placeholder="Full wording as published in the report…"
                className="w-full border border-grey-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-y"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-grey-600 mb-1">Justification</label>
              <textarea
                value={draft.justification}
                onChange={e => set('justification', e.target.value)}
                rows={3}
                placeholder="Why the Board made this recommendation…"
                className="w-full border border-grey-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-y"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-grey-600 mb-1">Progress assessment</label>
              <textarea
                value={draft.assessment}
                onChange={e => set('assessment', e.target.value)}
                rows={3}
                placeholder="How has implementation progressed since the recommendation was made…"
                className="w-full border border-grey-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-y"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-tertiary hover:text-tertiary-dark border border-grey-300 rounded transition-colors">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!step1Valid}
                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next: Connections →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            {/* Policy selector */}
            <div>
              <h3 className="text-sm font-semibold text-tertiary-dark mb-1">Linked policies</h3>
              <p className="text-xs text-grey-500 mb-3">Select all policies this recommendation addresses.</p>
              <input
                type="text"
                placeholder="Search policies…"
                value={policySearch}
                onChange={e => setPolicySearch(e.target.value)}
                className="w-full border border-grey-300 rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
              <div className="max-h-52 overflow-y-auto border border-grey-200 rounded divide-y divide-grey-100">
                {filteredPolicies.map(p => (
                  <label key={p.id} className="flex items-start gap-3 px-3 py-2.5 hover:bg-grey-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.policy_ids.includes(p.id)}
                      onChange={() => togglePolicy(p.id)}
                      className="mt-0.5 accent-primary"
                    />
                    <div className="min-w-0">
                      <p className="text-sm text-tertiary-dark leading-snug">{p.short_title}</p>
                      <p className="text-[11px] text-grey-400 capitalize">{p.domain} · {p.document_type}</p>
                    </div>
                  </label>
                ))}
                {filteredPolicies.length === 0 && (
                  <p className="text-sm text-grey-400 p-3">No policies match.</p>
                )}
              </div>
              {draft.policy_ids.length > 0 && (
                <p className="text-xs text-primary mt-2">{draft.policy_ids.length} selected</p>
              )}
            </div>

            {/* Indicator selector */}
            <div>
              <h3 className="text-sm font-semibold text-tertiary-dark mb-1">Linked indicators</h3>
              <p className="text-xs text-grey-500 mb-3">Select the Policy Gap indicators this recommendation relates to.</p>
              <div className="space-y-3">
                {POLICY_GAP_SECTORS.map(sector => {
                  const sectorInds = POLICY_GAP_INDICATORS.filter(i => i.sector === sector);
                  return (
                    <div key={sector}>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-grey-400 mb-1.5">{sector}</p>
                      <div className="space-y-1">
                        {sectorInds.map(ind => (
                          <label key={ind.id} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-grey-50 cursor-pointer border border-transparent hover:border-grey-200 transition-colors">
                            <input
                              type="checkbox"
                              checked={draft.indicator_ids.includes(ind.id)}
                              onChange={() => toggleIndicator(ind.id)}
                              className="accent-primary"
                            />
                            <span className="text-[10px] font-bold text-grey-500 bg-grey-100 px-1.5 py-0.5 rounded">{ind.code}</span>
                            <span className="text-sm text-tertiary-dark">{ind.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {draft.indicator_ids.length > 0 && (
                <p className="text-xs text-primary mt-2">{draft.indicator_ids.length} selected</p>
              )}
            </div>

            {saveError && (
              <p className="text-sm text-accent-red bg-accent-red/5 border border-accent-red/20 rounded px-3 py-2">{saveError}</p>
            )}

            <div className="flex justify-between gap-3 pt-2">
              <button type="button" onClick={() => setStep(1)} className="px-4 py-2 text-sm text-tertiary hover:text-tertiary-dark border border-grey-300 rounded transition-colors">
                ← Back
              </button>
              <div className="flex gap-3">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-tertiary hover:text-tertiary-dark border border-grey-300 rounded transition-colors">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || !step1Valid}
                  className="px-5 py-2 text-sm font-medium bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? 'Saving…' : 'Save recommendation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
