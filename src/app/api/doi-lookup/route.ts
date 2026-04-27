import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const doi = request.nextUrl.searchParams.get('doi');

  if (!doi) {
    return NextResponse.json({ error: 'DOI parameter is required' }, { status: 400 });
  }

  const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//, '').trim();

  if (!cleanDoi) {
    return NextResponse.json({ error: 'Invalid DOI' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'EU-Climate-Policy-Hub/1.0 (mailto:secretariat@esabcc.europa.eu)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'DOI not found in CrossRef' }, { status: 404 });
      }
      return NextResponse.json(
        { error: `CrossRef API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const work = data.message;

    const authors = (work.author || [])
      .map((a: { family?: string; given?: string; name?: string }) => {
        if (a.family && a.given) return `${a.family}, ${a.given.charAt(0)}.`;
        if (a.family) return a.family;
        return a.name || 'Unknown';
      })
      .join(', ');

    const authorsShort =
      (work.author || []).length > 3
        ? (() => {
            const first = work.author[0];
            const name = first.family
              ? `${first.family}, ${(first.given || '').charAt(0)}.`
              : first.name || 'Unknown';
            return `${name}, et al.`;
          })()
        : authors;

    const title =
      work.title && work.title.length > 0 ? work.title[0] : 'Untitled';

    const journal =
      work['container-title'] && work['container-title'].length > 0
        ? work['container-title'][0]
        : null;

    const publishedParts =
      work['published-print']?.['date-parts']?.[0] ||
      work['published-online']?.['date-parts']?.[0] ||
      work['created']?.['date-parts']?.[0] ||
      [];
    const year = publishedParts[0] ? String(publishedParts[0]) : 'n.d.';

    const volume = work.volume || null;
    const issue = work.issue || null;
    const pages = work.page || null;
    const url = work.URL || null;

    let type: 'article' | 'report' | 'web' | 'chapter' | 'legislation' | 'book' = 'article';
    if (work.type === 'book') type = 'book';
    else if (work.type === 'book-chapter' || work.type === 'book-section') type = 'chapter';
    else if (work.type === 'report') type = 'report';
    else if (work.type === 'dataset' || work.type === 'posted-content') type = 'web';

    return NextResponse.json({
      doi: cleanDoi,
      authors: authorsShort,
      authorsLong: authors,
      year,
      title,
      journal,
      volume,
      issue,
      pages,
      url,
      type,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('timeout') || message.includes('abort')) {
      return NextResponse.json({ error: 'CrossRef API request timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: `Failed to fetch DOI: ${message}` }, { status: 500 });
  }
}
