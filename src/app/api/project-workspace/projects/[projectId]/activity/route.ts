/**
 * Project Workspace activity log — read endpoint.
 *
 *   GET ?before=<id>&limit=<n>  → one page of the project's change log,
 *                                 newest first (default 50, max 200).
 *   GET ?status=1               → additionally include the installation
 *                                 health (are the triggers in place?) so the
 *                                 UI can explain an empty log.
 *
 * Entries are written by database triggers (migrations 067/068), never
 * through this API — the log is read-only from the app's point of view.
 * Same public read posture as the other workspace GET endpoints.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getActivityLogStatus, listActivity } from '@/lib/project-workspace/activity-log';

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
  if (url.searchParams.get('status') !== '1') {
    return NextResponse.json({ entries });
  }
  return NextResponse.json({ entries, status: await getActivityLogStatus() });
}
