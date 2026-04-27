#!/usr/bin/env python3
"""Fetch all ESABCC report PDFs from the EU Climate Advisory Board website.

Scrapes https://climate-advisory-board.europa.eu/reports-and-publications ,
follows the links to individual report pages, and downloads every PDF it finds
into esabcc-reports/ at the repo root.

Intended to run from GitHub Actions (GitHub runners can reach europa.eu) but
also works locally if the network permits.
"""
from __future__ import annotations

import os
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

BASE = "https://climate-advisory-board.europa.eu"
LISTING_URL = f"{BASE}/reports-and-publications"
OUT_DIR = Path(__file__).resolve().parent.parent / "esabcc-reports"

USER_AGENT = (
    "Mozilla/5.0 (compatible; ESABCC-archive-bot/1.0; "
    "+https://github.com/sebastianfra/eu-climate-policy)"
)

# Seed URLs of known report PDFs. The scraper below will also discover new
# ones, but listing them here guarantees they are fetched even if the listing
# page layout changes.
SEED_PDF_URLS = [
    # 2022-11-14 Recommendations to ACER (energy infrastructure)
    f"{BASE}/reports-and-publications/towards-a-climate-neutral-and-climate-resilient-eu-energy-infrastructure-recommendations-to-acer",
    # 2023-01-16 Setting climate targets based on scientific evidence and EU values
    f"{BASE}/reports-and-publications/setting-climate-targets-based-on-scientific-evidence-and-eu-values-initial-recommendations-to-the-european-commission/setting-climate-targets-based-on.pdf/@@download/file",
    # 2023-02-07 Addressing the energy crisis
    f"{BASE}/reports-and-publications/addressing-the-energy-crisis-while-delivering-on-eus-climate-objectives-recommendations-to-policy-makers/2023-02-07-recommendationspolicyresponsesenergycrisisclimateneutrality.pdf/@@download/file",
    # 2023-03-15 Decarbonised & climate-resilient EU energy infrastructure (CBA)
    f"{BASE}/reports-and-publications/towards-a-decarbonised-and-climate-resilient-eu-energy-infrastructure-recommendations-on-an-energy-system-wide-cost-benefit-analysis/2023-03-15-towards-a-decarbonised-and-climate-resilient-eu-energy-infrastructure.pdf/@@download/file",
    # 2023-06 Scientific advice for the EU 2040 climate target
    f"{BASE}/reports-and-publications/scientific-advice-for-the-determination-of-an-eu-wide-2040/scientific-advice-for-the-determination-of-an-eu-wide-2040-climate-target-and-a-greenhouse-gas-budget-for-2030-2050.pdf/@@download/file",
    # 2024-01-18 Towards EU climate neutrality: progress, policy gaps and opportunities
    f"{BASE}/reports-and-publications/towards-eu-climate-neutrality-progress-policy-gaps-and-opportunities/esabcc_report_towards-eu-climate-neutrality.pdf/@@download/file",
    # 2024-06-27 Advice on draft scenarios under the TEN-E regulation
    f"{BASE}/reports-and-publications/towards-climate-neutral-and-resilient-energy-networks-across-europe-advice-on-draft-scenarios-under-the-eu-regulation-on-trans-european-energy-networks/20240627advice-on-draft-scenarios-under-ten-e-regulation_for-publication.pdf/@@download/file",
    # 2025-02-21 Scaling up carbon dioxide removals
    f"{BASE}/reports-and-publications/2025-02-21-scaling-up-carbon-dioxide-removals-recommendations-for-navigating-opportunities-and-risks-in-the-eu.pdf/@@download/file",
    # 2025-06-02 Scientific advice for amending the European Climate Law
    f"{BASE}/reports-and-publications/20250602_european-climate-law_advice-for-publication.pdf/@@download/file",
    # 2026-02-17 Strengthening Resilience to Climate Change (adaptation)
    f"{BASE}/reports-and-publications/20260217_adaptation-report.pdf/@@download/file",
    # 2026-03-11 Climate adaptation and mitigation in the agri-food system
    f"{BASE}/reports-and-publications/2026-03-1120260311_eu-agri-food-system-report.pdf/@@download/file",
    # 2026-03-11 Agri-food system — technical annex
    f"{BASE}/reports-and-publications/2026-03-11-eu-agri-food-system-report_technical_annex.pdf/@@download/file",
]


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def decode(data: bytes) -> str:
    return data.decode("utf-8", errors="replace")


PDF_HREF_RE = re.compile(
    r'href="([^"#]+?\.pdf(?:/@@(?:download|display-file)/file)?)"',
    re.IGNORECASE,
)
ITEM_HREF_RE = re.compile(
    r'href="(/reports-and-publications/[^"#?]+)"',
    re.IGNORECASE,
)


def absolute(href: str) -> str:
    return urllib.parse.urljoin(BASE + "/", href)


def find_pdf_urls(html: str) -> set[str]:
    urls: set[str] = set()
    for m in PDF_HREF_RE.finditer(html):
        full = absolute(m.group(1))
        if "climate-advisory-board.europa.eu" in full:
            urls.add(full)
    return urls


def find_item_urls(html: str) -> set[str]:
    urls: set[str] = set()
    for m in ITEM_HREF_RE.finditer(html):
        href = m.group(1)
        if href.lower().endswith(".pdf") or "@@" in href:
            continue
        if href.rstrip("/") in ("/reports-and-publications",):
            continue
        urls.add(absolute(href))
    return urls


def filename_for(url: str) -> str:
    path = urllib.parse.urlparse(url).path
    path = re.sub(r"/@@(?:download|display-file)/file$", "", path)
    name = os.path.basename(path)
    # Decode percent-encoding and collapse stray whitespace.
    return urllib.parse.unquote(name).strip()


def discover_pdf_urls() -> set[str]:
    pdfs: set[str] = set()
    # Start with the known seeds (URLs that already point at a PDF); the
    # non-PDF entries in SEED_PDF_URLS are landing pages that will be crawled
    # below.
    pdfs.update(u for u in SEED_PDF_URLS if u.lower().endswith((".pdf", "/file")))

    try:
        listing = decode(fetch(LISTING_URL))
    except Exception as e:
        print(f"WARN: could not fetch listing {LISTING_URL}: {e}", file=sys.stderr)
        return pdfs

    pdfs.update(find_pdf_urls(listing))

    item_urls: set[str] = set()
    item_urls.update(find_item_urls(listing))
    item_urls.update(
        u for u in SEED_PDF_URLS if not u.lower().endswith((".pdf", "/file"))
    )

    for iurl in sorted(item_urls):
        try:
            html = decode(fetch(iurl))
        except Exception as e:
            print(f"WARN: could not fetch {iurl}: {e}", file=sys.stderr)
            continue
        pdfs.update(find_pdf_urls(html))

    return pdfs


def download_all(pdf_urls: set[str]) -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    new_or_updated = 0
    for url in sorted(pdf_urls):
        name = filename_for(url)
        if not name:
            continue
        if not name.lower().endswith(".pdf"):
            name += ".pdf"
        out = OUT_DIR / name
        if out.exists() and out.stat().st_size > 0:
            print(f"skip (exists): {name}")
            continue
        print(f"downloading:   {url}")
        try:
            data = fetch(url)
        except Exception as e:
            print(f"  ERROR: {e}", file=sys.stderr)
            continue
        if not data.startswith(b"%PDF"):
            print(f"  WARN: response for {url} is not a PDF; skipping", file=sys.stderr)
            continue
        out.write_bytes(data)
        new_or_updated += 1
        print(f"  saved -> {out.relative_to(OUT_DIR.parent)} ({len(data):,} bytes)")
    return new_or_updated


def main() -> int:
    print(f"Discovering ESABCC PDFs from {LISTING_URL} ...")
    pdf_urls = discover_pdf_urls()
    print(f"Discovered {len(pdf_urls)} PDF URL(s).")
    added = download_all(pdf_urls)
    total = len(list(OUT_DIR.glob("*.pdf"))) if OUT_DIR.exists() else 0
    print(f"\nDone. Added/updated {added}; {total} PDF(s) now in {OUT_DIR}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
