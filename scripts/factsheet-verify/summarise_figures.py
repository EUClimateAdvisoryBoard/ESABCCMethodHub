"""Print a compact list of figure captions per report, deduplicated."""
import json
from pathlib import Path

EXTRACTED = Path(__file__).resolve().parent / "extracted"

# Map from fact-sheet report id -> pdf stem
MAP = {
    "2040-climate-target": "scientific-advice-for-the-determination-of-an-eu-wide-2040-climate-target-and-a-greenhouse-gas-budget-for-2030-2050",
    "eu-climate-neutrality": "esabcc_report_towards-eu-climate-neutrality",
    "cdr-scaling": "2025-02-21-scaling-up-carbon-dioxide-removals-recommendations-for-navigating-opportunities-and-risks-in-the-eu",
    "climate-law-advice": "20250602_european-climate-law_advice-for-publication",
    "adaptation-report": "20260217_adaptation-report",
    "agri-food-system": "2026-03-1120260311_eu-agri-food-system-report",
    "energy-crisis": "2023-02-07-recommendationspolicyresponsesenergycrisisclimateneutrality",
    "energy-infrastructure": "2023-03-15-towards-a-decarbonised-and-climate-resilient-eu-energy-infrastructure",
    "tene-scenarios": "20240627advice-on-draft-scenarios-under-ten-e-regulation_for-publication",
    "setting-targets": "setting-climate-targets-based-on",
}

for rid, stem in MAP.items():
    fig_file = EXTRACTED / f"{stem}.figures.json"
    if not fig_file.exists():
        print(f"\n=== {rid}  (NO FIGURES FILE) ===")
        continue
    figs = json.loads(fig_file.read_text())
    # Dedupe by (number, caption[:80]) keeping first occurrence
    seen = set()
    unique = []
    for f in figs:
        key = (f.get("number"), f.get("caption", "")[:80])
        if key in seen:
            continue
        seen.add(key)
        unique.append(f)
    print(f"\n=== {rid} :: {stem} ({len(unique)} unique figure captions) ===")
    for f in unique[:60]:
        print(f"  p{f['page']:>4}  Fig {f['number']:>5}  {f['caption'][:100]}")
    if len(unique) > 60:
        print(f"  ... and {len(unique) - 60} more")
