/**
 * Multi-provider LLM summariser for forwarded newsletters / emails.
 *
 * Supports four providers, auto-selected from the environment:
 *   - Azure OpenAI    (AZURE_OPENAI_API_KEY + AZURE_OPENAI_ENDPOINT) — enterprise
 *   - Google Gemini   (GEMINI_API_KEY)    — free tier
 *   - Anthropic Claude (ANTHROPIC_API_KEY) — prepaid credits
 *   - OpenAI          (OPENAI_API_KEY)    — prepaid credits
 *
 * Auto-detection priority when multiple keys are set: Azure OpenAI > Gemini >
 * Anthropic > OpenAI. To force a specific provider, set
 * `LLM_PROVIDER=azure-openai|gemini|anthropic|openai`.
 *
 * Used by:
 *   - /api/inbound-email/summarize  — on-demand summaries when a user opens
 *                                     an email card in the news feed modal
 *   - /api/inbound-email/backfill   — bulk retroactive summarisation
 *   - /api/brussels-bulletin        — structured JSON for the monthly bulletin
 *
 * Returns an empty string with a `reason` when no key is set, the body is
 * too short, or the API call fails. Callers should treat an empty string as
 * "no summary" and surface `reason` / `errorBody` to the UI for diagnostics.
 */

// ── Model identifiers ──────────────────────────────────────────────────────

const ANTHROPIC_MODEL_SHORT = 'claude-haiku-4-5-20251001';
const ANTHROPIC_MODEL_LONG = 'claude-sonnet-4-6';
const GEMINI_MODEL = 'gemini-2.5-flash';
const OPENAI_MODEL = 'gpt-4o-mini';
// Azure OpenAI uses deployment names, not model IDs. The deployment name is
// read from AZURE_OPENAI_DEPLOYMENT (defaults to 'gpt-4o-mini').
const AZURE_OPENAI_DEFAULT_DEPLOYMENT = 'gpt-4o-mini';
const AZURE_OPENAI_DEFAULT_API_VERSION = '2024-12-01-preview';

// ── Length guards for summary inputs ───────────────────────────────────────

const MAX_TOKENS = 500;
const MIN_BODY_CHARS = 120;
const MAX_BODY_CHARS = 8000;

// ── Provider selection ─────────────────────────────────────────────────────

export type LLMProvider = 'anthropic' | 'gemini' | 'openai' | 'azure-openai';

/**
 * Picks which provider to use based on env vars. Returns null if no key is
 * configured. `LLM_PROVIDER` overrides auto-detection when you want to force
 * a specific provider while keeping multiple keys around (e.g. testing a
 * switch from Anthropic to Gemini without removing the Anthropic key).
 */
export function pickLLMProvider(): LLMProvider | null {
  const forced = process.env.LLM_PROVIDER?.toLowerCase();
  if (forced === 'azure-openai' && process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) return 'azure-openai';
  if (forced === 'anthropic' && process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (forced === 'gemini' && process.env.GEMINI_API_KEY) return 'gemini';
  if (forced === 'openai' && process.env.OPENAI_API_KEY) return 'openai';

  // Auto-detect. We prefer Azure OpenAI first because it uses the org's
  // enterprise quota (no personal billing). Then Gemini for its free tier,
  // then Anthropic/OpenAI which require prepaid credits.
  if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) return 'azure-openai';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return null;
}

export function hasAnyLLMKey(): boolean {
  return pickLLMProvider() !== null;
}

// ── Shared result type ─────────────────────────────────────────────────────

export interface LLMResult {
  text: string;
  reason?: 'ok' | 'no-api-key' | 'body-too-short' | 'api-error' | 'network-error';
  statusCode?: number;
  errorBody?: string;
  provider?: LLMProvider;
}

// Back-compat alias for call sites that still import `SummaryResult`.
export type SummaryResult = LLMResult;

export interface CallOptions {
  maxTokens: number;
  temperature?: number;
  /** Optional system prompt. Anthropic/OpenAI support it natively; for Gemini
   *  it's prepended to the user prompt because Gemini's v1beta API doesn't
   *  have a first-class system role. */
  system?: string;
  /** Use the provider's "long" / higher-quality model variant. Only meaningful
   *  for Anthropic right now (Sonnet vs Haiku). Gemini & OpenAI ignore it. */
  longModel?: boolean;
  /** Cap / disable Gemini's hidden "thinking" budget. 0 disables thinking
   *  entirely; any positive number caps the reasoning tokens so the visible
   *  output budget is guaranteed. Ignored by non-Gemini providers. */
  geminiThinkingBudget?: number;
}

// ── Generic dispatch ───────────────────────────────────────────────────────

/**
 * Generic LLM call that dispatches to whichever provider is configured.
 * Never throws — always returns an `LLMResult` with a `reason` so callers
 * can decide how to surface failures.
 */
export async function callLLM(prompt: string, options: CallOptions): Promise<LLMResult> {
  const provider = pickLLMProvider();
  if (!provider) return { text: '', reason: 'no-api-key' };

  if (provider === 'azure-openai') return callAzureOpenAI(prompt, options);
  if (provider === 'anthropic') return callAnthropic(prompt, options);
  if (provider === 'gemini') return callGemini(prompt, options);
  if (provider === 'openai') return callOpenAI(prompt, options);
  return { text: '', reason: 'no-api-key' };
}

// ── Retry helper for transient LLM API errors ─────────────────────────────

// Statuses that we consider transient and worth retrying on. 429 = rate
// limit; 5xx = server-side issues. 529 is Anthropic's "overloaded". 503 is
// Gemini's "experiencing high demand".
const RETRY_STATUS = new Set([408, 429, 500, 502, 503, 504, 529]);

// Keep the total added latency under ~3s so we don't blow the Vercel 10s
// serverless timeout when a burst of retries happens inside a single request.
const MAX_RETRIES = 2;
const BACKOFF_MS = [750, 2000];

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Wraps `fetch` with exponential-backoff retries for transient errors.
 * Only retries on the statuses in `RETRY_STATUS`; anything else (including
 * 4xx client errors like 401/403) is returned immediately so callers can
 * surface the real reason in the UI. The body of each retried response is
 * drained so the connection can be reused.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string,
): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, init);
    if (res.ok || !RETRY_STATUS.has(res.status) || attempt === MAX_RETRIES) {
      return res;
    }
    // Honour Retry-After if the server sent one, otherwise fixed backoff.
    let wait = BACKOFF_MS[attempt] ?? 2000;
    const retryAfter = res.headers.get('retry-after');
    if (retryAfter) {
      const secs = parseInt(retryAfter, 10);
      if (!isNaN(secs)) wait = Math.min(Math.max(secs * 1000, 250), 5000);
    }
    console.warn(`[${label}] ${res.status} on attempt ${attempt + 1}/${MAX_RETRIES + 1}, retrying in ${wait}ms`);
    // Drain body so the socket can be reused.
    try { await res.text(); } catch { /* noop */ }
    await sleep(wait);
  }
  // Unreachable — the loop either returns or exhausts retries above.
  throw new Error(`[${label}] fetchWithRetry exhausted without returning`);
}

// ── Anthropic ──────────────────────────────────────────────────────────────

async function callAnthropic(prompt: string, options: CallOptions): Promise<LLMResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { text: '', reason: 'no-api-key', provider: 'anthropic' };

  const model = options.longModel ? ANTHROPIC_MODEL_LONG : ANTHROPIC_MODEL_SHORT;
  const body: Record<string, unknown> = {
    model,
    max_tokens: options.maxTokens,
    messages: [{ role: 'user', content: prompt }],
  };
  if (options.temperature !== undefined) body.temperature = options.temperature;
  if (options.system) body.system = options.system;

  try {
    const res = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    }, 'Anthropic');
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[Anthropic] ${res.status}:`, errText.substring(0, 500));
      return {
        text: '',
        reason: 'api-error',
        statusCode: res.status,
        errorBody: errText.substring(0, 500),
        provider: 'anthropic',
      };
    }
    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    return {
      text: data.content?.[0]?.text?.trim() || '',
      reason: 'ok',
      provider: 'anthropic',
    };
  } catch (err) {
    console.error('[Anthropic] network error:', err);
    return {
      text: '',
      reason: 'network-error',
      errorBody: err instanceof Error ? err.message : String(err),
      provider: 'anthropic',
    };
  }
}

// ── Google Gemini ──────────────────────────────────────────────────────────

async function callGemini(prompt: string, options: CallOptions): Promise<LLMResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { text: '', reason: 'no-api-key', provider: 'gemini' };

  // Gemini v1beta generateContent doesn't have a first-class "system" role,
  // so prepend the system prompt to the user prompt when one was supplied.
  const fullPrompt = options.system ? `${options.system}\n\n${prompt}` : prompt;

  // Gemini 2.5 Flash has "thinking" on by default, which consumes part of the
  // output token budget before a single character of visible output is
  // produced. For short summary calls (maxTokens ≤ 500) that's catastrophic —
  // thinking eats most of the budget and we get a 1-sentence stub like
  // "The European Commission proposed strengthening the EU ETS". Disable
  // thinking for short calls, leave it on for long-form calls (Brussels
  // Bulletin, detailed analysis) where the extra reasoning helps.
  // Callers can also override via `geminiThinkingBudget` (0 disables; a
  // positive number caps reasoning tokens so visible output is guaranteed).
  const thinkingBudget =
    options.geminiThinkingBudget !== undefined
      ? options.geminiThinkingBudget
      : options.maxTokens <= 500
        ? 0
        : undefined;

  const reqBody: Record<string, unknown> = {
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: {
      maxOutputTokens: options.maxTokens,
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      ...(thinkingBudget !== undefined ? { thinkingConfig: { thinkingBudget } } : {}),
    },
  };

  try {
    const res = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(reqBody),
      },
      'Gemini',
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[Gemini] ${res.status}:`, errText.substring(0, 500));
      return {
        text: '',
        reason: 'api-error',
        statusCode: res.status,
        errorBody: errText.substring(0, 500),
        provider: 'gemini',
      };
    }
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    return { text, reason: 'ok', provider: 'gemini' };
  } catch (err) {
    console.error('[Gemini] network error:', err);
    return {
      text: '',
      reason: 'network-error',
      errorBody: err instanceof Error ? err.message : String(err),
      provider: 'gemini',
    };
  }
}

// ── OpenAI ─────────────────────────────────────────────────────────────────

async function callOpenAI(prompt: string, options: CallOptions): Promise<LLMResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { text: '', reason: 'no-api-key', provider: 'openai' };

  const messages: Array<{ role: string; content: string }> = [];
  if (options.system) messages.push({ role: 'system', content: options.system });
  messages.push({ role: 'user', content: prompt });

  const reqBody: Record<string, unknown> = {
    model: OPENAI_MODEL,
    messages,
    max_tokens: options.maxTokens,
  };
  if (options.temperature !== undefined) reqBody.temperature = options.temperature;

  try {
    const res = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(reqBody),
    }, 'OpenAI');
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[OpenAI] ${res.status}:`, errText.substring(0, 500));
      return {
        text: '',
        reason: 'api-error',
        statusCode: res.status,
        errorBody: errText.substring(0, 500),
        provider: 'openai',
      };
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return {
      text: data.choices?.[0]?.message?.content?.trim() || '',
      reason: 'ok',
      provider: 'openai',
    };
  } catch (err) {
    console.error('[OpenAI] network error:', err);
    return {
      text: '',
      reason: 'network-error',
      errorBody: err instanceof Error ? err.message : String(err),
      provider: 'openai',
    };
  }
}

// ── Azure OpenAI (enterprise / Copilot deployments) ──────────────────────

async function callAzureOpenAI(prompt: string, options: CallOptions): Promise<LLMResult> {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT; // e.g. https://myorg.openai.azure.com
  if (!apiKey || !endpoint) return { text: '', reason: 'no-api-key', provider: 'azure-openai' };

  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || AZURE_OPENAI_DEFAULT_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || AZURE_OPENAI_DEFAULT_API_VERSION;

  const messages: Array<{ role: string; content: string }> = [];
  if (options.system) messages.push({ role: 'system', content: options.system });
  messages.push({ role: 'user', content: prompt });

  const reqBody: Record<string, unknown> = {
    messages,
    max_tokens: options.maxTokens,
  };
  if (options.temperature !== undefined) reqBody.temperature = options.temperature;

  // Azure OpenAI endpoint format:
  // {endpoint}/openai/deployments/{deployment}/chat/completions?api-version={version}
  const base = endpoint.replace(/\/+$/, '');
  const url = `${base}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  try {
    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(reqBody),
    }, 'AzureOpenAI');
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[AzureOpenAI] ${res.status}:`, errText.substring(0, 500));
      return {
        text: '',
        reason: 'api-error',
        statusCode: res.status,
        errorBody: errText.substring(0, 500),
        provider: 'azure-openai',
      };
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return {
      text: data.choices?.[0]?.message?.content?.trim() || '',
      reason: 'ok',
      provider: 'azure-openai',
    };
  } catch (err) {
    console.error('[AzureOpenAI] network error:', err);
    return {
      text: '',
      reason: 'network-error',
      errorBody: err instanceof Error ? err.message : String(err),
      provider: 'azure-openai',
    };
  }
}

// ── High-level wrappers (call sites stay identical) ───────────────────────

export async function generateAiSummaryDetailed(subject: string, body: string): Promise<LLMResult> {
  if (!hasAnyLLMKey()) return { text: '', reason: 'no-api-key' };

  const trimmed = (body || '').substring(0, MAX_BODY_CHARS);
  if (trimmed.length < MIN_BODY_CHARS) return { text: '', reason: 'body-too-short' };

  const prompt =
    `Summarize this forwarded newsletter or email in 5-7 sentences for an EU climate-policy audience. ` +
    `Cover the concrete substance: the specific policies, actors, numbers, decisions, timelines, and any noteworthy ` +
    `context or disagreement. Write it as a self-contained briefing paragraph that a reader could use without ` +
    `opening the email. No preamble, no meta ("This email discusses..."), no bullet points - just the summary prose.\n\n` +
    `Subject: ${subject || '(no subject)'}\n\nBody:\n${trimmed}`;

  return callLLM(prompt, { maxTokens: MAX_TOKENS });
}

/** Back-compat convenience wrapper that only returns the text. */
export async function generateAiSummary(subject: string, body: string): Promise<string> {
  const { text } = await generateAiSummaryDetailed(subject, body);
  return text;
}

/**
 * Longer, structured analysis for the daily Climate Action Press Review.
 * These emails typically cover 10-30 distinct items across multiple themes,
 * so we ask for an executive summary + 4-8 themed sections with bullets +
 * a strategic outlook paragraph at the end.
 *
 * Uses the long/high-quality model variant (e.g. Claude Sonnet instead of
 * Haiku) and a generous 2400-token budget to produce a substantial briefing
 * that the Secretariat can use as a standalone daily digest.
 *
 * Throws on API failure so the on-demand /summarize endpoint can surface
 * the real error (missing key, rate limit, etc.) in the UI.
 */
export async function generateDetailedAnalysis(subject: string, body: string): Promise<string> {
  if (!hasAnyLLMKey()) {
    throw new Error(
      'No LLM API key set — add AZURE_OPENAI_API_KEY + AZURE_OPENAI_ENDPOINT (enterprise), GEMINI_API_KEY (free tier), ANTHROPIC_API_KEY, or OPENAI_API_KEY to the environment.',
    );
  }

  const trimmed = (body || '').substring(0, 14000);
  if (trimmed.length < MIN_BODY_CHARS) return '';

  const prompt =
    `You are a senior EU climate-policy analyst writing for the European Scientific Advisory Board on Climate Change (ESABCC) Secretariat.\n\n` +
    `This is the European Commission's daily Climate Action Press Review — a comprehensive roundup of the most important ` +
    `climate-policy stories from across Europe on a given day, typically covering 10-30 distinct items on ` +
    `different topics (2040 target, ETS, CBAM, energy, transport, agriculture, international negotiations, etc.).\n\n` +
    `Write a thorough, analytical briefing structured as follows:\n\n` +
    `1. **Executive Summary** (4-6 sentences): Open with the single most consequential development of the day, ` +
    `then summarise the 2-3 other headline stories. Quantify where possible (Mt CO₂-eq, €bn, GW, percentage targets). ` +
    `This paragraph should give a reader who only reads the top a complete picture of the day.\n\n` +
    `2. **Thematic Sections** (4-8 sections): Each section gets a bold heading on its own line, ` +
    `followed by 3-5 bullet points (prefix "• "). Themes should emerge naturally from the content — typical ones include:\n` +
    `   - EU Institutional Developments (Commission proposals, Council conclusions, Parliament votes)\n` +
    `   - Member State Action (national plans, domestic legislation, court rulings)\n` +
    `   - Carbon Pricing & Markets (ETS, CBAM, voluntary markets, carbon price movements)\n` +
    `   - Energy Transition (renewables deployment, grid, storage, fossil fuel phase-out)\n` +
    `   - Transport & Mobility (CO₂ standards, e-fuels, aviation, shipping)\n` +
    `   - Industry & Finance (green taxonomy, sustainable finance, industrial decarbonisation)\n` +
    `   - International & Diplomacy (UNFCCC, bilateral deals, COP process)\n` +
    `   - Reports & Analysis (new studies, data releases, projections)\n` +
    `   Only include sections that have substantive content from the press review.\n\n` +
    `3. **Outlook & Implications** (2-3 sentences): Close with what these developments mean for the ` +
    `coming days/weeks — upcoming votes, consultations, deadlines, or political dynamics to watch.\n\n` +
    `Style rules:\n` +
    `- UK English throughout\n` +
    `- Be concrete: name specific dates, legislative references (e.g. Regulation (EU) 2024/…), bodies ` +
    `(Commission, ENVI Committee, European Council), Commissioners, Ministers, and exact numbers from sources\n` +
    `- Distinguish between adopted, proposed, and rumoured measures\n` +
    `- Do NOT invent facts — if the source is vague, say so\n` +
    `- Do NOT start with meta preamble ("This press review covers…") — begin directly with substance\n` +
    `- Cross-reference related items (e.g. "complementing the ETS reform discussed above")\n\n` +
    `Subject: ${subject || '(no subject)'}\n\nBody:\n${trimmed}`;

  const result = await callLLM(prompt, { maxTokens: 2400, temperature: 0.25, longModel: true });
  if (result.reason !== 'ok') {
    const status = result.statusCode ? ` ${result.statusCode}` : '';
    const errBody = result.errorBody ? ` — ${result.errorBody}` : '';
    throw new Error(`LLM call failed (${result.provider || 'unknown'}): ${result.reason}${status}${errBody}`);
  }
  return result.text;
}
