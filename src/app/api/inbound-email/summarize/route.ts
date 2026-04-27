import { NextRequest, NextResponse } from 'next/server';
import { findInboundItem, updateInboundItem } from '@/lib/inbound-email-store';
import {
  generateAiSummaryDetailed,
  generateDetailedAnalysis,
  hasAnyLLMKey,
  pickLLMProvider,
} from '@/lib/ai-summary';
import { getServerSupabase } from '@/lib/supabase-server';
import { hasLlmConsent } from '@/lib/consent';

/**
 * POST /api/inbound-email/summarize
 *
 * On-demand summary for an inbound email item, used by the news-feed modal
 * to generate summaries for emails as they are opened (instead of blocking
 * the webhook handler at email-arrival time, which was causing Vercel
 * timeouts and Pipedream retry storms).
 *
 * Body:
 *   { id: string, detailed?: boolean }
 *     → looks up the item in the store by id, summarises its fullText,
 *       and patches the summary back into the store so it's cached.
 *
 *   { subject?: string, body: string, detailed?: boolean }
 *     → summarises ad-hoc text (no store update).
 *
 * Returns: { aiSummary: string, detailedAnalysis?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // GDPR Art. 6(1)(a): the calling user must have on-file consent before
    // we forward content to a third-party LLM (some providers are US-based
    // and rely on SCCs for transfers).
    const supabase = getServerSupabase();
    const authHeader = request.headers.get('authorization');
    if (!supabase || !authHeader) {
      return NextResponse.json(
        { error: 'Authentication required to use AI summarisation.' },
        { status: 401 },
      );
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to use AI summarisation.' },
        { status: 401 },
      );
    }
    if (!(await hasLlmConsent(supabase, user.id))) {
      return NextResponse.json(
        {
          error:
            'AI summarisation is opt-in. Visit your profile → Your data → AI summarisation consent to enable it.',
          code: 'llm-consent-required',
        },
        { status: 403 },
      );
    }

    const payload = (await request.json()) as {
      id?: string;
      subject?: string;
      body?: string;
      detailed?: boolean;
    };

    let subject = payload.subject || '';
    let body = payload.body || '';
    let isDailySpecial = payload.detailed || false;

    // If an id was passed, look up the stored item
    if (payload.id) {
      const item = await findInboundItem(payload.id);
      if (!item) {
        return NextResponse.json({ error: `Item ${payload.id} not found` }, { status: 404 });
      }
      // If we already have the summary stored, return it as-is.
      const wantsDetailed = payload.detailed ?? !!item.isDailySpecial;
      if (item.aiSummary && (!wantsDetailed || item.detailedAnalysis)) {
        return NextResponse.json({
          aiSummary: item.aiSummary,
          detailedAnalysis: item.detailedAnalysis,
          cached: true,
        });
      }
      subject = subject || item.title;
      body = body || item.fullText || item.summary;
      isDailySpecial = wantsDetailed;
    }

    if (!body) {
      return NextResponse.json({ error: 'No body provided to summarise' }, { status: 400 });
    }

    if (!hasAnyLLMKey()) {
      return NextResponse.json({
        error: 'No LLM API key is set in the Vercel environment variables. Add GEMINI_API_KEY (free tier, recommended), ANTHROPIC_API_KEY, or OPENAI_API_KEY in Project Settings → Environment Variables, then redeploy.',
      }, { status: 500 });
    }

    // Short summary always; detailed only for daily specials.
    const summaryResult = await generateAiSummaryDetailed(subject, body);

    if (summaryResult.reason === 'no-api-key') {
      return NextResponse.json({
        error: 'No LLM API key is set in the server environment. Add GEMINI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY.',
      }, { status: 500 });
    }
    if (summaryResult.reason === 'body-too-short') {
      return NextResponse.json({
        error: 'Email body is too short to summarise (< 120 chars).',
      }, { status: 400 });
    }
    if (summaryResult.reason === 'api-error' || summaryResult.reason === 'network-error') {
      const provider = summaryResult.provider || pickLLMProvider() || 'unknown';
      const status = summaryResult.statusCode ? ` ${summaryResult.statusCode}` : '';
      const errDetail = summaryResult.errorBody ? ` — ${summaryResult.errorBody}` : '';
      return NextResponse.json({
        error: `LLM call failed (${provider}: ${summaryResult.reason}${status})${errDetail}`,
      }, { status: 500 });
    }

    let detailedAnalysis = '';
    if (isDailySpecial) {
      try {
        detailedAnalysis = await generateDetailedAnalysis(subject, body);
      } catch (err) {
        // Non-fatal: return the short summary even if detailed fails
        console.error('[summarize] Detailed analysis failed:', err);
      }
    }

    const aiSummary = summaryResult.text;
    if (!aiSummary && !detailedAnalysis) {
      return NextResponse.json({
        error: 'Summary generation returned empty.',
      }, { status: 500 });
    }

    // If the request was tied to a stored item, persist the summary back
    if (payload.id) {
      await updateInboundItem(payload.id, {
        aiSummary: aiSummary || undefined,
        detailedAnalysis: detailedAnalysis || undefined,
      });
    }

    return NextResponse.json({
      aiSummary,
      detailedAnalysis: detailedAnalysis || undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
