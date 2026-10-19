<?php

namespace App\Services;

use App\Models\TvClinicRoom;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class QueuePortalService
{
    /**
     * สถานะคิวหนึ่งเลขของวันนี้ ไม่ส่ง hn, vn, ชื่อ หรือนามสกุล
     *
     * @return array<string, mixed>|null
     */
    public function statusForQueue(string $oqueue): ?array
    {
        $needle = $this->normalizeOqueue($oqueue);
        if ($needle === null) {
            return null;
        }

        $cacheKey = 'queue-portal:'.now('Asia/Bangkok')->toDateString().':'.$needle;

        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return $cached;
        }

        $status = $this->loadStatus($needle);
        if ($status !== null) {
            Cache::put($cacheKey, $status, now()->addSeconds((int) config('queue_portal.cache_seconds', 3)));
        }

        return $status;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function loadStatus(string $needle): ?array
    {
        $conn = DB::connection('hosxp');
        $today = now('Asia/Bangkok')->toDateString();
        $row = $this->findVisit($conn, $today, $needle);
        if ($row === null) {
            return null;
        }

        $curDep = trim((string) ($row->cur_dep ?? ''));
        $mainDep = trim((string) ($row->main_dep ?? ''));
        $isCalling = $this->isCalling($row->cur_dep_busy ?? null);
        $roomName = $this->roomName($curDep, $row->department ?? null);
        $mainRoom = $this->roomName($mainDep, $row->main_department ?? null);
        $vn = (string) $row->vn;
        $screened = $this->hasOpdscreen($conn, $vn);

        $lab = $this->orderStatus($conn, 'lab_head', $vn);
        $xray = $this->xrayStatus($conn, $vn);
        $paid = $this->isPaid($conn, $vn);
        $pharmacy = $this->pharmacyForVisit($conn, $today, $row);
        $atPharmacy = $curDep === (string) config('queue_portal.pharmacy_dep', '013');
        $atScreening = $curDep === (string) config('queue_portal.screening_dep', '002');
        $atFinance = $this->isFinanceDepartment($roomName);
        $displayRoom = $roomName !== '' ? $roomName : 'ห้องตรวจ';
        $contact = $this->contactText($screened, $mainDep, $displayRoom, $mainRoom);

        $remaining = 0;
        $onBoard = true;
        if (! $screened && $mainDep === '002') {
            $position = $this->opdScreeningPosition($conn, $today, $vn);
            $onBoard = $position['on_board'];
            $isCalling = $position['calling'];
            $remaining = $position['remaining'];
        } elseif (! $screened && $mainDep === '003') {
            $position = $this->erScreeningPosition($conn, $today, $vn);
            $onBoard = $position['on_board'];
            $isCalling = $position['calling'];
            $remaining = $position['remaining'];
        } elseif ($pharmacy['stage'] === 'prepare' || $pharmacy['stage'] === 'ready') {
            $remaining = $this->pharmacyRemaining($conn, $today, $row->oqueue, $pharmacy['stage'], $isCalling);
        } elseif ($pharmacy['stage'] !== 'done' && $curDep !== '') {
            $remaining = $this->roomRemaining($conn, $today, $curDep, $row->oqueue, $isCalling);
        }

        if (! $onBoard) {
            $isCalling = false;
            $remaining = null;
        } elseif ($screened) {
            $isCalling = $isCalling && $pharmacy['stage'] !== 'done';
        }

        $doctorDone = $atPharmacy || $atFinance || in_array($pharmacy['stage'], ['prepare', 'ready', 'done'], true);
        $paymentDone = $paid || $atPharmacy || in_array($pharmacy['stage'], ['prepare', 'ready', 'done'], true);

        $steps = [
            $this->step('register', 'ลงทะเบียน', 'done', 'ลงทะเบียนแล้ว'),
            $screened
                ? $this->step('screening', 'ซักประวัติ', 'done', 'ซักประวัติแล้ว')
                : $this->step('screening', 'ซักประวัติ', 'current', $contact),
            $this->orderStep('lab', 'ตรวจทางห้องปฏิบัติการ', $lab),
            $this->orderStep('xray', 'เอกซเรย์', $xray),
            $this->doctorStep($doctorDone, $atScreening, $isCalling && ! $atPharmacy && ! $atFinance),
            $this->paymentStep($paymentDone, $atFinance && ! $paid),
            $this->pharmacyStep($pharmacy['stage']),
        ];

        return [
            'oqueue' => trim((string) $row->oqueue),
            'room_name' => $displayRoom,
            'contact_text' => $contact,
            'screened' => $screened,
            'is_calling' => $isCalling,
            'remaining' => $remaining,
            'pharmacy_stage' => $pharmacy['stage'],
            'pharmacy_text' => $pharmacy['text'],
            'steps' => $steps,
        ];
    }

    private function findVisit($conn, string $today, string $needle): ?object
    {
        $query = $conn->table('ovst as o')
            ->leftJoin('kskdepartment as k', 'k.depcode', '=', 'o.cur_dep')
            ->leftJoin('kskdepartment as mk', 'mk.depcode', '=', 'o.main_dep')
            ->leftJoin('service_time as st', 'st.vn', '=', 'o.vn')
            ->select([
                'o.oqueue', 'o.vn', 'o.cur_dep', 'o.main_dep', 'o.cur_dep_busy', 'o.vsttime',
                'k.department',
                'mk.department as main_department',
                'st.service6', 'st.service6_dep', 'st.service16',
            ])
            ->whereDate('o.vstdate', $today)
            ->where(function ($q) use ($needle) {
                $q->where('o.oqueue', $needle);
                if (ctype_digit($needle)) {
                    $normalized = ltrim($needle, '0');
                    $q->orWhereRaw(
                        "TRIM(LEADING '0' FROM TRIM(o.oqueue)) = ?",
                        [$normalized === '' ? '0' : $normalized]
                    );
                }
            })
            ->orderByDesc('o.vsttime')
            ->orderByDesc('o.vn');

        $row = $query->first();

        return $row ?: null;
    }

    /**
     * @return array{stage: string, text: string}
     */
    private function pharmacyForVisit($conn, string $today, object $row): array
    {
        $printed = $this->printedVnSet($conn, [(string) $row->vn]);
        $stage = $this->pharmacyStage($row, isset($printed[(string) $row->vn]));

        return [
            'stage' => $stage,
            'text' => $this->pharmacyText($stage),
        ];
    }

    private function pharmacyRemaining($conn, string $today, mixed $oqueue, string $stage, bool $selfCalling): int
    {
        if ($selfCalling) {
            return 0;
        }

        $rows = $conn->table('ovst as o')
            ->leftJoin('service_time as st', 'st.vn', '=', 'o.vn')
            ->select(['o.oqueue', 'o.vn', 'o.cur_dep', 'o.cur_dep_busy', 'st.service6', 'st.service6_dep', 'st.service16'])
            ->whereDate('o.vstdate', $today)
            ->where('o.cur_dep', (string) config('queue_portal.pharmacy_dep', '013'))
            ->get();

        $printed = $this->printedVnSet($conn, $rows->pluck('vn')->filter()->unique()->all());
        $ahead = 0;

        foreach ($rows as $peer) {
            if ($this->pharmacyStage($peer, isset($printed[(string) $peer->vn])) !== $stage) {
                continue;
            }
            if ($this->isCalling($peer->cur_dep_busy ?? null)) {
                continue;
            }
            if ($this->isAhead($peer->oqueue, $oqueue)) {
                $ahead++;
            }
        }

        return $ahead;
    }

    private function roomRemaining($conn, string $today, string $curDep, mixed $oqueue, bool $selfCalling): int
    {
        if ($selfCalling) {
            return 0;
        }

        $rows = $conn->table('ovst')
            ->whereDate('vstdate', $today)
            ->where('cur_dep', $curDep)
            ->get(['oqueue', 'cur_dep_busy']);

        $ahead = 0;
        foreach ($rows as $peer) {
            if ($this->isCalling($peer->cur_dep_busy ?? null)) {
                continue;
            }
            if ($this->isAhead($peer->oqueue, $oqueue)) {
                $ahead++;
            }
        }

        return $ahead;
    }

    /**
     * @param  array<int, string>  $vns
     * @return array<string, true>
     */
    private function printedVnSet($conn, array $vns): array
    {
        $vns = array_values(array_filter($vns, fn ($vn) => $vn !== ''));
        if ($vns === []) {
            return [];
        }

        return $conn->table('opitemrece as oi')
            ->join('drugitems as d', 'd.icode', '=', 'oi.icode')
            ->whereIn('oi.vn', $vns)
            ->where('oi.print', 'Y')
            ->distinct()
            ->pluck('oi.vn')
            ->mapWithKeys(fn ($vn) => [(string) $vn => true])
            ->all();
    }

    private function pharmacyStage(object $row, bool $stickerPrinted): string
    {
        if ($this->isRecordedServiceTime($row->service16 ?? null)) {
            return 'done';
        }

        $atPharmacy = trim((string) ($row->cur_dep ?? '')) === (string) config('queue_portal.pharmacy_dep', '013');
        if (! $atPharmacy) {
            return 'waiting';
        }

        $stickerViaService = trim((string) ($row->service6_dep ?? '')) === (string) config('queue_portal.pharmacy_dep', '013')
            && $this->isRecordedServiceTime($row->service6 ?? null);

        return ($stickerPrinted || $stickerViaService) ? 'ready' : 'prepare';
    }

    private function pharmacyText(string $stage): string
    {
        return match ($stage) {
            'prepare' => 'รอจัดยา',
            'ready' => 'รอจ่ายยา',
            'done' => 'จ่ายยาแล้ว',
            default => 'ยังไม่ถึงห้องยา',
        };
    }

    /**
     * @return array{state: string, detail: string, total: int, confirmed: int}
     */
    private function orderStatus($conn, string $table, string $vn): array
    {
        if (! HosxpSchema::tableExists($conn, $table) || ! HosxpSchema::columnExists($conn, $table, 'confirm_report')) {
            return ['state' => 'skipped', 'detail' => 'ไม่มีรายการวันนี้', 'total' => 0, 'confirmed' => 0];
        }

        $items = $conn->table($table)->where('vn', $vn)->get(['confirm_report']);
        if ($items->isEmpty()) {
            return ['state' => 'skipped', 'detail' => 'ไม่มีรายการวันนี้', 'total' => 0, 'confirmed' => 0];
        }

        $confirmed = $items->filter(fn ($item) => strtoupper(trim((string) $item->confirm_report)) === 'Y')->count();
        $total = $items->count();
        if ($confirmed >= $total) {
            return ['state' => 'done', 'detail' => 'ผลออกแล้ว', 'total' => $total, 'confirmed' => $confirmed];
        }

        return ['state' => 'pending', 'detail' => 'รอผล', 'total' => $total, 'confirmed' => $confirmed];
    }

    /**
     * @return array{state: string, detail: string, total: int, confirmed: int}
     */
    private function xrayStatus($conn, string $vn): array
    {
        if (HosxpSchema::tableExists($conn, 'xray_head')) {
            return $this->orderStatus($conn, 'xray_head', $vn);
        }

        if (! HosxpSchema::tableExists($conn, 'xray_report')) {
            return ['state' => 'skipped', 'detail' => 'ไม่มีรายการวันนี้', 'total' => 0, 'confirmed' => 0];
        }

        $items = $conn->table('xray_report')->where('vn', $vn)->get(['confirm', 'confirm_read_film']);
        if ($items->isEmpty()) {
            return ['state' => 'skipped', 'detail' => 'ไม่มีรายการวันนี้', 'total' => 0, 'confirmed' => 0];
        }

        $confirmed = $items->filter(function ($item) {
            return strtoupper(trim((string) ($item->confirm ?? ''))) === 'Y'
                || strtoupper(trim((string) ($item->confirm_read_film ?? ''))) === 'Y';
        })->count();
        $total = $items->count();

        if ($confirmed >= $total) {
            return ['state' => 'done', 'detail' => 'ผลออกแล้ว', 'total' => $total, 'confirmed' => $confirmed];
        }

        return ['state' => 'pending', 'detail' => 'รอผล', 'total' => $total, 'confirmed' => $confirmed];
    }

    private function isPaid($conn, string $vn): bool
    {
        if (! HosxpSchema::tableExists($conn, 'vn_stat') || ! HosxpSchema::columnExists($conn, 'vn_stat', 'paid_money')) {
            return false;
        }

        $stat = $conn->table('vn_stat')->where('vn', $vn)->first(['paid_money']);

        return $stat !== null && (float) $stat->paid_money > 0;
    }

    private function isFinanceDepartment(?string $name): bool
    {
        $name = trim((string) $name);

        return $name !== '' && mb_stripos($name, 'การเงิน') !== false;
    }

    private function contactText(bool $screened, string $mainDep, string $currentRoom, string $mainRoom): string
    {
        if ($screened) {
            return 'ให้ไปติดต่อที่'.$currentRoom;
        }
        if ($mainDep === '002') {
            return 'โปรดติดต่อห้อง 301 หรือ 302 หรือรอเรียก';
        }
        if ($mainDep === '003') {
            return 'โปรดติดต่อหน้าห้องฉุกเฉิน';
        }

        $room = $mainRoom !== '' ? $mainRoom : 'ห้องที่ลงทะเบียน';

        return 'โปรดติดต่อ'.$room;
    }

    private function hasOpdscreen($conn, string $vn): bool
    {
        if ($vn === '' || ! HosxpSchema::tableExists($conn, 'opdscreen')) {
            return false;
        }

        return $conn->table('opdscreen')->where('vn', $vn)->exists();
    }

    /**
     * จอซักประวัติห้องตรวจ: ทั้ง cur_dep และ main_dep เป็น 002
     *
     * @return array{on_board: bool, calling: bool, remaining: int|null}
     */
    private function opdScreeningPosition($conn, string $today, string $vn): array
    {
        try {
            $rows = $conn->table('ovst')
            ->whereDate('vstdate', $today)
            ->whereRaw("TRIM(cur_dep) = ?", ['002'])
            ->whereRaw("TRIM(main_dep) = ?", ['002'])
            ->get(['vn', 'oqueue', 'cur_dep_busy']);

        $self = $rows->first(fn ($row) => (string) $row->vn === $vn);
        if ($self === null) {
            return ['on_board' => false, 'calling' => false, 'remaining' => null];
        }

        if ($this->isCalling($self->cur_dep_busy ?? null)) {
            return ['on_board' => true, 'calling' => true, 'remaining' => 0];
        }

        $ahead = 0;
        foreach ($rows as $peer) {
            if ((string) $peer->vn === $vn || $this->isCalling($peer->cur_dep_busy ?? null)) {
                continue;
            }
            if ($this->isAhead($peer->oqueue, $self->oqueue)) {
                $ahead++;
            }
        }

        return ['on_board' => true, 'calling' => false, 'remaining' => $ahead];
        } catch (\Throwable) {
            return ['on_board' => false, 'calling' => false, 'remaining' => null];
        }
    }

    /**
     * ช่วงคัดแยกของจอ ER: cur_dep = 003 ที่ยังอยู่บนจอ และไม่ใช่รับไว้สังเกตอาการ
     *
     * @return array{on_board: bool, calling: bool, remaining: int|null}
     */
    private function erScreeningPosition($conn, string $today, string $vn): array
    {
        try {
            $rows = $conn->table('ovst as o')
            ->leftJoin('er_regist as e', 'e.vn', '=', 'o.vn')
            ->leftJoin('er_leave_status as els', 'els.er_leave_status_id', '=', 'e.er_leave_status_id')
            ->leftJoin('er_dch_type as edt', 'edt.er_dch_type', '=', 'e.er_dch_type')
            ->select([
                'o.vn', 'o.oqueue', 'o.vsttime', 'o.cur_dep', 'o.main_dep', 'o.cur_dep_busy',
                'e.finish_time',
                'els.er_leave_status_name',
                'edt.name as er_dch_type_name',
            ])
            ->whereDate('o.vstdate', $today)
            ->where('o.cur_dep', '003')
            ->get()
            ->filter(fn ($row) => ! $this->isErObservation($row) && ! $this->isErRemovedFromDisplay($row))
            ->sort(fn ($a, $b) => $this->erQueueSort($a, $b))
            ->values();

        $index = $rows->search(fn ($row) => (string) $row->vn === $vn);
        if ($index === false) {
            return ['on_board' => false, 'calling' => false, 'remaining' => null];
        }

        $self = $rows[$index];
        if ($this->isCalling($self->cur_dep_busy ?? null)) {
            return ['on_board' => true, 'calling' => true, 'remaining' => 0];
        }

        $ahead = 0;
        foreach ($rows as $position => $peer) {
            if ($position >= $index) {
                break;
            }
            if (! $this->isCalling($peer->cur_dep_busy ?? null)) {
                $ahead++;
            }
        }

        return ['on_board' => true, 'calling' => false, 'remaining' => $ahead];
        } catch (\Throwable) {
            return ['on_board' => false, 'calling' => false, 'remaining' => null];
        }
    }

    private function erQueueSort(object $a, object $b): int
    {
        $priA = trim((string) ($a->main_dep ?? '')) === '002' ? 0 : 1;
        $priB = trim((string) ($b->main_dep ?? '')) === '002' ? 0 : 1;
        if ($priA !== $priB) {
            return $priA <=> $priB;
        }

        $timeCmp = strcmp((string) ($a->vsttime ?? ''), (string) ($b->vsttime ?? ''));
        if ($timeCmp !== 0) {
            return $timeCmp;
        }

        $queueA = $this->queueNumber($a->oqueue ?? null);
        $queueB = $this->queueNumber($b->oqueue ?? null);
        if ($queueA !== null && $queueB !== null && $queueA !== $queueB) {
            return $queueA <=> $queueB;
        }

        return strcmp(trim((string) ($a->oqueue ?? '')), trim((string) ($b->oqueue ?? '')));
    }

    private function isErObservation(object $row): bool
    {
        return $this->erObservationLabel(
            trim((string) ($row->er_leave_status_name ?? '')),
            trim((string) ($row->er_dch_type_name ?? ''))
        ) !== null;
    }

    private function isErRemovedFromDisplay(object $row): bool
    {
        if (trim((string) ($row->cur_dep ?? '')) === '999') {
            return true;
        }

        $leaveStatusName = trim((string) ($row->er_leave_status_name ?? ''));
        $dchTypeName = trim((string) ($row->er_dch_type_name ?? ''));
        $hasAnyStatus = $leaveStatusName !== '' || $dchTypeName !== '';
        $isObservation = $this->erObservationLabel($leaveStatusName, $dchTypeName) !== null;

        if ($hasAnyStatus && ! $isObservation) {
            return true;
        }
        if ($isObservation) {
            return false;
        }

        $finish = (string) ($row->finish_time ?? '');

        return $finish !== ''
            && ! str_starts_with($finish, '1899')
            && ! str_starts_with($finish, '0000');
    }

    private function erObservationLabel(string $leaveStatusName, string $dchTypeName): ?string
    {
        if ($this->isErObservationStatus($leaveStatusName)) {
            return $leaveStatusName;
        }
        if ($this->isErObservationStatus($dchTypeName)) {
            return $dchTypeName;
        }

        return null;
    }

    private function isErObservationStatus(string $status): bool
    {
        $normalized = mb_strtolower(trim($status));

        return $normalized !== '' && str_contains($normalized, 'รับไว้สังเกต');
    }

    private function roomName(string $curDep, ?string $department): string
    {
        if ($curDep !== '') {
            $display = TvClinicRoom::query()
                ->where('is_active', true)
                ->where('hosxp_cur_dep', $curDep)
                ->orderBy('sort_order')
                ->value('display_name');
            if (is_string($display) && trim($display) !== '') {
                return trim($display);
            }
        }

        return trim((string) $department);
    }

    /**
     * @param  array{state: string, detail: string}  $order
     * @return array{key: string, label: string, state: string, detail: string}
     */
    private function orderStep(string $key, string $label, array $order): array
    {
        return $this->step($key, $label, $order['state'], $order['detail']);
    }

    /**
     * @return array{key: string, label: string, state: string, detail: string}
     */
    private function doctorStep(bool $done, bool $atScreening, bool $calling): array
    {
        if ($done) {
            return $this->step('doctor', 'พบแพทย์', 'done', 'ผ่านขั้นตอนนี้แล้ว');
        }
        if ($calling) {
            return $this->step('doctor', 'พบแพทย์', 'current', 'กำลังเรียก');
        }
        if ($atScreening) {
            return $this->step('doctor', 'พบแพทย์', 'waiting', 'ยังไม่ถึงห้องตรวจ');
        }

        return $this->step('doctor', 'พบแพทย์', 'waiting', 'รอเรียก');
    }

    /**
     * @return array{key: string, label: string, state: string, detail: string}
     */
    private function paymentStep(bool $done, bool $current): array
    {
        if ($done) {
            return $this->step('payment', 'ชำระเงิน', 'done', 'ชำระเงินแล้ว');
        }
        if ($current) {
            return $this->step('payment', 'ชำระเงิน', 'current', 'ถึงจุดชำระเงิน');
        }

        return $this->step('payment', 'ชำระเงิน', 'waiting', 'ยังไม่ถึง');
    }

    /**
     * @return array{key: string, label: string, state: string, detail: string}
     */
    private function pharmacyStep(string $stage): array
    {
        return match ($stage) {
            'done' => $this->step('pharmacy', 'รับยา', 'done', 'จ่ายยาแล้ว'),
            'prepare', 'ready' => $this->step('pharmacy', 'รับยา', 'current', $this->pharmacyText($stage)),
            default => $this->step('pharmacy', 'รับยา', 'waiting', 'ยังไม่ถึงห้องยา'),
        };
    }

    /**
     * @return array{key: string, label: string, state: string, detail: string}
     */
    private function step(string $key, string $label, string $state, string $detail): array
    {
        return [
            'key' => $key,
            'label' => $label,
            'state' => $state,
            'detail' => $detail,
        ];
    }

    private function isCalling(mixed $busy): bool
    {
        return strtoupper(trim((string) $busy)) === 'Y';
    }

    private function isRecordedServiceTime(mixed $value): bool
    {
        $time = trim((string) $value);

        return $time !== ''
            && ! str_starts_with($time, '00:00:00')
            && ! str_starts_with($time, '0000');
    }

    private function isAhead(mixed $other, mixed $mine): bool
    {
        $otherNumber = $this->queueNumber($other);
        $mineNumber = $this->queueNumber($mine);
        if ($otherNumber !== null && $mineNumber !== null) {
            return $otherNumber < $mineNumber;
        }

        return strcmp(trim((string) $other), trim((string) $mine)) < 0;
    }

    private function queueNumber(mixed $value): ?int
    {
        $text = trim((string) $value);
        if ($text === '' || ! ctype_digit($text)) {
            return null;
        }

        return (int) $text;
    }

    public function normalizeOqueue(string $oqueue): ?string
    {
        $oqueue = trim($oqueue);
        if ($oqueue === '' || ! preg_match('/^[A-Za-z0-9]{1,12}$/', $oqueue)) {
            return null;
        }

        return $oqueue;
    }
}
