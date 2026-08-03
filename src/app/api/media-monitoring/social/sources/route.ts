import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { authoriseMediaMutation } from '@/lib/media-auth';
import { validateFeedUrl } from '@/lib/media-url-safety';

/**
 * CRUD for `media_social_sources` — the LinkedIn profiles, company pages and
 * hashtags the social fetcher should track.
 *
 * POST, PATCH and DELETE are gated by `authoriseMediaMutation` (see
 * src/lib/media-auth.ts). Any supplied `feed_url` is checked with
 * `validateFeedUrl` (SSRF guard) before it is stored.
 */
export async function GET() {
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ sources: [] });

  const { data, error } = await supabase
    .from('media_social_sources')
    .select('*')
    .order('is_board_member', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ sources: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await authoriseMediaMutation(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase not configured on server' },
      { status: 500 },
    );
  }
  try {
    const body = await request.json();
    const handle = String(body.handle ?? '').trim();
    if (!handle) {
      return NextResponse.json({ error: 'Missing handle' }, { status: 400 });
    }
    let feedUrl: string | null = null;
    if (body.feed_url) {
      const check = validateFeedUrl(String(body.feed_url));
      if (!check.ok) {
        return NextResponse.json({ error: check.reason }, { status: 400 });
      }
      feedUrl = check.url;
    }
    const row = {
      platform: body.platform ? String(body.platform) : 'linkedin',
      handle,
      source_type: body.source_type ? String(body.source_type) : 'account',
      display_name: body.display_name ? String(body.display_name).slice(0, 200) : null,
      profile_url: body.profile_url ? String(body.profile_url).slice(0, 500) : null,
      feed_url: feedUrl,
      country: body.country ? String(body.country).slice(0, 6) : null,
      language: body.language ? String(body.language).slice(0, 5) : 'en',
      default_report_slug: body.default_report_slug
        ? String(body.default_report_slug)
        : null,
      is_board_member: body.is_board_member === true,
      is_active: body.is_active !== false,
    };
    const { data, error } = await supabase
      .from('media_social_sources')
      .insert(row)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ source: data });
  } catch (err) {
    console.error('[media-monitoring] social sources POST error', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authoriseMediaMutation(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase not configured on server' },
      { status: 500 },
    );
  }
  try {
    const body = await request.json();
    const id = String(body.id ?? '');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.is_active === 'boolean') patch.is_active = body.is_active;
    if (typeof body.is_board_member === 'boolean') patch.is_board_member = body.is_board_member;
    if (typeof body.feed_url === 'string') {
      const check = validateFeedUrl(body.feed_url);
      if (!check.ok) {
        return NextResponse.json({ error: check.reason }, { status: 400 });
      }
      patch.feed_url = check.url;
    }
    if (typeof body.display_name === 'string') patch.display_name = body.display_name.slice(0, 200);
    if (typeof body.default_report_slug === 'string' || body.default_report_slug === null) {
      patch.default_report_slug = body.default_report_slug;
    }

    const { error } = await supabase
      .from('media_social_sources')
      .update(patch)
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[media-monitoring] social sources PATCH error', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await authoriseMediaMutation(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase not configured on server' },
      { status: 500 },
    );
  }
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { error } = await supabase
    .from('media_social_sources')
    .delete()
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
