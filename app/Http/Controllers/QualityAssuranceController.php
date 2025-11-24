<?php

namespace App\Http\Controllers;

use App\Models\QualityReview;
use App\Models\QualityAudit;
use App\Models\QualityImprovement;
use Illuminate\Http\Request;
use Inertia\Inertia;

class QualityAssuranceController extends Controller
{
    public function index()
    {
        return Inertia::render('QualityAssurance/Index', [
            'reviews' => QualityReview::orderBy('schedule_date', 'desc')->get(),
            'audits' => QualityAudit::orderBy('audit_date', 'desc')->get(),
            'improvements' => QualityImprovement::orderBy('updated_at', 'desc')->get(),
        ]);
    }

    // Reviews
    public function storeReview(Request $request)
    {
        $validated = $request->validate([
            'topic' => 'required|string',
            'review_type' => 'required|string',
            'schedule_date' => 'required|date',
            'reviewer' => 'nullable|string',
            'status' => 'required|string',
            'findings' => 'nullable|string',
        ]);

        QualityReview::create($validated);
        return redirect()->back()->with('success', 'Review scheduled successfully.');
    }

    public function updateReview(Request $request, QualityReview $review)
    {
        $validated = $request->validate([
            'topic' => 'required|string',
            'review_type' => 'required|string',
            'schedule_date' => 'required|date',
            'reviewer' => 'nullable|string',
            'status' => 'required|string',
            'findings' => 'nullable|string',
        ]);

        $review->update($validated);
        return redirect()->back()->with('success', 'Review updated successfully.');
    }

    public function destroyReview(QualityReview $review)
    {
        $review->delete();
        return redirect()->back()->with('success', 'Review deleted successfully.');
    }

    // Audits
    public function storeAudit(Request $request)
    {
        $validated = $request->validate([
            'audit_topic' => 'required|string',
            'audit_date' => 'required|date',
            'auditor' => 'required|string',
            'department' => 'nullable|string',
            'score' => 'nullable|numeric',
            'result_summary' => 'nullable|string',
        ]);

        QualityAudit::create($validated);
        return redirect()->back()->with('success', 'Audit recorded successfully.');
    }

    public function updateAudit(Request $request, QualityAudit $audit)
    {
        $validated = $request->validate([
            'audit_topic' => 'required|string',
            'audit_date' => 'required|date',
            'auditor' => 'required|string',
            'department' => 'nullable|string',
            'score' => 'nullable|numeric',
            'result_summary' => 'nullable|string',
        ]);

        $audit->update($validated);
        return redirect()->back()->with('success', 'Audit updated successfully.');
    }

    public function destroyAudit(QualityAudit $audit)
    {
        $audit->delete();
        return redirect()->back()->with('success', 'Audit deleted successfully.');
    }

    // Improvements
    public function storeImprovement(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string',
            'type' => 'required|string',
            'description' => 'nullable|string',
            'status' => 'required|string',
            'progress_percentage' => 'required|integer|min:0|max:100',
            'action_plan' => 'nullable|string',
        ]);

        QualityImprovement::create($validated);
        return redirect()->back()->with('success', 'Improvement project created successfully.');
    }

    public function updateImprovement(Request $request, QualityImprovement $improvement)
    {
        $validated = $request->validate([
            'title' => 'required|string',
            'type' => 'required|string',
            'description' => 'nullable|string',
            'status' => 'required|string',
            'progress_percentage' => 'required|integer|min:0|max:100',
            'action_plan' => 'nullable|string',
        ]);

        $improvement->update($validated);
        return redirect()->back()->with('success', 'Improvement project updated successfully.');
    }

    public function destroyImprovement(QualityImprovement $improvement)
    {
        $improvement->delete();
        return redirect()->back()->with('success', 'Improvement project deleted successfully.');
    }
}
