#!/usr/bin/env python3
"""
Build the dataset for the Scenarios main module (M · 55, /scenario-pathways).

Reads the EEA export `EU_six_sectors_export.zip` (repository root) without
unpacking it, and writes one compact JSON file:

    public/data/scenario-pathways/pathways.json

plus a copy of the presented deck:

    public/data/scenario-pathways/EU_six_sectors_2040_settings_deck.html

Both live under `public/data/`, which the site-auth middleware gates behind
the `mh_site_auth` cookie (only images, fonts, js and css bypass it). The
export README marks the Scenario Compass v2.0 data as under embargo, so the
data must never be bundled into `_next/static` JavaScript, which is ungated.

Parity gate
-----------
Before writing, the script re-implements the screening of the export's own
`scripts/variants.py` (thresholds `TH`, windows `WIN`, margin factor 1 + m)
and asserts that it reproduces every one of the twelve stage columns
`nz{0|150}|{window}|m{0|10}` for all 1,328 pathways. The TypeScript port in
`src/lib/scenario-pathways/model.ts` repeats the same check in the browser.
If either check fails, the build stops (here) or the UI says so (there).

2030 cut (added 2026-11-20)
--------------------------
The export stores the 2040 cut but not the 2030 cut that the EEA's
follow-up deck "EU screening settings: potential likely setting" (PDF,
20 November 2026) applies as a third rule (EU net GHG cut >= 55 % vs 1990,
rounded to one decimal, missing values pass). It is derived here from the
export's own series, with the same inventory scaling as its 2040 cut:

    red30 = 100 - (100 - red40) * net_ghg_2030 / net_ghg_2040

which is exact because variants.py computes red40 as
(1 - net_ghg_2040 * H_base / K_base / H_1990) * 100. ESABCC runs carry the
Board's 2040 metric in red40, so for them 2030 is scaled to the 2020
inventory instead (variants.py's fallback rule). A second gate checks that
this reproduces the PDF: the funnel 1,318 -> 657 -> 151 -> 51 -> 48 -> 40 and
all 24 counts of its tolerance table.

Usage:  python3 -I scripts/build-scenario-pathways.py [path/to/zip]
"""
import csv
import io
import json
import math
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIP = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'EU_six_sectors_export.zip')
OUT_DIR = os.path.join(ROOT, 'public', 'data', 'scenario-pathways')
PFX = 'export/'

# Thresholds and windows exactly as in export/scripts/variants.py.
TH = dict(cap=500, bio=20, wccs=8600, wbio=240, h2=1.89, fe=20, cap_r=425, bio_r=9, land_r=400)
WIN = {'85–90%': (84.95, 90.5), '85–95%': (84.95, 95.5), '≥ 85%': (84.95, 1e9)}
STAGE_KEYS = [f'nz{nz}|{w}|m{m}' for nz in ('0', '150') for w in WIN for m in (0, 10)]

STRING_COLS = ['src', 'pool', 'model', 'scenario']
BOOL_COLS = ['det', 'nz0']
SCREEN_COLS = ['new', 'net50', 'red', 'red30', 'cap50', 'bio50', 'land50', 'wccs50', 'wbio50', 'h2_30', 'fe_decl']
YEARS = (2020, 2030, 2040, 2050)
SERIES_PREFIX = ['sup_e', 'sup_el', 'sup_wind', 'sup_solar', 'sup_h2', 'mob_e', 'mob_fe', 'mob_el', 'mob_h2',
                 'bui_e', 'bui_fe', 'bui_el', 'bui_gas', 'agr_ch4', 'agr_n2o', 'agr_co2e', 'eco_e', 'eco_forest', 'net_ghg']
SINGLE_COLS = ['i20', 'i30', 'i40', 'i50', 'fe40', 'el40', 'h240', 'ccs50', 'pr40']


def num(s):
    if s is None or s == '' or s.lower() == 'nan':
        return None
    v = float(s)
    return None if math.isnan(v) else v


def sig(v, n=7):
    """Round to n significant digits to keep the JSON compact; screening
    columns are written at full precision so no window edge can flip."""
    if v is None or v == 0:
        return v
    return float(f'{v:.{n}g}')


def read_csv(z, name):
    with z.open(PFX + name) as fh:
        return list(csv.DictReader(io.TextIOWrapper(fh, encoding='utf-8')))


def stage(r, nz, lo, hi, m):
    """Stage code as in variants.py: -1 no industry data, 0 fails net GHG,
    1 outside 2040 window, 2 fails ESABCC filter, 3 above a risk level,
    4 within all criteria. Missing filter values count as passed."""
    if r['det'] != 'True':
        return -1
    net50 = num(r['net50'])
    if net50 is not None:
        ok = net50 <= (0 if nz == '0' else 150)
    else:
        ok = r['src'] == 'JRC' and r['nz0'] == 'True'
    if not ok:
        return 0
    red = num(r['red'])
    if red is None or not (lo <= red < hi):
        return 1
    f = 1 + m / 100

    def over(col, t):
        v = num(r[col])
        return v is not None and v > t * f
    ex = any(over(c, TH[k]) for c, k in (('cap50', 'cap'), ('bio50', 'bio'), ('wccs50', 'wccs'),
                                        ('wbio50', 'wbio'), ('h2_30', 'h2'), ('fe_decl', 'fe')))
    if ex:
        return 2
    rk = any(over(c, TH[k]) for c, k in (('cap50', 'cap_r'), ('bio50', 'bio_r'), ('land50', 'land_r')))
    return 3 if rk else 4


def red30(r, inv_net):
    k20, k30, k40 = num(r['net_ghg_2020']), num(r['net_ghg_2030']), num(r['net_ghg_2040'])
    if r['src'] == 'ESABCC':
        if not k20 or k30 is None:
            return None
        return (1 - k30 * inv_net[2020] / k20 / inv_net[1990]) * 100
    r40 = num(r['red40'])
    if r40 is None or k30 is None or not k40:
        return None
    return 100 - (100 - r40) * k30 / k40


# Counts printed in the PDF (slide 1: rows net-GHG tolerance x 2040 window,
# columns ESABCC tolerance none/+10/+20/+30 %; slide 3: funnel).
PDF_GRID = {(0, 90): [2, 4, 4, 6], (0, 95): [25, 35, 41, 46], (150, 90): [16, 20, 21, 23],
            (150, 95): [62, 75, 82, 87], (300, 90): [40, 44, 45, 47], (300, 95): [89, 102, 109, 114]}
PDF_FUNNEL = [1318, 657, 151, 51, 48, 40]


def likely_funnel(rows, tol, hi, m):
    """Order of the PDF: industry data, 2030, 2050, 2040, ESABCC filter, risk levels."""
    D = [r for r in rows if r['det'] == 'True']
    c = [len(D)]
    D = [r for r in D if r['_red30'] is None or round(r['_red30'], 1) >= 55]
    c.append(len(D))
    D = [r for r in D if (num(r['net50']) <= tol if num(r['net50']) is not None else (r['src'] == 'JRC' and r['nz0'] == 'True'))]
    c.append(len(D))
    D = [r for r in D if num(r['red']) is not None and 84.95 <= num(r['red']) < hi + 0.5]
    c.append(len(D))
    f = 1 + m / 100
    over = lambda r, ks: any(num(r[c_]) is not None and num(r[c_]) > TH[k] * f for c_, k in ks)
    D = [r for r in D if not over(r, (('cap50', 'cap'), ('bio50', 'bio'), ('wccs50', 'wccs'), ('wbio50', 'wbio'), ('h2_30', 'h2'), ('fe_decl', 'fe')))]
    c.append(len(D))
    D = [r for r in D if not over(r, (('cap50', 'cap_r'), ('bio50', 'bio_r'), ('land50', 'land_r')))]
    c.append(len(D))
    return c


def main():
    with zipfile.ZipFile(ZIP) as z:
        rows = read_csv(z, 'data/all_pathways_1328.csv')
        inv_sec = read_csv(z, 'data/inventory_sectors_2005_2024.csv')
        inv_net = read_csv(z, 'data/inventory_eu_net_ghg_1990_2024.csv')
        funnel = json.loads(z.read(PFX + 'data/funnel_advice_setting.json'))
        medians = read_csv(z, 'data/sector_medians_by_setting.csv')
        deck = z.read(PFX + 'deck/EU_six_sectors_2040_settings_deck.html')

    # ── parity gate ──────────────────────────────────────────────────
    bad = 0
    for k in STAGE_KEYS:
        nz = k.split('|')[0][2:]
        lo, hi = WIN[k.split('|')[1]]
        m = int(k.split('|')[2][1:])
        for r in rows:
            if stage(r, nz, lo, hi, m) != int(r[k]):
                bad += 1
    if bad:
        sys.exit(f'Parity check FAILED: {bad} stage codes differ from the export. Nothing written.')
    print(f'Parity check passed: {len(STAGE_KEYS)} settings × {len(rows)} pathways reproduce the export stage codes.')

    # ── 2030 cut + second gate against the PDF ──────────────────────
    inv_net_map = {int(r['year']): float(r['eu_net_ghg_mt']) for r in inv_net}
    for r in rows:
        r['_red30'] = red30(r, inv_net_map)
        r['red30'] = '' if r['_red30'] is None else repr(r['_red30'])
    got = likely_funnel(rows, 300, 90, 0)
    if got != PDF_FUNNEL:
        sys.exit(f'PDF parity FAILED: funnel {got}, PDF {PDF_FUNNEL}. Nothing written.')
    for (tol, hi), want in PDF_GRID.items():
        g = [likely_funnel(rows, tol, hi, m)[-1] for m in (0, 10, 20, 30)]
        if g != want:
            sys.exit(f'PDF parity FAILED: net ≤ {tol}, 85–{hi}%: {g}, PDF {want}. Nothing written.')
    print('PDF parity passed: funnel 1,318 → 40 and all 24 tolerance-table counts reproduced.')

    series_cols = [f'{p}_{y}' for p in SERIES_PREFIX for y in YEARS]
    num_cols = SCREEN_COLS + SINGLE_COLS + series_cols
    out_rows = []
    for r in rows:
        rec = [r[c] for c in STRING_COLS]
        rec += [r[c] == 'True' for c in BOOL_COLS]
        rec += [num(r[c]) if c in SCREEN_COLS else sig(num(r[c])) for c in num_cols]
        rec += [int(r[k]) for k in STAGE_KEYS]
        out_rows.append(rec)

    data = dict(
        meta=dict(
            title='EU scenario pathways: six sectors, 2040 screening settings',
            source='EU_six_sectors_export.zip (EEA for the ESABCC Secretariat, deck dated 20 November 2026)',
            embargo='Contains Scenario Compass v2.0 data (embargo): internal use only.',
            built_by='scripts/build-scenario-pathways.py',
            n=len(rows),
            thresholds=TH,
            windows={k: list(v) for k, v in WIN.items()},
        ),
        cols=STRING_COLS + BOOL_COLS + num_cols + ['stage:' + k for k in STAGE_KEYS],
        rows=out_rows,
        inventory=dict(
            sectors={int(r['year']): {k: sig(num(v)) for k, v in r.items() if k != 'year'} for r in inv_sec},
            net={int(r['year']): sig(num(r['eu_net_ghg_mt'])) for r in inv_net},
        ),
        funnel=funnel,
        sectorMedians=[{k: (v if k in ('sector', 'setting') else num(v)) for k, v in r.items()} for r in medians],
    )
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, 'pathways.json'), 'w', encoding='utf-8') as fh:
        json.dump(data, fh, ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(OUT_DIR, 'EU_six_sectors_2040_settings_deck.html'), 'wb') as fh:
        fh.write(deck)
    print(f'Wrote {len(out_rows)} pathways × {len(data["cols"])} columns to public/data/scenario-pathways/pathways.json')


if __name__ == '__main__':
    main()
