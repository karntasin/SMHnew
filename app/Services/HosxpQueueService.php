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
        $fname = trim((string) $fname); // ชื่อเต็ม ไม่ต้อง mask ตามที่ร้องขอ
        $lname = trim((string) $lname);

        $maskedLname = \App\Support\PiiMask::surname($lname);

        return trim("{$prefix}{$fname} {$maskedLname}");
    }
}
