/**
 * /api/voting/_debug
 *
 * Read-only diagnostic endpoint for the voting tool. Reports:
 *   - which backend the store dispatcher picked (`supabase` | `filesystem`)
 *   - whether the two env vars that gate Supabase are set (booleans only —
 *     never the values themselves)
 *   - row counts (votes / tokens / ballots) so the operator can tell at a
 *     glance whether ballots are actually persisting
 *
 * Auth: same gate as the rest of the admin endpoints (MethodHub site-auth
 * cookie). Public callers get 401 so we don't leak deployment info.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireMethodHubUser } from '@/lib/voting/auth';
import { detectVotingBackend } from '@/lib/voting/backend';
import { listVotes, getVote } from '@/lib/voting/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireMethodHubUser(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const backend = detectVotingBackend();

  let votesTotal = 0;
  let tokensTotal = 0;
  let ballotsTotal = 0;
  let countsError: string | undefined;
  try {
    const votes = await listVotes();
    votesTotal = votes.length;
    for (const v of votes) {
      const bundle = await getVote(v.id);
      tokensTotal += bundle?.tokens.length ?? 0;
      ballotsTotal += bundle?.ballots.length ?? 0;
    }
  } catch (err) {
    countsError = (err as Error).message;
  }

  return NextResponse.json({
    backend,
    env: {
      NEXT_PUBLIC_SUPABASE_URL_set: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY_set: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    counts: { votesTotal, tokensTotal, ballotsTotal },
    ...(countsError ? { countsError } : {}),
  });
}
