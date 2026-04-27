/**
 * Funding analysis for a report plan.
 * -----------------------------------
 * Given a ReportPlan, computes the share of references that carry a
 * funding tag and breaks it down by funder. The Funding Sources beta
 * module reuses the same DOI prefix / name list, so a reference flagged
 * as "EU-funded" here matches a project visible there.
 */
import { EU_FUNDER_DOI_PREFIXES } from '@/lib/references/types';
import type { PlanFundingEntry, PlanReference, ReportPlan } from './types';

const EU_FUNDER_NAME_HINTS = [
  'european commission',
  'horizon 2020',
  'horizon europe',
  'european research council',
  'erc executive agency',
  'cinea',
  'life programme',
  'digital europe programme',
];

export function isEuFunder(entry: PlanFundingEntry): boolean {
  if (entry.doi && EU_FUNDER_DOI_PREFIXES.has(entry.doi)) return true;
  const lower = (entry.name || '').toLowerCase();
  return EU_FUNDER_NAME_HINTS.some(h => lower.includes(h));
}

export interface FunderTally {
  name: string;
  count: number;
  isEu: boolean;
}

export interface PlanFundingSummary {
  totalReferences: number;
  withAnyFunding: number;
  withEuFunding: number;
  byFunder: FunderTally[];
}

export function summarisePlanFunding(plan: ReportPlan): PlanFundingSummary {
  const total = plan.references.length;
  let withAnyFunding = 0;
  let withEuFunding = 0;
  const tally = new Map<string, FunderTally>();

  for (const ref of plan.references) {
    const fs = ref.funding || [];
    if (fs.length > 0) withAnyFunding += 1;
    if (fs.some(isEuFunder)) withEuFunding += 1;
    for (const f of fs) {
      if (!f.name) continue;
      const cur = tally.get(f.name) || { name: f.name, count: 0, isEu: isEuFunder(f) };
      cur.count += 1;
      tally.set(f.name, cur);
    }
  }

  const byFunder = [...tally.values()].sort((a, b) => b.count - a.count);
  return { totalReferences: total, withAnyFunding, withEuFunding, byFunder };
}

/** Produces the rows used to drop straight into a CSV / clipboard paste. */
export function fundingTableRows(plan: ReportPlan): Array<{
  refId: string;
  title: string;
  doi: string;
  funders: string;
  euFunded: 'yes' | 'no';
}> {
  return plan.references.map((r: PlanReference) => ({
    refId: r.id,
    title: r.title,
    doi: r.doi || '',
    funders: (r.funding || []).map(f => f.name).join('; '),
    euFunded: (r.funding || []).some(isEuFunder) ? 'yes' : 'no',
  }));
}
