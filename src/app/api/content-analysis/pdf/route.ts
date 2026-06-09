// ---------------------------------------------------------------------------
// Serve a cached EUR-Lex PDF back to the browser.
//
// GET /api/content-analysis/pdf?celex=32021R1119
//   → returns the bytes cached by the /ingest route, with
//     `Content-Type: application/pdf` so react-pdf / <iframe> can render it
//     without a CORS dance. 404 if the document has not been ingested yet.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getDurablePdf } from '@/lib/content-analysis/pdf-durable-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_DIR = path.join(process.cwd(), '.cache', 'content-analysis');

function pdfResponse(bytes: Buffer): NextResponse {
  // Copy into a plain Uint8Array (backed by a real ArrayBuffer) so the body is
  // an unambiguous `BodyInit` — Node's `Buffer<ArrayBufferLike>` doesn't
  // satisfy the DOM body types because its backing buffer could in theory be a
  // SharedArrayBuffer.
  const body = new Uint8Array(bytes);
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(body.byteLength),
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

export async function GET(req: NextRequest) {
  const celexRaw = req.nextUrl.searchParams.get('celex');
  if (!celexRaw) {
    return NextResponse.json({ error: 'missing celex' }, { status: 400 });
  }
  const celex = celexRaw.trim().toUpperCase();
  if (!/^[0-9A-Z]{8,20}$/.test(celex)) {
    return NextResponse.json({ error: 'invalid celex format' }, { status: 400 });
  }
  const pdfPath = path.join(CACHE_DIR, `${celex}.pdf`);
  try {
    const bytes = await fs.readFile(pdfPath);
    return pdfResponse(bytes);
  } catch {
    // Local `.cache` miss — on Vercel this is the common case, because the
    // instance that ingested the PDF has since been recycled. Fall back to the
    // durable Supabase copy written at ingest time, and warm the local cache so
    // subsequent hits on this instance stay fast.
    const durable = await getDurablePdf(celex);
    if (durable) {
      try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
        await fs.writeFile(pdfPath, durable);
      } catch {
        /* warming is best-effort */
      }
      return pdfResponse(durable);
    }
    return NextResponse.json(
      { error: 'pdf not in cache — run /api/content-analysis/ingest first' },
      { status: 404 },
    );
  }
}
