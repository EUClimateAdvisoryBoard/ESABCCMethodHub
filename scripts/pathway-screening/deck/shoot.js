const { chromium } = require('playwright');
(async () => {
  const [path, outdir, ...ks] = process.argv.slice(2);
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: Number(process.env.DSF || 1) });
  await pg.goto('file://' + path); await pg.waitForTimeout(500);
  const n = await pg.evaluate(() => document.querySelectorAll('.slide').length);
  const list = ks.length ? ks.map(Number) : Array.from({ length: n }, (_, i) => i + 1);
  for (const k of list) { await pg.evaluate(k => go(k - 1), k); await pg.waitForTimeout(400); await pg.screenshot({ path: `${outdir}/s${String(k).padStart(2, '0')}.png` }); }
  const res = await pg.evaluate(() => { const out = []; document.querySelectorAll('.slide').forEach((s, i) => { s.classList.add('active'); const r = s.getBoundingClientRect(); let worst = 0;
    s.querySelectorAll('*').forEach(e => { const q = e.getBoundingClientRect(); if (q.width && (q.bottom > r.bottom + 1 || q.right > r.right + 1)) worst = Math.max(worst, q.bottom - r.bottom, q.right - r.right); });
    if (worst > 0) out.push([i + 1, Math.round(worst)]); s.classList.remove('active'); }); return out; });
  console.log('slides', n, 'overflow:', JSON.stringify(res)); await b.close();
})();
