import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { runPolicyCoherence2 } from '@/lib/policy-coherence-2/engine';
import type { Pc2Finding } from '@/lib/policy-coherence-2/types';

/**
 * Policy Coherence 2.0 — findings API.
 *
 *   GET /api/policy-coherence-2/findings
 *       ?policyId=…&ruleId=…&severity=…&stepId=…&scope=…
 *
 * Serves from the latest persisted run when Supabase is configured and a
 * run exists; otherwise computes live (the engine is deterministic, so the
 * two sources agree for the same corpus).
 */

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const policyId = q.get('policyId');
  const ruleId = q.get('ruleId');
  const severity = q.get('severity');
  const stepId = q.get('stepId');
  const scope = q.get('scope');

  let findings: Pc2Finding[];
  let source: 'database' | 'live' = 'live';
  let runId: string | null = null;

  const sb = getServerSupabase();
  if (sb) {
    const { data: run } = await sb
      .from('pc2_runs')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (run) {
      const { data, error } = await sb
        .from('pc2_findings')
        .select('*')
        .eq('run_id', run.id)
        .limit(5000);
      if (!error && data) {
        source = 'database';
        runId = run.id as string;
        findings = data.map(r => ({
          id: r.id,
          ruleId: r.rule_id,
          stepId: r.step_id,
          severity: r.severity,
          scope: r.scope,
          policyIds: r.policy_ids ?? [],
          unitIds: r.unit_ids ?? [],
          title: r.title,
          detail: r.detail,
          evidence: r.evidence ?? [],
          tier: r.tier ?? undefined,
        }));
      } else {
        findings = runPolicyCoherence2().findings;
      }
    } else {
      findings = runPolicyCoherence2().findings;
    }
  } else {
    findings = runPolicyCoherence2().findings;
  }

  let items = findings;
  if (policyId) items = items.filter(f => f.policyIds.includes(policyId));
  if (ruleId) items = items.filter(f => f.ruleId === ruleId);
  if (severity) items = items.filter(f => f.severity === severity);
  if (stepId) items = items.filter(f => f.stepId === stepId);
  if (scope) items = items.filter(f => f.scope === scope);

  return NextResponse.json({ items, total: items.length, source, runId });
}
