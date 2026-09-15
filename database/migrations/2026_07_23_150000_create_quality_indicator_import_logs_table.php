<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quality_indicator_import_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type'); // organization|department|ha_team
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->unsignedBigInteger('team_id')->nullable();
            $table->string('original_filename');
            $table->string('status')->default('pending'); // pending|completed|failed|cancelled
            $table->unsignedInteger('indicators_create')->default(0);
            $table->unsignedInteger('indicators_update')->default(0);
            $table->unsignedInteger('entries_create')->default(0);
            $table->unsignedInteger('entries_update')->default(0);
            $table->unsignedInteger('row_errors')->default(0);
            $table->json('summary')->nullable();
            $table->json('payload')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();

            $table->foreign('team_id')->references('id')->on('teamha')->nullOnDelete();
            $table->index(['type', 'status']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quality_indicator_import_logs');
    }
};
