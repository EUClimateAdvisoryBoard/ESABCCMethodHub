import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { requireIngestSecret } from '@/lib/media-auth';
import {
  matchReportsFromKeywords,
  matchReportsInText,
} from '@/data/esabcc-reports';
import type { MediaKeyword } from '@/lib/media-monitoring';

/** Reject request bodies larger than this to keep the stored `raw` payload bounded. */
const MAX_BODY_BYTES = 200 * 1024;

/**
 * Ingest a LinkedIn (or other social) post into `media_social_posts`.
 *
 * Used by two callers:
 *   - The browser extension: on right-click "Send to ESABCC monitor" the
 *     content script reads the LinkedIn DOM (authenticated session) and
 *     POSTs the URL + visible post text here.
 *   - The "Add post manually" form on the Social Media tab: pastes URL
 *     + optional content for times the extension isn't handy (mobile,
 *     email summaries, etc.).
 *
 * Auth: fails closed. `MEDIA_MONITORING_SECRET` must be configured on the
 * server and supplied by the caller via an `Authorization: Bearer <secret>`
 * header, an `x-media-secret` header, or a `?secret=` query param (the
 * extension can't always set custom headers). Requests are rejected with
 * 503 when the secret isn't configured and 401 when it doesn't match — see
 * `requireIngestSecret` in src/lib/media-auth.ts.
 *
 * Body shape:
 *   {
 *     url:            string   required
 *     content?:       string   full post text
 *     author_name?:   string
 *     author_handle?: string   LinkedIn profile slug, no leading @
 *     author_profile_url?: string
 *     posted_at?:     string   ISO 8601
 *     platform?:      string   default 'linkedin'
 *   }
 * Request bodies over ~200KB are rejected with 413 (the full body is
 * stored verbatim in `media_social_posts.raw`).
 *
 * Response:
 *   { success: true, id, matched_keywords, matched_report_slugs }
 */
export async function POST(request: NextRequest) {
  const qsSecret = new URL(request.url).searchParams.get('secret');
  const auth = requireIngestSecret(request, qsSecret);
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

  let bodyText: string;
  try {
    bodyText = await request.text();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  if (Buffer.byteLength(bodyText, 'utf8') > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  const platform = typeof body.platform === 'string' ? body.platform : 'linkedin';
  const content = typeof body.content === 'string' ? body.content.slice(0, 10_000) : '';
  const authorName = typeof body.author_name === 'string' ? body.author_name.slice(0, 200) : null;
  const authorHandle = typeof body.author_handle === 'string'
    ? body.author_handle.replace(/^@/, '').slice(0, 200)
    : null;
  const authorProfileUrl = typeof body.author_profile_url === 'string'
    ? body.author_profile_url.slice(0, 500)
    : null;

  // Try to parse posted_at, accept ISO or "22h", "3d" style relative strings
  let postedAt: string | null = null;
  if (typeof body.posted_at === 'string' && body.posted_at) {
    const parsed = Date.parse(body.posted_at);
    if (Number.isFinite(parsed)) {
      postedAt = new Date(parsed).toISOString();
    } else {
      const rel = parseRelativeTime(body.posted_at);
      if (rel) postedAt = rel;
    }
  }

  // Attribute keywords by running the post text through active keywords
  const { data: kwRows } = await supabase
    .from('media_keywords')
    .select('id,keyword,label,category,language,country,is_active')
    .eq('is_active', true);
  const keywords = (kwRows ?? []) as MediaKeyword[];

  const fullText = `${content} ${url}`.toLowerCase();
  const matchedKws = keywords.filter((k) => fullText.includes(k.keyword.toLowerCase()));
  const matchedReports = Array.from(
    new Set([
      ...matchReportsFromKeywords(matchedKws.map((k) => k.keyword)),
      ...matchReportsInText(content),
    ]),
  );

  // Derive author handle from LinkedIn URL when not supplied
  const fallbackHandle = authorHandle ?? extractLinkedInAuthor(url);

  const row = {
    platform,
    post_url: url,
    external_id: extractLinkedInId(url),
    author_handle: fallbackHandle,
    author_name: authorName ?? fallbackHandle,
    author_profile_url: authorProfileUrl ?? (fallbackHandle ? `https://www.linkedin.com/in/${fallbackHandle}/` : null),
    source_id: null,
    content,
    excerpt: content.slice(0, 280),
    language: null,
    country: null,
    posted_at: postedAt,
    estimated_reach: 0,
    link_url: null,
    matched_keyword_ids: matchedKws.map((k) => k.id),
    matched_keywords: matchedKws.map((k) => k.keyword),
    matched_report_slugs: matchedReports,
    raw: body as unknown as Record<string, unknown>,
    fetched_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('media_social_posts')
    .upsert(row, { onConflict: 'post_url', ignoreDuplicates: false })
    .select()
    .single();

  if (error) {
    console.error('[media-monitoring] ingest error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    id: data?.id ?? null,
    matched_keywords: row.matched_keywords,
    matched_report_slugs: row.matched_report_slugs,
  });
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function extractLinkedInId(url: string): string | null {
  const m = url.match(/linkedin\.com\/(?:posts|pulse|feed\/update)\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : null;
}

function extractLinkedInAuthor(url: string): string | null {
  const postsMatch = url.match(/linkedin\.com\/posts\/([^/_?#]+)/i);
  if (postsMatch) return postsMatch[1].toLowerCase();
  const pulseMatch = url.match(/linkedin\.com\/pulse\/[^/?#]+?-([^/?#-]+)(?:-\d+)?(?:\?|#|$)/i);
  if (pulseMatch) return pulseMatch[1].toLowerCase();
  return null;
}

/** Parse LinkedIn-style relative timestamps: "22h", "3d", "2w", "1mo". */
function parseRelativeTime(s: string): string | null {
  const m = s.trim().match(/^(\d+)\s*(m|h|d|w|mo|y)\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const factor: Record<string, number> = {
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 7 * 86_400_000,
    mo: 30 * 86_400_000,
    y: 365 * 86_400_000,
  };
  const ms = factor[unit];
  if (!ms) return null;
  return new Date(Date.now() - n * ms).toISOString();
}

export async function OPTIONS() {
  // Allow cross-origin POSTs from the browser extension.
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
