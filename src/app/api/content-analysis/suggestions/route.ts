import { NextRequest, NextResponse } from 'next/server';
import {
  clearDocumentSuggestions,
  deleteSuggestion,
  getSuggestions,
  isPersistent,
  replaceDocumentSuggestions,
} from '@/lib/content-analysis-store';
import type { CodeSuggestion } from '@/lib/content-analysis/types';

/**
 * Code-suggestions API
 *
 * Durable backend for pending AI-generated code suggestions awaiting
 * human review. Persisting them means one user's "AI suggest" run is
 * visible to every teammate, so any reviewer can accept or reject — not
 * just the person who triggered the run.
 *
 *   GET    /api/content-analysis/suggestions           → list all
 *   POST   /api/content-analysis/suggestions           → replace the batch
 *                                                        for one document
 *                                                        body: { documentId,
 *                                                                suggestions }
 *   DELETE /api/content-analysis/suggestions           → ?id=<id>
 *                                                        or ?documentId=<id>
 */

const MAX_QUOTE_LEN = 20000;
const MAX_RATIONALE_LEN = 4000;
const MAX_BATCH = 500;

function clampString(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.slice(0, max);
}

function coerceSuggestion(raw: unknown): CodeSuggestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return null;
  if (typeof r.documentId !== 'string' || !r.documentId) return null;
  if (typeof r.codeId !== 'string' || !r.codeId) return null;
  if (typeof r.startChar !== 'number' || typeof r.endChar !== 'number') return null;
  const conf = typeof r.confidence === 'number' ? r.confidence : 0;
  return {
    id: r.id,
    documentId: r.documentId,
    codeId: r.codeId,
    blockId: typeof r.blockId === 'string' ? r.blockId : undefined,
    startChar: r.startChar,
    endChar: r.endChar,
    quote: clampString(r.quote, MAX_QUOTE_LEN),
    rationale: clampString(r.rationale, MAX_RATIONALE_LEN),
    confidence: Math.max(0, Math.min(1, conf)),
    model: typeof r.model === 'string' ? r.model : undefined,
    createdAt:
      typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const items = await getSuggestions();
    return NextResponse.json({
      items,
      total: items.length,
      persistent: isPersistent(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to load suggestions: ${message}` },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const documentId = typeof body?.documentId === 'string' ? body.documentId : '';
    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 },
      );
    }
    const rawBatch: unknown[] = Array.isArray(body?.suggestions)
      ? body.suggestions
      : [];
    if (rawBatch.length > MAX_BATCH) {
      return NextResponse.json(
        { error: `Batch too large (max ${MAX_BATCH})` },
        { status: 400 },
      );
    }
    const suggs: CodeSuggestion[] = [];
    for (const raw of rawBatch) {
      const s = coerceSuggestion(raw);
      if (s && s.documentId === documentId) suggs.push(s);
    }
    await replaceDocumentSuggestions(documentId, suggs);
    return NextResponse.json({
      status: 'ok',
      count: suggs.length,
      persistent: isPersistent(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to save suggestions: ${message}` },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    let id = params.get('id') || '';
    let documentId = params.get('documentId') || '';
    if (!id && !documentId) {
      try {
        const body = (await request.json()) as {
          id?: unknown;
          documentId?: unknown;
        };
        if (typeof body.id === 'string') id = body.id;
        if (typeof body.documentId === 'string') documentId = body.documentId;
      } catch { /* no body */ }
    }
    if (id) {
      const ok = await deleteSuggestion(id);
      if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ status: 'deleted', id });
    }
    if (documentId) {
      await clearDocumentSuggestions(documentId);
      return NextResponse.json({ status: 'cleared', documentId });
    }
    return NextResponse.json(
      { error: 'id or documentId is required' },
      { status: 400 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to delete suggestion(s): ${message}` },
      { status: 500 },
    );
  }
}
