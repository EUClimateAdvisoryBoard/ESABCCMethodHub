# GHG intensity of EU27 industry, 2005-2024: index lines (emissions, production, intensity) and an LMDI waterfall,
# for the sector and per branch. Input: industry_intensity.json (Eurostat env_air_gge + sts_inpr_a; see its _source).
# AI-compiled - pending Secretariat verification.
import json, numpy as np, matplotlib.pyplot as plt
from matplotlib.lines import Line2D
plt.rcParams.update({'font.family': ['Inter', 'DejaVu Sans'], 'font.size': 15})
D = json.load(open('industry_intensity.json')); S = D['sector']; BR = D['branches']
INK, GREY = '#2c2d2d', '#9a9a9a'
# Palette (CVD note): blue = stock, orange = production effect, purple = intensity effect; light/dark contrast, all bars labelled
C_STOCK, C_PROD, C_INT, C_END = '#5b8fc7', '#e07b2a', '#7b5ea7', '#a6a6a6'
Y = sorted(int(y) for y in S['emissions_index'])

PLAB = 'Production'
def lines(ax, e, p, i, title):
    ax.plot(Y, [e[str(y)] for y in Y], color=INK, lw=3, label='GHG emissions')
    ax.plot(Y, [p[str(y)] for y in Y], color=INK, lw=2.6, ls=(0, (4, 2)), label=PLAB)
    ax.plot(Y, [i[str(y)] for y in Y], color=GREY, lw=3, label='GHG intensity (emissions / production)')
    for k, d, c in (('e', e, INK), ('p', p, INK), ('i', i, GREY)):
        ax.text(2024.3, d['2024'], f"{d['2024']:.0f}", va='center', fontsize=13, color=c, fontweight='bold')
    ax.set_ylim(0, 130); ax.set_xlim(2004.5, 2026); ax.set_xticks([2005, 2010, 2015, 2020, 2024]); ax.set_yticks(range(0, 126, 25)); ax.set_ylabel('Index, 2005 = 100', fontsize=14)
    ax.set_title(title, fontsize=18, fontweight='bold', loc='left'); ax.grid(axis='y', color='#e4e4e4'); ax.set_axisbelow(True)
    for s in ('top', 'right'): ax.spines[s].set_visible(False)
    ax.legend(loc='lower left', frameon=False, fontsize=12.5)

def waterfall(ax, e0, pe, ie, e1, title):
    xs = [0, 1, 2, 3]; ax.bar(0, e0, color=C_STOCK, width=0.62); ax.bar(3, e1, color=C_END, width=0.62)
    ax.bar(1, pe, bottom=e0, color=C_PROD, width=0.62); ax.bar(2, ie, bottom=e0 + pe, color=C_INT, width=0.62)
    for x, top, lab in ((0, e0, f'{e0:.0f}'), (3, e1, f'{e1:.0f}')): ax.text(x, top + 8, lab, ha='center', fontsize=14, fontweight='bold')
    for x, b, v in ((1, e0, pe), (2, e0 + pe, ie)): ax.text(x, min(b, b + v) - 10, f'{v:+.0f}'.replace('-', '−'), ha='center', va='top', fontsize=14, fontweight='bold')
    for x0, y in ((0.31, e0), (1.31, e0 + pe), (2.31, e1)): ax.plot([x0, x0 + 0.38], [y, y], color=GREY, lw=1)
    ax.set_xticks(xs); ax.set_xticklabels(['2005', 'Production\neffect', 'Intensity\neffect', '2024'], fontsize=13)
    ax.set_ylabel('Mt CO₂e', fontsize=14); ax.set_title(title, fontsize=18, fontweight='bold', loc='left'); ax.set_ylim(0, e0 * 1.12)
    ax.grid(axis='y', color='#e4e4e4'); ax.set_axisbelow(True)
    for s in ('top', 'right'): ax.spines[s].set_visible(False)

# figure 1: industry sector
f, axs = plt.subplots(1, 3, figsize=(19, 7.2), gridspec_kw=dict(width_ratios=[1.05, 0.85, 1.25]))
PLAB = 'Production (tonnes for steel, cement; volume index otherwise)'
lines(axs[0], S['emissions_index'], S['production_index_emission_weighted'], S['intensity_index'], 'Industry: emissions, production, intensity')
waterfall(axs[1], S['E2005'], S['production_effect'], S['intensity_effect'], S['E2024'], 'Industry: what drove the change')
ax = axs[2]; order = sorted(BR, key=lambda b: BR[b]['production_effect'] + BR[b]['intensity_effect'])
yy = np.arange(len(order))[::-1]
for y, b in zip(yy, order):
    pe, ie = BR[b]['production_effect'], BR[b]['intensity_effect']
    ax.barh(y + 0.18, pe, height=0.34, color=C_PROD); ax.barh(y - 0.18, ie, height=0.34, color=C_INT)
    for v, dy in ((pe, 0.18), (ie, -0.18)):
        ax.text(v + (2 if v >= 0 else -2), y + dy, f'{v:+.0f}'.replace('-', '−'), va='center', ha='left' if v >= 0 else 'right', fontsize=11.5)
ax.set_yticks(yy); ax.set_yticklabels([f"{b}\n{BR[b]['E2005']:.0f} → {BR[b]['E2024']:.0f} Mt" for b in order], fontsize=12)
ax.axvline(0, color=INK, lw=0.9); ax.set_xlim(-115, 35); ax.set_xlabel('Mt CO₂e, 2005–2024', fontsize=13)
ax.set_title('By branch', fontsize=18, fontweight='bold', loc='left'); ax.grid(axis='x', color='#e4e4e4'); ax.set_axisbelow(True)
for s in ('top', 'right'): ax.spines[s].set_visible(False)
ax.legend(handles=[Line2D([], [], color=C_PROD, lw=10, label='Production effect'), Line2D([], [], color=C_INT, lw=10, label='Intensity effect')], loc='lower left', frameon=False, fontsize=12)
f.text(0.01, 0.01, 'EU27. Emissions: Eurostat env_air_gge (industry = 1.A.2 + 2.A + 2.B + 2.C + 2.E + 2.H). Production: tonnes for iron and steel (crude steel) and minerals (cement, CEMBUREAU); Eurostat volume index (sts_inpr_a) for the other branches; sector = branch indices weighted by 2005 emissions. '
       'LMDI decomposition.\n"Other industry" uses manufacturing as a whole as its production proxy. Sector totals are 1–3 % above the EEA series on the industry slide because this scope includes mining, construction and off-road (superseded: see fig_industry_onefig.png).', fontsize=10.5, color='#6a6a6a')
f.subplots_adjust(left=0.045, right=0.985, top=0.9, bottom=0.19, wspace=0.42); f.savefig('fig_industry_intensity.png', dpi=110, facecolor='white'); plt.close(f)

# figure 2: iron and steel, as in the Secretariat's example
b = BR['Iron and steel']; ser = b['series']; e0 = ser['2005']['E']
E = {y: v['E'] / e0 * 100 for y, v in ser.items()}; P = {y: v.get('P_used', v['P']) for y, v in ser.items()}; I = {y: E[y] / P[y] * 100 for y in E}
f, axs = plt.subplots(1, 2, figsize=(17, 6.6))
PLAB = 'Production (crude steel, tonnes)'
lines(axs[0], E, P, I, 'Iron and steel: emissions, production, intensity')
waterfall(axs[1], b['E2005'], b['production_effect'], b['intensity_effect'], b['E2024'], 'Iron and steel: what drove the change')
f.text(0.01, 0.01, 'EU27. Emissions: 1.A.2.a + 2.C.1 (Eurostat env_air_gge). Production: crude steel, tonnes (worldsteel 2005–2015 EU28 minus UK; Eurofer EU27 2016–2024). LMDI decomposition.', fontsize=10.5, color='#6a6a6a')
f.subplots_adjust(left=0.06, right=0.98, top=0.9, bottom=0.15, wspace=0.25); f.savefig('fig_steel_intensity.png', dpi=110, facecolor='white'); plt.close(f)
print('ok')

# figure 3: right-hand column for the combined industry slide (waterfall over branch bars), same pixel height as f3_industry.png
plt.rcParams.update({'font.size': 17})
f, axs = plt.subplots(2, 1, figsize=(7.6, 9.6), gridspec_kw=dict(height_ratios=[1, 1.25]))
waterfall(axs[0], S['E2005'], S['production_effect'], S['intensity_effect'], S['E2024'], 'Past drivers, 2005–2024')
axs[0].title.set_fontsize(19)
ax = axs[1]; yy = np.arange(len(order))[::-1]
for y, b in zip(yy, order):
    pe, ie = BR[b]['production_effect'], BR[b]['intensity_effect']
    ax.barh(y + 0.19, pe, height=0.36, color=C_PROD); ax.barh(y - 0.19, ie, height=0.36, color=C_INT)
    for v, dy in ((pe, 0.19), (ie, -0.19)):
        ax.text(v + (2 if v >= 0 else -2), y + dy, f'{v:+.0f}'.replace('-', '−'), va='center', ha='left' if v >= 0 else 'right', fontsize=13)
ax.set_yticks(yy); ax.set_yticklabels([b.replace('Non-metallic minerals', 'Minerals (cement, glass)') for b in order], fontsize=14)
ax.axvline(0, color=INK, lw=0.9); ax.set_xlim(-118, 38); ax.set_xlabel('Mt CO₂e, 2005–2024', fontsize=14)
ax.set_title('By branch', fontsize=19, fontweight='bold', loc='left'); ax.grid(axis='x', color='#e4e4e4'); ax.set_axisbelow(True)
for s in ('top', 'right'): ax.spines[s].set_visible(False)
ax.legend(handles=[Line2D([], [], color=C_PROD, lw=10, label='Production effect'), Line2D([], [], color=C_INT, lw=10, label='Intensity effect')], loc='upper left', bbox_to_anchor=(-0.55, -0.19), ncol=2, frameon=False, fontsize=13.5)
f.subplots_adjust(left=0.36, right=0.97, top=0.94, bottom=0.16, hspace=0.42); f.savefig('fig_industry_drivers.png', dpi=110, facecolor='white'); plt.close(f)
print('ok3')
