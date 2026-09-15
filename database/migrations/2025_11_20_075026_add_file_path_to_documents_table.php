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
        if (!Schema::hasColumn('documents', 'file_path')) {
            Schema::table('documents', function (Blueprint $table) {
                if (Schema::hasColumn('documents', 'content')) {
                    $table->string('file_path')->nullable()->after('content');
                } else {
                    $table->string('file_path')->nullable();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn('file_path');
        });
    }
};
