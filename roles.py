# One table of raw values with a role per value; every number is copied from a raw file, conversions are a factor in the table
import json, re, pandas as pd, numpy as np
S = pd.read_csv('/home/claude/setdeck2/systems_fix.csv', low_memory=False); ST = pd.read_csv('/home/claude/setdeck2/stages.csv')
B = S[S.det & ~S.dup].copy()
R0 = pd.read_pickle('raw_platform.pkl'); M = {int(k): v for k, v in json.load(open('meta_platform.json')).items()}
ROLE = {'Emissions|Kyoto Gases': 'NET', 'Emissions|CO2|Energy|Demand|Industry': 'IND_E', 'Emissions|CO2|Industrial Processes': 'IND_P', 'Primary Energy|Biomass': 'BIO', 'Emissions|CO2|AFOLU': 'LAND_CO2',
        'Secondary Energy|Hydrogen': 'H2', 'Final Energy': 'FE'}
CAPCHAIN = ['Carbon Capture', 'Carbon Capture|Geological Storage', 'Carbon Capture|Storage', 'Carbon Sequestration|CCS']
out = []
def add(sid, r, platform, file, region, variable, unit, year, value, role, factor=1.0, note=''):
    out.append(dict(sid=sid, src=r.src, platform=platform, file=file, model=r.model, scenario=r.scenario, region=region, variable=variable, unit=unit, year=int(year), value_published=float(value), factor=factor, role=role, note=note))
# platform rows: core raw (NET, IND) and re-pulled indicators
for x in R0.itertuples():
    r = S.loc[x.sid]
    if x.scope == 'World':
        if x.variable == 'Primary Energy|Biomass': role = 'WBIO'
        else: continue
    elif x.variable in CAPCHAIN or x.variable == 'Carbon Sequestration|CCS': continue
    else: role = ROLE.get(x.variable)
    if role is None: continue
    add(x.sid, r, x.platform, x.file, x.region, x.variable, x.unit, x.year, x.value, role, note=x.note)
# capture and world storage: first variable of the chain that the pathway reports (audit_fix/make_fix.py calc())
for sid, g in R0[R0.variable.isin(CAPCHAIN)].groupby('sid'):
    r = S.loc[sid]
    for scope, chain, role in (('EU', CAPCHAIN, 'CAP'), ('World', ['Carbon Sequestration|CCS', 'Carbon Capture', 'Carbon Capture|Geological Storage'], 'WCCS')):
        h = g[(g.scope == scope) & (g.year == 2050)]
        for v in chain:
            y = h[h.variable == v]
            if len(y) and pd.notna(y.value.iloc[0]) and y.value.iloc[0] != 0:
                k = y.iloc[0]; add(sid, r, k.platform, k.file, k.region, v, k.unit, 2050, k.value, role, note='' if v == chain[0] else f'first reported variable of: {" > ".join(chain)}'); break
# platform pathways whose indicators came from the first Scenario Compass pull (dl5/sc_all_eu.csv, sc_new_world.csv) or the national Scenario Compass pull
have = set(x['sid'] for x in out if x['role'] in ('CAP', 'BIO'))
SC = pd.read_csv('/home/claude/dl5/sc_all_eu.csv', low_memory=False); SC.columns = [c.lower() for c in SC.columns]
SW = pd.read_csv('/home/claude/dl5/sc_new_world.csv'); NSC = pd.read_csv('/home/claude/newsrc/platforms/raw/full__ixmp4__national-scenariocompass.csv')
PRI = ['European Union', 'European Union and United Kingdom', 'European Union (R9)']
def pri(rg):
    if rg in PRI: return PRI.index(rg)
    if re.search(r'\|EU ?27$', rg) or rg.endswith('|European Union') or rg in ('EU27', 'EU-27', 'EU27 (*)'): return 3
    if re.search(r'\|(EU ?28|EU & UK|EU27 and UK)$', rg) or rg in ('EU28', 'EU27 & UK', 'EU27+UK', 'EU27 & UK (*)', 'EU'): return 4
    return 9
for sid, r in B[B.tested & ~B.index.isin(have) & B.src.isin(['SC', 'JRC'])].iterrows():
    w = SC[(SC.model == r.model) & (SC.scenario == r.scenario)]
    if len(w):
        L = w.melt(id_vars=['model', 'scenario', 'region', 'variable', 'unit'], var_name='year', value_name='value'); L = L[L.year.str.isdigit()]; L['year'] = L.year.astype(int); f = 'dl5/sc_all_eu.csv (Scenario Compass pull, Nov 2026)'
    else:
        L = NSC[(NSC.model == r.model) & (NSC.scenario == r.scenario)]; f = 'newsrc/platforms/raw/full__ixmp4__national-scenariocompass.csv'
    L = L.dropna(subset=['value'])
    regs = sorted(L[L.variable == 'Emissions|Kyoto Gases'].region.unique(), key=pri) or sorted(L.region.unique(), key=pri)
    if not regs: continue
    e = L[L.region == regs[0]]; P = 'IIASA Scenario Compass'
    for v, role, y in (('Primary Energy|Biomass', 'BIO', 2050), ('Emissions|CO2|AFOLU', 'LAND_CO2', 2050), ('Secondary Energy|Hydrogen', 'H2', 2030), ('Final Energy', 'FE', 2020), ('Final Energy', 'FE', 2030)):
        k = e[(e.variable == v) & (e.year == y)]
        if len(k): add(sid, r, P, f, regs[0], v, k.unit.iloc[0], y, k.value.iloc[0], role)
    for v in CAPCHAIN:
        k = e[(e.variable == v) & (e.year == 2050)]
        if len(k) and k.value.iloc[0] != 0: add(sid, r, P, f, regs[0], v, k.unit.iloc[0], 2050, k.value.iloc[0], 'CAP', note='' if v == CAPCHAIN[0] else 'first reported variable of the capture chain'); break
    ww = SW[(SW.model == r.model) & (SW.scenario == r.scenario) & (SW.year == 2050)]
    for v, role in (('Carbon Capture|Geological Storage', 'WCCS'), ('Primary Energy|Biomass', 'WBIO')):
        k = ww[ww.variable == v]
        if len(k): add(sid, r, P, 'dl5/sc_new_world.csv (Scenario Compass pull, Nov 2026)', 'World', v, k.unit.iloc[0], 2050, k.value.iloc[0], role)
# ---- non-platform sources
def wide(df, sid, r, P, f, region, var, role, years, factor=1.0, note='', regcol='Region', varcol='Variable', unitcol='Unit'):
    x = df[(df[regcol] == region) & (df[varcol] == var)]
    for y in years:
        if len(x) and str(y) in x and pd.notna(pd.to_numeric(x[str(y)], errors='coerce').iloc[0]):
            add(sid, r, P, f, region, var, x[unitcol].iloc[0], y, float(pd.to_numeric(x[str(y)], errors='coerce').iloc[0]), role, factor, note)
SR = pd.read_csv('/home/claude/dl5/schreyer_eu27.csv', low_memory=False); E = pd.read_pickle('/home/claude/v4/elech2.pkl'); G = pd.read_pickle('/home/claude/v4/gcam_raw.pkl'); G = G[G.Model == 'GCAM 7.0']
for sid, r in B[B.src.isin(['Schreyer', 'ElecH2'])].iterrows():
    if r.src == 'Schreyer': d = SR[SR.Scenario == r.scenario]; P = 'Schreyer et al. 2025, Zenodo 10.5281/zenodo.17132530'; f = 'dl5/schreyer_eu27.csv (from AllScenarioData.mif)'
    else: d = E[E.Scenario == r.scenario]; P = 'Schreyer et al. 2024, Zenodo 10.5281/zenodo.10853459'; f = 'v4/elech2.pkl (from ScenarioData.mif)'
    wide(d, sid, r, P, f, 'EU27', 'Emi|GHG|LULUCF national accounting', 'NET', (2015, 2020, 2030, 2040, 2050))
    wide(d, sid, r, P, f, 'EU27', 'Emi|CO2|Energy|Demand|+|Industry', 'IND_E', (2020, 2050)); wide(d, sid, r, P, f, 'EU27', 'Emi|CO2|+|Industrial Processes', 'IND_P', (2020, 2050))
    wide(d, sid, r, P, f, 'EU27', 'Carbon Management|Carbon Capture', 'CAP', (2050,)); wide(d, sid, r, P, f, 'EU27', 'PE|+|Biomass', 'BIO', (2050,))
    wide(d, sid, r, P, f, 'EU27', 'Emi|CO2|Land-Use Change|LULUCF national accounting' if r.src == 'Schreyer' else 'Emi|GHG|Land-Use Change|LULUCF national accounting', 'LAND_CO2', (2050,))
    wide(d, sid, r, P, f, 'EU27', 'SE|Hydrogen', 'H2', (2030,)); wide(d, sid, r, P, f, 'EU27', 'FE', 'FE', (2020, 2030))
    if r.src == 'ElecH2': wide(d, sid, r, P, f, 'World', 'Carbon Management|Storage', 'WCCS', (2050,)); wide(d, sid, r, P, f, 'World', 'PE|+|Biomass', 'WBIO', (2050,))
for (st, s), g in G.groupby(['study', 'Scenario']):
    name = f"{st.split(' (')[0].replace('IAM COMPACT ', '')}: {s}"; m = B[(B.src == 'IAMC_GCAM') & (B.scenario == name)]
    if m.empty: continue
    sid = m.index[0]; r = m.iloc[0]; regs = ['EU-27'] if 'EU-27' in set(g.Region) else ['EU-12', 'EU-15']; P = f'{st}, Zenodo {g.doi.iloc[0]}'; f = 'v4/gcam_raw.pkl'
    for rg in regs:
        for v, role, yrs in (('Emissions|Kyoto Gases', 'NET', (2015, 2020, 2030, 2040, 2050)), ('Emissions|CO2|Energy|Demand|Industry', 'IND_E', (2020, 2050)), ('Emissions|CO2|Industrial Processes', 'IND_P', (2020, 2050)),
                             ('Primary Energy|Biomass', 'BIO', (2050,)), ('Emissions|CO2|AFOLU', 'LAND_CO2', (2050,)), ('Secondary Energy|Hydrogen', 'H2', (2030,)), ('Final Energy', 'FE', (2020, 2030))):
            wide(g, sid, r, P, f, rg, v, role, yrs, note='EU-12 and EU-15 summed' if len(regs) > 1 else '')
        ok = False
        for v in ('Carbon Capture', 'Carbon Sequestration|CCS'):
            x = g[(g.Region == rg) & (g.Variable == v)]
            if len(x) and pd.notna(pd.to_numeric(x['2050'], errors='coerce').iloc[0]) and not ok: wide(g, sid, r, P, f, rg, v, 'CAP', (2050,)); ok = True
    for v in ('Carbon Sequestration|CCS', 'Carbon Capture'):
        x = g[(g.Region == 'World') & (g.Variable == v)]
        if len(x) and pd.notna(pd.to_numeric(x['2050'], errors='coerce').iloc[0]): wide(g, sid, r, P, f, 'World', v, 'WCCS', (2050,), note='' if v == 'Carbon Sequestration|CCS' else 'first reported variable of: Carbon Sequestration|CCS > Carbon Capture'); break
    wide(g, sid, r, P, f, 'World', 'Primary Energy|Biomass', 'WBIO', (2050,))
# POLIZERO: figure tables of res.xlsx (cells copied)
X = pd.ExcelFile('/home/claude/r3work/dl/poli/res.xlsx')
def block(df, label, off=1):
    i = df.index[df[1] == label][0]; yrs = df.iloc[i + off]; o = {}; j = i + off + 1
    while j < len(df) and pd.notna(df.iloc[j, 1]):
        o[df.iloc[j, 1]] = {int(yrs[c]): float(df.iloc[j, c]) for c in df.columns[2:] if pd.notna(yrs[c]) and pd.notna(df.iloc[j, c])}; j += 1
    return o
P = 'POLIZERO, Panos et al. 2025, Zenodo 10.5281/zenodo.16759092'
for sid, r in B[B.src == 'POLIZERO'].iterrows():
    sc = r.scenario; e = block(X.parse('Figure 16a (EU)', header=None), sc); fe = block(X.parse('Figure 10 (EU)', header=None), sc)
    for y in (2020, 2030, 2040, 2050):
        if y in e['Net GHG emissions']: add(sid, r, P, 'r3work/dl/poli/res.xlsx, sheet Figure 16a (EU)', 'EU', 'Net GHG emissions', 'Mt CO2e', y, e['Net GHG emissions'][y], 'NET')
    for y in (2020, 2050): add(sid, r, P, 'r3work/dl/poli/res.xlsx, sheet Figure 16a (EU)', 'EU', 'Industry', 'Mt CO2e', y, e['Industry'][y], 'IND_E', note='sector row Industry (energy and process together)')
    add(sid, r, P, 'r3work/dl/poli/res.xlsx, sheet Figure 16a (EU)', 'EU', 'LULUCF', 'Mt CO2e', 2050, e['LULUCF'][2050], 'LAND_CO2')
    for y in (2020, 2030):
        for k in ('Industry', 'Services', 'Residential', 'Transport - domestic'): add(sid, r, P, 'r3work/dl/poli/res.xlsx, sheet Figure 10 (EU)', 'EU', f'Final energy, {k}', 'PJ/yr', y, fe[k][y], 'FE', note='final energy = sum of four sector rows, excl. international transport')
    if sc == 'CLI':
        cb = block(X.parse('Figure 16b (EU)', header=None), 'CLI Scenario'); hb = block(X.parse('Figure 14a (EU)', header=None), 'CLI', 0)
        for k in ('Power generation', 'Industrial process', 'Direct air capture'): add(sid, r, P, 'r3work/dl/poli/res.xlsx, sheet Figure 16b (EU)', 'EU', f'CO2 captured, {k}', 'Mt CO2', 2050, cb[k][2050], 'CAP', note='capture = power + industrial process + DAC')
        for k in ('Electricity', 'Fossil', 'Fossil with CCS', 'Bioenergy', 'Bioenergy with CCS'): add(sid, r, P, 'r3work/dl/poli/res.xlsx, sheet Figure 14a (EU)', 'EU', f'Hydrogen production, {k}', 'Mt H2', 2030, hb[k][2030], 'H2', factor=0.12, note='converted Mt H2 to EJ (× 0.12 EJ/Mt, LHV)')
# fresh pull of 23 Nov 2026 for pathways whose world values (and POTEnCIA's EU indicators) were not in the earlier pulls
FP = pd.read_csv('pull_world_nov23.csv'); haveR = {(x['sid'], x['role']) for x in out}
for (m, s_), g in FP.groupby(['model', 'scenario']):
    mm = B[(B.model == m) & (B.scenario == s_)]
    if mm.empty: continue
    sid = mm.index[0]; r = mm.iloc[0]; P = 'IIASA Scenario Compass (ixmp4: ' + g.slug.iloc[0] + ')'; f = 'xlsx_trace/pull_world_nov23.csv (pulled 23 Nov 2026)'
    w = g[g.region == 'World']
    if (sid, 'WCCS') not in haveR:
        for v in ('Carbon Sequestration|CCS', 'Carbon Capture', 'Carbon Capture|Geological Storage'):
            k = w[(w.variable == v) & (w.year == 2050)]
            if len(k) and k.value.iloc[0] != 0: add(sid, r, P, f, 'World', v, k.unit.iloc[0], 2050, k.value.iloc[0], 'WCCS', note='' if v == 'Carbon Sequestration|CCS' else 'first reported variable of: Carbon Sequestration|CCS > Carbon Capture > Carbon Capture|Geological Storage'); break
    if (sid, 'WBIO') not in haveR:
        k = w[(w.variable == 'Primary Energy|Biomass') & (w.year == 2050)]
        if len(k): add(sid, r, P, f, 'World', 'Primary Energy|Biomass', k.unit.iloc[0], 2050, k.value.iloc[0], 'WBIO')
    e = g[g.region != 'World']
    if (sid, 'BIO') not in haveR and len(e):
        regs = sorted(e[e.variable == 'Emissions|Kyoto Gases'].region.unique(), key=pri) or sorted(e.region.unique(), key=pri); e = e[e.region == regs[0]]
        for v, role, y in (('Primary Energy|Biomass', 'BIO', 2050), ('Emissions|CO2|AFOLU', 'LAND_CO2', 2050), ('Secondary Energy|Hydrogen', 'H2', 2030), ('Final Energy', 'FE', 2020), ('Final Energy', 'FE', 2030)):
            k = e[(e.variable == v) & (e.year == y)]
            if len(k): add(sid, r, P, f, regs[0], v, k.unit.iloc[0], y, k.value.iloc[0], role)
        for v in CAPCHAIN:
            k = e[(e.variable == v) & (e.year == 2050)]
            if len(k) and k.value.iloc[0] != 0: add(sid, r, P, f, regs[0], v, k.unit.iloc[0], 2050, k.value.iloc[0], 'CAP'); break
T = pd.DataFrame(out); T['value'] = T.value_published * T.factor
T.to_pickle('roles.pkl'); print(len(T), T.role.value_counts().to_dict()); print('pathways with NET:', T[T.role == 'NET'].sid.nunique(), 'with CAP or BIO:', T[T.role.isin(['CAP', 'BIO'])].sid.nunique())
