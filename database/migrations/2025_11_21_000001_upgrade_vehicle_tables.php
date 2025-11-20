<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // 1. Ensure vehicle_categories table exists
        if (!Schema::hasTable('vehicle_categories')) {
            Schema::create('vehicle_categories', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('icon')->nullable();
                $table->string('color')->nullable();
                $table->text('description')->nullable();
                $table->integer('order')->default(0);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // 2. Update vehicles table to match the Model
        if (Schema::hasTable('vehicles')) {
            Schema::table('vehicles', function (Blueprint $table) {
                // Rename columns if they exist and we want to standardize
                // Check if 'plate_number' exists and 'license_plate' does not
                if (Schema::hasColumn('vehicles', 'plate_number') && !Schema::hasColumn('vehicles', 'license_plate')) {
                    $table->renameColumn('plate_number', 'license_plate');
                }
                
                // Add missing columns
                if (!Schema::hasColumn('vehicles', 'category_id')) {
                    $table->foreignId('category_id')->nullable()->constrained('vehicle_categories')->nullOnDelete();
                }
                if (!Schema::hasColumn('vehicles', 'brand')) {
                    $table->string('brand')->nullable();
                }
                if (!Schema::hasColumn('vehicles', 'model')) {
                    $table->string('model')->nullable();
                }
                if (!Schema::hasColumn('vehicles', 'seats')) {
                    $table->integer('seats')->default(4);
                }
                if (!Schema::hasColumn('vehicles', 'is_active')) {
                    $table->boolean('is_active')->default(true);
                }
                
                // If 'name' exists but we use brand/model, we can keep it or drop it. 
                // Let's keep it for backward compatibility or make it nullable.
                if (Schema::hasColumn('vehicles', 'name')) {
                    $table->string('name')->nullable()->change();
                }
            });
        }
    }

    public function down()
    {
        // We generally don't reverse this kind of upgrade in this context
    }
};
