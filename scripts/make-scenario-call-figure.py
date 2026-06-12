#!/usr/bin/env python3
"""Generate the two-panel schematic figure for the scenario-call one-pager.

Abstract / illustrative (no real numbers): panel a — current logic, historic
data + EC projection and EC benchmarks only; panel b — the same, plus the
scenario-call ensemble as one shaded range band with a median line;
panel c — transition dynamics. Journal styling, large readable type.

Output: project-documents/assets/scenario-call-logic-figure.png
Re-run: python3 scripts/make-scenario-call-figure.py
"""
import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

plt.rcParams.update({
    "font.family": "sans-serif",
    "font.sans-serif": ["Arial", "Helvetica", "DejaVu Sans"],
    "font.size": 9.5,
    "axes.linewidth": 0.8,
    "xtick.direction": "out",
    "xtick.major.width": 0.8,
    "xtick.major.size": 3,
})

HIST = "#1a1a1a"     # historic data
ENS = "#26547c"      # ensemble median
BAND = "#9db9d1"     # ensemble range band
EC_RED = "#b2432f"   # EC benchmarks
EC_PROJ = "#4d8a66"  # Member State projections (WEM/WAM, EEA-aggregated)
GREY = "#6e6e6e"

TODAY = 2026
rng = np.random.default_rng(7)

# ── Schematic curves (unitless y) ────────────────────────────────────────────
# Historic: gently declining, slightly wiggly.
hx = np.linspace(2015, 2025, 60)
hy = 0.92 - 0.014 * (hx - 2015) + 0.012 * np.sin((hx - 2015) * 2.1) \
     + np.cumsum(rng.normal(0, 0.0025, hx.size))
y0 = hy[-1]  # latest data point

# Member State WEM/WAM projections (EEA-aggregated): effort fades, curve flattens.
px = np.linspace(2025, 2050, 60)
py = 0.46 + (y0 - 0.46) * np.exp(-0.11 * (px - 2025))

# EC benchmarks (goal posts) + linear interpolation from latest data.
bx = np.array([2030, 2040, 2050])
by = np.array([0.56, 0.17, 0.02])

# Ensemble: median declining steeply past net zero; band widening with time.
mx = np.linspace(2025, 2050, 60)
t = (mx - 2025) / 25
my = y0 * (1 - t) ** 1.35 - 0.02 * t          # median approaching (net) zero by 2050
half = 0.025 + 0.20 * t ** 1.2                # growing spread
band_lo, band_hi = my - half, my + 0.9 * half


def draw_base(ax):
    ax.plot(hx, hy, color=HIST, lw=2.0, solid_capstyle="round", zorder=5,
            label="Historical data")
    ax.plot(px, py, ls=(0, (4, 2.5)), color=EC_PROJ, lw=1.8, zorder=3,
            label="Member State projections (WEM/WAM)")
    ax.plot(np.r_[2025, bx], np.r_[y0, by], ls=(0, (1, 1.8)), color=EC_RED,
            lw=1.4, zorder=4, label="Linear interpolation")
    ax.scatter(bx, by, facecolor=EC_RED, edgecolor="white", lw=0.7, s=42,
               zorder=6, label="EC benchmarks / targets")
    ax.axvline(TODAY, color=GREY, lw=0.7, ls=(0, (1, 2)))
    ax.text(TODAY + 0.3, 1.27, "today", fontsize=8.5, color=GREY, va="top",
            style="italic")
    ax.axhline(0, color="#bbbbbb", lw=0.8, zorder=0)
    ax.text(2015.2, 0.015, "net zero", fontsize=8, color="#999999", va="bottom")
    ax.set_xlim(2015, 2051)
    ax.set_ylim(-0.30, 1.32)
    ax.set_yticks([])
    ax.spines[["top", "right"]].set_visible(False)
    ax.set_xticks([2030, 2040, 2050])
    ax.tick_params(labelsize=9.5)
    ax.set_ylabel("Variable\n(e.g. industry GHG emissions)", fontsize=9.5)


def panel_label(ax, letter, text):
    ax.text(-0.075, 1.14, letter, transform=ax.transAxes, fontsize=13,
            fontweight="bold", va="top", ha="left")
    ax.text(0.0, 1.135, text, transform=ax.transAxes, fontsize=10,
            va="top", ha="left", color="#333333")


LEG_KW = dict(fontsize=8.5, frameon=False, handlelength=1.9, labelspacing=0.4,
              borderaxespad=0.2)

fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(7.0, 7.4), dpi=300, sharex=True)
fig.subplots_adjust(hspace=0.46, left=0.10, right=0.90, top=0.94, bottom=0.045)

# ── Panel a — current logic ──────────────────────────────────────────────────
draw_base(ax1)
panel_label(ax1, "a", "Current logic — Member State projections (WEM/WAM) and EC benchmarks only")
ax1.legend(loc="upper right", bbox_to_anchor=(1.0, 1.0), **LEG_KW)
ax1.annotate("official sources only —\nno independent check, no range", xy=(2040, by[1]),
             xytext=(2034.5, -0.24), fontsize=9, color=EC_RED, ha="left",
             arrowprops=dict(arrowstyle="-", color=EC_RED, lw=0.7,
                             shrinkA=2, shrinkB=4))

# ── Panel b — new logic with the scenario-call ensemble ─────────────────────
draw_base(ax2)
ax2.fill_between(mx, band_lo, band_hi, color=BAND, alpha=0.5, lw=0, zorder=1,
                 label="Range of submitted scenarios")
ax2.plot(mx, my, color=ENS, lw=2.0, zorder=5, solid_capstyle="round",
         label="Ensemble median")
panel_label(ax2, "b", "New logic — the open scenario call adds the modelled range")
handles, labels = ax2.get_legend_handles_labels()
order = [labels.index(l) for l in [
    "Range of submitted scenarios", "Ensemble median",
    "Member State projections (WEM/WAM)", "EC benchmarks / targets"]]
ax2.legend([handles[i] for i in order], [labels[i] for i in order],
           loc="upper right", bbox_to_anchor=(1.0, 1.0), **LEG_KW)
ax2.annotate("EC benchmarks become testable\nagainst the modelled range",
             xy=(2030, by[0]), xytext=(2030.5, -0.22), fontsize=9, color=ENS,
             ha="left",
             arrowprops=dict(arrowstyle="->", color=ENS, lw=0.8,
                             shrinkA=2, shrinkB=4))

# ── Panel c — the other side of the coin: transition dynamics ───────────────
# Abatement-wedge view: the gap between a current-effort baseline and the
# net-zero pathway is filled by two wedges. The mature-technology wedge
# ('low-hanging fruit') delivers early and saturates; the structural &
# societal wedge must deliver everything that remains after 2030.
cx = np.linspace(2025, 2050, 100)
ctt = (cx - 2025) / 25
c_base = y0 - 0.06 * ctt                      # current-effort baseline
c_path = y0 * (1 - ctt) ** 1.35 + 0.02 * ctt  # pathway to (near) zero
gap = c_base - c_path
c_easy = np.minimum(0.26 * (1 - np.exp(-4.5 * ctt)), gap)  # saturating wedge
bound = c_base - c_easy

ax3.plot(hx, hy, color=HIST, lw=2.0, solid_capstyle="round", zorder=5)
ax3.plot(cx, c_base, ls=(0, (4, 2.5)), color=GREY, lw=1.2, zorder=3)
ax3.plot(cx, c_path, color=ENS, lw=2.0, zorder=5, solid_capstyle="round")
ax3.fill_between(cx, bound, c_base, color="#7fb3a1", alpha=0.65, lw=0, zorder=1)
ax3.fill_between(cx, c_path, bound, color="#d9a05b", alpha=0.55, lw=0, zorder=1)
ax3.text(2050.4, c_base[-1], "current-effort\nbaseline", fontsize=8, color=GREY,
         ha="left", va="center")
ax3.text(2050.4, c_path[-1], "net-zero\npathway", fontsize=8, color=ENS,
         ha="left", va="center")
ax3.text(2040, (c_base[60] + bound[60]) / 2 + 0.015,
         "mature technology roll-out\n('low-hanging fruit')",
         fontsize=8, color="#1f4d3e", ha="center", va="center")
# Verticals comparing the composition of the gap in 2030 vs 2046.
for yr in (2030, 2046):
    i = np.argmin(np.abs(cx - yr))
    ax3.plot([cx[i], cx[i]], [c_path[i], c_base[i]], color="#333333", lw=0.9,
             zorder=6, solid_capstyle="butt")
    ax3.plot([cx[i]], [c_base[i]], marker="v", ms=3.5, color="#333333", zorder=6)
    ax3.plot([cx[i]], [c_path[i]], marker="^", ms=3.5, color="#333333", zorder=6)
ax3.annotate("2030 gap — closed mostly\nby the easy options", xy=(2030, 0.66),
             xytext=(2016.5, 0.38), fontsize=9, color="#333333", ha="left",
             arrowprops=dict(arrowstyle="->", color="#333333", lw=0.8,
                             shrinkA=2, shrinkB=4))
ax3.annotate("2050 gap — what remains is the hard core:\nstructural & societal change (tech availability,\ninfrastructure, diets, consumption, demand)",
             xy=(2043.5, 0.31), xytext=(2016.5, 0.235), fontsize=8.5,
             color="#7a4d12", ha="left", va="top",
             arrowprops=dict(arrowstyle="->", color="#7a4d12", lw=0.8,
                             shrinkA=4, shrinkB=2))
ax3.axvline(TODAY, color=GREY, lw=0.7, ls=(0, (1, 2)))
ax3.text(TODAY + 0.3, 1.02, "today", fontsize=8.5, color=GREY, va="top",
         style="italic")
ax3.axhline(0, color="#bbbbbb", lw=0.8, zorder=0)
ax3.text(2015.2, 0.015, "net zero", fontsize=8, color="#999999", va="bottom")
ax3.set_xlim(2015, 2051)
ax3.set_ylim(-0.05, 1.07)
ax3.set_yticks([])
ax3.spines[["top", "right"]].set_visible(False)
ax3.set_xticks([2030, 2040, 2050])
ax3.tick_params(labelsize=9.5)
ax3.set_ylabel("Variable\n(e.g. industry GHG emissions)", fontsize=9.5)
panel_label(ax3, "c", "Understanding the inherent dynamics of the transition — what closes the gap, and when")

out = "project-documents/assets/scenario-call-logic-figure.png"
import os
os.makedirs(os.path.dirname(out), exist_ok=True)
fig.savefig(out)
print("wrote", out)
