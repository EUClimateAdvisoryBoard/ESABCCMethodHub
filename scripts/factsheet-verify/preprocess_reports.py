"""
Preprocess ESABCC report PDFs to extract text, figure captions, and tables.

For each report we write:
  - <stem>.text.txt    : full plain-text dump, one page delimiter per page
  - <stem>.figures.json: list of figure captions we could detect + page numbers
  - <stem>.tables.json : tables we could extract with pdfplumber

The output is the raw material we need in order to compare the numbers
currently hard-coded in src/data/fact-sheets-reports.ts against what the
reports actually contain.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pdfplumber

REPORTS_DIR = Path(__file__).resolve().parents[2] / "esabcc-reports"
OUT_DIR = Path(__file__).resolve().parent / "extracted"
OUT_DIR.mkdir(parents=True, exist_ok=True)

FIGURE_RE = re.compile(
    r"(?:^|\s)(Figure|Fig\.)\s+([0-9]+(?:\.[0-9]+)?)[\s:\.\-]+([^\n]{0,200})",
    re.IGNORECASE,
)
TABLE_RE = re.compile(
    r"(?:^|\s)(Table)\s+([0-9]+(?:\.[0-9]+)?)[\s:\.\-]+([^\n]{0,200})",
    re.IGNORECASE,
)


def _clean(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def preprocess(pdf_path: Path) -> dict:
    stem = pdf_path.stem
    out_text = OUT_DIR / f"{stem}.text.txt"
    out_fig = OUT_DIR / f"{stem}.figures.json"
    out_tbl = OUT_DIR / f"{stem}.tables.json"

    figures: list[dict] = []
    tables: list[dict] = []
    page_count = 0

    with pdfplumber.open(pdf_path) as pdf, out_text.open("w", encoding="utf-8") as txt_fh:
        page_count = len(pdf.pages)
        for i, page in enumerate(pdf.pages, start=1):
            try:
                text = page.extract_text() or ""
            except Exception as e:
                text = f"[extract_text error: {e}]"

            txt_fh.write(f"\n===== PAGE {i} =====\n")
            txt_fh.write(text)
            txt_fh.write("\n")

            # Find figure / table captions in the page text
            for m in FIGURE_RE.finditer(text):
                figures.append(
                    {
                        "page": i,
                        "number": m.group(2),
                        "caption": _clean(m.group(3)),
                    }
                )
            for m in TABLE_RE.finditer(text):
                tables.append(
                    {
                        "page": i,
                        "number": m.group(2),
                        "caption": _clean(m.group(3)),
                    }
                )

            # Actual tabular data
            try:
                page_tables = page.extract_tables() or []
            except Exception:
                page_tables = []
            for ti, t in enumerate(page_tables):
                if not t:
                    continue
                tables.append(
                    {
                        "page": i,
                        "table_index_on_page": ti,
                        "rows": [[(c or "").strip() for c in row] for row in t],
                    }
                )

    out_fig.write_text(json.dumps(figures, indent=2, ensure_ascii=False))
    out_tbl.write_text(json.dumps(tables, indent=2, ensure_ascii=False))

    return {
        "pdf": pdf_path.name,
        "pages": page_count,
        "figure_captions": len(figures),
        "tables": len(tables),
        "text_file": out_text.name,
        "figures_file": out_fig.name,
        "tables_file": out_tbl.name,
    }


def main(argv: list[str]) -> int:
    if argv:
        targets = [REPORTS_DIR / a for a in argv]
    else:
        targets = sorted(REPORTS_DIR.glob("*.pdf"))

    summary = []
    for pdf in targets:
        if not pdf.exists():
            print(f"[skip] missing: {pdf}")
            continue
        print(f"[process] {pdf.name} ...", flush=True)
        summary.append(preprocess(pdf))
        print(f"  pages={summary[-1]['pages']} "
              f"figs={summary[-1]['figure_captions']} "
              f"tables={summary[-1]['tables']}")

    (OUT_DIR / "_summary.json").write_text(json.dumps(summary, indent=2))
    print("\nDone. Summary written to", OUT_DIR / "_summary.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
