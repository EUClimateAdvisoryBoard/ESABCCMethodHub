"""FastAPI entry point for the pypsa-service."""

from __future__ import annotations

import asyncio
import io
import os
import time
import uuid
from dataclasses import asdict
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

from .energy_system import (
    Assumptions, LPResult, PYPSA_AVAILABLE, PYPSA_VERSION, run_energy_system,
)
from .maritime_aviation import (
    optimize_fuel_mix, sector_comparison, BUNKER_DEMAND_PJ, FUELS,
)
from .reporting import energy_system_report, maritime_aviation_report
from . import electricity_maps as em


app = FastAPI(title="EU Climate Policy Optimization Service", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Simple in-memory job store for async energy-system runs
# ---------------------------------------------------------------------------

JOBS: Dict[str, Dict[str, Any]] = {}


class EnergySystemRequest(BaseModel):
    co2_price_eur_per_t: float = 100.0
    renewable_share_target: float = Field(0.0, ge=0.0, le=1.0)
    co2_cap_mt: Optional[float] = None
    allow_nuclear: bool = True
    phase_out_coal: bool = True
    allow_storage: bool = True
    allow_hydrogen: bool = True
    grid_expansion_factor: float = Field(1.0, ge=0.5, le=3.0)
    demand_growth: float = Field(0.0, ge=-0.3, le=1.0)
    discount_rate: float = Field(0.05, ge=0.0, le=0.15)
    snapshots: int = Field(48, ge=12, le=168)
    year: int = 2030
    scenario_name: str = "Custom"


@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "pypsa_available": PYPSA_AVAILABLE,
        "pypsa_version": PYPSA_VERSION,
        "pypsa_eur_network": os.environ.get("PYPSA_EUR_NETWORK"),
        "solver_backend": "pypsa",
    }


# ---------------------------------------------------------------------------
# Electricity Maps passthrough
# ---------------------------------------------------------------------------

@app.get("/electricity-maps/zones")
def em_zones() -> Dict[str, Any]:
    return em.list_zones()


@app.get("/electricity-maps/carbon-intensity/latest")
def em_ci_latest(zone: str = "DE") -> Dict[str, Any]:
    return em.carbon_intensity_latest(zone)


@app.get("/electricity-maps/carbon-intensity/history")
def em_ci_history(zone: str = "DE") -> Dict[str, Any]:
    return em.carbon_intensity_history(zone)


@app.get("/electricity-maps/power-breakdown/latest")
def em_pb_latest(zone: str = "DE") -> Dict[str, Any]:
    return em.power_breakdown_latest(zone)


@app.get("/electricity-maps/power-breakdown/history")
def em_pb_history(zone: str = "DE") -> Dict[str, Any]:
    return em.power_breakdown_history(zone)


# ---------------------------------------------------------------------------
# Energy system — async job
# ---------------------------------------------------------------------------

def _run_energy_job(job_id: str, req: EnergySystemRequest) -> None:
    job = JOBS[job_id]
    job["status"] = "running"
    job["progress"] = 0.1
    try:
        assumptions = Assumptions(**req.model_dump())
        job["progress"] = 0.25
        result = run_energy_system(assumptions)
        job["progress"] = 0.85
        job["result"] = asdict(result)
        job["assumptions"] = asdict(assumptions)
        pdf = energy_system_report(result, assumptions)
        job["pdf"] = pdf
        job["progress"] = 1.0
        job["status"] = "done"
        job["finished_at"] = time.time()
    except Exception as exc:  # pragma: no cover
        job["status"] = "error"
        job["error"] = str(exc)


@app.post("/energy-system/run")
def energy_system_run(req: EnergySystemRequest,
                      background: BackgroundTasks) -> Dict[str, str]:
    job_id = uuid.uuid4().hex
    JOBS[job_id] = {
        "status": "queued",
        "progress": 0.0,
        "created_at": time.time(),
    }
    background.add_task(_run_energy_job, job_id, req)
    return {"job_id": job_id}


@app.get("/energy-system/status/{job_id}")
def energy_system_status(job_id: str) -> Dict[str, Any]:
    if job_id not in JOBS:
        raise HTTPException(404, "unknown job")
    job = JOBS[job_id]
    return {
        "status": job.get("status"),
        "progress": job.get("progress", 0.0),
        "error": job.get("error"),
    }


@app.get("/energy-system/result/{job_id}")
def energy_system_result(job_id: str) -> Dict[str, Any]:
    if job_id not in JOBS:
        raise HTTPException(404, "unknown job")
    job = JOBS[job_id]
    if job.get("status") != "done":
        raise HTTPException(409, f"job not finished (status={job.get('status')})")
    return {
        "result": job["result"],
        "assumptions": job["assumptions"],
    }


@app.get("/energy-system/report/{job_id}")
def energy_system_report_pdf(job_id: str) -> Response:
    if job_id not in JOBS:
        raise HTTPException(404, "unknown job")
    job = JOBS[job_id]
    if job.get("status") != "done" or "pdf" not in job:
        raise HTTPException(409, "report not ready")
    return Response(
        content=job["pdf"],
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="energy_system_{job_id[:8]}.pdf"',
        },
    )


# ---------------------------------------------------------------------------
# Maritime & aviation bunker
# ---------------------------------------------------------------------------

class BunkerRequest(BaseModel):
    shipping_target_ci: float = Field(30.0, description="CI target for shipping (kg CO2e/GJ)")
    aviation_target_ci: float = Field(35.0, description="CI target for aviation (kg CO2e/GJ)")
    shipping_demand_pj: Optional[float] = None
    aviation_demand_pj: Optional[float] = None


@app.post("/maritime-aviation/run")
def maritime_aviation_run(req: BunkerRequest) -> Dict[str, Any]:
    shipping = optimize_fuel_mix("shipping", req.shipping_target_ci, req.shipping_demand_pj)
    aviation = optimize_fuel_mix("aviation", req.aviation_target_ci, req.aviation_demand_pj)
    mac = sector_comparison()
    return {
        "shipping": asdict(shipping),
        "aviation": asdict(aviation),
        "mac": mac,
        "fuels": {k: {"name": v.name, "sector": v.sector,
                      "cost_eur_per_gj": v.cost_eur_per_gj,
                      "ci_kg_co2_per_gj": v.ci_kg_co2_per_gj,
                      "trl": v.trl,
                      "max_share_2030": v.max_share_2030}
                  for k, v in FUELS.items()},
        "demand": BUNKER_DEMAND_PJ,
    }


@app.post("/maritime-aviation/report")
def maritime_aviation_report_pdf(req: BunkerRequest) -> Response:
    shipping = optimize_fuel_mix("shipping", req.shipping_target_ci, req.shipping_demand_pj)
    aviation = optimize_fuel_mix("aviation", req.aviation_target_ci, req.aviation_demand_pj)
    mac = sector_comparison()
    pdf = maritime_aviation_report(shipping, aviation, mac)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="maritime_aviation_bunker.pdf"',
        },
    )


@app.get("/maritime-aviation/mac-curve")
def mac_curve() -> Dict[str, Any]:
    return sector_comparison()
