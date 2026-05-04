/**
 * /api/voting/votes/[voteId]/results — analysed results, MethodHub users only.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireMethodHubUser } from '@/lib/voting/auth';
import { getVote } from '@/lib/voting/store';
import { analyse } from '@/lib/voting/analysis';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: { voteId: string } }) {
  if (!(await requireMethodHubUser(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const bundle = await getVote(ctx.params.voteId);
  if (!bundle) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const issued = bundle.tokens.length;
  const used = bundle.tokens.filter((t) => t.usedAt).length;

  return NextResponse.json({
    vote: bundle.vote,
    counts: {
      tokensIssued: issued,
      ballotsSubmitted: bundle.ballots.length,
      participation: issued > 0 ? used / issued : 0,
    },
    analysis: analyse(bundle.vote, bundle.ballots),
  });
}
