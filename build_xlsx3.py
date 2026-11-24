import json, pandas as pd, numpy as np
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.formatting.rule import FormulaRule
from openpyxl.utils import get_column_letter as L
S = pd.read_csv('/home/claude/setdeck2/systems_fix.csv', low_memory=False); STG = pd.read_csv('/home/claude/setdeck2/stages.csv')
B = S[S.det & ~S.dup].copy(); B['red30_db'] = STG.red30[B.index]
T = pd.read_pickle('roles.pkl').sort_values(['sid', 'role', 'year']).reset_index(drop=True)
H = json.load(open('/home/claude/figs/eu_net_ghg_hist.json'))
FIX = {'core__': 'newsrc/platforms/raw/core__'}
T['file'] = [('newsrc/platforms/raw/' + f) if f.startswith('core__') else f for f in T.file]
AR = Font(name='Arial', size=10); ARB = Font(name='Arial', size=10, bold=True); BLUE = Font(name='Arial', size=10, color='0000FF'); GRN = Font(name='Arial', size=10, color='008000')
HDR = PatternFill('solid', fgColor='608C95'); HF = Font(name='Arial', size=10, bold=True, color='FFFFFF'); YEL = PatternFill('solid', fgColor='FFFF00'); GREY = PatternFill('solid', fgColor='EEEEEE')
LIL = PatternFill('solid', fgColor='F1ECF8'); WR = Alignment(wrap_text=True, vertical='top'); TOP = Alignment(vertical='top')
wb = Workbook()
def hdr(ws, row, names, widths=None):
    for j, n in enumerate(names, 1):
        c = ws.cell(row, j, n); c.font = HF; c.fill = HDR; c.alignment = Alignment(wrap_text=True, vertical='bottom')
        if widths: ws.column_dimensions[L(j)].width = widths[j - 1]
def name(nm, ref): wb.defined_names[nm] = DefinedName(nm, attr_text=ref)

# ---------------- Limits (inputs)
lw = wb.active; lw.title = 'Limits'
lw['A1'] = 'Screening rules and limits (blue cells can be changed; every formula in the workbook reads them from here)'; lw['A1'].font = Font(name='Arial', size=12, bold=True)
hdr(lw, 3, ['Item', 'Value', 'Unit', 'Rule', 'Source'], [46, 12, 12, 52, 70])
LIM = [('base_1990', 'EU net GHG 1990 (inventory)', H['1990'], 'Mt CO2e', 'base of the cuts', 'EEA greenhouse gas inventory, EU27 incl. LULUCF (figs/eu_net_ghg_hist.json)'),
       ('base_2015', 'EU net GHG 2015 (inventory)', H['2015'], 'Mt CO2e', 'model value scaled to this level', 'same'),
       ('base_2020', 'EU net GHG 2020 (inventory)', H['2020'], 'Mt CO2e', 'used when a pathway reports no 2015 value', 'same'),
       ('min_cut_2030', '2030 cut against 1990, at least', 54.95, '%', 'fail if below; no 2030 value counts as passed (55% after rounding)', 'EU Climate Law target'),
       ('win_lo', 'ECL and ECL +10%: 2040 cut, lower bound', 84.95, '%', 'in window if ≥ lower and < upper (85% after rounding)', 'screening setting of the deck'),
       ('win_hi', 'ECL and ECL +10%: 2040 cut, upper bound (exclusive)', 90.5, '%', '90% after rounding', 'screening setting of the deck'),
       ('win3_lo', 'ESABCC 2040: 2040 cut, lower bound', 90.5, '%', 'in window if ≥ lower and < upper (above 90% after rounding)', 'screening setting of the deck'),
       ('win3_hi', 'ESABCC 2040: 2040 cut, upper bound (exclusive)', 95.5, '%', '95% after rounding', 'screening setting of the deck'),
       ('net_ecl', 'ECL: EU net GHG 2050 at most', 1, 'Mt CO2e', 'deck shows ≤ 0 Mt; the cut-off is 1 Mt so that REMIND-EU 07_NZ_CCS180_highImp (+0.3 Mt) counts as net zero', 'screening setting of the deck'),
       ('net_red', 'ECL +10%: EU net GHG 2050 at most', 50, 'Mt CO2e', '', 'screening setting of the deck'),
       ('net_esabcc', 'ESABCC 2040: EU net GHG 2050 at most', 1, 'Mt CO2e', 'deck shows ≤ 0 Mt', 'screening setting of the deck'),
       ('tol', 'ECL +10%: tolerance on EU CO2 capture, EU primary bioenergy and world CO2 storage (filter and risk level)', 0.1, 'share', 'limit × (1 + tolerance); other limits without tolerance', 'screening setting of the deck'),
       ('esabcc_board', 'ESABCC 2023 REMIND 3.2 runs: use the Board\'s own 2040 cut stored in the database (1, as in the deck) or the formula (0)', 1, '1 or 0', 'with 0, def_bioLim7p5_500 (95.8%) and flex_bioLim7p5_500 (96.4%) leave ESABCC 2040', 'see README'),
       ('jrc_flag', 'JRC pathways: use the net-zero flag of the database (1) or the reported Kyoto 2050 (0)', 1, '1 or 0', 'database rule: 1', 'see README'),
       ('f_cap', 'Filter: EU CO2 capture 2050', 500, 'Mt CO2/yr', 'exclude if above', 'ESABCC (2023), Table 5'), ('f_bio', 'Filter: EU primary bioenergy 2050', 20, 'EJ/yr', 'exclude if above', 'ESABCC (2023), Table 5'),
       ('f_wccs', 'Filter: world CO2 storage 2050', 8600, 'Mt CO2/yr', 'exclude if above', 'ESABCC (2023), Table 5'), ('f_wbio', 'Filter: world primary bioenergy 2050', 240, 'EJ/yr', 'exclude if above', 'ESABCC (2023), Table 5'),
       ('f_h2', 'Filter: EU hydrogen production 2030', 1.89, 'EJ/yr', 'exclude if above', 'ESABCC (2023), Table 5'), ('f_fe', 'Filter: EU final energy decline 2020–2030', 20, '%', 'exclude if above', 'ESABCC (2023), Table 5'),
       ('r_cap', 'Risk level: EU CO2 capture 2050', 425, 'Mt CO2/yr', 'exclude if above', 'ESABCC (2023), Table 6'), ('r_bio', 'Risk level: EU primary bioenergy 2050', 9, 'EJ/yr', 'exclude if above', 'ESABCC (2023), Table 6'),
       ('r_land', 'Risk level: EU land sink 2050', 400, 'Mt CO2/yr', 'exclude if above', 'ESABCC (2023), Table 6')]
for i, (nm, lab, v, u, rule, src) in enumerate(LIM, 4):
    lw.cell(i, 1, lab).font = AR; c = lw.cell(i, 2, v); c.font = BLUE; c.fill = YEL if nm in ('net_ecl', 'tol', 'jrc_flag', 'esabcc_board') else PatternFill(); c.number_format = '#,##0.00' if isinstance(v, float) and v < 100 else '#,##0.0'
    lw.cell(i, 3, u).font = AR; lw.cell(i, 4, rule).font = AR; lw.cell(i, 5, src).font = AR; name(nm, f"Limits!$B${i}")
lw['B15'].number_format = '0%'; lw['B16'].number_format = '0'; lw['B17'].number_format = '0'; lw['B12'].number_format = '0'; lw['B14'].number_format = '0'
for r in range(4, 4 + len(LIM)):
    for c in range(1, 6): lw.cell(r, c).alignment = WR

# ---------------- Raw
rw = wb.create_sheet('Raw'); n = len(T)
hdr(rw, 1, ['Key (ID|role|year)', 'ID', 'Role', 'Year', 'Source / platform', 'File in this workspace', 'Model', 'Scenario', 'Region', 'Variable as published', 'Unit as published', 'Value as published', 'Factor', 'Value used', 'Note'],
    [24, 7, 9, 7, 44, 52, 24, 40, 30, 46, 16, 14, 8, 14, 50])
for k, x in enumerate(T.itertuples(), 2):
    vals = [f'{x.sid}|{x.role}|{x.year}', x.sid, x.role, x.year, x.platform, x.file, x.model, x.scenario, x.region, x.variable, x.unit, x.value_published, x.factor, f'=L{k}*M{k}', x.note]
    for j, v in enumerate(vals, 1):
        c = rw.cell(k, j, v); c.font = BLUE if j in (12, 13) else AR
    rw.cell(k, 12).number_format = '#,##0.000'; rw.cell(k, 14).number_format = '#,##0.000'
rw.freeze_panes = 'B2'; rw.auto_filter.ref = f'A1:O{n + 1}'
name('RawKey', f'Raw!$A$2:$A${n + 1}'); name('RawVal', f'Raw!$N$2:$N${n + 1}')

# ---------------- Screening
sc = wb.create_sheet('Screening', 1)
COLS = [('ID', 7), ('Database source', 11), ('Model', 24), ('Scenario', 40), ('Industry reported as one total', 9),
        ('Net GHG 2015', 10), ('Net GHG 2020', 10), ('Net GHG 2030', 10), ('Net GHG 2040', 10), ('Net GHG 2050', 10),
        ('Industry energy CO2 2020', 10), ('Industry energy CO2 2050', 10), ('Industrial process CO2 2020', 10), ('Industrial process CO2 2050', 10),
        ('EU CO2 capture 2050', 10), ('EU primary bioenergy 2050', 10), ('EU land-use CO2 2050', 10), ('EU hydrogen 2030', 9), ('EU final energy 2020', 10), ('EU final energy 2030', 10), ('World CO2 storage 2050', 10), ('World bioenergy 2050', 10),
        ('JRC net-zero flag (database)', 9),
        ('Industry data reported', 9), ('2030 cut, %', 8), ('2040 cut, %', 8), ('EU land sink 2050', 9), ('Final energy decline 2020–30, %', 9),
        ('2030 rule', 8), ('2040 window 85–90%', 8), ('2040 window 90–95%', 8), ('Net rule ECL', 8), ('Net rule ECL +10%', 8), ('Net rule ESABCC 2040', 8),
        ('Filter: capture', 9), ('Filter: bioenergy', 9), ('Filter: world storage', 9), ('Filter: world bioenergy', 9), ('Filter: hydrogen', 9), ('Filter: final energy', 9),
        ('Risk: capture', 9), ('Risk: bioenergy', 9), ('Risk: land sink', 9), ('+10% filter: capture', 9), ('+10% filter: bioenergy', 9), ('+10% filter: world storage', 9), ('+10% risk: capture', 9), ('+10% risk: bioenergy', 9),
        ('In ECL', 7), ('In ECL +10%', 7), ('ESABCC 2040: passes', 7), ('ESABCC 2040: main run (input)', 8), ('In ESABCC 2040', 7),
        ('ECL: stops at', 30), ('ECL +10%: stops at', 30), ('ESABCC 2040: stops at', 30),
        ('Stored: net GHG 2050', 10), ('Stored: 2030 cut', 9), ('Stored: 2040 cut', 9), ('Stored: capture', 9), ('Stored: bioenergy', 9), ('Stored: land sink', 9), ('Stored: world storage', 9), ('Same as stored', 9),
        ('#ecl', 4), ('#red', 4), ('#esabcc', 4), ('#step', 4)]
hdr(sc, 4, [c for c, _ in COLS], [w for _, w in COLS])
C = {nm: L(j) for j, (nm, _) in enumerate(COLS, 1)}
sc['A1'] = 'Screening of every pathway with EU industry data: each value is read from sheet Raw by formula, each rule reads its limit from sheet Limits'; sc['A1'].font = Font(name='Arial', size=12, bold=True)
sc['A2'] = 'Units: Mt CO2e (net GHG, industry), Mt CO2 (capture, land, storage), EJ/yr (bioenergy, hydrogen), as in the source (final energy). Empty cell = not reported or not pulled. Rule cells: TRUE = passes; limit cells: above / ok / no data.'; sc['A2'].font = AR
sc.row_dimensions[4].height = 66
RAWV = {'Net GHG 2015': ('NET', 2015), 'Net GHG 2020': ('NET', 2020), 'Net GHG 2030': ('NET', 2030), 'Net GHG 2040': ('NET', 2040), 'Net GHG 2050': ('NET', 2050),
        'Industry energy CO2 2020': ('IND_E', 2020), 'Industry energy CO2 2050': ('IND_E', 2050), 'Industrial process CO2 2020': ('IND_P', 2020), 'Industrial process CO2 2050': ('IND_P', 2050),
        'EU CO2 capture 2050': ('CAP', 2050), 'EU primary bioenergy 2050': ('BIO', 2050), 'EU land-use CO2 2050': ('LAND_CO2', 2050), 'EU hydrogen 2030': ('H2', 2030), 'EU final energy 2020': ('FE', 2020), 'EU final energy 2030': ('FE', 2030),
        'World CO2 storage 2050': ('WCCS', 2050), 'World bioenergy 2050': ('WBIO', 2050)}
B = B.sort_values(['src', 'model', 'scenario'])
S3 = pd.read_csv('/home/claude/setdeck2/sets3.csv', index_col=0); MAIN = set(int(i) for i in S3.index[S3.s3])
r0 = 5; rN = r0 + len(B) - 1
def lim(col, nm, t='0'): return f'=IF({col}{{r}}="","no data",IF({col}{{r}}>{nm}*(1+{t}),"above","ok"))'
for k, (sid, x) in enumerate(B.iterrows(), r0):
    r = k; g = lambda nm: f'{C[nm]}{r}'
    vals = {'ID': sid, 'Database source': x.src, 'Model': x.model, 'Scenario': x.scenario, 'Industry reported as one total': x.src == 'POLIZERO',
            'JRC net-zero flag (database)': (bool(x.nz0) if pd.notna(x.nz0) else False) if x.src == 'JRC' else ''}
    for nm, (role, y) in RAWV.items():
        key = f'$A{r}&"|{role}|{y}"'; vals[nm] = f'=IF(COUNTIF(RawKey,{key})=0,"",SUMIF(RawKey,{key},RawVal))'
    vals['Industry data reported'] = f'=AND({g("Industry energy CO2 2020")}<>"",{g("Industry energy CO2 2050")}<>"",OR({g("Industry reported as one total")},AND({g("Industrial process CO2 2020")}<>"",{g("Industrial process CO2 2050")}<>"")),N({g("Industry energy CO2 2020")})+N({g("Industrial process CO2 2020")})>0)'
    K15, K20 = g('Net GHG 2015'), g('Net GHG 2020')
    cut = lambda kx: f'=IF(OR({kx}="",AND({K15}="",{K20}="")),"",IF(AND({K15}<>"",N({K15})>0),(1-{kx}*base_2015/{K15}/base_1990)*100,(1-{kx}*base_2020/{K20}/base_1990)*100))'
    vals['2030 cut, %'] = cut(g('Net GHG 2030')); vals['2040 cut, %'] = '=IF(AND(esabcc_board=1,$B' + str(r) + '="ESABCC",' + g('Stored: 2040 cut') + '<>""),' + g('Stored: 2040 cut') + ',' + cut(g('Net GHG 2040'))[1:] + ')'
    vals['EU land sink 2050'] = f'=IF({g("EU land-use CO2 2050")}="","",-{g("EU land-use CO2 2050")})'
    vals['Final energy decline 2020–30, %'] = f'=IF(OR({g("EU final energy 2020")}="",{g("EU final energy 2030")}=""),"",(1-{g("EU final energy 2030")}/{g("EU final energy 2020")})*100)'
    vals['2030 rule'] = f'=IF({g("2030 cut, %")}="",TRUE,{g("2030 cut, %")}>=min_cut_2030)'
    vals['2040 window 85–90%'] = f'=IF({g("2040 cut, %")}="",FALSE,AND({g("2040 cut, %")}>=win_lo,{g("2040 cut, %")}<win_hi))'
    vals['2040 window 90–95%'] = f'=IF({g("2040 cut, %")}="",FALSE,AND({g("2040 cut, %")}>=win3_lo,{g("2040 cut, %")}<win3_hi))'
    for s_, nn in (('ECL', 'net_ecl'), ('ECL +10%', 'net_red'), ('ESABCC 2040', 'net_esabcc')):
        vals[f'Net rule {s_}'] = f'=IF(AND(jrc_flag=1,$B{r}="JRC"),{g("JRC net-zero flag (database)")}=TRUE,IF({g("Net GHG 2050")}="",FALSE,{g("Net GHG 2050")}<={nn}))'
    for nm, col, ln in (('Filter: capture', 'EU CO2 capture 2050', 'f_cap'), ('Filter: bioenergy', 'EU primary bioenergy 2050', 'f_bio'), ('Filter: world storage', 'World CO2 storage 2050', 'f_wccs'),
                        ('Filter: world bioenergy', 'World bioenergy 2050', 'f_wbio'), ('Filter: hydrogen', 'EU hydrogen 2030', 'f_h2'), ('Filter: final energy', 'Final energy decline 2020–30, %', 'f_fe'),
                        ('Risk: capture', 'EU CO2 capture 2050', 'r_cap'), ('Risk: bioenergy', 'EU primary bioenergy 2050', 'r_bio'), ('Risk: land sink', 'EU land sink 2050', 'r_land')):
        vals[nm] = lim(C[col], ln).format(r=r)
    for nm, col, ln in (('+10% filter: capture', 'EU CO2 capture 2050', 'f_cap'), ('+10% filter: bioenergy', 'EU primary bioenergy 2050', 'f_bio'), ('+10% filter: world storage', 'World CO2 storage 2050', 'f_wccs'),
                        ('+10% risk: capture', 'EU CO2 capture 2050', 'r_cap'), ('+10% risk: bioenergy', 'EU primary bioenergy 2050', 'r_bio')):
        vals[nm] = lim(C[col], ln, 'tol').format(r=r)
    FL = [g(n_) for n_ in ('Filter: capture', 'Filter: bioenergy', 'Filter: world storage', 'Filter: world bioenergy', 'Filter: hydrogen', 'Filter: final energy')]
    RK = [g(n_) for n_ in ('Risk: capture', 'Risk: bioenergy', 'Risk: land sink')]
    RL = [g(n_) for n_ in ('+10% filter: capture', '+10% filter: bioenergy', '+10% filter: world storage', 'Filter: world bioenergy', 'Filter: hydrogen', 'Filter: final energy', '+10% risk: capture', '+10% risk: bioenergy', 'Risk: land sink')]
    anyab = lambda cells: 'OR(' + ','.join(f'{c_}="above"' for c_ in cells) + ')'
    lab = {g('Filter: capture'): 'capture > filter', g('Filter: bioenergy'): 'bioenergy > filter', g('Filter: world storage'): 'world storage > filter', g('Filter: world bioenergy'): 'world bioenergy > filter',
           g('Filter: hydrogen'): 'hydrogen > filter', g('Filter: final energy'): 'final energy > filter', g('Risk: capture'): 'capture > risk level', g('Risk: bioenergy'): 'bioenergy > risk level', g('Risk: land sink'): 'land sink > risk level', g('+10% filter: capture'): 'capture > filter +10%', g('+10% filter: bioenergy'): 'bioenergy > filter +10%', g('+10% filter: world storage'): 'world storage > filter +10%', g('+10% risk: capture'): 'capture > risk level +10%', g('+10% risk: bioenergy'): 'bioenergy > risk level +10%'}
    which = lambda cells: '&'.join(f'IF({c_}="above","{lab[c_]}; ","")' for c_ in cells)
    base = f'AND({g("Industry data reported")},{{net}},{g("2030 rule")},{{win}})'
    stop = lambda net, win, cells: (f'=IF(NOT({g("Industry data reported")}),"no industry data",IF(NOT({g(net)}),"2050 net GHG rule",IF(NOT({g("2030 rule")}),"2030 cut below 55%",IF(NOT({g(win)}),"2040 cut outside window",'
                                    f'IF({anyab(cells)},{which(cells)},"passes all")))))')
    vals['In ECL'] = f'=AND({base.format(net=g("Net rule ECL"), win=g("2040 window 85–90%"))},NOT({anyab(FL)}),NOT({anyab(RK)}))'
    vals['In ECL +10%'] = f'=AND({base.format(net=g("Net rule ECL +10%"), win=g("2040 window 85–90%"))},NOT({anyab(RL)}))'
    vals['ESABCC 2040: passes'] = f'=AND({base.format(net=g("Net rule ESABCC 2040"), win=g("2040 window 90–95%"))},NOT({anyab(FL)}),NOT({anyab(RK)}))'
    vals['ESABCC 2040: main run (input)'] = bool(sid in MAIN)
    vals['In ESABCC 2040'] = f'=AND({g("ESABCC 2040: passes")},{g("ESABCC 2040: main run (input)")})'
    vals['ECL: stops at'] = stop('Net rule ECL', '2040 window 85–90%', FL + RK)
    vals['ECL +10%: stops at'] = stop('Net rule ECL +10%', '2040 window 85–90%', RL)
    _st = stop('Net rule ESABCC 2040', '2040 window 90–95%', FL + RK); _p = _st.rfind('"passes all"')
    vals['ESABCC 2040: stops at'] = _st[:_p] + 'IF(NOT(' + g('ESABCC 2040: main run (input)') + '),"passes; sensitivity variant, not a main run","passes all")' + _st[_p + len('"passes all"'):]
    st = lambda v, d=1: None if pd.isna(v) else round(float(v), d)
    vals.update({'Stored: net GHG 2050': st(x.net50), 'Stored: 2030 cut': st(x.red30_db, 2), 'Stored: 2040 cut': st(x.red, 2), 'Stored: capture': st(x.cap50), 'Stored: bioenergy': st(x.bio50, 2), 'Stored: land sink': st(x.land50), 'Stored: world storage': st(x.wccs50)})
    pairs = [('Net GHG 2050', 'Stored: net GHG 2050', 0.15), ('2030 cut, %', 'Stored: 2030 cut', 0.06), ('2040 cut, %', 'Stored: 2040 cut', 0.06), ('EU CO2 capture 2050', 'Stored: capture', 0.15),
             ('EU primary bioenergy 2050', 'Stored: bioenergy', 0.006), ('EU land sink 2050', 'Stored: land sink', 0.15), ('World CO2 storage 2050', 'Stored: world storage', 0.15)]
    vals['Same as stored'] = '=AND(' + ','.join(f'OR({g(b_)}="",AND({g(a_)}<>"",ABS(N({g(a_)})-{g(b_)})<={t_}))' for a_, b_, t_ in pairs) + ')'
    for s_, cn in (('ecl', 'In ECL'), ('red', 'In ECL +10%'), ('esabcc', 'In ESABCC 2040')): vals[f'#{s_}'] = f'=IF({g(cn)},COUNTIF({C[cn]}${r0}:{C[cn]}{r},TRUE),"")'
    vals['#step'] = f'=IF(AND({g("Industry data reported")},{g("2030 rule")},OR(AND({g("Net rule ECL +10%")},{g("2040 window 85–90%")}),AND({g("Net rule ESABCC 2040")},{g("2040 window 90–95%")}))),COUNTIF({C["#step"]}${r0}:{C["#step"]}{r - 1 if r > r0 else r0},">0")+1,"")' if r > r0 else \
        f'=IF(AND({g("Industry data reported")},{g("2030 rule")},OR(AND({g("Net rule ECL +10%")},{g("2040 window 85–90%")}),AND({g("Net rule ESABCC 2040")},{g("2040 window 90–95%")}))),1,"")'
    for nm_, v in vals.items():
        c = sc[f'{C[nm_]}{r}']; c.value = v
        c.font = GRN if isinstance(v, str) and v.startswith('=IF(COUNTIF(RawKey') else AR
        if nm_ in RAWV or nm_ in ('2030 cut, %', '2040 cut, %', 'EU land sink 2050', 'Final energy decline 2020–30, %') or nm_.startswith('Stored'): c.number_format = '#,##0.0;-#,##0.0'
    for nm_ in ('In ECL', 'In ECL +10%', 'In ESABCC 2040'): sc[f'{C[nm_]}{r}'].fill = LIL
    sc[f'{C["ESABCC 2040: main run (input)"]}{r}'].font = BLUE
for col in [C[n_] for n_ in ('Filter: capture', 'Filter: bioenergy', 'Filter: world storage', 'Filter: world bioenergy', 'Filter: hydrogen', 'Filter: final energy', 'Risk: capture', 'Risk: bioenergy', 'Risk: land sink', '+10% filter: capture', '+10% filter: bioenergy', '+10% filter: world storage', '+10% risk: capture', '+10% risk: bioenergy')]:
    sc.conditional_formatting.add(f'{col}{r0}:{col}{rN}', FormulaRule(formula=[f'{col}{r0}="above"'], font=Font(name='Arial', size=10, bold=True, color='C00000')))
for nm_ in ('2030 rule', '2040 window 85–90%', '2040 window 90–95%', 'Net rule ECL', 'Net rule ECL +10%', 'Net rule ESABCC 2040', 'In ECL', 'In ECL +10%', 'ESABCC 2040: passes', 'In ESABCC 2040', 'Same as stored'):
    col = C[nm_]; sc.conditional_formatting.add(f'{col}{r0}:{col}{rN}', FormulaRule(formula=[f'{col}{r0}=FALSE'], font=Font(name='Arial', size=10, color='9A9A9A')))
    sc.conditional_formatting.add(f'{col}{r0}:{col}{rN}', FormulaRule(formula=[f'{col}{r0}=TRUE'], font=Font(name='Arial', size=10, bold=True, color='3B2468')))
sc.freeze_panes = f'E{r0}'; sc.auto_filter.ref = f'A4:{L(len(COLS))}{rN}'
# group labels row 3
for a_, b_, t_ in (('Net GHG 2015', 'World bioenergy 2050', 'FROM SHEET Raw (SUMIF on ID|role|year)'), ('Industry data reported', 'Final energy decline 2020–30, %', 'CALCULATED FROM THE COLUMNS TO THE LEFT'),
                   ('2030 rule', '+10% risk: bioenergy', 'RULES AND LIMITS (limits from sheet Limits)'), ('In ECL', 'ESABCC 2040: stops at', 'RESULT'), ('Stored: net GHG 2050', 'Same as stored', 'DATABASE VALUES (systems_fix.csv) FOR COMPARISON'), ('#ecl', '#step', 'HELPER'))[::1]:
    sc[f'{C[a_]}3'] = t_; sc[f'{C[a_]}3'].font = ARB
for nm_ in ('Screening', ): pass
name('ScrID', f'Screening!$A${r0}:$A${rN}')
def rng(nm_): return f'Screening!${C[nm_]}${r0}:${C[nm_]}${rN}'

# ---------------- Sets
ss = wb.create_sheet('Sets', 0)
ss['A1'] = 'Three pathway sets: members and the values behind each rule (lists update when limits on sheet Limits change)'; ss['A1'].font = Font(name='Arial', size=12, bold=True)
hdr(ss, 3, ['Set', 'Rule', 'Pathways in the database (formula)', 'EC 2040 IA scenarios added', 'In the deck'], [16, 84, 14, 14, 10])
SETS = [('ecl', 'In ECL', 'ECL-compatible, within ESABCC limits', '2040 cut in [win_lo, win_hi); EU net GHG 2050 ≤ net_ecl; all ESABCC filter limits and risk levels', 0, 3),
        ('red', 'In ECL +10%', 'ECL range, 10% tolerance margin', '2040 cut in [win_lo, win_hi); EU net GHG 2050 ≤ net_red; EU CO2 capture, EU primary bioenergy and world CO2 storage limits × (1 + tol); other limits as published', 1, 11),
        ('esabcc', 'In ESABCC 2040', 'ESABCC 2040-compatible', '2040 cut in [win3_lo, win3_hi); EU net GHG 2050 ≤ net_esabcc; all ESABCC filter limits and risk levels; main runs only (column "ESABCC 2040: main run (input)" on sheet Screening)', 1, 9)]
for i, (k, cn, nm, rule, nec, deck) in enumerate(SETS, 4):
    ss.cell(i, 1, nm).font = ARB; ss.cell(i, 2, rule + '. All sets: industry data reported, 2030 cut ≥ min_cut_2030.').font = AR; ss.cell(i, 2).alignment = WR; ss.cell(i, 1).alignment = WR
    ss.cell(i, 3, f'=COUNTIF({rng(cn)},TRUE)').font = ARB; ss.cell(i, 4, nec).font = BLUE; ss.cell(i, 5, deck).font = AR
ss['A7'] = 'ESABCC 2040: pathways that pass before the main-run selection'; ss['C7'] = f'=COUNTIF({rng("ESABCC 2040: passes")},TRUE)'; ss['A7'].font = AR; ss['C7'].font = ARB
ss['A8'] = 'Pathways with industry data (screened)'; ss['C8'] = f'=COUNTA({rng("ID")})'; ss['A8'].font = AR; ss['C8'].font = ARB
LST = ['#', 'ID', 'Database source', 'Model', 'Scenario', 'Net GHG 2050', '2030 cut, %', '2040 cut, %', 'EU CO2 capture 2050', 'EU primary bioenergy 2050', 'EU land sink 2050', 'EU hydrogen 2030', 'Final energy decline 2020–30, %', 'World CO2 storage 2050', 'World bioenergy 2050']
row = 10
for k, cn, nm, rule, nec, deck in SETS:
    ss.cell(row, 1, f'{nm}: members').font = Font(name='Arial', size=11, bold=True); row += 1
    hdr(ss, row, LST); row += 1
    for q in range(1, 13):
        ss.cell(row, 1, q).font = AR
        m = f'MATCH($A{row},{rng("#" + k)},0)'
        for j, nm_ in enumerate(LST[1:], 2):
            c = ss.cell(row, j, f'=IFERROR(INDEX({rng(nm_)},{m}),"")'); c.font = AR
            if j >= 6: c.number_format = '#,##0.0;-#,##0.0'
        row += 1
    row += 1
ss.cell(row, 1, 'EC 2040 impact assessment scenarios added to the sets (values from SWD(2024) 63, Part 3; not in sheet Raw)').font = Font(name='Arial', size=11, bold=True); row += 1
hdr(ss, row, ['Set', 'Scenario', 'Source', 'Model', 'Net GHG 2050', '2030 cut, %', '2040 cut, %', 'EU CO2 capture 2050', 'EU primary bioenergy 2050', 'EU land sink 2050', 'Note']); row += 1
EC = [('ECL range, 10% tolerance margin', 'EC 2040 IA S2', 'SWD(2024) 63 Part 3: Table 1 (net GHG), p. 18 (capture), Table 5 (land sink)', 'PRIMES', -34, 56.9, 87.5, 450, None, 332,
       'Cuts = 1 − net GHG / 4,608.5 (1990 inventory); 2030: 1,987 Mt. Capture: text "around 450 MtCO2" in 2050, total incl. e-fuels and DACC; above the 425 Mt risk level, within 467.5 Mt (+10%). No primary bioenergy figure.'),
      ('ESABCC 2040-compatible', 'EC 2040 IA LIFE', 'same', 'PRIMES', -70, 56.9, 92.3, None, None, 389, 'Capture in 2050: lower than in S1–S3, no figure (p. 18, p. 21). No primary bioenergy figure.')]
for e in EC:
    for j, v in enumerate(e, 1):
        c = ss.cell(row, j, v); c.font = BLUE if 5 <= j <= 10 else AR; c.alignment = WR if j in (3, 11) else TOP
    row += 1
for j, w in enumerate([16, 7, 11, 24, 44, 11, 9, 9, 11, 11, 10, 10, 11, 11, 11], 1): ss.column_dimensions[L(j)].width = max(ss.column_dimensions[L(j)].width or 0, w)
ss.column_dimensions['K'].width = 60

# ---------------- Limits step: every pathway that reaches the limit tests (net rule c or d, 2030 rule, 2040 window)
ls = wb.create_sheet('Limit step', 1)
ls['A1'] = 'Pathways that reach the limit tests (2030 rule and either 85–90% with net GHG 2050 ≤ net_red, or 90–95% with ≤ net_esabcc): where each one breaks'; ls['A1'].font = Font(name='Arial', size=12, bold=True)
ls['A2'] = 'above = exceeds the limit (red); ok = within; no data = the pathway does not report the variable, which counts as passed. Values on sheet Screening and Raw.'; ls['A2'].font = AR
LC = ['#', 'ID', 'Database source', 'Model', 'Scenario', 'Net GHG 2050', '2030 cut, %', '2040 cut, %', 'EU CO2 capture 2050', 'Filter: capture', 'Risk: capture', 'EU primary bioenergy 2050', 'Filter: bioenergy', 'Risk: bioenergy',
      'EU land sink 2050', 'Risk: land sink', 'World CO2 storage 2050', 'Filter: world storage', 'World bioenergy 2050', 'Filter: world bioenergy', 'EU hydrogen 2030', 'Filter: hydrogen', 'Final energy decline 2020–30, %', 'Filter: final energy',
      '+10% filter: capture', '+10% risk: capture', '+10% filter: bioenergy', '+10% risk: bioenergy', '+10% filter: world storage', 'In ECL', 'In ECL +10%', 'ESABCC 2040: passes', 'In ESABCC 2040', 'ECL: stops at', 'ECL +10%: stops at', 'ESABCC 2040: stops at']
hdr(ls, 4, LC, [5, 7, 11, 22, 40] + [10] * 32 + [30] * 3); ls.row_dimensions[4].height = 52
for k in range(1, 151):
    r = 4 + k; ls.cell(r, 1, k).font = AR; m = f'MATCH($A{r},{rng("#step")},0)'
    for j, nm_ in enumerate(LC[1:], 2):
        c = ls.cell(r, j, f'=IFERROR(INDEX({rng(nm_)},{m}),"")'); c.font = AR
        if nm_ in RAWV or 'cut' in nm_ or nm_ in ('EU land sink 2050', 'Final energy decline 2020–30, %'): c.number_format = '#,##0.0;-#,##0.0'
    for j, nm_ in enumerate(LC, 1):
        if nm_.startswith(('Filter', 'Risk', '+10%')): ls.conditional_formatting.add(f'{L(j)}{r}', FormulaRule(formula=[f'{L(j)}{r}="above"'], font=Font(name='Arial', size=10, bold=True, color='C00000')))
ls.freeze_panes = 'F5'

# ---------------- Duplicates removed
dw = wb.create_sheet('Duplicates removed')
S['k'] = [f"{m}|{a:.3f}|{b:.3f}|{c:.3f}|{d:.3f}" for m, a, b, c, d in zip(S.model, S.net50, S.i30, S.i40, S.i50)]
kept = S[~S.dup & S.det].groupby('k').head(1).set_index('k')
hdr(dw, 1, ['Removed: source', 'Model', 'Scenario', 'Same run kept as: source', 'Scenario kept', 'Net GHG 2050 (both)', 'Industry 2050, harmonised (both)'], [14, 24, 44, 14, 44, 14, 14])
for k, (i, x) in enumerate(S[S.dup].iterrows(), 2):
    kp = kept.loc[x.k] if x.k in kept.index else None
    for j, v in enumerate([x.src, x.model, x.scenario, None if kp is None else kp.src, None if kp is None else kp.scenario, round(float(x.net50), 2), round(float(x.i50), 1)], 1): dw.cell(k, j, v).font = AR
dw.freeze_panes = 'A2'


# ---------------- Sector values (as in the deck charts)
SD = json.load(open('sector_dump.json')); sv = wb.create_sheet('Sector values', 2)
sv['A1'] = 'Sector values of the set members as plotted in the deck (values, harmonised to the 2020 inventory: sector × inventory 2020 / model 2020; ecosystems shifted by a constant)'; sv['A1'].font = Font(name='Arial', size=12, bold=True)
sv['A2'] = 'Units: ' + '; '.join(f'{v[0]} {v[1]}' for v in SD['sec'].values()) + '. Empty = the pathway does not report the sector. Everything else = EU net GHG minus the six sectors.'; sv['A2'].font = AR
secs = list(SD['sec']); yrs = (2020, 2030, 2040, 2050)
hh = ['ID', 'Model', 'Scenario', 'ECL', 'ECL +10%', 'ESABCC 2040'] + [f'{SD["sec"][k][0]} {y}' for k in secs for y in yrs]
hdr(sv, 4, hh, [7, 22, 40, 7, 8, 9] + [9] * (len(hh) - 6)); sv.row_dimensions[4].height = 44
r = 5
for d in SD['rows']:
    vals = [d['id'], d['model'], d['scenario'], d['ecl'], d['red'], d['esabcc']] + [d[f'{k}_{y}'] for k in secs for y in yrs]
    for j, v in enumerate(vals, 1):
        c = sv.cell(r, j, v); c.font = AR
        if j > 6: c.number_format = '#,##0.0;-#,##0.0'
    r += 1
for s_, setn in (('S2', 'ECL +10%'), ('LIFE', 'ESABCC 2040')):
    vals = ['EC', 'PRIMES', f'EC 2040 IA {s_}', False, setn == 'ECL +10%', setn == 'ESABCC 2040'] + [None if y == 2020 or s_ not in SD['IA'].get(k, {}) else SD['IA'][k][s_][yrs.index(y) - 1] for k in secs for y in yrs]
    for j, v in enumerate(vals, 1):
        c = sv.cell(r, j, v); c.font = BLUE if j > 6 else AR
        if j > 6: c.number_format = '#,##0.0;-#,##0.0'
    r += 1
sv.cell(r, 1, 'EC rows: SWD(2024) 63 Part 3, sector values as mapped in the deck (Table 3 gross emissions by sector, Table 5 LULUCF sink and industrial removals; industry × 1.09 to the inventory scope; everything else = net total minus the six sectors).').font = AR
r += 2; sv.cell(r, 1, 'EEA greenhouse gas inventory (EU27), as plotted').font = ARB; r += 1
hdr(sv, r, ['Year', 'EU net GHG'] + [SD['sec'][k][0] for k in secs if k not in ('total', 'rest')]); r += 1
inv_r0 = r
for y in range(2005, 2025):
    vals = [y, SD['HN'][str(y)]] + [SD['H'][str(y)][k] for k in secs if k not in ('total', 'rest')]
    for j, v in enumerate(vals, 1): c = sv.cell(r, j, v); c.font = BLUE if j > 1 else AR; c.number_format = '0' if j == 1 else '#,##0.0;-#,##0.0'
    r += 1
sv.cell(r, 1, 'Sector scopes: energy supply CO2 1.A.1 + 1.B; industry GHG 1.A.2 + 2.A–2.C + 2.E + 2.H; mobility CO2 1.A.3; buildings CO2 1.A.4.a + 1.A.4.b; agri-food CH4 × 28 + N2O × 265 of sector 3; ecosystems CO2 of sector 4.').font = AR
r += 2; sv.cell(r, 1, "Member States' projections 2026 submission (EEA), EU27, summed to the same scopes, AR5 GWPs, not harmonised").font = ARB; r += 1
hdr(sv, r, ['Scenario', 'Year'] + [SD['sec'][k][0] for k in secs if k != 'rest']); r += 1
for sc_ in ('WEM', 'WAM'):
    for y in ('2024', '2030', '2040', '2050'):
        vals = [sc_, int(y)] + [SD['WW'][sc_][k][y] for k in secs if k != 'rest']
        for j, v in enumerate(vals, 1): c = sv.cell(r, j, v); c.font = BLUE if j > 2 else AR; c.number_format = '0' if j == 2 else '#,##0.0;-#,##0.0'
        r += 1
sv.cell(r, 1, 'Source file: proj2026.xlsx, sheet Gas, EU27, SubmissionYear 2026, column Gapfilled; categories as for the inventory; Total including LULUCF for EU net GHG.').font = AR
r += 2; sv.cell(r, 1, 'Trend: least-squares line through the inventory 2005–2024 (formulas on the inventory table above), read at 2030, 2040 and 2050').font = ARB; r += 1
hdr(sv, r, ['Year', 'EU net GHG'] + [SD['sec'][k][0] for k in secs if k not in ('total', 'rest')]); r += 1
inv_r1 = inv_r0 + 19
ncol = 2 + len([k for k in secs if k not in ('total', 'rest')])
for y in (2030, 2040, 2050):
    sv.cell(r, 1, y).font = AR
    for j in range(2, ncol + 1):
        cl = L(j); c = sv.cell(r, j, f'=FORECAST($A{r},{cl}${inv_r0}:{cl}${inv_r1},$A${inv_r0}:$A${inv_r1})'); c.font = AR; c.number_format = '#,##0.0;-#,##0.0'
    r += 1

sv.freeze_panes = 'D5'

# ---------------- README
rd = wb.create_sheet('README', 0)
TXT = [('Screening workbook: three pathway sets (ECL-compatible, ECL range +10%, ESABCC 2040-compatible), every value linked to the raw data', 'title'),
       ('INTERNAL USE ONLY: sheet Raw holds Scenario Compass data, which are embargoed. Do not share outside the ESABCC Secretariat.', 'h'),
       ('Built 23 Nov 2026 on the audited database used by the settings deck (setdeck2/systems_fix.csv: 1,219 pathways with EU industry data after removing duplicates). Every number on sheet Screening is a formula: values come from sheet Raw by ID, role and year; rules read their limits from sheet Limits.', ''),
       ('Sheets', 'h'),
       ('Sets: rule and number of pathways per set (formula), the members with the values behind every rule, and the two EC 2040 IA scenarios added to the sets with their sources.', ''),
       ('Sector values: the 2030, 2040 and 2050 sector values of every set member as used in the deck charts (harmonised to the 2020 inventory), and the EEA inventory 2005–2024 and Member States\' WEM/WAM projections shown in the charts.', ''),
       ('Limit step: every pathway that passes the 2030, 2040 and 2050 rules of ECL +10% or ESABCC 2040, with each limit marked above / ok / no data (also at +10%), and where each set stops. This is where pathways break.', ''),
       ('Screening: all 1,219 pathways; raw values, the calculated cuts, each rule, set membership, the step at which a pathway stops, and the value stored in the database for comparison.', ''),
       ('Raw: one row per value as published: source and platform, file in this workspace, model, scenario, region, variable, unit, value, conversion factor. Value used = value as published × factor.', ''),
       ('Limits: the inputs. Change a blue cell and all results update (e.g. tolerance 0.05 for +5%, or net_ecl 0 to drop REMIND-EU 07_NZ_CCS180_highImp at +0.3 Mt).', ''),
       ('Duplicates removed: 99 records that hold the same run twice in two databases; the copy is not screened.', ''),
       ('Roles on sheet Raw', 'h'),
       ('NET = EU net GHG incl. LULUCF (Emissions|Kyoto Gases; Schreyer et al.: Emi|GHG|LULUCF national accounting; POLIZERO: Net GHG emissions, Figure 16a). IND_E, IND_P = industry energy and process CO2. CAP = EU CO2 captured (first reported of Carbon Capture > Carbon Capture|Geological Storage > Carbon Capture|Storage > Carbon Sequestration|CCS). BIO = Primary Energy|Biomass. LAND_CO2 = Emissions|CO2|AFOLU (land sink = minus this). H2 = Secondary Energy|Hydrogen. FE = Final Energy. WCCS = world Carbon Sequestration|CCS (else Carbon Capture, else Carbon Capture|Geological Storage). WBIO = world Primary Energy|Biomass.', ''),
       ('Region: the EU region a pathway reports, in this order: European Union, European Union and United Kingdom, European Union (R9), model EU27 regions, then EU28 regions (see column Region on sheet Raw). IAM COMPACT GCAM studies without an EU-27 region: EU-12 and EU-15 summed (two rows, SUMIF adds them).', ''),
       ('Formulas', 'h'),
       ('Cut against 1990 = (1 − model value in year × inventory 2015 / model value 2015 / inventory 1990) × 100; inventory 2020 and model 2020 when the model reports no 2015 value.', ''),
       ('Final energy decline = (1 − final energy 2030 / final energy 2020) × 100. Land sink = − land-use CO2.', ''),
       ('Industry data reported: industry energy CO2 and process CO2 for 2020 and 2050, sum in 2020 above zero (POLIZERO: one Industry row).', ''),
       ('A limit excludes a pathway only if it reports the variable; no data counts as passed. Limits were pulled for every pathway that reaches the limit step; pathways stopped earlier have none.', ''),
       ('Where the workbook and the database differ (column Same as stored = FALSE); none changes a set', 'h'),
       ('16 REMIND 3.2 runs of the ESABCC 2023 advice: the database stores the Board\'s own 2040 cut, about 1.5–1.8 points lower than the formula here, and land sink (312 Mt against 368 Mt here; both within 400 Mt). The deck uses the stored cut; Limits cell esabcc_board = 1 does the same. With esabcc_board = 0 (formula), def_bioLim7p5_500 (95.8%) and flex_bioLim7p5_500 (96.4%) fall above the 90–95% window and ESABCC 2040 has 6 main runs instead of 8; ECL and ECL +10% do not change.', ''),
       ('Schreyer et al. 2024 (7 runs: 2030 and 2040 cut), Schreyer et al. 2025 (38 runs: 2030 cut) and IAM COMPACT GCAM (22 runs: 2030 and 2040 cut, differences of 0.1–0.3 points): the database computed these cuts on another base year than the 2015 rule. Here the 2015 rule is applied to all. REMIND-EU Elec_imp_Ag280 (set b): 2040 cut 89.9% stored, 89.4% here; 2030 cut 58.2% stored, 56.0% here.', ''),
       ('World CO2 storage: 9 older rows in the database used Carbon Capture|Geological Storage first; here the first reported variable of the chain above. All 9 are above 8,600 Mt either way.', ''),
       ('JRC pathways (POLES GECO 2025, POTEnCIA CETO 2025): the database uses a net-zero flag instead of the reported Kyoto 2050. Limits sheet, cell jrc_flag = 0 uses the reported values instead: GECO 2.0°C (196 Mt, 2040 cut 86.7%) and GECO Reference (229 Mt, 88.5%) then reach the limit step, but their limits were never pulled, so they would pass by default.', ''),
       ('Sources of the raw data', 'h'),
       ('IIASA scenario platforms (pulled 22 Nov 2026, anonymous read access): Scenario Compass, national Scenario Compass, NAVIGATE, ECEMF, CircEUlar, DEEDS, ESABCC scenario explorer, NGFS phases 4 and 5. Scenario Compass data are embargoed: internal use only.', ''),
       ('Files: Schreyer et al. 2025, Zenodo 10.5281/zenodo.17132530 (AllScenarioData.mif); Schreyer et al. 2024, Zenodo 10.5281/zenodo.10853459 (ScenarioData.mif); IAM COMPACT GCAM 7.0 studies 3, 6, 7, 8, 9, 14 (Zenodo, DOI per row on sheet Raw); POLIZERO, Panos et al. 2025, Zenodo 10.5281/zenodo.16759092 (res.xlsx figure tables: capture = power + industrial process + DAC; hydrogen in Mt × 0.12 EJ/Mt; final energy = four sector rows, excl. international transport; no EU bioenergy reported).', ''),
       ('Not included: the REMIND-EU ensemble of Rodrigues et al. 2026 (289 runs, excluded from the deck) and the 433 pathways added on 22 Nov 2026 evening (setdeck2/plus/systems_plus.csv).', ''),
       ('Colours: blue = input or value copied from a source; green = formula reading sheet Raw; black = formula. Red bold "above" = limit exceeded.', '')]
rd.column_dimensions['A'].width = 150
for i, (t, kind) in enumerate(TXT, 1):
    c = rd.cell(i, 1, t); c.alignment = WR
    c.font = Font(name='Arial', size=14, bold=True) if kind == 'title' else (Font(name='Arial', size=11, bold=True, color='3F6670') if kind == 'h' else AR)
wb.move_sheet('Raw', offset=len(wb.sheetnames))
wb.save('EU_pathway_screening_three_sets.xlsx'); print('saved', n, 'raw rows', len(B), 'pathways')
