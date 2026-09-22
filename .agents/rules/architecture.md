# SMH Architecture Rules

> **trigger: model_decision** — โหลดเมื่อ AI ตัดสินใจเรื่องสถาปัตยกรรมหรือสร้างไฟล์ใหม่

---

## โครงสร้างไฟล์ตาม Pattern ของโปรเจกต์

### Backend (Laravel 11)

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── [Module]Controller.php       # CRUD + index/show/store/update/destroy
│   │   └── [Module]/                    # ถ้า module มีหลาย controller
│   ├── Middleware/
│   │   ├── ShareMenus.php              # แชร์ menus ผ่าน Inertia::share
│   │   ├── MaskPiiResponse.php         # Mask PII โดยอัตโนมัติ
│   │   └── SecurityHeaders.php         # CSP headers
│   └── Requests/                       # Form Request validation (ถ้าซับซ้อน)
├── Models/
│   └── [Module].php                    # Eloquent + ใช้ connection('mysql') เสมอ
├── Services/
│   ├── Hosxp/
│   │   └── [Name]Service.php          # HOSxP read-only queries
│   └── [Module]/
│       └── [Name]Service.php          # Business logic แยกออกจาก Controller
├── Providers/
│   └── HosxpReadOnlyServiceProvider.php  # Guard HOSxP writes
└── Support/
    └── PiiMask.php                    # Static methods สำหรับ mask PII
```

### Frontend (React + Inertia)

```
resources/
├── js/
│   ├── pages/
│   │   └── [Module]/
│   │       ├── Index.tsx              # รายการ
│   │       ├── Show.tsx               # รายละเอียด
│   │       ├── Create.tsx             # สร้างใหม่
│   │       └── Edit.tsx               # แก้ไข
│   ├── components/                    # Shared UI components
│   │   └── ui/                        # shadcn/ui components
│   ├── layouts/                       # Layout wrappers
│   └── lib/                           # Utilities, axios config, etc.
├── css/
│   └── app.css                        # Tailwind v4 + @keyframes ทั้งหมด
└── views/
    ├── layouts/
    │   └── admin.blade.php            # Layout สำหรับ Blade pages
    └── [module]/                      # Blade views (non-Inertia เท่านั้น)
```

### Database (Migrations)

```
database/migrations/
└── YYYY_MM_DD_HHMMSS_create_[table]_table.php
```
- ใช้ `Schema::connection('mysql')` เสมอ (ห้ามใช้ connection อื่น)
- ตั้งชื่อตาราง snake_case plural: `tv_clinic_rooms`, `tv_media_playlists`

---

## Pattern: สร้าง Inertia Module ใหม่

### Step 1 – Migration
```php
Schema::connection('mysql')->create('module_items', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->boolean('is_active')->default(true);
    $table->timestamps();
});
```

### Step 2 – Model
```php
class ModuleItem extends Model {
    protected $connection = 'mysql';
    protected $fillable = ['name', 'is_active'];
    protected $casts = ['is_active' => 'boolean'];
}
```

### Step 3 – Controller
```php
class ModuleController extends Controller {
    public function index(): Response {
        return Inertia::render('Module/Index', [
            'items' => ModuleItem::paginate(20),
        ]);
    }
}
```

### Step 4 – Route (routes/web.php)
```php
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/module', [ModuleController::class, 'index'])->name('module.index');
});
```

### Step 5 – React Page
```tsx
// resources/js/pages/Module/Index.tsx
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

export default function Index({ items }) {
    return (
        <AppLayout>
            <Head title="Module" />
            {/* ... */}
        </AppLayout>
    );
}
```

### Step 6 – เพิ่มเมนู (ผ่าน route ชั่วคราว เนื่องจาก PHP CLI ไม่ทำงาน)
```php
// เพิ่มชั่วคราวใน routes/web.php แล้วลบออกหลังใช้
Route::get('/dev/add-menu', function () {
    \App\Models\Menu::create([
        'name'            => 'ชื่อโมดูล',
        'route'           => '/module',
        'icon'            => 'lucide-icon-name',
        'order'           => 99,
        'permission_name' => null, // null = ทุกคนเห็น
    ]);
    return 'Done';
});
```

---

## Pattern: HOSxP Integration Service

```php
// app/Services/Hosxp/NewHosxpService.php
class NewHosxpService {
    public function getData(string $date): Collection {
        // ดึงจาก HOSxP → mask PII → คืนค่าที่สะอาด
        return DB::connection('hosxp')
            ->table('ovst as o')
            ->select(['o.oqueue']) // อย่า select hn, cid, fname, lname โดยตรง
            ->whereDate('o.vstdate', $date)
            ->get()
            ->map(fn($row) => [
                'queue' => $row->oqueue,
                // mask ก่อนส่งออก
            ]);
    }
}
```

---

## Component Standards (React/TSX)

- ใช้ `shadcn/ui` components จาก `resources/js/components/ui/`
- ใช้ `AppLayout` จาก `@/layouts/app-layout` เสมอ
- ใช้ `<Head title="ชื่อหน้า" />` จาก `@inertiajs/react`
- Type definitions อยู่ใน `resources/js/types/`
- ใช้ Tailwind utility classes เท่านั้น (ห้าม inline style ยกเว้นจำเป็น)

---

## Naming Conventions

| สิ่งของ | รูปแบบ | ตัวอย่าง |
|---------|--------|---------|
| PHP Class | PascalCase | `TvClinicRoom` |
| PHP Method | camelCase | `getTodayQueue()` |
| DB Table | snake_case plural | `tv_clinic_rooms` |
| DB Column | snake_case | `board_key`, `is_active` |
| Route name | dot.notation | `tv.board`, `admin.tv.rooms.index` |
| React Component | PascalCase | `QueueBoard` |
| React file | PascalCase.tsx | `Index.tsx`, `Show.tsx` |
| CSS class | kebab-case | `row-calling`, `tv-board` |
