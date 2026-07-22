#!/usr/bin/env node
// One-off helper: fetch consolidated EUR-Lex text for the policies added to the
// Policy Targets Register (M·36) and save each as public/data/policy-texts/<id>.txt.
//
// Source of record is the EU Publications Office "cellar" content-negotiation
// endpoint (https://publications.europa.eu/resource/celex/<CELEX>), which serves
// the authoritative document without the eur-lex.europa.eu anti-bot interstitial.
// Some older communications have no XHTML manifestation and answer with a
// "300 Multiple-Choice" list of DOC_n item URLs — we follow those and stitch the
// `act` streams together. The HTML is then stripped to text with the SAME
// algorithm as src/app/api/policy-text/route.ts so the stored text matches what
// the app would otherwise fetch live.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public/data/policy-texts');

// id → CELEX. Only ids WITHOUT an existing curated text file are fetched.
const TARGETS = {
  'eighth-environment-action-programme': '32022D0591',
  'competitiveness-compass': '52025DC0030',
  'eu-adaptation-strategy': '52021DC0082',
  'managing-climate-risks': '52024DC0091',
  'preparedness-union-strategy': '52025JC0130',
  'cross-border-health-threats': '32022R2371',
  'european-health-union': '52020DC0724',
  'mental-health-approach': '52023DC0298',
  'renovation-wave': '52020DC0662',
  'one-health-amr': '52017DC0339',
  'critical-entities-resilience': '32022L2557',
  'union-civil-protection-mechanism': '32013D1313',
  'osh-framework-directive': '31989L0391',
  'cultural-heritage-framework': '52014DC0477',
  'floods-directive': '32007L0060',
  'common-provisions-regulation': '32021R1060',
  'erdf-regulation': '32021R1058',
  'investeu-regulation': '32021R0523',
  'mff-regulation': '32020R2093',
  'water-resilience-strategy': '52025DC0280',
  'birds-directive': '32009L0147',
  'habitats-directive': '31992L0043',
  'ten-e-regulation': '32022R0869',
};

const HEADERS = {
  'Accept-Language': 'eng',
  'Accept': 'application/xhtml+xml, text/html',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

function stripHtmlToText(html) {
  let text = html;
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<head[\s\S]*?<\/head>/gi, '');
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<header[\s\S]*?<\/header>/gi, '');
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  text = text.replace(/<\/?(p|div|br|h[1-6]|li|tr|blockquote|section|article)[^>]*>/gi, '\n');
  text = text.replace(/<\/?(table|thead|tbody|tfoot)[^>]*>/gi, '\n');
  text = text.replace(/<\/?(pre)[^>]*>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#039;/g, "'");
  text = text.replace(/&rsquo;/g, "'");
  text = text.replace(/&lsquo;/g, "'");
  text = text.replace(/&rdquo;/g, '"');
  text = text.replace(/&ldquo;/g, '"');
  text = text.replace(/&mdash;/g, '—');
  text = text.replace(/&ndash;/g, '–');
  text = text.replace(/&hellip;/g, '...');
  text = text.replace(/&bull;/g, '•');
  text = text.replace(/&euro;/g, '€');
  text = text.replace(/&#\d+;/g, '');
  text = text.replace(/&[a-zA-Z]+;/g, '');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n /g, '\n');
  text = text.replace(/ \n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();
  return text;
}

async function fetchText(url, accept) {
  const res = await fetch(url, { headers: { ...HEADERS, ...(accept ? { Accept: accept } : {}) }, redirect: 'follow' });
  const body = await res.text();
  return { status: res.status, body };
}

// Parse the "300 Multiple-Choice" listing for the DOC_n item URLs whose stream
// is labelled `act` (the operative document + its annexes), in stream order.
function parseMultiChoice(html) {
  const items = [];
  const liRe = /<li title="item">[\s\S]*?<a href="([^"]+)">[\s\S]*?<li title="stream_name">([^<]*)<\/li>[\s\S]*?<li title="stream_label">([^<]*)<\/li>[\s\S]*?<li title="stream_order"[^>]*>(\d+)<\/li>/g;
  let m;
  while ((m = liRe.exec(html))) {
    items.push({ url: m[1], name: m[2], label: m[3].trim(), order: parseInt(m[4], 10) });
  }
  return items.filter((i) => i.label === 'act').sort((a, b) => a.order - b.order);
}

async function fetchDocument(celex) {
  const url = `https://publications.europa.eu/resource/celex/${celex}`;
  let { status, body } = await fetchText(url);
  // Direct XHTML manifestation: good.
  if (status === 200 && !/300 Multiple-Choice/.test(body) && body.length > 4000) {
    return stripHtmlToText(body);
  }
  // Multiple-choice: follow the `act` DOC_n items and stitch.
  if (/300 Multiple-Choice/.test(body)) {
    const items = parseMultiChoice(body);
    if (!items.length) throw new Error(`multi-choice with no act items (${celex})`);
    const parts = [];
    for (const it of items) {
      const r = await fetchText(it.url);
      if (r.status === 200 && r.body.length > 200) parts.push(stripHtmlToText(r.body));
    }
    if (!parts.length) throw new Error(`no act streams fetched (${celex})`);
    return parts.join('\n\n');
  }
  throw new Error(`unexpected response ${status} len=${body.length} (${celex})`);
}

async function main() {
  const only = process.argv.slice(2);
  const ids = only.length ? only : Object.keys(TARGETS);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const id of ids) {
    const celex = TARGETS[id];
    if (!celex) { console.warn(`  ? unknown id ${id}`); continue; }
    const out = path.join(OUT_DIR, `${id}.txt`);
    try {
      const text = await fetchDocument(celex);
      fs.writeFileSync(out, text);
      const words = text.split(/\s+/).length;
      console.log(`✓ ${id.padEnd(38)} ${celex}  ${words} words  → ${path.relative(ROOT, out)}`);
    } catch (e) {
      console.error(`✗ ${id.padEnd(38)} ${celex}  ${e.message}`);
    }
  }
}

main();
