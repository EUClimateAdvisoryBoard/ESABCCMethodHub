"""Excel workout: EU27 manufacturing-industry emissions, output and GHG intensity, 2005-2024, with a plain
"emissions = output x intensity" split (no log-mean / LMDI), the steel and cement intensity series, the three
ECL pathways that report output, and a comparison with the literature.

AI-compiled - pending Secretariat verification.

Inputs: decomp_data/*.json and production_tonnes.json (same inputs as decomp_industry.py; sources in
decomp_data/SOURCES.md), scenario data decomp_data/scen_production_ecl.json, the ESABCC 2024 report data
workbook (Figure 26) and the literature review docs-internal/industry-decomposition-literature-review-2026-11-27.md.
Run: python3 -I build_workout.py <out.xlsx>
"""
import json, os, sys, importlib.util
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter as CL
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.comments import Comment
from openpyxl.chart import BarChart, Reference

H = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(H, '..', '..', '..'))
spec = importlib.util.spec_from_file_location('d', os.path.join(H, 'decomp_industry.py')); dm = importlib.util.module_from_spec(spec); spec.loader.exec_module(dm)
OUT = sys.argv[1]
Y = list(range(2005, 2025)); YC = {y: CL(3 + i) for i, y in enumerate(Y)}; LASTC = YC[2024]
F = 'Arial'
fN, fB, fH = Font(name=F), Font(name=F, bold=True), Font(name=F, bold=True, color='FFFFFF')
fIn, fLink = Font(name=F, color='0000FF'), Font(name=F, color='008000')
fNote = Font(name=F, italic=True, color='6A6A6A'); fT = Font(name=F, bold=True, size=13)
HF = PatternFill('solid', fgColor='004B7F'); YF = PatternFill('solid', fgColor='FFFF00'); KF = PatternFill('solid', fgColor='E6F0F7'); OF = PatternFill('solid', fgColor='FFF4E8')
thin = Border(bottom=Side(style='thin', color='BFBFBF'))
NUM, PCT, R3 = '#,##0.0;-#,##0.0;-', '0.0%;-0.0%;-', '0.000'

def hdr(ws, r, labels, c0=1):
    for j, h in enumerate(labels):
        c = ws.cell(r, c0 + j, h); c.font = fH; c.fill = HF; c.alignment = Alignment(wrap_text=True, vertical='center')

wb = Workbook()

# ------------------------------------------------------------------ README
ws = wb.active; ws.title = 'README'
lines = [
 ('EU industry: did emissions fall because we produced less, or because we produced cleaner?', fT),
 ('AI-compiled — pending Secretariat verification. Built 27 Nov 2026. Every number in this workbook is either an input (blue, with its source) or a formula you can trace.', Font(name=F, bold=True, color='C55A11')),
 ('', fN),
 ('The idea in one line', fB),
 ('Emissions = output × emissions per unit of output (GHG intensity). If output falls and intensity stays the same, emissions fall in proportion. Whatever is left over is the change in intensity ("producing cleaner").', fN),
 ('', fN),
 ('The method (basic arithmetic, no logarithms)', fB),
 ('For each of 15 sub-branches (steel, cement, lime, glass, ammonia, ...):', fN),
 ('   1. Emissions if intensity had stayed at the start-year level = start emissions × (end output ÷ start output).', fN),
 ('   2. Output effect ("producing less") = that number − start emissions.', fN),
 ('   3. Intensity effect ("producing cleaner") = end emissions − that number.', fN),
 ('   4. Output effect + intensity effect = actual change, exactly. Sub-branch results are added up for groups and for the whole sector.', fN),
 ('Order matters: step 1 values the output change at start-year intensity. Done the other way round (output change valued at end-year intensity: producing less = end emissions − end emissions ÷ output ratio) the answer differs. The headline is the plain average of the two orders, which needs no choice of order. The audited log-mean (LMDI) result is quoted for reference only; the average lands within about one percentage point of it.', fN),
 ('Working per sub-branch matters: a shift from cement to, say, food processing lowers sector intensity even if no plant changes. Splitting into 15 sub-branches keeps that out of "producing cleaner".', fN),
 ('', fN),
 ('Sheets', fB),
 ('Summary — the key numbers (all formulas).', fN),
 ('Inventory — EU27 emissions by inventory category, 2005–2024 (inputs, Mt CO2e).', fN),
 ('Output — physical output (tonnes) and Eurostat production indices, 2005–2024 (inputs).', fN),
 ('Sub-branches — the 15 sub-branches built from Inventory and Output by formula; scope check against the industry line in the deck.', fN),
 ('Workout — the step-by-step calculation per sub-branch. Change the yellow cells (start year, end year, output measure) and everything updates.', fN),
 ('Periods — the same calculation for fixed periods and sub-sets, used for the robustness checks and the literature comparison.', fN),
 ('Steel & cement — tonnes of CO2 per tonne of steel and of cement, ours next to the ESABCC 2024 report (Figure 26).', fN),
 ('Scenarios — the same arithmetic for steel and cement 2025–2040 in the three ECL pathways that report output.', fN),
 ('Literature — published figures next to our comparable number, with a verdict.', fN),
 ('', fN),
 ('Colour code', fB),
 ('Blue text = input from a source (see the source column). Black = formula. Green = link to another sheet. Yellow fill = cells you may change.', fN),
 ('', fN),
 ('Scope', fB),
 ('Manufacturing industry = inventory 1.A.2 (fuel combustion in manufacturing) minus mining (1.A.2.g.iii), construction (1.A.2.g.v) and off-road machinery (1.A.2.g.vii), plus industrial processes 2.A, 2.B, 2.C, 2.E, 2.H. It reproduces the industry line in the deck (887.7 Mt in 2005, 527.5 Mt in 2024) to within 0.05 Mt (sheet Sub-branches).', fN),
 ('Sources: Eurostat env_air_gge (EU inventory 2026 submission); EU CRT 2026 tables (EEA); worldsteel / Eurofer (crude steel); CEMBUREAU (cement); Eurostat sts_inpr_a (production indices). Full URLs in scripts/pathway-screening/deck/decomp_data/SOURCES.md.', fN),
 ('Rebuild: python3 -I build_workout.py <out.xlsx> in scripts/pathway-screening/deck/.', fNote),
]
for i, (t, f) in enumerate(lines, 1):
    c = ws.cell(i, 1, t); c.font = f; c.alignment = Alignment(wrap_text=True, vertical='top')
ws.column_dimensions['A'].width = 160

# ------------------------------------------------------------------ Inventory
wi = wb.create_sheet('Inventory')
wi.cell(1, 1, 'EU27 GHG emissions by inventory category, Mt CO2e (inputs)').font = fT
hdr(wi, 3, ['Code', 'Category'] + Y + ['Source'])
INV = [('CRF1A2', '1.A.2 Fuel combustion, manufacturing industries and construction'), ('CRF1A2A', '1.A.2.a Iron and steel'), ('CRF1A2B', '1.A.2.b Non-ferrous metals'),
       ('CRF1A2C', '1.A.2.c Chemicals'), ('CRF1A2D', '1.A.2.d Pulp, paper and print'), ('CRF1A2E', '1.A.2.e Food, beverages and tobacco'), ('CRF1A2F', '1.A.2.f Non-metallic minerals'),
       ('CRF1A2G', '1.A.2.g Other'), ('1.A.2.g.iii.', '1.A.2.g.iii Mining (excluded)'), ('1.A.2.g.v.', '1.A.2.g.v Construction (excluded)'), ('1.A.2.g.vii.', '1.A.2.g.vii Off-road machinery (excluded)'),
       ('CRF2A', '2.A Mineral industry'), ('CRF2A1', '2.A.1 Cement production'), ('CRF2A2', '2.A.2 Lime production'), ('CRF2A3', '2.A.3 Glass production'),
       ('CRF2B', '2.B Chemical industry'), ('CRF2B1', '2.B.1 Ammonia'), ('CRF2B2', '2.B.2 Nitric acid'), ('CRF2B3', '2.B.3 Adipic acid'), ('CRF2B8', '2.B.8 Petrochemicals and carbon black'),
       ('CRF2C', '2.C Metal industry'), ('CRF2C1', '2.C.1 Iron and steel'), ('CRF2C2', '2.C.2 Ferroalloys'), ('CRF2C3', '2.C.3 Aluminium'),
       ('CRF2E', '2.E Electronics industry'), ('CRF2H', '2.H Other (pulp and paper, food and drink)')]
IR = {}
for k, (code, lab) in enumerate(INV):
    r = 4 + k; IR[code] = r
    wi.cell(r, 1, code.replace('CRF', '')).font = fN; wi.cell(r, 2, lab).font = fN
    sub = code.startswith('1.A.2.g')
    for y in Y:
        v = dm.G[code][str(y)] if sub else float(dm.EM[code][str(y)])
        c = wi.cell(r, 3 + Y.index(y), round(v, 4)); c.font = fIn; c.number_format = NUM
    wi.cell(r, 23, 'EU CRT 2026, Table 1.A(a)s2, 1.A.2.g sub-categories (EEA eua_crt_2026.zip)' if sub else 'Eurostat env_air_gge, EU27_2020, MIO_T, GHG (EU inventory 2026)').font = fN
wi.column_dimensions['A'].width = 12; wi.column_dimensions['B'].width = 52; wi.column_dimensions['W'].width = 60
for y in Y: wi.column_dimensions[YC[y]].width = 8
wi.freeze_panes = 'C4'
I = lambda code, y: f"Inventory!{YC[y]}{IR[code]}"

# ------------------------------------------------------------------ Output
wo = wb.create_sheet('Output')
wo.cell(1, 1, 'Output measures (inputs): physical output and Eurostat production indices').font = fT
hdr(wo, 3, ['Key', 'Measure', 'Unit'] + Y + ['Source'], c0=1)
OUTS = [('crude_steel', 'Crude steel', 'Mt', lambda y: dm.tn('crude_steel')[y] / 1000 if dm.tn('crude_steel')[y] > 1000 else dm.tn('crude_steel')[y], 'worldsteel Steel Statistical Yearbooks 2005–2015 (EU28 minus UK); Eurofer European Steel in Figures 2026 (EU27) 2016–2024'),
        ('cement', 'Cement', 'Mt', lambda y: dm.tn('cement')[y] / 1000 if dm.tn('cement')[y] > 1000 else dm.tn('cement')[y], 'CEMBUREAU Key facts & figures, cement production EU27'),
        ('lime', 'Lime', 'kt', lambda y: dm.ad('lime')[y], 'EU CRT 2026 Table 2(I).A-H, 2.A.2 activity data (sum of reporting Member States)'),
        ('glass', 'Glass', 'kt', lambda y: dm.ad('glass')[y], 'EU CRT 2026 Table 2(I).A-H, 2.A.3 activity data'),
        ('ammonia', 'Ammonia', 'kt', lambda y: dm.ad('ammonia')[y], 'EU CRT 2026 Table 2(I).A-H, 2.B.1 activity data'),
        ('nitric', 'Nitric acid', 'kt', lambda y: dm.ad('nitric')[y], 'EU CRT 2026 Table 2(I).A-H, 2.B.2 activity data'),
        ('adipic', 'Adipic acid', 'kt', lambda y: dm.ad('adipic')[y], 'EU CRT 2026 Table 2(I).A-H, 2.B.3 activity data (partly confidential)'),
        ('ethylene', 'Ethylene', 'kt', lambda y: dm.ad('ethylene')[y], 'EU CRT 2026 Table 2(I).A-H, 2.B.8.b activity data'),
        ('aluminium', 'Primary aluminium', 'kt', lambda y: dm.ad('aluminium')[y], 'EU CRT 2026 Table 2(I).A-H, 2.C.3 activity data')]
for code, lab in [('C241', 'Index: basic iron and steel (C24.1)'), ('C23', 'Index: non-metallic minerals (C23)'), ('C201', 'Index: basic chemicals (C20.1)'), ('C20', 'Index: chemicals (C20)'),
                  ('C244', 'Index: non-ferrous metals (C24.4)'), ('C17', 'Index: paper (C17)'), ('C10-C12', 'Index: food, drink, tobacco (C10-C12)'), ('C', 'Index: manufacturing (C)')]:
    OUTS.append((code, lab, '2021=100', (lambda cc: (lambda y: dm.ix(cc)[y]))(code), f'Eurostat sts_inpr_a, {code}, I21, calendar adjusted (volume index)'))
OR = {}
for k, (key, lab, unit, fn, src) in enumerate(OUTS):
    r = 4 + k; OR[key] = r
    wo.cell(r, 1, key).font = fN; wo.cell(r, 2, lab).font = fN; wo.cell(r, 3, unit).font = fN
    for y in Y:
        c = wo.cell(r, 4 + Y.index(y), round(fn(y), 4)); c.font = fIn; c.number_format = '#,##0.0'
    wo.cell(r, 24, src).font = fN
wo.column_dimensions['A'].width = 12; wo.column_dimensions['B'].width = 36; wo.column_dimensions['X'].width = 70
OYC = {y: CL(4 + i) for i, y in enumerate(Y)}
wo.freeze_panes = 'D4'

# ------------------------------------------------------------------ Sub-branches
wsb = wb.create_sheet('Sub-branches')
wsb.cell(1, 1, 'The 15 sub-branches: emissions (Mt CO2e) and the two output measures, built by formula from sheets Inventory and Output').font = fT
SB = [('Iron and steel', 'Steel', ['CRF1A2A', 'CRF2C1', 'CRF2C2'], [], 'crude_steel', 'C241'),
      ('Cement', 'Cement, lime, glass', ['CRF2A1'], [], 'cement', 'C23'),
      ('Lime', 'Cement, lime, glass', ['CRF2A2'], [], 'lime', 'C23'),
      ('Glass', 'Cement, lime, glass', ['CRF2A3'], [], 'glass', 'C23'),
      ('Other minerals (incl. all mineral fuel use)', 'Cement, lime, glass', ['CRF1A2F', 'CRF2A'], ['CRF2A1', 'CRF2A2', 'CRF2A3'], 'C23', 'C23'),
      ('Ammonia', 'Chemicals', ['CRF2B1'], [], 'ammonia', 'C201'),
      ('Nitric acid', 'Chemicals', ['CRF2B2'], [], 'nitric', 'C201'),
      ('Adipic acid', 'Chemicals', ['CRF2B3'], [], 'adipic', 'C201'),
      ('Petrochemicals', 'Chemicals', ['CRF2B8'], [], 'ethylene', 'C201'),
      ('Chemicals, fuel use and other', 'Chemicals', ['CRF1A2C', 'CRF2B'], ['CRF2B1', 'CRF2B2', 'CRF2B3', 'CRF2B8'], 'C201', 'C20'),
      ('Primary aluminium', 'Other manufacturing', ['CRF2C3'], [], 'aluminium', 'C244'),
      ('Other non-ferrous', 'Other manufacturing', ['CRF1A2B', 'CRF2C'], ['CRF2C1', 'CRF2C2', 'CRF2C3'], 'C244', 'C244'),
      ('Pulp and paper', 'Other manufacturing', ['CRF1A2D'], [], 'C17', 'C17'),
      ('Food and drink', 'Other manufacturing', ['CRF1A2E'], [], 'C10-C12', 'C10-C12'),
      ('Other manufacturing (incl. unallocated 1.A.2)', 'Other manufacturing', ['CRF1A2G', 'CRF2E', 'CRF2H', 'CRF1A2'], ['1.A.2.g.iii.', '1.A.2.g.v.', '1.A.2.g.vii.', 'CRF1A2A', 'CRF1A2B', 'CRF1A2C', 'CRF1A2D', 'CRF1A2E', 'CRF1A2F', 'CRF1A2G'], 'C', 'C')]
NB = len(SB)
def block(r0, title, kind):
    wsb.cell(r0 - 1, 1, title).font = fB
    hdr(wsb, r0, ['Sub-branch', 'Group'] + Y + ['Built as'])
    for k, (lab, grp, plus, minus, pk, vk) in enumerate(SB):
        r = r0 + 1 + k; wsb.cell(r, 1, lab).font = fN; wsb.cell(r, 2, grp).font = fN
        for y in Y:
            if kind == 'E': f = '=' + '+'.join(I(c, y) for c in plus) + ''.join('-' + I(c, y) for c in minus)
            else: f = f"=Output!{OYC[y]}{OR[pk if kind == 'P' else vk]}"
            c = wsb.cell(r, 3 + Y.index(y), f); c.font = fLink; c.number_format = '#,##0.0'
        if kind == 'E': how = ' + '.join(c.replace('CRF', '') for c in plus) + ''.join(' − ' + c.replace('CRF', '') for c in minus)
        else: how = [o for o in OUTS if o[0] == (pk if kind == 'P' else vk)][0][1]
        wsb.cell(r, 23, how).font = fN
    return r0 + 1, r0 + NB
E0r, E1r = block(4, 'A. Emissions, Mt CO2e', 'E')
tr = E1r + 1
wsb.cell(tr, 1, 'Total manufacturing industry').font = fB
for y in Y:
    c = wsb.cell(tr, 3 + Y.index(y), f'=SUM({YC[y]}{E0r}:{YC[y]}{E1r})'); c.font = fB; c.number_format = NUM
EEA = json.load(open(os.path.join(ROOT, 'inventory_sectors_2005_2024.json')))
wsb.cell(tr + 1, 1, 'Industry line in the deck (EEA, inventory 2026)').font = fN
wsb.cell(tr + 2, 1, 'Difference (scope check)').font = fN
for y in Y:
    c = wsb.cell(tr + 1, 3 + Y.index(y), round(EEA[str(y)]['industry'], 2)); c.font = fIn; c.number_format = NUM
    c = wsb.cell(tr + 2, 3 + Y.index(y), f'={YC[y]}{tr}-{YC[y]}{tr + 1}'); c.font = fN; c.number_format = '0.00'
wsb.cell(tr + 1, 23, 'repo inventory_sectors_2005_2024.json (the series plotted on the industry slide)').font = fN
P0r, P1r = block(tr + 5, 'B. Output measure 1: physical output where available (tonnes), production index otherwise', 'P')
V0r, V1r = block(P1r + 3, 'C. Output measure 2: Eurostat production index for every sub-branch (value-based volume index)', 'V')
wsb.column_dimensions['A'].width = 40; wsb.column_dimensions['B'].width = 20; wsb.column_dimensions['W'].width = 70
for y in Y: wsb.column_dimensions[YC[y]].width = 8
wsb.freeze_panes = 'C5'
SBN = "'Sub-branches'"
for nm, ref in [('Years', f'{SBN}!$C$4:${LASTC}$4'), ('Branch', f'{SBN}!$A${E0r}:$A${E1r}'), ('Grp', f'{SBN}!$B${E0r}:$B${E1r}'),
                ('Em', f'{SBN}!$C${E0r}:${LASTC}${E1r}'), ('OutP', f'{SBN}!$C${P0r}:${LASTC}${P1r}'), ('OutV', f'{SBN}!$C${V0r}:${LASTC}${V1r}')]:
    wb.defined_names[nm] = DefinedName(nm, attr_text=ref)

# ------------------------------------------------------------------ Workout
ww = wb.create_sheet('Workout')
ww.cell(1, 1, 'Step-by-step: how much of the change came from producing less, and how much from producing cleaner?').font = fT
for r, (lab, val, note) in enumerate([('Start year', 2005, '2005–2024'), ('End year', 2024, '2005–2024, after start year'), ('Output measure', 'physical', '"physical" (tonnes where available) or "index" (production index everywhere)')], 3):
    ww.cell(r, 1, lab).font = fB; c = ww.cell(r, 2, val); c.font = fIn; c.fill = YF; ww.cell(r, 3, note).font = fNote
ww.cell(6, 1, 'Columns: (a) start emissions, (b) end emissions, (c) start output, (d) end output, (e) output ratio = d ÷ c, (f) emissions if intensity had not changed = a × e, (g) producing less = f − a, (h) producing cleaner = b − f, (i) check = g + h − (b − a), must be 0.').font = fNote
cols = ['Sub-branch', 'Group', '(a) Emissions start, Mt', '(b) Emissions end, Mt', '(c) Output start', '(d) Output end', '(e) Output ratio d÷c', '(f) Emissions at unchanged intensity a×e, Mt',
        '(g) Producing less f−a, Mt', '(h) Producing cleaner b−f, Mt', '(i) Check', 'Intensity start a÷c', 'Intensity end b÷d', 'Intensity change', 'Reverse order: producing less = b − b÷e, Mt', 'Output measure used']
hdr(ww, 8, cols); ww.row_dimensions[8].height = 60
m0, m1 = 'MATCH($B$3,Years,0)', 'MATCH($B$4,Years,0)'
for k, (lab, grp, *_rest) in enumerate(SB):
    r = 9 + k
    ww.cell(r, 1, f'={SBN}!A{E0r + k}').font = fLink; ww.cell(r, 2, f'={SBN}!B{E0r + k}').font = fLink
    fs = [f'=INDEX(Em,{k + 1},{m0})', f'=INDEX(Em,{k + 1},{m1})',
          f'=IF($B$5="index",INDEX(OutV,{k + 1},{m0}),INDEX(OutP,{k + 1},{m0}))', f'=IF($B$5="index",INDEX(OutV,{k + 1},{m1}),INDEX(OutP,{k + 1},{m1}))',
          f'=F{r}/E{r}', f'=C{r}*G{r}', f'=H{r}-C{r}', f'=D{r}-H{r}', f'=I{r}+J{r}-(D{r}-C{r})', f'=C{r}/E{r}', f'=D{r}/F{r}', f'=M{r}/L{r}-1', f'=D{r}-D{r}/G{r}',
          f'=IF($B$5="index",{SBN}!W{V0r + k},{SBN}!W{P0r + k})']
    for j, f in enumerate(fs):
        c = ww.cell(r, 3 + j, f); c.font = fN
        c.number_format = {4: '0.000', 8: '0.000', 9: R3, 10: R3, 11: PCT}.get(j, NUM if j not in (2, 3) else '#,##0.0')
tr = 9 + NB
ww.cell(tr, 1, 'Total manufacturing industry').font = fB
for col in 'CDHIJKO':
    c = ww.cell(tr, ' ABCDEFGHIJKLMNOP'.index(col), f'=SUM({col}9:{col}{tr - 1})'); c.font = fB; c.number_format = NUM
c = ww.cell(tr, 7, f'=H{tr}/C{tr}'); c.font = fB; c.number_format = '0.000'
c = ww.cell(tr, 14, f'=(D{tr}/H{tr})-1'); c.font = fB; c.number_format = PCT
ww.cell(tr + 1, 1, 'Emission-weighted output index (end vs start) = f ÷ a; sector intensity change = b ÷ f − 1.').font = fNote
for j in range(1, 17): ww.cell(tr, j).border = thin
g0 = tr + 3
ww.cell(g0, 1, 'By group').font = fB
hdr(ww, g0 + 1, ['Group', '', 'Emissions start, Mt', 'Emissions end, Mt', 'Change, Mt', 'Producing less, Mt', 'Producing cleaner, Mt', 'Share from producing less', 'Reverse order: share from producing less', 'Average of both orders (headline)'])
GROUPS = ['Steel', 'Cement, lime, glass', 'Chemicals', 'Other manufacturing']
for k, g in enumerate(GROUPS + ['Total']):
    r = g0 + 2 + k; ww.cell(r, 1, g).font = fB if g == 'Total' else fN
    rng = lambda col: f'{col}$9:{col}${tr - 1}'
    if g == 'Total': fs = [f'=C{tr}', f'=D{tr}', f'=D{r}-C{r}', f'=I{tr}', f'=J{tr}', f'=F{r}/E{r}', f'=O{tr}/E{r}']
    elif g == 'Steel + cement, lime, glass': pass
    else: fs = [f'=SUMIF({rng("B")},$A{r},{rng(c)})' for c in 'CD'] + [f'=D{r}-C{r}'] + [f'=SUMIF({rng("B")},$A{r},{rng(c)})' for c in 'IJ'] + [f'=F{r}/E{r}', f'=SUMIF({rng("B")},$A{r},{rng("O")})/E{r}']
    for j, f in enumerate(fs):
        c = ww.cell(r, 3 + j, f); c.font = fB if g == 'Total' else fN; c.number_format = PCT if j >= 5 else NUM
    c = ww.cell(r, 10, f'=(H{r}+I{r})/2'); c.font = fB; c.number_format = PCT
r = g0 + 2 + len(GROUPS) + 1
ww.cell(r, 1, 'Steel + cement, lime, glass').font = fN
a, b = g0 + 2, g0 + 3
for j, col in enumerate('CDEFG'):
    c = ww.cell(r, 3 + j, f'={col}{a}+{col}{b}'); c.font = fN; c.number_format = NUM
c = ww.cell(r, 8, f'=F{r}/E{r}'); c.font = fN; c.number_format = PCT
c = ww.cell(r, 9, f'=(I{a}*E{a}+I{b}*E{b})/E{r}'); c.font = fN; c.number_format = PCT
c = ww.cell(r, 10, f'=(H{r}+I{r})/2'); c.font = fB; c.number_format = PCT
GR_TOT = g0 + 2 + len(GROUPS); GR_SC = r
ww.cell(r + 2, 1, 'Reading: "producing less" is what emissions would have done with output alone; "producing cleaner" is the rest. The reverse-order column shows the same split computed the other way round; the true split lies between the two.').font = fNote
ch = BarChart(); ch.type = 'bar'; ch.grouping = 'stacked'; ch.overlap = 100; ch.title = 'Change by group, Mt CO2e (selected period)'
ch.add_data(Reference(ww, min_col=6, max_col=7, min_row=g0 + 1, max_row=g0 + 1 + len(GROUPS)), titles_from_data=True)
ch.set_categories(Reference(ww, min_col=1, min_row=g0 + 2, max_row=g0 + 1 + len(GROUPS)))
ch.roundedCorners = False; ch.legend.overlay = False; ch.title.overlay = False; ch.x_axis.delete = False; ch.y_axis.delete = False; ch.height = 8; ch.width = 16
ww.add_chart(ch, f'L{g0}')
ww.column_dimensions['A'].width = 40; ww.column_dimensions['B'].width = 20
for j in range(3, 17): ww.column_dimensions[CL(j)].width = 14
ww.column_dimensions['P'].width = 34; ww.freeze_panes = 'C9'

# ------------------------------------------------------------------ Periods
wp = wb.create_sheet('Periods')
wp.cell(1, 1, 'The same arithmetic for fixed periods and sub-sets (one row = one calculation; all formulas over sheet Sub-branches)').font = fT
wp.cell(2, 1, 'Set = "All industry", a group (Steel; Cement, lime, glass; Chemicals; Other manufacturing) or a sub-branch name. Producing less = Σ start emissions × output ratio − start emissions; producing cleaner = the rest.').font = fNote
cols = ['Label', 'Set', 'Start', 'End', 'Output measure', 'Emissions start, Mt', 'Emissions end, Mt', 'Change, Mt', 'Change, %', 'Emissions at unchanged intensity, Mt', 'Producing less, Mt',
        'Producing cleaner, Mt', 'Share from producing less', 'Reverse order: share from producing less', 'Output change (emission-weighted)', 'Intensity change', 'Share from producing less, average of both orders (headline)']
hdr(wp, 4, cols); wp.row_dimensions[4].height = 48
PER = [('Headline', 'All industry', 2005, 2024, 'physical'), ('Production index only', 'All industry', 2005, 2024, 'index'),
       ('End year 2023', 'All industry', 2005, 2023, 'physical'), ('Start 2007 (pre-crisis peak)', 'All industry', 2007, 2024, 'physical'), ('Start 2010', 'All industry', 2010, 2024, 'physical'),
       ('Steel', 'Steel', 2005, 2024, 'physical'), ('Cement, lime, glass', 'Cement, lime, glass', 2005, 2024, 'physical'), ('Chemicals', 'Chemicals', 2005, 2024, 'physical'), ('Other manufacturing', 'Other manufacturing', 2005, 2024, 'physical'),
       ('Before 2010: steel', 'Steel', 2005, 2010, 'physical'), ('Before 2010: cement, lime, glass', 'Cement, lime, glass', 2005, 2010, 'physical'),
       ('After 2010: steel', 'Steel', 2010, 2024, 'physical'), ('After 2010: cement, lime, glass', 'Cement, lime, glass', 2010, 2024, 'physical'),
       ('Lit: UBA steel 2005–2022', 'Steel', 2005, 2022, 'physical'), ('Lit: UBA cement 2005–2018', 'Cement', 2005, 2018, 'physical'), ('Lit: UBA cement 2005–2018 (all minerals)', 'Cement, lime, glass', 2005, 2018, 'physical'),
       ('Lit: Branger & Quirion cement 2007–2010', 'Cement', 2007, 2010, 'physical'),
       ('Lit: EEA steel 2010–2023', 'Steel', 2010, 2023, 'physical'), ('Lit: EEA cement 2010–2023', 'Cement', 2010, 2023, 'physical'), ('Lit: EEA primary aluminium 2010–2023', 'Primary aluminium', 2010, 2023, 'physical'),
       ('Lit: EEA chemicals 2010–2023', 'Chemicals', 2010, 2023, 'physical'),
       ('Lit: ESABCC steel 2008–2021', 'Steel', 2008, 2021, 'physical'), ('Lit: ESABCC cement 2005–2021', 'Cement', 2005, 2021, 'physical'), ('Lit: ESABCC industry 2005–2022', 'All industry', 2005, 2022, 'physical'),
       ('Lit: ODYSSEE 2010–2023, index', 'All industry', 2010, 2023, 'index'), ('Lit: ODYSSEE 2010–2023, physical', 'All industry', 2010, 2023, 'physical'),
       ('Lit: Eurostat 2013–2024, index', 'All industry', 2013, 2024, 'index'), ('Lit: Eurostat 2013–2024, physical', 'All industry', 2013, 2024, 'physical'),
       ('Lit: Commission CAPR 2014–2024, index', 'All industry', 2014, 2024, 'index'), ('Lit: Commission CAPR 2014–2024, physical', 'All industry', 2014, 2024, 'physical')]
PR = {}
for k, (lab, st, y0, y1, ms) in enumerate(PER):
    r = 5 + k; PR[lab] = r
    for j, v in enumerate([lab, st, y0, y1, ms]):
        c = wp.cell(r, 1 + j, v); c.font = fIn if j else fN
    mask = f'(((Branch=$B{r})+(Grp=$B{r})+($B{r}="All industry"))>0)'
    c0, c1 = f'MATCH($C{r},Years,0)', f'MATCH($D{r},Years,0)'
    E0, E1 = f'INDEX(Em,0,{c0})', f'INDEX(Em,0,{c1})'
    cf = lambda O: f'SUMPRODUCT({mask}*{E0}*INDEX({O},0,{c1})/INDEX({O},0,{c0}))'
    rv = lambda O: f'SUMPRODUCT({mask}*{E1}*INDEX({O},0,{c0})/INDEX({O},0,{c1}))'
    fs = [f'=SUMPRODUCT({mask}*{E0})', f'=SUMPRODUCT({mask}*{E1})', f'=G{r}-F{r}', f'=H{r}/F{r}',
          f'=IF($E{r}="index",{cf("OutV")},{cf("OutP")})', f'=J{r}-F{r}', f'=G{r}-J{r}', f'=K{r}/H{r}',
          f'=(G{r}-IF($E{r}="index",{rv("OutV")},{rv("OutP")}))/H{r}', f'=J{r}/F{r}-1', f'=G{r}/J{r}-1', f'=(M{r}+N{r})/2']
    for j, f in enumerate(fs):
        c = wp.cell(r, 6 + j, f); c.font = fB if j == 11 else fN; c.number_format = PCT if j in (3, 7, 8, 9, 10, 11) else NUM
    if k in (4, 8, 12):
        for j in range(1, 18): wp.cell(r, j).border = thin
wp.column_dimensions['A'].width = 42; wp.column_dimensions['B'].width = 20
for j in range(3, 18): wp.column_dimensions[CL(j)].width = 13
wp.freeze_panes = 'F5'

# ------------------------------------------------------------------ Steel & cement
wsc = wb.create_sheet('Steel & cement')
wsc.cell(1, 1, 'GHG intensity: tonnes of CO2 per tonne of crude steel and per tonne of cement').font = fT
wsc.cell(2, 1, 'Ours = sheet Sub-branches emissions ÷ output. ESABCC = report "Towards EU climate neutrality" (Jan 2024), Figure 26 data (repo: ESABCC_report_Towards EU climate neutrality_underlying data.xlsx).').font = fNote
cols = ['Year', 'Steel emissions, ours (1.A.2.a + 2.C.1 + 2.C.2), Mt', 'Crude steel, Mt', 'Steel t CO2e/t, ours', 'Steel t CO2/t, ESABCC Fig 26', 'Steel index, ours (2008=100)', 'Steel index, ESABCC (2008=100)',
        'Cement process CO2, ours (2.A.1), Mt', 'Cement, Mt', 'Cement process t CO2/t, ours', 'Cement t CO2/t, ESABCC Fig 26 (ETS cement emissions incl. fuel ÷ cement)', 'Cement index, ours (2005=100)', 'Cement index, ESABCC (2005=100)']
hdr(wsc, 4, cols); wsc.row_dimensions[4].height = 75
EF = load_workbook(os.path.join(ROOT, 'ESABCC_report_Towards EU climate neutrality_underlying data.xlsx'), read_only=True, data_only=True)['Figure 26']
rows = [r for r in EF.iter_rows(values_only=True)]
hd = [r for r in rows if r and r[0] == 'Label'][0]; yrs = [c for c in hd if isinstance(c, int)]
def esab(lbl):
    r = [x for x in rows if x and x[0] == lbl][0]; vals = [v for v in r[2:] if isinstance(v, (int, float))]
    return vals
st_vals, ce_vals = esab('Steel'), esab('Cement')
st = dict(zip(range(2008, 2008 + len(st_vals)), st_vals)); ce = dict(zip(range(2005, 2005 + len(ce_vals)), ce_vals))
ks = [s[0] for s in SB]; ist, ice = ks.index('Iron and steel'), ks.index('Cement')
for k, y in enumerate(Y):
    r = 5 + k; wsc.cell(r, 1, y).font = fN
    fs = [(f"={SBN}!{YC[y]}{E0r + ist}", fLink, NUM), (f"={SBN}!{YC[y]}{P0r + ist}", fLink, NUM), (f'=B{r}/C{r}', fN, R3), (round(st[y], 4) if y in st else None, fIn, R3),
          (f'=D{r}/$D${5 + Y.index(2008)}*100', fN, '0.0'), (f'=IF(E{r}="","",E{r}/$E${5 + Y.index(2008)}*100)', fN, '0.0'),
          (f"={SBN}!{YC[y]}{E0r + ice}", fLink, NUM), (f"={SBN}!{YC[y]}{P0r + ice}", fLink, NUM), (f'=H{r}/I{r}', fN, R3), (round(ce[y], 4) if y in ce else None, fIn, R3),
          (f'=J{r}/$J$5*100', fN, '0.0'), (f'=IF(K{r}="","",K{r}/$K$5*100)', fN, '0.0')]
    for j, (f, ft, nf) in enumerate(fs):
        if f is None: continue
        c = wsc.cell(r, 2 + j, f); c.font = ft; c.number_format = nf
rr = 5 + len(Y) + 1
notes = ['Steel: our series counts combustion in steelworks plus process CO2 from iron, steel and ferroalloys (inventory scope). ESABCC uses EEA GHG data-viewer steel emissions ÷ Eurofer crude steel. Levels should be close; trends are the test.',
         'Cement: ours is process CO2 only (calcination, 2.A.1), because cement-kiln fuel is not separated from other mineral fuel use in the inventory (1.A.2.f). ESABCC uses ETS cement-clinker emissions (process + fuel) ÷ CEMBUREAU cement. Compare the indices, not the levels.',
         'Process CO2 per tonne of cement moves with the clinker share of cement; fuel CO2 per tonne moves with kiln efficiency and fuel mix.']
for i, t in enumerate(notes): wsc.cell(rr + i, 1, t).font = fNote
wsc.column_dimensions['A'].width = 8
for j in range(2, 14): wsc.column_dimensions[CL(j)].width = 15

# ------------------------------------------------------------------ Scenarios
wsn = wb.create_sheet('Scenarios')
wsn.cell(1, 1, 'Steel and cement 2025 → 2040 in the ECL pathways that report output: same arithmetic (inputs as reported by each model)').font = fT
wsn.cell(2, 1, 'Only 3 of the 6 ECL pathways report physical output. REMIND steel CO2 = energy CO2 (coke counted as energy); CETO steel = energy + process. Cement = energy + process in both. Model values, not harmonised to the inventory.').font = fNote
SC = json.load(open(os.path.join(H, 'decomp_data', 'scen_production_ecl.json')))
cols = ['Pathway', 'Sector', 'Emissions 2025, Mt', 'Emissions 2040, Mt', 'Output 2025, Mt', 'Output 2040, Mt', 'Output ratio', 'Emissions at unchanged intensity, Mt', 'Producing less, Mt', 'Producing cleaner, Mt',
        'Share from producing less (start-year intensity)', 'Emissions variables (as published)', 'Output variable', 'Source', 'Reverse order: producing less = end − end ÷ ratio, Mt', 'Reverse order: share', 'Share, average of both orders (headline)']
hdr(wsn, 4, cols); wsn.row_dimensions[4].height = 45
r = 5; tot_rows = []
for pid in ('1266', '1275', '2400'):
    p = SC[pid]; V = {d['std']: (name, d) for name, d in p['variables'].items()}
    first = r
    for sec, evars, pvar in (('Steel', ['emi_steel_energy'] + (['emi_steel_process'] if pid == '2400' else []), 'prod_steel'), ('Cement', ['emi_cement_energy', 'emi_cement_process'], 'prod_cement')):
        wsn.cell(r, 1, f"{pid} {p['model']} {p['scenario']}").font = fN; wsn.cell(r, 2, sec).font = fN
        for j, y in enumerate(('2025', '2040')):
            c = wsn.cell(r, 3 + j, '=' + '+'.join(str(round(V[v][1]['values'][y], 4)) for v in evars)); c.font = fIn; c.number_format = NUM
            c = wsn.cell(r, 5 + j, round(V[pvar][1]['values'][y], 4)); c.font = fIn; c.number_format = NUM
        for j, f in enumerate([f'=F{r}/E{r}', f'=C{r}*G{r}', f'=H{r}-C{r}', f'=D{r}-H{r}', f'=I{r}/(D{r}-C{r})']):
            c = wsn.cell(r, 7 + j, f); c.font = fN; c.number_format = ['0.000', NUM, NUM, NUM, PCT][j]
        for j, f in enumerate([f'=D{r}-D{r}/G{r}', f'=O{r}/(D{r}-C{r})', f'=(K{r}+P{r})/2']):
            c = wsn.cell(r, 15 + j, f); c.font = fB if j == 2 else fN; c.number_format = NUM if j == 0 else PCT
        wsn.cell(r, 12, ' + '.join(V[v][0] for v in evars)).font = fN; wsn.cell(r, 13, V[pvar][0]).font = fN; wsn.cell(r, 14, p['source']).font = fN
        r += 1
    wsn.cell(r, 1, f"{pid} steel + cement").font = fB
    for col in 'CDHIJ':
        c = wsn.cell(r, ' ABCDEFGHIJ'.index(col), f'=SUM({col}{first}:{col}{r - 1})'); c.font = fB; c.number_format = NUM
    c = wsn.cell(r, 11, f'=I{r}/(D{r}-C{r})'); c.font = fB; c.number_format = PCT
    c = wsn.cell(r, 15, f'=SUM(O{first}:O{r - 1})'); c.font = fB; c.number_format = NUM
    c = wsn.cell(r, 16, f'=O{r}/(D{r}-C{r})'); c.font = fB; c.number_format = PCT
    c = wsn.cell(r, 17, f'=(K{r}+P{r})/2'); c.font = fB; c.number_format = PCT
    tot_rows.append(r); r += 2
SCN_ROWS = tot_rows
wsn.cell(r, 1, 'Compare: history 2005–2024, steel + cement, lime, glass (physical output)').font = fB
ps, pm = PR['Steel'], PR['Cement, lime, glass']
for col, src in ((11, 'M'), (16, 'N'), (17, 'Q')):
    c = wsn.cell(r, col, f'=(Periods!{src}{ps}*Periods!H{ps}+Periods!{src}{pm}*Periods!H{pm})/(Periods!H{ps}+Periods!H{pm})'); c.font = fLink; c.number_format = PCT
HIST_SC = r
wsn.cell(r + 1, 1, 'History reads sheet Periods (rows Steel and Cement, lime, glass, 2005–2024), weighted by each group\'s change. Note: history includes lime, glass and mineral fuel use; the scenarios cover steel and cement only.').font = fNote
wsn.cell(r + 2, 1, 'Why two orders: when emissions fall by 85 % or more, valuing the output change at 2025 intensity (high) or at 2040 intensity (near zero) gives very different answers. The average of the two is the order-free answer and is the one to quote.').font = fNote
wsn.column_dimensions['O'].width = 16; wsn.column_dimensions['P'].width = 12; wsn.column_dimensions['Q'].width = 14
wsn.column_dimensions['A'].width = 44; wsn.column_dimensions['B'].width = 10
for j in range(3, 12): wsn.column_dimensions[CL(j)].width = 13
wsn.column_dimensions['L'].width = 70; wsn.column_dimensions['M'].width = 30; wsn.column_dimensions['N'].width = 60

# ------------------------------------------------------------------ Literature
wl = wb.create_sheet('Literature')
wl.cell(1, 1, 'Published figures next to our comparable number (ours = formulas over sheets Periods and Steel & cement)').font = fT
wl.cell(2, 1, 'Sources opened and checked in the literature pass of 27 Nov 2026 (docs-internal/industry-decomposition-literature-review-2026-11-27.md). "Comparable?" says how far the two numbers measure the same thing.').font = fNote
cols = ['Source', 'Locator', 'Scope and method', 'Their figure', 'Our comparable figure', 'Ours (value)', 'Comparable?', 'Verdict']
hdr(wl, 4, cols); wl.row_dimensions[4].height = 30
P = lambda lab, col: f'=Periods!{col}{PR[lab]}'
SCr = lambda y: 5 + Y.index(y)
LIT = [
 ('UBA / Öko-Institut, Climate Change 52/2025, Annex B', 'abstract p. 5; §3.1.1 p. 34', 'EU27+UK steel, ETS, direct + indirect CO2, 2005–2022, LMDI with tonnes by route',
  'CO2 −71.4 Mt (−29 %); "primarily driven by a reduction of production on the BF-BOF route"; no efficiency effect', 'Steel emissions change 2005–2022, %', P('Lit: UBA steel 2005–2022', 'I'), 'Partly: scope (UK, indirect) differs', 'Consistent: similar fall; ours also output-led with small intensity gain'),
 ('', '', '', '', 'Steel: share from producing less 2005–2022', P('Lit: UBA steel 2005–2022', 'Q'), '', ''),
 ('', '', '', 'Direct intensity rose', 'Steel intensity change 2005–2022', P('Lit: UBA steel 2005–2022', 'P'), '', ''),
 ('UBA / Öko-Institut (Emele et al.), Climate Change 02/2022', '§3.1 p. 26', 'EU28 cement CO2 (process + fuel), 2005–2018, LMDI',
  '150 → 120 Mt; −40.9 Mt; demand-side effects 55 % (incl. clinker share and trade)', 'Cement process CO2: share from producing less 2005–2018', P('Lit: UBA cement 2005–2018', 'Q'), 'Partly: their "demand side" is not a pure output term; ours is process CO2 only', 'Consistent: ours > 100 % because process CO2 per tonne rose (clinker share up), as UBA also finds'),
 ('', '', '', '', 'Cement, lime, glass (all minerals incl. fuel): share from producing less 2005–2018', P('Lit: UBA cement 2005–2018 (all minerals)', 'Q'), '', ''),
 ('Branger & Quirion 2015, Energy Economics 47 (working paper FAERE PP 2014-03)', 'WP §4 p. 22', 'EU27 cement CO2, LMDI', 'Activity effect −68.6 Mt over 2007–2010 (cement incl. fuel)', 'Cement process CO2: producing less 2007–2010, Mt (start-year order)', P('Lit: Branger & Quirion cement 2007–2010', 'K'), 'Partly: ours excludes kiln fuel (about 1/3 of cement CO2)', 'Consistent direction; ours smaller as expected'),
 ('EEA Report 14/2026, Europe\'s industrial transformation', 'p. 34', 'EU CO2 per tonne, 2010–2023', 'Steel and cement: "only a marginal decline"', 'Steel intensity change 2010–2023', P('Lit: EEA steel 2010–2023', 'P'), 'Yes (direction)', 'Consistent: steel and cement intensity fell only a few %'),
 ('', '', '', '', 'Cement process intensity change 2010–2023', P('Lit: EEA cement 2010–2023', 'P'), '', ''),
 ('', '', '', 'Aluminium −35 %', 'Primary aluminium intensity change 2010–2023', P('Lit: EEA primary aluminium 2010–2023', 'P'), 'Partly (EEA measure not stated)', 'Differs: our primary-aluminium intensity barely moved; not explained (EEA may include PFCs or electricity); left open'),
 ('', '', '', 'Chemicals −14 %', 'Chemicals intensity change 2010–2023 (incl. N2O)', P('Lit: EEA chemicals 2010–2023', 'P'), 'Partly (EEA measure not stated)', 'Close: same direction, ours somewhat smaller'),
 ('ESABCC 2024, Towards EU climate neutrality, Fig 26', 'Fig 26 data; p. 92', 'Steel t CO2/t (EEA emissions ÷ Eurofer)', '1.010 (2008) → 0.962 (2021): −4.7 %', 'Steel intensity change 2008–2021', P('Lit: ESABCC steel 2008–2021', 'P'), 'Yes', 'Consistent: within about 2 points'),
 ('', '', 'Cement t CO2/t (ETS cement emissions ÷ CEMBUREAU)', '0.599 (2005) → 0.604 (2021): +0.8 %', 'Cement process intensity change 2005–2021', P('Lit: ESABCC cement 2005–2021', 'P'), 'Partly (process only)', 'Consistent: both essentially flat'),
 ('ESABCC 2024, p. 81', 'p. 81, key messages', 'Industry GHG (wider scope: 981 Mt in 2005)', '−30 % 2005–2022; cuts in steel, cement, chemicals "mainly driven by lowered production"', 'Manufacturing emissions change 2005–2022, %', P('Lit: ESABCC industry 2005–2022', 'I'), 'Partly (scope)', 'Consistent: a few points apart, explained by scope'),
 ('ODYSSEE-MURE policy brief, Jan 2026', 'p. 4, Fig 11', 'EU industry energy CO2 (incl. mining, construction), 2010–2023, value-based activity', 'Activity effect +49 Mt (emissions rose with output); total −105 Mt', 'All industry, production index: producing less 2010–2023, Mt', P('Lit: ODYSSEE 2010–2023, index', 'K'), 'Partly: scope and gases differ', 'Differs in sign even with an index: ODYSSEE starts from value added, excludes process CO2 and includes mining and construction. Physical output makes the gap larger.'),
 ('', '', '', '', 'All industry, physical output: producing less 2010–2023, Mt', P('Lit: ODYSSEE 2010–2023, physical', 'K'), '', ''),
 ('Eurostat, Statistics Explained, GHG emission accounts', 'Fig 4–5 text', 'Manufacturing GHG per unit of gross value added (incl. refineries)', '−33 % 2013–2024', 'Sector intensity change 2013–2024, production index', P('Lit: Eurostat 2013–2024, index', 'P'), 'No: value added is not output volume; refineries included', 'Differs as expected: intensity per euro of value added falls much faster than per unit of output'),
 ('', '', '', '', 'Sector intensity change 2013–2024, physical output', P('Lit: Eurostat 2013–2024, physical', 'P'), '', ''),
 ('European Commission, Climate Action Progress Report 2026', 'decomposition section', 'Industry, 2014–2024, value-based', 'Mainly efficiency; lower activity mattered more in metals (no effect sizes)', 'Share from producing less 2014–2024, production index', P('Lit: Commission CAPR 2014–2024, index', 'Q'), 'Partly', 'Consistent with an index-based method: about one third from output; physical output gives nearly half'),
 ('', '', '', '', 'Share from producing less 2014–2024, physical output', P('Lit: Commission CAPR 2014–2024, physical', 'Q'), '', ''),
]
for k, row in enumerate(LIT):
    r = 5 + k
    for j, v in enumerate(row):
        c = wl.cell(r, 1 + j, v); c.font = fLink if j == 5 else fN; c.alignment = Alignment(wrap_text=True, vertical='top')
        if j == 5: c.number_format = PCT if any(s in row[4] for s in ('%', 'share', 'intensity change')) else NUM
    if row[0]:
        for j in range(1, 9): wl.cell(r - 1, j).border = thin if k else Border()
for j, w in enumerate([34, 16, 34, 40, 44, 12, 30, 30], 1): wl.column_dimensions[CL(j)].width = w

# ------------------------------------------------------------------ Summary
su = wb.create_sheet('Summary', 1)
su.cell(1, 1, 'Summary: producing less vs producing cleaner, EU27 manufacturing industry (all cells are formulas)').font = fT
su.cell(2, 1, 'AI-compiled — pending Secretariat verification.').font = Font(name=F, bold=True, color='C55A11')
hdr(su, 4, ['', 'Mt CO2e', 'Mt a year', 'Share', 'Where it comes from'])
hl = PR['Headline']
S = [('Emissions 2005', f'=Periods!F{hl}', None, None, 'Periods, Headline'), ('Emissions 2024', f'=Periods!G{hl}', None, None, ''),
     ('Change 2005–2024', f'=Periods!H{hl}', f'=B7/19', None, ''),
     ('   of which producing less (output fell)', f'=B7*D8', f'=B8/19', f'=Periods!Q{hl}', 'average of both orders'),
     ('   of which producing cleaner (intensity fell)', f'=B7-B8', f'=B9/19', f'=1-D8', ''),
     ('   share from producing less: start-year order / end-year order', None, None, f'=Periods!M{hl}', 'the two one-sided answers bracket the headline'),
     ('', None, None, f'=Periods!N{hl}', ''),
     ('   share from producing less, production index only', None, None, f'=Periods!Q{PR["Production index only"]}', 'value-based index for every sub-branch'),
     ('   share from producing less, start 2007 / start 2010', None, None, f'=Periods!Q{PR["Start 2007 (pre-crisis peak)"]}', ''),
     ('', None, None, f'=Periods!Q{PR["Start 2010"]}', ''),
     ('Steel + cement, lime, glass 2005–2024: share from producing less', None, None, f'=Scenarios!Q{HIST_SC}', 'Periods, groups'),
     ('ECL pathways 2025–2040, steel + cement: share from producing less', None, None, None, 'Scenarios (average of both orders)'),
     ('   1266 REMIND-EU CCS180', None, None, f'=Scenarios!Q{SCN_ROWS[0]}', ''), ('   1275 REMIND-EU CCS350', None, None, f'=Scenarios!Q{SCN_ROWS[1]}', ''), ('   2400 JRC CETO 2024', None, None, f'=Scenarios!Q{SCN_ROWS[2]}', ''),
     ('Reference: audited log-mean (LMDI) result, 2005–2024', 199.2 + 161.0, None, round(161.0 / 360.2, 3), 'decomp_results.json; method R; −161.0 output, −199.2 intensity (Mt, sign reversed here)')]
for k, (lab, b, c_, d, src) in enumerate(S):
    r = 5 + k; su.cell(r, 1, lab).font = fB if not lab.startswith(' ') and lab else fN
    for j, v in enumerate((b, c_, d)):
        if v is None: continue
        c = su.cell(r, 2 + j, v); c.font = fIn if isinstance(v, float) else (fN if str(v).startswith('=B') else fLink); c.number_format = PCT if j == 2 else NUM
    su.cell(r, 5, src).font = fNote
su.cell(5 + len(S) + 1, 1, 'Negative Mt = emissions fell. The LMDI reference row is an input (blue), shown as a positive cut for comparison.').font = fNote
su.column_dimensions['A'].width = 62; su.column_dimensions['B'].width = 12; su.column_dimensions['C'].width = 12; su.column_dimensions['D'].width = 10; su.column_dimensions['E'].width = 70

wb.save(OUT); print('saved', OUT)
