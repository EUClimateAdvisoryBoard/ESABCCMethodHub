/**
 * M·36 Policy Targets Register — typed model, display metadata & column config.
 * ---------------------------------------------------------------------------
 * The raw rows (RAW_POLICY_TARGETS) are produced offline by
 * scripts/build-policy-targets.mjs, which unions a fan-out of extraction agents
 * with a regex safety-net and keeps only quotes that are VERBATIM substrings of
 * a policy's enacting terms (articles/annexes — never the recitals/preamble).
 *
 * Each row is one target of one policy (a policy can have many), described along
 * the columns the brief specifies:
 *   1 policy_name · 2 document_type · 3 policy_area · 4 target_text (verbatim,
 *   numbered per policy) · 5 target_label · 6 obligation · 7 target_type ·
 *   8 timeline · 9 indicators · 10 climate_relevance · 11 eurlex_url.
 * The 12th column — human confirmation — is review state, held per-user in the
 * browser (see useTargetConfirmations), not in this dataset.
 */
import { RAW_POLICY_TARGETS } from './policy-targets.generated';

export type TargetLabel = 'target' | 'goal' | 'objective' | 'commitment' | 'other';
export type Obligation = 'mandatory' | 'voluntary';
export type TargetType = 'quantitative' | 'qualitative' | 'unspecified';
export type ClimateRelevance = 'mitigation' | 'adaptation' | 'both' | 'none';
/** The eight sectors/systems the register classifies targets against. The first
 *  six matter for both mitigation and adaptation; water and health are the two
 *  that matter above all for adaptation. */
export type SectorKey = 'energy' | 'buildings' | 'agrifood' | 'transport'
  | 'industry' | 'ecosystems' | 'water' | 'health';

export interface RawPolicyTarget {
  /** Stable content hash of (policy_id + quote) — survives regeneration, so
   *  per-user confirmations keyed on it keep pointing at the same target. */
  id: string;
  policy_id: string;
  /** Column 1 — full official name of the act. */
  policy_name: string;
  /** Shorter title for compact display. */
  policy_short: string;
  /** Column 2 — regulation / directive / decision / communication / strategy. */
  document_type: string;
  /** Column 3 — headline policy area / sector. */
  policy_area: string;
  /** Provision the target sits in, e.g. "Article 4 — Union 2030 climate target". */
  article: string;
  /** Per-policy sequence number (Column 4 numbering). */
  target_number: number;
  /** Column 4 — VERBATIM target text (from the enacting terms only). */
  target_text: string;
  /** Column 5 — how the act describes it. */
  target_label: TargetLabel;
  /** Column 6 — mandatory vs voluntary. */
  obligation: Obligation;
  /** Column 7 — quantitative / qualitative / unspecified. */
  target_type: TargetType;
  /** Column 8 — time expression from the quote itself where one exists; a few
   *  reviewed rows carry a phrase from the surrounding provision instead
   *  (see scripts/policy-targets-overrides.json). "" when unspecified. */
  timeline: string;
  /** Column 9 — indicators linked to the target (may be empty). */
  indicators: string[];
  /** Column 10 — mitigation / adaptation / both / none. */
  climate_relevance: ClimateRelevance;
  celex_number: string | null;
  /** Column 11 — link to the act on EUR-Lex. */
  eurlex_url: string;
  /** Relevance lens — true when the row is a substantive target that materially
   *  bears on the EU climate/energy transition; false for peripheral
   *  institutional/procedural or non-climate commitments carried by the
   *  resilience/health/cohesion acts. Defaults are derived in the build script
   *  and refined per row by the fact-check overrides. The register's default view
   *  shows only relevant rows. */
  relevant: boolean;
  /** Sectors/systems the target bears on — any of the eight keys in SECTOR_META.
   *  Empty when the target is cross-cutting or institutional; those rows stay in
   *  the register for review. Derived in scripts/policy-targets-classify.mjs. */
  sectors: SectorKey[];
  /** The words in the target text that fired each sector, for auditability. */
  sector_evidence: Partial<Record<SectorKey, string[]>>;
  /** Why the target counts as mitigation and/or adaptation — the mechanism it
   *  works through (cuts GHGs / raises removals / enables either; reduces
   *  vulnerability or exposure / raises adaptive capacity / seizes an
   *  opportunity), with the phrase that evidences it. */
  climate_argument: string;
  /** The closest target text in a DIFFERENT policy, when one is close enough to
   *  matter ("Duplicate wording" ≥0.45 similarity, "Similar target" ≥0.25).
   *  Empty when the target has no close counterpart elsewhere. */
  duplicate_of: string;
  /** First (1) vs second (2) order target, per the v3 reviewer definitions
   *  (scripts/policy-targets-review-2026-08.json, `target_order`). null when
   *  unlabelled. An override's `set.target_order` wins when both exist. */
  target_order: 1 | 2 | null;
  /** Who assigned `target_order` — 'human' or 'ai' — from the review file's
   *  `source` field; '' when target_order is null or unlabelled. */
  target_order_source: 'human' | 'ai' | '';
  /** True when the v3 reviewer mark-up (scripts/policy-targets-review-2026-08.json,
   *  `revise`) flags this row as likely not a target. */
  revise_flag: boolean;
  /** The reviewer's reason the row is likely not a target; '' when revise_flag
   *  is false. */
  revise_reason: string;
  /** Note that this row's source document was replaced/consolidated since
   *  extraction (scripts/policy-targets-replaced.json, keyed by policy_id);
   *  '' when not flagged. */
  doc_replaced: string;
}

export type PolicyTarget = RawPolicyTarget;

export const policyTargets: PolicyTarget[] = RAW_POLICY_TARGETS;

// ─── Display metadata ───────────────────────────────────────────────────────
export const LABEL_META: Record<TargetLabel, { label: string; color: string }> = {
  target: { label: 'Target', color: '#0d9488' },
  goal: { label: 'Goal', color: '#7c3aed' },
  objective: { label: 'Objective', color: '#2563eb' },
  commitment: { label: 'Commitment', color: '#c2410c' },
  other: { label: 'Other', color: '#64748b' },
};

export const OBLIGATION_META: Record<Obligation, { label: string; color: string; bg: string }> = {
  mandatory: { label: 'Mandatory', color: '#b91c1c', bg: '#fef2f2' },
  voluntary: { label: 'Voluntary', color: '#6d28d9', bg: '#faf5ff' },
};

export const TYPE_META: Record<TargetType, { label: string; color: string }> = {
  quantitative: { label: 'Quantitative', color: '#0f766e' },
  qualitative: { label: 'Qualitative', color: '#b45309' },
  unspecified: { label: 'Unspecified', color: '#64748b' },
};

export const CLIMATE_META: Record<ClimateRelevance, { label: string; color: string }> = {
  mitigation: { label: 'Mitigation', color: '#0d9488' },
  adaptation: { label: 'Adaptation', color: '#c2410c' },
  both: { label: 'Mitigation + Adaptation', color: '#4f46e5' },
  none: { label: 'Not climate-specific', color: '#64748b' },
};

export const SECTOR_META: { key: SectorKey; label: string; lens: string; color: string }[] = [
  { key: 'energy', label: 'Energy', lens: 'mitigation + adaptation', color: '#f59e0b' },
  { key: 'buildings', label: 'Buildings and built environment', lens: 'mitigation + adaptation', color: '#0ea5e9' },
  { key: 'agrifood', label: 'Agri-food', lens: 'mitigation + adaptation', color: '#65a30d' },
  { key: 'transport', label: 'Transport and mobility', lens: 'mitigation + adaptation', color: '#8b5cf6' },
  { key: 'industry', label: 'Industry', lens: 'mitigation + adaptation', color: '#475569' },
  { key: 'ecosystems', label: 'Land and marine ecosystems', lens: 'mitigation + adaptation', color: '#059669' },
  { key: 'water', label: 'Water', lens: 'adaptation-critical', color: '#0891b2' },
  { key: 'health', label: 'Health', lens: 'adaptation-critical', color: '#e11d48' },
];

// ─── Shared column config (drives both the table and the Excel/CSV export) ──
export interface ColumnDef {
  key: string;
  header: string;
  width: number;
  value: (t: PolicyTarget) => string;
}

export const COLUMNS: ColumnDef[] = [
  { key: 'policy_name', header: '1 · Name of policy', width: 42, value: (t) => t.policy_name },
  { key: 'document_type', header: '2 · Type of policy', width: 15, value: (t) => cap(t.document_type) },
  { key: 'policy_area', header: '3 · Policy area', width: 16, value: (t) => t.policy_area },
  { key: 'target_number', header: '#', width: 4, value: (t) => String(t.target_number) },
  { key: 'target_text', header: '4 · Target text (verbatim)', width: 70, value: (t) => t.target_text },
  { key: 'article', header: 'Provision', width: 24, value: (t) => t.article },
  { key: 'target_label', header: '5 · Target label', width: 13, value: (t) => LABEL_META[t.target_label].label },
  { key: 'obligation', header: '6 · Obligation', width: 12, value: (t) => OBLIGATION_META[t.obligation].label },
  { key: 'target_type', header: '7 · Type of target', width: 14, value: (t) => TYPE_META[t.target_type].label },
  { key: 'timeline', header: '8 · Timeline', width: 22, value: (t) => t.timeline || 'Unspecified' },
  { key: 'indicators', header: '9 · Indicators', width: 30, value: (t) => t.indicators.join('; ') },
  { key: 'climate_relevance', header: '10 · Climate-relevance', width: 20, value: (t) => CLIMATE_META[t.climate_relevance].label },
  { key: 'eurlex_url', header: '11 · Source (EUR-Lex)', width: 40, value: (t) => t.eurlex_url },
  { key: 'relevant', header: 'Relevant (transition lens)', width: 16, value: (t) => (t.relevant ? 'Relevant' : 'Peripheral') },
  ...SECTOR_META.map((s, i) => ({
    key: `sector_${s.key}`,
    header: `${13 + i} · ${s.label}`,
    width: 14,
    value: (t: PolicyTarget) => (t.sectors.includes(s.key) ? 'Yes' : ''),
  })),
  { key: 'climate_argument', header: '21 · Mitigation / adaptation argument', width: 60, value: (t) => t.climate_argument },
  { key: 'duplicate_of', header: '22 · Duplicate / similar target in another policy', width: 46, value: (t) => t.duplicate_of },
];

function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

// ─── Stats ──────────────────────────────────────────────────────────────────
export interface TargetStats {
  total: number;
  policies: number;
  mandatory: number;
  quantitative: number;
  relevant: number;
  byClimate: Record<ClimateRelevance, number>;
  byLabel: Record<TargetLabel, number>;
}

export function computeStats(targets: PolicyTarget[]): TargetStats {
  const byClimate = { mitigation: 0, adaptation: 0, both: 0, none: 0 } as Record<ClimateRelevance, number>;
  const byLabel = { target: 0, goal: 0, objective: 0, commitment: 0, other: 0 } as Record<TargetLabel, number>;
  const policies = new Set<string>();
  let mandatory = 0, quantitative = 0, relevant = 0;
  for (const t of targets) {
    byClimate[t.climate_relevance]++;
    byLabel[t.target_label]++;
    policies.add(t.policy_id);
    if (t.obligation === 'mandatory') mandatory++;
    if (t.target_type === 'quantitative') quantitative++;
    if (t.relevant) relevant++;
  }
  return { total: targets.length, policies: policies.size, mandatory, quantitative, relevant, byClimate, byLabel };
}
