# Dockerfile for the pypsa-service backend.
#
# Designed to run anywhere Docker does, but specifically sized for
# Hugging Face Spaces (free tier, Docker SDK):
#   - port 7860 (HF default)
#   - user UID 1000 (HF requires non-root)
#   - slim image, no system solvers needed (highspy ships HiGHS as a wheel)
#
# Build:    docker build -t pypsa-service .
# Run:      docker run --rm -p 7860:7860 pypsa-service
# Health:   curl http://localhost:7860/health

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Build tools needed for some scientific wheels on slim base images.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        build-essential \
        libopenblas-dev \
        liblapack-dev \
        git \
 && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces requires the process to run as UID 1000.
RUN useradd -m -u 1000 user
WORKDIR /home/user/app

COPY --chown=user:user requirements.txt ./
RUN pip install -r requirements.txt

# Real PyPSA-Eur technology-data (pinned v0.14.0). Contains only the
# EU cost CSVs under outputs/costs_YYYY.csv — the same files the upstream
# PyPSA-Eur snakemake workflow consumes via `data/costs.csv`.
COPY --chown=user:user technology-data ./technology-data

# Application code
COPY --chown=user:user app ./app

# `data/` is a runtime cache directory for downloaded OPSD / renewables.ninja
# CSVs. Git (and huggingface_hub.upload_folder) don't carry empty directories,
# so create it inside the image instead of copying it.
RUN mkdir -p ./data && chown -R user:user ./data

USER user

EXPOSE 7860
ENV PORT=7860 \
    PYPSA_SERVICE_DATA_DIR=/home/user/app/data

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; urllib.request.urlopen('http://127.0.0.1:7860/health',timeout=3)" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
