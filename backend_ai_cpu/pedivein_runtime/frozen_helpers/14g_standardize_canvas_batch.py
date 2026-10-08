from pathlib import Path
import argparse
import json

import cv2
import numpy as np
import pandas as pd
from PIL import Image, ImageDraw


# ============================================================
# PEDIVEIN CARE AI
# PHASE 2 - STEP 14G
# STANDARDIZE CANVAS V1.0
#
# PURPOSE
# ------------------------------------------------------------
# Create:
#   1. 512 x 512 master image
#   2. 224 x 224 model image
#
# IMPORTANT:
# Both are generated DIRECTLY from the oriented V2.1 image.
#
# We do NOT do:
#   oriented -> 512 -> 224
#
# This avoids unnecessary double interpolation.
#
# POLICY
# ------------------------------------------------------------
# - Preserve aspect ratio
# - No crop
# - No stretch
# - No flip
# - No forced 180-degree direction
# - Neutral gray background = 128
# - Center object on square canvas
# - 512 and 224 generated independently
# - Occupancy safety heuristic: 0.10 - 0.85
#
# LOCKED_TEST only.
# LOCKED TEST is NOT accessed.
# No classifier is trained.
# ============================================================


# ============================================================
# CONFIG
# ============================================================

PROTOCOL_VERSION = "PEDIVEIN_PREPROC_V1.1"

STANDARDIZATION_VERSION = "STANDARDIZATION_V1.0"

MASTER_SIZE = 512

MODEL_SIZE = 224

BACKGROUND_VALUE = 128

MIN_OCCUPANCY_RATIO = 0.10

MAX_OCCUPANCY_RATIO = 0.85

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

ORIENTATION_ROOT = (
    DEV_ROOT
    / "05_orientation_v21"
)

ORIENTED_IMAGE_DIR = (
    ORIENTATION_ROOT
    / "oriented_images"
)

ORIENTED_MASK_DIR = (
    ORIENTATION_ROOT
    / "oriented_masks"
)

ORIENTATION_FREEZE_METADATA_DIR = (
    ORIENTATION_ROOT
    / "protocol_v21_frozen"
    / "metadata"
)


# ============================================================
# OUTPUT
# ============================================================

OUTPUT_ROOT = (
    DEV_ROOT
    / "06_standardized_v10"
)

MASTER_512_IMAGE_DIR = (
    OUTPUT_ROOT
    / "master_512"
    / "images"
)

MASTER_512_MASK_DIR = (
    OUTPUT_ROOT
    / "master_512"
    / "masks"
)

MODEL_224_IMAGE_DIR = (
    OUTPUT_ROOT
    / "model_224"
    / "images"
)

MODEL_224_MASK_DIR = (
    OUTPUT_ROOT
    / "model_224"
    / "masks"
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
    MASTER_512_IMAGE_DIR,
    MASTER_512_MASK_DIR,
    MODEL_224_IMAGE_DIR,
    MODEL_224_MASK_DIR,
    QC_DIR,
    METADATA_DIR,
    JSON_DIR,
]:

    directory.mkdir(
        parents=True,
        exist_ok=True,
    )


# ============================================================
# LOAD BINARY MASK
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
# FOREGROUND BOUNDING BOX
# ============================================================

def get_foreground_bbox(mask):

    ys, xs = np.where(
        mask > 0
    )

    if len(xs) == 0:

        return None

    x_min = int(
        xs.min()
    )

    x_max = int(
        xs.max()
    )

    y_min = int(
        ys.min()
    )

    y_max = int(
        ys.max()
    )

    return (
        x_min,
        y_min,
        x_max,
        y_max,
    )


# ============================================================
# STANDARDIZE DIRECTLY FROM ORIENTED SOURCE
# ============================================================

def standardize_to_canvas(
    image_rgb,
    mask,
    output_size,
):
    """
    Standardize using foreground bounding box.

    Steps:
    1. Determine target-arm bounding box from mask.
    2. Crop only EMPTY background outside bounding box.
       No foreground pixels are cropped.
    3. Resize foreground region preserving aspect ratio.
    4. Center on square gray canvas.
    5. Resize image and mask independently from SAME
       oriented source region.
    """

    bbox = (
        get_foreground_bbox(
            mask
        )
    )

    if bbox is None:

        raise RuntimeError(
            "Foreground mask is empty."
        )

    (
        x_min,
        y_min,
        x_max,
        y_max,
    ) = bbox

    # --------------------------------------------------------
    # +1 because slicing endpoint is exclusive
    # --------------------------------------------------------

    crop_image = (
        image_rgb[
            y_min:y_max + 1,
            x_min:x_max + 1,
        ]
    )

    crop_mask = (
        mask[
            y_min:y_max + 1,
            x_min:x_max + 1,
        ]
    )

    crop_height, crop_width = (
        crop_mask.shape
    )

    if (
        crop_height <= 0
        or
        crop_width <= 0
    ):

        raise RuntimeError(
            "Invalid foreground crop size."
        )

    # --------------------------------------------------------
    # Preserve aspect ratio
    # --------------------------------------------------------

    scale = min(
        output_size
        /
        crop_width,

        output_size
        /
        crop_height,
    )

    new_width = max(
        1,
        int(
            round(
                crop_width
                *
                scale
            )
        ),
    )

    new_height = max(
        1,
        int(
            round(
                crop_height
                *
                scale
            )
        ),
    )

    # --------------------------------------------------------
    # Image interpolation
    #
    # INTER_AREA when shrinking
    # INTER_LINEAR when enlarging
    # --------------------------------------------------------

    if scale < 1.0:

        image_interpolation = (
            cv2.INTER_AREA
        )

    else:

        image_interpolation = (
            cv2.INTER_LINEAR
        )

    resized_image = cv2.resize(
        crop_image,
        (
            new_width,
            new_height,
        ),
        interpolation=
            image_interpolation,
    )

    # --------------------------------------------------------
    # Mask always nearest-neighbor
    # --------------------------------------------------------

    resized_mask = cv2.resize(
        crop_mask,
        (
            new_width,
            new_height,
        ),
        interpolation=
            cv2.INTER_NEAREST,
    )

    resized_mask = (
        resized_mask > 0
    ).astype(
        np.uint8
    )

    # --------------------------------------------------------
    # Neutral gray square canvas
    # --------------------------------------------------------

    image_canvas = np.full(
        (
            output_size,
            output_size,
            3,
        ),
        BACKGROUND_VALUE,
        dtype=np.uint8,
    )

    mask_canvas = np.zeros(
        (
            output_size,
            output_size,
        ),
        dtype=np.uint8,
    )

    # --------------------------------------------------------
    # Center placement
    # --------------------------------------------------------

    x_offset = (
        output_size
        -
        new_width
    ) // 2

    y_offset = (
        output_size
        -
        new_height
    ) // 2

    image_canvas[
        y_offset:
        y_offset + new_height,

        x_offset:
        x_offset + new_width,
    ] = resized_image

    mask_canvas[
        y_offset:
        y_offset + new_height,

        x_offset:
        x_offset + new_width,
    ] = resized_mask

    # --------------------------------------------------------
    # Occupancy
    #
    # Fraction of entire square canvas covered by foreground.
    # --------------------------------------------------------

    occupancy_ratio = float(
        mask_canvas.sum()
        /
        (
            output_size
            *
            output_size
        )
    )

    return {

        "image":
            image_canvas,

        "mask":
            mask_canvas,

        "bbox":
            bbox,

        "crop_width":
            int(
                crop_width
            ),

        "crop_height":
            int(
                crop_height
            ),

        "scale":
            float(
                scale
            ),

        "resized_width":
            int(
                new_width
            ),

        "resized_height":
            int(
                new_height
            ),

        "x_offset":
            int(
                x_offset
            ),

        "y_offset":
            int(
                y_offset
            ),

        "occupancy_ratio":
            occupancy_ratio,
    }


# ============================================================
# QC STATUS
# ============================================================

def determine_qc_status(
    occupancy_512,
    occupancy_224,
):

    reasons = []

    if (
        occupancy_512
        <
        MIN_OCCUPANCY_RATIO
    ):

        reasons.append(
            "LOW_OCCUPANCY_512"
        )

    if (
        occupancy_512
        >
        MAX_OCCUPANCY_RATIO
    ):

        reasons.append(
            "HIGH_OCCUPANCY_512"
        )

    if (
        occupancy_224
        <
        MIN_OCCUPANCY_RATIO
    ):

        reasons.append(
            "LOW_OCCUPANCY_224"
        )

    if (
        occupancy_224
        >
        MAX_OCCUPANCY_RATIO
    ):

        reasons.append(
            "HIGH_OCCUPANCY_224"
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
# CREATE QC PANEL
# ============================================================

def create_qc_panel(
    image_512,
    image_224,
    case_id,
    occupancy_512,
    occupancy_224,
    status,
    reason,
):
    """
    QC panel:
        left  = 512 standardized image
        right = enlarged display of 224 standardized image

    224 image is enlarged only for visualization.
    Saved model image remains exactly 224x224.
    """

    display_512 = (
        Image.fromarray(
            image_512
        )
    )

    display_224 = (
        Image.fromarray(
            image_224
        )
        .resize(
            (
                512,
                512,
            ),
            resample=
                Image.Resampling.NEAREST,
        )
    )

    header_height = 150

    canvas = Image.new(
        "RGB",
        (
            1024,
            512
            +
            header_height,
        ),
        "white",
    )

    canvas.paste(
        display_512,
        (
            0,
            header_height,
        )
    )

    canvas.paste(
        display_224,
        (
            512,
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
            f"{STANDARDIZATION_VERSION}"
        ),
        fill="black",
    )

    draw.text(
        (
            15,
            40,
        ),
        (
            f"512 occupancy="
            f"{occupancy_512:.4f}"
        ),
        fill="black",
    )

    draw.text(
        (
            300,
            40,
        ),
        (
            f"224 occupancy="
            f"{occupancy_224:.4f}"
        ),
        fill="black",
    )

    draw.text(
        (
            15,
            70,
        ),
        (
            "LEFT = direct 512 | "
            "RIGHT = direct 224 enlarged for QC"
        ),
        fill="black",
    )

    draw.text(
        (
            15,
            100,
        ),
        (
            f"QC={status}"
        ),
        fill="black",
    )

    draw.text(
        (
            15,
            125,
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

    parser = (
        argparse.ArgumentParser()
    )

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
        ORIENTATION_FREEZE_METADATA_DIR
        /
        f"{batch_name}_standardization_eligible.csv"
    )

    hold_path = (
        ORIENTATION_FREEZE_METADATA_DIR
        /
        f"{batch_name}_standardization_hold.csv"
    )

    # ========================================================
    # HEADER
    # ========================================================

    print("=" * 80)

    print(
        "PEDIVEIN CARE AI"
    )

    print(
        "STEP 14G - STANDARDIZE CANVAS V1.0"
    )

    print("=" * 80)

    print(
        f"\nProtocol: "
        f"{PROTOCOL_VERSION}"
    )

    print(
        f"Standardization: "
        f"{STANDARDIZATION_VERSION}"
    )

    print(
        f"Batch: "
        f"{batch_name}"
    )

    # ========================================================
    # INPUT CHECKS
    # ========================================================

    for path in [
        batch_path,
        eligible_path,
        hold_path,
    ]:

        if not path.exists():

            raise FileNotFoundError(
                f"Required file not found:\n{path}"
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
        ]
        .astype(str)
    )

    # ========================================================
    # Ensure every standardization case originated from batch
    # ========================================================

    batch_cases = set(
        batch_df[
            "case_id"
        ]
        .astype(str)
    )

    if not eligible_cases.issubset(
        batch_cases
    ):

        raise RuntimeError(
            (
                "CRITICAL: standardization eligibility "
                "contains case outside batch."
            )
        )

    # ========================================================
    # BATCH 01 expected safety
    # ========================================================

    if (
        batch_name
        ==
        "BATCH_01"
        and
        len(
            eligible_df
        )
        !=
        11
    ):

        raise RuntimeError(
            (
                "CRITICAL: BATCH_01 expected 11 "
                "standardization-eligible cases but found "
                f"{len(eligible_df)}."
            )
        )

    print(
        f"Eligible cases: "
        f"{len(eligible_df)}"
    )

    print(
        f"Orientation holds: "
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
        # INPUTS
        # ====================================================

        image_path = Path(
            str(
                row[
                    "oriented_image_path"
                ]
            )
        )

        mask_path = Path(
            str(
                row[
                    "oriented_mask_path"
                ]
            )
        )

        # Fallback to known folder if metadata path changed
        if not image_path.exists():

            image_path = (
                ORIENTED_IMAGE_DIR
                /
                f"{case_id}_oriented_v21.png"
            )

        if not mask_path.exists():

            mask_path = (
                ORIENTED_MASK_DIR
                /
                f"{case_id}_oriented_mask_v21.png"
            )

        if not image_path.exists():

            raise FileNotFoundError(
                (
                    f"{case_id}: oriented image "
                    f"not found:\n{image_path}"
                )
            )

        if not mask_path.exists():

            raise FileNotFoundError(
                (
                    f"{case_id}: oriented mask "
                    f"not found:\n{mask_path}"
                )
            )

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
                    f"{case_id}: image/mask size mismatch "
                    f"{image_rgb.shape[:2]} vs "
                    f"{mask.shape}"
                )
            )

        # ====================================================
        # DIRECT 512
        # ====================================================

        result_512 = (
            standardize_to_canvas(
                image_rgb=
                    image_rgb,

                mask=
                    mask,

                output_size=
                    MASTER_SIZE,
            )
        )

        # ====================================================
        # DIRECT 224
        #
        # IMPORTANT:
        # Directly from original oriented image/mask,
        # NOT from result_512.
        # ====================================================

        result_224 = (
            standardize_to_canvas(
                image_rgb=
                    image_rgb,

                mask=
                    mask,

                output_size=
                    MODEL_SIZE,
            )
        )

        occupancy_512 = (
            result_512[
                "occupancy_ratio"
            ]
        )

        occupancy_224 = (
            result_224[
                "occupancy_ratio"
            ]
        )

        # ====================================================
        # QC
        # ====================================================

        (
            status,
            reason,
        ) = determine_qc_status(
            occupancy_512=
                occupancy_512,

            occupancy_224=
                occupancy_224,
        )

        # ====================================================
        # SAVE 512 IMAGE
        # ====================================================

        image_512_path = (
            MASTER_512_IMAGE_DIR
            /
            f"{case_id}_master_512.png"
        )

        Image.fromarray(
            result_512[
                "image"
            ]
        ).save(
            image_512_path
        )

        # ====================================================
        # SAVE 512 MASK
        # ====================================================

        mask_512_path = (
            MASTER_512_MASK_DIR
            /
            f"{case_id}_mask_512.png"
        )

        saved_512_mask = cv2.imwrite(
            str(
                mask_512_path
            ),
            result_512[
                "mask"
            ]
            *
            255,
        )

        if not saved_512_mask:

            raise RuntimeError(
                (
                    f"{case_id}: failed to save "
                    "512 mask."
                )
            )

        # ====================================================
        # SAVE 224 IMAGE
        # ====================================================

        image_224_path = (
            MODEL_224_IMAGE_DIR
            /
            f"{case_id}_model_224.png"
        )

        Image.fromarray(
            result_224[
                "image"
            ]
        ).save(
            image_224_path
        )

        # ====================================================
        # SAVE 224 MASK
        # ====================================================

        mask_224_path = (
            MODEL_224_MASK_DIR
            /
            f"{case_id}_mask_224.png"
        )

        saved_224_mask = cv2.imwrite(
            str(
                mask_224_path
            ),
            result_224[
                "mask"
            ]
            *
            255,
        )

        if not saved_224_mask:

            raise RuntimeError(
                (
                    f"{case_id}: failed to save "
                    "224 mask."
                )
            )

        # ====================================================
        # QC PANEL
        # ====================================================

        qc_panel = create_qc_panel(
            image_512=
                result_512[
                    "image"
                ],

            image_224=
                result_224[
                    "image"
                ],

            case_id=
                case_id,

            occupancy_512=
                occupancy_512,

            occupancy_224=
                occupancy_224,

            status=
                status,

            reason=
                reason,
        )

        qc_path = (
            QC_DIR
            /
            f"{case_id}_standardization_v10_qc.jpg"
        )

        qc_panel.save(
            qc_path,
            quality=95,
        )

        # ====================================================
        # JSON
        # ====================================================

        json_path = (
            JSON_DIR
            /
            f"{case_id}_standardization_v10.json"
        )

        payload = {

            "case_id":
                case_id,

            "batch_id":
                batch_name,

            "protocol_version":
                PROTOCOL_VERSION,

            "standardization_version":
                STANDARDIZATION_VERSION,

            "status":
                status,

            "reason":
                reason,

            "source_oriented_image":
                str(
                    image_path
                ),

            "source_oriented_mask":
                str(
                    mask_path
                ),

            "master_512": {

                "output_size":
                    MASTER_SIZE,

                "occupancy_ratio":
                    occupancy_512,

                "scale":
                    result_512[
                        "scale"
                    ],

                "resized_width":
                    result_512[
                        "resized_width"
                    ],

                "resized_height":
                    result_512[
                        "resized_height"
                    ],

                "x_offset":
                    result_512[
                        "x_offset"
                    ],

                "y_offset":
                    result_512[
                        "y_offset"
                    ],

                "image_path":
                    str(
                        image_512_path
                    ),

                "mask_path":
                    str(
                        mask_512_path
                    ),
            },

            "model_224": {

                "output_size":
                    MODEL_SIZE,

                "occupancy_ratio":
                    occupancy_224,

                "scale":
                    result_224[
                        "scale"
                    ],

                "resized_width":
                    result_224[
                        "resized_width"
                    ],

                "resized_height":
                    result_224[
                        "resized_height"
                    ],

                "x_offset":
                    result_224[
                        "x_offset"
                    ],

                "y_offset":
                    result_224[
                        "y_offset"
                    ],

                "image_path":
                    str(
                        image_224_path
                    ),

                "mask_path":
                    str(
                        mask_224_path
                    ),
            },

            "rules": {

                "preserve_aspect_ratio":
                    True,

                "crop_foreground":
                    False,

                "crop_empty_background_only":
                    True,

                "stretch":
                    False,

                "flip":
                    False,

                "forced_180_direction":
                    False,

                "neutral_background_value":
                    BACKGROUND_VALUE,

                "master_and_model_generated_independently":
                    True,

                "double_interpolation_512_to_224":
                    False,

                "minimum_occupancy_ratio":
                    MIN_OCCUPANCY_RATIO,

                "maximum_occupancy_ratio":
                    MAX_OCCUPANCY_RATIO,
            },

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

            "standardization_version":
                STANDARDIZATION_VERSION,

            "status":
                status,

            "reason":
                reason,

            "occupancy_512":
                occupancy_512,

            "occupancy_224":
                occupancy_224,

            "scale_512":
                result_512[
                    "scale"
                ],

            "scale_224":
                result_224[
                    "scale"
                ],

            "resized_width_512":
                result_512[
                    "resized_width"
                ],

            "resized_height_512":
                result_512[
                    "resized_height"
                ],

            "resized_width_224":
                result_224[
                    "resized_width"
                ],

            "resized_height_224":
                result_224[
                    "resized_height"
                ],

            "master_512_image_path":
                str(
                    image_512_path
                ),

            "master_512_mask_path":
                str(
                    mask_512_path
                ),

            "model_224_image_path":
                str(
                    image_224_path
                ),

            "model_224_mask_path":
                str(
                    mask_224_path
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
            f"512_occ="
            f"{occupancy_512:.4f} | "
            f"224_occ="
            f"{occupancy_224:.4f} | "
            f"512={result_512['resized_width']}x"
            f"{result_512['resized_height']} | "
            f"224={result_224['resized_width']}x"
            f"{result_224['resized_height']} | "
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
        f"{batch_name}_standardization_v10.csv"
    )

    review_csv = (
        METADATA_DIR
        /
        f"{batch_name}_standardization_v10_review_queue.csv"
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
        "STEP 14G SUMMARY"
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
        "\nStandardization:"
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
                    "occupancy_512",
                    "occupancy_224",
                    "reason",
                ]
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
        "\n512 master images:"
    )

    print(
        MASTER_512_IMAGE_DIR
    )

    print(
        "\n224 model images:"
    )

    print(
        MODEL_224_IMAGE_DIR
    )

    print(
        "\nQC panels:"
    )

    print(
        QC_DIR
    )

    print(
        "\nIMPORTANT:"
    )

    print(
        "512 and 224 were generated independently "
        "from the same oriented V2.1 source."
    )

    print(
        "224 was NOT generated from 512."
    )

    print(
        "Aspect ratio was preserved."
    )

    print(
        "Foreground was not cropped."
    )

    print(
        "Only empty outer background was removed "
        "before resizing."
    )

    print(
        "No stretching was used."
    )

    print(
        "No flip was used."
    )

    print(
        "Neutral gray background = 128."
    )

    print(
        (
            "Occupancy review range = "
            f"{MIN_OCCUPANCY_RATIO:.2f} - "
            f"{MAX_OCCUPANCY_RATIO:.2f}"
        )
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
        "STEP 14G COMPLETED"
    )

    print(
        "=" * 80
    )


if __name__ == "__main__":

    main()