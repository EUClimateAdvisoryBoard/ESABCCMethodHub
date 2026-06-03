/**
 * Indicator version history / audit log modal.
 * --------------------------------------------
 * Shows the change log for one indicator — every data change recorded in
 * pw_indicator_revisions (who, when, what) — and lets the user restore any
 * archived version ("go back to it"). Backed by:
 *   GET  /api/project-workspace/indicators/[id]/revisions
 *   POST /api/project-workspace/indicators/[id]/revisions/restore
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  pwApi,
  REVISION_ACTION_LABELS,
  type IndicatorRevision,
} from '@/lib/project-workspace/client';

interface Props {
  indicatorId: string;
  indicatorName: string;
  onClose: () => void;
  /** Called after a successful restore so the parent can re-read the data. */
  onRestored: () => void;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function snapshotShape(rev: IndicatorRevision): string {
  if (!rev.snapshot) return '';
  const pts = rev.snapshot.points?.length ?? 0;
  return `${pts} data point${pts === 1 ? '' : 's'}`;
}

export default function IndicatorHistory({
  indicatorId,
  indicatorName,
  onClose,
  onRestored,
}: Props) {
  const [revisions, setRevisions] = useState<IndicatorRevision[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const revs = await pwApi.listIndicatorRevisions(indicatorId);
      setRevisions(revs);
    } catch (e) {
      setError((e as Error).message);
      setRevisions([]);
    }
  }, [indicatorId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRestore(rev: IndicatorRevision) {
    if (!rev.snapshot) return;
    if (
      !window.confirm(
        `Restore “${indicatorName}” to the version from ${formatWhen(rev.changedAt)} ` +
          `by ${rev.changedByName || 'someone'}? The current data will be replaced ` +
          `(this is itself logged, so it can be undone).`
      )
    ) {
      return;
    }
    setRestoringId(rev.id);
    setError(null);
    setNotice(null);
    try {
      await pwApi.restoreIndicatorRevision(indicatorId, rev.id);
      setNotice(`Restored to the version from ${formatWhen(rev.changedAt)}.`);
      await load();
      onRestored();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl border border-grey-200 w-full max-w-2xl max-h-[88vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-grey-200">
          <div>
            <h3 className="text-sm font-bold text-tertiary-dark">
              Version history — {indicatorName}
            </h3>
            <p className="text-[11px] text-tertiary mt-0.5">
              Every change to this indicator’s data is logged with the time and
              the person who made it. Restore any version to roll back.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-tertiary text-sm" aria-label="Close">
            ✕
          </button>
        </div>

        {notice && (
          <div className="mx-4 sm:mx-5 mt-3 text-[11px] px-2 py-1.5 rounded bg-green-50 border border-green-200 text-green-800">
            {notice}
          </div>
        )}
        {error && (
          <div className="mx-4 sm:mx-5 mt-3 text-[11px] px-2 py-1.5 rounded bg-red-50 border border-red-200 text-red-800">
            {error}
          </div>
        )}

        <div className="overflow-y-auto flex-1 px-4 sm:px-5 py-3">
          {revisions === null ? (
            <p className="text-xs text-tertiary-light py-6 text-center">Loading history…</p>
          ) : revisions.length === 0 ? (
            <p className="text-xs text-tertiary-light py-6 text-center">
              No changes recorded yet. Edits made from here on will be archived.
            </p>
          ) : (
            <ol className="relative border-l border-grey-200 ml-2">
              {revisions.map((rev, idx) => (
                <li key={rev.id} className="mb-4 ml-4">
                  <span className="absolute -left-[5px] mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-xs font-semibold text-tertiary-dark">
                        {REVISION_ACTION_LABELS[rev.action] ?? rev.action}
                        {idx === 0 && (
                          <span className="ml-2 text-[9px] uppercase tracking-wide text-primary bg-primary/10 rounded px-1 py-0.5">
                            current
                          </span>
                        )}
                      </p>
                      {rev.summary && (
                        <p className="text-[11px] text-tertiary mt-0.5">{rev.summary}</p>
                      )}
                      <p className="text-[10px] text-tertiary-light mt-0.5">
                        {formatWhen(rev.changedAt)} · {rev.changedByName || 'Unknown'}
                        {snapshotShape(rev) && <> · {snapshotShape(rev)}</>}
                      </p>
                    </div>
                    {rev.snapshot && idx !== 0 && rev.action !== 'delete' && (
                      <button
                        type="button"
                        onClick={() => handleRestore(rev)}
                        disabled={restoringId !== null}
                        className="shrink-0 px-2 py-1 text-[10px] rounded border border-grey-200 text-tertiary-dark hover:bg-grey-50 disabled:opacity-50"
                        title="Replace the current data with this archived version"
                      >
                        {restoringId === rev.id ? 'Restoring…' : 'Restore'}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="px-4 sm:px-5 py-3 border-t border-grey-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md border border-grey-200 text-xs text-tertiary-dark hover:bg-grey-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
