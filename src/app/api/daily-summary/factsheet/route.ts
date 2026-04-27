import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { callLLM, hasAnyLLMKey } from '@/lib/ai-summary';

/**
 * GET /api/daily-summary/factsheet
 *
 * Reads the latest daily summary, sends all EU-climate-relevant articles to an
 * LLM, and returns a compact one-page factsheet focused on EU climate policy.
 *
 * Response shape:
 * {
 *   date, generatedAt, executiveSummary,
 *   topStories: [{ title, oneLiner, source, link }],
 *   signals: [{ category, text }],
 *   stats: { feedsQueried, articlesScanned, articlesUsed },
 *   llmProvider, llmError?
 * }
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
  items: SummaryItem[];
}

interface DailySummary {
  date: string;
  generatedAt: string;
  sections: SummarySection[];
  stats: {
    totalArticlesScanned: number;
    articlesLast24h: number;
    afterDedup: number;
    feedsQueried: number;
    euClimateRelevant?: number;
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')        // complete tags
    .replace(/<[^>]*$/g, '')         // truncated tag at end of string
    .replace(/^[^<]*>/g, '')         // leftover closing fragment at start
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const DATA_DIR = join(process.cwd(), 'public', 'data');

// EU-climate-relevant section IDs (skip eu_general and other_world)
const CLIMATE_SECTIONS = new Set(['eu_policy', 'energy', 'climate', 'finance']);

export async function GET() {
  // 1. Read daily summary
  const filePath = join(DATA_DIR, 'daily-summary.json');
  if (!existsSync(filePath)) {
    return NextResponse.json(
      { error: 'No daily summary available yet' },
      { status: 404 },
    );
  }

  let summary: DailySummary;
  try {
    summary = JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return NextResponse.json({ error: 'Failed to parse summary' }, { status: 500 });
  }

  // 2. Collect all climate-relevant articles
  const climateSections = summary.sections.filter(s => CLIMATE_SECTIONS.has(s.id));
  const allItems = climateSections.flatMap(s =>
    s.items.map(item => ({
      ...item,
      sectionId: s.id,
      sectionTitle: s.title,
      cleanTitle: stripHtml(item.title),
      cleanDesc: stripHtml(item.description).substring(0, 200),
    })),
  );

  // Sort by score descending
  allItems.sort((a, b) => b.score - a.score);

  // 3. Build LLM prompt
  const articleList = allItems
    .map(
      (a, i) =>
        `${i + 1}. [${a.sectionTitle}] "${a.cleanTitle}" (${a.source})\n   ${a.cleanDesc}`,
    )
    .join('\n\n');

  const prompt =
    `You are a senior EU climate-policy analyst writing for European Commission officials. Below are today's ${allItems.length} pre-filtered EU climate and energy articles.\n\n` +
    `${articleList}\n\n` +
    `Produce a JSON object with exactly this structure (no markdown, no wrapping — pure JSON):\n` +
    `{\n` +
    `  "executiveSummary": "A substantive 5-7 sentence executive overview (roughly 110-180 words) of today's most important EU climate and energy policy developments. MUST be at least 5 full sentences, each ending in a full stop. Open with the single most consequential development, then cover 2-3 other headline stories, and close with implications for EU policymakers. Be specific: name EU policies (Fit for 55, ETS, CBAM, 2040 target), institutions (Commission, Council, Parliament, ENVI), member states, Commissioners/Ministers, and exact numbers (Mt CO₂-eq, €bn, GW, %) wherever the source allows. Do NOT end mid-sentence — finish the final sentence with a full stop.",\n` +
    `  "topStories": [\n` +
    `    {\n` +
    `      "index": 1,\n` +
    `      "title": "Short factual headline (max 12 words)",\n` +
    `      "oneLiner": "One sentence explaining why this matters for EU climate/energy policy.",\n` +
    `      "originalIndex": <0-based index of the source article above>\n` +
    `    }\n` +
    `  ],\n` +
    `  "signals": [\n` +
    `    {\n` +
    `      "category": "Energy" | "Finance" | "Science" | "International",\n` +
    `      "text": "One brief signal sentence"\n` +
    `    }\n` +
    `  ]\n` +
    `}\n\n` +
    `Rules:\n` +
    `- This briefing is EXCLUSIVELY about EU climate and energy policy. Every story must have a clear, direct connection to the EU, its institutions, member states, or EU-level policy.\n` +
    `- EXCLUDE stories about non-EU countries (e.g. US, Canada, Australia, India, China, Morocco, UK post-Brexit) UNLESS the story directly involves EU policy, EU trade, or has explicit EU policy implications.\n` +
    `- topStories: pick the 3-5 MOST important stories for EU climate and energy policy.\n` +
    `- signals: 2-4 quick one-line signals from remaining stories that are still noteworthy for EU policymakers.\n` +
    `- If there are no EU-relevant stories today, say so in the executive summary and return empty arrays.\n` +
    `- Do NOT invent facts. Only use information from the articles above.\n` +
    `- Output ONLY the JSON object, nothing else.`;

  // 4. Call LLM (or return articles without AI enhancement)
  let executiveSummary = '';
  let topStories: Array<{ title: string; oneLiner: string; source: string; link: string }> = [];
  let signals: Array<{ category: string; text: string }> = [];
  let llmProvider: string | undefined;
  let llmError: string | undefined;

  if (hasAnyLLMKey() && allItems.length > 0) {
    const result = await callLLM(prompt, {
      maxTokens: 2200,
      temperature: 0.2,
      system:
        'You are a precise EU climate-policy analyst. Output only valid JSON, no markdown fences, no commentary. Ensure every string field ends with a full stop before the closing quote — never leave a sentence mid-word.',
    });

    llmProvider = result.provider;

    if (result.reason === 'ok' && result.text) {
      try {
        // Strip markdown fences if the model wraps them anyway
        let cleaned = result.text.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        }
        const parsed = JSON.parse(cleaned);

        executiveSummary = parsed.executiveSummary || '';
        signals = parsed.signals || [];

        // Map topStories back to original articles for links/sources
        topStories = (parsed.topStories || []).map(
          (s: { title: string; oneLiner: string; originalIndex?: number }) => {
            const orig = typeof s.originalIndex === 'number' ? allItems[s.originalIndex] : undefined;
            return {
              title: s.title,
              oneLiner: s.oneLiner,
              source: orig?.source || '',
              link: orig?.link || '',
            };
          },
        );
      } catch (e) {
        llmError = `JSON parse failed: ${e instanceof Error ? e.message : String(e)}`;
        // Fallback: try to extract executiveSummary via regex from malformed JSON.
        // First try a properly-closed string, then fall back to an unterminated
        // one (happens when the LLM hits maxTokens mid-value and the JSON is
        // truncated before the closing quote).
        const closed = result.text.match(/"executiveSummary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        const unterminated = result.text.match(/"executiveSummary"\s*:\s*"((?:[^"\\]|\\.)*)$/);
        const raw = closed?.[1] ?? unterminated?.[1];
        if (raw) {
          executiveSummary = raw.replace(/\\"/g, '"').replace(/\\n/g, ' ').trim();
          // Trim to last full sentence when we recovered from a truncation so
          // the UI doesn't show a dangling clause.
          if (!closed && unterminated) {
            const lastStop = Math.max(
              executiveSummary.lastIndexOf('.'),
              executiveSummary.lastIndexOf('!'),
              executiveSummary.lastIndexOf('?'),
            );
            if (lastStop > 40) executiveSummary = executiveSummary.slice(0, lastStop + 1);
          }
        } else {
          // Last resort: use raw text but strip any JSON wrapper characters
          executiveSummary = result.text
            .replace(/^\s*\{?\s*"executiveSummary"\s*:\s*"?/, '')
            .replace(/"?\s*,?\s*"topStories"[\s\S]*$/, '')
            .replace(/^\s*\{|\}\s*$/g, '')
            .trim();
        }
      }
    } else {
      llmError = result.reason || 'unknown';
    }
  }

  // 5. Fallback when no LLM: just pick top 5 articles as top stories
  if (!topStories.length && allItems.length > 0) {
    topStories = allItems.slice(0, 5).map(a => ({
      title: a.cleanTitle,
      oneLiner: a.cleanDesc.substring(0, 150),
      source: a.source,
      link: a.link,
    }));
  }

  return NextResponse.json(
    {
      date: summary.date,
      generatedAt: new Date().toISOString(),
      executiveSummary,
      topStories,
      signals,
      stats: {
        feedsQueried: summary.stats.feedsQueried,
        articlesScanned: summary.stats.totalArticlesScanned,
        articlesUsed: allItems.length,
        euClimateRelevant: summary.stats.euClimateRelevant ?? allItems.length,
      },
      llmProvider,
      llmError,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
      },
    },
  );
}
