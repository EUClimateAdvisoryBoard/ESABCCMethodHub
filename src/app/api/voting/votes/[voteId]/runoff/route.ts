/**
 * /api/voting/votes/[voteId]/runoff
 *   POST — spawn a "find clear winner" follow-up vote from the current
 *          shortlist, mint a universal link for it and return both.
 *
 * The follow-up:
 *   - inherits the parent's shortlisted options (in their ranked order),
 *   - has title `<parent title> 2.0` (incremented if a 2.0 already exists),
 *   - is a `single_choice` vote by default (override with body.votingSystem),
 *   - records `config.parentVoteId` so the parent's surfaces can pull it back,
 *   - is opened immediately and given one universal token (`maxUses = null`).
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireMethodHubUser } from '@/lib/voting/auth';
import {
  createVote,
  ensureUniqueOptionIds,
  generateTokens,
  getVote,
  listVotes,
  newId,
  slugify,
} from '@/lib/voting/store';
import { analyse } from '@/lib/voting/analysis';
import type { VoteRecord, VotingSystem } from '@/lib/voting/types';

export const dynamic = 'force-dynamic';

const ALLOWED_SYSTEMS: VotingSystem[] = [
  'single_choice',
  'approval',
  'ranked_voting',
  'average_ranking',
  'star',
];

function nextRunoffTitle(parentTitle: string, existing: string[]): string {
  // Pick the smallest integer N >= 2 such that "<title> N.0" isn't taken yet.
  // Default: "<title> 2.0".
  const taken = new Set(existing.map((t) => t.trim().toLowerCase()));
  for (let n = 2; n < 50; n++) {
    const candidate = `${parentTitle} ${n}.0`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${parentTitle} 2.0`;
}

export async function POST(req: NextRequest, ctx: { params: { voteId: string } }) {
  if (!(await requireMethodHubUser(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parent = await getVote(ctx.params.voteId);
  if (!parent) return NextResponse.json({ error: 'Parent vote not found' }, { status: 404 });

  if (parent.vote.votingSystem !== 'priority_ranking') {
    return NextResponse.json(
      { error: 'Runoffs are only supported for priority-ranking votes.' },
      { status: 400 },
    );
  }

  let body: { votingSystem?: VotingSystem; title?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const analysis = analyse(parent.vote, parent.ballots);
  if (analysis.kind !== 'priority_ranking' || analysis.shortlistEnd == null) {
    return NextResponse.json(
      { error: 'No shortlist available — cast some ballots first.' },
      { status: 400 },
    );
  }

  const shortlistedRows = analysis.rows.slice(0, analysis.shortlistEnd + 1);
  if (shortlistedRows.length < 2) {
    return NextResponse.json(
      { error: 'A runoff needs at least two shortlisted options.' },
      { status: 400 },
    );
  }

  // Carry option labels over verbatim so voters see the exact wording they
  // already ranked. Re-slugify the ids in the new vote's namespace.
  const options = ensureUniqueOptionIds(
    shortlistedRows.map((r) => ({ id: '', label: r.label })),
  );

  const votingSystem: VotingSystem =
    body.votingSystem && ALLOWED_SYSTEMS.includes(body.votingSystem)
      ? body.votingSystem
      : 'single_choice';

  const allVotes = await listVotes();
  const title = (body.title?.trim()) || nextRunoffTitle(parent.vote.title, allVotes.map((v) => v.title));
  const id = newId(slugify(title));
  const now = new Date().toISOString();

  const record: VoteRecord = {
    id,
    title,
    description: `Follow-up vote from "${parent.vote.title}" — pick the clear winner from the shortlisted options.`,
    instructions: parent.vote.instructions,
    votingSystem,
    config: {
      parentVoteId: parent.vote.id,
      ...(votingSystem === 'single_choice' ? { maxSelections: 1 } : {}),
    },
    options,
    isAnonymous: parent.vote.isAnonymous,
    status: 'open',
    createdAt: now,
    resetEpoch: 0,
  };

  try {
    await createVote(record);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 409 });
  }

  // One universal link, ready to share.
  const tokens = await generateTokens(record.id, 1, ['Universal link'], null);

  return NextResponse.json({ vote: record, token: tokens[0] }, { status: 201 });
}
