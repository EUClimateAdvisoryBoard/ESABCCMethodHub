'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { policies } from '@/data/policies';
import {
  useConnectionOverrides,
  type EnrichedConnection,
  type VerificationStatus,
} from '@/lib/useConnectionOverrides';

interface Assignee {
  id: string;
  name: string;
}
import {
  CONNECTION_TYPE_LIST,
  getConnectionType,
  type ConnectionTypeId,
} from '@/lib/connectionTypes';
import type { CitationCheck, CitationValidationResult } from '@/lib/validateArticleCitations';
import ChangeHistory from './ChangeHistory';

interface ValidationSide {
  policyId: string;
  found: boolean;
  result: CitationValidationResult | null;
}

interface ValidationPayload {
  source: ValidationSide;
  target: ValidationSide;
}

/**
 * Excel-style review table for the Policy Navigator.
 *
 * Every connection that ships in the code base starts life as a "Pending"
 * auto-imported row. A human reviewer uses this table to approve, edit or
 * reject those proposals — nothing shows up as a definitive relationship on
 * the map until somebody has signed off on it. This is the "track changes"
 * view: rows carry a visible status badge plus a reviewer stamp once a
 * decision is made.
 *
 * Chunk 1: filter chips, search, status badges, approve/reject/needs-info
 * buttons. Inline editing + the "add new connection" row land in follow-up
 * chunks.
 */

type FilterKey = VerificationStatus | 'all' | 'edited' | 'user_added';

const FILTERS: { key: FilterKey; label: string; hint: string }[] = [
  { key: 'all', label: 'All', hint: 'Every connection in the dataset' },
  { key: 'unverified', label: 'Pending', hint: 'Auto-imported, waiting on a human' },
  { key: 'verified', label: 'Approved', hint: 'A human has confirmed the link' },
  { key: 'needs_review', label: 'Needs more info', hint: 'A reviewer flagged this to revisit' },
  { key: 'rejected', label: 'Rejected', hint: 'Marked as wrong or out of scope' },
  { key: 'edited', label: 'Edited', hint: 'Contents changed vs the imported version' },
  { key: 'user_added', label: 'User added', hint: 'Created manually in this browser' },
];

const STATUS_STYLES: Record<
  VerificationStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  unverified: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-400' },
  verified: { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  rejected: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  needs_review: { label: 'Needs info', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
};

export default function ConnectionsReviewTable() {
  const { displayName, user } = useAuth();
  const {
    enrichedConnections,
    setVerification,
    bulkSetVerification,
    verificationCounts,
    saveOverride,
    clearOverride,
    addConnection,
    updateAddedConnection,
    deleteAddedConnection,
    setAssignee,
    clearAssignee,
  } = useConnectionOverrides();

  const [filter, setFilter] = useState<FilterKey>('unverified');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [addingOpen, setAddingOpen] = useState(false);
  const [assignees, setAssignees] = useState<Assignee[]>([]);

  useEffect(() => {
    if (!user) return;
    import('@/lib/supabase').then(async ({ supabase }) => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      fetch('/api/connections/assignees', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.assignees) setAssignees(d.assignees); })
        .catch(() => {});
    });
  }, [user]);

  const reviewerName = displayName || user?.email || 'Anonymous reviewer';
  const reviewerUserId = user?.id ?? null;

  /**
   * Persist an edit to a single field. User-added connections mutate the
   * `added` list directly; base connections are stored as overrides on top
   * of the shipped dataset.
   */
  const patchConnection = useCallback(
    (c: EnrichedConnection, field: 'connection_type' | 'description' | 'articles_source' | 'articles_target', value: string) => {
      const normalised = field === 'articles_source' || field === 'articles_target'
        ? (value.trim() || null)
        : value;
      if (c.isUserAdded) {
        updateAddedConnection(c.id, { [field]: normalised } as Partial<EnrichedConnection>);
        return;
      }
      saveOverride(c.id, {
        connection_type: field === 'connection_type' ? (value as ConnectionTypeId) : (c.connection_type as ConnectionTypeId),
        description: field === 'description' ? value : c.description,
        articles_source: field === 'articles_source' ? (value.trim() || null) : c.articles_source,
        articles_target: field === 'articles_target' ? (value.trim() || null) : c.articles_target,
      });
    },
    [saveOverride, updateAddedConnection],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enrichedConnections.filter(c => {
      if (filter === 'edited' && !c.isEdited) return false;
      if (filter === 'user_added' && !c.isUserAdded) return false;
      if (
        filter !== 'all' &&
        filter !== 'edited' &&
        filter !== 'user_added' &&
        c.verification.status !== filter
      ) {
        return false;
      }
      if (!q) return true;
      const hay = (
        (c.source_title || c.source_policy_id) +
        ' ' +
        (c.target_title || c.target_policy_id) +
        ' ' +
        c.connection_type +
        ' ' +
        (c.description || '') +
        ' ' +
        (c.articles_source || '') +
        ' ' +
        (c.articles_target || '')
      ).toLowerCase();
      return hay.includes(q);
    });
  }, [enrichedConnections, filter, query]);

  const total = enrichedConnections.length;
  const approved = verificationCounts.verified;
  const pending = verificationCounts.unverified;
  const rejected = verificationCounts.rejected;
  const needsReview = verificationCounts.needs_review;

  const decide = (c: EnrichedConnection, status: VerificationStatus) => {
    setVerification(c.id, {
      status,
      reviewerName,
      reviewerUserId,
    });
  };

  return (
    <div className="bg-white rounded border border-grey-200 shadow-sm overflow-hidden">
      {/* Header — explainer + counts */}
      <div className="px-4 sm:px-5 py-4 border-b border-grey-200 bg-grey-50/60">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-tertiary-dark">
              Review &amp; approve connections
            </h2>
            <p className="text-[12px] text-tertiary mt-1 max-w-3xl leading-relaxed">
              Every link on the policy map starts as an <strong>auto-imported proposal</strong>.
              A human reviewer has to confirm that the two policies really are connected, that
              the relationship type is right, and that the rationale holds. Approve, reject,
              or flag for more info — the map updates immediately.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] sm:text-xs text-tertiary">
            <Stat tone="emerald" n={approved} label="Approved" />
            <Stat tone="amber" n={pending} label="Pending" />
            <Stat tone="blue" n={needsReview} label="Needs info" />
            <Stat tone="red" n={rejected} label="Rejected" />
            <Stat tone="grey" n={total} label="Total" />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                title={f.hint}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                  active
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-tertiary border-grey-200 hover:border-primary'
                }`}
                aria-pressed={active}
              >
                {f.label}
              </button>
            );
          })}
          <div className="flex flex-1 min-w-0 items-center gap-2 sm:ml-auto sm:flex-none">
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search connections, policies, articles…"
              className="px-2.5 py-1 text-[12px] border border-grey-200 rounded w-full sm:w-[240px] focus:border-secondary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setAddingOpen(v => !v)}
              className="text-[11.5px] font-semibold px-2.5 py-1 rounded bg-secondary text-white hover:bg-primary inline-flex items-center gap-1"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {addingOpen ? 'Close form' : 'Add connection'}
            </button>
          </div>
        </div>

        {/* Bulk action bar — only visible when rows are selected */}
        {selectedIds.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 bg-primary/5 border border-primary/20 rounded px-3 py-2 text-[11.5px]">
            <span className="font-semibold text-primary">
              {selectedIds.size} selected
            </span>
            <span className="text-tertiary">·</span>
            <button
              type="button"
              onClick={() => {
                bulkSetVerification(Array.from(selectedIds), {
                  status: 'verified',
                  reviewerName,
                  reviewerUserId,
                });
                setSelectedIds(new Set());
              }}
              className="text-emerald-700 hover:text-emerald-900 font-semibold"
            >
              Approve all
            </button>
            <button
              type="button"
              onClick={() => {
                bulkSetVerification(Array.from(selectedIds), {
                  status: 'needs_review',
                  reviewerName,
                  reviewerUserId,
                });
                setSelectedIds(new Set());
              }}
              className="text-blue-700 hover:text-blue-900 font-semibold"
            >
              Flag — needs info
            </button>
            <button
              type="button"
              onClick={() => {
                bulkSetVerification(Array.from(selectedIds), {
                  status: 'rejected',
                  reviewerName,
                  reviewerUserId,
                });
                setSelectedIds(new Set());
              }}
              className="text-red-700 hover:text-red-900 font-semibold"
            >
              Reject all
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="ml-auto text-tertiary hover:text-tertiary-dark underline underline-offset-2"
            >
              Clear selection
            </button>
          </div>
        )}
      </div>

      {/* Add-new-connection form */}
      {addingOpen && (
        <AddConnectionForm
          onCancel={() => setAddingOpen(false)}
          onCreate={async draft => {
            const created = await addConnection(draft);
            // Mark the freshly added row as "approved by the creator" — they
            // explicitly asserted the relationship when they created it.
            await setVerification(created.id, {
              status: 'verified',
              reviewerName,
              reviewerUserId,
              reviewerNote: 'Created by reviewer',
            });
            setAddingOpen(false);
            setFilter('user_added');
          }}
        />
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead className="bg-grey-50 text-[10px] uppercase tracking-wider text-tertiary-light">
            <tr>
              <Th className="w-[30px]">
                <input
                  type="checkbox"
                  aria-label="Select all visible rows"
                  checked={
                    filtered.length > 0 &&
                    filtered.every(c => selectedIds.has(c.id))
                  }
                  onChange={e => {
                    if (e.target.checked) {
                      setSelectedIds(new Set(filtered.map(c => c.id)));
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                />
              </Th>
              <Th className="w-[110px]">Status</Th>
              <Th>Source → Target</Th>
              <Th className="w-[130px]">Type</Th>
              <Th className="min-w-[260px]">Description</Th>
              <Th className="w-[150px]">Articles (src / tgt)</Th>
              <Th className="w-[140px]">Reviewer</Th>
              <Th className="w-[190px] text-right pr-4">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-tertiary text-[12px]">
                  No connections match this view.
                </td>
              </tr>
            )}
            {filtered.map(c => (
              <Row
                key={c.id}
                connection={c}
                selected={selectedIds.has(c.id)}
                onToggleSelect={() => {
                  setSelectedIds(prev => {
                    const next = new Set(prev);
                    next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                    return next;
                  });
                }}
                onApprove={() => decide(c, 'verified')}
                onReject={() => decide(c, 'rejected')}
                onNeedsInfo={() => decide(c, 'needs_review')}
                onResetReview={() => decide(c, 'unverified')}
                onPatch={(field, value) => patchConnection(c, field, value)}
                onRevertEdit={() => {
                  if (!c.isUserAdded) clearOverride(c.id);
                }}
                onDelete={() => {
                  if (c.isUserAdded) deleteAddedConnection(c.id);
                }}
                onAssign={(userId, userName) => setAssignee(c.id, userName, userId)}
                onClearAssign={() => clearAssignee(c.id)}
                assignees={assignees}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`text-left font-semibold px-3 py-2 border-b border-grey-200 ${className}`}
      scope="col"
    >
      {children}
    </th>
  );
}

function Stat({
  n,
  label,
  tone,
}: {
  n: number;
  label: string;
  tone: 'emerald' | 'amber' | 'blue' | 'red' | 'grey';
}) {
  const map = {
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    blue: 'text-blue-700',
    red: 'text-red-700',
    grey: 'text-tertiary-dark',
  } as const;
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className={`font-bold ${map[tone]}`}>{n}</span>
      <span>{label}</span>
    </span>
  );
}

function Row({
  connection,
  selected,
  onToggleSelect,
  onApprove,
  onReject,
  onNeedsInfo,
  onResetReview,
  onPatch,
  onRevertEdit,
  onDelete,
  onAssign,
  onClearAssign,
  assignees,
}: {
  connection: EnrichedConnection;
  selected: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
  onNeedsInfo: () => void;
  onResetReview: () => void;
  onPatch: (
    field: 'connection_type' | 'description' | 'articles_source' | 'articles_target',
    value: string,
  ) => void;
  onRevertEdit: () => void;
  onDelete: () => void;
  onAssign: (userId: string, userName: string) => void;
  onClearAssign: () => void;
  assignees: Assignee[];
}) {
  const style = STATUS_STYLES[connection.verification.status];
  const typeDef = getConnectionType(connection.connection_type);
  const [expanded, setExpanded] = useState(false);

  const [validation, setValidation] = useState<ValidationPayload | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const runValidation = useCallback(async () => {
    setValidating(true);
    setValidationError(null);
    try {
      const res = await fetch('/api/connections/validate-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePolicyId: connection.source_policy_id,
          sourceArticles: connection.articles_source ?? '',
          targetPolicyId: connection.target_policy_id,
          targetArticles: connection.articles_target ?? '',
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setValidationError(body?.error || `HTTP ${res.status}`);
        return;
      }
      const body = (await res.json()) as ValidationPayload;
      setValidation(body);
    } catch (e) {
      setValidationError((e as Error).message);
    } finally {
      setValidating(false);
    }
  }, [connection.source_policy_id, connection.articles_source, connection.target_policy_id, connection.articles_target]);

  const reviewedAt = connection.verification.reviewedAt
    ? new Date(connection.verification.reviewedAt)
    : null;

  return (
    <tr
      className={`border-b border-grey-100 align-top transition ${
        selected ? 'bg-primary/5' : 'hover:bg-grey-50/50'
      }`}
    >
      <td className="px-3 py-2 align-middle">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          aria-label={`Select connection ${connection.id}`}
        />
      </td>
      <td className="px-3 py-2">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${style.bg} ${style.text}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
          {style.label}
        </span>
        {connection.isEdited && (
          <div className="mt-1 text-[9px] uppercase tracking-wider text-amber-700">
            Edited
          </div>
        )}
        {connection.isUserAdded && (
          <div className="mt-1 text-[9px] uppercase tracking-wider text-secondary">
            User added
          </div>
        )}
      </td>

      <td className="px-3 py-2">
        <div className="font-semibold text-tertiary-dark leading-snug">
          {connection.source_title || connection.source_policy_id}
        </div>
        <div className="text-tertiary-light text-[11px]">↓</div>
        <div className="font-semibold text-tertiary-dark leading-snug">
          {connection.target_title || connection.target_policy_id}
        </div>
      </td>

      <td className="px-3 py-2">
        <select
          value={connection.connection_type}
          onChange={e => onPatch('connection_type', e.target.value)}
          title={typeDef?.summary}
          className={`w-full text-[10.5px] font-semibold px-1.5 py-0.5 rounded border focus:outline-none focus:border-secondary cursor-pointer ${
            typeDef ? `${typeDef.badge.bg} ${typeDef.badge.text} ${typeDef.badge.border}` : ''
          }`}
        >
          {CONNECTION_TYPE_LIST.map(t => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </td>

      <td className="px-3 py-2 text-tertiary-dark leading-snug">
        <EditableText
          value={connection.description || ''}
          placeholder="No rationale recorded. Click to add one."
          expanded={expanded}
          onToggleExpand={() => setExpanded(v => !v)}
          onCommit={value => onPatch('description', value)}
          multiline
        />
        {typeDef && expanded && (
          <p className="mt-2 text-[10.5px] text-tertiary italic leading-relaxed">
            <span className="uppercase tracking-wider not-italic font-semibold text-tertiary-dark">
              When to use {typeDef.label.toLowerCase()}:{' '}
            </span>
            {typeDef.criteria}
          </p>
        )}
      </td>

      <td className="px-3 py-2 text-[11px] text-tertiary">
        <div className="flex items-baseline gap-1">
          <span className="text-tertiary-light w-6 shrink-0">src</span>
          <EditableText
            value={connection.articles_source || ''}
            placeholder="e.g. Art. 9"
            onCommit={value => onPatch('articles_source', value)}
          />
        </div>
        <CitationBadges side={validation?.source} />
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-tertiary-light w-6 shrink-0">tgt</span>
          <EditableText
            value={connection.articles_target || ''}
            placeholder="e.g. Art. 3(1)"
            onCommit={value => onPatch('articles_target', value)}
          />
        </div>
        <CitationBadges side={validation?.target} />
        {(connection.articles_source || connection.articles_target) && (
          <button
            type="button"
            onClick={runValidation}
            disabled={validating}
            title="Check whether each cited article exists in the referenced policy text"
            className="mt-1 text-[10px] text-secondary hover:text-secondary-dark underline underline-offset-2 disabled:text-tertiary-light disabled:no-underline">
            {validating ? 'Validating…' : 'Validate citations'}
          </button>
        )}
        {validationError && (
          <div className="mt-1 text-[10px] text-red-600">{validationError}</div>
        )}
      </td>

      <td className="px-3 py-2 text-[11px] text-tertiary">
        {connection.verification.reviewerName ? (
          <>
            <div className="font-medium text-tertiary-dark truncate max-w-[130px]">
              {connection.verification.reviewerName}
            </div>
            {reviewedAt && (
              <div className="text-tertiary-light">
                {reviewedAt.toLocaleDateString()}{' '}
                {reviewedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </>
        ) : (
          <span className="italic text-tertiary-light">Not reviewed</span>
        )}
      </td>

      <td className="px-3 py-2 text-right pr-4">
        <div className="inline-flex items-center gap-1 flex-wrap justify-end">
          <ActionButton
            tone="emerald"
            active={connection.verification.status === 'verified'}
            onClick={onApprove}
            title="Approve this connection"
          >
            Approve
          </ActionButton>
          <ActionButton
            tone="blue"
            active={connection.verification.status === 'needs_review'}
            onClick={onNeedsInfo}
            title="Flag for more information"
          >
            Needs info
          </ActionButton>
          <ActionButton
            tone="red"
            active={connection.verification.status === 'rejected'}
            onClick={onReject}
            title="Reject — this connection is wrong or out of scope"
          >
            Reject
          </ActionButton>
          {connection.verification.status !== 'unverified' && (
            <button
              type="button"
              onClick={onResetReview}
              title="Undo the review decision"
              className="text-[10.5px] text-tertiary hover:text-tertiary-dark underline underline-offset-2 ml-1"
            >
              Undo
            </button>
          )}
          <ChangeHistory artefactKind="connection" artefactId={String(connection.id)} className="ml-1" />
          <AssignToButton
            current={connection.assignment}
            assignees={assignees}
            onAssign={onAssign}
            onClear={onClearAssign}
          />
          {connection.isEdited && !connection.isUserAdded && (
            <button
              type="button"
              onClick={onRevertEdit}
              title="Restore the original imported values"
              className="text-[10.5px] text-amber-700 hover:text-amber-900 underline underline-offset-2 ml-1"
            >
              Revert edits
            </button>
          )}
          {connection.isUserAdded && (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.confirm('Delete this connection?')) {
                  onDelete();
                }
              }}
              title="Delete this user-added connection"
              className="text-[10.5px] text-red-700 hover:text-red-900 underline underline-offset-2 ml-1"
            >
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/**
 * Excel-style cell that flips between a plain text view and an editable
 * input on click. Committing the value (blur, Enter for inputs, Cmd/Ctrl+
 * Enter for textareas) calls `onCommit`; Escape reverts.
 */
function EditableText({
  value,
  placeholder,
  onCommit,
  multiline = false,
  expanded,
  onToggleExpand,
}: {
  value: string;
  placeholder?: string;
  onCommit: (next: string) => void;
  multiline?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    const commit = () => {
      setEditing(false);
      if (draft !== value) onCommit(draft);
    };
    const cancel = () => {
      setEditing(false);
      setDraft(value);
    };
    const baseClass =
      'w-full text-[12px] border border-secondary rounded px-2 py-1 focus:outline-none';
    if (multiline) {
      return (
        <textarea
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Escape') cancel();
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit();
          }}
          rows={5}
          className={baseClass + ' leading-relaxed'}
          placeholder={placeholder}
        />
      );
    }
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Escape') cancel();
          if (e.key === 'Enter') commit();
        }}
        className={baseClass}
        placeholder={placeholder}
      />
    );
  }

  const displayValue = value || '';
  const isEmpty = displayValue.trim().length === 0;

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className={`text-left w-full rounded px-1 -mx-1 transition hover:bg-amber-50 focus:outline-none focus:bg-amber-50 ${
          isEmpty ? 'italic text-tertiary-light' : 'text-tertiary-dark'
        } ${multiline && !expanded ? 'line-clamp-3' : ''}`}
        title="Click to edit"
      >
        {isEmpty ? placeholder || 'Click to edit' : displayValue}
      </button>
      {multiline && !isEmpty && onToggleExpand && (
        <button
          type="button"
          onClick={onToggleExpand}
          className="text-[10.5px] text-secondary hover:underline mt-0.5"
        >
          {expanded ? 'Show less' : 'Show full rationale'}
        </button>
      )}
    </div>
  );
}

/**
 * Compact "new connection" form — two policy pickers, type dropdown,
 * rationale textarea, article refs. Lives in the table header so new
 * connections land as a user-added row the creator immediately owns.
 */
function AddConnectionForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (draft: {
    source_policy_id: string;
    target_policy_id: string;
    connection_type: ConnectionTypeId;
    description: string;
    articles_source: string | null;
    articles_target: string | null;
  }) => void;
}) {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [type, setType] = useState<ConnectionTypeId>('complements');
  const [description, setDescription] = useState('');
  const [articlesSource, setArticlesSource] = useState('');
  const [articlesTarget, setArticlesTarget] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!sourceId || !targetId) {
      setError('Pick both a source and a target policy.');
      return;
    }
    if (sourceId === targetId) {
      setError('A connection needs two distinct policies.');
      return;
    }
    if (description.trim().length < 10) {
      setError('Write at least one sentence explaining why these two policies are connected.');
      return;
    }
    onCreate({
      source_policy_id: sourceId,
      target_policy_id: targetId,
      connection_type: type,
      description: description.trim(),
      articles_source: articlesSource.trim() || null,
      articles_target: articlesTarget.trim() || null,
    });
  };

  const typeDef = getConnectionType(type);

  return (
    <div className="px-4 sm:px-5 py-4 border-b border-grey-200 bg-amber-50/30">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-[13px] font-bold text-tertiary-dark">Add a new connection</h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-[11px] text-tertiary hover:text-tertiary-dark underline underline-offset-2"
        >
          Cancel
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <PolicyPicker
          label="Source policy"
          value={sourceId}
          onChange={setSourceId}
          excludeId={targetId}
        />
        <PolicyPicker
          label="Target policy"
          value={targetId}
          onChange={setTargetId}
          excludeId={sourceId}
        />
        <div>
          <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-tertiary mb-1">
            Connection type
          </label>
          <select
            value={type}
            onChange={e => setType(e.target.value as ConnectionTypeId)}
            className="w-full px-2.5 py-1.5 border border-grey-300 rounded text-[12px] focus:border-secondary focus:outline-none bg-white"
          >
            {CONNECTION_TYPE_LIST.map(t => (
              <option key={t.id} value={t.id}>
                {t.label} — {t.summary}
              </option>
            ))}
          </select>
          {typeDef && (
            <p className="text-[10.5px] text-tertiary mt-1 leading-relaxed">
              <span className="font-semibold text-tertiary-dark">When to use: </span>
              {typeDef.criteria}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-tertiary mb-1">
              Articles (source)
            </label>
            <input
              value={articlesSource}
              onChange={e => setArticlesSource(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-grey-300 rounded text-[12px] focus:border-secondary focus:outline-none"
              placeholder="e.g. Art. 9"
            />
          </div>
          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-tertiary mb-1">
              Articles (target)
            </label>
            <input
              value={articlesTarget}
              onChange={e => setArticlesTarget(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-grey-300 rounded text-[12px] focus:border-secondary focus:outline-none"
              placeholder="e.g. Art. 3(1)"
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-tertiary mb-1">
            Why are these connected?
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full px-2.5 py-1.5 border border-grey-300 rounded text-[12px] leading-relaxed focus:border-secondary focus:outline-none"
            placeholder="One or two sentences explaining the link — what the source does to or with the target, and which provisions back the claim."
          />
        </div>
      </div>
      {error && (
        <p className="text-[11px] text-red-700 mt-2">{error}</p>
      )}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-[11.5px] px-3 py-1.5 border border-grey-300 rounded text-tertiary-dark hover:bg-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          className="text-[11.5px] px-3 py-1.5 bg-primary text-white rounded hover:bg-[#006F6C] font-semibold"
        >
          Add &amp; approve
        </button>
      </div>
    </div>
  );
}

function PolicyPicker({
  label,
  value,
  onChange,
  excludeId,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  excludeId?: string;
}) {
  return (
    <div>
      <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-tertiary mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 border border-grey-300 rounded text-[12px] focus:border-secondary focus:outline-none bg-white"
      >
        <option value="">Select a policy…</option>
        {policies
          .filter(p => p.id !== excludeId)
          .slice()
          .sort((a, b) => a.short_title.localeCompare(b.short_title))
          .map(p => (
            <option key={p.id} value={p.id}>
              {p.short_title}
            </option>
          ))}
      </select>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  tone,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone: 'emerald' | 'blue' | 'red';
  active: boolean;
  title: string;
}) {
  const base =
    'text-[10.5px] font-semibold px-2 py-1 rounded border transition focus:outline-none focus:ring-1';
  const tones = {
    emerald: active
      ? 'bg-emerald-600 text-white border-emerald-600'
      : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50',
    blue: active
      ? 'bg-blue-600 text-white border-blue-600'
      : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50',
    red: active
      ? 'bg-red-600 text-white border-red-600'
      : 'bg-white text-red-700 border-red-200 hover:bg-red-50',
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`${base} ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

function AssignToButton({
  current,
  assignees,
  onAssign,
  onClear,
}: {
  current: { assigneeName: string } | null;
  assignees: Assignee[];
  onAssign: (id: string, name: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (current) {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] text-violet-700 ml-1">
        <span title={`Assigned to ${current.assigneeName}`}>→ {current.assigneeName}</span>
        <button
          type="button"
          onClick={onClear}
          title="Remove assignment"
          className="text-tertiary hover:text-red-600 leading-none"
        >
          ×
        </button>
      </span>
    );
  }

  return (
    <div ref={ref} className="relative inline-block ml-1">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        title="Assign this connection to a reviewer"
        className="text-[10.5px] text-tertiary hover:text-tertiary-dark underline underline-offset-2"
      >
        Assign to
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-grey-200 rounded shadow-lg min-w-[160px] max-h-52 overflow-y-auto">
          {assignees.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-tertiary italic">No users found.</p>
          ) : (
            assignees.map(a => (
              <button
                key={a.id}
                type="button"
                className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-grey-50 text-tertiary-dark"
                onClick={() => { onAssign(a.id, a.name); setOpen(false); }}
              >
                {a.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Render the per-citation result of an article-citation validation pass.
 * Shows a one-line "✓ N · ✗ M" summary plus a badge for each individual
 * article reference. Empty results render nothing — citation editing in
 * progress shouldn't see stale validation hints.
 */
function CitationBadges({ side }: { side?: ValidationSide }) {
  if (!side) return null;
  if (!side.found) {
    return (
      <div className="mt-0.5 text-[10px] text-tertiary italic">
        Policy text not cached — citation validation skipped.
      </div>
    );
  }
  const result = side.result;
  if (!result || result.citations.length === 0) return null;
  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-1">
      <span className="text-[10px] text-tertiary tabular-nums">
        <span className="text-emerald-700">✓ {result.validCount}</span>
        {result.notFoundCount > 0 && (
          <span className="ml-1 text-red-700">✗ {result.notFoundCount}</span>
        )}
        {result.unparseableCount > 0 && (
          <span className="ml-1 text-tertiary">? {result.unparseableCount}</span>
        )}
      </span>
      {result.citations.map((c: CitationCheck, i: number) => {
        const cls =
          c.status === 'valid'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : c.status === 'not-found'
            ? 'bg-red-50 text-red-700 border-red-200'
            : 'bg-grey-100 text-tertiary border-grey-200';
        const title =
          c.status === 'valid'
            ? c.snippet || 'Article anchor found in policy text.'
            : c.status === 'not-found'
            ? 'Article number not found in the policy text — citation likely incorrect.'
            : 'Could not parse this citation fragment.';
        return (
          <span
            key={i}
            title={title}
            className={`text-[9.5px] font-mono px-1 py-0 rounded border ${cls}`}>
            {c.ref || c.raw}
          </span>
        );
      })}
    </div>
  );
}
