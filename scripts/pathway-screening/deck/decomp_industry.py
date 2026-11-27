"""Decomposition of EU27 manufacturing-industry GHG emissions, 2005-2024, into a production (activity) effect and an
intensity effect. Method R of the audit (docs-internal/industry-decomposition-audit-2026-11-26.md).

AI-compiled - pending Secretariat verification.

Scope (one scope for the deck's black line and the decomposition):
    1.A.2 minus 1.A.2.g.iii (mining), 1.A.2.g.v (construction), 1.A.2.g.vii (off-road)  +  2.A + 2.B + 2.C + 2.E + 2.H
    It reproduces the EEA series on the industry slide (887.7 Mt in 2005, 527.5 Mt in 2024) to within 0.05 Mt.

Inputs (decomp_data/, all retrieved 26 Nov 2026; URLs in decomp_data/SOURCES.md):
    emis_eurostat.json            Eurostat env_air_gge, EU27_2020, MIO_T (2026 inventory submission)
    crt_1A2g_subcategories.json   EU CRT 2026 Table 1.A(a)s2, 1.A.2.g sub-categories, Mt CO2e
    crt_activity_2005_2024.json   EU CRT 2026 Table 2(I).A-H activity data, kt (sum of reporting Member States; trends only)
    inpr_eurostat.json            Eurostat sts_inpr_a, I21, calendar adjusted (volume index)
    ../production_tonnes.json     crude steel (worldsteel / Eurofer) and cement (CEMBUREAU)

Method: LMDI-I additive per sub-branch, E = P x I (P = activity index, I = E / P):
    L = (E1 - E0) / ln(E1 / E0);  production effect = L ln(P1/P0);  intensity effect = L ln(I1/I0);  sum = E1 - E0 exactly.
    Sector index lines: production(t) = exp(sum of production effects 2005->t / L_t), intensity likewise (L_t = sector log-mean);
    they multiply exactly to the sector emissions index and match the waterfall.
Variants: R (matched physical activity where available, recommended) and V (volume index for every sub-branch).
"""
import json, math, os
H = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(H, 'decomp_data')
EM = json.load(open(f'{D}/emis_eurostat.json')); G = json.load(open(f'{D}/crt_1A2g_subcategories.json'))
AD = json.load(open(f'{D}/crt_activity_2005_2024.json')); IX = json.load(open(f'{D}/inpr_eurostat.json'))
TN = json.load(open(f'{H}/production_tonnes.json'))['series']
Y = list(range(2005, 2025))
e = lambda k: {y: float(EM[k][str(y)]) for y in Y}
ix = lambda k: {y: float(IX[k]['I21'][str(y)]) for y in Y}
ad = lambda k: {y: float(AD[k][str(y)]['AD_kt']) for y in Y}
tn = lambda k: {y: float(TN[k]['values'][str(y)]) for y in Y}
add = lambda *s: {y: sum(x[y] for x in s) for y in Y}
sub = lambda a, *b: {y: a[y] - sum(x[y] for x in b) for y in Y}

excl = {y: G['1.A.2.g.iii.'][str(y)] + G['1.A.2.g.v.'][str(y)] + G['1.A.2.g.vii.'][str(y)] for y in Y}
unalloc = sub(e('CRF1A2'), *[e(f'CRF1A2{c}') for c in 'ABCDEFG'])
TOTAL = sub(add(e('CRF1A2'), e('CRF2A'), e('CRF2B'), e('CRF2C'), e('CRF2E'), e('CRF2H')), excl)

# sub-branch: (emissions, activity measure for R, label of R measure, volume index for V)
SB = {
 'Iron and steel':        (add(e('CRF1A2A'), e('CRF2C1'), e('CRF2C2')), tn('crude_steel'), 'crude steel, t (worldsteel/Eurofer)', ix('C241')),
 'Cement':                (e('CRF2A1'), tn('cement'), 'cement, t (CEMBUREAU)', ix('C23')),
 'Lime':                  (e('CRF2A2'), ad('lime'), 'lime, t (EU CRT 2.A.2)', ix('C23')),
 'Glass':                 (e('CRF2A3'), ad('glass'), 'glass, t (EU CRT 2.A.3)', ix('C23')),
 'Other minerals':        (add(e('CRF1A2F'), sub(e('CRF2A'), e('CRF2A1'), e('CRF2A2'), e('CRF2A3'))), ix('C23'), 'volume index C23', ix('C23')),
 'Ammonia':               (e('CRF2B1'), ad('ammonia'), 'ammonia, t (EU CRT 2.B.1)', ix('C201')),
 'Nitric acid':           (e('CRF2B2'), ad('nitric'), 'nitric acid, t (EU CRT 2.B.2)', ix('C201')),
 'Adipic acid':           (e('CRF2B3'), ad('adipic'), 'adipic acid, t (EU CRT 2.B.3; partly confidential)', ix('C201')),
 'Petrochemicals':        (e('CRF2B8'), ad('ethylene'), 'ethylene, t (EU CRT 2.B.8.b)', ix('C201')),
 'Chemicals, fuel use and other': (add(e('CRF1A2C'), sub(e('CRF2B'), e('CRF2B1'), e('CRF2B2'), e('CRF2B3'), e('CRF2B8'))), ix('C201'), 'volume index C20.1 basic chemicals', ix('C20')),
 'Primary aluminium':     (e('CRF2C3'), ad('aluminium'), 'primary aluminium, t (EU CRT 2.C.3)', ix('C244')),
 'Other non-ferrous':     (add(e('CRF1A2B'), sub(e('CRF2C'), e('CRF2C1'), e('CRF2C2'), e('CRF2C3'))), ix('C244'), 'volume index C24.4', ix('C244')),
 'Pulp and paper':        (e('CRF1A2D'), ix('C17'), 'volume index C17', ix('C17')),
 'Food and drink':        (e('CRF1A2E'), ix('C10-C12'), 'volume index C10-C12', ix('C10-C12')),
 'Other manufacturing':   (add(sub(e('CRF1A2G'), excl), e('CRF2E'), e('CRF2H'), unalloc), ix('C'), 'volume index C (proxy)', ix('C')),
}
GROUP = {'Iron and steel': 'Steel', 'Cement': 'Cement, lime, glass', 'Lime': 'Cement, lime, glass', 'Glass': 'Cement, lime, glass', 'Other minerals': 'Cement, lime, glass',
         'Ammonia': 'Chemicals', 'Nitric acid': 'Chemicals', 'Adipic acid': 'Chemicals', 'Petrochemicals': 'Chemicals', 'Chemicals, fuel use and other': 'Chemicals',
         'Primary aluminium': 'Other manufacturing', 'Other non-ferrous': 'Other manufacturing', 'Pulp and paper': 'Other manufacturing', 'Food and drink': 'Other manufacturing', 'Other manufacturing': 'Other manufacturing'}

chk = max(abs(sum(v[0][y] for v in SB.values()) - TOTAL[y]) for y in Y); assert chk < 1e-6, chk
L = lambda a, b: a if abs(a - b) < 1e-12 else (b - a) / math.log(b / a)
def lmdi(var, y0, y1):
    out = {}
    for k, (E, PR, _, PV) in SB.items():
        P = PR if var == 'R' else PV
        w = L(E[y0], E[y1]); pe = w * math.log(P[y1] / P[y0]); ie = (E[y1] - E[y0]) - pe
        out[k] = (pe, ie, E[y0], E[y1])
    return out

if __name__ == '__main__':
    EEA = json.load(open(os.path.join(H, '..', '..', '..', 'inventory_sectors_2005_2024.json')))
    print('scope check vs slide series: max |diff| = %.3f Mt' % max(abs(TOTAL[y] - EEA[str(y)]['industry']) for y in Y))
    res = {'_note': __doc__.strip().split('\n\n')[0], 'scope_total_Mt': {y: round(TOTAL[y], 2) for y in Y}, 'variants': {}}
    for var in ('R', 'V'):
        for y0, y1 in ((2005, 2024), (2005, 2023), (2007, 2024), (2010, 2024)):
            r = lmdi(var, y0, y1); pe = sum(v[0] for v in r.values()); ie = sum(v[1] for v in r.values())
            res['variants'][f'{var} {y0}-{y1}'] = dict(production=round(pe, 1), intensity=round(ie, 1), total=round(pe + ie, 1), output_share_pct=round(pe / (pe + ie) * 100, 1))
            print(f'{var} {y0}-{y1}: production {pe:7.1f}  intensity {ie:7.1f}  total {pe+ie:7.1f}  output share {pe/(pe+ie)*100:5.1f} %')
    r = lmdi('R', 2005, 2024)
    res['subbranches_R_2005_2024'] = {k: dict(group=GROUP[k], measure=SB[k][2], E2005=round(v[2], 2), E2024=round(v[3], 2), production=round(v[0], 1), intensity=round(v[1], 1)) for k, v in r.items()}
    grp = {}
    for k, v in r.items():
        g = grp.setdefault(GROUP[k], [0, 0, 0, 0]); g[0] += v[0]; g[1] += v[1]; g[2] += v[2]; g[3] += v[3]
    res['groups_R_2005_2024'] = {g: dict(production=round(a, 1), intensity=round(b, 1), E2005=round(c, 1), E2024=round(d, 1)) for g, (a, b, c, d) in grp.items()}
    lines = {}
    for t in Y[1:]:
        rr = lmdi('R', 2005, t); pe = sum(v[0] for v in rr.values()); ie = sum(v[1] for v in rr.values()); w = L(TOTAL[2005], TOTAL[t])
        lines[t] = dict(emissions=round(TOTAL[t] / TOTAL[2005] * 100, 2), production=round(100 * math.exp(pe / w), 2), intensity=round(100 * math.exp(ie / w), 2))
    lines[2005] = dict(emissions=100, production=100, intensity=100)
    res['sector_index_R'] = {y: lines[y] for y in Y}
    n2o = sum(r[k][1] for k in ('Nitric acid', 'Adipic acid')); res['n2o_abatement_intensity_Mt'] = round(n2o, 1)
    json.dump(res, open(os.path.join(H, 'decomp_results.json'), 'w'), indent=1)
    for g, v in res['groups_R_2005_2024'].items(): print(f'  {g:22s} {v}')
    print('  sector indices 2024', lines[2024], ' N2O abatement (nitric+adipic intensity):', round(n2o, 1))
