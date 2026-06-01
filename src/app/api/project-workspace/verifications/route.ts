/**
 * Project Workspace verifications.
 *
 *   GET  ?projectId=&kind=&id=  → list verification rows (optionally one target)
 *   PUT                          → set the current user's vote (verified/disputed)
 *   DELETE ?kind=&id=&projectId= → clear the current user's vote
 *
 * One row per (project, target, user); the UI rolls these into counts plus
 * the signed-in user's own vote. All state is in Postgres so a colleague's
 * verification survives reloads and is visible to everyone.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getServerSupabase } from '@/lib/supabase-server';
import {
  listVerifications,
  mapVerification,
  type WorkspaceTargetKind,
} from '@/lib/project-workspace/collaboration';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }
  const kind = url.searchParams.get('kind') as WorkspaceTargetKind | null;
  const id = url.searchParams.get('id');
  const target = kind && id ? { kind, id } : undefined;
  return NextResponse.json({ verifications: await listVerifications(projectId, target) });
}

export async function PUT(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    projectId?: string;
    targetKind?: WorkspaceTargetKind;
    targetId?: string;
    status?: 'verified' | 'disputed';
    note?: string;
  };
  if (
    !body.projectId ||
    !body.targetKind ||
    !body.targetId ||
    (body.status !== 'verified' && body.status !== 'disputed')
  ) {
    return NextResponse.json(
      { error: 'projectId, targetKind, targetId, status(verified|disputed) required' },
      { status: 400 }
    );
  }

  const admin = getServerSupabase();
  let userName = u.user.email ?? 'Someone';
  if (admin) {
    const { data: prof } = await admin
      .from('profiles')
      .select('display_name')
      .eq('id', u.user.id)
      .maybeSingle();
    if (prof?.display_name) userName = prof.display_name as string;
  }

  const { data, error } = await sb
    .from('pw_verifications')
    .upsert(
      {
        project_id: body.projectId,
        target_kind: body.targetKind,
        target_id: body.targetId,
        user_id: u.user.id,
        status: body.status,
        note: body.note ?? '',
        user_name: userName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'project_id,target_kind,target_id,user_id' }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ verification: mapVerification(data) });
}

export async function DELETE(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  const kind = url.searchParams.get('kind');
  const id = url.searchParams.get('id');
  if (!projectId || !kind || !id) {
    return NextResponse.json({ error: 'projectId, kind, id required' }, { status: 400 });
  }
  const { error } = await sb
    .from('pw_verifications')
    .delete()
    .eq('project_id', projectId)
    .eq('target_kind', kind)
    .eq('target_id', id)
    .eq('user_id', u.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
