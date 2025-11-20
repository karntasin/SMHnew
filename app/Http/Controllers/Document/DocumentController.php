<?php

namespace App\Http\Controllers\Document;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\DocumentApproval;
use App\Models\DocumentDistribution;
use App\Models\User;
use App\Models\Department;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function drafts()
    {
        return redirect()->route('documents.index', ['status' => 'draft']);
    }

    public function receive()
    {
        return $this->create();
    }

    public function import()
    {
        return redirect()->route('documents.dashboard')->with('message', 'Import feature is coming soon.');
    }

    public function settings()
    {
        return redirect()->route('documents.dashboard')->with('message', 'Settings feature is coming soon.');
    }

    public function templates()
    {
        return redirect()->route('documents.dashboard')->with('message', 'Templates feature is coming soon.');
    }

    public function index(Request $request)
    {
        $query = Document::with(['createdBy', 'currentHolder', 'approvals', 'distributions'])
            ->latest();

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by user involvement (created by, sent to, or distributed to)
        $user = Auth::user();
        // For now, show all for admin, or filter for users. 
        // Let's just show all for simplicity in this iteration, or maybe filter by created_by
        // $query->where('created_by', $user->id); 

        $documents = $query->paginate(10);

        return Inertia::render('documents/Index', [
            'documents' => $documents,
            'filters' => $request->only(['status']),
        ]);
    }

    public function create()
    {
        return Inertia::render('documents/Create', [
            'users' => User::all(), // For selecting approver/receiver
            'departments' => Department::all(), // For distribution
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'document_number' => 'required|string|unique:documents,document_number',
            'document_date' => 'required|date',
            'content' => 'nullable|string',
            'urgency' => 'required|in:normal,urgent,very_urgent',
            'confidentiality' => 'required|in:normal,confidential,secret',
            'attachment' => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png|max:10240',
            'approver_id' => 'nullable|exists:users,id', // Director to sign
        ]);

        $path = null;
        if ($request->hasFile('attachment')) {
            $path = $request->file('attachment')->store('documents', 'public');
        }

        $document = Document::create([
            'document_number' => $validated['document_number'],
            'document_date' => $validated['document_date'],
            'subject' => $validated['subject'],
            'content' => $validated['content'],
            'urgency' => $validated['urgency'],
            'confidentiality' => $validated['confidentiality'],
            'status' => 'draft',
            'created_by' => Auth::id(),
            'current_holder_id' => Auth::id(),
            'file_path' => $path,
        ]);

        if (!empty($validated['approver_id'])) {
            // Create approval request
            DocumentApproval::create([
                'document_id' => $document->id,
                'approver_id' => $validated['approver_id'],
                'action' => 'sign', // Waiting for sign
            ]);
            $document->update(['status' => 'pending_approval']);
        }

        return redirect()->route('documents.index')->with('success', 'Document created successfully.');
    }

    public function show(Document $document)
    {
        $document->load(['createdBy', 'approvals.approver', 'distributions.department', 'distributions.user']);
        
        return Inertia::render('documents/Show', [
            'document' => $document,
            'users' => User::all(),
            'departments' => Department::all(),
            'auth' => [
                'user' => Auth::user(),
                'can_approve' => $document->approvals->where('approver_id', Auth::id())->where('approved_at', null)->isNotEmpty(),
            ]
        ]);
    }

    public function kasien(Request $request, Document $document)
    {
        $request->validate([
            'comment' => 'required|string',
            'next_user_id' => 'nullable|exists:users,id',
        ]);

        // Add comment/kasien record
        DocumentApproval::create([
            'document_id' => $document->id,
            'approver_id' => Auth::id(),
            'action' => 'comment',
            'comment' => $request->comment,
            'approved_at' => now(), // It's just a comment, so it's "done" immediately
        ]);

        // If sending to next person
        if ($request->next_user_id) {
            $document->update(['current_holder_id' => $request->next_user_id]);
            
            // Create a pending approval/action for the next person if needed
            // Or just rely on current_holder_id. 
            // Let's create a pending approval so they see it in "Waiting for me"
            DocumentApproval::create([
                'document_id' => $document->id,
                'approver_id' => $request->next_user_id,
                'action' => 'review', // Waiting for review/kasien/approve
            ]);
        }

        return back()->with('success', 'Document routed successfully.');
    }

    public function approve(Request $request, Document $document)
    {
        $request->validate([
            'signature' => 'required|string', // Base64 signature or path
            'comment' => 'nullable|string',
        ]);

        $approval = $document->approvals()
            ->where('approver_id', Auth::id())
            ->whereNull('approved_at')
            ->firstOrFail();

        $approval->update([
            'action' => 'approve',
            'comment' => $request->comment,
            'signature_path' => $request->signature, // Save signature
            'approved_at' => now(),
        ]);

        // Check if all approvals are done (if multiple)
        // For now, single approval
        $document->update([
            'status' => 'approved',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
        ]);

        return back()->with('success', 'Document approved and signed.');
    }

    public function distribute(Request $request, Document $document)
    {
        $validated = $request->validate([
            'department_ids' => 'array',
            'department_ids.*' => 'exists:departments,id',
            'user_ids' => 'array',
            'user_ids.*' => 'exists:users,id',
            'note' => 'nullable|string',
        ]);

        if (!empty($validated['department_ids'])) {
            foreach ($validated['department_ids'] as $deptId) {
                DocumentDistribution::create([
                    'document_id' => $document->id,
                    'department_id' => $deptId,
                    'status' => 'pending',
                    'note' => $validated['note'] ?? null,
                ]);
            }
        }

        if (!empty($validated['user_ids'])) {
            foreach ($validated['user_ids'] as $userId) {
                DocumentDistribution::create([
                    'document_id' => $document->id,
                    'user_id' => $userId,
                    'status' => 'pending',
                    'note' => $validated['note'] ?? null,
                ]);
            }
        }

        $document->update(['status' => 'sent']);

        return back()->with('success', 'Document distributed successfully.');
    }

    public function acknowledge(DocumentDistribution $distribution)
    {
        // Check permission
        // If distribution is to user, check Auth::id() == user_id
        // If distribution is to department, check Auth::user()->department_id == department_id
        
        $user = Auth::user();
        if ($distribution->user_id && $distribution->user_id !== $user->id) {
            abort(403);
        }
        // Check department logic...

        $distribution->update([
            'status' => 'acknowledged',
            'acknowledged_at' => now(),
        ]);

        return back()->with('success', 'Document acknowledged.');
    }
}
