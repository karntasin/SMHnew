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
            // Track who completed the booking (should be the driver)
            if (!Schema::hasColumn('vehicle_bookings', 'completed_by')) {
                $table->foreignId('completed_by')->nullable()->after('completed_at')->constrained('users')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vehicle_bookings', function (Blueprint $table) {
            $table->dropForeign(['completed_by']);
            $table->dropColumn('completed_by');
        });
    }
};
