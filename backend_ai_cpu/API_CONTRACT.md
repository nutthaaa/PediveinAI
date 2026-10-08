# Backend integration contract

## Input

- หนึ่ง request ต่อหนึ่งภาพ: JPG, JPEG หรือ PNG
- ภาพสีที่เห็นแขนและตำแหน่ง IV ชัดเจน
- Optional: `allow_manual_quality_review: boolean`
- Optional: `selected_arm_id: string` เมื่อรอบแรกคืน candidate หลายแขน

## Successful result (`status=OK`)

```json
{
  "status": "OK",
  "prediction_issued": true,
  "condition_prediction": "INF",
  "condition_probabilities": {"INF": 0.72, "PHL": 0.28},
  "grade_prediction": 2,
  "grade_probabilities": {"1": 0.1, "2": 0.6, "3": 0.2, "4": 0.1},
  "model_status": "EXPERIMENTAL_CANDIDATE",
  "requires_clinician_confirmation": true
}
```

`condition_prediction` มีค่า `INF` (Infiltration) หรือ `PHL` (Phlebitis) และ `grade_prediction` มีค่า 1–4 เท่านั้น

## Hold results

- `QUALITY_HOLD`: ไม่ออกผล AI; ใช้ข้อความใน `quality.reasons`/`warnings` แนะนำให้ถ่ายใหม่หรือตรวจโดยเจ้าหน้าที่
- `PREPROCESSING_HOLD`: ไม่ออกผล AI; อ่าน `preprocessing.reason`
- `TARGET_SELECTION_AMBIGUOUS`: จะอยู่ใน `preprocessing.reason` และมี `manual_review_candidates`; ส่ง `selected_arm_id` กลับมาใน request ใหม่

ไม่ควรแสดง Grade หาก `prediction_issued` เป็น `false`
