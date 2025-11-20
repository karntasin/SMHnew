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
        Schema::table('room_bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('room_bookings', 'room_id')) {
                $table->foreignId('room_id')->constrained('meeting_rooms')->onDelete('cascade');
            }
            if (!Schema::hasColumn('room_bookings', 'user_id')) {
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            }
            if (!Schema::hasColumn('room_bookings', 'title')) {
                $table->string('title');
            }
            if (!Schema::hasColumn('room_bookings', 'start_time')) {
                $table->dateTime('start_time');
            }
            if (!Schema::hasColumn('room_bookings', 'end_time')) {
                $table->dateTime('end_time');
            }
            if (!Schema::hasColumn('room_bookings', 'description')) {
                $table->text('description')->nullable();
            }
            if (!Schema::hasColumn('room_bookings', 'status')) {
                $table->string('status')->default('pending');
            }
            if (!Schema::hasColumn('room_bookings', 'attendees_count')) {
                $table->integer('attendees_count')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('room_bookings', function (Blueprint $table) {
            $table->dropColumn(['room_id', 'user_id', 'title', 'start_time', 'end_time', 'description', 'status', 'attendees_count']);
        });
    }
};
