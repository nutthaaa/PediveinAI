FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements_cpu.txt .
# CPU-only torch by default. Build with TORCH_INDEX_URL="" to get the PyPI torch wheels, which bundle CUDA.
ARG TORCH_INDEX_URL=https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir ${TORCH_INDEX_URL:+--extra-index-url $TORCH_INDEX_URL} -r requirements_cpu.txt
COPY . .
RUN python scripts/download_preprocessor_models.py
RUN useradd --system --uid 10001 app && mkdir -p /data/models && chown app /data/models
USER app

# Retrained versions live on a volume; patient photos are mounted read-only for training.
ENV PEDIVEIN_MODEL_DIR=/data/models PEDIVEIN_UPLOAD_DIR=/data/uploads
EXPOSE 8000
CMD ["python", "scripts/run_api.py"]
