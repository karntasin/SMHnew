<?php

namespace App\Http\Controllers\Ha;

use App\Http\Controllers\Controller;
use App\Models\HospitalProfile;
use App\Models\HospitalProfileRevision;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HospitalProfileController extends Controller
{
    /**
     * Display the hospital profile with all 7 tabs.
     */
    public function index(Request $request): Response
    {
        $profile = HospitalProfile::with(['revisions' => function ($q) {
            $q->orderBy('version_number', 'desc')->take(15);
        }, 'modifier'])->first();

        if (!$profile) {
            $profile = HospitalProfile::create([
                'code' => 'SURASINGHANAT',
                'hospital_name_th' => 'โรงพยาบาลค่ายสุรสิงหนาท',
                'hospital_name_en' => 'Fort Surasinghanat Hospital',
            ]);
        }

        $activeTab = $request->query('tab', 'front');

        return Inertia::render('Ha/HospitalProfile/Index', [
            'profile' => $profile,
            'activeTab' => $activeTab,
        ]);
    }

    /**
     * Show the editor form for hospital profile.
     */
    public function edit(Request $request): Response
    {
        $profile = HospitalProfile::with(['revisions' => function ($q) {
            $q->orderBy('version_number', 'desc');
        }])->firstOrFail();

        $activeTab = $request->query('tab', 'gen');

        return Inertia::render('Ha/HospitalProfile/Editor', [
            'profile' => $profile,
            'activeTab' => $activeTab,
        ]);
    }

    /**
     * Update the hospital profile and create a revision snapshot.
     */
    public function update(Request $request)
    {
        $profile = HospitalProfile::firstOrFail();

        $validated = $request->validate([
            'hospital_name_th' => 'required|string|max:255',
            'hospital_name_en' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'hospital_type' => 'nullable|string|max:100',
            'hospital_level' => 'nullable|string|max:100',
            'affiliation' => 'nullable|string|max:150',
            'registered_beds' => 'nullable|integer',
            'actual_beds' => 'nullable|integer',
            'occupancy_rate' => 'nullable|numeric',
            'service_area' => 'nullable|string',
            'network_hospitals' => 'nullable|string',
            'vision' => 'nullable|string',
            'mission' => 'nullable|string',
            'core_values' => 'nullable|string',
            'culture' => 'nullable|string',
            'core_competencies' => 'nullable|string',
            'strategic_objectives' => 'nullable|string',
            'strategic_focus' => 'nullable|string',
            'strategic_advantages' => 'nullable|string',
            'strategic_challenges' => 'nullable|string',
            'front_page_info' => 'nullable|array',
            'patient_profile' => 'nullable|array',
            'staff_profile' => 'nullable|array',
            'workload_data' => 'nullable|array',
            'entry_data' => 'nullable|array',
            'one_page_summary' => 'nullable|array',
            'change_summary' => 'nullable|string|max:255',
        ]);

        $summary = $request->input('change_summary') ?: 'อัปเดตข้อมูล Hospital Profile';

        $profile->fill($validated);
        $profile->last_modified_by = auth()->id();
        $profile->save();

        // Create snapshot revision
        $profile->createSnapshot($summary, auth()->id());

        return redirect()->route('ha.hospital-profile.index', ['tab' => $request->input('tab', 'gen')])
            ->with('success', 'บันทึกข้อมูล Hospital Profile เรียบร้อยแล้ว (สร้างเวอร์ชันใหม่ #' . $profile->current_version . ')');
    }

    /**
     * Restore a specific revision snapshot.
     */
    public function restoreRevision(HospitalProfileRevision $revision)
    {
        $profile = HospitalProfile::firstOrFail();

        $snapshot = $revision->snapshot_data;
        if (is_string($snapshot)) {
            $snapshot = json_decode($snapshot, true);
        }

        if (!$snapshot || !is_array($snapshot)) {
            return back()->with('error', 'ไม่สามารถกู้คืนข้อมูลได้ ข้อมูล snapshot ไม่ถูกต้อง');
        }

        $profile->fill($snapshot);
        $profile->last_modified_by = auth()->id();
        $profile->save();

        // Create new snapshot for restoration action
        $profile->createSnapshot("กู้คืนข้อมูลจากเวอร์ชัน #{$revision->version_number}", auth()->id());

        return back()->with('success', "กู้คืนข้อมูล Hospital Profile จากเวอร์ชัน #{$revision->version_number} เรียบร้อยแล้ว");
    }

    /**
     * Print view for Hospital Profile (OnePage or Full A4 Dossier).
     */
    public function print(Request $request): Response
    {
        $profile = HospitalProfile::firstOrFail();
        $mode = $request->query('mode', 'onepage'); // 'onepage' or 'full'

        return Inertia::render('Ha/HospitalProfile/PrintView', [
            'profile' => $profile,
            'mode' => $mode,
        ]);
    }
}
