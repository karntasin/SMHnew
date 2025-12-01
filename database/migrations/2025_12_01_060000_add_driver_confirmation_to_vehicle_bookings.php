<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('vehicle_bookings', function (Blueprint $table) {
            // Driver confirmation timestamp
            if (!Schema::hasColumn('vehicle_bookings', 'driver_confirmed_at')) {
                $table->timestamp('driver_confirmed_at')->nullable()->after('driver_id');
            }
            
            // Driver rejection reason (in case driver declines)
            if (!Schema::hasColumn('vehicle_bookings', 'driver_rejection_reason')) {
                $table->text('driver_rejection_reason')->nullable()->after('driver_confirmed_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vehicle_bookings', function (Blueprint $table) {
            $table->dropColumn(['driver_confirmed_at', 'driver_rejection_reason']);
        });
    }
};
