<?php

namespace App\Models\Ic;

use Illuminate\Database\Eloquent\Model;

class IcSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'type',
        'group',
        'description',
    ];

    // Get typed value
    public function getTypedValue()
    {
        return match($this->type) {
            'integer' => (int) $this->value,
            'decimal', 'float' => (float) $this->value,
            'boolean' => filter_var($this->value, FILTER_VALIDATE_BOOLEAN),
            'json' => json_decode($this->value, true),
            default => $this->value,
        };
    }

    // Static helper to get setting
    public static function getValue(string $key, $default = null)
    {
        $setting = static::where('key', $key)->first();
        return $setting ? $setting->getTypedValue() : $default;
    }

    // Static helper to set setting
    public static function setValue(string $key, $value, ?string $type = null)
    {
        $setting = static::firstOrNew(['key' => $key]);
        $setting->value = is_array($value) ? json_encode($value) : (string) $value;
        if ($type) {
            $setting->type = $type;
        }
        $setting->save();
        return $setting;
    }
}
