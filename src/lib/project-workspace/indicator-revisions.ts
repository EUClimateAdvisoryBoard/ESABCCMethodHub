/**
 * Indicator Database audit log + version archive.
 * -----------------------------------------------
 * Server-side helpers behind `pw_indicator_revisions` (migration 044). Every
 * write path in the Indicator Database calls `recordIndicatorRevision` after a
 * successful change, which:
 *
 *   1. snapshots the indicator's current state (metadata + plotted series +
 *      calc-grid layout),
 *   2. resolves the acting user's display name, and
 *   3. inserts one immutable revision row (who / when / what + the snapshot).
 *
 * `applySnapshot` does the reverse — it writes a stored snapshot back onto the
 * live indicator so any prior version can be restored.
 *
 * Recording is best-effort: a failure to log is reported to the server console
 * but never aborts the underlying data change.
 */
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerSupabase } from '@/lib/supabase-server';
import { normalizeLayout, type IndicatorSheetLayout } from '@/lib/project-workspace/indicator-sheet';

export type IndicatorRevisionAction =
  | 'create'
  | 'edit-sheet'
  | 'import'
  | 'refresh'
  | 'point-upsert'
  | 'point-delete'
  | 'metadata'
  | 'restore'
  | 'delete';

export interface IndicatorSnapshotMetadata {
  name: string;
  category: string;
  unit: string;
  description: string;
  source: string;
  sourceUrl: string;
  direction: 'up' | 'down';
  targetValue: number | null;
  targetYear: number | null;
  isSeed: boolean;
}

export interface IndicatorSnapshot {
  metadata: IndicatorSnapshotMetadata | null;
  points: { year: number; value: number }[];
  layout: IndicatorSheetLayout | null;
}

export interface IndicatorRevision {
  id: number;
  indicatorId: string;
  projectId: string;
  action: IndicatorRevisionAction;
  summary: string;
  changedBy: string | null;
  changedByName: string;
  changedAt: string;
  snapshot: IndicatorSnapshot | null;
}

/** Human-readable label for each action, shared with the UI via the API shape. */
export const REVISION_ACTION_LABELS: Record<IndicatorRevisionAction, string> = {
  create: 'Created',
  'edit-sheet': 'Edited data / calc grid',
  import: 'Imported from Excel',
  refresh: 'Refreshed from source',
  'point-upsert': 'Edited a data point',
  'point-delete': 'Removed a data point',
  metadata: 'Edited details',
  restore: 'Restored a previous version',
  delete: 'Deleted indicator',
};

/** Read the indicator's full current state (metadata + series + grid layout). */
export async function snapshotIndicator(
  sb: SupabaseClient,
  indicatorId: string
): Promise<IndicatorSnapshot | null> {
  const { data: row } = await sb
    .from('pw_indicators')
    .select(
      'name, category, unit, description, source, source_url, direction, target_value, target_year, is_seed'
    )
    .eq('id', indicatorId)
    .maybeSingle();
  if (!row) return null;

  const { data: points } = await sb
    .from('pw_indicator_points')
    .select('year, value')
    .eq('indicator_id', indicatorId)
    .order('year', { ascending: true });

  const { data: sheet } = await sb
    .from('pw_indicator_sheets')
    .select('layout')
    .eq('indicator_id', indicatorId)
    .maybeSingle();

  return {
    metadata: {
      name: row.name,
      category: row.category,
      unit: row.unit,
      description: row.description,
      source: row.source,
      sourceUrl: row.source_url,
      direction: row.direction as 'up' | 'down',
      targetValue: row.target_value ?? null,
      targetYear: row.target_year ?? null,
      isSeed: !!row.is_seed,
    },
    points: (points ?? []).map(p => ({ year: p.year, value: p.value })),
    layout: sheet ? normalizeLayout(sheet.layout) : null,
  };
}

/** Default one-line summary describing a snapshot's shape. */
function describeSnapshot(s: IndicatorSnapshot | null): string {
  if (!s) return '';
  const pts = s.points.length;
  const cols = s.layout?.columns.length ?? 0;
  const parts = [`${pts} data point${pts === 1 ? '' : 's'}`];
  if (cols > 1) parts.push(`${cols} columns`);
  return parts.join(' · ');
}

/** Authoritative display name for the acting user (profile name → email). */
async function resolveActorName(user: { id: string; email?: string | null }): Promise<string> {
  const admin = getServerSupabase();
  if (admin) {
    const { data } = await admin
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();
    if (data?.display_name) return data.display_name as string;
  }
  return user.email ?? 'Someone';
}

/**
 * Append one revision to the archive. Best-effort: never throws — a logging
 * failure must not roll back the data change it is recording.
 *
 * Pass `snapshot` explicitly when the live row is about to disappear (delete)
 * or when you already have it; otherwise it is read from the DB.
 */
export async function recordIndicatorRevision(
  sb: SupabaseClient,
  opts: {
    indicatorId: string;
    projectId?: string;
    action: IndicatorRevisionAction;
    summary?: string;
    user: { id: string; email?: string | null };
    snapshot?: IndicatorSnapshot | null;
  }
): Promise<void> {
  try {
    const snapshot =
      opts.snapshot !== undefined ? opts.snapshot : await snapshotIndicator(sb, opts.indicatorId);

    let projectId = opts.projectId;
    if (!projectId) {
      const { data } = await sb
        .from('pw_indicators')
        .select('project_id')
        .eq('id', opts.indicatorId)
        .maybeSingle();
      projectId = (data?.project_id as string | undefined) ?? undefined;
    }
    if (!projectId) {
      console.error('[pw revision] no project_id resolvable; skipping log', {
        indicatorId: opts.indicatorId,
        action: opts.action,
      });
      return;
    }

    const changedByName = await resolveActorName(opts.user);
    const summary = opts.summary ?? describeSnapshot(snapshot);

    const { error } = await sb.from('pw_indicator_revisions').insert({
      indicator_id: opts.indicatorId,
      project_id: projectId,
      action: opts.action,
      summary,
      snapshot: snapshot ?? {},
      changed_by: opts.user.id,
      changed_by_name: changedByName,
    });
    if (error) {
      console.error('[pw revision] insert failed', {
        indicatorId: opts.indicatorId,
        action: opts.action,
        error: error.message,
      });
    }
  } catch (e) {
    console.error('[pw revision] unexpected error', {
      indicatorId: opts.indicatorId,
      action: opts.action,
      error: (e as Error).message,
    });
  }
}

function mapRevision(r: Record<string, unknown>): IndicatorRevision {
  const snap = (r.snapshot as Record<string, unknown> | null) ?? null;
  const hasSnap = !!snap && Object.keys(snap).length > 0;
  return {
    id: Number(r.id),
    indicatorId: r.indicator_id as string,
    projectId: r.project_id as string,
    action: r.action as IndicatorRevisionAction,
    summary: (r.summary as string) ?? '',
    changedBy: (r.changed_by as string | null) ?? null,
    changedByName: (r.changed_by_name as string) ?? '',
    changedAt: r.changed_at as string,
    snapshot: hasSnap ? (snap as unknown as IndicatorSnapshot) : null,
  };
}

/** Revision history for one indicator, newest first. */
export async function listIndicatorRevisions(
  sb: SupabaseClient,
  indicatorId: string
): Promise<IndicatorRevision[]> {
  const { data } = await sb
    .from('pw_indicator_revisions')
    .select('*')
    .eq('indicator_id', indicatorId)
    .order('changed_at', { ascending: false })
    .order('id', { ascending: false });
  return (data ?? []).map(mapRevision);
}

/** Load a single revision (used by restore), scoped to its indicator. */
export async function getIndicatorRevision(
  sb: SupabaseClient,
  indicatorId: string,
  revisionId: number
): Promise<IndicatorRevision | null> {
  const { data } = await sb
    .from('pw_indicator_revisions')
    .select('*')
    .eq('id', revisionId)
    .eq('indicator_id', indicatorId)
    .maybeSingle();
  return data ? mapRevision(data) : null;
}

/**
 * Write a stored snapshot back onto the live indicator (restore). Replaces the
 * plotted series exactly (years not in the snapshot are dropped) and the grid
 * layout, and restores the editable metadata. Returns `{ error }` on failure.
 */
export async function applySnapshot(
  sb: SupabaseClient,
  indicatorId: string,
  snapshot: IndicatorSnapshot,
  updatedBy: string | null
): Promise<{ error?: string }> {
  if (snapshot.metadata) {
    const m = snapshot.metadata;
    const { error } = await sb
      .from('pw_indicators')
      .update({
        name: m.name,
        category: m.category,
        unit: m.unit,
        description: m.description,
        source: m.source,
        source_url: m.sourceUrl,
        direction: m.direction,
        target_value: m.targetValue,
        target_year: m.targetYear,
      })
      .eq('id', indicatorId);
    if (error) return { error: error.message };
  }

  const pts = snapshot.points ?? [];
  if (pts.length > 0) {
    const { error: upErr } = await sb.from('pw_indicator_points').upsert(
      pts.map(p => ({ indicator_id: indicatorId, year: p.year, value: p.value })),
      { onConflict: 'indicator_id,year' }
    );
    if (upErr) return { error: upErr.message };
    const { error: delErr } = await sb
      .from('pw_indicator_points')
      .delete()
      .eq('indicator_id', indicatorId)
      .not('year', 'in', `(${pts.map(p => p.year).join(',')})`);
    if (delErr) return { error: delErr.message };
  } else {
    const { error: delErr } = await sb
      .from('pw_indicator_points')
      .delete()
      .eq('indicator_id', indicatorId);
    if (delErr) return { error: delErr.message };
  }

  if (snapshot.layout) {
    const { error } = await sb.from('pw_indicator_sheets').upsert(
      { indicator_id: indicatorId, layout: snapshot.layout, updated_by: updatedBy },
      { onConflict: 'indicator_id' }
    );
    if (error) return { error: error.message };
  }

  return {};
}
