<?php

namespace App\Support;

class PiiMask
{
    private static bool $allowRaw = false;

    public static function allowRawForRequest(bool $allow = true): void
    {
        self::$allowRaw = $allow;
    }

    public static function allowsRaw(): bool
    {
        return self::$allowRaw;
    }

    /**
     * เลขบัตร 13 หลัก → 1-****-*****-**-3 (คงหลักแรกและหลักท้าย)
     */
    public static function cid(?string $cid): ?string
    {
        if ($cid === null) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $cid) ?? '';
        if ($digits === '') {
            return $cid;
        }

        // ค่าที่ mask แล้วไม่ทำซ้ำ
        if (str_contains($cid, '*')) {
            return $cid;
        }

        if (strlen($digits) !== 13) {
            $len = strlen($digits);
            if ($len <= 4) {
                return str_repeat('*', $len);
            }

            return substr($digits, 0, 1).str_repeat('*', max(0, $len - 2)).substr($digits, -1);
        }

        return $digits[0].'-****-*****-**-'.$digits[12];
    }

    /**
     * ปกปิดนามสกุล: เหลือตัวอักษรแรก (หรือ 2 ตัวถ้านามสกุลยาว) ที่เหลือเป็น *
     */
    public static function surname(?string $surname): ?string
    {
        if ($surname === null) {
            return null;
        }

        $surname = trim($surname);
        if ($surname === '') {
            return $surname;
        }

        if (str_contains($surname, '*')) {
            return $surname;
        }

        $chars = preg_split('//u', $surname, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        
        $visible = '';
        $consonantCount = 0;

        for ($i = 0; $i < count($chars); $i++) {
            $c = $chars[$i];
            
            // พยัญชนะไทย หรือ ภาษาอังกฤษ ให้นับเป็น 1 ตัว
            $isConsonantOrEng = preg_match('/[ก-ฮA-Za-z]/u', $c);
            
            // สระ/วรรณยุกต์ที่ตามหลังพยัญชนะ
            $isTrailing = preg_match('/[\x{0E30}-\x{0E3A}\x{0E45}-\x{0E4E}]/u', $c);
            
            if ($consonantCount >= 3) {
                if ($isTrailing) {
                    $visible .= $c;
                } else {
                    break;
                }
            } else {
                $visible .= $c;
                if ($isConsonantOrEng) {
                    $consonantCount++;
                }
            }
        }

        return $visible . '***';
    }

    /**
     * ชื่อ-นามสกุลผู้ป่วยแบบไทย (คำนำ+ชื่อ + ช่องว่าง + นามสกุล)
     */
    public static function patientName(?string $name): ?string
    {
        if ($name === null) {
            return null;
        }

        $name = trim(preg_replace('/\s+/u', ' ', $name) ?? $name);
        if ($name === '') {
            return $name;
        }

        if (str_contains($name, '*')) {
            return $name;
        }

        $pos = mb_strrpos($name, ' ');
        if ($pos === false) {
            $chars = preg_split('//u', $name, -1, PREG_SPLIT_NO_EMPTY) ?: [];
            $len = count($chars);
            if ($len <= 2) {
                return self::surname($name);
            }
            $keep = (int) ceil($len * 0.6);

            return implode('', array_slice($chars, 0, $keep)).str_repeat('*', $len - $keep);
        }

        $first = trim(mb_substr($name, 0, $pos));
        $last = trim(mb_substr($name, $pos + 1));

        return trim($first.' '.self::surname($last));
    }

    /**
     * เดินโครงสร้างข้อมูลแล้ว mask ฟิลด์อ่อนไหว (ใช้กับ Inertia / JSON / PDF array)
     *
     * @param  mixed  $data
     * @return mixed
     */
    public static function maskTree(mixed $data, string $keyHint = ''): mixed
    {
        if (self::$allowRaw || ! config('pii.enabled', true)) {
            return $data;
        }

        if ($data instanceof \JsonSerializable) {
            $data = $data->jsonSerialize();
        }

        if ($data instanceof \Illuminate\Contracts\Support\Arrayable) {
            $data = $data->toArray();
        }

        if (is_object($data) && method_exists($data, 'toArray')) {
            $data = $data->toArray();
        }

        if (is_array($data)) {
            $out = [];
            foreach ($data as $key => $value) {
                $k = is_string($key) ? $key : (string) $key;
                $out[$key] = self::maskTree($value, $k);
            }

            return $out;
        }

        if (! is_string($data) || $data === '') {
            return $data;
        }

        $key = mb_strtolower($keyHint);
        if ($key === '' || str_ends_with($key, '_masked') || str_contains($key, 'mask')) {
            return $data;
        }

        // อย่า mask HN / AN / VN
        if (in_array($key, ['hn', 'an', 'vn', 'an_hn'], true)) {
            return $data;
        }

        if (in_array($key, ['cid', 'citizen_id', 'id_card', 'national_id', 'pid'], true)
            || str_ends_with($key, '_cid')
            || str_ends_with($key, '.cid')) {
            return self::cid($data) ?? $data;
        }

        if (in_array($key, ['patient_name', 'ptname', 'person_name', 'pt_name'], true)
            || str_ends_with($key, '_patient_name')
            || str_contains($key, 'patient_name')) {
            return self::patientName($data) ?? $data;
        }

        if (in_array($key, ['lname', 'last_name', 'surname', 'lastname'], true)
            || str_ends_with($key, '_lname')
            || str_ends_with($key, '_last_name')
            || str_ends_with($key, '_surname')) {
            return self::surname($data) ?? $data;
        }

        // ค่า auto-check / hosxp_value ที่เป็นเลขบัตร 13 หลัก
        if (in_array($key, ['value', 'hosxp_value', 'raw_value'], true)) {
            $digits = preg_replace('/\D+/', '', $data) ?? '';
            if (strlen($digits) === 13) {
                return self::cid($digits) ?? $data;
            }
        }

        return $data;
    }
}
