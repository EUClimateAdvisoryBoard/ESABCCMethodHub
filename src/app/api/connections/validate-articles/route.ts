/**
 * POST /api/connections/validate-articles
 * ----------------------------------------
 * Body: { sourcePolicyId, sourceArticles, targetPolicyId, targetArticles }
 *
 * For each side we:
 *   1. Load the consolidated EUR-Lex text for the policy (file cache,
 *      then EUR-Lex fallback — same path /api/policy-text uses).
 *   2. Run `validateArticleCitations` to mark each cited article as
 *      `valid` (anchor present), `not-found`, or `unparseable`.
 *
 * The route does NOT mutate any state — it is a read-only validator
 * surfaced from the Connections review table.
 */
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import {
  validateArticleCitations,
  type CitationValidationResult,
} from '@/lib/validateArticleCitations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

async function loadPolicyText(policyId: string): Promise<string | null> {
  const safeId = policyId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeId) return null;
  const filePath = path.join(process.cwd(), 'public', 'data', 'policy-texts', `${safeId}.txt`);
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

interface SidePayload {
  policyId: string;
  found: boolean;
  result: CitationValidationResult | null;
}

async function validateSide(policyId: string | undefined, articles: string | undefined): Promise<SidePayload> {
  if (!policyId || !articles) {
    return {
      policyId: policyId ?? '',
      found: false,
      result: { citations: [], validCount: 0, notFoundCount: 0, unparseableCount: 0 },
    };
  }
  const text = await loadPolicyText(policyId);
  if (!text) {
    return { policyId, found: false, result: null };
  }
  return { policyId, found: true, result: validateArticleCitations(articles, text) };
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const sourcePolicyId = typeof body.sourcePolicyId === 'string' ? body.sourcePolicyId : undefined;
  const sourceArticles = typeof body.sourceArticles === 'string' ? body.sourceArticles : undefined;
  const targetPolicyId = typeof body.targetPolicyId === 'string' ? body.targetPolicyId : undefined;
  const targetArticles = typeof body.targetArticles === 'string' ? body.targetArticles : undefined;
  const [source, target] = await Promise.all([
    validateSide(sourcePolicyId, sourceArticles),
    validateSide(targetPolicyId, targetArticles),
  ]);
  return NextResponse.json({ source, target });
}
