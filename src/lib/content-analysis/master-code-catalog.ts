/**
 * Flat lookup over the seeded master code taxonomy.
 * -------------------------------------------------
 * The seed snapshot in `./seed.ts` rebuilds the full content-analysis
 * world (codes + documents + segments + projects + suggestions); when
 * other modules only need to resolve a master code id → name / color /
 * parentId, building the whole snapshot is overkill and pulls in
 * unrelated dependencies. This module exposes a small, memoised lookup
 * derived once from `buildSeedSnapshot()` so callers (Policy Navigator
 * chips, workspace policy-codes panel) can stay decoupled from the
 * content-analysis store.
 */
import type { CodeNode } from './types';
import { buildSeedSnapshot } from './seed';

let CACHE: Map<string, CodeNode> | null = null;

function getCache(): Map<string, CodeNode> {
  if (CACHE) return CACHE;
  const snap = buildSeedSnapshot();
  const m = new Map<string, CodeNode>();
  for (const c of snap.codes) m.set(c.id, c);
  CACHE = m;
  return m;
}

export function getMasterCode(codeId: string): CodeNode | null {
  return getCache().get(codeId) ?? null;
}

/** Path of master codes from root to the given code, inclusive. */
export function getMasterCodePath(codeId: string): CodeNode[] {
  const cache = getCache();
  const path: CodeNode[] = [];
  let cur = cache.get(codeId);
  const guard = new Set<string>();
  while (cur && !guard.has(cur.id)) {
    path.unshift(cur);
    guard.add(cur.id);
    cur = cur.parentId ? cache.get(cur.parentId) ?? undefined : undefined;
  }
  return path;
}
