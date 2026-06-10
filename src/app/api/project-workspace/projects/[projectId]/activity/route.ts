/**
 * Project Workspace activity log — read endpoint.
 *
 *   GET ?before=<id>&limit=<n>  → one page of the project's change log,
 *                                 newest first (default 50, max 200).
 *
 * Entries are written by database triggers (migration 067), never through
 * this API — the log is read-only from the app's point of view. Same public
 * read posture as the other workspace GET endpoints.
 */
import { NextRequest, NextResponse } from 'next/server';
import { listActivity } from '@/lib/project-workspace/activity-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const url = new URL(req.url);
  const before = Number(url.searchParams.get('before')) || undefined;
  const limit = Number(url.searchParams.get('limit')) || undefined;
  const entries = await listActivity(params.projectId, { before, limit });
  return NextResponse.json({ entries });
}
