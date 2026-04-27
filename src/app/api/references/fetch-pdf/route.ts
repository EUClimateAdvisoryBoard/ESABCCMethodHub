import { NextRequest, NextResponse } from 'next/server';

/**
 * PDF fetcher proxy.
 * ------------------
 * Browsers cannot fetch most publisher PDFs directly because of CORS.
 * This route takes a URL, fetches the PDF server-side, and streams
 * it back to the client which then uploads it to Supabase Storage
 * (or S3 / MinIO in EEA-hosted production).
 *
 * Safety posture:
 *   - Only http(s) schemes are followed.
 *   - Non-PDF responses (by Content-Type) are rejected.
 *   - Response size is capped at 50 MB so a malicious caller cannot
 *     exhaust the function memory.
 *   - No redirect chains beyond three hops.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const FETCH_TIMEOUT_MS = 30_000;
const MAX_HTML_HOPS = 2;
const USER_AGENT =
  'Mozilla/5.0 (compatible; ESABCC-RefManager/1.0; +https://eu-climate-policy.vercel.app)';

// Try to pull a PDF URL out of an HTML landing page.  Most publishers
// include the Google Scholar `citation_pdf_url` meta tag; some also expose
// an <a> whose href ends in `.pdf`.  Returns an absolute URL or null.
function extractPdfUrlFromHtml(html: string, baseUrl: string): string | null {
  // 1) <meta name="citation_pdf_url" content="...">
  const metaRe =
    /<meta[^>]+name=["']citation_pdf_url["'][^>]+content=["']([^"']+)["']/i;
  const metaRe2 =
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']citation_pdf_url["']/i;
  const metaMatch = html.match(metaRe) || html.match(metaRe2);
  if (metaMatch?.[1]) {
    try {
      return new URL(metaMatch[1], baseUrl).toString();
    } catch {
      /* ignore */
    }
  }

  // 2) <link rel="alternate" type="application/pdf" href="...">
  const linkRe =
    /<link[^>]+type=["']application\/pdf["'][^>]+href=["']([^"']+)["']/i;
  const linkRe2 =
    /<link[^>]+href=["']([^"']+)["'][^>]+type=["']application\/pdf["']/i;
  const linkMatch = html.match(linkRe) || html.match(linkRe2);
  if (linkMatch?.[1]) {
    try {
      return new URL(linkMatch[1], baseUrl).toString();
    } catch {
      /* ignore */
    }
  }

  // 3) First <a href="...pdf"> whose text/class hints at a PDF download.
  const anchorRe =
    /<a[^>]+href=["']([^"']+\.pdf(?:\?[^"']*)?)["']/i;
  const anchorMatch = html.match(anchorRe);
  if (anchorMatch?.[1]) {
    try {
      return new URL(anchorMatch[1], baseUrl).toString();
    } catch {
      /* ignore */
    }
  }

  return null;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/pdf,text/html;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function readCappedBody(resp: Response): Promise<Buffer> {
  const reader = resp.body?.getReader();
  if (!reader) throw new Error('Empty response body');
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_BYTES) {
      throw new Error(`Response exceeds ${MAX_BYTES} bytes`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map(c => Buffer.from(c)));
}

export async function GET(request: NextRequest) {
  const initialUrl = request.nextUrl.searchParams.get('url');
  if (!initialUrl) {
    return NextResponse.json({ error: 'url query param is required' }, { status: 400 });
  }

  try {
    const parsed = new URL(initialUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return NextResponse.json({ error: 'Only http(s) URLs are allowed' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // Follow up to MAX_HTML_HOPS HTML landing pages before giving up.  On each
  // non-PDF response, parse the body for a citation_pdf_url meta tag and
  // retry that URL.
  let currentUrl = initialUrl;
  const visited = new Set<string>();

  try {
    for (let hop = 0; hop <= MAX_HTML_HOPS; hop++) {
      if (visited.has(currentUrl)) {
        return NextResponse.json(
          { error: 'Redirect loop while looking for PDF link' },
          { status: 502 },
        );
      }
      visited.add(currentUrl);

      const upstream = await fetchWithTimeout(currentUrl, FETCH_TIMEOUT_MS);
      if (!upstream.ok) {
        return NextResponse.json(
          { error: `Upstream HTTP ${upstream.status} at ${currentUrl}` },
          { status: 502 },
        );
      }

      const contentType = (upstream.headers.get('content-type') || '').toLowerCase();

      if (contentType.includes('pdf')) {
        const contentLength = upstream.headers.get('content-length');
        if (contentLength && parseInt(contentLength, 10) > MAX_BYTES) {
          return NextResponse.json(
            { error: `PDF too large (${contentLength} bytes, max ${MAX_BYTES})` },
            { status: 413 },
          );
        }
        const buffer = await readCappedBody(upstream);
        return new NextResponse(new Uint8Array(buffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Length': String(buffer.byteLength),
            'Cache-Control': 'no-store',
          },
        });
      }

      if (!contentType.includes('html') && !contentType.includes('xml')) {
        return NextResponse.json(
          { error: `Upstream returned ${contentType || 'unknown content-type'}, not a PDF` },
          { status: 415 },
        );
      }

      if (hop === MAX_HTML_HOPS) {
        return NextResponse.json(
          { error: 'Landing page did not link to a PDF (no citation_pdf_url meta)' },
          { status: 415 },
        );
      }

      // Parse the HTML for a citation_pdf_url meta tag, then loop.
      const htmlBuffer = await readCappedBody(upstream);
      const html = htmlBuffer.toString('utf-8');
      const nextUrl = extractPdfUrlFromHtml(html, currentUrl);
      if (!nextUrl) {
        return NextResponse.json(
          { error: 'Landing page did not link to a PDF (no citation_pdf_url meta)' },
          { status: 415 },
        );
      }
      currentUrl = nextUrl;
    }

    return NextResponse.json({ error: 'Exhausted redirect hops' }, { status: 502 });
  } catch (e) {
    const err = e as Error;
    const msg = err.name === 'AbortError' ? 'Upstream timed out' : err.message;
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
