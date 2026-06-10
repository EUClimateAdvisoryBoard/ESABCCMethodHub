/**
 * Server-side store for the Project Workspace flow-chart boards & versions.
 * ------------------------------------------------------------------------
 * Backs the `pw_flowchart_state` table (migration 064): a generic per-project
 * key→JSON store. The `storageKey` is the same key the client uses in its
 * localStorage cache, so the client keeps instant synchronous reads while this
 * table is the shared source of truth — hydrated on mount, written through on
 * every edit, so every collaborator sees the same boards and versions.
 *
 * Primary backend: Supabase via the service-role client (`getServerSupabase`).
 * Fallback: a module-scoped in-memory map on `globalThis`, used only when
 * Supabase env vars are missing (local dev). The in-memory store is per-lambda
 * and lossy — it exists so local dev works, not as a durable path.
 */
import 'server-only';
import { getServerSupabase } from '@/lib/supabase-server';

export interface FlowchartStateItem {
  storageKey: string;
  data: unknown;
}

const g = globalThis as unknown as {
  __pwFlowchartState?: Map<string, Map<string, unknown>>;
};
if (!g.__pwFlowchartState) g.__pwFlowchartState = new Map();

function memProject(projectId: string): Map<string, unknown> {
  let m = g.__pwFlowchartState!.get(projectId);
  if (!m) {
    m = new Map();
    g.__pwFlowchartState!.set(projectId, m);
  }
  return m;
}

const MAX_ROWS = 2000;

interface StateRow {
  storage_key: string;
  data: unknown;
}

/** All flow-chart state rows for a project. */
export async function getFlowchartState(projectId: string): Promise<FlowchartStateItem[]> {
  const sb = getServerSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('pw_flowchart_state')
      .select('storage_key, data')
      .eq('project_id', projectId)
      .limit(MAX_ROWS);
    if (error) {
      console.error('[flowchart-state-store] getFlowchartState failed:', error.message);
      return [...memProject(projectId)].map(([storageKey, data]) => ({ storageKey, data }));
    }
    return (data as StateRow[]).map(r => ({ storageKey: r.storage_key, data: r.data }));
  }
  return [...memProject(projectId)].map(([storageKey, data]) => ({ storageKey, data }));
}

/** Upsert one key→JSON entry for a project. */
export async function setFlowchartState(
  projectId: string,
  storageKey: string,
  data: unknown,
): Promise<void> {
  const sb = getServerSupabase();
  if (sb) {
    const { error } = await sb
      .from('pw_flowchart_state')
      .upsert(
        { project_id: projectId, storage_key: storageKey, data, updated_at: new Date().toISOString() },
        { onConflict: 'project_id,storage_key' },
      );
    if (!error) return;
    console.error('[flowchart-state-store] setFlowchartState failed:', error.message);
    throw new Error(`setFlowchartState failed: ${error.message}`);
  }
  memProject(projectId).set(storageKey, data);
}

/** Delete one entry for a project. Idempotent. */
export async function deleteFlowchartState(projectId: string, storageKey: string): Promise<void> {
  const sb = getServerSupabase();
  if (sb) {
    const { error } = await sb
      .from('pw_flowchart_state')
      .delete()
      .eq('project_id', projectId)
      .eq('storage_key', storageKey);
    if (!error) return;
    console.error('[flowchart-state-store] deleteFlowchartState failed:', error.message);
    throw new Error(`deleteFlowchartState failed: ${error.message}`);
  }
  memProject(projectId).delete(storageKey);
}
