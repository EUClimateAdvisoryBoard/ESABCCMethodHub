/**
 * Project-scoped policy code overlay — list + write API.
 * ------------------------------------------------------
 * Backs the workspace "Policy codes" panel. The first write for a given
 * (project, policy) pair lazily forks the master tags (from
 * POLICY_MASTER_TAGS) into rows, so further reads always come from the DB.
 *
 * POST body shapes:
 *   { projectId, policyId, action: 'fork' }
 *     → ensure every master tag for the policy has a row (idempotent).
 *
 *   { projectId, policyId, action: 'toggle-master', codeId, removed }
 *     → forks if needed, then sets `removed` on the master row.
 *
 *   { projectId, policyId, action: 'add-custom', label, color?, parentCodeId? }
 *     → forks if needed, then inserts a new custom code row.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { listPolicyCodes } from '@/lib/project-workspace/db';
import { POLICY_MASTER_TAGS } from '@/lib/content-analysis/policy-master-tags';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

interface ForkContext {
  sb: ReturnType<typeof createServerClient>;
  projectId: string;
  policyId: string;
  userId: string;
}

/** Insert one row per master tag for (project, policy) — idempotent via
 *  the (project_id, policy_id, code_id) unique constraint. */
async function ensureForked({ sb, projectId, policyId, userId }: ForkContext) {
  const masterTags = POLICY_MASTER_TAGS[policyId] ?? [];
  if (masterTags.length === 0) return;
  const rows = masterTags.map(codeId => ({
    project_id: projectId,
    policy_id: policyId,
    code_id: codeId,
    source: 'master' as const,
    label: '',
    color: '#94A3B8',
    removed: false,
    created_by: userId,
  }));
  // ON CONFLICT DO NOTHING so a second fork call is a no-op.
  await sb.from('pw_policy_codes').upsert(rows, {
    onConflict: 'project_id,policy_id,code_id',
    ignoreDuplicates: true,
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  const policyId = url.searchParams.get('policyId') ?? undefined;
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }
  return NextResponse.json({ codes: await listPolicyCodes(projectId, policyId) });
}

export async function POST(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    projectId?: string;
    policyId?: string;
    action?: 'fork' | 'toggle-master' | 'add-custom';
    codeId?: string;
    removed?: boolean;
    label?: string;
    color?: string;
    parentCodeId?: string | null;
  };
  if (!body.projectId || !body.policyId || !body.action) {
    return NextResponse.json(
      { error: 'projectId, policyId, action required' },
      { status: 400 }
    );
  }

  const ctx: ForkContext = {
    sb,
    projectId: body.projectId,
    policyId: body.policyId,
    userId: u.user.id,
  };

  if (body.action === 'fork') {
    await ensureForked(ctx);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'toggle-master') {
    if (!body.codeId) {
      return NextResponse.json({ error: 'codeId required' }, { status: 400 });
    }
    await ensureForked(ctx);
    const { data, error } = await sb
      .from('pw_policy_codes')
      .update({ removed: !!body.removed })
      .eq('project_id', body.projectId)
      .eq('policy_id', body.policyId)
      .eq('code_id', body.codeId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ code: data });
  }

  if (body.action === 'add-custom') {
    const label = (body.label ?? '').trim();
    if (!label) {
      return NextResponse.json({ error: 'label required' }, { status: 400 });
    }
    await ensureForked(ctx);
    const codeId = `proj-${crypto.randomUUID()}`;
    const { data, error } = await sb
      .from('pw_policy_codes')
      .insert({
        project_id: body.projectId,
        policy_id: body.policyId,
        code_id: codeId,
        source: 'custom',
        parent_code_id: body.parentCodeId ?? null,
        label,
        color: body.color || '#94A3B8',
        removed: false,
        created_by: u.user.id,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ code: data });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
