<?php

namespace App\Http\Controllers;

use App\Models\LeaveApproval;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\User;
use App\Notifications\LeaveNotification;
use App\Services\FshhChat\AdminHubChatNotifier;
use App\Services\FshhChat\FshhChatSyncService;
use App\Services\Leave\LeaveFormService;
use App\Services\ThaiPdfService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class LeaveRequestController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $tab = $request->input('tab', 'my');

        $myRequests = LeaveRequest::query()
            ->with(['leaveType', 'approvals.approver'])
            ->where('user_id', $user->id)
            ->latest()
            ->paginate(10, ['*'], 'my_page')
            ->withQueryString();

        $pendingApprovals = LeaveRequest::query()
            ->with(['user', 'leaveType', 'approvals.approver'])
            ->where(function ($q) use ($user) {
                $q->whereHas('approvals', function ($aq) use ($user) {
                    $aq->where('approver_id', $user->id)->where('action', 'pending');
                });
                if ($this->isHrStaff($user)) {
                    $q->orWhere('status', 'pending_hr');
                }
            })
            ->latest()
            ->paginate(10, ['*'], 'pending_page')
            ->withQueryString();

        $allRequests = null;
        $isHr = $this->isHrStaff($user);
        if ($user->hasAnyRole(['admin', 'superUser']) || $isHr) {
            $allRequests = LeaveRequest::query()
                ->with(['user', 'leaveType', 'approvals.approver'])
                ->when($request->input('search'), fn ($q, $s) => $q->whereHas('user', fn ($uq) => $uq->where('name', 'like', "%{$s}%")))
                ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
                ->latest()
                ->paginate(10, ['*'], 'all_page')
                ->withQueryString();
        }

        $balances = LeaveBalance::query()
            ->with('leaveType')
            ->where('user_id', $user->id)
            ->where('year', now()->year)
            ->get();

        $leaveTypes = LeaveType::query()->active()->orderBy('sort_order')->get();

        return Inertia::render('AdminHub/leave/Index', [
            'myRequests' => $myRequests,
            'pendingApprovals' => $pendingApprovals,
            'allRequests' => $allRequests,
            'balances' => $balances,
            'leaveTypes' => $leaveTypes,
            'tab' => $tab,
            'filters' => $request->only(['search', 'status']),
            'statusLabels' => LeaveRequest::STATUS_LABELS,
            'statusColors' => LeaveRequest::STATUS_COLORS,
            'isAdmin' => $user->hasAnyRole(['admin', 'superUser']) || $isHr,
            'isHr' => $isHr,
        ]);
    }

    public function create()
    {
        $user = Auth::user();
        $user->loadMissing('department');
        $leaveTypes = LeaveType::query()->active()->orderBy('sort_order')->get();
        $users = User::query()
            ->where('id', '!=', $user->id)
            ->where('profile_completed', true)
            ->orderBy('name')
            ->get(['id', 'name', 'position']);

        $balances = LeaveBalance::query()
            ->with('leaveType')
            ->where('user_id', $user->id)
            ->where('year', now()->year)
            ->get()
            ->keyBy('leave_type_id');

        return Inertia::render('AdminHub/leave/Create', [
            'leaveTypes' => $leaveTypes,
            'users' => $users,
            'balances' => $balances,
            'user' => [
                'name' => $user->name,
                'position' => $user->position,
                'phone' => $user->phone,
                'department' => $user->department?->name,
            ],
            'defaults' => [
                'written_at' => $user->department?->name ?: config('app.name'),
                'addressee' => 'ผู้อำนวยการ',
            ],
        ]);
    }

    public function store(Request $request, LeaveFormService $form)
    {
        $validated = $request->validate([
            'leave_type_id' => 'required|exists:leave_types,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'required|string|max:1000',
            'contact_address' => 'nullable|string|max:500',
            'contact_phone' => 'nullable|string|max:50',
            'delegate_name' => 'nullable|string|max:255',
            'written_at' => 'nullable|string|max:255',
            'addressee' => 'required|string|max:255',
            'destination' => 'nullable|string|max:255',
            'return_date' => 'nullable|date|after_or_equal:end_date',
            'supervisor_id' => 'required|exists:users,id',
            'attachment' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ], [
            'leave_type_id.required' => 'กรุณาเลือกประเภทการลา',
            'start_date.required' => 'กรุณาระบุวันที่เริ่มลา',
            'end_date.required' => 'กรุณาระบุวันที่สิ้นสุดลา',
            'reason.required' => 'กรุณาระบุรายละเอียดตามแบบใบลา',
            'addressee.required' => 'กรุณาระบุผู้ที่เรียนในใบลา',
            'supervisor_id.required' => 'กรุณาเลือกผู้อนุมัติ',
        ]);

        $leaveType = LeaveType::query()->findOrFail($validated['leave_type_id']);
        $totalDays = $form->calculateDays($validated['start_date'], $validated['end_date'], $leaveType);

        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $attachmentPath = $request->file('attachment')->store('leave-attachments', 'public');
        }

        DB::transaction(function () use ($validated, $totalDays, $attachmentPath, $leaveType) {
            $leave = LeaveRequest::create([
                'request_number' => LeaveRequest::generateRequestNumber(),
                'user_id' => Auth::id(),
                'leave_type_id' => $validated['leave_type_id'],
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'total_days' => $totalDays,
                'reason' => $validated['reason'],
                'contact_address' => $validated['contact_address'] ?? null,
                'contact_phone' => $validated['contact_phone'] ?? null,
                'delegate_name' => $validated['delegate_name'] ?? null,
                'written_at' => $validated['written_at'] ?? null,
                'addressee' => $validated['addressee'],
                'destination' => $validated['destination'] ?? null,
                'return_date' => $validated['return_date'] ?? null,
                'status' => 'pending_supervisor',
                'attachment_path' => $attachmentPath,
                'submitted_at' => now(),
            ]);

            LeaveApproval::create([
                'leave_request_id' => $leave->id,
                'step' => 1,
                'role_label' => 'หัวหน้าแผนก',
                'approver_id' => $validated['supervisor_id'],
            ]);

            $supervisor = User::find($validated['supervisor_id']);
            if ($supervisor) {
                $supervisor->notify(new LeaveNotification($leave, 'new_request'));
            }
        });

        return redirect()->route('leave.index')->with('success', 'ส่งใบลาเรียบร้อยแล้ว ตามแบบ '.$leaveType->form_number);
    }

    public function show(LeaveRequest $leave)
    {
        $leave->load(['user.department', 'leaveType', 'approvals.approver']);
        $user = Auth::user();
        $isHr = $this->isHrStaff($user);
        $canApprove = $this->userCanApprove($leave, $user);
        $canReviewHr = $leave->status === 'pending_hr' && $isHr;
        $canCancel = $leave->canBeCancelledBy($user);

        return Inertia::render('AdminHub/leave/Show', [
            'leave' => $leave,
            'canApprove' => $canApprove,
            'canReviewHr' => $canReviewHr,
            'canCancel' => $canCancel,
            'isHr' => $isHr,
            'viewerId' => $user->id,
            'directors' => $canReviewHr ? $this->directorOptions() : [],
            'balance' => $this->balanceSnapshot($leave),
            'statusLabels' => LeaveRequest::STATUS_LABELS,
            'statusColors' => LeaveRequest::STATUS_COLORS,
        ]);
    }

    public function approve(Request $request, LeaveRequest $leave)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'action' => 'required|in:approved,rejected',
            'comment' => 'nullable|string|max:500',
        ]);

        $approval = $this->pendingApprovalFor($leave, $user);
        if (! $approval) {
            return back()->with('error', 'ไม่พบสิทธิ์อนุมัติใบลานี้');
        }

        DB::transaction(function () use ($leave, $approval, $validated, $user) {
            $approval->update([
                'action' => $validated['action'],
                'approver_id' => $approval->approver_id ?: $user->id,
                'comment' => $validated['comment'] ?? null,
                'acted_at' => now(),
            ]);

            if ($validated['action'] === 'rejected') {
                $leave->update([
                    'status' => 'rejected',
                    'completed_at' => now(),
                ]);
                $leave->loadMissing('user');
                $leave->user->notify(new LeaveNotification($leave, 'rejected', $validated['comment'] ?? ''));

                return;
            }

            $this->advanceWorkflow($leave);
        });

        $msg = $validated['action'] === 'approved'
            ? ($leave->fresh()->status === 'pending_hr' ? 'อนุมัติแล้ว ส่งให้ฝ่ายธุรการตรวจสอบ' : 'อนุมัติใบลาเรียบร้อย')
            : 'ตีกลับใบลาไปยังผู้ขอแล้ว';

        return back()->with('success', $msg);
    }

    public function forwardToDirector(Request $request, LeaveRequest $leave)
    {
        $user = Auth::user();
        if (! $this->isHrStaff($user) || $leave->status !== 'pending_hr') {
            return back()->with('error', 'ไม่มีสิทธิ์ตรวจสอบใบลานี้');
        }

        $validated = $request->validate([
            'director_id' => 'required|exists:users,id',
            'comment' => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($leave, $validated, $user) {
            $hrApproval = $leave->approvals()->where('step', 2)->where('action', 'pending')->first();
            if ($hrApproval) {
                $hrApproval->update([
                    'action' => 'approved',
                    'approver_id' => $user->id,
                    'comment' => $validated['comment'] ?? null,
                    'acted_at' => now(),
                ]);
            }

            LeaveApproval::create([
                'leave_request_id' => $leave->id,
                'step' => 3,
                'role_label' => 'ผู้อำนวยการ',
                'approver_id' => $validated['director_id'],
            ]);

            $leave->update(['status' => 'pending_director']);

            $director = User::find($validated['director_id']);
            if ($director) {
                $director->notify(new LeaveNotification($leave, 'pending_director'));
            }
        });

        return back()->with('success', 'ตรวจสอบวันลาแล้ว ส่งให้ผู้อำนวยการอนุมัติ');
    }

    public function cancel(LeaveRequest $leave)
    {
        if (!$leave->canBeCancelledBy(Auth::user())) {
            return back()->with('error', 'ไม่สามารถยกเลิกใบลานี้ได้');
        }

        $leave->update([
            'status' => 'cancelled',
            'completed_at' => now(),
        ]);

        return back()->with('success', 'ยกเลิกใบลาเรียบร้อย');
    }

    private function advanceWorkflow(LeaveRequest $leave): void
    {
        $leave->refresh();
        $currentStep = $leave->approvals()->where('action', 'approved')->max('step');

        if ($currentStep === 1) {
            // Supervisor approved → send to HR
            LeaveApproval::create([
                'leave_request_id' => $leave->id,
                'step' => 2,
                'role_label' => 'ฝ่ายธุรการและกำลังพล',
                'approver_id' => null,
            ]);
            $leave->update(['status' => 'pending_hr']);
            $leave->loadMissing('user');
            if ($leave->user && ! $this->isHrStaff($leave->user)) {
                $leave->user->notify(new LeaveNotification($leave, 'pending_hr'));
            }
            $this->notifyHrStaff($leave);
            app(AdminHubChatNotifier::class)->leavePendingHr($leave);
        } elseif ($currentStep === 3) {
            // Director approved → final
            $leave->update([
                'status' => 'approved',
                'completed_at' => now(),
            ]);

            $this->updateBalance($leave);
            $leave->user->notify(new LeaveNotification($leave, 'approved'));
        }
    }

    private function updateBalance(LeaveRequest $leave): void
    {
        $balance = LeaveBalance::firstOrCreate(
            [
                'user_id' => $leave->user_id,
                'leave_type_id' => $leave->leave_type_id,
                'year' => $leave->start_date->year,
            ],
            [
                'entitled_days' => $leave->leaveType->max_days_per_year ?? 0,
                'used_days' => 0,
                'carry_over_days' => 0,
            ]
        );

        $balance->increment('used_days', (float) $leave->total_days);
    }

    private function userCanApprove(LeaveRequest $leave, User $user): bool
    {
        return $leave->approvals()
            ->where('action', 'pending')
            ->get()
            ->contains(fn (LeaveApproval $row) => (int) $row->approver_id === (int) $user->id);
    }

    private function pendingApprovalFor(LeaveRequest $leave, User $user): ?LeaveApproval
    {
        $pending = $leave->approvals()
            ->where('action', 'pending')
            ->orderBy('step')
            ->get();

        $assigned = $pending->first(fn (LeaveApproval $row) => (int) $row->approver_id === (int) $user->id);
        if ($assigned) {
            return $assigned;
        }

        if ($leave->status === 'pending_hr' && $this->isHrStaff($user)) {
            return $pending->first(fn (LeaveApproval $row) => (int) $row->step === 2);
        }

        return null;
    }

    private function isHrStaff(User $user): bool
    {
        if ($user->hasAnyRole(['admin', 'superUser'])) {
            return true;
        }

        $dept = app(FshhChatSyncService::class)->adminDepartment();
        if (! $dept) {
            return false;
        }

        if ((int) $user->department_id === (int) $dept->id) {
            return true;
        }

        return $user->departments()->where('departments.id', $dept->id)->exists();
    }

    private function notifyHrStaff(LeaveRequest $leave): void
    {
        $dept = app(FshhChatSyncService::class)->adminDepartment();
        $ids = collect();
        if ($dept) {
            $ids = $ids
                ->merge(User::query()->where('department_id', $dept->id)->pluck('id'))
                ->merge(User::query()->whereHas('departments', fn ($q) => $q->where('departments.id', $dept->id))->pluck('id'));
        }
        if ($ids->isEmpty()) {
            $ids = User::query()
                ->whereHas('roles', fn ($q) => $q->whereIn('name', ['admin', 'superUser']))
                ->pluck('id');
        }
        $ids = $ids
            ->unique()
            ->reject(fn ($id) => (int) $id === (int) $leave->user_id);

        if ($ids->isEmpty()) {
            return;
        }

        User::query()->whereIn('id', $ids)->get()
            ->each(fn (User $hr) => $hr->notify(new LeaveNotification($leave, 'hr_review', '', false)));
    }

    /**
     * @return \Illuminate\Support\Collection<int, User>
     */
    private function directorOptions()
    {
        $base = User::query()->where('profile_completed', true)->orderBy('name');

        $directors = $base->clone()
            ->where(function ($q) {
                $q->where('position', 'like', '%ผู้อำนวยการ%')
                    ->orWhereHas('roles', function ($r) {
                        $r->whereIn('name', ['boss', 'director', 'ผู้อำนวยการ'])
                            ->orWhere('name', 'like', '%ผอ%');
                    });
            })
            ->get(['id', 'name', 'position']);

        if ($directors->isNotEmpty()) {
            return $directors;
        }

        return $base->get(['id', 'name', 'position']);
    }

    /**
     * @return array<string, mixed>
     */
    private function balanceSnapshot(LeaveRequest $leave): array
    {
        $year = (int) $leave->start_date->year;
        $balance = LeaveBalance::query()
            ->where('user_id', $leave->user_id)
            ->where('leave_type_id', $leave->leave_type_id)
            ->where('year', $year)
            ->first();

        $entitled = (float) ($balance->entitled_days ?? $leave->leaveType->max_days_per_year ?? 0);
        $used = (float) ($balance->used_days ?? 0);
        $carry = (float) ($balance->carry_over_days ?? 0);
        $remaining = $entitled + $carry - $used;
        $requested = (float) $leave->total_days;

        return [
            'year' => $year,
            'leave_type' => $leave->leaveType?->name,
            'entitled_days' => $entitled,
            'used_days' => $used,
            'carry_over_days' => $carry,
            'remaining_days' => $remaining,
            'requested_days' => $requested,
            'after_days' => $remaining - $requested,
            'insufficient' => $remaining < $requested,
        ];
    }

    public function exportPdf(LeaveRequest $leave, LeaveFormService $form, ThaiPdfService $pdf)
    {
        $leave->load(['user.department', 'leaveType', 'approvals.approver']);
        [$fontRegularUri, $fontBoldUri] = $pdf->fontUris('thsarabunnew');

        $html = view('pdf.leave-form', [
            'leave' => $leave,
            'form' => $form,
            'meta' => $form->formMeta($leave->leaveType),
            'stats' => $form->fiscalStats($leave),
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
        ])->render();

        $binary = $pdf->render($html, 'portrait', 'clerical', 'thsarabunnew');
        $filename = ($leave->leaveType->form_number ?? 'ใบลา').'-'.$leave->request_number.'.pdf';

        return response($binary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }
}
