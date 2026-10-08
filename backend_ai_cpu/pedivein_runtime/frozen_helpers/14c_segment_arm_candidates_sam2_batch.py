from pathlib import Path
import argparse
import json
import time

import cv2
import numpy as np
import pandas as pd
import torch

from PIL import Image, ImageDraw

from transformers import (
    Sam2Processor,
    Sam2Model,
)


# ============================================================
# PEDIVEIN CARE AI
# PHASE 2 - STEP 14C
# SAM2 ARM SEGMENTATION - LOCKED_TEST BATCH
#
# ACTIVE PROTOCOL:
# PEDIVEIN_PREPROC_V1.1
#
# PURPOSE
# ------------------------------------------------------------
# 1. Read Grounding DINO V1.1 arm candidates
# 2. Use every NMS-surviving candidate as SAM2 box prompt
# 3. Generate multimask proposals
# 4. Select proposal with highest SAM2 predicted IoU
# 5. Save binary mask
# 6. Save arm-only candidate image
# 7. Save visual QC
# 8. Save metadata
#
# IMPORTANT
# ------------------------------------------------------------
# - LOCKED_TEST only
# - BATCH_01 first
# - LOCKED TEST is NOT accessed
# - NO target-arm selection yet
# - NO diagnosis / grade / redness / swelling used
# - SAM2 predicted IoU is NOT ground-truth accuracy
# - NO classifier training
# ============================================================


# ============================================================
# CONFIG
# ============================================================

PROTOCOL_VERSION = "PEDIVEIN_PREPROC_V1.1"

SAM2_MODEL_NAME = "facebook/sam2.1-hiera-tiny"

BACKGROUND_VALUE = 128

EXPECTED_BATCH_MAX = 20

# QC heuristics only
MIN_MASK_AREA_RATIO_REVIEW = 0.005
MAX_MASK_AREA_RATIO_REVIEW = 0.90
MIN_PREDICTED_IOU_REVIEW = 0.50


# ============================================================
# PATHS
# ============================================================

PROJECT_ROOT = (
    Path(__file__)
    .resolve()
    .parents[2]
)

DEV_ROOT = (
    PROJECT_ROOT
    / "04_testing"
    / "preprocessing_locked_v1"
)

INPUT_DIR = (
    DEV_ROOT
    / "00_input"
)

BATCH_DIR = (
    DEV_ROOT
    / "metadata"
    / "batches"
)

V11_CANDIDATE_ROOT = (
    DEV_ROOT
    / "01_arm_candidates_v11"
)

V11_BOX_DIR = (
    V11_CANDIDATE_ROOT
    / "boxes"
)

OUTPUT_ROOT = (
    DEV_ROOT
    / "02_arm_masks_v11"
)

MASK_DIR = (
    OUTPUT_ROOT
    / "masks"
)

ARM_IMAGE_DIR = (
    OUTPUT_ROOT
    / "arm_only"
)

QC_DIR = (
    OUTPUT_ROOT
    / "qc"
)

METADATA_DIR = (
    OUTPUT_ROOT
    / "metadata"
)


for directory in [
    OUTPUT_ROOT,
    MASK_DIR,
    ARM_IMAGE_DIR,
    QC_DIR,
    METADATA_DIR,
]:

    directory.mkdir(
        parents=True,
        exist_ok=True,
    )


# ============================================================
# DEVICE
# ============================================================

def get_device():

    if torch.backends.mps.is_available():
        return torch.device("mps")

    if torch.cuda.is_available():
        return torch.device("cuda")

    return torch.device("cpu")


# ============================================================
# RESOLVE IMAGE PATH
# ============================================================

def resolve_image_path(row):

    working_path = Path(
        str(
            row[
                "working_image_path"
            ]
        )
    )

    if working_path.exists():
        return working_path

    matches = sorted(
        INPUT_DIR.glob(
            f"{row['case_id']}.*"
        )
    )

    if len(matches) == 0:
        return None

    return matches[0]


# ============================================================
# LOAD V1.1 CANDIDATE JSON
# ============================================================

def load_candidate_json(case_id):

    json_path = (
        V11_BOX_DIR
        /
        f"{case_id}_arm_candidates_v11.json"
    )

    if not json_path.exists():
        return None, json_path

    with open(
        json_path,
        "r",
        encoding="utf-8",
    ) as file:

        payload = json.load(
            file
        )

    return payload, json_path


# ============================================================
# EXTRACT IOU SCORES
# ============================================================

def extract_iou_scores(outputs):

    if hasattr(
        outputs,
        "iou_scores",
    ):

        scores = outputs.iou_scores

        if scores is not None:

            return (
                scores
                .detach()
                .float()
                .cpu()
                .numpy()
            )

    # Compatibility fallbacks
    for name in [
        "pred_iou_scores",
        "predicted_iou_scores",
    ]:

        if hasattr(
            outputs,
            name,
        ):

            scores = getattr(
                outputs,
                name,
            )

            if scores is not None:

                return (
                    scores
                    .detach()
                    .float()
                    .cpu()
                    .numpy()
                )

    return None


# ============================================================
# NORMALIZE POST-PROCESSED MASKS
# ============================================================

def normalize_postprocessed_masks(
    post_masks,
):
    """
    Expected SAM2 processor output:
        list/tensor with batch dimension.

    For one image + one box:
        typically [1, 1, N_MASKS, H, W]
        or equivalent after processor post-processing.

    Returns:
        [N_MASKS, H, W]
    """

    if isinstance(
        post_masks,
        list,
    ):

        if len(post_masks) == 0:
            raise RuntimeError(
                "SAM2 post_process_masks returned empty list."
            )

        masks = post_masks[0]

    else:

        masks = post_masks

    if isinstance(
        masks,
        torch.Tensor,
    ):

        masks = (
            masks
            .detach()
            .cpu()
            .numpy()
        )

    masks = np.asarray(
        masks
    )

    # Remove batch/box dimensions while preserving
    # proposal + H + W dimensions.
    while (
        masks.ndim > 3
        and
        masks.shape[0] == 1
    ):

        masks = masks[0]

    while (
        masks.ndim > 3
        and
        masks.shape[0] == 1
    ):

        masks = masks[0]

    if masks.ndim == 2:

        masks = masks[
            np.newaxis,
            ...
        ]

    elif masks.ndim > 3:

        masks = masks.reshape(
            -1,
            masks.shape[-2],
            masks.shape[-1],
        )

    if masks.ndim != 3:

        raise RuntimeError(
            (
                "Unexpected SAM2 mask shape after "
                f"post-processing: {masks.shape}"
            )
        )

    return masks


# ============================================================
# NORMALIZE IOU SCORES
# ============================================================

def normalize_iou_scores(
    iou_scores,
    proposal_count,
):

    if iou_scores is None:

        return np.full(
            proposal_count,
            np.nan,
            dtype=np.float32,
        )

    scores = np.asarray(
        iou_scores
    ).reshape(
        -1
    )

    if len(scores) >= proposal_count:

        return (
            scores[
                :proposal_count
            ]
            .astype(
                np.float32
            )
        )

    output = np.full(
        proposal_count,
        np.nan,
        dtype=np.float32,
    )

    output[
        :len(scores)
    ] = scores

    return output


# ============================================================
# SELECT BEST MASK
# ============================================================

def select_best_mask(
    masks,
    iou_scores,
):

    proposal_count = (
        masks.shape[0]
    )

    scores = (
        normalize_iou_scores(
            iou_scores,
            proposal_count,
        )
    )

    if np.all(
        np.isnan(
            scores
        )
    ):

        selected_index = 0
        predicted_iou = np.nan

    else:

        selected_index = int(
            np.nanargmax(
                scores
            )
        )

        predicted_iou = float(
            scores[
                selected_index
            ]
        )

    selected_mask = (
        masks[
            selected_index
        ]
    )

    # SAM2 post_process_masks defaults to binary masks,
    # but this handles both binary and float masks safely.
    if selected_mask.dtype == bool:

        binary_mask = (
            selected_mask
            .astype(
                np.uint8
            )
        )

    else:

        unique_values = np.unique(
            selected_mask
        )

        if np.all(
            np.isin(
                unique_values,
                [
                    0,
                    1,
                ],
            )
        ):

            binary_mask = (
                selected_mask > 0
            ).astype(
                np.uint8
            )

        else:

            # SAM-style mask logits use threshold 0.
            binary_mask = (
                selected_mask > 0
            ).astype(
                np.uint8
            )

    return (
        binary_mask,
        selected_index,
        predicted_iou,
        scores,
    )


# ============================================================
# CREATE ARM-ONLY IMAGE
# ============================================================

def create_arm_only_image(
    image_rgb,
    mask,
):

    output = np.full_like(
        image_rgb,
        BACKGROUND_VALUE,
        dtype=np.uint8,
    )

    output[
        mask > 0
    ] = (
        image_rgb[
            mask > 0
        ]
    )

    return output


# ============================================================
# MASK METRICS
# ============================================================

def calculate_mask_metrics(
    mask,
    box,
):

    image_height, image_width = (
        mask.shape
    )

    mask_area = int(
        mask.sum()
    )

    image_area = int(
        image_height
        *
        image_width
    )

    if image_area > 0:

        image_area_ratio = (
            mask_area
            /
            image_area
        )

    else:

        image_area_ratio = 0.0

    # --------------------------------------------------------
    # Box area
    # --------------------------------------------------------

    x1, y1, x2, y2 = box

    box_width = max(
        0.0,
        x2 - x1,
    )

    box_height = max(
        0.0,
        y2 - y1,
    )

    box_area = max(
        1.0,
        box_width
        *
        box_height,
    )

    mask_vs_box_ratio = (
        mask_area
        /
        box_area
    )

    # --------------------------------------------------------
    # How much of mask lies inside original DINO box
    # --------------------------------------------------------

    bx1 = max(
        0,
        int(
            np.floor(
                x1
            )
        ),
    )

    by1 = max(
        0,
        int(
            np.floor(
                y1
            )
        ),
    )

    bx2 = min(
        image_width,
        int(
            np.ceil(
                x2
            )
        ),
    )

    by2 = min(
        image_height,
        int(
            np.ceil(
                y2
            )
        ),
    )

    inside_box_pixels = int(
        mask[
            by1:by2,
            bx1:bx2
        ].sum()
    )

    if mask_area > 0:

        mask_inside_box_ratio = (
            inside_box_pixels
            /
            mask_area
        )

    else:

        mask_inside_box_ratio = 0.0

    # --------------------------------------------------------
    # Connected components
    # --------------------------------------------------------

    number_labels, labels, stats, _ = (
        cv2.connectedComponentsWithStats(
            mask.astype(
                np.uint8
            ),
            connectivity=8,
        )
    )

    component_count = max(
        0,
        number_labels - 1,
    )

    component_areas = []

    for label_index in range(
        1,
        number_labels,
    ):

        area = int(
            stats[
                label_index,
                cv2.CC_STAT_AREA
            ]
        )

        component_areas.append(
            area
        )

    if len(
        component_areas
    ) > 0:

        largest_component_area = max(
            component_areas
        )

    else:

        largest_component_area = 0

    if mask_area > 0:

        largest_component_ratio = (
            largest_component_area
            /
            mask_area
        )

    else:

        largest_component_ratio = 0.0

    return {

        "mask_area":
            mask_area,

        "image_area_ratio":
            float(
                image_area_ratio
            ),

        "mask_vs_box_ratio":
            float(
                mask_vs_box_ratio
            ),

        "mask_inside_box_ratio":
            float(
                mask_inside_box_ratio
            ),

        "connected_component_count":
            int(
                component_count
            ),

        "largest_component_area":
            int(
                largest_component_area
            ),

        "largest_component_ratio":
            float(
                largest_component_ratio
            ),
    }


# ============================================================
# QC STATUS
# ============================================================

def determine_qc_status(
    metrics,
    predicted_iou,
):

    reasons = []

    if (
        metrics[
            "mask_area"
        ]
        <=
        0
    ):

        reasons.append(
            "EMPTY_MASK"
        )

    if (
        metrics[
            "image_area_ratio"
        ]
        <
        MIN_MASK_AREA_RATIO_REVIEW
    ):

        reasons.append(
            "VERY_SMALL_MASK"
        )

    if (
        metrics[
            "image_area_ratio"
        ]
        >
        MAX_MASK_AREA_RATIO_REVIEW
    ):

        reasons.append(
            "VERY_LARGE_MASK"
        )

    if (
        not np.isnan(
            predicted_iou
        )
        and
        predicted_iou
        <
        MIN_PREDICTED_IOU_REVIEW
    ):

        reasons.append(
            "LOW_PREDICTED_IOU"
        )

    if len(
        reasons
    ) == 0:

        return (
            "PASS",
            "",
        )

    return (
        "REVIEW_REQUIRED",
        ";".join(
            reasons
        ),
    )


# ============================================================
# CREATE QC IMAGE
# ============================================================

def create_qc_image(
    image_rgb,
    mask,
    box,
    case_id,
    arm_id,
    detector_score,
    predicted_iou,
    selected_proposal,
    qc_status,
    qc_reason,
    metrics,
):

    overlay = (
        image_rgb.copy()
    )

    # --------------------------------------------------------
    # Green segmentation overlay
    # --------------------------------------------------------

    green_overlay = (
        overlay.copy()
    )

    green_overlay[
        mask > 0
    ] = (
        0,
        255,
        0,
    )

    overlay = cv2.addWeighted(
        green_overlay,
        0.40,
        overlay,
        0.60,
        0,
    )

    display = (
        Image.fromarray(
            overlay
        )
    )

    draw = (
        ImageDraw.Draw(
            display
        )
    )

    x1, y1, x2, y2 = box

    draw.rectangle(
        [
            int(
                x1
            ),
            int(
                y1
            ),
            int(
                x2
            ),
            int(
                y2
            ),
        ],
        outline="red",
        width=5,
    )

    # --------------------------------------------------------
    # Header
    # --------------------------------------------------------

    header_height = 190

    canvas = Image.new(
        "RGB",
        (
            display.width,
            display.height
            +
            header_height,
        ),
        "white",
    )

    canvas.paste(
        display,
        (
            0,
            header_height,
        )
    )

    header = (
        ImageDraw.Draw(
            canvas
        )
    )

    header.text(
        (
            15,
            10,
        ),
        (
            f"{case_id} | "
            f"{arm_id} | "
            f"SAM2"
        ),
        fill="black",
    )

    header.text(
        (
            15,
            40,
        ),
        (
            f"Grounding DINO score="
            f"{detector_score:.3f}"
        ),
        fill="black",
    )

    if np.isnan(
        predicted_iou
    ):

        iou_text = "NA"

    else:

        iou_text = (
            f"{predicted_iou:.3f}"
        )

    header.text(
        (
            15,
            70,
        ),
        (
            f"SAM2 predicted IoU="
            f"{iou_text} | "
            f"proposal={selected_proposal}"
        ),
        fill="black",
    )

    header.text(
        (
            15,
            100,
        ),
        (
            f"mask/image="
            f"{metrics['image_area_ratio']:.4f} | "
            f"mask/box="
            f"{metrics['mask_vs_box_ratio']:.3f}"
        ),
        fill="black",
    )

    header.text(
        (
            15,
            130,
        ),
        (
            f"components="
            f"{metrics['connected_component_count']} | "
            f"largest component="
            f"{metrics['largest_component_ratio']:.4f}"
        ),
        fill="black",
    )

    header.text(
        (
            15,
            160,
        ),
        (
            f"QC={qc_status} | "
            f"Reason="
            f"{qc_reason if qc_reason else 'None'}"
        ),
        fill="black",
    )

    return canvas


# ============================================================
# MAIN
# ============================================================

def main():

    parser = (
        argparse.ArgumentParser()
    )

    parser.add_argument(
        "--batch",
        type=str,
        default="BATCH_01",
        help="Batch ID, e.g. BATCH_01",
    )

    args = (
        parser.parse_args()
    )

    batch_name = (
        args.batch
        .strip()
        .upper()
    )

    batch_path = (
        BATCH_DIR
        /
        f"{batch_name}.csv"
    )

    # ========================================================
    # HEADER
    # ========================================================

    print(
        "=" * 80
    )

    print(
        "PEDIVEIN CARE AI"
    )

    print(
        "STEP 14C - SAM2 ARM SEGMENTATION"
    )

    print(
        "=" * 80
    )

    print(
        f"\nProtocol: "
        f"{PROTOCOL_VERSION}"
    )

    print(
        f"Batch: "
        f"{batch_name}"
    )

    # ========================================================
    # SAFETY CHECK
    # ========================================================

    if not batch_path.exists():

        raise FileNotFoundError(
            f"Batch manifest not found:\n"
            f"{batch_path}"
        )

    batch_df = pd.read_csv(
        batch_path
    )

    if len(
        batch_df
    ) == 0:

        raise RuntimeError(
            "Batch manifest is empty."
        )

    if (
        len(
            batch_df
        )
        >
        EXPECTED_BATCH_MAX
    ):

        raise RuntimeError(
            (
                "Unexpected batch size: "
                f"{len(batch_df)}"
            )
        )

    partitions = set(
        batch_df[
            "dataset_partition"
        ]
        .astype(str)
        .str.strip()
        .str.upper()
    )

    if partitions != {
        "LOCKED_TEST"
    }:

        raise RuntimeError(
            (
                "CRITICAL: non-locked test partition detected: "
                f"{partitions}"
            )
        )

    print(
        f"Cases in batch: "
        f"{len(batch_df)}"
    )

    # ========================================================
    # DEVICE
    # ========================================================

    device = (
        get_device()
    )

    print(
        f"Device: "
        f"{device}"
    )

    # ========================================================
    # LOAD SAM2
    # ========================================================

    print(
        "\nLoading SAM2..."
    )

    processor = (
        Sam2Processor
        .from_pretrained(
            SAM2_MODEL_NAME
        )
    )

    model = (
        Sam2Model
        .from_pretrained(
            SAM2_MODEL_NAME
        )
        .to(
            device
        )
    )

    model.eval()

    print(
        "SAM2 loaded."
    )

    print(
        f"Model device: "
        f"{next(model.parameters()).device}"
    )

    result_rows = []

    case_summary_rows = []

    total_start = (
        time.time()
    )

    # ========================================================
    # CASE LOOP
    # ========================================================

    for case_index, (_, row) in enumerate(
        batch_df.iterrows(),
        start=1,
    ):

        case_id = str(
            row[
                "case_id"
            ]
        )

        print(
            "\n"
            +
            "-" * 80
        )

        print(
            f"[{case_index:02d}/"
            f"{len(batch_df):02d}] "
            f"{case_id}"
        )

        # ----------------------------------------------------
        # Image
        # ----------------------------------------------------

        image_path = (
            resolve_image_path(
                row
            )
        )

        if (
            image_path is None
            or
            not image_path.exists()
        ):

            print(
                "ERROR: image not found"
            )

            case_summary_rows.append({

                "case_id":
                    case_id,

                "batch_id":
                    batch_name,

                "status":
                    "FAIL",

                "reason":
                    "IMAGE_NOT_FOUND",

                "candidate_count":
                    0,

                "segmented_count":
                    0,

                "review_candidate_count":
                    0,
            })

            continue

        # ----------------------------------------------------
        # Candidate JSON
        # ----------------------------------------------------

        (
            candidate_payload,
            candidate_json_path,
        ) = (
            load_candidate_json(
                case_id
            )
        )

        if candidate_payload is None:

            print(
                "ERROR: V1.1 candidate JSON not found"
            )

            case_summary_rows.append({

                "case_id":
                    case_id,

                "batch_id":
                    batch_name,

                "status":
                    "FAIL",

                "reason":
                    "V11_CANDIDATE_JSON_NOT_FOUND",

                "candidate_count":
                    0,

                "segmented_count":
                    0,

                "review_candidate_count":
                    0,
            })

            continue

        detections = (
            candidate_payload.get(
                "detections",
                [],
            )
        )

        candidate_count = len(
            detections
        )

        if candidate_count == 0:

            print(
                "No candidate arms."
            )

            case_summary_rows.append({

                "case_id":
                    case_id,

                "batch_id":
                    batch_name,

                "status":
                    "REVIEW_REQUIRED",

                "reason":
                    "NO_ARM_CANDIDATE",

                "candidate_count":
                    0,

                "segmented_count":
                    0,

                "review_candidate_count":
                    0,
            })

            continue

        # ----------------------------------------------------
        # Load image
        # ----------------------------------------------------

        image_pil = (
            Image.open(
                image_path
            )
            .convert(
                "RGB"
            )
        )

        image_rgb = np.array(
            image_pil
        )

        image_height, image_width = (
            image_rgb.shape[
                :2
            ]
        )

        case_start = (
            time.time()
        )

        segmented_count = 0
        review_candidate_count = 0

        # ====================================================
        # CANDIDATE LOOP
        # ====================================================

        for detection in detections:

            arm_id = str(
                detection[
                    "arm_id"
                ]
            )

            detector_score = float(
                detection[
                    "score"
                ]
            )

            box = [
                float(
                    value
                )
                for value
                in detection[
                    "box"
                ]
            ]

            # =================================================
            # SAM2 PROCESSOR
            #
            # CRITICAL FIX:
            # BatchEncoding/BatchFeature is moved directly
            # to the model device using .to(device)
            # =================================================

            inputs = (
                processor(
                    images=image_pil,
                    input_boxes=[
                        [
                            box
                        ]
                    ],
                    return_tensors="pt",
                )
            )

            # Keep original sizes on CPU for post-processing.
            original_sizes = (
                inputs[
                    "original_sizes"
                ]
            )

            if isinstance(
                original_sizes,
                torch.Tensor,
            ):

                original_sizes_cpu = (
                    original_sizes
                    .detach()
                    .cpu()
                )

            else:

                original_sizes_cpu = (
                    original_sizes
                )

            # Move ALL tensor inputs together.
            inputs = (
                inputs.to(
                    device
                )
            )

            # Safety diagnostic
            pixel_device = (
                inputs[
                    "pixel_values"
                ]
                .device
            )

            if (
                pixel_device
                !=
                next(
                    model.parameters()
                ).device
            ):

                raise RuntimeError(
                    (
                        "DEVICE MISMATCH: "
                        f"pixel_values={pixel_device}, "
                        f"model={next(model.parameters()).device}"
                    )
                )

            # =================================================
            # INFERENCE
            # =================================================

            with torch.no_grad():

                outputs = model(
                    **inputs,
                    multimask_output=True,
                )

            # =================================================
            # SAM2 POST-PROCESS
            #
            # Official current API:
            # processor.post_process_masks(
            #     outputs.pred_masks.cpu(),
            #     inputs["original_sizes"]
            # )
            # =================================================

            post_masks = (
                processor
                .post_process_masks(
                    outputs.pred_masks.cpu(),
                    original_sizes_cpu,
                )
            )

            masks = (
                normalize_postprocessed_masks(
                    post_masks
                )
            )

            iou_scores = (
                extract_iou_scores(
                    outputs
                )
            )

            (
                binary_mask,
                selected_proposal,
                predicted_iou,
                proposal_scores,
            ) = (
                select_best_mask(
                    masks=
                        masks,

                    iou_scores=
                        iou_scores,
                )
            )

            # =================================================
            # SIZE SAFETY
            # =================================================

            if (
                binary_mask.shape[0]
                !=
                image_height
                or
                binary_mask.shape[1]
                !=
                image_width
            ):

                raise RuntimeError(
                    (
                        f"SAM2 output size mismatch for "
                        f"{case_id} {arm_id}: "
                        f"mask={binary_mask.shape}, "
                        f"image={(image_height, image_width)}"
                    )
                )

            # =================================================
            # METRICS
            # =================================================

            metrics = (
                calculate_mask_metrics(
                    mask=
                        binary_mask,

                    box=
                        box,
                )
            )

            (
                qc_status,
                qc_reason,
            ) = (
                determine_qc_status(
                    metrics=
                        metrics,

                    predicted_iou=
                        predicted_iou,
                )
            )

            if (
                qc_status
                !=
                "PASS"
            ):

                review_candidate_count += 1

            # =================================================
            # SAVE MASK
            # =================================================

            mask_path = (
                MASK_DIR
                /
                f"{case_id}_{arm_id}_sam2_mask.png"
            )

            cv2.imwrite(
                str(
                    mask_path
                ),
                binary_mask
                *
                255,
            )

            # =================================================
            # ARM-ONLY IMAGE
            # =================================================

            arm_only = (
                create_arm_only_image(
                    image_rgb=
                        image_rgb,

                    mask=
                        binary_mask,
                )
            )

            arm_image_path = (
                ARM_IMAGE_DIR
                /
                f"{case_id}_{arm_id}_sam2_arm_only.png"
            )

            Image.fromarray(
                arm_only
            ).save(
                arm_image_path
            )

            # =================================================
            # QC IMAGE
            # =================================================

            qc_image = (
                create_qc_image(
                    image_rgb=
                        image_rgb,

                    mask=
                        binary_mask,

                    box=
                        box,

                    case_id=
                        case_id,

                    arm_id=
                        arm_id,

                    detector_score=
                        detector_score,

                    predicted_iou=
                        predicted_iou,

                    selected_proposal=
                        selected_proposal,

                    qc_status=
                        qc_status,

                    qc_reason=
                        qc_reason,

                    metrics=
                        metrics,
                )
            )

            qc_path = (
                QC_DIR
                /
                f"{case_id}_{arm_id}_sam2_qc.jpg"
            )

            qc_image.save(
                qc_path,
                quality=95,
            )

            # =================================================
            # PROPOSAL SCORES TEXT
            # =================================================

            proposal_scores_text = (
                ";".join(
                    [
                        (
                            "nan"
                            if np.isnan(
                                score
                            )
                            else
                            f"{float(score):.6f}"
                        )
                        for score
                        in proposal_scores
                    ]
                )
            )

            # =================================================
            # SAVE ROW
            # =================================================

            result_rows.append({

                "case_id":
                    case_id,

                "batch_id":
                    batch_name,

                "protocol_version":
                    PROTOCOL_VERSION,

                "arm_id":
                    arm_id,

                "grounding_dino_score":
                    detector_score,

                "box_x1":
                    box[0],

                "box_y1":
                    box[1],

                "box_x2":
                    box[2],

                "box_y2":
                    box[3],

                "sam2_model":
                    SAM2_MODEL_NAME,

                "proposal_count":
                    int(
                        masks.shape[0]
                    ),

                "selected_proposal_index":
                    int(
                        selected_proposal
                    ),

                "predicted_iou":
                    predicted_iou,

                "proposal_iou_scores":
                    proposal_scores_text,

                "mask_area":
                    metrics[
                        "mask_area"
                    ],

                "mask_image_area_ratio":
                    metrics[
                        "image_area_ratio"
                    ],

                "mask_vs_box_ratio":
                    metrics[
                        "mask_vs_box_ratio"
                    ],

                "mask_inside_box_ratio":
                    metrics[
                        "mask_inside_box_ratio"
                    ],

                "connected_component_count":
                    metrics[
                        "connected_component_count"
                    ],

                "largest_component_area":
                    metrics[
                        "largest_component_area"
                    ],

                "largest_component_ratio":
                    metrics[
                        "largest_component_ratio"
                    ],

                "candidate_qc_status":
                    qc_status,

                "candidate_qc_reason":
                    qc_reason,

                "mask_path":
                    str(
                        mask_path
                    ),

                "arm_image_path":
                    str(
                        arm_image_path
                    ),

                "qc_path":
                    str(
                        qc_path
                    ),

                "source_candidate_json":
                    str(
                        candidate_json_path
                    ),
            })

            segmented_count += 1

            if np.isnan(
                predicted_iou
            ):

                iou_display = "NA"

            else:

                iou_display = (
                    f"{predicted_iou:.3f}"
                )

            print(
                f"  {arm_id} | "
                f"DINO={detector_score:.3f} | "
                f"SAM2 IoU={iou_display} | "
                f"mask={metrics['image_area_ratio']:.3f} | "
                f"{qc_status}"
            )

            # =================================================
            # MPS CLEANUP
            # =================================================

            del outputs
            del inputs

            if (
                device.type
                ==
                "mps"
            ):

                torch.mps.empty_cache()

        # ====================================================
        # CASE STATUS
        # ====================================================

        if (
            segmented_count
            !=
            candidate_count
        ):

            case_status = "FAIL"

            case_reason = (
                "NOT_ALL_CANDIDATES_SEGMENTED"
            )

        elif (
            review_candidate_count
            >
            0
        ):

            case_status = (
                "REVIEW_REQUIRED"
            )

            case_reason = (
                "ONE_OR_MORE_CANDIDATES_REQUIRE_REVIEW"
            )

        else:

            case_status = (
                "COMPLETED"
            )

            case_reason = ""

        elapsed = (
            time.time()
            -
            case_start
        )

        case_summary_rows.append({

            "case_id":
                case_id,

            "batch_id":
                batch_name,

            "status":
                case_status,

            "reason":
                case_reason,

            "candidate_count":
                candidate_count,

            "segmented_count":
                segmented_count,

            "review_candidate_count":
                review_candidate_count,

            "elapsed_seconds":
                elapsed,
        })

        print(
            f"Case summary: "
            f"candidates={candidate_count} | "
            f"segmented={segmented_count} | "
            f"review={review_candidate_count} | "
            f"{case_status} | "
            f"{elapsed:.1f}s"
        )

    # ========================================================
    # SAVE METADATA
    # ========================================================

    result_df = (
        pd.DataFrame(
            result_rows
        )
    )

    case_summary_df = (
        pd.DataFrame(
            case_summary_rows
        )
    )

    metadata_path = (
        METADATA_DIR
        /
        f"{batch_name}_sam2_candidates.csv"
    )

    summary_path = (
        METADATA_DIR
        /
        f"{batch_name}_sam2_summary.csv"
    )

    result_df.to_csv(
        metadata_path,
        index=False,
        encoding="utf-8-sig",
    )

    case_summary_df.to_csv(
        summary_path,
        index=False,
        encoding="utf-8-sig",
    )

    # ========================================================
    # SUMMARY COUNTS
    # ========================================================

    completed_count = int(
        (
            case_summary_df[
                "status"
            ]
            ==
            "COMPLETED"
        ).sum()
    )

    review_count = int(
        (
            case_summary_df[
                "status"
            ]
            ==
            "REVIEW_REQUIRED"
        ).sum()
    )

    fail_count = int(
        (
            case_summary_df[
                "status"
            ]
            ==
            "FAIL"
        ).sum()
    )

    total_candidates = int(
        case_summary_df[
            "candidate_count"
        ].sum()
    )

    total_segmented = int(
        case_summary_df[
            "segmented_count"
        ].sum()
    )

    candidate_pass = int(
        (
            result_df[
                "candidate_qc_status"
            ]
            ==
            "PASS"
        ).sum()
    )

    candidate_review = int(
        (
            result_df[
                "candidate_qc_status"
            ]
            ==
            "REVIEW_REQUIRED"
        ).sum()
    )

    total_elapsed = (
        time.time()
        -
        total_start
    )

    # ========================================================
    # FINAL SUMMARY
    # ========================================================

    print(
        "\n"
        +
        "=" * 80
    )

    print(
        "STEP 14C SUMMARY"
    )

    print(
        "=" * 80
    )

    print(
        f"\nProtocol: "
        f"{PROTOCOL_VERSION}"
    )

    print(
        f"Batch: "
        f"{batch_name}"
    )

    print(
        f"Cases: "
        f"{len(case_summary_df)}"
    )

    print(
        f"\nCases COMPLETED: "
        f"{completed_count}"
    )

    print(
        f"Cases REVIEW_REQUIRED: "
        f"{review_count}"
    )

    print(
        f"Cases FAIL: "
        f"{fail_count}"
    )

    print(
        f"\nArm candidates: "
        f"{total_candidates}"
    )

    print(
        f"Successfully segmented: "
        f"{total_segmented}"
    )

    print(
        f"Candidate mask PASS: "
        f"{candidate_pass}"
    )

    print(
        f"Candidate mask REVIEW_REQUIRED: "
        f"{candidate_review}"
    )

    # ========================================================
    # IOU SUMMARY
    # ========================================================

    if len(
        result_df
    ) > 0:

        valid_iou = (
            pd.to_numeric(
                result_df[
                    "predicted_iou"
                ],
                errors="coerce",
            )
            .dropna()
        )

        if len(
            valid_iou
        ) > 0:

            print(
                "\nPredicted IoU summary:"
            )

            print(
                f"Mean: "
                f"{valid_iou.mean():.3f}"
            )

            print(
                f"Min: "
                f"{valid_iou.min():.3f}"
            )

            print(
                f"Max: "
                f"{valid_iou.max():.3f}"
            )

        print(
            "\nCandidate count distribution:"
        )

        print(
            case_summary_df[
                "candidate_count"
            ]
            .value_counts()
            .sort_index()
            .to_string()
        )

    print(
        f"\nTotal time: "
        f"{total_elapsed / 60:.1f} min"
    )

    print(
        "\nCandidate metadata:"
    )

    print(
        metadata_path
    )

    print(
        "\nCase summary:"
    )

    print(
        summary_path
    )

    print(
        "\nMask directory:"
    )

    print(
        MASK_DIR
    )

    print(
        "\nQC directory:"
    )

    print(
        QC_DIR
    )

    print(
        "\nIMPORTANT:"
    )

    print(
        "SAM2 predicted IoU is an internal model estimate, "
        "NOT ground-truth segmentation accuracy."
    )

    print(
        "All V1.1 Grounding DINO candidates were "
        "independently segmented."
    )

    print(
        "No target arm was selected."
    )

    print(
        "No diagnosis, grade, redness, swelling, or lesion "
        "appearance was used."
    )

    print(
        "LOCKED TEST was not accessed."
    )

    print(
        "No classifier was trained."
    )

    print(
        "\n"
        +
        "=" * 80
    )

    print(
        "STEP 14C COMPLETED"
    )

    print(
        "=" * 80
    )


if __name__ == "__main__":

    main()