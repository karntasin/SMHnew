# SMH – ระบบบริหารโรงพยาบาล (Saraburi Memorial Hospital)

> **อ่านไฟล์นี้ให้จบก่อนเริ่มงานทุกครั้ง** คำแนะนำในนี้มีผลเหนือกว่าการคาดเดาทุกอย่าง

---

## 1. Stack & Environment

| Layer       | Technology                                    |
|-------------|-----------------------------------------------|
| Backend     | **Laravel 11** (PHP 8.2+, Apache/XAMPP)       |
| Frontend    | **React 19 + Inertia.js** (TypeScript/TSX)    |
| UI          | **Tailwind CSS v4** – ห้ามสร้าง `tailwind.config.js` |
| DB (app)    | **MySQL** connection = `mysql` (read/write)   |
| DB (HOSxP)  | **MySQL** connection = `hosxp` – **READ-ONLY เด็ดขาด** |
| Build       | **Vite** – ห้ามสร้าง entry point ใหม่         |
| State UI    | **Alpine.js** (Blade pages เช่น /tv) / React (Inertia pages) |

### PHP CLI Limitation
- CLI PHP = 8.0.30 → `php artisan` **ล้มเหลวบน PowerShell เสมอ**
- ✅ วิธีแก้: เพิ่ม route ชั่วคราวใน `routes/web.php` เพื่อรัน code ผ่าน HTTP แทน
- ❌ ห้ามแนะนำให้รัน `php artisan` ผ่าน shell

---

## 2. กฎสำคัญ (Critical Rules)

### 2.1 HOSxP Database (READ-ONLY)
```
❌ ห้ามทำ: INSERT, UPDATE, DELETE, CREATE TABLE บน connection 'hosxp'
✅ อนุญาต: SELECT เท่านั้น + INSERT ไปที่ ksklog เท่านั้น
```
- Provider: `app/Providers/HosxpReadOnlyServiceProvider.php`
- ตรวจสอบ `$query->connectionName === 'hosxp'` ก่อนเสมอ

### 2.2 Tailwind CSS v4
```
❌ ห้ามสร้าง: tailwind.config.js, postcss.config.js, ไฟล์ CSS แยก
✅ สิ่งที่ถูก: เพิ่ม @keyframes / utility ที่ resources/css/app.css
```

### 2.3 ระบบเมนู (Dynamic Menu)
- เมนูทั้งหมดมาจากตาราง `menus` ใน DB (ไม่ใช่ hardcode)
- Model: `App\Models\Menu`, Middleware: `app/Http/Middleware/ShareMenus.php`
- permission_name = null → ทุกคนเห็น

### 2.4 Inertia vs Blade
- หน้า `/admin/tv/*` และ `/tv` → Blade + Alpine.js (ไม่ใช่ Inertia)
- หน้า React จะใช้ `resources/js/pages/`
- Sidebar จะ detect `/admin/tv` ให้โหลดแบบ full page (ไม่ใช่ AJAX)

---

## 3. สถาปัตยกรรมโมดูล

```
app/
├── Http/Controllers/        # Controller per module
├── Models/                  # Eloquent models
├── Services/                # Business logic
│   ├── Hosxp/              # HOSxP integration services
│   └── [Module]/           # Module-specific services
├── Providers/               # Service providers
└── Support/                 # Helpers (PiiMask, etc.)

resources/js/pages/          # React pages (Inertia)
resources/views/             # Blade views (non-Inertia)
```

---

## 4. โมดูลที่มีอยู่แล้ว (อย่า re-create)

| โมดูล | เส้นทาง/URL | หมายเหตุ |
|-------|-------------|---------|
| ระบบคิว (FSHH-Q) | `/tv`, `/admin/tv/*` | Blade + Alpine.js |
| คลังยา | `Pharmacy/` | Inertia React |
| RDU / Drug Usage | `Rdu/`, `DrugUsage/` | Inertia React |
| เอกสาร | `documents/` | Inertia React |
| คุณภาพ | `Quality/`, `QualityIndicators/` | Inertia React |
| การเงิน | `Finance/` | Inertia React |
| Firewall Monitor | `Firewall/` | Inertia React |
| ยานพาหนะ | `vehicles/` | Inertia React |
| ซ่อมบำรุง | `maintenance/` | Inertia React |
| ยืม-คืนครุภัณฑ์ | `equipment-borrowing/` | Inertia React |

---

## 5. PDPA – ข้อมูลส่วนบุคคล

- **ห้ามส่ง** `hn`, `cid`, `fname+lname เต็ม` ออกนอก Service layer
- `App\Support\PiiMask` → ใช้สำหรับ mask ข้อมูลก่อนส่งไป Frontend
- Middleware `MaskPiiResponse` → mask Inertia/JSON responses อัตโนมัติ
- ชื่อจริง: แสดงเต็ม | นามสกุล: แสดงเฉพาะพยัญชนะ 3 ตัวแรก + `***`

---

## 6. Config Cache (สำคัญสำหรับ XAMPP Windows)

- บน Windows + XAMPP + Apache Multithread → `env()` อาจ race condition ได้
- ✅ แก้: สร้าง route `/dev/config-cache` → เรียกผ่าน browser
- หลังแก้ไข `.env` หรือ deploy ให้ cache ใหม่ทุกครั้ง

---

## 7. Pattern การสร้างโมดูลใหม่

1. **Migration** → **Model** → **Service** → **Controller** → **Route** → **Frontend** → **Menu (DB insert)**
2. ถ้า Read จาก HOSxP → ผ่าน Service ใน `app/Services/Hosxp/`
3. ถ้า Write ข้อมูลใหม่ → ใช้ connection `mysql` เท่านั้น
4. Frontend: ซับซ้อน/interactive → Inertia React | แสดงผลอย่างเดียว/Kiosk → Blade + Alpine

---

## 8. ข้อห้ามเด็ดขาด

```
❌ php artisan บน PowerShell (PHP 8.0 ไม่ตรง)
❌ tailwind.config.js หรือ Vite entry ใหม่
❌ เขียน/แก้ข้อมูลตาราง HOSxP (ยกเว้น ksklog)
❌ expose hn, cid, fullname ออก API/Frontend
❌ ทิ้งไฟล์ debug/temp ไว้ใน public/ (ล้างออกหลังใช้)
❌ เพิ่ม <?php tag ซ้ำซ้อนในไฟล์ routes/web.php
❌ สร้าง Blade view สำหรับหน้า Inertia (ใช้ resources/js/pages แทน)
```
