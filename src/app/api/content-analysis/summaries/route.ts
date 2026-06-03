import { NextRequest, NextResponse } from 'next/server';
import {
  deleteSummary,
  getSummaries,
  isPersistent,
  upsertSummaries,
} from '@/lib/content-analysis-store';
import type { DocumentSummary } from '@/lib/content-analysis/types';

/**
 * Document-summaries API
 *
 * Durable backend for whole-document summaries in the content-analysis
 * workbench — a free-text "comment for the entire paper" attached to a
 * document (policy, grey or scientific literature) as a whole. Persisting
 * them means a summary written by one analyst is visible to the whole
 * Secretariat, not just the author's browser.
 *
 *   GET    /api/content-analysis/summaries  → list all summaries
 *   POST   /api/content-analysis/summaries  → upsert one or many summaries
 *                                             body: { summaries: DocumentSummary[] }
 *                                                  | DocumentSummary
 *   DELETE /api/content-analysis/summaries  → ?id=<id>  or body { id }
 */

const MAX_TEXT_LEN = 20000;
const MAX_BATCH = 200;

function clampString(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.slice(0, max);
}

function coerceSummary(raw: unknown): DocumentSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return null;
  if (typeof r.documentId !== 'string' || !r.documentId) return null;
  const now = new Date().toISOString();
  return {
    id: r.id,
    documentId: r.documentId,
    projectId: typeof r.projectId === 'string' ? r.projectId : null,
    text: clampString(r.text, MAX_TEXT_LEN),
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : now,
  };
}

export async function GET() {
  const items = await getSummaries();
  return NextResponse.json({
    items,
    total: items.length,
    persistent: isPersistent(),
  });
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
