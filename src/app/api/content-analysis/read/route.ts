/**
 * Reading progress — list + mark read + clear.
 * ----------------------------------------------------------------------
 * Backs the Content Analysis "Reading responsibility" view: a per-(project,
 * document) read/unread flag, stored in the shared `content_analysis_read`
 * table (migration 075) so every collaborator sees the same read state. It is
 * independent of who is responsible (see ./reading) and of whether a summary
 * exists (the "Done" marker stays derived from summaries). Reads are public;
 * writes require a signed-in account and go through the service role.
 *
 *   GET    /api/content-analysis/read?projectId=<id>
 *            → { read: documentId[] }
 *   POST   /api/content-analysis/read
 *            body: { projectId, documentId, read }   → mark read (false = clear)
 *   DELETE /api/content-analysis/read?projectId=<id>&documentId=<id>
 *            → clear the read flag
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCaRead, setCaRead, isPersistent } from '@/lib/content-analysis-store';
import { actorRequired, resolveActor } from '@/lib/content-analysis/actor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ID_MAX = 256;

function validId(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= ID_MAX;
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  if (!validId(projectId)) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }
  const read = await getCaRead(projectId);
  return NextResponse.json({ read, persistent: isPersistent() });
}

export async function POST(request: NextRequest) {
  try {
    const actor = await resolveActor(request);
    if (!actor && actorRequired()) {
      return NextResponse.json({ error: 'Sign in to mark documents read' }, { status: 401 });
    }
    const body = await request.json();
    const projectId = body?.projectId;
    const documentId = body?.documentId;
    if (!validId(projectId) || !validId(documentId)) {
      return NextResponse.json({ error: 'projectId and documentId required' }, { status: 400 });
    }
    const read = body?.read !== false;
    await setCaRead(projectId, documentId, read, actor ?? undefined);
    return NextResponse.json({ status: 'ok', persistent: isPersistent() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    // 503 so the client's durable outbox keeps retrying until the change lands
    // and reaches the team, rather than parking it as a permanent 4xx.
    return NextResponse.json({ error: `Failed to mark read: ${message}` }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const actor = await resolveActor(request);
  if (!actor && actorRequired()) {
    return NextResponse.json({ error: 'Sign in to clear read state' }, { status: 401 });
  }
  const projectId = request.nextUrl.searchParams.get('projectId');
  const documentId = request.nextUrl.searchParams.get('documentId');
  if (!validId(projectId) || !validId(documentId)) {
    return NextResponse.json({ error: 'projectId and documentId required' }, { status: 400 });
  }
  try {
    await setCaRead(projectId, documentId, false, actor ?? undefined);
    return NextResponse.json({ status: 'ok', persistent: isPersistent() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to clear read state: ${message}` }, { status: 503 });
  }
}
