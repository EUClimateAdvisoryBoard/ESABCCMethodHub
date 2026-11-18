#!/usr/bin/env python3
"""Generate src/data/industry-scenario-screening.generated.ts from the
industry scenario screening workbook
(public/data/industry-scenario-screening/Scenario_database.xlsx).

The workbook is the scenario database behind the EEA deck "EU industry
emission pathways in scenario databases: screening against the ESABCC
criteria" (EEA for the ESABCC Secretariat, 18 November 2026). It holds the
1,008 pathways with EU industry data from ten scenario pools, the 289-run
REMIND-EU ensemble (Rodrigues et al. 2026), the risk-level sensitivity, the
assumption ranges, the ESABCC 2040 runs, the ScenarioMIP-CMIP7 Very Low
pathways, the UBA/Fraunhofer ISI (2026) values and the EEA inventory series.

The script copies values; it computes nothing that it stores. It does
recompute the two formula sheets (Pools and Sensitivity) from the row data,
using the workbook's own COUNTIFS criteria, and exits non-zero if any count
differs from the value Excel cached. That check is what keeps the screening
logic in the Scenario database tab (which recomputes the same counts live)
honest against the workbook.

Run: python3 scripts/build-industry-scenario-screening.py
"""
import json
import os
import sys

try:
    import openpyxl
except ImportError:
    sys.exit('openpyxl is required: pip install openpyxl')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = os.path.join(ROOT, 'public', 'data', 'industry-scenario-screening', 'Scenario_database.xlsx')
OUT = os.path.join(ROOT, 'src', 'data', 'industry-scenario-screening.generated.ts')

RANGE_LO, RANGE_HI = 84.95, 95.05  # README: 84.95 <= red2040 < 95.05


def rows_of(ws, header_row=1):
    rows = list(ws.iter_rows(values_only=True))
    header = rows[header_row - 1]
    out = []
    for r in rows[header_row:]:
        if all(v is None for v in r):
            continue
        out.append(dict(zip(header, r)))
    return header, out


def num(v):
    if v is None:
        return None
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return round(float(v), 4) if isinstance(v, float) else v
    return v


def le(v, limit):
    """Excel COUNTIFS "<=limit": a blank cell never matches."""
    return isinstance(v, (int, float)) and not isinstance(v, bool) and v <= limit


def in_range(v):
    return isinstance(v, (int, float)) and RANGE_LO <= v < RANGE_HI


def main():
    if not os.path.exists(XLSX):
        sys.exit(f'workbook not found: {XLSX}')
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    errors = []

    # ── README ────────────────────────────────────────────────────────────
    readme = [r[0] for r in wb['README'].iter_rows(values_only=True)]

    # ── All_pathways ──────────────────────────────────────────────────────
    p_header, pathways = rows_of(wb['All_pathways'])
    if len(pathways) != 1008:
        errors.append(f'All_pathways: expected 1,008 rows, found {len(pathways)}')
    for p in pathways:
        fe = p.get('filter_exclusions')
        if isinstance(fe, str):
            try:
                p['filter_exclusions'] = json.loads(fe.replace("'", '"'))
            except json.JSONDecodeError:
                errors.append(f'unparseable filter_exclusions for {p["model"]} / {p["scenario"]}: {fe}')

    # ── Pools (recompute the COUNTIFS) ────────────────────────────────────
    _, pools_raw = rows_of(wb['Pools'])
    pools = []
    for row in pools_raw:
        name = row['pool']
        if name is None or name == 'Treated separately':
            continue
        if name == 'Total':
            sub = pathways
        elif name in {p['pool'] for p in pathways}:
            sub = [p for p in pathways if p['pool'] == name]
        else:
            # The separately treated sets (REMIND-EU, UBA) are carried as notes.
            pools.append({'pool': name, 'publicationYears': row['publication_years'],
                          'pathways': row['pathways'], 'netZero2050': row['net_zero_2050'],
                          'in8595': row['in_85_95'], 'filterPass': row['esabcc_filter_pass'],
                          'withinRisk': row['within_risk_levels'], 'separate': True})
            continue
        calc = {
            'pathways': len(sub),
            'net_zero_2050': sum(1 for p in sub if p['net_zero_2050'] is True),
            'in_85_95': sum(1 for p in sub if p['stage'] >= 2),
            'esabcc_filter_pass': sum(1 for p in sub if p['stage'] >= 3),
            'within_risk_levels': sum(1 for p in sub if p['stage'] >= 4),
        }
        for k, v in calc.items():
            if row[k] != v:
                errors.append(f'Pools/{name}/{k}: workbook {row[k]} vs recomputed {v}')
        if name == 'Total':
            continue
        pools.append({'pool': name, 'publicationYears': row['publication_years'],
                      'pathways': calc['pathways'], 'netZero2050': calc['net_zero_2050'],
                      'in8595': calc['in_85_95'], 'filterPass': calc['esabcc_filter_pass'],
                      'withinRisk': calc['within_risk_levels'], 'separate': False})

    # ── REMIND_EU ─────────────────────────────────────────────────────────
    r_header, remind = rows_of(wb['REMIND_EU'])
    if len(remind) != 289:
        errors.append(f'REMIND_EU: expected 289 runs, found {len(remind)}')

    # ── Sensitivity (recompute the COUNTIFS) ──────────────────────────────
    sens = []
    for row in wb['Sensitivity'].iter_rows(min_row=2, values_only=True):
        if row[0] is None or row[4] is None:
            continue
        variant, cap, bio, land, mm_book, re_book = row[:6]
        def passes_mm(p):
            if not (in_range(p['red2040_pct']) and p['esabcc_filter_pass'] is True):
                return False
            if cap is None:
                return True
            return le(p['cap2050'], cap) and le(p['bio2050_EJ'], bio) and le(p['land_sink2050'], land)
        def passes_re(r):
            if not (r['net_zero_2050'] is True and in_range(r['red2040_pct']) and r['esabcc_filter_pass'] is True):
                return False
            if cap is None:
                return True
            return le(r['cap2050'], cap) and le(r['bio2050_EJ'], bio) and le(r['land_sink2050'], land)
        mm = sum(1 for p in pathways if passes_mm(p))
        re_ = sum(1 for r in remind if passes_re(r))
        if mm != mm_book:
            errors.append(f'Sensitivity/{variant}: multi-model workbook {mm_book} vs recomputed {mm}')
        if re_ != re_book:
            errors.append(f'Sensitivity/{variant}: REMIND-EU workbook {re_book} vs recomputed {re_}')
        sens.append({'variant': variant, 'captureLimit': cap, 'biomassLimitEJ': bio,
                     'landSinkLimit': land, 'multiModelRemaining': mm, 'remindEuRemaining': re_})
    sens_note = next((r[0] for r in wb['Sensitivity'].iter_rows(values_only=True)
                      if r[0] and str(r[0]).startswith('Counts cover')), None)

    # ── Assumptions (forward-fill the grouped columns) ────────────────────
    _, assum_raw = rows_of(wb['Assumptions'])
    assumptions, cur = [], {}
    for r in assum_raw:
        if r['indicator']:
            cur = {'indicator': r['indicator'], 'unit': r['unit'], 'today': r['today']}
        assumptions.append({**cur, 'pathwaySet': r['pathway_set'], 'min': num(r['min']),
                            'median': num(r['median']), 'max': num(r['max']),
                            'sourceNote': r['source_note']})

    # ── ESABCC_2040, CMIP7_VeryLow, UBA_2026, Inventory ───────────────────
    def titled(name, header_row=3):
        ws = wb[name]
        title = ws.cell(1, 1).value
        header, rows = rows_of(ws, header_row)
        return title, header, rows

    esabcc_title, _, esabcc = titled('ESABCC_2040')
    cmip_title, cmip_header, cmip = titled('CMIP7_VeryLow')
    uba_title, _, uba = titled('UBA_2026')
    inv_title, _, inventory = titled('Inventory')

    if errors:
        print('Workbook check FAILED — nothing written:', file=sys.stderr)
        for e in errors:
            print('  ' + e, file=sys.stderr)
        sys.exit(1)

    P_COLS = [c for c in p_header]
    R_COLS = [c for c in r_header]
    data = {
        'README': readme,
        'POOLS': pools,
        'PATHWAY_COLUMNS': P_COLS,
        'PATHWAY_ROWS': [[num(p[c]) if c != 'filter_exclusions' else p[c] for c in P_COLS] for p in pathways],
        'REMIND_COLUMNS': R_COLS,
        'REMIND_ROWS': [[num(r[c]) for c in R_COLS] for r in remind],
        'SENSITIVITY': sens,
        'SENSITIVITY_NOTE': sens_note,
        'ASSUMPTIONS': assumptions,
        'ESABCC_2040_TITLE': esabcc_title,
        'ESABCC_2040': [{'scenario': r['scenario'], 'red2040': num(r['red2040_pct_board_metric']),
                         'cap2050': num(r['cap2050']), 'bio2050EJ': num(r['bio2050_EJ']),
                         'landSink2050': num(r['land_sink2050_harmonised']),
                         'withinEnvRisk': r['within_env_risk_levels'],
                         'withinTechRisk': r['within_tech_risk_levels'],
                         'basisOfAdvice': r['basis_of_2040_advice']} for r in esabcc],
        'CMIP7_TITLE': cmip_title,
        'CMIP7_YEARS': [int(y) for y in cmip_header[1:]],
        'CMIP7': [{'pathway': r['pathway'], 'values': [num(r[y]) for y in cmip_header[1:]]} for r in cmip],
        'UBA_TITLE': uba_title,
        'UBA': [{'scenario': r['scenario'], 'item': r['item'], 'value': r['value'],
                 'reference': r['reference']} for r in uba],
        'INVENTORY_TITLE': inv_title,
        'INVENTORY': [{'year': r['year'], 'industry': num(r['industry_inventory']),
                       'pastTrend': num(r['past_trend_regression']), 'wem': num(r['wem']),
                       'wam': num(r['wam']), 'euNetGhg': num(r['eu_net_ghg_inventory'])}
                      for r in inventory],
    }

    def js(v):
        return json.dumps(v, ensure_ascii=False, separators=(',', ':'))

    lines = [
        '/**',
        ' * GENERATED FILE — do not edit by hand.',
        ' * Source: public/data/industry-scenario-screening/Scenario_database.xlsx',
        ' * Built by: python3 scripts/build-industry-scenario-screening.py',
        ' *',
        ' * Scenario database behind the EEA deck "EU industry emission pathways in',
        ' * scenario databases: screening against the ESABCC criteria" (EEA for the',
        ' * ESABCC Secretariat, 18 November 2026). Pools and Sensitivity counts were',
        ' * recomputed from the row data and matched the workbook before writing.',
        ' *',
        ' * AI-compiled — pending human verification. The workbook marks Scenario',
        ' * Compass data as under manuscript embargo (internal use only).',
        ' */',
        '/* eslint-disable */',
        '',
    ]
    for k, v in data.items():
        # Literal types only for the column lists (used to index rows); the
        # row arrays stay widened so the type checker is not handed 30,000
        # literal types.
        suffix = ' as const' if k.endswith('_COLUMNS') else ''
        lines.append(f'export const {k} = {js(v)}{suffix};')
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    print(f'wrote {os.path.relpath(OUT, ROOT)}: {len(pathways)} pathways, {len(remind)} REMIND-EU runs, '
          f'{len(sens)} sensitivity variants — all workbook counts reproduced')


if __name__ == '__main__':
    main()
