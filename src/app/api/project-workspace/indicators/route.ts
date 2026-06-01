import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function POST(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    projectId?: string;
    name?: string;
    category?: string;
    unit?: string;
    description?: string;
    source?: string;
    sourceUrl?: string;
    direction?: 'up' | 'down';
    targetValue?: number;
    targetYear?: number;
  };
  if (!body.projectId || !body.name || !body.unit || !body.category) {
    return NextResponse.json({ error: 'projectId, name, unit, category required' }, { status: 400 });
  }

  const id =
    'user-' +
    body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) +
    '-' +
    Math.random().toString(36).slice(2, 6);

  const { data, error } = await sb
    .from('pw_indicators')
    .insert({
      id,
      project_id: body.projectId,
      name: body.name,
      category: body.category,
      unit: body.unit,
      description: body.description ?? '',
      source: body.source ?? 'User-added',
      source_url: body.sourceUrl ?? '',
      direction: body.direction ?? 'down',
      target_value: body.targetValue ?? null,
      target_year: body.targetYear ?? null,
      is_seed: false,
      created_by: u.user.id,
    })
    .select()
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'create failed' }, { status: 400 });
  }
  return NextResponse.json({ indicator: data });
}
