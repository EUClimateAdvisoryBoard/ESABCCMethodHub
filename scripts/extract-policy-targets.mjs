#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Regex safety-net for the Policy Targets Register.
//
// This is the deterministic complement to the extraction agents: it sweeps the
// ENACTING TERMS (articles / annexes — never the recitals/preamble) of every
// tracked act and emits every quantified / normative target-like sentence as a
// candidate. Candidates land in scripts/policy-targets-input/_regex.json in the
// same shape the agents write, and scripts/build-policy-targets.mjs unions the
// two sources, validates each quote as a verbatim source substring, dedupes and
// classifies. Recall-first by design — humans prune in the UI.
//
// Run via `npm run build:policy-targets` (which runs this, then the merge).
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TEXTS_DIR = path.join(ROOT, 'public/data/policy-texts');
const POLICIES_TS = path.join(ROOT, 'src/data/policies.ts');
const OUT_DIR = path.join(ROOT, 'scripts/policy-targets-input');
const OUT_FILE = path.join(OUT_DIR, '_regex.json');

const MIN_SENTENCE = 35;
const MAX_SENTENCE = 900;

function loadPolicies() {
  const src = fs.readFileSync(POLICIES_TS, 'utf8');
  const start = src.indexOf('export const policies');
  const connIdx = src.indexOf('export const connections');
  const region = src.slice(start, connIdx > 0 ? connIdx : undefined);
  const policies = [];
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
    policies.push({ id: anchors[i].id, domain: field('domain'), full_text: ftMatch ? ftMatch[1] : null });
  }
  return policies;
}

function bodyFor(policy) {
  const txt = path.join(TEXTS_DIR, `${policy.id}.txt`);
  if (fs.existsSync(txt) && fs.statSync(txt).size > 400) return fs.readFileSync(txt, 'utf8');
  if (policy.full_text && policy.full_text.length > 400) return policy.full_text;
  return null;
}

// Walk enacting terms only, tracking the current Article reference.
function articleBlocks(text) {
  const artIdx = text.search(/\n\s*Article\s+1\b/);
  const region = artIdx > 0 ? text : text; // communications: whole body
  const lines = (artIdx > 0 ? text.slice(artIdx) : text).split('\n');
  const blocks = [];
  let ref = artIdx > 0 ? '' : 'Body';
  let titlePending = false;
  let buf = [];
  const flush = () => {
    const para = buf.join(' ').replace(/[\s ]+/g, ' ').trim();
    buf = [];
    if (para.length >= MIN_SENTENCE) blocks.push({ ref, text: para });
  };
  for (const raw of lines) {
    const line = raw.replace(/ /g, ' ').trim();
    if (!line) { flush(); continue; }
    const art = /^Article\s+(\d{1,3}[a-z]?)\b/.exec(line);
    if (art) { flush(); ref = `Article ${art[1]}`; titlePending = true; continue; }
    if (titlePending) { if (line.length < 120 && !/[.:]$/.test(line)) ref = `${ref} — ${line}`; titlePending = false; if (line.length < 120) continue; }
    if (/^Done at /.test(line)) { flush(); ref = 'Annex'; continue; }
    if (/^ANNEX\b/.test(line)) { flush(); ref = line.slice(0, 40); continue; }
    buf.push(line);
  }
  flush();
  return blocks;
}

function sentences(paragraph) {
  const parts = paragraph.replace(/([.;:])\s+(?=[A-Z(‘“])/g, '$1').split('').map((s) => s.trim()).filter(Boolean);
  const merged = [];
  for (const s of parts) {
    if (merged.length && (s.length < MIN_SENTENCE || /^[a-z(]/.test(s))) merged[merged.length - 1] += ' ' + s;
    else merged.push(s);
  }
  return merged;
}

const CLIMATE = ['greenhouse gas', 'ghg', 'emission', 'renewable', 'energy efficiency', 'energy saving', 'decarbon', 'carbon', 'co2', 'methane', 'fluorinated', 'removal', 'sink', 'climate', 'net zero', 'net-zero', 'climate neutrality', 'adaptation', 'resilience', 'restoration', 'ecosystem', 'energy consumption', 'renewable energy', 'zero-emission', 'zero emission', 'good ecological status', 'good environmental status', 'recycl', 'circular'];
const RE_PCT = /\b\d{1,3}(?:[.,]\d+)?\s?%/;
const RE_YEAR = /\bby (?:the year )?20\d\d\b|\b20[2-6]\d\b/;
const RE_MAG = /\b\d[\d.,]*\s?(million tonnes|tonnes|mt\b|gw\b|twh|kt\b|billion|million|percentage points?)/i;
const RE_NEUTRAL = /\b(net[-\s]?zero|climate[-\s]?neutral(?:ity)?|carbon[-\s]?neutral)\b/i;
const RE_TARGETY = /\b(target|objective|goal|shall|shall ensure|shall aim|binding|at least|no later than|not exceed|commitment|obligation|reduce|reduction|increase|achieve|reach|maintain|share of|limited to|no deterioration|good status)\b/i;

function isCandidate(s, domain) {
  const lc = s.toLowerCase();
  if (s.length < MIN_SENTENCE || s.length > MAX_SENTENCE) return false;
  // The regex net is a deterministic SUPPLEMENT to the agents — keep it tight so
  // it surfaces the unambiguous quantified/dated targets and leaves the softer,
  // context-dependent ones to the agents (which read for meaning).
  const hasClimate = CLIMATE.some((w) => lc.includes(w));
  // "net-zero technology/industry/strategic project" is the NZIA/CRMA defined
  // term, not a neutrality target — only count neutrality as a real aim.
  const neutralAim = /\b(climate[-\s]?neutral(?:ity)?|carbon[-\s]?neutral|net[-\s]?zero\s+(?:emissions|greenhouse gas|economy|by\s+20\d\d)|achieve\s+net[-\s]?zero)\b/i.test(s);
  const quantified = RE_PCT.test(s) || RE_MAG.test(s) || neutralAim || /\bby (?:the year )?20[2-6]\d\b/.test(s);
  if (!quantified) return false;
  if (!RE_TARGETY.test(s)) return false;
  // Climate relevance: keyword in the sentence, or a hard number in a core
  // climate/energy/transport act.
  if (!hasClimate && !['energy', 'transport', 'climate'].includes(domain)) return false;
  // Drop obvious machinery even when quantified/dated.
  if (/\b(shall|should)\s+(report|assess|review|examine|submit|publish|notify|lay down|make an inventory|provide|support|facilitate|coordinate|ensure access|give access|be responsible|designate|establish a single|set up)/i.test(s) && !RE_PCT.test(s) && !RE_NEUTRAL.test(s)) return false;
  // Drop definitions ("'X' means …"), scope and purpose clauses — not targets.
  if (/[’'"”]\s*means\b|^means\b|\bmeans\b.{0,40}(construction|conversion|any |a project|a facility|the process)/i.test(s)) return false;
  if (/\b(this (Regulation|Directive|Decision) (applies to|does not apply|shall not apply)|for the purposes of this|scope of this)\b/i.test(s) && !RE_PCT.test(s)) return false;
  return true;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const policies = loadPolicies();
  const out = [];
  for (const p of policies) {
    const body = bodyFor(p);
    if (!body) continue;
    const seen = new Set();
    const targets = [];
    for (const block of articleBlocks(body)) {
      if (!/^(Article|Annex|Body)/.test(block.ref)) continue;
      for (const s of sentences(block.text)) {
        if (!isCandidate(s, p.domain)) continue;
        const key = s.slice(0, 70).toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        targets.push({ quote: s, article: block.ref });
      }
    }
    if (targets.length) out.push({ policy_id: p.id, source: 'regex', targets });
  }
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  const n = out.reduce((s, p) => s + p.targets.length, 0);
  console.log(`✓ regex safety-net: ${n} candidates across ${out.length} acts → ${path.relative(ROOT, OUT_FILE)}`);
}

main();
