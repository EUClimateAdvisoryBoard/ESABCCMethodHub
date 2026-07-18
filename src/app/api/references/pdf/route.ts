import { NextRequest, NextResponse } from 'next/server';
import { listRefs } from '@/lib/references/custom-store';

/**
 * PDF proxy route — M·01.
 * -----------------------
 * GET /api/references/pdf?id=<reference_id>
 * -----------------------------------------
 * Streams the PDF bytes for a stored reference without exposing the
 * underlying storage URL. Required because:
 *
 *   - Supabase Storage URLs carry short-lived signatures that
 *     `pdfjs-dist` can't refresh on its own.
 *   - The Word add-in needs a stable, cookie-authenticated URL it
 *     can embed in `<iframe>` without CORS dance.
 *   - EEA-hosted production swaps out to S3 / MinIO; the proxy
 *     shape hides that swap from all callers.
 *
 * Response is `application/pdf` with `Cache-Control: private, max-age=60`.
 */
// pdfjs (used by the annotation viewer) fetches the PDF via XHR/fetch and
// therefore needs CORS headers from the origin.  The Supabase public bucket
// does not always send those headers in the way pdfjs wants, so we proxy
// the file through this same-origin route instead.  The route looks up the
// reference by id, validates that the stored pdfUrl belongs to a known host
// (so this can't be turned into an open SSRF gateway), then streams the
// upstream response back with PDF content-type and a long cache header.
// ---------------------------------------------------------------------------

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Allow-list of upstream hosts we will fetch from.  Anything else is rejected.
const ALLOWED_HOSTS = [
  'supabase.co',
  'supabase.in',
];

function isAllowedHost(url: string): boolean {
  try {
    const u = new URL(url);
    return ALLOWED_HOSTS.some(h => u.hostname === h || u.hostname.endsWith('.' + h));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  // `listRefs()` reads the custom-references table directly. (An earlier,
  // synchronous `getStore()` accessor was a deprecated stub that always
  // returned an empty array, 404-ing on every server-stored reference; it
  // and the other GitHub-era stubs were removed from custom-store.ts once
  // every call site had migrated to `listRefs()` — WP-01.)
  const store = await listRefs();
  const ref = store.find(r => r.id === id);
  if (!ref) {
    return NextResponse.json({ error: 'Reference not found' }, { status: 404 });
  }
  if (!ref.pdfUrl) {
    return NextResponse.json({ error: 'No PDF for this reference' }, { status: 404 });
  }
  // Same-origin paths (PDFs committed under public/reference-pdfs/ by
  // scripts/fetch-reference-pdfs.mjs) don't need proxying at all — the file
  // is already served from our own origin, so just redirect to it.
  if (ref.pdfUrl.startsWith('/')) {
    return NextResponse.redirect(new URL(ref.pdfUrl, request.nextUrl.origin), 302);
  }
  if (!isAllowedHost(ref.pdfUrl)) {
    return NextResponse.json(
      { error: 'PDF host not allowed', host: new URL(ref.pdfUrl).hostname },
      { status: 400 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(ref.pdfUrl, {
      cache: 'no-store',
      redirect: 'follow',
      headers: {
        // Some object stores sniff the UA and reject unknown clients
        'User-Agent': 'ESABCC-ReferenceManager/1.0',
        Accept: 'application/pdf,*/*;q=0.8',
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Upstream fetch threw',
        detail: err instanceof Error ? err.message : String(err),
        url: ref.pdfUrl,
      },
      { status: 502 }
    );
  }

  if (!upstream.ok || !upstream.body) {
    const body = await upstream.text().catch(() => '');
    return NextResponse.json(
      {
        error: `Upstream HTTP ${upstream.status}`,
        url: ref.pdfUrl,
        body: body.slice(0, 300),
      },
      { status: 502 }
    );
  }

  // Buffer the body so the response is fully self-contained.  Streaming a
  // ReadableStream straight through Vercel's runtime occasionally truncates
  // PDFs, and they aren't large enough for buffering to be a problem.
  const buf = await upstream.arrayBuffer();

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(buf.byteLength),
      'Content-Disposition': `inline; filename="${id}.pdf"`,
      'Cache-Control': 'private, max-age=300',
      // Be explicit about CORS even though we're same-origin so the file is
      // also usable from other contexts (e.g. opening in a new tab).
      'Access-Control-Allow-Origin': '*',
    },
  });
}
