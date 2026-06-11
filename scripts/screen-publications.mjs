#!/usr/bin/env node
/**
 * Daily scientific-publication screening for the Project Workspace.
 * -----------------------------------------------------------------
 * Run daily via .github/workflows/daily-publication-screening.yml or
 * manually:  node scripts/screen-publications.mjs
 *
 * What it does
 *   1. Asks the Crossref REST API (free, no key; "polite pool" via the
 *      mailto parameter) for journal articles newly registered in each of
 *      the RELEVANT_JOURNALS over the last LOOKBACK_DAYS.
 *   2. Scores every new article against the keyword profile of each seed
 *      project in the Project Workspace (src/data/project-workspace.ts).
 *      Title hits count more than abstract hits; an article is suggested
 *      to a project when its score clears the project's threshold.
 *   3. Writes, under public/data/publication-screening/ :
 *        reports/YYYY-MM-DD.md  – the human-readable daily report that the
 *                                 workflow commits (one per day, also
 *                                 rendered by the Literature-watch module)
 *        suggestions.json       – rolling machine-readable archive of the
 *                                 last KEEP_DAYS days of suggestions,
 *                                 consumed by LiteratureWatchModule
 *        index.json             – list of available report dates
 *        seen-dois.json         – DOIs already screened, so a DOI is only
 *                                 ever suggested once
 *
 * Offline testing: pass  --fixtures <dir>  to read one JSON file per
 * journal (named <issn>.json, shaped like a Crossref works response)
 * instead of hitting the network.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'data', 'publication-screening');
const REPORTS_DIR = path.join(OUT_DIR, 'reports');

/** How many days back we ask Crossref for newly registered records. The
 *  window deliberately overlaps previous runs (cron runs daily) — the
 *  seen-DOIs state deduplicates, and the overlap means a missed or delayed
 *  run cannot drop a day of publications. */
const LOOKBACK_DAYS = 5;
/** Days a suggestion stays in the rolling suggestions.json archive. */
const KEEP_DAYS = 60;
/** Days a DOI stays in seen-dois.json before it may be re-screened. */
const SEEN_RETENTION_DAYS = 180;
/** Contact for the Crossref polite pool (better rate limits, fair use). */
const CROSSREF_MAILTO = 'methodhub@climate-advisory-board.europa.eu';

/**
 * The journals screened every day. Peer-reviewed venues where work relevant
 * to the ESABCC's assessment remit (EU climate policy, mitigation pathways,
 * energy systems, industrial decarbonisation) routinely appears. One ISSN
 * per journal — Crossref's /journals/{issn}/works route accepts either the
 * print or the electronic ISSN.
 */
const RELEVANT_JOURNALS = [
  { issn: '1758-678X', name: 'Nature Climate Change' },
  { issn: '2058-7546', name: 'Nature Energy' },
  { issn: '2398-9629', name: 'Nature Sustainability' },
  { issn: '2731-9814', name: 'npj Climate Action' },
  { issn: '1469-3062', name: 'Climate Policy' },
  { issn: '0165-0009', name: 'Climatic Change' },
  { issn: '1748-9326', name: 'Environmental Research Letters' },
  { issn: '0959-3780', name: 'Global Environmental Change' },
  { issn: '0301-4215', name: 'Energy Policy' },
  { issn: '2214-6296', name: 'Energy Research & Social Science' },
  { issn: '1462-9011', name: 'Environmental Science & Policy' },
  { issn: '0921-8009', name: 'Ecological Economics' },
  { issn: '2590-3322', name: 'One Earth' },
  { issn: '2542-4351', name: 'Joule' },
  { issn: '1757-7780', name: 'WIREs Climate Change' },
  { issn: '1573-1480', name: 'Mitigation and Adaptation Strategies for Global Change' },
];

/**
 * Keyword profiles for the seed workspace projects. Mirrors the project
 * scopes described in src/data/project-workspace.ts — keep the two in step
 * when a project's remit changes. Each keyword is matched case-insensitively
 * as a phrase; hits in the title weigh TITLE_WEIGHT, hits in the abstract
 * weigh 1. `boost` keywords mark EU relevance and add half a point each.
 */
const TITLE_WEIGHT = 3;
const PROJECT_PROFILES = [
  {
    projectId: 'policy-gap-2-0',
    projectName: 'Policy Gap 2.0',
    threshold: 4,
    keywords: [
      'eu climate policy', 'european green deal', 'climate neutrality',
      'climate target', 'emissions gap', 'climate governance', 'climate law',
      'effort sharing', 'eu ets', 'emissions trading', 'carbon pricing',
      'lulucf', 'carbon budget', 'mitigation pathway', 'net-zero', 'net zero',
      'nationally determined contribution', 'climate policy integration',
      'policy gap', 'progress monitoring', 'climate indicator',
      'greenhouse gas emissions', 'decarbonisation', 'decarbonization',
      'member state', 'european union', 'climate advisory',
      'paris agreement', 'climate assessment', 'energy transition',
      'renewable energy policy', 'fit for 55', 'climate adaptation policy',
    ],
    boost: ['eu', 'europe', 'european'],
  },
  {
    projectId: 'industry-project',
    projectName: 'Industry Project',
    threshold: 4,
    keywords: [
      'industrial decarbonisation', 'industrial decarbonization',
      'energy-intensive industr', 'steel', 'cement', 'chemical industry',
      'carbon leakage', 'cbam', 'carbon border adjustment', 'eu ets',
      'emissions trading', 'green hydrogen', 'hydrogen economy',
      'carbon capture', 'ccs', 'ccu', 'electrification of industry',
      'industrial electrification', 'clean technology', 'cleantech',
      'circular economy', 'industrial policy', 'net-zero industry',
      'process emissions', 'heavy industry', 'manufacturing emissions',
      'industrial heat', 'green steel', 'low-carbon cement',
    ],
    boost: ['eu', 'europe', 'european', 'industry', 'industrial'],
  },
];

// ── CLI ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const fixturesIdx = args.indexOf('--fixtures');
const FIXTURES_DIR = fixturesIdx !== -1 ? args[fixturesIdx + 1] : null;

// ── Crossref access ─────────────────────────────────────────────────────────

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

async function fetchJournalWorks(journal, fromDate) {
  if (FIXTURES_DIR) {
    const file = path.join(FIXTURES_DIR, `${journal.issn}.json`);
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8')).message?.items ?? [];
  }
  const params = new URLSearchParams({
    filter: `from-created-date:${fromDate},type:journal-article`,
    rows: '200',
    select: 'DOI,title,abstract,created,issued,container-title,author,URL',
    mailto: CROSSREF_MAILTO,
  });
  const url = `https://api.crossref.org/journals/${journal.issn}/works?${params}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': `ESABCC-MethodHub/1.0 (mailto:${CROSSREF_MAILTO})` },
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status === 404) return []; // journal route unknown for this ISSN
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.message?.items ?? [];
    } catch (err) {
      if (attempt === 3) {
        console.error(`  ! ${journal.name}: ${err.message} — skipping`);
        return [];
      }
      await new Promise(r => setTimeout(r, attempt * 2000));
    }
  }
  return [];
}

// ── Normalisation & scoring ─────────────────────────────────────────────────

/** Crossref abstracts arrive as JATS XML — strip tags & collapse space. */
function cleanAbstract(raw) {
  if (!raw) return '';
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\s*abstract\s*[:.]?\s*/i, '')
    .trim();
}

function formatAuthors(author) {
  if (!Array.isArray(author) || author.length === 0) return '';
  const names = author
    .map(a => [a.given, a.family].filter(Boolean).join(' ') || a.name || '')
    .filter(Boolean);
  if (names.length > 4) return `${names.slice(0, 3).join(', ')} et al.`;
  return names.join(', ');
}

/** Whole-word(ish) phrase match: keyword must not sit inside a longer word.
 *  Keywords ending in 'industr' are deliberate stems (industry/industries/
 *  industrial), so a trailing letter is allowed for those. */
function countHits(text, keyword) {
  const stem = keyword.endsWith('industr');
  let count = 0;
  let from = 0;
  while (true) {
    const i = text.indexOf(keyword, from);
    if (i === -1) break;
    const before = i === 0 ? ' ' : text[i - 1];
    const afterIdx = i + keyword.length;
    const after = afterIdx >= text.length ? ' ' : text[afterIdx];
    if (!/[a-z0-9]/.test(before) && (stem || !/[a-z0-9]/.test(after))) {
      count++;
    }
    from = i + keyword.length;
  }
  return count;
}

function scoreAgainstProfile(work, profile) {
  const title = (work.title?.[0] ?? '').toLowerCase();
  const abstract = cleanAbstract(work.abstract).toLowerCase();
  let score = 0;
  const matched = [];
  for (const kw of profile.keywords) {
    const t = countHits(title, kw);
    const a = countHits(abstract, kw);
    if (t + a > 0) {
      score += t * TITLE_WEIGHT + Math.min(a, 3); // cap abstract repetition
      matched.push(kw);
    }
  }
  if (matched.length > 0) {
    for (const b of profile.boost) {
      if (countHits(title, b) + countHits(abstract, b) > 0) score += 0.5;
    }
  }
  return { score: Math.round(score * 10) / 10, matched };
}

// ── State files ─────────────────────────────────────────────────────────────

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

// ── Report rendering ────────────────────────────────────────────────────────

function mdEscape(s) {
  return s.replace(/([\\`*_[\]])/g, '\\$1');
}

function renderReport(today, suggestions, stats) {
  const lines = [];
  lines.push(`# Daily publication screening — ${today}`);
  lines.push('');
  lines.push(
    `Automated screening of ${RELEVANT_JOURNALS.length} journals via Crossref ` +
    `(articles registered in the last ${LOOKBACK_DAYS} days). ` +
    `${stats.fetched} new articles screened, ${suggestions.length} matched a workspace project.`,
  );
  lines.push('');

  for (const profile of PROJECT_PROFILES) {
    const mine = suggestions
      .filter(s => s.projects.some(p => p.projectId === profile.projectId))
      .sort((a, b) => {
        const pa = a.projects.find(p => p.projectId === profile.projectId).score;
        const pb = b.projects.find(p => p.projectId === profile.projectId).score;
        return pb - pa;
      });
    lines.push(`## ${profile.projectName}`);
    lines.push('');
    if (mine.length === 0) {
      lines.push('_No new publications matched this project today._');
      lines.push('');
      continue;
    }
    for (const s of mine) {
      const m = s.projects.find(p => p.projectId === profile.projectId);
      lines.push(`### [${mdEscape(s.title)}](${s.url})`);
      lines.push('');
      const meta = [
        s.authors && `**${mdEscape(s.authors)}**`,
        `*${mdEscape(s.journal)}*`,
        s.published,
        `DOI: [${s.doi}](https://doi.org/${s.doi})`,
      ].filter(Boolean);
      lines.push(meta.join(' · '));
      lines.push('');
      lines.push(`Relevance ${m.score} — matched: ${m.matched.map(k => `\`${k}\``).join(', ')}`);
      if (s.abstract) {
        lines.push('');
        const excerpt = s.abstract.length > 600 ? `${s.abstract.slice(0, 600)}…` : s.abstract;
        lines.push(`> ${mdEscape(excerpt)}`);
      }
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  lines.push('### Journals screened');
  lines.push('');
  for (const j of RELEVANT_JOURNALS) {
    const n = stats.perJournal[j.issn] ?? 0;
    lines.push(`- ${j.name} — ${n} new article${n === 1 ? '' : 's'}`);
  }
  lines.push('');
  lines.push(
    '_Generated by `scripts/screen-publications.mjs`. Suggestions feed the ' +
    'Literature watch tab of each Project Workspace project._',
  );
  lines.push('');
  return lines.join('\n');
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const now = new Date();
  const today = isoDate(now);
  const fromDate = isoDate(new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000));

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const seenFile = path.join(OUT_DIR, 'seen-dois.json');
  const seen = readJson(seenFile, {});

  console.log(`Screening ${RELEVANT_JOURNALS.length} journals for articles registered since ${fromDate}…`);

  const suggestions = [];
  const stats = { fetched: 0, perJournal: {} };

  for (const journal of RELEVANT_JOURNALS) {
    const items = await fetchJournalWorks(journal, fromDate);
    let fresh = 0;
    for (const work of items) {
      const doi = work.DOI?.toLowerCase();
      const title = work.title?.[0];
      if (!doi || !title || seen[doi]) continue;
      seen[doi] = today;
      fresh++;

      const projects = [];
      for (const profile of PROJECT_PROFILES) {
        const { score, matched } = scoreAgainstProfile(work, profile);
        if (score >= profile.threshold) {
          projects.push({ projectId: profile.projectId, score, matched });
        }
      }
      if (projects.length === 0) continue;

      const issued = work.issued?.['date-parts']?.[0];
      suggestions.push({
        doi,
        title: title.replace(/\s+/g, ' ').trim(),
        journal: work['container-title']?.[0] ?? journal.name,
        authors: formatAuthors(work.author),
        published: issued ? issued.map(n => String(n).padStart(2, '0')).join('-') : (work.created?.['date-time']?.slice(0, 10) ?? today),
        url: work.URL ?? `https://doi.org/${doi}`,
        abstract: cleanAbstract(work.abstract).slice(0, 1500),
        suggestedOn: today,
        projects,
      });
    }
    stats.fetched += fresh;
    stats.perJournal[journal.issn] = fresh;
    console.log(`  ${journal.name}: ${items.length} returned, ${fresh} new`);
    if (!FIXTURES_DIR) await new Promise(r => setTimeout(r, 1000)); // be polite
  }

  // Daily markdown report — written every day, including no-match days, so
  // the workflow has a fresh file to commit and the reading trail is complete.
  const reportPath = path.join(REPORTS_DIR, `${today}.md`);
  fs.writeFileSync(reportPath, renderReport(today, suggestions, stats));
  console.log(`Wrote ${path.relative(process.cwd(), reportPath)} (${suggestions.length} suggestions)`);

  // Rolling suggestions archive for the Literature-watch module.
  const archiveFile = path.join(OUT_DIR, 'suggestions.json');
  const cutoff = isoDate(new Date(now.getTime() - KEEP_DAYS * 86_400_000));
  const previous = readJson(archiveFile, { suggestions: [] }).suggestions ?? [];
  const keptDois = new Set(suggestions.map(s => s.doi));
  const merged = [
    ...suggestions,
    ...previous.filter(s => s.suggestedOn >= cutoff && !keptDois.has(s.doi)),
  ];
  fs.writeFileSync(
    archiveFile,
    JSON.stringify(
      {
        generatedAt: now.toISOString(),
        windowDays: KEEP_DAYS,
        journals: RELEVANT_JOURNALS.map(j => j.name),
        suggestions: merged,
      },
      null,
      2,
    ),
  );

  // Report index — newest first, drives the report picker in the UI.
  const dates = fs
    .readdirSync(REPORTS_DIR)
    .filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .map(f => f.slice(0, 10))
    .sort()
    .reverse();
  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify({ reports: dates }, null, 2));

  // Prune the seen-DOI state so it doesn't grow forever.
  const seenCutoff = isoDate(new Date(now.getTime() - SEEN_RETENTION_DAYS * 86_400_000));
  for (const [doi, date] of Object.entries(seen)) {
    if (date < seenCutoff) delete seen[doi];
  }
  fs.writeFileSync(seenFile, JSON.stringify(seen, null, 2));

  console.log(`Done: ${suggestions.length} new suggestions, ${merged.length} in rolling archive, ${dates.length} reports.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
