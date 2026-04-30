import { NextRequest, NextResponse } from 'next/server';
import { getInboundItems, InboundEmailItem } from '@/lib/inbound-email-store';
import { getCustomPosts, CustomPostItem } from '@/lib/custom-posts-store';
import { callLLM, hasAnyLLMKey, pickLLMProvider, LLMResult } from '@/lib/ai-summary';
import { getServerSupabase } from '@/lib/supabase-server';
import { hasLlmConsent } from '@/lib/consent';

export const maxDuration = 60;

/**
 * Brussels Bulletin generator (step 3 of the wizard).
 *
 * Caller supplies the period plus a list of weighted topics chosen by the
 * user. The LLM produces a structured bulletin matching the layout of the
 * uploaded April 2026 template
 * (`public/templates/brussels-bulletin-template.docx`):
 *
 *   Title              "The Brussels Bulletin"
 *   Subtitle           "Overview of recent EU climate policy-related developments"
 *   Edition line       e.g. "April 2026 edition"
 *   Boilerplate intro  (rendered client-side from template constants)
 *   Heading1           "Key EU policy developments"
 *     Heading2         <topic title>
 *       Normal         <paragraph>
 *       ListParagraph  <bullet>           (optional)
 *   Heading1           "Other developments"
 *     Normal           "<DD/M>: <body>"   (flat list, no headings)
 *   Heading1           "Relevant documents/reports/articles"
 *     Normal           <body>             (flat list, no headings)
 *
 * Weight semantics: weights sum to 100 and dictate the share of total
 * bulletin word count each topic receives. High-weight topics become
 * Key-developments blocks with multiple paragraphs; low-weight ones
 * collapse into a single Other-developments line; topics that primarily
 * reference published reports/studies are placed under Relevant documents.
 */

interface BulletinKeyDevelopment {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

interface BulletinOtherDevelopment {
  /** Short date prefix shown before the body, e.g. "27/3". */
  date: string;
  body: string;
}

interface BulletinRelevantDocument {
  body: string;
}

interface BulletinJson {
  edition: string;
  period: { from: string; to: string };
  keyDevelopments: BulletinKeyDevelopment[];
  otherDevelopments: BulletinOtherDevelopment[];
  relevantDocuments: BulletinRelevantDocument[];
  sourcesUsed: number;
  generatedAt: string;
  model: string;
}

interface TopicWeight {
  title: string;
  weight: number;
}

interface BulletinSourceItem {
  id: string;
  title: string;
  summary: string;
  aiSummary?: string;
  sourceLabel: string;
  publishedDate: string;
  tags: string[];
}

function editionLabelFor(date: Date): string {
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) + ' edition';
}

function inboundToSource(it: InboundEmailItem): BulletinSourceItem {
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

function customPostToSource(it: CustomPostItem): BulletinSourceItem {
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

function buildSourcePack(items: BulletinSourceItem[]): string {
  return items
    .slice(0, 60)
    .map((it, i) => {
      const date = (it.publishedDate || '').split('T')[0];
      const summary = (it.aiSummary || it.summary || '').replace(/\s+/g, ' ').trim().substring(0, 600);
      return `[${i + 1}] (${date}) ${it.sourceLabel} — ${it.title}\n${summary}`;
    })
    .join('\n\n');
}

/** Total target word count for the bulletin body (excluding boilerplate). */
const BULLETIN_TOTAL_WORDS = 1500;

function buildTopicBudget(topics: TopicWeight[]): string {
  return topics
    .map(t => {
      const words = Math.round((t.weight / 100) * BULLETIN_TOTAL_WORDS);
      return `- "${t.title}": ${t.weight}% → ~${words} words`;
    })
    .join('\n');
}

export async function POST(request: NextRequest) {
  // GDPR Art. 6(1)(a): the calling user must have on-file consent before we
  // forward content (which can include personal data quoted in newsletters)
  // to a third-party LLM.
  const supabase = getServerSupabase();
  const authHeader = request.headers.get('authorization');
  if (!supabase || !authHeader) {
    return NextResponse.json(
      { error: 'Authentication required to generate the Brussels Bulletin.' },
      { status: 401 },
    );
  }
  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required to generate the Brussels Bulletin.' },
      { status: 401 },
    );
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

  let body: { from?: string; to?: string; topics?: TopicWeight[] } = {};
  try { body = await request.json(); } catch { /* allow empty body */ }
  const from = body.from || '';
  const to = body.to || '';
  const rawTopics = Array.isArray(body.topics) ? body.topics : [];

  const topics: TopicWeight[] = rawTopics
    .filter(t => t && typeof t.title === 'string' && Number.isFinite(t.weight))
    .map(t => ({ title: String(t.title).trim(), weight: Number(t.weight) }))
    .filter(t => t.title.length > 0 && t.weight > 0);

  if (topics.length === 0) {
    return NextResponse.json(
      { error: 'At least one topic with a non-zero weight is required.' },
      { status: 400 },
    );
  }

  const totalWeight = topics.reduce((s, t) => s + t.weight, 0);
  if (Math.abs(totalWeight - 100) > 0.5) {
    return NextResponse.json(
      { error: `Topic weights must sum to 100% (currently ${totalWeight.toFixed(1)}%).` },
      { status: 400 },
    );
  }

  const [allInbound, allCustom] = await Promise.all([getInboundItems(), getCustomPosts()]);
  const items: BulletinSourceItem[] = [
    ...allInbound
      .filter(it => withinPeriod(it.publishedDate || it.receivedDate, from, to))
      .map(inboundToSource),
    ...allCustom
      .filter(it => withinPeriod(it.publishedDate || it.addedDate, from, to))
      .map(customPostToSource),
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
  const editionLabel = editionLabelFor(new Date());
  const topicBudget = buildTopicBudget(topics);

  const systemPrompt =
    'You are the European Scientific Advisory Board on Climate Change Secretariat. ' +
    'You produce the Brussels Bulletin — an internal periodic overview of EU climate ' +
    'policy developments. Your output must be valid JSON, no prose around it. ' +
    'Use only facts present in the supplied source items. Be concise, factual, and ' +
    'write in the formal style of EU policy briefs.';

  const userPrompt = `Produce the Brussels Bulletin for the period ${from} to ${to}.

The user has chosen the topics below and assigned each a weight (% of total bulletin body length). Allocate words proportionally — the bulletin must devote roughly that share of its body to each topic. The total body target is ~${BULLETIN_TOTAL_WORDS} words.

═══ TOPIC WEIGHTS ═══
${topicBudget}
═══ END ═══

Use ONLY the items below as source material. Do not invent facts.

═══ SOURCE ITEMS ═══
${sourcePack}
═══ END ═══

Return JSON in this exact shape (no markdown fencing, no prose around it):

{
  "edition": "${editionLabel}",
  "period": { "from": "${from}", "to": "${to}" },
  "keyDevelopments": [
    {
      "title": "<topic title — should match one of the user-chosen topics>",
      "paragraphs": ["<paragraph 1>", "<paragraph 2>"],
      "bullets": ["<optional bullet>", "<optional bullet>"]
    }
  ],
  "otherDevelopments": [
    { "date": "<DD/M>", "body": "<one paragraph>" }
  ],
  "relevantDocuments": [
    { "body": "<one paragraph summarising a published report/study/article>" }
  ]
}

Rules for placement and length:
- A topic whose budget is ~150+ words goes in "keyDevelopments" with 2-4 paragraphs (and optional bullets).
- A topic whose budget is below ~150 words and that describes news or events goes in "otherDevelopments" as one or more single-paragraph items, each prefixed with the relevant date in DD/M format from the source.
- A topic whose primary material is published reports, studies or articles goes in "relevantDocuments" with one paragraph per document.
- Respect the per-topic word budgets within ±20%. Do not pad. If a topic has very little source material, write less rather than inventing.
- Do not include topics that the user did not list in TOPIC WEIGHTS.
- Headings (titles) must be short, no trailing punctuation.
- Do not include a bibliography, links, numbered references, or any meta-commentary about the generation.
- Empty arrays are allowed when a section has no qualifying topics.`;

  let result: LLMResult;
  try {
    result = await callLLM(userPrompt, {
      maxTokens: 4000,
      system: systemPrompt,
      longModel: true,
      geminiThinkingBudget: 1024,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'LLM call failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }

  if (result.reason !== 'ok' || !result.text) {
    const provider = result.provider || pickLLMProvider() || 'unknown';
    const status = result.statusCode ? ` ${result.statusCode}` : '';
    return NextResponse.json(
      {
        error: `LLM call failed (${provider}: ${result.reason || 'empty-response'}${status})`,
        detail: (result.errorBody || '').substring(0, 300),
      },
      { status: 502 },
    );
  }

  const cleaned = result.text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd <= jsonStart) {
    return NextResponse.json(
      { error: 'LLM returned an unparseable response' },
      { status: 502 },
    );
  }

  let parsed: Partial<BulletinJson>;
  try {
    parsed = JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1));
  } catch (err) {
    return NextResponse.json(
      { error: 'LLM returned invalid JSON', detail: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }

  const bulletin: BulletinJson = {
    edition: parsed.edition || editionLabel,
    period: parsed.period || { from, to },
    keyDevelopments: (parsed.keyDevelopments || []).map(k => ({
      title: String(k.title || '').trim(),
      paragraphs: Array.isArray(k.paragraphs) ? k.paragraphs.map(p => String(p)) : [],
      bullets: Array.isArray(k.bullets) && k.bullets.length
        ? k.bullets.map(b => String(b))
        : undefined,
    })).filter(k => k.title && k.paragraphs.length),
    otherDevelopments: (parsed.otherDevelopments || []).map(o => ({
      date: String(o.date || '').trim(),
      body: String(o.body || '').trim(),
    })).filter(o => o.body),
    relevantDocuments: (parsed.relevantDocuments || []).map(d => ({
      body: String(d.body || '').trim(),
    })).filter(d => d.body),
    sourcesUsed: items.length,
    generatedAt: new Date().toISOString(),
    model: result.provider || 'unknown',
  };

  return NextResponse.json({
    bulletin,
    items: items.length,
    provider: pickLLMProvider(),
  });
}

export async function GET() {
  const [inboundItems, customItems] = await Promise.all([getInboundItems(), getCustomPosts()]);
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/brussels-bulletin',
    method: 'POST',
    body: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', topics: [{ title: 'string', weight: 'number (0-100, sum=100)' }] },
    template: '/templates/brussels-bulletin-template.docx',
    inboundItems: inboundItems.length,
    customPostItems: customItems.length,
    totalItems: inboundItems.length + customItems.length,
    hasApiKey: hasAnyLLMKey(),
    provider: pickLLMProvider(),
  });
}
