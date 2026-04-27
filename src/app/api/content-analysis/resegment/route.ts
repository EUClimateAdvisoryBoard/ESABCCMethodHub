// ---------------------------------------------------------------------------
// AI block re-segmentation.
//
// POST /api/content-analysis/resegment
//   body: { document: { id, title, text } }
//
// Calls Gemini to break the document text into logical blocks —
// headings / recitals / articles / paragraphs / footers — so the
// block cards in the workbench line up with the document's structure
// instead of whatever the naive paragraph-splitter produced from
// newlines. Returns { blocks: [{ kind, text }], model }.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import type { Block, BlockKind } from '@/lib/content-analysis/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GEMINI_MODEL = 'gemini-2.5-flash';
const MAX_CHARS = 120_000;

interface ResegmentRequestBody {
  document?: {
    id?: string;
    title?: string;
    text?: string;
  };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not set on the server' },
      { status: 501 },
    );
  }
  let body: ResegmentRequestBody;
  try {
    body = (await req.json()) as ResegmentRequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const doc = body.document;
  if (!doc?.text || doc.text.trim().length < 200) {
    return NextResponse.json(
      { error: 'document.text required (≥200 chars)' },
      { status: 400 },
    );
  }

  // Cap input so we stay inside Gemini's context reliably. Long acts can
  // be re-blocked in future via chunked passes.
  const truncated = doc.text.slice(0, MAX_CHARS);

  const prompt = [
    `You are re-segmenting an EU policy document into logical blocks for qualitative coding.`,
    `Break the text below into an ordered array of blocks. Each block is a coherent unit — a heading, a single recital, an article body, a paragraph, a table caption, or a footer line.`,
    ``,
    `Rules:`,
    `  • Keep the blocks SHORT and SINGLE-PURPOSE. Split multi-topic paragraphs into one block per topic.`,
    `  • Preserve the original wording verbatim — do not paraphrase, summarise or drop sentences.`,
    `  • Output blocks in document order.`,
    `  • Pick a "kind" for each block from: heading | recital | article | paragraph | footer | table | unknown.`,
    `  • Recitals are the numbered "(N) …" clauses typical of EU regulations; articles are the "Article N — title … body" sections.`,
    ``,
    `Document title: ${doc.title ?? doc.id ?? 'untitled'}`,
    ``,
    `--- BEGIN DOCUMENT ---`,
    truncated,
    `--- END DOCUMENT ---`,
  ].join('\n');

  const reqBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
      responseSchema: {
        type: 'OBJECT',
        properties: {
          blocks: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                kind: { type: 'STRING' },
                text: { type: 'STRING' },
              },
              required: ['kind', 'text'],
            },
          },
        },
        required: ['blocks'],
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
          ? 'Document too long for a single pass — shorten it or split into parts.'
          : undefined,
      },
      { status: 502 },
    );
  }
  const cleaned = extractJson(rawText);
  let parsed: { blocks?: Array<{ kind?: unknown; text?: unknown }> };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: 'gemini returned non-JSON', finishReason, raw: rawText.slice(0, 500) },
      { status: 502 },
    );
  }

  const docId = doc.id ?? 'resegment';
  const blocks: Block[] = [];
  const validKinds: BlockKind[] = ['heading', 'recital', 'article', 'paragraph', 'footer', 'table', 'unknown'];
  for (const raw of parsed.blocks ?? []) {
    const text = typeof raw.text === 'string' ? raw.text.trim() : '';
    if (!text) continue;
    const kindRaw = typeof raw.kind === 'string' ? raw.kind.toLowerCase().trim() : 'paragraph';
    const kind = (validKinds as string[]).includes(kindRaw) ? (kindRaw as BlockKind) : 'paragraph';
    blocks.push({
      id: `block-${docId}-ai-${blocks.length}`,
      page: 1,
      order: blocks.length,
      bboxes: [],
      kind,
      text,
    });
  }

  if (blocks.length === 0) {
    return NextResponse.json(
      { error: 'gemini returned zero valid blocks', raw: rawText.slice(0, 500) },
      { status: 502 },
    );
  }

  return NextResponse.json({
    documentId: doc.id ?? null,
    model: GEMINI_MODEL,
    blocks,
    truncated: truncated.length < doc.text.length,
  });
}

/** Same JSON-unwrapping helper as the classify route — strips markdown
 *  fences / leading prose if the model ignored the responseMimeType. */
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
