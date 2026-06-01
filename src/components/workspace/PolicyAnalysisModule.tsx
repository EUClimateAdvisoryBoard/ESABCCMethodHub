/**
 * Policy analysis module for the Project Workspace.
 * --------------------------------------------------
 * Mirrors the data shown on the EU Policy Navigator's "Sectoral overview"
 * tab, but adds a review workflow on top: approve / disapprove, fact-check,
 * edit a specific field, or leave a comment. All annotations are stored in
 * `pw_policy_annotations` and re-read by the navigator so changes
 * propagate automatically.
 */
'use client';

import { useMemo, useState } from 'react';
import {
  SECTORS,
  SECTOR_POLICIES,
  type SectorPolicy,
  type SectorId,
} from '@/data/sectoral-policies';
import { pwApi } from '@/lib/project-workspace/client';
import type { PolicyAnnotation } from '@/lib/project-workspace/db';

const KIND_LABELS: Record<PolicyAnnotation['kind'], string> = {
  approve: 'Approved',
  disapprove: 'Flagged',
  'fact-check': 'Fact-check',
  edit: 'Suggested edit',
  comment: 'Comment',
};
const KIND_COLORS: Record<PolicyAnnotation['kind'], string> = {
  approve: 'bg-green-100 text-green-800 border-green-200',
  disapprove: 'bg-red-100 text-red-800 border-red-200',
  'fact-check': 'bg-purple-100 text-purple-800 border-purple-200',
  edit: 'bg-blue-100 text-blue-800 border-blue-200',
  comment: 'bg-grey-100 text-tertiary-dark border-grey-200',
};

const EDITABLE_FIELDS = [
  { id: 'meaning', label: 'Plain-language meaning' },
  { id: 'currentRequirement', label: 'Current requirement' },
  { id: 'futureRequirement', label: 'Future requirement' },
] as const;

interface Props {
  projectId: string;
  initialAnnotations: PolicyAnnotation[];
}

export default function PolicyAnalysisModule({ projectId, initialAnnotations }: Props) {
  const [annotations, setAnnotations] = useState<PolicyAnnotation[]>(initialAnnotations);
  const [sectorFilter, setSectorFilter] = useState<SectorId | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(SECTOR_POLICIES[0]?.id ?? null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    if (sectorFilter === 'all') return SECTOR_POLICIES;
    return SECTOR_POLICIES.filter(p => p.sectors.includes(sectorFilter));
  }, [sectorFilter]);

  const annByPolicy = useMemo(() => {
    const m = new Map<string, PolicyAnnotation[]>();
    for (const a of annotations) {
      const list = m.get(a.policyId) ?? [];
      list.push(a);
      m.set(a.policyId, list);
    }
    return m;
  }, [annotations]);

  async function addAnnotation(
    policyId: string,
    kind: PolicyAnnotation['kind'],
    field: string,
    value: string
  ) {
    setBusy(true);
    try {
      const { annotation } = await pwApi.createPolicyAnnotation({
        projectId,
        policyId,
        kind,
        field,
        value,
      });
      const a: PolicyAnnotation = {
        id: annotation.id,
        projectId,
        policyId,
        kind,
        field,
        value,
        status: 'open',
        createdBy: null,
        createdAt: new Date().toISOString(),
      };
      setAnnotations(prev => [a, ...prev]);
    } finally {
      setBusy(false);
    }
  }

  async function resolveAnnotation(id: string) {
    setBusy(true);
    try {
      await pwApi.patchPolicyAnnotation(id, { status: 'resolved' });
      setAnnotations(prev =>
        prev.map(a => (a.id === id ? { ...a, status: 'resolved' } : a))
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteAnnotation(id: string) {
    setBusy(true);
    try {
      await pwApi.deletePolicyAnnotation(id);
      setAnnotations(prev => prev.filter(a => a.id !== id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-lg font-bold text-tertiary-dark">Policy analysis</h2>
        <p className="text-sm text-tertiary mt-1 max-w-3xl">
          Mirror of the “Sectoral overview” in the EU Policy Navigator. Approve, flag,
          fact-check, suggest edits or comment on individual policy entries.
          Annotations are stored centrally and surface back inside the navigator
          so the Secretariat sees them in context.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSectorFilter('all')}
          className={`text-[11px] px-2 py-1 rounded border ${
            sectorFilter === 'all'
              ? 'bg-primary text-white border-primary'
              : 'border-grey-200 text-tertiary'
          }`}
        >
          All sectors ({SECTOR_POLICIES.length})
        </button>
        {SECTORS.map(s => {
          const count = SECTOR_POLICIES.filter(p => p.sectors.includes(s.id)).length;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSectorFilter(s.id)}
              className={`text-[11px] px-2 py-1 rounded border ${
                sectorFilter === s.id
                  ? 'text-white border-transparent'
                  : 'border-grey-200 text-tertiary'
              }`}
              style={sectorFilter === s.id ? { backgroundColor: s.color } : undefined}
            >
              {s.name} ({count})
            </button>
          );
        })}
      </div>

      <ul className="space-y-3">
        {filtered.map(p => {
          const anns = annByPolicy.get(p.id) ?? [];
          const open = openId === p.id;
          return (
            <li key={p.id} className="bg-white border border-grey-200 rounded-xl">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : p.id)}
                className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-grey-50"
              >
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold">
                    {p.sectors.join(' · ')} · {p.instrumentType}
                  </p>
                  <p className="text-sm font-medium text-tertiary-dark">
                    {p.name}
                    {p.acronym && (
                      <span className="ml-2 text-tertiary-light text-xs">
                        ({p.acronym})
                      </span>
                    )}
                  </p>
                </div>
                {anns.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-grey-200 text-tertiary">
                    {anns.length} annotation{anns.length === 1 ? '' : 's'}
                  </span>
                )}
              </button>
              {open && (
                <PolicyBody
                  policy={p}
                  annotations={anns}
                  busy={busy}
                  onAdd={(kind, field, value) => addAnnotation(p.id, kind, field, value)}
                  onResolve={resolveAnnotation}
                  onDelete={deleteAnnotation}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PolicyBody({
  policy,
  annotations,
  busy,
  onAdd,
  onResolve,
  onDelete,
}: {
  policy: SectorPolicy;
  annotations: PolicyAnnotation[];
  busy: boolean;
  onAdd: (kind: PolicyAnnotation['kind'], field: string, value: string) => void;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editField, setEditField] = useState<string>('meaning');
  const [editValue, setEditValue] = useState('');
  const [factCheck, setFactCheck] = useState('');
  const [comment, setComment] = useState('');

  return (
    <div className="px-4 py-3 border-t border-grey-100 space-y-4 text-xs">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Plain-language meaning">{policy.meaning}</Field>
        <Field label="Current requirement">{policy.currentRequirement}</Field>
        <Field label="Future requirement">{policy.futureRequirement}</Field>
        <Field label="Scope">{policy.scope}</Field>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onAdd('approve', '', '')}
          className="text-[11px] px-2 py-1 rounded border border-green-300 text-green-800 hover:bg-green-50"
        >
          ✓ Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAdd('disapprove', '', '')}
          className="text-[11px] px-2 py-1 rounded border border-red-300 text-red-800 hover:bg-red-50"
        >
          ✗ Disapprove
        </button>
      </div>

      <details className="border border-grey-200 rounded-lg p-2">
        <summary className="text-[11px] font-semibold text-tertiary-dark cursor-pointer">
          Suggest an edit
        </summary>
        <div className="mt-2 space-y-2">
          <label className="block">
            <span className="block mb-1 text-tertiary">Field</span>
            <select
              value={editField}
              onChange={e => setEditField(e.target.value)}
              className="px-2 py-1 border border-grey-200 rounded text-xs"
            >
              {EDITABLE_FIELDS.map(f => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <textarea
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            placeholder="Proposed new text"
            className="w-full h-20 px-2 py-1 border border-grey-200 rounded text-xs"
          />
          <button
            type="button"
            disabled={!editValue || busy}
            onClick={() => {
              onAdd('edit', editField, editValue);
              setEditValue('');
            }}
            className="px-3 py-1 rounded-md bg-primary text-white text-[11px] font-semibold hover:bg-primary-dark disabled:opacity-50"
          >
            Submit edit
          </button>
        </div>
      </details>

      <details className="border border-grey-200 rounded-lg p-2">
        <summary className="text-[11px] font-semibold text-tertiary-dark cursor-pointer">
          Fact-check claim
        </summary>
        <div className="mt-2 space-y-2">
          <textarea
            value={factCheck}
            onChange={e => setFactCheck(e.target.value)}
            placeholder="Claim, source consulted, verdict"
            className="w-full h-20 px-2 py-1 border border-grey-200 rounded text-xs"
          />
          <button
            type="button"
            disabled={!factCheck || busy}
            onClick={() => {
              onAdd('fact-check', '', factCheck);
              setFactCheck('');
            }}
            className="px-3 py-1 rounded-md bg-primary text-white text-[11px] font-semibold hover:bg-primary-dark disabled:opacity-50"
          >
            Submit fact-check
          </button>
        </div>
      </details>

      <details className="border border-grey-200 rounded-lg p-2">
        <summary className="text-[11px] font-semibold text-tertiary-dark cursor-pointer">
          Add comment
        </summary>
        <div className="mt-2 space-y-2">
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Your comment"
            className="w-full h-20 px-2 py-1 border border-grey-200 rounded text-xs"
          />
          <button
            type="button"
            disabled={!comment || busy}
            onClick={() => {
              onAdd('comment', '', comment);
              setComment('');
            }}
            className="px-3 py-1 rounded-md bg-primary text-white text-[11px] font-semibold hover:bg-primary-dark disabled:opacity-50"
          >
            Add comment
          </button>
        </div>
      </details>

      {annotations.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold mb-2">
            Annotations
          </p>
          <ul className="space-y-1.5">
            {annotations.map(a => (
              <li
                key={a.id}
                className={`text-[11px] px-2 py-1 rounded border ${
                  KIND_COLORS[a.kind]
                } ${a.status === 'resolved' ? 'opacity-50 line-through' : ''}`}
              >
                <span className="font-semibold">{KIND_LABELS[a.kind]}</span>
                {a.field && (
                  <span className="ml-1 text-[10px] text-tertiary-dark">({a.field})</span>
                )}
                {a.value && <span className="ml-1">— {a.value}</span>}
                <span className="ml-2 text-[10px] text-tertiary-light">
                  {a.createdAt.slice(0, 10)}
                </span>
                <button
                  type="button"
                  onClick={() => onResolve(a.id)}
                  disabled={busy || a.status === 'resolved'}
                  className="ml-2 text-[10px] underline text-tertiary"
                >
                  resolve
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(a.id)}
                  disabled={busy}
                  className="ml-1 text-[10px] underline text-tertiary"
                >
                  delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-grey-50 rounded p-2">
      <p className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold mb-1">
        {label}
      </p>
      <p className="text-xs text-tertiary-dark leading-snug">{children}</p>
    </div>
  );
}
