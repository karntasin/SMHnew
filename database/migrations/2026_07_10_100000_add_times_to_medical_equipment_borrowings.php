<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('medical_equipment_borrowings', function (Blueprint $table) {
            $table->time('borrow_time')->default('08:00:00')->after('borrow_date');
            $table->time('expected_return_time')->default('16:30:00')->after('expected_return_date');
        });
    }

    public function down(): void
    {
        Schema::table('medical_equipment_borrowings', function (Blueprint $table) {
            $table->dropColumn(['borrow_time', 'expected_return_time']);
        });
    }
};
