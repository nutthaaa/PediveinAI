#!/usr/bin/env python3
from __future__ import annotations

import os
import sys
from pathlib import Path

import uvicorn

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


if __name__ == "__main__":
    uvicorn.run(
        "pedivein_runtime.api:app",
        host=os.getenv("PEDIVEIN_API_HOST", "127.0.0.1"),
        port=int(os.getenv("PEDIVEIN_API_PORT", "8000")),
        workers=1,
        access_log=False,
    )
