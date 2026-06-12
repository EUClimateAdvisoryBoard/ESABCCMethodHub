#!/usr/bin/env python3
"""Generate the two-panel figure for the scenario-call one-pager.

Panel A — current logic: historic data + EC-style projection and benchmarks only.
Panel B — new logic: the same, plus the scenario-call ensemble drawn as a
quantile fan (5-95% and 25-75%) with a median line, computed from the real
63 EU27 runs bundled in src/data/scenarios.ts.

Output: project-documents/assets/scenario-call-logic-figure.png
Re-run: python3 scripts/make-scenario-call-figure.py
"""
import re
import json
import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

GREEN = "#2F6E5B"   # MethodHub accent
BLUE = "#1f4e79"    # ensemble median
FAN_OUT = "#aecbe3" # 5-95% band
FAN_IN = "#6f9fc8"  # 25-75% band
EC_RED = "#c0392b"  # EC benchmarks
EC_GREEN = "#5a9e6f" # EC projection
EXTRAP = "#7f9cc4"  # linear extrapolation

# ── Load the bundled ensemble (63 EU27 runs, harmonised Kyoto gases) ─────────
src = open("src/data/scenarios.ts").read()
rows = re.findall(r"values: (\{[^}]*\})", src)
years = list(range(2010, 2051))
runs = []
for raw in rows:
    vals = json.loads(raw)
    series = [vals.get(str(y)) for y in years]
    if all(v is not None for v in series):
        runs.append(series)
data = np.array(runs)  # (n_runs, n_years)
yrs = np.array(years)

# Historic line: the harmonised common past, drawn to the latest data year.
LATEST = 2024
hist_mask = yrs <= LATEST
hist = np.median(data, axis=0)[hist_mask]

# Ensemble fan from the latest data year onward.
fan_mask = yrs >= LATEST
q05, q25, q50, q75, q95 = np.percentile(data, [5, 25, 50, 75, 95], axis=0)

# Linear extrapolation of the 2014-2024 trend (blue dashed in the sketch).
fit_mask = (yrs >= 2014) & (yrs <= LATEST)
slope, intercept = np.polyfit(yrs[fit_mask], np.median(data, axis=0)[fit_mask], 1)
ext_years = np.array([LATEST, 2030, 2040, 2050])
ext_vals = slope * ext_years + intercept

# Stylised EC projection (WEM/WAM-style: effort fades, curve flattens).
proj_years = np.arange(LATEST, 2051)
start = hist[-1]
proj_vals = 1650 + (start - 1650) * np.exp(-0.085 * (proj_years - LATEST))

# EC benchmarks: -55% (2030) and -90% (2040, proposed) vs 1990 ≈ 4 700 Mt net,
# and net zero by 2050 (schematic anchors, as in the source sketch).
bm_years = np.array([2030, 2040, 2050])
bm_vals = np.array([4700 * 0.45, 4700 * 0.10, 0.0])

LEG_KW = dict(fontsize=6.8, frameon=False, handlelength=2.2, labelspacing=0.45)


def draw_base(ax):
    """Elements shared by both panels (the 'current logic')."""
    ax.plot(yrs[hist_mask], hist, color="#222222", lw=1.8, label="Historic data", zorder=5)
    ax.plot(ext_years, ext_vals, ls=(0, (5, 3)), color=EXTRAP, lw=1.3,
            label="Linear extrapolation from ref. period", zorder=3)
    ax.plot(proj_years, proj_vals, ls=(0, (5, 3)), color=EC_GREEN, lw=1.4,
            label="EC projection (WEM/WAM)", zorder=3)
    interp_y = np.concatenate([[LATEST], bm_years])
    interp_v = np.concatenate([[hist[-1]], bm_vals])
    ax.plot(interp_y, interp_v, ls=(0, (1.5, 2.2)), color=EC_RED, lw=1.2, zorder=4,
            label="Linear interpolation")
    ax.scatter(bm_years, bm_vals, color=EC_RED, s=26, zorder=6,
               label="EC future benchmarks / targets")
    ax.axvline(2026, color="#999999", lw=0.7, ls=":")
    ax.text(2026, ax.get_ylim()[1] if False else 4750, " today", fontsize=6.5,
            color="#777777", va="top")
    ax.axhline(0, color="#bbbbbb", lw=0.7)
    ax.set_xlim(2010, 2051)
    ax.set_ylim(-1700, 4900)
    ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(labelsize=7)
    ax.set_xticks([2010, 2020, 2030, 2040, 2050])


fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(7.6, 4.7), dpi=300, sharex=True)
fig.subplots_adjust(hspace=0.38, left=0.085, right=0.99, top=0.92, bottom=0.075)

# ── Panel A — current logic ──────────────────────────────────────────────────
draw_base(ax1)
ax1.set_title("A · Current logic — projections (WEM/WAM) and benchmarks from EC scenarios only",
              fontsize=8.5, loc="left", color=GREEN, fontweight="bold", pad=5)
ax1.legend(loc="lower left", ncol=2, **LEG_KW)
ax1.annotate("single source, no uncertainty range",
             xy=(2040, 470), xytext=(2031.5, -1150), fontsize=6.8, color=EC_RED,
             arrowprops=dict(arrowstyle="-", color=EC_RED, lw=0.7))

# ── Panel B — new logic with the scenario-call ensemble ─────────────────────
draw_base(ax2)
ax2.fill_between(yrs[fan_mask], q05[fan_mask], q95[fan_mask], color=FAN_OUT,
                 alpha=0.55, lw=0, zorder=1, label="Scenario ensemble, 5–95% range")
ax2.fill_between(yrs[fan_mask], q25[fan_mask], q75[fan_mask], color=FAN_IN,
                 alpha=0.55, lw=0, zorder=2, label="Scenario ensemble, 25–75% range")
ax2.plot(yrs[fan_mask], q50[fan_mask], color=BLUE, lw=1.8, zorder=5,
         label=f"Ensemble median ({data.shape[0]} runs, 9 IAMs)")
ax2.set_title("B · New logic — open scenario call adds the modelled scientific landscape",
              fontsize=8.5, loc="left", color=GREEN, fontweight="bold", pad=5)
handles, labels = ax2.get_legend_handles_labels()
order = [labels.index(l) for l in [
    "Historic data", "Linear extrapolation from ref. period", "EC projection (WEM/WAM)",
    "EC future benchmarks / targets", "Linear interpolation",
    f"Ensemble median ({data.shape[0]} runs, 9 IAMs)",
    "Scenario ensemble, 25–75% range", "Scenario ensemble, 5–95% range"]]
ax2.legend([handles[i] for i in order], [labels[i] for i in order],
           loc="lower left", ncol=2, **LEG_KW)
ax2.annotate("EC benchmarks become testable against\nthe full range of submitted scenarios",
             xy=(2030, bm_vals[0]), xytext=(2033.5, 3450), fontsize=6.8, color=BLUE,
             arrowprops=dict(arrowstyle="->", color=BLUE, lw=0.8))

fig.supylabel("EU27 net GHG emissions (Mt CO₂e/yr, harmonised intra-EU Kyoto gases)",
              fontsize=7.5, x=0.012)

out = "project-documents/assets/scenario-call-logic-figure.png"
import os
os.makedirs(os.path.dirname(out), exist_ok=True)
fig.savefig(out)
print("wrote", out, "| runs used:", data.shape[0])
