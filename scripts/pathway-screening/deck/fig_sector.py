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
    import os
    NARROW = os.environ.get('NARROW') == '1' and sk == 'industry'
    PLAIN = os.environ.get('PLAIN') == '1'   # plain version for documents: no production axis, no reductions panel
    FULL = sk == 'industry' and not PLAIN
    PRODAX = FULL and os.environ.get('PRODAX') == '1'   # secondary production-index axis: off by default (removed on request 27 Nov 2026)
    f, ax = plt.subplots(figsize=((15.5, 9.6) if NARROW else (19, 9.6)) if sk == 'industry' else (19, 8.2)); lo, hi = YL[sk]; OUT[sk] = {}
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
    h2 = [Line2D([], [], color=HC, lw=3, label='EEA inventory 2005–2024')]
    if sk in WW['WEM']: h2 += [Line2D([], [], color='#5a5a5a', lw=2, ls=(0, (5, 3)), label='WEM: MS projections, existing measures'), Line2D([], [], color='#5a5a5a', lw=2, ls=(0, (1.5, 2)), label='WAM: with additional measures'), Line2D([], [], color=TRC, lw=2.6, label='Trend: linear fit to inventory 2005–2024')]
    f.legend(handles=h, loc='lower left', ncol=1, frameon=False, fontsize=(13 if NARROW else 14.5), bbox_to_anchor=(0.06, 0.0), handletextpad=0.4)
    if PRODAX: h2 += [Line2D([], [], color='#6f6f6f', lw=2.2, ls=(0, (5, 2)), label=('Production, 2005 = 100 (right axis)' if NARROW else 'Production, 2005 = 100 (right axis): tonnes for steel and cement, volume index otherwise'))]
    f.legend(handles=h2, loc='lower left', ncol=2, frameon=False, fontsize=(11.5 if NARROW else 13.5), bbox_to_anchor=((0.50 if NARROW else 0.47), 0.0), handletextpad=0.4, columnspacing=1.0)
    if notes: ax.text(0.0, 1.015, '\n'.join(textwrap.fill(n_, 165) for n_ in notes), transform=ax.transAxes, fontsize=13.5, color='#6a6a6a', va='bottom')
    if FULL:
        # Secondary axis: Eurostat production index (sts_inpr_a, EU27, 2005 = 100), scaled so that 100 = industry emissions 2005,
        # so the black emission line reads as an index too. Palette (CVD note): orange / purple / blue / grey differ in lightness
        # and are also labelled directly at their 2024 end, so no reading depends on hue alone.
        PROD_COLOURS = {'C': '#6f6f6f', 'STEEL_T': '#c26a1b', 'CEMENT_T': '#7b5ea7', 'C20': '#2f7fb8'}
        PI = json.load(open('production_index.json'))['series']; e05 = H[2005][sk]
        TN = json.load(open('production_tonnes.json'))['series']
        for k_, src_ in (('STEEL_T', 'crude_steel'), ('CEMENT_T', 'cement')):
            v_ = {int(y): float(x) for y, x in TN[src_]['values'].items() if x is not None}; PI[k_] = {'I2005': {y: x / v_[2005] * 100 for y, x in v_.items()}}
        hi = e05 * 1.25; ax.set_ylim(lo, hi)
    if PRODAX:
        ax2 = ax.twinx(); ax2.set_ylim(lo / e05 * 100, hi / e05 * 100); ax2.set_yticks([0, 20, 40, 60, 80, 100, 120])
        ax2.tick_params(axis='y', labelsize=15, colors='#5a5a5a'); ax2.set_ylabel('Index, 2005 = 100 (dashed: production; black: emissions)', fontsize=13.5, color='#5a5a5a')
        for sp in ('top', 'left'): ax2.spines[sp].set_visible(False)
        SHORTN = {'C': 'Manufacturing, all (volume)', 'STEEL_T': 'Crude steel (t)', 'CEMENT_T': 'Cement (t)', 'C20': 'Chemicals (volume)'}
        ends = []
        for code, col in PROD_COLOURS.items():
            s = {int(y): v for y, v in PI[code]['I2005'].items()}; ys = sorted(s)
            ax2.plot([hx(y) for y in ys], [s[y] for y in ys], color=col, lw=2.2, ls=(0, (5, 2)), zorder=2)
            ends.append([s[HY], f'{SHORTN[code]} {s[HY]:.0f}', col])
        ends.sort();
        for q in range(1, len(ends)):
            if ends[q][0] - ends[q - 1][0] < 6.5: ends[q][0] = ends[q - 1][0] + 6.5
        for v, t, c_ in ends: ax2.text(hx(HY) + 0.08, v, t, fontsize=13, color=c_, va='center', ha='left', fontweight='bold', path_effects=halo)
        ax.texts[0].set_text(f'{HY}: {fmt(hs[HY])} (index {hs[HY] / e05 * 100:.0f})')
        ax.texts[0].set_position((hx(HY) + 0.08, hs[HY] - 0.07 * (hi - lo)) if not NARROW else (hx(HY) - 0.35, hs[HY] - 0.10 * (hi - lo)))
    if FULL:
        # Panel: average annual reductions, historic (EEA inventory) and required by the ECL set (range over its pathways)
        from matplotlib.patches import Rectangle
        from matplotlib.transforms import blended_transform_factory
        tr = blended_transform_factory(ax.transData, ax.transAxes)
        y0i, y1i = H[2005][sk], H[HY][sk]
        ecl = [r for r in ROWS if r['ecl'] and r.get(f'{sk}_2040') is not None and r.get(f'{sk}_2050') is not None]
        a = [(y1i - r[f'{sk}_2040']) / (2040 - HY) for r in ecl]; b = [(r[f'{sk}_2040'] - r[f'{sk}_2050']) / 10 for r in ecl]
        rg = lambda v: f'{min(v):.0f}–{max(v):.0f}' if round(min(v)) != round(max(v)) else f'{min(v):.0f}'
        hist = (y0i - y1i) / (HY - 2005)
        PAN = [(hx(2005) - 0.05, hx(HY) + 0.05, f'2005–{HY}, EEA inventory', f'{hist:.0f} Mt CO₂e', '#bfd3d7'),
               (hx(HY) + 0.05, XB[2040] + 0.42, f'{HY}–2040, ECL set', f'{rg(a)} Mt CO₂e', '#dde8ea'),
               (XB[2040] + 0.42, XB[2050] + 0.42, '2040–2050, ECL set', f'{rg(b)} Mt CO₂e', '#d9d9d9')]
        yb, hb, ht = 1.035, 0.17, 0.085
        ax.add_patch(Rectangle((PAN[0][0], yb + hb), PAN[-1][1] - PAN[0][0], ht, transform=tr, clip_on=False, fc='#f1f1f1', ec='none'))
        ax.text((PAN[0][0] + PAN[-1][1]) / 2, yb + hb + ht / 2, f"Average annual reductions (past, and required in the ECL set, n = {len(ecl)})", transform=tr,
                ha='center', va='center', fontsize=17, fontweight='bold', color='#3f4d7a')
        for x0, x1, lab, val, fc in PAN:
            ax.add_patch(Rectangle((x0, yb), x1 - x0, hb, transform=tr, clip_on=False, fc=fc, ec='white', lw=3))
            ax.text((x0 + x1) / 2, yb + hb * 0.66, lab, transform=tr, ha='center', va='center', fontsize=15.5, color='#3f4d7a')
            ax.text((x0 + x1) / 2, yb + hb * 0.28, val, transform=tr, ha='center', va='center', fontsize=17, fontweight='bold', color='#3f4d7a')
        for xa in (PAN[0][1], PAN[1][1]):
            ax.annotate('', (xa + 0.07, yb + hb / 2), (xa - 0.07, yb + hb / 2), xycoords=tr, textcoords=tr, arrowprops=dict(arrowstyle='simple', fc='#3b6fb6', ec='#2a4f86', lw=0.8, mutation_scale=22), annotation_clip=False)
        OUT[sk]['reductions'] = dict(hist=round(hist, 1), r2024_2040=[round(min(a), 1), round(max(a), 1)], r2040_2050=[round(min(b), 1), round(max(b), 1)], n=len(ecl))
    f.subplots_adjust(left=0.07, right=(0.935 if PRODAX else 0.99), top=(0.75 if FULL else (0.96 if PLAIN else 0.90)), bottom=(0.265 if sk == 'industry' else 0.31))
    if PLAIN: f.savefig(f'f3_{sk}_plain.png', dpi=150, facecolor='white')
    else: f.savefig(f'f3_{sk}_narrow.png' if NARROW else f'f3_{sk}.png', dpi=110, transparent=True)
    plt.close(f)
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
