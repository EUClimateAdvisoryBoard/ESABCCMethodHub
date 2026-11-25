# Flow of the screening: one row per set, one column per rule; counts from funnel3.json
import json, matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
exec(open('segoe.py').read()); plt.rcParams.update({'font.family': ['Selawik', 'DejaVu Sans']})
O = json.load(open('funnel3.json')); INK = '#2b2b2b'; GREY = '#2c2d2d'
f, ax = plt.subplots(figsize=(19, 9.3)); ax.set_xlim(0, 19); ax.set_ylim(-1.7, 7.6); ax.axis('off')
def box(x, y, w, h, n, txt, col, fc='white', big=30):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle='round,pad=0.02,rounding_size=0.12', fc=fc, ec=col, lw=2.4))
    ax.text(x + 0.18, y + h - 0.2, f'{n:,}', fontsize=big, fontweight='bold', color=col, va='top')
    ax.text(x + 0.18, y + 0.16, txt, fontsize=13.5, color='#474747', va='bottom', linespacing=1.15)
def arrow(x0, y0, x1, y1, col): ax.annotate('', (x1, y1), (x0, y0), arrowprops=dict(arrowstyle='-|>', color=col, lw=2, mutation_scale=18, shrinkA=0, shrinkB=0))
HD = [(0.1, 'Database'), (2.75, '2030 rule'), (5.4, '2040 window'), (8.05, 'Net GHG 2050'), (10.7, 'ESABCC filter'), (13.35, 'ESABCC risk levels'), (16.0, 'Set')]
for x, t in HD: ax.text(x + 0.05, 7.35, t.upper(), fontsize=14, fontweight='bold', color='#f26119', va='top')
W, H = 2.25, 1.55
ym = 3.3; box(0.1, ym, W, H, O['common'][0], 'pathways with EU\nindustry data', GREY, big=30); arrow(0.1 + W, ym + H / 2, 2.75, ym + H / 2, GREY)
box(2.75, ym, W, H, O['common'][1], 'net GHG cut ≥ 55%\nagainst 1990', GREY)
R = [('s1', '#608c95', 5.2, ['cut 85–90%', 'net GHG ≤ 0 Mt', 'all filters', 'all risk levels'], 'ECL'),
     ('s2', '#b04545', 3.3, ['cut 85–90%', 'net GHG ≤ 50 Mt', 'bioenergy, capture\nand storage +10%', 'bioenergy and\ncapture +10%'], 'ECL +10%'),
     ('s3', '#2e422f', 1.4, ['cut 90–95%', 'net GHG ≤ 0 Mt', 'all filters', 'all risk levels'], 'ESABCC 2040')]
for k, col, y, labs, nm in R:
    v = O['sets'][k]; arrow(2.75 + W, ym + H / 2, 5.4, y + H / 2, col)
    for j in range(4):
        x = 5.4 + 2.65 * j; box(x, y, W, H, v[j], labs[j], col)
        if j < 3: arrow(x + W, y + H / 2, x + 2.65, y + H / 2, col)
    arrow(5.4 + 2.65 * 3 + W, y + H / 2, 16.0, y + H / 2, col)
    if k == 's3': fin, sub = v[4], 'main runs'
    else: fin, sub = v[3], 'pathways'
    box(16.0, y, 2.8, H, fin, (f'{nm}: ' + sub if k != 's1' else nm), col, fc={'s1': '#e7eff1', 's2': '#f6e6e6', 's3': '#e3e8e3'}[k])
FB = [('filter: exclude if above', 7.6, 5.4, ['EU CO₂ capture 2050: 500 Mt', 'EU primary bioenergy 2050: 20 EJ', 'World CO₂ storage 2050: 8,600 Mt', 'World bioenergy 2050: 240 EJ', 'EU hydrogen 2030: 1.89 EJ', 'Final energy decline 2020–30: 20%']),
      ('risk levels: exclude if above', 13.2, 5.6, ['EU CO₂ capture 2050: 425 Mt', 'EU primary bioenergy 2050: 9 EJ', 'EU land sink 2050: 400 Mt'])]
for t, x, w, lines in FB:
    ax.add_patch(FancyBboxPatch((x, -1.55), w, 2.4, boxstyle='round,pad=0.02,rounding_size=0.12', fc='#f3f6f7', ec='#c9d6d9', lw=1.2))
    ax.text(x + 0.18, 0.66, 'ESABCC ' + t, fontsize=13, fontweight='bold', color='#2c2d2d', va='top')
    for q, ln in enumerate(lines): ax.text(x + 0.18 + (q // 3) * 2.7, 0.2 - (q % 3) * 0.42, ln, fontsize=11.5, color='#474747', va='top')
ax.text(13.38, -1.42, 'ECL +10%: EU capture, EU bioenergy and world storage limits × 1.1\nfilter 550 Mt, 22 EJ, 9,460 Mt; risk levels 467.5 Mt, 9.9 EJ', fontsize=11.5, color='#b04545', va='bottom', linespacing=1.25)
ax.text(0.1, -1.5, 'Each box: pathways left after the rule above it.\nA limit only removes a pathway that reports the variable.', fontsize=12, color='#6a6a6a', va='bottom', linespacing=1.3)
f.subplots_adjust(left=0.005, right=0.995, top=0.99, bottom=0.01); f.savefig('f3_method.png', dpi=110, transparent=True)
