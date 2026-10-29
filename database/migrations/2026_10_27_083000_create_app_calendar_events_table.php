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
        Schema::connection('mysql')->create('app_calendar_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->enum('scope', ['personal', 'hospital', 'hr'])->default('personal');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('location')->nullable();
            $table->dateTime('start_time');
            $table->dateTime('end_time');
            $table->boolean('is_all_day')->default(false);
            $table->string('color', 32)->default('#0284c7');
            $table->string('category', 64)->default('general');
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->enum('visibility', ['private', 'department', 'public'])->default('private');
            $table->enum('status', ['scheduled', 'in_progress', 'completed', 'cancelled'])->default('scheduled');
            $table->string('google_event_id')->nullable();
            $table->string('ical_uid')->nullable()->unique();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['scope', 'start_time']);
            $table->index(['user_id', 'start_time']);
            $table->index('start_time');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('app_calendar_events');
    }
};
