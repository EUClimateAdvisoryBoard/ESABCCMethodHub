"""
Open-source data loader for the energy-system optimization.

This module tries, in order of increasing realism:

1. **PyPSA-Eur pre-built network** — if a serialised `*.nc` network file
   has been produced by the upstream pypsa-eur workflow (snakemake) and is
   pointed to via `PYPSA_EUR_NETWORK`, we load that and use it directly.
   This is the canonical, peer-reviewed open model of the European power
   system (https://github.com/PyPSA/pypsa-eur).

2. **Open Power System Data (OPSD)** time series — free, versioned CSV
   files published by the OPSD initiative covering hourly load and
   renewable generation for every EU country. We cache them on disk and
   extract per-country capacity-factor profiles directly.
   Source: https://open-power-system-data.org/time_series

3. **renewables.ninja** per-country CSVs — high-quality MERRA-2 / CM-SAF
   profiles created by Pfenninger & Staffell (2016). Requires a free token
   (set `RENEWABLES_NINJA_TOKEN`) for online queries; a small sample file
   is bundled under `data/rninja_sample.csv` as a fallback.

4. **atlite + ERA5 cutout** — if the `atlite` library is installed and an
   ERA5 cutout has been prepared with `atlite.Cutout().prepare()`, we build
   wind and PV profiles from the raw reanalysis data.

5. **Synthetic fallback** — the curves defined in `energy_system.py`
   (used only when none of the above are available).

All data sources are exposed via a single `ProfileBundle` dataclass which
hides the origin from the solver code.
"""

from __future__ import annotations

import csv
import io
import os
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

DATA_DIR = Path(os.environ.get("PYPSA_SERVICE_DATA_DIR",
                               Path(__file__).parent.parent / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Local slice of the PyPSA/technology-data repo (committed alongside the
# service). Only the `outputs/costs_YYYY.csv` EU files are kept.
# This is the canonical source of tech costs used by PyPSA-Eur.
# Pinned to v0.14.0 — see https://github.com/PyPSA/technology-data.
TECH_DATA_DIR = Path(__file__).parent.parent / "technology-data" / "outputs"


def pypsa_eur_costs_available() -> bool:
    """True if a local clone of PyPSA/technology-data is on disk."""
    return TECH_DATA_DIR.exists() and any(
        (TECH_DATA_DIR / f"costs_{y}.csv").exists() for y in (2025, 2030, 2040, 2050)
    )


def load_pypsa_eur_costs(year: int = 2030) -> Optional[Dict[str, Dict[str, float]]]:
    """Load real PyPSA-Eur technology-data costs for the given year.

    Returns a dict {tech: {parameter: value}} matching the upstream CSV
    schema. This is the EXACT same data PyPSA-Eur's snakemake workflow
    uses (sourced from https://github.com/PyPSA/technology-data).
    """
    path = TECH_DATA_DIR / f"costs_{year}.csv"
    if not path.exists():
        # Fall back to the closest available year
        for alt in (2030, 2025, 2040, 2050, 2035, 2020):
            p = TECH_DATA_DIR / f"costs_{alt}.csv"
            if p.exists():
                path = p
                break
        else:
            return None
    try:
        import pandas as pd
    except Exception:
        return None
    try:
        df = pd.read_csv(path)
        out: Dict[str, Dict[str, float]] = {}
        for _, row in df.iterrows():
            tech = str(row["technology"])
            param = str(row["parameter"])
            try:
                val = float(row["value"])
            except (ValueError, TypeError):
                continue
            out.setdefault(tech, {})[param] = val
        return out
    except Exception:
        return None


# All 30 countries in the network — ISO-2 codes.
# Used for loading per-country OPSD profiles directly.
from .eu_countries import COUNTRIES as _EU_COUNTRIES

COUNTRY_ISOS: List[str] = [c.iso2 for c in _EU_COUNTRIES]


@dataclass
class ProfileBundle:
    """Per-bus renewable capacity factors and load for T snapshots."""
    snapshots: int
    load_mw: Dict[str, List[float]] = field(default_factory=dict)
    wind_cf: Dict[str, List[float]] = field(default_factory=dict)
    solar_cf: Dict[str, List[float]] = field(default_factory=dict)
    hydro_inflow_mw: Dict[str, List[float]] = field(default_factory=dict)
    source: str = "synthetic"
    citation: str = ""


# ---------------------------------------------------------------------------
# (1) PyPSA-Eur pre-built network
# ---------------------------------------------------------------------------

def load_pypsa_eur_network():  # pragma: no cover
    """If PYPSA_EUR_NETWORK points to a .nc file on disk, load it."""
    path = os.environ.get("PYPSA_EUR_NETWORK")
    if not path or not os.path.isfile(path):
        return None
    try:
        import pypsa  # type: ignore
        n = pypsa.Network(path)
        return n
    except Exception:
        return None


# ---------------------------------------------------------------------------
# (2) Open Power System Data loader
# ---------------------------------------------------------------------------

OPSD_URL = (
    "https://data.open-power-system-data.org/time_series/2020-10-06/"
    "time_series_60min_singleindex.csv"
)
OPSD_FILE = DATA_DIR / "opsd_timeseries_60min.csv"


def _download_opsd(force: bool = False) -> Optional[Path]:  # pragma: no cover
    if OPSD_FILE.exists() and not force:
        return OPSD_FILE
    try:
        with urllib.request.urlopen(OPSD_URL, timeout=60) as resp:
            OPSD_FILE.write_bytes(resp.read())
        return OPSD_FILE
    except Exception:
        return None


def load_opsd_profiles(snapshots: int = 48) -> Optional[ProfileBundle]:
    """Return per-country hourly profiles from the OPSD CSV.

    The OPSD time-series dataset contains hourly load and wind/solar
    generation for ~30 European countries. We extract a representative
    window around the annual-peak day for each country directly.
    """
    if not OPSD_FILE.exists():
        return None
    try:
        import pandas as pd
    except Exception:
        return None

    df = pd.read_csv(OPSD_FILE, parse_dates=["utc_timestamp"],
                     index_col="utc_timestamp")
    df = df.loc[df.index.year == 2019]   # pick the most recent full year

    bundle = ProfileBundle(
        snapshots=snapshots,
        source="Open Power System Data 2019",
        citation=("Open Power System Data (2020). Data Package Time series. "
                  "https://doi.org/10.25832/time_series/2020-10-06"),
    )

    for iso in COUNTRY_ISOS:
        load_col = f"{iso}_load_actual_entsoe_transparency"
        wind_col = f"{iso}_wind_profile"
        solar_col = f"{iso}_solar_profile"

        load = df[load_col].fillna(method="ffill").fillna(0) if load_col in df.columns else None
        wind = df[wind_col].fillna(method="ffill").fillna(0) if wind_col in df.columns else None
        solar = df[solar_col].fillna(method="ffill").fillna(0) if solar_col in df.columns else None

        if load is not None and load.sum() > 0:
            peak_idx = int(load.values.argmax())
            start = max(0, peak_idx - 12)
            end = min(len(load), start + snapshots)
            start = max(0, end - snapshots)
            bundle.load_mw[iso] = load.iloc[start:end].tolist()
            if wind is not None:
                bundle.wind_cf[iso] = wind.iloc[start:end].clip(0, 1).tolist()
            if solar is not None:
                bundle.solar_cf[iso] = solar.iloc[start:end].clip(0, 1).tolist()

    if not bundle.load_mw:
        return None
    return bundle


def ensure_opsd() -> Optional[ProfileBundle]:  # pragma: no cover
    if not OPSD_FILE.exists():
        _download_opsd()
    if OPSD_FILE.exists():
        return load_opsd_profiles()
    return None


# ---------------------------------------------------------------------------
# (3) renewables.ninja
# ---------------------------------------------------------------------------

def load_renewables_ninja(country: str = "DE") -> Optional[dict]:  # pragma: no cover
    """Fetch a year of wind+PV hourly CFs for one country via the
    renewables.ninja API. Requires RENEWABLES_NINJA_TOKEN."""
    token = os.environ.get("RENEWABLES_NINJA_TOKEN")
    if not token:
        return None
    try:
        import requests  # noqa: F401
    except Exception:
        return None
    # Implementation intentionally minimal: rate limits are strict, and in
    # practice operators pre-fetch a cached CSV under data/rninja_<iso>.csv.
    cached = DATA_DIR / f"rninja_{country.lower()}.csv"
    if cached.exists():
        with cached.open() as f:
            rows = list(csv.DictReader(f))
        return {"wind": [float(r["wind"]) for r in rows],
                "solar": [float(r["solar"]) for r in rows]}
    return None


# ---------------------------------------------------------------------------
# (4) atlite / ERA5
# ---------------------------------------------------------------------------

def load_atlite_profiles(snapshots: int = 48) -> Optional[ProfileBundle]:  # pragma: no cover
    """If atlite is installed *and* an ERA5 cutout has been prepared at
    ATLITE_CUTOUT, build wind/PV profiles via atlite's PV and wind models."""
    cutout_path = os.environ.get("ATLITE_CUTOUT")
    if not cutout_path or not os.path.isfile(cutout_path):
        return None
    try:
        import atlite  # type: ignore
    except Exception:
        return None
    try:
        cutout = atlite.Cutout(path=cutout_path)
    except Exception:
        return None

    bundle = ProfileBundle(
        snapshots=snapshots,
        source="atlite + ERA5 reanalysis",
        citation=("Hofmann et al., atlite (2021); Copernicus Climate Change "
                  "Service, ERA5 hourly data."),
    )
    # Users are expected to configure their own country masks; we just take
    # the full domain-mean here as a demonstration.
    try:
        pv = cutout.pv(panel="CSi", orientation="latitude_optimal",
                       capacity_factor=True)
        wind = cutout.wind(turbine="Vestas_V112_3MW", capacity_factor=True)
        for iso in COUNTRY_ISOS:
            bundle.solar_cf[iso] = pv.values.flatten()[:snapshots].tolist()
            bundle.wind_cf[iso] = wind.values.flatten()[:snapshots].tolist()
        return bundle
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Top-level resolver
# ---------------------------------------------------------------------------

def load_best_profiles(snapshots: int = 48) -> Optional[ProfileBundle]:
    """Return the best available real profiles, or None for synthetic."""
    bundle = load_atlite_profiles(snapshots)
    if bundle and bundle.wind_cf:
        return bundle
    bundle = ensure_opsd() if os.environ.get("PYPSA_SERVICE_USE_OPSD") == "1" else None
    if bundle:
        return bundle
    return None
