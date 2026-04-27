/**
 * In-app notification store.
 * --------------------------
 * Kinds:
 *   - `reply`   — someone replied to a thread the user is in.
 *   - `mention` — the user was @-mentioned in a comment.
 *   - `system`  — admin broadcasts (retention notices, schema
 *                 migrations, etc.).
 *
 * Drives the bell icon in the site header (`NotificationBell.tsx`)
 * and the unread-count badge on mobile. Marks-as-read are optimistic
 * locally and flushed to Supabase in the background.
 *
 * Retention: default 180 days, controlled by a Postgres GUC so the
 * DPO can tune without a code change. See docs/infrastructure/data-gdpr.md.
 */
import { supabase } from './supabase';

export type NotificationType = 'reply' | 'mention' | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  read: boolean;
  created_at: string;
}

function sb() { return supabase; }

// ─── localStorage helpers ────────────────────────────────────────────────────

const STORAGE_KEY = 'eu-policy-notifications';

function getAllLocal(): Notification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocal(notifications: Notification[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch (err) {
    console.error('Failed to save notifications to localStorage:', err);
  }
}

// ─── Fetch notifications ─────────────────────────────────────────────────────

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const local = getAllLocal().filter(n => n.user_id === userId);
  const s = sb();
  if (!s) return local.sort((a, b) => b.created_at.localeCompare(a.created_at));

  try {
    const { data, error } = await s
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data) {
      console.warn('Supabase notifications fetch failed:', error?.message);
      return local.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    const remote: Notification[] = data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      user_id: row.user_id as string,
      type: row.type as NotificationType,
      title: row.title as string,
      message: row.message as string,
      link: row.link as string,
      read: row.read as boolean,
      created_at: row.created_at as string,
    }));

    // Merge remote + local-only, deduplicate by id
    const remoteIds = new Set(remote.map(n => n.id));
    const localOnly = local.filter(n => !remoteIds.has(n.id));
    return [...remote, ...localOnly].sort((a, b) => b.created_at.localeCompare(a.created_at));
  } catch {
    return local.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

// ─── Unread count ────────────────────────────────────────────────────────────

export async function getUnreadCount(userId: string): Promise<number> {
  const s = sb();
  if (!s) {
    return getAllLocal().filter(n => n.user_id === userId && !n.read).length;
  }

  try {
    const { count, error } = await s
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error || count === null) {
      return getAllLocal().filter(n => n.user_id === userId && !n.read).length;
    }

    // Also count local-only unread
    const localUnread = getAllLocal().filter(n => n.user_id === userId && !n.read);
    return count + localUnread.length;
  } catch {
    return getAllLocal().filter(n => n.user_id === userId && !n.read).length;
  }
}

// ─── Mark as read ────────────────────────────────────────────────────────────

export async function markAsRead(notificationId: string): Promise<void> {
  // Update localStorage
  const all = getAllLocal();
  const idx = all.findIndex(n => n.id === notificationId);
  if (idx !== -1) {
    all[idx].read = true;
    saveLocal(all);
  }

  // Update Supabase
  const s = sb();
  if (!s) return;

  try {
    await s.from('notifications').update({ read: true }).eq('id', notificationId);
  } catch {
    // localStorage already updated as fallback
  }
}

export async function markAllAsRead(userId: string): Promise<void> {
  // Update localStorage
  const all = getAllLocal();
  let changed = false;
  for (const n of all) {
    if (n.user_id === userId && !n.read) {
      n.read = true;
      changed = true;
    }
  }
  if (changed) saveLocal(all);

  // Update Supabase
  const s = sb();
  if (!s) return;

  try {
    await s.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  } catch {
    // localStorage already updated as fallback
  }
}

// ─── Create notification ─────────────────────────────────────────────────────

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link: string
): Promise<Notification | null> {
  const notification: Notification = {
    id: crypto.randomUUID(),
    user_id: userId,
    type,
    title,
    message,
    link,
    read: false,
    created_at: new Date().toISOString(),
  };

  const s = sb();
  if (!s) {
    const all = getAllLocal();
    all.unshift(notification);
    saveLocal(all.slice(0, 200));
    return notification;
  }

  try {
    const { data, error } = await s
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        link,
        read: false,
      })
      .select()
      .single();

    if (error || !data) {
      console.warn('Supabase notification save failed, falling back to localStorage:', error?.message);
      const all = getAllLocal();
      all.unshift(notification);
      saveLocal(all.slice(0, 200));
      return notification;
    }

    return {
      id: data.id as string,
      user_id: data.user_id as string,
      type: data.type as NotificationType,
      title: data.title as string,
      message: data.message as string,
      link: data.link as string,
      read: data.read as boolean,
      created_at: data.created_at as string,
    };
  } catch (err) {
    console.warn('Supabase notification error, falling back to localStorage:', err);
    const all = getAllLocal();
    all.unshift(notification);
    saveLocal(all.slice(0, 200));
    return notification;
  }
}

// ─── Reply notification helper ───────────────────────────────────────────────

/**
 * Creates a notification for the author of a parent comment when someone replies.
 * Should be called after creating a reply comment.
 */
export async function notifyCommentReply(
  parentCommentUserId: string,
  replyAuthorName: string,
  policyId: string,
  commentPreview: string
): Promise<void> {
  const preview = commentPreview.length > 80
    ? commentPreview.slice(0, 80) + '...'
    : commentPreview;

  await createNotification(
    parentCommentUserId,
    'reply',
    `${replyAuthorName} replied to your comment`,
    preview,
    `/policy-navigator/${policyId}`
  );
}
