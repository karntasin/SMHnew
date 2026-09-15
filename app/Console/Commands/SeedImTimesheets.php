<?php

namespace App\Console\Commands;

use App\Models\Im\Timesheet;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SeedImTimesheets extends Command
{
    protected $signature = 'im:seed-timesheets {--fresh : ลบ Timesheet ของรายชื่อชุดนี้ก่อนสร้างใหม่}';

    protected $description = 'สร้างบันทึกกิจกรรม IT ย้อนหลัง 10 ปี ตามหน้าที่เจ้าหน้าที่ 4 คน (วันทำการ)';

    /** @var list<array{name: string, needle: string, role: string, pool: list<array{category: string, activity: string, note?: string}>}> */
    private array $staff = [
        [
            'name' => 'จ.ส.อ.กานต์ กานตะศิลป์',
            'needle' => 'กานตะศิลป์',
            'role' => 'พัฒนาโปรแกรมและดูแล HOSxP',
            'pool' => [
                ['category' => 'พัฒนาโปรแกรม', 'activity' => 'พัฒนา/ปรับปรุงโปรแกรมระบบโรงพยาบาล', 'note' => 'เขียนโค้ดตามความต้องการหน่วยงาน'],
                ['category' => 'พัฒนาโปรแกรม', 'activity' => 'แก้ไขบั๊กและทดสอบระบบหลังอัปเดต', 'note' => 'ทดสอบบนเครื่องทดลองก่อนขึ้นใช้งานจริง'],
                ['category' => 'HOSxP', 'activity' => 'ดูแลระบบ HOSxP และแก้ปัญหาการใช้งาน', 'note' => 'สนับสนุนผู้ใช้และตรวจสอบ log ระบบ'],
                ['category' => 'HOSxP', 'activity' => 'จัดทำรายงาน/ชุดข้อมูลจากฐาน HOSxP', 'note' => 'ดึงข้อมูลตามที่หน่วยงานร้องขอ'],
                ['category' => 'ฐานข้อมูล', 'activity' => 'สำรองและตรวจสอบฐานข้อมูล HOSxP', 'note' => 'ตรวจไฟล์ backup และพื้นที่ดิสก์'],
                ['category' => 'HOSxP', 'activity' => 'เชื่อมโยงข้อมูล HOSxP กับระบบอื่น', 'note' => 'ตรวจสอบ API / interface'],
                ['category' => 'พัฒนาโปรแกรม', 'activity' => 'ประชุมรับความต้องการโปรแกรมกับหน่วยงาน', 'note' => 'บันทึก requirement เพื่อพัฒนาต่อ'],
                ['category' => 'HOSxP', 'activity' => 'อัปเดตแพตช์และดูแลสิทธิ์ผู้ใช้ HOSxP', 'note' => 'ทบทวนสิทธิ์ตามตำแหน่งงาน'],
            ],
        ],
        [
            'name' => 'นาย เกรียงไกร เกิดทะโสม',
            'needle' => 'เกิดทะโสม',
            'role' => 'ถ่ายภาพกิจกรรมของหน่วย',
            'pool' => [
                ['category' => 'ถ่ายภาพกิจกรรม', 'activity' => 'ถ่ายภาพกิจกรรมหน่วยงาน/โรงพยาบาล', 'note' => 'บันทึกภาพงานประชุม อบรม และกิจกรรม'],
                ['category' => 'ถ่ายภาพกิจกรรม', 'activity' => 'คัดเลือกและจัดเก็บไฟล์ภาพกิจกรรม', 'note' => 'แยกโฟลเดอร์ตามหน่วยงานและวันที่'],
                ['category' => 'สื่อประชาสัมพันธ์', 'activity' => 'ตัดต่อภาพ/วิดีโอกิจกรรมเพื่อประชาสัมพันธ์', 'note' => 'ส่งไฟล์ให้หน่วยงานเจ้าของกิจกรรม'],
                ['category' => 'ถ่ายภาพกิจกรรม', 'activity' => 'เตรียมกล้องและอุปกรณ์ถ่ายภาพก่อนออกงาน', 'note' => 'ชาร์จแบต ตรวจเมมโมรี่และขาตั้ง'],
                ['category' => 'สื่อประชาสัมพันธ์', 'activity' => 'ออกแบบสื่อภาพกิจกรรมของหน่วย', 'note' => 'ทำปกอัลบั้ม/ภาพประกอบรายงาน'],
                ['category' => 'ถ่ายภาพกิจกรรม', 'activity' => 'ถ่ายภาพพิธี/ประชุมสำคัญตามวาระ', 'note' => 'ประสานเจ้าภาพเรื่องจุดถ่ายและเวลา'],
            ],
        ],
        [
            'name' => 'นางสาว วิลัยรัตน์ มิดจังหรีด',
            'needle' => 'มิดจังหรีด',
            'role' => 'IT Support และเตรียมห้องประชุม',
            'pool' => [
                ['category' => 'IT Support', 'activity' => 'ให้บริการ IT Support แก้ไขคอมพิวเตอร์หน่วยงาน', 'note' => 'ลงพื้นที่ตามใบแจ้งซ่อม'],
                ['category' => 'IT Support', 'activity' => 'ติดตั้งโปรแกรม ปริ้นเตอร์ และอุปกรณ์ต่อพ่วง', 'note' => 'ตั้งค่าไดรเวอร์และทดสอบพิมพ์'],
                ['category' => 'ห้องประชุม', 'activity' => 'เตรียมห้องประชุม (โปรเจคเตอร์ ไมค์ เสียง อินเทอร์เน็ต)', 'note' => 'ทดสอบภาพ-เสียงก่อนเริ่มประชุม'],
                ['category' => 'ห้องประชุม', 'activity' => 'ดูแลระบบประชุมออนไลน์และเชื่อมต่อจอ', 'note' => 'เปิดห้อง Zoom/Meet และทดสอบไมค์'],
                ['category' => 'IT Support', 'activity' => 'สร้างบัญชีผู้ใช้และกำหนดสิทธิ์เข้าใช้ระบบ', 'note' => 'ตามบันทึกขอเปิดสิทธิ์จากหน่วยงาน'],
                ['category' => 'IT Support', 'activity' => 'แก้ปัญหาเครือข่าย/อินเทอร์เน็ตจุดใช้งาน', 'note' => 'ตรวจสาย LAN จุดปลายทาง'],
                ['category' => 'ห้องประชุม', 'activity' => 'เก็บอุปกรณ์ห้องประชุมหลังใช้งาน', 'note' => 'ปิดเครื่องฉายและจัดสายให้เรียบร้อย'],
            ],
        ],
        [
            'name' => 'นาย ภูมิพัฒน์ มูลกัญญา',
            'needle' => 'มูลกัญญา',
            'role' => 'ช่วยถ่ายภาพและ IT Support',
            'pool' => [
                ['category' => 'ถ่ายภาพกิจกรรม', 'activity' => 'ช่วยถ่ายภาพกิจกรรมหน่วยงาน', 'note' => 'สนับสนุนงานถ่ายภาพร่วมกับทีม'],
                ['category' => 'ถ่ายภาพกิจกรรม', 'activity' => 'ช่วยจัดเก็บและคัดไฟล์ภาพจากงานกิจกรรม', 'note' => 'คัดภาพที่ใช้ได้และสำรองไฟล์'],
                ['category' => 'IT Support', 'activity' => 'ให้บริการ IT Support ตามหน่วยงาน', 'note' => 'แก้ไขเครื่องคอมพิวเตอร์เบื้องต้น'],
                ['category' => 'IT Support', 'activity' => 'ติดตั้ง/ย้ายเครื่องคอมพิวเตอร์และอุปกรณ์', 'note' => 'จัดโต๊ะ จุดเครือข่าย และทดสอบเปิดเครื่อง'],
                ['category' => 'IT Support', 'activity' => 'ช่วยเตรียมเครื่องฉายและจอสำหรับห้องประชุม', 'note' => 'ตั้งค่าภาพและทดสอบสัญญาณ'],
                ['category' => 'IT Support', 'activity' => 'ลงโปรแกรมพื้นฐานและอัปเดตระบบปฏิบัติการ', 'note' => 'ติดตั้งชุดสำนักงานและโปรแกรมต้านไวรัส'],
            ],
        ],
    ];

    public function handle(): int
    {
        $names = array_column($this->staff, 'name');
        $from = Carbon::today()->subYears(10)->startOfDay();
        $to = Carbon::today()->endOfDay();

        Timesheet::query()
            ->whereIn('staff_name', $names)
            ->whereBetween('work_date', [$from->toDateString(), $to->toDateString()])
            ->delete();
        if ($this->option('fresh')) {
            $this->warn('ลบ Timesheet เดิมของเจ้าหน้าที่ 4 คนในช่วง 10 ปีแล้ว');
        }

        $users = [];
        foreach ($this->staff as $person) {
            $users[$person['name']] = User::query()->where('name', 'like', '%'.$person['needle'].'%')->first();
        }

        $rows = [];
        $now = now();
        $cursor = $from->copy();
        while ($cursor->lte($to)) {
            if ($cursor->isWeekend()) {
                $cursor->addDay();
                continue;
            }

            foreach ($this->staff as $person) {
                $key = $person['name'].'|'.$cursor->toDateString();
                if ((abs(crc32($key.'|skip')) % 8) === 0) {
                    continue;
                }

                $slots = $this->slotCount($key);
                $hoursLeft = 6 + (abs(crc32($key.'|hrs')) % 3); // 6-8
                $usedActivities = [];
                for ($i = 0; $i < $slots; $i++) {
                    $pool = $person['pool'];
                    $idx = abs(crc32($key.'|act|'.$i)) % count($pool);
                    if (isset($usedActivities[$idx]) && count($usedActivities) < count($pool)) {
                        $idx = ($idx + 1) % count($pool);
                    }
                    $usedActivities[$idx] = true;
                    $item = $pool[$idx];
                    $remainSlots = $slots - $i;
                    $hours = $remainSlots === 1
                        ? $hoursLeft
                        : max(1, min($hoursLeft - ($remainSlots - 1), 1 + (abs(crc32($key.'|h|'.$i)) % 4)));
                    $hoursLeft = round($hoursLeft - $hours, 1);
                    if ($hours <= 0) {
                        continue;
                    }

                    $rows[] = [
                        'user_id' => $users[$person['name']]?->id,
                        'staff_name' => $person['name'],
                        'work_date' => $cursor->toDateString(),
                        'hours' => $hours,
                        'category' => $item['category'],
                        'activity' => $item['activity'],
                        'note' => $item['note'] ?? null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }

            $cursor->addDay();
        }

        $inserted = 0;
        foreach (array_chunk($rows, 500) as $chunk) {
            DB::table('im_timesheets')->insert($chunk);
            $inserted += count($chunk);
        }

        $this->info('ช่วง '.$from->toDateString().' ถึง '.$to->toDateString().' · สร้าง '.$inserted.' รายการ');
        $this->table(
            ['เจ้าหน้าที่', 'บทบาท', 'จำนวนรายการ', 'ชั่วโมงรวม'],
            collect($this->staff)->map(function ($person) {
                return [
                    $person['name'],
                    $person['role'],
                    Timesheet::query()->where('staff_name', $person['name'])->count(),
                    round((float) Timesheet::query()->where('staff_name', $person['name'])->sum('hours'), 1),
                ];
            })->all()
        );

        return self::SUCCESS;
    }

    private function slotCount(string $key): int
    {
        $roll = abs(crc32($key.'|slots')) % 10;
        if ($roll < 6) {
            return 1;
        }
        if ($roll < 9) {
            return 2;
        }

        return 3;
    }
}
