import json, numpy as np, matplotlib.pyplot as plt
from matplotlib.lines import Line2D
exec(open('segoe.py').read()); plt.rcParams.update({'font.family': ['Selawik', 'DejaVu Sans'], 'font.size': 16})
D = json.load(open('ind_detail.json')); CC = {'s1': '#608c95', 's2': '#b04545', 's3': '#2e422f'}; NM = {'s1': 'ECL', 's2': 'ECL +10%', 's3': 'ESABCC 2040'}
X0 = {2020: 0, 2030: 1, 2040: 2, 2050: 3}; DX = {'s1': -0.25, 's2': 0, 's3': 0.25}
def val(d, k, y):
    if k == 'els':
        a, b = d.get(f'el_{y}'), d.get(f'fe_{y}')
        return None if a is None or not b else a / b * 100
    return d.get(f'{k}_{y}')
def panel(ax, k, title, ylim):
    for s in ('s1', 's2', 's3'):
        mem = [d for d in D if s in d['sets']]; med = []
        rng = np.random.default_rng(5)
        for y in (2030, 2040, 2050):
            v = [val(d, k, y) for d in mem]; v = [a for a in v if a is not None]
            if not v: med.append(np.nan); continue
            x = X0[y] + DX[s]; jit = rng.uniform(-0.05, 0.05, len(v))
            ax.scatter(x + jit, v, s=70, facecolor=CC[s] + '88', edgecolor=CC[s], lw=1.6, zorder=4)
            m = float(np.median(v)); med.append(m); ax.plot([x - 0.09, x + 0.09], [m, m], color=CC[s], lw=3.5, zorder=5)
        ax.plot([X0[y] + DX[s] for y in (2030, 2040, 2050)], med, color=CC[s], lw=1.6, alpha=0.4, zorder=3)
    v20 = [val(d, k, 2020) for d in D]; v20 = [a for a in v20 if a is not None]
    ax.scatter(np.full(len(v20), 0) + np.random.default_rng(1).uniform(-0.12, 0.12, len(v20)), v20, s=40, facecolor='white', edgecolor='#8a8a8a', lw=1.2, zorder=4)
    for y in (2030, 2040, 2050): ax.axvspan(X0[y] - 0.42, X0[y] + 0.42, color='#efefef', zorder=0)
    ax.set_xticks([0, 1, 2, 3]); ax.set_xticklabels(['2020\nmodel', '2030', '2040', '2050']); ax.set_xlim(-0.5, 3.5); ax.set_ylim(*ylim)
    ax.set_title(title, loc='left', fontsize=19, fontweight='bold', color='#2c2d2d', pad=12)
    for sp in ('top', 'right', 'left'): ax.spines[sp].set_visible(False)
    ax.grid(axis='y', color='#e6e6e6'); ax.set_axisbelow(True); ax.tick_params(axis='y', length=0)
    if ylim[0] < 0: ax.axhline(0, color='#2c2d2d', lw=0.8)
def legend(f, n):
    cnt = {s: (sum(1 for d in D if s in d['sets'] and val(d, 'fe', 2040) is not None), sum(1 for d in D if s in d['sets'])) for s in CC}
    h = [Line2D([], [], marker='o', ls='', ms=10, mfc=CC[s] + '88', mec=CC[s], mew=1.6, label=f'{NM[s]}: {cnt[s][0]} of {cnt[s][1]} database pathways report') for s in CC]
    h += [Line2D([], [], color='#8a8a8a', lw=3.5, label='median of each set; light line links the medians'), Line2D([], [], marker='o', ls='', ms=8, mfc='white', mec='#8a8a8a', label='2020: all pathways shown, as the models report it')]
    f.legend(handles=h, loc='lower left', ncol=2, frameon=False, fontsize=14, bbox_to_anchor=(0.03, 0.0), columnspacing=2)
f, axs = plt.subplots(1, 3, figsize=(19, 7.4))
panel(axs[0], 'fe', 'Industry final energy, EJ', (0, 17)); panel(axs[1], 'els', 'Electricity in industry final energy, %', (0, 70)); panel(axs[2], 'h2', 'Hydrogen in industry, EJ', (0, 3))
legend(f, 3); f.subplots_adjust(left=0.04, right=0.99, top=0.9, bottom=0.25, wspace=0.18); f.savefig('f3_ind_energy.png', dpi=110, transparent=True); f.savefig('ind_energy_chart.png', dpi=300, bbox_inches='tight', facecolor='white'); plt.close(f)
f, axs = plt.subplots(1, 2, figsize=(19, 7.4))
panel(axs[0], 'co2e', 'Industry energy CO₂, Mt (as reported)', (-80, 720)); panel(axs[1], 'co2p', 'Industrial process CO₂, Mt (as reported)', (0, 250))
legend(f, 2); f.subplots_adjust(left=0.05, right=0.99, top=0.9, bottom=0.25, wspace=0.14); f.savefig('f3_ind_co2.png', dpi=110, transparent=True); f.savefig('ind_co2_chart.png', dpi=300, bbox_inches='tight', facecolor='white'); plt.close(f)
M = {}
for k in ('fe', 'els', 'h2', 'co2e', 'co2p'):
    M[k] = {s: {y: (lambda v: [round(min(v), 2), round(float(np.median(v)), 2), round(max(v), 2), len(v)] if v else None)([a for a in (val(d, k, y) for d in D if s in d['sets']) if a is not None]) for y in (2030, 2040, 2050)} for s in CC}
json.dump(M, open('ind_detail_stats.json', 'w'), indent=0); print(json.dumps({k: M[k]['s1'] for k in M}))
