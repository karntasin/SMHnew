<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicle_booking_timeline', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('vehicle_bookings')->onDelete('cascade');
            $table->string('status');
            $table->string('action');
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicle_booking_timeline');
    }
};
