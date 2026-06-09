import { NextRequest, NextResponse } from 'next/server';
import {
  addToCaCorpus,
  getCaCorpus,
  isPersistent,
  removeFromCaCorpus,
} from '@/lib/content-analysis-store';

/**
 * Shared per-workspace document corpus API.
 *
 * Persists which documents an analyst has added to a project workspace (the
 * "In this workspace" list) so every collaborator on the project sees the same
 * set — previously this lived only in the adding browser's localStorage, so
 * workspaces appeared "not synced" between users.
 *
 *   GET    /api/content-analysis/corpus?projectId=<id>
 *            → { documentIds: string[], persistent }
 *   POST   /api/content-analysis/corpus
 *            body: { projectId, documentId }   → add one
 *   DELETE /api/content-analysis/corpus?projectId=<id>&documentId=<id>
 *            → remove one
 */

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
  const documentIds = await getCaCorpus(projectId);
  return NextResponse.json({ documentIds, persistent: isPersistent() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const projectId = body?.projectId;
    const documentId = body?.documentId;
    if (!validId(projectId) || !validId(documentId)) {
      return NextResponse.json({ error: 'projectId and documentId required' }, { status: 400 });
    }
    await addToCaCorpus(projectId, documentId);
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
