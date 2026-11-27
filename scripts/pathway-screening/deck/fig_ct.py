# Redraw of the three clean-technology figures (deck slides 11-13; "Figures 4-6 of the Chapter I draft"), same layout:
# per year a grey band with one slot per set; dots sorted by value within the slot; thick tick = set median; light line links medians.
# Input: ct_data.json = {"rows": [{"id", "sets": ["s1","s2","s3"], "<var>_<year>": value}], "ref": {...}}
import json, sys, numpy as np, matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.ticker import FuncFormatter
plt.rcParams.update({'font.family': ['Inter', 'DejaVu Sans'], 'font.size': 17})
D = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'ct_data.json')); ROWS = D['rows']; REF = D['ref']
CC = {'s1': '#608c95', 's2': '#b04545', 's3': '#2e422f'}; FC = {'s1': '#a9c3c8', 's2': '#e3a1a1', 's3': '#7d9a7e'}
LAB = {'s1': 'ECL: ECL-compatible, within ESABCC limits (85–90%, ≤ 0 Mt)', 's2': 'ECL +10%: ECL range, 10% tolerance margin (85–90%, ≤ 50 Mt)', 's3': 'ESABCC 2040: ESABCC 2040-compatible (90–95%, ≤ 0 Mt)'}
YRS = (2030, 2040, 2050); XC = {2030: 1.0, 2040: 2.0, 2050: 3.0}; SL = {'s1': -0.27, 's2': 0.0, 's3': 0.27}; HW = 0.12
fmt = lambda v: f'{v:,.0f}'
def val(r, k, y):
    if k == 'els':
        a, b = r.get(f'fe_el_{y}'), r.get(f'fe_{y}')
        return None if a is None or not b else a / b * 100
    return r.get(f'{k}_{y}')
def panel(ax, k, title, ylim, stat=None, refs=(), xstat=None):
    for s in ('s1', 's2', 's3'):
        mem = [r for r in ROWS if s in r['sets']]; med = []
        for y in YRS:
            v = sorted(a for a in (val(r, k, y) for r in mem) if a is not None)
            if not v: med.append(np.nan); continue
            xs = XC[y] + SL[s] + (np.linspace(-HW * 0.85, HW * 0.85, len(v)) if len(v) > 1 else np.array([0.0]))
            ax.scatter(xs, v, s=120, facecolor=FC[s], edgecolor=CC[s], lw=1.8, zorder=4)
            m = float(np.median(v)); med.append(m); ax.plot([XC[y] + SL[s] - HW, XC[y] + SL[s] + HW], [m, m], color=CC[s], lw=4, zorder=5, solid_capstyle='butt')
        ax.plot([XC[y] + SL[s] for y in YRS], med, color=CC[s], lw=1.6, alpha=0.45, zorder=3)
    for y in YRS: ax.axvspan(XC[y] - 0.38, XC[y] + 0.38, color='#efefef', zorder=0)
    xt, xl = [XC[y] for y in YRS], [str(y) for y in YRS]
    if stat:
        ax.scatter([0.25], [stat[1]], s=170, facecolor='white', edgecolor='#1f1f1f', lw=3.2, zorder=6)
        ax.text(0.25, stat[1] + (ylim[1] - ylim[0]) * 0.035, stat[2], ha='center', va='bottom', fontsize=16, color='#1f1f1f', zorder=6)
        xt, xl = [0.25] + xt, [str(stat[0])] + xl
    for y, v, t, xa in refs:
        x0, x1 = (XC[y] - 0.36, XC[y] + 0.36)
        ax.plot([x0, x1], [v, v], color='#3a3a3a', lw=2.4, ls=(0, (4, 3)), zorder=6)
        ax.text(x0 if xa == 'l' else x1, v + (ylim[1] - ylim[0]) * 0.03, t, ha='left' if xa == 'l' else 'right', va='bottom', fontsize=16, color='#3a3a3a', zorder=3.5,
                bbox=dict(fc='white', ec='none', pad=1.5, alpha=0.85))
    ax.set_xlim(-0.1 if stat else 0.55, 3.45); ax.set_ylim(*ylim); ax.set_xticks(xt); ax.set_xticklabels(xl, fontsize=19)
    ax.tick_params(axis='x', length=0, pad=6); ax.tick_params(axis='y', length=0, labelsize=17, colors='#5a5a5a')
    ax.yaxis.set_major_formatter(FuncFormatter(lambda v, _: fmt(v))); ax.grid(axis='y', color='#e2e2e2'); ax.set_axisbelow(True)
    for sp in ('top', 'right', 'left'): ax.spines[sp].set_visible(False)
    ax.spines['bottom'].set_color('#1f1f1f'); ax.spines['bottom'].set_linewidth(1.8)
    ax.set_title(title, loc='left', fontsize=21, fontweight='bold', color='#1f1f1f', pad=14)
def legend(f):
    n = {s: sum(1 for r in ROWS if s in r['sets']) for s in CC}
    h = [Line2D([], [], marker='o', ls='', ms=12, mfc=FC[s], mec=CC[s], mew=1.8, label=f'{LAB[s]}, n = {n[s]}') for s in CC]
    h2 = [Line2D([], [], color='#8a8a8a', lw=4, label='Median of each set; light line links the medians'), Line2D([], [], color='#3a3a3a', lw=2.4, ls=(0, (4, 3)), label='Reference level; ring: statistic')]
    f.legend(handles=h, loc='lower left', frameon=False, fontsize=16, bbox_to_anchor=(0.015, 0.0), handletextpad=0.6)
    f.legend(handles=h2, loc='lower left', frameon=False, fontsize=16, bbox_to_anchor=(0.505, 0.04), handletextpad=0.6)
def fig(name, p1, p2):
    f, axs = plt.subplots(1, 2, figsize=(19.0, 8.75), dpi=100)
    panel(axs[0], *p1[:3], **p1[3]); panel(axs[1], *p2[:3], **p2[3]); legend(f)
    f.subplots_adjust(left=0.065, right=0.99, top=0.93, bottom=0.25, wspace=0.16); f.savefig(name, dpi=100, facecolor='white'); plt.close(f)
R = REF
fig('ct4.png', ('cap_pv', 'Solar PV capacity, GW', (0, 3000), dict(stat=(2024, R['pv_2024'], 'Eurostat'), refs=[(2030, 900, 'Board challenge level 900', 'l')])),
              ('cap_wind', 'Wind capacity, GW', (0, 1600), dict(stat=(2024, R['wind_2024'], 'Eurostat'), refs=[(2030, 623, 'Board challenge level 623', 'l')])))
fig('ct5.png', ('els', 'Electricity in final energy, %', (0, 70), {}), ('fe', 'Final energy, EJ', (0, 45), {}))
fig('ct6.png', ('cap_ely', 'Electrolyser capacity, GW', (0, 600), dict(stat=(2025, R['ely_2025'], 'ACER'), refs=[(2030, 40, 'EU strategy 40', 'l')])),
              ('co2_cap', 'CO₂ captured, Mt a year', (0, 500), dict(refs=[(2050, 425, 'Board risk level 425', 'r')])))
# counts per variable and set, for the slide notes
C = {}
for k in ('cap_pv', 'cap_wind', 'els', 'fe', 'cap_ely', 'co2_cap'):
    C[k] = {s: [sum(1 for r in ROWS if s in r['sets'] and val(r, k, 2040) is not None), sum(1 for r in ROWS if s in r['sets'])] for s in CC}
    C[k]['median_2050'] = {s: (lambda v: round(float(np.median(v)), 1) if v else None)([a for a in (val(r, k, 2050) for r in ROWS if s in r['sets']) if a is not None]) for s in CC}
json.dump(C, open('ct_counts.json', 'w'), indent=1); print(json.dumps(C))
