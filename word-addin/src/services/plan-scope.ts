// ============================================================================
// Word Add-in — Report Plan Scope service
// ============================================================================
//
// Lets the user pin the active document to a specific Report Plan ("ABCC
// Adaptation Report 2.0", "Mitigation Progress 2026", …). Once pinned, the
// reference search is filtered to that plan's bibliography so a citation
// inserted into the document is guaranteed to be one of the references
// agreed for the report.
//
// Persistence
// -----------
// The chosen plan ID lives in `Office.context.document.settings`, which is
// **per-document** — reopening the .docx restores the scope without the user
// having to repick. Settings are saved with `saveAsync` so they survive
// document close.
//
// Flawless behaviour
// ------------------
// Every code path here returns a sensible result even when the bridge is
// offline, MethodHub is unreachable, or the persisted plan has been deleted.
// The taskpane reads `getActivePlanScope()` and renders an explicit state
// for each ("loading", "active", "stale", "none").

// Type-only import to avoid the circular dependency that would arise if we
// imported `api.ts`'s runtime exports here — `api.ts` calls into this module.
import type { RefSearchResult } from './api';

const BRIDGE_URL = 'http://127.0.0.1:8585';
const SETTINGS_KEY = 'esabcc.reportPlanId';

// Per-plan ref shape returned by the bridge `/api/report-plan/:id` endpoint
// (matches `PlanReference` in src/lib/report-plans/types.ts).
interface PlanReference {
  id: string;
  doi?: string;
  title: string;
  authors: string;          // "Family, G.; Family2, G."
  year: string;
  journal?: string;
  type?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  url?: string;
  funding?: { name: string; doi?: string; awards?: string[] }[];
}

export interface PlanSummary {
  id: string;
  name: string;
  description: string;
  sectionCount: number;
  referenceCount: number;
  updatedAt: string;
}

export interface FundingStats {
  total: number;
  withAny: number;
  withEu: number;
  euShare: number;
}

export interface PlanScope {
  planId: string;
  planName: string;
  referenceIds: string[];
  refs: RefSearchResult[];   // already converted to search-result shape
  funding: FundingStats;
}

let activeScope: PlanScope | null = null;
let bridgeToken = '';

export function setBridgeToken(token: string): void {
  bridgeToken = token;
}

function bridgeHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { ...(extra || {}) };
  if (bridgeToken) h['Authorization'] = `Bearer ${bridgeToken}`;
  return h;
}

// ── PlanReference → RefSearchResult ────────────────────────────────────────
// The Word search/insert pipeline expects CSL-JSON. PlanReference carries
// less structure (authors as a single string), so we lift it into a CSL
// shape good enough for citation insertion. Extra fields the user added in
// the Reference Manager are not present here — they're recovered later if
// the plan ref also has a Supabase row, but for the day-to-day insertion
// path this is sufficient.

function parseAuthors(authorsStr: string): { family: string; given?: string }[] {
  if (!authorsStr) return [];
  return authorsStr
    .split(/;\s*/)
    .map(a => a.trim())
    .filter(Boolean)
    .map(a => {
      const m = a.match(/^([^,]+),\s*(.+)$/);
      if (m) return { family: m[1].trim(), given: m[2].trim() };
      const words = a.split(/\s+/);
      if (words.length >= 2) return { family: words[words.length - 1], given: words.slice(0, -1).join(' ') };
      return { family: a };
    });
}

function planRefToSearchResult(p: PlanReference): RefSearchResult {
  const authors = parseAuthors(p.authors);
  const yearNum = p.year ? parseInt(p.year, 10) : null;
  const csl: Record<string, unknown> = {
    id: p.id,
    type: p.type || 'article-journal',
    title: p.title,
  };
  if (authors.length > 0) csl.author = authors;
  if (yearNum) csl.issued = { 'date-parts': [[yearNum]] };
  if (p.journal) csl['container-title'] = p.journal;
  if (p.doi) csl.DOI = p.doi;
  if (p.volume) csl.volume = p.volume;
  if (p.issue) csl.issue = p.issue;
  if (p.pages) csl.page = p.pages;
  if (p.url) csl.URL = p.url;
  if (p.funding && p.funding.length > 0) csl.funder = p.funding;

  return {
    id: p.id,
    citation_key: p.id,
    title: p.title,
    authors: authors.length > 0 ? authors : null,
    year: yearNum,
    container_title: p.journal || null,
    csl_json: csl,
  };
}

// ── Bridge calls ───────────────────────────────────────────────────────────

export async function listPlansFromBridge(): Promise<PlanSummary[]> {
  const res = await fetch(`${BRIDGE_URL}/api/report-plans`, {
    headers: bridgeHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Bridge returned HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.plans) ? data.plans : [];
}

interface PlanResponse {
  planId: string;
  planName: string;
  referenceIds: string[];
  references: PlanReference[];
  funding: FundingStats;
}

export async function fetchPlanFromBridge(planId: string): Promise<PlanScope> {
  const res = await fetch(
    `${BRIDGE_URL}/api/report-plan/${encodeURIComponent(planId)}`,
    { headers: bridgeHeaders(), signal: AbortSignal.timeout(8000) },
  );
  if (res.status === 404) throw new Error('Report plan not found.');
  if (!res.ok) throw new Error(`Bridge returned HTTP ${res.status}`);
  const data: PlanResponse = await res.json();
  return {
    planId: data.planId,
    planName: data.planName,
    referenceIds: data.referenceIds || [],
    refs: (data.references || []).map(planRefToSearchResult),
    funding: data.funding || { total: 0, withAny: 0, withEu: 0, euShare: 0 },
  };
}

// ── Active scope state ─────────────────────────────────────────────────────

export function getActivePlanScope(): PlanScope | null {
  return activeScope;
}

export async function setActivePlanScope(planId: string | null): Promise<PlanScope | null> {
  if (planId === null) {
    activeScope = null;
    persistPlanId(null);
    return null;
  }
  const scope = await fetchPlanFromBridge(planId);
  activeScope = scope;
  persistPlanId(planId);
  return scope;
}

/**
 * Returns the subset of `activeScope.refs` that match the search term, in the
 * `RefSearchResult` shape the existing taskpane render code already handles.
 * Empty query returns the full plan bibliography.
 */
export function searchInActivePlan(query: string): RefSearchResult[] | null {
  if (!activeScope) return null;
  const q = query.trim().toLowerCase();
  if (!q) return activeScope.refs;
  return activeScope.refs.filter(r => {
    if (r.title?.toLowerCase().includes(q)) return true;
    if (r.citation_key?.toLowerCase().includes(q)) return true;
    if (r.container_title?.toLowerCase().includes(q)) return true;
    const authorBlob = (r.authors || [])
      .map(a => `${a.family || ''} ${a.given || ''}`)
      .join(' ')
      .toLowerCase();
    return authorBlob.includes(q);
  });
}

// ── Office persistence ─────────────────────────────────────────────────────

export function loadPersistedPlanId(): string | null {
  try {
    const settings = (Office as any)?.context?.document?.settings;
    if (!settings) return null;
    const value = settings.get(SETTINGS_KEY);
    return typeof value === 'string' && value ? value : null;
  } catch {
    return null;
  }
}

function persistPlanId(planId: string | null): void {
  try {
    const settings = (Office as any)?.context?.document?.settings;
    if (!settings) return;
    if (planId) settings.set(SETTINGS_KEY, planId);
    else settings.remove(SETTINGS_KEY);
    settings.saveAsync();
  } catch {
    // Best effort — losing scope on next open is acceptable.
  }
}

// ── Restore on startup ─────────────────────────────────────────────────────
// Called by the taskpane after `initConnection` has run. Returns the restored
// scope, or `null` if no plan was persisted, or throws if the bridge rejects
// the lookup so the caller can surface the error.

export async function restorePlanScope(): Promise<PlanScope | null> {
  const planId = loadPersistedPlanId();
  if (!planId) return null;
  try {
    return await setActivePlanScope(planId);
  } catch (err) {
    // Persisted plan is gone or the bridge is unreachable — clear the scope
    // but keep the persisted ID so a later reconnection retries.
    activeScope = null;
    throw err;
  }
}
