<?php

namespace App\Http\Controllers;

use App\Services\DepartmentDataService;
use App\Services\ThaiPdfService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class DepartmentDataController extends Controller
{
    public function __construct(
        private readonly DepartmentDataService $service,
        private readonly ThaiPdfService $pdf,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        [$start, $end] = $this->resolveRange($request);
        $data = $this->service->hubSummaries($start, $end);

        return Inertia::render('DepartmentData/Index', $data);
    }

    public function show(Request $request, string $code): InertiaResponse
    {
        $code = $this->normalizeCode($code);
        [$start, $end] = $this->resolveRange($request);
        $data = $this->service->dashboard($code, $start, $end);

        return Inertia::render('DepartmentData/Show', $data);
    }

    public function exportPdf(Request $request, string $code): Response
    {
        $code = $this->normalizeCode($code);
        [$start, $end] = $this->resolveRange($request);
        $data = $this->service->dashboard($code, $start, $end);

        return $this->pdfResponse($data, null, $start, $end);
    }

    public function exportSectionPdf(Request $request, string $code, string $section): Response
    {
        $code = $this->normalizeCode($code);
        $dept = $this->service->findDepartment($code) ?? [];
        $sectionLabels = $this->service->sectionsFor($dept);

        if (! array_key_exists($section, $sectionLabels)) {
            abort(404, 'ไม่พบหัวข้อรายงาน');
        }

        [$start, $end] = $this->resolveRange($request);
        $data = $this->service->dashboard($code, $start, $end);

        return $this->pdfResponse($data, $section, $start, $end);
    }

    private function pdfResponse(array $data, ?string $section, string $start, string $end): Response
    {
        [$fontRegularUri, $fontBoldUri] = $this->pdf->fontUris();
        $dept = $data['department'];
        $sectionLabels = $data['sections'] ?? $this->service->sectionsFor($dept);

        $html = view('department-data.report-pdf', [
            'hospitalName' => config('department_data.hospital_name'),
            'department' => $dept,
            'source' => $data['source'] ?? 'ovst',
            'filters' => $data['filters'],
            'summary' => $data['summary'],
            'trend' => $data['trend'],
            'diagnoses' => $data['diagnoses'] ?? [],
            'rights' => $data['rights'] ?? [],
            'hourly' => $data['hourly'],
            'wards' => $data['wards'] ?? [],
            'forms' => $data['forms'] ?? [],
            'items' => $data['items'] ?? [],
            'groups' => $data['groups'] ?? [],
            'requestDepartments' => $data['departments'] ?? [],
            'regiments' => $data['regiments'] ?? [],
            'personnel' => $data['personnel'] ?? [],
            'ages' => $data['ages'] ?? [],
            'labStatus' => $data['lab_status'] ?? [],
            'labMarkers' => $data['lab_markers'] ?? [],
            'waitBands' => $data['wait_bands'] ?? [],
            'waitStages' => $data['wait_stages'] ?? [],
            'waitQueue' => $data['wait_queue'] ?? [],
            'waitLabQueue' => $data['wait_lab_queue'] ?? [],
            'waitPharmacyQueue' => $data['wait_pharmacy_queue'] ?? [],
            'waitMode' => $data['wait_mode'] ?? null,
            'vitals' => $data['vitals'] ?? [],
            'specialties' => $data['specialties'] ?? [],
            'visitStatus' => $data['visit_status'] ?? [],
            'destinations' => $data['destinations'] ?? [],
            'complaints' => $data['complaints'] ?? [],
            'weekdays' => $data['weekdays'] ?? [],
            'erTypes' => $data['er_types'] ?? [],
            'erPtTypes' => $data['er_pt_types'] ?? [],
            'section' => $section,
            'sectionLabel' => $section ? ($sectionLabels[$section] ?? $section) : null,
            'sectionLabels' => $sectionLabels,
            'startLabel' => $this->thaiDate($start),
            'endLabel' => $this->thaiDate($end),
            'generatedAt' => $this->thaiDateTime(now()),
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
            'formatNum' => fn ($v, $d = 0) => number_format((float) $v, $d),
            'formatBaht' => fn ($v) => number_format((float) $v, 2),
        ])->render();

        $suffix = $section ? '-'.$section : '-ทั้งหมด';
        $filename = 'รายงานแผนก-'.$dept['code'].$suffix.'.pdf';

        return response($this->pdf->render($html, 'portrait'), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }

    /** @return array{0: string, 1: string} */
    private function resolveRange(Request $request): array
    {
        $end = $request->filled('end_date')
            ? Carbon::parse($request->query('end_date'))->toDateString()
            : Carbon::today()->toDateString();

        $start = $request->filled('start_date')
            ? Carbon::parse($request->query('start_date'))->toDateString()
            : Carbon::parse($end)->startOfMonth()->toDateString();

        if ($start > $end) {
            [$start, $end] = [$end, $start];
        }

        return [$start, $end];
    }

    private function normalizeCode(string $code): string
    {
        $code = trim($code);
        if (! $this->service->findDepartment($code)) {
            abort(404, 'ไม่พบแผนกที่ระบุ');
        }

        return $code;
    }

    private function thaiDate(string $date): string
    {
        $c = Carbon::parse($date);

        return $c->format('d/m/').($c->year + 543);
    }

    private function thaiDateTime(Carbon $dt): string
    {
        return $dt->format('d/m/').($dt->year + 543).' '.$dt->format('H:i');
    }
}
