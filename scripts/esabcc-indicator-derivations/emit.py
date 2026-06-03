"""Emit migration 045_seed_indicator_derivations.sql from built layouts.

Writes pw_indicator_sheets.layout for each indicator whose derivation we have
reverse-engineered from the chapter workbooks. Idempotent (on conflict do
nothing) so it composes with 041's indicator + points seed.
"""
import json
import re


# Honest, indicator-specific caveats for derivations that are approximate, are
# really the published series (not a reconstruction), or rest on a scope/scaling
# choice worth checking. Appended to the in-app derivation text.
CAVEATS = {
    "esabcc-t6b-foodcrop-biofuels":
        "Year alignment is uncertain — the source workbook's columns were labelled 2011–2021 "
        "but map onto the published 2005–2015 range. Confirm the correct years before relying on this.",
    "esabcc-a3-nue":
        "Not independently derived: nitrogen-use efficiency is taken as the published FAOSTAT ratio. "
        "The underlying nitrogen input/output terms are not in the source workbook, so updating raw "
        "data will not recompute it.",
    "esabcc-e3-grid-co2-intensity":
        "Not independently derived: the published EEA grid-intensity series is used directly rather "
        "than rebuilt from emissions ÷ generation.",
    "esabcc-t3b-air-passenger":
        "Taken directly from the published Eurostat series; there is no underlying decomposition to recompute.",
    "esabcc-t4-car-co2-intensity":
        "Published series used directly; only 2020–2022 and on the WLTP test basis (not comparable with "
        "older NEDC figures).",
    "esabcc-i3-circular-mat-use":
        "Published Eurostat indicator (sdg_12_41) stored directly — there is no calculation to reproduce.",
    "esabcc-e4a-solar-pv-add":
        "Computed as the year-on-year change in cumulative installed capacity, i.e. NET additions "
        "(new minus decommissioned), which can differ from gross installations.",
    "esabcc-e4b-wind-add":
        "Captures onshore wind only, computed as the year-on-year change in cumulative capacity (NET "
        "additions). If the indicator is meant to include offshore wind, this understates total additions.",
    "esabcc-o1-ghg-total":
        "International maritime is included at a fixed scope factor (≈0.64) — confirm it matches the "
        "intended European Climate Law attribution. 'Waste and other sectors' is a residual (total net "
        "emissions minus the listed sectors), so it absorbs any unlisted items.",
    "esabcc-e1-energy-supply-ghg":
        "The sectoral breakdown is available 2005–2021; the 2022 point uses the reported total only "
        "(the four components are blank that year).",
    "esabcc-i4-chemicals-ghg-intensity":
        "Emissions cover base organic chemicals, while production is only ethylene + propylene + "
        "aromatics; if the emissions boundary is wider than these products, the intensity is biased high.",
    "esabcc-i4-steel-ghg-intensity":
        "Emissions (EEA inventory) and production (industry association) use different system boundaries; "
        "small scope mismatches can bias the ratio.",
    "esabcc-i4-cement-ghg-intensity":
        "Emissions (EEA inventory) and production (industry association) use different system boundaries; "
        "small scope mismatches can bias the ratio.",
    "esabcc-l5-settlement-area":
        "Used as a proxy for net land take — it is the annual change in settlement area, not a direct "
        "measurement of land take.",
}


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


def _humanize(expr):
    """Turn a stored formula into a readable one: drop [..] and trailing unit
    parens from names, use × / ÷, and round long decimals."""
    if not expr:
        return ""
    s = re.sub(r"\[([^\]]+)\]", lambda m: _strip_unit(m.group(1)), expr)
    s = re.sub(r"\d+\.\d+(?:[eE][+-]?\d+)?",
               lambda m: (str(int(float(m.group(0)))) if float(m.group(0)) == int(float(m.group(0)))
                          else f"{float(m.group(0)):.4g}"), s)
    s = s.replace("*", " × ").replace("/", " ÷ ")
    s = re.sub(r"(?<=[\w)\]])\s*\+\s*", " + ", s)
    s = re.sub(r"(?<=[\w)\]])\s*-\s*(?=[\w(\[])", " - ", s)
    return re.sub(r"[ ]{2,}", " ", s).strip()


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


def describe(layout, name=None, unit=None, description=None, ind_id=None):
    """Plain-language, well-documented explanation of how the Value is derived —
    what it measures, the step-by-step calculation, what every column is and why
    it's needed, the readable formula, and the reasoning — generated from the
    layout so it always matches the actual calculation. Surfaced behind the calc
    editor's 'ⓘ Derivation' button."""
    cols = layout["columns"]
    rows = layout.get("rows", [])
    value_expr = (cols[0].get("formula") or {}).get("expr", "").strip()
    orig_value_expr = value_expr
    helpers = cols[1:]

    # Classify helper columns (their grid index = position in cols).
    factors, inputs = [], []
    for i, c in enumerate(helpers, start=1):
        (factors if _is_factor(c["header"], rows, i) else inputs).append(c)
    input_names = [_strip_unit(c["header"]) for c in inputs]

    unit_l = (unit or "").strip()
    title = f"{name or 'This indicator'}" + (f"  ({unit})" if unit else "")

    steps, why = [], ""
    div_share = is_intensity = False
    denom_names = set()

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
        why = ("It is an observation, not a reconstruction: the source already provides exactly this "
               "quantity, and it cannot be regenerated from more primitive inputs here because the "
               "source does not expose them.")

    elif div and not re.fullmatch(r"\s*[\d.eE+]+\s*", div[2]):
        # Ratio: numerator / denominator (denominator is data, not a constant).
        num_p = _plain_list(names_from(div[0])) or "the selected components"
        den_p = _plain_list(names_from(div[2])) or "the total"
        denom_names = set(names_from(div[2]))
        if unit_l == "%" or "share" in (name or "").lower():
            div_share = True
            if "+" in div[0]:
                steps.append(f"Add up {num_p}.")
                steps.append(f"Divide that by {den_p} to get its share of the total.")
            else:
                steps.append(f"Divide {num_p} by {den_p} to get its share of the total.")
            why = ("Normalising by the total removes the effect of overall volume and isolates the "
                   "compositional shift (the fuel/modal mix) — which is the quantity of policy interest, "
                   "and makes years with different total demand directly comparable.")
        else:
            is_intensity = True
            steps.append(f"Divide {num_p} by {den_p}.")
            why = (f"Dividing the emissions flux by physical output yields a specific emission factor "
                   f"({unit or 'emissions per unit produced'}) — a measure of process carbon efficiency "
                   "that is independent of how much is produced.")

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
        why = (f"A unit conversion is an exact linear rescaling (e.g. 1 toe ≡ 11.63 MWh): it expresses "
               f"the source's {raw_u or 'native-unit'} data in {unit or tgt_u or 'the plotted unit'} "
               "without changing the underlying physical quantity or introducing any assumption.")

    elif sub and len(re.findall(r"\[([^\]]+)\]", peeled)) == 2:
        # Difference — typically this year minus last year (an annual change).
        raw_refs = re.findall(r"\[([^\]]+)\]", peeled)
        prev = next((r for r in raw_refs if "previous" in r.lower() or "prev" in r.lower()), None)
        if prev:
            base = re.sub(r"\s*\((?:previous[^)]*)\)", "", prev)
            base = _strip_unit(re.sub(r"\bprevious year\b", "", base, flags=re.I)).strip(" ,")
            steps.append(f"Take this year's {base or 'cumulative total'} and subtract last year's value{scale_note}.")
            why = ("The annual flow is the first difference of the cumulative stock, which recovers the "
                   "capacity added each year. Note this is a NET figure (gross additions minus "
                   "retirements), not gross installations.")
        else:
            a, b = names_from(sub[0]), names_from(sub[2])
            steps.append(f"Subtract {_plain_list(b) or 'the second'} from {_plain_list(a) or 'the first'}{scale_note}.")
            why = "The indicator is the net difference between these two quantities."

    elif len(combined) > 1:
        sign = " — reported as a negative value (it represents a loss/removal)" if neg else ""
        steps.append(f"Add up {_plain_list(combined)}{scale_note}{sign}.")
        composite_note(combined)
        why = ("This is an accounting identity: the source reports these categories as mutually "
               "exclusive and exhaustive, so their sum is the total by construction — no modelling "
               "assumption is introduced, only disaggregated official data are re-aggregated.")

    elif len(combined) == 1:
        steps.append(f"Take {combined[0]}{scale_note}.")
        composite_note(combined)
        why = "The published figure comes straight from this single source series."

    else:
        steps.append("Combine the inputs as shown to produce the plotted value.")
        why = "Reproduces the published figure from its underlying inputs."

    # ── Per-column documentation ──────────────────────────────────────────────
    def clean_src(s):
        s = (s or "").strip()
        return None if (not s or s.lower().startswith("see ")) else s

    factor_set = {c["header"] for c in factors}
    raw_inputs = [c for c in helpers
                  if not (c.get("formula") or {}).get("expr") and c["header"] not in factor_set]
    single_passthrough = len(raw_inputs) == 1 and not div_share and not is_intensity

    def column_doc(c):
        h = c["header"]
        nm = _strip_unit(h)
        src = clean_src(c.get("source"))
        expr = (c.get("formula") or {}).get("expr")
        if h in factor_set:
            ru, tu = _conv_units(h)
            if ru and tu:
                return (f"{nm} — unit-conversion factor ({ru} → {tu}). Needed because the source "
                        f"reports {ru} but the indicator is shown in {tu}; multiplying by it only "
                        f"changes the unit, not the underlying quantity.")
            return f"{nm} — a constant factor applied in the calculation."
        if expr:
            return (f"{nm} — intermediate step, computed as {_humanize(expr)}. It prepares this "
                    f"component from the detailed source rows so the final line can combine them.")
        if nm in denom_names:
            return (f"{nm} — the total, used as the denominator. Dividing by it turns the "
                    f"components into a {'share' if div_share else 'per-unit figure'}.")
        if single_passthrough:
            return (f"{nm} — raw input" + (f" from {src}" if src else "") +
                    ". This is the published series the indicator reports; no further "
                    "breakdown is available in the source.")
        why_in = "one of the source categories that are added together to form the total"
        if div_share:
            why_in = "one of the components measured against the total to form the share"
        elif is_intensity:
            why_in = "one of the two quantities the indicator divides"
        return (f"{nm} — raw input" + (f" from {src}" if src else "") +
                f". It is {why_in}, so it has to be captured to reproduce the figure.")

    # ── Assemble ─────────────────────────────────────────────────────────────
    L = [title]
    if description:
        L += ["", f"What it measures: {description}"]

    L += ["", "How it's calculated:"]
    for i, s in enumerate(steps, 1):
        L.append(f"  {i}. {s}")

    if why:
        L += ["", "Why it's done this way:", f"  {why}"]

    caveat = CAVEATS.get(ind_id)
    if caveat:
        L += ["", "⚠ Caveat:", f"  {caveat}"]

    L += ["", "The columns in this sheet (and why each is needed):"]
    L.append(f"  • Value — the final number plotted on the website, in {unit or 'the indicator unit'}.")
    for c in helpers:
        L.append(f"  • {column_doc(c)}")

    L += ["", "Formula:", f"  Value = {_humanize(orig_value_expr) or '(entered directly)'}"]
    for c in helpers:
        e = (c.get("formula") or {}).get("expr")
        if e:
            L.append(f"  {_strip_unit(c['header'])} = {_humanize(e)}")

    L += ["", "Everything recomputes live — change a raw input and the plotted "
          "value (and any intermediate columns) update automatically, using the "
          "same formulas as the original source workbook."]
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
