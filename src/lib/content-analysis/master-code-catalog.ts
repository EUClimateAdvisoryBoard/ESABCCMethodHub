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

/** All master codes, in seed order. */
export function getAllMasterCodes(): CodeNode[] {
  return Array.from(getCache().values());
}

/** Root codes (no parent). */
export function getRootCodes(): CodeNode[] {
  return getAllMasterCodes().filter(c => c.parentId === null);
}

/** Direct children of a code. */
export function getMasterCodeChildren(codeId: string): CodeNode[] {
  return getAllMasterCodes().filter(c => c.parentId === codeId);
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

/** All descendant code ids (inclusive of the given code itself). */
export function getDescendantIds(codeId: string): Set<string> {
  const result = new Set<string>();
  const queue = [codeId];
  const all = getAllMasterCodes();
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (result.has(cur)) continue;
    result.add(cur);
    for (const c of all) {
      if (c.parentId === cur) queue.push(c.id);
    }
  }
  return result;
}
