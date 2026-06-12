import { NextResponse } from 'next/server';
import { buildJsonlExport, runPolicyCoherence2 } from '@/lib/policy-coherence-2/engine';
import { runMlAnalysis } from '@/lib/policy-coherence-2/ml';
import { gapJsonlLines, runGapAssessment } from '@/lib/policy-coherence-2/gaps';

/**
 * Policy Coherence 2.0 — ML export.
 *
 *   GET /api/policy-coherence-2/export → JSONL: run header, policy roll-ups,
 *   every sentence unit (claims + step tags), every signal finding, the ML
 *   layer's pairs and clusters, and the ESABCC gap assessment (lever
 *   coverage, gap findings with reasoning chains, policy × gap-type matrix).
 *   Deterministic ids join the record types.
 */

export async function GET() {
  const run = runPolicyCoherence2();
  const ml = runMlAnalysis(run);
  const jsonl =
    buildJsonlExport(run, ml) + gapJsonlLines(runGapAssessment(run, ml)).join('\n') + '\n';
  return new NextResponse(jsonl, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Content-Disposition': `attachment; filename="policy-coherence-2-${run.corpusHash}.jsonl"`,
    },
  });
}
