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
        Schema::table('document_actions', function (Blueprint $table) {
            if (!Schema::hasColumn('document_actions', 'acknowledged_at')) {
                $table->timestamp('acknowledged_at')->nullable()->after('is_current');
            }
            if (!Schema::hasColumn('document_actions', 'acknowledged_by')) {
                $table->foreignId('acknowledged_by')->nullable()->after('acknowledged_at')->constrained('users');
            }
            if (!Schema::hasColumn('document_actions', 'reminder_sent_at')) {
                $table->timestamp('reminder_sent_at')->nullable()->after('acknowledged_by');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('document_actions', function (Blueprint $table) {
            $table->dropForeign(['acknowledged_by']);
            $table->dropColumn(['acknowledged_at', 'acknowledged_by', 'reminder_sent_at']);
        });
    }
};
