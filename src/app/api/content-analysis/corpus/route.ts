import { NextRequest, NextResponse } from 'next/server';
import {
  addToCaCorpus,
  getCaCorpus,
  isPersistent,
  removeFromCaCorpus,
} from '@/lib/content-analysis-store';
import type { CorpusDocMeta } from '@/lib/content-analysis/types';

/**
 * Shared per-workspace document corpus API.
 *
 * Persists which documents an analyst has added to a project workspace (the
 * "In this workspace" list) so every collaborator on the project sees the same
 * set — previously this lived only in the adding browser's localStorage, so
 * workspaces appeared "not synced" between users.
 *
 * Each row also carries `meta`: a lightweight, self-describing snapshot of the
 * document (title, kind, source tier, reference author/year/type) captured when
 * it was added, so the list renders for every collaborator even before the
 * heavy document substrate has reached them.
 *
 *   GET    /api/content-analysis/corpus?projectId=<id>
 *            → { documents: { id, ...meta }[], documentIds: string[], persistent }
 *   POST   /api/content-analysis/corpus
 *            body: { projectId, documentId, meta? }   → add one
 *   DELETE /api/content-analysis/corpus?projectId=<id>&documentId=<id>
 *            → remove one
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ID_MAX = 256;

function validId(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= ID_MAX;
}

function str(v: unknown, max: number): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v.slice(0, max) : undefined;
}

const DOC_KINDS = new Set([
  'regulation', 'directive', 'decision', 'communication',
  'strategy', 'budget', 'implementation', 'report',
]);
const REF_TYPES = new Set(['article', 'report', 'web', 'chapter', 'legislation', 'book']);
const INGEST_SOURCES = new Set(['eurlex-pdf', 'eurlex-html', 'fallback-text', 'manual-upload']);

/** Validate / clamp the optional metadata blob a client posts, so we never
 *  store an unbounded or malformed object. Returns null when there's nothing
 *  usable, which leaves any existing richer row untouched. */
function coerceMeta(raw: unknown, documentId: string): CorpusDocMeta | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = str(r.title, 2000);
  if (!title) return null; // a row with no title can't render — skip it
  const kindRaw = typeof r.kind === 'string' && DOC_KINDS.has(r.kind) ? r.kind : 'report';
  const sourceKind = r.sourceKind === 'reference' ? 'reference' : 'policy';
  const aiCodeIds = Array.isArray(r.aiCodeIds)
    ? (r.aiCodeIds as unknown[]).filter((x): x is string => typeof x === 'string' && x.length <= ID_MAX).slice(0, 100)
    : undefined;
  const meta: CorpusDocMeta = {
    id: documentId,
    title,
    shortTitle: str(r.shortTitle, 300) ?? (title.length > 90 ? `${title.slice(0, 87)}…` : title),
    kind: kindRaw as CorpusDocMeta['kind'],
    sourceKind,
  };
  const celex = str(r.celexNumber, 100);
  if (celex !== undefined) meta.celexNumber = celex;
  else if (r.celexNumber === null) meta.celexNumber = null;
  const pdfUrl = str(r.pdfUrl, 4000);
  if (pdfUrl) meta.pdfUrl = pdfUrl;
  if (typeof r.pageCount === 'number' && Number.isFinite(r.pageCount)) meta.pageCount = r.pageCount;
  if (typeof r.ingestSource === 'string' && INGEST_SOURCES.has(r.ingestSource)) {
    meta.ingestSource = r.ingestSource as CorpusDocMeta['ingestSource'];
  }
  const ingestedAt = str(r.ingestedAt, 64);
  if (ingestedAt) meta.ingestedAt = ingestedAt;
  if (aiCodeIds && aiCodeIds.length) meta.aiCodeIds = aiCodeIds;
  if (typeof r.referenceType === 'string' && REF_TYPES.has(r.referenceType)) {
    meta.referenceType = r.referenceType as CorpusDocMeta['referenceType'];
  }
  const authors = str(r.referenceAuthors, 1000);
  if (authors) meta.referenceAuthors = authors;
  const year = str(r.referenceYear, 20);
  if (year) meta.referenceYear = year;
  const refUrl = str(r.referenceUrl, 4000);
  if (refUrl) meta.referenceUrl = refUrl;
  return meta;
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  if (!validId(projectId)) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }
  const entries = await getCaCorpus(projectId);
  const documentIds = entries.map(e => e.documentId);
  // Surface the metadata flattened with its id so the client can render a list
  // row directly. Entries with no stored meta (legacy id-only rows) are omitted
  // from `documents` but still present in `documentIds`.
  const documents = entries
    .filter(e => e.meta)
    .map(e => ({ ...(e.meta as CorpusDocMeta), id: e.documentId }));
  return NextResponse.json({ documents, documentIds, persistent: isPersistent() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const projectId = body?.projectId;
    const documentId = body?.documentId;
    if (!validId(projectId) || !validId(documentId)) {
      return NextResponse.json({ error: 'projectId and documentId required' }, { status: 400 });
    }
    const meta = coerceMeta(body?.meta, documentId);
    await addToCaCorpus(projectId, documentId, meta);
    return NextResponse.json({ status: 'ok', persistent: isPersistent() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to add to corpus: ${message}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  const documentId = request.nextUrl.searchParams.get('documentId');
  if (!validId(projectId) || !validId(documentId)) {
    return NextResponse.json({ error: 'projectId and documentId required' }, { status: 400 });
  }
  try {
    await removeFromCaCorpus(projectId, documentId);
    return NextResponse.json({ status: 'ok', persistent: isPersistent() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to remove from corpus: ${message}` }, { status: 500 });
  }
}
