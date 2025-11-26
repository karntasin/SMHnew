<?php

namespace App\Http\Controllers;

use App\Models\QualityDocument;
use App\Models\Department;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;

class QualityDocumentController extends Controller
{
    public function index(Request $request)
    {
        $query = QualityDocument::with(['owner', 'department'])
            ->orderBy('created_at', 'desc');

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('document_number', 'like', "%{$search}%");
            });
        }

        if ($request->has('department_id') && $request->department_id) {
            $query->where('department_id', $request->department_id);
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        $documents = $query->paginate(10)->withQueryString();
        $departments = Department::select('id', 'name')->get();

        // Calculate stats
        $stats = [
            'total' => QualityDocument::count(),
            'published' => QualityDocument::where('status', 'published')->count(),
            'review' => QualityDocument::where('status', 'review')->count(),
            'draft' => QualityDocument::where('status', 'draft')->count(),
        ];

        return Inertia::render('quality-docs/Index', [
            'documents' => $documents,
            'departments' => $departments,
            'filters' => $request->only(['search', 'department_id']),
            'stats' => $stats,
        ]);
    }

    public function create()
    {
        $departments = Department::select('id', 'name')->get();
        $teams = DB::table('teamha')->select('abbreviation', 'name_th')->get();
        
        return Inertia::render('quality-docs/Create', [
            'departments' => $departments,
            'teams' => $teams
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'document_number' => 'required|string|unique:quality_documents,document_number',
            'category' => 'required|string',
            'document_type' => 'required|string',
            'department_id' => 'required|exists:departments,id',
            'owner_department' => 'nullable|string|exists:teamha,abbreviation',
            'description' => 'nullable|string',
            'effective_date' => 'required|date',
            'review_date' => 'nullable|date|after:effective_date',
            'file' => 'required|file|mimes:pdf,doc,docx,xls,xlsx|max:10240', // 10MB max
        ]);

        $path = null;
        if ($request->hasFile('file')) {
            $path = $request->file('file')->store('quality-docs', 'public');
        }

        $document = QualityDocument::create([
            'title' => $validated['title'],
            'document_number' => $validated['document_number'],
            'category' => $validated['category'],
            'document_type' => $validated['document_type'],
            'department_id' => $validated['department_id'],
            'owner_department' => $validated['owner_department'] ?? null,
            'description' => $validated['description'],
            'effective_date' => $validated['effective_date'],
            'review_date' => $validated['review_date'],
            'status' => 'draft',
            'current_version' => '1.0',
            'file_path' => $path,
            'owner_id' => auth()->id(),
        ]);

        // Create initial version record
        if ($path) {
            $document->versions()->create([
                'version_number' => '1.0',
                'file_path' => $path,
                'changes_description' => 'Initial upload',
                'uploaded_by' => auth()->id(),
            ]);
        }

        return redirect()->route('quality-docs.index')
            ->with('success', 'สร้างเอกสารเรียบร้อยแล้ว');
    }

    public function show($id)
    {
        $document = QualityDocument::with(['owner', 'department', 'versions.uploader'])
            ->findOrFail($id);
            
        return Inertia::render('quality-docs/Show', [
            'document' => $document,
            'can' => [
                'approve' => Auth::user()->hasRole('admin') || Auth::user()->can('approve quality documents'),
                'edit' => Auth::id() === $document->owner_id,
            ]
        ]);
    }

    public function download($id)
    {
        $document = QualityDocument::findOrFail($id);
        if (!$document->file_path || !Storage::disk('public')->exists($document->file_path)) {
            return back()->with('error', 'ไม่พบไฟล์เอกสาร');
        }
        return Storage::disk('public')->download($document->file_path);
    }

    public function submitForReview($id)
    {
        $document = QualityDocument::findOrFail($id);
        
        if (Auth::id() !== $document->owner_id) {
            return back()->with('error', 'คุณไม่มีสิทธิ์ดำเนินการนี้');
        }

        $document->update(['status' => 'review']);
        
        return back()->with('success', 'ส่งเอกสารเพื่อขออนุมัติเรียบร้อยแล้ว');
    }

    public function approve($id)
    {
        $document = QualityDocument::findOrFail($id);
        
        // Check permission
        if (!Auth::user()->hasRole('admin') && !Auth::user()->can('approve quality documents')) {
            return back()->with('error', 'คุณไม่มีสิทธิ์อนุมัติเอกสาร');
        }

        $document->update(['status' => 'published']);
        
        return back()->with('success', 'อนุมัติเอกสารเรียบร้อยแล้ว');
    }

    public function reject($id)
    {
        $document = QualityDocument::findOrFail($id);
        
        // Check permission
        if (!Auth::user()->hasRole('admin') && !Auth::user()->can('approve quality documents')) {
            return back()->with('error', 'คุณไม่มีสิทธิ์ดำเนินการนี้');
        }

        $document->update(['status' => 'draft']); // Or 'rejected'
        
        return back()->with('success', 'ตีกลับเอกสารเรียบร้อยแล้ว');
    }
}
