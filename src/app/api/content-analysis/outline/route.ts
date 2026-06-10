import { NextRequest, NextResponse } from 'next/server';
import { getCaOutline, isPersistent, setCaOutline } from '@/lib/content-analysis-store';
import { actorRequired, resolveActor } from '@/lib/content-analysis/actor';

/**
 * Shared per-workspace report outline API.
 *
 * Persists the report section skeleton each project maps its codes onto, so
 * every collaborator shares one outline — previously this lived only in the
 * editing browser's localStorage and was never synced.
 *
 *   GET /api/content-analysis/outline?projectId=<id>
 *         → { outline: <json>|null, persistent }
 *   PUT /api/content-analysis/outline
 *         body: { projectId, outline }   → upsert
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ID_MAX = 256;
const MAX_SECTIONS = 500;

function validId(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= ID_MAX;
}

/** Minimal structural validation — a `{ version, sections: [...] }` object. */
function validOutline(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return Array.isArray(o.sections) && o.sections.length <= MAX_SECTIONS;
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  if (!validId(projectId)) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }
  const outline = await getCaOutline(projectId);
  return NextResponse.json({ outline, persistent: isPersistent() });
}

export async function PUT(request: NextRequest) {
  try {
    // Writes must be attributable to an account (reads stay public).
    const actor = await resolveActor(request);
    if (!actor && actorRequired()) {
      return NextResponse.json({ error: 'Sign in to save the outline' }, { status: 401 });
    }
    const body = await request.json();
    const projectId = body?.projectId;
    const outline = body?.outline;
    if (!validId(projectId)) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }
    if (!validOutline(outline)) {
      return NextResponse.json({ error: 'invalid outline' }, { status: 400 });
    }
    await setCaOutline(projectId, outline, actor ?? undefined);
    return NextResponse.json({ status: 'ok', persistent: isPersistent() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to save outline: ${message}` }, { status: 500 });
  }
}
