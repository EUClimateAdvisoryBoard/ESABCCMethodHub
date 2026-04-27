// ---------------------------------------------------------------------------
// AI master-code classification for a single document.
//
// POST /api/content-analysis/classify
//   body: {
//     document: { id, title, blocks?, text? },
//     codes:    [{ id, parentId, name, description? }, ...]   // master codes
//   }
//
// Uses Google Gemini (GEMINI_API_KEY) to decide which master codes apply to
// the document, with a short rationale and up to 5 evidence block IDs per
// code. JSON-schema response so the model can't return prose.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import type { AiClassification, Block, CodeNode } from '@/lib/content-analysis/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GEMINI_MODEL = 'gemini-2.5-flash';
// Keep the prompt bounded — long regulations easily have 1000+ blocks but
// the first ~120 carry the recitals, definitions and headline articles that
// drive the classification.
const MAX_BLOCKS_SENT = 120;
const MAX_CHARS_PER_BLOCK = 600;
const MAX_TOTAL_CHARS = 60_000;

interface ClassifyRequestBody {
  document?: {
    id?: string;
    title?: string;
    shortTitle?: string;
    blocks?: Array<Pick<Block, 'id' | 'page' | 'kind' | 'text'>>;
    text?: string;
  };
  codes?: Array<Pick<CodeNode, 'id' | 'parentId' | 'name' | 'description'>>;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not set on the server' },
      { status: 501 },
    );
  }

  let body: ClassifyRequestBody;
  try {
    body = (await req.json()) as ClassifyRequestBody;
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
  let blocksRendered = '';
  let charBudget = MAX_TOTAL_CHARS;
  if (blocksForPrompt.length > 0) {
    const rows: string[] = [];
    for (const b of blocksForPrompt) {
      const snippet = (b.text ?? '').replace(/\s+/g, ' ').slice(0, MAX_CHARS_PER_BLOCK);
      const row = `[${b.id} · p${b.page} · ${b.kind}] ${snippet}`;
      if (row.length > charBudget) break;
      rows.push(row);
      charBudget -= row.length + 1;
    }
    blocksRendered = rows.join('\n');
  } else if (doc.text) {
    blocksRendered = doc.text.slice(0, MAX_TOTAL_CHARS);
  }

  const prompt = [
    `You are classifying an EU policy document against a master code system for qualitative content analysis.`,
    `Pick the codes that genuinely apply to THIS document. Do not include codes just because they sound related — require textual support.`,
    ``,
    `Document title: ${doc.title ?? doc.shortTitle ?? doc.id ?? '(untitled)'}`,
    ``,
    `CODE SYSTEM (id :: name (parent) — description):`,
    codeCatalog,
    ``,
    `DOCUMENT CONTENT (blocks tagged with [id · page · kind]):`,
    blocksRendered,
    ``,
    `Return an array of classifications. For each code that applies include:`,
    `  - codeId: the exact id from the catalog above`,
    `  - confidence: 0–1 (how strongly the document exemplifies this concept)`,
    `  - rationale: ≤ 140 chars, grounded in specific wording`,
    `  - evidenceBlockIds: up to 5 block ids that most clearly support the tag (omit if the input was unblocked text)`,
    `Return an empty array if nothing applies. Do not invent code ids.`,
  ].join('\n');

  // ── Call Gemini with a JSON schema ───────────────────────────────────
  // 2.5 Flash has "thinking" on by default, which silently eats the
  // output-token budget before any visible text is produced. For a
  // structured-JSON call we explicitly want no thinking — a reliable
  // schema-constrained response is more useful than a reasoned one.
  const reqBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
      responseSchema: {
        type: 'OBJECT',
        properties: {
          classifications: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                codeId: { type: 'STRING' },
                confidence: { type: 'NUMBER' },
                rationale: { type: 'STRING' },
                evidenceBlockIds: { type: 'ARRAY', items: { type: 'STRING' } },
              },
              required: ['codeId', 'confidence', 'rationale'],
            },
          },
        },
        required: ['classifications'],
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
          ? 'Output truncated — the document may be too long; try shortening or narrowing the code catalog.'
          : undefined,
      },
      { status: 502 },
    );
  }

  // Strip markdown code fences / leading prose if the model ignored the
  // responseMimeType contract and returned e.g. ```json … ``` anyway.
  const cleaned = extractJson(rawText);

  let parsed: { classifications?: Array<Record<string, unknown>> };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      {
        error: 'gemini returned non-JSON',
        finishReason,
        raw: rawText.slice(0, 500),
        hint: 'Try Re-run AI tags — occasionally the model ignores the JSON-schema contract on the first shot.',
      },
      { status: 502 },
    );
  }

  // ── Validate classifications against the submitted code catalog ──────
  const validCodeIds = new Set(codes.map(c => c.id));
  const validBlockIds = new Set((doc.blocks ?? []).map(b => b.id));
  const classifications: AiClassification[] = [];
  for (const c of parsed.classifications ?? []) {
    const codeId = typeof c.codeId === 'string' ? c.codeId : '';
    if (!validCodeIds.has(codeId)) continue;
    const confidence = typeof c.confidence === 'number'
      ? Math.max(0, Math.min(1, c.confidence))
      : 0.5;
    const rationale = typeof c.rationale === 'string' ? c.rationale.slice(0, 240) : '';
    const rawEvidence = Array.isArray(c.evidenceBlockIds) ? c.evidenceBlockIds : [];
    const evidenceBlockIds = rawEvidence
      .filter((id): id is string => typeof id === 'string')
      .filter(id => validBlockIds.size === 0 || validBlockIds.has(id))
      .slice(0, 5);
    classifications.push({ codeId, confidence, rationale, evidenceBlockIds });
  }

  // Deduplicate by codeId, keeping the highest-confidence classification.
  const byCode = new Map<string, AiClassification>();
  for (const c of classifications) {
    const existing = byCode.get(c.codeId);
    if (!existing || c.confidence > existing.confidence) byCode.set(c.codeId, c);
  }
  const deduped = [...byCode.values()].sort((a, b) => b.confidence - a.confidence);

  return NextResponse.json({
    documentId: doc.id ?? null,
    model: GEMINI_MODEL,
    classifications: deduped,
    usedBlocks: blocksForPrompt.length,
    totalBlocks: doc.blocks?.length ?? 0,
  });
}

/** Extract a JSON payload from an LLM response that may have wrapped it
 *  in markdown fences (```json … ```) or leading prose ("Here you go:").
 *  Falls back to the first balanced `{ … }` or `[ … ]` in the string. */
function extractJson(raw: string): string {
  const trimmed = raw.trim();
  // Case 1: pure JSON, happy path.
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    return trimmed;
  }
  // Case 2: fenced code block — ```json\n{…}\n``` or ```\n{…}\n```.
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) return fence[1].trim();
  // Case 3: scan for the first balanced {…} or […] that spans the whole payload.
  const firstObj = trimmed.indexOf('{');
  const firstArr = trimmed.indexOf('[');
  const starts = [firstObj, firstArr].filter(i => i >= 0);
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
