exec(open('charts.py').read().split('OUT = {}')[0])
import json
from collapse import collapse, count
for y in (2020, 2030, 2040, 2050): ST[f'total_{y}'] = ST[f'tot_{y}']
RC = pd.read_csv('rest_components.csv', index_col=0)
for c in RC.columns:
    if c != 'region': ST[c] = RC[c].reindex(ST.index)
for y in (2020, 2030, 2040, 2050): ST[f'rest_{y}'] = RC[f'rest_{y}'].reindex(ST.index)

HN = {int(k): v for k, v in json.load(open('/home/claude/figs/eu_net_ghg_hist.json')).items()}

# harmonise every sector and EU net GHG to the 2020 inventory (industry already harmonised)
YY = (2020, 2030, 2040, 2050); HF = {}
def harm(k, inv, mode):
    m = ST[f'{k}_2020'].astype(float)
    for y in YY:
        v = ST[f'{k}_{y}'].astype(float)
        if mode == 'ratio':
            f = (inv / m).where(m > 0); ST[f'{k}_{y}'] = (v * f).where(m > 0, v + (inv - m))
        else:
            ST[f'{k}_{y}'] = v + (inv - m)
for k in ('supply', 'mobility', 'buildings', 'agri'): harm(k, H[2020][k], 'ratio')
harm('eco', H[2020]['eco'], 'offset')
harm('total', HN[2020], 'ratio')
for y in YY: ST[f'rest_{y}'] = ST[f'total_{y}'] - ST[[f'{k}_{y}' for k in ('supply', 'industry', 'mobility', 'buildings', 'agri', 'eco')]].astype(float).sum(axis=1, min_count=6)
# EC IA SWD(2024) 63 Part 3: Table 3 (gross by sector), Tables 1/5 (net, LULUCF); years 2030, 2040, 2050
IA = {'supply':   {'S1': [339+133, 123+71, 21+39], 'S2': [339+133, 42+59, 22+39], 'S3': [339+133, 23+53, 19+38], 'LIFE': [339+133, 34+57, 15+36]},
      'industry': {'S1': [232+157, 126+139, 6+7], 'S2': [232+157, 94+88, 6+7], 'S3': [232+157, 75+14, 9+7], 'LIFE': [232+157, 86+13, 11+7]},
      'mobility': {'S1': [583, 190, 10], 'S2': [583, 143, 8], 'S3': [583, 120, 7], 'LIFE': [583, 134, 9]},
      'buildings':{'S1': [221, 119, 20], 'S2': [221, 92, 19], 'S3': [221, 75, 19], 'LIFE': [221, 92, 29]},
      'agri':     {'S1': [361, 351, 249], 'S2': [361, 302, 249], 'S3': [361, 271, 249], 'LIFE': [361, 209, 194]},
      'eco':      {'S1': [-310, -218, -341], 'S2': [-310, -316, -332], 'S3': [-310, -317, -333], 'LIFE': [-310, -360, -389]},
      'rest':     {'S1': [271, 150, -57], 'S2': [271, 74, -52], 'S3': [271, 42, -53], 'LIFE': [271, 88, 18]},
      'total':    {'S1': [2301-314, 1051, 416-462], 'S2': [2301-314, 578, 413-447], 'S3': [2301-314, 356, -38], 'LIFE': [2301-314, 353, -70]}}   # 2050 S3 and LIFE: Table 1
fh = H[2015]['industry'] / (360 + 233)
IA['industry'] = {k: [v * fh for v in vs] for k, vs in IA['industry'].items()}
IAC = {'S1': '#b08a1e', 'S2': ORANGE, 'S3': '#a84048', 'LIFE': '#2f8f5b'}
SEC = {'total': ('EU net GHG', 'Mt CO₂e', (-900, 4000)), 'supply': ('Energy supply', 'Mt CO₂', (-1350, 1400)), 'industry': ('Industry', 'Mt CO₂e', (-80, 760)), 'mobility': ('Mobility', 'Mt CO₂', (-40, 1000)),
       'buildings': ('Built environment', 'Mt CO₂', (-40, 650)), 'agri': ('Agri-food', 'Mt CO₂e', (0, 650)), 'eco': ('Ecosystems', 'Mt CO₂ (negative = sink)', (-1150, 300)), 'rest': ('Everything else', 'Mt CO₂e', (-500, 900))}
NZ = [('0', 'a) net GHG ≤ 0'), ('150', 'b) net GHG ≤ 150 Mt'), ('300', 'c) net GHG ≤ 300 Mt'), ('new', 'd) net GHG ≤ 0, without\nbioenergy and CO₂ capture limits')]
SELF = lambda nz: (ST.new == 4) if nz == 'new' else (ST[f'{nz}|85–90%|0'] == 4)
Y = [2020, 2030, 2040, 2050]; R = {}; NFULL = {}
from matplotlib.lines import Line2D
from matplotlib.patches import Patch
for sk, (nm, u, yl) in SEC.items():
    f, axs = plt.subplots(1, 4, figsize=(22, 6.9), sharey=True); R[sk] = {}
    hy = sorted(y for y in (HN if sk in ('total', 'rest') else H) if y >= 2010)
    for ax, (nz, lab) in zip(axs, NZ):
        sel = SELF(nz); C = collapse(ST, sel)
        ALLC = [f'{k}_{y}' for k in SEC for y in Y]; C = C.dropna(subset=ALLC)
        M = C[[f'{sk}_{y}' for y in Y]].astype(float).values; n = len(M); NFULL[nz] = (len(collapse(ST, sel)), n)
        if sk != 'rest': ax.bar(hy, [(HN[y] if sk == 'total' else H[y][sk]) for y in hy], color='#e6eef0', width=0.8)
        if n > 5:
            q = {p: np.percentile(M, p, axis=0) for p in (5, 25, 50, 75, 95)}
            ax.fill_between(Y, q[5], q[95], color=TEALL, alpha=0.45, lw=0); ax.fill_between(Y, q[25], q[75], color=TEAL, alpha=0.75, lw=0)
        else:
            q = {50: np.median(M, axis=0)} if n else None
            for row in M: ax.plot(Y, row, color=TEALL, lw=1.5)
        if n:
            ax.plot(Y, q[50], color=PURP, lw=4, zorder=5)
            ax.text(2050.6, q[50][3], f'{q[50][3]:,.0f}'.replace('-', '−'), va='center', fontsize=17, fontweight='bold', color=PURP, zorder=6)
            ax.text(2039.2, q[50][2], f'{q[50][2]:,.0f}'.replace('-', '−'), ha='right', va='center', fontsize=15, fontweight='bold', color=PURP, zorder=6, bbox=dict(facecolor='white', edgecolor='none', pad=1, alpha=0.8))
        for s, vs in IA[sk].items(): ax.plot([2030, 2040, 2050], vs, color=IAC[s], lw=2.2, ls='--', marker='o', ms=6, zorder=4)
        R[sk][nz] = dict(n=n, med=[round(float(x)) for x in q[50]] if n else None)
        ax.axhline(0, color=INK, lw=0.8); ax.set_xlim(2009, 2056); ax.set_ylim(*yl); ax.set_xticks([2010, 2020, 2030, 2040, 2050]); ax.grid(axis='y', color='#eeeeee'); ax.set_axisbelow(True)
        ax.set_title(lab + ('' if nz == 'new' else ' in 2050'), loc='left', fontsize=16, fontweight='bold', color=PURP if nz == 'new' else TEALD)
        if nz == 'new': ax.set_facecolor('#f4f0fa')
        nr = int((sel & (ST.src == 'RodriguesEU') & ST[ALLC].notna().all(axis=1)).sum())
        ax.text(0.98, 0.97, f'n = {n}' , transform=ax.transAxes, ha='right', va='top', fontsize=13, fontweight='bold', color=PURP, linespacing=1.25)
    axs[0].set_ylabel(u)
    h = [Patch(color='#e6eef0', label='EEA inventory'), Patch(color=TEALL, alpha=0.5, label='5–95%'), Patch(color=TEAL, alpha=0.8, label='25–75%'), Line2D([], [], color=PURP, lw=4, label='median')] + [Line2D([], [], color=c, lw=2.2, ls='--', marker='o', label=f'EC IA {s}') for s, c in IAC.items()]
    f.legend(handles=h, loc='lower center', ncol=5, frameon=False, fontsize=13.5, bbox_to_anchor=(0.5, -0.01))
    plt.tight_layout(rect=(0, 0.11, 1, 1), w_pad=1.5); f.savefig(f'fac_{sk}.png', dpi=120, transparent=True); plt.close(f)
# funnels, four settings
st_ = lambda nz: ST.new if nz == 'new' else ST[f'{nz}|85–90%|0']; r30 = ST.red30
f, axs = plt.subplots(1, 4, figsize=(18, 7.6), sharey=True); FN = {}
labs = ['Industry data', '2030: cut ≥ 55%', '2040: cut 85–90%', '2050: net GHG rule', 'ESABCC filter', 'ESABCC risk levels']
for ax, (nz, lab) in zip(axs, NZ):
    s = st_(nz); base = s >= 0; p30 = base & ~(r30 < 54.95)
    inwin = (ST.red >= 84.95) & (ST.red < 90.5)
    p40 = p30 & inwin; p50 = p40 & (s >= 1)
    vals = [count(ST, base), count(ST, p30), count(ST, p40), count(ST, p50), count(ST, s >= 3), count(ST, s == 4)]
    cols = ['#cfcfcf', '#b9c9cc', '#97b4ba', TEAL, TEALD, PURP]
    for i, (v, c) in enumerate(zip(vals, cols)):
        y = 5 - i; ax.barh(y, v, color=c, height=0.64); ax.text(v + 15, y, f'{v:,}', va='center', fontsize=19, fontweight='bold', color=c if i > 1 else '#6b6b6b')
    ax.set_title(('d) ≤ 0, no bioenergy and\nCO₂ capture limits' if nz == 'new' else lab + ' in 2050'), loc='left', fontsize=15.5, fontweight='bold', color=PURP if nz == 'new' else TEALD)
    if nz == 'new': ax.set_facecolor('#f4f0fa')
    ax.set_xlim(0, 2050); ax.set_xticks([0, 500, 1000, 1500])
    FN[nz] = vals
axs[0].set_yticks(range(6)); axs[0].set_yticklabels(labs[::-1], fontsize=15)
for a in axs: a.spines['left'].set_visible(False); a.tick_params(axis='y', length=0)
plt.tight_layout(w_pad=2); f.savefig('fac_funnel.png', dpi=120, transparent=True); plt.close(f)
json.dump(dict(R=R, FN=FN, fh=fh, NFULL=NFULL), open('facet.json', 'w'), indent=0); print(json.dumps(dict(FN=FN, R={k: {nz: (v['n'], v['med'][3] if v['med'] else None) for nz, v in d.items() if nz != 'x'} for k, d in R.items()})))
