/**
 * Report Reference Plan — server-side store.
 * ------------------------------------------
 * Mirrors the pattern used by `custom-store.ts` for references: an
 * in-memory store with best-effort GitHub persistence so plans
 * survive serverless cold starts during the prototype phase. When
 * `REFS_GITHUB_TOKEN` is not set the plans live only in memory.
 *
 * In production on EEA infrastructure, this module is replaced by
 * the Postgres-backed implementation in the same way the references
 * custom-store was — see migration `018_custom_references_store.sql`
 * for the pattern. Until then, the in-memory + GitHub path works for
 * a small authoring team.
 */
// ---------------------------------------------------------------------------

import type { ReportPlan } from './types';

const GITHUB_REPO = 'SebastianFra/EU-Climate-Policy';
const GITHUB_FILE_PATH = 'public/data/report-plans.json';

declare global {
  // eslint-disable-next-line no-var
  var __esabcc_report_plans: ReportPlan[] | undefined;
  // eslint-disable-next-line no-var
  var __esabcc_report_plans_seed: boolean | undefined;
}

export function getPlans(): ReportPlan[] {
  if (!globalThis.__esabcc_report_plans) {
    globalThis.__esabcc_report_plans = [];
  }
  return globalThis.__esabcc_report_plans;
}

export function hasGitHubToken(): boolean {
  return !!process.env.REFS_GITHUB_TOKEN;
}

async function reloadFromGitHub(): Promise<boolean> {
  const token = process.env.REFS_GITHUB_TOKEN;
  if (!token) return false;
  const resp = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
      cache: 'no-store',
    },
  );
  if (resp.status === 404) {
    globalThis.__esabcc_report_plans = [];
    return true;
  }
  if (!resp.ok) return false;
  const data = await resp.json();
  try {
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const plans = JSON.parse(content);
    if (Array.isArray(plans)) {
      globalThis.__esabcc_report_plans = plans as ReportPlan[];
      return true;
    }
  } catch {
    // fall through
  }
  return false;
}

export async function ensureSeedLoaded(): Promise<void> {
  if (process.env.REFS_GITHUB_TOKEN) {
    await reloadFromGitHub();
    globalThis.__esabcc_report_plans_seed = true;
    return;
  }
  if (globalThis.__esabcc_report_plans_seed) return;
  globalThis.__esabcc_report_plans_seed = true;

  const store = getPlans();
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const resp = await fetch(`${baseUrl}/data/report-plans.json`, {
      cache: 'no-store',
    });
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data)) {
        for (const plan of data) {
          if (!store.some(p => p.id === plan.id)) store.push(plan);
        }
      }
    }
  } catch {
    // optional seed file
  }
}

interface PersistResult {
  ok: boolean;
  error?: string;
}

async function fetchCurrentSha(token: string): Promise<string | undefined> {
  const resp = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
      cache: 'no-store',
    },
  );
  if (resp.status === 404) return undefined;
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`GET contents HTTP ${resp.status}: ${body.slice(0, 300)}`);
  }
  const data = await resp.json();
  return data.sha as string | undefined;
}

export async function persistToGitHub(store: ReportPlan[]): Promise<PersistResult> {
  const token = process.env.REFS_GITHUB_TOKEN;
  if (!token) return { ok: false, error: 'REFS_GITHUB_TOKEN not set' };

  const content = Buffer.from(
    JSON.stringify(store, null, 2) + '\n',
  ).toString('base64');
  const commitMessage = 'report-plan: update plans store';

  for (let attempt = 0; attempt < 2; attempt++) {
    let sha: string | undefined;
    try {
      sha = await fetchCurrentSha(token);
    } catch (e) {
      return { ok: false, error: `sha fetch failed: ${(e as Error).message}` };
    }
    const putResp = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: commitMessage,
          content,
          sha: sha || undefined,
        }),
      },
    );
    if (putResp.ok) return { ok: true };
    const body = await putResp.text();
    if (putResp.status !== 409 || attempt === 1) {
      return { ok: false, error: `PUT HTTP ${putResp.status}: ${body.slice(0, 300)}` };
    }
  }
  return { ok: false, error: 'exhausted retries' };
}
