<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\MedicalEquipment;
use App\Models\MedicalEquipmentBorrowing;
use App\Models\MedicalEquipmentBorrowingLog;
use App\Services\MedicalEquipmentNotificationService;
use App\Services\MedicalEquipmentStockService;
use Box\Spout\Common\Entity\Style\Color;
use Box\Spout\Writer\Common\Creator\WriterEntityFactory;
use Box\Spout\Writer\Common\Creator\Style\StyleBuilder;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MedicalEquipmentBorrowingController extends Controller
{
    public function __construct(
        private MedicalEquipmentStockService $stockService,
        private MedicalEquipmentNotificationService $notificationService
    ) {}

    public function index(Request $request)
    {
        $query = MedicalEquipmentBorrowing::with(['borrower', 'equipment.category', 'department'])
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('borrowing_number', 'like', "%{$search}%")
                    ->orWhere('purpose', 'like', "%{$search}%")
                    ->orWhereHas('borrower', fn ($sq) => $sq->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('equipment', fn ($sq) => $sq->where('name', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('start_date')) {
            $query->whereDate('borrow_date', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->whereDate('borrow_date', '<=', $request->end_date);
        }

        return Inertia::render('equipment-borrowing/borrowings/Index', [
            'borrowings' => $query->paginate(12)->withQueryString(),
            'filters' => $request->only(['status', 'search', 'start_date', 'end_date']),
            'statusOptions' => $this->statusOptions(),
        ]);
    }

    public function my(Request $request)
    {
        $query = MedicalEquipmentBorrowing::with(['equipment.category', 'department'])
            ->where('user_id', Auth::id())
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return Inertia::render('equipment-borrowing/borrowings/My', [
            'borrowings' => $query->paginate(12)->withQueryString(),
            'filters' => $request->only(['status']),
            'statusOptions' => $this->statusOptions(),
        ]);
    }

    public function create(Request $request)
    {
        return Inertia::render('equipment-borrowing/borrowings/Create', [
            'equipment' => MedicalEquipment::with('category')
                ->where('is_active', true)
                ->where('status', '!=', 'retired')
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(),
            'departments' => Department::orderBy('name')->get(['id', 'name']),
            'preselectEquipmentId' => $request->integer('equipment_id') ?: null,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'equipment_id' => 'required|exists:medical_equipment,id',
            'quantity' => 'required|integer|min:1',
            'purpose' => 'required|string|max:255',
            'usage_detail' => 'nullable|string|max:500',
            'patient_hn' => 'nullable|string|max:50',
            'ward_location' => 'nullable|string|max:255',
            'borrow_date' => 'required|date',
            'borrow_time' => ['required', 'regex:/^\d{2}:\d{2}$/'],
            'expected_return_date' => 'required|date',
            'expected_return_time' => ['required', 'regex:/^\d{2}:\d{2}$/'],
            'notes' => 'nullable|string',
        ]);

        $borrowAt = Carbon::parse($validated['borrow_date'].' '.$validated['borrow_time'].':00', 'Asia/Bangkok');
        $returnAt = Carbon::parse($validated['expected_return_date'].' '.$validated['expected_return_time'].':00', 'Asia/Bangkok');

        if ($returnAt->lte($borrowAt)) {
            return back()->withErrors(['expected_return_time' => 'วันเวลาคืนต้องหลังวันเวลายืม']);
        }

        $validated['borrow_time'] = $validated['borrow_time'].':00';
        $validated['expected_return_time'] = $validated['expected_return_time'].':00';

        $equipment = MedicalEquipment::findOrFail($validated['equipment_id']);

        if ($equipment->quantity_available < $validated['quantity']) {
            return back()->withErrors(['quantity' => 'สต็อกไม่เพียงพอ (คงเหลือ '.$equipment->quantity_available.' ชิ้น)']);
        }

        $borrowing = DB::transaction(function () use ($validated, $equipment) {
            $borrowingNumber = $this->generateBorrowingNumber();

            $borrowing = MedicalEquipmentBorrowing::create([
                ...$validated,
                'borrowing_number' => $borrowingNumber,
                'user_id' => Auth::id(),
                'department_id' => Auth::user()->department_id,
                'status' => 'pending',
            ]);

            $this->log($borrowing, 'created', 'ส่งคำขอยืมอุปกรณ์');

            return $borrowing;
        });

        $this->notificationService->notifyAdmins($borrowing->load(['equipment', 'borrower']), 'created');

        return redirect()->route('equipment-borrowing.borrowings.show', $borrowing)
            ->with('success', 'ส่งคำขอยืมเรียบร้อยแล้ว');
    }

    public function show(MedicalEquipmentBorrowing $borrowing)
    {
        $borrowing->load([
            'borrower',
            'equipment.category',
            'department',
            'approver',
            'issuer',
            'returnReceiver',
            'logs.user',
        ]);

        return Inertia::render('equipment-borrowing/borrowings/Show', [
            'borrowing' => $borrowing,
            'canManage' => $this->canManage(),
            'statusOptions' => $this->statusOptions(),
        ]);
    }

    public function approve(Request $request, MedicalEquipmentBorrowing $borrowing)
    {
        $this->authorizeManage();

        if ($borrowing->status !== 'pending') {
            return back()->with('error', 'ไม่สามารถอนุมัติรายการนี้ได้');
        }

        try {
            DB::transaction(function () use ($borrowing) {
                $equipment = MedicalEquipment::lockForUpdate()->findOrFail($borrowing->equipment_id);
                $this->stockService->reserve($equipment, $borrowing->quantity, $borrowing, 'อนุมัติการยืม — ตัดสต็อก');

                $borrowing->update([
                    'status' => 'approved',
                    'approved_by' => Auth::id(),
                    'approved_at' => now(),
                ]);

                $this->log($borrowing, 'approved', 'อนุมัติคำขอยืมและตัดสต็อก');
            });
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $this->notificationService->notifyBorrower($borrowing->fresh(['equipment', 'borrower']), 'approved');

        return back()->with('success', 'อนุมัติคำขอยืมเรียบร้อยแล้ว');
    }

    public function reject(Request $request, MedicalEquipmentBorrowing $borrowing)
    {
        $this->authorizeManage();

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:500',
        ]);

        if ($borrowing->status !== 'pending') {
            return back()->with('error', 'ไม่สามารถปฏิเสธรายการนี้ได้');
        }

        $borrowing->update([
            'status' => 'rejected',
            'rejection_reason' => $validated['rejection_reason'],
            'approved_by' => Auth::id(),
            'approved_at' => now(),
        ]);

        $this->log($borrowing, 'rejected', 'ปฏิเสธคำขอยืม: '.$validated['rejection_reason']);
        $this->notificationService->notifyBorrower($borrowing->fresh(['equipment', 'borrower']), 'rejected');

        return back()->with('success', 'ปฏิเสธคำขอยืมแล้ว');
    }

    public function issue(Request $request, MedicalEquipmentBorrowing $borrowing)
    {
        $this->authorizeManage();

        $validated = $request->validate([
            'condition_on_borrow' => 'nullable|string|max:255',
        ]);

        if (! in_array($borrowing->status, ['approved'], true)) {
            return back()->with('error', 'รายการนี้ยังไม่พร้อมมอบอุปกรณ์');
        }

        $borrowing->update([
            'status' => 'borrowed',
            'issued_by' => Auth::id(),
            'pickup_at' => now(),
            'condition_on_borrow' => $validated['condition_on_borrow'] ?? null,
        ]);

        $this->log($borrowing, 'issued', 'มอบอุปกรณ์ให้ผู้ยืม');
        $this->notificationService->notifyBorrower($borrowing->fresh(['equipment', 'borrower']), 'issued');

        return back()->with('success', 'บันทึกการมอบอุปกรณ์เรียบร้อยแล้ว');
    }

    public function returnItem(Request $request, MedicalEquipmentBorrowing $borrowing)
    {
        $this->authorizeManage();

        $validated = $request->validate([
            'condition_on_return' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        if (! in_array($borrowing->status, ['borrowed', 'overdue', 'approved'], true)) {
            return back()->with('error', 'ไม่สามารถรับคืนรายการนี้ได้');
        }

        DB::transaction(function () use ($borrowing, $validated) {
            $equipment = MedicalEquipment::lockForUpdate()->findOrFail($borrowing->equipment_id);

            if (in_array($borrowing->status, ['borrowed', 'overdue', 'approved'], true)) {
                $this->stockService->release($equipment, $borrowing->quantity, $borrowing, 'รับคืนอุปกรณ์ — คืนสต็อก');
            }

            $borrowing->update([
                'status' => 'returned',
                'returned_to' => Auth::id(),
                'actual_return_date' => now(),
                'condition_on_return' => $validated['condition_on_return'] ?? null,
                'notes' => trim(($borrowing->notes ?? '')."\n".($validated['notes'] ?? '')),
            ]);

            $this->log($borrowing, 'returned', 'รับคืนอุปกรณ์และคืนสต็อก');
        });

        $this->notificationService->notifyBorrower($borrowing->fresh(['equipment', 'borrower']), 'returned');

        return back()->with('success', 'รับคืนอุปกรณ์เรียบร้อยแล้ว');
    }

    public function cancel(MedicalEquipmentBorrowing $borrowing)
    {
        if ($borrowing->user_id !== Auth::id() && ! $this->canManage()) {
            abort(403);
        }

        if (! in_array($borrowing->status, ['pending', 'approved'], true)) {
            return back()->with('error', 'ไม่สามารถยกเลิกรายการนี้ได้');
        }

        DB::transaction(function () use ($borrowing) {
            if ($borrowing->status === 'approved') {
                $equipment = MedicalEquipment::lockForUpdate()->findOrFail($borrowing->equipment_id);
                $this->stockService->release($equipment, $borrowing->quantity, $borrowing, 'ยกเลิกการยืม — คืนสต็อก');
            }

            $borrowing->update(['status' => 'cancelled']);
            $this->log($borrowing, 'cancelled', 'ยกเลิกคำขอยืม');
        });

        $this->notificationService->notifyBorrowing(
            $borrowing->fresh(['equipment', 'borrower']),
            'cancelled',
            toBorrower: true,
            toAdmins: $borrowing->user_id === Auth::id()
        );

        return back()->with('success', 'ยกเลิกคำขอยืมเรียบร้อยแล้ว');
    }

    public function exportExcel(Request $request): StreamedResponse
    {
        [$startDate, $endDate] = $this->parseExportDates($request);
        $status = $request->query('status');
        $search = $request->query('search');
        $fileName = 'equipment_borrowing_'.$startDate.'_to_'.$endDate.'.xlsx';

        return new StreamedResponse(function () use ($startDate, $endDate, $status, $search) {
            $writer = WriterEntityFactory::createXLSXWriter();
            $writer->openToFile('php://output');
            $titleStyle = $this->excelTitleStyle();
            $headerStyle = $this->excelHeaderStyle();
            $metaStyle = $this->excelMetaStyle();

            $borrowings = $this->buildExportQuery($startDate, $endDate, $status, $search)->get();
            $statusLabels = $this->statusOptions();

            $stats = [
                'total' => $borrowings->count(),
                'pending' => $borrowings->where('status', 'pending')->count(),
                'borrowed' => $borrowings->whereIn('status', ['borrowed', 'overdue'])->count(),
                'returned' => $borrowings->where('status', 'returned')->count(),
                'overdue' => $borrowings->where('status', 'overdue')->count(),
            ];

            // Sheet 1: Summary
            $writer->getCurrentSheet()->setName('สรุป');
            $writer->addRow(WriterEntityFactory::createRowFromArray(['=== รายงานยืมอุปกรณ์ทางการแพทย์ ==='], $titleStyle));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['ช่วงวันที่ยืม', $startDate.' ถึง '.$endDate], $metaStyle));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['ออกรายงานเมื่อ', now()->timezone('Asia/Bangkok')->format('d/m/Y H:i:s')], $metaStyle));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['']));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['รายการ', 'จำนวน'], $headerStyle));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['ทั้งหมด', $stats['total']]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['รออนุมัติ', $stats['pending']]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['กำลังยืม', $stats['borrowed']]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['คืนแล้ว', $stats['returned']]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['เลยกำหนด', $stats['overdue']]));

            // Sheet 2: Details
            $writer->addNewSheetAndMakeItCurrent();
            $writer->getCurrentSheet()->setName('รายการยืม');
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                'เลขที่', 'อุปกรณ์', 'รหัสทรัพย์สิน', 'หมวด', 'ผู้ยืม', 'แผนก', 'จำนวน',
                'วัตถุประสงค์', 'รายละเอียด', 'HN', 'สถานที่ใช้',
                'วันที่ยืม', 'เวลายืม', 'กำหนดคืน', 'เวลาคืน',
                'รับอุปกรณ์จริง', 'คืนจริง', 'สถานะ', 'หมายเหตุ',
            ], $headerStyle));

            foreach ($borrowings as $row) {
                $borrowTime = $row->borrow_time ? substr((string) $row->borrow_time, 0, 5) : '-';
                $returnTime = $row->expected_return_time ? substr((string) $row->expected_return_time, 0, 5) : '-';

                $writer->addRow(WriterEntityFactory::createRowFromArray([
                    $row->borrowing_number,
                    $row->equipment?->name ?? '-',
                    $row->equipment?->asset_code ?? '-',
                    $row->equipment?->category?->name ?? '-',
                    $row->borrower?->name ?? '-',
                    $row->department?->name ?? '-',
                    $row->quantity,
                    $row->purpose,
                    $row->usage_detail ?? '',
                    $row->patient_hn ?? '',
                    $row->ward_location ?? '',
                    $row->borrow_date?->format('d/m/Y') ?? '-',
                    $borrowTime,
                    $row->expected_return_date?->format('d/m/Y') ?? '-',
                    $returnTime,
                    $row->pickup_at?->timezone('Asia/Bangkok')->format('d/m/Y H:i') ?? '-',
                    $row->actual_return_date?->timezone('Asia/Bangkok')->format('d/m/Y H:i') ?? '-',
                    $statusLabels[$row->status] ?? $row->status,
                    $row->notes ?? '',
                ]));
            }

            $writer->close();
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$fileName.'"',
        ]);
    }

    private function buildExportQuery(string $startDate, string $endDate, ?string $status, ?string $search)
    {
        $query = MedicalEquipmentBorrowing::with(['borrower', 'equipment.category', 'department'])
            ->whereDate('borrow_date', '>=', $startDate)
            ->whereDate('borrow_date', '<=', $endDate)
            ->orderBy('borrow_date')
            ->orderBy('borrow_time');

        if ($status) {
            $query->where('status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('borrowing_number', 'like', "%{$search}%")
                    ->orWhere('purpose', 'like', "%{$search}%")
                    ->orWhereHas('borrower', fn ($sq) => $sq->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('equipment', fn ($sq) => $sq->where('name', 'like', "%{$search}%"));
            });
        }

        return $query;
    }

    private function parseExportDates(Request $request): array
    {
        $start = $request->query('start_date');
        $end = $request->query('end_date');

        if (! $start || ! $end) {
            $endDate = date('Y-m-d');
            $startDate = date('Y-m-d', strtotime('-1 month', strtotime($endDate)));

            return [$startDate, $endDate];
        }

        return [$start, $end];
    }

    private function excelTitleStyle()
    {
        return (new StyleBuilder())
            ->setFontBold()
            ->setFontSize(14)
            ->setFontColor(Color::WHITE)
            ->setBackgroundColor('0F766E')
            ->build();
    }

    private function excelHeaderStyle()
    {
        return (new StyleBuilder())
            ->setFontBold()
            ->setFontColor(Color::WHITE)
            ->setBackgroundColor('115E59')
            ->build();
    }

    private function excelMetaStyle()
    {
        return (new StyleBuilder())
            ->setFontColor('1F2937')
            ->build();
    }

    private function generateBorrowingNumber(): string
    {
        $date = now()->format('Ymd');
        $last = MedicalEquipmentBorrowing::where('borrowing_number', 'like', "MEB-{$date}-%")->latest()->first();
        $sequence = $last ? ((int) substr($last->borrowing_number, -4)) + 1 : 1;

        return 'MEB-'.$date.'-'.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
    }

    private function log(MedicalEquipmentBorrowing $borrowing, string $action, string $description): void
    {
        MedicalEquipmentBorrowingLog::create([
            'borrowing_id' => $borrowing->id,
            'user_id' => Auth::id(),
            'action' => $action,
            'description' => $description,
            'new_values' => $borrowing->fresh()->toArray(),
        ]);
    }

    private function canManage(): bool
    {
        return Auth::user()?->hasRole(['admin', 'Admin', 'header', 'Header']) ?? false;
    }

    private function authorizeManage(): void
    {
        if (! $this->canManage()) {
            abort(403);
        }
    }

    private function statusOptions(): array
    {
        return [
            'pending' => 'รออนุมัติ',
            'approved' => 'อนุมัติแล้ว (รอรับ)',
            'borrowed' => 'กำลังยืม',
            'returned' => 'คืนแล้ว',
            'rejected' => 'ปฏิเสธ',
            'cancelled' => 'ยกเลิก',
            'overdue' => 'เลยกำหนดคืน',
        ];
    }
}
