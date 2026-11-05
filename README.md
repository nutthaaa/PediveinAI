# PediVeinCare AI

ระบบติดตาม IV Site ผู้ป่วยเด็ก ใช้ AI ช่วยวิเคราะห์ภาพ Infiltration / Phlebitis

| ส่วน | โฟลเดอร์ | เทคโนโลยี | พอร์ต |
| --- | --- | --- | --- |
| Frontend | `src/` | React 19 + Vite 8 + Tailwind | 5173 |
| Backend หลัก | `backend/` | FastAPI + SQLAlchemy + Alembic | 8001 |
| ฐานข้อมูล | `docker-compose.yml` | PostgreSQL 16 (Docker) | 5434 |
| AI inference | `backend_ai_cpu/` | FastAPI + Grounding DINO + SAM2 + ONNX (CPU) | 8000 |

```
Browser ──► Vite (5173) ──/api──► backend (8001) ──► PostgreSQL (5434)
                                        │
                                        └──HTTP──► backend_ai_cpu (8000)
```

Backend หลักเป็นตัวเดียวที่คุยกับฐานข้อมูลและบริการ AI ส่วน frontend เรียกผ่าน `/api` (Vite proxy) และใช้ session cookie แบบ httpOnly

> โมเดลอยู่ในสถานะ `EXPERIMENTAL_CANDIDATE` (เทรนจาก 109 ภาพ, Condition accuracy ~73%, Grade accuracy ~56%)
> และจำแนกได้เฉพาะ INF กับ PHL **ไม่มีคลาส “ปกติ”** ทุกผลต้องได้รับการยืนยันจากบุคลากรทางการแพทย์

## สิ่งที่ต้องมี

- Docker Desktop
- Python 3.11
- Node.js 20.19+ หรือ 22 (`nvm use` อ่านจาก `.nvmrc`) — Vite 8 ไม่รองรับ Node 17/18
- RAM ว่าง ~8 GB สำหรับบริการ AI

## เริ่มใช้งาน (เครื่อง dev)

### 1. ฐานข้อมูล + backend หลัก (Docker)

```bash
docker compose up -d --build db backend
```

backend จะรัน `alembic upgrade head` และในการเริ่มครั้งแรกจะสร้างบัญชี `admin` เพียงบัญชีเดียว (ไม่มีข้อมูลผู้ป่วยตัวอย่าง)

ถ้าต้องการรัน backend นอก Docker (แก้โค้ดแล้ว reload อัตโนมัติ):

```bash
docker compose up -d db
cd backend
python3.11 -m venv .venv && .venv/bin/pip install -r requirements_dev.txt
cp .env.example .env            # แก้ PEDIVEIN_JWT_SECRET
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --port 8001 --reload
```

### 2. บริการ AI (รันบนเครื่องโดยตรง)

Docker Desktop บน Mac มักจำกัด RAM ไว้ต่ำเกินสำหรับ DINO + SAM2 จึงแนะนำให้รันบนเครื่อง:

```bash
cd backend_ai_cpu
python3.11 -m venv .venv
.venv/bin/pip install -r requirements_dev.txt
.venv/bin/python scripts/download_preprocessor_models.py   # ครั้งแรกครั้งเดียว
.venv/bin/python scripts/run_api.py                         # ฟังที่ 127.0.0.1:8000
```

บนเซิร์ฟเวอร์ Linux ที่มี RAM พอ ใช้ `docker compose --profile ai up -d --build` แล้วตั้ง
`PEDIVEIN_AI_BASE_URL=http://ai:8000` ให้ backend

### 3. Frontend

```bash
nvm use
npm ci
npm run dev        # http://localhost:5173
```

## บัญชีเริ่มต้น

ระบบเริ่มต้นแบบไม่มีข้อมูล มีเพียงบัญชี `admin` (รหัสผ่าน `pedivein1234` หรือค่า `PEDIVEIN_DEMO_PASSWORD` ที่ตั้งก่อนเริ่มครั้งแรก)
ให้เปลี่ยนรหัสผ่านหลังเข้าสู่ระบบ แล้วเพิ่มบุคลากรจากหน้า “ผู้ใช้งานและสิทธิ์การเข้าถึง” ซึ่งจะใช้ **รหัสพนักงาน** เป็นชื่อผู้ใช้

## ขั้นตอนการทำงานหลัก

1. **ลงทะเบียนผู้ป่วย** (หน้า ผู้ป่วยเด็ก → “+ ลงทะเบียนผู้ป่วย”) — บังคับเฉพาะห้องและเพศ ถ้าไม่กรอก HN ระบบสร้างเลข 10 หลักให้ ยังไม่ได้เชื่อม HIS
2. **เพิ่ม IV Site** → เลือกตำแหน่ง/เส้นเลือด → ถ่ายภาพ Baseline (ระบบตรวจคุณภาพภาพ) → ยืนยัน
   ระบบสร้างรอบตรวจ 84 รอบ (ทุก 2 ชม. × 168 ชม.)
3. **ตรวจตามรอบ** (หน้า รายการตรวจตามกำหนด → “ตรวจเข็ม”) → ถ่ายภาพ → “วิเคราะห์ด้วย AI”
   - `QUALITY_HOLD`: ภาพไม่ผ่านเกณฑ์ ให้ถ่ายใหม่ หรือยืนยันใช้ภาพที่อยู่ใน `MANUAL_REVIEW`
   - `PREPROCESSING_HOLD`: หาแขนไม่ได้/มุมกล้องเอียง ถ้าพบหลายแขนให้เลือกแขนจากภาพตัวอย่าง
   - `OK`: รอบนั้นถูกบันทึกว่าตรวจแล้ว และผลเข้าคิว “ผล AI รอการทบทวน”
4. **ทบทวนผล** แยก Infiltration และ Phlebitis → ยืนยันพบ/ไม่พบ + Grade 1–4 + อาการปวด (ถ้ามีอาการปวด Grade 1 จะถูกปรับเป็น Grade 2 อัตโนมัติ)
5. **ข้ามรอบ** ต้องระบุเหตุผล (ไม่เริ่มนับ 168 ชม. ใหม่) · **ถอดเข็ม** แล้วติดตามต่อทุก 8 ชม. จนครบระยะเดิม ·
   **สิ้นสุดการติดตาม** ปิดทุก IV Site ของผู้ป่วย

**ลบข้อมูล (เฉพาะผู้ดูแลระบบ, ลบถาวร):** ปุ่ม "ลบเคสนี้" ในหน้าผู้ป่วยลบทั้งเคส (IV Site รอบตรวจ ภาพ ผล AI ผลทบทวน)
และปุ่ม "ลบผลวิเคราะห์นี้" ในหน้าทบทวนผลหรือประวัติลบผล AI ครั้งเดียวพร้อมภาพ (รอบนั้นกลับเป็นรอตรวจ)
ต้องกรอกเหตุผลและพิมพ์ยืนยัน กู้คืนไม่ได้ ระบบเก็บไว้แค่บันทึกใน audit log ว่าใครลบอะไรเพราะอะไร

สถานะรอบ: ถึงกำหนด = ภายใน 15 นาทีก่อนเวลา, เกินกำหนด = เลย 15 นาทีหลังเวลา (แก้ได้ใน `system_settings`)
รอบที่ไม่ได้ตรวจแล้วถึงรอบถัดไปจะถูกบันทึกเป็น “พลาด”

## เทรนโมเดลใหม่ (Retraining) และเวอร์ชันโมเดล

หน้า **จัดการโมเดล AI** (ผู้ดูแลระบบและหัวหน้าพยาบาลเปิดดูได้ แต่เทรนหรือเปลี่ยนเวอร์ชันได้เฉพาะผู้ดูแลระบบ)

- **ข้อมูลเทรน** มาจากผลที่บุคลากรกดยืนยันในขั้น "ทบทวนผล" โดยอัตโนมัติ ไม่ต้องติดป้ายแยก
  ภาพหนึ่งใช้ได้เมื่อมีภาวะเดียวที่ Grade สูงกว่า (INF หรือ PHL + Grade 1–4) ภาพที่ไม่พบทั้งสองภาวะจะยังไม่ถูกใช้ เพราะโมเดลยังไม่มีคลาสปกติ
  ต้องมีอย่างน้อย 25 ภาพ
- **การเทรน** ทำในบริการ AI (ใช้ GPU ถ้ามี) โดยเริ่มต่อจากโมเดลที่ใช้งานอยู่ (`mobilenetv4_conv_small` ซึ่งแปลงน้ำหนักกลับจาก ONNX ของ v2)
  ระบบแยกผู้ป่วยประมาณ 20% ไว้เป็นชุดทดสอบ และเทียบผลกับโมเดลเดิมบนภาพชุดเดียวกัน
- **ทุกเวอร์ชันเก็บไว้** พร้อม accuracy, balanced accuracy, macro F1, confusion matrix, จำนวนภาพเทรน/ทดสอบแยกตามคลาส, ค่าที่ใช้เทรน และ training log ครบ
  ทั้งในตาราง `model_versions` และใน volume `ai_models` ของบริการ AI
- **เวอร์ชันใหม่ไม่ถูกใช้งานเอง** ผู้ดูแลระบบต้องกด "ใช้งานเวอร์ชันนี้" และย้อนกลับไปเวอร์ชันใดก็ได้ ทุกครั้งถูกบันทึกใน audit log
  ผลวิเคราะห์แต่ละครั้งบันทึก `model_version` ที่ใช้จริง จึงย้อนดูได้ว่าผลไหนมาจากเวอร์ชันไหน
- **เทรนอัตโนมัติ** เปิดได้ในหน้าเดียวกัน (ค่าเริ่มต้น: ปิด) เช่น ทุก 7 วันเมื่อมีภาพยืนยันใหม่อย่างน้อย 20 ภาพ ตัว backend ตรวจทุก 5 นาที

ไฟล์โมเดลที่เทรนแล้วอยู่ใน volume `ai_models` (`/data/models`) และบริการ AI อ่านภาพจาก `backend/uploads` แบบอ่านอย่างเดียว
ถ้ารันบริการ AI นอก Docker จะใช้ `backend_ai_cpu/model_registry/` และ `backend/uploads/` เป็นค่าเริ่มต้น (`PEDIVEIN_MODEL_DIR`, `PEDIVEIN_UPLOAD_DIR`)

## API

- Swagger: http://localhost:8001/docs
- ทุก endpoint อยู่ใต้ `/api` และต้อง login (cookie `pedivein_session` หรือ `Authorization: Bearer <token>`)
- ภาพผู้ป่วยเก็บใน `backend/uploads/` และเปิดผ่าน `/api/images/{id}` เท่านั้น (ต้อง login)

## การทดสอบ

```bash
cd backend && .venv/bin/pytest            # ใช้ฐานข้อมูล pedivein_test บน PostgreSQL ของ docker compose
cd backend_ai_cpu && .venv/bin/pytest
npm run lint && npm run build
```

## ฐานข้อมูล

- pgAdmin: http://localhost:5050 (เริ่มพร้อม `docker compose up`) ล็อกอิน `admin@pedivein.dev` / `pedivein`
  มี server "PediVein (docker compose)" ลงทะเบียนไว้ให้แล้ว รหัสผ่านฐานข้อมูลคือ `pedivein` (หรือค่า `POSTGRES_PASSWORD`)
  เปลี่ยนได้ด้วย `PGADMIN_EMAIL`, `PGADMIN_PASSWORD`, `PGADMIN_HOST_PORT` ใน `.env`

- Migration: `backend/alembic/versions/` (`alembic revision --autogenerate -m "..."` เมื่อแก้ `app/models.py`)
- ล้างข้อมูลผู้ป่วยและผู้ใช้ทั้งหมด: `docker compose down` → ลบ volume `<project>_pgdata` และโฟลเดอร์ `backend/uploads` แล้วเริ่มใหม่
  (`docker compose down -v` จะลบโมเดลที่เทรนไว้ใน `ai_models` และการตั้งค่า pgAdmin ด้วย)

## ก่อนขึ้น production

- ตั้ง `PEDIVEIN_JWT_SECRET`, `POSTGRES_PASSWORD`, `PEDIVEIN_AI_API_KEY` เป็นค่าสุ่มยาว และ `PEDIVEIN_SEED_DEMO_DATA=false`
- วางหลัง reverse proxy ที่มี HTTPS และตั้ง `PEDIVEIN_COOKIE_SECURE=true`
- `backend/uploads` และ volume ฐานข้อมูลต้องเข้ารหัสและสำรองข้อมูลตามนโยบายโรงพยาบาล
- ยังไม่มี: การเชื่อม HIS, MFA จริง (ช่อง `mfa_enabled` เป็นเพียงข้อมูล), การ export PDF (ใช้การพิมพ์ของ browser)
