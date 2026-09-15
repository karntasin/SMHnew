<?php

namespace App\Services\Finance;

use App\Models\Finance\CgdAppealCase;
use App\Models\Finance\CgdAppealEvent;
use App\Models\Finance\CgdStmBatch;
use App\Models\Finance\CgdStmRow;
use App\Models\Finance\StmDetailRow;
use App\Models\Finance\StmImport;
use App\Support\Finance\ClaimScheme;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * อุทธรณ์เงินชดเชย
 *
 * 1) ไฟล์ APPEAL: แสดงรายการตาม SEQ
 *    - SEQ เดียวกันแต่ REP คนละเลข → ใช้ REP ที่ค่ามากกว่าเป็นรายการปัจจุบัน
 *      REP ที่น้อยกว่าเป็นประวัติ · สถานะอุทธรณ์สำเร็จ (approved)
 * 2) STM ที่พึงรับ ≠ เรียกเก็บ → สถานะรออุทธรณ์ (eligible)
 *    - ถ้า APPEAL ที่นำเข้าทีหลัง (ดูวันที่นำเข้า) มี REP + SEQ ตรงกับเคสรออุทธรณ์
 *      → อัปเดตเคสด้วยกฎข้อ 1
 * 3) STM ที่นำเข้าหลัง APPEAL และ REP+SEQ ตรงกับเคสอุทธรณ์
 *    → ยังขาดเงิน − พึงรับทั้งหมด(แท็บพึงรับ) = 0 → ได้รับเงินแล้ว (settled)
 *      ถ้ายังเหลือ → ยังขาดเงิน (still_short)
 */
class CgdAppealService
{
    public static function isAppealFilename(string $filename): bool
    {
        return str_contains(mb_strtoupper(basename($filename)), '_APPEAL');
    }

    public static function detectFileKind(string $filename): string
    {
        return self::isAppealFilename($filename) ? 'appeal' : 'rep';
    }

    /**
     * นำเข้าไฟล์ APPEAL: จัดกลุ่มตาม SEQ · REP สูงสุด = ปัจจุบัน · REP ต่ำกว่า = ประวัติ · สถานะสำเร็จ
     */
    public function syncFromAppealBatch(CgdStmBatch $batch): void
    {
        if (($batch->file_kind ?? '') !== 'appeal') {
            return;
        }

        $rows = CgdStmRow::query()
            ->where('batch_id', $batch->id)
            ->orderBy('id')
            ->get();

        if ($rows->isEmpty()) {
            return;
        }

        $baselines = $this->lookupBaselines($rows, (string) ($batch->scheme ?: ClaimScheme::CGD));

        /** @var array<string, list<CgdStmRow>> $groups */
        $groups = [];
        foreach ($rows as $row) {
            $seq = trim((string) ($row->seq_no ?? ''));
            if ($seq === '') {
                continue;
            }
            $hn = trim((string) ($row->hn ?? ''));
            $groupKey = $seq.'|'.$hn;
            $groups[$groupKey][] = $row;
        }

        DB::transaction(function () use ($groups, $batch, $baselines) {
            foreach ($groups as $groupRows) {
                $this->applyAppealSeqGroup(collect($groupRows), $batch, $baselines);
            }
        });
    }

    /**
     * สร้างเคสรออุทธรณ์จาก STM ที่เรียกเก็บ ≠ พึงรับ
     */
    public function ensureEligibleFromStmImport(StmImport $import): void
    {
        $seed = [];
        $import->details()
            ->whereRaw('ABS(COALESCE(amount_claim, 0) - COALESCE(amount_approved, 0)) >= 0.01')
            ->orderBy('id')
            ->select([
                'id',
                'hn',
                'pid',
                'seq_no',
                'patient_name',
                'rep_no',
                'claim_submission_no',
                'match_key',
                'amount_claim',
                'amount_approved',
            ])
            ->chunkById(500, function ($rows) use (&$seed, $import) {
                foreach ($rows as $row) {
                    $claim = (float) $row->amount_claim;
                    $approved = (float) $row->amount_approved;
                    $gap = round(abs($claim - $approved), 2);
                    if ($gap < 0.01) {
                        continue;
                    }

                    $seed[] = [
                        'match_key' => $row->match_key ?: CgdClaimMatchKey::make($row->hn, $row->pid, $row->seq_no),
                        'hn' => $row->hn,
                        'pid' => $row->pid,
                        'seq_no' => $row->seq_no,
                        'patient_name' => $row->patient_name,
                        'rep_no' => $row->rep_no,
                        'claim_submission_no' => $row->claim_submission_no ?: $import->claim_submission_no,
                        'amount_claim' => $claim,
                        'amount_approved' => $approved,
                        'shortfall' => $gap,
                        'source_label' => 'STM '.$import->claim_submission_no,
                        'source_imported_at' => optional($import->created_at)->toDateTimeString(),
                        'scheme' => ClaimScheme::CGD,
                    ];
                }
            });

        $this->ensureEligibleFromShortfalls($seed, ClaimScheme::CGD);
        $this->applySettlementFromStmImport($import);
    }

    /**
     * STM ที่นำเข้าหลังไฟล์ APPEAL: จับคู่ REP+SEQ กับเคสอุทธรณ์
     * ยังขาดเงิน − พึงรับทั้งหมด(แท็บพึงรับ) → 0 = ได้รับเงินแล้ว / >0 = ยังขาดเงิน
     */
    public function applySettlementFromStmImport(StmImport $import): int
    {
        $updated = 0;
        $importAt = $import->created_at ?? now();

        $import->details()
            ->whereNotNull('seq_no')
            ->where('seq_no', '!=', '')
            ->whereNotNull('rep_no')
            ->where('rep_no', '!=', '')
            ->orderBy('id')
            ->select(['id', 'seq_no', 'rep_no', 'hn', 'pid', 'match_key', 'amount_claim', 'amount_approved', 'patient_name'])
            ->chunkById(300, function ($rows) use ($import, $importAt, &$updated) {
                foreach ($rows as $row) {
                    $cases = CgdAppealCase::query()
                        ->where('scheme', ClaimScheme::CGD)
                        ->where('seq_no', (string) $row->seq_no)
                        ->whereIn('current_status', [
                            CgdAppealCase::STATUS_APPROVED,
                            CgdAppealCase::STATUS_STILL_SHORT,
                            CgdAppealCase::STATUS_SETTLED,
                        ])
                        ->whereNotNull('latest_appeal_batch_id')
                        ->with(['latestAppealBatch', 'events'])
                        ->get();

                    foreach ($cases as $case) {
                        if (! $this->stmImportedAfterAppeal($case, $importAt)) {
                            continue;
                        }
                        if (! $this->caseMatchesAppealRep($case, (string) $row->rep_no)) {
                            continue;
                        }
                        if ($this->applyStmSettlementToCase($case, $row, $import)) {
                            $updated++;
                        }
                    }
                }
            });

        return $updated;
    }

    /**
     * สแกนเคสอุทธรณ์สำเร็จแล้ว หา STM หลัง APPEAL ที่ REP+SEQ ตรงกันแล้วอัปเดตสถานะ
     */
    public function verifySettlements(string $scheme = ClaimScheme::CGD): int
    {
        $updated = 0;

        CgdAppealCase::query()
            ->where('scheme', $scheme)
            ->whereIn('current_status', [
                CgdAppealCase::STATUS_APPROVED,
                CgdAppealCase::STATUS_STILL_SHORT,
                CgdAppealCase::STATUS_SETTLED,
            ])
            ->whereNotNull('latest_appeal_batch_id')
            ->with(['latestAppealBatch', 'events'])
            ->orderBy('id')
            ->chunkById(100, function ($chunk) use (&$updated) {
                foreach ($chunk as $case) {
                    $row = $this->findFollowupStmDetail($case);
                    if (! $row) {
                        continue;
                    }
                    $import = $row->import;
                    if (! $import) {
                        continue;
                    }
                    if ($this->applyStmSettlementToCase($case, $row, $import)) {
                        $updated++;
                    }
                }
            });

        return $updated;
    }

    /**
     * สร้างเคสยอดขาดจากไฟล์ REP ปกติ (claim > approved) — ไม่ใช้ HOSxP
     * ถ้า REP/STM ล่าสุดชดเชยครบแล้ว จะไม่สร้างยอดค้าง (และเคลียร์เคสเก่าของ SEQ นั้น)
     */
    public function ensureEligibleFromRepBatch(CgdStmBatch $batch): void
    {
        if (($batch->file_kind ?? 'rep') === 'appeal') {
            return;
        }

        $rows = CgdStmRow::query()
            ->where('batch_id', $batch->id)
            ->orderBy('id')
            ->get();

        $scheme = (string) ($batch->scheme ?: ClaimScheme::CGD);
        $seed = [];
        foreach ($rows as $row) {
            $matchKey = $row->match_key ?: CgdClaimMatchKey::make($row->hn, $row->pid, $row->seq_no);
            $claim = (float) $row->amount_claim;
            $approved = (float) $row->amount_approved;
            $shortfall = round(max(0, $claim - $approved), 2);

            // ยอดล่าสุดของ SEQ (STM หรือ REP ที่ชดเชยสูงสุด) — กันเคสจาก REP เก่ายอด 0
            $effective = $this->effectiveAmountsForSeq(
                $matchKey,
                $row->seq_no ? (string) $row->seq_no : null,
                $row->hn ? (string) $row->hn : null,
                $scheme,
            );

            if ($effective !== null && $effective['shortfall'] < 0.01) {
                $this->closeCoveredAppealCase(
                    $matchKey,
                    $row->seq_no ? (string) $row->seq_no : null,
                    $row->hn ? (string) $row->hn : null,
                    $effective,
                    $scheme,
                );
                continue;
            }

            if ($shortfall < 0.01) {
                continue;
            }

            // ใช้ยอดที่มีผลจริง (เช่น STM ชดเชยบางส่วน) ถ้ามี
            if ($effective !== null) {
                $claim = $effective['amount_claim'];
                $approved = $effective['amount_approved'];
                $shortfall = $effective['shortfall'];
                if ($shortfall < 0.01) {
                    continue;
                }
            }

            $seed[] = [
                'match_key' => $matchKey,
                'hn' => $row->hn,
                'pid' => $row->pid,
                'seq_no' => $row->seq_no,
                'patient_name' => $row->patient_name,
                'rep_no' => $effective['rep_no'] ?? $row->rep_no,
                'claim_submission_no' => $effective['claim_submission_no'] ?? null,
                'amount_claim' => $claim,
                'amount_approved' => $approved,
                'shortfall' => $shortfall,
                'source_batch_id' => $batch->id,
                'source_label' => 'REP '.(string) ($effective['rep_no'] ?? $row->rep_no),
                'scheme' => $scheme,
            ];
        }

        $this->ensureEligibleFromShortfalls($seed, $scheme);
    }

    /**
     * สร้าง/อัปเดตเคสจากยอดขาดใน STM หรือ REP — จับคู่ด้วย SEQ/match_key
     *
     * @param  list<array<string,mixed>>  $shortfallRows
     */
    public function ensureEligibleFromShortfalls(array $shortfallRows, string $scheme = ClaimScheme::CGD): void
    {
        if ($shortfallRows === []) {
            return;
        }

        DB::transaction(function () use ($shortfallRows, $scheme) {
            $seen = [];

            foreach ($shortfallRows as $row) {
                $rowScheme = (string) ($row['scheme'] ?? $scheme);
                $matchKey = (string) ($row['match_key'] ?? '');
                if ($matchKey === '' || $matchKey === '||') {
                    $matchKey = CgdClaimMatchKey::make($row['hn'] ?? null, $row['pid'] ?? null, $row['seq_no'] ?? null);
                }
                if ($matchKey === '' || $matchKey === '||' || isset($seen[$rowScheme.'|'.$matchKey])) {
                    continue;
                }
                $seen[$rowScheme.'|'.$matchKey] = true;

                $claim = (float) ($row['amount_claim'] ?? 0);
                $approved = (float) ($row['amount_approved'] ?? 0);
                $shortfall = round(abs($claim - $approved), 2);
                if ($shortfall < 0.01) {
                    continue;
                }

                // ใช้ยอด STM ล่าสุด — ถ้าเรียกเก็บ = พึงรับแล้ว ไม่ต้องรออุทธรณ์
                $effective = $this->effectiveAmountsForSeq(
                    $matchKey,
                    isset($row['seq_no']) ? (string) $row['seq_no'] : null,
                    isset($row['hn']) ? (string) $row['hn'] : null,
                    $rowScheme,
                );
                if ($effective !== null && abs($effective['amount_claim'] - $effective['amount_approved']) < 0.01) {
                    $this->closeCoveredAppealCase(
                        $matchKey,
                        isset($row['seq_no']) ? (string) $row['seq_no'] : null,
                        isset($row['hn']) ? (string) $row['hn'] : null,
                        $effective,
                        $rowScheme,
                    );
                    continue;
                }
                if ($effective !== null) {
                    $claim = $effective['amount_claim'];
                    $approved = $effective['amount_approved'];
                    $shortfall = round(abs($claim - $approved), 2);
                    if (! empty($effective['rep_no'])) {
                        $row['rep_no'] = $effective['rep_no'];
                    }
                    if (! empty($effective['claim_submission_no'])) {
                        $row['claim_submission_no'] = $effective['claim_submission_no'];
                    }
                }

                // ไม่ทับเคสที่มีผล APPEAL แล้ว (สำเร็จ / ไม่สำเร็จ) — แต่เคสยังไม่สำเร็จ (ไม่มีใน STM) ให้อัปเดตจาก STM ได้
                $case = $this->findCaseBySeq($matchKey, $row['seq_no'] ?? null, $row['hn'] ?? null, [
                    CgdAppealCase::STATUS_ELIGIBLE,
                    CgdAppealCase::STATUS_SUBMITTED,
                    CgdAppealCase::STATUS_DENIED,
                    CgdAppealCase::STATUS_PARTIAL,
                    CgdAppealCase::STATUS_APPROVED,
                    CgdAppealCase::STATUS_SETTLED,
                    CgdAppealCase::STATUS_STILL_SHORT,
                    CgdAppealCase::STATUS_NO_PRIOR,
                ], $rowScheme);

                if ($case && in_array($case->current_status, [
                    CgdAppealCase::STATUS_APPROVED,
                    CgdAppealCase::STATUS_SETTLED,
                    CgdAppealCase::STATUS_STILL_SHORT,
                    CgdAppealCase::STATUS_DENIED,
                    CgdAppealCase::STATUS_PARTIAL,
                ], true)) {
                    continue;
                }

                if (! $case) {
                    $case = new CgdAppealCase([
                        'scheme' => $rowScheme,
                        'match_key' => $matchKey,
                        'rep_no' => $row['rep_no'] ?? null,
                        'first_seen_at' => now(),
                        'appeal_count' => 0,
                        'original_batch_id' => $row['source_batch_id'] ?? null,
                    ]);
                } elseif (! $case->scheme) {
                    $case->scheme = $rowScheme;
                }

                $isNew = ! $case->exists;
                $sourceLabel = (string) ($row['source_label'] ?? 'STM');
                $wasAppealOnly = $case->exists
                    && $case->current_status === CgdAppealCase::STATUS_NO_PRIOR;

                // อัปเดตเคสรออุทธรณ์ / ยื่นแล้ว / ยังไม่สำเร็จ (รอ STM) — ไม่ทับผล APPEAL สำเร็จ/ไม่สำเร็จ
                if ($isNew || $wasAppealOnly || in_array($case->current_status, [
                    CgdAppealCase::STATUS_ELIGIBLE,
                    CgdAppealCase::STATUS_SUBMITTED,
                ], true)) {
                    $case->fill([
                        'hn' => $row['hn'] ?? $case->hn,
                        'pid' => $row['pid'] ?? $case->pid,
                        'seq_no' => $row['seq_no'] ?? $case->seq_no,
                        'patient_name' => $row['patient_name'] ?? $case->patient_name,
                        'rep_no' => $case->rep_no ?: ($row['rep_no'] ?? null),
                        'claim_submission_no' => $row['claim_submission_no'] ?? $case->claim_submission_no,
                        'original_amount_claim' => $claim,
                        'original_amount_approved' => $approved,
                        'original_shortfall' => $shortfall,
                        'appeal_amount_requested' => $shortfall,
                        'current_amount_approved' => ($isNew || $wasAppealOnly)
                            ? $approved
                            : (float) $case->current_amount_approved,
                        'current_status' => $case->current_status === CgdAppealCase::STATUS_SUBMITTED
                            ? CgdAppealCase::STATUS_SUBMITTED
                            : CgdAppealCase::STATUS_ELIGIBLE,
                        'last_updated_at' => now(),
                    ]);
                    if ($isNew) {
                        $case->first_seen_at = now();
                        $case->appeal_count = 0;
                    }
                    if (! $case->original_batch_id && ! empty($row['source_batch_id'])) {
                        $case->original_batch_id = $row['source_batch_id'];
                    }
                    $case->save();

                    if ($isNew || $wasAppealOnly) {
                        $this->addEvent($case, CgdAppealEvent::TYPE_DETECTED_SHORTFALL, null, [
                            'amount_approved_before' => null,
                            'amount_approved_after' => $approved,
                            'appeal_amount_before' => null,
                            'appeal_amount_after' => 0,
                            'note' => ($wasAppealOnly
                                    ? 'พบ SEQ ใน STM แล้ว — '
                                    : '')
                                .'พบยอดเรียกเก็บ ≠ พึงรับจาก '.$sourceLabel
                                .' (SEQ '.$case->seq_no.') — สถานะรออุทธรณ์',
                        ]);
                    }
                }
            }
        });
    }

    /**
     * @param  list<int>  $caseIds
     */
    public function markSubmitted(array $caseIds, ?int $userId = null, ?string $note = null): int
    {
        $caseIds = array_values(array_unique(array_filter(array_map('intval', $caseIds))));
        if ($caseIds === []) {
            return 0;
        }

        $userId = $userId ?? Auth::id();
        $updated = 0;

        DB::transaction(function () use ($caseIds, $userId, $note, &$updated) {
            $cases = CgdAppealCase::query()
                ->whereIn('id', $caseIds)
                ->whereIn('current_status', [
                    CgdAppealCase::STATUS_ELIGIBLE,
                    CgdAppealCase::STATUS_DENIED,
                    CgdAppealCase::STATUS_PARTIAL,
                ])
                ->get();

            foreach ($cases as $case) {
                $case->current_status = CgdAppealCase::STATUS_SUBMITTED;
                $case->last_updated_at = now();
                $case->save();

                $this->addEvent($case, CgdAppealEvent::TYPE_MARKED_SUBMITTED, null, [
                    'amount_approved_before' => (float) $case->current_amount_approved,
                    'amount_approved_after' => (float) $case->current_amount_approved,
                    'appeal_amount_before' => (float) $case->appeal_amount_approved,
                    'appeal_amount_after' => (float) $case->appeal_amount_approved,
                    'note' => $note ?: 'ทำเครื่องหมายว่ายื่นอุทธรณ์เงินชดเชยแล้ว (รอไฟล์ APPEAL)',
                    'created_by' => $userId,
                ]);
                $updated++;
            }
        });

        return $updated;
    }

    /**
     * Rebuild: จาก STM (เรียกเก็บ ≠ พึงรับ) แล้วใส่ผล APPEAL ตามลำดับ
     *
     * @return array{cases:int,events:int,appeal_batches:int}
     */
    public function rebuildAll(): array
    {
        return DB::transaction(function () {
            CgdAppealEvent::query()->delete();
            CgdAppealCase::query()->delete();

            // 1) รออุทธรณ์จาก STM ที่เรียกเก็บ ≠ พึงรับ
            StmDetailRow::query()
                ->whereRaw('ABS(COALESCE(amount_claim,0) - COALESCE(amount_approved,0)) >= 0.01')
                ->orderBy('id')
                ->chunkById(500, function ($chunk) {
                    $seed = $chunk->map(function (StmDetailRow $row) {
                        $claim = (float) $row->amount_claim;
                        $approved = (float) $row->amount_approved;

                        return [
                            'match_key' => $row->match_key,
                            'hn' => $row->hn,
                            'pid' => $row->pid,
                            'seq_no' => $row->seq_no,
                            'patient_name' => $row->patient_name,
                            'rep_no' => $row->rep_no,
                            'claim_submission_no' => $row->claim_submission_no,
                            'amount_claim' => $claim,
                            'amount_approved' => $approved,
                            'shortfall' => round(abs($claim - $approved), 2),
                            'source_label' => 'STM '.($row->claim_submission_no ?: ''),
                            'scheme' => ClaimScheme::CGD,
                        ];
                    })->all();
                    $this->ensureEligibleFromShortfalls($seed, ClaimScheme::CGD);
                });

            // 2) ผล APPEAL ตามลำดับนำเข้า → อุทธรณ์สำเร็จ (REP สูงสุด / ประวัติ REP ต่ำกว่า)
            $appealBatches = CgdStmBatch::query()
                ->where('file_kind', 'appeal')
                ->where(function ($q) {
                    CgdClaimFilenameGuard::constrainBatchQueryAnyScheme($q);
                })
                ->orderBy('id')
                ->get();

            foreach ($appealBatches as $batch) {
                $this->syncFromAppealBatch($batch);
            }

            // 3) STM หลัง APPEAL → ได้รับเงินแล้ว / ยังขาดเงิน
            $settlements = $this->verifySettlements(ClaimScheme::CGD);

            return [
                'cases' => CgdAppealCase::query()->count(),
                'events' => CgdAppealEvent::query()->count(),
                'appeal_batches' => $appealBatches->count(),
                'settlements_checked' => $settlements,
            ];
        });
    }

    /**
     * ยอดที่มีผลของ SEQ: ใช้ STM ก่อน ถ้าไม่มีใช้ REP ที่ชดเชยสูงสุด
     * (กันสร้างยอดค้างจาก REP เก่ายอดอนุมัติ 0 ทั้งที่ REP/STM หลังจ่ายครบ)
     *
     * @return array{amount_claim:float,amount_approved:float,shortfall:float,rep_no:?string,claim_submission_no:?string,source:string}|null
     */
    private function effectiveAmountsForSeq(
        ?string $matchKey,
        ?string $seqNo,
        ?string $hn,
        string $scheme = ClaimScheme::CGD,
    ): ?array
    {
        $matchKey = $matchKey && $matchKey !== '||' ? $matchKey : null;
        $seqNo = $seqNo !== null && $seqNo !== '' ? $seqNo : null;
        $hn = $hn !== null && $hn !== '' ? $hn : null;

        if (! $matchKey && ! $seqNo) {
            return null;
        }

        // STM มีเฉพาะ CGD
        if ($scheme === ClaimScheme::CGD) {
            $stmQuery = StmDetailRow::query()->orderByDesc('id');
            if ($matchKey) {
                $stmQuery->where('match_key', $matchKey);
            } elseif ($seqNo) {
                $stmQuery->where('seq_no', $seqNo);
                if ($hn) {
                    $stmQuery->where('hn', $hn);
                }
            }
            $stm = $stmQuery->first();
            if ($stm) {
                $claim = (float) $stm->amount_claim;
                $approved = (float) $stm->amount_approved;

                return [
                    'amount_claim' => $claim,
                    'amount_approved' => $approved,
                    'shortfall' => round(max(0, $claim - $approved), 2),
                    'rep_no' => $stm->rep_no ? (string) $stm->rep_no : null,
                    'claim_submission_no' => $stm->claim_submission_no ? (string) $stm->claim_submission_no : null,
                    'source' => 'STM',
                ];
            }
        }

        $repQuery = CgdStmRow::query()
            ->whereHas('batch', function ($q) use ($scheme) {
                $q->where(function ($inner) {
                    $inner->where('file_kind', 'rep')->orWhereNull('file_kind');
                });
                $q->where('scheme', $scheme);
                CgdClaimFilenameGuard::constrainBatchQuery($q, $scheme);
            });
        if ($matchKey) {
            $repQuery->where('match_key', $matchKey);
        } else {
            $repQuery->where('seq_no', $seqNo);
            if ($hn) {
                $repQuery->where('hn', $hn);
            }
        }

        $best = $repQuery
            ->orderByDesc('amount_approved')
            ->orderByDesc('id')
            ->first();

        if (! $best) {
            return null;
        }

        $claim = (float) $best->amount_claim;
        $approved = (float) $best->amount_approved;

        return [
            'amount_claim' => $claim,
            'amount_approved' => $approved,
            'shortfall' => round(max(0, $claim - $approved), 2),
            'rep_no' => $best->rep_no ? (string) $best->rep_no : null,
            'claim_submission_no' => null,
            'source' => 'REP',
        ];
    }

    /**
     * เคลียร์เคสอุทธรณ์ที่ยอดจริงชดเชยครบแล้ว — ลบถ้ายังไม่เคยมีผล APPEAL
     *
     * @param  array{amount_claim:float,amount_approved:float,shortfall:float,rep_no:?string,claim_submission_no:?string,source?:string}  $effective
     */
    private function closeCoveredAppealCase(
        ?string $matchKey,
        ?string $seqNo,
        ?string $hn,
        array $effective,
        string $scheme = ClaimScheme::CGD,
    ): void {
        $case = $this->findCaseBySeq($matchKey, $seqNo, $hn, [
            CgdAppealCase::STATUS_ELIGIBLE,
            CgdAppealCase::STATUS_SUBMITTED,
            CgdAppealCase::STATUS_DENIED,
            CgdAppealCase::STATUS_PARTIAL,
        ], $scheme);

        if (! $case) {
            return;
        }

        $hasAppealResult = CgdAppealEvent::query()
            ->where('appeal_case_id', $case->id)
            ->whereIn('event_type', [
                CgdAppealEvent::TYPE_APPROVED,
                CgdAppealEvent::TYPE_DENIED,
                CgdAppealEvent::TYPE_PARTIAL,
                CgdAppealEvent::TYPE_APPEAL_IMPORTED,
                CgdAppealEvent::TYPE_NO_PRIOR,
            ])
            ->exists();

        // ยังไม่เคยได้ผล APPEAL = ยอดค้างปลอมจาก REP เก่า → ลบออก
        if (! $hasAppealResult && (int) $case->appeal_count === 0) {
            CgdAppealEvent::query()->where('appeal_case_id', $case->id)->delete();
            $case->delete();

            return;
        }

        $before = (float) $case->current_amount_approved;
        $approved = (float) $effective['amount_approved'];
        $claim = (float) $effective['amount_claim'];
        $source = (string) ($effective['source'] ?? 'STM/REP');
        $repHint = $effective['rep_no'] ?? $case->rep_no;

        $case->fill([
            'rep_no' => $case->rep_no ?: $repHint,
            'claim_submission_no' => $case->claim_submission_no
                ?: ($effective['claim_submission_no'] ?? null),
            'original_amount_claim' => $claim > 0 ? $claim : (float) $case->original_amount_claim,
            'current_amount_approved' => $approved,
            'original_shortfall' => 0,
            'appeal_amount_requested' => 0,
            'current_status' => CgdAppealCase::STATUS_APPROVED,
            'last_updated_at' => now(),
        ]);
        $case->save();

        $this->addEvent($case, CgdAppealEvent::TYPE_APPROVED, null, [
            'amount_approved_before' => $before,
            'amount_approved_after' => $approved,
            'appeal_amount_before' => (float) $case->appeal_amount_approved,
            'appeal_amount_after' => (float) $case->appeal_amount_approved,
            'note' => 'ชดเชยครบจาก '.$source
                .($repHint ? ' '.$repHint : '')
                .' (SEQ '.$case->seq_no.') — ไม่ใช่ยอดค้างอุทธรณ์',
        ]);
    }

    /**
     * สแกนเคส eligible ที่ STM/REP ล่าสุดชดเชยครบแล้วแล้วเคลียร์
     */
    public function closeAllCoveredEligibleCases(): int
    {
        $closed = 0;
        CgdAppealCase::query()
            ->whereIn('current_status', [
                CgdAppealCase::STATUS_ELIGIBLE,
                CgdAppealCase::STATUS_SUBMITTED,
                CgdAppealCase::STATUS_DENIED,
                CgdAppealCase::STATUS_PARTIAL,
            ])
            ->orderBy('id')
            ->chunkById(200, function ($chunk) use (&$closed) {
                foreach ($chunk as $case) {
                    $scheme = (string) ($case->scheme ?: ClaimScheme::CGD);
                    $effective = $this->effectiveAmountsForSeq(
                        $case->match_key,
                        $case->seq_no ? (string) $case->seq_no : null,
                        $case->hn ? (string) $case->hn : null,
                        $scheme,
                    );
                    if ($effective === null
                        || abs($effective['amount_claim'] - $effective['amount_approved']) >= 0.01) {
                        continue;
                    }
                    $id = $case->id;
                    $this->closeCoveredAppealCase(
                        $case->match_key,
                        $case->seq_no ? (string) $case->seq_no : null,
                        $case->hn ? (string) $case->hn : null,
                        $effective,
                        $scheme,
                    );
                    if (! CgdAppealCase::query()->where('id', $id)->exists()
                        || CgdAppealCase::query()->where('id', $id)->where('current_status', CgdAppealCase::STATUS_APPROVED)->exists()) {
                        $closed++;
                    }
                }
            });

        return $closed;
    }

    /**
     * @param  list<string>  $repNos
     * @param  list<string>  $matchKeys
     * @param  list<array<string,mixed>>  $shortfallSeed
     * @return array{cases: list<array<string,mixed>>, status_counts: array<string,int>}
     */
    public function casesForScope(
        array $repNos,
        array $matchKeys = [],
        ?string $claimSubmissionNo = null,
        ?string $statusFilter = null,
        array $shortfallSeed = [],
        string $scheme = ClaimScheme::CGD,
        bool $includeCases = true,
    ): array {
        $repNos = array_values(array_unique(array_filter(array_map('strval', $repNos))));
        $matchKeys = array_values(array_unique(array_filter(array_map('strval', $matchKeys))));

        if ($shortfallSeed !== []) {
            $this->ensureEligibleFromShortfalls($shortfallSeed, $scheme);
        }

        if ($repNos === [] && $matchKeys === [] && ! $claimSubmissionNo) {
            return ['cases' => [], 'status_counts' => $this->emptyStatusCounts()];
        }

        $base = CgdAppealCase::query()
            ->where('scheme', $scheme)
            ->where(function ($q) use ($repNos, $matchKeys, $claimSubmissionNo, $scheme) {
                if ($repNos !== []) {
                    $q->orWhereIn('rep_no', $repNos);
                }
                if ($matchKeys !== []) {
                    $q->orWhereIn('match_key', $matchKeys);
                }
                if ($claimSubmissionNo) {
                    $q->orWhere('claim_submission_no', $claimSubmissionNo);
                }
                // รายการจาก APPEAL ของ scheme นี้ที่ยังไม่ผูก STM
                $q->orWhere(function ($orphan) use ($scheme) {
                    $orphan->where('scheme', $scheme)
                        ->whereNull('claim_submission_no')
                        ->whereNotNull('latest_appeal_batch_id')
                        ->where(function ($inner) {
                            $inner->whereNull('original_batch_id')
                                ->orWhere('current_status', CgdAppealCase::STATUS_NO_PRIOR);
                        });
                });
            });

        $waitingQuery = (clone $base)->whereIn('current_status', [
            CgdAppealCase::STATUS_ELIGIBLE,
            CgdAppealCase::STATUS_SUBMITTED,
        ]);

        $statusCounts = [
            'all' => (clone $base)->count(),
            'outstanding' => (clone $waitingQuery)->count(),
            CgdAppealCase::STATUS_ELIGIBLE => (clone $base)->where('current_status', CgdAppealCase::STATUS_ELIGIBLE)->count(),
            CgdAppealCase::STATUS_SUBMITTED => (clone $base)->where('current_status', CgdAppealCase::STATUS_SUBMITTED)->count(),
            CgdAppealCase::STATUS_APPROVED => (clone $base)->where('current_status', CgdAppealCase::STATUS_APPROVED)->count(),
            CgdAppealCase::STATUS_SETTLED => (clone $base)->where('current_status', CgdAppealCase::STATUS_SETTLED)->count(),
            CgdAppealCase::STATUS_STILL_SHORT => (clone $base)->where('current_status', CgdAppealCase::STATUS_STILL_SHORT)->count(),
            CgdAppealCase::STATUS_DENIED => (clone $base)->whereIn('current_status', [
                CgdAppealCase::STATUS_DENIED,
                CgdAppealCase::STATUS_PARTIAL,
            ])->count(),
            CgdAppealCase::STATUS_PARTIAL => (clone $base)->where('current_status', CgdAppealCase::STATUS_PARTIAL)->count(),
            CgdAppealCase::STATUS_NO_PRIOR => (clone $base)->where('current_status', CgdAppealCase::STATUS_NO_PRIOR)->count(),
        ];

        if (! $includeCases) {
            return ['cases' => [], 'status_counts' => $statusCounts];
        }

        $query = (clone $base)
            ->with(['events' => fn ($q) => $q->orderByDesc('id')->limit(30)])
            ->orderByRaw("FIELD(current_status,'eligible','submitted','approved','denied','partial','no_prior_rep','still_short','settled')")
            ->orderBy('rep_no')
            ->orderBy('hn')
            ->orderBy('seq_no');

        if ($statusFilter === 'all') {
            // ทุกสถานะ
        } elseif ($statusFilter === 'outstanding' || $statusFilter === null || $statusFilter === '') {
            $query->whereIn('current_status', [
                CgdAppealCase::STATUS_ELIGIBLE,
                CgdAppealCase::STATUS_SUBMITTED,
            ]);
        } elseif ($statusFilter === CgdAppealCase::STATUS_DENIED) {
            $query->whereIn('current_status', [
                CgdAppealCase::STATUS_DENIED,
                CgdAppealCase::STATUS_PARTIAL,
            ]);
        } elseif (is_string($statusFilter) && $statusFilter !== '') {
            $query->where('current_status', $statusFilter);
        }

        $cases = $query->get();
        $eventRepMap = $this->buildEventRepMap($cases);
        $lowerRepMap = $this->buildLowerRepAppealAmountMap($cases);

        return [
            'cases' => $cases->map(
                fn (CgdAppealCase $case) => $this->serializeCase($case, $eventRepMap, $lowerRepMap[$case->id] ?? null)
            )->all(),
            'status_counts' => $statusCounts,
        ];
    }

    /**
     * @param  list<string>  $repNos
     * @param  list<array<string,mixed>>  $shortfallSeed
     * @return array{cases: list<array<string,mixed>>, status_counts: array<string,int>}
     */
    public function casesForRepNos(array $repNos, ?string $statusFilter = null, array $shortfallSeed = [], string $scheme = ClaimScheme::CGD): array
    {
        return $this->casesForScope($repNos, [], null, $statusFilter, $shortfallSeed, $scheme);
    }

    /**
     * @return array<string, CgdAppealCase>
     */
    public function casesByMatchKey(array $matchKeys): array
    {
        $matchKeys = array_values(array_unique(array_filter($matchKeys)));
        if ($matchKeys === []) {
            return [];
        }

        $map = [];
        foreach (array_chunk($matchKeys, 500) as $chunk) {
            CgdAppealCase::query()
                ->whereIn('match_key', $chunk)
                ->orderByDesc('id')
                ->get()
                ->each(function (CgdAppealCase $case) use (&$map) {
                    if ($case->match_key && ! isset($map[$case->match_key])) {
                        $map[$case->match_key] = $case;
                    }
                });
        }

        return $map;
    }

    /**
     * @param  array<string,string>  $eventRepMap
     * @param  array{rep_no:?string,amount_approved:float,amount_claim:float}|null  $lowerRepAmounts
     * @return array<string,mixed>
     */
    public function serializeCase(CgdAppealCase $case, array $eventRepMap = [], ?array $lowerRepAmounts = null): array
    {
        $claim = (float) $case->original_amount_claim;
        $priorApproved = (float) $case->original_amount_approved;
        $approved = (float) $case->current_amount_approved;
        $shortfallDue = round((float) $case->original_shortfall, 2);
        if ($shortfallDue < 0.01) {
            $shortfallDue = round(max(0, $claim - $priorApproved), 2);
        }
        $fromAppealFile = $lowerRepAmounts !== null || filled($case->latest_appeal_batch_id);

        // ไฟล์ APPEAL: แสดงชดเชยสุทธิจากบรรทัด REP ที่ค่าน้อยกว่า (ไม่ใช้คอลัมน์ Detail เช่น ค่ารักษา)
        $netCompensation = $fromAppealFile && $lowerRepAmounts !== null
            ? (float) $lowerRepAmounts['amount_approved']
            : null;
        $lowerRepNo = $fromAppealFile && $lowerRepAmounts !== null
            ? ($lowerRepAmounts['rep_no'] ?? null)
            : null;

        if ($case->current_status === CgdAppealCase::STATUS_SETTLED) {
            $remaining = 0.0;
        } elseif ($case->current_status === CgdAppealCase::STATUS_STILL_SHORT) {
            $remaining = round(max(0, $shortfallDue - $approved), 2);
        } elseif ($fromAppealFile && $netCompensation !== null) {
            $remaining = round(max(0, $claim - $netCompensation), 2);
        } else {
            $remaining = round(max(0, $claim - $approved), 2);
        }

        return [
            'id' => $case->id,
            'match_key' => $case->match_key,
            'hn' => $case->hn,
            'pid' => $case->pid,
            'seq_no' => $case->seq_no,
            'patient_name' => $case->patient_name,
            'rep_no' => $case->rep_no,
            'claim_submission_no' => $case->claim_submission_no,
            'original_amount_claim' => $claim,
            'original_amount_approved' => $priorApproved,
            'original_shortfall' => $shortfallDue,
            'remaining_shortfall' => $remaining,
            'followup_stm_approved' => in_array($case->current_status, [
                CgdAppealCase::STATUS_SETTLED,
                CgdAppealCase::STATUS_STILL_SHORT,
            ], true) ? $approved : null,
            'current_status' => $case->current_status,
            'appeal_amount_requested' => (float) $case->appeal_amount_requested,
            'appeal_amount_approved' => (float) $case->appeal_amount_approved,
            'current_amount_approved' => $approved,
            'from_appeal_file' => $fromAppealFile,
            'lower_rep_no' => $lowerRepNo,
            'amount_net_compensation' => $netCompensation,
            'appeal_count' => (int) $case->appeal_count,
            'first_seen_at' => optional($case->first_seen_at)->toDateTimeString(),
            'last_updated_at' => optional($case->last_updated_at)->toDateTimeString(),
            'events' => $case->relationLoaded('events')
                ? $case->events->map(function (CgdAppealEvent $e) use ($case, $eventRepMap) {
                    $isAppealFile = in_array($e->event_type, [
                        CgdAppealEvent::TYPE_APPROVED,
                        CgdAppealEvent::TYPE_DENIED,
                        CgdAppealEvent::TYPE_PARTIAL,
                        CgdAppealEvent::TYPE_APPEAL_IMPORTED,
                        CgdAppealEvent::TYPE_NO_PRIOR,
                    ], true);

                    $mappedRep = null;
                    if ($e->batch_id) {
                        $mappedRep = $eventRepMap[$e->batch_id.'|'.$case->match_key]
                            ?? $eventRepMap[$e->batch_id.'|*']
                            ?? null;
                        if (is_string($mappedRep) && str_starts_with(strtoupper($mappedRep), 'APPEAL')) {
                            $mappedRep = null;
                        }
                    }

                    return [
                        'id' => $e->id,
                        'event_type' => $e->event_type,
                        'batch_id' => $e->batch_id,
                        'rep_no' => $e->rep_no ?: ($mappedRep ?: $case->rep_no),
                        'from_appeal_file' => $isAppealFile,
                        'is_history_rep' => $e->event_type === CgdAppealEvent::TYPE_APPEAL_IMPORTED,
                        'amount_approved_before' => $e->amount_approved_before !== null ? (float) $e->amount_approved_before : null,
                        'amount_approved_after' => $e->amount_approved_after !== null ? (float) $e->amount_approved_after : null,
                        'appeal_amount_before' => $e->appeal_amount_before !== null ? (float) $e->appeal_amount_before : null,
                        'appeal_amount_after' => $e->appeal_amount_after !== null ? (float) $e->appeal_amount_after : null,
                        'note' => $e->note,
                        'created_at' => optional($e->created_at)->toDateTimeString(),
                    ];
                })->values()->all()
                : [],
        ];
    }

    /**
     * ดึงยอดชดเชยสุทธิจากบรรทัด REP ที่ค่าน้อยที่สุดในไฟล์ APPEAL ของแต่ละเคส
     *
     * @param  Collection<int, CgdAppealCase>  $cases
     * @return array<int, array{rep_no:?string,amount_approved:float,amount_claim:float}>
     */
    private function buildLowerRepAppealAmountMap(Collection $cases): array
    {
        $batchIds = $cases->pluck('latest_appeal_batch_id')->filter()->unique()->values()->all();
        if ($batchIds === []) {
            return [];
        }

        $seqNos = $cases->pluck('seq_no')->filter()->unique()->values()->all();
        $rows = CgdStmRow::query()
            ->whereIn('batch_id', $batchIds)
            ->when($seqNos !== [], fn ($q) => $q->whereIn('seq_no', $seqNos))
            ->get(['id', 'batch_id', 'seq_no', 'hn', 'rep_no', 'amount_claim', 'amount_approved']);

        $map = [];
        foreach ($cases as $case) {
            if (! $case->latest_appeal_batch_id || ! filled($case->seq_no)) {
                continue;
            }

            $matched = $rows->filter(function (CgdStmRow $row) use ($case) {
                if ((int) $row->batch_id !== (int) $case->latest_appeal_batch_id) {
                    return false;
                }
                if ((string) $row->seq_no !== (string) $case->seq_no) {
                    return false;
                }
                if (filled($case->hn) && filled($row->hn) && (string) $row->hn !== (string) $case->hn) {
                    return false;
                }

                return true;
            });

            if ($matched->isEmpty()) {
                continue;
            }

            /** @var array<string, CgdStmRow> $byRep */
            $byRep = [];
            foreach ($matched as $row) {
                $rep = trim((string) ($row->rep_no ?? ''));
                $key = $rep !== '' ? $rep : '__empty__';
                if (! isset($byRep[$key])
                    || round((float) $row->amount_approved, 2) > round((float) $byRep[$key]->amount_approved, 2)) {
                    $byRep[$key] = $row;
                }
            }

            $repKeys = array_keys($byRep);
            usort($repKeys, fn (string $a, string $b) => $this->compareRepNoDesc($a, $b));
            $lowestKey = $repKeys[count($repKeys) - 1];
            $lower = $byRep[$lowestKey];

            $map[$case->id] = [
                'rep_no' => $lowestKey === '__empty__' ? null : $lowestKey,
                'amount_approved' => round((float) $lower->amount_approved, 2),
                'amount_claim' => round((float) $lower->amount_claim, 2),
            ];
        }

        return $map;
    }

    /**
     * จัดกลุ่มแถว APPEAL ของ SEQ เดียวกัน:
     * REP ค่ามากกว่า = รายการปัจจุบัน · REP ค่าน้อยกว่า = ประวัติ · สถานะอุทธรณ์สำเร็จ
     * ถ้ามีเคสรออุทธรณ์ (STM) ที่ REP+SEQ ตรง และ APPEAL นำเข้าทีหลัง → อัปเดตเคสนั้น
     *
     * @param  Collection<int, CgdStmRow>  $rows
     * @param  array<string, array{amount_claim?:float,amount_approved?:float,claim_submission_no?:?string,batch_id?:?int,rep_no?:?string}>  $baselines
     */
    private function applyAppealSeqGroup(Collection $rows, CgdStmBatch $batch, array $baselines): void
    {
        if ($rows->isEmpty()) {
            return;
        }

        /** @var array<string, CgdStmRow> $byRep */
        $byRep = [];
        foreach ($rows as $row) {
            $rep = trim((string) ($row->rep_no ?? ''));
            $key = $rep !== '' ? $rep : '__empty__';
            if (! isset($byRep[$key])) {
                $byRep[$key] = $row;
                continue;
            }
            if (round((float) $row->amount_approved, 2)
                > round((float) $byRep[$key]->amount_approved, 2)) {
                $byRep[$key] = $row;
            }
        }
        $repKeys = array_keys($byRep);
        usort($repKeys, fn (string $a, string $b) => $this->compareRepNoDesc($a, $b));
        $currentRepKey = $repKeys[0];
        $currentRow = $byRep[$currentRepKey];
        $currentRep = $currentRepKey === '__empty__' ? null : $currentRepKey;
        $historyRepKeys = array_slice($repKeys, 1);
        $matchKey = $currentRow->match_key
            ?: CgdClaimMatchKey::make($currentRow->hn, $currentRow->pid, $currentRow->seq_no);
        if ($matchKey === '' || $matchKey === '||') {
            return;
        }
        $appealReps = array_values(array_filter(
            array_map(fn (string $k) => $k === '__empty__' ? null : $k, $repKeys),
        ));
        $baseline = $baselines[$matchKey] ?? null;
        $scheme = (string) ($batch->scheme ?: ClaimScheme::CGD);
        $case = $this->findCaseForAppealUpdate(
            $matchKey,
            $currentRow->seq_no ? (string) $currentRow->seq_no : null,
            $currentRow->hn ? (string) $currentRow->hn : null,
            $appealReps,
            $scheme,
        );
        if ($case && in_array($case->current_status, [
            CgdAppealCase::STATUS_ELIGIBLE,
            CgdAppealCase::STATUS_SUBMITTED,
        ], true)) {
            $caseRep = filled($case->rep_no) ? (string) $case->rep_no : null;
            $repMatched = $caseRep !== null && in_array($caseRep, $appealReps, true);
            if (! $repMatched || ! $this->appealImportedAfterCase($batch, $case)) {
                $existingApproved = $this->findCaseBySeq($matchKey, $currentRow->seq_no, $currentRow->hn, [
                    CgdAppealCase::STATUS_APPROVED,
                ], $scheme);
                $case = $existingApproved ?: null;
            }
        }
        $docHint = $batch->document_no ?: $batch->filename;
        $appealClaim = round((float) $currentRow->amount_claim, 2);
        $appealApproved = round((float) $currentRow->amount_approved, 2);
        $fromWaiting = $case && in_array($case->current_status, [
            CgdAppealCase::STATUS_ELIGIBLE,
            CgdAppealCase::STATUS_SUBMITTED,
        ], true);
        if ($fromWaiting) {
            $originalClaim = (float) $case->original_amount_claim > 0
                ? (float) $case->original_amount_claim
                : (float) ($baseline['amount_claim'] ?? $appealClaim);
            $originalApproved = (float) $case->original_amount_approved;
            $originalRep = $case->rep_no;
        } elseif ($baseline) {
            $originalClaim = (float) ($baseline['amount_claim'] ?? $appealClaim);
            $originalApproved = (float) ($baseline['amount_approved'] ?? 0);
            $originalRep = $baseline['rep_no'] ?? null;
        } else {
            $originalClaim = $appealClaim;
            $originalApproved = 0.0;
            $originalRep = null;
        }
        $originalShortfall = round(abs($originalClaim - $originalApproved), 2);
        $extraPay = round(max(0, $appealApproved - $originalApproved), 2);
        if (! $case) {
            $case = new CgdAppealCase([
                'scheme' => $scheme,
                'match_key' => $matchKey,
                'rep_no' => $currentRep,
                'original_batch_id' => $baseline['batch_id'] ?? null,
                'first_seen_at' => now(),
                'appeal_count' => 0,
            ]);
        } elseif (! $case->scheme) {
            $case->scheme = $scheme;
        }
        $beforeApproved = $case->exists ? (float) $case->current_amount_approved : $originalApproved;
        $beforeAppealAmt = $case->exists ? (float) $case->appeal_amount_approved : 0.0;
        $alreadyCounted = $case->exists && CgdAppealEvent::query()
            ->where('appeal_case_id', $case->id)
            ->where('batch_id', $batch->id)
            ->whereIn('event_type', [
                CgdAppealEvent::TYPE_APPROVED,
                CgdAppealEvent::TYPE_APPEAL_IMPORTED,
            ])
            ->exists();
        $case->fill([
            'hn' => $currentRow->hn ?: $case->hn,
            'pid' => $currentRow->pid ?: $case->pid,
            'seq_no' => $currentRow->seq_no ?: $case->seq_no,
            'patient_name' => $currentRow->patient_name ?: $case->patient_name,
            'rep_no' => $currentRep ?: ($case->rep_no ?: $originalRep),
            'claim_submission_no' => $case->claim_submission_no
                ?: ($baseline['claim_submission_no'] ?? null),
            'original_amount_claim' => $originalClaim,
            'original_amount_approved' => $originalApproved,
            'original_shortfall' => $originalShortfall,
            'appeal_amount_requested' => $originalShortfall,
            'appeal_amount_approved' => $extraPay,
            'current_amount_approved' => $appealApproved,
            'current_status' => CgdAppealCase::STATUS_APPROVED,
            'latest_appeal_batch_id' => $batch->id,
            'appeal_count' => $alreadyCounted
                ? (int) $case->appeal_count
                : (int) $case->appeal_count + 1,
            'last_updated_at' => now(),
        ]);
        if (! $case->original_batch_id) {
            $case->original_batch_id = $baseline['batch_id'] ?? null;
        }
        if (! $case->first_seen_at) {
            $case->first_seen_at = now();
        }
        $case->save();
        $events = [];
        foreach ($historyRepKeys as $histKey) {
            $histRow = $byRep[$histKey];
            $histRep = $histKey === '__empty__' ? null : $histKey;
            $histApproved = round((float) $histRow->amount_approved, 2);
            $events[] = [
                'type' => CgdAppealEvent::TYPE_APPEAL_IMPORTED,
                'rep_no' => $histRep,
                'amount_approved_before' => null,
                'amount_approved_after' => $histApproved,
                'appeal_amount_before' => null,
                'appeal_amount_after' => 0,
                'note' => 'ประวัติ · REP '.($histRep ?: '-')
                    .' (ค่าน้อยกว่า REP ปัจจุบัน '.($currentRep ?: '-').')'
                    .' · SEQ '.$case->seq_no
                    .' · พึงรับ '.number_format($histApproved, 2)
                    .($docHint ? ' · '.$docHint : ''),
            ];
        }
        $events[] = [
            'type' => CgdAppealEvent::TYPE_APPROVED,
            'rep_no' => $currentRep,
            'amount_approved_before' => $beforeApproved,
            'amount_approved_after' => $appealApproved,
            'appeal_amount_before' => $beforeAppealAmt,
            'appeal_amount_after' => $extraPay,
            'note' => 'อุทธรณ์สำเร็จ · REP '.($currentRep ?: '-')
                .' (ค่ามากที่สุดของ SEQ '.$case->seq_no.')'
                .' · พึงรับ '.number_format($appealApproved, 2)
                .($originalRep && $originalRep !== $currentRep
                    ? ' · อัปเดตจากเคสรออุทธรณ์ REP '.$originalRep
                    : '')
                .($historyRepKeys !== []
                    ? ' · มีประวัติ REP อื่น '.count($historyRepKeys).' รายการ'
                    : '')
                .($docHint ? ' · '.$docHint : ''),
        ];
        $this->replaceEventsForAppealBatch($case, $batch, $events);

        // ถ้ามี STM หลัง APPEAL อยู่แล้ว ให้ตรวจเงินครบทันที
        $this->verifySettlementForCase($case->fresh(['latestAppealBatch', 'events']));
    }

    private function verifySettlementForCase(?CgdAppealCase $case): bool
    {
        if (! $case || ! in_array($case->current_status, [
            CgdAppealCase::STATUS_APPROVED,
            CgdAppealCase::STATUS_STILL_SHORT,
            CgdAppealCase::STATUS_SETTLED,
        ], true)) {
            return false;
        }

        $row = $this->findFollowupStmDetail($case);
        if (! $row || ! $row->import) {
            return false;
        }

        return $this->applyStmSettlementToCase($case, $row, $row->import);
    }

    private function findFollowupStmDetail(CgdAppealCase $case): ?StmDetailRow
    {
        if (! filled($case->seq_no)) {
            return null;
        }

        $appealAt = $this->appealImportedAt($case);
        if (! $appealAt) {
            return null;
        }

        $reps = $this->appealRepNosForCase($case);
        if ($reps === []) {
            return null;
        }

        return StmDetailRow::query()
            ->with('import')
            ->where('seq_no', (string) $case->seq_no)
            ->whereIn('rep_no', $reps)
            ->when(filled($case->hn), fn ($q) => $q->where(function ($inner) use ($case) {
                $inner->whereNull('hn')->orWhere('hn', $case->hn);
            }))
            ->whereHas('import', fn ($q) => $q->where('created_at', '>', $appealAt))
            ->orderByDesc('id')
            ->first();
    }

    private function appealImportedAt(CgdAppealCase $case): ?Carbon
    {
        $batch = $case->relationLoaded('latestAppealBatch')
            ? $case->latestAppealBatch
            : $case->latestAppealBatch()->first();

        return $batch?->updated_at
            ?? $batch?->created_at
            ?? $case->last_updated_at
            ?? $case->first_seen_at;
    }

    private function stmImportedAfterAppeal(CgdAppealCase $case, mixed $importAt): bool
    {
        $appealAt = $this->appealImportedAt($case);
        if (! $appealAt || ! $importAt) {
            return false;
        }

        return Carbon::parse($importAt)->greaterThan($appealAt);
    }

    private function caseMatchesAppealRep(CgdAppealCase $case, string $repNo): bool
    {
        $repNo = trim($repNo);
        if ($repNo === '') {
            return false;
        }

        return in_array($repNo, $this->appealRepNosForCase($case), true);
    }

    /**
     * @return list<string>
     */
    private function appealRepNosForCase(CgdAppealCase $case): array
    {
        $reps = [];
        if (filled($case->rep_no)) {
            $reps[] = trim((string) $case->rep_no);
        }

        if ($case->latest_appeal_batch_id && filled($case->seq_no)) {
            $fromBatch = CgdStmRow::query()
                ->where('batch_id', $case->latest_appeal_batch_id)
                ->where('seq_no', (string) $case->seq_no)
                ->when(filled($case->hn), fn ($q) => $q->where(function ($inner) use ($case) {
                    $inner->whereNull('hn')->orWhere('hn', $case->hn);
                }))
                ->whereNotNull('rep_no')
                ->where('rep_no', '!=', '')
                ->pluck('rep_no')
                ->map(fn ($r) => trim((string) $r))
                ->all();
            $reps = array_merge($reps, $fromBatch);
        }

        $events = $case->relationLoaded('events')
            ? $case->events
            : $case->events()->get();
        foreach ($events as $event) {
            if (filled($event->rep_no)) {
                $reps[] = trim((string) $event->rep_no);
            }
        }

        return array_values(array_unique(array_filter($reps, fn ($r) => $r !== '')));
    }

    private function shortfallDueForCase(CgdAppealCase $case): float
    {
        $shortfall = round((float) $case->original_shortfall, 2);
        if ($shortfall >= 0.01) {
            return $shortfall;
        }

        return round(max(0, (float) $case->original_amount_claim - (float) $case->original_amount_approved), 2);
    }

    private function applyStmSettlementToCase(
        CgdAppealCase $case,
        StmDetailRow $row,
        StmImport $import,
    ): bool {
        $shortfallDue = $this->shortfallDueForCase($case);
        if ($shortfallDue < 0.01) {
            return false;
        }

        $stmApproved = round((float) $row->amount_approved, 2);
        $remaining = round($shortfallDue - $stmApproved, 2);
        $status = $remaining <= 0.009
            ? CgdAppealCase::STATUS_SETTLED
            : CgdAppealCase::STATUS_STILL_SHORT;
        $remaining = max(0, $remaining);

        if ($case->current_status === $status
            && abs((float) $case->current_amount_approved - $stmApproved) < 0.01) {
            return false;
        }

        $before = (float) $case->current_amount_approved;
        $case->fill([
            'current_amount_approved' => $stmApproved,
            'current_status' => $status,
            'claim_submission_no' => $case->claim_submission_no ?: $import->claim_submission_no,
            'last_updated_at' => now(),
        ]);
        $case->save();

        $statusLabel = $status === CgdAppealCase::STATUS_SETTLED ? 'ได้รับเงินแล้ว' : 'ยังขาดเงิน';
        $this->addEvent($case, $status === CgdAppealCase::STATUS_SETTLED
            ? CgdAppealEvent::TYPE_SETTLED
            : CgdAppealEvent::TYPE_STILL_SHORT, null, [
                'rep_no' => $row->rep_no,
                'amount_approved_before' => $before,
                'amount_approved_after' => $stmApproved,
                'appeal_amount_before' => $shortfallDue,
                'appeal_amount_after' => $remaining,
                'note' => 'STM หลัง APPEAL · REP '.($row->rep_no ?: '-')
                    .' · SEQ '.$case->seq_no
                    .' · พึงรับทั้งหมด '.number_format($stmApproved, 2)
                    .' − ยังขาดเงิน '.number_format($shortfallDue, 2)
                    .' = '.number_format($remaining, 2)
                    .' → '.$statusLabel
                    .' · '.$import->claim_submission_no,
            ]);

        return true;
    }

    /**
     * @param  list<string>  $appealReps
     */

    private function findCaseForAppealUpdate(
        string $matchKey,
        ?string $seqNo,
        ?string $hn,
        array $appealReps,
        string $scheme = ClaimScheme::CGD,
    ): ?CgdAppealCase {
        if ($seqNo && $appealReps !== []) {
            $waiting = CgdAppealCase::query()
                ->where('scheme', $scheme)
                ->whereIn('current_status', [
                    CgdAppealCase::STATUS_ELIGIBLE,
                    CgdAppealCase::STATUS_SUBMITTED,
                ])
                ->where('seq_no', $seqNo)
                ->whereIn('rep_no', $appealReps)
                ->when(filled($hn), fn ($q) => $q->where(function ($inner) use ($hn) {
                    $inner->whereNull('hn')->orWhere('hn', $hn);
                }))
                ->orderBy('id')
                ->first();
            if ($waiting) {
                return $waiting;
            }
        }
        return $this->findCaseBySeq($matchKey, $seqNo, $hn, [
            CgdAppealCase::STATUS_ELIGIBLE,
            CgdAppealCase::STATUS_SUBMITTED,
            CgdAppealCase::STATUS_APPROVED,
            CgdAppealCase::STATUS_DENIED,
            CgdAppealCase::STATUS_PARTIAL,
            CgdAppealCase::STATUS_NO_PRIOR,
            CgdAppealCase::STATUS_SETTLED,
            CgdAppealCase::STATUS_STILL_SHORT,
        ], $scheme);
    }

    private function appealImportedAfterCase(CgdStmBatch $batch, CgdAppealCase $case): bool
    {
        $appealAt = $batch->updated_at ?? $batch->created_at;
        $caseAt = $case->first_seen_at;
        if (! $appealAt || ! $caseAt) {
            return true;
        }
        return $appealAt->greaterThan($caseAt);
    }

    private function compareRepNoDesc(string $a, string $b): int
    {
        if ($a === '__empty__' && $b === '__empty__') {
            return 0;
        }
        if ($a === '__empty__') {
            return 1;
        }
        if ($b === '__empty__') {
            return -1;
        }
        $da = ltrim(preg_replace('/\D+/', '', $a) ?: '0', '0') ?: '0';
        $db = ltrim(preg_replace('/\D+/', '', $b) ?: '0', '0') ?: '0';
        if (strlen($da) !== strlen($db)) {
            return strlen($db) <=> strlen($da);
        }
        return strcmp($db, $da);
    }

    /**
     * @param  list<string>  $statuses
     */

    private function findCaseBySeq(
        string $matchKey,
        ?string $seqNo,
        ?string $hn,
        array $statuses,
        string $scheme = ClaimScheme::CGD,
    ): ?CgdAppealCase {
        return CgdAppealCase::query()
            ->where('scheme', $scheme)
            ->whereIn('current_status', $statuses)
            ->where(function ($q) use ($matchKey, $seqNo, $hn) {
                $q->where('match_key', $matchKey);
                if (filled($seqNo)) {
                    $q->orWhere(function ($inner) use ($seqNo, $hn) {
                        $inner->where('seq_no', $seqNo);
                        if (filled($hn)) {
                            $inner->where('hn', $hn);
                        }
                    });
                }
            })
            ->orderBy('id')
            ->first();
    }

    /**
     * @param  list<array<string,mixed>>  $events
     */
    private function replaceEventsForAppealBatch(
        CgdAppealCase $case,
        CgdStmBatch $batch,
        array $events,
    ): void {
        $batchIds = [$batch->id];

        // ไฟล์ APPEAL ซ้ำ (document_no / filename เดิม) — รวมประวัติเป็นรอบเดียว
        if ($batch->document_no) {
            $related = CgdStmBatch::query()
                ->where('file_kind', 'appeal')
                ->where('scheme', (string) ($batch->scheme ?: ClaimScheme::CGD))
                ->where(function ($q) use ($batch) {
                    $q->where('document_no', $batch->document_no);
                    if ($batch->filename) {
                        $q->orWhere('filename', $batch->filename);
                    }
                })
                ->pluck('id')
                ->all();
            $batchIds = array_values(array_unique(array_merge($batchIds, $related)));
        }

        CgdAppealEvent::query()
            ->where('appeal_case_id', $case->id)
            ->whereIn('batch_id', $batchIds)
            ->delete();

        foreach ($events as $payload) {
            $this->addEvent($case, (string) $payload['type'], $batch, $payload);
        }
    }

    /**
     * @param  Collection<int, CgdAppealCase>  $cases
     * @return array<string,string>
     */
    private function buildEventRepMap(Collection $cases): array
    {
        $batchIds = [];
        $matchKeys = [];
        foreach ($cases as $case) {
            if ($case->match_key) {
                $matchKeys[] = $case->match_key;
            }
            if (! $case->relationLoaded('events')) {
                continue;
            }
            foreach ($case->events as $event) {
                if ($event->batch_id) {
                    $batchIds[] = $event->batch_id;
                }
            }
        }

        $batchIds = array_values(array_unique($batchIds));
        $matchKeys = array_values(array_unique($matchKeys));
        if ($batchIds === []) {
            return [];
        }

        $map = [];
        CgdStmRow::query()
            ->whereIn('batch_id', $batchIds)
            ->when($matchKeys !== [], fn ($q) => $q->whereIn('match_key', $matchKeys))
            ->whereNotNull('rep_no')
            ->where('rep_no', '!=', '')
            ->orderByDesc('id')
            ->get(['batch_id', 'match_key', 'rep_no'])
            ->each(function (CgdStmRow $row) use (&$map) {
                $exact = $row->batch_id.'|'.$row->match_key;
                if (! isset($map[$exact])) {
                    $map[$exact] = (string) $row->rep_no;
                }
                $any = $row->batch_id.'|*';
                if (! isset($map[$any])) {
                    $map[$any] = (string) $row->rep_no;
                }
            });

        // ไฟล์ APPEAL อาจไม่มีเลข REP — ใช้ชื่อไฟล์/document เป็นป้าย
        CgdStmBatch::query()
            ->whereIn('id', $batchIds)
            ->where('file_kind', 'appeal')
            ->get(['id', 'document_no', 'filename'])
            ->each(function (CgdStmBatch $b) use (&$map) {
                $label = $b->document_no ?: pathinfo((string) $b->filename, PATHINFO_FILENAME);
                if (! $label) {
                    return;
                }
                $any = $b->id.'|*';
                if (! isset($map[$any])) {
                    $map[$any] = 'APPEAL';
                }
            });

        return $map;
    }

    /**
     * @param  Collection<int, CgdStmRow>  $rows
     * @return array<string, array{amount_claim:float,amount_approved:float,claim_submission_no:?string,batch_id:?int,rep_no:?string}>
     */
    private function lookupBaselines(Collection $rows, string $scheme = ClaimScheme::CGD): array
    {
        $keys = $rows
            ->map(fn (CgdStmRow $row) => $row->match_key ?: CgdClaimMatchKey::make($row->hn, $row->pid, $row->seq_no))
            ->filter(fn ($key) => $key !== '' && $key !== '||')
            ->unique()
            ->values()
            ->all();

        if ($keys === []) {
            return [];
        }

        $map = [];

        // 1) STM ก่อน (เฉพาะ CGD)  2) REP ปกติของ scheme  3) เคสอุทธรณ์เดิม
        if ($scheme === ClaimScheme::CGD) {
            StmDetailRow::query()
                ->whereIn('match_key', $keys)
                ->orderByDesc('id')
                ->get()
                ->each(function (StmDetailRow $row) use (&$map) {
                    if (! $row->match_key || isset($map[$row->match_key])) {
                        return;
                    }
                    $map[$row->match_key] = [
                        'amount_claim' => (float) ($row->amount_claim ?? 0),
                        'amount_approved' => (float) ($row->amount_approved ?? 0),
                        'claim_submission_no' => $row->claim_submission_no,
                        'batch_id' => null,
                        'rep_no' => $row->rep_no,
                    ];
                });

            // จับคู่ด้วย SEQ เมื่อ match_key ไม่ตรง
            $seqNos = $rows->pluck('seq_no')->filter()->unique()->values()->all();
            if ($seqNos !== []) {
                StmDetailRow::query()
                    ->whereIn('seq_no', $seqNos)
                    ->orderByDesc('id')
                    ->get()
                    ->each(function (StmDetailRow $row) use (&$map, $rows) {
                        $appealKey = $rows->first(function (CgdStmRow $r) use ($row) {
                            return (string) $r->seq_no === (string) $row->seq_no
                                && (! filled($r->hn) || (string) $r->hn === (string) $row->hn);
                        });
                        if (! $appealKey) {
                            return;
                        }
                        $key = $appealKey->match_key ?: CgdClaimMatchKey::make($appealKey->hn, $appealKey->pid, $appealKey->seq_no);
                        if ($key === '' || $key === '||' || isset($map[$key])) {
                            return;
                        }
                        $map[$key] = [
                            'amount_claim' => (float) ($row->amount_claim ?? 0),
                            'amount_approved' => (float) ($row->amount_approved ?? 0),
                            'claim_submission_no' => $row->claim_submission_no,
                            'batch_id' => null,
                            'rep_no' => $row->rep_no,
                        ];
                    });
            }
        }

        $seqNos = $rows->pluck('seq_no')->filter()->unique()->values()->all();

        $missing = array_values(array_diff($keys, array_keys($map)));
        if ($missing !== []) {
            CgdStmRow::query()
                ->whereIn('match_key', $missing)
                ->whereHas('batch', function ($q) use ($scheme) {
                    $q->where(function ($inner) {
                        $inner->where('file_kind', 'rep')->orWhereNull('file_kind');
                    });
                    $q->where('scheme', $scheme);
                    CgdClaimFilenameGuard::constrainBatchQuery($q, $scheme);
                })
                ->orderByDesc('id')
                ->get()
                ->each(function (CgdStmRow $row) use (&$map) {
                    $key = $row->match_key ?: CgdClaimMatchKey::make($row->hn, $row->pid, $row->seq_no);
                    if ($key === '' || $key === '||' || isset($map[$key])) {
                        return;
                    }
                    $map[$key] = [
                        'amount_claim' => (float) $row->amount_claim,
                        'amount_approved' => (float) $row->amount_approved,
                        'claim_submission_no' => null,
                        'batch_id' => $row->batch_id,
                        'rep_no' => $row->rep_no,
                    ];
                });
        }

        if ($seqNos !== []) {
            $stillMissing = array_values(array_diff($keys, array_keys($map)));
            if ($stillMissing !== []) {
                CgdStmRow::query()
                    ->whereIn('seq_no', $seqNos)
                    ->whereHas('batch', function ($q) use ($scheme) {
                        $q->where(function ($inner) {
                            $inner->where('file_kind', 'rep')->orWhereNull('file_kind');
                        });
                        $q->where('scheme', $scheme);
                        CgdClaimFilenameGuard::constrainBatchQuery($q, $scheme);
                    })
                    ->orderByDesc('id')
                    ->get()
                    ->each(function (CgdStmRow $row) use (&$map, $rows) {
                        $appealKey = $rows->first(fn (CgdStmRow $r) => (string) $r->seq_no === (string) $row->seq_no);
                        if (! $appealKey) {
                            return;
                        }
                        $key = $appealKey->match_key ?: CgdClaimMatchKey::make($appealKey->hn, $appealKey->pid, $appealKey->seq_no);
                        if ($key === '' || $key === '||' || isset($map[$key])) {
                            return;
                        }
                        $map[$key] = [
                            'amount_claim' => (float) $row->amount_claim,
                            'amount_approved' => (float) $row->amount_approved,
                            'claim_submission_no' => null,
                            'batch_id' => $row->batch_id,
                            'rep_no' => $row->rep_no,
                        ];
                    });
            }
        }

        CgdAppealCase::query()
            ->where('scheme', $scheme)
            ->whereIn('match_key', $keys)
            ->where('current_status', '!=', CgdAppealCase::STATUS_NO_PRIOR)
            ->where('original_amount_claim', '>', 0)
            ->orderBy('id')
            ->get()
            ->each(function (CgdAppealCase $case) use (&$map) {
                if (! $case->match_key || isset($map[$case->match_key])) {
                    return;
                }
                $map[$case->match_key] = [
                    'amount_claim' => (float) $case->original_amount_claim,
                    'amount_approved' => (float) $case->original_amount_approved,
                    'claim_submission_no' => $case->claim_submission_no,
                    'batch_id' => $case->original_batch_id,
                    'rep_no' => $case->rep_no,
                ];
            });

        return $map;
    }

    /**
     * @param  array<string,mixed>  $payload
     */
    private function addEvent(
        CgdAppealCase $case,
        string $type,
        ?CgdStmBatch $batch,
        array $payload = [],
    ): CgdAppealEvent {
        return CgdAppealEvent::create([
            'appeal_case_id' => $case->id,
            'event_type' => $type,
            'batch_id' => $batch?->id ?? ($payload['batch_id'] ?? null),
            'rep_no' => $payload['rep_no'] ?? null,
            'amount_approved_before' => $payload['amount_approved_before'] ?? null,
            'amount_approved_after' => $payload['amount_approved_after'] ?? null,
            'appeal_amount_before' => $payload['appeal_amount_before'] ?? null,
            'appeal_amount_after' => $payload['appeal_amount_after'] ?? null,
            'note' => $payload['note'] ?? null,
            'created_by' => $payload['created_by'] ?? Auth::id(),
        ]);
    }

    /**
     * @return array<string,int>
     */
    private function emptyStatusCounts(): array
    {
        return [
            'all' => 0,
            'outstanding' => 0,
            CgdAppealCase::STATUS_ELIGIBLE => 0,
            CgdAppealCase::STATUS_SUBMITTED => 0,
            CgdAppealCase::STATUS_PARTIAL => 0,
            CgdAppealCase::STATUS_NO_PRIOR => 0,
            CgdAppealCase::STATUS_APPROVED => 0,
            CgdAppealCase::STATUS_SETTLED => 0,
            CgdAppealCase::STATUS_STILL_SHORT => 0,
            CgdAppealCase::STATUS_DENIED => 0,
        ];
    }
}
