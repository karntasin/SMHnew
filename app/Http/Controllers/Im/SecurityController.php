<?php

namespace App\Http\Controllers\Im;

use App\Http\Controllers\Controller;
use App\Models\Im\AwarenessRecord;
use App\Models\Im\BackupLog;
use App\Models\Im\BcpDrill;
use App\Models\Im\Policy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SecurityController extends Controller
{
    public function index(): Response
    {
        $policies = Policy::latest()->get();
        $awareness = AwarenessRecord::with('policy:id,title')->latest('tested_at')->take(200)->get();
        $drills = BcpDrill::with('creator:id,name')->latest('drill_date')->take(100)->get();
        $backups = BackupLog::latest('backup_date')->take(60)->get();

        $totalStaff = $awareness->count();
        $passed = $awareness->where('passed', true)->count();

        return Inertia::render('Im/Security', [
            'policies' => $policies,
            'awareness' => $awareness,
            'drills' => $drills,
            'backups' => $backups,
            'summary' => [
                'policies' => $policies->count(),
                'pdpa' => $policies->where('type', 'pdpa')->count(),
                'awareness_rate' => $totalStaff ? round($passed / $totalStaff * 100) : 0,
                'awareness_total' => $totalStaff,
                'drills' => $drills->count(),
                'drill_pass' => $drills->where('result', 'pass')->count(),
                'backup_success' => $backups->where('status', 'success')->count(),
                'backup_total' => $backups->count(),
            ],
        ]);
    }

    public function storePolicy(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'required|in:security,pdpa,other',
            'version' => 'required|string|max:24',
            'summary' => 'nullable|string',
            'effective_date' => 'nullable|date',
            'status' => 'nullable|in:draft,published,archived',
            'file' => 'nullable|file|max:20480',
        ]);

        if ($request->hasFile('file')) {
            $data['file_path'] = $request->file('file')->store('im/policies', 'public');
        }
        unset($data['file']);
        $data['created_by'] = Auth::id();

        Policy::create($data);

        return back()->with('success', 'เพิ่มนโยบายเรียบร้อย');
    }

    public function updatePolicy(Request $request, Policy $policy)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'required|in:security,pdpa,other',
            'version' => 'required|string|max:24',
            'summary' => 'nullable|string',
            'effective_date' => 'nullable|date',
            'status' => 'nullable|in:draft,published,archived',
            'file' => 'nullable|file|max:20480',
        ]);

        if ($request->hasFile('file')) {
            if ($policy->file_path) {
                Storage::disk('public')->delete($policy->file_path);
            }
            $data['file_path'] = $request->file('file')->store('im/policies', 'public');
        }
        unset($data['file']);

        $policy->update($data);

        return back()->with('success', 'อัปเดตนโยบายเรียบร้อย');
    }

    public function destroyPolicy(Policy $policy)
    {
        if ($policy->file_path) {
            Storage::disk('public')->delete($policy->file_path);
        }
        $policy->delete();

        return back()->with('success', 'ลบนโยบายเรียบร้อย');
    }

    public function storeAwareness(Request $request)
    {
        $data = $request->validate([
            'staff_name' => 'required|string|max:255',
            'department' => 'nullable|string|max:255',
            'policy_id' => 'nullable|exists:im_policies,id',
            'score' => 'required|integer|min:0',
            'max_score' => 'required|integer|min:1',
            'tested_at' => 'nullable|date',
        ]);
        $data['passed'] = $data['score'] >= ($data['max_score'] * 0.8);

        AwarenessRecord::create($data);

        return back()->with('success', 'บันทึกผลประเมินความเข้าใจเรียบร้อย');
    }

    public function destroyAwareness(AwarenessRecord $record)
    {
        $record->delete();

        return back()->with('success', 'ลบรายการเรียบร้อย');
    }

    public function storeDrill(Request $request)
    {
        $data = $request->validate([
            'system_name' => 'required|string|max:255',
            'type' => 'required|in:BCP,DRP',
            'scope' => 'nullable|string',
            'drill_date' => 'required|date',
            'duration_seconds' => 'nullable|integer|min:0',
            'rto_target_minutes' => 'nullable|integer|min:0',
            'result' => 'required|in:pass,partial,fail',
            'report' => 'nullable|string',
            'improvements' => 'nullable|string',
        ]);
        $data['created_by'] = Auth::id();

        BcpDrill::create($data);

        return back()->with('success', 'บันทึกการซ้อมแผนเรียบร้อย');
    }

    public function destroyDrill(BcpDrill $drill)
    {
        $drill->delete();

        return back()->with('success', 'ลบรายการเรียบร้อย');
    }

    public function storeBackup(Request $request)
    {
        $data = $request->validate([
            'backup_date' => 'required|date',
            'type' => 'required|in:offline,online',
            'scope' => 'nullable|string|max:255',
            'status' => 'required|in:success,partial,failed',
            'size_gb' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'performed_by' => 'nullable|string|max:255',
        ]);

        BackupLog::create($data);

        return back()->with('success', 'บันทึกการสำรองข้อมูลเรียบร้อย');
    }

    public function destroyBackup(BackupLog $backup)
    {
        $backup->delete();

        return back()->with('success', 'ลบรายการเรียบร้อย');
    }
}
