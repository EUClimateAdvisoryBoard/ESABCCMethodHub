#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Merge, VALIDATE and classify policy-target candidates into the dataset the
// M·36 Policy Targets Register renders.
//
// Candidates come from two recall-oriented sources, unioned:
//   1. Multiple extraction agents (one JSON per policy in AGENT_DIR), each of
//      which reads a EUR-Lex text and pulls every target-like statement out of
//      the ENACTING TERMS (articles/annexes) — never the recitals/preamble.
//   2. The deterministic regex sweep (scripts/extract-policy-targets.mjs),
//      written to the same directory as _regex.json — a safety net so nothing
//      obvious is missed if an agent under-reads.
//
// This script is the trust boundary. Whatever an agent claims, we only keep a
// quote if it is a VERBATIM substring of the source act's enacting terms
// (whitespace-normalised match), and we then re-slice the EXACT original
// characters from the source — so the stored `target_text` is guaranteed to be
// real EUR-Lex text, not an agent paraphrase. Classification (obligation, type,
// timeline, climate-relevance) is re-derived deterministically for
// consistency; the softer label/indicator fields keep the agent's reading with
// a deterministic fallback.
//
// Run: `npm run build:policy-targets` (chains the regex sweep then this merge).
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { sectorsOf, climateOf, duplicatesOf } from './policy-targets-classify.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TEXTS_DIR = path.join(ROOT, 'public/data/policy-texts');
const POLICIES_TS = path.join(ROOT, 'src/data/policies.ts');
const AGENT_DIR = process.env.AGENT_TARGETS_DIR
  || path.join(ROOT, 'scripts/policy-targets-input');
const OVERRIDES_FILE = path.join(ROOT, 'scripts/policy-targets-overrides.json');
// v3 reviewer pass (Aug 2026): first/second-order labels + "likely not a
// target" flags, keyed by stable row id. Optional — absent or empty is a
// no-op (every row gets target_order: null, target_order_source: '',
// revise_flag: false, revise_reason: '').
const REVIEW_FILE = path.join(ROOT, 'scripts/policy-targets-review-2026-08.json');
// Optional map of policy_id -> { celex, date, note } recording that a policy's
// source document was replaced/consolidated since the last extraction pass.
// Absent or empty is a no-op (every row gets doc_replaced: '').
const REPLACED_FILE = path.join(ROOT, 'scripts/policy-targets-replaced.json');
const OUTPUT_FILE = path.join(ROOT, 'src/data/policy-targets.generated.ts');

const MIN_QUOTE = 30;
const MAX_QUOTE = 2000;

// ─── Policy metadata (scalar-parsed from the seed dataset) ──────────────────
function loadPolicies() {
  const src = fs.readFileSync(POLICIES_TS, 'utf8');
  const start = src.indexOf('export const policies');
  const connIdx = src.indexOf('export const connections');
  const region = src.slice(start, connIdx > 0 ? connIdx : undefined);
  const policies = new Map();
  const idRe = /\n {4}id: '([^']+)',/g;
  const anchors = [];
  let m;
  while ((m = idRe.exec(region))) anchors.push({ id: m[1], at: m.index });
  for (let i = 0; i < anchors.length; i++) {
    const chunk = region.slice(anchors[i].at, anchors[i + 1]?.at ?? region.length);
    const field = (name) => {
      const r = new RegExp(`\\n {4}${name}: '((?:[^'\\\\]|\\\\.)*)'`).exec(chunk);
      return r ? r[1].replace(/\\'/g, "'") : null;
    };
    const ftMatch = /full_text: `([\s\S]*?)`,\n/.exec(chunk);
    policies.set(anchors[i].id, {
      id: anchors[i].id,
      title: field('title'),
      short_title: field('short_title'),
      celex_number: field('celex_number'),
      document_type: field('document_type'),
      domain: field('domain'),
      eurlex_url: field('eurlex_url'),
      full_text: ftMatch ? ftMatch[1] : null,
    });
  }
  return policies;
}

const norm = (s) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

// Source body + its enacting-terms region (from the first "Article 1" onward,
// so recitals/preamble are excluded but articles AND annexes are kept).
function bodyFor(policy) {
  const txt = path.join(TEXTS_DIR, `${policy.id}.txt`);
  let text = null;
  if (fs.existsSync(txt) && fs.statSync(txt).size > 400) text = fs.readFileSync(txt, 'utf8');
  else if (policy.full_text && policy.full_text.length > 400) text = policy.full_text;
  if (!text) return null;
  const artIdx = text.search(/\n\s*Article\s+1\b/);
  const enacting = artIdx > 0 ? text.slice(artIdx) : text; // communications: whole body
  return { full: text, enactingNorm: norm(enacting), hasArticles: artIdx > 0 };
}

// ─── Deterministic classification ───────────────────────────────────────────
const MITIGATION = ['greenhouse gas', 'ghg', 'emission', 'net zero', 'net-zero', 'climate neutrality', 'climate-neutral', 'renewable', 'energy efficiency', 'energy saving', 'final energy consumption', 'primary energy', 'decarbon', 'carbon', 'co2', 'methane', 'fluorinated', 'removal', 'carbon sink', 'sink', 'zero-emission', 'zero emission', 'fossil fuel', 'low-carbon', 'low carbon', 'hydrogen', 'sustainable aviation fuel', 'synthetic aviation fuel', 'onshore power supply', 'climate change mitigation', 'paris agreement'];
const ADAPTATION = ['adaptation', 'adaptive capacity', 'resilience', 'resilient', 'climate risk', 'climate-related', 'restoration', 'restore', 'ecosystem', 'good ecological status', 'good environmental status', 'water reuse', 'drought', 'flood', 'vulnerability', 'early warning', 'nature restoration', 'favourable reference'];
const INDICATOR_VOCAB = [
  'net greenhouse gas emissions', 'greenhouse gas emissions', 'greenhouse gas emission reductions', 'CO2 emissions', 'CO2 equivalent',
  'final energy consumption', 'primary energy consumption', 'energy savings', 'energy efficiency',
  'share of energy from renewable sources', 'share of renewable energy', 'renewable energy', 'gross final consumption of energy',
  'net removals', 'removals', 'carbon sink', 'emission reductions', 'methane emissions', 'fluorinated greenhouse gases',
  'favourable reference area', 'areas under restoration', 'restoration measures', 'good ecological status', 'good environmental status',
  'recycled content', 'collection rate', 'recycling rate', 'installed capacity', 'sales share', 'sustainable aviation fuel',
  'nearly zero-energy buildings', 'zero-emission buildings', 'energy performance', 'building renovation',
];
const countHits = (lc, vocab) => vocab.reduce((n, w) => (lc.includes(w) ? n + 1 : n), 0);

const RE_PCT = /\b\d{1,3}(?:[.,]\d+)?\s?%/;
const RE_MAG = /\b\d[\d.,]*\s?(?:million tonnes|tonnes|mt\b|gigatonnes|gt\b|gw\b|gigawatt|twh|terawatt|kt\b|kg\b|billion|million|percentage points?)/i;
const RE_NUMthreshold = /\b(?:at least|no more than|not exceed|up to|minimum of|maximum of|by a factor of)\b/i;

function targetTypeOf(s) {
  if (RE_PCT.test(s) || RE_MAG.test(s) || (/\b\d/.test(s) && RE_NUMthreshold.test(s))) return 'quantitative';
  if (/\b(shall|should|ensure|achieve|maintain|reach|establish|improve|promote|reduce|increase|no deterioration|good status)\b/i.test(s)) return 'qualitative';
  return 'unspecified';
}

const RE_TIMELINE = [
  /\bfor the periods? from \d{4} to \d{4}[^.,;]*/i,
  /\bfrom \d{4} to \d{4}\b/i,
  /\bby (?:the end of )?(?:31 December )?\d{1,2}?\s?\w*\s?\d{4}\b/i,
  /\bby \d{1,2} \w+ \d{4}\b/i,
  /\bno later than [^.,;]+/i,
  /\bnot later than [^.,;]+/i,
  /\bby 20\d\d\b/i,
  /\bevery \w+ years?\b/i,
  /\bevery year\b/i,
  /\bannually\b/i,
  /\bby the end of \d{4}\b/i,
  /\bwithin \w+ (?:years?|months?) [^.,;]*/i,
  /\bas of \d{4}\b/i,
];
function timelineOf(s) {
  for (const re of RE_TIMELINE) {
    const m = re.exec(s);
    if (m) return m[0].trim();
  }
  return '';
}

function obligationOf(s, instrumentBinding) {
  // Soft law binds nobody: a communication/strategy row is voluntary even when
  // the quoted passage contains "shall" (it is usually quoting or proposing
  // binding text that lives elsewhere).
  if (!instrumentBinding) return 'voluntary';
  const lc = s.toLowerCase();
  // Best-efforts constructions defeat "shall": "shall endeavour / aim / strive"
  // is not a hard obligation…
  if (/\bshall\s+(endeavour|aim|strive)\b/.test(lc)) return 'voluntary';
  // …but a governing "shall"/"must" wins over an incidental "may"/"should"
  // elsewhere in the sentence.
  if (/\b(shall|must|are required to|is required to|are obliged to|mandatory|binding)\b/.test(lc)) return 'mandatory';
  if (/\b(should|may|aim to|aims to|endeavour|strive|are encouraged to|is encouraged to|voluntary|on a voluntary basis|as far as possible)\b/.test(lc)) return 'voluntary';
  return instrumentBinding ? 'mandatory' : 'voluntary';
}

// Climate relevance is decided by the MECHANISM the target works through
// (see scripts/policy-targets-classify.mjs), which also writes the argument
// stored alongside it. The keyword lists above remain in use for indicators.
function climateRelevanceOf(s) {
  const lc = s.toLowerCase();
  const mit = countHits(lc, MITIGATION);
  const ad = countHits(lc, ADAPTATION);
  if (mit && ad) return 'both';
  if (mit) return 'mitigation';
  if (ad) return 'adaptation';
  return 'none';
}

// Relevance lens (column-13 flag). The register now spans resilience/health/
// cohesion acquis added for their transition-relevant slices, so it also carries
// a lot of generic institutional/procedural or non-climate commitments. A row is
// "relevant" (shown in the default lens) when it materially bears on the climate/
// energy transition; peripheral rows default to false. This is only the
// deterministic DEFAULT — the per-act fact-check refines it via overrides
// (scripts/policy-targets-overrides.json, `set.relevant`).
function relevantDefault(r) {
  if (r.climate_relevance !== 'none') return true; // touches mitigation/adaptation
  // A non-climate row is surfaced only when it is a quantified, time-bound target/goal.
  if (r.target_type === 'quantitative' && r.timeline && (r.target_label === 'target' || r.target_label === 'goal')) return true;
  return false;
}

function labelOf(s, agentLabel) {
  const valid = ['target', 'goal', 'objective', 'commitment', 'other'];
  if (agentLabel && valid.includes(agentLabel)) return agentLabel;
  const lc = s.toLowerCase();
  if (/\btargets?\b/.test(lc)) return 'target';
  if (/\bcommitments?\b|\bundertak/.test(lc)) return 'commitment';
  if (/\bgoals?\b/.test(lc)) return 'goal';
  if (/\bobjectives?\b/.test(lc)) return 'objective';
  // No explicit label word: a quantified/dated obligation still functions as a
  // target, so tag it 'target' rather than the catch-all 'other'.
  if ((RE_PCT.test(s) || RE_MAG.test(s) || /\bby (?:the year )?20\d\d\b/i.test(s) || RE_NUMthreshold.test(s)) && /\b(shall|must|ensure|achieve|reach|not exceed|limited to|reduce|maintain)\b/i.test(s)) return 'target';
  return 'other';
}

function indicatorsOf(s, agentInd) {
  const found = new Set();
  const lc = s.toLowerCase();
  for (const v of INDICATOR_VOCAB) if (lc.includes(v.toLowerCase())) found.add(v);
  if (Array.isArray(agentInd)) for (const a of agentInd) if (typeof a === 'string' && a.trim() && a.length < 80) found.add(a.trim());
  return [...found].slice(0, 6);
}

const POLICY_AREA = {
  climate: 'Climate', energy: 'Energy', transport: 'Transport', industry: 'Industry',
  agriculture: 'Agriculture', environment: 'Environment', finance: 'Finance',
  circular_economy: 'Circular economy', 'cross-cutting': 'Cross-cutting', trade: 'Trade',
  digital: 'Digital', health: 'Health',
};

// ─── Verbatim validation: re-slice exact source characters ──────────────────
// Returns the exact original substring if the (normalised) quote is found in
// the (normalised) enacting terms; else null. We map the normalised match back
// to original offsets so stored text keeps the source's exact characters.
function verbatimSlice(body, quote) {
  const qn = norm(quote);
  if (qn.length < MIN_QUOTE) return null;
  const idx = body.enactingNorm.indexOf(qn);
  if (idx === -1) return null;
  // Recover exact original text: walk the original enacting region, matching
  // non-whitespace characters of the normalised quote.
  const artIdx = body.full.search(/\n\s*Article\s+1\b/);
  const original = artIdx > 0 ? body.full.slice(artIdx) : body.full;
  const target = qn.replace(/\s/g, '');
  let ti = 0, startPos = -1, i = 0;
  for (; i < original.length && ti < target.length; i++) {
    const c = original[i];
    if (/\s/.test(c) || c === ' ') continue;
    if (c === target[ti]) { if (ti === 0) startPos = i; ti++; }
    else { ti = 0; startPos = -1; if (c === target[0]) { startPos = i; ti = 1; } }
  }
  if (ti !== target.length || startPos < 0) return norm(quote); // fallback: normalised
  return norm(original.slice(startPos, i));
}

// Truncate at a word boundary (no mid-word cuts), appending an ellipsis when
// something was actually removed.
function truncateWords(s, max) {
  if (!s || s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const at = cut.lastIndexOf(' ');
  return (at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;—-]+$/, '') + '…';
}

// Stable, content-derived row id: survives re-ordering and regeneration, so
// per-user human confirmations (column 12, keyed by id in localStorage) keep
// pointing at the same target.
function stableId(policyId, exactText) {
  return 'tgt-' + crypto.createHash('sha1').update(policyId + '::' + norm(exactText).toLowerCase()).digest('hex').slice(0, 8);
}

// Reviewed corrections (scripts/policy-targets-overrides.json): the output of
// the 2026-07 per-act fact-check + verification pass. Each entry is keyed by
// the stable row id and either drops the row or overrides named fields after
// deterministic classification. See the "reason" field of each entry.
function loadOverrides() {
  if (!fs.existsSync(OVERRIDES_FILE)) return new Map();
  const list = JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf8'));
  const m = new Map();
  for (const o of list) m.set(o.id, o);
  return m;
}

// v3 reviewer workbook (scripts/policy-targets-review-2026-08.json): row-level
// first/second-order labels and "likely not a target" mark-up. Shape:
//   {"target_order": {"<id>": {"order": 1|2, "source": "human"|"ai", "rationale": "…"}},
//    "revise": {"<id>": "<reason>"}}
// Absent file or either map missing/empty is a no-op.
function loadReview() {
  if (!fs.existsSync(REVIEW_FILE)) return { target_order: {}, revise: {} };
  try {
    const j = JSON.parse(fs.readFileSync(REVIEW_FILE, 'utf8'));
    return { target_order: j.target_order || {}, revise: j.revise || {} };
  } catch (e) {
    console.warn(`  ! skipped ${path.basename(REVIEW_FILE)}: ${e.message}`);
    return { target_order: {}, revise: {} };
  }
}

// Documents replaced/consolidated since extraction (scripts/policy-targets-replaced.json):
// {"<policy_id>": {"celex": "…", "date": "…", "note": "…"}}. Absent file is a no-op.
function loadReplaced() {
  if (!fs.existsSync(REPLACED_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(REPLACED_FILE, 'utf8'));
  } catch (e) {
    console.warn(`  ! skipped ${path.basename(REPLACED_FILE)}: ${e.message}`);
    return {};
  }
}

// ─── Merge ──────────────────────────────────────────────────────────────────
function main() {
  const policies = loadPolicies();
  const overrides = loadOverrides();
  const review = loadReview();
  const replaced = loadReplaced();
  const sources = [];
  if (fs.existsSync(AGENT_DIR)) {
    // Agent files first, the regex safety-net (_regex.json) LAST, so that on a
    // duplicate the richer agent entry (proper label/indicators) is the one kept.
    const files = fs.readdirSync(AGENT_DIR).filter((f) => f.endsWith('.json'))
      .sort((a, b) => (a.startsWith('_') ? 1 : 0) - (b.startsWith('_') ? 1 : 0) || a.localeCompare(b));
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      try {
        const j = JSON.parse(fs.readFileSync(path.join(AGENT_DIR, f), 'utf8'));
        const arr = Array.isArray(j) ? j : [j];
        for (const entry of arr) {
          if (!entry || !entry.policy_id || !Array.isArray(entry.targets)) continue;
          for (const t of entry.targets) sources.push({ policy_id: entry.policy_id, ...t });
        }
      } catch (e) {
        console.warn(`  ! skipped ${f}: ${e.message}`);
      }
    }
  }

  const bodyCache = new Map();
  const getBody = (id) => {
    if (bodyCache.has(id)) return bodyCache.get(id);
    const p = policies.get(id);
    const b = p ? bodyFor(p) : null;
    bodyCache.set(id, b);
    return b;
  };

  let dropped = 0;
  const perPolicy = new Map();
  const seen = new Set();
  for (const c of sources) {
    const p = policies.get(c.policy_id);
    if (!p) { dropped++; continue; }
    const body = getBody(c.policy_id);
    if (!body) { dropped++; continue; }
    const quoteRaw = typeof c.quote === 'string' ? c.quote : '';
    if (quoteRaw.length < MIN_QUOTE || quoteRaw.length > MAX_QUOTE) { dropped++; continue; }
    const exact = verbatimSlice(body, quoteRaw);
    if (!exact) { dropped++; continue; } // not verbatim in enacting terms → reject
    // Dropped rows are discarded BEFORE the dedupe register, so a corrected
    // re-extraction that opens with the same words as the truncated row it
    // supersedes is not mistaken for a duplicate of it.
    const dropOv = overrides.get(stableId(p.id, exact));
    if (dropOv && dropOv.drop) continue;
    // 300 chars, not 120: grouped multi-point provisions can share a long
    // chapeau and only diverge in their sub-points (e.g. NRL Art 4(1) vs 5(1)).
    const dedupeKey = c.policy_id + '::' + norm(exact).slice(0, 300).toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const instrumentBinding = ['regulation', 'directive', 'decision'].includes(p.document_type);
    const rec = {
      id: stableId(p.id, exact),
      policy_id: p.id,
      policy_name: p.title,
      policy_short: p.short_title || p.title,
      document_type: p.document_type,
      policy_area: POLICY_AREA[p.domain] || (p.domain ? p.domain[0].toUpperCase() + p.domain.slice(1) : '—'),
      article: (typeof c.article === 'string' && c.article.trim()) ? truncateWords(c.article.trim(), 120) : '',
      target_text: exact,
      target_label: labelOf(exact, c.label),
      obligation: obligationOf(exact, instrumentBinding),
      target_type: targetTypeOf(exact),
      timeline: timelineOf(exact) || (typeof c.timeline === 'string' && /\d|every|annual/i.test(c.timeline) ? truncateWords(norm(c.timeline), 80) : ''),
      indicators: indicatorsOf(exact, c.indicators),
      climate_relevance: climateRelevanceOf(exact),
      celex_number: p.celex_number,
      eurlex_url: p.eurlex_url,
    };
    const ov = overrides.get(rec.id);
    if (ov) {
      if (ov.drop) continue;
      for (const [k, v] of Object.entries(ov.set || {})) rec[k] = v;
      rec.article = truncateWords(rec.article, 120);
      rec.timeline = truncateWords(rec.timeline, 80);
    }
    // Sectors/systems and the mechanism-based climate call are derived AFTER
    // field overrides (they read target_text and article), and a reviewer can
    // still override either explicitly.
    const sec = sectorsOf(rec);
    const clim = climateOf(rec);
    rec.sectors = ov?.set?.sectors ?? sec.sectors;
    rec.sector_evidence = sec.evidence;
    const ovClimate = ov?.set?.climate_relevance;
    rec.climate_relevance = ovClimate ?? clim.relevance;
    // Where a reviewer's call differs from the mechanism read (typically a
    // sub-point whose mechanism sits in the provision above it), the argument
    // says so rather than silently contradicting the column beside it.
    const CLIMATE_WORD = { mitigation: 'Mitigation', adaptation: 'Adaptation', both: 'Mitigation + adaptation', none: 'Neither' };
    rec.climate_argument = ov?.set?.climate_argument
      ?? (ovClimate && ovClimate !== clim.relevance
        ? `${CLIMATE_WORD[ovClimate]} — set in the fact-check review, which read the target in the context of the provision it sits in. On the quoted words alone: ${clim.argument[0].toLowerCase()}${clim.argument.slice(1)}`
        : clim.argument);
    // Relevance lens: computed AFTER field overrides so it reflects the corrected
    // climate_relevance/type/label, unless a reviewer set `relevant` explicitly.
    if (!(ov && ov.set && Object.prototype.hasOwnProperty.call(ov.set, 'relevant'))) {
      rec.relevant = relevantDefault(rec);
    }
    // v3 reviewer mark-up (scripts/policy-targets-review-2026-08.json) + the
    // replaced-document register (scripts/policy-targets-replaced.json).
    // An override's `set.target_order` wins over the review file when both exist.
    const rowOrder = review.target_order[rec.id];
    const validOrder = rowOrder && (rowOrder.order === 1 || rowOrder.order === 2) ? rowOrder.order : null;
    rec.target_order = (ov && ov.set && Object.prototype.hasOwnProperty.call(ov.set, 'target_order'))
      ? ov.set.target_order
      : validOrder;
    rec.target_order_source = rowOrder && (rowOrder.source === 'human' || rowOrder.source === 'ai') ? rowOrder.source : '';
    rec.revise_flag = Object.prototype.hasOwnProperty.call(review.revise, rec.id);
    rec.revise_reason = rec.revise_flag ? (review.revise[rec.id] || '') : '';
    rec.doc_replaced = (replaced[rec.policy_id] && replaced[rec.policy_id].note) || '';
    if (!perPolicy.has(p.id)) perPolicy.set(p.id, []);
    perPolicy.get(p.id).push(rec);
  }

  // Order per policy by article number, then number them.
  const artNum = (a) => {
    const m = /(\d+)/.exec(a || '');
    return m ? parseInt(m[1], 10) : 9999;
  };
  const out = [];
  const policyOrder = [...perPolicy.keys()].sort();
  for (const pid of policyOrder) {
    const list = perPolicy.get(pid).sort((a, b) => artNum(a.article) - artNum(b.article));
    list.forEach((r, i) => { r.target_number = i + 1; });
    out.push(...list);
  }

  // Cross-policy duplicate / near-duplicate target texts (a target restated by
  // another act, or a communication collating a target set in legislation).
  const titles = new Map([...policies.values()].map((p) => [p.id, [p.title, p.short_title].filter(Boolean)]));
  const dupes = duplicatesOf(out, titles);
  // A reviewer's explicit duplicate note (e.g. "target set by another act,
  // kept for cross-checking") wins over the similarity scan.
  out.forEach((r, i) => { r.duplicate_of = overrides.get(r.id)?.set?.duplicate_of ?? dupes[i]; });

  const tally = (key) => out.reduce((m, t) => ((m[t[key]] = (m[t[key]] || 0) + 1), m), {});

  const header = `/**
 * AUTO-GENERATED — do not edit by hand.
 * Produced by scripts/build-policy-targets.mjs (npm run build:policy-targets).
 *
 * Every \`target_text\` is a VERBATIM substring of the ENACTING TERMS (articles /
 * annexes, never the preamble/recitals) of the consolidated EUR-Lex text in
 * public/data/policy-texts/*.txt. Candidates were gathered by a fan-out of
 * extraction agents (recall-first) plus a regex safety net, then every quote
 * was validated as an exact source substring before being kept.
 *
 * Row ids are stable content hashes (policy_id + quote), so human-confirm
 * state keyed on them survives regeneration. Reviewed corrections from the
 * fact-check pass are applied from scripts/policy-targets-overrides.json.
 *
 * ${out.length} targets across ${policyOrder.length} acts.
 *   label:            ${JSON.stringify(tally('target_label'))}
 *   obligation:       ${JSON.stringify(tally('obligation'))}
 *   type:             ${JSON.stringify(tally('target_type'))}
 *   climate_relevance:${JSON.stringify(tally('climate_relevance'))}
 *   relevant (lens):  ${JSON.stringify(tally('relevant'))}
 *   target_order:     ${JSON.stringify(tally('target_order'))}
 *   revise_flag:      ${JSON.stringify(tally('revise_flag'))}
 *   (${dropped} candidates rejected as non-verbatim / out of scope)
 */
import type { RawPolicyTarget } from './policy-targets';

export const RAW_POLICY_TARGETS: RawPolicyTarget[] = ${JSON.stringify(out, null, 2)};
`;
  fs.writeFileSync(OUTPUT_FILE, header);
  console.log(`✓ ${out.length} targets across ${policyOrder.length} acts (${dropped} rejected) → ${path.relative(ROOT, OUTPUT_FILE)}`);
  console.log(`  label=${JSON.stringify(tally('target_label'))}`);
  console.log(`  obligation=${JSON.stringify(tally('obligation'))} type=${JSON.stringify(tally('target_type'))}`);
  console.log(`  climate=${JSON.stringify(tally('climate_relevance'))} relevant=${JSON.stringify(tally('relevant'))}`);
  console.log(`  target_order=${JSON.stringify(tally('target_order'))} revise_flag=${JSON.stringify(tally('revise_flag'))}`);
}

main();
