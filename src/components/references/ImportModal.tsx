'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  resolveFromDOI,
  importBibTeX,
  importRIS,
  addReference,
  type BatchImportResult,
} from '@/lib/references/reference-service';
import { formatAuthors } from '@/lib/references/citation-utils';
import { combineTags } from '@/lib/references/projects';
import { CSLItem } from '@/lib/references/types';
import { useClipboardIdentifier } from '@/lib/references/use-clipboard-identifier';
import Skeleton from '@/components/ui/Skeleton';
import { showToast } from '@/components/ui/ToastHost';

// CitePdfDropZone pulls in pdfjs (via react-pdf), which references browser-only
// `DOMMatrix` at module top. The /references page is statically prerendered
// at build time, so importing it directly crashes the build with
// "ReferenceError: DOMMatrix is not defined". Dynamic-import with ssr:false
// keeps it out of the SSR bundle.
const CitePdfDropZone = dynamic(
  () => import('@/components/references/CitePdfDropZone'),
  { ssr: false, loading: () => <div className="p-4 text-sm text-tertiary">Loading PDF reader…</div> },
);

interface ImportModalProps {
  libraryId: string;
  onImported: () => void;
  onClose: () => void;
  /**
   * Active report / project view. When set, every reference imported here is
   * filed under this project automatically (its badge shows up without
   * editing each entry by hand).
   */
  defaultProject?: string;
}

type ImportTab = 'doi' | 'pdf' | 'bibtex' | 'ris';

export default function ImportModal({ libraryId, onImported, onClose, defaultProject = '' }: ImportModalProps) {
  // The project names new references are filed under (0 or 1 today).
  const projectName = defaultProject.trim();
  const projects = projectName ? [projectName] : [];
  const [activeTab, setActiveTab] = useState<ImportTab>('doi');
  const [doiInput, setDoiInput] = useState('');
  const [bibtexInput, setBibtexInput] = useState('');
  const [risInput, setRisInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<CSLItem | null>(null);
  const [batchResult, setBatchResult] = useState<BatchImportResult | null>(null);
  // Smart-paste DOI on the DOI tab.
  const clipboard = useClipboardIdentifier({ enabled: activeTab === 'doi', currentValue: doiInput });

  const handleDOILookup = async () => {
    if (!doiInput.trim()) return;
    setLoading(true);
    setError('');
    setPreview(null);

    try {
      const csl = await resolveFromDOI(doiInput.trim());
      setPreview(csl);
    } catch (err: any) {
      setError(err.message || 'Failed to resolve DOI');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFromDOI = async () => {
    if (!preview) return;
    setLoading(true);
    setError('');

    try {
      await addReference(libraryId, preview, projects.length ? combineTags([], projects) : undefined);
      setPreview(null);
      setDoiInput('');
      onImported();
    } catch (err: any) {
      setError(err.message || 'Failed to add reference');
    } finally {
      setLoading(false);
    }
  };

  const handleBibTeXImport = async () => {
    if (!bibtexInput.trim()) return;
    setLoading(true);
    setError('');
    setBatchResult(null);

    try {
      const result = await importBibTeX(libraryId, bibtexInput, projects);
      setBatchResult(result);
      if (result.imported.length > 0) {
        setBibtexInput('');
        onImported();
      } else if (result.parsed === 0) {
        setError('No BibTeX entries were parsed. Check the input format.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import BibTeX');
    } finally {
      setLoading(false);
    }
  };

  const handleRISImport = async () => {
    if (!risInput.trim()) return;
    setLoading(true);
    setError('');
    setBatchResult(null);

    try {
      const result = await importRIS(libraryId, risInput, projects);
      setBatchResult(result);
      if (result.imported.length > 0) {
        setRisInput('');
        onImported();
      } else if (result.parsed === 0) {
        setError('No RIS entries were parsed. Check the input format.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import RIS');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (activeTab === 'bibtex') setBibtexInput(text);
      else if (activeTab === 'ris') setRisInput(text);
    };
    reader.readAsText(file);
  };

  const tabs: { id: ImportTab; label: string }[] = [
    { id: 'doi', label: 'DOI Lookup' },
    { id: 'pdf', label: 'Cite PDF' },
    { id: 'bibtex', label: 'BibTeX' },
    { id: 'ris', label: 'RIS' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-grey-200 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-grey-200">
          <h2 className="text-lg font-semibold text-tertiary-dark">Import References</h2>
          <button onClick={onClose} className="text-tertiary hover:text-tertiary-dark text-xl">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-grey-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setError(''); setPreview(null); setBatchResult(null); }}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-tertiary hover:text-tertiary-dark'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {projectName && (
            <div className="rounded-lg border border-[var(--mh-status-info)] bg-[var(--mh-status-info-bg)] text-[var(--mh-status-info)] p-3 text-sm mb-4">
              New references will be filed under{' '}
              <span className="font-semibold">{projectName}</span> automatically.
            </div>
          )}
          {error && (
            <div role="alert" className="rounded-lg border border-[var(--mh-status-danger)] bg-[var(--mh-status-danger-bg)] text-[var(--mh-status-danger)] p-3 text-sm mb-4">
              {error}
            </div>
          )}
          {batchResult && <BatchResultSummary result={batchResult} />}

          {/* DOI Tab */}
          {activeTab === 'doi' && (
            <div className="space-y-4">
              <p className="text-sm text-tertiary">Enter a DOI to automatically fetch reference metadata from CrossRef.</p>
              <div className="flex gap-2">
                <input
                  value={doiInput}
                  onChange={e => setDoiInput(e.target.value)}
                  onFocus={() => { void clipboard.check(); }}
                  onKeyDown={e => e.key === 'Enter' && handleDOILookup()}
                  placeholder="10.1038/s41558-024-01234-5 or https://doi.org/..."
                  className="flex-1 bg-grey-100 border border-grey-200 rounded px-3 py-2 text-tertiary-dark"
                />
                <button
                  onClick={handleDOILookup}
                  disabled={loading || !doiInput.trim()}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded disabled:opacity-50"
                >
                  {loading ? 'Looking up...' : 'Lookup'}
                </button>
              </div>

              {/* Smart-paste chip: appears when the clipboard contains a DOI. */}
              {clipboard.identifier && clipboard.identifier.kind === 'doi' && (
                <div className="flex items-center gap-2" role="region" aria-label="Smart paste suggestion">
                  <button
                    type="button"
                    onClick={() => {
                      setDoiInput(clipboard.identifier!.canonical);
                      clipboard.dismiss();
                      setTimeout(() => { void handleDOILookup(); }, 0);
                    }}
                    className="mh-focus mh-motion-fast inline-flex items-center gap-1.5 rounded-full border border-[var(--mh-status-primary)] bg-[var(--mh-status-primary-bg)] text-[var(--mh-status-primary)] px-2.5 py-1 text-xs font-semibold"
                  >
                    <span aria-hidden="true">📋</span>
                    Paste DOI{' '}
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

              {/* Loading skeleton — shape-matches the resolved preview below. */}
              {loading && !preview && (
                <div role="status" aria-label="Resolving DOI" className="flex flex-col gap-2 p-4 rounded-lg border border-[var(--mh-border)] bg-[var(--mh-bg)]">
                  <Skeleton.Heading width="55%" />
                  <Skeleton.Line width="40%" />
                  <Skeleton.Line width="32%" />
                  <Skeleton.Block width={120} height={32} rounded="md" className="mt-2" />
                </div>
              )}

              {preview && (
                <div className="border border-[var(--mh-status-success)] bg-[var(--mh-status-success-bg)] rounded-lg p-4 mh-ring-pulse">
                  <h3 className="font-semibold text-[var(--mh-fg)] mb-1" style={{ fontSize: 'var(--mh-text-md)', lineHeight: 'var(--mh-leading-snug)' }}>{preview.title}</h3>
                  <p className="text-sm text-[var(--mh-muted)]">{formatAuthors(preview.author)}</p>
                  {preview['container-title'] && (
                    <p className="text-sm text-[var(--mh-muted)] italic">{preview['container-title']}</p>
                  )}
                  <p className="text-sm text-[var(--mh-muted)] mt-1 mh-tnum">
                    {preview.issued?.['date-parts']?.[0]?.[0]}
                    {preview.volume && `, Vol. ${preview.volume}`}
                    {preview.issue && `(${preview.issue})`}
                    {preview.page && `, pp. ${preview.page}`}
                  </p>
                  {preview.DOI && <p className="text-xs text-[var(--mh-status-info)] mt-1 font-mono">DOI: {preview.DOI}</p>}
                  <button
                    onClick={handleAddFromDOI}
                    disabled={loading}
                    className="mh-focus mt-3 px-4 py-2 bg-[var(--mh-status-primary)] hover:opacity-90 text-white rounded-md text-sm disabled:opacity-50 font-semibold"
                  >
                    {loading ? 'Adding...' : 'Add to Library'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* DOI smart-paste chip is handled inside the DOI tab body below; the chip
              lives next to the input where the user is looking. */}
          {/* Cite PDF Tab — drop a PDF, extract DOI, resolve in one click. */}
          {activeTab === 'pdf' && (
            <CitePdfDropZone libraryId={libraryId} onImported={onImported} defaultProject={projectName} />
          )}

          {/* BibTeX Tab */}
          {activeTab === 'bibtex' && (
            <div className="space-y-4">
              <p className="text-sm text-tertiary">
                Paste BibTeX entries or upload a .bib file.{' '}
                <button
                  type="button"
                  onClick={() => {
                    setBibtexInput(SAMPLE_BIBTEX);
                    showToast({ tone: 'info', message: 'Sample BibTeX inserted', description: 'Click Import BibTeX to add it to your library.' });
                  }}
                  className="mh-focus underline text-[var(--mh-status-info)] hover:opacity-80"
                >
                  Try a sample
                </button>
              </p>
              <div>
                <input type="file" accept=".bib,.bibtex,.txt" onChange={handleFileUpload}
                  className="text-sm text-tertiary file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-grey-200 file:text-tertiary-dark hover:file:bg-grey-200" />
              </div>
              <textarea
                value={bibtexInput}
                onChange={e => setBibtexInput(e.target.value)}
                rows={10}
                placeholder={'@article{smith2024,\n  title = {Climate change...},\n  author = {Smith, John and Müller, Anna},\n  year = {2024},\n  journal = {Nature Climate Change}\n}'}
                className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-tertiary-dark font-mono text-sm"
              />
              <button
                onClick={handleBibTeXImport}
                disabled={loading || !bibtexInput.trim()}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded disabled:opacity-50"
              >
                {loading ? 'Importing...' : 'Import BibTeX'}
              </button>
            </div>
          )}

          {/* RIS Tab */}
          {activeTab === 'ris' && (
            <div className="space-y-4">
              <p className="text-sm text-tertiary">Paste RIS entries or upload a .ris file.</p>
              <div>
                <input type="file" accept=".ris,.txt" onChange={handleFileUpload}
                  className="text-sm text-tertiary file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-grey-200 file:text-tertiary-dark hover:file:bg-grey-200" />
              </div>
              <textarea
                value={risInput}
                onChange={e => setRisInput(e.target.value)}
                rows={10}
                placeholder={'TY  - JOUR\nTI  - Climate change impacts...\nAU  - Smith, John\nPY  - 2024\nJO  - Nature Climate Change\nER  -'}
                className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-tertiary-dark font-mono text-sm"
              />
              <button
                onClick={handleRISImport}
                disabled={loading || !risInput.trim()}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded disabled:opacity-50"
              >
                {loading ? 'Importing...' : 'Import RIS'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BatchResultSummary — goal-gradient breakdown of an import.
// Shows a proportional bar (imported / duplicates / errors) and three
// status-coloured counts so the user instantly sees where to look.
// Drill-down details collapse by default to keep the post-import state
// small unless something needs attention.
// ---------------------------------------------------------------------------
function BatchResultSummary({ result }: { result: BatchImportResult }) {
  const total = Math.max(result.parsed, result.imported.length + result.skipped.length, 1);
  const importedN  = result.imported.length;
  const duplicateN = result.skipped.filter(s => s.reason === 'duplicate').length;
  const errorN     = result.skipped.filter(s => s.reason === 'add-error').length;
  const otherN     = result.skipped.length - duplicateN - errorN;
  const pct = (n: number) => Math.round((n / total) * 100);

  return (
    <div role="status" aria-live="polite" className="rounded-lg border border-[var(--mh-border)] bg-[var(--mh-card)] p-4 mb-4">
      <div className="flex items-baseline justify-between mb-2">
        <p className="font-semibold" style={{ fontSize: 'var(--mh-text-md)', lineHeight: 'var(--mh-leading-snug)' }}>
          <span className="mh-tnum">{importedN}</span> of <span className="mh-tnum">{total}</span> imported
        </p>
        <div className="flex items-center gap-1.5">
          {importedN  > 0 && <span className="mh-badge mh-badge-success">{importedN} added</span>}
          {duplicateN > 0 && <span className="mh-badge mh-badge-warning">{duplicateN} duplicate{duplicateN === 1 ? '' : 's'}</span>}
          {errorN     > 0 && <span className="mh-badge mh-badge-danger">{errorN} error{errorN === 1 ? '' : 's'}</span>}
          {otherN     > 0 && <span className="mh-badge mh-badge-neutral">{otherN} skipped</span>}
        </div>
      </div>
      {/* Proportional progress bar — encodes the breakdown left to right. */}
      <div aria-hidden="true" className="flex h-2 w-full overflow-hidden rounded-full bg-[var(--mh-bg)]">
        {importedN  > 0 && <span style={{ width: `${pct(importedN)}%`,  background: 'var(--mh-status-success)' }} />}
        {duplicateN > 0 && <span style={{ width: `${pct(duplicateN)}%`, background: 'var(--mh-status-warning)' }} />}
        {errorN     > 0 && <span style={{ width: `${pct(errorN)}%`,     background: 'var(--mh-status-danger)'  }} />}
        {otherN     > 0 && <span style={{ width: `${pct(otherN)}%`,     background: 'var(--mh-muted)'           }} />}
      </div>
      {result.skipped.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-[var(--mh-muted)] hover:text-[var(--mh-fg)]">
            Show details ({result.skipped.length})
          </summary>
          <ul className="mt-2 space-y-1 text-xs max-h-48 overflow-y-auto">
            {result.skipped.map((s, i) => (
              <li key={i} className="flex gap-2 items-baseline">
                <span className={`mh-badge ${s.reason === 'add-error' ? 'mh-badge-danger' : 'mh-badge-warning'}`}>
                  {s.reason}
                </span>
                <span className="truncate text-[var(--mh-fg)]">{s.title}</span>
                {s.error && <span className="text-[var(--mh-status-danger)] truncate">— {s.error}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// Two real-world ESABCC-relevant entries so the "Try a sample" button gives
// the user something credible to look at — not Lorem ipsum.
const SAMPLE_BIBTEX = `@article{rogelj2018,
  title   = {Mitigation pathways compatible with 1.5°C in the context of sustainable development},
  author  = {Rogelj, Joeri and Shindell, Drew and Jiang, Kejun and others},
  year    = {2018},
  journal = {Global Warming of 1.5°C — IPCC Special Report},
  doi     = {10.1017/9781009157940.004}
}

@techreport{eea2024_state,
  title       = {Trends and projections in Europe 2024},
  author      = {{European Environment Agency}},
  institution = {EEA},
  year        = {2024},
  number      = {EEA Report 11/2024},
  url         = {https://www.eea.europa.eu/publications/trends-and-projections-in-europe-2024}
}`;
