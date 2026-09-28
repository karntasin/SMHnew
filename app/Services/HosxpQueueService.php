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
        $isEr = in_array(strtolower(trim($boardKey)), ['003', 'er', 'tv-er']);
        $erSetting = null;

        $query = DB::connection('hosxp')
            ->table('ovst as o')
            ->leftJoin('patient as p', 'p.hn', '=', 'o.hn')
            ->leftJoin('kskdepartment as k', 'k.depcode', '=', 'o.cur_dep');

        if ($isEr) {
            $erSetting = \App\Models\TvDisplaySetting::where('board_key', '003')->first();

            $rows = $query
                ->leftJoin('opdscreen as s', 's.vn', '=', 'o.vn')
                ->leftJoin('er_regist as e', 'e.vn', '=', 'o.vn')
                ->leftJoin('opdscreen_patient_type as t', 't.opdscreen_patient_type_id', '=', 's.opdscreen_patient_type_id')
                ->leftJoin('er_emergency_level as l', 'l.er_emergency_level_id', '=', 'e.er_emergency_type')
                ->select([
                    'p.fname', 'p.lname', 'p.pname',
                    'o.oqueue', 'o.hn', 'o.vn', 'k.department',
                    'o.cur_dep', 'o.cur_dep_busy',
                    'o.vstdate', 'o.vsttime',
                    'e.enter_er_time',
                    'e.finish_time',
                    'e.er_dch_type',
                    'e.er_leave_status_id',
                    'e.er_emergency_type',
                    'e.er_emergency_level_id',
                    's.opdscreen_patient_type_id',
                    't.opdscreen_patient_type_name',
                    'l.er_emergency_level_name',
                    DB::raw('if(t.opdscreen_patient_type_name is not null, t.opdscreen_patient_type_name, if(l.er_emergency_level_name is not null, l.er_emergency_level_name, "ขาว")) as triage_color_name'),
                ])
                ->whereDate('o.vstdate', now('Asia/Bangkok')->toDateString())
                ->where('o.cur_dep', '003')
                ->orderBy('o.oqueue')
                ->get();
        } else {
            $rows = $query->select([
                    'p.fname', 'p.lname', 'p.pname',
                    'o.oqueue', 'o.hn', 'k.department',
                    'o.cur_dep', 'o.cur_dep_busy',
                ])
                ->whereDate('o.vstdate', now('Asia/Bangkok')->toDateString())
                ->whereIn('o.cur_dep', $curDeps)
                ->orderBy('k.department')
                ->orderBy('o.oqueue')
                ->get();
        }

        $defaultRoom = $activeRooms->first();

        // คัดกรองเฉพาะผู้ป่วยที่ยังคงอยู่ในห้องฉุกเฉิน (cur_dep = '003') และยังตรวจไม่เสร็จ/ยังไม่จำหน่าย
        // หากผู้ป่วยย้ายไปแผนกอื่น (cur_dep != 003) หรือตรวจเสร็จแล้ว (มี finish_time, er_dch_type หรือ er_leave_status_id) ให้เอาออกจากคิว ER ทันที
        if ($isEr) {
            $rows = $rows->filter(function ($row) {
                if (trim((string) $row->cur_dep) !== '003') {
                    return false;
                }

                $hasFinishTime = !empty($row->finish_time) && !str_starts_with((string) $row->finish_time, '1899') && !str_starts_with((string) $row->finish_time, '0000');
                $hasDchType = !empty($row->er_dch_type);
                $hasLeaveStatus = !empty($row->er_leave_status_id);

                return !$hasFinishTime && !$hasDchType && !$hasLeaveStatus;
            });
        }

        // แมปชื่อห้อง + mask ชื่อผู้ป่วย แล้ว "ทิ้ง" hn/ชื่อเต็มทันทีที่ map เสร็จ
        return $rows->map(function ($row) use ($activeRooms, $defaultRoom, $isEr, $erSetting) {
            $room = $activeRooms->get($row->cur_dep) ?? $defaultRoom;

            $item = (object) [
                'oqueue' => $row->oqueue,
                'display_name' => $this->maskThaiName($row->pname, $row->fname, $row->lname),
                'display_room_name' => $room?->display_name ?? $row->department,
                'cur_dep' => $row->cur_dep,
                'sort_order' => $room?->sort_order ?? 999,
                // HOSxP v.3 เก็บ cur_dep_busy เป็น CHAR('Y'/'N'), ไม่ใช่ INT(1/0)
                'is_calling' => strtoupper(trim((string) $row->cur_dep_busy)) === 'Y',
            ];

            if ($isEr) {
                $color = trim((string) ($row->triage_color_name ?? 'ขาว'));
                $erLevelName = trim((string) ($row->er_emergency_level_name ?? ''));
                $erType = (int) ($row->er_emergency_type ?: $row->er_emergency_level_id);
                $ptTypeId = (int) ($row->opdscreen_patient_type_id ?? 0);

                // Triage Level (1-5): แดง (1), ส้ม (2), เหลือง (3), เขียว (4), ขาว (5)
                $level = match (true) {
                    str_contains($color, 'แดง') || str_contains($erLevelName, 'Resuscitate') || str_contains($erLevelName, 'กู้ชีพ') || $ptTypeId === 1 || $erType === 1 => 1,
                    str_contains($color, 'ส้ม') || str_contains($erLevelName, 'Emergency') || str_contains($erLevelName, 'ฉุกเฉิน') || $ptTypeId === 2 || $erType === 2 => 2,
                    str_contains($color, 'เหลือง') || (str_contains($erLevelName, 'Urgency') && !str_contains($erLevelName, 'Non') && !str_contains($erLevelName, 'Semi')) || $ptTypeId === 3 || $erType === 3 => 3,
                    str_contains($color, 'เขียว') || str_contains($erLevelName, 'Semi') || (str_contains($erLevelName, 'ด่วน') && !str_contains($erLevelName, 'ด่วนมาก')) || $ptTypeId === 4 || $erType === 4 => 4,
                    default => 5, // 'ขาว', 'Non Urgency', 'รอได้' หรือค่าเริ่มต้น
                };

                $triageInfo = match($level) {
                    1 => ['name' => 'กู้ชีพ (แดง)', 'short' => 'แดง', 'color' => 'red', 'priority' => 1],
                    2 => ['name' => 'ฉุกเฉินเร่งด่วน (ส้ม)', 'short' => 'ส้ม', 'color' => 'orange', 'priority' => 2],
                    3 => ['name' => 'ด่วนมาก (เหลือง)', 'short' => 'เหลือง', 'color' => 'yellow', 'priority' => 3],
                    4 => ['name' => 'ด่วน (เขียว)', 'short' => 'เขียว', 'color' => 'green', 'priority' => 4],
                    5 => ['name' => 'รอได้ (ขาว)', 'short' => 'ขาว', 'color' => 'white', 'priority' => 5],
                };

                // เวลาที่ผู้ป่วยเข้า ER (ใช้ enter_er_time ถ้ามี ไม่เช่นนั้นใช้ vstdate + vsttime) ใน Timezone Asia/Bangkok
                $regDatetime = null;
                $tz = 'Asia/Bangkok';
                if (!empty($row->enter_er_time) && !str_starts_with((string) $row->enter_er_time, '1899') && !str_starts_with((string) $row->enter_er_time, '0000')) {
                    $rawTime = trim((string) $row->enter_er_time);
                    if (!str_contains($rawTime, '-') && !empty($row->vstdate)) {
                        $rawTime = "{$row->vstdate} {$rawTime}";
                    }
                    $regDatetime = \Carbon\Carbon::parse($rawTime, $tz)->toIso8601String();
                } elseif (!empty($row->vstdate) && !empty($row->vsttime)) {
                    $regDatetime = \Carbon\Carbon::parse("{$row->vstdate} {$row->vsttime}", $tz)->toIso8601String();
                }

                $targetMinutes = match($level) {
                    1 => $erSetting?->er_triage_target_1 ?? 0,
                    2 => $erSetting?->er_triage_target_2 ?? 15,
                    3 => $erSetting?->er_triage_target_3 ?? 30,
                    4 => $erSetting?->er_triage_target_4 ?? 60,
                    5 => $erSetting?->er_triage_target_5 ?? 120,
                    default => 120,
                };

                $item->triage_level = $level;
                $item->triage_name = $triageInfo['short'];
                $item->triage_full_name = $triageInfo['name'];
                $item->triage_color = $triageInfo['color'];
                $item->triage_priority = $triageInfo['priority'];
                $item->reg_datetime = $regDatetime;
                $item->target_minutes = (int) $targetMinutes;
            }

            return $item;
        })->sort(function ($a, $b) use ($isEr) {
            if ($a->sort_order !== $b->sort_order) {
                return $a->sort_order <=> $b->sort_order;
            }
            if ($isEr) {
                // สำหรับ ER ให้เรียงตามระดับความฉุกเฉินก่อน (กู้ชีพ -> ฉุกเฉิน -> ด่วนมาก -> ด่วน -> รอได้)
                $priA = $a->triage_priority ?? 99;
                $priB = $b->triage_priority ?? 99;
                if ($priA !== $priB) {
                    return $priA <=> $priB;
                }
            }
            return $a->oqueue <=> $b->oqueue;
        })->values();
    }

    /**
     * จัดกลุ่มคิวตามห้องตรวจ พร้อมข้อมูล "คิวปัจจุบันที่กำลังเรียก"
     * (cur_dep_busy = 'Y' ถือเป็นกำลังตรวจ) — คืนเฉพาะ oqueue + display_name (masked)
     * ตามหลัก PDPA data minimization
     */
    public function getQueueGroupedByRoom(string $boardKey = 'default'): Collection
    {
        $activeRooms = TvClinicRoom::activeForBoard($boardKey)->get();
        $isEr = in_array(strtolower(trim($boardKey)), ['003', 'er', 'tv-er']);
        $todayQueues = $this->getTodayQueue($boardKey)->groupBy('display_room_name');

        $shape = function ($q) use ($isEr) {
            $data = [
                'oqueue' => $q->oqueue,
                'display_name' => $q->display_name,
            ];

            if ($isEr) {
                $data['triage_level'] = $q->triage_level ?? null;
                $data['triage_name'] = $q->triage_name ?? null;
                $data['triage_full_name'] = $q->triage_full_name ?? null;
                $data['triage_color'] = $q->triage_color ?? 'gray';
                $data['reg_datetime'] = $q->reg_datetime ?? null;
                $data['target_minutes'] = $q->target_minutes ?? 60;
            }

            return $data;
        };

        $result = collect();

        // 1. นำห้องที่เปิดใช้งานทั้งหมดมาเป็นโครงหลัก เพื่อให้แสดงครบทุกคอลัมน์เสมอ (แม้ยังไม่มีคิว)
        foreach ($activeRooms as $room) {
            $queues = $todayQueues->get($room->display_name, collect());
            $result->put($room->display_name, [
                'cur_dep' => $room->hosxp_cur_dep,
                'waiting' => $queues->where('is_calling', false)->map($shape)->values(),
                'calling' => $queues->where('is_calling', true)->map($shape)->values(),
            ]);
        }

        // 2. เผื่อกรณีมีคิวที่ display_room_name ไม่ตรงกับ activeRooms (Fallback)
        foreach ($todayQueues as $roomName => $queues) {
            if (!$result->has($roomName)) {
                $result->put($roomName, [
                    'cur_dep' => $queues->first()->cur_dep ?? null,
                    'waiting' => $queues->where('is_calling', false)->map($shape)->values(),
                    'calling' => $queues->where('is_calling', true)->map($shape)->values(),
                ]);
            }
        }

        return $result;
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
