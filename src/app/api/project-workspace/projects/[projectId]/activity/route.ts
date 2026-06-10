/**
 * Project Workspace activity log — read endpoint.
 *
 *   GET ?before=<id>&limit=<n>  → one page of the project's change log,
 *                                 newest first (default 50, max 200).
 *   GET ?status=1               → additionally include the installation
 *                                 health (are the triggers in place?) so the
 *                                 UI can explain an empty log. When the log
 *                                 is empty and the caller is signed in, an
 *                                 end-to-end self-test (probe write, verified
 *                                 against the log, then cleaned up) runs too.
 *
 * Entries are written by database triggers (migrations 067/068), never
 * through this API — the log is read-only from the app's point of view.
 * Same public read posture as the other workspace GET endpoints.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  getActivityLogStatus,
  listActivity,
  runActivitySelftest,
} from '@/lib/project-workspace/activity-log';
import { resolveActor } from '@/lib/content-analysis/actor';

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
  const status = await getActivityLogStatus();
  // Probe writes only when there's something to explain (empty log), the
  // installation looks healthy, and a signed-in user asked — not for every
  // anonymous page view.
  if (entries.length === 0 && status.installed && (await resolveActor(req))) {
    status.selftest = await runActivitySelftest(params.projectId);
  }
  return NextResponse.json({ entries, status });
}
