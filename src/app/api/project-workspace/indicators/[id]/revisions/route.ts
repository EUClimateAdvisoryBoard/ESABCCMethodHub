/**
 * GET /api/project-workspace/indicators/[id]/revisions
 *
 * The version history / audit log for one indicator (newest first): who
 * changed it, when, what action, a summary, and the archived snapshot used to
 * restore. Read-only — revisions are written by the data-change endpoints.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import {
  listIndicatorRevisions,
  REVISION_ACTION_LABELS,
} from '@/lib/project-workspace/indicator-revisions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const revisions = await listIndicatorRevisions(sb, params.id);
  return NextResponse.json({ revisions, actionLabels: REVISION_ACTION_LABELS });
}
