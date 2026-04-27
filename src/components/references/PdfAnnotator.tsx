'use client';

// ---------------------------------------------------------------------------
// PdfAnnotator
//
// Renders a PDF using react-pdf (pdfjs under the hood) so that the text layer
// is part of OUR DOM and we can hook into native text selection.  The previous
// implementation used a cross-origin <iframe> pointing at Supabase Storage,
// which made it impossible to observe what the user had selected — so quotes
// had to be pasted manually.  Now selecting text in the PDF auto-fills the
// quote field via the onSelect callback, and existing annotations are
// re-highlighted in the rendered text layer so the user sees them in place.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import type { PdfAnnotation } from '@/lib/references/pdf-annotations';

// Wire up the worker.  We serve it as a static asset from /public so webpack
// never tries to run Terser on the .mjs (which uses `import.meta` and would
// fail to minify when not treated as a module).  The file is copied from
// node_modules/pdfjs-dist/build/pdf.worker.min.mjs and committed under
// public/pdf.worker.min.mjs.
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PdfAnnotatorProps {
  pdfUrl: string;
  fallbackUrl?: string;
  page: number;
  onPageChange: (n: number) => void;
  onSelectText: (text: string, page: number) => void;
  onEditAnnotation?: (id: string) => void;
  onDeleteAnnotation?: (id: string) => void;
  annotations: PdfAnnotation[];
}

export default function PdfAnnotator({
  pdfUrl,
  fallbackUrl,
  page,
  onPageChange,
  onSelectText,
  onEditAnnotation,
  onDeleteAnnotation,
  annotations,
}: PdfAnnotatorProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [activeUrl, setActiveUrl] = useState<string>(pdfUrl);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Hovered annotation tooltip state.  `id` identifies which annotation the
  // user is pointing at; `x`/`y` are viewport coordinates for the popup.
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageWrapRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Reset when the parent passes a new URL
  useEffect(() => {
    setActiveUrl(pdfUrl);
    setLoadError(null);
  }, [pdfUrl]);

  // ── Capture text selection → notify parent ──
  // Restrict selection capture to the actual pdfjs text layer.  Without this
  // guard, selecting the "Could not load this PDF" error message inside the
  // viewer also fires onSelectText, which incorrectly auto-fills the quote
  // field with UI chrome instead of real PDF content.
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (text.length < 2) return;
    const node = sel.anchorNode;
    if (!node) return;
    // Walk up from the anchor node and require that we hit the pdfjs text
    // layer.  Anything outside the text layer (toolbar, error message,
    // loading state, …) is ignored.
    let el: Node | null = node;
    let inTextLayer = false;
    while (el && el !== pageWrapRef.current) {
      if (
        el instanceof HTMLElement &&
        el.classList.contains('react-pdf__Page__textContent')
      ) {
        inTextLayer = true;
        break;
      }
      el = el.parentNode;
    }
    if (!inTextLayer) return;
    onSelectText(text, page);
  }, [onSelectText, page]);

  useEffect(() => {
    const el = pageWrapRef.current;
    if (!el) return;
    el.addEventListener('mouseup', handleMouseUp);
    return () => el.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  // ── Hover popup for existing annotations ──
  // Attach a mouseover listener to the page wrapper that looks for any span
  // tagged with data-ann-id (set during highlighting) and surfaces a popup
  // next to it with the annotation's note plus edit/delete affordances.
  useEffect(() => {
    const el = pageWrapRef.current;
    if (!el) return;

    function handleOver(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const span = target.closest<HTMLElement>('[data-ann-id]');
      if (!span) return;
      const id = span.dataset.annId!;
      const rect = span.getBoundingClientRect();
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      setHover({ id, x: rect.left + rect.width / 2, y: rect.bottom + 6 });
    }

    function handleOut(e: MouseEvent) {
      const related = e.relatedTarget as HTMLElement | null;
      // Don't hide if we're moving into the popup itself
      if (related && popupRef.current?.contains(related)) return;
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => setHover(null), 250);
    }

    el.addEventListener('mouseover', handleOver);
    el.addEventListener('mouseout', handleOut);
    return () => {
      el.removeEventListener('mouseover', handleOver);
      el.removeEventListener('mouseout', handleOut);
    };
  }, []);

  const hoveredAnn = hover ? annotations.find(a => a.id === hover.id) : null;

  // ── Re-highlight existing annotations in the text layer ──
  // After each page renders we walk the text-layer spans and tint any whose
  // textContent appears inside one of the annotation quotes.  pdfjs splits
  // text into many small spans so we use a substring match against a rolling
  // window of concatenated spans.
  const highlightExistingAnnotations = useCallback(() => {
    const wrap = pageWrapRef.current;
    if (!wrap) return;
    const layer = wrap.querySelector<HTMLDivElement>('.react-pdf__Page__textContent');
    if (!layer) return;
    const spans = Array.from(layer.querySelectorAll<HTMLSpanElement>('span'));

    // Reset any prior tinting first
    spans.forEach(s => {
      s.style.background = '';
      s.style.borderRadius = '';
      s.style.boxShadow = '';
    });

    const pageAnns = annotations.filter(a => a.page === page);
    if (pageAnns.length === 0) return;

    // Build a flat lowercase text + index → span map
    let flat = '';
    const indexToSpan: Array<{ start: number; end: number; span: HTMLSpanElement }> = [];
    for (const span of spans) {
      const t = (span.textContent || '').toLowerCase();
      if (!t) continue;
      const start = flat.length;
      flat += t + ' ';
      indexToSpan.push({ start, end: start + t.length, span });
    }

    for (const ann of pageAnns) {
      const needle = ann.quote.toLowerCase().trim();
      if (!needle) continue;
      const at = flat.indexOf(needle);
      if (at < 0) continue;
      const end = at + needle.length;
      for (const entry of indexToSpan) {
        if (entry.end < at || entry.start > end) continue;
        entry.span.style.background = ann.color + '99';
        entry.span.style.borderRadius = '2px';
        entry.span.style.boxShadow = `0 0 0 1px ${ann.color}`;
        entry.span.style.cursor = 'help';
        // Tag the span so the hover handler knows which annotation it
        // belongs to.  An existing tag is kept so overlapping annotations
        // resolve to the first match.
        if (!entry.span.dataset.annId) {
          entry.span.dataset.annId = ann.id;
        }
      }
    }
  }, [annotations, page]);

  // Re-run highlights whenever annotations or current page change.  We also
  // re-run after a short delay to catch the text-layer being lazily attached.
  useEffect(() => {
    const t1 = setTimeout(highlightExistingAnnotations, 50);
    const t2 = setTimeout(highlightExistingAnnotations, 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [highlightExistingAnnotations]);

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-grey-100 bg-grey-50 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-2 py-1 rounded border border-grey-200 bg-white hover:bg-grey-100 disabled:opacity-40"
          >
            ←
          </button>
          <span className="text-tertiary-dark">
            Page{' '}
            <input
              type="number"
              min={1}
              max={numPages || undefined}
              value={page}
              onChange={e => {
                const n = parseInt(e.target.value || '1', 10);
                if (!Number.isNaN(n)) onPageChange(Math.min(Math.max(1, n), numPages || n));
              }}
              className="w-12 px-1 py-0.5 border border-grey-200 rounded text-center"
            />
            {' / '}
            {numPages || '–'}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(numPages || page + 1, page + 1))}
            disabled={!!numPages && page >= numPages}
            className="px-2 py-1 rounded border border-grey-200 bg-white hover:bg-grey-100 disabled:opacity-40"
          >
            →
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setScale(s => Math.max(0.6, s - 0.15))}
            className="px-2 py-1 rounded border border-grey-200 bg-white hover:bg-grey-100"
            title="Zoom out"
          >
            −
          </button>
          <span className="w-10 text-center text-tertiary">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale(s => Math.min(3, s + 0.15))}
            className="px-2 py-1 rounded border border-grey-200 bg-white hover:bg-grey-100"
            title="Zoom in"
          >
            +
          </button>
        </div>
      </div>

      {/* Document */}
      <div
        ref={pageWrapRef}
        className="flex-1 overflow-auto bg-grey-100 flex justify-center py-4"
        style={{ maxHeight: '80vh' }}
      >
        <Document
          // key on activeUrl forces a clean reload when we swap to fallback
          key={activeUrl}
          file={activeUrl}
          onLoadSuccess={({ numPages }) => {
            setNumPages(numPages);
            setLoadError(null);
          }}
          onLoadError={(err: Error) => {
            // If we were using the proxy and a fallback URL was provided,
            // try that next.  Otherwise surface the actual error so we can
            // see what's going on instead of a generic message.
            if (fallbackUrl && activeUrl !== fallbackUrl) {
              setActiveUrl(fallbackUrl);
              setLoadError(null);
              return;
            }
            setLoadError(err?.message || String(err));
          }}
          loading={<div className="text-tertiary text-sm py-10">Loading PDF…</div>}
          error={
            <div className="text-tertiary text-sm py-10 px-6 text-center max-w-md">
              <p className="mb-2 font-medium text-tertiary-dark">
                Could not load this PDF.
              </p>
              {loadError && (
                <p className="mb-3 text-xs font-mono text-accent-red break-all">
                  {loadError}
                </p>
              )}
              {fallbackUrl && (
                <a
                  href={fallbackUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-primary hover:underline text-xs"
                >
                  Open the original file in a new tab →
                </a>
              )}
            </div>
          }
        >
          <Page
            pageNumber={page}
            scale={scale}
            renderTextLayer
            renderAnnotationLayer={false}
            onRenderTextLayerSuccess={highlightExistingAnnotations}
          />
        </Document>
      </div>

      {/* Hover popup */}
      {hover && hoveredAnn && (
        <div
          ref={popupRef}
          style={{
            position: 'fixed',
            left: Math.max(8, Math.min(hover.x - 160, window.innerWidth - 328)),
            top: hover.y,
            zIndex: 50,
          }}
          onMouseEnter={() => {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
          }}
          onMouseLeave={() => setHover(null)}
          className="w-80 bg-white border border-grey-200 rounded-lg shadow-lg p-3 text-xs"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full border border-grey-200"
              style={{ background: hoveredAnn.color }}
            />
            <span className="text-[10px] text-tertiary uppercase tracking-wide">
              Page {hoveredAnn.page}
            </span>
          </div>
          <blockquote
            className="italic px-2 py-1 rounded mb-2 border-l-2 border-grey-300"
            style={{ background: hoveredAnn.color + '55' }}
          >
            “{hoveredAnn.quote}”
          </blockquote>
          <div className="text-tertiary-dark whitespace-pre-wrap mb-2">
            {hoveredAnn.note || (
              <span className="italic text-tertiary">No note yet.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onEditAnnotation && (
              <button
                type="button"
                onClick={() => {
                  onEditAnnotation(hoveredAnn.id);
                  setHover(null);
                }}
                className="px-2 py-1 bg-primary text-white rounded text-[11px] font-medium hover:bg-primary-dark"
              >
                Edit note
              </button>
            )}
            {onDeleteAnnotation && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Delete this annotation?')) {
                    onDeleteAnnotation(hoveredAnn.id);
                    setHover(null);
                  }
                }}
                className="px-2 py-1 bg-grey-100 hover:bg-grey-200 text-tertiary-dark rounded text-[11px] border border-grey-200"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
