<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pharmacy_locations', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('name');
            $table->string('type', 20); // warehouse | pharmacy
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('pharmacy_items', function (Blueprint $table) {
            $table->id();
            $table->string('icode', 20)->unique();
            $table->string('name');
            $table->string('strength')->nullable();
            $table->string('unit')->nullable();
            $table->string('drug_group')->nullable();
            $table->boolean('is_active')->default(true);
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('pharmacy_stock_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('location_id')->constrained('pharmacy_locations')->cascadeOnDelete();
            $table->foreignId('item_id')->constrained('pharmacy_items')->cascadeOnDelete();
            $table->decimal('qty_on_hand', 14, 2)->default(0);
            $table->decimal('qty_reserved', 14, 2)->default(0);
            $table->decimal('reorder_level', 14, 2)->default(0);
            $table->decimal('min_level', 14, 2)->default(0);
            $table->timestamps();

            $table->unique(['location_id', 'item_id']);
        });

        Schema::create('pharmacy_lots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('pharmacy_items')->cascadeOnDelete();
            $table->foreignId('location_id')->constrained('pharmacy_locations')->cascadeOnDelete();
            $table->string('lot_no', 80);
            $table->date('received_at');
            $table->date('expires_at')->nullable();
            $table->decimal('qty_received', 14, 2)->default(0);
            $table->decimal('qty_remaining', 14, 2)->default(0);
            $table->string('supplier')->nullable();
            $table->string('invoice_no')->nullable();
            $table->string('qr_token', 64)->unique();
            $table->string('status', 20)->default('active'); // active | depleted | expired | quarantined
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['item_id', 'location_id', 'expires_at']);
            $table->index(['lot_no', 'item_id']);
        });

        Schema::create('pharmacy_stock_movements', function (Blueprint $table) {
            $table->id();
            $table->string('type', 30); // receive | transfer_out | transfer_in | dispense | adjust | return | expire
            $table->foreignId('item_id')->constrained('pharmacy_items')->cascadeOnDelete();
            $table->foreignId('lot_id')->nullable()->constrained('pharmacy_lots')->nullOnDelete();
            $table->foreignId('from_location_id')->nullable()->constrained('pharmacy_locations')->nullOnDelete();
            $table->foreignId('to_location_id')->nullable()->constrained('pharmacy_locations')->nullOnDelete();
            $table->decimal('qty', 14, 2);
            $table->decimal('balance_after', 14, 2)->nullable();
            $table->string('reference_type')->nullable(); // hosxp_opitemrece | manual | transfer
            $table->string('reference_id')->nullable();
            $table->string('hn', 20)->nullable();
            $table->string('vn', 20)->nullable();
            $table->date('vstdate')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['type', 'created_at']);
            $table->index(['reference_type', 'reference_id']);
            $table->index(['hn', 'vn', 'vstdate']);
        });

        Schema::create('pharmacy_dispense_syncs', function (Blueprint $table) {
            $table->id();
            $table->string('hosxp_key', 120)->unique(); // hn|vn|icode|vstdate|qty hash
            $table->string('hn', 20)->nullable();
            $table->string('vn', 20)->nullable();
            $table->string('icode', 20);
            $table->date('vstdate')->nullable();
            $table->decimal('qty', 14, 2);
            $table->string('status', 20)->default('deducted'); // deducted | skipped | insufficient
            $table->foreignId('movement_id')->nullable()->constrained('pharmacy_stock_movements')->nullOnDelete();
            $table->text('message')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pharmacy_dispense_syncs');
        Schema::dropIfExists('pharmacy_stock_movements');
        Schema::dropIfExists('pharmacy_lots');
        Schema::dropIfExists('pharmacy_stock_balances');
        Schema::dropIfExists('pharmacy_items');
        Schema::dropIfExists('pharmacy_locations');
    }
};
