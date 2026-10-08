#!/usr/bin/env python3
from pathlib import Path

from huggingface_hub import snapshot_download

ROOT = Path(__file__).resolve().parents[1]
DESTINATION = ROOT / "preprocessor_models"
MODELS = {
    "IDEA-Research/grounding-dino-tiny": "grounding-dino-tiny",
    "facebook/sam2.1-hiera-tiny": "sam2.1-hiera-tiny",
}

for repository, folder in MODELS.items():
    target = DESTINATION / folder
    print(f"Downloading {repository} -> {target}")
    snapshot_download(repo_id=repository, local_dir=target)

print("Preprocessing models are ready.")
