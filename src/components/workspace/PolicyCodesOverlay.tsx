/**
 * Code-centric analysis overlay for the workspace Policy analysis module.
 * -----------------------------------------------------------------------
 * Renders the code taxonomy as a tree where each code node expands to
 * list every policy carrying that code. Project-scoped overrides
 * (removed master codes, custom codes) are respected — this view is
 * always derived from the project's live `PolicyCode[]`, falling back to
 * the master tags when a policy hasn't been forked yet.
 *
 * Also exported: `CodeFilterBar` — a compact pill row for "filter by
 * code" above the normal list view.
 */
'use client';

import { useMemo, useState } from 'react';
import { POLICY_MASTER_TAGS } from '@/lib/content-analysis/policy-master-tags';
import {
  getMasterCode,
  getMasterCodeChildren,
  getRootCodes,
  getDescendantIds,
} from '@/lib/content-analysis/master-code-catalog';
import { SECTOR_POLICIES } from '@/data/sectoral-policies';
import type { CodeNode } from '@/lib/content-analysis/types';
import type { PolicyCode } from '@/lib/project-workspace/db';

// ── Shared helpers ────────────────────────────────────────────────────────

/** Active (non-removed) code ids for a policy inside a project.
 *  Falls back to master tags when the policy hasn't been forked yet. */
function activePolicyCodeIds(
  policyId: string,
  codesByPolicy: Map<string, PolicyCode[]>
): Set<string> {
  const rows = codesByPolicy.get(policyId);
  if (!rows || rows.length === 0) {
    return new Set(POLICY_MASTER_TAGS[policyId] ?? []);
  }
  const result = new Set<string>();
  for (const r of rows) {
    if (!r.removed) result.add(r.codeId);
  }
  return result;
}

// ── CodeFilterBar ─────────────────────────────────────────────────────────

interface FilterBarProps {
  projectId: string;
  policyCodes: PolicyCode[];
  selectedCodeId: string | null;
  onSelect: (codeId: string | null) => void;
}

export function CodeFilterBar({
  policyCodes,
  selectedCodeId,
  onSelect,
}: FilterBarProps) {
  const codesByPolicy = useMemo(() => {
    const m = new Map<string, PolicyCode[]>();
    for (const c of policyCodes) {
      const list = m.get(c.policyId) ?? [];
      list.push(c);
      m.set(c.policyId, list);
    }
    return m;
  }, [policyCodes]);

  // Collect all unique active code ids across all policies.
  const activeMasterIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of SECTOR_POLICIES) {
      for (const id of activePolicyCodeIds(p.id, codesByPolicy)) {
        const code = getMasterCode(id);
        if (code) ids.add(id);
      }
    }
    return ids;
  }, [codesByPolicy]);

  const roots = useMemo(() => getRootCodes(), []);
  const activeRoots = roots.filter(r => {
    const desc = getDescendantIds(r.id);
    return [...activeMasterIds].some(id => desc.has(id));
  });

  if (activeRoots.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold shrink-0">
        Filter by code:
      </span>
      {selectedCodeId !== null && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-[10px] text-secondary hover:underline shrink-0"
        >
          Clear
        </button>
      )}
      {activeRoots.map(root => (
        <button
          key={root.id}
          type="button"
          onClick={() => onSelect(selectedCodeId === root.id ? null : root.id)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium transition-colors ${
            selectedCodeId === root.id
              ? 'text-white border-transparent'
              : 'bg-white text-tertiary-dark border-grey-200 hover:border-opacity-60'
          }`}
          style={selectedCodeId === root.id ? { backgroundColor: root.color } : undefined}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
            style={{ backgroundColor: root.color }}
          />
          {root.name}
        </button>
      ))}
    </div>
  );
}

// ── PolicyCodesOverlay ─────────────────────────────────────────────────────

interface OverlayProps {
  policyCodes: PolicyCode[];
}

interface CodeTreeNode {
  code: CodeNode;
  policyIds: string[];
  children: CodeTreeNode[];
}

export default function PolicyCodesOverlay({ policyCodes }: OverlayProps) {
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  const codesByPolicy = useMemo(() => {
    const m = new Map<string, PolicyCode[]>();
    for (const c of policyCodes) {
      const list = m.get(c.policyId) ?? [];
      list.push(c);
      m.set(c.policyId, list);
    }
    return m;
  }, [policyCodes]);

  // For each master code, collect the policies that carry it (active only).
  const policyIdsByCode = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const p of SECTOR_POLICIES) {
      const active = activePolicyCodeIds(p.id, codesByPolicy);
      for (const codeId of active) {
        const list = m.get(codeId) ?? [];
        list.push(p.id);
        m.set(codeId, list);
      }
    }
    return m;
  }, [codesByPolicy]);

  // Build a tree of just the codes that have at least one policy.
  const tree = useMemo(() => {
    function buildNode(code: CodeNode): CodeTreeNode {
      const children = getMasterCodeChildren(code.id)
        .map(buildNode)
        .filter(n => n.policyIds.length > 0 || n.children.length > 0);
      const policyIds = policyIdsByCode.get(code.id) ?? [];
      return { code, policyIds, children };
    }
    return getRootCodes()
      .map(buildNode)
      .filter(n => n.policyIds.length > 0 || n.children.length > 0);
  }, [policyIdsByCode]);

  // Custom codes (project-only).
  const customCodes = useMemo(() => {
    const seen = new Map<string, { label: string; color: string; policyIds: string[] }>();
    for (const row of policyCodes) {
      if (row.source !== 'custom' || row.removed) continue;
      const entry = seen.get(row.codeId) ?? { label: row.label, color: row.color, policyIds: [] };
      entry.policyIds.push(row.policyId);
      seen.set(row.codeId, entry);
    }
    return Array.from(seen.entries()).map(([id, v]) => ({ id, ...v }));
  }, [policyCodes]);

  return (
    <div className="space-y-2">
      <p className="text-xs text-tertiary max-w-2xl">
        Code-centric view — each row is a master taxonomy code. Policies
        listed under a code carry it as an active project tag (or as a
        master tag when the policy hasn't been forked into this project yet).
      </p>

      {tree.map(rootNode => (
        <TreeNodeRow
          key={rootNode.code.id}
          node={rootNode}
          depth={0}
          expandedCode={expandedCode}
          onToggle={id => setExpandedCode(expandedCode === id ? null : id)}
        />
      ))}

      {customCodes.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold mb-2">
            Project-only custom codes
          </p>
          {customCodes.map(cc => (
            <div key={cc.id} className="mb-1">
              <button
                type="button"
                onClick={() => setExpandedCode(expandedCode === cc.id ? null : cc.id)}
                className="flex items-center gap-2 text-[11px] w-full text-left px-2 py-1 rounded hover:bg-grey-50"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: cc.color }}
                />
                <span className="font-medium text-tertiary-dark flex-1">{cc.label}</span>
                <span className="text-tertiary-light text-[10px]">
                  {cc.policyIds.length} {cc.policyIds.length === 1 ? 'policy' : 'policies'}
                </span>
                <span className="text-[10px] text-tertiary-light">
                  {expandedCode === cc.id ? '▴' : '▾'}
                </span>
              </button>
              {expandedCode === cc.id && (
                <PolicyList policyIds={cc.policyIds} color={cc.color} />
              )}
            </div>
          ))}
        </div>
      )}

      {tree.length === 0 && customCodes.length === 0 && (
        <p className="text-sm text-tertiary">
          No active codes found. Open a policy above and add codes via the
          "Project codes" panel to see them here.
        </p>
      )}
    </div>
  );
}

function TreeNodeRow({
  node,
  depth,
  expandedCode,
  onToggle,
}: {
  node: CodeTreeNode;
  depth: number;
  expandedCode: string | null;
  onToggle: (id: string) => void;
}) {
  const { code, policyIds, children } = node;
  const hasContent = policyIds.length > 0 || children.length > 0;
  if (!hasContent) return null;

  const isOpen = expandedCode === code.id;

  return (
    <div style={{ marginLeft: `${depth * 12}px` }}>
      <button
        type="button"
        onClick={() => onToggle(code.id)}
        className="flex items-center gap-2 text-[11px] w-full text-left px-2 py-1 rounded hover:bg-grey-50"
      >
        <span
          className="inline-block h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: code.color }}
        />
        <span className={`flex-1 ${depth === 0 ? 'font-bold text-tertiary-dark' : 'text-tertiary-dark'}`}>
          {code.name}
        </span>
        {code.description && (
          <span className="text-[10px] text-tertiary-light truncate max-w-[200px] hidden md:block">
            {code.description}
          </span>
        )}
        <span className="text-tertiary-light text-[10px] shrink-0">
          {policyIds.length > 0 && `${policyIds.length} ${policyIds.length === 1 ? 'policy' : 'policies'}`}
          {policyIds.length > 0 && children.length > 0 && ', '}
          {children.length > 0 && `${children.length} sub-codes`}
        </span>
        <span className="text-[10px] text-tertiary-light shrink-0">
          {isOpen ? '▴' : '▾'}
        </span>
      </button>
      {isOpen && (
        <div className="ml-4">
          {policyIds.length > 0 && (
            <PolicyList policyIds={policyIds} color={code.color} />
          )}
          {children.map(child => (
            <TreeNodeRow
              key={child.code.id}
              node={child}
              depth={0}
              expandedCode={expandedCode}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PolicyList({ policyIds, color }: { policyIds: string[]; color: string }) {
  return (
    <ul className="space-y-0.5 mt-0.5 mb-2">
      {policyIds.map(pid => {
        const p = SECTOR_POLICIES.find(x => x.id === pid);
        if (!p) return null;
        return (
          <li key={pid} className="flex items-center gap-2 text-[10px] text-tertiary-dark pl-2 py-0.5">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full shrink-0 opacity-70"
              style={{ backgroundColor: color }}
            />
            <span className="flex-1">{p.name}</span>
            {p.acronym && (
              <span className="text-tertiary-light">{p.acronym}</span>
            )}
            <a
              href={`/policy-navigator?policy=${encodeURIComponent(pid)}`}
              className="text-secondary hover:underline shrink-0"
            >
              View ↗
            </a>
          </li>
        );
      })}
    </ul>
  );
}
