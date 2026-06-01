"""Emit a Postgres migration that seeds the 51 ESABCC report indicators
plus their historical data points into pw_indicators / pw_indicator_points.

Mirrors the format of supabase/migrations/040_seed_full_ecno_indicators.sql
so the two seed migrations look identical to a future maintainer.
Idempotent: both inserts use `on conflict do nothing`.
"""
import json
import importlib.util
import sys

# Reuse the RECIPES + helpers from build.py
spec = importlib.util.spec_from_file_location('build', 'scripts/esabcc-indicators/build.py')
build = importlib.util.module_from_spec(spec)
# Suppress print output from build.py by capturing stdout
import io
_buf = io.StringIO()
_orig = sys.stdout
sys.stdout = _buf
spec.loader.exec_module(build)
sys.stdout = _orig

DATA = build.DATA
RECIPES = build.RECIPES
find_series = build.find_series


def sql_str(s):
    if s is None:
        return 'null'
    return "'" + str(s).replace("'", "''") + "'"


def num(v):
    if v is None:
        return 'null'
    if isinstance(v, (int, float)):
        if v == 0:
            return '0'
        av = abs(v)
        if av >= 100:
            return f'{v:.1f}'
        if av >= 10:
            return f'{v:.3f}'
        if av >= 1:
            return f'{v:.4f}'
        return f'{v:.5f}'
    return 'null'


print(
    "-- ─────────────────────────────────────────────────────────────────────────────\n"
    "-- Seed the 51 ESABCC report progress indicators (O1-O3, E1-E6, I1-I7,\n"
    "-- T1-T6, B1-B6, A1-A7, L1-L8, finance/innovation F1-F5) plus their\n"
    "-- historical time series into pw_indicators / pw_indicator_points for\n"
    "-- the 'policy-gap-2-0' project.\n"
    "--\n"
    "-- Companion to 040_seed_full_ecno_indicators.sql — same rationale:\n"
    "-- the app-level seeder in src/lib/project-workspace/db.ts cannot\n"
    "-- insert these rows when the server uses the anon key, because the\n"
    "-- pw_indicators RLS policy requires auth.uid() is not null. Seeding\n"
    "-- here in a migration sidesteps that.\n"
    "--\n"
    "-- Both inserts are idempotent (on conflict do nothing).\n"
    "-- ─────────────────────────────────────────────────────────────────────────────\n\n"
    "insert into public.pw_indicators\n"
    "  (id, project_id, name, category, unit, description, source, source_url,\n"
    "   direction, target_value, target_year, is_seed)\n"
    "values"
)

rows = []
all_points = []
for r in RECIPES:
    s = find_series(r['sheet'], r['series'])
    if not s:
        continue
    unit = r.get('unitOverride') or s['unit'] or ''
    tv, ty = (r['target'][0], r['target'][1]) if r.get('target') else (None, None)
    rows.append(
        f"  ({sql_str(r['id'])}, 'policy-gap-2-0', {sql_str(r['name'])}, "
        f"{sql_str(r['category'])}, {sql_str(unit)}, {sql_str(r['description'])}, "
        f"{sql_str(r['sourceShort'])}, {sql_str(r['sourceUrl'])}, "
        f"{sql_str(r['direction'])}, {num(tv)}, {ty if ty is not None else 'null'}, true)"
    )
    for p in s['data']:
        if isinstance(p['value'], (int, float)):
            all_points.append((r['id'], p['year'], p['value']))

print(',\n'.join(rows))
print('on conflict (id) do nothing;')
print()
print('insert into public.pw_indicator_points (indicator_id, year, value)')
print('values')
pts = [f"  ({sql_str(pid)}, {yr}, {num(v)})" for pid, yr, v in all_points]
print(',\n'.join(pts))
print('on conflict (indicator_id, year) do nothing;')
