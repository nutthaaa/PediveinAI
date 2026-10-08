from __future__ import annotations

import importlib.util
import math
import os
import sys
from pathlib import Path

import cv2
import numpy as np
import pandas as pd
import torch
from PIL import Image
from transformers import AutoModelForZeroShotObjectDetection, AutoProcessor, Sam2Model, Sam2Processor

sys.dont_write_bytecode = True
PACKAGE_ROOT = Path(__file__).resolve().parents[1]
FROZEN = Path(__file__).resolve().parent / "frozen_helpers"
MODEL_CACHE = Path(os.environ.get("PEDIVEIN_PREPROCESSOR_MODELS", PACKAGE_ROOT / "preprocessor_models"))
DINO_MODEL = MODEL_CACHE / "grounding-dino-tiny"
SAM2_MODEL = MODEL_CACHE / "sam2.1-hiera-tiny"


def _load(filename: str, name: str):
    spec = importlib.util.spec_from_file_location(name, FROZEN / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


DINO = _load("14b_detect_arm_candidates_batch_v11.py", "frozen_dino")
SAM = _load("14c_segment_arm_candidates_sam2_batch.py", "frozen_sam")
TARGET = _load("14d_select_target_arm_batch.py", "frozen_target")
MASK = _load("14e_mask_integrity_qc_batch.py", "frozen_mask")
ORIENT = _load("14f_normalize_orientation_batch_v21.py", "frozen_orientation")
STANDARD = _load("14g_standardize_canvas_batch.py", "frozen_standard")


class FrozenPreprocessor:
    """Single-image adapter around frozen PEDIVEIN_PREPROC_V1.1 helpers."""

    def __init__(self):
        self.device = DINO.get_device()
        if not DINO_MODEL.exists() or not SAM2_MODEL.exists():
            raise RuntimeError(
                "Preprocessing models are missing. Run: python scripts/download_preprocessor_models.py"
            )
        self.dino_processor = AutoProcessor.from_pretrained(DINO_MODEL, local_files_only=True)
        self.dino_model = AutoModelForZeroShotObjectDetection.from_pretrained(
            DINO_MODEL, local_files_only=True
        ).to(self.device).eval()
        self.sam_processor = Sam2Processor.from_pretrained(SAM2_MODEL, local_files_only=True)
        self.sam_model = Sam2Model.from_pretrained(SAM2_MODEL, local_files_only=True).to(self.device).eval()

    def detect(self, image: Image.Image):
        width, height = image.size
        prompt = ". ".join(DINO.PROMPTS) + "."
        inputs = self.dino_processor(images=image, text=prompt, return_tensors="pt")
        inputs = {k: v.to(self.device) if isinstance(v, torch.Tensor) else v for k, v in inputs.items()}
        with torch.no_grad():
            outputs = self.dino_model(**inputs)
        result = self.dino_processor.post_process_grounded_object_detection(
            outputs, inputs.get("input_ids"), threshold=DINO.BOX_THRESHOLD,
            text_threshold=DINO.TEXT_THRESHOLD, target_sizes=[(height, width)]
        )[0]
        labels = result.get("text_labels", [""] * len(result["boxes"]))
        detections = []
        for box, score, label in zip(result["boxes"].detach().cpu().numpy(),
                                     result["scores"].detach().cpu().numpy(), labels):
            clipped = DINO.clip_box(box.tolist(), width, height)
            if DINO.box_area(clipped) > 0:
                detections.append({"box": clipped, "score": float(score), "text_label": str(label)})
        return DINO.assign_arm_ids(DINO.apply_nms(detections))

    def segment(self, image: Image.Image, detections):
        candidates = []
        h, w = np.asarray(image).shape[:2]
        for detection in detections:
            box = [float(v) for v in detection["box"]]
            inputs = self.sam_processor(images=image, input_boxes=[[box]], return_tensors="pt")
            original_sizes = inputs["original_sizes"].detach().cpu()
            inputs = inputs.to(self.device)
            with torch.no_grad():
                outputs = self.sam_model(**inputs, multimask_output=True)
            masks = SAM.normalize_postprocessed_masks(
                self.sam_processor.post_process_masks(outputs.pred_masks.cpu(), original_sizes)
            )
            ious = SAM.extract_iou_scores(outputs)
            mask, proposal, predicted_iou, scores = SAM.select_best_mask(masks=masks, iou_scores=ious)
            if mask.shape != (h, w):
                raise RuntimeError(f"SAM2 mask size mismatch: {mask.shape} != {(h,w)}")
            metrics = SAM.calculate_mask_metrics(mask=mask, box=box)
            qc, reason = SAM.determine_qc_status(metrics=metrics, predicted_iou=predicted_iou)
            candidates.append({"detection": detection, "mask": mask.astype(np.uint8), "metrics": metrics,
                               "sam_qc": qc, "sam_reason": reason, "predicted_iou": float(predicted_iou),
                               "selected_proposal": int(proposal)})
        return candidates

    def choose_target(self, candidates):
        eligible = [c for c in candidates if c["sam_qc"] == "PASS" and c["metrics"]["mask_area"] > 0]
        if not eligible:
            return None, "NO_SAM2_PASS_CANDIDATE"
        max_area = max(c["metrics"]["image_area_ratio"] for c in eligible)
        for c in eligible:
            m = c["metrics"]
            component = TARGET.calculate_component_coherence(m["largest_component_ratio"])
            box_fit = TARGET.calculate_mask_box_fit_score(m["mask_vs_box_ratio"], m["mask_inside_box_ratio"])
            elongation = TARGET.calculate_elongation_score(c["mask"])
            relative = m["image_area_ratio"] / max_area if max_area > 0 else 0.0
            c["geometry_score"] = TARGET.calculate_geometry_score(component, box_fit, elongation, relative)
        eligible.sort(key=lambda c: c["geometry_score"], reverse=True)
        best = eligible[0]; margin = best["geometry_score"] - (eligible[1]["geometry_score"] if len(eligible) > 1 else 0.0)
        if best["geometry_score"] < TARGET.AUTO_SCORE_THRESHOLD:
            return None, "TARGET_SCORE_BELOW_FROZEN_THRESHOLD"
        if len(eligible) > 1 and margin < TARGET.AUTO_MARGIN_THRESHOLD:
            return None, "TARGET_SELECTION_AMBIGUOUS"
        return best, ""

    def _save_review_candidates(self, rgb, candidates, output_path):
        review = []
        for candidate in candidates:
            if candidate["sam_qc"] != "PASS":
                continue
            arm_id = candidate["detection"]["arm_id"]
            preview = rgb.copy()
            mask = candidate["mask"] > 0
            tint = np.zeros_like(preview); tint[..., 1] = 220
            preview[mask] = (0.55 * preview[mask] + 0.45 * tint[mask]).astype(np.uint8)
            x1, y1, x2, y2 = [int(v) for v in candidate["detection"]["box"]]
            cv2.rectangle(preview, (x1, y1), (x2, y2), (0, 255, 0), max(2, min(rgb.shape[:2]) // 250))
            cv2.putText(preview, arm_id, (x1 + 5, max(28, y1 + 28)), cv2.FONT_HERSHEY_SIMPLEX,
                        0.9, (255, 255, 255), 3, cv2.LINE_AA)
            path = output_path.parent / f"{output_path.stem}_{arm_id}_review.jpg"
            Image.fromarray(preview).save(path, quality=92)
            review.append({"arm_id": arm_id, "preview_path": str(path),
                           "geometry_score": float(candidate.get("geometry_score", 0.0))})
        return review

    def process(self, image_path: Path, output_path: Path, selected_arm_id: str | None = None):
        image = Image.open(image_path).convert("RGB")
        rgb = np.asarray(image)
        detections = self.detect(image)
        if len(detections) == 0:
            return {"status": "HOLD", "reason": "NO_ARM_CANDIDATE"}
        if len(detections) > 4:
            return {"status": "HOLD", "reason": "MORE_THAN_FOUR_ARM_CANDIDATES"}
        candidates = self.segment(image, detections)
        target, reason = self.choose_target(candidates)
        if selected_arm_id:
            matches = [c for c in candidates if c["detection"]["arm_id"] == selected_arm_id and c["sam_qc"] == "PASS"]
            if not matches:
                return {"status": "HOLD", "reason": "INVALID_MANUAL_TARGET_SELECTION"}
            target, reason = matches[0], "HUMAN_TARGET_SELECTED"
        elif target is None and reason == "TARGET_SELECTION_AMBIGUOUS":
            return {"status": "HOLD", "reason": reason,
                    "manual_review_candidates": self._save_review_candidates(rgb, candidates, output_path)}
        elif target is None:
            return {"status": "HOLD", "reason": reason}

        filtered, component_metrics = MASK.preserve_meaningful_components(target["mask"])
        labels, holes, total_hole_area, total_hole_ratio = MASK.analyze_holes(filtered)
        corrected, restored = MASK.restore_small_holes(filtered, holes, labels)
        _, boundary_ratio = MASK.calculate_open_boundary_ratio(corrected)
        mask_status, mask_reason = MASK.determine_status(
            component_metrics["meaningful_component_count"], total_hole_ratio, boundary_ratio
        )
        if mask_status != "PASS":
            return {"status": "HOLD", "reason": f"MASK_INTEGRITY_{mask_reason}"}
        arm_only = MASK.create_arm_only(rgb, corrected)
        angle = ORIENT.calculate_major_axis_angle(corrected)
        if angle is None:
            return {"status": "HOLD", "reason": "INVALID_PRE_ROTATION_PCA"}
        rotation = ORIENT.calculate_rotation_to_vertical(angle)
        matrix, nw, nh = ORIENT.build_rotation_matrix(corrected.shape[1], corrected.shape[0], rotation)
        oriented_rgb = ORIENT.rotate_image(arm_only, matrix, nw, nh)
        oriented_mask = ORIENT.rotate_mask(corrected, matrix, nw, nh)
        post_angle = ORIENT.calculate_major_axis_angle(oriented_mask)
        vertical_error = ORIENT.calculate_vertical_error(post_angle)
        if abs(rotation) > ORIENT.MAX_ROTATION_DEGREES_AUTO_PASS:
            return {"status": "HOLD", "reason": "LARGE_ROTATION"}
        if post_angle is None or vertical_error > ORIENT.MAX_VERTICAL_ERROR_DEGREES:
            return {"status": "HOLD", "reason": "POST_ROTATION_VERTICAL_ERROR"}
        standardized = STANDARD.standardize_to_canvas(oriented_rgb, oriented_mask, STANDARD.MODEL_SIZE)
        standard_status, standard_reason = STANDARD.determine_qc_status(
            standardized["occupancy_ratio"], standardized["occupancy_ratio"]
        )
        if standard_status != "PASS":
            return {"status": "HOLD", "reason": f"STANDARDIZATION_{standard_reason}"}
        output_path.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(standardized["image"]).save(output_path)
        return {"status": "READY", "reason": reason, "output_path": str(output_path),
                "protocol": "PEDIVEIN_PREPROC_V1.1", "arm_candidate_count": len(detections),
                "geometry_score": best_score(target), "occupancy_224": standardized["occupancy_ratio"],
                "manual_target_selection": bool(selected_arm_id), "selected_arm_id": target["detection"]["arm_id"]}


def best_score(target):
    return float(target.get("geometry_score", 0.0))
