
A = INS['audit']; BD = INS['bind']; WN = INS['window']; IND = INS['ind']; TEC = INS['tech']
def vc(v, r=None, f=None, d=0):
    if v is None: return '<td>–</td>'
    return f"<td class='{'filt' if f and v > f else ('risk' if r and v > r else '')}'>{f0(v, d)}</td>"
tr = ''.join(f"<tr class='{'' if r['stays'] else 'out'}'><td class='l'><b>{r['model']}</b> {scen(r['scenario'])}</td><td class='l'>{SRCN.get(r['src'], r['src'])}</td>{vc(r['cap'], 425, 500)}{vc(r['bio'], 9, 20, 1)}{vc(r['land'], 400)}{vc(r['wccs'], None, 8600)}"
             f"<td class='c'>{'yes' if r['was_tested'] else 'no'}</td><td class='l k'>{'stays' if r['stays'] else 'out: ' + ', '.join(dict.fromkeys(x[1] for x in r['over']))}</td></tr>" for r in INS['oldb'])
nst = sum(r['stays'] for r in INS['oldb']); nold = len(INS['oldb'])
slide('audit', 'Audit of 22 November', f"Set b after the audit: {nst} of the {nold} pathways remain; the other {nold - nst} exceed a limit once their data are filled in",
      f"""<table class="p sm"><tr><th class="l">Pathway in the earlier set b</th><th class="l">Source</th><th>CO₂ capture<br>2050, Mt</th><th>Bioenergy<br>2050, EJ</th><th>Land sink<br>2050, Mt</th><th>World CO₂<br>storage 2050, Mt</th><th class="c">Limits checked<br>before</th><th class="l">Result</th></tr>{tr}</table>
<p class="key"><i style="color:#ec621d">Orange</i>: above the risk level. <i style="color:#a84048">Red</i>: above the filter. Sets before and after: a {A['sets']['0'][0]} and {A['sets']['0'][1]}, b {A['sets']['150'][0]} and {A['sets']['150'][1]}, c {A['sets']['300'][0]} and {A['sets']['300'][1]}, d {A['sets']['new'][0]} and {A['sets']['new'][1]}.</p>""",
      src=f"Before, the limits had been checked only for pathways at or below net zero; now for every pathway that reaches the limits step. {sum(A['dup'].values())} records that hold the same run twice were removed ({f0(A['base'][0])} to {f0(A['base'][1])} pathways). IMAGE leaves set d: land sink 664 Mt.", h2cls='m')
b3 = BD['300']; lim = {l: (n, rep) for l, n, rep in b3['lim']}
rows_ = ''.join(f"<tr><td>≤ {k} Mt</td><td class='v'>{BD[k]['n']}</td><td class='v'>{BD[k]['all']}</td><td class='v'>{BD[k]['without']}</td></tr>" for k in ('0', '150', '300'))
slide('bind', 'Why set d', f"Of the {b3['n']} pathways that reach the limits step at ≤ 300 Mt, {lim['EU bioenergy above 9 EJ (risk level)'][0]} exceed the bioenergy risk level and {lim['EU CO₂ capture above 425 Mt (risk level)'][0]} the CO₂ capture risk level",
      f"""<div class="side"><div class="fig" style="flex:2.2"><img src="{img('f2_bind.png')}"></div><div class="crit"><h4>Pathways passing, by 2050 rule</h4>
<table><tr><td></td><td class='v' style='font-weight:400;color:#6a6a6a'>reach<br>the step</td><td class='v' style='font-weight:400;color:#6a6a6a'>all<br>limits</td><td class='v' style='font-weight:400;color:#6a6a6a'>without bioenergy<br>and capture limits</td></tr>{rows_}</table>
<p style="font-size:16px;color:#6a6a6a">Reach the step: 2030 cut of at least 55%, 2040 cut of 85–90% and the 2050 rule. The first two rows of the last column are sets a and d.</p></div></div>""",
      src='Counts at net GHG ≤ 300 Mt; a pathway can exceed several limits. Risk-level bars include pathways above the filter. Hydrogen and world bioenergy exclude no pathway.', h2cls='m')
w0 = {d['band']: d for d in WN['0']}; tot0 = sum(d['n'] for d in WN['0'])
slide('window', 'The 2040 window', f"Of the {tot0} pathways at or below net zero, {w0['85–90%']['n']} cut 85–90% by 2040 and {w0['90–95%']['n']} cut 90–95%; within all limits: {w0['85–90%']['ok']} and {w0['90–95%']['ok']}",
      f'<div class="fig"><img src="{img("f2_window.png")}"></div>',
      src=f"Pathways that meet the 2030 rule. {w0['90–95%']['remind']} of the {w0['90–95%']['n']} net-zero pathways in the 90–95% band are REMIND runs. Below 85%, the limits were not checked for every pathway. Bands follow the rounding of the window (84.95, 90.5, 95.5).", h2cls='m')
ib = [r['i50'] for r in IND if 'b' in r['sets']]; idd = [r['i50'] for r in IND if 'd' in r['sets']]; ii = INS['ind_ia']
slide('ind', 'Industry', f"Industry in 2050: {rng(min(ib), max(ib))} Mt in the {len(ib)} pathways of set b, {rng(min(idd), max(idd))} Mt in the {len(idd)} of set d; EC 2040 IA {rng(*ii['i50'])} Mt",
      f'<div class="fig"><img src="{img("f2_ind.png")}"></div>',
      src=f"Industry energy and process CO₂, harmonised to the 2020 inventory. Grey bands: lowest to highest of S1, S2, S3 and LIFE, scaled to the inventory (× {F2['fh']:.2f}).", h2cls='m')
wb = [r['wind'] for r in TEC if 'b' in r['sets']]; od = [r for r in TEC if r['sets'] == 'd']
slide('tech', 'Clean technologies', f"Wind generation in 2040: {rng(min(wb), max(wb))} TWh in the {len(wb)} pathways of set b; " + ' and '.join(f"{f0(r['wind'])} TWh in {r['name']}" for r in od),
      f'<div class="fig"><img src="{img("f2_tech.png")}"></div>',
      src=f"As the models report it; electricity converted from EJ (× 277.78). In 2020 the same pathways report {min(r['wind20'] for r in TEC)}–{max(r['wind20'] for r in TEC)} TWh of wind and {min(r['solar20'] for r in TEC)}–{max(r['solar20'] for r in TEC)} TWh of solar. Letters: sets. {', '.join(INS['tech_missing'])} do not report these variables.", h2cls='m')
nz_ = INS['nearzero']; inv20 = F2['R']['total']['0']['med'][0]
slide('notes', 'Method', 'Two things to know when reading the numbers',
      f"""<div class="cols" style="grid-template-columns:repeat(2,1fr);gap:22px"><div><h3>Energy supply is not like for like</h3><p>Pathways report energy supply net of bioenergy with CCS. EC 2040 IA values are gross; its BECCS and DACCS (−49 Mt in 2040 and −115 Mt in 2050 in S2) sit in everything else.</p></div>
<div><h3>The 2040 window and the charts use different bases</h3><p>The window uses the cut scaled to the 2015 inventory and rounded to whole percent. Chart values are harmonised to the 2020 inventory, with factors from 0.54 to 1.02. The same pathway can therefore show a slightly different cut.</p></div></div>""")
