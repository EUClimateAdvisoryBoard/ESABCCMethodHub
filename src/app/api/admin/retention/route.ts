/**
 * Admin endpoint to run GDPR data-retention purges.
 * Supports POST via admin Bearer token or cron secret header.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, hasServiceRole } from '@/lib/supabase-server';
import { recordAdminAction } from '@/lib/admin-audit';

/**
 * POST /api/admin/retention — run the GDPR data-retention purge.
 *
 * Calls public.purge_expired_personal_data() (defined in migration 012),
 * which deletes activity-log rows and inbound emails older than the
 * configured windows and redacts sender addresses on emails older than 6
 * months. Returns a JSON summary of what was removed.
 *
 * Auth:
 *   - Bearer header with an admin user's token, OR
 *   - X-Cron-Secret header matching RETENTION_CRON_SECRET (for the weekly
 *     scheduled GitHub Action). The secret-based path is the only way to
 *     run this without an interactive admin session.
 */
export async function POST(req: NextRequest) {
  const supabase = getServerSupabase();
  if (!supabase || !hasServiceRole()) {
    return NextResponse.json({ error: 'Not configured.' }, { status: 500 });
  }

  const cronSecret = process.env.RETENTION_CRON_SECRET;
  const providedSecret = req.headers.get('x-cron-secret');
  const secretAuthOk = !!cronSecret && !!providedSecret && providedSecret === cronSecret;

  let actorId: string | null = null;
  if (!secretAuthOk) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin role required.' }, { status: 403 });
    }
    actorId = user.id;
  }

  const { data, error } = await supabase.rpc('purge_expired_personal_data');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (actorId) {
    await recordAdminAction(supabase, {
      actorId,
      action: 'retention.purged',
      metadata: { summary: data, trigger: 'manual' },
    });
  }

  return NextResponse.json({ summary: data });
}
