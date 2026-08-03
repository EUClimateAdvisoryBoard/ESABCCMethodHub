import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { authoriseMediaMutation } from '@/lib/media-auth';
import { parseNewtonWorkbook } from '@/lib/media-newton-import';
import { clusterArticle } from '@/lib/media-clustering';
import { canonicaliseUrl, resolveOutletByDomain } from '@/lib/media-monitoring';

/**
 * Upload a weekly Newton Media .xlsx export into the coverage pool.
 *
 * Rows are parsed, clustered (reports / board members / country) and upserted
 * into `media_articles` with `discovery_source = 'newton'`, so they sit
 * alongside feed coverage and every dashboard lens spans both.
 *
 * The upload is idempotent: re-uploading an overlapping export updates the
 * existing rows rather than duplicating them. Weekly exports routinely repeat
 * the previous week's tail, so this is the normal case, not an edge case.
 */

// Newton exports run to a few MB; the default body limit is too small.
export const maxDuration = 300;

/** Guard against a mis-selected file exhausting server memory. */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const auth = await authoriseMediaMutation(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error ?? 'Unauthorized.' },
      { status: auth.status ?? 401 },
    );
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase not configured on server' },
      { status: 500 },
    );
  }

  let filename = 'upload.xlsx';
  try {
    const form = await request.formData();
    const file = form.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    filename = file.name || filename;

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `File is too large (limit ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).` },
        { status: 413 },
      );
    }
    if (!/\.xlsx?$/i.test(filename)) {
      return NextResponse.json(
        { error: 'Expected a .xlsx file exported from Newton Media.' },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    const parsed = await parseNewtonWorkbook(buffer);

    if (parsed.articles.length === 0) {
      // Distinguish "wrong file" from "empty week": report the headers we
      // actually found so a format change is diagnosable from the message.
      await supabase.from('media_imports').insert({
        filename,
        status: 'error',
        rows_total: parsed.skipped.length,
        rows_skipped: parsed.skipped.length,
        diagnostics: { headers: parsed.headers, skipped: parsed.skipped.slice(0, 50) },
        error_message: 'No usable rows found',
      });
      return NextResponse.json(
        {
          error:
            'No usable rows found. Check this is a Newton Media export with a "Title" column.',
          headers_found: parsed.headers.filter(Boolean),
        },
        { status: 400 },
      );
    }

    // Resolve outlet ids in one batched query, as the feed path does.
    const domains = Array.from(
      new Set(parsed.articles.map((a) => a.outlet_domain).filter(Boolean) as string[]),
    );
    const outletIdByDomain = new Map<string, string>();
    if (domains.length > 0) {
      const { data: outletRows } = await supabase
        .from('media_outlets')
        .select('id,domain')
        .in('domain', domains);
      (outletRows ?? []).forEach((r: { id: string; domain: string }) => {
        outletIdByDomain.set(r.domain, r.id);
      });
    }

    const now = new Date().toISOString();
    const rows = parsed.articles.map((a) => {
      const cluster = clusterArticle({
        id: a.article_code,
        title: a.title,
        summary: a.summary,
        full_text: a.full_text,
        country: a.country,
        outlet_domain: a.outlet_domain,
        matched_keywords: [],
      });

      const outlet = a.outlet_domain ? resolveOutletByDomain(a.outlet_domain) : null;

      return {
        // Newton always exports a link; fall back to a stable synthetic URL
        // so the NOT NULL unique `url` column still has a usable value if a
        // future export omits one.
        url: a.url ?? `newton://${a.article_code}`,
        canonical_url: a.url ? canonicaliseUrl(a.url) : null,
        title: a.title.slice(0, 500),
        summary: a.summary,
        full_text: a.full_text,
        source_name: (a.source_name || a.outlet_domain || 'Newton Media').slice(0, 200),
        outlet_id: a.outlet_domain ? outletIdByDomain.get(a.outlet_domain) ?? null : null,
        outlet_domain: a.outlet_domain,
        published_at: a.published_at,
        language: a.language,
        country: cluster.country,
        author: a.author,
        sentiment: a.sentiment,
        // Newton's readership figure is per-article and more accurate than
        // the registry's outlet-level estimate, so prefer it and only fall
        // back when the export has no figure.
        estimated_reach:
          a.estimated_reach > 0 ? a.estimated_reach : outlet?.estimated_readership ?? 0,
        media_type: a.media_type,
        ave: a.ave,
        article_code: a.article_code || null,
        matched_report_slugs: cluster.report_slugs,
        matched_member_slugs: cluster.member_slugs,
        discovery_source: 'newton',
        clustered_at: now,
        fetched_at: now,
      };
    });

    // Count pre-existing rows so "new this week" is meaningful.
    const { count: existing } = await supabase
      .from('media_articles')
      .select('id', { count: 'exact', head: true })
      .in('url', rows.map((r) => r.url));

    const { error: upsertError } = await supabase
      .from('media_articles')
      .upsert(rows, { onConflict: 'url', ignoreDuplicates: false });

    if (upsertError) {
      await supabase.from('media_imports').insert({
        filename,
        status: 'error',
        rows_total: parsed.articles.length + parsed.skipped.length,
        rows_skipped: parsed.skipped.length,
        error_message: upsertError.message,
      });
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    const rowsNew = Math.max(rows.length - (existing ?? 0), 0);

    await supabase.from('media_imports').insert({
      filename,
      status: 'success',
      rows_total: parsed.articles.length + parsed.skipped.length,
      rows_imported: rows.length,
      rows_new: rowsNew,
      rows_skipped: parsed.skipped.length,
      diagnostics: { skipped: parsed.skipped.slice(0, 50) },
    });

    return NextResponse.json({
      success: true,
      filename,
      rows_imported: rows.length,
      rows_new: rowsNew,
      rows_skipped: parsed.skipped.length,
      skipped_reasons: parsed.skipped.slice(0, 20),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[media-monitoring] Newton import failed', err);
    await supabase
      .from('media_imports')
      .insert({ filename, status: 'error', error_message: message });
    return NextResponse.json({ error: `Import failed: ${message}` }, { status: 500 });
  }
}

/** Recent import history, for the upload panel. */
export async function GET() {
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ imports: [] });

  const { data, error } = await supabase
    .from('media_imports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ imports: data ?? [] });
}
