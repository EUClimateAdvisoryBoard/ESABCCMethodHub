import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest) {
  const a = req.headers.get('authorization');
  return a?.startsWith('Bearer ') ? a.slice(7) : null;
}

/**
 * Aggregates everything the Workbench dashboard needs in a single round trip.
 *
 * Returns:
 *   savedSearches: [{ id, name, last_seen_at, new_since_count }]
 *   inboxUnread:   number
 *   workspaces:    [{ id, name, role, item_count }]
 *   collections:   [{ id, name, emoji, item_count }]
 *   recentActivity:[{ action, summary, created_at }]
 */
export async function GET(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ anonymous: true });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ anonymous: true });
  const userId = u.user.id;

  const [searches, unread, ws, collections, activity] = await Promise.all([
    sb.from('news_saved_searches').select('id, name, query, last_seen_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(10),
    sb.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('read', false),
    sb.from('workspace_members').select('workspace_id, role').eq('user_id', userId),
    sb.from('collections').select('*').eq('user_id', userId).order('sort_order', { ascending: true }).limit(10),
    sb.from('activity_log').select('id, action, summary, policy_id, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(8),
  ]);

  // Workspace details + item counts
  const wsIds = (ws.data || []).map(m => m.workspace_id);
  let workspaces: Array<{ id: string; name: string; role: string; item_count: number }> = [];
  if (wsIds.length) {
    const [{ data: wsRows }, { data: wsItems }] = await Promise.all([
      sb.from('workspaces').select('id, name').in('id', wsIds),
      sb.from('workspace_items').select('workspace_id', { count: 'exact', head: false }).in('workspace_id', wsIds),
    ]);
    const itemCount: Record<string, number> = {};
    for (const i of (wsItems || [])) itemCount[i.workspace_id] = (itemCount[i.workspace_id] || 0) + 1;
    const roles = Object.fromEntries((ws.data || []).map(m => [m.workspace_id, m.role]));
    workspaces = (wsRows || []).map(w => ({
      id: w.id, name: w.name,
      role: roles[w.id] || 'editor',
      item_count: itemCount[w.id] || 0,
    }));
  }

  // Collection counts
  const collectionIds = (collections.data || []).map(c => c.id);
  let collectionCounts: Record<string, number> = {};
  if (collectionIds.length) {
    const { data: cItems } = await sb.from('collection_items').select('collection_id').in('collection_id', collectionIds);
    for (const i of (cItems || [])) collectionCounts[i.collection_id] = (collectionCounts[i.collection_id] || 0) + 1;
  }

  return NextResponse.json({
    savedSearches: searches.data || [],
    inboxUnread: unread.count || 0,
    workspaces,
    collections: (collections.data || []).map(c => ({ ...c, item_count: collectionCounts[c.id] || 0 })),
    recentActivity: activity.data || [],
  });
}
