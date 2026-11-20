<?php

namespace App\Http\Controllers\AdminDocs;

use App\Http\Controllers\Controller;
use App\Models\AmedStatReport;
use App\Models\AmedSupportUnit;
use App\Services\AmedStat\AmedStatExcelService;
use App\Services\AmedStat\AmedStatHosxpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AmedStatController extends Controller
{
    protected array $reportDefinitions = [
        'A0101' => ['num' => 1, 'code' => 'รง.ผสต.1', 'title' => 'รายงานจำนวนผู้ป่วยจำแนกตามประเภทบุคคล', 'category' => 'core'],
        'A0102' => ['num' => 2, 'code' => 'รง.ผสต.2', 'title' => 'รายงานจำนวนผู้ป่วยในจำแนกตามสาเหตุป่วย', 'category' => 'core'],
        'A0103' => ['num' => 3, 'code' => 'รง.ผสต.3', 'title' => 'รายงานจำนวนผู้ป่วยจำแนกตามสาเหตุปลดพิการ', 'category' => 'core'],
        'A0104' => ['num' => 4, 'code' => 'รง.ผสต.4', 'title' => 'รายงานจำนวนผู้ป่วยในจำแนกตามสาเหตุตาย', 'category' => 'core'],
        'A0105' => ['num' => 5, 'code' => 'รง.ผสต.5', 'title' => 'รายงานจำนวนผู้ป่วยนอกจำแนกตามสาเหตุป่วย', 'category' => 'core'],
        'A0106' => ['num' => 6, 'code' => 'รง.ผสต.6', 'title' => 'บัญชียอดกำลังพลซึ่งต้องสนับสนุนบริการแพทย์', 'category' => 'core'],
        'A0108' => ['num' => 7, 'code' => 'รง.ผสต.8', 'title' => 'รายงานจำนวนผู้มารับบริการของ รพ.ทบ. (ตัวชี้วัด)', 'category' => 'core'],
        'A0109' => ['num' => 8, 'code' => 'รง.ผสต.9', 'title' => 'รายงานจำนวนผู้มารับบริการฝังเข็มจำแนกตามประเภทบุคคล', 'category' => 'core'],
        'A0110' => ['num' => 9, 'code' => 'รง.ผสต.10', 'title' => 'รายงานจำนวนผู้มารับบริการฝังเข็มจำแนกตามสาเหตุป่วย', 'category' => 'core'],
        'E0101' => ['num' => 21, 'code' => 'รง.ทพ.1', 'title' => 'รายงานกำลังพลและทรัพยากรทางทันตกรรม', 'category' => 'dental'],
        'E0102' => ['num' => 22, 'code' => 'รง.ทพ.2', 'title' => 'รายงานสถิติบริการทันตกรรมจำแนกตามประเภทผู้ป่วย', 'category' => 'dental'],
    ];

    public function index(Request $request, AmedStatHosxpService $hosxpService): Response
    {
        $currentYearBe = (int) date('Y') + 543;
        $currentMonth = (int) date('n');

        $yearBe = (int) $request->input('year_be', $currentYearBe);
        $month = (int) $request->input('month', $currentMonth);
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $isCustomRange = ! empty($startDate) && ! empty($endDate);
        $period = $hosxpService->getPeriod($yearBe, $month, $startDate, $endDate);

        if ($isCustomRange) {
            $savedReports = AmedStatReport::where('start_date', $period['startDate'])
                ->where('end_date', $period['endDate'])
                ->get()
                ->keyBy('form_id');
        } else {
            $savedReports = AmedStatReport::where('year_be', $yearBe)
                ->where('month', $month)
                ->whereNull('start_date')
                ->get()
                ->keyBy('form_id');
        }

        $reports = [];
        foreach ($this->reportDefinitions as $fid => $def) {
            $saved = $savedReports->get($fid);
            $reports[] = [
                'form_id' => $fid,
                'num' => $def['num'],
                'code' => $def['code'],
                'title' => $def['title'],
                'category' => $def['category'],
                'status' => $saved ? $saved->status : 'unprocessed',
                'updated_at' => $saved?->updated_at?->format('d/m/Y H:i'),
                'has_data' => $saved !== null && ! empty($saved->data_json),
            ];
        }

        return Inertia::render('AdminDocs/AmedStat/Index', [
            'reports' => $reports,
            'yearBe' => $yearBe,
            'month' => $month,
            'startDate' => $period['startDate'],
            'endDate' => $period['endDate'],
            'periodLabel' => $period['periodLabel'],
            'isCustomRange' => $isCustomRange,
        ]);
    }

    public function show(Request $request, string $formId, AmedStatHosxpService $hosxpService): Response
    {
        if (! isset($this->reportDefinitions[$formId])) {
            abort(404, 'ไม่พบแบบรายงานที่ระบุ');
        }

        $currentYearBe = (int) date('Y') + 543;
        $currentMonth = (int) date('n');

        $yearBe = (int) $request->input('year_be', $currentYearBe);
        $month = (int) $request->input('month', $currentMonth);
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $isCustomRange = ! empty($startDate) && ! empty($endDate);
        $period = $hosxpService->getPeriod($yearBe, $month, $startDate, $endDate);

        $query = AmedStatReport::where('form_id', $formId);
        if ($isCustomRange) {
            $query->where('start_date', $period['startDate'])
                ->where('end_date', $period['endDate']);
        } else {
            $query->where('year_be', $yearBe)
                ->where('month', $month)
                ->whereNull('start_date');
        }
        $record = $query->first();

        if ($record && ! empty($record->data_json)) {
            $reportData = $record->data_json;
        } else {
            // Live calculate on first visit if not yet saved
            $reportData = $this->calculateData($formId, $yearBe, $month, $hosxpService, $startDate, $endDate);
        }

        return Inertia::render('AdminDocs/AmedStat/Show', [
            'formId' => $formId,
            'reportDefinition' => $this->reportDefinitions[$formId],
            'reportData' => $reportData,
            'yearBe' => $yearBe,
            'month' => $month,
            'startDate' => $period['startDate'],
            'endDate' => $period['endDate'],
            'periodLabel' => $period['periodLabel'],
            'isCustomRange' => $isCustomRange,
            'status' => $record ? $record->status : 'draft',
            'lastUpdated' => $record?->updated_at?->format('d/m/Y H:i:s'),
        ]);
    }

    public function calculate(Request $request, string $formId, AmedStatHosxpService $hosxpService): JsonResponse
    {
        if (! isset($this->reportDefinitions[$formId])) {
            return response()->json(['success' => false, 'message' => 'ไม่พบแบบรายงาน'], 404);
        }

        $yearBe = (int) $request->input('year_be', (int) date('Y') + 543);
        $month = (int) $request->input('month', (int) date('n'));
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $period = $hosxpService->getPeriod($yearBe, $month, $startDate, $endDate);
        $isCustomRange = ! empty($startDate) && ! empty($endDate);

        $data = $this->calculateData($formId, $yearBe, $month, $hosxpService, $startDate, $endDate);

        $def = $this->reportDefinitions[$formId];
        $matchCriteria = ['form_id' => $formId];
        if ($isCustomRange) {
            $matchCriteria['start_date'] = $period['startDate'];
            $matchCriteria['end_date'] = $period['endDate'];
        } else {
            $matchCriteria['year_be'] = $yearBe;
            $matchCriteria['month'] = $month;
            $matchCriteria['start_date'] = null;
        }

        $record = AmedStatReport::updateOrCreate(
            $matchCriteria,
            [
                'report_code' => $def['code'],
                'report_title' => $def['title'],
                'year_be' => $yearBe,
                'month' => $month,
                'start_date' => $isCustomRange ? $period['startDate'] : null,
                'end_date' => $isCustomRange ? $period['endDate'] : null,
                'data_json' => $data,
                'status' => 'calculated',
                'updated_by' => auth()->id(),
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'ดึงข้อมูลและคำนวณจาก HOSxP เรียบร้อยแล้ว',
            'data' => $data,
            'updated_at' => $record->updated_at->format('d/m/Y H:i'),
        ]);
    }

    public function save(Request $request, string $formId, AmedStatHosxpService $hosxpService): JsonResponse
    {
        if (! isset($this->reportDefinitions[$formId])) {
            return response()->json(['success' => false, 'message' => 'ไม่พบแบบรายงาน'], 404);
        }

        $yearBe = (int) $request->input('year_be', (int) date('Y') + 543);
        $month = (int) $request->input('month', (int) date('n'));
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $data = $request->input('data');

        $period = $hosxpService->getPeriod($yearBe, $month, $startDate, $endDate);
        $isCustomRange = ! empty($startDate) && ! empty($endDate);

        $def = $this->reportDefinitions[$formId];
        $matchCriteria = ['form_id' => $formId];
        if ($isCustomRange) {
            $matchCriteria['start_date'] = $period['startDate'];
            $matchCriteria['end_date'] = $period['endDate'];
        } else {
            $matchCriteria['year_be'] = $yearBe;
            $matchCriteria['month'] = $month;
            $matchCriteria['start_date'] = null;
        }

        $record = AmedStatReport::updateOrCreate(
            $matchCriteria,
            [
                'report_code' => $def['code'],
                'report_title' => $def['title'],
                'year_be' => $yearBe,
                'month' => $month,
                'start_date' => $isCustomRange ? $period['startDate'] : null,
                'end_date' => $isCustomRange ? $period['endDate'] : null,
                'data_json' => $data,
                'status' => 'saved',
                'updated_by' => auth()->id(),
            ]
        );

        // For A0106, also sync support unit personnel numbers to master table
        if ($formId === 'A0106' && ! empty($data['items']) && is_array($data['items'])) {
            foreach ($data['items'] as $it) {
                if (! empty($it['id'])) {
                    AmedSupportUnit::where('id', $it['id'])->update([
                        'g1' => (int) ($it['g1'] ?? 0),
                        'g2' => (int) ($it['g2'] ?? 0),
                        'g3' => (int) ($it['g3'] ?? 0),
                        'g4' => (int) ($it['g4'] ?? 0),
                        'g5' => (int) ($it['g5'] ?? 0),
                        'k1' => (int) ($it['k1'] ?? 0),
                        'k2' => (int) ($it['k2'] ?? 0),
                        'k3' => (int) ($it['k3'] ?? 0),
                        'k4' => (int) ($it['k4'] ?? 0),
                        'k5' => (int) ($it['k5'] ?? 0),
                        'c1' => (int) ($it['c1'] ?? 0),
                        'c3' => (int) ($it['c3'] ?? 0),
                        'c4' => (int) ($it['c4'] ?? 0),
                        'total' => (int) ($it['total'] ?? 0),
                    ]);
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'บันทึกข้อมูลเรียบร้อยแล้ว',
            'updated_at' => $record->updated_at->format('d/m/Y H:i'),
        ]);
    }

    public function export(Request $request, string $formId, AmedStatHosxpService $hosxpService, AmedStatExcelService $excelService): BinaryFileResponse
    {
        if (! isset($this->reportDefinitions[$formId])) {
            abort(404, 'ไม่พบแบบรายงาน');
        }

        $yearBe = (int) $request->input('year_be', (int) date('Y') + 543);
        $month = (int) $request->input('month', (int) date('n'));
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $isCustomRange = ! empty($startDate) && ! empty($endDate);
        $period = $hosxpService->getPeriod($yearBe, $month, $startDate, $endDate);

        $query = AmedStatReport::where('form_id', $formId);
        if ($isCustomRange) {
            $query->where('start_date', $period['startDate'])
                ->where('end_date', $period['endDate']);
        } else {
            $query->where('year_be', $yearBe)
                ->where('month', $month)
                ->whereNull('start_date');
        }
        $record = $query->first();

        $data = $record?->data_json ?: $this->calculateData($formId, $yearBe, $month, $hosxpService, $startDate, $endDate);

        return $excelService->downloadExcel($formId, $data, $yearBe, $month);
    }

    public function exportAllZip(Request $request, AmedStatHosxpService $hosxpService, AmedStatExcelService $excelService): BinaryFileResponse
    {
        $yearBe = (int) $request->input('year_be', (int) date('Y') + 543);
        $month = (int) $request->input('month', (int) date('n'));
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $isCustomRange = ! empty($startDate) && ! empty($endDate);
        $period = $hosxpService->getPeriod($yearBe, $month, $startDate, $endDate);

        $query = AmedStatReport::query();
        if ($isCustomRange) {
            $query->where('start_date', $period['startDate'])
                ->where('end_date', $period['endDate']);
        } else {
            $query->where('year_be', $yearBe)
                ->where('month', $month)
                ->whereNull('start_date');
        }
        $savedReports = $query->get()->keyBy('form_id');

        $allData = [];
        foreach ($this->reportDefinitions as $fid => $def) {
            if ($def['category'] === 'core') {
                $saved = $savedReports->get($fid);
                $allData[$fid] = $saved?->data_json ?: $this->calculateData($fid, $yearBe, $month, $hosxpService, $startDate, $endDate);
            }
        }

        return $excelService->downloadAllZip($allData, $yearBe, $month);
    }

    public function units(): JsonResponse
    {
        $units = AmedSupportUnit::orderBy('sort_order')->orderBy('id')->get();

        return response()->json(['units' => $units]);
    }

    public function saveUnit(Request $request): JsonResponse
    {
        $id = $request->input('id');
        $validated = $request->validate([
            'unit_name' => 'required|string|max:255',
            'unit_code' => 'nullable|string|max:50',
            'location' => 'nullable|string|max:255',
            'g1' => 'integer|min:0',
            'g2' => 'integer|min:0',
            'g3' => 'integer|min:0',
            'g4' => 'integer|min:0',
            'g5' => 'integer|min:0',
            'k1' => 'integer|min:0',
            'k2' => 'integer|min:0',
            'k3' => 'integer|min:0',
            'k4' => 'integer|min:0',
            'k5' => 'integer|min:0',
            'c1' => 'integer|min:0',
            'c3' => 'integer|min:0',
            'c4' => 'integer|min:0',
        ]);

        $unit = AmedSupportUnit::updateOrCreate(['id' => $id], $validated);

        return response()->json(['success' => true, 'unit' => $unit]);
    }

    public function deleteUnit(int $id): JsonResponse
    {
        AmedSupportUnit::destroy($id);

        return response()->json(['success' => true]);
    }

    protected function calculateData(string $formId, int $yearBe, int $month, AmedStatHosxpService $hosxpService, ?string $startDate = null, ?string $endDate = null): array
    {
        return match ($formId) {
            'A0101' => $hosxpService->calculateA0101($yearBe, $month, $startDate, $endDate),
            'A0102' => $hosxpService->calculateA0102($yearBe, $month, $startDate, $endDate),
            'A0103' => $hosxpService->calculateA0103($yearBe, $month, $startDate, $endDate),
            'A0104' => $hosxpService->calculateA0104($yearBe, $month, $startDate, $endDate),
            'A0105' => $hosxpService->calculateA0105($yearBe, $month, $startDate, $endDate),
            'A0106' => $hosxpService->calculateA0106($yearBe, $month, $startDate, $endDate),
            'A0108' => $hosxpService->calculateA0108($yearBe, $month, $startDate, $endDate),
            'A0109' => $hosxpService->calculateA0109($yearBe, $month, $startDate, $endDate),
            'A0110' => $hosxpService->calculateA0110($yearBe, $month, $startDate, $endDate),
            'E0101' => $hosxpService->calculateE0101($yearBe, $month, $startDate, $endDate),
            'E0102' => $hosxpService->calculateE0102($yearBe, $month, $startDate, $endDate),
            default => [],
        };
    }
}
