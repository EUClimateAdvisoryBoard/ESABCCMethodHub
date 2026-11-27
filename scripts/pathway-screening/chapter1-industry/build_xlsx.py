# Build the chapter-1 industry workbook from the three extraction CSVs. AI-compiled - pending Secretariat verification.
import csv, sys, os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter as CL
S = os.path.dirname(os.path.abspath(__file__)); OUT = sys.argv[1]
ECL = [('779', 'ESABCC 2023, REMIND 3.2', 'rigid_bioLim7p5_300_withICEPhOP'), ('1266', 'Schreyer 2025, REMIND-EU', '07_NZ_CCS180_highImp'),
       ('1275', 'Schreyer 2025, REMIND-EU', '07_NZ_CCS350_highImp'), ('3162', 'Rodrigues 2026, REMIND', '14_Nzero_57_bio7p5'),
       ('2400', 'JRC CETO 2024, POTEnCIA', 'CETO 2024 scenario'), ('2000', 'Agora 2023', 'EU Gas Exit Pathway (central)')]
PLUS = [('1257', 'Schreyer 2025, REMIND-EU', '07_NZ_CCS110_highImp'), ('1321', 'ElecH2 (Schreyer 2024), REMIND-EU', 'Elec_imp_Ag280'),
        ('1322', 'ElecH2 (Schreyer 2024), REMIND-EU', 'H2_dom_Ag280'), ('1325', 'ElecH2 (Schreyer 2024), REMIND-EU', 'Synf_imp_Ag280'),
        ('862', 'ECEMF, REMIND 2.1', 'WP1 NetZero [pre-release 2023-11-14]'), ('718', 'JRC CETO 2025, POTEnCIA 4.2', 'CETO 2025 scenario'),
        ('1327', 'POLIZERO, JRC-EU-TIMES', 'CLI'), ('2421', 'EC 2040 IA, PRIMES-GAINS-GLOBIOM', 'S2')]
PW = ECL + PLUS
ITEMS = [('elec', 'direct', '1. Final electricity use in industry (as reported; excludes electricity used to make hydrogen)', 'TWh/yr'),
         ('h2', 'total', '2. Hydrogen use in industry (not in item 1)', 'TWh/yr'), ('h2', 'energy', '   energy use', 'TWh/yr'), ('h2', 'feedstock', '   feedstock', 'TWh/yr'),
         ('bio', 'total', '3. Biomass use in industry', 'TWh/yr'), ('bio', 'fuel', '   fuel', 'TWh/yr'), ('bio', 'feedstock', '   feedstock', 'TWh/yr'),
         ('plastic', 'total', '4. Plastic waste use in industry', 'TWh/yr'),
         ('capture', 'total', '5. CO2 captured in industry', 'Mt CO2/yr'), ('capture', 'fossil', '   fossil (incl. process)', 'Mt CO2/yr'), ('capture', 'biogenic', '   biogenic', 'Mt CO2/yr'),
         ('ghg', 'net', '6. GHG emissions in industry, net (as reported)', 'Mt CO2e/yr'), ('ghg', 'gross', '   gross: before negative-emission credits', 'Mt CO2e/yr'),
         ('ghg', 'before_capture', '   before any capture (net + captured CO2, derived)', 'Mt CO2e/yr'), ('ghg', 'co2_energy', '   of which energy CO2 (net)', 'Mt CO2/yr'),
         ('ghg', 'co2_process', '   of which process CO2 (net)', 'Mt CO2/yr'), ('ghg', 'nonco2', '   of which non-CO2', 'Mt CO2e/yr'),
         ('sector', 'steel', '7. Residual emissions by industrial sector (CO2, energy + process, after CCS): steel', 'Mt CO2/yr'),
         ('sector', 'cement', '   cement (non-metallic minerals: cement, lime, glass, ceramics)', 'Mt CO2/yr'), ('sector', 'chemicals', '   chemicals', 'Mt CO2/yr'),
         ('sector', 'non_ferrous', '   non-ferrous metals (REMIND: inside other)', 'Mt CO2/yr'), ('sector', 'pulp_paper', '   pulp and paper (REMIND, CETO 2025: inside other)', 'Mt CO2/yr'),
         ('sector', 'food', '   food and drink (REMIND, CETO 2025: inside other)', 'Mt CO2/yr'), ('sector', 'other', '   other industry', 'Mt CO2/yr'),
         ('sector', 'total', '   sum of sectors (compare item 6 net; difference = non-CO2 and unallocated)', 'Mt CO2/yr')]
ROWS = []
for g in ('remind', 'jrc', 'ecagora'):
    for suf in ('', '_sectors'):
        p = os.path.join(S, f'{g}{suf}.csv')
        if os.path.exists(p): ROWS += [dict(r, group=g) for r in csv.DictReader(open(p, encoding='utf-8'))]
# Electricity used to make hydrogen is not reported by any model; it is not estimated here (decision 27 Nov 2026).
ROWS = [x for x in ROWS if not (x['item'] == 'elec' and x['component'] == 'for_h2')]
COSTS = []
for g in ('remind', 'jrc', 'ecagora'):
    p = os.path.join(S, f'{g}_costs.csv')
    if os.path.exists(p): COSTS += list(csv.DictReader(open(p, encoding='utf-8')))
# ---- harmonisation of definitions across groups (each change is recorded in the row's derivation/note)
def mk(base, **kw):
    d = dict(base); d.update(kw); return d
V = {(x['ID'], x['item'], x['component'], x['year']): x for x in ROWS if x['value'].strip()}
out = []
for x in ROWS:
    if x['item'] == 'elec' and x['component'] == 'total':
        if not x['value'].strip() or (x['ID'], 'elec', 'direct', x['year']) in V: continue   # total = direct in every source except Agora 2050
        x = mk(x, component='direct', note='[orchestrator] reported as total industry electricity; no electrolysis in it, so shown as direct use. ' + x['note'])
    if x['ID'] == '2421' and x['item'] == 'ghg' and x['component'] == 'gross':
        b = V.get(('2421', 'capture', 'biogenic', x['year']))
        if b:
            x = mk(x, value=str(float(V[('2421', 'ghg', 'net', x['year'])]['value']) + float(b['value'])), derivation='gross = net + capture_biogenic',
                   note='[orchestrator] recomputed so gross means the same as in the other models (before negative-emission credits, fossil CCS netted). The extraction agent had net + all capture (' + x['value'] + ' Mt), which is shown in row "before any capture". ' + x['note'])
        else:
            x = mk(x, value='', derivation='', note='[orchestrator] not available: the biogenic share of capture is not published for this year, so gross in the common definition cannot be formed. ' + x['note'])
    out.append(x)
for (pid, it, comp, y), x in list(V.items()):
    if it == 'ghg' and comp == 'net':
        f, b, t = V.get((pid, 'capture', 'fossil', y)), V.get((pid, 'capture', 'biogenic', y)), V.get((pid, 'capture', 'total', y))
        if f and b: cap, how = float(f['value']) + float(b['value']), 'capture_fossil + capture_biogenic'
        elif t: cap, how = float(t['value']), 'capture_total'
        else: continue
        out.append(mk(x, component='before_capture', value=str(float(x['value']) + cap), derivation=f'before_capture = net + {how}', variable_as_published='derived',
                      note='[orchestrator] emissions if no CO2 were captured (biogenic CO2 counted as zero); assumes all captured CO2 is deducted from reported industry emissions. Check the model notes: some models also capture CO2 from refineries, hydrogen or synthetic fuels.'))
ROWS = out
F = 'Arial'; H = Font(name=F, bold=True, color='FFFFFF'); B = Font(name=F, bold=True); N = Font(name=F); BL = Font(name=F, color='0000FF'); GR = Font(name=F, color='008000')
HF = PatternFill('solid', fgColor='004B7F'); EF = PatternFill('solid', fgColor='E6F0F7'); PF = PatternFill('solid', fgColor='F2F2F2'); OF = PatternFill('solid', fgColor='FFF4E8')
thin = Border(bottom=Side(style='thin', color='BFBFBF'))
wb = Workbook()

# README
ws = wb.active; ws.title = 'README'
txt = [('Industry indicators for chapter 1: ECL-compatible set and ECL +10 % set, 2040 and 2050', B),
       ('AI-compiled — pending Secretariat verification. Built 27 Nov 2026 from the published model output of each pathway; every value is traceable to a file and locator on sheet Data.', Font(name=F, bold=True, color='C55A11')),
       ('Internal working file for chapter 1. Pathway 779 (ESABCC 2023 REMIND run) is read from the IIASA eu-climate-advisory-board database; all other sources are public model releases (see sheet Data).', Font(name=F, bold=True, color='C00000')),
       ('', N),
       ('Sheets', B),
       ('Ranges — min, median, max and number of reporting pathways per item, set and year. All cells are formulas over sheet By pathway.', N),
       ('By pathway — one value per pathway, item and year. All cells are formulas that read sheet Data (blank = not reported).', N),
       ('Data — every extracted value with the variable as published, the file, locator, derivation and notes (blue = value from source; derived values say how).', N),
       ('Definitions — what each item covers and how the splits are made, including whether hydrogen electricity is in item 1.', N),
       ('Costs — industry CAPEX and OPEX where a pathway publishes them (as published: units, price bases and periods differ, so no ranges are formed).', N),
       ('Costs per tonne — CETO 2024 cost per tonne of steel (both routes), cement, glass and chemicals, split into CAPEX, OPEX and CO2 cost (formulas).', N),
       ('Extraction notes — per-model notes on variables, scope and anomalies. Rebuild: python3 -I build_xlsx.py <out.xlsx> in scripts/pathway-screening/chapter1-industry/.', N),
       ('', N),
       ('Sets (screening of 2,161 pathways, see scripts/pathway-screening/)', B),
       ('ECL-compatible (6): 2040 cut 85–90 % vs 1990, net GHG ≤ 0 Mt in 2050, 2030 cut ≥ 55 %, ESABCC feasibility filters and risk levels.', N),
       ('ECL +10 % (14, includes the 6): same 2040 window; net GHG ≤ 50 Mt in 2050; 10 % tolerance on capture and bioenergy limits.', N),
       ('', N),
       ('Caveats', B),
       ('Values are as reported by each model (not harmonised to the inventory). Model scopes differ: see Definitions and the notes on sheet Data.', N),
       ('n is the number of pathways that report the item; a range over few pathways is not representative of the set. "Not reported" pathways are excluded, never filled in.', N),
       ('Region is EU27 unless the Data note says otherwise.', N)]
for i, (t, f) in enumerate(txt, 1): c = ws.cell(i, 1, t); c.font = f
ws.column_dimensions['A'].width = 150

# Data
wd = wb.create_sheet('Data')
cols = ['key', 'ID', 'source / model', 'scenario', 'set', 'item', 'component', 'year', 'value', 'unit', 'variable as published', 'file', 'locator', 'derivation', 'note']
for j, h in enumerate(cols, 1): c = wd.cell(1, j, h); c.font = H; c.fill = HF
meta = {p[0]: p for p in PW}
r = 2
for x in ROWS:
    pid = x['ID'].strip(); m = meta.get(pid, (pid, '?', '?'))
    v = x['value'].strip()
    try: v = float(v)
    except ValueError: v = None
    vals = [None, pid, m[1], m[2], 'ECL' if pid in [p[0] for p in ECL] else 'ECL +10 %', x['item'], x['component'], (int(float(x['year'])) if x['year'].strip().replace('.','',1).isdigit() else x['year'].strip()), v,
            x['unit'], x['variable_as_published'], x['file'], x['locator'], x['derivation'], x['note']]
    for j, val in enumerate(vals, 1):
        c = wd.cell(r, j, val); c.font = N
    wd.cell(r, 1, f'=B{r}&"|"&F{r}&"|"&G{r}&"|"&H{r}').font = N
    wd.cell(r, 9).font = BL if not x['derivation'].strip() else N; wd.cell(r, 9).number_format = '#,##0.0'
    r += 1
last = r - 1
for j, w in enumerate([22, 7, 30, 30, 10, 8, 10, 6, 10, 11, 45, 40, 30, 35, 70], 1): wd.column_dimensions[CL(j)].width = w
wd.freeze_panes = 'B2'; wd.auto_filter.ref = f'A1:O{last}'

# By pathway
wp = wb.create_sheet('By pathway')
wp.cell(1, 1, 'Value per pathway (formula: reads sheet Data by ID|item|component|year; blank = not reported)').font = B
hdr = ['Item', 'Unit', 'Year']
for j, h in enumerate(hdr, 1): c = wp.cell(3, j, h); c.font = H; c.fill = HF
for k, (pid, src, sc) in enumerate(PW):
    j = 4 + k; ecl = k < len(ECL)
    wp.cell(2, j, 'ECL' if ecl else 'ECL +10 % only').font = B
    c = wp.cell(3, j, pid); c.font = H; c.fill = HF; c.alignment = Alignment(horizontal='center')
    c = wp.cell(4, j, f'{src}\n{sc}'); c.font = Font(name=F, size=8); c.alignment = Alignment(wrap_text=True, vertical='top'); c.fill = EF if ecl else PF
wp.row_dimensions[4].height = 62
pos = {}; r = 5
for it, comp, lab, unit in ITEMS:
    for y in (2040, 2050):
        wp.cell(r, 1, lab if y == 2040 else '').font = B if not lab.startswith(' ') else N
        wp.cell(r, 2, unit).font = N; wp.cell(r, 3, y).font = N
        for k, (pid, _, _) in enumerate(PW):
            j = 4 + k; key = f'"{pid}|{it}|{comp}|{y}"'
            c = wp.cell(r, j, f'=IF(COUNTIFS(Data!$A$2:$A${last},{key},Data!$I$2:$I${last},"<>")=0,"",SUMIFS(Data!$I$2:$I${last},Data!$A$2:$A${last},{key}))')
            c.font = GR; c.number_format = '#,##0'; c.fill = EF if k < len(ECL) else PF
        pos[(it, comp, y)] = r
        if y == 2050:
            for j in range(1, 4 + len(PW)): wp.cell(r, j).border = thin
        r += 1
wp.column_dimensions['A'].width = 42; wp.column_dimensions['B'].width = 11; wp.column_dimensions['C'].width = 6
for k in range(len(PW)): wp.column_dimensions[CL(4 + k)].width = 14
wp.freeze_panes = 'D5'

# Ranges
wr = wb.create_sheet('Ranges', 1)
wr.cell(1, 1, 'Ranges across pathways (formulas over sheet By pathway). n = pathways reporting the item. AI-compiled — pending Secretariat verification.').font = B
e0, e1 = CL(4), CL(3 + len(ECL)); a1 = CL(3 + len(PW))
grp = [('ECL-compatible set (6 pathways)', e0, e1, EF), ('ECL +10 % set (14 pathways)', e0, a1, PF)]
for gi, (gl, _, _, fill) in enumerate(grp):
    c0 = 4 + gi * 5; wr.merge_cells(start_row=2, start_column=c0, end_row=2, end_column=c0 + 3)
    c = wr.cell(2, c0, gl); c.font = B; c.fill = fill; c.alignment = Alignment(horizontal='center')
for j, h in enumerate(['Item', 'Unit', 'Year', 'Min', 'Median', 'Max', 'n', '', 'Min', 'Median', 'Max', 'n'], 1):
    if h: c = wr.cell(3, j, h); c.font = H; c.fill = HF
r = 4
for it, comp, lab, unit in ITEMS:
    for y in (2040, 2050):
        pr = pos[(it, comp, y)]
        wr.cell(r, 1, lab if y == 2040 else '').font = B if not lab.startswith(' ') else N
        wr.cell(r, 2, unit).font = N; wr.cell(r, 3, y).font = N
        for gi, (_, a, b, fill) in enumerate(grp):
            rng = f"'By pathway'!{a}{pr}:{b}{pr}"; c0 = 4 + gi * 5
            for j, fn in enumerate(['MIN', 'MEDIAN', 'MAX']):
                c = wr.cell(r, c0 + j, f'=IF(COUNT({rng})=0,"–",{fn}({rng}))'); c.font = N; c.number_format = '#,##0'; c.fill = fill; c.alignment = Alignment(horizontal='right')
            c = wr.cell(r, c0 + 3, f'=COUNT({rng})'); c.font = N; c.fill = fill
        if y == 2050:
            for j in range(1, 13): wr.cell(r, j).border = thin
        r += 1
wr.cell(r + 1, 1, '"–" = no pathway in the set reports the item. Medians over 1–2 pathways are shown for completeness only.').font = Font(name=F, italic=True, color='6A6A6A')
wr.column_dimensions['A'].width = 44; wr.column_dimensions['B'].width = 11; wr.column_dimensions['C'].width = 6
for j in list(range(4, 8)) + list(range(9, 13)): wr.column_dimensions[CL(j)].width = 10
wr.column_dimensions['H'].width = 3; wr.freeze_panes = 'D4'

# Definitions
wf = wb.create_sheet('Definitions')
defs = open(os.path.join(S, 'definitions.txt'), encoding='utf-8').read().strip().split('\n') if os.path.exists(os.path.join(S, 'definitions.txt')) else []
for i, line in enumerate(defs, 1):
    c = wf.cell(i, 1, line); c.font = B if line and not line.startswith(' ') and line.endswith(':') else N; c.alignment = Alignment(wrap_text=True, vertical='top')
wf.column_dimensions['A'].width = 150
wc = wb.create_sheet('Costs')
wc.cell(1, 1, 'Item 8. Industry CAPEX and OPEX: what the pathways publish (as published; not comparable across models, so no ranges)').font = B
wc.cell(2, 1, 'Only 2 of the 14 pathways publish industry investment (CETO 2024, EC IA S2) and only CETO 2024 publishes industry operating cost. Rows marked "not reported" record what was searched.').font = Font(name=F, italic=True, color='6A6A6A')
cc = ['ID', 'Pathway', 'Set', 'Component', 'Year / period', 'Value', 'Unit (as published)', 'Variable as published', 'File', 'Locator', 'Note']
for j, h in enumerate(cc, 1): c = wc.cell(4, j, h); c.font = H; c.fill = HF
order = {p[0]: i for i, p in enumerate(PW)}
COSTS.sort(key=lambda x: (order.get(x['ID'].strip(), 99), x['component'], x['year']))
for k, x in enumerate(COSTS):
    r = 5 + k; pid = x['ID'].strip(); m = meta.get(pid, (pid, '?', '?'))
    v = x['value'].strip()
    try: v = float(v)
    except ValueError: v = v or None
    vals = [pid, f'{m[1]} | {m[2]}', 'ECL' if pid in [p[0] for p in ECL] else 'ECL +10 %', x['component'], x['year'], v, x['unit'], x['variable_as_published'], x['file'], x['locator'], (x['derivation'] + ' ' if x['derivation'].strip() else '') + x['note']]
    for j, val in enumerate(vals, 1):
        c = wc.cell(r, j, val); c.font = BL if j == 6 and isinstance(val, float) else N; c.alignment = Alignment(wrap_text=j == 11, vertical='top')
        if j == 6: c.number_format = '#,##0.0'
for j, w in enumerate([7, 44, 10, 18, 12, 10, 22, 40, 36, 28, 90], 1): wc.column_dimensions[CL(j)].width = w
wc.freeze_panes = 'C5'; wc.auto_filter.ref = f'A4:K{4 + len(COSTS)}'

wt = wb.create_sheet('Costs per tonne')
wt.cell(1, 1, 'Item 8b. Cost per tonne of product by process: JRC CETO 2024 (pathway 2400, ECL set), EU27, EUR2015 per tonne of output').font = B
wt.cell(2, 1, 'Only CETO 2024 publishes costs per tonne. Source: ceto2024_EU27_ind_5years.xlsx (JRC open data), sheets ISI / NMM / CHI, block "Cost characteristics" (row numbers in column H). Values: blue = as published; black = formula. Energy-related costs only (equipment that uses energy, its O&M and fuel); not the full plant cost.').font = Font(name=F, italic=True, color='6A6A6A')
wt.cell(3, 1, 'CAPEX = annuity of the capital costs. OPEX = fixed + variable O&M + fuel. The published total equals CAPEX + OPEX (check row); the CO2 cost is published separately and added in the last row.').font = Font(name=F, italic=True, color='6A6A6A')
CT = list(csv.DictReader(open(os.path.join(S, 'ceto24_cost_per_tonne.csv'), encoding='utf-8')))
TY = [2005, 2020, 2030, 2040, 2050]
PROCS = ['Integrated steelworks', 'Electric arc', 'Cement', 'Glass production', 'Ceramics & other NMM', 'Basic chemicals', 'Other chemicals', 'Pharmaceutical products etc.']
LAB = {'capex_annuity': 'CAPEX: annuity of the capital costs', 'fixed_om': 'Fixed O&M', 'variable_om': 'Variable O&M', 'fuel': 'Fuel (energy purchases)', 'total': 'Published total (energy equipment capital and operating costs)', 'co2': 'CO2 cost (published separately)'}
r = 5
for proc in PROCS:
    c = wt.cell(r, 1, {'Integrated steelworks': 'Steel, blast furnace route (integrated steelworks)', 'Electric arc': 'Steel, electric arc furnace', 'Glass production': 'Glass'}.get(proc, proc)); c.font = B
    for j, h in enumerate(['Component'] + TY + ['', 'Sheet / row'], 1):
        if h != '': c = wt.cell(r + 1, j, h); c.font = H; c.fill = HF
    rows = {}; rr = r + 2
    for comp in ('capex_annuity', 'fixed_om', 'variable_om', 'fuel', 'total', 'co2'):
        wt.cell(rr, 1, LAB[comp]).font = N; rows[comp] = rr
        for j, y in enumerate(TY):
            v = [x for x in CT if x['process'] == proc and x['component'] == comp and int(x['year']) == y]
            if v and v[0]['value'] not in ('', 'None'):
                c = wt.cell(rr, 2 + j, round(float(v[0]['value']), 2)); c.font = BL; c.number_format = '#,##0.0'
        v = [x for x in CT if x['process'] == proc and x['component'] == comp]
        if v: wt.cell(rr, 8, f"{v[0]['sheet']} r{v[0]['row']}").font = N
        rr += 1
    for lab, fn in (('OPEX = fixed + variable O&M + fuel', lambda col: f"={col}{rows['fixed_om']}+{col}{rows['variable_om']}+{col}{rows['fuel']}"),
                   ('Check: CAPEX + OPEX − published total (should be 0)', lambda col: f"={col}{rows['capex_annuity']}+{col}{rr}-{col}{rows['total']}"),
                   ('Total incl. CO2 cost', lambda col: f"={col}{rows['total']}+{col}{rows['co2']}")):
        wt.cell(rr, 1, lab).font = B if 'incl' in lab else N
        for j in range(len(TY)):
            col = CL(2 + j); fx = fn(col) if 'Check' not in lab else f"={col}{rows['capex_annuity']}+{col}{rr - 1}-{col}{rows['total']}"
            c = wt.cell(rr, 2 + j, fx); c.font = B if 'incl' in lab else N; c.number_format = '#,##0.0' if 'Check' not in lab else '0.00'
        rr += 1
    r = rr + 1
wt.column_dimensions['A'].width = 58
for j in range(2, 8): wt.column_dimensions[CL(j)].width = 11
wt.column_dimensions['H'].width = 12

wn = wb.create_sheet('Extraction notes')
i = 1
for g in ('remind', 'jrc', 'ecagora'):
    for line in open(os.path.join(S, f'{g}_notes.md'), encoding='utf-8').read().split('\n'):
        c = wn.cell(i, 1, line.replace('**', '').replace('`', '')); c.font = B if line.startswith('#') else N; c.alignment = Alignment(wrap_text=True, vertical='top'); i += 1
    i += 1
wn.column_dimensions['A'].width = 150
wb.save(OUT); print('saved', OUT, 'data rows', last - 1)
