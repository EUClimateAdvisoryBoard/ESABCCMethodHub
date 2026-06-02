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
            ok, msgs = lib.verify(ind_id, computed, exp, tol=1.0)
            report.append((ok, ind_id, msgs[0]))
            if ok:
                layouts[ind_id] = layout
            else:
                report.append((False, ind_id, '\n'.join(msgs[1:6])))
    print("\n=== VERIFICATION ===")
    for ok, ind, line in report:
        print(("  OK  " if ok else " FAIL ") + line.strip())
    n = emit.emit(layouts, 'supabase/migrations/045_seed_indicator_derivations.sql')
    npass = sum(1 for ok, *_ in report if ok)
    print(f"\nEmitted {n} verified layouts -> migration 045 ({npass} indicators passed)")

if __name__ == '__main__':
    main()
