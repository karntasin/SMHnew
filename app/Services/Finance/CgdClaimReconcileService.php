<?php

namespace App\Services\Finance;

use App\Models\Finance\CgdReconcileItem;
use App\Models\Finance\CgdReconciliation;
use App\Models\Finance\CgdStmBatch;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CgdClaimReconcileService
{
    public function __construct(
        private readonly CgdHosxpClaimService $hosxp,
    ) {}

    public function reconcile(
        CgdStmBatch $batch,
        ?string $startDate = null,
        ?string $endDate = null,
        string $pttypeLike = '12%',
        array $excludeDeps = ['021'],
    ): CgdReconciliation {
        if (! $this->hosxp->available()) {
            throw new \RuntimeException('ไม่สามารถเชื่อมต่อฐานข้อมูล HOSxP ได้');
        }

        $stmRows = $batch->rows()->get();

        $fileDates = $stmRows
            ->pluck('visit_date')
            ->map(function ($date) {
                if ($date instanceof \Carbon\CarbonInterface) {
                    return $date->toDateString();
                }

                return $date ? (string) $date : null;
            })
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();

        if ($fileDates !== []) {
            $batch->forceFill([
                'visit_date_min' => $fileDates[0],
                'visit_date_max' => $fileDates[count($fileDates) - 1],
            ])->save();
        }

        // ช่วงวันที่เลือกเองสำหรับดึง Visit HOSxP (ค่าเริ่มต้น = min-max จากไฟล์ STM)
        $startDate = $startDate ?: ($fileDates[0] ?? optional($batch->visit_date_min)->toDateString());
        $endDate = $endDate ?: ($fileDates[count($fileDates) - 1] ?? optional($batch->visit_date_max)->toDateString());

        if (! $startDate || ! $endDate) {
            throw new \RuntimeException('กรุณาเลือกช่วงวันที่ HOSxP สำหรับเปรียบเทียบ');
        }

        if (strtotime($startDate) > strtotime($endDate)) {
            [$startDate, $endDate] = [$endDate, $startDate];
        }

        // ดึง HOSxP ตามช่วงที่เลือก (BETWEEN) — STM ทั้งไฟล์ยังถูกเปรียบเทียบครบ
        $hosxpRows = $this->hosxp->fetchClaims(
            (string) $startDate,
            (string) $endDate,
            $pttypeLike,
            $excludeDeps,
        );

        $hosxpMap = [];
        $hosxpByVisit = [];
        foreach ($hosxpRows as $row) {
            $key = $row['match_key'];
            if ($key !== '' && $key !== '||') {
                $hosxpMap[$key] = $row;
            }
            $visitKey = $this->visitKey($row['hn'] ?? null, $row['pid'] ?? null, $row['visit_date'] ?? null);
            if ($visitKey !== '') {
                $hosxpByVisit[$visitKey][] = $row;
            }
        }

        $stmMap = [];
        foreach ($stmRows as $row) {
            $key = $row->match_key ?: CgdClaimMatchKey::make($row->hn, $row->pid, $row->seq_no);
            if ($key === '||' || $key === '') {
                continue;
            }
            $stmMap[$key] = $row;
        }

        $paired = [];
        $usedHosxp = [];
        $usedStm = [];

        foreach ($stmMap as $key => $s) {
            if (isset($hosxpMap[$key])) {
                $paired[] = [$hosxpMap[$key], $s, $key];
                $usedHosxp[$key] = true;
                $usedStm[$key] = true;
            }
        }

        // Secondary match: HN + PID + visit date (when SEQ seconds differ)
        foreach ($stmMap as $key => $s) {
            if (isset($usedStm[$key])) {
                continue;
            }
            $visitKey = $this->visitKey($s->hn, $s->pid, optional($s->visit_date)->toDateString());
            $candidates = $hosxpByVisit[$visitKey] ?? [];
            foreach ($candidates as $h) {
                $hKey = $h['match_key'];
                if (isset($usedHosxp[$hKey])) {
                    continue;
                }
                $paired[] = [$h, $s, $hKey];
                $usedHosxp[$hKey] = true;
                $usedStm[$key] = true;
                break;
            }
        }

        foreach ($hosxpMap as $key => $h) {
            if (! isset($usedHosxp[$key])) {
                $paired[] = [$h, null, $key];
                $usedHosxp[$key] = true;
            }
        }
        foreach ($stmMap as $key => $s) {
            if (! isset($usedStm[$key])) {
                $paired[] = [null, $s, $key];
                $usedStm[$key] = true;
            }
        }

        $items = [];
        $stats = [
            'matched_ok' => 0,
            'matched_short' => 0,
            'matched_over' => 0,
            'only_hosxp' => 0,
            'only_stm' => 0,
            'stm_out_of_range' => 0,
            'total_hosxp' => 0.0,
            'total_hosxp_paid' => 0.0,
            'total_hosxp_net' => 0.0,
            'total_stm_claim' => 0.0,
            'total_stm_approved' => 0.0,
            'total_shortfall' => 0.0,
            'total_claim_diff' => 0.0,
        ];

        foreach ($paired as [$h, $s, $key]) {

            $hosxpGross = $h ? (float) $h['total'] : null;
            $hosxpPaid = $h ? round((float) ($h['paid_money'] ?? 0), 2) : null;
            // ยอดที่ใช้เทียบกับ STM = HOSxP รวม − Payment (ไม่ติดลบ)
            $hosxpNet = $hosxpGross !== null
                ? round(max(0, $hosxpGross - ($hosxpPaid ?? 0)), 2)
                : null;

            $stmClaim = $s ? (float) $s->amount_claim : null;
            $stmApproved = $s ? (float) $s->amount_approved : null;

            $diffClaim = round(($hosxpNet ?? 0) - ($stmClaim ?? 0), 2);
            $diffApproved = round(($hosxpNet ?? 0) - ($stmApproved ?? 0), 2);
            $shortfall = round(max(0, ($hosxpNet ?? 0) - ($stmApproved ?? 0)), 2);

            if ($h && $s) {
                if (abs($diffApproved) < 0.01) {
                    $status = 'matched_ok';
                    $stats['matched_ok']++;
                    $shortfall = 0;
                } elseif ($diffApproved > 0) {
                    $status = 'matched_short';
                    $stats['matched_short']++;
                    $stats['total_shortfall'] += $shortfall;
                } else {
                    $status = 'matched_over';
                    $stats['matched_over']++;
                    $shortfall = 0;
                }
                $stats['total_claim_diff'] += abs($diffClaim);
            } elseif ($h) {
                $status = 'only_hosxp';
                $stats['only_hosxp']++;
                $shortfall = round((float) $hosxpNet, 2);
                $stats['total_shortfall'] += $shortfall;
                $diffClaim = round((float) $hosxpNet, 2);
                $diffApproved = round((float) $hosxpNet, 2);
            } else {
                $stmVisit = optional($s?->visit_date)->toDateString();
                $inHosxpRange = $stmVisit
                    && $stmVisit >= $startDate
                    && $stmVisit <= $endDate;

                if ($inHosxpRange) {
                    $status = 'only_stm';
                    $stats['only_stm']++;
                } else {
                    $status = 'stm_out_of_range';
                    $stats['stm_out_of_range']++;
                }
                $shortfall = 0;
                $diffClaim = round(-1 * (float) ($stmClaim ?? 0), 2);
                $diffApproved = round(-1 * (float) ($stmApproved ?? 0), 2);
            }

            if ($hosxpGross !== null) {
                $stats['total_hosxp'] += $hosxpGross;
            }
            if ($hosxpPaid !== null) {
                $stats['total_hosxp_paid'] += $hosxpPaid;
            }
            if ($hosxpNet !== null) {
                $stats['total_hosxp_net'] += $hosxpNet;
            }
            if ($stmClaim !== null) {
                $stats['total_stm_claim'] += $stmClaim;
            }
            if ($stmApproved !== null) {
                $stats['total_stm_approved'] += $stmApproved;
            }

            $items[] = [
                'status' => $status,
                'hn' => $h['hn'] ?? $s?->hn,
                'pid' => $this->preferText($h['pid'] ?? null, $s?->pid),
                'seq_no' => $h['seq_no'] ?? $s?->seq_no,
                'match_key' => $key,
                'patient_name' => $this->preferText($h['patient_name'] ?? null, $s?->patient_name),
                'visit_date' => $h['visit_date'] ?? optional($s?->visit_date)->toDateString(),
                'department' => $h['department'] ?? null,
                'pttype' => $h['pttype_label'] ?? $this->preferText($h['pttype_name'] ?? null, null),
                'pttype_code' => $h['pttype_code'] ?? null,
                'hipdata_code' => $h['hipdata_code'] ?? null,
                'hosxp_drug' => $h['drug'] ?? null,
                'hosxp_organ' => $h['artificial_organ'] ?? null,
                'hosxp_service' => $h['service_charge'] ?? null,
                'hosxp_total' => $hosxpGross,
                'hosxp_paid' => $hosxpPaid,
                'hosxp_debt' => $h['uc_money'] ?? null,
                'stm_claim' => $stmClaim,
                'stm_approved' => $stmApproved,
                'stm_drug' => $s?->amount_drug,
                'stm_organ' => $s?->amount_organ,
                'stm_treat' => $s?->amount_treat,
                'rep_no' => $s?->rep_no,
                'diff_claim' => $diffClaim,
                'diff_approved' => $diffApproved,
                'shortfall' => $shortfall,
            ];
        }

        $stats['total_hosxp_paid'] = round($stats['total_hosxp_paid'], 2);
        $stats['total_hosxp_net'] = round($stats['total_hosxp_net'], 2);

        return DB::transaction(function () use ($batch, $startDate, $endDate, $pttypeLike, $excludeDeps, $hosxpRows, $stmRows, $stats, $items) {
            // Keep latest reconciliation per batch for simplicity of UI
            $batch->reconciliations()->each(function (CgdReconciliation $old) {
                $old->items()->delete();
                $old->delete();
            });

            $reconciliation = CgdReconciliation::create([
                'batch_id' => $batch->id,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'pttype_like' => $pttypeLike,
                'exclude_deps' => implode(',', $excludeDeps),
                'hosxp_count' => count($hosxpRows),
                'stm_count' => $stmRows->count(),
                'matched_ok' => $stats['matched_ok'],
                'matched_short' => $stats['matched_short'],
                'matched_over' => $stats['matched_over'],
                'only_hosxp' => $stats['only_hosxp'],
                'only_stm' => $stats['only_stm'],
                'stm_out_of_range' => $stats['stm_out_of_range'],
                'total_hosxp' => round($stats['total_hosxp'], 2),
                'total_stm_claim' => round($stats['total_stm_claim'], 2),
                'total_stm_approved' => round($stats['total_stm_approved'], 2),
                'total_shortfall' => round($stats['total_shortfall'], 2),
                'total_claim_diff' => round($stats['total_claim_diff'], 2),
                'created_by' => Auth::id(),
            ]);

            foreach (array_chunk($items, 200) as $chunk) {
                $now = now();
                CgdReconcileItem::insert(array_map(function (array $item) use ($reconciliation, $now) {
                    return array_merge($item, [
                        'reconciliation_id' => $reconciliation->id,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }, $chunk));
            }

            $batch->update(['status' => 'reconciled']);

            return $reconciliation->fresh(['batch', 'items']);
        });
    }

    private function visitKey(?string $hn, ?string $pid, ?string $visitDate): string
    {
        $hn = CgdClaimMatchKey::normalizeHn($hn);
        $pid = CgdClaimMatchKey::normalizePid($pid);
        $visitDate = trim((string) $visitDate);
        if ($hn === '' || $pid === '' || $visitDate === '') {
            return '';
        }

        return $hn.'|'.$pid.'|'.$visitDate;
    }

    private function preferText(?string $primary, ?string $fallback): ?string
    {
        $primary = trim(preg_replace('/\s+/', ' ', (string) $primary) ?? '');
        if ($primary !== '') {
            return $primary;
        }

        $fallback = trim(preg_replace('/\s+/', ' ', (string) $fallback) ?? '');

        return $fallback !== '' ? $fallback : null;
    }
}
