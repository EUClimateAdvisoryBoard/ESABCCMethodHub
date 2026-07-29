#!/usr/bin/env python3
"""
Pull the EU's agriculture + LULUCF inventory tables from the UNFCCC Data
Interface (di.unfccc.int), for the twelve ESABCC report indicators that no
other source can serve.
====================================================================

WHY THIS EXISTS
---------------
Eurostat's `env_air_gge` carries CRF *emissions* only. Twelve of our indicators
need CRF *area and activity* data, or a livestock split that `env_air_gge`
does not publish:

    L2 (x6)   land area by category          CRF Table 4.1
    L3        afforested area                CRF land-conversion tables
    L4        deforested area                CRF land-conversion tables
    L5        land converted to settlements  CRF land-conversion tables
    A3 (use)  synthetic fertiliser N applied CRF 3.D activity data
    A2 (x4)   dairy vs non-dairy cattle GHG  CRF 3.A.1.a / 3.A.1.b

The UNFCCC DI API has all of it. It is unreachable from the Claude Code web
sandbox -- di.unfccc.int answers HTTP 200 there but the body is an Imperva
bot-protection challenge, not data. From an ordinary network it is normally
fine, which is what this script is for.

RUN IT
------
    pip install unfccc-di-api pandas
    python3 scripts/esabcc-indicators/pull-unfccc-di.py

It writes ./unfccc-di-out/ and prints a summary. Send that folder back (zip it,
it compresses well) and the twelve indicators get wired the same way the
FAOSTAT ones were -- no manual data entry.

If it fails with an Imperva/challenge error from your machine too, say so and
we fall back to the spreadsheet for those twelve.

NOTHING IS WRITTEN TO THE REPO DATA FILES BY THIS SCRIPT. It only reads.
"""
import sys
import os
import traceback

OUT = os.path.join(os.getcwd(), "unfccc-di-out")


def die(msg, hint=""):
    print(f"\n  FAILED: {msg}")
    if hint:
        print(f"  {hint}")
    sys.exit(1)


def main():
    try:
        import pandas as pd
    except ImportError:
        die("pandas is not installed.", "Run:  pip install pandas")
    try:
        import unfccc_di_api
    except ImportError:
        die("unfccc-di-api is not installed.", "Run:  pip install unfccc-di-api")

    os.makedirs(OUT, exist_ok=True)
    print(f"Writing to {OUT}\n")

    # ── 1. Connect. This is the step that fails behind bot protection. ───────
    print("[1/4] Connecting to di.unfccc.int ...")
    try:
        reader = unfccc_di_api.UNFCCCApiReader()
    except Exception as e:
        print(traceback.format_exc())
        die(
            f"could not open the DI API ({type(e).__name__}: {e})",
            "If the message mentions Incapsula/Imperva, a challenge page, or JSON\n"
            "  decoding, the API is blocking this network too -- that is the answer we\n"
            "  needed. Try once more on a different connection (e.g. off VPN), then\n"
            "  report back.",
        )
    print("      connected.\n")

    # ── 2. Find the EU party code. Don't hardcode it -- DI has several EU
    #       entities (Convention vs KP scope) and the right one varies. ───────
    print("[2/4] Resolving the EU party code ...")
    parties = reader.parties
    parties.to_csv(os.path.join(OUT, "parties.csv"), index=False)
    name_col = "name" if "name" in parties.columns else parties.columns[-1]
    code_col = "code" if "code" in parties.columns else parties.columns[0]
    eu = parties[parties[name_col].str.contains("European Union", case=False, na=False)]
    if eu.empty:
        die("no party matching 'European Union'.", f"See {OUT}/parties.csv and tell me what is there.")
    eu_codes = list(eu[code_col])
    print(f"      candidates: {', '.join(f'{r[code_col]} = {r[name_col]}' for _, r in eu.iterrows())}")

    # ── 3. Dump the code lists, so the CRF categories and measures can be
    #       mapped to indicators without guessing ids. ────────────────────────
    print("\n[3/4] Dumping category / measure / gas code lists ...")
    for attr in ("category_tree", "measure_tree", "gases", "units", "conversion_factors"):
        for holder_name in ("annex_one_reader", "non_annex_one_reader", None):
            holder = getattr(reader, holder_name) if holder_name else reader
            obj = getattr(holder, attr, None)
            if obj is None:
                continue
            path = os.path.join(OUT, f"{attr}{'_' + holder_name.split('_')[0] if holder_name else ''}.csv")
            try:
                if hasattr(obj, "to_csv"):
                    obj.to_csv(path, index=True)
                else:  # anytree Node -> flatten
                    import anytree
                    rows = [
                        {"id": getattr(n, "id", ""), "code": getattr(n, "code", ""),
                         "name": getattr(n, "name", ""), "path": "/".join(x.name for x in n.path)}
                        for n in anytree.PreOrderIter(obj)
                    ]
                    pd.DataFrame(rows).to_csv(path, index=False)
                print(f"      {os.path.basename(path)}")
            except Exception as e:
                print(f"      (skipped {attr}: {e})")
            break

    # ── 4. The actual pull. Everything the EU has reported; filtering happens
    #       on our side once the category ids are known. ─────────────────────
    print("\n[4/4] Querying EU inventory data (this takes a few minutes) ...")
    frames = []
    for code in eu_codes:
        try:
            print(f"      party {code} ...", end=" ", flush=True)
            df = reader.query(party_code=code)
            df["party_code"] = code
            frames.append(df)
            print(f"{len(df):,} rows")
        except Exception as e:
            print(f"failed ({type(e).__name__}: {e})")
    if not frames:
        die("every EU query failed.", "Paste the errors above and we will adjust.")

    data = pd.concat(frames, ignore_index=True)
    full = os.path.join(OUT, "eu-inventory-full.csv.gz")
    data.to_csv(full, index=False, compression="gzip")
    print(f"\n      wrote {os.path.basename(full)}  ({len(data):,} rows, "
          f"{os.path.getsize(full) / 1e6:.1f} MB)")

    # A smaller extract of just what the twelve indicators need, in case the
    # full file is awkward to send. Category labels differ between DI vintages,
    # so this matches loosely and is best-effort -- the full file is the one
    # that matters.
    try:
        cat_col = next((c for c in ("category", "category_name") if c in data.columns), None)
        if cat_col:
            mask = data[cat_col].astype(str).str.contains(
                r"cattle|dairy|fertili|forest land|cropland|grassland|wetland|settlement|other land",
                case=False, regex=True, na=False)
            sub = data[mask]
            small = os.path.join(OUT, "eu-agriculture-lulucf.csv.gz")
            sub.to_csv(small, index=False, compression="gzip")
            print(f"      wrote {os.path.basename(small)}  ({len(sub):,} rows, "
                  f"{os.path.getsize(small) / 1e6:.1f} MB)")
    except Exception as e:
        print(f"      (extract skipped: {e})")

    print(f"\nDone. Zip {OUT} and send it back.")


if __name__ == "__main__":
    main()
