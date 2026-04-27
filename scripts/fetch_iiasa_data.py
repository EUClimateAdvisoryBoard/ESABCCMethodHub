#!/usr/bin/env python3
"""
EU Climate Policy Navigator — pyam data fetcher.

Uses the pyam package (v3.x) to connect to IIASA Scenario Explorer databases
and download scenario data. This is the same API the web interface proxies.

Prerequisites:
    pip install pyam-iamc

Usage examples:
    # List available ixmp4 platforms
    python scripts/fetch_iiasa_data.py --list-platforms

    # List EU-related regions in a database
    python scripts/fetch_iiasa_data.py --db ar6 --list-eu-regions

    # Fetch EU27 CO2 emissions from AR6
    python scripts/fetch_iiasa_data.py --db ar6 --region "EU27" --variable "Emissions|CO2"

    # Export to JSON for the web frontend
    python scripts/fetch_iiasa_data.py --db ar6 --region "EU27" --variable "Emissions|CO2" --output data.json

Databases (legacy Scenario Explorer, via valid_connections):
    ar6, sr15, ngfs_phase_4, engage, ...

Platforms (new ixmp4, via platforms()):
    ecemf, shape, ssp, ssp-extensions, ...
"""

import argparse
import json
import sys

try:
    import pyam
except ImportError:
    print("ERROR: pyam not installed. Run: pip install pyam-iamc")
    sys.exit(1)


EU27_ALIASES = [
    "EU27", "EU27+UK", "EU", "Europe", "EU-27",
    "Europe (EU27)", "Europe (EU27+UK)", "Western Europe",
]


def list_platforms():
    """List all available ixmp4 platforms hosted by IIASA."""
    print("ixmp4 platforms hosted by IIASA:")
    print("-" * 50)
    pyam.iiasa.platforms()

    print("\nLegacy Scenario Explorer connections:")
    print("-" * 50)
    pyam.iiasa.valid_connections()


def fetch_data(db_name: str, region=None, variable=None, model=None, scenario=None):
    """Connect to IIASA and fetch scenario data using pyam.read_iiasa()."""
    print(f"Connecting to IIASA database: {db_name}")

    # Build filter kwargs
    kwargs = {}
    if region:
        kwargs["region"] = region
    if variable:
        kwargs["variable"] = variable
    if model:
        kwargs["model"] = model
    if scenario:
        kwargs["scenario"] = scenario

    if kwargs:
        print(f"Filters: {kwargs}")

    df = pyam.read_iiasa(db_name, **kwargs)

    print(f"\nLoaded {len(df)} timeseries")
    print(f"  Models:    {df.model}")
    print(f"  Scenarios: {df.scenario}")
    print(f"  Variables: {df.variable}")
    print(f"  Regions:   {df.region}")

    return df


def find_eu_regions(db_name: str):
    """List all EU-related regions in a database."""
    print(f"Connecting to {db_name} to find EU regions...")

    conn = pyam.iiasa.Connection(db_name)
    # For legacy databases, regions available via .regions or .nodes
    try:
        regions = conn.regions() if callable(getattr(conn, 'regions', None)) else []
    except Exception:
        regions = []

    if not regions:
        # Try reading a small subset to get region info
        try:
            df = pyam.read_iiasa(db_name, variable="Emissions|CO2")
            regions = list(df.region)
        except Exception as e:
            print(f"Could not fetch regions: {e}")
            return

    eu_regions = [r for r in regions if any(a.lower() in r.lower() for a in EU27_ALIASES)]
    print(f"\nEU-related regions in {db_name}:")
    for r in sorted(eu_regions):
        print(f"  * {r}")
    print(f"\nAll regions ({len(regions)}):")
    for r in sorted(regions):
        print(f"  - {r}")


def export_json(df, output_path: str):
    """Export pyam IamDataFrame to JSON."""
    data = df.as_pandas()
    records = data.to_dict(orient="records")
    with open(output_path, "w") as f:
        json.dump(records, f, indent=2, default=str)
    print(f"Exported {len(records)} records to {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Fetch IIASA scenario data using pyam")
    parser.add_argument("--db", default="ar6", help="Database/platform name (e.g. 'ar6', 'ecemf')")
    parser.add_argument("--region", default=None, help="Region filter (e.g. 'EU27', 'World')")
    parser.add_argument("--variable", default=None, help="Variable filter (e.g. 'Emissions|CO2')")
    parser.add_argument("--model", default=None, help="Model filter (supports wildcards: 'MESSAGE*')")
    parser.add_argument("--scenario", default=None, help="Scenario filter")
    parser.add_argument("--list-platforms", action="store_true", help="List available IIASA platforms")
    parser.add_argument("--list-eu-regions", action="store_true", help="List EU-related regions")
    parser.add_argument("--output", default=None, help="Export to JSON file")
    args = parser.parse_args()

    if args.list_platforms:
        list_platforms()
        return

    if args.list_eu_regions:
        find_eu_regions(args.db)
        return

    df = fetch_data(args.db, args.region, args.variable, args.model, args.scenario)

    if args.output:
        export_json(df, args.output)
    else:
        print("\nPreview (first 20 rows):")
        print(df.timeseries().head(20))
        print(f"\nUse --output <path.json> to export.")


if __name__ == "__main__":
    main()
