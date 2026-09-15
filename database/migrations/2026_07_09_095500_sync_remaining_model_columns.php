<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('vehicle_bookings')) {
            Schema::table('vehicle_bookings', function (Blueprint $table) {
                if (! Schema::hasColumn('vehicle_bookings', 'actual_start_datetime')) {
                    $table->dateTime('actual_start_datetime')->nullable();
                }
                if (! Schema::hasColumn('vehicle_bookings', 'actual_end_datetime')) {
                    $table->dateTime('actual_end_datetime')->nullable();
                }
                if (! Schema::hasColumn('vehicle_bookings', 'start_mileage')) {
                    $table->unsignedInteger('start_mileage')->nullable();
                }
                if (! Schema::hasColumn('vehicle_bookings', 'end_mileage')) {
                    $table->unsignedInteger('end_mileage')->nullable();
                }
                if (! Schema::hasColumn('vehicle_bookings', 'distance_km')) {
                    $table->unsignedInteger('distance_km')->nullable();
                }
                if (! Schema::hasColumn('vehicle_bookings', 'fuel_cost')) {
                    $table->decimal('fuel_cost', 10, 2)->nullable();
                }
                if (! Schema::hasColumn('vehicle_bookings', 'trip_report')) {
                    $table->text('trip_report')->nullable();
                }
                if (! Schema::hasColumn('vehicle_bookings', 'approved_at')) {
                    $table->timestamp('approved_at')->nullable();
                }
                if (! Schema::hasColumn('vehicle_bookings', 'rejected_at')) {
                    $table->timestamp('rejected_at')->nullable();
                }
                if (! Schema::hasColumn('vehicle_bookings', 'cancelled_at')) {
                    $table->timestamp('cancelled_at')->nullable();
                }
                if (! Schema::hasColumn('vehicle_bookings', 'completed_at')) {
                    $table->timestamp('completed_at')->nullable();
                }
            });
        }

        if (Schema::hasTable('maintenance_request_images')) {
            Schema::table('maintenance_request_images', function (Blueprint $table) {
                if (! Schema::hasColumn('maintenance_request_images', 'image_path')) {
                    $table->string('image_path')->nullable();
                }
                if (! Schema::hasColumn('maintenance_request_images', 'image_type')) {
                    $table->string('image_type')->nullable();
                }
                if (! Schema::hasColumn('maintenance_request_images', 'caption')) {
                    $table->text('caption')->nullable();
                }
                if (! Schema::hasColumn('maintenance_request_images', 'order')) {
                    $table->unsignedInteger('order')->default(0);
                }
            });

            if (Schema::hasColumn('maintenance_request_images', 'path')
                && Schema::hasColumn('maintenance_request_images', 'image_path')) {
                DB::table('maintenance_request_images')
                    ->whereNull('image_path')
                    ->whereNotNull('path')
                    ->update(['image_path' => DB::raw('`path`')]);
            }
        }

        if (Schema::hasTable('maintenance_request_timeline')) {
            Schema::table('maintenance_request_timeline', function (Blueprint $table) {
                if (! Schema::hasColumn('maintenance_request_timeline', 'user_id')) {
                    $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                }
                if (! Schema::hasColumn('maintenance_request_timeline', 'action')) {
                    $table->string('action')->nullable();
                }
                if (! Schema::hasColumn('maintenance_request_timeline', 'description')) {
                    $table->text('description')->nullable();
                }
                if (! Schema::hasColumn('maintenance_request_timeline', 'old_values')) {
                    $table->json('old_values')->nullable();
                }
                if (! Schema::hasColumn('maintenance_request_timeline', 'new_values')) {
                    $table->json('new_values')->nullable();
                }
            });

            if (Schema::hasColumn('maintenance_request_timeline', 'created_by')
                && Schema::hasColumn('maintenance_request_timeline', 'user_id')) {
                DB::table('maintenance_request_timeline')
                    ->whereNull('user_id')
                    ->whereNotNull('created_by')
                    ->update(['user_id' => DB::raw('`created_by`')]);
            }

            if (Schema::hasColumn('maintenance_request_timeline', 'status')
                && Schema::hasColumn('maintenance_request_timeline', 'action')) {
                DB::table('maintenance_request_timeline')
                    ->whereNull('action')
                    ->whereNotNull('status')
                    ->update(['action' => DB::raw('`status`')]);
            }

            if (Schema::hasColumn('maintenance_request_timeline', 'note')
                && Schema::hasColumn('maintenance_request_timeline', 'description')) {
                DB::table('maintenance_request_timeline')
                    ->whereNull('description')
                    ->whereNotNull('note')
                    ->update(['description' => DB::raw('`note`')]);
            }
        }

        if (Schema::hasTable('maintenance_priorities')) {
            Schema::table('maintenance_priorities', function (Blueprint $table) {
                if (! Schema::hasColumn('maintenance_priorities', 'sla_hours')) {
                    $table->integer('sla_hours')->nullable();
                }
                if (! Schema::hasColumn('maintenance_priorities', 'description')) {
                    $table->text('description')->nullable();
                }
            });

            if (Schema::hasColumn('maintenance_priorities', 'response_time_hours')
                && Schema::hasColumn('maintenance_priorities', 'sla_hours')) {
                DB::table('maintenance_priorities')
                    ->whereNull('sla_hours')
                    ->whereNotNull('response_time_hours')
                    ->update(['sla_hours' => DB::raw('`response_time_hours`')]);
            }
        }

        if (Schema::hasTable('departments')) {
            Schema::table('departments', function (Blueprint $table) {
                if (! Schema::hasColumn('departments', 'code')) {
                    $table->string('code')->nullable();
                }
                if (! Schema::hasColumn('departments', 'is_active')) {
                    $table->boolean('is_active')->default(true);
                }
            });
        }

        if (Schema::hasTable('ic_outbreak_cases')) {
            Schema::table('ic_outbreak_cases', function (Blueprint $table) {
                if (! Schema::hasColumn('ic_outbreak_cases', 'is_index_case')) {
                    $table->boolean('is_index_case')->default(false);
                }
            });
        }

        if (Schema::hasTable('ic_education_records')) {
            Schema::table('ic_education_records', function (Blueprint $table) {
                if (! Schema::hasColumn('ic_education_records', 'duration_hours')) {
                    $table->decimal('duration_hours', 5, 2)->nullable();
                }
                if (! Schema::hasColumn('ic_education_records', 'location')) {
                    $table->string('location')->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        // Intentionally left minimal; prior upgrade migrations are not fully reversible.
    }
};
