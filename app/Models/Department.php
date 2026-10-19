<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Department extends Model
{
    protected $fillable = [
        'name',
        'code',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function receivedDocuments()
    {
        return $this->hasMany(DocumentAction::class, 'receiver_department_id');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'department_user')
            ->withPivot('is_primary')
            ->withTimestamps();
    }

    public function leaders(): HasMany
    {
        return $this->hasMany(DepartmentLeader::class)
            ->orderByRaw("FIELD(role, 'head', 'assistant')")
            ->orderBy('sort_order');
    }
}
