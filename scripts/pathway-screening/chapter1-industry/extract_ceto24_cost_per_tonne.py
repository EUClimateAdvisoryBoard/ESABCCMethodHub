# Extract CETO 2024 (POTEnCIA) energy-related costs per tonne of output by industrial process, EU27.
# Source: JRC CETO 2024 5-year industry report ceto2024_EU27_ind_5years.xlsx (JRC open data), sheets ISI, NMM, CHI,
# block "Cost characteristics". Columns B..L = 2000, 2005, ..., 2050. AI-compiled - pending Secretariat verification.
import csv, sys, openpyxl
src = sys.argv[1]
wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
YRS = list(range(2000, 2051, 5))
COMP = {'Energy equipment capital and operating costs': 'total', 'Annuity of the capital costs': 'capex_annuity', 'Fixed costs': 'fixed_om',
        'Variable O&M costs': 'variable_om', 'Fuel costs': 'fuel', 'CO2 emissions related cost': 'co2'}
out = []
for sh in ('ISI', 'NMM', 'CHI'):
    proc = None
    for i, r in enumerate(wb[sh].iter_rows(values_only=True), 1):
        t = str(r[0] or '').strip()
        if 'Total energy related costs (€2015 per t of output)' in t: proc = t.split(' - Total')[0]; continue
        if proc and t in COMP:
            for y, v in zip(YRS, r[1:12]):
                if y in (2005, 2020, 2030, 2040, 2050):
                    out.append(dict(process=proc, component=COMP[t], year=y, value=v, unit='EUR2015/t output', sheet=sh, row=i, label=t))
        if t.startswith('Energy equipment related costs per energy consumed'): proc = None
w = csv.DictWriter(open('ceto24_cost_per_tonne.csv', 'w', newline='', encoding='utf-8'), fieldnames=list(out[0])); w.writeheader(); w.writerows(out)
print(len(out), sorted({o['process'] for o in out}))
