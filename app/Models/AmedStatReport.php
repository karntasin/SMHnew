<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AmedStatReport extends Model
{
    use HasFactory;

    protected $connection = 'mysql';

    protected $table = 'amed_stat_reports';

    protected $fillable = [
        'form_id',
        'report_code',
        'report_title',
        'year_be',
        'month',
        'start_date',
        'end_date',
        'data_json',
        'status',
        'updated_by',
    ];

    protected $casts = [
        'year_be' => 'integer',
        'month' => 'integer',
        'start_date' => 'date',
        'end_date' => 'date',
        'data_json' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
