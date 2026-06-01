/**
 * Code-centric analysis overlay for the workspace Policy analysis module.
 * -----------------------------------------------------------------------
 * Renders the project's policy codes as either:
 *
 *   - "Master taxonomy" grouping (Mitigation / Adaptation / …),
 *   - "Sector" grouping (Power / Industry / Transport / …),
 *   - "Instrument" grouping (Directive / Regulation / …).
 *
 * In master-taxonomy mode the overlay is fully editable:
 *
 *   - Custom (project-only) codes can be renamed, recoloured and deleted
 *     across the whole project (changes propagate to every policy that
 *     carries them).
 *   - Master codes can be hidden from the entire project in one click
 *     (batch toggle `removed=true` on every policy carrying the code).
 *   - Each policy chip listed under a code carries an × that removes
 *     just that one (policy, code) pair.
 *
 * In sector / instrument modes the rows aren't codes — they're policy
 * groupings derived from policy metadata — so they're read-only by
 * design.
 *
 * Companion export: `CodeFilterBar` — compact pill row for "filter by
 * code" above the normal policy list view.
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
import {
  SECTORS,
  SECTOR_POLICIES,
  type SectorId,
} from '@/data/sectoral-policies';
import type { CodeNode } from '@/lib/content-analysis/types';
import type { PolicyCode } from '@/lib/project-workspace/db';
import { pwApi } from '@/lib/project-workspace/client';

// A few common palette swatches users can recolour custom codes with.
const COLOR_SWATCHES = [
  '#0065A4', '#007B6C', '#FF9933', '#6667AB', '#B83230',
  '#A530B8', '#2D7DD2', '#228B22', '#D4762C', '#1E90FF',
  '#94A3B8',
];

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
  // Forked rows: trust the DB.
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
  projectId: string;
  policyCodes: PolicyCode[];
  isSignedIn: boolean;
  onCodesChanged: () => Promise<void> | void;
}

type GroupBy = 'master' | 'sector' | 'instrument';

interface MasterTreeNode {
  code: CodeNode;
  policyIds: string[];
  children: MasterTreeNode[];
}

export default function PolicyCodesOverlay({
  projectId,
  policyCodes,
  isSignedIn,
  onCodesChanged,
}: OverlayProps) {
  const [groupBy, setGroupBy] = useState<GroupBy>('master');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    codeId: string;
    label: string;
    color: string;
  } | null>(null);
  const [policyPicker, setPolicyPicker] = useState<{
    label: string;
    color: string;
    parentCodeId: string | null;
    selectedIds: Set<string>;
  } | null>(null);

  const codesByPolicy = useMemo(() => {
    const m = new Map<string, PolicyCode[]>();
    for (const c of policyCodes) {
      const list = m.get(c.policyId) ?? [];
      list.push(c);
      m.set(c.policyId, list);
    }
    return m;
  }, [policyCodes]);

  // ── Master taxonomy tree ─────────────────────────────────────────────
  const policyIdsByMasterCode = useMemo(() => {
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

  const masterTree = useMemo(() => {
    function buildNode(code: CodeNode): MasterTreeNode {
      const children = getMasterCodeChildren(code.id)
        .map(buildNode)
        .filter(n => n.policyIds.length > 0 || n.children.length > 0);
      const policyIds = policyIdsByMasterCode.get(code.id) ?? [];
      return { code, policyIds, children };
    }
    return getRootCodes()
      .map(buildNode)
      .filter(n => n.policyIds.length > 0 || n.children.length > 0);
  }, [policyIdsByMasterCode]);

  // Custom project-only codes, grouped by codeId. The first row's
  // metadata (label / color / parent) is treated as canonical.
  const customCodes = useMemo(() => {
    const seen = new Map<
      string,
      { label: string; color: string; parentCodeId: string | null; policyIds: string[] }
    >();
    for (const row of policyCodes) {
      if (row.source !== 'custom' || row.removed) continue;
      const entry =
        seen.get(row.codeId) ?? {
          label: row.label,
          color: row.color,
          parentCodeId: row.parentCodeId,
          policyIds: [],
        };
      entry.policyIds.push(row.policyId);
      seen.set(row.codeId, entry);
    }
    return Array.from(seen.entries()).map(([id, v]) => ({ id, ...v }));
  }, [policyCodes]);

  // ── Mutations ─────────────────────────────────────────────────────────
  async function withBusy<T>(fn: () => Promise<T>): Promise<T | null> {
    setBusy(true);
    setError(null);
    try {
      const r = await fn();
      await onCodesChanged();
      return r;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  /** Hide a master code from the whole project — batch removes the code
   *  from every policy that currently carries it. */
  async function hideMasterAcrossProject(codeId: string) {
    if (!isSignedIn) return;
    const policyIds = policyIdsByMasterCode.get(codeId) ?? [];
    await withBusy(async () => {
      for (const pid of policyIds) {
        await pwApi.toggleMasterPolicyCode({
          projectId,
          policyId: pid,
          codeId,
          removed: true,
        });
      }
    });
  }

  /** Remove a single (policy, code) pair. Works for both master rows
   *  (sets removed=true) and custom rows (deletes the row). */
  async function removeFromPolicy(codeId: string, policyId: string) {
    if (!isSignedIn) return;
    const rows = codesByPolicy.get(policyId) ?? [];
    const row = rows.find(r => r.codeId === codeId);
    await withBusy(async () => {
      if (row && row.source === 'custom') {
        await pwApi.deletePolicyCode(row.id);
      } else {
        await pwApi.toggleMasterPolicyCode({
          projectId,
          policyId,
          codeId,
          removed: true,
        });
      }
    });
  }

  /** Rename / recolour every row that carries this custom codeId. */
  async function patchCustomCode(codeId: string, label: string, color: string) {
    if (!isSignedIn) return;
    const rows = policyCodes.filter(
      r => r.source === 'custom' && r.codeId === codeId && !r.removed
    );
    await withBusy(async () => {
      for (const r of rows) {
        await pwApi.patchPolicyCode(r.id, { label, color });
      }
    });
  }

  /** Delete every row that carries this custom codeId. */
  async function deleteCustomEverywhere(codeId: string) {
    if (!isSignedIn) return;
    const rows = policyCodes.filter(r => r.source === 'custom' && r.codeId === codeId);
    await withBusy(async () => {
      for (const r of rows) {
        await pwApi.deletePolicyCode(r.id);
      }
    });
  }

  /** Add a new custom code to a selected set of policies. */
  async function addCustomToPolicies(
    label: string,
    color: string,
    parentCodeId: string | null,
    policyIds: string[]
  ) {
    if (!isSignedIn || policyIds.length === 0) return;
    await withBusy(async () => {
      for (const pid of policyIds) {
        await pwApi.addCustomPolicyCode({
          projectId,
          policyId: pid,
          label,
          color,
          parentCodeId,
        });
      }
    });
  }

  // ── Render helpers ────────────────────────────────────────────────────
  const totalActiveCodes = masterTree.length + customCodes.length;

  return (
    <div className="space-y-3">
      {/* Header: explanation + group-by selector + add button. */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <p className="text-xs text-tertiary max-w-2xl">
          Code-centric view — group the project's policies by master
          taxonomy, sector, or instrument. Master grouping is editable:
          rename or recolour custom codes, hide a master code from this
          project, or remove a code from a single policy.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold">
            Group by
          </span>
          <div className="flex rounded border border-grey-200 overflow-hidden text-[11px]">
            <GroupButton active={groupBy === 'master'} onClick={() => setGroupBy('master')}>
              Master taxonomy
            </GroupButton>
            <GroupButton active={groupBy === 'sector'} onClick={() => setGroupBy('sector')}>
              Sector
            </GroupButton>
            <GroupButton active={groupBy === 'instrument'} onClick={() => setGroupBy('instrument')}>
              Instrument
            </GroupButton>
          </div>
          {groupBy === 'master' && isSignedIn && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                setPolicyPicker({
                  label: '',
                  color: '#0065A4',
                  parentCodeId: null,
                  selectedIds: new Set(),
                })
              }
              className="text-[11px] px-2 py-1 rounded bg-primary text-white font-semibold disabled:opacity-50"
            >
              + Add code
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </p>
      )}
      {!isSignedIn && groupBy === 'master' && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          Sign in to add, rename or remove codes in this project.
        </p>
      )}

      {/* Group-specific content. */}
      {groupBy === 'master' && (
        <MasterGrouping
          tree={masterTree}
          customCodes={customCodes}
          expandedKey={expandedKey}
          onToggle={k => setExpandedKey(expandedKey === k ? null : k)}
          totalActiveCodes={totalActiveCodes}
          isSignedIn={isSignedIn}
          busy={busy}
          onEdit={(codeId, label, color) => setEditing({ codeId, label, color })}
          onHideMaster={hideMasterAcrossProject}
          onDeleteCustom={deleteCustomEverywhere}
          onRemoveFromPolicy={removeFromPolicy}
        />
      )}
      {groupBy === 'sector' && (
        <SectorGrouping
          expandedKey={expandedKey}
          onToggle={k => setExpandedKey(expandedKey === k ? null : k)}
        />
      )}
      {groupBy === 'instrument' && (
        <InstrumentGrouping
          expandedKey={expandedKey}
          onToggle={k => setExpandedKey(expandedKey === k ? null : k)}
        />
      )}

      {/* Inline edit dialog (custom-code rename / recolour). */}
      {editing && (
        <EditCodeDialog
          initial={editing}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={async (label, color) => {
            await patchCustomCode(editing.codeId, label, color);
            setEditing(null);
          }}
        />
      )}

      {/* New-code policy-picker dialog. */}
      {policyPicker && (
        <AddCodeDialog
          state={policyPicker}
          busy={busy}
          masterTree={masterTree}
          customCodes={customCodes}
          onChange={s => setPolicyPicker(s)}
          onCancel={() => setPolicyPicker(null)}
          onSave={async () => {
            await addCustomToPolicies(
              policyPicker.label.trim(),
              policyPicker.color,
              policyPicker.parentCodeId,
              Array.from(policyPicker.selectedIds)
            );
            setPolicyPicker(null);
          }}
        />
      )}
    </div>
  );
}

function GroupButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 border-l border-grey-200 first:border-l-0 ${
        active ? 'bg-primary text-white' : 'text-tertiary hover:bg-grey-50'
      }`}
    >
      {children}
    </button>
  );
}

// ── Master taxonomy grouping ─────────────────────────────────────────────

function MasterGrouping({
  tree,
  customCodes,
  expandedKey,
  onToggle,
  totalActiveCodes,
  isSignedIn,
  busy,
  onEdit,
  onHideMaster,
  onDeleteCustom,
  onRemoveFromPolicy,
}: {
  tree: MasterTreeNode[];
  customCodes: { id: string; label: string; color: string; parentCodeId: string | null; policyIds: string[] }[];
  expandedKey: string | null;
  onToggle: (key: string) => void;
  totalActiveCodes: number;
  isSignedIn: boolean;
  busy: boolean;
  onEdit: (codeId: string, label: string, color: string) => void;
  onHideMaster: (codeId: string) => void;
  onDeleteCustom: (codeId: string) => void;
  onRemoveFromPolicy: (codeId: string, policyId: string) => void;
}) {
  if (totalActiveCodes === 0) {
    return (
      <p className="text-sm text-tertiary">
        No active codes found. Open a policy in the list view and add codes via the
        "Project codes" panel — or use "+ Add code" above to add a project-wide
        custom code.
      </p>
    );
  }
  return (
    <>
      {tree.map(node => (
        <MasterTreeRow
          key={node.code.id}
          node={node}
          depth={0}
          expandedKey={expandedKey}
          onToggle={onToggle}
          isSignedIn={isSignedIn}
          busy={busy}
          onHideMaster={onHideMaster}
          onRemoveFromPolicy={onRemoveFromPolicy}
        />
      ))}

      {customCodes.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold mb-2">
            Project-only custom codes
          </p>
          {customCodes.map(cc => {
            const isOpen = expandedKey === `c:${cc.id}`;
            return (
              <div key={cc.id} className="mb-1">
                <div className="flex items-center gap-2 text-[11px] px-2 py-1 rounded hover:bg-grey-50">
                  <button
                    type="button"
                    onClick={() => onToggle(`c:${cc.id}`)}
                    className="flex items-center gap-2 flex-1 text-left"
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
                      {isOpen ? '▴' : '▾'}
                    </span>
                  </button>
                  {isSignedIn && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onEdit(cc.id, cc.label, cc.color)}
                        title="Rename / recolour"
                        className="text-[11px] text-tertiary hover:text-primary disabled:opacity-50"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (confirm(`Delete custom code "${cc.label}" from every policy in this project?`)) {
                            onDeleteCustom(cc.id);
                          }
                        }}
                        title="Delete code from this project"
                        className="text-[11px] text-tertiary hover:text-red-700 disabled:opacity-50"
                      >
                        ×
                      </button>
                    </>
                  )}
                </div>
                {isOpen && (
                  <PolicyChipList
                    policyIds={cc.policyIds}
                    color={cc.color}
                    isSignedIn={isSignedIn}
                    busy={busy}
                    onRemove={pid => onRemoveFromPolicy(cc.id, pid)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function MasterTreeRow({
  node,
  depth,
  expandedKey,
  onToggle,
  isSignedIn,
  busy,
  onHideMaster,
  onRemoveFromPolicy,
}: {
  node: MasterTreeNode;
  depth: number;
  expandedKey: string | null;
  onToggle: (key: string) => void;
  isSignedIn: boolean;
  busy: boolean;
  onHideMaster: (codeId: string) => void;
  onRemoveFromPolicy: (codeId: string, policyId: string) => void;
}) {
  const { code, policyIds, children } = node;
  if (policyIds.length === 0 && children.length === 0) return null;
  const key = `m:${code.id}`;
  const isOpen = expandedKey === key;
  return (
    <div style={{ marginLeft: `${depth * 12}px` }}>
      <div className="flex items-center gap-2 text-[11px] px-2 py-1 rounded hover:bg-grey-50">
        <button
          type="button"
          onClick={() => onToggle(key)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <span
            className="inline-block h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: code.color }}
          />
          <span className={`flex-1 ${depth === 0 ? 'font-bold text-tertiary-dark' : 'text-tertiary-dark'}`}>
            {code.name}
          </span>
          {code.description && (
            <span className="text-[10px] text-tertiary-light truncate max-w-[220px] hidden md:block">
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
        {isSignedIn && policyIds.length > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (
                confirm(
                  `Hide "${code.name}" from this project? It will be removed from ${policyIds.length} ${policyIds.length === 1 ? 'policy' : 'policies'}. You can restore it from the per-policy Project codes panel.`
                )
              ) {
                onHideMaster(code.id);
              }
            }}
            title="Hide this master code from the entire project"
            className="text-[11px] text-tertiary hover:text-red-700 disabled:opacity-50"
          >
            Hide
          </button>
        )}
      </div>
      {isOpen && (
        <div className="ml-4">
          {policyIds.length > 0 && (
            <PolicyChipList
              policyIds={policyIds}
              color={code.color}
              isSignedIn={isSignedIn}
              busy={busy}
              onRemove={pid => onRemoveFromPolicy(code.id, pid)}
            />
          )}
          {children.map(child => (
            <MasterTreeRow
              key={child.code.id}
              node={child}
              depth={0}
              expandedKey={expandedKey}
              onToggle={onToggle}
              isSignedIn={isSignedIn}
              busy={busy}
              onHideMaster={onHideMaster}
              onRemoveFromPolicy={onRemoveFromPolicy}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sector / Instrument groupings (read-only) ────────────────────────────

function SectorGrouping({
  expandedKey,
  onToggle,
}: {
  expandedKey: string | null;
  onToggle: (key: string) => void;
}) {
  return (
    <>
      {SECTORS.map(sec => {
        const policies = SECTOR_POLICIES.filter(p => p.sectors.includes(sec.id));
        if (policies.length === 0) return null;
        const key = `s:${sec.id}`;
        const isOpen = expandedKey === key;
        return (
          <div key={sec.id} className="mb-1">
            <button
              type="button"
              onClick={() => onToggle(key)}
              className="flex items-center gap-2 text-[11px] w-full text-left px-2 py-1 rounded hover:bg-grey-50"
            >
              <span
                className="inline-block h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: sec.color }}
              />
              <span className="font-bold text-tertiary-dark flex-1">{sec.name}</span>
              <span className="text-[10px] text-tertiary-light truncate max-w-[260px] hidden md:block">
                {sec.targetLanguage}
              </span>
              <span className="text-tertiary-light text-[10px] shrink-0">
                {policies.length} {policies.length === 1 ? 'policy' : 'policies'}
              </span>
              <span className="text-[10px] text-tertiary-light shrink-0">
                {isOpen ? '▴' : '▾'}
              </span>
            </button>
            {isOpen && (
              <PolicyChipList
                policyIds={policies.map(p => p.id)}
                color={sec.color}
                isSignedIn={false}
                busy={false}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

function InstrumentGrouping({
  expandedKey,
  onToggle,
}: {
  expandedKey: string | null;
  onToggle: (key: string) => void;
}) {
  const instruments = useMemo(() => {
    const m = new Map<string, { id: string; policies: typeof SECTOR_POLICIES }>();
    for (const p of SECTOR_POLICIES) {
      const id = p.instrumentType;
      const entry = m.get(id) ?? { id, policies: [] };
      entry.policies.push(p);
      m.set(id, entry);
    }
    return Array.from(m.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, []);
  return (
    <>
      {instruments.map(({ id, policies }) => {
        const key = `i:${id}`;
        const isOpen = expandedKey === key;
        const color = '#0065A4';
        return (
          <div key={id} className="mb-1">
            <button
              type="button"
              onClick={() => onToggle(key)}
              className="flex items-center gap-2 text-[11px] w-full text-left px-2 py-1 rounded hover:bg-grey-50"
            >
              <span
                className="inline-block h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="font-bold text-tertiary-dark flex-1 capitalize">{id}</span>
              <span className="text-tertiary-light text-[10px] shrink-0">
                {policies.length} {policies.length === 1 ? 'policy' : 'policies'}
              </span>
              <span className="text-[10px] text-tertiary-light shrink-0">
                {isOpen ? '▴' : '▾'}
              </span>
            </button>
            {isOpen && (
              <PolicyChipList
                policyIds={policies.map(p => p.id)}
                color={color}
                isSignedIn={false}
                busy={false}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

// ── PolicyChipList ────────────────────────────────────────────────────────

function PolicyChipList({
  policyIds,
  color,
  isSignedIn,
  busy,
  onRemove,
}: {
  policyIds: string[];
  color: string;
  isSignedIn: boolean;
  busy: boolean;
  onRemove?: (policyId: string) => void;
}) {
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
              href={`/policy-navigator/policy/?id=${encodeURIComponent(pid)}`}
              className="text-secondary hover:underline shrink-0"
            >
              View ↗
            </a>
            {isSignedIn && onRemove && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onRemove(pid)}
                title="Remove this code from this policy"
                className="text-tertiary-light hover:text-red-700 disabled:opacity-50 shrink-0"
              >
                ×
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ── Edit dialog (rename / recolour custom code) ──────────────────────────

function EditCodeDialog({
  initial,
  busy,
  onCancel,
  onSave,
}: {
  initial: { codeId: string; label: string; color: string };
  busy: boolean;
  onCancel: () => void;
  onSave: (label: string, color: string) => void | Promise<void>;
}) {
  const [label, setLabel] = useState(initial.label);
  const [color, setColor] = useState(initial.color);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-4">
        <h3 className="text-sm font-bold text-tertiary-dark mb-3">Edit custom code</h3>
        <label className="block text-[11px] text-tertiary mb-1">Label</label>
        <input
          autoFocus
          value={label}
          onChange={e => setLabel(e.target.value)}
          className="w-full px-2 py-1 border border-grey-200 rounded text-[12px] mb-3"
        />
        <p className="text-[11px] text-tertiary mb-1">Colour</p>
        <div className="flex flex-wrap gap-1 mb-4">
          {COLOR_SWATCHES.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-5 w-5 rounded-full border-2 ${color === c ? 'border-tertiary-dark' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
              aria-label={`Use colour ${c}`}
            />
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="text-[11px] px-3 py-1 rounded border border-grey-200 text-tertiary hover:bg-grey-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !label.trim()}
            onClick={() => onSave(label.trim(), color)}
            className="text-[11px] px-3 py-1 rounded bg-primary text-white font-semibold disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add-code dialog (label + colour + policy picker) ─────────────────────

function AddCodeDialog({
  state,
  busy,
  masterTree,
  customCodes,
  onChange,
  onCancel,
  onSave,
}: {
  state: {
    label: string;
    color: string;
    parentCodeId: string | null;
    selectedIds: Set<string>;
  };
  busy: boolean;
  masterTree: MasterTreeNode[];
  customCodes: { id: string; label: string; color: string; parentCodeId: string | null; policyIds: string[] }[];
  onChange: (s: {
    label: string;
    color: string;
    parentCodeId: string | null;
    selectedIds: Set<string>;
  }) => void;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
}) {
  const [sectorFilter, setSectorFilter] = useState<SectorId | 'all'>('all');
  const visiblePolicies = useMemo(
    () =>
      SECTOR_POLICIES.filter(p =>
        sectorFilter === 'all' ? true : p.sectors.includes(sectorFilter)
      ),
    [sectorFilter]
  );

  // Flat parent options: root masters + custom codes.
  const parentOptions: { id: string; label: string }[] = useMemo(() => {
    const out: { id: string; label: string }[] = [];
    for (const root of masterTree) out.push({ id: root.code.id, label: root.code.name });
    for (const cc of customCodes) out.push({ id: cc.id, label: `${cc.label} (custom)` });
    return out;
  }, [masterTree, customCodes]);

  const toggle = (pid: string) => {
    const next = new Set(state.selectedIds);
    if (next.has(pid)) next.delete(pid);
    else next.add(pid);
    onChange({ ...state, selectedIds: next });
  };
  const selectAllVisible = () => {
    const next = new Set(state.selectedIds);
    for (const p of visiblePolicies) next.add(p.id);
    onChange({ ...state, selectedIds: next });
  };
  const clearAll = () => onChange({ ...state, selectedIds: new Set() });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-4 max-h-[85vh] flex flex-col">
        <h3 className="text-sm font-bold text-tertiary-dark mb-3">Add custom code</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[11px] text-tertiary mb-1">Label</label>
            <input
              autoFocus
              value={state.label}
              onChange={e => onChange({ ...state, label: e.target.value })}
              placeholder="e.g. Just transition funding"
              className="w-full px-2 py-1 border border-grey-200 rounded text-[12px]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-tertiary mb-1">Parent (optional)</label>
            <select
              value={state.parentCodeId ?? ''}
              onChange={e =>
                onChange({ ...state, parentCodeId: e.target.value || null })
              }
              className="w-full px-2 py-1 border border-grey-200 rounded text-[12px]"
            >
              <option value="">— top-level —</option>
              {parentOptions.map(p => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-[11px] text-tertiary mb-1">Colour</p>
        <div className="flex flex-wrap gap-1 mb-4">
          {COLOR_SWATCHES.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ ...state, color: c })}
              className={`h-5 w-5 rounded-full border-2 ${state.color === c ? 'border-tertiary-dark' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
              aria-label={`Use colour ${c}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-tertiary">
            Apply to policies ({state.selectedIds.size} selected)
          </p>
          <div className="flex items-center gap-2">
            <select
              value={sectorFilter}
              onChange={e => setSectorFilter(e.target.value as SectorId | 'all')}
              className="text-[10px] px-1 py-0.5 border border-grey-200 rounded"
            >
              <option value="all">All sectors</option>
              {SECTORS.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={selectAllVisible}
              className="text-[10px] text-secondary hover:underline"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-[10px] text-tertiary hover:underline"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="border border-grey-200 rounded p-2 overflow-y-auto flex-1 min-h-[140px]">
          <ul className="space-y-0.5">
            {visiblePolicies.map(p => (
              <li key={p.id}>
                <label className="flex items-center gap-2 text-[11px] cursor-pointer hover:bg-grey-50 rounded px-1 py-0.5">
                  <input
                    type="checkbox"
                    checked={state.selectedIds.has(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                  <span className="flex-1">{p.name}</span>
                  {p.acronym && (
                    <span className="text-tertiary-light text-[10px]">{p.acronym}</span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end gap-2 mt-3">
          <button
            type="button"
            onClick={onCancel}
            className="text-[11px] px-3 py-1 rounded border border-grey-200 text-tertiary hover:bg-grey-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !state.label.trim() || state.selectedIds.size === 0}
            onClick={onSave}
            className="text-[11px] px-3 py-1 rounded bg-primary text-white font-semibold disabled:opacity-50"
          >
            Add code to {state.selectedIds.size || 0} {state.selectedIds.size === 1 ? 'policy' : 'policies'}
          </button>
        </div>
      </div>
    </div>
  );
}
