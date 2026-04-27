import { NextRequest, NextResponse } from 'next/server';
import { getInboundItems, InboundEmailItem } from '@/lib/inbound-email-store';
import { getCustomPosts, CustomPostItem } from '@/lib/custom-posts-store';
import { callLLM, hasAnyLLMKey, pickLLMProvider, LLMResult } from '@/lib/ai-summary';
import { getServerSupabase } from '@/lib/supabase-server';
import { hasLlmConsent } from '@/lib/consent';

// Bulletin generation asks the LLM for a 4k-token structured JSON document.
// Gemini 2.5 Flash with thinking typically needs 15-40 s end-to-end, which
// exceeds Vercel's default 10 s function timeout. Bump to the Hobby-plan
// ceiling so the request can finish instead of being silently killed (which
// used to manifest as the "local fallback" banner).
export const maxDuration = 60;

/**
 * Brussels Bulletin generator.
 *
 * Takes the forwarded-email items currently in the inbound store, plus any
 * extra context the UI passes, and asks the configured LLM (Gemini,
 * Anthropic, or OpenAI — whichever key is set) to produce a structured
 * bulletin matching the layout of the official template
 * (`public/templates/brussels-bulletin-template.docx`):
 *
 *   Title              "The Brussels Bulletin"
 *   Subtitle           "Overview of recent EU climate policy-related developments"
 *   Edition            e.g. "April 2026 edition"
 *   Intro paragraph    boilerplate disclaimer
 *   Section 1          "Key EU policy developments"
 *     - Heading2 main topics
 *       - 1+ paragraphs of analysis
 *     - "Other developments" Heading2
 *       - Heading4 sub-topics with 1 paragraph each
 *   Section 2          "Important reports"
 *     - Heading4 reports with 1 paragraph each
 *
 * The output is JSON so the UI can both render a preview and produce a Word
 * export that mirrors the template's heading hierarchy.
 */

interface BulletinSubItem {
  title: string;
  body: string;
}

interface BulletinMainTopic {
  title: string;
  paragraphs: string[];
}

interface BulletinJson {
  edition: string;
  period: { from: string; to: string };
  intro: string;
  keyDevelopments: {
    main: BulletinMainTopic[];
    other: BulletinSubItem[];
  };
  importantReports: BulletinSubItem[];
  sourcesUsed: number;
  generatedAt: string;
  model: string;
  fallback?: boolean;
  /** Why the LLM path was skipped (only set on local-fallback results). */
  fallbackReason?: 'no-api-key' | 'llm-error' | 'parse-error';
  /** Extra diagnostic message surfaced to the UI — e.g. provider, HTTP
   *  status code, or truncated error body. Only set on local-fallback
   *  results and only used for display; never relied on programmatically. */
  fallbackDetail?: string;
}

const FALLBACK_INTRO =
  'The overview below contains climate-related news and developments which are considered ' +
  'relevant for the activities of the Advisory Board and is therefore only intended for ' +
  'internal use by Members of the Advisory Board, Working Group Members and the Secretariat. ' +
  'When composing this overview, the Secretariat has striven to cover all relevant topics. ' +
  'Nevertheless, the overview below should not be considered as exhaustive.';

function editionLabelFor(date: Date): string {
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) + ' edition';
}

/** Unified shape used throughout bulletin generation — covers both inbound emails and custom posts. */
interface BulletinSourceItem {
  id: string;
  title: string;
  summary: string;
  aiSummary?: string;
  sourceLabel: string;
  publishedDate: string;
  tags: string[];
}

function inboundToBulletinSource(it: InboundEmailItem): BulletinSourceItem {
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

function customPostToBulletinSource(it: CustomPostItem): BulletinSourceItem {
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
    // Include the entire "to" day
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

function localFallbackBulletin(
  items: BulletinSourceItem[],
  from: string,
  to: string,
  reason: NonNullable<BulletinJson['fallbackReason']> = 'no-api-key',
  detail?: string,
): BulletinJson {
  // Group items into main topics by tag and pick the first few
  const byTag: Record<string, BulletinSourceItem[]> = {};
  for (const it of items) {
    for (const tag of it.tags || []) {
      if (tag === 'email') continue;
      (byTag[tag] ||= []).push(it);
    }
  }
  const sortedTags = Object.entries(byTag).sort((a, b) => b[1].length - a[1].length);
  const main: BulletinMainTopic[] = sortedTags.slice(0, 3).map(([tag, list]) => ({
    title: tag.charAt(0).toUpperCase() + tag.slice(1),
    paragraphs: list.slice(0, 4).map(it => {
      const summary = it.aiSummary || it.summary || '';
      return `${it.title}. ${summary}`.trim();
    }),
  }));
  const remaining = items.filter(it => !main.some(m => m.paragraphs.some(p => p.startsWith(it.title))));
  const other: BulletinSubItem[] = remaining.slice(0, 8).map(it => ({
    title: it.title,
    body: it.aiSummary || it.summary || '',
  }));
  return {
    edition: editionLabelFor(new Date()),
    period: { from, to },
    intro: FALLBACK_INTRO,
    keyDevelopments: { main, other },
    importantReports: [],
    sourcesUsed: items.length,
    generatedAt: new Date().toISOString(),
    model: `fallback-${reason}`,
    fallback: true,
    fallbackReason: reason,
    fallbackDetail: detail,
  };
}

interface BulletinLLMFailure {
  reason: 'no-api-key' | 'llm-error' | 'parse-error';
  detail?: string;
}

type BulletinLLMOutcome =
  | { ok: true; bulletin: BulletinJson }
  | { ok: false; failure: BulletinLLMFailure };

async function callLLMForBulletin(
  items: BulletinSourceItem[],
  from: string,
  to: string,
): Promise<BulletinLLMOutcome> {
  if (!hasAnyLLMKey()) {
    return { ok: false, failure: { reason: 'no-api-key' } };
  }

  const sourcePack = buildSourcePack(items);
  const editionLabel = editionLabelFor(new Date());

  const systemPrompt =
    'You are the European Scientific Advisory Board on Climate Change Secretariat. ' +
    'You produce the "Brussels Bulletin", an internal periodic overview of EU climate ' +
    'policy developments. Your output must be valid JSON, no prose around it. ' +
    'Use only facts present in the supplied source items. Be concise, factual, and write ' +
    'in the formal style of EU policy briefs.';

  const userPrompt = `Produce the next edition of the Brussels Bulletin for the period ${from} to ${to}.

Use ONLY the items below as source material (numbered references). Do not invent facts.

═══ SOURCE ITEMS ═══
${sourcePack}
═══ END ═══

Return JSON matching this exact schema (no additional fields, no markdown fencing):

{
  "edition": "${editionLabel}",
  "period": { "from": "${from}", "to": "${to}" },
  "intro": "<one paragraph, ~3 sentences, framing what this edition covers>",
  "keyDevelopments": {
    "main": [
      {
        "title": "<short heading for a major topic>",
        "paragraphs": ["<paragraph 1>", "<paragraph 2>"]
      }
    ],
    "other": [
      { "title": "<short subtopic heading>", "body": "<one paragraph>" }
    ]
  },
  "importantReports": [
    { "title": "<report heading>", "body": "<one paragraph summary>" }
  ]
}

Rules:
- "main" must contain 2 to 4 entries covering the period's biggest stories. Each entry has 1-3 short paragraphs.
- "other" should have 4 to 8 shorter items covering smaller developments.
- "importantReports" should have 0 to 6 items, only when the source material clearly references published reports/studies/papers.
- Headings must be short (max ~10 words), no trailing punctuation.
- Paragraphs should each be 2-4 sentences, factual and self-contained.
- Do not include a bibliography, links, or numbered references in the output text.
- If a category has no material, return an empty array — do not pad with fluff.`;

  let result: LLMResult;
  try {
    // Use the long/higher-quality model variant where the provider supports it
    // (Anthropic Sonnet vs Haiku). Gemini/OpenAI ignore `longModel`.
    // Cap Gemini's thinking budget so reasoning can't eat the full 4 k output
    // budget — without this, Gemini often returns an empty/truncated body and
    // the bulletin silently falls back.
    result = await callLLM(userPrompt, {
      maxTokens: 4000,
      system: systemPrompt,
      longModel: true,
      geminiThinkingBudget: 1024,
    });
  } catch (err) {
    console.error('Bulletin generation failed:', err);
    return {
      ok: false,
      failure: {
        reason: 'llm-error',
        detail: err instanceof Error ? err.message : String(err),
      },
    };
  }

  if (result.reason !== 'ok' || !result.text) {
    const provider = result.provider || pickLLMProvider() || 'unknown';
    const status = result.statusCode ? ` ${result.statusCode}` : '';
    const errBody = (result.errorBody || '').substring(0, 300);
    console.error(
      `[bulletin] LLM call failed (${provider}: ${result.reason}${status}) — ${errBody}`,
    );
    return {
      ok: false,
      failure: {
        reason: 'llm-error',
        detail: `${provider}: ${result.reason || 'empty-response'}${status}${errBody ? ` — ${errBody}` : ''}`,
      },
    };
  }

  try {
    // Strip ``` fences if the model added them
    const cleaned = result.text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart < 0 || jsonEnd <= jsonStart) {
      return {
        ok: false,
        failure: {
          reason: 'parse-error',
          detail: `No JSON object in response (${(result.provider || 'unknown')}, ${cleaned.length} chars)`,
        },
      };
    }
    const parsed = JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1)) as Partial<BulletinJson>;

    return {
      ok: true,
      bulletin: {
        edition: parsed.edition || editionLabel,
        period: parsed.period || { from, to },
        intro: parsed.intro || FALLBACK_INTRO,
        keyDevelopments: {
          main: parsed.keyDevelopments?.main || [],
          other: parsed.keyDevelopments?.other || [],
        },
        importantReports: parsed.importantReports || [],
        sourcesUsed: items.length,
        generatedAt: new Date().toISOString(),
        model: result.provider || 'unknown',
      },
    };
  } catch (err) {
    console.error('[bulletin] JSON parse failed:', err);
    return {
      ok: false,
      failure: {
        reason: 'parse-error',
        detail: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

export async function POST(request: NextRequest) {
  // GDPR Art. 6(1)(a): the calling user must have on-file consent before
  // we forward content (including any quoted personal data in newsletters)
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

  let body: { from?: string; to?: string } = {};
  try {
    body = (await request.json()) as { from?: string; to?: string };
  } catch {
    /* allow empty body */
  }
  const from = body.from || '';
  const to = body.to || '';

  // Fetch both inbound emails and secretariat feed posts in parallel
  const [allInbound, allCustom] = await Promise.all([
    getInboundItems(),
    getCustomPosts(),
  ]);

  const inboundItems = allInbound
    .filter(it => withinPeriod(it.publishedDate || it.receivedDate, from, to))
    .map(inboundToBulletinSource);

  const customItems = allCustom
    .filter(it => withinPeriod(it.publishedDate || it.addedDate, from, to))
    .map(customPostToBulletinSource);

  // Merge and sort by date descending so most recent items lead the source pack
  const items: BulletinSourceItem[] = [...inboundItems, ...customItems].sort(
    (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime(),
  );

  if (items.length === 0) {
    return NextResponse.json(
      {
        error: 'no-items',
        message:
          'No feed items in the selected period. Forward newsletters or post items to the News Feed first, then try again.',
        totalInStore: allInbound.length + allCustom.length,
      },
      { status: 422 }
    );
  }

  const outcome = await callLLMForBulletin(items, from, to);
  const bulletin = outcome.ok
    ? outcome.bulletin
    : localFallbackBulletin(items, from, to, outcome.failure.reason, outcome.failure.detail);

  return NextResponse.json({
    bulletin,
    items: items.length,
    emailItems: inboundItems.length,
    postItems: customItems.length,
    hasApiKey: hasAnyLLMKey(),
    provider: pickLLMProvider(),
  });
}

export async function GET() {
  const [inboundItems, customItems] = await Promise.all([getInboundItems(), getCustomPosts()]);
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/brussels-bulletin',
    method: 'POST',
    body: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' },
    template: '/templates/brussels-bulletin-template.docx',
    inboundItems: inboundItems.length,
    customPostItems: customItems.length,
    totalItems: inboundItems.length + customItems.length,
    hasApiKey: hasAnyLLMKey(),
    provider: pickLLMProvider(),
  });
}
