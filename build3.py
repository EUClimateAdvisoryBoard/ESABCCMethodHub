# Rebuilt settings deck: four pathway sets against the EC 2040 impact assessment
import json, base64, re, os
import pandas as pd

B = open('/home/claude/tdeck/build.py').read()
CSS = re.search(r'CSS = """(.*?)"""', B, re.S).group(1).replace("font-family:Inter,'Segoe UI'", "font-family:'Segoe UI',Selawik").replace('#ec621d', '#f26119'); JS = re.search(r'JS = """(.*?)"""', B, re.S).group(1)
CSS += """
h2{font-size:52px}h2.m{font-size:42px;line-height:1.14}.lead{font-size:25px}.src{font-size:16px}
.side{flex:1;display:flex;gap:34px;min-height:0;align-items:center;margin-top:14px}.side .fig{margin-top:0}
.crit{flex:1;background:#eef3f4;border-left:6px solid #3b2468;padding:18px 22px;font-size:18px;color:#474747;align-self:center;line-height:1.35}
.crit h4{font-size:21px;color:#3b2468;margin-bottom:6px}.crit h4+table{margin-bottom:14px}.crit table{width:100%;border-collapse:collapse}
.crit td{padding:4px 0;border-bottom:1px solid #d6e2e4;font-size:18px}.crit td.v{text-align:right;font-weight:700;color:#3b2468;white-space:nowrap;padding-left:10px}
.crit td.w{text-align:right;color:#6a6a6a;white-space:nowrap;padding-left:14px;width:64px}.crit td.off{color:#f26119;font-weight:700}
.crit p{margin-top:10px}.crit p:first-child{margin-top:0}.crit p b{color:#3b2468}
table.m{border-collapse:collapse;margin-top:22px;width:100%}table.m th{background:#608c95;color:#fff;padding:10px 14px;font-size:21px;text-align:center}table.m th:first-child{text-align:left}
table.m th.d{background:#3b2468}table.m td{border-bottom:1px solid #e2e2e2;padding:8px 14px;text-align:center;color:#474747;font-size:17px}
table.m td:first-child{text-align:left;font-size:20px}table.m td b{display:block;font-size:30px;color:#3b2468;line-height:1.12}table.m td.d{background:#f1ecf8}
table.m td.off b{color:#f26119}table.m tr.sep td{border-top:3px solid #608c95}table.m td.dim{color:#6f6f6f}table.m td.dim b{color:#7d7396;font-size:27px}
table.m td.hl{background:#eef3f4}table.m td small{display:block;font-size:14px;font-weight:800;color:#3f6670;letter-spacing:.04em}
table.x{border-collapse:collapse;width:100%;margin-top:20px}table.x th{font-size:19px;color:#fff;background:#608c95;padding:8px 10px;text-align:right}table.x th:first-child{text-align:left}
table.x th.d{background:#3b2468}table.x th.e{background:#8a8a8a}table.x tr.sub th{font-size:16px;font-weight:600;padding:4px 10px;background:#7fa3ab}table.x tr.sub th.d{background:#5a4585}table.x tr.sub th.e{background:#a3a3a3}
table.x.r3 td{font-size:20px;white-space:nowrap}table.x td{font-size:25px;padding:9px 10px;text-align:right;color:#474747;border-bottom:1px solid #e2e2e2;font-variant-numeric:tabular-nums}table.x td:first-child{text-align:left;font-size:22px}
table.x td.k{font-weight:800;color:#3b2468}table.x td.d{background:#f1ecf8}table.x td.e{color:#6a6a6a;font-size:21px}table.x tr.tot td{border-bottom:3px solid #608c95;font-weight:700}
table.p{border-collapse:collapse;width:100%;margin-top:16px;font-variant-numeric:tabular-nums}table.p th{font-size:16.5px;color:#3f6670;text-align:right;padding:6px 9px;border-bottom:2px solid #608c95;line-height:1.2;vertical-align:bottom}
table.p th.l,table.p td.l{text-align:left}table.p th.c,table.p td.c{text-align:center}table.p td{font-size:19px;padding:8px 9px;text-align:right;color:#474747;border-bottom:1px solid #e6e6e6}
table.p td b{color:#2c2d2d}table.p td.risk{color:#f26119;font-weight:800}table.p td.filt{color:#a84048;font-weight:800}table.p td.k{font-weight:800;color:#3b2468}table.p td.dim0{color:#b5b5b5}table.p.xs td{font-size:15px;padding:4px 7px}table.p.xs th{font-size:14px;padding:4px 7px}
table.p tr.g td{font-weight:800;color:#3b2468;font-size:20px;border-top:2px solid #608c95}table.p tr.ia td{color:#7a7a7a}table.p tr.out td{color:#8f8f8f}table.p tr.out td b{color:#8f8f8f}table.p tr.out td.risk{color:#f26119}table.p tr.out td.filt{color:#a84048}table.p tr.out td.k{color:#6a6a6a}
table.p.sm td{font-size:16.5px;padding:5px 8px}table.p.sm th{font-size:15.5px}table.p.sm tr.g td{font-size:18px}
.key{font-size:17px;color:#474747;margin-top:12px}.key i{font-style:normal;font-weight:800}
.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;margin-top:26px}.cols div{background:#eef3f4;border-top:6px solid #608c95;padding:20px 24px}
.cols h3{font-size:24px;color:#3f6670;margin-bottom:10px}.cols p{font-size:18.5px;color:#474747;line-height:1.4;margin-top:8px}
.div{background:#608c95;color:#fff}.div h1{font-size:64px;font-weight:800;margin-top:330px}.div p{font-size:28px;margin-top:22px;max-width:1400px;line-height:1.4}
"""
img = lambda f: 'data:image/png;base64,' + base64.b64encode(open(f, 'rb').read()).decode()
ST = pd.read_csv('stages.csv'); S0 = pd.read_csv('/home/claude/setdeck2/systems_fix.csv', low_memory=False)
F2 = json.load(open('facet2.json')); P2 = json.load(open('prep2.json')); C2 = json.load(open('charts2.json')); RS = json.load(open('restsum.json')); J16 = json.load(open('set16.json'))
INS = json.load(open('insights2.json')) if os.path.exists('insights2.json') else {}
SRCN = {'Schreyer': 'Schreyer et al. 2025', 'ElecH2': 'Schreyer et al. 2024', 'SC': 'Scenario Compass', 'ESABCC': 'ESABCC 2023', 'ecemf': 'ECEMF', 'shape': 'SHAPE', 'navigate': 'NAVIGATE', 'JRC': 'JRC', 'POLIZERO': 'POLIZERO'}
f0 = lambda v, d=0: '–' if v is None else f'{v:,.{d}f}'.replace('-', '−')
def rng(lo, hi, d=0): return f0(lo, d) if lo == hi else (f'{f0(lo, d)} to {f0(hi, d)}' if lo < 0 or hi < 0 else f'{f0(lo, d)}–{f0(hi, d)}')
def scen(s):
    s = s.replace(' [Pre-Release 2023-11-14]', '').replace('SSP2021-', '').replace('Clean Energy Technology Observatory 2025 Scenario', 'CETO 2025')
    return s
def pname(i): return f"<b>{ST.at[i, 'model']}</b> {scen(ST.at[i, 'scenario'])}"
K = ['0', '150', '300', 'new']; LET = dict(zip(K, 'abcd'))
S = []   # (id, html)
def slide(sid, kicker, h2, body, lead='', src='', cls='', h2cls=''):
    S.append((sid, f'<section class="slide {cls}"><p class="kicker">{kicker}</p><h2 class="{h2cls}">{h2}</h2>' + (f'<p class="lead">{lead}</p>' if lead else '') + body + (f'<p class="src" style="margin-top:auto">{src}</p>' if src else '') + '</section>'))

# 1 the four sets
T = P2['sets']
def row(lab, fn): return f'<tr><td>{lab}</td>' + ''.join(f"<td class='{'d' if k == 'new' else ''}{' off' if k == 'new' and 'not applied' in fn(T[k], k) else ''}'>{fn(T[k], k)}</td>" for k in K) + '</tr>'
tr = row('EU net GHG in 2050', lambda o, k: '<b>≤ 0 Mt</b>' if k in ('0', 'new') else f'<b>≤ {k} Mt</b>')
tr += row('ESABCC limits on bioenergy and CO₂ capture', lambda o, k: '<b>not applied</b>' if k == 'new' else '<b>applied</b>')
tr += row('Pathways', lambda o, k: f"<b>{o['n']}</b>" + (f"{o['nfull']} report all sectors" if o['nfull'] < o['n'] else 'all report all sectors'))
tr += row('Model families', lambda o, k: f"<b>{o['fam']}</b>{o['top']}: {o['topn']} pathways" + (' each' if ' and ' in o['top'] else ''))
tr += row('2040 cut against 1990, median', lambda o, k: f"<b>{o['red']:.1f}%</b>")
tr += row('Net GHG 2050 as reported, Mt, median', lambda o, k: f"<b>{f0(o['net'])}</b>{rng(*o['netr'])}" + (f", {o['nnet']} report a value" if o['nnet'] < o['n'] else ''))
tr += row('Bioenergy 2050, EJ, median', lambda o, k: f"<b>{o['bio']}</b>{rng(*o['bior'], d=1)}, {o['nbio']} report")
tr += row('CO₂ capture 2050, Mt, median', lambda o, k: f"<b>{f0(o['cap'])}</b>{rng(*o['capr'])}, {o['ncap']} report")
th = ''.join(f"<th class='{'d' if k == 'new' else ''}' style='width:19.5%'>Set {LET[k]}</th>" for k in K)
slide('sets', 'The four sets', f"Four pathway sets: {T['0']['n']}, {T['150']['n']}, {T['300']['n']} and {T['new']['n']} pathways",
      f'<table class="m"><tr><th></th>{th}</tr>{tr}</table>',
      lead='All sets: 2030 cut of at least 55%, 2040 cut of 85–90%, ESABCC limits on hydrogen, final energy and the land sink',
      src='Small print under each number: range and number of pathways reporting. Values as the models report them; the sector slides use values harmonised to the 2020 inventory. Model families group versions, e.g. REMIND 2.1, 3.2, REMIND-EU and REMIND-MAgPIE.')

# 2 screening
lim = lambda rows: ''.join(f"<tr><td>{a}</td><td class='v'>{b}</td><td class='w{' off' if c != 'a–d' else ''}'>{c}</td></tr>" for a, b, c in rows)
CRIT = ('<div class="crit" style="flex:0 0 470px"><h4>ESABCC filter</h4><table>' + lim([('EU CO₂ capture', '500 Mt', 'a–c'), ('EU primary bioenergy', '20 EJ', 'a–c'), ('World CO₂ storage', '8,600 Mt', 'a–c'), ('World bioenergy', '240 EJ', 'a–c'), ('EU hydrogen, 2030', '1.89 EJ', 'a–d'), ('EU final energy decline 2020–30', '20%', 'a–d')])
        + '</table><h4>ESABCC risk levels</h4><table>' + lim([('EU CO₂ capture', '425 Mt', 'a–c'), ('EU primary bioenergy', '9 EJ', 'a–c'), ('EU land sink', '400 Mt', 'a–d')]) + '</table><p style="font-size:16px;color:#6a6a6a">Excluded if above; 2050 unless stated. Right column: sets the limit applies to.</p></div>')
slide('funnel', 'Screening', f"From {f0(C2['COMMON'][0][1])} pathways to {T['0']['n']}, {T['150']['n']}, {T['300']['n']} and {T['new']['n']}",
      f'<div class="side"><div class="fig"><img src="{img("f2_funnel.png")}"></div>{CRIT}</div>',
      lead=f"{f0(C2['COMMON'][0][1])} pathways with EU industry data from 14 sources; the 2030 and 2040 steps are the same for all four sets",
      src='Sources: Scenario Compass, NAVIGATE, DEEDS, ECEMF, CircEUlar, Schreyer et al. 2024 and 2025, IAMC GCAM, ESABCC 2023, SHAPE, NGFS, JRC, POLIZERO. Limits: ESABCC (2023), Tables 5 and 6. Method: slide §method§.')

# 3 the nine net-zero pathways
N9 = C2['NINE']; LIMR = {'cap50': (425, 500), 'bio50': (9, 20), 'land50': (400, None)}
def lv(i, c, d=0):
    v = C2[c][str(i)]
    if v is None: return '<td>–</td>'
    r, f = LIMR[c]; cl = 'filt' if f and v > f else ('risk' if v > r else '')
    return f"<td class='{cl}'>{f0(v, d)}</td>"
tr = ''
for i in N9:
    st = C2['stat'][str(i)]; net = C2['net50'][str(i)]; back = C2['back'][str(i)]
    tr += (f"<tr class='{'out' if st == 'x' else ''}'><td class='l'>{pname(i)}</td><td class='l'>{SRCN.get(ST.at[i, 'src'], ST.at[i, 'src'])}</td><td>{f0(net) if net is not None else 'net zero*'}</td><td>{C2['red'][str(i)]:.1f}%</td>"
           f"{lv(i, 'cap50')}{lv(i, 'bio50', 1)}{lv(i, 'land50')}<td class='c k'>{'✓' if st == 'a' else ''}</td><td class='c'>{'' if st == 'a' else ('+' + str(back) + '%' if back else 'no')}</td><td class='c k'>{'✓' if st in ('a', 'd') else ''}</td><td class='l'>{C2['rep'][str(i)]}</td></tr>")
tr += ("<tr class='g' style='white-space:nowrap'><td class='l'>ESABCC limit</td><td class='l'>ESABCC (2023), Tables 5, 6</td><td>≤ 0</td><td>85–90%</td>"
       "<td><span style='color:#f26119'>425</span> / <span style='color:#a84048'>500</span></td><td><span style='color:#f26119'>9</span> / <span style='color:#a84048'>20</span></td><td><span style='color:#f26119'>400</span></td>"
       "<td></td><td></td><td></td><td class='l' style='font-weight:400;font-size:16px'>risk level / filter</td></tr>")
n_a = sum(v == 'a' for v in C2['stat'].values()); n_d = sum(v in ('a', 'd') for v in C2['stat'].values())
slide('nine', 'Why set d', f"{len(N9)} pathways reach net zero with an 85–90% cut in 2040: {n_a} stay within all limits, {n_d} without the bioenergy and CO₂ capture limits",
      f"""<table class="p"><tr><th class="l">Pathway</th><th class="l">Source</th><th>Net GHG<br>2050, Mt</th><th>2040 cut</th><th>CO₂ capture<br>2050, Mt</th><th>Bioenergy<br>2050, EJ</th><th>Land sink<br>2050, Mt</th><th class="c">Set a</th><th class="c">In set a with<br>tolerance of</th><th class="c">Set d</th><th class="l">Reports</th></tr>{tr}</table>
<p class="key"><i style="color:#f26119">Orange</i>: above the risk level (425 Mt, 9 EJ, 400 Mt). <i style="color:#a84048">Red</i>: above the filter (500 Mt, 20 EJ). IMAGE is also above the world CO₂ storage filter (17,878 Mt against 8,600 Mt).</p>""",
      src='*JRC pathways carry a net-zero flag, no 2050 value. Tolerance: all filter limits and risk levels raised by the stated share. REMIND-EU 07_NZ_CCS350_highImp counts as 85–90% because the cut is rounded (90.2% to 90%).', h2cls='m')

# 4 the nine against the limits
slide('ninechart', 'Why set d', f"Of the {len(N9)} pathways, {C2['ncap_risk']} capture more than 425 Mt CO₂ and {C2['nbio_risk']} use more than 9 EJ of bioenergy in 2050",
      f'<div class="fig"><img src="{img("f2_nine.png")}"></div>',
      src=f"{C2['ncap_rep']} of {len(N9)} report CO₂ capture, {C2['nbio_rep']} report bioenergy. IMAGE is drawn at the axis end. EC strategy: Industrial Carbon Management Strategy, COM(2024) 62. EU bioenergy use in 2019: IEEP (2025).", h2cls='m')

# 5, 6 literature
slide('litcap', 'Literature', 'Published figures for CO₂ capture or storage in 2050 range from 247 to 2,000 Mt',
      f"""<div class="side"><div class="fig" style="flex:3.4"><img src="{img('f2_litcap.png')}"></div><div class="crit">
<p><b>Delivery so far.</b> National plans and Member State reports add up to 27–33 Mt of injection capacity per year in 2030; the target is 50 Mt (COM(2026) 252).</p>
<p><b>Project record.</b> Historical failure rate of planned CCS projects 88%; 45% in the most optimistic benchmark (Kazlou et al. 2024).</p>
<p><b>Storage space.</b> 72 Gt in the EU (JRC 2024); 262–1,520 Gt theoretical in Europe (CATF 2023).</p>
<p><b>Scope.</b> IOGP, CATF and IEEFA cover more than the EU27; the JRC figure is storage only.</p></div></div>""",
      src='Figures as published. EC 2040 IA: about 450 Mt captured in 2050 in S1, S2 and S3 (SWD(2024) 63, Part 3). Boitier et al. (2023) Joule; UCL for CCSA (2020); CATF and Element Energy (2023); IOGP Europe (2022); EU CCUS Forum (2023); IEEFA (2024, 2026); EC (2024) COM(2024) 62; JRC (2024) JRC136709.', h2cls='m')
slide('litbio', 'Literature', 'Published figures for EU biomass for energy range from 2.4 to 20 EJ',
      f"""<div class="side"><div class="fig" style="flex:3.4"><img src="{img('f2_litbio.png')}"></div><div class="crit">
<p><b>Use today.</b> 6.2 EJ in 2019 (IEEP 2025).</p>
<p><b>EC 2040 IA.</b> Domestic feedstock for bioenergy and waste: 210–230 Mtoe in 2040 (8.8–9.6 EJ) and 200–215 Mtoe in 2050 (8.4–9.0 EJ).</p>
<p><b>The 20 EJ filter</b> rests on JRC (2019) and Material Economics (2021) (ESABCC 2023, Table 5); the 9 EJ risk level on Material Economics (2021).</p>
<p><b>Newer vetting criteria</b> (IAMC 2026) set world limits only: 100 and 245 EJ.</p></div></div>""",
      src='Figures as published; Imperial College / Concawe and EC 2040 IA (SWD(2024) 63, Part 3) converted from Mtoe (× 0.041868). ENSPRESO values via Byers et al. (2023) and Schreyer et al. (2025); Material Economics via IEEP (2025). Ruiz et al. (2019); ETC (2022); Mandley et al. (2021); Wu et al. (2023).', h2cls='m')

# 7-14 the eight chart slides
NM = {'total': 'EU net GHG', 'supply': 'Energy supply', 'industry': 'Industry', 'mobility': 'Mobility', 'buildings': 'Built environment', 'agri': 'Agri-food', 'eco': 'Ecosystems', 'rest': 'Everything else'}
VAR = {'total': 'All greenhouse gases, net of removals. EC 2040 IA: gross emissions plus LULUCF and industrial removals.',
       'supply': 'CO₂ from energy supply, net of bioenergy with CCS. EC 2040 IA: power and district heating plus other energy sectors, gross; its BECCS is in everything else.',
       'industry': f"Industry GHG including process emissions. EC 2040 IA: industry energy and non-energy CO₂, scaled to the inventory (× {F2['fh']:.2f}).",
       'mobility': 'CO₂ from transport. EC 2040 IA: domestic transport.', 'buildings': 'CO₂ from residential and commercial buildings. EC 2040 IA: residential and services.',
       'agri': 'CH₄ and N₂O from agriculture, in CO₂e (CH₄ × 28, N₂O × 265). EC 2040 IA: agriculture non-CO₂ plus 10 Mt CO₂.',
       'eco': 'CO₂ from land use and forestry; negative values are a sink. EC 2040 IA: net LULUCF sink.',
       'rest': 'EU net GHG minus the six sectors: waste, F-gases, other non-CO₂, international transport and removals outside energy supply.'}
def medr(sk, yi, ks): v = [F2['R'][sk][k]['med'][yi] for k in ks]; return min(v), max(v)
ECSHOW = ('S2', 'LIFE')
def iar(sk, yi): v = [x[yi - 1] for s, x in F2['IA'][sk].items() if s in ECSHOW]; return min(v), max(v)
for sk in NM:
    a, b = medr(sk, 3, ('0', '150', '300')); d = F2['R'][sk]['new']['med'][3]; i1, i2 = iar(sk, 3)
    clip = '; '.join(f"{n} in set {l} reaches {f0(v)} Mt" for l, n, v in F2['CLIP'][sk])
    slide(f'sec_{sk}', 'Results', f"{NM[sk]} in 2050: median {rng(a, b)} Mt in sets a–c, {f0(d)} Mt in set d; EC 2040 IA {rng(i1, i2)} Mt",
          f'<div class="fig" style="margin-top:10px"><img src="{img(f"f2_{sk}.png")}"></div>',
          src=VAR[sk] + (f' Off the axis: {clip}.' if clip else '') + (' Sets b and c hold the same pathways for this sector.' if F2['R'][sk]['150']['idx'] == F2['R'][sk]['300']['idx'] else '') + ' Harmonised to the 2020 inventory; method: slide §method§.', h2cls='m')
    if sk == 'rest':
        LAB = [('waste', 'Waste'), ('fgas', 'F-gases'), ('nonco2_en', 'Non-CO₂ from energy and industry'), ('land_nonco2', 'Land-use non-CO₂ outside agriculture'), ('oth_co2', 'Other energy CO₂'), ('cdr', 'DACCS and enhanced weathering'), ('unattr', 'Not attributable'), ('rest', 'Total as reported')]
        z = lambda v: f0(0 if v is not None and round(v) == 0 else v)
        tr = ''.join(f"<tr class='{'g' if k == 'rest' else ''}'><td class='l'>{lab}</td>" + ''.join(f"<td>{z(RS[nz]['med'][f'{k}_{y}'])}</td>" for nz in ('0', '150', '300', 'new') for y in (2020, 2040, 2050)) + '</tr>' for k, lab in LAB)
        hrow = "<tr class='ia'><td class='l'>Total, harmonised (previous slide)</td>" + ''.join(f"<td>{f0(F2['R']['rest'][nz]['med'][yi])}</td>" for nz in ('0', '150', '300', 'new') for yi in (0, 2, 3)) + '</tr>'
        _t = [RS[k_]['med']['rest_2050'] for k_ in ('0', '150', '300', 'new')]
        slide('restcomp', 'Results', f"Everything else, as reported: median {rng(min(_t), max(_t))} Mt in 2050 across sets a–d; waste is the largest reported component",
              f"""<table class="p" style="margin-top:26px"><tr><th class="l" rowspan="2">Median of each component, Mt CO₂e, as reported</th>{''.join(f'<th colspan="3" class="c">Set {l_} ({RS[k_]["n"]} of {T[k_]["n"]})</th>' for k_, l_ in (('0', 'a'), ('150', 'b'), ('300', 'c'), ('new', 'd')))}</tr>
<tr>{'<th>2020</th><th>2040</th><th>2050</th>' * 4}</tr>{tr}{hrow}</table>
<p class="key">Not attributable: components a model does not report. EC 2040 IA S2, 2040 and 2050: waste 55 and 32 Mt; other non-energy 26 and 22 Mt; international transport 46 and 12 Mt; BECCS and DACCS −49 and −115 Mt.</p>""",
              src='Each row is a median over pathways, so rows do not add up to the total. Reduced sets: set c without the two PRIMES 2022 runs (agriculture and land use reported as zero); set d without POTEnCIA and POLES GECO (industry only), JRC-EU-TIMES (industry and total only), GCAM-PR and POLES ELEVATE (no breakdown of the remainder). The remaining pathways of c and d are those of b and a. CH₄ × 28, N₂O × 265.', h2cls='m')

# overview matrix
def cell(sk, k, yi, cls=''):
    n_, N_ = F2['R'][sk][k]['n'], T[k]['n']
    return f"<td class='{cls}{' d' if k == 'new' else ''}'>{f0(F2['R'][sk][k]['med'][yi])}" + (f"<span style='font-size:13px;color:#8a8a8a;font-weight:400'> ({n_})</span>" if (n_ < N_ and yi == 3) else '') + "</td>"
tr = ''
for sk in NM:
    tr += f"<tr class='{'tot' if sk == 'total' else ''}'><td>{NM[sk]}</td>" + ''.join(cell(sk, k, 2) + cell(sk, k, 3, 'k') for k in K) + f"<td class='e'>{rng(*iar(sk, 2))}</td><td class='e'>{rng(*iar(sk, 3))}</td></tr>"
th1 = ''.join(f"<th colspan='2' class='{'d' if k == 'new' else ''}' style='text-align:center'>Set {LET[k]} ({T[k]['n']} pathways)</th>" for k in K)
th2 = ''.join(f"<th class='{'d' if k == 'new' else ''}'>2040</th><th class='{'d' if k == 'new' else ''}'>2050</th>" for k in K)
ind = [F2['R']['industry'][k]['med'][3] for k in K]; bui = [F2['R']['buildings'][k]['med'][3] for k in K]
slide('matrix', 'Results', f"2050 medians: industry {rng(min(ind[:3]), max(ind[:3]))} Mt in sets a–c and {f0(ind[3])} Mt in set d; built environment {rng(min(bui[:3]), max(bui[:3]))} Mt and {f0(bui[3])} Mt",
      f'<table class="x"><tr><th rowspan="2">Median, Mt CO₂e</th>{th1}</tr><tr class="sub">{th2}</tr>{tr}</table>',
      src='Each row uses the pathways of the set that report that sector; in brackets: number of pathways where fewer than the whole set (reasons on the chart slides). Harmonised to the 2020 inventory. Each median comes from a different pathway, so sector medians do not add up to the total. EC 2040 IA: lowest and highest of S1, S2, S3 and LIFE.', h2cls='m')

# insight slides (filled from insights2.json by insights2.py)
exec(open('insight_slides3.py').read()) if os.path.exists('insight_slides.py') else None

# method
slide('method', 'Method', 'How the numbers are made',
      """<div class="cols"><div><h3>Screening</h3><p>2030 and 2040 cuts: EU net GHG against 1990, scaled to the inventory. A pathway without a 2030 value passes the 2030 rule; one without a 2040 value is dropped. For the 16 REMIND 3.2 runs of the ESABCC 2023 advice, the Board's own 2040 cut is used.</p><p>A run held in two databases is counted once.</p><p>Net GHG in 2050 as the model reports it. JRC pathways carry a net-zero flag instead of a value.</p><p>ESABCC filter and risk levels checked for every pathway that reaches that step; in ECL +10%, the EU CO₂ capture, EU primary bioenergy and world CO₂ storage limits are raised by 10%. A limit only excludes a pathway that reports the variable.</p><p>The REMIND-EU ensemble of 289 runs (Rodrigues et al. 2026) is not included.</p></div>
<div><h3>Sector values</h3><p>Each sector chart uses every pathway of the set that reports that sector; the chart names the pathways that do not and why. Everything else needs all six sectors and the total.</p><p>Every sector and the total are harmonised to the 2020 inventory: scaled by inventory 2020 over model 2020; ecosystems shifted by a constant. This removes the difference between EU27 and EU27 + UK.</p><p>Lines on the charts: EEA greenhouse gas inventory 2005–2024; Member States' WEM and WAM projections (2026 submission), summed to the same inventory categories, not harmonised; trend = least-squares line through the inventory 2005–2024.</p></div>
<div><h3>EC 2040 impact assessment</h3><p>SWD(2024) 63, Part 3: S2 is counted in ECL +10% and LIFE in ESABCC 2040; S1 (77% cut) and S3 (capture of about 450 Mt above the 425 Mt risk level) are in no set.</p><p>Sector values: gross emissions by sector from Table 3, the LULUCF sink and industrial removals from Table 5. Industry is scaled to the 2015 inventory, like the pathways. Everything else is the net total minus the six sectors.</p><p>All values and rules: Excel file EU_pathway_screening_three_sets.xlsx.</p></div></div>""")

# backup
slide('div', '', '', '<h1>Backup</h1><p>Method details, full data of the three sets, literature on the bioenergy and CO₂ capture limits, scenario sets not in the database</p>', cls='div')
G = P2['grid']; rows = ''
for nz in ('0', '150', '300'):
    for i, w in enumerate(('85–90%', '85–95%')):
        tds = ''
        for m in (0, 10, 20, 30):
            g = G[f'{nz}|{w}|{m}']; tag = ''
            tds += f"<td class='{'hl' if m == 0 else 'dim'}'>{tag}<b>{g['n']}</b>{g['red']:.1f}%, {f0(g['net'])} Mt</td>"
        rows += f"<tr class='{'sep' if i == 0 and nz != '0' else ''}'><td>Net GHG ≤ {nz} Mt, 2040 cut {w}</td>{tds}</tr>"
gn = [g['n'] for g in G.values()]
slide('grid', 'Backup', f"{min(gn)} to {max(gn)} pathways pass, depending on the 2050 rule, the 2040 window and the tolerance",
      f'<table class="m"><tr><th rowspan="2" style="vertical-align:bottom">2050 rule and 2040 window</th><th colspan="4" style="border-bottom:1px solid #9fbcc2">All ESABCC filter limits and risk levels raised by</th></tr><tr><th style="text-align:center">0%</th><th>10%</th><th>20%</th><th>30%</th></tr>{rows}</table>',
      lead='Big number: pathways. Below: median 2040 cut and median net GHG in 2050, as reported',
      src='All cells include the 2030 rule. Set d is not part of this grid.', h2cls='m')
KS = ['total', 'supply', 'industry', 'mobility', 'buildings', 'agri', 'eco', 'rest']
c16 = lambda v, b=False: f"<td class='{'k' if b else ''}'>{f0(v)}</td>"
tr = ''.join(f"<tr><td class='l'><b>{r['model']}</b> {scen(r['scenario'])}</td><td class='l'>{SRCN.get(r['src'], r['src'])}</td>{c16(r['t40'])}{c16(r['total'], True)}{''.join(c16(r[k]) for k in KS[1:])}</tr>" for r in J16['rows'])
m = J16['med']; tr += f"<tr class='g'><td class='l'>Median</td><td></td>{c16(m['t40'])}{c16(m['total'])}{''.join(c16(m[k]) for k in KS[1:])}</tr>"
tr += ''.join(f"<tr class='ia'><td class='l'>EC 2040 IA {s}</td><td class='l'>SWD(2024) 63</td>{c16(v['t40'])}{c16(v['total'])}{''.join(c16(v[k]) for k in KS[1:])}</tr>" for s, v in J16['ia'].items())
hd = ''.join(f'<th>{h}</th>' for h in ('Net GHG<br>2040', 'Net GHG<br>2050', 'Energy<br>supply', 'Industry', 'Mobility', 'Built<br>environment', 'Agri-<br>food', 'Eco-<br>systems', 'Everything<br>else'))
fams = T['150']['fams']
slide('setb', 'Backup', f"Set b: all {J16['n']} pathways are REMIND runs; net GHG in 2050 from {f0(J16['rows'][0]['total'])} to {f0(J16['rows'][-1]['total'])} Mt",
      f'<table class="p sm"><tr><th class="l">Pathway</th><th class="l">Source</th>{hd}</tr>{tr}</table>',
      src='Mt CO₂e in 2050 unless stated, harmonised to the 2020 inventory, sorted by net GHG in 2050.', h2cls='m')
exec(re.search(r"ROWS = \[.*?\]\n", open('build_fac.py').read(), re.S).group(0))
ROWS = [r for r in ROWS if not r[0].startswith('EC 2040 impact assessment')]
tr = ''.join(f"<tr><td class='l'><b>{a.split(' (')[0] if False else a}</b></td><td class='l'>{b_}</td><td>{c}</td><td>{d}</td><td>{e}</td><td>{f_}</td><td class='l'>{g}</td></tr>" for a, b_, c, d, e, f_, g in ROWS)
slide('other', 'Backup', f'{len(ROWS)} EU scenario sets that are not in the database',
      f'<table class="p sm" style="margin-top:22px"><tr><th class="l">Set</th><th class="l">Published</th><th>Scenarios</th><th>2030</th><th>2040</th><th>2050</th><th class="l">Data and use here</th></tr>{tr}</table>',
      lead='Net GHG as each publisher reports it: cut against 1990, or Mt where no percentage is given',
      src='Scopes differ: international transport, LULUCF treatment, EU27 or EU27 + UK. TYNDP 2040 value from the négaWatt (2024) comparison. EEA WAM: 8th EAP indicator 2025.', h2cls='m')


# ================= three-set version (23 Nov) =================
S3 = pd.read_csv('sets3.csv', index_col=0); F3 = json.load(open('facet3.json')); FN3 = json.load(open('funnel3.json'))
from names2 import fam
COL3 = {'s1': '#608c95', 's2': '#b04545', 's3': '#2e422f'}; NAME3 = {'s1': 'ECL-compatible, within ESABCC limits', 's2': 'ECL range, 10% tolerance margin', 's3': 'ESABCC 2040-compatible'}
RULE3 = {'s1': ('85–90%', 'all ESABCC limits', '≤ 0 Mt'), 's2': ('85–90%', 'bioenergy and CO₂ capture limits +10%', '≤ 50 Mt'), 's3': ('90–95%', 'all ESABCC limits', '≤ 0 Mt')}
mem = {k: [int(i) for i in S3.index[S3[k]]] for k in ('s1', 's2', 's3')}
X3 = S0 if 'S0' in dir() else pd.read_csv('/home/claude/setdeck2/systems_fix.csv', low_memory=False)
def r_(vals, d=0): vals = [v for v in vals if pd.notna(v)]; return '–' if not vals else rng(round(min(vals), d), round(max(vals), d), d)
ECP = {'s2': [dict(model='PRIMES', name='EC 2040 IA S2', red=87.5, net=-34, cap=450)], 's3': [dict(model='PRIMES', name='EC 2040 IA LIFE', red=92.3, net=-70, cap=float('nan'))], 's1': []}
NMEM = {k: len(mem[k]) + len(ECP[k]) for k in mem}
from collections import Counter
FAMS = lambda k: dict(Counter(list(ST.loc[mem[k], 'model'].map(fam)) + [e['model'] for e in ECP[k]]))
EV = lambda k, c: [e[c] for e in ECP[k]]
NONA = lambda s: int(pd.Series(s).notna().sum())
tr = ''
rows3 = [('2040 cut against 1990', lambda k: f"<b>{RULE3[k][0]}</b>"), ('ESABCC limits', lambda k: f"<b>{'all; bioenergy and CO₂ capture +10%' if k == 's2' else 'all'}</b>"),
         ('EU net GHG 2050', lambda k: f"<b>{RULE3[k][2]}</b>"), ('Pathways', lambda k: f"<b>{NMEM[k]}</b>" + (f'of which {len(mem["s1"])} also in ECL-compatible' if k == 's2' else ('8 main runs of 23 that pass, and EC 2040 IA LIFE' if k == 's3' else ''))),
         ('Model families', lambda k: (lambda fm: f"<b>{len(fm)}</b>" + ', '.join(f'{a} {c}' for a, c in fm.items()))(FAMS(k))),
         ('2040 cut, range', lambda k: f"<b>{r_(list(ST.loc[mem[k], 'red']) + EV(k, 'red'), 1)}%</b>"), ('Net GHG 2050 as reported, Mt', lambda k: f"<b>{r_(list(X3.loc[mem[k], 'net50']) + EV(k, 'net'))}</b>" + (f"{int(X3.loc[mem[k], 'net50'].isna().sum())} JRC pathway: net-zero flag, no value" if X3.loc[mem[k], 'net50'].isna().any() else '')),
         ('CO₂ capture 2050, Mt', lambda k: f"<b>{r_(list(X3.loc[mem[k], 'cap50']) + EV(k, 'cap'))}</b>{NONA(list(X3.loc[mem[k], 'cap50']) + EV(k, 'cap'))} report"), ('Bioenergy 2050, EJ', lambda k: f"<b>{r_(X3.loc[mem[k], 'bio50'], 1)}</b>{int(X3.loc[mem[k], 'bio50'].notna().sum())} report")]
for lab, fn in rows3: tr += f"<tr><td>{lab}</td>" + ''.join(f"<td>{fn(k)}</td>" for k in ('s1', 's2', 's3')) + '</tr>'
th = ''.join(f"<th style='width:26%;background:{COL3[k]}'>{NAME3[k]}</th>" for k in ('s1', 's2', 's3'))
slide('sets3', 'Three pathway sets', f"Three pathway sets: {NMEM['s1']}, {NMEM['s2']} and {NMEM['s3']} pathways", f'<table class="m"><tr><th></th>{th}</tr>{tr}</table>',
      lead='All sets: 2030 cut of at least 55%, EU industry data, ESABCC limits on hydrogen, final energy and the land sink',
      src='Small print: range or number of pathways reporting. Values as the models report them; the 2040 cut is scaled to the inventory. ECL +10% includes EC 2040 IA S2, ESABCC 2040 EC 2040 IA LIFE: SWD(2024) 63, Part 3; 2040 cut calculated from Table 1; capture “around 450 MtCO2” in 2050 (p. 18), none given for LIFE; no primary bioenergy figure. Model families group versions, e.g. REMIND 2.1, 3.2 and REMIND-EU. The REMIND-EU ensemble of Rodrigues et al. 2026 is not included.')
slide('funnel3', 'Screening', f"From {FN3['common'][0]:,} pathways to {FN3['sets']['s1'][-1]}, {FN3['sets']['s2'][-1]} and {FN3['sets']['s3'][-1]} in the three sets",
      f'<div class="side"><div class="fig"><img src="{img("f3_funnel.png")}"></div>{CRIT.replace("a–c", "ECL, ESABCC 2040").replace("a–d", "all")}</div>',
      lead=f"{FN3['common'][0]:,} pathways with EU industry data from 14 sources; {FN3['common'][1]} meet the 2030 rule", src='Limits: ESABCC (2023), Tables 5 and 6. Method: slide §method§. The following slides add EC 2040 IA S2 to red and EC 2040 IA LIFE to green.')
NZH = " style='background:#fde9a9;font-weight:800'"
def mrow(i, k):
    x = X3.loc[i]; st = ST.loc[i]
    lv = lambda v, r, f_, d=0: '<td>–</td>' if pd.isna(v) else f"<td class='{'filt' if f_ and v > f_ else ('risk' if r and v > r else '')}'>{f0(v, d)}</td>"
    tags = ''.join(f"<span style='display:inline-block;width:13px;height:13px;border-radius:7px;background:{COL3[s]};margin-right:3px'></span>" for s in ('s1', 's2', 's3') if S3.at[i, s])
    rep = 'all sectors' if pd.notna(st.get('supply_2050')) and pd.notna(st.get('agri_2050')) else ('industry and total' if pd.notna(st.get('tot_2050')) else 'industry only')
    return (f"<tr><td class='c'>{tags}</td><td class='l'><b>{x.model}</b> {scen(x.scenario)}</td><td class='l'>{SRCN.get(x.src, x.src)}</td><td>{'–' if pd.isna(st.red30) else f'{st.red30:.1f}%'}</td><td>{st.red:.1f}%</td>"
            f"<td>{'net zero*' if pd.isna(x.net50) else f0(x.net50)}</td>{lv(x.cap50, 425, 500)}{lv(x.bio50, 9, 20, 1)}{lv(x.land50, 400, None)}<td class='l'>{rep}</td></tr>")
HD = '<tr><th class="c">Set</th><th class="l">Pathway</th><th class="l">Source</th><th>2030 cut</th><th>2040 cut</th><th>Net GHG<br>2050, Mt</th><th>CO₂ capture<br>2050, Mt</th><th>Bioenergy<br>2050, EJ</th><th>Land sink<br>2050, Mt</th><th class="l">Reports</th></tr>'
LIMROW = "<tr class='g' style='white-space:nowrap'><td></td><td class='l'>ESABCC limit</td><td class='l'>Tables 5, 6</td><td>≥ 55%</td><td></td><td>≤ 0</td><td><span style='color:#f26119'>425</span> / <span style='color:#a84048'>500</span></td><td><span style='color:#f26119'>9</span> / <span style='color:#a84048'>20</span></td><td><span style='color:#f26119'>400</span></td><td class='l' style='font-weight:400;font-size:15px'>risk level / filter</td></tr>"
ECD = lambda c: f"<span style='display:inline-block;width:13px;height:13px;background:{c};border-radius:7px;margin:0 1px'></span>"
ECTAG = {'S2': ECD('#b04545'), 'LIFE': ECD('#2e422f')}
ORG = " style='color:#f26119;font-weight:600'"
ECROWS = lambda keep: ''.join(f"<tr><td class='c'>{ECTAG[s]}</td><td class='l'><b>PRIMES</b> EC 2040 IA {s}</td><td class='l'>EC 2024, SWD(2024) 63</td><td>{c30}</td><td>{c40}</td><td>{f0(n)}</td><td{ORG if '450' in cp else ''}>{cp}</td><td>–</td><td>{f0(ls)}</td><td class='l'>all sectors</td></tr>"
                 for s, c30, c40, n, cp, ls in (('S2', '56.9%', '87.5%', -34, '≈ 450', 332), ('LIFE', '56.9%', '92.3%', -70, '–', 389)) if s in keep)
o12 = sorted(set(mem['s1']) | set(mem['s2']), key=lambda i: (not S3.at[i, 's1'], X3.at[i, 'model'], X3.at[i, 'scenario']))
slide('mem12', 'Pathways', f"ECL-compatible: {len(mem['s1'])} pathways within all limits and net zero in 2050; ECL range: {NMEM['s2']} with 10% tolerance on bioenergy and CO₂ capture, up to 50 Mt in 2050",
      f'<table class="p sm">{HD}{"".join(mrow(i, "s2") for i in o12)}{ECROWS(("S2",))}{LIMROW}</table><p class="key"><i style="color:#f26119">Orange</i>: above the risk level. <i style="color:#a84048">Red</i>: above the filter. ECL range: bioenergy and CO₂ capture limits +10% (risk levels 467.5 Mt and 9.9 EJ; filters 550 Mt, 22 EJ, world storage 9,460 Mt).</p>',
      src='*JRC pathways carry a net-zero flag, no 2050 value. 2040 cut scaled to the inventory, rounded to whole percent for the window. EC 2040 IA S2: SWD(2024) 63 Part 3, cuts calculated from Table 1, capture “around 450 MtCO2” (p. 18), no primary bioenergy figure.', h2cls='m')
o3 = sorted(mem['s3'], key=lambda i: (X3.at[i, 'model'], X3.at[i, 'scenario']))
slide('mem3', 'Pathways', f"ESABCC 2040-compatible: {NMEM['s3']} pathways, 90–95% cut by 2040, within all limits",
      f'<table class="p sm">{HD}{"".join(mrow(i, "s3") for i in o3)}{ECROWS(("LIFE",))}{LIMROW}</table>',
      src='EC 2040 IA LIFE: SWD(2024) 63 Part 3; no 2050 capture or primary bioenergy figure. 23 REMIND runs pass; shown: the 6 ESABCC 2023 advice runs and the 2 Schreyer et al. 2025 main runs (CO₂ storage limits 180 and 350 Mt). Left out: 15 Schreyer et al. sensitivity variants of these (high bioenergy, cheap DAC, H₂ imports, adjustment, high capture rate, no imports, 370 Mt land sink); all 23 with every screening value in the appendix. 2040 cut scaled to the inventory.', h2cls='m')
SETLAB = {'s1': 'ECL', 's2': 'ECL +10%', 's3': 'ESABCC 2040'}
for sk in NM:
    O = F3['OUT'][sk]
    r50 = {k: (min(O[k]['vals']['2050']), max(O[k]['vals']['2050'])) for k in ('s1', 's2', 's3') if O[k]['vals']['2050']}
    ia = iar(sk, 3)
    hl = f"{NM[sk]} in 2050: " + ', '.join(f"{SETLAB[k]} {rng(*v)}" for k, v in r50.items()) + ' Mt'
    clip = '; '.join(f"{n} ({SETLAB[k]}) reaches {f0(v)} Mt in {y}" for k, n, y, v in O['clip'])
    slide(f's3_{sk}', 'Results', hl, f'<div class="fig" style="margin-top:6px"><img src="{img(f"f3_{sk}.png")}"></div>',
          src=VAR[sk] + (f' Off the axis: {clip}.' if clip else '') + ' Each dot is one pathway, one column per set; ECL pathways are also in ECL +10%. ECL +10% includes EC 2040 IA S2, ESABCC 2040 EC 2040 IA LIFE. Light line: median of each set. Trend: least-squares line through the EEA inventory 2005–2024, read at 2040 and 2050 (calculated).' + (' WEM/WAM: Member States’ projections 2026 (EEA), EU27, summed to the same categories and gases (AR5 GWPs), as reported, not harmonised.' if sk != 'rest' else '') + ' Harmonised to the 2020 inventory; method: slide §method§.', h2cls='m')

EC_ = [('S1', 77.2, -46, '≈ 450', 341, '9.0'), ('S2', 87.5, -34, '≈ 450', 332, '8.4–9.0'), ('S3', 92.3, -38, '≈ 450', 333, '8.4'), ('LIFE', 92.3, -70, 'below S1–S3, no figure', 389, '8.4–9.0')]
C40 = {'S2': 222, 'S3': 344, 'LIFE': 278}; PLC = {'S2': 'red', 'S3': 'none: 2050 capture above 425 Mt', 'LIFE': 'green'}
tr = ''.join(f"<tr><td class='l'><b>EC 2040 IA {s}</b></td><td>{c:.1f}%</td><td>{f0(n)}</td><td>{C40[s]}</td><td class='{'risk' if '450' in cp else ''}'>{cp}</td><td>{bf}*</td><td>{f0(ls)}</td><td class='l'>{PLC[s]}</td></tr>" for s, c, n, cp, ls, bf in EC_ if s != 'S1')
tr += "<tr class='g' style='white-space:nowrap'><td class='l'>ESABCC limit (risk level / filter)</td><td>85–90% or 90–95%</td><td>≤ 0 (red ≤ 50)</td><td>–</td><td><span style='color:#f26119'>425</span> / <span style='color:#a84048'>500</span><br><span style='font-size:15px'>red: 467.5 / 550</span></td><td><span style='color:#f26119'>9</span> / <span style='color:#a84048'>20</span></td><td><span style='color:#f26119'>400</span></td><td></td></tr>"
slide('ecchk', 'EC 2040 impact assessment', 'EC 2040 IA against the ESABCC limits: S2 and S3 capture about 450 Mt in 2050, above the 425 Mt risk level',
      f"""<table class="p" style="margin-top:30px"><tr><th class="l">Scenario</th><th>2040 cut<br>against 1990</th><th>Net GHG<br>2050, Mt</th><th>CO₂ captured<br>2040, Mt</th><th>CO₂ captured<br>2050, Mt</th><th>Bioenergy feedstock<br>2050, EJ</th><th>Land sink<br>2050, Mt</th><th class='l'>Shown in set</th></tr>{tr}</table>
<p class="key" style="font-size:19px;margin-top:22px">Placed by 2040 cut, net GHG 2050 and CO₂ capture. S2 (87.5%) is in red: about 450 Mt of capture is above the 425 Mt risk level of black but within red's 10% tolerance (467.5 Mt). S3 (92.3%) captures about 450 Mt, above the 425 Mt risk level of green, and is in no set. LIFE (92.3%) is in green; the IA gives no 2050 capture figure for LIFE, only that it is lower than in S1–S3. S1 (77.2%) is outside both windows and not shown.</p>""",
      src='SWD(2024) 63, Part 3. 2040 cut calculated from Table 1 net GHG against the 1990 inventory (4,609 Mt). Capture: PRIMES, incl. capture for e-fuels and DACC; 2040 from Figure 11 (flow of captured carbon); 2050 from the text ("converges in 2050 to around 450 MtCO2 in S1, S2 and S3"; LIFE lower, no figure). *Total domestic feedstock for bioenergy and waste incl. manure, 200 Mtoe (S3) to 215 Mtoe (S1), converted × 0.041868; not primary energy, imports excluded. Land sink: Table 5 net LULUCF removals.', h2cls='m')

# ranges table 2040 / 2050
def cr(sk, k, y):
    v = F3['OUT'][sk][k]['vals'][y]; n_ = F3['OUT'][sk][k]['n']; N_ = F3['OUT'][sk][k]['N']
    return f"<td>{rng(min(v), max(v)) if v else '–'}" + (f"<span style='font-size:13px;color:#8a8a8a'> ({n_})</span>" if n_ < N_ and y == '2050' else '') + '</td>'
for _id, SKR in (('ranges3', ('total', 'industry')), ('ranges3b', tuple(NM))):
    tr = ''.join(f"<tr class='{'tot' if sk == 'total' else ''}'><td>{NM[sk]}</td>" + ''.join(cr(sk, k, y) for k in ('s1', 's2', 's3') for y in ('2040', '2050')) + '</tr>' for sk in SKR)
    th1 = ''.join(f"<th colspan='2' style='text-align:center;background:{COL3[k]}'>{NAME3[k]} ({NMEM[k]})</th>" for k in ('s1', 's2', 's3'))
    th2 = ''.join("<th>2040</th><th>2050</th>" for k in ('s1', 's2', 's3'))
    slide(_id, 'Results', 'Lowest to highest pathway by sector, 2040 and 2050', f'<table class="x r3"><tr><th rowspan="2">Mt CO₂e, lowest to highest</th>{th1}</tr><tr class="sub">{th2}</tr>{tr}</table>',
          src='Pathways of each set that report the sector; in brackets: number of pathways where fewer than the whole set (reasons on the chart slides). Harmonised to the 2020 inventory. ECL +10% includes EC 2040 IA S2, ESABCC 2040 EC 2040 IA LIFE.', h2cls='m')


# ================= appendix: full set tables =================
DOT = lambda k: f"<span style='display:inline-block;width:12px;height:12px;border-radius:6px;background:{COL3[k]};margin-right:2px'></span>"
def lc(v, r=None, f_=None, d=0, rt=None, ft=None):
    if v is None or pd.isna(v): return '<td>–</td>'
    r_, f2 = (rt or r), (ft or f_)
    cl = 'filt' if f2 and v > f2 else ('risk' if r_ and v > r_ else '')
    return f"<td class='{cl}'>{f0(v, d)}</td>"
FHD = ('<tr><th class="c">Set</th><th class="l">Pathway</th><th class="l">Source</th><th>2030<br>cut</th><th>2040<br>cut</th><th>Net GHG<br>2050, Mt</th><th>EU CO₂<br>capture, Mt</th><th>EU primary<br>bioenergy, EJ</th>'
       '<th>EU land<br>sink, Mt</th><th>World CO₂<br>storage, Mt</th><th>World bio-<br>energy, EJ</th><th>EU H₂<br>2030, EJ</th><th>Final energy<br>decline 20–30</th>{extra}</tr>')
def frow(i, red=False, extra=''):
    x = X3.loc[i]; st = ST.loc[i]
    tags = ''.join(DOT(s) for s in ('s1', 's2', 's3') if S3.at[i, s])
    tl = (lambda base: base * 1.1) if red else (lambda base: base)
    return (f"<tr><td class='c'>{tags}</td><td class='l'><b>{x.model}</b> {scen(x.scenario)}</td><td class='l'>{SRCN.get(x.src, x.src)}</td><td>{'–' if pd.isna(st.red30) else f'{st.red30:.1f}%'}</td><td>{st.red:.1f}%</td>"
            f"<td>{'net zero*' if pd.isna(x.net50) else f0(x.net50)}</td>{lc(x.cap50, tl(425), tl(500))}{lc(x.bio50, tl(9), tl(20), 1)}{lc(x.land50, 400)}{lc(x.wccs50, None, tl(8600))}{lc(x.wbio50, None, 240)}{lc(x.h2_30, None, 1.89, 2)}"
            f"<td{' class=filt' if pd.notna(x.fe_decl) and x.fe_decl > 20 else ''}>{'–' if pd.isna(x.fe_decl) else f'{x.fe_decl:.1f}%'}</td>{extra}</tr>")
def ecrow(nm, k, c40, net, cap, land, extra=''):
    return (f"<tr><td class='c'>{DOT(k)}</td><td class='l'><b>PRIMES</b> {nm}</td><td class='l'>EC 2024, SWD(2024) 63</td><td>56.9%</td><td>{c40}</td><td>{f0(net)}</td>"
            f"<td{' class=risk' if cap == '≈ 450' and k != 's2' else ''}>{cap}</td><td>–</td><td>{f0(land)}</td><td>–</td><td>–</td><td>–</td><td>–</td>{extra}</tr>")
def limrow(red=False, extra=''):
    m = 1.1 if red else 1
    return (f"<tr class='g' style='white-space:nowrap'><td></td><td class='l'>ESABCC limit{' +10%' if red else ''}</td><td class='l'>risk level / filter</td><td>≥ 55%</td><td>{'85–90%' if extra == '' or red else '90–95%'}</td><td>{'≤ 50' if red else '≤ 0'}</td>"
            f"<td><span style='color:#f26119'>{f0(425 * m, 1 if red else 0)}</span> / <span style='color:#a84048'>{f0(500 * m)}</span></td><td><span style='color:#f26119'>{9 * m:g}</span> / <span style='color:#a84048'>{20 * m:g}</span></td>"
            f"<td><span style='color:#f26119'>400</span></td><td><span style='color:#a84048'>{f0(8600 * m)}</span></td><td><span style='color:#a84048'>240</span></td><td><span style='color:#a84048'>1.89</span></td><td><span style='color:#a84048'>20%</span></td>{extra}</tr>")
KEYF = '<p class="key"><i style="color:#f26119">Orange</i>: above the risk level. <i style="color:#a84048">Red</i>: above the filter. – : not reported (a limit only removes a pathway that reports the variable). Values as stored in the screening database; cuts scaled to the inventory.</p>'
ids1 = sorted(mem['s1'], key=lambda i: (X3.at[i, 'model'], X3.at[i, 'scenario']))
slide('full1', 'Backup: set data', f"ECL-compatible, within ESABCC limits: all {NMEM['s1']} pathways and every screening value",
      f'<table class="p sm">{FHD.format(extra="")}{"".join(frow(i) for i in ids1)}{limrow()}</table>{KEYF}',
      src='2040 cut 85–90%, EU net GHG 2050 at or below zero, all ESABCC filter limits and risk levels. ESABCC (2023), Tables 5 and 6. Hydrogen and final energy: 2030; all other limits: 2050.', h2cls='m')
ids2 = sorted(mem['s2'], key=lambda i: (not S3.at[i, 's1'], X3.at[i, 'model'], X3.at[i, 'scenario']))
slide('full2', 'Backup: set data', f"ECL range, 10% tolerance margin: all {NMEM['s2']} pathways and every screening value",
      f'<table class="p sm">{FHD.format(extra="")}{"".join(frow(i, red=True) for i in ids2)}{ecrow("EC 2040 IA S2", "s2", "87.5%", -34, "≈ 450", 332)}{limrow(red=True)}</table>{KEYF.replace("risk level.", "risk level +10%.").replace("the filter.", "the filter +10%.")}',
      src='2040 cut 85–90%, EU net GHG 2050 at most 50 Mt, EU CO₂ capture, EU primary bioenergy and world CO₂ storage limits +10%, other limits as published. *JRC pathways carry a net-zero flag instead of a 2050 value. EC 2040 IA S2: SWD(2024) 63 Part 3 (cuts from Table 1, capture “around 450 MtCO2” p. 18, land sink Table 5); no primary bioenergy, world or 2030 hydrogen figures.', h2cls='m')
ids3 = sorted(set(int(i) for i in S3.index[S3.s3_all]), key=lambda i: (not S3.at[i, 's3'], X3.at[i, 'model'], X3.at[i, 'scenario']))
MR = lambda i: f"<td class='c'>{'✓' if S3.at[i, 's3'] else ''}</td>"
slide('full3', 'Backup: set data', f"ESABCC 2040-compatible: {len(ids3)} pathways pass, {NMEM['s3']} are shown (8 main runs and EC 2040 IA LIFE)",
      f'<table class="p xs">{FHD.format(extra="<th class=c>Main<br>run</th>")}{"".join(frow(i, extra=MR(i)) for i in ids3)}{ecrow("EC 2040 IA LIFE", "s3", "92.3%", -70, "–", 389, extra="<td class=c>✓</td>")}{limrow(extra="<td></td>")}</table>{KEYF}',
      src='2040 cut 90–95%, EU net GHG 2050 at or below zero, all ESABCC filter limits and risk levels. Not shown in the charts: 15 Schreyer et al. 2025 sensitivity variants of the main runs (no tick). REMIND 3.2: the 2040 cut is the Board’s own value stored in the database. EC 2040 IA LIFE: SWD(2024) 63 Part 3; no 2050 capture figure (lower than S1–S3).', h2cls='m')
# sector values 2050
allids = sorted(set(mem['s1']) | set(mem['s2']) | set(mem['s3']), key=lambda i: (not S3.at[i, 's1'], not S3.at[i, 's2'], X3.at[i, 'model'], X3.at[i, 'scenario']))
SDJ = {r['id']: r for r in json.load(open('/home/claude/xlsx_trace/sector_dump.json'))['rows']}
SK8 = ['total', 'supply', 'industry', 'mobility', 'buildings', 'agri', 'eco', 'rest']
def srow(i):
    tags = ''.join(DOT(s) for s in ('s1', 's2', 's3') if S3.at[i, s])
    d = SDJ[i]
    return f"<tr><td class='c'>{tags}</td><td class='l'><b>{X3.at[i, 'model']}</b> {scen(X3.at[i, 'scenario'])}</td>" + ''.join(f"<td>{'–' if d[f'{sk}_2050'] is None else f0(d[f'{sk}_2050'])}</td>" for sk in SK8) + '</tr>'
def secrow(s, k): return f"<tr><td class='c'>{DOT(k)}</td><td class='l'><b>PRIMES</b> EC 2040 IA {s}</td>" + ''.join(f"<td>{f0(F2['IA'][sk][s][2]) if s in F2['IA'].get(sk, {}) else '–'}</td>" for sk in SK8) + '</tr>'
SHD = '<tr><th class="c">Set</th><th class="l">Pathway</th>' + ''.join(f'<th>{NM[sk]}</th>' for sk in SK8) + '</tr>'
TRJ = json.load(open('trend.json')); WWJ = json.load(open('wemwam.json'))
refrow = lambda lab, get: f"<tr class='g'><td></td><td class='l'>{lab}</td>" + ''.join(f"<td>{get(sk)}</td>" for sk in SK8) + '</tr>'
slide('sect2050', 'Backup: set data', 'Sector values in 2050 for every pathway of the three sets',
      f'<table class="p xs">{SHD}{"".join(srow(i) for i in allids)}{secrow("S2", "s2")}{secrow("LIFE", "s3")}'
      + refrow('Trend 2005–2024, read at 2050', lambda sk: f0(TRJ[sk]['2050']) if sk in TRJ else '–') + refrow('WEM 2050', lambda sk: f0(WWJ['WEM'][sk]['2050']) if sk in WWJ['WEM'] else '–') + refrow('WAM 2050', lambda sk: f0(WWJ['WAM'][sk]['2050']) if sk in WWJ['WAM'] else '–') + '</table>',
      src='Mt CO₂e (energy supply, mobility, built environment, ecosystems: Mt CO₂). Harmonised to the 2020 inventory; – : sector not reported. EC 2040 IA mapped as on the sector slides. Trend: least-squares line through the EEA inventory 2005–2024 (calculated). WEM/WAM: Member States’ projections 2026, summed to the same scopes, not harmonised. 2030 and 2040 values: Excel file, sheet Sector values.', h2cls='m')


# ================= sources table =================
_X = X3; _b = _X.det & ~_X.dup; _p30 = _b & ~(ST.red30 < 54.95)
SRCD = [('SC', 'Scenario Compass', 'IIASA scenario database'), ('deeds', 'DEEDS', 'Horizon Europe project, IIASA platform'), ('ecemf', 'ECEMF', 'European Climate and Energy Modelling Forum'),
        ('CircEUlar', 'CircEUlar', 'Horizon Europe project, IIASA platform'), ('Schreyer', 'Schreyer et al. 2025', 'REMIND-EU, Nature Communications; Zenodo'), ('navigate', 'NAVIGATE', 'Horizon 2020 project, IIASA platform'),
        ('IAMC_GCAM', 'IAM COMPACT GCAM', 'GCAM 7.0 studies; Zenodo'), ('ESABCC', 'ESABCC 2023', 'scenario explorer of the 2040 advice'), ('ngfs_phase_4', 'NGFS phase 4', 'central-bank climate scenarios'),
        ('ngfs_phase_5', 'NGFS phase 5', 'central-bank climate scenarios'), ('ElecH2', 'Schreyer et al. 2024', 'REMIND, electricity and hydrogen imports; Zenodo'), ('JRC', 'JRC', 'POLES GECO 2025, POTEnCIA CETO 2025'),
        ('POLIZERO', 'POLIZERO', 'JRC-EU-TIMES, Panos et al. 2025; Zenodo')]
def _cnt(src, k): return int(sum(1 for i in mem[k] if _X.at[i, 'src'] == src))
_s3all = [int(i) for i in S3.index[S3.s3_all]]
def _c(v): return f"<td>{v}</td>" if v else "<td class='dim0'>–</td>"
HAS = lambda s: f"<td>{int((_b & (_X.src == s)).sum()):,}</td><td>{int((_p30 & (_X.src == s)).sum())}</td>"
trA = ''.join(f"<tr><td class='l'><b>{nm}</b></td><td class='l'>{desc}</td>{HAS(s)}</tr>" for s, nm, desc in SRCD)
trA += "<tr><td class='l'><b>EC 2040 impact assessment</b></td><td class='l'>SWD(2024) 63, PRIMES; scenarios S1, S2, S3, LIFE</td><td>4</td><td>4</td></tr>"
trA += f"<tr class='g'><td class='l'>Total</td><td class='l'></td><td>{int(_b.sum()) + 4:,}</td><td>{int(_p30.sum()) + 4}</td></tr>"
slide('sources', 'Sources', 'Scenario sources',
      f'<table class="p sm"><tr><th class="l">Source</th><th class="l">What it is</th><th>Pathways with<br>EU industry data</th><th>Of these, 2030 cut<br>of at least 55%</th></tr>{trA}</table>',
      lead='All EU pathways screened: 13 scenario databases and studies, plus the four scenarios of the EC 2040 impact assessment. Only pathways that report industry emissions are kept.',
      src='Industry data: industry energy CO₂ and process CO₂ reported for 2020 and 2050. 2030 cut against 1990; a pathway without a 2030 value counts as passing. A run held in two databases is counted once. Not included: the REMIND-EU ensemble of 289 runs (Rodrigues et al. 2026).', h2cls='m')
trB = ''.join(f"<tr><td class='l'><b>{nm}</b></td>{HAS(s)}" + _c(_cnt(s, 's1')) + _c(_cnt(s, 's2')) + _c((lambda a, m: f'{m} of {a}' if a else 0)(sum(1 for i in _s3all if _X.at[i, 'src'] == s), _cnt(s, 's3'))) + '</tr>' for s, nm, desc in SRCD)
trB += "<tr><td class='l'><b>EC 2040 impact assessment</b></td><td>4</td><td>4</td><td class='dim0'>–</td><td>1 (S2)</td><td>1 (LIFE)</td></tr>"
trB += f"<tr class='g'><td class='l'>Total</td><td>{int(_b.sum()) + 4:,}</td><td>{int(_p30.sum()) + 4}</td><td>{NMEM['s1']}</td><td>{NMEM['s2']}</td><td>{NMEM['s3']} of {len(_s3all) + 1}</td></tr>"
slide('sourcesets', 'Three pathway sets', 'Pathways per set, by source',
      f'<table class="p sm"><tr><th class="l">Source</th><th>Pathways with<br>EU industry data</th><th>2030 cut of<br>at least 55%</th><th style="color:{COL3["s1"]}">ECL-compatible,<br>within ESABCC limits</th><th style="color:{COL3["s2"]}">ECL range, 10%<br>tolerance margin</th><th style="color:{COL3["s3"]}">ESABCC 2040-compatible:<br>shown of passing</th></tr>{trB}</table>',
      src='ECL-compatible pathways are also counted in the ECL range. ESABCC 2040-compatible: 23 pathways pass; shown are the 8 main runs and EC 2040 IA LIFE, not the 15 sensitivity variants of Schreyer et al. 2025.', h2cls='m')


# ================= industry detail and clean-tech figures =================
IS = json.load(open('ind_detail_stats.json'))
slide('indE', 'Results', 'Industry energy use', f'<div class="fig" style="margin-top:6px"><img src="{img("f3_ind_energy.png")}"></div>',
      src='Final energy of industry, its electricity share (electricity / industry final energy, calculated) and hydrogen use, as the models report them, not harmonised. 2020: model values of all pathways. Not reported: POTEnCIA CETO 2025 and JRC-EU-TIMES CLI (ECL +10%); EC 2040 IA (not in the scenario data). Sources: ESABCC scenario explorer, ECEMF, Schreyer et al. 2024 and 2025 (.mif, EU27).', h2cls='m')
slide('indC', 'Results', 'Industry CO₂: energy and processes', f'<div class="fig" style="margin-top:6px"><img src="{img("f3_ind_co2.png")}"></div>',
      src='Industry energy CO₂ (combustion, after capture; negative values: biomass with CCS in industry) and industrial process CO₂, as the models report them, not harmonised to the inventory. Same pathways and sources as the previous slide.', h2cls='m')
slide('ct4', 'Results', 'Solar PV and wind capacity', f'<div class="fig" style="margin-top:6px"><img src="{img("outl_fig4.png")}"></div>',
      src='Each dot is one pathway; the thick tick is the median of the set and the light line links the medians. 8 of 11 ECL +10% pathways and 8 of 9 ESABCC 2040 pathways report these variables. Rings: net maximum capacity in 2024 (Eurostat, 2026b). Dashed lines: challenge levels of the Board for 2030 (ESABCC, 2023). Figure 4 of the Chapter I draft.', h2cls='m')
slide('ct5', 'Results', 'Electricity in final energy and final energy', f'<div class="fig" style="margin-top:6px"><img src="{img("outl_fig5.png")}"></div>',
      src='As on the previous slide. Figure 5 of the Chapter I draft.', h2cls='m')
slide('ct6', 'Results', 'Electrolyser capacity and CO₂ captured', f'<div class="fig" style="margin-top:6px"><img src="{img("outl_fig6.png")}"></div>',
      src='7 of 11 ECL +10% pathways report electrolyser capacity. Ring: installed electrolyser capacity at the end of 2025 (ACER, 2026). Dashed lines: aim of the EU hydrogen strategy for 2030 (EC, 2020) and risk level of the Board for 2050 (ESABCC, 2023). Figure 6 of the Chapter I draft.', h2cls='m')

slide('methodfig', 'Method', 'How the 1,219 pathways become three sets', f'<div class="fig" style="margin-top:10px"><img src="{img("f3_method.png")}"></div>', src='Rules applied in the order shown; counts from the screening database. EC 2040 IA S2 and LIFE are added after the screening; they meet the 2040 cut and net GHG rule of their set; S2 capture of about 450 Mt is within the 10% tolerance (467.5 Mt), LIFE gives no 2050 capture figure.')
ORDER = ['sources', 'methodfig', 'sets3', 'sourcesets', 'mem12', 'mem3', 's3_total', 's3_industry', 'indE', 'indC', 'ct4', 'ct5', 'ct6', 'ranges3']
D_ = {k: v for k, v in S if k in ORDER}; assert set(ORDER) <= set(D_), set(ORDER) - set(D_); S = [(k, D_[k]) for k in ORDER]
TITLE = {'sources': 'Scenario sources', 'sourcesets': 'Pathways per set, by source', 'methodfig': 'Screening steps', 'sets3': 'Three pathway sets', 'mem12': 'ECL-compatible and ECL range: pathways', 'mem3': 'ESABCC 2040-compatible: pathways',
         'ranges3': 'EU net GHG and industry: ranges, 2040 and 2050', 'method': 'Method', 'notes': 'Notes on comparability', 'full1': 'ECL-compatible, within ESABCC limits: screening values',
         'full2': 'ECL range, 10% tolerance margin: screening values', 'full3': 'ESABCC 2040-compatible: screening values', 'sect2050': 'Sector values, 2050', 'ranges3b': 'Sector ranges, 2040 and 2050', 'indE': 'Industry energy use', 'indC': 'Industry CO₂: energy and processes', 'ct4': 'Solar PV and wind capacity', 'ct5': 'Electricity in final energy and final energy', 'ct6': 'Electrolyser capacity and CO₂ captured',
         'litcap': 'Literature: CO₂ capture and storage, 2050', 'litbio': 'Literature: EU biomass for energy', 'other': 'EU scenario sets not in the database'}
TITLE.update({f's3_{k}': f'{v}, 2005–2050' for k, v in NM.items()}); TITLE['s3_rest'] = 'Everything else, 2030–2050'
BK = {f's3_{k}' for k in ('supply', 'mobility', 'buildings', 'agri', 'eco', 'rest')} | {'ranges3b'}
S = [(k, re.sub(r'<p class="src"[^>]*>.*?</p>', '', v, flags=re.S)) for k, v in S]
S = [(k, v.replace('<p class="kicker">Results</p>', '<p class="kicker">Backup: other sectors</p>') if k in BK else v) for k, v in S]
S = [(k, re.sub(r'(<h2[^>]*>).*?(</h2>)', lambda m: m.group(1) + TITLE[k] + m.group(2), v, count=1, flags=re.S) if k in TITLE else v) for k, v in S]
ids = [sid for sid, _ in S]; n = len(S); body = ''
for i, (sid, h) in enumerate(S):
    h = re.sub(r'§(\w+)§', lambda mm: str(ids.index(mm.group(1)) + 1), h)
    if sid == 'div': h = h.replace('<p class="kicker"></p><h2 class=""></h2>', '')
    body += h.replace('</section>', f'<div class="ctr">{i + 1} / {n}</div></section>')
open('settings3.html', 'w').write(f'<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Three pathway sets against the EC 2040 impact assessment</title><style>{CSS}</style></head><body><div id="stage">{body}</div><script>{JS}</script></body></html>')
print(n, ids)
