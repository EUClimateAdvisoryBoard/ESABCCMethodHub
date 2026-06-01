import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { listPolicyAnnotations } from '@/lib/project-workspace/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId') ?? undefined;
  const policyId = url.searchParams.get('policyId') ?? undefined;
  return NextResponse.json({
    annotations: await listPolicyAnnotations(projectId, policyId),
  });
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
    kind?: 'approve' | 'disapprove' | 'fact-check' | 'edit' | 'comment';
    field?: string;
    value?: string;
  };
  if (!body.projectId || !body.policyId || !body.kind) {
    return NextResponse.json(
      { error: 'projectId, policyId, kind required' },
      { status: 400 }
    );
  }
  const { data, error } = await sb
    .from('pw_policy_annotations')
    .insert({
      project_id: body.projectId,
      policy_id: body.policyId,
      kind: body.kind,
      field: body.field ?? '',
      value: body.value ?? '',
      created_by: u.user.id,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ annotation: data });
}
