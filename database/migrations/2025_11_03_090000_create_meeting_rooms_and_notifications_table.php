<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('meeting_rooms')) {
            Schema::create('meeting_rooms', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('location')->nullable();
                $table->integer('capacity')->default(10);
                $table->text('description')->nullable();
                $table->json('facilities')->nullable();
                $table->boolean('is_active')->default(true);
                $table->boolean('requires_approval')->default(false);
                $table->string('image')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('room_bookings')) {
            Schema::create('room_bookings', function (Blueprint $table) {
                $table->id();
                $table->foreignId('room_id')->constrained('meeting_rooms')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('title');
                $table->text('description')->nullable();
                $table->dateTime('start_time');
                $table->dateTime('end_time');
                $table->integer('attendees_count')->nullable();
                $table->string('status')->default('pending'); // pending, approved, rejected, cancelled
                $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('approved_at')->nullable();
                $table->text('rejection_reason')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('type');
                $table->morphs('notifiable');
                $table->text('data');
                $table->timestamp('read_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('room_bookings');
        Schema::dropIfExists('meeting_rooms');
        Schema::dropIfExists('notifications');
    }
};
