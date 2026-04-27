---
title: EU Climate Policy PyPSA Service
emoji: ⚡
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: Real PyPSA + PyPSA-Eur technology-data optimization backend
---

# pypsa-service

Python FastAPI backend that runs **real PyPSA** (the same library PyPSA-Eur
wraps) against **real PyPSA-Eur technology-data** (`costs_YYYY.csv` from
https://github.com/PyPSA/technology-data v0.14.0) and serves the results to
the EU Climate Policy Method Hub web app. It exposes two modelling modules:

1. **Energy System Model** — a 30-country EU power system (EU-27 + NO, CH, GB)
   built as a PyPSA `Network` with per-country demand, capacity factors,
   technology potentials and 50+ bilateral ENTSO-E interconnectors. Solved with
   `n.optimize(solver_name="highs")` — the canonical PyPSA-Eur solve call.
   Investment, FOM, VOM, lifetime, efficiency, fuel and CO₂ factors for every
   technology are overlaid from the upstream PyPSA-Eur `costs_2030.csv` (or
   `costs_2025/2040/2050.csv` for other years). Country metadata from ENTSO-E
   TYNDP 2022, EMBER European Electricity Review 2024, and the EC Impact
   Assessment for the 2040 Climate Target.

2. **Maritime & Aviation Bunkering** — a fuel-route optimization model for
   international shipping and aviation bunkering. It selects the least-cost mix
   of alternative fuels (e-kerosene, HVO, SAF, green ammonia, methanol, LNG, …)
   subject to a CO₂ intensity target, and returns a marginal abatement cost
   (MAC) curve for these two sectors compared against other sectors
   (electricity, industry, buildings, road transport).

## Why a separate service?

PyPSA is a Python library and cannot run directly in the browser. The Next.js
frontend therefore POSTs jobs to this service, polls for completion, and then
renders the JSON results plus a downloadable PDF.

## Endpoints

- `POST /energy-system/run`    → enqueues a job, returns `{job_id}`
- `GET  /energy-system/status/{job_id}` → `{status, progress}`
- `GET  /energy-system/result/{job_id}` → JSON result
- `GET  /energy-system/report/{job_id}` → PDF report
- `POST /maritime-aviation/run` → synchronous (fast LP), returns results
- `GET  /maritime-aviation/mac-curve` → cached MAC curve comparison across
  sectors
- `GET  /health` → `{status: "ok"}`

## Run locally

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

The Next.js app reads `PYPSA_SERVICE_URL` (default `http://localhost:8001`)
from the environment and proxies requests to it.

## Run in Docker

```bash
docker build -t pypsa-service .
docker run --rm -p 7860:7860 pypsa-service
curl http://localhost:7860/health
```

The image is ~1.2 GB (pandas, pypsa, linopy, highspy) and boots in a
few seconds. HiGHS ships as a pip wheel so no external solver install is
needed.

## Deploy to Hugging Face Spaces (free tier)

The pypsa-service directory is a self-contained Docker Space. To host it for
free:

```bash
# 1. Install the huggingface_hub CLI and log in
pip install huggingface_hub
hf auth login

# 2. Create a new Docker Space
hf repo create --type space --sdk docker eu-climate-policy-pypsa

# 3. Push ONLY this subdirectory (contains Dockerfile + README with frontmatter)
cd pypsa-service
git init
git remote add origin https://huggingface.co/spaces/<your-user>/eu-climate-policy-pypsa
git add .
git commit -m "Deploy pypsa-service"
git push -u origin main
```

Hugging Face will build the Docker image and expose it at
`https://<your-user>-eu-climate-policy-pypsa.hf.space`. Point the frontend
at it by setting `PYPSA_SERVICE_URL` to that URL in Vercel / Netlify
environment variables.

### Alternative free hosts

The same Dockerfile also works on Fly.io, Render, Railway and Google Cloud
Run. Nothing in the image is HF-specific; the only HF-ism is port 7860 and
the frontmatter in this README (ignored by Docker).

## Real PyPSA is the only solver

`pypsa>=1.1` and `highspy` are pinned in `requirements.txt`. The code path
builds a `pypsa.Network`, overlays PyPSA-Eur technology-data, and calls
`n.optimize(solver_name="highs")` — exactly the same sequence PyPSA-Eur runs
in its snakemake workflow. Results expose a `solver` field
(`pypsa.optimize[HiGHS, pypsa v1.1.2]`) and a `data_source` field
(`PyPSA-Eur technology-data v0.14.0 (costs_2030.csv)`) so the frontend can
display provenance.

There is no fallback. If `import pypsa` fails the `/energy-system/run`
endpoint returns a clear error rather than degrading silently.

## Real open-source data sources

The service is designed to use **actual** open-source data when configured,
and falls back through several layers automatically:

| Layer | Trigger | Source |
|-------|---------|--------|
| 1. Pre-built PyPSA-Eur network | `PYPSA_EUR_NETWORK=/path/to/network.nc` | https://github.com/PyPSA/pypsa-eur |
| 2. Open Power System Data load + VRE | `PYPSA_SERVICE_USE_OPSD=1` | https://open-power-system-data.org |
| 3. atlite + ERA5 cutout | `ATLITE_CUTOUT=/path/to/europe-2019.nc` | Copernicus C3S ERA5 |
| 4. renewables.ninja CSV cache | `RENEWABLES_NINJA_TOKEN=…` | Pfenninger & Staffell 2016 |
| 5. Synthetic fallback | always | bundled curves |

The optimizer reports which layer was used in the result `data_source` field
so the frontend can display provenance to the user.

### Bootstrapping a real PyPSA-Eur network

PyPSA-Eur is the canonical, peer-reviewed open European power system model.
It is built via snakemake and the full pipeline downloads ~10 GB of data:

```bash
# 1. Clone & install pypsa-eur (separate repo)
git clone https://github.com/PyPSA/pypsa-eur.git
cd pypsa-eur
mamba env create -f envs/environment.yaml
conda activate pypsa-eur

# 2. Run the workflow to a serialised network
snakemake -j 4 results/networks/elec_s_37_lcopt_Co2L-3H.nc

# 3. Tell the service where to find it
export PYPSA_EUR_NETWORK=$PWD/results/networks/elec_s_37_lcopt_Co2L-3H.nc
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

## Electricity Maps live data

Live carbon intensity and power breakdown by zone are available via the
Electricity Maps API. Set `ELECTRICITY_MAPS_TOKEN` (free tier at
https://api-portal.electricitymaps.com/) and the service will proxy:

```
GET /electricity-maps/carbon-intensity/latest?zone=DE
GET /electricity-maps/power-breakdown/history?zone=FR
```

The Next.js app proxies these on `/api/electricity-maps` so the token is
never exposed to the browser.
