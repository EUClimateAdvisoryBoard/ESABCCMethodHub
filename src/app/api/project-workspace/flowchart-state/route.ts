import { NextRequest, NextResponse } from 'next/server';
import {
  deleteFlowchartState,
  getFlowchartState,
  setFlowchartState,
} from '@/lib/project-workspace/flowchart-state-store';

/**
 * Shared Project Workspace flow-chart state API.
 *
 * Persists the flow-chart version registry, each version's editable board and
 * custom-version reset seeds so every collaborator on a project sees the same
 * boards — previously these lived only in the editing browser's localStorage.
 *
 *   GET    /api/project-workspace/flowchart-state?projectId=<id>
 *            → { items: [{ storageKey, data }] }
 *   PUT    /api/project-workspace/flowchart-state
 *            body: { projectId, storageKey, data }   → upsert one entry
 *   DELETE /api/project-workspace/flowchart-state?projectId=<id>&storageKey=<key>
 *            → delete one entry
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ID_MAX = 256;
const KEY_MAX = 512;

function valid(v: unknown, max: number): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= max;
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  if (!valid(projectId, ID_MAX)) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }
  const items = await getFlowchartState(projectId);
  return NextResponse.json({ items });
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, storageKey, data } = body ?? {};
    if (!valid(projectId, ID_MAX) || !valid(storageKey, KEY_MAX)) {
      return NextResponse.json({ error: 'projectId and storageKey required' }, { status: 400 });
    }
    if (data === undefined) {
      return NextResponse.json({ error: 'data required' }, { status: 400 });
    }
    await setFlowchartState(projectId, storageKey, data);
    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to save flow-chart state: ${message}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  const storageKey = request.nextUrl.searchParams.get('storageKey');
  if (!valid(projectId, ID_MAX) || !valid(storageKey, KEY_MAX)) {
    return NextResponse.json({ error: 'projectId and storageKey required' }, { status: 400 });
  }
  try {
    await deleteFlowchartState(projectId, storageKey);
    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to delete flow-chart state: ${message}` }, { status: 500 });
  }
}
