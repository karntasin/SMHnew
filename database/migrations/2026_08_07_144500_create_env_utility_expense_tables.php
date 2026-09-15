<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('env_utility_expense_categories', function (Blueprint $table) {
            $table->id();
            $table->string('code', 64)->unique();
            $table->string('name');
            $table->boolean('is_sensitive')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('has_invoice')->default(false);
            $table->boolean('has_medical')->default(false);
            $table->boolean('has_revenue')->default(true);
            $table->boolean('has_admin')->default(false);
            $table->boolean('has_line_items')->default(false);
            $table->timestamps();
        });

        Schema::create('env_utility_expense_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('env_utility_expense_categories')->cascadeOnDelete();
            $table->unsignedSmallInteger('fiscal_year_be');
            $table->unsignedSmallInteger('year_be');
            $table->unsignedTinyInteger('month');
            $table->decimal('invoice_amount', 15, 2)->nullable();
            $table->decimal('budget_medical', 15, 2)->nullable();
            $table->decimal('budget_revenue', 15, 2)->nullable();
            $table->decimal('budget_admin', 15, 2)->nullable();
            $table->decimal('amount', 15, 2)->nullable();
            $table->string('line_label', 191)->nullable();
            $table->text('note')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(
                ['category_id', 'year_be', 'month', 'line_label'],
                'env_utility_entry_unique'
            );
            $table->index(['fiscal_year_be', 'category_id']);
        });

        Schema::create('env_utility_ac_meters', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('env_utility_ac_readings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meter_id')->constrained('env_utility_ac_meters')->cascadeOnDelete();
            $table->unsignedSmallInteger('year_be');
            $table->unsignedTinyInteger('month');
            $table->unsignedSmallInteger('fiscal_year_be');
            $table->decimal('prev_reading', 12, 2)->nullable();
            $table->decimal('curr_reading', 12, 2)->nullable();
            $table->decimal('units', 12, 2)->nullable();
            $table->decimal('rate', 10, 4)->nullable();
            $table->decimal('cost', 15, 2)->nullable();
            $table->text('note')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['meter_id', 'year_be', 'month'], 'env_utility_ac_reading_unique');
            $table->index(['fiscal_year_be', 'year_be', 'month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('env_utility_ac_readings');
        Schema::dropIfExists('env_utility_ac_meters');
        Schema::dropIfExists('env_utility_expense_entries');
        Schema::dropIfExists('env_utility_expense_categories');
    }
};
