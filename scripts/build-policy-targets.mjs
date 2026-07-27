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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TEXTS_DIR = path.join(ROOT, 'public/data/policy-texts');
const POLICIES_TS = path.join(ROOT, 'src/data/policies.ts');
const AGENT_DIR = process.env.AGENT_TARGETS_DIR
  || path.join(ROOT, 'scripts/policy-targets-input');
const OVERRIDES_FILE = path.join(ROOT, 'scripts/policy-targets-overrides.json');
const OUTPUT_FILE = path.join(ROOT, 'src/data/policy-targets.generated.ts');

const MIN_QUOTE = 30;
const MAX_QUOTE = 900;

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

// Best-efforts phrasings that are not a hard obligation even after "shall".
// The single-verb forms are matched anywhere in the quote; the multi-word
// "make … efforts" family is only honoured when it is the GOVERNING verb (see
// obligationOf), because a binding headline target often mentions a secondary
// best-efforts duty further down the same provision (e.g. EED Art. 4(1):
// "shall collectively ensure a reduction of … 11,7 % … Member States shall make
// efforts to collectively contribute to the indicative … target").
const RE_BEST_EFFORTS_ANY = /\bshall\s+(endeavour|aim|strive|seek)\b/;
const RE_BEST_EFFORTS_GOVERNING = /^(?:make\s+(?:all\s+|every\s+|its\s+|their\s+)?(?:possible\s+|appropriate\s+|reasonable\s+|necessary\s+)?(?:effort|endeavour)s?\b|use\s+(?:its|their)\s+best\b)/;

function obligationOf(s, instrumentBinding) {
  // Soft law binds nobody: a communication/strategy row is voluntary even when
  // the quoted passage contains "shall" (it is usually quoting or proposing
  // binding text that lives elsewhere).
  if (!instrumentBinding) return 'voluntary';
  const lc = s.toLowerCase();
  // Best-efforts constructions defeat "shall": "shall endeavour / aim / strive /
  // seek", and a governing "shall make (all appropriate) efforts" — TEN-T
  // Art. 46(1), Art. 19(1) — are not hard obligations…
  if (RE_BEST_EFFORTS_ANY.test(lc)) return 'voluntary';
  const firstShall = /\bshall\s+([a-z’'\s]{0,40})/.exec(lc);
  if (firstShall && RE_BEST_EFFORTS_GOVERNING.test(firstShall[1])) return 'voluntary';
  // …but a governing "shall"/"must" wins over an incidental "may"/"should"
  // elsewhere in the sentence.
  if (/\b(shall|must|are required to|is required to|are obliged to|mandatory|binding)\b/.test(lc)) return 'mandatory';
  if (/\b(should|may|aim to|aims to|endeavour|strive|are encouraged to|is encouraged to|voluntary|on a voluntary basis|as far as possible)\b/.test(lc)) return 'voluntary';
  return instrumentBinding ? 'mandatory' : 'voluntary';
}

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

// Dedupe key. One row per target: the same provision quoted by an agent and by
// the regex net must collapse to a single row even when only the source's
// paragraph/point enumerator differs — the agents quote "1. Member States
// shall …" while the sentence-splitting regex net yields "Member States shall …".
// Both are verbatim, so the id hashes differ and both used to survive. Strip a
// leading enumerator ("1. ", "2.1 ", "(a) ", "(3) ") before comparing.
function dedupeKey(policyId, exactText) {
  const bare = norm(exactText)
    .replace(/^(?:[·•–—-]\s*)?(?:\d{1,3}(?:\.\d{1,3})?\.\s+|\(\d{1,3}[a-z]?\)\s+|\([a-z]\)\s+|\([ivxlc]+\)\s+)/i, '')
    .toLowerCase();
  return policyId + '::' + bare.slice(0, 120);
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

// ─── Merge ──────────────────────────────────────────────────────────────────
function main() {
  const policies = loadPolicies();
  const overrides = loadOverrides();
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
  const softLawForced = [];
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
    const key = dedupeKey(c.policy_id, exact);
    if (seen.has(key)) continue;
    seen.add(key);

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
      // Column 6 reports the obligation created by THE ACT THIS ROW BELONGS TO.
      // A communication/strategy creates none, so soft law stays voluntary even
      // when a reviewer read the passage as binding — in those cases the binding
      // force lives in the act being referenced, which the register carries as
      // its own rows. Enforced after overrides so the invariant cannot drift.
      if (!instrumentBinding && rec.obligation !== 'voluntary') {
        softLawForced.push(`${rec.id} ${p.id} (${p.document_type})`);
        rec.obligation = 'voluntary';
      }
    }
    // Relevance lens: computed AFTER field overrides so it reflects the corrected
    // climate_relevance/type/label, unless a reviewer set `relevant` explicitly.
    if (!(ov && ov.set && Object.prototype.hasOwnProperty.call(ov.set, 'relevant'))) {
      rec.relevant = relevantDefault(rec);
    }
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
  if (softLawForced.length) {
    console.warn(`  ! ${softLawForced.length} soft-law row(s) had an override to mandatory forced back to voluntary:`);
    for (const s of softLawForced) console.warn(`      ${s}`);
  }
}

main();
