exec(open('facet.py').read().split("NZ = [('0'")[0])
import json
S3 = pd.read_csv('sets3.csv', index_col=0)
ids = sorted(set(int(i) for k in ('s1', 's2', 's3') for i in S3.index[S3[k]]))
cols = [f'{k}_{y}' for k in SEC for y in (2020, 2030, 2040, 2050)]
rows = []
for i in ids:
    d = dict(id=i, model=ST.at[i, 'model'], scenario=ST.at[i, 'scenario'], ecl=bool(S3.at[i, 's1']), red=bool(S3.at[i, 's2']), esabcc=bool(S3.at[i, 's3']))
    for c in cols: d[c] = None if pd.isna(ST.at[i, c]) else round(float(ST.at[i, c]), 1)
    rows.append(d)
json.dump(dict(rows=rows, sec={k: [v[0], v[1]] for k, v in SEC.items()}, IA={k: {s: [round(float(x), 1) for x in v] for s, v in d.items()} for k, d in IA.items()},
               H={str(y): {k: round(float(v), 1) for k, v in H[y].items()} for y in H}, HN={str(y): round(float(v), 1) for y, v in HN.items()}, WW=json.load(open('wemwam.json'))), open('/home/claude/xlsx_trace/sector_dump.json', 'w'))
print(len(rows), list(SEC)[:8], cols[:4])
