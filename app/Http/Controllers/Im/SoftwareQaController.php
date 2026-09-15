<?php

namespace App\Http\Controllers\Im;

use App\Http\Controllers\Controller;
use App\Models\Im\CodeReview;
use App\Models\Im\SdlcDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SoftwareQaController extends Controller
{
    public function index(): Response
    {
        $documents = SdlcDocument::with('creator:id,name')->latest()->get();
        $reviews = CodeReview::latest('reviewed_at')->get();

        $projects = $documents->pluck('project')
            ->merge($reviews->pluck('project'))
            ->unique()
            ->values();

        return Inertia::render('Im/SoftwareQa', [
            'documents' => $documents,
            'reviews' => $reviews,
            'projects' => $projects,
            'docTypes' => [
                'sa' => 'System Analysis',
                'context_diagram' => 'Context Diagram',
                'dfd' => 'Data Flow Diagram',
                'er' => 'ER Diagram',
                'sequence' => 'Sequence Diagram',
                'data_dictionary' => 'Data Dictionary',
                'user_manual' => 'User Manual',
                'other' => 'อื่น ๆ',
            ],
            'summary' => [
                'projects' => $projects->count(),
                'documents' => $documents->count(),
                'reviews' => $reviews->count(),
                'avg_comment' => $reviews->count() ? round($reviews->avg('comment_score'), 1) : 0,
                'repos' => $documents->whereNotNull('repo_url')->pluck('repo_url')->unique()->count(),
            ],
        ]);
    }

    public function storeDocument(Request $request)
    {
        $data = $request->validate([
            'project' => 'required|string|max:255',
            'doc_type' => 'required|string|max:32',
            'title' => 'required|string|max:255',
            'version' => 'required|string|max:24',
            'repo_url' => 'nullable|url|max:500',
            'note' => 'nullable|string',
            'file' => 'nullable|file|max:20480',
        ]);

        if ($request->hasFile('file')) {
            $data['file_path'] = $request->file('file')->store('im/sdlc', 'public');
        }
        unset($data['file']);
        $data['created_by'] = Auth::id();

        SdlcDocument::create($data);

        return back()->with('success', 'บันทึกเอกสาร SDLC เรียบร้อย');
    }

    public function destroyDocument(SdlcDocument $document)
    {
        if ($document->file_path) {
            Storage::disk('public')->delete($document->file_path);
        }
        $document->delete();

        return back()->with('success', 'ลบเอกสารเรียบร้อย');
    }

    public function storeReview(Request $request)
    {
        $data = $request->validate([
            'project' => 'required|string|max:255',
            'repo_url' => 'nullable|url|max:500',
            'reviewer' => 'nullable|string|max:255',
            'is_external' => 'boolean',
            'comment_score' => 'required|numeric|min:0|max:100',
            'findings' => 'nullable|string',
            'recommendation' => 'nullable|string',
            'reviewed_at' => 'nullable|date',
        ]);

        CodeReview::create($data);

        return back()->with('success', 'บันทึกผล Code Review เรียบร้อย');
    }

    public function destroyReview(CodeReview $review)
    {
        $review->delete();

        return back()->with('success', 'ลบรายการเรียบร้อย');
    }
}
