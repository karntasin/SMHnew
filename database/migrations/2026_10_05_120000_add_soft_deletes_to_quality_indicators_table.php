<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quality_indicators', function (Blueprint $table) {
            $table->softDeletes();
            $table->foreignId('deleted_by')->nullable()->after('deleted_at')->constrained('users')->nullOnDelete();
            $table->foreignId('restored_by')->nullable()->after('deleted_by')->constrained('users')->nullOnDelete();
            $table->timestamp('restored_at')->nullable()->after('restored_by');
        });
    }

    public function down(): void
    {
        Schema::table('quality_indicators', function (Blueprint $table) {
            $table->dropConstrainedForeignId('deleted_by');
            $table->dropConstrainedForeignId('restored_by');
            $table->dropColumn(['restored_at', 'deleted_at']);
        });
    }
};
