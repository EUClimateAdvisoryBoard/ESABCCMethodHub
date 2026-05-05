/**
 * GET /api/connections/assignees
 * Returns the list of all user profiles for use in the "Assign to" dropdown.
 * Requires a valid auth session; no admin role needed.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireToken(req: NextRequest) {
  const supabase = getServerSupabase();
  if (!supabase) return { supabase: null, error: 'Supabase not configured.', status: 503 };
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return { supabase, error: 'Unauthorized.', status: 401 };
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { supabase, error: 'Unauthorized.', status: 401 };
  return { supabase, error: null as string | null, status: 200 };
}

export async function GET(req: NextRequest) {
  const { supabase, error, status } = await requireToken(req);
  if (!supabase || error) {
    return NextResponse.json({ error: error || 'Unauthorized.' }, { status });
  }
  const { data, error: dbErr } = await supabase
    .from('profiles')
    .select('id, display_name')
    .order('display_name', { ascending: true });
  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }
  const assignees = (data ?? []).map((p: { id: string; display_name: string | null }) => ({
    id: p.id,
    name: p.display_name || 'Anonymous',
  }));
  return NextResponse.json({ assignees });
}
