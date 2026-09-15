<?php

namespace App\Models;

use App\Data\QualityIndicatorGuideData;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QualityIndicatorGuide extends Model
{
    protected $fillable = [
        'slug',
        'title',
        'subtitle',
        'intro',
        'sections',
        'updated_by',
    ];

    protected $casts = [
        'sections' => 'array',
    ];

    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public static function current(): self
    {
        $guide = static::query()->where('slug', 'quality-indicators')->first();

        if ($guide) {
            return $guide;
        }

        $defaults = QualityIndicatorGuideData::defaults();

        return static::query()->create([
            'slug' => $defaults['slug'],
            'title' => $defaults['title'],
            'subtitle' => $defaults['subtitle'],
            'intro' => $defaults['intro'],
            'sections' => $defaults['sections'],
        ]);
    }

    public function resetToDefaults(?int $userId = null): self
    {
        $defaults = QualityIndicatorGuideData::defaults();

        $this->fill([
            'title' => $defaults['title'],
            'subtitle' => $defaults['subtitle'],
            'intro' => $defaults['intro'],
            'sections' => $defaults['sections'],
            'updated_by' => $userId,
        ])->save();

        return $this->fresh(['editor']);
    }

    public function toPageArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'intro' => $this->intro,
            'sections' => array_values($this->sections ?? []),
            'updated_at' => optional($this->updated_at)?->format('d/m/Y H:i'),
            'updated_by_name' => $this->editor?->name,
        ];
    }
}
