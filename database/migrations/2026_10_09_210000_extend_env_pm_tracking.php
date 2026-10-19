<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('env_assets', function (Blueprint $table) {
            $table->date('install_date')->nullable()->after('purchase_date');
            $table->decimal('annual_pm_budget', 12, 2)->nullable()->after('price');
        });

        DB::table('env_assets')
            ->whereNull('install_date')
            ->whereNotNull('purchase_date')
            ->update(['install_date' => DB::raw('purchase_date')]);

        Schema::create('env_pm_standards', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('frequency', 20)->default('monthly');
            $table->string('basis', 20)->default('time');
            $table->unsignedInteger('interval_value')->default(1);
            $table->string('meter_unit', 40)->nullable();
            $table->decimal('meter_interval', 12, 2)->nullable();
            $table->text('sop')->nullable();
            $table->unsignedInteger('estimated_labor_minutes')->default(60);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('env_pm_standard_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('standard_id')->constrained('env_pm_standards')->cascadeOnDelete();
            $table->unsignedInteger('sort')->default(0);
            $table->string('task_name');
            $table->text('acceptable_criteria')->nullable();
            $table->string('unit', 40)->nullable();
            $table->decimal('min_value', 12, 3)->nullable();
            $table->decimal('max_value', 12, 3)->nullable();
            $table->string('input_type', 20)->default('check');
            $table->timestamps();
        });

        Schema::create('env_spare_parts', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('unit', 40)->default('ชิ้น');
            $table->decimal('min_stock', 12, 3)->default(0);
            $table->decimal('on_hand', 12, 3)->default(0);
            $table->decimal('unit_cost', 12, 2)->default(0);
            $table->string('location')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('env_pm_standard_parts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('standard_id')->constrained('env_pm_standards')->cascadeOnDelete();
            $table->foreignId('spare_part_id')->constrained('env_spare_parts')->cascadeOnDelete();
            $table->decimal('qty_required', 12, 3)->default(1);
            $table->timestamps();
            $table->unique(['standard_id', 'spare_part_id']);
        });

        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE env_pm_schedules MODIFY frequency_type VARCHAR(20) NOT NULL DEFAULT 'month'");
        }

        Schema::table('env_pm_schedules', function (Blueprint $table) {
            $table->foreignId('standard_id')->nullable()->after('asset_id')->constrained('env_pm_standards')->nullOnDelete();
            $table->string('basis', 20)->default('time')->after('frequency_value');
            $table->decimal('meter_interval', 12, 2)->nullable()->after('basis');
            $table->decimal('last_meter_reading', 12, 2)->nullable()->after('meter_interval');
            $table->decimal('next_meter_due', 12, 2)->nullable()->after('last_meter_reading');
            $table->string('meter_unit', 40)->nullable()->after('next_meter_due');
            $table->unsignedSmallInteger('lead_days')->nullable()->after('meter_unit');
        });

        DB::statement("
            UPDATE env_pm_schedules s
            INNER JOIN env_assets a ON a.id = s.asset_id
            SET s.lead_days = CASE a.risk_level
                WHEN 'A' THEN 14
                WHEN 'B' THEN 7
                WHEN 'C' THEN 3
                ELSE 7 END
            WHERE s.lead_days IS NULL
        ");

        Schema::create('env_pm_work_orders', function (Blueprint $table) {
            $table->id();
            $table->string('wo_number')->unique();
            $table->foreignId('asset_id')->constrained('env_assets')->cascadeOnDelete();
            $table->foreignId('schedule_id')->nullable()->constrained('env_pm_schedules')->nullOnDelete();
            $table->foreignId('standard_id')->nullable()->constrained('env_pm_standards')->nullOnDelete();
            $table->string('status', 30)->default('scheduled')->index();
            $table->date('due_date')->index();
            $table->date('scheduled_date')->nullable();
            $table->text('sop')->nullable();
            $table->unsignedInteger('labor_minutes')->nullable();
            $table->decimal('labor_cost', 12, 2)->nullable();
            $table->string('result', 10)->nullable();
            $table->text('findings')->nullable();
            $table->timestamp('performed_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('record_id')->nullable()->constrained('env_pm_records')->nullOnDelete();
            $table->unsignedBigInteger('corrective_request_id')->nullable()->index();
            $table->boolean('below_min_stock')->default(false);
            $table->date('last_alert_on')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('env_pm_work_order_assignees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->constrained('env_pm_work_orders')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('is_lead')->default(false);
            $table->timestamps();
            $table->unique(['work_order_id', 'user_id']);
        });

        Schema::create('env_pm_work_order_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->constrained('env_pm_work_orders')->cascadeOnDelete();
            $table->foreignId('standard_task_id')->nullable()->constrained('env_pm_standard_tasks')->nullOnDelete();
            $table->unsignedInteger('sort')->default(0);
            $table->string('task_name');
            $table->text('acceptable_criteria')->nullable();
            $table->string('unit', 40)->nullable();
            $table->decimal('min_value', 12, 3)->nullable();
            $table->decimal('max_value', 12, 3)->nullable();
            $table->string('input_type', 20)->default('check');
            $table->string('result', 10)->nullable();
            $table->string('measured_value', 100)->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
        });

        Schema::create('env_pm_work_order_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->constrained('env_pm_work_orders')->cascadeOnDelete();
            $table->string('phase', 20);
            $table->string('path');
            $table->timestamps();
        });

        Schema::create('env_pm_work_order_parts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->constrained('env_pm_work_orders')->cascadeOnDelete();
            $table->foreignId('spare_part_id')->constrained('env_spare_parts')->restrictOnDelete();
            $table->decimal('qty', 12, 3);
            $table->decimal('unit_cost', 12, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('env_spare_part_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('spare_part_id')->constrained('env_spare_parts')->cascadeOnDelete();
            $table->string('type', 20);
            $table->decimal('qty', 12, 3);
            $table->decimal('balance_after', 12, 3)->default(0);
            $table->foreignId('work_order_id')->nullable()->constrained('env_pm_work_orders')->nullOnDelete();
            $table->text('note')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('env_pm_meter_readings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained('env_assets')->cascadeOnDelete();
            $table->foreignId('schedule_id')->constrained('env_pm_schedules')->cascadeOnDelete();
            $table->decimal('reading', 12, 2);
            $table->timestamp('read_at');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('note')->nullable();
            $table->timestamps();
        });

        Schema::create('env_pm_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('value')->nullable();
            $table->timestamps();
        });

        DB::table('env_pm_settings')->insert([
            'key' => 'labor_rate_per_hour',
            'value' => '0',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Schema::table('env_pm_records', function (Blueprint $table) {
            $table->foreignId('work_order_id')->nullable()->after('schedule_id')->constrained('env_pm_work_orders')->nullOnDelete();
        });

        Schema::table('maintenance_requests', function (Blueprint $table) {
            $table->foreignId('env_asset_id')->nullable()->after('technician_id')->constrained('env_assets')->nullOnDelete();
            $table->foreignId('pm_work_order_id')->nullable()->after('env_asset_id')->constrained('env_pm_work_orders')->nullOnDelete();
        });

        Schema::table('env_pm_work_orders', function (Blueprint $table) {
            $table->foreign('corrective_request_id')->references('id')->on('maintenance_requests')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('env_pm_work_orders', function (Blueprint $table) {
            $table->dropForeign(['corrective_request_id']);
        });

        Schema::table('maintenance_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('pm_work_order_id');
            $table->dropConstrainedForeignId('env_asset_id');
        });

        Schema::table('env_pm_records', function (Blueprint $table) {
            $table->dropConstrainedForeignId('work_order_id');
        });

        Schema::dropIfExists('env_pm_settings');
        Schema::dropIfExists('env_pm_meter_readings');
        Schema::dropIfExists('env_spare_part_movements');
        Schema::dropIfExists('env_pm_work_order_parts');
        Schema::dropIfExists('env_pm_work_order_photos');
        Schema::dropIfExists('env_pm_work_order_tasks');
        Schema::dropIfExists('env_pm_work_order_assignees');
        Schema::dropIfExists('env_pm_work_orders');

        Schema::table('env_pm_schedules', function (Blueprint $table) {
            $table->dropConstrainedForeignId('standard_id');
            $table->dropColumn([
                'basis',
                'meter_interval',
                'last_meter_reading',
                'next_meter_due',
                'meter_unit',
                'lead_days',
            ]);
        });

        Schema::dropIfExists('env_pm_standard_parts');
        Schema::dropIfExists('env_spare_parts');
        Schema::dropIfExists('env_pm_standard_tasks');
        Schema::dropIfExists('env_pm_standards');

        Schema::table('env_assets', function (Blueprint $table) {
            $table->dropColumn(['install_date', 'annual_pm_budget']);
        });
    }
};
