<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('mysql')->create('tv_clinic_rooms', function (Blueprint $table) {
            $table->id();
            $table->string('board_key')->default('default');
            $table->string('hosxp_cur_dep', 10); // เช่น '002', '003' — map ไปยัง ovst.cur_dep
            $table->string('display_name'); // เช่น 'ห้องตรวจ 1 (อายุรกรรมทั่วไป)'
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['board_key', 'hosxp_cur_dep']);
            $table->index(['board_key', 'is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('tv_clinic_rooms');
    }
};
