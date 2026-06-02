/**
 * Server-side data access for the Project Workspace (M·19).
 * --------------------------------------------------------
 * Wraps all reads / writes against the `pw_*` tables defined in
 * `supabase/migrations/038_project_workspace.sql`. Used by:
 *   • the server components that render /project-workspace, and
 *   • the API routes under src/app/api/project-workspace/*.
 *
 * On first read for a seed project we ensure the seed indicators and
 * recommendations from the bundled data files are present in the DB —
 * so a fresh deploy is usable without a manual seeding step.
 */
import 'server-only';
import { cache } from 'react';
import { unstable_noStore as noStore } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase-server';
import {
  ECNO_INDICATORS,
  type Indicator,
  type IndicatorDataPoint,
} from '@/data/ecno-indicators';
import {
  ESABCC_REPORT_INDICATORS,
  ECNO_TO_ESABCC_DUPLICATE,
} from '@/data/esabcc-indicators';
import {
  ALL_ESABCC_RECOMMENDATIONS,
  ESABCC_INDUSTRY_RECOMMENDATIONS,
  type PastRecommendation,
  type RecommendationStatus,
} from '@/data/esabcc-recommendations';
import { INDUSTRY_INDICATORS } from '@/data/industry-indicators';

/** Recommendations seeded into the Policy Gap project, with their report label. */
const SEED_RECOMMENDATIONS: PastRecommendation[] = [...ALL_ESABCC_RECOMMENDATIONS];

/**
 * Recommendations seeded into the Industry Project: the industry-tagged subset,
 * re-keyed with an `industry-` id prefix because `pw_recommendations.id` is a
 * global primary key — the same recommendation can be tracked in both projects.
 */
const INDUSTRY_SEED_RECOMMENDATIONS: PastRecommendation[] =
  ESABCC_INDUSTRY_RECOMMENDATIONS.map(r => ({ ...r, id: `industry-${r.id}` }));
import {
  SEED_PROJECTS,
  type WorkspaceProject,
  type WorkspaceModule,
  type WorkspaceModuleKind,
} from '@/data/project-workspace';
import { normalizeLayout, type IndicatorSheetLayout } from '@/lib/project-workspace/indicator-sheet';

export type DBProject = WorkspaceProject;
export type DBIndicator = Indicator;
export type DBRecommendation = PastRecommendation;

export interface MemberStateCell {
  projectId: string;
  countryCode: string;
  sectorId: string;
  status: string;
  note: string;
}

export interface PolicyAnnotation {
  id: string;
  projectId: string;
  policyId: string;
  kind: 'approve' | 'disapprove' | 'fact-check' | 'edit' | 'comment';
  field: string;
  value: string;
  status: 'open' | 'resolved';
  /** Non-null = the annotation has been promoted into the canonical policy view. */
  promotedAt: string | null;
  createdBy: string | null;
  createdAt: string;
}

/** Promoted `edit` annotations, indexed by policy → field → value. */
export type PolicyOverrideMap = Record<string, Record<string, string>>;

/**
 * One project-scoped code assignment on a policy. Rows only exist once a
 * project has forked the master codes for that policy — until then the
 * UI shows the master codes directly via the catalog.
 */
export interface PolicyCode {
  id: string;
  projectId: string;
  policyId: string;
  codeId: string;
  source: 'master' | 'custom';
  parentCodeId: string | null;
  label: string;
  color: string;
  removed: boolean;
  createdAt: string;
}

/** True when Supabase is configured. */
export function isWorkspaceDbEnabled(): boolean {
  return !!getServerSupabase();
}

/**
 * Exposes the otherwise-private seed pass so admin endpoints can force a
 * reseed (useful when the lazy on-page-render path has not been hit yet,
 * or when its first run silently failed and we want to retry deliberately).
 */
export async function reseedFor(projectId: string): Promise<void> {
  await ensureSeedDataFor(projectId);
}

type Supa = NonNullable<ReturnType<typeof getServerSupabase>>;

/**
 * Idempotently insert a seed project's modules. Mirrors the migration so the
 * lazy on-render path makes a project's tabs appear even before the SQL seed
 * has run (the Industry Project's four modules ship this way).
 */
async function ensureSeedModules(sb: Supa, projectId: string) {
  const project = SEED_PROJECTS.find(p => p.id === projectId);
  if (!project || project.modules.length === 0) return;
  const { data: existing } = await sb
    .from('pw_modules')
    .select('id')
    .eq('project_id', projectId);
  const have = new Set((existing ?? []).map(r => r.id));
  const toInsert = project.modules
    .map((m, position) => ({ m, position }))
    .filter(({ m }) => !have.has(m.id));
  if (toInsert.length === 0) return;
  const { error } = await sb.from('pw_modules').insert(
    toInsert.map(({ m, position }) => ({
      id: m.id,
      project_id: projectId,
      kind: m.kind,
      name: m.name,
      description: m.description,
      position,
      is_seed: true,
    }))
  );
  if (error) {
    console.error('[pw seed] failed to insert modules', { projectId, error: error.message });
  }
}

/** Insert any of `pool` that aren't already present in the project. */
async function ensureSeedIndicators(sb: Supa, projectId: string, pool: Indicator[]) {
  const { data: existing, error: readErr } = await sb
    .from('pw_indicators')
    .select('id')
    .eq('project_id', projectId);
  if (readErr) {
    console.error('[pw seed] failed to read existing indicators', {
      projectId,
      error: readErr.message,
    });
  }
  const have = new Set((existing ?? []).map(r => r.id));
  const toInsert = pool.filter(i => !have.has(i.id));
  if (toInsert.length === 0) return;
  // UPSERT with onConflict makes the call resilient to PKs that survive the
  // prefilter (e.g. a stale row from before `is_seed=true` was a convention).
  const { error: insErr } = await sb.from('pw_indicators').upsert(
    toInsert.map(i => ({
      id: i.id,
      project_id: projectId,
      name: i.name,
      category: i.category,
      unit: i.unit,
      description: i.description,
      source: i.source,
      source_url: i.sourceUrl,
      direction: i.direction,
      target_value: i.targetValue ?? null,
      target_year: i.targetYear ?? null,
      is_seed: true,
    })),
    { onConflict: 'id', ignoreDuplicates: true }
  );
  if (insErr) {
    console.error('[pw seed] failed to insert indicators', {
      projectId,
      attempted: toInsert.length,
      error: insErr.message,
    });
    return;
  }
  const points = toInsert.flatMap(i =>
    i.data.map(p => ({ indicator_id: i.id, year: p.year, value: p.value }))
  );
  if (points.length > 0) {
    const { error: ptsErr } = await sb
      .from('pw_indicator_points')
      .upsert(points, { onConflict: 'indicator_id,year', ignoreDuplicates: true });
    if (ptsErr) {
      console.error('[pw seed] failed to insert indicator points', {
        projectId,
        attempted: points.length,
        error: ptsErr.message,
      });
    }
  }
}

/**
 * Insert any of `recs` that aren't already present in the project, and backfill
 * the source-report label on any pre-existing rows that predate the report
 * columns. We read *every* existing row (any `is_seed` value), not just seed
 * rows, so a stray row carrying a seed id with `is_seed=false` doesn't collide
 * on the primary key and abort the whole insert batch — the
 * `onConflict:id, ignoreDuplicates` upsert makes the call resilient.
 */
async function ensureSeedRecommendations(
  sb: Supa,
  projectId: string,
  recs: PastRecommendation[]
) {
  const { data: existingRecs, error: recReadErr } = await sb
    .from('pw_recommendations')
    .select('id, report_label')
    .eq('project_id', projectId);
  if (recReadErr) {
    console.error('[pw seed] failed to read existing recommendations', {
      projectId,
      error: recReadErr.message,
    });
  }
  const haveRecs = new Set((existingRecs ?? []).map(r => r.id));
  const recsToInsert = recs.filter(r => !haveRecs.has(r.id));
  if (recsToInsert.length > 0) {
    const { error } = await sb.from('pw_recommendations').upsert(
      recsToInsert.map(r => ({
        id: r.id,
        project_id: projectId,
        area: r.area,
        title: r.title,
        summary: r.summary,
        status: r.status,
        report_id: r.report?.id ?? '',
        report_label: r.report?.label ?? '',
        report_url: r.report?.url ?? '',
        tags: r.tags ?? [],
        is_seed: true,
      })),
      { onConflict: 'id', ignoreDuplicates: true }
    );
    if (error) {
      console.error('[pw seed] failed to insert recommendations', {
        projectId,
        attempted: recsToInsert.length,
        error: error.message,
      });
      return;
    }
    const events = recsToInsert.flatMap(r =>
      r.uptakeEvents.map(e => ({
        recommendation_id: r.id,
        occurred_at: e.date,
        note: e.note,
        source_url: e.sourceUrl ?? '',
      }))
    );
    if (events.length > 0) {
      const { error: evErr } = await sb
        .from('pw_recommendation_events')
        .insert(events);
      if (evErr) {
        console.error('[pw seed] failed to insert recommendation events', {
          projectId,
          attempted: events.length,
          error: evErr.message,
        });
      }
    }
  }

  // Backfill the source-report label on any pre-existing rows that predate the
  // report columns and were missed by migration 042's `is_seed=true` filter, so
  // they no longer render under the "Unlabelled" group.
  const unlabelledIds = new Set(
    (existingRecs ?? []).filter(r => !r.report_label).map(r => r.id)
  );
  const toLabel = recs.filter(r => r.report && unlabelledIds.has(r.id));
  for (const r of toLabel) {
    const { error: lblErr } = await sb
      .from('pw_recommendations')
      .update({
        report_id: r.report!.id,
        report_label: r.report!.label,
        report_url: r.report!.url,
      })
      .eq('id', r.id)
      .eq('project_id', projectId);
    if (lblErr) {
      console.error('[pw seed] failed to backfill recommendation report label', {
        projectId,
        id: r.id,
        error: lblErr.message,
      });
    }
  }
}

// Per-request memoization: the project page invokes ensureSeedDataFor from
// getProject, listIndicators, and listRecommendations in parallel. Without
// cache() that's 3× the read-then-conditional-write traffic per render.
const ensureSeedDataFor = cache(async function ensureSeedDataFor(projectId: string) {
  const sb = getServerSupabase();
  if (!sb) return;

  if (projectId === 'policy-gap-2-0') {
    // ESABCC report indicators are the "existing" group; ECNO ones are the
    // "additional" group. Both seed into the same table — the UI derives the
    // group from the indicator id prefix.
    await ensureSeedIndicators(sb, projectId, [
      ...ESABCC_REPORT_INDICATORS,
      ...ECNO_INDICATORS,
    ]);
    await ensureSeedRecommendations(sb, projectId, SEED_RECOMMENDATIONS);
  } else if (projectId === 'industry-project') {
    // The Industry Project copies the Policy Gap toolset, scoped to industry:
    // industry indicators and the industry-tagged recommendations.
    await ensureSeedModules(sb, projectId);
    await ensureSeedIndicators(sb, projectId, INDUSTRY_INDICATORS);
    await ensureSeedRecommendations(sb, projectId, INDUSTRY_SEED_RECOMMENDATIONS);
  }
});

export async function listProjects(): Promise<DBProject[]> {
  noStore();
  const sb = getServerSupabase();
  if (!sb) return [];
  const { data: projects } = await sb
    .from('pw_projects')
    .select('*')
    .order('is_seed', { ascending: false })
    .order('created_at', { ascending: true });
  if (!projects) return [];
  const { data: modules } = await sb
    .from('pw_modules')
    .select('*')
    .order('position', { ascending: true });
  return projects.map(p => ({
    id: p.id,
    name: p.name,
    shortDescription: p.description,
    isSeed: !!p.is_seed,
    modules: (modules ?? [])
      .filter(m => m.project_id === p.id)
      .map<WorkspaceModule>(m => ({
        id: m.id,
        kind: m.kind as WorkspaceModuleKind,
        name: m.name,
        description: m.description,
      })),
  }));
}

export async function getProject(projectId: string): Promise<DBProject | null> {
  noStore();
  const sb = getServerSupabase();
  if (!sb) return null;
  await ensureSeedDataFor(projectId);
  const { data: p } = await sb.from('pw_projects').select('*').eq('id', projectId).maybeSingle();
  if (!p) return null;
  const { data: modules } = await sb
    .from('pw_modules')
    .select('*')
    .eq('project_id', projectId)
    .order('position', { ascending: true });
  return {
    id: p.id,
    name: p.name,
    shortDescription: p.description,
    isSeed: !!p.is_seed,
    modules: (modules ?? []).map<WorkspaceModule>(m => ({
      id: m.id,
      kind: m.kind as WorkspaceModuleKind,
      name: m.name,
      description: m.description,
    })),
  };
}

/** In-memory seed list used when Supabase is not configured (dev / preview). */
function seedIndicators(projectId: string): DBIndicator[] {
  if (projectId === 'industry-project') {
    return INDUSTRY_INDICATORS.map(i => ({ ...i, group: 'additional' as const }));
  }
  if (projectId !== 'policy-gap-2-0') return [];
  return [
    ...ESABCC_REPORT_INDICATORS.map(i => ({ ...i, group: 'esabcc' as const })),
    ...ECNO_INDICATORS.map(i => ({
      ...i,
      group: 'additional' as const,
      duplicateOf: i.duplicateOf ?? ECNO_TO_ESABCC_DUPLICATE[i.id],
    })),
  ];
}

export async function listIndicators(projectId: string): Promise<DBIndicator[]> {
  // Disable Next.js's data cache for this read so a stale Supabase
  // response from a previous deploy can't keep masking newly-seeded
  // indicators. The /project-workspace pages are already
  // `force-dynamic`, but the Supabase JS client wraps `fetch`, which
  // Next.js will cache by default unless the route explicitly opts out.
  noStore();
  const sb = getServerSupabase();
  if (!sb) return seedIndicators(projectId);
  await ensureSeedDataFor(projectId);
  const { data: rows } = await sb
    .from('pw_indicators')
    .select('*')
    .eq('project_id', projectId)
    .order('is_seed', { ascending: false })
    .order('created_at', { ascending: true });
  if (!rows || rows.length === 0) return [];
  const ids = rows.map(r => r.id);
  const { data: points } = await sb
    .from('pw_indicator_points')
    .select('*')
    .in('indicator_id', ids);
  const esabccById = new Map(ESABCC_REPORT_INDICATORS.map(i => [i.id, i]));
  return rows.map<DBIndicator>(r => {
    const isEsabcc = r.id.startsWith('esabcc-');
    const meta = esabccById.get(r.id);
    return {
      id: r.id,
      name: r.name,
      category: r.category as Indicator['category'],
      unit: r.unit,
      description: r.description,
      source: r.source,
      sourceUrl: r.source_url,
      direction: r.direction as 'up' | 'down',
      targetValue: r.target_value ?? undefined,
      targetYear: r.target_year ?? undefined,
      isSeed: !!r.is_seed,
      group: isEsabcc ? 'esabcc' : 'additional',
      code: meta?.code,
      duplicateOf: meta?.duplicateOf ?? ECNO_TO_ESABCC_DUPLICATE[r.id],
      data: (points ?? [])
        .filter(p => p.indicator_id === r.id)
        .map<IndicatorDataPoint>(p => ({ year: p.year, value: p.value }))
        .sort((a, b) => a.year - b.year),
    };
  });
}

/**
 * Stored Excel helper-column layouts, keyed by indicator id. Only indicators
 * that have been round-tripped through the workbook have a row; everything
 * else falls back to a plain Year/Value tab at export time.
 */
export async function listIndicatorSheets(
  projectId: string
): Promise<Record<string, IndicatorSheetLayout>> {
  noStore();
  const sb = getServerSupabase();
  if (!sb) return {};
  const { data: inds } = await sb
    .from('pw_indicators')
    .select('id')
    .eq('project_id', projectId);
  const ids = (inds ?? []).map(r => r.id);
  if (ids.length === 0) return {};
  const { data } = await sb
    .from('pw_indicator_sheets')
    .select('indicator_id, layout')
    .in('indicator_id', ids);
  const out: Record<string, IndicatorSheetLayout> = {};
  for (const r of data ?? []) {
    const layout = normalizeLayout(r.layout);
    if (layout) out[r.indicator_id] = layout;
  }
  return out;
}

export async function listRecommendations(projectId: string): Promise<DBRecommendation[]> {
  noStore();
  const sb = getServerSupabase();
  if (!sb) return [];
  await ensureSeedDataFor(projectId);
  const { data: rows } = await sb
    .from('pw_recommendations')
    .select('*')
    .eq('project_id', projectId)
    .order('is_seed', { ascending: false })
    .order('created_at', { ascending: true });
  if (!rows || rows.length === 0) return [];
  const ids = rows.map(r => r.id);
  const { data: events } = await sb
    .from('pw_recommendation_events')
    .select('*')
    .in('recommendation_id', ids)
    .order('occurred_at', { ascending: true });
  // Existing seed rows are backfilled with their report by migration 042; new
  // rows carry it from the seed/create path. A blank label means "unlabelled".
  return rows.map<DBRecommendation>(r => ({
    id: r.id,
    area: r.area,
    title: r.title,
    summary: r.summary,
    status: r.status as RecommendationStatus,
    report: r.report_label
      ? { id: r.report_id || '', label: r.report_label, url: r.report_url || '' }
      : undefined,
    tags: Array.isArray(r.tags) && r.tags.length > 0 ? r.tags : undefined,
    uptakeEvents: (events ?? [])
      .filter(e => e.recommendation_id === r.id)
      .map(e => ({
        id: e.id,
        date: e.occurred_at,
        note: e.note,
        sourceUrl: e.source_url || undefined,
      })),
  }));
}

export async function listMemberStateCells(projectId: string): Promise<MemberStateCell[]> {
  const sb = getServerSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from('pw_member_state_cells')
    .select('*')
    .eq('project_id', projectId);
  return (data ?? []).map(r => ({
    projectId: r.project_id,
    countryCode: r.country_code,
    sectorId: r.sector_id,
    status: r.status,
    note: r.note,
  }));
}

export async function listPolicyAnnotations(
  projectId?: string,
  policyId?: string
): Promise<PolicyAnnotation[]> {
  const sb = getServerSupabase();
  if (!sb) return [];
  let q = sb.from('pw_policy_annotations').select('*').order('created_at', { ascending: false });
  if (projectId) q = q.eq('project_id', projectId);
  if (policyId) q = q.eq('policy_id', policyId);
  const { data } = await q;
  return (data ?? []).map(r => ({
    id: r.id,
    projectId: r.project_id,
    policyId: r.policy_id,
    kind: r.kind,
    field: r.field,
    value: r.value,
    status: r.status,
    promotedAt: r.promoted_at ?? null,
    createdBy: r.created_by,
    createdAt: r.created_at,
  }));
}

/**
 * Returns the last-promoted edit per (policy, field). Read by both the
 * workspace policy-analysis tab and the EU Policy Navigator's sectoral
 * overview so promoted edits replace the bundled SECTOR_POLICIES text
 * without anyone having to edit the data file.
 */
export async function getPolicyOverrides(): Promise<PolicyOverrideMap> {
  const sb = getServerSupabase();
  if (!sb) return {};
  const { data } = await sb
    .from('pw_policy_annotations')
    .select('policy_id, field, value, promoted_at')
    .eq('kind', 'edit')
    .not('promoted_at', 'is', null)
    .order('promoted_at', { ascending: true });
  const out: PolicyOverrideMap = {};
  for (const r of data ?? []) {
    if (!r.field) continue;
    out[r.policy_id] ??= {};
    // Later promotions win (ordered ASC, so last write overrides).
    out[r.policy_id][r.field] = r.value ?? '';
  }
  return out;
}

export async function listPolicyCodes(
  projectId: string,
  policyId?: string
): Promise<PolicyCode[]> {
  const sb = getServerSupabase();
  if (!sb) return [];
  let q = sb
    .from('pw_policy_codes')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (policyId) q = q.eq('policy_id', policyId);
  const { data } = await q;
  return (data ?? []).map(r => ({
    id: r.id,
    projectId: r.project_id,
    policyId: r.policy_id,
    codeId: r.code_id,
    source: r.source,
    parentCodeId: r.parent_code_id ?? null,
    label: r.label ?? '',
    color: r.color ?? '#94A3B8',
    removed: !!r.removed,
    createdAt: r.created_at,
  }));
}

export async function getCustomModuleContent(
  projectId: string,
  moduleId: string
): Promise<string> {
  const sb = getServerSupabase();
  if (!sb) return '';
  const { data } = await sb
    .from('pw_custom_module_content')
    .select('content')
    .eq('project_id', projectId)
    .eq('module_id', moduleId)
    .maybeSingle();
  return data?.content ?? '';
}
