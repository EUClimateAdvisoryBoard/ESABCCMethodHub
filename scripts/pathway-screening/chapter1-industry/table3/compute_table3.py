"""Recompute Table 3 ("Needs per clean-technology option, with selected scenario indicators for 2020 and 2040")
on the current ECL set (6 pathways). AI-compiled - pending Secretariat verification.

Method (same as the original table, inferred from its values): 2020 = mean of the reporting pathways' own 2020 values;
2040 = lowest to highest value across the ECL pathways that report the tile; change = from 2020 to the middle of the 2040
range (x for multiples, pp for percentage points, "new" where 2020 is close to zero). Inputs: *_tiles.csv (one row per
pathway, tile and year, with variable and locator)."""
import csv, json, statistics as st, sys
IDS = ['779', '1266', '1275', '3162', '2400', '2000']
NAME = {'779': 'ESABCC REMIND 3.2', '1266': 'Schreyer CCS180', '1275': 'Schreyer CCS350', '3162': 'Rodrigues', '2400': 'CETO 2024', '2000': 'Agora'}
V = {}
for f in ('remind_tiles.csv', 'jrc_tiles.csv', 'ecagora_tiles.csv'):
    for r in csv.DictReader(open(f, encoding='utf-8')):
        if r['ID'] in IDS and r['value'].strip():
            try: V[(r['item'], r['ID'], r['year'])] = float(r['value'])
            except ValueError: pass
# tile: (label, key, unit shown, kind, decimals, note)
TILES = {
 'elec_use': ('Electricity use', 'TWh', 'x', 0, 'Final electricity consumption, whole economy.'),
 'elec_share': ('Electricity share', '%', 'pp', 0, 'Electricity in total final energy. REMIND includes non-energy use in the denominator, CETO excludes it.'),
 'ind_h2': ('Industry H2 use', 'TWh', 'x', 0, 'Hydrogen as final energy in industry (CETO: energy + feedstock). 2020 model values are near zero because hydrogen made on site from natural gas is not counted as final energy, so the multiplier overstates how new hydrogen is.'),
 'ind_bio': ('Industry bioenergy', 'TWh', 'x', 0, 'Bioenergy used in industry (energy + feedstock where reported).'),
 'residue_share': ('Residues share', '%', 'pp', 0, 'Share of residues and wastes in biomass supply (Schreyer runs only).'),
 'scrap_share': ('Scrap share of steel', '%', 'pp', 0, 'Secondary (scrap-EAF) steel as share of steel output.'),
 'solar_cap': ('Solar', 'GW', 'x', 0, 'Installed solar PV capacity.'),
 'wind_cap': ('Wind', 'GW', 'x', 0, 'Installed wind capacity, onshore + offshore.'),
 'ev_sales': ('Electric car sales', '%', 'pp', 0, 'Electric share of new passenger car sales (REMIND: battery-electric only; CETO: battery-electric + plug-in hybrid). Model 2020 values; observed 2020 EU share was higher.'),
 'electrolyser_cap': ('Electrolysers', 'GW', 'new', 0, 'Installed electrolyser capacity.'),
 'biofuel_cap': ('Biofuel plants', 'GW', 'x', 0, 'Biofuel production capacity (fuel output, GW) - REMIND 3.x runs only.'),
 'scrap_steel': ('Scrap steel output', 'Mt', 'x', 0, 'Secondary (scrap-EAF) steel output.'),
 'h2_steel': ('H2-based steel', 'Mt', 'new', 0, 'Steel from hydrogen direct reduction (Schreyer runs only).'),
 'cellulosic': ('Cellulosic biomass', 'EJ', 'new', 1, 'Lignocellulosic biomass used for biofuels. Only CETO 2024 reports this concept; the REMIND variable found (lignocellulosic production, 6.7 EJ in 2020) is a different, much wider concept and is not used.'),
 'elec_gen': ('Generation', 'TWh', 'x', 0, 'Electricity generation (gross/net not stated for REMIND).'),
 'ind_elec_share': ('Industry', '%', 'pp', 0, 'Electricity share of industry final energy (REMIND incl. non-energy use; CETO excl.; Agora 2040 from slide text, "about 60 %").'),
 'electrolytic_h2_share': ('Electrolytic H2', '%', 'pp', 0, 'Share of hydrogen produced by electrolysis (REMIND and CETO: of domestic production; Agora: of total demand).'),
 'bio_primary': ('Bioenergy', 'EJ', 'x', 1, 'Primary bioenergy supply (Agora includes waste).'),
 'grid_inv': ('Grids', 'bn US$2005/yr', 'x', 0, 'Annual investment in electricity grids, as published (US$2005); the original table showed euro values with an unstated conversion.'),
 'charger_inv': ('Chargers', 'bn US$2005/yr', 'x', 0, 'Annual investment in charging infrastructure, as published (US$2005).'),
 'h2_net_inv': ('H2 networks', 'bn US$2005/yr', 'x', 1, 'Annual investment in hydrogen networks, as published (US$2005); Schreyer runs only.'),
}
OUT = {}
EXCLUDE = {('cellulosic', '1266'), ('cellulosic', '1275')}   # different concept, see note
for t, (lab, unit, kind, dec, note) in TILES.items():
    v20 = [V[(t, i, '2020')] for i in IDS if (t, i, '2020') in V and (t, i) not in EXCLUDE]
    w40 = {i: V[(t, i, '2040')] for i in IDS if (t, i, '2040') in V and (t, i) not in EXCLUDE}
    if not w40: OUT[t] = dict(label=lab, missing=True); continue
    lo, hi = min(w40.values()), max(w40.values()); mid = (lo + hi) / 2
    base = st.mean(v20) if v20 else None
    if unit == '%': chg = f'{mid - base:+.0f} pp'
    elif t == 'ind_h2': chg = 'new*'   # see note: hydrogen is not new to industry, only as counted final energy
    elif base is None or abs(base) < 0.05 * mid: chg = 'new'
    else: chg = f'×{mid / base:.1f}'
    fmt = lambda x: f'{x:,.{dec}f}'
    OUT[t] = dict(label=lab, unit=unit, base=base, lo=lo, hi=hi, change=chg, n=len(w40), n20=len(v20),
                  who=[NAME[i] for i in w40], text=f"{fmt(base) if base is not None else '–'} → " + (f"{fmt(lo)}" if fmt(lo) == fmt(hi) else f"{fmt(lo)}–{fmt(hi)}") + f" {unit}", note=note,
                  per_pathway={NAME[i]: round(v, 2) for i, v in w40.items()})
json.dump(OUT, open('table3_recomputed.json', 'w'), indent=1, ensure_ascii=False)
for t, o in OUT.items(): print(t, o.get('text'), o.get('change'), 'n=', o.get('n'))
