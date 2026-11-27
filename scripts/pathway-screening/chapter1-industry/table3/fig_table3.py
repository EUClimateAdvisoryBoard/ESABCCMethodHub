"""Draw Table 3 in the style of the chapter's original figure: importance shading per cell, indicator tiles with a
2020 -> 2040 range bar and the change. Values from table3_recomputed.json (compute_table3.py).
Importance shading (limited / important / key) is copied from the original figure (colours sampled from it); it is a
Secretariat judgement, not recomputed. AI-compiled - pending Secretariat verification."""
import json, os
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyBboxPatch
plt.rcParams.update({'font.family': ['Inter', 'DejaVu Sans']})
H = os.path.dirname(os.path.abspath(__file__)); T = json.load(open(os.path.join(H, 'table3_recomputed.json')))
L, I, K = '#e4edef', '#a9c4c9', '#608c95'          # limited / important / key, sampled from the original figure
TILE = {L: '#d6e0e2', I: '#899fa3', K: '#6a939c'}  # inner tile shade on each background
INK, WHITE = '#2c2d2d', '#ffffff'
COLS = ['Clean power', 'Direct\nelectrification', 'Indirect\nelectrification', 'Bio-based\nresources', 'Recycling and\nwaste\nmanagement']
ROWS = ['(1) Demand changes', '(2) Circular economy', '(3) Industrial facilities', '(4) Innovation and know-\nhow', '(5) Low-carbon electricity', '(6) Alternatives to primary\nfossil inputs', '(7) Infrastructure']
IMP = [[I, K, K, K, I], [L, I, I, K, K], [K, K, K, I, K], [L, I, K, K, K], [L, I, K, L, L], [K, K, K, K, L], [K, K, K, I, I]]
GRID = [['elec_use', 'elec_share', 'ind_h2', 'ind_bio', None], [None, None, None, 'residue_share', 'scrap_share'], [('solar_cap', 'wind_cap'), 'ev_sales', 'electrolyser_cap', 'biofuel_cap', 'scrap_steel'],
        [None, None, 'h2_steel', 'cellulosic', None], ['elec_gen', 'ind_elec_share', 'electrolytic_h2_share', None, 'SCRAP_POWER'], [None, None, None, 'bio_primary', None], ['grid_inv', 'charger_inv', 'h2_net_inv', None, None]]
LABEL = {'ind_h2': 'Industry H$_2$ use', 'electrolytic_h2_share': 'Electrolytic H$_2$', 'h2_steel': 'H$_2$-based steel', 'h2_net_inv': 'H$_2$ networks'}
UNIT = {'bn US$2005/yr': 'bn $2005/yr'}

x0, cw, gap, y0, rh, rg = 3.0, 1.62, 0.12, 0.0, 0.84, 0.08
W = x0 + 5 * (cw + gap) + 0.1; Ht = 1.1 + 7 * (rh + rg) + 0.9
f = plt.figure(figsize=(W * 1.55, Ht * 1.55)); ax = f.add_axes([0, 0, 1, 1]); ax.set_xlim(0, W); ax.set_ylim(Ht, 0); ax.axis('off')
cx = lambda j: x0 + j * (cw + gap); ry = lambda i: 1.1 + i * (rh + rg)
for j, c in enumerate(COLS):
    ax.add_patch(Rectangle((cx(j), 0.15), cw, 0.82, fc='white', ec=INK, lw=1.6)); ax.text(cx(j) + cw / 2, 0.56, c, ha='center', va='center', fontsize=10.5, color=INK, linespacing=1.1)
for i, rlab in enumerate(ROWS):
    ax.add_patch(Rectangle((0.1, ry(i) + 0.05), 2.75, rh - 0.1, fc='white', ec=INK, lw=1.6)); ax.text(1.475, ry(i) + rh / 2, rlab, ha='center', va='center', fontsize=10.5, color=INK, linespacing=1.1)

def bar(xa, xb, yy, base, lo, hi, txt):
    top = max(hi, base if base is not None else 0) * 1.05 or 1
    s = lambda v: xa + (xb - xa) * max(v, 0) / top
    if base is not None:
        ax.plot([s(base), s(lo)], [yy, yy], color=txt, lw=1.1, zorder=3)
        ax.scatter([s(base)], [yy], s=26, facecolor='white', edgecolor=txt, lw=1.1, zorder=5)
    ax.plot([s(lo), s(hi) if hi > lo else s(lo) + 0.012], [yy, yy], color=txt, lw=5.2, solid_capstyle='round', zorder=4)

def tile(key, j, i, sub=None):
    bg = IMP[i][j]; txt = WHITE if bg == K else INK; tl = TILE[bg]
    X, Y, w, h = cx(j) + 0.05, ry(i) + 0.06, cw - 0.10, rh - 0.12
    if key == 'SCRAP_POWER':
        ax.add_patch(Rectangle((X, Y), w, h, fc=tl, ec='none'))
        ax.text(X + w / 2, Y + 0.16, 'Scrap steel power', ha='center', fontsize=8.2, color=txt, va='center')
        ax.text(X + w / 2, Y + 0.40, 'not recomputed', ha='center', fontsize=8.6, color='#b03a2e', va='center', fontweight='bold')
        ax.text(X + w / 2, Y + 0.60, 'no matching variable', ha='center', fontsize=7.0, color=txt, va='center'); return
    t = T[key]; lab = LABEL.get(key, t['label']); unit = UNIT.get(t['unit'], t['unit'])
    if sub is not None:   # two stacked mini tiles (solar / wind)
        Y = Y + sub * h / 2; h = h / 2
        ax.add_patch(Rectangle((X, Y), w, h - 0.02, fc=tl, ec='none'))
        ax.text(X + 0.05, Y + 0.10, lab, fontsize=7.8, color=txt, va='center')
        ax.text(X + w - 0.05, Y + 0.12, t['change'], fontsize=9.5, color=txt, va='center', ha='right', fontweight='bold')
        bar(X + 0.08, X + w - 0.55, Y + 0.27, t['base'], t['lo'], t['hi'], txt)
        ax.text(X + w - 0.05, Y + 0.28, f"n={t['n']}", fontsize=6.0, color=txt, va='center', ha='right'); return
    ax.add_patch(Rectangle((X, Y), w, h, fc=tl, ec='none'))
    ax.text(X + w / 2, Y + 0.11, lab, ha='center', fontsize=8.2, color=txt, va='center')
    bar(X + 0.12, X + w - 0.62, Y + 0.34, t['base'], t['lo'], t['hi'], txt)
    ax.text(X + w - 0.06, Y + 0.33, t['change'], ha='right', fontsize=10.5, color=txt, va='center', fontweight='bold')
    rng = t['text'].replace(t['unit'], unit)
    ax.text(X + w / 2, Y + 0.56, rng, ha='center', fontsize=6.9, color=txt, va='center')
    ax.text(X + w - 0.04, Y + h - 0.04, f"n = {t['n']}/6", ha='right', va='bottom', fontsize=5.8, color=txt, alpha=0.9)

for i in range(7):
    for j in range(5):
        ax.add_patch(Rectangle((cx(j), ry(i)), cw, rh, fc=IMP[i][j], ec='none'))
        k = GRID[i][j]
        if isinstance(k, tuple): tile(k[0], j, i, sub=0); tile(k[1], j, i, sub=1)
        elif k: tile(k, j, i)
yl = ry(7) + 0.12
ax.add_patch(Rectangle((0.1, yl), W - 0.2, 0.55, fc='white', ec=INK, lw=1.6))
ax.text(0.25, yl + 0.275, 'Importance of the need', fontsize=10.5, fontweight='bold', va='center', color=INK)
for j, (c, lab) in enumerate(((L, 'Limited'), (I, 'Important'), (K, 'Key'))):
    ax.add_patch(Rectangle((cx(j), yl + 0.07), cw, 0.41, fc=c, ec='none')); ax.text(cx(j) + cw / 2, yl + 0.275, lab, ha='center', va='center', fontsize=10, color=INK)
xa = cx(3) + 0.1; yb = yl + 0.275
ax.plot([xa + 0.05, xa + 0.45], [yb, yb], color=INK, lw=1.1); ax.scatter([xa + 0.05], [yb], s=26, facecolor='white', edgecolor=INK, lw=1.1, zorder=5)
ax.plot([xa + 0.45, xa + 0.85], [yb, yb], color=INK, lw=5.2, solid_capstyle='round')
ax.text(xa + 0.98, yb, '2020 → 2040 range;  n = ECL pathways reporting', fontsize=9.5, va='center', color=INK)
f.savefig(os.path.join(H, 'Table3_recomputed.png'), dpi=220, facecolor='white'); print('ok')
