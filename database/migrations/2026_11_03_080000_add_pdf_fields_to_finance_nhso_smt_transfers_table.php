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
        Schema::table('finance_nhso_smt_transfers', function (Blueprint $table) {
            $table->string('pdf_path', 500)->nullable()->after('raw_data');
            $table->string('pdf_filename', 255)->nullable()->after('pdf_path');
            $table->timestamp('pdf_downloaded_at')->nullable()->after('pdf_filename');

            $table->index(['batch_no', 'posting_date'], 'idx_smt_batch_posting');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('finance_nhso_smt_transfers', function (Blueprint $table) {
            $table->dropIndex('idx_smt_batch_posting');
            $table->dropColumn(['pdf_path', 'pdf_filename', 'pdf_downloaded_at']);
        });
    }
};
