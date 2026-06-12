#!/usr/bin/env python3
"""Generate the two-panel figure for the scenario-call one-pager.

Nature-journal style: panel letters a/b, Arial, outward ticks, minimal spines,
muted palette. Panel a — current logic: historic data + EC-style projection
and benchmarks only. Panel b — new logic: the same, plus the scenario-call
ensemble drawn as a single shaded band (full range across runs) with a median
line, computed from the real 63 EU27 runs bundled in src/data/scenarios.ts.

Output: project-documents/assets/scenario-call-logic-figure.png
Re-run: python3 scripts/make-scenario-call-figure.py
"""
import re
import json
import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

plt.rcParams.update({
    "font.family": "sans-serif",
    "font.sans-serif": ["Arial", "Helvetica", "DejaVu Sans"],
    "font.size": 7,
    "axes.linewidth": 0.6,
    "xtick.direction": "out",
    "ytick.direction": "out",
    "xtick.major.width": 0.6,
    "ytick.major.width": 0.6,
    "xtick.major.size": 2.5,
    "ytick.major.size": 2.5,
})

# Muted, print-safe palette.
HIST = "#1a1a1a"     # historic data
ENS = "#26547c"      # ensemble median
BAND = "#9db9d1"     # ensemble range band
EC_RED = "#b2432f"   # EC benchmarks
EC_PROJ = "#4d8a66"  # EC projection (WEM/WAM)
EXTRAP = "#8e9bb3"   # linear extrapolation
GREY = "#6e6e6e"

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

# Historic line: the harmonised common past, to the latest data year.
LATEST = 2024
hist_mask = yrs <= LATEST
hist = np.median(data, axis=0)[hist_mask]

# Ensemble from the latest data year onward: full range + median.
fan_mask = yrs >= LATEST
lo = data.min(axis=0)
hi = data.max(axis=0)
med = np.median(data, axis=0)

# Linear extrapolation of the 2014-2024 trend.
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


def draw_base(ax):
    """Elements shared by both panels (the 'current logic')."""
    ax.plot(yrs[hist_mask], hist, color=HIST, lw=1.4, label="Historical emissions",
            zorder=5, solid_capstyle="round")
    ax.plot(ext_years, ext_vals, ls=(0, (4, 2.5)), color=EXTRAP, lw=0.9,
            label="Linear extrapolation (2014–2024 trend)", zorder=3)
    ax.plot(proj_years, proj_vals, ls=(0, (4, 2.5)), color=EC_PROJ, lw=1.0,
            label="EC projection (WEM/WAM)", zorder=3)
    interp_y = np.concatenate([[LATEST], bm_years])
    interp_v = np.concatenate([[hist[-1]], bm_vals])
    ax.plot(interp_y, interp_v, ls=(0, (1, 1.8)), color=EC_RED, lw=0.9, zorder=4,
            label="Linear interpolation")
    ax.scatter(bm_years, bm_vals, facecolor=EC_RED, edgecolor="white", lw=0.5,
               s=18, zorder=6, label="EC benchmarks and targets")
    ax.axvline(2026, color=GREY, lw=0.5, ls=(0, (1, 2)))
    ax.text(2026.3, 4480, "today", fontsize=6, color=GREY, va="top", style="italic")
    ax.axhline(0, color="#c8c8c8", lw=0.5, zorder=0)
    ax.set_xlim(2010, 2051)
    ax.set_ylim(-1800, 4900)
    ax.spines[["top", "right"]].set_visible(False)
    ax.set_xticks([2010, 2020, 2030, 2040, 2050])
    ax.set_yticks([-1000, 0, 1000, 2000, 3000, 4000])
    ax.set_ylabel("EU27 net GHG emissions\n(Mt CO$_2$e yr$^{-1}$)", fontsize=7)


def panel_label(ax, letter, text):
    ax.text(-0.085, 1.12, letter, transform=ax.transAxes, fontsize=10,
            fontweight="bold", va="top", ha="left")
    ax.text(-0.0, 1.115, text, transform=ax.transAxes, fontsize=7.5,
            va="top", ha="left", color="#333333")


LEG_KW = dict(fontsize=6, frameon=False, handlelength=2.0, labelspacing=0.4,
              borderaxespad=0.2)

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(7.1, 4.8), dpi=300, sharex=True)
fig.subplots_adjust(hspace=0.42, left=0.105, right=0.985, top=0.91, bottom=0.075)

# ── Panel a — current logic ──────────────────────────────────────────────────
draw_base(ax1)
panel_label(ax1, "a", "Current assessment logic: projections and benchmarks from EC scenarios only")
ax1.legend(loc="lower left", ncol=2, **LEG_KW)
ax1.annotate("single source,\nno uncertainty range", xy=(2040, bm_vals[1]),
             xytext=(2034, -1450), fontsize=6, color=EC_RED, ha="left",
             arrowprops=dict(arrowstyle="-", color=EC_RED, lw=0.5,
                             shrinkA=2, shrinkB=3))

# ── Panel b — new logic with the scenario-call ensemble ─────────────────────
draw_base(ax2)
ax2.fill_between(yrs[fan_mask], lo[fan_mask], hi[fan_mask], color=BAND,
                 alpha=0.45, lw=0, zorder=1,
                 label=f"Submitted-scenario range (n = {data.shape[0]} runs, 9 IAMs)")
ax2.plot(yrs[fan_mask], med[fan_mask], color=ENS, lw=1.4, zorder=5,
         solid_capstyle="round", label="Ensemble median")
panel_label(ax2, "b", "New assessment logic: open scenario call adds the modelled scientific landscape")
handles, labels = ax2.get_legend_handles_labels()
order = [labels.index(l) for l in [
    "Historical emissions", "Linear extrapolation (2014–2024 trend)",
    "EC projection (WEM/WAM)", "EC benchmarks and targets", "Linear interpolation",
    "Ensemble median", f"Submitted-scenario range (n = {data.shape[0]} runs, 9 IAMs)"]]
ax2.legend([handles[i] for i in order], [labels[i] for i in order],
           loc="lower left", ncol=2, **LEG_KW)
ax2.annotate("EC benchmarks become testable\nagainst the modelled range",
             xy=(2030, bm_vals[0]), xytext=(2033.5, 3400), fontsize=6, color=ENS,
             ha="left",
             arrowprops=dict(arrowstyle="->", color=ENS, lw=0.6,
                             shrinkA=2, shrinkB=3))

out = "project-documents/assets/scenario-call-logic-figure.png"
import os
os.makedirs(os.path.dirname(out), exist_ok=True)
fig.savefig(out)
print("wrote", out, "| runs used:", data.shape[0])
