<?php

namespace App\Models\Im;

use Illuminate\Database\Eloquent\Model;

class BackupLog extends Model
{
    protected $table = 'im_backup_logs';

    protected $fillable = [
        'backup_date', 'type', 'scope', 'status', 'size_gb', 'notes', 'performed_by',
    ];

    protected $casts = [
        'backup_date' => 'date',
        'size_gb' => 'float',
    ];
}
