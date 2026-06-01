/**
 * POST /api/project-workspace/meetings/[id]/analyze
 *
 * Runs the LLM over a meeting's notes / minutes to extract the "main three
 * things" and (optionally) a prose summary, then persists them on the row.
 *
 * Body: { mode?: 'key-points' | 'summary' | 'both' }  (default 'key-points')
 *
 * Returns { ok, keyPoints?, summary?, reason? }. A 200 with ok:false +
 * reason:'no-api-key' lets the UI show a friendly hint rather than an error.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getMeeting } from '@/lib/project-workspace/meetings';
import { extractKeyPoints, generateSummary } from '@/lib/project-workspace/meeting-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// LLM round-trips can take a while; give the function more headroom.
export const maxDuration = 60;

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const meeting = await getMeeting(params.id);
  if (!meeting) return NextResponse.json({ error: 'meeting not found' }, { status: 404 });

  const { mode = 'key-points' } = (await req.json().catch(() => ({}))) as {
    mode?: 'key-points' | 'summary' | 'both';
  };

  const patch: Record<string, unknown> = {};
  const out: { ok: boolean; keyPoints?: string[]; summary?: string; reason?: string } = { ok: true };

  if (mode === 'key-points' || mode === 'both') {
    const r = await extractKeyPoints(meeting);
    if (r.ok) {
      out.keyPoints = r.keyPoints;
      patch.key_points = r.keyPoints;
    } else {
      out.ok = false;
      out.reason = r.reason;
    }
  }

  if (mode === 'summary' || mode === 'both') {
    const r = await generateSummary(meeting);
    if (r.ok) {
      out.summary = r.summary;
      patch.summary = r.summary;
    } else {
      out.ok = false;
      out.reason = out.reason ?? r.reason;
    }
  }

  if (Object.keys(patch).length > 0) {
    await sb.from('pw_meetings').update(patch).eq('id', params.id);
  }

  return NextResponse.json(out);
}
