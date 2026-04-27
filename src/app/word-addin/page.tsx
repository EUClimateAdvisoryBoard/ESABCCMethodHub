'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { references, Reference } from '@/data/references';

// ── Types for Office.js (loaded via script tag in layout) ──────────────────
declare global {
  interface Window {
    Office?: {
      initialize: (callback: () => void) => void;
      onReady: (callback: (info: { host: string; platform: string }) => void) => void;
      context?: { document?: unknown };
    };
    Word?: {
      run: (callback: (context: WordContext) => Promise<void>) => Promise<void>;
    };
  }
}

interface WordContext {
  document: {
    getSelection: () => WordRange;
    body: { insertParagraph: (text: string, location: string) => WordParagraph };
  };
  sync: () => Promise<void>;
}

interface WordRange {
  insertText: (text: string, location: string) => WordRange;
  font: { name: string; size: number; color: string; bold: boolean; italic: boolean };
  insertHtml: (html: string, location: string) => WordRange;
}

interface WordParagraph {
  font: { name: string; size: number; color: string; bold: boolean };
}

// ── Constants ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'esabcc-custom-refs';
const PAGE_SIZE = 20;

type InsertMode = 'in-text' | 'full-ref' | 'footnote';
type ViewTab = 'search' | 'selected' | 'settings';

const TYPE_COLORS: Record<string, string> = {
  article: '#004B7F', report: '#D97706', web: '#007B6C',
  chapter: '#7C3AED', legislation: '#B83230', book: '#6667AB',
};

// ── Citation formatters ────────────────────────────────────────────────────
function formatInText(r: Reference): string {
  const name = r.authors.includes('et al.')
    ? r.authors.split(',')[0].trim() + ', et al.'
    : r.authors.split(',')[0].trim();
  return `(${name}, ${r.year})`;
}

function formatEEACitation(r: Reference): string {
  let cite = `${r.authors}, ${r.year}`;
  cite += `, \u2018${r.title}\u2019`;
  if (r.journal) {
    cite += `, ${r.journal}`;
    if (r.volume) cite += ` ${r.volume}`;
    if (r.issue) cite += `(${r.issue})`;
    if (r.pages) cite += `, pp. ${r.pages}`;
  }
  if (r.doi) cite += ` (DOI: ${r.doi})`;
  else if (r.url) cite += ` (${r.url})`;
  cite += '.';
  return cite;
}

function formatFootnote(r: Reference): string {
  let fn = r.authors;
  if (r.journal) fn += `, '${r.title}', ${r.journal}`;
  else fn += `, ${r.title}`;
  fn += ` (${r.year})`;
  if (r.doi) fn += `, DOI: ${r.doi}`;
  fn += '.';
  return fn;
}

// ── Main Component ─────────────────────────────────────────────────────────
function WordAddinInner() {
  const searchParams = useSearchParams();
  const ribbonMode = searchParams.get('mode') || '';

  const [officeReady, setOfficeReady] = useState(false);
  const [officeError, setOfficeError] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [page, setPage] = useState(0);
  const [insertMode, setInsertMode] = useState<InsertMode>(
    ribbonMode === 'footnote' ? 'footnote' : ribbonMode === 'bibliography' ? 'full-ref' : 'in-text'
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<ViewTab>(
    ribbonMode === 'bibliography' ? 'selected'
    : ribbonMode === 'style' ? 'settings'
    : 'search'
  );
  const [lastInserted, setLastInserted] = useState('');
  const [status, setStatus] = useState('');
  const [customRefs, setCustomRefs] = useState<Reference[]>([]);
  const [doiInput, setDoiInput] = useState('');
  const [doiLoading, setDoiLoading] = useState(false);
  const [doiResult, setDoiResult] = useState<Record<string, string> | null>(null);
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discoverResults, setDiscoverResults] = useState<Array<{id: string; title: string; authors: string; year: number | null; journal: string | null; citationCount: number; doi: string | null; url: string | null}>>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);

  // Load custom refs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setCustomRefs(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const allRefs = useMemo(() => [...references, ...customRefs], [customRefs]);

  // Initialize Office.js
  useEffect(() => {
    const initOffice = () => {
      if (window.Office) {
        window.Office.onReady((info) => {
          console.log('Office.js ready:', info);
          setOfficeReady(true);
        });
      } else {
        // Retry — Office.js script might still be loading
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (window.Office) {
            clearInterval(interval);
            window.Office.onReady(() => setOfficeReady(true));
          } else if (attempts > 20) {
            clearInterval(interval);
            setOfficeError(true);
          }
        }, 500);
      }
    };
    // Small delay to let script load
    setTimeout(initOffice, 100);
  }, []);

  // Filter references
  const filtered = useMemo(() => {
    let list = allRefs;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.authors.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        (r.journal || '').toLowerCase().includes(q) ||
        (r.doi || '').toLowerCase().includes(q)
      );
    }
    if (typeFilter !== 'all') list = list.filter(r => r.type === typeFilter);
    if (yearFrom) list = list.filter(r => parseInt(r.year) >= parseInt(yearFrom));
    if (yearTo) list = list.filter(r => parseInt(r.year) <= parseInt(yearTo));
    return list;
  }, [allRefs, search, typeFilter, yearFrom, yearTo]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const selectedRefs = allRefs.filter(r => selected.has(r.id));

  // Insert text into Word document
  const insertIntoWord = useCallback(async (text: string) => {
    if (!window.Word) {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(text);
      setStatus('Copied to clipboard (Office.js not available)');
      setTimeout(() => setStatus(''), 3000);
      return;
    }

    try {
      await window.Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.insertText(text, 'Replace');
        await context.sync();
      });
      setStatus('Inserted into document');
      setLastInserted(text.substring(0, 50) + (text.length > 50 ? '...' : ''));
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      console.error('Insert error:', err);
      // Fallback to clipboard
      await navigator.clipboard.writeText(text);
      setStatus('Copied to clipboard (insert failed)');
      setTimeout(() => setStatus(''), 3000);
    }
  }, []);

  // Insert a single reference in the selected mode
  const insertReference = useCallback((ref: Reference) => {
    let text: string;
    switch (insertMode) {
      case 'in-text': text = formatInText(ref); break;
      case 'full-ref': text = formatEEACitation(ref); break;
      case 'footnote': text = formatFootnote(ref); break;
    }
    insertIntoWord(text);
  }, [insertMode, insertIntoWord]);

  // Insert bibliography for selected references
  const insertBibliography = useCallback(() => {
    const refs = [...selectedRefs].sort((a, b) => a.authors.localeCompare(b.authors));
    const bib = refs.map(r => formatEEACitation(r)).join('\n\n');
    insertIntoWord(bib);
  }, [selectedRefs, insertIntoWord]);

  // Insert multiple in-text citations
  const insertMultipleCitations = useCallback(() => {
    const refs = [...selectedRefs].sort((a, b) => a.authors.localeCompare(b.authors));
    const text = '(' + refs.map(r => {
      const name = r.authors.includes('et al.')
        ? r.authors.split(',')[0].trim() + ', et al.'
        : r.authors.split(',')[0].trim();
      return `${name}, ${r.year}`;
    }).join('; ') + ')';
    insertIntoWord(text);
  }, [selectedRefs, insertIntoWord]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  return (
    <div className="min-h-screen bg-white text-[13px]" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#D97706] text-white px-3 py-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          </svg>
          <span className="font-bold text-sm">ESABCC References</span>
          <span className="ml-auto text-[10px] opacity-70">{allRefs.length.toLocaleString()} refs</span>
        </div>
      </div>

      {/* Status bar */}
      {status && (
        <div className="bg-green-50 border-b border-green-200 px-3 py-1.5 text-[11px] text-green-700 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
          {status}
        </div>
      )}

      {/* Office.js status */}
      {!officeReady && !officeError && (
        <div className="bg-blue-50 border-b border-blue-200 px-3 py-1.5 text-[11px] text-blue-600 flex items-center gap-1.5">
          <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
          Connecting to Word...
        </div>
      )}
      {officeError && (
        <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 text-[11px] text-amber-700">
          Standalone mode — citations will be copied to clipboard
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {([['search', 'Search'], ['selected', `Selected (${selected.size})`], ['settings', 'Settings']] as [ViewTab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 px-2 py-2 text-[11px] font-medium transition ${
              tab === key ? 'border-b-2 border-[#D97706] text-[#D97706]' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ═══ SEARCH TAB ═══ */}
      {tab === 'search' && (
        <div className="p-3">
          {/* Insert mode selector */}
          <div className="flex gap-1 mb-2.5">
            {([['in-text', 'In-Text'], ['full-ref', 'Full Ref'], ['footnote', 'Footnote']] as [InsertMode, string][]).map(([mode, label]) => (
              <button key={mode} onClick={() => setInsertMode(mode)}
                className={`flex-1 px-2 py-1.5 rounded text-[11px] font-medium transition ${
                  insertMode === mode
                    ? 'bg-[#D97706] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search authors, title, DOI..."
            className="w-full px-2.5 py-2 border border-gray-300 rounded text-[12px] mb-2 focus:ring-1 focus:ring-[#D97706] focus:border-[#D97706] outline-none" />

          {/* Compact filters */}
          <div className="flex gap-1.5 mb-2">
            <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(0); }}
              className="flex-1 px-1.5 py-1 border border-gray-300 rounded text-[11px]">
              <option value="all">All types</option>
              {['article','report','web','chapter','legislation','book'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input value={yearFrom} onChange={e => { setYearFrom(e.target.value); setPage(0); }}
              placeholder="From" className="w-16 px-1.5 py-1 border border-gray-300 rounded text-[11px]" />
            <input value={yearTo} onChange={e => { setYearTo(e.target.value); setPage(0); }}
              placeholder="To" className="w-16 px-1.5 py-1 border border-gray-300 rounded text-[11px]" />
          </div>

          <p className="text-[10px] text-gray-400 mb-2">{filtered.length.toLocaleString()} results</p>

          {/* Results */}
          <div className="space-y-1">
            {pageItems.map(ref => (
              <div key={ref.id}
                className="border border-gray-200 rounded p-2 hover:border-[#D97706]/50 transition group">
                <div className="flex items-start gap-1.5">
                  <input type="checkbox" checked={selected.has(ref.id)}
                    onChange={() => toggleSelect(ref.id)}
                    className="mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-gray-800 leading-tight line-clamp-2">{ref.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {ref.authors.length > 50 ? ref.authors.substring(0, 50) + '...' : ref.authors} ({ref.year})
                    </p>
                    {ref.journal && <p className="text-[10px] text-gray-400 italic">{ref.journal}</p>}
                  </div>
                  <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded text-white font-medium"
                    style={{ backgroundColor: TYPE_COLORS[ref.type] || '#6B7280' }}>
                    {ref.type}
                  </span>
                </div>
                {/* Quick insert button */}
                <div className="flex gap-1 mt-1.5">
                  <button onClick={() => insertReference(ref)}
                    className="flex-1 px-2 py-1 bg-[#D97706] text-white rounded text-[10px] font-medium hover:bg-[#B45309] transition">
                    {insertMode === 'in-text' ? `Insert ${formatInText(ref)}` :
                     insertMode === 'full-ref' ? 'Insert Full Reference' :
                     'Insert Footnote'}
                  </button>
                  <button onClick={() => toggleSelect(ref.id)}
                    className={`px-2 py-1 rounded text-[10px] font-medium transition ${
                      selected.has(ref.id)
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {selected.has(ref.id) ? '-' : '+'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                className="px-2 py-1 text-[10px] rounded border disabled:opacity-30">Prev</button>
              <span className="text-[10px] text-gray-400">{page + 1} / {pageCount}</span>
              <button disabled={page >= pageCount - 1} onClick={() => setPage(p => p + 1)}
                className="px-2 py-1 text-[10px] rounded border disabled:opacity-30">Next</button>
            </div>
          )}
        </div>
      )}

      {/* ═══ SELECTED TAB ═══ */}
      {tab === 'selected' && (
        <div className="p-3">
          {selectedRefs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[12px] text-gray-400">No references selected.</p>
              <p className="text-[11px] text-gray-400 mt-1">Use checkboxes in Search to add references.</p>
            </div>
          ) : (
            <>
              {/* Batch actions */}
              <div className="space-y-1.5 mb-4">
                <button onClick={insertMultipleCitations}
                  className="w-full px-3 py-2 bg-[#D97706] text-white rounded text-[12px] font-medium hover:bg-[#B45309] transition">
                  Insert Combined Citation ({selectedRefs.length} refs)
                </button>
                <button onClick={insertBibliography}
                  className="w-full px-3 py-2 bg-[#004B7F] text-white rounded text-[12px] font-medium hover:bg-[#003a63] transition">
                  Insert Bibliography (EEA Style)
                </button>
                <button onClick={() => setSelected(new Set())}
                  className="w-full px-3 py-2 bg-gray-100 text-gray-600 rounded text-[12px] font-medium hover:bg-gray-200 transition">
                  Clear Selection
                </button>
              </div>

              {/* Preview */}
              <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Preview: Combined Citation</h3>
              <div className="bg-gray-50 rounded p-2 mb-3">
                <p className="text-[12px] text-gray-700">
                  {'(' + [...selectedRefs].sort((a, b) => a.authors.localeCompare(b.authors)).map(r => {
                    const name = r.authors.includes('et al.')
                      ? r.authors.split(',')[0].trim() + ', et al.'
                      : r.authors.split(',')[0].trim();
                    return `${name}, ${r.year}`;
                  }).join('; ') + ')'}
                </p>
              </div>

              <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Selected References</h3>
              <div className="space-y-1.5">
                {selectedRefs.sort((a, b) => a.authors.localeCompare(b.authors)).map(ref => (
                  <div key={ref.id} className="flex items-start gap-2 p-2 border border-gray-200 rounded">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-gray-800 leading-tight">{ref.title}</p>
                      <p className="text-[10px] text-gray-500">{ref.authors.split(',').slice(0, 2).join(',')} ({ref.year})</p>
                    </div>
                    <button onClick={() => toggleSelect(ref.id)}
                      className="shrink-0 text-[10px] text-red-500 hover:text-red-700 font-medium">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ DOI TAB (from ribbon "Add by DOI" button) ═══ */}
      {ribbonMode === 'doi' && tab === 'search' && (
        <div className="p-3">
          <h3 className="text-[12px] font-bold text-gray-700 mb-2">Add Reference by DOI</h3>
          <div className="flex gap-1.5 mb-3">
            <input value={doiInput} onChange={e => setDoiInput(e.target.value)}
              placeholder="Enter DOI (e.g. 10.1038/s41586-021-03740-8)"
              className="flex-1 px-2.5 py-2 border border-gray-300 rounded text-[12px] focus:ring-1 focus:ring-[#D97706] focus:border-[#D97706] outline-none" />
            <button onClick={async () => {
              if (!doiInput.trim()) return;
              setDoiLoading(true);
              try {
                const resp = await fetch(`/api/doi-lookup?doi=${encodeURIComponent(doiInput.trim())}`);
                if (!resp.ok) throw new Error('DOI not found');
                const data = await resp.json();
                setDoiResult(data);
              } catch { setDoiResult(null); setStatus('DOI lookup failed'); }
              finally { setDoiLoading(false); }
            }} disabled={doiLoading}
              className="px-3 py-2 bg-[#D97706] text-white rounded text-[11px] font-medium hover:bg-[#B45309] disabled:opacity-50">
              {doiLoading ? '...' : 'Lookup'}
            </button>
          </div>
          {doiResult && (
            <div className="border border-gray-200 rounded p-3 text-[12px] space-y-1">
              <p className="font-medium text-gray-800">{doiResult.title}</p>
              <p className="text-gray-500">{doiResult.authors} ({doiResult.year})</p>
              {doiResult.journal && <p className="text-gray-400 italic">{doiResult.journal}</p>}
              <button onClick={() => {
                const text = `${doiResult.authors}, ${doiResult.year}, \u2018${doiResult.title}\u2019${doiResult.journal ? `, ${doiResult.journal}` : ''}${doiResult.doi ? ` (DOI: ${doiResult.doi})` : ''}.`;
                insertIntoWord(text);
              }}
                className="mt-2 w-full px-2 py-1.5 bg-[#004B7F] text-white rounded text-[11px] font-medium hover:bg-[#003a63]">
                Insert Full Reference
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ DISCOVER TAB (from ribbon "Discover Papers" button) ═══ */}
      {ribbonMode === 'discover' && tab === 'search' && (
        <div className="p-3">
          <h3 className="text-[12px] font-bold text-gray-700 mb-2">Discover Related Papers</h3>
          <div className="flex gap-1.5 mb-3">
            <input value={discoverQuery} onChange={e => setDiscoverQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && discoverQuery.trim() && (async () => {
                setDiscoverLoading(true);
                try {
                  const resp = await fetch(`/api/similar-papers?query=${encodeURIComponent(discoverQuery)}&limit=10`);
                  const data = await resp.json();
                  setDiscoverResults(data.papers || []);
                } catch { setDiscoverResults([]); }
                finally { setDiscoverLoading(false); }
              })()}
              placeholder="Search by topic or title..."
              className="flex-1 px-2.5 py-2 border border-gray-300 rounded text-[12px] focus:ring-1 focus:ring-[#004B7F] focus:border-[#004B7F] outline-none" />
            <button onClick={async () => {
              if (!discoverQuery.trim()) return;
              setDiscoverLoading(true);
              try {
                const resp = await fetch(`/api/similar-papers?query=${encodeURIComponent(discoverQuery)}&limit=10`);
                const data = await resp.json();
                setDiscoverResults(data.papers || []);
              } catch { setDiscoverResults([]); }
              finally { setDiscoverLoading(false); }
            }} disabled={discoverLoading}
              className="px-3 py-2 bg-[#004B7F] text-white rounded text-[11px] font-medium hover:bg-[#003a63] disabled:opacity-50">
              {discoverLoading ? '...' : 'Search'}
            </button>
          </div>
          {discoverResults.length > 0 && (
            <div className="space-y-1.5">
              {discoverResults.map(p => (
                <div key={p.id} className="border border-gray-200 rounded p-2 text-[11px]">
                  <p className="font-medium text-gray-800 line-clamp-2">{p.title}</p>
                  <p className="text-gray-500">{p.authors} {p.year && `(${p.year})`}</p>
                  {p.journal && <p className="text-gray-400 italic">{p.journal}</p>}
                  <div className="flex gap-1 mt-1.5">
                    {p.doi && (
                      <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-[#004B7F] hover:underline">DOI</a>
                    )}
                    <span className="text-[10px] text-gray-400">{p.citationCount} citations</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ SETTINGS TAB ═══ */}
      {tab === 'settings' && (
        <div className="p-3 space-y-4">
          <div>
            <h3 className="text-[12px] font-bold text-gray-700 mb-2">Connection Status</h3>
            <div className="flex items-center gap-2 p-2 rounded border border-gray-200">
              <span className={`w-2 h-2 rounded-full ${officeReady ? 'bg-green-500' : officeError ? 'bg-amber-500' : 'bg-blue-500 animate-pulse'}`} />
              <span className="text-[12px] text-gray-600">
                {officeReady ? 'Connected to Word' : officeError ? 'Standalone mode (clipboard)' : 'Connecting...'}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-[12px] font-bold text-gray-700 mb-2">Citation Style</h3>
            <p className="text-[11px] text-gray-500">Currently using EEA (European Environment Agency) referencing style.</p>
            <div className="mt-2 bg-gray-50 rounded p-2 space-y-1.5">
              <div>
                <p className="text-[10px] font-bold text-gray-600">In-Text:</p>
                <p className="text-[11px] text-gray-500 italic">(Author, Year) or (Author et al., Year)</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-600">Full Reference:</p>
                <p className="text-[11px] text-gray-500 italic">Author, I., et al., Year, &lsquo;Title&rsquo;, Journal Volume(Issue), pp. Pages (DOI: xxx).</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-600">Footnote:</p>
                <p className="text-[11px] text-gray-500 italic">Author, &lsquo;Title&rsquo;, Journal (Year), DOI: xxx.</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-[12px] font-bold text-gray-700 mb-2">How to Install</h3>
            <div className="bg-blue-50 rounded p-2 space-y-1.5 text-[11px] text-blue-800">
              <p><strong>Option 1: Sideload (Development)</strong></p>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>Open Word &rarr; Insert &rarr; My Add-ins &rarr; Manage My Add-ins</li>
                <li>Upload the <code className="bg-blue-100 px-1 rounded">manifest.xml</code> file</li>
                <li>A full &ldquo;ESABCC References&rdquo; tab appears in the Word ribbon</li>
              </ol>
              <p className="mt-2"><strong>Option 2: Network Share (Team)</strong></p>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>Place <code className="bg-blue-100 px-1 rounded">manifest.xml</code> on a shared network folder</li>
                <li>In Word: File &rarr; Options &rarr; Trust Center &rarr; Trusted Add-in Catalogs</li>
                <li>Add the network folder as a trusted catalog</li>
                <li>Restart Word and find the add-in under My Add-ins</li>
              </ol>
              <p className="mt-2"><strong>Option 3: Word on the Web</strong></p>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>Open Word Online at office.com</li>
                <li>Insert &rarr; Office Add-ins &rarr; Upload My Add-in</li>
                <li>Select the manifest.xml file</li>
              </ol>
            </div>
          </div>

          <div>
            <h3 className="text-[12px] font-bold text-gray-700 mb-2">Library Info</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded p-2 text-center">
                <div className="text-lg font-bold text-[#D97706]">{references.length.toLocaleString()}</div>
                <div className="text-[10px] text-gray-500">Imported Refs</div>
              </div>
              <div className="bg-gray-50 rounded p-2 text-center">
                <div className="text-lg font-bold text-[#004B7F]">{customRefs.length}</div>
                <div className="text-[10px] text-gray-500">Custom Refs</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function WordAddinPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-gray-400 text-sm">Loading...</div>}>
      <WordAddinInner />
    </Suspense>
  );
}
