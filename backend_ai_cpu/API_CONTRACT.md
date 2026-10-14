# Backend integration contract

## HTTP endpoints

### `GET /health/live`

ยืนยันว่า process ของ FastAPI ยังทำงานอยู่ ไม่ได้ยืนยันว่าโมเดลโหลดสำเร็จ

### `GET /health/ready`

คืน `200 READY` เมื่อโมเดลพร้อมรับภาพ หรือ `503 NOT_READY` เมื่อโหลดโมเดลไม่สำเร็จ

### `POST /api/v1/pedivein/predict`

รับ `multipart/form-data`:

- `image`: required JPG/PNG หนึ่งภาพ
- `selected_arm_id`: optional เช่น `ARM01`
- `allow_manual_quality_review`: optional boolean ค่าเริ่มต้น `false`

หากตั้ง environment variable `PEDIVEIN_API_KEY` ผู้เรียกต้องส่ง header:

```text
X-API-Key: <secret>
```

HTTP error สำคัญ:

- `401`: API key ไม่ถูกต้อง
- `413`: ไฟล์ใหญ่เกินกำหนด
- `415`: ไม่ใช่ JPEG/PNG
- `422`: ไฟล์ว่าง รูปเปิดไม่ได้ หรือ parameter ไม่ถูกต้อง
- `500`: inference ผิดพลาด
- `503`: โมเดลยังไม่พร้อม

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

แต่ละรายการใน `manual_review_candidates` มี `arm_id` และ `preview_data_url` แบบ JPEG base64 สำหรับแสดงให้เจ้าหน้าที่เลือก ภาพ preview เป็นข้อมูลผู้ป่วยและต้องไม่เขียนลง log หรือจัดเก็บโดยไม่มีสิทธิ์

ไม่ควรแสดง Grade หาก `prediction_issued` เป็น `false`
