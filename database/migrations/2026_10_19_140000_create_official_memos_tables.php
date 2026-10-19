<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('official_memo_settings', function (Blueprint $table) {
            $table->id();
            $table->string('unit_name');
            $table->string('agency')->nullable();
            $table->text('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('fax')->nullable();
            $table->string('email')->nullable();
            $table->string('signer_name')->nullable();
            $table->string('signer_position')->nullable();
            $table->string('owner_unit')->nullable();
            $table->timestamps();
        });

        Schema::create('official_memos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 20);
            $table->string('subject', 500)->nullable();
            $table->string('document_no', 120)->nullable();
            $table->date('document_date')->nullable();
            $table->boolean('thai_digits')->default(false);
            $table->json('sections');
            $table->timestamps();

            $table->index(['user_id', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('official_memos');
        Schema::dropIfExists('official_memo_settings');
    }
};
