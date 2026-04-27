import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/link-preview?url=<encoded-url>
 *
 * Fetches the HTML of a given URL and extracts Open Graph / meta-tag
 * metadata so the front-end can render a rich link preview card.
 *
 * Returns: { title, description, image, siteName, url }
 */

const ALLOWED_PROTOCOLS = ['http:', 'https:'];
const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 200_000; // only read first ~200 KB

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url');
  if (!rawUrl) {
    return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    return NextResponse.json({ error: 'Only http/https URLs are supported' }, { status: 400 });
  }

  // Block private / loopback IPs to prevent SSRF
  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    host.startsWith('172.') ||
    host.endsWith('.local')
  ) {
    return NextResponse.json({ error: 'Private URLs are not allowed' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
        Accept: 'text/html, application/xhtml+xml',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status}` },
        { status: 502 },
      );
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return NextResponse.json({ error: 'URL did not return HTML' }, { status: 422 });
    }

    // Read a limited amount of HTML (metadata is always in <head>)
    const reader = res.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: 'Empty response body' }, { status: 502 });
    }

    let html = '';
    let bytesRead = 0;
    const decoder = new TextDecoder();
    while (bytesRead < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      bytesRead += value.byteLength;
      // Stop early once we've passed </head>
      if (html.includes('</head>') || html.includes('</HEAD>')) break;
    }
    reader.cancel();

    const meta = extractMeta(html, rawUrl);

    return NextResponse.json(meta, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

// ── Metadata extraction ──────────────────────────────────────────────────────

interface LinkMeta {
  title: string;
  description: string;
  image: string;
  siteName: string;
  url: string;
}

function getMetaContent(html: string, property: string): string {
  // Match both property="..." and name="..." attributes
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escapeRegex(property)}["'][^>]+content=["']([^"']*?)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*?)["'][^>]+(?:property|name)=["']${escapeRegex(property)}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeHtmlEntities(m[1].trim());
  }
  return '';
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function extractMeta(html: string, originalUrl: string): LinkMeta {
  const ogTitle = getMetaContent(html, 'og:title');
  const ogDesc = getMetaContent(html, 'og:description');
  const ogImage = getMetaContent(html, 'og:image');
  const ogSiteName = getMetaContent(html, 'og:site_name');
  const ogUrl = getMetaContent(html, 'og:url');

  // Fallbacks: twitter cards, standard meta, <title>
  const twitterTitle = getMetaContent(html, 'twitter:title');
  const twitterDesc = getMetaContent(html, 'twitter:description');
  const twitterImage = getMetaContent(html, 'twitter:image');

  const metaDesc = getMetaContent(html, 'description');

  let titleTag = '';
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch?.[1]) titleTag = decodeHtmlEntities(titleMatch[1].trim());

  const title = ogTitle || twitterTitle || titleTag;
  const description = ogDesc || twitterDesc || metaDesc;
  let image = ogImage || twitterImage;

  // Resolve relative image URLs
  if (image && !image.startsWith('http')) {
    try {
      image = new URL(image, originalUrl).href;
    } catch {
      image = '';
    }
  }

  // Derive site name from hostname if not provided
  let siteName = ogSiteName;
  if (!siteName) {
    try {
      siteName = new URL(originalUrl).hostname.replace(/^www\./, '');
    } catch {
      siteName = '';
    }
  }

  return {
    title,
    description,
    image,
    siteName,
    url: ogUrl || originalUrl,
  };
}
