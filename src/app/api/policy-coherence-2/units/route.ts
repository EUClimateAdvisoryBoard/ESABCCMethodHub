import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { runPolicyCoherence2 } from '@/lib/policy-coherence-2/engine';
import type { Pc2Unit } from '@/lib/policy-coherence-2/types';

/**
 * Policy Coherence 2.0 — units API.
 *
 *   GET /api/policy-coherence-2/units?policyId=…   (policyId required)
 *
 * Sentence-level units of one policy, with claims and step tags — from the
 * latest persisted run when available, else computed live.
 */

export async function GET(request: NextRequest) {
  const policyId = request.nextUrl.searchParams.get('policyId');
  if (!policyId) {
    return NextResponse.json({ error: 'policyId is required' }, { status: 400 });
  }

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
        .from('pc2_units')
        .select('*')
        .eq('run_id', run.id)
        .eq('policy_id', policyId)
        .order('block_order', { ascending: true })
        .order('unit_index', { ascending: true })
        .limit(10000);
      if (!error && data && data.length > 0) {
        const items: Pc2Unit[] = data.map(r => ({
          id: r.id,
          policyId: r.policy_id,
          blockId: r.block_id,
          blockKind: r.block_kind,
          blockOrder: r.block_order,
          unitIndex: r.unit_index,
          path: r.path,
          startChar: r.start_char,
          endChar: r.end_char,
          text: r.text,
          stepIds: r.step_ids ?? [],
          claims: r.claims ?? [],
        }));
        return NextResponse.json({
          items,
          total: items.length,
          source: 'database',
          runId: run.id,
        });
      }
    }
  }

  const items = runPolicyCoherence2().units.filter(u => u.policyId === policyId);
  return NextResponse.json({ items, total: items.length, source: 'live', runId: null });
}
