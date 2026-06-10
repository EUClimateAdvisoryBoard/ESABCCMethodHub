'use client';

// ---------------------------------------------------------------------------
// Live reference loader for the content-analysis workbench.
//
// The reference manager (/references) mixes three sources:
//   1. `@/data/references` — the shipped 2,600-entry ESABCC static library,
//   2. `/api/references/library` — custom refs synced from the VBA add-in
//      and the web ingestion flows (the "live stack"),
//   3. Supabase-backed libraries (user-authenticated).
//
// For the workbench we mirror (1) + (2) + (3) — `/api/references/library`
// is called with `?includeManager=1`, which folds the Supabase `references`
// table into the same response as `custom_references`, so a reference added
// through the Reference Manager in either mode is addable here. Each entry is
// mapped onto a minimal AnalysisDocument so the existing DocumentList /
// segment pipeline works unchanged.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { references as staticRefs } from '@/data/references';
import type { AnalysisDocument } from '@/lib/content-analysis/types';

interface ApiRef {
  id: string;
  doi?: string;
  title: string;
  authors: string;
  year: string;
  journal?: string;
  type?: string;
  url?: string;
  pdfUrl?: string;
  source?: string;
  addedAt?: string;
}

export interface LiveReferencesState {
  docs: AnalysisDocument[];
  /** Total hits (live + static) before PDF filter. */
  total: number;
  /** Count that actually have a usable PDF / URL. */
  withPdf: number;
  loading: boolean;
  error: string | null;
}

export function useLiveReferences(): LiveReferencesState {
  const [state, setState] = useState<LiveReferencesState>({
    docs: [],
    total: 0,
    withPdf: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Static references are synchronous. Load them first so the UI is
      // populated even if the network is slow.
      const baseDocs = staticRefs.map(staticToAnalysisDoc).filter(Boolean) as AnalysisDocument[];
      const baseWithPdf = baseDocs.filter(hasAttachedPdf).length;
      setState(s => ({ ...s, docs: baseDocs, total: baseDocs.length, withPdf: baseWithPdf }));

      try {
        // `includeManager=1` merges the Supabase `references` table (the web
        // Reference Manager's store) into the response, so a reference added
        // through the Reference Manager — not just the VBA / fallback
        // `custom_references` store — is addable to a workspace here too.
        const resp = await fetch('/api/references/library?includeManager=1', { cache: 'no-store' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = (await resp.json()) as { references?: ApiRef[] };
        const liveRefs = Array.isArray(data.references) ? data.references : [];
        const liveDocs = liveRefs.map(apiToAnalysisDoc).filter(Boolean) as AnalysisDocument[];
        if (cancelled) return;
        const merged = dedupeById([...liveDocs, ...baseDocs]);
        setState({
          docs: merged,
          total: merged.length,
          withPdf: merged.filter(hasAttachedPdf).length,
          loading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState(s => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    }
    load();

    return () => { cancelled = true; };
  }, []);

  return state;
}

/** A reference is "usable" when we have a URL / DOI / PDF URL pointing at
 *  something we could pull text from. Used for the "with PDF only" filter. */
export function hasAttachedPdf(doc: AnalysisDocument): boolean {
  return Boolean(doc.referenceUrl || doc.pdfUrl || doc.eurlexUrl);
}

// ── Mapping helpers ───────────────────────────────────────────────────────
function staticToAnalysisDoc(r: typeof staticRefs[number]): AnalysisDocument | null {
  const titleClean = r.title.replace(/\s+/g, ' ').trim();
  if (!titleClean) return null;
  const shortTitle = titleClean.length > 90 ? titleClean.slice(0, 87) + '…' : titleClean;
  const urlForPdf = r.url ?? (r.doi ? `https://doi.org/${r.doi}` : null);
  return {
    id: `ref-doc-${r.id}`,
    title: r.title,
    shortTitle,
    kind: mapKind(r.type),
    celexNumber: null,
    eurlexUrl: null,
    adoptionDate: r.year ? `${r.year}-01-01` : null,
    text: '',
    aiCodeIds: ['root-crosscut'],
    sourceKind: 'reference',
    referenceAuthors: r.authors,
    referenceYear: r.year,
    referenceUrl: urlForPdf ?? undefined,
    referenceType: r.type,
  };
}

function apiToAnalysisDoc(r: ApiRef): AnalysisDocument | null {
  const titleClean = (r.title || '').replace(/\s+/g, ' ').trim();
  if (!titleClean) return null;
  const shortTitle = titleClean.length > 90 ? titleClean.slice(0, 87) + '…' : titleClean;
  const url = r.pdfUrl || r.url || (r.doi ? `https://doi.org/${r.doi}` : '');
  return {
    id: `ref-doc-${r.id}`,
    title: r.title,
    shortTitle,
    kind: mapKind(r.type),
    celexNumber: null,
    eurlexUrl: null,
    adoptionDate: r.year ? `${r.year}-01-01` : null,
    text: '',
    aiCodeIds: ['root-crosscut'],
    sourceKind: 'reference',
    referenceAuthors: r.authors,
    referenceYear: r.year,
    referenceUrl: url || undefined,
    // Surface the reference-manager PDF (stored in the `reference-pdfs`
    // bucket) so the content-analysis workbench can load it into the PDF
    // annotation pane instead of forcing the analyst to re-upload it. Kept
    // separate from `referenceUrl`, which may point at a DOI / landing page.
    pdfUrl: r.pdfUrl || undefined,
    referenceType: normaliseRefType(r.type),
    referenceAddedAt: r.addedAt || undefined,
  };
}

/**
 * Stable cache key (a synthetic "celex") for a reference document's PDF in
 * the content-analysis ingest cache. References have no real CELEX number, so
 * we derive one from the document id. It must satisfy the ingest routes'
 * `/^[0-9A-Z]{8,20}$/` guard and stay identical between the upload and the
 * subsequent view so `/api/content-analysis/pdf?celex=…` resolves the bytes.
 */
export function referencePdfCacheKey(docId: string): string {
  const cleaned = docId.toUpperCase().replace(/[^0-9A-Z]/g, '') || 'UPLOAD';
  return cleaned.slice(0, 20).padEnd(8, '0');
}

/**
 * Map an arbitrary `type` string from the live references API onto the closed
 * reference-type union used by the workbench.
 *
 * The live stack (VBA add-in + web ingestion) stores its `type` as a **CSL-JSON
 * item type** (`article-journal`, `paper-conference`, `webpage`, …; see
 * `CSLItemType` in `@/lib/references/types`), whereas the bundled static
 * library already uses the closed union (`article` / `report` / `web` /
 * `chapter` / `legislation` / `book`). Earlier this function only recognised
 * the closed union, so every CSL-typed reference — including peer-reviewed
 * `article-journal` papers — fell through to `report` and was mis-filed as
 * grey literature in the Content Analysis source filter. We now translate the
 * full CSL taxonomy so the scientific / grey split is correct for both stacks.
 *
 * Unknown / non-textual types fall back to `report` (grey), the safer bucket
 * for anything we can't confirm is peer-reviewed.
 */
function normaliseRefType(t: string | undefined): AnalysisDocument['referenceType'] {
  switch (t) {
    // ── Closed-union values (bundled static library) ──
    case 'article':
    case 'report':
    case 'web':
    case 'chapter':
    case 'legislation':
    case 'book':
      return t;

    // ── Scientific / peer-reviewed CSL types → article / book / chapter ──
    case 'article-journal':
    case 'paper-conference':
      return 'article';
    case 'entry-encyclopedia':
      return 'chapter';

    // ── Grey-literature CSL types → web / report ──
    case 'webpage':
    case 'article-newspaper':
    case 'article-magazine':
      return 'web';
    case 'thesis':
    case 'dataset':
    case 'manuscript':
      return 'report';

    default:
      return 'report';
  }
}

/** True when a reference is peer-reviewed scientific literature (article,
 *  book or book chapter); everything else (report, web, legislation) is
 *  treated as grey literature. */
export function isScientificLiterature(doc: AnalysisDocument): boolean {
  return doc.referenceType === 'article' || doc.referenceType === 'book' || doc.referenceType === 'chapter';
}

function mapKind(t: string | undefined): AnalysisDocument['kind'] {
  switch (t) {
    case 'legislation': return 'regulation';
    case 'report':      return 'report';
    case 'chapter':
    case 'book':
    case 'article':
    case 'web':
    default:
      return 'report';
  }
}

function dedupeById(docs: AnalysisDocument[]): AnalysisDocument[] {
  const seen = new Map<string, AnalysisDocument>();
  for (const d of docs) {
    if (!seen.has(d.id)) seen.set(d.id, d);
  }
  return [...seen.values()];
}
