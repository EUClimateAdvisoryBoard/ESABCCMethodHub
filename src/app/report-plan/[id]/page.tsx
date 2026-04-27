'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import PageHero from '@/components/PageHero';
import { getPlan, savePlan } from '@/lib/report-plans/client';
import type {
  PlanReference,
  ReportPlan,
  ReportSection,
} from '@/lib/report-plans/types';
import { downloadDocx } from '@/lib/report-plans/word-export';

// Shape returned by /api/references/library.  Same as the web references
// fallback loader in src/app/references/page.tsx but reduced to the fields we
// need for picking references into a plan.
interface LibraryRef {
  id: string;
  doi: string;
  title: string;
  authors: string;
  year: string;
  journal: string;
  type: string;
  volume: string;
  issue: string;
  pages: string;
  url: string;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function fetchLibrary(): Promise<LibraryRef[]> {
  try {
    const resp = await fetch('/api/references/library', { cache: 'no-store' });
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data.references) ? data.references : [];
  } catch {
    return [];
  }
}

async function postRefToLibrary(ref: PlanReference): Promise<void> {
  try {
    await fetch('/api/references/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doi: ref.doi || '',
        title: ref.title,
        authors: ref.authors,
        year: ref.year,
        journal: ref.journal || '',
        type: ref.type || 'article-journal',
        volume: ref.volume || '',
        issue: ref.issue || '',
        pages: ref.pages || '',
        url: ref.url || '',
        fullCitation: ref.fullCitation || '',
        source: 'web',
      }),
    });
  } catch {
    // best-effort
  }
}

function libraryToPlanRef(r: LibraryRef): PlanReference {
  return {
    id: r.id,
    doi: r.doi || undefined,
    title: r.title,
    authors: r.authors,
    year: r.year,
    journal: r.journal || undefined,
    type: r.type || undefined,
    volume: r.volume || undefined,
    issue: r.issue || undefined,
    pages: r.pages || undefined,
    url: r.url || undefined,
  };
}

// Crossref types we care about.
interface CrossrefAuthor {
  family?: string;
  given?: string;
}
interface CrossrefMessage {
  title?: string[];
  author?: CrossrefAuthor[];
  published?: { 'date-parts'?: number[][] };
  'published-print'?: { 'date-parts'?: number[][] };
  issued?: { 'date-parts'?: number[][] };
  'container-title'?: string[];
  type?: string;
  volume?: string;
  issue?: string;
  page?: string;
  URL?: string;
}

async function lookupDoi(doi: string): Promise<PlanReference | null> {
  const clean = doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//, '').replace(/^doi:\s*/i, '');
  if (!clean) return null;
  const resp = await fetch(`https://api.crossref.org/works/${encodeURIComponent(clean)}`);
  if (!resp.ok) return null;
  const data = await resp.json();
  const m: CrossrefMessage = data?.message || {};
  const authorStr = (m.author || [])
    .map(a => (a.family && a.given ? `${a.family}, ${a.given}` : a.family || a.given || ''))
    .filter(Boolean)
    .join('; ');
  const year =
    m.published?.['date-parts']?.[0]?.[0] ||
    m['published-print']?.['date-parts']?.[0]?.[0] ||
    m.issued?.['date-parts']?.[0]?.[0];
  const typeMap: Record<string, string> = {
    'journal-article': 'article-journal',
    'book-chapter': 'chapter',
    'proceedings-article': 'paper-conference',
    'book': 'book',
    'report': 'report',
    'monograph': 'book',
  };
  return {
    id: 'doi-' + clean.replace(/\//g, '-'),
    doi: clean,
    title: m.title?.[0] || '',
    authors: authorStr,
    year: year ? String(year) : '',
    journal: m['container-title']?.[0] || '',
    type: typeMap[m.type || ''] || 'article-journal',
    volume: m.volume || '',
    issue: m.issue || '',
    pages: m.page || '',
    url: m.URL || '',
  };
}

export default function ReportPlanEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  const [plan, setPlan] = useState<ReportPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Reference-adding UI state
  const [showAdd, setShowAdd] = useState<string | null>(null); // section id
  const [addMode, setAddMode] = useState<'doi' | 'manual' | 'library'>('doi');
  const [doiInput, setDoiInput] = useState('');
  const [doiLoading, setDoiLoading] = useState(false);
  const [doiError, setDoiError] = useState('');
  const [manualRef, setManualRef] = useState<PlanReference>({
    id: '',
    title: '',
    authors: '',
    year: '',
  });
  const [librarySearch, setLibrarySearch] = useState('');
  const [library, setLibrary] = useState<LibraryRef[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);

  // ── Load plan ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      setLoading(true);
      const loaded = await getPlan(id);
      if (!cancelled) {
        setPlan(loaded);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // ── Lazy-load library when user opens the "From library" tab ─────────────
  useEffect(() => {
    if (showAdd && addMode === 'library' && library.length === 0) {
      setLibraryLoading(true);
      fetchLibrary().then(refs => {
        setLibrary(refs);
        setLibraryLoading(false);
      });
    }
  }, [showAdd, addMode, library.length]);

  const updatePlan = useCallback((updater: (p: ReportPlan) => ReportPlan) => {
    setPlan(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      return { ...next, updatedAt: new Date().toISOString() };
    });
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!plan) return;
    setSaving(true);
    const saved = await savePlan(plan);
    setSaving(false);
    if (saved) {
      setDirty(false);
      setToast('Saved.');
      setTimeout(() => setToast(null), 1500);
    } else {
      setToast('Saved locally. Server save failed.');
      setTimeout(() => setToast(null), 3000);
    }
  }, [plan]);

  // Autosave after 2s of inactivity.
  useEffect(() => {
    if (!dirty || !plan) return;
    const t = setTimeout(() => {
      handleSave();
    }, 2000);
    return () => clearTimeout(t);
  }, [dirty, plan, handleSave]);

  // ── Section mutations ────────────────────────────────────────────────────
  const addSection = () => {
    updatePlan(p => ({
      ...p,
      sections: [
        ...p.sections,
        { id: uid('sec'), title: 'New section', description: '', referenceIds: [] },
      ],
    }));
  };

  const updateSection = (sectionId: string, patch: Partial<ReportSection>) => {
    updatePlan(p => ({
      ...p,
      sections: p.sections.map(s => (s.id === sectionId ? { ...s, ...patch } : s)),
    }));
  };

  const removeSection = (sectionId: string) => {
    if (!confirm('Remove this section? References stay in the plan library.')) return;
    updatePlan(p => ({
      ...p,
      sections: p.sections.filter(s => s.id !== sectionId),
    }));
  };

  const moveSection = (sectionId: string, dir: -1 | 1) => {
    updatePlan(p => {
      const idx = p.sections.findIndex(s => s.id === sectionId);
      const newIdx = idx + dir;
      if (idx < 0 || newIdx < 0 || newIdx >= p.sections.length) return p;
      const sections = [...p.sections];
      const [moved] = sections.splice(idx, 1);
      sections.splice(newIdx, 0, moved);
      return { ...p, sections };
    });
  };

  // ── Reference mutations ──────────────────────────────────────────────────
  const attachReferenceToSection = (sectionId: string, ref: PlanReference) => {
    updatePlan(p => {
      const alreadyInPlan = p.references.some(r => r.id === ref.id);
      const references = alreadyInPlan ? p.references : [...p.references, ref];
      const sections = p.sections.map(s => {
        if (s.id !== sectionId) return s;
        if (s.referenceIds.includes(ref.id)) return s;
        return { ...s, referenceIds: [...s.referenceIds, ref.id] };
      });
      return { ...p, references, sections };
    });
  };

  const detachReferenceFromSection = (sectionId: string, refId: string) => {
    updatePlan(p => ({
      ...p,
      sections: p.sections.map(s =>
        s.id === sectionId ? { ...s, referenceIds: s.referenceIds.filter(id => id !== refId) } : s,
      ),
    }));
  };

  const removeReferenceFromPlan = (refId: string) => {
    if (!confirm('Remove this reference from the entire plan? It stays in your library.')) return;
    updatePlan(p => ({
      ...p,
      references: p.references.filter(r => r.id !== refId),
      sections: p.sections.map(s => ({
        ...s,
        referenceIds: s.referenceIds.filter(id => id !== refId),
      })),
    }));
  };

  // ── Add-reference actions ────────────────────────────────────────────────
  const closeAddPanel = () => {
    setShowAdd(null);
    setDoiInput('');
    setDoiError('');
    setManualRef({ id: '', title: '', authors: '', year: '' });
    setLibrarySearch('');
    setAddMode('doi');
  };

  const handleDoiAdd = async () => {
    if (!showAdd) return;
    setDoiError('');
    setDoiLoading(true);
    try {
      const ref = await lookupDoi(doiInput);
      if (!ref || !ref.title) {
        setDoiError('DOI not found. Check the DOI and try again.');
        return;
      }
      attachReferenceToSection(showAdd, ref);
      // Auto-sync to the shared reference library.
      void postRefToLibrary(ref);
      setToast('Reference added (and synced to library).');
      setTimeout(() => setToast(null), 2000);
      closeAddPanel();
    } catch (e) {
      setDoiError(`Lookup failed: ${(e as Error).message}`);
    } finally {
      setDoiLoading(false);
    }
  };

  const handleManualAdd = () => {
    if (!showAdd) return;
    if (!manualRef.title.trim()) {
      setToast('Title is required.');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    const ref: PlanReference = {
      ...manualRef,
      id: manualRef.id || uid('custom'),
      title: manualRef.title.trim(),
      authors: manualRef.authors.trim(),
      year: manualRef.year.trim(),
      type: manualRef.type || 'article-journal',
    };
    attachReferenceToSection(showAdd, ref);
    void postRefToLibrary(ref);
    closeAddPanel();
  };

  const handleLibraryAdd = (r: LibraryRef) => {
    if (!showAdd) return;
    attachReferenceToSection(showAdd, libraryToPlanRef(r));
    closeAddPanel();
  };

  // ── Export ───────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!plan) return;
    // Ensure the latest version is saved before exporting.
    if (dirty) await handleSave();
    try {
      await downloadDocx(plan);
    } catch (e) {
      setToast(`Export failed: ${(e as Error).message}`);
      setTimeout(() => setToast(null), 3000);
    }
  };

  // ── Library filtering ────────────────────────────────────────────────────
  const filteredLibrary = useMemo(() => {
    const q = librarySearch.trim().toLowerCase();
    if (!q) return library.slice(0, 200);
    return library
      .filter(r => {
        const hay = `${r.title} ${r.authors} ${r.year} ${r.doi} ${r.journal}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 200);
  }, [library, librarySearch]);

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader />
        <div className="max-w-[1280px] mx-auto px-4 py-16 text-center text-tertiary">Loading plan…</div>
      </div>
    );
  }
  if (!plan) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader />
        <div className="max-w-[1280px] mx-auto px-4 py-16 text-center">
          <p className="text-lg text-tertiary mb-4">Plan not found.</p>
          <Link href="/report-plan" className="text-primary underline">Back to plans</Link>
        </div>
      </div>
    );
  }

  const referenceById = new Map(plan.references.map(r => [r.id, r]));

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <PageHero
        title={plan.name}
        subtitle={plan.description || 'Outline with section-level references. Download to Word and build from there.'}
      >
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="px-3 py-1.5 bg-white hover:bg-[#E6E7E8] text-[#3D5265] text-xs rounded border border-[#E6E7E8] disabled:opacity-50"
          >
            {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white text-xs rounded"
          >
            Download .docx
          </button>
          <button
            onClick={() => router.push('/report-plan')}
            className="px-3 py-1.5 bg-white hover:bg-[#E6E7E8] text-[#3D5265] text-xs rounded border border-[#E6E7E8]"
          >
            ← All plans
          </button>
        </div>
      </PageHero>

      <div className="max-w-[1280px] mx-auto px-3 sm:px-4 py-6">
        {toast && (
          <div className="mb-4 px-4 py-2 bg-primary/10 border border-primary/30 text-primary text-sm rounded-lg">
            {toast}
          </div>
        )}

        {/* Plan meta editor */}
        <div className="bg-white border border-grey-200 shadow-sm rounded-xl p-5 mb-6">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
            <div>
              <label className="block text-sm font-medium text-tertiary-dark mb-1">Plan name</label>
              <input
                value={plan.name}
                onChange={e => updatePlan(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-grey-200 rounded-lg text-tertiary-dark text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-tertiary-dark mb-1">Description</label>
              <input
                value={plan.description || ''}
                onChange={e => updatePlan(p => ({ ...p, description: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-grey-200 rounded-lg text-tertiary-dark text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {plan.sections.map((section, i) => (
            <div key={section.id} className="bg-white border border-grey-200 shadow-sm rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 pt-1">
                  <button
                    onClick={() => moveSection(section.id, -1)}
                    disabled={i === 0}
                    className="w-6 h-6 text-xs bg-grey-100 hover:bg-grey-200 text-tertiary-dark rounded disabled:opacity-30"
                    title="Move up"
                  >▲</button>
                  <button
                    onClick={() => moveSection(section.id, 1)}
                    disabled={i === plan.sections.length - 1}
                    className="w-6 h-6 text-xs bg-grey-100 hover:bg-grey-200 text-tertiary-dark rounded disabled:opacity-30"
                    title="Move down"
                  >▼</button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3">
                    <input
                      value={section.title}
                      onChange={e => updateSection(section.id, { title: e.target.value })}
                      className="flex-1 text-lg font-semibold text-tertiary-dark bg-transparent border-0 border-b border-transparent hover:border-grey-200 focus:border-primary focus:outline-none"
                    />
                    <button
                      onClick={() => removeSection(section.id)}
                      className="text-tertiary hover:text-accent-red text-xs px-2 py-1"
                      title="Remove section"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    value={section.description || ''}
                    onChange={e => updateSection(section.id, { description: e.target.value })}
                    placeholder="Short description to guide the writer"
                    className="w-full mt-1 text-sm text-tertiary bg-transparent border-0 focus:outline-none"
                  />

                  {/* References in this section */}
                  <div className="mt-3 space-y-2">
                    {section.referenceIds.length === 0 ? (
                      <p className="text-xs text-tertiary italic">No references assigned.</p>
                    ) : (
                      section.referenceIds.map(refId => {
                        const ref = referenceById.get(refId);
                        if (!ref) return null;
                        return (
                          <div
                            key={refId}
                            className="flex items-start justify-between gap-2 px-3 py-2 bg-[#F8F9FA] border border-grey-200 rounded-lg text-sm"
                          >
                            <div className="min-w-0">
                              <p className="text-tertiary-dark font-medium truncate">{ref.title}</p>
                              <p className="text-xs text-tertiary truncate">
                                {ref.authors || 'Unknown author'}
                                {ref.year ? ` (${ref.year})` : ''}
                                {ref.journal ? ` · ${ref.journal}` : ''}
                                {ref.doi ? ` · doi:${ref.doi}` : ''}
                              </p>
                            </div>
                            <button
                              onClick={() => detachReferenceFromSection(section.id, refId)}
                              className="text-xs text-tertiary hover:text-accent-red"
                              title="Detach from this section"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add-reference control */}
                  {showAdd === section.id ? (
                    <div className="mt-3 bg-white border border-grey-200 rounded-lg p-4">
                      <div className="flex gap-1 mb-3">
                        {(['doi', 'manual', 'library'] as const).map(mode => (
                          <button
                            key={mode}
                            onClick={() => setAddMode(mode)}
                            className={`px-3 py-1.5 text-xs rounded ${
                              addMode === mode
                                ? 'bg-primary text-white'
                                : 'bg-grey-100 hover:bg-grey-200 text-tertiary-dark border border-grey-200'
                            }`}
                          >
                            {mode === 'doi' ? 'Via DOI' : mode === 'manual' ? 'Manual' : 'From library'}
                          </button>
                        ))}
                        <button
                          onClick={closeAddPanel}
                          className="ml-auto px-3 py-1.5 text-xs bg-grey-100 hover:bg-grey-200 text-tertiary-dark rounded border border-grey-200"
                        >
                          Close
                        </button>
                      </div>

                      {addMode === 'doi' && (
                        <div>
                          <input
                            value={doiInput}
                            onChange={e => { setDoiInput(e.target.value); setDoiError(''); }}
                            placeholder="10.1038/s41558-020-0783-3"
                            className="w-full px-3 py-2 bg-white border border-grey-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleDoiAdd(); } }}
                          />
                          <button
                            onClick={handleDoiAdd}
                            disabled={doiLoading || !doiInput.trim()}
                            className="mt-2 px-3 py-1.5 bg-primary hover:bg-primary-dark disabled:bg-grey-200 text-white text-sm rounded-lg"
                          >
                            {doiLoading ? 'Looking up…' : 'Fetch from Crossref & add'}
                          </button>
                          {doiError && <p className="text-accent-red text-xs mt-2">{doiError}</p>}
                          <p className="text-xs text-tertiary mt-2">
                            Resolves the DOI via Crossref and auto-adds the record to your shared reference library.
                          </p>
                        </div>
                      )}

                      {addMode === 'manual' && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label className="text-xs text-tertiary-dark">Title *</label>
                            <input
                              value={manualRef.title}
                              onChange={e => setManualRef(r => ({ ...r, title: e.target.value }))}
                              className="w-full px-3 py-2 bg-white border border-grey-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-xs text-tertiary-dark">Authors</label>
                            <input
                              value={manualRef.authors}
                              onChange={e => setManualRef(r => ({ ...r, authors: e.target.value }))}
                              placeholder="Edenhofer, O.; Flachsland, C."
                              className="w-full px-3 py-2 bg-white border border-grey-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-tertiary-dark">Year</label>
                            <input
                              value={manualRef.year}
                              onChange={e => setManualRef(r => ({ ...r, year: e.target.value }))}
                              className="w-full px-3 py-2 bg-white border border-grey-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-tertiary-dark">Journal / Container</label>
                            <input
                              value={manualRef.journal || ''}
                              onChange={e => setManualRef(r => ({ ...r, journal: e.target.value }))}
                              className="w-full px-3 py-2 bg-white border border-grey-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-tertiary-dark">DOI</label>
                            <input
                              value={manualRef.doi || ''}
                              onChange={e => setManualRef(r => ({ ...r, doi: e.target.value }))}
                              className="w-full px-3 py-2 bg-white border border-grey-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-tertiary-dark">URL</label>
                            <input
                              value={manualRef.url || ''}
                              onChange={e => setManualRef(r => ({ ...r, url: e.target.value }))}
                              className="w-full px-3 py-2 bg-white border border-grey-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <button
                              onClick={handleManualAdd}
                              disabled={!manualRef.title.trim()}
                              className="px-3 py-1.5 bg-primary hover:bg-primary-dark disabled:bg-grey-200 text-white text-sm rounded-lg"
                            >
                              Add reference
                            </button>
                          </div>
                        </div>
                      )}

                      {addMode === 'library' && (
                        <div>
                          <input
                            value={librarySearch}
                            onChange={e => setLibrarySearch(e.target.value)}
                            placeholder="Search your reference library by title, author, DOI…"
                            className="w-full px-3 py-2 bg-white border border-grey-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                          />
                          <div className="mt-3 max-h-72 overflow-y-auto divide-y divide-grey-100 border border-grey-200 rounded-lg">
                            {libraryLoading ? (
                              <p className="p-3 text-xs text-tertiary">Loading library…</p>
                            ) : filteredLibrary.length === 0 ? (
                              <p className="p-3 text-xs text-tertiary">No matching references.</p>
                            ) : (
                              filteredLibrary.map(r => {
                                const alreadyInSection = section.referenceIds.includes(r.id);
                                return (
                                  <div
                                    key={r.id}
                                    className="flex items-start justify-between gap-2 p-3 hover:bg-[#F8F9FA]"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-sm text-tertiary-dark font-medium truncate">{r.title}</p>
                                      <p className="text-xs text-tertiary truncate">
                                        {r.authors || 'Unknown author'}
                                        {r.year ? ` (${r.year})` : ''}
                                        {r.journal ? ` · ${r.journal}` : ''}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => handleLibraryAdd(r)}
                                      disabled={alreadyInSection}
                                      className="shrink-0 text-xs px-2 py-1 bg-primary hover:bg-primary-dark disabled:bg-grey-200 text-white rounded"
                                    >
                                      {alreadyInSection ? 'Added' : 'Add'}
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => { setShowAdd(section.id); setAddMode('doi'); }}
                      className="mt-3 px-3 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded border border-primary/20"
                    >
                      + Add reference
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addSection}
          className="mt-4 px-4 py-2 bg-grey-100 hover:bg-grey-200 text-tertiary-dark text-sm rounded-lg border border-grey-200"
        >
          + Add section
        </button>

        {/* Plan-level reference library */}
        {plan.references.length > 0 && (
          <div className="mt-8 bg-white border border-grey-200 shadow-sm rounded-xl p-5">
            <h3 className="text-base font-semibold mb-3">All references in this plan ({plan.references.length})</h3>
            <div className="space-y-2">
              {plan.references.map(r => (
                <div key={r.id} className="flex items-start justify-between gap-2 px-3 py-2 bg-[#F8F9FA] border border-grey-200 rounded-lg text-sm">
                  <div className="min-w-0">
                    <p className="text-tertiary-dark font-medium truncate">{r.title}</p>
                    <p className="text-xs text-tertiary truncate">
                      {r.authors || 'Unknown author'}
                      {r.year ? ` (${r.year})` : ''}
                      {r.journal ? ` · ${r.journal}` : ''}
                      {r.doi ? ` · doi:${r.doi}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => removeReferenceFromPlan(r.id)}
                    className="text-xs text-tertiary hover:text-accent-red"
                    title="Remove from plan"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
