/**
 * Admin user management API for listing, updating roles, and scheduling deletions.
 * Supports GET, PATCH, and DELETE methods; requires admin authentication.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, hasServiceRole } from '@/lib/supabase-server';
import { recordAdminAction } from '@/lib/admin-audit';

/**
 * Verify that the requesting user is an admin and return their id, so
 * downstream handlers can attribute audit-log entries.
 */
async function verifyAdmin(
  supabase: ReturnType<typeof getServerSupabase>,
  authHeader: string | null,
): Promise<{ ok: boolean; actorId?: string }> {
  if (!supabase || !authHeader) return { ok: false };
  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return { ok: false };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return { ok: false };
  return { ok: true, actorId: user.id };
}

/** GET /api/admin/users — list all users with their profiles */
export async function GET(req: NextRequest) {
  const supabase = getServerSupabase();
  if (!supabase || !hasServiceRole()) {
    return NextResponse.json({ error: 'Not configured.' }, { status: 500 });
  }

  const adminCheck = await verifyAdmin(supabase, req.headers.get('authorization'));
  if (!adminCheck.ok || !adminCheck.actorId) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }
  const actorId = adminCheck.actorId;

  // Fetch all users from auth.users via admin API
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch profiles to get roles and display names
  const { data: profiles } = await supabase.from('profiles').select('id, display_name, role, created_at');
  const profileMap = new Map((profiles || []).map((p: Record<string, unknown>) => [p.id, p]));

  // Fetch contribution counts (activity_log entries per user)
  const { data: contributions } = await supabase
    .from('activity_log')
    .select('user_id');

  const contributionCounts = new Map<string, number>();
  if (contributions) {
    for (const row of contributions) {
      const uid = (row as Record<string, unknown>).user_id as string;
      contributionCounts.set(uid, (contributionCounts.get(uid) || 0) + 1);
    }
  }

  // Fetch pending deletion requests so the admin UI can show a "scheduled
  // for deletion" badge instead of the user appearing to come back on refresh.
  const { data: deletions } = await supabase
    .from('deletion_requests')
    .select('user_id, requested_at, scheduled_for, reason')
    .is('cancelled_at', null);

  const deletionMap = new Map(
    (deletions || []).map((d: Record<string, unknown>) => [d.user_id as string, d]),
  );

  const userList = users.map((u: { id: string; email?: string; created_at: string; last_sign_in_at?: string | null }) => {
    const profile = profileMap.get(u.id) as Record<string, unknown> | undefined;
    const pending = deletionMap.get(u.id) as Record<string, unknown> | undefined;
    return {
      id: u.id,
      email: u.email,
      displayName: (profile?.display_name as string | undefined) || 'Anonymous',
      role: (profile?.role as string) || 'user',
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at,
      contributions: contributionCounts.get(u.id) || 0,
      pendingDeletion: pending
        ? {
            requestedAt: pending.requested_at as string,
            scheduledFor: pending.scheduled_for as string,
            reason: (pending.reason as string) || '',
          }
        : null,
    };
  });

  return NextResponse.json({ users: userList });
}

/** PATCH /api/admin/users — update a user's role */
export async function PATCH(req: NextRequest) {
  const supabase = getServerSupabase();
  if (!supabase || !hasServiceRole()) {
    return NextResponse.json({ error: 'Not configured.' }, { status: 500 });
  }

  const adminCheck = await verifyAdmin(supabase, req.headers.get('authorization'));
  if (!adminCheck.ok || !adminCheck.actorId) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }
  const actorId = adminCheck.actorId;

  const { userId, role, cancelDeletion } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: 'userId is required.' }, { status: 400 });
  }

  // Admin withdraws a pending deletion (Art. 17(3) — controller may also
  // honour a withdrawal on the data subject's behalf, e.g. after support
  // contact). The retention cron only erases rows where cancelled_at IS NULL.
  if (cancelDeletion) {
    const { error: cancelErr } = await supabase
      .from('deletion_requests')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('cancelled_at', null);
    if (cancelErr) {
      return NextResponse.json({ error: cancelErr.message }, { status: 500 });
    }
    await recordAdminAction(supabase, {
      actorId,
      action: 'user.deletion_cancelled',
      targetType: 'user',
      targetId: userId,
      metadata: {},
    });
    return NextResponse.json({ success: true });
  }

  if (!role || !['admin', 'user'].includes(role)) {
    return NextResponse.json({ error: 'Valid role (admin/user) is required.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordAdminAction(supabase, {
    actorId,
    action: 'user.role_changed',
    targetType: 'user',
    targetId: userId,
    metadata: { new_role: role },
  });

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/admin/users — schedule a user for deletion.
 *
 * GDPR: an admin-initiated deletion must still go through the same 30-day
 * grace period as a self-service Art. 17 request, so the data subject has
 * a chance to be informed and to object (Art. 17(3), Art. 21). The actual
 * erasure is performed by the weekly retention cron via
 * public.process_pending_deletions().
 *
 * To erase immediately (legal-obligation cases), pass `{ immediate: true }`
 * — this is logged in admin_audit_log.
 */
export async function DELETE(req: NextRequest) {
  const supabase = getServerSupabase();
  if (!supabase || !hasServiceRole()) {
    return NextResponse.json({ error: 'Not configured.' }, { status: 500 });
  }

  const adminCheck = await verifyAdmin(supabase, req.headers.get('authorization'));
  if (!adminCheck.ok || !adminCheck.actorId) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }
  const actorId = adminCheck.actorId;

  const { userId, immediate = false, reason = '' } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: 'userId is required.' }, { status: 400 });
  }

  if (actorId === userId) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
  }

  if (immediate) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await recordAdminAction(supabase, {
      actorId,
      action: 'user.deleted_immediate',
      targetType: 'user',
      targetId: userId,
      metadata: { reason: String(reason || '').slice(0, 500) },
    });
    return NextResponse.json({ success: true, mode: 'immediate' });
  }

  const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('deletion_requests')
    .upsert(
      {
        user_id: userId,
        requested_at: new Date().toISOString(),
        scheduled_for: scheduledFor,
        cancelled_at: null,
        reason: reason ? `[admin] ${String(reason).slice(0, 1000)}` : '[admin]',
      },
      { onConflict: 'user_id' },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordAdminAction(supabase, {
    actorId,
    action: 'user.deletion_scheduled',
    targetType: 'user',
    targetId: userId,
    metadata: { scheduled_for: scheduledFor, reason: String(reason || '').slice(0, 500) },
  });

  return NextResponse.json({ success: true, mode: 'scheduled', scheduled_for: scheduledFor });
}
