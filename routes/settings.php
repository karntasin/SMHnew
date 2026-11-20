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

    // Voice Biometrics in Settings
    Route::get('settings/voice', [\App\Http\Controllers\Settings\VoiceProfileController::class, 'index'])->name('settings.voice');
    Route::get('settings/voice/challenge', [\App\Http\Controllers\Settings\VoiceProfileController::class, 'challenge'])->name('settings.voice.challenge');
    Route::post('settings/voice/enroll', [\App\Http\Controllers\Settings\VoiceProfileController::class, 'enroll'])->name('settings.voice.enroll');
    Route::post('settings/voice/test', [\App\Http\Controllers\Settings\VoiceProfileController::class, 'test'])->name('settings.voice.test');
    Route::delete('settings/voice', [\App\Http\Controllers\Settings\VoiceProfileController::class, 'destroy'])->name('settings.voice.destroy');

    // Face & Biometrics in Settings (Apple Face ID, Android Passkeys, AI Camera)
    Route::get('settings/face', [\App\Http\Controllers\Auth\FaceAuthController::class, 'settings'])->name('settings.face');
    Route::post('settings/face/enroll-camera', [\App\Http\Controllers\Auth\FaceAuthController::class, 'enrollCamera'])->name('settings.face.enroll-camera');
    Route::post('settings/face/enroll-passkey', [\App\Http\Controllers\Auth\FaceAuthController::class, 'enrollPasskey'])->name('settings.face.enroll-passkey');
    Route::delete('settings/face', [\App\Http\Controllers\Auth\FaceAuthController::class, 'destroy'])->name('settings.face.destroy');
});

// Download registration manual (accessible by guests and authenticated users)
Route::get('manuals/registration/download', [UserManualController::class, 'downloadRegistrationManual'])->name('settings.manuals.registration.download');

