<?php

namespace App\Services;

use App\Models\Hosxp\Patient;
use App\Models\Hosxp\Ovst;
use App\Models\Hosxp\OpdScreen;
use App\Models\Hosxp\OvstDiag;
use App\Models\Hosxp\Opitemrece;
use App\Models\Hosxp\LabOrder;
use App\Models\Hosxp\Pttype;
use App\Models\Hosxp\KskDepartment;
use App\Models\Hosxp\VnStat;
use App\Models\Hosxp\AnStat;
use App\Models\Hosxp\Icd101;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Service สำหรับดึงข้อมูลจากฐานข้อมูล HOSxP
 */
class HosxpService
{
    protected $baseUrl;
    protected $apiKey;

    public function __construct()
    {
        $this->baseUrl = config('services.hosxp.api_url'); 
        $this->apiKey = config('services.hosxp.api_key');
    }

    /**
     * ดึง Session ID จาก HOSxP API (เดิม)
     */
    public function getFinanceSessionId()
    {
        try {
            $response = Http::timeout(5)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $this->apiKey,
                    'Accept' => 'application/json',
                ])
                ->get($this->baseUrl . '/api/get-finance-session');

            if ($response->successful()) {
                return $response->json('session_id');
            }

            Log::error('HOSxP API Error: ' . $response->body());
            return null;

        } catch (\Exception $e) {
            Log::error('HOSxP Connection Error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * ค้นหาผู้ป่วยด้วย HN
     */
    public function findPatient(string $hn): ?array
    {
        try {
            // ลอง HN ตรงๆ ก่อน
            $patient = Patient::where('hn', $hn)->first();
            
            // ถ้าไม่เจอ ลอง pad HN เป็น 9 หลัก
            if (!$patient) {
                $paddedHn = str_pad($hn, 9, '0', STR_PAD_LEFT);
                $patient = Patient::where('hn', $paddedHn)->first();
            }

            if (!$patient) {
                return null;
            }

            // แปลงวันเกิดเป็นวันที่ไทยและคำนวณอายุ
            $birthday = $patient->birthday;
            $birthdateThai = null;
            $age = null;
            $ageText = null;
            
            if ($birthday) {
                try {
                    $birthDate = \Carbon\Carbon::parse($birthday);
                    $now = \Carbon\Carbon::now();
                    
                    // คำนวณอายุ (แสดงแค่จำนวนปี ไม่มีทศนิยม)
                    $ageYears = (int) $birthDate->diffInYears($now);
                    
                    $age = $ageYears;
                    $ageText = $ageYears . ' ปี';
                    
                    // แปลงเป็นวันที่ไทย (พ.ศ.)
                    $thaiMonths = [
                        1 => 'มกราคม', 2 => 'กุมภาพันธ์', 3 => 'มีนาคม', 4 => 'เมษายน',
                        5 => 'พฤษภาคม', 6 => 'มิถุนายน', 7 => 'กรกฎาคม', 8 => 'สิงหาคม',
                        9 => 'กันยายน', 10 => 'ตุลาคม', 11 => 'พฤศจิกายน', 12 => 'ธันวาคม'
                    ];
                    $thaiYear = $birthDate->year + 543;
                    $birthdateThai = $birthDate->day . ' ' . $thaiMonths[$birthDate->month] . ' ' . $thaiYear;
                } catch (\Exception $e) {
                    Log::warning('Cannot parse birthday: ' . $e->getMessage());
                }
            }

            return [
                'hn' => $patient->hn,
                'cid' => $patient->cid,
                'pname' => $patient->pname,
                'fname' => $patient->fname,
                'lname' => $patient->lname,
                'patient_name' => trim($patient->pname . $patient->fname . ' ' . $patient->lname),
                'birthday' => $birthday,
                'birthdate' => $birthday, // alias
                'birthdate_thai' => $birthdateThai,
                'age' => $age,
                'age_text' => $ageText,
                'sex' => $patient->sex,
                'drugallergy' => $patient->drugallergy,
                'addrpart' => $patient->addrpart,
                'mession' => $patient->mession,
                'road' => $patient->road,
                'chwpart' => $patient->chwpart,
                'amppart' => $patient->amppart,
                'tmbpart' => $patient->tmbpart,
            ];
        } catch (\Exception $e) {
            Log::error('HosxpService::findPatient error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * ดึงข้อมูล Visit พร้อมข้อมูลที่เกี่ยวข้อง
     */
    public function getVisitData(string $vn): ?array
    {
        try {
            $visit = Ovst::where('vn', $vn)->first();

            if (!$visit) {
                return null;
            }

            // ดึงข้อมูลผู้ป่วย
            $patient = $this->findPatient($visit->hn);

            // ดึง OPD Screen
            $opdScreen = OpdScreen::where('vn', $vn)->first();

            // ดึง Diagnoses
            $diagnoses = OvstDiag::where('vn', $vn)
                ->orderBy('diagtype')
                ->get()
                ->map(fn($d) => [
                    'icd10' => $d->icd10,
                    'diagtype' => $d->diagtype,
                    'diagtype_name' => $d->diag_type_name,
                    'is_principal' => $d->is_principal,
                ]);

            $principalDiag = $diagnoses->firstWhere('diagtype', '1');

            // ดึงสิทธิ
            $pttype = Pttype::where('pttype', $visit->pttype)->first();

            // ดึงชื่อแผนกจาก kskdepartment โดยใช้ main_dep
            $department = null;
            $departmentName = null;
            try {
                if ($visit->main_dep) {
                    $department = KskDepartment::where('depcode', $visit->main_dep)->first();
                    $departmentName = $department?->department;
                }
            } catch (\Exception $e) {
                Log::warning('Cannot fetch department: ' . $e->getMessage());
            }

            // ดึงรายการยา/บริการ
            $items = collect();
            try {
                $items = Opitemrece::where('vn', $vn)
                    ->select('icode', 'qty', 'drugusage', 'sum_price')
                    ->get();
            } catch (\Exception $e) {
                Log::warning('Cannot fetch items: ' . $e->getMessage());
            }

            // ดึง Lab Orders - lab_order อาจใช้ lab_order_number แทน vn
            $labs = collect();
            try {
                // ลองหลาย column ที่อาจเป็น vn reference
                $labQuery = LabOrder::query();
                if (Schema::connection('hosxp')->hasColumn('lab_order', 'vn')) {
                    $labs = $labQuery->where('vn', $vn)
                        ->select('lab_items_code', 'lab_order_result')
                        ->get();
                } elseif (Schema::connection('hosxp')->hasColumn('lab_order', 'order_vn')) {
                    $labs = $labQuery->where('order_vn', $vn)
                        ->select('lab_items_code', 'lab_order_result')
                        ->get();
                }
            } catch (\Exception $e) {
                Log::warning('Cannot fetch lab orders: ' . $e->getMessage());
            }

            // ดึง Secondary Diagnoses (dx1-dx5) จาก vn_stat หรือ an_stat
            $secondaryDiagnoses = [];
            $an = $visit->an;
            $isIpd = !empty($an);
            
            try {
                if ($isIpd && $an) {
                    // IPD: ดึงจาก an_stat
                    $anStat = AnStat::where('an', $an)->first();
                    if ($anStat) {
                        for ($i = 1; $i <= 5; $i++) {
                            $field = "dx{$i}";
                            if (!empty($anStat->$field)) {
                                $secondaryDiagnoses[] = $anStat->$field;
                            }
                        }
                    }
                } else {
                    // OPD: ดึงจาก vn_stat
                    $vnStat = VnStat::where('vn', $vn)->first();
                    if ($vnStat) {
                        for ($i = 1; $i <= 5; $i++) {
                            $field = "dx{$i}";
                            if (!empty($vnStat->$field)) {
                                $secondaryDiagnoses[] = $vnStat->$field;
                            }
                        }
                    }
                }
            } catch (\Exception $e) {
                Log::warning('Cannot fetch secondary diagnoses: ' . $e->getMessage());
            }

            return [
                // Visit Info
                'vn' => $visit->vn,
                'an' => $an,
                'hn' => $visit->hn,
                'vstdate' => $visit->vstdate?->format('Y-m-d'),
                'vsttime' => $visit->vsttime,
                'spclty' => $visit->spclty,
                'main_dep' => $visit->main_dep,
                'department_name' => $departmentName,
                'doctor_code' => $visit->doctor,
                'is_ipd' => $isIpd,
                'visit_type' => $isIpd ? 'IPD' : 'OPD',
                
                // Patient Info
                'patient' => $patient,
                
                // Pttype Info
                'pttype' => $visit->pttype,
                'pttype_name' => $pttype?->name,
                
                // Clinical Data
                'chief_complaint' => $opdScreen?->cc ?? $opdScreen?->symptom,
                'present_illness' => $opdScreen?->symptom,
                'pe' => $opdScreen?->pe,
                
                // Vital Signs
                'vital_signs' => $opdScreen ? [
                    'bp_systolic' => $opdScreen->bps,
                    'bp_diastolic' => $opdScreen->bpd,
                    'pulse' => $opdScreen->pulse,
                    'temperature' => $opdScreen->temperature,
                    'respiratory_rate' => $opdScreen->rr,
                    'weight' => $opdScreen->bw,
                    'height' => $opdScreen->height,
                    'bmi' => $opdScreen->bmi,
                ] : null,
                
                // Diagnoses
                'diagnoses' => $diagnoses,
                'pdx' => $principalDiag['icd10'] ?? null,
                'pdx_name' => $this->getIcd10Name($principalDiag['icd10'] ?? null),
                'secondary_diagnoses' => $secondaryDiagnoses, // dx1-dx5 จาก vn_stat/an_stat
                'secondary_diagnoses_with_names' => $this->getIcd10NamesForCodes($secondaryDiagnoses),
                
                // Items & Labs
                'items_count' => $items->count(),
                'items' => $items,
                'labs_count' => $labs->count(),
                'labs' => $labs,
            ];
        } catch (\Exception $e) {
            Log::error('HosxpService::getVisitData error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * ค้นหา Visits ล่าสุดของผู้ป่วย
     */
    public function getRecentVisits(string $hn, int $limit = 10): array
    {
        try {
            $visits = Ovst::where('hn', $hn)
                ->orWhere('hn', str_pad($hn, 9, '0', STR_PAD_LEFT))
                ->orderBy('vstdate', 'desc')
                ->orderBy('vsttime', 'desc')
                ->limit($limit)
                ->get()
                ->map(function($v) {
                    // ดึงชื่อแผนกจาก kskdepartment
                    $departmentName = null;
                    if ($v->main_dep) {
                        $department = KskDepartment::where('depcode', $v->main_dep)->first();
                        $departmentName = $department?->department;
                    }
                    
                    // ตรวจสอบว่าเป็น IPD หรือ OPD จากค่า an
                    $an = $v->an;
                    $isIpd = !empty($an); // ถ้า an มีค่า = IPD, ถ้าว่าง = OPD
                    
                    return [
                        'vn' => $v->vn,
                        'an' => $an,
                        'vstdate' => $v->vstdate?->format('Y-m-d'),
                        'vsttime' => $v->vsttime,
                        'spclty' => $departmentName ?? $v->spclty, // ใช้ชื่อแผนกจาก kskdepartment
                        'main_dep' => $v->main_dep,
                        'department_name' => $departmentName,
                        'pttype' => $v->pttype,
                        'is_ipd' => $isIpd,
                        'visit_type' => $isIpd ? 'IPD' : 'OPD',
                    ];
                });

            return $visits->toArray();
        } catch (\Exception $e) {
            Log::error('HosxpService::getRecentVisits error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * ดึงข้อมูลสำหรับ Pre-fill MRA Audit
     */
    public function getMraPreFillData(string $vn): ?array
    {
        $visitData = $this->getVisitData($vn);
        
        if (!$visitData) {
            return null;
        }

        return [
            // Basic Info
            'vn' => $visitData['vn'],
            'hn' => $visitData['hn'],
            'cid' => $visitData['patient']['cid'] ?? null,
            'patient_name' => $visitData['patient']['patient_name'] ?? null,
            'birthdate' => $visitData['patient']['birthday'] ?? $visitData['patient']['birthdate'] ?? null,
            'birthdate_thai' => $visitData['patient']['birthdate_thai'] ?? null,
            'age' => $visitData['patient']['age'] ?? null,
            'age_text' => $visitData['patient']['age_text'] ?? null,
            'pttype' => $visitData['pttype'],
            'pttype_name' => $visitData['pttype_name'],
            
            // Visit Info
            'visit_date' => $visitData['vstdate'],
            'visit_time' => $visitData['vsttime'],
            'department_code' => $visitData['main_dep'] ?? $visitData['spclty'],
            'department_name' => $visitData['department_name'],
            'doctor_code' => $visitData['doctor_code'],
            
            // Clinical
            'chief_complaint' => $visitData['chief_complaint'],
            'pdx' => $visitData['pdx'],
            'pdx_icd10' => $visitData['pdx'],
            'pdx_name' => $visitData['pdx_name'] ?? null,
            
            // Vital Signs
            'bp_systolic' => $visitData['vital_signs']['bp_systolic'] ?? null,
            'bp_diastolic' => $visitData['vital_signs']['bp_diastolic'] ?? null,
            'pulse' => $visitData['vital_signs']['pulse'] ?? null,
            'temperature' => $visitData['vital_signs']['temperature'] ?? null,
            'respiratory_rate' => $visitData['vital_signs']['respiratory_rate'] ?? null,
            
            // Additional Data for Audit
            'has_diagnosis' => count($visitData['diagnoses']) > 0,
            'diagnoses_count' => count($visitData['diagnoses']),
            'has_vital_signs' => !empty($visitData['vital_signs']['bp_systolic']),
            'has_chief_complaint' => !empty($visitData['chief_complaint']),
            'has_medications' => $visitData['items_count'] > 0,
            'has_labs' => $visitData['labs_count'] > 0,
            
            // Secondary Diagnoses (dx1-dx5)
            'secondary_diagnoses' => $visitData['secondary_diagnoses'] ?? [],
            'secondary_diagnoses_with_names' => $visitData['secondary_diagnoses_with_names'] ?? [],
            
            // Visit Type (OPD/IPD)
            'an' => $visitData['an'] ?? null,
            'is_ipd' => $visitData['is_ipd'] ?? false,
            'visit_type' => $visitData['visit_type'] ?? 'OPD',
            
            // Raw data for detailed audit
            '_raw' => $visitData,
        ];
    }

    /**
     * ตรวจสอบข้อมูลตามเกณฑ์ MRA (Auto-check)
     */
    public function autoCheckCriteria(string $vn, string $criteriaCode): array
    {
        $visitData = $this->getVisitData($vn);
        
        if (!$visitData) {
            return [
                'passed' => false,
                'value' => null,
                'message' => 'ไม่พบข้อมูล Visit',
            ];
        }

        $patient = $visitData['patient'];
        $vitalSigns = $visitData['vital_signs'] ?? [];

        $checks = [
            // หมวด 1: ข้อมูลทั่วไป
            '1.1' => [ // ชื่อ-นามสกุล
                'value' => $patient['patient_name'] ?? null,
                'passed' => !empty($patient['fname']) && !empty($patient['lname']),
            ],
            '1.2' => [ // HN
                'value' => $patient['hn'] ?? null,
                'passed' => !empty($patient['hn']),
            ],
            '1.3' => [ // CID
                'value' => $patient['cid'] ?? null,
                'passed' => !empty($patient['cid']) && strlen($patient['cid']) === 13,
            ],
            '1.4' => [ // วันเกิด
                'value' => $patient['birthdate'] ?? null,
                'passed' => !empty($patient['birthdate']),
            ],
            '1.5' => [ // ที่อยู่
                'value' => trim(($patient['addrpart'] ?? '') . ' ' . ($patient['tmbpart'] ?? '') . ' ' . ($patient['amppart'] ?? '') . ' ' . ($patient['chwpart'] ?? '')),
                'passed' => !empty($patient['chwpart']) && !empty($patient['amppart']),
            ],
            '1.6' => [ // สิทธิ
                'value' => $visitData['pttype_name'] ?? $visitData['pttype'],
                'passed' => !empty($visitData['pttype']),
            ],

            // หมวด 2: ประวัติ
            '2.1' => [ // CC
                'value' => $visitData['chief_complaint'] ?? null,
                'passed' => !empty($visitData['chief_complaint']),
            ],
            '2.4' => [ // แพ้ยา
                'value' => $patient['drugallergy'] ?? null,
                'passed' => isset($patient['drugallergy']),
            ],

            // หมวด 3: Vital Signs
            '3.1' => [ // BP
                'value' => ($vitalSigns['bp_systolic'] ?? '-') . '/' . ($vitalSigns['bp_diastolic'] ?? '-'),
                'passed' => !empty($vitalSigns['bp_systolic']) && !empty($vitalSigns['bp_diastolic']),
            ],
            '3.2' => [ // Pulse
                'value' => $vitalSigns['pulse'] ?? null,
                'passed' => !empty($vitalSigns['pulse']),
            ],
            '3.3' => [ // Temperature
                'value' => $vitalSigns['temperature'] ?? null,
                'passed' => !empty($vitalSigns['temperature']),
            ],
            '3.4' => [ // RR
                'value' => $vitalSigns['respiratory_rate'] ?? null,
                'passed' => !empty($vitalSigns['respiratory_rate']),
            ],
            '3.5' => [ // Weight/Height
                'value' => ($vitalSigns['weight'] ?? '-') . ' kg / ' . ($vitalSigns['height'] ?? '-') . ' cm',
                'passed' => !empty($vitalSigns['weight']),
            ],

            // หมวด 4: Diagnosis
            '4.1' => [ // PDx
                'value' => $visitData['pdx'] ?? null,
                'passed' => !empty($visitData['pdx']),
            ],

            // หมวด 8: วันเวลา
            '8.2' => [ // Date/Time
                'value' => ($visitData['vstdate'] ?? '-') . ' ' . ($visitData['vsttime'] ?? '-'),
                'passed' => !empty($visitData['vstdate']) && !empty($visitData['vsttime']),
            ],
        ];

        if (isset($checks[$criteriaCode])) {
            return [
                'passed' => $checks[$criteriaCode]['passed'],
                'value' => $checks[$criteriaCode]['value'],
                'message' => $checks[$criteriaCode]['passed'] ? 'ผ่าน' : 'ไม่ผ่าน/ไม่มีข้อมูล',
            ];
        }

        return [
            'passed' => null,
            'value' => null,
            'message' => 'ต้องตรวจสอบด้วยตนเอง',
        ];
    }

    /**
     * ดึงชื่อโรคจาก ICD-10 code
     */
    protected function getIcd10Name(?string $code): ?string
    {
        if (empty($code)) {
            return null;
        }

        try {
            $icd = Icd101::where('code', $code)->first();
            if ($icd) {
                // ใช้ชื่อภาษาอังกฤษจากช่อง name
                return $icd->name;
            }
        } catch (\Exception $e) {
            Log::warning('Cannot fetch ICD-10 name: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * ดึงชื่อโรคสำหรับหลาย ICD-10 codes
     */
    protected function getIcd10NamesForCodes(array $codes): array
    {
        $result = [];

        foreach ($codes as $code) {
            if (!empty($code)) {
                $name = $this->getIcd10Name($code);
                $result[] = [
                    'code' => $code,
                    'name' => $name,
                    'display' => $name ? "{$code} - {$name}" : $code,
                ];
            }
        }

        return $result;
    }
}
