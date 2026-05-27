/**
 * Serves pre-generated daily news summaries from the filesystem.
 * Supports GET to retrieve the latest, a specific date, or list available dates.
 */
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * GET /api/daily-summary          — latest daily summary
 * GET /api/daily-summary?date=YYYY-MM-DD — specific date
 * GET /api/daily-summary?list=1   — list available dates
 */

interface SummaryItem {
  title: string;
  link: string;
  source: string;
  description: string;
  published: string;
  score: number;
}

interface SummarySection {
  id: string;
  title: string;
  icon: string;
  items: SummaryItem[];
}

interface DailySummary {
  date: string;
  generatedAt: string;
  title: string;
  subtitle: string;
  sections: SummarySection[];
  stats: {
    totalArticlesScanned: number;
    articlesLast24h: number;
    afterDedup: number;
    feedsQueried: number;
  };
}

const DATA_DIR = join(process.cwd(), 'public', 'data');

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date');
  const list = request.nextUrl.searchParams.get('list');

  try {
    // List available summaries
    if (list) {
      const archiveDir = join(DATA_DIR, 'daily-summaries');
      if (!existsSync(archiveDir)) {
        return NextResponse.json({ dates: [] });
      }
      const { readdirSync } = await import('fs');
      const files = readdirSync(archiveDir)
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''))
        .sort()
        .reverse();
      return NextResponse.json({ dates: files });
    }

    // Specific date or latest
    let filePath: string;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      filePath = join(DATA_DIR, 'daily-summaries', `${date}.json`);
    } else {
      filePath = join(DATA_DIR, 'daily-summary.json');
    }

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'No summary available' + (date ? ` for ${date}` : '') },
        { status: 404 }
      );
    }

    const raw = readFileSync(filePath, 'utf-8');
    const summary: DailySummary = JSON.parse(raw);

    return NextResponse.json(summary, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
