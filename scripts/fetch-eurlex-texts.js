#!/usr/bin/env node
/**
 * Fetch full legislative texts from EUR-Lex for all policies.
 *
 * Run locally: node scripts/fetch-eurlex-texts.js
 * Run via GitHub Actions: .github/workflows/daily-updates.yml
 *
 * Saves plain text files to public/data/policy-texts/{policy-id}.txt
 * These are loaded by the /api/policy-text endpoint.
 *
 * EUR-Lex texts are public domain under EU law (Decision 2011/833/EU).
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data', 'policy-texts');

// All policies with their CELEX numbers
const POLICIES = [
  { id: 'eu-climate-law', celex: '32021R1119', name: 'European Climate Law' },
  { id: 'eu-ets-directive', celex: '32003L0087', name: 'EU ETS Directive' },
  { id: 'effort-sharing-regulation', celex: '32018R0842', name: 'Effort Sharing Regulation' },
  { id: 'lulucf-regulation', celex: '32018R0841', name: 'LULUCF Regulation' },
  { id: 'renewable-energy-directive', celex: '32018L2001', name: 'Renewable Energy Directive' },
  { id: 'energy-efficiency-directive', celex: '32023L1791', name: 'Energy Efficiency Directive' },
  { id: 'cbam-regulation', celex: '32023R0956', name: 'CBAM Regulation' },
  { id: 'taxonomy-regulation', celex: '32020R0852', name: 'EU Taxonomy Regulation' },
  { id: 'sfdr', celex: '32019R2088', name: 'SFDR' },
  { id: 'co2-cars-regulation', celex: '32019R0631', name: 'CO2 Cars Regulation' },
  { id: 'afir-regulation', celex: '32023R1804', name: 'AFIR Regulation' },
  { id: 'epbd-recast', celex: '32024L1275', name: 'EPBD Recast' },
  { id: 'eu-green-deal', celex: '52019DC0640', name: 'European Green Deal' },
  { id: 'fit-for-55', celex: '52021DC0550', name: 'Fit for 55 Package' },
  { id: 'social-climate-fund', celex: '32023R0955', name: 'Social Climate Fund' },
  { id: 'methane-regulation', celex: '32024R1787', name: 'Methane Regulation' },
  { id: 'nature-restoration-law', celex: '32024R1991', name: 'Nature Restoration Law' },
  { id: 'csrd', celex: '32022L2464', name: 'CSRD' },
  { id: 'fueleu-maritime', celex: '32023R1805', name: 'FuelEU Maritime' },
  { id: 'refueleu-aviation', celex: '32023R2405', name: 'ReFuelEU Aviation' },
  { id: 'governance-regulation', celex: '32018R1999', name: 'Governance Regulation' },
  { id: 'industrial-emissions-directive', celex: '32010L0075', name: 'Industrial Emissions Directive' },
  { id: 'net-zero-industry-act', celex: '32024R1735', name: 'Net-Zero Industry Act' },
  { id: 'critical-raw-materials-act', celex: '32024R1252', name: 'Critical Raw Materials Act' },
  { id: 'deforestation-regulation', celex: '32023R1115', name: 'Deforestation Regulation' },
  { id: 'ai-act', celex: '32024R1689', name: 'AI Act' },
  { id: 'digital-services-act', celex: '32022R2065', name: 'Digital Services Act' },
  { id: 'digital-markets-act', celex: '32022R1925', name: 'Digital Markets Act' },
  { id: 'data-act', celex: '32023R2854', name: 'Data Act' },
  { id: 'batteries-regulation', celex: '32023R1542', name: 'Batteries Regulation' },
  { id: 'f-gas-regulation', celex: '32024R0573', name: 'F-Gas Regulation' },
  { id: 'csddd', celex: '32024L1760', name: 'CSDDD' },
  { id: 'cyber-resilience-act', celex: '32024R2847', name: 'Cyber Resilience Act' },
  { id: 'eu-uk-tca', celex: '32021D0689', name: 'EU-UK Trade and Cooperation Agreement' },
  { id: 'ecodesign-sustainable-products', celex: '32024R1781', name: 'Ecodesign for Sustainable Products Regulation' },
  { id: 'cap-strategic-plans', celex: '32021R2115', name: 'CAP Strategic Plans Regulation' },
  { id: 'ehds', celex: '52022PC0197', name: 'European Health Data Space' },
  { id: 'water-framework-directive', celex: '32000L0060', name: 'Water Framework Directive' },
  { id: 'marine-strategy-framework-directive', celex: '32008L0056', name: 'Marine Strategy Framework Directive' },
  { id: 'zero-pollution-action-plan', celex: '52021DC0400', name: 'Zero Pollution Action Plan' },
  { id: 'reach-regulation', celex: '32006R1907', name: 'REACH Regulation' },
  { id: 'waste-framework-directive', celex: '32008L0098', name: 'Waste Framework Directive' },
  { id: 'single-use-plastics-directive', celex: '32019L0904', name: 'Single-Use Plastics Directive' },
  { id: 'packaging-waste-regulation', celex: '32025R0040', name: 'Packaging and Packaging Waste Regulation' },
  { id: 'nis2-directive', celex: '32022L2555', name: 'NIS2 Directive' },
  { id: 'dora-regulation', celex: '32022R2554', name: 'DORA Regulation' },
  { id: 'european-defence-industrial-strategy', celex: '52024DC0150', name: 'European Defence Industrial Strategy' },
  { id: 'eu-space-programme', celex: '32021R0696', name: 'EU Space Programme' },
  { id: 'foreign-subsidies-regulation', celex: '32022R2560', name: 'Foreign Subsidies Regulation' },
  { id: 'anti-coercion-instrument', celex: '32023R2675', name: 'Anti-Coercion Instrument' },
  { id: 'ten-t-regulation', celex: '32024R1679', name: 'TEN-T Regulation' },
  { id: 'euro-7-regulation', celex: '32024R1257', name: 'Euro 7 Regulation' },
  { id: 'horizon-europe', celex: '32021R0695', name: 'Horizon Europe' },
  { id: 'social-rights-action-plan', celex: '52021DC0102', name: 'European Pillar of Social Rights Action Plan' },
  { id: 'platform-workers-directive', celex: '32024L2831', name: 'Platform Workers Directive' },
  { id: 'european-chips-act', celex: '32023R1781', name: 'European Chips Act' },
];

// Rotate user-agents to reduce risk of being flagged as a bot
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

function pickUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const makeRequest = (targetUrl, redirectCount = 0) => {
      if (redirectCount > 5) return reject(new Error('Too many redirects'));

      const urlObj = new URL(targetUrl);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        headers: {
          'User-Agent': pickUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'identity',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
        },
      };

      const req = https.get(options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let redirect = res.headers.location;
          if (redirect.startsWith('/')) redirect = `https://${urlObj.hostname}${redirect}`;
          return makeRequest(redirect, redirectCount + 1);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.setTimeout(30000, () => {
        req.destroy(new Error('Request timeout after 30s'));
      });
      req.on('error', reject);
    };
    makeRequest(url);
  });
}

// Derive ELI (European Legislation Identifier) URLs from a CELEX number.
// CELEX format for legislation: <sector><year><type><number>
//   sector: 3=legislation, 5=preparatory acts
//   type:   R=regulation, L=directive, D=decision
// Examples:
//   32024R2847 → reg/2024/2847
//   32024L1275 → dir/2024/1275
//   32021D0689 → dec/2021/689
function celexToEliPaths(celex) {
  const match = /^([35])(\d{4})([A-Z])(\d+)$/.exec(celex);
  if (!match) return [];
  const [, sector, year, type, number] = match;
  if (sector !== '3') return []; // ELI only applies to published legislation
  const typeMap = { R: 'reg', L: 'dir', D: 'dec' };
  const eliType = typeMap[type];
  if (!eliType) return [];
  const num = String(parseInt(number, 10));
  return [
    `https://eur-lex.europa.eu/eli/${eliType}/${year}/${num}/oj/eng`,
    `https://eur-lex.europa.eu/eli/${eliType}/${year}/${num}/oj`,
  ];
}

function htmlToText(html) {
  let text = html;

  // Remove non-content sections
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<head[\s\S]*?<\/head>/gi, '');
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<header[\s\S]*?<\/header>/gi, '');
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, '');

  // Convert block elements to newlines
  text = text.replace(/<\/?(p|div|br|h[1-6]|li|tr|blockquote|section|article|pre|table|thead|tbody|tfoot)[^>]*>/gi, '\n');

  // Remove remaining tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  const entities = {
    '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>',
    '&quot;': '"', '&#039;': "'", '&#39;': "'",
    '&rsquo;': '\u2019', '&lsquo;': '\u2018',
    '&rdquo;': '\u201D', '&ldquo;': '\u201C',
    '&mdash;': '\u2014', '&ndash;': '\u2013',
    '&hellip;': '...', '&bull;': '\u2022', '&euro;': '\u20AC',
    '&sect;': '\u00A7', '&para;': '\u00B6', '&deg;': '\u00B0',
    '&times;': '\u00D7', '&divide;': '\u00F7',
  };
  for (const [entity, char] of Object.entries(entities)) {
    text = text.split(entity).join(char);
  }
  text = text.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
  text = text.replace(/&[a-zA-Z]+;/g, '');

  // Clean up whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n /g, '\n');
  text = text.replace(/ \n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();

  return text;
}

function looksLikeCaptcha(text) {
  return text.includes('verify that you') ||
    text.includes('JavaScript is disabled') ||
    text.includes('enable JavaScript') ||
    text.includes('captcha') ||
    text.includes('Access Denied') ||
    text.includes('not a robot') ||
    text.includes('challenge-platform') ||
    text.includes('cf-browser-verification');
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const forceRefresh = process.argv.includes('--force');
  const onlyId = process.argv.find(a => a.startsWith('--id='))?.split('=')[1];

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const toProcess = onlyId
    ? POLICIES.filter(p => p.id === onlyId)
    : POLICIES;

  if (toProcess.length === 0) {
    console.error(`Policy not found: ${onlyId}`);
    process.exit(1);
  }

  console.log(`Processing ${toProcess.length} policies...`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  let updated = 0, skipped = 0, failed = 0;
  const failedPolicies = [];

  // Try multiple EUR-Lex endpoints — plain TXT is most captcha-resistant,
  // then HTML, then ELI URLs as a last resort.
  const getUrls = (celex) => [
    `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${celex}`,
    `https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:${celex}`,
    `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${celex}&qid=1&from=EN`,
    ...celexToEliPaths(celex),
  ];

  // Try fetching a policy once with all candidate URLs. Returns text or null.
  async function tryFetchPolicy(policy, urls) {
    for (const url of urls) {
      try {
        const html = await fetchUrl(url);

        if (looksLikeCaptcha(html)) {
          console.log(`    [captcha] ${url} - robot check, trying next endpoint...`);
          continue;
        }

        const text = htmlToText(html);

        if (text.length < 500) {
          console.log(`    [short] Only ${text.length} chars from ${url}, trying next...`);
          continue;
        }

        return { text, url };
      } catch (err) {
        console.log(`    [error] ${err.message} from ${url}`);
      }
    }
    return null;
  }

  for (const policy of toProcess) {
    const outFile = path.join(OUTPUT_DIR, `${policy.id}.txt`);

    // Skip if file exists and contains real legislative text (unless --force)
    if (!forceRefresh && fs.existsSync(outFile)) {
      const existing = fs.readFileSync(outFile, 'utf8');
      const isPlaceholder = existing.includes('OFFICIAL FULL TEXT AVAILABLE AT') ||
        existing.includes('structural summary') ||
        existing.includes('END OF DOCUMENT SUMMARY');
      if (existing.length > 5000 && !isPlaceholder) {
        console.log(`  [skip] ${policy.name} (${existing.length} chars already saved)`);
        skipped++;
        continue;
      }
      if (isPlaceholder) {
        console.log(`  [refetch] ${policy.name} (existing file is a placeholder/summary)`);
      }
    }

    console.log(`  [fetch] ${policy.name} (CELEX: ${policy.celex})...`);

    const urls = getUrls(policy.celex);
    const result = await tryFetchPolicy(policy, urls);

    if (result) {
      fs.writeFileSync(outFile, result.text);
      console.log(`    [ok] ${result.text.length} chars saved`);
      updated++;
    } else {
      console.log(`    [FAILED on first pass] ${policy.name} — will retry later`);
      failedPolicies.push(policy);
    }

    // Rate limit: 5s between requests + jitter, to look more human.
    await sleep(5000 + Math.floor(Math.random() * 2000));
  }

  // Retry pass: after primary run, retry policies that failed once with a
  // long cooldown. Captchas are typically session-scoped, so a longer wait
  // often clears them.
  if (failedPolicies.length > 0) {
    console.log(`\n=== Retry pass for ${failedPolicies.length} failed policies ===`);
    console.log('Waiting 60s before retry pass to let any rate limits clear...\n');
    await sleep(60000);

    for (const policy of failedPolicies) {
      const outFile = path.join(OUTPUT_DIR, `${policy.id}.txt`);
      console.log(`  [retry] ${policy.name} (CELEX: ${policy.celex})...`);

      const urls = getUrls(policy.celex);
      const result = await tryFetchPolicy(policy, urls);

      if (result) {
        fs.writeFileSync(outFile, result.text);
        console.log(`    [ok] ${result.text.length} chars saved`);
        updated++;
      } else {
        console.log(`    [FAILED] Could not fetch ${policy.name}`);
        failed++;
      }

      // Longer delay between retries: 10-15s.
      await sleep(10000 + Math.floor(Math.random() * 5000));
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed:  ${failed}`);
  console.log(`Total:   ${toProcess.length}`);

  // List all saved files
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.txt'));
  console.log(`\nFiles in ${OUTPUT_DIR}: ${files.length}`);
  files.forEach(f => {
    const size = fs.statSync(path.join(OUTPUT_DIR, f)).size;
    console.log(`  ${f} (${Math.round(size / 1024)}KB)`);
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
