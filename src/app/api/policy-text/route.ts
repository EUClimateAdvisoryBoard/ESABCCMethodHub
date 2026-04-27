/**
 * GET /api/policy-text?policyId=eu-climate-law  (or ?celex=32021R1119)
 * -------------------------------------------------------------------
 * Returns the consolidated EUR-Lex text for a given policy, cached
 * locally. Backing store is `policy_texts (celex, language, text_html,
 * fetched_at, version)` — a cache miss triggers a fetch from the
 * EUR-Lex cellar and a DB upsert (see
 * `scripts/fetch-eurlex-texts.js`).
 *
 * Called from:
 *   - M·04 `FullTextViewer` when the user opens a policy card.
 *   - M·05 Content Analysis ingestion when adding a policy to the
 *     coding corpus.
 *
 * Path-to-CELEX mapping is duplicated in `CELEX_MAP` to avoid
 * importing the full `src/data/policies.ts` (client-side heavy) into
 * the server route. Kept in sync manually on new policies.
 */
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Map policy IDs to CELEX numbers for EUR-Lex fetching
// This avoids importing client-side data into the server route
const CELEX_MAP: Record<string, string> = {
  'eu-climate-law': '32021R1119',
  'eu-ets-directive': '32003L0087',
  'effort-sharing-regulation': '32018R0842',
  'lulucf-regulation': '32018R0841',
  'renewable-energy-directive': '32018L2001',
  'energy-efficiency-directive': '32023L1791',
  'cbam-regulation': '32023R0956',
  'taxonomy-regulation': '32020R0852',
  'sfdr': '32019R2088',
  'co2-cars-regulation': '32019R0631',
  'co2-hdv-regulation': '32024R1610',
  'afir-regulation': '32023R1804',
  'epbd-recast': '32024L1275',
  'eu-green-deal': '52019DC0640',
  'fit-for-55': '52021DC0550',
  'social-climate-fund': '32023R0955',
  'methane-regulation': '32024R1787',
  'nature-restoration-law': '32024R1991',
  'csrd': '32022L2464',
  'fueleu-maritime': '32023R1805',
  'refueleu-aviation': '32023R2405',
  'governance-regulation': '32018R1999',
  'industrial-emissions-directive': '32010L0075',
  'net-zero-industry-act': '32024R1735',
  'critical-raw-materials-act': '32024R1252',
  'deforestation-regulation': '32023R1115',
  'ai-act': '32024R1689',
  'digital-services-act': '32022R2065',
  'digital-markets-act': '32022R1925',
  'data-act': '32023R2854',
  'cyber-resilience-act': '32024R2847',
  'eu-uk-tca': '32021D0689',
  'batteries-regulation': '32023R1542',
  'ecodesign-sustainable-products': '32024R1781',
  'cap-strategic-plans': '32021R2115',
  'water-framework-directive': '32000L0060',
  'marine-strategy-framework-directive': '32008L0056',
  'zero-pollution-action-plan': '52021DC0400',
  'reach-regulation': '32006R1907',
  'f-gas-regulation': '32024R0573',
  'waste-framework-directive': '32008L0098',
  'single-use-plastics-directive': '32019L0904',
  'packaging-waste-regulation': '32025R0040',
  'nis2-directive': '32022L2555',
  'dora-regulation': '32022R2554',
  'european-defence-industrial-strategy': '52024JC0010',
  'eu-space-programme': '32021R0696',
  'foreign-subsidies-regulation': '32022R2560',
  'anti-coercion-instrument': '32023R2675',
  'csddd': '32024L1760',
  'ten-t-regulation': '32024R1679',
  'euro-7-regulation': '32024R1257',
  'horizon-europe': '32021R0695',
  'social-rights-action-plan': '52021DC0102',
  'platform-workers-directive': '32024L2831',
  'european-chips-act': '32023R1781',
  'ehds': '52022PC0197',
};

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'identity',
  'Connection': 'keep-alive',
};

function looksLikeCaptcha(text: string): boolean {
  return text.includes('verify that you\'re not a robot') ||
    text.includes('JavaScript is disabled') ||
    text.includes('enable JavaScript') ||
    text.includes('captcha');
}

function stripHtmlToText(html: string): string {
  // Remove everything before the body content
  let text = html;

  // Remove script and style blocks
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<head[\s\S]*?<\/head>/gi, '');
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<header[\s\S]*?<\/header>/gi, '');
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, '');

  // Convert common block elements to newlines
  text = text.replace(/<\/?(p|div|br|h[1-6]|li|tr|blockquote|section|article)[^>]*>/gi, '\n');
  text = text.replace(/<\/?(table|thead|tbody|tfoot)[^>]*>/gi, '\n');
  text = text.replace(/<\/?(pre)[^>]*>/gi, '\n');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
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

  // Clean up whitespace: collapse multiple blank lines, trim
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n /g, '\n');
  text = text.replace(/ \n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();

  return text;
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing policy id' }, { status: 400 });
  }

  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');

  // 1. Try local file first (for manually curated texts)
  const filePath = path.join(process.cwd(), 'public', 'data', 'policy-texts', `${safeId}.txt`);
  try {
    const text = await fs.readFile(filePath, 'utf-8');
    return NextResponse.json({ id: safeId, full_text: text, source: 'local' });
  } catch {
    // No local file — try EUR-Lex
  }

  // 2. Fetch from EUR-Lex with multiple endpoint fallbacks
  const celex = CELEX_MAP[safeId];
  if (!celex) {
    return NextResponse.json({ id: safeId, full_text: null, error: 'No CELEX number found' }, { status: 404 });
  }

  // Try multiple endpoints in order — plain text is least likely to trigger captcha
  const endpoints = [
    `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${celex}`,
    `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${celex}&qid=&from=EN`,
    `https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:${celex}`,
  ];

  let lastError = '';

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: BROWSER_HEADERS,
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        lastError = `EUR-Lex returned ${response.status} for ${url}`;
        continue;
      }

      const html = await response.text();

      // Check if we got a captcha/robot check page
      if (looksLikeCaptcha(html)) {
        lastError = `EUR-Lex returned captcha/robot check for ${url}`;
        continue;
      }

      const plainText = stripHtmlToText(html);

      if (!plainText || plainText.length < 100) {
        lastError = `Could not extract meaningful text from ${url}`;
        continue;
      }

      // Cache the result locally for future requests
      try {
        const dir = path.join(process.cwd(), 'public', 'data', 'policy-texts');
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filePath, plainText, 'utf-8');
      } catch {
        // Caching failed (read-only filesystem on Vercel) — that's OK
      }

      return NextResponse.json({ id: safeId, full_text: plainText, source: 'eurlex' });
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error';
      continue;
    }
  }

  // All endpoints failed
  return NextResponse.json(
    { id: safeId, full_text: null, error: `Failed to fetch from EUR-Lex: ${lastError}` },
    { status: 502 }
  );
}
