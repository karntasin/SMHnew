<?php

namespace App\Http\Controllers\Rcm;

use App\Http\Controllers\Controller;
use App\Models\Finance\CgdStmBatch;
use App\Models\Finance\CgdStmRow;
use App\Services\Finance\CgdClaimFilenameGuard;
use App\Services\Finance\CgdEclaimNhsoPortalService;
use App\Services\Finance\CgdStmImportService;
use App\Services\Finance\StmFileImportService;
use App\Services\Rcm\RcmAutoSyncService;
use App\Services\Rcm\RcmReportService;
use App\Support\Finance\ClaimScheme;
use App\Support\PiiMask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RcmImportController extends Controller
{
    public function __construct(
        protected readonly RcmAutoSyncService $autoSyncService,
        protected readonly CgdEclaimNhsoPortalService $portalService,
        protected readonly CgdStmImportService $repImporter,
        protected readonly StmFileImportService $stmImporter,
        protected readonly RcmReportService $reportService,
    ) {}

    /**
     * หน้าแรกศูนย์รวมการนำเข้าข้อมูล RCM (Centralized Data Import & Auto-Sync Center)
     */
    public function index(Request $request): InertiaResponse
    {
        $search = trim((string) $request->input('search', ''));
        $scheme = trim((string) $request->input('scheme', 'all'));
        $fileKind = trim((string) $request->input('file_kind', 'all'));
        $status = trim((string) $request->input('status', 'all'));
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        // Query Batches
        $query = CgdStmBatch::query()
            ->with('importedBy:id,name')
            ->orderBy('id', 'desc');

        if (filled($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('filename', 'like', "%{$search}%")
                  ->orWhere('document_no', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        if ($scheme !== 'all' && filled($scheme)) {
            $query->where('scheme', strtolower($scheme));
        }

        if ($fileKind !== 'all' && filled($fileKind)) {
            $query->where('file_kind', strtolower($fileKind));
        }

        if ($status !== 'all' && filled($status)) {
            $query->where('status', strtolower($status));
        }

        if (filled($dateFrom)) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }

        if (filled($dateTo)) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        $batches = $query->paginate(20)->withQueryString();

        // ภาพรวมสถิติ (KPIs)
        $stats = [
            'total_batches' => (int) CgdStmBatch::count(),
            'total_rows' => (int) CgdStmBatch::sum('row_count'),
            'total_claim' => (float) CgdStmBatch::sum('total_claim'),
            'total_approved' => (float) CgdStmBatch::sum('total_approved'),
            'total_errors' => (int) CgdStmBatch::sum('error_row_count'),
            'by_scheme' => CgdStmBatch::selectRaw('scheme, count(*) as count, sum(row_count) as total_rows, sum(total_approved) as approved')
                ->groupBy('scheme')
                ->get()
                ->keyBy('scheme'),
        ];

        // รายการสิทธิทั้งหมดจาก config('claim_schemes') รองรับการเพิ่มสิทธิใหม่
        $configuredSchemes = config('claim_schemes', []);
        $schemesList = [];
        foreach ($configuredSchemes as $key => $cfg) {
            $schemesList[] = [
                'key' => $key,
                'title' => $cfg['title'] ?? strtoupper($key),
                'short_title' => $cfg['short_title'] ?? strtoupper($key),
                'description' => $cfg['description'] ?? '',
                'has_stm' => (bool) ($cfg['has_stm'] ?? true),
                'portal_configured' => $this->portalService->forScheme($key)->isConfigured(),
                'totp_configured' => $this->portalService->forScheme($key)->isTotpConfigured(),
            ];
        }

        $lastSync = Cache::get('rcm_last_one_click_sync');

        return Inertia::render('Rcm/ImportIndex', [
            'batches' => $batches,
            'filters' => [
                'search' => $search,
                'scheme' => $scheme,
                'file_kind' => $fileKind,
                'status' => $status,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
            'stats' => $stats,
            'schemes' => $schemesList,
            'last_sync' => $lastSync,
        ]);
    }

    /**
     * ซิงค์ครบวงจรทุกสิทธิอัตโนมัติ (One-Click Sync All Schemes)
     */
    public function oneClickSyncAll(Request $request): JsonResponse
    {
        $year = (int) $request->input('year', now()->year);
        $month = (int) $request->input('month', now()->month);
        $otp = trim((string) $request->input('otp', ''));
        $force = (bool) $request->input('force', false);

        try {
            $result = $this->autoSyncService->runComprehensiveSyncAllSchemes($year, $month, $otp, $force);

            return response()->json($result);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'เกิดข้อผิดพลาดในการซิงค์ครบวงจร: ' . $e->getMessage(),
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ดึงข้อมูลเฉพาะสิทธิที่เลือกจาก Portal e-Claim
     */
    public function syncScheme(Request $request): JsonResponse
    {
        $scheme = trim((string) $request->input('scheme', 'ucs'));
        $year = (int) $request->input('year', now()->year);
        $month = (int) $request->input('month', now()->month);
        $otp = trim((string) $request->input('otp', ''));
        $force = (bool) $request->input('force', false);

        try {
            $portal = $this->portalService->forScheme($scheme);

            if (! $portal->isConfigured()) {
                return response()->json([
                    'success' => false,
                    'message' => "ยังไม่ได้ตั้งค่า Username/Password สำหรับสิทธิ {$scheme} ใน .env",
                ], 422);
            }

            if (filled($otp)) {
                $login = $portal->submitOtp($otp);
            } else {
                $login = $portal->startLogin($year, $month);
            }

            if (($login['status'] ?? '') === 'awaiting_otp') {
                return response()->json([
                    'success' => false,
                    'requires_otp' => true,
                    'message' => 'ระบบ e-Claim บังคับยืนยันตัวตน 2FA กรุณากรอกรหัส OTP 6 หลัก',
                ]);
            }

            $scan = $portal->scanFiles($year, $month);
            $newFiles = (int) ($scan['new_files'] ?? 0);
            $allowed = (int) ($scan['allowed_files'] ?? 0);
            $existing = (int) ($scan['existing_files'] ?? 0);

            $importedCount = 0;
            if ($newFiles > 0 || $force) {
                $res = $portal->downloadAndImport($this->repImporter, "RCM Portal Sync ({$scheme})", 0, ! $force);
                $importedCount = count($res['imported'] ?? []);
            }

            if (config("claim_schemes.{$scheme}.has_stm", true)) {
                try {
                    $stmRes = $portal->downloadAndImportAllStmFiles($this->stmImporter, $year, $month, "RCM Portal Sync ({$scheme})");
                    $importedCount += (int) ($stmRes['imported'] ?? 0);
                } catch (\Throwable $stmEx) {
                    // non-fatal
                }
            }

            $schemeTitle = config("claim_schemes.{$scheme}.title", strtoupper($scheme));
            $msg = $importedCount > 0
                ? "ดาวน์โหลดและนำเข้าไฟล์ {$schemeTitle} สำเร็จ {$importedCount} ไฟล์"
                : "ตรวจสอบเว็บ e-Claim แล้ว พบ {$allowed} ไฟล์ในงวดนี้ (นำเข้าในระบบแล้ว {$existing} ไฟล์, ไม่มีไฟล์ใหม่)";

            return response()->json([
                'success' => true,
                'requires_otp' => false,
                'count' => $importedCount,
                'message' => $msg,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'requires_otp' => false,
                'message' => 'เกิดข้อผิดพลาดในการเชื่อมต่อ Portal: ' . $e->getMessage(),
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * อัปโหลดไฟล์ด้วยตนเอง (Manual Batch Upload) รองรับทั้ง REP และ STM
     */
    public function uploadFiles(Request $request): RedirectResponse|JsonResponse
    {
        if (! $request->hasFile('files') && $request->hasFile('file')) {
            $request->files->set('files', [$request->file('file')]);
        }

        $data = $request->validate([
            'files' => ['required', 'array', 'min:1', 'max:50'],
            'files.*' => ['required', 'file', 'max:51200'],
            'scheme' => ['nullable', 'string', 'max:30'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $imported = [];
        $errors = [];
        $overrideScheme = filled($data['scheme'] ?? null) && $data['scheme'] !== 'auto'
            ? strtolower($data['scheme'])
            : null;

        foreach ($request->file('files') as $file) {
            $origName = $file->getClientOriginalName();
            try {
                // ตรวจจับสิทธิอัตโนมัติหากไม่ได้ระบุ
                $detectedScheme = $overrideScheme ?: ClaimScheme::detectFromFilename($origName);
                if (! $detectedScheme) {
                    $detectedScheme = ClaimScheme::CGD;
                }

                // ตรวจจับประเภทไฟล์ว่าเป็น REP หรือ STM
                if (CgdClaimFilenameGuard::isAllowedRep($origName, $detectedScheme) || preg_match('/\.ecd$/i', $origName)) {
                    $res = $this->repImporter->import($file, $data['notes'] ?? null, $detectedScheme);
                } else {
                    $res = $this->stmImporter->import($file, $data['notes'] ?? null, $detectedScheme);
                }

                $batch = $res['batch'];
                $imported[] = [
                    'filename' => $origName,
                    'scheme' => $detectedScheme,
                    'batch_id' => $batch->id,
                    'row_count' => $batch->row_count,
                    'total_claim' => $batch->total_claim,
                    'total_approved' => $batch->total_approved,
                ];
            } catch (\Throwable $e) {
                $errors[] = "{$origName}: " . $e->getMessage();
            }
        }

        $successCount = count($imported);
        $totalFiles = count($request->file('files'));

        if ($request->wantsJson()) {
            return response()->json([
                'success' => $successCount > 0,
                'imported_count' => $successCount,
                'error_count' => count($errors),
                'imported' => $imported,
                'errors' => $errors,
                'message' => $successCount > 0
                    ? "นำเข้าไฟล์สำเร็จ {$successCount}/{$totalFiles} ไฟล์" . (empty($errors) ? '' : ' (พบข้อผิดพลาด ' . count($errors) . ' ไฟล์)')
                    : "นำเข้าไม่สำเร็จ: " . implode('; ', $errors),
            ], $successCount > 0 ? 200 : 422);
        }

        if ($successCount > 0 && empty($errors)) {
            return redirect()->back()->with('success', "นำเข้าไฟล์สำเร็จ {$successCount} ไฟล์เรียบร้อยแล้ว");
        }

        if ($successCount > 0 && ! empty($errors)) {
            return redirect()->back()->with('warning', "นำเข้าสำเร็จ {$successCount} ไฟล์, แต่พบข้อผิดพลาด " . count($errors) . " ไฟล์: " . implode('; ', $errors));
        }

        return redirect()->back()->with('error', 'ไม่สามารถนำเข้าไฟล์ได้: ' . implode('; ', $errors));
    }

    /**
     * ดึงรายการเคสย่อยใน Batch สำหรับแสดงใน Drill-Down Modal
     */
    public function batchItems(Request $request, int $id): JsonResponse
    {
        $batch = CgdStmBatch::with('importedBy:id,name')->findOrFail($id);

        $limit = min(200, max(10, (int) $request->input('limit', 100)));
        $search = trim((string) $request->input('search', ''));
        $filterStatus = trim((string) $request->input('status', 'all'));

        $query = CgdStmRow::query()->where('batch_id', $batch->id);

        if (filled($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('hn', 'like', "%{$search}%")
                  ->orWhere('seq_no', 'like', "%{$search}%")
                  ->orWhere('invoice_no', 'like', "%{$search}%")
                  ->orWhere('error_code', 'like', "%{$search}%");
            });
        }

        if ($filterStatus === 'error') {
            $query->whereNotNull('error_code')->where('error_code', '!=', '');
        } elseif ($filterStatus === 'approved') {
            $query->where('total_approved', '>', 0);
        }

        $rows = $query->paginate($limit);

        // Mask PII สำหรับข้อมูลผู้ป่วย
        $items = collect($rows->items())->map(function ($row) {
            return [
                'id' => $row->id,
                'seq_no' => $row->seq_no,
                'hn' => PiiMask::hn($row->hn),
                'patient_name' => $row->fullname ? PiiMask::name($row->fullname) : '-',
                'id_card' => $row->id_card ? PiiMask::cid($row->id_card) : '-',
                'invoice_no' => $row->invoice_no,
                'visit_date' => optional($row->visit_date)->format('d/m/Y') ?? '-',
                'total_claim' => (float) $row->total_claim,
                'total_approved' => (float) $row->total_approved,
                'total_denied' => (float) max(0, $row->total_claim - $row->total_approved),
                'error_code' => $row->error_code,
                'denial_reason' => $row->denial_reason,
            ];
        });

        return response()->json([
            'batch' => [
                'id' => $batch->id,
                'filename' => $batch->filename,
                'document_no' => $batch->document_no,
                'scheme' => $batch->scheme,
                'file_kind' => $batch->file_kind,
                'row_count' => $batch->row_count,
                'error_row_count' => $batch->error_row_count,
                'total_claim' => (float) $batch->total_claim,
                'total_approved' => (float) $batch->total_approved,
                'imported_at' => optional($batch->created_at)->format('d/m/Y H:i:s'),
                'imported_by' => $batch->importedBy?->name ?? 'ระบบอัตโนมัติ',
            ],
            'items' => $items,
            'total' => $rows->total(),
            'current_page' => $rows->currentPage(),
            'last_page' => $rows->lastPage(),
        ]);
    }

    /**
     * ส่งออกรายงานประวัติการนำเข้าเป็น Excel
     */
    public function exportExcel(Request $request): StreamedResponse
    {
        $batches = $this->filteredBatchesQuery($request)->get();

        $headers = [
            'ลำดับ',
            'วันเวลาที่นำเข้า',
            'สิทธิการรักษา',
            'ประเภทเอกสาร',
            'ชื่อไฟล์',
            'เลขที่เอกสาร',
            'จำนวนรายการ',
            'ยอดขอเบิก (บาท)',
            'ยอดอนุมัติ (บาท)',
            'จำนวนติด C/Error',
            'สถานะ',
            'ผู้ดำเนินการ',
            'หมายเหตุ',
        ];

        $data = [];
        $i = 1;
        foreach ($batches as $b) {
            $schemeTitle = config("claim_schemes.{$b->scheme}.short_title", strtoupper($b->scheme));
            $kindTitle = match (strtolower($b->file_kind)) {
                'rep' => 'ผลตรวจ REP',
                'stm' => 'ชดเชย STM',
                'appeal' => 'อุทธรณ์ STM',
                default => strtoupper($b->file_kind),
            };

            $data[] = [
                $i++,
                optional($b->created_at)->format('d/m/Y H:i:s') ?? '-',
                $schemeTitle,
                $kindTitle,
                $b->filename,
                $b->document_no ?: '-',
                number_format($b->row_count),
                number_format($b->total_claim, 2),
                number_format($b->total_approved, 2),
                number_format($b->error_row_count),
                $b->status ?: 'สำเร็จ',
                $b->importedBy?->name ?? 'ระบบอัตโนมัติ',
                $b->notes ?: '-',
            ];
        }

        $filename = 'RCM_Import_History_Report_' . date('Ymd_His');

        return $this->reportService->exportExcel('รายงานประวัติการนำเข้าข้อมูลระบบบริหารวงจรรายได้ (RCM)', $headers, $data, $filename);
    }

    /**
     * ส่งออกรายงานประวัติการนำเข้าเป็น PDF
     */
    public function exportPdf(Request $request): Response
    {
        $batches = $this->filteredBatchesQuery($request)->limit(500)->get();

        $headers = [
            'ลำดับ',
            'วันเวลา',
            'สิทธิ',
            'ประเภท',
            'ชื่อไฟล์',
            'จำนวนเคส',
            'ยอดขอเบิก',
            'ยอดอนุมัติ',
            'ติด C',
            'สถานะ',
        ];

        $data = [];
        $i = 1;
        foreach ($batches as $b) {
            $schemeTitle = config("claim_schemes.{$b->scheme}.short_title", strtoupper($b->scheme));
            $kindTitle = match (strtolower($b->file_kind)) {
                'rep' => 'REP',
                'stm' => 'STM',
                'appeal' => 'STM อุทธรณ์',
                default => strtoupper($b->file_kind),
            };

            $data[] = [
                $i++,
                optional($b->created_at)->format('d/m/y H:i') ?? '-',
                $schemeTitle,
                $kindTitle,
                mb_substr($b->filename, 0, 30, 'UTF-8'),
                number_format($b->row_count),
                number_format($b->total_claim, 2),
                number_format($b->total_approved, 2),
                number_format($b->error_row_count),
                $b->status ?: 'สำเร็จ',
            ];
        }

        $filename = 'RCM_Import_History_Report_' . date('Ymd_His');

        return $this->reportService->exportPdf('รายงานประวัติการนำเข้าข้อมูล RCM', $headers, $data, $filename);
    }

    /**
     * Query batches ตามตัวกรองที่ระบุ
     */
    private function filteredBatchesQuery(Request $request)
    {
        $search = trim((string) $request->input('search', ''));
        $scheme = trim((string) $request->input('scheme', 'all'));
        $fileKind = trim((string) $request->input('file_kind', 'all'));
        $status = trim((string) $request->input('status', 'all'));
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        $query = CgdStmBatch::query()
            ->with('importedBy:id,name')
            ->orderBy('id', 'desc');

        if (filled($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('filename', 'like', "%{$search}%")
                  ->orWhere('document_no', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        if ($scheme !== 'all' && filled($scheme)) {
            $query->where('scheme', strtolower($scheme));
        }

        if ($fileKind !== 'all' && filled($fileKind)) {
            $query->where('file_kind', strtolower($fileKind));
        }

        if ($status !== 'all' && filled($status)) {
            $query->where('status', strtolower($status));
        }

        if (filled($dateFrom)) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }

        if (filled($dateTo)) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        return $query;
    }
}
