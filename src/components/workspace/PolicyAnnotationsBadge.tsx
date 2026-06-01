/**
 * Read-only annotations badge shown inside the EU Policy Navigator's
 * "Sectoral overview" tab. Pulls every annotation for a given policy
 * from /api/project-workspace/policy-annotations so edits made inside
 * the workspace surface in the navigator without manual reconciliation.
 *
 * Renders nothing while loading or when there are no annotations.
 */
'use client';

import { useEffect, useState } from 'react';

interface Annotation {
  id: string;
  policyId: string;
  projectId: string;
  kind: 'approve' | 'disapprove' | 'fact-check' | 'edit' | 'comment';
  field: string;
  value: string;
  status: 'open' | 'resolved';
  promotedAt: string | null;
  createdAt: string;
}

const KIND_COLORS: Record<Annotation['kind'], string> = {
  approve: 'bg-green-100 text-green-800 border-green-200',
  disapprove: 'bg-red-100 text-red-800 border-red-200',
  'fact-check': 'bg-purple-100 text-purple-800 border-purple-200',
  edit: 'bg-blue-100 text-blue-800 border-blue-200',
  comment: 'bg-grey-100 text-tertiary-dark border-grey-200',
};
const KIND_LABELS: Record<Annotation['kind'], string> = {
  approve: 'Approved',
  disapprove: 'Flagged',
  'fact-check': 'Fact-check',
  edit: 'Suggested edit',
  comment: 'Comment',
};

export default function PolicyAnnotationsPanel({ policyId }: { policyId: string }) {
  const [items, setItems] = useState<Annotation[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/project-workspace/policy-annotations?policyId=${encodeURIComponent(policyId)}`)
      .then(r => (r.ok ? r.json() : { annotations: [] }))
      .then(d => {
        if (!cancelled) setItems(d.annotations ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [policyId]);

  if (!items || items.length === 0) return null;

  const open = items.filter(a => a.status === 'open');
  return (
    <div className="bg-white border border-grey-200 rounded p-3">
      <p className="text-[10px] uppercase tracking-wide text-secondary font-bold mb-2">
        Project Workspace annotations ({open.length} open)
      </p>
      <ul className="space-y-1.5">
        {items.map(a => (
          <li
            key={a.id}
            className={`text-[11px] px-2 py-1 rounded border ${KIND_COLORS[a.kind]} ${
              a.status === 'resolved' ? 'opacity-50 line-through' : ''
            }`}
          >
            <span className="font-semibold">{KIND_LABELS[a.kind]}</span>
            {a.field && (
              <span className="ml-1 text-[10px] text-tertiary-dark">({a.field})</span>
            )}
            {a.value && <span className="ml-1">— {a.value}</span>}
            {a.promotedAt && (
              <span className="ml-2 text-[9px] font-semibold uppercase tracking-wide text-blue-700 bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded-full">
                Canonical
              </span>
            )}
            <span className="ml-2 text-[10px] text-tertiary-light">
              {a.createdAt.slice(0, 10)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
