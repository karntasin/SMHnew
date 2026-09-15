<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('im_assets', function (Blueprint $table) {
            if (! Schema::hasColumn('im_assets', 'brand')) {
                $table->string('brand')->nullable()->after('name');
            }
            if (! Schema::hasColumn('im_assets', 'device_type')) {
                $table->string('device_type', 64)->nullable()->after('type');
            }
            if (! Schema::hasColumn('im_assets', 'cpu')) {
                $table->string('cpu')->nullable()->after('spec');
            }
            if (! Schema::hasColumn('im_assets', 'os')) {
                $table->string('os')->nullable()->after('cpu');
            }
            if (! Schema::hasColumn('im_assets', 'mac_address')) {
                $table->string('mac_address', 64)->nullable()->after('os');
            }
            if (! Schema::hasColumn('im_assets', 'assigned_user')) {
                $table->string('assigned_user')->nullable()->after('location');
            }
            if (! Schema::hasColumn('im_assets', 'department')) {
                $table->string('department')->nullable()->after('assigned_user');
            }
        });

        DB::table('im_assets')->where('status', 'retired')->update(['status' => 'disposed']);

        if (! Schema::hasTable('im_asset_repairs')) {
            Schema::create('im_asset_repairs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('asset_id')->constrained('im_assets')->cascadeOnDelete();
                $table->string('repair_no', 48)->index();
                $table->date('reported_at');
                $table->text('symptom');
                $table->string('vendor')->nullable();
                $table->decimal('cost', 12, 2)->nullable();
                $table->date('returned_at')->nullable();
                $table->text('result')->nullable();
                $table->string('reported_by')->nullable();
                $table->string('handled_by')->nullable();
                $table->string('status', 16)->default('open')->index();
                $table->text('note')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('im_asset_disposals')) {
            Schema::create('im_asset_disposals', function (Blueprint $table) {
                $table->id();
                $table->foreignId('asset_id')->constrained('im_assets')->cascadeOnDelete();
                $table->string('disposal_no', 48)->index();
                $table->date('disposed_at');
                $table->string('method', 32)->default('other');
                $table->text('reason');
                $table->string('document_ref')->nullable();
                $table->string('approved_by')->nullable();
                $table->text('note')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('im_asset_disposals');
        Schema::dropIfExists('im_asset_repairs');

        Schema::table('im_assets', function (Blueprint $table) {
            foreach (['brand', 'device_type', 'cpu', 'os', 'mac_address', 'assigned_user', 'department'] as $col) {
                if (Schema::hasColumn('im_assets', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        DB::table('im_assets')->where('status', 'disposed')->update(['status' => 'retired']);
    }
};
