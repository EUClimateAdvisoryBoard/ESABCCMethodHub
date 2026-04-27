import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * GDPR Art. 5(2): record sensitive admin actions to admin_audit_log.
 *
 * Failures are non-fatal: the calling endpoint should not abort the
 * underlying operation if the audit write fails (we log to stderr so the
 * monitoring stack can pick it up). Service-role context required.
 */
export async function recordAdminAction(
  supabase: SupabaseClient,
  params: {
    actorId: string;
    action: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const { error } = await supabase.from('admin_audit_log').insert({
      actor_id: params.actorId,
      action: params.action,
      target_type: params.targetType ?? null,
      target_id: params.targetId ?? null,
      metadata: params.metadata ?? {},
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[admin-audit] insert failed:', error.message);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[admin-audit] threw:', err);
  }
}
