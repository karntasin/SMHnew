<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\Department;
use App\Services\FshhChat\FshhChatSyncService;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function __construct(
        protected readonly FshhChatSyncService $fshhChat,
    ) {}

    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        if (! $user) {
            return redirect()->route('login');
        }

        $user->load(['positions', 'departments']);
        $primary = $user->departments->first(fn ($dept) => (bool) $dept->pivot->is_primary);

        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            'departments' => Department::query()->orderBy('name')->get(['id', 'name']),
            'chatLiffUrl' => (string) config('services.fshh_chat.liff_url'),
            'addFriendUrl' => (string) config('services.line.add_friend_url'),
            'auth' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'chat_display_name' => $user->chat_display_name,
                    'line_id' => $user->line_id,
                    'line_display_name' => $user->line_display_name,
                    'line_picture_url' => $user->line_picture_url,
                    'avatar' => $user->avatar_url,
                    'department_ids' => $user->departments->pluck('id')->values()->all(),
                    'primary_department_id' => $primary?->id ?? $user->department_id,
                    'positions' => $user->positions->map(function ($pos) {
                        return [
                            'id' => $pos->id,
                            'name' => $pos->name,
                        ];
                    }),
                ],
            ],
        ]);
    }

    /**
     * Update the user's profile settings.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $user->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'chat_display_name' => $validated['chat_display_name'] ?? null,
        ]);

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        if (array_key_exists('department_ids', $validated)) {
            $primaryId = (int) $validated['primary_department_id'];
            $departmentData = [];
            foreach ($validated['department_ids'] as $deptId) {
                $departmentData[(int) $deptId] = [
                    'is_primary' => (int) $deptId === $primaryId,
                ];
            }
            $user->departments()->sync($departmentData);
            $user->update(['department_id' => $primaryId]);
        }

        $this->syncChat($user);

        return to_route('profile.edit')->with('status', 'profile-updated');
    }

    public function unlinkLine(Request $request): RedirectResponse
    {
        $user = $request->user();
        $user->update([
            'line_id' => null,
            'line_display_name' => null,
            'line_picture_url' => null,
        ]);

        return back()->with('status', 'line-unlinked');
    }

    /**
     * Update the user's avatar.
     */
    public function updateAvatar(Request $request): RedirectResponse
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $user = $request->user();

        if ($user->avatar && ! str_starts_with($user->avatar, 'http') && Storage::disk('public')->exists($user->avatar)) {
            Storage::disk('public')->delete($user->avatar);
        }

        $avatarPath = $request->file('avatar')->store('avatars', 'public');

        /** @var \App\Models\User $user */
        $user->update(['avatar' => $avatarPath]);
        $this->syncChat($user);

        return back()->with('status', 'avatar-updated');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    private function syncChat(\App\Models\User $user): void
    {
        try {
            $this->fshhChat->syncUser($user->fresh(['departments']) ?? $user);
        } catch (\Throwable $e) {
            Log::warning('FSHH Chat sync after profile update failed: '.$e->getMessage());
        }
    }
}
