// ---------------------------------------------------------------------------
// Policy Coherence 2.0 — machine-learning layer.
//
// An unsupervised statistical pass over the sentence-unit substrate that the
// rule-based engine cannot replicate: where engine.ts only finds what a
// declared pattern names, this layer DISCOVERS related provisions by learning
// a TF-IDF vector-space model from the corpus itself and then mining it:
//
//   1. Vectorise — tokenise every unit (legal boilerplate stop-listed),
//      learn document frequencies, build L2-normalised TF-IDF vectors.
//   2. Pair — candidate generation through an inverted index (units sharing
//      ≥ 2 informative terms), then cosine similarity over the candidates.
//   3. Classify — each high-similarity pair is typed by feature signals
//      computed from the units' extracted claims and token directionality:
//        · contradiction candidate — same indicator family/year with
//          different values, hard obligation vs derogation, or opposed
//          direction verbs on the same object;
//        · trade-off candidate — two acts pulling on the same contested
//          resource axis (land & forest carbon, electricity system, public
//          finance, industrial base, administrative capacity, households);
//        · duplication/overlap — near-duplicate normative content.
//   4. Cluster — greedy centroid clustering groups units into cross-policy
//      themes, exposing which acts crowd onto the same axis.
//
// Classical and fully deterministic (same corpus → same vectors, scores and
// ids): every score is recomputable, in keeping with the module's
// audit-the-rule-application ethos. No external model, no API calls.
// ---------------------------------------------------------------------------

import type {
  Pc2MlCluster,
  Pc2MlPair,
  Pc2MlResult,
  Pc2MlStats,
  Pc2Run,
  Pc2Unit,
} from './types';

export const PC2_ML_VERSION = 'pc2-ml-0.1.0';

/** Declared model parameters — printed in the UI and the export header. */
export const PC2_ML_PARAMS = {
  minUnitChars: 60,
  minTermLen: 3,
  maxTermDfShare: 0.3, // terms in > 30% of units carry no signal
  topTermsPerUnit: 30,
  indexMaxDf: 60,      // inverted-index posting cap for candidate generation
  minSharedTerms: 2,
  minCosine: 0.3,
  duplicationCosine: 0.7,
  clusterCosine: 0.45,
  minClusterSize: 4,
  maxPairsPerKind: 120,
  maxClusters: 40,
} as const;

// English function words + the legal boilerplate that saturates every act.
// Deontics ('shall', 'may') are stop-listed for SIMILARITY only — their
// signal enters through the claim features, not the vectors.
const STOPWORDS = new Set(
  (
    'the a an and or of to in for on by with as at from into under over be is are was were been ' +
    'being have has had do does did not no nor this that these those it its their there which who ' +
    'whom whose what when where how why such other than then they them he she his her we our you ' +
    'your i but if while also any all each per more most less least own same so too very can will ' +
    'would could may might must shall should out up down off only both between within without ' +
    'about after before during through where whereas thereof therein thereto hereby ' +
    'shall should union european commission parliament council member states state regulation ' +
    'regulations directive directives decision article articles paragraph paragraphs point points ' +
    'annex chapter section accordance pursuant referred laid down set article therefor including ' +
    'order ensure ensuring appropriate relevant necessary respect regard view first second third ' +
    'new amended amending text purposes purpose mean means meaning following applicable apply ' +
    'applies applied year years date entry force adopted adoption act acts level levels'
  ).split(/\s+/),
);

const RESOURCE_AXES: Record<string, string[]> = {
  'land & forest carbon': [
    'land', 'forest', 'forests', 'forestry', 'biomass', 'wood', 'woody', 'harvest',
    'harvested', 'soil', 'soils', 'peatland', 'wetlands', 'afforestation', 'deforestation',
  ],
  'electricity system': [
    'electricity', 'grid', 'grids', 'power', 'demand', 'storage', 'interconnection',
    'network', 'networks', 'flexibility',
  ],
  'hydrogen & fuels': [
    'hydrogen', 'fuel', 'fuels', 'biofuels', 'ammonia', 'synthetic', 'refuelling', 'rfnbo',
  ],
  'public finance': [
    'fund', 'funds', 'funding', 'revenues', 'budget', 'budgetary', 'financing',
    'auctioning', 'proceeds', 'expenditure',
  ],
  'industrial base & materials': [
    'industry', 'industrial', 'steel', 'cement', 'aluminium', 'fertilisers', 'raw',
    'materials', 'manufacturing', 'production',
  ],
  'administrative capacity': [
    'permitting', 'permits', 'authorisation', 'administrative', 'procedures', 'planning',
  ],
  'households & affordability': [
    'households', 'household', 'vulnerable', 'poverty', 'affordability', 'consumers',
    'prices', 'microenterprises',
  ],
};

const INCREASE_VERBS = new Set([
  'increase', 'increasing', 'increased', 'raise', 'raising', 'expand', 'expanding',
  'accelerate', 'accelerating', 'promote', 'promoting', 'boost', 'scale', 'maximise',
]);
const DECREASE_VERBS = new Set([
  'reduce', 'reducing', 'reduced', 'reduction', 'decrease', 'decreasing', 'limit',
  'limiting', 'restrict', 'restricting', 'curb', 'minimise', 'lower', 'lowering', 'cap',
]);

// ── Vector-space model ─────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(
      t =>
        t.length >= PC2_ML_PARAMS.minTermLen &&
        t.length <= 24 &&
        !STOPWORDS.has(t) &&
        !/^\d+$/.test(t),
    );
}

type SparseVec = Map<string, number>;

function cosine(a: SparseVec, b: SparseVec): number {
  // Vectors are L2-normalised, so the dot product IS the cosine.
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [t, w] of small) {
    const v = large.get(t);
    if (v !== undefined) dot += w * v;
  }
  return dot;
}

interface UnitVec {
  unit: Pc2Unit;
  tokens: string[];
  vec: SparseVec;
}

// Standard final provisions appear near-verbatim in every act; their mutual
// similarity is drafting convention, not coherence signal.
const BOILERPLATE_TEXT_RE =
  /bring into force the laws, regulations and administrative provisions|twentieth day following|binding in its entirety|shall enter into force|is addressed to the Member States|Done at (Brussels|Strasbourg)|^Having regard|^Acting in accordance|^After transmission/i;
const BOILERPLATE_PATH_RE = /Transposition|Entry into force|Addressees|Final provisions/i;

function buildVectors(units: Pc2Unit[]): { vecs: UnitVec[]; vocabulary: number } {
  const usable = units.filter(
    u =>
      u.blockKind !== 'heading' &&
      u.text.length >= PC2_ML_PARAMS.minUnitChars &&
      !BOILERPLATE_TEXT_RE.test(u.text) &&
      !BOILERPLATE_PATH_RE.test(u.path),
  );
  const tokenLists = usable.map(u => tokenize(u.text));
  const df = new Map<string, number>();
  for (const tokens of tokenLists) {
    for (const t of new Set(tokens)) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const n = usable.length;
  const maxDf = Math.max(2, Math.floor(n * PC2_ML_PARAMS.maxTermDfShare));
  const idf = (t: string) => Math.log(n / (df.get(t) ?? 1));

  const vecs: UnitVec[] = [];
  for (let i = 0; i < usable.length; i++) {
    const tf = new Map<string, number>();
    for (const t of tokenLists[i]) {
      const d = df.get(t) ?? 0;
      if (d < 2 || d > maxDf) continue;
      tf.set(t, (tf.get(t) ?? 0) + 1);
    }
    const weighted = [...tf.entries()]
      .map(([t, f]) => [t, (1 + Math.log(f)) * idf(t)] as [string, number])
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .slice(0, PC2_ML_PARAMS.topTermsPerUnit);
    const norm = Math.sqrt(weighted.reduce((s, [, w]) => s + w * w, 0));
    if (norm === 0 || weighted.length < PC2_ML_PARAMS.minSharedTerms) continue;
    vecs.push({
      unit: usable[i],
      tokens: tokenLists[i],
      vec: new Map(weighted.map(([t, w]) => [t, w / norm])),
    });
  }
  const vocabulary = [...df.values()].filter(d => d >= 2 && d <= maxDf).length;
  return { vecs, vocabulary };
}

// ── Pair mining ────────────────────────────────────────────────────────────

function djb2(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function quote(u: Pc2Unit): string {
  return u.text.length > 280 ? u.text.slice(0, 277) + '…' : u.text;
}

interface PairFeatures {
  signals: string[];
  contradiction: boolean;
  axis?: string;
  bonus: number;
}

function pairFeatures(a: UnitVec, b: UnitVec, shared: string[]): PairFeatures {
  const signals: string[] = [];
  let bonus = 0;
  let contradiction = false;

  // Numeric divergence: same indicator family + same year, different values.
  for (const ca of a.unit.claims) {
    if (ca.kind !== 'target' || ca.unit !== '%' || !ca.family || ca.family === 'other') continue;
    for (const cb of b.unit.claims) {
      if (cb.kind !== 'target' || cb.unit !== '%' || cb.family !== ca.family) continue;
      if (ca.year && cb.year && ca.year === cb.year && ca.value !== cb.value) {
        signals.push(
          `numeric divergence: ${ca.family} ${ca.value}% vs ${cb.value}% for ${ca.year}`,
        );
        contradiction = true;
        bonus += 0.25;
      }
    }
  }

  // Hard obligation on one side vs discretion on the other.
  const hard = (u: UnitVec) =>
    u.unit.claims.some(c => c.kind === 'obligation' && (c.strength ?? 0) >= 3);
  const flex = (u: UnitVec) => u.unit.claims.some(c => c.kind === 'flexibility');
  if ((hard(a) && flex(b)) || (hard(b) && flex(a))) {
    signals.push('deontic tension: hard obligation vs discretion/derogation clause');
    contradiction = true;
    bonus += 0.2;
  }

  // Opposed direction verbs over the same shared object terms.
  const aDir = { up: a.tokens.some(t => INCREASE_VERBS.has(t)), down: a.tokens.some(t => DECREASE_VERBS.has(t)) };
  const bDir = { up: b.tokens.some(t => INCREASE_VERBS.has(t)), down: b.tokens.some(t => DECREASE_VERBS.has(t)) };
  if ((aDir.up && !aDir.down && bDir.down && !bDir.up) || (aDir.down && !aDir.up && bDir.up && !bDir.down)) {
    signals.push(`directional tension on shared terms: ${shared.slice(0, 4).join(', ')}`);
    contradiction = true;
    bonus += 0.15;
  }

  // Contested-resource axis.
  for (const [axis, lexicon] of Object.entries(RESOURCE_AXES)) {
    if (shared.some(t => lexicon.includes(t))) {
      signals.push(`shared resource axis: ${axis}`);
      bonus += 0.1;
      return { signals, contradiction, axis, bonus };
    }
  }
  return { signals, contradiction, bonus };
}

function minePairs(vecs: UnitVec[]): { pairs: Pc2MlPair[]; candidatePairs: number; scoredPairs: number } {
  // Inverted index over informative terms (rare enough to be discriminative).
  const postings = new Map<string, number[]>();
  for (let i = 0; i < vecs.length; i++) {
    for (const t of vecs[i].vec.keys()) {
      (postings.get(t) ?? postings.set(t, []).get(t)!).push(i);
    }
  }
  const sharedCount = new Map<number, Map<number, number>>();
  for (const [, ids] of postings) {
    if (ids.length > PC2_ML_PARAMS.indexMaxDf) continue;
    for (let x = 0; x < ids.length; x++) {
      for (let y = x + 1; y < ids.length; y++) {
        const [i, j] = [ids[x], ids[y]];
        const row = sharedCount.get(i) ?? sharedCount.set(i, new Map()).get(i)!;
        row.set(j, (row.get(j) ?? 0) + 1);
      }
    }
  }

  let candidatePairs = 0;
  let scoredPairs = 0;
  const pairs: Pc2MlPair[] = [];
  for (const [i, row] of sharedCount) {
    for (const [j, nShared] of row) {
      if (nShared < PC2_ML_PARAMS.minSharedTerms) continue;
      candidatePairs += 1;
      const a = vecs[i];
      const b = vecs[j];
      // Same-block neighbours restate each other by construction — skip.
      if (a.unit.policyId === b.unit.policyId && a.unit.blockId === b.unit.blockId) continue;
      // Enumeration siblings — "(a)" vs "(b)" items of the same article —
      // are parallel scopes by design, not tensions; the rule-based engine
      // already compares their values where comparable.
      if (
        a.unit.policyId === b.unit.policyId &&
        a.unit.path === b.unit.path &&
        /^\([a-z0-9]+\)/i.test(a.unit.text) &&
        /^\([a-z0-9]+\)/i.test(b.unit.text)
      ) {
        continue;
      }
      const cos = cosine(a.vec, b.vec);
      if (cos < PC2_ML_PARAMS.minCosine) continue;
      scoredPairs += 1;

      const shared = [...a.vec.keys()].filter(t => b.vec.has(t)).sort();
      const feats = pairFeatures(a, b, shared);
      const crossPolicy = a.unit.policyId !== b.unit.policyId;

      let kind: Pc2MlPair['kind'] | null = null;
      if (feats.contradiction) kind = 'contradiction-candidate';
      else if (feats.axis && crossPolicy) kind = 'tradeoff-candidate';
      else if (cos >= PC2_ML_PARAMS.duplicationCosine && crossPolicy) kind = 'duplication-overlap';
      if (!kind) continue;

      pairs.push({
        id: `pc2ml-${djb2(`${a.unit.id}|${b.unit.id}`)}`,
        kind,
        score: Math.min(1, cos + feats.bonus),
        cosine: Math.round(cos * 1000) / 1000,
        scope: crossPolicy ? 'cross-policy' : 'within-policy',
        policyA: a.unit.policyId,
        policyB: b.unit.policyId,
        unitA: a.unit.id,
        unitB: b.unit.id,
        pathA: a.unit.path,
        pathB: b.unit.path,
        quoteA: quote(a.unit),
        quoteB: quote(b.unit),
        sharedTerms: shared.slice(0, 8),
        signals:
          feats.signals.length > 0
            ? feats.signals
            : [`high lexical similarity (cosine ${Math.round(cos * 100) / 100})`],
        axis: feats.axis,
      });
    }
  }

  // Keep the strongest of each kind, deterministically ordered.
  const byKind = (k: Pc2MlPair['kind']) =>
    pairs
      .filter(p => p.kind === k)
      .sort((x, y) => y.score - x.score || (x.id < y.id ? -1 : 1))
      .slice(0, PC2_ML_PARAMS.maxPairsPerKind);
  const kept = [
    ...byKind('contradiction-candidate'),
    ...byKind('tradeoff-candidate'),
    ...byKind('duplication-overlap'),
  ];
  return { pairs: kept, candidatePairs, scoredPairs };
}

// ── Theme clustering ───────────────────────────────────────────────────────

function clusterUnits(vecs: UnitVec[]): Pc2MlCluster[] {
  interface C {
    centroid: SparseVec;
    members: UnitVec[];
  }
  const clusters: C[] = [];
  // Deterministic order: corpus order as built.
  for (const v of vecs) {
    let best: C | null = null;
    let bestSim: number = PC2_ML_PARAMS.clusterCosine;
    for (const c of clusters) {
      const sim = cosine(v.vec, c.centroid);
      if (sim > bestSim) {
        best = c;
        bestSim = sim;
      }
    }
    if (best) {
      best.members.push(v);
      // Running-mean centroid, re-normalised.
      const k = best.members.length;
      for (const [t, w] of v.vec) best.centroid.set(t, ((best.centroid.get(t) ?? 0) * (k - 1) + w) / k);
      for (const [t, w] of best.centroid) if (!v.vec.has(t)) best.centroid.set(t, (w * (k - 1)) / k);
      const norm = Math.sqrt([...best.centroid.values()].reduce((s, w) => s + w * w, 0));
      if (norm > 0) for (const [t, w] of best.centroid) best.centroid.set(t, w / norm);
    } else {
      clusters.push({ centroid: new Map(v.vec), members: [v] });
    }
  }

  return clusters
    .filter(c => c.members.length >= PC2_ML_PARAMS.minClusterSize)
    .map(c => {
      const policyIds = [...new Set(c.members.map(m => m.unit.policyId))].sort();
      const top = [...c.centroid.entries()]
        .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
        .slice(0, 5)
        .map(([t]) => t);
      let axis: string | undefined;
      for (const [name, lexicon] of Object.entries(RESOURCE_AXES)) {
        if (top.some(t => lexicon.includes(t))) {
          axis = name;
          break;
        }
      }
      return {
        id: `pc2mlc-${djb2(c.members.map(m => m.unit.id).join('|'))}`,
        label: top.join(' · '),
        size: c.members.length,
        policyIds,
        unitIds: c.members.map(m => m.unit.id),
        axis,
      };
    })
    .filter(c => c.policyIds.length >= 2)
    .sort((a, b) => b.size - a.size || (a.id < b.id ? -1 : 1))
    .slice(0, PC2_ML_PARAMS.maxClusters);
}

// ── Entry point ────────────────────────────────────────────────────────────

let cached: Pc2MlResult | null = null;

export function runMlAnalysis(run: Pc2Run): Pc2MlResult {
  if (cached && cached.corpusHash === run.corpusHash) return cached;

  const { vecs, vocabulary } = buildVectors(run.units);
  const { pairs, candidatePairs, scoredPairs } = minePairs(vecs);
  const clusters = clusterUnits(vecs);

  const stats: Pc2MlStats = {
    unitVectors: vecs.length,
    vocabulary,
    candidatePairs,
    scoredPairs,
    contradictionCandidates: pairs.filter(p => p.kind === 'contradiction-candidate').length,
    tradeoffCandidates: pairs.filter(p => p.kind === 'tradeoff-candidate').length,
    duplicationOverlaps: pairs.filter(p => p.kind === 'duplication-overlap').length,
    clusters: clusters.length,
  };

  cached = {
    mlVersion: PC2_ML_VERSION,
    corpusHash: run.corpusHash,
    generatedAt: new Date().toISOString(),
    params: { ...PC2_ML_PARAMS },
    pairs,
    clusters,
    stats,
  };
  return cached;
}
