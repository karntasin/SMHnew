<?php

use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\UserManualController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::redirect('settings', 'settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::post('settings/profile/avatar', [ProfileController::class, 'updateAvatar'])->name('profile.avatar.update');
    Route::delete('settings/profile/line', [ProfileController::class, 'unlinkLine'])->name('profile.line.unlink');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');
    Route::put('settings/password', [PasswordController::class, 'update'])->name('password.update');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance');

    // User Manuals in Settings
    Route::get('settings/manuals', [UserManualController::class, 'index'])->name('settings.manuals');
    Route::get('settings/manuals/profile/download', [UserManualController::class, 'downloadProfileManual'])->name('settings.manuals.profile.download');
});

// Download registration manual (accessible by guests and authenticated users)
Route::get('manuals/registration/download', [UserManualController::class, 'downloadRegistrationManual'])->name('settings.manuals.registration.download');

