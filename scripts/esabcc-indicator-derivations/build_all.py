"""Aggregate every chapter module, RE-VERIFY each layout independently against
the published overview figures (ground_truth.json), and emit migration 045.

A layout is accepted only if recomputing its Value column from the stored raw
cells reproduces the overview series within tolerance. Failures are reported
and excluded so the migration only ever contains verified derivations.
"""
import sys, json, importlib
sys.path.insert(0, 'scripts/esabcc-indicator-derivations')
import lib, emit

GT = json.load(open('scripts/esabcc-indicator-derivations/ground_truth.json'))
OVX = json.load(open('scripts/esabcc-indicators/extract.json'))

def overview_series(ind_id):
    g = GT.get(ind_id)
    if not g: return {}
    for s in OVX.get(g['overview_sheet'], {}).get('series', []):
        if s['label'].strip().lower() == g['overview_series'].strip().lower():
            return {p['year']: p['value'] for p in s['data']}
    return {}

CHAPTERS = ['ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8', 'ch9']

def stats(vals):
    vals = [v for v in vals if isinstance(v, (int, float))]
    if not vals: return 0.0, 0.0
    m = sum(vals) / len(vals)
    var = sum((v - m) ** 2 for v in vals) / len(vals)
    return m, var ** 0.5

def robust_verify(ind_id, computed, expected):
    """Relative tolerance + flat-line detection. A layout passes only if every
    year is within max(1% of |e|, 0.5% of series scale), AND a computed series
    is not flat while the overview varies (catches cross-sheet frozen constants).
    Returns (ok, worst_abs, worst_rel, flat, n)."""
    common = sorted(set(computed) & set(expected))
    if not common: return False, None, None, False, 0
    maxE = max(abs(expected[y]) for y in common) or 1.0
    floor = 0.005 * maxE
    worst_abs = worst_rel = 0.0; ok = True
    for y in common:
        c, e = computed[y], expected[y]
        if c is None: return False, None, None, False, len(common)
        d = abs(c - e); worst_abs = max(worst_abs, d)
        worst_rel = max(worst_rel, d / max(abs(e), floor))
        if d > max(0.01 * abs(e), floor): ok = False
    _, sc = stats([computed[y] for y in common])
    _, se = stats([expected[y] for y in common])
    flat = (se > 1e-9 * maxE) and (sc < 0.05 * se)  # overview varies, computed ~flat
    if flat: ok = False
    return ok, worst_abs, worst_rel, flat, len(common)

def main():
    layouts = {}; report = []
    for mod in CHAPTERS:
        try:
            m = importlib.import_module(f'chapters.{mod}')
        except ModuleNotFoundError:
            continue
        built = m.build()
        for ind_id, layout in built.items():
            computed = lib.recompute_layout(layout)
            exp = {y: v for y, v in overview_series(ind_id).items() if y in computed}
            ok, wa, wr, flat, n = robust_verify(ind_id, computed, exp)
            flag = ' [FLAT!]' if flat else ''
            wrs = f"{wr*100:.2f}%" if wr is not None else "n/a"
            line = f"{ind_id:<34} {n:>2}yr  worstΔ={wa if wa is not None else 0:.4f}  rel={wrs}{flag}"
            report.append((ok, ind_id, line))
            if ok:
                g = GT.get(ind_id, {})
                layout["derivation"] = emit.describe(layout, g.get("name"), g.get("unit"))
                layouts[ind_id] = layout
    print("\n=== CENTRAL RE-VERIFICATION (relative tol 1% + flat-line check) ===")
    for ok, ind, line in sorted(report, key=lambda r: (r[0], r[1])):
        print(("  PASS " if ok else " FAIL ") + line)
    n = emit.emit(layouts, 'supabase/migrations/052_indicator_derivation_descriptions.sql')
    npass = sum(1 for ok, *_ in report if ok)
    print(f"\nEmitted {n} verified layouts -> migration 052 ({npass}/{len(report)} passed)")

if __name__ == '__main__':
    main()
