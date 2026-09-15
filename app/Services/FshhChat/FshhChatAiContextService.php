<?php

namespace App\Services\FshhChat;

use App\Data\UserGuideData;
use App\Models\Department;
use App\Models\Document;
use App\Models\EnvAsset;
use App\Models\Im\ServiceTicket;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\MaintenanceRequest;
use App\Models\MedicalEquipment;
use App\Models\MedicalEquipmentBorrowing;
use App\Models\MeetingRoom;
use App\Models\Menu;
use App\Models\QualityIndicator;
use App\Models\RoomBooking;
use App\Models\StaffRoster;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleBooking;
use App\Services\HosxpHospitalStatsService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class FshhChatAiContextService
{
    /**
     * Snapshot สำหรับ Workers AI — ไม่มีชื่อคนไข้ / CID / โทร / ที่อยู่
     * ยอดโรงพยาบาลดึงจาก Laravel (สูตรเดียวกับแดชบอร์ด) แล้วส่งให้ Worker — Worker ไม่ต่อ HOSxP
     *
     * @return array<string, mixed>
     */
    public function build(): array
    {
        $payload = [
            'updated_at' => now()->toIso8601String(),
            'policy' => 'ข้อมูลโรงพยาบาลใช้เฉพาะชุดเว็บแอป สูตรเดียวกับแดชบอร์ดหลัก ห้ามผสมกับเว็บภายนอก และห้ามตอบชื่อคนไข้ เลขบัตร เบอร์โทร ที่อยู่ หรือ HN/AN รายบุคคล',
            'howto' => $this->howto(),
            'menus' => $this->menus(),
            'leave' => $this->safe('leave', fn () => $this->leave()),
            'maintenance' => $this->safe('maintenance', fn () => $this->maintenance()),
            'room' => $this->safe('room', fn () => $this->rooms()),
            'vehicle' => $this->safe('vehicle', fn () => $this->vehicles()),
            'document' => $this->safe('document', fn () => $this->documents()),
            'equipment' => $this->safe('equipment', fn () => $this->equipment()),
            'staff' => $this->safe('staff', fn () => $this->staff()),
            'env' => $this->safe('env', fn () => $this->envAssets()),
            'quality' => $this->safe('quality', fn () => $this->quality()),
            'stats' => $this->safe('stats', fn () => $this->hospitalStats()),
            'it' => $this->safe('it', fn () => $this->itTickets()),
        ];

        $payload['summary'] = [
            'leave_pending' => (int) data_get($payload, 'leave.pending_total', 0),
            'maintenance_open' => (int) data_get($payload, 'maintenance.open_total', 0),
            'room_today' => (int) data_get($payload, 'room.today_count', 0),
            'vehicle_pending' => (int) data_get($payload, 'vehicle.pending', 0),
            'document_pending' => (int) data_get($payload, 'document.pending', 0),
            'equipment_active' => (int) data_get($payload, 'equipment.active_borrowings', 0),
            'staff_active' => (int) data_get($payload, 'staff.active', 0),
            'it_open' => (int) data_get($payload, 'it.open', 0),
            'opd_today' => (int) data_get($payload, 'stats.today.opd', 0),
            'ipd_census' => (int) data_get($payload, 'stats.today.ipd_census', 0),
            'er_today' => (int) data_get($payload, 'stats.today.er', 0),
            'appointment_today' => (int) data_get($payload, 'stats.today.appointments.scheduled', 0),
            'appointment_came_today' => (int) data_get($payload, 'stats.today.appointments.came', 0),
            'revenue_today' => (float) data_get($payload, 'stats.today.opd_cost', 0),
        ];

        return $this->redactTree($payload);
    }

    /**
     * @param  callable(): array<string, mixed>  $fn
     * @return array<string, mixed>
     */
    private function safe(string $name, callable $fn): array
    {
        try {
            return $fn();
        } catch (\Throwable $e) {
            Log::warning('FSHH AI context skipped: '.$name, ['error' => $e->getMessage()]);

            return ['available' => false];
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function howto(): array
    {
        $skip = ['dashboard', 'hosxp-reports', 'finance', 'mra', 'ic'];
        $items = [];
        foreach (UserGuideData::modules() as $module) {
            $id = (string) ($module['id'] ?? '');
            if (in_array($id, $skip, true)) {
                continue;
            }
            $items[] = [
                'title' => $module['title'] ?? '',
                'path' => $module['path'] ?? '',
                'blurb' => $module['subtitle'] ?? '',
                'features' => array_slice($module['features'] ?? [], 0, 4),
            ];
        }
        array_unshift($items, [
            'title' => 'ระบบบันทึกการลา',
            'path' => '/administration/leave',
            'blurb' => 'ยื่นใบลา → หัวหน้าอนุมัติ → ฝ่ายธุรการตรวจวันลา → ผู้อำนวยการอนุมัติ',
            'features' => ['ยื่นใบลา', 'รออนุมัติ', 'ตรวจวันลาคงเหลือ', 'ดาวน์โหลด PDF'],
        ]);

        return $items;
    }

    /**
     * @return list<array<string, string>>
     */
    private function menus(): array
    {
        if (! Schema::hasTable('menus')) {
            return [];
        }

        return Menu::query()
            ->whereNull('parent_id')
            ->orderBy('order')
            ->get(['title', 'route'])
            ->map(fn (Menu $m) => [
                'title' => (string) $m->title,
                'route' => (string) ($m->route ?? ''),
            ])
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function leave(): array
    {
        if (! Schema::hasTable('leave_requests')) {
            return ['available' => false];
        }

        $byStatus = LeaveRequest::query()
            ->selectRaw('status, count(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status')
            ->map(fn ($v) => (int) $v)
            ->all();

        $pendingKeys = ['pending_supervisor', 'pending_hr', 'pending_director'];
        $pendingTotal = 0;
        foreach ($pendingKeys as $key) {
            $pendingTotal += (int) ($byStatus[$key] ?? 0);
        }

        $types = [];
        if (Schema::hasTable('leave_types')) {
            $types = LeaveType::query()->orderBy('sort_order')->get(['name', 'code', 'max_days_per_year'])
                ->map(fn (LeaveType $t) => [
                    'name' => $t->name,
                    'code' => $t->code,
                    'max_days' => $t->max_days_per_year,
                ])->all();
        }

        $recent = LeaveRequest::query()
            ->with(['leaveType', 'user.department'])
            ->latest()
            ->limit(12)
            ->get()
            ->map(fn (LeaveRequest $row) => [
                'number' => $row->request_number,
                'type' => $row->leaveType?->name,
                'status' => LeaveRequest::STATUS_LABELS[$row->status] ?? $row->status,
                'days' => $row->total_days,
                'start' => optional($row->start_date)->toDateString(),
                'end' => optional($row->end_date)->toDateString(),
                'staff' => $row->user?->chat_name,
                'department' => $row->user?->department?->name,
            ])->all();

        return [
            'available' => true,
            'by_status' => $byStatus,
            'pending_total' => $pendingTotal,
            'types' => $types,
            'recent' => $recent,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function maintenance(): array
    {
        if (! Schema::hasTable('maintenance_requests')) {
            return ['available' => false];
        }

        $byStatus = MaintenanceRequest::query()
            ->selectRaw('status, count(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status')
            ->map(fn ($v) => (int) $v)
            ->all();

        $open = MaintenanceRequest::query()
            ->whereNotIn('status', ['completed', 'cancelled', 'closed', 'rejected'])
            ->count();

        $recent = MaintenanceRequest::query()
            ->latest()
            ->limit(10)
            ->get(['ticket_number', 'title', 'location', 'status', 'created_at'])
            ->map(fn (MaintenanceRequest $row) => [
                'number' => $row->ticket_number,
                'title' => $row->title,
                'place' => $row->location,
                'status' => $row->status,
                'created' => optional($row->created_at)->toDateTimeString(),
            ])->all();

        return [
            'available' => true,
            'by_status' => $byStatus,
            'open_total' => $open,
            'recent' => $recent,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function rooms(): array
    {
        if (! Schema::hasTable('room_bookings')) {
            return ['available' => false];
        }

        $byStatus = RoomBooking::query()
            ->selectRaw('status, count(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status')
            ->map(fn ($v) => (int) $v)
            ->all();

        $today = RoomBooking::query()
            ->with('room')
            ->whereDate('start_time', now()->toDateString())
            ->whereNotIn('status', ['rejected', 'cancelled'])
            ->orderBy('start_time')
            ->get()
            ->map(fn (RoomBooking $row) => [
                'room' => $row->room?->name,
                'title' => $row->title,
                'start' => optional($row->start_time)->format('H:i'),
                'end' => optional($row->end_time)->format('H:i'),
                'status' => $row->status,
            ])->all();

        $rooms = Schema::hasTable('meeting_rooms')
            ? MeetingRoom::query()->orderBy('name')->get(['name', 'capacity', 'status', 'is_active'])
                ->map(fn (MeetingRoom $r) => [
                    'name' => $r->name,
                    'capacity' => $r->capacity,
                    'active' => (bool) $r->is_active,
                ])->all()
            : [];

        return [
            'available' => true,
            'by_status' => $byStatus,
            'today_count' => count($today),
            'today' => $today,
            'rooms' => $rooms,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function vehicles(): array
    {
        if (! Schema::hasTable('vehicle_bookings')) {
            return ['available' => false];
        }

        $byStatus = VehicleBooking::query()
            ->selectRaw('status, count(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status')
            ->map(fn ($v) => (int) $v)
            ->all();

        $recent = VehicleBooking::query()
            ->with('vehicle')
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn (VehicleBooking $row) => [
                'number' => $row->booking_number,
                'purpose' => $row->purpose,
                'destination' => $row->destination,
                'status' => $row->status,
                'start' => optional($row->start_datetime)->toDateTimeString(),
                'vehicle' => $row->vehicle
                    ? trim((string) ($row->vehicle->brand.' '.$row->vehicle->model.' '.$row->vehicle->license_plate))
                    : null,
            ])->all();

        $fleet = Schema::hasTable('vehicles')
            ? Vehicle::query()->get(['brand', 'model', 'license_plate', 'status'])->map(fn (Vehicle $v) => [
                'name' => trim((string) ($v->brand.' '.$v->model)),
                'plate' => $v->license_plate,
                'status' => $v->status,
            ])->all()
            : [];

        return [
            'available' => true,
            'by_status' => $byStatus,
            'pending' => (int) ($byStatus['pending'] ?? 0),
            'recent' => $recent,
            'fleet' => $fleet,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function documents(): array
    {
        if (! Schema::hasTable('documents')) {
            return ['available' => false];
        }

        $byStatus = Document::query()
            ->selectRaw('status, count(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status')
            ->map(fn ($v) => (int) $v)
            ->all();

        $recent = Document::query()
            ->with('department')
            ->latest()
            ->limit(10)
            ->get(['document_number', 'title', 'status', 'document_date', 'department_id'])
            ->map(fn (Document $row) => [
                'number' => $row->document_number,
                'title' => $row->title,
                'status' => $row->status,
                'date' => optional($row->document_date)->toDateString(),
                'department' => $row->department?->name,
            ])->all();

        $pending = (int) ($byStatus['pending'] ?? 0) + (int) ($byStatus['in_progress'] ?? 0);

        return [
            'available' => true,
            'by_status' => $byStatus,
            'pending' => $pending,
            'recent' => $recent,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function equipment(): array
    {
        if (! Schema::hasTable('medical_equipment_borrowings')) {
            return ['available' => false];
        }

        $byStatus = MedicalEquipmentBorrowing::query()
            ->selectRaw('status, count(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status')
            ->map(fn ($v) => (int) $v)
            ->all();

        $active = MedicalEquipmentBorrowing::query()
            ->whereIn('status', ['approved', 'borrowed', 'pending'])
            ->count();

        $recent = MedicalEquipmentBorrowing::query()
            ->with(['equipment', 'department'])
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn (MedicalEquipmentBorrowing $row) => [
                'number' => $row->borrowing_number,
                'item' => $row->equipment?->name,
                'qty' => $row->quantity,
                'status' => $row->status,
                'department' => $row->department?->name,
                'expected_return' => optional($row->expected_return_date)->toDateString(),
            ])->all();

        $stock = Schema::hasTable('medical_equipment')
            ? MedicalEquipment::query()->where('is_active', true)->limit(40)->get(['name', 'quantity_total', 'quantity_available', 'status'])
                ->map(fn (MedicalEquipment $e) => [
                    'name' => $e->name,
                    'total' => $e->quantity_total,
                    'available' => $e->quantity_available,
                    'status' => $e->status,
                ])->all()
            : [];

        return [
            'available' => true,
            'by_status' => $byStatus,
            'active_borrowings' => $active,
            'recent' => $recent,
            'stock' => $stock,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function staff(): array
    {
        $departments = Schema::hasTable('departments')
            ? Department::query()->orderBy('name')->get(['name', 'code', 'is_active'])
                ->map(fn (Department $d) => [
                    'name' => $d->name,
                    'code' => $d->code,
                    'active' => (bool) $d->is_active,
                ])->all()
            : [];

        $usersByDept = [];
        if (Schema::hasTable('users') && Schema::hasTable('departments')) {
            $usersByDept = User::query()
                ->with('department')
                ->where('profile_completed', true)
                ->get(['id', 'name', 'chat_display_name', 'position', 'department_id'])
                ->groupBy(fn (User $u) => $u->department?->name ?: 'ไม่ระบุแผนก')
                ->map(fn ($group) => $group->count())
                ->all();
        }

        $roster = ['active' => 0, 'by_role' => [], 'people' => []];
        if (Schema::hasTable('staff_rosters')) {
            $active = StaffRoster::query()->where('is_active', true);
            $roster['active'] = (clone $active)->count();
            $roster['by_role'] = (clone $active)
                ->selectRaw('role_name, count(*) as c')
                ->groupBy('role_name')
                ->pluck('c', 'role_name')
                ->map(fn ($v) => (int) $v)
                ->all();
            $roster['people'] = StaffRoster::query()
                ->where('is_active', true)
                ->orderBy('first_name')
                ->limit(80)
                ->get(['prefix', 'first_name', 'last_name', 'position', 'role_name'])
                ->map(fn (StaffRoster $s) => [
                    'name' => $s->fullName(),
                    'position' => $s->position,
                    'role' => $s->role_name,
                ])->all();
        }

        return [
            'available' => true,
            'departments' => $departments,
            'users_by_department' => $usersByDept,
            'active' => $roster['active'] ?: array_sum($usersByDept),
            'by_role' => $roster['by_role'],
            'people' => $roster['people'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function envAssets(): array
    {
        if (! Schema::hasTable('env_assets')) {
            return ['available' => false];
        }

        $byStatus = EnvAsset::query()
            ->selectRaw('registry_status, count(*) as c')
            ->groupBy('registry_status')
            ->pluck('c', 'registry_status')
            ->map(fn ($v) => (int) $v)
            ->all();

        return [
            'available' => true,
            'total' => array_sum($byStatus),
            'by_status' => $byStatus,
            'status_labels' => EnvAsset::REGISTRY_STATUSES,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function quality(): array
    {
        if (! Schema::hasTable('quality_indicators')) {
            return ['available' => false];
        }

        $items = QualityIndicator::query()
            ->with(['department:id,name', 'team:id,name_th,abbreviation'])
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'department_id', 'team_id', 'unit', 'target_value']);

        $grouped = [];
        foreach ($items as $row) {
            $dept = trim((string) ($row->department?->name ?: $row->team?->name_th ?: 'ไม่ระบุแผนก'));
            if (! isset($grouped[$dept])) {
                $grouped[$dept] = [];
            }
            $grouped[$dept][] = $row->name;
        }

        $byDepartment = [];
        foreach ($grouped as $dept => $names) {
            $byDepartment[] = [
                'department' => $dept,
                'count' => count($names),
                'names' => $names,
            ];
        }
        usort($byDepartment, fn ($a, $b) => $b['count'] <=> $a['count']);

        return [
            'available' => true,
            'count' => $items->count(),
            'by_department' => $byDepartment,
        ];
    }

    /**
     * ยอดรวมจากเว็บแอป (สูตรเดียวกับแดชบอร์ดหลัก) ไม่มีชื่อคนไข้ / HN / CID
     *
     * @return array<string, mixed>
     */
    private function hospitalStats(): array
    {
        return Cache::remember('fshh_ai_hospital_stats_v4', 300, function () {
            return app(HosxpHospitalStatsService::class)->chatSnapshot();
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function itTickets(): array
    {
        if (! Schema::hasTable('im_service_tickets')) {
            return ['available' => false];
        }

        $byStatus = ServiceTicket::query()
            ->selectRaw('status, count(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status')
            ->map(fn ($v) => (int) $v)
            ->all();

        $open = ServiceTicket::query()
            ->whereNotIn('status', ['closed', 'resolved', 'cancelled'])
            ->count();

        $recent = ServiceTicket::query()
            ->latest()
            ->limit(8)
            ->get(['ticket_no', 'title', 'department', 'category', 'priority', 'status'])
            ->map(fn (ServiceTicket $t) => [
                'number' => $t->ticket_no,
                'title' => $t->title,
                'department' => $t->department,
                'category' => $t->category,
                'priority' => $t->priority,
                'status' => $t->status,
            ])->all();

        return [
            'available' => true,
            'by_status' => $byStatus,
            'open' => $open,
            'recent' => $recent,
        ];
    }

    private function redactTree(mixed $value): mixed
    {
        if (is_array($value)) {
            $out = [];
            foreach ($value as $key => $item) {
                if ($this->isBlockedKey((string) $key)) {
                    continue;
                }
                $out[$key] = $this->redactTree($item);
            }

            return $out;
        }
        if (is_string($value)) {
            return $this->redactText($value);
        }

        return $value;
    }

    private function isBlockedKey(string $key): bool
    {
        $key = strtolower($key);

        return (bool) preg_match(
            '/^(cid|id_card|citizen|phone|tel|mobile|address|contact_phone|contact_address|patient_hn|hn|an|patient_name|patient)$/',
            $key
        );
    }

    private function redactText(string $text): string
    {
        $text = preg_replace('/\b\d{13}\b/', '[ข้อมูลส่วนตัว]', $text) ?? $text;
        $text = preg_replace('/\b(?:HN|AN)\s*[:#-]?\s*\d+\b/i', '[รหัสเวชระเบียน]', $text) ?? $text;
        $text = preg_replace('/(?<!\d)(0[0-9]{8,9})(?!\d)/', '[โทร]', $text) ?? $text;

        return $text;
    }
}
