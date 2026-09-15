<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\User;
use App\Services\Auth\UserLineAccountMergeService;
use App\Services\FshhChat\FshhChatSyncService;
use App\Services\HosxpService;
use App\Services\Line\LineMessagingService;
use App\Services\StaffRosterService;
use App\Support\PostLoginRedirect;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class CompleteProfileController extends Controller
{
    public function __construct(
        protected readonly HosxpService $hosxp,
        protected readonly LineMessagingService $messaging,
        protected readonly StaffRosterService $rosterService,
        protected readonly FshhChatSyncService $fshhChat,
        protected readonly UserLineAccountMergeService $lineMerge,
    ) {}

    public function show()
    {
        $user = Auth::user();

        if ($user->profile_completed) {
            return redirect()->away(PostLoginRedirect::destinationAfterRegistration($user, request()));
        }

        $departments = Department::orderBy('name')->get(['id', 'name']);
        $email = $user->email;
        if (is_string($email) && str_contains($email, '@line.login')) {
            $email = '';
        }

        $nameParts = preg_split('/\s+/u', trim((string) $user->name)) ?: [];
        $lastName = count($nameParts) > 1 ? (string) array_pop($nameParts) : '';
        $firstName = trim(implode(' ', $nameParts));
        $roster = $this->rosterService->findMatch($firstName, $lastName, $user->cid);
        $rosterMatch = $roster ? $this->rosterService->toLookupPayload($roster) : null;

        return Inertia::render('auth/complete-profile', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'prefix' => $user->prefix ?? $rosterMatch['prefix'] ?? null,
                'email' => $email,
                'cid' => $user->cid ?? $rosterMatch['cid'] ?? null,
                'phone' => $user->phone ?? $rosterMatch['phone'] ?? null,
                'position' => $user->position ?? $rosterMatch['position'] ?? null,
                'line_id' => $user->line_id,
                'line_display_name' => $user->line_display_name,
                'line_picture_url' => $user->line_picture_url,
                'avatar' => $user->avatar,
            ],
            'rosterMatch' => $rosterMatch,
            'departments' => $departments,
            'positionOptions' => $this->rosterService->positionOptions(),
            'addFriendUrl' => config('services.line.add_friend_url'),
        ]);
    }

    public function update(Request $request)
    {
        $user = Auth::user();

        $cid = HosxpService::normalizeCid((string) $request->input('cid', ''));
        $typedEmail = strtolower(trim((string) $request->input('email', '')));

        if ($this->lineMerge->isIncompleteLineStub($user)) {
            $canMatchCid = strlen($cid) === 13;
            $canMatchEmail = $typedEmail !== '' && ! str_ends_with($typedEmail, '@line.login');
            if ($canMatchCid || $canMatchEmail) {
                $existing = User::query()
                    ->where('id', '!=', $user->id)
                    ->where(function ($q) use ($cid, $typedEmail, $canMatchCid, $canMatchEmail) {
                        if ($canMatchCid) {
                            $q->where('cid', $cid);
                        }
                        if ($canMatchEmail) {
                            $q->orWhere('email', $typedEmail);
                        }
                    })
                    ->first();

                if ($existing) {
                    $user = $this->lineMerge->absorbStub($user, $existing);
                    Auth::login($user);
                    $request->session()->regenerate();
                }
            }
        }

        $request->merge([
            'cid' => $cid,
            'position' => $request->input('position') === '__none__' ? null : $request->input('position'),
        ]);

        $validated = $request->validate([
            'prefix' => 'required|string|max:50',
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'position' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255|unique:users,email,'.$user->id,
            'cid' => 'required|string|size:13|unique:users,cid,'.$user->id,
            'department_ids' => 'required|array|min:1',
            'department_ids.*' => 'exists:departments,id',
            'primary_department_id' => 'required|exists:departments,id',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ], [
            'prefix.required' => 'กรุณากรอกคำนำหน้า',
            'first_name.required' => 'กรุณากรอกชื่อ',
            'last_name.required' => 'กรุณากรอกนามสกุล',
            'email.email' => 'รูปแบบอีเมลไม่ถูกต้อง',
            'email.unique' => 'อีเมลนี้ถูกใช้แล้ว',
            'cid.required' => 'กรุณากรอกเลขบัตรประชาชน 13 หลัก',
            'cid.size' => 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก',
            'cid.unique' => 'เลขบัตรประชาชนนี้ถูกใช้สมัครแล้ว กรุณาเข้าสู่ระบบด้วยบัญชีเดิมแล้วผูก LINE ที่โปรไฟล์',
            'department_ids.required' => 'กรุณาเลือกแผนกอย่างน้อย 1 แผนก',
            'department_ids.min' => 'กรุณาเลือกแผนกอย่างน้อย 1 แผนก',
            'primary_department_id.required' => 'กรุณาเลือกแผนกหลัก',
            'avatar.image' => 'ไฟล์ต้องเป็นรูปภาพ',
            'avatar.max' => 'ขนาดไฟล์ต้องไม่เกิน 2MB',
        ]);

        $cid = (string) $validated['cid'];
        if (! HosxpService::isValidThaiCid($cid)) {
            throw ValidationException::withMessages([
                'cid' => 'เลขบัตรประชาชนไม่ถูกต้อง',
            ]);
        }

        $roster = $this->rosterService->findMatch(
            $validated['first_name'],
            $validated['last_name'],
            $cid,
        );

        if (! $roster) {
            throw ValidationException::withMessages([
                'first_name' => 'ไม่พบข้อมูลในระบบ กรุณาติดต่อเจ้าหน้าที่สารสนเทศเพื่อสร้างข้อมูลให้',
            ]);
        }

        $avatarPath = $user->avatar;
        if ($request->hasFile('avatar')) {
            if ($user->avatar && ! str_starts_with($user->avatar, 'http') && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }
            $avatarPath = $request->file('avatar')->store('avatars', 'public');
        }

        $prefix = $this->rosterService->normalizeName($validated['prefix'] ?? '');
        $fullName = trim($validated['first_name'].' '.$validated['last_name']);
        $position = $this->rosterService->normalizePosition($validated['position'] ?? '');

        $email = trim((string) ($validated['email'] ?? ''));
        if ($email === '') {
            $email = $user->email;
        }

        $user->update([
            'prefix' => $prefix,
            'name' => $fullName,
            'email' => $email,
            'cid' => $cid,
            'phone' => $validated['phone'] ?? $roster->phone,
            'position' => $position,
            'department_id' => $validated['primary_department_id'],
            'avatar' => $avatarPath,
            'profile_completed' => true,
        ]);

        $this->rosterService->assignRoleFromRoster($user, $roster);
        $user->unsetRelation('roles');
        $user->load('roles');

        $departmentData = [];
        foreach ($validated['department_ids'] as $deptId) {
            $departmentData[$deptId] = [
                'is_primary' => $deptId == $validated['primary_department_id'],
            ];
        }
        $user->departments()->sync($departmentData);

        $this->fshhChat->syncUser($user->fresh(['departments']));

        $push = ['ok' => false, 'message' => ''];
        if ($user->line_id) {
            $chatHint = "\n\nเข้ากลุ่มแผนก/ฝ่ายใน FSHH Chat:\n".(string) config('services.fshh_chat.liff_url');
            $push = $this->messaging->pushText(
                $user->line_id,
                $this->messaging->welcomeText($user->display_name).$chatHint
            );
        }

        $flash = $push['ok']
            ? 'บันทึกข้อมูลสำเร็จ และส่งข้อความยืนยันทาง LINE แล้ว'
            : 'บันทึกข้อมูลสำเร็จ แต่ส่งข้อความ LINE ไม่ได้ (ต้องแอดเพื่อนบัญชีทางการก่อน)';

        session()->flash('success', $flash);

        return Inertia::location(PostLoginRedirect::destinationAfterRegistration($user, $request));
    }
}
