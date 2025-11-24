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
use App\Http\Controllers\Vehicle\VehicleBookingController;
use App\Http\Controllers\Vehicle\VehicleController;
use App\Http\Controllers\Vehicle\VehicleSettingController;

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

    // Quality Indicators System (ระบบตัวชี้วัดคุณภาพ)
    Route::prefix('quality-indicators')->name('quality-indicators.')->group(function () {
        Route::get('/', [App\Http\Controllers\QualityIndicatorController::class, 'index'])->name('index');
        Route::post('/', [App\Http\Controllers\QualityIndicatorController::class, 'store'])->name('store');
        Route::get('/dashboard', [App\Http\Controllers\QualityIndicatorController::class, 'dashboard'])->name('dashboard');
        Route::get('/{indicator}', [App\Http\Controllers\QualityIndicatorController::class, 'show'])->name('show');
        Route::put('/{indicator}', [App\Http\Controllers\QualityIndicatorController::class, 'update'])->name('update');
        Route::delete('/{indicator}', [App\Http\Controllers\QualityIndicatorController::class, 'destroy'])->name('destroy');
        Route::post('/{indicator}/entries', [App\Http\Controllers\QualityIndicatorController::class, 'storeEntry'])->name('entries.store');
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

    // Vehicle Booking System (ระบบจองรถ)
    Route::prefix('vehicles')->name('vehicles.')->group(function () {
        Route::get('/bookings', [VehicleBookingController::class, 'index'])->name('bookings.index');
        Route::get('/bookings/create', [VehicleBookingController::class, 'create'])->name('bookings.create');
        Route::post('/bookings', [VehicleBookingController::class, 'store'])->name('bookings.store');
        Route::get('/bookings/{booking}', [VehicleBookingController::class, 'show'])->name('bookings.show');
        Route::put('/bookings/{booking}', [VehicleBookingController::class, 'update'])->name('bookings.update');
        Route::delete('/bookings/{booking}', [VehicleBookingController::class, 'destroy'])->name('bookings.destroy');
        
        Route::get('/calendar', function () {
            return Inertia::render('vehicles/Calendar');
        })->name('calendar');
        Route::get('/calendar/events', [VehicleBookingController::class, 'calendar'])->name('calendar.events');

        // Vehicle Management
        Route::resource('manage', VehicleController::class);

        // Vehicle Settings
        Route::get('/settings', [VehicleSettingController::class, 'index'])->name('settings.index');
        Route::post('/settings/categories', [VehicleSettingController::class, 'storeCategory'])->name('settings.categories.store');
        Route::put('/settings/categories/{category}', [VehicleSettingController::class, 'updateCategory'])->name('settings.categories.update');
        Route::delete('/settings/categories/{category}', [VehicleSettingController::class, 'destroyCategory'])->name('settings.categories.destroy');
    });

    // Document Management System (ระบบรับส่งหนังสือ)
    Route::prefix('documents')->name('documents.')->group(function () {
        Route::get('/dashboard', [App\Http\Controllers\Document\DocumentDashboardController::class, 'index'])->name('dashboard');
        
        // Menu Routes
        Route::get('/inbox', [App\Http\Controllers\Document\DocumentController::class, 'inbox'])->name('inbox');
        Route::get('/sent', [App\Http\Controllers\Document\DocumentController::class, 'sent'])->name('sent');
        Route::get('/drafts', [App\Http\Controllers\Document\DocumentController::class, 'drafts'])->name('drafts');
        Route::get('/receive', [App\Http\Controllers\Document\DocumentController::class, 'receive'])->name('receive');
        Route::get('/import', [App\Http\Controllers\Document\DocumentController::class, 'import'])->name('import');
        Route::get('/settings', [App\Http\Controllers\Document\DocumentSettingController::class, 'index'])->name('settings');
        Route::post('/settings/types', [App\Http\Controllers\Document\DocumentSettingController::class, 'storeType'])->name('settings.types.store');
        Route::delete('/settings/types/{id}', [App\Http\Controllers\Document\DocumentSettingController::class, 'deleteType'])->name('settings.types.delete');
        
        Route::get('/templates', [App\Http\Controllers\Document\DocumentController::class, 'templates'])->name('templates');

        Route::get('/', [App\Http\Controllers\Document\DocumentController::class, 'index'])->name('index');
        Route::get('/create', [App\Http\Controllers\Document\DocumentController::class, 'create'])->name('create');
        Route::post('/', [App\Http\Controllers\Document\DocumentController::class, 'store'])->name('store');
        Route::get('/{document}', [App\Http\Controllers\Document\DocumentController::class, 'show'])->name('show');
        Route::post('/{document}/approve', [App\Http\Controllers\Document\DocumentController::class, 'approve'])->name('approve');
        Route::post('/{document}/kasien', [App\Http\Controllers\Document\DocumentController::class, 'kasien'])->name('kasien');
        Route::post('/{document}/distribute', [App\Http\Controllers\Document\DocumentController::class, 'distribute'])->name('distribute');
        Route::post('/distributions/{distribution}/acknowledge', [App\Http\Controllers\Document\DocumentController::class, 'acknowledge'])->name('acknowledge');
    });

    // Maintenance System (ระบบแจ้งซ่อม)
    Route::prefix('maintenance')->name('maintenance.')->group(function () {
        Route::get('/dashboard', [App\Http\Controllers\MaintenanceDashboardController::class, 'index'])->name('dashboard');
        
        Route::resource('requests', App\Http\Controllers\MaintenanceRequestController::class);
        
        Route::get('/settings', [App\Http\Controllers\MaintenanceSettingController::class, 'index'])->name('settings.index');
        
        // Category Routes
        Route::post('/settings/categories', [App\Http\Controllers\MaintenanceSettingController::class, 'storeCategory'])->name('settings.categories.store');
        Route::put('/settings/categories/{category}', [App\Http\Controllers\MaintenanceSettingController::class, 'updateCategory'])->name('settings.categories.update');
        Route::delete('/settings/categories/{category}', [App\Http\Controllers\MaintenanceSettingController::class, 'destroyCategory'])->name('settings.categories.destroy');
        
        // Priority Routes
        Route::post('/settings/priorities', [App\Http\Controllers\MaintenanceSettingController::class, 'storePriority'])->name('settings.priorities.store');
        Route::put('/settings/priorities/{priority}', [App\Http\Controllers\MaintenanceSettingController::class, 'updatePriority'])->name('settings.priorities.update');
        Route::delete('/settings/priorities/{priority}', [App\Http\Controllers\MaintenanceSettingController::class, 'destroyPriority'])->name('settings.priorities.destroy');
    });

    // Finance Dashboard
    Route::get('/finance-dashboard', [App\Http\Controllers\FinanceDashboardController::class, 'index'])->name('finance.dashboard');

    // Quality Assurance System (ระบบติดตามการทบทวน)
    Route::prefix('quality-assurance')->name('quality-assurance.')->group(function () {
        Route::get('/', [App\Http\Controllers\QualityAssuranceController::class, 'index'])->name('index');
        
        // Reviews
        Route::post('/reviews', [App\Http\Controllers\QualityAssuranceController::class, 'storeReview'])->name('reviews.store');
        Route::put('/reviews/{review}', [App\Http\Controllers\QualityAssuranceController::class, 'updateReview'])->name('reviews.update');
        Route::delete('/reviews/{review}', [App\Http\Controllers\QualityAssuranceController::class, 'destroyReview'])->name('reviews.destroy');

        // Audits
        Route::post('/audits', [App\Http\Controllers\QualityAssuranceController::class, 'storeAudit'])->name('audits.store');
        Route::put('/audits/{audit}', [App\Http\Controllers\QualityAssuranceController::class, 'updateAudit'])->name('audits.update');
        Route::delete('/audits/{audit}', [App\Http\Controllers\QualityAssuranceController::class, 'destroyAudit'])->name('audits.destroy');

        // Improvements
        Route::post('/improvements', [App\Http\Controllers\QualityAssuranceController::class, 'storeImprovement'])->name('improvements.store');
        Route::put('/improvements/{improvement}', [App\Http\Controllers\QualityAssuranceController::class, 'updateImprovement'])->name('improvements.update');
        Route::delete('/improvements/{improvement}', [App\Http\Controllers\QualityAssuranceController::class, 'destroyImprovement'])->name('improvements.destroy');
    });

    // ENV System
    Route::prefix('env')->name('env.')->group(function () {
        Route::get('/', [App\Http\Controllers\EnvController::class, 'index'])->name('index');
        
        // Assets
        Route::get('/assets', [App\Http\Controllers\EnvAssetController::class, 'index'])->name('assets.index');
        Route::post('/assets', [App\Http\Controllers\EnvAssetController::class, 'store'])->name('assets.store');
        Route::put('/assets/{asset}', [App\Http\Controllers\EnvAssetController::class, 'update'])->name('assets.update');
        Route::delete('/assets/{asset}', [App\Http\Controllers\EnvAssetController::class, 'destroy'])->name('assets.destroy');

        // PM Tracking
        Route::get('/pm', [App\Http\Controllers\EnvPmController::class, 'index'])->name('pm.index');
        Route::post('/pm', [App\Http\Controllers\EnvPmController::class, 'store'])->name('pm.store');

        // Incidents
        Route::get('/incidents', [App\Http\Controllers\EnvIncidentController::class, 'index'])->name('incidents.index');
        Route::post('/incidents', [App\Http\Controllers\EnvIncidentController::class, 'store'])->name('incidents.store');
        Route::put('/incidents/{incident}', [App\Http\Controllers\EnvIncidentController::class, 'update'])->name('incidents.update');
        Route::delete('/incidents/{incident}', [App\Http\Controllers\EnvIncidentController::class, 'destroy'])->name('incidents.destroy');

        // Utility Monitoring
        Route::get('/utility', [App\Http\Controllers\EnvUtilityController::class, 'index'])->name('utility.index');
        Route::post('/utility/system', [App\Http\Controllers\EnvUtilityController::class, 'storeSystem'])->name('utility.store-system');
        Route::post('/utility/checklist', [App\Http\Controllers\EnvUtilityController::class, 'storeChecklist'])->name('utility.store-checklist');
        Route::post('/utility/check', [App\Http\Controllers\EnvUtilityController::class, 'storeCheck'])->name('utility.store-check');
    });
});

// Locale switcher (outside auth)
Route::get('/locale/{locale}', [LanguageController::class, 'switch'])->name('locale.switch');
Route::post('/locale', [LanguageController::class, 'update'])->name('locale.update');

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
