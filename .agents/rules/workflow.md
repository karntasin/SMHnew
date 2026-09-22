# SMH Development Workflow & Quota-Efficient Guidelines

> **trigger: model_decision** — โหลดเมื่อเริ่มงานใหม่หรือวางแผนงาน

---

## หลัก Context Engineering (ประหยัดโควต้า ได้คุณภาพสูง)

### 1. Research ก่อน Write เสมอ
```
DO: อ่านไฟล์ที่เกี่ยวข้องก่อนแก้ไข
DO: grep หา pattern ที่ใช้อยู่แล้ว
DON'T: เดาว่าโค้ดเป็นอย่างไร แล้วเขียนใหม่ทั้งหมด
DON'T: อ่านไฟล์ทั้งโปรเจกต์โดยไม่จำเป็น (context overflow)
```

### 2. Targeted File Reading
```bash
# อ่านเฉพาะส่วนที่ต้องการ ไม่ใช่ทั้งไฟล์
view_file (StartLine, EndLine)

# ค้นหาก่อน แทนการอ่านทั้งไฟล์
grep_search "pattern" path/

# หาไฟล์ที่เกี่ยวข้อง
find_by_name "*.php" SearchDirectory=app/Services
```

### 3. แก้ไขแบบ Surgical (ไม่ rewrite ทั้งไฟล์)
```
DO: replace_file_content เฉพาะบรรทัดที่เปลี่ยน
DON'T: write_to_file ทับทั้งไฟล์ถ้ายังมีโค้ดดีอยู่
```

---

## Workflow มาตรฐานสำหรับโปรเจกต์นี้

### เมื่อได้รับงาน Debug/Fix Bug
1. ดู error log: `Get-Content storage/logs/laravel.log -Tail 50`
2. grep หา code ที่เกี่ยวข้อง
3. อ่านเฉพาะไฟล์ที่มีปัญหา
4. แก้ไข minimal (ไม่ refactor ส่วนอื่น)
5. ทดสอบผ่าน browser (ไม่ใช่ php artisan)

### เมื่อสร้าง Feature ใหม่
1. ตรวจสอบว่ามี code คล้ายกันอยู่แล้วหรือไม่ (grep)
2. อ่าน `GEMINI.md` เพื่อทบทวน constraints
3. สร้างตาม pattern ที่มีอยู่ (ดู `.agents/rules/architecture.md`)
4. Migration → Model → Service → Controller → Route → Frontend → Menu
5. Build: `npm run build`
6. ทดสอบผ่าน browser

### เมื่อต้องรัน Artisan Commands
เนื่องจาก PHP CLI = 8.0.30 ไม่สามารถรัน artisan ได้ ใช้วิธีนี้แทน:

```php
// เพิ่มใน routes/web.php ชั่วคราว (ลบออกหลังใช้)
Route::get('/dev/migrate', function () {
    Artisan::call('migrate', ['--force' => true]);
    return Artisan::output();
});
```

⚠️ **ลบ route ออกทันทีหลังใช้งาน** อย่าทิ้งไว้

---

## HOSxP Query Pattern

```php
// ✅ Pattern ที่ถูกต้อง
$rows = DB::connection('hosxp')
    ->table('ovst as o')
    ->leftJoin('patient as p', 'p.hn', '=', 'o.hn')
    ->select(['p.fname', 'p.lname', 'o.oqueue']) // เลือกเฉพาะที่ต้องการ
    ->whereDate('o.vstdate', now()->toDateString())
    ->get();

// mask ทันทีก่อนส่งออก
return $rows->map(fn($r) => [
    'queue'        => $r->oqueue,
    'display_name' => PiiMask::patientName($r->fname, $r->lname),
]);
// ตั้งแต่นี้ไป hn, fname, lname หายไปแล้ว
```

---

## Frontend Development Pattern

### Inertia Page ใหม่
```tsx
// ✅ Minimal pattern ที่ถูกต้อง
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { PageProps } from '@/types';

interface Props extends PageProps {
    items: { id: number; name: string }[];
}

export default function Index({ items }: Props) {
    return (
        <AppLayout breadcrumbs={[{ title: 'Module', href: '/module' }]}>
            <Head title="Module" />
            <div className="p-6">
                {/* content */}
            </div>
        </AppLayout>
    );
}
```

### Blade + Alpine.js (สำหรับ Kiosk/Display)
```blade
@extends('layouts.admin')
@section('content')
<div x-data="{ ... }" x-init="init()">
    {{-- Alpine.js reactive content --}}
</div>
@endsection
```

---

## Common Pitfalls ที่เคยเจอในโปรเจกต์นี้

| ปัญหา | สาเหตุ | วิธีแก้ |
|-------|--------|--------|
| 500 MissingAppKeyException | Race condition บน Apache Windows multithread | รัน config:cache ผ่าน browser |
| HOSxP BLOCKED write error | DB listener ดักทุก connection | เช็ค `$query->connectionName === 'hosxp'` |
| Inertia Error on Blade pages | app.tsx พยายาม mount React บนหน้าที่ไม่มี #app | `if (document.getElementById('app'))` guard |
| CSP blocked YouTube iframe | SecurityHeaders middleware ไม่มี frame-src | เพิ่ม `frame-src 'self' https:` ใน CSP |
| Menu ไม่ขึ้น | permission_name ไม่ตรงกับ role user | ตั้ง permission_name = null หรือสร้าง permission |
| Sidebar Inertia intercept Blade link | app-sidebar.tsx ไม่รู้ว่าเป็น Blade page | เพิ่ม route path ใน `isExternal` check |

---

## การ Build และ Deploy

```bash
# Build frontend (ทำหลัง edit React/CSS ทุกครั้ง)
npm run build

# ตรวจสอบผล build
ls public/build/assets/ | Sort-Object LastWriteTime -Descending | Select -First 5

# Cache config (ผ่าน browser)
GET http://localhost/sss/my-app/public/dev/config-cache
```

---

## Debug Checklist

เมื่อเจอ error ให้ตรวจตามลำดับนี้:

1. `storage/logs/laravel.log` — PHP error
2. Browser Console — JavaScript error  
3. Browser Network tab — HTTP 4xx/5xx
4. `routes/web.php` — route ถูกต้องหรือไม่
5. `app/Http/Middleware/` — middleware block หรือไม่
6. DB connection name — ใช้ถูก connection หรือไม่
