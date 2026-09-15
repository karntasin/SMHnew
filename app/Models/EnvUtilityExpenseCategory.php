<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EnvUtilityExpenseCategory extends Model
{
    protected $fillable = [
        'code',
        'name',
        'is_sensitive',
        'sort_order',
        'has_invoice',
        'has_medical',
        'has_revenue',
        'has_admin',
        'has_line_items',
    ];

    protected $casts = [
        'is_sensitive' => 'boolean',
        'has_invoice' => 'boolean',
        'has_medical' => 'boolean',
        'has_revenue' => 'boolean',
        'has_admin' => 'boolean',
        'has_line_items' => 'boolean',
    ];

    public function entries(): HasMany
    {
        return $this->hasMany(EnvUtilityExpenseEntry::class, 'category_id');
    }
}
