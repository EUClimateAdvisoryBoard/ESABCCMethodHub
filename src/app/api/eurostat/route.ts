import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side proxy for the Eurostat REST API.
 *
 * The Eurostat dissemination API does not emit CORS headers, so the
 * browser blocks direct fetches from PolicyGapExplorer. This route
 * forwards requests server-side and returns the JSON-stat payload.
 *
 * Query params: `dataset` identifies the Eurostat dataset code; every
 * other param is forwarded verbatim to
 * `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{dataset}`.
 */

const EUROSTAT_BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';
const DATASET_RE = /^[a-z0-9_]+$/i;

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const dataset = sp.get('dataset');

  if (!dataset || !DATASET_RE.test(dataset)) {
    return NextResponse.json({ error: 'Missing or invalid "dataset" parameter' }, { status: 400 });
  }

  const forwarded = new URLSearchParams();
  for (const [k, v] of sp.entries()) {
    if (k === 'dataset') continue;
    forwarded.append(k, v);
  }

  const upstream = `${EUROSTAT_BASE}/${dataset}?${forwarded.toString()}`;

  try {
    const res = await fetch(upstream, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Eurostat ${res.status}`, upstream: res.statusText },
        { status: res.status === 404 ? 404 : 502 },
      );
    }

    const json = await res.json();
    return NextResponse.json(json, {
      headers: { 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
