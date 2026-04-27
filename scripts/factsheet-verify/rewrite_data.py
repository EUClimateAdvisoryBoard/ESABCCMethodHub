"""
Rewrite src/data/fact-sheets-reports.ts:
  - Replace each report's `figures: [...]` block with image-based figures
    generated from public/fact-sheets/_index.json.
  - Insert each report's `recommendations: [...]` field using the headline
    recommendations curated below (sourced from the executive summary of
    each ESABCC report).

Run:
    python3 scripts/factsheet-verify/rewrite_data.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src" / "data" / "fact-sheets-reports.ts"
IDX = ROOT / "public" / "fact-sheets" / "_index.json"

# Headline recommendations, as they appear in each ESABCC report's executive
# summary / recommendations page. Paraphrased to one short line per item;
# full text is in the source PDF.
RECOMMENDATIONS: dict[str, list[str]] = {
    "2040-climate-target": [
        "Keep the EU GHG budget between 11 and 14 GtCO₂eq over 2030–2050 — implying a 2040 reduction of 90–95% vs. 1990.",
        "Pursue the more ambitious end of the 2040 target range to improve the fairness of the EU's contribution.",
        "Complement domestic reductions with measures outside the EU (support, cooperation and partnerships).",
        "Keep the 2030 target of at least −55% to stay on track for the 2040 range and climate neutrality by 2050.",
        "Manage environmental risks and technology scale-up challenges through rapid, inclusive and well-managed transitions.",
        "Support climate neutrality through investments in innovation and wider capacity development.",
        "Prefer pathways that combine demand management with technology deployment — lower resource use advances the SDGs.",
    ],
    "eu-climate-neutrality": [
        "Member States should urgently adopt and implement national measures to meet EU 2030 objectives.",
        "Adopt the pending Fit for 55 legislative initiatives.",
        "Provide stable investment outlooks for renewable energy.",
        "Phase out fossil fuel subsidies in line with existing commitments.",
        "Make EU policies fully consistent with the EU climate neutrality objective.",
        "Strengthen the EU climate governance and compliance frameworks.",
        "Make the two EU emissions trading systems fit for net zero.",
        "Base EU policies on systematic impact assessment and ex-post evaluation.",
        "Provide stronger incentives for climate action in the agricultural sector.",
        "Target the deployment of CCU/CCS, hydrogen and bioenergy towards hard-to-abate sectors.",
        "Increase public and private investments for the transition.",
        "Pursue more ambitious reductions in energy and material demand.",
        "Expand the EU GHG pricing regime to all major sectors (including agriculture and LULUCF).",
    ],
    "cdr-scaling": [
        "Set separate targets for gross emission reductions, permanent removals and land-sink removals.",
        "Ensure the quality of removals through robust MRV and sustainability safeguards.",
        "Reverse the decline of the land sink with dedicated land-based policies.",
        "Accelerate innovation in technological removal methods (BECCS, DACCS).",
        "Secure sufficient CO₂ transport and storage infrastructure.",
        "Price permanent removals through a dedicated mechanism.",
        "Price temporary removals differently, reflecting reversal risk.",
        "Recognise the extended emitter responsibility for hard-to-abate emissions.",
        "Strengthen governance for carbon dioxide removals.",
    ],
    "climate-law-advice": [
        "Adopt a net domestic GHG reduction target for 2040 in the range of 90–95% relative to 1990.",
        "Set three separate 2040 targets: gross reductions, permanent CDR and land-based removals.",
        "Strengthen support, cooperation and partnerships that advance climate action beyond EU borders.",
        "Strengthen the EU climate adaptation framework with a clearer vision, governance and legal foundation.",
    ],
    "adaptation-report": [
        "Mandate and harmonise climate risk assessments across EU policies and decision-making.",
        "Adopt a common reference (SSP2-4.5) for adaptation planning; use SSP3-7.0 for stress-testing.",
        "Set out a vision for a climate-resilient EU by 2050 with sectoral strategies and cross-cutting targets.",
        "Embed fair and just climate resilience in all EU policies, programmes and investment decisions.",
        "Mobilise public and private adaptation investment and manage the growing costs of climate impacts.",
    ],
    "agri-food-system": [
        "Gradually remove climate-harmful payments from the Common Agricultural Policy.",
        "Introduce a greenhouse gas pricing system for agriculture.",
        "Provide targeted transition support for farmers.",
        "Help farmers cope with unavoidable climate-related impacts.",
        "Encourage healthy, climate-friendly diets and reductions in food waste.",
        "Ensure adequate public funding for the agri-food transition.",
    ],
    "energy-crisis": [
        "Tackle the root causes of the energy crisis by reducing demand and increasing low-carbon energy supply.",
        "Save energy through efficiency improvements and behavioural change.",
        "At least double the expansion rate for renewable energy.",
        "Boost electrification to improve efficiency and shift away from fossil fuels.",
        "Provide direct income support for vulnerable consumers; avoid price-distorting interventions.",
        "Ensure gas-supply diversification is compatible with long-term climate neutrality.",
        "Ensure a sustainable supply of biomass while minimising pressure on food production and biodiversity.",
        "Do not invest in new coal and oil infrastructure — avoid emission lock-ins.",
    ],
    "energy-infrastructure": [
        "Use scenarios fully consistent with the EU's most up-to-date climate and energy targets.",
        "Assess climate adaptation costs, benefits and measures in CBA.",
        "Monetise GHG emissions using a shadow carbon cost aligned with climate goals (EIB €250/t in 2030 → €800/t in 2050).",
        "Reflect impacts on distribution grids in the system-wide assessment.",
        "Capture flexibility benefits of new infrastructure (storage, demand response, cross-border).",
        "Adequately capture renewable-energy integration benefits.",
    ],
    "tene-scenarios": [
        "Ensure TYNDP scenarios are fully consistent with EU climate neutrality by 2050.",
        "Align final energy demand and consumption assumptions with benchmark climate-neutral scenarios.",
        "Avoid overstating hydrogen demand and imports (GA scenario 670 TWh 2040 vs. 15 TWh in EC S3).",
        "Increase electrification rates beyond 2030 to match the Advisory Board's benchmark range.",
        "Assess primary-energy supply alignment with EU 2030 indicative target (≤ 11 543 TWh).",
        "Integrate climate adaptation and resilience considerations into infrastructure planning.",
    ],
    "setting-targets": [
        "Follow a systematic, transparent and EU-values-guided approach to target-setting.",
        "Ground the analysis in the scientific and legal context of the European Climate Law.",
        "Consider physical limits to global emissions and the EU's fair share.",
        "Consider transformation scenarios towards net zero greenhouse gas emissions by 2050.",
        "Consider side effects, co-benefits, resilience and feasibility of pathways.",
        "Be explicit about value judgements, especially when principles are in tension.",
    ],
}


def make_figure_block(report_id: str, figs: list[dict]) -> str:
    if not figs:
        return "    figures: [],"
    out = ["    figures: ["]
    for f in figs:
        num = f["figureNumber"]
        page = f["page"]
        # Build a full title "Figure N. <caption>"
        raw_title = f["title"].strip()
        title = f"Figure {num}. {raw_title}"
        title = title.replace("'", "\\'")
        img = f["imagePath"]
        img_chart = f.get("imagePathChart")
        img_notes = f.get("imagePathNotes")
        out.append("      {")
        out.append(f"        id: '{report_id}-fig-{num}',")
        out.append(f"        figureNumber: '{num}',")
        out.append(f"        title: '{title}',")
        out.append(f"        imageSrc: '{img}',")
        if img_chart:
            out.append(f"        imageSrcChart: '{img_chart}',")
        if img_notes:
            out.append(f"        imageSrcNotes: '{img_notes}',")
        out.append(f"        pageRef: 'p.{page}',")
        out.append(
            f"        sourceNote: 'ESABCC report, Figure {num} (p.{page}). "
            f"Screenshot from source PDF.',"
        )
        out.append("      },")
    out.append("    ],")
    return "\n".join(out)


def make_recommendations_block(recs: list[str]) -> str:
    out = ["    recommendations: ["]
    for r in recs:
        r_esc = r.replace("\\", "\\\\").replace("'", "\\'")
        out.append(f"      '{r_esc}',")
    out.append("    ],")
    return "\n".join(out)


# Regex to find each report by id and replace its figures + insert recs
def rewrite(text: str, idx: dict) -> str:
    for report_id, figs in idx.items():
        # Find the start of the report object: a line like
        #   id: 'report_id',
        id_pattern = re.compile(
            r"(    id: '" + re.escape(report_id) + r"',\s*\n.*?)"
            r"    figures: \[.*?\n    \],",
            re.DOTALL,
        )
        figure_block = make_figure_block(report_id, figs)
        rec_block = make_recommendations_block(
            RECOMMENDATIONS.get(report_id, [])
        )

        def _repl(match: re.Match) -> str:
            head = match.group(1)
            # Drop any pre-existing 'recommendations: [...]' in head and any
            # dangling comment line before figures.
            head = re.sub(
                r"    recommendations: \[.*?\n    \],\n",
                "",
                head,
                flags=re.DOTALL,
            )
            # Remove leading '// ...' lines that were immediately before
            # a `figures: []` declaration (used for the setting-targets note).
            head = re.sub(
                r"(    //[^\n]*\n)+(?=\s*$)",
                "",
                head,
            )
            return head + rec_block + "\n" + figure_block

        new_text, n = id_pattern.subn(_repl, text, count=1)
        if n == 0:
            print(f"  [warn] could not find report block for {report_id}")
            continue
        text = new_text
    return text


def main() -> None:
    idx = json.loads(IDX.read_text())
    src = SRC.read_text()
    out = rewrite(src, idx)
    SRC.write_text(out)
    print(f"Wrote {SRC}: {len(out)} bytes")


if __name__ == "__main__":
    main()
