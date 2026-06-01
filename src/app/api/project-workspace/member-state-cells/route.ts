import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function PUT(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    projectId?: string;
    countryCode?: string;
    sectorId?: string;
    status?: string;
    note?: string;
  };
  if (!body.projectId || !body.countryCode || !body.sectorId) {
    return NextResponse.json(
      { error: 'projectId, countryCode, sectorId required' },
      { status: 400 }
    );
  }
  const { error } = await sb
    .from('pw_member_state_cells')
    .upsert(
      {
        project_id: body.projectId,
        country_code: body.countryCode,
        sector_id: body.sectorId,
        status: body.status ?? 'empty',
        note: body.note ?? '',
        updated_by: u.user.id,
      },
      { onConflict: 'project_id,country_code,sector_id' }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
