<?php

namespace App\Services;

use App\Models\QualityIndicator;
use App\Models\QualityIndicatorEntry;
use App\Models\QualityIndicatorFamily;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class QualityIndicatorFamilyService
{
    public const SHARED_FIELDS = [
        'name',
        'description',
        'category',
        'unit',
        'target_value',
        'target_operator',
        'frequency',
        'formula_description',
    ];

    public function ensureFamily(QualityIndicator $indicator): QualityIndicatorFamily
    {
        if ($indicator->family_id) {
            $family = $indicator->family;
            if ($family) {
                return $family;
            }
        }

        return DB::transaction(function () use ($indicator) {
            $indicator->refresh();
            if ($indicator->family_id && $indicator->family) {
                return $indicator->family;
            }

            $family = QualityIndicatorFamily::create([
                'key' => $this->familyKeyFor($indicator),
                'master_indicator_id' => $indicator->id,
            ]);

            $indicator->update(['family_id' => $family->id]);

            return $family->fresh();
        });
    }

    public function createStandalone(array $data): QualityIndicator
    {
        return DB::transaction(function () use ($data) {
            $indicator = QualityIndicator::create($this->sanitizeOwner($data));
            $this->ensureFamily($indicator);

            return $indicator->fresh(['family', 'department', 'team']);
        });
    }

    public function createAlias(QualityIndicator $source, array $data): QualityIndicator
    {
        $family = $this->ensureFamily($source);
        $master = $this->masterOf($source);

        $payload = $this->sanitizeOwner($data);
        $this->assertUniquePlacement($family, $payload, null);

        foreach (self::SHARED_FIELDS as $field) {
            $payload[$field] = $master->{$field};
        }
        $payload['family_id'] = $family->id;
        $payload['is_active'] = $payload['is_active'] ?? true;

        return QualityIndicator::create($payload);
    }

    public function updateSharedAndLocal(QualityIndicator $indicator, array $data): QualityIndicator
    {
        $family = $this->ensureFamily($indicator);
        $master = $this->masterOf($indicator);

        $shared = [];
        foreach (self::SHARED_FIELDS as $field) {
            if (array_key_exists($field, $data)) {
                $shared[$field] = $data[$field];
            }
        }

        $local = [];
        foreach (['code', 'is_active'] as $field) {
            if (array_key_exists($field, $data)) {
                $local[$field] = $data[$field];
            }
        }

        DB::transaction(function () use ($master, $indicator, $shared, $local, $family) {
            if ($shared !== []) {
                $master->update($shared);
                QualityIndicator::query()
                    ->where('family_id', $family->id)
                    ->where('id', '!=', $master->id)
                    ->update($shared);
            }

            if ($local !== []) {
                $indicator->update($local);
            }
        });

        return $indicator->fresh(['family.master', 'department', 'team']);
    }

    public function masterOf(QualityIndicator $indicator): QualityIndicator
    {
        $family = $this->ensureFamily($indicator);
        $master = $family->master;

        if ($master) {
            return $master;
        }

        $family->update(['master_indicator_id' => $indicator->id]);

        return $indicator;
    }

    public function isMaster(QualityIndicator $indicator): bool
    {
        $family = $indicator->family ?: $this->ensureFamily($indicator);

        return (int) $family->master_indicator_id === (int) $indicator->id;
    }

    public function promote(QualityIndicator $indicator): QualityIndicator
    {
        $family = $this->ensureFamily($indicator);
        $current = $family->master;

        if ($current && (int) $current->id === (int) $indicator->id) {
            return $indicator;
        }

        DB::transaction(function () use ($family, $current, $indicator) {
            if ($current && (int) $current->id !== (int) $indicator->id) {
                QualityIndicatorEntry::query()
                    ->where('quality_indicator_id', $current->id)
                    ->update(['quality_indicator_id' => $indicator->id]);

                foreach (self::SHARED_FIELDS as $field) {
                    $indicator->{$field} = $current->{$field};
                }
                $indicator->save();
            }

            $family->update(['master_indicator_id' => $indicator->id]);
        });

        return $indicator->fresh(['family.master', 'department', 'team']);
    }

    public function unlink(QualityIndicator $indicator): QualityIndicator
    {
        $family = $this->ensureFamily($indicator);

        if ($this->isMaster($indicator)) {
            throw ValidationException::withMessages([
                'indicator' => 'ตัวหลักไม่สามารถยกเลิกการเชื่อมได้ — ให้ตั้งรหัสอื่นเป็นตัวหลักก่อน หรือลบรหัสลูก',
            ]);
        }

        $master = $this->masterOf($indicator);

        return DB::transaction(function () use ($indicator, $master) {
            $newFamily = QualityIndicatorFamily::create([
                'key' => $this->uniqueFamilyKey($indicator),
                'master_indicator_id' => $indicator->id,
            ]);

            $indicator->update(['family_id' => $newFamily->id]);

            $copies = QualityIndicatorEntry::query()
                ->where('quality_indicator_id', $master->id)
                ->orderBy('period_date')
                ->get();

            foreach ($copies as $entry) {
                QualityIndicatorEntry::create([
                    'quality_indicator_id' => $indicator->id,
                    'period_date' => $entry->period_date,
                    'numerator' => $entry->numerator,
                    'denominator' => $entry->denominator,
                    'result_value' => $entry->result_value,
                    'notes' => $entry->notes,
                    'created_by' => $entry->created_by,
                ]);
            }

            return $indicator->fresh(['family.master', 'department', 'team']);
        });
    }

    public function deleteIndicator(QualityIndicator $indicator): void
    {
        $family = $indicator->family_id ? $indicator->family : null;

        DB::transaction(function () use ($indicator, $family) {
            if (! $family) {
                $indicator->delete();

                return;
            }

            $members = $family->indicators()->orderBy('id')->get();

            if ($members->count() <= 1) {
                $indicator->delete();
                $family->delete();

                return;
            }

            if ($this->isMaster($indicator)) {
                $next = $members->first(fn (QualityIndicator $item) => $item->id !== $indicator->id);
                if ($next) {
                    $this->promote($next);
                }
            }

            $indicator->delete();
        });
    }

    public function assertUniquePlacement(QualityIndicatorFamily $family, array $payload, ?int $ignoreId): void
    {
        $type = $payload['type'] ?? 'department';
        $query = QualityIndicator::query()->where('family_id', $family->id)->where('type', $type);

        if ($ignoreId) {
            $query->where('id', '!=', $ignoreId);
        }

        if ($type === 'organization') {
            if ($query->exists()) {
                throw ValidationException::withMessages([
                    'type' => 'กลุ่มนี้มีรหัสระดับองค์กรอยู่แล้ว',
                ]);
            }

            return;
        }

        if ($type === 'department') {
            $departmentId = $payload['department_id'] ?? null;
            if ($departmentId && $query->where('department_id', $departmentId)->exists()) {
                throw ValidationException::withMessages([
                    'department_id' => 'แผนกนี้มีรหัสลูกของตัวชี้วัดนี้อยู่แล้ว',
                ]);
            }

            return;
        }

        $teamId = $payload['team_id'] ?? null;
        if ($teamId && $query->where('team_id', $teamId)->exists()) {
            throw ValidationException::withMessages([
                'team_id' => 'ทีมนี้มีรหัสลูกของตัวชี้วัดนี้อยู่แล้ว',
            ]);
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function memberPayload(QualityIndicator $indicator): array
    {
        $family = $this->ensureFamily($indicator);
        $masterId = (int) $family->master_indicator_id;

        return $family->indicators()
            ->with(['department:id,name', 'team:id,abbreviation,name_th'])
            ->orderBy('type')
            ->orderBy('code')
            ->get()
            ->map(function (QualityIndicator $member) use ($masterId) {
                return [
                    'id' => $member->id,
                    'code' => $member->code,
                    'type' => $member->type,
                    'is_master' => (int) $member->id === $masterId,
                    'is_active' => (bool) $member->is_active,
                    'department' => $member->department ? [
                        'id' => $member->department->id,
                        'name' => $member->department->name,
                    ] : null,
                    'team' => $member->team ? [
                        'id' => $member->team->id,
                        'abbreviation' => $member->team->abbreviation,
                        'name_th' => $member->team->name_th,
                    ] : null,
                ];
            })
            ->values()
            ->all();
    }

    public function overlaySharedFields(QualityIndicator $indicator): QualityIndicator
    {
        $master = $this->masterOf($indicator);
        if ((int) $master->id !== (int) $indicator->id) {
            foreach (self::SHARED_FIELDS as $field) {
                $indicator->setAttribute($field, $master->{$field});
            }
        }

        $indicator->setAttribute('is_master', (int) $master->id === (int) $indicator->id);
        $indicator->setAttribute('master_id', $master->id);
        $indicator->setAttribute('master_code', $master->code);
        $indicator->setAttribute('family_key', $indicator->family?->key);

        return $indicator;
    }

    private function sanitizeOwner(array $data): array
    {
        $type = $data['type'] ?? 'department';
        $data['type'] = $type;
        $data['department_id'] = $type === 'department' ? ($data['department_id'] ?? null) : null;
        $data['team_id'] = $type === 'ha_team' ? ($data['team_id'] ?? null) : null;

        if (($data['code'] ?? '') === '') {
            $data['code'] = null;
        }

        return $data;
    }

    private function familyKeyFor(QualityIndicator $indicator): string
    {
        $code = trim((string) $indicator->code);

        return $code !== '' ? $code : 'QI-'.$indicator->id;
    }

    private function uniqueFamilyKey(QualityIndicator $indicator): string
    {
        $base = $this->familyKeyFor($indicator);
        $key = $base;
        $i = 2;
        while (QualityIndicatorFamily::query()->where('key', $key)->exists()) {
            $key = $base.'-'.$i;
            $i++;
        }

        return $key;
    }
}
