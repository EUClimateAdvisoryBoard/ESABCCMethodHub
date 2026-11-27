"""Table 3 as a plain heatmap, drawn in the style of the chapter's Figure 6 (boxed row and column headers, shaded cells,
boxed legend row). No numbers. Shading copied from the chapter's original Table 3 (colours sampled from it).
AI-compiled - pending Secretariat verification."""
import os
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
plt.rcParams.update({'font.family': ['Segoe UI', 'Inter', 'DejaVu Sans']})
H = os.path.dirname(os.path.abspath(__file__))
L, I, K = '#e4edef', '#a9c4c9', '#608c95'; INK = '#1f1f1f'
COLS = ['Clean power', 'Direct\nelectrification', 'Indirect\nelectrification', 'Bio-based\nresources', 'Recycling and\nwaste\nmanagement']
ROWS = ['(1) Demand\nchanges', '(2) Circular\neconomy', '(3) Industrial\nfacilities', '(4) Innovation\nand know-how', '(5) Low-carbon\nelectricity', '(6) Alternatives\nto primary\nfossil inputs', '(7) Infra-\nstructure']
IMP = [[I, K, K, K, I], [L, I, I, K, K], [K, K, K, I, K], [L, I, K, K, K], [L, I, K, L, L], [K, K, K, K, L], [K, K, K, I, I]]
x0, rw, cw, gx = 0.05, 1.70, 1.45, 0.14          # row-header width, column width, horizontal gap
hy, hh, rh, gy = 0.05, 0.62, 0.66, 0.12          # header top, header height, row height, vertical gap
cx = lambda j: x0 + rw + gx + j * (cw + gx); W = cx(5) + 0.05
ry = lambda i: hy + hh + gy + i * (rh + gy); Ht = ry(7) + 0.10 + 0.48 + 0.05
f = plt.figure(figsize=(W * 0.63, Ht * 0.63)); ax = f.add_axes([0, 0, 1, 1]); ax.set_xlim(0, W); ax.set_ylim(Ht, 0); ax.axis('off')
for j, c in enumerate(COLS):
    ax.add_patch(Rectangle((cx(j), hy), cw, hh, fc='white', ec=INK, lw=0.9)); ax.text(cx(j) + cw / 2, hy + hh / 2, c, ha='center', va='center', fontsize=7.2, color=INK, linespacing=1.1)
for i, r in enumerate(ROWS):
    ax.add_patch(Rectangle((x0 + 0.08, ry(i)), rw - 0.08, rh, fc='white', ec=INK, lw=0.9)); ax.text(x0 + 0.04 + rw / 2, ry(i) + rh / 2, r, ha='center', va='center', fontsize=7.2, color=INK, linespacing=1.1)
    for j in range(5): ax.add_patch(Rectangle((cx(j), ry(i)), cw, rh, fc=IMP[i][j], ec='none'))
yl = ry(7) + 0.10
ax.add_patch(Rectangle((x0 + 0.08, yl), W - x0 - 0.13, 0.48, fc='white', ec=INK, lw=0.9))
ax.text(x0 + 0.16, yl + 0.24, 'Importance\nof the need', fontsize=7.2, fontweight='bold', va='center', color=INK, linespacing=1.1)
for j, (c, lab) in enumerate(((L, 'Limited'), (I, 'Important'), (K, 'Key'))):
    ax.add_patch(Rectangle((cx(j), yl + 0.05), cw, 0.38, fc=c, ec='none')); ax.text(cx(j) + cw / 2, yl + 0.24, lab, ha='center', va='center', fontsize=7.2, color=INK)
f.savefig(os.path.join(H, 'Table3_heatmap.png'), dpi=400, facecolor='white'); print('ok')
