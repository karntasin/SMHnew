<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medical_equipment_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('icon')->nullable();
            $table->string('color')->default('#0f766e');
            $table->text('description')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('medical_equipment', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->nullable()->constrained('medical_equipment_categories')->nullOnDelete();
            $table->string('asset_code')->unique();
            $table->string('name');
            $table->string('brand')->nullable();
            $table->string('model')->nullable();
            $table->string('serial_number')->nullable();
            $table->string('location')->nullable();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->string('image_path')->nullable();
            $table->enum('status', ['available', 'borrowed', 'maintenance', 'retired'])->default('available');
            $table->unsignedInteger('quantity_total')->default(1);
            $table->unsignedInteger('quantity_available')->default(1);
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('medical_equipment_borrowings', function (Blueprint $table) {
            $table->id();
            $table->string('borrowing_number')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignId('equipment_id')->constrained('medical_equipment')->cascadeOnDelete();
            $table->unsignedInteger('quantity')->default(1);
            $table->string('purpose');
            $table->string('usage_detail')->nullable();
            $table->string('patient_hn')->nullable();
            $table->string('ward_location')->nullable();
            $table->date('borrow_date');
            $table->date('expected_return_date');
            $table->dateTime('pickup_at')->nullable();
            $table->dateTime('actual_return_date')->nullable();
            $table->enum('status', [
                'pending',
                'approved',
                'borrowed',
                'returned',
                'rejected',
                'cancelled',
                'overdue',
            ])->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('returned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('condition_on_borrow')->nullable();
            $table->string('condition_on_return')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('reminder_sent')->default(false);
            $table->boolean('overdue_notified')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('medical_equipment_borrowing_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('borrowing_id')->constrained('medical_equipment_borrowings')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action');
            $table->text('description')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->timestamps();
        });

        Schema::create('medical_equipment_stock_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipment_id')->constrained('medical_equipment')->cascadeOnDelete();
            $table->foreignId('borrowing_id')->nullable()->constrained('medical_equipment_borrowings')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('type', ['in', 'out', 'adjust', 'return']);
            $table->integer('quantity_change');
            $table->unsignedInteger('quantity_before');
            $table->unsignedInteger('quantity_after');
            $table->string('reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_equipment_stock_logs');
        Schema::dropIfExists('medical_equipment_borrowing_logs');
        Schema::dropIfExists('medical_equipment_borrowings');
        Schema::dropIfExists('medical_equipment');
        Schema::dropIfExists('medical_equipment_categories');
    }
};
