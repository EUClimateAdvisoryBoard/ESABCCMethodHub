'use client';
import { useEffect, useState } from 'react';
import { CONNECTION_TYPE_LIST, getConnectionType, type ConnectionTypeId } from '@/lib/connectionTypes';
import { useConnectionOverrides } from '@/lib/useConnectionOverrides';
import type { PolicyConnection } from '@/lib/types';

interface Props {
  connection: PolicyConnection & {
    source_title?: string;
    target_title?: string;
    isEdited?: boolean;
  };
  onClose: () => void;
}

/**
 * Modal form for editing an existing connection. Writes the edited fields to
 * localStorage via `useConnectionOverrides.saveOverride` — the base dataset is
 * never mutated. Users can also clear their override to restore the original
 * values.
 */
export default function EditConnectionModal({ connection, onClose }: Props) {
  const { saveOverride, clearOverride, overrides } = useConnectionOverrides();
  const existingPatch = overrides[String(connection.id)];

  const [type, setType] = useState<ConnectionTypeId>(connection.connection_type as ConnectionTypeId);
  const [description, setDescription] = useState(connection.description || '');
  const [articlesSource, setArticlesSource] = useState(connection.articles_source || '');
  const [articlesTarget, setArticlesTarget] = useState(connection.articles_target || '');

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    document.body.classList.add('scroll-locked');
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.classList.remove('scroll-locked');
    };
  }, [onClose]);

  const typeDef = getConnectionType(type);

  const handleSave = async () => {
    const before = {
      connection_type: connection.connection_type,
      description: connection.description || '',
      articles_source: connection.articles_source || null,
      articles_target: connection.articles_target || null,
    };
    const after = {
      connection_type: type,
      description: description.trim(),
      articles_source: articlesSource.trim() || null,
      articles_target: articlesTarget.trim() || null,
    };
    saveOverride(connection.id, after);
    // #20 — append a history entry so reviewers can see who changed what.
    try {
      const reason = window.prompt('Optional: why are you editing this connection?', '') || '';
      const { supabase } = await import('@/lib/supabase');
      const session = (await supabase?.auth.getSession())?.data.session;
      if (session?.access_token) {
        fetch('/api/artefact-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            artefact_kind: 'connection',
            artefact_id: String(connection.id),
            reason,
            before,
            after,
          }),
        });
      }
    } catch { /* non-fatal */ }
    onClose();
  };

  const handleRevert = () => {
    clearOverride(connection.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-connection-title"
      onClick={onClose}
    >
      <div
        className="mh-sheet bg-white dark:bg-[var(--mh-card)] dark:text-[var(--mh-fg)] sm:rounded-lg shadow-xl border border-grey-200 dark:border-[var(--mh-border)] w-full sm:max-w-2xl sm:max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="mh-sheet-header px-4 sm:px-6 py-3 sm:py-4 border-b border-grey-200 dark:border-[var(--mh-border)] flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-tertiary-light dark:text-[var(--mh-muted)] font-semibold">
              Edit connection
            </p>
            <h2 id="edit-connection-title" className="text-[15px] sm:text-base font-bold text-tertiary-dark dark:text-[var(--mh-fg)] mt-0.5 line-clamp-2 sm:truncate">
              {connection.source_title || connection.source_policy_id}
              <span className="mx-1.5 text-tertiary-light dark:text-[var(--mh-muted)]">→</span>
              {connection.target_title || connection.target_policy_id}
            </h2>
            {existingPatch && (
              <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                Previously edited · {new Date(existingPatch.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-tertiary dark:text-[var(--mh-muted)] hover:text-tertiary-dark p-2 -m-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md active:bg-grey-100 dark:active:bg-[var(--mh-border)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mh-sheet-body overflow-y-auto px-4 sm:px-6 py-4 space-y-5">
          <div>
            <label htmlFor="conn-type" className="block text-[11px] font-semibold uppercase tracking-wider text-tertiary dark:text-[var(--mh-muted)] mb-1.5">
              Connection type
            </label>
            <select
              id="conn-type"
              value={type}
              onChange={e => setType(e.target.value as ConnectionTypeId)}
              className="w-full px-3 py-2 min-h-[44px] border border-grey-300 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-bg)] rounded text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
            >
              {CONNECTION_TYPE_LIST.map(t => (
                <option key={t.id} value={t.id}>
                  {t.label} — {t.summary}
                </option>
              ))}
            </select>
            {typeDef && (
              <p className="text-[11px] text-tertiary dark:text-[var(--mh-muted)] mt-1.5 leading-relaxed">
                <span className="font-semibold text-tertiary-dark dark:text-[var(--mh-fg)]">When to use: </span>
                {typeDef.criteria}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="conn-desc" className="block text-[11px] font-semibold uppercase tracking-wider text-tertiary dark:text-[var(--mh-muted)] mb-1.5">
              Rationale / description
            </label>
            <textarea
              id="conn-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-grey-300 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-bg)] rounded text-sm leading-relaxed focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
              placeholder="Explain why this connection exists and what it captures."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="conn-src" className="block text-[11px] font-semibold uppercase tracking-wider text-tertiary dark:text-[var(--mh-muted)] mb-1.5">
                Articles (source)
              </label>
              <input
                id="conn-src"
                type="text"
                value={articlesSource}
                onChange={e => setArticlesSource(e.target.value)}
                className="w-full px-3 py-2 min-h-[44px] border border-grey-300 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-bg)] rounded text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                placeholder="e.g. Art. 9, Art. 10a"
              />
              <p className="text-[10px] text-tertiary-light dark:text-[var(--mh-muted)] mt-1 truncate">
                In {connection.source_title || connection.source_policy_id}
              </p>
            </div>
            <div>
              <label htmlFor="conn-tgt" className="block text-[11px] font-semibold uppercase tracking-wider text-tertiary dark:text-[var(--mh-muted)] mb-1.5">
                Articles (target)
              </label>
              <input
                id="conn-tgt"
                type="text"
                value={articlesTarget}
                onChange={e => setArticlesTarget(e.target.value)}
                className="w-full px-3 py-2 min-h-[44px] border border-grey-300 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-bg)] rounded text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                placeholder="e.g. Art. 3(1), Art. 15b"
              />
              <p className="text-[10px] text-tertiary-light dark:text-[var(--mh-muted)] mt-1 truncate">
                In {connection.target_title || connection.target_policy_id}
              </p>
            </div>
          </div>

          <p className="text-[10px] text-tertiary-light dark:text-[var(--mh-muted)] leading-relaxed">
            Edits are stored in your browser only — they do not change the underlying dataset or
            affect other users. Use <em>Revert to original</em> to discard your changes for this
            connection.
          </p>
        </div>

        <div className="mh-sheet-footer px-4 sm:px-6 py-3 border-t border-grey-200 dark:border-[var(--mh-border)] flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 bg-grey-50 dark:bg-[var(--mh-card)]">
          <button
            type="button"
            onClick={handleRevert}
            disabled={!existingPatch}
            className="text-[12px] sm:text-xs text-tertiary dark:text-[var(--mh-muted)] hover:text-accent-red disabled:text-grey-300 dark:disabled:text-[var(--mh-border)] disabled:cursor-not-allowed font-medium min-h-[40px] sm:min-h-0 self-start sm:self-auto"
          >
            Revert to original
          </button>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 text-sm text-tertiary-dark dark:text-[var(--mh-fg)] border border-grey-300 dark:border-[var(--mh-border)] rounded hover:bg-white dark:hover:bg-[var(--mh-bg)] active:bg-grey-100 dark:active:bg-[var(--mh-border)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-none px-4 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 text-sm text-white bg-secondary hover:bg-primary active:bg-primary-dark rounded font-medium"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
