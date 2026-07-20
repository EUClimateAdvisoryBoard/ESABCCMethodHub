#!/usr/bin/env python3
"""
electrification_lcm.py — a stylised least-cost model of EU end-use
electrification, built for the ETS Review submodule.

WHAT IT IS
----------
A transparent, dependency-free least-cost *technology-choice* model for the
2040 target year. Final energy demand in the three electrifiable end-use
sectors — buildings heat, road transport, industry heat — is split into
adoption tranches ordered by their barrier-adjusted marginal abatement cost.
For a given uniform carbon price P (a collapsed ETS1+ETS2), the model adopts
every tranche whose switching cost is <= P. This merit-order adoption IS the
optimum of the separable cost-minimisation

    min  sum_i [ x_i * (annualised_electric_cost_i - fossil_cost_i
                        + barrier_i - P * abatement_i) ]
    s.t. x_i in {0,1}   (adopt tranche i or not)

because the tranches are independent and the per-tranche cost is linear in the
carbon price: the argmin is simply "adopt iff switching_cost_i <= P". The model
sweeps P to trace the electrification-rate supply curve R(P), and reports the
price needed to reach a target electrification rate (default 46%) under two
policy regimes: carbon price only, and carbon price + a demand-side package.

WHAT IT IS NOT
--------------
Not PyPSA-Eur, not an IAM, no hourly dispatch. It is a policy-analysis MACC
model whose barrier-cost distributions are calibrated to the hidden-cost
literature and to the sector MAC midpoints already used in this repo's
pypsa-service (Power 45, Buildings 110, Road transport 140, Industry 80/180
EUR/t). Treat the *gap* between the two curves and the *ordering* as robust;
treat absolute price levels as indicative. See ets-review/model/README.md.

USAGE
-----
    python3 electrification_lcm.py                 # headline result + curves
    python3 electrification_lcm.py --target 50     # different target rate
    python3 electrification_lcm.py --sensitivity   # barrier-cost tornado
    python3 electrification_lcm.py --json          # machine-readable dump

Everything the interactive explorer exposes as a slider is an argument here.
"""
from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Tuple


# --------------------------------------------------------------------------- #
# Assumptions — every field here is a "slider" in the interactive explorer.    #
# --------------------------------------------------------------------------- #
@dataclass
class Assumptions:
    # Target-year framing
    target_rate_pct: float = 46.0        # electrification rate to hit (Action Plan: 46% by 2040)
    baseline_rate_pct: float = 26.0      # autonomous 2040 rate with no new policy
    technical_max_pct: float = 60.0      # direct-electrification ceiling (Eurelectric)

    # Additional electrification potential above baseline, by sector (pp of final energy).
    # Sums to technical_max - baseline = 34 pp. Ordered easy->hard within each sector.
    potential_pp: Dict[str, float] = field(default_factory=lambda: {
        "buildings": 14.0,               # heat pumps (space + water heat)
        "transport": 13.0,               # road EVs
        "industry": 7.0,                 # electric/high-temp heat-pump process heat
    })

    # Barrier-adjusted switching-cost curve per sector, EUR/tCO2:
    #   switch_cost(f) = base + spread * f**gamma        (f = cumulative adoption 0..1)
    # base   : low-barrier entry cost (operating-economics driven)
    # spread : barrier spread to the hard tail (split incentives, capital, hassle)
    # gamma  : convexity of the hard tail
    base_eur_t:   Dict[str, float] = field(default_factory=lambda: {
        "buildings": 40.0, "transport": 28.0, "industry": 62.0})
    spread_eur_t: Dict[str, float] = field(default_factory=lambda: {
        "buildings": 385.0, "transport": 265.0, "industry": 300.0})
    gamma:        Dict[str, float] = field(default_factory=lambda: {
        "buildings": 1.7, "transport": 1.6, "industry": 1.9})

    # Global uncertainty multiplier on ALL barrier spreads (tornado band ~ +/-25%).
    barrier_multiplier: float = 1.0

    # ---- Demand-side package (the flanking measures) ----
    measures_on: bool = False
    # fraction of each sector's *barrier spread* removed by regulation/standards/subsidy
    measure_strength: Dict[str, float] = field(default_factory=lambda: {
        "buildings": 0.65, "transport": 0.70, "industry": 0.55})
    # electricity-price reform: EUR/tCO2-equivalent downward shift on EVERY tranche's
    # base, from improving the electricity-to-gas running-cost ratio (Pillar 1).
    elec_price_reform_eur_t: float = 28.0

    # Sweep resolution
    tranches_per_sector: int = 40
    price_max: float = 500.0
    price_step: float = 1.0


# --------------------------------------------------------------------------- #
# Core model                                                                  #
# --------------------------------------------------------------------------- #
@dataclass
class Tranche:
    sector: str
    size_pp: float          # percentage points of final-energy electrification
    switch_cost: float      # EUR/tCO2 at which it flips fossil -> electric


def build_tranches(a: Assumptions, with_measures: bool) -> List[Tranche]:
    """Discretise each sector's switching-cost curve into ordered tranches."""
    out: List[Tranche] = []
    for s, pot in a.potential_pp.items():
        n = a.tranches_per_sector
        size = pot / n
        spread = a.spread_eur_t[s] * a.barrier_multiplier
        base = a.base_eur_t[s]
        if with_measures:
            spread *= (1.0 - a.measure_strength[s])
            base -= a.elec_price_reform_eur_t
        for i in range(n):
            f = (i + 0.5) / n
            c = base + spread * (f ** a.gamma[s])
            out.append(Tranche(sector=s, size_pp=size, switch_cost=c))
    out.sort(key=lambda t: t.switch_cost)
    return out


def electrification_rate(a: Assumptions, tranches: List[Tranche], price: float) -> float:
    """Least-cost electrification rate (%) at a given carbon price."""
    r = a.baseline_rate_pct
    for t in tranches:
        if t.switch_cost <= price:
            r += t.size_pp
    return r


def price_for_target(a: Assumptions, tranches: List[Tranche],
                     target: float) -> float | None:
    """Lowest carbon price that reaches `target` electrification rate."""
    p = 0.0
    while p <= a.price_max:
        if electrification_rate(a, tranches, p) >= target:
            return p
        p += a.price_step
    return None  # target above technical max at any price


def sector_breakdown(a: Assumptions, tranches: List[Tranche],
                     price: float) -> Dict[str, float]:
    """Electrification pp delivered per sector at a price (excl. baseline)."""
    by: Dict[str, float] = {s: 0.0 for s in a.potential_pp}
    for t in tranches:
        if t.switch_cost <= price:
            by[t.sector] += t.size_pp
    return by


def curve(a: Assumptions, tranches: List[Tranche]) -> List[Tuple[float, float]]:
    pts, p = [], 0.0
    while p <= a.price_max:
        pts.append((p, electrification_rate(a, tranches, p)))
        p += a.price_step
    return pts


# --------------------------------------------------------------------------- #
# Physical translation: pp of final energy -> TWh electricity & Mt CO2         #
# --------------------------------------------------------------------------- #
FINAL_ENERGY_TWH_2040 = 8100.0   # EU final energy demand ~2040 (efficiency-adjusted)
# Effective CO2 displaced per pp of final-energy electrification (Mt/yr per pp),
# blended across the fossil fuels each sector displaces.
MT_PER_PP = 43.5


def physical_outputs(a: Assumptions, added_pp: float) -> Dict[str, float]:
    twh = FINAL_ENERGY_TWH_2040 * added_pp / 100.0
    return {"new_electricity_twh": round(twh),
            "abatement_mt": round(added_pp * MT_PER_PP)}


# --------------------------------------------------------------------------- #
# Scenario runner                                                             #
# --------------------------------------------------------------------------- #
def run(a: Assumptions) -> Dict:
    tr_price_only = build_tranches(a, with_measures=False)
    tr_measures = build_tranches(a, with_measures=True)

    p_only = price_for_target(a, tr_price_only, a.target_rate_pct)
    p_meas = price_for_target(a, tr_measures, a.target_rate_pct)

    added = a.target_rate_pct - a.baseline_rate_pct
    result = {
        "target_rate_pct": a.target_rate_pct,
        "baseline_rate_pct": a.baseline_rate_pct,
        "price_only_eur_t": p_only,
        "with_measures_eur_t": p_meas,
        "gap_eur_t": (None if p_only is None or p_meas is None
                      else round(p_only - p_meas)),
        "ets2_trigger_eur_t": 45,
        "added_pp": round(added, 1),
        "physical_at_target": physical_outputs(a, added),
        "sector_breakdown_price_only": {
            k: round(v, 1) for k, v in
            sector_breakdown(a, tr_price_only, p_only or a.price_max).items()},
        "sector_breakdown_measures": {
            k: round(v, 1) for k, v in
            sector_breakdown(a, tr_measures, p_meas or a.price_max).items()},
    }
    return result


def sensitivity(a: Assumptions) -> List[Dict]:
    """Tornado on the barrier-cost multiplier (the doc's +/-25% band)."""
    rows = []
    for mult, label in [(0.75, "-25% barriers"), (1.0, "central"),
                        (1.25, "+25% barriers")]:
        aa = Assumptions(**{**asdict(a), "barrier_multiplier": mult})
        r = run(aa)
        rows.append({"case": label,
                     "price_only_eur_t": r["price_only_eur_t"],
                     "with_measures_eur_t": r["with_measures_eur_t"],
                     "gap_eur_t": r["gap_eur_t"]})
    return rows


# --------------------------------------------------------------------------- #
# CLI                                                                         #
# --------------------------------------------------------------------------- #
def main() -> None:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--target", type=float, default=46.0,
                   help="target electrification rate %% (default 46)")
    p.add_argument("--baseline", type=float, default=26.0)
    p.add_argument("--barrier-mult", type=float, default=1.0,
                   help="global barrier-cost multiplier (0.75/1.0/1.25)")
    p.add_argument("--sensitivity", action="store_true")
    p.add_argument("--json", action="store_true")
    args = p.parse_args()

    a = Assumptions(target_rate_pct=args.target,
                    baseline_rate_pct=args.baseline,
                    barrier_multiplier=args.barrier_mult)
    res = run(a)

    if args.json:
        out = {"result": res}
        if args.sensitivity:
            out["sensitivity"] = sensitivity(a)
        print(json.dumps(out, indent=2))
        return

    print("=" * 66)
    print(f"  EU end-use electrification — least-cost model (target year 2040)")
    print("=" * 66)
    print(f"  Target electrification rate : {res['target_rate_pct']:.0f}% "
          f"(baseline {res['baseline_rate_pct']:.0f}%, +{res['added_pp']} pp)")
    print("-" * 66)
    po = res["price_only_eur_t"]; pm = res["with_measures_eur_t"]
    print(f"  Carbon price ONLY           : ~{po:>4.0f} EUR/tCO2")
    print(f"  Carbon price + demand-side  : ~{pm:>4.0f} EUR/tCO2")
    print(f"  Shadow value of measures    :  {res['gap_eur_t']:>4} EUR/tCO2 (the gap)")
    print(f"  ETS2 price-stability trigger:    45 EUR/tCO2  "
          f"(price-only is {po/45:.1f}x the trigger)")
    print("-" * 66)
    phys = res["physical_at_target"]
    print(f"  At the target: +{phys['new_electricity_twh']:.0f} TWh electricity, "
          f"~{phys['abatement_mt']:.0f} Mt CO2/yr abated")
    print("-" * 66)
    print("  Electrification by sector at target (pp of final energy):")
    for s in a.potential_pp:
        print(f"    {s:<10}  price-only {res['sector_breakdown_price_only'][s]:>4.1f}"
              f"   with-measures {res['sector_breakdown_measures'][s]:>4.1f}")
    if args.sensitivity:
        print("-" * 66)
        print("  Sensitivity (barrier-cost band):")
        print(f"    {'case':<16}{'price-only':>12}{'w/ measures':>13}{'gap':>7}")
        for row in sensitivity(a):
            print(f"    {row['case']:<16}{row['price_only_eur_t']:>10.0f} "
                  f"{row['with_measures_eur_t']:>12.0f}{row['gap_eur_t']:>7.0f}")
    print("=" * 66)


if __name__ == "__main__":
    main()
