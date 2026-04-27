import { NextRequest, NextResponse } from 'next/server';

/**
 * Energy System Optimization API
 *
 * Proxies requests to the Python FastAPI service (`pypsa-service`) which
 * runs a simplified PyPSA-style linear programme in the background. The
 * Python service URL is read from the `PYPSA_SERVICE_URL` environment
 * variable (default `http://localhost:8001`).
 *
 * Endpoints:
 *   POST /api/energy-optimization                     → enqueue job, returns {job_id}
 *   GET  /api/energy-optimization?job=<id>            → job status + progress
 *   GET  /api/energy-optimization?job=<id>&kind=result → optimization result JSON
 *   GET  /api/energy-optimization?job=<id>&kind=report → PDF report (binary)
 *
 * If the Python service is unreachable we return a 503 with a descriptive
 * error so the UI can display a fallback message.
 */

// Production: set PYPSA_SERVICE_URL in Vercel/Netlify env vars to a hosted
// backend (e.g. https://<user>-eu-climate-policy-pypsa.hf.space on Hugging
// Face Spaces). Dev: falls back to a local uvicorn on port 8001.
const SERVICE_URL =
  process.env.PYPSA_SERVICE_URL || 'http://localhost:8001';
const TIMEOUT_MS = 180_000;

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

  try {
    const r = await fetchWithTimeout(`${SERVICE_URL}/energy-system/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    if (!r.ok) {
      return NextResponse.json(
        { error: 'pypsa-service rejected the request', detail: text },
        { status: r.status },
      );
    }
    return new NextResponse(text, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'pypsa-service unreachable',
        detail: (err as Error).message,
        service_url: SERVICE_URL,
        hint:
          'The PyPSA backend is offline. Deploy pypsa-service/ to a free ' +
          'Docker host (Hugging Face Spaces, Fly.io, Render) and set ' +
          'PYPSA_SERVICE_URL to the deployed URL. For local dev, run ' +
          '`uvicorn app.main:app --port 8001` in pypsa-service/.',
      },
      { status: 503 },
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('job');
  const kind = searchParams.get('kind') || 'status';

  if (!jobId) {
    // Health check passthrough
    try {
      const r = await fetchWithTimeout(`${SERVICE_URL}/health`);
      const body = await r.json();
      return NextResponse.json(body);
    } catch (err) {
      return NextResponse.json(
        { status: 'unreachable', detail: (err as Error).message },
        { status: 503 },
      );
    }
  }

  const path =
    kind === 'result'
      ? `/energy-system/result/${jobId}`
      : kind === 'report'
        ? `/energy-system/report/${jobId}`
        : `/energy-system/status/${jobId}`;

  try {
    const r = await fetchWithTimeout(`${SERVICE_URL}${path}`);
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
          'content-disposition': `attachment; filename="energy_system_${jobId.slice(0, 8)}.pdf"`,
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
      { error: 'pypsa-service unreachable', detail: (err as Error).message },
      { status: 503 },
    );
  }
}
