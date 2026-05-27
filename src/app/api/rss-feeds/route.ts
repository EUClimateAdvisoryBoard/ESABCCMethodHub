/**
 * General RSS feed aggregator returning all EU institution news items.
 * Supports GET with optional ?source=, ?limit=, and ?offset= query parameters.
 */
import { NextRequest, NextResponse } from 'next/server';
import { fetchAllFeedItems } from '@/lib/rss-feeds';

export const revalidate = 3600; // Cache for 1 hour

/**
 * General RSS aggregator endpoint.
 * Returns ALL fetched EU institution news items (not filtered by climate keywords).
 *
 * Query params:
 *   ?source=European+Commission   - filter by source name
 *   ?limit=50                     - limit number of results (default: 100)
 *   ?offset=0                     - pagination offset
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sourceFilter = searchParams.get('source');
  const limit = Math.min(Number(searchParams.get('limit')) || 100, 500);
  const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);

  try {
    let rawItems = await fetchAllFeedItems();

    // Optional source filter
    if (sourceFilter) {
      rawItems = rawItems.filter(
        (item) =>
          item.source.toLowerCase() === sourceFilter.toLowerCase(),
      );
    }

    const total = rawItems.length;
    const page = rawItems.slice(offset, offset + limit);

    const items = page.map((item, i) => ({
      id: `rss-all-${offset + i}`,
      title: item.title,
      summary: item.description.slice(0, 500) || 'No description available.',
      url: item.link,
      date: item.pubDate
        ? (() => {
            try {
              return new Date(item.pubDate).toISOString().slice(0, 10);
            } catch {
              return '';
            }
          })()
        : '',
      source: item.source,
    }));

    return NextResponse.json(
      { items, total, limit, offset },
      {
        headers: {
          'Cache-Control':
            'public, s-maxage=3600, stale-while-revalidate=1800',
        },
      },
    );
  } catch (error) {
    console.error('Failed to fetch RSS feeds:', error);
    return NextResponse.json(
      { items: [], total: 0, error: 'Failed to fetch news feeds' },
      { status: 502 },
    );
  }
}
