'use client';

/**
 * M · 01 — Reference Manager (production)
 * ---------------------------------------
 * Route: `/references`
 *
 * A literature library for the Secretariat. Replaces what used to be a
 * sprawling EndNote / shared-drive setup with a single searchable store:
 *
 *   - DOI lookup via Crossref (client → `/api/resolve-doi` → Crossref).
 *   - PDF upload + annotation (Supabase Storage or S3 in production).
 *   - Hierarchical library organisation.
 *   - Word add-in bridge: a running local bridge-service (see
 *     `bridge-service/`) listens on 8585 and the Office.js add-in inserts
 *     the reference from this library straight into the manuscript.
 *
 * Data flow:
 *
 *   UI page ──▶ `@/lib/references/reference-service`
 *            ──▶ `/api/references/**`          (server routes)
 *            ──▶ Supabase or EEA Postgres      (via `DB_PROVIDER`)
 *            ──▶ Storage bucket for PDFs       (via `STORAGE_PROVIDER`)
 *
 * Why this file exists as the module entry: it owns the library-picker
 * state and the master/detail split — creation and editing are delegated
 * to `@/components/references/*`. Keep it thin.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ReferenceLibrary, Reference, FundingEntry, isEuFunder } from '@/lib/references/types';
import {
  getLibraries,
  getReferences,
  searchReferences,
  subscribeToLibrary,
} from '@/lib/references/reference-service';
import { references as staticReferencesRaw } from '@/data/references';
import { getPolicyCitationsAsReferences } from '@/lib/policy-citations';
import LibrarySelector from '@/components/references/LibrarySelector';
import ReferenceList from '@/components/references/ReferenceList';
import ReferenceForm from '@/components/references/ReferenceForm';
import SiteHeader from '@/components/SiteHeader';
import PageHero from '@/components/PageHero';
import OnboardingTour from '@/components/OnboardingTour';
import ImportModal from '@/components/references/ImportModal';
import ReferenceSearchBar from '@/components/references/SearchBar';
import RecentAnnotationsFeed from '@/components/references/RecentAnnotationsFeed';
import { uploadPdf, deletePdf } from '@/lib/references/pdf-storage';
import { useAuth } from '@/lib/auth-context';
import { formatAuthors } from '@/lib/references/citation-utils';
import { EmptyState, LoadingState } from '@/components/ui/StateView';
import Skeleton from '@/components/ui/Skeleton';
import { showToast } from '@/components/ui/ToastHost';
import { useClipboardIdentifier } from '@/lib/references/use-clipboard-identifier';

// Map the static references (old format) to the Supabase Reference type so
// ReferenceList can render them without changes.
const STATIC_LIBRARY_ID = '__static_fallback__';

function mapStaticTypeToCSL(t: string): string {
  const map: Record<string, string> = {
    article: 'article-journal',
    report: 'report',
    web: 'webpage',
    chapter: 'chapter',
    legislation: 'legislation',
    book: 'book',
  };
  return map[t] || 'article-journal';
}

const staticReferences: Reference[] = staticReferencesRaw.map((r) => {
  const cslType = mapStaticTypeToCSL(r.type);
  return {
    id: r.id,
    library_id: STATIC_LIBRARY_ID,
    csl_json: {
      id: r.id,
      type: cslType as Reference['csl_json']['type'],
      title: r.title,
      author: [{ family: r.authors, given: '', literal: r.authors }],
      issued: r.year ? { 'date-parts': [[parseInt(r.year, 10)]] } : undefined,
      'container-title': r.journal || undefined,
      volume: r.volume || undefined,
      issue: r.issue || undefined,
      page: r.pages || undefined,
      DOI: r.doi || undefined,
      URL: r.url || undefined,
    },
    item_type: cslType,
    title: r.title,
    authors: [{ family: r.authors, given: '', literal: r.authors }],
    year: r.year ? parseInt(r.year, 10) : null,
    doi: r.doi || null,
    abstract: null,
    container_title: r.journal || null,
    citation_key: null,
    tags: r.tags || null,
    notes: r.notes || null,
    pdf_url: null,
    funding: null,
    created_at: r.addedDate || '2024-01-01T00:00:00Z',
    updated_at: r.addedDate || '2024-01-01T00:00:00Z',
    created_by: null,
  };
});

type View = 'list' | 'add' | 'edit' | 'import';

// Load custom references from localStorage
function loadLocalCustomRefs(): Reference[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('esabcc_custom_refs');
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveLocalCustomRefs(refs: Reference[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('esabcc_custom_refs', JSON.stringify(refs));
}

// Load custom references from shared API (synced with VBA)
async function loadApiCustomRefs(): Promise<Reference[]> {
  try {
    const resp = await fetch('/api/references/library', { cache: 'no-store' });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!data.references?.length) return [];
    return data.references.map((r: {
      id: string; doi: string; title: string; authors: string;
      year: string; journal: string; type: string; volume: string;
      issue: string; pages: string; url: string; addedAt: string;
      pdfUrl?: string; source?: string;
      funding?: FundingEntry[] | null;
    }) => {
      const yearNum = r.year ? parseInt(r.year, 10) : null;
      // Derive a source-specific tag so users can tell at a glance
      // whether a reference was added from the web app or from Word
      // (via the VBA add-in).
      const sourceTag =
        r.source === 'vba' ? 'word' :
        r.source === 'web' ? 'web' :
        'custom';
      return {
        id: r.id,
        library_id: STATIC_LIBRARY_ID,
        csl_json: {
          id: r.id,
          type: (r.type || 'article-journal') as Reference['csl_json']['type'],
          title: r.title,
          author: [{ family: r.authors, given: '', literal: r.authors }],
          issued: yearNum ? { 'date-parts': [[yearNum]] } : undefined,
          'container-title': r.journal || undefined,
          volume: r.volume || undefined,
          issue: r.issue || undefined,
          page: r.pages || undefined,
          DOI: r.doi || undefined,
          URL: r.url || undefined,
        },
        item_type: r.type || 'article-journal',
        title: r.title,
        authors: [{ family: r.authors, given: '', literal: r.authors }],
        year: yearNum,
        doi: r.doi || null,
        abstract: null,
        container_title: r.journal || null,
        citation_key: null,
        tags: [sourceTag] as string[],
        notes: null,
        pdf_url: r.pdfUrl || null,
        funding: r.funding ?? null,
        created_at: r.addedAt || new Date().toISOString(),
        updated_at: r.addedAt || new Date().toISOString(),
        created_by: null,
      } as Reference;
    });
  } catch { return []; }
}

// Post a new reference to the shared API
async function postRefToApi(ref: {
  doi: string; title: string; authors: string; year: string;
  journal: string; type: string; volume: string; issue: string;
  pages: string; url: string; fullCitation: string;
  funding?: FundingEntry[] | null;
}) {
  try {
    await fetch('/api/references/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...ref, source: 'web' }),
    });
  } catch { /* best effort */ }
}

// Update an existing reference (or create if missing) in the shared API.
async function putRefToApi(ref: {
  id: string; doi: string; title: string; authors: string; year: string;
  journal: string; type: string; volume: string; issue: string;
  pages: string; url: string; fullCitation: string; pdfUrl?: string;
  funding?: FundingEntry[] | null;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const resp = await fetch('/api/references/library', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...ref, source: 'web' }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data?.persisted === false) {
      return { ok: false, error: data?.persistError || data?.error || `HTTP ${resp.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Delete a reference from the shared API.
async function deleteRefFromApi(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const resp = await fetch(`/api/references/library?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data?.persisted === false) {
      return { ok: false, error: data?.persistError || data?.error || `HTTP ${resp.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export default function ReferencesPage() {
  const { user, displayName, requireAuth } = useAuth();
  const [libraries, setLibraries] = useState<ReferenceLibrary[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
  const [references, setReferences] = useState<Reference[]>([]);
  const [view, setView] = useState<View>('list');
  const [editingRef, setEditingRef] = useState<Reference | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [usingFallback, setUsingFallback] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [fallbackEditingRef, setFallbackEditingRef] = useState<Reference | null>(null);

  // Load libraries -- fall back to static data when Supabase returns nothing
  const loadLibraries = useCallback(async () => {
    try {
      const libs = await getLibraries();
      if (libs.length > 0) {
        setLibraries(libs);
        setUsingFallback(false);
        if (!selectedLibraryId) {
          setSelectedLibraryId(libs[0].id);
        }
      } else {
        setUsingFallback(true);
        setLibraries([]);
        setSelectedLibraryId(null);
        const local = loadLocalCustomRefs();
        const api = await loadApiCustomRefs();
        // Free-floating policy citations: every tracked EU policy is exposed
        // as an official-citation Reference so it can be cited and exported
        // alongside any other source. Pulled in first so they're always
        // visible.
        const policyCitations = getPolicyCitationsAsReferences();
        // Merge: policy citations first, then API refs, then local, then
        // static (dedup by id so a broken/partial API re-import can never
        // shadow a complete static reference with the same id).
        const seen = new Set<string>();
        const merged: Reference[] = [];
        for (const r of [...policyCitations, ...api, ...local, ...staticReferences]) {
          if (!r.id || seen.has(r.id)) continue;
          // Skip obviously-corrupt API entries whose title is just the raw
          // citation string (no structured metadata parsed out).
          const isCorrupt =
            r.library_id === STATIC_LIBRARY_ID &&
            (!r.authors?.[0]?.literal?.trim()) &&
            !r.container_title &&
            !r.doi &&
            !r.csl_json?.URL &&
            typeof r.title === 'string' &&
            /[,;]\s|\.\s|\(DOI:/.test(r.title) &&
            r.title.length > 60;
          if (isCorrupt) continue;
          seen.add(r.id);
          merged.push(r);
        }
        setReferences(merged);
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load libraries:', err);
      setUsingFallback(true);
      setLibraries([]);
      setSelectedLibraryId(null);
      const local = loadLocalCustomRefs();
      const api = await loadApiCustomRefs();
      const policyCitations = getPolicyCitationsAsReferences();
      const seen = new Set<string>();
      const merged: Reference[] = [];
      for (const r of [...policyCitations, ...api, ...local, ...staticReferences]) {
        if (!r.id || seen.has(r.id)) continue;
        const isCorrupt =
          r.library_id === STATIC_LIBRARY_ID &&
          (!r.authors?.[0]?.literal?.trim()) &&
          !r.container_title &&
          !r.doi &&
          !r.csl_json?.URL &&
          typeof r.title === 'string' &&
          /[,;]\s|\.\s|\(DOI:/.test(r.title) &&
          r.title.length > 60;
        if (isCorrupt) continue;
        seen.add(r.id);
        merged.push(r);
      }
      setReferences(merged);
      setLoading(false);
    }
  }, [selectedLibraryId]);

  // Load references for selected library (Supabase mode only)
  const loadReferences = useCallback(async () => {
    if (usingFallback) return; // static data already loaded
    if (!selectedLibraryId) { setReferences([]); setLoading(false); return; }
    setLoading(true);
    try {
      // Use allSettled so a Supabase failure doesn't drop the shared API
      // library on the floor (and vice versa).  Whichever one succeeds is
      // still rendered.
      const [refsResult, apiResult] = await Promise.allSettled([
        searchQuery
          ? searchReferences(selectedLibraryId, searchQuery)
          : getReferences(selectedLibraryId),
        loadApiCustomRefs(),
      ]);
      const refs = refsResult.status === 'fulfilled' ? refsResult.value : [];
      const apiCustom = apiResult.status === 'fulfilled' ? apiResult.value : [];
      if (refsResult.status === 'rejected') {
        console.error('Supabase getReferences failed:', refsResult.reason);
      }
      if (apiResult.status === 'rejected') {
        console.error('loadApiCustomRefs failed:', apiResult.reason);
      }
      // Merge: policy citations first (free-floating across modules), then
      // shared API refs (newest), then Supabase library refs. Dedup by id so
      // a ref that lives in multiple stores appears once.
      const policyCitations = getPolicyCitationsAsReferences();
      const seen = new Set<string>();
      const merged: Reference[] = [];
      for (const r of [...policyCitations, ...apiCustom, ...refs]) {
        if (!seen.has(r.id)) { seen.add(r.id); merged.push(r); }
      }
      setReferences(merged);
    } catch (err) {
      console.error('Failed to load references:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedLibraryId, searchQuery, usingFallback]);

  useEffect(() => { loadLibraries(); }, [loadLibraries]);
  useEffect(() => { loadReferences(); }, [loadReferences]);

  // Deep-link support: /references?ref=<id> opens that reference's edit form
  // once the list has loaded.  /references?policy=<id> resolves the universal
  // policy id against the policy-citation entries (which use Policy.id as
  // their reference id) so cross-module nav from the Policy Clock or
  // Content Analysis lands on the official citation. Strips the param after
  // opening so subsequent navigation stays clean.
  useEffect(() => {
    if (loading || references.length === 0) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const refId = params.get('ref') || params.get('policy');
    const usedKey = params.get('ref') ? 'ref' : params.get('policy') ? 'policy' : null;
    if (!refId || !usedKey) return;
    const target = references.find(r => r.id === refId);
    if (!target) return;
    if (usingFallback) {
      setFallbackEditingRef(target);
    } else {
      setEditingRef(target);
      setView('edit');
    }
    params.delete(usedKey);
    const newUrl = window.location.pathname + (params.toString() ? `?${params}` : '');
    window.history.replaceState({}, '', newUrl);
  }, [loading, references, usingFallback]);

  // Keyboard shortcut: `n` opens the add-reference form (in either fallback
  // or Supabase mode). Drives the keyboard-first add flow from the brief.
  useEffect(() => {
    function onShortcut(e: Event) {
      const action = (e as CustomEvent<string>).detail;
      if (action !== 'list:new') return;
      void (async () => {
        const u = await requireAuth('Sign in to add references.');
        if (!u) return;
        if (usingFallback) {
          setShowAddForm(true);
        } else if (selectedLibraryId) {
          setEditingRef(null);
          setView('add');
        }
      })();
    }
    window.addEventListener('mh:shortcut', onShortcut as EventListener);
    return () => window.removeEventListener('mh:shortcut', onShortcut as EventListener);
  }, [usingFallback, selectedLibraryId, requireAuth]);

  // Realtime subscription (Supabase mode only)
  useEffect(() => {
    if (usingFallback || !selectedLibraryId) return;
    const unsub = subscribeToLibrary(
      selectedLibraryId,
      (ref) => setReferences(prev => [ref, ...prev]),
      (ref) => setReferences(prev => prev.map(r => r.id === ref.id ? ref : r)),
      (id) => setReferences(prev => prev.filter(r => r.id !== id)),
    );
    return unsub;
  }, [selectedLibraryId, usingFallback]);

  // Client-side search for fallback mode. Supports multi-keyword AND search:
  // whitespace-separated tokens must ALL be present across the title,
  // authors, DOI, journal, tags, or year of a reference.  Use double-quoted
  // phrases to search for an exact phrase (e.g. `"carbon border" adjustment`).
  const displayedReferences = useMemo(() => {
    if (!usingFallback || !searchQuery.trim()) return references;
    // Tokenize: keep quoted phrases as single tokens, split rest on whitespace
    const raw = searchQuery.trim().toLowerCase();
    const tokens: string[] = [];
    const quoteRe = /"([^"]+)"|(\S+)/g;
    let m: RegExpExecArray | null;
    while ((m = quoteRe.exec(raw)) !== null) {
      const tok = (m[1] || m[2] || '').trim();
      if (tok) tokens.push(tok);
    }
    if (tokens.length === 0) return references;
    return references.filter((r) => {
      const haystack = [
        r.title || '',
        r.authors?.map((a) => a.literal || `${a.given || ''} ${a.family || ''}`).join(' ') || '',
        r.doi || '',
        r.container_title || '',
        r.abstract || '',
        (r.tags || []).join(' '),
        r.year ? String(r.year) : '',
        r.item_type || '',
      ].join(' ').toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });
  }, [references, searchQuery, usingFallback]);

  // id → display title map for the recent-annotations feed.  The feed stores
  // references by id in localStorage, but only knows the id — so we hand it a
  // lookup table built from the currently loaded references.
  const referenceTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of references) {
      map[r.id] = r.title;
    }
    return map;
  }, [references]);

  const handleSaved = () => {
    setView('list');
    setEditingRef(null);
    loadReferences();
  };

  const handleEditReference = (ref: Reference) => {
    setEditingRef(ref);
    setView('edit');
  };

  const handleAddToReadingList = useCallback(async (ref: Reference) => {
    const authUser = await requireAuth('Sign in to add items to your reading list.');
    if (!authUser) return;
    const authorStr = formatAuthors(ref.authors);
    const doiUrl = ref.doi ? `https://doi.org/${ref.doi}` : '';
    const url = ref.csl_json?.URL || doiUrl || '';
    // Add to personal reading list (same localStorage key as news-feed page)
    const stored = localStorage.getItem('nf-reading-list');
    const list = stored ? JSON.parse(stored) : [];
    // Check for duplicates by title
    if (list.some((i: { title: string }) => i.title.toLowerCase() === ref.title.toLowerCase())) {
      showToast({ tone: 'info', message: 'Already on your reading list' });
      return;
    }
    const item = {
      id: `rl-${Date.now()}`,
      title: ref.title,
      authors: authorStr,
      url,
      doi: ref.doi || undefined,
      kind: ref.item_type === 'report' ? 'report' : ref.item_type === 'book' ? 'book' : 'paper',
      priority: 'important',
      notes: '',
      addedBy: displayName || 'Anonymous',
      addedDate: new Date().toISOString().split('T')[0],
      read: false,
      sourceType: 'reference-manager',
      sourceId: ref.id,
    };
    list.unshift(item);
    localStorage.setItem('nf-reading-list', JSON.stringify(list));
    showToast({
      tone: 'success',
      message: 'Added to your reading list',
      description: 'Open it any time from News → Reading List.',
    });
  }, [requireAuth, displayName]);

  const selectedLibrary = libraries.find(l => l.id === selectedLibraryId);

  // In fallback mode we render content directly without requiring a library selection
  const showFallbackContent = usingFallback && !loading;
  const showSupabaseContent = !usingFallback && selectedLibrary;

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <OnboardingTour
        moduleKey="references"
        steps={[
          { title: 'Add by DOI or PDF', body: 'Drop a PDF or paste a DOI to auto-fill metadata via Crossref.' },
          { title: 'Filter and sort', body: 'Type filter narrows by article / report / chapter; click a column header to sort.' },
          { title: 'Bulk actions', body: 'Tick the boxes to select; export BibTeX or add to a Collection in one click.' },
          { title: 'Word add-in', body: 'Cite directly into Word documents — see the setup link in the page header.' },
        ]}
      />
      <PageHero
        title="Reference Manager"
        subtitle="Literature database, citations, and Word add-in."
      >
        <div className="flex flex-wrap gap-2">
          <a href="/references/word-addin-setup" className="px-3 py-1.5 bg-white hover:bg-[#E6E7E8] text-[#3D5265] text-xs rounded border border-[#E6E7E8]">
            Word Add-in Setup
          </a>
          <a href="/report-plan" className="px-3 py-1.5 bg-white hover:bg-[#E6E7E8] text-[#3D5265] text-xs rounded border border-[#E6E7E8]">
            Report Plan
          </a>
        </div>
      </PageHero>

      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Sidebar -- hidden in fallback mode since there are no libraries to pick */}
          {!usingFallback && (
            <div className="w-full md:w-64 md:shrink-0">
              <LibrarySelector
                libraries={libraries}
                selectedId={selectedLibraryId}
                onSelect={setSelectedLibraryId}
                onRefreshNeeded={loadLibraries}
              />
            </div>
          )}

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Inline toast banners removed — replaced by the typed ToastHost
                (see showToast() calls in handleAddToReadingList / onShare). */}
            {showFallbackContent && (
              <>
                {/* Fallback header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">ESABCC Reference Library</h2>
                    <p className="text-sm text-tertiary">
                      {displayedReferences.length.toLocaleString()} references
                    </p>
                  </div>
                  <button
                    onClick={async () => { const u = await requireAuth('Sign in to add references.'); if (u) setShowAddForm(true); }}
                    className="px-3 py-2 bg-primary hover:bg-primary-dark text-white text-sm rounded-lg"
                  >
                    + Add Reference
                  </button>
                </div>

                {/* Add Reference Form (fallback mode) */}
                {showAddForm && (
                  <AddReferenceForm
                    onSave={(ref) => {
                      const custom = loadLocalCustomRefs();
                      custom.unshift(ref);
                      saveLocalCustomRefs(custom);
                      // Also sync to shared API
                      postRefToApi({
                        doi: ref.doi || '',
                        title: ref.title,
                        authors: ref.authors?.[0]?.literal || '',
                        year: ref.year ? String(ref.year) : '',
                        journal: ref.container_title || '',
                        type: ref.item_type,
                        volume: ref.csl_json?.volume || '',
                        issue: ref.csl_json?.issue || '',
                        pages: ref.csl_json?.page || '',
                        url: ref.csl_json?.URL || '',
                        fullCitation: '',
                        funding: ref.funding,
                      });
                      setReferences([ref, ...references]);
                      setShowAddForm(false);
                    }}
                    onCancel={() => setShowAddForm(false)}
                  />
                )}

                {/* Edit Reference Form (fallback mode) */}
                {fallbackEditingRef && !showAddForm && (
                  <AddReferenceForm
                    editingRef={fallbackEditingRef}
                    onSave={async (ref) => {
                      const result = await putRefToApi({
                        id: ref.id,
                        doi: ref.doi || '',
                        title: ref.title,
                        authors: ref.authors?.[0]?.literal || '',
                        year: ref.year ? String(ref.year) : '',
                        journal: ref.container_title || '',
                        type: ref.item_type,
                        volume: ref.csl_json?.volume || '',
                        issue: ref.csl_json?.issue || '',
                        pages: ref.csl_json?.page || '',
                        url: ref.csl_json?.URL || '',
                        fullCitation: '',
                        pdfUrl: ref.pdf_url || '',
                        funding: ref.funding,
                      });
                      if (!result.ok) {
                        alert(`Failed to save: ${result.error}`);
                        return;
                      }
                      setReferences(prev => prev.map(r => r.id === ref.id ? ref : r));
                      setFallbackEditingRef(null);
                    }}
                    onDelete={async () => {
                      if (!fallbackEditingRef) return;
                      if (!confirm(`Delete "${fallbackEditingRef.title}"?`)) return;
                      // Best-effort: also delete the PDF blob if there is one.
                      if (fallbackEditingRef.pdf_url) {
                        await deletePdf(fallbackEditingRef.id);
                      }
                      const result = await deleteRefFromApi(fallbackEditingRef.id);
                      if (!result.ok) {
                        alert(`Failed to delete: ${result.error}`);
                        return;
                      }
                      setReferences(prev => prev.filter(r => r.id !== fallbackEditingRef.id));
                      setFallbackEditingRef(null);
                    }}
                    onShare={() => {
                      if (!fallbackEditingRef) return;
                      const url = `${window.location.origin}${window.location.pathname}?ref=${encodeURIComponent(fallbackEditingRef.id)}`;
                      navigator.clipboard.writeText(url).then(
                        () => showToast({ tone: 'success', message: 'Link copied to clipboard' }),
                        () => {
                          // Clipboard blocked — fall back to a prompt the user can copy from manually.
                          window.prompt('Copy this share link:', url);
                        },
                      );
                    }}
                    onCancel={() => setFallbackEditingRef(null)}
                  />
                )}

                {/* Search */}
                {!showAddForm && !fallbackEditingRef && (
                  <div className="mb-4">
                    <ReferenceSearchBar
                      onSearch={setSearchQuery}
                      placeholder="Search by title, author, DOI, keyword..."
                    />
                  </div>
                )}

                {/* Reference list */}
                {!showAddForm && !fallbackEditingRef && (
                  <ReferenceList
                    references={displayedReferences}
                    onRefreshNeeded={() => {}}
                    onEditReference={(ref) => setFallbackEditingRef(ref)}
                    onAddToReadingList={handleAddToReadingList}
                  />
                )}
              </>
            )}

            {showSupabaseContent && (
              <>
                {/* Library header + actions */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">{selectedLibrary.name}</h2>
                    {selectedLibrary.description && (
                      <p className="text-sm text-tertiary">{selectedLibrary.description}</p>
                    )}
                  </div>
                  {view === 'list' && (
                    <div className="flex gap-2">
                      <BackfillButton onDone={() => loadReferences()} />
                      <button
                        onClick={async () => { const u = await requireAuth('Sign in to import references.'); if (u) setView('import'); }}
                        className="px-3 py-2 bg-grey-100 hover:bg-grey-200 text-tertiary-dark text-sm rounded-lg border border-grey-200"
                      >
                        Import
                      </button>
                      <button
                        onClick={async () => { const u = await requireAuth('Sign in to add references.'); if (u) { setEditingRef(null); setView('add'); } }}
                        className="px-3 py-2 bg-primary hover:bg-primary-dark text-white text-sm rounded-lg"
                      >
                        + Add Reference
                      </button>
                    </div>
                  )}
                </div>

                {/* Search */}
                {view === 'list' && (
                  <div className="mb-4">
                    <ReferenceSearchBar
                      onSearch={setSearchQuery}
                      placeholder="Search by title, author, DOI, keyword..."
                    />
                  </div>
                )}

                {/* Content */}
                {view === 'list' && (
                  loading ? (
                    <Skeleton.Stack count={5} />
                  ) : references.length === 0 ? (
                    <EmptyState
                      title={searchQuery ? 'No matches' : 'This library is empty'}
                      body={
                        searchQuery
                          ? `Nothing in “${selectedLibrary?.name ?? 'this library'}” matches “${searchQuery}”. Try a broader query, or clear the search.`
                          : 'Start your library by importing a BibTeX/RIS file, or by adding a reference one at a time.'
                      }
                      primaryAction={
                        searchQuery
                          ? { label: 'Clear search', onClick: () => setSearchQuery('') }
                          : { label: '+ Add reference', onClick: async () => { const u = await requireAuth('Sign in to add references.'); if (u) { setEditingRef(null); setView('add'); } } }
                      }
                      secondaryActions={
                        searchQuery
                          ? undefined
                          : [{ label: 'Import file', onClick: async () => { const u = await requireAuth('Sign in to import references.'); if (u) setView('import'); } }]
                      }
                    />
                  ) : (
                    <ReferenceList
                      references={references}
                      onRefreshNeeded={loadReferences}
                      onEditReference={handleEditReference}
                      onAddToReadingList={handleAddToReadingList}
                    />
                  )
                )}

                {(view === 'add' || view === 'edit') && (
                  <div className="bg-white border border-grey-200 shadow-sm rounded-xl p-6">
                    <ReferenceForm
                      libraryId={selectedLibraryId!}
                      editingRef={view === 'edit' ? editingRef : null}
                      onSaved={handleSaved}
                      onCancel={() => { setView('list'); setEditingRef(null); }}
                    />
                  </div>
                )}

                {view === 'import' && (
                  <ImportModal
                    libraryId={selectedLibraryId!}
                    onImported={() => { loadReferences(); }}
                    onClose={() => setView('list')}
                  />
                )}
              </>
            )}

            {!showFallbackContent && !showSupabaseContent && !loading && (
              <EmptyState
                title="Pick a library to get started"
                body="Select a reference library on the left, or create your first one to begin collecting references."
                hint="Libraries keep references grouped by project — useful when collaborators are looking at different work."
              />
            )}
            {!showFallbackContent && !showSupabaseContent && loading && (
              <LoadingState label="Loading your libraries…" />
            )}
          </div>

          {/* Right sidebar — recent annotations feed.  Only shown on wide
              viewports; on narrow screens it's hidden to save space. */}
          <aside className="hidden xl:block w-72 shrink-0">
            <div className="sticky top-4">
              <RecentAnnotationsFeed referenceTitles={referenceTitleMap} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// Funding textarea round-trip: each line is "Name | DOI prefix | award1, award2".
// Mirrors the helpers in components/references/ReferenceForm.tsx so both forms
// agree on what the user types.
function formatFundingLine(f: FundingEntry): string {
  const awards = f.awards && f.awards.length > 0 ? f.awards.join(', ') : '';
  return [f.name, f.doi || '', awards].join(' | ').replace(/\s*\|\s*$/, '');
}

function parseFundingText(text: string): FundingEntry[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const [name = '', doi = '', awards = ''] = line.split('|').map(s => s.trim());
      const e: FundingEntry = { name };
      if (doi) e.doi = doi;
      if (awards) e.awards = awards.split(',').map(a => a.trim()).filter(Boolean);
      return e;
    })
    .filter(f => f.name);
}

function AddReferenceForm({
  onSave,
  onCancel,
  editingRef,
  onDelete,
  onShare,
}: {
  onSave: (ref: Reference) => void;
  onCancel: () => void;
  editingRef?: Reference | null;
  onDelete?: () => void;
  onShare?: () => void;
}) {
  const isEditing = !!editingRef;
  const [title, setTitle] = useState(editingRef?.title || '');
  const [authors, setAuthors] = useState(editingRef?.authors?.[0]?.literal || '');
  const [year, setYear] = useState(editingRef?.year ? String(editingRef.year) : '');
  const [journal, setJournal] = useState(editingRef?.container_title || '');
  const [doi, setDoi] = useState(editingRef?.doi || '');
  const [url, setUrl] = useState(editingRef?.csl_json?.URL || '');
  const [refType, setRefType] = useState(editingRef?.item_type || 'article-journal');
  const [volume, setVolume] = useState(editingRef?.csl_json?.volume || '');
  const [issue, setIssue] = useState(editingRef?.csl_json?.issue || '');
  const [pages, setPages] = useState(editingRef?.csl_json?.page || '');
  const [tags, setTags] = useState(editingRef?.tags?.join(', ') || '');
  const [notes, setNotes] = useState(editingRef?.notes || '');
  const [fundingText, setFundingText] = useState(() =>
    (editingRef?.funding || []).map(formatFundingLine).join('\n')
  );
  const [doiLoading, setDoiLoading] = useState(false);
  const [doiError, setDoiError] = useState('');
  const [pdfUrl, setPdfUrl] = useState(editingRef?.pdf_url || '');
  // Drag state for the PDF dropzone — three explicit states per the brief:
  // idle (no drag) / valid (PDF being dragged over) / invalid (other type).
  const [dragState, setDragState] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [pdfStatus, setPdfStatus] = useState<string>('');
  const [pdfBusy, setPdfBusy] = useState(false);
  // Smart-paste: peek at the clipboard for DOI/arXiv/ISBN when the DOI input
  // is focused. Suppresses the chip if the clipboard text already matches the
  // current value, so the chip never nags.
  const clipboard = useClipboardIdentifier({ enabled: !isEditing, currentValue: doi });

  // Escape-to-close. Won't fire when the user is mid-edit in any text input
  // (browsers fire Escape there only after IME composition ends; we still
  // want it).  We allow it on Escape from any focused element so the
  // keyboard-first add flow stays uniform.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      // Don't steal Escape from native dialogs (file picker, autocomplete).
      if ((e.target as HTMLElement | null)?.tagName === 'SELECT') return;
      e.preventDefault();
      onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  // Compute a stable reference id for uploads.  In edit mode we reuse the
  // existing id; in add mode we derive the same doi-based id the server
  // would assign so uploads can happen before the first Save.
  const formRefId = editingRef?.id
    || (doi.trim()
      ? 'doi-' + doi.trim().replace(/^https?:\/\/doi\.org\//, '').replace(/\//g, '-')
      : '');

  // Ask Unpaywall (primary) and then Crossref (fallback) for an open-access
  // PDF URL for the given DOI.  Returns null if nothing free is available.
  const findOpenAccessPdfUrl = async (
    cleanDoi: string,
    crossrefMessage: { link?: Array<{ URL?: string; 'content-type'?: string; 'intended-application'?: string }> },
  ): Promise<string | null> => {
    // 1) Unpaywall — purpose-built for finding free OA PDFs.
    try {
      const resp = await fetch(
        `https://api.unpaywall.org/v2/${encodeURIComponent(cleanDoi)}?email=refs@esabcc.app`,
      );
      if (resp.ok) {
        const data = await resp.json();
        const candidate =
          data?.best_oa_location?.url_for_pdf ||
          (Array.isArray(data?.oa_locations)
            ? data.oa_locations.find((l: { url_for_pdf?: string }) => l.url_for_pdf)?.url_for_pdf
            : null);
        if (candidate) return candidate;
      }
    } catch {
      // ignore and fall through
    }
    // 2) Crossref link[] — often paywalled, but worth a try as a fallback.
    const links = crossrefMessage.link || [];
    const pdfLink = links.find(l => (l['content-type'] || '').toLowerCase().includes('pdf'));
    return pdfLink?.URL || null;
  };

  // Download an open-access PDF through our server proxy (to avoid CORS)
  // and upload it to Supabase Storage.  Reports progress via pdfStatus.
  const tryAutoFetchPdf = async (
    refId: string,
    cleanDoi: string,
    crossrefMessage: { link?: Array<{ URL?: string; 'content-type'?: string; 'intended-application'?: string }> },
  ) => {
    if (!refId) {
      setPdfStatus('Enter a DOI first so we know where to store the PDF.');
      return;
    }
    setPdfBusy(true);
    setPdfStatus('Searching Unpaywall for an open-access PDF...');
    try {
      const candidateUrl = await findOpenAccessPdfUrl(cleanDoi, crossrefMessage);
      if (!candidateUrl) {
        setPdfStatus('No open-access PDF found on Unpaywall or Crossref. Upload manually if you have one.');
        return;
      }
      setPdfStatus(`Downloading open-access PDF from ${new URL(candidateUrl).hostname}...`);
      const proxyResp = await fetch(
        `/api/references/fetch-pdf?url=${encodeURIComponent(candidateUrl)}`,
      );
      if (!proxyResp.ok) {
        const data = await proxyResp.json().catch(() => ({}));
        setPdfStatus(`Auto-download failed: ${data.error || proxyResp.statusText}. Upload manually.`);
        return;
      }
      const blob = await proxyResp.blob();
      setPdfStatus('Uploading PDF to storage...');
      const result = await uploadPdf(refId, blob);
      if (!result.ok) {
        setPdfStatus(`Storage upload failed: ${result.error}`);
        return;
      }
      setPdfUrl(result.publicUrl || '');
      setPdfStatus('PDF auto-downloaded and stored. Click Save Changes to persist.');
    } catch (e) {
      setPdfStatus(`Auto-download error: ${(e as Error).message}`);
    } finally {
      setPdfBusy(false);
    }
  };

  // Manual retry button so the user can try again without re-running the
  // whole DOI lookup (e.g. after Unpaywall data becomes available).
  const retryAutoFetchPdf = async () => {
    const cleanDoi = doi.trim().replace(/^https?:\/\/doi\.org\//, '');
    if (!cleanDoi) {
      setPdfStatus('Enter a DOI first.');
      return;
    }
    // Re-fetch Crossref just to pass the same message shape to the helper.
    let crossrefMessage: { link?: Array<{ URL?: string; 'content-type'?: string }> } = {};
    try {
      const resp = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`);
      if (resp.ok) {
        const data = await resp.json();
        crossrefMessage = data?.message || {};
      }
    } catch {
      // ignore
    }
    await tryAutoFetchPdf(formRefId, cleanDoi, crossrefMessage);
  };

  const handlePdfFileChange = async (file: File | null) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setPdfStatus('Only PDF files are allowed.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setPdfStatus('PDF too large (max 50 MB).');
      return;
    }
    if (!formRefId) {
      setPdfStatus('Enter a title and DOI (or save the reference) before uploading a PDF.');
      return;
    }
    setPdfBusy(true);
    setPdfStatus('Uploading PDF...');
    const result = await uploadPdf(formRefId, file);
    setPdfBusy(false);
    if (!result.ok) {
      setPdfStatus(`Upload failed: ${result.error}`);
      return;
    }
    setPdfUrl(result.publicUrl || '');
    setPdfStatus(isEditing ? 'PDF uploaded. Click Save Changes to persist.' : 'PDF uploaded. Click Save Reference to persist.');
  };

  const handlePdfRemove = async () => {
    if (!formRefId) return;
    if (!confirm('Remove the uploaded PDF?')) return;
    setPdfBusy(true);
    const result = await deletePdf(formRefId);
    setPdfBusy(false);
    if (!result.ok) {
      setPdfStatus(`Delete failed: ${result.error}`);
      return;
    }
    setPdfUrl('');
    setPdfStatus('PDF removed. Click Save to persist.');
  };

  const lookupDoi = async () => {
    const cleanDoi = doi.trim().replace(/^https?:\/\/doi\.org\//, '');
    if (!cleanDoi) {
      setDoiError('Enter a DOI first');
      return;
    }
    setDoiLoading(true);
    setDoiError('');
    try {
      const resp = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`);
      if (!resp.ok) throw new Error('DOI not found');
      const data = await resp.json();
      const item = data.message;

      // Title
      if (item.title?.[0]) setTitle(item.title[0]);

      // Authors
      if (item.author?.length) {
        const authorStr = item.author
          .map((a: { family?: string; given?: string }) =>
            a.family && a.given ? `${a.family}, ${a.given}` : a.family || a.given || '')
          .filter(Boolean)
          .join('; ');
        setAuthors(authorStr);
      }

      // Year
      if (item.published?.['date-parts']?.[0]?.[0]) {
        setYear(String(item.published['date-parts'][0][0]));
      } else if (item['published-print']?.['date-parts']?.[0]?.[0]) {
        setYear(String(item['published-print']['date-parts'][0][0]));
      } else if (item.issued?.['date-parts']?.[0]?.[0]) {
        setYear(String(item.issued['date-parts'][0][0]));
      }

      // Journal
      if (item['container-title']?.[0]) setJournal(item['container-title'][0]);

      // Type mapping
      const typeMap: Record<string, string> = {
        'journal-article': 'article-journal',
        'book-chapter': 'chapter',
        'proceedings-article': 'paper-conference',
        'book': 'book',
        'report': 'report',
        'monograph': 'book',
      };
      if (item.type) setRefType(typeMap[item.type] || 'article-journal');

      // Volume, issue, pages
      if (item.volume) setVolume(item.volume);
      if (item.issue) setIssue(item.issue);
      if (item.page) setPages(item.page);

      // URL
      if (item.URL) setUrl(item.URL);

      // Funding — Crossref returns funder[] with name/DOI/award. Round-trip
      // through the same textarea format so the user can edit/append.
      if (Array.isArray(item.funder) && item.funder.length > 0) {
        const funders: FundingEntry[] = item.funder.map((f: { name?: string; DOI?: string; award?: string[] }) => ({
          name: f.name || '',
          doi: f.DOI || undefined,
          awards: Array.isArray(f.award) ? f.award.filter(Boolean) : undefined,
        })).filter((f: FundingEntry) => f.name);
        if (funders.length > 0) {
          setFundingText(funders.map(formatFundingLine).join('\n'));
        }
      }

      // Clean DOI
      setDoi(cleanDoi);

      // Fire-and-forget: try to grab an open-access PDF in the background.
      // Uses the doi-derived refId so this works in add mode too.
      const refId = editingRef?.id || 'doi-' + cleanDoi.replace(/\//g, '-');
      void tryAutoFetchPdf(refId, cleanDoi, item);
    } catch {
      setDoiError('Could not find reference for this DOI. Check the DOI and try again.');
    } finally {
      setDoiLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const id = editingRef?.id || 'custom-' + Date.now();
    const yearNum = year ? parseInt(year, 10) : null;
    const funding = parseFundingText(fundingText);

    const ref: Reference = {
      id,
      library_id: editingRef?.library_id || STATIC_LIBRARY_ID,
      csl_json: {
        id,
        type: refType as Reference['csl_json']['type'],
        title: title.trim(),
        author: [{ family: authors.trim(), given: '', literal: authors.trim() }],
        issued: yearNum ? { 'date-parts': [[yearNum]] } : undefined,
        'container-title': journal || undefined,
        volume: volume || undefined,
        issue: issue || undefined,
        page: pages || undefined,
        DOI: doi || undefined,
        URL: url || undefined,
        funder: funding.length > 0 ? funding : undefined,
      },
      item_type: refType,
      title: title.trim(),
      authors: [{ family: authors.trim(), given: '', literal: authors.trim() }],
      year: yearNum,
      doi: doi || null,
      abstract: editingRef?.abstract ?? null,
      container_title: journal || null,
      citation_key: editingRef?.citation_key ?? null,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : null,
      notes: notes || null,
      pdf_url: pdfUrl || null,
      funding: funding.length > 0 ? funding : null,
      created_at: editingRef?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: editingRef?.created_by ?? null,
    };

    onSave(ref);
  };

  const inputClass = "w-full px-3 py-2 bg-white border border-grey-200 rounded-lg text-tertiary-dark text-sm focus:outline-none focus:border-primary";
  const labelClass = "block text-sm font-medium text-tertiary-dark mb-1";

  return (
    <div className="bg-white border border-grey-200 shadow-sm rounded-xl p-6 mb-4">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h3 className="text-lg font-semibold">{isEditing ? 'Edit Reference' : 'Add New Reference'}</h3>
          {isEditing && editingRef?.id && (
            <p className="text-xs text-tertiary font-mono mt-0.5">id: {editingRef.id}</p>
          )}
        </div>
        {isEditing && onShare && (
          <button
            type="button"
            onClick={onShare}
            className="px-3 py-1.5 bg-grey-100 hover:bg-grey-200 text-tertiary-dark text-sm rounded-lg border border-grey-200 whitespace-nowrap"
            title="Copy a shareable link to this reference"
          >
            Share link
          </button>
        )}
      </div>

      {/* DOI Magic Wand - prominent at top */}
      <div className="bg-white border border-grey-200 rounded-lg p-4 mb-5">
        <label className="block text-sm font-medium text-tertiary-dark mb-2">Quick Add via DOI</label>
        {/* Live preview region: shimmering Skeleton.Card while Crossref resolves,
            then a populated card matching the citation shape so the user sees
            the metadata land progressively (Doherty: <400 ms first paint). */}
        <div aria-live="polite" className="mb-3">
          {doiLoading && (
            <div role="status" aria-label="Resolving DOI" className="flex flex-col gap-2 p-3 rounded-lg border border-[var(--mh-border)] bg-[var(--mh-bg)]">
              <Skeleton.Heading width="55%" />
              <Skeleton.Line width="92%" />
              <Skeleton.Line width="78%" />
              <div className="flex gap-2 pt-1">
                <Skeleton.Block width={56} height={16} rounded="pill" />
                <Skeleton.Block width={72} height={16} rounded="pill" />
              </div>
            </div>
          )}
          {!doiLoading && !doiError && (title || authors || journal || year) && doi && (
            <div className="flex flex-col gap-1 p-3 rounded-lg border border-[var(--mh-status-success)] bg-[var(--mh-status-success-bg)] mh-ring-pulse">
              {title && (
                <p className="font-semibold text-[var(--mh-fg)]" style={{ fontSize: 'var(--mh-text-md)', lineHeight: 'var(--mh-leading-snug)' }}>
                  {title}
                </p>
              )}
              {(authors || year) && (
                <p className="text-[var(--mh-muted)]" style={{ fontSize: 'var(--mh-text-sm)' }}>
                  {authors}{authors && year ? ' · ' : ''}<span className="mh-tnum">{year}</span>
                </p>
              )}
              {journal && (
                <p className="text-[var(--mh-muted)] italic" style={{ fontSize: 'var(--mh-text-xs)' }}>
                  {journal}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <input
            className={inputClass}
            value={doi}
            onChange={e => { setDoi(e.target.value); setDoiError(''); }}
            onFocus={() => { void clipboard.check(); }}
            placeholder="Paste a DOI (e.g. 10.1038/s41558-020-0783-3)"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); lookupDoi(); }}}
          />
          <button
            type="button"
            onClick={lookupDoi}
            disabled={doiLoading}
            className="px-4 py-2 bg-accent-orange hover:bg-accent-orange disabled:bg-grey-200 text-white text-sm rounded-lg whitespace-nowrap flex items-center gap-2 font-medium"
          >
            {doiLoading ? (
              <span className="animate-pulse">Looking up...</span>
            ) : (
              <><span className="text-lg leading-none">&#9733;</span> Auto-fill from DOI</>
            )}
          </button>
        </div>
        {/* Smart-paste chip — appears when the clipboard contains a DOI / arXiv / ISBN
            that isn't already in the field. One-tap accepts and immediately runs the
            lookup so the user is back to a single keystroke flow. */}
        {clipboard.identifier && (
          <div className="mt-2 flex items-center gap-2" role="region" aria-label="Smart paste suggestion">
            <button
              type="button"
              onClick={() => {
                const id = clipboard.identifier!;
                setDoi(id.canonical);
                clipboard.dismiss();
                // Only auto-lookup for DOI; arXiv/ISBN need a different resolver
                // and we don't want to surprise the user with a silent fail.
                if (id.kind === 'doi') {
                  setTimeout(() => { void lookupDoi(); }, 0);
                }
              }}
              className="mh-focus mh-motion-fast inline-flex items-center gap-1.5 rounded-full border border-[var(--mh-status-primary)] bg-[var(--mh-status-primary-bg)] text-[var(--mh-status-primary)] px-2.5 py-1 text-xs font-semibold"
            >
              <span aria-hidden="true">📋</span>
              Paste {clipboard.identifier.kind === 'doi' ? 'DOI' : clipboard.identifier.kind === 'arxiv' ? 'arXiv' : 'ISBN'}{' '}
              <span className="font-mono mh-tnum truncate max-w-[260px]">{clipboard.identifier.canonical}</span>
            </button>
            <button
              type="button"
              onClick={clipboard.dismiss}
              className="mh-focus text-xs text-[var(--mh-muted)] hover:text-[var(--mh-fg)]"
              aria-label="Dismiss smart-paste suggestion"
            >
              Dismiss
            </button>
          </div>
        )}
        {doiError && <p className="text-accent-red text-sm mt-2">{doiError}</p>}
        <p className="text-tertiary text-xs mt-2">Enter a DOI and click the button to automatically fill all fields below.</p>
      </div>

      {/* PDF section */}
      <div className="bg-white border border-grey-200 rounded-lg p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-tertiary-dark">PDF</label>
          {doi.trim() && (
            <button
              type="button"
              onClick={retryAutoFetchPdf}
              disabled={pdfBusy}
              className="text-xs px-2 py-1 bg-grey-100 hover:bg-grey-200 text-tertiary-dark rounded border border-grey-200"
              title="Try Unpaywall and Crossref again for a free open-access PDF"
            >
              {pdfBusy ? 'Working...' : 'Try auto-download'}
            </button>
          )}
        </div>
        {pdfUrl && (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white text-sm rounded-lg"
            >
              View PDF
            </a>
            {formRefId && (
              <Link
                href={`/references/annotate/?id=${encodeURIComponent(formRefId)}`}
                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-sm rounded-lg border border-primary/20"
                title="Open the PDF in the inline annotation viewer"
              >
                Annotate PDF
              </Link>
            )}
            <a
              href={pdfUrl}
              download
              className="px-3 py-1.5 bg-grey-100 hover:bg-grey-200 text-tertiary-dark text-sm rounded-lg border border-grey-200"
            >
              Download
            </a>
            <label className="px-3 py-1.5 bg-grey-100 hover:bg-grey-200 text-tertiary-dark text-sm rounded-lg border border-grey-200 cursor-pointer">
              Replace
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={e => handlePdfFileChange(e.target.files?.[0] || null)}
                disabled={pdfBusy}
              />
            </label>
            <button
              type="button"
              onClick={handlePdfRemove}
              disabled={pdfBusy}
              className="px-3 py-1.5 bg-accent-red hover:opacity-90 text-white text-sm rounded-lg"
            >
              Remove
            </button>
          </div>
        )}
        {!pdfUrl && (
          <label
            onDragOver={(e) => {
              if (!formRefId || pdfBusy) return;
              e.preventDefault();
              const item = e.dataTransfer?.items?.[0];
              const isPdf = item ? (item.type === 'application/pdf') : true;
              setDragState(isPdf ? 'valid' : 'invalid');
            }}
            onDragLeave={() => setDragState('idle')}
            onDrop={(e) => {
              e.preventDefault();
              setDragState('idle');
              if (!formRefId || pdfBusy) return;
              const file = e.dataTransfer?.files?.[0];
              if (file) handlePdfFileChange(file);
            }}
            className={`mh-motion-fast flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-lg text-sm ${
              !formRefId
                ? 'border-[var(--mh-border)] text-[var(--mh-muted)] cursor-not-allowed'
                : dragState === 'valid'
                  ? 'border-[var(--mh-status-success)] bg-[var(--mh-status-success-bg)] text-[var(--mh-status-success)] cursor-copy'
                  : dragState === 'invalid'
                    ? 'border-[var(--mh-status-warning)] bg-[var(--mh-status-warning-bg)] text-[var(--mh-status-warning)] cursor-not-allowed'
                    : 'border-[var(--mh-border)] cursor-pointer hover:border-[var(--mh-status-primary)] text-[var(--mh-muted)]'
            }`}
          >
            <span>
              {pdfBusy
                ? 'Working…'
                : !formRefId
                  ? 'Enter a DOI or save the reference first'
                  : dragState === 'valid'
                    ? 'Release to import'
                    : dragState === 'invalid'
                      ? 'Only PDF files are accepted'
                      : 'Drop a PDF here, or click to upload (max 50 MB)'}
            </span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={e => handlePdfFileChange(e.target.files?.[0] || null)}
              disabled={pdfBusy || !formRefId}
            />
          </label>
        )}
        {pdfStatus && (
          <p className={`text-xs mt-2 ${pdfStatus.toLowerCase().includes('fail') || pdfStatus.toLowerCase().includes('error') || pdfStatus.toLowerCase().includes('no open-access') ? 'text-accent-red' : 'text-tertiary'}`}>
            {pdfStatus}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Title *</label>
            <input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Authors</label>
            <input className={inputClass} value={authors} onChange={e => setAuthors(e.target.value)} placeholder="e.g. Edenhofer, O.; Flachsland, C." />
          </div>
          <div>
            <label className={labelClass}>Year</label>
            <input className={inputClass} value={year} onChange={e => setYear(e.target.value)} placeholder="2024" />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select className={inputClass} value={refType} onChange={e => setRefType(e.target.value)}>
              <option value="article-journal">Journal Article</option>
              <option value="book">Book</option>
              <option value="chapter">Book Chapter</option>
              <option value="report">Report</option>
              <option value="webpage">Webpage</option>
              <option value="legislation">Legislation</option>
              <option value="paper-conference">Conference Paper</option>
              <option value="thesis">Thesis</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Journal / Container</label>
            <input className={inputClass} value={journal} onChange={e => setJournal(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>URL</label>
            <input className={inputClass} value={url} onChange={e => setUrl(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Volume</label>
            <input className={inputClass} value={volume} onChange={e => setVolume(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Issue</label>
            <input className={inputClass} value={issue} onChange={e => setIssue(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Pages</label>
            <input className={inputClass} value={pages} onChange={e => setPages(e.target.value)} placeholder="e.g. 123-145" />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>
              Funding{' '}
              <span className="text-[10px] text-tertiary font-normal">
                (one per line: <code>Name | DOI prefix | award1, award2</code>; auto-filled from DOI)
              </span>
            </label>
            <textarea
              className={inputClass + " font-mono text-xs"}
              rows={2}
              value={fundingText}
              onChange={e => setFundingText(e.target.value)}
              placeholder="European Commission | 10.13039/501100000780 | 101081244"
            />
            {parseFundingText(fundingText).some(isEuFunder) && (
              <p className="mt-1 text-[10px] text-[#007B6C] font-semibold">EU-funded</p>
            )}
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Tags (comma-separated)</label>
            <input className={inputClass} value={tags} onChange={e => setTags(e.target.value)} placeholder="climate, policy, adaptation" />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea className={inputClass + " h-20"} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-between items-center pt-2">
          <div>
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="px-4 py-2 bg-accent-red hover:opacity-90 text-white text-sm rounded-lg"
              >
                Delete Reference
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 bg-grey-100 hover:bg-grey-200 text-tertiary-dark text-sm rounded-lg border border-grey-200">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm rounded-lg">
              {isEditing ? 'Save Changes' : 'Save Reference'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Backfill metadata button: triggers POST /api/references/library/backfill,
// which walks every custom reference and fills in missing fields from
// CrossRef.  Shows a quick summary so the admin can see what changed.
// ---------------------------------------------------------------------------
function BackfillButton({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  async function handleClick() {
    if (busy) return;
    if (!confirm(
      'Backfill missing metadata for all custom references via CrossRef?\n\n' +
      'This may take up to a minute and will create a single GitHub commit.'
    )) return;

    setBusy(true);
    setSummary(null);
    try {
      const resp = await fetch('/api/references/library/backfill', {
        method: 'POST',
      });
      const data = await resp.json();
      if (!resp.ok) {
        setSummary(`Error: ${data.error || resp.statusText}`);
      } else {
        setSummary(
          `Scanned ${data.scanned} · Updated ${data.updated} · ` +
          `No DOI ${data.skippedNoDoi} · Not found ${data.notFound}` +
          (data.persisted === false && data.persistError
            ? ` · Persist failed: ${data.persistError}`
            : '')
        );
        if (data.updated > 0) onDone();
      }
    } catch (err) {
      setSummary(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
      // Auto-clear summary after 12s
      setTimeout(() => setSummary(null), 12000);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={busy}
        title="Fetch missing fields (authors, year, journal, …) from CrossRef for every reference with a DOI"
        className="px-3 py-2 bg-grey-100 hover:bg-grey-200 text-tertiary-dark text-sm rounded-lg border border-grey-200 disabled:opacity-60"
      >
        {busy ? 'Backfilling…' : 'Backfill metadata'}
      </button>
      {summary && (
        <div className="absolute right-0 mt-1 max-w-xs px-3 py-2 bg-white border border-grey-200 rounded-lg shadow-md text-xs text-tertiary-dark z-10">
          {summary}
        </div>
      )}
    </div>
  );
}
