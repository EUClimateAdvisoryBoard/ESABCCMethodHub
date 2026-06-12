// ---------------------------------------------------------------------------
// Policy Coherence 2.0 — ESABCC consistency-gap assessment.
//
// Applies the Advisory Board's overall assessment framework (report §2.1,
// "Consistency assessment based on the overall assessment framework") at the
// micro level of sentence blocks, replacing the four-step presentation lens:
//
//   · POLICY GAPS — no EU policies in place to drive the required change in
//     a specific mitigation lever or enabling condition. Detected here as
//     levers with no operative target/instrument blocks anywhere in the
//     tracked corpus (corpus-relative by construction, and flagged as such).
//   · POLICY INCONSISTENCIES — policies providing incentives that counteract
//     the required change. Sourced from curated Nilsson interactions
//     (block-anchored), internal target conflicts, and high-scoring ML
//     contradiction candidates.
//   · AMBITION GAPS — policies in place, but objectives or delivery
//     mechanisms insufficient. Sourced from orphan goals, weak-deontic
//     targets, discretion clusters, missing MRV, and measured pace where
//     the delivery machinery itself is thin.
//   · IMPLEMENTATION GAPS — ambitious policies in place, but implementation
//     ineffective so far. Sourced from distance-to-target pace ratios where
//     the machinery is largely present, and violated design assumptions.
//
// Every gap finding carries a REASONING CHAIN — numbered steps from required
// change, to block-level evidence, to conclusion — and cites the exact
// sentence blocks it rests on, then rolls up into a policy × gap-type
// matrix so the micro detail stays connected to the bigger picture.
// ---------------------------------------------------------------------------

import {
  computePace,
  EX_ANTE_ASSESSMENTS,
  GOAL_INTERACTIONS,
  INTERACTION_SCALE,
  meansCoherence,
  OUTCOME_MEASUREMENTS,
} from '../content-analysis/policy-coherence';
import type {
  Pc2Finding,
  Pc2MlResult,
  Pc2Run,
  Pc2RuleId,
  Pc2Unit,
} from './types';

export const GAP_VERSION = 'pc2-gaps-0.2.0';

export type GapType =
  | 'policy-gap'
  | 'policy-inconsistency'
  | 'ambition-gap'
  | 'implementation-gap';

export type GapSeverity = 'high' | 'medium' | 'low' | 'candidate';

/** Confidence is QUALIFIED SEPARATELY from severity (GRADE-style): severity
 *  says how much it matters if true; confidence says how sure the method is.
 *  Derivation is declared and mechanical:
 *    · base level by evidence source — curated tier-A/B audits and verbatim
 *      text conflicts → high; rule-based detections → medium; statistical
 *      (ML) discoveries and cross-act candidates → low;
 *    · +1 level when two INDEPENDENT layers agree (triangulation, e.g. a
 *      curated interaction matched by an ML contradiction) → corroborated;
 *    · −1 level when an absence-based finding rests on an incomplete text
 *      substrate (the absence may be the excerpt's, not the act's). */
export type GapConfidence = 'corroborated' | 'high' | 'medium' | 'low';

export const CONFIDENCE_LABEL: Record<GapConfidence, string> = {
  corroborated: 'two independent layers agree',
  high: 'verbatim text or tier-A/B evidence',
  medium: 'declared rule on complete substrate',
  low: 'statistical candidate / substrate-limited',
};

export const GAP_META: Record<
  GapType,
  { name: string; definition: string; color: string }
> = {
  'policy-gap': {
    name: 'Policy gap',
    definition:
      'No EU policies in place to drive the required change in the specific mitigation lever or enabling condition.',
    color: '#A78BFA',
  },
  'policy-inconsistency': {
    name: 'Policy inconsistency',
    definition:
      'EU policies are providing incentives that counteract the required change in the relevant mitigation levers or enabling conditions.',
    color: '#EF4444',
  },
  'ambition-gap': {
    name: 'Ambition gap',
    definition:
      'EU policies are in place to target the relevant lever or condition, but their overall ambition level — objectives or delivery mechanisms — is insufficient to achieve the outcomes.',
    color: '#F59E0B',
  },
  'implementation-gap': {
    name: 'Implementation gap',
    definition:
      'Ambitious EU policies are in place, but implementation at the EU, national or subnational level has been ineffective so far.',
    color: '#38BDF8',
  },
};

export interface GapEvidence {
  policyId: string;
  unitId: string;
  path: string;
  quote: string;
}

export interface GapFinding {
  id: string;
  gapType: GapType;
  severity: GapSeverity;
  confidence: GapConfidence;
  /** Mitigation lever / enabling condition, for policy gaps. */
  leverId?: string;
  leverName?: string;
  policyIds: string[];
  unitIds: string[];
  title: string;
  /** Numbered reasoning chain: required change → evidence → conclusion. */
  reasoning: string[];
  evidence: GapEvidence[];
  /** Provenance of the classification (which signals produced it). */
  basis: string[];
}

export interface PolicyGapRow {
  policyId: string;
  shortTitle: string;
  counts: Record<GapType, number>;
  total: number;
}

export interface LeverCoverage {
  leverId: string;
  name: string;
  requiredChange: string;
  targetBlocks: number;
  instrumentBlocks: number;
  mentionBlocks: number;
  policies: string[];
}

export interface GapAssessment {
  version: string;
  corpusHash: string;
  generatedAt: string;
  findings: GapFinding[];
  matrix: PolicyGapRow[];
  levers: LeverCoverage[];
  countsByType: Record<GapType, number>;
  countsByConfidence: Record<GapConfidence, number>;
  /** Acts whose shipped text scores below the completeness threshold —
   *  absence-based findings on these are confidence-downgraded. */
  substrateIncomplete: string[];
}

// ── Mitigation levers / enabling conditions (coverage scan) ────────────────
// Keyword lexicons are deliberately broad: a lever counts as covered when ANY
// block in the corpus addresses it operatively, so a "policy gap" verdict
// means the tracked corpus is genuinely silent — the strongest claim the
// block substrate can support, and corpus-relative by construction.

const LEVERS: Array<{
  id: string;
  name: string;
  requiredChange: string;
  keywords: string[];
}> = [
  {
    id: 'demand-behaviour',
    name: 'Demand-side & behavioural change',
    requiredChange:
      'Shift demand (modal shift, sufficiency, diets, consumption patterns) — scenarios consistent with climate neutrality rely on demand-side change alongside technology.',
    keywords: ['modal shift', 'behaviour change', 'behavioural change', 'sufficiency', 'dietary', 'diets', 'food waste', 'demand reduction', 'car-sharing', 'cycling', 'public transport use'],
  },
  {
    id: 'agriculture-nonco2',
    name: 'Agricultural non-CO₂ emissions',
    requiredChange:
      'Cut CH₄ and N₂O from livestock and fertilisation — the largest unpriced emission block in the EU inventory.',
    keywords: ['livestock', 'enteric', 'manure', 'fertilis', 'fertiliz', 'nitrous oxide', 'agricultural emissions', 'herd'],
  },
  {
    id: 'fossil-subsidies',
    name: 'Fossil-fuel subsidy phase-out',
    requiredChange:
      'Remove public incentives that counteract carbon pricing — fossil-fuel subsidies persist across Member States.',
    keywords: ['fossil fuel subsid', 'fossil subsidies', 'subsidies for fossil', 'environmentally harmful subsid'],
  },
  {
    id: 'skills-workforce',
    name: 'Skills & workforce for the transition',
    requiredChange:
      'Train and redeploy the workforce the transition needs (heat-pump installers, grid engineers, renovators) — a binding delivery constraint.',
    keywords: ['skills', 'reskilling', 'upskilling', 'workforce', 'vocational training', 'shortage of qualified'],
  },
  {
    id: 'carbon-removal-industrial',
    name: 'Industrial carbon management (CCS/CCU/DACCS)',
    requiredChange:
      'Build capture, transport and storage capacity for residual industrial emissions and permanent removals.',
    keywords: ['carbon capture', 'ccs', 'ccu', 'geological storage', 'storage of co2', 'direct air capture', 'carbon removal'],
  },
  {
    id: 'grids-storage',
    name: 'Grids, storage & system flexibility',
    requiredChange:
      'Expand transmission/distribution grids and storage fast enough to integrate the renewables build-out.',
    keywords: ['grid', 'interconnect', 'electricity storage', 'battery storage', 'system flexibility', 'transmission network', 'distribution network'],
  },
  {
    id: 'electrification',
    name: 'Direct electrification of end uses',
    requiredChange:
      'Electrify heat, transport and industrial processes — the central lever of most neutrality pathways.',
    keywords: ['electrification', 'electrify', 'heat pump', 'electric heating'],
  },
  {
    id: 'buildings-renovation',
    name: 'Deep building renovation',
    requiredChange: 'Roughly double deep-renovation rates this decade.',
    keywords: ['renovation', 'renovat', 'building stock', 'worst-performing buildings'],
  },
  {
    id: 'hydrogen-fuels',
    name: 'Renewable hydrogen & derived fuels',
    requiredChange: 'Scale renewable hydrogen for the uses electrification cannot reach.',
    keywords: ['hydrogen', 'electrolys', 'rfnbo', 'synthetic fuels'],
  },
  {
    id: 'circular-materials',
    name: 'Circularity & material efficiency',
    requiredChange: 'Cut primary material demand (steel, cement, plastics) through reuse and recycling.',
    keywords: ['circular', 'recycl', 'material efficiency', 'reuse', 'secondary raw material'],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function djb2(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function evidenceOf(u: Pc2Unit): GapEvidence {
  return {
    policyId: u.policyId,
    unitId: u.id,
    path: u.path,
    quote: u.text.length > 300 ? u.text.slice(0, 297) + '…' : u.text,
  };
}

const isOperative = (u: Pc2Unit) => u.blockKind !== 'recital';

/** Substrate completeness per act, 0–1: does the shipped text look like the
 *  (consolidated) act, or like an excerpt? Declared heuristic — articles
 *  present (0.5), substantial block count (0.3), no truncation marker (0.2).
 *  Below 0.7 the substrate counts as incomplete and absence-based findings
 *  on it are confidence-downgraded. */
export const SUBSTRATE_COMPLETE_THRESHOLD = 0.7;

function substrateCompleteness(units: Pc2Unit[]): number {
  const hasArticles = units.some(u => /^Article\s+\d+/i.test(u.path));
  const substantial = units.length >= 60;
  const truncated = units.some(u => /truncated|\[…/.test(u.text));
  return (hasArticles ? 0.5 : 0) + (substantial ? 0.3 : 0) + (truncated ? 0 : 0.2);
}

function makeGap(
  gapType: GapType,
  key: string,
  severity: GapSeverity,
  confidence: GapConfidence,
  units: Pc2Unit[],
  policyIds: string[],
  title: string,
  reasoning: string[],
  basis: string[],
  lever?: { id: string; name: string },
): GapFinding {
  const seen = new Set<string>();
  units = units.filter(u => (seen.has(u.id) ? false : (seen.add(u.id), true)));
  return {
    id: `gap-${djb2(`${gapType}|${key}`)}`,
    gapType,
    severity,
    confidence,
    leverId: lever?.id,
    leverName: lever?.name,
    policyIds: [...new Set(policyIds)].sort(),
    unitIds: units.map(u => u.id),
    title,
    reasoning,
    evidence: units.slice(0, 5).map(evidenceOf),
    basis,
  };
}

// ── Source 1 · Policy gaps from lever coverage ─────────────────────────────

function leverCoverage(run: Pc2Run): { levers: LeverCoverage[]; findings: GapFinding[] } {
  const levers: LeverCoverage[] = [];
  const findings: GapFinding[] = [];

  for (const lever of LEVERS) {
    const hits = run.units.filter(u => {
      const t = u.text.toLowerCase();
      return lever.keywords.some(k => t.includes(k));
    });
    const targetBlocks = hits.filter(
      u => isOperative(u) && u.claims.some(c => c.kind === 'target'),
    );
    const instrumentBlocks = hits.filter(
      u => isOperative(u) && u.claims.some(c => c.kind === 'instrument' || c.kind === 'obligation' && (c.strength ?? 0) >= 3),
    );
    const policies = [...new Set(hits.map(u => u.policyId))].sort();
    levers.push({
      leverId: lever.id,
      name: lever.name,
      requiredChange: lever.requiredChange,
      targetBlocks: targetBlocks.length,
      instrumentBlocks: instrumentBlocks.length,
      mentionBlocks: hits.length,
      policies,
    });

    if (targetBlocks.length === 0 && instrumentBlocks.length <= 2) {
      const severity: GapSeverity = instrumentBlocks.length === 0 && hits.length <= 3 ? 'high' : 'medium';
      findings.push(
        makeGap(
          'policy-gap',
          lever.id,
          severity,
          'medium',
          hits.slice(0, 3),
          policies,
          `${lever.name}: no operative block in the tracked corpus drives this lever`,
          [
            `Required change — ${lever.requiredChange}`,
            `Coverage scan over all ${run.stats.unitCount.toLocaleString('en-GB')} blocks: ${hits.length} block(s) mention the lever at all, ${targetBlocks.length} state an operative target for it, ${instrumentBlocks.length} bind an instrument or hard obligation to it.`,
            hits.length > 0
              ? `The mentions that do exist sit in ${policies.join(', ')} — peripheral references, not delivery provisions.`
              : `Not a single block in the corpus addresses it.`,
            `Conclusion: policy gap — within the tracked corpus, no policy provision drives the required change. (Corpus-relative: an act outside the ${run.stats.policyCount}-act corpus could cover it; ingesting it would clear or confirm the gap.)`,
          ],
          [`lever coverage scan (${lever.keywords.length} keywords)`],
          { id: lever.id, name: lever.name },
        ),
      );
    }
  }
  return { levers, findings };
}

// ── Source 2 · Inconsistencies ─────────────────────────────────────────────

function inconsistencies(run: Pc2Run, ml: Pc2MlResult | null): GapFinding[] {
  const findings: GapFinding[] = [];
  const unitById = new Map(run.units.map(u => [u.id, u]));
  const analysed = new Set(run.policies.map(p => p.policyId));

  // Triangulation index: policy pairs where the INDEPENDENT statistical
  // layer also found a contradiction. Agreement between a curated audit and
  // an unsupervised discovery upgrades confidence to "corroborated".
  const mlContradictionPairs = new Set(
    (ml?.pairs ?? [])
      .filter(p => p.kind === 'contradiction-candidate')
      .map(p => [p.policyA, p.policyB].sort().join('+')),
  );

  // Curated counteracting interactions, block-anchored via the engine's
  // existing findings (which already resolved the cited articles to units).
  const anchorsByInteraction = new Map<string, Pc2Unit[]>();
  for (const f of run.findings) {
    if (f.ruleId !== 'pc2-curated-counteraction') continue;
    anchorsByInteraction.set(
      f.policyIds.join('+'),
      f.unitIds.map(id => unitById.get(id)).filter((u): u is Pc2Unit => !!u),
    );
  }
  for (const gi of GOAL_INTERACTIONS) {
    if (gi.score > -1) continue;
    if (!analysed.has(gi.a) && !analysed.has(gi.b)) continue;
    const scale = INTERACTION_SCALE[gi.score];
    const pairKey = [gi.a, gi.b].sort().join('+');
    const anchors = anchorsByInteraction.get(pairKey) ?? [];
    const triangulated = mlContradictionPairs.has(pairKey);
    findings.push(
      makeGap(
        'policy-inconsistency',
        gi.id,
        gi.score <= -2 ? 'high' : 'medium',
        triangulated ? 'corroborated' : 'high',
        anchors,
        [gi.a, gi.b],
        `${gi.a} ↔ ${gi.b}: ${scale.name.toLowerCase()} incentives (${gi.score} on the Nilsson scale)`,
        [
          `Required change on each side — ${gi.a}: "${gi.goalA}" · ${gi.b}: "${gi.goalB}".`,
          `Counteracting mechanism (${gi.mechanism}): ${gi.rationale}`,
          `The incentive conflict is created in law, not in practice: ${gi.legalBasis}`,
          `Conclusion: policy inconsistency — one act rewards exactly what the other needs prevented (${scale.name}: ${scale.definition.toLowerCase()}) Evidence tier ${gi.tier}.`,
        ],
        [
          'curated Nilsson goal-interaction, anchored to the cited provisions',
          ...(triangulated
            ? ['triangulated: the independent ML pass also finds a contradiction between these acts']
            : []),
        ],
      ),
    );
  }

  // Internal target conflicts: one act, two numbers.
  for (const f of run.findings) {
    if (f.ruleId !== 'pc2-internal-target-conflict') continue;
    findings.push(
      makeGap(
        'policy-inconsistency',
        f.id,
        'medium',
        'high', // the conflicting numbers are quoted verbatim from the blocks
        f.unitIds.map(id => unitById.get(id)).filter((u): u is Pc2Unit => !!u),
        f.policyIds,
        `${f.policyIds[0]}: ${f.title.toLowerCase()}`,
        [
          `Two operative blocks of the same act quantify the same indicator family for the same year with different values.`,
          f.detail,
          `Conclusion: within-act inconsistency — actors reading different provisions receive different signals about the required change. Either the scopes differ (and should be stated in the blocks) or one number is stale.`,
        ],
        [`engine rule pc2-internal-target-conflict`],
      ),
    );
  }

  // Cross-act target divergence → candidate inconsistency.
  for (const f of run.findings) {
    if (f.ruleId !== 'pc2-cross-target-divergence') continue;
    findings.push(
      makeGap(
        'policy-inconsistency',
        f.id,
        'candidate',
        'low',
        f.unitIds.map(id => unitById.get(id)).filter((u): u is Pc2Unit => !!u),
        f.policyIds,
        f.title,
        [
          f.detail,
          `Conclusion: candidate inconsistency for human review — divergent numbers are legitimate where scopes differ, but undeclared scope differences send counteracting signals.`,
        ],
        ['engine rule pc2-cross-target-divergence'],
      ),
    );
  }

  // High-scoring ML contradiction candidates → candidate inconsistencies.
  if (ml) {
    for (const p of ml.pairs) {
      if (p.kind !== 'contradiction-candidate' || p.score < 0.75) continue;
      const ua = unitById.get(p.unitA);
      const ub = unitById.get(p.unitB);
      if (!ua || !ub) continue;
      findings.push(
        makeGap(
          'policy-inconsistency',
          p.id,
          'candidate',
          'low',
          [ua, ub],
          [p.policyA, p.policyB],
          `${p.policyA === p.policyB ? p.policyA : `${p.policyA} ↔ ${p.policyB}`}: discovered tension (${p.pathA} vs ${p.pathB})`,
          [
            `The unsupervised pass found these two blocks highly related (cosine ${p.cosine}) yet pulling in different directions.`,
            `Signals: ${p.signals.join('; ')}.`,
            `Conclusion: candidate inconsistency, discovered rather than pattern-matched — verify whether the tension is a deliberate design trade-off or an unmanaged conflict.`,
          ],
          [`ML contradiction candidate, score ${p.score.toFixed(2)}`],
        ),
      );
    }
  }
  return findings;
}

// ── Source 3 · Ambition gaps (design-side insufficiency) ───────────────────

const AMBITION_RULES: Partial<Record<Pc2RuleId, string>> = {
  'pc2-orphan-goal':
    'A goal without means in its own article is an ambition gap on the delivery-mechanism side: the objective exists, the machinery does not.',
  'pc2-soft-target':
    'A target carried only by "may / aim to / endeavour" sets ambition rhetorically without binding anyone to deliver it.',
  'pc2-undated-target':
    'A target without a year cannot define a required pace — ambition without a schedule.',
  'pc2-discretion-cluster':
    'Concentrated derogations and discretion clauses lower effective ambition below the headline objective.',
  'pc2-unmeasurable-target':
    'Without MRV in (or delegated by) the act, the enabling condition for steering delivery is missing.',
};

/** Rules whose verdict rests on something MISSING from the text — these are
 *  the ones an incomplete substrate can fake, so they get downgraded there. */
const ABSENCE_BASED: ReadonlySet<string> = new Set([
  'pc2-orphan-goal',
  'pc2-undated-target',
  'pc2-unmeasurable-target',
]);

function ambitionGaps(run: Pc2Run, incompleteSubstrate: ReadonlySet<string>): GapFinding[] {
  const unitById = new Map(run.units.map(u => [u.id, u]));
  const findings: GapFinding[] = [];
  for (const f of run.findings) {
    const frame = AMBITION_RULES[f.ruleId];
    if (!frame) continue;
    const absenceBased = ABSENCE_BASED.has(f.ruleId);
    const substrateLimited = absenceBased && f.policyIds.some(pid => incompleteSubstrate.has(pid));
    // Presence-based signals quote verbatim text → high; absence-based ones
    // depend on the substrate → medium, low when the substrate is an excerpt.
    const confidence: GapConfidence = !absenceBased
      ? f.ruleId === 'pc2-soft-target' ? 'high' : 'medium'
      : substrateLimited ? 'low' : 'medium';
    const reasoning = [f.detail, `Why this is an ambition gap: ${frame}`];
    if (substrateLimited) {
      reasoning.push(
        `Confidence downgraded: the shipped text of ${f.policyIds.join(', ')} scores below the completeness threshold (${SUBSTRATE_COMPLETE_THRESHOLD}) — the missing element may sit in a part of the act the substrate does not carry. Ingesting the full EUR-Lex text resolves this either way.`,
      );
    }
    findings.push(
      makeGap(
        'ambition-gap',
        f.id,
        f.severity === 'info' ? 'low' : f.severity,
        confidence,
        f.unitIds.map(id => unitById.get(id)).filter((u): u is Pc2Unit => !!u),
        f.policyIds,
        `${f.policyIds.join(' · ')}: ${f.title}`,
        reasoning,
        [`engine rule ${f.ruleId}`, absenceBased ? 'absence-based signal' : 'presence-based signal'],
      ),
    );
  }
  return findings;
}

// ── Source 4 · Ambition vs implementation from measured pace ───────────────

function paceGaps(run: Pc2Run): GapFinding[] {
  const findings: GapFinding[] = [];
  const byPolicy = new Map<string, Pc2Unit[]>();
  for (const u of run.units) (byPolicy.get(u.policyId) ?? byPolicy.set(u.policyId, []).get(u.policyId)!).push(u);

  for (const [pid, m] of Object.entries(OUTCOME_MEASUREMENTS)) {
    const units = byPolicy.get(pid);
    if (!units) continue;
    const pace = computePace(m);
    if (pace.reading === 'on-track') continue;
    const means = meansCoherence(pid);
    const meansScore = means.score ?? 0;
    const isImplementation = meansScore >= 0.45;
    const ex = EX_ANTE_ASSESSMENTS[pid];
    const anchors = units.filter(u => isOperative(u) && u.claims.some(c => c.kind === 'target')).slice(0, 3);

    const reasoning = [
      `Required change — ${m.indicator}: from ${m.latest.value} ${m.unit} (${m.latest.year}) to ${m.target.value} ${m.unit} by ${m.target.year}, i.e. ${pace.requiredPerYear.toFixed(2)} ${m.unit}/yr from here.`,
      `Observed — ${pace.observedPerYear.toFixed(2)} ${m.unit}/yr over ${m.recent.year}–${m.latest.year}; pace ratio ${pace.ratio === null ? 'n/a' : pace.ratio.toFixed(2)} → ${pace.reading.toUpperCase()} (EEA distance-to-target method). Source: ${m.source}`,
      `Delivery machinery — the objective–delivery checklist scores the means (instruments, coverage, enforcement, financing, timeline) at ${means.score === null ? 'n/a' : meansScore.toFixed(2)}: ${isImplementation ? 'the machinery is largely in place.' : 'the machinery itself is thin.'}`,
    ];
    if (ex && ex.status !== 'valid') {
      reasoning.push(`Design-assumption audit (${ex.status.toUpperCase()}): ${ex.observation}`);
    }
    if (m.policyChange) reasoning.push(`Measured policy change: ${m.policyChange}`);
    reasoning.push(
      isImplementation
        ? `Conclusion: implementation gap — an ambitious framework exists in law, but EU/national delivery runs at ${pace.ratio === null ? 'an insufficient' : `${Math.round((pace.ratio as number) * 100)}% of the required`} pace.`
        : `Conclusion: ambition gap — the measured pace falls short AND the delivery mechanisms in the act are insufficient to close it; this is a design problem before it is a delivery problem.`,
    );

    // Triangulation: measured pace (statistics) and the assumption audit
    // (legal-development analysis) are independent layers — when both point
    // the same way, the gap is corroborated.
    const exAgrees = !!ex && ex.status !== 'valid';
    findings.push(
      makeGap(
        isImplementation ? 'implementation-gap' : 'ambition-gap',
        `pace-${pid}`,
        pace.reading === 'off-track' ? 'high' : 'medium',
        exAgrees ? 'corroborated' : 'high',
        anchors,
        [pid],
        `${pid}: ${m.indicator} is ${pace.reading} (pace ratio ${pace.ratio === null ? 'n/a' : pace.ratio.toFixed(2)})`,
        reasoning,
        [
          'EEA distance-to-target pace ratio (tier-A statistics)',
          'objective–delivery checklist means score',
          ...(exAgrees ? ['triangulated: the independent assumption audit points the same way'] : []),
        ],
      ),
    );
  }

  // Violated/under-pressure design assumptions WITHOUT an outcome measurement
  // still evidence an implementation gap (the world ran past the design).
  for (const [pid, ex] of Object.entries(EX_ANTE_ASSESSMENTS)) {
    if (ex.status === 'valid' || OUTCOME_MEASUREMENTS[pid]) continue;
    const units = byPolicy.get(pid);
    if (!units) continue;
    const anchors = units.filter(u => isOperative(u) && u.claims.some(c => c.kind === 'target' || c.kind === 'deadline')).slice(0, 3);
    findings.push(
      makeGap(
        'implementation-gap',
        `exante-${pid}`,
        ex.status === 'violated' ? 'high' : 'medium',
        ex.tier === 'C' ? 'medium' : 'high',
        anchors,
        [pid],
        `${pid}: design assumption ${ex.status === 'violated' ? 'violated' : 'under pressure'} — delivery diverges from design`,
        [
          `The act was designed (in ${ex.designYear}) on the assumption: ${ex.assumption}`,
          `Signpost monitored: ${ex.signpost}`,
          `What the signpost shows: ${ex.observation} (Source: ${ex.source}, tier ${ex.tier}.)`,
          `Violation criterion applied: ${ex.violationCriterion} → status ${ex.status.toUpperCase()}.`,
          `Conclusion: implementation gap — the policy as written presumes a world that has not materialised; without corrective implementation or revision, delivery under-runs the design.`,
        ],
        ['Assumption-Based Planning audit (curated, block-anchored)'],
      ),
    );
  }
  return findings;
}

// ── Assembly ───────────────────────────────────────────────────────────────

const SEV_ORDER: Record<GapSeverity, number> = { high: 0, medium: 1, low: 2, candidate: 3 };
const TYPE_ORDER: Record<GapType, number> = {
  'policy-gap': 0,
  'policy-inconsistency': 1,
  'ambition-gap': 2,
  'implementation-gap': 3,
};

let cached: { key: string; value: GapAssessment } | null = null;

export function runGapAssessment(run: Pc2Run, ml: Pc2MlResult | null): GapAssessment {
  const key = `${run.corpusHash}|${ml ? ml.mlVersion : 'no-ml'}`;
  if (cached && cached.key === key) return cached.value;

  // Substrate completeness per act — qualifies absence-based findings.
  const byPolicy = new Map<string, Pc2Unit[]>();
  for (const u of run.units) (byPolicy.get(u.policyId) ?? byPolicy.set(u.policyId, []).get(u.policyId)!).push(u);
  const incompleteSubstrate = new Set(
    [...byPolicy.entries()]
      .filter(([, us]) => substrateCompleteness(us) < SUBSTRATE_COMPLETE_THRESHOLD)
      .map(([pid]) => pid),
  );

  const { levers, findings: policyGapFindings } = leverCoverage(run);
  const findings = [
    ...policyGapFindings,
    ...inconsistencies(run, ml),
    ...ambitionGaps(run, incompleteSubstrate),
    ...paceGaps(run),
  ].sort(
    (a, b) =>
      TYPE_ORDER[a.gapType] - TYPE_ORDER[b.gapType] ||
      SEV_ORDER[a.severity] - SEV_ORDER[b.severity] ||
      a.id.localeCompare(b.id),
  );

  const matrixMap = new Map<string, PolicyGapRow>();
  for (const p of run.policies) {
    matrixMap.set(p.policyId, {
      policyId: p.policyId,
      shortTitle: p.shortTitle,
      counts: { 'policy-gap': 0, 'policy-inconsistency': 0, 'ambition-gap': 0, 'implementation-gap': 0 },
      total: 0,
    });
  }
  for (const f of findings) {
    if (f.gapType === 'policy-gap') continue; // gaps in coverage belong to no act
    for (const pid of f.policyIds) {
      const row = matrixMap.get(pid);
      if (!row) continue;
      row.counts[f.gapType] += 1;
      row.total += 1;
    }
  }
  const matrix = [...matrixMap.values()].sort((a, b) => b.total - a.total || a.policyId.localeCompare(b.policyId));

  const countsByType: Record<GapType, number> = {
    'policy-gap': 0,
    'policy-inconsistency': 0,
    'ambition-gap': 0,
    'implementation-gap': 0,
  };
  const countsByConfidence: Record<GapConfidence, number> = {
    corroborated: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const f of findings) {
    countsByType[f.gapType] += 1;
    countsByConfidence[f.confidence] += 1;
  }

  const value: GapAssessment = {
    version: GAP_VERSION,
    corpusHash: run.corpusHash,
    generatedAt: new Date().toISOString(),
    findings,
    matrix,
    levers,
    countsByType,
    countsByConfidence,
    substrateIncomplete: [...incompleteSubstrate].sort(),
  };
  cached = { key, value };
  return value;
}

/** JSONL lines for the export file (joins to units via unitIds). */
export function gapJsonlLines(g: GapAssessment): string[] {
  const lines: string[] = [
    JSON.stringify({
      type: 'gap-assessment',
      version: g.version,
      corpusHash: g.corpusHash,
      countsByType: g.countsByType,
      framework: Object.fromEntries(
        (Object.keys(GAP_META) as GapType[]).map(t => [t, GAP_META[t].definition]),
      ),
    }),
  ];
  for (const l of g.levers) lines.push(JSON.stringify({ type: 'lever-coverage', ...l }));
  for (const f of g.findings) lines.push(JSON.stringify({ type: 'gap-finding', ...f }));
  for (const r of g.matrix) lines.push(JSON.stringify({ type: 'gap-matrix-row', ...r }));
  return lines;
}
