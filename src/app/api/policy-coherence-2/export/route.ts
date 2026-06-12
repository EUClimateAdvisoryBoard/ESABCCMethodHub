import { NextResponse } from 'next/server';
import { buildJsonlExport, runPolicyCoherence2 } from '@/lib/policy-coherence-2/engine';
import { runMlAnalysis } from '@/lib/policy-coherence-2/ml';

/**
 * Policy Coherence 2.0 — ML export.
 *
 *   GET /api/policy-coherence-2/export → JSONL: one run header line, then
 *   every policy roll-up, sentence unit (with claims + step tags), every
 *   finding, and the machine-learning layer's contradiction / trade-off
 *   pairs and theme clusters. Deterministic ids join the record types, so
 *   the file is directly consumable by downstream extraction pipelines.
 */

export async function GET() {
  const run = runPolicyCoherence2();
  const jsonl = buildJsonlExport(run, runMlAnalysis(run));
  return new NextResponse(jsonl, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Content-Disposition': `attachment; filename="policy-coherence-2-${run.corpusHash}.jsonl"`,
    },
  });
}
