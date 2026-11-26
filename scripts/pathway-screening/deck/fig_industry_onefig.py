# One-figure summary for policy makers: EU27 manufacturing-industry emissions, past drivers and the pace the ECL pathways need.
# Every number is computed here from committed inputs; see the README section "One-figure summary".
# AI-compiled - pending Secretariat verification.
import json, math, os, numpy as np, matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
plt.rcParams.update({'font.family': ['Inter', 'DejaVu Sans'], 'font.size': 15})
H = os.path.dirname(os.path.abspath(__file__)); J = lambda f: json.load(open(os.path.join(H, f)))
import importlib.util; spec = importlib.util.spec_from_file_location('d', os.path.join(H, 'decomp_industry.py')); dm = importlib.util.module_from_spec(spec); spec.loader.exec_module(dm)

# ---- data
TOT = dm.TOTAL; Y = dm.Y; n = 2024 - 2005
rR = dm.lmdi('R', 2005, 2024); rV = dm.lmdi('V', 2005, 2024)
peR = sum(v[0] for v in rR.values()); ieR = sum(v[1] for v in rR.values()); peV = sum(v[0] for v in rV.values())
past = (TOT[2005] - TOT[2024]) / n; lessR, cleanR, lessV = -peR / n, -ieR / n, -peV / n
SD = J('sector_dump.json'); NEW = J('new_sector.json')
ECL = [r for r in SD['rows'] + NEW if r['ecl']]
need40 = [(TOT[2024] - r['industry_2040']) / 16 for r in ECL]; need50 = [(r['industry_2040'] - r['industry_2050']) / 10 for r in ECL]
# steel and cement: past (inventory) vs ECL pathways that report output (scenario model data, 2025-2040)
SC_PAST = {k: v for k, v in rR.items() if dm.GROUP[k] in ('Steel', 'Cement, lime, glass')}   # steel and minerals incl. their fuel combustion (like-for-like with scenario energy + process CO2)
sc_less = -sum(v[0] for v in SC_PAST.values()); sc_tot = sum(v[2] - v[3] for v in SC_PAST.values())
SCEN = J('scenario_steel_cement.json')['pathways']   # per pathway: production and intensity effects 2025-2040, steel + cement
scen_share = [s['production'] / (s['production'] + s['intensity']) * 100 for s in SCEN.values()]

# ---- figure
INK, TEAL, LESS, CLEAN, GREY = '#2c2d2d', '#3f7f8c', '#e07b2a', '#5b9a68', '#8a8a8a'   # CVD note: orange vs green differ in lightness and are labelled in words
f = plt.figure(figsize=(19, 8.8)); gs = f.add_gridspec(1, 2, width_ratios=[1.05, 1], wspace=0.13)
ax = f.add_subplot(gs[0])
ax.plot(Y, [TOT[y] for y in Y], color=INK, lw=3.2)
for r in ECL: ax.plot([2024, 2030, 2040, 2050], [TOT[2024], r['industry_2030'], r['industry_2040'], r['industry_2050']], color=TEAL, lw=1.8, alpha=0.75)
ax.scatter([2005, 2024], [TOT[2005], TOT[2024]], color=INK, s=55, zorder=5)
ax.text(2005.4, TOT[2005] + 28, f'2005: {TOT[2005]:.0f} Mt', fontsize=15, fontweight='bold')
ax.text(2023.0, TOT[2024] - 75, f'2024: {TOT[2024]:.0f} Mt', fontsize=15, fontweight='bold', ha='right')
ax.text(2011, 735, f'Past: −{past:.0f} Mt a year', fontsize=16, color=INK)
ax.text(2030.5, 640, f'6 net-zero pathways\n(ECL set)', fontsize=15, color=TEAL, fontweight='bold')
ax.axvspan(2024, 2051, color='#f3f3f3', zorder=0); ax.text(2025, 950, 'Pathways', fontsize=13, color=GREY)
ax.axhline(0, color=INK, lw=0.8); ax.set_xlim(2004, 2051); ax.set_ylim(-60, 1000); ax.set_xticks([2005, 2010, 2015, 2020, 2024, 2030, 2040, 2050])
ax.set_ylabel('Industry emissions, Mt CO₂e', fontsize=15); ax.grid(axis='y', color='#e6e6e6'); ax.set_axisbelow(True)
for s in ('top', 'right'): ax.spines[s].set_visible(False)
ax.set_title('Industry emissions, EU27', fontsize=18, fontweight='bold', loc='left')

ax = f.add_subplot(gs[1]); yrow = {'past': 2.0, 'n40': 1.0, 'n50': 0.0}
ax.barh(yrow['past'], cleanR, color=CLEAN, height=0.6); ax.barh(yrow['past'], lessR, left=cleanR, color=LESS, height=0.6)
ax.text(cleanR / 2, yrow['past'], f'producing\ncleaner\n{cleanR:.0f}', ha='center', va='center', color='white', fontsize=13, fontweight='bold', linespacing=1.05)
ax.text(cleanR + lessR / 2, yrow['past'], f'producing\nless\n{lessR:.0f}', ha='center', va='center', color='white', fontsize=13, fontweight='bold', linespacing=1.05)
ax.text(past + 0.4, yrow['past'], f'{past:.0f}', va='center', fontsize=17, fontweight='bold')
ax.plot([past - lessV, past - lessV], [yrow['past'] - 0.32, yrow['past'] + 0.32], color=INK, lw=1.6, ls=(0, (2, 1.5)))
ax.text(past - lessV, yrow['past'] + 0.36, f'{lessV:.0f}–{lessR:.0f} Mt a year from producing less,\ndepending on how output is measured', ha='center', va='bottom', fontsize=12, color='#4a4a4a')
for key, v in (('n40', need40), ('n50', need50)):
    ax.plot([min(v), max(v)], [yrow[key]] * 2, color=TEAL, lw=10, alpha=0.25, solid_capstyle='round')
    ax.scatter(v, [yrow[key]] * len(v), color=TEAL, s=70, zorder=5, edgecolor='white', lw=1)
    ax.text(max(v) + 0.6, yrow[key], f'{min(v):.0f}–{max(v):.0f}', va='center', fontsize=17, fontweight='bold', color=TEAL)
ax.axvline(past, color=GREY, lw=1.2, ls=(0, (4, 3)), zorder=0)
ax.set_yticks(list(yrow.values())); ax.set_yticklabels(['Past\n2005–2024', 'Needed\n2024–2040', 'Needed\n2040–2050'], fontsize=15)
ax.set_xlim(0, 33); ax.set_ylim(-0.75, 2.9); ax.set_xlabel('Average cut, Mt CO₂e a year (one dot per pathway)', fontsize=14)
ax.grid(axis='x', color='#e6e6e6'); ax.set_axisbelow(True)
for s in ('top', 'right', 'left'): ax.spines[s].set_visible(False)
ax.tick_params(axis='y', length=0)
ax.set_title('How fast emissions fall, and why', fontsize=18, fontweight='bold', loc='left')
msg = (f'Steel, cement, lime, glass: {sc_less / sc_tot * 100:.0f} % of the past cut came from producing less.\n'
       f'In the {len(SCEN)} ECL pathways that report output: {max(scen_share):.0f} % or less in 2025–2040.\nThe rest has to come from producing cleaner.')
ax.text(0.0, -0.16, msg, transform=ax.transAxes, fontsize=13.2, va='top', color=INK, bbox=dict(boxstyle='round,pad=0.5', fc='#fff4e8', ec='#e07b2a', lw=1.2))
f.suptitle(f'Industry cut emissions by {past:.0f} Mt a year since 2005, about {peR / (peR + ieR) * 100:.0f} % of it by producing less.\nNet-zero pathways need {min(need40):.0f}–{max(need40):.0f} Mt a year to 2040, and that has to come mostly from producing cleaner.',
           x=0.01, ha='left', fontsize=18, fontweight='bold', y=0.995, linespacing=1.35)
f.text(0.01, 0.005, 'EU27 manufacturing industry (inventory categories 1.A.2 excl. mining, construction and off-road, plus 2.A, 2.B, 2.C, 2.E, 2.H; EU inventory 2026). '
       'Split of the past cut: LMDI decomposition by sub-branch, output in tonnes where available (inventory activity data, CEMBUREAU, worldsteel/Eurofer), otherwise Eurostat production index; '
       f'with the production index only, {lessV:.0f} Mt a year. Base year 2007 or 2010 moves the share to 58 % or 41 %. Needed pace: 2024 inventory to each pathway\'s 2040 value (/16), and 2040 to 2050 (/10). '
       'Pathway values harmonised to the 2020 inventory. Steel and cement scenario split: model output and emissions in the 3 ECL pathways that report output (REMIND-EU, JRC CETO). AI-compiled, pending Secretariat verification.',
       fontsize=9.6, color='#6a6a6a', wrap=True, va='bottom')
f.subplots_adjust(left=0.06, right=0.97, top=0.85, bottom=0.27)
f.savefig(os.path.join(H, 'fig_industry_onefig.png'), dpi=110, facecolor='white'); plt.close(f)
print(dict(past=round(past, 2), less_R=round(lessR, 2), clean_R=round(cleanR, 2), less_V=round(lessV, 2), share_R=round(peR / (peR + ieR) * 100, 1),
           need40=[round(min(need40), 1), round(max(need40), 1)], need50=[round(min(need50), 1), round(max(need50), 1)],
           steel_cement_past_share=round(sc_less / sc_tot * 100, 1), scen_share=[round(x, 1) for x in scen_share]))
