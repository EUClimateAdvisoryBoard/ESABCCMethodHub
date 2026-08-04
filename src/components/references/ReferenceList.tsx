'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Reference, ITEM_TYPE_LABELS, CSLItemType, isEuFunder } from '@/lib/references/types';
import { formatAuthors } from '@/lib/references/citation-utils';
import { deleteReference, exportBibTeX } from '@/lib/references/reference-service';
import { exportRIS, exportCSLJSON } from '@/lib/references/citation-utils';
import { getAllPdfAnnotationCounts } from '@/lib/references/pdf-annotations';
import { formatCitation, CITATION_STYLE_LABELS, type CitationStyle } from '@/lib/references/format-citation';
import { usePreferences } from '@/lib/preferences-context';
import { isPolicyCitation } from '@/lib/policy-citations';
import { splitTags } from '@/lib/references/projects';
import { linkToPolicyNavigator, linkToContentAnalysis } from '@/lib/cross-module-links';
import { useOverallTags } from '@/lib/content-analysis/useOverallTags';
import { resolveOverallTag } from '@/lib/content-analysis/custom-overall-tags';

interface ReferenceListProps {
  references: Reference[];
  onRefreshNeeded: () => void;
  onEditReference: (ref: Reference) => void;
  onAddToReadingList?: (ref: Reference) => void;
  /**
   * Bulk-delete handler owned by the parent page. When provided, it is used
   * instead of calling the reference-service directly — this matters in
   * fallback mode, where the displayed references live in the shared-API
   * custom store rather than the Supabase `references` table the service
   * targets. The parent is responsible for removing the rows from the correct
   * store and updating the rendered list. Falls back to the service-level
   * `deleteReference` + `onRefreshNeeded` when omitted (Supabase mode).
   */
  onDeleteReferences?: (ids: string[]) => Promise<void> | void;
}

export default function ReferenceList({ references, onRefreshNeeded, onEditReference, onAddToReadingList, onDeleteReferences }: ReferenceListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'title' | 'year' | 'created_at' | 'authors'>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterType, setFilterType] = useState<string>('');
  const [annotationCounts, setAnnotationCounts] = useState<Record<string, number>>({});
  // Overall (document-level) tags an analyst curated in the Content Analysis
  // workbench. They're keyed there by the synthetic doc id `ref-doc-<refId>`,
  // so we surface them back on the library card here too.
  const overallTags = useOverallTags();
  // Citation-style switcher (M·01 #7). Defaults to the user's preference;
  // a per-page override (state below) lets the user toggle without changing
  // the global default. The persisted preference schema (preferences-context)
  // only knows 'apa' | 'chicago' | 'harvard' | 'bibtex' — a legacy, narrower
  // set than the full `CitationStyle` union rendered here (which matches
  // `CITATION_STYLES`). These two small maps translate between the two so
  // every advertised style can still be selected and, where a matching pref
  // slot exists, saved as the default.
  const { prefs, update } = usePreferences();
  const PREF_TO_STYLE: Record<typeof prefs.default_citation, CitationStyle> = {
    apa: 'apa',
    chicago: 'chicago-author-date',
    harvard: 'harvard-cite-them-right',
    bibtex: 'esabcc',
  };
  const STYLE_TO_PREF: Partial<Record<CitationStyle, typeof prefs.default_citation>> = {
    apa: 'apa',
    'chicago-author-date': 'chicago',
    'harvard-cite-them-right': 'harvard',
    esabcc: 'bibtex',
  };
  const prefDefault: CitationStyle = PREF_TO_STYLE[prefs.default_citation] ?? 'apa';
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

  // Filtering + sorting is O(n log n) over the whole library (which can run to
  // a few thousand references). Memoise it so it only recomputes when the
  // inputs that actually affect order change — not on every unrelated render
  // (selection toggles, citation-style switches, "show more", …), which used
  // to re-copy and re-sort the entire list each time.
  const sorted = useMemo(() => {
    return [...references]
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [references, filterType, sortField, sortAsc]);

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
    const ids = [...selectedIds];
    if (onDeleteReferences) {
      // Parent owns deletion (fallback mode targets the shared-API store and
      // updates the list itself).
      await onDeleteReferences(ids);
    } else {
      for (const id of ids) {
        await deleteReference(id);
      }
      onRefreshNeeded();
    }
    setSelectedIds(new Set());
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

  // Shared download helper for the three export formats below (BibTeX, RIS,
  // CSL-JSON). CSL-JSON is the lossless interchange format the M·01 data
  // model is built on; RIS is what Zotero/EndNote expect on import — see
  // WP-02.
  const downloadExport = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedOrAll = () => {
    const selected = references.filter(r => selectedIds.has(r.id));
    return selected.length > 0 ? selected : references;
  };

  const handleExportSelected = () => {
    downloadExport(exportBibTeX(selectedOrAll()), 'references.bib', 'text/plain');
  };

  const handleExportRIS = () => {
    downloadExport(exportRIS(selectedOrAll()), 'references.ris', 'application/x-research-info-systems');
  };

  const handleExportCSLJSON = () => {
    downloadExport(exportCSLJSON(selectedOrAll()), 'references.json', 'application/json');
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    // Default to descending for "Recently Added" (newest first), ascending for others
    else { setSortField(field); setSortAsc(field !== 'created_at'); }
  };

  const uniqueTypes = useMemo(
    () => [...new Set(references.map(r => r.item_type))],
    [references],
  );

  // Windowed rendering. The full library can be a few thousand references;
  // mounting that many cards (each with multiple nested nodes, SVGs and badges)
  // is what made the list feel sluggish. We render an initial page and grow it
  // as the user scrolls (or via the "Show more" button), so the DOM stays small
  // while every reference is still reachable. Bulk select-all / export continue
  // to operate on the full `sorted` list, not just what's mounted.
  const PAGE = 60;
  const [visibleCount, setVisibleCount] = useState(PAGE);
  // Reset the window whenever the ordering / filtering inputs change so the
  // user always sees the top of the freshly-ordered list.
  useEffect(() => { setVisibleCount(PAGE); }, [references, filterType, sortField, sortAsc]);
  const visible = useMemo(() => sorted.slice(0, visibleCount), [sorted, visibleCount]);
  const hasMore = visibleCount < sorted.length;

  // Auto-load the next page when a sentinel near the end of the list scrolls
  // into view, so growing the window feels seamless (the button is the
  // keyboard / no-IntersectionObserver fallback).
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        setVisibleCount(c => Math.min(c + PAGE, sorted.length));
      }
    }, { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, sorted.length]);

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
        <div className="flex rounded overflow-hidden" role="group" aria-label="Export references">
          <button onClick={handleExportSelected} className="px-3 py-1.5 bg-grey-200 hover:bg-grey-300 text-white text-sm" title="Export as BibTeX (.bib)">
            Export BibTeX {selectedIds.size > 0 ? `(${selectedIds.size})` : '(All)'}
          </button>
          <button onClick={handleExportRIS} className="px-3 py-1.5 bg-grey-200 hover:bg-grey-300 text-white text-sm border-l border-white/20" title="Export as RIS (.ris) — for Zotero/EndNote">
            RIS
          </button>
          <button onClick={handleExportCSLJSON} className="px-3 py-1.5 bg-grey-200 hover:bg-grey-300 text-white text-sm border-l border-white/20" title="Export as CSL-JSON (.json) — lossless interchange format">
            CSL-JSON
          </button>
        </div>
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
            {styleOverride && styleOverride !== prefDefault && STYLE_TO_PREF[styleOverride] && (
              <button
                type="button"
                onClick={() => {
                  const persistAs = STYLE_TO_PREF[styleOverride];
                  if (!persistAs) return;
                  void update({ default_citation: persistAs });
                  setStyleOverride(null);
                }}
                className="mh-focus underline text-[var(--mh-status-primary)]"
                style={{ fontSize: 'var(--mh-text-2xs)' }}
                title="Styles without a matching saved-preference slot (IEEE, Vancouver, Nature, Science, MLA, Elsevier Harvard, Springer) can be used here but not yet saved as the account default."
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

          {visible.map(ref => {
            const isPolicy = isPolicyCitation(ref);
            const { plain: plainTags, projects: projectTags } = splitTags(ref.tags);
            // Resolve the analyst-curated overall tags (master-code ids) to
            // coloured labels. Only manually-set tags surface here.
            const overallTagCodes = overallTags.getTags(`ref-doc-${ref.id}`)
              .map(resolveOverallTag)
              .filter(Boolean) as NonNullable<ReturnType<typeof resolveOverallTag>>[];
            return (
            <div
              key={ref.id}
              role="button"
              tabIndex={0}
              aria-pressed={selectedIds.has(ref.id)}
              className={`mh-focus mh-motion-fast border rounded-lg p-3 sm:p-4 cursor-pointer ${
                selectedIds.has(ref.id)
                  ? 'border-[var(--mh-status-primary)] bg-[var(--mh-status-primary-bg)]'
                  : isPolicy
                    ? 'border-purple-300 bg-purple-50/40 hover:border-purple-500'
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
                    <div className="flex items-center gap-1 shrink-0 self-start">
                      {isPolicy && (
                        <span
                          className="mh-badge shrink-0"
                          style={{ background: '#F3E8FF', color: '#7E22CE', borderColor: '#D8B4FE' }}
                          title="Free-floating policy citation — universal across Policy Navigator, Content Analysis, Policy Clock and the Reference Manager."
                        >
                          Policy Citation
                        </span>
                      )}
                      {(ref.funding || []).some(isEuFunder) && (
                        <span
                          className="mh-badge shrink-0"
                          style={{ background: '#E6F2F0', color: '#007B6C' }}
                          title={(ref.funding || []).map(f => f.name).join(', ')}
                        >
                          EU-funded
                        </span>
                      )}
                      <span className="mh-badge mh-badge-neutral">
                        {ITEM_TYPE_LABELS[ref.item_type as CSLItemType] || ref.item_type}
                      </span>
                    </div>
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
                    {/* Project tags (report context) are surfaced as distinct
                        badges so the "added in the context of <report>" link is
                        legible; plain tags keep the neutral info badge. */}
                    {projectTags.map(name => (
                      <span
                        key={`project:${name}`}
                        className="mh-badge"
                        style={{
                          background: 'var(--mh-secondary, #0E47CB)',
                          color: '#fff',
                        }}
                        title={`Report / project: ${name}`}
                      >
                        {name}
                      </span>
                    ))}
                    {plainTags.map(tag => (
                      <span key={tag} className="mh-badge mh-badge-info">{tag}</span>
                    ))}
                    {/* Overall (document-level) tags from Content Analysis —
                        a coloured dot + master-code name, so the analytical
                        classification is visible right on the library card. */}
                    {overallTagCodes.map(c => (
                      <span
                        key={`overall:${c.id}`}
                        className="mh-badge inline-flex items-center gap-1"
                        style={{ background: 'var(--mh-bg)', color: 'var(--mh-fg)', borderColor: 'var(--mh-border)' }}
                        title={`Overall tag (Content Analysis): ${c.name}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: c.color }} aria-hidden />
                        {c.name}
                      </span>
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

                    {/* Cross-module navigation for policy citations. Same
                        universal id powers Policy Navigator, Content
                        Analysis, and Policy Clock — clicking any of these
                        chips lands directly on this policy in that module. */}
                    {isPolicy && (
                      <>
                        <Link
                          href={linkToPolicyNavigator(ref.id)}
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition"
                          title="Open in Policy Navigator"
                        >
                          Policy Navigator
                        </Link>
                        <Link
                          href={linkToContentAnalysis({ policyId: ref.id })}
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary/10 hover:bg-secondary/20 text-secondary text-xs font-medium transition"
                          title="Open in Content Analysis"
                        >
                          Content Analysis
                        </Link>
                        <Link
                          href="/news-feed?view=policy-clock"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-medium transition"
                          title="See review schedule on the Policy Clock"
                        >
                          Policy Clock
                        </Link>
                      </>
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
            );
          })}

          {/* Grow the window as the user nears the end (sentinel) and offer an
              explicit control for keyboard users / when IntersectionObserver
              isn't available. */}
          {hasMore && (
            <>
              <div ref={sentinelRef} aria-hidden className="h-px" />
              <div className="flex justify-center py-3">
                <button
                  type="button"
                  onClick={() => setVisibleCount(c => Math.min(c + PAGE, sorted.length))}
                  className="px-4 py-1.5 text-sm rounded-md border border-grey-200 bg-grey-100 hover:bg-grey-200 text-tertiary-dark"
                >
                  Show more ({(sorted.length - visibleCount).toLocaleString()} more)
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
