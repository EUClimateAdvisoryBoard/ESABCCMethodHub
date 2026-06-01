/**
 * PUT /api/project-workspace/indicators/[id]/sheet
 *   body: { layout: IndicatorSheetLayout, points: {year,value}[], source?: string }
 *
 * Saves the full data grid edited in the in-app calc editor:
 *   • `points` (the final/plotted "Value" series) are synced exactly to
 *     pw_indicator_points — years not present are deleted.
 *   • `layout` (columns incl. per-column source / derivation, and the cells)
 *     is stored in pw_indicator_sheets.
 *   • `source`, when given, updates the indicator's headline source so the
 *     normal viewer stays in step with the Value column's source.
 *
 * The editor is the source of truth for the series here, so an empty `points`
 * array clears the indicator's data. Unlike the Excel import, this is a single
 * deliberate Save on one indicator.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { normalizeLayout } from '@/lib/project-workspace/indicator-sheet';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const id = params.id;
  const body = (await req.json().catch(() => ({}))) as {
    layout?: unknown;
    points?: { year?: unknown; value?: unknown }[];
    source?: string;
  };

  const layout = normalizeLayout(body.layout);
  if (!layout) return NextResponse.json({ error: 'invalid layout' }, { status: 400 });
  if (!Array.isArray(body.points)) {
    return NextResponse.json({ error: 'points array required' }, { status: 400 });
  }

  // Validate / dedupe the incoming series.
  const seen = new Set<number>();
  const points: { year: number; value: number }[] = [];
  for (const p of body.points) {
    const year = Number(p.year);
    const value = Number(p.value);
    if (!Number.isInteger(year) || !Number.isFinite(value)) continue;
    if (seen.has(year)) continue;
    seen.add(year);
    points.push({ year, value });
  }

  // Confirm the indicator exists (RLS-scoped).
  const { data: row, error: readErr } = await sb
    .from('pw_indicators')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 400 });
  if (!row) return NextResponse.json({ error: 'indicator not found' }, { status: 404 });

  // Optional headline-source update (Value column source).
  if (typeof body.source === 'string') {
    const { error } = await sb
      .from('pw_indicators')
      .update({ source: body.source })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Sync the series: upsert what we have, delete the rest.
  if (points.length > 0) {
    const { error: upErr } = await sb.from('pw_indicator_points').upsert(
      points.map(p => ({ indicator_id: id, year: p.year, value: p.value })),
      { onConflict: 'indicator_id,year' }
    );
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });
    const { error: delErr } = await sb
      .from('pw_indicator_points')
      .delete()
      .eq('indicator_id', id)
      .not('year', 'in', `(${points.map(p => p.year).join(',')})`);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });
  } else {
    const { error: delErr } = await sb
      .from('pw_indicator_points')
      .delete()
      .eq('indicator_id', id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });
  }

  // Store the layout (helper columns, sources, derivations, cells).
  const { error: sheetErr } = await sb.from('pw_indicator_sheets').upsert(
    { indicator_id: id, layout, updated_by: u.user.id },
    { onConflict: 'indicator_id' }
  );
  if (sheetErr) return NextResponse.json({ error: sheetErr.message }, { status: 400 });

  return NextResponse.json({ ok: true, points });
}
