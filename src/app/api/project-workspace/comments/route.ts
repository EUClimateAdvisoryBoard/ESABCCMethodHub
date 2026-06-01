/**
 * Project Workspace comments — collection endpoint.
 *
 *   GET  ?projectId=&kind=&id=   → list comments (optionally for one target)
 *   POST                          → create a comment / reply
 *
 * On create we persist the row, then fan out in-app notifications (via the
 * service-role client, which can write notifications for OTHER users) to:
 *   • everyone @-mentioned in the body, and
 *   • the author of the parent comment when this is a reply.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getServerSupabase } from '@/lib/supabase-server';
import {
  listComments,
  mapComment,
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
  return NextResponse.json({ comments: await listComments(projectId, target) });
}

export async function POST(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    projectId?: string;
    targetKind?: WorkspaceTargetKind;
    targetId?: string;
    body?: string;
    parentId?: string | null;
    mentions?: string[];
  };
  if (!body.projectId || !body.targetKind || !body.targetId || !body.body?.trim()) {
    return NextResponse.json(
      { error: 'projectId, targetKind, targetId, body required' },
      { status: 400 }
    );
  }

  // Authoritative author display name from the profile.
  const admin = getServerSupabase();
  let authorName = u.user.email ?? 'Someone';
  if (admin) {
    const { data: prof } = await admin
      .from('profiles')
      .select('display_name')
      .eq('id', u.user.id)
      .maybeSingle();
    if (prof?.display_name) authorName = prof.display_name as string;
  }

  const mentions = Array.from(new Set((body.mentions ?? []).filter(Boolean)));

  const { data, error } = await sb
    .from('pw_comments')
    .insert({
      project_id: body.projectId,
      target_kind: body.targetKind,
      target_id: body.targetId,
      parent_id: body.parentId ?? null,
      body: body.body.trim(),
      mentions,
      author_name: authorName,
      created_by: u.user.id,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Fan out notifications. Best-effort: never fail the request on this.
  if (admin) {
    const recipients = new Set<string>(mentions);
    if (body.parentId) {
      const { data: parent } = await admin
        .from('pw_comments')
        .select('created_by')
        .eq('id', body.parentId)
        .maybeSingle();
      if (parent?.created_by) recipients.add(parent.created_by as string);
    }
    recipients.delete(u.user.id); // never notify yourself

    const preview =
      body.body.trim().length > 90 ? body.body.trim().slice(0, 90) + '…' : body.body.trim();
    const link = `/project-workspace/${body.projectId}?focus=${encodeURIComponent(
      `${body.targetKind}:${body.targetId}`
    )}`;

    const rows = [...recipients].map(uid => ({
      user_id: uid,
      type: mentions.includes(uid) ? 'mention' : 'reply',
      title: mentions.includes(uid)
        ? `${authorName} mentioned you in a workspace comment`
        : `${authorName} replied to your comment`,
      message: preview,
      link,
      read: false,
    }));
    if (rows.length > 0) {
      await admin.from('notifications').insert(rows);
    }
  }

  return NextResponse.json({ comment: mapComment(data) });
}
