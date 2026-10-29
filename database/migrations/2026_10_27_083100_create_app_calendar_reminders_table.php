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
        Schema::connection('mysql')->create('app_calendar_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('app_calendar_events')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->dateTime('remind_at');
            $table->string('reminder_type', 32)->default('before_1d');
            $table->integer('offset_minutes')->default(-1440);
            $table->integer('max_repeats')->default(1);
            $table->integer('repeat_interval_minutes')->default(0);
            $table->integer('sent_count')->default(0);
            $table->dateTime('last_sent_at')->nullable();
            $table->enum('channel', ['schat', 'system', 'both'])->default('both');
            $table->enum('status', ['pending', 'sent', 'cancelled'])->default('pending');
            $table->timestamps();

            $table->index(['status', 'remind_at']);
            $table->index('user_id');
            $table->index('event_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('app_calendar_reminders');
    }
};
