import { NextRequest, NextResponse } from 'next/server';
import {
  fetchAllFeedItems,
  toPolicyNewsItem,
  CLIMATE_RE,
  type PolicyNewsItem,
} from '@/lib/rss-feeds';

export const revalidate = 3600; // Cache for 1 hour

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const policyId = searchParams.get('policy_id');

  try {
    const rawItems = await fetchAllFeedItems();

    // Filter for climate/energy/environment related content
    const climateItems = rawItems.filter((item) =>
      CLIMATE_RE.test(`${item.title} ${item.description}`),
    );

    let items: PolicyNewsItem[] = climateItems.map(toPolicyNewsItem);

    // Optionally filter by a specific policy id
    if (policyId) {
      items = items.filter((n) => n.policy_ids.includes(policyId));
    }

    return NextResponse.json(
      { items, total: items.length },
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
