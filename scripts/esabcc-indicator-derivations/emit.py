"""Emit migration 045_seed_indicator_derivations.sql from built layouts.

Writes pw_indicator_sheets.layout for each indicator whose derivation we have
reverse-engineered from the chapter workbooks. Idempotent (on conflict do
nothing) so it composes with 041's indicator + points seed.
"""
import json

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
