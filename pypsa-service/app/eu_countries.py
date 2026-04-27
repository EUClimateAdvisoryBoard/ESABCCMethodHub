"""
Country metadata for the 30-bus EU energy-system LP.

Kept deliberately in the service package (not downloaded at runtime) so
the LP is reproducible offline. Values are 2030 reference projections
from ENTSO-E TYNDP 2022, EMBER European Electricity Review 2024 and
the European Commission Impact Assessment for the 2040 Climate Target.

This file must stay in sync with `src/lib/eu-countries.ts`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple


@dataclass(frozen=True)
class CountrySpec:
    iso2: str
    iso3: str
    name: str
    lat: float
    lon: float
    demand_twh: float          # annual electricity demand 2030 reference
    wind_onshore_scale: float  # climatological onshore-wind CF adjustment
    wind_offshore_scale: float # offshore-wind CF adjustment (0 = landlocked)
    solar_scale: float          # solar CF climate multiplier
    hydro_twh: float            # ~2020-2022 hydro generation (run-of-river + reservoir)
    coastal: bool               # has offshore wind potential


COUNTRIES: List[CountrySpec] = [
    CountrySpec("AT", "AUT", "Austria",        47.5,  14.5,  75.0, 0.75, 0.00, 0.88, 42.0, False),
    CountrySpec("BE", "BEL", "Belgium",        50.5,   4.5,  92.0, 0.90, 1.05, 0.90,  0.4, True),
    CountrySpec("BG", "BGR", "Bulgaria",       42.7,  25.5,  38.0, 0.80, 0.00, 1.10,  4.8, False),
    CountrySpec("HR", "HRV", "Croatia",        45.2,  16.0,  19.0, 0.80, 0.75, 1.05,  6.5, True),
    CountrySpec("CY", "CYP", "Cyprus",         35.1,  33.4,   6.0, 0.70, 0.90, 1.35,  0.0, True),
    CountrySpec("CZ", "CZE", "Czechia",        49.8,  15.5,  75.0, 0.80, 0.00, 0.85,  1.9, False),
    CountrySpec("DK", "DNK", "Denmark",        56.0,   9.5,  42.0, 1.15, 1.35, 0.85, 0.02, True),
    CountrySpec("EE", "EST", "Estonia",        58.8,  25.5,  10.0, 1.00, 1.05, 0.75, 0.03, True),
    CountrySpec("FI", "FIN", "Finland",        63.5,  26.0, 100.0, 0.95, 1.05, 0.70, 14.5, True),
    CountrySpec("FR", "FRA", "France",         46.5,   2.5, 505.0, 0.92, 1.10, 1.00, 58.0, True),
    CountrySpec("DE", "DEU", "Germany",        51.0,  10.5, 620.0, 0.95, 1.20, 0.92, 18.5, True),
    CountrySpec("GR", "GRC", "Greece",         39.0,  22.5,  58.0, 0.85, 0.95, 1.30,  4.2, True),
    CountrySpec("HU", "HUN", "Hungary",        47.2,  19.5,  48.0, 0.70, 0.00, 0.95,  0.2, False),
    CountrySpec("IE", "IRL", "Ireland",        53.1,  -8.0,  33.0, 1.20, 1.30, 0.78,  0.7, True),
    CountrySpec("IT", "ITA", "Italy",          42.5,  12.5, 335.0, 0.82, 0.85, 1.15, 48.0, True),
    CountrySpec("LV", "LVA", "Latvia",         56.9,  24.6,   8.0, 0.95, 1.00, 0.78,  2.8, True),
    CountrySpec("LT", "LTU", "Lithuania",      55.2,  23.9,  13.0, 0.92, 1.00, 0.80,  0.9, True),
    CountrySpec("LU", "LUX", "Luxembourg",     49.8,   6.1,   8.0, 0.80, 0.00, 0.88,  0.1, False),
    CountrySpec("NL", "NLD", "Netherlands",    52.1,   5.4, 128.0, 1.05, 1.30, 0.90, 0.04, True),
    CountrySpec("PL", "POL", "Poland",         52.0,  19.5, 188.0, 0.88, 1.05, 0.85,  2.3, True),
    CountrySpec("PT", "PRT", "Portugal",       39.5,  -8.0,  55.0, 0.95, 1.10, 1.25, 12.0, True),
    CountrySpec("RO", "ROU", "Romania",        45.8,  25.0,  62.0, 0.80, 0.90, 1.00, 16.5, True),
    CountrySpec("SK", "SVK", "Slovakia",       48.7,  19.7,  31.0, 0.72, 0.00, 0.90,  4.5, False),
    CountrySpec("SI", "SVN", "Slovenia",       46.1,  14.8,  16.0, 0.75, 0.70, 0.95,  4.2, True),
    CountrySpec("ES", "ESP", "Spain",          40.0,  -3.7, 295.0, 0.95, 1.05, 1.30, 25.0, True),
    CountrySpec("SE", "SWE", "Sweden",         62.0,  15.0, 158.0, 0.95, 1.15, 0.70, 70.0, True),
    CountrySpec("NO", "NOR", "Norway",         61.5,   9.0, 150.0, 1.00, 1.25, 0.68, 140.0, True),
    CountrySpec("CH", "CHE", "Switzerland",    46.8,   8.2,  65.0, 0.70, 0.00, 0.95, 38.0, False),
    CountrySpec("GB", "GBR", "United Kingdom", 54.0,  -2.0, 345.0, 1.10, 1.35, 0.80,  6.5, True),
]

ISO_INDEX: Dict[str, CountrySpec] = {c.iso2: c for c in COUNTRIES}


# ENTSO-E Winter Outlook 2023/24 net-transfer-capacity matrix (GW).
# A positive entry means `a → b` export is allowed up to that value;
# `p_min_pu = -1` in PyPSA makes the link symmetric so b → a uses the
# same capacity. When the model runs with a user-supplied
# grid_expansion_factor > 1 these values are scaled uniformly.
INTERCONNECTORS: List[Tuple[str, str, float, str]] = [
    # Nordic
    ("NO", "SE", 3.7, "AC"),
    ("NO", "DK", 1.7, "HVDC"),
    ("NO", "NL", 0.7, "HVDC"),
    ("NO", "GB", 1.4, "HVDC"),
    ("NO", "DE", 1.4, "HVDC"),
    ("SE", "FI", 2.7, "AC"),
    ("SE", "DK", 2.5, "AC"),
    ("SE", "DE", 0.6, "HVDC"),
    ("SE", "PL", 0.6, "HVDC"),
    ("SE", "LT", 0.7, "HVDC"),
    ("FI", "EE", 1.0, "HVDC"),
    # Baltic ring
    ("EE", "LV", 1.0, "AC"),
    ("LV", "LT", 1.0, "AC"),
    ("LT", "PL", 0.5, "HVDC"),
    # Continental core
    ("DK", "DE", 3.5, "AC"),
    ("DK", "NL", 0.7, "HVDC"),
    ("DK", "GB", 1.4, "HVDC"),
    ("DE", "NL", 5.0, "AC"),
    ("DE", "BE", 1.0, "HVDC"),
    ("DE", "FR", 3.0, "AC"),
    ("DE", "CH", 4.2, "AC"),
    ("DE", "AT", 7.5, "AC"),
    ("DE", "CZ", 2.5, "AC"),
    ("DE", "PL", 3.5, "AC"),
    ("DE", "LU", 2.3, "AC"),
    ("NL", "BE", 2.4, "AC"),
    ("NL", "GB", 1.0, "HVDC"),
    ("BE", "FR", 3.0, "AC"),
    ("BE", "GB", 1.0, "HVDC"),
    ("BE", "LU", 1.0, "AC"),
    ("LU", "FR", 1.7, "AC"),
    ("FR", "ES", 4.0, "AC"),
    ("FR", "IT", 4.3, "AC"),
    ("FR", "CH", 3.7, "AC"),
    ("FR", "GB", 5.0, "HVDC"),
    ("IE", "GB", 1.0, "HVDC"),
    ("ES", "PT", 4.2, "AC"),
    # Alpine / Med
    ("CH", "IT", 4.2, "AC"),
    ("CH", "AT", 1.5, "AC"),
    ("IT", "AT", 0.3, "AC"),
    ("IT", "SI", 2.0, "AC"),
    ("IT", "GR", 0.5, "HVDC"),
    # Central-East
    ("AT", "CZ", 1.8, "AC"),
    ("AT", "HU", 1.2, "AC"),
    ("AT", "SI", 1.5, "AC"),
    ("CZ", "PL", 1.0, "AC"),
    ("CZ", "SK", 1.1, "AC"),
    ("PL", "SK", 1.0, "AC"),
    ("SK", "HU", 1.8, "AC"),
    ("HU", "RO", 1.5, "AC"),
    ("HU", "HR", 0.9, "AC"),
    ("HU", "SI", 1.2, "AC"),
    ("HR", "SI", 1.2, "AC"),
    # Balkans
    ("RO", "BG", 1.3, "AC"),
    ("BG", "GR", 1.6, "AC"),
]


# Indicative 2030 per-country technology potentials (GW). Built from
# ENSPRESO (JRC) for wind/solar, EMBER for existing thermal fleet and
# national energy plans (NECPs) for nuclear.
def country_potentials(c: CountrySpec) -> Dict[str, float]:
    d = c.demand_twh
    load_gw = d / 8.76  # average load
    return {
        "onwind":   max(10.0, load_gw * 3.5) if c.wind_onshore_scale > 0 else 5.0,
        "offwind":  max(2.0, load_gw * 3.0) if c.coastal else 0.0,
        "solar":    max(8.0, load_gw * (4.0 if c.solar_scale > 1.1 else 3.0)),
        "nuclear":  (load_gw * 1.6) if c.iso2 in {"FR", "BE", "CZ", "SK", "FI", "HU", "SI", "NL", "SE", "GB", "BG", "RO"} else 0.0,
        "hydro_res": max(c.hydro_twh * 0.25, 0.5) if c.hydro_twh > 1 else 0.0,
        "ror":      max(c.hydro_twh * 0.15, 0.2) if c.hydro_twh > 1 else 0.0,
        "gas_ocgt": load_gw * 0.8,
        "gas_ccgt": load_gw * 1.0,
        "coal":     load_gw * 0.4 if c.iso2 in {"DE", "PL", "CZ", "BG", "RO", "GR", "IT", "ES", "NL", "FI"} else 0.0,
        "biomass":  max(1.0, load_gw * 0.15),
        "battery":  load_gw * 1.2,
        "h2":       load_gw * 0.6,
    }
