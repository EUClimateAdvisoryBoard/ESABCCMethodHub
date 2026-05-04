/**
 * /api/voting/ballot/[token]
 *   GET  — return a public-safe view of the vote (title + options + config).
 *   POST — submit a ballot (single-use; the token is consumed on success).
 *
 * This is the ONLY voting endpoint reachable from the public internet
 * without a MethodHub session. The token is the credential, so we do not
 * (and must not) consult the site-auth cookie here. The endpoint also
 * deliberately exposes nothing about other votes, ballots, or
 * participants — externals see only the ballot that belongs to their link.
 */
import { NextRequest, NextResponse } from 'next/server';
import { findTokenContext, recordBallot } from '@/lib/voting/store';
import { validateBallotResponses } from '@/lib/voting/validation';
import type { PublicVoteView } from '@/lib/voting/types';

export const dynamic = 'force-dynamic';

const noStore = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  // Tell every search engine and AI crawler this URL is private.
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
} as const;

function publicView(
  bundle: NonNullable<Awaited<ReturnType<typeof findTokenContext>>>,
): PublicVoteView {
  const { vote } = bundle.bundle;
  const t = bundle.tokenRecord;
  const exhausted = t.maxUses != null && t.useCount >= t.maxUses;
  return {
    id: vote.id,
    title: vote.title,
    description: vote.description,
    instructions: vote.instructions,
    votingSystem: vote.votingSystem,
    config: vote.config,
    options: vote.options,
    status: vote.status,
    closesAt: vote.closesAt,
    alreadySubmitted: exhausted,
    isShared: t.maxUses !== 1,
    resetEpoch: vote.resetEpoch ?? 0,
  };
}

export async function GET(_req: NextRequest, ctx: { params: { token: string } }) {
  const ctxBundle = await findTokenContext(ctx.params.token);
  if (!ctxBundle) {
    return NextResponse.json(
      { error: 'This link is not valid.' },
      { status: 404, headers: noStore },
    );
  }
  return NextResponse.json(publicView(ctxBundle), { headers: noStore });
}

export async function POST(req: NextRequest, ctx: { params: { token: string } }) {
  let payload: { responses?: Record<string, unknown> };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: noStore });
  }
  if (!payload.responses || typeof payload.responses !== 'object') {
    return NextResponse.json(
      { error: 'responses object is required' },
      { status: 400, headers: noStore },
    );
  }

  const ctxBundle = await findTokenContext(ctx.params.token);
  if (!ctxBundle) {
    return NextResponse.json(
      { error: 'This link is not valid.' },
      { status: 404, headers: noStore },
    );
  }
  const t = ctxBundle.tokenRecord;
  if (t.maxUses != null && t.useCount >= t.maxUses) {
    return NextResponse.json(
      { error: 'This link has reached its submission limit.' },
      { status: 409, headers: noStore },
    );
  }

  const validation = validateBallotResponses(ctxBundle.bundle.vote, payload.responses);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400, headers: noStore });
  }

  try {
    await recordBallot(ctxBundle.bundle.vote.id, ctx.params.token, validation.cleaned);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400, headers: noStore },
    );
  }

  // Ack only — never echo the responses back.
  return NextResponse.json({ ok: true }, { headers: noStore });
}
