import { NextRequest, NextResponse } from 'next/server';
import {
  addInboundItem,
  findInboundItem,
  getInboundItems,
  InboundEmailItem,
  isPersistent,
  removeInboundItem,
  updateInboundItem,
} from '@/lib/inbound-email-store';
import { generateAiSummaryDetailed, hasAnyLLMKey, pickLLMProvider } from '@/lib/ai-summary';

// Max wall-clock time we're willing to spend generating a summary inline at
// webhook time. The Vercel Hobby tier hard-caps serverless functions at 10s;
// we leave ~3s of headroom for the Supabase round-trips and response
// serialization so Pipedream doesn't retry on timeout (which would create
// duplicate items).
const WEBHOOK_SUMMARY_TIMEOUT_MS = 7000;

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/**
 * Inbound Email Webhook Endpoint
 *
 * This endpoint receives forwarded emails and converts them into news feed items.
 * It works with the Vercel deployment URL — no custom domain required.
 *
 * ═══ HOW THE EMAIL-TO-NEWS PIPELINE WORKS (NO DOMAIN NEEDED) ═══
 *
 * Because email systems can't deliver directly to an HTTPS URL, you need a
 * free service that gives you a hosted email address and forwards incoming
 * mail to your Vercel webhook. Pick ONE of the following:
 *
 * Option 1: Pipedream (Free, recommended — gives you an @pipedream.net address)
 * ──────────────────────────────────────────────────────────────────────────────
 * 1. Sign up at https://pipedream.com (free).
 * 2. Create a new Workflow → Trigger: "New Email" (Email by Pipedream).
 *    Pipedream will assign you a unique address like
 *    `xxxxxxxxxx@pipedream.net`.
 * 3. Add an "HTTP Request" step that POSTs to:
 *      https://<YOUR-VERCEL-APP>.vercel.app/api/inbound-email?secret=<SECRET>
 *    with JSON body:
 *      {
 *        "subject": "{{steps.trigger.event.subject}}",
 *        "from":    "{{steps.trigger.event.from.value[0].address}}",
 *        "text":    "{{steps.trigger.event.body_plain}}",
 *        "date":    "{{steps.trigger.event.date}}"
 *      }
 * 4. Forward newsletters or interesting emails to that Pipedream address
 *    (or use a Gmail/Outlook auto-forward filter).
 *
 * Option 2: Zapier "Email by Zapier" (Free)
 * ─────────────────────────────────────────
 * 1. Create a Zap → Trigger: Email by Zapier → New Inbound Email.
 *    Zapier gives you an `<name>@robot.zapier.com` address.
 * 2. Action: Webhooks by Zapier → POST to your Vercel inbound-email URL
 *    with the email fields mapped to JSON.
 *
 * Option 3: CloudMailin (Free trial — gives you an @cloudmailin.net address)
 * ──────────────────────────────────────────────────────────────────────────
 * 1. Sign up at https://www.cloudmailin.com.
 * 2. Set the target URL to your Vercel inbound-email URL (with ?secret=).
 * 3. CloudMailin POSTs each incoming email as multipart form data.
 *
 * Option 4: Google Apps Script (Free, fully self-hosted)
 * ──────────────────────────────────────────────────────
 * Create a Gmail label "feed", an Apps Script time-trigger that reads
 * unread messages with that label and POSTs them to this endpoint, then
 * marks them read. See SETUP_EMAIL.md for the script.
 *
 * ═══ NEWSLETTERS TO SUBSCRIBE TO ═══
 *
 * - European Commission Daily News: https://ec.europa.eu/commission/presscorner/home/en
 * - EEA Newsletter: https://www.eea.europa.eu/en/newsletter
 * - European Council Newsroom: https://www.consilium.europa.eu/en/press/
 * - POLITICO Brussels Playbook: https://www.politico.eu/newsletter/brussels-playbook/
 * - Climate Home News Daily Briefing: https://www.climatechangenews.com/newsletter/
 * - Carbon Brief Daily/Weekly: https://www.carbonbrief.org/newsletter/
 * - EURACTIV Climate & Environment: https://www.euractiv.com/sections/climate-environment/
 * - Clean Energy Wire (CLEW): https://www.cleanenergywire.org/newsletter
 */

// Shared secret for webhook authentication.
// Set INBOUND_EMAIL_SECRET in Vercel project env vars for production.
const WEBHOOK_SECRET = process.env.INBOUND_EMAIL_SECRET || 'esabcc-email-webhook-2024';

const SOURCE_LABELS: Record<string, string> = {
  european_commission: 'European Commission',
  eea: 'European Environment Agency',
  european_council: 'European Council',
  politico: 'POLITICO',
  carbon_brief: 'Carbon Brief',
  climate_home: 'Climate Home News',
  euractiv: 'EURACTIV',
  ipcc: 'IPCC',
  unfccc: 'UNFCCC',
  other: 'Email',
};

function detectSource(from: string): string {
  const f = from.toLowerCase();
  if (f.includes('ec.europa.eu') || f.includes('commission')) return 'european_commission';
  if (f.includes('eea.europa.eu')) return 'eea';
  if (f.includes('consilium.europa.eu') || f.includes('council')) return 'european_council';
  if (f.includes('politico')) return 'politico';
  if (f.includes('carbonbrief')) return 'carbon_brief';
  if (f.includes('climatechangenews')) return 'climate_home';
  if (f.includes('euractiv')) return 'euractiv';
  if (f.includes('ipcc')) return 'ipcc';
  if (f.includes('unfccc')) return 'unfccc';
  return 'other';
}

function extractFirstUrl(text: string): string {
  // Prefer a non-tracking URL if one exists
  const all = text.match(/https?:\/\/[^\s<>"')\]]+/g) || [];
  const nonTracking = all.find(u => !/awstrack\.me|list-manage|mailchimp|sendgrid|clicktracking|trk\.|tracking/i.test(u));
  return nonTracking || all[0] || '#';
}

// Strip artifacts found in forwarded emails: [cid:...] image placeholders,
// <http://...> angle-wrapped URLs, tracking pixels, zero-width chars, URLs, etc.
function stripEmailArtifacts(s: string): string {
  return s
    // Remove [cid:image001.png@...] inline image markers
    .replace(/\[cid:[^\]]*\]/gi, '')
    // Remove [image] / [image: alt] placeholders from HTML-to-text conversion
    .replace(/\[image[^\]]*\]/gi, '')
    // Remove <mailto:...> tags entirely (and any trailing '>' from nested angles)
    .replace(/<mailto:[^>]*>+/gi, '')
    // Unwrap <https://foo> -> https://foo (safety before URL stripping)
    .replace(/<(https?:\/\/[^>\s]+)>/g, '$1')
    // Strip ALL http(s) URLs — forwarded newsletters are full of tracking links
    .replace(/https?:\/\/[^\s<>"')\]]+/gi, '')
    // Strip stray bare email addresses that were left behind from mailto removal
    .replace(/<[^@>\s]+@[^>\s]+>/g, '')
    // Remove standalone "Forwarded message" separators
    .replace(/[-_]{4,}\s*Forwarded message\s*[-_]{4,}/gi, '')
    // Remove zero-width and soft-hyphen characters
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    // Normalize non-breaking spaces
    .replace(/\u00A0/g, ' ')
    // Tidy orphan punctuation left after URL removal ("here | Follow us")
    .replace(/\s+([,.;:!?])/g, '$1')
    // Collapse runs of spaces created by the substitutions
    .replace(/[ \t]{2,}/g, ' ');
}

/**
 * Detect whether an incoming email is the daily Climate Action Press Review,
 * which we treat as a recurring "daily special" with extended AI analysis.
 */
function detectDailySpecial(subject: string, from: string): { isDailySpecial: boolean; specialKind?: string } {
  const s = (subject || '').toLowerCase().replace(/^(?:fw:|fwd:|fw:|re:|aw:|wg:)\s*/i, '').trim();
  const f = (from || '').toLowerCase();
  if (s.startsWith('climate action press review') || s.includes('climate action press review')) {
    return { isDailySpecial: true, specialKind: 'climate_action_press_review' };
  }
  // Also catch forwards from the Commission's CLIMA mailbox even if the
  // subject line was edited by an intermediate forwarder.
  if (f.includes('clima-eu-action@ec.europa.eu') && s.includes('press review')) {
    return { isDailySpecial: true, specialKind: 'climate_action_press_review' };
  }
  return { isDailySpecial: false };
}

function cleanForSummary(s: string): string {
  return stripEmailArtifacts(s).replace(/\s+/g, ' ').trim();
}

function cleanForFullText(s: string): string {
  // Preserve paragraph breaks but collapse runs of horizontal whitespace
  return stripEmailArtifacts(s)
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();
}

// Treat the literal string "undefined" / "null" as empty — happens when a
// Pipedream handlebar expression references a missing field.
function clean(v: unknown): string {
  if (v == null) return '';
  const s = String(v).trim();
  if (s === '' || s === 'undefined' || s === 'null') return '';
  return s;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

interface NestedAddress { address?: string; name?: string }
interface AddressObject { value?: NestedAddress[]; text?: string }
type MaybeAddress = string | AddressObject | undefined | null;

/**
 * Extract a sender name + email from any of the common shapes:
 *  - string "Name <email@x.com>"
 *  - string "email@x.com"
 *  - object { value: [{ address, name }], text }
 *  - separate fromName / fromEmail fields
 */
function parseSender(data: Record<string, unknown>): { name: string; email: string; display: string } {
  const raw = (data.from ?? data.sender ?? data.From) as MaybeAddress;
  let name = clean((data as { fromName?: unknown }).fromName);
  let email = clean((data as { fromEmail?: unknown }).fromEmail);

  if (typeof raw === 'string') {
    const s = clean(raw);
    const m = s.match(/^\s*(?:"?([^"<]+?)"?\s*)?<([^>]+)>\s*$/);
    if (m) {
      if (!name) name = clean(m[1]);
      if (!email) email = clean(m[2]);
    } else if (s.includes('@')) {
      if (!email) email = s;
    } else if (s) {
      if (!name) name = s;
    }
  } else if (raw && typeof raw === 'object') {
    const first = raw.value?.[0];
    if (first) {
      if (!name) name = clean(first.name);
      if (!email) email = clean(first.address);
    }
    if (!email) email = clean(raw.text);
  }

  const display = name && email
    ? `${name} <${email}>`
    : (name || email || '');
  return { name, email, display };
}

function parseBody(data: Record<string, unknown>): { plain: string; html: string } {
  const candidatesPlain = [
    data.text, data.body_plain, data.bodyPlain, data.plain,
    data['stripped-text'], data.body, data.message,
  ];
  let plain = '';
  for (const c of candidatesPlain) {
    const v = clean(c);
    if (v) { plain = v; break; }
  }
  const htmlRaw = clean(data.html ?? data.body_html ?? data.bodyHtml ?? data.htmlBody);
  if (!plain && htmlRaw) plain = stripHtml(htmlRaw);
  return { plain, html: htmlRaw };
}

function parseDate(data: Record<string, unknown>): string {
  const h = data.headers as Record<string, unknown> | undefined;
  const candidates = [
    data.date, data.Date, data.received_at, data.receivedAt,
    h?.date, h?.Date,
  ];
  for (const c of candidates) {
    const v = clean(c);
    if (!v) continue;
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const authHeader = request.headers.get('authorization');
  const querySecret = request.nextUrl.searchParams.get('secret');
  const secret = authHeader?.replace('Bearer ', '') || querySecret;

  if (secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let data: Record<string, unknown> = {};

    if (contentType.includes('application/json')) {
      data = (await request.json()) as Record<string, unknown>;
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      for (const [k, v] of formData.entries()) data[k] = v;
    } else {
      // Plain text fallback: treat the whole body as the message
      const raw = await request.text();
      data = { text: raw };
    }

    // Pipedream sometimes nests everything under `event` — unwrap it.
    if (data.event && typeof data.event === 'object') {
      data = { ...(data.event as Record<string, unknown>), ...data };
    }

    // Extract fields with graceful fallbacks
    const headers = (data.headers ?? {}) as Record<string, unknown>;
    const subject = clean(data.subject)
      || clean(headers.subject)
      || clean(headers.Subject)
      || '';

    const sender = parseSender(data);
    const { plain: plainText, html: htmlBody } = parseBody(data);
    const date = parseDate(data);

    // Validate — if we got literally nothing usable, still accept but store
    // a diagnostic item so the user can see something hit the feed and we
    // can inspect which keys Pipedream actually sent.
    if (!subject && !plainText && !htmlBody) {
      const diag: InboundEmailItem = {
        id: `email-${Date.now()}-diag`,
        title: '[empty payload] No subject/text/html found',
        summary: `Pipedream POSTed but all fields were empty. Keys received: ${Object.keys(data).join(', ') || '(none)'}. Raw dump: ${JSON.stringify(data).substring(0, 600)}`,
        fullText: JSON.stringify(data),
        source: 'other',
        sourceLabel: 'Diagnostic',
        from: 'Webhook diagnostic',
        url: '#',
        publishedDate: new Date().toISOString(),
        receivedDate: new Date().toISOString(),
        tags: ['diagnostic'],
        isExternal: true,
        type: 'newsletter',
      };
      await addInboundItem(diag);
      return NextResponse.json({
        status: 'accepted_empty',
        hint: 'All fields empty — added a diagnostic item to the feed so you can see the raw payload keys.',
        receivedKeys: Object.keys(data),
        item: diag,
      });
    }

    // Capture the first usable URL BEFORE we strip URLs out of the body text.
    const originalUrl = extractFirstUrl(plainText || htmlBody);

    // Clean out forwarded-email artifacts like [cid:image001.png@...], URLs, <mailto:>, etc.
    const cleanedPlain = cleanForSummary(plainText);
    const cleanedFull = cleanForFullText(plainText);
    const cleanedSubject = subject.replace(/^(?:FW:|Fwd:|Fw:|Re:|AW:|WG:)\s*/i, '').trim() || subject;

    // Detect the daily Climate Action Press Review — it gets a special tag
    // and a more detailed AI analysis on top of the short summary.
    const special = detectDailySpecial(cleanedSubject, sender.display || sender.email || '');

    // Summary generation strategy:
    //   1. Store the item immediately with no summary.
    //   2. Try to generate the short summary inline, bounded by
    //      WEBHOOK_SUMMARY_TIMEOUT_MS so Pipedream/Zapier never time out and
    //      retry (which would create duplicates).
    //   3. On success, patch the summary back onto the row.
    //   4. On timeout, error, or missing key: leave the summary empty. The
    //      /summarize endpoint will fill it in when the user opens the item,
    //      and the /backfill endpoint can retry en masse.
    //
    // Detailed analysis (for the daily Climate Action Press Review) is NOT
    // generated inline — it can take 10+ seconds on its own and would blow
    // the timeout. It's still computed on demand in /summarize.

    const combinedText = `${cleanedSubject} ${cleanedPlain}`.toLowerCase();

    // Auto-tag (no filtering — just labeling)
    const tags: string[] = ['email'];
    if (special.isDailySpecial) tags.push('daily-special');
    if (combinedText.includes('emission') || combinedText.includes('ets') || combinedText.includes('carbon')) tags.push('emissions');
    if (combinedText.includes('energy') || combinedText.includes('renewable')) tags.push('energy');
    if (combinedText.includes('adaptation') || combinedText.includes('resilience')) tags.push('adaptation');
    if (combinedText.includes('biodiversity') || combinedText.includes('nature')) tags.push('biodiversity');
    if (combinedText.includes('finance') || combinedText.includes('taxonomy') || combinedText.includes('investment')) tags.push('finance');
    if (combinedText.includes('transport') || combinedText.includes('vehicle') || combinedText.includes('aviation')) tags.push('transport');
    if (combinedText.includes('climate')) tags.push('climate');
    if (combinedText.includes('policy') || combinedText.includes('regulation') || combinedText.includes('directive')) tags.push('policy');

    const title = cleanedSubject || cleanedPlain.substring(0, 100) || '(no subject)';
    const summary = cleanedPlain.substring(0, 800) || '(no body)';
    const fromDisplay = sender.display || sender.email || sender.name || 'Unknown sender';

    // Inbound emails always get the "Email News-In" category, regardless of
    // which mailbox forwarded them. The actual sender stays in `from`.
    const newsItem: InboundEmailItem = {
      id: `email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      summary,
      fullText: cleanedFull,
      // aiSummary/detailedAnalysis intentionally left undefined — filled in
      // on-demand by the /summarize endpoint when the user opens the modal.
      isDailySpecial: special.isDailySpecial,
      specialKind: special.specialKind,
      source: 'email_news_in',
      sourceLabel: 'Email News-In',
      from: fromDisplay,
      url: originalUrl,
      publishedDate: date,
      receivedDate: new Date().toISOString(),
      tags: Array.from(new Set(tags)),
      isExternal: true,
      type: 'newsletter',
    };

    await addInboundItem(newsItem);

    // Try to generate the short AI summary inline so the news feed has it
    // ready the first time the user opens the page — no manual "Regenerate
    // AI summaries" click required. Bounded by WEBHOOK_SUMMARY_TIMEOUT_MS so
    // a slow/rate-limited LLM can't blow the webhook timeout.
    //
    // GDPR: the webhook has no user-level consent to attach to, so the
    // controller-level flag AUTO_LLM_SUMMARIZATION_ENABLED gates whether
    // forwarded-email content goes to a third-party LLM at ingest time. If
    // disabled (the default), the email is stored but not summarised —
    // users can still trigger consented summarisation on demand from the
    // news-feed UI.
    const autoLlmEnabled = process.env.AUTO_LLM_SUMMARIZATION_ENABLED === 'true';
    let inlineSummary = '';
    let inlineSummaryReason: string | undefined;
    if (autoLlmEnabled && hasAnyLLMKey()) {
      try {
        const result = await withTimeout(
          generateAiSummaryDetailed(cleanedSubject, cleanedFull || summary),
          WEBHOOK_SUMMARY_TIMEOUT_MS,
          'inline-summary',
        );
        inlineSummaryReason = result.reason;
        if (result.text) {
          inlineSummary = result.text;
          await updateInboundItem(newsItem.id, { aiSummary: result.text });
          newsItem.aiSummary = result.text;
        }
      } catch (err) {
        // Timeout or unexpected error — fall through with no summary. The
        // item is already stored, so backfill/on-demand summarise can fill
        // it in later. We log so Vercel logs surface the cause.
        console.warn(
          '[inbound-email] Inline summary failed:',
          err instanceof Error ? err.message : String(err),
        );
        inlineSummaryReason = 'inline-error';
      }
    } else {
      inlineSummaryReason = autoLlmEnabled ? 'no-api-key' : 'auto-llm-disabled';
    }

    return NextResponse.json({
      status: 'accepted',
      item: newsItem,
      persistent: isPersistent(),
      summaryReason: inlineSummaryReason,
      message: inlineSummary
        ? 'Email stored with AI summary.'
        : 'Email stored. AI summary will be filled in on first view or via backfill.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to process email: ${message}` }, { status: 500 });
  }
}

// GET endpoint for status / pipeline info
export async function GET(request: NextRequest) {
  // If ?items=1, return the stored items (used by the news-feed UI).
  // Also report `hasApiKey` so the client can display a warning banner when
  // no LLM key is reaching runtime (the classic "env var set in Vercel but
  // not redeployed" failure mode that otherwise silently produces empty AI
  // summaries). `provider` tells the UI which LLM will actually be used.
  if (request.nextUrl.searchParams.get('items') === '1') {
    const items = await getInboundItems();
    return NextResponse.json({
      items,
      total: items.length,
      persistent: isPersistent(),
      hasApiKey: hasAnyLLMKey(),
      provider: pickLLMProvider(),
    });
  }
  const items = await getInboundItems();
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/inbound-email',
    authentication: 'Bearer token or ?secret= query param',
    acceptedFormats: ['application/json', 'multipart/form-data', 'text/plain'],
    storedItems: items.length,
    itemsWithAiSummary: items.filter((i) => !!i.aiSummary).length,
    hasApiKey: hasAnyLLMKey(),
    provider: pickLLMProvider(),
    persistent: isPersistent(),
    setup: {
      recommended: 'Pipedream (free) — gives you an @pipedream.net address that POSTs here',
      alternatives: ['Zapier Email by Zapier (free)', 'CloudMailin', 'Google Apps Script'],
      webhookUrlExample: 'https://YOUR-APP.vercel.app/api/inbound-email?secret=YOUR_SECRET',
    },
  });
}

// ── PATCH: edit a stored inbound email ─────────────────────────────────────
// Used by the News Feed UI to edit title/summary/aiSummary/tags of emails
// that came in through the webhook. Unlike POST, no secret is required:
// this is a first-party in-app action, not a public ingest.
//
// Body: { id: string, title?, summary?, fullText?, aiSummary?, tags? }
export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    const existing = await findInboundItem(id);
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const patch: Partial<InboundEmailItem> = {};
    if (typeof body.title === 'string') patch.title = body.title.slice(0, 500);
    if (typeof body.summary === 'string') patch.summary = body.summary.slice(0, 20000);
    if (typeof body.fullText === 'string') patch.fullText = body.fullText.slice(0, 200000);
    if (typeof body.aiSummary === 'string') patch.aiSummary = body.aiSummary.slice(0, 20000);
    if (Array.isArray(body.tags)) {
      patch.tags = (body.tags as unknown[])
        .filter((t): t is string => typeof t === 'string')
        .map(t => t.trim().slice(0, 50))
        .filter(Boolean)
        .slice(0, 30);
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ status: 'noop', item: existing });
    }

    const updated = await updateInboundItem(id, patch);
    return NextResponse.json({ status: 'updated', item: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to update inbound email: ${message}` },
      { status: 500 },
    );
  }
}

// ── DELETE: remove a stored inbound email ──────────────────────────────────
// Body or query param ?id=XXX. No secret required; same rationale as PATCH.
export async function DELETE(request: NextRequest) {
  try {
    let id = request.nextUrl.searchParams.get('id') || '';
    if (!id) {
      try {
        const body = (await request.json()) as { id?: unknown };
        if (typeof body.id === 'string') id = body.id;
      } catch { /* no body */ }
    }
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const ok = await removeInboundItem(id);
    if (!ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ status: 'deleted', id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to delete inbound email: ${message}` },
      { status: 500 },
    );
  }
}
