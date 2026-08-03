import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { authoriseMediaMutation } from '@/lib/media-auth';
import { validateFeedUrl } from '@/lib/media-url-safety';
import {
  PRESS_SOURCE_TYPES,
  type PressSourceType,
} from '@/lib/media-press-feeds';

/**
 * CRUD for `media_press_sources` — the standing RSS / Google Alert /
 * Talkwalker Alert feeds polled on every press run.
 *
 * Mutations are gated by `authoriseMediaMutation`, and every `feed_url` is
 * checked with `validateFeedUrl` (SSRF guard) before it is stored, since
 * these URLs are fetched server-side.
 */

function parseSourceType(value: unknown): PressSourceType {
  const candidate = String(value ?? 'rss') as PressSourceType;
  return PRESS_SOURCE_TYPES.includes(candidate) ? candidate : 'rss';
}

/**
 * Google Alert feed URLs look like
 *   https://www.google.com/alerts/feeds/<user id>/<alert id>
 * and Talkwalker's like
 *   https://alerts.talkwalker.com/alerts/rss?...
 *
 * A very common setup mistake is pasting the *management page* URL
 * (google.com/alerts) rather than the feed URL behind the RSS icon. That
 * returns an HTML page, parses to zero entries, and looks like "the feed is
 * empty" rather than "wrong URL", so reject it at write time with a message
 * that says what to paste instead.
 */
function checkAlertFeedUrl(
  sourceType: PressSourceType,
  url: string,
): { ok: true } | { ok: false; reason: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: 'feed_url is not a valid URL' };
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

  if (sourceType === 'google_alert') {
    if (host === 'google.com' && !parsed.pathname.startsWith('/alerts/feeds/')) {
      return {
        ok: false,
        reason:
          'That is the Google Alerts management page, not a feed. Open google.com/alerts, set the alert\'s "Deliver to" to RSS feed, then copy the URL behind the orange RSS icon (it looks like https://www.google.com/alerts/feeds/<id>/<id>).',
      };
    }
  }

  if (sourceType === 'talkwalker_alert') {
    if (host.endsWith('talkwalker.com') && !parsed.pathname.includes('/rss')) {
      return {
        ok: false,
        reason:
          'That does not look like a Talkwalker RSS feed URL. In alerts.talkwalker.com open the alert, choose RSS as the delivery method, and copy the feed URL (it contains /alerts/rss).',
      };
    }
  }

  return { ok: true };
}

export async function GET() {
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ sources: [] });

  const { data, error } = await supabase
    .from('media_press_sources')
    .select('*')
    .order('is_active', { ascending: false })
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

    const name = String(body.name ?? '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Missing name' }, { status: 400 });
    }

    const rawFeedUrl = String(body.feed_url ?? '').trim();
    if (!rawFeedUrl) {
      return NextResponse.json({ error: 'Missing feed_url' }, { status: 400 });
    }
    const check = validateFeedUrl(rawFeedUrl);
    if (!check.ok) {
      return NextResponse.json({ error: check.reason }, { status: 400 });
    }

    const sourceType = parseSourceType(body.source_type);
    const shapeCheck = checkAlertFeedUrl(sourceType, check.url);
    if (!shapeCheck.ok) {
      return NextResponse.json({ error: shapeCheck.reason }, { status: 400 });
    }

    const row = {
      name: name.slice(0, 200),
      source_type: sourceType,
      feed_url: check.url,
      alert_query: body.alert_query ? String(body.alert_query).slice(0, 1000) : null,
      country: body.country ? String(body.country).slice(0, 6) : null,
      language: body.language ? String(body.language).slice(0, 5) : 'en',
      default_report_slug: body.default_report_slug
        ? String(body.default_report_slug)
        : null,
      notes: body.notes ? String(body.notes).slice(0, 2000) : null,
      is_active: body.is_active !== false,
    };

    const { data, error } = await supabase
      .from('media_press_sources')
      .insert(row)
      .select()
      .single();

    if (error) {
      // Surface the unique-index collision as something actionable rather
      // than a raw Postgres error string.
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'That feed URL is already registered.' },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ source: data });
  } catch (err) {
    console.error('[media-monitoring] press sources POST error', err);
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
    if (typeof body.name === 'string') patch.name = body.name.slice(0, 200);
    if (typeof body.is_active === 'boolean') patch.is_active = body.is_active;
    if (typeof body.alert_query === 'string' || body.alert_query === null) {
      patch.alert_query = body.alert_query;
    }
    if (typeof body.notes === 'string' || body.notes === null) patch.notes = body.notes;
    if (typeof body.country === 'string' || body.country === null) patch.country = body.country;
    if (typeof body.language === 'string') patch.language = body.language.slice(0, 5);

    if (typeof body.feed_url === 'string') {
      const check = validateFeedUrl(body.feed_url);
      if (!check.ok) {
        return NextResponse.json({ error: check.reason }, { status: 400 });
      }
      const sourceType = parseSourceType(body.source_type);
      const shapeCheck = checkAlertFeedUrl(sourceType, check.url);
      if (!shapeCheck.ok) {
        return NextResponse.json({ error: shapeCheck.reason }, { status: 400 });
      }
      patch.feed_url = check.url;
    }
    if (body.source_type !== undefined) patch.source_type = parseSourceType(body.source_type);

    const { error } = await supabase
      .from('media_press_sources')
      .update(patch)
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[media-monitoring] press sources PATCH error', err);
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
    .from('media_press_sources')
    .delete()
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
