import { NextRequest, NextResponse } from 'next/server';
import { getInboundItems, InboundEmailItem } from '@/lib/inbound-email-store';
import { getCustomPosts, CustomPostItem } from '@/lib/custom-posts-store';
import { callLLM, hasAnyLLMKey, pickLLMProvider } from '@/lib/ai-summary';
import { getServerSupabase } from '@/lib/supabase-server';
import { hasLlmConsent } from '@/lib/consent';

/**
 * Step 1 of the Brussels Bulletin wizard: read all source items in the
 * selected period and ask the LLM to identify up to 10 overarching topics.
 * The UI then lets the user assign a percentage weight to each topic; those
 * weights drive proportional content allocation in step 3
 * (`POST /api/brussels-bulletin`).
 */

export const maxDuration = 60;

interface SourceItem {
  id: string;
  title: string;
  summary: string;
  aiSummary?: string;
  sourceLabel: string;
  publishedDate: string;
  tags: string[];
}

interface TopicSuggestion {
  title: string;
  summary: string;
  itemCount: number;
}

function inboundToSource(it: InboundEmailItem): SourceItem {
  return {
    id: it.id,
    title: it.title,
    summary: it.summary,
    aiSummary: it.aiSummary,
    sourceLabel: it.sourceLabel || 'Email',
    publishedDate: it.publishedDate || it.receivedDate,
    tags: it.tags || [],
  };
}

function customToSource(it: CustomPostItem): SourceItem {
  return {
    id: it.id,
    title: it.title,
    summary: it.summary,
    aiSummary: it.aiSummary,
    sourceLabel: it.sourceLabel || 'Secretariat',
    publishedDate: it.publishedDate || it.addedDate,
    tags: it.tags || [],
  };
}

function withinPeriod(publishedDate: string, fromIso: string, toIso: string): boolean {
  const t = new Date(publishedDate).getTime();
  if (isNaN(t)) return true;
  if (fromIso) {
    const f = new Date(fromIso).getTime();
    if (!isNaN(f) && t < f) return false;
  }
  if (toIso) {
    const tt = new Date(toIso).getTime();
    if (!isNaN(tt) && t > tt + 24 * 60 * 60 * 1000) return false;
  }
  return true;
}

function buildSourcePack(items: SourceItem[]): string {
  return items
    .slice(0, 60)
    .map((it, i) => {
      const date = (it.publishedDate || '').split('T')[0];
      const summary = (it.aiSummary || it.summary || '').replace(/\s+/g, ' ').trim().substring(0, 500);
      return `[${i + 1}] (${date}) ${it.sourceLabel} — ${it.title}\n${summary}`;
    })
    .join('\n\n');
}

export async function POST(request: NextRequest) {
  const supabase = getServerSupabase();
  const authHeader = request.headers.get('authorization');
  if (!supabase || !authHeader) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }
  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }
  if (!(await hasLlmConsent(supabase, user.id))) {
    return NextResponse.json(
      {
        error:
          'AI generation is opt-in. Visit your profile → Your data → AI summarisation consent to enable it.',
        code: 'llm-consent-required',
      },
      { status: 403 },
    );
  }

  if (!hasAnyLLMKey()) {
    return NextResponse.json(
      { error: 'No LLM API key configured. Set GEMINI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY.' },
      { status: 503 },
    );
  }

  let body: { from?: string; to?: string } = {};
  try { body = await request.json(); } catch { /* allow empty */ }
  const from = body.from || '';
  const to = body.to || '';

  const [allInbound, allCustom] = await Promise.all([getInboundItems(), getCustomPosts()]);
  const items: SourceItem[] = [
    ...allInbound
      .filter(it => withinPeriod(it.publishedDate || it.receivedDate, from, to))
      .map(inboundToSource),
    ...allCustom
      .filter(it => withinPeriod(it.publishedDate || it.addedDate, from, to))
      .map(customToSource),
  ].sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());

  if (items.length === 0) {
    return NextResponse.json(
      {
        error: 'no-items',
        message: 'No feed items in the selected period.',
      },
      { status: 422 },
    );
  }

  const sourcePack = buildSourcePack(items);

  const systemPrompt =
    'You are the European Scientific Advisory Board on Climate Change Secretariat. ' +
    'You produce the Brussels Bulletin — an internal periodic overview of EU climate policy ' +
    'developments. Your output must be valid JSON, no prose around it.';

  const userPrompt = `Identify the overarching topics covered by the source items below for the period ${from} to ${to}.

Return at most 10 topics, fewer if the material does not support 10 distinct themes. Topics must be derived ONLY from the supplied items.

═══ SOURCE ITEMS ═══
${sourcePack}
═══ END ═══

Return JSON in this exact shape (no markdown fencing, no prose):

{
  "topics": [
    { "title": "<short topic name, max ~6 words>", "summary": "<one sentence describing what this topic covers in this period>", "itemCount": <integer count of source items relevant to this topic> }
  ]
}

Rules:
- 1 to 10 topics. Prefer fewer high-quality topics over padding.
- Topics should be mutually distinct (no overlap).
- "title" should read as a section heading (e.g. "ETS reform", "Energy security", "Renewable Energy Directive review").
- "itemCount" must be the number of source items above that materially relate to the topic — never 0.
- Sort topics by itemCount, descending.`;

  const result = await callLLM(userPrompt, {
    maxTokens: 2000,
    system: systemPrompt,
    longModel: true,
    geminiThinkingBudget: 1024,
  });

  if (result.reason !== 'ok' || !result.text) {
    const provider = result.provider || pickLLMProvider() || 'unknown';
    return NextResponse.json(
      {
        error: `LLM call failed (${provider}: ${result.reason || 'empty-response'})`,
        detail: (result.errorBody || '').substring(0, 300),
      },
      { status: 502 },
    );
  }

  const cleaned = result.text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return NextResponse.json({ error: 'LLM returned an unparseable response' }, { status: 502 });
  }

  let parsed: { topics?: TopicSuggestion[] };
  try {
    parsed = JSON.parse(cleaned.substring(start, end + 1));
  } catch {
    return NextResponse.json({ error: 'LLM returned invalid JSON' }, { status: 502 });
  }

  const topics = (parsed.topics || [])
    .filter(t => t && t.title)
    .slice(0, 10)
    .map(t => ({
      title: String(t.title).trim(),
      summary: String(t.summary || '').trim(),
      itemCount: Math.max(1, Number(t.itemCount) || 1),
    }));

  if (topics.length === 0) {
    return NextResponse.json({ error: 'LLM produced no topics' }, { status: 502 });
  }

  return NextResponse.json({
    topics,
    sourceItems: items.length,
    provider: pickLLMProvider(),
  });
}
