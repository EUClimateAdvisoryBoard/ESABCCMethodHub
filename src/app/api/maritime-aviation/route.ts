import { NextRequest, NextResponse } from 'next/server';

/**
 * Maritime & Aviation Bunker API
 *
 * Proxies to the pypsa-service `/maritime-aviation/*` endpoints which solve a
 * small fuel-route LP (least-cost fuel mix subject to a carbon-intensity
 * target) and return MAC-curve data comparing shipping & aviation bunkers
 * against other sectors.
 *
 *   POST /api/maritime-aviation              → optimize + MAC
 *   POST /api/maritime-aviation?kind=report  → PDF report (binary)
 *   GET  /api/maritime-aviation              → sector comparison MAC curves
 */

const SERVICE_URL =
  process.env.PYPSA_SERVICE_URL || 'http://localhost:8001';
const TIMEOUT_MS = 60_000;

async function fetchWithTimeout(url: string, init?: RequestInit) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(tid);
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get('kind') || 'run';
  const path =
    kind === 'report'
      ? '/maritime-aviation/report'
      : '/maritime-aviation/run';

  try {
    const r = await fetchWithTimeout(`${SERVICE_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (kind === 'report') {
      if (!r.ok) {
        const text = await r.text();
        return NextResponse.json({ error: text }, { status: r.status });
      }
      const blob = await r.arrayBuffer();
      return new NextResponse(blob, {
        status: 200,
        headers: {
          'content-type': 'application/pdf',
          'content-disposition':
            'attachment; filename="maritime_aviation_bunker.pdf"',
        },
      });
    }

    const text = await r.text();
    return new NextResponse(text, {
      status: r.status,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'pypsa-service unreachable',
        detail: (err as Error).message,
        hint:
          'Start the Python service with `uvicorn app.main:app --port 8001` ' +
          'from the pypsa-service/ directory, or set PYPSA_SERVICE_URL.',
      },
      { status: 503 },
    );
  }
}

export async function GET() {
  try {
    const r = await fetchWithTimeout(`${SERVICE_URL}/maritime-aviation/mac-curve`);
    const text = await r.text();
    return new NextResponse(text, {
      status: r.status,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'pypsa-service unreachable', detail: (err as Error).message },
      { status: 503 },
    );
  }
}
