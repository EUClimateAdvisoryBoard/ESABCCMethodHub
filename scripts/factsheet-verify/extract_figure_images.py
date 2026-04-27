"""
Extract high-quality screenshots of each figure from every ESABCC report
and write them to public/fact-sheets/<report-id>/.

Strategy:
  1. For each PDF, iterate pages.
  2. Use pymupdf to find the bounding rect of every "Figure N" caption.
  3. Determine the figure bounding box relative to the caption:
     - If the caption is in the bottom half of the page: figure is ABOVE
       the caption. Crop [top_margin .. caption.y1 + pad].
     - Otherwise: figure is BELOW. Crop [caption.y0 - pad .. bottom_margin].
  4. Skip duplicate/TOC matches (captions found in "List of figures" near
     the start of the report, or page containing more than ~6 captions).
  5. Render the crop at 150 DPI, save as JPEG.

Writes an index JSON mapping report-id -> [ {figure_number, title, page,
image_path} ] that the factsheet data file can consume.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pymupdf  # PyMuPDF

ROOT = Path(__file__).resolve().parents[2]
REPORTS_DIR = ROOT / "esabcc-reports"
OUT_DIR = ROOT / "public" / "fact-sheets"

# Mapping from the factsheet builder's report id -> PDF filename.
MAP = {
    "2040-climate-target":   "scientific-advice-for-the-determination-of-an-eu-wide-2040-climate-target-and-a-greenhouse-gas-budget-for-2030-2050.pdf",
    "eu-climate-neutrality": "esabcc_report_towards-eu-climate-neutrality.pdf",
    "cdr-scaling":           "2025-02-21-scaling-up-carbon-dioxide-removals-recommendations-for-navigating-opportunities-and-risks-in-the-eu.pdf",
    "climate-law-advice":    "20250602_european-climate-law_advice-for-publication.pdf",
    "adaptation-report":     "20260217_adaptation-report.pdf",
    "agri-food-system":      "2026-03-1120260311_eu-agri-food-system-report.pdf",
    "energy-crisis":         "2023-02-07-recommendationspolicyresponsesenergycrisisclimateneutrality.pdf",
    "energy-infrastructure": "2023-03-15-towards-a-decarbonised-and-climate-resilient-eu-energy-infrastructure.pdf",
    "tene-scenarios":        "20240627advice-on-draft-scenarios-under-ten-e-regulation_for-publication.pdf",
    "setting-targets":       "setting-climate-targets-based-on.pdf",
}

CAPTION_RE = re.compile(
    r"^\s*Figure\s+(\d+(?:\.\d+)?)\s*[\.:\u2013\u2014\-]?\s+(.+?)\s*$",
    re.MULTILINE,
)

RENDER_DPI = 150
PAD = 8  # pt padding around crop
# Fallback crop extent when we cannot detect the Source/Notes block explicitly.
# Keeps legacy behaviour (so figures without a detectable notes block crop
# the same as before); the crop is extended past this only when Source/Notes
# lines are found sitting below the caption.
FALLBACK_EXTENT = 420

# Matches a "Source:", "Sources:", "Note:" or "Notes:" lead-in for the
# attribution block that usually sits directly below a figure.
NOTES_RE = re.compile(r"^\s*(?:Source|Sources|Note|Notes)\s*[:.\u2013\u2014-]", re.IGNORECASE)


def find_figure_captions(page: pymupdf.Page) -> list[dict]:
    """Find actual figure captions on the page (not TOC entries).

    A caption is detected when a text line starts with 'Figure N' followed
    by a caption string that does NOT end in dot-leader + page number.
    """
    captions: list[dict] = []
    blocks = page.get_text("blocks") or []
    for block in blocks:
        x0, y0, x1, y1, text, *_ = block
        text = text.strip()
        # Drop TOC entries: "Figure 7 Implications of ... ........ 38"
        if re.search(r"\.{5,}\s*\d+\s*$", text):
            continue
        # Drop list-of-figures block (many "Figure N" lines together)
        fig_count = len(re.findall(r"^\s*Figure\s+\d", text, re.MULTILINE))
        if fig_count >= 3:
            continue
        m = CAPTION_RE.match(text)
        if not m:
            continue
        number = m.group(1)
        title = re.sub(r"\s+", " ", m.group(2)).strip()
        if len(title) < 6:
            continue
        # Drop in-text references like "Figure 3 shows estimates ..." by
        # requiring the first word after the number to start with an
        # uppercase letter (real captions start sentence-case).
        first_word = title.split(" ", 1)[0]
        if not first_word or not first_word[0].isupper():
            continue
        # Drop captions that start with connector words even if capitalised
        if first_word.lower() in {"shows", "illustrates", "below", "above", "lists", "summarises", "summarizes", "represents", "demonstrates", "displays", "indicates"}:
            continue
        title = title[:180]
        captions.append({
            "number": number,
            "title": title,
            "bbox": (x0, y0, x1, y1),
        })
    return captions


def notes_span(
    blocks: list,
    y_start: float,
    y_end: float,
) -> tuple[float, float] | None:
    """Return (y0, y1) covering every Source/Notes text block in (y_start, y_end).

    ESABCC figures place the Source/Notes lines immediately below the chart.
    The first block lets us split the chart away from the notes; the last
    block is the crop's lower boundary for the full figure.
    """
    first_y0: float | None = None
    last_y1: float | None = None
    for b in blocks:
        _, by0, _, by1, btext, *_ = b
        if by0 <= y_start or by0 >= y_end:
            continue
        if NOTES_RE.match(btext or ""):
            first_y0 = by0 if first_y0 is None else min(first_y0, by0)
            last_y1 = by1 if last_y1 is None else max(last_y1, by1)
    if first_y0 is None or last_y1 is None:
        return None
    return first_y0, last_y1


def render_crop(page: pymupdf.Page, rect: pymupdf.Rect, out_path: Path) -> None:
    dpi_scale = RENDER_DPI / 72.0
    mat = pymupdf.Matrix(dpi_scale, dpi_scale)
    pix = page.get_pixmap(matrix=mat, clip=rect, alpha=False)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    pix.save(out_path, output="jpeg", jpg_quality=80)


def process(report_id: str, pdf_name: str) -> list[dict]:
    pdf_path = REPORTS_DIR / pdf_name
    if not pdf_path.exists():
        print(f"  [skip] missing {pdf_path}")
        return []

    out_dir = OUT_DIR / report_id
    # Wipe previous outputs so we never mix stale crops
    if out_dir.exists():
        for f in out_dir.glob("*.jpg"):
            f.unlink()

    doc = pymupdf.open(pdf_path)
    seen_numbers: set[str] = set()
    results: list[dict] = []

    for page_idx, page in enumerate(doc):
        captions = find_figure_captions(page)
        if not captions:
            continue

        page_rect = page.rect
        blocks = page.get_text("blocks") or []
        caption_tops_sorted = sorted(c["bbox"][1] for c in captions)

        for cap in captions:
            num = cap["number"]
            if num in seen_numbers:
                continue  # first-occurrence wins

            x0, y0, x1, y1 = cap["bbox"]
            caption_bottom = y1
            caption_top = y0

            # Cap crop at the start of the next figure on the same page
            # (otherwise we'd bleed two figures together).
            next_cap_top = next(
                (t for t in caption_tops_sorted if t > caption_bottom + 20),
                page_rect.y1,
            )
            page_bottom_limit = min(page_rect.y1 - 30, next_cap_top - 8)

            x_left = page_rect.x0 + 40
            x_right = page_rect.x1 - 40

            # Heuristic crop: figure is usually ABOVE caption in ESABCC layout.
            # Crop from top-of-page content area to caption bottom.
            # If the caption is in the upper half, figure is BELOW.
            if caption_top < page_rect.height * 0.45:
                # Caption sits at the top; chart + Source/Notes are below it.
                span = notes_span(blocks, caption_bottom, page_bottom_limit)
                if span is not None:
                    notes_y0, notes_y1 = span
                    full_top = caption_top - PAD
                    full_bottom = min(notes_y1 + PAD, page_bottom_limit)
                    chart_top = full_top
                    # Split exactly at the top of the Source/Notes text so
                    # neither crop contains a sliver of the other (the chart
                    # legend often sits right above the Sources line).
                    chart_bottom = max(caption_bottom + 10, notes_y0)
                    notes_top = notes_y0
                    notes_bottom = full_bottom
                else:
                    full_top = caption_top - PAD
                    full_bottom = min(caption_top + FALLBACK_EXTENT, page_bottom_limit)
                    chart_top, chart_bottom = full_top, full_bottom
                    notes_top = notes_bottom = None
            else:
                # Caption sits below the chart; Source/Notes may follow the caption.
                span = notes_span(blocks, caption_bottom, page_bottom_limit)
                top_floor = max(page_rect.y0 + 60, caption_bottom - FALLBACK_EXTENT)
                if span is not None:
                    notes_y0, notes_y1 = span
                    full_top = top_floor
                    full_bottom = min(notes_y1 + PAD, page_bottom_limit)
                    chart_top = full_top
                    chart_bottom = max(caption_bottom + PAD, notes_y0)
                    notes_top = notes_y0
                    notes_bottom = full_bottom
                else:
                    full_top = top_floor
                    full_bottom = min(caption_bottom + PAD, page_bottom_limit)
                    chart_top, chart_bottom = full_top, full_bottom
                    notes_top = notes_bottom = None

            full_crop = pymupdf.Rect(x_left, full_top, x_right, full_bottom) & page_rect
            chart_crop = pymupdf.Rect(x_left, chart_top, x_right, chart_bottom) & page_rect

            out_name = f"figure-{num}.jpg"
            out_path = out_dir / out_name
            chart_name = f"figure-{num}-chart.jpg"
            chart_path = out_dir / chart_name
            notes_name = f"figure-{num}-notes.jpg"
            notes_path = out_dir / notes_name

            try:
                render_crop(page, full_crop, out_path)
                render_crop(page, chart_crop, chart_path)
            except Exception as e:
                print(f"    [warn] render failed for {report_id} fig {num}: {e}")
                continue

            notes_rel_path = None
            if notes_top is not None and notes_bottom is not None and notes_bottom > notes_top:
                notes_crop = pymupdf.Rect(x_left, notes_top, x_right, notes_bottom) & page_rect
                try:
                    render_crop(page, notes_crop, notes_path)
                    notes_rel_path = f"/fact-sheets/{report_id}/{notes_name}"
                except Exception as e:
                    print(f"    [warn] notes render failed for {report_id} fig {num}: {e}")

            results.append({
                "figureNumber": num,
                "title": cap["title"],
                "page": page_idx + 1,
                "imagePath": f"/fact-sheets/{report_id}/{out_name}",
                "imagePathChart": f"/fact-sheets/{report_id}/{chart_name}",
                "imagePathNotes": notes_rel_path,
            })
            seen_numbers.add(num)

    doc.close()

    # Sort by figure number (numeric sort)
    def _key(r):
        try:
            return float(r["figureNumber"])
        except ValueError:
            return 9999.0
    results.sort(key=_key)
    return results


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    index: dict[str, list[dict]] = {}
    for report_id, pdf in MAP.items():
        print(f"[process] {report_id} :: {pdf}")
        figs = process(report_id, pdf)
        print(f"  -> {len(figs)} figures extracted")
        index[report_id] = figs
    (OUT_DIR / "_index.json").write_text(json.dumps(index, indent=2, ensure_ascii=False))
    print("\nWrote index:", OUT_DIR / "_index.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
