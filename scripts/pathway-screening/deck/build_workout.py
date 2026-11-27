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
 ('Key findings — the answer in plain words, each sentence tied to a live number in this workbook and to what the research found.', fN),
 ('Evidence — every finding of the four research sweeps (decomposition studies; intensity data; why output fell; scenario assumptions) with locator and status (verified / not verified), their number, our comparable number (formula) and a verdict.', fN),
 ('Trade & demand — the numbers behind "leakage or lower demand?": EU footprint (FIGARO), steel production vs consumption and imports, construction and chemicals indices, chemicals closures, ex-post leakage studies.', fN),
 ('Scenario assumptions — what the scenario literature assumes about EU industrial output, next to the output in the ECL pathways and history.', fN),
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
to_mt = lambda v: v / 1e6 if v > 1e7 else (v / 1e3 if v > 1e3 else v)   # crude steel is stored in kt, cement in t; both shown in Mt
OUTS = [('crude_steel', 'Crude steel', 'Mt', lambda y: to_mt(dm.tn('crude_steel')[y]), 'worldsteel Steel Statistical Yearbooks 2005–2015 (EU28 minus UK); Eurofer European Steel in Figures 2026 (EU27) 2016–2024'),
        ('cement', 'Cement', 'Mt', lambda y: to_mt(dm.tn('cement')[y]), 'CEMBUREAU Key facts & figures, cement production EU27'),
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
       ('Lit: Commission CAPR 2014–2024, index', 'All industry', 2014, 2024, 'index'), ('Lit: Commission CAPR 2014–2024, physical', 'All industry', 2014, 2024, 'physical'),
       ('Lit: EEA 2010–2024 all industry', 'All industry', 2010, 2024, 'physical'), ('Lit: EEA 2010–2024 steel', 'Steel', 2010, 2024, 'physical'),
       ('Lit: EEA 2010–2024 minerals', 'Cement, lime, glass', 2010, 2024, 'physical'), ('Lit: EEA 2010–2024 chemicals', 'Chemicals', 2010, 2024, 'physical')]
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

# ------------------------------------------------------------------ Steel & cement: reference points and chart
from openpyxl.chart import LineChart
rr0 = 5 + len(Y) + 5
wsc.cell(rr0, 1, 'Reference points from the research sweep (not time series; for orientation only)').font = fB
hdr(wsc, rr0 + 1, ['Product', 'Source', 'Locator', 'Year(s)', 'Value', 'Unit', 'Status', 'What it is'])
REFP = [('Steel', 'JRC factsheet JRC144070 (2026)', 'p. 2', '2022', 1.81, 't CO2e/t', 'verified', 'Blast furnace route (BF-BOF) average'),
        ('Steel', 'JRC factsheet JRC144070 (2026)', 'p. 2', '2022', 0.24, 't CO2e/t', 'verified', 'Electric arc route (EAF) average'),
        ('Steel', 'EU ETS benchmark, Impl. Reg. (EU) 2021/447', 'Annex', '2016–17', 1.331, 't CO2e/t hot metal', 'verified', 'Best 10 % of plants, hot metal'),
        ('Steel', 'EU ETS benchmark, Impl. Reg. (EU) 2026/1412', 'Annex', '2021–22', 1.360, 't CO2e/t hot metal', 'verified', 'Best 10 % of plants, hot metal (+2.2 %)'),
        ('Steel', 'worldsteel Sustainability Indicators 2025', 'pp. 6–7', '2007 → 2024', 1.92, 't CO2/t', 'verified', 'GLOBAL average (1.80 in 2007); not EU'),
        ('Cement', 'JRC factsheet JRC144123 (2026)', 'p. 1', 'current', 0.65, 't CO2/t cement', 'verified (derived 110 Mt ÷ 170 Mt)', 'EU average, all CO2'),
        ('Cement', 'EU ETS benchmark, Impl. Reg. (EU) 2021/447', 'Annex', '2016–17', 0.722, 't CO2e/t clinker', 'verified', 'Best 10 % of plants, grey clinker'),
        ('Cement', 'EU ETS benchmark, Impl. Reg. (EU) 2026/1412', 'Annex', '2021–22', 0.689, 't CO2e/t clinker', 'verified', 'Best 10 % of plants, grey clinker (−4.6 %)'),
        ('Cement', 'CEMBUREAU (2023), cited in ESABCC 2024', 'ESABCC 2024 p. 92', '2005 → 2020', 0.61, 't CO2/t cementitious', 'verified (secondary)', 'Gross CO2 per tonne cementitious; 0.65 in 2005')]
for k, row in enumerate(REFP):
    for j, v in enumerate(row):
        c = wsc.cell(rr0 + 2 + k, 1 + j, v); c.font = fIn if j == 4 else fN
        if j == 4: c.number_format = R3
lc = LineChart(); lc.title = 'Steel: t CO2 per tonne, index 2008 = 100'; lc.y_axis.title = 'Index'; lc.height = 8; lc.width = 16
lc.add_data(Reference(wsc, min_col=6, max_col=7, min_row=4, max_row=4 + len(Y)), titles_from_data=True)
lc.set_categories(Reference(wsc, min_col=1, min_row=5, max_row=4 + len(Y)))
lc.roundedCorners = False; lc.legend.overlay = False; lc.title.overlay = False; lc.x_axis.delete = False; lc.y_axis.delete = False; lc.legend.position = 'b'
wsc.add_chart(lc, 'O4')
lc2 = LineChart(); lc2.title = 'Cement: t CO2 per tonne, index 2005 = 100'; lc2.y_axis.title = 'Index'; lc2.height = 8; lc2.width = 16
lc2.add_data(Reference(wsc, min_col=12, max_col=13, min_row=4, max_row=4 + len(Y)), titles_from_data=True)
lc2.set_categories(Reference(wsc, min_col=1, min_row=5, max_row=4 + len(Y)))
lc2.roundedCorners = False; lc2.legend.overlay = False; lc2.title.overlay = False; lc2.x_axis.delete = False; lc2.y_axis.delete = False; lc2.legend.position = 'b'
wsc.add_chart(lc2, 'O22')

# ------------------------------------------------------------------ Trade & demand
wt = wb.create_sheet('Trade & demand')
wt.cell(1, 1, 'Leakage or lower demand? The numbers behind the question (inputs from the research sweep, with formulas)').font = fT
wt.cell(2, 1, 'Blue = published value (source and locator in the row). Black = formula. Research sweep 27 Nov 2026; see sheet Evidence, question 3.').font = fNote
r = 4
wt.cell(r, 1, 'A. Where the emissions behind EU consumption happen (Eurostat env_ac_ghgfp, FIGARO; Mt CO2e by emitting industry; extracted via the Eurostat API, updated 30 Oct 2026)').font = fB
hdr(wt, r + 1, ['Industry', 'Year', 'EU → EU', 'Imported (non-EU → EU)', 'Exported (EU → non-EU)', 'EU footprint = EU→EU + imported', 'Non-EU share of EU footprint', 'EU production-side = EU→EU + exported', 'Net imported = imported − exported'])
FP = [('C24 basic metals', 2010, 111.6, 108.9, 77.1), ('C24 basic metals', 2019, 94.9, 101.4, 74.3), ('C24 basic metals', 2022, 90.0, 112.8, 61.6), ('C24 basic metals', 2024, 80.1, 98.9, 61.8),
      ('C23 non-metallic minerals', 2010, 166.1, 72.9, 41.6), ('C23 non-metallic minerals', 2019, 141.2, 69.1, 45.1), ('C23 non-metallic minerals', 2024, 119.6, 69.4, 34.1),
      ('C20 chemicals', 2010, 106.4, 105.0, 71.9), ('C20 chemicals', 2019, 81.0, 94.0, 69.3), ('C20 chemicals', 2022, 72.4, 110.4, 58.5), ('C20 chemicals', 2024, 68.1, 101.5, 59.9)]
FPR = {}
for k, (ind, y, a, b, c_) in enumerate(FP):
    rr = r + 2 + k; FPR[(ind[:3], y)] = rr
    for j, v in enumerate([ind, y, a, b, c_]):
        c = wt.cell(rr, 1 + j, v); c.font = fIn if j >= 2 else fN; c.number_format = NUM if j >= 2 else 'General'
    for j, f in enumerate([f'=C{rr}+D{rr}', f'=D{rr}/F{rr}', f'=C{rr}+E{rr}', f'=D{rr}-E{rr}']):
        c = wt.cell(rr, 6 + j, f); c.font = fN; c.number_format = PCT if j == 1 else NUM
r = r + 2 + len(FP) + 1
wt.cell(r, 1, 'Change 2010 → 2024').font = fB
hdr(wt, r + 1, ['Industry', '', 'EU production-side, %', 'EU footprint, %', 'Imported, %', 'Non-EU share, points', 'Share of the production-side fall from lower exports'])
FPC = {}
for k, ind in enumerate(['C24', 'C23', 'C20']):
    rr = r + 2 + k; a, b = FPR[(ind, 2010)], FPR[(ind, 2024)]; FPC[ind] = rr
    wt.cell(rr, 1, [x[0] for x in FP if x[0].startswith(ind)][0]).font = fN
    for j, f in enumerate([f'=H{b}/H{a}-1', f'=F{b}/F{a}-1', f'=D{b}/D{a}-1', f'=(G{b}-G{a})*100', f'=(E{b}-E{a})/(H{b}-H{a})']):
        c = wt.cell(rr, 3 + j, f); c.font = fN; c.number_format = '0.0' if j == 3 else PCT
wt.cell(r + 5, 1, 'Reading: import SHARES rose because EU production fell faster than imports; imported emissions themselves fell. Consistent with some relative displacement, not with wholesale relocation. The footprint mixes volume with intensity abroad and starts in 2010.').font = fNote
r = r + 7
wt.cell(r, 1, 'B. Steel: production, consumption and imports (EUROFER, European Steel in Figures 2024)').font = fB
hdr(wt, r + 1, ['Item', 'Locator', '2014', '2019', '2023', 'Change 2019 → 2023, Mt', 'Change 2019 → 2023, %'])
ST = [('Crude steel production, Mt', 'p. 17', 157.1, 150.2, 126.2), ('Apparent steel consumption, Mt', 'p. 25', None, 144.8, 125.6), ('Finished-steel imports, Mt', 'p. 38', None, 26.3, 25.6),
      ('Net scrap exports, Mt', 'p. 64', 7.2, None, 15.0)]
STR = {}
for k, (lab, loc, a, b, c_) in enumerate(ST):
    rr = r + 2 + k; STR[lab] = rr
    wt.cell(rr, 1, lab).font = fN; wt.cell(rr, 2, loc).font = fN
    for j, v in enumerate((a, b, c_)):
        if v is not None: c = wt.cell(rr, 3 + j, v); c.font = fIn; c.number_format = NUM
    if b is not None:
        c = wt.cell(rr, 6, f'=E{rr}-D{rr}'); c.font = fN; c.number_format = NUM
        c = wt.cell(rr, 7, f'=E{rr}/D{rr}-1'); c.font = fN; c.number_format = PCT
rr = r + 2 + len(ST)
wt.cell(rr, 1, 'Electric-arc share of crude steel').font = fN; wt.cell(rr, 2, 'p. 17').font = fN
c = wt.cell(rr, 3, '=64.1/C' + str(STR['Crude steel production, Mt'])); c.font = fN; c.number_format = PCT
c = wt.cell(rr, 5, 0.45); c.font = fIn; c.number_format = PCT
wt.cell(rr, 8, '2014: 64.1 Mt EAF ÷ 157.1 Mt (EUROFER p. 17); 2023: 45.0 % as published').font = fNote
wt.cell(rr + 1, 1, 'Reading: after 2019 production fell by about as much as consumption while imports stayed flat: falling demand, not a surge of imports, explains most of it.').font = fNote
r = rr + 3
wt.cell(r, 1, 'C. Activity indices (Eurostat sts_copr_a, sts_inpr_a; EU27, 2021 = 100; extracted via the API, updated 19 Nov 2026)').font = fB
hdr(wt, r + 1, ['Index', '2007', '2013', '2019', '2024', '2007 → 2013', '2013 → 2024'])
IXT = [('Construction (F)', 113.7, 91.6, None, 102.9), ('Non-metallic minerals (C23)', 122.7, 86.0, None, 85.3), ('Basic metals (C24)', 120.8, 98.6, None, 88.8),
       ('Basic chemicals (C20.1)', 109.5, None, 95.4, 74.0), ('Manufacturing (C)', 96.3, 87.9, None, 99.5)]
for k, (lab, *vals) in enumerate(IXT):
    rr = r + 2 + k; wt.cell(rr, 1, lab).font = fN
    for j, v in enumerate(vals):
        if v is not None: c = wt.cell(rr, 2 + j, v); c.font = fIn; c.number_format = '0.0'
    if vals[1] is not None:
        c = wt.cell(rr, 6, f'=C{rr}/B{rr}-1'); c.font = fN; c.number_format = PCT
        c = wt.cell(rr, 7, f'=E{rr}/C{rr}-1'); c.font = fN; c.number_format = PCT
wt.cell(r + 2 + len(IXT), 1, 'Reading: minerals followed the 2008–13 construction bust (demand). Basic chemicals fell after 2021 while construction held up (energy cost). Basic metals kept falling while manufacturing recovered.').font = fNote
r = r + 4 + len(IXT)
wt.cell(r, 1, 'D. Chemicals closures and stated reasons (Roland Berger for Cefic, Closures and investments radar 2022–2025, pdf p. 4; industry-commissioned)').font = fB
hdr(wt, r + 1, ['Item', 'Value', 'Unit'])
for k, (lab, v, u) in enumerate([('Announced closures, Europe', 37, 'Mt capacity'), ('of which EU27', 32, 'Mt capacity'), ('Share of European capacity', 0.09, 'share'), ('Confirmed investments', 7, 'Mt capacity'),
                                  ('Stated reason: energy cost', 0.49, 'share of closures'), ('Stated reason: demand', 0.19, 'share of closures'), ('Stated reason: overcapacity', 0.09, 'share of closures'), ('Stated reason: regulation', 0.08, 'share of closures')]):
    rr = r + 2 + k; wt.cell(rr, 1, lab).font = fN; c = wt.cell(rr, 2, v); c.font = fIn; c.number_format = PCT if u.startswith('share') else '#,##0'; wt.cell(rr, 3, u).font = fN
r = r + 11
wt.cell(r, 1, 'E. Was it the carbon price? Ex-post studies (see sheet Evidence, question 3, for locators)').font = fB
hdr(wt, r + 1, ['Study', 'Period', 'Finding', 'Reading'])
for k, row in enumerate([('Naegele & Zaklan 2019, JEEM 93', '2004–2011', 'No evidence the ETS caused carbon leakage in manufacturing (low prices)', 'No leakage'),
                         ('Dechezleprêtre et al. 2022, JEEM 112', '2007–2014', 'No displacement of emissions by multinationals', 'No leakage'),
                         ('Branger, Quirion & Chevallier 2016, Energy J. 37(3)', 'Phases I–II', 'Demand drives cement and steel trade; carbon price not significant', 'No leakage; demand'),
                         ('Chen, Di Gregorio & Paavola 2026, Climate Policy (meta-analysis)', 'to 2025', 'Trade leakage 0.03 (CI −0.03 to 0.09), not significant; investment leakage 1.07 (CI 0.54–1.59), significant', 'No trade leakage; investment leakage'),
                         ('Hagendorn et al. 2024, EIB WP 2024/05', '2012–2022', 'Higher ETS prices cut emissions with marginal effects on production', 'No leakage'),
                         ('ECB Economic Bulletin 1/2023, Box 2', '2021–2022', 'Import-to-production ratio of energy-intensive sectors +11 % vs other sectors', 'Energy-cost leakage'),
                         ('IEA Electricity Market Report Update 2023 (read via mirror)', '2022', 'Output: primary aluminium −12 %, crude steel −10 %, paper −6 %, chemicals −5 %; some aluminium closures permanent', 'Energy-cost leakage'),
                         ('Draghi 2024, Part B ch. 4', '2019', 'CO2 cost about 2 % of EU steel production cost (free allocation)', 'Carbon price small so far')]):
    for j, v in enumerate(row): c = wt.cell(r + 2 + k, 1 + j, v); c.font = fN; c.alignment = Alignment(wrap_text=True, vertical='top')
wt.column_dimensions['A'].width = 44; wt.column_dimensions['B'].width = 12
for j in range(3, 10): wt.column_dimensions[CL(j)].width = 16
wt.column_dimensions['C'].width = 60 if False else 16

# ------------------------------------------------------------------ Scenario assumptions
wa = wb.create_sheet('Scenario assumptions')
wa.cell(1, 1, 'What do net-zero scenarios assume about EU industrial output, compared with history?').font = fT
wa.cell(2, 1, 'Top: output in the ECL pathways that report it (model data, as in sheet Scenarios) and in history (sheet Output). Bottom: assumptions published in the scenario literature (research sweep, sheet Evidence, question 4).').font = fNote
hdr(wa, 4, ['Series', 'Product', '2015, Mt', '2025, Mt', '2040, Mt', '2050, Mt', '2025 → 2040', '2015 → 2050', 'Source'])
r = 5
for pid in ('1266', '1275', '2400'):
    p = SC[pid]; V = {d['std']: (name, d) for name, d in p['variables'].items()}
    for prod, key in (('Steel', 'prod_steel'), ('Cement', 'prod_cement')):
        wa.cell(r, 1, f"{pid} {p['model']} {p['scenario']}").font = fN; wa.cell(r, 2, prod).font = fN
        for j, y in enumerate(('2015', '2025', '2040', '2050')):
            c = wa.cell(r, 3 + j, round(V[key][1]['values'][y], 3)); c.font = fIn; c.number_format = NUM
        for j, f in enumerate([f'=E{r}/D{r}-1', f'=F{r}/C{r}-1']):
            c = wa.cell(r, 7 + j, f); c.font = fN; c.number_format = PCT
        wa.cell(r, 9, V[key][1].get('locator', p['source'])).font = fN
        r += 1
for prod, key in (('Steel', 'crude_steel'), ('Cement', 'cement')):
    wa.cell(r, 1, 'History, EU27 (sheet Output)').font = fB; wa.cell(r, 2, prod).font = fB
    c = wa.cell(r, 3, f'=Output!{OYC[2015]}{OR[key]}'); c.font = fLink; c.number_format = NUM
    c = wa.cell(r, 4, f'=Output!{OYC[2024]}{OR[key]}'); c.font = fLink; c.number_format = NUM
    c = wa.cell(r, 7, f'=Output!{OYC[2024]}{OR[key]}/Output!{OYC[2005]}{OR[key]}-1'); c.font = fLink; c.number_format = PCT
    wa.cell(r, 9, 'columns: 2015 and 2024 (in the "2025" column); "2025 → 2040" column shows the HISTORICAL change 2005 → 2024').font = fNote
    r += 1
r += 1
wa.cell(r, 1, 'Published scenario assumptions').font = fB
hdr(wa, r + 1, ['Source', 'Locator', 'Scenario', 'Product', 'Assumption', 'Value', 'Unit / basis', 'Status', 'URL / DOI'])
SA = [('EC 2040 IA, SWD(2024) 63 Part 2', 'Annex 6 §2.4.2 p. 15', 'S1–S3 (identical industry assumptions, Part 1 §5.3.1 p. 31)', 'Energy-intensive industry', 'Gross value added vs 2016–2020 average, 2040', 0.25, 'change', 'verified', 'data.consilium.europa.eu/doc/document/ST-6291-2024-ADD-2/en/pdf'),
      ('EC 2040 IA, SWD(2024) 63 Part 2', 'Annex 6 §2.4.2 p. 15', 'S1–S3', 'Energy-intensive industry', 'Gross value added vs 2016–2020 average, 2050', 0.37, 'change', 'verified', ''),
      ('EC 2040 IA, SWD(2024) 63 Part 2', 'Annex 6 §2.4.2 p. 15', 'S1–S3', 'All EII except iron and steel', '"an increase in the volume of production (with the exception of iron and steel)"', None, 'qualitative', 'verified', ''),
      ('EC 2040 IA, SWD(2024) 63 Part 2', 'Annex 6 Table 3 pp. 38–39', 'LIFE variant', 'Steel', 'Activity vs S1–S3, 2050 (phased in linearly 2030–2050, so about half by 2040)', -0.15, 'change vs reference', 'verified', ''),
      ('EC 2040 IA, SWD(2024) 63 Part 2', 'Annex 6 Table 3 pp. 38–39', 'LIFE variant', 'Cement & clinker', 'Activity vs S1–S3, 2050 (phased in 2030–2050)', -0.25, 'change vs reference', 'verified', ''),
      ('EC 2040 IA, SWD(2024) 63 Part 2', 'Annex 6 Table 3 pp. 38–39', 'LIFE variant', 'Aluminium / paper / petrochemicals', 'Activity vs S1–S3, 2050', None, '−20 % / −20 % / −15 %', 'verified', ''),
      ('EC, A Clean Planet for All analysis (2018)', 'Table 27 p. 322', 'CIRC', 'Iron & steel', 'Primary production vs baseline, 2050', -0.06, 'change vs baseline', 'verified', 'climate.ec.europa.eu/system/files/2018-11/com_2018_733_analysis_in_support_en.pdf'),
      ('EC, A Clean Planet for All analysis (2018)', 'Table 27 p. 322', 'CIRC', 'Non-metallic minerals', 'Primary production vs baseline, 2050', -0.08, 'change vs baseline', 'verified', ''),
      ('JRC CETO 2024 (EUR 40137)', '§2 pp. 14–15; §3.3.1 pp. 34–35', 'CETO 2024 (activity from IA S2)', 'Steel', '"stabilising to around 145 Mt" 2021–2050', 145, 'Mt', 'verified', 'publications.jrc.ec.europa.eu/repository/bitstream/JRC139836/JRC139836_01.pdf'),
      ('JRC CETO 2024 (EUR 40137)', '§3.3.1.1 p. 34', 'CETO 2024', 'Cement', 'Physical output growth 2021–2050 (13–16 %; low end shown)', 0.13, 'change', 'verified', ''),
      ('Pehl, Schreyer & Luderer 2024, GMD 17', 'PDF p. 5, p. 15', 'REMIND 3.1', 'Industry', 'Industrial activity endogenous; falls with mitigation stringency (price response)', None, 'qualitative', 'verified', 'doi.org/10.5194/gmd-17-2015-2024'),
      ('Material Economics 2019', 'PDF p. 72, p. 78', 'Baseline / circular', 'Steel', 'Baseline about 190 Mt in the 2040s; high circularity 139 Mt', 139, 'Mt (circular)', 'verified', 'cisl.cam.ac.uk/.../material-economics-industrial-transformation-2050.pdf'),
      ('Material Economics 2019', 'PDF p. 26', 'Circular', 'Steel, plastics, ammonia, cement', 'Use per person 870 → 570 kg (2050)', -0.35, 'change', 'verified', ''),
      ('négaWatt / CLEVER convergence corridors (2022)', 'PDF p. 10', 'Corridor across studies', 'Cement', '2050 production as share of 2015: 52–99 % (low end shown)', 0.52, 'share of 2015', 'verified', 'negawatt.org/IMG/pdf/2206_convergence_corridors_-_industry-2.pdf'),
      ('négaWatt / CLEVER convergence corridors (2022)', 'PDF p. 10', 'Corridor across studies', 'Steel', '2050 production as share of 2015: 74–92 % (low end shown)', 0.74, 'share of 2015', 'verified', ''),
      ('IPCC AR6 WGIII Ch. 11', 'p. 1206', 'Assessment', 'Industry', '"material efficiency and demand management are still not well represented in the scenario literature"', None, 'qualitative', 'verified', 'ipcc.ch/report/ar6/wg3/downloads/report/IPCC_AR6_WGIII_Chapter11.pdf'),
      ('IPCC AR6 WGIII Ch. 5', 'p. 528', 'Assessment (global)', 'Industry', 'Demand-side (end-use) reduction potential, median', 0.287, 'share of industry emissions', 'verified', 'ipcc.ch/report/ar6/wg3/downloads/report/IPCC_AR6_WGIII_Chapter05.pdf'),
      ('IEA Net Zero by 2050 (2021)', 'Ch. 3 p. 122', 'NZE (global)', 'Steel / cement', 'Global demand 2050 vs today: steel +12 %, cement broadly flat', 0.12, 'change (steel)', 'verified', ''),
      ('NAVIGATE synthesis (Kriegler et al. 2023)', 'p. 42', 'History', 'EU industry CO2', 'Past cuts came from heavy-industry collapse and the 2008 crisis; stagnation since 2010', None, 'qualitative', 'verified', 'doi.org/10.48485/pik.2023.024')]
for k, row in enumerate(SA):
    rr = r + 2 + k
    for j, v in enumerate(row):
        c = wa.cell(rr, 1 + j, v); c.font = fIn if j == 5 and v is not None else fN; c.alignment = Alignment(wrap_text=True, vertical='top')
        if j == 5 and isinstance(v, float) and abs(v) < 2: c.number_format = PCT
SA_ROW0 = r + 2
wa.cell(r + 3 + len(SA), 1, 'Reading: in the central EU scenarios, steady or rising output is an input assumption, not a model result (EC IA S1–S3; CETO inherits S2). Only REMIND lets output respond to prices. Demand-side studies (Material Economics, CLEVER corridors, IA LIFE) show much lower output is possible by design.').font = fNote
for j, w in enumerate([40, 18, 30, 22, 52, 10, 20, 12, 44], 1): wa.column_dimensions[CL(j)].width = w

# ------------------------------------------------------------------ Evidence
wl = wb.create_sheet('Evidence')
wl.cell(1, 1, 'Evidence from the four research sweeps (27 Nov 2026), set against our numbers').font = fT
wl.cell(2, 1, 'Status: verified = the source was opened and the number read at the locator; not verified = listed for completeness, never used for a conclusion. "Ours" cells are formulas (green = link). Difference = theirs − ours where both are % changes of the same kind. Review: docs-internal/industry-decomposition-literature-review-2026-11-27.md.').font = fNote
cols = ['Question', 'Source', 'Locator', 'Scope, period, method', 'Their finding', 'Their value', 'Our comparable figure', 'Ours', 'Difference (points)', 'Comparable?', 'Verdict', 'Status', 'URL / DOI']
hdr(wl, 4, cols); wl.row_dimensions[4].height = 30
P = lambda lab, col: f'=Periods!{col}{PR[lab]}'
Q1, Q2, Q3, Q4 = '1. Output or intensity?', '2. Steel and cement intensity', '3. Why did output fall?', '4. What do scenarios assume?'
EV = [
 (Q1, 'UBA / Öko-Institut, Climate Change 52/2025, Annex B', 'abstract p. 5; §3.1.1 p. 34', 'EU27+UK steel, ETS, direct + indirect CO2, 2005–2022, LMDI with tonnes by route', 'CO2 −29 % (−71.4 Mt); "primarily driven by a reduction of production on the BF-BOF route"; no efficiency effect', -0.29, 'Steel emissions change 2005–2022', P('Lit: UBA steel 2005–2022', 'I'), True, 'Partly (UK, indirect)', 'Consistent', 'verified', 'umweltbundesamt.de/en/publikationen/effectiveness-of-eu-emissions-trading-what-drives'),
 (Q1, '', '', '', '', None, 'Steel: share from producing less 2005–2022', P('Lit: UBA steel 2005–2022', 'Q'), False, '', 'Consistent: output-led', '', ''),
 (Q1, 'UBA / Öko-Institut (Emele et al.), Climate Change 02/2022', '§3.1 p. 26', 'EU28 cement CO2 (process + fuel), 2005–2018, LMDI', '150 → 120 Mt; demand-side effects 55 % of the fall; clinker share rose', 0.55, 'Minerals (incl. fuel): share from producing less 2005–2018', P('Lit: UBA cement 2005–2018 (all minerals)', 'Q'), False, 'Partly ("demand side" includes clinker share and trade)', 'Consistent: output-led', 'verified', 'umweltbundesamt.de/en/node/92389'),
 (Q1, '', '', '', '', None, 'Cement process CO2: share from producing less 2005–2018', P('Lit: UBA cement 2005–2018', 'Q'), False, '', 'Consistent: >100 % because process CO2 per tonne rose (clinker share), as UBA finds', '', ''),
 (Q1, 'Branger & Quirion 2015, Energy Economics 47', 'WP §4 p. 22; PDF p. 4', 'EU27 cement CO2, 1990–2011, LMDI', 'Activity effect −68.6 Mt over 2007–2010; ETS abatement 2.0 % ± 1.1 % (2005–2011)', -68.6, 'Cement process CO2: producing less 2007–2010, Mt', P('Lit: Branger & Quirion cement 2007–2010', 'K'), False, 'Partly (ours excludes kiln fuel)', 'Consistent: activity dominant', 'verified', 'doi.org/10.1016/j.eneco.2014.11.008'),
 (Q1, 'NAVIGATE synthesis (Kriegler et al. 2023)', 'p. 42', 'EU industry CO2, 1990–2020', 'Cuts came from the collapse of heavy industry and the 2008 crisis; stagnation since 2010', None, 'Share from producing less, start 2007', P('Start 2007 (pre-crisis peak)', 'Q'), False, 'Qualitative', 'Consistent', 'verified', 'doi.org/10.48485/pik.2023.024'),
 (Q1, 'ESABCC 2024, Towards EU climate neutrality', 'p. 81', 'Industry GHG (981 Mt scope), 2005–2022', '−30 %; cuts "mainly driven by lowered production"', -0.30, 'Manufacturing emissions change 2005–2022', P('Lit: ESABCC industry 2005–2022', 'I'), True, 'Partly (scope)', 'Consistent', 'verified', 'repo: esabcc-reports/esabcc_report_towards-eu-climate-neutrality.pdf'),
 (Q1, 'EEA Report 14/2026, Europe\'s industrial transformation', 'Table 3.1, §3.1 pp. 29–31', 'Industry GHG 2010–2024 (incl. mining)', 'Total industry −27 %; metals −27 %, minerals −27 %, chemicals −33 %', -0.27, 'Manufacturing emissions change 2010–2024', P('Lit: EEA 2010–2024 all industry', 'I'), True, 'Partly (EEA includes mining)', 'Consistent', 'verified', 'eea.europa.eu/en/analysis/publications/europes-industrial-transformation'),
 (Q1, '', '', '', 'Metals −27 %', -0.27, 'Steel emissions change 2010–2024', P('Lit: EEA 2010–2024 steel', 'I'), True, 'Partly (metals vs steel)', 'Consistent', '', ''),
 (Q1, '', '', '', 'Minerals −27 %', -0.27, 'Cement, lime, glass emissions change 2010–2024', P('Lit: EEA 2010–2024 minerals', 'I'), True, 'Yes', 'Consistent', '', ''),
 (Q1, '', '', '', 'Chemicals −33 %', -0.33, 'Chemicals emissions change 2010–2024', P('Lit: EEA 2010–2024 chemicals', 'I'), True, 'Yes', 'Consistent', '', ''),
 (Q1, 'EC Climate Action Progress Report 2026, ch. 2 Box 2', 'web page', 'Five energy-intensive sectors, LMDI with value added, 2014–2024', '"real improvements in emissions efficiency" dominate; activity mattered more in metals (no effect sizes)', None, 'Share from producing less 2014–2024, production index', P('Lit: Commission CAPR 2014–2024, index', 'Q'), False, 'Partly', 'Consistent with an index-based method (about one third)', 'verified', 'climate.ec.europa.eu/…/eu-climate-action-progress-report-2025/chapter-2-…'),
 (Q1, '', '', '', '', None, 'Share from producing less 2014–2024, physical output', P('Lit: Commission CAPR 2014–2024, physical', 'Q'), False, '', 'Physical output gives nearly half: method explains the gap', '', ''),
 (Q1, 'ODYSSEE-MURE policy brief, Jan 2026', 'p. 4, Fig 11', 'EU industry energy CO2 (incl. mining, construction), 2010–2023, value-based activity', 'Activity effect +49 Mt; total −105 Mt (savings −72, decarbonisation −45, structure −36)', 49, 'Producing less 2010–2023, production index, Mt', P('Lit: ODYSSEE 2010–2023, index', 'K'), False, 'Partly (energy CO2 only; mining, construction; value added)', 'Differs in sign: scope and value-based activity', 'verified', 'odyssee-mure.eu/publications/policy-brief/industry-energy-efficiency-trends.html'),
 (Q1, '', '', '', '', None, 'Producing less 2010–2023, physical output, Mt', P('Lit: ODYSSEE 2010–2023, physical', 'K'), False, '', 'Physical output makes the gap larger', '', ''),
 (Q1, 'Eurostat, Statistics Explained, GHG emission accounts', 'Fig 4–5 text', 'Manufacturing GHG per value added (incl. refineries), 2013–2024', '−33 %', -0.33, 'Sector intensity change 2013–2024, production index', P('Lit: Eurostat 2013–2024, index', 'P'), True, 'No (value added ≠ volume)', 'Differs as expected: per-euro intensity falls faster than per-unit', 'verified', 'ec.europa.eu/eurostat/statistics-explained/SEPDF/cache/132197.pdf'),
 (Q1, 'Rottner & von Graevenitz 2024, ERE 87', 'p. 2523', 'Germany, product-level, 2005–2017', 'Technique effect +4.5 % (9-digit) vs +2.3 % (3-digit): coarse sectors understate composition', 0.045, 'Our split uses 15 sub-branches', None, False, 'Germany', 'Warning: product mix inside sub-branches stays in "producing cleaner"', 'verified', 'doi.org/10.1007/s10640-024-00894-7'),
 (Q1, 'Farla & Blok 2000; Norman 2017; Ang & Xu 2013; Román-Collado & Economidou 2021', 'see review', 'Method papers', 'Monetary activity measures overstate intensity gains', None, 'Share from producing less: physical vs production index (2005–2024)', f'=Periods!Q{PR["Headline"]}-Periods!Q{PR["Production index only"]}', False, 'Method', 'Consistent: physical output raises the output share by about 12 points', 'verified', ''),
 (Q2, 'ESABCC 2024, Fig 26 data', 'Fig 26; p. 92', 'Steel t CO2/t (EEA emissions ÷ Eurofer), 2008–2021', '1.010 → 0.962 (−4.7 %)', -0.047, 'Steel intensity change 2008–2021', P('Lit: ESABCC steel 2008–2021', 'P'), True, 'Yes', 'Consistent', 'verified', 'repo: ESABCC_report_Towards EU climate neutrality_underlying data.xlsx'),
 (Q2, '', '', 'Cement t CO2/t (ETS emissions ÷ CEMBUREAU), 2005–2021', '0.599 → 0.604 (+0.8 %)', 0.008, 'Cement process intensity change 2005–2021', P('Lit: ESABCC cement 2005–2021', 'P'), True, 'Partly (ours process only)', 'Consistent: flat', '', ''),
 (Q2, 'EEA Report 14/2026', 'p. 34', 'CO2 per tonne (JRC-IDEES), 2010–2023', 'Steel and cement "only a marginal decline"', None, 'Steel intensity change 2010–2023', P('Lit: EEA steel 2010–2023', 'P'), False, 'Yes (direction)', 'Consistent', 'verified', ''),
 (Q2, '', '', '', '', None, 'Cement process intensity change 2010–2023', P('Lit: EEA cement 2010–2023', 'P'), False, '', 'Consistent', '', ''),
 (Q2, '', '', '', 'Aluminium −35 %', -0.35, 'Primary aluminium intensity change 2010–2023', P('Lit: EEA primary aluminium 2010–2023', 'P'), True, 'Partly (EEA measure not stated)', 'Differs: not explained; left open', '', ''),
 (Q2, '', '', '', 'Chemicals −14 %', -0.14, 'Chemicals intensity change 2010–2023', P('Lit: EEA chemicals 2010–2023', 'P'), True, 'Partly', 'Close', '', ''),
 (Q2, 'EU ETS benchmarks, Impl. Reg. 2021/447 and 2026/1412', 'Annex', 'Best 10 % of plants, 2016–17 → 2021–22', 'Grey clinker −4.6 %; hot metal +2.2 %', None, '(see sheet Steel & cement, reference points)', None, False, 'Frontier, not average', 'Consistent: frontier also flat', 'verified', 'publications.europa.eu/resource/celex/32026R1412'),
 (Q2, 'JRC factsheets JRC144070, JRC144123 (2026)', 'p. 2; p. 1', 'Route and product averages, current', 'BF-BOF 1.81, EAF 0.24 t CO2e/t; cement about 0.65 t CO2/t', None, '(see sheet Steel & cement, reference points)', None, False, 'Snapshot', 'Consistent orders of magnitude', 'verified', ''),
 (Q3, 'Eurostat env_ac_ghgfp (FIGARO), own computation', 'API, updated 30 Oct 2026', 'EU footprint by emitting industry, 2010–2024', 'Non-EU share of the EU footprint rose; imported emissions fell', None, 'Basic metals: non-EU share change, points', f"='Trade & demand'!F{FPC['C24']}", False, '', 'Relative displacement, not wholesale relocation', 'verified (computed)', 'ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/env_ac_ghgfp'),
 (Q3, '', '', '', '', None, 'Basic metals: share of production-side fall from lower exports', f"='Trade & demand'!G{FPC['C24']}", False, '', '', '', ''),
 (Q3, 'EUROFER, European Steel in Figures 2024', 'pp. 17, 25, 38', 'Steel, 2019 → 2023', 'Production 150.2 → 126.2 Mt; consumption 144.8 → 125.6 Mt; imports 26.3 → 25.6 Mt', None, 'Fall in consumption as share of fall in production', f"='Trade & demand'!F{STR['Apparent steel consumption, Mt']}/'Trade & demand'!F{STR['Crude steel production, Mt']}", False, '', 'Demand: consumption fell about as much as production; imports flat', 'verified', 'eurofer.eu (EUROFER-2024-Version-June14.pdf)'),
 (Q3, 'UBA Climate Change 02/2022 (cement)', '§3.1 p. 26', 'EU28 cement 2005–2018', 'Demand-side 55 %; ETS did not "substantially" contribute; EU net clinker exporter since 2008', 0.55, '', None, False, '', 'Demand', 'verified', ''),
 (Q3, 'Ex-post leakage studies (Naegele & Zaklan; Dechezleprêtre et al.; Branger et al.; Healy et al.; Verde)', 'abstracts', 'Phases I–II (to about 2016)', 'No carbon-price leakage found (low prices, free allocation)', None, '', None, False, '', 'No leakage up to about 2016', 'verified', 'see sheet Trade & demand, part E'),
 (Q3, 'Chen, Di Gregorio & Paavola 2026, Climate Policy', 'pp. 7, 9, 11', 'Meta-analysis to 2025', 'Trade leakage 0.03 (not significant); investment leakage 1.07 (significant)', None, '', None, False, '', 'No trade leakage; investment leakage', 'verified', 'doi.org/10.1080/14693062.2026.2627750'),
 (Q3, 'ECB EB 1/2023 Box 2; IEA EMR 2023; Draghi 2024', 'see Trade & demand E', '2021–2023', 'Energy-cost relocation in chemicals and aluminium; CO2 about 2 % of steel cost', None, '', None, False, '', 'Energy-cost leakage after 2022, not carbon-price', 'verified (IEA via mirror)', ''),
 (Q3, 'Roland Berger for Cefic, closures radar 2022–2025', 'pdf p. 4', 'European chemicals', '37 Mt closures; energy cost 49 %, demand 19 %', 0.49, '', None, False, '', 'Mostly energy cost (industry source)', 'verified', 'cefic.org/app/uploads/2026/01/European-Chemical-Closures-and-Investments-Radar-2022-2025.pdf'),
 (Q3, 'Colmer et al. 2025; Pauliuk et al. 2013; OECD Steel Outlook 2025', '—', '—', 'Years / stock figures / overcapacity numbers', None, '', None, False, '', 'Not used', 'not verified', ''),
 (Q4, 'EC 2040 IA, SWD(2024) 63', 'Part 1 §5.3.1 p. 31; Part 2 Annex 6 p. 15', 'S1–S3', 'Identical industry output assumptions; EII GVA +25 % by 2040; volumes grow except steel', 0.25, 'ECL pathways: steel + cement output change 2025–2040, REMIND 1266', f"=('Scenario assumptions'!E5+'Scenario assumptions'!E6)/('Scenario assumptions'!D5+'Scenario assumptions'!D6)-1", False, 'Partly (value added vs tonnes)', 'Output held up by assumption', 'verified', 'data.consilium.europa.eu/doc/document/ST-6291-2024-ADD-2/en/pdf'),
 (Q4, 'JRC CETO 2024', 'pp. 14–15, 34–35', 'CETO 2024 (activity from IA S2)', 'Steel about 145 Mt flat; cement +13–16 % 2021–2050', None, 'CETO 2024 cement output change 2025–2040 (model data)', "='Scenario assumptions'!G10", False, 'Yes', 'Consistent: CETO inherits the IA assumption', 'verified', ''),
 (Q4, 'EC 2040 IA, LIFE variant', 'Table 3 pp. 38–39', 'LIFE', 'Steel −15 %, cement −25 % by 2050 vs S1–S3', -0.15, '', None, False, '', 'Only demand-side variant in Commission modelling', 'verified', ''),
 (Q4, 'Pehl, Schreyer & Luderer 2024, GMD 17', 'PDF pp. 5, 15', 'REMIND', 'Output falls endogenously with mitigation (price response)', None, 'REMIND 1266 steel output change 2025–2040', "='Scenario assumptions'!G5", False, 'Yes', 'Consistent: REMIND lets output fall', 'verified', 'doi.org/10.5194/gmd-17-2015-2024'),
 (Q4, 'IPCC AR6 WGIII Ch. 11', 'p. 1206', 'Assessment', 'Material efficiency and demand management "still not well represented in the scenario literature"', None, '', None, False, '', 'Known structural gap', 'verified', ''),
 (Q4, 'Material Economics 2019; CLEVER corridors 2022', 'PDF pp. 26, 78; PDF p. 10', 'Demand-side studies', 'Steel 139 Mt (circular) vs about 190 baseline; 2050 cement 52–99 %, steel 74–92 % of 2015', None, '', None, False, '', 'Lower output possible by design', 'verified', ''),
 (Q4, 'Historical vs scenario decomposition', '—', 'Searched in all four sweeps', 'No published comparison found', None, 'Steel + cement: share from producing less, history vs ECL pathways', "=Scenarios!Q" + str(HIST_SC), False, '', 'Our comparison appears new', '', ''),
 (Q4, 'EUCalc D3.2; Pauliuk et al. 2017; JRC GECO 2024; CTP IA SWD(2020) 176', '—', '—', 'Not opened', None, '', None, False, '', 'Not used', 'not verified', ''),
]
qprev = None
for k, (q, src, loc, scope, fin, theirs, olab, ours, diff, comp, verd, stat, url) in enumerate(EV):
    r = 5 + k
    vals = [q if q != qprev else '', src, loc, scope, fin, theirs, olab, ours, (f'=(F{r}-H{r})*100' if diff else None), comp, verd, stat, url]
    for j, v in enumerate(vals):
        if v is None: continue
        c = wl.cell(r, 1 + j, v); c.alignment = Alignment(wrap_text=True, vertical='top')
        c.font = fIn if j == 5 else (fLink if j == 7 else (fB if j == 0 else fN))
        if j in (5, 7):
            c.number_format = PCT if (isinstance(v, float) and abs(v) < 2) or (j == 7 and any(t in olab for t in ('share', 'change', 'Share', 'Fall'))) and 'Mt' not in olab and 'points' not in olab else NUM
        if j == 8: c.number_format = '0.0'
    if q != qprev and k:
        for j in range(1, 14): wl.cell(r - 1, j).border = thin
    qprev = q
for j, w in enumerate([18, 34, 16, 30, 44, 10, 38, 10, 10, 22, 36, 14, 40], 1): wl.column_dimensions[CL(j)].width = w
wl.freeze_panes = 'B5'

# ------------------------------------------------------------------ Key findings
kf = wb.create_sheet('Key findings', 1)
kf.cell(1, 1, 'Key findings in plain words (each number is a live link into this workbook)').font = fT
kf.cell(2, 1, 'AI-compiled — pending Secretariat verification.').font = Font(name=F, bold=True, color='C55A11')
hdr(kf, 4, ['#', 'Finding', 'Number', 'Shown on sheet', 'What the research sweep says'])
hl = PR['Headline']
KF = [
 ('EU manufacturing emissions fell by about 19 Mt a year between 2005 and 2024.', f'=-Periods!H{hl}/19', NUM, 'Periods', 'EEA, ESABCC and the Commission report falls of the same size (sheet Evidence, Q1).'),
 ('About 45 % of that fall came from producing less (average of the two calculation orders).', f'=Periods!Q{hl}', PCT, 'Periods / Workout', 'Every study that measures output in tonnes finds output-led cuts in steel and cement; value-based studies find a smaller output role.'),
 ('Measured with production indices (value-based) instead of tonnes, the share drops to about one third.', f'=Periods!Q{PR["Production index only"]}', PCT, 'Periods', 'Method literature: value measures overstate intensity gains (Farla & Blok; Norman; Ang & Xu).'),
 ('The share depends on the start year: from the 2007 peak it is higher, from 2010 lower.', f'=Periods!Q{PR["Start 2007 (pre-crisis peak)"]}', PCT, 'Periods', 'NAVIGATE: the collapse of heavy industry and the 2008 crisis drove past cuts.'),
 ('For steel and cement, lime, glass, two-thirds of the fall came from producing less.', f'=Scenarios!Q{HIST_SC}', PCT, 'Scenarios / Periods', 'UBA (steel, cement), Branger & Quirion, EEA and ESABCC all agree.'),
 ('Steel emitted only slightly less per tonne in 2021 than in 2008 (ours).', P('Lit: ESABCC steel 2008–2021', 'P')[0:] , PCT, 'Steel & cement', 'ESABCC Fig 26: −4.7 %; EEA: "only a marginal decline"; ETS hot-metal benchmark +2.2 %.'),
 ('Cement process CO2 per tonne was flat 2005–2021 (ours).', P('Lit: ESABCC cement 2005–2021', 'P'), PCT, 'Steel & cement', 'ESABCC Fig 26: +0.8 %; clinker benchmark −4.6 %.'),
 ('Imports did not replace EU production wholesale: emissions embodied in imported basic metals fell 2010–2024.', f"='Trade & demand'!E{FPC['C24']}", PCT, 'Trade & demand', 'Footprint shares rose (relative displacement). Ex-post studies find no carbon-price leakage to about 2016; after 2022, energy-cost relocation in chemicals and aluminium.'),
 ('In the three ECL pathways that report output, only about one tenth of the 2025–2040 steel and cement cut comes from producing less (the highest of the three is shown; the others are lower).', f'=MAX(Scenarios!Q{SCN_ROWS[0]},Scenarios!Q{SCN_ROWS[1]},Scenarios!Q{SCN_ROWS[2]})', PCT, 'Scenarios', 'Expected: the Commission IA fixes output by assumption and CETO inherits it; only REMIND lets output respond (Q4).'),
 ('So the cut from producing cleaner must speed up sharply: from about 10 Mt a year in the past to most of the 18–28 Mt a year the pathways need.', f'=-(Periods!H{hl}-Periods!H{hl}*Periods!Q{hl})/19', NUM, 'Periods', 'IPCC AR6: demand-side options are under-represented in scenarios; Material Economics and CLEVER show lower output by design.'),
]
for k, (txt, f, nf, sh, lit) in enumerate(KF):
    r = 5 + k
    kf.cell(r, 1, k + 1).font = fN
    c = kf.cell(r, 2, txt); c.font = fN; c.alignment = Alignment(wrap_text=True, vertical='top')
    c = kf.cell(r, 3, f); c.font = fLink; c.number_format = nf
    kf.cell(r, 4, sh).font = fN
    c = kf.cell(r, 5, lit); c.font = fN; c.alignment = Alignment(wrap_text=True, vertical='top')
    kf.row_dimensions[r].height = 45
kf.cell(5 + len(KF) + 1, 2, 'Units: rows 1 and 10 in Mt CO2e a year; the others are shares or % changes. The 18–28 Mt a year needed comes from the pathway screening (fig_industry_onefig.py).').font = fNote
kf.column_dimensions['A'].width = 4; kf.column_dimensions['B'].width = 80; kf.column_dimensions['C'].width = 11; kf.column_dimensions['D'].width = 18; kf.column_dimensions['E'].width = 80

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
