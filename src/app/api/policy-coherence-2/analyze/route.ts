import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { runPolicyCoherence2 } from '@/lib/policy-coherence-2/engine';

/**
 * Policy Coherence 2.0 — run + persist API.
 *
 *   GET  /api/policy-coherence-2/analyze → latest persisted run summary
 *   POST /api/policy-coherence-2/analyze → run the engine over the shipped
 *        corpus and write the full run (units + claims + findings) to
 *        Supabase. Idempotent: a run with the same (engine_version,
 *        corpus_hash) is returned as-is unless body { force: true } asks
 *        for a re-write. Without Supabase env the analysis still runs and
 *        is returned, just not persisted (mirrors the CA store pattern).
 */

const UNIT_BATCH = 500;

export async function GET() {
  const sb = getServerSupabase();
  if (!sb) return NextResponse.json({ persistent: false, run: null });
  const { data, error } = await sb
    .from('pc2_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: `Failed to load runs: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ persistent: true, run: data ?? null });
}

export async function POST(request: NextRequest) {
  try {
    let force = false;
    try {
      const body = await request.json();
      force = body?.force === true;
    } catch { /* no body */ }

    const run = runPolicyCoherence2();
    const summary = {
      engineVersion: run.engineVersion,
      corpusHash: run.corpusHash,
      stats: run.stats,
    };

    const sb = getServerSupabase();
    if (!sb) {
      return NextResponse.json({ status: 'computed', persisted: false, ...summary });
    }

    const { data: existing } = await sb
      .from('pc2_runs')
      .select('id, created_at')
      .eq('engine_version', run.engineVersion)
      .eq('corpus_hash', run.corpusHash)
      .maybeSingle();

    if (existing && !force) {
      return NextResponse.json({
        status: 'already-persisted',
        persisted: true,
        runId: existing.id,
        createdAt: existing.created_at,
        ...summary,
      });
    }
    if (existing && force) {
      await sb.from('pc2_runs').delete().eq('id', existing.id); // cascades
    }

    const { data: inserted, error: runErr } = await sb
      .from('pc2_runs')
      .insert({
        engine_version: run.engineVersion,
        corpus_hash: run.corpusHash,
        policy_count: run.stats.policyCount,
        block_count: run.stats.blockCount,
        unit_count: run.stats.unitCount,
        claim_count: run.stats.claimCount,
        finding_count: run.stats.findingCount,
      })
      .select('id')
      .single();
    if (runErr || !inserted) {
      return NextResponse.json(
        { error: `Failed to create run: ${runErr?.message ?? 'no row'}` },
        { status: 500 },
      );
    }
    const runId = inserted.id as string;

    const unitRows = run.units.map(u => ({
      run_id: runId,
      id: u.id,
      policy_id: u.policyId,
      block_id: u.blockId,
      block_kind: u.blockKind,
      block_order: u.blockOrder,
      unit_index: u.unitIndex,
      path: u.path,
      start_char: u.startChar,
      end_char: u.endChar,
      text: u.text,
      step_ids: u.stepIds,
      claims: u.claims,
    }));
    for (let i = 0; i < unitRows.length; i += UNIT_BATCH) {
      const { error } = await sb.from('pc2_units').insert(unitRows.slice(i, i + UNIT_BATCH));
      if (error) {
        await sb.from('pc2_runs').delete().eq('id', runId);
        return NextResponse.json(
          { error: `Failed to persist units (batch ${i / UNIT_BATCH}): ${error.message}` },
          { status: 500 },
        );
      }
    }

    const findingRows = run.findings.map(f => ({
      run_id: runId,
      id: f.id,
      rule_id: f.ruleId,
      step_id: f.stepId,
      severity: f.severity,
      scope: f.scope,
      policy_ids: f.policyIds,
      unit_ids: f.unitIds,
      title: f.title,
      detail: f.detail,
      evidence: f.evidence,
      tier: f.tier ?? null,
    }));
    for (let i = 0; i < findingRows.length; i += UNIT_BATCH) {
      const { error } = await sb.from('pc2_findings').insert(findingRows.slice(i, i + UNIT_BATCH));
      if (error) {
        await sb.from('pc2_runs').delete().eq('id', runId);
        return NextResponse.json(
          { error: `Failed to persist findings: ${error.message}` },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ status: 'persisted', persisted: true, runId, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Analysis failed: ${message}` }, { status: 500 });
  }
}
