<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StaffRoster extends Model
{
    protected $fillable = [
        'prefix',
        'first_name',
        'last_name',
        'position',
        'phone',
        'cid',
        'role_name',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function fullName(): string
    {
        return trim(collect([$this->prefix, $this->first_name, $this->last_name])->filter()->implode(' '));
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
