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
        Schema::table('pharmacy_lots', function (Blueprint $table) {
            $table->string('lot_no', 80)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pharmacy_lots', function (Blueprint $table) {
            $table->string('lot_no', 80)->nullable(false)->change();
        });
    }
};
