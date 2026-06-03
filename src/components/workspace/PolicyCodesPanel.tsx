/**
 * Project-scoped policy codes panel.
 * ----------------------------------
 * Renders the coding overlay for a single policy inside a workspace
 * project. The master taxonomy from the EU Policy Navigator
 * (POLICY_MASTER_TAGS + the seed code tree) is the starting point — the
 * panel shows those codes hierarchically. The first edit forks the
 * master tags into project-scoped rows, after which the project copy
 * diverges freely: master codes can be soft-removed (and restored), and
 * custom hierarchical codes can be added beneath any existing node.
 *
 * The shared master set used by the navigator is never touched.
 */
'use client';

import { useMemo, useState } from 'react';
import { POLICY_MASTER_TAGS } from '@/lib/content-analysis/policy-master-tags';
import { getMasterCode, getMasterCodePath } from '@/lib/content-analysis/master-code-catalog';
import { useMasterTagStatus, tagKey } from '@/lib/content-analysis/useMasterTagStatus';
import TagOriginBadge from '@/components/content-analysis/TagOriginBadge';
import type { CodeNode } from '@/lib/content-analysis/types';
import { pwApi } from '@/lib/project-workspace/client';
import type { PolicyCode } from '@/lib/project-workspace/db';

interface Props {
  projectId: string;
  policyId: string;
  initialCodes: PolicyCode[];
  isSignedIn: boolean;
}

/** Effective code shown in the tree. For master tags resolved via the
 *  catalog, master metadata wins; for project rows the row's own
 *  label/color/parent are used. */
interface DisplayNode {
  key: string;
  codeId: string;
  rowId: string | null;
  source: 'master' | 'custom';
  label: string;
  description?: string;
  color: string;
  parentCodeId: string | null;
  /** Master row that has been soft-removed. */
  removed: boolean;
  /** Master code that is itself a tag on this policy (not just a
   *  scaffold ancestor). Only tagged codes are toggleable. */
  isTaggedHere: boolean;
  /** Depth in the displayed tree (0 = root). */
  depth: number;
}

export default function PolicyCodesPanel({
  projectId,
  policyId,
  initialCodes,
  isSignedIn,
}: Props) {
  const [codes, setCodes] = useState<PolicyCode[]>(initialCodes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRemoved, setShowRemoved] = useState(false);
  const [addingUnder, setAddingUnder] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');

  // AI/human provenance for this policy's master tags.
  const { isConfirmed, confirm, revert, busyKey, confirmed } = useMasterTagStatus(policyId);

  const hasFork = codes.length > 0;

  // ── Resolve the displayed code set ─────────────────────────────────
  // Pre-fork: synthesise display nodes from POLICY_MASTER_TAGS.
  // Post-fork: drive the tree from `codes` (master rows + custom rows).
  const tree = useMemo<DisplayNode[]>(() => {
    const masterTagIds = POLICY_MASTER_TAGS[policyId] ?? [];

    // Collect every codeId we need to render — either as a tag itself or as
    // an ancestor on the path of a tag. That gives us a complete tree.
    const wantedMaster = new Set<string>();
    for (const id of masterTagIds) {
      for (const c of getMasterCodePath(id)) wantedMaster.add(c.id);
    }
    // Any custom row's parent that references a master code id is also wanted.
    for (const row of codes) {
      if (row.source === 'custom' && row.parentCodeId) {
        // Master ancestor path of the parent (if parent is itself master).
        for (const c of getMasterCodePath(row.parentCodeId)) {
          if (c) wantedMaster.add(c.id);
        }
      }
    }

    const rowByCodeId = new Map<string, PolicyCode>();
    for (const r of codes) rowByCodeId.set(r.codeId, r);

    const nodes: DisplayNode[] = [];

    // Master codes (synthesised or from rows).
    for (const codeId of wantedMaster) {
      const master = getMasterCode(codeId);
      if (!master) continue;
      const row = rowByCodeId.get(codeId);
      // Pre-fork: only show codes that are in masterTagIds OR ancestors of them
      // (already filtered by wantedMaster). Post-fork: a tag may have been
      // removed but we still need to render ancestors so children can attach.
      const isTaggedHere = masterTagIds.includes(codeId);
      const removed = row?.removed ?? false;
      // Ancestors that aren't themselves tagged are shown as "scaffold" rows
      // — visible only when they have visible children. We'll prune later.
      nodes.push({
        key: `m:${codeId}`,
        codeId,
        rowId: row?.id ?? null,
        source: 'master',
        label: master.name,
        description: master.description,
        color: master.color,
        parentCodeId: master.parentId,
        removed: isTaggedHere && removed,
        isTaggedHere,
        depth: 0,
      });
    }

    // Custom rows.
    for (const row of codes) {
      if (row.source !== 'custom') continue;
      nodes.push({
        key: `c:${row.codeId}`,
        codeId: row.codeId,
        rowId: row.id,
        source: 'custom',
        label: row.label,
        color: row.color,
        parentCodeId: row.parentCodeId,
        removed: row.removed,
        isTaggedHere: true,
        depth: 0,
      });
    }

    const byCodeId = new Map<string, DisplayNode>();
    for (const n of nodes) byCodeId.set(n.codeId, n);

    function depthOf(codeId: string, guard = new Set<string>()): number {
      const n = byCodeId.get(codeId);
      if (!n || !n.parentCodeId || guard.has(codeId)) return 0;
      guard.add(codeId);
      return 1 + depthOf(n.parentCodeId, guard);
    }
    for (const n of nodes) n.depth = depthOf(n.codeId);

    // Order: roots first, then DFS by parent → child, alphabetical inside.
    nodes.sort((a, b) => a.label.localeCompare(b.label));
    const byParent = new Map<string | null, DisplayNode[]>();
    for (const n of nodes) {
      const p = n.parentCodeId ?? null;
      if (!byParent.has(p)) byParent.set(p, []);
      byParent.get(p)!.push(n);
    }
    // Roots are nodes whose parent is null OR whose parent isn't in our set.
    const ordered: DisplayNode[] = [];
    const seen = new Set<string>();
    function walk(parentId: string | null) {
      const kids = byParent.get(parentId) ?? [];
      for (const kid of kids) {
        if (seen.has(kid.codeId)) continue;
        seen.add(kid.codeId);
        ordered.push(kid);
        walk(kid.codeId);
      }
    }
    walk(null);
    // Pick up any nodes whose parent isn't in the tree (orphans).
    for (const n of nodes) {
      if (!seen.has(n.codeId)) {
        seen.add(n.codeId);
        ordered.push(n);
        walk(n.codeId);
      }
    }
    return ordered;
  }, [codes, policyId]);

  // ── Mutations ──────────────────────────────────────────────────────
  async function withBusy<T>(fn: () => Promise<T>): Promise<T | null> {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    const res = await fetch(
      `/api/project-workspace/policy-codes?projectId=${encodeURIComponent(projectId)}&policyId=${encodeURIComponent(policyId)}`
    );
    if (!res.ok) return;
    const { codes: fresh } = (await res.json()) as { codes: PolicyCode[] };
    setCodes(fresh);
  }

  async function toggleMaster(codeId: string, removed: boolean) {
    await withBusy(async () => {
      await pwApi.toggleMasterPolicyCode({ projectId, policyId, codeId, removed });
      await refresh();
    });
  }

  async function addCustom(parentCodeId: string | null) {
    const label = newLabel.trim();
    if (!label) return;
    await withBusy(async () => {
      await pwApi.addCustomPolicyCode({
        projectId,
        policyId,
        label,
        parentCodeId,
      });
      setNewLabel('');
      setAddingUnder(null);
      await refresh();
    });
  }

  async function deleteCustom(rowId: string) {
    await withBusy(async () => {
      await pwApi.deletePolicyCode(rowId);
      await refresh();
    });
  }

  // ── Render ─────────────────────────────────────────────────────────
  const visibleTree = tree.filter(n => showRemoved || !n.removed);
  const masterTagIds = POLICY_MASTER_TAGS[policyId] ?? [];
  const noCodesAtAll =
    masterTagIds.length === 0 && codes.filter(c => c.source === 'custom').length === 0;

  return (
    <div className="rounded-lg border border-grey-200 bg-grey-50 p-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-tertiary-dark">
          Project codes
        </span>
        <span className="text-[10px] text-tertiary-light">
          {hasFork
            ? `forked from master · ${codes.filter(c => !c.removed).length} active`
            : `using master tags · ${masterTagIds.length}`}
        </span>
        <label className="ml-auto text-[10px] text-tertiary flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={showRemoved}
            onChange={e => setShowRemoved(e.target.checked)}
            className="h-3 w-3"
          />
          Show removed
        </label>
      </div>

      {!isSignedIn && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-2">
          Sign in to add or remove codes on this project.
        </p>
      )}

      {noCodesAtAll && (
        <p className="text-[11px] text-tertiary-light">
          No master tags for this policy yet. Add a custom code below to start.
        </p>
      )}

      {visibleTree.length > 0 && (
        <ul className="space-y-1">
          {visibleTree.map(node => (
            <li
              key={node.key}
              className="flex items-center gap-2 text-[11px] flex-wrap"
              style={{ paddingLeft: `${node.depth * 12}px` }}
            >
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                  node.removed
                    ? 'border-grey-200 bg-grey-100 text-tertiary-light line-through'
                    : 'border-grey-200 bg-white text-tertiary-dark'
                }`}
                title={node.description}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: node.color }}
                />
                {node.label}
                <span className="text-[9px] uppercase tracking-wide text-tertiary-light">
                  {node.source === 'master' ? 'master' : 'custom'}
                </span>
                {node.source === 'master' && node.isTaggedHere && (
                  <TagOriginBadge
                    origin={isConfirmed(policyId, node.codeId) ? 'human' : 'ai'}
                    canEdit={isSignedIn}
                    busy={busyKey === tagKey(policyId, node.codeId)}
                    confirmedByName={confirmed.get(tagKey(policyId, node.codeId))?.confirmedByName}
                    onConfirm={() => confirm(policyId, node.codeId)}
                    onRevert={() => revert(policyId, node.codeId)}
                  />
                )}
              </span>
              {isSignedIn && node.source === 'master' && node.isTaggedHere && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => toggleMaster(node.codeId, !node.removed)}
                  className="text-[10px] text-tertiary hover:text-primary disabled:opacity-50"
                >
                  {node.removed ? 'Restore' : 'Remove'}
                </button>
              )}
              {isSignedIn && node.source === 'custom' && node.rowId && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => deleteCustom(node.rowId!)}
                  className="text-[10px] text-tertiary hover:text-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              )}
              {isSignedIn && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setAddingUnder(node.codeId);
                    setNewLabel('');
                  }}
                  className="text-[10px] text-tertiary hover:text-primary disabled:opacity-50"
                >
                  + Add child
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Add-root form */}
      {isSignedIn && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {addingUnder === null ? (
            <>
              <input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="New top-level code label"
                className="flex-1 min-w-[180px] px-2 py-1 border border-grey-200 rounded text-[11px]"
              />
              <button
                type="button"
                disabled={busy || !newLabel.trim()}
                onClick={() => addCustom(null)}
                className="px-2 py-1 rounded bg-primary text-white text-[10px] font-semibold disabled:opacity-50"
              >
                Add code
              </button>
            </>
          ) : (
            <>
              <span className="text-[10px] text-tertiary">
                New child of{' '}
                <code className="text-tertiary-dark">{addingUnder}</code>
              </span>
              <input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="Child code label"
                autoFocus
                className="flex-1 min-w-[180px] px-2 py-1 border border-grey-200 rounded text-[11px]"
              />
              <button
                type="button"
                disabled={busy || !newLabel.trim()}
                onClick={() => addCustom(addingUnder)}
                className="px-2 py-1 rounded bg-primary text-white text-[10px] font-semibold disabled:opacity-50"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingUnder(null);
                  setNewLabel('');
                }}
                className="text-[10px] text-tertiary hover:text-tertiary-dark"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="text-[10px] text-red-700 mt-2">{error}</p>
      )}
    </div>
  );
}
