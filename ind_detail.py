# Industry detail per set member, values as reported (not harmonised); sources: ESABCC explorer and ECEMF pulls (pgr/sec_*.csv), Schreyer et al. 2025 and 2024 .mif files
import pandas as pd, json, numpy as np
X = pd.read_csv('systems_fix.csv', low_memory=False); S3 = pd.read_csv('sets3.csv', index_col=0)
ids = sorted(set(int(i) for k in ('s1', 's2', 's3') for i in S3.index[S3[k]]))
Y = [2020, 2030, 2040, 2050]
IAMC = {'fe': 'Final Energy|Industry', 'el': 'Final Energy|Industry|Electricity', 'h2': 'Final Energy|Industry|Hydrogen', 'co2e': 'Emissions|CO2|Energy|Demand|Industry', 'co2p': 'Emissions|CO2|Industrial Processes'}
MIF = {'fe': 'FE|++|Industry', 'el': 'FE|Industry|+|Electricity', 'h2': 'FE|Industry|+|Hydrogen', 'co2e': 'Emi|CO2|Energy|Demand|+|Industry', 'co2p': 'Emi|CO2|+|Industrial Processes'}
PG = {'ESABCC': pd.read_csv('/home/claude/pgr/sec_eu-climate-advisory-board.csv', low_memory=False), 'ecemf': pd.read_csv('/home/claude/pgr/sec_ecemf.csv', low_memory=False)}
def readmif(path, scens):
    rows = []
    with open(path) as fh:
        hdr = fh.readline().strip().rstrip(';').split(';')
        for ln in fh:
            p = ln.strip().rstrip(';').split(';')
            if p[2] == 'EU27' and p[1] in scens and p[3] in MIF.values(): rows.append(p)
    d = pd.DataFrame(rows, columns=hdr[:len(rows[0])]) if rows else pd.DataFrame(columns=hdr)
    return d
MF = {'Schreyer': '/home/claude/dl5/schreyer/data/AllScenarioData.mif', 'ElecH2': '/home/claude/r3work/dl/elech2/ElecH2_2023_7_12/ScenarioData.mif'}
need = {s: set(X.loc[[i for i in ids if X.at[i, 'src'] == s], 'scenario']) for s in MF}
MD = {s: readmif(p, need[s]) for s, p in MF.items()}
OUT = []
for i in ids:
    x = X.loc[i]; d = {'id': i, 'model': x.model, 'scenario': x.scenario, 'src': x.src, 'sets': [k for k in ('s1', 's2', 's3') if S3.at[i, k]], 'main': bool(S3.at[i, 's3']) or bool(S3.at[i, 's1']) or bool(S3.at[i, 's2'])}
    if x.src in PG:
        g = PG[x.src]; reg = x.ind_region if isinstance(x.ind_region, str) else 'EU27'
        g = g[(g.model == x.model) & (g.scenario == x.scenario) & (g.region == reg)]
        for k, v in IAMC.items():
            for y in Y:
                r = g[(g.variable == v) & (g.year == y)]
                d[f'{k}_{y}'] = float(r.value.iloc[0]) if len(r) else None
        d['region'] = reg; d['file'] = f'pgr/sec_{"eu-climate-advisory-board" if x.src == "ESABCC" else "ecemf"}.csv'
    elif x.src in MD:
        g = MD[x.src]; g = g[g.Scenario == x.scenario]
        for k, v in MIF.items():
            for y in Y:
                r = g[g.Variable == v]
                d[f'{k}_{y}'] = float(r[str(y)].iloc[0]) if len(r) and r[str(y)].iloc[0] not in ('', 'N/A') else None
        d['region'] = 'EU27'; d['file'] = MF[x.src].replace('/home/claude/', '')
    else:
        for k in IAMC:
            for y in Y: d[f'{k}_{y}'] = None
        d['region'] = ''; d['file'] = 'not pulled'
    OUT.append(d)
json.dump(OUT, open('ind_detail.json', 'w'), indent=0)
for d in OUT: print(d['id'], d['model'], d['scenario'][:28], d['src'], d['fe_2040'], d['el_2040'], d['h2_2040'], d['co2e_2040'], d['co2p_2040'])
