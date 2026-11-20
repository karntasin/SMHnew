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
        if (! Schema::connection('mysql')->hasTable('amed_stat_reports')) {
            Schema::connection('mysql')->create('amed_stat_reports', function (Blueprint $table) {
                $table->id();
                $table->string('form_id', 30)->index();
                $table->string('report_code', 50)->index();
                $table->string('report_title', 255);
                $table->integer('year_be')->index();
                $table->integer('month')->index();
                $table->longText('data_json')->nullable();
                $table->string('status', 30)->default('draft');
                $table->unsignedBigInteger('updated_by')->nullable();
                $table->timestamps();

                $table->unique(['form_id', 'year_be', 'month'], 'amed_stat_unique_report');
            });
        }

        if (! Schema::connection('mysql')->hasTable('amed_support_units')) {
            Schema::connection('mysql')->create('amed_support_units', function (Blueprint $table) {
                $table->id();
                $table->string('unit_code', 50)->nullable();
                $table->string('unit_name', 255);
                $table->string('location', 255)->nullable();
                $table->integer('g1')->default(0)->comment('ก1 นายทหารประจำการ');
                $table->integer('g2')->default(0)->comment('ก2 นายสิบ/พลอาสา');
                $table->integer('g3')->default(0)->comment('ก3 ขรก.กลาโหม');
                $table->integer('g4')->default(0)->comment('ก4 ลูกจ้างประจำ');
                $table->integer('g5')->default(0)->comment('ก5 ลูกจ้างชั่วคราว');
                $table->integer('k1')->default(0)->comment('ข1 พลทหารกองประจำการ');
                $table->integer('k2')->default(0)->comment('ข2 นักเรียนทหาร');
                $table->integer('k3')->default(0)->comment('ข3 อส.ทพ.');
                $table->integer('k4')->default(0)->comment('ข4 นักโทษทหาร');
                $table->integer('k5')->default(0)->comment('ข5 พนักงานราชการ');
                $table->integer('c1')->default(0)->comment('ค1 ครอบครัวทหาร');
                $table->integer('c3')->default(0)->comment('ค3 นศท. รด.');
                $table->integer('c4')->default(0)->comment('ค4 วิวัฒน์พลเมือง');
                $table->integer('total')->default(0);
                $table->integer('sort_order')->default(0);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('amed_support_units');
        Schema::connection('mysql')->dropIfExists('amed_stat_reports');
    }
};
