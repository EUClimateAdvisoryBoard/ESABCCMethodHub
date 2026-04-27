#!/usr/bin/env node
/**
 * Generate a structured daily climate & energy news summary for the EU.
 *
 * Fetches live RSS feeds (same sources as /api/live-news), filters articles
 * from the last 24 hours, then writes a structured JSON summary to
 * public/data/daily-summary.json.
 *
 * Run daily via GitHub Actions or manually:
 *   node scripts/generate-daily-summary.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ── RSS feed sources (mirrors /api/live-news) ──────────────────────────────

const RSS_FEEDS = {
  // EU Institutions
  eea_press: { url: 'https://www.eea.europa.eu/en/newsroom/rss-feeds/eeas-press-releases-rss', label: 'EEA Press Releases', category: 'eu' },
  eea_articles: { url: 'https://www.eea.europa.eu/en/newsroom/rss-feeds/featured-articles-rss', label: 'EEA Featured Articles', category: 'eu' },
  ep_envi: { url: 'https://www.europarl.europa.eu/rss/committee/envi/en.xml', label: 'EU Parliament ENVI Committee', category: 'eu' },
  ep_top: { url: 'https://www.europarl.europa.eu/rss/en/top-stories.xml', label: 'EU Parliament Top Stories', category: 'eu' },
  // Policy & analysis media
  carbon_brief: { url: 'https://www.carbonbrief.org/feed', label: 'Carbon Brief', category: 'policy' },
  euractiv_env: { url: 'https://www.euractiv.com/sections/energy-environment/feed/', label: 'Euractiv Energy & Environment', category: 'policy' },
  euractiv_climate: { url: 'https://www.euractiv.com/sections/climate-environment/feed/', label: 'Euractiv Climate', category: 'policy' },
  climate_home: { url: 'https://www.climatechangenews.com/feed/', label: 'Climate Home News', category: 'policy' },
  // General media
  guardian_climate: { url: 'https://www.theguardian.com/environment/climate-crisis/rss', label: 'The Guardian - Climate', category: 'media' },
  guardian_energy: { url: 'https://www.theguardian.com/environment/energy/rss', label: 'The Guardian - Energy', category: 'media' },
  bbc_climate: { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', label: 'BBC Science & Environment', category: 'media' },
  dw_env: { url: 'https://rss.dw.com/xml/rss-en-env', label: 'Deutsche Welle Environment', category: 'media' },
  reuters_energy: { url: 'https://news.google.com/rss/search?q=when:1d+allinurl:reuters.com+EU+energy+climate&ceid=US:en&hl=en-US&gl=US', label: 'Reuters (via Google News)', category: 'media' },
  // Science & international
  ipcc: { url: 'https://www.ipcc.ch/feed/', label: 'IPCC', category: 'science' },
  unfccc: { url: 'https://unfccc.int/feed/', label: 'UNFCCC', category: 'science' },
  iisd_sdg: { url: 'https://sdg.iisd.org/feed/', label: 'IISD SDG Knowledge Hub', category: 'science' },
  // Extra general news for "non-climate" section
  bbc_world: { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', label: 'BBC World News', category: 'general' },
  dw_world: { url: 'https://rss.dw.com/xml/rss-en-all', label: 'Deutsche Welle World', category: 'general' },
  reuters_world: { url: 'https://news.google.com/rss/search?q=when:1d+site:reuters.com+world&ceid=US:en&hl=en-US&gl=US', label: 'Reuters World (via Google News)', category: 'general' },
};

// ── Keywords ──────────────────────────────────────────────────────────────

const CLIMATE_ENERGY_RE = /\b(climate|emission|carbon|green\s*deal|renewable|solar|wind|hydrogen|sustainability|biodiversity|net.?zero|decarboni[sz]|fossil|energy|ETS\b|CBAM|taxonomy|lulucf|effort\s*sharing|nature\s*restoration|methane|deforestation|clean\s*energy|Fit\s*for\s*55|greenhouse|Paris\s*Agreement|UNFCCC|IPCC|heat\s*pump|battery|electric\s*vehicle|EV\b|offshore\s*wind|nuclear|gas\s*pipeline|LNG|coal\s*phase|carbon\s*capture|CCS\b|CCUS|circular\s*economy|pollution|air\s*quality|water\s*stress|drought|flood|wildfire|sea\s*level|arctic|antarctic|permafrost|coral\s*reef|ozone|reforestation|afforestation|biomass|biofuel|geothermal|tidal|wave\s*energy|smart\s*grid|energy\s*storage|power\s*grid|interconnect|energy\s*efficien|building\s*renovation|EPBD|RED\b|EED|green\s*bond|sustainable\s*finance|SFDR|CSRD|ESG|just\s*transition|social\s*climate\s*fund)\b/i;

const EU_RE = /\b(eu\b|european|europe|brussels|commission|parliament|council|member\s*state|eurozone|euro\b|schengen|von\s*der\s*leyen|timmermans|hoekstra|borrell)\b/i;

const LEGISLATIVE_RE = /\b(regulation|directive|legislation|law|amendment|proposal|vote|adopted|trilogue|plenary|council\s*position|committee|impact\s*assessment|consultation)\b/i;

// ── Fetch helper ──────────────────────────────────────────────────────────

function fetchUrl(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const doRequest = (targetUrl, redirects = 0) => {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      const mod = targetUrl.startsWith('https') ? https : http;
      const req = mod.get(targetUrl, {
        headers: { 'User-Agent': 'ESABCC-MethodHub/1.0', 'Accept': 'application/rss+xml, application/xml, text/xml, application/json' },
        timeout: timeoutMs,
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return doRequest(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    };
    doRequest(url);
  });
}

// ── RSS parser ────────────────────────────────────────────────────────────

function parseRSS(xml) {
  const items = [];
  // Try <item> first, then <entry> (Atom)
  const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const getTag = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'));
      return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '').replace(/<[^>]*$/g, '').replace(/\s+/g, ' ').trim() : '';
    };
    const getAttr = (tag, attr) => {
      const m = block.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i'));
      return m ? m[1] : '';
    };
    items.push({
      title: getTag('title'),
      link: getTag('link') || getAttr('link', 'href'),
      description: (getTag('description') || getTag('summary')).substring(0, 500),
      pubDate: getTag('pubDate') || getTag('published') || getTag('dc:date') || getTag('updated'),
    });
  }
  return items;
}

// ── Deduplication ─────────────────────────────────────────────────────────

function normalizeTitle(t) {
  return t.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function isSimilar(a, b) {
  const wordsA = new Set(normalizeTitle(a).split(' ').filter(w => w.length > 3));
  const wordsB = new Set(normalizeTitle(b).split(' ').filter(w => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return false;
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return overlap / Math.min(wordsA.size, wordsB.size) >= 0.6;
}

function dedup(articles) {
  const seen = [];
  return articles.filter(a => {
    for (const t of seen) {
      if (isSimilar(a.title, t)) return false;
    }
    seen.push(a.title);
    return true;
  });
}

// ── Relevance scoring ─────────────────────────────────────────────────────

function scoreArticle(article) {
  const text = `${article.title} ${article.description}`;
  let score = 0;

  // Source authority
  if (article.category === 'eu') score += 12;
  else if (article.category === 'policy') score += 8;
  else if (article.category === 'science') score += 6;
  else score += 2;

  // EU policy mentions
  if (EU_RE.test(article.title)) score += 6;
  else if (EU_RE.test(text)) score += 2;

  // Climate/energy keywords
  if (CLIMATE_ENERGY_RE.test(article.title)) score += 5;
  else if (CLIMATE_ENERGY_RE.test(text)) score += 2;

  // Legislative specificity
  if (LEGISLATIVE_RE.test(text)) score += 4;

  return score;
}

// ── Categorize articles into summary sections ─────────────────────────────

// Non-climate EU topics (migration, defence, Ukraine, Schengen, economy, etc.)
const EU_GENERAL_RE = /\b(schengen|entry.?exit|ees\b|migration|asylum|return|border|frontex|defence|defense|nato|ukraine|military|drone|ammunition|missile|rearm|enlargement|accession|rule\s*of\s*law|media\s*freedom|digital\s*services|DSA\b|DMA\b|AI\s*act|GDPR|cybersecurity|NIS2|economic\s*security|competitiveness|single\s*market|capital\s*markets\s*union|euro\s*area|banking\s*union|trade|tariff|mercosur|health|pharmaceutical|discovereu|erasmus)\b/i;

function categorize(article) {
  const text = `${article.title} ${article.description}`.toLowerCase();
  const isClimateEnergy = CLIMATE_ENERGY_RE.test(text);

  // EU Policy & Legislation (climate/energy legislative acts only)
  if (LEGISLATIVE_RE.test(text) && EU_RE.test(text) && isClimateEnergy) return 'eu_policy';

  // Energy (require specific energy/climate terms — bare "energy" is too broad for general media)
  if (/\b(energy\s*transition|energy\s*storage|energy\s*efficien|energy\s*mix|energy\s*security|energy\s*crisis|energy\s*policy|renewable|solar|wind|hydrogen|nuclear|gas|lng|coal|battery|grid|power\s*plant|electricity|heat\s*pump|offshore|geothermal|biomass|biofuel|smart\s*grid|interconnect|building\s*renovation|EPBD|RED\b|EED)\b/i.test(text)) return 'energy';

  // Climate science & environment
  if (/\b(climate|emission|carbon|greenhouse|warming|temperature|sea\s*level|arctic|drought|flood|wildfire|biodiversity|nature|deforestation|pollution|ozone|coral|permafrost|adaptation|resilience)\b/i.test(text)) return 'climate';

  // Green finance
  if (/\b(green\s*bond|sustainable\s*finance|SFDR|CSRD|ESG|taxonomy|investment|fund|just\s*transition|social\s*climate)\b/i.test(text)) return 'finance';

  // Non-climate EU news (migration, defence, Ukraine, Schengen, economy, etc.)
  if (EU_RE.test(text) && EU_GENERAL_RE.test(text)) return 'eu_general';

  // If it's from a general source and not climate/energy, it goes to "other"
  if (article.category === 'general') return 'other_world';

  return 'climate'; // default for climate sources
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

  console.log(`Generating daily summary for ${dateStr}`);
  console.log(`Fetching articles from the last 24 hours...`);

  const allArticles = [];

  // Fetch all feeds in parallel (batched to avoid socket exhaustion)
  const feedEntries = Object.entries(RSS_FEEDS);
  const BATCH_SIZE = 6;
  for (let i = 0; i < feedEntries.length; i += BATCH_SIZE) {
    const batch = feedEntries.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async ([key, feed]) => {
        try {
          console.log(`  Fetching ${feed.label}...`);
          const text = await fetchUrl(feed.url);

          // Handle JSON responses (EC Press Corner returns JSON)
          if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
            try {
              const data = JSON.parse(text);
              const results = Array.isArray(data) ? data : (data.results || data.items || []);
              return results.slice(0, 30).map(item => ({
                title: item.title || item.headline || '',
                link: item.url || item.link || '',
                description: (item.description || item.summary || item.subtitle || '').slice(0, 500),
                pubDate: item.date || item.published || item.pubDate || '',
                source: key,
                sourceLabel: feed.label,
                category: feed.category,
              }));
            } catch { return []; }
          }

          const items = parseRSS(text);
          return items.map(item => ({
            ...item,
            source: key,
            sourceLabel: feed.label,
            category: feed.category,
          }));
        } catch (err) {
          console.log(`    [error] ${feed.label}: ${err.message}`);
          return [];
        }
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled') allArticles.push(...r.value);
    }
  }

  // Fallback: also incorporate items from latest-news.json (populated by
  // the fetch-news.js script) so we never have a completely empty summary.
  const latestNewsPath = path.join(__dirname, '..', 'public', 'data', 'latest-news.json');
  if (fs.existsSync(latestNewsPath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(latestNewsPath, 'utf-8'));
      console.log(`  Loaded ${cached.length} items from latest-news.json fallback`);
      for (const item of cached) {
        allArticles.push({
          title: item.title || '',
          link: item.url || '',
          description: (item.summary || '').slice(0, 500),
          pubDate: item.publishedDate || '',
          source: item.source || 'other',
          sourceLabel: item.sourceLabel || 'Cached',
          category: item.source === 'european_commission' ? 'eu' :
                    item.source === 'eea' ? 'eu' :
                    item.source === 'european_council' ? 'eu' : 'policy',
        });
      }
    } catch (err) {
      console.log(`  [warn] Could not read latest-news.json: ${err.message}`);
    }
  }

  console.log(`\nTotal raw articles fetched: ${allArticles.length}`);

  // Strict 24-hour filter — only include articles published in the last 24h
  const recent = allArticles.filter(a => {
    if (!a.pubDate) return false;
    const d = new Date(a.pubDate);
    if (isNaN(d.getTime())) return false;
    return d >= twentyFourHoursAgo;
  });

  console.log(`Articles from last 24h: ${recent.length}`);

  // Deduplicate
  const unique = dedup(recent);
  console.log(`After deduplication: ${unique.length}`);

  // Score and sort
  for (const a of unique) {
    a.score = scoreArticle(a);
  }
  unique.sort((a, b) => b.score - a.score);

  // Categorize
  const sections = {
    eu_policy: [],
    energy: [],
    climate: [],
    finance: [],
    eu_general: [],
    other_world: [],
  };

  for (const a of unique) {
    const cat = categorize(a);
    if (sections[cat]) {
      sections[cat].push({
        title: a.title,
        link: a.link,
        source: a.sourceLabel,
        description: a.description,
        published: a.pubDate ? new Date(a.pubDate).toISOString() : now.toISOString(),
        score: a.score,
      });
    }
  }

  // Limit items per section — enough for a rich one-pager but still concise
  const MAX_PER_SECTION = 5;
  for (const key of Object.keys(sections)) {
    sections[key] = sections[key].slice(0, MAX_PER_SECTION);
  }

  // Build editorial highlights from the top-scoring climate/energy items
  const HIGHLIGHT_TAGS = {
    eu_policy: { tag: 'EU POLICY', color: '#007B6C' },
    energy:    { tag: 'ENERGY',    color: '#E87722' },
    climate:   { tag: 'CLIMATE',   color: '#2E8B57' },
    finance:   { tag: 'FINANCE',   color: '#7C3AED' },
  };
  const highlights = [];
  for (const [cat, meta] of Object.entries(HIGHLIGHT_TAGS)) {
    if (sections[cat].length > 0) {
      const top = sections[cat][0];
      highlights.push({
        headline: top.title,
        summary: top.description,
        tag: meta.tag,
        color: meta.color,
      });
    }
  }

  // Build the summary object
  const summary = {
    date: dateStr,
    generatedAt: now.toISOString(),
    title: `EU Climate & Energy Daily Briefing`,
    subtitle: `${formatDateReadable(now)} — Key developments from the last 24 hours`,
    highlights,
    sections: [
      {
        id: 'eu_policy',
        title: 'EU Policy & Legislation',
        items: sections.eu_policy,
      },
      {
        id: 'energy',
        title: 'Energy Transition',
        items: sections.energy,
      },
      {
        id: 'climate',
        title: 'Climate & Environment',
        items: sections.climate,
      },
      {
        id: 'finance',
        title: 'Green Finance & Investment',
        items: sections.finance,
      },
      {
        id: 'eu_general',
        title: 'Beyond Climate — Other Major EU News',
        items: sections.eu_general,
      },
      {
        id: 'other_world',
        title: 'Beyond Climate & EU — World News Highlights',
        items: sections.other_world,
      },
    ],
    stats: {
      totalArticlesScanned: allArticles.length,
      articlesLast24h: recent.length,
      afterDedup: unique.length,
      feedsQueried: feedEntries.length,
    },
  };

  // Write output
  const outputDir = path.join(__dirname, '..', 'public', 'data');
  fs.mkdirSync(outputDir, { recursive: true });

  // Write current summary (always latest)
  const outputPath = path.join(outputDir, 'daily-summary.json');
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
  console.log(`\nWrote summary to ${outputPath}`);

  // Also write dated archive copy
  const archiveDir = path.join(outputDir, 'daily-summaries');
  fs.mkdirSync(archiveDir, { recursive: true });
  const archivePath = path.join(archiveDir, `${dateStr}.json`);
  fs.writeFileSync(archivePath, JSON.stringify(summary, null, 2));
  console.log(`Wrote archive copy to ${archivePath}`);

  // Print summary stats
  console.log(`\n--- Summary ---`);
  for (const s of summary.sections) {
    console.log(`  ${s.title}: ${s.items.length} items`);
  }
  console.log(`  Total: ${summary.sections.reduce((n, s) => n + s.items.length, 0)} items`);
}

function formatDateReadable(d) {
  return d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
