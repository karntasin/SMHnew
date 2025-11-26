<?php

namespace App\Http\Controllers\Mra;

use App\Http\Controllers\Controller;
use App\Models\Mra\MraAudit;
use App\Models\Mra\MraAuditDetail;
use App\Models\Hosxp\Patient;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class MraController extends Controller
{
    public function index()
    {
        $audits = MraAudit::with('auditor')
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return Inertia::render('MRA/Index', [
            'audits' => $audits,
        ]);
    }

    public function dashboard()
    {
        // Mock stats for now
        $stats = [
            'total_audits' => MraAudit::count(),
            'pending_audits' => MraAudit::where('status', 'pending')->count(),
            'accuracy_rate' => 85, // Placeholder
            'top_errors' => MraAuditDetail::where('is_correct', false)
                ->select('error_type', \DB::raw('count(*) as total'))
                ->groupBy('error_type')
                ->orderBy('total', 'desc')
                ->take(5)
                ->get(),
        ];

        return Inertia::render('MRA/Dashboard', [
            'stats' => $stats,
        ]);
    }

    public function create()
    {
        // In a real HOSxP scenario, we would fetch recent visits here
        // For now, we'll just render the form where they can manually enter or "search"
        return Inertia::render('MRA/Create');
    }

    public function searchPatient(Request $request)
    {
        $hn = $request->input('hn');
        
        if (!$hn) {
            return response()->json(['error' => 'HN is required'], 400);
        }

        // Try to find patient with exact HN first, then try padded HN
        try {
            $patient = Patient::where('hn', $hn)->select('hn', 'pname', 'fname', 'lname', 'cid')->first();

            if (!$patient) {
                // Pad HN to 9 digits (standard HOSxP format)
                $paddedHn = str_pad($hn, 9, '0', STR_PAD_LEFT);
                $patient = Patient::where('hn', $paddedHn)->select('hn', 'pname', 'fname', 'lname', 'cid')->first();
            }

            if ($patient) {
                return response()->json([
                    'hn' => $patient->hn,
                    'patient_name' => $patient->pname . $patient->fname . ' ' . $patient->lname,
                    // We could also fetch the latest VN here if we had a VnStat model
                ]);
            } else {
                return response()->json(['error' => 'Patient not found'], 404);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'Database connection error: ' . $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vn' => 'nullable|string',
            'an' => 'nullable|string',
            'hn' => 'required|string',
            'patient_name' => 'required|string',
            'visit_date' => 'required|date',
            'doctor_name' => 'nullable|string',
            'department' => 'nullable|string',
            'details' => 'array',
        ]);

        $audit = MraAudit::create([
            ...$validated,
            'auditor_id' => Auth::id(),
            'status' => 'pending',
        ]);

        if (!empty($validated['details'])) {
            foreach ($validated['details'] as $detail) {
                $audit->details()->create($detail);
            }
        }

        return redirect()->route('mra.index')->with('success', 'Audit created successfully.');
    }

    public function show(MraAudit $audit)
    {
        $audit->load(['details', 'auditor']);
        return Inertia::render('MRA/Show', [
            'audit' => $audit,
        ]);
    }

    public function update(Request $request, MraAudit $audit)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,audited,corrected',
            'summary_notes' => 'nullable|string',
            'details' => 'array',
            'details.*.category' => 'required|string',
            'details.*.item_code' => 'nullable|string',
            'details.*.is_correct' => 'boolean',
            'details.*.correct_value' => 'nullable|string',
            'details.*.error_type' => 'nullable|string',
            'details.*.auditor_comment' => 'nullable|string',
        ]);

        $audit->update([
            'status' => $validated['status'],
            'summary_notes' => $validated['summary_notes'] ?? $audit->summary_notes,
        ]);

        // Sync details
        // Strategy: Delete all existing and re-create (simple) or update by ID (better)
        // For simplicity in this prototype, we will delete and re-create to ensure clean state
        $audit->details()->delete();

        if (!empty($validated['details'])) {
            foreach ($validated['details'] as $detail) {
                $audit->details()->create($detail);
            }
        }

        // Calculate scores/accuracy if needed
        // $totalItems = count($validated['details']);
        // $correctItems = collect($validated['details'])->where('is_correct', true)->count();
        // $audit->update(['total_score' => ...]);

        return redirect()->back()->with('success', 'Audit updated successfully.');
    }
}
