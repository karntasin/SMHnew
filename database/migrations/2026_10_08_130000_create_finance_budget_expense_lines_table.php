<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finance_budget_expense_lines', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('fiscal_year');
            $table->string('line_key', 40);
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->string('name');
            $table->decimal('amount', 18, 2)->default(0);
            $table->string('kind', 20);
            $table->string('source', 20)->default('manual');
            $table->timestamps();

            $table->unique(['fiscal_year', 'line_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_budget_expense_lines');
    }
};
