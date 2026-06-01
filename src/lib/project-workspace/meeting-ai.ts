/**
 * LLM helpers for the Meetings module.
 * ------------------------------------
 * Two server-side helpers, both built on the shared multi-provider
 * `callLLM` dispatcher in `src/lib/ai-summary.ts` (Azure OpenAI / Gemini /
 * Anthropic / OpenAI, auto-selected from the environment):
 *
 *   • extractKeyPoints  — pulls the "main three things" out of a meeting's
 *                         notes / minutes as a clean array of short strings.
 *   • generateSummary   — writes a tight prose summary of the meeting.
 *
 * Neither throws: callers get a `{ ok, ... , reason }` result so the UI can
 * show a friendly "add an API key" message instead of erroring.
 */
import 'server-only';
import { callLLM, hasAnyLLMKey } from '@/lib/ai-summary';

const MIN_CHARS = 60;
const MAX_CHARS = 12000;

export interface KeyPointsResult {
  ok: boolean;
  keyPoints: string[];
  reason?: string;
}

export interface SummaryResult {
  ok: boolean;
  summary: string;
  reason?: string;
}

/** Join whatever meeting text we have into one block for the model. */
function meetingText(parts: { notes?: string; minutes?: string; summary?: string }): string {
  return [
    parts.minutes?.trim() ? `MINUTES:\n${parts.minutes.trim()}` : '',
    parts.notes?.trim() ? `NOTES:\n${parts.notes.trim()}` : '',
    parts.summary?.trim() ? `EXISTING SUMMARY:\n${parts.summary.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, MAX_CHARS);
}

/**
 * Extract the three most important takeaways from a meeting. Asks for strict
 * JSON and parses defensively (models occasionally wrap JSON in prose or a
 * ```json fence).
 */
export async function extractKeyPoints(parts: {
  title?: string;
  notes?: string;
  minutes?: string;
  summary?: string;
}): Promise<KeyPointsResult> {
  if (!hasAnyLLMKey()) return { ok: false, keyPoints: [], reason: 'no-api-key' };
  const text = meetingText(parts);
  if (text.length < MIN_CHARS) return { ok: false, keyPoints: [], reason: 'body-too-short' };

  const prompt =
    `You are assisting the European Scientific Advisory Board on Climate Change (ESABCC) ` +
    `Secretariat. From the meeting record below, identify the THREE most important things — ` +
    `the key decisions, conclusions or action points a colleague who missed the meeting must know.\n\n` +
    `Rules:\n` +
    `- Return EXACTLY three items, most important first.\n` +
    `- Each item is one concrete sentence (max ~22 words). No preamble, no numbering inside the text.\n` +
    `- UK English. Be specific (names, dates, figures) where the record allows.\n` +
    `- Respond with ONLY a JSON array of three strings, nothing else.\n\n` +
    (parts.title ? `Meeting: ${parts.title}\n\n` : '') +
    text;

  const res = await callLLM(prompt, { maxTokens: 400, temperature: 0.2 });
  if (res.reason !== 'ok' || !res.text) {
    return { ok: false, keyPoints: [], reason: res.reason ?? 'api-error' };
  }
  const points = parseStringArray(res.text);
  if (points.length === 0) return { ok: false, keyPoints: [], reason: 'parse-failed' };
  return { ok: true, keyPoints: points.slice(0, 3) };
}

/** Write a short prose summary of the meeting from its notes / minutes. */
export async function generateSummary(parts: {
  title?: string;
  notes?: string;
  minutes?: string;
}): Promise<SummaryResult> {
  if (!hasAnyLLMKey()) return { ok: false, summary: '', reason: 'no-api-key' };
  const text = meetingText(parts);
  if (text.length < MIN_CHARS) return { ok: false, summary: '', reason: 'body-too-short' };

  const prompt =
    `Summarise this meeting in 3-5 sentences for the ESABCC Secretariat. Cover what was ` +
    `discussed, what was decided, and who does what next. UK English, plain prose, no bullet ` +
    `points, no preamble ("This meeting...").\n\n` +
    (parts.title ? `Meeting: ${parts.title}\n\n` : '') +
    text;

  const res = await callLLM(prompt, { maxTokens: 500, temperature: 0.3 });
  if (res.reason !== 'ok' || !res.text) {
    return { ok: false, summary: '', reason: res.reason ?? 'api-error' };
  }
  return { ok: true, summary: res.text };
}

/**
 * Pull a JSON string array out of a model response, tolerating ```json
 * fences and trailing prose. Falls back to splitting numbered / bulleted
 * lines if the JSON parse fails.
 */
function parseStringArray(raw: string): string[] {
  const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start !== -1 && end > start) {
    try {
      const arr = JSON.parse(cleaned.slice(start, end + 1));
      if (Array.isArray(arr)) {
        return arr.map(x => String(x).trim()).filter(Boolean);
      }
    } catch {
      /* fall through to line parsing */
    }
  }
  // Fallback: one point per non-empty line, stripping list markers.
  return cleaned
    .split('\n')
    .map(l => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').replace(/^["']|["']$/g, '').trim())
    .filter(Boolean)
    .slice(0, 3);
}
