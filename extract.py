# Collect, for every screened pathway, the raw values behind each screening criterion (read-only on all sources)
import sys, json, re, pandas as pd, numpy as np
sys.path.insert(0, '/home/claude/newsrc/platforms'); import rowbuilder as RB, common as CM
S = pd.read_csv('/home/claude/setdeck2/systems_fix.csv', low_memory=False)
ST = pd.read_csv('/home/claude/setdeck2/stages.csv'); S['red30'] = ST.red30.iloc[:len(S)].values
B = S[S.det & ~S.dup].copy(); print('screened pathways', len(B), B.src.value_counts().to_dict())
RAW = '/home/claude/newsrc/platforms/raw/'
FILES = {'SC': ['core__ixmp4__scenariocompass.csv'], 'JRC': ['core__ixmp4__scenariocompass.csv', 'core__ixmp4__national-scenariocompass.csv'], 'navigate': ['core__ixmp4__navigate.csv'],
         'ecemf': ['core__ixmp4__ecemf.csv'], 'CircEUlar': ['core__ixmp4__circeular.csv'], 'deeds': ['core__legacy__deeds.csv'], 'ESABCC': ['core__legacy__eu-climate-advisory-board.csv'],
         'ngfs_phase_4': ['core__legacy__ngfs_phase_4.csv'], 'ngfs_phase_5': ['core__legacy__ngfs_phase_5.csv']}
PLAT = {'SC': 'IIASA Scenario Compass (ixmp4: scenariocompass)', 'JRC': 'IIASA Scenario Compass (ixmp4: scenariocompass / national-scenariocompass)', 'navigate': 'IIASA NAVIGATE (ixmp4: navigate)',
        'ecemf': 'IIASA ECEMF (ixmp4: ecemf)', 'CircEUlar': 'IIASA CircEUlar (ixmp4: circeular)', 'deeds': 'IIASA DEEDS (legacy: deeds)', 'ESABCC': 'IIASA ESABCC explorer (legacy: eu-climate-advisory-board)',
        'ngfs_phase_4': 'IIASA NGFS phase 4 (legacy)', 'ngfs_phase_5': 'IIASA NGFS phase 5 (legacy)'}
cache = {}
def load(f):
    if f not in cache: cache[f] = pd.read_csv(RAW + f)
    return cache[f]
rows = []; meta = {}
YK = (2015, 2020, 2030, 2040, 2050)
for i, r in B.iterrows():
    if r.src not in FILES: continue
    g = pd.concat([load(f)[lambda d: (d.model == r.model) & (d.scenario == r.scenario)].assign(file=f) for f in FILES[r.src]])
    if g.empty: meta[i] = dict(region=None, kreg=None, rawnote='not found in the raw pull'); continue
    D, conv, bad = RB.to_dict(g.drop(columns='file'))
    reg, why = RB.choose(D)
    kreg = reg if CM.KY in D.get(reg, {}) else next((x for x in sorted(D, key=RB.pri) if CM.KY in D[x]), None)
    f_of = lambda rg, v: g[(g.region == rg) & (g.variable == v)].file.iloc[0] if len(g[(g.region == rg) & (g.variable == v)]) else ''
    for v, rg, yrs in ((CM.KY, kreg, YK), (CM.IE, reg, (2020, 2050)), (CM.IP, reg, (2020, 2050))):
        if rg is None: continue
        for y in yrs:
            x = D.get(rg, {}).get(v, {}).get(y)
            if x is not None: rows.append(dict(sid=i, src=r.src, platform=PLAT[r.src], file=f_of(rg, v), model=r.model, scenario=r.scenario, region=rg, variable=v, unit='Mt CO2e/yr' if v == CM.KY else 'Mt CO2/yr', year=y, value=x, note=';'.join(sorted(conv)) if conv else ''))
    meta[i] = dict(region=reg, kreg=kreg, rawnote='')
# indicators: re-pulled values of audit_fix (2020, 2030, 2050) with the make_fix.py region rule
IND = pd.concat([pd.read_csv('/home/claude/audit_fix/ind_raw_untested.csv').assign(file='audit_fix/ind_raw_untested.csv'), pd.read_csv('/home/claude/audit_fix/ind_raw_tested.csv').assign(file='audit_fix/ind_raw_tested.csv')]).drop_duplicates(['model', 'scenario', 'region', 'variable', 'year', 'src'])
import importlib.util
src_mf = open('/home/claude/audit_fix/make_fix.py').read(); pri = None
exec(src_mf[src_mf.index('PRI = '):src_mf.index('RAW = ')])
IV = ['Carbon Capture', 'Carbon Capture|Geological Storage', 'Carbon Capture|Storage', 'Carbon Sequestration|CCS', 'Primary Energy|Biomass', 'Emissions|CO2|AFOLU', 'Secondary Energy|Hydrogen', 'Final Energy']
nind = 0
for i, r in B.iterrows():
    g = IND[(IND.model == r.model) & (IND.scenario == r.scenario) & (IND.src == r.src)]
    if g.empty: continue
    eu = g[g.region != 'World']; w = g[g.region == 'World']
    regs = sorted(eu[eu.variable == 'Emissions|Kyoto Gases'].region.unique(), key=pri) or sorted(eu.region.unique(), key=pri)
    e = eu[eu.region == regs[0]]; nind += 1
    for d_, scope in ((e, 'EU'), (w, 'World')):
        for x in d_[d_.variable.isin(IV) & d_.year.isin([2020, 2030, 2050])].itertuples():
            if scope == 'World' and x.variable not in ('Carbon Sequestration|CCS', 'Carbon Capture', 'Primary Energy|Biomass'): continue
            val, note = x.value, ''
            if x.unit == 'PJ/yr': val, note = x.value / 1000, 'converted PJ/yr to EJ/yr (÷ 1,000)'
            rows.append(dict(sid=i, src=r.src, platform=PLAT.get(r.src, r.src), file=x.file, model=r.model, scenario=r.scenario, region=x.region, variable=x.variable, unit='EJ/yr' if note else x.unit, year=int(x.year), value=val, note=note, scope=scope))
    meta.setdefault(i, {})['ireg'] = regs[0]
R = pd.DataFrame(rows); R['scope'] = R.scope.fillna('EU')
print('raw rows', len(R), '| pathways with core raw', R[R.variable == CM.KY].sid.nunique(), '| with indicator raw', nind)
R.to_pickle('raw_platform.pkl'); json.dump({int(k): v for k, v in meta.items()}, open('meta_platform.json', 'w'))
