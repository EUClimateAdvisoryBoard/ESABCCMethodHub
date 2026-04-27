'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  PdfAnnotation,
  ANNOTATION_COLORS,
  getPdfAnnotations,
  savePdfAnnotation,
  updatePdfAnnotation,
  deletePdfAnnotation,
} from '@/lib/references/pdf-annotations';

// react-pdf touches `window` / `DOMMatrix` on import, so it must only run on
// the client.  Dynamic-import with ssr:false keeps it out of the SSR bundle.
const PdfAnnotator = dynamic(
  () => import('@/components/references/PdfAnnotator'),
  { ssr: false, loading: () => <div className="p-10 text-tertiary text-sm">Loading PDF viewer…</div> }
);

// Minimal shape we need from a custom-store reference for the viewer
interface RefSummary {
  id: string;
  title: string;
  authors: string;
  year: string;
  journal: string;
  doi: string;
  pdfUrl: string;
  // `source` controls which URL the viewer fetches from.  References stored
  // in the shared GitHub-backed library live in the server-side custom-refs
  // store and can be proxied through /api/references/pdf; references saved
  // only in the current browser (localStorage) don't exist on the server,
  // so we have to hit the raw Supabase URL directly.
  source: 'server' | 'local';
}

// Shape of a Reference in the browser's `esabcc_custom_refs` localStorage
// bucket.  We copy the field names loosely from the CSL Reference type used
// elsewhere in the app; only the fields we actually display are typed.
interface LocalRef {
  id: string;
  title?: string;
  authors?: Array<{ literal?: string; family?: string; given?: string }>;
  year?: number | string | null;
  container_title?: string | null;
  doi?: string | null;
  pdf_url?: string | null;
}

function loadLocalRefById(id: string): RefSummary | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('esabcc_custom_refs');
    if (!raw) return null;
    const refs = JSON.parse(raw) as LocalRef[];
    const found = refs.find(r => r.id === id);
    if (!found) return null;
    const authorStr =
      (found.authors || [])
        .map(a => a.literal || [a.family, a.given].filter(Boolean).join(', '))
        .filter(Boolean)
        .join('; ') || '';
    return {
      id: found.id,
      title: found.title || 'Untitled',
      authors: authorStr,
      year: found.year ? String(found.year) : '',
      journal: found.container_title || '',
      doi: found.doi || '',
      pdfUrl: found.pdf_url || '',
      source: 'local',
    };
  } catch {
    return null;
  }
}

export default function AnnotatePageWrapper() {
  // useSearchParams must be inside a Suspense boundary in the app router.
  return (
    <Suspense fallback={<div className="p-10 text-tertiary text-sm">Loading…</div>}>
      <AnnotatePage />
    </Suspense>
  );
}

function AnnotatePage() {
  const params = useSearchParams();
  const id = params.get('id');

  const [ref, setRef] = useState<RefSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);

  // New annotation form state
  const [page, setPage] = useState<number>(1);
  const [quote, setQuote] = useState('');
  const [note, setNote] = useState('');
  const [color, setColor] = useState(ANNOTATION_COLORS[0].value);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  // Called by PdfAnnotator whenever the user releases the mouse on a
  // non-empty selection inside the rendered text layer.  We auto-fill the
  // quote field, snap the page selector to the page where the selection
  // happened, and focus the note field so the user can immediately type a
  // comment instead of having to click into it.
  function handleSelectText(text: string, selPage: number) {
    setQuote(text);
    setPage(selPage);
    // Defer focus until React has rerendered the form
    setTimeout(() => noteInputRef.current?.focus(), 0);
  }

  // ── Load reference + annotations ──
  useEffect(() => {
    if (!id) {
      setLoaded(true);
      return;
    }

    setAnnotations(getPdfAnnotations(id));

    // Try localStorage first — references saved only in the current browser
    // (e.g. added via the web UI without syncing to the shared GitHub store)
    // live there and will never show up in /api/references/library.
    const local = loadLocalRefById(id);
    if (local) {
      setRef(local);
      setLoaded(true);
      return;
    }

    (async () => {
      try {
        const resp = await fetch('/api/references/library', { cache: 'no-store' });
        if (!resp.ok) {
          setLoadError('Could not reach the reference library API.');
          setLoaded(true);
          return;
        }
        const data = await resp.json();
        const found = (data.references || []).find(
          (r: { id: string }) => r.id === id
        );
        if (!found) {
          setLoadError('Reference not found in the library.');
        } else {
          setRef({
            id:       found.id,
            title:    found.title    || 'Untitled',
            authors:  found.authors  || '',
            year:     found.year     || '',
            journal:  found.journal  || '',
            doi:      found.doi      || '',
            pdfUrl:   found.pdfUrl   || '',
            source:   'server',
          });
        }
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : 'Unknown error loading reference.'
        );
      } finally {
        setLoaded(true);
      }
    })();
  }, [id]);

  function reloadAnnotations() {
    if (!id) return;
    setAnnotations(getPdfAnnotations(id));
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !quote.trim()) return;
    savePdfAnnotation({
      reference_id: id,
      page,
      color,
      quote: quote.trim(),
      note: note.trim(),
    });
    setQuote('');
    setNote('');
    reloadAnnotations();
  }

  function handleDelete(annId: string) {
    deletePdfAnnotation(annId);
    reloadAnnotations();
  }

  function handleEditNote(annId: string, newNote: string) {
    updatePdfAnnotation(annId, { note: newNote });
    reloadAnnotations();
  }

  // Triggered from the hover popup on a highlighted span in the PDF.  Scroll
  // the matching sidebar card into view and put it in edit mode so the user
  // can start typing immediately.
  const [editingId, setEditingId] = useState<string | null>(null);
  function handleRequestEdit(annId: string) {
    setEditingId(annId);
    setTimeout(() => {
      document
        .getElementById(`ann-card-${annId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  }

  if (!loaded) {
    return <div className="p-10 text-tertiary text-sm">Loading…</div>;
  }

  if (!id) {
    return (
      <div className="max-w-content mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <p className="text-tertiary text-sm mb-4">
          Missing <code>?id=</code> parameter.
        </p>
        <Link href="/references/" className="text-primary hover:underline text-sm">
          ← Back to Reference Library
        </Link>
      </div>
    );
  }

  if (loadError || !ref) {
    return (
      <div className="max-w-content mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <p className="text-tertiary text-sm mb-4">
          {loadError || 'Reference not found.'}
        </p>
        <Link href="/references/" className="text-primary hover:underline text-sm">
          ← Back to Reference Library
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-wide mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-4">
        <Link href="/references/" className="text-primary hover:underline text-xs">
          ← Back to Reference Library
        </Link>
        <h1 className="text-xl font-bold text-tertiary-dark mt-2 leading-snug">
          {ref.title}
        </h1>
        <div className="text-xs text-tertiary mt-1">
          {ref.authors}
          {ref.year && <> ({ref.year})</>}
          {ref.journal && <> · <span className="italic">{ref.journal}</span></>}
          {ref.doi && (
            <>
              {' · '}
              <a
                href={`https://doi.org/${ref.doi}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                DOI: {ref.doi}
              </a>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* PDF viewer — 2/3 width */}
        <div className="lg:col-span-2">
          <div className="border border-grey-200 rounded-lg overflow-hidden bg-white">
            {ref.pdfUrl ? (
              <PdfAnnotator
                // Server-side refs get proxied through our own origin so
                // pdfjs's fetch isn't blocked by Supabase's CORS config.
                // Browser-local refs don't exist on the server, so we hit
                // the raw URL directly (public Supabase buckets allow CORS
                // for GETs).  Either way we provide the raw URL as a
                // fallback so the viewer can retry if the primary fails.
                pdfUrl={
                  ref.source === 'server'
                    ? `/api/references/pdf?id=${encodeURIComponent(ref.id)}`
                    : ref.pdfUrl
                }
                fallbackUrl={ref.pdfUrl}
                page={page}
                onPageChange={setPage}
                onSelectText={handleSelectText}
                onEditAnnotation={handleRequestEdit}
                onDeleteAnnotation={handleDelete}
                annotations={annotations}
              />
            ) : (
              <div className="p-10 text-center text-tertiary text-sm space-y-3">
                <p>No PDF uploaded for this reference.</p>
                <p>
                  Upload one from the{' '}
                  <Link
                    href={`/references/?ref=${encodeURIComponent(ref.id)}`}
                    className="text-primary hover:underline"
                  >
                    reference editor
                  </Link>{' '}
                  to enable inline annotation.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Annotation panel — 1/3 width */}
        <aside className="space-y-4">
          {/* Add annotation form */}
          <form
            onSubmit={handleAdd}
            className="border border-grey-200 rounded-lg bg-white p-4 space-y-3"
          >
            <h2 className="font-semibold text-sm text-tertiary-dark">New annotation</h2>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="block text-[11px] font-medium text-tertiary mb-1">
                  Page
                </label>
                <input
                  type="number"
                  min={1}
                  value={page}
                  onChange={e => setPage(parseInt(e.target.value) || 1)}
                  className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-medium text-tertiary mb-1">
                  Highlight
                </label>
                <div className="flex gap-1.5 pt-1">
                  {ANNOTATION_COLORS.map(c => (
                    <button
                      type="button"
                      key={c.value}
                      onClick={() => setColor(c.value)}
                      className={`w-6 h-6 rounded-full border-2 transition ${
                        color === c.value ? 'border-primary scale-110' : 'border-grey-200'
                      }`}
                      style={{ background: c.value }}
                      title={c.name}
                      aria-label={`Set color ${c.name}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-tertiary mb-1">
                Quote / excerpt
              </label>
              <textarea
                value={quote}
                onChange={e => setQuote(e.target.value)}
                rows={3}
                placeholder="Select text in the PDF to populate this field"
                className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm resize-none"
              />
              <p className="text-[10px] text-tertiary mt-1 italic">
                Tip: highlight a passage in the PDF and it will appear here.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-tertiary mb-1">
                Note
              </label>
              <textarea
                ref={noteInputRef}
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                placeholder="Your comment, interpretation, or question"
                className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={!quote.trim()}
              className="w-full px-3 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary-dark transition disabled:opacity-50"
            >
              Add annotation
            </button>
          </form>

          {/* Annotation list */}
          <div className="border border-grey-200 rounded-lg bg-white">
            <div className="px-4 py-3 border-b border-grey-100 flex items-center justify-between">
              <h2 className="font-semibold text-sm text-tertiary-dark">Annotations</h2>
              <span className="text-xs text-tertiary">{annotations.length}</span>
            </div>

            {annotations.length === 0 ? (
              <p className="p-4 text-xs text-tertiary text-center">
                No annotations yet. Add one above to get started.
              </p>
            ) : (
              <ul className="divide-y divide-grey-100 max-h-[60vh] overflow-y-auto">
                {annotations
                  .slice()
                  .sort((a, b) => a.page - b.page)
                  .map(a => (
                    <AnnotationCard
                      key={a.id}
                      annotation={a}
                      autoEdit={editingId === a.id}
                      onAutoEditConsumed={() => setEditingId(null)}
                      onDelete={() => handleDelete(a.id)}
                      onEditNote={(n: string) => handleEditNote(a.id, n)}
                    />
                  ))}
              </ul>
            )}
          </div>

          <p className="text-[11px] text-tertiary leading-relaxed px-1">
            Annotations are stored in your browser only. Clearing browser data
            will remove them.
          </p>
        </aside>
      </div>
    </div>
  );
}

function AnnotationCard({
  annotation,
  autoEdit,
  onAutoEditConsumed,
  onDelete,
  onEditNote,
}: {
  annotation: PdfAnnotation;
  autoEdit?: boolean;
  onAutoEditConsumed?: () => void;
  onDelete: () => void;
  onEditNote: (note: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(annotation.note);

  // Open in edit mode when the parent requests it (e.g. user clicked Edit in
  // the PDF hover popup).
  useEffect(() => {
    if (autoEdit) {
      setDraft(annotation.note);
      setEditing(true);
      onAutoEditConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEdit]);

  function handleSave() {
    onEditNote(draft);
    setEditing(false);
  }

  return (
    <li id={`ann-card-${annotation.id}`} className="p-3 text-sm scroll-mt-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium text-tertiary uppercase tracking-wide">
          Page {annotation.page}
        </span>
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full border border-grey-200"
            style={{ background: annotation.color }}
          />
          <button
            onClick={onDelete}
            className="text-[11px] text-tertiary hover:text-red-600"
            title="Delete annotation"
            aria-label="Delete annotation"
          >
            ✕
          </button>
        </div>
      </div>

      <blockquote
        className="text-xs italic px-2 py-1 rounded mb-2 border-l-2 border-grey-300"
        style={{ background: annotation.color + '66' }}
      >
        “{annotation.quote}”
      </blockquote>

      {editing ? (
        <div className="space-y-1.5">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={3}
            className="w-full px-2 py-1 border border-grey-200 rounded text-xs"
          />
          <div className="flex gap-1.5">
            <button
              onClick={handleSave}
              className="px-2 py-1 bg-primary text-white rounded text-[11px]"
            >
              Save
            </button>
            <button
              onClick={() => { setEditing(false); setDraft(annotation.note); }}
              className="px-2 py-1 border border-grey-200 rounded text-[11px] text-tertiary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="text-xs text-tertiary-dark cursor-text hover:bg-grey-50 rounded px-1 py-0.5 min-h-[1.5em]"
          title="Click to edit"
        >
          {annotation.note || (
            <span className="text-tertiary italic">Click to add a note…</span>
          )}
        </div>
      )}
    </li>
  );
}
