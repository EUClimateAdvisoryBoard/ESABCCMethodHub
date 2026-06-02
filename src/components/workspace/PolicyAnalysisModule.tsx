/**
 * Policy analysis module for the Project Workspace.
 * --------------------------------------------------
 * Mirrors the full content shown on the EU Policy Navigator's "Sectoral
 * overview" tab (plain-language meaning, current / future requirement,
 * milestones, article-level legal basis, CELEX, official source) and
 * adds a review workflow on top:
 *
 *   • Approve / disapprove with four-eye sign-off — an entry is marked
 *     "four-eye checked" only after two distinct users have approved it.
 *     The same user cannot supply both approvals.
 *   • Suggest edits to text or to the legal-basis connections; promoted
 *     edits become the canonical text in the EU Policy Navigator.
 *   • Fact-check claims and leave comments.
 *
 * All annotations are stored in `pw_policy_annotations` and re-read by
 * the navigator so changes propagate automatically.
 */
'use client';

import { useMemo, useState } from 'react';
import {
  SECTORS,
  SECTOR_POLICIES,
  type SectorPolicy,
  type SectorId,
  getCitationLinks,
} from '@/data/sectoral-policies';
import { pwApi } from '@/lib/project-workspace/client';
import type {
  PolicyAnnotation,
  PolicyCode,
  PolicyOverrideMap,
} from '@/lib/project-workspace/db';
import { invalidatePromotedEditsCache } from '@/lib/project-workspace/usePromotedPolicyEdits';
import { useAuth } from '@/lib/auth-context';
import PolicyCodesPanel from './PolicyCodesPanel';
import PolicyCodesOverlay, { CodeFilterBar } from './PolicyCodesOverlay';
import { getDescendantIds } from '@/lib/content-analysis/master-code-catalog';
import { POLICY_MASTER_TAGS } from '@/lib/content-analysis/policy-master-tags';
import DownloadMenu from './DownloadMenu';
import WorkspaceComments from './WorkspaceComments';
import type { SheetSpec, DocBlock } from '@/lib/exports';

const KIND_LABELS: Record<PolicyAnnotation['kind'], string> = {
  approve: 'Approved',
  disapprove: 'Flagged',
  'fact-check': 'Fact-check',
  edit: 'Suggested edit',
  comment: 'Comment',
};
const KIND_COLORS: Record<PolicyAnnotation['kind'], string> = {
  approve: 'bg-green-100 text-green-800 border-green-200',
  disapprove: 'bg-red-100 text-red-800 border-red-200',
  'fact-check': 'bg-purple-100 text-purple-800 border-purple-200',
  edit: 'bg-blue-100 text-blue-800 border-blue-200',
  comment: 'bg-grey-100 text-tertiary-dark border-grey-200',
};

const EDITABLE_FIELDS = [
  { id: 'meaning', label: 'Plain-language meaning' },
  { id: 'currentRequirement', label: 'Current requirement' },
  { id: 'futureRequirement', label: 'Future requirement' },
  { id: 'scope', label: 'Scope' },
  { id: 'keyMilestones', label: 'Milestones' },
  { id: 'articleCitations', label: 'Legal basis / article citations' },
] as const;

interface Props {
  projectId: string;
  initialAnnotations: PolicyAnnotation[];
  initialOverrides: PolicyOverrideMap;
  initialPolicyCodes: PolicyCode[];
  /**
   * Sector the policy list is pre-filtered to on first render (e.g. the
   * Industry Project opens on the `industry` sector). Users can still switch
   * to any other sector or "All sectors".
   */
  defaultSector?: SectorId;
}

/** Effective text for a policy field, preferring a promoted edit override. */
function effective(
  p: SectorPolicy,
  field: keyof SectorPolicy,
  overrides: PolicyOverrideMap
): string {
  const ov = overrides[p.id]?.[field as string];
  if (ov != null && ov !== '') return ov;
  const v = p[field];
  return typeof v === 'string' ? v : '';
}

/** Build a one-sheet Excel of the (filtered) sectoral policies. */
function buildPolicySheet(policies: SectorPolicy[], overrides: PolicyOverrideMap): SheetSpec {
  return {
    name: 'Sectoral policies',
    title: 'Sectoral policy analysis',
    subtitle: 'Promoted edits shown as current text',
    headers: [
      'Policy',
      'Scope',
      'Plain-language meaning',
      'Current requirement',
      'Future requirement',
      'Official source',
    ],
    rows: policies.map(p => [
      p.acronym ? `${p.name} (${p.acronym})` : p.name,
      effective(p, 'scope', overrides),
      effective(p, 'meaning', overrides),
      effective(p, 'currentRequirement', overrides),
      effective(p, 'futureRequirement', overrides),
      p.sourceUrl ?? '',
    ]),
  };
}

/** Build a Word document of the (filtered) sectoral policies. */
function buildPolicyDoc(policies: SectorPolicy[], overrides: PolicyOverrideMap): DocBlock[] {
  const blocks: DocBlock[] = [
    { type: 'heading', level: 1, text: 'Sectoral policy analysis' },
    {
      type: 'paragraph',
      text: 'Mirror of the EU Policy Navigator sectoral overview. Promoted edits are shown as the current text.',
      italic: true,
    },
  ];
  for (const p of policies) {
    blocks.push({
      type: 'heading',
      level: 2,
      text: p.acronym ? `${p.name} (${p.acronym})` : p.name,
    });
    const meaning = effective(p, 'meaning', overrides);
    if (meaning) blocks.push({ type: 'paragraph', text: meaning });
    const cur = effective(p, 'currentRequirement', overrides);
    if (cur) {
      blocks.push({ type: 'paragraph', text: 'Current requirement', bold: true });
      blocks.push({ type: 'paragraph', text: cur });
    }
    const fut = effective(p, 'futureRequirement', overrides);
    if (fut) {
      blocks.push({ type: 'paragraph', text: 'Future requirement', bold: true });
      blocks.push({ type: 'paragraph', text: fut });
    }
    if (p.keyMilestones && p.keyMilestones.length > 0) {
      blocks.push({ type: 'paragraph', text: 'Milestones', bold: true });
      blocks.push({
        type: 'bullets',
        items: p.keyMilestones.map(m => `${m.year}: ${m.requirement}`),
      });
    }
    if (p.sourceUrl) {
      blocks.push({ type: 'paragraph', text: `Source: ${p.sourceUrl}`, italic: true });
    }
  }
  return blocks;
}

/** Distinct users who approved a policy with an annotation that is still open. */
function getApprovers(anns: PolicyAnnotation[]): { id: string; name: string; at: string }[] {
  const byUser = new Map<string, { id: string; name: string; at: string }>();
  for (const a of anns) {
    if (a.kind !== 'approve' || a.status !== 'open') continue;
    const id = a.createdBy ?? `anon:${a.id}`;
    if (!byUser.has(id)) {
      byUser.set(id, { id, name: a.value || 'Anonymous', at: a.createdAt });
    }
  }
  return Array.from(byUser.values());
}

export default function PolicyAnalysisModule({
  projectId,
  initialAnnotations,
  initialOverrides,
  initialPolicyCodes,
  defaultSector,
}: Props) {
  const { user, displayName } = useAuth();
  const [annotations, setAnnotations] = useState<PolicyAnnotation[]>(initialAnnotations);
  const [overrides, setOverrides] = useState<PolicyOverrideMap>(initialOverrides);
  const [policyCodes, setPolicyCodes] = useState<PolicyCode[]>(initialPolicyCodes);
  const [sectorFilter, setSectorFilter] = useState<SectorId | 'all'>(defaultSector ?? 'all');
  const [codeFilter, setCodeFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'codes'>('list');
  const [openId, setOpenId] = useState<string | null>(SECTOR_POLICIES[0]?.id ?? null);
  const [busy, setBusy] = useState(false);

  /** Refetch the project-wide policy-code rows. Called after any code edit. */
  const refreshPolicyCodes = async () => {
    try {
      const res = await fetch(
        `/api/project-workspace/policy-codes?projectId=${encodeURIComponent(projectId)}`
      );
      if (!res.ok) return;
      const { codes } = (await res.json()) as { codes: PolicyCode[] };
      setPolicyCodes(codes);
    } catch {
      // network blip — leave the cached state in place.
    }
  };

  /** Latest promoted edit per (policy, field) — recomputed from annotations. */
  function rebuildOverrides(items: PolicyAnnotation[]): PolicyOverrideMap {
    const m: PolicyOverrideMap = {};
    for (const a of items) {
      if (a.kind !== 'edit' || !a.promotedAt || !a.field) continue;
      m[a.policyId] ??= {};
      m[a.policyId][a.field] = a.value;
    }
    return m;
  }

  const annByPolicy = useMemo(() => {
    const m = new Map<string, PolicyAnnotation[]>();
    for (const a of annotations) {
      const list = m.get(a.policyId) ?? [];
      list.push(a);
      m.set(a.policyId, list);
    }
    return m;
  }, [annotations]);

  const codesByPolicy = useMemo(() => {
    const m = new Map<string, PolicyCode[]>();
    for (const c of policyCodes) {
      const list = m.get(c.policyId) ?? [];
      list.push(c);
      m.set(c.policyId, list);
    }
    return m;
  }, [policyCodes]);

  const codeFilterDescendants = useMemo(
    () => (codeFilter ? getDescendantIds(codeFilter) : null),
    [codeFilter]
  );

  const filtered = useMemo(() => {
    return SECTOR_POLICIES.filter(p => {
      if (sectorFilter !== 'all' && !p.sectors.includes(sectorFilter)) return false;
      if (codeFilterDescendants) {
        const pTags = POLICY_MASTER_TAGS[p.id] ?? [];
        const projectTags = (codesByPolicy.get(p.id) ?? [])
          .filter(c => !c.removed)
          .map(c => c.codeId);
        const allTags = [...new Set([...pTags, ...projectTags])];
        if (!allTags.some(t => codeFilterDescendants.has(t))) return false;
      }
      return true;
    });
  }, [sectorFilter, codeFilterDescendants, codesByPolicy]);

  async function addAnnotation(
    policyId: string,
    kind: PolicyAnnotation['kind'],
    field: string,
    value: string
  ) {
    setBusy(true);
    try {
      const { annotation } = await pwApi.createPolicyAnnotation({
        projectId,
        policyId,
        kind,
        field,
        value,
      });
      const a: PolicyAnnotation = {
        id: annotation.id,
        projectId,
        policyId,
        kind,
        field,
        value,
        status: 'open',
        promotedAt: null,
        createdBy: user?.id ?? null,
        createdAt: new Date().toISOString(),
      };
      setAnnotations(prev => [a, ...prev]);
    } finally {
      setBusy(false);
    }
  }

  async function resolveAnnotation(id: string) {
    setBusy(true);
    try {
      await pwApi.patchPolicyAnnotation(id, { status: 'resolved' });
      setAnnotations(prev =>
        prev.map(a => (a.id === id ? { ...a, status: 'resolved' } : a))
      );
    } finally {
      setBusy(false);
    }
  }

  async function promoteAnnotation(id: string, promote: boolean) {
    setBusy(true);
    try {
      await pwApi.promotePolicyAnnotation(id, promote);
      const target = annotations.find(a => a.id === id);
      setAnnotations(prev => {
        const next = prev.map(a =>
          a.id === id
            ? { ...a, promotedAt: promote ? new Date().toISOString() : null }
            : a
        );
        setOverrides(rebuildOverrides(next));
        return next;
      });
      if (target) invalidatePromotedEditsCache(target.policyId);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAnnotation(id: string) {
    setBusy(true);
    try {
      await pwApi.deletePolicyAnnotation(id);
      setAnnotations(prev => {
        const next = prev.filter(a => a.id !== id);
        setOverrides(rebuildOverrides(next));
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  const signature = displayName?.trim() || user?.email || '';

  return (
    <div className="space-y-4">
      <header>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-bold text-tertiary-dark">Policy analysis</h2>
          <DownloadMenu
            filename="sectoral-policy-analysis"
            data={{ getSheets: () => [buildPolicySheet(filtered, overrides)] }}
            text={{ getBlocks: () => buildPolicyDoc(filtered, overrides) }}
          />
        </div>
        <p className="text-sm text-tertiary mt-1 max-w-3xl">
          Mirror of the “Sectoral overview” in the EU Policy Navigator. Approve, edit
          the text, edit the legal-basis connections, fact-check or comment on
          individual policy entries. Approvals follow the four-eye principle: two
          distinct sign-offs are required before an entry is marked
          “four-eye checked”. Promoted edits become the canonical text in the
          navigator. The download includes any promoted edits as the current text.
        </p>
        {!user && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2 inline-block">
            Sign in to approve, edit or comment — annotations are signed with your
            account.
          </p>
        )}
      </header>

      {/* View mode toggle */}
      <div className="flex items-center gap-2">
        <div className="flex rounded border border-grey-200 overflow-hidden text-[11px]">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 ${viewMode === 'list' ? 'bg-primary text-white' : 'text-tertiary hover:bg-grey-50'}`}
          >
            Policy list
          </button>
          <button
            type="button"
            onClick={() => setViewMode('codes')}
            className={`px-3 py-1 border-l border-grey-200 ${viewMode === 'codes' ? 'bg-primary text-white' : 'text-tertiary hover:bg-grey-50'}`}
          >
            Code view
          </button>
        </div>
      </div>

      {viewMode === 'codes' && (
        <PolicyCodesOverlay
          projectId={projectId}
          policyCodes={policyCodes}
          isSignedIn={!!user}
          onCodesChanged={refreshPolicyCodes}
        />
      )}

      {viewMode === 'list' && (
      <>
      {/* Sector + code filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSectorFilter('all')}
            className={`text-[11px] px-2 py-1 rounded border ${
              sectorFilter === 'all'
                ? 'bg-primary text-white border-primary'
                : 'border-grey-200 text-tertiary'
            }`}
          >
            All sectors ({SECTOR_POLICIES.length})
          </button>
          {SECTORS.map(s => {
            const count = SECTOR_POLICIES.filter(p => p.sectors.includes(s.id)).length;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSectorFilter(s.id)}
                className={`text-[11px] px-2 py-1 rounded border ${
                  sectorFilter === s.id
                    ? 'text-white border-transparent'
                    : 'border-grey-200 text-tertiary'
                }`}
                style={sectorFilter === s.id ? { backgroundColor: s.color } : undefined}
              >
                {s.name} ({count})
              </button>
            );
          })}
        </div>
        <CodeFilterBar
          projectId={projectId}
          policyCodes={policyCodes}
          selectedCodeId={codeFilter}
          onSelect={setCodeFilter}
        />
        {codeFilter && (
          <p className="text-[10px] text-tertiary">
            Showing {filtered.length} of {SECTOR_POLICIES.length} policies with active codes in this category.
          </p>
        )}
      </div>

      <ul className="space-y-3">
        {filtered.map(p => {
          const anns = annByPolicy.get(p.id) ?? [];
          const approvers = getApprovers(anns);
          const fourEyeChecked = approvers.length >= 2;
          const open = openId === p.id;
          return (
            <li key={p.id} className="bg-white border border-grey-200 rounded-xl">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : p.id)}
                className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-grey-50"
              >
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold">
                    {p.sectors.join(' · ')} · {p.instrumentType}
                  </p>
                  <p className="text-sm font-medium text-tertiary-dark">
                    {p.name}
                    {p.acronym && (
                      <span className="ml-2 text-tertiary-light text-xs">
                        ({p.acronym})
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {fourEyeChecked ? (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full border border-green-300 bg-green-50 text-green-800 font-semibold inline-flex items-center gap-1"
                      title={`Four-eye checked — approved by ${approvers
                        .map(a => a.name)
                        .join(' & ')}`}
                    >
                      ✓✓ Four-eye checked
                    </span>
                  ) : approvers.length === 1 ? (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-800 font-semibold inline-flex items-center gap-1"
                      title={`1/2 approvals — awaiting second sign-off (approved by ${approvers[0].name})`}
                    >
                      1/2 approved
                    </span>
                  ) : null}
                  {anns.length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-grey-200 text-tertiary">
                      {anns.length} annotation{anns.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              </button>
              {open && (
                <PolicyBody
                  projectId={projectId}
                  policy={p}
                  annotations={anns}
                  policyCodes={codesByPolicy.get(p.id) ?? []}
                  overrides={overrides[p.id] ?? {}}
                  approvers={approvers}
                  fourEyeChecked={fourEyeChecked}
                  currentUserId={user?.id ?? null}
                  signature={signature}
                  isSignedIn={!!user}
                  busy={busy}
                  onAdd={(kind, field, value) => addAnnotation(p.id, kind, field, value)}
                  onResolve={resolveAnnotation}
                  onPromote={promoteAnnotation}
                  onDelete={deleteAnnotation}
                />
              )}
            </li>
          );
        })}
      </ul>
      </>
      )}
    </div>
  );
}

function PolicyBody({
  projectId,
  policy,
  annotations,
  policyCodes,
  overrides,
  approvers,
  fourEyeChecked,
  currentUserId,
  signature,
  isSignedIn,
  busy,
  onAdd,
  onResolve,
  onPromote,
  onDelete,
}: {
  projectId: string;
  policy: SectorPolicy;
  annotations: PolicyAnnotation[];
  policyCodes: PolicyCode[];
  overrides: Record<string, string>;
  approvers: { id: string; name: string; at: string }[];
  fourEyeChecked: boolean;
  currentUserId: string | null;
  signature: string;
  isSignedIn: boolean;
  busy: boolean;
  onAdd: (kind: PolicyAnnotation['kind'], field: string, value: string) => void;
  onResolve: (id: string) => void;
  onPromote: (id: string, promote: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [editField, setEditField] = useState<string>('meaning');
  const [editValue, setEditValue] = useState('');
  const [factCheck, setFactCheck] = useState('');

  const userAlreadyApproved =
    !!currentUserId && approvers.some(a => a.id === currentUserId);
  const sector = SECTORS.find(s => policy.sectors.includes(s.id));
  const sectorColor = sector?.color ?? '#404040';
  const citationLinks = getCitationLinks(policy);
  const eurLexUrl = policy.ceLexId
    ? `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${policy.ceLexId}`
    : null;

  const display = {
    meaning: overrides.meaning ?? policy.meaning,
    currentRequirement: overrides.currentRequirement ?? policy.currentRequirement,
    futureRequirement: overrides.futureRequirement ?? policy.futureRequirement,
    scope: overrides.scope ?? policy.scope,
  };

  function handleApprove() {
    if (!isSignedIn || userAlreadyApproved) return;
    onAdd('approve', '', signature || 'Anonymous');
  }

  return (
    <div className="px-4 py-3 border-t border-grey-100 space-y-4 text-xs">
      {/* Header strip matching Policy Navigator */}
      <div className="flex flex-wrap items-center gap-2">
        {policy.acronym && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: sectorColor + '20', color: sectorColor }}
          >
            {policy.acronym}
          </span>
        )}
        <span className="text-[10px] text-tertiary-light uppercase tracking-wide">
          {policy.instrumentType}
        </span>
        {policy.inForce && (
          <span className="text-[10px] text-tertiary">in force {policy.inForce}</span>
        )}
        {policy.adopted && (
          <span className="text-[10px] text-tertiary">adopted {policy.adopted}</span>
        )}
        <div className="flex flex-wrap gap-1 ml-auto">
          {policy.sectors.map(s => {
            const sec = SECTORS.find(x => x.id === s);
            if (!sec) return null;
            return (
              <span
                key={s}
                className="text-[9px] px-1.5 py-0.5 rounded"
                style={{ backgroundColor: sec.color + '20', color: sec.color }}
              >
                {sec.name}
              </span>
            );
          })}
        </div>
      </div>

      {/* Project-scoped codes (copy-on-write over the master taxonomy) */}
      <PolicyCodesPanel
        projectId={projectId}
        policyId={policy.id}
        initialCodes={policyCodes}
        isSignedIn={isSignedIn}
      />

      {/* What it means (canonical text, optionally a promoted edit) */}
      <Field label="Plain-language meaning" overridden={'meaning' in overrides}>
        {display.meaning}
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field
          label="Current requirement"
          overridden={'currentRequirement' in overrides}
        >
          {display.currentRequirement}
        </Field>
        <Field
          label="Future requirement"
          overridden={'futureRequirement' in overrides}
        >
          {display.futureRequirement}
        </Field>
        <Field label="Scope" overridden={'scope' in overrides}>
          {display.scope}
        </Field>
      </div>

      {/* Milestones */}
      {policy.keyMilestones.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-tertiary-light font-bold mb-1.5">
            Milestones
          </p>
          <div className="space-y-1.5">
            {policy.keyMilestones.map((m, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span
                  className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded text-white"
                  style={{ backgroundColor: sectorColor }}
                >
                  {m.year}
                </span>
                <span className="text-[11px]">{m.requirement}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legal basis */}
      {citationLinks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-[10px] uppercase tracking-wide text-tertiary-light font-bold">
              Legal basis (article-level citations)
            </p>
            <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider border border-blue-100">
              AI-generated links
            </span>
          </div>
          <ul className="space-y-1">
            {citationLinks.map((link, i) => {
              const isExternal = link.url.startsWith('http');
              return (
                <li
                  key={i}
                  className="text-[10px] text-tertiary-dark flex gap-1.5 items-start"
                >
                  <span className="text-tertiary select-none shrink-0 mt-px">-</span>
                  <a
                    href={link.url}
                    {...(isExternal
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                    className="flex-1 hover:text-secondary hover:underline transition-colors"
                  >
                    {link.citation}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Source footer */}
      <div className="flex flex-wrap gap-3 text-[10px] text-tertiary-light pt-2 border-t border-grey-200">
        {policy.ceLexId && eurLexUrl && (
          <a
            href={eurLexUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary hover:underline"
          >
            CELEX: {policy.ceLexId} ↗
          </a>
        )}
        {policy.sourceUrl && (
          <a
            href={policy.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary hover:underline"
          >
            Official source ↗
          </a>
        )}
      </div>

      {/* Four-eye approval block */}
      <div className="rounded-lg border border-grey-200 bg-grey-50 p-3">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <p className="text-[10px] uppercase tracking-wide text-tertiary-light font-bold">
            Four-eye review
          </p>
          {fourEyeChecked ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-green-300 bg-green-100 text-green-800 font-semibold">
              ✓✓ Four-eye checked
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-grey-200 bg-white text-tertiary">
              {approvers.length}/2 approvals
            </span>
          )}
        </div>

        {approvers.length > 0 ? (
          <ul className="space-y-1 mb-2">
            {approvers.map(a => (
              <li key={a.id} className="text-[11px] text-tertiary-dark flex items-center gap-2">
                <span className="text-green-700">✓</span>
                <span className="font-medium">{a.name}</span>
                <span className="text-[10px] text-tertiary-light">
                  on {a.at.slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-tertiary mb-2">
            No approvals yet. Two distinct sign-offs are required.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !isSignedIn || userAlreadyApproved}
            onClick={handleApprove}
            title={
              !isSignedIn
                ? 'Sign in to approve'
                : userAlreadyApproved
                  ? 'You have already approved this entry — second sign-off must come from a different user'
                  : signature
                    ? `Sign as ${signature}`
                    : 'Approve'
            }
            className="text-[11px] px-2 py-1 rounded border border-green-300 text-green-800 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {userAlreadyApproved ? '✓ You approved' : '✓ Approve'}
            {signature && !userAlreadyApproved && (
              <span className="text-tertiary-light ml-1">as {signature}</span>
            )}
          </button>
          <button
            type="button"
            disabled={busy || !isSignedIn}
            onClick={() => onAdd('disapprove', '', signature || 'Anonymous')}
            className="text-[11px] px-2 py-1 rounded border border-red-300 text-red-800 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✗ Disapprove
          </button>
        </div>
      </div>

      {/* Suggest edit (text or connections) */}
      <details className="border border-grey-200 rounded-lg p-2">
        <summary className="text-[11px] font-semibold text-tertiary-dark cursor-pointer">
          Suggest an edit (text or connections)
        </summary>
        <div className="mt-2 space-y-2">
          <label className="block">
            <span className="block mb-1 text-tertiary">Field</span>
            <select
              value={editField}
              onChange={e => setEditField(e.target.value)}
              className="px-2 py-1 border border-grey-200 rounded text-xs"
            >
              {EDITABLE_FIELDS.map(f => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <textarea
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            placeholder={
              editField === 'articleCitations'
                ? 'Add / remove / reword article citations (one per line)'
                : editField === 'keyMilestones'
                  ? 'Proposed milestones (e.g. 2030 — -55% vs 1990)'
                  : 'Proposed new text'
            }
            className="w-full h-20 px-2 py-1 border border-grey-200 rounded text-xs"
          />
          <button
            type="button"
            disabled={!editValue || busy || !isSignedIn}
            onClick={() => {
              onAdd('edit', editField, editValue);
              setEditValue('');
            }}
            className="px-3 py-1 rounded-md bg-primary text-white text-[11px] font-semibold hover:bg-primary-dark disabled:opacity-50"
          >
            Submit edit
          </button>
        </div>
      </details>

      <details className="border border-grey-200 rounded-lg p-2">
        <summary className="text-[11px] font-semibold text-tertiary-dark cursor-pointer">
          Fact-check claim
        </summary>
        <div className="mt-2 space-y-2">
          <textarea
            value={factCheck}
            onChange={e => setFactCheck(e.target.value)}
            placeholder="Claim, source consulted, verdict"
            className="w-full h-20 px-2 py-1 border border-grey-200 rounded text-xs"
          />
          <button
            type="button"
            disabled={!factCheck || busy || !isSignedIn}
            onClick={() => {
              onAdd('fact-check', '', factCheck);
              setFactCheck('');
            }}
            className="px-3 py-1 rounded-md bg-primary text-white text-[11px] font-semibold hover:bg-primary-dark disabled:opacity-50"
          >
            Submit fact-check
          </button>
        </div>
      </details>

      {/* Threaded discussion: @-mention colleagues (they get notified), reply and resolve */}
      <div className="border border-grey-200 rounded-lg p-3">
        <WorkspaceComments
          projectId={projectId}
          target={{ kind: 'policy', id: policy.id }}
          title="Comments"
          compact
        />
      </div>

      {annotations.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold mb-2">
            Annotations
          </p>
          <ul className="space-y-1.5">
            {annotations.map(a => (
              <li
                key={a.id}
                className={`text-[11px] px-2 py-1 rounded border ${
                  KIND_COLORS[a.kind]
                } ${a.status === 'resolved' ? 'opacity-50 line-through' : ''}`}
              >
                <span className="font-semibold">{KIND_LABELS[a.kind]}</span>
                {a.field && (
                  <span className="ml-1 text-[10px] text-tertiary-dark">({a.field})</span>
                )}
                {a.value && <span className="ml-1">— {a.value}</span>}
                {a.promotedAt && (
                  <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                    canonical
                  </span>
                )}
                <span className="ml-2 text-[10px] text-tertiary-light">
                  {a.createdAt.slice(0, 10)}
                </span>
                {a.kind === 'edit' && a.field && (
                  <button
                    type="button"
                    onClick={() => onPromote(a.id, !a.promotedAt)}
                    disabled={busy}
                    title={
                      a.promotedAt
                        ? 'Remove this edit from the canonical view'
                        : 'Promote this edit so the EU Policy Navigator shows it as the canonical text'
                    }
                    className="ml-2 text-[10px] underline text-blue-700"
                  >
                    {a.promotedAt ? 'un-promote' : 'promote'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onResolve(a.id)}
                  disabled={busy || a.status === 'resolved'}
                  className="ml-2 text-[10px] underline text-tertiary"
                >
                  resolve
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(a.id)}
                  disabled={busy}
                  className="ml-1 text-[10px] underline text-tertiary"
                >
                  delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  overridden,
}: {
  label: string;
  children: React.ReactNode;
  overridden?: boolean;
}) {
  return (
    <div
      className={`rounded p-2 ${
        overridden ? 'bg-blue-50 border border-blue-200' : 'bg-grey-50'
      }`}
    >
      <p className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold mb-1 flex items-center gap-1">
        {label}
        {overridden && (
          <span className="text-[9px] font-semibold text-blue-700 uppercase tracking-wide">
            · promoted edit
          </span>
        )}
      </p>
      <p className="text-xs text-tertiary-dark leading-snug">{children}</p>
    </div>
  );
}
