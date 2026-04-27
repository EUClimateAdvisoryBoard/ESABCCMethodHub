/**
 * Legacy reference library — localStorage-backed PDF store.
 * ---------------------------------------------------------
 * Early-prototype shape that predates `src/lib/references/` (the
 * Supabase-backed service). This module still exists because a
 * handful of components import the `Reference` type shape; the
 * actual storage path is now `src/lib/references/reference-service.ts`
 * plus `src/lib/references/pdf-storage.ts`.
 *
 * PDFs are kept as base64 data URLs in localStorage here — fine for
 * a demo, not fine for production. Do not add new call sites to this
 * file; migrate usages to `src/lib/references/` and then delete this
 * module on the next cleanup pass.
 */

export interface Reference {
  id: string;
  title: string;
  authors: string;
  year: string;
  source: string;          // journal / publisher
  doi: string;
  type: 'journal' | 'report' | 'book' | 'other';
  pdf_data?: string;       // base64 data URL of the uploaded PDF
  pdf_filename?: string;
  added_at: string;
}

export interface PdfAnnotation {
  id: string;
  reference_id: string;
  page: number;            // 1-based page number
  color: string;           // highlight color
  quote: string;           // selected text excerpt or short label
  note: string;            // user comment
  created_at: string;
}

const REFS_KEY = 'eu-policy-references';
const ANNS_KEY = 'eu-policy-pdf-annotations';

// ─── References ─────────────────────────────────────────────────────────────

export function getReferences(): Reference[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REFS_KEY);
    return raw ? (JSON.parse(raw) as Reference[]) : [];
  } catch { return []; }
}

export function getReference(id: string): Reference | null {
  return getReferences().find(r => r.id === id) || null;
}

export function saveReference(ref: Omit<Reference, 'id' | 'added_at'>): Reference {
  const all = getReferences();
  const newRef: Reference = {
    ...ref,
    id: crypto.randomUUID(),
    added_at: new Date().toISOString(),
  };
  all.unshift(newRef);
  try {
    localStorage.setItem(REFS_KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to save reference (PDF may be too large for localStorage):', err);
    throw new Error('Could not save reference. The PDF may be too large for browser storage.');
  }
  return newRef;
}

export function updateReference(id: string, updates: Partial<Reference>): void {
  const all = getReferences();
  const idx = all.findIndex(r => r.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...updates };
    localStorage.setItem(REFS_KEY, JSON.stringify(all));
  }
}

export function deleteReference(id: string): void {
  const all = getReferences().filter(r => r.id !== id);
  localStorage.setItem(REFS_KEY, JSON.stringify(all));
  // Cascade-delete annotations
  const anns = getPdfAnnotations().filter(a => a.reference_id !== id);
  localStorage.setItem(ANNS_KEY, JSON.stringify(anns));
}

// ─── Annotations ────────────────────────────────────────────────────────────

export function getPdfAnnotations(referenceId?: string): PdfAnnotation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ANNS_KEY);
    const all: PdfAnnotation[] = raw ? JSON.parse(raw) : [];
    return referenceId ? all.filter(a => a.reference_id === referenceId) : all;
  } catch { return []; }
}

export function savePdfAnnotation(
  ann: Omit<PdfAnnotation, 'id' | 'created_at'>
): PdfAnnotation {
  const all = getPdfAnnotations();
  const newAnn: PdfAnnotation = {
    ...ann,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  all.unshift(newAnn);
  localStorage.setItem(ANNS_KEY, JSON.stringify(all));
  return newAnn;
}

export function updatePdfAnnotation(
  id: string,
  updates: Partial<Pick<PdfAnnotation, 'note' | 'color' | 'quote' | 'page'>>
): void {
  const all = getPdfAnnotations();
  const idx = all.findIndex(a => a.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...updates };
    localStorage.setItem(ANNS_KEY, JSON.stringify(all));
  }
}

export function deletePdfAnnotation(id: string): void {
  const all = getPdfAnnotations().filter(a => a.id !== id);
  localStorage.setItem(ANNS_KEY, JSON.stringify(all));
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const ANNOTATION_COLORS = [
  { name: 'yellow', value: '#FDE68A' },
  { name: 'green',  value: '#BBF7D0' },
  { name: 'blue',   value: '#BFDBFE' },
  { name: 'pink',   value: '#FBCFE8' },
  { name: 'orange', value: '#FED7AA' },
];
