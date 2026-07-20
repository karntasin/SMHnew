<?php

use Inertia\Inertia;
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

Route::get('/', fn () => redirect()->route('login'))->name('home');

Route::middleware(['auth', 'menu.permission'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('help', [HelpController::class, 'index'])->name('help.index');
    Route::get('help/download-pdf', [HelpController::class, 'downloadPdf'])->name('help.download-pdf');
    Route::get('dashboard/stats', [DashboardController::class, 'stats'])->name('dashboard.stats');
    Route::get('dashboard/monthly-visits', [DashboardController::class, 'monthlyVisits'])->name('dashboard.monthly-visits');
    Route::get('dashboard/pdf', [DashboardController::class, 'exportPdf'])->name('dashboard.pdf');
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

    // Finance Dashboard
    Route::get('/finance-dashboard', [App\Http\Controllers\FinanceDashboardController::class, 'index'])->name('finance.dashboard');
    Route::get('/finance/revenue', [App\Http\Controllers\FinanceRevenueController::class, 'index'])->name('finance.revenue');
    Route::get('/finance/revenue/export', [App\Http\Controllers\FinanceRevenueController::class, 'exportExcel'])->name('finance.revenue.export');
    Route::get('/finance/revenue/export-pdf', [App\Http\Controllers\FinanceRevenueController::class, 'exportPdf'])->name('finance.revenue.export-pdf');

    // RDU Reports (Rational Drug Use)
    Route::get('/rdu', [App\Http\Controllers\RduReportController::class, 'index'])->name('rdu.index');
    Route::get('/rdu/cases', [App\Http\Controllers\RduReportController::class, 'cases'])->name('rdu.cases');
    Route::get('/rdu/export', [App\Http\Controllers\RduReportController::class, 'export'])->name('rdu.export');
    Route::post('/rdu/audits', [App\Http\Controllers\RduReportController::class, 'storeAudit'])->name('rdu.audits.store');
    Route::get('/rdu/drugs', [App\Http\Controllers\RduReportController::class, 'drugs'])->name('rdu.drugs');
    Route::get('/rdu/drugs/antibiotics', [App\Http\Controllers\RduReportController::class, 'antibiotics'])->name('rdu.drugs.antibiotics');
    Route::get('/rdu/drugs/by-department', [App\Http\Controllers\RduReportController::class, 'drugsByDepartment'])->name('rdu.drugs.by-department');
    Route::get('/rdu/drugs/export', [App\Http\Controllers\RduReportController::class, 'exportDrugs'])->name('rdu.drugs.export');

    // Drug Usage Reports (รายงานยาและการใช้ยา)
    Route::get('/drug-usage', [App\Http\Controllers\DrugUsageController::class, 'index'])->name('drug-usage.index');
    Route::get('/drug-usage/report', [App\Http\Controllers\DrugUsageController::class, 'report'])->name('drug-usage.report');
    Route::get('/drug-usage/export', [App\Http\Controllers\DrugUsageController::class, 'export'])->name('drug-usage.export');
    Route::get('/drug-usage/export-pdf', [App\Http\Controllers\DrugUsageController::class, 'exportPdf'])->name('drug-usage.export-pdf');

    // IM - IT Management (งานสารสนเทศ HAIT) ภายใต้ศูนย์คุณภาพ
    Route::prefix('im')->name('im.')->group(function () {
        Route::get('/', [App\Http\Controllers\Im\ImHubController::class, 'index'])->name('index');
        Route::get('/manual', [App\Http\Controllers\Im\ImHubController::class, 'manual'])->name('manual');

        // หมวด 1: Master Plan & Strategy
        Route::get('/master-plan', [App\Http\Controllers\Im\MasterPlanController::class, 'index'])->name('master-plan');
        Route::post('/master-plan/plans', [App\Http\Controllers\Im\MasterPlanController::class, 'storePlan'])->name('master-plan.plans.store');
        Route::put('/master-plan/plans/{plan}', [App\Http\Controllers\Im\MasterPlanController::class, 'updatePlan'])->name('master-plan.plans.update');
        Route::delete('/master-plan/plans/{plan}', [App\Http\Controllers\Im\MasterPlanController::class, 'destroyPlan'])->name('master-plan.plans.destroy');
        Route::post('/master-plan/mappings', [App\Http\Controllers\Im\MasterPlanController::class, 'storeMapping'])->name('master-plan.mappings.store');
        Route::put('/master-plan/mappings/{mapping}', [App\Http\Controllers\Im\MasterPlanController::class, 'updateMapping'])->name('master-plan.mappings.update');
        Route::delete('/master-plan/mappings/{mapping}', [App\Http\Controllers\Im\MasterPlanController::class, 'destroyMapping'])->name('master-plan.mappings.destroy');
        Route::post('/master-plan/actions', [App\Http\Controllers\Im\MasterPlanController::class, 'storeAction'])->name('master-plan.actions.store');
        Route::put('/master-plan/actions/{action}', [App\Http\Controllers\Im\MasterPlanController::class, 'updateAction'])->name('master-plan.actions.update');
        Route::delete('/master-plan/actions/{action}', [App\Http\Controllers\Im\MasterPlanController::class, 'destroyAction'])->name('master-plan.actions.destroy');

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
        Route::delete('/service-desk/timesheets/{timesheet}', [App\Http\Controllers\Im\ServiceDeskController::class, 'destroyTimesheet'])->name('service-desk.timesheets.destroy');

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
        // API endpoints
        Route::get('/search-patient', [App\Http\Controllers\Mra\MraController::class, 'searchPatient'])->name('search-patient');
        Route::get('/visit-data', [App\Http\Controllers\Mra\MraController::class, 'getVisitData'])->name('visit-data');
        Route::get('/criteria', [App\Http\Controllers\Mra\MraController::class, 'getCriteria'])->name('criteria');
        Route::get('/auto-check', [App\Http\Controllers\Mra\MraController::class, 'autoCheck'])->name('auto-check');
        Route::get('/statistics', [App\Http\Controllers\Mra\MraController::class, 'statistics'])->name('statistics');
        
        // Pages
        Route::get('/', [App\Http\Controllers\Mra\MraController::class, 'index'])->name('index');
        Route::get('/dashboard', [App\Http\Controllers\Mra\MraController::class, 'dashboard'])->name('dashboard');
        Route::get('/reports', [App\Http\Controllers\Mra\MraController::class, 'reports'])->name('reports');
        Route::get('/settings', [App\Http\Controllers\Mra\MraController::class, 'settings'])->name('settings');
        Route::get('/create', [App\Http\Controllers\Mra\MraController::class, 'create'])->name('create');
        Route::post('/', [App\Http\Controllers\Mra\MraController::class, 'store'])->name('store');
        Route::get('/{audit}', [App\Http\Controllers\Mra\MraController::class, 'show'])->name('show');
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
});

// Locale switcher (outside auth)
Route::get('/locale/{locale}', [LanguageController::class, 'switch'])->name('locale.switch');
Route::post('/locale', [LanguageController::class, 'update'])->name('locale.update');

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
