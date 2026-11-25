"""Re-screen the three EU pathway sets with added sources.

AI-compiled — pending Secretariat verification.

This is a stand-alone re-implementation of the rules in the sheet "Screening" of
EU_pathway_screening_three_sets.xlsx (built 23 Nov 2026). The workbook's own build script
(build_xlsx3.py) reads files that are not in this repository, so this script reads the
workbook itself: values from sheet Raw, limits from sheet Limits, per-pathway inputs (source,
JRC net-zero flag, ESABCC main-run flag, stored ESABCC 2040 cut) from sheet Screening.

Without additions it reproduces the workbook exactly: 3 (ECL) / 10 (ECL +10%) / 8 (ESABCC 2040),
23 ESABCC 2040 passes before the main-run selection, and the same "stops at" reason for all
1,219 pathways. Run with --check to assert this.

Added sources live in additions/<source>_raw.csv (rows in the Raw-sheet format, each with a
locator in Note) and additions/<source>_scenarios.csv (ID, Model, Scenario, main_run, src,
one_total). Exceptions to the workbook rules are not written into the data: they live in
pathway-screening-overrides.json, one entry per exception with a stable content-hash id and a
prose reason tagged with the pass. Deleting an entry and re-running reverses it.

Supported override rules:
  base_year            harmonise net GHG on this year (scaled to the inventory value of that
                       year) when the pathway reports neither 2015 nor 2020
  industry_start_year  accept industry emissions for this year in place of 2020 in the
                       "industry data reported" rule
  industry_process_start_year
                       the same, for industrial process CO2 only (energy CO2 keeps 2020 or
                       industry_start_year)

Usage (from the repository root):
  python3 -I scripts/pathway-screening/screen_three_sets.py --check
  python3 -I scripts/pathway-screening/screen_three_sets.py [--out result.csv]
"""
import argparse, glob, hashlib, json, os, sys
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
ap = argparse.ArgumentParser()
ap.add_argument('--workbook', default=os.path.join(ROOT, 'EU_pathway_screening_three_sets.xlsx'))
ap.add_argument('--inventory', default=os.path.join(ROOT, 'inventory_eu_net_ghg.json'))
ap.add_argument('--additions', default=os.path.join(HERE, 'additions'))
ap.add_argument('--overrides', default=os.path.join(HERE, 'pathway-screening-overrides.json'))
ap.add_argument('--check', action='store_true', help='screen the workbook alone and assert it reproduces 3 / 10 / 8')
ap.add_argument('--out', default=None)
A = ap.parse_args()

INV = {int(k): v for k, v in json.load(open(A.inventory)).items()}
lim = pd.read_excel(A.workbook, sheet_name='Limits', header=2)
L = dict(zip(lim.Item, lim.Value))
B1990 = L['EU net GHG 1990 (inventory)']
P = dict(min30=L['2030 cut against 1990, at least'], wlo=L['ECL and ECL +10%: 2040 cut, lower bound'], whi=L['ECL and ECL +10%: 2040 cut, upper bound (exclusive)'],
         w3lo=L['ESABCC 2040: 2040 cut, lower bound'], w3hi=L['ESABCC 2040: 2040 cut, upper bound (exclusive)'],
         net_ecl=L['ECL: EU net GHG 2050 at most'], net_red=L['ECL +10%: EU net GHG 2050 at most'], net_es=L['ESABCC 2040: EU net GHG 2050 at most'],
         tol=L[[k for k in L if k.startswith('ECL +10%: tolerance')][0]],
         f_cap=L['Filter: EU CO2 capture 2050'], f_bio=L['Filter: EU primary bioenergy 2050'], f_wccs=L['Filter: world CO2 storage 2050'], f_wbio=L['Filter: world primary bioenergy 2050'],
         f_h2=L['Filter: EU hydrogen production 2030'], f_fe=L['Filter: EU final energy decline 2020–2030'],
         r_cap=L['Risk level: EU CO2 capture 2050'], r_bio=L['Risk level: EU primary bioenergy 2050'], r_land=L['Risk level: EU land sink 2050'])

raw = pd.read_excel(A.workbook, sheet_name='Raw')[['ID', 'Role', 'Year', 'Value used']]
sc = pd.read_excel(A.workbook, sheet_name='Screening', header=3)
meta = sc[['ID', 'Database source', 'Model', 'Scenario', 'Industry reported as one total', 'JRC net-zero flag (database)', 'ESABCC 2040: main run (input)', 'Stored: 2040 cut']].copy()
meta.columns = ['ID', 'src', 'model', 'scenario', 'one_total', 'jrc_flag', 'main', 'stored40']
truthy = lambda x: str(x).strip().upper() in ('TRUE', '1', '1.0')

OVR = {}
if not A.check:
    for f in sorted(glob.glob(os.path.join(A.additions, '*_raw.csv'))):
        r = pd.read_csv(f)
        if len(r) == 0: continue
        r = r[~r.Role.astype(str).str.endswith('_INTL')]          # international-transport variants are kept for reference only
        r['Value used'] = r['Value as published'].astype(float) * r['Factor'].astype(float)
        raw = pd.concat([raw, r[['ID', 'Role', 'Year', 'Value used']]], ignore_index=True)
    for f in sorted(glob.glob(os.path.join(A.additions, '*_scenarios.csv'))):
        s = pd.read_csv(f)
        for x in s.itertuples():
            meta.loc[len(meta)] = dict(ID=x.ID, src=x.src, model=x.Model, scenario=x.Scenario, one_total=truthy(getattr(x, 'one_total', False)), jrc_flag='', main=truthy(x.main_run), stored40=None)
    if os.path.exists(A.overrides):
        for o in json.load(open(A.overrides)):
            body = json.dumps({k: o[k] for k in ('pathway_id', 'rule', 'value')}, sort_keys=True)
            want = 'pso-' + hashlib.sha256(body.encode()).hexdigest()[:8]
            if o['id'] != want: sys.exit(f"override id {o['id']} does not match its content (expected {want})")
            OVR.setdefault(int(o['pathway_id']), {})[o['rule']] = o['value']

V = raw.groupby(['ID', 'Role', 'Year'])['Value used'].sum()
def val(i, role, y):
    try: return float(V.loc[(i, role, y)])
    except KeyError: return None

rows = []
for m in meta.itertuples():
    i = int(m.ID); g = lambda role, y: val(i, role, y); ov = OVR.get(i, {})
    n15, n20 = g('NET', 2015), g('NET', 2020)
    base_y, base_v = (2015, n15) if (n15 is not None and n15 > 0) else ((2020, n20) if n20 is not None else (None, None))
    if base_y is None and 'base_year' in ov and g('NET', int(ov['base_year'])) is not None:
        base_y = int(ov['base_year']); base_v = g('NET', base_y)
    cut = lambda x: None if (x is None or base_y is None) else (1 - x * INV[base_y] / base_v / B1990) * 100
    c30 = cut(g('NET', 2030))
    c40 = m.stored40 if (m.src == 'ESABCC' and pd.notna(m.stored40)) else cut(g('NET', 2040))
    n50 = g('NET', 2050)
    y0 = int(ov.get('industry_start_year', 2020))
    y0p = int(ov.get('industry_process_start_year', y0))
    ie0, ie50, ip0, ip50 = g('IND_E', y0), g('IND_E', 2050), g('IND_P', y0p), g('IND_P', 2050)
    ind_ok = ie0 is not None and ie50 is not None and (bool(m.one_total) or (ip0 is not None and ip50 is not None)) and ((ie0 or 0) + (ip0 or 0)) > 0
    cap, bio, land, h2, fe20, fe30, wccs, wbio = g('CAP', 2050), g('BIO', 2050), g('LAND_CO2', 2050), g('H2', 2030), g('FE', 2020), g('FE', 2030), g('WCCS', 2050), g('WBIO', 2050)
    sink = None if land is None else -land
    fed = None if (fe20 is None or fe30 is None) else (1 - fe30 / fe20) * 100
    r30 = True if c30 is None else c30 >= P['min30']
    w1 = c40 is not None and P['wlo'] <= c40 < P['whi']
    w3 = c40 is not None and P['w3lo'] <= c40 < P['w3hi']
    net_rule = lambda t: truthy(m.jrc_flag) if m.src == 'JRC' else (n50 is not None and n50 <= t)
    ab = lambda x, l, t=0: x is not None and x > l * (1 + t)
    FL = {'capture > filter': ab(cap, P['f_cap']), 'bioenergy > filter': ab(bio, P['f_bio']), 'world storage > filter': ab(wccs, P['f_wccs']), 'world bioenergy > filter': ab(wbio, P['f_wbio']),
          'hydrogen > filter': ab(h2, P['f_h2']), 'final energy > filter': ab(fed, P['f_fe'])}
    RK = {'capture > risk level': ab(cap, P['r_cap']), 'bioenergy > risk level': ab(bio, P['r_bio']), 'land sink > risk level': ab(sink, P['r_land'])}
    t = P['tol']
    RL = {'capture > filter +10%': ab(cap, P['f_cap'], t), 'bioenergy > filter +10%': ab(bio, P['f_bio'], t), 'world storage > filter +10%': ab(wccs, P['f_wccs'], t),
          'world bioenergy > filter': FL['world bioenergy > filter'], 'hydrogen > filter': FL['hydrogen > filter'], 'final energy > filter': FL['final energy > filter'],
          'capture > risk level +10%': ab(cap, P['r_cap'], t), 'bioenergy > risk level +10%': ab(bio, P['r_bio'], t), 'land sink > risk level': RK['land sink > risk level']}
    has_any = i in V.index.get_level_values(0)
    def stop(net_ok, win, lims):
        if not has_any: return 'no values published (not checkable)'
        if not ind_ok: return 'no industry data'
        if not net_ok: return '2050 net GHG rule'
        if not r30: return '2030 cut below 55%'
        if not win: return '2040 cut outside window'
        hit = [k for k, x in lims.items() if x]
        return '; '.join(hit) if hit else 'passes all'
    s_ecl, s_red, s_es = stop(net_rule(P['net_ecl']), w1, {**FL, **RK}), stop(net_rule(P['net_red']), w1, RL), stop(net_rule(P['net_es']), w3, {**FL, **RK})
    es_pass = s_es == 'passes all'
    rows.append(dict(ID=i, src=m.src, model=m.model, scenario=m.scenario, base_year=base_y, industry_start_year=y0, overrides=';'.join(sorted(ov)) or '',
                     cut2030=c30, cut2040=c40, net2050=n50, capture=cap, bioenergy=bio, land_sink=sink, h2_2030=h2, fe_decline=fed, industry_reported=ind_ok,
                     in_ecl=s_ecl == 'passes all', in_ecl_plus10=s_red == 'passes all', esabcc2040_passes=es_pass, in_esabcc2040=es_pass and truthy(m.main),
                     stop_ecl=s_ecl, stop_ecl_plus10=s_red, stop_esabcc2040=s_es if not (es_pass and not truthy(m.main)) else 'passes; sensitivity variant, not a main run'))
R = pd.DataFrame(rows)
n = (int(R.in_ecl.sum()), int(R.in_ecl_plus10.sum()), int(R.in_esabcc2040.sum()), int(R.esabcc2040_passes.sum()))
print(f'{len(R)} pathways | ECL {n[0]} | ECL +10% {n[1]} | ESABCC 2040 {n[2]} (passes before main-run selection {n[3]})')
if A.check:
    if n != (3, 10, 8, 23): sys.exit(f'FAIL: workbook not reproduced, got {n}')
    print('OK: workbook reproduced')
new = R[~R.ID.isin(sc.ID)]
if len(new):
    print(new[['ID', 'src', 'scenario', 'cut2040', 'net2050', 'overrides', 'stop_ecl', 'stop_ecl_plus10', 'stop_esabcc2040']].round(1).to_string(index=False))
if A.out: R.to_csv(A.out, index=False)
