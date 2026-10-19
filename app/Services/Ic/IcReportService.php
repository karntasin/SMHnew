<?php

namespace App\Services\Ic;

use App\Models\Ic\IcAntibioticUse;
use App\Models\Ic\IcDeviceDay;
use App\Models\Ic\IcEducationRecord;
use App\Models\Ic\IcEnvironmentCheck;
use App\Models\Ic\IcHandHygieneObservation;
use App\Models\Ic\IcIncident;
use App\Models\Ic\IcOutbreak;
use App\Models\Ic\IcSetting;
use App\Models\Ic\IcSurveillanceLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class IcReportService
{
    public const HOSPITAL_NAME = 'โรงพยาบาลค่ายสุรสิงหนาท';

    public const MODULES = [
        'overview' => 'ภาพรวมการควบคุมการติดเชื้อ',
        'surveillance' => 'เฝ้าระวังการติดเชื้อ',
        'incidents' => 'อุบัติการณ์',
        'hand-hygiene' => 'ล้างมือ',
        'device-days' => 'Device Days',
        'antibiotic' => 'ยาปฏิชีวนะ',
        'outbreak' => 'การระบาด',
        'environment' => 'สิ่งแวดล้อม',
        'education' => 'การอบรม',
    ];

    public function canEdit(?int $ownerId): bool
    {
        $user = Auth::user();
        if (! $user) {
            return false;
        }

        if ($ownerId && (int) $ownerId === (int) $user->id) {
            return true;
        }

        return $user->hasRole(['admin', 'superUser', 'Admin']);
    }

    public function authorizeOwner(?int $ownerId): void
    {
        abort_unless($this->canEdit($ownerId), 403, 'แก้ไขได้เฉพาะผู้บันทึกหรือผู้ดูแลระบบ');
    }

    public function decorate($paginator, string $ownerKey = 'reporter_id')
    {
        $paginator->getCollection()->transform(function ($row) use ($ownerKey) {
            $row->setAttribute('can_edit', $this->canEdit($row->{$ownerKey} ? (int) $row->{$ownerKey} : null));

            return $row;
        });

        return $paginator;
    }

    public function targets(): array
    {
        return [
            'hai_rate' => (float) IcSetting::getValue('hai_rate_target', 5.0),
            'hand_hygiene' => (float) IcSetting::getValue('hand_hygiene_target', 85),
            'antibiotic_appropriate' => (float) IcSetting::getValue('antibiotic_appropriate_target', 80),
            'environment_pass' => (float) IcSetting::getValue('environment_pass_target', 95),
            'cauti' => (float) IcSetting::getValue('cauti_target', 3.5),
            'clabsi' => (float) IcSetting::getValue('clabsi_target', 1.5),
            'vap' => (float) IcSetting::getValue('vap_target', 5.0),
        ];
    }

    public function resolvePeriod(?string $start, ?string $end): array
    {
        $startDate = $start ?: now()->startOfYear()->format('Y-m-d');
        $endDate = $end ?: now()->format('Y-m-d');

        if (Carbon::parse($startDate)->gt(Carbon::parse($endDate))) {
            [$startDate, $endDate] = [$endDate, $startDate];
        }

        return [$startDate, $endDate];
    }

    public function charts(string $module, string $start, string $end): array
    {
        return match ($module) {
            'surveillance' => [
                $this->line('จำนวน HAI ที่ยืนยัน', 'ราย', $this->monthlySurveillance($start, $end), 'hai_count'),
                $this->line('HAI Rate', 'ต่อ 1,000 patient days', $this->monthlySurveillance($start, $end), 'hai_rate', $this->targets()['hai_rate']),
            ],
            'incidents' => [
                $this->line('จำนวนอุบัติการณ์', 'ราย', $this->monthlyIncidents($start, $end), 'count'),
                $this->bars('แยกตามประเภท', 'ราย', $this->incidentByType($start, $end)),
            ],
            'hand-hygiene' => [
                $this->line('อัตราการล้างมือ', '%', $this->monthlyHygiene($start, $end), 'rate', $this->targets()['hand_hygiene']),
            ],
            'device-days' => [
                $this->line('Patient Days', 'วัน', $this->monthlyDevices($start, $end), 'patient_days'),
                $this->line('Catheter Days', 'วัน', $this->monthlyDevices($start, $end), 'catheter_days'),
            ],
            'antibiotic' => [
                $this->line('อัตราความเหมาะสม', '%', $this->monthlyAntibiotic($start, $end), 'rate', $this->targets()['antibiotic_appropriate']),
                $this->bars('แยกตามกลุ่มยา', 'รายการ', $this->antibioticByClass($start, $end)),
            ],
            'outbreak' => [
                $this->line('การระบาดที่ตรวจพบ', 'เหตุการณ์', $this->monthlyOutbreaks($start, $end), 'count'),
            ],
            'environment' => [
                $this->line('อัตราผ่านการตรวจ', '%', $this->monthlyEnvironment($start, $end), 'rate', $this->targets()['environment_pass']),
            ],
            'education' => [
                $this->line('จำนวนการอบรม', 'ครั้ง', $this->monthlyEducation($start, $end), 'count'),
                $this->line('ผู้เข้าอบรม', 'คน', $this->monthlyEducation($start, $end), 'participants'),
            ],
            default => $this->overviewCharts($start, $end),
        };
    }

    public function document(string $module, string $start, string $end): array
    {
        $targets = $this->targets();
        $sections = $module === 'overview'
            ? [
                $this->surveillanceSection($start, $end, $targets, 12),
                $this->incidentSection($start, $end, 12),
                $this->hygieneSection($start, $end, $targets, 12),
                $this->deviceSection($start, $end, 12),
                $this->antibioticSection($start, $end, $targets, 12),
                $this->outbreakSection($start, $end, 8),
                $this->environmentSection($start, $end, $targets, 12),
                $this->educationSection($start, $end, 12),
            ]
            : [match ($module) {
                'surveillance' => $this->surveillanceSection($start, $end, $targets, 80),
                'incidents' => $this->incidentSection($start, $end, 80),
                'hand-hygiene' => $this->hygieneSection($start, $end, $targets, 80),
                'device-days' => $this->deviceSection($start, $end, 80),
                'antibiotic' => $this->antibioticSection($start, $end, $targets, 80),
                'outbreak' => $this->outbreakSection($start, $end, 40),
                'environment' => $this->environmentSection($start, $end, $targets, 80),
                'education' => $this->educationSection($start, $end, 40),
                default => $this->surveillanceSection($start, $end, $targets, 80),
            }];

        return [
            'title' => self::MODULES[$module] ?? self::MODULES['overview'],
            'module' => $module,
            'start' => $this->thaiDate($start),
            'end' => $this->thaiDate($end),
            'generated_at' => $this->thaiDateTime(now()),
            'sections' => $sections,
        ];
    }

    public function moduleCards(string $start, string $end): array
    {
        $targets = $this->targets();
        $hai = $this->haiSnapshot($start, $end);
        $hygiene = $this->hygieneSnapshot($start, $end);
        $devices = $this->deviceSnapshot($start, $end);
        $antibiotic = $this->antibioticSnapshot($start, $end);
        $environment = $this->environmentSnapshot($start, $end);
        $education = $this->educationSnapshot($start, $end);
        $incidents = IcIncident::whereBetween('incident_date', [$start, $end.' 23:59:59'])->count();
        $outbreaks = IcOutbreak::whereBetween('detection_date', [$start, $end])->count();

        return [
            ['key' => 'surveillance', 'label' => 'HAI Rate', 'value' => number_format($hai['rate'], 2), 'hint' => 'เป้า ≤ '.$targets['hai_rate'], 'met' => $hai['rate'] <= $targets['hai_rate']],
            ['key' => 'incidents', 'label' => 'อุบัติการณ์', 'value' => (string) $incidents, 'hint' => 'รายการในช่วงที่เลือก', 'met' => true],
            ['key' => 'hand-hygiene', 'label' => 'ล้างมือ', 'value' => number_format($hygiene['rate'], 1).'%', 'hint' => 'เป้า ≥ '.$targets['hand_hygiene'].'%', 'met' => $hygiene['rate'] >= $targets['hand_hygiene']],
            ['key' => 'device-days', 'label' => 'Patient Days', 'value' => number_format($devices['patient_days']), 'hint' => 'วันนอนสะสม', 'met' => true],
            ['key' => 'antibiotic', 'label' => 'ยาเหมาะสม', 'value' => number_format($antibiotic['rate'], 1).'%', 'hint' => 'เป้า ≥ '.$targets['antibiotic_appropriate'].'%', 'met' => $antibiotic['rate'] >= $targets['antibiotic_appropriate']],
            ['key' => 'outbreak', 'label' => 'การระบาด', 'value' => (string) $outbreaks, 'hint' => 'เหตุการณ์ที่ตรวจพบ', 'met' => $outbreaks === 0],
            ['key' => 'environment', 'label' => 'สิ่งแวดล้อมผ่าน', 'value' => number_format($environment['rate'], 1).'%', 'hint' => 'เป้า ≥ '.$targets['environment_pass'].'%', 'met' => $environment['rate'] >= $targets['environment_pass']],
            ['key' => 'education', 'label' => 'อบรม', 'value' => (string) $education['count'], 'hint' => number_format($education['participants']).' คน', 'met' => true],
        ];
    }

    private function overviewCharts(string $start, string $end): array
    {
        $targets = $this->targets();

        return [
            $this->line('HAI Rate', 'ต่อ 1,000 patient days', $this->monthlySurveillance($start, $end), 'hai_rate', $targets['hai_rate']),
            $this->line('อัตราการล้างมือ', '%', $this->monthlyHygiene($start, $end), 'rate', $targets['hand_hygiene']),
            $this->line('อุบัติการณ์', 'ราย', $this->monthlyIncidents($start, $end), 'count'),
            $this->line('อัตราผ่านสิ่งแวดล้อม', '%', $this->monthlyEnvironment($start, $end), 'rate', $targets['environment_pass']),
            $this->line('ความเหมาะสมของยาปฏิชีวนะ', '%', $this->monthlyAntibiotic($start, $end), 'rate', $targets['antibiotic_appropriate']),
            $this->line('ผู้เข้าอบรม', 'คน', $this->monthlyEducation($start, $end), 'participants'),
        ];
    }

    private function surveillanceSection(string $start, string $end, array $targets, int $limit): array
    {
        $snap = $this->haiSnapshot($start, $end);
        $rows = IcSurveillanceLog::with('reporter')
            ->whereBetween('infection_date', [$start, $end])
            ->orderByDesc('infection_date')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                $this->thaiDate($row->infection_date),
                $row->patient_name,
                $row->hn,
                $row->ward_name ?: '-',
                $row->infection_type,
                $row->organism ?: '-',
                $this->statusLabel($row->status),
            ])
            ->all();

        return [
            'title' => 'เฝ้าระวังการติดเชื้อ',
            'kpis' => [
                ['label' => 'HAI ที่ยืนยัน', 'value' => (string) $snap['count'], 'hint' => 'ราย'],
                ['label' => 'Patient Days', 'value' => number_format($snap['patient_days']), 'hint' => 'วัน'],
                ['label' => 'HAI Rate', 'value' => number_format($snap['rate'], 2), 'hint' => 'เป้า ≤ '.$targets['hai_rate']],
                ['label' => 'CAUTI / CLABSI / VAP', 'value' => $snap['cauti_rate'].' / '.$snap['clabsi_rate'].' / '.$snap['vap_rate'], 'hint' => 'ต่อ 1,000 device days'],
            ],
            'bars' => $this->barsFromPoints($this->monthlySurveillance($start, $end), 'hai_count', ''),
            'columns' => ['วันที่', 'ผู้ป่วย', 'HN', 'หอ', 'ชนิด', 'เชื้อ', 'สถานะ'],
            'rows' => $rows,
        ];
    }

    private function incidentSection(string $start, string $end, int $limit): array
    {
        $total = IcIncident::whereBetween('incident_date', [$start, $end.' 23:59:59'])->count();
        $open = IcIncident::whereBetween('incident_date', [$start, $end.' 23:59:59'])->where('status', '!=', 'resolved')->count();
        $rows = IcIncident::with('reporter')
            ->whereBetween('incident_date', [$start, $end.' 23:59:59'])
            ->orderByDesc('incident_date')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                $this->thaiDateTime($row->incident_date),
                $row->incident_type,
                $row->location,
                strtoupper((string) $row->severity),
                $this->statusLabel($row->status),
                $row->reporter?->name ?: '-',
            ])
            ->all();

        return [
            'title' => 'อุบัติการณ์',
            'kpis' => [
                ['label' => 'ทั้งหมด', 'value' => (string) $total, 'hint' => 'ราย'],
                ['label' => 'ยังไม่ปิด', 'value' => (string) $open, 'hint' => 'ราย'],
            ],
            'bars' => $this->incidentByType($start, $end),
            'columns' => ['วันเวลา', 'ประเภท', 'สถานที่', 'ความรุนแรง', 'สถานะ', 'ผู้รายงาน'],
            'rows' => $rows,
        ];
    }

    private function hygieneSection(string $start, string $end, array $targets, int $limit): array
    {
        $snap = $this->hygieneSnapshot($start, $end);
        $rows = IcHandHygieneObservation::query()
            ->whereBetween('observation_date', [$start, $end])
            ->orderByDesc('observation_date')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                $this->thaiDate($row->observation_date),
                $row->ward_name,
                $row->observer_name,
                $row->profession,
                (string) $row->total_opportunities,
                (string) $row->total_compliances,
                number_format($row->compliance_rate, 1).'%',
            ])
            ->all();

        return [
            'title' => 'ล้างมือ WHO 5 Moments',
            'kpis' => [
                ['label' => 'อัตราปฏิบัติ', 'value' => number_format($snap['rate'], 1).'%', 'hint' => 'เป้า ≥ '.$targets['hand_hygiene'].'%'],
                ['label' => 'โอกาส', 'value' => number_format($snap['opportunities']), 'hint' => 'ครั้ง'],
                ['label' => 'ปฏิบัติถูกต้อง', 'value' => number_format($snap['compliances']), 'hint' => 'ครั้ง'],
            ],
            'bars' => $this->barsFromPoints($this->monthlyHygiene($start, $end), 'rate', '%'),
            'columns' => ['วันที่', 'หอ', 'ผู้สังเกต', 'วิชาชีพ', 'โอกาส', 'ถูกต้อง', 'อัตรา'],
            'rows' => $rows,
        ];
    }

    private function deviceSection(string $start, string $end, int $limit): array
    {
        $snap = $this->deviceSnapshot($start, $end);
        $rows = IcDeviceDay::query()
            ->whereBetween('record_date', [$start, $end])
            ->orderByDesc('record_date')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                $this->thaiDate($row->record_date),
                $row->ward_name,
                (string) $row->patient_days,
                (string) $row->urinary_catheter_days,
                (string) $row->central_line_days,
                (string) $row->ventilator_days,
            ])
            ->all();

        return [
            'title' => 'Device Days',
            'kpis' => [
                ['label' => 'Patient Days', 'value' => number_format($snap['patient_days']), 'hint' => 'วัน'],
                ['label' => 'Catheter', 'value' => number_format($snap['catheter_days']), 'hint' => 'วัน'],
                ['label' => 'Central line', 'value' => number_format($snap['central_line_days']), 'hint' => 'วัน'],
                ['label' => 'Ventilator', 'value' => number_format($snap['ventilator_days']), 'hint' => 'วัน'],
            ],
            'bars' => $this->barsFromPoints($this->monthlyDevices($start, $end), 'patient_days', ''),
            'columns' => ['วันที่', 'หอ', 'Patient', 'Catheter', 'Central line', 'Ventilator'],
            'rows' => $rows,
        ];
    }

    private function antibioticSection(string $start, string $end, array $targets, int $limit): array
    {
        $snap = $this->antibioticSnapshot($start, $end);
        $rows = IcAntibioticUse::query()
            ->whereBetween('start_date', [$start, $end])
            ->orderByDesc('start_date')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                $this->thaiDate($row->start_date),
                $row->patient_name,
                $row->antibiotic_name,
                $row->antibiotic_class ?: '-',
                $row->indication,
                $this->statusLabel($row->appropriateness),
            ])
            ->all();

        return [
            'title' => 'ยาปฏิชีวนะ',
            'kpis' => [
                ['label' => 'รายการ', 'value' => (string) $snap['total'], 'hint' => 'ราย'],
                ['label' => 'เหมาะสม', 'value' => number_format($snap['rate'], 1).'%', 'hint' => 'เป้า ≥ '.$targets['antibiotic_appropriate'].'%'],
            ],
            'bars' => $this->antibioticByClass($start, $end),
            'columns' => ['เริ่มใช้', 'ผู้ป่วย', 'ยา', 'กลุ่ม', 'ข้อบ่งใช้', 'ความเหมาะสม'],
            'rows' => $rows,
        ];
    }

    private function outbreakSection(string $start, string $end, int $limit): array
    {
        $rows = IcOutbreak::with('cases')
            ->whereBetween('detection_date', [$start, $end])
            ->orderByDesc('detection_date')
            ->limit($limit)
            ->get();
        $cases = $rows->sum('total_cases');

        return [
            'title' => 'การระบาด',
            'kpis' => [
                ['label' => 'เหตุการณ์', 'value' => (string) $rows->count(), 'hint' => 'ราย'],
                ['label' => 'เคส', 'value' => (string) $cases, 'hint' => 'ราย'],
            ],
            'bars' => $this->barsFromPoints($this->monthlyOutbreaks($start, $end), 'count', ''),
            'columns' => ['ตรวจพบ', 'ชื่อ', 'พื้นที่', 'เชื้อ', 'เคส', 'สถานะ', 'มาตรการ'],
            'rows' => $rows->map(fn ($row) => [
                $this->thaiDate($row->detection_date),
                $row->outbreak_name,
                $row->affected_area,
                $row->pathogen ?: '-',
                (string) $row->total_cases,
                $this->statusLabel($row->status),
                $row->control_measures ?: '-',
            ])->all(),
        ];
    }

    private function environmentSection(string $start, string $end, array $targets, int $limit): array
    {
        $snap = $this->environmentSnapshot($start, $end);
        $rows = IcEnvironmentCheck::query()
            ->whereBetween('check_date', [$start, $end])
            ->orderByDesc('check_date')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                $this->thaiDate($row->check_date),
                $row->area_name,
                $row->check_type,
                $this->statusLabel($row->result),
                $row->organism_found ?: '-',
                $row->corrective_action ?: '-',
            ])
            ->all();

        return [
            'title' => 'สิ่งแวดล้อม',
            'kpis' => [
                ['label' => 'การตรวจ', 'value' => (string) $snap['total'], 'hint' => 'รายการ'],
                ['label' => 'อัตราผ่าน', 'value' => number_format($snap['rate'], 1).'%', 'hint' => 'เป้า ≥ '.$targets['environment_pass'].'%'],
                ['label' => 'ไม่ผ่าน', 'value' => (string) $snap['fail'], 'hint' => 'รายการ'],
            ],
            'bars' => $this->barsFromPoints($this->monthlyEnvironment($start, $end), 'rate', '%'),
            'columns' => ['วันที่', 'พื้นที่', 'ประเภท', 'ผล', 'เชื้อ', 'การแก้ไข'],
            'rows' => $rows,
        ];
    }

    private function educationSection(string $start, string $end, int $limit): array
    {
        $snap = $this->educationSnapshot($start, $end);
        $rows = IcEducationRecord::query()
            ->whereBetween('training_date', [$start, $end])
            ->orderByDesc('training_date')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                $this->thaiDate($row->training_date),
                $row->training_title,
                $row->topic,
                $row->trainer_name,
                (string) $row->total_participants,
                number_format((float) $row->pass_rate, 1).'%',
            ])
            ->all();

        return [
            'title' => 'การอบรม',
            'kpis' => [
                ['label' => 'ครั้ง', 'value' => (string) $snap['count'], 'hint' => 'หลักสูตร'],
                ['label' => 'ผู้เข้าอบรม', 'value' => number_format($snap['participants']), 'hint' => 'คน'],
                ['label' => 'อัตราผ่านเฉลี่ย', 'value' => number_format($snap['pass_rate'], 1).'%', 'hint' => 'จากหลักสูตรที่มีข้อมูล'],
            ],
            'bars' => $this->barsFromPoints($this->monthlyEducation($start, $end), 'participants', ''),
            'columns' => ['วันที่', 'หัวข้อ', 'เรื่อง', 'วิทยากร', 'ผู้เข้า', 'ผ่าน'],
            'rows' => $rows,
        ];
    }

    private function months(string $start, string $end): array
    {
        $cursor = Carbon::parse($start)->startOfMonth();
        $last = Carbon::parse($end)->startOfMonth();
        $months = [];
        $guard = 0;
        while ($cursor <= $last && $guard < 36) {
            $months[] = $cursor->copy();
            $cursor->addMonth();
            $guard++;
        }

        return $months;
    }

    private function monthLabel(Carbon $date): string
    {
        $names = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

        return ($names[$date->month] ?? '').' '.($date->year + 543);
    }

    private function monthlySurveillance(string $start, string $end): array
    {
        $points = [];
        foreach ($this->months($start, $end) as $month) {
            $counts = IcSurveillanceLog::where('status', 'confirmed')
                ->whereMonth('infection_date', $month->month)
                ->whereYear('infection_date', $month->year)
                ->selectRaw('infection_type, count(*) as total')
                ->groupBy('infection_type')
                ->pluck('total', 'infection_type');
            $devices = IcDeviceDay::whereMonth('record_date', $month->month)
                ->whereYear('record_date', $month->year)
                ->selectRaw('SUM(patient_days) as patient_days, SUM(urinary_catheter_days) as catheter_days, SUM(central_line_days) as central_line_days, SUM(ventilator_days) as ventilator_days')
                ->first();
            $hai = (int) $counts->sum();
            $patientDays = (int) ($devices->patient_days ?? 0);
            $points[] = [
                'label' => $this->monthLabel($month),
                'hai_count' => $hai,
                'hai_rate' => $patientDays > 0 ? round(($hai / $patientDays) * 1000, 2) : 0,
                'cauti_count' => (int) ($counts['CAUTI'] ?? 0),
                'clabsi_count' => (int) ($counts['CLABSI'] ?? 0),
                'vap_count' => (int) ($counts['VAP'] ?? 0),
            ];
        }

        return $points;
    }

    private function monthlyIncidents(string $start, string $end): array
    {
        $points = [];
        foreach ($this->months($start, $end) as $month) {
            $points[] = [
                'label' => $this->monthLabel($month),
                'count' => IcIncident::whereMonth('incident_date', $month->month)->whereYear('incident_date', $month->year)->count(),
            ];
        }

        return $points;
    }

    private function monthlyHygiene(string $start, string $end): array
    {
        $points = [];
        foreach ($this->months($start, $end) as $month) {
            $data = IcHandHygieneObservation::whereMonth('observation_date', $month->month)
                ->whereYear('observation_date', $month->year)
                ->selectRaw('
                    SUM(moment_1_opportunities + moment_2_opportunities + moment_3_opportunities + moment_4_opportunities + moment_5_opportunities) as opportunities,
                    SUM(moment_1_compliances + moment_2_compliances + moment_3_compliances + moment_4_compliances + moment_5_compliances) as compliances
                ')
                ->first();
            $opp = (int) ($data->opportunities ?? 0);
            $comp = (int) ($data->compliances ?? 0);
            $points[] = [
                'label' => $this->monthLabel($month),
                'rate' => $opp > 0 ? round(($comp / $opp) * 100, 1) : 0,
            ];
        }

        return $points;
    }

    private function monthlyDevices(string $start, string $end): array
    {
        $points = [];
        foreach ($this->months($start, $end) as $month) {
            $data = IcDeviceDay::whereMonth('record_date', $month->month)
                ->whereYear('record_date', $month->year)
                ->selectRaw('SUM(patient_days) as patient_days, SUM(urinary_catheter_days) as catheter_days, SUM(central_line_days) as central_line_days, SUM(ventilator_days) as ventilator_days')
                ->first();
            $points[] = [
                'label' => $this->monthLabel($month),
                'patient_days' => (int) ($data->patient_days ?? 0),
                'catheter_days' => (int) ($data->catheter_days ?? 0),
            ];
        }

        return $points;
    }

    private function monthlyAntibiotic(string $start, string $end): array
    {
        $points = [];
        foreach ($this->months($start, $end) as $month) {
            $reviewed = IcAntibioticUse::whereMonth('start_date', $month->month)
                ->whereYear('start_date', $month->year)
                ->whereIn('appropriateness', ['appropriate', 'inappropriate'])
                ->count();
            $appropriate = IcAntibioticUse::whereMonth('start_date', $month->month)
                ->whereYear('start_date', $month->year)
                ->where('appropriateness', 'appropriate')
                ->count();
            $points[] = [
                'label' => $this->monthLabel($month),
                'rate' => $reviewed > 0 ? round(($appropriate / $reviewed) * 100, 1) : 0,
            ];
        }

        return $points;
    }

    private function monthlyOutbreaks(string $start, string $end): array
    {
        $points = [];
        foreach ($this->months($start, $end) as $month) {
            $points[] = [
                'label' => $this->monthLabel($month),
                'count' => IcOutbreak::whereMonth('detection_date', $month->month)->whereYear('detection_date', $month->year)->count(),
            ];
        }

        return $points;
    }

    private function monthlyEnvironment(string $start, string $end): array
    {
        $points = [];
        foreach ($this->months($start, $end) as $month) {
            $total = IcEnvironmentCheck::whereMonth('check_date', $month->month)
                ->whereYear('check_date', $month->year)
                ->whereIn('result', ['pass', 'fail'])
                ->count();
            $passed = IcEnvironmentCheck::whereMonth('check_date', $month->month)
                ->whereYear('check_date', $month->year)
                ->where('result', 'pass')
                ->count();
            $points[] = [
                'label' => $this->monthLabel($month),
                'rate' => $total > 0 ? round(($passed / $total) * 100, 1) : 0,
            ];
        }

        return $points;
    }

    private function monthlyEducation(string $start, string $end): array
    {
        $points = [];
        foreach ($this->months($start, $end) as $month) {
            $query = IcEducationRecord::whereMonth('training_date', $month->month)->whereYear('training_date', $month->year);
            $points[] = [
                'label' => $this->monthLabel($month),
                'count' => (clone $query)->count(),
                'participants' => (int) (clone $query)->sum('total_participants'),
            ];
        }

        return $points;
    }

    private function incidentByType(string $start, string $end): array
    {
        return IcIncident::whereBetween('incident_date', [$start, $end.' 23:59:59'])
            ->selectRaw('incident_type as label, count(*) as value')
            ->groupBy('incident_type')
            ->orderByDesc('value')
            ->get()
            ->map(fn ($row) => ['label' => (string) $row->label, 'value' => (int) $row->value])
            ->all();
    }

    private function antibioticByClass(string $start, string $end): array
    {
        return IcAntibioticUse::whereBetween('start_date', [$start, $end])
            ->whereNotNull('antibiotic_class')
            ->selectRaw('antibiotic_class as label, count(*) as value')
            ->groupBy('antibiotic_class')
            ->orderByDesc('value')
            ->limit(8)
            ->get()
            ->map(fn ($row) => ['label' => (string) $row->label, 'value' => (int) $row->value])
            ->all();
    }

    private function haiSnapshot(string $start, string $end): array
    {
        $counts = IcSurveillanceLog::where('status', 'confirmed')
            ->whereBetween('infection_date', [$start, $end])
            ->selectRaw('infection_type, count(*) as total')
            ->groupBy('infection_type')
            ->pluck('total', 'infection_type');
        $devices = IcDeviceDay::whereBetween('record_date', [$start, $end])
            ->selectRaw('SUM(patient_days) as patient_days, SUM(urinary_catheter_days) as catheter_days, SUM(central_line_days) as central_line_days, SUM(ventilator_days) as ventilator_days')
            ->first();
        $hai = (int) $counts->sum();
        $patientDays = (int) ($devices->patient_days ?? 0);
        $cauti = (int) ($counts['CAUTI'] ?? 0);
        $clabsi = (int) ($counts['CLABSI'] ?? 0);
        $vap = (int) ($counts['VAP'] ?? 0);

        return [
            'count' => $hai,
            'patient_days' => $patientDays,
            'rate' => $patientDays > 0 ? round(($hai / $patientDays) * 1000, 2) : 0,
            'cauti_rate' => ($devices->catheter_days ?? 0) > 0 ? round(($cauti / $devices->catheter_days) * 1000, 2) : 0,
            'clabsi_rate' => ($devices->central_line_days ?? 0) > 0 ? round(($clabsi / $devices->central_line_days) * 1000, 2) : 0,
            'vap_rate' => ($devices->ventilator_days ?? 0) > 0 ? round(($vap / $devices->ventilator_days) * 1000, 2) : 0,
        ];
    }

    private function hygieneSnapshot(string $start, string $end): array
    {
        $data = IcHandHygieneObservation::whereBetween('observation_date', [$start, $end])
            ->selectRaw('
                SUM(moment_1_opportunities + moment_2_opportunities + moment_3_opportunities + moment_4_opportunities + moment_5_opportunities) as opportunities,
                SUM(moment_1_compliances + moment_2_compliances + moment_3_compliances + moment_4_compliances + moment_5_compliances) as compliances
            ')
            ->first();
        $opp = (int) ($data->opportunities ?? 0);
        $comp = (int) ($data->compliances ?? 0);

        return [
            'opportunities' => $opp,
            'compliances' => $comp,
            'rate' => $opp > 0 ? round(($comp / $opp) * 100, 1) : 0,
        ];
    }

    private function deviceSnapshot(string $start, string $end): array
    {
        $data = IcDeviceDay::whereBetween('record_date', [$start, $end])
            ->selectRaw('SUM(patient_days) as patient_days, SUM(urinary_catheter_days) as catheter_days, SUM(central_line_days) as central_line_days, SUM(ventilator_days) as ventilator_days')
            ->first();

        return [
            'patient_days' => (int) ($data->patient_days ?? 0),
            'catheter_days' => (int) ($data->catheter_days ?? 0),
            'central_line_days' => (int) ($data->central_line_days ?? 0),
            'ventilator_days' => (int) ($data->ventilator_days ?? 0),
        ];
    }

    private function antibioticSnapshot(string $start, string $end): array
    {
        $total = IcAntibioticUse::whereBetween('start_date', [$start, $end])->count();
        $reviewed = IcAntibioticUse::whereBetween('start_date', [$start, $end])
            ->whereIn('appropriateness', ['appropriate', 'inappropriate'])
            ->count();
        $appropriate = IcAntibioticUse::whereBetween('start_date', [$start, $end])
            ->where('appropriateness', 'appropriate')
            ->count();

        return [
            'total' => $total,
            'rate' => $reviewed > 0 ? round(($appropriate / $reviewed) * 100, 1) : 0,
        ];
    }

    private function environmentSnapshot(string $start, string $end): array
    {
        $base = IcEnvironmentCheck::whereBetween('check_date', [$start, $end])->whereIn('result', ['pass', 'fail']);
        $total = (clone $base)->count();
        $passed = (clone $base)->where('result', 'pass')->count();
        $fail = (clone $base)->where('result', 'fail')->count();

        return [
            'total' => IcEnvironmentCheck::whereBetween('check_date', [$start, $end])->count(),
            'fail' => $fail,
            'rate' => $total > 0 ? round(($passed / $total) * 100, 1) : 0,
        ];
    }

    private function educationSnapshot(string $start, string $end): array
    {
        $query = IcEducationRecord::whereBetween('training_date', [$start, $end]);

        return [
            'count' => (clone $query)->count(),
            'participants' => (int) (clone $query)->sum('total_participants'),
            'pass_rate' => round((float) ((clone $query)->avg('pass_rate') ?? 0), 1),
        ];
    }

    private function line(string $title, string $unit, array $points, string $key, ?float $target = null): array
    {
        return [
            'title' => $title,
            'kind' => 'line',
            'unit' => $unit,
            'target' => $target,
            'points' => array_map(fn ($point) => [
                'label' => $point['label'],
                'value' => (float) ($point[$key] ?? 0),
            ], $points),
        ];
    }

    private function bars(string $title, string $unit, array $rows): array
    {
        return [
            'title' => $title,
            'kind' => 'bar',
            'unit' => $unit,
            'target' => null,
            'points' => array_map(fn ($row) => [
                'label' => (string) ($row['label'] ?? ''),
                'value' => (float) ($row['value'] ?? 0),
            ], $rows),
        ];
    }

    private function barsFromPoints(array $points, string $key, string $suffix): array
    {
        $max = 0;
        foreach ($points as $point) {
            $max = max($max, (float) ($point[$key] ?? 0));
        }
        if ($max <= 0) {
            $max = 1;
        }

        return array_map(fn ($point) => [
            'label' => $point['label'],
            'value' => (float) ($point[$key] ?? 0),
            'width' => round(((float) ($point[$key] ?? 0) / $max) * 100, 1),
            'suffix' => $suffix,
        ], $points);
    }

    private function statusLabel(?string $status): string
    {
        return match ($status) {
            'suspected' => 'สงสัย',
            'confirmed' => 'ยืนยัน',
            'rejected' => 'ปฏิเสธ',
            'reported' => 'แจ้งแล้ว',
            'investigating' => 'สอบสวน',
            'resolved' => 'ปิดเรื่อง',
            'appropriate' => 'เหมาะสม',
            'inappropriate' => 'ไม่เหมาะสม',
            'need_review' => 'ต้องทบทวน',
            'pending' => 'รอตรวจ',
            'pass' => 'ผ่าน',
            'fail' => 'ไม่ผ่าน',
            'active' => 'กำลังระบาด',
            'controlled' => 'ควบคุมได้',
            default => $status ?: '-',
        };
    }

    private function thaiDate(mixed $date): string
    {
        if (! $date) {
            return '-';
        }
        $carbon = $date instanceof Carbon ? $date : Carbon::parse($date);

        return $carbon->format('d/m/').($carbon->year + 543);
    }

    private function thaiDateTime(mixed $date): string
    {
        if (! $date) {
            return '-';
        }
        $carbon = $date instanceof Carbon ? $date : Carbon::parse($date);

        return $carbon->timezone(config('app.timezone'))->format('d/m/').($carbon->year + 543).' '.$carbon->format('H:i');
    }
}
