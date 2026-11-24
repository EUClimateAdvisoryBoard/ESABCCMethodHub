exec(open('charts.py').read().split('OUT = {}')[0])
import json
from collapse import count
from names2 import fam
exec(open('segoe.py').read()); plt.rcParams.update({'font.family': ['Selawik', 'DejaVu Sans'], 'font.size': 18})
S0 = pd.read_csv('systems_fix.csv', low_memory=False); n0 = len(S0); T = ST.iloc[:n0]; X = S0
g = lambda c, t: X[c].notna() & (X[c] > t)
base = X.det & ~X.dup; p30 = base & ~(T.red30 < 54.95)
jrc = X.net50.isna() & (X.src == 'JRC') & X.nz0.fillna(False).astype(bool)
filt = g('cap50', 500) | g('bio50', 20) | g('wccs50', 8600) | g('wbio50', 240) | g('h2_30', 1.89) | g('fe_decl', 20); risk = g('cap50', 425) | g('bio50', 9) | g('land50', 400)
dfilt = g('cap50', 550) | g('bio50', 22) | g('wccs50', 9460) | g('wbio50', 240) | g('h2_30', 1.89) | g('fe_decl', 20); drisk = g('cap50', 467.5) | g('bio50', 9.9) | g('land50', 400)
w1 = (T.red >= 84.95) & (T.red < 90.5); w3 = (T.red >= 90.5) & (T.red < 95.5)
SETS = [('s1', '#608c95', w1, (X.net50 <= 1) | jrc, filt, risk, '2040 cut 85–90%', 'ECL: all ESABCC limits,\nnet GHG 2050 ≤ 0 Mt'),
        ('s2', '#b04545', w1, (X.net50 <= 50) | jrc, dfilt, drisk, '2040 cut 85–90%', 'ECL +10%: bioenergy, CO₂ capture +10%,\nnet GHG 2050 ≤ 50 Mt'),
        ('s3', '#2e422f', w3, (X.net50 <= 1) | jrc, filt, risk, '2040 cut 90–95%', 'ESABCC 2040: all ESABCC limits,\nnet GHG 2050 ≤ 0 Mt')]
O = {'common': [int(base.sum()), int(p30.sum())], 'sets': {}}
f = plt.figure(figsize=(21, 7.2)); gs = f.add_gridspec(1, 4, width_ratios=[1.9, 1, 1, 1], wspace=0.18)
ax = f.add_subplot(gs[0])
for i, (lab, v, c) in enumerate((('Pathways with industry data', O['common'][0], '#c4c4c4'), ('2030: net GHG cut ≥ 55%', O['common'][1], '#aebfc3'))):
    y = 1 - i; ax.barh(y, v, color=c, height=0.55); ax.text(v + 22, y, f'{v:,}', va='center', fontsize=27, fontweight='bold', color='#5a5a5a'); ax.text(0, y + 0.38, lab, fontsize=20, color='#474747')
ax.set_xlim(0, 1650); ax.set_ylim(-1.5, 1.95); ax.set_yticks([]); ax.spines['left'].set_visible(False); ax.tick_params(labelsize=15)
ax.text(0, 1.04, 'All sets', transform=ax.transAxes, fontsize=22, fontweight='bold', color='#474747')
for j, (k, col, w, net, fl, rk, t1, t2) in enumerate(SETS):
    a = f.add_subplot(gs[j + 1]); s_w = p30 & w; s_n = s_w & net; s_f = s_n & ~fl; s_r = s_f & ~rk
    vals = [int(s_w.sum()), int(s_n.sum()), int(s_f.sum()), int(s_r.sum())]; O['sets'][k] = list(vals)
    labs = [t1, 'net GHG 2050 rule', 'ESABCC filter', 'ESABCC risk levels']
    if k == 's3': vals = vals + [8]; labs = labs + ['main runs only']
    for i, (lab, v) in enumerate(zip(labs, vals)):
        y = 4 - i; a.barh(y, v, color=col, alpha=min(1, 0.35 + 0.2 * i), height=0.55); a.text(v + 3, y, str(v), va='center', fontsize=25, fontweight='bold', color=col); a.text(0, y + 0.36, lab, fontsize=19, color='#474747')
    a.set_xlim(0, 125); a.set_ylim(-0.5, 4.9); a.set_yticks([]); a.spines['left'].set_visible(False); a.tick_params(labelsize=15)
    a.text(0, 1.03, t2, transform=a.transAxes, fontsize=18, color=col, va='bottom', linespacing=1.15)
f.subplots_adjust(left=0.012, right=0.99, top=0.85, bottom=0.08); f.savefig('f3_funnel.png', dpi=110, transparent=True); plt.close(f)
S3 = pd.read_csv('sets3.csv', index_col=0)
for k in ('s1', 's2'): assert O['sets'][k][-1] == int(S3[k].sum())
assert O['sets']['s3'][-1] == int(S3['s3_all'].sum()); O['sets']['s3'].append(int(S3['s3'].sum()))
json.dump(O, open('funnel3.json', 'w')); print(O)
