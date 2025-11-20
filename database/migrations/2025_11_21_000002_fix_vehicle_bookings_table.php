<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('vehicle_bookings', function (Blueprint $table) {
            // Rename columns to match Model
            if (Schema::hasColumn('vehicle_bookings', 'start_time') && !Schema::hasColumn('vehicle_bookings', 'start_datetime')) {
                $table->renameColumn('start_time', 'start_datetime');
            }
            if (Schema::hasColumn('vehicle_bookings', 'end_time') && !Schema::hasColumn('vehicle_bookings', 'end_datetime')) {
                $table->renameColumn('end_time', 'end_datetime');
            }
            if (Schema::hasColumn('vehicle_bookings', 'title') && !Schema::hasColumn('vehicle_bookings', 'purpose')) {
                $table->renameColumn('title', 'purpose');
            }
            if (Schema::hasColumn('vehicle_bookings', 'passengers') && !Schema::hasColumn('vehicle_bookings', 'passenger_count')) {
                $table->renameColumn('passengers', 'passenger_count');
            }
            if (Schema::hasColumn('vehicle_bookings', 'remarks') && !Schema::hasColumn('vehicle_bookings', 'note')) {
                $table->renameColumn('remarks', 'note');
            }

            // Add missing columns
            if (!Schema::hasColumn('vehicle_bookings', 'vehicle_category_id')) {
                $table->foreignId('vehicle_category_id')->nullable()->constrained('vehicle_categories')->nullOnDelete();
            }
            if (!Schema::hasColumn('vehicle_bookings', 'booking_number')) {
                $table->string('booking_number')->nullable();
            }
            if (!Schema::hasColumn('vehicle_bookings', 'driver_id')) {
                $table->foreignId('driver_id')->nullable()->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('vehicle_bookings', 'approved_by')) {
                $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('vehicle_bookings', 'approval_reason')) {
                $table->text('approval_reason')->nullable();
            }
            if (!Schema::hasColumn('vehicle_bookings', 'rejection_reason')) {
                $table->text('rejection_reason')->nullable();
            }
            if (!Schema::hasColumn('vehicle_bookings', 'cancellation_reason')) {
                $table->text('cancellation_reason')->nullable();
            }
            
            // Make vehicle_id nullable to support "Request by Category" workflow if needed
            // But user wants to select vehicle now. We keep it nullable for flexibility.
            $table->unsignedBigInteger('vehicle_id')->nullable()->change();
        });
    }

    public function down()
    {
        // Irreversible changes in this context
    }
};
