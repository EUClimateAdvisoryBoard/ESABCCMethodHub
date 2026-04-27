import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getServerSupabase } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public contributor leaderboard (#18).
 *
 * Returns display names + contribution counts for users who have opted
 * into the public profile via user_preferences.public_profile = true.
 * Counts come from the activity_log table (the same source the profile
 * gamification badges read).
 */
export async function GET(_req: NextRequest) {
  const sb = getServerSupabase();
  if (!sb) return NextResponse.json({ contributors: [] });

  // Public-profile opt-ins.
  const { data: prefs } = await sb
    .from('user_preferences')
    .select('user_id')
    .eq('public_profile', true);

  if (!prefs || prefs.length === 0) return NextResponse.json({ contributors: [] });

  const ids = prefs.map(p => p.user_id);
  const [{ data: profiles }, { data: activity }] = await Promise.all([
    sb.from('profiles').select('id, display_name, role').in('id', ids),
    sb.from('activity_log').select('user_id, action').in('user_id', ids).limit(5000),
  ]);

  const counts: Record<string, { total: number; comments: number; annotations: number; tags: number }> = {};
  for (const a of activity || []) {
    const c = counts[a.user_id] || { total: 0, comments: 0, annotations: 0, tags: 0 };
    c.total += 1;
    if (a.action === 'comment_created') c.comments += 1;
    else if (a.action === 'annotation_created') c.annotations += 1;
    else if (a.action === 'tag_added') c.tags += 1;
    counts[a.user_id] = c;
  }

  const contributors = (profiles || []).map(p => ({
    id: p.id,
    display_name: (p.display_name as string) || 'Anonymous',
    role: p.role as string,
    ...(counts[p.id as string] || { total: 0, comments: 0, annotations: 0, tags: 0 }),
  }));

  contributors.sort((a, b) => b.total - a.total);
  return NextResponse.json({ contributors });
}
