"""Table 3, version 2, in the style of the chapter's original figure. Only best-fit tiles (see compute_table3_v2.py):
Eurostat 2024 -> 2040 range across the ECL set; plus JRC (2026) 2030 scale-up needs as quoted in the chapter draft.
Importance shading (limited / important / key) is copied from the original figure (colours sampled from it).
AI-compiled - pending Secretariat verification."""
import json, os
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
plt.rcParams.update({'font.family': ['Inter', 'DejaVu Sans']})
H = os.path.dirname(os.path.abspath(__file__)); D = json.load(open(os.path.join(H, 'table3_v2.json'))); T, J = D['tiles'], D['jrc2030']
L, I, K = '#e4edef', '#a9c4c9', '#608c95'
TILE = {L: '#d6e0e2', I: '#899fa3', K: '#6a939c'}
INK, WHITE = '#2c2d2d', '#ffffff'
COLS = ['Clean power', 'Direct\nelectrification', 'Indirect\nelectrification', 'Bio-based\nresources', 'Recycling and\nwaste\nmanagement']
ROWS = ['(1) Demand changes', '(2) Circular economy', '(3) Industrial facilities', '(4) Innovation and know-\nhow', '(5) Low-carbon electricity', '(6) Alternatives to primary\nfossil inputs', '(7) Infrastructure']
IMP = [[I, K, K, K, I], [L, I, I, K, K], [K, K, K, I, K], [L, I, K, K, K], [L, I, K, L, L], [K, K, K, K, L], [K, K, K, I, I]]
x0, cw, gap, rh, rg = 3.0, 1.75, 0.12, 0.92, 0.08
W = x0 + 5 * (cw + gap) + 0.1; Ht = 1.1 + 7 * (rh + rg) + 0.9
f = plt.figure(figsize=(W * 1.5, Ht * 1.5)); ax = f.add_axes([0, 0, 1, 1]); ax.set_xlim(0, W); ax.set_ylim(Ht, 0); ax.axis('off')
cx = lambda j: x0 + j * (cw + gap); ry = lambda i: 1.1 + i * (rh + rg)
for j, c in enumerate(COLS):
    ax.add_patch(Rectangle((cx(j), 0.15), cw, 0.82, fc='white', ec=INK, lw=1.6)); ax.text(cx(j) + cw / 2, 0.56, c, ha='center', va='center', fontsize=10.5, color=INK, linespacing=1.1)
for i, rl in enumerate(ROWS):
    ax.add_patch(Rectangle((0.1, ry(i) + 0.05), 2.75, rh - 0.1, fc='white', ec=INK, lw=1.6)); ax.text(1.475, ry(i) + rh / 2, rl, ha='center', va='center', fontsize=10.5, color=INK, linespacing=1.1)
for i in range(7):
    for j in range(5): ax.add_patch(Rectangle((cx(j), ry(i)), cw, rh, fc=IMP[i][j], ec='none'))

def bar(xa, xb, yy, base, lo, hi, c):
    top = max(hi, base) * 1.05; s = lambda v: xa + (xb - xa) * v / top
    ax.plot([s(base), s(lo)], [yy, yy], color=c, lw=1.1, zorder=3); ax.scatter([s(base)], [yy], s=24, facecolor='white', edgecolor=c, lw=1.1, zorder=5)
    ax.plot([s(lo), s(hi)], [yy, yy], color=c, lw=5, solid_capstyle='round', zorder=4)

def model_tile(key, X, Y, w, h, c, tl, compact=False):
    t = T[key]; ax.add_patch(Rectangle((X, Y), w, h, fc=tl, ec='none'))
    ax.text(X + 0.06, Y + 0.12, t['label'], fontsize=8.0, color=c, va='center')
    ax.text(X + w - 0.06, Y + 0.13, t['change'], fontsize=10, color=c, va='center', ha='right', fontweight='bold')
    bar(X + 0.08, X + w - 0.10, Y + 0.30, t['base'], t['lo'], t['hi'], c)
    ax.text(X + 0.06, Y + h - 0.08, t['text'], fontsize=6.6, color=c, va='center')
    ax.text(X + w - 0.05, Y + h - 0.08, f"n = {t['n']}/6", fontsize=5.8, color=c, va='center', ha='right')

def jrc_tile(items, X, Y, w, h, c):
    ax.add_patch(Rectangle((X, Y), w, h, fc='none', ec=c, lw=1.1, ls=(0, (3, 2))))
    ax.text(X + 0.06, Y + 0.11, 'JRC 2030 need', fontsize=6.6, color=c, va='center', style='italic')
    for k, key in enumerate(items):
        jy = Y + 0.27 + k * 0.19 * (2 if len(items) == 1 else 1)
        ax.text(X + 0.06, jy, J[key]['label'], fontsize=7.8, color=c, va='center')
        ax.text(X + w - 0.06, jy, J[key]['change'], fontsize=9.5 if len(items) > 1 else 10.5, color=c, va='center', ha='right', fontweight='bold')

def cell(i, j): return cx(j) + 0.05, ry(i) + 0.05, cw - 0.10, rh - 0.10, (WHITE if IMP[i][j] == K else INK), TILE[IMP[i][j]]
X, Y, w, h, c, tl = cell(0, 0); model_tile('elec_use', X, Y, w, h, c, tl)
X, Y, w, h, c, tl = cell(2, 0)          # solar + wind (scenarios) with the JRC 2030 line underneath
model_tile('solar_cap', X, Y, w, h * 0.36, c, tl); model_tile('wind_cap', X, Y + h * 0.38, w, h * 0.36, c, tl)
ax.text(X + 0.06, Y + h * 0.88, f"JRC 2030 need: wind {J['wind']['change']}, solar {J['solar']['change']}", fontsize=6.4, color=c, va='center', style='italic')
X, Y, w, h, c, tl = cell(2, 1); jrc_tile(['heat_pumps', 'batteries'], X, Y, w, h, c)
X, Y, w, h, c, tl = cell(2, 2); jrc_tile(['electrolysers'], X, Y, w, h, c)
yl = ry(7) + 0.12
ax.add_patch(Rectangle((0.1, yl), W - 0.2, 0.62, fc='white', ec=INK, lw=1.6))
ax.text(0.25, yl + 0.31, 'Importance of the need', fontsize=10.5, fontweight='bold', va='center', color=INK)
for j, (cc, lab) in enumerate(((L, 'Limited'), (I, 'Important'), (K, 'Key'))):
    ax.add_patch(Rectangle((cx(j), yl + 0.08), cw, 0.46, fc=cc, ec='none')); ax.text(cx(j) + cw / 2, yl + 0.31, lab, ha='center', va='center', fontsize=10, color=INK)
xa = cx(3) + 0.05; yb = yl + 0.20
ax.plot([xa + 0.05, xa + 0.35], [yb, yb], color=INK, lw=1.1); ax.scatter([xa + 0.05], [yb], s=24, facecolor='white', edgecolor=INK, lw=1.1, zorder=5)
ax.plot([xa + 0.35, xa + 0.65], [yb, yb], color=INK, lw=5, solid_capstyle='round')
ax.text(xa + 0.75, yb, 'Eurostat 2024 → 2040 range (ECL set)', fontsize=8.6, va='center', color=INK)
ax.add_patch(Rectangle((xa + 0.05, yl + 0.36), 0.6, 0.17, fc='none', ec=INK, lw=1.0, ls=(0, (3, 2))))
ax.text(xa + 0.75, yl + 0.445, 'JRC (2026): growth in annual deployment needed, 2024 → 2030', fontsize=8.6, va='center', color=INK)
f.savefig(os.path.join(H, 'Table3_v2.png'), dpi=220, facecolor='white'); print('ok')
