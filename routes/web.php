<?php

use App\Support\PostLoginRedirect;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HelpController;
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
use App\Http\Controllers\MeetingRoomController;
use App\Http\Controllers\LanguageController;
use App\Http\Controllers\Vehicle\VehicleBookingController;
use App\Http\Controllers\Vehicle\VehicleController;
use App\Http\Controllers\Vehicle\VehicleSettingController;
use App\Http\Controllers\Ic\IcController;

Route::get('/', function () {
    if (Auth::check()) {
        return redirect()->away(PostLoginRedirect::toCurrent('dashboard'));
    }

    return redirect()->away(url('/login'));
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('/fshh-chat/open', [App\Http\Controllers\FshhChatController::class, 'open'])->name('fshh-chat.open');

    // Notifications API (ไม่ผูก menu.permission เพื่อไม่ให้ polling พัง)
    Route::get('/notifications/api', [App\Http\Controllers\NotificationController::class, 'index'])->name('notifications.api');
    Route::get('/notifications/urgent', [App\Http\Controllers\NotificationController::class, 'urgent'])->name('notifications.urgent');
    Route::post('/notifications/{id}/read', [App\Http\Controllers\NotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::post('/notifications/read-all', [App\Http\Controllers\NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');
});

Route::middleware(['auth', 'menu.permission'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('help', [HelpController::class, 'index'])->name('help.index');
    Route::get('help/download-pdf', [HelpController::class, 'downloadPdf'])->name('help.download-pdf');
    Route::get('dashboard/stats', [DashboardController::class, 'stats'])->name('dashboard.stats');
    Route::get('dashboard/monthly-visits', [DashboardController::class, 'monthlyVisits'])->name('dashboard.monthly-visits');
    Route::get('dashboard/pdf', [DashboardController::class, 'exportPdf'])->name('dashboard.pdf');
    Route::get('dashboard/department-daily-pdf', [DashboardController::class, 'exportDepartmentDailyPdf'])->name('dashboard.department-daily-pdf');
    Route::get('dashboard/cv-risk-report', [CvRiskReportController::class, 'export'])->name('dashboard.cv-risk-report');

    // Department data dashboards (ข้อมูลรายแผนก)
    Route::prefix('department-data')->name('department-data.')->group(function () {
        Route::get('/', [App\Http\Controllers\DepartmentDataController::class, 'index'])->name('index');
        Route::get('/{code}/export-pdf', [App\Http\Controllers\DepartmentDataController::class, 'exportPdf'])->name('export-pdf');
        Route::get('/{code}/export-pdf/{section}', [App\Http\Controllers\DepartmentDataController::class, 'exportSectionPdf'])->name('export-section-pdf');
        Route::get('/{code}', [App\Http\Controllers\DepartmentDataController::class, 'show'])->name('show');
    });

    // Notifications page
    Route::get('/notifications', [App\Http\Controllers\NotificationController::class, 'page'])->name('notifications.index');

    Route::resource('roles', RoleController::class);
    Route::resource('menus', MenuController::class);
    Route::post('menus/reorder', [MenuController::class, 'reorder'])->name('menus.reorder');
    Route::resource('permissions', PermissionController::class);
    Route::get('/menus-hub', [App\Http\Controllers\MenusHubController::class, 'index'])->name('menus.hub');
    Route::put('/menus-hub/layout', [App\Http\Controllers\MenusHubController::class, 'update'])->name('menus.hub.layout.update');
    Route::delete('/menus-hub/layout', [App\Http\Controllers\MenusHubController::class, 'destroy'])->name('menus.hub.layout.reset');
    Route::get('/users/bulk-roles', [UserController::class, 'bulkRolesIndex'])->name('users.bulk-roles');
    Route::post('/users/bulk-roles', [UserController::class, 'bulkRolesUpdate'])->name('users.bulk-roles.update');
    Route::get('/users/directory', [UserController::class, 'directory'])->name('users.directory');
    Route::resource('users', UserController::class);
    Route::put('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password');
    Route::put('/users/{user}/roles', [UserController::class, 'updateRoles'])->name('users.update-roles');
    
    // Settings Hub
    Route::get('/settings-hub', function () {
        return Inertia::render('settingapp/Hub');
    })->name('settings.hub');
    
    Route::get('/settingsapp', [SettingAppController::class, 'edit'])->name('setting.edit');
    Route::post('/settingsapp', [SettingAppController::class, 'update'])->name('setting.update');
    Route::post('/settingsapp/check-path', [SettingAppController::class, 'checkPath'])->name('setting.check-path');
    
    // Position Settings (CRUD)
    Route::resource('settings/positions', App\Http\Controllers\PositionController::class)
        ->names('settings.positions');
    
    // TeamHA Settings (CRUD)
    Route::get('settings/teamha/export-pdf', [App\Http\Controllers\TeamhaController::class, 'exportPdf'])
        ->name('settings.teamha.export-pdf');
    Route::resource('settings/teamha', App\Http\Controllers\TeamhaController::class)
        ->names('settings.teamha');
    
    // Department Settings (CRUD)
    Route::resource('settings/departments', App\Http\Controllers\DepartmentController::class)
        ->names('settings.departments');

    Route::post('settings/staff/import', [App\Http\Controllers\StaffRosterController::class, 'import'])
        ->name('settings.staff.import');
    Route::patch('settings/staff/{staffRoster}/toggle', [App\Http\Controllers\StaffRosterController::class, 'toggle'])
        ->name('settings.staff.toggle');
    Route::resource('settings/staff', App\Http\Controllers\StaffRosterController::class)
        ->parameters(['staff' => 'staffRoster'])
        ->except(['show'])
        ->names('settings.staff');
    
    // DB Settings
    Route::get('/settingsapp/database', [App\Http\Controllers\DBSettingsController::class, 'edit'])->name('setting.database');
    Route::post('/settingsapp/database', [App\Http\Controllers\DBSettingsController::class, 'update'])->name('setting.database.update');
    Route::post('/settingsapp/database/test', [App\Http\Controllers\DBSettingsController::class, 'testConnection'])->name('setting.database.test');
    Route::get('/settingsapp/ngrok/status', [App\Http\Controllers\DBSettingsController::class, 'ngrokStatus'])->name('setting.ngrok.status');
    Route::post('/settingsapp/ngrok/start', [App\Http\Controllers\DBSettingsController::class, 'ngrokStart'])->name('setting.ngrok.start');
    Route::post('/settingsapp/ngrok/stop', [App\Http\Controllers\DBSettingsController::class, 'ngrokStop'])->name('setting.ngrok.stop');

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

    // Quality Hub (ศูนย์พัฒนาคุณภาพ)
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
        Route::get('/export-pdf', [App\Http\Controllers\QualityIndicatorController::class, 'exportGroupPdf'])->name('export-pdf');

        Route::get('/import', [App\Http\Controllers\QualityIndicatorImportController::class, 'index'])->name('import.index');
        Route::get('/import/template', [App\Http\Controllers\QualityIndicatorImportController::class, 'template'])->name('import.template');
        Route::post('/import/preview', [App\Http\Controllers\QualityIndicatorImportController::class, 'preview'])->name('import.preview');
        Route::post('/import/{log}/confirm', [App\Http\Controllers\QualityIndicatorImportController::class, 'confirm'])->name('import.confirm');
        Route::post('/import/{log}/cancel', [App\Http\Controllers\QualityIndicatorImportController::class, 'cancel'])->name('import.cancel');
        Route::get('/import/{log}', [App\Http\Controllers\QualityIndicatorImportController::class, 'show'])->name('import.show');

        Route::get('/guide', [App\Http\Controllers\QualityIndicatorGuideController::class, 'show'])->name('guide');
        Route::get('/guide/edit', [App\Http\Controllers\QualityIndicatorGuideController::class, 'edit'])->name('guide.edit');
        Route::put('/guide', [App\Http\Controllers\QualityIndicatorGuideController::class, 'update'])->name('guide.update');
        Route::post('/guide/reset', [App\Http\Controllers\QualityIndicatorGuideController::class, 'reset'])->name('guide.reset');

        Route::get('/coverage', [App\Http\Controllers\QualityIndicatorController::class, 'coverage'])->name('coverage');
        Route::get('/coverage/excel', [App\Http\Controllers\QualityIndicatorController::class, 'exportCoverageExcel'])->name('coverage.excel');

        Route::get('/{indicator}/export-pdf', [App\Http\Controllers\QualityIndicatorController::class, 'exportIndicatorPdf'])->name('export-indicator-pdf');
        Route::post('/{indicator}/restore', [App\Http\Controllers\QualityIndicatorController::class, 'restore'])->name('restore')->withTrashed();
        Route::get('/{indicator}', [App\Http\Controllers\QualityIndicatorController::class, 'show'])->name('show');
        Route::put('/{indicator}', [App\Http\Controllers\QualityIndicatorController::class, 'update'])->name('update');
        Route::delete('/{indicator}', [App\Http\Controllers\QualityIndicatorController::class, 'destroy'])->name('destroy');
        Route::post('/{indicator}/aliases', [App\Http\Controllers\QualityIndicatorController::class, 'storeAlias'])->name('aliases.store');
        Route::post('/{indicator}/promote', [App\Http\Controllers\QualityIndicatorController::class, 'promote'])->name('promote');
        Route::post('/{indicator}/unlink', [App\Http\Controllers\QualityIndicatorController::class, 'unlink'])->name('unlink');
        Route::post('/{indicator}/entries', [App\Http\Controllers\QualityIndicatorController::class, 'storeEntry'])->name('entries.store');
        Route::put('/{indicator}/entries/{entry}', [App\Http\Controllers\QualityIndicatorController::class, 'updateEntry'])->name('entries.update');
        Route::delete('/{indicator}/entries/{entry}', [App\Http\Controllers\QualityIndicatorController::class, 'destroyEntry'])->name('entries.destroy');
    });

    // Administration -> Meeting rooms / bookings (งานธุรการ -> จองห้องประชุม)
    Route::prefix('administration/rooms')->name('rooms.')->group(function () {
        Route::get('/', [RoomBookingController::class, 'index'])->name('index');
        Route::get('/bookings', [RoomBookingController::class, 'bookings'])->name('bookings');
        Route::get('/calendar', function () {
            return Inertia::render('AdminHub/rooms/Calendar');
        })->name('calendar');
        Route::get('/calendar/events', [RoomBookingController::class, 'calendar'])->name('calendar.events');
        Route::get('/api/meeting-rooms', [RoomBookingController::class, 'meetingRooms'])->name('meeting-rooms');
        Route::get('/my', [RoomBookingController::class, 'myBookings'])->name('my');
        Route::post('/bookings', [RoomBookingController::class, 'store'])->name('bookings.store');
        Route::post('/bookings/{booking}/approve', [RoomBookingController::class, 'approve'])->name('bookings.approve');
        Route::get('/bookings/{booking}', [RoomBookingController::class, 'show'])->name('bookings.show');
        Route::put('/bookings/{booking}', [RoomBookingController::class, 'update'])->name('bookings.update');
        Route::delete('/bookings/{booking}', [RoomBookingController::class, 'destroy'])->name('bookings.destroy');

        Route::get('/settings', [MeetingRoomController::class, 'index'])->name('settings');
        Route::post('/settings', [MeetingRoomController::class, 'store'])->name('settings.store');
        Route::post('/settings/{meetingRoom}', [MeetingRoomController::class, 'update'])->name('settings.update');
        Route::delete('/settings/{meetingRoom}', [MeetingRoomController::class, 'destroy'])->name('settings.destroy');
    });

    // Vehicle Booking System (ระบบจองรถ)
    Route::prefix('vehicles')->name('vehicles.')->group(function () {
        Route::get('/', [VehicleBookingController::class, 'select'])->name('index');
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

        // Vehicle Settings (ตั้งค่ารถ + ประเภท)
        Route::get('/settings', [VehicleSettingController::class, 'index'])->name('settings.index');
        Route::post('/settings/vehicles', [VehicleSettingController::class, 'storeVehicle'])->name('settings.vehicles.store');
        Route::post('/settings/vehicles/{vehicle}', [VehicleSettingController::class, 'updateVehicle'])->name('settings.vehicles.update');
        Route::delete('/settings/vehicles/{vehicle}', [VehicleSettingController::class, 'destroyVehicle'])->name('settings.vehicles.destroy');
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
        
        Route::post('/signatures', [App\Http\Controllers\Document\DocumentController::class, 'uploadSignatures'])->name('signatures.upload');

        Route::get('/inbox', [App\Http\Controllers\Document\DocumentController::class, 'inbox'])->name('inbox');
        Route::get('/outbox', [App\Http\Controllers\Document\DocumentController::class, 'outbox'])->name('outbox');

        Route::get('/pending-review', [App\Http\Controllers\Document\DocumentController::class, 'pendingReview'])->name('pendingReview');
        Route::prefix('director')->name('director.')->group(function () {
            Route::get('/', [App\Http\Controllers\Document\DocumentController::class, 'directorInbox'])->name('index');
            Route::get('/{document}', [App\Http\Controllers\Document\DocumentController::class, 'directorShow'])->name('show');
        });
        
        Route::get('/', [App\Http\Controllers\Document\DocumentController::class, 'index'])->name('index');
        Route::get('/create', [App\Http\Controllers\Document\DocumentController::class, 'create'])->name('create');
        Route::get('/ai-summarizer', [App\Http\Controllers\Document\DocumentController::class, 'aiSummarizer'])->name('ai_summarizer');
        Route::post('/summarize-ai', [App\Http\Controllers\Document\DocumentController::class, 'summarizeAi'])->name('summarizeAi');
        Route::post('/export-docx', [App\Http\Controllers\Document\DocumentController::class, 'exportDocx'])->name('exportDocx');
        Route::post('/', [App\Http\Controllers\Document\DocumentController::class, 'store'])->name('store');
        Route::get('/{document}', [App\Http\Controllers\Document\DocumentController::class, 'show'])->name('show');
        
        // Workflow Actions
        Route::post('/{document}/forward', [App\Http\Controllers\Document\DocumentController::class, 'forward'])->name('forward');
        Route::post('/{document}/submit-boss', [App\Http\Controllers\Document\DocumentController::class, 'submitBoss'])->name('submitBoss');
        Route::post('/{document}/approve/{action}', [App\Http\Controllers\Document\DocumentController::class, 'approve'])->name('approve');
        Route::post('/{document}/archive', [App\Http\Controllers\Document\DocumentController::class, 'archive'])->name('archive');
        Route::post('/{document}/distribute-circular', [App\Http\Controllers\Document\DocumentController::class, 'distributeCircular'])->name('distributeCircular');
        Route::post('/{document}/acknowledge', [App\Http\Controllers\Document\DocumentController::class, 'acknowledge'])->name('acknowledge');
        
        // Acknowledgment for forwarded documents
        Route::post('/action/{action}/acknowledge', [App\Http\Controllers\Document\DocumentController::class, 'acknowledgeDocument'])->name('acknowledgeDocument');
        Route::post('/action/{action}/implementation', [App\Http\Controllers\Document\DocumentController::class, 'updateImplementation'])->name('updateImplementation');
    });

    Route::prefix('admin-docs')->name('admin-docs.')->group(function () {
        Route::get('/ai-summarizer', [App\Http\Controllers\Document\DocumentController::class, 'aiSummarizer'])->name('ai_summarizer');

        Route::prefix('memos')->name('memos.')->group(function () {
            Route::get('/', [App\Http\Controllers\AdminDocs\OfficialMemoController::class, 'index'])->name('index');
            Route::get('/create', [App\Http\Controllers\AdminDocs\OfficialMemoController::class, 'create'])->name('create');
            Route::get('/settings', [App\Http\Controllers\AdminDocs\OfficialMemoController::class, 'settings'])->name('settings');
            Route::put('/settings', [App\Http\Controllers\AdminDocs\OfficialMemoController::class, 'updateSettings'])->name('settings.update');
            Route::post('/', [App\Http\Controllers\AdminDocs\OfficialMemoController::class, 'store'])->name('store');
            Route::post('/export', [App\Http\Controllers\AdminDocs\OfficialMemoController::class, 'export'])->name('export');
            Route::get('/font/{weight}', [App\Http\Controllers\AdminDocs\OfficialMemoController::class, 'font'])->name('font');
            Route::get('/{memo}/edit', [App\Http\Controllers\AdminDocs\OfficialMemoController::class, 'edit'])->name('edit');
            Route::put('/{memo}', [App\Http\Controllers\AdminDocs\OfficialMemoController::class, 'update'])->name('update');
            Route::delete('/{memo}', [App\Http\Controllers\AdminDocs\OfficialMemoController::class, 'destroy'])->name('destroy');
            Route::post('/{memo}/docx', [App\Http\Controllers\AdminDocs\OfficialMemoController::class, 'docx'])->name('docx');
        });
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

    // Medical Equipment Borrowing (ระบบยืมอุปกรณ์แพทย์)
    Route::prefix('equipment-borrowing')->name('equipment-borrowing.')->group(function () {
        Route::get('/dashboard', [App\Http\Controllers\MedicalEquipmentDashboardController::class, 'index'])->name('dashboard');

        Route::get('/borrowings/export', [App\Http\Controllers\MedicalEquipmentBorrowingController::class, 'exportExcel'])->name('borrowings.export');
        Route::get('/borrowings', [App\Http\Controllers\MedicalEquipmentBorrowingController::class, 'index'])->name('borrowings.index');
        Route::get('/borrowings/my', [App\Http\Controllers\MedicalEquipmentBorrowingController::class, 'my'])->name('borrowings.my');
        Route::get('/borrowings/create', [App\Http\Controllers\MedicalEquipmentBorrowingController::class, 'create'])->name('borrowings.create');
        Route::post('/borrowings', [App\Http\Controllers\MedicalEquipmentBorrowingController::class, 'store'])->name('borrowings.store');
        Route::get('/borrowings/{borrowing}', [App\Http\Controllers\MedicalEquipmentBorrowingController::class, 'show'])->name('borrowings.show');
        Route::post('/borrowings/{borrowing}/approve', [App\Http\Controllers\MedicalEquipmentBorrowingController::class, 'approve'])->name('borrowings.approve');
        Route::post('/borrowings/{borrowing}/reject', [App\Http\Controllers\MedicalEquipmentBorrowingController::class, 'reject'])->name('borrowings.reject');
        Route::post('/borrowings/{borrowing}/issue', [App\Http\Controllers\MedicalEquipmentBorrowingController::class, 'issue'])->name('borrowings.issue');
        Route::post('/borrowings/{borrowing}/return', [App\Http\Controllers\MedicalEquipmentBorrowingController::class, 'returnItem'])->name('borrowings.return');
        Route::post('/borrowings/{borrowing}/cancel', [App\Http\Controllers\MedicalEquipmentBorrowingController::class, 'cancel'])->name('borrowings.cancel');

        Route::get('/equipment', [App\Http\Controllers\MedicalEquipmentController::class, 'index'])->name('equipment.index');
        Route::post('/equipment', [App\Http\Controllers\MedicalEquipmentController::class, 'store'])->name('equipment.store');
        Route::put('/equipment/{equipment}', [App\Http\Controllers\MedicalEquipmentController::class, 'update'])->name('equipment.update');
        Route::delete('/equipment/{equipment}', [App\Http\Controllers\MedicalEquipmentController::class, 'destroy'])->name('equipment.destroy');
        Route::get('/equipment/{equipment}/history', [App\Http\Controllers\MedicalEquipmentController::class, 'history'])->name('equipment.history');

        Route::get('/settings', [App\Http\Controllers\MedicalEquipmentSettingController::class, 'index'])->name('settings.index');
        Route::post('/settings/categories', [App\Http\Controllers\MedicalEquipmentSettingController::class, 'storeCategory'])->name('settings.categories.store');
        Route::put('/settings/categories/{category}', [App\Http\Controllers\MedicalEquipmentSettingController::class, 'updateCategory'])->name('settings.categories.update');
        Route::delete('/settings/categories/{category}', [App\Http\Controllers\MedicalEquipmentSettingController::class, 'destroyCategory'])->name('settings.categories.destroy');
    });

    // Technician Work Orders (ระบบใบงานสำหรับช่าง)
    Route::prefix('technician')->name('technician.')->group(function () {
        Route::get('/work-orders', [App\Http\Controllers\TechnicianWorkOrderController::class, 'index'])->name('work-orders.index');
        Route::get('/work-orders/{workOrder}', [App\Http\Controllers\TechnicianWorkOrderController::class, 'show'])->name('work-orders.show');
        Route::post('/work-orders/{workOrder}/accept', [App\Http\Controllers\TechnicianWorkOrderController::class, 'accept'])->name('work-orders.accept');
        Route::post('/work-orders/{workOrder}/assign', [App\Http\Controllers\TechnicianWorkOrderController::class, 'assign'])->name('work-orders.assign');
        Route::post('/work-orders/{workOrder}/update-status', [App\Http\Controllers\TechnicianWorkOrderController::class, 'updateStatus'])->name('work-orders.update-status');
    });

    // Finance Dashboard (BMS / Revenue — อยู่ภายใต้ Finance Reports)
    Route::get('/finance-dashboard', [App\Http\Controllers\FinanceDashboardController::class, 'index'])->name('finance.dashboard');
    Route::get('/finance/revenue', [App\Http\Controllers\FinanceRevenueController::class, 'index'])->name('finance.revenue');
    Route::get('/finance/revenue/export', [App\Http\Controllers\FinanceRevenueController::class, 'exportExcel'])->name('finance.revenue.export');
    Route::get('/finance/revenue/export-pdf', [App\Http\Controllers\FinanceRevenueController::class, 'exportPdf'])->name('finance.revenue.export-pdf');
    Route::get('/finance/revenue/export-pttype-pdf', [App\Http\Controllers\FinanceRevenueController::class, 'exportPttypePdf'])->name('finance.revenue.export-pttype-pdf');
    Route::get('/finance/revenue/export-pttype-excel', [App\Http\Controllers\FinanceRevenueController::class, 'exportPttypeExcel'])->name('finance.revenue.export-pttype-excel');
    Route::get('/finance/budget', [App\Http\Controllers\FinanceBudgetController::class, 'index'])->name('finance.budget');
    Route::get('/finance/budget/export', [App\Http\Controllers\FinanceBudgetController::class, 'exportExcel'])->name('finance.budget.export');
    Route::get('/finance/budget/export-pdf', [App\Http\Controllers\FinanceBudgetController::class, 'exportPdf'])->name('finance.budget.export-pdf');
    Route::get('/finance/budget/expenses/template', [App\Http\Controllers\FinanceBudgetController::class, 'expenseTemplate'])->name('finance.budget.expenses.template');
    Route::post('/finance/budget/expenses/import', [App\Http\Controllers\FinanceBudgetController::class, 'importExpenses'])->name('finance.budget.expenses.import');
    Route::post('/finance/budget/expenses', [App\Http\Controllers\FinanceBudgetController::class, 'updateExpenses'])->name('finance.budget.expenses.update');

    // Financial Data Hub — ศูนย์ข้อมูลการเงิน
    Route::get('/finance/data-hub', [App\Http\Controllers\FinanceDataHubController::class, 'index'])->name('finance.data-hub');

    // จ่ายตรง กรมบัญชีกลาง (พร้อมใช้งาน)
    Route::prefix('finance/data-hub/cgd-claim')->name('finance.cgd.')->group(function () {
        Route::get('/', [App\Http\Controllers\FinanceCgdClaimController::class, 'index'])->name('dashboard');
        Route::get('/import', [App\Http\Controllers\FinanceCgdClaimController::class, 'importForm'])->name('import');
        Route::post('/import', [App\Http\Controllers\FinanceCgdClaimController::class, 'import'])->name('import.store');
        Route::post('/appeal-cases/mark-submitted', [App\Http\Controllers\FinanceCgdClaimController::class, 'markAppealSubmitted'])->name('appeal-cases.mark-submitted');
        Route::post('/nhso/start', [App\Http\Controllers\FinanceCgdClaimController::class, 'nhsoStart'])->name('nhso.start');
        Route::post('/nhso/otp', [App\Http\Controllers\FinanceCgdClaimController::class, 'nhsoOtp'])->name('nhso.otp');
        Route::post('/nhso/download', [App\Http\Controllers\FinanceCgdClaimController::class, 'nhsoDownload'])->name('nhso.download');
        Route::post('/nhso/scan', [App\Http\Controllers\FinanceCgdClaimController::class, 'nhsoScan'])->name('nhso.scan');
        Route::post('/nhso/clear', [App\Http\Controllers\FinanceCgdClaimController::class, 'nhsoClearSession'])->name('nhso.clear');
        Route::post('/reconcile-all', [App\Http\Controllers\FinanceCgdClaimController::class, 'reconcileAll'])->name('reconcile-all');
        Route::get('/reconcile-all', fn () => redirect()->route('finance.cgd.dashboard'))->name('reconcile-all.get');
        Route::get('/precheck', [App\Http\Controllers\FinanceCgdCDenyPrecheckController::class, 'index'])->name('precheck');
        Route::get('/compare', [App\Http\Controllers\FinanceCgdClaimController::class, 'compareIndex'])->name('compare');
        Route::post('/compare/reconcile', [App\Http\Controllers\FinanceCgdClaimController::class, 'reconcileCompare'])->name('compare.reconcile');
        Route::get('/compare/export', [App\Http\Controllers\FinanceCgdClaimController::class, 'exportSummaryExcel'])->name('compare.export');
        Route::get('/compare/export-pdf', [App\Http\Controllers\FinanceCgdClaimController::class, 'exportSummaryPdf'])->name('compare.export-pdf');
        Route::get('/compare/export-pair-pdf', [App\Http\Controllers\FinanceCgdClaimController::class, 'exportPairwisePdf'])->name('compare.export-pair-pdf');
        Route::get('/summary', [App\Http\Controllers\FinanceCgdClaimController::class, 'showSummary'])->name('summary');
        Route::get('/summary/export', [App\Http\Controllers\FinanceCgdClaimController::class, 'exportSummaryExcel'])->name('summary.export');
        Route::get('/summary/export-pdf', [App\Http\Controllers\FinanceCgdClaimController::class, 'exportSummaryPdf'])->name('summary.export-pdf');
        Route::get('/stm', [App\Http\Controllers\FinanceStmImportController::class, 'index'])->name('stm.index');
        Route::post('/stm', [App\Http\Controllers\FinanceStmImportController::class, 'store'])->name('stm.store');
        Route::get('/stm/{stm}/compare', [App\Http\Controllers\FinanceCgdClaimController::class, 'showStmCompare'])->name('stm.compare');
        Route::post('/stm/{stm}/reconcile', [App\Http\Controllers\FinanceCgdClaimController::class, 'reconcileStm'])->name('stm.reconcile');
        Route::get('/stm/{stm}/compare/export', [App\Http\Controllers\FinanceCgdClaimController::class, 'exportStmCompareExcel'])->name('stm.compare.export');
        Route::get('/stm/{stm}/compare/export-pdf', [App\Http\Controllers\FinanceCgdClaimController::class, 'exportStmComparePdf'])->name('stm.compare.export-pdf');
        Route::get('/stm/{stm}', [App\Http\Controllers\FinanceStmImportController::class, 'show'])->name('stm.show');
        Route::delete('/stm/{stm}', [App\Http\Controllers\FinanceStmImportController::class, 'destroy'])->name('stm.destroy');
        Route::get('/{batch}', [App\Http\Controllers\FinanceCgdClaimController::class, 'show'])->name('show')->whereNumber('batch');
        Route::post('/{batch}/reconcile', [App\Http\Controllers\FinanceCgdClaimController::class, 'reconcile'])->name('reconcile')->whereNumber('batch');
        Route::delete('/{batch}', [App\Http\Controllers\FinanceCgdClaimController::class, 'destroy'])->name('destroy')->whereNumber('batch');
        Route::get('/{batch}/export', [App\Http\Controllers\FinanceCgdClaimController::class, 'exportExcel'])->name('export')->whereNumber('batch');
        Route::get('/{batch}/export-pdf', [App\Http\Controllers\FinanceCgdClaimController::class, 'exportPdf'])->name('export-pdf')->whereNumber('batch');
    });

    // อปท. (LGO) — REP-first ไม่มี STM
    Route::prefix('finance/data-hub/lgo')->name('finance.lgo.')->group(function () {
        Route::get('/', [App\Http\Controllers\FinanceLgoClaimController::class, 'index'])->name('dashboard');
        Route::get('/import', [App\Http\Controllers\FinanceLgoClaimController::class, 'importForm'])->name('import');
        Route::post('/import', [App\Http\Controllers\FinanceLgoClaimController::class, 'import'])->name('import.store');
        Route::post('/appeal-cases/mark-submitted', [App\Http\Controllers\FinanceLgoClaimController::class, 'markAppealSubmitted'])->name('appeal-cases.mark-submitted');
        Route::post('/nhso/start', [App\Http\Controllers\FinanceLgoClaimController::class, 'nhsoStart'])->name('nhso.start');
        Route::post('/nhso/otp', [App\Http\Controllers\FinanceLgoClaimController::class, 'nhsoOtp'])->name('nhso.otp');
        Route::post('/nhso/download', [App\Http\Controllers\FinanceLgoClaimController::class, 'nhsoDownload'])->name('nhso.download');
        Route::post('/nhso/scan', [App\Http\Controllers\FinanceLgoClaimController::class, 'nhsoScan'])->name('nhso.scan');
        Route::post('/nhso/clear', [App\Http\Controllers\FinanceLgoClaimController::class, 'nhsoClearSession'])->name('nhso.clear');
        Route::post('/reconcile-all', [App\Http\Controllers\FinanceLgoClaimController::class, 'reconcileAll'])->name('reconcile-all');
        Route::get('/reconcile-all', fn () => redirect()->route('finance.lgo.dashboard'))->name('reconcile-all.get');
        Route::get('/summary', [App\Http\Controllers\FinanceLgoClaimController::class, 'showSummary'])->name('summary');
        Route::get('/summary/export', [App\Http\Controllers\FinanceLgoClaimController::class, 'exportSummaryExcel'])->name('summary.export');
        Route::get('/summary/export-pdf', [App\Http\Controllers\FinanceLgoClaimController::class, 'exportSummaryPdf'])->name('summary.export-pdf');
        Route::get('/compare', [App\Http\Controllers\FinanceLgoClaimController::class, 'showCompare'])->name('compare');
        Route::get('/{batch}', [App\Http\Controllers\FinanceLgoClaimController::class, 'show'])->name('show')->whereNumber('batch');
        Route::post('/{batch}/reconcile', [App\Http\Controllers\FinanceLgoClaimController::class, 'reconcile'])->name('reconcile')->whereNumber('batch');
        Route::delete('/{batch}', [App\Http\Controllers\FinanceLgoClaimController::class, 'destroy'])->name('destroy')->whereNumber('batch');
        Route::get('/{batch}/export', [App\Http\Controllers\FinanceLgoClaimController::class, 'exportExcel'])->name('export')->whereNumber('batch');
        Route::get('/{batch}/export-pdf', [App\Http\Controllers\FinanceLgoClaimController::class, 'exportPdf'])->name('export-pdf')->whereNumber('batch');
    });

    // โมดูลย่อยเตรียมรองรับ — ประกันสังคม / บัตรทอง (นำเข้าแยกหน้า)
    foreach (['sso', 'uc'] as $scheme) {
        Route::prefix("finance/data-hub/{$scheme}")->name("finance.{$scheme}.")->group(function () use ($scheme) {
            Route::get('/', [App\Http\Controllers\FinanceDataHubSchemeController::class, 'dashboard'])
                ->defaults('scheme', $scheme)
                ->name('dashboard');
            Route::get('/import', [App\Http\Controllers\FinanceDataHubSchemeController::class, 'import'])
                ->defaults('scheme', $scheme)
                ->name('import');
        });
    }

    // redirect เส้นทางเดิม → Data Hub
    Route::redirect('/finance/cgd-claim', '/finance/data-hub/cgd-claim', 301);
    Route::redirect('/finance/cgd-claim/import', '/finance/data-hub/cgd-claim/import', 301);
    Route::post('/finance/cgd-claim/reconcile-all', [App\Http\Controllers\FinanceCgdClaimController::class, 'reconcileAll']);
    Route::match(['get', 'post'], '/finance/cgd-claim/{any}', function (string $any) {
        return redirect('/finance/data-hub/cgd-claim/'.$any, 301);
    })->where('any', '.*');

    // Pharmacy (เภสัชกรรม) — แจ้งเตือนการใช้ยา / คลังยา / RDU / รายงานยา
    Route::get('/pharmacy', [App\Http\Controllers\Pharmacy\PharmacyController::class, 'index'])->name('pharmacy.index');
    Route::get('/pharmacy/drug-alerts', [App\Http\Controllers\Pharmacy\PharmacyController::class, 'drugAlerts'])->name('pharmacy.drug-alerts');
    Route::post('/pharmacy/drug-alerts/send-telegram', [App\Http\Controllers\Pharmacy\PharmacyController::class, 'sendEgfrTelegramAlerts'])->name('pharmacy.drug-alerts.send-telegram');

    $registerPharmacyWarehouse = function (bool $drugOnly) {
        Route::get('/', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'index'])->name('index');
        Route::get('/stock', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'stock'])->name('stock');
        Route::get('/receive', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'receiveForm'])->name('receive');
        Route::post('/receive', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'receiveStore'])->name('receive.store');
        Route::get('/transfer', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'transferForm'])->name('transfer');
        Route::post('/transfer', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'transferStore'])->name('transfer.store');
        Route::get('/lots', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'lots'])->name('lots');
        Route::get('/lots/{lot}', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'lotShow'])->name('lots.show');
        Route::get('/movements', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'movements'])->name('movements');
        Route::get('/drugs/search', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'searchDrugs'])->name('drugs.search');
        Route::post('/sync-dispense', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'syncDispense'])->name('sync-dispense');
        Route::patch('/balances/{balance}/threshold', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'updateThreshold'])->name('balances.threshold');

        Route::get('/settings/template', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'downloadStockTemplate'])->name('settings.stock-template');
        Route::post('/settings/import-preview', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'previewStockImport'])->name('settings.stock-import.preview');
        Route::post('/settings/import-commit', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'commitStockImport'])->name('settings.stock-import.commit');
        Route::post('/settings/packaging', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'storePackagingType'])->name('settings.packaging-types.store');
        Route::match(['put', 'patch'], '/settings/packaging/{type}', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'updatePackagingType'])->name('settings.packaging-types.update');
        Route::delete('/settings/packaging/{type}', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'destroyPackagingType'])->name('settings.packaging-types.destroy');
        Route::post('/settings/locations', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'storeLocation'])->name('settings.locations.store');
        Route::match(['put', 'patch'], '/settings/locations/{location}', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'updateLocation'])->name('settings.locations.update');
        Route::delete('/settings/locations/{location}', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'destroyLocation'])->name('settings.locations.destroy');
        Route::post('/settings/upsert', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'upsertSetting'])->name('settings.upsert');

        Route::match(['put', 'patch'], '/lots/{lot}', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'lotUpdate'])->name('lots.update');
        Route::delete('/lots/{lot}', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'lotDestroy'])->name('lots.destroy');
        Route::post('/lots/{lot}/qr', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'lotRegenerateQr'])->name('lots.qr');
        Route::get('/drugs/{icode}/units', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'itemUnits'])->name('drugs.units');
        Route::post('/manual-dispense', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'manualDispense'])->name('manual-dispense');
        Route::match(['put', 'patch'], '/balances/{balance}', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'updateBalance'])->name('balances.update');
        Route::delete('/balances/{balance}', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'destroyBalance'])->name('balances.destroy');
        Route::post('/reconcile-stock', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'reconcileStock'])->name('reconcile-stock');

        Route::get('/scan', [App\Http\Controllers\Pharmacy\PharmacyBarcodeController::class, 'index'])->name('scan');
        Route::post('/scan/resolve', [App\Http\Controllers\Pharmacy\PharmacyBarcodeController::class, 'resolve'])->name('scan.resolve');

        Route::get('/stock-card', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'stockCard'])->name('stock-card');
        Route::get('/labels', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'batchLabels'])->name('labels');

        Route::get('/sync-dispense/history', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'dispenseSyncHistory'])->name('sync-dispense.history');
        Route::post('/sync-dispense/retry', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'retryDispenseSync'])->name('sync-dispense.retry');

        Route::get('/settings', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'settings'])->name('settings');
        Route::post('/settings/batch', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'saveBatchSettings'])->name('settings.values.batch');
        Route::post('/settings/batch-save', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'saveBatchSettings'])->name('settings.batch');
        Route::post('/settings/test-telegram', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'testTelegramAlert'])->name('settings.test-telegram');
        Route::get('/items', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'items'])->name('items');
        Route::post('/items/import', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'importItems'])->name('items.import');
        Route::match(['put', 'patch'], '/items/{item}', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'updateItem'])->name('items.update');
        Route::post('/items/{item}/units', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'storeUnit'])->name('items.units.store');
        Route::match(['put', 'patch'], '/items/units/{unit}', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'updateUnit'])->name('items.units.update');
        Route::post('/items/{item}/barcodes', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'storeBarcode'])->name('items.barcodes.store');
        Route::delete('/items/barcodes/{barcode}', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'destroyBarcode'])->name('items.barcodes.destroy');

        Route::get('/counts', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'counts'])->name('counts');
        Route::post('/counts', [App\Http\Controllers\Pharmacy\PharmacyStockCountController::class, 'store'])->name('counts.store');
        Route::get('/counts/{count}', [App\Http\Controllers\Pharmacy\PharmacyStockCountController::class, 'show'])->name('counts.show');
        Route::post('/counts/{count}/complete', [App\Http\Controllers\Pharmacy\PharmacyStockCountController::class, 'complete'])->name('counts.complete');

        Route::get('/drug-out/stock-info', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'drugOutStockInfo'])->name('drug-out.stock-info');

        if ($drugOnly) {
            Route::get('/drug-out', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'drugOut'])->name('drug-out');
            Route::post('/drug-out/issue', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'drugOutIssue'])->name('drug-out.issue');
            Route::post('/drug-out/return', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'drugOutReturn'])->name('drug-out.return');
            Route::get('/analytics', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'analytics'])->name('analytics');
        }
    };

    Route::prefix('pharmacy/inventory')->name('pharmacy.inventory.')->group(function () use ($registerPharmacyWarehouse) {
        $registerPharmacyWarehouse(true);
    });

    Route::prefix('pharmacy/supplies')->name('pharmacy.supplies.')->group(function () use ($registerPharmacyWarehouse) {
        $registerPharmacyWarehouse(false);
    });

    // RDU Reports (Rational Drug Use) — under Pharmacy channel
    Route::get('/rdu', [App\Http\Controllers\RduReportController::class, 'index'])->name('rdu.index');
    Route::get('/rdu/cases', [App\Http\Controllers\RduReportController::class, 'cases'])->name('rdu.cases');
    Route::get('/rdu/export', [App\Http\Controllers\RduReportController::class, 'export'])->name('rdu.export');
    Route::post('/rdu/audits', [App\Http\Controllers\RduReportController::class, 'storeAudit'])->name('rdu.audits.store');
    Route::get('/rdu/drugs', [App\Http\Controllers\RduReportController::class, 'drugs'])->name('rdu.drugs');
    Route::get('/rdu/drugs/antibiotics', [App\Http\Controllers\RduReportController::class, 'antibiotics'])->name('rdu.drugs.antibiotics');
    Route::get('/rdu/drugs/by-department', [App\Http\Controllers\RduReportController::class, 'drugsByDepartment'])->name('rdu.drugs.by-department');
    Route::get('/rdu/drugs/export', [App\Http\Controllers\RduReportController::class, 'exportDrugs'])->name('rdu.drugs.export');

    // Drug Usage Reports (รายงานยาและการใช้ยา) — under Pharmacy channel
    Route::get('/drug-usage', [App\Http\Controllers\DrugUsageController::class, 'index'])->name('drug-usage.index');
    Route::get('/drug-usage/report', [App\Http\Controllers\DrugUsageController::class, 'report'])->name('drug-usage.report');
    Route::get('/drug-usage/export', [App\Http\Controllers\DrugUsageController::class, 'export'])->name('drug-usage.export');
    Route::get('/drug-usage/export-pdf', [App\Http\Controllers\DrugUsageController::class, 'exportPdf'])->name('drug-usage.export-pdf');

    // IM - IT Management (งานสารสนเทศ HAIT) ภายใต้ศูนย์พัฒนาคุณภาพ
    Route::prefix('im')->name('im.')->group(function () {
        Route::get('/', [App\Http\Controllers\Im\ImHubController::class, 'index'])->name('index');
        Route::get('/manual', [App\Http\Controllers\Im\ImHubController::class, 'manual'])->name('manual');

        // หมวด 1: Master Plan & Strategy
        Route::get('/master-plan', [App\Http\Controllers\Im\MasterPlanController::class, 'index'])->name('master-plan');
        Route::post('/master-plan/plans', [App\Http\Controllers\Im\MasterPlanController::class, 'storePlan'])->name('master-plan.plans.store');
        Route::put('/master-plan/plans/{plan}', [App\Http\Controllers\Im\MasterPlanController::class, 'updatePlan'])->name('master-plan.plans.update');
        Route::delete('/master-plan/plans/{plan}', [App\Http\Controllers\Im\MasterPlanController::class, 'destroyPlan'])->name('master-plan.plans.destroy');
        Route::post('/master-plan/plans/{plan}/attachments', [App\Http\Controllers\Im\MasterPlanController::class, 'storePlanAttachments'])->name('master-plan.plans.attachments.store');
        Route::post('/master-plan/mappings', [App\Http\Controllers\Im\MasterPlanController::class, 'storeMapping'])->name('master-plan.mappings.store');
        Route::put('/master-plan/mappings/{mapping}', [App\Http\Controllers\Im\MasterPlanController::class, 'updateMapping'])->name('master-plan.mappings.update');
        Route::delete('/master-plan/mappings/{mapping}', [App\Http\Controllers\Im\MasterPlanController::class, 'destroyMapping'])->name('master-plan.mappings.destroy');
        Route::post('/master-plan/actions', [App\Http\Controllers\Im\MasterPlanController::class, 'storeAction'])->name('master-plan.actions.store');
        Route::put('/master-plan/actions/{action}', [App\Http\Controllers\Im\MasterPlanController::class, 'updateAction'])->name('master-plan.actions.update');
        Route::delete('/master-plan/actions/{action}', [App\Http\Controllers\Im\MasterPlanController::class, 'destroyAction'])->name('master-plan.actions.destroy');
        Route::post('/master-plan/actions/{action}/attachments', [App\Http\Controllers\Im\MasterPlanController::class, 'storeActionAttachments'])->name('master-plan.actions.attachments.store');
        Route::delete('/master-plan/attachments/{attachment}', [App\Http\Controllers\Im\MasterPlanController::class, 'destroyAttachment'])->name('master-plan.attachments.destroy');

        // หมวด 2: Risk Management
        Route::get('/risk', [App\Http\Controllers\Im\RiskController::class, 'index'])->name('risk');
        Route::post('/risk', [App\Http\Controllers\Im\RiskController::class, 'store'])->name('risk.store');
        Route::put('/risk/{risk}', [App\Http\Controllers\Im\RiskController::class, 'update'])->name('risk.update');
        Route::delete('/risk/{risk}', [App\Http\Controllers\Im\RiskController::class, 'destroy'])->name('risk.destroy');

        // หมวด 3: Security, PDPA & BCP
        Route::get('/security', [App\Http\Controllers\Im\SecurityController::class, 'index'])->name('security');
        Route::post('/security/policies', [App\Http\Controllers\Im\SecurityController::class, 'storePolicy'])->name('security.policies.store');
        Route::post('/security/policies/{policy}', [App\Http\Controllers\Im\SecurityController::class, 'updatePolicy'])->name('security.policies.update');
        Route::delete('/security/policies/{policy}', [App\Http\Controllers\Im\SecurityController::class, 'destroyPolicy'])->name('security.policies.destroy');
        Route::post('/security/awareness', [App\Http\Controllers\Im\SecurityController::class, 'storeAwareness'])->name('security.awareness.store');
        Route::delete('/security/awareness/{record}', [App\Http\Controllers\Im\SecurityController::class, 'destroyAwareness'])->name('security.awareness.destroy');
        Route::post('/security/drills', [App\Http\Controllers\Im\SecurityController::class, 'storeDrill'])->name('security.drills.store');
        Route::delete('/security/drills/{drill}', [App\Http\Controllers\Im\SecurityController::class, 'destroyDrill'])->name('security.drills.destroy');
        Route::post('/security/backups', [App\Http\Controllers\Im\SecurityController::class, 'storeBackup'])->name('security.backups.store');
        Route::delete('/security/backups/{backup}', [App\Http\Controllers\Im\SecurityController::class, 'destroyBackup'])->name('security.backups.destroy');

        // หมวด 4: Service Desk & Incident
        Route::get('/service-desk', [App\Http\Controllers\Im\ServiceDeskController::class, 'index'])->name('service-desk');
        Route::post('/service-desk/tickets', [App\Http\Controllers\Im\ServiceDeskController::class, 'storeTicket'])->name('service-desk.tickets.store');
        Route::put('/service-desk/tickets/{ticket}', [App\Http\Controllers\Im\ServiceDeskController::class, 'updateTicket'])->name('service-desk.tickets.update');
        Route::delete('/service-desk/tickets/{ticket}', [App\Http\Controllers\Im\ServiceDeskController::class, 'destroyTicket'])->name('service-desk.tickets.destroy');
        Route::post('/service-desk/incidents', [App\Http\Controllers\Im\ServiceDeskController::class, 'storeIncident'])->name('service-desk.incidents.store');
        Route::put('/service-desk/incidents/{incident}', [App\Http\Controllers\Im\ServiceDeskController::class, 'updateIncident'])->name('service-desk.incidents.update');
        Route::delete('/service-desk/incidents/{incident}', [App\Http\Controllers\Im\ServiceDeskController::class, 'destroyIncident'])->name('service-desk.incidents.destroy');
        Route::post('/service-desk/timesheets', [App\Http\Controllers\Im\ServiceDeskController::class, 'storeTimesheet'])->name('service-desk.timesheets.store');
        Route::post('/service-desk/timesheets/sync-google', [App\Http\Controllers\Im\ServiceDeskController::class, 'syncTimesheets'])->name('service-desk.timesheets.sync-google');
        Route::delete('/service-desk/timesheets/{timesheet}', [App\Http\Controllers\Im\ServiceDeskController::class, 'destroyTimesheet'])->name('service-desk.timesheets.destroy');

        // หมวด 4: ประเมินเจ้าหน้าที่ IT (ภายใต้ Service Desk)
        Route::get('/service-desk/evaluation', [App\Http\Controllers\Im\StaffEvaluationController::class, 'index'])->name('service-desk.evaluation');
        Route::get('/service-desk/evaluation/cycles/export-pdf', [App\Http\Controllers\Im\StaffEvaluationController::class, 'exportCyclePdf'])->name('service-desk.evaluation.cycles.export-pdf');
        Route::get('/service-desk/evaluation/{evaluation}/export-pdf', [App\Http\Controllers\Im\StaffEvaluationController::class, 'exportEvaluationPdf'])->name('service-desk.evaluation.export-pdf');
        Route::post('/service-desk/evaluation/topics', [App\Http\Controllers\Im\StaffEvaluationController::class, 'storeTopic'])->name('service-desk.evaluation.topics.store');
        Route::put('/service-desk/evaluation/topics/{topic}', [App\Http\Controllers\Im\StaffEvaluationController::class, 'updateTopic'])->name('service-desk.evaluation.topics.update');
        Route::delete('/service-desk/evaluation/topics/{topic}', [App\Http\Controllers\Im\StaffEvaluationController::class, 'destroyTopic'])->name('service-desk.evaluation.topics.destroy');
        Route::post('/service-desk/evaluation', [App\Http\Controllers\Im\StaffEvaluationController::class, 'storeEvaluation'])->name('service-desk.evaluation.store');
        Route::delete('/service-desk/evaluation/{evaluation}', [App\Http\Controllers\Im\StaffEvaluationController::class, 'destroyEvaluation'])->name('service-desk.evaluation.destroy');

        // หมวด 5: Medical Record Quality Control
        Route::get('/medical-record', [App\Http\Controllers\Im\MedicalRecordController::class, 'index'])->name('medical-record');
        Route::post('/medical-record', [App\Http\Controllers\Im\MedicalRecordController::class, 'store'])->name('medical-record.store');
        Route::put('/medical-record/{audit}', [App\Http\Controllers\Im\MedicalRecordController::class, 'update'])->name('medical-record.update');
        Route::delete('/medical-record/{audit}', [App\Http\Controllers\Im\MedicalRecordController::class, 'destroy'])->name('medical-record.destroy');

        // หมวด 6: Software Development QA
        Route::get('/software-qa', [App\Http\Controllers\Im\SoftwareQaController::class, 'index'])->name('software-qa');
        Route::post('/software-qa/documents', [App\Http\Controllers\Im\SoftwareQaController::class, 'storeDocument'])->name('software-qa.documents.store');
        Route::delete('/software-qa/documents/{document}', [App\Http\Controllers\Im\SoftwareQaController::class, 'destroyDocument'])->name('software-qa.documents.destroy');
        Route::post('/software-qa/reviews', [App\Http\Controllers\Im\SoftwareQaController::class, 'storeReview'])->name('software-qa.reviews.store');
        Route::delete('/software-qa/reviews/{review}', [App\Http\Controllers\Im\SoftwareQaController::class, 'destroyReview'])->name('software-qa.reviews.destroy');

        // หมวด 7: IT Resource, Competency & Change
        Route::get('/resource', [App\Http\Controllers\Im\ResourceController::class, 'index'])->name('resource');
        Route::post('/resource/assets', [App\Http\Controllers\Im\ResourceController::class, 'storeAsset'])->name('resource.assets.store');
        Route::put('/resource/assets/{asset}', [App\Http\Controllers\Im\ResourceController::class, 'updateAsset'])->name('resource.assets.update');
        Route::delete('/resource/assets/{asset}', [App\Http\Controllers\Im\ResourceController::class, 'destroyAsset'])->name('resource.assets.destroy');
        Route::post('/resource/assets/{asset}/repairs', [App\Http\Controllers\Im\ResourceController::class, 'storeRepair'])->name('resource.assets.repairs.store');
        Route::put('/resource/assets/{asset}/repairs/{repair}/complete', [App\Http\Controllers\Im\ResourceController::class, 'completeRepair'])->name('resource.assets.repairs.complete');
        Route::post('/resource/assets/{asset}/disposals', [App\Http\Controllers\Im\ResourceController::class, 'storeDisposal'])->name('resource.assets.disposals.store');
        Route::post('/resource/competencies', [App\Http\Controllers\Im\ResourceController::class, 'storeCompetency'])->name('resource.competencies.store');
        Route::put('/resource/competencies/{competency}', [App\Http\Controllers\Im\ResourceController::class, 'updateCompetency'])->name('resource.competencies.update');
        Route::delete('/resource/competencies/{competency}', [App\Http\Controllers\Im\ResourceController::class, 'destroyCompetency'])->name('resource.competencies.destroy');
        Route::post('/resource/changes', [App\Http\Controllers\Im\ResourceController::class, 'storeChange'])->name('resource.changes.store');
        Route::put('/resource/changes/{change}/status', [App\Http\Controllers\Im\ResourceController::class, 'updateChangeStatus'])->name('resource.changes.status');
        Route::delete('/resource/changes/{change}', [App\Http\Controllers\Im\ResourceController::class, 'destroyChange'])->name('resource.changes.destroy');
    });

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
        Route::get('/assets/risk', [App\Http\Controllers\EnvAssetController::class, 'risk'])->name('assets.risk');
        Route::get('/assets/risk/pdf', [App\Http\Controllers\EnvAssetController::class, 'riskPdf'])->name('assets.risk-pdf');
        Route::get('/assets/inspection', [App\Http\Controllers\EnvAssetController::class, 'inspection'])->name('assets.inspection');
        Route::get('/assets/inspection/cycles', [App\Http\Controllers\EnvAssetInspectionController::class, 'cyclesIndex'])->name('assets.inspection.cycles');
        Route::post('/assets/inspection/cycles', [App\Http\Controllers\EnvAssetInspectionController::class, 'storeCycle'])->name('assets.inspection.cycles.store');
        Route::get('/assets/inspection/cycles/{cycle}', [App\Http\Controllers\EnvAssetInspectionController::class, 'showCycle'])->name('assets.inspection.cycles.show');
        Route::put('/assets/inspection/cycles/{cycle}', [App\Http\Controllers\EnvAssetInspectionController::class, 'updateCycle'])->name('assets.inspection.cycles.update');
        Route::post('/assets/inspection/cycles/{cycle}/cancel', [App\Http\Controllers\EnvAssetInspectionController::class, 'cancelCycle'])->name('assets.inspection.cycles.cancel');
        Route::post('/assets/inspection/cycles/{cycle}/items', [App\Http\Controllers\EnvAssetInspectionController::class, 'storeItems'])->name('assets.inspection.cycles.items.store');
        Route::put('/assets/inspection/cycles/{cycle}/dates', [App\Http\Controllers\EnvAssetInspectionController::class, 'updateDates'])->name('assets.inspection.cycles.dates');
        Route::post('/assets/inspection/cycles/{cycle}/cancel-date', [App\Http\Controllers\EnvAssetInspectionController::class, 'cancelByDate'])->name('assets.inspection.cycles.cancel-date');
        Route::put('/assets/inspection/cycles/{cycle}/items/{item}', [App\Http\Controllers\EnvAssetInspectionController::class, 'updateItem'])->name('assets.inspection.cycles.items.update');
        Route::delete('/assets/inspection/cycles/{cycle}/items/{item}', [App\Http\Controllers\EnvAssetInspectionController::class, 'destroyItem'])->name('assets.inspection.cycles.items.destroy');
        Route::post('/assets/inspection/cycles/{cycle}/complete', [App\Http\Controllers\EnvAssetInspectionController::class, 'completeCycle'])->name('assets.inspection.cycles.complete');
        Route::get('/assets/inspection/cycles/{cycle}/prepare-pdf', [App\Http\Controllers\EnvAssetInspectionController::class, 'preparePdf'])->name('assets.inspection.cycles.prepare-pdf');
        Route::get('/assets/inspection/cycles/{cycle}/result-pdf', [App\Http\Controllers\EnvAssetInspectionController::class, 'resultPdf'])->name('assets.inspection.cycles.result-pdf');
        Route::get('/assets/report', [App\Http\Controllers\EnvAssetController::class, 'report'])->name('assets.report');
        Route::get('/assets/report/pdf', [App\Http\Controllers\EnvAssetController::class, 'reportPdf'])->name('assets.report-pdf');
        Route::post('/assets', [App\Http\Controllers\EnvAssetController::class, 'store'])->name('assets.store');
        Route::put('/assets/{asset}', [App\Http\Controllers\EnvAssetController::class, 'update'])->name('assets.update');
        Route::post('/assets/{asset}/change-status', [App\Http\Controllers\EnvAssetController::class, 'changeStatus'])->name('assets.change-status');
        Route::delete('/assets/{asset}', [App\Http\Controllers\EnvAssetController::class, 'destroy'])->name('assets.destroy');

        // PM Tracking
        Route::get('/pm', [App\Http\Controllers\EnvPmController::class, 'index'])->name('pm.index');
        Route::post('/pm', [App\Http\Controllers\EnvPmController::class, 'store'])->name('pm.store');
        Route::post('/pm/settings', [App\Http\Controllers\EnvPmController::class, 'updateSettings'])->name('pm.settings');
        Route::post('/pm/generate', [App\Http\Controllers\EnvPmController::class, 'generate'])->name('pm.generate');
        Route::get('/pm/calendar', [App\Http\Controllers\EnvPmController::class, 'calendar'])->name('pm.calendar');
        Route::get('/pm/standards', [App\Http\Controllers\EnvPmStandardController::class, 'index'])->name('pm.standards.index');
        Route::post('/pm/standards', [App\Http\Controllers\EnvPmStandardController::class, 'store'])->name('pm.standards.store');
        Route::put('/pm/standards/{standard}', [App\Http\Controllers\EnvPmStandardController::class, 'update'])->name('pm.standards.update');
        Route::delete('/pm/standards/{standard}', [App\Http\Controllers\EnvPmStandardController::class, 'destroy'])->name('pm.standards.destroy');
        Route::get('/pm/parts', [App\Http\Controllers\EnvPmSparePartController::class, 'index'])->name('pm.parts.index');
        Route::post('/pm/parts', [App\Http\Controllers\EnvPmSparePartController::class, 'store'])->name('pm.parts.store');
        Route::put('/pm/parts/{part}', [App\Http\Controllers\EnvPmSparePartController::class, 'update'])->name('pm.parts.update');
        Route::post('/pm/parts/{part}/receive', [App\Http\Controllers\EnvPmSparePartController::class, 'receive'])->name('pm.parts.receive');
        Route::post('/pm/parts/{part}/adjust', [App\Http\Controllers\EnvPmSparePartController::class, 'adjust'])->name('pm.parts.adjust');
        Route::delete('/pm/parts/{part}', [App\Http\Controllers\EnvPmSparePartController::class, 'destroy'])->name('pm.parts.destroy');
        Route::get('/pm/asset-options', [App\Http\Controllers\EnvPmWorkOrderController::class, 'assetOptions'])->name('pm.asset-options');
        Route::get('/pm/work-orders', [App\Http\Controllers\EnvPmWorkOrderController::class, 'index'])->name('pm.work-orders.index');
        Route::post('/pm/work-orders', [App\Http\Controllers\EnvPmWorkOrderController::class, 'store'])->name('pm.work-orders.store');
        Route::get('/pm/work-orders/{workOrder}', [App\Http\Controllers\EnvPmWorkOrderController::class, 'show'])->name('pm.work-orders.show');
        Route::post('/pm/work-orders/{workOrder}/assign', [App\Http\Controllers\EnvPmWorkOrderController::class, 'assign'])->name('pm.work-orders.assign');
        Route::post('/pm/work-orders/{workOrder}/start', [App\Http\Controllers\EnvPmWorkOrderController::class, 'start'])->name('pm.work-orders.start');
        Route::post('/pm/work-orders/{workOrder}/complete', [App\Http\Controllers\EnvPmWorkOrderController::class, 'complete'])->name('pm.work-orders.complete');
        Route::post('/pm/work-orders/{workOrder}/photos', [App\Http\Controllers\EnvPmWorkOrderController::class, 'photos'])->name('pm.work-orders.photos');
        Route::delete('/pm/work-orders/{workOrder}/photos/{photo}', [App\Http\Controllers\EnvPmWorkOrderController::class, 'destroyPhoto'])->name('pm.work-orders.photos.destroy');
        Route::post('/pm/work-orders/{workOrder}/cancel', [App\Http\Controllers\EnvPmWorkOrderController::class, 'cancel'])->name('pm.work-orders.cancel');
        Route::get('/pm/assets/{asset}', [App\Http\Controllers\EnvPmAssetPlanController::class, 'show'])->name('pm.assets.show');
        Route::put('/pm/assets/{asset}', [App\Http\Controllers\EnvPmAssetPlanController::class, 'update'])->name('pm.assets.update');
        Route::post('/pm/assets/{asset}/schedules', [App\Http\Controllers\EnvPmAssetPlanController::class, 'storeSchedule'])->name('pm.assets.schedules.store');
        Route::delete('/pm/assets/{asset}/schedules/{schedule}', [App\Http\Controllers\EnvPmAssetPlanController::class, 'destroySchedule'])->name('pm.assets.schedules.destroy');
        Route::post('/pm/assets/{asset}/meter', [App\Http\Controllers\EnvPmAssetPlanController::class, 'meter'])->name('pm.assets.meter');

        // Incidents
        Route::get('/incidents', [App\Http\Controllers\EnvIncidentController::class, 'index'])->name('incidents.index');
        Route::post('/incidents', [App\Http\Controllers\EnvIncidentController::class, 'store'])->name('incidents.store');
        Route::put('/incidents/{incident}', [App\Http\Controllers\EnvIncidentController::class, 'update'])->name('incidents.update');
        Route::delete('/incidents/{incident}', [App\Http\Controllers\EnvIncidentController::class, 'destroy'])->name('incidents.destroy');

        // Utilities / สาธารณูปโภค
        Route::get('/utilities', [App\Http\Controllers\EnvUtilityExpenseController::class, 'index'])->name('utilities.index');
        Route::get('/utilities/pdf', [App\Http\Controllers\EnvUtilityExpenseController::class, 'pdf'])->name('utilities.pdf');
        Route::get('/utilities/ac-pdf', [App\Http\Controllers\EnvUtilityExpenseController::class, 'acPdf'])->name('utilities.ac-pdf');
        Route::get('/utilities/category/{code}', [App\Http\Controllers\EnvUtilityExpenseController::class, 'category'])->name('utilities.category');
        Route::post('/utilities/entries', [App\Http\Controllers\EnvUtilityExpenseController::class, 'storeEntry'])->name('utilities.entries.store');
        Route::post('/utilities/ac-meters/batch', [App\Http\Controllers\EnvUtilityExpenseController::class, 'storeAcMeterBatch'])->name('utilities.ac-meters.batch');
        Route::delete('/utilities/entries/{entry}', [App\Http\Controllers\EnvUtilityExpenseController::class, 'destroyEntry'])->name('utilities.entries.destroy');
        Route::get('/utilities/sp3', [App\Http\Controllers\EnvUtilityExpenseController::class, 'sp3'])->name('utilities.sp3');
        Route::post('/utilities/sp3/unlock', [App\Http\Controllers\EnvUtilityExpenseController::class, 'unlockSp3'])->name('utilities.sp3.unlock');
        Route::post('/utilities/sp3/lock', [App\Http\Controllers\EnvUtilityExpenseController::class, 'lockSp3'])->name('utilities.sp3.lock');
        Route::get('/utilities/sp3/pdf', [App\Http\Controllers\EnvUtilityExpenseController::class, 'sp3Pdf'])->name('utilities.sp3.pdf');

        Route::get('/guide', [App\Http\Controllers\EnvController::class, 'guide'])->name('guide');

        Route::get('/electricity/pdf', [App\Http\Controllers\EnvElectricityController::class, 'pdf'])->name('electricity.pdf');
        Route::post('/electricity/batch', [App\Http\Controllers\EnvElectricityController::class, 'storeBatch'])->name('electricity.store-batch');
        Route::get('/electricity', [App\Http\Controllers\EnvElectricityController::class, 'index'])->name('electricity.index');

        Route::post('/utility/systems', [App\Http\Controllers\EnvUtilityController::class, 'storeSystem'])->name('utility.store-system');
        Route::post('/utility/checklists', [App\Http\Controllers\EnvUtilityController::class, 'storeChecklist'])->name('utility.store-checklist');
        Route::post('/utility/checks', [App\Http\Controllers\EnvUtilityController::class, 'storeCheck'])->name('utility.store-check');
        Route::get('/utility', [App\Http\Controllers\EnvUtilityController::class, 'index'])->name('utility.index');
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
            Route::get('/hub', [App\Http\Controllers\HrdController::class, 'hub'])->name('hub');
            Route::get('/enrollments/{enrollment}/certificate', [App\Http\Controllers\HrdController::class, 'certificate'])->name('enrollments.certificate');

            Route::put('/external-records/{record}/review', [App\Http\Controllers\Hrd\HrdProgramController::class, 'reviewExternal'])->name('external-records.review');
            Route::get('/external-approvals', [App\Http\Controllers\Hrd\HrdProgramController::class, 'externalApprovals'])->name('external-approvals');
            Route::get('/compliance', [App\Http\Controllers\Hrd\HrdProgramController::class, 'compliance'])->name('compliance');
            Route::get('/reports', [App\Http\Controllers\Hrd\HrdProgramController::class, 'reports'])->name('reports');
            Route::get('/satisfaction-template', [App\Http\Controllers\Hrd\HrdProgramController::class, 'satisfactionTemplate'])->name('satisfaction-template');
            Route::put('/satisfaction-template', [App\Http\Controllers\Hrd\HrdProgramController::class, 'updateSatisfactionTemplate'])->name('satisfaction-template.update');

            Route::get('/assignments', [App\Http\Controllers\Hrd\HrdProgramController::class, 'assignments'])->name('assignments');
            Route::post('/assignments', [App\Http\Controllers\Hrd\HrdProgramController::class, 'storeAssignment'])->name('assignments.store');
            Route::delete('/assignments/{assignment}', [App\Http\Controllers\Hrd\HrdProgramController::class, 'destroyAssignment'])->name('assignments.destroy');

            Route::get('/competencies', [App\Http\Controllers\Hrd\HrdProgramController::class, 'competencies'])->name('competencies');
            Route::post('/competencies', [App\Http\Controllers\Hrd\HrdProgramController::class, 'storeCompetency'])->name('competencies.store');
            Route::put('/competencies/{competency}', [App\Http\Controllers\Hrd\HrdProgramController::class, 'updateCompetency'])->name('competencies.update');
            Route::delete('/competencies/{competency}', [App\Http\Controllers\Hrd\HrdProgramController::class, 'destroyCompetency'])->name('competencies.destroy');
            Route::post('/position-competencies', [App\Http\Controllers\Hrd\HrdProgramController::class, 'storePositionCompetency'])->name('position-competencies.store');
            Route::delete('/position-competencies/{link}', [App\Http\Controllers\Hrd\HrdProgramController::class, 'destroyPositionCompetency'])->name('position-competencies.destroy');

            Route::get('/idp', [App\Http\Controllers\Hrd\HrdProgramController::class, 'idp'])->name('idp');
            Route::post('/idp', [App\Http\Controllers\Hrd\HrdProgramController::class, 'storeIdp'])->name('idp.store');
            Route::post('/idp/generate', [App\Http\Controllers\Hrd\HrdProgramController::class, 'generateIdp'])->name('idp.generate');
            Route::put('/idp/{idp}/complete', [App\Http\Controllers\Hrd\HrdProgramController::class, 'completeIdp'])->name('idp.complete');

            Route::get('/orientation', [App\Http\Controllers\Hrd\HrdProgramController::class, 'orientation'])->name('orientation');
            Route::post('/orientation/items', [App\Http\Controllers\Hrd\HrdProgramController::class, 'storeOrientationItem'])->name('orientation.items.store');
            Route::delete('/orientation/items/{item}', [App\Http\Controllers\Hrd\HrdProgramController::class, 'destroyOrientationItem'])->name('orientation.items.destroy');
            Route::post('/orientation/checks', [App\Http\Controllers\Hrd\HrdProgramController::class, 'toggleOrientationCheck'])->name('orientation.checks');
            Route::post('/orientation/clearance', [App\Http\Controllers\Hrd\HrdProgramController::class, 'clearOrientation'])->name('orientation.clearance');

            Route::get('/plans', [App\Http\Controllers\Hrd\HrdProgramController::class, 'plans'])->name('plans');
            Route::post('/plans', [App\Http\Controllers\Hrd\HrdProgramController::class, 'storePlan'])->name('plans.store');
            Route::delete('/plans/{plan}', [App\Http\Controllers\Hrd\HrdProgramController::class, 'destroyPlan'])->name('plans.destroy');

            Route::get('/passport', [App\Http\Controllers\Hrd\HrdProgramController::class, 'passport'])->name('passport');
            Route::get('/tna', [App\Http\Controllers\Hrd\HrdProgramController::class, 'tna'])->name('tna');
            Route::post('/tna', [App\Http\Controllers\Hrd\HrdProgramController::class, 'storeTna'])->name('tna.store');
            Route::get('/behavior', [App\Http\Controllers\Hrd\HrdProgramController::class, 'behavior'])->name('behavior');
            Route::put('/behavior/{review}', [App\Http\Controllers\Hrd\HrdProgramController::class, 'storeBehavior'])->name('behavior.store');

            Route::get('/work-evaluations', [App\Http\Controllers\Hrd\HrdWorkEvaluationController::class, 'index'])->name('work-evaluations.index');
            Route::post('/work-evaluations', [App\Http\Controllers\Hrd\HrdWorkEvaluationController::class, 'store'])->name('work-evaluations.store');
            Route::delete('/work-evaluations/{evaluation}', [App\Http\Controllers\Hrd\HrdWorkEvaluationController::class, 'destroy'])->name('work-evaluations.destroy');
            Route::post('/work-evaluations/topics', [App\Http\Controllers\Hrd\HrdWorkEvaluationController::class, 'storeTopic'])->name('work-evaluations.topics.store');

            Route::get('/assessments', [App\Http\Controllers\Hrd\HrdAssessmentController::class, 'index'])->name('assessments.index');
            Route::get('/assessments/results', [App\Http\Controllers\Hrd\HrdAssessmentController::class, 'results'])->name('assessments.results');
            Route::get('/assessments/summary', [App\Http\Controllers\Hrd\HrdAssessmentController::class, 'summary'])->name('assessments.summary');
            Route::get('/assessments/builder', [App\Http\Controllers\Hrd\HrdAssessmentController::class, 'builder'])->name('assessments.builder');
            Route::get('/assessments/competency', [App\Http\Controllers\Hrd\HrdProgramController::class, 'assessments'])->name('assessments.competency');
            Route::post('/assessments', [App\Http\Controllers\Hrd\HrdProgramController::class, 'saveAssessment'])->name('assessments.store');
            Route::post('/assessments/forms', [App\Http\Controllers\Hrd\HrdAssessmentController::class, 'storeForm'])->name('assessments.forms.store');
            Route::put('/assessments/forms/{form}', [App\Http\Controllers\Hrd\HrdAssessmentController::class, 'updateForm'])->name('assessments.forms.update');
            Route::delete('/assessments/forms/{form}', [App\Http\Controllers\Hrd\HrdAssessmentController::class, 'destroyForm'])->name('assessments.forms.destroy');
            Route::post('/assessments/forms/{form}/sections', [App\Http\Controllers\Hrd\HrdAssessmentController::class, 'storeSection'])->name('assessments.sections.store');
            Route::put('/assessments/sections/{section}', [App\Http\Controllers\Hrd\HrdAssessmentController::class, 'updateSection'])->name('assessments.sections.update');
            Route::delete('/assessments/sections/{section}', [App\Http\Controllers\Hrd\HrdAssessmentController::class, 'destroySection'])->name('assessments.sections.destroy');
            Route::post('/assessments/sections/{section}/items', [App\Http\Controllers\Hrd\HrdAssessmentController::class, 'storeItem'])->name('assessments.items.store');
            Route::put('/assessments/items/{item}', [App\Http\Controllers\Hrd\HrdAssessmentController::class, 'updateItem'])->name('assessments.items.update');
            Route::delete('/assessments/items/{item}', [App\Http\Controllers\Hrd\HrdAssessmentController::class, 'destroyItem'])->name('assessments.items.destroy');
            Route::get('/assessments/{form}/fill', [App\Http\Controllers\Hrd\HrdAssessmentController::class, 'fill'])->name('assessments.fill');
            Route::post('/assessments/{form}/submit', [App\Http\Controllers\Hrd\HrdAssessmentController::class, 'submit'])->name('assessments.submit');
            Route::put('/competency-suggestions/{suggestion}/review', [App\Http\Controllers\Hrd\HrdProgramController::class, 'reviewSuggestion'])->name('competency-suggestions.review');

            // Course Routes
            Route::get('/courses', [App\Http\Controllers\HrdController::class, 'index'])->name('courses.index');
            Route::get('/courses/create', [App\Http\Controllers\HrdController::class, 'create'])->name('courses.create');
            Route::post('/courses', [App\Http\Controllers\HrdController::class, 'store'])->name('courses.store');
            Route::get('/courses/builder/quiz-template', [App\Http\Controllers\HrdCourseBuilderController::class, 'downloadQuizTemplate'])->name('courses.builder.quiz-template');
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
            Route::post('/courses/{course}/builder/upload', [App\Http\Controllers\HrdCourseBuilderController::class, 'upload'])->name('courses.builder.upload');
            Route::post('/courses/{course}/builder/quiz-import', [App\Http\Controllers\HrdCourseBuilderController::class, 'importQuiz'])->name('courses.builder.quiz-import');
            Route::get('/courses/{course}/satisfaction', [App\Http\Controllers\Hrd\HrdProgramController::class, 'satisfaction'])->name('courses.satisfaction');
            Route::post('/courses/{course}/satisfaction', [App\Http\Controllers\Hrd\HrdProgramController::class, 'storeSatisfaction'])->name('courses.satisfaction.store');
            Route::get('/courses/{course}/evaluation', [App\Http\Controllers\Hrd\HrdProgramController::class, 'courseEvaluation'])->name('courses.evaluation');
        });

        // การเรียนรู้เชิงโต้ตอบ (Interactive Learning: SQL & Excel)
        Route::prefix('interactive')->name('interactive.')->group(function () {
            Route::get('/', [App\Http\Controllers\Km\KmInteractiveController::class, 'index'])->name('index');
            Route::get('/sql', [App\Http\Controllers\Km\KmInteractiveController::class, 'sql'])->name('sql');
            Route::get('/excel', [App\Http\Controllers\Km\KmInteractiveController::class, 'excel'])->name('excel');
            Route::get('/mmert', [App\Http\Controllers\Km\KmInteractiveController::class, 'mmert'])->name('mmert');
            Route::post('/progress', [App\Http\Controllers\Km\KmInteractiveController::class, 'saveProgress'])->name('progress');
        });
    });

    // Medical Record Accuracy (MRA)
    Route::prefix('mra')->name('mra.')->group(function () {
        // API endpoints
        Route::get('/search-patient', [App\Http\Controllers\Mra\MraController::class, 'searchPatient'])->name('search-patient');
        Route::get('/visit-data', [App\Http\Controllers\Mra\MraController::class, 'getVisitData'])->name('visit-data');
        Route::get('/criteria', [App\Http\Controllers\Mra\MraController::class, 'getCriteria'])->name('criteria');
        Route::get('/criteria-error-report', [App\Http\Controllers\Mra\MraController::class, 'criteriaErrorReport'])->name('criteria-error-report');
        Route::get('/auto-check', [App\Http\Controllers\Mra\MraController::class, 'autoCheck'])->name('auto-check');
        Route::get('/statistics', [App\Http\Controllers\Mra\MraController::class, 'statistics'])->name('statistics');
        
        // Pages
        Route::get('/', [App\Http\Controllers\Mra\MraController::class, 'index'])->name('index');
        Route::get('/dashboard', [App\Http\Controllers\Mra\MraController::class, 'dashboard'])->name('dashboard');
        Route::get('/dashboard/export-pdf', [App\Http\Controllers\Mra\MraController::class, 'exportDashboardPdf'])->name('dashboard.export-pdf');
        Route::get('/reports', [App\Http\Controllers\Mra\MraController::class, 'reports'])->name('reports');
        Route::get('/reports/export-pdf', [App\Http\Controllers\Mra\MraController::class, 'exportReportsPdf'])->name('reports.export-pdf');
        Route::get('/reports/export-excel', [App\Http\Controllers\Mra\MraController::class, 'exportReportsExcel'])->name('reports.export-excel');
        Route::get('/settings', [App\Http\Controllers\Mra\MraController::class, 'settings'])->name('settings');
        Route::get('/guide', [App\Http\Controllers\Mra\MraController::class, 'guide'])->name('guide');
        Route::get('/create', [App\Http\Controllers\Mra\MraController::class, 'create'])->name('create');
        Route::post('/', [App\Http\Controllers\Mra\MraController::class, 'store'])->name('store');
        Route::get('/{audit}', [App\Http\Controllers\Mra\MraController::class, 'show'])->name('show');
        Route::get('/{audit}/export-pdf', [App\Http\Controllers\Mra\MraController::class, 'exportPdf'])->name('export-pdf');
        Route::get('/{audit}/audit', [App\Http\Controllers\Mra\MraController::class, 'audit'])->name('audit');
        Route::post('/{audit}/audit', [App\Http\Controllers\Mra\MraController::class, 'saveAuditResults'])->name('audit.save');
        Route::put('/{audit}', [App\Http\Controllers\Mra\MraController::class, 'update'])->name('update');
        Route::delete('/{audit}', [App\Http\Controllers\Mra\MraController::class, 'destroy'])->name('destroy');
    });

    // Infection Control (IC)
    Route::prefix('ic')->name('ic.')->group(function () {
        // Dashboard
        Route::get('/', [IcController::class, 'index'])->name('index');
        
        // Surveillance
        Route::get('/surveillance', [IcController::class, 'surveillance'])->name('surveillance');
        Route::get('/surveillance/search', [IcController::class, 'searchAdmissions'])->name('surveillance.search');
        Route::post('/surveillance', [IcController::class, 'storeSurveillance'])->name('surveillance.store');
        Route::put('/surveillance/{log}', [IcController::class, 'updateSurveillance'])->name('surveillance.update');
        
        // Incidents
        Route::get('/incidents', [IcController::class, 'incidents'])->name('incidents');
        Route::post('/incidents', [IcController::class, 'storeIncident'])->name('incidents.store');
        Route::put('/incidents/{incident}', [IcController::class, 'updateIncident'])->name('incidents.update');
        
        // Hand Hygiene
        Route::get('/hand-hygiene', [IcController::class, 'handHygiene'])->name('hand-hygiene');
        Route::post('/hand-hygiene', [IcController::class, 'storeHandHygiene'])->name('hand-hygiene.store');
        Route::put('/hand-hygiene/{observation}', [IcController::class, 'updateHandHygiene'])->name('hand-hygiene.update');
        
        // Environment Check
        Route::get('/environment', [IcController::class, 'environment'])->name('environment');
        Route::post('/environment', [IcController::class, 'storeEnvironment'])->name('environment.store');
        Route::put('/environment/{check}', [IcController::class, 'updateEnvironment'])->name('environment.update');
        
        // Device Days
        Route::get('/device-days', [IcController::class, 'deviceDays'])->name('device-days');
        Route::post('/device-days', [IcController::class, 'storeDeviceDays'])->name('device-days.store');
        Route::put('/device-days/{deviceDay}', [IcController::class, 'updateDeviceDays'])->name('device-days.update');
        
        // Antibiotic Stewardship
        Route::get('/antibiotic', [IcController::class, 'antibiotic'])->name('antibiotic');
        Route::post('/antibiotic', [IcController::class, 'storeAntibiotic'])->name('antibiotic.store');
        Route::put('/antibiotic/{antibioticUse}', [IcController::class, 'updateAntibiotic'])->name('antibiotic.update');
        Route::post('/antibiotic/{antibioticUse}/review', [IcController::class, 'reviewAntibiotic'])->name('antibiotic.review');
        Route::get('/antibiotic/search-drugs', [IcController::class, 'searchDrugs'])->name('antibiotic.search-drugs');
        
        // Outbreak Management
        Route::get('/outbreak', [IcController::class, 'outbreak'])->name('outbreak');
        Route::post('/outbreak', [IcController::class, 'storeOutbreak'])->name('outbreak.store');
        Route::put('/outbreak/{outbreak}', [IcController::class, 'updateOutbreak'])->name('outbreak.update');
        Route::post('/outbreak/{outbreak}/case', [IcController::class, 'storeOutbreakCase'])->name('outbreak.case.store');
        Route::put('/outbreak/{outbreak}/case/{case}', [IcController::class, 'updateOutbreakCase'])->name('outbreak.case.update');
        
        // Education & Training
        Route::get('/education', [IcController::class, 'education'])->name('education');
        Route::post('/education', [IcController::class, 'storeEducation'])->name('education.store');
        Route::put('/education/{education}', [IcController::class, 'updateEducation'])->name('education.update');
        Route::post('/education/{education}/attendee', [IcController::class, 'storeEducationAttendee'])->name('education.attendee.store');
        Route::put('/education/{education}/attendee/{attendee}', [IcController::class, 'updateEducationAttendee'])->name('education.attendee.update');
        
        // Reports
        Route::get('/reports', [IcController::class, 'reports'])->name('reports');
        Route::get('/reports/pdf', [IcController::class, 'exportPdf'])->name('reports.pdf');
        Route::get('/reports/export', [IcController::class, 'exportReports'])->name('reports.export');
        
        // Settings
        Route::get('/settings', [IcController::class, 'settings'])->name('settings');
        Route::post('/settings', [IcController::class, 'updateSettings'])->name('settings.update');
    });

    // Administrative Hub
    Route::get('/admin-hub', [App\Http\Controllers\AdminHubController::class, 'index'])->name('admin.hub');

    // Leave Management (ระบบบันทึกการลา)
    Route::prefix('administration/leave')->name('leave.')->group(function () {
        Route::get('/', [App\Http\Controllers\LeaveRequestController::class, 'index'])->name('index');
        Route::get('/create', [App\Http\Controllers\LeaveRequestController::class, 'create'])->name('create');
        Route::post('/', [App\Http\Controllers\LeaveRequestController::class, 'store'])->name('store');
        Route::get('/{leave}', [App\Http\Controllers\LeaveRequestController::class, 'show'])->name('show');
        Route::post('/{leave}/approve', [App\Http\Controllers\LeaveRequestController::class, 'approve'])->name('approve');
        Route::post('/{leave}/forward-director', [App\Http\Controllers\LeaveRequestController::class, 'forwardToDirector'])->name('forward-director');
        Route::post('/{leave}/cancel', [App\Http\Controllers\LeaveRequestController::class, 'cancel'])->name('cancel');
        Route::get('/{leave}/pdf', [App\Http\Controllers\LeaveRequestController::class, 'exportPdf'])->name('pdf');
    });

    // HOSxP Reports
    Route::get('/hosxp-reports', [App\Http\Controllers\HosxpReportController::class, 'index'])->name('hosxp-reports.index');
    Route::get('/hosxp-reports/preview', [App\Http\Controllers\HosxpReportController::class, 'preview'])->name('hosxp-reports.preview');
    Route::get('/hosxp-reports/generate', [App\Http\Controllers\HosxpReportController::class, 'generate'])->name('hosxp-reports.generate');
    Route::get('/hosxp-reports/generate-pdf', [App\Http\Controllers\HosxpReportController::class, 'generatePdf'])->name('hosxp-reports.generate-pdf');
    Route::get('/hosxp-reports/check-connection', [App\Http\Controllers\HosxpReportController::class, 'checkConnection'])->name('hosxp-reports.check-connection');
    Route::post('/hosxp-reports/presets', [App\Http\Controllers\HosxpReportController::class, 'storePreset'])->name('hosxp-reports.presets.store');
    Route::delete('/hosxp-reports/presets/{preset}', [App\Http\Controllers\HosxpReportController::class, 'destroyPreset'])->name('hosxp-reports.presets.destroy');
    Route::post('/hosxp-reports/scheduled', [App\Http\Controllers\HosxpReportController::class, 'storeScheduled'])->name('hosxp-reports.scheduled.store');
    Route::delete('/hosxp-reports/scheduled/{scheduled}', [App\Http\Controllers\HosxpReportController::class, 'destroyScheduled'])->name('hosxp-reports.scheduled.destroy');
    Route::get('/hosxp-reports/scheduled/{scheduled}/download', [App\Http\Controllers\HosxpReportController::class, 'downloadScheduled'])->name('hosxp-reports.download-scheduled');

    // Server Monitor (HOSxP / 192.168.1.191)
    Route::get('/server-monitor', [App\Http\Controllers\ServerMonitorController::class, 'index'])->name('server-monitor.index');
    Route::get('/server-monitor/metrics', [App\Http\Controllers\ServerMonitorController::class, 'metrics'])->name('server-monitor.metrics');
    Route::post('/server-monitor/check-now', [App\Http\Controllers\ServerMonitorController::class, 'checkNow'])->name('server-monitor.check-now');

    // FortiGate Firewall (F100)
    Route::get('/firewall', [App\Http\Controllers\Firewall\FirewallController::class, 'index'])->name('firewall.index');
    Route::get('/firewall/metrics', [App\Http\Controllers\Firewall\FirewallController::class, 'metrics'])->name('firewall.metrics');
    Route::post('/firewall/poll-now', [App\Http\Controllers\Firewall\FirewallController::class, 'pollNow'])->name('firewall.poll-now');
    Route::get('/firewall/syslog/status', [App\Http\Controllers\Firewall\FirewallController::class, 'syslogStatus'])->name('firewall.syslog.status');
    Route::post('/firewall/syslog/start', [App\Http\Controllers\Firewall\FirewallController::class, 'syslogStart'])->name('firewall.syslog.start');
    Route::post('/firewall/syslog/stop', [App\Http\Controllers\Firewall\FirewallController::class, 'syslogStop'])->name('firewall.syslog.stop');
    Route::get('/firewall/web-watch', [App\Http\Controllers\Firewall\FirewallController::class, 'webWatch'])->name('firewall.web-watch');
    Route::get('/firewall/threats', [App\Http\Controllers\Firewall\FirewallController::class, 'threats'])->name('firewall.threats');
    Route::get('/firewall/logs', [App\Http\Controllers\Firewall\FirewallController::class, 'logs'])->name('firewall.logs');
    Route::get('/firewall/threat-intel', [App\Http\Controllers\Firewall\FirewallController::class, 'threatIntel'])->name('firewall.threat-intel');
    Route::post('/firewall/threat-intel/sync', [App\Http\Controllers\Firewall\FirewallController::class, 'syncThreatIntel'])->name('firewall.threat-intel.sync');
    Route::post('/firewall/threat-intel/custom', [App\Http\Controllers\Firewall\FirewallController::class, 'storeCustomIndicator'])->name('firewall.threat-intel.custom.store');
    Route::delete('/firewall/threat-intel/custom/{id}', [App\Http\Controllers\Firewall\FirewallController::class, 'destroyCustomIndicator'])->name('firewall.threat-intel.custom.destroy');
});

// Organization Chat API (LIFF / Cloudflare Worker — ไม่ใช้ auth session ของเว็บ)
Route::match(
    ['get', 'post', 'options'],
    '/organization-chat/api',
    [App\Http\Controllers\OrganizationChatApiController::class, 'handle']
)->name('organization-chat.api');

// Locale switcher (outside auth)
Route::get('/locale/{locale}', [LanguageController::class, 'switch'])->name('locale.switch');
Route::post('/locale', [LanguageController::class, 'update'])->name('locale.update');

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';










// ==========================================
// --- Public queue portal (สแกน QR ใบนำทาง ไม่ต้อง login) ---
// ==========================================
Route::get('/queue', [App\Http\Controllers\QueuePortalController::class, 'index'])->name('queue-portal.index');
Route::get('/queue/push-key', [App\Http\Controllers\QueuePortalController::class, 'pushKey'])->name('queue-portal.push-key');
Route::get('/queue/{oqueue}', [App\Http\Controllers\QueuePortalController::class, 'show'])
    ->where('oqueue', '[A-Za-z0-9]{1,12}')
    ->name('queue-portal.show');
Route::get('/queue/{oqueue}/status', [App\Http\Controllers\QueuePortalController::class, 'status'])
    ->where('oqueue', '[A-Za-z0-9]{1,12}')
    ->name('queue-portal.status');
Route::post('/queue/{oqueue}/push', [App\Http\Controllers\QueuePortalController::class, 'subscribe'])
    ->where('oqueue', '[A-Za-z0-9]{1,12}')
    ->name('queue-portal.push');

// ==========================================
// --- TV Display & Admin Queue Management ---
// ==========================================

// --- Public TV Display (ไม่ต้อง auth เปิดบนจอทีวีได้ทันที) ---
Route::get('/tv', [App\Http\Controllers\TvBoardController::class, 'show'])->name('tv.board')->defaults('boardKey', 'default');
Route::get('/er', [App\Http\Controllers\TvBoardController::class, 'show'])->name('tv.er.board')->defaults('boardKey', '003');
Route::get('/tv-er', [App\Http\Controllers\TvBoardController::class, 'show'])->defaults('boardKey', '003');
Route::get('/drug', [App\Http\Controllers\TvBoardController::class, 'show'])->name('tv.drug.board')->defaults('boardKey', '013');
Route::get('/tv-drug', [App\Http\Controllers\TvBoardController::class, 'show'])->defaults('boardKey', '013');

// Generic TV Display & Sub-routes
Route::get('/tv/{boardKey}', [App\Http\Controllers\TvBoardController::class, 'show'])->where('boardKey', '[a-zA-Z0-9_-]+');

// Queue data polling endpoints
Route::get('/tv/queue-data', [App\Http\Controllers\TvBoardController::class, 'queueData'])->defaults('boardKey', 'default');
Route::get('/er/queue-data', [App\Http\Controllers\TvBoardController::class, 'queueData'])->defaults('boardKey', '003');
Route::get('/tv-er/queue-data', [App\Http\Controllers\TvBoardController::class, 'queueData'])->defaults('boardKey', '003');
Route::get('/drug/queue-data', [App\Http\Controllers\TvBoardController::class, 'queueData'])->defaults('boardKey', '013');
Route::get('/tv-drug/queue-data', [App\Http\Controllers\TvBoardController::class, 'queueData'])->defaults('boardKey', '013');
Route::get('/tv/{boardKey}/queue-data', [App\Http\Controllers\TvBoardController::class, 'queueData'])->name('tv.board.data');

// ER 3-section display data (คัดกรอง/รอตรวจ/กำลังตรวจ)
Route::get('/er/sections-data', [App\Http\Controllers\TvBoardController::class, 'erQueueData']);
Route::get('/tv-er/sections-data', [App\Http\Controllers\TvBoardController::class, 'erQueueData']);

// --- Admin Queue Management (ต้อง auth) ---
Route::middleware(['web', 'auth'])->group(function () {
    // 1. Root Shortcuts & Redirects
    Route::get('/admin/tv', fn () => redirect('/admin/tv/rooms'));
    Route::get('/admin/tv-er', fn () => redirect('/admin/tv-er/rooms'));
    Route::get('/admin/er', fn () => redirect('/admin/tv-er/rooms'));
    Route::get('/admin/tv-drug', fn () => redirect('/admin/tv-drug/rooms'));
    Route::get('/admin/drug', fn () => redirect('/admin/tv-drug/rooms'));

    // 2. ER Aliases (/admin/tv-er/* and /admin/er/*)
    Route::get('/admin/tv-er/rooms', [App\Http\Controllers\Admin\TvClinicRoomController::class, 'index'])->defaults('boardKey', '003');
    Route::get('/admin/tv-er/settings', [App\Http\Controllers\Admin\TvDisplaySettingController::class, 'edit'])->defaults('boardKey', '003');
    Route::get('/admin/tv-er/playlist', [App\Http\Controllers\Admin\TvMediaPlaylistController::class, 'index'])->defaults('boardKey', '003');

    Route::get('/admin/er/rooms', fn () => redirect('/admin/tv-er/rooms'));
    Route::get('/admin/er/settings', fn () => redirect('/admin/tv-er/settings'));
    Route::get('/admin/er/playlist', fn () => redirect('/admin/tv-er/playlist'));

    // 3. Pharmacy Aliases (/admin/tv-drug/* and /admin/drug/*)
    Route::get('/admin/tv-drug/rooms', [App\Http\Controllers\Admin\TvClinicRoomController::class, 'index'])->defaults('boardKey', '013');
    Route::get('/admin/tv-drug/settings', [App\Http\Controllers\Admin\TvDisplaySettingController::class, 'edit'])->defaults('boardKey', '013');
    Route::get('/admin/tv-drug/playlist', [App\Http\Controllers\Admin\TvMediaPlaylistController::class, 'index'])->defaults('boardKey', '013');

    Route::get('/admin/drug/rooms', fn () => redirect('/admin/tv-drug/rooms'));
    Route::get('/admin/drug/settings', fn () => redirect('/admin/tv-drug/settings'));
    Route::get('/admin/drug/playlist', fn () => redirect('/admin/tv-drug/playlist'));

    // 4. Primary Admin TV Routes (Supports all boardKeys via URL or parameter)
    Route::prefix('admin/tv')->name('admin.tv.')->group(function () {
        Route::get('settings/{boardKey?}', [App\Http\Controllers\Admin\TvDisplaySettingController::class, 'edit'])->name('settings.edit');
        Route::put('settings/{boardKey?}', [App\Http\Controllers\Admin\TvDisplaySettingController::class, 'update'])->name('settings.update');

        Route::get('lab-xray/{boardKey?}', [App\Http\Controllers\Admin\TvDisplaySettingController::class, 'labXray'])->name('lab_xray.index');
        Route::get('screening/{boardKey?}', [App\Http\Controllers\Admin\TvDisplaySettingController::class, 'screening'])->name('screening.index');

        Route::get('playlist/{boardKey?}', [App\Http\Controllers\Admin\TvMediaPlaylistController::class, 'index'])->name('playlist.index');
        Route::post('playlist/{boardKey?}', [App\Http\Controllers\Admin\TvMediaPlaylistController::class, 'store'])->name('playlist.store');
        Route::patch('playlist/{item}/toggle', [App\Http\Controllers\Admin\TvMediaPlaylistController::class, 'toggle'])->name('playlist.toggle');
        Route::post('playlist/reorder', [App\Http\Controllers\Admin\TvMediaPlaylistController::class, 'reorder'])->name('playlist.reorder');
        Route::delete('playlist/{item}', [App\Http\Controllers\Admin\TvMediaPlaylistController::class, 'destroy'])->name('playlist.destroy');

        Route::get('rooms/{boardKey?}', [App\Http\Controllers\Admin\TvClinicRoomController::class, 'index'])->name('rooms.index');
        Route::post('rooms/{boardKey?}', [App\Http\Controllers\Admin\TvClinicRoomController::class, 'store'])->name('rooms.store');
        Route::patch('rooms/{room}/toggle', [App\Http\Controllers\Admin\TvClinicRoomController::class, 'toggle'])->name('rooms.toggle');
        Route::delete('rooms/{room}', [App\Http\Controllers\Admin\TvClinicRoomController::class, 'destroy'])->name('rooms.destroy');
    });
});

Route::get('/dev/config-cache', function () {
    \Illuminate\Support\Facades\Artisan::call('config:clear');
    \Illuminate\Support\Facades\Artisan::call('config:cache');
    return response('Config cache cleared & cached successfully.');
});




