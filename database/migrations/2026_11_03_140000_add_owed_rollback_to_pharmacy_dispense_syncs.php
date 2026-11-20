<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pharmacy_dispense_syncs', function (Blueprint $table) {
            if (! Schema::hasColumn('pharmacy_dispense_syncs', 'an')) {
                $table->string('an', 20)->nullable()->after('vn');
            }
            if (! Schema::hasColumn('pharmacy_dispense_syncs', 'patient_name')) {
                $table->string('patient_name', 120)->nullable()->after('an');
            }
            if (! Schema::hasColumn('pharmacy_dispense_syncs', 'cancel_reason')) {
                $table->text('cancel_reason')->nullable()->after('message');
            }
            if (! Schema::hasColumn('pharmacy_dispense_syncs', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->after('cancel_reason');
            }
            if (! Schema::hasColumn('pharmacy_dispense_syncs', 'cancelled_by')) {
                $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete()->after('cancelled_at');
            }
            if (! Schema::hasColumn('pharmacy_dispense_syncs', 'fulfilled_at')) {
                $table->timestamp('fulfilled_at')->nullable()->after('cancelled_by');
            }
            if (! Schema::hasColumn('pharmacy_dispense_syncs', 'fulfilled_by')) {
                $table->foreignId('fulfilled_by')->nullable()->constrained('users')->nullOnDelete()->after('fulfilled_at');
            }
            if (! Schema::hasColumn('pharmacy_dispense_syncs', 'reversed_at')) {
                $table->timestamp('reversed_at')->nullable()->after('fulfilled_by');
            }
            if (! Schema::hasColumn('pharmacy_dispense_syncs', 'reversed_by')) {
                $table->foreignId('reversed_by')->nullable()->constrained('users')->nullOnDelete()->after('reversed_at');
            }
            if (! Schema::hasColumn('pharmacy_dispense_syncs', 'reverse_movement_id')) {
                $table->foreignId('reverse_movement_id')->nullable()->constrained('pharmacy_stock_movements')->nullOnDelete()->after('reversed_by');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pharmacy_dispense_syncs', function (Blueprint $table) {
            $table->dropForeign(['reverse_movement_id']);
            $table->dropForeign(['reversed_by']);
            $table->dropForeign(['fulfilled_by']);
            $table->dropForeign(['cancelled_by']);
            $table->dropColumn([
                'an', 'patient_name', 'cancel_reason', 'cancelled_at', 'cancelled_by',
                'fulfilled_at', 'fulfilled_by', 'reversed_at', 'reversed_by', 'reverse_movement_id',
            ]);
        });
    }
};
