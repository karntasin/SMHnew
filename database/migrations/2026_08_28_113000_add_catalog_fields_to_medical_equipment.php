<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('medical_equipment', function (Blueprint $table) {
            $table->string('catalog_key', 40)->nullable()->unique()->after('id');
            $table->string('unit', 20)->default('ชิ้น')->after('name');
            $table->unsignedInteger('sort_order')->default(0)->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('medical_equipment', function (Blueprint $table) {
            $table->dropUnique(['catalog_key']);
            $table->dropColumn(['catalog_key', 'unit', 'sort_order']);
        });
    }
};
