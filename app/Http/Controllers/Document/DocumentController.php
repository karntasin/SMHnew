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
use App\Services\FshhChat\AdminHubChatNotifier;

class DocumentController extends Controller
{
    public function __construct()
    {
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Document::with(['creator', 'department', 'actions.sender', 'actions.receiverUser', 'actions.receiverDepartment'])
            ->latest();

        $this->scopeDocumentsForUser($query, $user);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('document_number', 'like', "%{$search}%")
                    ->orWhere('sender_name', 'like', "%{$search}%");
            });
        }

        $documents = $query->paginate(15)->withQueryString();

        $scopedCount = function (string $status = null) use ($user) {
            $q = Document::query();
            $this->scopeDocumentsForUser($q, $user);
            if ($status) {
                $q->where('status', $status);
            }

            return $q->count();
        };

        $statusCounts = [
            'all' => $scopedCount(),
            'registered' => $scopedCount('registered'),
            'pending_director' => $scopedCount('pending_director'),
            'approved' => $scopedCount('approved'),
            'in_progress' => $scopedCount('in_progress'),
            'completed' => $scopedCount('completed'),
            'archived' => $scopedCount('archived'),
        ];

        return Inertia::render('documents/Index', [
            'documents' => $documents,
            'filters' => [
                'status' => $request->query('status', 'all'),
                'search' => $request->query('search', ''),
            ],
            'statusCounts' => $statusCounts,
            'inboxCount' => $this->pendingInboxCount($user),
            'departments' => Department::orderBy('name')->get(['id', 'name']),
            'users' => User::orderBy('name')->get(['id', 'name', 'department_id']),
        ]);
    }

    public function inbox(Request $request)
    {
        $user = Auth::user();

        try {
            $query = DocumentAction::with([
                'document.creator',
                'document.department',
                'sender',
                'receiverDepartment',
            ])
                ->where('action_type', 'forward')
                ->whereNull('acknowledged_at')
                ->where('status', 'pending')
                ->where(function ($q) use ($user) {
                    $q->where('receiver_user_id', $user->id);

                    if ($user->department_id) {
                        $q->orWhere(function ($sub) use ($user) {
                            $sub->whereNull('receiver_user_id')
                                ->where('receiver_department_id', $user->department_id);
                        });
                    }
                })
                ->latest();

            if ($request->filled('search')) {
                $search = $request->search;
                $query->whereHas('document', function ($d) use ($search) {
                    $d->where('title', 'like', "%{$search}%")
                        ->orWhere('document_number', 'like', "%{$search}%");
                });
            }

            $transfers = $query->paginate(15)->withQueryString();
            $pending = $this->pendingInboxCount($user);
            $overdue = DocumentAction::where('action_type', 'forward')
                ->whereNull('acknowledged_at')
                ->where('status', 'pending')
                ->where('created_at', '<', now()->subHours(3))
                ->where(function ($q) use ($user) {
                    $q->where('receiver_user_id', $user->id);
                    if ($user->department_id) {
                        $q->orWhere(function ($sub) use ($user) {
                            $sub->whereNull('receiver_user_id')
                                ->where('receiver_department_id', $user->department_id);
                        });
                    }
                })
                ->count();
        } catch (\Throwable $e) {
            \Log::error('Document inbox failed: '.$e->getMessage());
            $transfers = new \Illuminate\Pagination\LengthAwarePaginator([], 0, 15);
            $pending = 0;
            $overdue = 0;
        }

        return Inertia::render('documents/Inbox', [
            'transfers' => $transfers,
            'filters' => [
                'search' => $request->query('search', ''),
            ],
            'stats' => [
                'pending' => $pending,
                'overdue' => $overdue,
            ],
        ]);
    }

    public function outbox(Request $request)
    {
        $user = Auth::user();

        $query = DocumentAction::with([
            'document.creator',
            'document.department',
            'receiverDepartment',
            'receiverUser',
            'acknowledgedByUser',
        ])
            ->where('action_type', 'forward')
            ->where(function ($q) use ($user) {
                $q->where('sender_id', $user->id)
                    ->orWhereHas('document', function ($d) use ($user) {
                        $d->where('department_id', $user->department_id)
                            ->orWhere('user_id', $user->id);
                    });
            })
            ->latest();

        if ($request->filled('status')) {
            if ($request->status === 'pending') {
                $query->whereNull('acknowledged_at')->where('status', 'pending');
            } elseif ($request->status === 'received') {
                $query->whereNotNull('acknowledged_at');
            } elseif ($request->status === 'completed') {
                $query->whereIn('implementation_status', ['completed', 'not_relevant']);
            }
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('document', function ($d) use ($search) {
                $d->where('title', 'like', "%{$search}%")
                    ->orWhere('document_number', 'like', "%{$search}%");
            });
        }

        $transfers = $query->paginate(15)->withQueryString();

        return Inertia::render('documents/Outbox', [
            'transfers' => $transfers,
            'filters' => [
                'status' => $request->query('status', 'all'),
                'search' => $request->query('search', ''),
            ],
            'stats' => [
                'total' => DocumentAction::where('action_type', 'forward')
                    ->where(function ($q) use ($user) {
                        $q->where('sender_id', $user->id)
                            ->orWhereHas('document', fn ($d) => $d->where('department_id', $user->department_id)->orWhere('user_id', $user->id));
                    })
                    ->count(),
                'pending' => DocumentAction::where('action_type', 'forward')
                    ->whereNull('acknowledged_at')
                    ->where('status', 'pending')
                    ->where(function ($q) use ($user) {
                        $q->where('sender_id', $user->id)
                            ->orWhereHas('document', fn ($d) => $d->where('department_id', $user->department_id)->orWhere('user_id', $user->id));
                    })
                    ->count(),
                'received' => DocumentAction::where('action_type', 'forward')
                    ->whereNotNull('acknowledged_at')
                    ->where(function ($q) use ($user) {
                        $q->where('sender_id', $user->id)
                            ->orWhereHas('document', fn ($d) => $d->where('department_id', $user->department_id)->orWhere('user_id', $user->id));
                    })
                    ->count(),
            ],
        ]);
    }

    public function archive(Document $document)
    {
        if (! in_array($document->status, ['completed', 'approved', 'rejected', 'distributed'], true)) {
            return back()->with('error', 'เก็บเข้าคลังได้เมื่อหนังสือเสร็จสิ้น อนุมัติแล้ว ส่งกลับ หรือเวียนทราบแล้วเท่านั้น');
        }

        $document->update([
            'status' => 'archived',
            'archived_at' => now(),
        ]);

        DocumentAction::create([
            'document_id' => $document->id,
            'sender_id' => Auth::id(),
            'action_type' => 'archive',
            'comment' => 'เก็บเข้าคลัง',
            'status' => 'completed',
        ]);

        return back()->with('success', 'เก็บหนังสือเข้าคลังเรียบร้อยแล้ว');
    }

    public function pendingReview(Request $request)
    {
        $documents = Document::with([
            'creator',
            'department',
            'actions' => fn ($q) => $q->where('action_type', 'submit_boss')->latest(),
            'actions.sender',
            'actions.receiverUser',
        ])
            ->where('status', 'pending_director')
            ->latest()
            ->paginate(15);

        return Inertia::render('documents/PendingReview', [
            'documents' => $documents,
        ]);
    }

    public function directorInbox(Request $request)
    {
        $user = Auth::user();

        if (!$user->hasAnyRole(['boss', 'Boss', 'admin', 'Admin', 'superUser'])) {
            abort(403, 'เฉพาะผู้อำนวยการ (บทบาท boss) และผู้ดูแลระบบเท่านั้นที่สามารถเข้าถึงกล่องงาน ผอ. ได้');
        }

        $isAdmin = $user->hasAnyRole(['admin', 'Admin', 'superUser']);
        $pendingQuery = DocumentAction::where('action_type', 'submit_boss')
            ->where('status', 'pending');

        if (!$isAdmin) {
            $pendingQuery->where('receiver_user_id', $user->id);
        }

        $pendingActionIds = $pendingQuery->pluck('document_id');

        $documents = Document::with(['creator', 'department', 'actions' => function ($q) use ($user) {
            $q->where('action_type', 'submit_boss')
                ->where('receiver_user_id', $user->id)
                ->where('status', 'pending')
                ->with('sender');
        }])
            ->whereIn('id', $pendingActionIds)
            ->latest()
            ->paginate(15);

        $stats = [
            'pending' => $pendingActionIds->count(),
            'approved_today' => DocumentAction::where('sender_id', $user->id)
                ->where('action_type', 'approve')
                ->whereDate('created_at', today())
                ->count(),
        ];

        return Inertia::render('documents/DirectorInbox', [
            'documents' => $documents,
            'stats' => $stats,
            'userSignatures' => [
                'signature_path' => $user->signature_path,
                'stamp_path' => $user->stamp_path,
            ],
        ]);
    }

    public function directorShow(Document $document)
    {
        $user = Auth::user();

        if (!$user->hasAnyRole(['boss', 'Boss', 'admin', 'Admin', 'superUser'])) {
            abort(403, 'เฉพาะผู้อำนวยการ (บทบาท boss) และผู้ดูแลระบบเท่านั้นที่สามารถเข้าถึงกล่องงาน ผอ. ได้');
        }

        $isAdmin = $user->hasAnyRole(['admin', 'Admin', 'superUser']);
        $pendingQuery = DocumentAction::where('document_id', $document->id)
            ->where('action_type', 'submit_boss')
            ->where('status', 'pending');

        if (!$isAdmin) {
            $pendingQuery->where('receiver_user_id', $user->id);
        }

        $pendingAction = $pendingQuery->first();

        if (! $pendingAction) {
            return redirect()->route('documents.director.index')
                ->with('info', 'ไม่พบรายการรอลงนาม หรือดำเนินการไปแล้ว');
        }

        $document->load([
            'creator',
            'department',
            'actions.sender',
            'actions.receiverUser',
        ]);

        $pendingAction->load('sender');

        return Inertia::render('documents/DirectorReview', [
            'document' => $document,
            'pendingAction' => $pendingAction,
            'userSignatures' => [
                'signature_path' => $user->signature_path,
                'stamp_path' => $user->stamp_path,
            ],
        ]);
    }

    public function create()
    {
        return Inertia::render('documents/Create', [
            'departments' => Department::orderBy('name')->get(),
        ]);
    }

    public function aiSummarizer()
    {
        return Inertia::render('documents/AiSummarizer');
    }

    public function exportDocx(Request $request)
    {
        $request->validate([
            'summary' => 'required|string',
        ]);

        $summary = $request->input('summary');
        
        $phpWord = new \PhpOffice\PhpWord\PhpWord();
        $phpWord->setDefaultFontName('TH SarabunPSK');
        $phpWord->setDefaultFontSize(16);
        
        $section = $phpWord->addSection();
        
        $section->addText('สรุปสาระสำคัญหนังสือ', ['bold' => true, 'size' => 20], ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]);
        $section->addTextBreak(1);
        
        $lines = explode("\n", $summary);
        foreach ($lines as $line) {
            $line = trim($line);
            if (!empty($line)) {
                $section->addText($line);
            } else {
                $section->addTextBreak(1);
            }
        }
        
        $fileName = 'Document_Summary_' . date('Ymd_His') . '.docx';
        $tempFile = storage_path('app/temp/' . $fileName);
        
        if (!file_exists(storage_path('app/temp'))) {
            mkdir(storage_path('app/temp'), 0755, true);
        }
        
        $objWriter = \PhpOffice\PhpWord\IOFactory::createWriter($phpWord, 'Word2007');
        $objWriter->save($tempFile);
        
        return response()->download($tempFile)->deleteFileAfterSend(true);
    }

    public function summarizeAi(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf,jpeg,png,jpg|max:10240',
        ]);

        $apiKey = config('services.gemini.api_key');
        if (empty($apiKey)) {
            return response()->json(['error' => 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY ในระบบ (.env)'], 400);
        }

        $file = $request->file('file');
        $mimeType = $file->getMimeType();
        $base64Data = base64_encode(file_get_contents($file->path()));

        $response = \Illuminate\Support\Facades\Http::post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={$apiKey}", [
            'contents' => [
                [
                    'parts' => [
                        ['text' => 'คุณเป็นผู้ช่วยงานธุรการของโรงพยาบาล หน้าที่ของคุณคือการสรุปเอกสารฉบับนี้ เพื่อนำไปกรอกในช่อง "สรุปเนื้อหาสำหรับผู้อำนวยการ" กรุณาสรุปให้กระชับ ได้ใจความ ครอบคลุม: เรื่องอะไร, ใครส่งถึงใคร, และต้องการให้ทำอะไร (Action Required) โดยสรุปไม่เกิน 3-5 บรรทัด'],
                        [
                            'inline_data' => [
                                'mime_type' => $mimeType,
                                'data' => $base64Data
                            ]
                        ]
                    ]
                ]
            ]
        ]);

        if ($response->successful()) {
            $summary = $response->json('candidates.0.content.parts.0.text');
            return response()->json(['summary' => trim($summary ?? '')]);
        }

        file_put_contents(storage_path('logs/gemini_error.txt'), $response->body());
        return response()->json(['error' => 'ไม่สามารถสรุปเนื้อหาได้จาก AI: ' . $response->body()], 500);
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
            'due_date' => 'nullable|date',
            'description' => 'nullable|string',
            'summary_for_director' => 'nullable|string',
            'file' => 'required|file|mimes:pdf,doc,docx,jpg,jpeg,png|max:10240',
            'type' => 'required|in:normal,circular',
        ]);

        $path = $request->file('file')->store('documents', 'public');

        $document = Document::create([
            'title' => $validated['title'],
            'document_number' => $validated['document_number'],
            'document_date' => $validated['document_date'],
            'due_date' => $validated['due_date'] ?? null,
            'origin_type' => $validated['origin_type'],
            'sender_name' => $validated['sender_name'] ?? null,
            'department_id' => $validated['department_id'] ?? null,
            'description' => $validated['description'] ?? null,
            'summary_for_director' => $validated['summary_for_director'] ?? null,
            'file_path' => $path,
            'type' => $validated['type'],
            'status' => 'registered',
            'user_id' => Auth::id(),
        ]);

        DocumentAction::create([
            'document_id' => $document->id,
            'sender_id' => Auth::id(),
            'action_type' => 'register',
            'comment' => 'ลงทะเบียนรับหนังสือและอัปโหลดไฟล์',
            'status' => 'completed',
        ]);

        return redirect()->route('documents.show', $document->id)
            ->with('success', 'ลงทะเบียนรับหนังสือเรียบร้อยแล้ว');
    }

    public function show(Document $document)
    {
        $user = Auth::user();

        $document->load([
            'creator',
            'department',
            'actions.sender',
            'actions.receiverUser',
            'actions.receiverDepartment',
            'actions.acknowledgedByUser',
            'circularRecipients.user',
        ]);

        $canViewAll = false;
        try {
            $canViewAll = (method_exists($user, 'hasAnyRole') && $user->hasAnyRole(['admin', 'Admin', 'superUser', 'boss', 'Boss']))
                || (method_exists($user, 'hasRole') && ($user->hasRole('admin') || $user->hasRole('Admin') || $user->hasRole('superUser') || $user->hasRole('boss') || $user->hasRole('Boss')));
        } catch (\Throwable $e) {
            $canViewAll = false;
        }

        if (!$canViewAll) {
            $hasAccess = $document->department_id === $user->department_id
                || $document->user_id === $user->id
                || $document->actions()->where(function ($q) use ($user) {
                    $q->where('receiver_user_id', $user->id)
                        ->orWhere('receiver_department_id', $user->department_id)
                        ->orWhere('sender_id', $user->id);
                })->exists();

            if (!$hasAccess) {
                abort(403, 'คุณไม่มีสิทธิ์เข้าถึงหนังสือของแผนกอื่น');
            }
        }

        $directors = User::role(['boss', 'Boss', 'admin', 'Admin'])->get();
        if ($directors->isEmpty()) {
            $directors = User::orderBy('name')->limit(20)->get();
        }

        return Inertia::render('documents/Show', [
            'document' => $document,
            'departments' => Department::orderBy('name')->get(),
            'users' => User::orderBy('name')->get(['id', 'name', 'department_id']),
            'directors' => $directors,
            'currentUser' => $user->load('department'),
            'userSignatures' => [
                'signature_path' => $user->signature_path,
                'stamp_path' => $user->stamp_path,
            ],
        ]);
    }

    public function submitBoss(Request $request, Document $document)
    {
        $user = Auth::user();
        if (!$user->hasAnyRole(['header', 'Header', 'admin', 'Admin', 'superUser'])) {
            return back()->with('error', 'เฉพาะหัวหน้าแผนก (บทบาท header) เท่านั้นที่สามารถนำเรียนผู้อำนวยการได้');
        }

        if (! in_array($document->status, ['registered', 'pending', 'rejected'])) {
            return back()->with('error', 'ไม่สามารถนำเรียนผู้อำนวยการในสถานะปัจจุบันได้');
        }

        $validated = $request->validate([
            'boss_id' => 'required|exists:users,id',
            'summary' => 'required|string',
            'comment' => 'nullable|string',
        ]);

        $document->update([
            'summary_for_director' => $validated['summary'],
            'status' => 'pending_director',
        ]);

        DocumentAction::create([
            'document_id' => $document->id,
            'sender_id' => Auth::id(),
            'receiver_user_id' => $validated['boss_id'],
            'action_type' => 'submit_boss',
            'comment' => $validated['comment'] ?? $validated['summary'],
            'status' => 'pending',
        ]);

        $boss = User::find($validated['boss_id']);
        if ($boss) {
            $boss->notify(new DocumentNotification($document, 'submit_boss', Auth::user()->name));
        }

        return back()->with('success', 'นำเรียนผู้อำนวยการเรียบร้อยแล้ว');
    }

    public function approve(Request $request, Document $document, DocumentAction $action)
    {
        if (Auth::id() !== $action->receiver_user_id) {
            abort(403);
        }

        if ($action->action_type !== 'submit_boss' || $action->status !== 'pending') {
            return back()->with('error', 'ไม่พบรายการรอพิจารณา');
        }

        $validated = $request->validate([
            'comment' => 'nullable|string',
            'status' => 'required|in:approved,rejected',
            'signature' => 'nullable|image|max:2048',
            'stamp' => 'nullable|image|max:2048',
            'use_saved_signature' => 'nullable|boolean',
            'use_saved_stamp' => 'nullable|boolean',
        ]);

        $user = Auth::user();
        $signaturePath = $document->director_signature_path;
        $stampPath = $document->stamp_path;

        if ($validated['status'] === 'approved') {
            if ($request->boolean('use_saved_signature') && $user->signature_path) {
                $signaturePath = $user->signature_path;
            } elseif ($request->hasFile('signature')) {
                $signaturePath = $request->file('signature')->store('documents/signatures', 'public');
            }

            if ($request->boolean('use_saved_stamp') && $user->stamp_path) {
                $stampPath = $user->stamp_path;
            } elseif ($request->hasFile('stamp')) {
                $stampPath = $request->file('stamp')->store('documents/stamps', 'public');
            }
        }

        $action->update([
            'status' => 'completed',
            'comment' => $validated['comment'],
        ]);

        DocumentAction::create([
            'document_id' => $document->id,
            'sender_id' => Auth::id(),
            'action_type' => $validated['status'] === 'approved' ? 'approve' : 'reject',
            'comment' => $validated['comment'],
            'status' => 'completed',
        ]);

        if ($validated['status'] === 'approved') {
            $document->update([
                'status' => 'approved',
                'director_comment' => $validated['comment'],
                'director_signature_path' => $signaturePath,
                'stamp_path' => $stampPath,
                'director_signed_at' => now(),
            ]);
        } else {
            $document->update([
                'status' => 'rejected',
                'director_comment' => $validated['comment'],
            ]);
        }

        $this->notifyOriginDepartment($document, $validated['status'] === 'approved' ? 'approve' : 'reject', Auth::user()->name);

        return back()->with('success', $validated['status'] === 'approved'
            ? 'ลงนามอนุมัติเรียบร้อยแล้ว'
            : 'ส่งกลับต้นทางเรียบร้อยแล้ว');
    }

    public function forward(Request $request, Document $document)
    {
        $user = Auth::user();
        if (!$user->hasAnyRole(['header', 'Header', 'admin', 'Admin', 'superUser'])) {
            return back()->with('error', 'เฉพาะหัวหน้าแผนก (บทบาท header) เท่านั้นที่สามารถอนุมัติส่งหนังสือได้');
        }

        if ($document->status === 'cancelled') {
            return back()->with('error', 'ไม่สามารถส่งต่อหนังสือที่ถูกยกเลิกแล้วได้');
        }

        $validated = $request->validate([
            'department_ids' => 'nullable|array',
            'department_ids.*' => 'exists:departments,id',
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'exists:users,id',
            'comment' => 'nullable|string',
            'forward_all' => 'nullable|boolean',
            'due_date' => 'nullable|date',
        ]);

        $departmentIds = $validated['department_ids'] ?? [];
        $userIds = $validated['user_ids'] ?? [];

        if ($request->boolean('forward_all')) {
            $departmentIds = Department::pluck('id')->all();
        }

        if (empty($departmentIds) && empty($userIds)) {
            return back()->with('error', 'กรุณาระบุแผนกหรือบุคคลที่ต้องการส่งต่ออย่างน้อย 1 รายการ');
        }

        // อัปเดตกำหนดส่งหากมีการระบุใหม่
        if (!empty($validated['due_date'])) {
            $document->due_date = $validated['due_date'];
        }

        // อัปเดตสถานะเอกสารเป็น in_progress
        $document->status = 'in_progress';
        if ($document->archived_at) {
            $document->archived_at = null;
        }
        $document->save();

        $senderName = Auth::user()?->name ?? 'ระบบ';

        \Log::info("Document forwarded: {$document->id} to departments: " . json_encode($departmentIds) . ", users: " . json_encode($userIds));

        // 1. ส่งต่อให้แผนก (Departments)
        foreach ($departmentIds as $deptId) {
            DocumentAction::create([
                'document_id' => $document->id,
                'sender_id' => Auth::id(),
                'receiver_department_id' => $deptId,
                'action_type' => 'forward',
                'comment' => $validated['comment'] ?? null,
                'status' => 'pending',
                'is_current' => true,
            ]);

            $users = User::where('department_id', $deptId)->get();
            if ($users->isNotEmpty()) {
                Notification::send($users, new DocumentNotification($document, 'forward', $senderName, false));
            }

            $department = Department::find($deptId);
            if ($department) {
                app(AdminHubChatNotifier::class)->documentToDepartment(
                    $document,
                    $department,
                    'forward',
                    $senderName
                );
            }
        }

        // 2. ส่งต่อให้รายบุคคล (Individuals / Users)
        foreach ($userIds as $userId) {
            DocumentAction::create([
                'document_id' => $document->id,
                'sender_id' => Auth::id(),
                'receiver_user_id' => $userId,
                'action_type' => 'forward',
                'comment' => $validated['comment'] ?? null,
                'status' => 'pending',
                'is_current' => true,
            ]);

            $targetUser = User::find($userId);
            if ($targetUser) {
                $targetUser->notify(new DocumentNotification($document, 'forward', $senderName, false));
            }
        }

        $recipientCount = count($departmentIds) + count($userIds);
        return back()->with('success', "ส่งหนังสือเรียบร้อยแล้ว (ส่งต่อ {$recipientCount} รายการ)");
    }

    public function acknowledgeDocument(Request $request, DocumentAction $action)
    {
        $user = Auth::user();

        if ($action->action_type !== 'forward') {
            return back()->with('error', 'ไม่สามารถรับทราบรายการนี้ได้');
        }

        $canAcknowledge = ($action->receiver_department_id && $user->department_id == $action->receiver_department_id)
            || ($action->receiver_user_id && $user->id == $action->receiver_user_id);

        if (! $canAcknowledge) {
            abort(403, 'คุณไม่มีสิทธิ์รับทราบหนังสือนี้');
        }

        if ($action->acknowledged_at) {
            return back()->with('info', 'หนังสือนี้ได้รับการรับทราบแล้ว');
        }

        $action->update([
            'acknowledged_at' => now(),
            'acknowledged_by' => $user->id,
            'status' => 'completed',
            'implementation_status' => 'received',
            'implementation_updated_at' => now(),
        ]);

        DocumentAction::create([
            'document_id' => $action->document_id,
            'sender_id' => $user->id,
            'receiver_department_id' => $action->document->department_id,
            'action_type' => 'acknowledge',
            'comment' => 'รับหนังสือแล้ว',
            'status' => 'completed',
        ]);

        $document = $action->document;
        $this->notifyOriginDepartment($document, 'acknowledged', $user->name);

        return back()->with('success', 'รับหนังสือเรียบร้อยแล้ว');
    }

    public function updateImplementation(Request $request, DocumentAction $action)
    {
        $user = Auth::user();

        if ($action->action_type !== 'forward' || ! $action->acknowledged_at) {
            return back()->with('error', 'ต้องรับหนังสือก่อนจึงจะอัปเดตสถานะการปฏิบัติได้');
        }

        $canUpdate = ($action->receiver_department_id && $user->department_id == $action->receiver_department_id)
            || ($action->receiver_user_id && $user->id == $action->receiver_user_id);

        if (! $canUpdate) {
            abort(403);
        }

        $validated = $request->validate([
            'implementation_status' => 'required|in:in_progress,completed,not_relevant',
            'implementation_comment' => 'nullable|string',
        ]);

        $action->update([
            'implementation_status' => $validated['implementation_status'],
            'implementation_comment' => $validated['implementation_comment'],
            'implementation_updated_at' => now(),
        ]);

        $statusLabels = [
            'in_progress' => 'กำลังดำเนินการ',
            'completed' => 'ดำเนินการเสร็จสิ้นแล้ว',
            'not_relevant' => 'ไม่เกี่ยวข้องกับงาน — ส่งกลับต้นทาง',
        ];

        DocumentAction::create([
            'document_id' => $action->document_id,
            'sender_id' => $user->id,
            'receiver_department_id' => $action->document->department_id,
            'action_type' => 'implementation_update',
            'comment' => ($statusLabels[$validated['implementation_status']] ?? '')
                .($validated['implementation_comment'] ? ': '.$validated['implementation_comment'] : ''),
            'status' => 'completed',
        ]);

        $document = $action->document;
        $notifyType = $validated['implementation_status'] === 'not_relevant'
            ? 'return_origin'
            : 'implementation_update';

        $this->notifyOriginDepartment($document, $notifyType, $user->name);
        $this->checkDocumentCompletion($document);

        return back()->with('success', 'อัปเดตสถานะการปฏิบัติเรียบร้อยแล้ว');
    }

    public function uploadSignatures(Request $request)
    {
        $validated = $request->validate([
            'signature' => 'nullable|image|max:2048',
            'stamp' => 'nullable|image|max:2048',
        ]);

        $user = Auth::user();
        $updates = [];

        if ($request->hasFile('signature')) {
            if ($user->signature_path) {
                Storage::disk('public')->delete($user->signature_path);
            }
            $updates['signature_path'] = $request->file('signature')->store('users/signatures', 'public');
        }

        if ($request->hasFile('stamp')) {
            if ($user->stamp_path) {
                Storage::disk('public')->delete($user->stamp_path);
            }
            $updates['stamp_path'] = $request->file('stamp')->store('users/stamps', 'public');
        }

        if (! empty($updates)) {
            $user->update($updates);
        }

        return back()->with('success', 'บันทึกลายเซ็นและตราประทับเรียบร้อยแล้ว');
    }

    public function getPendingAcknowledgments()
    {
        $user = Auth::user();

        $pendingActions = DocumentAction::with(['document', 'sender'])
            ->where('action_type', 'forward')
            ->whereNull('acknowledged_at')
            ->where('status', 'pending')
            ->where(function ($query) use ($user) {
                $query->where('receiver_department_id', $user->department_id)
                    ->orWhere('receiver_user_id', $user->id);
            })
            ->get();

        return response()->json([
            'pending' => $pendingActions,
            'count' => $pendingActions->count(),
        ]);
    }

    public function getOverdueDocuments()
    {
        $user = Auth::user();
        $threeHoursAgo = now()->subHours(3);

        $sentOverdue = DocumentAction::with(['document', 'receiverDepartment', 'receiverUser'])
            ->where('sender_id', $user->id)
            ->where('action_type', 'forward')
            ->whereNull('acknowledged_at')
            ->where('created_at', '<', $threeHoursAgo)
            ->get();

        $receivedOverdue = DocumentAction::with(['document', 'sender'])
            ->where('action_type', 'forward')
            ->whereNull('acknowledged_at')
            ->where('created_at', '<', $threeHoursAgo)
            ->where(function ($query) use ($user) {
                $query->where('receiver_department_id', $user->department_id)
                    ->orWhere('receiver_user_id', $user->id);
            })
            ->get();

        return response()->json([
            'sent_overdue' => $sentOverdue,
            'received_overdue' => $receivedOverdue,
            'has_overdue' => $sentOverdue->count() > 0 || $receivedOverdue->count() > 0,
        ]);
    }

    public function distributeCircular(Request $request, Document $document)
    {
        $users = User::all();

        foreach ($users as $user) {
            DocumentCircularRecipient::firstOrCreate([
                'document_id' => $document->id,
                'user_id' => $user->id,
            ]);
        }

        Notification::send($users, new DocumentNotification($document, 'circular', Auth::user()->name));

        $document->update(['type' => 'circular', 'status' => 'distributed']);

        return back()->with('success', 'ส่งหนังสือเวียนแจ้งทราบเรียบร้อยแล้ว');
    }

    public function acknowledge(Request $request, Document $document)
    {
        $recipient = DocumentCircularRecipient::where('document_id', $document->id)
            ->where('user_id', Auth::id())
            ->first();

        if ($recipient) {
            $recipient->update(['read_at' => now()]);
        } else {
            DocumentCircularRecipient::create([
                'document_id' => $document->id,
                'user_id' => Auth::id(),
                'read_at' => now(),
            ]);
        }

        return back()->with('success', 'รับทราบเรียบร้อยแล้ว');
    }

    public function dashboard()
    {
        $user = Auth::user();

        $base = Document::query();
        $this->scopeDocumentsForUser($base, $user);

        $total = (clone $base)->count();
        $pending = (clone $base)->whereIn('status', ['registered', 'pending', 'pending_director'])->count();
        $inProgress = (clone $base)->whereIn('status', ['approved', 'in_progress'])->count();
        $completed = (clone $base)->where('status', 'completed')->count();
        $archived = (clone $base)->where('status', 'archived')->count();
        $inboxCount = $this->pendingInboxCount($user);

        $deptStats = Department::withCount(['receivedDocuments' => function ($query) {
            $query->where('action_type', 'forward');
        }])->orderBy('name')->get()->map(function ($dept) {
            return [
                'name' => $dept->name,
                'received_count' => $dept->received_documents_count,
            ];
        });

        $recent = (clone $base)->with(['creator', 'department'])->latest()->take(8)->get();

        $pendingInbox = DocumentAction::with(['document', 'sender', 'receiverDepartment'])
            ->where('action_type', 'forward')
            ->whereNull('acknowledged_at')
            ->where('status', 'pending')
            ->where(function ($q) use ($user) {
                $q->where('receiver_user_id', $user->id)
                    ->orWhere(function ($sub) use ($user) {
                        $sub->whereNull('receiver_user_id')
                            ->where('receiver_department_id', $user->department_id);
                    });
            })
            ->latest()
            ->take(5)
            ->get();

        return Inertia::render('documents/Dashboard', [
            'stats' => [
                'total' => $total,
                'pending' => $pending,
                'in_progress' => $inProgress,
                'completed' => $completed,
                'archived' => $archived,
                'inbox' => $inboxCount,
            ],
            'deptStats' => $deptStats,
            'recent' => $recent,
            'pendingInbox' => $pendingInbox,
        ]);
    }

    private function scopeDocumentsForUser($query, $user)
    {
        $canViewAll = false;
        try {
            $canViewAll = (method_exists($user, 'hasAnyRole') && $user->hasAnyRole(['admin', 'Admin', 'superUser', 'boss', 'Boss']))
                || (method_exists($user, 'hasRole') && ($user->hasRole('admin') || $user->hasRole('Admin') || $user->hasRole('superUser') || $user->hasRole('boss') || $user->hasRole('Boss')));
        } catch (\Throwable $e) {
            $canViewAll = false;
        }

        if ($canViewAll) {
            return $query;
        }

        return $query->where(function ($q) use ($user) {
            $q->where('department_id', $user->department_id)
                ->orWhere('user_id', $user->id)
                ->orWhereHas('actions', function ($a) use ($user) {
                    $a->where('receiver_user_id', $user->id)
                        ->orWhere('receiver_department_id', $user->department_id)
                        ->orWhere('sender_id', $user->id);
                });
        });
    }

    private function pendingInboxCount($user): int
    {
        return DocumentAction::where('action_type', 'forward')
            ->whereNull('acknowledged_at')
            ->where('status', 'pending')
            ->where(function ($q) use ($user) {
                $q->where('receiver_user_id', $user->id)
                    ->orWhere(function ($sub) use ($user) {
                        $sub->whereNull('receiver_user_id')
                            ->where('receiver_department_id', $user->department_id);
                    });
            })
            ->count();
    }

    private function notifyOriginDepartment(Document $document, string $action, string $actorName): void
    {
        $users = collect();

        if ($document->department_id) {
            $users = User::where('department_id', $document->department_id)->get();
        }

        if ($document->creator) {
            $users = $users->push($document->creator)->unique('id');
        }

        if ($users->isNotEmpty()) {
            Notification::send($users, new DocumentNotification($document, $action, $actorName, false));
        }

        if ($document->department_id) {
            $department = Department::find($document->department_id);
            if ($department) {
                app(AdminHubChatNotifier::class)->documentToDepartment($document, $department, $action, $actorName);
            }
        }
    }

    private function checkDocumentCompletion(Document $document): void
    {
        $forwardActions = $document->actions()->where('action_type', 'forward')->get();

        if ($forwardActions->isEmpty()) {
            return;
        }

        $allResolved = $forwardActions->every(function ($action) {
            return $action->acknowledged_at
                && in_array($action->implementation_status, ['completed', 'not_relevant'], true);
        });

        if ($allResolved) {
            $document->update(['status' => 'completed']);
            $this->notifyOriginDepartment($document, 'completed', 'ระบบ');
        }
    }
}
