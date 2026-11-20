<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\StaffRosterLookupController;
use App\Http\Controllers\Auth\VerifyEmailController;
use App\Http\Controllers\LineAuthController;
use App\Http\Controllers\CompleteProfileController;
use App\Http\Controllers\LineWebhookController;
use Illuminate\Support\Facades\Route;

// LINE Authentication Routes (Accessible by both guests and authenticated users)
Route::get('auth/line', [LineAuthController::class, 'redirectToProvider'])->name('auth.line');
Route::get('auth/line/callback', [LineAuthController::class, 'handleProviderCallback'])->name('auth.line.callback');
Route::get('auth/line/qr/status', [LineAuthController::class, 'qrStatus'])->name('auth.line.qr.status');
Route::get('auth/line/qr/claim', [LineAuthController::class, 'qrClaim'])->name('auth.line.qr.claim');
Route::get('auth/line/transfer', [LineAuthController::class, 'transfer'])->name('auth.line.transfer');
Route::post('line/webhook', LineWebhookController::class)->name('line.webhook');

// Voice Authentication Routes (Public / Guest - 1:1 Verification)
Route::get('auth/voice/challenge', [\App\Http\Controllers\Auth\VoiceAuthController::class, 'challenge'])->name('auth.voice.challenge');
Route::get('auth/voice/search-users', [\App\Http\Controllers\Auth\VoiceAuthController::class, 'searchUsers'])->name('auth.voice.search-users');
Route::post('auth/voice/login', [\App\Http\Controllers\Auth\VoiceAuthController::class, 'login'])->middleware('throttle:10,1')->name('auth.voice.login');

// Face & Biometrics Authentication Routes (Public / Guest - Hybrid 1:1 Verification)
Route::get('auth/face/challenge', [\App\Http\Controllers\Auth\FaceAuthController::class, 'challenge'])->name('auth.face.challenge');
Route::get('auth/face/search-users', [\App\Http\Controllers\Auth\FaceAuthController::class, 'searchUsers'])->name('auth.face.search-users');
Route::post('auth/face/camera-login', [\App\Http\Controllers\Auth\FaceAuthController::class, 'cameraLogin'])->middleware('throttle:10,1')->name('auth.face.camera-login');
Route::post('auth/face/passkey-login', [\App\Http\Controllers\Auth\FaceAuthController::class, 'passkeyLogin'])->middleware('throttle:10,1')->name('auth.face.passkey-login');

Route::middleware('guest')->group(function () {
    Route::get('register', [RegisteredUserController::class, 'create'])
        ->name('register');

    Route::post('register', [RegisteredUserController::class, 'store']);

    Route::post('register/roster-lookup', StaffRosterLookupController::class)
        ->middleware('throttle:30,1')
        ->name('register.roster-lookup');

    Route::get('login', [AuthenticatedSessionController::class, 'create'])
        ->name('login');

    Route::post('login', [AuthenticatedSessionController::class, 'store']);

    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])
        ->name('password.request');

    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])
        ->name('password.email');

    Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])
        ->name('password.reset');

    Route::post('reset-password', [NewPasswordController::class, 'store'])
        ->name('password.store');
});

Route::middleware('auth')->group(function () {
    Route::post('profile/roster-lookup', StaffRosterLookupController::class)
        ->middleware('throttle:30,1')
        ->name('profile.roster-lookup');

    // Complete Profile (for new LINE users)
    Route::get('profile/complete', [CompleteProfileController::class, 'show'])
        ->name('profile.complete');
    Route::post('profile/complete', [CompleteProfileController::class, 'update'])
        ->name('profile.complete.update');

    Route::get('verify-email', EmailVerificationPromptController::class)
        ->name('verification.notice');

    Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    Route::get('confirm-password', [ConfirmablePasswordController::class, 'show'])
        ->name('password.confirm');

    Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);

    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');
});
