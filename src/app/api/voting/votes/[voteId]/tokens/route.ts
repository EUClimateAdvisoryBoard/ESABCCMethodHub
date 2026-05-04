/**
 * /api/voting/votes/[voteId]/tokens
 *   POST — generate N single-use tokens for the vote.
 *
 * The newly minted token strings are returned to the admin once on this
 * response and never re-served afterwards. Re-listing tokens via GET on
 * the parent endpoint shows used/unused state but not the raw secrets.
 *
 * (We still echo tokens back through GET on the bundle endpoint because
 * the admin needs to be able to copy/share links to participants. In a
 * stricter deployment that would change to a "show once" flow.)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireMethodHubUser } from '@/lib/voting/auth';
import { generateTokens } from '@/lib/voting/store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: { voteId: string } }) {
  if (!(await requireMethodHubUser(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: { count?: number; labels?: string[] };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const count = Math.max(1, Math.min(500, Number(body.count ?? 1)));
  const labels = Array.isArray(body.labels) ? body.labels : [];

  try {
    const tokens = await generateTokens(ctx.params.voteId, count, labels);
    return NextResponse.json({ tokens });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}
