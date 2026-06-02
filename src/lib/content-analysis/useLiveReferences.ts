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
// For the workbench we mirror (1) + (2) — the two sources every user can see
// without signing in — and map each entry onto a minimal AnalysisDocument
// so the existing DocumentList / segment pipeline works unchanged.
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
        const resp = await fetch('/api/references/library', { cache: 'no-store' });
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
    referenceType: normaliseRefType(r.type),
  };
}

/** Map an arbitrary `type` string from the live references API onto the
 *  closed reference-type union; unknowns fall back to 'report' (grey
 *  literature) so they still land in a usable bucket. */
function normaliseRefType(t: string | undefined): AnalysisDocument['referenceType'] {
  switch (t) {
    case 'article':
    case 'report':
    case 'web':
    case 'chapter':
    case 'legislation':
    case 'book':
      return t;
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
