// ---------------------------------------------------------------------------
// Policy Coherence 2.0 — block-level analysis engine.
//
// Runs the four-step coherence model sentence by sentence over every policy
// that ships with real text: segmentation → claim extraction → finding rules.
// Every finding follows mechanically from a declared rule (PC2_RULES, printed
// in the UI) applied to extracted claims, and quotes the exact units it rests
// on. Within-policy rules surface internal inconsistencies (conflicting
// targets, orphan goals, unmeasurable targets, discretion-heavy articles);
// cross-policy rules surface inconsistencies across acts (target divergence,
// curated counteracting goal interactions anchored to the cited provisions,
// dangling cross-references). The act-level curated layer (EX_ANTE_ASSESSMENTS,
// GOAL_INTERACTIONS) is reused, never re-authored — PC 2.0 anchors it down to
// the blocks that carry it.
//
// The run is deterministic over the shipped corpus: same corpus → same unit
// ids, claim sets and finding ids, so persisted rows stay stable references.
// ---------------------------------------------------------------------------

import { policies } from '@/data/policies';
import {
  COHERENCE_STEP_BY_ID,
  EX_ANTE_ASSESSMENTS,
  GOAL_INTERACTIONS,
  INTERACTION_SCALE,
  type CoherenceStepId,
} from '../content-analysis/policy-coherence';
import { extractClaims } from './claims';
import { deriveBlocks, deriveUnits } from './segmentation';
import type {
  Pc2Evidence,
  Pc2Finding,
  Pc2MlResult,
  Pc2PolicyAnalysis,
  Pc2RuleId,
  Pc2RuleMeta,
  Pc2Run,
  Pc2Severity,
  Pc2Stats,
  Pc2Unit,
} from './types';

export const PC2_ENGINE_VERSION = 'pc2-0.1.0';

/** Minimum shipped text length to count as a real (non-stub) policy text. */
const MIN_TEXT_LEN = 400;

// ── Declared rules (printed in the UI; reviewers audit applications) ───────

export const PC2_RULES: Record<Pc2RuleId, Pc2RuleMeta> = {
  'pc2-internal-target-conflict': {
    id: 'pc2-internal-target-conflict',
    name: 'Internal target conflict',
    stepId: 'goals-means',
    scope: 'within-policy',
    defaultSeverity: 'high',
    rule: 'Two units of the SAME act state quantified targets of the same indicator family for the same target year with different values.',
  },
  'pc2-cross-target-divergence': {
    id: 'pc2-cross-target-divergence',
    name: 'Cross-policy target divergence (candidate)',
    stepId: 'horizontal',
    scope: 'cross-policy',
    defaultSeverity: 'info',
    rule: 'Units of DIFFERENT acts state quantified targets of the same indicator family for the same target year with different values. Flagged for human review: differing scopes (e.g. economy-wide vs non-ETS) can make divergent numbers legitimate.',
  },
  'pc2-orphan-goal': {
    id: 'pc2-orphan-goal',
    name: 'Orphan goal (article level)',
    stepId: 'goals-means',
    scope: 'within-policy',
    defaultSeverity: 'medium',
    rule: 'An article states a quantified target but contains no instrument or financing claim in any of its units.',
  },
  'pc2-unmeasurable-target': {
    id: 'pc2-unmeasurable-target',
    name: 'Unmeasurable target (no MRV in act)',
    stepId: 'evaluation',
    scope: 'within-policy',
    defaultSeverity: 'high',
    rule: 'The act states at least one quantified target but contains zero monitoring/reporting clauses across all units.',
  },
  'pc2-undated-target': {
    id: 'pc2-undated-target',
    name: 'Undated target',
    stepId: 'evaluation',
    scope: 'within-policy',
    defaultSeverity: 'low',
    rule: 'A unit states a quantified target with no target year, and no deadline claim appears anywhere in the same article.',
  },
  'pc2-soft-target': {
    id: 'pc2-soft-target',
    name: 'Aspirational target (weak deontics)',
    stepId: 'goals-means',
    scope: 'within-policy',
    defaultSeverity: 'medium',
    rule: 'A target unit in the enacting terms carries only weak deontic force (may / aim to / endeavour; no shall / must) — the goal is stated without a binding obligation.',
  },
  'pc2-discretion-cluster': {
    id: 'pc2-discretion-cluster',
    name: 'Discretion cluster (loophole density)',
    stepId: 'goals-means',
    scope: 'within-policy',
    defaultSeverity: 'low',
    rule: 'An article contains ≥ 3 units with flexibility markers (derogation, exemption, "where appropriate"…), or ≥ 50% of its units carry such markers (min 5 units). ≥ 5 flagged units escalates to medium.',
  },
  'pc2-dangling-crossref': {
    id: 'pc2-dangling-crossref',
    name: 'Dangling cross-reference',
    stepId: 'horizontal',
    scope: 'within-policy',
    defaultSeverity: 'info',
    rule: 'The act cites legal acts that are not in the tracked corpus — those dependencies cannot be checked for coherence here.',
  },
  'pc2-curated-counteraction': {
    id: 'pc2-curated-counteraction',
    name: 'Counteracting goal interaction (curated, block-anchored)',
    stepId: 'horizontal',
    scope: 'cross-policy',
    defaultSeverity: 'high',
    rule: 'A curated Nilsson-scale interaction with score ≤ −1 between two analysed acts, anchored to the units of the provisions its legal basis cites. Score ≤ −2 → high, −1 → medium.',
  },
  'pc2-ex-ante-status': {
    id: 'pc2-ex-ante-status',
    name: 'Ex-ante assumption under pressure / violated (curated, block-anchored)',
    stepId: 'ex-ante',
    scope: 'within-policy',
    defaultSeverity: 'medium',
    rule: 'A curated Assumption-Based-Planning audit reports the act’s load-bearing design assumption as under pressure or violated; anchored to the act’s assumption-bearing recitals and first target provision. Violated → high, under pressure → medium.',
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function djb2(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function evidenceOf(u: Pc2Unit): Pc2Evidence {
  return {
    policyId: u.policyId,
    unitId: u.id,
    path: u.path,
    quote: u.text.length > 320 ? u.text.slice(0, 317) + '…' : u.text,
  };
}

function makeFinding(
  ruleId: Pc2RuleId,
  key: string,
  units: Pc2Unit[],
  title: string,
  detail: string,
  severity?: Pc2Severity,
): Pc2Finding {
  const rule = PC2_RULES[ruleId];
  // One unit can trigger a rule several times (e.g. two conflicting values
  // in one sentence) — cite it once.
  const seen = new Set<string>();
  units = units.filter(u => (seen.has(u.id) ? false : (seen.add(u.id), true)));
  const policyIds = [...new Set(units.map(u => u.policyId))].sort();
  return {
    id: `pc2f-${djb2(`${ruleId}|${key}`)}`,
    ruleId,
    stepId: rule.stepId,
    severity: severity ?? rule.defaultSeverity,
    scope: rule.scope,
    policyIds,
    unitIds: units.map(u => u.id),
    title,
    detail,
    evidence: units.slice(0, 6).map(evidenceOf),
  };
}

const isArticlePath = (path: string) => /^Article\s+\d+/i.test(path);

/** "Article 4 — Union climate target" → "4" */
function articleNumber(path: string): string | null {
  const m = path.match(/^Article\s+(\d+[a-z]?)/i);
  return m ? m[1].toLowerCase() : null;
}

interface TargetRef {
  unit: Pc2Unit;
  value: number;
  family: string;
  year: number;
}

// ── Finding rules ──────────────────────────────────────────────────────────

function targetRefs(units: Pc2Unit[]): TargetRef[] {
  const out: TargetRef[] = [];
  for (const u of units) {
    for (const c of u.claims) {
      if (c.kind !== 'target' || c.unit !== '%' || c.value === undefined) continue;
      if (!c.family || c.family === 'other' || !c.year) continue;
      out.push({ unit: u, value: c.value, family: c.family, year: c.year });
    }
  }
  return out;
}

function internalTargetConflicts(unitsByPolicy: Map<string, Pc2Unit[]>): Pc2Finding[] {
  const findings: Pc2Finding[] = [];
  for (const [policyId, units] of unitsByPolicy) {
    const groups = new Map<string, TargetRef[]>();
    for (const t of targetRefs(units)) {
      const k = `${t.family}@${t.year}`;
      (groups.get(k) ?? groups.set(k, []).get(k)!).push(t);
    }
    for (const [k, refs] of groups) {
      const values = [...new Set(refs.map(r => r.value))];
      if (values.length < 2) continue;
      const evidenced = values.map(v => refs.find(r => r.value === v)!);
      findings.push(
        makeFinding(
          'pc2-internal-target-conflict',
          `${policyId}|${k}`,
          evidenced.map(r => r.unit),
          `Conflicting ${refs[0].family} targets for ${refs[0].year} inside the same act`,
          `Units of the same act state ${values.map(v => `${v}%`).join(' vs ')} for the ${refs[0].family} indicator family in ${refs[0].year}. Either the provisions address different scopes (then the scopes should be explicit) or the act is internally inconsistent.`,
        ),
      );
    }
  }
  return findings;
}

function crossTargetDivergence(unitsByPolicy: Map<string, Pc2Unit[]>): Pc2Finding[] {
  const groups = new Map<string, TargetRef[]>();
  for (const units of unitsByPolicy.values()) {
    for (const t of targetRefs(units)) {
      const k = `${t.family}@${t.year}`;
      (groups.get(k) ?? groups.set(k, []).get(k)!).push(t);
    }
  }
  const findings: Pc2Finding[] = [];
  for (const [k, refs] of groups) {
    const byPolicy = new Map<string, TargetRef>();
    for (const r of refs) if (!byPolicy.has(r.unit.policyId)) byPolicy.set(r.unit.policyId, r);
    if (byPolicy.size < 2) continue;
    const values = [...new Set([...byPolicy.values()].map(r => r.value))];
    if (values.length < 2) continue;
    const sample = [...byPolicy.values()];
    findings.push(
      makeFinding(
        'pc2-cross-target-divergence',
        k,
        sample.map(r => r.unit),
        `Divergent ${sample[0].family} targets for ${sample[0].year} across acts`,
        `${sample.length} acts quantify the ${sample[0].family} indicator family for ${sample[0].year} with different values (${sample.map(r => `${r.unit.policyId}: ${r.value}%`).join(' · ')}). Needs review — scopes may legitimately differ (e.g. economy-wide vs sectoral), but undeclared scope differences are exactly where cross-policy incoherence hides.`,
      ),
    );
  }
  return findings;
}

function articleGroups(units: Pc2Unit[]): Map<string, Pc2Unit[]> {
  const groups = new Map<string, Pc2Unit[]>();
  for (const u of units) {
    if (!isArticlePath(u.path)) continue;
    (groups.get(u.path) ?? groups.set(u.path, []).get(u.path)!).push(u);
  }
  return groups;
}

function withinPolicyStructureRules(unitsByPolicy: Map<string, Pc2Unit[]>): Pc2Finding[] {
  const findings: Pc2Finding[] = [];
  for (const [policyId, units] of unitsByPolicy) {
    const actMeans = units.filter(u =>
      u.claims.some(c => c.kind === 'instrument' || c.kind === 'financing'),
    ).length;
    const actMonitoring = units.filter(u => u.claims.some(c => c.kind === 'monitoring'));
    const actTargets = units.filter(u => u.claims.some(c => c.kind === 'target'));

    // pc2-unmeasurable-target — act level.
    if (actTargets.length > 0 && actMonitoring.length === 0) {
      findings.push(
        makeFinding(
          'pc2-unmeasurable-target',
          policyId,
          actTargets.slice(0, 4),
          `Targets without any MRV clause in the shipped text`,
          `The act states ${actTargets.length} target unit(s) but its shipped text contains no monitoring/reporting clause — policy outcomes cannot be measured from the act's own machinery. (If the shipped text is an excerpt, the MRV articles may simply not be included; the finding marks where the substrate ends.)`,
        ),
      );
    }

    for (const [path, group] of articleGroups(units)) {
      const targets = group.filter(u => u.claims.some(c => c.kind === 'target'));
      const means = group.filter(u =>
        u.claims.some(c => c.kind === 'instrument' || c.kind === 'financing'),
      );
      const deadlines = group.some(u => u.claims.some(c => c.kind === 'deadline'));

      // pc2-orphan-goal
      if (targets.length > 0 && means.length === 0) {
        findings.push(
          makeFinding(
            'pc2-orphan-goal',
            `${policyId}|${path}`,
            targets.slice(0, 3),
            `${path}: target stated without means in the article`,
            `The article quantifies a goal but contains no instrument or financing claim among its ${group.length} units. The act as a whole carries ${actMeans} means-bearing unit(s) — the goal may be served elsewhere, but the article itself does not bind goal to means.`,
          ),
        );
      }

      // pc2-undated-target
      if (!deadlines) {
        for (const u of targets) {
          const undated = u.claims.some(
            c => c.kind === 'target' && c.unit === '%' && !c.year,
          );
          if (undated) {
            findings.push(
              makeFinding(
                'pc2-undated-target',
                u.id,
                [u],
                `${path}: quantified target with no target year`,
                `The unit quantifies a target but names no year, and no deadline clause appears in the same article — pace against the target cannot be computed.`,
              ),
            );
          }
        }
      }

      // pc2-soft-target
      for (const u of targets) {
        if (u.blockKind === 'recital') continue;
        const strengths = u.claims
          .filter(c => c.kind === 'obligation')
          .map(c => c.strength ?? 0);
        if (strengths.length > 0 && Math.max(...strengths) <= 1) {
          findings.push(
            makeFinding(
              'pc2-soft-target',
              u.id,
              [u],
              `${path}: target carried only by weak deontics`,
              `The target unit's strongest deontic marker is "${u.claims.find(c => c.kind === 'obligation')?.markers?.[0]}" — an aspiration, not an obligation. Soft-law targets are the classic post-adoption softening surface.`,
            ),
          );
        }
      }

      // pc2-discretion-cluster
      const flexUnits = group.filter(u => u.claims.some(c => c.kind === 'flexibility'));
      const dense = group.length >= 5 && flexUnits.length / group.length >= 0.5;
      if (flexUnits.length >= 3 || dense) {
        const markers = [
          ...new Set(
            flexUnits.flatMap(u =>
              u.claims.filter(c => c.kind === 'flexibility').flatMap(c => c.markers ?? []),
            ),
          ),
        ];
        findings.push(
          makeFinding(
            'pc2-discretion-cluster',
            `${policyId}|${path}`,
            flexUnits.slice(0, 5),
            `${path}: discretion cluster (${flexUnits.length} of ${group.length} units)`,
            `Flexibility markers concentrate in this article: ${markers.join(', ')}. Each marker is a lawful drafting device; their clustering is where derogation-driven loopholes typically sit.`,
            flexUnits.length >= 5 ? 'medium' : 'low',
          ),
        );
      }
    }

    // pc2-dangling-crossref — act level.
    const dangling = new Map<string, Pc2Unit>();
    for (const u of units) {
      for (const c of u.claims) {
        if (c.kind === 'crossref' && c.resolvedPolicyId === null && c.refKey) {
          if (!dangling.has(c.refKey)) dangling.set(c.refKey, u);
        }
      }
    }
    if (dangling.size > 0) {
      const refs = [...dangling.keys()].sort().slice(0, 12);
      findings.push(
        makeFinding(
          'pc2-dangling-crossref',
          policyId,
          [...dangling.values()].slice(0, 4),
          `${dangling.size} cited act(s) outside the tracked corpus`,
          `Cited but untracked: ${refs.join(', ')}${dangling.size > 12 ? ' …' : ''}. These legal dependencies cannot be checked block-against-block until the acts are ingested.`,
        ),
      );
    }
  }
  return findings;
}

/** Anchor the curated act-level layer (interactions, ex-ante audits) down to
 *  the blocks that carry the cited provisions. */
function curatedAnchoredRules(unitsByPolicy: Map<string, Pc2Unit[]>): Pc2Finding[] {
  const findings: Pc2Finding[] = [];

  const articleUnitsFor = (policyId: string, artNums: string[]): Pc2Unit[] => {
    const units = unitsByPolicy.get(policyId) ?? [];
    const out: Pc2Unit[] = [];
    for (const num of artNums) {
      const hit = units.find(u => articleNumber(u.path) === num && u.claims.length > 0)
        ?? units.find(u => articleNumber(u.path) === num);
      if (hit) out.push(hit);
    }
    return out.slice(0, 2);
  };

  for (const gi of GOAL_INTERACTIONS) {
    if (gi.score > -1) continue;
    if (!unitsByPolicy.has(gi.a) && !unitsByPolicy.has(gi.b)) continue;
    const artNums = [...gi.legalBasis.matchAll(/Art(?:icle)?s?\.?\s*(\d+[a-z]?)/gi)].map(m =>
      m[1].toLowerCase(),
    );
    const anchors = [...articleUnitsFor(gi.a, artNums), ...articleUnitsFor(gi.b, artNums)];
    const scale = INTERACTION_SCALE[gi.score];
    const f = makeFinding(
      'pc2-curated-counteraction',
      gi.id,
      anchors,
      `${scale.name} (${gi.score}): ${gi.a} ↔ ${gi.b}`,
      `${gi.rationale} Mechanism: ${gi.mechanism}. Goals at stake — ${gi.a}: "${gi.goalA}" · ${gi.b}: "${gi.goalB}". Legal basis: ${gi.legalBasis}${anchors.length > 0 ? '' : ' (cited provisions not present in the shipped excerpts — anchor pending ingestion)'}.`,
      gi.score <= -2 ? 'high' : 'medium',
    );
    // Cross-policy identity comes from the interaction, not just the anchors.
    f.policyIds = [gi.a, gi.b].sort();
    f.tier = gi.tier;
    findings.push(f);
  }

  for (const [policyId, ex] of Object.entries(EX_ANTE_ASSESSMENTS)) {
    if (ex.status === 'valid') continue;
    const units = unitsByPolicy.get(policyId);
    if (!units) continue;
    const recitalAnchors = units.filter(u => u.stepIds.includes('ex-ante')).slice(0, 2);
    const targetAnchor = units.find(
      u => isArticlePath(u.path) && u.claims.some(c => c.kind === 'target'),
    );
    const anchors = [...recitalAnchors, ...(targetAnchor ? [targetAnchor] : [])];
    if (anchors.length === 0) continue;
    const f = makeFinding(
      'pc2-ex-ante-status',
      policyId,
      anchors,
      `Design assumption ${ex.status === 'violated' ? 'violated' : 'under pressure'} (${ex.designYear} design)`,
      `Assumption: ${ex.assumption} Signpost: ${ex.signpost} Violation criterion: ${ex.violationCriterion} Observation: ${ex.observation} Source: ${ex.source}`,
      ex.status === 'violated' ? 'high' : 'medium',
    );
    f.tier = ex.tier;
    findings.push(f);
  }
  return findings;
}

// ── Run assembly ───────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<Pc2Severity, number> = { high: 0, medium: 1, low: 2, info: 3 };

let cachedRun: Pc2Run | null = null;

export function runPolicyCoherence2(): Pc2Run {
  if (cachedRun) return cachedRun;

  const analysed = policies.filter(
    p => typeof p.full_text === 'string' && p.full_text.trim().length >= MIN_TEXT_LEN,
  );

  const unitsByPolicy = new Map<string, Pc2Unit[]>();
  const policyRows: Pc2PolicyAnalysis[] = [];
  let blockCount = 0;

  for (const p of analysed) {
    const blocks = deriveBlocks(p.id, p.full_text!);
    blockCount += blocks.length;
    const units = deriveUnits(p.id, blocks);
    for (const u of units) extractClaims(u);
    unitsByPolicy.set(p.id, units);

    const count = (pred: (u: Pc2Unit) => boolean) => units.filter(pred).length;
    const targetUnits = count(u => u.claims.some(c => c.kind === 'target'));
    const meansUnits = count(u =>
      u.claims.some(c => c.kind === 'instrument' || c.kind === 'financing'),
    );
    policyRows.push({
      policyId: p.id,
      shortTitle: p.short_title,
      documentType: p.document_type,
      celexNumber: p.celex_number,
      blockCount: blocks.length,
      unitCount: units.length,
      claimCount: units.reduce((n, u) => n + u.claims.length, 0),
      targetUnits,
      meansUnits,
      monitoringUnits: count(u => u.claims.some(c => c.kind === 'monitoring')),
      reviewUnits: count(u => u.claims.some(c => c.kind === 'review')),
      flexibilityUnits: count(u => u.claims.some(c => c.kind === 'flexibility')),
      crossrefUnits: count(u => u.claims.some(c => c.kind === 'crossref')),
      meansPerTarget: targetUnits > 0 ? meansUnits / targetUnits : null,
      flexDensity: units.length > 0 ? count(u => u.claims.some(c => c.kind === 'flexibility')) / units.length : 0,
      findingCount: 0,
    });
  }

  const findings = [
    ...internalTargetConflicts(unitsByPolicy),
    ...crossTargetDivergence(unitsByPolicy),
    ...withinPolicyStructureRules(unitsByPolicy),
    ...curatedAnchoredRules(unitsByPolicy),
  ].sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.ruleId.localeCompare(b.ruleId) ||
      a.id.localeCompare(b.id),
  );

  const findingsPerPolicy = new Map<string, number>();
  for (const f of findings) {
    for (const pid of f.policyIds) {
      findingsPerPolicy.set(pid, (findingsPerPolicy.get(pid) ?? 0) + 1);
    }
  }
  for (const row of policyRows) row.findingCount = findingsPerPolicy.get(row.policyId) ?? 0;

  const units = [...unitsByPolicy.values()].flat();
  const stats: Pc2Stats = {
    policyCount: analysed.length,
    blockCount,
    unitCount: units.length,
    claimCount: units.reduce((n, u) => n + u.claims.length, 0),
    findingCount: findings.length,
    bySeverity: { high: 0, medium: 0, low: 0, info: 0 },
    byRule: {},
    byStep: { 'ex-ante': 0, horizontal: 0, 'goals-means': 0, evaluation: 0 },
  };
  for (const f of findings) {
    stats.bySeverity[f.severity] += 1;
    stats.byRule[f.ruleId] = (stats.byRule[f.ruleId] ?? 0) + 1;
    stats.byStep[f.stepId] += 1;
  }

  const corpusHash = djb2(
    PC2_ENGINE_VERSION + analysed.map(p => `${p.id}:${p.full_text!.length}`).join('|'),
  );

  cachedRun = {
    engineVersion: PC2_ENGINE_VERSION,
    corpusHash,
    generatedAt: new Date().toISOString(),
    policies: policyRows.sort((a, b) => b.findingCount - a.findingCount),
    units,
    findings,
    stats,
  };
  return cachedRun;
}

/** ML-ready export: one JSON object per line — a run header, then every
 *  unit (with claims and step tags) and every finding; when the ML layer's
 *  result is passed, its pairs and clusters are appended too. Deterministic
 *  ids let downstream pipelines join units ↔ findings ↔ pairs ↔ policies. */
export function buildJsonlExport(run: Pc2Run, ml?: Pc2MlResult): string {
  const lines: string[] = [];
  lines.push(
    JSON.stringify({
      type: 'run',
      engineVersion: run.engineVersion,
      corpusHash: run.corpusHash,
      generatedAt: run.generatedAt,
      stats: run.stats,
      steps: Object.fromEntries(
        (Object.keys(run.stats.byStep) as CoherenceStepId[]).map(id => [
          id,
          COHERENCE_STEP_BY_ID[id].name,
        ]),
      ),
      rules: Object.values(PC2_RULES),
    }),
  );
  for (const p of run.policies) lines.push(JSON.stringify({ type: 'policy', ...p }));
  for (const u of run.units) lines.push(JSON.stringify({ type: 'unit', ...u }));
  for (const f of run.findings) lines.push(JSON.stringify({ type: 'finding', ...f }));
  if (ml) {
    lines.push(
      JSON.stringify({
        type: 'ml-run',
        mlVersion: ml.mlVersion,
        corpusHash: ml.corpusHash,
        params: ml.params,
        stats: ml.stats,
      }),
    );
    for (const p of ml.pairs) lines.push(JSON.stringify({ type: 'ml-pair', ...p }));
    for (const c of ml.clusters) lines.push(JSON.stringify({ type: 'ml-cluster', ...c }));
  }
  return lines.join('\n') + '\n';
}
