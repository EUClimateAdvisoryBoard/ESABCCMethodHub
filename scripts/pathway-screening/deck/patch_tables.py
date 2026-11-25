"""Patch the table slides (1, 3, 4, 5, 6) of settings3.html with the 25 Nov 2026 screening.
Values from scripts/pathway-screening/screen-result-2026-11-24.csv. Existing rows are kept as they are,
except the EC 2040 IA rows (S2, LIFE), which now carry the Annex 8 graph-data values.
AI-compiled — pending Secretariat verification."""
import re, sys
src, out = sys.argv[1], sys.argv[2]
s = open(src).read()
secs = re.findall(r'<section.*?</section>', s, re.S)
new = list(secs)
def sub1(x, old, rep):
    assert x.count(old) == 1, (old[:80], x.count(old))
    return x.replace(old, rep)

# ---------- slide 1: sources
x = new[0]
x = sub1(x, 'All EU pathways screened: 13 scenario databases and studies, plus the four scenarios of the EC 2040 impact assessment.',
         'All EU pathways screened: 20 scenario databases and studies, plus the four scenarios of the EC 2040 impact assessment.')
R1 = lambda nm, d, a, b: f"<tr><td class='l'><b>{nm}</b></td><td class='l'>{d}</td><td>{a}</td><td>{b}</td></tr>"
x = sub1(x, "<tr><td class='l'><b>Schreyer et al. 2024</b>", R1('NGFS phase 5, REMIND IPD-median', 'NGFS damage-feedback runs; none is a main run (retracted damage function)', 7, 4)
         + R1('NGFS phase 5, MESSAGE', 'MESSAGEix-GLOBIOM, downscaled to EU27', 7, 1) + "<tr><td class='l'><b>Schreyer et al. 2024</b>")
x = sub1(x, "<tr><td class='l'><b>POLIZERO</b>", R1('UBA 2026', 'Öko-Institut, Fraunhofer ISI; EUBase, EUTarget, EUSupreme', 3, 3) + "<tr><td class='l'><b>POLIZERO</b>")
x = sub1(x, "<tr><td class='l'><b>EC 2040 impact assessment</b>",
         R1('Agora Energiewende 2023', 'EU Gas Exit Pathway; PDF tables', 1, 1) + R1('JRC CETO 2024', 'POTEnCIA, Clean Energy Technology Observatory 2024', 1, 1)
         + R1('Rodrigues et al. 2026', 'REMIND-EU, Nature Communications; reference run of 337', 1, 1) + R1('CLEVER 2023', 'négaWatt and partners; Open Energy Platform', 1, 1)
         + "<tr><td class='l'><b>EC 2040 impact assessment</b>")
x = sub1(x, "<td>1,223</td><td>623</td></tr></table>", "<td>1,244</td><td>635</td></tr></table>"
         "<p class='key' style='font-size:15px'>Screened but without EU industry data, so not counted: Compass Lexecon for BusinessEurope 2024 (2), JRC GECO 2024 (3), "
         "CAN Europe/EEB PAC 2.0 (1). EC SWD(2026) 616 publishes no absolute economy-wide values. Rodrigues et al. 2026: only the reference run is screened.</p>")
new[0] = x

# ---------- slide 3: three sets
x = new[2]
for old, rep in [
    ("<td><b>3</b></td><td><b>11</b>of which 3 also in ECL-compatible</td><td><b>9</b>8 main runs of 23 that pass, and EC 2040 IA LIFE</td>",
     "<td><b>6</b></td><td><b>14</b>of which 6 also in ECL-compatible</td><td><b>9</b>main runs of 24 that pass, incl. EC 2040 IA LIFE</td>"),
    ("<td><b>1</b>REMIND 3</td><td><b>4</b>POTEnCIA 1, REMIND 8, TIMES 1, PRIMES 1</td>",
     "<td><b>3</b>REMIND 4, POTEnCIA 1, Agora 1</td><td><b>5</b><span style=\"white-space:nowrap;font-size:15px\">REMIND 9, POTEnCIA 2, TIMES 1, PRIMES 1, Agora 1</span></td>"),
    ("<td><b>88.0–90.2%</b></td><td><b>87.5–90.4%</b></td>", "<td><b>86.8–90.2%</b></td><td><b>86.8–90.4%</b></td>"),
    ("<td><b>−110 to 0</b></td>", "<td><b>−110 to 1</b></td>"),
    ("<td><b>280–346</b>3 report</td><td><b>230–464</b>11 report</td><td><b>300–366</b>8 report</td>",
     "<td><b>106–419</b>6 report</td><td><b>106–464</b>14 report</td><td><b>300–366</b>9 report</td>"),
    ("<td><b>6.7–7.5</b>3 report</td><td><b>5.0–9.2</b>9 report</td><td><b>7.0–7.5</b>8 report</td>",
     "<td><b>2.2–7.7</b>6 report</td><td><b>2.2–9.2</b>13 report</td><td><b>7.0–7.5</b>9 report</td>")]:
    x = sub1(x, old, rep)
new[2] = x

# ---------- slide 4: per source
x = new[3]
D = "<td class='dim0'>–</td>"
R4 = lambda nm, a, b, c, d, e: f"<tr><td class='l'><b>{nm}</b></td><td>{a}</td><td>{b}</td>" + ''.join(D if v in (0, None) else f'<td>{v}</td>' for v in (c, d, e)) + '</tr>'
x = sub1(x, "<tr><td class='l'><b>Schreyer et al. 2024</b>", R4('NGFS phase 5, REMIND IPD-median', 7, 4, 0, 0, 0) + R4('NGFS phase 5, MESSAGE', 7, 1, 0, 0, 0) + "<tr><td class='l'><b>Schreyer et al. 2024</b>")
x = sub1(x, "<tr><td class='l'><b>POLIZERO</b>", R4('UBA 2026', 3, 3, 0, 0, 0) + "<tr><td class='l'><b>POLIZERO</b>")
x = sub1(x, "<tr><td class='l'><b>EC 2040 impact assessment</b>", R4('Agora Energiewende 2023', 1, 1, 1, 1, 0) + R4('JRC CETO 2024', 1, 1, 1, 1, 0)
         + R4('Rodrigues et al. 2026', 1, 1, 1, 1, 0) + R4('CLEVER 2023', 1, 1, 0, 0, 0) + "<tr><td class='l'><b>EC 2040 impact assessment</b>")
x = sub1(x, "<td>1,223</td><td>623</td><td>3</td><td>11</td><td>9 of 24</td>", "<td>1,244</td><td>635</td><td>6</td><td>14</td><td>9 of 24</td>")
new[3] = x

# ---------- slide 5: ECL and ECL +10% pathways
DOT = lambda c: f"<span style='display:inline-block;width:13px;height:13px;border-radius:7px;background:{c};margin-right:3px'></span>"
B, R_ = '#608c95', '#b04545'
def prow(dots, model, scen, srcn, c30, c40, net, cap, bio, land, rep):
    cc = lambda v, r, f: 'filt' if f and v is not None and v > f else ('risk' if r and v is not None and v > r else '')
    f = lambda v, d=0: '–' if v is None else f'{v:,.{d}f}'.replace('-', '−')
    return (f"<tr><td class='c'>{dots}</td><td class='l'><b>{model}</b> {scen}</td><td class='l'>{srcn}</td><td>{c30:.1f}%</td><td>{c40:.1f}%</td><td>{f(net)}</td>"
            f"<td class='{cc(cap, 425, 500)}'>{f(cap)}</td><td class='{cc(bio, 9, 20)}'>{f(bio, 1)}</td><td class='{cc(land, 400, None)}'>{f(land)}</td><td class='l'>{rep}</td></tr>")
x = new[4]
x = sub1(x, "<td class='l'><b>PRIMES</b> EC 2040 IA S2</td><td class='l'>EC 2024, SWD(2024) 63</td><td>56.9%</td><td>87.5%</td><td>−34</td><td style='color:#f26119;font-weight:600'>≈ 450</td><td>–</td><td>332</td>",
         "<td class='l'><b>PRIMES</b> EC 2040 IA S2</td><td class='l'>EC 2024, SWD(2024) 63</td><td>58.7%</td><td>88.0%</td><td>−42</td><td class='risk'>459</td><td class=''>8.0</td><td>332</td>")
first_red = "<tr><td class='c'><span style='display:inline-block;width:13px;height:13px;border-radius:7px;background:#b04545;margin-right:3px'></span></td><td class='l'><b>JRC-EU-TIMES</b>"
x = sub1(x, first_red,
         prow(DOT(B) + DOT(R_), 'Agora', 'EU Gas Exit Pathway', 'Agora Energiewende 2023', 59.7, 88.2, -39, 106, 2.2, 400, 'total and sectors')
         + prow(DOT(B) + DOT(R_), 'POTEnCIA', 'CETO 2024', 'JRC CETO 2024', 57.7, 90.2, 1, 419, 7.7, 303, 'total and industry')
         + prow(DOT(B) + DOT(R_), 'REMIND-EU', '14_Nzero_57_bio7p5', 'Rodrigues et al. 2026', 58.4, 86.8, -100, 383, 7.5, 372, 'all sectors') + first_red)
x = sub1(x, 'filters 550 Mt, 22 EJ, world storage 9,460 Mt).</p>',
         'filters 550 Mt, 22 EJ, world storage 9,460 Mt). New rows (Agora, CETO 2024, Rodrigues et al.) and EC 2040 IA S2: cuts as computed by the screening '
         '(scaled to the 2015 inventory; Agora on 2018); EC IA values from the Annex 8 graph data.</p>')
new[4] = x

# ---------- slide 6: LIFE row
x = new[5]
x = sub1(x, "<td class='l'><b>PRIMES</b> EC 2040 IA LIFE</td><td class='l'>EC 2024, SWD(2024) 63</td><td>56.9%</td><td>92.3%</td><td>−70</td><td>–</td><td>–</td><td>389</td>",
         "<td class='l'><b>PRIMES</b> EC 2040 IA LIFE</td><td class='l'>EC 2024, SWD(2024) 63</td><td>59.1%</td><td>92.7%</td><td>−77</td><td class=''>348</td><td class=''>7.5</td><td>389</td>")
new[5] = x

for a, b in zip(secs, new): s = s.replace(a, b)
open(out, 'w').write(s)
print('patched slides 1, 3, 4, 5, 6')
