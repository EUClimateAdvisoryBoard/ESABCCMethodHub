"""Table 3, version 2: only the best-fitting tiles, each with a Eurostat 2024 starting value and the 2040 range across
the current ECL set; plus the JRC (2026) 2030 scale-up needs quoted in the chapter draft.
AI-compiled - pending Secretariat verification.

Best fit = (1) the indicator measures the need in its cell directly (no loose proxy), (2) Eurostat publishes the same
quantity, (3) at least 5 of the 6 ECL pathways report it with the same definition.
Change = from Eurostat 2024 to the middle of the 2040 range (x for multiples, pp for shares)."""
import csv, json, os
H = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(H, 'dl_eurostat')
def es(fname):
    d = json.load(open(os.path.join(D, fname))); dims, sizes = d['id'], d['size']
    idx = [sorted(d['dimension'][k]['category']['index'], key=lambda c: d['dimension'][k]['category']['index'][c]) for k in dims]
    out = {}
    for flat, v in d['value'].items():
        flat = int(flat); co = []
        for s in reversed(sizes): co.append(flat % s); flat //= s
        out[tuple(idx[j][c] for j, c in enumerate(co[::-1]))] = v
    return out, d.get('updated')
BAL, upd_bal = es('nrg_bal_c2466.json'); GAE, _ = es('nrg_bal_c0f66.json'); CAP, upd_cap = es('cap.json')
b = lambda nb, si, y='2024': BAL[('A', nb, si, 'GWH', 'EU27_2020', y)] / 1000
EUROSTAT = {
 'elec_use': (b('FC_E', 'E7000'), 'TWh', 'nrg_bal_c: final consumption - energy use (FC_E), electricity (E7000), GWh/1000'),
 'elec_share': (b('FC_E', 'E7000') / b('FC_E', 'TOTAL') * 100, '%', 'nrg_bal_c: FC_E electricity / FC_E all products'),
 'ind_bio': (b('FC_IND_E', 'BIOE'), 'TWh', 'nrg_bal_c: final consumption - industry - energy use (FC_IND_E), bioenergy (BIOE)'),
 'solar_cap': (CAP[('A', 'RA420', 'CAP_NET_ELC', 'MW', 'EU27_2020', '2024')] / 1000, 'GW', 'nrg_inf_epcrw: net maximum electrical capacity, solar PV (RA420)'),
 'wind_cap': (CAP[('A', 'RA300', 'CAP_NET_ELC', 'MW', 'EU27_2020', '2024')] / 1000, 'GW', 'nrg_inf_epcrw: net maximum electrical capacity, wind (RA300)'),
 'bio_primary': (GAE[('A', 'GAE', 'BIOE', 'TJ', 'EU27_2020', '2024')] / 1e6, 'EJ', 'nrg_bal_c: gross available energy (GAE), bioenergy (BIOE), TJ/1e6'),
}
IDS = ['779', '1266', '1275', '3162', '2400', '2000']
NAME = {'779': 'ESABCC REMIND 3.2', '1266': 'Schreyer CCS180', '1275': 'Schreyer CCS350', '3162': 'Rodrigues', '2400': 'CETO 2024', '2000': 'Agora'}
V = {}
for f in ('remind_tiles.csv', 'jrc_tiles.csv', 'ecagora_tiles.csv'):
    for r in csv.DictReader(open(os.path.join(H, f), encoding='utf-8')):
        if r['ID'] in IDS and r['value'].strip():
            try: V[(r['item'], r['ID'], r['year'])] = float(r['value'])
            except ValueError: pass
EXCL = {('bio_primary', '2000'): 'Agora includes waste (3.4 EJ), not the same quantity as Eurostat bioenergy'}
LAB = {'elec_use': 'Electricity use', 'elec_share': 'Electricity share', 'ind_bio': 'Industry bioenergy', 'solar_cap': 'Solar', 'wind_cap': 'Wind', 'bio_primary': 'Bioenergy'}
DEC = {'bio_primary': 1}
# Scope check: the models' own 2020 values must sit within +-15 % of Eurostat 2020, otherwise a Eurostat start value and
# model 2040 values measure different things and the change would be an artefact. Tiles that fail are dropped.
ES2020 = {'elec_use': b('FC_E', 'E7000', '2020'), 'elec_share': b('FC_E', 'E7000', '2020') / b('FC_E', 'TOTAL', '2020') * 100,
          'ind_bio': b('FC_IND_E', 'BIOE', '2020'), 'solar_cap': CAP[('A', 'RA420', 'CAP_NET_ELC', 'MW', 'EU27_2020', '2020')] / 1000,
          'wind_cap': CAP[('A', 'RA300', 'CAP_NET_ELC', 'MW', 'EU27_2020', '2020')] / 1000, 'bio_primary': GAE[('A', 'GAE', 'BIOE', 'TJ', 'EU27_2020', '2020')] / 1e6}
CHECK, DROP = {}, {}
for t in EUROSTAT:
    m = {NAME[i]: V[(t, i, '2020')] for i in IDS if (t, i, '2020') in V and (t, i) not in EXCL}
    dev = {k: v / ES2020[t] - 1 for k, v in m.items()}
    CHECK[t] = dict(eurostat_2020=round(ES2020[t], 2), model_2020={k: round(v, 2) for k, v in m.items()}, deviation={k: f'{x:+.0%}' for k, x in dev.items()})
    bad = [k for k, x in dev.items() if abs(x) > 0.15]
    if bad: DROP[t] = 'model 2020 values differ from Eurostat 2020 by more than 15 % for ' + ', '.join(f'{k} ({dev[k]:+.0%})' for k in bad)
OUT = {'_base': f'Eurostat 2024 (nrg_bal_c updated {upd_bal[:10]}; nrg_inf_epcrw updated {upd_cap[:10]})', 'tiles': {}}
OUT['scope_check'] = CHECK; OUT['dropped'] = DROP
for t, (base, unit, src) in EUROSTAT.items():
    if t in DROP: continue
    w = {i: V[(t, i, '2040')] for i in IDS if (t, i, '2040') in V and (t, i) not in EXCL}
    lo, hi = min(w.values()), max(w.values()); mid = (lo + hi) / 2
    chg = f'{mid - base:+.0f} pp' if unit == '%' else f'×{mid / base:.1f}'
    d = DEC.get(t, 0); fm = lambda x: f'{x:,.{d}f}'
    OUT['tiles'][t] = dict(label=LAB[t], unit=unit, base=round(base, 3), lo=lo, hi=hi, change=chg, n=len(w), source=src,
                           text=f'{fm(base)} → {fm(lo)}–{fm(hi)} {unit}', per_pathway={NAME[i]: round(v, 2) for i, v in w.items()},
                           excluded={NAME[i]: why for (tt, i), why in EXCL.items() if tt == t})
# JRC (2026) 2030 scale-up needs, as quoted in the chapter draft ("Industrial products for decarbonising other sectors").
OUT['jrc2030'] = {
 'wind': dict(label='Wind', change='×3–4', note='annual installations, 2024 → 2030 need'),
 'solar': dict(label='Solar PV', change='≈ on track', note='annual installations close to the 2030 pace'),
 'heat_pumps': dict(label='Heat pumps', change='×3–4', note='annual installations, 2024 → 2030 need'),
 'batteries': dict(label='Batteries', change='×6', note='annual deployment, 2024 → 2030 need'),
 'electrolysers': dict(label='Electrolysers', change='×60', note='annual installations, 2024 → 2030 need'),
 '_source': 'JRC (2026), as quoted in the chapter draft; not re-verified against the JRC publication in this pass.'}
json.dump(OUT, open(os.path.join(H, 'table3_v2.json'), 'w'), indent=1, ensure_ascii=False)
for t, o in OUT['tiles'].items(): print(t, o['text'], o['change'], 'n=', o['n'])
for t, why in DROP.items(): print('DROPPED', t, why)
for t, c in CHECK.items(): print('check', t, c['eurostat_2020'], c['deviation'])
