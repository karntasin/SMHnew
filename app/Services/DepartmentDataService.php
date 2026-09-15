<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class DepartmentDataService
{
    /** @return array<string, array<string, mixed>> */
    public function departments(): array
    {
        return config('department_data.departments', []);
    }

    public function findDepartment(string $code): ?array
    {
        $departments = $this->departments();

        return $departments[$code] ?? null;
    }

    public function sourceOf(array $dept): string
    {
        return (string) ($dept['source'] ?? 'ovst');
    }

    public function isIpdSource(array $dept): bool
    {
        return $this->sourceOf($dept) === 'ipt';
    }

    public function isLabSource(array $dept): bool
    {
        return $this->sourceOf($dept) === 'lab';
    }

    public function isXraySource(array $dept): bool
    {
        return $this->sourceOf($dept) === 'xray';
    }

    public function isCheckupSource(array $dept): bool
    {
        return $this->sourceOf($dept) === 'checkup';
    }

    /** @return array<string, string> */
    public function sectionsFor(array $dept): array
    {
        $mode = $this->waitMode($dept);

        return match ($this->sourceOf($dept)) {
            'ipt' => config('department_data.sections_ipt', config('department_data.sections', [])),
            'lab' => config('department_data.sections_lab', config('department_data.sections', [])),
            'xray' => config('department_data.sections_xray', config('department_data.sections', [])),
            'checkup' => config('department_data.sections_checkup', config('department_data.sections', [])),
            'opd_screen' => config('department_data.sections_opd_screen', config('department_data.sections', [])),
            default => match ($mode) {
                'er' => config('department_data.sections_er', config('department_data.sections', [])),
                'clinic' => config('department_data.sections_ovst', config('department_data.sections', [])),
                default => config('department_data.sections', []),
            },
        };
    }

    /**
     * @return array{qi: array<int, string>, ops: array<int, string>}
     */
    public function zonesFor(array $dept): array
    {
        $empty = ['qi' => [], 'ops' => []];
        $mode = $this->waitMode($dept);

        $zones = match ($this->sourceOf($dept)) {
            'ipt' => config('department_data.zones_ipt', $empty),
            'lab' => config('department_data.zones_lab', $empty),
            'xray' => config('department_data.zones_xray', $empty),
            'checkup' => config('department_data.zones_checkup', $empty),
            'opd_screen' => config('department_data.zones_opd_screen', $empty),
            default => match ($mode) {
                'er' => config('department_data.zones_er', $empty),
                'clinic' => config('department_data.zones_ovst', $empty),
                default => $empty,
            },
        };

        return [
            'qi' => array_values($zones['qi'] ?? []),
            'ops' => array_values($zones['ops'] ?? []),
        ];
    }

    public function waitMode(array $dept): ?string
    {
        $mode = $dept['wait_mode'] ?? null;
        if (is_string($mode) && $mode !== '') {
            return $mode;
        }

        if ($this->sourceOf($dept) === 'opd_screen') {
            return 'opd';
        }

        return isset($dept['wait_target_minutes']) ? 'opd' : null;
    }

    public function waitTargetMinutes(array $dept): int
    {
        return (int) ($dept['wait_target_minutes'] ?? HosxpWaitTimeService::ALERT_MINUTES);
    }

    /**
     * @return array{summary: array<string, mixed>, bands: array<int, mixed>, stages: array<int, mixed>, queue: array<int, mixed>, lab_queue: array<int, mixed>, pharmacy_queue: array<int, mixed>}
     */
    private function attachWaitTime($conn, string $code, string $startDate, string $endDate, array $dept): array
    {
        return app(HosxpWaitTimeService::class)->dashboard(
            $conn,
            $code,
            $startDate,
            $endDate,
            $this->waitMode($dept) ?: 'opd',
            $this->waitTargetMinutes($dept),
        );
    }

    /** @return array{connected: bool, message?: string} */
    public function connectionStatus(): array
    {
        try {
            DB::connection('hosxp')->getPdo();

            return ['connected' => true];
        } catch (Throwable $e) {
            Log::warning('DepartmentData HOSxP connection failed: '.$e->getMessage());

            return [
                'connected' => false,
                'message' => 'ไม่สามารถเชื่อมต่อฐานข้อมูล HOSxP ได้',
            ];
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function hubSummaries(?string $startDate = null, ?string $endDate = null): array
    {
        $end = $endDate ? Carbon::parse($endDate)->toDateString() : Carbon::today()->toDateString();
        $start = $startDate ? Carbon::parse($startDate)->toDateString() : Carbon::parse($end)->startOfMonth()->toDateString();

        $status = $this->connectionStatus();
        $counts = [];

        if ($status['connected']) {
            try {
                $conn = DB::connection('hosxp');
                $ovstCodes = [];
                $iptDepts = [];
                $labCodes = [];
                $xrayCodes = [];
                $checkupDepts = [];

                foreach ($this->departments() as $code => $dept) {
                    match ($this->sourceOf($dept)) {
                        'ipt' => $iptDepts[$code] = $dept,
                        'lab' => $labCodes[] = $code,
                        'xray' => $xrayCodes[] = $code,
                        'checkup' => $checkupDepts[$code] = $dept,
                        // opd_screen ใช้ main_dep เหมือน ovst
                        default => $ovstCodes[] = $code,
                    };
                }

                if ($ovstCodes) {
                    $rows = $conn->table('ovst')
                        ->selectRaw('main_dep as code')
                        ->selectRaw('COUNT(DISTINCT vn) as visits')
                        ->selectRaw('COUNT(DISTINCT hn) as patients')
                        ->whereIn('main_dep', $ovstCodes)
                        ->whereBetween('vstdate', [$start, $end])
                        ->groupBy('main_dep')
                        ->get();

                    foreach ($rows as $row) {
                        $counts[(string) $row->code] = [
                            'visits' => (int) $row->visits,
                            'patients' => (int) $row->patients,
                        ];
                    }
                }

                $waitService = app(HosxpWaitTimeService::class);
                foreach ($this->departments() as $code => $dept) {
                    $mode = $this->waitMode($dept);
                    if (! $mode) {
                        continue;
                    }
                    $live = $waitService->liveCounts($conn, (string) $code, $mode, $this->waitTargetMinutes($dept));
                    $counts[$code]['waiting_now'] = $live['waiting_now'];
                    $counts[$code]['waiting_over_60'] = $live['waiting_over_60'];
                    $counts[$code]['waiting_lab'] = $live['waiting_lab'];
                    $counts[$code]['waiting_pharmacy'] = $live['waiting_pharmacy'];
                }

                foreach ($iptDepts as $code => $dept) {
                    $wards = $this->resolveWardCodes($conn, $dept);
                    if (! $wards) {
                        $counts[$code] = ['visits' => 0, 'patients' => 0];
                        continue;
                    }

                    $row = $conn->table('ipt as i')
                        ->whereIn('i.ward', $wards)
                        ->whereBetween('i.regdate', [$start, $end])
                        ->selectRaw('COUNT(DISTINCT i.an) as visits')
                        ->selectRaw('COUNT(DISTINCT i.hn) as patients')
                        ->first();

                    $counts[$code] = [
                        'visits' => (int) ($row->visits ?? 0),
                        'patients' => (int) ($row->patients ?? 0),
                    ];
                }

                foreach ($labCodes as $code) {
                    $row = $conn->table('lab_head')
                        ->whereBetween('order_date', [$start, $end])
                        ->selectRaw('COUNT(*) as visits')
                        ->selectRaw('COUNT(DISTINCT hn) as patients')
                        ->first();

                    $counts[$code] = [
                        'visits' => (int) ($row->visits ?? 0),
                        'patients' => (int) ($row->patients ?? 0),
                    ];
                }

                foreach ($xrayCodes as $code) {
                    if ($this->hosxpTableExists($conn, 'xray_report') && $this->hosxpColumnExists($conn, 'xray_report', 'request_date')) {
                        $row = $conn->table('xray_report')
                            ->whereBetween('request_date', [$start, $end])
                            ->selectRaw('COUNT(*) as visits')
                            ->selectRaw('COUNT(DISTINCT hn) as patients')
                            ->first();
                    } else {
                        $row = $conn->table('xray_head')
                            ->whereBetween('order_date', [$start, $end])
                            ->selectRaw('COUNT(*) as visits')
                            ->selectRaw('COUNT(DISTINCT hn) as patients')
                            ->first();
                    }

                    $counts[$code] = [
                        'visits' => (int) ($row->visits ?? 0),
                        'patients' => (int) ($row->patients ?? 0),
                    ];
                }

                foreach ($checkupDepts as $code => $dept) {
                    $pttype = (string) ($dept['pttype'] ?? '40');
                    $row = $conn->table('ovst as o')
                        ->where('o.pttype', $pttype)
                        ->whereBetween('o.vstdate', [$start, $end])
                        ->selectRaw('COUNT(DISTINCT o.vn) as visits')
                        ->selectRaw('COUNT(DISTINCT o.hn) as patients')
                        ->first();

                    $counts[$code] = [
                        'visits' => (int) ($row->visits ?? 0),
                        'patients' => (int) ($row->patients ?? 0),
                    ];
                }
            } catch (Throwable $e) {
                Log::warning('DepartmentData hubSummaries failed: '.$e->getMessage());
                $status = [
                    'connected' => false,
                    'message' => 'ดึงข้อมูลแผนกไม่สำเร็จ',
                ];
            }
        }

        $items = [];
        foreach ($this->departments() as $code => $dept) {
            $items[] = array_merge($dept, [
                'visits' => $counts[$code]['visits'] ?? 0,
                'patients' => $counts[$code]['patients'] ?? 0,
                'source' => $dept['source'] ?? 'ovst',
                'waiting_now' => $counts[$code]['waiting_now'] ?? null,
                'waiting_over_60' => $counts[$code]['waiting_over_60'] ?? null,
                'waiting_lab' => $counts[$code]['waiting_lab'] ?? null,
                'waiting_pharmacy' => $counts[$code]['waiting_pharmacy'] ?? null,
            ]);
        }

        $pharmacyStock = [
            'low' => 0,
            'empty' => 0,
            'expiring_90d' => 0,
            'href' => '/pharmacy/inventory',
        ];
        try {
            $snap = app(\App\Services\Pharmacy\PharmacyInventoryService::class)->alertSnapshot();
            $pharmacyStock['low'] = (int) ($snap['low'] ?? 0);
            $pharmacyStock['empty'] = (int) ($snap['empty'] ?? 0);
            $pharmacyStock['expiring_90d'] = (int) ($snap['expiring_90d'] ?? 0);
        } catch (Throwable $e) {
            Log::warning('DepartmentData pharmacy stock snapshot failed: '.$e->getMessage());
        }

        return [
            'connection' => $status,
            'filters' => ['start_date' => $start, 'end_date' => $end],
            'departments' => $items,
            'pharmacy_stock' => $pharmacyStock,
            'totals' => [
                'visits' => array_sum(array_column($items, 'visits')),
                'patients' => array_sum(array_column($items, 'patients')),
                'departments' => count($items),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function dashboard(string $code, string $startDate, string $endDate): array
    {
        $dept = $this->findDepartment($code);
        if (! $dept) {
            abort(404, 'ไม่พบแผนกที่ระบุ');
        }

        $source = $this->sourceOf($dept);
        $sections = $this->sectionsFor($dept);

        $status = $this->connectionStatus();
        $empty = [
            'department' => array_merge($dept, [
                'source' => $source,
                'resolved_wards' => [],
            ]),
            'connection' => $status,
            'filters' => ['start_date' => $startDate, 'end_date' => $endDate],
            'summary' => $this->emptySummary($source),
            'trend' => [],
            'diagnoses' => [],
            'rights' => [],
            'hourly' => [],
            'wards' => [],
            'forms' => [],
            'items' => [],
            'groups' => [],
            'departments' => [],
            'regiments' => [],
            'personnel' => [],
            'ages' => [],
            'lab_status' => [],
            'lab_markers' => [],
            'wait_bands' => [],
            'vitals' => [],
            'specialties' => [],
            'visit_status' => [],
            'destinations' => [],
            'complaints' => [],
            'weekdays' => [],
            'wait_stages' => [],
            'wait_queue' => [],
            'wait_lab_queue' => [],
            'wait_pharmacy_queue' => [],
            'wait_enabled' => false,
            'wait_mode' => null,
            'er_types' => [],
            'er_pt_types' => [],
            'sections' => $sections,
            'zones' => $this->zonesFor($dept),
            'source' => $source,
        ];

        if (! $status['connected']) {
            return $empty;
        }

        try {
            $conn = DB::connection('hosxp');

            if ($source === 'ipt') {
                $wards = $this->resolveWardCodes($conn, $dept);
                $empty['department']['resolved_wards'] = $this->wardLabels($conn, $wards);

                return array_merge($empty, [
                    'department' => $empty['department'],
                    'summary' => $this->buildIpdSummary($conn, $wards, $startDate, $endDate),
                    'trend' => $this->buildIpdTrend($conn, $wards, $startDate, $endDate),
                    'diagnoses' => $this->buildIpdDiagnoses($conn, $wards, $startDate, $endDate),
                    'rights' => $this->buildIpdRights($conn, $wards, $startDate, $endDate),
                    'hourly' => $this->buildIpdHourly($conn, $wards, $startDate, $endDate),
                    'wards' => $this->buildIpdWardBreakdown($conn, $wards, $startDate, $endDate),
                ]);
            }

            if ($source === 'lab') {
                return array_merge($empty, [
                    'summary' => $this->buildLabSummary($conn, $startDate, $endDate),
                    'trend' => $this->buildLabTrend($conn, $startDate, $endDate),
                    'forms' => $this->buildLabForms($conn, $startDate, $endDate),
                    'items' => $this->buildLabItems($conn, $startDate, $endDate),
                    'groups' => $this->buildLabGroups($conn, $startDate, $endDate),
                    'departments' => $this->buildLabDepartments($conn, $startDate, $endDate),
                    'hourly' => $this->buildLabHourly($conn, $startDate, $endDate),
                ]);
            }

            if ($source === 'xray') {
                return array_merge($empty, [
                    'summary' => $this->buildXraySummary($conn, $startDate, $endDate),
                    'trend' => $this->buildXrayTrend($conn, $startDate, $endDate),
                    'items' => $this->buildXrayItems($conn, $startDate, $endDate),
                    'groups' => $this->buildXrayGroups($conn, $startDate, $endDate),
                    'departments' => $this->buildXrayDepartments($conn, $startDate, $endDate),
                    'hourly' => $this->buildXrayHourly($conn, $startDate, $endDate),
                ]);
            }

            if ($source === 'checkup') {
                $pttype = (string) ($dept['pttype'] ?? '40');

                return array_merge($empty, [
                    'summary' => $this->buildCheckupSummary($conn, $pttype, $startDate, $endDate),
                    'trend' => $this->buildCheckupTrend($conn, $pttype, $startDate, $endDate),
                    'regiments' => $this->buildCheckupRegiments($conn, $pttype, $startDate, $endDate),
                    'personnel' => $this->buildCheckupPersonnel($conn, $pttype, $startDate, $endDate),
                    'ages' => $this->buildCheckupAges($conn, $pttype, $startDate, $endDate),
                    'lab_status' => $this->buildCheckupLabStatus($conn, $pttype, $startDate, $endDate),
                    'lab_markers' => $this->buildCheckupLabMarkers($conn, $pttype, $startDate, $endDate),
                    'hourly' => $this->buildCheckupHourly($conn, $pttype, $startDate, $endDate),
                ]);
            }

            if ($source === 'opd_screen' || $this->waitMode($dept)) {
                return array_merge($empty, $this->buildVisitDashboard($conn, $code, $startDate, $endDate, $dept));
            }

            return array_merge($empty, [
                'summary' => $this->buildOvstSummary($conn, $code, $startDate, $endDate),
                'trend' => $this->buildOvstTrend($conn, $code, $startDate, $endDate),
                'diagnoses' => $this->buildOvstDiagnoses($conn, $code, $startDate, $endDate),
                'rights' => $this->buildOvstRights($conn, $code, $startDate, $endDate),
                'hourly' => $this->buildOvstHourly($conn, $code, $startDate, $endDate),
            ]);
        } catch (Throwable $e) {
            Log::warning("DepartmentData dashboard {$code} failed: ".$e->getMessage());

            $empty['connection'] = [
                'connected' => false,
                'message' => 'ดึงข้อมูลแผนกไม่สำเร็จ: '.$e->getMessage(),
            ];

            return $empty;
        }
    }

    /** @return array<string, int|float> */
    private function emptySummary(string $source = 'ovst'): array
    {
        $base = [
            'visits' => 0,
            'patients' => 0,
            'revenue' => 0.0,
            'avg_revenue' => 0.0,
            'male' => 0,
            'female' => 0,
            'unknown_sex' => 0,
        ];

        if ($source === 'ipt') {
            $base['admissions'] = 0;
            $base['discharges'] = 0;
            $base['active'] = 0;
            $base['avg_los'] = 0.0;
            $base['bed_days'] = 0;
        }

        if ($source === 'lab') {
            $base['orders'] = 0;
            $base['opd'] = 0;
            $base['ipd'] = 0;
            $base['confirmed'] = 0;
            $base['pending'] = 0;
            $base['outlab'] = 0;
            $base['items'] = 0;
            $base['abnormal'] = 0;
            $base['critical'] = 0;
            $base['avg_tat_minutes'] = 0.0;
        }

        if ($source === 'xray') {
            $base['orders'] = 0;
            $base['exams'] = 0;
            $base['opd'] = 0;
            $base['ipd'] = 0;
            $base['confirmed'] = 0;
            $base['pending'] = 0;
            $base['read_film'] = 0;
            $base['avg_tat_minutes'] = 0.0;
        }

        if ($source === 'checkup') {
            $base['with_lab'] = 0;
            $base['without_lab'] = 0;
            $base['lab_normal'] = 0;
            $base['lab_abnormal'] = 0;
            $base['lab_pending'] = 0;
            $base['regiment_count'] = 0;
        }

        if ($source === 'opd_screen') {
            $base['screened'] = 0;
            $base['screen_rate'] = 0.0;
            $base['high_bp'] = 0;
            $base['high_bp_rate'] = 0.0;
            $base['fever'] = 0;
            $base['obese'] = 0;
            $base['vitals_complete'] = 0;
            $base['vitals_complete_rate'] = 0.0;
        }

        if ($source === 'opd_screen' || $source === 'ovst') {
            $base['avg_los_minutes'] = 0.0;
            $base['within_wait_target'] = 0;
            $base['within_wait_rate'] = 0.0;
            $base['wait_target_minutes'] = 60;
            $base['waiting_now'] = 0;
            $base['waiting_over_60'] = 0;
            $base['waiting_lab'] = 0;
            $base['waiting_lab_over_60'] = 0;
            $base['waiting_pharmacy'] = 0;
            $base['waiting_pharmacy_over_60'] = 0;
            $base['avg_in_hospital_minutes'] = 0.0;
            $base['avg_lab_minutes'] = 0.0;
            $base['avg_pharmacy_minutes'] = 0.0;
            $base['wait_measured'] = 0;
            $base['wait_over_target'] = 0;
        }

        return $base;
    }

    /**
     * Resolve ward codes from config + optional name keywords.
     *
     * @return array<int, string>
     */
    private function resolveWardCodes($conn, array $dept): array
    {
        $codes = collect($dept['wards'] ?? [])
            ->map(fn ($w) => str_pad(trim((string) $w), 2, '0', STR_PAD_LEFT))
            ->filter()
            ->values();

        $keywords = $dept['ward_name_keywords'] ?? [];
        if ($keywords) {
            try {
                $query = $conn->table('ward')->select('ward', 'name');
                $query->where(function ($q) use ($keywords) {
                    foreach ($keywords as $keyword) {
                        $q->orWhere('name', 'like', '%'.$keyword.'%');
                    }
                });
                $query->where(function ($q) {
                    $q->whereNull('name')
                        ->orWhere(function ($q2) {
                            $q2->where('name', 'not like', '%COWARD%')
                                ->where('name', 'not like', '%SEMI%')
                                ->where('name', 'not like', '%ICU%');
                        });
                });

                foreach ($query->get() as $row) {
                    $codes->push(str_pad(trim((string) $row->ward), 2, '0', STR_PAD_LEFT));
                }
            } catch (Throwable) {
                // ignore
            }
        }

        return $codes->unique()->values()->all();
    }

    /**
     * @param  array<int, string>  $wards
     * @return array<int, array{code: string, name: string}>
     */
    private function wardLabels($conn, array $wards): array
    {
        if (! $wards) {
            return [];
        }

        try {
            $rows = $conn->table('ward')
                ->whereIn('ward', $wards)
                ->select('ward', 'name')
                ->orderBy('ward')
                ->get();

            return $rows->map(fn ($r) => [
                'code' => (string) $r->ward,
                'name' => (string) ($r->name ?: $r->ward),
            ])->values()->all();
        } catch (Throwable) {
            return collect($wards)->map(fn ($w) => ['code' => $w, 'name' => $w])->all();
        }
    }

    private function isDischargedSql(string $alias = 'i'): string
    {
        return "({$alias}.dchdate IS NOT NULL AND {$alias}.dchdate <> '' AND {$alias}.dchdate <> '0000-00-00')";
    }

    private function isActiveSql(string $alias = 'i'): string
    {
        return "({$alias}.dchdate IS NULL OR {$alias}.dchdate = '' OR {$alias}.dchdate = '0000-00-00')";
    }

    /** @param  array<int, string>  $wards */
    private function iptBase($conn, array $wards)
    {
        return $conn->table('ipt as i')->whereIn('i.ward', $wards);
    }

    /** @param  array<int, string>  $wards */
    private function buildIpdSummary($conn, array $wards, string $start, string $end): array
    {
        if (! $wards) {
            return $this->emptySummary('ipt');
        }

        $admissions = (int) $this->iptBase($conn, $wards)
            ->whereBetween('i.regdate', [$start, $end])
            ->distinct('i.an')
            ->count('i.an');

        $patients = (int) $this->iptBase($conn, $wards)
            ->whereBetween('i.regdate', [$start, $end])
            ->distinct('i.hn')
            ->count('i.hn');

        $discharges = (int) $this->iptBase($conn, $wards)
            ->whereRaw($this->isDischargedSql('i'))
            ->whereBetween('i.dchdate', [$start, $end])
            ->distinct('i.an')
            ->count('i.an');

        $active = (int) $this->iptBase($conn, $wards)
            ->whereRaw($this->isActiveSql('i'))
            ->distinct('i.an')
            ->count('i.an');

        $avgLos = 0.0;
        try {
            $avgLos = (float) $this->iptBase($conn, $wards)
                ->whereRaw($this->isDischargedSql('i'))
                ->whereBetween('i.dchdate', [$start, $end])
                ->selectRaw('AVG(DATEDIFF(i.dchdate, i.regdate) + 1) as avg_los')
                ->value('avg_los');
        } catch (Throwable) {
            $avgLos = 0.0;
        }

        $bedDays = $this->calculateBedDays($conn, $wards, $start, $end);

        $revenue = 0.0;
        try {
            $revenue = (float) $conn->table('opitemrece as oi')
                ->join('ipt as i', 'i.an', '=', 'oi.an')
                ->whereIn('i.ward', $wards)
                ->whereBetween('i.regdate', [$start, $end])
                ->sum('oi.sum_price');
        } catch (Throwable) {
            try {
                $revenue = (float) $conn->table('opitemrece as oi')
                    ->join('ipt as i', 'i.an', '=', 'oi.an')
                    ->whereIn('i.ward', $wards)
                    ->whereBetween('oi.vstdate', [$start, $end])
                    ->sum('oi.sum_price');
            } catch (Throwable) {
                $revenue = 0.0;
            }
        }

        $sex = ['male' => 0, 'female' => 0, 'unknown_sex' => 0];
        try {
            $sexRows = $this->iptBase($conn, $wards)
                ->leftJoin('patient as p', 'p.hn', '=', 'i.hn')
                ->whereBetween('i.regdate', [$start, $end])
                ->selectRaw("COALESCE(NULLIF(p.sex, ''), 'U') as sex")
                ->selectRaw('COUNT(DISTINCT i.an) as total')
                ->groupByRaw("COALESCE(NULLIF(p.sex, ''), 'U')")
                ->get();

            foreach ($sexRows as $row) {
                $key = match ((string) $row->sex) {
                    '1', 'M', 'm' => 'male',
                    '2', 'F', 'f' => 'female',
                    default => 'unknown_sex',
                };
                $sex[$key] += (int) $row->total;
            }
        } catch (Throwable) {
            // ignore
        }

        return [
            'visits' => $admissions,
            'admissions' => $admissions,
            'patients' => $patients,
            'discharges' => $discharges,
            'active' => $active,
            'avg_los' => round($avgLos ?: 0, 2),
            'bed_days' => $bedDays,
            'revenue' => round($revenue, 2),
            'avg_revenue' => $admissions > 0 ? round($revenue / $admissions, 2) : 0.0,
            'male' => $sex['male'],
            'female' => $sex['female'],
            'unknown_sex' => $sex['unknown_sex'],
        ];
    }

    /** @param  array<int, string>  $wards */
    private function calculateBedDays($conn, array $wards, string $start, string $end): int
    {
        try {
            $rows = $this->iptBase($conn, $wards)
                ->select('i.regdate', 'i.dchdate')
                ->where('i.regdate', '<=', $end)
                ->where(function ($q) use ($start) {
                    $q->whereNull('i.dchdate')
                        ->orWhere('i.dchdate', '')
                        ->orWhere('i.dchdate', '0000-00-00')
                        ->orWhere('i.dchdate', '>=', $start);
                })
                ->get();
        } catch (Throwable) {
            return 0;
        }

        $total = 0;
        foreach ($rows as $row) {
            $admit = strtotime((string) $row->regdate);
            $dch = (string) ($row->dchdate ?? '');
            $discharge = ($dch === '' || $dch === '0000-00-00')
                ? strtotime($end)
                : strtotime($dch);

            $from = max($admit ?: 0, strtotime($start) ?: 0);
            $to = min($discharge ?: 0, strtotime($end) ?: 0);
            if ($from && $to && $to >= $from) {
                $total += (int) floor(($to - $from) / 86400) + 1;
            }
        }

        return $total;
    }

    /** @param  array<int, string>  $wards */
    private function buildIpdTrend($conn, array $wards, string $start, string $end): array
    {
        if (! $wards) {
            return [];
        }

        $rows = $this->iptBase($conn, $wards)
            ->whereBetween('i.regdate', [$start, $end])
            ->selectRaw('i.regdate as d')
            ->selectRaw('COUNT(DISTINCT i.an) as visits')
            ->selectRaw('COUNT(DISTINCT i.hn) as patients')
            ->groupBy('i.regdate')
            ->orderBy('i.regdate')
            ->get();

        return $rows->map(fn ($row) => [
            'date' => (string) $row->d,
            'label' => $this->thaiShortDate((string) $row->d),
            'visits' => (int) $row->visits,
            'patients' => (int) $row->patients,
        ])->values()->all();
    }

    /** @param  array<int, string>  $wards */
    private function buildIpdDiagnoses($conn, array $wards, string $start, string $end): array
    {
        if (! $wards) {
            return [];
        }

        try {
            $rows = $conn->table('iptdiag as d')
                ->join('ipt as i', 'i.an', '=', 'd.an')
                ->leftJoin('icd101 as icd', 'icd.code', '=', 'd.icd10')
                ->whereIn('i.ward', $wards)
                ->whereBetween('i.regdate', [$start, $end])
                ->where('d.diagtype', 1)
                ->selectRaw('d.icd10')
                ->selectRaw("COALESCE(NULLIF(icd.tname, ''), NULLIF(icd.name, ''), d.icd10, '-') as name")
                ->selectRaw('COUNT(*) as total')
                ->groupBy('d.icd10', 'icd.tname', 'icd.name')
                ->orderByDesc('total')
                ->limit(15)
                ->get();
        } catch (Throwable) {
            try {
                $rows = $conn->table('iptdiag as d')
                    ->join('ipt as i', 'i.an', '=', 'd.an')
                    ->whereIn('i.ward', $wards)
                    ->whereBetween('i.regdate', [$start, $end])
                    ->where('d.diagtype', 1)
                    ->selectRaw('d.icd10')
                    ->selectRaw('d.icd10 as name')
                    ->selectRaw('COUNT(*) as total')
                    ->groupBy('d.icd10')
                    ->orderByDesc('total')
                    ->limit(15)
                    ->get();
            } catch (Throwable) {
                return [];
            }
        }

        return $rows->map(fn ($row) => [
            'icd10' => (string) ($row->icd10 ?? '-'),
            'name' => (string) ($row->name ?? '-'),
            'total' => (int) $row->total,
        ])->values()->all();
    }

    /** @param  array<int, string>  $wards */
    private function buildIpdRights($conn, array $wards, string $start, string $end): array
    {
        if (! $wards) {
            return [];
        }

        try {
            $visitRows = $this->iptBase($conn, $wards)
                ->leftJoin('pttype as pt', 'pt.pttype', '=', 'i.pttype')
                ->whereBetween('i.regdate', [$start, $end])
                ->selectRaw("COALESCE(NULLIF(i.pttype, ''), '-') as code")
                ->selectRaw("COALESCE(pt.name, NULLIF(i.pttype, ''), 'ไม่ระบุสิทธิ') as name")
                ->selectRaw('COUNT(DISTINCT i.an) as visits')
                ->groupByRaw("COALESCE(NULLIF(i.pttype, ''), '-')")
                ->groupByRaw("COALESCE(pt.name, NULLIF(i.pttype, ''), 'ไม่ระบุสิทธิ')")
                ->orderByDesc('visits')
                ->limit(12)
                ->get()
                ->keyBy(fn ($r) => (string) $r->code);
        } catch (Throwable) {
            return [];
        }

        $revenueByRight = [];
        try {
            $revRows = $conn->table('opitemrece as oi')
                ->join('ipt as i', 'i.an', '=', 'oi.an')
                ->whereIn('i.ward', $wards)
                ->whereBetween('i.regdate', [$start, $end])
                ->selectRaw("COALESCE(NULLIF(i.pttype, ''), '-') as code")
                ->selectRaw('COALESCE(SUM(oi.sum_price), 0) as revenue')
                ->groupByRaw("COALESCE(NULLIF(i.pttype, ''), '-')")
                ->get();

            foreach ($revRows as $row) {
                $revenueByRight[(string) $row->code] = (float) $row->revenue;
            }
        } catch (Throwable) {
            // ignore
        }

        return $visitRows->map(fn ($row) => [
            'code' => (string) $row->code,
            'name' => (string) $row->name,
            'visits' => (int) $row->visits,
            'revenue' => round($revenueByRight[(string) $row->code] ?? 0, 2),
        ])->values()->all();
    }

    /** @param  array<int, string>  $wards */
    private function buildIpdHourly($conn, array $wards, string $start, string $end): array
    {
        if (! $wards) {
            return [];
        }

        try {
            $columns = $conn->getSchemaBuilder()->getColumnListing('ipt');
        } catch (Throwable) {
            return [];
        }

        if (! in_array('regtime', $columns, true)) {
            return [];
        }

        try {
            $rows = $this->iptBase($conn, $wards)
                ->whereBetween('i.regdate', [$start, $end])
                ->whereNotNull('i.regtime')
                ->where('i.regtime', '<>', '')
                ->selectRaw("LPAD(SUBSTRING(REPLACE(REPLACE(i.regtime, ':', ''), '.', ''), 1, 2), 2, '0') as hour")
                ->selectRaw('COUNT(DISTINCT i.an) as visits')
                ->groupByRaw("LPAD(SUBSTRING(REPLACE(REPLACE(i.regtime, ':', ''), '.', ''), 1, 2), 2, '0')")
                ->orderBy('hour')
                ->get();
        } catch (Throwable) {
            return [];
        }

        $map = [];
        foreach ($rows as $row) {
            $h = (int) $row->hour;
            if ($h >= 0 && $h <= 23) {
                $map[$h] = (int) $row->visits;
            }
        }

        $hourly = [];
        for ($h = 0; $h < 24; $h++) {
            $hourly[] = [
                'hour' => sprintf('%02d:00', $h),
                'visits' => $map[$h] ?? 0,
            ];
        }

        return $hourly;
    }

    /** @param  array<int, string>  $wards */
    private function buildIpdWardBreakdown($conn, array $wards, string $start, string $end): array
    {
        if (! $wards) {
            return [];
        }

        try {
            $rows = $this->iptBase($conn, $wards)
                ->leftJoin('ward as w', 'w.ward', '=', 'i.ward')
                ->whereBetween('i.regdate', [$start, $end])
                ->selectRaw('i.ward as code')
                ->selectRaw("COALESCE(w.name, NULLIF(i.ward, ''), 'ไม่ระบุหอ') as name")
                ->selectRaw('COUNT(DISTINCT i.an) as admissions')
                ->selectRaw('COUNT(DISTINCT i.hn) as patients')
                ->groupBy('i.ward', 'w.name')
                ->orderByDesc('admissions')
                ->get();
        } catch (Throwable) {
            return [];
        }

        $activeByWard = [];
        try {
            $activeRows = $this->iptBase($conn, $wards)
                ->whereRaw($this->isActiveSql('i'))
                ->selectRaw('i.ward as code')
                ->selectRaw('COUNT(DISTINCT i.an) as active')
                ->groupBy('i.ward')
                ->get();
            foreach ($activeRows as $row) {
                $activeByWard[(string) $row->code] = (int) $row->active;
            }
        } catch (Throwable) {
            // ignore
        }

        return $rows->map(fn ($row) => [
            'code' => (string) $row->code,
            'name' => (string) $row->name,
            'admissions' => (int) $row->admissions,
            'patients' => (int) $row->patients,
            'active' => $activeByWard[(string) $row->code] ?? 0,
        ])->values()->all();
    }

    // ─── OPD (ovst) builders ───────────────────────────────────────────

    private function buildOvstSummary($conn, string $code, string $start, string $end): array
    {
        $base = $conn->table('ovst as o')
            ->where('o.main_dep', $code)
            ->whereBetween('o.vstdate', [$start, $end]);

        $visits = (int) (clone $base)->distinct('o.vn')->count('o.vn');
        $patients = (int) (clone $base)->distinct('o.hn')->count('o.hn');

        $revenue = 0.0;
        try {
            $revenue = (float) $conn->table('opitemrece as oi')
                ->join('ovst as o', 'o.vn', '=', 'oi.vn')
                ->where('o.main_dep', $code)
                ->whereBetween('o.vstdate', [$start, $end])
                ->sum('oi.sum_price');
        } catch (Throwable) {
            $revenue = 0.0;
        }

        $sex = ['male' => 0, 'female' => 0, 'unknown_sex' => 0];
        try {
            $sexRows = $conn->table('ovst as o')
                ->leftJoin('patient as p', 'p.hn', '=', 'o.hn')
                ->where('o.main_dep', $code)
                ->whereBetween('o.vstdate', [$start, $end])
                ->selectRaw("COALESCE(NULLIF(p.sex, ''), 'U') as sex")
                ->selectRaw('COUNT(DISTINCT o.vn) as total')
                ->groupByRaw("COALESCE(NULLIF(p.sex, ''), 'U')")
                ->get();

            foreach ($sexRows as $row) {
                $key = match ((string) $row->sex) {
                    '1', 'M', 'm' => 'male',
                    '2', 'F', 'f' => 'female',
                    default => 'unknown_sex',
                };
                $sex[$key] += (int) $row->total;
            }
        } catch (Throwable) {
            // ignore
        }

        return [
            'visits' => $visits,
            'patients' => $patients,
            'revenue' => round($revenue, 2),
            'avg_revenue' => $visits > 0 ? round($revenue / $visits, 2) : 0.0,
            'male' => $sex['male'],
            'female' => $sex['female'],
            'unknown_sex' => $sex['unknown_sex'],
        ];
    }

    private function buildOvstTrend($conn, string $code, string $start, string $end): array
    {
        $rows = $conn->table('ovst as o')
            ->where('o.main_dep', $code)
            ->whereBetween('o.vstdate', [$start, $end])
            ->selectRaw('o.vstdate as d')
            ->selectRaw('COUNT(DISTINCT o.vn) as visits')
            ->selectRaw('COUNT(DISTINCT o.hn) as patients')
            ->groupBy('o.vstdate')
            ->orderBy('o.vstdate')
            ->get();

        return $rows->map(fn ($row) => [
            'date' => (string) $row->d,
            'label' => $this->thaiShortDate((string) $row->d),
            'visits' => (int) $row->visits,
            'patients' => (int) $row->patients,
        ])->values()->all();
    }

    private function buildOvstDiagnoses($conn, string $code, string $start, string $end): array
    {
        try {
            $rows = $conn->table('ovstdiag as d')
                ->join('ovst as o', 'o.vn', '=', 'd.vn')
                ->leftJoin('icd101 as icd', 'icd.code', '=', 'd.icd10')
                ->where('o.main_dep', $code)
                ->whereBetween('o.vstdate', [$start, $end])
                ->where('d.diagtype', 1)
                ->selectRaw('d.icd10')
                ->selectRaw("COALESCE(NULLIF(icd.tname, ''), NULLIF(icd.name, ''), d.icd10, '-') as name")
                ->selectRaw('COUNT(*) as total')
                ->groupBy('d.icd10', 'icd.tname', 'icd.name')
                ->orderByDesc('total')
                ->limit(15)
                ->get();
        } catch (Throwable) {
            try {
                $rows = $conn->table('ovstdiag as d')
                    ->join('ovst as o', 'o.vn', '=', 'd.vn')
                    ->where('o.main_dep', $code)
                    ->whereBetween('o.vstdate', [$start, $end])
                    ->where('d.diagtype', 1)
                    ->selectRaw('d.icd10')
                    ->selectRaw('d.icd10 as name')
                    ->selectRaw('COUNT(*) as total')
                    ->groupBy('d.icd10')
                    ->orderByDesc('total')
                    ->limit(15)
                    ->get();
            } catch (Throwable) {
                return [];
            }
        }

        return $rows->map(fn ($row) => [
            'icd10' => (string) ($row->icd10 ?? '-'),
            'name' => (string) ($row->name ?? '-'),
            'total' => (int) $row->total,
        ])->values()->all();
    }

    private function buildOvstRights($conn, string $code, string $start, string $end): array
    {
        try {
            $visitRows = $conn->table('ovst as o')
                ->leftJoin('pttype as pt', 'pt.pttype', '=', 'o.pttype')
                ->where('o.main_dep', $code)
                ->whereBetween('o.vstdate', [$start, $end])
                ->selectRaw("COALESCE(NULLIF(o.pttype, ''), '-') as code")
                ->selectRaw("COALESCE(pt.name, NULLIF(o.pttype, ''), 'ไม่ระบุสิทธิ') as name")
                ->selectRaw('COUNT(DISTINCT o.vn) as visits')
                ->groupByRaw("COALESCE(NULLIF(o.pttype, ''), '-')")
                ->groupByRaw("COALESCE(pt.name, NULLIF(o.pttype, ''), 'ไม่ระบุสิทธิ')")
                ->orderByDesc('visits')
                ->limit(12)
                ->get()
                ->keyBy(fn ($r) => (string) $r->code);
        } catch (Throwable) {
            return [];
        }

        $revenueByRight = [];
        try {
            $revRows = $conn->table('opitemrece as oi')
                ->join('ovst as o', 'o.vn', '=', 'oi.vn')
                ->where('o.main_dep', $code)
                ->whereBetween('o.vstdate', [$start, $end])
                ->selectRaw("COALESCE(NULLIF(o.pttype, ''), '-') as code")
                ->selectRaw('COALESCE(SUM(oi.sum_price), 0) as revenue')
                ->groupByRaw("COALESCE(NULLIF(o.pttype, ''), '-')")
                ->get();

            foreach ($revRows as $row) {
                $revenueByRight[(string) $row->code] = (float) $row->revenue;
            }
        } catch (Throwable) {
            // ignore
        }

        return $visitRows->map(fn ($row) => [
            'code' => (string) $row->code,
            'name' => (string) $row->name,
            'visits' => (int) $row->visits,
            'revenue' => round($revenueByRight[(string) $row->code] ?? 0, 2),
        ])->values()->all();
    }

    private function buildOvstHourly($conn, string $code, string $start, string $end): array
    {
        try {
            $columns = $conn->getSchemaBuilder()->getColumnListing('ovst');
        } catch (Throwable) {
            return [];
        }

        $timeCol = null;
        foreach (['vsttime', 'o_time', 'r_time'] as $candidate) {
            if (in_array($candidate, $columns, true)) {
                $timeCol = $candidate;
                break;
            }
        }

        if (! $timeCol) {
            return [];
        }

        try {
            $rows = $conn->table('ovst as o')
                ->where('o.main_dep', $code)
                ->whereBetween('o.vstdate', [$start, $end])
                ->whereNotNull("o.{$timeCol}")
                ->where("o.{$timeCol}", '<>', '')
                ->selectRaw("LPAD(SUBSTRING(REPLACE(REPLACE(o.{$timeCol}, ':', ''), '.', ''), 1, 2), 2, '0') as hour")
                ->selectRaw('COUNT(DISTINCT o.vn) as visits')
                ->groupByRaw("LPAD(SUBSTRING(REPLACE(REPLACE(o.{$timeCol}, ':', ''), '.', ''), 1, 2), 2, '0')")
                ->orderBy('hour')
                ->get();
        } catch (Throwable) {
            return [];
        }

        $map = [];
        foreach ($rows as $row) {
            $h = (int) $row->hour;
            if ($h >= 0 && $h <= 23) {
                $map[$h] = (int) $row->visits;
            }
        }

        $hourly = [];
        for ($h = 0; $h < 24; $h++) {
            $hourly[] = [
                'hour' => sprintf('%02d:00', $h),
                'visits' => $map[$h] ?? 0,
            ];
        }

        return $hourly;
    }

    private function thaiShortDate(string $date): string
    {
        try {
            $c = Carbon::parse($date);

            return $c->format('d/m/').($c->year + 543);
        } catch (Throwable) {
            return $date;
        }
    }

    private function hosxpTableExists($conn, string $table): bool
    {
        try {
            return (bool) $conn->selectOne(
                'SELECT 1 AS ok FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1',
                [$table]
            );
        } catch (Throwable) {
            return false;
        }
    }

    private function hosxpColumnExists($conn, string $table, string $column): bool
    {
        try {
            return (bool) $conn->selectOne(
                'SELECT 1 AS ok FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1',
                [$table, $column]
            );
        } catch (Throwable) {
            return false;
        }
    }

    /** @return array<int, array{hour: string, visits: int}> */
    private function buildHourlyFromTime($query, string $timeColumn): array
    {
        try {
            $rows = (clone $query)
                ->whereNotNull($timeColumn)
                ->where($timeColumn, '<>', '')
                ->selectRaw("LPAD(SUBSTRING(REPLACE(REPLACE({$timeColumn}, ':', ''), '.', ''), 1, 2), 2, '0') as hour")
                ->selectRaw('COUNT(*) as visits')
                ->groupByRaw("LPAD(SUBSTRING(REPLACE(REPLACE({$timeColumn}, ':', ''), '.', ''), 1, 2), 2, '0')")
                ->orderBy('hour')
                ->get();
        } catch (Throwable) {
            return [];
        }

        $map = [];
        foreach ($rows as $row) {
            $h = (int) $row->hour;
            if ($h >= 0 && $h <= 23) {
                $map[$h] = (int) $row->visits;
            }
        }

        $hourly = [];
        for ($h = 0; $h < 24; $h++) {
            $hourly[] = [
                'hour' => sprintf('%02d:00', $h),
                'visits' => $map[$h] ?? 0,
            ];
        }

        return $hourly;
    }

    private function buildLabSummary($conn, string $start, string $end): array
    {
        $summary = $this->emptySummary('lab');

        try {
            $row = $conn->table('lab_head')
                ->whereBetween('order_date', [$start, $end])
                ->selectRaw('COUNT(*) as orders')
                ->selectRaw('COUNT(DISTINCT hn) as patients')
                ->selectRaw('COUNT(DISTINCT vn) as visits')
                ->selectRaw("SUM(CASE WHEN UPPER(COALESCE(department,'')) = 'OPD' THEN 1 ELSE 0 END) as opd")
                ->selectRaw("SUM(CASE WHEN UPPER(COALESCE(department,'')) = 'IPD' THEN 1 ELSE 0 END) as ipd")
                ->selectRaw("SUM(CASE WHEN UPPER(COALESCE(confirm_report,'')) = 'Y' THEN 1 ELSE 0 END) as confirmed")
                ->selectRaw("SUM(CASE WHEN UPPER(COALESCE(is_outlab,'')) = 'Y' THEN 1 ELSE 0 END) as outlab")
                ->first();

            $orders = (int) ($row->orders ?? 0);
            $confirmed = (int) ($row->confirmed ?? 0);

            $summary['orders'] = $orders;
            $summary['visits'] = $orders;
            $summary['patients'] = (int) ($row->patients ?? 0);
            $summary['opd'] = (int) ($row->opd ?? 0);
            $summary['ipd'] = (int) ($row->ipd ?? 0);
            $summary['confirmed'] = $confirmed;
            $summary['pending'] = max(0, $orders - $confirmed);
            $summary['outlab'] = (int) ($row->outlab ?? 0);
        } catch (Throwable $e) {
            Log::warning('DepartmentData lab summary failed: '.$e->getMessage());
        }

        try {
            $flags = $conn->table('lab_order as lo')
                ->join('lab_head as lh', 'lh.lab_order_number', '=', 'lo.lab_order_number')
                ->whereBetween('lh.order_date', [$start, $end])
                ->selectRaw('COUNT(*) as items')
                ->selectRaw("SUM(CASE WHEN UPPER(COALESCE(lo.abnormal_result,'')) IN ('Y','1') THEN 1 ELSE 0 END) as abnormal")
                ->selectRaw("SUM(CASE WHEN UPPER(COALESCE(lo.critical_result,'')) IN ('Y','1') THEN 1 ELSE 0 END) as critical")
                ->first();

            $summary['items'] = (int) ($flags->items ?? 0);
            $summary['abnormal'] = (int) ($flags->abnormal ?? 0);
            $summary['critical'] = (int) ($flags->critical ?? 0);
        } catch (Throwable) {
            // ignore
        }

        try {
            $summary['revenue'] = round((float) $conn->table('lab_order_service as los')
                ->join('lab_head as lh', 'lh.lab_order_number', '=', 'los.lab_order_number')
                ->whereBetween('lh.order_date', [$start, $end])
                ->sum('los.price'), 2);
            $summary['avg_revenue'] = ($summary['orders'] ?? 0) > 0
                ? round($summary['revenue'] / $summary['orders'], 2)
                : 0.0;
        } catch (Throwable) {
            // ignore
        }

        try {
            $tat = $conn->selectOne(
                "SELECT AVG(TIMESTAMPDIFF(MINUTE,
                    CONCAT(order_date, ' ', COALESCE(NULLIF(order_time, ''), '00:00:00')),
                    CONCAT(report_date, ' ', COALESCE(NULLIF(report_time, ''), '00:00:00'))
                )) AS avg_tat
                FROM lab_head
                WHERE order_date BETWEEN ? AND ?
                  AND report_date IS NOT NULL
                  AND report_date <> '0000-00-00'",
                [$start, $end]
            );
            $summary['avg_tat_minutes'] = round((float) ($tat->avg_tat ?? 0), 1);
        } catch (Throwable) {
            // ignore
        }

        try {
            $sexRows = $conn->table('lab_head as lh')
                ->leftJoin('patient as p', 'p.hn', '=', 'lh.hn')
                ->whereBetween('lh.order_date', [$start, $end])
                ->selectRaw("COALESCE(NULLIF(p.sex, ''), 'U') as sex")
                ->selectRaw('COUNT(DISTINCT lh.lab_order_number) as total')
                ->groupByRaw("COALESCE(NULLIF(p.sex, ''), 'U')")
                ->get();

            foreach ($sexRows as $row) {
                $key = match ((string) $row->sex) {
                    '1', 'M', 'm' => 'male',
                    '2', 'F', 'f' => 'female',
                    default => 'unknown_sex',
                };
                $summary[$key] += (int) $row->total;
            }
        } catch (Throwable) {
            // ignore
        }

        return $summary;
    }

    private function buildLabTrend($conn, string $start, string $end): array
    {
        try {
            $rows = $conn->table('lab_head')
                ->whereBetween('order_date', [$start, $end])
                ->selectRaw('order_date as d')
                ->selectRaw('COUNT(*) as visits')
                ->selectRaw('COUNT(DISTINCT hn) as patients')
                ->groupBy('order_date')
                ->orderBy('order_date')
                ->get();
        } catch (Throwable) {
            return [];
        }

        return $rows->map(fn ($row) => [
            'date' => (string) $row->d,
            'label' => $this->thaiShortDate((string) $row->d),
            'visits' => (int) $row->visits,
            'patients' => (int) $row->patients,
        ])->values()->all();
    }

    private function buildLabForms($conn, string $start, string $end): array
    {
        try {
            return $conn->table('lab_head')
                ->whereBetween('order_date', [$start, $end])
                ->selectRaw("COALESCE(NULLIF(form_name, ''), 'ไม่ระบุ') as name")
                ->selectRaw('COUNT(*) as total')
                ->groupByRaw("COALESCE(NULLIF(form_name, ''), 'ไม่ระบุ')")
                ->orderByDesc('total')
                ->limit(15)
                ->get()
                ->map(fn ($row) => [
                    'code' => (string) $row->name,
                    'name' => (string) $row->name,
                    'total' => (int) $row->total,
                ])->values()->all();
        } catch (Throwable) {
            return [];
        }
    }

    private function buildLabItems($conn, string $start, string $end): array
    {
        try {
            return $conn->table('lab_order_service as los')
                ->join('lab_head as lh', 'lh.lab_order_number', '=', 'los.lab_order_number')
                ->whereBetween('lh.order_date', [$start, $end])
                ->selectRaw("COALESCE(NULLIF(los.lab_code, ''), '-') as code")
                ->selectRaw("COALESCE(NULLIF(los.lab_name, ''), NULLIF(los.lab_code, ''), '-') as name")
                ->selectRaw('COUNT(*) as total')
                ->selectRaw('COALESCE(SUM(los.price), 0) as revenue')
                ->groupByRaw("COALESCE(NULLIF(los.lab_code, ''), '-'), COALESCE(NULLIF(los.lab_name, ''), NULLIF(los.lab_code, ''), '-')")
                ->orderByDesc('total')
                ->limit(15)
                ->get()
                ->map(fn ($row) => [
                    'code' => (string) $row->code,
                    'name' => (string) $row->name,
                    'total' => (int) $row->total,
                    'revenue' => round((float) $row->revenue, 2),
                ])->values()->all();
        } catch (Throwable) {
            return [];
        }
    }

    private function buildLabGroups($conn, string $start, string $end): array
    {
        try {
            return $conn->table('lab_order as lo')
                ->join('lab_head as lh', 'lh.lab_order_number', '=', 'lo.lab_order_number')
                ->leftJoin('lab_items as li', 'li.lab_items_code', '=', 'lo.lab_items_code')
                ->leftJoin('lab_items_group as g', 'g.lab_items_group_code', '=', 'li.lab_items_group')
                ->whereBetween('lh.order_date', [$start, $end])
                ->selectRaw("COALESCE(NULLIF(g.lab_items_group_name, ''), NULLIF(li.lab_items_group, ''), 'ไม่ระบุ') as name")
                ->selectRaw('COUNT(*) as total')
                ->groupByRaw("COALESCE(NULLIF(g.lab_items_group_name, ''), NULLIF(li.lab_items_group, ''), 'ไม่ระบุ')")
                ->orderByDesc('total')
                ->limit(12)
                ->get()
                ->map(fn ($row) => [
                    'code' => (string) $row->name,
                    'name' => (string) $row->name,
                    'total' => (int) $row->total,
                ])->values()->all();
        } catch (Throwable) {
            return [];
        }
    }

    private function buildLabDepartments($conn, string $start, string $end): array
    {
        try {
            return $conn->table('lab_head as lh')
                ->leftJoin('kskdepartment as d', 'd.depcode', '=', 'lh.order_department')
                ->whereBetween('lh.order_date', [$start, $end])
                ->selectRaw("COALESCE(NULLIF(lh.order_department, ''), '-') as code")
                ->selectRaw("COALESCE(NULLIF(d.department, ''), NULLIF(lh.order_department, ''), 'ไม่ระบุ') as name")
                ->selectRaw('COUNT(*) as total')
                ->groupByRaw("COALESCE(NULLIF(lh.order_department, ''), '-'), COALESCE(NULLIF(d.department, ''), NULLIF(lh.order_department, ''), 'ไม่ระบุ')")
                ->orderByDesc('total')
                ->limit(15)
                ->get()
                ->map(fn ($row) => [
                    'code' => (string) $row->code,
                    'name' => (string) $row->name,
                    'total' => (int) $row->total,
                ])->values()->all();
        } catch (Throwable) {
            return [];
        }
    }

    private function buildLabHourly($conn, string $start, string $end): array
    {
        return $this->buildHourlyFromTime(
            $conn->table('lab_head')->whereBetween('order_date', [$start, $end]),
            'order_time'
        );
    }

    private function buildXraySummary($conn, string $start, string $end): array
    {
        $summary = $this->emptySummary('xray');
        $hasReport = $this->hosxpTableExists($conn, 'xray_report');

        try {
            $head = $conn->table('xray_head')
                ->whereBetween('order_date', [$start, $end])
                ->selectRaw('COUNT(*) as orders')
                ->selectRaw('COUNT(DISTINCT hn) as patients')
                ->selectRaw('COUNT(DISTINCT vn) as visits')
                ->selectRaw("SUM(CASE WHEN UPPER(COALESCE(department,'')) = 'OPD' THEN 1 ELSE 0 END) as opd")
                ->selectRaw("SUM(CASE WHEN UPPER(COALESCE(department,'')) = 'IPD' THEN 1 ELSE 0 END) as ipd")
                ->selectRaw("SUM(CASE WHEN UPPER(COALESCE(confirm_report,'')) = 'Y' THEN 1 ELSE 0 END) as confirmed")
                ->selectRaw('COALESCE(SUM(total_price), 0) as revenue')
                ->first();

            $orders = (int) ($head->orders ?? 0);
            $summary['orders'] = $orders;
            $summary['visits'] = $orders;
            $summary['patients'] = (int) ($head->patients ?? 0);
            $summary['opd'] = (int) ($head->opd ?? 0);
            $summary['ipd'] = (int) ($head->ipd ?? 0);
            $summary['confirmed'] = (int) ($head->confirmed ?? 0);
            $summary['pending'] = max(0, $orders - $summary['confirmed']);
            $summary['revenue'] = round((float) ($head->revenue ?? 0), 2);
            $summary['avg_revenue'] = $orders > 0 ? round($summary['revenue'] / $orders, 2) : 0.0;
        } catch (Throwable $e) {
            Log::warning('DepartmentData xray summary head failed: '.$e->getMessage());
        }

        if ($hasReport) {
            try {
                $report = $conn->table('xray_report')
                    ->whereBetween('request_date', [$start, $end])
                    ->selectRaw('COUNT(*) as exams')
                    ->selectRaw('COUNT(DISTINCT hn) as patients')
                    ->selectRaw("SUM(CASE WHEN UPPER(COALESCE(confirm,'')) = 'Y' THEN 1 ELSE 0 END) as confirmed")
                    ->selectRaw("SUM(CASE WHEN UPPER(COALESCE(confirm_read_film,'')) = 'Y' THEN 1 ELSE 0 END) as read_film")
                    ->first();

                $exams = (int) ($report->exams ?? 0);
                $summary['exams'] = $exams;
                $summary['visits'] = $exams;
                if (($report->patients ?? 0) > 0) {
                    $summary['patients'] = (int) $report->patients;
                }
                $summary['confirmed'] = (int) ($report->confirmed ?? $summary['confirmed']);
                $summary['read_film'] = (int) ($report->read_film ?? 0);
                $summary['pending'] = max(0, $exams - $summary['confirmed']);
            } catch (Throwable) {
                // ignore
            }

            try {
                $tat = $conn->selectOne(
                    "SELECT AVG(TIMESTAMPDIFF(MINUTE,
                        CONCAT(request_date, ' ', COALESCE(NULLIF(request_time, ''), '00:00:00')),
                        CONCAT(
                            COALESCE(NULLIF(examined_date, ''), NULLIF(report_date, ''), request_date),
                            ' ',
                            COALESCE(NULLIF(examined_time, ''), NULLIF(report_time, ''), '00:00:00')
                        )
                    )) AS avg_tat
                    FROM xray_report
                    WHERE request_date BETWEEN ? AND ?
                      AND request_date IS NOT NULL
                      AND request_date <> '0000-00-00'",
                    [$start, $end]
                );
                $summary['avg_tat_minutes'] = round((float) ($tat->avg_tat ?? 0), 1);
            } catch (Throwable) {
                // ignore
            }
        }

        try {
            $sexRows = $conn->table('xray_head as xh')
                ->leftJoin('patient as p', 'p.hn', '=', 'xh.hn')
                ->whereBetween('xh.order_date', [$start, $end])
                ->selectRaw("COALESCE(NULLIF(p.sex, ''), 'U') as sex")
                ->selectRaw('COUNT(*) as total')
                ->groupByRaw("COALESCE(NULLIF(p.sex, ''), 'U')")
                ->get();

            foreach ($sexRows as $row) {
                $key = match ((string) $row->sex) {
                    '1', 'M', 'm' => 'male',
                    '2', 'F', 'f' => 'female',
                    default => 'unknown_sex',
                };
                $summary[$key] += (int) $row->total;
            }
        } catch (Throwable) {
            // ignore
        }

        return $summary;
    }

    private function buildXrayTrend($conn, string $start, string $end): array
    {
        try {
            if ($this->hosxpTableExists($conn, 'xray_report') && $this->hosxpColumnExists($conn, 'xray_report', 'request_date')) {
                $rows = $conn->table('xray_report')
                    ->whereBetween('request_date', [$start, $end])
                    ->selectRaw('request_date as d')
                    ->selectRaw('COUNT(*) as visits')
                    ->selectRaw('COUNT(DISTINCT hn) as patients')
                    ->groupBy('request_date')
                    ->orderBy('request_date')
                    ->get();
            } else {
                $rows = $conn->table('xray_head')
                    ->whereBetween('order_date', [$start, $end])
                    ->selectRaw('order_date as d')
                    ->selectRaw('COUNT(*) as visits')
                    ->selectRaw('COUNT(DISTINCT hn) as patients')
                    ->groupBy('order_date')
                    ->orderBy('order_date')
                    ->get();
            }
        } catch (Throwable) {
            return [];
        }

        return $rows->map(fn ($row) => [
            'date' => (string) $row->d,
            'label' => $this->thaiShortDate((string) $row->d),
            'visits' => (int) $row->visits,
            'patients' => (int) $row->patients,
        ])->values()->all();
    }

    private function buildXrayItems($conn, string $start, string $end): array
    {
        try {
            if ($this->hosxpTableExists($conn, 'xray_report')) {
                return $conn->table('xray_report as xr')
                    ->leftJoin('xray_items as xi', 'xi.xray_items_code', '=', 'xr.xray_items_code')
                    ->whereBetween('xr.request_date', [$start, $end])
                    ->selectRaw("COALESCE(NULLIF(xr.xray_items_code, ''), '-') as code")
                    ->selectRaw("COALESCE(NULLIF(xi.xray_items_name, ''), NULLIF(xr.xray_items_code, ''), '-') as name")
                    ->selectRaw('COUNT(*) as total')
                    ->selectRaw('COALESCE(SUM(COALESCE(xr.service_price, xi.service_price)), 0) as revenue')
                    ->groupByRaw("COALESCE(NULLIF(xr.xray_items_code, ''), '-'), COALESCE(NULLIF(xi.xray_items_name, ''), NULLIF(xr.xray_items_code, ''), '-')")
                    ->orderByDesc('total')
                    ->limit(15)
                    ->get()
                    ->map(fn ($row) => [
                        'code' => (string) $row->code,
                        'name' => (string) $row->name,
                        'total' => (int) $row->total,
                        'revenue' => round((float) $row->revenue, 2),
                    ])->values()->all();
            }

            return $conn->table('xray_head')
                ->whereBetween('order_date', [$start, $end])
                ->selectRaw("COALESCE(NULLIF(xray_list, ''), 'ไม่ระบุ') as name")
                ->selectRaw("'list' as code")
                ->selectRaw('COUNT(*) as total')
                ->selectRaw('COALESCE(SUM(total_price), 0) as revenue')
                ->groupByRaw("COALESCE(NULLIF(xray_list, ''), 'ไม่ระบุ')")
                ->orderByDesc('total')
                ->limit(15)
                ->get()
                ->map(fn ($row) => [
                    'code' => (string) $row->code,
                    'name' => (string) $row->name,
                    'total' => (int) $row->total,
                    'revenue' => round((float) $row->revenue, 2),
                ])->values()->all();
        } catch (Throwable) {
            return [];
        }
    }

    private function buildXrayGroups($conn, string $start, string $end): array
    {
        try {
            if (! $this->hosxpTableExists($conn, 'xray_report')) {
                return [];
            }

            return $conn->table('xray_report as xr')
                ->leftJoin('xray_items as xi', 'xi.xray_items_code', '=', 'xr.xray_items_code')
                ->leftJoin('xray_items_group as g', 'g.xray_items_group', '=', 'xi.xray_items_group')
                ->whereBetween('xr.request_date', [$start, $end])
                ->selectRaw("COALESCE(NULLIF(g.name, ''), NULLIF(xi.xray_items_group, ''), 'ไม่ระบุ') as name")
                ->selectRaw('COUNT(*) as total')
                ->groupByRaw("COALESCE(NULLIF(g.name, ''), NULLIF(xi.xray_items_group, ''), 'ไม่ระบุ')")
                ->orderByDesc('total')
                ->limit(12)
                ->get()
                ->map(fn ($row) => [
                    'code' => (string) $row->name,
                    'name' => (string) $row->name,
                    'total' => (int) $row->total,
                ])->values()->all();
        } catch (Throwable) {
            return [];
        }
    }

    private function buildXrayDepartments($conn, string $start, string $end): array
    {
        try {
            if ($this->hosxpTableExists($conn, 'xray_report') && $this->hosxpColumnExists($conn, 'xray_report', 'request_depcode')) {
                return $conn->table('xray_report as xr')
                    ->leftJoin('kskdepartment as d', 'd.depcode', '=', 'xr.request_depcode')
                    ->whereBetween('xr.request_date', [$start, $end])
                    ->selectRaw("COALESCE(NULLIF(xr.request_depcode, ''), '-') as code")
                    ->selectRaw("COALESCE(NULLIF(d.department, ''), NULLIF(xr.request_depcode, ''), 'ไม่ระบุ') as name")
                    ->selectRaw('COUNT(*) as total')
                    ->groupByRaw("COALESCE(NULLIF(xr.request_depcode, ''), '-'), COALESCE(NULLIF(d.department, ''), NULLIF(xr.request_depcode, ''), 'ไม่ระบุ')")
                    ->orderByDesc('total')
                    ->limit(15)
                    ->get()
                    ->map(fn ($row) => [
                        'code' => (string) $row->code,
                        'name' => (string) $row->name,
                        'total' => (int) $row->total,
                    ])->values()->all();
            }

            return $conn->table('xray_head')
                ->whereBetween('order_date', [$start, $end])
                ->selectRaw("COALESCE(NULLIF(department_code, ''), '-') as code")
                ->selectRaw("COALESCE(NULLIF(department_name, ''), NULLIF(department_code, ''), 'ไม่ระบุ') as name")
                ->selectRaw('COUNT(*) as total')
                ->groupByRaw("COALESCE(NULLIF(department_code, ''), '-'), COALESCE(NULLIF(department_name, ''), NULLIF(department_code, ''), 'ไม่ระบุ')")
                ->orderByDesc('total')
                ->limit(15)
                ->get()
                ->map(fn ($row) => [
                    'code' => (string) $row->code,
                    'name' => (string) $row->name,
                    'total' => (int) $row->total,
                ])->values()->all();
        } catch (Throwable) {
            return [];
        }
    }

    private function buildXrayHourly($conn, string $start, string $end): array
    {
        if ($this->hosxpTableExists($conn, 'xray_report') && $this->hosxpColumnExists($conn, 'xray_report', 'request_time')) {
            return $this->buildHourlyFromTime(
                $conn->table('xray_report')->whereBetween('request_date', [$start, $end]),
                'request_time'
            );
        }

        return $this->buildHourlyFromTime(
            $conn->table('xray_head')->whereBetween('order_date', [$start, $end]),
            'order_time'
        );
    }

    private function checkupBase($conn, string $pttype, string $start, string $end)
    {
        return $conn->table('ovst as o')
            ->leftJoin('patient_regiment as pr', 'pr.hn', '=', 'o.hn')
            ->where('o.pttype', $pttype)
            ->whereBetween('o.vstdate', [$start, $end]);
    }

    /** @return array<int, string> */
    private function checkupMarkerCodes(): array
    {
        return collect(config('department_data.checkup_lab_markers', []))
            ->pluck('code')
            ->map(fn ($c) => (string) $c)
            ->filter()
            ->values()
            ->all();
    }

    /**
     * SQL expression: 1 = out of lab_items range (or fallback), 0 = in range / unknown.
     */
    private function checkupOutOfRangeSql(string $valExpr = 'val'): string
    {
        return "
            CASE
                WHEN {$valExpr} IS NULL THEN 0
                WHEN pt.sex IN ('2','F','f')
                    AND li.range_check_min_female IS NOT NULL
                    AND li.range_check_max_female IS NOT NULL
                    AND ({$valExpr} < li.range_check_min_female OR {$valExpr} > li.range_check_max_female)
                    THEN 1
                WHEN (pt.sex IS NULL OR pt.sex NOT IN ('2','F','f'))
                    AND li.range_check_min IS NOT NULL
                    AND li.range_check_max IS NOT NULL
                    AND ({$valExpr} < li.range_check_min OR {$valExpr} > li.range_check_max)
                    THEN 1
                WHEN (li.range_check_min IS NULL OR li.range_check_max IS NULL)
                    AND lo.lab_items_code = '1062'
                    AND {$valExpr} < 60
                    THEN 1
                WHEN UPPER(COALESCE(lo.abnormal_result, '')) IN ('Y','1','A','H','L') THEN 1
                WHEN UPPER(COALESCE(lh.abnormal_result, '')) IN ('Y','1','A','H','L') THEN 1
                ELSE 0
            END
        ";
    }

    private function buildCheckupSummary($conn, string $pttype, string $start, string $end): array
    {
        $summary = $this->emptySummary('checkup');

        try {
            $row = $this->checkupBase($conn, $pttype, $start, $end)
                ->selectRaw('COUNT(DISTINCT o.vn) as visits')
                ->selectRaw('COUNT(DISTINCT o.hn) as patients')
                ->selectRaw("COUNT(DISTINCT COALESCE(NULLIF(TRIM(pr.main_regiment), ''), NULL)) as regiment_count")
                ->first();

            $visits = (int) ($row->visits ?? 0);
            $summary['visits'] = $visits;
            $summary['patients'] = (int) ($row->patients ?? 0);
            $summary['regiment_count'] = (int) ($row->regiment_count ?? 0);
        } catch (Throwable $e) {
            Log::warning('DepartmentData checkup summary failed: '.$e->getMessage());
        }

        try {
            $withLab = (int) $conn->table('ovst as o')
                ->where('o.pttype', $pttype)
                ->whereBetween('o.vstdate', [$start, $end])
                ->whereExists(function ($q) {
                    $q->select(DB::raw(1))
                        ->from('lab_head as lh')
                        ->whereColumn('lh.vn', 'o.vn');
                })
                ->distinct('o.vn')
                ->count('o.vn');

            $summary['with_lab'] = $withLab;
            $summary['without_lab'] = max(0, ($summary['visits'] ?? 0) - $withLab);
        } catch (Throwable) {
            // ignore
        }

        $labStatus = $this->buildCheckupLabStatus($conn, $pttype, $start, $end);
        foreach ($labStatus as $item) {
            match ($item['code'] ?? '') {
                'normal' => $summary['lab_normal'] = (int) $item['total'],
                'abnormal' => $summary['lab_abnormal'] = (int) $item['total'],
                'pending' => $summary['lab_pending'] = (int) $item['total'],
                default => null,
            };
        }

        try {
            $sexRows = $conn->table('ovst as o')
                ->leftJoin('patient as p', 'p.hn', '=', 'o.hn')
                ->where('o.pttype', $pttype)
                ->whereBetween('o.vstdate', [$start, $end])
                ->selectRaw("COALESCE(NULLIF(p.sex, ''), 'U') as sex")
                ->selectRaw('COUNT(DISTINCT o.hn) as total')
                ->groupByRaw("COALESCE(NULLIF(p.sex, ''), 'U')")
                ->get();

            foreach ($sexRows as $row) {
                $key = match ((string) $row->sex) {
                    '1', 'M', 'm' => 'male',
                    '2', 'F', 'f' => 'female',
                    default => 'unknown_sex',
                };
                $summary[$key] += (int) $row->total;
            }
        } catch (Throwable) {
            // ignore
        }

        try {
            $summary['revenue'] = round((float) $conn->table('ovst as o')
                ->join('opitemrece as oi', 'oi.vn', '=', 'o.vn')
                ->where('o.pttype', $pttype)
                ->whereBetween('o.vstdate', [$start, $end])
                ->sum('oi.sum_price'), 2);
            $summary['avg_revenue'] = ($summary['visits'] ?? 0) > 0
                ? round($summary['revenue'] / $summary['visits'], 2)
                : 0.0;
        } catch (Throwable) {
            // ignore
        }

        return $summary;
    }

    private function buildCheckupTrend($conn, string $pttype, string $start, string $end): array
    {
        try {
            $rows = $conn->table('ovst as o')
                ->where('o.pttype', $pttype)
                ->whereBetween('o.vstdate', [$start, $end])
                ->selectRaw('o.vstdate as d')
                ->selectRaw('COUNT(DISTINCT o.vn) as visits')
                ->selectRaw('COUNT(DISTINCT o.hn) as patients')
                ->groupBy('o.vstdate')
                ->orderBy('o.vstdate')
                ->get();
        } catch (Throwable) {
            return [];
        }

        return $rows->map(fn ($row) => [
            'date' => (string) $row->d,
            'label' => $this->thaiShortDate((string) $row->d),
            'visits' => (int) $row->visits,
            'patients' => (int) $row->patients,
        ])->values()->all();
    }

    private function buildCheckupRegiments($conn, string $pttype, string $start, string $end): array
    {
        try {
            return $this->checkupBase($conn, $pttype, $start, $end)
                ->selectRaw("COALESCE(NULLIF(TRIM(pr.main_regiment), ''), 'ไม่ระบุ') as name")
                ->selectRaw("COALESCE(NULLIF(TRIM(pr.main_regiment), ''), '-') as code")
                ->selectRaw('COUNT(DISTINCT o.vn) as total')
                ->selectRaw('COUNT(DISTINCT o.hn) as patients')
                ->groupByRaw("COALESCE(NULLIF(TRIM(pr.main_regiment), ''), 'ไม่ระบุ'), COALESCE(NULLIF(TRIM(pr.main_regiment), ''), '-')")
                ->orderByDesc('total')
                ->limit(20)
                ->get()
                ->map(fn ($row) => [
                    'code' => (string) $row->code,
                    'name' => (string) $row->name,
                    'total' => (int) $row->total,
                    'patients' => (int) $row->patients,
                ])->values()->all();
        } catch (Throwable) {
            return [];
        }
    }

    private function buildCheckupPersonnel($conn, string $pttype, string $start, string $end): array
    {
        try {
            return $this->checkupBase($conn, $pttype, $start, $end)
                ->selectRaw("COALESCE(NULLIF(TRIM(pr.sub_regiment), ''), 'ไม่ระบุ') as name")
                ->selectRaw("COALESCE(NULLIF(TRIM(pr.sub_regiment), ''), '-') as code")
                ->selectRaw('COUNT(DISTINCT o.vn) as total')
                ->selectRaw('COUNT(DISTINCT o.hn) as patients')
                ->groupByRaw("COALESCE(NULLIF(TRIM(pr.sub_regiment), ''), 'ไม่ระบุ'), COALESCE(NULLIF(TRIM(pr.sub_regiment), ''), '-')")
                ->orderByDesc('total')
                ->limit(15)
                ->get()
                ->map(fn ($row) => [
                    'code' => (string) $row->code,
                    'name' => (string) $row->name,
                    'total' => (int) $row->total,
                    'patients' => (int) $row->patients,
                ])->values()->all();
        } catch (Throwable) {
            return [];
        }
    }

    private function buildCheckupAges($conn, string $pttype, string $start, string $end): array
    {
        try {
            $rows = $conn->select("
                SELECT band as name, COUNT(DISTINCT hn) as total
                FROM (
                    SELECT o.hn,
                        CASE
                            WHEN pt.birthday IS NULL OR pt.birthday = '0000-00-00' THEN 'ไม่ระบุ'
                            WHEN TIMESTAMPDIFF(YEAR, pt.birthday, o.vstdate) < 20 THEN '<20'
                            WHEN TIMESTAMPDIFF(YEAR, pt.birthday, o.vstdate) BETWEEN 20 AND 29 THEN '20-29'
                            WHEN TIMESTAMPDIFF(YEAR, pt.birthday, o.vstdate) BETWEEN 30 AND 39 THEN '30-39'
                            WHEN TIMESTAMPDIFF(YEAR, pt.birthday, o.vstdate) BETWEEN 40 AND 49 THEN '40-49'
                            WHEN TIMESTAMPDIFF(YEAR, pt.birthday, o.vstdate) BETWEEN 50 AND 59 THEN '50-59'
                            ELSE '60+'
                        END as band
                    FROM ovst o
                    LEFT JOIN patient pt ON pt.hn = o.hn
                    WHERE o.pttype = ?
                      AND o.vstdate BETWEEN ? AND ?
                ) t
                GROUP BY band
                ORDER BY FIELD(band, '<20', '20-29', '30-39', '40-49', '50-59', '60+', 'ไม่ระบุ')
            ", [$pttype, $start, $end]);

            return collect($rows)->map(fn ($row) => [
                'code' => (string) $row->name,
                'name' => (string) $row->name,
                'total' => (int) $row->total,
            ])->values()->all();
        } catch (Throwable) {
            return [];
        }
    }

    private function buildCheckupLabStatus($conn, string $pttype, string $start, string $end): array
    {
        $markers = $this->checkupMarkerCodes();
        if (! $markers) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($markers), '?'));
        $val = "CAST(REPLACE(REPLACE(TRIM(lo.lab_order_result), ',', ''), ' ', '') AS DECIMAL(12,2))";
        $outOfRange = $this->checkupOutOfRangeSql($val);

        try {
            $patients = (int) $conn->table('ovst as o')
                ->where('o.pttype', $pttype)
                ->whereBetween('o.vstdate', [$start, $end])
                ->distinct('o.hn')
                ->count('o.hn');

            $row = $conn->selectOne("
                SELECT
                    COUNT(*) as evaluated,
                    SUM(CASE WHEN has_abn = 1 THEN 1 ELSE 0 END) as abnormal,
                    SUM(CASE WHEN has_abn = 0 THEN 1 ELSE 0 END) as normal
                FROM (
                    SELECT o.hn,
                        MAX({$outOfRange}) as has_abn
                    FROM ovst o
                    JOIN lab_head lh ON lh.vn = o.vn
                    JOIN lab_order lo ON lo.lab_order_number = lh.lab_order_number
                    LEFT JOIN lab_items li ON li.lab_items_code = lo.lab_items_code
                    LEFT JOIN patient pt ON pt.hn = o.hn
                    WHERE o.pttype = ?
                      AND o.vstdate BETWEEN ? AND ?
                      AND lo.lab_items_code IN ({$placeholders})
                      AND lo.lab_order_result REGEXP '^[0-9]'
                    GROUP BY o.hn
                ) scored
            ", array_merge([$pttype, $start, $end], $markers));

            $abnormal = (int) ($row->abnormal ?? 0);
            $normal = (int) ($row->normal ?? 0);
            $evaluated = (int) ($row->evaluated ?? 0);
            $pending = max(0, $patients - $evaluated);

            return [
                ['code' => 'normal', 'name' => 'ผล Lab ปกติ', 'total' => $normal],
                ['code' => 'abnormal', 'name' => 'ผล Lab ผิดปกติ', 'total' => $abnormal],
                ['code' => 'pending', 'name' => 'ยังไม่มีผล Lab สำคัญ', 'total' => $pending],
            ];
        } catch (Throwable $e) {
            Log::warning('DepartmentData checkup lab status failed: '.$e->getMessage());

            return [];
        }
    }

    private function buildCheckupLabMarkers($conn, string $pttype, string $start, string $end): array
    {
        $markers = config('department_data.checkup_lab_markers', []);
        if (! $markers) {
            return [];
        }

        $codes = collect($markers)->pluck('code')->map(fn ($c) => (string) $c)->all();
        $placeholders = implode(',', array_fill(0, count($codes), '?'));
        $val = "CAST(REPLACE(REPLACE(TRIM(lo.lab_order_result), ',', ''), ' ', '') AS DECIMAL(12,2))";
        $outOfRange = $this->checkupOutOfRangeSql($val);

        try {
            $rows = $conn->select("
                SELECT
                    lo.lab_items_code as code,
                    COALESCE(NULLIF(li.lab_items_name, ''), lo.lab_items_code) as name,
                    COUNT(*) as total,
                    SUM(CASE WHEN {$outOfRange} = 0 THEN 1 ELSE 0 END) as normal,
                    SUM(CASE WHEN {$outOfRange} = 1 THEN 1 ELSE 0 END) as abnormal,
                    ROUND(AVG({$val}), 2) as avg_value
                FROM ovst o
                JOIN lab_head lh ON lh.vn = o.vn
                JOIN lab_order lo ON lo.lab_order_number = lh.lab_order_number
                LEFT JOIN lab_items li ON li.lab_items_code = lo.lab_items_code
                LEFT JOIN patient pt ON pt.hn = o.hn
                WHERE o.pttype = ?
                  AND o.vstdate BETWEEN ? AND ?
                  AND lo.lab_items_code IN ({$placeholders})
                  AND lo.lab_order_result REGEXP '^[0-9]'
                GROUP BY lo.lab_items_code, li.lab_items_name
                ORDER BY total DESC
            ", array_merge([$pttype, $start, $end], $codes));
        } catch (Throwable $e) {
            Log::warning('DepartmentData checkup lab markers failed: '.$e->getMessage());

            return [];
        }

        $labelMap = collect($markers)->keyBy(fn ($m) => (string) $m['code']);

        return collect($rows)->map(function ($row) use ($labelMap) {
            $meta = $labelMap->get((string) $row->code, []);

            return [
                'code' => (string) $row->code,
                'name' => (string) ($meta['label'] ?? $row->name),
                'unit' => (string) ($meta['unit'] ?? ''),
                'total' => (int) $row->total,
                'normal' => (int) $row->normal,
                'abnormal' => (int) $row->abnormal,
                'avg_value' => round((float) ($row->avg_value ?? 0), 2),
            ];
        })->values()->all();
    }

    private function buildCheckupHourly($conn, string $pttype, string $start, string $end): array
    {
        try {
            $columns = $conn->getSchemaBuilder()->getColumnListing('ovst');
        } catch (Throwable) {
            $columns = [];
        }

        $timeCol = null;
        foreach (['vsttime', 'o_time', 'r_time'] as $candidate) {
            if (in_array($candidate, $columns, true)) {
                $timeCol = $candidate;
                break;
            }
        }

        if (! $timeCol) {
            return [];
        }

        return $this->buildHourlyFromTime(
            $conn->table('ovst as o')
                ->where('o.pttype', $pttype)
                ->whereBetween('o.vstdate', [$start, $end]),
            "o.{$timeCol}"
        );
    }

    /**
     * แดชบอร์ดแบบคัดกรอง OPD สำหรับ OPD / ER / คลินิก ที่ใช้ ovst + service_time
     *
     * @return array<string, mixed>
     */
    private function buildVisitDashboard($conn, string $code, string $start, string $end, array $dept): array
    {
        $waitTarget = $this->waitTargetMinutes($dept);
        $wait = $this->attachWaitTime($conn, $code, $start, $end, $dept);
        $mode = $this->waitMode($dept) ?: 'opd';

        $out = [
            'summary' => array_merge(
                $this->buildOpdScreenSummary($conn, $code, $start, $end, $waitTarget),
                $wait['summary']
            ),
            'trend' => $this->buildOvstTrend($conn, $code, $start, $end),
            'wait_bands' => $wait['bands'] ?: $this->buildOpdScreenWaitBands($conn, $code, $start, $end, $waitTarget),
            'wait_stages' => $wait['stages'],
            'wait_queue' => $wait['queue'],
            'wait_lab_queue' => $wait['lab_queue'] ?? [],
            'wait_pharmacy_queue' => $wait['pharmacy_queue'] ?? [],
            'wait_enabled' => true,
            'wait_mode' => $mode,
            'vitals' => $this->buildOpdScreenVitals($conn, $code, $start, $end),
            'ages' => $this->buildOpdScreenAges($conn, $code, $start, $end),
            'specialties' => $this->buildOpdScreenSpecialties($conn, $code, $start, $end),
            'visit_status' => $this->buildOpdScreenVisitStatus($conn, $code, $start, $end),
            'destinations' => $this->buildOpdScreenDestinations($conn, $code, $start, $end),
            'complaints' => $this->buildOpdScreenComplaints($conn, $code, $start, $end),
            'diagnoses' => $this->buildOvstDiagnoses($conn, $code, $start, $end),
            'rights' => $this->buildOvstRights($conn, $code, $start, $end),
            'weekdays' => $this->buildOpdScreenWeekdays($conn, $code, $start, $end),
            'hourly' => $this->buildOvstHourly($conn, $code, $start, $end),
        ];

        if ($mode === 'er') {
            $out['er_types'] = $this->buildErEmergencyTypes($conn, $code, $start, $end);
            $out['er_pt_types'] = $this->buildErPtTypes($conn, $code, $start, $end);
        }

        return $out;
    }

    // ─── OPD Screening (main_dep + opdscreen) ─────────────────────────

    private function buildOpdScreenSummary($conn, string $code, string $start, string $end, int $waitTarget = 70): array
    {
        $summary = $this->buildOvstSummary($conn, $code, $start, $end);
        $summary = array_merge($this->emptySummary('opd_screen'), $summary);
        $summary['wait_target_minutes'] = $waitTarget;

        $visits = (int) ($summary['visits'] ?? 0);

        try {
            $screened = (int) $conn->table('ovst as o')
                ->where('o.main_dep', $code)
                ->whereBetween('o.vstdate', [$start, $end])
                ->whereExists(function ($q) {
                    $q->select(DB::raw(1))->from('opdscreen as s')->whereColumn('s.vn', 'o.vn');
                })
                ->distinct('o.vn')
                ->count('o.vn');

            $summary['screened'] = $screened;
            $summary['screen_rate'] = $visits > 0 ? round(($screened / $visits) * 100, 1) : 0.0;
        } catch (Throwable) {
            // ignore
        }

        try {
            $vitals = $conn->selectOne("
                SELECT
                    COUNT(*) as screened_rows,
                    SUM(CASE WHEN s.bps IS NOT NULL AND s.bpd IS NOT NULL AND s.pulse IS NOT NULL AND s.temperature IS NOT NULL THEN 1 ELSE 0 END) as complete_core,
                    SUM(CASE WHEN CAST(s.bps AS DECIMAL(10,2)) >= 140 OR CAST(s.bpd AS DECIMAL(10,2)) >= 90 THEN 1 ELSE 0 END) as high_bp,
                    SUM(CASE WHEN s.temperature IS NOT NULL AND CAST(s.temperature AS DECIMAL(10,2)) >= 37.5 THEN 1 ELSE 0 END) as fever,
                    SUM(CASE WHEN s.bmi IS NOT NULL AND CAST(s.bmi AS DECIMAL(10,2)) >= 30 THEN 1 ELSE 0 END) as obese
                FROM ovst o
                JOIN opdscreen s ON s.vn = o.vn
                WHERE o.main_dep = ?
                  AND o.vstdate BETWEEN ? AND ?
            ", [$code, $start, $end]);

            $screenedRows = max(1, (int) ($vitals->screened_rows ?? 0));
            $summary['vitals_complete'] = (int) ($vitals->complete_core ?? 0);
            $summary['vitals_complete_rate'] = round(($summary['vitals_complete'] / $screenedRows) * 100, 1);
            $summary['high_bp'] = (int) ($vitals->high_bp ?? 0);
            $summary['high_bp_rate'] = round(($summary['high_bp'] / $screenedRows) * 100, 1);
            $summary['fever'] = (int) ($vitals->fever ?? 0);
            $summary['obese'] = (int) ($vitals->obese ?? 0);
        } catch (Throwable $e) {
            Log::warning('DepartmentData opd_screen vitals summary failed: '.$e->getMessage());
        }

        return $summary;
    }

    private function buildOpdScreenWaitBands($conn, string $code, string $start, string $end, int $waitTarget = 70): array
    {
        $labelMid = '≤ เป้าหมาย ('.$waitTarget.' นาที)';

        try {
            $rows = $conn->select("
                SELECT band as name, COUNT(*) as total, MIN(sort_no) as sort_no
                FROM (
                    SELECT
                        CASE
                            WHEN mins < 0 OR mins > 600 THEN 'ข้อมูลผิดปกติ'
                            WHEN mins <= 30 THEN '≤ 30 นาที'
                            WHEN mins <= ? THEN ?
                            WHEN mins <= 120 THEN '71-120 นาที'
                            WHEN mins <= 180 THEN '121-180 นาที'
                            ELSE '> 180 นาที'
                        END as band,
                        CASE
                            WHEN mins < 0 OR mins > 600 THEN 6
                            WHEN mins <= 30 THEN 1
                            WHEN mins <= ? THEN 2
                            WHEN mins <= 120 THEN 3
                            WHEN mins <= 180 THEN 4
                            ELSE 5
                        END as sort_no
                    FROM (
                        SELECT TIMESTAMPDIFF(
                            MINUTE,
                            CONCAT(o.vstdate, ' ', COALESCE(NULLIF(o.vsttime, ''), '00:00:00')),
                            CONCAT(o.vstdate, ' ', COALESCE(NULLIF(o.cur_dep_time, ''), '00:00:00'))
                        ) as mins
                        FROM ovst o
                        WHERE o.main_dep = ?
                          AND o.vstdate BETWEEN ? AND ?
                          AND o.vsttime IS NOT NULL AND o.vsttime <> ''
                          AND o.cur_dep_time IS NOT NULL AND o.cur_dep_time <> ''
                    ) t
                ) b
                GROUP BY band
                ORDER BY sort_no
            ", [$waitTarget, $labelMid, $waitTarget, $code, $start, $end]);

            return collect($rows)->map(fn ($row) => [
                'code' => (string) $row->name,
                'name' => (string) $row->name,
                'total' => (int) $row->total,
            ])->values()->all();
        } catch (Throwable $e) {
            Log::warning('DepartmentData opd_screen wait bands failed: '.$e->getMessage());

            return [];
        }
    }

    private function buildOpdScreenVitals($conn, string $code, string $start, string $end): array
    {
        try {
            $row = $conn->selectOne("
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN s.bps IS NOT NULL AND s.bpd IS NOT NULL THEN 1 ELSE 0 END) as has_bp,
                    SUM(CASE WHEN s.pulse IS NOT NULL THEN 1 ELSE 0 END) as has_pulse,
                    SUM(CASE WHEN s.temperature IS NOT NULL THEN 1 ELSE 0 END) as has_temp,
                    SUM(CASE WHEN s.bw IS NOT NULL AND s.height IS NOT NULL THEN 1 ELSE 0 END) as has_anthro,
                    SUM(CASE WHEN s.bmi IS NOT NULL THEN 1 ELSE 0 END) as has_bmi,
                    SUM(CASE WHEN s.bps IS NOT NULL AND s.bpd IS NOT NULL AND s.pulse IS NOT NULL AND s.temperature IS NOT NULL THEN 1 ELSE 0 END) as complete_core,
                    SUM(CASE WHEN CAST(s.bps AS DECIMAL(10,2)) >= 140 OR CAST(s.bpd AS DECIMAL(10,2)) >= 90 THEN 1 ELSE 0 END) as high_bp,
                    SUM(CASE WHEN s.bmi IS NOT NULL AND CAST(s.bmi AS DECIMAL(10,2)) >= 25 AND CAST(s.bmi AS DECIMAL(10,2)) < 30 THEN 1 ELSE 0 END) as overweight,
                    SUM(CASE WHEN s.bmi IS NOT NULL AND CAST(s.bmi AS DECIMAL(10,2)) >= 30 THEN 1 ELSE 0 END) as obese,
                    SUM(CASE WHEN s.temperature IS NOT NULL AND CAST(s.temperature AS DECIMAL(10,2)) >= 37.5 THEN 1 ELSE 0 END) as fever
                FROM ovst o
                JOIN opdscreen s ON s.vn = o.vn
                WHERE o.main_dep = ?
                  AND o.vstdate BETWEEN ? AND ?
            ", [$code, $start, $end]);
        } catch (Throwable $e) {
            Log::warning('DepartmentData opd_screen vitals failed: '.$e->getMessage());

            return [];
        }

        $total = max(1, (int) ($row->total ?? 0));

        return [
            ['code' => 'has_bp', 'name' => 'บันทึก BP', 'total' => (int) ($row->has_bp ?? 0), 'rate' => round(((int) ($row->has_bp ?? 0) / $total) * 100, 1)],
            ['code' => 'has_pulse', 'name' => 'บันทึก Pulse', 'total' => (int) ($row->has_pulse ?? 0), 'rate' => round(((int) ($row->has_pulse ?? 0) / $total) * 100, 1)],
            ['code' => 'has_temp', 'name' => 'บันทึกอุณหภูมิ', 'total' => (int) ($row->has_temp ?? 0), 'rate' => round(((int) ($row->has_temp ?? 0) / $total) * 100, 1)],
            ['code' => 'has_bmi', 'name' => 'บันทึก BMI', 'total' => (int) ($row->has_bmi ?? 0), 'rate' => round(((int) ($row->has_bmi ?? 0) / $total) * 100, 1)],
            ['code' => 'complete_core', 'name' => 'ครบ vitals หลัก', 'total' => (int) ($row->complete_core ?? 0), 'rate' => round(((int) ($row->complete_core ?? 0) / $total) * 100, 1)],
            ['code' => 'high_bp', 'name' => 'BP สูง (≥140/90)', 'total' => (int) ($row->high_bp ?? 0), 'rate' => round(((int) ($row->high_bp ?? 0) / $total) * 100, 1)],
            ['code' => 'overweight', 'name' => 'BMI 25-29.9', 'total' => (int) ($row->overweight ?? 0), 'rate' => round(((int) ($row->overweight ?? 0) / $total) * 100, 1)],
            ['code' => 'obese', 'name' => 'BMI ≥ 30', 'total' => (int) ($row->obese ?? 0), 'rate' => round(((int) ($row->obese ?? 0) / $total) * 100, 1)],
            ['code' => 'fever', 'name' => 'มีไข้ (≥37.5°C)', 'total' => (int) ($row->fever ?? 0), 'rate' => round(((int) ($row->fever ?? 0) / $total) * 100, 1)],
        ];
    }

    private function buildOpdScreenAges($conn, string $code, string $start, string $end): array
    {
        try {
            $rows = $conn->select("
                SELECT band as name, COUNT(DISTINCT hn) as total
                FROM (
                    SELECT o.hn,
                        CASE
                            WHEN pt.birthday IS NULL OR pt.birthday = '0000-00-00' THEN 'ไม่ระบุ'
                            WHEN TIMESTAMPDIFF(YEAR, pt.birthday, o.vstdate) < 15 THEN '<15'
                            WHEN TIMESTAMPDIFF(YEAR, pt.birthday, o.vstdate) BETWEEN 15 AND 24 THEN '15-24'
                            WHEN TIMESTAMPDIFF(YEAR, pt.birthday, o.vstdate) BETWEEN 25 AND 44 THEN '25-44'
                            WHEN TIMESTAMPDIFF(YEAR, pt.birthday, o.vstdate) BETWEEN 45 AND 59 THEN '45-59'
                            ELSE '60+'
                        END as band
                    FROM ovst o
                    LEFT JOIN patient pt ON pt.hn = o.hn
                    WHERE o.main_dep = ?
                      AND o.vstdate BETWEEN ? AND ?
                ) t
                GROUP BY band
                ORDER BY FIELD(band, '<15', '15-24', '25-44', '45-59', '60+', 'ไม่ระบุ')
            ", [$code, $start, $end]);

            return collect($rows)->map(fn ($row) => [
                'code' => (string) $row->name,
                'name' => (string) $row->name,
                'total' => (int) $row->total,
            ])->values()->all();
        } catch (Throwable) {
            return [];
        }
    }

    private function buildOpdScreenSpecialties($conn, string $code, string $start, string $end): array
    {
        try {
            return $conn->table('ovst as o')
                ->leftJoin('spclty as s', 's.spclty', '=', 'o.spclty')
                ->where('o.main_dep', $code)
                ->whereBetween('o.vstdate', [$start, $end])
                ->selectRaw("COALESCE(NULLIF(o.spclty, ''), '-') as code")
                ->selectRaw("COALESCE(NULLIF(s.name, ''), NULLIF(o.spclty, ''), 'ไม่ระบุ') as name")
                ->selectRaw('COUNT(DISTINCT o.vn) as total')
                ->groupByRaw("COALESCE(NULLIF(o.spclty, ''), '-'), COALESCE(NULLIF(s.name, ''), NULLIF(o.spclty, ''), 'ไม่ระบุ')")
                ->orderByDesc('total')
                ->limit(12)
                ->get()
                ->map(fn ($row) => [
                    'code' => (string) $row->code,
                    'name' => (string) $row->name,
                    'total' => (int) $row->total,
                ])->values()->all();
        } catch (Throwable) {
            return [];
        }
    }

    private function buildOpdScreenVisitStatus($conn, string $code, string $start, string $end): array
    {
        try {
            return $conn->table('ovst as o')
                ->leftJoin('ovstost as s', 's.ovstost', '=', 'o.ovstost')
                ->where('o.main_dep', $code)
                ->whereBetween('o.vstdate', [$start, $end])
                ->selectRaw("COALESCE(NULLIF(o.ovstost, ''), '-') as code")
                ->selectRaw("COALESCE(NULLIF(s.name, ''), NULLIF(o.ovstost, ''), 'ไม่ระบุ') as name")
                ->selectRaw('COUNT(DISTINCT o.vn) as total')
                ->groupByRaw("COALESCE(NULLIF(o.ovstost, ''), '-'), COALESCE(NULLIF(s.name, ''), NULLIF(o.ovstost, ''), 'ไม่ระบุ')")
                ->orderByDesc('total')
                ->limit(12)
                ->get()
                ->map(fn ($row) => [
                    'code' => (string) $row->code,
                    'name' => (string) $row->name,
                    'total' => (int) $row->total,
                ])->values()->all();
        } catch (Throwable) {
            return [];
        }
    }

    private function buildOpdScreenDestinations($conn, string $code, string $start, string $end): array
    {
        try {
            return $conn->table('ovst as o')
                ->leftJoin('kskdepartment as d', 'd.depcode', '=', 'o.cur_dep')
                ->where('o.main_dep', $code)
                ->whereBetween('o.vstdate', [$start, $end])
                ->selectRaw("COALESCE(NULLIF(o.cur_dep, ''), '-') as code")
                ->selectRaw("COALESCE(NULLIF(d.department, ''), NULLIF(o.cur_dep, ''), 'ไม่ระบุ') as name")
                ->selectRaw('COUNT(DISTINCT o.vn) as total')
                ->groupByRaw("COALESCE(NULLIF(o.cur_dep, ''), '-'), COALESCE(NULLIF(d.department, ''), NULLIF(o.cur_dep, ''), 'ไม่ระบุ')")
                ->orderByDesc('total')
                ->limit(12)
                ->get()
                ->map(fn ($row) => [
                    'code' => (string) $row->code,
                    'name' => (string) $row->name,
                    'total' => (int) $row->total,
                ])->values()->all();
        } catch (Throwable) {
            return [];
        }
    }

    private function buildOpdScreenComplaints($conn, string $code, string $start, string $end): array
    {
        try {
            return $conn->table('ovst as o')
                ->join('opdscreen as s', 's.vn', '=', 'o.vn')
                ->where('o.main_dep', $code)
                ->whereBetween('o.vstdate', [$start, $end])
                ->selectRaw("COALESCE(NULLIF(TRIM(s.cc), ''), 'ไม่ระบุ') as name")
                ->selectRaw('COUNT(*) as total')
                ->groupByRaw("COALESCE(NULLIF(TRIM(s.cc), ''), 'ไม่ระบุ')")
                ->orderByDesc('total')
                ->limit(15)
                ->get()
                ->map(fn ($row) => [
                    'code' => mb_substr((string) $row->name, 0, 40),
                    'name' => (string) $row->name,
                    'total' => (int) $row->total,
                ])->values()->all();
        } catch (Throwable) {
            return [];
        }
    }

    private function buildOpdScreenWeekdays($conn, string $code, string $start, string $end): array
    {
        $labels = [
            1 => 'อาทิตย์',
            2 => 'จันทร์',
            3 => 'อังคาร',
            4 => 'พุธ',
            5 => 'พฤหัสบดี',
            6 => 'ศุกร์',
            7 => 'เสาร์',
        ];

        try {
            $rows = $conn->table('ovst as o')
                ->where('o.main_dep', $code)
                ->whereBetween('o.vstdate', [$start, $end])
                ->selectRaw('DAYOFWEEK(o.vstdate) as dow')
                ->selectRaw('COUNT(DISTINCT o.vn) as total')
                ->groupByRaw('DAYOFWEEK(o.vstdate)')
                ->orderBy('dow')
                ->get();

            return $rows->map(fn ($row) => [
                'code' => (string) $row->dow,
                'name' => $labels[(int) $row->dow] ?? (string) $row->dow,
                'total' => (int) $row->total,
            ])->values()->all();
        } catch (Throwable) {
            return [];
        }
    }

    private function buildErEmergencyTypes($conn, string $code, string $start, string $end): array
    {
        if (! $this->hosxpTableExists($conn, 'er_regist')) {
            return [];
        }

        $hasTypeTable = $this->hosxpTableExists($conn, 'er_emergency_type');
        $hasCol = $this->hosxpColumnExists($conn, 'er_regist', 'er_emergency_type');
        if (! $hasCol) {
            return [];
        }

        try {
            $query = $conn->table('ovst as o')
                ->join('er_regist as er', 'er.vn', '=', 'o.vn')
                ->where('o.main_dep', $code)
                ->whereBetween('o.vstdate', [$start, $end]);

            if ($hasTypeTable) {
                $query->leftJoin('er_emergency_type as t', 't.er_emergency_type', '=', 'er.er_emergency_type');
            }

            return $query
                ->selectRaw("COALESCE(NULLIF(CAST(er.er_emergency_type AS CHAR), ''), '-') as code")
                ->selectRaw($hasTypeTable
                    ? "COALESCE(NULLIF(t.name, ''), CAST(er.er_emergency_type AS CHAR), 'ไม่ระบุ') as name"
                    : "COALESCE(CAST(er.er_emergency_type AS CHAR), 'ไม่ระบุ') as name")
                ->selectRaw('COUNT(DISTINCT o.vn) as total')
                ->groupByRaw("COALESCE(NULLIF(CAST(er.er_emergency_type AS CHAR), ''), '-')".($hasTypeTable ? ', t.name' : ''))
                ->orderByDesc('total')
                ->limit(12)
                ->get()
                ->map(fn ($row) => [
                    'code' => (string) $row->code,
                    'name' => (string) $row->name,
                    'total' => (int) $row->total,
                ])->values()->all();
        } catch (Throwable $e) {
            Log::warning('DepartmentData ER types failed: '.$e->getMessage());

            return [];
        }
    }

    private function buildErPtTypes($conn, string $code, string $start, string $end): array
    {
        if (! $this->hosxpTableExists($conn, 'er_regist') || ! $this->hosxpColumnExists($conn, 'er_regist', 'er_pt_type')) {
            return [];
        }

        $hasTypeTable = $this->hosxpTableExists($conn, 'er_pt_type');

        try {
            $query = $conn->table('ovst as o')
                ->join('er_regist as er', 'er.vn', '=', 'o.vn')
                ->where('o.main_dep', $code)
                ->whereBetween('o.vstdate', [$start, $end]);

            if ($hasTypeTable) {
                $query->leftJoin('er_pt_type as t', 't.er_pt_type', '=', 'er.er_pt_type');
            }

            return $query
                ->selectRaw("COALESCE(NULLIF(CAST(er.er_pt_type AS CHAR), ''), '-') as code")
                ->selectRaw($hasTypeTable
                    ? "COALESCE(NULLIF(t.name, ''), CAST(er.er_pt_type AS CHAR), 'ไม่ระบุ') as name"
                    : "COALESCE(CAST(er.er_pt_type AS CHAR), 'ไม่ระบุ') as name")
                ->selectRaw('COUNT(DISTINCT o.vn) as total')
                ->groupByRaw("COALESCE(NULLIF(CAST(er.er_pt_type AS CHAR), ''), '-')".($hasTypeTable ? ', t.name' : ''))
                ->orderByDesc('total')
                ->limit(12)
                ->get()
                ->map(fn ($row) => [
                    'code' => (string) $row->code,
                    'name' => (string) $row->name,
                    'total' => (int) $row->total,
                ])->values()->all();
        } catch (Throwable $e) {
            Log::warning('DepartmentData ER pt types failed: '.$e->getMessage());

            return [];
        }
    }
}
