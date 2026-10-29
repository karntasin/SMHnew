<?php

namespace App\Data;

use App\Models\OfficialMemoForm;
use App\Models\OfficialMemoSetting;
use App\Models\User;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class OfficialMemoForms
{
    /**
     * @return array<string, array{label: string, base_layout: string}>
     */
    public static function kinds(): array
    {
        self::ensureSystemForms();
        $kinds = [];
        foreach (self::formRows() as $form) {
            $kinds[$form->key] = [
                'label' => $form->label,
                'base_layout' => $form->base_layout,
            ];
        }

        return $kinds;
    }

    /**
     * @return array<string, array{label: string, base_layout: string, fields: list<array<string, mixed>>, layout: array<string, mixed>, is_system: bool}>
     */
    public static function catalog(): array
    {
        self::ensureSystemForms();
        $catalog = [];
        foreach (self::formRows() as $form) {
            $catalog[$form->key] = [
                'label' => $form->label,
                'base_layout' => $form->base_layout,
                'fields' => is_array($form->fields) ? $form->fields : [],
                'layout' => self::layoutOf($form->key),
                'is_system' => (bool) $form->is_system,
            ];
        }

        return $catalog;
    }

    /**
     * @return array{page: array{width_cm: float, height_cm: float}, blocks: list<array<string, mixed>>}
     */
    public static function layoutOf(string $kind): array
    {
        self::ensureSystemForms();
        $form = OfficialMemoForm::query()->where('key', $kind)->first();
        $base = $form?->base_layout ?? self::baseLayoutOf($kind);
        $layout = OfficialMemoLayouts::normalize(
            is_array($form?->layout) ? $form->layout : null,
            $base
        );
        $fields = is_array($form?->fields) ? $form->fields : self::defaultFields($base);

        return OfficialMemoLayouts::mergeMissingFields($layout, $fields);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function fields(string $kind): array
    {
        self::ensureSystemForms();
        $form = OfficialMemoForm::query()->where('key', $kind)->first();
        if ($form && is_array($form->fields)) {
            return $form->fields;
        }

        return self::defaultFields(self::baseLayoutOf($kind));
    }

    /**
     * @return array<string, mixed>
     */
    public static function field(string $kind, string $key): array
    {
        foreach (self::fields($kind) as $field) {
            if (($field['key'] ?? '') === $key) {
                return $field;
            }
        }

        return [
            'key' => $key,
            'label' => $key,
            'type' => 'text',
            'enabled' => false,
            'optional' => true,
        ];
    }

    public static function baseLayoutOf(string $kind): string
    {
        self::ensureSystemForms();
        $form = OfficialMemoForm::query()->where('key', $kind)->first();
        if ($form && in_array($form->base_layout, ['internal', 'external', 'order'], true)) {
            return $form->base_layout;
        }

        return in_array($kind, ['internal', 'external', 'order'], true) ? $kind : 'internal';
    }

    /**
     * @return array<string, array{enabled: bool, value: string}>
     */
    public static function blankSections(string $kind, OfficialMemoSetting $setting, ?User $user): array
    {
        $sections = [];
        foreach (self::fields($kind) as $field) {
            $sections[$field['key']] = [
                'enabled' => (bool) ($field['enabled'] ?? false),
                'value' => self::prefill($field, $setting, $user),
            ];
        }

        return $sections;
    }

    /**
     * @param  array<string, mixed>  $stored
     * @return array<string, array{enabled: bool, value: string}>
     */
    public static function mergeSections(string $kind, array $stored, OfficialMemoSetting $setting, ?User $user): array
    {
        $sections = self::blankSections($kind, $setting, $user);
        foreach ($sections as $key => $row) {
            if (! isset($stored[$key]) || ! is_array($stored[$key])) {
                continue;
            }

            $sections[$key] = [
                'enabled' => (bool) ($stored[$key]['enabled'] ?? $row['enabled']),
                'value' => trim((string) ($stored[$key]['value'] ?? '')),
            ];
        }

        return $sections;
    }

    public static function ensureSystemForms(): void
    {
        if (! Schema::hasTable('official_memo_forms')) {
            return;
        }

        $defaults = [
            ['key' => 'internal', 'label' => 'บันทึกข้อความภายใน', 'base_layout' => 'internal', 'sort_order' => 1],
            ['key' => 'external', 'label' => 'หนังสือภายนอก', 'base_layout' => 'external', 'sort_order' => 2],
            ['key' => 'order', 'label' => 'คำสั่ง', 'base_layout' => 'order', 'sort_order' => 3],
        ];

        foreach ($defaults as $row) {
            $form = OfficialMemoForm::query()->firstOrCreate(
                ['key' => $row['key']],
                [
                    'label' => $row['label'],
                    'base_layout' => $row['base_layout'],
                    'fields' => self::defaultFields($row['base_layout']),
                    'layout' => OfficialMemoLayouts::defaultLayout($row['base_layout']),
                    'is_system' => true,
                    'sort_order' => $row['sort_order'],
                ]
            );

            if ($form->layout === null || $form->layout === []) {
                $form->update([
                    'layout' => OfficialMemoLayouts::defaultLayout($row['base_layout']),
                ]);
            }
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function defaultFields(string $baseLayout): array
    {
        return match ($baseLayout) {
            'external' => self::externalFields(),
            'order' => self::orderFields(),
            default => self::internalFields(),
        };
    }

    /**
     * @return array{page: array{width_cm: float, height_cm: float}, blocks: list<array<string, mixed>>}
     */
    public static function defaultLayout(string $baseLayout): array
    {
        return OfficialMemoLayouts::defaultLayout($baseLayout);
    }

    public static function uniqueKeyFromLabel(string $label, ?string $preferred = null): string
    {
        $base = $preferred !== null && $preferred !== ''
            ? Str::slug($preferred, '_')
            : Str::slug($label, '_');
        if ($base === '') {
            $base = 'form';
        }
        $base = Str::limit($base, 50, '');
        $key = $base;
        $n = 2;
        while (OfficialMemoForm::query()->where('key', $key)->exists()) {
            $key = $base.'_'.$n;
            $n++;
        }

        return $key;
    }

    /**
     * @return \Illuminate\Support\Collection<int, OfficialMemoForm>
     */
    private static function formRows()
    {
        if (! Schema::hasTable('official_memo_forms')) {
            return collect();
        }

        return OfficialMemoForm::query()->orderBy('sort_order')->orderBy('id')->get();
    }

    /**
     * @param  array<string, mixed>  $field
     */
    private static function prefill(array $field, OfficialMemoSetting $setting, ?User $user): string
    {
        foreach (['setting', 'fallback_setting'] as $source) {
            $column = $field[$source] ?? null;
            if (! is_string($column) || $column === '') {
                continue;
            }
            $value = trim((string) ($setting->{$column} ?? ''));
            if ($value !== '') {
                return $value;
            }
        }

        if (($field['key'] ?? '') === 'signer_name' && $user && trim((string) $user->name) !== '') {
            return trim((string) $user->name);
        }

        if (($field['key'] ?? '') === 'signer_position' && $user && trim((string) ($user->position ?? '')) !== '') {
            return trim((string) $user->position);
        }

        if (! empty($field['default'])) {
            return (string) $field['default'];
        }

        if (($field['type'] ?? '') === 'date') {
            return now()->toDateString();
        }

        return '';
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function internalFields(): array
    {
        return [
            self::text('agency', 'ส่วนราชการ', true, false, ['setting' => 'agency', 'fallback_setting' => 'unit_name']),
            self::text('document_no', 'ที่', true, false, ['placeholder' => 'เช่น กห 0403/123']),
            self::date('document_date', 'วันที่'),
            self::text('subject', 'เรื่อง', true, false, ['placeholder' => 'เรื่องของหนังสือ']),
            self::text('addressee', 'เรียน', true, false, ['default' => 'ผู้อำนวยการ', 'placeholder' => 'ผู้อำนวยการ']),
            self::text('reference', 'อ้างถึง', false, true, ['placeholder' => 'หนังสือที่อ้างถึง']),
            self::text('attachment', 'สิ่งที่ส่งมาด้วย', false, true, ['placeholder' => 'จำนวนและชื่อสิ่งที่ส่ง']),
            self::area('body', 'เนื้อหา', true, false, 8, 'ด้วย ...'),
            self::text('closing', 'คำลงท้าย', true, true, ['default' => 'จึงเรียนมาเพื่อโปรดพิจารณา']),
            self::rankField(),
            self::text('signer_name', 'ชื่อผู้ลงนาม', true, false, ['setting' => 'signer_name', 'placeholder' => 'ชื่อ สกุล']),
            self::text('signer_position', 'ตำแหน่งผู้ลงนาม', true, false, ['setting' => 'signer_position']),
            self::area('copies', 'สำเนาเรียน', false, true, 3, 'หน่วยงานที่รับสำเนา'),
            self::text('phone', 'โทร.', true, true, ['setting' => 'phone']),
            self::text('fax', 'โทรสาร', false, true, ['setting' => 'fax']),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function externalFields(): array
    {
        return [
            self::text('unit_name', 'ชื่อหน่วยงาน', true, false, ['setting' => 'unit_name']),
            self::area('address', 'ที่อยู่', true, true, 3, 'ที่อยู่หน่วยงาน', ['setting' => 'address']),
            self::text('document_no', 'ที่', true, false, ['placeholder' => 'เช่น กห 0403/123']),
            self::date('document_date', 'วันที่'),
            self::text('subject', 'เรื่อง', true, false, ['placeholder' => 'เรื่องของหนังสือ']),
            self::text('addressee', 'เรียน', true, false, ['placeholder' => 'ผู้รับหนังสือ']),
            self::text('reference', 'อ้างถึง', false, true),
            self::text('attachment', 'สิ่งที่ส่งมาด้วย', false, true),
            self::area('body', 'เนื้อหา', true, false, 8, 'ด้วย ...'),
            self::text('closing', 'คำลงท้าย', true, true, ['default' => 'ขอแสดงความนับถือ']),
            self::rankField(),
            self::text('signer_name', 'ชื่อผู้ลงนาม', true, false, ['setting' => 'signer_name', 'placeholder' => 'ชื่อ สกุล']),
            self::text('signer_position', 'ตำแหน่งผู้ลงนาม', true, false, ['setting' => 'signer_position']),
            self::text('owner', 'ส่วนราชการเจ้าของเรื่อง', true, true, ['setting' => 'owner_unit', 'fallback_setting' => 'agency']),
            self::text('phone', 'โทร.', true, true, ['setting' => 'phone']),
            self::text('fax', 'โทรสาร', false, true, ['setting' => 'fax']),
            self::text('email', 'ไปรษณีย์อิเล็กทรอนิกส์', false, true, ['setting' => 'email']),
            self::area('copies', 'สำเนาเรียน', false, true, 3),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function orderFields(): array
    {
        return [
            self::text('unit_name', 'ชื่อหน่วยในหัวคำสั่ง', true, false, ['setting' => 'unit_name']),
            self::text('document_no', 'ที่', true, false, ['placeholder' => 'เช่น 123/2569']),
            self::text('subject', 'เรื่อง', true, false),
            self::area('body', 'เนื้อความ', true, false, 6, 'ด้วย ...'),
            self::area('authority', 'อาศัยอำนาจ', false, true, 3, 'อาศัยอำนาจตาม ...'),
            self::area('orders', 'ข้อสั่งการ', true, false, 6, "๑. ...\n๒. ..."),
            self::text('effective', 'ทั้งนี้ ตั้งแต่', true, true, ['placeholder' => 'เช่น บัดนี้เป็นต้นไป']),
            self::date('order_date', 'สั่ง ณ วันที่'),
            self::rankField(),
            self::text('signer_name', 'ชื่อผู้ลงนาม', true, false, ['setting' => 'signer_name', 'placeholder' => 'ชื่อ สกุล']),
            self::text('signer_position', 'ตำแหน่งผู้ลงนาม', true, false, ['setting' => 'signer_position']),
            self::area('copies', 'สำเนาส่ง', false, true, 3),
        ];
    }

    /**
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    private static function text(string $key, string $label, bool $enabled, bool $optional, array $extra = []): array
    {
        return array_merge([
            'key' => $key,
            'label' => $label,
            'type' => 'text',
            'enabled' => $enabled,
            'optional' => $optional,
            'placeholder' => '',
        ], $extra);
    }

    /**
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    private static function area(string $key, string $label, bool $enabled, bool $optional, int $rows, string $placeholder = '', array $extra = []): array
    {
        return array_merge([
            'key' => $key,
            'label' => $label,
            'type' => 'textarea',
            'enabled' => $enabled,
            'optional' => $optional,
            'rows' => $rows,
            'placeholder' => $placeholder,
        ], $extra);
    }

    /**
     * @return array<string, mixed>
     */
    private static function rankField(): array
    {
        return [
            'key' => 'signer_rank',
            'label' => 'ชั้นยศ',
            'type' => 'rank',
            'enabled' => true,
            'optional' => true,
            'placeholder' => '',
            'options' => [
                'พล.อ.',
                'พล.ท.',
                'พล.ต.',
                'พ.อ.',
                'พ.ท.',
                'พ.ต.',
                'น.อ.',
                'น.ท.',
                'น.ต.',
                'ร.อ.',
                'ร.ท.',
                'ร.ต.',
                'จ.ส.อ.',
                'จ.ส.ท.',
                'จ.ส.ต.',
                'ส.อ.',
                'ส.ท.',
                'ส.ต.',
                'พลฯ',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function date(string $key, string $label): array
    {
        return [
            'key' => $key,
            'label' => $label,
            'type' => 'date',
            'enabled' => true,
            'optional' => false,
            'placeholder' => '',
        ];
    }
}
