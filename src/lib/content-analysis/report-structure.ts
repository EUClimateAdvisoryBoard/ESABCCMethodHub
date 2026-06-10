// ---------------------------------------------------------------------------
// Report structure — the bridge between coded literature and the written
// report.
// ---------------------------------------------------------------------------
//
// The Content Analysis workbench lets analysts code the policy corpus and the
// scientific / grey literature with a shared tag system. The *point* of all
// that coding, for the ESABCC, is to write good scientific reports: every
// claim in the report should be traceable to coded evidence in a source.
//
// A `ReportOutline` is the skeleton of that report — an ordered list of
// sections, each mapped to one or more codes (a code subtree). Once a section
// declares which codes belong to it, the analysis views can answer the
// questions that actually matter when drafting:
//
//   • Which articles & sources belong in this section? (their coded segments
//     fall under the section's codes)
//   • How strong is the evidence — one source, or triangulated across many?
//   • Which sections are still empty (gaps to fill before drafting)?
//   • Which codes / sources haven't been slotted into the report yet?
//
// Outlines are persisted per workspace project in localStorage (mirroring the
// `ca:ws-corpus:` convention) so each report keeps its own structure. The
// shapes are JSON-friendly so a future server store can take over unchanged.
// ---------------------------------------------------------------------------

import type { AnalysisDocument, CodeNode, CodedSegment } from './types';
import { descendantCodeIds } from './store';
import { supabase } from '@/lib/supabase';

/** One section of the report skeleton. A section "owns" the evidence coded
 *  under any of its `codeIds` (each expanded to its full subtree). */
export interface ReportSection {
  id: string;
  title: string;
  /** Short guidance on what belongs in this section. */
  description?: string;
  /** Codes whose subtrees provide this section's evidence. May be empty for
   *  framing sections (Introduction, Discussion…) that synthesise rather than
   *  carry their own coded passages. */
  codeIds: string[];
}

export interface ReportOutline {
  version: 1;
  sections: ReportSection[];
}

const OUTLINE_VERSION = 1 as const;

function outlineKey(projectId: string): string {
  return `ca:report-outline:${projectId}`;
}

function newId(prefix: string): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rnd}`;
}

/**
 * A sensible scientific-report skeleton, auto-seeded from the project's
 * top-level tags. Framing sections (Introduction, Synthesis, Conclusions)
 * start unmapped — they pull together the thematic sections rather than
 * carrying their own codes — while each root code becomes its own evidence
 * section, pre-mapped so the analyst sees their literature placed from the
 * first click.
 */
export function buildDefaultOutline(rootCodes: CodeNode[]): ReportOutline {
  const thematic: ReportSection[] = rootCodes.map(c => ({
    id: newId('sec'),
    title: c.name,
    description: c.description,
    codeIds: [c.id],
  }));
  return {
    version: OUTLINE_VERSION,
    sections: [
      {
        id: newId('sec'),
        title: 'Introduction & scope',
        description: 'Frame the question, the policy context and what the report covers.',
        codeIds: [],
      },
      ...thematic,
      {
        id: newId('sec'),
        title: 'Synthesis & discussion',
        description: 'Cross-cutting findings, agreements and contradictions across the evidence, and the gaps that remain.',
        codeIds: [],
      },
      {
        id: newId('sec'),
        title: 'Conclusions & recommendations',
        description: 'What the coded evidence does — and does not — support.',
        codeIds: [],
      },
    ],
  };
}

/** Load a project's saved outline, or build the suggested default. SSR-safe. */
export function loadOutline(projectId: string, rootCodes: CodeNode[]): ReportOutline {
  if (typeof window === 'undefined') return buildDefaultOutline(rootCodes);
  try {
    const raw = localStorage.getItem(outlineKey(projectId));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ReportOutline>;
      if (parsed && parsed.version === OUTLINE_VERSION && Array.isArray(parsed.sections)) {
        return { version: OUTLINE_VERSION, sections: parsed.sections };
      }
    }
  } catch {
    /* corrupt storage — fall through to default */
  }
  return buildDefaultOutline(rootCodes);
}

export function saveOutline(projectId: string, outline: ReportOutline): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(outlineKey(projectId), JSON.stringify(outline));
  } catch {
    /* quota — ignore */
  }
}

/**
 * Fetch the shared outline from the server (the source of truth across
 * collaborators). Returns null on a miss / when the API is unreachable so the
 * caller can fall back to its localStorage cache or the seeded default.
 */
export async function fetchOutline(projectId: string): Promise<ReportOutline | null> {
  if (typeof window === 'undefined') return null;
  try {
    const resp = await fetch(
      `/api/content-analysis/outline?projectId=${encodeURIComponent(projectId)}`,
    );
    if (!resp.ok) return null;
    const data = (await resp.json()) as { outline?: Partial<ReportOutline> | null };
    const o = data.outline;
    if (o && o.version === OUTLINE_VERSION && Array.isArray(o.sections)) {
      return { version: OUTLINE_VERSION, sections: o.sections };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Persist the outline to the shared server store so every collaborator sees it.
 * Also writes the localStorage cache for instant reloads. Best-effort on the
 * network side — the cache keeps the editing session consistent meanwhile.
 */
export async function pushOutline(projectId: string, outline: ReportOutline): Promise<void> {
  saveOutline(projectId, outline);
  if (typeof window === 'undefined') return;
  try {
    // The bearer token attributes the save to the signed-in user (the server
    // requires it and stamps `updated_by` for the project activity log).
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const tok = data.session?.access_token;
      if (tok) headers.authorization = `Bearer ${tok}`;
    }
    await fetch('/api/content-analysis/outline', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ projectId, outline }),
    });
  } catch {
    /* best-effort — the cache already reflects the change this session */
  }
}

/** A fresh, empty section ready to be inserted into an outline. */
export function makeSection(title = 'New section'): ReportSection {
  return { id: newId('sec'), title, description: '', codeIds: [] };
}

// ── Evidence aggregation ────────────────────────────────────────────────────

/** Expand a set of code ids to include every descendant, across scopes. */
export function expandCodeIds(codes: CodeNode[], codeIds: string[]): Set<string> {
  const out = new Set<string>();
  for (const id of codeIds) for (const d of descendantCodeIds(codes, id)) out.add(d);
  return out;
}

/** The evidence a single source (document) contributes to a code set. */
export interface SourceEvidence {
  document: AnalysisDocument;
  segments: CodedSegment[];
  /** Distinct codes from the set this source touches (most-used first). */
  codeIds: string[];
}

/** Everything a report section is backed by — the headline aggregation. */
export interface SectionEvidence {
  segments: CodedSegment[];
  /** Sources that contribute evidence, most-cited first. */
  sources: SourceEvidence[];
  /** Distinct document count — the triangulation denominator. */
  sourceCount: number;
}

/**
 * Roll up the evidence for a set of codes across the corpus: which sources
 * contribute, how many quotes each, and the codes they touch. Drives the
 * report-outline section cards, the "which articles belong here" placement
 * and the citable evidence bank.
 */
export function aggregateEvidence(
  codeIds: string[],
  codes: CodeNode[],
  documents: AnalysisDocument[],
  segments: CodedSegment[],
): SectionEvidence {
  const scope = expandCodeIds(codes, codeIds);
  const docById = new Map(documents.map(d => [d.id, d]));
  const matched = scope.size === 0 ? [] : segments.filter(s => scope.has(s.codeId));

  const byDoc = new Map<string, CodedSegment[]>();
  for (const s of matched) {
    const list = byDoc.get(s.documentId);
    if (list) list.push(s);
    else byDoc.set(s.documentId, [s]);
  }

  const sources: SourceEvidence[] = [];
  for (const [docId, segs] of byDoc) {
    const document = docById.get(docId);
    if (!document) continue;
    const codeCount = new Map<string, number>();
    for (const s of segs) codeCount.set(s.codeId, (codeCount.get(s.codeId) ?? 0) + 1);
    const codeIdsRanked = [...codeCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
    sources.push({ document, segments: segs, codeIds: codeIdsRanked });
  }
  sources.sort((a, b) => b.segments.length - a.segments.length);

  return { segments: matched, sources, sourceCount: sources.length };
}

// ── Triangulation / evidence strength ────────────────────────────────────────

export type EvidenceStrength = 'gap' | 'single' | 'emerging' | 'strong';

/** Classify how well a finding is supported, by the number of *independent
 *  sources* — the core triangulation test in qualitative synthesis. */
export function evidenceStrength(sourceCount: number): EvidenceStrength {
  if (sourceCount === 0) return 'gap';
  if (sourceCount === 1) return 'single';
  if (sourceCount === 2) return 'emerging';
  return 'strong';
}

export const STRENGTH_META: Record<EvidenceStrength, { label: string; color: string; hint: string }> = {
  gap: {
    label: 'Evidence gap',
    color: '#B83230',
    hint: 'No coded evidence yet — fill this before drafting.',
  },
  single: {
    label: 'Single source',
    color: '#D97706',
    hint: 'Backed by one source only — seek corroboration before relying on it.',
  },
  emerging: {
    label: 'Emerging',
    color: '#0065A4',
    hint: 'Two independent sources — a finding is forming.',
  },
  strong: {
    label: 'Well-supported',
    color: '#00928F',
    hint: 'Triangulated across three or more independent sources.',
  },
};

// ── Citation labels ──────────────────────────────────────────────────────────

/** First author's surname (with "et al." when there are co-authors). */
function firstAuthorSurname(authors: string | undefined): string | null {
  if (!authors) return null;
  const parts = authors.split(/;| and |&/).map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const first = parts[0];
  const surname = (first.split(',')[0] || first).trim();
  if (!surname) return null;
  return parts.length > 1 ? `${surname} et al.` : surname;
}

/**
 * A short, citation-style label for a source — "Author (Year)" for references,
 * the short title (or CELEX) for policy documents. Used everywhere a source is
 * named in the analysis views so the matrix and evidence bank read like a real
 * literature synthesis rather than a list of opaque ids.
 */
export function citationLabel(doc: AnalysisDocument): string {
  if ((doc.sourceKind ?? 'policy') === 'reference') {
    const author = firstAuthorSurname(doc.referenceAuthors);
    if (author && doc.referenceYear) return `${author} (${doc.referenceYear})`;
    if (author) return author;
    if (doc.referenceYear) return `${doc.shortTitle} (${doc.referenceYear})`;
    return doc.shortTitle || doc.title;
  }
  return doc.shortTitle || doc.celexNumber || doc.title;
}

/** A fuller reference line for export — "Author (Year). Title." or the policy
 *  title with its CELEX. */
export function fullCitation(doc: AnalysisDocument): string {
  if ((doc.sourceKind ?? 'policy') === 'reference') {
    const bits = [
      doc.referenceAuthors?.trim(),
      doc.referenceYear ? `(${doc.referenceYear})` : null,
      doc.title?.trim(),
    ].filter(Boolean);
    return bits.join('. ').replace('. (', ' (');
  }
  const tail = doc.celexNumber ? ` [CELEX ${doc.celexNumber}]` : '';
  return `${doc.title}${tail}`;
}
