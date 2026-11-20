<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QualityDocumentTaxonomy extends Model
{
    use HasFactory;

    protected $table = 'quality_document_taxonomies';
    protected $connection = 'mysql';

    protected $fillable = [
        'type', // 'standard' or 'document_type'
        'code',
        'name',
        'description',
        'color',
        'sort_order',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeStandard($query)
    {
        return $query->where('type', 'standard');
    }

    public function scopeDocumentType($query)
    {
        return $query->where('type', 'document_type');
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order', 'asc')->orderBy('id', 'asc');
    }
}
