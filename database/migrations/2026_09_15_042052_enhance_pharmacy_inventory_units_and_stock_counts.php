<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pharmacy_items', function (Blueprint $table) {
            $table->string('base_unit', 50)->nullable()->after('unit');
            $table->string('dispense_unit', 50)->nullable()->after('base_unit');
            $table->string('barcode', 100)->nullable()->unique()->after('dispense_unit');
            $table->timestamp('hosxp_synced_at')->nullable()->after('barcode');
        });

        Schema::create('pharmacy_item_units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('pharmacy_items')->cascadeOnDelete();
            $table->string('name', 50);
            $table->decimal('factor_to_base', 14, 4)->default(1);
            $table->string('barcode', 100)->nullable()->unique();
            $table->string('usage_context', 20)->default('all');
            $table->boolean('is_default_receive')->default(false);
            $table->boolean('is_default_transfer')->default(false);
            $table->boolean('is_default_dispense')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->unique(['item_id', 'name']);
        });

        Schema::table('pharmacy_lots', function (Blueprint $table) {
            $table->foreignId('received_unit_id')->nullable()->after('location_id')
                ->constrained('pharmacy_item_units')->nullOnDelete();
            $table->decimal('received_package_qty', 14, 2)->nullable()->after('received_unit_id');
            $table->decimal('unit_factor', 14, 4)->default(1)->after('received_package_qty');
            $table->decimal('invoice_unit_price', 14, 4)->nullable()->after('invoice_no');
            $table->decimal('invoice_total_price', 14, 2)->nullable()->after('invoice_unit_price');
            $table->date('invoice_date')->nullable()->after('invoice_total_price');
        });

        Schema::table('pharmacy_stock_movements', function (Blueprint $table) {
            $table->foreignId('transaction_unit_id')->nullable()->after('lot_id')
                ->constrained('pharmacy_item_units')->nullOnDelete();
            $table->decimal('transaction_qty', 14, 2)->nullable()->after('transaction_unit_id');
            $table->decimal('unit_factor', 14, 4)->default(1)->after('transaction_qty');
        });

        Schema::create('pharmacy_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('type', 20)->default('string');
            $table->string('label')->nullable();
            $table->string('group', 50)->default('general');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('pharmacy_stock_counts', function (Blueprint $table) {
            $table->id();
            $table->string('count_no', 50)->unique();
            $table->foreignId('location_id')->constrained('pharmacy_locations')->restrictOnDelete();
            $table->date('count_date');
            $table->string('status', 20)->default('draft');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('pharmacy_stock_count_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_count_id')->constrained('pharmacy_stock_counts')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('role', 100)->nullable();
            $table->timestamps();
        });

        Schema::create('pharmacy_stock_count_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_count_id')->constrained('pharmacy_stock_counts')->cascadeOnDelete();
            $table->foreignId('item_id')->constrained('pharmacy_items')->restrictOnDelete();
            $table->foreignId('lot_id')->nullable()->constrained('pharmacy_lots')->nullOnDelete();
            $table->decimal('system_qty', 14, 2)->default(0);
            $table->decimal('counted_qty', 14, 2)->nullable();
            $table->decimal('variance_qty', 14, 2)->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
            $table->unique(['stock_count_id', 'item_id', 'lot_id'], 'pharmacy_count_item_lot_unique');
        });

        Schema::create('pharmacy_stock_count_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_count_id')->constrained('pharmacy_stock_counts')->cascadeOnDelete();
            $table->string('path');
            $table->string('original_name')->nullable();
            $table->string('mime_type', 100)->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pharmacy_stock_count_photos');
        Schema::dropIfExists('pharmacy_stock_count_items');
        Schema::dropIfExists('pharmacy_stock_count_members');
        Schema::dropIfExists('pharmacy_stock_counts');
        Schema::dropIfExists('pharmacy_settings');

        Schema::table('pharmacy_stock_movements', function (Blueprint $table) {
            $table->dropConstrainedForeignId('transaction_unit_id');
            $table->dropColumn(['transaction_qty', 'unit_factor']);
        });
        Schema::table('pharmacy_lots', function (Blueprint $table) {
            $table->dropConstrainedForeignId('received_unit_id');
            $table->dropColumn([
                'received_package_qty', 'unit_factor', 'invoice_unit_price',
                'invoice_total_price', 'invoice_date',
            ]);
        });
        Schema::dropIfExists('pharmacy_item_units');
        Schema::table('pharmacy_items', function (Blueprint $table) {
            $table->dropUnique(['barcode']);
            $table->dropColumn(['base_unit', 'dispense_unit', 'barcode', 'hosxp_synced_at']);
        });
    }
};
