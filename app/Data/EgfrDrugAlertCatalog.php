<?php

namespace App\Data;

/**
 * รายการยาเบาหวานที่ต้องปรับตามค่า eGFR
 * อ้างอิงไฟล์ demo/รายการยาเบาหวานที่ปรับตามค่า eGFR.docx
 *
 * ตรวจหลัก: หาช่วง eGFR → ได้ Max mg/day → เทียบขนาดที่สั่งจริง
 * severity ในกฎ: contraindicated = ห้ามใช้, ok = ใช้ได้ภายใต้ Max (ถ้ามี)
 */
final class EgfrDrugAlertCatalog
{
    /**
     * @return list<array{
     *   icode: string,
     *   name: string,
     *   group: string,
     *   strength_mg: float|null,
     *   rules: list<array{
     *     max_exclusive?: float,
     *     min_inclusive?: float,
     *     severity: string,
     *     max_dose_mg?: float|null,
     *     note?: string|null
     *   }>
     * }>
     */
    public static function drugs(): array
    {
        return [
            self::drug('1560053', 'Metformin (Glucophage) 500 mg', 'Metformin', 500, self::metforminRules()),
            self::drug('1560067', 'Metformin (Glucophage) 850 mg', 'Metformin', 850, self::metforminRules()),
            self::drug('1620031', 'Metformin XR (Glucophage XR) 1000 mg', 'Metformin', 1000, self::metforminRules()),
            self::drug('1630026', 'Xigduo XR 10/1000 (Dapagliflozin+Metformin XR)', 'Metformin + SGLT2', 1000, self::metforminComboDapagliflozinRules()),
            self::drug('1640016', 'Jardiance Duo (Empagliflozin 12.5 + Metformin 1000)', 'Metformin + SGLT2', 1000, self::metforminComboEmpagliflozinRules()),

            self::drug('1690084', 'Empagliflozin 25 mg', 'SGLT2 — Empagliflozin', 25, self::empagliflozin25Rules()),
            self::drug('1590011', 'Empagliflozin 10 mg (Jardiance)', 'SGLT2 — Empagliflozin', 10, self::empagliflozin10Rules()),
            self::drug('1640033', 'Glyxambi 25/5 (Empagliflozin+Linagliptin)', 'SGLT2 — Empagliflozin', 25, self::empagliflozin25Rules()),

            self::drug('1580014', 'Dapagliflozin (Forxiga) 10 mg', 'SGLT2 — Dapagliflozin', 10, self::dapagliflozinRules()),
            self::drug('1670023', 'Luseogliflozin (Lusefi) 5 mg', 'SGLT2 — Luseogliflozin', 5, self::luseogliflozinRules()),

            self::drug('1690022', 'Sitagliptin (Maglitin) 100 mg', 'DPP-4 — Sitagliptin', 100, self::sitagliptinRules()),
            self::drug('1640079', 'Oseni 25/30 (Alogliptin+Pioglitazone)', 'DPP-4 — Alogliptin', 25, self::alogliptinRules()),

            self::drug('1660053', 'Glimepiride (Glazer) 2 mg', 'SU — Glimepiride', 2, self::glimepirideRules()),
            self::drug('1650090', 'Semaglutide (Rybelsus) 14 mg', 'GLP-1 — Semaglutide', 14, self::semaglutideRules()),
            self::drug('1650088', 'Semaglutide (Rybelsus) 7 mg', 'GLP-1 — Semaglutide', 7, self::semaglutideRules()),
        ];
    }

    /** @return array<string, array<string, mixed>> */
    public static function byIcode(): array
    {
        $map = [];
        foreach (self::drugs() as $drug) {
            $map[$drug['icode']] = $drug;
        }

        return $map;
    }

    /** @return list<string> */
    public static function icodes(): array
    {
        return array_values(array_map(static fn (array $d) => $d['icode'], self::drugs()));
    }

    /**
     * @param  list<array<string, mixed>>  $rules
     * @return array<string, mixed>
     */
    private static function drug(string $icode, string $name, string $group, ?float $strengthMg, array $rules): array
    {
        return [
            'icode' => $icode,
            'name' => $name,
            'group' => $group,
            'strength_mg' => $strengthMg,
            'rules' => $rules,
        ];
    }

    /** @return list<array<string, mixed>> */
    private static function metforminRules(): array
    {
        return [
            ['max_exclusive' => 30, 'severity' => 'contraindicated', 'note' => 'ห้ามใช้เมื่อ eGFR < 30'],
            ['min_inclusive' => 30, 'max_exclusive' => 45, 'severity' => 'ok', 'max_dose_mg' => 1000, 'note' => 'eGFR 30–44 → Max 1000 mg/วัน'],
            ['min_inclusive' => 45, 'max_exclusive' => 60, 'severity' => 'ok', 'max_dose_mg' => 2000, 'note' => 'eGFR 45–59 → Max 2000 mg/วัน'],
            ['min_inclusive' => 60, 'severity' => 'ok', 'max_dose_mg' => 3000, 'note' => 'eGFR ≥ 60 → Max 3000 mg/วัน'],
        ];
    }

    /** @return list<array<string, mixed>> */
    private static function metforminComboDapagliflozinRules(): array
    {
        return [
            ['max_exclusive' => 30, 'severity' => 'contraindicated', 'note' => 'ห้ามใช้เมื่อ eGFR < 30'],
            ['min_inclusive' => 30, 'max_exclusive' => 45, 'severity' => 'ok', 'max_dose_mg' => 1000, 'note' => 'eGFR 30–44 → Metformin Max 1000 mg/วัน'],
            ['min_inclusive' => 45, 'max_exclusive' => 60, 'severity' => 'ok', 'max_dose_mg' => 2000, 'note' => 'eGFR 45–59 → Metformin Max 2000 mg/วัน'],
            ['min_inclusive' => 60, 'severity' => 'ok', 'max_dose_mg' => 2000, 'note' => 'eGFR ≥ 60 → Metformin Max 2000 mg/วัน'],
        ];
    }

    /** @return list<array<string, mixed>> */
    private static function metforminComboEmpagliflozinRules(): array
    {
        return [
            ['max_exclusive' => 30, 'severity' => 'contraindicated', 'note' => 'ห้ามใช้เมื่อ eGFR < 30'],
            ['min_inclusive' => 30, 'max_exclusive' => 45, 'severity' => 'ok', 'max_dose_mg' => 1000, 'note' => 'eGFR 30–44 → Metformin Max 1000 mg/วัน'],
            ['min_inclusive' => 45, 'max_exclusive' => 60, 'severity' => 'ok', 'max_dose_mg' => 2000, 'note' => 'eGFR 45–59 → Metformin Max 2000 mg/วัน'],
            ['min_inclusive' => 60, 'severity' => 'ok', 'max_dose_mg' => 2000, 'note' => 'eGFR ≥ 60 → Metformin Max 2000 mg/วัน'],
        ];
    }

    /** @return list<array<string, mixed>> */
    private static function empagliflozin10Rules(): array
    {
        return [
            ['max_exclusive' => 30, 'severity' => 'contraindicated', 'note' => 'ห้ามใช้เมื่อ eGFR < 30'],
            ['min_inclusive' => 30, 'severity' => 'ok', 'max_dose_mg' => 10, 'note' => 'eGFR ≥ 30 → Max 10 mg/วัน'],
        ];
    }

    /** @return list<array<string, mixed>> */
    private static function empagliflozin25Rules(): array
    {
        return [
            ['max_exclusive' => 30, 'severity' => 'contraindicated', 'note' => 'ห้ามใช้เมื่อ eGFR < 30'],
            ['min_inclusive' => 30, 'max_exclusive' => 45, 'severity' => 'ok', 'max_dose_mg' => 10, 'note' => 'eGFR 30–44 → Max 10 mg/วัน'],
            ['min_inclusive' => 45, 'severity' => 'ok', 'max_dose_mg' => 25, 'note' => 'eGFR ≥ 45 → Max 25 mg/วัน'],
        ];
    }

    /** @return list<array<string, mixed>> */
    private static function dapagliflozinRules(): array
    {
        return [
            ['max_exclusive' => 25, 'severity' => 'contraindicated', 'note' => 'ห้ามใช้เมื่อ eGFR < 25'],
            ['min_inclusive' => 25, 'severity' => 'ok', 'max_dose_mg' => 10, 'note' => 'eGFR ≥ 25 → Max 10 mg/วัน'],
        ];
    }

    /** @return list<array<string, mixed>> */
    private static function luseogliflozinRules(): array
    {
        return [
            ['max_exclusive' => 30, 'severity' => 'contraindicated', 'note' => 'ห้ามใช้เมื่อ eGFR < 30'],
            ['min_inclusive' => 30, 'severity' => 'ok', 'max_dose_mg' => 5, 'note' => 'eGFR ≥ 30 → Max 5 mg/วัน'],
        ];
    }

    /** @return list<array<string, mixed>> */
    private static function sitagliptinRules(): array
    {
        // ตามไฟล์: <15 Max 25 ALERT | <30 Max 25 ALERT | 30–50 Max 50 ALERT | >50 ใช้เต็มได้ Max 100
        return [
            ['max_exclusive' => 15, 'severity' => 'alert', 'max_dose_mg' => 25, 'note' => 'eGFR < 15 → ALERT · Max 25 mg/วัน'],
            ['min_inclusive' => 15, 'max_exclusive' => 30, 'severity' => 'alert', 'max_dose_mg' => 25, 'note' => 'eGFR < 30 → ALERT · Max 25 mg/วัน'],
            ['min_inclusive' => 30, 'max_exclusive' => 50, 'severity' => 'alert', 'max_dose_mg' => 50, 'note' => 'eGFR 30–50 → ALERT · Max 50 mg/วัน'],
            ['min_inclusive' => 50, 'severity' => 'ok', 'max_dose_mg' => 100, 'note' => 'eGFR > 50 → Max 100 mg/วัน'],
        ];
    }

    /** @return list<array<string, mixed>> */
    private static function alogliptinRules(): array
    {
        return [
            ['max_exclusive' => 15, 'severity' => 'alert', 'max_dose_mg' => 6.25, 'note' => 'eGFR < 15 → ALERT · Max 6.25 mg/วัน'],
            ['min_inclusive' => 15, 'max_exclusive' => 30, 'severity' => 'alert', 'max_dose_mg' => 6.25, 'note' => 'eGFR < 30 → ALERT · Max 6.25 mg/วัน'],
            ['min_inclusive' => 30, 'max_exclusive' => 50, 'severity' => 'alert', 'max_dose_mg' => 12.5, 'note' => 'eGFR 30–50 → ALERT · Max 12.5 mg/วัน'],
            ['min_inclusive' => 50, 'severity' => 'ok', 'max_dose_mg' => 25, 'note' => 'eGFR > 50 → Max 25 mg/วัน'],
        ];
    }

    /** @return list<array<string, mixed>> */
    private static function glimepirideRules(): array
    {
        return [
            ['max_exclusive' => 30, 'severity' => 'ok', 'max_dose_mg' => 2, 'note' => 'eGFR < 30 → ใช้ระวัง Max 2 mg/วัน'],
            ['min_inclusive' => 30, 'severity' => 'ok', 'max_dose_mg' => 8, 'note' => 'eGFR ≥ 30 → Max 8 mg/วัน'],
        ];
    }

    /** @return list<array<string, mixed>> */
    private static function semaglutideRules(): array
    {
        return [
            ['max_exclusive' => 15, 'severity' => 'ok', 'max_dose_mg' => 14, 'note' => 'eGFR < 15 → ข้อมูลจำกัด ตรวจขนาดยา'],
            ['min_inclusive' => 15, 'severity' => 'ok', 'max_dose_mg' => 14, 'note' => 'eGFR ≥ 15 → Max 14 mg/วัน'],
        ];
    }

    /**
     * @param  array<string, mixed>  $drug
     * @return array{severity: string, note: string, max_dose_mg: float|null}|null
     */
    public static function evaluate(array $drug, float $egfr): ?array
    {
        foreach ($drug['rules'] as $rule) {
            $min = array_key_exists('min_inclusive', $rule) ? (float) $rule['min_inclusive'] : null;
            $max = array_key_exists('max_exclusive', $rule) ? (float) $rule['max_exclusive'] : null;
            if ($min !== null && $egfr < $min) {
                continue;
            }
            if ($max !== null && $egfr >= $max) {
                continue;
            }

            return [
                'severity' => (string) $rule['severity'],
                'note' => (string) ($rule['note'] ?? ''),
                'max_dose_mg' => isset($rule['max_dose_mg']) ? (float) $rule['max_dose_mg'] : null,
            ];
        }

        return null;
    }
}
