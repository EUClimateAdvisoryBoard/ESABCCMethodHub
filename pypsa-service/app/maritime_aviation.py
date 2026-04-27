"""
International bunkering fuel-route optimization and marginal abatement cost
(MAC) curve for the maritime and aviation sectors.

Scope: international bunkers only (extra-EU shipping and extra-EU aviation)
— i.e. the fuels burned in tanks uplifted in EU ports/airports for voyages
leaving the EU. These are traditionally outside national inventories but the
ESABCC recommends a dedicated policy treatment.

For each sector we solve a small LP:

    minimise  Σ_f  (cost_f · x_f)
    s.t.       Σ_f x_f = annual_energy_demand_PJ
               Σ_f (ci_f · x_f) / Σ_f x_f  ≤  target_intensity
               lower_f ≤ x_f ≤ upper_f    (TRL / availability limits)

where f ∈ {fossil, bio/SAF, HVO, e-methanol, e-ammonia, e-kerosene, LNG, LH2, ...}.

We then sweep the CO₂-intensity target to trace the sector MAC curve:
each step on the curve is the incremental abatement cost (€/tCO₂) of the next
cheapest fuel switch. These sector curves are plotted next to typical MAC
estimates for other sectors (power, industry, buildings, road transport) so
policy-makers can compare where bunker abatement ranks.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import numpy as np
from scipy.optimize import linprog


# ---------------------------------------------------------------------------
# Fuel database (indicative 2030 assumptions from IEA / IRENA / Transport & Env.)
# ---------------------------------------------------------------------------

@dataclass
class Fuel:
    name: str
    sector: str                 # "shipping", "aviation", or "both"
    cost_eur_per_gj: float      # delivered cost
    ci_kg_co2_per_gj: float     # well-to-wake CO2-eq intensity
    trl: int                    # 1-9 technology readiness level
    max_share_2030: float       # supply-side / TRL cap (0..1)
    min_share_2030: float = 0.0 # e.g. blending mandates


# Illustrative 2030 values (midpoint of published ranges).
# NB: a real study would pull from the underlying literature; these are
# suitable for a browser-accessible MAC-curve demonstration.
FUELS: Dict[str, Fuel] = {
    # Shipping ---------------------------------------------------------
    "hfo":         Fuel("Heavy Fuel Oil (VLSFO)", "shipping", 14.0, 90.0, 9, 1.00),
    "mgo":         Fuel("Marine Gas Oil",         "shipping", 18.0, 91.0, 9, 0.80),
    "lng_marine":  Fuel("LNG (marine)",           "shipping", 17.0, 75.0, 9, 0.40),
    "biomethanol": Fuel("Bio-methanol",           "shipping", 32.0, 28.0, 8, 0.15),
    "emethanol":   Fuel("E-methanol",             "shipping", 45.0,  6.0, 7, 0.25),
    "green_nh3":   Fuel("Green ammonia",          "shipping", 50.0, 10.0, 6, 0.25),
    "green_h2":    Fuel("Liquid hydrogen (ship)", "shipping", 55.0, 10.0, 5, 0.10),
    # Aviation ---------------------------------------------------------
    "jet_a1":      Fuel("Jet A-1 (fossil)",       "aviation", 16.0, 89.0, 9, 1.00),
    "hefa_saf":    Fuel("HEFA SAF (bio)",         "aviation", 38.0, 25.0, 8, 0.20),
    "atj_saf":     Fuel("Alcohol-to-Jet SAF",     "aviation", 42.0, 22.0, 7, 0.15),
    "ft_saf":      Fuel("Fischer-Tropsch SAF",    "aviation", 48.0, 15.0, 7, 0.15),
    "ekerosene":   Fuel("E-kerosene (PtL)",       "aviation", 60.0,  5.0, 6, 0.25),
    "lh2_aero":    Fuel("Liquid hydrogen (aero)", "aviation", 65.0, 10.0, 4, 0.05),
}


# Reference international bunker demand in the EU (2030, PJ/yr)
BUNKER_DEMAND_PJ: Dict[str, float] = {
    "shipping": 1_750.0,   # ≈ 42 Mt HFO-eq (Eurostat 2022 intl maritime bunkers)
    "aviation": 1_600.0,   # ≈ 37 Mt Jet-A1 (Eurostat 2023 intl aviation bunkers)
}


# ---------------------------------------------------------------------------
# MAC curves for other sectors (indicative EU-27 2030, €/tCO2 at 50% abatement)
# Values are illustrative midpoints of published literature ranges (IEA NZE,
# EC Impact Assessment for the 2040 Climate Target, ESABCC 2040 advice).
# ---------------------------------------------------------------------------

OTHER_SECTORS_MAC: List[Dict[str, Any]] = [
    {"sector": "Power",              "abatement_mt": 420, "mac_eur_per_t": 45},
    {"sector": "Industry (light)",   "abatement_mt": 110, "mac_eur_per_t": 80},
    {"sector": "Industry (heavy)",   "abatement_mt": 140, "mac_eur_per_t": 180},
    {"sector": "Buildings",          "abatement_mt": 180, "mac_eur_per_t": 110},
    {"sector": "Road transport",     "abatement_mt": 260, "mac_eur_per_t": 140},
    {"sector": "Agriculture",        "abatement_mt":  55, "mac_eur_per_t": 220},
]


# ---------------------------------------------------------------------------
# Fuel route optimization
# ---------------------------------------------------------------------------

@dataclass
class FuelMixResult:
    sector: str
    shares: Dict[str, float] = field(default_factory=dict)     # fuel → share (0..1)
    energy_pj: Dict[str, float] = field(default_factory=dict)  # fuel → PJ
    total_cost_beur: float = 0.0
    avg_cost_eur_per_gj: float = 0.0
    ci_kg_per_gj: float = 0.0
    co2_mt: float = 0.0
    abatement_mt: float = 0.0
    target_ci_kg_per_gj: float = 0.0
    status: str = "ok"


def _sector_fuels(sector: str) -> List[str]:
    return [k for k, f in FUELS.items() if f.sector == sector]


def optimize_fuel_mix(sector: str, target_ci_kg_per_gj: float,
                      demand_pj: Optional[float] = None) -> FuelMixResult:
    """Least-cost fuel mix for the sector under a CI target."""
    fuel_ids = _sector_fuels(sector)
    demand = demand_pj if demand_pj is not None else BUNKER_DEMAND_PJ[sector]
    c = np.array([FUELS[f].cost_eur_per_gj for f in fuel_ids], dtype=float)

    # Equality: total energy = demand
    A_eq = np.ones((1, len(fuel_ids)))
    b_eq = np.array([demand])

    # Inequality: Σ ci*x - target*Σx ≤ 0 → Σ (ci - target)*x ≤ 0
    ci = np.array([FUELS[f].ci_kg_co2_per_gj for f in fuel_ids])
    A_ub = (ci - target_ci_kg_per_gj).reshape(1, -1)
    b_ub = np.array([0.0])

    bounds = [(FUELS[f].min_share_2030 * demand, FUELS[f].max_share_2030 * demand)
              for f in fuel_ids]

    res = linprog(c, A_ub=A_ub, b_ub=b_ub, A_eq=A_eq, b_eq=b_eq,
                  bounds=bounds, method="highs")

    out = FuelMixResult(sector=sector, target_ci_kg_per_gj=target_ci_kg_per_gj)
    if not res.success:
        out.status = f"infeasible: {res.message}"
        return out

    x = res.x
    out.energy_pj = {FUELS[f].name: round(float(xi), 1) for f, xi in zip(fuel_ids, x)}
    out.shares = {FUELS[f].name: round(float(xi / demand), 3)
                  for f, xi in zip(fuel_ids, x)}
    out.total_cost_beur = round(float(c @ x) / 1000, 2)   # €/GJ · PJ = M€ → /1000 = B€
    out.avg_cost_eur_per_gj = round(float(res.fun / demand), 2)
    out.ci_kg_per_gj = round(float(ci @ x / demand), 2)
    out.co2_mt = round(float(ci @ x) / 1e3, 2)            # kg/GJ · PJ = kt → /1000 = Mt

    # Baseline: 100 % reference fossil fuel
    ref_fuel = "hfo" if sector == "shipping" else "jet_a1"
    baseline_co2 = FUELS[ref_fuel].ci_kg_co2_per_gj * demand / 1e3  # Mt
    out.abatement_mt = round(baseline_co2 - out.co2_mt, 2)
    return out


def build_mac_curve(sector: str, steps: int = 10) -> List[Dict[str, Any]]:
    """Sweep the CI target from baseline to deep decarbonisation and
    record each feasible point on the marginal abatement cost curve."""
    ref_fuel = "hfo" if sector == "shipping" else "jet_a1"
    baseline_ci = FUELS[ref_fuel].ci_kg_co2_per_gj
    targets = np.linspace(baseline_ci * 0.98, 5.0, steps)

    curve: List[Dict[str, Any]] = []
    prev_cost = None
    prev_co2 = None
    for tgt in targets:
        res = optimize_fuel_mix(sector, float(tgt))
        if res.status != "ok":
            continue
        point = {
            "target_ci": round(float(tgt), 1),
            "avg_cost_eur_per_gj": res.avg_cost_eur_per_gj,
            "co2_mt": res.co2_mt,
            "abatement_mt": res.abatement_mt,
        }
        if prev_cost is not None and prev_co2 is not None:
            d_cost = res.total_cost_beur - prev_cost         # B€
            d_co2 = prev_co2 - res.co2_mt                    # Mt abated
            if d_co2 > 1e-3:
                point["marginal_cost_eur_per_t"] = round(d_cost * 1e3 / d_co2, 1)
        curve.append(point)
        prev_cost = res.total_cost_beur
        prev_co2 = res.co2_mt
    return curve


def sector_comparison() -> Dict[str, Any]:
    """Compare maritime + aviation MAC with the other major sectors."""
    ship_curve = build_mac_curve("shipping")
    aero_curve = build_mac_curve("aviation")

    def representative_cost(curve: List[Dict[str, Any]]) -> float:
        """Average marginal cost across the feasible segment (€/t)."""
        vals = [p["marginal_cost_eur_per_t"] for p in curve
                if "marginal_cost_eur_per_t" in p and p["marginal_cost_eur_per_t"] > 0]
        return round(float(np.mean(vals)), 1) if vals else 0.0

    def total_abatement(curve: List[Dict[str, Any]]) -> float:
        return round(curve[-1]["abatement_mt"], 1) if curve else 0.0

    rows = list(OTHER_SECTORS_MAC)
    rows.append({
        "sector": "International shipping (bunkers)",
        "abatement_mt": total_abatement(ship_curve),
        "mac_eur_per_t": representative_cost(ship_curve),
    })
    rows.append({
        "sector": "International aviation (bunkers)",
        "abatement_mt": total_abatement(aero_curve),
        "mac_eur_per_t": representative_cost(aero_curve),
    })
    rows.sort(key=lambda r: r["mac_eur_per_t"])
    return {
        "shipping_curve": ship_curve,
        "aviation_curve": aero_curve,
        "sector_comparison": rows,
    }
