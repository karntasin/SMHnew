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
        Schema::table('users', function (Blueprint $table) {
            // Add line display name (name from LINE profile)
            $table->string('line_display_name')->nullable()->after('line_id');
            // Add line picture URL
            $table->string('line_picture_url')->nullable()->after('avatar');
            // Add flag to indicate if profile is complete
            $table->boolean('profile_completed')->default(false)->after('line_picture_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['line_display_name', 'line_picture_url', 'profile_completed']);
        });
    }
};
