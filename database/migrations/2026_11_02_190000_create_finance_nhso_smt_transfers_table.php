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
        Schema::create('finance_nhso_smt_transfers', function (Blueprint $table) {
            $table->id();
            $table->string('budget_source', 20)->index(); // LGO, UC, CKD, DSS, COVID, OTHER
            $table->boolean('is_ckd')->default(false)->index(); // กองทุนไตวายเรื้อรัง แยกต่างหาก
            $table->string('budget_year', 10)->index(); // เช่น 2570, 2569
            $table->string('batch_no', 50)->index(); // เช่น 3713, 3706A
            $table->string('posting_date', 20)->index(); // เช่น 25691014
            $table->date('transfer_date')->nullable()->index(); // วันที่โอนจริง (Y-m-d)
            $table->string('ref_doc_no', 100)->nullable()->index(); // เลขที่ Statement / งวดอ้างอิง
            $table->string('hcode', 10)->default('14689')->index();
            $table->string('vendor_no', 30)->nullable();
            $table->string('fund_name', 255)->nullable()->index();
            $table->string('fund_group_descr', 255)->nullable();
            $table->string('fund_descr', 255)->nullable();
            $table->string('mou_grp_code', 50)->nullable();
            $table->string('bank_name', 150)->nullable();
            $table->string('bank_account_no', 50)->nullable();
            $table->string('pmnt_stts', 20)->nullable(); // P = Paid
            $table->decimal('amount', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->string('moph_id', 100)->nullable(); // รหัสผังบัญชี สป.สธ.
            $table->string('moph_desc', 255)->nullable(); // ชื่อผังบัญชี สป.สธ.
            $table->json('raw_data')->nullable();
            $table->unsignedBigInteger('synced_by')->nullable();
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();

            $table->unique(['batch_no', 'posting_date', 'ref_doc_no', 'fund_name'], 'smt_transfer_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('finance_nhso_smt_transfers');
    }
};
