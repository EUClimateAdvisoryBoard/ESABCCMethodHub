'use client';

import { useCallback, useRef, useState } from 'react';
import { pdfjs } from 'react-pdf';
import {
  resolveFromDOI,
  addReference,
} from '@/lib/references/reference-service';
import { CSLItem } from '@/lib/references/types';
import { formatAuthors } from '@/lib/references/citation-utils';
import { combineTags } from '@/lib/references/projects';

// Reuse the same worker the rest of the app already serves.
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const DOI_RE = /\b10\.\d{4,9}\/[^\s,;)"'<>]+/i;
const MAX_PAGES_TO_SCAN = 6;
const MAX_TITLE_PAGE = 2;

interface Props {
  libraryId: string;
  /** Called after a reference has been added so the parent list refreshes. */
  onImported: () => void;
  /**
   * Active report / project view. When set, the imported reference is filed
   * under this project automatically so its badge appears without editing.
   */
  defaultProject?: string;
}

interface ExtractionResult {
  doi?: string;
  csl?: CSLItem;
  /** Raw first ~600 chars of the PDF — shown as a preview when no DOI is found. */
  fallbackTextSample?: string;
}

/**
 * Drop a PDF on this zone, get a reference. The component:
 *   1. Reads the PDF on the client via pdfjs.
 *   2. Scans the first few pages for a DOI pattern.
 *   3. If a DOI is found, resolves it via Crossref and previews the
 *      result. The user confirms with one click to add it to the
 *      current library.
 *   4. If no DOI is found, surfaces a snippet of the extracted text so
 *      the user can paste a DOI manually.
 *
 * One-click ingestion replaces the previous five-step flow (download
 * PDF → find DOI → paste DOI → look up → confirm).
 */
export default function CitePdfDropZone({ libraryId, onImported, defaultProject = '' }: Props) {
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<'idle' | 'reading' | 'resolving' | 'preview' | 'no-doi'>('idle');
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const reset = () => {
    setExtraction(null);
    setError(null);
    setStage('idle');
  };

  const processFile = useCallback(async (file: File) => {
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      setError('Please drop a PDF file.');
      return;
    }
    setBusy(true);
    setError(null);
    setStage('reading');
    try {
      const buf = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
      const pageCount = Math.min(pdf.numPages, MAX_PAGES_TO_SCAN);
      let combined = '';
      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((it: unknown) => (it && typeof it === 'object' && 'str' in it ? String((it as { str: string }).str) : ''))
          .join(' ');
        combined += `\n${pageText}`;
        // DOIs nearly always appear on the first 1–2 pages, so we can
        // bail out early once we have a strong match.
        if (i >= MAX_TITLE_PAGE) {
          const m = combined.match(DOI_RE);
          if (m) break;
        }
      }
      const m = combined.match(DOI_RE);
      const doi = m ? m[0].replace(/[.,;)'"]+$/, '') : undefined;
      if (!doi) {
        setExtraction({ fallbackTextSample: combined.slice(0, 600).trim() });
        setStage('no-doi');
        return;
      }
      setStage('resolving');
      const csl = await resolveFromDOI(doi);
      setExtraction({ doi, csl });
      setStage('preview');
    } catch (e) {
      setError((e as Error).message || 'Failed to read PDF.');
      setStage('idle');
    } finally {
      setBusy(false);
    }
  }, []);

  const handleAdd = useCallback(async () => {
    if (!extraction?.csl) return;
    setBusy(true);
    setError(null);
    try {
      const project = defaultProject.trim();
      await addReference(libraryId, extraction.csl, project ? combineTags([], [project]) : undefined);
      onImported();
      reset();
    } catch (e) {
      setError((e as Error).message || 'Failed to add reference.');
    } finally {
      setBusy(false);
    }
  }, [extraction, libraryId, onImported, defaultProject]);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <div className="space-y-3">
      <div
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer border-2 border-dashed rounded-lg p-6 text-center transition ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-grey-300 bg-grey-50 hover:border-primary hover:bg-grey-100/50'
        }`}>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
            e.target.value = '';
          }}
        />
        <p className="text-sm text-tertiary">
          Drop a PDF here, or click to choose. We'll scan the first pages for a DOI and
          fetch the metadata for you.
        </p>
        {busy && (
          <p className="mt-2 text-xs text-tertiary">
            {stage === 'reading' && 'Reading PDF…'}
            {stage === 'resolving' && 'Looking up DOI…'}
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-accent-red">
          {error}
        </div>
      )}

      {stage === 'no-doi' && extraction?.fallbackTextSample && (
        <div className="border border-grey-200 rounded-lg p-3 bg-amber-50/40">
          <p className="text-sm text-tertiary-dark mb-1">
            <strong>No DOI found in the first {MAX_PAGES_TO_SCAN} pages.</strong> Use the DOI
            tab to enter one manually, or check the snippet below for clues.
          </p>
          <p className="text-[11px] text-tertiary font-mono whitespace-pre-wrap break-words max-h-40 overflow-auto">
            {extraction.fallbackTextSample}
          </p>
          <button
            onClick={reset}
            className="mt-2 text-xs text-primary hover:underline">
            Reset
          </button>
        </div>
      )}

      {stage === 'preview' && extraction?.csl && (
        <div className="border border-grey-200 rounded-lg p-4 bg-grey-100/50">
          <h3 className="font-medium text-tertiary-dark mb-1">{extraction.csl.title}</h3>
          <p className="text-sm text-tertiary">{formatAuthors(extraction.csl.author)}</p>
          {extraction.csl['container-title'] && (
            <p className="text-sm text-tertiary italic">{extraction.csl['container-title']}</p>
          )}
          <p className="text-sm text-tertiary mt-1">
            {extraction.csl.issued?.['date-parts']?.[0]?.[0]}
            {extraction.csl.volume && `, Vol. ${extraction.csl.volume}`}
            {extraction.csl.issue && `(${extraction.csl.issue})`}
            {extraction.csl.page && `, pp. ${extraction.csl.page}`}
          </p>
          {extraction.csl.DOI && <p className="text-xs text-primary mt-1">DOI: {extraction.csl.DOI}</p>}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleAdd}
              disabled={busy}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50">
              {busy ? 'Adding…' : 'Add to Library'}
            </button>
            <button
              onClick={reset}
              disabled={busy}
              className="px-3 py-2 text-sm text-tertiary hover:text-tertiary-dark border border-grey-300 rounded">
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
