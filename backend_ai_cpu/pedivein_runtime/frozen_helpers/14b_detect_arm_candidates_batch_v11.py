from pathlib import Path
import argparse
import json
import time

import numpy as np
import pandas as pd
import torch

from PIL import Image, ImageDraw

from transformers import (
    AutoProcessor,
    AutoModelForZeroShotObjectDetection,
)


# ============================================================
# PEDIVEIN CARE AI
# PHASE 2 - STEP 14B V1.1 CANDIDATE
# HIGH-RECALL GROUNDING DINO ARM DETECTION
#
# PURPOSE
# ------------------------------------------------------------
# Test a revised arm-candidate strategy after scale-up visual QC
# showed that V1.0 merged-box filtering could remove a useful
# arm candidate.
#
# V1.1 CHANGE:
#   Grounding DINO
#       -> NMS
#       -> KEEP ALL NMS CANDIDATES
#
# No merged-box removal is performed.
#
# IMPORTANT
# ------------------------------------------------------------
# - This is a CANDIDATE protocol revision.
# - PEDIVEIN_PREPROC_V1.0 is NOT overwritten.
# - LOCKED_TEST only.
# - BATCH_01 should be validated first.
# - LOCKED TEST is not accessed.
# - No SAM2 yet.
# - No classifier training.
# ============================================================


# ============================================================
# VERSION
# ============================================================

BASE_PROTOCOL_VERSION = "PEDIVEIN_PREPROC_V1.0"

CANDIDATE_PROTOCOL_VERSION = (
    "PEDIVEIN_PREPROC_V1.1_CANDIDATE"
)


# ============================================================
# MODEL CONFIGURATION
# ============================================================

MODEL_NAME = (
    "IDEA-Research/grounding-dino-tiny"
)

PROMPTS = [
    "child arm",
    "human arm",
]

BOX_THRESHOLD = 0.25

TEXT_THRESHOLD = 0.20

NMS_IOU_THRESHOLD = 0.45

EXPECTED_BATCH_MAX = 20


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


# ------------------------------------------------------------
# V1.0 outputs - used only for comparison
# ------------------------------------------------------------

V10_OUTPUT_ROOT = (
    DEV_ROOT
    / "01_arm_candidates"
)


V10_METADATA_DIR = (
    V10_OUTPUT_ROOT
    / "metadata"
)


# ------------------------------------------------------------
# V1.1 candidate outputs
# ------------------------------------------------------------

OUTPUT_ROOT = (
    DEV_ROOT
    / "01_arm_candidates_v11"
)


BOX_DIR = (
    OUTPUT_ROOT
    / "boxes"
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
    BOX_DIR,
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

        return torch.device(
            "mps"
        )


    if torch.cuda.is_available():

        return torch.device(
            "cuda"
        )


    return torch.device(
        "cpu"
    )


# ============================================================
# RESOLVE IMAGE PATH
# ============================================================

def resolve_image_path(
    row,
):

    path = Path(
        str(
            row[
                "working_image_path"
            ]
        )
    )


    if path.exists():

        return path


    matches = sorted(
        INPUT_DIR.glob(
            f"{row['case_id']}.*"
        )
    )


    if len(
        matches
    ) == 0:

        return None


    return matches[0]


# ============================================================
# BOX AREA
# ============================================================

def box_area(
    box,
):

    x1, y1, x2, y2 = box


    width = max(
        0.0,
        x2 - x1,
    )


    height = max(
        0.0,
        y2 - y1,
    )


    return (
        width
        *
        height
    )


# ============================================================
# BOX IOU
# ============================================================

def box_iou(
    box_a,
    box_b,
):

    ax1, ay1, ax2, ay2 = box_a

    bx1, by1, bx2, by2 = box_b


    inter_x1 = max(
        ax1,
        bx1,
    )


    inter_y1 = max(
        ay1,
        by1,
    )


    inter_x2 = min(
        ax2,
        bx2,
    )


    inter_y2 = min(
        ay2,
        by2,
    )


    inter_width = max(
        0.0,
        inter_x2 - inter_x1,
    )


    inter_height = max(
        0.0,
        inter_y2 - inter_y1,
    )


    intersection = (
        inter_width
        *
        inter_height
    )


    area_a = box_area(
        box_a
    )


    area_b = box_area(
        box_b
    )


    union = (
        area_a
        +
        area_b
        -
        intersection
    )


    if union <= 0:

        return 0.0


    return float(
        intersection
        /
        union
    )


# ============================================================
# NMS
# ============================================================

def apply_nms(
    detections,
):

    if len(
        detections
    ) <= 1:

        return detections.copy()


    order = sorted(
        range(
            len(
                detections
            )
        ),
        key=lambda index:
            detections[
                index
            ][
                "score"
            ],
        reverse=True,
    )


    kept = []


    while len(
        order
    ) > 0:

        current = (
            order.pop(
                0
            )
        )


        kept.append(
            detections[
                current
            ]
        )


        remaining = []


        for index in order:

            iou = (
                box_iou(
                    detections[
                        current
                    ][
                        "box"
                    ],
                    detections[
                        index
                    ][
                        "box"
                    ],
                )
            )


            if (
                iou
                <
                NMS_IOU_THRESHOLD
            ):

                remaining.append(
                    index
                )


        order = remaining


    return kept


# ============================================================
# CLIP BOX
# ============================================================

def clip_box(
    box,
    width,
    height,
):

    x1, y1, x2, y2 = box


    x1 = max(
        0.0,
        min(
            float(
                width - 1
            ),
            float(
                x1
            ),
        ),
    )


    y1 = max(
        0.0,
        min(
            float(
                height - 1
            ),
            float(
                y1
            ),
        ),
    )


    x2 = max(
        0.0,
        min(
            float(
                width
            ),
            float(
                x2
            ),
        ),
    )


    y2 = max(
        0.0,
        min(
            float(
                height
            ),
            float(
                y2
            ),
        ),
    )


    return [
        x1,
        y1,
        x2,
        y2,
    ]


# ============================================================
# ASSIGN ARM IDS
# ============================================================

def assign_arm_ids(
    detections,
):
    """
    ARM IDs are image left-to-right only.

    They are NOT anatomical left/right.
    """

    sorted_detections = sorted(
        detections,
        key=lambda detection:
            (
                detection[
                    "box"
                ][0]
                +
                detection[
                    "box"
                ][2]
            )
            /
            2.0,
    )


    for index, detection in enumerate(
        sorted_detections,
        start=1,
    ):

        detection[
            "arm_id"
        ] = (
            f"ARM{index:02d}"
        )


    return sorted_detections


# ============================================================
# DRAW QC
# ============================================================

def create_qc_image(
    image,
    case_id,
    detections,
    raw_count,
    nms_count,
    v10_count,
):

    qc = image.copy()

    draw = ImageDraw.Draw(
        qc
    )


    for detection in detections:

        x1, y1, x2, y2 = (
            detection[
                "box"
            ]
        )


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


        label = (
            f"{detection['arm_id']} "
            f"{detection['score']:.3f}"
        )


        draw.text(
            (
                int(
                    x1
                )
                +
                5,

                max(
                    5,
                    int(
                        y1
                    )
                    +
                    5,
                ),
            ),
            label,
            fill="red",
        )


    # ========================================================
    # HEADER
    # ========================================================

    header_height = 140


    canvas = Image.new(
        "RGB",
        (
            qc.width,
            qc.height
            +
            header_height,
        ),
        "white",
    )


    canvas.paste(
        qc,
        (
            0,
            header_height,
        )
    )


    header_draw = (
        ImageDraw.Draw(
            canvas
        )
    )


    header_draw.text(
        (
            15,
            10,
        ),
        (
            f"{case_id} | "
            f"V1.1 HIGH-RECALL CANDIDATE"
        ),
        fill="black",
    )


    header_draw.text(
        (
            15,
            40,
        ),
        (
            f"raw={raw_count} | "
            f"NMS/final V1.1={nms_count} | "
            f"V1.0 final={v10_count}"
        ),
        fill="black",
    )


    header_draw.text(
        (
            15,
            70,
        ),
        (
            "V1.1 keeps ALL candidates remaining after NMS."
        ),
        fill="black",
    )


    header_draw.text(
        (
            15,
            100,
        ),
        (
            "ARM IDs = image left-to-right; "
            "not anatomical left/right."
        ),
        fill="black",
    )


    return canvas


# ============================================================
# LOAD V1.0 SUMMARY
# ============================================================

def load_v10_summary(
    batch_name,
):

    path = (
        V10_METADATA_DIR
        /
        f"{batch_name}_summary.csv"
    )


    if not path.exists():

        return {}


    df = pd.read_csv(
        path
    )


    return {

        str(
            row[
                "case_id"
            ]
        ):
            int(
                row[
                    "final_candidate_count"
                ]
            )

        for _, row
        in df.iterrows()
    }


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
        help=(
            "Batch ID, e.g. BATCH_01"
        ),
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
        "STEP 14B V1.1 - HIGH-RECALL ARM DETECTION"
    )

    print(
        "=" * 80
    )


    print(
        f"\nBase protocol: "
        f"{BASE_PROTOCOL_VERSION}"
    )


    print(
        f"Candidate revision: "
        f"{CANDIDATE_PROTOCOL_VERSION}"
    )


    print(
        f"Batch: "
        f"{batch_name}"
    )


    # ========================================================
    # SAFETY
    # ========================================================

    if not batch_path.exists():

        raise FileNotFoundError(
            f"Batch not found:\n"
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


    if (
        "dataset_partition"
        not in
        batch_df.columns
    ):

        raise RuntimeError(
            "dataset_partition column missing."
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
                "CRITICAL: non-locked test "
                f"partition detected: {partitions}"
            )
        )


    print(
        f"Cases in batch: "
        f"{len(batch_df)}"
    )


    # ========================================================
    # V1.0 COMPARISON
    # ========================================================

    v10_counts = (
        load_v10_summary(
            batch_name
        )
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
    # MODEL
    # ========================================================

    print(
        "\nLoading Grounding DINO..."
    )


    processor = (
        AutoProcessor
        .from_pretrained(
            MODEL_NAME
        )
    )


    model = (
        AutoModelForZeroShotObjectDetection
        .from_pretrained(
            MODEL_NAME
        )
        .to(
            device
        )
    )


    model.eval()


    print(
        "Model loaded."
    )


    text_prompt = (
        ". ".join(
            PROMPTS
        )
        +
        "."
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


        image_path = (
            resolve_image_path(
                row
            )
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

                "raw_detection_count":
                    0,

                "v11_candidate_count":
                    0,

                "v10_candidate_count":
                    v10_counts.get(
                        case_id,
                        np.nan,
                    ),

                "candidate_count_change":
                    np.nan,
            })


            continue


        case_start = (
            time.time()
        )


        image = (
            Image.open(
                image_path
            )
            .convert(
                "RGB"
            )
        )


        width, height = (
            image.size
        )


        # ====================================================
        # PROCESSOR
        # ====================================================

        inputs = (
            processor(
                images=image,
                text=text_prompt,
                return_tensors="pt",
            )
        )


        inputs = {

            key:
                value.to(
                    device
                )
                if isinstance(
                    value,
                    torch.Tensor,
                )
                else value

            for key, value
            in inputs.items()
        }


        # ====================================================
        # INFERENCE
        # ====================================================

        with torch.no_grad():

            outputs = model(
                **inputs
            )


        # ====================================================
        # POST-PROCESS
        # ====================================================

        processed = (
            processor
            .post_process_grounded_object_detection(
                outputs,
                inputs.get(
                    "input_ids"
                ),
                threshold=
                    BOX_THRESHOLD,
                text_threshold=
                    TEXT_THRESHOLD,
                target_sizes=[
                    (
                        height,
                        width,
                    )
                ],
            )[0]
        )


        boxes = (
            processed[
                "boxes"
            ]
            .detach()
            .cpu()
            .numpy()
        )


        scores = (
            processed[
                "scores"
            ]
            .detach()
            .cpu()
            .numpy()
        )


        # ====================================================
        # TRANSFORMERS 5.x COMPATIBILITY
        # ====================================================

        if (
            "text_labels"
            in processed
        ):

            text_labels = (
                processed[
                    "text_labels"
                ]
            )

        else:

            # Fallback only for compatibility.
            text_labels = [
                ""
                for _ in range(
                    len(
                        boxes
                    )
                )
            ]


        # ====================================================
        # RAW DETECTIONS
        # ====================================================

        raw_detections = []


        for (
            box,
            score,
            text_label,
        ) in zip(
            boxes,
            scores,
            text_labels,
        ):

            clipped = (
                clip_box(
                    box.tolist(),
                    width,
                    height,
                )
            )


            if (
                box_area(
                    clipped
                )
                <=
                0
            ):

                continue


            raw_detections.append({

                "box":
                    clipped,

                "score":
                    float(
                        score
                    ),

                "text_label":
                    str(
                        text_label
                    ),
            })


        raw_count = len(
            raw_detections
        )


        # ====================================================
        # NMS
        # ====================================================

        nms_detections = (
            apply_nms(
                raw_detections
            )
        )


        # ====================================================
        # V1.1 CRITICAL CHANGE
        #
        # NO merged-box filtering.
        #
        # Every plausible candidate surviving NMS is preserved.
        # ====================================================

        final_detections = (
            assign_arm_ids(
                nms_detections
            )
        )


        final_count = len(
            final_detections
        )


        # ====================================================
        # V1.0 COMPARISON
        # ====================================================

        v10_count = (
            v10_counts.get(
                case_id,
                np.nan,
            )
        )


        if pd.isna(
            v10_count
        ):

            count_change = (
                np.nan
            )

        else:

            count_change = (
                final_count
                -
                int(
                    v10_count
                )
            )


        # ====================================================
        # STATUS
        # ====================================================

        if final_count == 0:

            status = (
                "REVIEW_REQUIRED"
            )

            reason = (
                "NO_ARM_CANDIDATE"
            )


        elif final_count > 4:

            status = (
                "REVIEW_REQUIRED"
            )

            reason = (
                "MANY_ARM_CANDIDATES"
            )


        else:

            status = (
                "COMPLETED"
            )

            reason = ""


        # ====================================================
        # JSON
        # ====================================================

        json_path = (
            BOX_DIR
            /
            f"{case_id}_arm_candidates_v11.json"
        )


        payload = {

            "case_id":
                case_id,

            "base_protocol_version":
                BASE_PROTOCOL_VERSION,

            "candidate_protocol_version":
                CANDIDATE_PROTOCOL_VERSION,

            "batch_id":
                batch_name,

            "model":
                MODEL_NAME,

            "prompts":
                PROMPTS,

            "box_threshold":
                BOX_THRESHOLD,

            "text_threshold":
                TEXT_THRESHOLD,

            "nms_iou_threshold":
                NMS_IOU_THRESHOLD,

            "merged_box_filter":
                False,

            "image_width":
                width,

            "image_height":
                height,

            "raw_detection_count":
                raw_count,

            "v11_final_candidate_count":
                final_count,

            "v10_final_candidate_count":
                (
                    None
                    if pd.isna(
                        v10_count
                    )
                    else int(
                        v10_count
                    )
                ),

            "detections":
                final_detections,
        }


        with open(
            json_path,
            "w",
            encoding="utf-8",
        ) as file:

            json.dump(
                payload,
                file,
                indent=4,
                ensure_ascii=False,
            )


        # ====================================================
        # QC
        # ====================================================

        qc = (
            create_qc_image(
                image=image,
                case_id=case_id,
                detections=
                    final_detections,
                raw_count=
                    raw_count,
                nms_count=
                    final_count,
                v10_count=
                    (
                        "NA"
                        if pd.isna(
                            v10_count
                        )
                        else int(
                            v10_count
                        )
                    ),
            )
        )


        qc_path = (
            QC_DIR
            /
            f"{case_id}_arm_detection_v11_qc.jpg"
        )


        qc.save(
            qc_path,
            quality=95,
        )


        # ====================================================
        # DETECTION ROWS
        # ====================================================

        if final_count > 0:

            for detection in (
                final_detections
            ):

                x1, y1, x2, y2 = (
                    detection[
                        "box"
                    ]
                )


                result_rows.append({

                    "case_id":
                        case_id,

                    "batch_id":
                        batch_name,

                    "arm_id":
                        detection[
                            "arm_id"
                        ],

                    "score":
                        detection[
                            "score"
                        ],

                    "text_label":
                        detection[
                            "text_label"
                        ],

                    "x1":
                        x1,

                    "y1":
                        y1,

                    "x2":
                        x2,

                    "y2":
                        y2,

                    "box_width":
                        x2 - x1,

                    "box_height":
                        y2 - y1,

                    "box_area":
                        box_area(
                            detection[
                                "box"
                            ]
                        ),

                    "raw_detection_count":
                        raw_count,

                    "v11_candidate_count":
                        final_count,

                    "v10_candidate_count":
                        v10_count,

                    "candidate_count_change":
                        count_change,

                    "status":
                        status,

                    "reason":
                        reason,

                    "json_path":
                        str(
                            json_path
                        ),

                    "qc_path":
                        str(
                            qc_path
                        ),
                })


        else:

            result_rows.append({

                "case_id":
                    case_id,

                "batch_id":
                    batch_name,

                "arm_id":
                    "",

                "score":
                    np.nan,

                "text_label":
                    "",

                "x1":
                    np.nan,

                "y1":
                    np.nan,

                "x2":
                    np.nan,

                "y2":
                    np.nan,

                "box_width":
                    np.nan,

                "box_height":
                    np.nan,

                "box_area":
                    np.nan,

                "raw_detection_count":
                    raw_count,

                "v11_candidate_count":
                    final_count,

                "v10_candidate_count":
                    v10_count,

                "candidate_count_change":
                    count_change,

                "status":
                    status,

                "reason":
                    reason,

                "json_path":
                    str(
                        json_path
                    ),

                "qc_path":
                    str(
                        qc_path
                    ),
            })


        case_summary_rows.append({

            "case_id":
                case_id,

            "batch_id":
                batch_name,

            "status":
                status,

            "reason":
                reason,

            "raw_detection_count":
                raw_count,

            "v11_candidate_count":
                final_count,

            "v10_candidate_count":
                v10_count,

            "candidate_count_change":
                count_change,

            "qc_path":
                str(
                    qc_path
                ),
        })


        elapsed = (
            time.time()
            -
            case_start
        )


        print(
            f"raw={raw_count} | "
            f"V1.0={v10_count} | "
            f"V1.1={final_count} | "
            f"change={count_change} | "
            f"{status} | "
            f"{elapsed:.1f}s"
        )


        if (
            device.type
            ==
            "mps"
        ):

            torch.mps.empty_cache()


    # ========================================================
    # SAVE TABLES
    # ========================================================

    result_df = pd.DataFrame(
        result_rows
    )


    case_summary = pd.DataFrame(
        case_summary_rows
    )


    metadata_path = (
        METADATA_DIR
        /
        f"{batch_name}_arm_candidates_v11.csv"
    )


    summary_path = (
        METADATA_DIR
        /
        f"{batch_name}_summary_v11.csv"
    )


    comparison_path = (
        METADATA_DIR
        /
        f"{batch_name}_v10_vs_v11_comparison.csv"
    )


    result_df.to_csv(
        metadata_path,
        index=False,
        encoding="utf-8-sig",
    )


    case_summary.to_csv(
        summary_path,
        index=False,
        encoding="utf-8-sig",
    )


    comparison_columns = [

        "case_id",

        "raw_detection_count",

        "v10_candidate_count",

        "v11_candidate_count",

        "candidate_count_change",

        "status",

    ]


    case_summary[
        comparison_columns
    ].to_csv(
        comparison_path,
        index=False,
        encoding="utf-8-sig",
    )


    # ========================================================
    # SUMMARY COUNTS
    # ========================================================

    completed_count = int(
        (
            case_summary[
                "status"
            ]
            ==
            "COMPLETED"
        ).sum()
    )


    review_count = int(
        (
            case_summary[
                "status"
            ]
            ==
            "REVIEW_REQUIRED"
        ).sum()
    )


    fail_count = int(
        (
            case_summary[
                "status"
            ]
            ==
            "FAIL"
        ).sum()
    )


    increased_count = int(
        (
            case_summary[
                "candidate_count_change"
            ]
            >
            0
        ).sum()
    )


    unchanged_count = int(
        (
            case_summary[
                "candidate_count_change"
            ]
            ==
            0
        ).sum()
    )


    decreased_count = int(
        (
            case_summary[
                "candidate_count_change"
            ]
            <
            0
        ).sum()
    )


    elapsed_total = (
        time.time()
        -
        total_start
    )


    # ========================================================
    # FINAL OUTPUT
    # ========================================================

    print(
        "\n"
        +
        "=" * 80
    )


    print(
        "STEP 14B V1.1 SUMMARY"
    )


    print(
        "=" * 80
    )


    print(
        f"\nBatch: "
        f"{batch_name}"
    )


    print(
        f"Cases: "
        f"{len(case_summary)}"
    )


    print(
        f"COMPLETED: "
        f"{completed_count}"
    )


    print(
        f"REVIEW_REQUIRED: "
        f"{review_count}"
    )


    print(
        f"FAIL: "
        f"{fail_count}"
    )


    print(
        "\nCandidate-count comparison:"
    )


    print(
        f"V1.1 increased candidates: "
        f"{increased_count}"
    )


    print(
        f"Unchanged: "
        f"{unchanged_count}"
    )


    print(
        f"Decreased: "
        f"{decreased_count}"
    )


    print(
        "\nV1.1 candidate distribution:"
    )


    print(
        case_summary[
            "v11_candidate_count"
        ]
        .value_counts()
        .sort_index()
        .to_string()
    )


    print(
        "\nCases where V1.1 preserved more candidates:"
    )


    more_df = (
        case_summary[
            case_summary[
                "candidate_count_change"
            ]
            >
            0
        ]
        [
            [
                "case_id",
                "v10_candidate_count",
                "v11_candidate_count",
                "candidate_count_change",
            ]
        ]
    )


    if len(
        more_df
    ) == 0:

        print(
            "None"
        )

    else:

        print(
            more_df.to_string(
                index=False
            )
        )


    print(
        f"\nTotal time: "
        f"{elapsed_total / 60:.1f} min"
    )


    print(
        "\nComparison table:"
    )

    print(
        comparison_path
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
        "V1.0 remains frozen and unchanged."
    )


    print(
        "V1.1 is only a candidate revision."
    )


    print(
        "V1.1 removes the merged-box deletion rule "
        "and keeps all NMS survivors."
    )


    print(
        "Locked Test was not accessed."
    )


    print(
        "SAM2 was not run."
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
        "STEP 14B V1.1 COMPLETED"
    )


    print(
        "=" * 80
    )


if __name__ == "__main__":

    main()