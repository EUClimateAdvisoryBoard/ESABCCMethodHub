import { NextRequest, NextResponse } from 'next/server';
import {
  deleteSegment,
  getSegments,
  isPersistent,
  updateSegmentNote,
  upsertSegments,
} from '@/lib/content-analysis-store';
import { actorRequired, resolveActor } from '@/lib/content-analysis/actor';
import type { CodedSegment, PdfAnchor } from '@/lib/content-analysis/types';

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

const MAX_ANCHOR_RECTS = 200;
// A captured figure is a PNG data-URL. Generously cap it (~4 MB of base64) so a
// reasonable chart screenshot round-trips while a runaway payload can't bloat a
// row. Oversized or non-image values are dropped (the client copy in
// localStorage still renders).
const MAX_SCREENSHOT_LEN = 4_000_000;

function clampString(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.slice(0, max);
}

/** Accept a well-formed `{ page, rects: [[x,y,w,h], …] }` PDF anchor, dropping
 *  anything malformed so a bad client payload can't poison the row. */
function coercePdfAnchor(raw: unknown): PdfAnchor | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.page !== 'number' || !Number.isFinite(r.page) || !Array.isArray(r.rects)) {
    return undefined;
  }
  const rects: number[][] = [];
  for (const rect of r.rects.slice(0, MAX_ANCHOR_RECTS)) {
    if (
      Array.isArray(rect) &&
      rect.length === 4 &&
      rect.every(n => typeof n === 'number' && Number.isFinite(n))
    ) {
      rects.push(rect as number[]);
    }
  }
  if (rects.length === 0) return undefined;
  return { page: r.page, rects };
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
    pdfAnchor: coercePdfAnchor(r.pdfAnchor),
    screenshot:
      typeof r.screenshot === 'string' &&
      r.screenshot.startsWith('data:image/') &&
      r.screenshot.length <= MAX_SCREENSHOT_LEN
        ? r.screenshot
        : undefined,
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
  try {
    const items = await getSegments();
    return NextResponse.json({
      items,
      total: items.length,
      persistent: isPersistent(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to load segments: ${message}` },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Writes must be attributable to an account (reads stay public).
    const actor = await resolveActor(request);
    if (!actor && actorRequired()) {
      return NextResponse.json({ error: 'Sign in to save tags' }, { status: 401 });
    }
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
    await upsertSegments(segs, actor ?? undefined);
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
    const actor = await resolveActor(request);
    if (!actor && actorRequired()) {
      return NextResponse.json({ error: 'Sign in to edit notes' }, { status: 401 });
    }
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
      // The verified account id wins over whatever name the client claims.
      id: actor?.id ?? (typeof body.noteAuthorId === 'string' ? body.noteAuthorId : undefined),
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
    const actor = await resolveActor(request);
    if (!actor && actorRequired()) {
      return NextResponse.json({ error: 'Sign in to delete tags' }, { status: 401 });
    }
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
    const ok = await deleteSegment(id, actor ?? undefined);
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
