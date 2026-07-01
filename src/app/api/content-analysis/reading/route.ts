/**
 * Reading responsibility — list + assign + clear the responsible reader.
 * ----------------------------------------------------------------------
 * Backs the Content Analysis "Reading responsibility" view: one reader per
 * (project, document), stored in the shared `content_analysis_reading` table
 * (migration 074) so every collaborator on a project sees the same answer to
 * "who is reading what". Reads are public; writes require a signed-in account
 * and go through the service role in the store.
 *
 *   GET    /api/content-analysis/reading?projectId=<id>
 *            → { assignments: { documentId, reader }[] }
 *   POST   /api/content-analysis/reading
 *            body: { projectId, documentId, reader }   → assign (empty = clear)
 *   DELETE /api/content-analysis/reading?projectId=<id>&documentId=<id>
 *            → clear the reader
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCaReading, setCaReading, isPersistent } from '@/lib/content-analysis-store';
import { actorRequired, resolveActor } from '@/lib/content-analysis/actor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ID_MAX = 256;
const READER_MAX = 200;

function validId(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= ID_MAX;
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  if (!validId(projectId)) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }
  const assignments = await getCaReading(projectId);
  return NextResponse.json({ assignments, persistent: isPersistent() });
}

export async function POST(request: NextRequest) {
  try {
    const actor = await resolveActor(request);
    if (!actor && actorRequired()) {
      return NextResponse.json({ error: 'Sign in to assign readers' }, { status: 401 });
    }
    const body = await request.json();
    const projectId = body?.projectId;
    const documentId = body?.documentId;
    if (!validId(projectId) || !validId(documentId)) {
      return NextResponse.json({ error: 'projectId and documentId required' }, { status: 400 });
    }
    const reader =
      typeof body?.reader === 'string' ? body.reader.trim().slice(0, READER_MAX) : '';
    await setCaReading(projectId, documentId, reader, actor ?? undefined);
    return NextResponse.json({ status: 'ok', persistent: isPersistent() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    // 503 so the client's durable outbox keeps retrying until the assignment
    // lands and reaches the team, rather than parking it as a permanent 4xx.
    return NextResponse.json({ error: `Failed to assign reader: ${message}` }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const actor = await resolveActor(request);
  if (!actor && actorRequired()) {
    return NextResponse.json({ error: 'Sign in to clear readers' }, { status: 401 });
  }
  const projectId = request.nextUrl.searchParams.get('projectId');
  const documentId = request.nextUrl.searchParams.get('documentId');
  if (!validId(projectId) || !validId(documentId)) {
    return NextResponse.json({ error: 'projectId and documentId required' }, { status: 400 });
  }
  try {
    await setCaReading(projectId, documentId, '', actor ?? undefined);
    return NextResponse.json({ status: 'ok', persistent: isPersistent() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to clear reader: ${message}` }, { status: 503 });
  }
}
