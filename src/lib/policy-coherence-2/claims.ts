// ---------------------------------------------------------------------------
// Policy Coherence 2.0 — rule-based claim extraction.
//
// Every extractor is a declared, deterministic rule over one sentence unit.
// No model calls, no scores without a stated rule: a claim either matches a
// printed pattern or it does not, so reviewers (and downstream ML) can audit
// every extraction against the text it quotes. Each claim keeps a verbatim
// excerpt; structured fields (value / year / family / strength / refKey) are
// what the finding rules in engine.ts operate on.
// ---------------------------------------------------------------------------

import { policies } from '@/data/policies';
import type {
  Pc2Claim,
  Pc2DeonticStrength,
  Pc2TargetFamily,
  Pc2Unit,
} from './types';
import type { CoherenceLensId } from '../content-analysis/policy-coherence';

const EXCERPT_LEN = 240;

function excerptAround(text: string, index: number, matchLen: number): string {
  if (text.length <= EXCERPT_LEN) return text;
  const pad = Math.max(0, Math.floor((EXCERPT_LEN - matchLen) / 2));
  const start = Math.max(0, index - pad);
  const slice = text.slice(start, start + EXCERPT_LEN);
  return (start > 0 ? '…' : '') + slice + (start + EXCERPT_LEN < text.length ? '…' : '');
}

// ── Cross-reference resolution ─────────────────────────────────────────────
// Normalised key: `<R|L|D>:<year>/<number>` (leading zeros stripped), built
// both from the corpus CELEX numbers and from in-text citations, so a
// citation resolves to a corpus policy id whenever the act is tracked.

function celexToRefKey(celex: string | null): string | null {
  if (!celex) return null;
  const m = celex.match(/^3(\d{4})([RLD])(\d{4,5})/);
  if (!m) return null;
  return `${m[2]}:${m[1]}/${String(parseInt(m[3], 10))}`;
}

const REFKEY_TO_POLICY: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const p of policies) {
    const key = celexToRefKey(p.celex_number);
    if (key && !map.has(key)) map.set(key, p.id);
  }
  return map;
})();

const PLAUSIBLE_YEAR = (n: number) => n >= 1952 && n <= 2099;

interface RefMatch {
  index: number;
  length: number;
  refKey: string;
  label: string;
}

/** All legal-act citations in a sentence, old and new numbering styles:
 *  "Regulation (EU) 2018/1999", "Regulation (EC) No 401/2009",
 *  "Directive 2003/87/EC", "Directive (EU) 2023/1791",
 *  "Decision (EU) 2015/1814", "Decision No 406/2009/EC". */
function findCrossrefs(text: string): RefMatch[] {
  const out: RefMatch[] = [];
  const push = (m: RegExpExecArray, type: 'R' | 'L' | 'D', a: number, b: number) => {
    // Disambiguate year-first (new style) vs number/year (old style).
    let year: number, num: number;
    if (PLAUSIBLE_YEAR(a) && !PLAUSIBLE_YEAR(b)) [year, num] = [a, b];
    else if (PLAUSIBLE_YEAR(b) && !PLAUSIBLE_YEAR(a)) [year, num] = [b, a];
    else if (PLAUSIBLE_YEAR(a)) [year, num] = [a, b];
    else return;
    out.push({
      index: m.index,
      length: m[0].length,
      refKey: `${type}:${year}/${num}`,
      label: m[0],
    });
  };
  let m: RegExpExecArray | null;
  const reReg = /Regulation\s*\((?:EU|EC|EEC)(?:,?\s*Euratom)?\)\s*(?:No\.?\s*)?(\d{1,4})\/(\d{1,4})/g;
  while ((m = reReg.exec(text)) !== null) push(m, 'R', parseInt(m[1], 10), parseInt(m[2], 10));
  const reDir = /Directive\s*(?:\((?:EU|EC)\)\s*)?(\d{4})\/(\d{1,4})(?:\/(?:EU|EC|EEC))?/g;
  while ((m = reDir.exec(text)) !== null) push(m, 'L', parseInt(m[1], 10), parseInt(m[2], 10));
  const reDec = /Decision\s*(?:\((?:EU|EC)\)\s*)?(?:No\.?\s*)?(\d{1,4})\/(\d{1,4})(?:\/(?:EU|EC|EEC))?/g;
  while ((m = reDec.exec(text)) !== null) push(m, 'D', parseInt(m[1], 10), parseInt(m[2], 10));
  return out;
}

// ── Target extraction ──────────────────────────────────────────────────────

const FAMILY_TESTS: Array<{ family: Pc2TargetFamily; re: RegExp }> = [
  { family: 'removals',   re: /\b(removals?|sinks?|LULUCF)\b/i },
  { family: 'renewables', re: /\brenewable/i },
  { family: 'efficiency', re: /\b(energy consumption|energy efficiency|final energy|primary energy|energy savings)\b/i },
  { family: 'vehicles',   re: /\b(zero-emission vehicle|new passenger car|light commercial vehicle|fleet|g\s?CO2\/km|tailpipe)\b/i },
  { family: 'neutrality', re: /\b(climate[- ]neutral|net[- ]zero|climate neutrality|negative emissions)\b/i },
  { family: 'ghg',        re: /\b(greenhouse gas|GHG|emission)/i },
];

function familyOf(text: string): Pc2TargetFamily {
  for (const t of FAMILY_TESTS) if (t.re.test(text)) return t.family;
  return 'other';
}

const TARGET_CUE = /\b(reduc|target|objective|achiev|increas|share|limit|contribut|cap\b|neutral)/i;
const YEAR_RE = /\b(19[5-9]\d|20\d{2})\b/g;
const BASELINE_RE = /\b(?:compared (?:to|with)|below|relative to|against)\s+(?:the year\s+)?(19[5-9]\d|20\d{2})(?:\s+levels)?|\b(19[5-9]\d|20\d{2})\s+levels\b/i;

/** Attribution verbs right before a percentage mark a DESCRIPTIVE share
 *  ("the energy sector contributes over 75% of emissions"), not a target.
 *  Without this guard, recital background facts masquerade as objectives. */
const DESCRIPTIVE_SHARE_RE =
  /(contribut\w*|accounts?\s+for|accounting\s+for|represent\w*|constitut\w*|responsible\s+for|amounts?\s+to|amounting\s+to|stood\s+at|stands?\s+at|equivalent\s+to|equal\s+to|cause[sd]?\b[^%]{0,20})\s*(?:over|more\s+than|approximately|around|about|nearly|some|up\s+to)?\s*$/i;

function extractTargets(text: string): Pc2Claim[] {
  const out: Pc2Claim[] = [];
  if (!TARGET_CUE.test(text)) return out;
  const family = familyOf(text);
  const baselineM = text.match(BASELINE_RE);
  const baselineYear = baselineM ? parseInt(baselineM[1] ?? baselineM[2], 10) : undefined;
  // Target year = latest non-baseline year mentioned in the sentence.
  const years = [...text.matchAll(YEAR_RE)]
    .map(m => parseInt(m[1], 10))
    .filter(y => y !== baselineYear && y >= 2000);
  const year = years.length > 0 ? Math.max(...years) : undefined;

  const pctRe = /(?:at least\s+|of\s+|by\s+|to\s+)?(?:−|-|minus\s+)?(\d{1,3}(?:\.\d+)?)\s?%/g;
  let m: RegExpExecArray | null;
  while ((m = pctRe.exec(text)) !== null) {
    const value = parseFloat(m[1]);
    if (!Number.isFinite(value) || value > 100) continue;
    const prefix = text.slice(Math.max(0, m.index - 70), m.index);
    if (DESCRIPTIVE_SHARE_RE.test(prefix)) continue;
    out.push({
      kind: 'target',
      excerpt: excerptAround(text, m.index, m[0].length),
      detail:
        `${value}% (${family})` +
        (year ? ` by ${year}` : '') +
        (baselineYear ? ` vs ${baselineYear}` : ''),
      value,
      unit: '%',
      year,
      baselineYear,
      family,
    });
  }
  // Unquantified neutrality commitment ("climate neutrality by 2050").
  if (out.length === 0 && /climate[- ]neutral|net[- ]zero|net zero/i.test(text) && year) {
    out.push({
      kind: 'target',
      excerpt: excerptAround(text, 0, Math.min(text.length, 80)),
      detail: `climate neutrality by ${year}`,
      unit: 'commitment',
      year,
      family: 'neutrality',
    });
  }
  return out;
}

// ── Other extractors ───────────────────────────────────────────────────────

const DEADLINE_RE =
  /\b(?:by|no later than|not later than|before|from|until|as of)\s+(?:(\d{1,2})\s+)?(January|February|March|April|May|June|July|August|September|October|November|December)?\s*(19[5-9]\d|20\d{2})\b/i;

function extractDeadline(text: string): Pc2Claim | null {
  const m = text.match(DEADLINE_RE);
  if (!m) return null;
  return {
    kind: 'deadline',
    excerpt: excerptAround(text, m.index ?? 0, m[0].length),
    detail: m[0].trim(),
    year: parseInt(m[3], 10),
  };
}

function deonticStrength(text: string): { strength: Pc2DeonticStrength; marker: string } {
  if (/\bshall\b/i.test(text)) return { strength: 3, marker: 'shall' };
  if (/\bmust\b/i.test(text)) return { strength: 3, marker: 'must' };
  if (/\bshould\b/i.test(text)) return { strength: 2, marker: 'should' };
  const weak = text.match(/\b(may|aims? to|aiming to|endeavour|seek to|strive)\b/i);
  if (weak) return { strength: 1, marker: weak[1].toLowerCase() };
  return { strength: 0, marker: '' };
}

const INSTRUMENT_MARKERS = [
  'allowance', 'auction', 'emissions trading', 'levy', 'tax', 'charge',
  'penalty', 'penalties', 'fine', 'permit', 'quota', 'obligation scheme',
  'support scheme', 'subsid', 'standard', 'limit value', 'ban', 'prohibit',
  'certificate', 'tender', 'contract for difference', 'labelling',
  'benchmark', 'phase-out', 'phase out', 'border adjustment',
];

const FINANCING_RE = /\b(?:EUR|€)\s?[\d,. ]+\s?(?:million|billion)?|\b(?:revenues?|budget|financial support|financing|funding|grants?|loans?|the Fund|Innovation Fund|Modernisation Fund|Social Climate Fund)\b/i;

const MONITORING_RE = /\b(report(?:ing)?|monitor(?:ing)?|verif(?:y|ied|ication)|inventory|inventories|submit(?:ted)?\s+(?:to the Commission|data)|data collection|track(?:ing)? progress|measurement)\b/i;

const REVIEW_RE = /\b(review(?:ed|s)?|assess(?:ment)?(?:\s+of\s+progress)?|evaluat(?:e|ion|ed)|revis(?:e|ion|ed)|where appropriate,? (?:accompanied by|make) (?:a |legislative )?proposals?)\b/i;

const FLEXIBILITY_MARKERS = [
  'derogat', 'exempt', 'where appropriate', 'where relevant', 'if appropriate',
  'as appropriate', 'where necessary', 'if necessary', 'to the extent possible',
  'as far as possible', 'where feasible', 'taking into account',
  'without prejudice', 'notwithstanding', 'unless', 'flexibility',
  'exceptional circumstances', 'force majeure', 'where justified', 'may postpone',
  'transitional period', 'opt-out', 'opt out',
];

function findMarkers(text: string, markers: string[]): string[] {
  const lower = text.toLowerCase();
  return markers.filter(mk => lower.includes(mk));
}

// ── Per-unit extraction + step tagging ─────────────────────────────────────

const EXANTE_RE = /\b(expected|expects?|project(?:ed|ions?)?|estimat(?:ed|es)|assum(?:es|ed|ption)|anticipat|scenario|trajectory|forecast|baseline)\b/i;

/** Mutates `unit` in place: fills `claims` and `stepIds`. */
export function extractClaims(unit: Pc2Unit): void {
  const { text } = unit;
  const claims: Pc2Claim[] = [];

  claims.push(...extractTargets(text));

  const deadline = extractDeadline(text);
  if (deadline) claims.push(deadline);

  const deontic = deonticStrength(text);
  if (deontic.strength > 0) {
    claims.push({
      kind: 'obligation',
      excerpt: excerptAround(text, Math.max(0, text.toLowerCase().indexOf(deontic.marker)), deontic.marker.length),
      detail: `deontic "${deontic.marker}" (strength ${deontic.strength}/3)`,
      strength: deontic.strength,
      markers: [deontic.marker],
    });
  }

  const instruments = findMarkers(text, INSTRUMENT_MARKERS);
  if (instruments.length > 0) {
    claims.push({
      kind: 'instrument',
      excerpt: excerptAround(text, 0, Math.min(text.length, 80)),
      detail: `delivery mechanism: ${instruments.join(', ')}`,
      markers: instruments,
    });
  }

  const fin = text.match(FINANCING_RE);
  if (fin) {
    claims.push({
      kind: 'financing',
      excerpt: excerptAround(text, fin.index ?? 0, fin[0].length),
      detail: `financing clause: "${fin[0].trim()}"`,
    });
  }

  const mon = text.match(MONITORING_RE);
  if (mon) {
    claims.push({
      kind: 'monitoring',
      excerpt: excerptAround(text, mon.index ?? 0, mon[0].length),
      detail: `MRV clause: "${mon[0].trim()}"`,
    });
  }

  const rev = text.match(REVIEW_RE);
  if (rev) {
    claims.push({
      kind: 'review',
      excerpt: excerptAround(text, rev.index ?? 0, rev[0].length),
      detail: `review clause: "${rev[0].trim()}"`,
    });
  }

  const flex = findMarkers(text, FLEXIBILITY_MARKERS);
  if (flex.length > 0) {
    claims.push({
      kind: 'flexibility',
      excerpt: excerptAround(text, 0, Math.min(text.length, 80)),
      detail: `discretion marker${flex.length > 1 ? 's' : ''}: ${flex.join(', ')}`,
      markers: flex,
    });
  }

  for (const ref of findCrossrefs(text)) {
    const resolved = REFKEY_TO_POLICY.get(ref.refKey) ?? null;
    if (resolved === unit.policyId) continue; // self-citation in own title/recitals
    claims.push({
      kind: 'crossref',
      excerpt: excerptAround(text, ref.index, ref.length),
      detail: `cites ${ref.label}${resolved ? ` → ${resolved}` : ' (outside corpus)'}`,
      refKey: ref.refKey,
      resolvedPolicyId: resolved,
    });
  }

  unit.claims = claims;

  const steps = new Set<CoherenceLensId>();
  // Lens 1 — overarching ambitions: recital units stating expectations.
  if (unit.blockKind === 'recital' && EXANTE_RE.test(text)) steps.add('ambitions');
  // Lens 3 — coherence check: cross-references to other acts.
  if (claims.some(c => c.kind === 'crossref')) steps.add('coherence');
  // Lens 2 — objectives & measures: targets (objectives) + instruments /
  // financing (measures).
  if (claims.some(c => c.kind === 'target' || c.kind === 'instrument' || c.kind === 'financing')) {
    steps.add('decomposition');
  }
  // Lens 4 — critical assessment: monitoring & review (the evaluation machinery).
  if (claims.some(c => c.kind === 'monitoring' || c.kind === 'review')) steps.add('critical');
  unit.stepIds = [...steps];
}
