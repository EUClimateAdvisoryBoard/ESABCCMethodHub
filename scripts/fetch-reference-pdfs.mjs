#!/usr/bin/env node
/**
 * Reference PDF fetcher.
 * ----------------------
 * Walks every reference in the custom / live stack
 * (public/data/custom-references.json) that has no usable PDF attached,
 * resolves a legal open-access PDF for it, downloads the file and attaches
 * it to the reference:
 *
 *   - with Supabase credentials in the environment, the PDF is uploaded to
 *     the public `reference-pdfs` storage bucket (the same bucket the
 *     Reference Manager UI uploads to — see src/lib/references/pdf-storage.ts)
 *     and `pdfUrl` is set to the bucket's public URL;
 *   - without credentials, the PDF is saved under public/reference-pdfs/
 *     and `pdfUrl` is set to the same-origin path /reference-pdfs/<id>.pdf,
 *     which the annotate viewer can load without any CORS dance.
 *
 * PDF resolution order (first hit wins):
 *   1. scripts/data/reference-pdf-sources.json — hand-verified OA URLs
 *   2. Unpaywall   https://api.unpaywall.org/v2/<doi>
 *   3. OpenAlex    https://api.openalex.org/works/doi:<doi>
 *   4. The DOI landing page's `citation_pdf_url` meta tag (same extraction
 *      rules as src/app/api/references/fetch-pdf/route.ts)
 *
 * Only open-access copies are fetched — paywalled references are left
 * untouched and listed in the report so a human can upload a licensed copy
 * through the UI.
 *
 * Outputs:
 *   - public/data/custom-references.json   (pdfUrl filled in)
 *   - public/reference-pdfs/<id>.pdf        (no-credentials mode only)
 *   - docs/reference/reference-pdfs.md      (human-readable attach report)
 *
 * NETWORK: like scripts/tag-eu-funded-references.mjs this must run where the
 * scholarly APIs are reachable (a developer machine or the companion GitHub
 * Actions workflow .github/workflows/fetch-reference-pdfs.yml) — NOT inside
 * the restricted Claude Code sandbox, whose network policy blocks them.
 *
 * Usage:
 *   node scripts/fetch-reference-pdfs.mjs               # full run
 *   node scripts/fetch-reference-pdfs.mjs --dry-run     # resolve only, no writes
 *   node scripts/fetch-reference-pdfs.mjs --force       # refetch even if pdfUrl set
 *   node scripts/fetch-reference-pdfs.mjs --limit 5     # first 5 refs (smoke test)
 *
 * Env (all optional):
 *   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY
 *     (the reference-pdfs bucket accepts anon uploads — migration 060)
 *   UNPAYWALL_EMAIL — contact address for the Unpaywall API
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ── CLI flags ───────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : dflt;
};
const DRY_RUN = flag('--dry-run');
const FORCE = flag('--force');
const LIMIT = parseInt(opt('--limit', '0'), 10) || 0; // 0 = no limit

// ── Constants ────────────────────────────────────────────────────────────────
const REFS_PATH = join(ROOT, 'public/data/custom-references.json');
const SOURCES_PATH = join(ROOT, 'scripts/data/reference-pdf-sources.json');
const LOCAL_PDF_DIR = join(ROOT, 'public/reference-pdfs');
const REPORT_PATH = join(ROOT, 'docs/reference/reference-pdfs.md');
const BUCKET = 'reference-pdfs';
const MAX_BYTES = 30 * 1024 * 1024; // 30 MB per file
const POLITE_UA =
  'ESABCC-ReferenceManager/1.0 (mailto:refs@climate-advisory-board.europa.eu)';
// Some publishers (notably ScienceDirect) bot-block the polite UA; the
// landing-page fallback uses a browser-like UA, same as the in-app proxy.
const BROWSER_UA =
  'Mozilla/5.0 (compatible; ESABCC-RefManager/1.0; +https://methodhub.vercel.app)';
const UNPAYWALL_EMAIL =
  process.env.UNPAYWALL_EMAIL || 'refs@climate-advisory-board.europa.eu';

const SUPABASE_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ''
).replace(/\/$/, '');
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';
const HAVE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_KEY);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Mirror of safeKey() in src/lib/references/pdf-storage.ts so the object key
// matches what the UI would produce for the same reference id.
function safeKey(refId) {
  return refId.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 200);
}

// ── HTML → PDF-link extraction (same rules as the in-app fetch-pdf proxy) ────
function extractPdfUrlFromHtml(html, baseUrl) {
  const patterns = [
    /<meta[^>]+name=["']citation_pdf_url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']citation_pdf_url["']/i,
    /<link[^>]+type=["']application\/pdf["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+type=["']application\/pdf["']/i,
    /<a[^>]+href=["']([^"']+\.pdf(?:\?[^"']*)?)["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      try {
        return new URL(m[1], baseUrl).toString();
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

async function fetchWithRetry(url, init = {}, attempts = 3) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const resp = await fetch(url, { redirect: 'follow', ...init });
      if (resp.status === 429 || resp.status >= 500) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      return resp;
    } catch (e) {
      if (attempt === attempts - 1) throw e;
      await sleep(1000 * 2 ** attempt);
    }
  }
  throw new Error(`unreachable: ${url}`);
}

// ── OA resolution ────────────────────────────────────────────────────────────
async function resolveViaUnpaywall(doi) {
  try {
    const resp = await fetchWithRetry(
      `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(UNPAYWALL_EMAIL)}`,
      { headers: { 'User-Agent': POLITE_UA, Accept: 'application/json' } },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data?.is_oa) return null;
    const locs = [data.best_oa_location, ...(data.oa_locations || [])].filter(Boolean);
    for (const loc of locs) {
      if (loc.url_for_pdf) return { url: loc.url_for_pdf, via: 'unpaywall' };
    }
    // Fall back to the landing URL — the landing-page scraper may find the PDF.
    if (data.best_oa_location?.url) {
      return { url: data.best_oa_location.url, via: 'unpaywall-landing', isLanding: true };
    }
  } catch {
    /* fall through */
  }
  return null;
}

async function resolveViaOpenAlex(doi) {
  try {
    const resp = await fetchWithRetry(
      `https://api.openalex.org/works/doi:${encodeURIComponent(doi)}?mailto=${encodeURIComponent(UNPAYWALL_EMAIL)}`,
      { headers: { 'User-Agent': POLITE_UA, Accept: 'application/json' } },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const pdf =
      data?.best_oa_location?.pdf_url ||
      data?.primary_location?.pdf_url ||
      (data?.locations || []).find((l) => l?.pdf_url)?.pdf_url;
    if (pdf) return { url: pdf, via: 'openalex' };
  } catch {
    /* fall through */
  }
  return null;
}

async function resolveViaLandingPage(url) {
  try {
    const resp = await fetchWithRetry(url, {
      headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html,application/pdf' },
    });
    if (!resp.ok) return null;
    const type = (resp.headers.get('content-type') || '').toLowerCase();
    if (type.includes('application/pdf')) {
      return { url: resp.url, via: 'landing-direct' };
    }
    if (type.includes('text/html')) {
      const html = await resp.text();
      const pdfUrl = extractPdfUrlFromHtml(html, resp.url);
      if (pdfUrl) return { url: pdfUrl, via: 'landing-meta' };
    }
  } catch {
    /* fall through */
  }
  return null;
}

// ── Download + validate ──────────────────────────────────────────────────────
async function downloadPdf(url) {
  const resp = await fetchWithRetry(url, {
    headers: { 'User-Agent': BROWSER_UA, Accept: 'application/pdf,*/*' },
  });
  if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) {
    return { ok: false, error: `too large (${(buf.byteLength / 1e6).toFixed(1)} MB)` };
  }
  // Content-Type lies often enough that the magic bytes are the real check.
  if (!buf.subarray(0, 1024).includes('%PDF-')) {
    return { ok: false, error: 'not a PDF (missing %PDF- magic)' };
  }
  return { ok: true, buf };
}

// ── Attach (Supabase bucket or local public/ dir) ────────────────────────────
async function uploadToSupabase(refId, buf) {
  const key = `${safeKey(refId)}.pdf`;
  const resp = await fetchWithRetry(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${key}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/pdf',
        'x-upsert': 'true',
        'Cache-Control': 'max-age=3600',
      },
      body: buf,
    },
  );
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    return { ok: false, error: `upload HTTP ${resp.status}: ${text.slice(0, 200)}` };
  }
  return {
    ok: true,
    publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${key}`,
  };
}

function saveLocally(refId, buf) {
  mkdirSync(LOCAL_PDF_DIR, { recursive: true });
  const key = `${safeKey(refId)}.pdf`;
  writeFileSync(join(LOCAL_PDF_DIR, key), buf);
  return { ok: true, publicUrl: `/reference-pdfs/${key}` };
}

// Existing bucket attachments can have gone stale (objects deleted by hand);
// treat a non-200 HEAD as "no PDF attached".
async function existingPdfAlive(url) {
  if (!url) return false;
  if (url.startsWith('/')) return existsSync(join(ROOT, 'public', url));
  try {
    const resp = await fetchWithRetry(url, {
      method: 'HEAD',
      headers: { 'User-Agent': POLITE_UA },
    });
    return resp.ok;
  } catch {
    return false;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const refs = JSON.parse(readFileSync(REFS_PATH, 'utf8'));
  const sources = existsSync(SOURCES_PATH)
    ? JSON.parse(readFileSync(SOURCES_PATH, 'utf8'))
    : {};

  const curatedCount = Object.keys(sources).filter((k) => !k.startsWith('_')).length;
  console.log(
    `fetch-reference-pdfs: ${refs.length} refs, ` +
      `${curatedCount} curated sources, ` +
      `attach target = ${HAVE_SUPABASE ? 'supabase bucket' : 'public/reference-pdfs/'}` +
      `${DRY_RUN ? ' [dry-run]' : ''}`,
  );

  const results = [];
  let processed = 0;
  let attached = 0;

  for (const ref of refs) {
    if (LIMIT && processed >= LIMIT) break;

    if (!FORCE && (await existingPdfAlive(ref.pdfUrl))) {
      results.push({ ref, status: 'already-attached', detail: ref.pdfUrl });
      continue;
    }
    processed++;

    // Build the candidate list. The curated manifest wins; APIs follow.
    const curated = sources[ref.id];
    const candidates = [];
    if (curated?.pdfUrl) candidates.push({ url: curated.pdfUrl, via: 'curated' });
    if (ref.doi) {
      const up = await resolveViaUnpaywall(ref.doi);
      if (up && !up.isLanding) candidates.push(up);
      const oa = await resolveViaOpenAlex(ref.doi);
      if (oa) candidates.push(oa);
      if (up?.isLanding) candidates.push(up);
      candidates.push({ url: `https://doi.org/${ref.doi}`, via: 'doi-landing', isLanding: true });
    } else if (ref.url) {
      candidates.push({ url: ref.url, via: 'ref-url-landing', isLanding: true });
    }

    if (candidates.length === 0) {
      results.push({ ref, status: 'no-source', detail: 'no DOI, URL or curated source' });
      continue;
    }

    let attachedUrl = null;
    let via = null;
    let lastError = 'no open-access copy found';

    for (const cand of candidates) {
      let pdfCandidate = cand;
      if (cand.isLanding) {
        const fromLanding = await resolveViaLandingPage(cand.url);
        if (!fromLanding) continue;
        pdfCandidate = { ...fromLanding, via: `${cand.via}→${fromLanding.via}` };
      }
      const dl = await downloadPdf(pdfCandidate.url);
      if (!dl.ok) {
        lastError = `${pdfCandidate.via}: ${dl.error}`;
        continue;
      }
      if (DRY_RUN) {
        attachedUrl = `(dry-run) ${pdfCandidate.url}`;
        via = pdfCandidate.via;
        break;
      }
      const stored = HAVE_SUPABASE
        ? await uploadToSupabase(ref.id, dl.buf)
        : saveLocally(ref.id, dl.buf);
      if (!stored.ok) {
        lastError = stored.error;
        continue;
      }
      attachedUrl = stored.publicUrl;
      via = pdfCandidate.via;
      break;
    }

    if (attachedUrl) {
      attached++;
      if (!DRY_RUN) ref.pdfUrl = attachedUrl;
      results.push({ ref, status: 'attached', detail: `${via} → ${attachedUrl}` });
      console.log(`  ✓ ${ref.id}  (${via})`);
    } else {
      results.push({ ref, status: 'not-found', detail: lastError });
      console.log(`  ✗ ${ref.id}  ${lastError}`);
    }

    await sleep(500); // stay polite across publishers
  }

  if (!DRY_RUN) {
    writeFileSync(REFS_PATH, JSON.stringify(refs, null, 2) + '\n');
    writeReport(results);
  }

  const skipped = results.filter((r) => r.status === 'already-attached').length;
  const missing = results.filter((r) => r.status === 'not-found' || r.status === 'no-source').length;
  console.log(
    `done: ${attached} attached, ${skipped} already attached, ${missing} without an OA copy`,
  );
}

function writeReport(results) {
  const lines = [
    '# Reference PDFs — attachment report',
    '',
    `Generated by \`scripts/fetch-reference-pdfs.mjs\` on ${new Date().toISOString().slice(0, 10)}.`,
    'Only open-access copies are fetched automatically; references listed as',
    '*no OA copy* need a licensed PDF uploaded by hand through the Reference',
    'Manager UI.',
    '',
    '| Reference | Status | Detail |',
    '|-----------|--------|--------|',
  ];
  for (const { ref, status, detail } of results) {
    const label = `${ref.authors ? ref.authors.split(';')[0] : ref.id} (${ref.year || 'n.d.'})`;
    const statusLabel =
      status === 'attached' ? '✅ attached'
      : status === 'already-attached' ? '✅ already attached'
      : status === 'no-source' ? '⚠️ no identifier'
      : '❌ no OA copy';
    lines.push(`| ${label} | ${statusLabel} | ${detail.replace(/\|/g, '\\|')} |`);
  }
  lines.push('');
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, lines.join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
