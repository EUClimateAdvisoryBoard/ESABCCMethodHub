// ---------------------------------------------------------------------------
// AI code-segment suggestion — proposes coded segments for a document.
//
// POST /api/content-analysis/suggest-codes
//   body: {
//     document: { id, title, blocks?, text? },
//     codes:    [{ id, parentId, name, description? }, ...]  // master codes
//     limit?:   number   // max suggestions (default 30, capped at 80)
//   }
//
// Calls Gemini to pick verbatim quotes from the document and assign each
// one a master code with a short rationale. Returns a batch of pending
// suggestions — the client promotes them into real CodedSegments via
// the track-changes Accept/Reject UI.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import type { Block, CodeNode } from '@/lib/content-analysis/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GEMINI_MODEL = 'gemini-2.5-flash';
const MAX_BLOCKS_SENT = 160;
const MAX_CHARS_PER_BLOCK = 700;
const MAX_TOTAL_CHARS = 90_000;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 80;

interface SuggestRequestBody {
  document?: {
    id?: string;
    title?: string;
    shortTitle?: string;
    blocks?: Array<Pick<Block, 'id' | 'page' | 'kind' | 'text'>>;
    text?: string;
  };
  codes?: Array<Pick<CodeNode, 'id' | 'parentId' | 'name' | 'description'>>;
  limit?: number;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not set on the server' },
      { status: 501 },
    );
  }

  let body: SuggestRequestBody;
  try {
    body = (await req.json()) as SuggestRequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const doc = body.document;
  const codes = body.codes ?? [];
  if (!doc || (!doc.blocks?.length && !doc.text)) {
    return NextResponse.json(
      { error: 'document.blocks or document.text required' },
      { status: 400 },
    );
  }
  if (codes.length === 0) {
    return NextResponse.json({ error: 'codes required' }, { status: 400 });
  }
  const limit = Math.max(
    1,
    Math.min(MAX_LIMIT, Number.isFinite(body.limit) ? (body.limit as number) : DEFAULT_LIMIT),
  );

  // ── Build the prompt ─────────────────────────────────────────────────
  const codeCatalog = codes
    .map(c => {
      const parent = c.parentId
        ? codes.find(p => p.id === c.parentId)?.name ?? '—'
        : 'ROOT';
      const desc = c.description ? ` — ${c.description}` : '';
      return `- ${c.id} :: ${c.name} (parent: ${parent})${desc}`;
    })
    .join('\n');

  const blocksForPrompt = (doc.blocks ?? []).slice(0, MAX_BLOCKS_SENT);
  let content = '';
  let charBudget = MAX_TOTAL_CHARS;
  if (blocksForPrompt.length > 0) {
    const rows: string[] = [];
    for (const b of blocksForPrompt) {
      const snippet = (b.text ?? '').replace(/\r\n/g, '\n').slice(0, MAX_CHARS_PER_BLOCK);
      const row = `[${b.id} · p${b.page} · ${b.kind}] ${snippet}`;
      if (row.length > charBudget) break;
      rows.push(row);
      charBudget -= row.length + 1;
    }
    content = rows.join('\n');
  } else if (doc.text) {
    content = doc.text.slice(0, MAX_TOTAL_CHARS);
  }

  const prompt = [
    `You are a qualitative-research assistant pre-coding an EU policy document for an analyst.`,
    `Pick specific VERBATIM quotes from the document and assign each to the single best master code.`,
    `Quotes should be concise (1–3 sentences, ≤ 350 characters) and self-contained.`,
    `Only code passages where the code clearly applies — skip boilerplate, footers and references.`,
    `Return at most ${limit} suggestions. Prefer breadth across the document: do not cluster all`,
    `suggestions under one code unless the document is single-topic.`,
    ``,
    `Document title: ${doc.title ?? doc.shortTitle ?? doc.id ?? '(untitled)'}`,
    ``,
    `CODE SYSTEM (id :: name (parent) — description):`,
    codeCatalog,
    ``,
    `DOCUMENT CONTENT${blocksForPrompt.length > 0 ? ' (blocks tagged with [id · page · kind])' : ''}:`,
    content,
    ``,
    `For each suggestion return:`,
    `  - codeId: the exact id from the catalog above (never invent)`,
    `  - quote: the verbatim passage, copied exactly from the document (no paraphrasing, no ellipsis)`,
    `  - blockId: the block id the quote comes from (omit if input was unblocked plain text)`,
    `  - rationale: ≤ 160 chars, explain why the code applies, grounded in the quote`,
    `  - confidence: 0–1`,
    `Return an empty array if the document has nothing to code.`,
  ].join('\n');

  const reqBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.15,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
      responseSchema: {
        type: 'OBJECT',
        properties: {
          suggestions: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                codeId: { type: 'STRING' },
                quote: { type: 'STRING' },
                blockId: { type: 'STRING' },
                rationale: { type: 'STRING' },
                confidence: { type: 'NUMBER' },
              },
              required: ['codeId', 'quote', 'rationale', 'confidence'],
            },
          },
        },
        required: ['suggestions'],
      },
    },
  };

  let resp: Response;
  try {
    resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(reqBody),
      },
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'gemini network error', detail: String(err) },
      { status: 502 },
    );
  }

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    return NextResponse.json(
      { error: `gemini returned ${resp.status}`, detail: errText.slice(0, 500) },
      { status: 502 },
    );
  }

  const data = (await resp.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const finishReason = data.candidates?.[0]?.finishReason;
  if (!rawText) {
    return NextResponse.json(
      {
        error: 'gemini returned empty response',
        finishReason,
        hint: finishReason === 'MAX_TOKENS'
          ? 'Output truncated — shorten the document or reduce the code catalog.'
          : undefined,
      },
      { status: 502 },
    );
  }

  const cleaned = extractJson(rawText);
  let parsed: { suggestions?: Array<Record<string, unknown>> };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: 'gemini returned non-JSON', finishReason, raw: rawText.slice(0, 500) },
      { status: 502 },
    );
  }

  // ── Validate & anchor suggestions to real offsets in the document ─────
  // The model may return quotes with slightly different whitespace or
  // punctuation than the source. We locate each quote inside the
  // referenced block (or the flat text) with a small normalisation
  // fallback; suggestions that can't be anchored are dropped.
  const validCodeIds = new Set(codes.map(c => c.id));
  const blockById = new Map(
    (doc.blocks ?? []).map(b => [b.id, b] as const),
  );

  interface OutSuggestion {
    codeId: string;
    blockId?: string;
    startChar: number;
    endChar: number;
    quote: string;
    rationale: string;
    confidence: number;
  }
  const suggestions: OutSuggestion[] = [];
  const seenKeys = new Set<string>();

  for (const raw of parsed.suggestions ?? []) {
    const codeId = typeof raw.codeId === 'string' ? raw.codeId : '';
    if (!validCodeIds.has(codeId)) continue;
    const rawQuote = typeof raw.quote === 'string' ? raw.quote : '';
    const quote = rawQuote.trim();
    if (!quote || quote.length < 8) continue;

    const confidence = typeof raw.confidence === 'number'
      ? Math.max(0, Math.min(1, raw.confidence))
      : 0.5;
    const rationale = typeof raw.rationale === 'string' ? raw.rationale.slice(0, 240) : '';
    const suggestedBlockId = typeof raw.blockId === 'string' ? raw.blockId : '';

    // Search order:
    //   1. the block the model cited, if any;
    //   2. other blocks (first match wins);
    //   3. the flat text fallback.
    const anchor = anchorQuote(quote, suggestedBlockId, doc.blocks ?? [], doc.text ?? '');
    if (!anchor) continue;

    // De-dupe: a given (codeId + quote) only appears once.
    const key = `${codeId}::${anchor.quote.toLowerCase().slice(0, 60)}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    suggestions.push({
      codeId,
      blockId: anchor.blockId || (blockById.has(suggestedBlockId) ? suggestedBlockId : undefined),
      startChar: anchor.start,
      endChar: anchor.end,
      quote: anchor.quote,
      rationale,
      confidence,
    });
    if (suggestions.length >= limit) break;
  }

  // Sort by confidence desc so the analyst reviews the strongest
  // suggestions first.
  suggestions.sort((a, b) => b.confidence - a.confidence);

  return NextResponse.json({
    documentId: doc.id ?? null,
    model: GEMINI_MODEL,
    suggestions,
    totalProposed: parsed.suggestions?.length ?? 0,
    accepted: suggestions.length,
  });
}

/** Locate a quote in the document. Returns the first successful match
 *  across the preferred block, then other blocks, then the flat text.
 *  Normalises whitespace for the fuzzy pass so minor reformatting in
 *  the model's output doesn't drop otherwise-valid suggestions. */
function anchorQuote(
  quote: string,
  preferredBlockId: string,
  blocks: Array<Pick<Block, 'id' | 'text'>>,
  flatText: string,
): { blockId: string; start: number; end: number; quote: string } | null {
  const normalise = (s: string) => s.replace(/\s+/g, ' ').trim();
  const needle = normalise(quote);
  if (!needle) return null;

  const tryBlock = (block: Pick<Block, 'id' | 'text'>) => {
    const hay = block.text ?? '';
    const idxExact = hay.indexOf(quote);
    if (idxExact >= 0) {
      return { blockId: block.id, start: idxExact, end: idxExact + quote.length, quote };
    }
    const hayNorm = normalise(hay);
    const idxNorm = hayNorm.indexOf(needle);
    if (idxNorm >= 0) {
      // Map the normalised-space index back to the original string by
      // walking character-by-character. Good enough for typical EU-Lex
      // text; pathological whitespace would fall back to flat-text.
      const mapped = mapNormalisedIndex(hay, idxNorm);
      if (mapped >= 0) {
        const end = Math.min(mapped + needle.length, hay.length);
        return { blockId: block.id, start: mapped, end, quote: hay.slice(mapped, end) };
      }
    }
    return null;
  };

  if (preferredBlockId) {
    const b = blocks.find(b => b.id === preferredBlockId);
    if (b) {
      const hit = tryBlock(b);
      if (hit) return hit;
    }
  }
  for (const b of blocks) {
    if (b.id === preferredBlockId) continue;
    const hit = tryBlock(b);
    if (hit) return hit;
  }
  // Flat-text fallback (no blockId).
  if (flatText) {
    const idxExact = flatText.indexOf(quote);
    if (idxExact >= 0) {
      return { blockId: '', start: idxExact, end: idxExact + quote.length, quote };
    }
    const flatNorm = normalise(flatText);
    const idxNorm = flatNorm.indexOf(needle);
    if (idxNorm >= 0) {
      const mapped = mapNormalisedIndex(flatText, idxNorm);
      if (mapped >= 0) {
        const end = Math.min(mapped + needle.length, flatText.length);
        return { blockId: '', start: mapped, end, quote: flatText.slice(mapped, end) };
      }
    }
  }
  return null;
}

/** Given an original string and an index into its whitespace-normalised
 *  projection, return the closest matching index in the original. Walks
 *  both strings in lockstep, skipping runs of whitespace in the original
 *  that collapse to a single space in the normalised form. */
function mapNormalisedIndex(original: string, normIdx: number): number {
  let o = 0;
  let n = 0;
  // Skip any leading whitespace in original — the normalised form
  // trims, so n starts at 0 after the leading skip.
  while (o < original.length && /\s/.test(original[o])) o++;
  while (o < original.length && n < normIdx) {
    if (/\s/.test(original[o])) {
      // Collapse a run of whitespace in original into one normalised space.
      while (o < original.length && /\s/.test(original[o])) o++;
      n++;
    } else {
      o++;
      n++;
    }
  }
  return n === normIdx ? o : -1;
}

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    return trimmed;
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) return fence[1].trim();
  const starts = [trimmed.indexOf('{'), trimmed.indexOf('[')].filter(i => i >= 0);
  if (starts.length === 0) return trimmed;
  const start = Math.min(...starts);
  const open = trimmed[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return trimmed.slice(start, i + 1);
    }
  }
  return trimmed.slice(start);
}
