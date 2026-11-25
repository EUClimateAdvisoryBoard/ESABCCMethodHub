# Standalone re-implementation of facet4.py for the two sector slides of the deck (EU net GHG, industry).
# Existing pathways: harmonised values from sector_dump.json (rows, IA, H, HN); added pathways: new_sector.json
# (harmonised the same way: value x inventory(base year) / model(base year)). Layout copied from facet4.py.
import json, sys, textwrap, numpy as np, matplotlib.pyplot as plt, matplotlib.patheffects as pe
from matplotlib.lines import Line2D
from matplotlib.ticker import FuncFormatter
exec(open('segoe.py').read()); plt.rcParams.update({'font.family': ['Selawik', 'DejaVu Sans'], 'font.size': 18})
SD = json.load(open('sector_dump.json')); NEWR = json.load(open('new_sector.json')) if len(sys.argv) < 2 else json.load(open(sys.argv[1]))
H = {int(k): v for k, v in SD['H'].items()}; HN = {int(k): v for k, v in SD['HN'].items()}; IA = SD['IA']; WW = SD['WW']; TR = json.load(open('trend.json'))
ROWS = SD['rows'] + NEWR
INK = '#2c2d2d'; TRC = '#f59e2d'; HC = '#2c2d2d'
SETS = [('ecl', '#608c95', 'ECL: ECL-compatible, within ESABCC limits (85–90%, ≤ 0 Mt)'), ('red', '#b04545', 'ECL +10%: ECL range, 10% tolerance margin (85–90%, ≤ 50 Mt)'),
        ('esabcc', '#2e422f', 'ESABCC 2040: ESABCC 2040-compatible (90–95%, ≤ 0 Mt)')]
ECIN = {'S2': 'red', 'LIFE': 'esabcc'}; NM3 = {'ecl': 'ECL', 'red': 'ECL\n+10%', 'esabcc': 'ESABCC\n2040'}
XB = {2030: 3.0, 2040: 4.0, 2050: 5.0}; hx = lambda y: (y - 2005) / 19 * 1.9; HY = max(HN)
YL = dict(total=(-450, 3200), industry=(-80, 600)); UNIT = {'total': 'Mt CO₂e', 'industry': 'Mt CO₂e'}
WHY = {718: 'industry only', 397: 'industry only', 1327: 'industry and total only'}
SHORT = {718: 'POTEnCIA'}
fmt = lambda v: f'{v:,.0f}'.replace('-', '−'); halo = [pe.withStroke(linewidth=4, foreground='white')]; OUT = {}
for sk in ('total', 'industry'):
    f, ax = plt.subplots(figsize=(19, 8.2)); lo, hi = YL[sk]; OUT[sk] = {}
    hs = {y: v for y, v in (HN if sk == 'total' else {y: H[y][sk] for y in H}).items() if y >= 2005}; hy = sorted(hs)
    hi = max(hi, max(hs.values()) * 1.08)
    ax.plot([hx(y) for y in hy], [hs[y] for y in hy], color=HC, lw=3, zorder=3, solid_capstyle='round'); ax.scatter([hx(HY)], [hs[HY]], s=60, color=HC, zorder=4)
    ax.text(hx(HY) + 0.08, hs[HY], f'{HY}: {fmt(hs[HY])}', ha='left', va='center', fontsize=15, fontweight='bold', color='#2c2d2d', path_effects=halo)
    notes = []
    for j, (key, col, lab) in enumerate(SETS):
        mem = [r for r in ROWS if r[key]]
        C = [r for r in mem if all(r.get(f'{sk}_{y}') is not None for y in (2020, 2030, 2040, 2050))]; miss = [r for r in mem if r not in C]
        V = {y: [float(r[f'{sk}_{y}']) for r in C] for y in (2030, 2040, 2050)}
        ec = [s for s, k_ in ECIN.items() if k_ == key and s in IA[sk]]
        for s in ec: [V[y].append(float(v)) for y, v in zip((2030, 2040, 2050), IA[sk][s])]
        N_ = len(mem) + len(ec); n_ = len(C) + len(ec); OUT[sk][key] = dict(n=n_, N=N_)
        bx = lambda y: XB[y] - 0.26 + 0.26 * j
        med = [float(np.median(V[y])) if V[y] else np.nan for y in (2030, 2040, 2050)]
        ax.plot([bx(y) for y in (2030, 2040, 2050)], med, color=col, lw=2, alpha=0.25, zorder=2)
        rng = np.random.default_rng(7); jit = rng.uniform(-0.025, 0.025, n_)
        for y in (2030, 2040, 2050):
            vv = np.clip(V[y], lo + (hi - lo) * 0.012, hi - (hi - lo) * 0.012)
            ax.scatter(bx(y) + jit[:len(vv)], vv, s=95, facecolor=col, alpha=0.9, edgecolor='none', zorder=3)
            ax.scatter(bx(y) + jit[:len(vv)], vv, s=95, facecolor='white', edgecolor='none', alpha=0.55, zorder=4)
            ax.scatter(bx(y) + jit[:len(vv)], vv, s=95, facecolor='none', edgecolor=col, lw=2, zorder=5)
            ax.text(bx(y), -0.015, f"{NM3[key]}\n({n_} of {N_})" if n_ < N_ else NM3[key], transform=ax.get_xaxis_transform(), ha='center', va='top', fontsize=11, color='#5a5a5a', zorder=6, linespacing=0.95)
        if miss:
            grp = {}
            for r in miss: grp.setdefault(WHY.get(r['id'], 'does not report this sector'), []).append(SHORT.get(r['id'], r['model']))
            notes.append(f"{lab.split(':')[0]}: " + '; '.join(f"{', '.join(v)} not shown ({k})" for k, v in grp.items()))
    LBL = []
    if sk in WW['WEM']:
        for sc, ls_, c_ in (('WEM', (0, (5, 3)), '#5a5a5a'), ('WAM', (0, (1.5, 2)), '#5a5a5a')):
            for y in (2030, 2040, 2050):
                v = WW[sc][sk][str(y)]; ax.plot([XB[y] - 0.40, XB[y] + 0.40], [v, v], color=c_, lw=2, ls=ls_, zorder=3)
            LBL.append([WW[sc][sk]['2050'], sc, c_])
    if sk in TR:
        for y in (2040, 2050):
            v = TR[sk][str(y)]; ax.plot([XB[y] - 0.40, XB[y] + 0.40], [v, v], color=TRC, lw=2.6, ls='-', zorder=3, solid_capstyle='butt')
        LBL.append([TR[sk]['2050'], 'Trend', TRC])
    LBL.sort(); mg = (hi - lo) * 0.055
    for q in range(1, len(LBL)):
        if LBL[q][0] - LBL[q - 1][0] < mg: LBL[q][0] = LBL[q - 1][0] + mg
    for v, t, c_ in LBL: ax.text(XB[2050] + 0.47, v, t, fontsize=14, fontweight='bold', color=c_, va='center', ha='left', path_effects=halo)
    for x0 in XB.values(): ax.axvspan(x0 - 0.42, x0 + 0.42, color='#f5f5f5', zorder=0)
    ax.axhline(0, color=INK, lw=0.9, zorder=1); ax.set_xlim(-0.1, 5.75); ax.set_ylim(lo, hi)
    ax.set_xticks([hx(2005), hx(2010), hx(2015), hx(2020), 3, 4, 5]); ax.set_xticklabels(['2005', '2010', '2015', '2020', '2030', '2040', '2050'], fontsize=17); ax.tick_params(axis='x', pad=58, length=0)
    ax.grid(axis='y', color='#ececec'); ax.set_axisbelow(True); ax.yaxis.set_major_formatter(FuncFormatter(lambda v, _: fmt(v))); ax.tick_params(axis='y', labelsize=16); ax.set_ylabel(UNIT[sk], fontsize=17)
    for s in ('top', 'right'): ax.spines[s].set_visible(False)
    h = [Line2D([], [], marker='o', ls='', ms=11, mfc=col + '88', mec=col, mew=2, label=f"{lab} (n = {OUT[sk][key]['n']}" + (f" of {OUT[sk][key]['N']}" if OUT[sk][key]['n'] < OUT[sk][key]['N'] else '') + ')') for key, col, lab in SETS]
    h2 = [Line2D([], [], color=HC, lw=3, label='EEA inventory 2005–2024'), Line2D([], [], color='#8a8a8a', lw=2, alpha=0.4, label='light line: median of each set')]
    if sk in WW['WEM']: h2 += [Line2D([], [], color='#5a5a5a', lw=2, ls=(0, (5, 3)), label='WEM: MS projections, existing measures'), Line2D([], [], color='#5a5a5a', lw=2, ls=(0, (1.5, 2)), label='WAM: with additional measures'), Line2D([], [], color=TRC, lw=2.6, label='Trend: linear fit to inventory 2005–2024')]
    f.legend(handles=h, loc='lower left', ncol=1, frameon=False, fontsize=14.5, bbox_to_anchor=(0.06, 0.0), handletextpad=0.4)
    f.legend(handles=h2, loc='lower left', ncol=2, frameon=False, fontsize=13.5, bbox_to_anchor=(0.47, 0.0), handletextpad=0.4, columnspacing=1.0)
    if notes: ax.text(0.0, 1.015, '\n'.join(textwrap.fill(n_, 165) for n_ in notes), transform=ax.transAxes, fontsize=13.5, color='#6a6a6a', va='bottom')
    f.subplots_adjust(left=0.07, right=0.99, top=0.90, bottom=0.31); f.savefig(f'f3_{sk}.png', dpi=110, transparent=True); plt.close(f)
# ranges for the last slide (2040, 2050) per set, including the EC IA rows
RG = {}
for sk in ('total', 'industry'):
    for key, _, _ in SETS:
        mem = [r for r in ROWS if r[key] and r.get(f'{sk}_2040') is not None]
        ec = [s for s, k_ in ECIN.items() if k_ == key and s in IA[sk]]
        for y, k in ((2040, 1), (2050, 2)):
            v = [r[f'{sk}_{y}'] for r in mem if r.get(f'{sk}_{y}') is not None] + [IA[sk][s][k] for s in ec]
            RG[f'{sk}|{key}|{y}'] = [round(min(v)), round(max(v)), len(v)]
json.dump(dict(OUT=OUT, RG=RG), open('fig_sector_out.json', 'w'), indent=1)
print(json.dumps(OUT)); print(json.dumps(RG))
