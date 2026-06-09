import { NextRequest, NextResponse } from 'next/server';
import {
  deleteSummary,
  getSummaries,
  getSummary,
  isPersistent,
  upsertSummaries,
} from '@/lib/content-analysis-store';
import type {
  DocumentSummary,
  SummaryBlock,
  SummaryDiagramLayout,
  SummaryDiagramNode,
} from '@/lib/content-analysis/types';

/**
 * Document-summaries API
 *
 * Durable backend for whole-document summaries in the content-analysis
 * workbench — a "comment for the entire paper" attached to a document
 * (policy, grey or scientific literature) as a whole. Beyond a plain-text
 * lead, a summary can carry a rich deck of slides (text, SmartArt-style
 * flowcharts, screenshots). Persisting them means a summary written by one
 * analyst is visible to the whole Secretariat, not just the author's browser.
 *
 * The rich `blocks` deck is heavy (embedded screenshots), so it is lazy:
 *   GET  /api/content-analysis/summaries          → light list (no `blocks`)
 *   GET  /api/content-analysis/summaries?id=<id>  → one summary WITH `blocks`
 *   POST /api/content-analysis/summaries          → upsert one or many
 *                                             body: { summaries: DocumentSummary[] }
 *                                                  | DocumentSummary
 *   DELETE /api/content-analysis/summaries        → ?id=<id>  or body { id }
 */

const MAX_TEXT_LEN = 20000;
const MAX_BATCH = 200;
const MAX_BLOCKS = 50;
const MAX_BLOCK_TEXT = 20000;
// ~8MB of base64 per screenshot — generous for a UI screenshot, bounded so a
// single paste can't blow up the row / the lazy fetch.
const MAX_IMAGE_SRC = 8 * 1024 * 1024;
const MAX_DIAGRAM_NODES = 30;
const DIAGRAM_LAYOUTS: SummaryDiagramLayout[] = ['process', 'list', 'cycle', 'hierarchy'];

function clampString(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.slice(0, max);
}

function coerceDiagramNode(raw: unknown): SummaryDiagramNode | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return null;
  const node: SummaryDiagramNode = { id: r.id, text: clampString(r.text, 500) };
  if (Array.isArray(r.children)) {
    node.children = r.children.filter((c): c is string => typeof c === 'string').slice(0, MAX_DIAGRAM_NODES);
  }
  return node;
}

function coerceBlock(raw: unknown): SummaryBlock | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return null;
  if (r.kind === 'text') {
    return { id: r.id, kind: 'text', text: clampString(r.text, MAX_BLOCK_TEXT) };
  }
  if (r.kind === 'image') {
    const src = clampString(r.src, MAX_IMAGE_SRC);
    if (!src) return null;
    return {
      id: r.id,
      kind: 'image',
      src,
      alt: clampString(r.alt, 500),
      caption: clampString(r.caption, 1000),
    };
  }
  if (r.kind === 'diagram') {
    const layout = DIAGRAM_LAYOUTS.includes(r.layout as SummaryDiagramLayout)
      ? (r.layout as SummaryDiagramLayout)
      : 'process';
    const nodes = Array.isArray(r.nodes)
      ? r.nodes.map(coerceDiagramNode).filter((n): n is SummaryDiagramNode => n !== null).slice(0, MAX_DIAGRAM_NODES)
      : [];
    return { id: r.id, kind: 'diagram', layout, title: clampString(r.title, 300), nodes };
  }
  if (r.kind === 'mermaid') {
    const code = clampString(r.code, MAX_BLOCK_TEXT);
    if (!code) return null;
    return { id: r.id, kind: 'mermaid', title: clampString(r.title, 300), code };
  }
  return null;
}

function coerceBlocks(raw: unknown): SummaryBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(coerceBlock)
    .filter((b): b is SummaryBlock => b !== null)
    .slice(0, MAX_BLOCKS);
}

function coerceSummary(raw: unknown): DocumentSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return null;
  if (typeof r.documentId !== 'string' || !r.documentId) return null;
  const now = new Date().toISOString();
  const blocks = coerceBlocks(r.blocks);
  return {
    id: r.id,
    documentId: r.documentId,
    projectId: typeof r.projectId === 'string' ? r.projectId : null,
    text: clampString(r.text, MAX_TEXT_LEN),
    blocks,
    blockCount: blocks.length,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : now,
  };
}

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (id) {
      // Lazy-load path: a single summary hydrated with its full `blocks` deck.
      const item = await getSummary(id);
      if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ item, persistent: isPersistent() });
    }
    const items = await getSummaries();
    return NextResponse.json({
      items,
      total: items.length,
      persistent: isPersistent(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to load summaries: ${message}` },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawBatch: unknown[] = Array.isArray(body?.summaries)
      ? body.summaries
      : Array.isArray(body)
        ? body
        : [body];
    if (rawBatch.length > MAX_BATCH) {
      return NextResponse.json(
        { error: `Batch too large (max ${MAX_BATCH})` },
        { status: 400 },
      );
    }
    const summaries: DocumentSummary[] = [];
    for (const raw of rawBatch) {
      const s = coerceSummary(raw);
      if (s) summaries.push(s);
    }
    if (summaries.length === 0) {
      return NextResponse.json({ error: 'No valid summaries' }, { status: 400 });
    }
    await upsertSummaries(summaries);
    return NextResponse.json({
      status: 'ok',
      count: summaries.length,
      persistent: isPersistent(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to save summaries: ${message}` },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    let id = request.nextUrl.searchParams.get('id') || '';
    if (!id) {
      try {
        const body = (await request.json()) as { id?: unknown };
        if (typeof body.id === 'string') id = body.id;
      } catch { /* no body */ }
    }
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    const ok = await deleteSummary(id);
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ status: 'deleted', id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to delete summary: ${message}` },
      { status: 500 },
    );
  }
}
