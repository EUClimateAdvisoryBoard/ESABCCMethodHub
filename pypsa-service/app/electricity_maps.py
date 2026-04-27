"""
Electricity Maps API client.

https://api-portal.electricitymaps.com/

Uses the free `auth-token` header authentication. Set
`ELECTRICITY_MAPS_TOKEN` in the environment.

Endpoints wrapped:
    /v3/carbon-intensity/latest?zone=DE
    /v3/carbon-intensity/history?zone=DE
    /v3/power-breakdown/latest?zone=DE
    /v3/power-breakdown/history?zone=DE
    /v3/zones                                (list supported zones)
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Optional

API = "https://api.electricitymaps.com/v3"


def _request(path: str, params: Optional[Dict[str, Any]] = None,
             timeout: int = 20) -> Dict[str, Any]:
    token = os.environ.get("ELECTRICITY_MAPS_TOKEN", "")
    query = "?" + urllib.parse.urlencode(params) if params else ""
    url = f"{API}{path}{query}"
    req = urllib.request.Request(url, headers={
        "auth-token": token,
        "Accept": "application/json",
        "User-Agent": "EU-Climate-Policy-Hub/0.1",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace") if hasattr(exc, "read") else ""
        return {"error": f"HTTP {exc.code}", "detail": body, "hint":
                "Set ELECTRICITY_MAPS_TOKEN — free tier available at "
                "https://api-portal.electricitymaps.com/"}
    except Exception as exc:
        return {"error": str(exc)}


def list_zones() -> Dict[str, Any]:
    return _request("/zones")


def carbon_intensity_latest(zone: str) -> Dict[str, Any]:
    return _request("/carbon-intensity/latest", {"zone": zone})


def carbon_intensity_history(zone: str) -> Dict[str, Any]:
    return _request("/carbon-intensity/history", {"zone": zone})


def power_breakdown_latest(zone: str) -> Dict[str, Any]:
    return _request("/power-breakdown/latest", {"zone": zone})


def power_breakdown_history(zone: str) -> Dict[str, Any]:
    return _request("/power-breakdown/history", {"zone": zone})


# Per-country Electricity Maps zone codes. Some countries have multiple
# bidding zones; we list all sub-zones so the frontend can aggregate them.
COUNTRY_ZONES: Dict[str, list] = {
    "AT": ["AT"],
    "BE": ["BE"],
    "BG": ["BG"],
    "HR": ["HR"],
    "CY": ["CY"],
    "CZ": ["CZ"],
    "DK": ["DK-DK1", "DK-DK2"],
    "EE": ["EE"],
    "FI": ["FI"],
    "FR": ["FR"],
    "DE": ["DE"],
    "GR": ["GR"],
    "HU": ["HU"],
    "IE": ["IE"],
    "IT": ["IT-NO", "IT-CNO", "IT-CSO", "IT-SO", "IT-SAR", "IT-SIC"],
    "LV": ["LV"],
    "LT": ["LT"],
    "LU": ["LU"],
    "NL": ["NL"],
    "PL": ["PL"],
    "PT": ["PT"],
    "RO": ["RO"],
    "SK": ["SK"],
    "SI": ["SI"],
    "ES": ["ES"],
    "SE": ["SE-SE1", "SE-SE2", "SE-SE3", "SE-SE4"],
    "NO": ["NO-NO1", "NO-NO2", "NO-NO3", "NO-NO4", "NO-NO5"],
    "CH": ["CH"],
    "GB": ["GB"],
}
