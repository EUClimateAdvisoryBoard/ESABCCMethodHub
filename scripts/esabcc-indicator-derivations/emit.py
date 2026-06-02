"""Emit migration 045_seed_indicator_derivations.sql from built layouts.

Writes pw_indicator_sheets.layout for each indicator whose derivation we have
reverse-engineered from the chapter workbooks. Idempotent (on conflict do
nothing) so it composes with 041's indicator + points seed.
"""
import json
import re


def _strip_unit(h):
    return re.sub(r"\s*\([^)]*\)\s*$", "", h).strip()


def _plain_list(items):
    items = list(items)
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} and {items[1]}"
    return ", ".join(items[:-1]) + f", and {items[-1]}"


def _is_constant(rows, idx):
    nums = [r["cells"][idx] for r in rows
            if idx < len(r["cells"]) and isinstance(r["cells"][idx], (int, float))]
    return len(nums) >= 2 and len(set(round(v, 9) for v in nums)) == 1


def _is_factor(header, rows, idx):
    h = header.lower()
    if "→" in header or "->" in header:
        return True
    if any(w in h for w in ("conversion", "convert", "factor")):
        return True
    return _is_constant(rows, idx)


def _conv_units(header):
    """Pull ('TJ','TWh') out of a factor header like 'TJ → TWh (…)'."""
    m = re.search(r"([A-Za-z0-9µ%·/ ]+?)\s*(?:→|->)\s*([A-Za-z0-9µ%·/ ]+)", header)
    if m:
        return m.group(1).strip().split("(")[0].strip(), m.group(2).strip().split("(")[0].strip()
    return None, None


def _top_split(e, ops):
    """Split expr on the first top-level operator in `ops`; returns (l, op, r)."""
    depth = 0
    for i, c in enumerate(e):
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
        elif depth == 0 and c in ops and i > 0:
            return e[:i], c, e[i + 1:]
    return None


def describe(layout, name=None, unit=None):
    """Plain-language, step-by-step explanation of how the Value is derived —
    what each step does and why it makes sense — generated from the layout so it
    always matches the actual calculation. Surfaced behind the calc editor's
    'ⓘ Derivation' button."""
    cols = layout["columns"]
    rows = layout.get("rows", [])
    value_expr = (cols[0].get("formula") or {}).get("expr", "").strip()
    helpers = cols[1:]

    # Classify helper columns (their grid index = position in cols).
    factors, inputs = [], []
    for i, c in enumerate(helpers, start=1):
        (factors if _is_factor(c["header"], rows, i) else inputs).append(c)
    input_names = [_strip_unit(c["header"]) for c in inputs]

    unit_l = (unit or "").strip()
    title = f"{name or 'This indicator'}" + (f"  ({unit})" if unit else "")

    steps, why = [], ""

    # If the Value is just a single derived column, unwrap it so we explain that
    # column's actual calculation (e.g. a share/ratio) instead of "take X".
    m1 = re.fullmatch(r"\s*\[([^\]]+)\]\s*", value_expr)
    if m1:
        for c in helpers:
            if c["header"] == m1.group(1) and (c.get("formula") or {}).get("expr"):
                value_expr = c["formula"]["expr"].strip()
                break

    neg = value_expr.lstrip().startswith("-")

    # Strip one outer paren layer for shape detection.
    core = value_expr.lstrip()
    if core.startswith("-"):
        core = core[1:].lstrip()
    while core.startswith("(") and core.endswith(")"):
        d = 0; ok = True
        for j, ch in enumerate(core):
            d += (ch == "(") - (ch == ")")
            if d == 0 and j < len(core) - 1:
                ok = False; break
        if ok:
            core = core[1:-1].strip()
        else:
            break

    factor_names = {_strip_unit(c["header"]) for c in factors}
    derived_names = {_strip_unit(c["header"]) for c in helpers
                     if (c.get("formula") or {}).get("expr")}

    def names_from(expr):
        out = []
        for r in re.findall(r"\[([^\]]+)\]", expr):
            nm = _strip_unit(r)
            if nm in factor_names or nm in out:
                continue
            out.append(nm)
        return out

    def balanced(s):
        d = 0
        for j, ch in enumerate(s):
            d += (ch == "(") - (ch == ")")
            if d == 0 and j < len(s) - 1:
                return False
        return d == 0

    # Peel a trailing unit-rescale (÷1000, ÷1e6 …) off the top level.
    scale_note = ""
    peeled = core
    sp = _top_split(core, "/")
    if sp and re.fullmatch(r"\s*[\d.eE+]+\s*", sp[2]):
        scale_note = f" (then rescaled to {unit})" if unit else " (then rescaled to the chart's unit)"
        peeled = sp[0].strip()
        while peeled.startswith("(") and peeled.endswith(")") and balanced(peeled):
            peeled = peeled[1:-1].strip()

    div = _top_split(peeled, "/")
    sub = _top_split(peeled, "-")
    combined = names_from(peeled)
    has_factor = bool(factors)

    def composite_note(term_names):
        if any(n in derived_names for n in term_names):
            steps.insert(0, "Each component is first built from the detailed source rows "
                            "(combined and unit-scaled as needed).")

    # ── Shape detection ──────────────────────────────────────────────────────
    if not value_expr or not helpers:
        steps.append("This indicator is published directly by the source, so no "
                     "calculation is applied — the plotted series is the reported data itself.")
        why = "There is nothing to derive: the source already provides exactly this figure."

    elif div and not re.fullmatch(r"\s*[\d.eE+]+\s*", div[2]):
        # Ratio: numerator / denominator (denominator is data, not a constant).
        num_p = _plain_list(names_from(div[0])) or "the selected components"
        den_p = _plain_list(names_from(div[2])) or "the total"
        if unit_l == "%" or "share" in (name or "").lower():
            if "+" in div[0]:
                steps.append(f"Add up {num_p}.")
                steps.append(f"Divide that by {den_p} to get its share of the total.")
            else:
                steps.append(f"Divide {num_p} by {den_p} to get its share of the total.")
            why = ("The indicator tracks the mix, not absolute volumes — expressing it as a share "
                   "of the total shows how the balance shifts over time.")
        else:
            steps.append(f"Divide {num_p} by {den_p}.")
            why = (f"This gives {unit or 'a per-unit figure'} — the amount per unit of output "
                   "(an intensity), so it reflects how clean/efficient production is, not how much is made.")

    elif has_factor and ("*" in peeled):
        # Unit conversion: (sum of inputs) × factor.
        raw_u, tgt_u = _conv_units(factors[0]["header"])
        tgt_u = tgt_u or unit_l
        terms = combined
        if len(terms) > 1:
            steps.append(f"Take the raw figures for {_plain_list(terms)}"
                         + (f", reported in {raw_u}." if raw_u else "."))
            steps.append("Add them together to get the total.")
            steps.append("Convert that total" + (f" from {raw_u} to {tgt_u}" if raw_u and tgt_u else
                                                  " to the chart's unit") + ".")
        else:
            steps.append(f"Take the raw {terms[0] if terms else 'figure'}"
                         + (f", reported in {raw_u}." if raw_u else "."))
            steps.append("Convert it" + (f" from {raw_u} to {tgt_u}" if raw_u and tgt_u else
                                         " to the chart's unit") + ".")
        why = (f"The chart is shown in {unit or tgt_u or 'the plotted unit'}, while the source reports "
               f"{raw_u or 'a different unit'}; the factor only changes the unit, not the data.")

    elif sub and len(re.findall(r"\[([^\]]+)\]", peeled)) == 2:
        # Difference — typically this year minus last year (an annual change).
        raw_refs = re.findall(r"\[([^\]]+)\]", peeled)
        prev = next((r for r in raw_refs if "previous" in r.lower() or "prev" in r.lower()), None)
        if prev:
            base = re.sub(r"\s*\((?:previous[^)]*)\)", "", prev)
            base = _strip_unit(re.sub(r"\bprevious year\b", "", base, flags=re.I)).strip(" ,")
            steps.append(f"Take this year's {base or 'cumulative total'} and subtract last year's value{scale_note}.")
            why = ("The indicator is an annual addition — how much was added in that year, which is "
                   "the increase in the cumulative total from one year to the next.")
        else:
            a, b = names_from(sub[0]), names_from(sub[2])
            steps.append(f"Subtract {_plain_list(b) or 'the second'} from {_plain_list(a) or 'the first'}{scale_note}.")
            why = "The indicator is the net difference between these two quantities."

    elif len(combined) > 1:
        sign = " — reported as a negative value (it represents a loss/removal)" if neg else ""
        steps.append(f"Add up {_plain_list(combined)}{scale_note}{sign}.")
        composite_note(combined)
        why = ("The total is simply the sum of its parts — adding the individual source categories "
               "reproduces the published total exactly.")

    elif len(combined) == 1:
        steps.append(f"Take {combined[0]}{scale_note}.")
        composite_note(combined)
        why = "The published figure comes straight from this source series."

    else:
        steps.append("Combine the inputs as shown to produce the plotted value.")
        why = "Reproduces the published figure from its underlying inputs."

    # ── Assemble ─────────────────────────────────────────────────────────────
    def clean_src(s):
        s = (s or "").strip()
        return None if (not s or s.lower().startswith("see ")) else s
    srcs = sorted({s for s in (clean_src(c.get("source")) for c in inputs) if s})

    L = [title, ""]
    L.append("How it's calculated:")
    for i, s in enumerate(steps, 1):
        L.append(f"  {i}. {s}")
    if why:
        L += ["", f"Why: {why}"]
    if srcs:
        L += ["", "Source data: " + _plain_list(srcs) + "."]
    L += ["", "Everything recomputes live — update a raw input and the plotted "
          "value updates automatically."]
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
