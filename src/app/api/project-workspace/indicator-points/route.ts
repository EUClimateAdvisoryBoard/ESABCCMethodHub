import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { recordIndicatorRevision } from '@/lib/project-workspace/indicator-revisions';

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
  const { indicatorId, year, value } = (await req.json().catch(() => ({}))) as {
    indicatorId?: string;
    year?: number;
    value?: number;
  };
  if (!indicatorId || typeof year !== 'number' || typeof value !== 'number') {
    return NextResponse.json({ error: 'indicatorId, year, value required' }, { status: 400 });
  }
  const { error } = await sb
    .from('pw_indicator_points')
    .upsert({ indicator_id: indicatorId, year, value }, { onConflict: 'indicator_id,year' });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await recordIndicatorRevision(sb, {
    indicatorId,
    action: 'point-upsert',
    summary: `Set ${year} = ${value}`,
    user: u.user,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const url = new URL(req.url);
  const indicatorId = url.searchParams.get('indicatorId');
  const year = parseInt(url.searchParams.get('year') ?? '', 10);
  if (!indicatorId || !Number.isFinite(year)) {
    return NextResponse.json({ error: 'indicatorId, year required' }, { status: 400 });
  }
  const { error } = await sb
    .from('pw_indicator_points')
    .delete()
    .eq('indicator_id', indicatorId)
    .eq('year', year);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await recordIndicatorRevision(sb, {
    indicatorId,
    action: 'point-delete',
    summary: `Removed ${year}`,
    user: u.user,
  });

  return NextResponse.json({ ok: true });
}
