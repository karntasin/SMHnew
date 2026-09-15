<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('env_asset_lines', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('name');
            $table->string('short_name', 64)->nullable();
            $table->string('source_filename')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('env_assets', function (Blueprint $table) {
            $table->foreignId('line_id')->nullable()->after('id')->constrained('env_asset_lines')->nullOnDelete();
            $table->string('registry_status', 32)->default('normal')->after('line_id')->index();
            $table->string('sheet_name', 64)->nullable()->after('registry_status');
            $table->string('item_type', 64)->nullable()->after('sheet_name');
            $table->string('stock_number', 128)->nullable()->after('item_type')->index();
            $table->string('condition_code', 64)->nullable()->after('stock_number');
            $table->string('brand', 191)->nullable()->after('condition_code');
            $table->string('company', 191)->nullable()->after('brand');
            $table->string('fiscal_year', 32)->nullable()->after('company');
            $table->string('budget_type', 191)->nullable()->after('fiscal_year');
            $table->string('control_number', 128)->nullable()->after('budget_type');
            $table->text('reference_doc')->nullable()->after('control_number');
            $table->string('delivery_date', 128)->nullable()->after('reference_doc');
            $table->string('fan_coil', 128)->nullable()->after('delivery_date');
            $table->string('condensing_unit', 128)->nullable()->after('fan_coil');
            $table->text('issue_location')->nullable()->after('condensing_unit');
            $table->text('status_note')->nullable()->after('issue_location');
            $table->string('image_ref', 191)->nullable()->after('status_note');
            $table->text('inspection_doc')->nullable()->after('image_ref');
            $table->string('repair_slip_no', 191)->nullable()->after('inspection_doc');
            $table->string('repair_job_no', 191)->nullable()->after('repair_slip_no');
            $table->text('disposal_doc')->nullable()->after('repair_job_no');
            $table->text('writeoff_doc')->nullable()->after('disposal_doc');
            $table->text('scrap_return_doc')->nullable()->after('writeoff_doc');
            $table->string('source_file', 255)->nullable()->after('scrap_return_doc');
            $table->unsignedInteger('source_row')->nullable()->after('source_file');
            $table->string('import_key', 191)->nullable()->after('source_row')->index();
            $table->json('raw_attributes')->nullable()->after('import_key');
        });

        // รองรับราคาสายแพทย์ที่เกิน decimal(10,2)
        DB::statement('ALTER TABLE env_assets MODIFY price DECIMAL(15,2) NULL');
    }

    public function down(): void
    {
        Schema::table('env_assets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('line_id');
            $table->dropColumn([
                'registry_status',
                'sheet_name',
                'item_type',
                'stock_number',
                'condition_code',
                'brand',
                'company',
                'fiscal_year',
                'budget_type',
                'control_number',
                'reference_doc',
                'delivery_date',
                'fan_coil',
                'condensing_unit',
                'issue_location',
                'status_note',
                'image_ref',
                'inspection_doc',
                'repair_slip_no',
                'repair_job_no',
                'disposal_doc',
                'writeoff_doc',
                'scrap_return_doc',
                'source_file',
                'source_row',
                'import_key',
                'raw_attributes',
            ]);
        });

        Schema::dropIfExists('env_asset_lines');
    }
};
