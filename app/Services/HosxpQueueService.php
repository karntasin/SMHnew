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
            $rows = $query
                ->leftJoin('opdscreen as s', 's.vn', '=', 'o.vn')
                ->leftJoin('er_regist as e', 'e.vn', '=', 'o.vn')
                ->leftJoin('opdscreen_patient_type as t', 't.opdscreen_patient_type_id', '=', 's.opdscreen_patient_type_id')
                ->leftJoin('er_emergency_level as l', 'l.er_emergency_level_id', '=', 'e.er_emergency_type')
                ->select([
                    'p.fname', 'p.lname', 'p.pname',
                    'o.oqueue', 'o.hn', 'o.vn', 'k.department',
                    'o.cur_dep', 'o.cur_dep_busy',
                    's.opdscreen_patient_type_id',
                    't.opdscreen_patient_type_name',
                    'l.er_emergency_level_name',
                    'e.er_emergency_type',
                    'e.er_emergency_level_id',
                    DB::raw('if(t.opdscreen_patient_type_name is not null, t.opdscreen_patient_type_name, if(l.er_emergency_level_name is not null, l.er_emergency_level_name, "ขาว")) as triage_color_name'),
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

        // Batch ตรวจสอบสถานะ LAB จาก lab_head (ยืนยันผลครบแล้ว vs รอผล)
        $allVns = $rows->pluck('vn')->filter()->unique()->all();
        $labStatusMap = $this->batchLabStatus(DB::connection('hosxp'), $allVns);

        // แมปชื่อห้อง + mask ชื่อผู้ป่วย แล้ว "ทิ้ง" hn/vn/ชื่อเต็มทันทีที่ map เสร็จ (PDPA)
        return $rows->map(function ($row) use ($activeRooms, $defaultRoom, $isEr, $erSetting, $labStatusMap) {
            $room = $activeRooms->get($row->cur_dep) ?? $defaultRoom;
            $triageInfo = $this->resolveTriageInfo($row, $erSetting);
            $lab = $labStatusMap[$row->vn] ?? null;

            $item = (object) [
                'oqueue' => $row->oqueue,
                'display_name' => $this->maskThaiName($row->pname, $row->fname, $row->lname),
                'display_room_name' => $room?->display_name ?? $row->department,
                'cur_dep' => $row->cur_dep,
                'sort_order' => $room?->sort_order ?? 999,
                // HOSxP v.3 เก็บ cur_dep_busy เป็น CHAR('Y'/'N'), ไม่ใช่ INT(1/0)
                'is_calling' => strtoupper(trim((string) $row->cur_dep_busy)) === 'Y',
                'triage_level' => $triageInfo['level'],
                'triage_name' => $triageInfo['short'],
                'triage_full_name' => $triageInfo['full_name'],
                'triage_color' => $triageInfo['color'],
                'lab_status' => $lab['status'] ?? null,
                'lab_status_text' => $lab['text'] ?? null,
            ];

            if ($isEr) {
                $item->triage_priority = $triageInfo['level'];
                $item->reg_datetime = $triageInfo['reg_datetime'];
                $item->target_minutes = (int) $triageInfo['target_minutes'];
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
                'triage_level' => $q->triage_level ?? null,
                'triage_name' => $q->triage_name ?? null,
                'triage_full_name' => $q->triage_full_name ?? null,
                'triage_color' => $q->triage_color ?? 'gray',
                'lab_status' => $q->lab_status ?? null,
                'lab_status_text' => $q->lab_status_text ?? null,
            ];

            if ($isEr) {
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
     * ดึงรายชื่อผู้ป่วยที่รอผลตรวจทางห้องปฏิบัติการ (LAB) และเอกซเรย์ (X-RAY) สำหรับจอคิวห้องตรวจ
     *
     * เงื่อนไข:
     * 1. ผู้ป่วยมารับบริการวันนี้ (vstdate = CURDATE()) ที่มี cur_dep หรือ main_dep ตรงกับห้องตรวจในบอร์ดนี้
     * 2. มีการสั่งตรวจ LAB (lab_head) หรือสั่งตรวจ X-RAY (xray_head / xray_report)
     * 3. ผลตรวจยังออกไม่ครบทั้งหมด (confirm_report != 'Y')
     * 4. เมื่อผลการตรวจทุกตัวออกครบแล้ว (confirm_report = 'Y' ทั้งหมด) -> ชื่อจะหายไปจากรายการนี้ทันที
     *
     * PDPA: คืนเฉพาะ oqueue + display_name (masked) เท่านั้น ไม่ส่ง hn/vn ออกไป
     */
    public function getPendingLabXrayPatients(string $boardKey = 'default'): array
    {
        $activeRooms = TvClinicRoom::activeForBoard($boardKey)->get()
            ->keyBy('hosxp_cur_dep');

        if ($activeRooms->isEmpty()) {
            return [];
        }

        $curDeps = $activeRooms->keys()->all();
        $today = now('Asia/Bangkok')->toDateString();
        $conn = DB::connection('hosxp');
        $defaultRoom = $activeRooms->first();

        // ดึงผู้ป่วยของคลินิกในวันนี้
        $query = $conn->table('ovst as o')
            ->leftJoin('patient as p', 'p.hn', '=', 'o.hn')
            ->leftJoin('kskdepartment as k', 'k.depcode', '=', 'o.cur_dep')
            ->leftJoin('opdscreen as s', 's.vn', '=', 'o.vn')
            ->leftJoin('er_regist as e', 'e.vn', '=', 'o.vn')
            ->leftJoin('opdscreen_patient_type as t', 't.opdscreen_patient_type_id', '=', 's.opdscreen_patient_type_id')
            ->leftJoin('er_emergency_level as l', 'l.er_emergency_level_id', '=', 'e.er_emergency_type')
            ->select([
                'p.fname', 'p.lname', 'p.pname',
                'o.oqueue', 'o.vn', 'o.cur_dep', 'o.main_dep',
                'o.vsttime', 'k.department',
                's.opdscreen_patient_type_id',
                't.opdscreen_patient_type_name',
                'l.er_emergency_level_name',
                'e.er_emergency_type',
                'e.er_emergency_level_id',
                DB::raw('if(t.opdscreen_patient_type_name is not null, t.opdscreen_patient_type_name, if(l.er_emergency_level_name is not null, l.er_emergency_level_name, "ขาว")) as triage_color_name'),
            ])
            ->whereDate('o.vstdate', $today)
            ->where(function ($q) use ($curDeps) {
                $q->whereIn('o.cur_dep', $curDeps)
                  ->orWhereIn('o.main_dep', $curDeps);
            });

        $rows = $query->orderBy('o.oqueue')->get();
        if ($rows->isEmpty()) {
            return [];
        }

        $vns = $rows->pluck('vn')->filter()->unique()->all();
        if (empty($vns)) {
            return [];
        }

        // 1. Batch ตรวจสอบ LAB จาก lab_head
        $labMap = [];
        try {
            $labRows = $conn->table('lab_head')
                ->whereIn('vn', $vns)
                ->select(['vn', 'confirm_report', 'order_time', 'order_date'])
                ->get();

            foreach ($labRows->groupBy('vn') as $vn => $items) {
                $total = $items->count();
                $confirmed = $items->filter(fn ($r) => strtoupper(trim((string) $r->confirm_report)) === 'Y')->count();
                $labMap[$vn] = [
                    'has' => true,
                    'total' => $total,
                    'confirmed' => $confirmed,
                    'is_all_confirmed' => $total > 0 && $confirmed >= $total,
                    'order_time' => $items->min('order_time'),
                ];
            }
        } catch (\Throwable $e) {
            // ignore
        }

        // 2. Batch ตรวจสอบ X-RAY จาก xray_head (และ fallback xray_report)
        $xrayMap = [];
        try {
            if (HosxpSchema::tableExists($conn, 'xray_head')) {
                $xrayRows = $conn->table('xray_head')
                    ->whereIn('vn', $vns)
                    ->select(['vn', 'confirm_report', 'order_time', 'order_date'])
                    ->get();

                foreach ($xrayRows->groupBy('vn') as $vn => $items) {
                    $total = $items->count();
                    $confirmed = $items->filter(fn ($r) => strtoupper(trim((string) $r->confirm_report)) === 'Y')->count();
                    $xrayMap[$vn] = [
                        'has' => true,
                        'total' => $total,
                        'confirmed' => $confirmed,
                        'is_all_confirmed' => $total > 0 && $confirmed >= $total,
                        'order_time' => $items->min('order_time'),
                    ];
                }
            } elseif (HosxpSchema::tableExists($conn, 'xray_report')) {
                $xrayRows = $conn->table('xray_report')
                    ->whereIn('vn', $vns)
                    ->select(['vn', 'confirm', 'confirm_read_film', 'request_time'])
                    ->get();

                foreach ($xrayRows->groupBy('vn') as $vn => $items) {
                    $total = $items->count();
                    $confirmed = $items->filter(fn ($r) => strtoupper(trim((string) $r->confirm)) === 'Y' || strtoupper(trim((string) $r->confirm_read_film)) === 'Y')->count();
                    $xrayMap[$vn] = [
                        'has' => true,
                        'total' => $total,
                        'confirmed' => $confirmed,
                        'is_all_confirmed' => $total > 0 && $confirmed >= $total,
                        'order_time' => $items->min('request_time'),
                    ];
                }
            }
        } catch (\Throwable $e) {
            // ignore
        }

        $pendingPatients = [];

        foreach ($rows as $row) {
            $vn = $row->vn;
            $lab = $labMap[$vn] ?? ['has' => false, 'is_all_confirmed' => true, 'order_time' => null];
            $xray = $xrayMap[$vn] ?? ['has' => false, 'is_all_confirmed' => true, 'order_time' => null];

            $hasLab = $lab['has'];
            $hasXray = $xray['has'];

            // ถ้าไม่มีการสั่งตรวจทั้ง Lab และ X-ray -> ข้าม
            if (!$hasLab && !$hasXray) {
                continue;
            }

            $labConfirmed = $hasLab && $lab['is_all_confirmed'];
            $xrayConfirmed = $hasXray && $xray['is_all_confirmed'];

            // "ชื่อจะหายไป เมื่อผลออกเรียบร้อยทุกตัวแล้ว"
            // ถ้าสั่ง Lab อย่างเดียว แล้ว Lab เสร็จแล้ว -> หายไป (ข้าม)
            // ถ้าสั่ง Xray อย่างเดียว แล้ว Xray เสร็จแล้ว -> หายไป (ข้าม)
            // ถ้าสั่งทั้งคู่ แล้วเสร็จทั้งคู่ -> หายไป (ข้าม)
            $allDone = (!$hasLab || $labConfirmed) && (!$hasXray || $xrayConfirmed);
            if ($allDone) {
                continue;
            }

            // สถานะข้อความกำกับ
            $statusText = match (true) {
                $hasLab && !$labConfirmed && $hasXray && !$xrayConfirmed => 'รอผล Lab + X-ray',
                $hasLab && !$labConfirmed && $hasXray && $xrayConfirmed => 'รอผล Lab (X-ray เสร็จแล้ว)',
                $hasLab && $labConfirmed && $hasXray && !$xrayConfirmed => 'รอผล X-ray (Lab เสร็จแล้ว)',
                $hasLab && !$labConfirmed => 'รอผล Lab',
                $hasXray && !$xrayConfirmed => 'รอผล X-ray',
                default => 'รอผลตรวจ',
            };

            $room = $activeRooms->get($row->cur_dep) ?? $activeRooms->get($row->main_dep) ?? $defaultRoom;
            $triageInfo = $this->resolveTriageInfo($row, null);

            // คำนวณเวลารอคอยโดยประมาณ
            $orderTime = $lab['order_time'] ?? $xray['order_time'] ?? $row->vsttime;
            $waitedMinutes = 0;
            if ($orderTime) {
                try {
                    $orderCarbon = \Carbon\Carbon::parse("{$today} {$orderTime}", 'Asia/Bangkok');
                    $waitedMinutes = max(0, (int) $orderCarbon->diffInMinutes(now('Asia/Bangkok')));
                } catch (\Throwable $e) {}
            }

            $pendingPatients[] = [
                'oqueue' => $row->oqueue,
                'display_name' => $this->maskThaiName($row->pname, $row->fname, $row->lname),
                'display_room_name' => $room?->display_name ?? $row->department ?? 'ห้องตรวจ',
                'cur_dep' => $row->cur_dep,
                'triage_level' => $triageInfo['level'],
                'triage_name' => $triageInfo['short'],
                'triage_color' => $triageInfo['color'],
                'has_lab' => $hasLab,
                'lab_status' => $hasLab ? ($labConfirmed ? 'confirmed' : 'pending') : 'none',
                'has_xray' => $hasXray,
                'xray_status' => $hasXray ? ($xrayConfirmed ? 'confirmed' : 'pending') : 'none',
                'status_text' => $statusText,
                'order_time' => $orderTime ? substr((string) $orderTime, 0, 5) : null,
                'waited_minutes' => $waitedMinutes,
            ];
        }

        // เรียงลำดับตามหมายเลขคิว
        usort($pendingPatients, fn ($a, $b) => $a['oqueue'] <=> $b['oqueue']);

        return $pendingPatients;
    }

    /**
     * ดึงข้อมูลผู้ป่วยรอซักประวัติ / คัดกรอง (cur_dep = '002' จุดคัดกรองห้องตรวจโรคภายนอก)
     * สำหรับหน้าจอรอซักประวัติบน TV คิวห้องตรวจ
     *
     * PDPA: คืนเฉพาะ oqueue + display_name (masked) เท่านั้น ไม่ส่ง hn/vn/ชื่อเต็มออกไป
     */
    public function getPendingScreeningPatients(string $boardKey = 'default'): array
    {
        $today = now('Asia/Bangkok')->toDateString();
        $conn = DB::connection('hosxp');

        try {
            $query = $conn->table('ovst as o')
                ->leftJoin('patient as p', 'p.hn', '=', 'o.hn')
                ->leftJoin('oapp as oa', function ($join) use ($today) {
                    $join->on('oa.visit_vn', '=', 'o.vn')
                        ->orWhere(function ($q) use ($today) {
                            $q->on('oa.hn', '=', 'o.hn')
                                ->whereDate('oa.nextdate', '=', $today);
                        });
                })
                ->select([
                    'o.vn', 'o.hn', 'o.oqueue', 'o.vstdate', 'o.vsttime', 'o.cur_dep', 'o.cur_dep_busy',
                    'p.pname', 'p.fname', 'p.lname',
                    'oa.oapp_id', 'oa.lab_list_text', 'oa.xray_list_text', 'oa.app_cause', 'oa.note'
                ])
                ->whereDate('o.vstdate', $today)
                ->where('o.cur_dep', '002')
                ->orderBy('o.oqueue', 'asc');

            $allRows = $query->get();
            if ($allRows->isEmpty()) {
                return [];
            }

            // จัดกลุ่มตาม vn เพื่อป้องกันกรณีคนไข้มีหลาย oapp
            $rows = $allRows->groupBy('vn')->map(function ($items) {
                $first = $items->first();
                $first->oapp_id = $items->pluck('oapp_id')->filter()->first();
                $first->lab_list_text = $items->pluck('lab_list_text')->filter()->join(', ');
                $first->xray_list_text = $items->pluck('xray_list_text')->filter()->join(', ');
                return $first;
            })->values();

            $vns = $rows->pluck('vn')->filter()->unique()->values()->all();

            $labVns = [];
            $xrayVns = [];

            if (!empty($vns)) {
                try {
                    if (HosxpSchema::tableExists($conn, 'lab_head')) {
                        $labVns = $conn->table('lab_head')
                            ->whereIn('vn', $vns)
                            ->pluck('vn')
                            ->unique()
                            ->toArray();
                    }
                    if (HosxpSchema::tableExists($conn, 'xray_head')) {
                        $xrayVns = $conn->table('xray_head')
                            ->whereIn('vn', $vns)
                            ->pluck('vn')
                            ->unique()
                            ->toArray();
                    }
                } catch (\Throwable $e) {
                    // ignore
                }
            }

            $pendingPatients = [];
            foreach ($rows as $row) {
                $isAppointment = !empty($row->oapp_id);
                $hasLab = !empty($row->lab_list_text) || in_array($row->vn, $labVns);
                $hasXray = !empty($row->xray_list_text) || in_array($row->vn, $xrayVns);

                $waitedMinutes = 0;
                if ($row->vsttime) {
                    try {
                        $vstCarbon = \Carbon\Carbon::parse("{$today} {$row->vsttime}", 'Asia/Bangkok');
                        $waitedMinutes = max(0, (int) $vstCarbon->diffInMinutes(now('Asia/Bangkok')));
                    } catch (\Throwable $e) {}
                }

                $status = (strtoupper(trim((string) $row->cur_dep_busy)) === 'Y') ? 'calling' : 'waiting';

                $pendingPatients[] = [
                    'oqueue' => $row->oqueue,
                    'display_name' => $this->maskThaiName($row->pname, $row->fname, $row->lname),
                    'is_appointment' => $isAppointment,
                    'has_lab' => $hasLab,
                    'has_xray' => $hasXray,
                    'lab_list_text' => $row->lab_list_text ? trim($row->lab_list_text) : null,
                    'xray_list_text' => $row->xray_list_text ? trim($row->xray_list_text) : null,
                    'status' => $status,
                    'vsttime' => $row->vsttime ? substr((string) $row->vsttime, 0, 5) : null,
                    'waited_minutes' => $waitedMinutes,
                ];
            }

            // เรียงลำดับ: คิวที่กำลังเรียกขึ้นก่อน แล้วตามด้วยหมายเลขคิว
            usort($pendingPatients, function ($a, $b) {
                if ($a['status'] === 'calling' && $b['status'] !== 'calling') return -1;
                if ($a['status'] !== 'calling' && $b['status'] === 'calling') return 1;
                return $a['oqueue'] <=> $b['oqueue'];
            });

            return $pendingPatients;

        } catch (\Throwable $e) {
            \Log::error('getPendingScreeningPatients error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * ดึงข้อมูล ER แบบ 3 Section สำหรับจอแสดงผลใหม่
     *
     * Section 1: รอคัดกรอง (cur_dep = 003)
     * Section 2: คิวรอตรวจ (cur_dep = 063, service5 ว่าง) — แยกตามสี triage
     * Section 3: กำลังตรวจรักษา (cur_dep = 063, service5 ไม่ว่าง) — แสดงสถานะ lab/xray
     *
     * PDPA: คืนเฉพาะ oqueue + display_name (masked) เท่านั้น ไม่ส่ง hn/vn/ชื่อเต็มออกไป
     */
    public function getErSections(): array
    {
        $erSetting = \App\Models\TvDisplaySetting::where('board_key', '003')->first();
        $today = now('Asia/Bangkok')->toDateString();
        $conn = DB::connection('hosxp');

        // --- Section 1: รอคัดกรอง (cur_dep = 003 และยังไม่ได้คัดกรอง/ยังไม่จำหน่าย) ---
        $screeningQuery = $conn->table('ovst as o')
            ->leftJoin('patient as p', 'p.hn', '=', 'o.hn')
            ->leftJoin('er_regist as e', 'e.vn', '=', 'o.vn')
            ->leftJoin('opdscreen as s', 's.vn', '=', 'o.vn')
            ->select([
                'p.pname', 'p.fname', 'p.lname', 'o.oqueue', 'o.vsttime', 'o.cur_dep',
                'e.finish_time', 'e.er_dch_type', 'e.er_leave_status_id',
                'e.er_screen', 'e.enter_er_time', 'e.er_emergency_type', 'e.er_emergency_level_id',
                'e.doctor_tx_time', 's.opdscreen_patient_type_id',
            ])
            ->whereDate('o.vstdate', $today)
            ->where('o.cur_dep', '003')
            ->orderBy('o.vsttime')
            ->get();

        $screening = $screeningQuery->filter(function ($row) {
            // 1. ตัดออกทันทีหากจำหน่ายแล้ว/ตรวจเสร็จแล้ว
            $hasFinishTime = !empty($row->finish_time)
                && !str_starts_with((string) $row->finish_time, '1899')
                && !str_starts_with((string) $row->finish_time, '0000');
            $hasDchType = !empty($row->er_dch_type);
            $hasLeaveStatus = !empty($row->er_leave_status_id);
            if ($hasFinishTime || $hasDchType || $hasLeaveStatus || trim((string) $row->cur_dep) === '999') {
                return false;
            }

            // 2. ตัดออกหากผ่านการคัดกรองแล้ว (er_screen='Y', มี enter_er_time, มีระดับฉุกเฉิน, เริ่มตรวจแล้ว หรือย้ายเข้า 063)
            $isScreened = strtoupper(trim((string) ($row->er_screen ?? ''))) === 'Y'
                || (!empty($row->enter_er_time) && !str_starts_with((string) $row->enter_er_time, '1899') && !str_starts_with((string) $row->enter_er_time, '0000'))
                || !empty($row->er_emergency_type)
                || !empty($row->er_emergency_level_id)
                || !empty($row->opdscreen_patient_type_id)
                || (!empty($row->doctor_tx_time) && !str_starts_with((string) $row->doctor_tx_time, '1899') && !str_starts_with((string) $row->doctor_tx_time, '0000'))
                || trim((string) $row->cur_dep) === '063';

            return !$isScreened;
        })->map(fn ($row) => [
            'oqueue' => $row->oqueue,
            'display_name' => $this->maskThaiName($row->pname, $row->fname, $row->lname),
        ])->values()->all();

        // --- Section 2 + 3: ห้องฉุกเฉิน (cur_dep in ('063', '003') ที่ผ่านการคัดกรองแล้ว) ---
        $erRows = $conn->table('ovst as o')
            ->leftJoin('patient as p', 'p.hn', '=', 'o.hn')
            ->leftJoin('opdscreen as s', 's.vn', '=', 'o.vn')
            ->leftJoin('er_regist as e', 'e.vn', '=', 'o.vn')
            ->leftJoin('opdscreen_patient_type as t', 't.opdscreen_patient_type_id', '=', 's.opdscreen_patient_type_id')
            ->leftJoin('er_emergency_level as l', 'l.er_emergency_level_id', '=', 'e.er_emergency_type')
            ->leftJoin('service_time as st', 'st.vn', '=', 'o.vn')
            ->select([
                'p.pname', 'p.fname', 'p.lname',
                'o.oqueue', 'o.vn', 'o.vstdate', 'o.vsttime', 'o.cur_dep',
                'e.enter_er_time', 'e.finish_time', 'e.doctor_tx_time',
                'e.er_dch_type', 'e.er_leave_status_id',
                'e.er_screen',
                'e.er_emergency_type', 'e.er_emergency_level_id',
                's.opdscreen_patient_type_id',
                't.opdscreen_patient_type_name',
                'l.er_emergency_level_name',
                DB::raw('if(t.opdscreen_patient_type_name is not null, t.opdscreen_patient_type_name, if(l.er_emergency_level_name is not null, l.er_emergency_level_name, "ขาว")) as triage_color_name'),
                'st.service5',
            ])
            ->whereDate('o.vstdate', $today)
            ->whereIn('o.cur_dep', ['003', '063'])
            ->orderBy('o.oqueue')
            ->get();

        // กรอง: เอาออกคนที่จำหน่ายแล้ว (finish_time, er_dch_type, er_leave_status_id, cur_dep = 999)
        // และต้องเป็นคนที่ผ่านการคัดกรองแล้วเท่านั้น (หากยังไม่คัดกรองจะอยู่ใน Section 1)
        $erRows = $erRows->filter(function ($row) {
            $hasFinishTime = !empty($row->finish_time)
                && !str_starts_with((string) $row->finish_time, '1899')
                && !str_starts_with((string) $row->finish_time, '0000');
            $hasDchType = !empty($row->er_dch_type);
            $hasLeaveStatus = !empty($row->er_leave_status_id);
            if ($hasFinishTime || $hasDchType || $hasLeaveStatus || trim((string) $row->cur_dep) === '999') {
                return false;
            }

            // ตรวจสอบว่าผ่านการคัดกรองแล้วหรือยัง
            $isScreened = trim((string) $row->cur_dep) === '063'
                || strtoupper(trim((string) ($row->er_screen ?? ''))) === 'Y'
                || (!empty($row->enter_er_time) && !str_starts_with((string) $row->enter_er_time, '1899') && !str_starts_with((string) $row->enter_er_time, '0000'))
                || !empty($row->er_emergency_type)
                || !empty($row->er_emergency_level_id)
                || !empty($row->opdscreen_patient_type_id)
                || (!empty($row->doctor_tx_time) && !str_starts_with((string) $row->doctor_tx_time, '1899') && !str_starts_with((string) $row->doctor_tx_time, '0000'));

            return $isScreened;
        });

        $allErVns = $erRows->pluck('vn')->filter()->unique()->all();

        // Batch query ตรวจสอบเงื่อนไขย้ายเข้าข้อ 3 (กำลังตรวจรักษา):
        // 1. สั่งตรวจ LAB (lab_head)
        $labVns = !empty($allErVns) ? $conn->table('lab_head')
            ->whereIn('vn', $allErVns)
            ->pluck('vn')
            ->flip()
            ->all() : [];

        // 2. สั่งตรวจ X-ray (xray_head)
        $xrayVns = !empty($allErVns) ? $conn->table('xray_head')
            ->whereIn('vn', $allErVns)
            ->pluck('vn')
            ->flip()
            ->all() : [];

        // 3. ลงผลวินิจฉัยโรค (ovstdiag)
        $diagVns = !empty($allErVns) ? $conn->table('ovstdiag')
            ->whereIn('vn', $allErVns)
            ->pluck('vn')
            ->flip()
            ->all() : [];

        // 4. ลงหัตถการ (er_regist_oper / doctor_operation)
        $operErVns = !empty($allErVns) ? $conn->table('er_regist_oper')
            ->whereIn('vn', $allErVns)
            ->pluck('vn')
            ->flip()
            ->all() : [];

        $operDocVns = !empty($allErVns) ? $conn->table('doctor_operation')
            ->whereIn('vn', $allErVns)
            ->pluck('vn')
            ->flip()
            ->all() : [];

        $waiting = [];
        $treating = [];

        foreach ($erRows as $row) {
            $vn = $row->vn;
            $svc5 = trim((string) ($row->service5 ?? ''));
            $hasService5 = $svc5 !== '' && !str_starts_with($svc5, '0000');
            $hasLab = isset($labVns[$vn]);
            $hasXray = isset($xrayVns[$vn]);
            $hasDiag = isset($diagVns[$vn]);
            $hasOper = isset($operErVns[$vn]) || isset($operDocVns[$vn]);
            $hasDocTx = !empty($row->doctor_tx_time)
                && !str_starts_with((string) $row->doctor_tx_time, '1899')
                && !str_starts_with((string) $row->doctor_tx_time, '0000');

            $isTreating = $hasService5 || $hasLab || $hasXray || $hasDiag || $hasOper || $hasDocTx;
            $triageInfo = $this->resolveTriageInfo($row, $erSetting);

            if ($isTreating) {
                // Section 3: กำลังตรวจรักษา (เข้าเงื่อนไขข้อใดข้อหนึ่ง)
                $statusText = match (true) {
                    $hasLab && $hasXray => 'รอผล Lab + X-ray',
                    $hasLab => 'รอผล Lab',
                    $hasXray => 'รอผล X-ray',
                    $hasOper => 'ทำหัตถการ',
                    $hasDiag => 'ตรวจวินิจฉัยแล้ว',
                    $hasDocTx => 'แพทย์กำลังตรวจ',
                    default => 'กำลังตรวจรักษา',
                };

                $treating[] = [
                    'oqueue' => $row->oqueue,
                    'display_name' => $this->maskThaiName($row->pname, $row->fname, $row->lname),
                    'triage_level' => $triageInfo['level'],
                    'triage_color' => $triageInfo['color'],
                    'triage_name' => $triageInfo['short'],
                    'status_text' => $statusText,
                ];
            } else {
                // Section 2: คิวรอตรวจ (ยังไม่เริ่มตรวจ/ไม่มี lab, xray, diag, oper)
                $waiting[] = [
                    'oqueue' => $row->oqueue,
                    'display_name' => $this->maskThaiName($row->pname, $row->fname, $row->lname),
                    'triage_level' => $triageInfo['level'],
                    'triage_name' => $triageInfo['short'],
                    'triage_full_name' => $triageInfo['full_name'],
                    'triage_color' => $triageInfo['color'],
                    'reg_datetime' => $triageInfo['reg_datetime'],
                    'target_minutes' => $triageInfo['target_minutes'],
                ];
            }
        }

        // จัดกลุ่มรอตรวจตามระดับ triage (1→5)
        $waitingGrouped = collect($waiting)
            ->groupBy('triage_level')
            ->sortKeys()
            ->map(function ($items, $level) {
                $first = $items->first();

                return [
                    'level' => (int) $level,
                    'label' => $first['triage_full_name'] ?? '',
                    'short' => $first['triage_name'] ?? '',
                    'color' => $first['triage_color'] ?? 'gray',
                    'patients' => $items->map(fn ($p) => [
                        'oqueue' => $p['oqueue'],
                        'display_name' => $p['display_name'],
                        'reg_datetime' => $p['reg_datetime'] ?? null,
                        'target_minutes' => $p['target_minutes'] ?? 60,
                    ])->values()->all(),
                ];
            })->values()->all();

        return [
            'screening' => $screening,
            'waiting_grouped' => $waitingGrouped,
            'treating' => $treating,
        ];
    }

    /**
     * แยก logic การหาระดับ triage + เวลาลงทะเบียน ER ออกมาเป็น helper
     * (ใช้ร่วมกันระหว่าง getTodayQueue และ getErSections)
     */
    private function resolveTriageInfo($row, $erSetting): array
    {
        $color = trim((string) ($row->triage_color_name ?? 'ขาว'));
        $erLevelName = trim((string) ($row->er_emergency_level_name ?? ''));
        $erType = (int) ($row->er_emergency_type ?: $row->er_emergency_level_id);
        $ptTypeId = (int) ($row->opdscreen_patient_type_id ?? 0);

        $level = match (true) {
            str_contains($color, 'แดง') || str_contains($erLevelName, 'Resuscitate') || str_contains($erLevelName, 'กู้ชีพ') || $ptTypeId === 1 || $erType === 1 => 1,
            str_contains($color, 'ส้ม') || str_contains($erLevelName, 'Emergency') || str_contains($erLevelName, 'ฉุกเฉิน') || $ptTypeId === 2 || $erType === 2 => 2,
            str_contains($color, 'เหลือง') || (str_contains($erLevelName, 'Urgency') && !str_contains($erLevelName, 'Non') && !str_contains($erLevelName, 'Semi')) || $ptTypeId === 3 || $erType === 3 => 3,
            str_contains($color, 'เขียว') || str_contains($erLevelName, 'Semi') || (str_contains($erLevelName, 'ด่วน') && !str_contains($erLevelName, 'ด่วนมาก')) || $ptTypeId === 4 || $erType === 4 => 4,
            default => 5,
        };

        $info = match ($level) {
            1 => ['name' => 'วิกฤต / ฉุกเฉิน (ทันที)', 'short' => 'แดง', 'color' => 'red'],
            2 => ['name' => 'เร่งด่วน', 'short' => 'ส้ม', 'color' => 'orange'],
            3 => ['name' => 'ด่วนมาก', 'short' => 'เหลือง', 'color' => 'yellow'],
            4 => ['name' => 'ทั่วไป / ไม่เร่งด่วน', 'short' => 'เขียว', 'color' => 'green'],
            5 => ['name' => 'รอได้', 'short' => 'ขาว', 'color' => 'white'],
        };

        $targetMinutes = match ($level) {
            1 => $erSetting?->er_triage_target_1 ?? 0,
            2 => $erSetting?->er_triage_target_2 ?? 15,
            3 => $erSetting?->er_triage_target_3 ?? 30,
            4 => $erSetting?->er_triage_target_4 ?? 60,
            5 => $erSetting?->er_triage_target_5 ?? 120,
            default => 120,
        };

        // เวลาเข้า ER
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

        return [
            'level' => $level,
            'full_name' => $info['name'],
            'short' => $info['short'],
            'color' => $info['color'],
            'target_minutes' => (int) $targetMinutes,
            'reg_datetime' => $regDatetime,
        ];
    }

    /**
     * Batch ตรวจสอบสถานะ LAB / X-ray จาก lab_head, xray_head
     * คืน map [vn => status_text] — ไม่ expose vn ออกนอก service layer
     */
    private function batchLabXrayStatus($conn, array $vns): array
    {
        if (empty($vns)) {
            return [];
        }

        $labVns = $conn->table('lab_head')
            ->whereIn('vn', $vns)
            ->groupBy('vn')
            ->pluck('vn')
            ->flip()
            ->all();

        $xrayVns = $conn->table('xray_head')
            ->whereIn('vn', $vns)
            ->groupBy('vn')
            ->pluck('vn')
            ->flip()
            ->all();

        $result = [];
        foreach ($vns as $vn) {
            $hasLab = isset($labVns[$vn]);
            $hasXray = isset($xrayVns[$vn]);

            if ($hasLab && $hasXray) {
                $result[$vn] = 'รอผล Lab + X-ray';
            } elseif ($hasLab) {
                $result[$vn] = 'รอผล Lab';
            } elseif ($hasXray) {
                $result[$vn] = 'รอผล X-ray';
            } else {
                $result[$vn] = 'กำลังตรวจรักษา';
            }
        }

        return $result;
    }

    /**
     * Batch ตรวจสอบสถานะผล LAB จาก lab_head สำหรับคิวห้องตรวจ
     * ตรวจสอบว่ายืนยันผลครบทุกใบสั่ง (confirm_report = 'Y') หรือยังรอผล
     * คืน map [vn => ['status' => 'confirmed'|'pending', 'text' => '...']]
     */
    private function batchLabStatus($conn, array $vns): array
    {
        if (empty($vns)) {
            return [];
        }

        $labRows = $conn->table('lab_head')
            ->whereIn('vn', $vns)
            ->select(['vn', 'confirm_report'])
            ->get();

        if ($labRows->isEmpty()) {
            return [];
        }

        $grouped = $labRows->groupBy('vn');
        $result = [];

        foreach ($grouped as $vn => $items) {
            $total = $items->count();
            $confirmed = $items->filter(function ($r) {
                return strtoupper(trim((string) $r->confirm_report)) === 'Y';
            })->count();

            if ($total > 0 && $confirmed >= $total) {
                $result[$vn] = [
                    'status' => 'confirmed',
                    'text' => 'ผล Lab ออกแล้ว',
                ];
            } elseif ($total > 0) {
                $result[$vn] = [
                    'status' => 'pending',
                    'text' => 'รอผล Lab',
                ];
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
