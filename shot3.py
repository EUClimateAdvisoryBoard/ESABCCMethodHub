import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 1920, "height": 1080})
        await pg.goto("file:///home/claude/setdeck2/settings3.html"); await pg.wait_for_timeout(500)
        n = await pg.evaluate("document.querySelectorAll('.slide').length")
        ks = [int(x) for x in sys.argv[1:]] or list(range(1, n + 1))
        for k in ks:
            await pg.evaluate(f"go({k-1})"); await pg.wait_for_timeout(700); await pg.screenshot(path=f"/home/claude/setdeck2/shots/s{k:02d}.png")
        # overflow check: any element extending past the slide box
        res = await pg.evaluate("""() => { const out = []; document.querySelectorAll('.slide').forEach((s, i) => { s.classList.add('active'); const r = s.getBoundingClientRect(); let worst = 0;
            s.querySelectorAll('*').forEach(e => { const q = e.getBoundingClientRect(); if (q.width && (q.bottom > r.bottom + 1 || q.right > r.right + 1)) worst = Math.max(worst, q.bottom - r.bottom, q.right - r.right); });
            const src = s.querySelector('.src'), ctr = s.querySelector('.ctr'); let hit = false; if (src && ctr) { const a = src.getBoundingClientRect(), c = ctr.getBoundingClientRect(); hit = a.bottom > c.top && a.right > c.left; }
            if (worst > 0 || hit) out.push([i + 1, Math.round(worst), hit]); s.classList.remove('active'); }); return out; }""")
        print('overflow:', res); await b.close()
asyncio.run(main())
