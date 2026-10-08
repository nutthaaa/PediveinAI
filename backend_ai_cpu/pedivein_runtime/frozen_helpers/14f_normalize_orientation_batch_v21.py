from pathlib import Path
import argparse
import json
import math

import cv2
import numpy as np
import pandas as pd
from PIL import Image, ImageDraw


# ============================================================
# PEDIVEIN CARE AI
# PHASE 2 - STEP 14F
# ORIENTATION NORMALIZATION V2.1
#
# FIX:
# Correct OpenCV/image-coordinate rotation sign.
#
# IMPORTANT
# ------------------------------------------------------------
# - Only ELIGIBLE_FOR_ORIENTATION cases are processed
# - HOLD cases are skipped
# - LOCKED_TEST only
# - LOCKED TEST is NOT accessed
# - No flip
# - No forced 180-degree anatomical direction
# - Image and mask use identical affine transform
# - Rotation > 60 degrees -> REVIEW_REQUIRED
# - Post-rotation vertical error <= 5 degrees
# ============================================================


# ============================================================
# CONFIG
# ============================================================

PROTOCOL_VERSION = "PEDIVEIN_PREPROC_V1.1"

ORIENTATION_VERSION = "ORIENTATION_V2.1"

MAX_ROTATION_DEGREES_AUTO_PASS = 60.0

MAX_VERTICAL_ERROR_DEGREES = 5.0

BACKGROUND_VALUE = 128

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

BATCH_DIR = (
    DEV_ROOT
    / "metadata"
    / "batches"
)

FREEZE_METADATA_DIR = (
    DEV_ROOT
    / "04_mask_integrity_v11"
    / "protocol_v21_frozen"
    / "metadata"
)

MASK_INTEGRITY_ROOT = (
    DEV_ROOT
    / "04_mask_integrity_v11"
)

CORRECTED_MASK_DIR = (
    MASK_INTEGRITY_ROOT
    / "corrected_masks"
)

CORRECTED_ARM_ONLY_DIR = (
    MASK_INTEGRITY_ROOT
    / "corrected_arm_only"
)


# ============================================================
# NEW OUTPUT ROOT
# Keep failed V2 results for audit.
# ============================================================

OUTPUT_ROOT = (
    DEV_ROOT
    / "05_orientation_v21"
)

ORIENTED_IMAGE_DIR = (
    OUTPUT_ROOT
    / "oriented_images"
)

ORIENTED_MASK_DIR = (
    OUTPUT_ROOT
    / "oriented_masks"
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
    ORIENTED_IMAGE_DIR,
    ORIENTED_MASK_DIR,
    QC_DIR,
    METADATA_DIR,
    JSON_DIR,
]:
    directory.mkdir(
        parents=True,
        exist_ok=True,
    )


# ============================================================
# LOAD MASK
# ============================================================

def load_binary_mask(path):

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
# PCA MAJOR AXIS ANGLE
# ============================================================

def calculate_major_axis_angle(mask):
    """
    Calculate PCA major-axis orientation.

    Image coordinates:
        x increases right
        y increases downward

    PCA axis is undirected:
        angle and angle +/- 180 degrees
        describe the same axis.

    Returned angle is normalized to [-90, +90].
    """

    ys, xs = np.where(
        mask > 0
    )

    if len(xs) < 10:

        return None

    points = np.column_stack(
        [
            xs,
            ys,
        ]
    ).astype(
        np.float64
    )

    center = points.mean(
        axis=0
    )

    centered = (
        points
        -
        center
    )

    covariance = np.cov(
        centered,
        rowvar=False,
    )

    try:

        eigenvalues, eigenvectors = (
            np.linalg.eigh(
                covariance
            )
        )

    except np.linalg.LinAlgError:

        return None

    major_index = int(
        np.argmax(
            eigenvalues
        )
    )

    major_vector = (
        eigenvectors[
            :,
            major_index
        ]
    )

    angle = math.degrees(
        math.atan2(
            major_vector[1],
            major_vector[0],
        )
    )

    while angle > 90.0:
        angle -= 180.0

    while angle < -90.0:
        angle += 180.0

    return float(
        angle
    )


# ============================================================
# CORRECTED ROTATION TO VERTICAL
# ============================================================

def calculate_rotation_to_vertical(
    major_axis_angle,
):
    """
    IMPORTANT FIX V2.1
    ----------------------------------------------------------
    OpenCV warp rotation and PCA angle measured in image
    coordinates have opposite effective sign.

    Empirically / geometrically:

        post_axis ~= pre_axis - cv2_rotation

    Therefore to move the axis to a desired vertical target:

        cv2_rotation = pre_axis - target_axis

    Vertical may be +90 or -90 because PCA axis is undirected.

    Choose the smallest absolute rotation.

    Examples:

        pre = +75°
        target = +90°
        rotation = 75 - 90 = -15°

        pre = -84°
        target = -90°
        rotation = -84 - (-90) = +6°
    """

    rotation_to_positive_vertical = (
        major_axis_angle
        -
        90.0
    )

    rotation_to_negative_vertical = (
        major_axis_angle
        -
        (-90.0)
    )

    def normalize_rotation(value):

        while value > 180.0:
            value -= 360.0

        while value < -180.0:
            value += 360.0

        return float(
            value
        )

    rotation_to_positive_vertical = (
        normalize_rotation(
            rotation_to_positive_vertical
        )
    )

    rotation_to_negative_vertical = (
        normalize_rotation(
            rotation_to_negative_vertical
        )
    )

    if (
        abs(
            rotation_to_positive_vertical
        )
        <=
        abs(
            rotation_to_negative_vertical
        )
    ):

        return (
            rotation_to_positive_vertical
        )

    return (
        rotation_to_negative_vertical
    )


# ============================================================
# BUILD EXPANDED ROTATION MATRIX
# ============================================================

def build_rotation_matrix(
    width,
    height,
    angle_degrees,
):
    """
    Expanded canvas prevents clipping caused solely by rotation.
    """

    center = (
        width / 2.0,
        height / 2.0,
    )

    matrix = cv2.getRotationMatrix2D(
        center,
        angle_degrees,
        1.0,
    )

    cosine = abs(
        matrix[
            0,
            0
        ]
    )

    sine = abs(
        matrix[
            0,
            1
        ]
    )

    new_width = int(
        math.ceil(
            height * sine
            +
            width * cosine
        )
    )

    new_height = int(
        math.ceil(
            height * cosine
            +
            width * sine
        )
    )

    matrix[
        0,
        2
    ] += (
        new_width / 2.0
        -
        center[0]
    )

    matrix[
        1,
        2
    ] += (
        new_height / 2.0
        -
        center[1]
    )

    return (
        matrix,
        new_width,
        new_height,
    )


# ============================================================
# ROTATE RGB IMAGE
# ============================================================

def rotate_image(
    image_rgb,
    matrix,
    new_width,
    new_height,
):

    return cv2.warpAffine(
        image_rgb,
        matrix,
        (
            new_width,
            new_height,
        ),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(
            BACKGROUND_VALUE,
            BACKGROUND_VALUE,
            BACKGROUND_VALUE,
        ),
    )


# ============================================================
# ROTATE MASK
# ============================================================

def rotate_mask(
    mask,
    matrix,
    new_width,
    new_height,
):

    rotated = cv2.warpAffine(
        mask.astype(
            np.uint8
        ),
        matrix,
        (
            new_width,
            new_height,
        ),
        flags=cv2.INTER_NEAREST,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=0,
    )

    return (
        rotated > 0
    ).astype(
        np.uint8
    )


# ============================================================
# VERTICAL ERROR
# ============================================================

def calculate_vertical_error(
    angle,
):

    if angle is None:

        return None

    error_positive = abs(
        90.0
        -
        angle
    )

    error_negative = abs(
        -90.0
        -
        angle
    )

    return float(
        min(
            error_positive,
            error_negative,
        )
    )


# ============================================================
# MASK AREA PRESERVATION
# ============================================================

def calculate_area_preservation(
    original_mask,
    rotated_mask,
):

    before = int(
        original_mask.sum()
    )

    after = int(
        rotated_mask.sum()
    )

    if before == 0:

        return (
            before,
            after,
            0.0,
        )

    ratio = (
        after
        /
        before
    )

    return (
        before,
        after,
        float(
            ratio
        ),
    )


# ============================================================
# CREATE QC IMAGE
# ============================================================

def create_qc_image(
    oriented_rgb,
    case_id,
    pre_angle,
    rotation,
    post_angle,
    vertical_error,
    area_ratio,
    status,
    reason,
):

    image = Image.fromarray(
        oriented_rgb
    )

    header_height = 180

    canvas = Image.new(
        "RGB",
        (
            image.width,
            image.height
            +
            header_height,
        ),
        "white",
    )

    canvas.paste(
        image,
        (
            0,
            header_height,
        )
    )

    draw = ImageDraw.Draw(
        canvas
    )

    draw.text(
        (
            15,
            10,
        ),
        (
            f"{case_id} | "
            f"{ORIENTATION_VERSION}"
        ),
        fill="black",
    )

    draw.text(
        (
            15,
            40,
        ),
        (
            f"Pre-axis={pre_angle:.2f} deg | "
            f"Rotation={rotation:.2f} deg"
        ),
        fill="black",
    )

    draw.text(
        (
            15,
            70,
        ),
        (
            f"Post-axis={post_angle:.2f} deg | "
            f"Vertical error={vertical_error:.2f} deg"
        ),
        fill="black",
    )

    draw.text(
        (
            15,
            100,
        ),
        (
            f"Mask-area ratio="
            f"{area_ratio:.4f}"
        ),
        fill="black",
    )

    draw.text(
        (
            15,
            130,
        ),
        (
            f"QC={status}"
        ),
        fill="black",
    )

    draw.text(
        (
            15,
            155,
        ),
        (
            f"Reason="
            f"{reason if reason else 'None'}"
        ),
        fill="black",
    )

    return canvas


# ============================================================
# MAIN
# ============================================================

def main():

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--batch",
        type=str,
        default="BATCH_01",
    )

    args = parser.parse_args()

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

    eligible_path = (
        FREEZE_METADATA_DIR
        /
        f"{batch_name}_orientation_eligible.csv"
    )

    hold_path = (
        FREEZE_METADATA_DIR
        /
        f"{batch_name}_orientation_hold.csv"
    )

    # ========================================================
    # HEADER
    # ========================================================

    print("=" * 80)

    print(
        "PEDIVEIN CARE AI"
    )

    print(
        "STEP 14F - ORIENTATION NORMALIZATION V2.1"
    )

    print("=" * 80)

    print(
        f"\nProtocol: "
        f"{PROTOCOL_VERSION}"
    )

    print(
        f"Orientation: "
        f"{ORIENTATION_VERSION}"
    )

    print(
        f"Batch: "
        f"{batch_name}"
    )

    # ========================================================
    # INPUT CHECKS
    # ========================================================

    if not batch_path.exists():

        raise FileNotFoundError(
            f"Batch file not found:\n{batch_path}"
        )

    if not eligible_path.exists():

        raise FileNotFoundError(
            (
                "Orientation eligible file not found:\n"
                f"{eligible_path}"
            )
        )

    if not hold_path.exists():

        raise FileNotFoundError(
            (
                "Orientation hold file not found:\n"
                f"{hold_path}"
            )
        )

    batch_df = pd.read_csv(
        batch_path
    )

    eligible_df = pd.read_csv(
        eligible_path
    )

    hold_df = pd.read_csv(
        hold_path
    )

    # ========================================================
    # LOCKED_TEST SAFETY
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
                "CRITICAL: non-locked test partition "
                f"detected: {partitions}"
            )
        )

    eligible_cases = set(
        eligible_df[
            "case_id"
        ].astype(str)
    )

    hold_cases = set(
        hold_df[
            "case_id"
        ].astype(str)
    )

    batch_cases = set(
        batch_df[
            "case_id"
        ].astype(str)
    )

    if eligible_cases & hold_cases:

        raise RuntimeError(
            (
                "CRITICAL: case appears in both eligible "
                "and hold sets."
            )
        )

    if (
        eligible_cases
        |
        hold_cases
    ) != batch_cases:

        raise RuntimeError(
            (
                "CRITICAL: eligible + hold do not "
                "partition complete batch."
            )
        )

    print(
        f"Eligible cases: "
        f"{len(eligible_df)}"
    )

    print(
        f"Held cases not processed: "
        f"{len(hold_df)}"
    )

    # ========================================================
    # PROCESS
    # ========================================================

    rows = []

    for index, (_, row) in enumerate(
        eligible_df.iterrows(),
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
            f"{len(eligible_df):02d}] "
            f"{case_id}"
        )

        # ====================================================
        # INPUT PATHS
        # ====================================================

        image_path = (
            CORRECTED_ARM_ONLY_DIR
            /
            f"{case_id}_arm_only_integrity_v2.png"
        )

        mask_path = (
            CORRECTED_MASK_DIR
            /
            f"{case_id}_mask_integrity_v2.png"
        )

        if not image_path.exists():

            raise FileNotFoundError(
                (
                    f"{case_id}: image not found:\n"
                    f"{image_path}"
                )
            )

        if not mask_path.exists():

            raise FileNotFoundError(
                (
                    f"{case_id}: mask not found:\n"
                    f"{mask_path}"
                )
            )

        # ====================================================
        # LOAD
        # ====================================================

        image_rgb = np.array(
            Image.open(
                image_path
            )
            .convert(
                "RGB"
            )
        )

        mask = load_binary_mask(
            mask_path
        )

        if (
            image_rgb.shape[:2]
            !=
            mask.shape
        ):

            raise RuntimeError(
                (
                    f"{case_id}: image/mask size mismatch: "
                    f"{image_rgb.shape[:2]} vs "
                    f"{mask.shape}"
                )
            )

        # ====================================================
        # PRE PCA
        # ====================================================

        pre_angle = (
            calculate_major_axis_angle(
                mask
            )
        )

        if pre_angle is None:

            rows.append({

                "case_id":
                    case_id,

                "batch_id":
                    batch_name,

                "status":
                    "REVIEW_REQUIRED",

                "reason":
                    "INVALID_PRE_ROTATION_PCA",

                "pre_axis_angle":
                    np.nan,

                "rotation_degrees":
                    np.nan,

                "post_axis_angle":
                    np.nan,

                "vertical_error_degrees":
                    np.nan,

                "mask_area_before":
                    int(
                        mask.sum()
                    ),

                "mask_area_after":
                    np.nan,

                "mask_area_ratio":
                    np.nan,

                "oriented_image_path":
                    "",

                "oriented_mask_path":
                    "",

                "qc_path":
                    "",

                "json_path":
                    "",
            })

            print(
                "REVIEW_REQUIRED | "
                "INVALID_PRE_ROTATION_PCA"
            )

            continue

        # ====================================================
        # CORRECTED ROTATION
        # ====================================================

        rotation = (
            calculate_rotation_to_vertical(
                pre_angle
            )
        )

        height, width = (
            mask.shape
        )

        (
            matrix,
            new_width,
            new_height,
        ) = (
            build_rotation_matrix(
                width=
                    width,

                height=
                    height,

                angle_degrees=
                    rotation,
            )
        )

        oriented_rgb = (
            rotate_image(
                image_rgb=
                    image_rgb,

                matrix=
                    matrix,

                new_width=
                    new_width,

                new_height=
                    new_height,
            )
        )

        oriented_mask = (
            rotate_mask(
                mask=
                    mask,

                matrix=
                    matrix,

                new_width=
                    new_width,

                new_height=
                    new_height,
            )
        )

        # ====================================================
        # POST PCA
        # ====================================================

        post_angle = (
            calculate_major_axis_angle(
                oriented_mask
            )
        )

        vertical_error = (
            calculate_vertical_error(
                post_angle
            )
        )

        (
            mask_area_before,
            mask_area_after,
            mask_area_ratio,
        ) = (
            calculate_area_preservation(
                original_mask=
                    mask,

                rotated_mask=
                    oriented_mask,
            )
        )

        # ====================================================
        # QC RULES
        # ====================================================

        reasons = []

        if (
            abs(
                rotation
            )
            >
            MAX_ROTATION_DEGREES_AUTO_PASS
        ):

            reasons.append(
                "LARGE_ROTATION"
            )

        if post_angle is None:

            reasons.append(
                "INVALID_POST_ROTATION_PCA"
            )

        elif (
            vertical_error
            >
            MAX_VERTICAL_ERROR_DEGREES
        ):

            reasons.append(
                "POST_ROTATION_VERTICAL_ERROR"
            )

        if len(reasons) == 0:

            status = "PASS"
            reason = ""

        else:

            status = "REVIEW_REQUIRED"

            reason = ";".join(
                reasons
            )

        # ====================================================
        # SAVE ORIENTED IMAGE
        # ====================================================

        oriented_image_path = (
            ORIENTED_IMAGE_DIR
            /
            f"{case_id}_oriented_v21.png"
        )

        Image.fromarray(
            oriented_rgb
        ).save(
            oriented_image_path
        )

        # ====================================================
        # SAVE ORIENTED MASK
        # ====================================================

        oriented_mask_path = (
            ORIENTED_MASK_DIR
            /
            f"{case_id}_oriented_mask_v21.png"
        )

        saved = cv2.imwrite(
            str(
                oriented_mask_path
            ),
            oriented_mask
            *
            255,
        )

        if not saved:

            raise RuntimeError(
                (
                    f"{case_id}: failed to save "
                    "oriented mask."
                )
            )

        # ====================================================
        # QC IMAGE
        # ====================================================

        qc_image = (
            create_qc_image(
                oriented_rgb=
                    oriented_rgb,

                case_id=
                    case_id,

                pre_angle=
                    pre_angle,

                rotation=
                    rotation,

                post_angle=
                    post_angle,

                vertical_error=
                    vertical_error,

                area_ratio=
                    mask_area_ratio,

                status=
                    status,

                reason=
                    reason,
            )
        )

        qc_path = (
            QC_DIR
            /
            f"{case_id}_orientation_v21_qc.jpg"
        )

        qc_image.save(
            qc_path,
            quality=95,
        )

        # ====================================================
        # JSON
        # ====================================================

        json_path = (
            JSON_DIR
            /
            f"{case_id}_orientation_v21.json"
        )

        payload = {

            "case_id":
                case_id,

            "batch_id":
                batch_name,

            "protocol_version":
                PROTOCOL_VERSION,

            "orientation_version":
                ORIENTATION_VERSION,

            "status":
                status,

            "reason":
                reason,

            "pre_axis_angle":
                pre_angle,

            "rotation_degrees":
                rotation,

            "post_axis_angle":
                post_angle,

            "vertical_error_degrees":
                vertical_error,

            "mask_area_before":
                mask_area_before,

            "mask_area_after":
                mask_area_after,

            "mask_area_ratio":
                mask_area_ratio,

            "max_rotation_auto_pass":
                MAX_ROTATION_DEGREES_AUTO_PASS,

            "max_vertical_error":
                MAX_VERTICAL_ERROR_DEGREES,

            "flip_used":
                False,

            "forced_180_direction":
                False,

            "expanded_canvas":
                True,

            "image_mask_same_transform":
                True,

            "rotation_sign_fix":
                (
                    "cv2_rotation = "
                    "pre_axis - target_vertical_axis"
                ),

            "oriented_image_path":
                str(
                    oriented_image_path
                ),

            "oriented_mask_path":
                str(
                    oriented_mask_path
                ),

            "qc_path":
                str(
                    qc_path
                ),

            "locked_test_accessed":
                False,

            "classifier_trained":
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
        # METADATA ROW
        # ====================================================

        rows.append({

            "case_id":
                case_id,

            "batch_id":
                batch_name,

            "orientation_version":
                ORIENTATION_VERSION,

            "status":
                status,

            "reason":
                reason,

            "pre_axis_angle":
                pre_angle,

            "rotation_degrees":
                rotation,

            "post_axis_angle":
                post_angle,

            "vertical_error_degrees":
                vertical_error,

            "mask_area_before":
                mask_area_before,

            "mask_area_after":
                mask_area_after,

            "mask_area_ratio":
                mask_area_ratio,

            "oriented_image_path":
                str(
                    oriented_image_path
                ),

            "oriented_mask_path":
                str(
                    oriented_mask_path
                ),

            "qc_path":
                str(
                    qc_path
                ),

            "json_path":
                str(
                    json_path
                ),
        })

        # ====================================================
        # TERMINAL
        # ====================================================

        print(
            f"pre={pre_angle:.2f}° | "
            f"rotate={rotation:.2f}° | "
            f"post={post_angle:.2f}° | "
            f"error={vertical_error:.2f}° | "
            f"area={mask_area_ratio:.4f} | "
            f"{status}"
        )

        if reason:

            print(
                f"Reason: "
                f"{reason}"
            )

    # ========================================================
    # SAVE METADATA
    # ========================================================

    result_df = pd.DataFrame(
        rows
    )

    output_csv = (
        METADATA_DIR
        /
        f"{batch_name}_orientation_v21.csv"
    )

    review_csv = (
        METADATA_DIR
        /
        f"{batch_name}_orientation_v21_review_queue.csv"
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
    # COUNTS
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

    # ========================================================
    # SUMMARY
    # ========================================================

    print(
        "\n"
        +
        "=" * 80
    )

    print(
        "STEP 14F V2.1 SUMMARY"
    )

    print(
        "=" * 80
    )

    print(
        f"\nBatch: "
        f"{batch_name}"
    )

    print(
        f"Eligible input cases: "
        f"{len(eligible_df)}"
    )

    print(
        f"Held cases skipped: "
        f"{len(hold_df)}"
    )

    print(
        "\nOrientation result:"
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
        "\nReview queue:"
    )

    if len(
        review_df
    ) == 0:

        print(
            "None"
        )

    else:

        print(
            review_df[
                [
                    "case_id",
                    "pre_axis_angle",
                    "rotation_degrees",
                    "post_axis_angle",
                    "vertical_error_degrees",
                    "mask_area_ratio",
                    "reason",
                ]
            ]
            .to_string(
                index=False
            )
        )

    print(
        "\nOrientation metadata:"
    )

    print(
        output_csv
    )

    print(
        "\nOrientation review queue:"
    )

    print(
        review_csv
    )

    print(
        "\nOriented images:"
    )

    print(
        ORIENTED_IMAGE_DIR
    )

    print(
        "\nOriented masks:"
    )

    print(
        ORIENTED_MASK_DIR
    )

    print(
        "\nQC images:"
    )

    print(
        QC_DIR
    )

    print(
        "\nIMPORTANT:"
    )

    print(
        "ORIENTATION_V2.1 corrects the rotation-sign "
        "error found in V2."
    )

    print(
        "Previous V2 outputs were preserved for audit."
    )

    print(
        "Only ELIGIBLE_FOR_ORIENTATION cases were processed."
    )

    print(
        "HOLD cases were not processed."
    )

    print(
        "No flip was used."
    )

    print(
        "No forced 180-degree anatomical direction was used."
    )

    print(
        "Image and mask received the same affine transform."
    )

    print(
        "Expanded canvas was used to avoid rotation cropping."
    )

    print(
        "Rotation > 60 degrees remains REVIEW_REQUIRED."
    )

    print(
        "Post-rotation vertical error must be <= 5 degrees."
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
        "STEP 14F V2.1 COMPLETED"
    )

    print(
        "=" * 80
    )


if __name__ == "__main__":

    main()