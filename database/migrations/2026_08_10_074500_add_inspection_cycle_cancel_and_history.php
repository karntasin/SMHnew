<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('env_asset_inspection_cycles', function (Blueprint $table) {
            $table->timestamp('cancelled_at')->nullable()->after('notes');
            $table->foreignId('cancelled_by')->nullable()->after('cancelled_at')->constrained('users')->nullOnDelete();
            $table->string('cancel_reason', 1000)->nullable()->after('cancelled_by');
        });

        Schema::create('env_asset_inspection_cancellation_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cycle_id')->constrained('env_asset_inspection_cycles')->cascadeOnDelete();
            $table->string('action', 64);
            $table->string('mode', 32)->nullable();
            $table->date('scheduled_date')->nullable();
            $table->unsignedInteger('items_count')->default(0);
            $table->unsignedInteger('pending_count')->default(0);
            $table->unsignedInteger('pass_count')->default(0);
            $table->unsignedInteger('fail_count')->default(0);
            $table->boolean('had_results')->default(false);
            $table->boolean('force_confirmed')->default(false);
            $table->string('reason', 1000)->nullable();
            $table->json('meta')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['cycle_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('env_asset_inspection_cancellation_logs');

        Schema::table('env_asset_inspection_cycles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cancelled_by');
            $table->dropColumn(['cancelled_at', 'cancel_reason']);
        });
    }
};
