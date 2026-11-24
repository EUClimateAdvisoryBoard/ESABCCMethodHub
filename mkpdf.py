import asyncio
from playwright.async_api import async_playwright
from PIL import Image
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1.5)
        await pg.goto("file:///home/claude/setdeck2/settings3.html"); await pg.wait_for_timeout(800)
        n = await pg.evaluate("document.querySelectorAll('.slide').length")
        for k in range(n):
            await pg.evaluate(f"go({k})"); await pg.wait_for_timeout(600); await pg.screenshot(path=f"pdfshots/p{k + 1:02d}.png")
        await b.close(); return n
n = asyncio.run(main())
ims = [Image.open(f"pdfshots/p{k + 1:02d}.png").convert('RGB') for k in range(n)]
ims[0].save('/mnt/user-data/outputs/Three_pathway_sets_EU_2040_2050.pdf', save_all=True, append_images=ims[1:], resolution=144)
print(n)
