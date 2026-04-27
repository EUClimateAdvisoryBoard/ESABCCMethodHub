// ---------------------------------------------------------------------------
// PDF annotations for reference library entries.
//
// Annotations are stored in localStorage, keyed by the reference id.  Each
// annotation is page-anchored (1-based page number) and carries a quote
// excerpt, a free-text note, and a highlight color.  Persistence is per
// browser; we don't try to share annotations across users yet.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'esabcc_pdf_annotations';

export interface PdfAnnotation {
  id: string;
  reference_id: string;
  page: number;            // 1-based page number
  color: string;           // highlight color
  quote: string;           // selected text excerpt or short label
  note: string;            // user comment
  created_at: string;
}

export const ANNOTATION_COLORS = [
  { name: 'yellow', value: '#FDE68A' },
  { name: 'green',  value: '#BBF7D0' },
  { name: 'blue',   value: '#BFDBFE' },
  { name: 'pink',   value: '#FBCFE8' },
  { name: 'orange', value: '#FED7AA' },
];

function readAll(): PdfAnnotation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PdfAnnotation[]) : [];
  } catch {
    return [];
  }
}

function writeAll(all: PdfAnnotation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    // Let any listeners (e.g. the recent-annotations feed on the references
    // page) know that annotations have changed so they can refresh within
    // the same tab — storage events only fire across tabs.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('esabcc:annotations-changed'));
    }
  } catch (err) {
    console.error('Failed to save PDF annotations:', err);
  }
}

export function getPdfAnnotations(referenceId?: string): PdfAnnotation[] {
  const all = readAll();
  return referenceId ? all.filter(a => a.reference_id === referenceId) : all;
}

export function getPdfAnnotationCount(referenceId: string): number {
  return getPdfAnnotations(referenceId).length;
}

export function getAllPdfAnnotationCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of readAll()) {
    counts[a.reference_id] = (counts[a.reference_id] || 0) + 1;
  }
  return counts;
}

// Returns every annotation across every reference, sorted newest-first by
// created_at.  Used by the recent-activity feed on the reference library
// page.  `limit` caps the size of the returned list.
export function getRecentPdfAnnotations(limit = 20): PdfAnnotation[] {
  return readAll()
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

export function savePdfAnnotation(
  ann: Omit<PdfAnnotation, 'id' | 'created_at'>
): PdfAnnotation {
  const all = readAll();
  const newAnn: PdfAnnotation = {
    ...ann,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  all.unshift(newAnn);
  writeAll(all);
  return newAnn;
}

export function updatePdfAnnotation(
  id: string,
  updates: Partial<Pick<PdfAnnotation, 'note' | 'color' | 'quote' | 'page'>>
): void {
  const all = readAll();
  const idx = all.findIndex(a => a.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...updates };
    writeAll(all);
  }
}

export function deletePdfAnnotation(id: string): void {
  writeAll(readAll().filter(a => a.id !== id));
}

export function deleteAllPdfAnnotationsForReference(referenceId: string): void {
  writeAll(readAll().filter(a => a.reference_id !== referenceId));
}
