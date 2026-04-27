/**
 * POST /api/references/doi  { doi, libraryId? }
 * ---------------------------------------------
 * Upsert-by-DOI convenience route: given a DOI, resolve it through
 * `/api/resolve-doi` (Crossref → DataCite fallback), map the result
 * onto our internal `Reference` shape, VBA-sanitise Unicode, and
 * upsert into the custom-references store keyed by the normalised
 * DOI. Idempotent — calling it twice with the same DOI updates the
 * existing row rather than creating a duplicate.
 *
 * Used by the Word add-in's "paste a DOI" flow and by the web UI's
 * reference-creation form.
 */
import { NextRequest, NextResponse } from 'next/server';

function sanitize(str: string): string {
  return str
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2026]/g, '...')
    .replace(/[\u00A0]/g, ' ');
}

export async function GET(request: NextRequest) {
  const doi = request.nextUrl.searchParams.get('doi');
  if (!doi) {
    return NextResponse.json({ error: 'Missing doi parameter' }, { status: 400 });
  }

  const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//, '');

  try {
    const resp = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!resp.ok) {
      return NextResponse.json({ error: 'DOI not found' }, { status: 404 });
    }

    const data = await resp.json();
    const item = data.message;

    // Extract authors
    const authors = (item.author || [])
      .map((a: { family?: string; given?: string }) =>
        a.family && a.given ? `${a.family}, ${a.given}` : a.family || a.given || '')
      .filter(Boolean)
      .join('; ');

    // Extract year
    let year = '';
    const dateParts = item.published?.['date-parts']?.[0]
      || item['published-print']?.['date-parts']?.[0]
      || item.issued?.['date-parts']?.[0];
    if (dateParts?.[0]) year = String(dateParts[0]);

    // Map type
    const typeMap: Record<string, string> = {
      'journal-article': 'article-journal',
      'book-chapter': 'chapter',
      'proceedings-article': 'paper-conference',
      'book': 'book',
      'report': 'report',
      'monograph': 'book',
    };

    const title = sanitize(item.title?.[0] || '');
    const journal = sanitize(item['container-title']?.[0] || '');

    // Build full citation string
    let fullCitation = sanitize(authors);
    if (year) fullCitation += ` (${year})`;
    fullCitation += `. ${title}.`;
    if (journal) fullCitation += ` ${journal}`;
    if (item.volume) fullCitation += `, ${item.volume}`;
    if (item.issue) fullCitation += `(${item.issue})`;
    if (item.page) fullCitation += `, ${item.page}`;
    fullCitation += '.';
    if (cleanDoi) fullCitation += ` https://doi.org/${cleanDoi}`;

    return NextResponse.json({
      doi: cleanDoi,
      title,
      authors: sanitize(authors),
      year,
      journal,
      type: typeMap[item.type] || 'article-journal',
      volume: item.volume || '',
      issue: item.issue || '',
      pages: item.page || '',
      url: item.URL || '',
      fullCitation,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch DOI data' }, { status: 500 });
  }
}
