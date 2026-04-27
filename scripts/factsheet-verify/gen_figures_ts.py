"""
Regenerate the `figures: [...]` block of each report in
src/data/fact-sheets-reports.ts from public/fact-sheets/_index.json.

Writes the new figures-object array to stdout (one TS block per report).
Not used at runtime; run manually when PDF screenshots change.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
IDX = ROOT / "public" / "fact-sheets" / "_index.json"


def ts_string(s: str) -> str:
    return s.replace("\\", "\\\\").replace("'", "\\'")


def main() -> None:
    idx = json.loads(IDX.read_text())
    for report_id, figs in idx.items():
        print(f"\n// ---------- {report_id} ({len(figs)} figures) ----------")
        print("    figures: [")
        for f in figs:
            num = f["figureNumber"]
            page = f["page"]
            title = ts_string(f["title"])
            img = f["imagePath"]
            print("      {")
            print(f"        id: '{report_id}-fig-{num}',")
            print(f"        figureNumber: '{num}',")
            print(f"        title: 'Figure {num}. {title}',")
            print(f"        imageSrc: '{img}',")
            print(f"        pageRef: 'p.{page}',")
            print(f"        sourceNote: 'ESABCC report, Figure {num} (p.{page}). Screenshot from source PDF.',")
            print("      },")
        print("    ],")


if __name__ == "__main__":
    main()
