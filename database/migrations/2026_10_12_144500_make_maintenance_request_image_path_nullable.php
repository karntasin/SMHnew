<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('maintenance_request_images')
            || ! Schema::hasColumn('maintenance_request_images', 'path')) {
            return;
        }

        Schema::table('maintenance_request_images', function (Blueprint $table) {
            $table->string('path')->nullable()->change();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('maintenance_request_images')
            || ! Schema::hasColumn('maintenance_request_images', 'path')) {
            return;
        }

        Schema::table('maintenance_request_images', function (Blueprint $table) {
            $table->string('path')->nullable(false)->change();
        });
    }
};
