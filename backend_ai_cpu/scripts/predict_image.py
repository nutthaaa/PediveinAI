#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from pedivein_runtime.inference import PediveinPredictor, to_json


def main() -> None:
    parser = argparse.ArgumentParser(description="Run one Pedivein image on CPU")
    parser.add_argument("image", type=Path)
    parser.add_argument("--selected-arm-id")
    parser.add_argument("--allow-manual-quality-review", action="store_true")
    args = parser.parse_args()
    predictor = PediveinPredictor()
    print(to_json(predictor.predict(
        args.image,
        selected_arm_id=args.selected_arm_id,
        allow_manual_quality_review=args.allow_manual_quality_review,
    )))


if __name__ == "__main__":
    main()
