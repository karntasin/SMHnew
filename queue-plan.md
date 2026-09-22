# Implementation Plan: ระบบจอแสดงคิวห้องตรวจ (TV Queue Display Board)
## Laravel + HOSxP v.3 (Dual-DB) — Smart TV (Google TV/Android TV, 1080p)

> เอกสารนี้เขียนให้ครบทุกไฟล์/ทุกขั้นตอน เพื่อส่งต่อให้ Antigravity พัฒนาได้ทันทีโดยไม่ต้องถามกลับ
> **กติกาเหล็ก:** connection `hosxp` = READ-ONLY เด็ดขาด ห้าม migrate/insert/update/delete บน connection นี้เด็ดขาด — ทุก schema ใหม่ต้องอยู่บน `app_db` เท่านั้น

> **Changelog (revision 2):**
> 1. แก้บั๊ก `cur_dep_busy` เป็น `CHAR('Y'/'N')` ไม่ใช่ `INT(1/0)` ในหัวข้อ 4
> 2. เพิ่ม PDPA masking — `hn`/ชื่อเต็มไม่หลุดออกจาก Service ชั้นเดียว, JSON คืนเฉพาะ `oqueue` + `display_name` (masked) ในหัวข้อ 4
> 3. ตัด CDN ออกจากหน้า TV ทั้งหมด เปลี่ยนเป็น local asset ผ่าน Vite build ในหัวข้อ 7.0–7.1
> 4. เพิ่ม `Cache::remember` (TTL 3 วินาที) ใน Controller กันยิง query ซ้ำเมื่อ poll พร้อมกันหลายจอ ในหัวข้อ 5.4
> 5. เพิ่ม Audio Unlock Overlay สำหรับปลดล็อก autoplay เสียง/TTS บนรีโมททีวีครั้งแรก ในหัวข้อ 7.1
>
> **Changelog (revision 3 — Final):**
> 1. แก้ `resources/js/tv-board.js` ตัด import ไฟล์ที่ไม่มีอยู่จริง (`tv-board-app.js`) ออก เหลือแค่ลงทะเบียน Alpine — ป้องกัน Vite build fail และฟังก์ชัน `tvBoard` ซ้ำซ้อนกับที่ประกาศใน `board.blade.php` ในหัวข้อ 7.0
> 2. แก้ `maskWord()` ใน `HosxpQueueService.php` เปลี่ยนมาใช้ `mb_substr()` แทน `mb_str_split()` และจัดการสระนำหน้าภาษาไทย (เ/แ/โ/ใ/ไ) ให้โชว์คู่กับพยัญชนะตัวถัดไป ในหัวข้อ 4
> 3. เปลี่ยนการจำสถานะปลดล็อกเสียงจาก `localStorage` เป็น `sessionStorage` ใน `board.blade.php` เพื่อให้ Overlay กลับมาแสดงใหม่ทุกครั้งที่เปิดทีวี (สิทธิ์ autoplay ถูกรีเซ็ตทุกวัน) ในหัวข้อ 7.1
> 4. เพิ่มขั้นตอนปิด Overscan บนทีวี TCL ใน Deployment Checklist ข้อ 10

---

## 0. สรุปสถาปัตยกรรม

```
[HOSxP v.3 MySQL] --(read-only queries)--> [Laravel App] --(REST/JSON polling)--> [Blade+Alpine.js TV Client บน Smart TV]
                                                 |
                                          [app_db MySQL: settings/playlist/room-map]
                                                 |
                                          [Admin Back-office (Blade)]
```

- **Backend:** Laravel (ใช้โปรเจกต์เดิม, ไม่ต้อง `laravel new`)
- **DB เดิม (อ่านคิว):** connection `hosxp`
- **DB แอป (ตั้งค่า):** connection `mysql`/`app_db`
- **หน้าจอทีวี:** Blade view เต็มจอ + Alpine.js polling ทุก N วินาที (ไม่ใช้ WebSocket เพื่อลดภาระ), Tailwind CSS, เบาสุด ไม่มี SPA framework หนักๆ
- **Layout:** ซ้าย (สื่อ video/slide/rss) : ขวา (ตารางคิว) ตามสัดส่วนที่ตั้งค่าได้ (40/60 หรือ 45/55)

---

## 1. Environment & Config

### 1.1 `.env` (เพิ่ม/ยืนยัน)

```env
# --- App DB (default) ---
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=app_db
DB_USERNAME=app_user
DB_PASSWORD=secret

# --- HOSxP DB (READ ONLY) ---
HOSXP_DB_HOST=127.0.0.1
HOSXP_DB_PORT=3306
HOSXP_DB_DATABASE=hos
HOSXP_DB_USERNAME=hosxp_readonly
HOSXP_DB_PASSWORD=secret_ro

# TV Board defaults
TV_QUEUE_POLL_SECONDS=5
TV_MEDIA_DEFAULT_DURATION=10
```

> **ข้อแนะนำระดับ DB:** สร้าง MySQL user `hosxp_readonly` ด้วยสิทธิ์ `GRANT SELECT ON hos.* TO 'hosxp_readonly'@'%';` เท่านั้น อย่าใช้ user เดิมที่มีสิทธิ์เขียนมาต่อ connection นี้ เพื่อป้องกันความผิดพลาดระดับ application ไม่ให้ไปกระทบ production HIS

### 1.2 `config/database.php` (เพิ่ม connection `hosxp`)

```php
'connections' => [

    'mysql' => [
        'driver' => 'mysql',
        'host' => env('DB_HOST', '127.0.0.1'),
        'port' => env('DB_PORT', '3306'),
        'database' => env('DB_DATABASE', 'app_db'),
        'username' => env('DB_USERNAME', 'app_user'),
        'password' => env('DB_PASSWORD', ''),
        'charset' => 'utf8mb4',
        'collation' => 'utf8mb4_unicode_ci',
        'prefix' => '',
        'strict' => true,
        'engine' => null,
    ],

    'hosxp' => [
        'driver' => 'mysql',
        'host' => env('HOSXP_DB_HOST', '127.0.0.1'),
        'port' => env('HOSXP_DB_PORT', '3306'),
        'database' => env('HOSXP_DB_DATABASE', 'hos'),
        'username' => env('HOSXP_DB_USERNAME', 'hosxp_readonly'),
        'password' => env('HOSXP_DB_PASSWORD', ''),
        'charset' => 'tis620', // HOSxP v.3 ส่วนใหญ่เก็บเป็น tis620 — ตรวจสอบจริงก่อน deploy
        'collation' => 'tis620_thai_ci',
        'prefix' => '',
        'strict' => false,
        'engine' => null,
        // ป้องกัน accidental write ระดับ Laravel เพิ่มอีกชั้น (ดู Service Provider ด้านล่าง)
    ],

],
```

> **หมายเหตุ charset:** HOSxP v.3 บางไซต์ตั้งเป็น `tis620`, บางไซต์แปลงเป็น `utf8`. ให้ Antigravity ตรวจสอบด้วย `SHOW CREATE TABLE patient;` ก่อนจริง แล้วปรับ `charset`/`collation` ให้ตรง มิฉะนั้นชื่อคนไข้ภาษาไทยจะเพี้ยน

### 1.3 บังคับ Read-Only ระดับ Application (กันเผื่อ 2 ชั้น)

สร้างไฟล์ `app/Providers/HosxpReadOnlyServiceProvider.php`:

```php
<?php

namespace App\Providers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use RuntimeException;

class HosxpReadOnlyServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        DB::connection('hosxp')->listen(function ($query) {
            $sql = strtolower(trim($query->sql));
            $blocked = ['insert', 'update', 'delete', 'alter', 'drop', 'truncate', 'create', 'replace'];
            foreach ($blocked as $keyword) {
                if (str_starts_with($sql, $keyword)) {
                    throw new RuntimeException(
                        "BLOCKED: Write operation [{$keyword}] attempted on read-only HOSxP connection."
                    );
                }
            }
        });
    }
}
```

ลงทะเบียนใน `bootstrap/providers.php` (Laravel 11+) หรือ `config/app.php` (Laravel 10-):

```php
App\Providers\HosxpReadOnlyServiceProvider::class,
```

---

## 2. Database Schema (app_db เท่านั้น)

### 2.1 Migration: `tv_display_settings`

`database/migrations/2026_09_21_000001_create_tv_display_settings_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('mysql')->create('tv_display_settings', function (Blueprint $table) {
            $table->id();
            $table->string('board_key')->unique()->default('default'); // รองรับหลายจอในอนาคต
            $table->enum('left_media_mode', ['video', 'image_slider', 'rss_news'])->default('image_slider');
            $table->unsignedTinyInteger('left_panel_width_percent')->default(40); // 40 หรือ 45
            $table->unsignedTinyInteger('right_panel_width_percent')->default(60);
            $table->boolean('chime_enabled')->default(true);
            $table->boolean('tts_enabled')->default(true);
            $table->string('tts_voice_locale')->default('th-TH');
            $table->string('rss_feed_url')->nullable();
            $table->unsignedInteger('queue_poll_seconds')->default(5);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('tv_display_settings');
    }
};
```

### 2.2 Migration: `tv_media_playlists`

`database/migrations/2026_09_21_000002_create_tv_media_playlists_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('mysql')->create('tv_media_playlists', function (Blueprint $table) {
            $table->id();
            $table->string('board_key')->default('default');
            $table->enum('media_type', ['video', 'image']);
            $table->string('title')->nullable();
            $table->string('file_path'); // เก็บ path ใน storage/app/public/tv-media หรือ URL เต็ม
            $table->unsignedInteger('duration_seconds')->default(10); // ใช้กับ image เท่านั้น, video เล่นจนจบคลิป
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['board_key', 'is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('tv_media_playlists');
    }
};
```

### 2.3 Migration: `tv_clinic_rooms`

`database/migrations/2026_09_21_000003_create_tv_clinic_rooms_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('mysql')->create('tv_clinic_rooms', function (Blueprint $table) {
            $table->id();
            $table->string('board_key')->default('default');
            $table->string('hosxp_cur_dep', 10); // เช่น '002', '003' — map ไปยัง ovst.cur_dep
            $table->string('display_name'); // เช่น 'ห้องตรวจ 1 (อายุรกรรมทั่วไป)'
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['board_key', 'hosxp_cur_dep']);
            $table->index(['board_key', 'is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('tv_clinic_rooms');
    }
};
```

### 2.4 Seeder ตัวอย่าง (optional)

`database/seeders/TvBoardSeeder.php`

```php
<?php

namespace Database\Seeders;

use App\Models\TvDisplaySetting;
use App\Models\TvClinicRoom;
use Illuminate\Database\Seeder;

class TvBoardSeeder extends Seeder
{
    public function run(): void
    {
        TvDisplaySetting::updateOrCreate(
            ['board_key' => 'default'],
            [
                'left_media_mode' => 'image_slider',
                'left_panel_width_percent' => 40,
                'right_panel_width_percent' => 60,
                'chime_enabled' => true,
                'tts_enabled' => true,
                'queue_poll_seconds' => 5,
            ]
        );

        $rooms = [
            ['hosxp_cur_dep' => '002', 'display_name' => 'ห้องตรวจ 1 (อายุรกรรมทั่วไป)', 'sort_order' => 1],
            ['hosxp_cur_dep' => '003', 'display_name' => 'ห้องตรวจ 2 (เบาหวาน/ความดัน)', 'sort_order' => 2],
        ];

        foreach ($rooms as $room) {
            TvClinicRoom::updateOrCreate(
                ['board_key' => 'default', 'hosxp_cur_dep' => $room['hosxp_cur_dep']],
                $room + ['is_active' => true]
            );
        }
    }
}
```

---

## 3. Models

### 3.1 `app/Models/TvDisplaySetting.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TvDisplaySetting extends Model
{
    protected $connection = 'mysql';
    protected $table = 'tv_display_settings';

    protected $fillable = [
        'board_key', 'left_media_mode', 'left_panel_width_percent',
        'right_panel_width_percent', 'chime_enabled', 'tts_enabled',
        'tts_voice_locale', 'rss_feed_url', 'queue_poll_seconds',
    ];

    protected $casts = [
        'chime_enabled' => 'boolean',
        'tts_enabled' => 'boolean',
    ];
}
```

### 3.2 `app/Models/TvMediaPlaylist.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TvMediaPlaylist extends Model
{
    protected $connection = 'mysql';
    protected $table = 'tv_media_playlists';

    protected $fillable = [
        'board_key', 'media_type', 'title', 'file_path',
        'duration_seconds', 'sort_order', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function scopeActiveForBoard($query, string $boardKey = 'default')
    {
        return $query->where('board_key', $boardKey)
            ->where('is_active', true)
            ->orderBy('sort_order');
    }
}
```

### 3.3 `app/Models/TvClinicRoom.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TvClinicRoom extends Model
{
    protected $connection = 'mysql';
    protected $table = 'tv_clinic_rooms';

    protected $fillable = [
        'board_key', 'hosxp_cur_dep', 'display_name', 'is_active', 'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function scopeActiveForBoard($query, string $boardKey = 'default')
    {
        return $query->where('board_key', $boardKey)
            ->where('is_active', true)
            ->orderBy('sort_order');
    }
}
```

> ไม่มี Model สำหรับ `ovst`/`patient`/`kskdepartment` แบบ Eloquent — ใช้ Query Builder ดิบผ่าน `DB::connection('hosxp')` ใน Service เพื่อป้องกันความเสี่ยง accidental save() ไปโดน HOSxP โดยสิ้นเชิง

---

## 4. Service Layer

### 4.1 `app/Services/HosxpQueueService.php`

```php
<?php

namespace App\Services;

use App\Models\TvClinicRoom;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

class HosxpQueueService
{
    /**
     * ดึงคิววันนี้จาก HOSxP เฉพาะห้องตรวจที่ active ตามที่ตั้งค่าไว้ใน app_db
     *
     * PDPA: ฟังก์ชันนี้เป็น "ขอบเขตสุดท้าย" ที่แตะข้อมูลผู้ป่วยดิบ (hn, fname, lname)
     * ห้ามส่งค่า hn หรือชื่อเต็มออกจากฟังก์ชันนี้เด็ดขาด — คืนกลับเฉพาะ oqueue และ
     * display_name ที่ผ่านการ mask แล้วเท่านั้น
     */
    public function getTodayQueue(string $boardKey = 'default'): Collection
    {
        $activeRooms = TvClinicRoom::activeForBoard($boardKey)->get()
            ->keyBy('hosxp_cur_dep');

        if ($activeRooms->isEmpty()) {
            return collect();
        }

        $curDeps = $activeRooms->keys()->all();

        $rows = DB::connection('hosxp')
            ->table('ovst as o')
            ->leftJoin('patient as p', 'p.hn', '=', 'o.hn')
            ->leftJoin('kskdepartment as k', 'k.depcode', '=', 'o.cur_dep')
            ->select([
                'p.fname', 'p.lname', 'p.pname',
                'o.oqueue', 'o.hn', 'k.department',
                'o.cur_dep', 'o.cur_dep_busy', // 'Y' = กำลังตรวจ, 'N' หรือ null = รอคิว (CHAR ไม่ใช่ int)
            ])
            ->whereDate('o.vstdate', now()->toDateString())
            ->where('o.main_dep', '002')
            ->whereIn('o.cur_dep', $curDeps)
            ->where('k.department', 'like', 'ห้องตรวจ%')
            ->orderBy('k.department')
            ->orderBy('o.oqueue')
            ->get();

        // แมปชื่อห้อง + mask ชื่อผู้ป่วย แล้ว "ทิ้ง" hn/ชื่อเต็มทันทีที่ map เสร็จ
        return $rows->map(function ($row) use ($activeRooms) {
            $room = $activeRooms->get($row->cur_dep);

            return (object) [
                'oqueue' => $row->oqueue,
                'display_name' => $this->maskThaiName($row->pname, $row->fname, $row->lname),
                'display_room_name' => $room?->display_name ?? $row->department,
                'sort_order' => $room?->sort_order ?? 999,
                // HOSxP v.3 เก็บ cur_dep_busy เป็น CHAR('Y'/'N'), ไม่ใช่ INT(1/0)
                'is_calling' => strtoupper(trim((string) $row->cur_dep_busy)) === 'Y',
            ];
            // ตั้งแต่บรรทัดนี้ไป object จะไม่มี hn, fname, lname, pname อยู่อีกต่อไป
        })->sortBy(['sort_order', 'oqueue'])->values();
    }

    /**
     * จัดกลุ่มคิวตามห้องตรวจ พร้อมข้อมูล "คิวปัจจุบันที่กำลังเรียก"
     * (cur_dep_busy = 'Y' ถือเป็นกำลังตรวจ) — คืนเฉพาะ oqueue + display_name (masked)
     * ตามหลัก PDPA data minimization
     */
    public function getQueueGroupedByRoom(string $boardKey = 'default'): Collection
    {
        return $this->getTodayQueue($boardKey)
            ->groupBy('display_room_name')
            ->map(function (Collection $queues) {
                $shape = fn ($q) => ['oqueue' => $q->oqueue, 'display_name' => $q->display_name];

                return [
                    'waiting' => $queues->where('is_calling', false)->map($shape)->values(),
                    'calling' => $queues->where('is_calling', true)->map($shape)->values(),
                ];
            });
    }

    /**
     * Mask ชื่อ-นามสกุลภาษาไทยตามหลัก PDPA
     * ตัวอย่าง: pname='นาย', fname='สมชาย', lname='ใจดี' => 'นายส***** ใจ**'
     * ตัวอย่างกรณีขึ้นต้นด้วยสระหน้า: fname='เกตุ', lname='แก้ว' => 'เก*** แก**'
     * (สระหน้า เ/แ/โ/ใ/ไ จะถูกดึงพยัญชนะตัวถัดไปมาโชว์คู่กันเสมอ ไม่ใช่โชว์สระตัวเดียวโดด ๆ)
     * เก็บอักขระที่มองเห็นได้ไว้ ส่วนที่เหลือแทนด้วย '*' (จำกัดสูงสุด 5 ตัว กัน string ยาวเกินจอ)
     */
    private function maskThaiName(?string $prefix, ?string $fname, ?string $lname): string
    {
        $prefix = trim((string) $prefix);
        $maskedFname = $this->maskWord(trim((string) $fname));
        $maskedLname = $this->maskWord(trim((string) $lname));

        return trim("{$prefix}{$maskedFname} {$maskedLname}");
    }

    private function maskWord(string $word): string
    {
        if ($word === '') {
            return '';
        }

        // สระนำหน้าภาษาไทย (เ, แ, โ, ใ, ไ) ไม่ใช่พยัญชนะ — ถ้าตัดโชว์แค่ตัวเดียวจะเหลือ
        // "เ*****" ซึ่งอ่านไม่รู้เรื่อง จึงต้องดึงพยัญชนะตัวถัดไปมาคู่กับสระเสมอ
        $leadingVowels = ['เ', 'แ', 'โ', 'ใ', 'ไ'];
        $firstChar = mb_substr($word, 0, 1);

        if (in_array($firstChar, $leadingVowels, true) && mb_strlen($word) > 1) {
            $visiblePrefix = mb_substr($word, 0, 2); // สระ + พยัญชนะตัวถัดไป เช่น 'เก'
            $rest = mb_substr($word, 2);
        } else {
            $visiblePrefix = mb_substr($word, 0, 1);
            $rest = mb_substr($word, 1);
        }

        $restLength = mb_strlen($rest);
        $maskLength = min(max($restLength, 1), 5); // จำกัดสูงสุด 5 ตัว กัน string ยาวเกินจอ

        return $visiblePrefix . str_repeat('*', $maskLength);
    }
}
```

> **หมายเหตุ PDPA:** `hn` ถูกใช้เฉพาะภายใน query join เพื่อดึงชื่อเท่านั้น และไม่เคยถูกแนบไปกับ object ที่ map ออกจากฟังก์ชัน `getTodayQueue()` เลย — ดังนั้นแม้ Controller หรือ View จะพยายามเรียก `$q->hn` ก็จะได้ `null`/error เท่านั้น ไม่มีทางรั่วไหลออกทาง JSON โดยไม่ตั้งใจ

---

## 5. Controllers

### 5.1 Admin — `app/Http/Controllers/Admin/TvDisplaySettingController.php`

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TvDisplaySetting;
use Illuminate\Http\Request;

class TvDisplaySettingController extends Controller
{
    public function edit(string $boardKey = 'default')
    {
        $setting = TvDisplaySetting::firstOrCreate(['board_key' => $boardKey]);
        return view('admin.tv.settings', compact('setting'));
    }

    public function update(Request $request, string $boardKey = 'default')
    {
        $data = $request->validate([
            'left_media_mode' => 'required|in:video,image_slider,rss_news',
            'left_panel_width_percent' => 'required|integer|min:20|max:60',
            'chime_enabled' => 'boolean',
            'tts_enabled' => 'boolean',
            'tts_voice_locale' => 'nullable|string|max:10',
            'rss_feed_url' => 'nullable|url',
            'queue_poll_seconds' => 'required|integer|min:3|max:60',
        ]);

        $data['right_panel_width_percent'] = 100 - $data['left_panel_width_percent'];
        $data['chime_enabled'] = $request->boolean('chime_enabled');
        $data['tts_enabled'] = $request->boolean('tts_enabled');

        $setting = TvDisplaySetting::firstOrCreate(['board_key' => $boardKey]);
        $setting->update($data);

        return redirect()
            ->route('admin.tv.settings.edit', $boardKey)
            ->with('status', 'บันทึกการตั้งค่าเรียบร้อย');
    }
}
```

### 5.2 Admin — `app/Http/Controllers/Admin/TvMediaPlaylistController.php`

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TvMediaPlaylist;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TvMediaPlaylistController extends Controller
{
    public function index(string $boardKey = 'default')
    {
        $items = TvMediaPlaylist::where('board_key', $boardKey)
            ->orderBy('sort_order')
            ->get();

        return view('admin.tv.playlist', compact('items', 'boardKey'));
    }

    public function store(Request $request, string $boardKey = 'default')
    {
        $data = $request->validate([
            'media_type' => 'required|in:video,image',
            'title' => 'nullable|string|max:255',
            'file' => 'required|file|mimes:mp4,jpg,jpeg,png,webp|max:102400', // 100MB
            'duration_seconds' => 'nullable|integer|min:3|max:300',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $path = $request->file('file')->store('tv-media', 'public');

        TvMediaPlaylist::create([
            'board_key' => $boardKey,
            'media_type' => $data['media_type'],
            'title' => $data['title'] ?? null,
            'file_path' => Storage::url($path),
            'duration_seconds' => $data['duration_seconds'] ?? 10,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => true,
        ]);

        return back()->with('status', 'เพิ่มสื่อเรียบร้อย');
    }

    public function toggle(TvMediaPlaylist $item)
    {
        $item->update(['is_active' => ! $item->is_active]);
        return back();
    }

    public function reorder(Request $request)
    {
        $data = $request->validate([
            'order' => 'required|array',
            'order.*' => 'integer|exists:tv_media_playlists,id',
        ]);

        foreach ($data['order'] as $index => $id) {
            TvMediaPlaylist::where('id', $id)->update(['sort_order' => $index]);
        }

        return response()->json(['ok' => true]);
    }

    public function destroy(TvMediaPlaylist $item)
    {
        if (str_starts_with($item->file_path, '/storage/')) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $item->file_path));
        }
        $item->delete();

        return back()->with('status', 'ลบสื่อเรียบร้อย');
    }
}
```

### 5.3 Admin — `app/Http/Controllers/Admin/TvClinicRoomController.php`

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TvClinicRoom;
use Illuminate\Http\Request;

class TvClinicRoomController extends Controller
{
    public function index(string $boardKey = 'default')
    {
        $rooms = TvClinicRoom::where('board_key', $boardKey)
            ->orderBy('sort_order')
            ->get();

        return view('admin.tv.rooms', compact('rooms', 'boardKey'));
    }

    public function store(Request $request, string $boardKey = 'default')
    {
        $data = $request->validate([
            'hosxp_cur_dep' => 'required|string|max:10',
            'display_name' => 'required|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        TvClinicRoom::updateOrCreate(
            ['board_key' => $boardKey, 'hosxp_cur_dep' => $data['hosxp_cur_dep']],
            [
                'display_name' => $data['display_name'],
                'sort_order' => $data['sort_order'] ?? 0,
                'is_active' => true,
            ]
        );

        return back()->with('status', 'เพิ่ม/แก้ไขห้องตรวจเรียบร้อย');
    }

    public function toggle(TvClinicRoom $room)
    {
        $room->update(['is_active' => ! $room->is_active]);
        return back();
    }

    public function destroy(TvClinicRoom $room)
    {
        $room->delete();
        return back()->with('status', 'ลบห้องตรวจเรียบร้อย');
    }
}
```

### 5.4 Public Display — `app/Http/Controllers/TvBoardController.php`

```php
<?php

namespace App\Http\Controllers;

use App\Models\TvDisplaySetting;
use App\Models\TvMediaPlaylist;
use App\Services\HosxpQueueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\View\View;

class TvBoardController extends Controller
{
    /** อายุ cache (วินาที) — สั้นพอที่จอยังดูสดอยู่ แต่กันการยิง query ซ้ำจากหลายจอ/หลาย client พร้อมกัน */
    private const QUEUE_CACHE_TTL = 3;

    public function __construct(private HosxpQueueService $queueService)
    {
    }

    public function show(string $boardKey = 'default'): View
    {
        $settings = TvDisplaySetting::firstOrCreate(['board_key' => $boardKey]);
        $media = TvMediaPlaylist::activeForBoard($boardKey)->get();

        return view('tv.board', compact('settings', 'media', 'boardKey'));
    }

    /**
     * Endpoint ที่ Alpine.js polling เรียกทุก N วินาที — คืน JSON เท่านั้น
     *
     * ป้องกัน HOSxP โหลดสูง: ใช้ Cache::remember ระยะสั้นมาก (3 วินาที) เพื่อให้ทุกจอ/ทุก
     * client ที่ poll เข้ามาพร้อมกันภายในหน้าต่างเวลานั้น "ใช้ผลลัพธ์เดียวกัน" แทนที่จะยิง
     * query ไป HOSxP ซ้ำต่อ request — สำคัญมากเมื่อมีหลายจอทีวีหรือมีคน refresh พร้อมกัน
     */
    public function queueData(string $boardKey = 'default'): JsonResponse
    {
        $grouped = Cache::remember(
            "tv-board:{$boardKey}:queue-data",
            self::QUEUE_CACHE_TTL,
            fn () => $this->queueService->getQueueGroupedByRoom($boardKey)
        );

        return response()->json([
            'generated_at' => now()->toIso8601String(),
            'rooms' => $grouped,
        ]);
    }
}
```

> **หมายเหตุ Cache driver:** ต้องตั้ง `CACHE_STORE=file` หรือ `CACHE_STORE=redis` ใน `.env` (ห้ามใช้ `array` เพราะ cache แบบ array อยู่ในหน่วยความจำต่อ request เท่านั้น ไม่แชร์ข้ามกัน ทำให้ cache ไม่ทำงานจริงตามที่ตั้งใจ) หากมีหลาย worker/หลาย process แนะนำ `redis` เพื่อความแน่นอนของการแชร์ cache ข้าม process

---

## 6. Routes

`routes/web.php` (เพิ่มท้ายไฟล์)

```php
use App\Http\Controllers\TvBoardController;
use App\Http\Controllers\Admin\TvDisplaySettingController;
use App\Http\Controllers\Admin\TvMediaPlaylistController;
use App\Http\Controllers\Admin\TvClinicRoomController;

// --- Public TV Display (ไม่ต้อง auth เพราะเปิดจากทีวีในเครือข่ายภายใน) ---
Route::get('/tv/{boardKey?}', [TvBoardController::class, 'show'])->name('tv.board');
Route::get('/tv/{boardKey}/queue-data', [TvBoardController::class, 'queueData'])->name('tv.board.data');

// --- Admin (ครอบ middleware auth เดิมของระบบ) ---
Route::middleware(['web', 'auth'])->prefix('admin/tv')->name('admin.tv.')->group(function () {
    Route::get('settings/{boardKey?}', [TvDisplaySettingController::class, 'edit'])->name('settings.edit');
    Route::put('settings/{boardKey?}', [TvDisplaySettingController::class, 'update'])->name('settings.update');

    Route::get('playlist/{boardKey?}', [TvMediaPlaylistController::class, 'index'])->name('playlist.index');
    Route::post('playlist/{boardKey?}', [TvMediaPlaylistController::class, 'store'])->name('playlist.store');
    Route::patch('playlist/{item}/toggle', [TvMediaPlaylistController::class, 'toggle'])->name('playlist.toggle');
    Route::post('playlist/reorder', [TvMediaPlaylistController::class, 'reorder'])->name('playlist.reorder');
    Route::delete('playlist/{item}', [TvMediaPlaylistController::class, 'destroy'])->name('playlist.destroy');

    Route::get('rooms/{boardKey?}', [TvClinicRoomController::class, 'index'])->name('rooms.index');
    Route::post('rooms/{boardKey?}', [TvClinicRoomController::class, 'store'])->name('rooms.store');
    Route::patch('rooms/{room}/toggle', [TvClinicRoomController::class, 'toggle'])->name('rooms.toggle');
    Route::delete('rooms/{room}', [TvClinicRoomController::class, 'destroy'])->name('rooms.destroy');
});
```

> ต้อง `php artisan storage:link` เพื่อให้ `Storage::url()` ของไฟล์วิดีโอ/รูปเข้าถึงได้จริง

---

## 7. TV Display View (หัวใจของระบบ)

### 7.0 Local Asset Pipeline (ห้ามใช้ CDN — โรงพยาบาลรัน Intranet)

ทีวี/เซิร์ฟเวอร์อยู่ในวง Intranet ที่ไม่มีทางออกอินเทอร์เน็ต จึงต้อง **build asset ไว้ล่วงหน้าตอน deploy** แล้ว serve จากโฮสต์ตัวเองเท่านั้น ห้ามอ้างอิง `cdn.tailwindcss.com` หรือ `cdn.jsdelivr.net` ในหน้า TV เด็ดขาด

**ขั้นตอน (รันบนเครื่อง build ที่มีอินเทอร์เน็ต แล้วค่อย deploy ไฟล์ที่ build แล้วเข้า server):**

```bash
npm install -D tailwindcss postcss autoprefixer
npm install alpinejs
```

`resources/css/tv-board.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body { font-family: 'Noto Sans Thai', 'Sarabun', sans-serif; overflow: hidden; }
@keyframes pulse-row { 0%,100%{background-color:#fef08a;} 50%{background-color:#fde047;} }
.row-calling { animation: pulse-row 1.2s ease-in-out infinite; }
[x-cloak] { display: none !important; }
```

`resources/js/tv-board.js`:
```js
import Alpine from 'alpinejs';

// หมายเหตุ: ฟังก์ชัน tvBoard(...) ประกาศอยู่ใน <script> ท้ายไฟล์
// resources/views/tv/board.blade.php โดยตรง (เป็น global function บน window
// อยู่แล้วเพราะ Blade render เป็น inline <script> ปกติ) — ไฟล์นี้จึง "ไม่" import
// หรือ re-declare tvBoard ซ้ำ เพื่อป้องกัน Vite build fail จากการ import ไฟล์ที่ไม่มีอยู่จริง
// (tv-board-app.js) และป้องกัน "duplicate function" ระหว่างสอง scope
window.Alpine = Alpine;
Alpine.start();
```

เพิ่ม entry ใน `vite.config.js` (ใช้ Vite pipeline เดิมของ Laravel):
```js
laravel({
    input: [
        'resources/css/app.css',
        'resources/js/app.js',
        'resources/css/tv-board.css',
        'resources/js/tv-board.js',
    ],
    refresh: true,
}),
```

รัน `npm run build` บนเครื่อง build → ได้ไฟล์ compiled ใน `public/build/assets/*` → **นำไฟล์ทั้งโฟลเดอร์ `public/build/` และ `manifest.json` ไป deploy เข้า server จริงพร้อมกับโค้ด** (ไม่ต้องมี internet บน server จริงเลย เพราะเป็น static asset ที่ build เสร็จแล้ว) ฟอนต์ Noto Sans Thai ให้ดาวน์โหลดไฟล์ `.woff2` มาวางไว้ที่ `public/fonts/` แล้ว `@font-face` ใน `tv-board.css` แทนการอ้าง Google Fonts

### 7.1 `resources/views/tv/board.blade.php`

```blade
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>จอแสดงคิวห้องตรวจ</title>
    {{-- ห้ามใช้ CDN: อ้างอิง asset ที่ build ไว้แล้วบนโฮสต์ตัวเองผ่าน Vite เท่านั้น --}}
    @vite(['resources/css/tv-board.css', 'resources/js/tv-board.js'])
</head>
<body class="bg-slate-900 text-white h-screen w-screen"
      x-data="tvBoard('{{ $boardKey }}', {{ $settings->queue_poll_seconds }}, {{ $settings->chime_enabled ? 'true' : 'false' }}, {{ $settings->tts_enabled ? 'true' : 'false' }})"
      x-init="init()">

    {{-- Audio Unlock Overlay: รีโมททีวี/เบราว์เซอร์ Android TV ส่วนใหญ่บล็อก autoplay เสียง
         จนกว่าจะมี user gesture ครั้งแรก จึงบังคับให้กดปุ่มนี้ก่อนเข้าสู่หน้าจอจริง --}}
    <div x-show="!audioUnlocked" x-cloak
         class="fixed inset-0 z-50 bg-black flex items-center justify-center cursor-pointer"
         @click="unlockAudio()">
        <div class="text-center px-8">
            <p class="text-5xl font-extrabold mb-6">📺 คลิกเพื่อเปิดระบบจอ</p>
            <p class="text-2xl text-slate-400">กดปุ่ม OK บนรีโมท หรือแตะหน้าจอ เพื่อเปิดใช้งานเสียงแจ้งเตือนคิว</p>
        </div>
    </div>

    <div class="flex h-screen w-screen" x-show="audioUnlocked" x-cloak>
        {{-- LEFT PANEL: Media --}}
        <div class="h-full overflow-hidden relative" style="width: {{ $settings->left_panel_width_percent }}%;">
            @if($settings->left_media_mode === 'video')
                <template x-if="media.length > 0">
                    <video :src="media[mediaIndex]?.file_path" autoplay muted loop
                           class="w-full h-full object-cover" @ended="nextMedia()"></video>
                </template>
            @elseif($settings->left_media_mode === 'image_slider')
                <template x-for="(item, idx) in media" :key="item.id">
                    <img :src="item.file_path" x-show="mediaIndex === idx"
                         class="w-full h-full object-cover absolute inset-0" x-transition.opacity.duration.700ms>
                </template>
            @else
                <div class="p-6 h-full flex flex-col">
                    <h2 class="text-3xl font-bold mb-4">📢 ข่าวสาร/ประกาศ</h2>
                    <div class="flex-1 overflow-hidden text-2xl leading-relaxed" x-html="rssHtml"></div>
                </div>
            @endif
        </div>

        {{-- RIGHT PANEL: Queue Board --}}
        <div class="h-full overflow-y-auto bg-slate-950 p-4"
             style="width: {{ $settings->right_panel_width_percent }}%;">
            <div class="flex items-center justify-between mb-4">
                <h1 class="text-4xl font-extrabold">🏥 คิวห้องตรวจวันนี้</h1>
                <span class="text-xl text-slate-400" x-text="clock"></span>
            </div>

            <div class="grid grid-cols-1 gap-4">
                <template x-for="(roomData, roomName) in rooms" :key="roomName">
                    <div class="bg-slate-800 rounded-xl p-4 shadow-lg">
                        <h2 class="text-2xl font-bold mb-2 text-sky-300" x-text="roomName"></h2>

                        <div class="mb-2">
                            <template x-for="q in roomData.calling" :key="roomName + '-calling-' + q.oqueue">
                                <div class="row-calling rounded-lg px-4 py-3 mb-1 text-slate-900 font-extrabold text-3xl flex justify-between">
                                    <span x-text="'กำลังตรวจ: คิว ' + q.oqueue"></span>
                                    <span x-text="q.display_name"></span>
                                </div>
                            </template>
                        </div>

                        <div class="grid grid-cols-3 gap-2">
                            <template x-for="q in roomData.waiting" :key="roomName + '-waiting-' + q.oqueue">
                                <div class="bg-slate-700 rounded-lg px-3 py-2 text-center text-xl font-semibold">
                                    <span x-text="q.oqueue"></span>
                                </div>
                            </template>
                        </div>

                        <p x-show="roomData.calling.length === 0 && roomData.waiting.length === 0"
                           class="text-slate-500 italic">ไม่มีคิวในขณะนี้</p>
                    </div>
                </template>
            </div>
        </div>
    </div>

    <script>
        function tvBoard(boardKey, pollSeconds, chimeEnabled, ttsEnabled) {
            return {
                boardKey, pollSeconds, chimeEnabled, ttsEnabled,
                rooms: {},
                media: @json($media),
                mediaIndex: 0,
                clock: '',
                rssHtml: '',
                lastCallingKeys: new Set(),
                pollTimer: null,
                mediaTimer: null,
                audioUnlocked: false,

                init() {
                    // จำสถานะ "ปลดล็อกเสียง" ด้วย sessionStorage (ไม่ใช่ localStorage)
                    // เหตุผล: ทีวี TCL ส่วนใหญ่ปิด-เปิดใหม่ทุกวัน ซึ่งรีเซ็ตสิทธิ์ autoplay
                    // audio ของเบราว์เซอร์ทุกครั้ง — ถ้าใช้ localStorage จอจะ "จำ" ว่าปลดล็อก
                    // แล้วข้าม Overlay ไปทั้งที่สิทธิ์จริงถูกรีเซ็ตไปแล้ว ทำให้เสียงใช้งานไม่ได้
                    // โดยไม่มีทางกลับมากดปุ่มปลดล็อกอีก จนกว่าจะมีคนรีเฟรชหน้าเอง
                    // sessionStorage จะหายไปเองเมื่อปิดแท็บ/ปิดเบราว์เซอร์ (เช่นตอนทีวีปิดเครื่อง)
                    // จึงบังคับให้ Overlay กลับมาแสดงใหม่ทุกครั้งที่เปิดทีวีขึ้นมา ตรงกับพฤติกรรมจริง
                    this.audioUnlocked = sessionStorage.getItem('tv_audio_unlocked') === '1';

                    this.fetchQueue();
                    this.pollTimer = setInterval(() => this.fetchQueue(), this.pollSeconds * 1000);
                    setInterval(() => this.updateClock(), 1000);
                    this.updateClock();
                    if (this.media.length > 0) this.startMediaRotation();
                },

                /**
                 * Web Audio บน Android TV/Google TV ส่วนใหญ่ต้องมี user gesture ก่อนเล่นเสียงได้
                 * ปุ่ม Overlay นี้คือ gesture แรกที่ "ปลดล็อก" ทั้ง HTMLAudioElement และ
                 * SpeechSynthesis (TTS) ให้เล่นอัตโนมัติได้ในครั้งถัดไปโดยไม่ต้องแตะจออีก
                 * (จนกว่าจะปิด-เปิดทีวีใหม่ ซึ่ง sessionStorage จะถูกล้างและบังคับกดใหม่)
                 */
                unlockAudio() {
                    this.audioUnlocked = true;
                    sessionStorage.setItem('tv_audio_unlocked', '1');

                    // เล่นเสียงเบา ๆ (volume 0) หนึ่งครั้งเพื่อ "ปลดล็อก" AudioContext ของเบราว์เซอร์
                    const unlock = new Audio('/sounds/chime.mp3');
                    unlock.volume = 0;
                    unlock.play().then(() => {
                        unlock.pause();
                        unlock.currentTime = 0;
                    }).catch(() => {});

                    // ปลดล็อก speechSynthesis ด้วย utterance เปล่าเสียงเบาสุด (ต้องมีการเล่นครั้งแรกจาก user gesture เช่นกัน)
                    if (this.ttsEnabled && 'speechSynthesis' in window) {
                        const warmup = new SpeechSynthesisUtterance(' ');
                        warmup.volume = 0;
                        window.speechSynthesis.speak(warmup);
                    }
                },

                async fetchQueue() {
                    try {
                        const res = await fetch(`/tv/${this.boardKey}/queue-data`, { cache: 'no-store' });
                        if (!res.ok) return;
                        const data = await res.json();
                        this.detectNewCalls(data.rooms);
                        this.rooms = data.rooms;
                    } catch (e) {
                        console.error('queue fetch failed', e);
                    }
                },

                detectNewCalls(newRooms) {
                    // ไม่มี hn ใน payload อีกต่อไป (PDPA) — ใช้ "ชื่อห้อง + เลขคิว" เป็น key แทน
                    const currentKeys = new Set();
                    Object.entries(newRooms).forEach(([roomName, r]) => {
                        r.calling.forEach(q => currentKeys.add(roomName + '-' + q.oqueue));
                    });
                    currentKeys.forEach(key => {
                        if (!this.lastCallingKeys.has(key)) {
                            this.announce();
                        }
                    });
                    this.lastCallingKeys = currentKeys;
                },

                announce() {
                    if (!this.audioUnlocked) return; // ยังไม่ผ่าน user gesture แรก — งดเล่นเสียงเพื่อไม่ให้ error รบกวน console
                    if (this.chimeEnabled) {
                        const audio = new Audio('/sounds/chime.mp3');
                        audio.play().catch(() => {});
                    }
                    // TTS ผูกกับข้อความจริงได้ที่นี่ถ้าต้องการอ่านชื่อ/เลขคิว (speechSynthesis ปลดล็อกแล้วจาก unlockAudio())
                },

                startMediaRotation() {
                    const item = this.media[this.mediaIndex];
                    const duration = (item?.media_type === 'image') ? (item.duration_seconds * 1000) : null;
                    if (duration) {
                        this.mediaTimer = setTimeout(() => this.nextMedia(), duration);
                    }
                    // video ใช้ @ended บน element แทน
                },

                nextMedia() {
                    clearTimeout(this.mediaTimer);
                    this.mediaIndex = (this.mediaIndex + 1) % this.media.length;
                    this.startMediaRotation();
                },

                updateClock() {
                    this.clock = new Date().toLocaleString('th-TH', {
                        dateStyle: 'full', timeStyle: 'medium'
                    });
                }
            };
        }
    </script>
</body>
</html>
```

**ข้อควรระวังสำหรับ Smart TV (Memory Leak):**
- ใช้ `setInterval`/`setTimeout` เดียวต่อฟังก์ชัน ไม่สร้างซ้อนกันทุกรอบ poll (โค้ดด้านบน `clearTimeout` ก่อนตั้งใหม่ทุกครั้ง)
- หลีกเลี่ยงการสร้าง DOM element สะสม (ใช้ `x-for` ของ Alpine ซึ่ง diff ไม่สะสม)
- แนะนำให้ตั้ง cron/ьคำสั่ง reload หน้าเว็บอัตโนมัติทุก 4-6 ชม. (เช่นผ่าน `setTimeout(() => location.reload(), 6*60*60*1000)`) เพื่อเคลียร์ memory สะสมจาก browser บน Android TV ที่มักไม่เสถียรเมื่อรันนาน ๆ

---

## 8. Admin Views (สรุปย่อ — โครงสร้างเดียวกันทั้ง 3 หน้า)

### 8.1 `resources/views/admin/tv/settings.blade.php`

```blade
@extends('layouts.admin')
@section('content')
<div class="max-w-2xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-4">ตั้งค่าจอแสดงผล ({{ $setting->board_key }})</h1>

    @if(session('status'))
        <div class="bg-green-100 text-green-800 p-3 rounded mb-4">{{ session('status') }}</div>
    @endif

    <form method="POST" action="{{ route('admin.tv.settings.update', $setting->board_key) }}">
        @csrf @method('PUT')

        <label class="block mb-2 font-semibold">โหมดสื่อฝั่งซ้าย</label>
        <select name="left_media_mode" class="border rounded p-2 w-full mb-4">
            @foreach(['video' => 'วิดีโอวนซ้ำ', 'image_slider' => 'สไลด์ภาพ', 'rss_news' => 'ข่าว/ประกาศตัววิ่ง'] as $val => $label)
                <option value="{{ $val }}" @selected($setting->left_media_mode === $val)>{{ $label }}</option>
            @endforeach
        </select>

        <label class="block mb-2 font-semibold">สัดส่วนฝั่งซ้าย (%)</label>
        <select name="left_panel_width_percent" class="border rounded p-2 w-full mb-4">
            @foreach([40, 45] as $pct)
                <option value="{{ $pct }}" @selected($setting->left_panel_width_percent == $pct)>
                    {{ $pct }}% / {{ 100 - $pct }}%
                </option>
            @endforeach
        </select>

        <label class="inline-flex items-center mb-4">
            <input type="checkbox" name="chime_enabled" value="1" @checked($setting->chime_enabled)>
            <span class="ml-2">เปิดเสียงเรียกคิว (Chime)</span>
        </label><br>

        <label class="inline-flex items-center mb-4">
            <input type="checkbox" name="tts_enabled" value="1" @checked($setting->tts_enabled)>
            <span class="ml-2">เปิดเสียงอ่านคิว (TTS)</span>
        </label>

        <label class="block mb-2 font-semibold">ความถี่ในการรีเฟรชคิว (วินาที)</label>
        <input type="number" name="queue_poll_seconds" value="{{ $setting->queue_poll_seconds }}"
               min="3" max="60" class="border rounded p-2 w-full mb-4">

        <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded">บันทึก</button>
    </form>
</div>
@endsection
```

### 8.2 `resources/views/admin/tv/rooms.blade.php` (โครงสร้าง — ตาราง CRUD + toggle)

```blade
@extends('layouts.admin')
@section('content')
<div class="max-w-4xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-4">จับคู่ห้องตรวจ HOSxP ↔ ชื่อที่แสดงบนทีวี</h1>

    <form method="POST" action="{{ route('admin.tv.rooms.store', $boardKey) }}" class="flex gap-2 mb-6">
        @csrf
        <input type="text" name="hosxp_cur_dep" placeholder="cur_dep เช่น 002" required class="border rounded p-2">
        <input type="text" name="display_name" placeholder="ชื่อที่แสดง" required class="border rounded p-2 flex-1">
        <input type="number" name="sort_order" placeholder="ลำดับ" class="border rounded p-2 w-24">
        <button class="bg-blue-600 text-white px-4 rounded">เพิ่ม</button>
    </form>

    <table class="w-full border">
        <thead class="bg-slate-100">
            <tr><th class="p-2">cur_dep</th><th>ชื่อที่แสดง</th><th>ลำดับ</th><th>สถานะ</th><th></th></tr>
        </thead>
        <tbody>
            @foreach($rooms as $room)
            <tr class="border-t">
                <td class="p-2">{{ $room->hosxp_cur_dep }}</td>
                <td>{{ $room->display_name }}</td>
                <td>{{ $room->sort_order }}</td>
                <td>
                    <form method="POST" action="{{ route('admin.tv.rooms.toggle', $room) }}">
                        @csrf @method('PATCH')
                        <button class="px-2 py-1 rounded {{ $room->is_active ? 'bg-green-200' : 'bg-red-200' }}">
                            {{ $room->is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
                        </button>
                    </form>
                </td>
                <td>
                    <form method="POST" action="{{ route('admin.tv.rooms.destroy', $room) }}"
                          onsubmit="return confirm('ยืนยันลบ?')">
                        @csrf @method('DELETE')
                        <button class="text-red-600">ลบ</button>
                    </form>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>
</div>
@endsection
```

### 8.3 `resources/views/admin/tv/playlist.blade.php` (โครงสร้าง — upload + reorder via Alpine + drag)

```blade
@extends('layouts.admin')
@section('content')
<div class="max-w-4xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-4">จัดการสื่อฝั่งซ้าย</h1>

    <form method="POST" action="{{ route('admin.tv.playlist.store', $boardKey) }}"
          enctype="multipart/form-data" class="mb-6 space-y-2">
        @csrf
        <select name="media_type" class="border rounded p-2">
            <option value="image">ภาพ</option>
            <option value="video">วิดีโอ</option>
        </select>
        <input type="text" name="title" placeholder="ชื่อสื่อ (ไม่บังคับ)" class="border rounded p-2">
        <input type="file" name="file" required accept=".mp4,.jpg,.jpeg,.png,.webp" class="border rounded p-2">
        <input type="number" name="duration_seconds" placeholder="วินาที (เฉพาะภาพ)" class="border rounded p-2 w-40">
        <button class="bg-blue-600 text-white px-4 py-2 rounded">อัปโหลด</button>
    </form>

    <table class="w-full border">
        <thead class="bg-slate-100">
            <tr><th class="p-2">ลำดับ</th><th>ประเภท</th><th>ชื่อ</th><th>ระยะเวลา</th><th>สถานะ</th><th></th></tr>
        </thead>
        <tbody>
            @foreach($items as $item)
            <tr class="border-t">
                <td class="p-2">{{ $item->sort_order }}</td>
                <td>{{ $item->media_type }}</td>
                <td>{{ $item->title ?? '-' }}</td>
                <td>{{ $item->duration_seconds }}s</td>
                <td>
                    <form method="POST" action="{{ route('admin.tv.playlist.toggle', $item) }}">
                        @csrf @method('PATCH')
                        <button class="px-2 py-1 rounded {{ $item->is_active ? 'bg-green-200' : 'bg-red-200' }}">
                            {{ $item->is_active ? 'เปิด' : 'ปิด' }}
                        </button>
                    </form>
                </td>
                <td>
                    <form method="POST" action="{{ route('admin.tv.playlist.destroy', $item) }}"
                          onsubmit="return confirm('ยืนยันลบ?')">
                        @csrf @method('DELETE')
                        <button class="text-red-600">ลบ</button>
                    </form>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>
</div>
@endsection
```

---

## 9. Public Asset

- วางไฟล์เสียงเรียกคิวที่ `public/sounds/chime.mp3` (สั้น 1-2 วินาที)
- ตรวจสอบว่า Google TV browser (Chromium-based) รองรับ `Audio().play()` แบบ autoplay-after-interaction — ทีวีจอสาธารณะมักไม่มี user gesture แรก จึงควรตั้งค่า **kiosk browser flag** `--autoplay-policy=no-user-gesture-required` หากใช้ Chrome kiosk app บน Android TV device

---

## 10. Deployment Checklist บน Smart TV (TCL Google TV)

1. ติดตั้งแอป **Fully Kiosk Browser** หรือ Chrome ในโหมด kiosk บนตัวทีวี/Android TV box
2. ตั้ง URL เริ่มต้น: `http://<server-ip>/tv/default`
3. ปิด screensaver/sleep บนทีวี, ตั้ง auto-start เมื่อเปิดเครื่อง
4. ตั้ง cron (server-side) หรือ JS-side reload ทุก 4-6 ชม. ตามข้อ 7 เพื่อลด memory leak สะสม
5. ทดสอบ `queue-data` endpoint ด้วย `curl http://<server-ip>/tv/default/queue-data` ก่อน deploy จริง
6. ตรวจสอบ firewall ระหว่าง Laravel server กับ HOSxP DB server (port 3306) — ต้องเปิดเฉพาะ read-only user
7. **ปิดโหมด Overscan บนทีวี TCL** — เข้า `Settings → Picture → Screen Mode` แล้วปรับจาก `Overscan`/`16:9 Auto` เป็น **`Just Scan`** หรือ **`Full`** เพื่อไม่ให้ทีวีตัดขอบภาพออกประมาณ 5% ต่อด้าน ซึ่งจะทำให้ตารางคิวหรือแถบสื่อฝั่งซ้ายที่ชิดขอบจอถูกครอบด้วยกรอบทีวีจนอ่านไม่ครบ (พบบ่อยในทีวี TCL รุ่น Google TV ที่ตั้งค่าโรงงานเป็น Overscan)

---

## 11. Testing Checklist

- [ ] Migration รันได้ถูก connection (`php artisan migrate --database=mysql`) — **ห้าม** รันโดยไม่ระบุ database หากมี default connection อื่นผิดพลาด
- [ ] ทดสอบ `HosxpReadOnlyServiceProvider` block คำสั่งเขียนจริง (เขียน unit test จำลอง `DB::connection('hosxp')->statement('DELETE ...')` แล้วคาด `RuntimeException`)
- [ ] ทดสอบ charset ภาษาไทยจากผลลัพธ์ `ptname`/`department` ไม่เพี้ยน
- [ ] ทดสอบ TV board บนความละเอียด 1920x1080 จริง (ไม่ใช่ DevTools emulate)
- [ ] ทดสอบเปิดค้าง 8-12 ชม. เฝ้าดู memory ผ่าน `chrome://memory-internals` หรือ remote debugging บน Android TV

---

## สรุปรายการไฟล์ทั้งหมดที่ต้องสร้าง

```
config/database.php                              (แก้ไข)
.env                                              (แก้ไข)
app/Providers/HosxpReadOnlyServiceProvider.php    (ใหม่)
database/migrations/2026_09_21_000001_*.php       (ใหม่)
database/migrations/2026_09_21_000002_*.php       (ใหม่)
database/migrations/2026_09_21_000003_*.php       (ใหม่)
database/seeders/TvBoardSeeder.php                (ใหม่)
app/Models/TvDisplaySetting.php                   (ใหม่)
app/Models/TvMediaPlaylist.php                    (ใหม่)
app/Models/TvClinicRoom.php                       (ใหม่)
app/Services/HosxpQueueService.php                (ใหม่)
app/Http/Controllers/TvBoardController.php        (ใหม่)
app/Http/Controllers/Admin/TvDisplaySettingController.php (ใหม่)
app/Http/Controllers/Admin/TvMediaPlaylistController.php  (ใหม่)
app/Http/Controllers/Admin/TvClinicRoomController.php     (ใหม่)
routes/web.php                                    (แก้ไข)
resources/css/tv-board.css                        (ใหม่ - local Tailwind, ไม่ใช้ CDN)
resources/js/tv-board.js                          (ใหม่ - local Alpine.js, ไม่ใช้ CDN)
vite.config.js                                     (แก้ไข - เพิ่ม entry tv-board)
public/fonts/NotoSansThai-*.woff2                 (ใหม่ - asset ฟอนต์ local)
resources/views/tv/board.blade.php                (ใหม่)
resources/views/admin/tv/settings.blade.php       (ใหม่)
resources/views/admin/tv/rooms.blade.php          (ใหม่)
resources/views/admin/tv/playlist.blade.php       (ใหม่)
public/sounds/chime.mp3                           (ใหม่ - asset)
```
