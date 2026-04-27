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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_DIR = path.join(process.cwd(), '.cache', 'content-analysis');

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
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'pdf not in cache — run /api/content-analysis/ingest first' },
      { status: 404 },
    );
  }
}
