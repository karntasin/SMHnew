<?php

use Inertia\Inertia;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\CvRiskReportController;
use App\Http\Controllers\MenuController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\BackupController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\UserFileController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\SettingAppController;
use App\Http\Controllers\MediaFolderController;
use App\Http\Controllers\QualityDocumentController;
use App\Http\Controllers\RoomBookingController;
use App\Http\Controllers\LanguageController;

Route::redirect('/', '/login')->name('home');

Route::middleware(['auth', 'menu.permission'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('dashboard/stats', [DashboardController::class, 'stats'])->name('dashboard.stats');
    Route::get('dashboard/monthly-visits', [DashboardController::class, 'monthlyVisits'])->name('dashboard.monthly-visits');
    Route::get('dashboard/cv-risk-report', [CvRiskReportController::class, 'export'])->name('dashboard.cv-risk-report');

    Route::resource('roles', RoleController::class);
    Route::resource('menus', MenuController::class);
    Route::post('menus/reorder', [MenuController::class, 'reorder'])->name('menus.reorder');
    Route::resource('permissions', PermissionController::class);
    Route::resource('users', UserController::class);
    Route::put('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password');
    Route::get('/settingsapp', [SettingAppController::class, 'edit'])->name('setting.edit');
    Route::post('/settingsapp', [SettingAppController::class, 'update'])->name('setting.update');
    Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');
    Route::get('/backup', [BackupController::class, 'index'])->name('backup.index');
    Route::post('/backup/run', [BackupController::class, 'run'])->name('backup.run');
    Route::get('/backup/download/{file}', [BackupController::class, 'download'])->name('backup.download');
    Route::delete('/backup/delete/{file}', [BackupController::class, 'delete'])->name('backup.delete');
    Route::get('/files', [UserFileController::class, 'index'])->name('files.index');
    Route::post('/files', [UserFileController::class, 'store'])->name('files.store');
    Route::delete('/files/{id}', [UserFileController::class, 'destroy'])->name('files.destroy');
    Route::resource('media', MediaFolderController::class);

    // Quality Document Repository
    Route::prefix('quality-docs')->name('quality-docs.')->group(function () {
        Route::get('/', [QualityDocumentController::class, 'index'])->name('index');
        Route::get('/create', [QualityDocumentController::class, 'create'])->name('create');
        Route::post('/store', [QualityDocumentController::class, 'store'])->name('store');
        Route::get('/{qualityDoc}', [QualityDocumentController::class, 'show'])->name('show');
        Route::get('/{qualityDoc}/download', [QualityDocumentController::class, 'download'])->name('download');
            Route::post('/{qualityDoc}/versions', [QualityDocumentController::class, 'uploadVersion'])->name('versions.upload');
                Route::get('/{qualityDoc}/versions/{version}/download', [QualityDocumentController::class, 'downloadVersion'])->name('versions.download');

        // Approval/workflow actions
        Route::post('/{qualityDoc}/submit', [QualityDocumentController::class, 'submitForReview'])->name('submit');
        Route::post('/{qualityDoc}/approve', [QualityDocumentController::class, 'approve'])->name('approve');
        Route::post('/{qualityDoc}/reject', [QualityDocumentController::class, 'reject'])->name('reject');
    });

    // Administration -> Meeting rooms / bookings (งานธุรการ -> จองห้องประชุม)
    Route::prefix('administration/rooms')->name('rooms.')->group(function () {
        Route::get('/', [RoomBookingController::class, 'index'])->name('index');
        // Calendar page (Inertia) — renders the React page
        Route::get('/calendar', function () {
            return Inertia::render('admin/rooms/Calendar');
        })->name('calendar');
        // Calendar events API (returns JSON for FullCalendar)
        Route::get('/calendar/events', [RoomBookingController::class, 'calendar'])->name('calendar.events');
    Route::get('/meeting-rooms', [RoomBookingController::class, 'meetingRooms'])->name('meeting-rooms');
        Route::get('/my', [RoomBookingController::class, 'myBookings'])->name('my');
        Route::post('/bookings', [RoomBookingController::class, 'store'])->name('bookings.store');
        Route::post('/bookings/{booking}/approve', [RoomBookingController::class, 'approve'])->name('bookings.approve');
        Route::get('/bookings/{booking}', [RoomBookingController::class, 'show'])->name('bookings.show');
        Route::put('/bookings/{booking}', [RoomBookingController::class, 'update'])->name('bookings.update');
        Route::delete('/bookings/{booking}', [RoomBookingController::class, 'destroy'])->name('bookings.destroy');
    });
});

// Locale switcher (outside auth)
Route::get('/locale/{locale}', [LanguageController::class, 'switch'])->name('locale.switch');
Route::post('/locale', [LanguageController::class, 'update'])->name('locale.update');

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
