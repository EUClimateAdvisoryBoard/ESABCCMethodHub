/**
 * GET /api/similar-papers?query=…
 * -------------------------------
 * "Find similar references" feature for M·01. Given a free-text
 * query (typically a title or an abstract snippet), returns up to
 * ten semantically related papers.
 *
 * Strategy:
 *   1. Try Semantic Scholar — free, no API key, rate-limited to
 *      100 req / 5 min / IP. Uses the /paper/search endpoint.
 *   2. Fall back to a tokenised local search over the bundled
 *      `@/data/references` corpus when Semantic Scholar is
 *      unreachable or rate-limited.
 *
 * No user data is sent — only the query string.
 */
import { NextRequest, NextResponse } from 'next/server';
import { references } from '@/data/references';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query') || '';
  const paperId = request.nextUrl.searchParams.get('paperId') || '';
  const mode = request.nextUrl.searchParams.get('mode') || 'search'; // 'search' | 'recommendations'
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '10'), 20);

  if (!query && !paperId) {
    return NextResponse.json({ error: 'Either query or paperId parameter is required' }, { status: 400 });
  }

  // Try Semantic Scholar first, fall back to local search
  try {
    const result = await searchSemanticScholar(query, paperId, mode, limit);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch {
    // Semantic Scholar unreachable — use local reference library fallback
    const localResults = searchLocalLibrary(query || paperId, limit);
    return NextResponse.json({
      mode: 'local-fallback',
      total: localResults.length,
      papers: localResults,
      notice: 'Results from local ESABCC reference library (external API unavailable)',
    }, {
      headers: { 'Cache-Control': 'no-cache' },
    });
  }
}

async function searchSemanticScholar(query: string, paperId: string, mode: string, limit: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    let results;

    if (mode === 'recommendations' && paperId) {
      const resp = await fetch(
        `https://api.semanticscholar.org/recommendations/v1/papers/forpaper/${encodeURIComponent(paperId)}?limit=${limit}&fields=title,authors,year,abstract,externalIds,journal,citationCount,url`,
        { headers: { 'Accept': 'application/json' }, signal: controller.signal }
      );
      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      const data = await resp.json();
      results = (data.recommendedPapers || []).map(formatPaper);
    } else {
      const searchQuery = query.replace(/[^\w\s-]/g, ' ').trim();
      const resp = await fetch(
        `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(searchQuery)}&limit=${limit}&fields=title,authors,year,abstract,externalIds,journal,citationCount,url`,
        { headers: { 'Accept': 'application/json' }, signal: controller.signal }
      );
      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      const data = await resp.json();
      results = (data.data || []).map(formatPaper);
    }

    return { mode, total: results.length, papers: results };
  } finally {
    clearTimeout(timeout);
  }
}

function searchLocalLibrary(query: string, limit: number) {
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (terms.length === 0) return [];

  // Score each reference by how many query terms match in title, authors, journal
  const scored = references.map(ref => {
    const text = `${ref.title} ${ref.authors} ${ref.journal || ''} ${ref.tags?.join(' ') || ''}`.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (text.includes(term)) score += 1;
      // Boost exact title matches
      if (ref.title.toLowerCase().includes(term)) score += 0.5;
    }
    return { ref, score };
  }).filter(s => s.score > 0);

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ ref }) => ({
    id: ref.id,
    title: ref.title,
    authors: ref.authors,
    authorsAll: [ref.authors],
    year: ref.year ? parseInt(ref.year) : null,
    abstract: null,
    doi: ref.doi,
    journal: ref.journal,
    citationCount: 0,
    url: ref.url || (ref.doi ? `https://doi.org/${ref.doi}` : null),
    semanticScholarId: null,
    source: 'local-library',
  }));
}

interface S2Paper {
  paperId?: string;
  title?: string;
  authors?: { name: string }[];
  year?: number;
  abstract?: string;
  externalIds?: { DOI?: string; ArXiv?: string };
  journal?: { name?: string; volume?: string; pages?: string };
  citationCount?: number;
  url?: string;
}

function formatPaper(paper: S2Paper) {
  const authors = (paper.authors || []).map(a => a.name);
  const authorsShort = authors.length > 3
    ? `${authors[0]}, et al.`
    : authors.join(', ');

  return {
    id: paper.paperId || '',
    title: paper.title || 'Untitled',
    authors: authorsShort,
    authorsAll: authors,
    year: paper.year || null,
    abstract: paper.abstract || null,
    doi: paper.externalIds?.DOI || null,
    journal: paper.journal?.name || null,
    citationCount: paper.citationCount || 0,
    url: paper.url || null,
    semanticScholarId: paper.paperId || null,
  };
}
