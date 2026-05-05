'use client';
import { useEffect, useMemo, useState } from 'react';
import { policies } from '@/data/policies';
import { useNetworks, type PolicyNetwork } from '@/lib/useNetworks';

interface Props {
  /** If provided, edit that network; otherwise create a new one. */
  editingNetwork?: PolicyNetwork | null;
  onClose: () => void;
  onSaved?: (network: PolicyNetwork) => void;
}

/**
 * Modal for creating or editing a named network — a curated subset of
 * policies that will filter the main graph when activated.
 */
export default function CreateNetworkModal({ editingNetwork, onClose, onSaved }: Props) {
  const { createNetwork, updateNetwork } = useNetworks();
  const isEditing = Boolean(editingNetwork);

  const [name, setName] = useState(editingNetwork?.name ?? '');
  const [description, setDescription] = useState(editingNetwork?.description ?? '');
  const [selected, setSelected] = useState<Set<string>>(
    new Set(editingNetwork?.policyIds ?? []),
  );
  const [query, setQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('all');

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

  const domains = useMemo(
    () => Array.from(new Set(policies.map(p => p.domain))).sort(),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return policies
      .filter(p => domainFilter === 'all' || p.domain === domainFilter)
      .filter(p => {
        if (!q) return true;
        return (
          p.title.toLowerCase().includes(q) ||
          p.short_title.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.short_title.localeCompare(b.short_title));
  }, [query, domainFilter]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelected(prev => {
      const next = new Set(prev);
      filtered.forEach(p => next.add(p.id));
      return next;
    });
  };
  const clearAllFiltered = () => {
    setSelected(prev => {
      const next = new Set(prev);
      filtered.forEach(p => next.delete(p.id));
      return next;
    });
  };

  const handleSave = () => {
    if (!name.trim() || selected.size === 0) return;
    const draft = {
      name: name.trim(),
      description: description.trim(),
      policyIds: Array.from(selected),
    };
    const saved = editingNetwork
      ? updateNetwork(editingNetwork.id, draft)
      : createNetwork(draft);
    if (saved && onSaved) onSaved(saved);
    onClose();
  };

  const canSave = name.trim().length > 0 && selected.size > 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="net-modal-heading"
      onClick={onClose}
    >
      <div
        className="mh-sheet bg-white dark:bg-[var(--mh-card)] dark:text-[var(--mh-fg)] sm:rounded-lg shadow-xl border border-grey-200 dark:border-[var(--mh-border)] w-full sm:max-w-3xl sm:max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="mh-sheet-header px-4 sm:px-6 py-3 sm:py-4 border-b border-grey-200 dark:border-[var(--mh-border)] flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-tertiary-light dark:text-[var(--mh-muted)] font-semibold">
              {isEditing ? 'Edit network' : 'Create a new network'}
            </p>
            <h2 id="net-modal-heading" className="text-[15px] sm:text-base font-bold text-tertiary-dark dark:text-[var(--mh-fg)] mt-0.5">
              {isEditing ? editingNetwork!.name : 'Build a curated subset of policies'}
            </h2>
            <p className="hidden sm:block text-[11px] text-tertiary dark:text-[var(--mh-muted)] mt-1">
              Select the policies to include. The network will filter the graph to show only these
              policies and the connections that fall within the subset.
            </p>
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

        <div className="mh-sheet-body overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 sm:gap-4 sm:items-end">
            <div>
              <label htmlFor="net-name" className="block text-[11px] font-semibold uppercase tracking-wider text-tertiary dark:text-[var(--mh-muted)] mb-1.5">
                Network name
              </label>
              <input
                id="net-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 min-h-[44px] border border-grey-300 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-bg)] rounded text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                placeholder="e.g. Finance disclosure stack"
                autoFocus
              />
            </div>
            <div className="text-[12px] text-tertiary dark:text-[var(--mh-muted)] whitespace-nowrap">
              <span className="font-bold text-tertiary-dark dark:text-[var(--mh-fg)]">{selected.size}</span> policies selected
            </div>
          </div>

          <div>
            <label htmlFor="net-desc" className="block text-[11px] font-semibold uppercase tracking-wider text-tertiary dark:text-[var(--mh-muted)] mb-1.5">
              Description
            </label>
            <textarea
              id="net-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-grey-300 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-bg)] rounded text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
              placeholder="Optional — what does this network capture?"
            />
          </div>

          <div className="border-t border-grey-100 dark:border-[var(--mh-border)] pt-3">
            <div className="flex flex-wrap items-stretch gap-2 mb-2">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 min-w-[160px] px-3 py-2 min-h-[44px] border border-grey-300 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-bg)] rounded text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                placeholder="Search policies…"
                inputMode="search"
              />
              <select
                value={domainFilter}
                onChange={e => setDomainFilter(e.target.value)}
                className="px-3 py-2 min-h-[44px] border border-grey-300 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-bg)] rounded text-sm capitalize focus:border-secondary focus:outline-none"
              >
                <option value="all">All domains</option>
                {domains.map(d => (
                  <option key={d} value={d} className="capitalize">
                    {d.replace('_', ' ')}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={selectAllFiltered}
                className="text-[12px] px-3 py-1.5 min-h-[40px] border border-grey-300 dark:border-[var(--mh-border)] rounded hover:bg-grey-50 dark:hover:bg-[var(--mh-border)] active:bg-grey-100 dark:active:bg-[var(--mh-border)]"
              >
                Select visible
              </button>
              <button
                type="button"
                onClick={clearAllFiltered}
                className="text-[12px] px-3 py-1.5 min-h-[40px] border border-grey-300 dark:border-[var(--mh-border)] rounded hover:bg-grey-50 dark:hover:bg-[var(--mh-border)] active:bg-grey-100 dark:active:bg-[var(--mh-border)]"
              >
                Clear visible
              </button>
            </div>

            <div className="border border-grey-200 dark:border-[var(--mh-border)] rounded max-h-[55vh] sm:max-h-[40vh] overflow-y-auto divide-y divide-grey-100 dark:divide-[var(--mh-border)]">
              {filtered.length === 0 && (
                <p className="text-[12px] text-tertiary dark:text-[var(--mh-muted)] p-3 italic">No policies match your filters.</p>
              )}
              {filtered.map(p => (
                <label
                  key={p.id}
                  className="flex items-start gap-3 px-3 py-3 sm:py-2 hover:bg-grey-50 dark:hover:bg-[var(--mh-border)] active:bg-grey-100 dark:active:bg-[var(--mh-border)] cursor-pointer min-h-[48px] sm:min-h-0"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="mt-1 shrink-0 w-4 h-4"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] sm:text-[12px] font-medium text-tertiary-dark dark:text-[var(--mh-fg)] truncate">{p.short_title}</p>
                    <p className="text-[11px] sm:text-[10px] text-tertiary-light dark:text-[var(--mh-muted)] capitalize">
                      {p.domain.replace('_', ' ')} · {p.document_type} · {p.status.replace('_', ' ')}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mh-sheet-footer px-4 sm:px-6 py-3 border-t border-grey-200 dark:border-[var(--mh-border)] flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 bg-grey-50 dark:bg-[var(--mh-card)]">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 text-sm text-tertiary-dark dark:text-[var(--mh-fg)] border border-grey-300 dark:border-[var(--mh-border)] rounded hover:bg-white dark:hover:bg-[var(--mh-bg)] active:bg-grey-100 dark:active:bg-[var(--mh-border)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 text-sm text-white bg-secondary hover:bg-primary active:bg-primary-dark rounded font-medium disabled:bg-grey-300 dark:disabled:bg-[var(--mh-border)] disabled:text-grey-500 disabled:cursor-not-allowed"
          >
            {isEditing ? 'Save changes' : 'Create network'}
          </button>
        </div>
      </div>
    </div>
  );
}
