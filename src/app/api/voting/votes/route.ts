/**
 * /api/voting/votes
 *   GET  — list all votes (MethodHub users only)
 *   POST — create a new vote (MethodHub users only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireMethodHubUser } from '@/lib/voting/auth';
import {
  createVote,
  ensureUniqueOptionIds,
  listVotes,
  newId,
  slugify,
} from '@/lib/voting/store';
import type { VoteRecord } from '@/lib/voting/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await requireMethodHubUser(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const votes = await listVotes();
  return NextResponse.json({ votes });
}

export async function POST(req: NextRequest) {
  if (!(await requireMethodHubUser(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Partial<VoteRecord> & { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.title || typeof body.title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  if (!body.votingSystem) {
    return NextResponse.json({ error: 'votingSystem is required' }, { status: 400 });
  }
  if (!Array.isArray(body.options) || body.options.length === 0) {
    return NextResponse.json({ error: 'options must be a non-empty array' }, { status: 400 });
  }

  const id = (body.id && /^[a-z0-9-]+$/i.test(body.id) ? body.id : null) || newId(slugify(body.title));
  const now = new Date().toISOString();

  const record: VoteRecord = {
    id,
    title: body.title,
    description: body.description,
    instructions: body.instructions,
    votingSystem: body.votingSystem,
    config: body.config ?? {},
    options: ensureUniqueOptionIds(body.options),
    isAnonymous: body.isAnonymous !== false,
    status: body.status ?? 'open',
    createdAt: now,
    closesAt: body.closesAt,
    createdBy: body.createdBy,
  };

  try {
    await createVote(record);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 409 });
  }
  return NextResponse.json({ vote: record }, { status: 201 });
}
