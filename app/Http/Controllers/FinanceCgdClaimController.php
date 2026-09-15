<?php

namespace App\Http\Controllers;

use App\Models\Finance\CgdReconciliation;
use App\Models\Finance\CgdStmBatch;
use App\Models\Finance\StmDetailRow;
use App\Models\Finance\StmImport;
use App\Models\SettingApp;
use App\Services\Finance\CgdClaimFilenameGuard;
use App\Services\Finance\CgdClaimReconcileService;
use App\Services\Finance\CgdEclaimNhsoPortalService;
use App\Services\Finance\CgdAppealService;
use App\Services\Finance\CgdErrorCaseService;
use App\Services\Finance\CgdHosxpClaimService;
use App\Services\Finance\CgdStmImportService;
use App\Services\ThaiPdfService;
use App\Support\Finance\ClaimScheme;
use App\Support\Finance\EclaimErrorCodes;
use Box\Spout\Common\Entity\Style\Color;
use Box\Spout\Writer\Common\Creator\Style\StyleBuilder;
use Box\Spout\Writer\Common\Creator\WriterEntityFactory;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FinanceCgdClaimController extends Controller
{
    public function __construct(
        protected readonly CgdStmImportService $importer,
        protected readonly CgdClaimReconcileService $reconciler,
        protected readonly CgdHosxpClaimService $hosxp,
        protected readonly ThaiPdfService $pdf,
        protected readonly CgdEclaimNhsoPortalService $nhsoPortal,
        protected readonly CgdErrorCaseService $errorCases,
        protected readonly CgdAppealService $appeals,
    ) {}

    public function index(): Response
    {
        $imports = StmImport::query()
            ->with([
                'importer:id,name',
                'reconciliations' => fn ($q) => $q->where('scope', 'stm')->latest()->limit(1),
            ])
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn (StmImport $import) => $this->serializeStmImport($import));

        $latest = CgdReconciliation::query()
            ->where('scope', 'stm_all')
            ->latest()
            ->first();

        [$stmMin, $stmMax] = $this->reconciler->allStmDateRange();

        return Inertia::render('Finance/CgdClaim/Dashboard', [
            'hosxpReady' => $this->hosxp->available(),
            'imports' => $imports,
            'summary' => $latest ? $this->serializeReconciliation($latest) : null,
            'stmRange' => [
                'min' => $stmMin,
                'max' => $stmMax,
                'row_count' => (int) StmImport::sum('detail_count'),
            ],
            'filters' => [
                'start_date' => $latest?->start_date?->format('Y-m-d') ?: $stmMin,
                'end_date' => $latest?->end_date?->format('Y-m-d') ?: $stmMax,
            ],
            'kpis' => [
                'import_count' => StmImport::count(),
                'row_count' => (int) StmImport::sum('detail_count'),
                'rep_count' => (int) StmImport::sum('rep_count'),
                'total_claim' => (float) StmImport::sum('total_claim'),
                'total_approved' => (float) StmImport::sum('total_approved'),
                'latest_shortfall' => $latest?->total_shortfall ?? 0,
                'latest_matched_ok' => $latest?->matched_ok ?? 0,
                'latest_matched_short' => $latest?->matched_short ?? 0,
                'latest_only_hosxp' => $latest?->only_hosxp ?? 0,
                'latest_only_stm' => $latest?->only_stm ?? 0,
            ],
        ]);
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
            $reconciliation = $this->reconciler->reconcileAllStm(
                $data['start_date'],
                $data['end_date'],
                $data['pttype_like'] ?? '12%',
            );
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('finance.cgd.dashboard')
                ->with('error', $this->compareErrorMessage($e));
        }

        $range = date('d/m/Y', strtotime($data['start_date'])).' - '.date('d/m/Y', strtotime($data['end_date']));

        return redirect()
            ->route('finance.cgd.dashboard')
            ->with(
                'success',
                "เปรียบเทียบรวมทุกชุด STM เรียบร้อย · ช่วง HOSxP {$range} · ยอดขาด (เรียกเก็บ−พึงรับ) ".number_format((float) $reconciliation->total_shortfall, 2).' บาท'
            );
    }

    public function showSummary(Request $request): Response|\Illuminate\Http\RedirectResponse
    {
        $reconciliation = CgdReconciliation::query()
            ->where('scope', 'stm_all')
            ->latest()
            ->first();

        if (! $reconciliation) {
            return redirect()
                ->route('finance.cgd.dashboard')
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
        $repErrors = $this->reconciler->loadRepErrorRows($repNos);

        return Inertia::render('Finance/CgdClaim/Summary', [
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
            'importCount' => StmImport::count(),
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
        $batches = CgdStmBatch::query()
            ->forScheme('cgd')
            ->with(['importer:id,name', 'reconciliations' => fn ($q) => $q->latest()->limit(1)])
            ->latest()
            ->paginate(15)
            ->through(fn (CgdStmBatch $b) => $this->serializeBatch($b));

        return Inertia::render('Finance/CgdClaim/Import', [
            'hosxpReady' => $this->hosxp->available(),
            'batches' => $batches,
            'filenamePrefix' => CgdClaimFilenameGuard::repPrefix('cgd'),
            'nhsoPortal' => [
                'configured' => $this->nhsoPortal->isConfigured(),
                'session' => $this->nhsoPortal->currentSession(),
                'validation_url' => $this->nhsoPortal->validationUrl(),
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
            $result = $this->nhsoPortal->startLogin((int) $data['year'], (int) $data['month']);
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'nhso' => $e->getMessage(),
            ]);
        }

        return redirect()
            ->route('finance.cgd.import')
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
            $result = $this->nhsoPortal->submitOtp($data['otp']);
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'otp' => $e->getMessage(),
            ]);
        }

        return redirect()
            ->route('finance.cgd.import')
            ->with('success', $result['message'])
            ->with('nhso_status', $result['status']);
    }

    public function nhsoDownload(Request $request)
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
            'auto_reconcile' => ['nullable', 'boolean'],
            // 0 = ดาวน์โหลดทุกไฟล์ในครั้งเดียว
            'batch_size' => ['nullable', 'integer', 'min:0', 'max:500'],
        ]);

        $batchSize = (int) ($data['batch_size'] ?? 5);
        $this->extendNhsoRuntime($batchSize <= 0 ? 1800 : 600);

        try {
            $result = $this->nhsoPortal->downloadAndImport(
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
                $batch = CgdStmBatch::query()->find($row['batch_id']);
                if (! $batch) {
                    continue;
                }
                $startDate = optional($batch->visit_date_min)->toDateString();
                $endDate = optional($batch->visit_date_max)->toDateString();
                if ($startDate && $endDate) {
                    try {
                        $this->reconciler->reconcile($batch, $startDate, $endDate);
                    } catch (\Throwable) {
                        // ไม่บล็อกการนำเข้าถ้า reconcile รายไฟล์ล้ม
                    }
                }
            }
        }

        $created = collect($result['imported'])->where('updated', false)->count();
        $updated = collect($result['imported'])->where('updated', true)->count();

        return redirect()
            ->route('finance.cgd.import')
            ->with('success', $result['message']." · ใหม่ {$created} · อัปเดต {$updated}")
            ->with('import_failures', $result['failures'])
            ->with('nhso_status', 'done');
    }

    public function nhsoClearSession()
    {
        $this->nhsoPortal->clearSession();

        return redirect()
            ->route('finance.cgd.import')
            ->with('success', 'ล้าง session การเชื่อมต่อ e-Claim แล้ว');
    }

    protected function extendNhsoRuntime(int $seconds = 600): void
    {
        if (function_exists('set_time_limit')) {
            @set_time_limit($seconds);
        }
        @ini_set('max_execution_time', (string) $seconds);
        @ini_set('memory_limit', '512M');
    }

    protected function maskUsername(?string $username): ?string
    {
        if (! filled($username)) {
            return null;
        }
        $len = mb_strlen($username);
        if ($len <= 4) {
            return str_repeat('*', $len);
        }

        return mb_substr($username, 0, 3).str_repeat('*', max(0, $len - 7)).mb_substr($username, -4);
    }

    public function import(Request $request)
    {
        // รองรับทั้ง files[] (หลายไฟล์) และ file (ไฟล์เดียวแบบเดิม)
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
        // สรุปรวมทุกไฟล์ทำที่หน้า Dashboard — รายไฟล์เป็นตัวเลือกเสริม
        $autoReconcile = $request->boolean('auto_reconcile', false);

        foreach ($files as $file) {
            $name = $file->getClientOriginalName() ?: 'unknown.xls';
            try {
                CgdClaimFilenameGuard::assertRep($name, 'files', 'cgd');
                $result = $this->importer->import($file, $data['notes'] ?? null, 'cgd');
                /** @var CgdStmBatch $batch */
                $batch = $result['batch'];
                $wasUpdated = (bool) $result['updated'];

                $startDate = optional($batch->visit_date_min)->toDateString();
                $endDate = optional($batch->visit_date_max)->toDateString();

                if ($autoReconcile && $startDate && $endDate) {
                    $this->reconciler->reconcile($batch, $startDate, $endDate);
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

        // ไฟล์เดียวที่สำเร็จ → เปิดหน้ารายละเอียดชุดนั้น
        if (count($batches) === 1 && $failed === []) {
            return redirect()
                ->route('finance.cgd.show', $batches[0])
                ->with('success', $message);
        }

        return redirect()
            ->route('finance.cgd.import')
            ->with('success', $message)
            ->with('import_failures', $failed);
    }

    public function show(CgdStmBatch $batch, Request $request): Response
    {
        $this->extendNhsoRuntime(180);
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
            // ถ้าเลือกเดือนที่ไม่มีในรายการ (เช่น ไม่ระบุเดือน) ให้ล้างตัวกรอง
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
        @ini_set('memory_limit', '512M');
        @set_time_limit(300);

        $data = $request->validate([
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'pttype_like' => ['nullable', 'string', 'max:32'],
        ]);

        $this->reconciler->reconcile(
            $batch,
            $data['start_date'],
            $data['end_date'],
            $data['pttype_like'] ?? '12%',
        );

        $range = date('d/m/Y', strtotime($data['start_date'])).' - '.date('d/m/Y', strtotime($data['end_date']));

        return redirect()
            ->route('finance.cgd.show', $batch)
            ->with('success', "เปรียบเทียบข้อมูลใหม่เรียบร้อยแล้ว · ช่วง HOSxP {$range}");
    }

    public function showStmCompare(StmImport $stm, Request $request): Response
    {
        $this->extendNhsoRuntime(180);

        $tab = $request->query('tab');
        $tab = is_string($tab) && in_array($tab, ['compare', 'stm', 'errors', 'appeals'], true)
            ? $tab
            : 'compare';

        $stm->load(['importer:id,name']);
        $reconciliation = $stm->reconciliations()->where('scope', 'stm')->latest()->first();

        $status = $request->query('status');
        $status = is_string($status) && isset($this->statusLabels()[$status]) ? $status : null;
        $search = trim((string) $request->query('q', ''));
        $month = $this->normalizeMonthFilter($request->query('month'));
        $errorCode = $this->normalizeErrorFilter($request->query('error_code'));
        $amount = $this->normalizeAmountFilter($request->query('amount'));

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
        $amountOptions = [];

        if ($reconciliation && $tab === 'compare') {
            // Faceted filters: นับตัวเลือกของแต่ละแกนโดยคำนึงตัวกรองอื่น
            // แต่ไม่ล้างค่าที่ผู้ใช้เลือกไว้ (แม้ผลลัพธ์จะเป็น 0)
            $monthly = $this->monthlyBreakdown($reconciliation, $status, $search, $errorCode, $amount);
            $errorOptions = $this->errorCodeOptions($reconciliation, $status, $search, $month, $amount);
            $amountOptions = $this->amountFilterOptions($reconciliation, $status, $search, $month, $errorCode);
            $statusCounts = $this->statusCounts($reconciliation, $search, $month, $errorCode, $amount);

            // คงเดือน/error ที่เลือกไว้ในรายการตัวเลือก แม้หลังกรองอื่นแล้วนับได้ 0
            if ($month && ! collect($monthly)->contains(fn ($row) => $row['month'] === $month)) {
                $monthly[] = [
                    'month' => $month,
                    'label' => $this->thaiMonthLabel($month).' (0)',
                    'item_count' => 0,
                ];
            }
            if ($errorCode && ! collect($errorOptions)->contains(fn ($opt) => $opt['value'] === $errorCode)) {
                $errorOptions[] = [
                    'value' => $errorCode,
                    'label' => match ($errorCode) {
                        '__has_error__' => 'มี Error Code (0)',
                        '__none__' => 'ไม่มี Error Code (0)',
                        default => 'Error '.$errorCode.' (0)',
                    },
                    'count' => 0,
                ];
            }
            if ($amount && ! collect($amountOptions)->contains(fn ($opt) => $opt['value'] === $amount && $opt['count'] > 0)) {
                // ให้ปุ่มที่เลือกอยู่ยังโชว์ได้ แม้ count เป็น 0
                $amountOptions = collect($amountOptions)->map(function (array $opt) use ($amount) {
                    if ($opt['value'] === $amount && $opt['count'] === 0) {
                        $opt['label'] = $opt['label'].' (0)';
                    }

                    return $opt;
                })->all();
            }

            $filteredBase = $this->filteredReconcileItems($reconciliation, $status, $search, $month, $errorCode, $amount);
            $filterTotals = $this->aggregateFilterTotals($filteredBase);
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
        }

        // แท็บข้อมูลตาม STM — ตัวกรอง/สรุปแยกจากเปรียบเทียบ/Error/อุทธรณ์
        $stmQ = trim((string) $request->query('stm_q', ''));
        $stmRep = trim((string) $request->query('stm_rep', ''));
        $stmMonth = $this->normalizeMonthFilter($request->query('stm_month'));
        $stmFlag = $request->query('stm_flag');
        // รองรับพารามิเตอร์เก่า stm_shortfall=1
        if ((! is_string($stmFlag) || $stmFlag === '')
            && ($request->query('stm_shortfall') === '1' || $request->query('stm_shortfall') === 1)) {
            $stmFlag = 'shortfall';
        }
        $stmFlag = is_string($stmFlag) && isset($this->stmFlagLabels()[$stmFlag]) ? $stmFlag : null;

        $stmSummaries = $stm->summaries()
            ->orderBy('rep_no')
            ->get()
            ->map(fn ($row) => [
                'id' => $row->id,
                'rep_no' => $row->rep_no,
                'period' => $row->period,
                'count_total' => (int) $row->count_total,
                'count_pass' => (int) $row->count_pass,
                'count_fail' => (int) $row->count_fail,
                'amount_claim' => (float) $row->amount_claim,
                'amount_drug' => (float) $row->amount_drug,
                'amount_treat' => (float) $row->amount_treat,
                'amount_paid_total' => (float) $row->amount_paid_total,
            ])
            ->values()
            ->all();

        $stmRepOptions = $stm->details()
            ->whereNotNull('rep_no')
            ->where('rep_no', '!=', '')
            ->distinct()
            ->orderBy('rep_no')
            ->pluck('rep_no')
            ->values()
            ->all();

        $stmMonthOptions = $stm->details()
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

        $duplicateSeqMap = $stm->details()
            ->whereNotNull('seq_no')
            ->where('seq_no', '!=', '')
            ->selectRaw('seq_no')
            ->selectRaw('COUNT(*) as c')
            ->groupBy('seq_no')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('c', 'seq_no');

        $duplicateSeqNos = $duplicateSeqMap->keys()->all();

        $stmAgg = $stm->details()
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
                : (int) $stm->details()->whereIn('seq_no', $duplicateSeqNos)->count(),
            'duplicate_seq_groups' => count($duplicateSeqNos),
        ];

        $stmDetailQuery = $stm->details()->orderBy('rep_no')->orderBy('seq_no')->orderBy('row_no');
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

        $stmPerPage = $this->normalizePerPage($request->query('stm_per_page', 50), 50);
        if ($tab !== 'stm') {
            $stmDetails = [
                'data' => [],
                'links' => [],
                'total' => (int) ($stmStats['row_count'] ?? 0),
                'from' => null,
                'to' => null,
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => 0,
            ];
        } elseif ($stmPerPage === 'all') {
            $stmTotal = (clone $stmDetailQuery)->count();
            if ($stmTotal > 300) {
                $stmPerPage = 200;
            }
            if ($stmPerPage === 'all') {
                $stmCollection = $stmDetailQuery->get();
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

        $repNos = $stm->details()
            ->whereNotNull('rep_no')
            ->where('rep_no', '!=', '')
            ->distinct()
            ->pluck('rep_no')
            ->all();

        $errorStatus = $request->query('error_status');
        $errorStatus = is_string($errorStatus) && $errorStatus !== '' ? $errorStatus : null;
        $appealStatus = $request->query('appeal_status');
        $appealStatus = is_string($appealStatus) && $appealStatus !== '' ? $appealStatus : null;

        $repErrors = [];
        if ($tab === 'errors') {
            $repErrors = $this->reconciler->loadRepErrorRows($repNos, $stm->claim_submission_no);
            $errorCasePayload = $this->errorCases->casesForRepNos($repNos, $errorStatus, true);
        } else {
            $errorCasePayload = $this->errorCases->casesForRepNos($repNos, $errorStatus, false);
        }

        if ($tab === 'appeals') {
            $this->appeals->ensureEligibleFromStmImport($stm);
        }

        $appealMatchKeys = $tab === 'appeals'
            ? $stm->details()
                ->whereNotNull('match_key')
                ->where('match_key', '!=', '')
                ->distinct()
                ->pluck('match_key')
                ->all()
            : [];

        $appealCasePayload = $this->appeals->casesForScope(
            $repNos,
            $appealMatchKeys,
            $stm->claim_submission_no,
            $appealStatus,
            [],
            ClaimScheme::CGD,
            $tab === 'appeals',
        );

        $usedErrorCodes = collect($errorOptions)
            ->pluck('value')
            ->merge(collect($repErrors)->pluck('error_code'))
            ->merge(collect($errorCasePayload['cases'])->pluck('current_error_code'))
            ->merge(collect($errorCasePayload['cases'])->pluck('original_error_code'))
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

        return Inertia::render('Finance/CgdClaim/StmCompare', [
            'hosxpReady' => $this->hosxp->available(),
            'import' => $this->serializeStmImport($stm, true),
            'reconciliation' => $reconciliation ? $this->serializeReconciliation($reconciliation) : null,
            'monthly' => $monthly,
            'items' => $items,
            'filterTotals' => $filterTotals,
            'statusCounts' => $statusCounts,
            'stmSummaries' => $stmSummaries,
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

    public function markAppealSubmitted(Request $request)
    {
        $data = $request->validate([
            'case_ids' => ['required', 'array', 'min:1'],
            'case_ids.*' => ['integer', 'exists:finance_cgd_appeal_cases,id'],
            'note' => ['nullable', 'string', 'max:500'],
            'stm_id' => ['nullable', 'integer', 'exists:finance_stm_imports,id'],
        ]);

        $count = $this->appeals->markSubmitted(
            $data['case_ids'],
            $request->user()?->id,
            $data['note'] ?? null,
        );

        if (! empty($data['stm_id'])) {
            return redirect()
                ->route('finance.cgd.stm.compare', $data['stm_id'])
                ->with('success', "ทำเครื่องหมายยื่นอุทธรณ์เงินชดเชยแล้ว {$count} รายการ");
        }

        return back()->with('success', "ทำเครื่องหมายยื่นอุทธรณ์เงินชดเชยแล้ว {$count} รายการ");
    }

    public function reconcileStm(Request $request, StmImport $stm)
    {
        @ini_set('memory_limit', '512M');
        @set_time_limit(300);

        $data = $request->validate([
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'pttype_like' => ['nullable', 'string', 'max:32'],
        ]);

        try {
            $this->reconciler->reconcileStm(
                $stm,
                $data['start_date'],
                $data['end_date'],
                $data['pttype_like'] ?? '12%',
            );
        } catch (\Throwable $e) {
            report($e);

            return redirect()
                ->route('finance.cgd.stm.compare', $stm)
                ->with('error', $this->compareErrorMessage($e));
        }

        $range = date('d/m/Y', strtotime($data['start_date'])).' - '.date('d/m/Y', strtotime($data['end_date']));

        return redirect()
            ->route('finance.cgd.stm.compare', $stm)
            ->with('success', "เปรียบเทียบ STM {$stm->claim_submission_no} เรียบร้อย · ช่วง HOSxP {$range}");
    }

    public function destroy(CgdStmBatch $batch)
    {
        $label = $batch->document_no ?: $batch->filename;
        $rowCount = $batch->row_count;

        if ($batch->stored_path) {
            Storage::disk('local')->delete($batch->stored_path);
        }

        // ลบผลเปรียบเทียบและรายการ REP ที่เกี่ยวข้อง (FK cascade รองรับอยู่แล้ว)
        $batch->reconciliations()->each(function (CgdReconciliation $old) {
            $old->items()->delete();
            $old->delete();
        });
        $batch->zeroFundRows()->delete();
        $batch->rows()->delete();
        $batch->delete();

        return redirect()
            ->route('finance.cgd.dashboard')
            ->with('success', "ลบข้อมูลนำเข้า {$label} แล้ว ({$rowCount} รายการ)");
    }

    public function exportExcel(Request $request, CgdStmBatch $batch): StreamedResponse
    {
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
        $reconciliation = CgdReconciliation::query()->where('scope', 'stm_all')->latest()->firstOrFail();

        return $this->streamCgdExcelReport(
            $request,
            $reconciliation,
            'สรุปทุกชุด STM',
            'สรุปเปรียบเทียบทุกชุด STM กับ HOSxP',
            null,
        );
    }

    public function exportSummaryPdf(Request $request)
    {
        $reconciliation = CgdReconciliation::query()->where('scope', 'stm_all')->latest()->firstOrFail();

        return $this->downloadCgdPdfReport(
            $request,
            $reconciliation,
            'สรุปทุกชุด STM',
            null,
        );
    }

    public function exportStmCompareExcel(Request $request, StmImport $stm): StreamedResponse
    {
        $reconciliation = $stm->reconciliations()->where('scope', 'stm')->latest()->firstOrFail();

        return $this->streamCgdExcelReport(
            $request,
            $reconciliation,
            $stm->claim_submission_no,
            'เปรียบเทียบ STM '.$stm->claim_submission_no,
            null,
        );
    }

    public function exportStmComparePdf(Request $request, StmImport $stm)
    {
        $reconciliation = $stm->reconciliations()->where('scope', 'stm')->latest()->firstOrFail();

        return $this->downloadCgdPdfReport(
            $request,
            $reconciliation,
            $stm->claim_submission_no,
            null,
        );
    }

    protected function streamCgdExcelReport(
        Request $request,
        CgdReconciliation $reconciliation,
        string $docLabel,
        string $title,
        ?CgdStmBatch $batch,
    ): StreamedResponse {
        [$status, $search, $statusLabel, $month, $monthLabel, $errorCode, $errorLabel, $amount, $amountLabel] = $this->resolveExportFilters($request);

        $items = $this->filteredReconcileItems($reconciliation, $status, $search, $month, $errorCode, $amount)
            ->orderByRaw("FIELD(status,'matched_short','only_hosxp','only_stm','stm_out_of_range','matched_over','matched_ok')")
            ->orderBy('visit_date')
            ->orderByDesc('shortfall')
            ->get();

        $summary = $this->summarizeExportItems($items);
        $monthly = $this->monthlyBreakdown($reconciliation, $status, $search, $errorCode, $amount);
        if ($month) {
            $monthly = array_values(array_filter($monthly, fn ($row) => $row['month'] === $month));
        }
        $byStatus = $this->statusBreakdownFromItems($items);
        $labels = $this->statusLabels();

        $statusSlug = $status ? '_'.$status : '_all';
        $monthSlug = $month ? '_'.$month : '';
        $errorSlug = $errorCode ? '_err_'.preg_replace('/[^A-Za-z0-9_\-]/', '', (string) $errorCode) : '';
        $amountSlug = $amount ? '_'.$amount : '';
        $prefix = $batch
            ? 'CGD_REP_'.($batch->document_no ?: $batch->id)
            : 'CGD_REP_Summary';
        $filename = $prefix.$statusSlug.$monthSlug.$errorSlug.$amountSlug.'_'.now()->format('Ymd_His').'.xlsx';

        return response()->streamDownload(function () use (
            $reconciliation,
            $items,
            $summary,
            $monthly,
            $byStatus,
            $labels,
            $statusLabel,
            $search,
            $monthLabel,
            $errorLabel,
            $amountLabel,
            $month,
            $docLabel,
            $title,
        ) {
            $writer = WriterEntityFactory::createXLSXWriter();
            $writer->openToFile('php://output');

            $headerStyle = (new StyleBuilder())->setFontBold()->setFontColor(Color::WHITE)->setBackgroundColor(Color::rgb(4, 120, 87))->build();
            $titleStyle = (new StyleBuilder())->setFontBold()->setFontSize(14)->build();
            $sectionStyle = (new StyleBuilder())->setFontBold()->build();

            $writer->getCurrentSheet()->setName('สรุป');
            $writer->addRow(WriterEntityFactory::createRowFromArray([$title], $titleStyle));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['เอกสาร / ขอบเขต', $docLabel]));
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                'ช่วงวันที่ HOSxP',
                $reconciliation->start_date->format('Y-m-d').' ถึง '.$reconciliation->end_date->format('Y-m-d'),
            ]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['กรองเดือน', $monthLabel]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['กรองสถานะ', $statusLabel]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['กรอง Error Code', $errorLabel]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['กรองยอดเงิน', $amountLabel]));
            if ($search !== '') {
                $writer->addRow(WriterEntityFactory::createRowFromArray(['คำค้น', $search]));
            }
            $writer->addRow(WriterEntityFactory::createRowFromArray(['ออกรายงานเมื่อ', now()->format('d/m/Y H:i')]));
            $writer->addRow(WriterEntityFactory::createRowFromArray([]));

            $writer->addRow(WriterEntityFactory::createRowFromArray(['สรุปตามตัวกรองปัจจุบัน'], $sectionStyle));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['รายการ', 'ค่า'], $headerStyle));
            foreach ([
                ['จำนวนรายการ', $summary['item_count']],
                ['HOSxP (SEQ ตรง)', $summary['total_hosxp']],
                ['Payment (SEQ ตรง)', $summary['total_hosxp_paid']],
                ['หลังหัก Payment (SEQ ตรง)', $summary['total_hosxp_net']],
                ['เรียกเก็บ', $summary['total_claim']],
                ['ชดเชยสุทธิ', $summary['total_approved']],
                ['ยอดขาด (เรียกเก็บ − ชดเชยสุทธิ)', $summary['total_shortfall']],
                ['ยอดเกิน (ชดเชย > เรียกเก็บ)', $summary['total_over']],
                ['HOSxP ไม่มี SEQ ตรง (หลังหัก)', $summary['total_hosxp_unmatched_net']],
                ['จำนวน HOSxP ไม่มี SEQ ตรง', $summary['only_hosxp_count']],
            ] as $row) {
                $writer->addRow(WriterEntityFactory::createRowFromArray($row));
            }

            $writer->addRow(WriterEntityFactory::createRowFromArray([]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['แยกตามสถานะ (ตามตัวกรอง)'], $sectionStyle));
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                'สถานะ', 'จำนวน', 'เรียกเก็บ', 'ชดเชยสุทธิ', 'ยอดขาด', 'HOSxP หลังหัก',
            ], $headerStyle));
            foreach ($byStatus as $row) {
                $writer->addRow(WriterEntityFactory::createRowFromArray([
                    $row['label'],
                    $row['count'],
                    $row['total_claim'],
                    $row['total_approved'],
                    $row['total_shortfall'],
                    $row['total_hosxp_net'],
                ]));
            }

            $writer->addRow(WriterEntityFactory::createRowFromArray([]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['แยกตามเดือน (ตามตัวกรอง)'], $sectionStyle));
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                'เดือน', 'รายการ', 'HOSxP (SEQ)', 'Payment', 'หลังหัก',
                'เรียกเก็บ', 'ชดเชยสุทธิ', 'ยอดขาด', 'HOSxP ไม่มี SEQ',
            ], $headerStyle));
            foreach ($monthly as $m) {
                $writer->addRow(WriterEntityFactory::createRowFromArray([
                    $m['label'],
                    $m['item_count'],
                    $m['total_hosxp'],
                    $m['total_hosxp_paid'],
                    $m['total_hosxp_net'],
                    $m['total_stm_claim'],
                    $m['total_stm_approved'],
                    $m['total_shortfall'],
                    $m['total_hosxp_unmatched_net'] ?? 0,
                ]));
            }
            $writer->addRow(WriterEntityFactory::createRowFromArray([]));
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                'สูตร',
                'ยอดขาด = เรียกเก็บ − ชดเชยสุทธิ · HOSxP นับเฉพาะ SEQ ตรงกับ REP',
            ]));

            $writer->addNewSheetAndMakeItCurrent();
            $writer->getCurrentSheet()->setName('รายการ');
            $this->writeCgdDetailHeader($writer, $headerStyle);
            foreach ($items as $item) {
                $this->writeCgdDetailRow($writer, $item, $labels);
            }

            if ($month === null) {
                $grouped = $items->groupBy(function ($item) {
                    return optional($item->visit_date)->format('Y-m') ?: 'unknown';
                })->sortKeys();

                foreach ($grouped as $monthKey => $monthItems) {
                    if ($monthKey === 'unknown' || $monthItems->isEmpty()) {
                        continue;
                    }
                    $sheetName = $this->excelSheetName($this->thaiMonthLabel((string) $monthKey));
                    $writer->addNewSheetAndMakeItCurrent();
                    $writer->getCurrentSheet()->setName($sheetName);

                    $monthSummary = $this->summarizeExportItems($monthItems);
                    $writer->addRow(WriterEntityFactory::createRowFromArray([
                        'รายงานเดือน '.$this->thaiMonthLabel((string) $monthKey),
                    ], $titleStyle));
                    $writer->addRow(WriterEntityFactory::createRowFromArray(['จำนวนรายการ', $monthSummary['item_count']]));
                    $writer->addRow(WriterEntityFactory::createRowFromArray(['HOSxP (SEQ ตรง)', $monthSummary['total_hosxp']]));
                    $writer->addRow(WriterEntityFactory::createRowFromArray(['หลังหัก Payment', $monthSummary['total_hosxp_net']]));
                    $writer->addRow(WriterEntityFactory::createRowFromArray(['เรียกเก็บ', $monthSummary['total_claim']]));
                    $writer->addRow(WriterEntityFactory::createRowFromArray(['ชดเชยสุทธิ', $monthSummary['total_approved']]));
                    $writer->addRow(WriterEntityFactory::createRowFromArray(['ยอดขาด', $monthSummary['total_shortfall']]));
                    $writer->addRow(WriterEntityFactory::createRowFromArray([
                        'HOSxP ไม่มี SEQ ตรง',
                        $monthSummary['total_hosxp_unmatched_net'],
                    ]));
                    $writer->addRow(WriterEntityFactory::createRowFromArray([]));
                    $this->writeCgdDetailHeader($writer, $headerStyle);
                    foreach ($monthItems as $item) {
                        $this->writeCgdDetailRow($writer, $item, $labels);
                    }
                }
            }

            $writer->close();
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    protected function downloadCgdPdfReport(
        Request $request,
        CgdReconciliation $reconciliation,
        string $docLabel,
        ?CgdStmBatch $batch,
    ) {
        [$status, $search, $statusLabel, $month, $monthLabel, $errorCode, $errorLabel, $amount, $amountLabel] = $this->resolveExportFilters($request);

        $allFiltered = $this->filteredReconcileItems($reconciliation, $status, $search, $month, $errorCode, $amount)
            ->orderByRaw("FIELD(status,'matched_short','only_hosxp','only_stm','stm_out_of_range','matched_over','matched_ok')")
            ->orderBy('visit_date')
            ->orderByDesc('shortfall')
            ->get();

        $summary = $this->summarizeExportItems($allFiltered);
        $monthly = $this->monthlyBreakdown($reconciliation, $status, $search, $errorCode, $amount);
        if ($month) {
            $monthly = array_values(array_filter($monthly, fn ($row) => $row['month'] === $month));
        }
        $byStatus = $this->statusBreakdownFromItems($allFiltered);

        $detailQuery = $allFiltered;
        if ($status === null) {
            $detailQuery = $allFiltered->whereIn('status', [
                'matched_short', 'only_hosxp', 'only_stm', 'stm_out_of_range', 'matched_over',
            ])->values();
        }
        $items = $detailQuery->take(500);

        $setting = SettingApp::query()->first();
        [$fontRegularUri, $fontBoldUri] = $this->pdf->fontUris();

        $html = view('finance.cgd-claim-report-pdf', [
            'hospitalName' => $setting->nama_app ?? 'โรงพยาบาล',
            'batch' => $batch,
            'docLabel' => $docLabel,
            'reconciliation' => $reconciliation,
            'items' => $items,
            'summary' => $summary,
            'monthly' => $monthly,
            'byStatus' => $byStatus,
            'statusFilter' => $status,
            'statusFilterLabel' => $statusLabel,
            'monthFilter' => $month,
            'monthFilterLabel' => $monthLabel,
            'errorFilter' => $errorCode,
            'errorFilterLabel' => $errorLabel,
            'amountFilter' => $amount,
            'amountFilterLabel' => $amountLabel,
            'search' => $search,
            'statusLabels' => $this->statusLabels(),
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
            'generatedAt' => now()->format('d/m/Y H:i'),
            'detailCapped' => $detailQuery->count() > 500,
            'detailTotal' => $detailQuery->count(),
        ])->render();

        $binary = $this->pdf->render($html, 'landscape');
        $statusSlug = $status ? '_'.$status : '_summary';
        $monthSlug = $month ? '_'.$month : '';
        $errorSlug = $errorCode ? '_err_'.preg_replace('/[^A-Za-z0-9_\-]/', '', (string) $errorCode) : '';
        $amountSlug = $amount ? '_'.$amount : '';
        $prefix = $batch
            ? 'CGD_REP_'.($batch->document_no ?: $batch->id)
            : 'CGD_REP_Summary';
        $filename = $prefix.$statusSlug.$monthSlug.$errorSlug.$amountSlug.'_'.now()->format('Ymd_His').'.pdf';

        return response($binary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    /**
     * @param  Collection<int, mixed>  $items
     * @return array<string, float|int>
     */
    protected function summarizeExportItems(Collection $items): array
    {
        $matched = $items->whereIn('status', ['matched_ok', 'matched_short', 'matched_over']);
        $unmatched = $items->where('status', 'only_hosxp');

        $gross = round((float) $matched->sum(fn ($i) => (float) ($i->hosxp_total ?? 0)), 2);
        $paid = round((float) $matched->sum(fn ($i) => (float) ($i->hosxp_paid ?? 0)), 2);
        $unmatchedGross = round((float) $unmatched->sum(fn ($i) => (float) ($i->hosxp_total ?? 0)), 2);
        $unmatchedPaid = round((float) $unmatched->sum(fn ($i) => (float) ($i->hosxp_paid ?? 0)), 2);

        return [
            'item_count' => $items->count(),
            'total_hosxp' => $gross,
            'total_hosxp_paid' => $paid,
            'total_hosxp_net' => round(max(0, $gross - $paid), 2),
            'total_hosxp_unmatched' => $unmatchedGross,
            'total_hosxp_unmatched_paid' => $unmatchedPaid,
            'total_hosxp_unmatched_net' => round(max(0, $unmatchedGross - $unmatchedPaid), 2),
            'only_hosxp_count' => $unmatched->count(),
            'total_claim' => round((float) $items->sum(fn ($i) => (float) ($i->stm_claim ?? 0)), 2),
            'total_approved' => round((float) $items->sum(fn ($i) => (float) ($i->stm_approved ?? 0)), 2),
            'total_shortfall' => round((float) $items->sum(fn ($i) => (float) ($i->shortfall ?? 0)), 2),
            'total_over' => round((float) $items->sum(function ($i) {
                $diff = (float) ($i->diff_approved ?? 0);

                return $diff < -0.009 ? abs($diff) : 0;
            }), 2),
        ];
    }

    /**
     * @param  Collection<int, mixed>  $items
     * @return list<array<string, mixed>>
     */
    protected function statusBreakdownFromItems(Collection $items): array
    {
        $labels = $this->statusLabels();
        $rows = [];
        foreach (array_keys($labels) as $status) {
            $group = $items->where('status', $status);
            if ($group->isEmpty()) {
                continue;
            }
            $gross = (float) $group->sum(fn ($i) => (float) ($i->hosxp_total ?? 0));
            $paid = (float) $group->sum(fn ($i) => (float) ($i->hosxp_paid ?? 0));
            if (in_array($status, ['matched_ok', 'matched_short', 'matched_over'], true)) {
                // ok — already using group hosxp
            } elseif ($status !== 'only_hosxp') {
                $gross = 0;
                $paid = 0;
            }
            $rows[] = [
                'status' => $status,
                'label' => $labels[$status],
                'count' => $group->count(),
                'total_claim' => round((float) $group->sum(fn ($i) => (float) ($i->stm_claim ?? 0)), 2),
                'total_approved' => round((float) $group->sum(fn ($i) => (float) ($i->stm_approved ?? 0)), 2),
                'total_shortfall' => round((float) $group->sum(fn ($i) => (float) ($i->shortfall ?? 0)), 2),
                'total_hosxp_net' => round(max(0, $gross - $paid), 2),
            ];
        }

        return $rows;
    }

    protected function writeCgdDetailHeader($writer, $headerStyle): void
    {
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'เดือน', 'สถานะ', 'Error Code', 'กองทุน', 'HN', 'PID', 'SEQ NO', 'ชื่อ-สกุล', 'วันที่รับบริการ', 'แผนก',
            'รหัสสิทธิ', 'สิทธิการรักษา', 'HIPDATA',
            'HOSxP รวม', 'Payment', 'HOSxP หลังหัก Payment', 'หัก Payment',
            'HOSxP ยา', 'HOSxP อวัยวะ', 'HOSxP ค่าบริการ', 'HOSxP ลูกหนี้',
            'เรียกเก็บ', 'ชดเชยสุทธิ', 'ค่ารักษา', 'ยา', 'อวัยวะ/INSTR',
            'ผลต่าง (HOSxP−เรียกเก็บ)', 'ผลต่าง (เรียกเก็บ−ชดเชย)', 'ยอดขาด', 'REP NO', 'TRAN_ID', 'หมายเหตุ',
        ], $headerStyle));
    }

    protected function writeCgdDetailRow($writer, $item, array $labels): void
    {
        $gross = $item->hosxp_total !== null ? (float) $item->hosxp_total : null;
        $paid = $item->hosxp_paid !== null ? (float) $item->hosxp_paid : null;
        $net = $gross !== null ? round(max(0, $gross - ($paid ?? 0)), 2) : null;
        $adjusted = $paid !== null && $paid > 0.009 ? 'ใช่' : '';
        $monthKey = optional($item->visit_date)->format('Y-m') ?: 'unknown';

        $writer->addRow(WriterEntityFactory::createRowFromArray([
            $this->thaiMonthLabel($monthKey),
            $labels[$item->status] ?? $item->status,
            $item->error_code,
            $item->fund_codes,
            $item->hn,
            $item->pid,
            $item->seq_no,
            $item->patient_name ?: 'ไม่พบชื่อใน HOSxP',
            optional($item->visit_date)->format('Y-m-d'),
            $item->department,
            $item->pttype_code,
            $item->pttype,
            $item->hipdata_code,
            $item->hosxp_total,
            $item->hosxp_paid,
            $net,
            $adjusted,
            $item->hosxp_drug,
            $item->hosxp_organ,
            $item->hosxp_service,
            $item->hosxp_debt,
            $item->stm_claim,
            $item->stm_approved,
            $item->stm_treat,
            $item->stm_drug,
            $item->stm_organ,
            $item->diff_claim,
            $item->diff_approved,
            $item->shortfall,
            $item->rep_no,
            $item->tran_id,
            $item->remark,
        ]));
    }

    protected function excelSheetName(string $name): string
    {
        $name = preg_replace('/[\\\\\\/*?:\\[\\]]/', '-', $name) ?? $name;
        $name = trim($name);
        if ($name === '') {
            $name = 'Sheet';
        }

        return mb_substr($name, 0, 31);
    }

    /**
     * @return array{0:?string,1:string,2:string,3:?string,4:string,5:?string,6:string,7:?string,8:string}
     */
    protected function resolveExportFilters(Request $request): array
    {
        $labels = $this->statusLabels();
        $status = $request->query('status');
        $status = is_string($status) && isset($labels[$status]) ? $status : null;
        $search = trim((string) $request->query('q', ''));
        $month = $this->normalizeMonthFilter($request->query('month'));
        $errorCode = $this->normalizeErrorFilter($request->query('error_code'));
        $amount = $this->normalizeAmountFilter($request->query('amount'));
        $statusLabel = $status ? ($labels[$status] ?? $status) : 'ทั้งหมด';
        $monthLabel = $month ? $this->thaiMonthLabel($month) : 'ทุกเดือน';
        $errorLabel = match ($errorCode) {
            '__has_error__' => 'มี Error Code',
            '__none__' => 'ไม่มี Error Code',
            null => 'ทุก Error Code',
            default => 'Error '.$errorCode,
        };
        $amountLabel = $amount
            ? ($this->amountFilterLabels()[$amount] ?? $amount)
            : 'ทุกยอดเงิน';

        return [$status, $search, $statusLabel, $month, $monthLabel, $errorCode, $errorLabel, $amount, $amountLabel];
    }

    protected function filteredReconcileItems(
        CgdReconciliation $reconciliation,
        ?string $status,
        string $search = '',
        ?string $month = null,
        ?string $errorCode = null,
        ?string $amount = null,
    ) {
        $query = $reconciliation->items();

        if ($status) {
            $query->where('status', $status);
        }

        if ($month) {
            $query->whereRaw("DATE_FORMAT(visit_date, '%Y-%m') = ?", [$month]);
        }

        if ($errorCode === '__has_error__') {
            $query->whereNotNull('error_code')->where('error_code', '!=', '');
        } elseif ($errorCode === '__none__') {
            $query->where(function ($q) {
                $q->whereNull('error_code')->orWhere('error_code', '');
            });
        } elseif ($errorCode) {
            $query->where('error_code', $errorCode);
        }

        $this->applyAmountFilter($query, $amount);

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('hn', 'like', "%{$search}%")
                    ->orWhere('pid', 'like', "%{$search}%")
                    ->orWhere('seq_no', 'like', "%{$search}%")
                    ->orWhere('patient_name', 'like', "%{$search}%")
                    ->orWhere('pttype', 'like', "%{$search}%")
                    ->orWhere('pttype_code', 'like', "%{$search}%")
                    ->orWhere('error_code', 'like', "%{$search}%")
                    ->orWhere('fund_codes', 'like', "%{$search}%")
                    ->orWhere('remark', 'like', "%{$search}%");
            });
        }

        return $query;
    }

    protected function hosxpNetSql(): string
    {
        return 'GREATEST(0, COALESCE(hosxp_total, 0) - COALESCE(hosxp_paid, 0))';
    }

    /** @return array<string, string> */
    protected function stmFlagLabels(): array
    {
        return [
            'claim_ne_approved' => 'เรียกเก็บ ≠ พึงรับ',
            'shortfall' => 'เรียกเก็บ > พึงรับ',
            'overpay' => 'พึงรับ > เรียกเก็บ',
            'duplicate_seq' => 'SEQ ซ้ำ',
            'zero_approved' => 'พึงรับ = 0 (มีเรียกเก็บ)',
            'missing_seq' => 'ไม่มี SEQ',
        ];
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<\App\Models\Finance\StmDetailRow>  $query
     * @param  list<string>  $duplicateSeqNos
     */
    protected function applyStmFlagFilter($query, ?string $flag, array $duplicateSeqNos): void
    {
        if (! $flag) {
            return;
        }

        if ($flag === 'claim_ne_approved') {
            $query->whereRaw('ABS(COALESCE(amount_claim, 0) - COALESCE(amount_approved, 0)) >= 0.01');
        } elseif ($flag === 'shortfall') {
            $query->whereRaw('COALESCE(amount_claim, 0) - COALESCE(amount_approved, 0) > 0.009');
        } elseif ($flag === 'overpay') {
            $query->whereRaw('COALESCE(amount_approved, 0) - COALESCE(amount_claim, 0) > 0.009');
        } elseif ($flag === 'duplicate_seq') {
            if ($duplicateSeqNos === []) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn('seq_no', $duplicateSeqNos);
            }
        } elseif ($flag === 'zero_approved') {
            $query->whereRaw('COALESCE(amount_claim, 0) > 0.009')
                ->whereRaw('COALESCE(amount_approved, 0) < 0.01');
        } elseif ($flag === 'missing_seq') {
            $query->where(function ($q) {
                $q->whereNull('seq_no')->orWhere('seq_no', '');
            });
        }
    }

    protected function normalizeAmountFilter(mixed $amount): ?string
    {
        if (! is_string($amount) || $amount === '') {
            return null;
        }

        return isset($this->amountFilterLabels()[$amount]) ? $amount : null;
    }

    /** @return array<string,string> */
    protected function amountFilterLabels(): array
    {
        return [
            'hosxp_ne_claim' => 'HOSxP สุทธิ ≠ เรียกเก็บ',
            'gap_service_50' => 'ส่วนต่างบริการ ≈ 50 บาท',
            'gap_organ_missing' => 'อวัยวะเทียมไม่เข้า STM',
            'gap_service' => 'ค่าบริการ ≠ treat STM',
            'hosxp_ne_approved' => 'HOSxP สุทธิ ≠ ชดเชย',
            'hosxp_ne_stm' => 'HOSxP สุทธิ ≠ เรียกเก็บ/ชดเชย',
        ];
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<\App\Models\Finance\CgdReconcileItem>|\Illuminate\Database\Query\Builder  $query
     */
    protected function applyAmountFilter($query, ?string $amount): void
    {
        if (! $amount) {
            return;
        }

        $net = $this->hosxpNetSql();
        $matched = ['matched_ok', 'matched_short', 'matched_over'];
        $serviceGap = '(COALESCE(hosxp_service, 0) - COALESCE(stm_treat, 0))';

        $query->whereIn('status', $matched);

        if ($amount === 'hosxp_ne_claim') {
            $query->whereRaw("ABS(({$net}) - COALESCE(stm_claim, 0)) >= 0.01");
        } elseif ($amount === 'hosxp_ne_approved') {
            $query->whereRaw("ABS(({$net}) - COALESCE(stm_approved, 0)) >= 0.01");
        } elseif ($amount === 'hosxp_ne_stm') {
            $query->where(function ($q) use ($net) {
                $q->whereRaw("ABS(({$net}) - COALESCE(stm_claim, 0)) >= 0.01")
                    ->orWhereRaw("ABS(({$net}) - COALESCE(stm_approved, 0)) >= 0.01");
            });
        } elseif ($amount === 'gap_service_50') {
            // แพทเทิร์นหลัก: service HOSxP สูงกว่า treat STM ประมาณ 50 บาท (เช่น inc12)
            $query->whereRaw("ABS(({$serviceGap}) - 50) < 0.01");
        } elseif ($amount === 'gap_organ_missing') {
            $query->whereRaw('COALESCE(hosxp_organ, 0) >= 0.01')
                ->whereRaw('COALESCE(stm_organ, 0) < 0.01');
        } elseif ($amount === 'gap_service') {
            $query->whereRaw("ABS({$serviceGap}) >= 0.01")
                ->whereRaw("ABS(({$net}) - COALESCE(stm_claim, 0)) >= 0.01");
        }
    }

    /**
     * @return list<array{value:string,label:string,count:int}>
     */
    protected function amountFilterOptions(
        CgdReconciliation $reconciliation,
        ?string $status = null,
        string $search = '',
        ?string $month = null,
        ?string $errorCode = null,
    ): array {
        $options = [];
        foreach ($this->amountFilterLabels() as $value => $label) {
            $count = $this->filteredReconcileItems(
                $reconciliation,
                $status,
                $search,
                $month,
                $errorCode,
                $value,
            )->count();
            $options[] = [
                'value' => $value,
                'label' => $label,
                'count' => $count,
            ];
        }

        return $options;
    }

    protected function normalizeErrorFilter(mixed $errorCode): ?string
    {
        if (! is_string($errorCode) || $errorCode === '') {
            return null;
        }
        if (in_array($errorCode, ['__has_error__', '__none__'], true)) {
            return $errorCode;
        }
        $errorCode = trim($errorCode);
        if ($errorCode === '' || strlen($errorCode) > 64) {
            return null;
        }

        return $errorCode;
    }

    /**
     * ค่าเริ่มต้น = all เพื่อให้รายการตามตัวกรองแสดงครบ
     *
     * @return int|'all'
     */
    protected function normalizePerPage(mixed $perPage, int|string $default = 100): int|string
    {
        if ($perPage === 'all') {
            return 'all';
        }

        if ($perPage === null || $perPage === '') {
            return $default;
        }

        $n = (int) $perPage;
        if (in_array($n, [50, 100, 200, 500], true)) {
            return $n;
        }

        return $default;
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<\App\Models\Finance\CgdReconcileItem>  $query
     * @return array<string, mixed>
     */
    protected function paginateReconcileItems($query, Request $request): array
    {
        $perPage = $this->normalizePerPage($request->query('per_page'));

        if ($perPage === 'all') {
            $total = (clone $query)->toBase()->getCountForPagination();
            if ($total > 300) {
                $perPage = 200;
            }
        }

        if ($perPage === 'all') {
            $collection = $query->get();
            $total = $collection->count();

            return [
                'data' => $this->enrichVisitAt($collection->map(fn ($item) => $this->serializeItem($item))->values()->all()),
                'links' => [],
                'total' => $total,
                'from' => $total > 0 ? 1 : null,
                'to' => $total > 0 ? $total : null,
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $total > 0 ? $total : 0,
            ];
        }

        $paginator = $query
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn ($item) => $this->serializeItem($item));

        $arr = $paginator->toArray();

        return [
            'data' => $this->enrichVisitAt($arr['data'] ?? []),
            'links' => $arr['links'] ?? [],
            'total' => (int) ($arr['total'] ?? 0),
            'from' => $arr['from'] ?? null,
            'to' => $arr['to'] ?? null,
            'current_page' => (int) ($arr['current_page'] ?? 1),
            'last_page' => (int) ($arr['last_page'] ?? 1),
            'per_page' => (int) ($arr['per_page'] ?? $perPage),
        ];
    }

    /**
     * นับรายการต่อสถานะ ตามตัวกรองอื่น (ไม่รวม status) ให้ตัวเลขบนปุ่มตรงกับตาราง
     *
     * @return array<string, int>
     */
    protected function statusCounts(
        CgdReconciliation $reconciliation,
        string $search = '',
        ?string $month = null,
        ?string $errorCode = null,
        ?string $amount = null,
    ): array {
        $base = $this->filteredReconcileItems($reconciliation, null, $search, $month, $errorCode, $amount)
            ->toBase()
            ->reorder();
        $base->columns = null;
        if (isset($base->bindings['select'])) {
            $base->bindings['select'] = [];
        }

        $rows = $base
            ->selectRaw('status')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $counts = [];
        foreach (array_keys($this->statusLabels()) as $key) {
            $counts[$key] = (int) ($rows[$key] ?? 0);
        }

        return $counts;
    }

    /**
     * @return list<array{value:string,label:string,count:int}>
     */
    protected function errorCodeOptions(
        CgdReconciliation $reconciliation,
        ?string $status = null,
        string $search = '',
        ?string $month = null,
        ?string $amount = null,
    ): array {
        $base = $this->filteredReconcileItems($reconciliation, $status, $search, $month, null, $amount);

        $countQuery = (clone $base)->toBase()->reorder();
        $countQuery->columns = null;
        if (isset($countQuery->bindings['select'])) {
            $countQuery->bindings['select'] = [];
        }

        $counts = $countQuery
            ->selectRaw("COALESCE(NULLIF(error_code, ''), '__none__') as code")
            ->selectRaw('COUNT(*) as total')
            ->groupBy('code')
            ->orderByDesc('total')
            ->get();

        $hasErrorCount = (clone $base)
            ->whereNotNull('error_code')
            ->where('error_code', '!=', '')
            ->count();

        $options = [
            [
                'value' => '__has_error__',
                'label' => 'มี Error Code',
                'count' => (int) $hasErrorCount,
            ],
        ];

        foreach ($counts as $row) {
            $code = (string) $row->code;
            $options[] = [
                'value' => $code,
                'label' => $code === '__none__' ? 'ไม่มี Error Code' : 'Error '.$code,
                'count' => (int) $row->total,
            ];
        }

        return collect($options)
            ->filter(fn ($opt) => $opt['count'] > 0)
            ->values()
            ->all();
    }

    protected function normalizeMonthFilter(mixed $month): ?string
    {
        if (! is_string($month) || $month === '') {
            return null;
        }
        // ไม่รองรับตัวกรอง "ไม่ระบุเดือน"
        if ($month === 'unknown' || ! preg_match('/^\d{4}-\d{2}$/', $month)) {
            return null;
        }

        return $month;
    }

    /**
     * @return list<array<string, mixed>>
     */
    protected function monthlyBreakdown(
        CgdReconciliation $reconciliation,
        ?string $status = null,
        string $search = '',
        ?string $errorCode = null,
        ?string $amount = null,
    ): array {
        $base = $this->filteredReconcileItems($reconciliation, $status, $search, null, $errorCode, $amount)
            ->toBase()
            ->reorder();
        $base->columns = null;
        if (isset($base->bindings['select'])) {
            $base->bindings['select'] = [];
        }

        $matchedCase = "status IN ('matched_ok','matched_short','matched_over')";

        $rows = $base
            ->selectRaw("COALESCE(DATE_FORMAT(visit_date, '%Y-%m'), 'unknown') as month_key")
            ->selectRaw('COUNT(*) as item_count')
            ->selectRaw("SUM(CASE WHEN {$matchedCase} THEN COALESCE(hosxp_total, 0) ELSE 0 END) as total_hosxp")
            ->selectRaw("SUM(CASE WHEN {$matchedCase} THEN COALESCE(hosxp_paid, 0) ELSE 0 END) as total_hosxp_paid")
            ->selectRaw("SUM(CASE WHEN status = 'only_hosxp' THEN COALESCE(hosxp_total, 0) ELSE 0 END) as total_hosxp_unmatched")
            ->selectRaw("SUM(CASE WHEN status = 'only_hosxp' THEN COALESCE(hosxp_paid, 0) ELSE 0 END) as total_hosxp_unmatched_paid")
            ->selectRaw('SUM(COALESCE(stm_claim, 0)) as total_stm_claim')
            ->selectRaw('SUM(COALESCE(stm_approved, 0)) as total_stm_approved')
            ->selectRaw('SUM(COALESCE(stm_treat, 0)) as total_stm_treat')
            ->selectRaw('SUM(COALESCE(shortfall, 0)) as total_shortfall')
            ->selectRaw("SUM(CASE WHEN status = 'matched_ok' THEN 1 ELSE 0 END) as matched_ok")
            ->selectRaw("SUM(CASE WHEN status = 'matched_short' THEN 1 ELSE 0 END) as matched_short")
            ->selectRaw("SUM(CASE WHEN status = 'matched_over' THEN 1 ELSE 0 END) as matched_over")
            ->selectRaw("SUM(CASE WHEN status = 'only_hosxp' THEN 1 ELSE 0 END) as only_hosxp")
            ->selectRaw("SUM(CASE WHEN status = 'only_stm' THEN 1 ELSE 0 END) as only_stm")
            ->selectRaw("SUM(CASE WHEN status = 'stm_out_of_range' THEN 1 ELSE 0 END) as stm_out_of_range")
            ->groupByRaw("COALESCE(DATE_FORMAT(visit_date, '%Y-%m'), 'unknown')")
            ->orderByRaw("CASE WHEN COALESCE(DATE_FORMAT(visit_date, '%Y-%m'), 'unknown') = 'unknown' THEN 1 ELSE 0 END")
            ->orderByRaw("COALESCE(DATE_FORMAT(visit_date, '%Y-%m'), 'unknown')")
            ->get();

        return $rows
            ->filter(function ($row) {
                // ไม่แสดงเดือนที่ไม่มีข้อมูล หรือไม่ระบุวันเข้ารักษา
                return (string) $row->month_key !== 'unknown'
                    && (int) $row->item_count > 0;
            })
            ->map(function ($row) {
                $gross = (float) $row->total_hosxp;
                $paid = (float) $row->total_hosxp_paid;
                $unmatchedGross = (float) $row->total_hosxp_unmatched;
                $unmatchedPaid = (float) $row->total_hosxp_unmatched_paid;

                return [
                    'month' => $row->month_key,
                    'label' => $this->thaiMonthLabel((string) $row->month_key),
                    'item_count' => (int) $row->item_count,
                    'total_hosxp' => $gross,
                    'total_hosxp_paid' => $paid,
                    'total_hosxp_net' => round(max(0, $gross - $paid), 2),
                    'total_hosxp_unmatched' => $unmatchedGross,
                    'total_hosxp_unmatched_paid' => $unmatchedPaid,
                    'total_hosxp_unmatched_net' => round(max(0, $unmatchedGross - $unmatchedPaid), 2),
                    'total_stm_claim' => (float) $row->total_stm_claim,
                    'total_stm_approved' => (float) $row->total_stm_approved,
                    'total_stm_treat' => (float) $row->total_stm_treat,
                    'total_shortfall' => (float) $row->total_shortfall,
                    'matched_ok' => (int) $row->matched_ok,
                    'matched_short' => (int) $row->matched_short,
                    'matched_over' => (int) $row->matched_over,
                    'only_hosxp' => (int) $row->only_hosxp,
                    'only_stm' => (int) $row->only_stm,
                    'stm_out_of_range' => (int) $row->stm_out_of_range,
                ];
            })
            ->values()
            ->all();
    }

    protected function thaiMonthLabel(string $monthKey): string
    {
        if ($monthKey === 'unknown') {
            return 'ไม่ระบุเดือน';
        }

        [$year, $month] = array_pad(explode('-', $monthKey), 2, null);
        $monthNum = (int) $month;
        $names = [1 => 'ม.ค.', 2 => 'ก.พ.', 3 => 'มี.ค.', 4 => 'เม.ย.', 5 => 'พ.ค.', 6 => 'มิ.ย.', 7 => 'ก.ค.', 8 => 'ส.ค.', 9 => 'ก.ย.', 10 => 'ต.ค.', 11 => 'พ.ย.', 12 => 'ธ.ค.'];
        $thaiYear = ((int) $year) + 543;

        return ($names[$monthNum] ?? $monthKey).' '.$thaiYear;
    }

    protected function serializeStmImport(StmImport $import, bool $full = false): array
    {
        $latest = $import->relationLoaded('reconciliations')
            ? $import->reconciliations->first()
            : $import->reconciliations()->where('scope', 'stm')->latest()->first();

        $data = [
            'id' => $import->id,
            'claim_submission_no' => $import->claim_submission_no,
            'filename' => $import->filename,
            'hcode' => $import->hcode,
            'hospital_name' => $import->hospital_name,
            'channel' => $import->channel,
            'period_label' => $import->period_label,
            'detail_count' => $import->detail_count,
            'summary_count' => $import->summary_count,
            'rep_count' => $import->rep_count,
            'total_claim' => (float) $import->total_claim,
            'total_approved' => (float) $import->total_approved,
            'visit_date_min' => optional($import->visit_date_min)->toDateString(),
            'visit_date_max' => optional($import->visit_date_max)->toDateString(),
            'sheet_names' => $import->sheet_names ?: [],
            'imported_by' => $import->importer?->name,
            'created_at' => optional($import->created_at)->format('d/m/Y H:i'),
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

        if ($full) {
            $data['notes'] = $import->notes;
            $data['province'] = $import->province;
        }

        return $data;
    }

    protected function serializeBatch(CgdStmBatch $batch): array
    {
        $latest = $batch->relationLoaded('reconciliations')
            ? $batch->reconciliations->first()
            : $batch->reconciliations()->where('scope', 'batch')->latest()->first();

        return [
            'id' => $batch->id,
            'filename' => $batch->filename,
            'document_no' => $batch->document_no,
            'hcode' => $batch->hcode,
            'period_label' => $batch->period_label,
            'channel' => $batch->channel,
            'source_format' => $batch->source_format ?: 'stm',
            'file_kind' => $batch->file_kind ?: 'rep',
            'parent_document_hint' => $batch->parent_document_hint,
            'row_count' => $batch->row_count,
            'error_row_count' => (int) ($batch->error_row_count ?? 0),
            'zero_fund_count' => (int) ($batch->zero_fund_count ?? 0),
            'total_claim' => (float) $batch->total_claim,
            'total_approved' => (float) $batch->total_approved,
            'visit_date_min' => optional($batch->visit_date_min)->toDateString(),
            'visit_date_max' => optional($batch->visit_date_max)->toDateString(),
            'status' => $batch->status,
            'notes' => $batch->notes,
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

    protected function serializeReconciliation(CgdReconciliation $r): array
    {
        if (! $r->relationLoaded('stmImport') && $r->stm_import_id) {
            $r->load('stmImport:id,claim_submission_no,filename');
        }
        if (! $r->relationLoaded('batch') && $r->batch_id) {
            $r->load('batch:id,document_no,filename');
        }

        $matchedStatuses = ['matched_ok', 'matched_short', 'matched_over'];

        $totalGross = (float) $r->items()->whereIn('status', $matchedStatuses)->sum('hosxp_total');
        $totalPaid = (float) $r->items()->whereIn('status', $matchedStatuses)->sum('hosxp_paid');
        $totalNet = round(max(0, $totalGross - $totalPaid), 2);

        $unmatchedGross = (float) $r->items()->where('status', 'only_hosxp')->sum('hosxp_total');
        $unmatchedPaid = (float) $r->items()->where('status', 'only_hosxp')->sum('hosxp_paid');
        $unmatchedNet = round(max(0, $unmatchedGross - $unmatchedPaid), 2);

        $matchedCount = (int) $r->items()->whereIn('status', $matchedStatuses)->count();
        $totalTreat = (float) $r->items()->sum('stm_treat');

        return [
            'id' => $r->id,
            'batch_id' => $r->batch_id,
            'stm_import_id' => $r->stm_import_id,
            'claim_submission_no' => $r->claim_submission_no ?: $r->stmImport?->claim_submission_no,
            'scope' => $r->scope ?: 'batch',
            'start_date' => $r->start_date->format('Y-m-d'),
            'end_date' => $r->end_date->format('Y-m-d'),
            'pttype_like' => $r->pttype_like,
            'exclude_deps' => $r->exclude_deps,
            'hosxp_count' => $r->hosxp_count,
            'matched_hosxp_count' => $matchedCount,
            'stm_count' => $r->stm_count,
            'matched_ok' => $r->matched_ok,
            'matched_short' => $r->matched_short,
            'matched_over' => $r->matched_over,
            'only_hosxp' => $r->only_hosxp,
            'only_stm' => $r->only_stm,
            'stm_out_of_range' => $r->stm_out_of_range,
            'total_hosxp' => $totalGross,
            'total_hosxp_paid' => $totalPaid,
            'total_hosxp_net' => $totalNet,
            'total_hosxp_unmatched' => $unmatchedGross,
            'total_hosxp_unmatched_paid' => $unmatchedPaid,
            'total_hosxp_unmatched_net' => $unmatchedNet,
            'total_stm_claim' => (float) $r->total_stm_claim,
            'total_stm_approved' => (float) $r->total_stm_approved,
            'total_stm_treat' => $totalTreat,
            'total_shortfall' => (float) $r->total_shortfall,
            'total_claim_diff' => (float) $r->total_claim_diff,
            'created_at' => optional($r->created_at)->format('d/m/Y H:i'),
            'document_no' => $r->claim_submission_no ?: $r->batch?->document_no,
            'filename' => $r->stmImport?->filename ?: $r->batch?->filename,
        ];
    }

    /**
     * เติม visit_at จาก STM detail สำหรับรายการเก่าที่ยังไม่มีค่า
     *
     * @param  list<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    protected function enrichVisitAt(array $rows): array
    {
        $needSeqs = collect($rows)
            ->filter(fn ($row) => empty($row['visit_at']) && ! empty($row['seq_no']))
            ->pluck('seq_no')
            ->unique()
            ->values()
            ->all();

        if ($needSeqs === []) {
            return $rows;
        }

        $bySeq = StmDetailRow::query()
            ->whereIn('seq_no', $needSeqs)
            ->whereNotNull('visit_at')
            ->orderByDesc('id')
            ->get(['seq_no', 'visit_at'])
            ->unique('seq_no')
            ->mapWithKeys(fn ($row) => [
                (string) $row->seq_no => optional($row->visit_at)->format('Y-m-d H:i:s'),
            ]);

        return array_map(function (array $row) use ($bySeq) {
            if (empty($row['visit_at']) && ! empty($row['seq_no'])) {
                $row['visit_at'] = $bySeq[(string) $row['seq_no']] ?? null;
            }

            return $row;
        }, $rows);
    }

    protected function serializeItem($item): array
    {
        $gross = $item->hosxp_total !== null ? (float) $item->hosxp_total : null;
        $paid = $item->hosxp_paid !== null ? (float) $item->hosxp_paid : null;
        $net = $gross !== null
            ? round(max(0, $gross - ($paid ?? 0)), 2)
            : null;
        $paymentAdjusted = $paid !== null && $paid > 0.009;

        return [
            'id' => $item->id,
            'status' => $item->status,
            'status_label' => $this->statusLabels()[$item->status] ?? $item->status,
            'hn' => $item->hn,
            'pid' => $item->pid,
            'seq_no' => $item->seq_no,
            'patient_name' => $item->patient_name,
            'visit_date' => optional($item->visit_date)->format('Y-m-d'),
            'visit_at' => optional($item->visit_at)->format('Y-m-d H:i:s'),
            'department' => $item->department,
            'pttype' => $item->pttype,
            'pttype_code' => $item->pttype_code,
            'hipdata_code' => $item->hipdata_code,
            'hosxp_total' => $gross,
            'hosxp_paid' => $paid,
            'hosxp_net' => $net,
            'payment_adjusted' => $paymentAdjusted,
            'hosxp_drug' => $item->hosxp_drug,
            'hosxp_organ' => $item->hosxp_organ,
            'hosxp_service' => $item->hosxp_service,
            'hosxp_debt' => $item->hosxp_debt,
            'stm_claim' => $item->stm_claim,
            'stm_approved' => $item->stm_approved,
            'stm_drug' => $item->stm_drug,
            'stm_organ' => $item->stm_organ,
            'stm_treat' => $item->stm_treat,
            'diff_claim' => $item->diff_claim,
            'diff_approved' => $item->diff_approved,
            'shortfall' => $item->shortfall,
            'rep_no' => $item->rep_no,
            'claim_submission_no' => $item->claim_submission_no,
            'error_code' => $item->error_code,
            'fund_codes' => $item->fund_codes,
            'tran_id' => $item->tran_id,
            'remark' => $item->remark,
        ];
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<\App\Models\Finance\CgdReconcileItem>  $query
     * @return array<string, float|int>
     */
    protected function aggregateFilterTotals($query): array
    {
        $base = (clone $query)->toBase()->reorder();
        // เคลียร์ select เดิมกันไม่ให้ * ปนกับ aggregate แล้วได้ยอดผิด
        $base->columns = null;
        if (isset($base->bindings['select'])) {
            $base->bindings['select'] = [];
        }

        $matchedCase = "status IN ('matched_ok','matched_short','matched_over')";
        $netSql = $this->hosxpNetSql();

        $row = $base
            ->selectRaw('COUNT(*) as item_count')
            ->selectRaw("SUM(CASE WHEN {$matchedCase} THEN COALESCE(hosxp_total, 0) ELSE 0 END) as total_hosxp")
            ->selectRaw("SUM(CASE WHEN {$matchedCase} THEN COALESCE(hosxp_paid, 0) ELSE 0 END) as total_hosxp_paid")
            ->selectRaw("SUM(CASE WHEN {$matchedCase} THEN ({$netSql}) ELSE 0 END) as total_hosxp_net_matched")
            ->selectRaw("SUM(CASE WHEN status = 'only_hosxp' THEN COALESCE(hosxp_total, 0) ELSE 0 END) as total_hosxp_unmatched")
            ->selectRaw("SUM(CASE WHEN status = 'only_hosxp' THEN COALESCE(hosxp_paid, 0) ELSE 0 END) as total_hosxp_unmatched_paid")
            ->selectRaw("SUM(CASE WHEN status = 'only_hosxp' THEN 1 ELSE 0 END) as only_hosxp_count")
            ->selectRaw('SUM(COALESCE(stm_claim, 0)) as total_claim')
            ->selectRaw('SUM(COALESCE(stm_approved, 0)) as total_approved')
            ->selectRaw('SUM(COALESCE(stm_treat, 0)) as total_treat')
            ->selectRaw('SUM(COALESCE(shortfall, 0)) as total_shortfall')
            ->selectRaw('SUM(CASE WHEN COALESCE(diff_approved, 0) < -0.009 THEN ABS(diff_approved) ELSE 0 END) as total_over')
            ->selectRaw('SUM(COALESCE(diff_approved, 0)) as total_diff')
            ->selectRaw("SUM(({$netSql}) - COALESCE(stm_claim, 0)) as total_claim_gap")
            ->first();

        $gross = (float) ($row->total_hosxp ?? 0);
        $paid = (float) ($row->total_hosxp_paid ?? 0);
        $unmatchedGross = (float) ($row->total_hosxp_unmatched ?? 0);
        $unmatchedPaid = (float) ($row->total_hosxp_unmatched_paid ?? 0);
        $netMatched = (float) ($row->total_hosxp_net_matched ?? max(0, $gross - $paid));
        $totalClaim = (float) ($row->total_claim ?? 0);

        return [
            'item_count' => (int) ($row->item_count ?? 0),
            'total_hosxp' => $gross,
            'total_hosxp_paid' => $paid,
            'total_hosxp_net' => round(max(0, $gross - $paid), 2),
            'total_hosxp_unmatched' => $unmatchedGross,
            'total_hosxp_unmatched_paid' => $unmatchedPaid,
            'total_hosxp_unmatched_net' => round(max(0, $unmatchedGross - $unmatchedPaid), 2),
            'only_hosxp_count' => (int) ($row->only_hosxp_count ?? 0),
            'total_claim' => $totalClaim,
            'total_approved' => (float) ($row->total_approved ?? 0),
            'total_treat' => (float) ($row->total_treat ?? 0),
            'total_shortfall' => (float) ($row->total_shortfall ?? 0),
            'total_over' => (float) ($row->total_over ?? 0),
            'total_diff' => (float) ($row->total_diff ?? 0),
            'total_claim_gap' => round((float) ($row->total_claim_gap ?? ($netMatched - $totalClaim)), 2),
        ];
    }

    /** @return array<string,string> */
    protected function statusLabels(): array
    {
        return [
            'matched_ok' => 'ตรงกัน',
            'matched_short' => 'ขาดเงิน (เรียกเก็บ > ชดเชย)',
            'matched_over' => 'ชดเชยเกินเรียกเก็บ',
            'only_hosxp' => 'HOSxP ไม่มี SEQ ตรงกับ STM',
            'only_stm' => 'STM ไม่มี SEQ ตรงกับ HOSxP',
            'stm_out_of_range' => 'STM นอกช่วงวันที่ HOSxP',
        ];
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
