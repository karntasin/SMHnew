<?php

namespace App\Http\Controllers;

use App\Models\Position;
use App\Models\StaffRoster;
use App\Services\HosxpService;
use App\Services\StaffRosterService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class StaffRosterController extends Controller
{
    public function __construct(
        private readonly StaffRosterService $rosterService,
    ) {}

    public function index(Request $request)
    {
        $search = trim((string) $request->input('search', ''));
        $status = (string) $request->input('status', 'all');

        $query = StaffRoster::query();

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('prefix', 'like', "%{$search}%")
                    ->orWhere('position', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('cid', 'like', "%{$search}%")
                    ->orWhere('role_name', 'like', "%{$search}%");
            });
        }

        if ($status === 'active') {
            $query->where('is_active', true);
        } elseif ($status === 'inactive') {
            $query->where('is_active', false);
        }

        $staff = $query->orderBy('first_name')->orderBy('last_name')
            ->paginate(20)
            ->withQueryString()
            ->through(function (StaffRoster $row) {
                $data = $row->toArray();
                $data['cid_masked'] = \App\Support\PiiMask::cid($row->cid);
                // รายการไม่ส่ง CID เต็มออกไปที่เบราว์เซอร์
                $data['cid'] = $data['cid_masked'];

                return $data;
            });

        return Inertia::render('settings/staff/Index', [
            'staff' => $staff,
            'filters' => [
                'search' => $search,
                'status' => in_array($status, ['all', 'active', 'inactive'], true) ? $status : 'all',
            ],
            'stats' => [
                'total' => StaffRoster::query()->count(),
                'active' => StaffRoster::query()->where('is_active', true)->count(),
                'inactive' => StaffRoster::query()->where('is_active', false)->count(),
            ],
            'roleLabels' => collect($this->rosterService->roleOptions())
                ->mapWithKeys(fn ($role) => [$role['value'] => $role['label']])
                ->all(),
        ]);
    }

    public function create()
    {
        return Inertia::render('settings/staff/Form', $this->formProps());
    }

    public function store(Request $request)
    {
        $validated = $this->validated($request);
        $this->rosterService->save($validated);

        return redirect()->route('settings.staff.index')
            ->with('success', 'เพิ่มรายชื่อเจ้าหน้าที่แล้ว — คนนี้จะสมัครเข้าใช้ระบบได้');
    }

    public function edit(StaffRoster $staffRoster)
    {
        return Inertia::render('settings/staff/Form', $this->formProps($staffRoster));
    }

    public function update(Request $request, StaffRoster $staffRoster)
    {
        $validated = $this->validated($request, $staffRoster);
        $this->rosterService->save($validated, $staffRoster);

        return redirect()->route('settings.staff.index')
            ->with('success', 'บันทึกข้อมูลเจ้าหน้าที่แล้ว');
    }

    public function destroy(StaffRoster $staffRoster)
    {
        $staffRoster->delete();

        return redirect()->route('settings.staff.index')
            ->with('success', 'ลบรายชื่อเจ้าหน้าที่แล้ว — คนนี้จะสมัครเข้าใช้ระบบไม่ได้');
    }

    public function toggle(StaffRoster $staffRoster)
    {
        $staffRoster->update(['is_active' => ! $staffRoster->is_active]);

        $message = $staffRoster->is_active
            ? 'เปิดสิทธิ์แล้ว — สามารถสมัครเข้าใช้ระบบได้'
            : 'ปิดสิทธิ์แล้ว — จะสมัครเข้าใช้ระบบไม่ได้';

        return back()->with('success', $message);
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:10240'],
            'replace' => ['nullable', 'boolean'],
        ], [
            'file.required' => 'กรุณาเลือกไฟล์ Excel',
            'file.mimes' => 'รองรับเฉพาะไฟล์ .xlsx .xls หรือ .csv',
        ]);

        $replace = $request->boolean('replace');
        $path = $request->file('file')->getRealPath();
        $rows = $this->rosterService->readExcelRows($path);

        if ($rows === []) {
            throw ValidationException::withMessages([
                'file' => 'ไม่พบข้อมูลในไฟล์ (ต้องมีแถวชื่อ-นามสกุลตั้งแต่แถวที่ 2)',
            ]);
        }

        $result = $this->rosterService->importRows($rows, $replace);

        return redirect()->route('settings.staff.index')->with(
            'success',
            sprintf(
                'นำเข้าแล้ว %d รายการ ข้าม %d แถว%s',
                $result['imported'],
                $result['skipped'],
                $replace ? ' (แทนที่รายชื่อเดิมทั้งหมด)' : ''
            )
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function formProps(?StaffRoster $staffRoster = null): array
    {
        $positionOptions = collect($this->rosterService->positionOptions())
            ->merge(Position::query()->orderBy('name')->pluck('name'))
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();

        return [
            'staffMember' => $staffRoster,
            'roleOptions' => $this->rosterService->roleOptions(),
            'positionOptions' => $positionOptions,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?StaffRoster $staffRoster = null): array
    {
        $cid = HosxpService::normalizeCid((string) $request->input('cid', ''));
        $request->merge([
            'cid' => $cid !== '' ? $cid : null,
            'position' => $request->input('position') === '__none__' ? null : $request->input('position'),
        ]);

        $validated = $request->validate([
            'prefix' => ['nullable', 'string', 'max:50'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'cid' => [
                'nullable',
                'string',
                'size:13',
                Rule::unique('staff_rosters', 'cid')->ignore($staffRoster?->id),
            ],
            'role_name' => ['required', 'string', 'max:100', Rule::exists('roles', 'name')],
            'is_active' => ['boolean'],
        ], [
            'first_name.required' => 'กรุณากรอกชื่อ',
            'last_name.required' => 'กรุณากรอกนามสกุล',
            'cid.size' => 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก',
            'cid.unique' => 'เลขบัตรประชาชนนี้มีในรายชื่อแล้ว',
            'role_name.required' => 'กรุณาเลือกบทบาท',
            'role_name.exists' => 'บทบาทที่เลือกไม่มีในระบบ',
        ]);

        if (! empty($validated['cid']) && ! HosxpService::isValidThaiCid($validated['cid'])) {
            throw ValidationException::withMessages([
                'cid' => 'เลขบัตรประชาชนไม่ถูกต้อง',
            ]);
        }

        $validated['is_active'] = $validated['is_active'] ?? true;

        return $validated;
    }
}
