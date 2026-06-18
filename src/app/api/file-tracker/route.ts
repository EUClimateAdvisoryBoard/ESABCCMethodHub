import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fetchAllFeedItems } from '@/lib/rss-feeds';
import {
  POLICY_FILES,
  matchFilesForText,
  type FileNewsItem,
} from '@/lib/policy-files';

/**
 * File Tracker API.
 * -----------------
 * Returns, for every climate-policy file, its news in reverse-chronological
 * order with summaries. The response is built from two layers:
 *
 *   1. a committed, curated seed snapshot
 *      (`public/data/file-tracker-seed.json`) so the module is meaningful even
 *      when outbound RSS is blocked, and
 *   2. fresh items pulled live from the EU institutional RSS feeds
 *      (Commission, Council, EEA, EUR-Lex) via `fetchAllFeedItems`, attributed
 *      to files with `matchFilesForText`.
 *
 * `revalidate = 86400` gives the daily refresh: Next.js serves a cached
 * response for 24h and revalidates in the background, so each calendar day the
 * tracker re-pulls the feeds. A `?refresh=1` query param skips the live pull
 * (seed only) for fast first paint / offline use.
 */

export const revalidate = 86_400; // daily

interface FileTrackerResponse {
  generated_at: string;
  live_items: number;
  seed_items: number;
  files: {
    id: string;
    last_update: string | null;
    items: FileNewsItem[];
  }[];
  sources: string[];
}

async function loadSeed(): Promise<FileNewsItem[]> {
  try {
    const file = path.join(process.cwd(), 'public', 'data', 'file-tracker-seed.json');
    const raw = await readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as { items?: FileNewsItem[] };
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

async function loadLive(): Promise<FileNewsItem[]> {
  const raw = await fetchAllFeedItems();
  const out: FileNewsItem[] = [];
  for (const item of raw) {
    const combined = `${item.title} ${item.description}`;
    const fileIds = matchFilesForText(combined);
    if (fileIds.length === 0) continue;

    let date = '';
    if (item.pubDate) {
      const d = new Date(item.pubDate);
      if (!Number.isNaN(d.getTime())) date = d.toISOString().slice(0, 10);
    }
    if (!date) continue;

    for (const fileId of fileIds) {
      out.push({
        id: `live-${fileId}-${Buffer.from(item.link).toString('base64url').slice(0, 16)}`,
        fileId,
        date,
        title: item.title,
        summary: item.description.slice(0, 500) || 'No description available.',
        source: item.source,
        url: item.link,
        kind: 'development',
      });
    }
  }
  return out;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seedOnly = searchParams.get('seed_only') === '1';

  const seed = await loadSeed();
  let live: FileNewsItem[] = [];
  if (!seedOnly) {
    try {
      live = await loadLive();
    } catch (err) {
      console.error('[file-tracker] live fetch failed, serving seed only', err);
    }
  }

  // Merge, de-duplicate on url+fileId (live can overlap the seed sources).
  const seen = new Set<string>();
  const merged: FileNewsItem[] = [];
  for (const item of [...seed, ...live]) {
    const key = `${item.fileId}::${item.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  const files = POLICY_FILES.map((file) => {
    const items = merged
      .filter((i) => i.fileId === file.id)
      .sort((a, b) => b.date.localeCompare(a.date));
    return {
      id: file.id,
      last_update: items.length ? items[0].date : null,
      items,
    };
  });

  const body: FileTrackerResponse = {
    generated_at: new Date().toISOString(),
    live_items: live.length,
    seed_items: seed.length,
    files,
    sources: ['European Commission', 'Council of the EU', 'European Environment Agency', 'EUR-Lex'],
  };

  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
}
