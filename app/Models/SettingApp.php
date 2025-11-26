<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SettingApp extends Model
{
    protected $table = 'settingapp';

    protected $fillable = [
        'nama_app',
        'deskripsi',
        'logo',
        'favicon',
        'warna',
        'seo',
        'backup_path',
        'backup_hosxp',
    ];

    protected $casts = [
        'seo' => 'array',
        'backup_hosxp' => 'boolean',
    ];
}
