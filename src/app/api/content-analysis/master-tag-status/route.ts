/**
 * Master-level AI/human status for policy tags — list + confirm + revert.
 * -----------------------------------------------------------------------
 * The per-policy master tags in policy-master-tags.ts are an AI-generated
 * baseline (every tag is an "AI tag"). This endpoint records when a human
 * reviewer confirms a tag, promoting it to a "human tag". State lives in the
 * global `content_analysis_master_tag_status` table (see migration 050) and
 * is shared across the Policy Navigator and every project workspace.
 *
 *   GET  ?policyId=<id>            → confirmations for one policy
 *   GET  (no params)               → all confirmations (workspace overlay)
 *     → { statuses: [{ policyId, codeId, origin, confirmedByName, confirmedAt }] }
 *
 *   POST { policyId, codeId }      → confirm a tag (upsert origin='human')
 *   DELETE ?policyId=&codeId=      → revert a confirmation (back to AI baseline)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TABLE = 'content_analysis_master_tag_status';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

interface StatusRow {
  policy_id: string;
  code_id: string;
  origin: string;
  confirmed_by_name: string | null;
  confirmed_at: string;
}

function shape(rows: StatusRow[]) {
  return rows.map(r => ({
    policyId: r.policy_id,
    codeId: r.code_id,
    origin: r.origin,
    confirmedByName: r.confirmed_by_name,
    confirmedAt: r.confirmed_at,
  }));
}

export async function GET(req: NextRequest) {
  const policyId = new URL(req.url).searchParams.get('policyId');
  let sb;
  try {
    sb = createServerClient();
  } catch {
    // Supabase not configured (e.g. local dev without env) — no confirmations.
    return NextResponse.json({ statuses: [] });
  }
  let q = sb.from(TABLE).select('policy_id, code_id, origin, confirmed_by_name, confirmed_at');
  if (policyId) q = q.eq('policy_id', policyId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ statuses: [] });
  return NextResponse.json({ statuses: shape((data ?? []) as StatusRow[]) });
}

export async function POST(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    policyId?: string;
    codeId?: string;
  };
  if (!body.policyId || !body.codeId) {
    return NextResponse.json({ error: 'policyId, codeId required' }, { status: 400 });
  }

  // Best-effort display name so the navigator can show "Confirmed by X".
  let name: string | null = null;
  const { data: profile } = await sb
    .from('profiles')
    .select('display_name')
    .eq('id', u.user.id)
    .single();
  name = (profile?.display_name as string | null) ?? null;

  const { data, error } = await sb
    .from(TABLE)
    .upsert(
      {
        policy_id: body.policyId,
        code_id: body.codeId,
        origin: 'human',
        confirmed_by: u.user.id,
        confirmed_by_name: name,
        confirmed_at: new Date().toISOString(),
      },
      { onConflict: 'policy_id,code_id' }
    )
    .select('policy_id, code_id, origin, confirmed_by_name, confirmed_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ status: shape([data as StatusRow])[0] });
}

export async function DELETE(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const url = new URL(req.url);
  const policyId = url.searchParams.get('policyId');
  const codeId = url.searchParams.get('codeId');
  if (!policyId || !codeId) {
    return NextResponse.json({ error: 'policyId, codeId required' }, { status: 400 });
  }
  const { error } = await sb
    .from(TABLE)
    .delete()
    .eq('policy_id', policyId)
    .eq('code_id', codeId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
