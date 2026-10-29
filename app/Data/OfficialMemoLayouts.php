<?php

namespace App\Data;

class OfficialMemoLayouts
{
    /**
     * @return array{page: array{width_cm: float, height_cm: float}, blocks: list<array<string, mixed>>}
     */
    public static function defaultLayout(string $baseLayout): array
    {
        return match ($baseLayout) {
            'external' => self::external(),
            'order' => self::order(),
            default => self::internal(),
        };
    }

    /**
     * @param  array<string, mixed>|null  $layout
     * @return array{page: array{width_cm: float, height_cm: float}, blocks: list<array<string, mixed>>}
     */
    public static function normalize(?array $layout, string $baseLayout): array
    {
        $fallback = self::defaultLayout($baseLayout);
        if ($layout === null || ! isset($layout['blocks']) || ! is_array($layout['blocks']) || $layout['blocks'] === []) {
            return $fallback;
        }

        $page = is_array($layout['page'] ?? null) ? $layout['page'] : [];
        $blocks = [];
        foreach ($layout['blocks'] as $block) {
            if (! is_array($block) || empty($block['id']) || empty($block['role'])) {
                continue;
            }
            $normalized = self::normalizeBlock($block);
            if ($normalized !== null) {
                $blocks[] = $normalized;
            }
        }

        if ($blocks === []) {
            return $fallback;
        }

        return [
            'page' => [
                'width_cm' => self::clampFloat($page['width_cm'] ?? 21, 10, 30, 21),
                'height_cm' => self::clampFloat($page['height_cm'] ?? 29.7, 15, 42, 29.7),
                'margin_top_cm' => self::clampFloat($page['margin_top_cm'] ?? 2.5, 0.5, 10, 2.5),
                'margin_bottom_cm' => self::clampFloat($page['margin_bottom_cm'] ?? 2.0, 0.5, 10, 2.0),
                'margin_left_cm' => self::clampFloat($page['margin_left_cm'] ?? 3.0, 0.5, 10, 3.0),
                'margin_right_cm' => self::clampFloat($page['margin_right_cm'] ?? 2.0, 0.5, 10, 2.0),
                'orientation' => in_array($page['orientation'] ?? 'portrait', ['portrait', 'landscape'], true) ? (string) ($page['orientation'] ?? 'portrait') : 'portrait',
                'font_family' => (string) ($page['font_family'] ?? 'TH Sarabun New'),
                'font_size_pt' => (int) self::clampFloat($page['font_size_pt'] ?? 16, 10, 36, 16),
                'line_spacing' => self::clampFloat($page['line_spacing'] ?? 1.15, 0.8, 3.0, 1.15),
            ],
            'blocks' => $blocks,
        ];
    }

    /**
     * @param  array{page: array{width_cm: float, height_cm: float}, blocks: list<array<string, mixed>>}  $layout
     * @param  list<array<string, mixed>>  $fields
     * @return array{page: array{width_cm: float, height_cm: float}, blocks: list<array<string, mixed>>}
     */
    public static function mergeMissingFields(array $layout, array $fields): array
    {
        $present = [];
        $covered = [];
        foreach ($layout['blocks'] as $block) {
            $role = $block['role'] ?? '';
            if ($role === 'field' && isset($block['field'])) {
                $present[$block['field']] = true;
            }
            if ($role === 'signature') {
                array_push($covered, 'signer_rank', 'signer_name', 'signer_position');
            }
            if ($role === 'copies') {
                $covered[] = 'copies';
            }
            if ($role === 'contact') {
                array_push($covered, 'phone', 'fax', 'email');
            }
        }

        $y = 0.0;
        foreach ($layout['blocks'] as $block) {
            $bottom = (float) ($block['y_cm'] ?? 0) + (float) ($block['h_cm'] ?? 0.8);
            $y = max($y, $bottom);
        }
        $y = max($y + 0.4, 3.0);

        foreach ($fields as $field) {
            $key = (string) ($field['key'] ?? '');
            if ($key === '' || isset($present[$key]) || in_array($key, $covered, true)) {
                continue;
            }

            $type = (string) ($field['type'] ?? 'text');
            $h = $type === 'textarea' ? 3.0 : 0.8;
            $layout['blocks'][] = [
                'id' => 'field_'.$key,
                'role' => 'field',
                'field' => $key,
                'label' => (string) ($field['label'] ?? $key),
                'x_cm' => 3.0,
                'y_cm' => round($y, 1),
                'w_cm' => 16.0,
                'h_cm' => $h,
                'align' => 'left',
                'font_pt' => 16,
            ];
            $y += $h + 0.2;
        }

        return $layout;
    }

    /**
     * @param  array<string, mixed>  $block
     * @return array<string, mixed>|null
     */
    private static function normalizeBlock(array $block): ?array
    {
        $role = (string) ($block['role'] ?? '');
        if (! in_array($role, ['garuda', 'static', 'field', 'signature', 'copies', 'contact', 'rule'], true)) {
            return null;
        }

        $row = [
            'id' => (string) $block['id'],
            'role' => $role,
            'x_cm' => self::clampFloat($block['x_cm'] ?? 0, 0, 21, 0),
            'y_cm' => self::clampFloat($block['y_cm'] ?? 0, 0, 29.7, 0),
            'w_cm' => self::clampFloat($block['w_cm'] ?? 4, 0.5, 21, 4),
            'h_cm' => self::clampFloat($block['h_cm'] ?? 0.8, 0.4, 20, 0.8),
            'align' => in_array($block['align'] ?? 'left', ['left', 'center', 'right', 'justify'], true)
                ? (string) ($block['align'] ?? 'left')
                : 'left',
            'font_pt' => (int) self::clampFloat($block['font_pt'] ?? 16, 10, 36, 16),
            'bold' => (bool) ($block['bold'] ?? false),
            'italic' => (bool) ($block['italic'] ?? false),
            'underline' => (bool) ($block['underline'] ?? false),
            'text_transform' => in_array($block['text_transform'] ?? 'none', ['none', 'uppercase', 'lowercase', 'capitalize'], true)
                ? (string) ($block['text_transform'] ?? 'none')
                : 'none',
            'font_family' => ! empty($block['font_family']) ? (string) $block['font_family'] : null,
            'line_height' => isset($block['line_height']) ? self::clampFloat($block['line_height'], 0.8, 3.0, 1.15) : null,
            'space_before_pt' => isset($block['space_before_pt']) ? (int) self::clampFloat($block['space_before_pt'], 0, 72, 0) : 0,
            'space_after_pt' => isset($block['space_after_pt']) ? (int) self::clampFloat($block['space_after_pt'], 0, 72, 0) : 0,
            'indent_cm' => isset($block['indent_cm']) ? self::clampFloat($block['indent_cm'], 0, 10, 0) : 0,
        ];

        if ($role === 'static') {
            $row['text'] = (string) ($block['text'] ?? '');
        }
        if ($role === 'field') {
            $row['field'] = (string) ($block['field'] ?? '');
            $row['label'] = (string) ($block['label'] ?? '');
            if ($row['field'] === '') {
                return null;
            }
        }

        return $row;
    }

    private static function clampFloat(mixed $value, float $min, float $max, float $default): float
    {
        if (! is_numeric($value)) {
            return $default;
        }
        $n = (float) $value;

        return max($min, min($max, round($n, 2)));
    }

    /**
     * @return array{page: array{width_cm: float, height_cm: float}, blocks: list<array<string, mixed>>}
     */
    private static function internal(): array
    {
        return [
            'page' => ['width_cm' => 21.0, 'height_cm' => 29.7, 'margin_top_cm' => 2.5, 'margin_bottom_cm' => 2.0, 'margin_left_cm' => 3.0, 'margin_right_cm' => 2.0, 'orientation' => 'portrait', 'font_family' => 'TH Sarabun New', 'font_size_pt' => 16, 'line_spacing' => 1.15],
            'blocks' => [
                self::b('garuda', 'garuda', 3.0, 1.5, 1.5, 1.5),
                self::b('title', 'static', 4.8, 1.65, 14.2, 1.15, ['text' => 'บันทึกข้อความ', 'align' => 'center', 'font_pt' => 20, 'bold' => true]),
                self::field('agency', 'ส่วนราชการ', 3.0, 3.35, 16.0, 1.0),
                self::field('document_no', 'ที่', 3.0, 4.5, 8.0, 1.0),
                self::field('document_date', 'วันที่', 11.2, 4.5, 7.8, 1.0, ['align' => 'right']),
                self::field('subject', 'เรื่อง', 3.0, 5.65, 16.0, 1.0),
                self::field('addressee', 'เรียน', 3.0, 6.8, 16.0, 1.0),
                self::field('reference', 'อ้างถึง', 3.0, 7.95, 16.0, 1.0),
                self::field('attachment', 'สิ่งที่ส่งมาด้วย', 3.0, 9.1, 16.0, 1.0),
                self::field('body', 'เนื้อหา', 3.0, 10.25, 16.0, 4.2),
                self::field('closing', 'คำลงท้าย', 3.0, 14.9, 16.0, 1.0),
                self::b('signature', 'signature', 11.0, 17.6, 7.0, 2.8, ['align' => 'center']),
                self::b('copies', 'copies', 3.0, 20.2, 16.0, 1.6),
                self::b('contact', 'contact', 3.0, 22.2, 16.0, 2.4),
            ],
        ];
    }

    /**
     * @return array{page: array{width_cm: float, height_cm: float}, blocks: list<array<string, mixed>>}
     */
    private static function external(): array
    {
        return [
            'page' => ['width_cm' => 21.0, 'height_cm' => 29.7, 'margin_top_cm' => 2.5, 'margin_bottom_cm' => 2.0, 'margin_left_cm' => 3.0, 'margin_right_cm' => 2.0, 'orientation' => 'portrait', 'font_family' => 'TH Sarabun New', 'font_size_pt' => 16, 'line_spacing' => 1.15],
            'blocks' => [
                self::b('garuda', 'garuda', 9.0, 1.5, 3.0, 3.0),
                self::field('document_no', 'ที่', 3.0, 4.8, 7.5, 1.0, ['align' => 'right']),
                self::field('unit_name', 'ชื่อหน่วยงาน', 11.0, 4.8, 8.0, 1.0),
                self::field('address', 'ที่อยู่', 11.0, 5.9, 8.0, 3.2),
                self::field('document_date', 'วันที่', 11.0, 9.4, 8.0, 1.0),
                self::field('subject', 'เรื่อง', 3.0, 10.55, 16.0, 1.0),
                self::field('addressee', 'เรียน', 3.0, 11.65, 16.0, 1.0),
                self::field('reference', 'อ้างถึง', 3.0, 12.75, 16.0, 1.0),
                self::field('attachment', 'สิ่งที่ส่งมาด้วย', 3.0, 13.85, 16.0, 1.0),
                self::field('body', 'เนื้อหา', 3.0, 15.0, 16.0, 3.2),
                self::field('closing', 'คำลงท้าย', 11.0, 18.4, 8.0, 1.0, ['align' => 'center']),
                self::b('signature', 'signature', 11.0, 21.0, 8.0, 2.3, ['align' => 'center']),
                self::field('owner', 'ส่วนราชการเจ้าของเรื่อง', 3.0, 23.5, 16.0, 1.0),
                self::b('contact', 'contact', 3.0, 24.6, 16.0, 1.6),
                self::b('copies', 'copies', 3.0, 26.3, 16.0, 1.4),
            ],
        ];
    }

    /**
     * @return array{page: array{width_cm: float, height_cm: float}, blocks: list<array<string, mixed>>}
     */
    private static function order(): array
    {
        return [
            'page' => ['width_cm' => 21.0, 'height_cm' => 29.7, 'margin_top_cm' => 2.5, 'margin_bottom_cm' => 2.0, 'margin_left_cm' => 3.0, 'margin_right_cm' => 2.0, 'orientation' => 'portrait', 'font_family' => 'TH Sarabun New', 'font_size_pt' => 16, 'line_spacing' => 1.15],
            'blocks' => [
                self::b('garuda', 'garuda', 9.0, 1.5, 3.0, 3.0),
                self::field('unit_name', 'ชื่อหน่วยในหัวคำสั่ง', 3.0, 4.7, 16.0, 2.2, ['align' => 'center', 'font_pt' => 20, 'bold' => true]),
                self::field('document_no', 'ที่', 3.0, 7.05, 16.0, 1.05, ['align' => 'center', 'bold' => true]),
                self::field('subject', 'เรื่อง', 3.0, 8.2, 16.0, 1.05, ['align' => 'center', 'bold' => true]),
                self::b('rule', 'rule', 6.0, 9.35, 9.0, 0.4),
                self::field('body', 'เนื้อความ', 3.0, 9.9, 16.0, 2.2),
                self::field('authority', 'อาศัยอำนาจ', 3.0, 12.2, 16.0, 1.6),
                self::field('orders', 'ข้อสั่งการ', 3.0, 13.9, 16.0, 2.4),
                self::field('effective', 'ทั้งนี้ ตั้งแต่', 3.0, 16.45, 16.0, 1.05),
                self::field('order_date', 'สั่ง ณ วันที่', 3.0, 17.6, 16.0, 1.05, ['align' => 'center']),
                self::b('signature', 'signature', 11.0, 20.3, 7.0, 2.8, ['align' => 'center']),
                self::b('copies', 'copies', 3.0, 23.3, 16.0, 2.2),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    private static function b(string $id, string $role, float $x, float $y, float $w, float $h, array $extra = []): array
    {
        return array_merge([
            'id' => $id,
            'role' => $role,
            'x_cm' => $x,
            'y_cm' => $y,
            'w_cm' => $w,
            'h_cm' => $h,
            'align' => 'left',
            'font_pt' => 16,
            'bold' => false,
            'italic' => false,
            'underline' => false,
            'text_transform' => 'none',
        ], $extra);
    }

    /**
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    private static function field(string $key, string $label, float $x, float $y, float $w, float $h, array $extra = []): array
    {
        return self::b('field_'.$key, 'field', $x, $y, $w, $h, array_merge([
            'field' => $key,
            'label' => $label,
        ], $extra));
    }
}
