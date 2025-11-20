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
        Schema::table('meeting_rooms', function (Blueprint $table) {
            if (!Schema::hasColumn('meeting_rooms', 'name')) {
                $table->string('name');
            }
            if (!Schema::hasColumn('meeting_rooms', 'capacity')) {
                $table->integer('capacity');
            }
            if (!Schema::hasColumn('meeting_rooms', 'location')) {
                $table->string('location')->nullable();
            }
            if (!Schema::hasColumn('meeting_rooms', 'description')) {
                $table->text('description')->nullable();
            }
            if (!Schema::hasColumn('meeting_rooms', 'status')) {
                $table->string('status')->default('active');
            }
            if (!Schema::hasColumn('meeting_rooms', 'color')) {
                $table->string('color')->default('#3b82f6');
            }
            if (!Schema::hasColumn('meeting_rooms', 'image_path')) {
                $table->string('image_path')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('meeting_rooms', function (Blueprint $table) {
            $table->dropColumn(['name', 'capacity', 'location', 'description', 'status', 'color', 'image_path']);
        });
    }
};
