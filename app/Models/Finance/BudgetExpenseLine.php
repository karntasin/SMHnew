<?php

namespace App\Models\Finance;

use Illuminate\Database\Eloquent\Model;

class BudgetExpenseLine extends Model
{
    protected $table = 'finance_budget_expense_lines';

    protected $fillable = [
        'fiscal_year',
        'line_key',
        'sort_order',
        'name',
        'amount',
        'kind',
        'source',
    ];

    protected $casts = [
        'fiscal_year' => 'integer',
        'sort_order' => 'integer',
        'amount' => 'float',
    ];
}
