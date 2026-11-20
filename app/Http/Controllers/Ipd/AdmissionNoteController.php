<?php

namespace App\Http\Controllers\Ipd;

use App\Http\Controllers\Controller;
use App\Models\IpdAdmissionNote;
use App\Services\Hosxp\IpdHosxpService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AdmissionNoteController extends Controller
{
    public function __construct(
        protected IpdHosxpService $hosxpService
    ) {}

    protected function checkRole(Request $request): void
    {
        $user = $request->user();
        if (!$user) {
            abort(401);
        }

        if (!$user->hasAnyRole(['admin', 'boss', 'doctor', 'superUser']) && !$user->can('ipd.admission-note')) {
            abort(403, 'หน้านี้สงวนสิทธิ์เฉพาะบทบาท Admin, Boss และ Doctor เท่านั้น');
        }
    }

    /**
     * หน้ารายการประวัติแบบบันทึก Admission Notes
     */
    public function index(Request $request)
    {
        $this->checkRole($request);

        $query = IpdAdmissionNote::with(['creator:id,name'])
            ->orderByDesc('id');

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('hn', 'like', "%{$search}%")
                  ->orWhere('an', 'like', "%{$search}%")
                  ->orWhere('patient_name', 'like', "%{$search}%")
                  ->orWhere('doctor_name', 'like', "%{$search}%");
            });
        }

        $notes = $query->paginate(15)->withQueryString();

        return Inertia::render('IPD/AdmissionNote/Index', [
            'notes' => $notes,
            'filters' => [
                'search' => $request->input('search', ''),
            ],
        ]);
    }

    /**
     * หน้าสร้างแบบบันทึก Admission Note ใหม่
     */
    public function create(Request $request)
    {
        $this->checkRole($request);

        $initialData = null;
        if ($request->filled('an')) {
            $initialData = $this->hosxpService->getAdmissionNotePrefill($request->input('an'));
        } elseif ($request->filled('vn')) {
            $initialData = $this->hosxpService->getAdmissionNotePrefill($request->input('vn'));
        } elseif ($request->filled('hn')) {
            $initialData = $this->hosxpService->getAdmissionNotePrefill($request->input('hn'));
        }

        // ดึงรายชื่อผู้ป่วยที่มาวันนี้เป็นตัวเลือกด่วน
        $recentAdmissions = $this->hosxpService->searchAdmissions('', 30, 'today');

        // ดึงรายชื่อแพทย์ที่มีเลข ว. จาก HOSxP
        $doctors = $this->hosxpService->getDoctorsWithLicense();

        return Inertia::render('IPD/AdmissionNote/Form', [
            'initialData' => $initialData,
            'recentAdmissions' => $recentAdmissions,
            'doctors' => $doctors,
            'note' => null,
            'isEdit' => false,
        ]);
    }

    /**
     * หน้าแก้ไขแบบบันทึกเดิม
     */
    public function edit(Request $request, IpdAdmissionNote $admission_note)
    {
        $this->checkRole($request);

        // ดึงรายชื่อแพทย์ที่มีเลข ว. จาก HOSxP
        $doctors = $this->hosxpService->getDoctorsWithLicense();

        return Inertia::render('IPD/AdmissionNote/Form', [
            'initialData' => $admission_note->form_data,
            'note' => $admission_note,
            'doctors' => $doctors,
            'isEdit' => true,
            'recentAdmissions' => [],
        ]);
    }

    /**
     * บันทึกข้อมูล Admission Note
     */
    public function store(Request $request)
    {
        $this->checkRole($request);

        $validated = $request->validate([
            'hn' => 'required|string',
            'an' => 'nullable|string',
            'vn' => 'nullable|string',
            'patient_name' => 'required|string',
            'age' => 'nullable|string',
            'gender' => 'nullable|string',
            'ward' => 'nullable|string',
            'pttype' => 'nullable|string',
            'admit_date' => 'nullable|string',
            'admit_time' => 'nullable|string',
            'hospital_name' => 'nullable|string',
            'form_data' => 'required|array',
            'lesion_image' => 'nullable|string',
            'lesion_na' => 'boolean',
            'doctor_name' => 'nullable|string',
            'doctor_license' => 'nullable|string',
            'status' => 'nullable|string',
        ]);

        $note = IpdAdmissionNote::create([
            'hn' => $validated['hn'],
            'an' => $validated['an'] ?? null,
            'vn' => $validated['vn'] ?? null,
            'patient_name' => $validated['patient_name'],
            'age' => $validated['age'] ?? null,
            'gender' => $validated['gender'] ?? null,
            'ward' => $validated['ward'] ?? null,
            'pttype' => $validated['pttype'] ?? null,
            'admit_date' => $validated['admit_date'] ?? null,
            'admit_time' => $validated['admit_time'] ?? null,
            'hospital_name' => $validated['hospital_name'] ?? 'โรงพยาบาลค่ายสุรสิงหนาท',
            'form_data' => $validated['form_data'],
            'lesion_image' => $validated['lesion_image'] ?? null,
            'lesion_na' => $validated['lesion_na'] ?? true,
            'doctor_name' => $validated['doctor_name'] ?? null,
            'doctor_license' => $validated['doctor_license'] ?? null,
            'status' => $validated['status'] ?? 'completed',
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'บันทึกแบบบันทึกสำเร็จ',
                'id' => $note->id,
            ]);
        }

        return redirect()->route('ipd.admission-notes.index')
            ->with('success', 'บันทึกแบบบันทึกการรับผู้ป่วยเรียบร้อยแล้ว');
    }

    /**
     * อัปเดตข้อมูล Admission Note
     */
    public function update(Request $request, IpdAdmissionNote $admission_note)
    {
        $this->checkRole($request);

        $validated = $request->validate([
            'hn' => 'required|string',
            'an' => 'nullable|string',
            'vn' => 'nullable|string',
            'patient_name' => 'required|string',
            'age' => 'nullable|string',
            'gender' => 'nullable|string',
            'ward' => 'nullable|string',
            'pttype' => 'nullable|string',
            'admit_date' => 'nullable|string',
            'admit_time' => 'nullable|string',
            'hospital_name' => 'nullable|string',
            'form_data' => 'required|array',
            'lesion_image' => 'nullable|string',
            'lesion_na' => 'boolean',
            'doctor_name' => 'nullable|string',
            'doctor_license' => 'nullable|string',
            'status' => 'nullable|string',
        ]);

        $admission_note->update([
            'hn' => $validated['hn'],
            'an' => $validated['an'] ?? null,
            'vn' => $validated['vn'] ?? null,
            'patient_name' => $validated['patient_name'],
            'age' => $validated['age'] ?? null,
            'gender' => $validated['gender'] ?? null,
            'ward' => $validated['ward'] ?? null,
            'pttype' => $validated['pttype'] ?? null,
            'admit_date' => $validated['admit_date'] ?? null,
            'admit_time' => $validated['admit_time'] ?? null,
            'hospital_name' => $validated['hospital_name'] ?? 'โรงพยาบาลค่ายสุรสิงหนาท',
            'form_data' => $validated['form_data'],
            'lesion_image' => $validated['lesion_image'] ?? null,
            'lesion_na' => $validated['lesion_na'] ?? true,
            'doctor_name' => $validated['doctor_name'] ?? null,
            'doctor_license' => $validated['doctor_license'] ?? null,
            'status' => $validated['status'] ?? $admission_note->status,
            'updated_by' => $request->user()->id,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'อัปเดตแบบบันทึกสำเร็จ',
                'id' => $admission_note->id,
            ]);
        }

        return redirect()->route('ipd.admission-notes.index')
            ->with('success', 'อัปเดตแบบบันทึกเรียบร้อยแล้ว');
    }

    /**
     * ลบแบบบันทึก
     */
    public function destroy(Request $request, IpdAdmissionNote $admission_note)
    {
        $this->checkRole($request);

        $admission_note->delete();

        return redirect()->route('ipd.admission-notes.index')
            ->with('success', 'ลบแบบบันทึกเรียบร้อยแล้ว');
    }

    /**
     * หน้าแสดงผลสำหรับสั่งพิมพ์แยกเดี่ยว (Dedicated Print View)
     */
    public function print(Request $request, IpdAdmissionNote $admission_note)
    {
        $this->checkRole($request);

        return Inertia::render('IPD/AdmissionNote/PrintView', [
            'formData' => $admission_note->form_data,
            'note' => $admission_note,
        ]);
    }

    /**
     * API: ค้นหารายการผู้ป่วยจาก HOSxP (รองรับทั้งผู้ป่วยมาตรวจวันนี้ และผู้ป่วยใน)
     */
    public function apiSearchPatients(Request $request)
    {
        $this->checkRole($request);

        $query = $request->input('q', '');
        $filter = $request->input('filter', 'all');
        $date = $request->input('date');
        $results = $this->hosxpService->searchAdmissions($query, 35, $filter, $date);

        return response()->json([
            'results' => $results,
        ]);
    }

    /**
     * API: ดึงประวัติการมารับบริการ (Visits) ย้อนหลังของผู้ป่วยตาม HN
     */
    public function apiGetPatientVisits(Request $request, string $hn)
    {
        $this->checkRole($request);

        $visits = $this->hosxpService->getPatientVisitHistory($hn, 25);

        return response()->json([
            'success' => true,
            'visits' => $visits,
        ]);
    }

    /**
     * API: ดึงข้อมูลเติมฟอร์มอัตโนมัติจาก HOSxP โดยใช้ AN, VN หรือ HN
     */
    public function apiGetPrefill(Request $request, string $identifier)
    {
        $this->checkRole($request);

        $data = $this->hosxpService->getAdmissionNotePrefill($identifier);

        if (!$data) {
            return response()->json([
                'success' => false,
                'message' => 'ไม่พบข้อมูลการตรวจหรือการ Admit ในฐานข้อมูล HOSxP',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * API: ค้นหารายชื่อแพทย์ที่มีเลข ว. จาก HOSxP
     */
    public function apiGetDoctors(Request $request)
    {
        $this->checkRole($request);

        $search = $request->input('q', '');
        $doctors = $this->hosxpService->getDoctorsWithLicense($search);

        return response()->json([
            'success' => true,
            'doctors' => $doctors,
        ]);
    }
}
