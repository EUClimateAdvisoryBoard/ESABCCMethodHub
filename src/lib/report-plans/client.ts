/**
 * Report Reference Plan — browser-side helpers.
 * ---------------------------------------------
 *
 * Plans live on the shared server store (via `/api/report-plans`) with
 * an additional localStorage mirror so an unreliable network or the
 * `REFS_GITHUB_TOKEN` being absent never blocks the writer's work.
 * When both are available, the server copy wins on read. Write paths
 * are optimistic: localStorage is updated immediately, then the
 * server call runs; on server error the local state still reflects
 * the intent until the next successful sync.
 */

import type { ReportPlan } from './types';

const LS_KEY = 'esabcc_report_plans_v1';

export interface PlanSummary {
  id: string;
  name: string;
  description: string;
  sectionCount: number;
  referenceCount: number;
  createdAt: string;
  updatedAt: string;
}

// ── localStorage mirror ───────────────────────────────────────────────────
function readLocal(): ReportPlan[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(plans: ReportPlan[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(plans));
  } catch {
    // ignore quota errors
  }
}

function upsertLocal(plan: ReportPlan): void {
  const plans = readLocal();
  const idx = plans.findIndex(p => p.id === plan.id);
  if (idx >= 0) plans[idx] = plan;
  else plans.unshift(plan);
  writeLocal(plans);
}

function removeLocal(id: string): void {
  writeLocal(readLocal().filter(p => p.id !== id));
}

function summariseLocal(plans: ReportPlan[]): PlanSummary[] {
  return plans.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    sectionCount: p.sections?.length || 0,
    referenceCount: p.references?.length || 0,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}

// ── Public API ────────────────────────────────────────────────────────────
export async function listPlans(): Promise<PlanSummary[]> {
  let serverPlans: PlanSummary[] = [];
  try {
    const resp = await fetch('/api/report-plans', { cache: 'no-store' });
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data.plans)) serverPlans = data.plans;
    }
  } catch {
    // fall through to local
  }
  const local = summariseLocal(readLocal());
  const seen = new Set<string>();
  const merged: PlanSummary[] = [];
  for (const p of [...serverPlans, ...local]) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      merged.push(p);
    }
  }
  return merged.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getPlan(id: string): Promise<ReportPlan | null> {
  try {
    const resp = await fetch(`/api/report-plans/${encodeURIComponent(id)}`, {
      cache: 'no-store',
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.plan) {
        upsertLocal(data.plan);
        return data.plan;
      }
    }
  } catch {
    // network — fall back to local
  }
  const local = readLocal().find(p => p.id === id);
  return local || null;
}

export async function createPlan(input: {
  name: string;
  description?: string;
}): Promise<ReportPlan | null> {
  try {
    const resp = await fetch('/api/report-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.plan) {
      upsertLocal(data.plan);
      return data.plan;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function savePlan(plan: ReportPlan): Promise<ReportPlan | null> {
  // Optimistic local write
  upsertLocal({ ...plan, updatedAt: new Date().toISOString() });
  try {
    const resp = await fetch(`/api/report-plans/${encodeURIComponent(plan.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.plan) {
      upsertLocal(data.plan);
      return data.plan;
    }
  } catch {
    // ignore network errors — local copy is the source of truth until reconnect
  }
  return null;
}

export async function deletePlan(id: string): Promise<boolean> {
  removeLocal(id);
  try {
    const resp = await fetch(`/api/report-plans/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return resp.ok;
  } catch {
    return false;
  }
}
