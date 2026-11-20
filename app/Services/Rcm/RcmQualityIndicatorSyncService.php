<?php

namespace App\Services\Rcm;

use App\Models\QualityIndicator;
use App\Models\QualityIndicatorEntry;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RcmQualityIndicatorSyncService
{
    /**
     * ซิงค์ข้อมูลสถิติการติด C จากระบบ RCM เข้าสู่ตัวชี้วัดคุณภาพ IM-11
     *
     * @param int|null $budgetYear ปีงบประมาณ พ.ศ. (เช่น 2569) หรือ null สำหรับทุกงวดที่มีข้อมูล
     * @return array ผลลัพธ์การซิงค์
     */
    public function syncIm11(?int $budgetYear = null): array
    {
        $indicator = QualityIndicator::where('code', 'IM-11')->first();

        if (! $indicator) {
            // ค้นหาด้วยชื่อหากรหัสไม่ตรง
            $indicator = QualityIndicator::where('name', 'LIKE', '%จำนวนติด C%')->first();
        }

        if (! $indicator) {
            return [
                'success' => false,
                'message' => 'ไม่พบตัวชี้วัด IM-11 (จำนวนติด C ระบบ Claim) ในระบบตัวชี้วัดคุณภาพ',
                'synced_count' => 0,
            ];
        }

        // อัปเดตหน่วยวัดให้เป็น "ครั้ง" ตามความต้องการ
        if ($indicator->unit !== 'ครั้ง') {
            $indicator->update([
                'unit' => 'ครั้ง',
            ]);
        }

        // Query สรุปจำนวนการติด C แยกตามเดือนรับบริการ (visit_date)
        $query = DB::table('finance_cgd_stm_rows as r')
            ->join('finance_cgd_stm_batches as b', 'b.id', '=', 'r.batch_id')
            ->where('b.file_kind', 'rep')
            ->whereNotNull('r.visit_date');

        if ($budgetYear !== null) {
            // ปีงบประมาณ ต.ค. (ปี ค.ศ. ก่อนหน้า) ถึง ก.ย. (ปี ค.ศ. ปัจจุบัน)
            $ceYear = $budgetYear - 543;
            $startDate = ($ceYear - 1) . '-10-01';
            $endDate = $ceYear . '-09-30';
            $query->whereBetween('r.visit_date', [$startDate, $endDate]);
        }

        $monthlyStats = $query->selectRaw("
            DATE_FORMAT(r.visit_date, '%Y-%m') as ym,
            COUNT(*) as total_claims,
            COUNT(CASE WHEN r.error_code IS NOT NULL AND r.error_code != '' THEN 1 END) as c_deny_count
        ")
        ->groupBy('ym')
        ->orderBy('ym', 'asc')
        ->get();

        $syncedCount = 0;
        $userId = Auth::id();

        foreach ($monthlyStats as $row) {
            $ym = $row->ym;
            if (empty($ym) || ! preg_match('/^\d{4}-\d{2}$/', $ym)) {
                continue;
            }

            // ใช้วันสิ้นเดือนของเดือนนั้น
            $periodDate = Carbon::parse($ym . '-01')->endOfMonth()->toDateString();
            $cDenyCount = (int) $row->c_deny_count;
            $totalClaims = (int) $row->total_claims;

            QualityIndicatorEntry::updateOrCreate(
                [
                    'quality_indicator_id' => $indicator->id,
                    'period_date' => $periodDate,
                    'series_key' => '',
                ],
                [
                    'numerator' => $cDenyCount,
                    'denominator' => $totalClaims > 0 ? $totalClaims : null,
                    'result_value' => $cDenyCount,
                    'is_na' => false,
                    'notes' => null,
                    'created_by' => $userId,
                ]
            );

            $syncedCount++;
        }

        Log::info("Synced RCM C-Deny data to IM-11: {$syncedCount} months updated.");

        return [
            'success' => true,
            'message' => "ซิงค์ข้อมูลการติด C เข้าสู่ตัวชี้วัด IM-11 เรียบร้อยแล้ว จำนวน {$syncedCount} เดือน",
            'indicator_id' => $indicator->id,
            'indicator_code' => $indicator->code,
            'synced_count' => $syncedCount,
        ];
    }
}
