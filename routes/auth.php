<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\RegisteredUserController;
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

Route::middleware('guest')->group(function () {
    Route::get('register', [RegisteredUserController::class, 'create'])
        ->name('register');

    Route::post('register', [RegisteredUserController::class, 'store']);

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
