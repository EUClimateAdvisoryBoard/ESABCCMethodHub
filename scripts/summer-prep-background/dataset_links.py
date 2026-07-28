"""
Exact dataset links for the Summer Prep background workbooks.

Every URL below was checked by hand on 2026-07-28 (see
`docs-internal/indicator-dataset-links-2026-07-28.md` for the verification
table this was built from — or the equivalent recon note kept alongside it)
before being added here. Nothing is guessed: a source string that does not
name one of these codes or publishers gets no link, not a best-effort one.

  * DATASET_LINKS   — Eurostat dataset code (lowercase) -> its DOI
    (`https://doi.org/10.2908/<CODE>`, which 302s to the databrowser page).
  * PUBLISHER_LINKS — ordered (regex, url) pairs for the non-Eurostat
    publishers used across the indicator sources. No DOI is minted for any
    of these, so the canonical landing page is used instead. Order matters:
    the more specific patterns (a named report, a named page) are tried
    before the generic "EEA" fallback.

`detect_link(text)` is the one function the workbooks call: dataset codes
are tried first (they are the most specific and most numerous match), then
the publisher patterns in order. `None` means no known code or publisher
was found in the text — the caller leaves the cell as plain text.
"""

import re

# ── Eurostat datasets — DOI = 10.2908/<CODE> ────────────────────────────────
DATASET_LINKS = {
    "nrg_ind_eff": "https://doi.org/10.2908/NRG_IND_EFF",
    "nrg_bal_c": "https://doi.org/10.2908/NRG_BAL_C",
    "cei_srm030": "https://doi.org/10.2908/CEI_SRM030",
    "rd_e_gerdtot": "https://doi.org/10.2908/RD_E_GERDTOT",
    "env_air_gge": "https://doi.org/10.2908/ENV_AIR_GGE",
    "nrg_bal_peh": "https://doi.org/10.2908/NRG_BAL_PEH",
    "tran_hv_psmod": "https://doi.org/10.2908/TRAN_HV_PSMOD",
    "road_eqs_lormot": "https://doi.org/10.2908/ROAD_EQS_LORMOT",
    "nrg_bal_s": "https://doi.org/10.2908/NRG_BAL_S",
    "env_wasfw": "https://doi.org/10.2908/ENV_WASFW",
    "demo_gind": "https://doi.org/10.2908/DEMO_GIND",
    "sts_inpr_a": "https://doi.org/10.2908/STS_INPR_A",
    "apro_mt_pann": "https://doi.org/10.2908/APRO_MT_PANN",
    "apro_mk_farm": "https://doi.org/10.2908/APRO_MK_FARM",
    "apro_mt_lscatl": "https://doi.org/10.2908/APRO_MT_LSCATL",
    "apro_mt_lspig": "https://doi.org/10.2908/APRO_MT_LSPIG",
    "nrg_ind_ren": "https://doi.org/10.2908/NRG_IND_REN",
}

# ── Non-Eurostat publishers — no DOI exists; canonical page instead ────────
# Checked in order: the first pattern that matches wins.
PUBLISHER_LINKS = [
    (r"green\s*bond", "https://www.eea.europa.eu/en/analysis/maps-and-charts/percentage-of-green-bond-issuances-1"),
    (r"\beafo\b|alternative\s*fuels\s*observatory",
     "https://alternative-fuels-observatory.ec.europa.eu/transport-mode/road/european-union-eu27"),
    (r"\birena\b", "https://www.irena.org/Data/View-data-by-topic/Capacity-and-Generation/Statistics-Time-Series"),
    (r"\behpa\b|heat\s*pump\s*association", "https://ehpa.org/market-data/"),
    (r"solarpower\s*europe", "https://www.solarpowereurope.org/insights/outlooks/eu-market-outlook-for-solar-power-2024-2028"),
    (r"windeurope", "https://windeurope.org/intelligence-platform/product/wind-energy-in-europe-2024-statistics-and-the-outlook-for-2025-2030/"),
    (r"unfccc|\bcrf\b", "https://di.unfccc.int/detailed_data_by_party"),
    (r"eurofer", "https://www.eurofer.eu/publications/brochures-booklets-and-factsheets/european-steel-in-figures-2024"),
    (r"low.?carbon\s*(economy|cement|steel)?\s*(project|tracker)|lowcarboneconomy",
     "https://lowcarboneconomy.cembureau.eu/"),
    (r"cembureau|cement\s*europe", "https://www.cementeurope.eu/about-us/key-facts-figures/"),
    (r"bloombergnef|\bbnef\b|lseg", "https://about.bnef.com/"),
    # Generic EEA fallback — tried last because "EEA" also appears in the
    # green-bond source strings, which must match the more specific pattern
    # above first.
    (r"\beea\b", "https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2"),
]

_PUBLISHER_RE = [(re.compile(pat, re.IGNORECASE), url) for pat, url in PUBLISHER_LINKS]
_DATASET_RE = {code: (re.compile(r"\b" + re.escape(code) + r"\b", re.IGNORECASE), url)
               for code, url in DATASET_LINKS.items()}


def detect_link(text):
    """
    Return the DOI or canonical URL for the dataset/publisher named in
    `text`, or None if nothing recognised is in it. Never guesses: a code
    or publisher not in the tables above yields None, not a nearest match.
    """
    if not text:
        return None
    for pattern, url in _DATASET_RE.values():
        if pattern.search(text):
            return url
    for pattern, url in _PUBLISHER_RE:
        if pattern.search(text):
            return url
    return None


def link_cell(cell, url, font=None):
    """Turn a cell into a real Excel hyperlink, styled blue/underlined."""
    if not url:
        return
    from esabcc_style import LINK_FONT
    cell.hyperlink = url
    cell.font = font or LINK_FONT
