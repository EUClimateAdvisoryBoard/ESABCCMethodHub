'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Reference, ITEM_TYPE_LABELS, CSLItemType } from '@/lib/references/types';
import { formatAuthors } from '@/lib/references/citation-utils';
import { deleteReference, exportBibTeX } from '@/lib/references/reference-service';
import { getAllPdfAnnotationCounts } from '@/lib/references/pdf-annotations';
import { formatCitation, CITATION_STYLE_LABELS, type CitationStyle } from '@/lib/references/format-citation';
import { usePreferences } from '@/lib/preferences-context';

interface ReferenceListProps {
  references: Reference[];
  onRefreshNeeded: () => void;
  onEditReference: (ref: Reference) => void;
  onAddToReadingList?: (ref: Reference) => void;
}

export default function ReferenceList({ references, onRefreshNeeded, onEditReference, onAddToReadingList }: ReferenceListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'title' | 'year' | 'created_at' | 'authors'>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterType, setFilterType] = useState<string>('');
  const [annotationCounts, setAnnotationCounts] = useState<Record<string, number>>({});
  // Citation-style switcher (M·01 #7). Defaults to the user's preference;
  // a per-page override (state below) lets the user toggle without changing
  // the global default. Pref maps 'bibtex' → 'esabcc' for display purposes.
  const { prefs, update } = usePreferences();
  const prefDefault: CitationStyle = (prefs.default_citation === 'bibtex' ? 'esabcc' : prefs.default_citation) as CitationStyle;
  const [styleOverride, setStyleOverride] = useState<CitationStyle | null>(null);
  const activeStyle: CitationStyle = styleOverride ?? prefDefault;
  const [showFormatted, setShowFormatted] = useState(false);

  // Sort key for authors: use the first author's family name (or literal for
  // organizations / parsed-name fallbacks), lower-cased for case-insensitive
  // comparison.  References without any author sort to the end.
  const authorSortKey = (ref: Reference): string => {
    const first = ref.authors?.[0];
    if (!first) return '';
    return (first.family || first.literal || first.given || '').toLowerCase();
  };

  // Refresh local annotation counts whenever the rendered reference list
  // changes (covers add/edit/delete from the parent page).
  useEffect(() => {
    setAnnotationCounts(getAllPdfAnnotationCounts());
  }, [references]);

  const sorted = [...references]
    .filter(r => !filterType || r.item_type === filterType)
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortField === 'year') cmp = (a.year || 0) - (b.year || 0);
      else if (sortField === 'authors') {
        const ka = authorSortKey(a);
        const kb = authorSortKey(b);
        // Push entries without an author to the end regardless of direction.
        if (!ka && !kb) cmp = 0;
        else if (!ka) return 1;
        else if (!kb) return -1;
        else cmp = ka.localeCompare(kb);
      }
      else cmp = a.created_at.localeCompare(b.created_at);
      return sortAsc ? cmp : -cmp;
    });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sorted.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sorted.map(r => r.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Delete ${selectedIds.size} reference(s)?`)) return;
    for (const id of selectedIds) {
      await deleteReference(id);
    }
    setSelectedIds(new Set());
    onRefreshNeeded();
  };

  // #8 — bulk-add to a personal collection. Prompts for the collection
  // name; creates it on the fly if no match. Best-effort: silently skips
  // when the user is not signed in.
  const bulkAddToCollection = async (ids: Set<string>) => {
    const name = window.prompt('Add to collection:', 'FF55 evidence base');
    if (!name) return;
    const { supabase } = await import('@/lib/supabase');
    if (!supabase) { alert('Sign in to use collections.'); return; }
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) { alert('Sign in to use collections.'); return; }
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.access_token) return;
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` };

    // Find or create the collection.
    const list = await fetch('/api/collections', { headers }).then(r => r.json());
    let target = (list.collections || []).find((c: { name: string }) =>
      c.name.toLowerCase() === name.toLowerCase());
    if (!target) {
      const created = await fetch('/api/collections', { method: 'POST', headers, body: JSON.stringify({ name }) }).then(r => r.json());
      target = created.collection;
    }
    if (!target) return;
    await Promise.all([...ids].map(id =>
      fetch(`/api/collections/${target.id}/items`, {
        method: 'POST', headers,
        body: JSON.stringify({ kind: 'reference', ref_id: id }),
      })
    ));
    alert(`Added ${ids.size} reference${ids.size !== 1 ? 's' : ''} to "${target.name}".`);
    setSelectedIds(new Set());
  };

  const handleExportSelected = () => {
    const selected = references.filter(r => selectedIds.has(r.id));
    const bibtex = exportBibTeX(selected.length > 0 ? selected : references);
    const blob = new Blob([bibtex], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'references.bib';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    // Default to descending for "Recently Added" (newest first), ascending for others
    else { setSortField(field); setSortAsc(field !== 'created_at'); }
  };

  const uniqueTypes = [...new Set(references.map(r => r.item_type))];

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-grey-100 border border-grey-200 rounded px-3 py-1.5 text-sm text-tertiary-dark"
        >
          <option value="">All Types ({references.length})</option>
          {uniqueTypes.map(t => (
            <option key={t} value={t}>{ITEM_TYPE_LABELS[t as CSLItemType] || t}</option>
          ))}
        </select>

        <div className="flex gap-1 text-sm">
          <button onClick={() => toggleSort('created_at')} className={`px-2 py-1 rounded ${sortField === 'created_at' ? 'bg-primary text-white' : 'bg-grey-200 text-tertiary-dark'}`}>
            Recently Added {sortField === 'created_at' && (sortAsc ? '↑' : '↓')}
          </button>
          <button onClick={() => toggleSort('title')} className={`px-2 py-1 rounded ${sortField === 'title' ? 'bg-primary text-white' : 'bg-grey-200 text-tertiary-dark'}`}>
            Title {sortField === 'title' && (sortAsc ? '↑' : '↓')}
          </button>
          <button onClick={() => toggleSort('authors')} className={`px-2 py-1 rounded ${sortField === 'authors' ? 'bg-primary text-white' : 'bg-grey-200 text-tertiary-dark'}`}>
            Author {sortField === 'authors' && (sortAsc ? '↑' : '↓')}
          </button>
          <button onClick={() => toggleSort('year')} className={`px-2 py-1 rounded ${sortField === 'year' ? 'bg-primary text-white' : 'bg-grey-200 text-tertiary-dark'}`}>
            Year {sortField === 'year' && (sortAsc ? '↑' : '↓')}
          </button>
        </div>

        <div className="flex-1" />

        {selectedIds.size > 0 && (
          <button onClick={handleDeleteSelected} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded">
            Delete ({selectedIds.size})
          </button>
        )}
        {selectedIds.size > 0 && (
          <button
            onClick={() => bulkAddToCollection(selectedIds)}
            className="px-3 py-1.5 bg-secondary hover:bg-secondary-dark text-white text-sm rounded"
            title="Add the selected references to one of your collections."
          >
            + Collection ({selectedIds.size})
          </button>
        )}
        <button onClick={handleExportSelected} className="px-3 py-1.5 bg-grey-200 hover:bg-grey-200 text-white text-sm rounded">
          Export BibTeX {selectedIds.size > 0 ? `(${selectedIds.size})` : '(All)'}
        </button>
      </div>

      {/* Citation-style switcher row (M·01 #7). Toggle expands a formatted
          line under each card; the dropdown picks the style and (separately)
          can save it as the user default. Live re-render — no fetch. */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => setShowFormatted(s => !s)}
          aria-pressed={showFormatted}
          className={`mh-focus mh-motion-fast inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${showFormatted ? 'bg-[var(--mh-status-info-bg)] text-[var(--mh-status-info)] border-[var(--mh-status-info)]' : 'bg-[var(--mh-card)] text-[var(--mh-fg)] border-[var(--mh-border)] hover:border-[var(--mh-status-info)]'}`}
          style={{ fontSize: 'var(--mh-text-xs)', fontWeight: 600 }}
          title="Show or hide a fully-formatted citation under each reference."
        >
          {showFormatted ? '▾ Citations on' : '▸ Show formatted citations'}
        </button>
        {showFormatted && (
          <>
            <span
              className="text-[var(--mh-muted)] uppercase tracking-wide font-semibold pr-1"
              style={{ fontSize: 'var(--mh-text-2xs)' }}
            >
              Style
            </span>
            <div role="radiogroup" aria-label="Citation style" className="inline-flex rounded-md border border-[var(--mh-border)] overflow-hidden bg-[var(--mh-card)]">
              {(Object.keys(CITATION_STYLE_LABELS) as CitationStyle[]).map(s => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={activeStyle === s}
                  onClick={() => setStyleOverride(s)}
                  className={`mh-focus mh-motion-fast px-2.5 py-1 ${activeStyle === s ? 'bg-[var(--mh-status-info)] text-white' : 'text-[var(--mh-fg)] hover:bg-[var(--mh-bg)]'}`}
                  style={{ fontSize: 'var(--mh-text-2xs)', fontWeight: 600 }}
                >
                  {CITATION_STYLE_LABELS[s]}
                </button>
              ))}
            </div>
            {styleOverride && styleOverride !== prefDefault && (
              <button
                type="button"
                onClick={() => {
                  // Map our 'esabcc' back to the persisted 'bibtex' slot until
                  // the prefs schema gets a dedicated 'esabcc' value.
                  const persistAs = (styleOverride === 'esabcc' ? 'bibtex' : styleOverride);
                  void update({ default_citation: persistAs as typeof prefs.default_citation });
                  setStyleOverride(null);
                }}
                className="mh-focus underline text-[var(--mh-status-primary)]"
                style={{ fontSize: 'var(--mh-text-2xs)' }}
              >
                Save as my default
              </button>
            )}
          </>
        )}
      </div>

      {/* Reference list */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-tertiary">
          <p className="text-lg mb-2">No references yet</p>
          <p className="text-sm">Add references using DOI, BibTeX import, or the manual form.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-3 py-1 text-xs text-tertiary">
            <input
              type="checkbox"
              checked={selectedIds.size === sorted.length && sorted.length > 0}
              onChange={toggleSelectAll}
              className="rounded"
            />
            <span>{sorted.length} reference{sorted.length !== 1 ? 's' : ''}</span>
          </div>

          {sorted.map(ref => (
            <div
              key={ref.id}
              role="button"
              tabIndex={0}
              aria-pressed={selectedIds.has(ref.id)}
              className={`mh-focus mh-motion-fast border rounded-lg p-3 sm:p-4 cursor-pointer ${
                selectedIds.has(ref.id)
                  ? 'border-[var(--mh-status-primary)] bg-[var(--mh-status-primary-bg)]'
                  : 'border-[var(--mh-border)] bg-[var(--mh-card)] hover:border-[var(--mh-status-primary)]'
              }`}
              onClick={() => onEditReference(ref)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onEditReference(ref); } }}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(ref.id)}
                  onChange={(e) => { e.stopPropagation(); toggleSelect(ref.id); }}
                  onClick={e => e.stopPropagation()}
                  className="mt-1 rounded mh-focus"
                  aria-label={`Select ${ref.title}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
                    <h3
                      className="font-semibold text-[var(--mh-fg)]"
                      style={{ fontSize: 'var(--mh-text-md)', lineHeight: 'var(--mh-leading-snug)' }}
                    >
                      {ref.title}
                    </h3>
                    <span className="mh-badge mh-badge-neutral shrink-0 self-start">
                      {ITEM_TYPE_LABELS[ref.item_type as CSLItemType] || ref.item_type}
                    </span>
                  </div>
                  <p
                    className="text-[var(--mh-muted)] mt-1"
                    style={{ fontSize: 'var(--mh-text-sm)', lineHeight: 'var(--mh-leading-base)' }}
                  >
                    {formatAuthors(ref.authors)}
                    {ref.year ? <> · <span className="mh-tnum">{ref.year}</span></> : null}
                  </p>
                  {ref.container_title && (
                    <p
                      className="italic text-[var(--mh-muted)] mt-0.5"
                      style={{ fontSize: 'var(--mh-text-xs)', lineHeight: 'var(--mh-leading-base)' }}
                    >
                      {ref.container_title}
                    </p>
                  )}
                  {/* Formatted citation line — toggled by the switcher above.
                      Re-renders live on style change (no fetch). */}
                  {showFormatted && (
                    <p
                      className="mt-2 px-2 py-1.5 rounded bg-[var(--mh-bg)] text-[var(--mh-fg)] border border-[var(--mh-border)] font-mono"
                      style={{ fontSize: 'var(--mh-text-xs)', lineHeight: 'var(--mh-leading-base)' }}
                      onClick={e => {
                        e.stopPropagation();
                        // One-tap copy when clicking the formatted citation row.
                        navigator.clipboard?.writeText(formatCitation(ref, activeStyle)).catch(() => {});
                      }}
                      title="Click to copy"
                    >
                      {formatCitation(ref, activeStyle)}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {ref.doi && (
                      <a
                        href={`https://doi.org/${ref.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="mh-focus mh-tnum font-mono hover:underline"
                        style={{ fontSize: 'var(--mh-text-xs)', color: 'var(--mh-status-info)' }}
                      >
                        DOI: {ref.doi}
                      </a>
                    )}
                    {ref.citation_key && (
                      <span
                        className="font-mono text-[var(--mh-muted)]"
                        style={{ fontSize: 'var(--mh-text-xs)' }}
                      >
                        [{ref.citation_key}]
                      </span>
                    )}
                    {ref.tags && ref.tags.length > 0 && ref.tags.map(tag => (
                      <span key={tag} className="mh-badge mh-badge-info">{tag}</span>
                    ))}

                    {/* Add to reading list */}
                    {onAddToReadingList && (
                      <button
                        onClick={e => { e.stopPropagation(); onAddToReadingList(ref); }}
                        title="Add to my reading list"
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-secondary/10 hover:bg-secondary/20 text-secondary text-xs font-medium transition"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                        </svg>
                        Reading List
                      </button>
                    )}

                    {/* PDF icon button → annotation viewer.  Only shown when
                        a PDF has actually been uploaded for this reference. */}
                    {ref.pdf_url && (
                      <Link
                        href={`/references/annotate/?id=${encodeURIComponent(ref.id)}`}
                        onClick={e => e.stopPropagation()}
                        title="Open PDF in annotation viewer"
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        PDF · Annotate
                        {annotationCounts[ref.id] > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 bg-primary text-white rounded-full text-[10px] leading-none">
                            {annotationCounts[ref.id]}
                          </span>
                        )}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
