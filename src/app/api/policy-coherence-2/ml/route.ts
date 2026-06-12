import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { runPolicyCoherence2 } from '@/lib/policy-coherence-2/engine';
import { runMlAnalysis } from '@/lib/policy-coherence-2/ml';

/**
 * Policy Coherence 2.0 — machine-learning layer API.
 *
 *   GET  /api/policy-coherence-2/ml → the unsupervised pass (pairs +
 *        clusters + stats), computed live over the deterministic engine run.
 *   POST /api/policy-coherence-2/ml → compute and persist the results
 *        against the latest matching pc2_runs row, so contradiction /
 *        trade-off candidates join back to the persisted unit blocks.
 *        Requires a persisted run (POST /analyze first); idempotent —
 *        existing rows for the run are replaced.
 */

const BATCH = 500;

export async function GET() {
  const ml = runMlAnalysis(runPolicyCoherence2());
  return NextResponse.json(ml);
}

export async function POST() {
  try {
    const run = runPolicyCoherence2();
    const ml = runMlAnalysis(run);

    const sb = getServerSupabase();
    if (!sb) {
      return NextResponse.json({
        status: 'computed',
        persisted: false,
        mlVersion: ml.mlVersion,
        stats: ml.stats,
      });
    }

    const { data: runRow } = await sb
      .from('pc2_runs')
      .select('id')
      .eq('engine_version', run.engineVersion)
      .eq('corpus_hash', run.corpusHash)
      .maybeSingle();
    if (!runRow) {
      return NextResponse.json(
        { error: 'No persisted run for the current corpus — POST /api/policy-coherence-2/analyze first.' },
        { status: 409 },
      );
    }
    const runId = runRow.id as string;

    // Replace any previous ML rows for this run (idempotent re-run).
    await sb.from('pc2_ml_pairs').delete().eq('run_id', runId);
    await sb.from('pc2_ml_clusters').delete().eq('run_id', runId);

    const pairRows = ml.pairs.map(p => ({
      run_id: runId,
      id: p.id,
      ml_version: ml.mlVersion,
      kind: p.kind,
      score: p.score,
      cosine: p.cosine,
      scope: p.scope,
      policy_a: p.policyA,
      policy_b: p.policyB,
      unit_a: p.unitA,
      unit_b: p.unitB,
      path_a: p.pathA,
      path_b: p.pathB,
      quote_a: p.quoteA,
      quote_b: p.quoteB,
      shared_terms: p.sharedTerms,
      signals: p.signals,
      axis: p.axis ?? null,
    }));
    for (let i = 0; i < pairRows.length; i += BATCH) {
      const { error } = await sb.from('pc2_ml_pairs').insert(pairRows.slice(i, i + BATCH));
      if (error) {
        return NextResponse.json(
          { error: `Failed to persist ML pairs: ${error.message}` },
          { status: 500 },
        );
      }
    }

    const clusterRows = ml.clusters.map(c => ({
      run_id: runId,
      id: c.id,
      ml_version: ml.mlVersion,
      label: c.label,
      size: c.size,
      policy_ids: c.policyIds,
      unit_ids: c.unitIds,
      axis: c.axis ?? null,
    }));
    if (clusterRows.length > 0) {
      const { error } = await sb.from('pc2_ml_clusters').insert(clusterRows);
      if (error) {
        return NextResponse.json(
          { error: `Failed to persist ML clusters: ${error.message}` },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      status: 'persisted',
      persisted: true,
      runId,
      mlVersion: ml.mlVersion,
      stats: ml.stats,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `ML analysis failed: ${message}` }, { status: 500 });
  }
}
