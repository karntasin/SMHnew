<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SarRevision extends Model
{
    public $timestamps = false;
    protected $connection = 'mysql';
    protected $table = 'sar_revisions';

    protected $fillable = [
        'sar_section_id',
        'version_number',
        'change_summary',
        'snapshot_data',
        'created_by',
        'created_at',
    ];

    protected $casts = [
        'snapshot_data' => 'array',
        'version_number' => 'integer',
        'created_at' => 'datetime',
    ];

    public function section(): BelongsTo
    {
        return $this->belongsTo(SarSection::class, 'sar_section_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
