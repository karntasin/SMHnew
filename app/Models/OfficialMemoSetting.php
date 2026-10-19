<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OfficialMemoSetting extends Model
{
    public const HOSPITAL = 'โรงพยาบาลค่ายสุรสิงหนาท';

    protected $fillable = [
        'unit_name',
        'agency',
        'address',
        'phone',
        'fax',
        'email',
        'signer_name',
        'signer_position',
        'owner_unit',
    ];

    public static function current(): self
    {
        $existing = static::query()->first();
        if ($existing) {
            if ($existing->unit_name !== self::HOSPITAL || $existing->agency !== self::HOSPITAL) {
                $existing->unit_name = self::HOSPITAL;
                $existing->agency = self::HOSPITAL;
                $existing->save();
            }

            return $existing;
        }

        return static::query()->create([
            'unit_name' => self::HOSPITAL,
            'agency' => self::HOSPITAL,
            'owner_unit' => self::HOSPITAL,
        ]);
    }
}
