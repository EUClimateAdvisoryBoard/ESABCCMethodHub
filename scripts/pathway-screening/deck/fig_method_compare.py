# Compare value-based (Eurostat volume index) and tonnage-based production measures for the EU27 industry decomposition.
# Inputs: industry_intensity.json (emissions by branch, volume indices), production_tonnes.json (tonnages),
#         chem_weights.json (2005 process emissions of ammonia, nitric acid, adipic acid, petrochemicals; Eurostat env_air_gge).
# Output: fig_method_compare.png, method_comparison.json.  AI-compiled - pending Secretariat verification.
import json, math, numpy as np, matplotlib.pyplot as plt
from matplotlib.lines import Line2D
plt.rcParams.update({'font.family': ['Inter', 'DejaVu Sans'], 'font.size': 14})
D = json.load(open('industry_intensity.json'))['branches']; T = json.load(open('production_tonnes.json'))['series']; W = json.load(open('chem_weights.json'))
Y = list(range(2005, 2025))
tn = lambda k: (lambda v: {y: v[y] / v[2005] for y in Y})({int(y): float(x) for y, x in T[k]['values'].items() if x is not None})
val = {b: {int(y): o['series'][y]['P'] / 100 for y in o['series']} for b, o in D.items()}
chem_parts = {'ammonia': 'Ammonia', 'nitric_acid': 'Nitric acid', 'adipic_acid': 'Adipic acid', 'ethylene': 'Ethylene'}
wsum = sum(W[k] for k in chem_parts)
chem_basket = {y: sum(W[k] * tn(k)[y] for k in chem_parts) / wsum for y in Y}
TON = {'Iron and steel': tn('crude_steel'), 'Non-metallic minerals': tn('cement'), 'Chemicals': chem_basket, 'Pulp and paper': tn('paper_and_board')}
VARIANTS = {'V: value-based (all branches)': set(),
            'T1: tonnes for steel and cement': {'Iron and steel', 'Non-metallic minerals'},
            'T2: tonnes wherever available': {'Iron and steel', 'Non-metallic minerals', 'Chemicals', 'Pulp and paper'}}

def decompose(use_t):
    out = {}
    for b, o in D.items():
        E0, E1 = o['E2005'], o['E2024']; L = (E1 - E0) / math.log(E1 / E0)
        p = (TON[b] if b in use_t else val[b])[2024]
        out[b] = (L * math.log(p), L * math.log(E1 / E0 / p), p * 100)
    return out
R = {v: decompose(s) for v, s in VARIANTS.items()}
res = {v: {'branches': {b: dict(production_effect=round(x[0], 1), intensity_effect=round(x[1], 1), production_2024=round(x[2], 1)) for b, x in r.items()},
           'industry': dict(production_effect=round(sum(x[0] for x in r.values()), 1), intensity_effect=round(sum(x[1] for x in r.values()), 1))} for v, r in R.items()}
for v in res:
    i = res[v]['industry']; i['production_share_pct'] = round(i['production_effect'] / (i['production_effect'] + i['intensity_effect']) * 100, 1)
json.dump(dict(_note='LMDI-I, 2005-2024. Chemicals tonnage = ammonia, nitric acid, adipic acid and ethylene tonnages weighted by their 2005 process emissions '
                     '(2.B.1, 2.B.2, 2.B.3, 2.B.8), applied to the whole chemicals branch incl. combustion (assumption). Non-ferrous, food and other '
                     'industry keep the volume index in every variant (no reliable tonnage).', chem_weights_2005_Mt=W, results=res), open('method_comparison.json', 'w'), indent=1)

# ---- figure
C_V, C_T, C_P, C_I = '#2f7fb8', '#c26a1b', '#e07b2a', '#7b5ea7'   # CVD note: blue/orange pairs differ in lightness; lines also differ in dash
f = plt.figure(figsize=(19, 10.5)); gs = f.add_gridspec(2, 5, height_ratios=[1, 1.15], hspace=0.55, wspace=0.32)
PAN = [('Iron and steel', [('crude_steel', 'Crude steel (t)')], 'C24.1'), ('Non-metallic minerals', [('cement', 'Cement (t)'), ('lime_quicklime_sold', 'Lime (t)')], 'C23'),
       ('Chemicals', [('ammonia', 'Ammonia'), ('nitric_acid', 'Nitric acid'), ('ethylene', 'Ethylene')], 'C20'),
       ('Pulp and paper', [('paper_and_board', 'Paper and board (t)')], 'C17'), ('Non-ferrous metals', [('aluminium_unwrought_nonalloy', 'Aluminium proxy (t)')], 'C24.4')]
for j, (b, parts, nace) in enumerate(PAN):
    ax = f.add_subplot(gs[0, j]); v = val[b]
    ax.plot(Y, [v[y] * 100 for y in Y], color=C_V, lw=2.8, label=f'Value-based ({nace})')
    for k, lab in parts:
        s = tn(k); thin = b == 'Chemicals' or k == 'lime_quicklime_sold'
        ax.plot(Y, [s[y] * 100 for y in Y], color=C_T, lw=1.4 if thin else 2.6, ls=(0, (4, 2)), alpha=0.7 if thin else 1)
    if b == 'Chemicals': ax.plot(Y, [chem_basket[y] * 100 for y in Y], color=C_T, lw=2.8, ls=(0, (4, 2)))
    tv = (chem_basket if b == 'Chemicals' else tn(parts[0][0]))[2024] * 100
    dv = 3.5 if abs(v[2024] * 100 - tv) < 6 else 0; up = 1 if v[2024] * 100 >= tv else -1
    ax.text(2024.6, v[2024] * 100 + up * dv, f'{v[2024]*100:.0f}', color=C_V, fontweight='bold', va='center', fontsize=12.5)
    ax.text(2024.6, tv - up * dv, f'{tv:.0f}', color=C_T, fontweight='bold', va='center', fontsize=12.5)
    ax.set_ylim(0 if b == 'Non-ferrous metals' else 40, 130); ax.set_xlim(2004.5, 2027.5); ax.set_xticks([2005, 2015, 2024])
    ax.set_title(b, fontsize=15, fontweight='bold', loc='left'); ax.grid(axis='y', color='#e4e4e4'); ax.set_axisbelow(True)
    for s in ('top', 'right'): ax.spines[s].set_visible(False)
    note = {'Non-metallic minerals': 'tonnes: cement (lime shown)', 'Chemicals': 'tonnes: emission-weighted basket\n(thin: single products)',
            'Non-ferrous metals': 'proxy, not used', 'Pulp and paper': 'tonnes: FAOSTAT, mostly estimated', 'Iron and steel': 'tonnes: worldsteel/Eurofer'}[b]
    ax.text(0.02, 0.03, note, transform=ax.transAxes, fontsize=10.5, color='#5a5a5a', va='bottom')
    if j == 0: ax.set_ylabel('Production, 2005 = 100', fontsize=13)
f.legend(handles=[Line2D([], [], color=C_V, lw=2.8, label='Value-based: Eurostat volume index (sts_inpr_a)'), Line2D([], [], color=C_T, lw=2.8, ls=(0, (4, 2)), label='Tonnage-based')],
         loc='upper center', ncol=2, frameon=False, fontsize=13.5, bbox_to_anchor=(0.5, 1.0))
# bottom left: industry total by variant
ax = f.add_subplot(gs[1, 0:2]); vn = list(res); x = np.arange(len(vn))
pe = [res[v]['industry']['production_effect'] for v in vn]; ie = [res[v]['industry']['intensity_effect'] for v in vn]
ax.barh(x, pe, color=C_P, height=0.55, label='Production effect'); ax.barh(x, ie, left=pe, color=C_I, height=0.55, label='Intensity effect')
for i, v in enumerate(vn):
    ax.text(pe[i] / 2, i, f'{pe[i]:.0f}', ha='center', va='center', color='white', fontweight='bold', fontsize=13)
    ax.text(pe[i] + ie[i] / 2, i, f'{ie[i]:.0f}', ha='center', va='center', color='white', fontweight='bold', fontsize=13)
    ax.text(pe[i] + ie[i] - 6, i, f"production {res[v]['industry']['production_share_pct']:.0f} %", ha='right', va='center', fontsize=12) if False else None
ax.set_yticks(x); ax.set_yticklabels(['V: value-based', 'T1: tonnes for\nsteel, cement', 'T2: tonnes where\navailable'], fontsize=12); ax.invert_yaxis()
ax.set_xlim(-380, 0); ax.set_xlabel('Mt CO₂e, 2005–2024 (industry −362 Mt in every variant)', fontsize=12.5)
for i, v in enumerate(vn): ax.text(-372, i - 0.4, f"output share {res[v]['industry']['production_share_pct']:.0f} %", fontsize=12, color='#3a3a3a', va='center')
ax.set_title('Industry: decomposition by variant', fontsize=15, fontweight='bold', loc='left', pad=26); ax.set_ylim(2.45, -0.75); ax.grid(axis='x', color='#e4e4e4'); ax.set_axisbelow(True)
for s in ('top', 'right'): ax.spines[s].set_visible(False)
ax.legend(loc='lower right', bbox_to_anchor=(1.0, 1.0), ncol=2, frameon=False, fontsize=12)
# bottom right: production effect per branch, V vs T2
ax = f.add_subplot(gs[1, 2:5]); br = ['Non-metallic minerals', 'Iron and steel', 'Chemicals', 'Pulp and paper', 'Non-ferrous metals', 'Food and drink', 'Other industry']
xx = np.arange(len(br)); w = 0.38; v0, v2 = vn[0], vn[2]
a = [res[v0]['branches'][b]['production_effect'] for b in br]; c = [res[v2]['branches'][b]['production_effect'] for b in br]
ax.bar(xx - w / 2, a, w, color=C_V, label='Value-based (V)'); ax.bar(xx + w / 2, c, w, color=C_T, label='Tonnage-based where available (T2)')
for i in range(len(br)):
    for xo, v in ((-w / 2, a[i]), (w / 2, c[i])): ax.text(xx[i] + xo, v + (-3 if v < 0 else 2), f'{v:.0f}'.replace('-', '−'), ha='center', va='top' if v < 0 else 'bottom', fontsize=11.5)
ax.set_xticks(xx); ax.set_xticklabels([b.replace('Non-metallic minerals', 'Minerals').replace(' and ', ' & ') for b in br], fontsize=12)
ax.axhline(0, color='#2c2d2d', lw=0.9); ax.set_ylabel('Production effect, Mt CO₂e', fontsize=13); ax.set_ylim(-100, 30)
ax.set_title('Production effect by branch: value-based vs tonnage-based', fontsize=15, fontweight='bold', loc='left'); ax.grid(axis='y', color='#e4e4e4'); ax.set_axisbelow(True)
for s in ('top', 'right'): ax.spines[s].set_visible(False)
ax.legend(loc='lower right', frameon=False, fontsize=12.5)
f.text(0.01, 0.005, 'EU27, LMDI decomposition of industry emissions (Eurostat env_air_gge). Tonnages: crude steel (worldsteel, Eurofer), cement (CEMBUREAU), chemicals basket of ammonia, nitric acid, adipic acid and ethylene '
       '(Eurostat PRODCOM) weighted by 2005 process emissions and applied to the whole branch, paper and board (FAOSTAT). Food, other industry and non-ferrous keep the volume index in all variants.',
       fontsize=10, color='#6a6a6a', wrap=True)
f.subplots_adjust(left=0.085, right=0.985, top=0.9, bottom=0.1); f.savefig('fig_method_compare.png', dpi=110, facecolor='white'); plt.close(f)
print(json.dumps({v: res[v]['industry'] for v in res}, indent=0))
for b in br: print(b, [res[v]['branches'][b]['production_effect'] for v in vn], [res[v]['branches'][b]['production_2024'] for v in vn])
