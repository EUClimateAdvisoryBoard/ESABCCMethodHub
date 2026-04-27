import { NextRequest, NextResponse } from 'next/server';

/**
 * Electricity Maps API proxy.
 *
 * Proxies to the pypsa-service which holds the Electricity Maps auth token
 * server-side (never exposed to the browser). See
 * https://api-portal.electricitymaps.com/ for the API schema.
 *
 *   GET /api/electricity-maps?kind=zones
 *   GET /api/electricity-maps?kind=ci-latest&zone=DE
 *   GET /api/electricity-maps?kind=ci-history&zone=DE
 *   GET /api/electricity-maps?kind=power-latest&zone=DE
 *   GET /api/electricity-maps?kind=power-history&zone=DE
 *
 * As an optional convenience, if the pypsa-service is unreachable but
 * `ELECTRICITY_MAPS_TOKEN` is set in the Next.js runtime, we fall back to
 * talking to the Electricity Maps API directly from the Next.js server.
 */

const SERVICE_URL = process.env.PYPSA_SERVICE_URL || 'http://localhost:8001';
const DIRECT_TOKEN = process.env.ELECTRICITY_MAPS_TOKEN;
const EM_API = 'https://api.electricitymaps.com/v3';
const TIMEOUT_MS = 20_000;

const PATHS: Record<string, string> = {
  zones: '/electricity-maps/zones',
  'ci-latest': '/electricity-maps/carbon-intensity/latest',
  'ci-history': '/electricity-maps/carbon-intensity/history',
  'power-latest': '/electricity-maps/power-breakdown/latest',
  'power-history': '/electricity-maps/power-breakdown/history',
};

const DIRECT_PATHS: Record<string, string> = {
  zones: '/zones',
  'ci-latest': '/carbon-intensity/latest',
  'ci-history': '/carbon-intensity/history',
  'power-latest': '/power-breakdown/latest',
  'power-history': '/power-breakdown/history',
};

async function fetchWithTimeout(url: string, init?: RequestInit) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(tid);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get('kind') || 'ci-latest';
  const zone = searchParams.get('zone') || 'DE';

  if (!PATHS[kind]) {
    return NextResponse.json({ error: `unknown kind: ${kind}` }, { status: 400 });
  }

  // Try the pypsa-service passthrough first (keeps token server-side)
  try {
    const query = kind === 'zones' ? '' : `?zone=${encodeURIComponent(zone)}`;
    const r = await fetchWithTimeout(`${SERVICE_URL}${PATHS[kind]}${query}`);
    const text = await r.text();
    return new NextResponse(text, {
      status: r.status,
      headers: { 'content-type': 'application/json' },
    });
  } catch {
    // fall through
  }

  // Direct fallback if the Next.js runtime has a token
  if (DIRECT_TOKEN) {
    try {
      const query =
        kind === 'zones' ? '' : `?zone=${encodeURIComponent(zone)}`;
      const r = await fetchWithTimeout(`${EM_API}${DIRECT_PATHS[kind]}${query}`, {
        headers: { 'auth-token': DIRECT_TOKEN, accept: 'application/json' },
      });
      const text = await r.text();
      return new NextResponse(text, {
        status: r.status,
        headers: { 'content-type': 'application/json' },
      });
    } catch (err) {
      return NextResponse.json(
        { error: 'Electricity Maps unreachable', detail: (err as Error).message },
        { status: 503 },
      );
    }
  }

  return NextResponse.json(
    {
      error: 'pypsa-service unreachable and ELECTRICITY_MAPS_TOKEN not set',
      hint:
        'Either start the pypsa-service backend, or set ' +
        'ELECTRICITY_MAPS_TOKEN in your Next.js environment (free tier at ' +
        'https://api-portal.electricitymaps.com/).',
    },
    { status: 503 },
  );
}
