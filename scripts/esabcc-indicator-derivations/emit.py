"""Emit migration 045_seed_indicator_derivations.sql from built layouts.

Writes pw_indicator_sheets.layout for each indicator whose derivation we have
reverse-engineered from the chapter workbooks. Idempotent (on conflict do
nothing) so it composes with 041's indicator + points seed.
"""
import json


def describe(layout, name=None, unit=None):
    """Build a plain-text, step-by-step explanation of how the Value column is
    derived from the helper columns. Surfaced behind the calc editor's
    "ⓘ Derivation" button. Generated from the layout itself so it always
    matches the actual formulas/sources."""
    cols = layout["columns"]
    value = cols[0]
    helpers = cols[1:]
    value_expr = (value.get("formula") or {}).get("expr", "")
    raw = [c for c in helpers if not (c.get("formula") or {}).get("expr")]
    derived = [c for c in helpers if (c.get("formula") or {}).get("expr")]

    L = []
    title = name or "This indicator"
    if unit:
        L.append(f"{title}  —  unit: {unit}")
    else:
        L.append(title)
    L.append("")

    if not helpers:
        L.append("Published directly as the source series — no further")
        L.append("derivation; the Value column holds the raw figures as reported.")
        return "\n".join(L)

    L.append("How the plotted Value is reproduced from raw data:")
    L.append("")
    L.append("1. Raw inputs (the deepest source data, editable each year):")
    for c in raw:
        src = c.get("source")
        L.append(f"   • {c['header']}" + (f"  — source: {src}" if src else ""))
    step = 2
    if derived:
        L.append("")
        L.append(f"{step}. Intermediate steps (computed from the raw inputs):")
        for c in derived:
            L.append(f"   • {c['header']} = {c['formula']['expr']}")
        step += 1
    L.append("")
    if value_expr:
        # A pure single-reference passthrough reads better as plain prose.
        single = value_expr.strip().startswith("[") and value_expr.strip().endswith("]") \
            and value_expr.count("[") == 1
        if single:
            L.append(f"{step}. Value = {value_expr}  (taken directly from that input).")
        else:
            L.append(f"{step}. Value (final, plotted) = {value_expr}")
    else:
        L.append(f"{step}. Value (final, plotted) is entered directly.")
    L.append("")
    L.append("Every step recomputes live: update a raw input and the Value")
    L.append("updates automatically (same formulas as the source workbook).")
    return "\n".join(L)

HEADER = """\
-- ─────────────────────────────────────────────────────────────────────────────
-- Seed reverse-engineered DERIVATIONS for the ESABCC report indicators into
-- pw_indicator_sheets.layout (the per-indicator calc space).
--
-- Each layout is a year-indexed grid: Year | Value | helper columns. The Value
-- column carries a free-form formula documenting how the published figure is
-- derived from raw inputs (e.g. raw Eurostat Mtoe × 11.63 → TWh). Helper
-- columns hold those raw inputs with per-column `source`. Reproduced from the
-- chapter workbooks (Ch3–Ch9) and verified against the report's published
-- "underlying data" figures by scripts/esabcc-indicator-derivations.
--
-- Drop in next year's raw data (helper columns) and the indicator recomputes.
-- Companion to 041_seed_esabcc_report_indicators.sql. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────
"""

def sql_str(s):
    return "null" if s is None else "'" + str(s).replace("'", "''") + "'"

def emit(layouts, out_path):
    lines = [HEADER, "insert into public.pw_indicator_sheets (indicator_id, layout)", "values"]
    rows = []
    for ind_id, layout in layouts.items():
        j = json.dumps(layout, ensure_ascii=False, separators=(',', ':'))
        rows.append(f"  ({sql_str(ind_id)}, {sql_str(j)}::jsonb)")
    lines.append(",\n".join(rows))
    lines.append("on conflict (indicator_id) do nothing;")
    with open(out_path, 'w') as f:
        f.write("\n".join(lines) + "\n")
    return len(rows)
