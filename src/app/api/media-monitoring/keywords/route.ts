import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { authoriseMediaMutation } from '@/lib/media-auth';
import type { MediaKeyword } from '@/lib/media-monitoring';

/**
 * CRUD for the `media_keywords` table.
 *
 * Examples:
 *   GET  /api/media-monitoring/keywords
 *   POST /api/media-monitoring/keywords
 *        body: { keyword, label?, category?, language?, country? }
 *   DELETE /api/media-monitoring/keywords?id=<uuid>
 *
 * POST, PATCH and DELETE are gated by `authoriseMediaMutation` (see
 * src/lib/media-auth.ts) — a shared secret or Supabase user token, unless
 * MEDIA_MONITORING_SECRET is unset. `language` and `country` are validated
 * as ISO-ish 2-letter codes on POST.
 */

/** Validate and normalise `language`/`country`. Returns an error message on failure. */
function parseLanguageAndCountry(
  body: Record<string, unknown>,
): { language: string; country: string } | { error: string } {
  const languageRaw = body.language ? String(body.language).trim() : 'en';
  const language = languageRaw.toLowerCase();
  if (!/^[a-z]{2}$/.test(language)) {
    return { error: 'language must be a 2-letter language code' };
  }

  const countryRaw = body.country ? String(body.country).trim() : 'any';
  let country: string;
  if (countryRaw.toLowerCase() === 'any') {
    country = 'any';
  } else if (/^[a-z]{2}$/i.test(countryRaw)) {
    country = countryRaw.toUpperCase();
  } else {
    return { error: 'country must be "any" or a 2-letter ISO country code' };
  }

  return { language, country };
}
export async function GET() {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ keywords: [], total: 0 });
  }
  const { data, error } = await supabase
    .from('media_keywords')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[media-monitoring] keywords GET error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    keywords: (data ?? []) as MediaKeyword[],
    total: data?.length ?? 0,
  });
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
    const keyword = String(body.keyword ?? '').trim();
    if (!keyword) {
      return NextResponse.json({ error: 'Missing keyword' }, { status: 400 });
    }
    const langCountry = parseLanguageAndCountry(body);
    if ('error' in langCountry) {
      return NextResponse.json({ error: langCountry.error }, { status: 400 });
    }
    const row = {
      keyword,
      label: body.label ? String(body.label).slice(0, 200) : null,
      category: body.category ? String(body.category).slice(0, 60) : 'general',
      language: langCountry.language,
      country: langCountry.country,
      is_active: body.is_active !== false,
    };
    const { data, error } = await supabase
      .from('media_keywords')
      .insert(row)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ keyword: data });
  } catch (err) {
    console.error('[media-monitoring] keywords POST error', err);
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
    if (typeof body.label === 'string') patch.label = body.label.slice(0, 200);
    if (typeof body.category === 'string') patch.category = body.category.slice(0, 60);
    const { error } = await supabase
      .from('media_keywords')
      .update(patch)
      .eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[media-monitoring] keywords PATCH error', err);
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
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase.from('media_keywords').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
