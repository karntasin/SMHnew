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
    Route::get('/users/bulk-roles', [UserController::class, 'bulkRolesIndex'])->name('users.bulk-roles');
    Route::post('/users/bulk-roles', [UserController::class, 'bulkRolesUpdate'])->name('users.bulk-roles.update');
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

        Route::get('/{indicator}/export-pdf', [App\Http\Controllers\QualityIndicatorController::class, 'exportIndicatorPdf'])->name('export-indicator-pdf');
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
        Route::post('/nhso/clear', [App\Http\Controllers\FinanceCgdClaimController::class, 'nhsoClearSession'])->name('nhso.clear');
        Route::post('/reconcile-all', [App\Http\Controllers\FinanceCgdClaimController::class, 'reconcileAll'])->name('reconcile-all');
        Route::get('/reconcile-all', fn () => redirect()->route('finance.cgd.dashboard'))->name('reconcile-all.get');
        Route::get('/precheck', [App\Http\Controllers\FinanceCgdCDenyPrecheckController::class, 'index'])->name('precheck');
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

    Route::prefix('pharmacy/inventory')->name('pharmacy.inventory.')->group(function () {
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

        Route::get('/settings/template', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'downloadStockTemplate'])->name('settings.template');
        Route::post('/settings/import-preview', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'previewStockImport'])->name('settings.import-preview');
        Route::post('/settings/import-commit', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'commitStockImport'])->name('settings.import-commit');
        Route::post('/settings/packaging', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'storePackagingType'])->name('settings.packaging.store');
        Route::put('/settings/packaging/{type}', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'updatePackagingType'])->name('settings.packaging.update');
        Route::delete('/settings/packaging/{type}', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'destroyPackagingType'])->name('settings.packaging.destroy');
        Route::post('/settings/locations', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'storeLocation'])->name('settings.locations.store');
        Route::put('/settings/locations/{location}', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'updateLocation'])->name('settings.locations.update');
        Route::delete('/settings/locations/{location}', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'destroyLocation'])->name('settings.locations.destroy');
        Route::post('/settings/upsert', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'upsertSetting'])->name('settings.upsert');

        Route::put('/lots/{lot}', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'lotUpdate'])->name('lots.update');
        Route::delete('/lots/{lot}', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'lotDestroy'])->name('lots.destroy');
        Route::post('/lots/{lot}/qr', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'lotRegenerateQr'])->name('lots.qr');
        Route::get('/drugs/{icode}/units', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'itemUnits'])->name('drugs.units');
        Route::post('/manual-dispense', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'manualDispense'])->name('manual-dispense');
        Route::put('/balances/{balance}', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'updateBalance'])->name('balances.update');
        Route::delete('/balances/{balance}', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'destroyBalance'])->name('balances.destroy');
        Route::post('/reconcile-stock', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'reconcileStock'])->name('reconcile-stock');
        Route::get('/drug-out/stock-info', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'drugOutStockInfo'])->name('drug-out.stock-info');

        Route::get('/scan', [App\Http\Controllers\Pharmacy\PharmacyBarcodeController::class, 'index'])->name('scan');
        Route::post('/scan/resolve', [App\Http\Controllers\Pharmacy\PharmacyBarcodeController::class, 'resolve'])->name('scan.resolve');

        Route::get('/drug-out', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'drugOut'])->name('drug-out');
        Route::post('/drug-out/issue', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'drugOutIssue'])->name('drug-out.issue');
        Route::post('/drug-out/return', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'drugOutReturn'])->name('drug-out.return');

        Route::get('/stock-card', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'stockCard'])->name('stock-card');
        Route::get('/labels', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'batchLabels'])->name('labels');
        Route::get('/analytics', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'analytics'])->name('analytics');

        Route::get('/sync-dispense/history', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'dispenseSyncHistory'])->name('sync-dispense.history');
        Route::post('/sync-dispense/retry', [App\Http\Controllers\Pharmacy\PharmacyInventoryController::class, 'retryDispenseSync'])->name('sync-dispense.retry');

        // Admin Controller
        Route::get('/settings', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'settings'])->name('settings');
        Route::post('/settings/batch', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'saveBatchSettings'])->name('settings.batch');
        Route::get('/items', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'items'])->name('items');
        Route::post('/items/import', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'importItems'])->name('items.import');
        Route::put('/items/{item}', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'updateItem'])->name('items.update');
        Route::post('/items/{item}/units', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'storeUnit'])->name('items.units.store');
        Route::put('/items/units/{unit}', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'updateUnit'])->name('items.units.update');
        Route::post('/items/{item}/barcodes', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'storeBarcode'])->name('items.barcodes.store');
        Route::delete('/items/barcodes/{barcode}', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'destroyBarcode'])->name('items.barcodes.destroy');

        // Stock Counts
        Route::get('/counts', [App\Http\Controllers\Pharmacy\PharmacyInventoryAdminController::class, 'counts'])->name('counts');
        Route::post('/counts', [App\Http\Controllers\Pharmacy\PharmacyStockCountController::class, 'store'])->name('counts.store');
        Route::get('/counts/{count}', [App\Http\Controllers\Pharmacy\PharmacyStockCountController::class, 'show'])->name('counts.show');
        Route::post('/counts/{count}/complete', [App\Http\Controllers\Pharmacy\PharmacyStockCountController::class, 'complete'])->name('counts.complete');
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
        Route::get('/auto-check', [App\Http\Controllers\Mra\MraController::class, 'autoCheck'])->name('auto-check');
        Route::get('/statistics', [App\Http\Controllers\Mra\MraController::class, 'statistics'])->name('statistics');
        
        // Pages
        Route::get('/', [App\Http\Controllers\Mra\MraController::class, 'index'])->name('index');
        Route::get('/dashboard', [App\Http\Controllers\Mra\MraController::class, 'dashboard'])->name('dashboard');
        Route::get('/dashboard/export-pdf', [App\Http\Controllers\Mra\MraController::class, 'exportDashboardPdf'])->name('dashboard.export-pdf');
        Route::get('/reports', [App\Http\Controllers\Mra\MraController::class, 'reports'])->name('reports');
        Route::get('/reports/export-pdf', [App\Http\Controllers\Mra\MraController::class, 'exportReportsPdf'])->name('reports.export-pdf');
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
        
        // Environment Check
        Route::get('/environment', [IcController::class, 'environment'])->name('environment');
        Route::post('/environment', [IcController::class, 'storeEnvironment'])->name('environment.store');
        
        // Device Days
        Route::get('/device-days', [IcController::class, 'deviceDays'])->name('device-days');
        Route::post('/device-days', [IcController::class, 'storeDeviceDays'])->name('device-days.store');
        
        // Antibiotic Stewardship
        Route::get('/antibiotic', [IcController::class, 'antibiotic'])->name('antibiotic');
        Route::post('/antibiotic', [IcController::class, 'storeAntibiotic'])->name('antibiotic.store');
        Route::post('/antibiotic/{antibioticUse}/review', [IcController::class, 'reviewAntibiotic'])->name('antibiotic.review');
        Route::get('/antibiotic/search-drugs', [IcController::class, 'searchDrugs'])->name('antibiotic.search-drugs');
        
        // Outbreak Management
        Route::get('/outbreak', [IcController::class, 'outbreak'])->name('outbreak');
        Route::post('/outbreak', [IcController::class, 'storeOutbreak'])->name('outbreak.store');
        Route::put('/outbreak/{outbreak}', [IcController::class, 'updateOutbreak'])->name('outbreak.update');
        Route::post('/outbreak/{outbreak}/case', [IcController::class, 'storeOutbreakCase'])->name('outbreak.case.store');
        
        // Education & Training
        Route::get('/education', [IcController::class, 'education'])->name('education');
        Route::post('/education', [IcController::class, 'storeEducation'])->name('education.store');
        Route::post('/education/{education}/attendee', [IcController::class, 'storeEducationAttendee'])->name('education.attendee.store');
        
        // Reports
        Route::get('/reports', [IcController::class, 'reports'])->name('reports');
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










// --- Admin TV Routes ---
$tvSystems = [
    ['prefix' => 'admin/tv', 'name' => 'admin.tv', 'boardKey' => '002', 'displayPrefix' => 'tv', 'displayName' => 'tv'],
    ['prefix' => 'admin/er', 'name' => 'admin.er', 'boardKey' => '003', 'displayPrefix' => 'er', 'displayName' => 'er'],
    ['prefix' => 'admin/drug', 'name' => 'admin.drug', 'boardKey' => '013', 'displayPrefix' => 'drug', 'displayName' => 'drug'],
];

foreach ($tvSystems as $sys) {
    Route::middleware(['web', 'auth'])->prefix($sys['prefix'])->name($sys['name'].'.')->group(function () use ($sys) {
        Route::get('settings', [App\Http\Controllers\Admin\TvDisplaySettingController::class, 'edit'])->name('settings.edit')->defaults('boardKey', $sys['boardKey']);
        Route::put('settings', [App\Http\Controllers\Admin\TvDisplaySettingController::class, 'update'])->name('settings.update')->defaults('boardKey', $sys['boardKey']);

        Route::get('playlist', [App\Http\Controllers\Admin\TvMediaPlaylistController::class, 'index'])->name('playlist.index')->defaults('boardKey', $sys['boardKey']);
        Route::post('playlist', [App\Http\Controllers\Admin\TvMediaPlaylistController::class, 'store'])->name('playlist.store')->defaults('boardKey', $sys['boardKey']);
        Route::patch('playlist/{item}/toggle', [App\Http\Controllers\Admin\TvMediaPlaylistController::class, 'toggle'])->name('playlist.toggle');
        Route::post('playlist/reorder', [App\Http\Controllers\Admin\TvMediaPlaylistController::class, 'reorder'])->name('playlist.reorder');
        Route::delete('playlist/{item}', [App\Http\Controllers\Admin\TvMediaPlaylistController::class, 'destroy'])->name('playlist.destroy');

        Route::get('rooms', [App\Http\Controllers\Admin\TvClinicRoomController::class, 'index'])->name('rooms.index')->defaults('boardKey', $sys['boardKey']);
        Route::post('rooms', [App\Http\Controllers\Admin\TvClinicRoomController::class, 'store'])->name('rooms.store')->defaults('boardKey', $sys['boardKey']);
        Route::patch('rooms/{room}/toggle', [App\Http\Controllers\Admin\TvClinicRoomController::class, 'toggle'])->name('rooms.toggle');
        Route::delete('rooms/{room}', [App\Http\Controllers\Admin\TvClinicRoomController::class, 'destroy'])->name('rooms.destroy');
    });

    Route::get('/' . $sys['displayPrefix'], [App\Http\Controllers\TvBoardController::class, 'show'])->name($sys['displayName'].'.board')->defaults('boardKey', $sys['boardKey']);
    Route::get('/' . $sys['displayPrefix'] . '/queue-data', [App\Http\Controllers\TvBoardController::class, 'queueData'])->name($sys['displayName'].'.board.data')->defaults('boardKey', $sys['boardKey']);
}




Route::get('/dev/seed-menus', function() {
    $parent = \App\Models\Menu::firstOrCreate(['label' => '�Ѵ��ä��', 'icon' => 'Monitor', 'route' => null]);
    \App\Models\Menu::updateOrCreate(['route' => 'admin.tv.index'], ['label' => '�����ͧ��Ǩ', 'parent_id' => $parent->id, 'icon' => 'User']);
    \App\Models\Menu::updateOrCreate(['route' => 'admin.er.index'], ['label' => '�����ͧ�ء�Թ', 'parent_id' => $parent->id, 'icon' => 'ShieldAlert']);
    \App\Models\Menu::updateOrCreate(['route' => 'admin.drug.index'], ['label' => '�����ͧ������', 'parent_id' => $parent->id, 'icon' => 'Pill']);
    return 'OK';
});
