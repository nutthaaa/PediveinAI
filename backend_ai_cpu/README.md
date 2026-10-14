# Pedivein AI model — CPU backend package

แพ็กเกจนี้สำหรับ backend ของบริษัทนำภาพ 1 รูปเข้า pipeline แล้วรับผล condition และ Grade 1–4 กลับเป็น JSON โดยใช้ CPU เท่านั้น ไม่มีหน้า Local Test และไม่มีข้อมูลภาพผู้ป่วยอยู่ใน repository

> สถานะโมเดล: `EXPERIMENTAL_CANDIDATE` ผล Grade ยังต้องให้เจ้าหน้าที่/แพทย์ยืนยัน ไม่ควรใช้ตัดสินใจทางคลินิกอัตโนมัติ

## สิ่งที่ต้องมีบน AI server

- Linux x86_64 และ Python 3.11 (แนะนำ)
- RAM อย่างน้อย 16 GB (แนะนำ 32 GB สำหรับ Grounding DINO + SAM2 บน CPU)
- อินเทอร์เน็ตเฉพาะตอนติดตั้ง เพื่อดาวน์โหลด Python packages และ preprocessing models
- backend ต้องส่งไฟล์ JPG/JPEG/PNG ทีละรูป

## ติดตั้ง

```bash
cd backend_ai_cpu
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements_cpu.txt
python scripts/download_preprocessor_models.py
python scripts/verify_installation.py
```

หลังดาวน์โหลด preprocessing models แล้ว สามารถรันแบบ offline ได้ โฟลเดอร์ `preprocessor_models/` ไม่ถูก commit เพราะไฟล์มีขนาดใหญ่

## ทดลองรูปเดียว

```bash
python scripts/predict_image.py /path/to/image.jpg
```

ถ้าคุณภาพเป็น `MANUAL_REVIEW` และเจ้าหน้าที่ยืนยันว่าจะใช้รูปนี้:

```bash
python scripts/predict_image.py /path/to/image.jpg --allow-manual-quality-review
```

ถ้าระบบตอบ `TARGET_SELECTION_AMBIGUOUS` ให้ frontend แสดงรูป candidate จาก `manual_review_candidates` เพื่อให้เจ้าหน้าที่เลือก `arm_id` แล้วเรียกใหม่:

```bash
python scripts/predict_image.py /path/to/image.jpg --selected-arm-id ARM01
```

## เปิด FastAPI

กำหนด API key ก่อนใช้งานนอกเครื่อง local:

```bash
export PEDIVEIN_API_KEY='replace-with-a-long-random-secret'
export PEDIVEIN_API_HOST='127.0.0.1'
export PEDIVEIN_API_PORT='8000'
export PEDIVEIN_MAX_UPLOAD_MB='15'
python scripts/run_api.py
```

API จะโหลด Grounding DINO, SAM2 และ ONNX หนึ่งครั้งตอนเริ่ม service จึงอาจใช้เวลาสักครู่ ตรวจสถานะได้ที่:

```bash
curl http://127.0.0.1:8000/health/live
curl http://127.0.0.1:8000/health/ready
```

ส่งภาพหนึ่งรูป:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/pedivein/predict \
  -H "X-API-Key: $PEDIVEIN_API_KEY" \
  -F "image=@/path/to/image.jpg"
```

กรณีเจ้าหน้าที่เลือกแขนและอนุญาตภาพที่อยู่ใน `MANUAL_REVIEW`:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/pedivein/predict \
  -H "X-API-Key: $PEDIVEIN_API_KEY" \
  -F "image=@/path/to/image.jpg" \
  -F "selected_arm_id=ARM01" \
  -F "allow_manual_quality_review=true"
```

- Swagger UI: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`
- รองรับ JPG/PNG และจำกัดขนาดเริ่มต้น 15 MB
- ใช้ worker เดียวเป็นค่าเริ่มต้นเพื่อไม่โหลดโมเดลซ้ำจน RAM เต็ม
- ไฟล์ upload ถูกเขียนเป็นไฟล์ชั่วคราวและลบใน `finally` หลัง request
- access log ถูกปิดเพื่อหลีกเลี่ยงการบันทึกข้อมูล path/query โดยไม่จำเป็น

FastAPI นี้เป็น inference API เท่านั้น ไม่มีระบบเก็บภาพ, nurse confirmation, database หรือ retraining อัตโนมัติ ส่วนเหล่านั้นต้องอยู่ใน backend/secure storage ของบริษัท

## ใช้ใน backend Python

สร้าง `PediveinPredictor` เพียงครั้งเดียวตอน service เริ่ม เพราะโมเดล preprocessing ใช้เวลาโหลด แล้ว reuse ในทุก request:

```python
from pedivein_runtime.inference import PediveinPredictor

predictor = PediveinPredictor()
result = predictor.predict("/secure/upload/image.jpg")
```

สถานะหลักของผลลัพธ์:

- `OK`: มี `condition_prediction`, `grade_prediction` และ probabilities
- `QUALITY_HOLD`: รูปต้องถ่ายใหม่หรือรอเจ้าหน้าที่ตรวจ
- `PREPROCESSING_HOLD`: หา/เลือกแขนไม่ได้ หรือ preprocessing ไม่ผ่าน

FastAPI จะลบไฟล์ upload ชั่วคราวหลังประมวลผล แต่ Backend ยังคงต้องบังคับ HTTPS, network restriction, authentication/authorization, audit policy และการจัดเก็บข้อมูลตามมาตรฐานของบริษัทและโรงพยาบาล ห้ามวาง Uvicorn ที่เปิดตรงสู่อินเทอร์เน็ตโดยไม่มี reverse proxy และ TLS

รายละเอียด input/output อยู่ที่ [API_CONTRACT.md](API_CONTRACT.md)
