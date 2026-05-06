'use client';
import Link from 'next/link';
import { getConnectionType } from '@/lib/connectionTypes';
import type { PolicyConnection } from '@/lib/types';

interface Props {
  connection: PolicyConnection & {
    source_title?: string;
    target_title?: string;
    source_domain?: string;
    target_domain?: string;
    isEdited?: boolean;
  };
  onClose: () => void;
  onEdit: () => void;
}

/**
 * Panel shown when a user clicks a link in the network graph. Surfaces the
 * rationale behind the connection (description + article references) and
 * provides an entry point to edit it.
 */
export default function ConnectionDetailPanel({ connection, onClose, onEdit }: Props) {
  const typeDef = getConnectionType(connection.connection_type);

  return (
    <div
      className="bg-white dark:bg-[var(--mh-card)] dark:text-[var(--mh-fg)] rounded-lg border border-grey-200 dark:border-[var(--mh-border)] shadow-sm"
      role="region"
      aria-label="Connection details"
    >
      <div className="px-4 py-3 border-b border-grey-100 dark:border-[var(--mh-border)] flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
                typeDef?.badge.bg || 'bg-slate-50'
              } ${typeDef?.badge.text || 'text-slate-600'} border ${
                typeDef?.badge.border || 'border-slate-200'
              }`}
            >
              {typeDef?.label || connection.connection_type}
            </span>
            {connection.isEdited && (
              <span className="text-[9px] uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                Edited locally
              </span>
            )}
          </div>
          <p className="text-[12px] font-semibold text-tertiary-dark mt-1.5 leading-tight">
            <Link
              href={`/policy-navigator/policy/?id=${connection.source_policy_id}`}
              className="hover:text-secondary"
            >
              {connection.source_title || connection.source_policy_id}
            </Link>
            <span className="mx-1.5 text-tertiary-light">→</span>
            <Link
              href={`/policy-navigator/policy/?id=${connection.target_policy_id}`}
              className="hover:text-secondary"
            >
              {connection.target_title || connection.target_policy_id}
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close connection details"
          className="shrink-0 text-tertiary dark:text-[var(--mh-muted)] hover:text-tertiary-dark p-2 -m-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md active:bg-grey-100 dark:active:bg-[var(--mh-border)]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        {typeDef && (
          <p className="text-[10px] text-tertiary-light italic leading-relaxed">
            {typeDef.summary} {typeDef.criteria}
          </p>
        )}
        <div>
          <p className="text-[9px] uppercase tracking-wider text-grey-400 font-semibold mb-1">
            Why this connection is made
          </p>
          <p className="text-[12px] text-tertiary-dark leading-relaxed">
            {connection.description || (
              <span className="italic text-tertiary-light">No rationale recorded.</span>
            )}
          </p>
        </div>
        {(connection.articles_source || connection.articles_target) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {connection.articles_source && (
              <div>
                <p className="text-[9px] uppercase tracking-wider text-grey-400 font-semibold mb-0.5">
                  Articles (source)
                </p>
                <p className="text-[11px] text-tertiary-dark">{connection.articles_source}</p>
              </div>
            )}
            {connection.articles_target && (
              <div>
                <p className="text-[9px] uppercase tracking-wider text-grey-400 font-semibold mb-0.5">
                  Articles (target)
                </p>
                <p className="text-[11px] text-tertiary-dark">{connection.articles_target}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-2.5 bg-grey-50 border-t border-grey-100 flex items-center justify-end gap-2">
        <Link
          href={`/policy-navigator/policy/?id=${connection.source_policy_id}`}
          className="text-[11px] text-secondary hover:underline"
        >
          Open source policy
        </Link>
        <button
          type="button"
          onClick={onEdit}
          className="text-[11px] px-2.5 py-1 border border-secondary text-secondary rounded hover:bg-secondary hover:text-white transition font-medium"
        >
          Edit connection
        </button>
      </div>
    </div>
  );
}
