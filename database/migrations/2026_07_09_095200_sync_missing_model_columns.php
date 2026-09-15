<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('vehicle_categories')) {
            Schema::table('vehicle_categories', function (Blueprint $table) {
                if (! Schema::hasColumn('vehicle_categories', 'icon')) {
                    $table->string('icon')->nullable();
                }
                if (! Schema::hasColumn('vehicle_categories', 'color')) {
                    $table->string('color')->nullable();
                }
                if (! Schema::hasColumn('vehicle_categories', 'order')) {
                    $table->integer('order')->default(0);
                }
            });
        }

        if (Schema::hasTable('vehicles')) {
            Schema::table('vehicles', function (Blueprint $table) {
                if (! Schema::hasColumn('vehicles', 'year')) {
                    $table->unsignedSmallInteger('year')->nullable();
                }
                if (! Schema::hasColumn('vehicles', 'fuel_type')) {
                    $table->string('fuel_type')->nullable();
                }
                if (! Schema::hasColumn('vehicles', 'vehicle_type')) {
                    $table->string('vehicle_type')->nullable();
                }
                if (! Schema::hasColumn('vehicles', 'description')) {
                    $table->text('description')->nullable();
                }
                if (! Schema::hasColumn('vehicles', 'mileage')) {
                    $table->unsignedInteger('mileage')->nullable();
                }
                if (! Schema::hasColumn('vehicles', 'chassis_number')) {
                    $table->string('chassis_number')->nullable();
                }
                if (! Schema::hasColumn('vehicles', 'engine_number')) {
                    $table->string('engine_number')->nullable();
                }
                if (! Schema::hasColumn('vehicles', 'registration_date')) {
                    $table->date('registration_date')->nullable();
                }
                if (! Schema::hasColumn('vehicles', 'insurance_expiry')) {
                    $table->date('insurance_expiry')->nullable();
                }
                if (! Schema::hasColumn('vehicles', 'tax_expiry')) {
                    $table->date('tax_expiry')->nullable();
                }
                if (! Schema::hasColumn('vehicles', 'last_maintenance_date')) {
                    $table->date('last_maintenance_date')->nullable();
                }
                if (! Schema::hasColumn('vehicles', 'next_maintenance_date')) {
                    $table->date('next_maintenance_date')->nullable();
                }
                if (! Schema::hasColumn('vehicles', 'images')) {
                    $table->json('images')->nullable();
                }
            });
        }

        if (Schema::hasTable('maintenance_categories')) {
            Schema::table('maintenance_categories', function (Blueprint $table) {
                if (! Schema::hasColumn('maintenance_categories', 'icon')) {
                    $table->string('icon')->nullable();
                }
                if (! Schema::hasColumn('maintenance_categories', 'color')) {
                    $table->string('color')->nullable();
                }
                if (! Schema::hasColumn('maintenance_categories', 'order')) {
                    $table->integer('order')->default(0);
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('vehicle_categories')) {
            Schema::table('vehicle_categories', function (Blueprint $table) {
                foreach (['icon', 'color', 'order'] as $column) {
                    if (Schema::hasColumn('vehicle_categories', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        if (Schema::hasTable('vehicles')) {
            Schema::table('vehicles', function (Blueprint $table) {
                $columns = [
                    'year', 'fuel_type', 'vehicle_type', 'description', 'mileage',
                    'chassis_number', 'engine_number', 'registration_date',
                    'insurance_expiry', 'tax_expiry', 'last_maintenance_date',
                    'next_maintenance_date', 'images',
                ];

                foreach ($columns as $column) {
                    if (Schema::hasColumn('vehicles', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        if (Schema::hasTable('maintenance_categories')) {
            Schema::table('maintenance_categories', function (Blueprint $table) {
                foreach (['icon', 'color', 'order'] as $column) {
                    if (Schema::hasColumn('maintenance_categories', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};
