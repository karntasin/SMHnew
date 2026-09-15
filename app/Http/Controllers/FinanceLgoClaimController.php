<?php

namespace App\Http\Controllers;

use App\Models\Finance\CgdAppealCase;
use App\Models\Finance\CgdErrorCase;
use App\Models\Finance\CgdReconciliation;
use App\Models\Finance\CgdStmBatch;
use App\Models\Finance\CgdStmRow;
use App\Services\Finance\CgdClaimFilenameGuard;
use App\Support\Finance\ClaimScheme;
use App\Support\Finance\EclaimErrorCodes;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FinanceLgoClaimController extends FinanceCgdClaimController
{
    private const SCHEME = ClaimScheme::LGO;

    protected function schemeKey(): string
    {
        return self::SCHEME;
    }

    protected function moduleMeta(): array
    {
        return ClaimScheme::uiMeta(self::SCHEME);
    }

    protected function nhso()
    {
        return $this->nhsoPortal->forScheme(self::SCHEME);
    }

    protected function assertSchemeBatch(CgdStmBatch $batch): void
    {
        if (($batch->scheme ?? ClaimScheme::CGD) !== self::SCHEME) {
            abort(404);
        }
    }

    protected function batchQuery()
    {
        return CgdStmBatch::query()->forScheme(self::SCHEME);
    }

    /**
     * @return array<string, mixed>
     */
    protected function mapBatchAsImport(CgdStmBatch $batch): array
    {
        $latest = $batch->relationLoaded('reconciliations')
            ? $batch->reconciliations->first()
            : $batch->reconciliations()->where('scope', 'batch')->latest()->first();

        return [
            'id' => $batch->id,
            'batch_id' => $batch->id,
            'claim_submission_no' => $batch->document_no ?: $batch->filename,
            'filename' => $batch->filename,
            'hcode' => $batch->hcode,
            'hospital_name' => null,
            'channel' => $batch->channel,
            'period_label' => $batch->period_label,
            'detail_count' => (int) $batch->row_count,
            'summary_count' => 0,
            'rep_count' => null,
            'total_claim' => (float) $batch->total_claim,
            'total_approved' => (float) $batch->total_approved,
            'visit_date_min' => optional($batch->visit_date_min)->toDateString(),
            'visit_date_max' => optional($batch->visit_date_max)->toDateString(),
            'sheet_names' => [],
            'imported_by' => $batch->importer?->name,
            'created_at' => optional($batch->created_at)->format('d/m/Y H:i'),
            'latest_reconciliation' => $latest ? [
                'id' => $latest->id,
                'total_shortfall' => (float) $latest->total_shortfall,
                'matched_ok' => $latest->matched_ok,
                'matched_short' => $latest->matched_short,
                'only_hosxp' => $latest->only_hosxp,
                'only_stm' => $latest->only_stm,
                'stm_out_of_range' => $latest->stm_out_of_range,
            ] : null,
        ];
    }

    protected function latestAllReconciliation(): ?CgdReconciliation
    {
        return CgdReconciliation::query()
            ->where('scope', 'all')
            ->where('scheme', self::SCHEME)
            ->latest()
            ->first();
    }

    public function index(): Response
    {
        $imports = $this->batchQuery()
            ->with([
                'importer:id,name',
                'reconciliations' => fn ($q) => $q->where('scope', 'batch')->latest()->limit(1),
            ])
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn (CgdStmBatch $batch) => $this->mapBatchAsImport($batch));

        $latest = $this->latestAllReconciliation();
        [$repMin, $repMax] = $this->reconciler->allRepDateRange(self::SCHEME);

        $batchAgg = $this->batchQuery()
            ->selectRaw('COUNT(*) as import_count')
            ->selectRaw('COALESCE(SUM(row_count), 0) as row_count')
            ->selectRaw('COALESCE(SUM(total_claim), 0) as total_claim')
            ->selectRaw('COALESCE(SUM(total_approved), 0) as total_approved')
            ->first();

        $repCount = (int) CgdStmRow::query()
            ->whereHas('batch', fn ($q) => $q->forScheme(self::SCHEME))
            ->whereNotNull('rep_no')
            ->where('rep_no', '!=', '')
            ->distinct()
            ->count('rep_no');

        return Inertia::render('Finance/CgdClaim/Dashboard', [
            'module' => $this->moduleMeta(),
            'hosxpReady' => $this->hosxp->available(),
            'imports' => $imports,
            'summary' => $latest ? $this->serializeReconciliation($latest) : null,
            'stmRange' => [
                'min' => $repMin,
                'max' => $repMax,
                'row_count' => (int) ($batchAgg?->row_count ?? 0),
            ],
            'filters' => [
                'start_date' => $latest?->start_date?->format('Y-m-d') ?: $repMin,
                'end_date' => $latest?->end_date?->format('Y-m-d') ?: $repMax,
            ],
            'kpis' => [
                'import_count' => (int) ($batchAgg?->import_count ?? 0),
                'row_count' => (int) ($batchAgg?->row_count ?? 0),
                'rep_count' => $repCount,
                'total_claim' => (float) ($batchAgg?->total_claim ?? 0),
                'total_approved' => (float) ($batchAgg?->total_approved ?? 0),
                'latest_shortfall' => (float) ($latest?->total_shortfall ?? 0),
                'latest_matched_ok' => (int) ($latest?->matched_ok ?? 0),
                'latest_matched_short' => (int) ($latest?->matched_short ?? 0),
                'latest_only_hosxp' => (int) ($latest?->only_hosxp ?? 0),
                'latest_only_stm' => (int) ($latest?->only_stm ?? 0),
            ],
            'caseTracking' => $this->caseTrackingSummary(),
        ]);
    }

    /**
     * สรุป Error code + อุทธรณ์ จาก REP อปท. เท่านั้น (ไม่มี STM)
     *
     * @return array<string, int>
     */
    protected function caseTrackingSummary(): array
    {
        $repNos = CgdStmRow::query()
            ->whereHas('batch', fn ($q) => $q->forScheme(self::SCHEME))
            ->whereNotNull('rep_no')
            ->where('rep_no', '!=', '')
            ->distinct()
            ->pluck('rep_no')
            ->all();

        $errorBase = CgdErrorCase::query()->when(
            $repNos !== [],
            fn ($q) => $q->whereIn('rep_no', $repNos),
            fn ($q) => $q->whereRaw('0 = 1'),
        );

        $appealBase = CgdAppealCase::query()->where('scheme', self::SCHEME);

        return [
            'error_open' => (clone $errorBase)->where('current_status', CgdErrorCase::STATUS_OPEN)->count(),
            'error_still_open' => (clone $errorBase)->where('current_status', CgdErrorCase::STATUS_STILL_OPEN)->count(),
            'error_fixed' => (clone $errorBase)->where('current_status', CgdErrorCase::STATUS_FIXED)->count(),
            'appeal_eligible' => (clone $appealBase)->where('current_status', CgdAppealCase::STATUS_ELIGIBLE)->count(),
            'appeal_submitted' => (clone $appealBase)->where('current_status', CgdAppealCase::STATUS_SUBMITTED)->count(),
            'appeal_approved' => (clone $appealBase)->where('current_status', CgdAppealCase::STATUS_APPROVED)->count(),
            'appeal_settled' => (clone $appealBase)->where('current_status', CgdAppealCase::STATUS_SETTLED)->count(),
            'appeal_still_short' => (clone $appealBase)->where('current_status', CgdAppealCase::STATUS_STILL_SHORT)->count(),
            'appeal_denied' => (clone $appealBase)->whereIn('current_status', [
                CgdAppealCase::STATUS_DENIED,
                CgdAppealCase::STATUS_PARTIAL,
            ])->count(),
        ];
    }

    public function reconcileAll(Request $request)
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(300);

        $data = $request->validate([
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'pttype_like' => ['nullable', 'string', 'max:32'],
        ]);

        try {
            $reconciliation = $this->reconciler->reconcileAll(
                $data['start_date'],
                $data['end_date'],
                $data['pttype_like'] ?? ClaimScheme::pttypeLike(self::SCHEME),
                ['021'],
                self::SCHEME,
            );
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('finance.lgo.dashboard')
                ->with('error', $this->compareErrorMessage($e));
        }

        $range = date('d/m/Y', strtotime($data['start_date'])).' - '.date('d/m/Y', strtotime($data['end_date']));

        return redirect()
            ->route('finance.lgo.dashboard')
            ->with(
                'success',
                'เปรียบเทียบรวม REP อปท. เรียบร้อย · ช่วง HOSxP '.$range
                .' · ยอดขาด (เรียกเก็บ−พึงรับ) '.number_format((float) $reconciliation->total_shortfall, 2).' บาท'
            );
    }

    public function showSummary(Request $request): Response|\Illuminate\Http\RedirectResponse
    {
        $reconciliation = $this->latestAllReconciliation();

        if (! $reconciliation) {
            return redirect()
                ->route('finance.lgo.dashboard')
                ->with('error', 'ยังไม่มีผลการเปรียบเทียบรวม — กรุณาเลือกช่วงวันที่แล้วกดเปรียบเทียบก่อน');
        }

        $status = $request->query('status');
        $status = is_string($status) && isset($this->statusLabels()[$status]) ? $status : null;
        $search = trim((string) $request->query('q', ''));
        $month = $this->normalizeMonthFilter($request->query('month'));
        $errorCode = $this->normalizeErrorFilter($request->query('error_code'));
        $amount = $this->normalizeAmountFilter($request->query('amount'));

        $monthly = $this->monthlyBreakdown($reconciliation, $status, $search, null, $amount);
        if ($month && ! collect($monthly)->contains(fn ($row) => $row['month'] === $month)) {
            $month = null;
        }

        $errorOptions = $this->errorCodeOptions($reconciliation, $status, $search, $month, $amount);
        if ($errorCode && $errorCode !== '__has_error__' && $errorCode !== '__none__'
            && ! collect($errorOptions)->contains(fn ($opt) => $opt['value'] === $errorCode)) {
            $errorCode = null;
        }

        if ($errorCode) {
            $monthly = $this->monthlyBreakdown($reconciliation, $status, $search, $errorCode, $amount);
            if ($month && ! collect($monthly)->contains(fn ($row) => $row['month'] === $month)) {
                $month = null;
                $errorOptions = $this->errorCodeOptions($reconciliation, $status, $search, null, $amount);
            }
        }

        $amountOptions = $this->amountFilterOptions($reconciliation, $status, $search, $month, $errorCode);
        if ($amount && ! collect($amountOptions)->contains(fn ($opt) => $opt['value'] === $amount)) {
            $amount = null;
        }

        $filteredBase = $this->filteredReconcileItems($reconciliation, $status, $search, $month, $errorCode, $amount);
        $filterTotals = $this->aggregateFilterTotals($filteredBase);
        $statusCounts = $this->statusCounts($reconciliation, $search, $month, $errorCode, $amount);
        $query = (clone $filteredBase)
            ->orderByRaw("FIELD(status,'matched_short','only_hosxp','only_stm','stm_out_of_range','matched_over','matched_ok')");
        if ($amount) {
            $net = $this->hosxpNetSql();
            $query->orderByRaw("ABS(({$net}) - COALESCE(stm_claim, 0)) DESC");
        }
        $query
            ->orderByDesc('shortfall')
            ->orderBy('hn')
            ->orderBy('seq_no');
        $items = $this->paginateReconcileItems($query, $request);

        $usedErrorCodes = collect($errorOptions)
            ->pluck('value')
            ->merge(
                $reconciliation->items()
                    ->whereNotNull('error_code')
                    ->where('error_code', '!=', '')
                    ->distinct()
                    ->pluck('error_code')
            )
            ->map(fn ($code) => (string) $code)
            ->reject(fn ($code) => in_array($code, ['__has_error__', '__none__', ''], true))
            ->unique()
            ->values()
            ->all();

        $repNos = $reconciliation->items()
            ->whereNotNull('rep_no')
            ->where('rep_no', '!=', '')
            ->distinct()
            ->pluck('rep_no')
            ->all();
        $repErrors = $this->reconciler->loadRepErrorRows($repNos, null, self::SCHEME);

        return Inertia::render('Finance/CgdClaim/Summary', [
            'module' => $this->moduleMeta(),
            'hosxpReady' => $this->hosxp->available(),
            'reconciliation' => $this->serializeReconciliation($reconciliation),
            'monthly' => $monthly,
            'items' => $items,
            'filterTotals' => $filterTotals,
            'statusCounts' => $statusCounts,
            'repErrors' => $repErrors,
            'errorOptions' => $errorOptions,
            'amountOptions' => $amountOptions,
            'errorCodeMeanings' => EclaimErrorCodes::tooltipMap($usedErrorCodes),
            'errorCodeSource' => EclaimErrorCodes::sourceUrl(),
            'importCount' => $this->batchQuery()->count(),
            'filters' => [
                'status' => $status,
                'q' => $search,
                'month' => $month,
                'error_code' => $errorCode,
                'amount' => $amount,
                'per_page' => $this->normalizePerPage($request->query('per_page')),
                'page' => max(1, (int) $request->query('page', 1)),
            ],
            'statusOptions' => $this->statusLabels(),
            'amountLabels' => $this->amountFilterLabels(),
        ]);
    }

    public function importForm(): Response
    {
        $batches = $this->batchQuery()
            ->with(['importer:id,name', 'reconciliations' => fn ($q) => $q->latest()->limit(1)])
            ->latest()
            ->paginate(15)
            ->through(fn (CgdStmBatch $b) => $this->serializeBatch($b));

        return Inertia::render('Finance/CgdClaim/Import', [
            'module' => $this->moduleMeta(),
            'hosxpReady' => $this->hosxp->available(),
            'batches' => $batches,
            'filenamePrefix' => ClaimScheme::repPrefix(self::SCHEME),
            'nhsoPortal' => [
                'configured' => $this->nhso()->isConfigured(),
                'session' => $this->nhso()->currentSession(),
                'validation_url' => $this->nhso()->validationUrl(),
                'username_hint' => $this->maskUsername((string) config('cgd_eclaim.username')),
            ],
        ]);
    }

    public function nhsoStart(Request $request)
    {
        $this->extendNhsoRuntime(180);

        $data = $request->validate([
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
        ]);

        try {
            $result = $this->nhso()->startLogin((int) $data['year'], (int) $data['month']);
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'nhso' => $e->getMessage(),
            ]);
        }

        return redirect()
            ->route('finance.lgo.import')
            ->with('success', $result['message'])
            ->with('nhso_status', $result['status']);
    }

    public function nhsoOtp(Request $request)
    {
        $this->extendNhsoRuntime(180);

        $data = $request->validate([
            'otp' => ['required', 'string', 'regex:/^\d{6}$/'],
        ]);

        try {
            $result = $this->nhso()->submitOtp($data['otp']);
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'otp' => $e->getMessage(),
            ]);
        }

        return redirect()
            ->route('finance.lgo.import')
            ->with('success', $result['message'])
            ->with('nhso_status', $result['status']);
    }

    public function nhsoDownload(Request $request)
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
            'auto_reconcile' => ['nullable', 'boolean'],
            'batch_size' => ['nullable', 'integer', 'min:0', 'max:500'],
        ]);

        $batchSize = (int) ($data['batch_size'] ?? 5);
        $this->extendNhsoRuntime($batchSize <= 0 ? 1800 : 600);

        try {
            $result = $this->nhso()->downloadAndImport(
                $this->importer,
                $data['notes'] ?? null,
                $batchSize
            );
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'nhso' => $e->getMessage(),
            ]);
        }

        if ($request->boolean('auto_reconcile') && $result['imported'] !== []) {
            foreach ($result['imported'] as $row) {
                $batch = $this->batchQuery()->find($row['batch_id']);
                if (! $batch) {
                    continue;
                }
                $startDate = optional($batch->visit_date_min)->toDateString();
                $endDate = optional($batch->visit_date_max)->toDateString();
                if ($startDate && $endDate) {
                    try {
                        $this->reconciler->reconcile(
                            $batch,
                            $startDate,
                            $endDate,
                            ClaimScheme::pttypeLike(self::SCHEME),
                        );
                    } catch (\Throwable) {
                        // ไม่บล็อกการนำเข้าถ้า reconcile รายไฟล์ล้ม
                    }
                }
            }
        }

        $created = collect($result['imported'])->where('updated', false)->count();
        $updated = collect($result['imported'])->where('updated', true)->count();

        return redirect()
            ->route('finance.lgo.import')
            ->with('success', $result['message']." · ใหม่ {$created} · อัปเดต {$updated}")
            ->with('import_failures', $result['failures'])
            ->with('nhso_status', 'done');
    }

    public function nhsoClearSession()
    {
        $this->nhso()->clearSession();

        return redirect()
            ->route('finance.lgo.import')
            ->with('success', 'ล้าง session การเชื่อมต่อ e-Claim แล้ว');
    }

    public function import(Request $request)
    {
        if (! $request->hasFile('files') && $request->hasFile('file')) {
            $request->files->set('files', [$request->file('file')]);
        }

        $data = $request->validate([
            'files' => ['required', 'array', 'min:1', 'max:50'],
            'files.*' => ['required', 'file', 'max:51200'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'auto_reconcile' => ['nullable', 'boolean'],
        ]);

        /** @var list<\Illuminate\Http\UploadedFile> $files */
        $files = array_values(array_filter($data['files'] ?? [], fn ($f) => $f instanceof \Illuminate\Http\UploadedFile));
        if ($files === []) {
            throw ValidationException::withMessages([
                'files' => 'กรุณาเลือกไฟล์ REP / e-Claim อย่างน้อย 1 ไฟล์',
            ]);
        }

        $created = 0;
        $updated = 0;
        $failed = [];
        $batches = [];
        $autoReconcile = $request->boolean('auto_reconcile', false);

        foreach ($files as $file) {
            $name = $file->getClientOriginalName() ?: 'unknown.xls';
            try {
                CgdClaimFilenameGuard::assertRep($name, 'files', self::SCHEME);
                $result = $this->importer->import($file, $data['notes'] ?? null, self::SCHEME);
                /** @var CgdStmBatch $batch */
                $batch = $result['batch'];
                $wasUpdated = (bool) $result['updated'];

                $startDate = optional($batch->visit_date_min)->toDateString();
                $endDate = optional($batch->visit_date_max)->toDateString();

                if ($autoReconcile && $startDate && $endDate) {
                    $this->reconciler->reconcile(
                        $batch,
                        $startDate,
                        $endDate,
                        ClaimScheme::pttypeLike(self::SCHEME),
                    );
                }

                if ($wasUpdated) {
                    $updated++;
                } else {
                    $created++;
                }
                $batches[] = $batch;
            } catch (ValidationException $e) {
                $messages = collect($e->errors())->flatten()->filter()->implode(' · ');
                $failed[] = $name.($messages !== '' ? ' — '.$messages : '');
            } catch (\Throwable $e) {
                $failed[] = $name.' — '.$e->getMessage();
            }
        }

        if ($created === 0 && $updated === 0) {
            throw ValidationException::withMessages([
                'files' => $failed !== []
                    ? 'นำเข้าไม่สำเร็จ: '.implode(' | ', $failed)
                    : 'นำเข้าไฟล์ไม่สำเร็จ',
            ]);
        }

        $appealCount = collect($batches)->filter(fn (CgdStmBatch $b) => ($b->file_kind ?? 'rep') === 'appeal')->count();

        $parts = [];
        if ($created > 0) {
            $parts[] = "นำเข้าใหม่ {$created} ไฟล์";
        }
        if ($updated > 0) {
            $parts[] = "อัปเดตซ้ำ {$updated} ไฟล์";
        }
        if ($appealCount > 0) {
            $parts[] = "ไฟล์ APPEAL {$appealCount} ไฟล์ (อัปเดตผลอุทธรณ์เงินชดเชยแล้ว)";
        }
        if ($failed !== []) {
            $parts[] = 'ไม่สำเร็จ '.count($failed).' ไฟล์ ('.implode(' | ', $failed).')';
        }

        $message = implode(' · ', $parts);

        if (count($batches) === 1 && $failed === []) {
            return redirect()
                ->route('finance.lgo.show', $batches[0])
                ->with('success', $message);
        }

        return redirect()
            ->route('finance.lgo.import')
            ->with('success', $message)
            ->with('import_failures', $failed);
    }

    public function show(CgdStmBatch $batch, Request $request): Response
    {
        $this->assertSchemeBatch($batch);

        $batch->load(['importer:id,name']);
        $reconciliation = $batch->reconciliations()->latest()->first();

        $status = $request->query('status');
        $status = is_string($status) && isset($this->statusLabels()[$status]) ? $status : null;
        $search = trim((string) $request->query('q', ''));
        $month = $this->normalizeMonthFilter($request->query('month'));
        $errorCode = $this->normalizeErrorFilter($request->query('error_code'));

        $monthly = [];
        $items = [
            'data' => [],
            'links' => [],
            'total' => 0,
            'from' => null,
            'to' => null,
            'current_page' => 1,
            'last_page' => 1,
            'per_page' => 0,
        ];
        $errorOptions = [];
        $filterTotals = null;
        $statusCounts = null;
        if ($reconciliation) {
            $monthly = $this->monthlyBreakdown($reconciliation, $status, $search, null);
            if ($month && ! collect($monthly)->contains(fn ($row) => $row['month'] === $month)) {
                $month = null;
            }
            $errorOptions = $this->errorCodeOptions($reconciliation, $status, $search, $month);
            if ($errorCode && $errorCode !== '__has_error__' && $errorCode !== '__none__'
                && ! collect($errorOptions)->contains(fn ($opt) => $opt['value'] === $errorCode)) {
                $errorCode = null;
            }
            if ($errorCode) {
                $monthly = $this->monthlyBreakdown($reconciliation, $status, $search, $errorCode);
                if ($month && ! collect($monthly)->contains(fn ($row) => $row['month'] === $month)) {
                    $month = null;
                    $errorOptions = $this->errorCodeOptions($reconciliation, $status, $search, null);
                }
            }
            $filteredBase = $this->filteredReconcileItems($reconciliation, $status, $search, $month, $errorCode);
            $filterTotals = $this->aggregateFilterTotals($filteredBase);
            $statusCounts = $this->statusCounts($reconciliation, $search, $month, $errorCode);
            $query = (clone $filteredBase)
                ->orderByRaw("FIELD(status,'matched_short','only_hosxp','only_stm','stm_out_of_range','matched_over','matched_ok')")
                ->orderByDesc('shortfall')
                ->orderBy('hn')
                ->orderBy('seq_no');

            $items = $this->paginateReconcileItems($query, $request);
        }

        $zeroFundRows = $batch->zeroFundRows()
            ->orderBy('row_no')
            ->orderBy('id')
            ->get()
            ->map(fn ($row) => [
                'id' => $row->id,
                'row_no' => $row->row_no,
                'tran_id' => $row->tran_id,
                'hn' => $row->hn,
                'pid' => $row->pid,
                'patient_name' => $row->patient_name,
                'visit_date' => optional($row->visit_date)->format('Y-m-d'),
                'fund_code' => $row->fund_code,
                'claim_code' => $row->claim_code,
                'tmt' => $row->tmt,
                'expense_category' => $row->expense_category,
                'qty_requested' => $row->qty_requested,
                'qty_paid' => $row->qty_paid,
                'amount_paid' => (float) $row->amount_paid,
                'remark' => $row->remark,
            ])
            ->values()
            ->all();

        $usedErrorCodes = collect($errorOptions)
            ->pluck('value')
            ->merge(
                $reconciliation
                    ? $reconciliation->items()
                        ->whereNotNull('error_code')
                        ->where('error_code', '!=', '')
                        ->distinct()
                        ->pluck('error_code')
                    : []
            )
            ->map(fn ($code) => (string) $code)
            ->reject(fn ($code) => in_array($code, ['__has_error__', '__none__', ''], true))
            ->unique()
            ->values()
            ->all();

        return Inertia::render('Finance/CgdClaim/Show', [
            'module' => $this->moduleMeta(),
            'hosxpReady' => $this->hosxp->available(),
            'batch' => $this->serializeBatch($batch),
            'reconciliation' => $reconciliation ? $this->serializeReconciliation($reconciliation) : null,
            'monthly' => $monthly,
            'items' => $items,
            'filterTotals' => $filterTotals,
            'statusCounts' => $statusCounts,
            'zeroFundRows' => $zeroFundRows,
            'errorOptions' => $errorOptions,
            'errorCodeMeanings' => EclaimErrorCodes::tooltipMap($usedErrorCodes),
            'errorCodeSource' => EclaimErrorCodes::sourceUrl(),
            'filters' => [
                'status' => $status,
                'q' => $search,
                'month' => $month,
                'error_code' => $errorCode,
                'per_page' => $this->normalizePerPage($request->query('per_page')),
                'page' => max(1, (int) $request->query('page', 1)),
            ],
            'statusOptions' => $this->statusLabels(),
        ]);
    }

    public function reconcile(Request $request, CgdStmBatch $batch)
    {
        $this->assertSchemeBatch($batch);

        $data = $request->validate([
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'pttype_like' => ['nullable', 'string', 'max:32'],
        ]);

        $this->reconciler->reconcile(
            $batch,
            $data['start_date'],
            $data['end_date'],
            $data['pttype_like'] ?? ClaimScheme::pttypeLike(self::SCHEME),
        );

        $range = date('d/m/Y', strtotime($data['start_date'])).' - '.date('d/m/Y', strtotime($data['end_date']));

        return redirect()
            ->route('finance.lgo.show', $batch)
            ->with('success', "เปรียบเทียบข้อมูลใหม่เรียบร้อยแล้ว · ช่วง HOSxP {$range}");
    }

    public function destroy(CgdStmBatch $batch)
    {
        $this->assertSchemeBatch($batch);

        $label = $batch->document_no ?: $batch->filename;
        $rowCount = $batch->row_count;

        if ($batch->stored_path) {
            Storage::disk('local')->delete($batch->stored_path);
        }

        $batch->reconciliations()->each(function (CgdReconciliation $old) {
            $old->items()->delete();
            $old->delete();
        });
        $batch->zeroFundRows()->delete();
        $batch->rows()->delete();
        $batch->delete();

        return redirect()
            ->route('finance.lgo.dashboard')
            ->with('success', "ลบข้อมูลนำเข้า {$label} แล้ว ({$rowCount} รายการ)");
    }

    public function exportExcel(Request $request, CgdStmBatch $batch): StreamedResponse
    {
        $this->assertSchemeBatch($batch);
        $reconciliation = $batch->reconciliations()->where('scope', 'batch')->latest()->firstOrFail();

        return $this->streamCgdExcelReport(
            $request,
            $reconciliation,
            $batch->document_no ?: $batch->filename,
            'ชุด '.($batch->document_no ?: $batch->filename),
            $batch,
        );
    }

    public function exportPdf(Request $request, CgdStmBatch $batch)
    {
        $this->assertSchemeBatch($batch);
        $reconciliation = $batch->reconciliations()->where('scope', 'batch')->latest()->firstOrFail();

        return $this->downloadCgdPdfReport(
            $request,
            $reconciliation,
            $batch->document_no ?: $batch->filename,
            $batch,
        );
    }

    public function exportSummaryExcel(Request $request): StreamedResponse
    {
        $reconciliation = $this->latestAllReconciliation();
        if (! $reconciliation) {
            abort(404, 'ยังไม่มีผลการเปรียบเทียบรวม');
        }

        return $this->streamCgdExcelReport(
            $request,
            $reconciliation,
            'สรุป REP อปท.',
            'สรุปเปรียบเทียบ REP อปท. กับ HOSxP',
            null,
        );
    }

    public function exportSummaryPdf(Request $request)
    {
        $reconciliation = $this->latestAllReconciliation();
        if (! $reconciliation) {
            abort(404, 'ยังไม่มีผลการเปรียบเทียบรวม');
        }

        return $this->downloadCgdPdfReport(
            $request,
            $reconciliation,
            'สรุป REP อปท.',
            null,
        );
    }

    public function markAppealSubmitted(Request $request)
    {
        $data = $request->validate([
            'case_ids' => ['required', 'array', 'min:1'],
            'case_ids.*' => ['integer', 'exists:finance_cgd_appeal_cases,id'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $count = $this->appeals->markSubmitted(
            $data['case_ids'],
            $request->user()?->id,
            $data['note'] ?? null,
        );

        return redirect()
            ->route('finance.lgo.compare')
            ->with('success', "ทำเครื่องหมายยื่นอุทธรณ์เงินชดเชยแล้ว {$count} รายการ");
    }

    public function showCompare(Request $request): Response|\Illuminate\Http\RedirectResponse
    {
        $reconciliation = $this->latestAllReconciliation();
        if (! $reconciliation) {
            return redirect()
                ->route('finance.lgo.dashboard')
                ->with('error', 'ยังไม่มีผลการเปรียบเทียบรวม — กรุณาเลือกช่วงวันที่แล้วกดเปรียบเทียบก่อน');
        }

        $batchAgg = $this->batchQuery()
            ->selectRaw('COALESCE(SUM(row_count), 0) as row_count')
            ->selectRaw('COALESCE(SUM(total_claim), 0) as total_claim')
            ->selectRaw('COALESCE(SUM(total_approved), 0) as total_approved')
            ->selectRaw('MIN(visit_date_min) as visit_date_min')
            ->selectRaw('MAX(visit_date_max) as visit_date_max')
            ->first();

        $repCount = (int) CgdStmRow::query()
            ->whereHas('batch', fn ($q) => $q->forScheme(self::SCHEME))
            ->whereNotNull('rep_no')
            ->where('rep_no', '!=', '')
            ->distinct()
            ->count('rep_no');

        $syntheticImport = [
            'id' => 0,
            'claim_submission_no' => 'REP ทั้งหมด',
            'filename' => 'REP LGO',
            'hcode' => null,
            'hospital_name' => null,
            'channel' => null,
            'period_label' => null,
            'detail_count' => (int) ($batchAgg->row_count ?? 0),
            'summary_count' => 0,
            'rep_count' => $repCount,
            'total_claim' => (float) ($batchAgg->total_claim ?? 0),
            'total_approved' => (float) ($batchAgg->total_approved ?? 0),
            'visit_date_min' => $batchAgg->visit_date_min ? (string) $batchAgg->visit_date_min : null,
            'visit_date_max' => $batchAgg->visit_date_max ? (string) $batchAgg->visit_date_max : null,
            'sheet_names' => [],
            'imported_by' => null,
            'created_at' => null,
            'notes' => null,
            'province' => null,
        ];

        $status = $request->query('status');
        $status = is_string($status) && isset($this->statusLabels()[$status]) ? $status : null;
        $search = trim((string) $request->query('q', ''));
        $month = $this->normalizeMonthFilter($request->query('month'));
        $errorCode = $this->normalizeErrorFilter($request->query('error_code'));
        $amount = $this->normalizeAmountFilter($request->query('amount'));

        $monthly = $this->monthlyBreakdown($reconciliation, $status, $search, $errorCode, $amount);
        $errorOptions = $this->errorCodeOptions($reconciliation, $status, $search, $month, $amount);
        $amountOptions = $this->amountFilterOptions($reconciliation, $status, $search, $month, $errorCode);
        $statusCounts = $this->statusCounts($reconciliation, $search, $month, $errorCode, $amount);

        $filteredBase = $this->filteredReconcileItems($reconciliation, $status, $search, $month, $errorCode, $amount);
        $filterTotals = $this->aggregateFilterTotals($filteredBase);
        $query = (clone $filteredBase)
            ->orderByRaw("FIELD(status,'matched_short','only_hosxp','only_stm','stm_out_of_range','matched_over','matched_ok')");
        if ($amount) {
            $net = $this->hosxpNetSql();
            $query->orderByRaw("ABS(({$net}) - COALESCE(stm_claim, 0)) DESC");
        }
        $query->orderByDesc('shortfall')->orderBy('hn')->orderBy('seq_no');
        $items = $this->paginateReconcileItems($query, $request);

        $tab = $request->query('tab');
        $tab = is_string($tab) && in_array($tab, ['compare', 'stm', 'errors', 'appeals'], true)
            ? $tab
            : 'compare';

        $stmQ = trim((string) $request->query('stm_q', ''));
        $stmRep = trim((string) $request->query('stm_rep', ''));
        $stmMonth = $this->normalizeMonthFilter($request->query('stm_month'));
        $stmFlag = $request->query('stm_flag');
        $stmFlag = is_string($stmFlag) && isset($this->stmFlagLabels()[$stmFlag]) ? $stmFlag : null;

        $repRowBase = CgdStmRow::query()
            ->whereHas('batch', fn ($q) => $q->forScheme(self::SCHEME));

        $stmRepOptions = (clone $repRowBase)
            ->whereNotNull('rep_no')
            ->where('rep_no', '!=', '')
            ->distinct()
            ->orderBy('rep_no')
            ->pluck('rep_no')
            ->values()
            ->all();

        $stmMonthOptions = (clone $repRowBase)
            ->whereNotNull('visit_date')
            ->selectRaw("DATE_FORMAT(visit_date, '%Y-%m') as month")
            ->selectRaw('COUNT(*) as item_count')
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(fn ($row) => [
                'month' => (string) $row->month,
                'label' => $this->thaiMonthLabel((string) $row->month),
                'item_count' => (int) $row->item_count,
            ])
            ->values()
            ->all();

        $duplicateSeqMap = (clone $repRowBase)
            ->whereNotNull('seq_no')
            ->where('seq_no', '!=', '')
            ->selectRaw('seq_no')
            ->selectRaw('COUNT(*) as c')
            ->groupBy('seq_no')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('c', 'seq_no');
        $duplicateSeqNos = $duplicateSeqMap->keys()->all();

        $stmAgg = (clone $repRowBase)
            ->toBase()
            ->selectRaw('COUNT(*) as row_count')
            ->selectRaw('COUNT(DISTINCT NULLIF(rep_no, \'\')) as rep_count')
            ->selectRaw('COALESCE(SUM(amount_claim), 0) as total_claim')
            ->selectRaw('COALESCE(SUM(amount_approved), 0) as total_approved')
            ->selectRaw('SUM(CASE WHEN ABS(COALESCE(amount_claim,0) - COALESCE(amount_approved,0)) >= 0.01 THEN 1 ELSE 0 END) as claim_ne_approved')
            ->selectRaw('SUM(CASE WHEN COALESCE(amount_claim,0) - COALESCE(amount_approved,0) > 0.009 THEN 1 ELSE 0 END) as shortfall_count')
            ->selectRaw('SUM(CASE WHEN COALESCE(amount_approved,0) - COALESCE(amount_claim,0) > 0.009 THEN 1 ELSE 0 END) as overpay_count')
            ->selectRaw('SUM(CASE WHEN COALESCE(amount_claim,0) > 0.009 AND COALESCE(amount_approved,0) < 0.01 THEN 1 ELSE 0 END) as zero_approved')
            ->selectRaw("SUM(CASE WHEN seq_no IS NULL OR seq_no = '' THEN 1 ELSE 0 END) as missing_seq")
            ->selectRaw('COALESCE(SUM(CASE WHEN COALESCE(amount_claim,0) - COALESCE(amount_approved,0) > 0 THEN COALESCE(amount_claim,0) - COALESCE(amount_approved,0) ELSE 0 END), 0) as total_shortfall')
            ->first();

        $stmStats = [
            'row_count' => (int) ($stmAgg->row_count ?? 0),
            'rep_count' => (int) ($stmAgg->rep_count ?? 0),
            'total_claim' => round((float) ($stmAgg->total_claim ?? 0), 2),
            'total_approved' => round((float) ($stmAgg->total_approved ?? 0), 2),
            'total_shortfall' => round((float) ($stmAgg->total_shortfall ?? 0), 2),
            'claim_ne_approved' => (int) ($stmAgg->claim_ne_approved ?? 0),
            'shortfall' => (int) ($stmAgg->shortfall_count ?? 0),
            'overpay' => (int) ($stmAgg->overpay_count ?? 0),
            'zero_approved' => (int) ($stmAgg->zero_approved ?? 0),
            'missing_seq' => (int) ($stmAgg->missing_seq ?? 0),
            'duplicate_seq_rows' => $duplicateSeqNos === []
                ? 0
                : (int) (clone $repRowBase)->whereIn('seq_no', $duplicateSeqNos)->count(),
            'duplicate_seq_groups' => count($duplicateSeqNos),
        ];

        $stmDetailQuery = (clone $repRowBase)->orderBy('rep_no')->orderBy('seq_no')->orderBy('row_no');
        if ($stmQ !== '') {
            $stmDetailQuery->where(function ($q) use ($stmQ) {
                $q->where('hn', 'like', "%{$stmQ}%")
                    ->orWhere('pid', 'like', "%{$stmQ}%")
                    ->orWhere('seq_no', 'like', "%{$stmQ}%")
                    ->orWhere('patient_name', 'like', "%{$stmQ}%")
                    ->orWhere('rep_no', 'like', "%{$stmQ}%");
            });
        }
        if ($stmRep !== '') {
            $stmDetailQuery->where('rep_no', $stmRep);
        }
        if ($stmMonth) {
            $stmDetailQuery->whereRaw("DATE_FORMAT(visit_date, '%Y-%m') = ?", [$stmMonth]);
        }
        $this->applyStmFlagFilter($stmDetailQuery, $stmFlag, $duplicateSeqNos);

        $serializeStmDetail = function ($row) use ($duplicateSeqMap) {
            $claim = (float) $row->amount_claim;
            $approved = (float) $row->amount_approved;
            $seq = (string) ($row->seq_no ?? '');
            $dupCount = $seq !== '' ? (int) ($duplicateSeqMap[$seq] ?? 0) : 0;

            return [
                'id' => $row->id,
                'rep_no' => $row->rep_no,
                'row_no' => $row->row_no,
                'hn' => $row->hn,
                'pid' => $row->pid,
                'seq_no' => $row->seq_no,
                'patient_name' => $row->patient_name,
                'visit_date' => optional($row->visit_date)->format('Y-m-d'),
                'amount_claim' => $claim,
                'amount_approved' => $approved,
                'amount_treat' => (float) $row->amount_treat,
                'amount_drug' => (float) $row->amount_drug,
                'shortfall' => round(max(0, $claim - $approved), 2),
                'overpay' => round(max(0, $approved - $claim), 2),
                'amount_gap' => round($claim - $approved, 2),
                'is_duplicate_seq' => $dupCount > 1,
                'seq_dup_count' => $dupCount,
            ];
        };

        $stmPerPage = $this->normalizePerPage($request->query('stm_per_page', 50));
        if ($stmPerPage === 'all') {
            $stmCollection = $stmDetailQuery->get();
            $stmTotal = $stmCollection->count();
            $stmDetails = [
                'data' => $stmCollection->map($serializeStmDetail)->values()->all(),
                'links' => [],
                'total' => $stmTotal,
                'from' => $stmTotal > 0 ? 1 : null,
                'to' => $stmTotal > 0 ? $stmTotal : null,
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $stmTotal > 0 ? $stmTotal : 0,
            ];
        } else {
            $stmPaginator = $stmDetailQuery
                ->paginate((int) $stmPerPage, ['*'], 'stm_page')
                ->withQueryString()
                ->through($serializeStmDetail);
            $stmArr = $stmPaginator->toArray();
            $stmDetails = [
                'data' => $stmArr['data'] ?? [],
                'links' => $stmArr['links'] ?? [],
                'total' => (int) ($stmArr['total'] ?? 0),
                'from' => $stmArr['from'] ?? null,
                'to' => $stmArr['to'] ?? null,
                'current_page' => (int) ($stmArr['current_page'] ?? 1),
                'last_page' => (int) ($stmArr['last_page'] ?? 1),
                'per_page' => (int) ($stmArr['per_page'] ?? $stmPerPage),
            ];
        }

        $repNos = (clone $repRowBase)
            ->whereNotNull('rep_no')
            ->where('rep_no', '!=', '')
            ->distinct()
            ->pluck('rep_no')
            ->all();
        $repErrors = $this->reconciler->loadRepErrorRows($repNos, null, self::SCHEME);

        // เคสอุทธรณ์จากยอดขาดใน REP (ไม่มี STM) · Error ซิงก์ตอนนำเข้า + ensure ใน casesForRepNos
        $this->batchQuery()
            ->where(function ($q) {
                $q->where('file_kind', 'rep')->orWhereNull('file_kind');
            })
            ->orderBy('id')
            ->each(fn (CgdStmBatch $batch) => $this->appeals->ensureEligibleFromRepBatch($batch));

        $errorStatus = $request->query('error_status');
        $errorStatus = is_string($errorStatus) && $errorStatus !== '' ? $errorStatus : null;
        $errorCasePayload = $this->errorCases->casesForRepNos($repNos, $errorStatus);

        $appealStatus = $request->query('appeal_status');
        $appealStatus = is_string($appealStatus) && $appealStatus !== '' ? $appealStatus : null;

        $appealMatchKeys = (clone $repRowBase)
            ->whereNotNull('match_key')
            ->where('match_key', '!=', '')
            ->distinct()
            ->pluck('match_key')
            ->all();

        $appealCasePayload = $this->appeals->casesForScope(
            $repNos,
            $appealMatchKeys,
            null,
            $appealStatus,
            [],
            self::SCHEME,
        );

        $usedErrorCodes = collect($errorOptions)
            ->pluck('value')
            ->merge(collect($repErrors)->pluck('error_code'))
            ->merge(collect($errorCasePayload['cases'])->pluck('current_error_code'))
            ->merge(collect($errorCasePayload['cases'])->pluck('original_error_code'))
            ->merge(
                $reconciliation->items()
                    ->whereNotNull('error_code')
                    ->where('error_code', '!=', '')
                    ->distinct()
                    ->pluck('error_code')
            )
            ->map(fn ($code) => (string) $code)
            ->reject(fn ($code) => in_array($code, ['__has_error__', '__none__', ''], true))
            ->unique()
            ->values()
            ->all();

        return Inertia::render('Finance/CgdClaim/StmCompare', [
            'module' => $this->moduleMeta(),
            'hosxpReady' => $this->hosxp->available(),
            'import' => $syntheticImport,
            'reconciliation' => $this->serializeReconciliation($reconciliation),
            'monthly' => $monthly,
            'items' => $items,
            'filterTotals' => $filterTotals,
            'statusCounts' => $statusCounts,
            'stmSummaries' => [],
            'stmDetails' => $stmDetails,
            'stmStats' => $stmStats,
            'stmRepOptions' => $stmRepOptions,
            'stmMonthOptions' => $stmMonthOptions,
            'stmFlagLabels' => $this->stmFlagLabels(),
            'repErrors' => $repErrors,
            'errorCases' => $errorCasePayload['cases'],
            'errorCaseStatusCounts' => $errorCasePayload['status_counts'],
            'appealCases' => $appealCasePayload['cases'],
            'appealCaseStatusCounts' => $appealCasePayload['status_counts'],
            'errorOptions' => $errorOptions,
            'amountOptions' => $amountOptions,
            'errorCodeMeanings' => EclaimErrorCodes::tooltipMap($usedErrorCodes),
            'errorCodeSource' => EclaimErrorCodes::sourceUrl(),
            'filters' => [
                'tab' => $tab,
                'status' => $status,
                'q' => $search,
                'month' => $month,
                'error_code' => $errorCode,
                'amount' => $amount,
                'error_status' => $errorStatus,
                'appeal_status' => $appealStatus,
                'stm_q' => $stmQ,
                'stm_rep' => $stmRep !== '' ? $stmRep : null,
                'stm_month' => $stmMonth,
                'stm_flag' => $stmFlag,
                'stm_per_page' => $stmPerPage,
                'per_page' => $this->normalizePerPage($request->query('per_page')),
                'page' => max(1, (int) $request->query('page', 1)),
                'stm_page' => max(1, (int) $request->query('stm_page', 1)),
            ],
            'statusOptions' => $this->statusLabels(),
            'amountLabels' => $this->amountFilterLabels(),
        ]);
    }

    private function compareErrorMessage(\Throwable $e): string
    {
        $raw = $e->getMessage();
        if (str_contains($raw, 'Allowed memory size') || str_contains($raw, 'exhausted')) {
            return 'ข้อมูลช่วงวันที่ที่เลือกมีปริมาณมากเกินไปจนระบบประมวลผลไม่ทัน — กรุณาเลือกช่วงวันที่ที่แคบลง แล้วกดเปรียบเทียบอีกครั้ง';
        }
        if (str_contains($raw, 'Maximum execution time')) {
            return 'การเปรียบเทียบใช้เวลานานเกินไป — กรุณาเลือกช่วงวันที่ที่แคบลง แล้วลองใหม่';
        }

        return $raw !== '' ? $raw : 'ไม่สามารถเปรียบเทียบได้ กรุณาลองใหม่';
    }
}
