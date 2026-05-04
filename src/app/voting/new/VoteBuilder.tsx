'use client';

/**
 * Interactive vote builder. Mirrors the per-system constraints accepted by
 * `validateBallotResponses` so the admin only sees options that actually
 * affect the ballot.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { VoteOption, VoteRecord, VotingSystem } from '@/lib/voting/types';

type Draft = {
  id: string;
  title: string;
  description: string;
  instructions: string;
  votingSystem: VotingSystem;
  isAnonymous: boolean;
  status: 'open' | 'draft' | 'closed';
  closesAt: string;
  options: VoteOption[];
  // Priority ranking
  scoresText: string;             // comma-separated, e.g. "1,2,3"
  capsText: string;               // e.g. "1:3,2:3"
  scoreLabelsText: string;        // e.g. "1:high,2:medium,3:low"
  requireAllScored: boolean;
  // Single / multi
  maxSelections: number;
  // Star
  maxStars: number;
};

const SYSTEMS: { value: VotingSystem; label: string; hint: string }[] = [
  { value: 'priority_ranking', label: 'Priority ranking', hint: 'Assign scores per option (e.g. 1=high, 2=medium, 3=low). Caps per score.' },
  { value: 'single_choice',    label: 'Single choice',    hint: 'Pick exactly one option.' },
  { value: 'multi_choice',     label: 'Multiple choice',  hint: 'Pick up to N options.' },
  { value: 'approval',         label: 'Approval voting',  hint: 'Approve or reject every option.' },
  { value: 'star',             label: 'Star rating',      hint: 'Rate each option from 1..N stars.' },
];

const initial: Draft = {
  id: '',
  title: '',
  description: '',
  instructions: '',
  votingSystem: 'priority_ranking',
  isAnonymous: true,
  status: 'open',
  closesAt: '',
  options: [],
  scoresText: '1,2,3',
  capsText: '1:3,2:3',
  scoreLabelsText: '1:highest priority,2:medium priority,3:lowest priority',
  requireAllScored: true,
  maxSelections: 1,
  maxStars: 5,
};

function parseScores(text: string): number[] {
  return text.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
}

function parseCaps(text: string): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const part of text.split(',')) {
    const t = part.trim();
    if (!t) continue;
    const [k, v] = t.split(':').map((s) => s.trim());
    if (!k) continue;
    out[k] = v === '' || v == null || v.toLowerCase() === 'none' ? null : Number(v);
  }
  return out;
}

function parseLabels(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of text.split(',')) {
    const t = part.trim();
    if (!t) continue;
    const colon = t.indexOf(':');
    if (colon < 0) continue;
    out[t.slice(0, colon).trim()] = t.slice(colon + 1).trim();
  }
  return out;
}

export default function VoteBuilder() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial);
  const [bulkText, setBulkText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = useMemo(() => {
    switch (draft.votingSystem) {
      case 'priority_ranking':
        return {
          scores: parseScores(draft.scoresText),
          maxPerScore: parseCaps(draft.capsText),
          scoreLabels: parseLabels(draft.scoreLabelsText),
          requireAllScored: draft.requireAllScored,
        };
      case 'single_choice':
        return { maxSelections: 1 };
      case 'multi_choice':
        return { maxSelections: Math.max(1, Number(draft.maxSelections) || 1) };
      case 'star':
        return { maxStars: Math.max(2, Number(draft.maxStars) || 5) };
      case 'approval':
      default:
        return {};
    }
  }, [draft]);

  function addOption(label: string, description?: string) {
    const opt: VoteOption = { id: '', label: label.trim(), description: description?.trim() };
    if (!opt.label) return;
    setDraft((d) => ({ ...d, options: [...d.options, opt] }));
  }

  function applyBulk() {
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    setDraft((d) => ({
      ...d,
      options: [...d.options, ...lines.map((l) => ({ id: '', label: l }))],
    }));
    setBulkText('');
  }

  async function save() {
    setError(null);
    if (!draft.title.trim()) {
      setError('Please enter a title.');
      return;
    }
    if (draft.options.length === 0) {
      setError('Please add at least one option.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: Partial<VoteRecord> = {
        id: draft.id.trim() || undefined,
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        instructions: draft.instructions.trim() || undefined,
        votingSystem: draft.votingSystem,
        config,
        options: draft.options,
        isAnonymous: draft.isAnonymous,
        status: draft.status,
        closesAt: draft.closesAt ? new Date(draft.closesAt).toISOString() : undefined,
      };
      const res = await fetch('/api/voting/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Could not save the vote.');
      } else {
        router.push(`/voting/${json.vote.id}`);
      }
    } catch {
      setError('Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const sys = SYSTEMS.find((s) => s.value === draft.votingSystem)!;

  return (
    <div className="space-y-8">
      <Section title="Basics">
        <Field label="Vote ID (optional)" hint="Lowercase letters, numbers and dashes. Leave empty to auto-generate.">
          <input
            type="text"
            value={draft.id}
            onChange={(e) => setDraft({ ...draft, id: e.target.value })}
            className="w-full rounded-sm border border-[#E6E7E8] px-3 py-2 text-[13px] font-mono"
            placeholder="abmeeting38-topical-vote"
          />
        </Field>
        <Field label="Title *">
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="w-full rounded-sm border border-[#E6E7E8] px-3 py-2 text-[14px]"
            placeholder="ABmeeting38 Topical Vote"
          />
        </Field>
        <Field label="Description" hint="Shown to voters above the ballot.">
          <textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className="w-full rounded-sm border border-[#E6E7E8] px-3 py-2 text-[13px] min-h-[60px]"
          />
        </Field>
        <Field label="Instructions" hint="Multi-line; visible only to voters on the ballot page.">
          <textarea
            value={draft.instructions}
            onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
            className="w-full rounded-sm border border-[#E6E7E8] px-3 py-2 text-[13px] min-h-[120px] whitespace-pre-line"
          />
        </Field>
      </Section>

      <Section title="Voting system">
        <div className="grid sm:grid-cols-2 gap-2">
          {SYSTEMS.map((s) => {
            const on = draft.votingSystem === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => setDraft({ ...draft, votingSystem: s.value })}
                className={
                  'text-left p-3 rounded-sm border ' +
                  (on
                    ? 'border-[#00928F] bg-[#E6F5F4]'
                    : 'border-[#E6E7E8] bg-white hover:border-[#00928F]')
                }
              >
                <div className="text-[13.5px] font-semibold text-[#3D5265]">{s.label}</div>
                <div className="text-[12px] text-[#3D5265]/75 mt-0.5">{s.hint}</div>
              </button>
            );
          })}
        </div>

        {draft.votingSystem === 'priority_ranking' && (
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <Field label="Allowed scores" hint="Comma-separated integers; lowest = highest priority.">
              <input
                type="text"
                value={draft.scoresText}
                onChange={(e) => setDraft({ ...draft, scoresText: e.target.value })}
                className="w-full rounded-sm border border-[#E6E7E8] px-3 py-2 font-mono text-[13px]"
              />
            </Field>
            <Field label="Score caps" hint="Format: score:max. Use 'none' or omit for unlimited. e.g. 1:3,2:3">
              <input
                type="text"
                value={draft.capsText}
                onChange={(e) => setDraft({ ...draft, capsText: e.target.value })}
                className="w-full rounded-sm border border-[#E6E7E8] px-3 py-2 font-mono text-[13px]"
              />
            </Field>
            <Field label="Score labels" hint="Optional. Format: score:label, comma-separated.">
              <input
                type="text"
                value={draft.scoreLabelsText}
                onChange={(e) => setDraft({ ...draft, scoreLabelsText: e.target.value })}
                className="w-full rounded-sm border border-[#E6E7E8] px-3 py-2 text-[13px]"
              />
            </Field>
            <Field label="">
              <label className="flex items-center gap-2 text-[13px] mt-7">
                <input
                  type="checkbox"
                  checked={draft.requireAllScored}
                  onChange={(e) => setDraft({ ...draft, requireAllScored: e.target.checked })}
                />
                Require every option to be scored
              </label>
            </Field>
          </div>
        )}

        {draft.votingSystem === 'multi_choice' && (
          <Field label="Max selections" hint="Voters may pick up to this many options.">
            <input
              type="number"
              min={1}
              value={draft.maxSelections}
              onChange={(e) => setDraft({ ...draft, maxSelections: Number(e.target.value) })}
              className="w-32 rounded-sm border border-[#E6E7E8] px-3 py-2 text-[13px]"
            />
          </Field>
        )}

        {draft.votingSystem === 'star' && (
          <Field label="Max stars">
            <input
              type="number"
              min={2}
              value={draft.maxStars}
              onChange={(e) => setDraft({ ...draft, maxStars: Number(e.target.value) })}
              className="w-32 rounded-sm border border-[#E6E7E8] px-3 py-2 text-[13px]"
            />
          </Field>
        )}

        <p className="mt-3 text-[12px] text-[#3D5265]/70">{sys.hint}</p>
      </Section>

      <Section title="Options">
        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder={'Paste one option per line.\nE.g.\nPolicy gap report 2.0\nIndustry transitions\n…'}
          className="w-full rounded-sm border border-[#E6E7E8] px-3 py-2 text-[13px] min-h-[120px] font-mono"
        />
        <button
          type="button"
          onClick={applyBulk}
          className="mt-2 inline-flex items-center px-3 py-1.5 text-[12.5px] font-semibold border border-[#3D5265]/30 text-[#3D5265] rounded-sm hover:border-[#3D5265]"
        >
          Add lines as options
        </button>

        {draft.options.length > 0 && (
          <ul className="mt-4 divide-y divide-[#E6E7E8] border border-[#E6E7E8] rounded-sm bg-white">
            {draft.options.map((o, i) => (
              <li key={i} className="px-3 py-2 flex items-start gap-3">
                <span className="font-mono text-[11px] text-[#8A95A3] tabular-nums w-6 text-right pt-1">{i + 1}</span>
                <input
                  className="flex-1 rounded-sm border border-transparent hover:border-[#E6E7E8] focus:border-[#00928F] px-2 py-1 text-[13px]"
                  value={o.label}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      options: d.options.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                    }))
                  }
                />
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, options: d.options.filter((_, j) => j !== i) }))}
                  className="text-[12px] text-[#B33A3A] hover:underline"
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Privacy & lifecycle">
        <Field label="">
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={draft.isAnonymous}
              onChange={(e) => setDraft({ ...draft, isAnonymous: e.target.checked })}
            />
            Anonymous — admins cannot link a ballot to a specific token / participant
          </label>
        </Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Status">
            <select
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value as Draft['status'] })}
              className="w-full rounded-sm border border-[#E6E7E8] px-3 py-2 text-[13px]"
            >
              <option value="open">Open</option>
              <option value="draft">Draft</option>
              <option value="closed">Closed</option>
            </select>
          </Field>
          <Field label="Closes at" hint="Optional. Local time; converted to UTC on save.">
            <input
              type="datetime-local"
              value={draft.closesAt}
              onChange={(e) => setDraft({ ...draft, closesAt: e.target.value })}
              className="w-full rounded-sm border border-[#E6E7E8] px-3 py-2 text-[13px]"
            />
          </Field>
        </div>
      </Section>

      {error ? <p className="text-[13px] text-[#B33A3A]">{error}</p> : null}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={save}
          disabled={submitting}
          className="inline-flex items-center px-5 py-2.5 text-[13.5px] font-semibold text-white bg-[#00928F] rounded-sm hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save vote'}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-[#E6E7E8] bg-white p-4 sm:p-5">
      <h2 className="text-[13.5px] font-mono uppercase tracking-[0.12em] text-[#3D5265]/70 mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      {label ? <span className="block text-[12.5px] font-semibold text-[#3D5265] mb-1">{label}</span> : null}
      {children}
      {hint ? <span className="block text-[11.5px] text-[#3D5265]/60 mt-1">{hint}</span> : null}
    </label>
  );
}
