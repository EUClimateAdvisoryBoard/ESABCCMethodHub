/**
 * /api/voting/votes/[voteId]/reset
 *   POST — drop every ballot, reset every token to unused, and bump the
 *          vote's reset_epoch so participant browsers' localStorage flags
 *          are silently invalidated.
 *
 * Method Hub users only. Destructive — there is no undo.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireMethodHubUser } from '@/lib/voting/auth';
import { resetVote } from '@/lib/voting/store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: { voteId: string } }) {
  if (!(await requireMethodHubUser(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const vote = await resetVote(ctx.params.voteId);
    return NextResponse.json({ vote });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}
