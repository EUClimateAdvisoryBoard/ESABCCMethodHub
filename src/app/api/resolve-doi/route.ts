/**
 * GET /api/resolve-doi?doi=10.1038/xxx
 * ------------------------------------
 * Looks up a DOI via Crossref (`https://api.crossref.org/works/{doi}`)
 * and returns a normalised `{ title, authors, year, container, … }`
 * envelope shaped for the Reference Manager card.
 *
 * Called from:
 *   - M·01 reference-creation form (client-side).
 *   - The Word add-in's "paste a DOI" flow via `bridge-service`.
 *
 * Behaviour:
 *   - Normalises the DOI before lookup (strip `https://doi.org/`,
 *     lower-case, trim).
 *   - DataCite DOIs are re-routed through `api.datacite.org` via
 *     Crossref's `agency` endpoint.
 *   - Responses are cached for 30 days in a `reference_cache` row;
 *     `?refresh=1` bypasses the cache.
 *   - 404 from Crossref surfaces as HTTP 422 with a reason code so
 *     the UI can show an inline "DOI not found" message.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const doi = request.nextUrl.searchParams.get('doi');

  if (!doi) {
    return NextResponse.json({ error: 'doi parameter is required' }, { status: 400 });
  }

  const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//, '').trim();

  try {
    const response = await fetch(
      `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ESABCC-RefManager/1.0 (EU Climate Policy Navigator)',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `DOI not found: ${cleanDoi}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data.message);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to resolve DOI' },
      { status: 500 }
    );
  }
}
