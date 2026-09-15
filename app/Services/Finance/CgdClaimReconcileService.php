<?php

namespace App\Services\Finance;

use App\Models\Finance\CgdErrorCase;
use App\Models\Finance\CgdReconcileItem;
use App\Models\Finance\CgdReconciliation;
use App\Models\Finance\CgdStmBatch;
use App\Models\Finance\CgdStmRow;
use App\Models\Finance\StmDetailRow;
use App\Models\Finance\StmImport;
use App\Support\Finance\ClaimScheme;
use Illuminate\Support\Collection;
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
        $this->prepareHeavyCompare();
        $stmRows = $batch->rows()->orderBy('id')->get();

        $fileDates = $this->collectVisitDates($stmRows);
        if ($fileDates !== []) {
            $batch->forceFill([
                'visit_date_min' => $fileDates[0],
                'visit_date_max' => $fileDates[count($fileDates) - 1],
            ])->save();
        }

        [$startDate, $endDate] = $this->normalizeDateRange(
            $startDate ?: ($fileDates[0] ?? optional($batch->visit_date_min)->toDateString()),
            $endDate ?: ($fileDates[count($fileDates) - 1] ?? optional($batch->visit_date_max)->toDateString()),
        );

        $built = $this->buildComparison($stmRows, $startDate, $endDate, $pttypeLike, $excludeDeps);

        return DB::transaction(function () use ($batch, $startDate, $endDate, $pttypeLike, $excludeDeps, $built) {
            $batch->reconciliations()->where('scope', 'batch')->each(function (CgdReconciliation $old) {
                $old->items()->delete();
                $old->delete();
            });

            $reconciliation = $this->persistReconciliation(
                batchId: $batch->id,
                stmImportId: null,
                claimSubmissionNo: null,
                scope: 'batch',
                startDate: $startDate,
                endDate: $endDate,
                pttypeLike: $pttypeLike,
                excludeDeps: $excludeDeps,
                built: $built,
                scheme: (string) ($batch->scheme ?: ClaimScheme::CGD),
            );

            $batch->update(['status' => 'reconciled']);

            return $reconciliation->fresh(['batch']);
        });
    }

    /**
     * เปรียบเทียบ Visit HOSxP กับรายการ REP จากทุกไฟล์ที่นำเข้า (ตาม scheme)
     */
    public function reconcileAll(
        string $startDate,
        string $endDate,
        string $pttypeLike = '12%',
        array $excludeDeps = ['021'],
        string $scheme = ClaimScheme::CGD,
    ): CgdReconciliation {
        $this->prepareHeavyCompare();
        $stmRows = $this->loadAllUniqueRepRows($scheme);
        if ($stmRows->isEmpty()) {
            throw new \RuntimeException('ยังไม่มีไฟล์ REP ที่นำเข้า — กรุณานำเข้าไฟล์ก่อนเปรียบเทียบ');
        }

        [$startDate, $endDate] = $this->normalizeDateRange($startDate, $endDate);
        $built = $this->buildComparison($stmRows, $startDate, $endDate, $pttypeLike, $excludeDeps);
        $repNos = $stmRows->pluck('rep_no')->filter()->unique()->values()->all();
        $built = $this->enrichWithRepErrors($built, $repNos, null, null);

        return DB::transaction(function () use ($startDate, $endDate, $pttypeLike, $excludeDeps, $built, $scheme) {
            CgdReconciliation::query()
                ->where('scope', 'all')
                ->where('scheme', $scheme)
                ->each(function (CgdReconciliation $old) {
                    $old->items()->delete();
                    $old->delete();
                });

            $reconciliation = $this->persistReconciliation(
                batchId: null,
                stmImportId: null,
                claimSubmissionNo: null,
                scope: 'all',
                startDate: $startDate,
                endDate: $endDate,
                pttypeLike: $pttypeLike,
                excludeDeps: $excludeDeps,
                built: $built,
                scheme: $scheme,
            );

            return $reconciliation;
        });
    }

    /**
     * เปรียบเทียบชุด STM (เลขที่นำเบิก) กับ HOSxP ด้วย SEQ · แนบ Error จาก REP ตามเลข REP
     */
    public function reconcileStm(
        StmImport $import,
        ?string $startDate = null,
        ?string $endDate = null,
        string $pttypeLike = '12%',
        array $excludeDeps = ['021'],
    ): CgdReconciliation {
        $this->prepareHeavyCompare();
        $detailRows = $import->details()->orderBy('id')->get();
        if ($detailRows->isEmpty()) {
            throw new \RuntimeException('ชุด STM '.$import->claim_submission_no.' ยังไม่มีรายละเอียดสำหรับเปรียบเทียบ');
        }

        $fileDates = $this->collectVisitDates($detailRows);
        [$startDate, $endDate] = $this->normalizeDateRange(
            $startDate ?: ($fileDates[0] ?? optional($import->visit_date_min)->toDateString()),
            $endDate ?: ($fileDates[count($fileDates) - 1] ?? optional($import->visit_date_max)->toDateString()),
        );

        $repNos = $detailRows->pluck('rep_no')->filter()->unique()->values()->all();
        $built = $this->buildComparison($detailRows, $startDate, $endDate, $pttypeLike, $excludeDeps);
        $built = $this->enrichWithRepErrors($built, $repNos, $import->id, $import->claim_submission_no);

        return DB::transaction(function () use ($import, $startDate, $endDate, $pttypeLike, $excludeDeps, $built) {
            CgdReconciliation::query()
                ->where('scope', 'stm')
                ->where('stm_import_id', $import->id)
                ->each(function (CgdReconciliation $old) {
                    $old->items()->delete();
                    $old->delete();
                });

            return $this->persistReconciliation(
                batchId: null,
                stmImportId: $import->id,
                claimSubmissionNo: $import->claim_submission_no,
                scope: 'stm',
                startDate: $startDate,
                endDate: $endDate,
                pttypeLike: $pttypeLike,
                excludeDeps: $excludeDeps,
                built: $built,
            )->fresh(['stmImport']);
        });
    }

    /**
     * เปรียบเทียบรวมทุกชุด STM กับ HOSxP
     */
    public function reconcileAllStm(
        string $startDate,
        string $endDate,
        string $pttypeLike = '12%',
        array $excludeDeps = ['021'],
    ): CgdReconciliation {
        $this->prepareHeavyCompare();
        $detailRows = $this->loadAllUniqueStmDetailRows();
        if ($detailRows->isEmpty()) {
            throw new \RuntimeException('ยังไม่มีไฟล์ STM ที่นำเข้า — กรุณานำเข้าไฟล์ STM ก่อนเปรียบเทียบ');
        }

        [$startDate, $endDate] = $this->normalizeDateRange($startDate, $endDate);
        $repNos = $detailRows->pluck('rep_no')->filter()->unique()->values()->all();
        $built = $this->buildComparison($detailRows, $startDate, $endDate, $pttypeLike, $excludeDeps);
        $built = $this->enrichWithRepErrors($built, $repNos, null, null);

        return DB::transaction(function () use ($startDate, $endDate, $pttypeLike, $excludeDeps, $built) {
            CgdReconciliation::query()
                ->where('scope', 'stm_all')
                ->each(function (CgdReconciliation $old) {
                    $old->items()->delete();
                    $old->delete();
                });

            return $this->persistReconciliation(
                batchId: null,
                stmImportId: null,
                claimSubmissionNo: null,
                scope: 'stm_all',
                startDate: $startDate,
                endDate: $endDate,
                pttypeLike: $pttypeLike,
                excludeDeps: $excludeDeps,
                built: $built,
            );
        });
    }

    /**
     * @return Collection<int, CgdStmRow>
     */
    public function loadAllUniqueRepRows(string $scheme = ClaimScheme::CGD): Collection
    {
        $rows = CgdStmRow::query()
            ->whereHas('batch', function ($q) use ($scheme) {
                $q->forScheme($scheme)
                    ->where(function ($inner) {
                        $inner->where('file_kind', 'rep')->orWhereNull('file_kind');
                    });
            })
            ->orderBy('batch_id')
            ->orderBy('id')
            ->get();

        $map = [];
        foreach ($rows as $row) {
            $key = $row->match_key ?: CgdClaimMatchKey::make($row->hn, $row->pid, $row->seq_no);
            if ($key === '' || $key === '||') {
                continue;
            }
            $map[$key] = $row;
        }

        return collect(array_values($map));
    }

    /**
     * รวมแถว STM จากทุกชุด — ถ้า SEQ ซ้ำ ใช้จากชุดที่ใหม่กว่า
     *
     * @return Collection<int, StmDetailRow>
     */
    public function loadAllUniqueStmDetailRows(): Collection
    {
        $map = [];
        StmDetailRow::query()
            ->select([
                'id',
                'import_id',
                'claim_submission_no',
                'rep_no',
                'hn',
                'pid',
                'patient_name',
                'visit_date',
                'visit_at',
                'amount_claim',
                'amount_approved',
                'amount_drug',
                'amount_organ',
                'amount_treat',
                'seq_no',
                'match_key',
            ])
            ->chunkById(1000, function (Collection $chunk) use (&$map) {
                foreach ($chunk as $row) {
                    $key = $row->match_key ?: CgdClaimMatchKey::make($row->hn, $row->pid, $row->seq_no);
                    if ($key === '' || $key === '||') {
                        continue;
                    }
                    $map[$key] = $row;
                }
            });

        return collect(array_values($map));
    }

    /**
     * @return array{0:?string,1:?string}
     */
    public function allRepDateRange(string $scheme = ClaimScheme::CGD): array
    {
        $min = CgdStmBatch::query()
            ->forScheme($scheme)
            ->whereNotNull('visit_date_min')
            ->min('visit_date_min');
        $max = CgdStmBatch::query()
            ->forScheme($scheme)
            ->whereNotNull('visit_date_max')
            ->max('visit_date_max');

        return [
            $min ? (string) $min : null,
            $max ? (string) $max : null,
        ];
    }

    /**
     * @return array{0:?string,1:?string}
     */
    public function allStmDateRange(): array
    {
        $min = StmImport::query()->whereNotNull('visit_date_min')->min('visit_date_min');
        $max = StmImport::query()->whereNotNull('visit_date_max')->max('visit_date_max');

        return [
            $min ? (string) $min : null,
            $max ? (string) $max : null,
        ];
    }

    /**
     * โหลดแถว REP ที่มี Error code ที่เลข REP ตรงกับชุด STM
     *
     * @param  list<string>  $repNos
     * @return list<array<string,mixed>>
     */
    public function loadRepErrorRows(
        array $repNos,
        ?string $claimSubmissionNo = null,
        string $scheme = ClaimScheme::CGD,
    ): array {
        $repNos = array_values(array_unique(array_filter(array_map('strval', $repNos))));
        if ($repNos === []) {
            return [];
        }

        // เรียง batch ใหม่ก่อน — กรณีนำเข้า REP เดิมซ้ำหลายครั้ง จะได้แถวล่าสุด
        $rows = CgdStmRow::query()
            ->whereIn('rep_no', $repNos)
            ->whereNotNull('error_code')
            ->where('error_code', '!=', '')
            ->whereHas('batch', function ($q) use ($scheme) {
                $q->forScheme($scheme)
                    ->where(function ($inner) {
                        $inner->where('file_kind', 'rep')->orWhereNull('file_kind');
                    });
            })
            ->orderByDesc('batch_id')
            ->orderByDesc('id')
            ->get();

        // ตัดรายการซ้ำข้าม batch (และซ้ำในไฟล์เดียวกัน) คงรายการแรก = ชุดนำเข้าล่าสุด
        $rows = $rows
            ->unique(function (CgdStmRow $row) {
                $key = $row->match_key ?: CgdClaimMatchKey::make($row->hn, $row->pid, $row->seq_no);

                return implode("\0", [
                    (string) $row->rep_no,
                    (string) $key,
                    (string) $row->error_code,
                    (string) ($row->fund_codes ?? ''),
                ]);
            })
            ->sortBy([
                ['rep_no', 'asc'],
                ['hn', 'asc'],
                ['seq_no', 'asc'],
                ['id', 'asc'],
            ])
            ->values();

        $nameByKey = $this->lookupPatientNamesForRows($rows);

        return $rows
            ->map(function (CgdStmRow $row) use ($claimSubmissionNo, $nameByKey) {
                $key = $row->match_key ?: CgdClaimMatchKey::make($row->hn, $row->pid, $row->seq_no);
                $hnKey = CgdClaimMatchKey::normalizeHn($row->hn);
                $name = $row->patient_name
                    ?: ($nameByKey['by_key'][$key] ?? null)
                    ?: ($hnKey !== '' ? ($nameByKey['by_hn'][$hnKey] ?? null) : null);

                if ($name && ! filled($row->patient_name)) {
                    $row->forceFill(['patient_name' => $name])->saveQuietly();
                }

                return [
                    'id' => $row->id,
                    'claim_submission_no' => $claimSubmissionNo,
                    'rep_no' => $row->rep_no,
                    'hn' => $row->hn,
                    'pid' => $row->pid,
                    'seq_no' => $row->seq_no,
                    'patient_name' => $name,
                    'visit_date' => optional($row->visit_date)->toDateString(),
                    'visit_at' => optional($row->visit_at)->format('Y-m-d H:i:s'),
                    'amount_claim' => (float) $row->amount_claim,
                    'amount_approved' => (float) $row->amount_approved,
                    'error_code' => $row->error_code,
                    'fund_codes' => $row->fund_codes,
                    'tran_id' => $row->tran_id,
                    'remark' => $row->remark,
                    'match_key' => $row->match_key,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * หาชื่อผู้ป่วยจาก STM / HOSxP สำหรับแถวที่ชื่อว่าง
     *
     * @param  Collection<int, CgdStmRow>  $rows
     * @return array{by_key: array<string,string>, by_hn: array<string,string>}
     */
    private function lookupPatientNamesForRows(Collection $rows): array
    {
        $byKey = [];
        $byHn = [];

        $missing = $rows->filter(fn (CgdStmRow $row) => ! filled($row->patient_name));
        if ($missing->isEmpty()) {
            return ['by_key' => $byKey, 'by_hn' => $byHn];
        }

        $keys = $missing
            ->map(fn (CgdStmRow $row) => $row->match_key ?: CgdClaimMatchKey::make($row->hn, $row->pid, $row->seq_no))
            ->filter(fn ($key) => $key !== '' && $key !== '||')
            ->unique()
            ->values()
            ->all();

        if ($keys !== []) {
            StmDetailRow::query()
                ->whereIn('match_key', $keys)
                ->whereNotNull('patient_name')
                ->where('patient_name', '!=', '')
                ->orderByDesc('id')
                ->get(['match_key', 'patient_name', 'hn'])
                ->each(function (StmDetailRow $row) use (&$byKey, &$byHn) {
                    if ($row->match_key && ! isset($byKey[$row->match_key])) {
                        $byKey[$row->match_key] = $row->patient_name;
                    }
                    $hnKey = CgdClaimMatchKey::normalizeHn($row->hn);
                    if ($hnKey !== '' && ! isset($byHn[$hnKey])) {
                        $byHn[$hnKey] = $row->patient_name;
                    }
                });
        }

        $hns = $missing
            ->pluck('hn')
            ->map(fn ($hn) => CgdClaimMatchKey::normalizeHn($hn))
            ->filter()
            ->unique()
            ->values()
            ->all();
        $needHosxp = array_values(array_filter($hns, fn ($hn) => ! isset($byHn[$hn])));
        if ($needHosxp !== []) {
            foreach ($this->hosxp->fetchNamesByHn($needHosxp) as $hn => $name) {
                $hnKey = CgdClaimMatchKey::normalizeHn((string) $hn);
                if ($hnKey !== '' && $name !== '') {
                    $byHn[$hnKey] = $name;
                }
            }
        }

        return ['by_key' => $byKey, 'by_hn' => $byHn];
    }

    /**
     * @param  Collection<int, CgdStmRow|StmDetailRow>  $stmRows
     * @return array{hosxp_rows: list<array<string,mixed>>, stm_count: int, stats: array<string,float|int>, items: list<array<string,mixed>>}
     */
    private function buildComparison(
        Collection $stmRows,
        string $startDate,
        string $endDate,
        string $pttypeLike,
        array $excludeDeps,
    ): array {
        if (! $this->hosxp->available()) {
            throw new \RuntimeException('ไม่สามารถเชื่อมต่อฐานข้อมูล HOSxP ได้');
        }

        $hosxpRows = $this->hosxp->fetchClaims(
            $startDate,
            $endDate,
            $pttypeLike,
            $excludeDeps,
        );

        $hosxpMap = [];
        foreach ($hosxpRows as $row) {
            $key = $row['match_key'];
            if ($key !== '' && $key !== '||') {
                $hosxpMap[$key] = $row;
            }
        }
        $hosxpCount = count($hosxpMap);
        unset($hosxpRows);

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
            'total_hosxp_unmatched' => 0.0,
            'total_hosxp_unmatched_paid' => 0.0,
            'total_hosxp_unmatched_net' => 0.0,
            'total_stm_claim' => 0.0,
            'total_stm_approved' => 0.0,
            'total_stm_treat' => 0.0,
            'total_shortfall' => 0.0,
            'total_claim_diff' => 0.0,
        ];

        foreach ($paired as [$h, $s, $key]) {
            $hosxpGross = $h ? (float) $h['total'] : null;
            $hosxpPaid = $h ? round((float) ($h['paid_money'] ?? 0), 2) : null;
            $hosxpNet = $hosxpGross !== null
                ? round(max(0, $hosxpGross - ($hosxpPaid ?? 0)), 2)
                : null;

            $stmClaim = $s ? (float) $s->amount_claim : null;
            $stmApproved = $s ? (float) $s->amount_approved : null;
            $stmTreat = $s ? (float) ($s->amount_treat ?? 0) : null;

            $repGap = round(($stmClaim ?? 0) - ($stmApproved ?? 0), 2);
            $shortfall = round(max(0, $repGap), 2);
            $diffApproved = $repGap;
            $diffClaim = round(($hosxpNet ?? 0) - ($stmClaim ?? 0), 2);

            if ($h && $s) {
                if (abs($repGap) < 0.01) {
                    $status = 'matched_ok';
                    $stats['matched_ok']++;
                    $shortfall = 0;
                } elseif ($repGap > 0) {
                    $status = 'matched_short';
                    $stats['matched_short']++;
                    $stats['total_shortfall'] += $shortfall;
                } else {
                    $status = 'matched_over';
                    $stats['matched_over']++;
                    $shortfall = 0;
                }
                $stats['total_claim_diff'] += abs($repGap);
                $stats['total_hosxp'] += $hosxpGross ?? 0;
                $stats['total_hosxp_paid'] += $hosxpPaid ?? 0;
                $stats['total_hosxp_net'] += $hosxpNet ?? 0;
                $stats['total_stm_claim'] += $stmClaim ?? 0;
                $stats['total_stm_approved'] += $stmApproved ?? 0;
                $stats['total_stm_treat'] += $stmTreat ?? 0;
            } elseif ($h) {
                $status = 'only_hosxp';
                $stats['only_hosxp']++;
                $shortfall = 0;
                $diffClaim = round((float) $hosxpNet, 2);
                $diffApproved = 0;
                $stats['total_hosxp_unmatched'] += $hosxpGross ?? 0;
                $stats['total_hosxp_unmatched_paid'] += $hosxpPaid ?? 0;
                $stats['total_hosxp_unmatched_net'] += $hosxpNet ?? 0;
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
                if ($repGap > 0.009) {
                    $stats['total_shortfall'] += $shortfall;
                } else {
                    $shortfall = 0;
                }
                $stats['total_stm_claim'] += $stmClaim ?? 0;
                $stats['total_stm_approved'] += $stmApproved ?? 0;
                $stats['total_stm_treat'] += $stmTreat ?? 0;
                $diffClaim = round(-1 * (float) ($stmClaim ?? 0), 2);
            }

            $items[] = [
                'status' => $status,
                'hn' => $h['hn'] ?? $s?->hn,
                'pid' => $this->preferText($h['pid'] ?? null, $s?->pid),
                'seq_no' => $h['seq_no'] ?? $s?->seq_no,
                'match_key' => $key,
                'patient_name' => $this->preferText($h['patient_name'] ?? null, $s?->patient_name),
                'visit_date' => $h['visit_date'] ?? optional($s?->visit_date)->toDateString(),
                'visit_at' => $this->resolveVisitAt($h, $s),
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
                'stm_treat' => $stmTreat,
                'rep_no' => $s?->rep_no,
                'error_code' => $s->error_code ?? null,
                'fund_codes' => $s->fund_codes ?? null,
                'tran_id' => $s->tran_id ?? null,
                'remark' => $s->remark ?? null,
                'stm_import_id' => $s->import_id ?? null,
                'claim_submission_no' => $s->claim_submission_no ?? null,
                'diff_claim' => $diffClaim,
                'diff_approved' => $diffApproved,
                'shortfall' => $shortfall,
            ];
        }

        foreach ([
            'total_hosxp', 'total_hosxp_paid', 'total_hosxp_net',
            'total_hosxp_unmatched', 'total_hosxp_unmatched_paid', 'total_hosxp_unmatched_net',
            'total_stm_claim', 'total_stm_approved', 'total_stm_treat',
            'total_shortfall', 'total_claim_diff',
        ] as $moneyKey) {
            $stats[$moneyKey] = round((float) $stats[$moneyKey], 2);
        }

        return [
            'hosxp_count' => $hosxpCount,
            'stm_count' => count($stmMap),
            'stats' => $stats,
            'items' => $items,
        ];
    }

    /**
     * แนบ Error code จากไฟล์ REP ที่เลข REP ตรงกับ STM (จับคู่ด้วย SEQ / match_key)
     *
     * @param  array{hosxp_rows: list<array<string,mixed>>, stm_count: int, stats: array<string,float|int>, items: list<array<string,mixed>>}  $built
     * @param  list<string>  $repNos
     * @return array{hosxp_rows: list<array<string,mixed>>, stm_count: int, stats: array<string,float|int>, items: list<array<string,mixed>>, rep_errors: list<array<string,mixed>>}
     */
    private function enrichWithRepErrors(
        array $built,
        array $repNos,
        ?int $stmImportId,
        ?string $claimSubmissionNo,
    ): array {
        $repErrors = $this->loadRepErrorRows($repNos, $claimSubmissionNo);
        $byKey = [];
        foreach ($repErrors as $row) {
            $key = (string) ($row['match_key'] ?? '');
            if ($key === '' || $key === '||') {
                $key = CgdClaimMatchKey::make($row['hn'] ?? null, $row['pid'] ?? null, $row['seq_no'] ?? null);
            }
            if ($key === '' || $key === '||') {
                continue;
            }
            // เก็บแถวแรกต่อ SEQ (loadRepErrorRows คืนชุดล่าสุดและตัดซ้ำแล้ว)
            if (! isset($byKey[$key])) {
                $byKey[$key] = $row;
            }
        }

        $matchKeys = [];
        foreach ($built['items'] as $item) {
            $key = (string) ($item['match_key'] ?? '');
            if ($key !== '') {
                $matchKeys[] = $key;
            }
        }
        $errorCasesByKey = app(CgdErrorCaseService::class)->casesByMatchKey($matchKeys);
        $appealCasesByKey = app(CgdAppealService::class)->casesByMatchKey($matchKeys);

        $items = [];
        foreach ($built['items'] as $item) {
            if ($stmImportId !== null) {
                $item['stm_import_id'] = $item['stm_import_id'] ?: $stmImportId;
            }
            if ($claimSubmissionNo !== null) {
                $item['claim_submission_no'] = $item['claim_submission_no'] ?: $claimSubmissionNo;
            }

            $key = (string) ($item['match_key'] ?? '');
            $errorCase = $key !== '' ? ($errorCasesByKey[$key] ?? null) : null;
            $appealCase = $key !== '' ? ($appealCasesByKey[$key] ?? null) : null;

            // แนบสถานะ Error/อุทธรณ์เพื่อแสดงผลเท่านั้น — ไม่แก้ยอด STM ในหน้าเปรียบเทียบ HOSxP
            // (การแก้ Error / อุทธรณ์ใช้เฉพาะข้อมูล STM–REP ในแท็บของตัวเอง)
            if ($errorCase && $errorCase->current_status === CgdErrorCase::STATUS_FIXED) {
                $item['error_code'] = null;
                $item['error_status'] = CgdErrorCase::STATUS_FIXED;
            } elseif ($key !== '' && isset($byKey[$key])) {
                $err = $byKey[$key];
                $item['error_code'] = $errorCase?->current_error_code ?: $err['error_code'];
                $item['fund_codes'] = $err['fund_codes'];
                $item['tran_id'] = $err['tran_id'];
                $item['remark'] = $err['remark'];
                $item['error_status'] = $errorCase?->current_status;
                if (empty($item['rep_no'])) {
                    $item['rep_no'] = $err['rep_no'];
                }
            } elseif ($errorCase) {
                $item['error_code'] = $errorCase->current_error_code;
                $item['error_status'] = $errorCase->current_status;
            }

            if ($appealCase) {
                $item['appeal_status'] = $appealCase->current_status;
            }

            $items[] = $item;
        }

        // แท็บ/รายการ Error: ไม่รวม SEQ ที่ fixed แล้ว
        $built['items'] = $items;
        $built['rep_errors'] = array_values(array_filter(
            $repErrors,
            function (array $row) use ($errorCasesByKey) {
                $key = (string) ($row['match_key'] ?? '');
                if ($key === '' || $key === '||') {
                    $key = CgdClaimMatchKey::make($row['hn'] ?? null, $row['pid'] ?? null, $row['seq_no'] ?? null);
                }
                $case = $errorCasesByKey[$key] ?? null;

                return ! $case || $case->current_status !== CgdErrorCase::STATUS_FIXED;
            }
        ));

        return $built;
    }

    /**
     * @param  array{hosxp_rows: list<array<string,mixed>>, stm_count: int, stats: array<string,float|int>, items: list<array<string,mixed>>}  $built
     */
    private function persistReconciliation(
        ?int $batchId,
        ?int $stmImportId,
        ?string $claimSubmissionNo,
        string $scope,
        string $startDate,
        string $endDate,
        string $pttypeLike,
        array $excludeDeps,
        array $built,
        string $scheme = ClaimScheme::CGD,
    ): CgdReconciliation {
        $stats = $built['stats'];

        $reconciliation = CgdReconciliation::create([
            'batch_id' => $batchId,
            'stm_import_id' => $stmImportId,
            'claim_submission_no' => $claimSubmissionNo,
            'scope' => $scope,
            'scheme' => $scheme,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'pttype_like' => $pttypeLike,
            'exclude_deps' => implode(',', $excludeDeps),
            'hosxp_count' => (int) ($built['hosxp_count'] ?? count($built['hosxp_rows'] ?? [])),
            'stm_count' => $built['stm_count'],
            'matched_ok' => $stats['matched_ok'],
            'matched_short' => $stats['matched_short'],
            'matched_over' => $stats['matched_over'],
            'only_hosxp' => $stats['only_hosxp'],
            'only_stm' => $stats['only_stm'],
            'stm_out_of_range' => $stats['stm_out_of_range'],
            'total_hosxp' => round((float) $stats['total_hosxp'], 2),
            'total_stm_claim' => round((float) $stats['total_stm_claim'], 2),
            'total_stm_approved' => round((float) $stats['total_stm_approved'], 2),
            'total_shortfall' => round((float) $stats['total_shortfall'], 2),
            'total_claim_diff' => round((float) $stats['total_claim_diff'], 2),
            'created_by' => Auth::id(),
        ]);

        foreach (array_chunk($built['items'], 200) as $chunk) {
            $now = now();
            CgdReconcileItem::insert(array_map(function (array $item) use ($reconciliation, $now, $stmImportId, $claimSubmissionNo) {
                return [
                    'reconciliation_id' => $reconciliation->id,
                    'stm_import_id' => $item['stm_import_id'] ?? $stmImportId,
                    'claim_submission_no' => $item['claim_submission_no'] ?? $claimSubmissionNo,
                    'status' => $item['status'],
                    'hn' => $item['hn'],
                    'pid' => $item['pid'],
                    'seq_no' => $item['seq_no'],
                    'match_key' => $item['match_key'],
                    'patient_name' => $item['patient_name'],
                    'visit_date' => $item['visit_date'],
                    'visit_at' => $item['visit_at'],
                    'department' => $item['department'],
                    'pttype' => $item['pttype'],
                    'pttype_code' => $item['pttype_code'],
                    'hipdata_code' => $item['hipdata_code'],
                    'hosxp_drug' => $item['hosxp_drug'],
                    'hosxp_organ' => $item['hosxp_organ'],
                    'hosxp_service' => $item['hosxp_service'],
                    'hosxp_total' => $item['hosxp_total'],
                    'hosxp_paid' => $item['hosxp_paid'],
                    'hosxp_debt' => $item['hosxp_debt'],
                    'stm_claim' => $item['stm_claim'],
                    'stm_approved' => $item['stm_approved'],
                    'stm_drug' => $item['stm_drug'],
                    'stm_organ' => $item['stm_organ'],
                    'stm_treat' => $item['stm_treat'],
                    'rep_no' => $item['rep_no'],
                    'error_code' => $item['error_code'] ?? null,
                    'fund_codes' => $item['fund_codes'] ?? null,
                    'tran_id' => $item['tran_id'] ?? null,
                    'remark' => $item['remark'] ?? null,
                    'diff_claim' => $item['diff_claim'],
                    'diff_approved' => $item['diff_approved'],
                    'shortfall' => $item['shortfall'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }, $chunk));
        }

        return $reconciliation;
    }

    /**
     * @param  Collection<int, CgdStmRow|StmDetailRow>  $stmRows
     * @return list<string>
     */
    private function collectVisitDates(Collection $stmRows): array
    {
        return $stmRows
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
    }

    /**
     * @return array{0:string,1:string}
     */
    private function normalizeDateRange(?string $startDate, ?string $endDate): array
    {
        if (! $startDate || ! $endDate) {
            throw new \RuntimeException('กรุณาเลือกช่วงวันที่ HOSxP สำหรับเปรียบเทียบ');
        }

        if (strtotime($startDate) > strtotime($endDate)) {
            return [$endDate, $startDate];
        }

        return [$startDate, $endDate];
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

    /**
     * @param  array<string, mixed>|null  $hosxp
     * @param  CgdStmRow|StmDetailRow|null  $stm
     */
    private function resolveVisitAt(?array $hosxp, $stm): ?string
    {
        if ($stm?->visit_at) {
            return $stm->visit_at->format('Y-m-d H:i:s');
        }

        $date = $hosxp['visit_date'] ?? optional($stm?->visit_date)->toDateString();
        if (! $date) {
            return null;
        }

        $time = $this->normalizeVisitTime($hosxp['visit_time'] ?? null);

        return $date.' '.$time;
    }

    private function normalizeVisitTime(mixed $time): string
    {
        $raw = trim((string) ($time ?? ''));
        if ($raw === '') {
            return '00:00:00';
        }

        if (preg_match('/^\d{1,2}:\d{2}(:\d{2})?$/', $raw)) {
            $parts = array_map('intval', explode(':', $raw));

            return sprintf('%02d:%02d:%02d', $parts[0] ?? 0, $parts[1] ?? 0, $parts[2] ?? 0);
        }

        $digits = preg_replace('/\D+/', '', $raw) ?? '';
        if (strlen($digits) >= 6) {
            return sprintf(
                '%02d:%02d:%02d',
                (int) substr($digits, 0, 2),
                (int) substr($digits, 2, 2),
                (int) substr($digits, 4, 2)
            );
        }
        if (strlen($digits) === 4) {
            return sprintf('%02d:%02d:00', (int) substr($digits, 0, 2), (int) substr($digits, 2, 2));
        }

        return '00:00:00';
    }

    private function prepareHeavyCompare(): void
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(300);
        DB::disableQueryLog();
        if (config('database.connections.hosxp')) {
            try {
                DB::connection('hosxp')->disableQueryLog();
            } catch (\Throwable) {
                // ignore
            }
        }
    }
}
