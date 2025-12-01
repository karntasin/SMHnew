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
use App\Http\Controllers\Ic\IcController;

Route::redirect('/', '/login')->name('home');

Route::middleware(['auth', 'menu.permission'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('dashboard/stats', [DashboardController::class, 'stats'])->name('dashboard.stats');
    Route::get('dashboard/monthly-visits', [DashboardController::class, 'monthlyVisits'])->name('dashboard.monthly-visits');
    Route::get('dashboard/cv-risk-report', [CvRiskReportController::class, 'export'])->name('dashboard.cv-risk-report');

    // Notifications
    Route::get('/notifications', [App\Http\Controllers\NotificationController::class, 'page'])->name('notifications.index');
    Route::get('/notifications/api', [App\Http\Controllers\NotificationController::class, 'index'])->name('notifications.api');
    Route::get('/notifications/urgent', [App\Http\Controllers\NotificationController::class, 'urgent'])->name('notifications.urgent');
    Route::post('/notifications/{id}/read', [App\Http\Controllers\NotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::post('/notifications/read-all', [App\Http\Controllers\NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');

    Route::resource('roles', RoleController::class);
    Route::resource('menus', MenuController::class);
    Route::post('menus/reorder', [MenuController::class, 'reorder'])->name('menus.reorder');
    Route::resource('permissions', PermissionController::class);
    Route::get('/users/bulk-roles', [UserController::class, 'bulkRolesIndex'])->name('users.bulk-roles');
    Route::post('/users/bulk-roles', [UserController::class, 'bulkRolesUpdate'])->name('users.bulk-roles.update');
    Route::resource('users', UserController::class);
    Route::put('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password');
    Route::put('/users/{user}/roles', [UserController::class, 'updateRoles'])->name('users.update-roles');
    Route::get('/settingsapp', [SettingAppController::class, 'edit'])->name('setting.edit');
    Route::post('/settingsapp', [SettingAppController::class, 'update'])->name('setting.update');
    Route::post('/settingsapp/check-path', [SettingAppController::class, 'checkPath'])->name('setting.check-path');
    
    // Position Settings (CRUD)
    Route::resource('settings/positions', App\Http\Controllers\PositionController::class)
        ->names('settings.positions');
    
    // TeamHA Settings (CRUD)
    Route::resource('settings/teamha', App\Http\Controllers\TeamhaController::class)
        ->names('settings.teamha');
    
    // Department Settings (CRUD)
    Route::resource('settings/departments', App\Http\Controllers\DepartmentController::class)
        ->names('settings.departments');
    
    // DB Settings
    Route::get('/settingsapp/database', [App\Http\Controllers\DBSettingsController::class, 'edit'])->name('setting.database');
    Route::post('/settingsapp/database', [App\Http\Controllers\DBSettingsController::class, 'update'])->name('setting.database.update');
    Route::post('/settingsapp/database/test', [App\Http\Controllers\DBSettingsController::class, 'testConnection'])->name('setting.database.test');

    Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');
    Route::get('/backup', [BackupController::class, 'index'])->name('backup.index');
    Route::post('/backup/run', [BackupController::class, 'run'])->name('backup.run');
    Route::post('/backup/upload', [BackupController::class, 'upload'])->name('backup.upload');
    Route::post('/backup/restore/{file}', [BackupController::class, 'restore'])->name('backup.restore');
    Route::get('/backup/download/{file}', [BackupController::class, 'download'])->name('backup.download');
    Route::delete('/backup/delete/{file}', [BackupController::class, 'delete'])->name('backup.delete');
    Route::get('/files', [UserFileController::class, 'index'])->name('files.index');
    Route::post('/files', [UserFileController::class, 'store'])->name('files.store');
    Route::delete('/files/{id}', [UserFileController::class, 'destroy'])->name('files.destroy');
    Route::resource('media', MediaFolderController::class);

    // Quality Hub (ศูนย์รวมงานคุณภาพ)
    Route::get('/quality', [App\Http\Controllers\QualityHubController::class, 'index'])->name('quality.index');

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
            return Inertia::render('AdminHub/rooms/Calendar');
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
        Route::get('/bookings/my', [VehicleBookingController::class, 'myRequests'])->name('bookings.my');
        Route::get('/bookings/create', [VehicleBookingController::class, 'create'])->name('bookings.create');
        Route::post('/bookings', [VehicleBookingController::class, 'store'])->name('bookings.store');
        Route::get('/bookings/{booking}', [VehicleBookingController::class, 'show'])->name('bookings.show');
        Route::put('/bookings/{booking}', [VehicleBookingController::class, 'update'])->name('bookings.update');
        Route::delete('/bookings/{booking}', [VehicleBookingController::class, 'destroy'])->name('bookings.destroy');
        
        // Driver assignment and confirmation
        Route::post('/bookings/{booking}/assign-driver', [VehicleBookingController::class, 'assignDriver'])->name('bookings.assignDriver');
        Route::post('/bookings/{booking}/confirm-driver', [VehicleBookingController::class, 'confirmDriver'])->name('bookings.confirmDriver');
        Route::get('/drivers', [VehicleBookingController::class, 'getDrivers'])->name('drivers');
        
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
        Route::get('/dashboard', [App\Http\Controllers\Document\DocumentController::class, 'dashboard'])->name('dashboard');
        
        // API endpoints for notifications/popups
        Route::get('/pending-acknowledgments', [App\Http\Controllers\Document\DocumentController::class, 'getPendingAcknowledgments'])->name('pendingAcknowledgments');
        Route::get('/overdue', [App\Http\Controllers\Document\DocumentController::class, 'getOverdueDocuments'])->name('overdue');
        
        Route::get('/', [App\Http\Controllers\Document\DocumentController::class, 'index'])->name('index');
        Route::get('/create', [App\Http\Controllers\Document\DocumentController::class, 'create'])->name('create');
        Route::post('/', [App\Http\Controllers\Document\DocumentController::class, 'store'])->name('store');
        Route::get('/{document}', [App\Http\Controllers\Document\DocumentController::class, 'show'])->name('show');
        
        // Workflow Actions
        Route::post('/{document}/forward', [App\Http\Controllers\Document\DocumentController::class, 'forward'])->name('forward');
        Route::post('/{document}/submit-boss', [App\Http\Controllers\Document\DocumentController::class, 'submitBoss'])->name('submitBoss');
        Route::post('/{document}/approve/{action}', [App\Http\Controllers\Document\DocumentController::class, 'approve'])->name('approve');
        Route::post('/{document}/distribute-circular', [App\Http\Controllers\Document\DocumentController::class, 'distributeCircular'])->name('distributeCircular');
        Route::post('/{document}/acknowledge', [App\Http\Controllers\Document\DocumentController::class, 'acknowledge'])->name('acknowledge');
        
        // Acknowledgment for forwarded documents
        Route::post('/action/{action}/acknowledge', [App\Http\Controllers\Document\DocumentController::class, 'acknowledgeDocument'])->name('acknowledgeDocument');
    });

    // Maintenance System (ระบบแจ้งซ่อม)
    Route::prefix('maintenance')->name('maintenance.')->group(function () {
        Route::get('/dashboard', [App\Http\Controllers\MaintenanceDashboardController::class, 'index'])->name('dashboard');
        
        Route::get('/requests/my', [App\Http\Controllers\MaintenanceRequestController::class, 'myRequests'])->name('requests.my');
        Route::post('/requests/{maintenanceRequest}/cancel', [App\Http\Controllers\MaintenanceRequestController::class, 'cancel'])->name('requests.cancel');

        Route::resource('requests', App\Http\Controllers\MaintenanceRequestController::class)
            ->parameters(['requests' => 'maintenanceRequest'])
            ->withoutMiddleware(['menu.permission']);
        Route::post('/requests/{maintenanceRequest}/assign', [App\Http\Controllers\MaintenanceRequestController::class, 'assign'])->name('requests.assign');
        Route::post('/requests/{maintenanceRequest}/close', [App\Http\Controllers\MaintenanceRequestController::class, 'close'])->name('requests.close');
        
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

    // Technician Work Orders (ระบบใบงานสำหรับช่าง)
    Route::prefix('technician')->name('technician.')->group(function () {
        Route::get('/work-orders', [App\Http\Controllers\TechnicianWorkOrderController::class, 'index'])->name('work-orders.index');
        Route::get('/work-orders/{workOrder}', [App\Http\Controllers\TechnicianWorkOrderController::class, 'show'])->name('work-orders.show');
        Route::post('/work-orders/{workOrder}/accept', [App\Http\Controllers\TechnicianWorkOrderController::class, 'accept'])->name('work-orders.accept');
        Route::post('/work-orders/{workOrder}/assign', [App\Http\Controllers\TechnicianWorkOrderController::class, 'assign'])->name('work-orders.assign');
        Route::post('/work-orders/{workOrder}/update-status', [App\Http\Controllers\TechnicianWorkOrderController::class, 'updateStatus'])->name('work-orders.update-status');
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

    // Knowledge Management (KM)
    Route::redirect('/km', '/km/dashboard');
    Route::prefix('km')->name('km.')->group(function () {
        Route::get('/dashboard', [App\Http\Controllers\Km\KmDashboardController::class, 'index'])->name('dashboard');
        
        // Knowledge Assets (Document Repository)
        Route::resource('assets', App\Http\Controllers\Km\KmAssetController::class);
        
        // E-Learning (Aliased to HRD System)
        Route::prefix('learn')->name('learn.')->group(function () {
            Route::get('/', [App\Http\Controllers\HrdController::class, 'index'])->name('index');
            Route::get('/dashboard', [App\Http\Controllers\HrdController::class, 'dashboard'])->name('dashboard');
            Route::get('/my-training', [App\Http\Controllers\HrdController::class, 'myTraining'])->name('my-training');
            Route::post('/external-records', [App\Http\Controllers\HrdController::class, 'storeExternalRecord'])->name('external-records.store');
            Route::get('/my-skills', [App\Http\Controllers\HrdController::class, 'mySkills'])->name('my-skills');
            
            // Course Routes
            Route::get('/courses', [App\Http\Controllers\HrdController::class, 'index'])->name('courses.index');
            Route::get('/courses/create', [App\Http\Controllers\HrdController::class, 'create'])->name('courses.create');
            Route::post('/courses', [App\Http\Controllers\HrdController::class, 'store'])->name('courses.store');
            Route::get('/courses/{course}', [App\Http\Controllers\HrdController::class, 'show'])->name('courses.show');
            Route::put('/courses/{course}', [App\Http\Controllers\HrdController::class, 'update'])->name('courses.update');
            Route::delete('/courses/{course}', [App\Http\Controllers\HrdController::class, 'destroy'])->name('courses.destroy');
            Route::post('/courses/{course}/enroll', [App\Http\Controllers\HrdController::class, 'enroll'])->name('courses.enroll');
            Route::get('/courses/{course}/learn/{lesson}', [App\Http\Controllers\HrdController::class, 'learn'])->name('courses.learn');
            Route::post('/courses/{course}/learn/{lesson}/complete', [App\Http\Controllers\HrdController::class, 'completeLesson'])->name('courses.complete-lesson');
            Route::get('/courses/{course}/quiz/{quiz}', [App\Http\Controllers\HrdController::class, 'showQuiz'])->name('courses.quiz');
            Route::post('/courses/{course}/quiz/{quiz}/submit', [App\Http\Controllers\HrdController::class, 'submitQuiz'])->name('courses.quiz.submit');
            
            // Builder
            Route::get('/courses/{course}/builder', [App\Http\Controllers\HrdCourseBuilderController::class, 'edit'])->name('courses.builder');
            Route::put('/courses/{course}/builder', [App\Http\Controllers\HrdCourseBuilderController::class, 'update'])->name('courses.builder.update');
        });
    });

    // Medical Record Accuracy (MRA)
    Route::prefix('mra')->name('mra.')->group(function () {
        Route::get('/search-patient', [App\Http\Controllers\Mra\MraController::class, 'searchPatient'])->name('search-patient');
        Route::get('/', [App\Http\Controllers\Mra\MraController::class, 'index'])->name('index');
        Route::get('/dashboard', [App\Http\Controllers\Mra\MraController::class, 'dashboard'])->name('dashboard');
        Route::get('/create', [App\Http\Controllers\Mra\MraController::class, 'create'])->name('create');
        Route::post('/', [App\Http\Controllers\Mra\MraController::class, 'store'])->name('store');
        Route::get('/{audit}', [App\Http\Controllers\Mra\MraController::class, 'show'])->name('show');
        Route::put('/{audit}', [App\Http\Controllers\Mra\MraController::class, 'update'])->name('update');
    });

    // Infection Control (IC)
    Route::prefix('ic')->name('ic.')->group(function () {
        Route::get('/', [IcController::class, 'index'])->name('index');
        Route::get('/surveillance', [IcController::class, 'surveillance'])->name('surveillance');
        Route::get('/surveillance/search', [IcController::class, 'searchAdmissions'])->name('surveillance.search');
        Route::post('/surveillance', [IcController::class, 'storeSurveillance'])->name('surveillance.store');
        Route::get('/incidents', [IcController::class, 'incidents'])->name('incidents');
        Route::post('/incidents', [IcController::class, 'storeIncident'])->name('incidents.store');
    });

    // Administrative Hub
    Route::get('/admin-hub', [App\Http\Controllers\AdminHubController::class, 'index'])->name('admin.hub');

    // HOSxP Reports
    Route::get('/hosxp-reports', [App\Http\Controllers\HosxpReportController::class, 'index'])->name('hosxp-reports.index');
    Route::get('/hosxp-reports/generate', [App\Http\Controllers\HosxpReportController::class, 'generate'])->name('hosxp-reports.generate');
});

// Locale switcher (outside auth)
Route::get('/locale/{locale}', [LanguageController::class, 'switch'])->name('locale.switch');
Route::post('/locale', [LanguageController::class, 'update'])->name('locale.update');

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
