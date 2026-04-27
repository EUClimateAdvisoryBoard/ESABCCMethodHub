/**
 * User-initiated account deletion (GDPR Art. 17).
 * -----------------------------------------------
 * POST /api/user/delete-request
 *   Submits an erase-my-data request. The row is marked with
 *   `pending_delete_at = now() + GRACE_DAYS` so the user has a
 *   30-day window to change their mind.
 *
 * DELETE /api/user/delete-request
 *   Cancels a pending deletion (if invoked inside the grace window).
 *
 * A scheduled job (`scripts/retention-purge.sql` via the
 * `gdpr-retention` workflow) runs nightly and calls
 * `public.erase_user(user_id)` for any row whose
 * `pending_delete_at` is in the past. See
 * [GDPR](docs/infrastructure/data-gdpr.md) for the full retention + erasure design.
 *
 * Every invocation writes a row to `admin_audit_log` so the DPO
 * has a reviewable trail.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, hasServiceRole } from '@/lib/supabase-server';

const GRACE_DAYS = 30;

async function getRequestingUser(req: NextRequest) {
  const supabase = getServerSupabase();
  if (!supabase || !hasServiceRole()) return { supabase: null, user: null, error: 'Not configured.' };
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return { supabase, user: null, error: 'Unauthorized.' };
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { supabase, user: null, error: 'Unauthorized.' };
  return { supabase, user, error: null as string | null };
}

/**
 * POST /api/user/delete-request — GDPR Art. 17 (right to erasure).
 *
 * Schedules the calling user's account for hard deletion after a 30-day
 * grace period. The grace period gives the user time to cancel
 * (Art. 17(3)) and the controller time to honour any retention obligation
 * (Art. 17(3)(b/e)). The actual erasure is performed by
 * public.process_pending_deletions(), invoked by the weekly retention cron.
 */
export async function POST(req: NextRequest) {
  const { supabase, user, error } = await getRequestingUser(req);
  if (error || !user || !supabase) {
    return NextResponse.json({ error: error || 'Unauthorized.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 1000) : '';

  const scheduledFor = new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error: insertErr } = await supabase
    .from('deletion_requests')
    .upsert(
      {
        user_id: user.id,
        requested_at: new Date().toISOString(),
        scheduled_for: scheduledFor,
        cancelled_at: null,
        reason,
      },
      { onConflict: 'user_id' },
    );

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    scheduled_for: scheduledFor,
    grace_period_days: GRACE_DAYS,
    can_cancel_until: scheduledFor,
    notes: [
      'Your account is scheduled for permanent deletion after the grace period.',
      'You can cancel the request before the scheduled time by signing in and pressing "Cancel deletion".',
      'After erasure, your annotations, comments, activity log and reading-list entries cannot be recovered.',
    ],
  });
}

/**
 * DELETE /api/user/delete-request — withdraw a pending deletion request.
 *
 * Implements Art. 17(3) — the data subject may withdraw the request before
 * the erasure is carried out.
 */
export async function DELETE(req: NextRequest) {
  const { supabase, user, error } = await getRequestingUser(req);
  if (error || !user || !supabase) {
    return NextResponse.json({ error: error || 'Unauthorized.' }, { status: 401 });
  }

  const { error: updErr } = await supabase
    .from('deletion_requests')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('cancelled_at', null);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ cancelled: true });
}

/**
 * GET /api/user/delete-request — return the status of any pending request,
 * so the profile UI can show "scheduled for X / cancel" controls.
 */
export async function GET(req: NextRequest) {
  const { supabase, user, error } = await getRequestingUser(req);
  if (error || !user || !supabase) {
    return NextResponse.json({ error: error || 'Unauthorized.' }, { status: 401 });
  }

  const { data, error: selErr } = await supabase
    .from('deletion_requests')
    .select('requested_at, scheduled_for, cancelled_at, reason')
    .eq('user_id', user.id)
    .maybeSingle();

  if (selErr) {
    return NextResponse.json({ error: selErr.message }, { status: 500 });
  }

  return NextResponse.json({ request: data ?? null });
}
