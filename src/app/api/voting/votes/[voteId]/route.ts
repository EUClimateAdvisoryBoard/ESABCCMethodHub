/**
 * /api/voting/votes/[voteId]
 *   GET    — vote bundle (config + tokens + ballots) for the admin view
 *   PATCH  — update vote settings (status, closesAt, instructions, etc.)
 *   DELETE — delete vote and all its ballots
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireMethodHubUser } from '@/lib/voting/auth';
import { deleteVote, getVote, updateVote } from '@/lib/voting/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: { voteId: string } }) {
  if (!(await requireMethodHubUser(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const bundle = await getVote(ctx.params.voteId);
  if (!bundle) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(bundle);
}

export async function PATCH(req: NextRequest, ctx: { params: { voteId: string } }) {
  if (!(await requireMethodHubUser(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let patch: Record<string, unknown>;
  try {
    patch = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Whitelist mutable fields. id and createdAt are immutable.
  const allowed = [
    'title', 'description', 'instructions', 'votingSystem', 'config',
    'options', 'isAnonymous', 'status', 'closesAt',
  ] as const;
  const safe: Record<string, unknown> = {};
  for (const k of allowed) if (k in patch) safe[k] = patch[k];

  try {
    const updated = await updateVote(ctx.params.voteId, safe);
    return NextResponse.json({ vote: updated });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: { voteId: string } }) {
  if (!(await requireMethodHubUser(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await deleteVote(ctx.params.voteId);
  return NextResponse.json({ ok: true });
}
