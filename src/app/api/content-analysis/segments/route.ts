import { NextRequest, NextResponse } from 'next/server';
import {
  deleteSegment,
  getSegments,
  isPersistent,
  updateSegmentNote,
  upsertSegments,
} from '@/lib/content-analysis-store';
import type { CodedSegment } from '@/lib/content-analysis/types';

/**
 * Coded-segments API
 *
 * Durable backend for accepted code segments in the content-analysis
 * workbench. Replaces the browser-only localStorage store so segments
 * survive refreshes, cold starts and device changes — and are visible to
 * the whole Secretariat, not just the author's browser.
 *
 *   GET    /api/content-analysis/segments  → list all segments
 *   POST   /api/content-analysis/segments  → upsert one or many segments
 *                                            body: { segments: CodedSegment[] }
 *                                                 | CodedSegment
 *   PATCH  /api/content-analysis/segments  → { id, note }
 *   DELETE /api/content-analysis/segments  → ?id=<id>  or body { id }
 */

const MAX_TEXT_LEN = 20000;
const MAX_NOTE_LEN = 4000;
const MAX_NAME_LEN = 200;
const MAX_BATCH = 500;

function clampString(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.slice(0, max);
}

function coerceSegment(raw: unknown): CodedSegment | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return null;
  if (typeof r.documentId !== 'string' || !r.documentId) return null;
  if (typeof r.codeId !== 'string' || !r.codeId) return null;
  if (typeof r.startChar !== 'number' || typeof r.endChar !== 'number') return null;
  return {
    id: r.id,
    documentId: r.documentId,
    codeId: r.codeId,
    blockId: typeof r.blockId === 'string' ? r.blockId : undefined,
    startChar: r.startChar,
    endChar: r.endChar,
    text: clampString(r.text, MAX_TEXT_LEN),
    note: clampString(r.note, MAX_NOTE_LEN),
    noteAuthor:
      typeof r.noteAuthor === 'string' ? clampString(r.noteAuthor, MAX_NAME_LEN) : undefined,
    noteAuthorId: typeof r.noteAuthorId === 'string' ? r.noteAuthorId : undefined,
    noteUpdatedAt: typeof r.noteUpdatedAt === 'string' ? r.noteUpdatedAt : undefined,
    projectId: typeof r.projectId === 'string' ? r.projectId : null,
    createdAt:
      typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
  };
}

export async function GET() {
  const items = await getSegments();
  return NextResponse.json({
    items,
    total: items.length,
    persistent: isPersistent(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawBatch: unknown[] = Array.isArray(body?.segments)
      ? body.segments
      : Array.isArray(body)
        ? body
        : [body];
    if (rawBatch.length > MAX_BATCH) {
      return NextResponse.json(
        { error: `Batch too large (max ${MAX_BATCH})` },
        { status: 400 },
      );
    }
    const segs: CodedSegment[] = [];
    for (const raw of rawBatch) {
      const s = coerceSegment(raw);
      if (s) segs.push(s);
    }
    if (segs.length === 0) {
      return NextResponse.json({ error: 'No valid segments' }, { status: 400 });
    }
    await upsertSegments(segs);
    return NextResponse.json({
      status: 'ok',
      count: segs.length,
      persistent: isPersistent(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to save segments: ${message}` },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    if (typeof body.note !== 'string') {
      return NextResponse.json({ error: 'note is required' }, { status: 400 });
    }
    const author = {
      name:
        typeof body.noteAuthor === 'string'
          ? clampString(body.noteAuthor, MAX_NAME_LEN)
          : undefined,
      id: typeof body.noteAuthorId === 'string' ? body.noteAuthorId : undefined,
    };
    const ok = await updateSegmentNote(id, clampString(body.note, MAX_NOTE_LEN), author);
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ status: 'updated', id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to update segment: ${message}` },
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
    const ok = await deleteSegment(id);
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ status: 'deleted', id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to delete segment: ${message}` },
      { status: 500 },
    );
  }
}
