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
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // e.g. Toyota Commuter
            $table->string('plate_number')->unique(); // e.g. 1กข-1234
            $table->string('type')->default('car'); // car, van, truck, ambulance
            $table->integer('capacity')->default(4);
            $table->string('driver_name')->nullable();
            $table->string('status')->default('available'); // available, maintenance, busy
            $table->string('image')->nullable();
            $table->string('color')->default('#3b82f6'); // For calendar
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};
