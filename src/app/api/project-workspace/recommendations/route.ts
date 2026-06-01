import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

const VALID_STATUS = ['not-addressed', 'in-progress', 'partially', 'addressed'];

export async function POST(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    projectId?: string;
    area?: string;
    title?: string;
    summary?: string;
    status?: string;
  };

  if (!body.projectId || !body.title) {
    return NextResponse.json(
      { error: 'projectId and title required' },
      { status: 400 }
    );
  }
  if (body.status && !VALID_STATUS.includes(body.status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }

  const id =
    body.id ??
    `rec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const { data, error } = await sb
    .from('pw_recommendations')
    .insert({
      id,
      project_id: body.projectId,
      area: body.area ?? '',
      title: body.title,
      summary: body.summary ?? '',
      status: body.status ?? 'not-addressed',
      is_seed: false,
      created_by: u.user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ recommendation: data });
}
