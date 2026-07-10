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
import { BETA_INDICATORS, BETA_ADAPTATION_INDICATORS } from '@/data/beta-indicators';
import { ADVANCED_INDICATORS, ADVANCED_ADAPTATION_INDICATORS } from '@/data/advanced-indicators';
import {
  ALL_ESABCC_RECOMMENDATIONS,
  type PastRecommendation,
  type RecommendationStatus,
} from '@/data/esabcc-recommendations';
import { INDUSTRY_INDICATORS } from '@/data/industry-indicators';
import { BPIE_BUILDINGS_INDICATORS } from '@/data/bpie-buildings-indicators';
import { INDUSTRY_READING_SEED } from '@/data/industry-reading-list';
import { CLEAN_TECH_READING_LIST } from '@/data/clean-tech-reading-list';
import { CHAPTER_TAGS } from '@/lib/content-analysis/chapter-tags';
import { addToCaCorpus, getCaCorpus, getCaReading, setCaReading } from '@/lib/content-analysis-store';
import type { CorpusDocMeta } from '@/lib/content-analysis/types';

/** Recommendations seeded into the Policy Gap project, with their report label. */
const SEED_RECOMMENDATIONS: PastRecommendation[] = [...ALL_ESABCC_RECOMMENDATIONS];

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
  // Force the point-backfill pass too, so a deliberate reseed adds any new
  // years the monthly refresh appended to indicators that were already seeded
  // (the lazy on-render path skips this to stay cheap).
  await ensureSeedDataFor(projectId, true);
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
      featured: m.featured ?? false,
      beta: m.beta ?? false,
    }))
  );
  if (error) {
    console.error('[pw seed] failed to insert modules', { projectId, error: error.message });
  }
}

/**
 * Insert any of `pool` that aren't already present in the project.
 *
 * When `backfillPoints` is set, also top up the time series of indicators that
 * already exist — the monthly Eurostat/EEA refresh appends later years to the
 * bundled data, but the steady-state path below skips an existing indicator
 * entirely, so without this pass those new years never reach the DB. The
 * backfill is gated (off for the lazy on-render path) because it costs an extra
 * point read; it runs on a deliberate reseed.
 */
async function ensureSeedIndicators(
  sb: Supa,
  projectId: string,
  pool: Indicator[],
  backfillPoints = false
) {
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
  // Self-healing point top-up: when the bundled series carry years the DB was
  // seeded before (the monthly Eurostat/EEA refresh appends new points to the
  // TS files, but an already-seeded DB never received them — the gap the user
  // sees as "the workspace chart stops at 2022"), run the insert-only backfill
  // once per bundle generation. A tiny signature stamp (read below) keeps the
  // per-render cost at one row; an explicit admin reseed still forces the pass.
  const sig = seedPoolSignature(pool);
  const runBackfill =
    backfillPoints || (await seedPointsBackfillPending(sb, projectId, sig));
  const toInsert = pool.filter(i => !have.has(i.id));
  if (toInsert.length === 0) {
    if (runBackfill) {
      const ok = await backfillExistingPoints(sb, pool, have);
      if (ok) await recordSeedPointsSignature(sb, projectId, sig);
    }
    return;
  }
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

  // Top up the series of the indicators that already existed (the ones skipped
  // above) with any years the refresh has added since they were first seeded.
  if (runBackfill) {
    const ok = await backfillExistingPoints(sb, pool, have);
    if (ok) await recordSeedPointsSignature(sb, projectId, sig);
  }
}

/**
 * Storage key for the seed-point backfill stamp in `pw_flowchart_state` (the
 * generic per-project key→JSON store from migration 064). The stamp records
 * which bundled-data generation the point backfill last ran against, so the
 * lazy on-render path only pays the full points read once per refresh — and a
 * point a user deliberately deleted afterwards is not resurrected on every
 * render (only by the next data refresh or an explicit admin reseed, the same
 * semantics as the SQL backfill migration).
 */
const SEED_POINTS_STATE_KEY = 'esabcc-seed-points-backfill';

/** Cheap deterministic fingerprint of the bundled seed series (changes whenever the refresh adds/removes points). */
function seedPoolSignature(pool: Indicator[]): string {
  let points = 0;
  let yearSum = 0;
  for (const i of pool) {
    points += i.data.length;
    for (const p of i.data) yearSum += p.year;
  }
  return `v1:${pool.length}:${points}:${yearSum}`;
}

/** True when the stored stamp doesn't match the bundled data (or can't be read — the backfill is idempotent, so err on running it). */
async function seedPointsBackfillPending(
  sb: Supa,
  projectId: string,
  sig: string
): Promise<boolean> {
  try {
    const { data, error } = await sb
      .from('pw_flowchart_state')
      .select('data')
      .eq('project_id', projectId)
      .eq('storage_key', SEED_POINTS_STATE_KEY)
      .maybeSingle();
    if (error) return true;
    return (data?.data as { signature?: string } | null)?.signature !== sig;
  } catch {
    return true;
  }
}

async function recordSeedPointsSignature(
  sb: Supa,
  projectId: string,
  sig: string
): Promise<void> {
  try {
    await sb.from('pw_flowchart_state').upsert(
      {
        project_id: projectId,
        storage_key: SEED_POINTS_STATE_KEY,
        data: { signature: sig, stampedAt: new Date().toISOString() },
      },
      { onConflict: 'project_id,storage_key' }
    );
  } catch {
    // Stamp writes are best-effort: without it the backfill re-runs next
    // render, which is correct (just less cheap).
  }
}

/**
 * Insert any data points missing from `pw_indicator_points` for indicators that
 * are already in the DB. Reads the stored (indicator_id, year) keys first and
 * inserts only the genuinely-missing ones with `ignoreDuplicates`, so existing
 * values are never overwritten and the call is a no-op once the DB is caught up.
 */
async function backfillExistingPoints(
  sb: Supa,
  pool: Indicator[],
  existingIds: Set<string>
): Promise<boolean> {
  const ids = pool.filter(i => existingIds.has(i.id)).map(i => i.id);
  if (ids.length === 0) return true;
  const { data: existingPts, error: ptReadErr } = await sb
    .from('pw_indicator_points')
    .select('indicator_id, year')
    .in('indicator_id', ids);
  if (ptReadErr) {
    console.error('[pw seed] failed to read existing indicator points', {
      error: ptReadErr.message,
    });
    return false;
  }
  const haveKey = new Set((existingPts ?? []).map(p => `${p.indicator_id}:${p.year}`));
  const missing = pool
    .filter(i => existingIds.has(i.id))
    .flatMap(i =>
      i.data
        .filter(p => !haveKey.has(`${i.id}:${p.year}`))
        .map(p => ({ indicator_id: i.id, year: p.year, value: p.value }))
    );
  if (missing.length === 0) return true;
  const { error } = await sb
    .from('pw_indicator_points')
    .upsert(missing, { onConflict: 'indicator_id,year', ignoreDuplicates: true });
  if (error) {
    console.error('[pw seed] failed to backfill indicator points', {
      attempted: missing.length,
      error: error.message,
    });
    return false;
  }
  console.log('[pw seed] backfilled indicator points', { inserted: missing.length });
  return true;
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
const ensureSeedDataFor = cache(async function ensureSeedDataFor(
  projectId: string,
  backfillPoints = false
) {
  const sb = getServerSupabase();
  if (!sb) return;

  if (projectId === 'policy-gap-2-0') {
    // ESABCC report indicators are the "existing" group; ECNO ones are the
    // "additional" group. Both seed into the same table — the UI derives the
    // group from the indicator id prefix.
    await ensureSeedIndicators(sb, projectId, [
      ...ESABCC_REPORT_INDICATORS,
      ...ECNO_INDICATORS,
      ...BETA_INDICATORS,
      ...BETA_ADAPTATION_INDICATORS,
      ...ADVANCED_INDICATORS,
      ...ADVANCED_ADAPTATION_INDICATORS,
      ...BPIE_BUILDINGS_INDICATORS,
    ], backfillPoints);
    await ensureSeedRecommendations(sb, projectId, SEED_RECOMMENDATIONS);
  } else if (projectId === 'industry-project') {
    // The Industry Project is scoped to a single tool: the industry-tagged
    // policy analysis. The indicator database, recommendations tracker and
    // member-state space were removed (see migration 047).
    await ensureSeedModules(sb, projectId);
    // Seed the scoping-phase "Review of policy papers" reading list into the
    // shared corpus + reading-responsibility store, so the Reading view opens
    // pre-populated with who is reading what.
    await ensureIndustryReadingSeed();
    // Seed the Overview Industry → Clean Tech catalogue's literature into the
    // same corpus, tagged with the "Clean Tech" chapter so it can be pulled up
    // per chapter and in the reference manager.
    await ensureCleanTechReadingSeed();
  }
});

/**
 * Idempotently seed the industry reading list (transcribed from the team's
 * scoping-phase Excel) into the workspace corpus and the reading-responsibility
 * store.
 *
 * The corpus rows and the reader assignments are seeded INDEPENDENTLY, on
 * purpose: the corpus was seeded before the `content_analysis_reading` table
 * (migration 074) existed, so its rows are already present while no reader was
 * ever persisted. Coupling the two (only setting readers when adding a missing
 * corpus row) meant the readers never landed once the corpus was in place. Each
 * half now self-heals against its own store.
 */
async function ensureIndustryReadingSeed(): Promise<void> {
  const projectId = 'industry-project';

  // 1) Corpus: add any rows not already present (self-healing, idempotent).
  //    Rows that exist but carry no stored metadata (seeded before the
  //    `doc_meta` column landed) are re-added too — the upsert refreshes
  //    doc_meta, without which the Word add-in cannot resolve these synthetic
  //    ids and silently drops the whole reading list from its picker.
  let corpusMeta: Map<string, unknown>;
  try {
    corpusMeta = new Map((await getCaCorpus(projectId)).map(e => [e.documentId, e.meta]));
  } catch {
    // Corpus unreadable — skip this pass rather than risk duplicates.
    return;
  }
  for (const item of INDUSTRY_READING_SEED) {
    if (corpusMeta.get(item.id)) continue;
    const referenceType = item.tier === 'scientific' ? 'article' : 'report';
    const meta: CorpusDocMeta = {
      id: item.id,
      title: item.title,
      shortTitle: item.title.length > 90 ? `${item.title.slice(0, 87)}…` : item.title,
      kind: 'report',
      sourceKind: 'reference',
      referenceType,
      referenceAuthors: item.source || undefined,
      referenceUrl: item.url || undefined,
    };
    try {
      await addToCaCorpus(projectId, item.id, meta);
    } catch (err) {
      console.error('[pw seed] failed to seed industry reading corpus row', {
        id: item.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 2) Readers: seed the initial "who reads what" split ONCE — only when no seed
  //    document carries a reader yet — so we populate it without ever overriding
  //    a reader the team has since changed or cleared by hand. This runs even
  //    when the corpus is already fully present (the case that hid the seed).
  try {
    const seedIds = new Set(INDUSTRY_READING_SEED.map(i => i.id));
    const alreadyAssigned = (await getCaReading(projectId)).some(
      a => a.reader && seedIds.has(a.documentId),
    );
    if (!alreadyAssigned) {
      for (const item of INDUSTRY_READING_SEED) {
        if (!item.reader) continue;
        try {
          await setCaReading(projectId, item.id, item.reader);
        } catch (err) {
          console.error('[pw seed] failed to seed industry reader', {
            id: item.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
  } catch (err) {
    // Reading table missing/unreadable (migration 074 not applied yet) — the
    // reader seed is retried on the next render once the table exists.
    console.error('[pw seed] industry reader seed skipped', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Idempotently seed the Overview Industry → Clean Tech literature list into the
 * Industry Project corpus AND tag every row with the "Clean Tech" chapter tag,
 * so the reading appears in the workbench, the Chapter view (filtered to Clean
 * Tech) and the reference library. Mirrors `ensureIndustryReadingSeed`:
 *
 *   1) corpus rows keyed by the reading id (self-healing, idempotent);
 *   2) a Clean Tech chapter tag per row in `content_analysis_overall_tags`
 *      (upsert on the (document_id, code_id) primary key — a no-op on re-run);
 *   3) reader assignments, seeded once, never overriding a hand-set reader.
 */
async function ensureCleanTechReadingSeed(): Promise<void> {
  const projectId = 'industry-project';
  const cleanTechChapterId = CHAPTER_TAGS.find(c => c.name === 'Clean Tech')?.id;

  // 1) Corpus rows. As in ensureIndustryReadingSeed, rows without stored
  //    metadata are re-added so the upsert backfills doc_meta.
  let corpusMeta: Map<string, unknown>;
  try {
    corpusMeta = new Map((await getCaCorpus(projectId)).map(e => [e.documentId, e.meta]));
  } catch {
    return;
  }
  for (const item of CLEAN_TECH_READING_LIST) {
    if (corpusMeta.get(item.id)) continue;
    const referenceType = item.tier === 'scientific' ? 'article' : 'report';
    const meta: CorpusDocMeta = {
      id: item.id,
      title: item.title,
      shortTitle: item.title.length > 90 ? `${item.title.slice(0, 87)}…` : item.title,
      kind: 'report',
      sourceKind: 'reference',
      referenceType,
      referenceAuthors: item.source || undefined,
      referenceYear: item.year || undefined,
      referenceUrl: item.url || undefined,
    };
    try {
      await addToCaCorpus(projectId, item.id, meta);
    } catch (err) {
      console.error('[pw seed] failed to seed clean-tech reading corpus row', {
        id: item.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 2) Clean Tech chapter tag on every row (idempotent upsert).
  if (cleanTechChapterId) {
    const sb = getServerSupabase();
    if (sb) {
      const rows = CLEAN_TECH_READING_LIST.map(item => ({
        document_id: item.id,
        code_id: cleanTechChapterId,
      }));
      try {
        await sb
          .from('content_analysis_overall_tags')
          .upsert(rows, { onConflict: 'document_id,code_id', ignoreDuplicates: true });
      } catch (err) {
        console.error('[pw seed] failed to seed clean-tech chapter tags', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // 3) Reader assignments — seeded once, never overriding hand-set readers.
  try {
    const seedIds = new Set(CLEAN_TECH_READING_LIST.map(i => i.id));
    const alreadyAssigned = (await getCaReading(projectId)).some(
      a => a.reader && seedIds.has(a.documentId),
    );
    if (!alreadyAssigned) {
      for (const item of CLEAN_TECH_READING_LIST) {
        if (!item.reader) continue;
        try {
          await setCaReading(projectId, item.id, item.reader);
        } catch (err) {
          console.error('[pw seed] failed to seed clean-tech reader', {
            id: item.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
  } catch (err) {
    console.error('[pw seed] clean-tech reader seed skipped', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

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
        featured: !!m.featured,
        beta: !!m.beta,
      })),
  }));
}

export async function getProject(projectId: string): Promise<DBProject | null> {
  noStore();
  const sb = getServerSupabase();
  // Preview mode (no database configured): fall back to the seed projects so
  // the demo is browsable end-to-end. The landing page already lists these
  // read-only; returning them here means clicking a card opens the project
  // instead of hitting a 404. Per-tab data fetchers degrade to empty.
  if (!sb) return SEED_PROJECTS.find(p => p.id === projectId) ?? null;
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
      featured: !!m.featured,
      beta: !!m.beta,
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
    // Beta indicators carry their own group ('beta' / 'beta-adaptation').
    ...BETA_INDICATORS.map(i => ({ ...i, group: 'beta' as const })),
    ...BETA_ADAPTATION_INDICATORS.map(i => ({ ...i, group: 'beta-adaptation' as const })),
    // Advanced indicators carry their own group ('advanced' / 'advanced-adaptation').
    ...ADVANCED_INDICATORS.map(i => ({ ...i, group: 'advanced' as const })),
    ...ADVANCED_ADAPTATION_INDICATORS.map(i => ({ ...i, group: 'advanced-adaptation' as const })),
    // BPIE EU Buildings Climate Tracker indicators — listed with the other
    // "additional" indicators under the Buildings category.
    ...BPIE_BUILDINGS_INDICATORS.map(i => ({ ...i, group: 'additional' as const })),
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
  // Bundled metadata for every seeded indicator (ESABCC + beta + beta-adaptation
  // + ECNO). Used to restore fields the pw_indicators table doesn't store —
  // group, code, the beta flag, duplicateOf — and as the point self-heal source.
  const esabccById = new Map(
    [
      ...ESABCC_REPORT_INDICATORS,
      ...BETA_INDICATORS,
      ...BETA_ADAPTATION_INDICATORS,
      ...ADVANCED_INDICATORS,
      ...ADVANCED_ADAPTATION_INDICATORS,
      ...BPIE_BUILDINGS_INDICATORS,
      ...ECNO_INDICATORS,
    ].map(i => [i.id, i]),
  );
  // Self-heal: if a seeded indicator's row exists but its points never landed
  // (a first-seed that inserted the row then failed/raced on its points), the
  // chart would render blank. `points` is already in hand, so detecting the gap
  // is free; we repopulate from the bundled series and only write when there is
  // an actual gap, so the steady state costs nothing extra.
  const idsWithPoints = new Set((points ?? []).map(p => p.indicator_id));
  const missingPoints = rows
    .filter(r => esabccById.has(r.id) && !idsWithPoints.has(r.id))
    .flatMap(r =>
      (esabccById.get(r.id)?.data ?? []).map(p => ({
        indicator_id: r.id,
        year: p.year,
        value: p.value,
      }))
    );
  if (missingPoints.length > 0) {
    await sb
      .from('pw_indicator_points')
      .upsert(missingPoints, { onConflict: 'indicator_id,year', ignoreDuplicates: true });
  }
  return rows.map<DBIndicator>(r => {
    const isEsabcc = r.id.startsWith('esabcc-');
    const meta = esabccById.get(r.id);
    // pw_indicator_points has no afterReport column, so re-derive the flag from
    // the bundled metadata. Without this the post-report years lose their
    // orange + "NEW" styling once they're served from the DB.
    const afterReportYears = new Set(
      (meta?.data ?? []).filter(p => p.afterReport).map(p => p.year)
    );
    const dbData = (points ?? [])
      .filter(p => p.indicator_id === r.id)
      .map<IndicatorDataPoint>(p =>
        afterReportYears.has(p.year)
          ? { year: p.year, value: p.value, afterReport: true }
          : { year: p.year, value: p.value }
      )
      .sort((a, b) => a.year - b.year);
    // If the DB row had no points yet, serve the bundled series straight away
    // (the self-heal above persists them for next time).
    const data =
      dbData.length === 0 && meta?.data?.length
        ? [...meta.data].sort((a, b) => a.year - b.year)
        : dbData;
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
      group: meta?.group ?? (isEsabcc ? 'esabcc' : 'additional'),
      beta: meta?.beta,
      code: meta?.code,
      storyline: meta?.storyline,
      duplicateOf: meta?.duplicateOf ?? ECNO_TO_ESABCC_DUPLICATE[r.id],
      data,
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
