from pathlib import Path
import argparse
import json
import math

import cv2
import numpy as np
import pandas as pd


# ============================================================
# PEDIVEIN CARE AI
# PHASE 2 - STEP 14D
# GEOMETRY-ONLY TARGET ARM SELECTION
#
# ACTIVE PROTOCOL:
# PEDIVEIN_PREPROC_V1.1
#
# INPUT:
# - V1.1 Grounding DINO candidates
# - SAM2 masks
# - SAM2_QC_V1.1 rescored metadata
#
# PURPOSE:
# 1. Exclude candidates marked REVIEW_REQUIRED by SAM2 QC
# 2. Compute transparent geometry-only score
# 3. Auto-select target arm only when:
#       score >= 0.45
#       margin >= 0.10
# 4. Otherwise send case to REVIEW_REQUIRED
#
# IMPORTANT:
# - No diagnosis
# - No grade
# - No redness
# - No swelling
# - No lesion appearance
# - No text/OCR
# - No classifier
# - Locked Test is NOT accessed
#
# Score is a Pedivein engineering heuristic.
# It is NOT a clinical standard.
# ============================================================


# ============================================================
# CONFIG
# ============================================================

PROTOCOL_VERSION = "PEDIVEIN_PREPROC_V1.1"

TARGET_SELECTION_VERSION = "TARGET_GEOMETRY_V1.1"

AUTO_SCORE_THRESHOLD = 0.45

AUTO_MARGIN_THRESHOLD = 0.10

EXPECTED_BATCH_MAX = 20


# ------------------------------------------------------------
# Geometry score weights
#
# Total = 1.00
# ------------------------------------------------------------

WEIGHT_COMPONENT_COHERENCE = 0.30
WEIGHT_MASK_BOX_FIT = 0.25
WEIGHT_ELONGATION = 0.25
WEIGHT_RELATIVE_AREA = 0.20


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

BATCH_DIR = (
    DEV_ROOT
    / "metadata"
    / "batches"
)

SAM2_ROOT = (
    DEV_ROOT
    / "02_arm_masks_v11"
)

SAM2_RESCORED_DIR = (
    SAM2_ROOT
    / "metadata_rescored"
)

MASK_DIR = (
    SAM2_ROOT
    / "masks"
)

OUTPUT_ROOT = (
    DEV_ROOT
    / "03_target_arm_v11"
)

METADATA_DIR = (
    OUTPUT_ROOT
    / "metadata"
)

SELECTION_DIR = (
    OUTPUT_ROOT
    / "selections"
)

for directory in [
    OUTPUT_ROOT,
    METADATA_DIR,
    SELECTION_DIR,
]:

    directory.mkdir(
        parents=True,
        exist_ok=True,
    )


# ============================================================
# UTILITY
# ============================================================

def clamp01(value):

    return max(
        0.0,
        min(
            1.0,
            float(value),
        ),
    )


# ============================================================
# LOAD MASK
# ============================================================

def load_binary_mask(
    mask_path,
):

    mask = cv2.imread(
        str(mask_path),
        cv2.IMREAD_GRAYSCALE,
    )

    if mask is None:

        raise RuntimeError(
            f"Cannot read mask:\n{mask_path}"
        )

    return (
        mask > 0
    ).astype(
        np.uint8
    )


# ============================================================
# MASK BOUNDING BOX
# ============================================================

def mask_bbox(
    mask,
):

    ys, xs = np.where(
        mask > 0
    )

    if len(xs) == 0:

        return None

    x1 = int(
        xs.min()
    )

    y1 = int(
        ys.min()
    )

    x2 = int(
        xs.max()
    ) + 1

    y2 = int(
        ys.max()
    ) + 1

    return [
        x1,
        y1,
        x2,
        y2,
    ]


# ============================================================
# ELONGATION SCORE
# ============================================================

def calculate_elongation_score(
    mask,
):
    """
    Uses PCA on foreground coordinates.

    Arm-like masks are generally elongated.

    Score:
        1 - minor_axis / major_axis

    Range:
        0 = approximately round/square
        1 = strongly elongated

    This is geometry only.
    """

    ys, xs = np.where(
        mask > 0
    )

    if len(xs) < 10:

        return 0.0

    points = np.column_stack(
        [
            xs,
            ys,
        ]
    ).astype(
        np.float64
    )

    centered = (
        points
        -
        points.mean(
            axis=0
        )
    )

    covariance = np.cov(
        centered,
        rowvar=False,
    )

    try:

        eigenvalues = (
            np.linalg.eigvalsh(
                covariance
            )
        )

    except np.linalg.LinAlgError:

        return 0.0

    eigenvalues = np.sort(
        eigenvalues
    )

    minor = max(
        float(
            eigenvalues[0]
        ),
        0.0,
    )

    major = max(
        float(
            eigenvalues[-1]
        ),
        1e-8,
    )

    ratio = math.sqrt(
        minor
        /
        major
    )

    elongation = (
        1.0
        -
        ratio
    )

    return clamp01(
        elongation
    )


# ============================================================
# MASK / BOX FIT SCORE
# ============================================================

def calculate_mask_box_fit_score(
    mask_vs_box_ratio,
    mask_inside_box_ratio,
):
    """
    Geometry-only box consistency.

    A useful segmentation should:
    - substantially occupy the prompted box
    - remain reasonably consistent with that box

    We do NOT require perfect containment because
    SAM2 can legitimately extend outside the DINO box.
    """

    occupancy = clamp01(
        mask_vs_box_ratio
    )

    containment = clamp01(
        mask_inside_box_ratio
    )

    score = (
        0.60
        *
        occupancy
        +
        0.40
        *
        containment
    )

    return clamp01(
        score
    )


# ============================================================
# COMPONENT COHERENCE
# ============================================================

def calculate_component_coherence(
    largest_component_ratio,
):
    """
    Higher score when most foreground pixels belong
    to one dominant connected component.
    """

    if pd.isna(
        largest_component_ratio
    ):

        return 0.0

    return clamp01(
        largest_component_ratio
    )


# ============================================================
# RELATIVE AREA SCORE
# ============================================================

def calculate_relative_area_scores(
    eligible_df,
):
    """
    Relative within-case mask area.

    Largest eligible candidate receives 1.0.
    Others are scaled proportionally.

    This is used only as a weak geometry cue.
    """

    areas = (
        pd.to_numeric(
            eligible_df[
                "mask_image_area_ratio"
            ],
            errors="coerce",
        )
        .fillna(
            0.0
        )
        .to_numpy(
            dtype=float
        )
    )

    if len(
        areas
    ) == 0:

        return np.array(
            [],
            dtype=float,
        )

    max_area = float(
        np.max(
            areas
        )
    )

    if max_area <= 0:

        return np.zeros_like(
            areas,
            dtype=float,
        )

    return (
        areas
        /
        max_area
    )


# ============================================================
# COMPUTE GEOMETRY SCORE
# ============================================================

def calculate_geometry_score(
    component_score,
    mask_box_score,
    elongation_score,
    relative_area_score,
):

    total = (

        WEIGHT_COMPONENT_COHERENCE
        *
        component_score

        +

        WEIGHT_MASK_BOX_FIT
        *
        mask_box_score

        +

        WEIGHT_ELONGATION
        *
        elongation_score

        +

        WEIGHT_RELATIVE_AREA
        *
        relative_area_score
    )

    return clamp01(
        total
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

    sam2_metadata_path = (
        SAM2_RESCORED_DIR
        /
        f"{batch_name}_sam2_candidates_rescored.csv"
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
        "STEP 14D - GEOMETRY-ONLY TARGET ARM SELECTION"
    )

    print(
        "=" * 80
    )

    print(
        f"\nProtocol: "
        f"{PROTOCOL_VERSION}"
    )

    print(
        f"Target selection rule: "
        f"{TARGET_SELECTION_VERSION}"
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
            f"Batch manifest not found:\n{batch_path}"
        )

    if not sam2_metadata_path.exists():

        raise FileNotFoundError(
            (
                "Rescored SAM2 metadata not found:\n"
                f"{sam2_metadata_path}"
            )
        )

    batch_df = pd.read_csv(
        batch_path
    )

    sam2_df = pd.read_csv(
        sam2_metadata_path
    )

    if len(
        batch_df
    ) > EXPECTED_BATCH_MAX:

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
                "CRITICAL: non-locked test partition detected: "
                f"{partitions}"
            )
        )

    expected_cases = set(
        batch_df[
            "case_id"
        ]
        .astype(str)
    )

    sam2_cases = set(
        sam2_df[
            "case_id"
        ]
        .astype(str)
    )

    if not sam2_cases.issubset(
        expected_cases
    ):

        unexpected = (
            sam2_cases
            -
            expected_cases
        )

        raise RuntimeError(
            (
                "CRITICAL: SAM2 metadata contains cases "
                "outside requested LOCKED_TEST batch: "
                f"{sorted(unexpected)}"
            )
        )

    print(
        f"Cases in batch: "
        f"{len(batch_df)}"
    )

    print(
        f"SAM2 candidate records: "
        f"{len(sam2_df)}"
    )

    # ========================================================
    # RESULT CONTAINERS
    # ========================================================

    candidate_rows = []

    case_rows = []

    # ========================================================
    # CASE LOOP
    # ========================================================

    for index, case_id in enumerate(
        batch_df[
            "case_id"
        ]
        .astype(str),
        start=1,
    ):

        print(
            "\n"
            +
            "-" * 80
        )

        print(
            f"[{index:02d}/"
            f"{len(batch_df):02d}] "
            f"{case_id}"
        )

        case_df = (
            sam2_df[
                sam2_df[
                    "case_id"
                ]
                .astype(str)
                ==
                case_id
            ]
            .copy()
        )

        if len(
            case_df
        ) == 0:

            print(
                "No SAM2 candidates found."
            )

            case_rows.append({

                "case_id":
                    case_id,

                "batch_id":
                    batch_name,

                "status":
                    "REVIEW_REQUIRED",

                "reason":
                    "NO_SAM2_CANDIDATES",

                "total_candidate_count":
                    0,

                "eligible_candidate_count":
                    0,

                "excluded_candidate_count":
                    0,

                "selected_arm_id":
                    "",

                "selected_score":
                    np.nan,

                "runner_up_score":
                    np.nan,

                "score_margin":
                    np.nan,
            })

            continue

        # ====================================================
        # ELIGIBLE CANDIDATES
        # ====================================================

        eligible_mask = (
            case_df[
                "candidate_qc_status"
            ]
            .astype(str)
            .str.upper()
            ==
            "PASS"
        )

        eligible_df = (
            case_df[
                eligible_mask
            ]
            .copy()
        )

        excluded_df = (
            case_df[
                ~eligible_mask
            ]
            .copy()
        )

        total_candidate_count = len(
            case_df
        )

        eligible_candidate_count = len(
            eligible_df
        )

        excluded_candidate_count = len(
            excluded_df
        )

        # ====================================================
        # NO ELIGIBLE CANDIDATE
        # ====================================================

        if (
            eligible_candidate_count
            ==
            0
        ):

            for _, row in (
                excluded_df.iterrows()
            ):

                candidate_rows.append({

                    "case_id":
                        case_id,

                    "batch_id":
                        batch_name,

                    "arm_id":
                        row[
                            "arm_id"
                        ],

                    "candidate_qc_status":
                        row[
                            "candidate_qc_status"
                        ],

                    "candidate_qc_reason":
                        row[
                            "candidate_qc_reason"
                        ],

                    "eligible_for_selection":
                        False,

                    "component_score":
                        np.nan,

                    "mask_box_score":
                        np.nan,

                    "elongation_score":
                        np.nan,

                    "relative_area_score":
                        np.nan,

                    "geometry_score":
                        np.nan,

                    "selection_rank":
                        np.nan,
                })

            case_rows.append({

                "case_id":
                    case_id,

                "batch_id":
                    batch_name,

                "status":
                    "REVIEW_REQUIRED",

                "reason":
                    "NO_ELIGIBLE_SAM2_CANDIDATE",

                "total_candidate_count":
                    total_candidate_count,

                "eligible_candidate_count":
                    0,

                "excluded_candidate_count":
                    excluded_candidate_count,

                "selected_arm_id":
                    "",

                "selected_score":
                    np.nan,

                "runner_up_score":
                    np.nan,

                "score_margin":
                    np.nan,
            })

            print(
                "REVIEW_REQUIRED | "
                "no eligible SAM2 candidates"
            )

            continue

        # ====================================================
        # RELATIVE AREA
        # ====================================================

        relative_area_scores = (
            calculate_relative_area_scores(
                eligible_df
            )
        )

        geometry_records = []

        # ====================================================
        # SCORE ELIGIBLE CANDIDATES
        # ====================================================

        for row_position, (_, row) in enumerate(
            eligible_df.iterrows()
        ):

            arm_id = str(
                row[
                    "arm_id"
                ]
            )

            mask_path = Path(
                str(
                    row[
                        "mask_path"
                    ]
                )
            )

            if not mask_path.exists():

                fallback = (
                    MASK_DIR
                    /
                    f"{case_id}_{arm_id}_sam2_mask.png"
                )

                mask_path = fallback

            if not mask_path.exists():

                component_score = 0.0
                mask_box_score = 0.0
                elongation_score = 0.0

            else:

                mask = (
                    load_binary_mask(
                        mask_path
                    )
                )

                component_score = (
                    calculate_component_coherence(
                        row[
                            "largest_component_ratio"
                        ]
                    )
                )

                mask_box_score = (
                    calculate_mask_box_fit_score(
                        mask_vs_box_ratio=
                            row[
                                "mask_vs_box_ratio"
                            ],

                        mask_inside_box_ratio=
                            row[
                                "mask_inside_box_ratio"
                            ],
                    )
                )

                elongation_score = (
                    calculate_elongation_score(
                        mask
                    )
                )

            relative_area_score = float(
                relative_area_scores[
                    row_position
                ]
            )

            geometry_score = (
                calculate_geometry_score(
                    component_score=
                        component_score,

                    mask_box_score=
                        mask_box_score,

                    elongation_score=
                        elongation_score,

                    relative_area_score=
                        relative_area_score,
                )
            )

            geometry_records.append({

                "arm_id":
                    arm_id,

                "component_score":
                    component_score,

                "mask_box_score":
                    mask_box_score,

                "elongation_score":
                    elongation_score,

                "relative_area_score":
                    relative_area_score,

                "geometry_score":
                    geometry_score,

                "candidate_qc_status":
                    row[
                        "candidate_qc_status"
                    ],

                "candidate_qc_reason":
                    row[
                        "candidate_qc_reason"
                    ],

                "mask_image_area_ratio":
                    row[
                        "mask_image_area_ratio"
                    ],

                "predicted_iou":
                    row[
                        "predicted_iou"
                    ],
            })

        # ====================================================
        # SORT
        # ====================================================

        geometry_records = sorted(
            geometry_records,
            key=lambda item:
                item[
                    "geometry_score"
                ],
            reverse=True,
        )

        for rank, record in enumerate(
            geometry_records,
            start=1,
        ):

            record[
                "selection_rank"
            ] = rank

            candidate_rows.append({

                "case_id":
                    case_id,

                "batch_id":
                    batch_name,

                "arm_id":
                    record[
                        "arm_id"
                    ],

                "candidate_qc_status":
                    record[
                        "candidate_qc_status"
                    ],

                "candidate_qc_reason":
                    record[
                        "candidate_qc_reason"
                    ],

                "eligible_for_selection":
                    True,

                "component_score":
                    record[
                        "component_score"
                    ],

                "mask_box_score":
                    record[
                        "mask_box_score"
                    ],

                "elongation_score":
                    record[
                        "elongation_score"
                    ],

                "relative_area_score":
                    record[
                        "relative_area_score"
                    ],

                "geometry_score":
                    record[
                        "geometry_score"
                    ],

                "selection_rank":
                    rank,
            })

        # ====================================================
        # ADD EXCLUDED CANDIDATES TO AUDIT
        # ====================================================

        for _, row in (
            excluded_df.iterrows()
        ):

            candidate_rows.append({

                "case_id":
                    case_id,

                "batch_id":
                    batch_name,

                "arm_id":
                    row[
                        "arm_id"
                    ],

                "candidate_qc_status":
                    row[
                        "candidate_qc_status"
                    ],

                "candidate_qc_reason":
                    row[
                        "candidate_qc_reason"
                    ],

                "eligible_for_selection":
                    False,

                "component_score":
                    np.nan,

                "mask_box_score":
                    np.nan,

                "elongation_score":
                    np.nan,

                "relative_area_score":
                    np.nan,

                "geometry_score":
                    np.nan,

                "selection_rank":
                    np.nan,
            })

        # ====================================================
        # TOP CANDIDATE
        # ====================================================

        best = (
            geometry_records[0]
        )

        selected_arm_id = (
            best[
                "arm_id"
            ]
        )

        selected_score = float(
            best[
                "geometry_score"
            ]
        )

        # ----------------------------------------------------
        # Runner-up
        # ----------------------------------------------------

        if (
            len(
                geometry_records
            )
            >=
            2
        ):

            runner_up_score = float(
                geometry_records[1][
                    "geometry_score"
                ]
            )

            score_margin = (
                selected_score
                -
                runner_up_score
            )

        else:

            runner_up_score = np.nan

            # Single eligible candidate:
            # no competing candidate.
            score_margin = 1.0

        # ====================================================
        # AUTO-SELECTION RULE
        # ====================================================

        if (
            selected_score
            >=
            AUTO_SCORE_THRESHOLD

            and

            score_margin
            >=
            AUTO_MARGIN_THRESHOLD
        ):

            case_status = (
                "AUTO_SELECTED"
            )

            case_reason = ""

        else:

            case_status = (
                "REVIEW_REQUIRED"
            )

            reasons = []

            if (
                selected_score
                <
                AUTO_SCORE_THRESHOLD
            ):

                reasons.append(
                    "LOW_GEOMETRY_SCORE"
                )

            if (
                score_margin
                <
                AUTO_MARGIN_THRESHOLD
            ):

                reasons.append(
                    "AMBIGUOUS_SCORE_MARGIN"
                )

            case_reason = ";".join(
                reasons
            )

        # ====================================================
        # SAVE SELECTION JSON
        # ====================================================

        selection_payload = {

            "case_id":
                case_id,

            "batch_id":
                batch_name,

            "protocol_version":
                PROTOCOL_VERSION,

            "target_selection_version":
                TARGET_SELECTION_VERSION,

            "status":
                case_status,

            "reason":
                case_reason,

            "selected_arm_id":
                (
                    selected_arm_id
                    if
                    case_status
                    ==
                    "AUTO_SELECTED"
                    else None
                ),

            "highest_scoring_candidate":
                selected_arm_id,

            "selected_score":
                selected_score,

            "runner_up_score":
                (
                    None
                    if
                    pd.isna(
                        runner_up_score
                    )
                    else float(
                        runner_up_score
                    )
                ),

            "score_margin":
                float(
                    score_margin
                ),

            "auto_score_threshold":
                AUTO_SCORE_THRESHOLD,

            "auto_margin_threshold":
                AUTO_MARGIN_THRESHOLD,

            "score_weights": {

                "component_coherence":
                    WEIGHT_COMPONENT_COHERENCE,

                "mask_box_fit":
                    WEIGHT_MASK_BOX_FIT,

                "elongation":
                    WEIGHT_ELONGATION,

                "relative_area":
                    WEIGHT_RELATIVE_AREA,
            },

            "eligible_candidates":
                geometry_records,

            "prohibited_features_used":
                False,

            "selection_features":
                [
                    "mask component coherence",
                    "mask-to-box geometry",
                    "mask elongation",
                    "relative mask area",
                ],
        }

        selection_json_path = (
            SELECTION_DIR
            /
            f"{case_id}_target_selection.json"
        )

        with open(
            selection_json_path,
            "w",
            encoding="utf-8",
        ) as file:

            json.dump(
                selection_payload,
                file,
                indent=4,
                ensure_ascii=False,
            )

        # ====================================================
        # CASE SUMMARY
        # ====================================================

        case_rows.append({

            "case_id":
                case_id,

            "batch_id":
                batch_name,

            "status":
                case_status,

            "reason":
                case_reason,

            "total_candidate_count":
                total_candidate_count,

            "eligible_candidate_count":
                eligible_candidate_count,

            "excluded_candidate_count":
                excluded_candidate_count,

            "selected_arm_id":
                (
                    selected_arm_id
                    if
                    case_status
                    ==
                    "AUTO_SELECTED"
                    else ""
                ),

            "highest_scoring_arm_id":
                selected_arm_id,

            "selected_score":
                selected_score,

            "runner_up_score":
                runner_up_score,

            "score_margin":
                score_margin,

            "selection_json_path":
                str(
                    selection_json_path
                ),
        })

        # ====================================================
        # TERMINAL
        # ====================================================

        runner_text = (
            "NA"
            if
            pd.isna(
                runner_up_score
            )
            else
            f"{runner_up_score:.3f}"
        )

        print(
            f"Best={selected_arm_id} | "
            f"score={selected_score:.3f} | "
            f"runner={runner_text} | "
            f"margin={score_margin:.3f} | "
            f"{case_status}"
        )

        if (
            case_reason
        ):

            print(
                f"Reason: "
                f"{case_reason}"
            )

    # ========================================================
    # SAVE TABLES
    # ========================================================

    candidate_output_df = (
        pd.DataFrame(
            candidate_rows
        )
    )

    case_output_df = (
        pd.DataFrame(
            case_rows
        )
    )

    candidate_output_path = (
        METADATA_DIR
        /
        f"{batch_name}_target_candidate_scores.csv"
    )

    case_output_path = (
        METADATA_DIR
        /
        f"{batch_name}_target_selection_summary.csv"
    )

    review_output_path = (
        METADATA_DIR
        /
        f"{batch_name}_target_selection_review_queue.csv"
    )

    candidate_output_df.to_csv(
        candidate_output_path,
        index=False,
        encoding="utf-8-sig",
    )

    case_output_df.to_csv(
        case_output_path,
        index=False,
        encoding="utf-8-sig",
    )

    review_df = (
        case_output_df[
            case_output_df[
                "status"
            ]
            ==
            "REVIEW_REQUIRED"
        ]
        .copy()
    )

    review_df.to_csv(
        review_output_path,
        index=False,
        encoding="utf-8-sig",
    )

    # ========================================================
    # SUMMARY
    # ========================================================

    auto_count = int(
        (
            case_output_df[
                "status"
            ]
            ==
            "AUTO_SELECTED"
        ).sum()
    )

    review_count = int(
        (
            case_output_df[
                "status"
            ]
            ==
            "REVIEW_REQUIRED"
        ).sum()
    )

    print(
        "\n"
        +
        "=" * 80
    )

    print(
        "STEP 14D SUMMARY"
    )

    print(
        "=" * 80
    )

    print(
        f"\nProtocol: "
        f"{PROTOCOL_VERSION}"
    )

    print(
        f"Selection rule: "
        f"{TARGET_SELECTION_VERSION}"
    )

    print(
        f"Batch: "
        f"{batch_name}"
    )

    print(
        f"Cases: "
        f"{len(case_output_df)}"
    )

    print(
        "\nAuto-selection thresholds:"
    )

    print(
        f"Minimum geometry score: "
        f"{AUTO_SCORE_THRESHOLD:.2f}"
    )

    print(
        f"Minimum score margin: "
        f"{AUTO_MARGIN_THRESHOLD:.2f}"
    )

    print(
        "\nCase results:"
    )

    print(
        f"AUTO_SELECTED: "
        f"{auto_count}"
    )

    print(
        f"REVIEW_REQUIRED: "
        f"{review_count}"
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
            "highest_scoring_arm_id",
            "selected_score",
            "runner_up_score",
            "score_margin",
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
        "\nCandidate scores:"
    )

    print(
        candidate_output_path
    )

    print(
        "\nSelection summary:"
    )

    print(
        case_output_path
    )

    print(
        "\nReview queue file:"
    )

    print(
        review_output_path
    )

    print(
        "\nIMPORTANT:"
    )

    print(
        "Target selection used geometry only."
    )

    print(
        "No diagnosis, grade, redness, swelling, lesion "
        "appearance, OCR, or text was used."
    )

    print(
        "Candidates failing SAM2_QC_V1.1 were excluded "
        "from automatic target selection."
    )

    print(
        "AUTO_SELECTED means geometry criteria were met."
    )

    print(
        "It does NOT establish clinical correctness."
    )

    print(
        "REVIEW_REQUIRED cases must be visually reviewed "
        "before proceeding."
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
        "STEP 14D COMPLETED"
    )

    print(
        "=" * 80
    )


if __name__ == "__main__":

    main()