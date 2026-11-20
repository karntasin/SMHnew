<?php

namespace App\Support\Finance;

class DataHubSchemes
{
    /**
     * @return array<string, array<string, mixed>>
     */
    public static function all(): array
    {
        return [
            'cgd' => [
                'key' => 'cgd',
                'title' => 'ตรวจเบิกจ่ายตรง กรมบัญชีกลาง',
                'short' => 'จ่ายตรง',
                'subtitle' => 'CGD · REP',
                'description' => 'เปรียบเทียบ Visit HOSxP กับไฟล์ Statement จ่ายตรงกรมบัญชีกลาง (REP) และรายงานยอดขาด',
                'import_label' => 'นำเข้า REP',
                'import_hint' => 'อัปโหลดไฟล์ REP จาก e-Claim / สปสช.',
                'icon' => 'ClipboardList',
                'tone' => 'emerald',
                'status' => 'ready',
                'dashboard_route' => 'finance.cgd.dashboard',
                'import_route' => 'finance.cgd.import',
            ],
            'lgo' => [
                'key' => 'lgo',
                'title' => 'ตรวจข้อมูล อปท.',
                'short' => 'อปท.',
                'subtitle' => 'LGO · e-Claim & SMT',
                'description' => 'เปรียบเทียบ Visit HOSxP กับ REP e-Claim และเชื่อมโยงข้อมูลการโอนเงินจริงจากเว็บ SMT สปสช.',
                'import_label' => 'นำเข้า REP อปท.',
                'import_hint' => 'อัปโหลดไฟล์ REP ขึ้นต้น OPLGO หรือดูข้อมูลเงินโอน SMT',
                'icon' => 'Building2',
                'tone' => 'sky',
                'status' => 'ready',
                'dashboard_route' => 'finance.lgo.dashboard',
                'import_route' => 'finance.lgo.import',
            ],
            'smt' => [
                'key' => 'smt',
                'title' => 'ข้อมูลการโอนเงิน สปสช. (SMT)',
                'short' => 'การจ่ายเงิน SMT',
                'subtitle' => 'SMT · อปท./UC/ไตวาย',
                'description' => 'รายงานเงินโอนจริงจาก Smart Money Transfer แยกกองทุน อปท., บัตรทอง, กองทุนไตวายเรื้อรัง, ผู้พิการ, โควิด',
                'import_label' => 'ดึงข้อมูล SMT',
                'import_hint' => 'ดึงข้อมูลอัตโนมัติจาก smt.nhso.go.th',
                'icon' => 'Banknote',
                'tone' => 'amber',
                'status' => 'ready',
                'dashboard_route' => 'finance.smt.index',
                'import_route' => 'finance.smt.index',
            ],
            'sso' => [
                'key' => 'sso',
                'title' => 'ตรวจข้อมูล ประกันสังคม',
                'short' => 'ประกันสังคม',
                'subtitle' => 'SSO',
                'description' => 'ตรวจและเปรียบเทียบข้อมูลสิทธิ์ประกันสังคมกับ Visit HOSxP — เตรียมรองรับ',
                'import_label' => 'นำเข้า ประกันสังคม',
                'import_hint' => 'อัปโหลดไฟล์ Statement / รายงานสิทธิ์ประกันสังคม (แยกจากสิทธิ์อื่น)',
                'icon' => 'Shield',
                'tone' => 'violet',
                'status' => 'planned',
                'dashboard_route' => 'finance.sso.dashboard',
                'import_route' => 'finance.sso.import',
            ],
            'uc' => [
                'key' => 'uc',
                'title' => 'ตรวจข้อมูล บัตรทอง',
                'short' => 'บัตรทอง',
                'subtitle' => 'UC · สปสช.',
                'description' => 'ตรวจและเปรียบเทียบข้อมูลสิทธิ์บัตรทอง (UC) กับ Visit HOSxP — เตรียมรองรับ',
                'import_label' => 'นำเข้า บัตรทอง',
                'import_hint' => 'อัปโหลดไฟล์ Statement / รายงานสิทธิ์บัตรทอง (แยกจากสิทธิ์อื่น)',
                'icon' => 'Heart',
                'tone' => 'rose',
                'status' => 'planned',
                'dashboard_route' => 'finance.uc.dashboard',
                'import_route' => 'finance.uc.import',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function get(string $key): array
    {
        $schemes = self::all();
        if (! isset($schemes[$key])) {
            abort(404, 'ไม่พบโมดูลสิทธิ์ที่ระบุ');
        }

        return $schemes[$key];
    }

    /**
     * @return list<string>
     */
    public static function plannedKeys(): array
    {
        return ['sso', 'uc'];
    }
}
