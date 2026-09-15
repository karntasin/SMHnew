<?php

namespace App\Services\Finance;

use App\Models\Finance\CgdErrorCase;
use App\Models\Finance\CgdErrorEvent;
use App\Models\Finance\CgdStmBatch;
use App\Models\Finance\CgdStmRow;
use App\Models\Finance\StmDetailRow;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * ติดตาม REP ที่มี Error
 *
 * - พบ Error ใน REP ครั้งแรก → สร้าง case (open) + event detected
 * - ตรวจผลด้วย REP คนละเลข (รอบถัดไป) ที่ SEQ เดิม:
 *   - ยังมี Error → still_open + event updated_from_rep (1 รายการ)
 *   - ไม่มี Error → fixed + event fixed (1 รายการ) + อัปเดตยอด
 * - ไม่ถือว่าไฟล์/เลข REP เดียวกันเป็นการ "ตรวจรอบถัดไป"
 */
class CgdErrorCaseService
{
    public function syncFromRepBatch(CgdStmBatch $batch): void
    {
        if (($batch->file_kind ?? 'rep') === 'appeal') {
            return;
        }

        $rows = CgdStmRow::query()
            ->where('batch_id', $batch->id)
            ->orderBy('id')
            ->get();

        if ($rows->isEmpty()) {
            return;
        }

        $claimByKey = $this->lookupClaimSubmissionNos($rows);

        DB::transaction(function () use ($rows, $batch, $claimByKey) {
            $seenKeys = [];

            foreach ($rows as $row) {
                $matchKey = $row->match_key ?: CgdClaimMatchKey::make($row->hn, $row->pid, $row->seq_no);
                if ($matchKey === '' || $matchKey === '||') {
                    continue;
                }

                $dedupe = $matchKey."\0".(string) $row->rep_no;
                if (isset($seenKeys[$dedupe])) {
                    continue;
                }
                $seenKeys[$dedupe] = true;

                $hasError = filled($row->error_code);
                $approved = (float) $row->amount_approved;

                if ($hasError) {
                    $this->upsertOpenError($row, $batch, $matchKey, $claimByKey, $approved);
                } else {
                    $this->tryMarkFixedByLaterRep($row, $batch, $matchKey, $approved);
                }
            }
        });
    }

    /**
     * @param  list<string>  $repNos
     */
    public function ensureCasesForRepNos(array $repNos): void
    {
        $repNos = array_values(array_unique(array_filter(array_map('strval', $repNos))));
        if ($repNos === []) {
            return;
        }

        $existing = CgdErrorCase::query()->whereIn('rep_no', $repNos)->exists();
        if ($existing) {
            return;
        }

        $batchIds = CgdStmRow::query()
            ->whereIn('rep_no', $repNos)
            ->whereNotNull('error_code')
            ->where('error_code', '!=', '')
            ->distinct()
            ->pluck('batch_id')
            ->all();

        CgdStmBatch::query()
            ->whereIn('id', $batchIds)
            ->where(function ($q) {
                $q->where('file_kind', 'rep')->orWhereNull('file_kind');
            })
            ->where(function ($q) {
                CgdClaimFilenameGuard::constrainBatchQueryAnyScheme($q);
            })
            ->orderBy('id')
            ->get()
            ->each(fn (CgdStmBatch $batch) => $this->syncFromRepBatch($batch));
    }

    /**
     * สร้างประวัติ Error ใหม่ทั้งหมดจากไฟล์ REP ตามลำดับนำเข้า
     */
    public function rebuildAllFromRepBatches(): array
    {
        return DB::transaction(function () {
            CgdErrorEvent::query()->delete();
            CgdErrorCase::query()->delete();

            $batches = CgdStmBatch::query()
                ->where(function ($q) {
                    $q->where('file_kind', 'rep')->orWhereNull('file_kind');
                })
                ->where(function ($q) {
                    CgdClaimFilenameGuard::constrainBatchQueryAnyScheme($q);
                })
                ->orderBy('id')
                ->get();

            foreach ($batches as $batch) {
                $this->syncFromRepBatch($batch);
            }

            return [
                'batches' => $batches->count(),
                'cases' => CgdErrorCase::query()->count(),
                'events' => CgdErrorEvent::query()->count(),
            ];
        });
    }

    /**
     * @param  list<string>  $repNos
     * @return array{cases: list<array<string,mixed>>, status_counts: array<string,int>}
     */
    public function casesForRepNos(array $repNos, ?string $statusFilter = null, bool $includeCases = true): array
    {
        $repNos = array_values(array_unique(array_filter(array_map('strval', $repNos))));
        if ($repNos === []) {
            return ['cases' => [], 'status_counts' => $this->emptyStatusCounts()];
        }

        if ($includeCases) {
            $this->ensureCasesForRepNos($repNos);
        }

        $base = CgdErrorCase::query()->whereIn('rep_no', $repNos);

        $statusCounts = [
            'all' => (clone $base)->count(),
            CgdErrorCase::STATUS_OPEN => (clone $base)->where('current_status', CgdErrorCase::STATUS_OPEN)->count(),
            CgdErrorCase::STATUS_STILL_OPEN => (clone $base)->where('current_status', CgdErrorCase::STATUS_STILL_OPEN)->count(),
            CgdErrorCase::STATUS_FIXED => (clone $base)->where('current_status', CgdErrorCase::STATUS_FIXED)->count(),
        ];

        if (! $includeCases) {
            return ['cases' => [], 'status_counts' => $statusCounts];
        }

        $query = CgdErrorCase::query()
            ->whereIn('rep_no', $repNos)
            ->with(['events' => fn ($q) => $q->orderByDesc('id')->limit(20)])
            ->orderByRaw("FIELD(current_status,'still_open','open','fixed')")
            ->orderBy('rep_no')
            ->orderBy('hn')
            ->orderBy('seq_no');

        if ($statusFilter === 'all') {
            // show all
        } elseif (is_string($statusFilter) && $statusFilter !== '') {
            $query->where('current_status', $statusFilter);
        } else {
            $query->whereIn('current_status', [
                CgdErrorCase::STATUS_OPEN,
                CgdErrorCase::STATUS_STILL_OPEN,
            ]);
        }

        $cases = $query->get();
        $eventRepMap = $this->buildEventRepMap($cases);

        return [
            'cases' => $cases->map(fn (CgdErrorCase $case) => $this->serializeCase($case, $eventRepMap))->all(),
            'status_counts' => $statusCounts,
        ];
    }

    /**
     * @return array<string, CgdErrorCase>
     */
    public function casesByMatchKey(array $matchKeys): array
    {
        $matchKeys = array_values(array_unique(array_filter($matchKeys)));
        if ($matchKeys === []) {
            return [];
        }

        $map = [];
        foreach (array_chunk($matchKeys, 500) as $chunk) {
            CgdErrorCase::query()
                ->whereIn('match_key', $chunk)
                ->orderByDesc('id')
                ->get()
                ->each(function (CgdErrorCase $case) use (&$map) {
                    if ($case->match_key && ! isset($map[$case->match_key])) {
                        $map[$case->match_key] = $case;
                    }
                });
        }

        return $map;
    }

    /**
     * @param  array<string,string>  $eventRepMap  key = "{batch_id}|{match_key}"
     * @return array<string,mixed>
     */
    public function serializeCase(CgdErrorCase $case, array $eventRepMap = []): array
    {
        return [
            'id' => $case->id,
            'match_key' => $case->match_key,
            'hn' => $case->hn,
            'pid' => $case->pid,
            'seq_no' => $case->seq_no,
            'patient_name' => $case->patient_name,
            'rep_no' => $case->rep_no,
            'claim_submission_no' => $case->claim_submission_no,
            'original_error_code' => $case->original_error_code,
            'original_amount_claim' => (float) $case->original_amount_claim,
            'original_amount_approved' => (float) $case->original_amount_approved,
            'current_status' => $case->current_status,
            'current_error_code' => $case->current_error_code,
            'current_amount_approved' => (float) $case->current_amount_approved,
            'first_seen_at' => optional($case->first_seen_at)->toDateTimeString(),
            'last_updated_at' => optional($case->last_updated_at)->toDateTimeString(),
            'events' => $case->relationLoaded('events')
                ? $case->events->map(function (CgdErrorEvent $e) use ($case, $eventRepMap) {
                    $repNo = null;
                    if ($e->batch_id) {
                        $repNo = $eventRepMap[$e->batch_id.'|'.$case->match_key]
                            ?? $eventRepMap[$e->batch_id.'|*']
                            ?? null;
                    }

                    // detected ใช้ REP เดิมของเคส · อัปเดตรอบถัดไปใช้ REP จาก batch นั้น
                    if ($e->event_type === CgdErrorEvent::TYPE_DETECTED) {
                        $repNo = $case->rep_no ?: $repNo;
                    }

                    return [
                        'id' => $e->id,
                        'event_type' => $e->event_type,
                        'batch_id' => $e->batch_id,
                        'rep_no' => $repNo ?: $case->rep_no,
                        'error_code_before' => $e->error_code_before,
                        'error_code_after' => $e->error_code_after,
                        'amount_approved_before' => $e->amount_approved_before !== null ? (float) $e->amount_approved_before : null,
                        'amount_approved_after' => $e->amount_approved_after !== null ? (float) $e->amount_approved_after : null,
                        'note' => $e->note,
                        'created_at' => optional($e->created_at)->toDateTimeString(),
                    ];
                })->values()->all()
                : [],
        ];
    }

    /**
     * @param  Collection<int, CgdErrorCase>  $cases
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

        return $map;
    }

    /**
     * @param  array<string,string>  $claimByKey
     */
    private function upsertOpenError(
        CgdStmRow $row,
        CgdStmBatch $batch,
        string $matchKey,
        array $claimByKey,
        float $approved,
    ): void {
        $rowRep = (string) ($row->rep_no ?? '');

        // เคสของ REP นี้โดยตรง
        $sameRepCase = CgdErrorCase::query()
            ->where('match_key', $matchKey)
            ->where('rep_no', $row->rep_no)
            ->first();

        if ($sameRepCase) {
            // แก้แล้ว / มี REP ใหม่กว่าอัปเดตแล้ว — อย่าให้ไฟล์ REP เดิม/ซ้ำย้อนสถานะ
            if ($sameRepCase->current_status === CgdErrorCase::STATUS_FIXED) {
                return;
            }
            if (
                $sameRepCase->latest_batch_id
                && (int) $sameRepCase->latest_batch_id > (int) $batch->id
                && $sameRepCase->current_status === CgdErrorCase::STATUS_STILL_OPEN
            ) {
                return;
            }

            // นำเข้า REP เดิมอีกครั้ง — รีเฟรช + ประวัติ detected เพียง 1 ครั้งต่อเลข REP
            $sameRepCase->fill([
                'hn' => $row->hn,
                'pid' => $row->pid,
                'seq_no' => $row->seq_no,
                'patient_name' => $row->patient_name ?: $sameRepCase->patient_name,
                'claim_submission_no' => $sameRepCase->claim_submission_no
                    ?: ($claimByKey[$matchKey] ?? null),
                'current_error_code' => $row->error_code,
                'current_amount_approved' => $approved,
                'latest_batch_id' => $batch->id,
                'current_status' => CgdErrorCase::STATUS_OPEN,
                'last_updated_at' => now(),
            ]);
            if (! $sameRepCase->original_batch_id) {
                $sameRepCase->original_batch_id = $batch->id;
            }
            if (! $sameRepCase->original_error_code) {
                $sameRepCase->original_error_code = $row->error_code;
            }
            $sameRepCase->save();

            $this->replaceEventsForSourceRep($sameRepCase, $batch, $rowRep, [[
                'type' => CgdErrorEvent::TYPE_DETECTED,
                'error_code_before' => null,
                'error_code_after' => $row->error_code,
                'amount_approved_before' => null,
                'amount_approved_after' => $approved,
                'note' => 'พบ Error จากไฟล์ REP '.$rowRep,
            ]]);

            return;
        }

        // เคสค้างจาก REP คนละเลข (SEQ เดิม) → ตรวจรอบถัดไปว่ายัง Error
        $priorOpen = $this->findOpenCaseFromEarlierRep($matchKey, $row);
        if ($priorOpen) {
            if (
                $priorOpen->latest_batch_id
                && (int) $priorOpen->latest_batch_id > (int) $batch->id
            ) {
                return;
            }

            $beforeCode = $priorOpen->current_error_code;
            $beforeApproved = (float) $priorOpen->current_amount_approved;

            $priorOpen->fill([
                'hn' => $row->hn ?: $priorOpen->hn,
                'pid' => $row->pid ?: $priorOpen->pid,
                'seq_no' => $row->seq_no ?: $priorOpen->seq_no,
                'patient_name' => $row->patient_name ?: $priorOpen->patient_name,
                'claim_submission_no' => $priorOpen->claim_submission_no
                    ?: ($claimByKey[$matchKey] ?? null),
                'current_error_code' => $row->error_code,
                'current_amount_approved' => $approved,
                'latest_batch_id' => $batch->id,
                'current_status' => CgdErrorCase::STATUS_STILL_OPEN,
                'last_updated_at' => now(),
            ]);
            $priorOpen->save();

            $this->replaceEventsForSourceRep($priorOpen, $batch, $rowRep, [[
                'type' => CgdErrorEvent::TYPE_UPDATED_FROM_REP,
                'error_code_before' => $beforeCode,
                'error_code_after' => $row->error_code,
                'amount_approved_before' => $beforeApproved,
                'amount_approved_after' => $approved,
                'note' => 'ตรวจจาก REP รอบถัดไป '.$rowRep.' (SEQ เดิม) — ยังมี Error',
            ]]);

            return;
        }

        // เคสใหม่
        $case = new CgdErrorCase([
            'match_key' => $matchKey,
            'rep_no' => $row->rep_no,
            'hn' => $row->hn,
            'pid' => $row->pid,
            'seq_no' => $row->seq_no,
            'patient_name' => $row->patient_name,
            'claim_submission_no' => $claimByKey[$matchKey] ?? null,
            'original_batch_id' => $batch->id,
            'original_error_code' => $row->error_code,
            'original_amount_claim' => (float) $row->amount_claim,
            'original_amount_approved' => $approved,
            'current_status' => CgdErrorCase::STATUS_OPEN,
            'current_error_code' => $row->error_code,
            'current_amount_approved' => $approved,
            'latest_batch_id' => $batch->id,
            'appeal_count' => 0,
            'first_seen_at' => now(),
            'last_updated_at' => now(),
        ]);
        $case->save();

        $this->replaceEventsForSourceRep($case, $batch, $rowRep, [[
            'type' => CgdErrorEvent::TYPE_DETECTED,
            'error_code_before' => null,
            'error_code_after' => $row->error_code,
            'amount_approved_before' => null,
            'amount_approved_after' => $approved,
            'note' => 'พบ Error จากไฟล์ REP '.$rowRep,
        ]]);
    }

    /**
     * แถวไม่มี Error ใน REP คนละเลข → ถือว่าอนุมัติแก้ Error ของ SEQ เดิม
     */
    private function tryMarkFixedByLaterRep(
        CgdStmRow $row,
        CgdStmBatch $batch,
        string $matchKey,
        float $approved,
    ): void {
        $rowRep = (string) ($row->rep_no ?? '');
        if ($rowRep === '') {
            return;
        }

        $case = $this->findOpenCaseFromEarlierRep($matchKey, $row);
        if (! $case) {
            return;
        }

        if (
            $case->latest_batch_id
            && (int) $case->latest_batch_id > (int) $batch->id
        ) {
            return;
        }

        $beforeCode = $case->current_error_code;
        $beforeApproved = (float) $case->current_amount_approved;

        $case->fill([
            'hn' => $row->hn ?: $case->hn,
            'pid' => $row->pid ?: $case->pid,
            'seq_no' => $row->seq_no ?: $case->seq_no,
            'patient_name' => $row->patient_name ?: $case->patient_name,
            'current_error_code' => null,
            'current_amount_approved' => $approved,
            'latest_batch_id' => $batch->id,
            'current_status' => CgdErrorCase::STATUS_FIXED,
            'last_updated_at' => now(),
        ]);
        $case->save();

        $this->replaceEventsForSourceRep($case, $batch, $rowRep, [[
            'type' => CgdErrorEvent::TYPE_FIXED,
            'error_code_before' => $beforeCode,
            'error_code_after' => null,
            'amount_approved_before' => $beforeApproved,
            'amount_approved_after' => $approved,
            'note' => 'อนุมัติแก้ Error จาก REP รอบถัดไป '.$rowRep.' (SEQ เดิมไม่มี Error) · อัปเดตยอดชดเชย',
        ]]);
    }

    /**
     * หาเคส Error ค้างที่เกิดจาก REP คนละเลข (ก่อนหน้า) ของ SEQ/match_key เดียวกัน
     */
    private function findOpenCaseFromEarlierRep(string $matchKey, CgdStmRow $row): ?CgdErrorCase
    {
        $rowRep = (string) ($row->rep_no ?? '');

        return CgdErrorCase::query()
            ->whereIn('current_status', [
                CgdErrorCase::STATUS_OPEN,
                CgdErrorCase::STATUS_STILL_OPEN,
            ])
            ->where(function ($q) use ($matchKey, $row) {
                $q->where('match_key', $matchKey);
                if (filled($row->seq_no)) {
                    $q->orWhere(function ($inner) use ($row) {
                        $inner->where('seq_no', $row->seq_no);
                        if (filled($row->hn)) {
                            $inner->where('hn', $row->hn);
                        }
                    });
                }
            })
            ->where(function ($q) use ($rowRep) {
                // ต้องเป็นคนละเลข REP เท่านั้น
                $q->whereNull('rep_no');
                if ($rowRep !== '') {
                    $q->orWhere('rep_no', '!=', $rowRep);
                }
            })
            ->orderBy('id')
            ->first();
    }

    /**
     * แทนที่ event ของเลข REP แหล่งที่มา (รวม batch ซ้ำที่เลข REP เดียวกัน) ด้วย 1 รายการ
     *
     * @param  list<array<string,mixed>>  $events
     */
    private function replaceEventsForSourceRep(
        CgdErrorCase $case,
        CgdStmBatch $batch,
        string $sourceRepNo,
        array $events,
    ): void {
        $batchIds = [$batch->id];

        if ($sourceRepNo !== '') {
            $related = CgdStmRow::query()
                ->where('rep_no', $sourceRepNo)
                ->when(
                    filled($case->match_key),
                    fn ($q) => $q->where('match_key', $case->match_key),
                )
                ->distinct()
                ->pluck('batch_id')
                ->all();
            $batchIds = array_values(array_unique(array_merge($batchIds, $related)));
        }

        CgdErrorEvent::query()
            ->where('error_case_id', $case->id)
            ->whereIn('batch_id', $batchIds)
            ->delete();

        foreach ($events as $payload) {
            $this->addEvent($case, (string) $payload['type'], $batch, $payload);
        }
    }

    /**
     * @param  array<string,mixed>  $payload
     */
    private function addEvent(
        CgdErrorCase $case,
        string $type,
        ?CgdStmBatch $batch,
        array $payload = [],
    ): CgdErrorEvent {
        return CgdErrorEvent::create([
            'error_case_id' => $case->id,
            'event_type' => $type,
            'batch_id' => $batch?->id ?? ($payload['batch_id'] ?? null),
            'error_code_before' => $payload['error_code_before'] ?? null,
            'error_code_after' => $payload['error_code_after'] ?? null,
            'amount_approved_before' => $payload['amount_approved_before'] ?? null,
            'amount_approved_after' => $payload['amount_approved_after'] ?? null,
            'note' => $payload['note'] ?? null,
            'created_by' => $payload['created_by'] ?? Auth::id(),
        ]);
    }

    /**
     * @param  Collection<int, CgdStmRow>  $rows
     * @return array<string,string>
     */
    private function lookupClaimSubmissionNos(Collection $rows): array
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
        StmDetailRow::query()
            ->whereIn('match_key', $keys)
            ->whereNotNull('claim_submission_no')
            ->where('claim_submission_no', '!=', '')
            ->orderByDesc('id')
            ->get(['id', 'match_key', 'claim_submission_no'])
            ->each(function (StmDetailRow $row) use (&$map) {
                if (! $row->match_key || isset($map[$row->match_key])) {
                    return;
                }
                $map[$row->match_key] = $row->claim_submission_no;
            });

        return $map;
    }

    /**
     * @return array<string,int>
     */
    private function emptyStatusCounts(): array
    {
        return [
            'all' => 0,
            CgdErrorCase::STATUS_OPEN => 0,
            CgdErrorCase::STATUS_STILL_OPEN => 0,
            CgdErrorCase::STATUS_FIXED => 0,
        ];
    }
}
