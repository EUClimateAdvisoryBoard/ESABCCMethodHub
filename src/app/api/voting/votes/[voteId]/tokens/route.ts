/**
 * /api/voting/votes/[voteId]/tokens
 *   POST — generate N tokens for the vote.
 *
 * Request body:
 *   {
 *     count?: number;            // how many tokens to mint (1..500). Default 1.
 *     labels?: string[];          // optional admin-only labels per token.
 *     maxUses?: number | null;    // 1 = single-use (default), null = unlimited
 *                                 // (a "universal" link), N>1 = limited multi-use.
 *   }
 *
 * The newly minted token strings are returned to the admin once on this
 * response. They are also echoed by GET on the parent endpoint so the
 * admin can keep copying links until the vote is closed.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireMethodHubUser } from '@/lib/voting/auth';
import { generateTokens } from '@/lib/voting/store';

export const dynamic = 'force-dynamic';

function parseMaxUses(raw: unknown): number | null {
  if (raw === null) return null;
  if (raw === undefined) return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export async function POST(req: NextRequest, ctx: { params: { voteId: string } }) {
  if (!(await requireMethodHubUser(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: { count?: number; labels?: string[]; maxUses?: number | null };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const count = Math.max(1, Math.min(500, Number(body.count ?? 1)));
  const labels = Array.isArray(body.labels) ? body.labels : [];
  const maxUses = parseMaxUses(body.maxUses);

  try {
    const tokens = await generateTokens(ctx.params.voteId, count, labels, maxUses);
    return NextResponse.json({ tokens });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}
