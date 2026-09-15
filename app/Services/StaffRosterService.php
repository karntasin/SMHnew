<?php

namespace App\Services;

use App\Models\StaffRoster;
use App\Services\HosxpService;
use Illuminate\Support\Collection;
use Spatie\Permission\Models\Role;

class StaffRosterService
{
    public function normalizeName(?string $value): string
    {
        $value = trim((string) $value);

        return preg_replace('/\s+/u', ' ', $value) ?? '';
    }

    public function normalizePhone(?string $value): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $value) ?? '';

        return $digits !== '' ? $digits : null;
    }

    public function normalizePosition(?string $value): ?string
    {
        $normalized = $this->normalizeName($value);

        return $normalized !== '' ? $normalized : null;
    }

    public function findMatch(?string $firstName, ?string $lastName, ?string $cid): ?StaffRoster
    {
        $cid = HosxpService::normalizeCid((string) $cid);
        $firstName = $this->normalizeName($firstName);
        $lastName = $this->normalizeName($lastName);

        if ($cid !== '') {
            $byCid = StaffRoster::query()->active()->where('cid', $cid)->first();
            if ($byCid) {
                return $byCid;
            }
        }

        if ($firstName === '' || $lastName === '') {
            return null;
        }

        return StaffRoster::query()
            ->active()
            ->whereRaw('LOWER(TRIM(first_name)) = ?', [mb_strtolower($firstName)])
            ->whereRaw('LOWER(TRIM(last_name)) = ?', [mb_strtolower($lastName)])
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    public function toLookupPayload(StaffRoster $roster): array
    {
        return [
            'matched' => true,
            'prefix' => $this->normalizeName($roster->prefix) ?: null,
            'first_name' => $roster->first_name,
            'last_name' => $roster->last_name,
            'full_name' => $roster->fullName(),
            'position' => $this->normalizePosition($roster->position),
            'phone' => $roster->phone,
            'cid' => $roster->cid,
            'role_name' => $this->resolveRoleName($roster->role_name),
        ];
    }

    public function save(array $input, ?StaffRoster $roster = null): StaffRoster
    {
        $cid = HosxpService::normalizeCid((string) ($input['cid'] ?? ''));
        $cid = strlen($cid) === 13 ? $cid : null;

        $data = [
            'prefix' => $this->normalizeName($input['prefix'] ?? '') ?: null,
            'first_name' => $this->normalizeName($input['first_name'] ?? ''),
            'last_name' => $this->normalizeName($input['last_name'] ?? ''),
            'position' => $this->normalizePosition($input['position'] ?? ''),
            'phone' => $this->normalizePhone($input['phone'] ?? ''),
            'cid' => $cid,
            'role_name' => $this->resolveRoleName($input['role_name'] ?? 'user'),
            'is_active' => array_key_exists('is_active', $input)
                ? (bool) $input['is_active']
                : true,
        ];

        if ($roster) {
            $roster->update($data);

            return $roster->fresh();
        }

        return StaffRoster::query()->create($data);
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public function roleOptions(): array
    {
        $labels = [
            'user' => 'ผู้ใช้งานทั่วไป',
            'admin' => 'ผู้ดูแลระบบ',
            'superUser' => 'ผู้ดูแลระบบสูงสุด',
            'technician' => 'ช่างเทคนิค',
            'financeHead' => 'หัวหน้าการเงิน',
            'financeUser' => 'เจ้าหน้าที่การเงิน',
            'boss' => 'ผู้บริหาร',
        ];

        return Role::query()
            ->orderBy('name')
            ->pluck('name')
            ->map(fn ($name) => [
                'value' => (string) $name,
                'label' => $labels[(string) $name] ?? (string) $name,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<string>
     */
    public function positionOptions(): array
    {
        return StaffRoster::query()
            ->active()
            ->whereNotNull('position')
            ->where('position', '!=', '')
            ->orderBy('position')
            ->pluck('position')
            ->map(fn ($position) => $this->normalizePosition($position))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    public function assignRoleFromRoster($user, StaffRoster $roster): void
    {
        $user->syncRoles([$this->resolveRoleName($roster->role_name)]);
    }

    public function resolveRoleName(?string $rawRoleName): string
    {
        $normalized = trim((string) $rawRoleName);
        if ($normalized === '') {
            return 'user';
        }

        $canonicalRoles = Role::query()->pluck('name')->all();
        $roleMap = [];
        foreach ($canonicalRoles as $roleName) {
            $roleMap[mb_strtolower(trim((string) $roleName))] = (string) $roleName;
        }

        $thaiAliases = [
            'ผู้ใช้งาน' => 'user',
            'ผู้ใช้งานทั่วไป' => 'user',
            'ผู้ดูแลระบบ' => 'admin',
            'ผู้ดูแลระบบสูงสุด' => 'superUser',
            'หัวหน้าการเงิน' => 'financeHead',
            'เจ้าหน้าที่การเงิน' => 'financeUser',
            'ช่างเทคนิค' => 'technician',
            'ช่าง' => 'technician',
        ];

        $lookup = mb_strtolower($normalized);
        if (isset($roleMap[$lookup])) {
            return $roleMap[$lookup];
        }

        if (isset($thaiAliases[$normalized])) {
            $aliasTarget = $thaiAliases[$normalized];
            if (Role::query()->where('name', $aliasTarget)->exists()) {
                return $aliasTarget;
            }
        }

        return 'user';
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    public function importRows(array $rows, bool $replace = true): array
    {
        if ($replace) {
            StaffRoster::query()->delete();
        }

        $imported = 0;
        $skipped = 0;

        foreach ($rows as $row) {
            $firstName = $this->normalizeName($row['first_name'] ?? '');
            $lastName = $this->normalizeName($row['last_name'] ?? '');

            if ($firstName === '' && $lastName === '') {
                $skipped++;
                continue;
            }

            $cid = HosxpService::normalizeCid((string) ($row['cid'] ?? ''));
            $cid = strlen($cid) === 13 ? $cid : null;

            $payload = [
                'prefix' => $this->normalizeName($row['prefix'] ?? '') ?: null,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'position' => $this->normalizePosition($row['position'] ?? '') ?: null,
                'phone' => isset($row['phone']) ? (string) $row['phone'] : null,
                'cid' => $cid,
                'role_name' => trim((string) ($row['role_name'] ?? 'user')) ?: 'user',
                'is_active' => true,
            ];

            $existing = null;
            if (! $replace && $cid) {
                $existing = StaffRoster::query()->where('cid', $cid)->first();
            }
            if (! $replace && ! $existing && $firstName !== '' && $lastName !== '') {
                $existing = StaffRoster::query()
                    ->whereRaw('LOWER(TRIM(first_name)) = ?', [mb_strtolower($firstName)])
                    ->whereRaw('LOWER(TRIM(last_name)) = ?', [mb_strtolower($lastName)])
                    ->first();
            }

            if ($existing) {
                $existing->update($payload);
            } else {
                StaffRoster::query()->create($payload);
            }
            $imported++;
        }

        return compact('imported', 'skipped');
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function readExcelRows(string $path): array
    {
        if (! is_file($path)) {
            throw new \InvalidArgumentException("File not found: {$path}");
        }

        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($path);
        $sheet = $spreadsheet->getSheetByName('OLD') ?? $spreadsheet->getActiveSheet();

        $rows = [];
        $highestRow = $sheet->getHighestRow();

        for ($row = 2; $row <= $highestRow; $row++) {
            $firstName = $sheet->getCell("B{$row}")->getValue();
            $lastName = $sheet->getCell("C{$row}")->getValue();

            if ($firstName === null && $lastName === null) {
                continue;
            }

            $rows[] = [
                'prefix' => $sheet->getCell("A{$row}")->getValue(),
                'first_name' => $firstName,
                'last_name' => $lastName,
                'position' => $sheet->getCell("D{$row}")->getValue(),
                'phone' => $sheet->getCell("E{$row}")->getValue(),
                'cid' => $sheet->getCell("F{$row}")->getValue(),
                'role_name' => $sheet->getCell("G{$row}")->getValue(),
            ];
        }

        return $rows;
    }
}
