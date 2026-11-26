"""Swap the chart images of the patched deck and update the ranges slide (14).
Usage: python3 assemble.py <deck_in.html> <deck_out.html> <build_dir>"""
import base64, json, os, re, sys
src, out, B = sys.argv[1:4]
s = open(src).read()
secs = re.findall(r'<section.*?</section>', s, re.S); new = list(secs)
IMG = {2: 'f3_method.png', 7: 'f3_total.png', 8: 'f3_industry_combined.png', 9: 'f3_ind_energy.png', 10: 'f3_ind_co2.png', 11: 'ct4.png', 12: 'ct5.png', 13: 'ct6.png'}
for k, fn in IMG.items():
    p = os.path.join(B, fn)
    if not os.path.exists(p): print('missing, slide kept as is:', k, fn); continue
    b64 = base64.b64encode(open(p, 'rb').read()).decode()
    x, n = re.subn(r'src="data:image/png;base64,[A-Za-z0-9+/=]+"', f'src="data:image/png;base64,{b64}"', new[k - 1], count=1); assert n == 1, k
    new[k - 1] = x
# slide 14 ranges from fig_sector_out.json
RG = json.load(open(os.path.join(B, 'fig_sector_out.json')))['RG']
f0 = lambda v: f'{v:,}'.replace('-', '−')
def rng(a, b): return f'{f0(a)}–{f0(b)}' if a >= 0 and b >= 0 else f'{f0(a)} to {f0(b)}'
N = {'ecl': 6, 'red': 14, 'esabcc': 9}
def cell(sk, key, y):
    a, b, n = RG[f'{sk}|{key}|{y}']; extra = f"<span style='font-size:13px;color:#8a8a8a'> ({n})</span>" if n < N[key] else ''
    return f'<td>{rng(a, b)}{extra}</td>'
x = new[13]
x = x.replace('ECL-compatible, within ESABCC limits (3)', 'ECL-compatible, within ESABCC limits (6)').replace('ECL range, 10% tolerance margin (11)', 'ECL range, 10% tolerance margin (14)')
row = lambda sk, lab, cls: f"<tr class='{cls}'><td>{lab}</td>" + ''.join(cell(sk, k, y) for k in ('ecl', 'red', 'esabcc') for y in (2040, 2050)) + '</tr>'
x, n = re.subn(r"<tr class='tot'>.*?</tr><tr class=''>.*?</tr>", row('total', 'EU net GHG', 'tot') + row('industry', 'Industry', ''), x, flags=re.S); assert n == 1
new[13] = x
for a, b in zip(secs, new): s = s.replace(a, b)
open(out, 'w').write(s); print('assembled', out)
