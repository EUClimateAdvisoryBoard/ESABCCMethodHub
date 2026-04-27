import { NextResponse } from 'next/server';
import { getInboundItems, updateInboundItem } from '@/lib/inbound-email-store';
import { generateAiSummaryDetailed, hasAnyLLMKey, pickLLMProvider } from '@/lib/ai-summary';

/**
 * Backfill AI summaries for items that were stored before any LLM key
 * was configured (or where summary generation failed at email-arrival time).
 *
 * POST /api/inbound-email/backfill
 *   { max?: number }   — maximum items to process (default 25, hard cap 100)
 *
 * Returns:
 *   {
 *     processed, updated, skipped,
 *     reasons: { 'no-api-key': 0, 'body-too-short': 2, ... },
 *     hasApiKey: boolean
 *   }
 *
 * This endpoint is intentionally idempotent: items that already have an
 * aiSummary are left alone.
 */
export async function POST(request: Request) {
  let body: { max?: number } = {};
  try {
    body = (await request.json()) as { max?: number };
  } catch {
    /* body is optional */
  }

  const hasApiKey = hasAnyLLMKey();
  const provider = pickLLMProvider();
  if (!hasApiKey) {
    return NextResponse.json(
      {
        error: 'no-api-key',
        message:
          'No LLM API key is set in this environment. Add GEMINI_API_KEY (free tier, recommended), ' +
          'ANTHROPIC_API_KEY, or OPENAI_API_KEY to your Vercel project env vars, redeploy, then ' +
          'click backfill again.',
        hasApiKey,
      },
      { status: 400 }
    );
  }

  const max = Math.min(Math.max(body.max || 25, 1), 100);
  const items = await getInboundItems();
  const needsSummary = items.filter((it) => !it.aiSummary).slice(0, max);

  let updated = 0;
  let skipped = 0;
  const reasons: Record<string, number> = {};
  // First error we hit — surfaced to the UI so the user can see WHY Anthropic
  // rejected the request (wrong model, invalid key, rate limit, etc.). Without
  // this, `api-error` on its own is un-debuggable from the client side.
  let firstError: { statusCode?: number; body?: string } | null = null;

  for (const it of needsSummary) {
    const cleanSubject = (it.title || '').replace(/^(?:FW:|Fwd:|Fw:|Re:|AW:|WG:)\s*/i, '').trim();
    const cleanBody = it.fullText || it.summary || '';
    const { text, reason, statusCode, errorBody } = await generateAiSummaryDetailed(cleanSubject, cleanBody);
    if (reason) reasons[reason] = (reasons[reason] || 0) + 1;
    if (!firstError && (reason === 'api-error' || reason === 'network-error') && (statusCode || errorBody)) {
      firstError = { statusCode, body: errorBody };
    }
    if (text) {
      const ok = await updateInboundItem(it.id, { aiSummary: text });
      if (ok) updated++;
      else skipped++;
    } else {
      skipped++;
    }
  }

  return NextResponse.json({
    processed: needsSummary.length,
    updated,
    skipped,
    reasons,
    firstError,
    hasApiKey,
    provider,
    totalItems: items.length,
    itemsStillMissingSummary: Math.max(items.filter((i) => !i.aiSummary).length - updated, 0),
  });
}

export async function GET() {
  const items = await getInboundItems();
  const missing = items.filter((i) => !i.aiSummary).length;
  return NextResponse.json({
    endpoint: '/api/inbound-email/backfill',
    method: 'POST',
    body: { max: 'number (default 25, max 100)' },
    totalItems: items.length,
    itemsWithAiSummary: items.length - missing,
    itemsMissingAiSummary: missing,
    hasApiKey: hasAnyLLMKey(),
    provider: pickLLMProvider(),
  });
}
