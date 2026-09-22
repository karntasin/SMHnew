<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pharmacy_packaging_types', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('name', 100);
            $table->string('icon', 50)->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::table('pharmacy_item_units', function (Blueprint $table) {
            $table->foreignId('parent_unit_id')->nullable()->after('item_id')
                ->constrained('pharmacy_item_units')->nullOnDelete();
            $table->foreignId('packaging_type_id')->nullable()->after('parent_unit_id')
                ->constrained('pharmacy_packaging_types')->nullOnDelete();
            $table->decimal('contains_qty', 14, 4)->default(1)->after('name');
            $table->string('description')->nullable()->after('usage_context');
        });

        Schema::create('pharmacy_item_barcodes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('pharmacy_items')->cascadeOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('pharmacy_item_units')->cascadeOnDelete();
            $table->string('barcode', 150)->unique();
            $table->string('symbology', 30)->default('AUTO');
            $table->string('label')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['item_id', 'unit_id', 'is_active']);
        });

        $now = now();
        DB::table('pharmacy_packaging_types')->insert(collect([
            ['base', 'หน่วยย่อย/หน่วยฐาน'], ['tablet', 'เม็ด'], ['capsule', 'แคปซูล'],
            ['bottle', 'ขวด'], ['vial', 'ไวอัล'], ['ampoule', 'แอมพูล'], ['tube', 'หลอด'],
            ['sachet', 'ซอง'], ['strip', 'แผง'], ['pack', 'แพ็ค'], ['dozen', 'โหล'],
            ['box', 'กล่อง'], ['carton', 'ลัง'], ['case', 'หีบ'], ['pallet', 'พาเลท'],
            ['bag', 'ถุง'], ['roll', 'ม้วน'], ['set', 'ชุด'], ['other', 'อื่น ๆ'],
        ])->map(fn ($row, $index) => [
            'code' => $row[0], 'name' => $row[1], 'sort_order' => $index + 1,
            'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
        ])->all());

        DB::table('pharmacy_item_units')->whereNotNull('barcode')->where('barcode', '!=', '')
            ->orderBy('id')->get()->each(function ($unit) use ($now) {
                DB::table('pharmacy_item_barcodes')->insertOrIgnore([
                    'item_id' => $unit->item_id, 'unit_id' => $unit->id,
                    'barcode' => $unit->barcode, 'symbology' => 'AUTO',
                    'label' => 'นำเข้าจากข้อมูลหน่วยเดิม', 'is_primary' => true,
                    'is_active' => true, 'created_at' => $now, 'updated_at' => $now,
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('pharmacy_item_barcodes');
        Schema::table('pharmacy_item_units', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parent_unit_id');
            $table->dropConstrainedForeignId('packaging_type_id');
            $table->dropColumn(['contains_qty', 'description']);
        });
        Schema::dropIfExists('pharmacy_packaging_types');
    }
};
