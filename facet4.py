# One chart per sector: latest inventory year, then 2030, 2040, 2050 side by side; every pathway a dot; EC scenarios as a fourth group of dots
exec(open('facet.py').read().split("NZ = [('0'")[0])
import json, textwrap, matplotlib.patheffects as pe
from matplotlib.lines import Line2D
from matplotlib.patches import Patch
from matplotlib.ticker import FuncFormatter
from names2 import SH as SHN
exec(open('segoe.py').read()); plt.rcParams.update({'font.family': ['Selawik', 'DejaVu Sans'], 'font.size': 18})
S3S = pd.read_csv('sets3.csv', index_col=0)
SHN = dict(SHN); SHN.update({294: 'GCAM-PR EI', 295: 'GCAM-PR LTT', 1322: 'REMIND-EU H2_dom', 1323: 'REMIND-EU H2_imp', 1324: 'REMIND-EU Synf_dom', 1325: 'REMIND-EU Synf_imp'})
WHY = {718: 'industry only', 397: 'industry only', 1327: 'industry and total only', 1322: 'no transport and land-use split', 1323: 'no transport and land-use split', 1324: 'no transport and land-use split', 1325: 'no transport and land-use split'}
SETS = [('s1', '#608c95', 'ECL: ECL-compatible, within ESABCC limits (85–90%, ≤ 0 Mt)', -0.29), ('s2', '#b04545', 'ECL +10%: ECL range, 10% tolerance margin (85–90%, ≤ 50 Mt)', -0.03), ('s3', '#2e422f', 'ESABCC 2040: ESABCC 2040-compatible (90–95%, ≤ 0 Mt)', 0.23)]
YL = dict(total=(-450, 3200), supply=(-560, 760), industry=(-80, 600), mobility=(-40, 900), buildings=(-40, 420), agri=(0, 520), eco=(-450, 100), rest=(-280, 400))
UNIT = {k: v[1] for k, v in SEC.items()}; UNIT['eco'] = 'Mt CO₂'
MK = {'S2': 's', 'S3': '^', 'LIFE': 'D'}
ECSET = {'S2': [(-0.03, '#b04545')], 'LIFE': [(0.23, '#2e422f')]}; IAG = '#6a6a6a'; LS = {'S1': (0, (1, 1.5)), 'S2': '-', 'S3': '--', 'LIFE': (0, (4, 1.5, 1, 1.5))}
X = {2030: 1, 2040: 2, 2050: 3}; HY = max(HN)
fmt = lambda v: f'{v:,.0f}'.replace('-', '−'); short = lambda i: SHN.get(i, ST.at[i, 'model'])
Y = [2020, 2030, 2040, 2050]; ALLC = [f'{k}_{y}' for k in SEC for y in Y]
halo = [pe.withStroke(linewidth=4, foreground='white')]; OUT = {}
WW = json.load(open('wemwam.json')); TR = json.load(open('trend.json')); TRC = '#f59e2d'
SETS = [(k, c, l, d) for (k, c, l, _), d in zip(SETS, (-0.27, -0.05, 0.17))]
ECIN = {'S2': 's2', 'LIFE': 's3'}; NM3 = {'s1': 'ECL', 's2': 'ECL\n+10%', 's3': 'ESABCC\n2040'}; HC = '#2c2d2d'; XB = {2030: 3.0, 2040: 4.0, 2050: 5.0}; hx = lambda y: (y - 2005) / 19 * 1.9
for sk in SEC:
    f, ax = plt.subplots(figsize=(19, 8.2)); lo, hi = YL[sk]; OUT[sk] = {'clip': []}
    if sk != 'rest':
        hs = {y: v for y, v in (HN if sk == 'total' else {y: H[y][sk] for y in H}).items() if y >= 2005}; hy = sorted(hs)
        hi = max(hi, max(hs.values()) * 1.08); lo = min(lo, min(hs.values()) * 1.08) if min(hs.values()) < 0 else lo
        ax.plot([hx(y) for y in hy], [hs[y] for y in hy], color=HC, lw=3, zorder=3, solid_capstyle='round'); ax.scatter([hx(HY)], [hs[HY]], s=60, color=HC, zorder=4)
        ax.text(hx(HY) + 0.08, hs[HY], f'{HY}: {fmt(hs[HY])}', ha='left', va='center', fontsize=15, fontweight='bold', color='#2c2d2d', path_effects=halo)
    notes = []; P = {}
    for key, col, lab, dx in SETS:
        C0 = ST[S3S[key].reindex(ST.index).fillna(False).astype(bool)]
        C = C0.dropna(subset=ALLC if sk == 'rest' else [f'{sk}_{y}' for y in Y]); miss = [i for i in C0.index if i not in C.index]
        V = {y: [float(C.at[i, f'{sk}_{y}']) for i in C.index] for y in (2030, 2040, 2050)}
        for s, k_ in ECIN.items():
            if k_ == key and s in IA[sk]: [V[y].append(float(v)) for y, v in zip((2030, 2040, 2050), IA[sk][s])]
        ne = sum(1 for s, k_ in ECIN.items() if k_ == key and s in IA[sk])
        OUT[sk][key] = dict(n=len(C) + ne, N=len(C0) + ne, vals={str(y): [round(float(x)) for x in V[y]] for y in (2030, 2040, 2050)})
        ids = list(C.index) + [s for s, k_ in ECIN.items() if k_ == key and s in IA[sk]]
        for n_, pid in enumerate(ids):
            P.setdefault(pid, {'sets': [], 'v': {y: V[y][n_] for y in (2030, 2040, 2050)}})['sets'].append(key)
        j = ['s1', 's2', 's3'].index(key); bx = lambda y: XB[y] - 0.26 + 0.26 * j
        med = [float(np.median(V[y])) if V[y] else np.nan for y in (2030, 2040, 2050)]
        ax.plot([bx(y) for y in (2030, 2040, 2050)], med, color=col, lw=2, alpha=0.25, zorder=2)
        rng = np.random.default_rng(7); jit = rng.uniform(-0.025, 0.025, len(ids))
        for y in (2030, 2040, 2050):
            if not V[y]: continue
            vv = np.clip(V[y], lo + (hi - lo) * 0.012, hi - (hi - lo) * 0.012)
            ax.scatter(bx(y) + jit[:len(vv)], vv, s=95, facecolor=col, alpha=0.9, edgecolor='none', zorder=3)
            ax.scatter(bx(y) + jit[:len(vv)], vv, s=95, facecolor='white', edgecolor='none', alpha=0.55, zorder=4)
            ax.scatter(bx(y) + jit[:len(vv)], vv, s=95, facecolor='none', edgecolor=col, lw=2, zorder=5)
            n_, N_ = len(V[y]), len(C0) + sum(1 for s, k_ in ECIN.items() if k_ == key)
            ax.text(bx(y), -0.015, f"{NM3[key]}\n({n_} of {N_})" if n_ < N_ else NM3[key], transform=ax.get_xaxis_transform(), ha='center', va='top', fontsize=11, color='#5a5a5a', zorder=6, linespacing=0.95)
            for i_, v in zip(ids, V[y]):
                if v < lo or v > hi: OUT[sk]['clip'].append([key, short(i_) if not isinstance(i_, str) else 'EC ' + i_, y, round(v)])
        if miss:
            grp = {}
            for i in miss: grp.setdefault(WHY.get(i, 'does not report this sector'), []).append(short(i))
            notes.append(f"{lab.split(':')[0]}: " + '; '.join(f"{', '.join(v)} not shown ({k})" for k, v in grp.items()))
    CC = {'s1': '#608c95', 's2': '#b04545', 's3': '#2e422f'}
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
    seen = {}
    for key, nm, y, v in OUT[sk]['clip']:
        k_ = seen.get(y, 0); seen[y] = k_ + 1
        ax.text(XB[y] - 0.15, lo + (hi - lo) * (0.035 + 0.065 * k_) if v < lo else hi - (hi - lo) * (0.07 + 0.065 * k_), f'{nm} {fmt(v)} ' + ('↓' if v < lo else '↑'), ha='right', fontsize=14, color='#b04545', path_effects=halo, zorder=6)
    for x0 in XB.values(): ax.axvspan(x0 - 0.42, x0 + 0.42, color='#f5f5f5', zorder=0)
    ax.axhline(0, color=INK, lw=0.9, zorder=1); ax.set_xlim(-0.1, 5.75); ax.set_ylim(lo, hi)
    ax.set_xticks([hx(2005), hx(2010), hx(2015), hx(2020), 3, 4, 5]); ax.set_xticklabels(['2005', '2010', '2015', '2020', '2030', '2040', '2050'], fontsize=17); ax.tick_params(axis='x', pad=58, length=0)
    ax.grid(axis='y', color='#ececec'); ax.set_axisbelow(True); ax.yaxis.set_major_formatter(FuncFormatter(lambda v, _: fmt(v))); ax.tick_params(axis='y', labelsize=16); ax.set_ylabel(UNIT[sk], fontsize=17)
    for s in ('top', 'right'): ax.spines[s].set_visible(False)
    h = [Line2D([], [], marker='o', ls='', ms=11, mfc=col + '88', mec=col, mew=2, label=f"{lab} (n = {OUT[sk][key]['n']}" + (f" of {OUT[sk][key]['N']}" if OUT[sk][key]['n'] < OUT[sk][key]['N'] else '') + ')') for key, col, lab, dx in SETS]
    h2 = ([Line2D([], [], color=HC, lw=3, label='EEA inventory 2005–2024')] if sk != 'rest' else []) + [Line2D([], [], color='#8a8a8a', lw=2, alpha=0.4, label='light line: median of each set')]
    if sk in WW['WEM']: h2 += [Line2D([], [], color='#5a5a5a', lw=2, ls=(0, (5, 3)), label='WEM: MS projections, existing measures'), Line2D([], [], color='#5a5a5a', lw=2, ls=(0, (1.5, 2)), label='WAM: with additional measures'), Line2D([], [], color=TRC, lw=2.6, label='Trend: linear fit to inventory 2005–2024')]
    f.legend(handles=h, loc='lower left', ncol=1, frameon=False, fontsize=14.5, bbox_to_anchor=(0.06, 0.0), handletextpad=0.4)
    f.legend(handles=h2, loc='lower left', ncol=2, frameon=False, fontsize=13.5, bbox_to_anchor=(0.47, 0.0), handletextpad=0.4, columnspacing=1.0)
    if notes: ax.text(0.0, 1.015, '\n'.join(textwrap.fill(n_, 165) for n_ in notes), transform=ax.transAxes, fontsize=13.5, color='#6a6a6a', va='bottom')
    f.subplots_adjust(left=0.07, right=0.99, top=0.90, bottom=0.31); f.savefig(f'f3_{sk}.png', dpi=110, transparent=True); plt.close(f)
json.dump(dict(OUT=OUT, IA={k: {s: [round(x) for x in v] for s, v in d.items()} for k, d in IA.items()}), open('facet3.json', 'w'), indent=0, ensure_ascii=False)
print('ok')
