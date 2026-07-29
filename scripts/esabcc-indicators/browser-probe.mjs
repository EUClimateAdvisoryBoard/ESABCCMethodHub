#!/usr/bin/env node
/**
 * Headless-browser probe for indicator sources that have no plain API.
 * ===========================================================================
 *
 * WHY THE LAUNCH CONFIG BELOW MATTERS
 * -----------------------------------
 * Chromium fails against *every* HTTPS host in the Claude Code web sandbox —
 * including example.com — with `ERR_CONNECTION_RESET`, which looks exactly like
 * the target site blocking you. It is not. The session's egress proxy
 * re-terminates TLS and cannot complete Chromium's TLS 1.3 handshake, so the
 * connection is reset before any request is made.
 *
 * `--ssl-version-max=tls1.2` fixes it. That constrains the TLS version; it does
 * NOT disable certificate verification, and the proxy is still used. Do not
 * "fix" this with --ignore-certificate-errors.
 *
 * Two further gotchas on europa.eu properties:
 *   • The proxy only accepts HTTPS CONNECT tunnels, so plain-HTTP sites cannot
 *     be loaded at all (this is what blocks the Cembureau tracker, which has no
 *     working HTTPS certificate).
 *   • Embedded content sits behind the EC cookie-consent iframe
 *     (webtools.europa.eu/crs/iframe). The embed does not load until consent is
 *     accepted, so a naive scrape sees an empty shell.
 *
 * WHAT IT FOUND (July 2026)
 * -------------------------
 *   I7c  Cefic exposes a WordPress REST API — /wp-json/wp/v2/gips, 238 projects
 *        (214 in the EU-27), with taxonomy-country for the country mapping. No
 *        browser needed once you know the endpoint. The catch is that the only
 *        date on a project is its website posting date, which does not
 *        reproduce the report's own 2023 count (135 vs 171): the map has been
 *        re-curated, so a comparable time series cannot be rebuilt from it.
 *   B4   The Building Stock Observatory database is a Power BI embed,
 *        reportId 5ca1ef93-d90b-43f9-94bc-0bdc51876f9d, behind the consent
 *        iframe. Extracting figures means either driving the report UI or
 *        replaying its querydata calls — not yet done.
 *
 * Usage:  node scripts/esabcc-indicators/browser-probe.mjs <url> [waitMs]
 *
 * Requires playwright-core and the Chromium in PLAYWRIGHT_BROWSERS_PATH
 * (preinstalled in this image; do NOT run `playwright install`).
 */
import { chromium } from 'playwright-core';

const CHROMIUM =
  process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

/** The launch options that actually work behind the session's TLS-intercepting proxy. */
export const LAUNCH = {
  executablePath: CHROMIUM,
  proxy: { server: process.env.HTTPS_PROXY || 'http://127.0.0.1:38353' },
  args: [
    '--no-sandbox',
    // Required: the egress proxy cannot complete Chromium's TLS 1.3 handshake.
    '--ssl-version-max=tls1.2',
  ],
};

/** Click through the EC cookie banner, which otherwise blocks embedded content. */
export async function acceptEcCookies(page) {
  for (const sel of [
    'text=Accept all cookies',
    'button:has-text("Accept all")',
    '#cookie-consent-banner button',
  ]) {
    try {
      await page.click(sel, { timeout: 4000 });
      return true;
    } catch { /* banner absent or already dismissed */ }
  }
  return false;
}

async function main() {
  const url = process.argv[2];
  const waitMs = Number(process.argv[3] || 20000);
  if (!url) {
    console.error('usage: browser-probe.mjs <url> [waitMs]');
    process.exit(1);
  }
  const browser = await chromium.launch(LAUNCH);
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const data = [];
  page.on('response', r => {
    const u = r.url();
    const ct = r.headers()['content-type'] || '';
    if (/json|csv|sheet|excel|octet/i.test(ct) || /\.(json|csv|xlsx)(\?|$)/i.test(u)) {
      data.push(`${r.status()} ${ct.split(';')[0].padEnd(26)} ${u.slice(0, 160)}`);
    }
  });

  let status = 'n/a';
  try {
    const r = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 75000 });
    status = r ? r.status() : 'null';
    await acceptEcCookies(page);
    await page.waitForTimeout(waitMs);
  } catch (e) {
    status = `ERR ${e.message.split('\n')[0]}`;
  }

  console.log(`\n${url}\n  HTTP ${status}`);
  console.log(`\n  data responses (${data.length}):`);
  [...new Set(data)].slice(0, 25).forEach(d => console.log('    ' + d));
  const frames = page.frames().map(f => f.url()).filter(u => u && u !== 'about:blank');
  if (frames.length > 1) {
    console.log('\n  frames:');
    [...new Set(frames)].forEach(f => console.log('    ' + f.slice(0, 160)));
  }
  const text = await page
    .evaluate(() => document.body?.innerText?.slice(0, 600) || '')
    .catch(() => '');
  console.log('\n  page text:', JSON.stringify(text.replace(/\s+/g, ' ').slice(0, 400)));
  await browser.close();
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main().catch(e => { console.error(e); process.exit(1); });
}
