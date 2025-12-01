<?php

namespace App\Http\Controllers;

use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class CompleteProfileController extends Controller
{
    public function show()
    {
        $user = Auth::user();
        
        // If profile is already completed, redirect to dashboard
        if ($user->profile_completed) {
            return redirect()->route('dashboard');
        }

        $departments = Department::orderBy('name')->get(['id', 'name']);

        return Inertia::render('auth/complete-profile', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'line_display_name' => $user->line_display_name,
                'line_picture_url' => $user->line_picture_url,
                'avatar' => $user->avatar,
            ],
            'departments' => $departments,
        ]);
    }

    public function update(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,' . $user->id,
            'department_ids' => 'required|array|min:1',
            'department_ids.*' => 'exists:departments,id',
            'primary_department_id' => 'required|exists:departments,id',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ], [
            'name.required' => 'กรุณากรอกชื่อ-นามสกุล',
            'email.required' => 'กรุณากรอกอีเมล',
            'email.email' => 'รูปแบบอีเมลไม่ถูกต้อง',
            'email.unique' => 'อีเมลนี้ถูกใช้แล้ว',
            'department_ids.required' => 'กรุณาเลือกแผนกอย่างน้อย 1 แผนก',
            'department_ids.min' => 'กรุณาเลือกแผนกอย่างน้อย 1 แผนก',
            'primary_department_id.required' => 'กรุณาเลือกแผนกหลัก',
            'avatar.image' => 'ไฟล์ต้องเป็นรูปภาพ',
            'avatar.max' => 'ขนาดไฟล์ต้องไม่เกิน 2MB',
        ]);

        // Handle avatar upload
        $avatarPath = $user->avatar;
        if ($request->hasFile('avatar')) {
            // Delete old avatar if exists and is not LINE picture
            if ($user->avatar && !str_starts_with($user->avatar, 'http') && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }
            
            $avatarPath = $request->file('avatar')->store('avatars', 'public');
        }

        /** @var \App\Models\User $user */
        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'department_id' => $validated['primary_department_id'], // Set primary as main department
            'avatar' => $avatarPath,
            'profile_completed' => true,
        ]);

        // Sync departments with pivot data (is_primary flag)
        $departmentData = [];
        foreach ($validated['department_ids'] as $deptId) {
            $departmentData[$deptId] = [
                'is_primary' => $deptId == $validated['primary_department_id'],
            ];
        }
        $user->departments()->sync($departmentData);

        return redirect()->route('dashboard')->with('success', 'บันทึกข้อมูลโปรไฟล์สำเร็จ');
    }
}
