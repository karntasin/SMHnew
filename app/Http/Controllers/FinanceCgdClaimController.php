<?php

namespace App\Http\Controllers;

use App\Models\Finance\CgdReconciliation;
use App\Models\Finance\CgdStmBatch;
use App\Models\SettingApp;
use App\Services\Finance\CgdClaimReconcileService;
use App\Services\Finance\CgdHosxpClaimService;
use App\Services\Finance\CgdStmImportService;
use App\Services\ThaiPdfService;
use Box\Spout\Common\Entity\Style\Color;
use Box\Spout\Writer\Common\Creator\Style\StyleBuilder;
use Box\Spout\Writer\Common\Creator\WriterEntityFactory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FinanceCgdClaimController extends Controller
{
    public function __construct(
        private readonly CgdStmImportService $importer,
        private readonly CgdClaimReconcileService $reconciler,
        private readonly CgdHosxpClaimService $hosxp,
        private readonly ThaiPdfService $pdf,
    ) {}

    public function index(): Response
    {
        $batches = CgdStmBatch::query()
            ->with(['importer:id,name', 'reconciliations' => fn ($q) => $q->latest()->limit(1)])
            ->latest()
            ->limit(12)
            ->get()
            ->map(fn (CgdStmBatch $b) => $this->serializeBatch($b));

        $latest = CgdReconciliation::query()->with('batch')->latest()->first();

        return Inertia::render('Finance/CgdClaim/Dashboard', [
            'hosxpReady' => $this->hosxp->available(),
            'batches' => $batches,
            'summary' => $latest ? $this->serializeReconciliation($latest) : null,
            'kpis' => [
                'batch_count' => CgdStmBatch::count(),
                'row_count' => (int) CgdStmBatch::sum('row_count'),
                'total_claim' => (float) CgdStmBatch::sum('total_claim'),
                'total_approved' => (float) CgdStmBatch::sum('total_approved'),
                'latest_shortfall' => $latest?->total_shortfall ?? 0,
                'latest_matched_ok' => $latest?->matched_ok ?? 0,
                'latest_matched_short' => $latest?->matched_short ?? 0,
                'latest_only_hosxp' => $latest?->only_hosxp ?? 0,
                'latest_only_stm' => $latest?->only_stm ?? 0,
            ],
        ]);
    }

    public function importForm(): Response
    {
        $batches = CgdStmBatch::query()
            ->with(['importer:id,name', 'reconciliations' => fn ($q) => $q->latest()->limit(1)])
            ->latest()
            ->paginate(15)
            ->through(fn (CgdStmBatch $b) => $this->serializeBatch($b));

        return Inertia::render('Finance/CgdClaim/Import', [
            'hosxpReady' => $this->hosxp->available(),
            'batches' => $batches,
        ]);
    }

    public function import(Request $request)
    {
        $request->merge([
            'start_date' => $request->filled('start_date') ? $request->input('start_date') : null,
            'end_date' => $request->filled('end_date') ? $request->input('end_date') : null,
        ]);

        $data = $request->validate([
            'file' => ['required', 'file', 'max:51200'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'auto_reconcile' => ['nullable', 'boolean'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ]);

        $result = $this->importer->import($data['file'], $data['notes'] ?? null);
        /** @var CgdStmBatch $batch */
        $batch = $result['batch'];
        $updated = (bool) $result['updated'];

        $startDate = $data['start_date'] ?? optional($batch->visit_date_min)->toDateString();
        $endDate = $data['end_date'] ?? optional($batch->visit_date_max)->toDateString();

        if ($request->boolean('auto_reconcile', true)) {
            $this->reconciler->reconcile($batch, $startDate, $endDate);
        }

        $action = $updated ? 'อัปเดตข้อมูล STM ซ้ำ' : 'นำเข้าไฟล์ STM';
        $range = trim(
            (($startDate ? date('d/m/Y', strtotime($startDate)) : null) ?: '-')
            .' - '
            .(($endDate ? date('d/m/Y', strtotime($endDate)) : null) ?: '-')
        );

        return redirect()
            ->route('finance.cgd.show', $batch)
            ->with('success', "{$action} เรียบร้อยแล้ว · ช่วง HOSxP {$range}");
    }

    public function show(CgdStmBatch $batch, Request $request): Response
    {
        $batch->load(['importer:id,name']);
        $reconciliation = $batch->reconciliations()->latest()->first();

        $status = $request->query('status');
        $status = is_string($status) && isset($this->statusLabels()[$status]) ? $status : null;
        $search = trim((string) $request->query('q', ''));
        $month = $this->normalizeMonthFilter($request->query('month'));

        $monthly = [];
        $items = [];
        if ($reconciliation) {
            $monthly = $this->monthlyBreakdown($reconciliation);
            // ถ้าเลือกเดือนที่ไม่มีในรายการ (เช่น ไม่ระบุเดือน) ให้ล้างตัวกรอง
            if ($month && ! collect($monthly)->contains(fn ($row) => $row['month'] === $month)) {
                $month = null;
            }
            $query = $this->filteredReconcileItems($reconciliation, $status, $search, $month)
                ->orderByRaw("FIELD(status,'matched_short','only_hosxp','only_stm','stm_out_of_range','matched_over','matched_ok')")
                ->orderByDesc('shortfall');

            $items = $query->paginate(50)->withQueryString()->through(fn ($item) => $this->serializeItem($item));
        }

        return Inertia::render('Finance/CgdClaim/Show', [
            'hosxpReady' => $this->hosxp->available(),
            'batch' => $this->serializeBatch($batch),
            'reconciliation' => $reconciliation ? $this->serializeReconciliation($reconciliation) : null,
            'monthly' => $monthly,
            'items' => $items,
            'filters' => [
                'status' => $status,
                'q' => $search,
                'month' => $month,
            ],
            'statusOptions' => $this->statusLabels(),
        ]);
    }

    public function reconcile(Request $request, CgdStmBatch $batch)
    {
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

    public function destroy(CgdStmBatch $batch)
    {
        $label = $batch->document_no ?: $batch->filename;
        $rowCount = $batch->row_count;

        if ($batch->stored_path) {
            Storage::disk('local')->delete($batch->stored_path);
        }

        // ลบผลเปรียบเทียบและรายการ STM ที่เกี่ยวข้อง (FK cascade รองรับอยู่แล้ว)
        $batch->reconciliations()->each(function (CgdReconciliation $old) {
            $old->items()->delete();
            $old->delete();
        });
        $batch->rows()->delete();
        $batch->delete();

        return redirect()
            ->route('finance.cgd.dashboard')
            ->with('success', "ลบข้อมูลนำเข้า {$label} แล้ว ({$rowCount} รายการ)");
    }

    public function exportExcel(Request $request, CgdStmBatch $batch): StreamedResponse
    {
        $reconciliation = $batch->reconciliations()->latest()->firstOrFail();
        [$status, $search, $statusLabel, $month, $monthLabel] = $this->resolveExportFilters($request);
        $items = $this->filteredReconcileItems($reconciliation, $status, $search, $month)
            ->orderByRaw("FIELD(status,'matched_short','only_hosxp','only_stm','stm_out_of_range','matched_over','matched_ok')")
            ->orderBy('visit_date')
            ->orderByDesc('shortfall')
            ->get();
        $labels = $this->statusLabels();

        $statusSlug = $status ? '_'.$status : '_all';
        $monthSlug = $month ? '_'.$month : '';
        $filename = 'CGD_STM_Reconcile_'.($batch->document_no ?: $batch->id).$statusSlug.$monthSlug.'_'.now()->format('Ymd_His').'.xlsx';

        return response()->streamDownload(function () use ($batch, $reconciliation, $items, $labels, $statusLabel, $search, $monthLabel) {
            $writer = WriterEntityFactory::createXLSXWriter();
            $writer->openToFile('php://output');

            $headerStyle = (new StyleBuilder())->setFontBold()->setFontColor(Color::WHITE)->setBackgroundColor(Color::rgb(4, 120, 87))->build();
            $titleStyle = (new StyleBuilder())->setFontBold()->setFontSize(14)->build();

            $writer->addRow(WriterEntityFactory::createRowFromArray(['รายงานตรวจสอบเบิกจ่ายตรง กรมบัญชีกลาง (STM × HOSxP)'], $titleStyle));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['เอกสาร', $batch->document_no ?: $batch->filename]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['ช่วงวันที่ HOSxP', $reconciliation->start_date->format('Y-m-d').' ถึง '.$reconciliation->end_date->format('Y-m-d')]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['กรองเดือน', $monthLabel]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['กรองสถานะ', $statusLabel]));
            if ($search !== '') {
                $writer->addRow(WriterEntityFactory::createRowFromArray(['คำค้น', $search]));
            }
            $writer->addRow(WriterEntityFactory::createRowFromArray(['จำนวนรายการที่ส่งออก', $items->count()]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['ยอด HOSxP รวม (ทั้งชุด)', $reconciliation->total_hosxp]));
            $totalPaid = (float) $items->sum(fn ($i) => (float) ($i->hosxp_paid ?? 0));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['ยอด Payment ในรายงานนี้', round($totalPaid, 2)]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['ยอดเรียกเก็บ STM (ทั้งชุด)', $reconciliation->total_stm_claim]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['ยอดพึงรับ STM (ทั้งชุด)', $reconciliation->total_stm_approved]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['ยอดขาด (ทั้งชุด)', $reconciliation->total_shortfall]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['สูตรเปรียบเทียบ', 'HOSxP รวม − Payment เทียบกับ STM พึงรับ']));
            $writer->addRow(WriterEntityFactory::createRowFromArray([]));

            $writer->addRow(WriterEntityFactory::createRowFromArray([
                'เดือน', 'สถานะ', 'HN', 'PID', 'SEQ NO', 'ชื่อ-สกุล', 'วันที่รับบริการ', 'แผนก',
                'รหัสสิทธิ', 'สิทธิการรักษา', 'HIPDATA',
                'HOSxP รวม', 'Payment', 'HOSxP หลังหัก Payment', 'หัก Payment',
                'HOSxP ยา', 'HOSxP อวัยวะ', 'HOSxP ค่าบริการ', 'HOSxP ลูกหนี้',
                'STM เรียกเก็บ', 'STM พึงรับ', 'STM ยา', 'STM อวัยวะ', 'STM ค่ารักษา',
                'ผลต่างเรียกเก็บ', 'ผลต่างพึงรับ', 'ยอดขาด', 'REP NO',
            ], $headerStyle));

            foreach ($items as $item) {
                $gross = $item->hosxp_total !== null ? (float) $item->hosxp_total : null;
                $paid = $item->hosxp_paid !== null ? (float) $item->hosxp_paid : null;
                $net = $gross !== null ? round(max(0, $gross - ($paid ?? 0)), 2) : null;
                $adjusted = $paid !== null && $paid > 0.009 ? 'ใช่' : '';
                $monthKey = optional($item->visit_date)->format('Y-m') ?: 'unknown';

                $writer->addRow(WriterEntityFactory::createRowFromArray([
                    $this->thaiMonthLabel($monthKey),
                    $labels[$item->status] ?? $item->status,
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
                    $item->stm_drug,
                    $item->stm_organ,
                    $item->stm_treat,
                    $item->diff_claim,
                    $item->diff_approved,
                    $item->shortfall,
                    $item->rep_no,
                ]));
            }

            $writer->close();
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function exportPdf(Request $request, CgdStmBatch $batch)
    {
        $reconciliation = $batch->reconciliations()->latest()->firstOrFail();
        [$status, $search, $statusLabel, $month, $monthLabel] = $this->resolveExportFilters($request);

        $query = $this->filteredReconcileItems($reconciliation, $status, $search, $month)
            ->orderBy('visit_date')
            ->orderByDesc('shortfall');
        if ($status === null) {
            $query->whereIn('status', ['matched_short', 'only_hosxp', 'only_stm', 'stm_out_of_range', 'matched_over']);
        }

        $items = $query->limit(500)->get();
        $totalHosxpPaid = (float) $items->sum(fn ($i) => (float) ($i->hosxp_paid ?? 0));
        $totalHosxpGross = (float) $items->sum(fn ($i) => (float) ($i->hosxp_total ?? 0));
        $totalHosxpNet = round(max(0, $totalHosxpGross - $totalHosxpPaid), 2);

        $setting = SettingApp::query()->first();
        [$fontRegularUri, $fontBoldUri] = $this->pdf->fontUris();

        $html = view('finance.cgd-claim-report-pdf', [
            'hospitalName' => $setting->nama_app ?? 'โรงพยาบาล',
            'batch' => $batch,
            'reconciliation' => $reconciliation,
            'items' => $items,
            'totalHosxpPaid' => $totalHosxpPaid,
            'totalHosxpNet' => $totalHosxpNet,
            'statusFilter' => $status,
            'statusFilterLabel' => $statusLabel,
            'monthFilter' => $month,
            'monthFilterLabel' => $monthLabel,
            'search' => $search,
            'statusLabels' => $this->statusLabels(),
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
            'generatedAt' => now()->format('d/m/Y H:i'),
        ])->render();

        $binary = $this->pdf->render($html, 'landscape');
        $statusSlug = $status ? '_'.$status : '_followup';
        $monthSlug = $month ? '_'.$month : '';
        $filename = 'CGD_STM_Reconcile_'.($batch->document_no ?: $batch->id).$statusSlug.$monthSlug.'_'.now()->format('Ymd_His').'.pdf';

        return response($binary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    /**
     * @return array{0: ?string, 1: string, 2: string, 3: ?string, 4: string}
     */
    private function resolveExportFilters(Request $request): array
    {
        $labels = $this->statusLabels();
        $status = $request->query('status');
        $status = is_string($status) && isset($labels[$status]) ? $status : null;
        $search = trim((string) $request->query('q', ''));
        $month = $this->normalizeMonthFilter($request->query('month'));
        $statusLabel = $status ? ($labels[$status] ?? $status) : 'ทั้งหมด';
        $monthLabel = $month ? $this->thaiMonthLabel($month) : 'ทุกเดือน';

        return [$status, $search, $statusLabel, $month, $monthLabel];
    }

    private function filteredReconcileItems(
        CgdReconciliation $reconciliation,
        ?string $status,
        string $search = '',
        ?string $month = null,
    ) {
        $query = $reconciliation->items();

        if ($status) {
            $query->where('status', $status);
        }

        if ($month) {
            $query->whereRaw("DATE_FORMAT(visit_date, '%Y-%m') = ?", [$month]);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('hn', 'like', "%{$search}%")
                    ->orWhere('pid', 'like', "%{$search}%")
                    ->orWhere('seq_no', 'like', "%{$search}%")
                    ->orWhere('patient_name', 'like', "%{$search}%")
                    ->orWhere('pttype', 'like', "%{$search}%")
                    ->orWhere('pttype_code', 'like', "%{$search}%");
            });
        }

        return $query;
    }

    private function normalizeMonthFilter(mixed $month): ?string
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
    private function monthlyBreakdown(CgdReconciliation $reconciliation): array
    {
        $rows = $reconciliation->items()
            ->selectRaw("COALESCE(DATE_FORMAT(visit_date, '%Y-%m'), 'unknown') as month_key")
            ->selectRaw('COUNT(*) as item_count')
            ->selectRaw('SUM(COALESCE(hosxp_total, 0)) as total_hosxp')
            ->selectRaw('SUM(COALESCE(hosxp_paid, 0)) as total_hosxp_paid')
            ->selectRaw('SUM(COALESCE(stm_claim, 0)) as total_stm_claim')
            ->selectRaw('SUM(COALESCE(stm_approved, 0)) as total_stm_approved')
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

                return [
                    'month' => $row->month_key,
                    'label' => $this->thaiMonthLabel((string) $row->month_key),
                    'item_count' => (int) $row->item_count,
                    'total_hosxp' => $gross,
                    'total_hosxp_paid' => $paid,
                    'total_hosxp_net' => round(max(0, $gross - $paid), 2),
                    'total_stm_claim' => (float) $row->total_stm_claim,
                    'total_stm_approved' => (float) $row->total_stm_approved,
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

    private function thaiMonthLabel(string $monthKey): string
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

    private function serializeBatch(CgdStmBatch $batch): array
    {
        $latest = $batch->relationLoaded('reconciliations')
            ? $batch->reconciliations->first()
            : $batch->reconciliations()->latest()->first();

        return [
            'id' => $batch->id,
            'filename' => $batch->filename,
            'document_no' => $batch->document_no,
            'hcode' => $batch->hcode,
            'period_label' => $batch->period_label,
            'channel' => $batch->channel,
            'row_count' => $batch->row_count,
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

    private function serializeReconciliation(CgdReconciliation $r): array
    {
        $totalPaid = (float) $r->items()->sum('hosxp_paid');
        $totalGross = (float) $r->total_hosxp;
        $totalNet = round(max(0, $totalGross - $totalPaid), 2);

        return [
            'id' => $r->id,
            'batch_id' => $r->batch_id,
            'start_date' => $r->start_date->format('Y-m-d'),
            'end_date' => $r->end_date->format('Y-m-d'),
            'pttype_like' => $r->pttype_like,
            'exclude_deps' => $r->exclude_deps,
            'hosxp_count' => $r->hosxp_count,
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
            'total_stm_claim' => (float) $r->total_stm_claim,
            'total_stm_approved' => (float) $r->total_stm_approved,
            'total_shortfall' => (float) $r->total_shortfall,
            'total_claim_diff' => (float) $r->total_claim_diff,
            'created_at' => optional($r->created_at)->format('d/m/Y H:i'),
            'document_no' => $r->batch?->document_no,
            'filename' => $r->batch?->filename,
        ];
    }

    private function serializeItem($item): array
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
        ];
    }

    /** @return array<string,string> */
    private function statusLabels(): array
    {
        return [
            'matched_ok' => 'ตรงกัน',
            'matched_short' => 'ขาดเงิน',
            'matched_over' => 'เกินจาก STM',
            'only_hosxp' => 'มีใน HOSxP ไม่มีใน STM',
            'only_stm' => 'มีใน STM ไม่มีใน HOSxP',
            'stm_out_of_range' => 'STM นอกช่วงวันที่ HOSxP',
        ];
    }
}
