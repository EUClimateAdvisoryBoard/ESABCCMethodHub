/**
 * POST /api/project-workspace/indicators/[id]/refresh
 *
 * Pulls the live series for a seed indicator (Eurostat / EEA), upserts the
 * fetched points into `pw_indicator_points`, and logs the attempt in
 * `pw_indicator_refreshes`. The handler is intentionally idempotent: rerunning
 * it overwrites any previous values for the same (indicator, year) pair.
 *
 * Returns the merged time series the UI should render, plus a small refresh
 * summary so the page can confirm where the numbers came from.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { fetchLiveSeries, hasLiveSource } from '@/lib/project-workspace/live-sources';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);

  const indicatorId = params.id;
  if (!hasLiveSource(indicatorId)) {
    return NextResponse.json(
      { error: 'No live source is registered for this indicator.' },
      { status: 400 }
    );
  }

  // Confirm the indicator actually exists (RLS-scoped read).
  const { data: row, error: readErr } = await sb
    .from('pw_indicators')
    .select('id, source, source_url')
    .eq('id', indicatorId)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 400 });
  if (!row) return NextResponse.json({ error: 'indicator not found' }, { status: 404 });

  let result;
  try {
    result = await fetchLiveSeries(indicatorId, AbortSignal.timeout(20_000));
  } catch (e) {
    const msg = (e as Error).message;
    await sb.from('pw_indicator_refreshes').insert({
      indicator_id: indicatorId,
      source: indicatorId,
      ok: false,
      points_added: 0,
      message: msg.slice(0, 500),
    });
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  if (result.points.length === 0) {
    await sb.from('pw_indicator_refreshes').insert({
      indicator_id: indicatorId,
      source: result.source,
      ok: false,
      points_added: 0,
      message: 'live source returned no rows',
    });
    return NextResponse.json(
      { error: 'Live source returned no rows.' },
      { status: 502 }
    );
  }

  // Upsert all fetched points.
  const { error: upErr } = await sb
    .from('pw_indicator_points')
    .upsert(
      result.points.map(p => ({
        indicator_id: indicatorId,
        year: p.year,
        value: p.value,
      })),
      { onConflict: 'indicator_id,year' }
    );
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  // Log success.
  await sb.from('pw_indicator_refreshes').insert({
    indicator_id: indicatorId,
    source: result.source,
    ok: true,
    points_added: result.points.length,
    message: '',
  });

  // Return the full series (post-upsert) so the UI can re-render without a
  // second round-trip.
  const { data: allPoints } = await sb
    .from('pw_indicator_points')
    .select('year, value')
    .eq('indicator_id', indicatorId)
    .order('year', { ascending: true });

  return NextResponse.json({
    ok: true,
    source: result.source,
    pointsFetched: result.points.length,
    points: allPoints ?? [],
  });
}
