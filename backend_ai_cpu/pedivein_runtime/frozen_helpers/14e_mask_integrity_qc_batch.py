from pathlib import Path
import argparse
import json
import shutil

import cv2
import numpy as np
import pandas as pd
from PIL import Image


# ============================================================
# PEDIVEIN CARE AI
# PHASE 2 - STEP 14E
# MASK INTEGRITY QC V2
#
# ACTIVE PROTOCOL:
# PEDIVEIN_PREPROC_V1.1
#
# INPUT:
# - Final target-arm masks from STEP 14D.2
# - Final selected arm-only images
#
# PURPOSE:
# 1. Preserve meaningful mask components
# 2. Detect enclosed holes
# 3. Restore small enclosed holes using ORIGINAL pixels
# 4. Detect open-boundary defects
# 5. Flag masks needing manual review
#
# IMPORTANT:
# - LOCKED_TEST only
# - LOCKED TEST is NOT accessed
# - No synthetic pixels
# - No generative inpainting
# - No diagnosis / grade / redness / swelling
# - No classifier training
#
# These thresholds are Pedivein engineering heuristics,
# not clinical standards.
# ============================================================


# ============================================================
# CONFIG
# ============================================================

PROTOCOL_VERSION = "PEDIVEIN_PREPROC_V1.1"

MASK_INTEGRITY_VERSION = "MASK_INTEGRITY_V2"

EXPECTED_BATCH_MAX = 20

BACKGROUND_VALUE = 128


# ------------------------------------------------------------
# Frozen V2 thresholds from pilot
# ------------------------------------------------------------

MEANINGFUL_COMPONENT_RATIO = 0.01

MAX_SINGLE_HOLE_RATIO_AUTO_FILL = 0.05

MAX_TOTAL_HOLE_RATIO_PASS = 0.08

OPEN_BOUNDARY_REVIEW_RATIO = 0.015


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

FINAL_SELECTION_ROOT = (
    DEV_ROOT
    / "03_target_arm_v11"
    / "final_selection"
)

FINAL_METADATA_DIR = (
    FINAL_SELECTION_ROOT
    / "metadata"
)

FINAL_MASK_DIR = (
    FINAL_SELECTION_ROOT
    / "selected_masks"
)

OUTPUT_ROOT = (
    DEV_ROOT
    / "04_mask_integrity_v11"
)

CORRECTED_MASK_DIR = (
    OUTPUT_ROOT
    / "corrected_masks"
)

CORRECTED_ARM_ONLY_DIR = (
    OUTPUT_ROOT
    / "corrected_arm_only"
)

QC_DIR = (
    OUTPUT_ROOT
    / "qc"
)

METADATA_DIR = (
    OUTPUT_ROOT
    / "metadata"
)

JSON_DIR = (
    OUTPUT_ROOT
    / "json"
)


for directory in [
    OUTPUT_ROOT,
    CORRECTED_MASK_DIR,
    CORRECTED_ARM_ONLY_DIR,
    QC_DIR,
    METADATA_DIR,
    JSON_DIR,
]:

    directory.mkdir(
        parents=True,
        exist_ok=True,
    )


# ============================================================
# RESOLVE ORIGINAL IMAGE
# ============================================================

def resolve_original_image(
    case_id,
    batch_df,
):

    case_rows = (
        batch_df[
            batch_df[
                "case_id"
            ]
            .astype(str)
            ==
            str(case_id)
        ]
    )

    if len(
        case_rows
    ) != 1:

        return None

    row = (
        case_rows.iloc[0]
    )

    if (
        "working_image_path"
        in
        row.index
    ):

        candidate = Path(
            str(
                row[
                    "working_image_path"
                ]
            )
        )

        if candidate.exists():

            return candidate

    matches = sorted(
        INPUT_DIR.glob(
            f"{case_id}.*"
        )
    )

    if len(
        matches
    ) == 0:

        return None

    return matches[0]


# ============================================================
# LOAD BINARY MASK
# ============================================================

def load_binary_mask(
    path,
):

    mask = cv2.imread(
        str(path),
        cv2.IMREAD_GRAYSCALE,
    )

    if mask is None:

        raise RuntimeError(
            f"Cannot read mask:\n{path}"
        )

    return (
        mask > 0
    ).astype(
        np.uint8
    )


# ============================================================
# CONNECTED COMPONENT ANALYSIS
# ============================================================

def preserve_meaningful_components(
    mask,
):

    count, labels, stats, _ = (
        cv2.connectedComponentsWithStats(
            mask.astype(
                np.uint8
            ),
            connectivity=8,
        )
    )

    component_areas = []

    for label_id in range(
        1,
        count,
    ):

        area = int(
            stats[
                label_id,
                cv2.CC_STAT_AREA
            ]
        )

        component_areas.append(
            (
                label_id,
                area,
            )
        )

    if len(
        component_areas
    ) == 0:

        return (
            np.zeros_like(
                mask
            ),
            {
                "component_count":
                    0,

                "largest_component_area":
                    0,

                "meaningful_component_count":
                    0,

                "removed_small_component_count":
                    0,

                "removed_small_component_area":
                    0,
            },
        )

    largest_area = max(
        area
        for _, area
        in component_areas
    )

    meaningful_threshold = (
        largest_area
        *
        MEANINGFUL_COMPONENT_RATIO
    )

    output = np.zeros_like(
        mask,
        dtype=np.uint8,
    )

    meaningful_count = 0

    removed_count = 0

    removed_area = 0

    for label_id, area in (
        component_areas
    ):

        if (
            area
            >=
            meaningful_threshold
        ):

            output[
                labels
                ==
                label_id
            ] = 1

            meaningful_count += 1

        else:

            removed_count += 1

            removed_area += (
                area
            )

    metrics = {

        "component_count":
            len(
                component_areas
            ),

        "largest_component_area":
            int(
                largest_area
            ),

        "meaningful_component_count":
            int(
                meaningful_count
            ),

        "removed_small_component_count":
            int(
                removed_count
            ),

        "removed_small_component_area":
            int(
                removed_area
            ),
    }

    return (
        output,
        metrics,
    )


# ============================================================
# FIND ENCLOSED HOLES
# ============================================================

def find_enclosed_holes(
    mask,
):
    """
    Find background regions completely enclosed by foreground.

    Border-connected background is NOT considered a hole.
    """

    inverse = (
        1
        -
        mask
    ).astype(
        np.uint8
    )

    count, labels, stats, _ = (
        cv2.connectedComponentsWithStats(
            inverse,
            connectivity=8,
        )
    )

    height, width = (
        mask.shape
    )

    hole_records = []

    hole_mask = np.zeros_like(
        mask,
        dtype=np.uint8,
    )

    for label_id in range(
        1,
        count,
    ):

        component = (
            labels
            ==
            label_id
        )

        ys, xs = np.where(
            component
        )

        if len(
            xs
        ) == 0:

            continue

        touches_border = (

            np.any(
                xs
                ==
                0
            )

            or

            np.any(
                xs
                ==
                width - 1
            )

            or

            np.any(
                ys
                ==
                0
            )

            or

            np.any(
                ys
                ==
                height - 1
            )
        )

        if touches_border:

            continue

        area = int(
            stats[
                label_id,
                cv2.CC_STAT_AREA
            ]
        )

        hole_mask[
            component
        ] = 1

        hole_records.append({

            "label_id":
                int(
                    label_id
                ),

            "area":
                area,
        })

    return (
        hole_mask,
        hole_records,
    )


# ============================================================
# RESTORE SMALL ENCLOSED HOLES
# ============================================================

def restore_small_holes(
    mask,
    hole_records,
    hole_mask_labels,
):
    """
    Restore only enclosed holes whose individual area
    is <= 5% of current foreground area.

    No synthetic pixels are created.
    """

    foreground_area = int(
        mask.sum()
    )

    if foreground_area <= 0:

        return (
            mask.copy(),
            [],
        )

    output = (
        mask.copy()
    )

    restored_records = []

    for record in (
        hole_records
    ):

        hole_area = int(
            record[
                "area"
            ]
        )

        hole_ratio = (
            hole_area
            /
            foreground_area
        )

        if (
            hole_ratio
            <=
            MAX_SINGLE_HOLE_RATIO_AUTO_FILL
        ):

            label_id = int(
                record[
                    "label_id"
                ]
            )

            output[
                hole_mask_labels
                ==
                label_id
            ] = 1

            restored_records.append({

                "label_id":
                    label_id,

                "area":
                    hole_area,

                "ratio":
                    float(
                        hole_ratio
                    ),
            })

    return (
        output,
        restored_records,
    )


# ============================================================
# HOLE ANALYSIS WITH LABEL MAP
# ============================================================

def analyze_holes(
    mask,
):

    inverse = (
        1
        -
        mask
    ).astype(
        np.uint8
    )

    count, labels, stats, _ = (
        cv2.connectedComponentsWithStats(
            inverse,
            connectivity=8,
        )
    )

    height, width = (
        mask.shape
    )

    foreground_area = max(
        1,
        int(
            mask.sum()
        ),
    )

    records = []

    total_hole_area = 0

    for label_id in range(
        1,
        count,
    ):

        component = (
            labels
            ==
            label_id
        )

        ys, xs = np.where(
            component
        )

        if len(
            xs
        ) == 0:

            continue

        touches_border = (

            np.any(
                xs
                ==
                0
            )

            or

            np.any(
                xs
                ==
                width - 1
            )

            or

            np.any(
                ys
                ==
                0
            )

            or

            np.any(
                ys
                ==
                height - 1
            )
        )

        if touches_border:

            continue

        area = int(
            stats[
                label_id,
                cv2.CC_STAT_AREA
            ]
        )

        ratio = (
            area
            /
            foreground_area
        )

        total_hole_area += (
            area
        )

        records.append({

            "label_id":
                int(
                    label_id
                ),

            "area":
                area,

            "ratio":
                float(
                    ratio
                ),
        })

    total_hole_ratio = (
        total_hole_area
        /
        foreground_area
    )

    return (
        labels,
        records,
        int(
            total_hole_area
        ),
        float(
            total_hole_ratio
        ),
    )


# ============================================================
# OPEN-BOUNDARY DIAGNOSTIC
# ============================================================

def calculate_open_boundary_ratio(
    mask,
):
    """
    Diagnostic only.

    Estimates mask-edge pixels that touch image boundary.

    These are NOT auto-filled.
    """

    height, width = (
        mask.shape
    )

    foreground_area = max(
        1,
        int(
            mask.sum()
        ),
    )

    border_mask = np.zeros_like(
        mask,
        dtype=np.uint8,
    )

    border_mask[
        0,
        :
    ] = 1

    border_mask[
        height - 1,
        :
    ] = 1

    border_mask[
        :,
        0
    ] = 1

    border_mask[
        :,
        width - 1
    ] = 1

    kernel = np.ones(
        (
            3,
            3,
        ),
        dtype=np.uint8,
    )

    dilated_border = (
        cv2.dilate(
            border_mask,
            kernel,
            iterations=1,
        )
    )

    touching_pixels = int(
        np.logical_and(
            mask > 0,
            dilated_border > 0,
        ).sum()
    )

    ratio = (
        touching_pixels
        /
        foreground_area
    )

    return (
        touching_pixels,
        float(
            ratio
        ),
    )


# ============================================================
# CREATE ARM ONLY IMAGE
# ============================================================

def create_arm_only(
    original_rgb,
    mask,
):

    output = np.full_like(
        original_rgb,
        BACKGROUND_VALUE,
        dtype=np.uint8,
    )

    output[
        mask > 0
    ] = (
        original_rgb[
            mask > 0
        ]
    )

    return output


# ============================================================
# QC STATUS
# ============================================================

def determine_status(
    meaningful_component_count,
    total_hole_ratio,
    open_boundary_ratio,
):

    reasons = []

    if (
        meaningful_component_count
        <=
        0
    ):

        reasons.append(
            "NO_MEANINGFUL_COMPONENT"
        )

    if (
        total_hole_ratio
        >
        MAX_TOTAL_HOLE_RATIO_PASS
    ):

        reasons.append(
            "EXCESSIVE_TOTAL_HOLE_AREA"
        )

    if (
        open_boundary_ratio
        >
        OPEN_BOUNDARY_REVIEW_RATIO
    ):

        reasons.append(
            "OPEN_BOUNDARY_DEFECT"
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

    final_selection_path = (
        FINAL_METADATA_DIR
        /
        f"{batch_name}_final_target_selection.csv"
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
        "STEP 14E - MASK INTEGRITY QC V2"
    )

    print(
        "=" * 80
    )

    print(
        f"\nProtocol: "
        f"{PROTOCOL_VERSION}"
    )

    print(
        f"Mask integrity rule: "
        f"{MASK_INTEGRITY_VERSION}"
    )

    print(
        f"Batch: "
        f"{batch_name}"
    )

    # ========================================================
    # LOAD
    # ========================================================

    if not batch_path.exists():

        raise FileNotFoundError(
            f"Batch file not found:\n{batch_path}"
        )

    if not final_selection_path.exists():

        raise FileNotFoundError(
            (
                "Final target selection not found:\n"
                f"{final_selection_path}"
            )
        )

    batch_df = pd.read_csv(
        batch_path
    )

    final_df = pd.read_csv(
        final_selection_path
    )

    # ========================================================
    # SAFETY
    # ========================================================

    if len(
        batch_df
    ) > EXPECTED_BATCH_MAX:

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
                "CRITICAL: non-locked test partition "
                f"detected: {partitions}"
            )
        )

    if len(
        final_df
    ) != len(
        batch_df
    ):

        raise RuntimeError(
            (
                "CRITICAL: final target selection count "
                "does not match batch count."
            )
        )

    # ========================================================
    # PROCESS
    # ========================================================

    result_rows = []

    for index, (_, row) in enumerate(
        final_df.iterrows(),
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
            f"[{index:02d}/"
            f"{len(final_df):02d}] "
            f"{case_id}"
        )

        original_path = (
            resolve_original_image(
                case_id,
                batch_df,
            )
        )

        mask_path = Path(
            str(
                row[
                    "selected_mask_path"
                ]
            )
        )

        if not mask_path.exists():

            mask_path = (
                FINAL_MASK_DIR
                /
                f"{case_id}_target_arm_mask.png"
            )

        if (
            original_path is None
            or
            not original_path.exists()
        ):

            raise FileNotFoundError(
                f"{case_id}: original image not found."
            )

        if not mask_path.exists():

            raise FileNotFoundError(
                f"{case_id}: selected mask not found."
            )

        original_rgb = np.array(
            Image.open(
                original_path
            )
            .convert(
                "RGB"
            )
        )

        mask = (
            load_binary_mask(
                mask_path
            )
        )

        if (
            original_rgb.shape[
                :2
            ]
            !=
            mask.shape
        ):

            raise RuntimeError(
                (
                    f"{case_id}: image/mask size mismatch "
                    f"{original_rgb.shape[:2]} vs "
                    f"{mask.shape}"
                )
            )

        # ====================================================
        # COMPONENT PRESERVATION
        # ====================================================

        (
            component_filtered_mask,
            component_metrics,
        ) = (
            preserve_meaningful_components(
                mask
            )
        )

        # ====================================================
        # HOLE ANALYSIS BEFORE REPAIR
        # ====================================================

        (
            hole_labels,
            hole_records,
            total_hole_area,
            total_hole_ratio,
        ) = (
            analyze_holes(
                component_filtered_mask
            )
        )

        # ====================================================
        # RESTORE SMALL ENCLOSED HOLES
        # ====================================================

        (
            corrected_mask,
            restored_holes,
        ) = (
            restore_small_holes(
                component_filtered_mask,
                hole_records,
                hole_labels,
            )
        )

        # ====================================================
        # OPEN BOUNDARY
        # ====================================================

        (
            open_boundary_pixels,
            open_boundary_ratio,
        ) = (
            calculate_open_boundary_ratio(
                corrected_mask
            )
        )

        # ====================================================
        # STATUS
        # ====================================================

        (
            qc_status,
            qc_reason,
        ) = (
            determine_status(
                meaningful_component_count=
                    component_metrics[
                        "meaningful_component_count"
                    ],

                total_hole_ratio=
                    total_hole_ratio,

                open_boundary_ratio=
                    open_boundary_ratio,
            )
        )

        # ====================================================
        # SAVE CORRECTED MASK
        # ====================================================

        corrected_mask_path = (
            CORRECTED_MASK_DIR
            /
            f"{case_id}_mask_integrity_v2.png"
        )

        cv2.imwrite(
            str(
                corrected_mask_path
            ),
            corrected_mask
            *
            255,
        )

        # ====================================================
        # SAVE CORRECTED ARM-ONLY IMAGE
        # ====================================================

        corrected_arm_only = (
            create_arm_only(
                original_rgb=
                    original_rgb,

                mask=
                    corrected_mask,
            )
        )

        corrected_arm_only_path = (
            CORRECTED_ARM_ONLY_DIR
            /
            f"{case_id}_arm_only_integrity_v2.png"
        )

        Image.fromarray(
            corrected_arm_only
        ).save(
            corrected_arm_only_path
        )

        # ====================================================
        # JSON AUDIT
        # ====================================================

        json_path = (
            JSON_DIR
            /
            f"{case_id}_mask_integrity_v2.json"
        )

        payload = {

            "case_id":
                case_id,

            "batch_id":
                batch_name,

            "protocol_version":
                PROTOCOL_VERSION,

            "mask_integrity_version":
                MASK_INTEGRITY_VERSION,

            "status":
                qc_status,

            "reason":
                qc_reason,

            "thresholds": {

                "meaningful_component_ratio":
                    MEANINGFUL_COMPONENT_RATIO,

                "max_single_hole_ratio_auto_fill":
                    MAX_SINGLE_HOLE_RATIO_AUTO_FILL,

                "max_total_hole_ratio_pass":
                    MAX_TOTAL_HOLE_RATIO_PASS,

                "open_boundary_review_ratio":
                    OPEN_BOUNDARY_REVIEW_RATIO,
            },

            "component_metrics":
                component_metrics,

            "hole_count":
                len(
                    hole_records
                ),

            "total_hole_area":
                total_hole_area,

            "total_hole_ratio":
                total_hole_ratio,

            "restored_hole_count":
                len(
                    restored_holes
                ),

            "restored_holes":
                restored_holes,

            "open_boundary_pixels":
                open_boundary_pixels,

            "open_boundary_ratio":
                open_boundary_ratio,

            "source_mask_path":
                str(
                    mask_path
                ),

            "corrected_mask_path":
                str(
                    corrected_mask_path
                ),

            "corrected_arm_only_path":
                str(
                    corrected_arm_only_path
                ),

            "synthetic_pixels_used":
                False,

            "inpainting_used":
                False,

            "clinical_features_used":
                False,
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
        # TABLE ROW
        # ====================================================

        result_rows.append({

            "case_id":
                case_id,

            "batch_id":
                batch_name,

            "status":
                qc_status,

            "reason":
                qc_reason,

            "original_component_count":
                component_metrics[
                    "component_count"
                ],

            "meaningful_component_count":
                component_metrics[
                    "meaningful_component_count"
                ],

            "removed_small_component_count":
                component_metrics[
                    "removed_small_component_count"
                ],

            "removed_small_component_area":
                component_metrics[
                    "removed_small_component_area"
                ],

            "hole_count":
                len(
                    hole_records
                ),

            "total_hole_area":
                total_hole_area,

            "total_hole_ratio":
                total_hole_ratio,

            "restored_hole_count":
                len(
                    restored_holes
                ),

            "open_boundary_pixels":
                open_boundary_pixels,

            "open_boundary_ratio":
                open_boundary_ratio,

            "corrected_mask_path":
                str(
                    corrected_mask_path
                ),

            "corrected_arm_only_path":
                str(
                    corrected_arm_only_path
                ),

            "json_path":
                str(
                    json_path
                ),
        })

        print(
            f"components="
            f"{component_metrics['component_count']} | "
            f"meaningful="
            f"{component_metrics['meaningful_component_count']} | "
            f"holes={len(hole_records)} | "
            f"hole_ratio={total_hole_ratio:.4f} | "
            f"open_boundary={open_boundary_ratio:.4f} | "
            f"{qc_status}"
        )

        if qc_reason:

            print(
                f"Reason: "
                f"{qc_reason}"
            )

    # ========================================================
    # SAVE METADATA
    # ========================================================

    result_df = (
        pd.DataFrame(
            result_rows
        )
    )

    output_csv = (
        METADATA_DIR
        /
        f"{batch_name}_mask_integrity_v2.csv"
    )

    review_csv = (
        METADATA_DIR
        /
        f"{batch_name}_mask_integrity_review_queue.csv"
    )

    result_df.to_csv(
        output_csv,
        index=False,
        encoding="utf-8-sig",
    )

    review_df = (
        result_df[
            result_df[
                "status"
            ]
            ==
            "REVIEW_REQUIRED"
        ]
        .copy()
    )

    review_df.to_csv(
        review_csv,
        index=False,
        encoding="utf-8-sig",
    )

    # ========================================================
    # SUMMARY
    # ========================================================

    pass_count = int(
        (
            result_df[
                "status"
            ]
            ==
            "PASS"
        ).sum()
    )

    review_count = int(
        (
            result_df[
                "status"
            ]
            ==
            "REVIEW_REQUIRED"
        ).sum()
    )

    total_restored_holes = int(
        result_df[
            "restored_hole_count"
        ].sum()
    )

    print(
        "\n"
        +
        "=" * 80
    )

    print(
        "STEP 14E SUMMARY"
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
        f"{len(result_df)}"
    )

    print(
        "\nMask integrity:"
    )

    print(
        f"PASS: "
        f"{pass_count}"
    )

    print(
        f"REVIEW_REQUIRED: "
        f"{review_count}"
    )

    print(
        f"Total enclosed holes restored: "
        f"{total_restored_holes}"
    )

    print(
        "\nReview queue:"
    )

    if len(
        review_df
    ) == 0:

        print(
            "None"
        )

    else:

        columns = [
            "case_id",
            "total_hole_ratio",
            "open_boundary_ratio",
            "meaningful_component_count",
            "reason",
        ]

        print(
            review_df[
                columns
            ]
            .to_string(
                index=False
            )
        )

    print(
        "\nMetadata:"
    )

    print(
        output_csv
    )

    print(
        "\nReview queue file:"
    )

    print(
        review_csv
    )

    print(
        "\nCorrected masks:"
    )

    print(
        CORRECTED_MASK_DIR
    )

    print(
        "\nCorrected arm-only images:"
    )

    print(
        CORRECTED_ARM_ONLY_DIR
    )

    print(
        "\nIMPORTANT:"
    )

    print(
        "Meaningful mask components were preserved."
    )

    print(
        "Only small ENCLOSED holes were automatically restored."
    )

    print(
        "Restoration uses original image pixels only."
    )

    print(
        "Open-boundary defects were never automatically filled."
    )

    print(
        "No synthetic pixels or generative inpainting were used."
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
        "STEP 14E COMPLETED"
    )

    print(
        "=" * 80
    )


if __name__ == "__main__":

    main()