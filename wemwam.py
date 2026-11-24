# EU27 Member States' projections 2026 submission (EEA proj2026.xlsx, sheet Gas, Gapfilled), summed to the deck's sector scopes; AR5 GWPs
import openpyxl, json, collections
GWP = {"Unspecified": 1, "CO2 (kt)": 1, "CH4 (kt)": 28, "N2O (kt)": 265, "HFC (kt CO2e)": 1, "PFC (kt CO2e)": 1, "SF6 (kt)": 23500, "NF3 (kt)": 16100}
SC = {'total': (['Total including LULUCF'], None), 'supply': (['1.A.1. Energy industries', '1.B. Fugitive emissions from fuels'], ['CO2 (kt)']),
      'industry': (['1.A.2. Manufacturing industries and construction', '2.A. Mineral Industry', '2.B. Chemical industry', '2.C. Metal industry', '2.E. Electronics industry', '2.H. Other'], None),
      'mobility': (['1.A.3. Transport'], ['CO2 (kt)']), 'buildings': (['1.A.4.a. Commercial/Institutional', '1.A.4.b. Residential'], ['CO2 (kt)']),
      'agri': (['3. Agriculture'], ['CH4 (kt)', 'N2O (kt)']), 'eco': (['4. Land Use, Land-Use Change and Forestry (LULUCF, reported emissions and removals) (9)'], ['CO2 (kt)'])}
O = collections.defaultdict(lambda: collections.defaultdict(lambda: collections.defaultdict(float))); gas_tot = collections.Counter()
ws = openpyxl.load_workbook('/home/claude/dl/proj/proj2026.xlsx', read_only=True)['Gas']
for i, r in enumerate(ws.iter_rows(values_only=True)):
    if i == 0 or r[0] != 'EU27' or r[4] not in ('WEM', 'WAM'): continue
    v = r[8] if r[8] is not None else (r[7] if r[7] is not None else r[6])
    if v is None: continue
    for sk, (cats, gases) in SC.items():
        if r[3] in cats and (gases is None or r[5] in gases):
            if r[5] not in GWP: gas_tot[(sk, r[5])] += 1; continue
            O[r[4]][sk][r[1]] += v * GWP[r[5]] / 1000
print('skipped gases', dict(gas_tot))
J = {sc: {sk: {y: round(d[y], 1) for y in (2024, 2030, 2040, 2050) if y in d} for sk, d in O[sc].items()} for sc in O}
json.dump(J, open('wemwam.json', 'w'), indent=1); print(json.dumps(J, indent=0)[:1500])
