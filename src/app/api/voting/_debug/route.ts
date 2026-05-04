/**
 * /api/voting/_debug — diagnostic for the voting tool's storage layer.
 *
 * MethodHub users only (uses the same site-auth gate as the admin endpoints).
 * Returns ONLY non-secret signals: which backend the dispatcher chose,
 * whether each env var the dispatcher inspects is currently set, and live
 * row counts from whichever backend is active. We never echo the
 * service-role key, the Supabase URL, the raw SQL, or any token strings.
 *
 * Use it when "I voted but results show 0" — hit this endpoint and the
 * mismatch (e.g. backend=filesystem, ballotsTotal=0 even though you just
 * voted) will say exactly what's happening.
 */
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { requireMethodHubUser } from '@/lib/voting/auth';
import { detectVotingBackend } from '@/lib/voting/backend';
import { createAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' } as const;

async function fsCounts() {
  const dir = path.join(process.cwd(), 'data', 'votes');
  try {
    const entries = await fs.readdir(dir);
    const files = entries.filter((n) => n.endsWith('.json'));
    let tokens = 0;
    let ballots = 0;
    for (const name of files) {
      try {
        const raw = await fs.readFile(path.join(dir, name), 'utf-8');
        const b = JSON.parse(raw) as { tokens?: unknown[]; ballots?: unknown[] };
        tokens += Array.isArray(b.tokens) ? b.tokens.length : 0;
        ballots += Array.isArray(b.ballots) ? b.ballots.length : 0;
      } catch { /* ignore */ }
    }
    return { ok: true, votesTotal: files.length, tokensTotal: tokens, ballotsTotal: ballots };
  } catch (err: unknown) {
    return { ok: false, error: (err as Error).message };
  }
}

async function supabaseCounts() {
  try {
    const sb = createAdminClient();
    const [v, t, b] = await Promise.all([
      sb.from('votes').select('id', { count: 'exact', head: true }),
      sb.from('vote_tokens').select('token', { count: 'exact', head: true }),
      sb.from('ballots').select('id', { count: 'exact', head: true }),
    ]);
    if (v.error || t.error || b.error) {
      return {
        ok: false,
        error: v.error?.message || t.error?.message || b.error?.message,
        hint:
          'If the error mentions a missing column or relation, the migrations 029/030/031 ' +
          'have not been applied to this Supabase project yet.',
      };
    }
    return {
      ok: true,
      votesTotal: v.count ?? 0,
      tokensTotal: t.count ?? 0,
      ballotsTotal: b.count ?? 0,
    };
  } catch (err: unknown) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function GET(req: NextRequest) {
  if (!(await requireMethodHubUser(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore });
  }

  const backend = detectVotingBackend();
  const env = {
    NEXT_PUBLIC_SUPABASE_URL_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  const counts = backend === 'supabase' ? await supabaseCounts() : await fsCounts();

  return NextResponse.json(
    { backend, env, counts, runtime: process.env.NEXT_RUNTIME ?? 'nodejs' },
    { headers: noStore },
  );
}
