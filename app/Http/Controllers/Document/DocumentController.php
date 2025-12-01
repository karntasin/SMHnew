<?php

namespace App\Http\Controllers\Document;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\DocumentAction;
use App\Models\DocumentCircularRecipient;
use App\Models\User;
use App\Models\Department;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Notification;
use App\Notifications\DocumentNotification;

class DocumentController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Document::with(['creator', 'department', 'actions.sender', 'actions.receiverUser', 'actions.receiverDepartment'])
            ->latest();

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter logic:
        // 1. Created by me
        // 2. Sent to my department
        // 3. Sent to me specifically
        // 4. Circulars
        
        // For simplicity in this iteration, showing all public documents or related to user
        // In a real app, complex permission logic is needed.
        
        $documents = $query->paginate(10);

        return Inertia::render('documents/Index', [
            'documents' => $documents,
            'filters' => $request->only(['status']),
        ]);
    }

    public function create()
    {
        return Inertia::render('documents/Create', [
            'departments' => Department::all(),
            'users' => User::all(), // Ideally filter by role (e.g., Boss)
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'document_number' => 'nullable|string|max:50',
            'document_date' => 'required|date',
            'origin_type' => 'required|in:internal,external',
            'sender_name' => 'nullable|required_if:origin_type,external|string',
            'department_id' => 'nullable|required_if:origin_type,internal|exists:departments,id',
            'description' => 'nullable|string',
            'file' => 'nullable|file|max:10240', // 10MB
            'type' => 'required|in:normal,circular',
        ]);

        $path = null;
        if ($request->hasFile('file')) {
            $path = $request->file('file')->store('documents', 'public');
        }

        $document = Document::create([
            'title' => $validated['title'],
            'document_number' => $validated['document_number'],
            'document_date' => $validated['document_date'],
            'origin_type' => $validated['origin_type'],
            'sender_name' => $validated['sender_name'],
            'department_id' => $validated['department_id'],
            'description' => $validated['description'],
            'file_path' => $path,
            'type' => $validated['type'],
            'status' => 'pending', // Initial status
            'user_id' => Auth::id(),
        ]);

        // Initial Action Log
        DocumentAction::create([
            'document_id' => $document->id,
            'sender_id' => Auth::id(),
            'action_type' => 'register',
            'comment' => 'ลงทะเบียนรับหนังสือ',
            'status' => 'completed',
        ]);

        return redirect()->route('documents.show', $document->id)
            ->with('success', 'ลงทะเบียนหนังสือเรียบร้อยแล้ว');
    }

    public function show(Document $document)
    {
        $document->load([
            'creator', 
            'department', 
            'actions.sender', 
            'actions.receiverUser', 
            'actions.receiverDepartment',
            'actions.acknowledgedByUser',
            'circularRecipients.user'
        ]);

        return Inertia::render('documents/Show', [
            'document' => $document,
            'departments' => Department::all(),
            'users' => User::all(), // Optimize in production
            'currentUser' => Auth::user(),
        ]);
    }

    // 2. Send to Departments (Forward)
    public function forward(Request $request, Document $document)
    {
        $validated = $request->validate([
            'department_ids' => 'required|array',
            'department_ids.*' => 'exists:departments,id',
            'comment' => 'nullable|string',
        ]);

        foreach ($validated['department_ids'] as $deptId) {
            $action = DocumentAction::create([
                'document_id' => $document->id,
                'sender_id' => Auth::id(),
                'receiver_department_id' => $deptId,
                'action_type' => 'forward',
                'comment' => $validated['comment'],
                'status' => 'pending',
            ]);
            
            // Send Notification to users in that department
            $users = User::where('department_id', $deptId)->get();
            Notification::send($users, new DocumentNotification($document, 'forward', Auth::user()->name));
        }

        $document->update(['status' => 'in_progress']);

        return back()->with('success', 'ส่งหนังสือไปยังแผนกเรียบร้อยแล้ว');
    }

    // Acknowledge Document Receipt (รับทราบหนังสือ)
    public function acknowledgeDocument(Request $request, DocumentAction $action)
    {
        $user = Auth::user();
        
        // Verify user is in the receiving department or is the specific receiver
        $canAcknowledge = false;
        
        if ($action->receiver_department_id && $user->department_id == $action->receiver_department_id) {
            $canAcknowledge = true;
        }
        
        if ($action->receiver_user_id && $user->id == $action->receiver_user_id) {
            $canAcknowledge = true;
        }
        
        if (!$canAcknowledge) {
            abort(403, 'คุณไม่มีสิทธิ์รับทราบหนังสือนี้');
        }
        
        // Already acknowledged?
        if ($action->acknowledged_at) {
            return back()->with('info', 'หนังสือนี้ได้รับการรับทราบแล้ว');
        }
        
        // Update action with acknowledgment info
        $action->update([
            'acknowledged_at' => now(),
            'acknowledged_by' => $user->id,
            'status' => 'completed',
        ]);
        
        // Notify the sender that document has been acknowledged
        $sender = $action->sender;
        if ($sender) {
            $document = $action->document;
            $sender->notify(new DocumentNotification($document, 'acknowledged', $user->name));
        }
        
        return back()->with('success', 'รับทราบหนังสือเรียบร้อยแล้ว');
    }
    
    // Get pending acknowledgments for current user (for popup/notification)
    public function getPendingAcknowledgments()
    {
        $user = Auth::user();
        
        $pendingActions = DocumentAction::with(['document', 'sender'])
            ->where(function ($query) use ($user) {
                // Actions sent to user's department
                $query->where('receiver_department_id', $user->department_id);
            })
            ->orWhere('receiver_user_id', $user->id)
            ->whereNull('acknowledged_at')
            ->where('action_type', 'forward')
            ->where('status', 'pending')
            ->get();
        
        return response()->json([
            'pending' => $pendingActions,
            'count' => $pendingActions->count(),
        ]);
    }
    
    // Get overdue documents (more than 3 hours without acknowledgment)
    public function getOverdueDocuments()
    {
        $user = Auth::user();
        $threeHoursAgo = now()->subHours(3);
        
        // Documents sent BY user that haven't been acknowledged
        $sentOverdue = DocumentAction::with(['document', 'receiverDepartment', 'receiverUser'])
            ->where('sender_id', $user->id)
            ->where('action_type', 'forward')
            ->whereNull('acknowledged_at')
            ->where('created_at', '<', $threeHoursAgo)
            ->get();
        
        // Documents sent TO user's department that haven't been acknowledged
        $receivedOverdue = DocumentAction::with(['document', 'sender'])
            ->where(function ($query) use ($user) {
                $query->where('receiver_department_id', $user->department_id)
                    ->orWhere('receiver_user_id', $user->id);
            })
            ->where('action_type', 'forward')
            ->whereNull('acknowledged_at')
            ->where('created_at', '<', $threeHoursAgo)
            ->get();
        
        return response()->json([
            'sent_overdue' => $sentOverdue,
            'received_overdue' => $receivedOverdue,
            'has_overdue' => $sentOverdue->count() > 0 || $receivedOverdue->count() > 0,
        ]);
    }

    // 3. Submit to Boss (Director)
    public function submitBoss(Request $request, Document $document)
    {
        $validated = $request->validate([
            'boss_id' => 'required|exists:users,id',
            'comment' => 'nullable|string',
        ]);

        DocumentAction::create([
            'document_id' => $document->id,
            'sender_id' => Auth::id(),
            'receiver_user_id' => $validated['boss_id'],
            'action_type' => 'submit_boss',
            'comment' => $validated['comment'],
            'status' => 'pending',
        ]);

        // Send Notification to Boss
        $boss = User::find($validated['boss_id']);
        if ($boss) {
            $boss->notify(new DocumentNotification($document, 'submit_boss', Auth::user()->name));
        }

        return back()->with('success', 'นำเรียนผู้อำนวยการเรียบร้อยแล้ว');
    }

    // Boss Approves/Signs
    public function approve(Request $request, Document $document, DocumentAction $action)
    {
        // Verify user is the receiver of the action
        if (Auth::id() !== $action->receiver_user_id) {
            abort(403);
        }

        $validated = $request->validate([
            'comment' => 'nullable|string', // "เกษียนหนังสือ" / Order details
            'status' => 'required|in:approved,rejected',
        ]);

        $action->update([
            'status' => 'completed',
            'comment' => $validated['comment'], // Update with boss's comment
        ]);

        // Log the approval action itself
        DocumentAction::create([
            'document_id' => $document->id,
            'sender_id' => Auth::id(),
            'action_type' => $validated['status'] === 'approved' ? 'approve' : 'reject',
            'comment' => $validated['comment'],
            'status' => 'completed',
        ]);

        if ($validated['status'] === 'approved') {
            $document->update(['status' => 'approved']);
        }

        // Notify the creator
        if ($document->creator) {
            $document->creator->notify(new DocumentNotification(
                $document, 
                $validated['status'] === 'approved' ? 'approve' : 'reject', 
                Auth::user()->name
            ));
        }

        return back()->with('success', 'บันทึกการสั่งการเรียบร้อยแล้ว');
    }

    // 4. Distribute as Circular (หนังสือเวียน)
    public function distributeCircular(Request $request, Document $document)
    {
        // Create recipients for ALL users (or filtered)
        $users = User::all();
        
        foreach ($users as $user) {
            DocumentCircularRecipient::firstOrCreate([
                'document_id' => $document->id,
                'user_id' => $user->id,
            ]);
            
            // Send Notification
            // To avoid spamming DB with individual notifications in loop, we might want to queue this or send in bulk if possible.
            // For now, let's just notify.
        }
        
        // Bulk notification
        Notification::send($users, new DocumentNotification($document, 'circular', Auth::user()->name));

        $document->update(['type' => 'circular', 'status' => 'distributed']);

        return back()->with('success', 'ส่งหนังสือเวียนแจ้งทราบเรียบร้อยแล้ว');
    }

    // User Acknowledges Circular
    public function acknowledge(Request $request, Document $document)
    {
        $recipient = DocumentCircularRecipient::where('document_id', $document->id)
            ->where('user_id', Auth::id())
            ->first();

        if ($recipient) {
            $recipient->update(['read_at' => now()]);
        } else {
            // If not in list (maybe new user), create it
            DocumentCircularRecipient::create([
                'document_id' => $document->id,
                'user_id' => Auth::id(),
                'read_at' => now(),
            ]);
        }

        return back()->with('success', 'รับทราบเรียบร้อยแล้ว');
    }
    
    // Dashboard
    public function dashboard()
    {
        // Global Stats
        $total = Document::count();
        $pending = Document::where('status', 'pending')->count();
        $completed = Document::where('status', 'completed')->count();
        
        // Stats by Department (Inbound/Outbound)
        // Count documents where the department is the receiver in actions
        $deptStats = Department::withCount(['receivedDocuments' => function ($query) {
            $query->where('action_type', 'forward');
        }])->get()->map(function ($dept) {
            return [
                'name' => $dept->name,
                'received_count' => $dept->received_documents_count,
            ];
        });

        // Recent
        $recent = Document::latest()->take(5)->get();

        return Inertia::render('documents/Dashboard', [
            'stats' => compact('total', 'pending', 'completed'),
            'deptStats' => $deptStats,
            'recent' => $recent
        ]);
    }
}
