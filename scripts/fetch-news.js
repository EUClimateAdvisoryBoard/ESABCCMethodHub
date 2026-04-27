#!/usr/bin/env node
/**
 * Fetch climate-related news from EU institution RSS feeds.
 * Run daily via GitHub Actions or manually: node scripts/fetch-news.js
 *
 * Sources (all free, no API key):
 * - European Commission press corner
 * - EEA news
 * - European Council newsroom
 * - EUR-Lex recent acts
 * - Carbon Brief
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const NEWSFEED_FILE = path.join(__dirname, '..', 'src', 'data', 'newsfeed.ts');

const RSS_FEEDS = [
  {
    url: 'https://ec.europa.eu/commission/presscorner/api/rss?language=en',
    source: 'european_commission',
    sourceLabel: 'European Commission',
  },
  {
    url: 'https://www.eea.europa.eu/api/rss',
    source: 'eea',
    sourceLabel: 'EEA',
  },
  {
    url: 'https://www.consilium.europa.eu/en/rss/press.xml',
    source: 'european_council',
    sourceLabel: 'European Council',
  },
  {
    url: 'https://eur-lex.europa.eu/rss/rss-recent-acts.xml',
    source: 'eurlex',
    sourceLabel: 'EUR-Lex',
  },
];

const CLIMATE_KEYWORDS = [
  'climate', 'emission', 'carbon', 'green deal', 'energy', 'renewable',
  'sustainability', 'biodiversity', 'pollution', 'environment', 'net zero',
  'net-zero', 'decarboni', 'ETS', 'CBAM', 'taxonomy', 'adaptation',
  'mitigation', 'fossil', 'hydrogen', 'circular economy', 'nature restoration',
  'methane', 'deforestation', 'clean energy', 'Fit for 55', 'LULUCF',
  'greenhouse', 'Paris Agreement', 'UNFCCC',
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const makeRequest = (targetUrl, redirectCount = 0) => {
      if (redirectCount > 5) return reject(new Error('Too many redirects'));
      const mod = targetUrl.startsWith('https') ? https : require('http');
      mod.get(targetUrl, {
        headers: { 'User-Agent': 'ESABCC-MethodHub/1.0', 'Accept': 'application/rss+xml, application/xml, text/xml' },
        timeout: 15000,
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return makeRequest(res.headers.location, redirectCount + 1);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
    };
    makeRequest(url);
  });
}

function parseRSS(xml) {
  const items = [];
  // Match <item> or <entry> blocks
  const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const getTag = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'));
      return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
    };
    const getAttr = (tag, attr) => {
      const m = block.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i'));
      return m ? m[1] : '';
    };

    items.push({
      title: getTag('title').replace(/<[^>]+>/g, ''),
      link: getTag('link') || getAttr('link', 'href'),
      description: getTag('description').replace(/<[^>]+>/g, '').substring(0, 500),
      summary: getTag('summary').replace(/<[^>]+>/g, '').substring(0, 500),
      pubDate: getTag('pubDate') || getTag('published') || getTag('dc:date') || getTag('updated'),
    });
  }
  return items;
}

function isClimateRelevant(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  return CLIMATE_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
}

function autoTag(text) {
  const t = text.toLowerCase();
  const tags = [];
  if (t.includes('emission') || t.includes('ets') || t.includes('carbon')) tags.push('emissions');
  if (t.includes('energy') || t.includes('renewable') || t.includes('solar') || t.includes('wind')) tags.push('energy');
  if (t.includes('adaptation') || t.includes('resilience') || t.includes('flood') || t.includes('heat')) tags.push('adaptation');
  if (t.includes('biodiversity') || t.includes('nature') || t.includes('species')) tags.push('biodiversity');
  if (t.includes('finance') || t.includes('taxonomy') || t.includes('investment') || t.includes('fund')) tags.push('finance');
  if (t.includes('transport') || t.includes('vehicle') || t.includes('aviation') || t.includes('maritime')) tags.push('transport');
  if (t.includes('agriculture') || t.includes('food') || t.includes('farming')) tags.push('agriculture');
  if (t.includes('industry') || t.includes('manufacturing') || t.includes('industrial')) tags.push('industry');
  return tags;
}

async function main() {
  console.log('Fetching RSS feeds...');
  const allItems = [];

  for (const feed of RSS_FEEDS) {
    try {
      console.log(`  Fetching ${feed.sourceLabel}...`);
      const xml = await fetchUrl(feed.url);
      const items = parseRSS(xml);
      console.log(`    Found ${items.length} items`);

      for (const item of items) {
        const desc = item.description || item.summary;
        if (!isClimateRelevant(item.title, desc)) continue;

        allItems.push({
          title: item.title,
          summary: desc,
          url: item.link,
          source: feed.source,
          sourceLabel: feed.sourceLabel,
          publishedDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          tags: autoTag(`${item.title} ${desc}`),
        });
      }
    } catch (err) {
      console.log(`    [error] ${feed.sourceLabel}: ${err.message}`);
    }
  }

  console.log(`\nTotal climate-relevant items: ${allItems.length}`);

  // Sort by date, take most recent 50
  allItems.sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));
  const recent = allItems.slice(0, 50);

  // Save to JSON for reference
  const outputPath = path.join(__dirname, '..', 'public', 'data');
  fs.mkdirSync(outputPath, { recursive: true });
  fs.writeFileSync(
    path.join(outputPath, 'latest-news.json'),
    JSON.stringify(recent, null, 2)
  );

  console.log(`Saved ${recent.length} items to public/data/latest-news.json`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
