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
        if (! Schema::connection('mysql')->hasTable('drug_pricing_tiers')) {
            Schema::connection('mysql')->create('drug_pricing_tiers', function (Blueprint $table) {
                $table->id();
                $table->string('name')->comment('ชื่อช่วงราคา');
                $table->decimal('min_cost', 12, 4)->default(0)->comment('ราคาทุนต่ำสุด (บาท)');
                $table->decimal('max_cost', 12, 4)->nullable()->comment('ราคาทุนสูงสุด (บาท, null คือไม่จำกัด)');
                $table->string('calc_type', 32)->default('fixed')->comment('fixed | base_plus_percent | markup_percent');
                $table->decimal('base_price', 12, 4)->default(0)->comment('ราคาขายตั้งต้น (บาท)');
                $table->decimal('base_cost', 12, 4)->default(0)->comment('ราคาทุนส่วนเกินที่เริ่มคิด %');
                $table->decimal('multiplier_percent', 8, 2)->default(0)->comment('เปอร์เซ็นต์ส่วนเกินหรือ % Markup');
                $table->integer('order')->default(0)->comment('ลำดับการประเมิน');
                $table->boolean('is_active')->default(true)->comment('เปิดใช้งานหรือไม่');
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('drug_pricing_tiers');
    }
};
