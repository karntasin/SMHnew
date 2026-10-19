<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const NEW_NAME = 'หน่วยจ่ายกลาง+ซักฟอก';

    private const NEW_DESCRIPTION = 'งานจ่ายกลางและซักฟอก';

    private const OLD_NAME = 'หน่วยจ่ายกลาง';

    private const OLD_DESCRIPTION = 'Central Medical Supply';

    public function up(): void
    {
        $cms = $this->departmentByCode('CMS');
        if (! $cms) {
            throw new RuntimeException('ไม่พบแผนกที่มีรหัส CMS');
        }

        $lnd = $this->departmentByCode('LND');
        if ($lnd && (int) $lnd->id === (int) $cms->id) {
            $lnd = null;
        }

        $nameTaken = DB::table('departments')
            ->where('name', self::NEW_NAME)
            ->where('id', '!=', $cms->id)
            ->when($lnd, fn ($query) => $query->where('id', '!=', $lnd->id))
            ->exists();
        if ($nameTaken) {
            throw new RuntimeException('มีแผนกชื่อ '.self::NEW_NAME.' อยู่แล้ว');
        }

        DB::transaction(function () use ($cms, $lnd) {
            if ($lnd) {
                $this->reassign('users', 'department_id', (int) $lnd->id, (int) $cms->id);
                $this->reassignMembership('department_user', 'department_id', 'user_id', (int) $lnd->id, (int) $cms->id);
                $this->reassignMembership('department_leaders', 'department_id', 'user_id', (int) $lnd->id, (int) $cms->id);

                foreach ([
                    ['documents', 'department_id'],
                    ['document_actions', 'receiver_department_id'],
                    ['medical_equipment', 'department_id'],
                    ['medical_equipment_borrowings', 'department_id'],
                    ['env_electricity_usages', 'department_id'],
                    ['quality_indicators', 'department_id'],
                    ['quality_indicator_import_logs', 'department_id'],
                    ['quality_documents', 'department_id'],
                    ['hrd_orientation_items', 'department_id'],
                    ['hrd_assessment_responses', 'department_id'],
                    ['hrd_assessment_submissions', 'department_id'],
                    ['hrd_course_assignments', 'department_id'],
                ] as [$table, $column]) {
                    $this->reassign($table, $column, (int) $lnd->id, (int) $cms->id);
                }

                DB::table('departments')->where('id', $lnd->id)->delete();
            }

            DB::table('departments')->where('id', $cms->id)->update([
                'name' => self::NEW_NAME,
                'description' => self::NEW_DESCRIPTION,
                'updated_at' => now(),
            ]);

            if (Schema::hasTable('quality_indicators') && Schema::hasColumn('quality_indicators', 'category')) {
                DB::table('quality_indicators')
                    ->where('department_id', $cms->id)
                    ->where('category', self::OLD_NAME)
                    ->update([
                        'category' => self::NEW_NAME,
                        'updated_at' => now(),
                    ]);
            }
        });
    }

    public function down(): void
    {
        $cms = $this->departmentByCode('CMS');
        if (! $cms) {
            return;
        }

        DB::transaction(function () use ($cms) {
            if (Schema::hasTable('quality_indicators') && Schema::hasColumn('quality_indicators', 'category')) {
                DB::table('quality_indicators')
                    ->where('department_id', $cms->id)
                    ->where('category', self::NEW_NAME)
                    ->update([
                        'category' => self::OLD_NAME,
                        'updated_at' => now(),
                    ]);
            }

            DB::table('departments')->where('id', $cms->id)->update([
                'name' => self::OLD_NAME,
                'description' => self::OLD_DESCRIPTION,
                'updated_at' => now(),
            ]);

            if (! $this->departmentByCode('LND')) {
                $row = [
                    'name' => 'แผนกซักรีด',
                    'code' => 'LND',
                    'description' => 'Laundry Department',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                if (Schema::hasColumn('departments', 'is_active')) {
                    $row['is_active'] = true;
                }
                DB::table('departments')->insert($row);
            }
        });
    }

    private function departmentByCode(string $code): ?object
    {
        if (! Schema::hasTable('departments') || ! Schema::hasColumn('departments', 'code')) {
            return null;
        }

        return DB::table('departments')
            ->whereRaw('UPPER(code) = ?', [strtoupper($code)])
            ->first();
    }

    private function reassign(string $table, string $column, int $fromId, int $toId): void
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column)) {
            return;
        }

        $payload = [$column => $toId];
        if (Schema::hasColumn($table, 'updated_at')) {
            $payload['updated_at'] = now();
        }

        DB::table($table)->where($column, $fromId)->update($payload);
    }

    private function reassignMembership(string $table, string $departmentColumn, string $userColumn, int $fromId, int $toId): void
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $departmentColumn) || ! Schema::hasColumn($table, $userColumn)) {
            return;
        }

        $alreadyThere = DB::table($table)
            ->where($departmentColumn, $toId)
            ->pluck($userColumn);

        if ($alreadyThere->isNotEmpty()) {
            DB::table($table)
                ->where($departmentColumn, $fromId)
                ->whereIn($userColumn, $alreadyThere->all())
                ->delete();
        }

        $this->reassign($table, $departmentColumn, $fromId, $toId);
    }
};
