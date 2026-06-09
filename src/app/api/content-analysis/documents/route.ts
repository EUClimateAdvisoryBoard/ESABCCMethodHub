import { NextRequest, NextResponse } from 'next/server';
import {
  getCaDocument,
  getCaDocuments,
  isPersistent,
  upsertCaDocuments,
} from '@/lib/content-analysis-store';
import type { Block, BlockKind, SharedIngestedDocument } from '@/lib/content-analysis/types';

/**
 * Shared ingested-documents API.
 *
 * Persists the *extracted* substrate of an ingested PDF (flat text + block
 * bounding boxes) keyed by document id, so once anyone ingests a document its
 * text/blocks are available to every user — no need to re-upload. The PDF bytes
 * themselves live in Supabase storage; only the lightweight extraction travels
 * through here.
 *
 *   GET  /api/content-analysis/documents          → light list (no text/blocks)
 *   GET  /api/content-analysis/documents?id=<id>  → one document WITH text+blocks
 *   POST /api/content-analysis/documents          → upsert one or many
 *                                       body: { documents: SharedIngestedDocument[] }
 *                                            | SharedIngestedDocument
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_TEXT_LEN = 5_000_000; // ~5 MB of extracted text — generous for big reports
const MAX_BLOCKS = 200_000;
const MAX_BATCH = 50;
const INGEST_SOURCES = ['eurlex-pdf', 'eurlex-html', 'fallback-text', 'manual-upload'];
const BLOCK_KINDS: BlockKind[] = ['heading', 'recital', 'article', 'paragraph', 'footer', 'table', 'unknown'];

function clampString(v: unknown, max: number): string {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

function coerceBlock(raw: unknown): Block | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return null;
  const page = typeof r.page === 'number' ? r.page : 1;
  const order = typeof r.order === 'number' ? r.order : 0;
  const kind = BLOCK_KINDS.includes(r.kind as BlockKind) ? (r.kind as BlockKind) : 'paragraph';
  const bboxes = Array.isArray(r.bboxes)
    ? (r.bboxes as unknown[])
        .filter(b => Array.isArray(b) && b.every(n => typeof n === 'number'))
        .map(b => b as number[])
    : [];
  return { id: r.id, page, order, kind, bboxes, text: clampString(r.text, 100_000) };
}

function coerceDocument(raw: unknown): SharedIngestedDocument | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return null;
  const blocks = Array.isArray(r.blocks)
    ? (r.blocks as unknown[]).map(coerceBlock).filter((b): b is Block => b !== null).slice(0, MAX_BLOCKS)
    : [];
  const ingestSource = INGEST_SOURCES.includes(r.ingestSource as string)
    ? (r.ingestSource as SharedIngestedDocument['ingestSource'])
    : undefined;
  return {
    id: r.id,
    title: clampString(r.title, 2000),
    celexNumber: typeof r.celexNumber === 'string' ? r.celexNumber : null,
    pageCount: typeof r.pageCount === 'number' ? r.pageCount : 0,
    ingestSource,
    pdfUrl: clampString(r.pdfUrl, 4000),
    ingestedAt: typeof r.ingestedAt === 'string' ? r.ingestedAt : new Date().toISOString(),
    text: clampString(r.text, MAX_TEXT_LEN),
    blocks,
  };
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (id) {
    const item = await getCaDocument(id);
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ item, persistent: isPersistent() });
  }
  const items = await getCaDocuments();
  return NextResponse.json({ items, total: items.length, persistent: isPersistent() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawBatch: unknown[] = Array.isArray(body?.documents)
      ? body.documents
      : Array.isArray(body)
        ? body
        : [body];
    if (rawBatch.length > MAX_BATCH) {
      return NextResponse.json({ error: `Batch too large (max ${MAX_BATCH})` }, { status: 400 });
    }
    const documents: SharedIngestedDocument[] = [];
    for (const raw of rawBatch) {
      const d = coerceDocument(raw);
      if (d) documents.push(d);
    }
    if (documents.length === 0) {
      return NextResponse.json({ error: 'No valid documents' }, { status: 400 });
    }
    await upsertCaDocuments(documents);
    return NextResponse.json({ status: 'ok', count: documents.length, persistent: isPersistent() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to save documents: ${message}` }, { status: 500 });
  }
}
