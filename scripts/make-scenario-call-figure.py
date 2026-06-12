#!/usr/bin/env python3
"""Generate the schematic figure for the scenario-call one-pager.

Abstract / illustrative (no real numbers on the y axis): panel a — current
logic, historic data + Member State projections and EC benchmarks only;
panel b — the same, plus the scenario-call ensemble as one shaded range band
with a median line; panel c — the net-zero pathway decomposed into sectors
(approximate EU27 emission shares today, EEA inventory), with magnifier
lenses over industry, transport and buildings that connect to panels d1–d3,
the sectoral-model zooms (electrolyser gap, biomass limits, heat pumps).
Journal styling, large readable type.

Output: project-documents/assets/scenario-call-logic-figure.png
Re-run: python3 scripts/make-scenario-call-figure.py
"""
import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import ConnectionPatch

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
ENS = "#26547c"      # ensemble median / pathway
BAND = "#9db9d1"     # ensemble range band
EC_RED = "#b2432f"   # EC benchmarks
EC_PROJ = "#4d8a66"  # Member State projections (WEM/WAM, EEA-aggregated)
GREY = "#6e6e6e"
LENS = "#333333"     # magnifier lenses

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

# Ensemble: median declining steeply towards net zero; band widening with time.
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
    ax.set_ylabel("GHG emissions", fontsize=9.5)


def panel_label(ax, letter, text):
    ax.text(-0.075, 1.14, letter, transform=ax.transAxes, fontsize=13,
            fontweight="bold", va="top", ha="left")
    ax.text(0.0, 1.135, text, transform=ax.transAxes, fontsize=10,
            va="top", ha="left", color="#333333")


LEG_KW = dict(fontsize=8.5, frameon=False, handlelength=1.9, labelspacing=0.4,
              borderaxespad=0.2)

fig = plt.figure(figsize=(7.0, 9.3), dpi=300)
gs = fig.add_gridspec(4, 3, height_ratios=[1.0, 1.0, 1.0, 0.82],
                      hspace=0.58, wspace=0.34,
                      left=0.10, right=0.90, top=0.955, bottom=0.04)
ax1 = fig.add_subplot(gs[0, :])
ax2 = fig.add_subplot(gs[1, :], sharex=ax1)
ax3 = fig.add_subplot(gs[2, :], sharex=ax1)
axc1, axc2, axc3 = (fig.add_subplot(gs[3, i]) for i in range(3))
ax1.tick_params(labelbottom=False)
ax2.tick_params(labelbottom=False)

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

# ── Panel c — the pathway split into sectors ─────────────────────────────────
# The net-zero pathway decomposed into stacked sector wedges, scaled to the
# approximate sector shares of EU27 GHG emissions today (EEA inventory,
# excl. LULUCF): energy supply ~26 %, transport ~24 %, industry ~20 %,
# buildings ~13 %, agriculture ~11 %, waste & other ~6 %. Sector decline
# speeds differ (energy fastest, agriculture slowest), so the composition of
# the remaining emissions shifts over time.
cx = np.linspace(2025, 2050, 100)
ctt = (cx - 2025) / 25
c_total = y0 * (1 - ctt) ** 1.35 + 0.012 * ctt   # total pathway to (near) zero

SECTORS = [
    # (name, share today, relative decline-speed factor, fill colour)
    ("Energy supply", 0.26, 1.0 - 0.55 * ctt, "#9db9d1"),
    ("Industry", 0.20, 1.0 - 0.10 * ctt, "#c69c93"),
    ("Transport", 0.24, 1.0 + 0.10 * ctt, "#d9a05b"),
    ("Buildings", 0.13, 1.0 - 0.20 * ctt, "#a89cc8"),
    ("Agriculture", 0.11, 1.0 + 0.55 * ctt, "#8fbe8f"),
    ("Waste & other", 0.06, 1.0 + 0.10 * ctt, "#c9c9c9"),
]
raw = np.array([share * speed for _, share, speed, _ in SECTORS])
weights = raw / raw.sum(axis=0)                  # composition shifts over time
levels = np.vstack([np.zeros_like(cx), np.cumsum(weights * c_total, axis=0)])

for k, (name, share, _, color) in enumerate(SECTORS):
    ax3.fill_between(cx, levels[k], levels[k + 1], color=color, alpha=0.75,
                     lw=0.4, edgecolor="white", zorder=1,
                     label=f"{name} ({share:.0%} today)")
ax3.plot(cx, c_total, color=ENS, lw=2.0, zorder=5, solid_capstyle="round")
ax3.plot(hx, hy, color=HIST, lw=2.0, solid_capstyle="round", zorder=5)
ax3.text(2050.4, c_total[-1] + 0.02, "net-zero\npathway", fontsize=8, color=ENS,
         ha="left", va="center")
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
ax3.set_ylabel("GHG emissions", fontsize=9.5)
ax3.legend(loc="upper right", bbox_to_anchor=(1.0, 1.03), ncol=2, fontsize=7.5,
           frameon=False, handlelength=1.3, labelspacing=0.35,
           columnspacing=0.9, borderaxespad=0.2)
panel_label(ax3, "c", "… and reveals the inherent dynamics — the pathway split into sectors")

# Magnifier lenses over the three sectors that are zoomed in d1–d3.
def band_mid(x, k):
    i = np.argmin(np.abs(cx - x))
    return (levels[k][i] + levels[k + 1][i]) / 2

LENS_AT = [
    (2030.5, 1, axc1),  # Industry  → d1
    (2036.0, 2, axc2),  # Transport → d2
    (2041.5, 3, axc3),  # Buildings → d3
]
for lx, k, target in LENS_AT:
    ly = band_mid(lx, k)
    ax3.plot([lx], [ly], marker="o", ms=17, mfc="none", mec=LENS, mew=1.6,
             zorder=8)
    # magnifier handle (short diagonal stroke at the lens rim)
    ax3.annotate("", xy=(lx, ly), xytext=(16, -15), textcoords="offset points",
                 arrowprops=dict(arrowstyle="-", color=LENS, lw=2.4,
                                 shrinkA=0, shrinkB=8), zorder=8)
    con = ConnectionPatch(xyA=(lx, ly), coordsA=ax3.transData,
                          xyB=(0.5, 1.30), coordsB=target.transAxes,
                          linestyle=(0, (2, 3)), color=GREY, lw=0.9, zorder=1)
    fig.add_artist(con)

# ── Panels d1–d3 — zooming into three sectors ────────────────────────────────
# What the magnifiers reveal: one schematic sectoral-model output per sector,
# each contrasting where the current trend leads with what the pathway
# requires, exposing a concrete structural gap the GHG headline hides.

def mini(ax, num, title, ylab):
    ax.set_xlim(2015, 2051)
    ax.set_yticks([])
    ax.spines[["top", "right"]].set_visible(False)
    ax.set_xticks([2030, 2050])
    ax.tick_params(labelsize=8)
    ax.axvline(TODAY, color=GREY, lw=0.6, ls=(0, (1, 2)))
    ax.set_ylabel(ylab, fontsize=8)
    ax.text(-0.16, 1.22, num, transform=ax.transAxes, fontsize=11,
            fontweight="bold", va="top", ha="left")
    ax.text(0.02, 1.21, title, transform=ax.transAxes, fontsize=8.5,
            va="top", ha="left", color="#333333")


def gap_marker(ax, x, y_lo, y_hi, dx_text=1.2):
    ax.annotate("", xy=(x, y_hi), xytext=(x, y_lo),
                arrowprops=dict(arrowstyle="<->", color="#333333", lw=0.9,
                                shrinkA=0, shrinkB=0))
    ax.text(x + dx_text, (y_lo + y_hi) / 2, "gap", fontsize=8, color="#333333",
            ha="left", va="center", fontweight="bold")


sx = np.linspace(2025, 2050, 60)
st = (sx - 2025) / 25

# d1 — Industry: electrolyser up-scaling, required S-curve vs current trend.
mini(axc1, "d1", "Industry — electrolyser gap", "Installed capacity")
axc1.plot(np.linspace(2018, 2025, 20), 0.05 + 0.02 * np.linspace(0, 1, 20),
          color=HIST, lw=1.6, solid_capstyle="round", zorder=5)
req1 = 0.06 + 0.80 / (1 + np.exp(-(sx - 2038) / 4.0))
sp1 = 0.02 + 0.10 * st
axc1.fill_between(sx, req1 - sp1, req1 + sp1, color=BAND, alpha=0.5, lw=0)
axc1.plot(sx, req1, color=ENS, lw=1.7, zorder=4)
axc1.plot(sx, 0.07 + 0.10 * st, ls=(0, (4, 2.5)), color=GREY, lw=1.1, zorder=3)
axc1.text(2049.5, 0.0, "current trend", fontsize=7, color=GREY, ha="right",
          va="bottom")
axc1.text(2040.5, 0.78, "required in\npathways", fontsize=7.5, color=ENS,
          ha="right", va="center")
gap_marker(axc1, 2044, 0.07 + 0.10 * (19 / 25),
           0.06 + 0.80 / (1 + np.exp(-(2044 - 2038) / 4.0)))
axc1.set_ylim(0, 1.05)

# d2 — Transport: biofuel demand vs the sustainable-biomass ceiling.
mini(axc2, "d2", "Transport — biomass limits", "Primary biomass")
axc2.axhspan(0.52, 0.70, color="#7fb3a1", alpha=0.40, lw=0)
axc2.text(2016, 0.61, "sustainable supply\n(land-use models)", fontsize=7.5,
          color="#1f4d3e", ha="left", va="center", zorder=6,
          bbox=dict(facecolor="white", alpha=0.45, edgecolor="none", pad=0.6))
axc2.plot(np.linspace(2018, 2025, 20), 0.28 + 0.04 * np.linspace(0, 1, 20),
          color=HIST, lw=1.6, solid_capstyle="round", zorder=5)
dem = 0.32 + 0.58 * st ** 1.1
sp2 = 0.02 + 0.07 * st
axc2.fill_between(sx, dem - sp2, dem + sp2, color=BAND, alpha=0.5, lw=0)
axc2.plot(sx, dem, color=ENS, lw=1.7, zorder=4)
axc2.text(2034, 0.30, "fuel demand in pathways\n(competing sectors)",
          fontsize=7.5, color=ENS, ha="left", va="center")
axc2.annotate("may exceed\nsustainable supply", xy=(2047, 0.80),
              xytext=(2030, 0.97), fontsize=7.5, color="#7a4d12", ha="left",
              va="center",
              arrowprops=dict(arrowstyle="->", color="#7a4d12", lw=0.7,
                              shrinkA=1, shrinkB=2))
axc2.set_ylim(0, 1.05)

# d3 — Buildings: heat-pump roll-out, slowed by the old, unrenovated stock.
mini(axc3, "d3", "Buildings — heat pumps", "Heat-pump stock")
axc3.plot(np.linspace(2018, 2025, 20), 0.06 + 0.04 * np.linspace(0, 1, 20),
          color=HIST, lw=1.6, solid_capstyle="round", zorder=5)
req3 = 0.10 + 0.72 / (1 + np.exp(-(sx - 2037) / 4.5))
sp3 = 0.02 + 0.09 * st
axc3.fill_between(sx, req3 - sp3, req3 + sp3, color=BAND, alpha=0.5, lw=0)
axc3.plot(sx, req3, color=ENS, lw=1.7, zorder=4)
axc3.plot(sx, 0.10 + 0.13 * st, ls=(0, (4, 2.5)), color=GREY, lw=1.1, zorder=3)
axc3.text(2049.5, 0.02, "current trend", fontsize=7, color=GREY, ha="right",
          va="bottom")
gap_marker(axc3, 2045, 0.10 + 0.13 * (20 / 25),
           0.10 + 0.72 / (1 + np.exp(-(2045 - 2037) / 4.5)), dx_text=1.0)
axc3.annotate("roll-out slowed by old,\nunrenovated stock", xy=(2041.5, 0.42),
              xytext=(2016.5, 0.85), fontsize=7.5, color="#7a4d12", ha="left",
              va="center",
              arrowprops=dict(arrowstyle="->", color="#7a4d12", lw=0.7,
                              shrinkA=1, shrinkB=2))
axc3.set_ylim(0, 1.05)

# ── Grouping brackets: panel a = current logic; panels b–d = the new logic ──
from matplotlib.lines import Line2D

pos_a = ax1.get_position()
pos_b = ax2.get_position()
pos_d = axc1.get_position()
BAR_X = 0.020
fig.add_artist(Line2D([BAR_X, BAR_X], [pos_a.y0, pos_a.y1], color="#b0b0b0",
                      lw=2.5, solid_capstyle="butt"))
fig.text(BAR_X - 0.009, (pos_a.y0 + pos_a.y1) / 2, "CURRENT LOGIC",
         rotation=90, ha="center", va="center", fontsize=8.5, color="#777777",
         fontweight="bold")
fig.add_artist(Line2D([BAR_X, BAR_X], [pos_d.y0, pos_b.y1], color="#2F6E5B",
                      lw=2.5, solid_capstyle="butt"))
fig.text(BAR_X - 0.009, (pos_d.y0 + pos_b.y1) / 2,
         "NEW LOGIC — WHAT THE SCENARIO CALL ADDS", rotation=90, ha="center",
         va="center", fontsize=8.5, color="#2F6E5B", fontweight="bold")

out = "project-documents/assets/scenario-call-logic-figure.png"
import os
os.makedirs(os.path.dirname(out), exist_ok=True)
fig.savefig(out)
print("wrote", out)
