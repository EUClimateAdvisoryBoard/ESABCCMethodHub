"""PDF report generation for the optimization modules."""

from __future__ import annotations

import io
from typing import Any, Dict, List

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak,
)

from .energy_system import LPResult, Assumptions
from .maritime_aviation import FuelMixResult


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fig_to_image(fig, width_cm: float = 16) -> Image:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    img = Image(buf, width=width_cm * cm, height=width_cm * 0.6 * cm)
    img.hAlign = "CENTER"
    return img


def _styles() -> Dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    base.add(ParagraphStyle(name="H1Blue", parent=base["Heading1"],
                            textColor=colors.HexColor("#004B7F"), spaceAfter=12))
    base.add(ParagraphStyle(name="H2Blue", parent=base["Heading2"],
                            textColor=colors.HexColor("#0065A4"), spaceAfter=8))
    base.add(ParagraphStyle(name="Meta", parent=base["BodyText"],
                            textColor=colors.HexColor("#5C6B7A"), fontSize=9))
    return base


# ---------------------------------------------------------------------------
# Energy system report
# ---------------------------------------------------------------------------

def energy_system_report(result: LPResult, assumptions: Assumptions) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm,
                            topMargin=1.8*cm, bottomMargin=1.8*cm)
    styles = _styles()
    flow: List[Any] = []

    flow.append(Paragraph("Energy System Optimization Report", styles["H1Blue"]))
    flow.append(Paragraph(
        f"Scenario: <b>{assumptions.scenario_name}</b> &nbsp;&nbsp; "
        f"Solver: <b>{result.solver}</b> &nbsp;&nbsp; "
        f"Status: <b>{result.status}</b>",
        styles["Meta"]))
    flow.append(Spacer(1, 0.3*cm))

    # Assumptions table
    flow.append(Paragraph("Assumptions", styles["H2Blue"]))
    a_rows = [
        ["Target year", assumptions.year],
        ["CO₂ price (€/t)", f"{assumptions.co2_price_eur_per_t:.0f}"],
        ["Renewable share lower bound", f"{assumptions.renewable_share_target*100:.0f}%"],
        ["CO₂ cap (Mt/yr)", str(assumptions.co2_cap_mt) if assumptions.co2_cap_mt else "—"],
        ["Nuclear allowed", "yes" if assumptions.allow_nuclear else "no"],
        ["Coal phased out", "yes" if assumptions.phase_out_coal else "no"],
        ["Storage available", "yes" if assumptions.allow_storage else "no"],
        ["Hydrogen turbines", "yes" if assumptions.allow_hydrogen else "no"],
        ["Grid expansion factor", f"{assumptions.grid_expansion_factor:.2f}"],
        ["Demand growth", f"{assumptions.demand_growth*100:+.0f}%"],
        ["Discount rate", f"{assumptions.discount_rate*100:.1f}%"],
        ["Representative snapshots", assumptions.snapshots],
    ]
    t = Table(a_rows, colWidths=[7*cm, 9*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#EAF1F7")),
        ("GRID", (0,0), (-1,-1), 0.25, colors.HexColor("#C0CBD6")),
        ("FONTSIZE", (0,0), (-1,-1), 9),
    ]))
    flow.append(t)
    flow.append(Spacer(1, 0.4*cm))

    # KPI table
    flow.append(Paragraph("Headline results", styles["H2Blue"]))
    total_cap = sum(sum(v.values()) for v in result.capacity_gw.values())
    total_gen = sum(result.dispatch_twh.values())
    kpis = [
        ["Total installed capacity (GW)", f"{total_cap:,.1f}"],
        ["Total annual generation (TWh)", f"{total_gen:,.1f}"],
        ["Total annual system cost (B€)", f"{result.total_cost_beur:,.2f}"],
        ["Average system LCOE (€/MWh)", f"{result.lcoe_eur_per_mwh:,.1f}"],
        ["Annual CO₂ emissions (Mt)", f"{result.co2_mt:,.1f}"],
    ]
    t = Table(kpis, colWidths=[8*cm, 6*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#EAF1F7")),
        ("GRID", (0,0), (-1,-1), 0.25, colors.HexColor("#C0CBD6")),
        ("FONTSIZE", (0,0), (-1,-1), 9),
    ]))
    flow.append(t)
    flow.append(Spacer(1, 0.4*cm))

    # Generation mix pie
    if result.dispatch_twh:
        fig, ax = plt.subplots(figsize=(6, 4))
        labels = list(result.dispatch_twh.keys())
        sizes = list(result.dispatch_twh.values())
        ax.pie(sizes, labels=labels, autopct="%1.0f%%", startangle=140,
               textprops={"fontsize": 9})
        ax.set_title("Annual generation mix (TWh)", fontsize=11)
        flow.append(_fig_to_image(fig, 14))
        flow.append(Spacer(1, 0.3*cm))

    # Hourly dispatch stacked area
    if result.hourly_by_tech:
        fig, ax = plt.subplots(figsize=(8, 4))
        T = len(next(iter(result.hourly_by_tech.values())))
        x = list(range(T))
        bottom = [0.0] * T
        for tech, series in result.hourly_by_tech.items():
            ax.fill_between(x, bottom, [b + s for b, s in zip(bottom, series)],
                            label=tech, alpha=0.85)
            bottom = [b + s for b, s in zip(bottom, series)]
        if result.hourly_load:
            ax.plot(x, result.hourly_load, color="black", linewidth=1.5,
                    label="Load")
        ax.set_xlabel("Snapshot (hour of representative window)")
        ax.set_ylabel("MW")
        ax.set_title("Dispatch over the representative window")
        ax.legend(fontsize=7, ncol=3, loc="upper center",
                  bbox_to_anchor=(0.5, -0.15))
        flow.append(_fig_to_image(fig, 16))
        flow.append(Spacer(1, 0.3*cm))

    # Capacity per country / tech — show top 15 countries by total capacity
    if result.capacity_gw:
        flow.append(Paragraph("Installed capacity (GW) by country", styles["H2Blue"]))
        all_techs = sorted({tech for b in result.capacity_gw.values() for tech in b.keys()})

        # Sort by total capacity, take top 15 + aggregate rest as "Others"
        sorted_buses = sorted(
            result.capacity_gw.items(),
            key=lambda kv: sum(kv[1].values()),
            reverse=True,
        )
        top = sorted_buses[:15]
        rest = sorted_buses[15:]

        header = ["Country"] + all_techs + ["Total"]
        data = [header]
        for bus, techs_ in top:
            row = [bus] + [f"{techs_.get(t, 0):.1f}" for t in all_techs] + [f"{sum(techs_.values()):.1f}"]
            data.append(row)
        if rest:
            others: Dict[str, float] = {}
            for _, techs_ in rest:
                for t, v in techs_.items():
                    others[t] = others.get(t, 0.0) + v
            row = [f"Others ({len(rest)})"] + [f"{others.get(t, 0):.1f}" for t in all_techs] + [f"{sum(others.values()):.1f}"]
            data.append(row)
        t = Table(data, hAlign="LEFT")
        t.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#004B7F")),
            ("TEXTCOLOR", (0,0), (-1,0), colors.white),
            ("GRID", (0,0), (-1,-1), 0.25, colors.HexColor("#C0CBD6")),
            ("FONTSIZE", (0,0), (-1,-1), 7),
        ]))
        flow.append(t)
        flow.append(Spacer(1, 0.3*cm))

    flow.append(Paragraph(
        "Generated by the EU Climate Policy Method Hub – Energy System "
        "Modelling module (30-country network). Cost data from "
        "PyPSA/technology-data v0.14.0; country specs from ENTSO-E TYNDP "
        "2022, EMBER European Electricity Review 2024, EC Impact "
        "Assessment for the 2040 Climate Target. Results are illustrative "
        "and suitable for scenario comparison, not for absolute "
        "investment decisions.", styles["Meta"]))

    doc.build(flow)
    buf.seek(0)
    return buf.read()


# ---------------------------------------------------------------------------
# Maritime & aviation report
# ---------------------------------------------------------------------------

def maritime_aviation_report(shipping: FuelMixResult, aviation: FuelMixResult,
                             mac: Dict[str, Any]) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm,
                            topMargin=1.8*cm, bottomMargin=1.8*cm)
    styles = _styles()
    flow: List[Any] = []

    flow.append(Paragraph("International Bunker Fuel Optimization Report",
                          styles["H1Blue"]))
    flow.append(Paragraph(
        "Scope: international maritime and aviation bunker fuels sold in EU "
        "ports and airports. These flows lie outside national inventories and "
        "are covered here as a dedicated policy category.", styles["Meta"]))
    flow.append(Spacer(1, 0.3*cm))

    for res in (shipping, aviation):
        flow.append(Paragraph(res.sector.capitalize(), styles["H2Blue"]))
        rows = [
            ["CI target (kg CO₂e/GJ)", f"{res.target_ci_kg_per_gj:.0f}"],
            ["Achieved CI (kg CO₂e/GJ)", f"{res.ci_kg_per_gj:.1f}"],
            ["Average fuel cost (€/GJ)", f"{res.avg_cost_eur_per_gj:.1f}"],
            ["Total annual cost (B€)", f"{res.total_cost_beur:.2f}"],
            ["Residual CO₂ (Mt/yr)", f"{res.co2_mt:.1f}"],
            ["Abatement vs. fossil baseline (Mt/yr)", f"{res.abatement_mt:.1f}"],
        ]
        t = Table(rows, colWidths=[9*cm, 6*cm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#EAF1F7")),
            ("GRID", (0,0), (-1,-1), 0.25, colors.HexColor("#C0CBD6")),
            ("FONTSIZE", (0,0), (-1,-1), 9),
        ]))
        flow.append(t)
        flow.append(Spacer(1, 0.25*cm))

        if res.shares:
            fig, ax = plt.subplots(figsize=(6, 4))
            labels = list(res.shares.keys())
            sizes = [s * 100 for s in res.shares.values()]
            bars = ax.barh(labels, sizes, color="#1F4E79")
            ax.set_xlabel("Share of energy (%)")
            ax.set_title(f"Optimal {res.sector} fuel mix")
            for bar, s in zip(bars, sizes):
                ax.text(bar.get_width() + 0.5, bar.get_y() + bar.get_height()/2,
                        f"{s:.0f}%", va="center", fontsize=8)
            flow.append(_fig_to_image(fig, 14))
            flow.append(Spacer(1, 0.3*cm))

    # MAC curve comparison
    flow.append(PageBreak())
    flow.append(Paragraph("MAC curve comparison across sectors", styles["H1Blue"]))

    rows = mac["sector_comparison"]
    fig, ax = plt.subplots(figsize=(8, 5))
    labels = [r["sector"] for r in rows]
    costs = [r["mac_eur_per_t"] for r in rows]
    widths = [r["abatement_mt"] for r in rows]
    cum = 0
    for label, cost, width in zip(labels, costs, widths):
        color = "#B83230" if "bunker" in label.lower() else "#0065A4"
        ax.bar(cum + width/2, cost, width=width, color=color,
               edgecolor="white", label=label)
        ax.text(cum + width/2, cost + 5, label, rotation=30, ha="left",
                va="bottom", fontsize=7)
        cum += width
    ax.set_xlabel("Cumulative abatement (Mt CO₂ / yr)")
    ax.set_ylabel("Marginal abatement cost (€ / t CO₂)")
    ax.set_title("Sector MAC comparison — international bunkers highlighted")
    flow.append(_fig_to_image(fig, 16))
    flow.append(Spacer(1, 0.3*cm))

    data = [["Sector", "Abatement (Mt/yr)", "MAC (€/t)"]]
    for r in rows:
        data.append([r["sector"], f"{r['abatement_mt']:.0f}", f"{r['mac_eur_per_t']:.0f}"])
    t = Table(data, colWidths=[9*cm, 4*cm, 3*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#1F4E79")),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("GRID", (0,0), (-1,-1), 0.25, colors.HexColor("#C0CBD6")),
        ("FONTSIZE", (0,0), (-1,-1), 9),
    ]))
    flow.append(t)
    flow.append(Spacer(1, 0.3*cm))

    flow.append(Paragraph(
        "Note: Sector-level MAC values are illustrative 2030 midpoints taken "
        "from the EC 2040 Impact Assessment and IEA NZE. Bunker sector costs "
        "are computed by the built-in fuel-route LP.", styles["Meta"]))

    doc.build(flow)
    buf.seek(0)
    return buf.read()
