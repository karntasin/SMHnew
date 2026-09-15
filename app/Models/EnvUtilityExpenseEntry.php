<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvUtilityExpenseEntry extends Model
{
    protected $fillable = [
        'category_id',
        'fiscal_year_be',
        'year_be',
        'month',
        'invoice_amount',
        'budget_medical',
        'budget_revenue',
        'budget_admin',
        'amount',
        'line_label',
        'note',
        'recorded_by',
    ];

    protected $casts = [
        'invoice_amount' => 'float',
        'budget_medical' => 'float',
        'budget_revenue' => 'float',
        'budget_admin' => 'float',
        'amount' => 'float',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(EnvUtilityExpenseCategory::class, 'category_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function totalAmount(): float
    {
        if ($this->amount !== null) {
            return (float) $this->amount;
        }

        return (float) ($this->invoice_amount
            ?? $this->budget_revenue
            ?? $this->budget_medical
            ?? $this->budget_admin
            ?? 0);
    }
}
