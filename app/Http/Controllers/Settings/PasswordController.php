<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\PostLoginRedirect;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PasswordController extends Controller
{
    /**
     * Show the user's password settings page.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('settings/password', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            'mustChangePassword' => $user->needsPasswordChange(),
            'requiresUsername' => $user->needsUsername(),
            'username' => $user->username,
        ]);
    }

    /**
     * Update the user's password.
     */
    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();
        $rules = [
            'password' => ['required', Password::defaults(), 'confirmed'],
        ];

        if ($user->needsUsername()) {
            $rules['username'] = User::usernameRules($user->id);
        }

        $validated = $request->validate($rules, [
            'username.required' => 'กรุณาตั้งชื่อผู้ใช้สำหรับเข้าสู่ระบบ',
            'username.regex' => 'ชื่อผู้ใช้ใช้ได้เฉพาะตัวอักษร ตัวเลข และ . _ -',
            'username.unique' => 'ชื่อผู้ใช้นี้ถูกใช้แล้ว',
            'username.min' => 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษ',
        ]);

        if ($validated['password'] === User::INITIAL_PASSWORD) {
            throw ValidationException::withMessages([
                'password' => 'กรุณาตั้งรหัสผ่านใหม่ที่ไม่ใช่รหัสเริ่มต้น',
            ]);
        }

        $payload = [
            'password' => $validated['password'],
        ];
        if (isset($validated['username'])) {
            $payload['username'] = strtolower(trim($validated['username']));
        }

        $user->update($payload);
        $user->markPasswordChanged();
        $user->refresh();

        if ($user->isLoginReady()) {
            return redirect()->away(PostLoginRedirect::toCurrent('menus-hub', $request));
        }

        return back();
    }
}
