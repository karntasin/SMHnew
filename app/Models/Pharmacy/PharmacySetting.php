<?php

namespace App\Models\Pharmacy;

use Illuminate\Database\Eloquent\Model;

class PharmacySetting extends Model
{
    protected $fillable = ['key', 'value', 'type', 'label', 'group', 'description'];

    public static function valueOf(string $key, mixed $default = null): mixed
    {
        $setting = static::query()->where('key', $key)->first();
        if (! $setting) {
            return $default;
        }

        return match ($setting->type) {
            'integer' => (int) $setting->value, 'decimal' => (float) $setting->value, 'boolean' => filter_var($setting->value, FILTER_VALIDATE_BOOLEAN), 'json' => json_decode((string) $setting->value, true), default => $setting->value
        };
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        return static::valueOf($key, $default);
    }
}
