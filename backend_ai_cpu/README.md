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

Backend ควรลบไฟล์ upload หลังประมวลผลตามนโยบายโรงพยาบาล, ไม่เขียนภาพผู้ป่วยลง log และบังคับ HTTPS/authentication ใน API ชั้นนอก แพ็กเกจนี้ให้ inference runtime ไม่ได้เปิด HTTP endpoint เพื่อให้ทีม backend ผูกเข้ากับระบบและมาตรฐานความปลอดภัยของบริษัทเอง

รายละเอียด input/output อยู่ที่ [API_CONTRACT.md](API_CONTRACT.md)
