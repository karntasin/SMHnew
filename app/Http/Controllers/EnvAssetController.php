<?php

namespace App\Http\Controllers;

use App\Models\EnvAsset;
use App\Models\EnvAssetLine;
use App\Models\EnvAssetStatusLog;
use App\Models\EnvPmSchedule;
use App\Services\ThaiPdfService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class EnvAssetController extends Controller
{
    public function index(Request $request): Response
    {
        $lines = EnvAssetLine::query()->orderBy('sort_order')->get(['id', 'code', 'name', 'short_name']);

        $lineId = $request->integer('line_id') ?: null;
        if ($lineId && ! $lines->contains('id', $lineId)) {
            $lineId = null;
        }

        $registryStatus = $request->query('registry_status');
        $registryStatus = is_string($registryStatus) && isset(EnvAsset::REGISTRY_STATUSES[$registryStatus])
            ? $registryStatus
            : null;

        $q = trim((string) $request->query('q', ''));

        $query = EnvAsset::query()->with(['line:id,code,name,short_name', 'schedule']);

        if ($lineId) {
            $query->where('line_id', $lineId);
        }
        if ($registryStatus) {
            $query->where('registry_status', $registryStatus);
        }
        if ($q !== '') {
            $query->where(function ($builder) use ($q) {
                $builder->where('name', 'like', "%{$q}%")
                    ->orWhere('stock_number', 'like', "%{$q}%")
                    ->orWhere('serial_number', 'like', "%{$q}%")
                    ->orWhere('brand', 'like', "%{$q}%")
                    ->orWhere('model', 'like', "%{$q}%")
                    ->orWhere('issue_location', 'like', "%{$q}%")
                    ->orWhere('status_note', 'like', "%{$q}%");
            });
        }

        $assets = $query
            ->orderBy('name')
            ->orderBy('stock_number')
            ->paginate(50)
            ->withQueryString()
            ->through(fn (EnvAsset $asset) => $this->serializeAsset($asset));

        $summaryQuery = EnvAsset::query();
        if ($lineId) {
            $summaryQuery->where('line_id', $lineId);
        }

        $byStatus = (clone $summaryQuery)
            ->selectRaw('registry_status, COUNT(*) as total')
            ->groupBy('registry_status')
            ->pluck('total', 'registry_status');

        $byLine = EnvAsset::query()
            ->selectRaw('line_id, COUNT(*) as total')
            ->groupBy('line_id')
            ->pluck('total', 'line_id');

        return Inertia::render('Env/Assets/Index', [
            'assets' => $assets,
            'lines' => $lines->map(fn (EnvAssetLine $line) => [
                'id' => $line->id,
                'code' => $line->code,
                'name' => $line->name,
                'short_name' => $line->short_name,
                'count' => (int) ($byLine[$line->id] ?? 0),
            ]),
            'registryStatuses' => collect(EnvAsset::REGISTRY_STATUSES)
                ->map(fn ($label, $key) => [
                    'value' => $key,
                    'label' => $label,
                    'count' => (int) ($byStatus[$key] ?? 0),
                ])
                ->values(),
            'statusRequirements' => EnvAsset::STATUS_CHANGE_REQUIREMENTS,
            'summary' => [
                'total' => (clone $summaryQuery)->count(),
                'active' => (clone $summaryQuery)->where('registry_status', 'normal')->count(),
                'repair' => (clone $summaryQuery)->where('registry_status', 'repair')->count(),
                'pending_disposal' => (clone $summaryQuery)->where('registry_status', 'pending_disposal')->count(),
                'disposed' => (clone $summaryQuery)->where('registry_status', 'disposed')->count(),
                'with_image' => (clone $summaryQuery)->whereNotNull('image_path')->where('image_path', '!=', '')->count(),
                'value' => (float) (clone $summaryQuery)
                    ->whereIn('registry_status', ['normal', 'repair', 'pending_disposal'])
                    ->sum('price'),
            ],
            'filters' => [
                'line_id' => $lineId,
                'registry_status' => $registryStatus,
                'q' => $q,
            ],
        ]);
    }

    public function risk(Request $request): Response
    {
        $data = $this->buildRiskListData($request);

        return Inertia::render('Env/Assets/Risk', $data);
    }

    public function riskPdf(Request $request, ThaiPdfService $pdf): HttpResponse
    {
        @ini_set('memory_limit', '1024M');
        @set_time_limit(300);

        $data = $this->buildRiskListData($request, forPdf: true);
        [$fontRegularUri, $fontBoldUri] = $pdf->fontUris();

        $lineModel = collect($data['lines'])->firstWhere('id', $data['filters']['line_id']);
        $riskLabel = $data['filters']['risk_level']
            ? (EnvAsset::RISK_LEVELS[$data['filters']['risk_level']] ?? $data['filters']['risk_level'])
            : null;
        $statusLabel = $data['filters']['registry_status']
            ? (EnvAsset::REGISTRY_STATUSES[$data['filters']['registry_status']] ?? null)
            : null;

        $detailRows = [];
        $no = 0;
        foreach ($data['assets'] as $asset) {
            $no++;
            $brand = trim((string) ($asset['brand'] ?? ''));
            $model = trim((string) ($asset['model'] ?? ''));
            $brandModel = trim($brand.($brand && $model ? ' / ' : '').$model);
            $location = trim((string) (($asset['issue_location'] ?? '') ?: ($asset['location'] ?? '')));

            $detailRows[] = [
                'no' => $no,
                'risk_label' => EnvAsset::RISK_LEVELS[$asset['risk_level']] ?? $asset['risk_level'],
                'status_label' => EnvAsset::REGISTRY_STATUSES[$asset['registry_status']] ?? $asset['registry_status'],
                'line_name' => $asset['line']['short_name'] ?? $asset['line']['name'] ?? '-',
                'name' => $this->pdfCell((string) ($asset['name'] ?? ''), 70),
                'stock_number' => $this->pdfCell((string) ($asset['stock_number'] ?? ''), 24) ?: '-',
                'brand_model' => $this->pdfCell($brandModel, 36) ?: '-',
                'price' => $asset['price'] !== null ? number_format((float) $asset['price'], 2) : '-',
                'serial_number' => $this->pdfCell((string) ($asset['serial_number'] ?? ''), 24) ?: '-',
                'location' => $this->pdfCell($location, 40) ?: '-',
            ];
        }

        $html = view('env.assets-risk-report-pdf', [
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
            'hospitalName' => config('department_data.hospital_name', config('app.name', 'โรงพยาบาล')),
            'selectedLine' => $lineModel ? [
                'id' => $lineModel['id'],
                'name' => $lineModel['name'],
                'short_name' => $lineModel['short_name'] ?? null,
            ] : null,
            'riskFilterLabel' => $riskLabel,
            'statusFilterLabel' => $statusLabel,
            'summary' => $data['summary'],
            'riskCounts' => $data['riskCounts'],
            'detailRows' => $detailRows,
            'generatedAt' => now()->format('d/m/Y H:i'),
            'generatedDate' => now()->format('d/m/Y'),
        ])->render();

        $filename = 'env-assets-risk-'.now()->format('Ymd-Hi').'.pdf';

        return response($pdf->render($html, 'landscape'), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }

    public function inspection(Request $request): Response
    {
        $lines = EnvAssetLine::query()->orderBy('sort_order')->get(['id', 'code', 'name', 'short_name']);

        $lineId = $request->integer('line_id') ?: null;
        if ($lineId && ! $lines->contains('id', $lineId)) {
            $lineId = null;
        }

        $registryStatus = $request->query('registry_status');
        $registryStatus = is_string($registryStatus) && isset(EnvAsset::REGISTRY_STATUSES[$registryStatus])
            ? $registryStatus
            : null;

        $q = trim((string) $request->query('q', ''));

        $base = EnvAsset::query()->where('inspection_status', 'inspect');
        if ($lineId) {
            $base->where('line_id', $lineId);
        }

        $query = (clone $base)->with(['line:id,code,name,short_name']);
        if ($registryStatus) {
            $query->where('registry_status', $registryStatus);
        }
        if ($q !== '') {
            $query->where(function ($builder) use ($q) {
                $builder->where('name', 'like', "%{$q}%")
                    ->orWhere('stock_number', 'like', "%{$q}%")
                    ->orWhere('serial_number', 'like', "%{$q}%")
                    ->orWhere('brand', 'like', "%{$q}%")
                    ->orWhere('model', 'like', "%{$q}%")
                    ->orWhere('issue_location', 'like', "%{$q}%");
            });
        }

        $assets = $query
            ->orderBy('name')
            ->orderBy('stock_number')
            ->paginate(50)
            ->withQueryString()
            ->through(fn (EnvAsset $asset) => $this->serializeAsset($asset));

        $byStatus = (clone $base)
            ->selectRaw('registry_status, COUNT(*) as total')
            ->groupBy('registry_status')
            ->pluck('total', 'registry_status');

        $byLine = EnvAsset::query()
            ->where('inspection_status', 'inspect')
            ->selectRaw('line_id, COUNT(*) as total')
            ->groupBy('line_id')
            ->pluck('total', 'line_id');

        return Inertia::render('Env/Assets/Inspection', [
            'assets' => $assets,
            'lines' => $lines->map(fn (EnvAssetLine $line) => [
                'id' => $line->id,
                'code' => $line->code,
                'name' => $line->name,
                'short_name' => $line->short_name,
                'count' => (int) ($byLine[$line->id] ?? 0),
            ]),
            'registryStatuses' => collect(EnvAsset::REGISTRY_STATUSES)
                ->map(fn ($label, $key) => [
                    'value' => $key,
                    'label' => $label,
                    'count' => (int) ($byStatus[$key] ?? 0),
                ])
                ->values(),
            'summary' => [
                'total' => (clone $base)->count(),
                'value' => (float) (clone $base)->sum('price'),
            ],
            'filters' => [
                'line_id' => $lineId,
                'registry_status' => $registryStatus,
                'q' => $q,
            ],
        ]);
    }

    /**
     * รายการครุภัณฑ์เสี่ยง (A/B/C เท่านั้น — ไม่รวม ไม่ระบุ)
     *
     * @return array<string, mixed>
     */
    private function buildRiskListData(Request $request, bool $forPdf = false): array
    {
        $lines = EnvAssetLine::query()->orderBy('sort_order')->get(['id', 'code', 'name', 'short_name']);

        $lineId = $request->integer('line_id') ?: null;
        if ($lineId && ! $lines->contains('id', $lineId)) {
            $lineId = null;
        }

        $riskLevel = $request->query('risk_level');
        $riskLevel = is_string($riskLevel) && in_array($riskLevel, ['A', 'B', 'C'], true)
            ? $riskLevel
            : null;

        $registryStatus = $request->query('registry_status');
        $registryStatus = is_string($registryStatus) && isset(EnvAsset::REGISTRY_STATUSES[$registryStatus])
            ? $registryStatus
            : null;

        $q = trim((string) $request->query('q', ''));

        $base = EnvAsset::query()->whereIn('risk_level', ['A', 'B', 'C']);
        if ($lineId) {
            $base->where('line_id', $lineId);
        }

        $query = (clone $base)->with(['line:id,code,name,short_name']);
        if ($riskLevel) {
            $query->where('risk_level', $riskLevel);
        }
        if ($registryStatus) {
            $query->where('registry_status', $registryStatus);
        }
        if ($q !== '') {
            $query->where(function ($builder) use ($q) {
                $builder->where('name', 'like', "%{$q}%")
                    ->orWhere('stock_number', 'like', "%{$q}%")
                    ->orWhere('serial_number', 'like', "%{$q}%")
                    ->orWhere('brand', 'like', "%{$q}%")
                    ->orWhere('model', 'like', "%{$q}%")
                    ->orWhere('issue_location', 'like', "%{$q}%");
            });
        }

        $filteredValue = (float) (clone $query)->sum('price');

        $query
            ->orderByRaw("FIELD(risk_level,'A','B','C')")
            ->orderBy('name')
            ->orderBy('stock_number');

        if ($forPdf) {
            $assets = $query->get()->map(fn (EnvAsset $asset) => $this->serializeAsset($asset))->all();
            $filteredCount = count($assets);
        } else {
            $assets = $query
                ->paginate(50)
                ->withQueryString()
                ->through(fn (EnvAsset $asset) => $this->serializeAsset($asset));
            $filteredCount = (int) $assets->total();
        }

        $riskCounts = [
            'A' => (clone $base)->where('risk_level', 'A')->count(),
            'B' => (clone $base)->where('risk_level', 'B')->count(),
            'C' => (clone $base)->where('risk_level', 'C')->count(),
        ];

        $byLine = EnvAsset::query()
            ->whereIn('risk_level', ['A', 'B', 'C'])
            ->selectRaw('line_id, COUNT(*) as total')
            ->groupBy('line_id')
            ->pluck('total', 'line_id');

        $byStatus = (clone $base)
            ->when($riskLevel, fn ($q) => $q->where('risk_level', $riskLevel))
            ->selectRaw('registry_status, COUNT(*) as total')
            ->groupBy('registry_status')
            ->pluck('total', 'registry_status');

        return [
            'assets' => $assets,
            'lines' => $lines->map(fn (EnvAssetLine $line) => [
                'id' => $line->id,
                'code' => $line->code,
                'name' => $line->name,
                'short_name' => $line->short_name,
                'count' => (int) ($byLine[$line->id] ?? 0),
            ]),
            'riskLevels' => collect(['A', 'B', 'C'])
                ->map(fn ($key) => [
                    'value' => $key,
                    'label' => EnvAsset::RISK_LEVELS[$key],
                    'count' => (int) ($riskCounts[$key] ?? 0),
                ])
                ->values(),
            'registryStatuses' => collect(EnvAsset::REGISTRY_STATUSES)
                ->map(fn ($label, $key) => [
                    'value' => $key,
                    'label' => $label,
                    'count' => (int) ($byStatus[$key] ?? 0),
                ])
                ->values(),
            'riskCounts' => $riskCounts,
            'summary' => [
                'total' => array_sum($riskCounts),
                'filtered' => $filteredCount,
                'value' => $filteredValue,
            ],
            'filters' => [
                'line_id' => $lineId,
                'risk_level' => $riskLevel,
                'registry_status' => $registryStatus,
                'q' => $q,
            ],
        ];
    }

    public function report(Request $request): Response
    {
        $data = $this->buildReportData($request);

        return Inertia::render('Env/Assets/Report', [
            'lines' => $data['lines'],
            'lineSummaries' => $data['lineSummaries'],
            'assets' => $data['assets'],
            'registryStatuses' => $data['registryStatuses'],
            'summary' => $data['summary'],
            'filters' => $data['filters'],
            'generated_at' => $data['generated_at'],
        ]);
    }

    public function reportPdf(Request $request, ThaiPdfService $pdf): HttpResponse
    {
        // Dompdf ใช้หน่วยความจำสูงเมื่อมีรายการมาก (เช่น สายแพทย์ ~700 แถว)
        @ini_set('memory_limit', '1024M');
        @set_time_limit(300);

        $data = $this->buildReportData($request, forPdf: true);
        [$fontRegularUri, $fontBoldUri] = $pdf->fontUris();

        $lineModel = collect($data['lines'])->firstWhere('id', $data['filters']['line_id']);
        $selectedLine = $lineModel ? [
            'id' => $lineModel->id,
            'code' => $lineModel->code,
            'name' => $lineModel->name,
            'short_name' => $lineModel->short_name,
        ] : null;
        $statusLabel = $data['filters']['registry_status']
            ? (EnvAsset::REGISTRY_STATUSES[$data['filters']['registry_status']] ?? null)
            : null;

        // ตารางแบน + ตัดข้อความสั้น เพื่อให้ Dompdf เรนเดอร์ครบทุกแถว (ไม่มีรูป)
        $detailRows = [];
        $no = 0;
        foreach ($data['assets'] as $asset) {
            $no++;
            $brand = trim((string) ($asset['brand'] ?? ''));
            $model = trim((string) ($asset['model'] ?? ''));
            $brandModel = trim($brand.($brand && $model ? ' / ' : '').$model);
            $location = trim((string) (($asset['issue_location'] ?? '') ?: ($asset['location'] ?? '')));

            $detailRows[] = [
                'no' => $no,
                'status_label' => EnvAsset::REGISTRY_STATUSES[$asset['registry_status']] ?? $asset['registry_status'],
                'name' => $this->pdfCell((string) ($asset['name'] ?? ''), 70),
                'stock_number' => $this->pdfCell((string) ($asset['stock_number'] ?? ''), 24) ?: '-',
                'condition_code' => $this->pdfCell((string) ($asset['condition_code'] ?? ''), 12) ?: '-',
                'brand_model' => $this->pdfCell($brandModel, 36) ?: '-',
                'fiscal_year' => $this->pdfCell((string) ($asset['fiscal_year'] ?? ''), 16) ?: '-',
                'price' => $asset['price'] !== null ? number_format((float) $asset['price'], 2) : '-',
                'serial_number' => $this->pdfCell((string) ($asset['serial_number'] ?? ''), 24) ?: '-',
                'location' => $this->pdfCell($location, 40) ?: '-',
            ];
        }

        // สรุปสาย: ไม่ส่งคอลัมน์รูป
        $lineSummaries = collect($data['lineSummaries'])->map(fn (array $line) => [
            'id' => $line['id'],
            'code' => $line['code'],
            'name' => $line['name'],
            'short_name' => $line['short_name'],
            'total' => $line['total'],
            'normal' => $line['normal'],
            'repair' => $line['repair'],
            'pending_disposal' => $line['pending_disposal'],
            'disposed' => $line['disposed'],
            'value' => $line['value'],
        ])->all();

        $viewData = [
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
            'hospitalName' => config('department_data.hospital_name', config('app.name', 'โรงพยาบาล')),
            'selectedLine' => $selectedLine,
            'statusFilterLabel' => $statusLabel,
            'lineSummaries' => $lineSummaries,
            'registryStatuses' => $data['registryStatuses'],
            'summary' => [
                'total' => $data['summary']['total'],
                'value' => $data['summary']['value'],
            ],
            'detailRows' => $detailRows,
            'generatedAt' => $data['generated_at'],
            'generatedDate' => now()->format('d/m/Y'),
        ];

        unset($data);
        $html = view('env.assets-line-report-pdf', $viewData)->render();
        unset($viewData, $detailRows);

        $lineCode = $selectedLine['code'] ?? 'all';
        $filename = 'env-assets-'.$lineCode.'-'.now()->format('Ymd-Hi').'.pdf';
        $binary = $pdf->render($html, 'landscape');
        unset($html);

        return response($binary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }

    private function pdfCell(string $value, int $maxLen): string
    {
        $value = preg_replace('/\s+/u', ' ', trim($value)) ?? '';
        if ($value === '') {
            return '';
        }
        if (mb_strlen($value) <= $maxLen) {
            return $value;
        }

        return mb_substr($value, 0, $maxLen - 1).'…';
    }

    /**
     * @return array<string, mixed>
     */
    private function buildReportData(Request $request, bool $forPdf = false): array
    {
        $lines = EnvAssetLine::query()->orderBy('sort_order')->get(['id', 'code', 'name', 'short_name']);

        $lineId = $request->integer('line_id') ?: ($lines->first()?->id);
        if ($lineId && ! $lines->contains('id', $lineId)) {
            $lineId = $lines->first()?->id;
        }

        $registryStatus = $request->query('registry_status');
        $registryStatus = is_string($registryStatus) && isset(EnvAsset::REGISTRY_STATUSES[$registryStatus])
            ? $registryStatus
            : null;

        $assets = EnvAsset::query()
            ->when(! $forPdf, fn ($q) => $q->with(['line:id,code,name,short_name']))
            ->when($forPdf, fn ($q) => $q->select([
                'id', 'line_id', 'registry_status', 'name', 'stock_number', 'condition_code',
                'brand', 'model', 'company', 'fiscal_year', 'budget_type', 'price',
                'serial_number', 'issue_location', 'location',
            ]))
            ->when($lineId, fn ($q) => $q->where('line_id', $lineId))
            ->when($registryStatus, fn ($q) => $q->where('registry_status', $registryStatus))
            ->orderByRaw("CASE registry_status WHEN 'normal' THEN 1 WHEN 'repair' THEN 2 WHEN 'pending_disposal' THEN 3 WHEN 'disposed' THEN 4 ELSE 9 END")
            ->orderBy('name')
            ->orderBy('stock_number')
            ->get()
            ->map(fn (EnvAsset $asset) => $forPdf
                ? $this->serializeAssetForPdf($asset)
                : $this->serializeAsset($asset));

        $summaryBase = EnvAsset::query()->when($lineId, fn ($q) => $q->where('line_id', $lineId));

        $statusCounts = (clone $summaryBase)
            ->selectRaw('registry_status, COUNT(*) as total, COALESCE(SUM(price),0) as value')
            ->groupBy('registry_status')
            ->get()
            ->keyBy('registry_status');

        $lineSummaries = EnvAssetLine::query()
            ->orderBy('sort_order')
            ->get()
            ->map(function (EnvAssetLine $line) {
                $base = EnvAsset::query()->where('line_id', $line->id);
                $byStatus = (clone $base)
                    ->selectRaw('registry_status, COUNT(*) as total')
                    ->groupBy('registry_status')
                    ->pluck('total', 'registry_status');

                return [
                    'id' => $line->id,
                    'code' => $line->code,
                    'name' => $line->name,
                    'short_name' => $line->short_name,
                    'total' => (clone $base)->count(),
                    'normal' => (int) ($byStatus['normal'] ?? 0),
                    'repair' => (int) ($byStatus['repair'] ?? 0),
                    'pending_disposal' => (int) ($byStatus['pending_disposal'] ?? 0),
                    'disposed' => (int) ($byStatus['disposed'] ?? 0),
                    'with_image' => (clone $base)->whereNotNull('image_path')->where('image_path', '!=', '')->count(),
                    'value' => (float) (clone $base)
                        ->whereIn('registry_status', ['normal', 'repair', 'pending_disposal'])
                        ->sum('price'),
                ];
            });

        return [
            'lines' => $lines,
            'lineSummaries' => $lineSummaries,
            'assets' => $assets,
            'registryStatuses' => collect(EnvAsset::REGISTRY_STATUSES)
                ->map(fn ($label, $key) => [
                    'value' => $key,
                    'label' => $label,
                    'count' => (int) ($statusCounts[$key]->total ?? 0),
                    'value_sum' => (float) ($statusCounts[$key]->value ?? 0),
                ])
                ->values(),
            'summary' => [
                'total' => (clone $summaryBase)->count(),
                'with_image' => (clone $summaryBase)->whereNotNull('image_path')->where('image_path', '!=', '')->count(),
                'value' => (float) (clone $summaryBase)
                    ->whereIn('registry_status', ['normal', 'repair', 'pending_disposal'])
                    ->sum('price'),
            ],
            'filters' => [
                'line_id' => $lineId,
                'registry_status' => $registryStatus,
            ],
            'generated_at' => now()->format('d/m/Y H:i'),
        ];
    }

    public function store(Request $request)
    {
        $validated = $this->validateAssetPayload($request, creating: true);

        $registryStatus = 'normal';
        $line = ! empty($validated['line_id'])
            ? EnvAssetLine::find($validated['line_id'])
            : null;

        $payload = $this->assetPayloadFromValidated($validated, $registryStatus, $line);

        $asset = EnvAsset::create($payload);
        $this->storeUploadedImage($request, $asset, $line);

        EnvPmSchedule::create([
            'asset_id' => $asset->id,
            'frequency_type' => $validated['frequency_type'] ?? 'month',
            'frequency_value' => (int) ($validated['frequency_value'] ?? 12),
            'next_pm_date' => $validated['next_pm_date']
                ?? Carbon::now()->addMonths((int) ($validated['frequency_value'] ?? 12)),
            'checklist_template' => [],
        ]);

        return redirect()->back()->with('success', 'ขึ้นทะเบียนครุภัณฑ์เรียบร้อย');
    }

    public function update(Request $request, EnvAsset $asset)
    {
        $validated = $this->validateAssetPayload($request, creating: false);

        $registryStatus = EnvAsset::normalizeRegistryStatus(
            $validated['registry_status'] ?? $asset->registry_status ?? 'normal'
        );
        $line = ! empty($validated['line_id'])
            ? EnvAssetLine::find($validated['line_id'])
            : $asset->line;

        $payload = $this->assetPayloadFromValidated($validated, $registryStatus, $line);
        $asset->update($payload);
        $this->storeUploadedImage($request, $asset->fresh(), $line);

        return redirect()->back()->with('success', 'อัปเดตครุภัณฑ์เรียบร้อย');
    }

    public function changeStatus(Request $request, EnvAsset $asset)
    {
        $toRegistry = (string) $request->input('registry_status');
        if (! isset(EnvAsset::REGISTRY_STATUSES[$toRegistry])) {
            return redirect()->back()->with('error', 'สถานะไม่ถูกต้อง');
        }

        $rules = [
            'registry_status' => ['required', Rule::in(array_keys(EnvAsset::REGISTRY_STATUSES))],
            'event_date' => 'required|date',
            'note' => 'nullable|string|max:2000',
            'repair_slip_no' => 'nullable|string|max:191',
            'repair_job_no' => 'nullable|string|max:191',
            'inspection_doc' => 'nullable|string|max:2000',
            'disposal_doc' => 'nullable|string|max:2000',
            'writeoff_doc' => 'nullable|string|max:2000',
            'scrap_return_doc' => 'nullable|string|max:2000',
        ];

        foreach (EnvAsset::STATUS_CHANGE_REQUIREMENTS[$toRegistry] ?? ['event_date'] as $field) {
            if ($field === 'event_date') {
                $rules['event_date'] = 'required|date';
            } elseif ($field === 'note') {
                $rules['note'] = 'required|string|max:2000';
            } else {
                $rules[$field] = 'required|string|max:2000';
            }
        }

        $data = $request->validate($rules);

        $fromRegistry = $asset->registry_status;
        $fromStatus = $asset->status;
        $toStatus = EnvAsset::operationalStatusForRegistry($toRegistry);

        $asset->fill([
            'registry_status' => $toRegistry,
            'sheet_name' => EnvAsset::REGISTRY_STATUSES[$toRegistry],
            'status' => $toStatus,
            'status_changed_at' => $data['event_date'],
            'status_change_note' => $data['note'] ?? null,
        ]);

        if ($toRegistry === 'repair') {
            $asset->sent_at = $data['event_date'];
            $asset->repair_slip_no = $data['repair_slip_no'] ?? null;
            $asset->repair_job_no = $data['repair_job_no'] ?? null;
            if (! empty($data['inspection_doc'])) {
                $asset->inspection_doc = $data['inspection_doc'];
            }
        }

        if (in_array($toRegistry, ['pending_disposal', 'disposed'], true)) {
            $asset->inspection_doc = $data['inspection_doc'] ?? $asset->inspection_doc;
            $asset->disposal_doc = $data['disposal_doc'] ?? $asset->disposal_doc;
            $asset->repair_slip_no = $data['repair_slip_no'] ?? $asset->repair_slip_no;
            $asset->repair_job_no = $data['repair_job_no'] ?? $asset->repair_job_no;
        }

        $asset->save();

        EnvAssetStatusLog::create([
            'asset_id' => $asset->id,
            'from_registry_status' => $fromRegistry,
            'to_registry_status' => $toRegistry,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'event_date' => $data['event_date'],
            'repair_slip_no' => $data['repair_slip_no'] ?? null,
            'repair_job_no' => $data['repair_job_no'] ?? null,
            'inspection_doc' => $data['inspection_doc'] ?? null,
            'disposal_doc' => $data['disposal_doc'] ?? null,
            'writeoff_doc' => $data['writeoff_doc'] ?? null,
            'scrap_return_doc' => $data['scrap_return_doc'] ?? null,
            'note' => $data['note'] ?? null,
            'payload' => $data,
            'changed_by' => Auth::id(),
        ]);

        return redirect()->back()->with(
            'success',
            'เปลี่ยนสถานะเป็น “'.EnvAsset::REGISTRY_STATUSES[$toRegistry].'” เรียบร้อย'
        );
    }

    public function destroy(EnvAsset $asset)
    {
        if ($asset->image_path) {
            Storage::disk('public')->delete($asset->image_path);
        }

        $asset->delete();

        return redirect()->back()->with('success', 'ลบครุภัณฑ์เรียบร้อย');
    }

    /**
     * @return array<string, mixed>
     */
    private function validateAssetPayload(Request $request, bool $creating): array
    {
        return $request->validate([
            'line_id' => 'required|exists:env_asset_lines,id',
            'item_type' => 'nullable|string|max:64',
            'name' => 'required|string|max:255',
            'price' => 'nullable|numeric|min:0',
            'stock_number' => 'nullable|string|max:128',
            'condition_code' => 'nullable|string|max:64',
            'brand' => 'nullable|string|max:191',
            'model' => 'nullable|string|max:255',
            'company' => 'nullable|string|max:255',
            'fiscal_year' => 'nullable|string|max:32',
            'budget_type' => 'nullable|string|max:191',
            'serial_number' => 'nullable|string|max:191',
            'control_number' => 'nullable|string|max:191',
            'issue_location' => 'nullable|string|max:2000',
            'status_note' => 'nullable|string|max:2000',
            'reference_doc' => 'nullable|string|max:2000',
            'delivery_date' => 'nullable|string|max:128',
            'fan_coil' => 'nullable|string|max:255',
            'condensing_unit' => 'nullable|string|max:255',
            'owner' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'risk_level' => ['required', Rule::in(array_keys(EnvAsset::RISK_LEVELS))],
            'inspection_status' => ['required', Rule::in(array_keys(EnvAsset::INSPECTION_STATUSES))],
            'registry_status' => [$creating ? 'nullable' : 'nullable', Rule::in(array_keys(EnvAsset::REGISTRY_STATUSES))],
            'purchase_date' => 'nullable|date',
            'warranty_expiry' => 'nullable|date',
            'frequency_type' => 'nullable|in:month,year',
            'frequency_value' => 'nullable|integer|min:1',
            'next_pm_date' => 'nullable|date',
            'image' => 'nullable|image|max:8192',
            'remove_image' => 'nullable|boolean',
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function assetPayloadFromValidated(array $validated, string $registryStatus, ?EnvAssetLine $line): array
    {
        $issueLocation = $validated['issue_location'] ?? null;

        return [
            'line_id' => $validated['line_id'] ?? null,
            'item_type' => $validated['item_type'] ?? null,
            'name' => $validated['name'],
            'price' => $validated['price'] ?? null,
            'stock_number' => $validated['stock_number'] ?? null,
            'condition_code' => $validated['condition_code'] ?? null,
            'brand' => $validated['brand'] ?? null,
            'model' => $validated['model'] ?? null,
            'company' => $validated['company'] ?? null,
            'fiscal_year' => $validated['fiscal_year'] ?? null,
            'budget_type' => $validated['budget_type'] ?? null,
            'serial_number' => $validated['serial_number'] ?? null,
            'control_number' => $validated['control_number'] ?? null,
            'issue_location' => $issueLocation,
            'location' => $validated['location'] ?? $issueLocation,
            'status_note' => $validated['status_note'] ?? null,
            'reference_doc' => $validated['reference_doc'] ?? null,
            'delivery_date' => $validated['delivery_date'] ?? null,
            'fan_coil' => $validated['fan_coil'] ?? null,
            'condensing_unit' => $validated['condensing_unit'] ?? null,
            'owner' => $validated['owner'] ?? ($line?->name),
            'risk_level' => $validated['risk_level'] ?? 'C',
            'inspection_status' => $validated['inspection_status'] ?? 'not_inspect',
            'purchase_date' => $validated['purchase_date'] ?? null,
            'warranty_expiry' => $validated['warranty_expiry'] ?? null,
            'registry_status' => $registryStatus,
            'status' => EnvAsset::operationalStatusForRegistry($registryStatus),
            'sheet_name' => EnvAsset::REGISTRY_STATUSES[$registryStatus] ?? 'ปกติ',
        ];
    }

    private function storeUploadedImage(Request $request, EnvAsset $asset, ?EnvAssetLine $line): void
    {
        if ($request->boolean('remove_image') && $asset->image_path) {
            Storage::disk('public')->delete($asset->image_path);
            $asset->update(['image_path' => null, 'image_ref' => null]);
        }

        if (! $request->hasFile('image')) {
            return;
        }

        if ($asset->image_path) {
            Storage::disk('public')->delete($asset->image_path);
        }

        $lineCode = $line?->code ?: 'misc';
        $path = $request->file('image')->store("env/assets/{$lineCode}/uploads", 'public');
        $asset->update([
            'image_path' => $path,
            'image_ref' => $request->file('image')->getClientOriginalName(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeAssetForPdf(EnvAsset $asset): array
    {
        return [
            'registry_status' => EnvAsset::normalizeRegistryStatus((string) $asset->registry_status),
            'name' => $asset->name,
            'stock_number' => $asset->stock_number,
            'condition_code' => $asset->condition_code,
            'brand' => $asset->brand,
            'model' => $asset->model,
            'company' => $asset->company,
            'fiscal_year' => $asset->fiscal_year,
            'budget_type' => $asset->budget_type,
            'price' => $asset->price,
            'serial_number' => $asset->serial_number,
            'issue_location' => $asset->issue_location,
            'location' => $asset->location,
        ];
    }

    private function serializeAsset(EnvAsset $asset): array
    {
        return [
            'id' => $asset->id,
            'line_id' => $asset->line_id,
            'line' => $asset->line ? [
                'id' => $asset->line->id,
                'code' => $asset->line->code,
                'name' => $asset->line->name,
                'short_name' => $asset->line->short_name,
            ] : null,
            'registry_status' => EnvAsset::normalizeRegistryStatus((string) $asset->registry_status),
            'registry_status_label' => $asset->registry_status_label,
            'sheet_name' => $asset->sheet_name,
            'item_type' => $asset->item_type,
            'name' => $asset->name,
            'model' => $asset->model,
            'serial_number' => $asset->serial_number,
            'stock_number' => $asset->stock_number,
            'condition_code' => $asset->condition_code,
            'brand' => $asset->brand,
            'company' => $asset->company,
            'price' => $asset->price,
            'fiscal_year' => $asset->fiscal_year,
            'budget_type' => $asset->budget_type,
            'control_number' => $asset->control_number,
            'issue_location' => $asset->issue_location,
            'status_note' => $asset->status_note,
            'reference_doc' => $asset->reference_doc,
            'delivery_date' => $asset->delivery_date,
            'fan_coil' => $asset->fan_coil,
            'condensing_unit' => $asset->condensing_unit,
            'location' => $asset->location,
            'owner' => $asset->owner,
            'risk_level' => $asset->risk_level ?: 'N',
            'risk_level_label' => EnvAsset::RISK_LEVELS[$asset->risk_level] ?? ($asset->risk_level ?: 'ไม่ระบุ'),
            'inspection_status' => $asset->inspection_status ?: 'not_inspect',
            'inspection_status_label' => EnvAsset::INSPECTION_STATUSES[$asset->inspection_status]
                ?? ($asset->inspection_status ?: 'ไม่สอบเทียบ'),
            'status' => $asset->status,
            'purchase_date' => optional($asset->purchase_date)->format('Y-m-d'),
            'warranty_expiry' => optional($asset->warranty_expiry)->format('Y-m-d'),
            'image_path' => $asset->image_path,
            'image_ref' => $asset->image_ref,
            'sent_at' => optional($asset->sent_at)->format('Y-m-d'),
            'status_changed_at' => optional($asset->status_changed_at)->format('Y-m-d'),
            'status_change_note' => $asset->status_change_note,
            'source_file' => $asset->source_file,
            'source_row' => $asset->source_row,
            'inspection_doc' => $asset->inspection_doc,
            'repair_slip_no' => $asset->repair_slip_no,
            'repair_job_no' => $asset->repair_job_no,
            'disposal_doc' => $asset->disposal_doc,
            'writeoff_doc' => $asset->writeoff_doc,
            'scrap_return_doc' => $asset->scrap_return_doc,
            'schedule' => $asset->schedule ? [
                'frequency_type' => $asset->schedule->frequency_type,
                'frequency_value' => $asset->schedule->frequency_value,
                'next_pm_date' => optional($asset->schedule->next_pm_date)->format('Y-m-d'),
            ] : null,
        ];
    }
}
