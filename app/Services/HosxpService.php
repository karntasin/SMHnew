<?php

namespace App\Services;

use App\Models\Hosxp\Patient;
use App\Models\Hosxp\Ovst;
use App\Models\Hosxp\OpdScreen;
use App\Models\Hosxp\OvstDiag;
use App\Models\Hosxp\Opitemrece;
use App\Models\Hosxp\LabOrder;
use App\Models\Hosxp\Doctor;
use App\Models\Hosxp\Pttype;
use App\Models\Hosxp\KskDepartment;
use App\Models\Hosxp\VnStat;
use App\Models\Hosxp\AnStat;
use App\Models\Hosxp\Icd101;
use App\Models\Hosxp\Ipt;
use App\Models\Hosxp\Ward;
use Illuminate\Support\Facades\DB;
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

    /** ความยาว HN มาตรฐานใน HOSxP (เติมศูนย์ด้านหน้า) */
    public const HN_PAD_LENGTH = 9;

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
     * ตัดให้เหลือเฉพาะตัวเลข
     */
    public static function normalizeCid(string $cid): string
    {
        return preg_replace('/\D+/', '', $cid) ?? '';
    }

    /**
     * ตรวจรูปแบบและ checksum เลขบัตรประชาชนไทย 13 หลัก
     */
    public static function isValidThaiCid(string $cid): bool
    {
        $cid = self::normalizeCid($cid);
        if (strlen($cid) !== 13 || ! ctype_digit($cid)) {
            return false;
        }

        $sum = 0;
        for ($i = 0; $i < 12; $i++) {
            $sum += (int) $cid[$i] * (13 - $i);
        }

        $check = (11 - ($sum % 11)) % 10;

        return $check === (int) $cid[12];
    }

    /**
     * ค้นหาผู้ป่วยด้วยเลขบัตรประชาชน (patient.cid)
     *
     * @return array{hn:string,cid:string,pname:?string,fname:?string,lname:?string,patient_name:string}|null
     */
    public function findPatientByCid(string $cid): ?array
    {
        $cid = self::normalizeCid($cid);
        if ($cid === '' || strlen($cid) !== 13) {
            return null;
        }

        try {
            $this->notePatientLookup();
            $patient = Patient::query()->where('cid', $cid)->first();
            if (! $patient) {
                return null;
            }

            return [
                'hn' => $this->normalizeHn($patient->hn),
                'cid' => (string) $patient->cid,
                'pname' => $patient->pname,
                'fname' => $patient->fname,
                'lname' => $patient->lname,
                'patient_name' => trim(($patient->pname ?? '').($patient->fname ?? '').' '.($patient->lname ?? '')),
            ];
        } catch (\Throwable $e) {
            Log::error('HosxpService::findPatientByCid error: '.$e->getMessage());

            return null;
        }
    }

    /**
     * ค้นหาผู้ป่วยด้วย HN
     */
    public function findPatient(string $hn): ?array
    {
        try {
            $this->notePatientLookup();
            // ลอง HN ตรงๆ ก่อน
            $patient = Patient::where('hn', $hn)->first();
            
            // ถ้าไม่เจอ ลอง pad HN เป็น 9 หลัก
            if (!$patient) {
                $paddedHn = $this->normalizeHn($hn);
                if ($paddedHn !== $hn) {
                    $patient = Patient::where('hn', $paddedHn)->first();
                }
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

            $moopart = $patient->moopart ?? null;
            $fullAddress = trim(implode(' ', array_filter([
                $patient->addrpart ?: null,
                $moopart !== null && $moopart !== '' ? 'หมู่ ' . $moopart : null,
                $patient->road ?: null,
            ])));

            // แปลงรหัสที่อยู่เป็นชื่อ (thaiaddress) ถ้ามีตาราง
            $addressName = null;
            try {
                if (Schema::connection('hosxp')->hasTable('thaiaddress') && $patient->chwpart) {
                    $province = DB::connection('hosxp')->table('thaiaddress')
                        ->where('chwpart', $patient->chwpart)
                        ->where('amppart', '00')
                        ->where('tmbpart', '00')
                        ->value('name');
                    $amphur = DB::connection('hosxp')->table('thaiaddress')
                        ->where('chwpart', $patient->chwpart)
                        ->where('amppart', $patient->amppart)
                        ->where('tmbpart', '00')
                        ->value('name');
                    $tambon = DB::connection('hosxp')->table('thaiaddress')
                        ->where('chwpart', $patient->chwpart)
                        ->where('amppart', $patient->amppart)
                        ->where('tmbpart', $patient->tmbpart)
                        ->value('name');
                    $addressName = trim(implode(' ', array_filter([
                        $fullAddress ?: null,
                        $tambon ? 'ต.' . $tambon : null,
                        $amphur ? 'อ.' . $amphur : null,
                        $province ? 'จ.' . $province : null,
                    ])));
                }
            } catch (\Exception $e) {
                // ignore address name resolve
            }

            return [
                'hn' => $this->normalizeHn($patient->hn),
                'cid' => $patient->cid !== null && $patient->cid !== '' ? (string) $patient->cid : null,
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
                'moopart' => $moopart,
                'mession' => $patient->mession ?? null,
                'road' => $patient->road,
                'chwpart' => $patient->chwpart,
                'amppart' => $patient->amppart,
                'tmbpart' => $patient->tmbpart,
                'full_address' => $addressName ?: $fullAddress,
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

            // Lab: ใช้ lab_head.vn เป็นหลัก (lab_order มักไม่มีคอลัมน์ vn)
            $labs = collect();
            $labsCount = 0;
            try {
                if (Schema::connection('hosxp')->hasTable('lab_head')) {
                    $labHeads = DB::connection('hosxp')->table('lab_head')
                        ->where('vn', $vn)
                        ->select('lab_order_number', 'form_name', 'order_date', 'confirm_report')
                        ->get();
                    $labs = $labHeads;
                    $labsCount = $labHeads->count();
                }
                if ($labsCount === 0) {
                    $labQuery = LabOrder::query();
                    if (Schema::connection('hosxp')->hasColumn('lab_order', 'vn')) {
                        $labs = $labQuery->where('vn', $vn)->select('lab_items_code', 'lab_order_result')->get();
                        $labsCount = $labs->count();
                    } elseif (Schema::connection('hosxp')->hasColumn('lab_order', 'order_vn')) {
                        $labs = $labQuery->where('order_vn', $vn)->select('lab_items_code', 'lab_order_result')->get();
                        $labsCount = $labs->count();
                    }
                }
            } catch (\Exception $e) {
                Log::warning('Cannot fetch lab orders: ' . $e->getMessage());
            }

            // X-ray
            $xrayCount = 0;
            try {
                if (Schema::connection('hosxp')->hasTable('xray_head')) {
                    $xrayCount = (int) DB::connection('hosxp')->table('xray_head')->where('vn', $vn)->count();
                } elseif (Schema::connection('hosxp')->hasTable('xray_report')) {
                    $xrayCount = (int) DB::connection('hosxp')->table('xray_report')->where('vn', $vn)->count();
                }
            } catch (\Exception $e) {
                Log::warning('Cannot fetch xray: ' . $e->getMessage());
            }

            // แพทย์
            $doctorName = null;
            try {
                if (!empty($visit->doctor)) {
                    $doctor = Doctor::where('code', $visit->doctor)->first();
                    $doctorName = $doctor?->full_name;
                }
            } catch (\Exception $e) {
                Log::warning('Cannot fetch doctor: ' . $e->getMessage());
            }

            // ประวัติแพ้ยา: patient.drugallergy + opd_allergy + opdscreen.found_allergy
            $allergyAgents = [];
            $allergyRecorded = false;
            try {
                if (Schema::connection('hosxp')->hasTable('opd_allergy') && !empty($visit->hn)) {
                    $allergyAgents = DB::connection('hosxp')->table('opd_allergy')
                        ->where('hn', $visit->hn)
                        ->pluck('agent')
                        ->filter()
                        ->values()
                        ->all();
                }
            } catch (\Exception $e) {
                // ignore
            }
            $drugAllergyText = trim((string) ($patient['drugallergy'] ?? ''));
            $foundAllergy = $opdScreen->found_allergy ?? null;
            if ($drugAllergyText !== '' || count($allergyAgents) > 0 || in_array($foundAllergy, ['Y', 'N', 'y', 'n', '1', '0'], true)) {
                $allergyRecorded = true;
            }

            // นัด Follow-up
            $nextAppointment = null;
            try {
                if (Schema::connection('hosxp')->hasTable('oapp')) {
                    $nextAppointment = DB::connection('hosxp')->table('oapp')
                        ->where('vn', $vn)
                        ->orderByDesc('nextdate')
                        ->value('nextdate');
                }
            } catch (\Exception $e) {
                // ignore
            }

            // ดึง Secondary Diagnoses (dx1-dx5) จาก vn_stat หรือ an_stat
            $secondaryDiagnoses = [];
            $an = $this->resolveAnForVisit($vn, $visit->an);
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
                'vn' => $visit->vn !== null && $visit->vn !== '' ? (string) $visit->vn : null,
                'an' => $an !== null && $an !== '' ? (string) $an : null,
                'hn' => $this->normalizeHn($visit->hn ?: ($patient['hn'] ?? null)),
                'vstdate' => $visit->vstdate?->format('Y-m-d'),
                'vsttime' => $visit->vsttime,
                'spclty' => $visit->spclty,
                'main_dep' => $visit->main_dep,
                'department_name' => $departmentName,
                'doctor' => $visit->doctor,
                'doctor_code' => $visit->doctor,
                'doctor_name' => $doctorName,
                'is_ipd' => $isIpd,
                'visit_type' => $isIpd ? 'IPD' : 'OPD',

                // Patient Info
                'patient' => $patient,

                // Pttype Info
                'pttype' => $visit->pttype,
                'pttype_name' => $pttype?->name,

                // Clinical Data — รองรับทั้ง cc/symptom/hpi ตามเวอร์ชัน HOSxP
                'chief_complaint' => $this->firstFilled($opdScreen?->cc, $opdScreen?->symptom, $opdScreen?->hpi),
                'present_illness' => $this->firstFilled($opdScreen?->hpi, $opdScreen?->his_expand, $opdScreen?->symptom),
                'past_illness' => $this->firstFilled($opdScreen?->pmh, $opdScreen?->fh),
                'pe' => $this->firstFilled($opdScreen?->pe, $opdScreen?->pe_ga_text),
                'physical_exam' => $this->firstFilled($opdScreen?->pe, $opdScreen?->pe_ga_text),
                'found_allergy' => $foundAllergy,
                'allergy_agents' => $allergyAgents,
                'allergy_recorded' => $allergyRecorded,
                'allergy_text' => count($allergyAgents)
                    ? implode(', ', $allergyAgents)
                    : ($drugAllergyText !== '' ? $drugAllergyText : ($foundAllergy === 'N' || $foundAllergy === 'n' ? 'ปฏิเสธแพ้ยา/ไม่พบ' : null)),
                'next_appointment' => $nextAppointment,

                // Vital Signs — รองรับ bps/bpd และ bpsys/bpdia
                'vital_signs' => $opdScreen ? [
                    'bp_systolic' => $this->firstNumeric($opdScreen->bps ?? null, $opdScreen->bpsys ?? null),
                    'bp_diastolic' => $this->firstNumeric($opdScreen->bpd ?? null, $opdScreen->bpdia ?? null),
                    'pulse' => $this->firstNumeric($opdScreen->pulse ?? null, $opdScreen->hr ?? null),
                    'temperature' => $this->firstNumeric($opdScreen->temperature ?? null),
                    'respiratory_rate' => $this->firstNumeric($opdScreen->rr ?? null),
                    'weight' => $this->firstNumeric($opdScreen->bw ?? null),
                    'height' => $this->firstNumeric($opdScreen->height ?? null),
                    'bmi' => $this->firstNumeric($opdScreen->bmi ?? null),
                ] : null,

                // Diagnoses
                'diagnoses' => $diagnoses,
                'pdx' => $principalDiag['icd10'] ?? null,
                'pdx_name' => $this->getIcd10Name($principalDiag['icd10'] ?? null),
                'secondary_diagnoses' => $secondaryDiagnoses,
                'secondary_diagnoses_with_names' => $this->getIcd10NamesForCodes($secondaryDiagnoses),

                // Items & Labs & X-ray
                'items_count' => $items->count(),
                'items' => $items,
                'labs_count' => $labsCount,
                'labs' => $labs,
                'xray_count' => $xrayCount,
            ];
        } catch (\Exception $e) {
            Log::error('HosxpService::getVisitData error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * ค้นหา Visits ล่าสุดของผู้ป่วย (รวม IPD จาก ipt — ผู้ป่วยที่มา OPD บ่อยอาจมี IPD เก่าที่ไม่ติด top N ของ ovst)
     *
     * @param  'all'|'opd'|'ipd'|null  $visitType
     */
    public function getRecentVisits(string $hn, int $limit = 30, ?string $visitType = null): array
    {
        try {
            $visitType = in_array($visitType, ['all', 'opd', 'ipd'], true) ? $visitType : null;
            $entries = collect();

            // 1) IPD จาก ipt (AN จริง — บาง site ไม่ sync ลง ovst.an สำหรับ visit ล่าสุด)
            if ($visitType === null || $visitType === 'ipd' || $visitType === 'all') {
                $iptQuery = Ipt::query();
                $this->applyHnFilter($iptQuery, $hn);
                $iptRows = $iptQuery
                    ->orderByDesc('regdate')
                    ->orderByDesc('regtime')
                    ->limit(50)
                    ->get(['an', 'hn', 'vn', 'regdate', 'regtime', 'ward']);

                foreach ($iptRows as $ipt) {
                    $entry = $this->formatVisitListEntryFromIpt($ipt);
                    $key = $entry['vn'] ?: ('an:' . $entry['an']);
                    $entries->put($key, $entry);
                }
            }

            $ipdCount = $entries->count();

            // 2) OPD จาก ovst (ข้าม vn ที่มีใน ipt แล้ว)
            if ($visitType === null || $visitType === 'opd' || $visitType === 'all') {
                $ipdVns = $entries->pluck('vn')->filter()->values()->all();
                $ovstQuery = Ovst::query();
                $this->applyHnFilter($ovstQuery, $hn);
                if ($ipdVns !== []) {
                    $ovstQuery->whereNotIn('vn', $ipdVns);
                }
                $ovstQuery->where(function ($q) {
                    $q->whereNull('an')->orWhere('an', '');
                });

                $ovstRows = $ovstQuery
                    ->orderByDesc('vstdate')
                    ->orderByDesc('vsttime')
                    ->limit($limit)
                    ->get();

                foreach ($ovstRows as $v) {
                    $an = $this->resolveAnForVisit($v->vn, $v->an);
                    if (! empty($an)) {
                        continue;
                    }
                    $entries->put($v->vn, $this->formatVisitListEntryFromOvst($v, false, null));
                }
            }

            $sorted = $entries->sortByDesc(fn (array $row) => ($row['vstdate'] ?? '') . ' ' . ($row['vsttime'] ?? ''));

            if ($visitType === 'ipd') {
                return $sorted->filter(fn ($row) => $row['is_ipd'])->take($limit)->values()->all();
            }

            if ($visitType === 'opd') {
                return $sorted->filter(fn ($row) => ! $row['is_ipd'])->take($limit)->values()->all();
            }

            // all: รักษารายการ IPD ทั้งหมด + OPD ล่าสุด (ไม่ให้ OPD จำนวนมากกลบ IPD เก่า)
            return $sorted->take($ipdCount + $limit)->values()->all();
        } catch (\Exception $e) {
            Log::error('HosxpService::getRecentVisits error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * ค้นหา HN ทั้งแบบที่ระบุและแบบเติมศูนย์
     */
    private function applyHnFilter($query, string $hn): void
    {
        $normalized = $this->normalizeHn($hn);
        $variants = array_values(array_unique(array_filter([$hn, $normalized])));

        $query->where(function ($q) use ($variants) {
            foreach ($variants as $i => $variant) {
                $i === 0 ? $q->where('hn', $variant) : $q->orWhere('hn', $variant);
            }
        });
    }

    /**
     * หา AN จาก ovst หรือ ipt (บางโรงพยาบาลเก็บ IPD ใน ipt เป็นหลัก)
     */
    private function resolveAnForVisit(?string $vn, mixed $ovstAn): ?string
    {
        if ($ovstAn !== null && $ovstAn !== '') {
            return (string) $ovstAn;
        }
        if (! $vn || ! Schema::connection('hosxp')->hasTable('ipt')) {
            return null;
        }

        $iptAn = Ipt::where('vn', $vn)->value('an');

        return $iptAn !== null && $iptAn !== '' ? (string) $iptAn : null;
    }

    private function formatVisitListEntryFromOvst(Ovst $v, bool $isIpd, ?string $an): array
    {
        $departmentName = null;
        if ($v->main_dep) {
            $departmentName = KskDepartment::where('depcode', $v->main_dep)->first()?->department;
        }

        return [
            'vn' => $v->vn,
            'an' => $an,
            'vstdate' => $v->vstdate?->format('Y-m-d'),
            'vsttime' => $v->vsttime,
            'spclty' => $departmentName ?? $v->spclty,
            'main_dep' => $v->main_dep,
            'department_name' => $departmentName,
            'pttype' => $v->pttype,
            'is_ipd' => $isIpd,
            'visit_type' => $isIpd ? 'IPD' : 'OPD',
        ];
    }

    private function formatVisitListEntryFromIpt(Ipt $ipt): array
    {
        $ovst = $ipt->vn ? Ovst::where('vn', $ipt->vn)->first() : null;
        $departmentName = null;

        if ($ovst?->main_dep) {
            $departmentName = KskDepartment::where('depcode', $ovst->main_dep)->first()?->department;
        } elseif ($ipt->ward) {
            $departmentName = Ward::where('ward', $ipt->ward)->value('name') ?: $ipt->ward;
        }

        $vstdate = $ovst?->vstdate ?? $ipt->regdate;
        $vsttime = $ovst?->vsttime ?? $ipt->regtime;

        return [
            'vn' => $ipt->vn,
            'an' => $ipt->an,
            'vstdate' => $vstdate instanceof \DateTimeInterface ? $vstdate->format('Y-m-d') : (string) $vstdate,
            'vsttime' => $vsttime,
            'spclty' => $departmentName ?? ($ovst?->spclty ?? ''),
            'main_dep' => $ovst?->main_dep,
            'department_name' => $departmentName,
            'pttype' => $ovst?->pttype ?? '',
            'is_ipd' => true,
            'visit_type' => 'IPD',
        ];
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
     * รองรับทั้ง code เก่า (1.1, 2.1) และ code ใหม่ สปสช. 2563 (A1, B1)
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
        
        // แปลง Collection เป็น array ถ้าจำเป็น
        $diagnoses = $visitData['diagnoses'] ?? [];
        if ($diagnoses instanceof \Illuminate\Support\Collection) {
            $diagnoses = $diagnoses->toArray();
        }
        
        $items = $visitData['items'] ?? [];
        if ($items instanceof \Illuminate\Support\Collection) {
            $items = $items->toArray();
        }

        // สปสช. 2563 criteria codes (A, B, C, D, E)
        $checks = [
            // ===========================================
            // หมวด A: การระบุตัวผู้ป่วย (Patient Identification)
            // ===========================================
            'A1' => [ // HN ถูกต้องครบถ้วน
                'value' => $patient['hn'] ?? null,
                'passed' => !empty($patient['hn']),
            ],
            'A2' => [ // ชื่อ-นามสกุล ถูกต้องครบถ้วน
                'value' => $patient['patient_name'] ?? null,
                'passed' => !empty($patient['fname']) && !empty($patient['lname']),
            ],
            'A3' => [ // CID 13 หลัก ถูกต้อง
                'value' => $patient['cid'] ?? null,
                'passed' => !empty($patient['cid']) && strlen(trim($patient['cid'])) === 13,
            ],
            'A4' => [ // วัน เดือน ปีเกิด ถูกต้อง
                'value' => $patient['birthdate'] ?? null,
                'passed' => !empty($patient['birthdate']),
            ],
            'A5' => [ // เพศ ถูกต้อง
                'value' => $patient['sex'] ?? null,
                'passed' => !empty($patient['sex']) && in_array($patient['sex'], ['1', '2', 1, 2, 'M', 'F', 'ชาย', 'หญิง']),
            ],
            'A6' => [ // สิทธิการรักษา ถูกต้อง
                'value' => $visitData['pttype_name'] ?? $visitData['pttype'] ?? null,
                'passed' => !empty($visitData['pttype']),
            ],

            // ===========================================
            // หมวด B: ข้อมูลทางคลินิก (Clinical Information)
            // ===========================================
            'B1' => [ // Chief Complaint
                'value' => $visitData['chief_complaint'] ?? null,
                'passed' => !empty($visitData['chief_complaint']),
            ],
            'B2' => [ // HPI - ประวัติการเจ็บป่วยปัจจุบัน (ตรวจจาก present_illness)
                'value' => $visitData['present_illness'] ?? $visitData['chief_complaint'] ?? null,
                'passed' => !empty($visitData['present_illness']) || !empty($visitData['chief_complaint']),
            ],
            'B3' => [ // PMH - ประวัติการเจ็บป่วยในอดีต
                'value' => $patient['chronic'] ?? null,
                'passed' => isset($patient['chronic']), // มีการบันทึก (แม้จะว่าง = ไม่มีโรคประจำตัว)
            ],
            'B4' => [ // ประวัติการแพ้ยา/อาหาร
                'value' => $patient['drugallergy'] ?? null,
                'passed' => isset($patient['drugallergy']), // มีการบันทึก
            ],
            'B5' => [ // Vital Signs ครบถ้วน (BP, Pulse, Temp, RR)
                'value' => sprintf(
                    "BP: %s/%s, P: %s, T: %s, RR: %s",
                    $vitalSigns['bp_systolic'] ?? '-',
                    $vitalSigns['bp_diastolic'] ?? '-',
                    $vitalSigns['pulse'] ?? '-',
                    $vitalSigns['temperature'] ?? '-',
                    $vitalSigns['respiratory_rate'] ?? '-'
                ),
                'passed' => !empty($vitalSigns['bp_systolic']) 
                    && !empty($vitalSigns['bp_diastolic'])
                    && !empty($vitalSigns['pulse'])
                    && !empty($vitalSigns['temperature']),
            ],
            'B6' => [ // Physical Examination
                'value' => $visitData['physical_exam'] ?? $visitData['pe'] ?? null,
                'passed' => !empty($visitData['physical_exam']) || !empty($visitData['pe']),
            ],
            'B7' => [ // ผล Lab/X-ray
                'value' => 'Lab:' . ($visitData['labs_count'] ?? 0) . ' Xray:' . ($visitData['xray_count'] ?? 0),
                'passed' => ($visitData['labs_count'] ?? 0) > 0 || ($visitData['xray_count'] ?? 0) > 0,
            ],
            'B8' => [ // Principal Diagnosis (PDx)
                'value' => $visitData['pdx'] ?? null,
                'passed' => !empty($visitData['pdx']),
            ],
            'B9' => [ // Secondary Diagnosis (SDx) - ถ้ามี
                'value' => count($diagnoses) > 1 ? implode(', ', array_slice(array_column($diagnoses, 'icd10'), 1)) : 'N/A',
                'passed' => true, // Not required, always pass if exists
            ],
            'B10' => [ // แผนการรักษา/คำสั่งการรักษา
                'value' => count($items) . ' รายการ',
                'passed' => count($items) > 0,
            ],

            // ===========================================
            // หมวด C: ความถูกต้องของการบันทึก (Documentation Quality)
            // ===========================================
            'C1' => [ // ลายมือชื่อแพทย์ — ตรวจได้บางส่วนจากระบบ
                'value' => $visitData['doctor_name'] ?? $visitData['doctor_code'] ?? null,
                'passed' => !empty($visitData['doctor_name']) || !empty($visitData['doctor_code']) ? true : null,
            ],
            'C2' => [ // วันที่และเวลาที่บันทึก
                'value' => ($visitData['vstdate'] ?? '-') . ' ' . ($visitData['vsttime'] ?? '-'),
                'passed' => !empty($visitData['vstdate']) && !empty($visitData['vsttime']),
            ],
            'C3' => [ // ความชัดเจนของลายมือ (manual check)
                'value' => null,
                'passed' => null, // ต้องตรวจด้วยตนเอง
            ],
            'C4' => [ // การแก้ไขข้อความถูกต้อง (manual check)
                'value' => null,
                'passed' => null, // ต้องตรวจด้วยตนเอง
            ],
            'C5' => [ // ความต่อเนื่องของการบันทึก (manual check)
                'value' => null,
                'passed' => null, // ต้องตรวจด้วยตนเอง
            ],
            'C6' => [ // บันทึกการให้คำแนะนำผู้ป่วย (manual check)
                'value' => null,
                'passed' => null, // ต้องตรวจด้วยตนเอง
            ],
            'C7' => [ // Informed Consent (manual check)
                'value' => null,
                'passed' => null, // ต้องตรวจด้วยตนเอง
            ],

            // ===========================================
            // หมวด D: ความถูกต้องของการให้รหัส (Coding Accuracy)
            // ===========================================
            'D1' => [ // ICD-10 ของ PDx ถูกต้อง
                'value' => $visitData['pdx'] ?? null,
                // รองรับทั้งรูปแบบมีจุด (R45.8) และไม่มีจุด (R458, R4581)
                // ICD-10 format: ตัวอักษร + 2 ตัวเลข + (จุดหรือไม่มี) + 0-2 ตัวเลข
                'passed' => !empty($visitData['pdx']) && preg_match('/^[A-Z]\d{2}\.?\d{0,2}$/i', $visitData['pdx']),
            ],
            'D2' => [ // ICD-10 ของ SDx ถูกต้อง
                'value' => count($diagnoses) > 1 ? 'มี ' . (count($diagnoses) - 1) . ' รายการ' : 'ไม่มี SDx',
                'passed' => true, // Pass if format is correct (manual verification needed for accuracy)
            ],
            'D3' => [ // ICD-9-CM ของหัตถการ (manual check)
                'value' => null,
                'passed' => null, // ต้องตรวจด้วยตนเอง
            ],
            'D4' => [ // การเลือก PDx ถูกต้อง (manual check)
                'value' => null,
                'passed' => null, // ต้องตรวจด้วยตนเอง
            ],
            'D5' => [ // ความครบถ้วนของรหัส (manual check)
                'value' => null,
                'passed' => null, // ต้องตรวจด้วยตนเอง
            ],
            'D6' => [ // ไม่มี Upcoding (manual check)
                'value' => null,
                'passed' => null, // ต้องตรวจด้วยตนเอง
            ],

            // ===========================================
            // หมวด E: ความสอดคล้องของข้อมูล (Data Consistency)
            // ===========================================
            'E1' => [ // CC กับ Diagnosis สอดคล้องกัน (manual check)
                'value' => sprintf("CC: %s | Dx: %s", 
                    $visitData['chief_complaint'] ?? '-', 
                    $visitData['pdx'] ?? '-'
                ),
                'passed' => null, // ต้องตรวจด้วยตนเอง
            ],
            'E2' => [ // PE กับ Diagnosis สอดคล้องกัน (manual check)
                'value' => null,
                'passed' => null, // ต้องตรวจด้วยตนเอง
            ],
            'E3' => [ // Diagnosis กับ Treatment สอดคล้องกัน (manual check)
                'value' => null,
                'passed' => null, // ต้องตรวจด้วยตนเอง
            ],
            'E4' => [ // Lab/X-ray กับ Diagnosis สอดคล้องกัน (manual check)
                'value' => null,
                'passed' => null, // ต้องตรวจด้วยตนเอง
            ],
            'E5' => [ // ข้อมูลไม่ขัดแย้งกัน (manual check)
                'value' => null,
                'passed' => null, // ต้องตรวจด้วยตนเอง
            ],

            // ===========================================
            // MRA 2563 OPD/IPD — ดึงจากตารางจริงของโรงพยาบาลนี้
            // opdscreen: bps/bpd/cc/hpi/pe · lab_head.vn · doctor · opd_allergy
            // ===========================================
            'pp_1' => [
                'value' => trim(($patient['patient_name'] ?? '') . ' HN:' . ($patient['hn'] ?? '') . ' sex:' . ($patient['sex'] ?? '') . ' DOB:' . ($patient['birthdate'] ?? '')),
                'passed' => !empty($patient['fname']) && !empty($patient['lname']) && !empty($patient['hn']) && !empty($patient['sex']) && !empty($patient['birthdate']),
            ],
            'pp_2' => [
                'value' => $patient['full_address'] ?? trim(($patient['addrpart'] ?? '') . ' ' . ($patient['moopart'] ?? '') . ' ' . ($patient['chwpart'] ?? '')),
                'passed' => !empty($patient['full_address']) || !empty($patient['chwpart']) || !empty($patient['amppart']) || !empty($patient['addrpart']) || ($patient['moopart'] ?? '') !== '',
            ],
            'pp_3' => [
                'value' => $patient['cid'] ?? null,
                // อนุโลมกรณีระบุไม่มีบัตร — ถ้ามีข้อความ/ค่าใดๆ ใน cid
                'passed' => !empty($patient['cid']) && (strlen(trim((string) $patient['cid'])) === 13 || strlen(trim((string) $patient['cid'])) > 0),
            ],
            'pp_4' => [
                'value' => $visitData['allergy_text'] ?? ($patient['drugallergy'] ?? null),
                'passed' => (bool) ($visitData['allergy_recorded'] ?? false),
            ],
            'hist_1' => [
                'value' => $visitData['chief_complaint'] ?? null,
                'passed' => !empty($visitData['chief_complaint']),
            ],
            'hist_2' => [
                'value' => mb_substr((string) ($visitData['present_illness'] ?? ''), 0, 120),
                'passed' => !empty($visitData['present_illness']),
            ],
            'hist_4' => [
                'value' => $visitData['past_illness'] ?? null,
                'passed' => !empty($visitData['past_illness']) ? true : null, // ไม่มีข้อความ = ให้ตรวจ manual
            ],
            'hist_6' => [
                'value' => $visitData['allergy_text'] ?? ($patient['drugallergy'] ?? null),
                'passed' => (bool) ($visitData['allergy_recorded'] ?? false),
            ],
            'pe_1' => [
                'value' => trim(($visitData['vstdate'] ?? '') . ' ' . ($visitData['vsttime'] ?? '')),
                'passed' => !empty($visitData['vstdate']),
            ],
            'pe_2' => [
                'value' => mb_substr((string) ($visitData['pe'] ?? ''), 0, 120),
                'passed' => !empty($visitData['pe']) ? true : null,
            ],
            'pe_3' => [
                'value' => mb_substr((string) ($visitData['pe'] ?? ''), 0, 120),
                'passed' => !empty($visitData['pe']) ? true : null,
            ],
            'pe_4' => [
                'value' => sprintf('P:%s R:%s T:%s', $vitalSigns['pulse'] ?? '-', $vitalSigns['respiratory_rate'] ?? '-', $vitalSigns['temperature'] ?? '-'),
                'passed' => $this->hasVital($vitalSigns['pulse'] ?? null) && $this->hasVital($vitalSigns['respiratory_rate'] ?? null),
            ],
            'pe_5' => [
                'value' => ($vitalSigns['bp_systolic'] ?? '-') . '/' . ($vitalSigns['bp_diastolic'] ?? '-'),
                'passed' => $this->hasVital($vitalSigns['bp_systolic'] ?? null) && $this->hasVital($vitalSigns['bp_diastolic'] ?? null),
            ],
            'pe_6' => [
                'value' => ($vitalSigns['weight'] ?? '-') . ' kg / ' . ($vitalSigns['height'] ?? '-') . ' cm',
                'passed' => $this->hasVital($vitalSigns['weight'] ?? null),
            ],
            'pe_7' => [
                'value' => trim(($visitData['pdx'] ?? '') . ' ' . ($visitData['pdx_name'] ?? '')),
                'passed' => !empty($visitData['pdx']),
            ],
            'tx_1' => [
                'value' => 'Lab:' . ($visitData['labs_count'] ?? 0) . ' Xray:' . ($visitData['xray_count'] ?? 0),
                'passed' => (($visitData['labs_count'] ?? 0) > 0 || ($visitData['xray_count'] ?? 0) > 0) ? true : null,
            ],
            'tx_2' => [
                'value' => count($items) . ' รายการ',
                'passed' => count($items) > 0,
            ],
            'tx_4' => [
                'value' => $visitData['next_appointment'] ?? null,
                'passed' => !empty($visitData['next_appointment']) ? true : null,
            ],
            'tx_6' => [
                'value' => $visitData['doctor_name'] ?? $visitData['doctor_code'] ?? null,
                'passed' => !empty($visitData['doctor_name']) || !empty($visitData['doctor_code']) || !empty($visitData['doctor']),
            ],
            'dso_1' => [
                'value' => $patient['patient_name'] ?? null,
                'passed' => !empty($patient['fname']) && !empty($patient['lname']),
            ],
            'dso_2' => [
                'value' => $patient['cid'] ?? null,
                'passed' => !empty($patient['cid']) && strlen(trim((string) ($patient['cid'] ?? ''))) >= 1,
            ],
            'ih_1' => [
                'value' => $visitData['chief_complaint'] ?? null,
                'passed' => !empty($visitData['chief_complaint']),
            ],
            'ih_2' => [
                'value' => mb_substr((string) ($visitData['present_illness'] ?? ''), 0, 120),
                'passed' => !empty($visitData['present_illness']),
            ],
            'ih_5' => [
                'value' => $visitData['allergy_text'] ?? null,
                'passed' => (bool) ($visitData['allergy_recorded'] ?? false),
            ],
            'ipe_1' => [
                'value' => sprintf(
                    'T:%s P:%s R:%s BP:%s/%s',
                    $vitalSigns['temperature'] ?? '-',
                    $vitalSigns['pulse'] ?? '-',
                    $vitalSigns['respiratory_rate'] ?? '-',
                    $vitalSigns['bp_systolic'] ?? '-',
                    $vitalSigns['bp_diastolic'] ?? '-'
                ),
                'passed' => $this->hasVital($vitalSigns['pulse'] ?? null)
                    && ($this->hasVital($vitalSigns['temperature'] ?? null) || $this->hasVital($vitalSigns['bp_systolic'] ?? null)),
            ],
            'ipe_2' => [
                'value' => ($vitalSigns['weight'] ?? '-') . ' kg',
                'passed' => $this->hasVital($vitalSigns['weight'] ?? null),
            ],
            'ipe_3' => [
                'value' => mb_substr((string) ($visitData['pe'] ?? ''), 0, 120),
                'passed' => !empty($visitData['pe']) ? true : null,
            ],
            'ipe_7' => [
                'value' => $visitData['pdx'] ?? null,
                'passed' => !empty($visitData['pdx']),
            ],

            // ===========================================
            // Legacy codes (รองรับ code เก่า)
            // ===========================================
            '1.1' => [ 
                'value' => $patient['patient_name'] ?? null,
                'passed' => !empty($patient['fname']) && !empty($patient['lname']),
            ],
            '1.2' => [ 
                'value' => $patient['hn'] ?? null,
                'passed' => !empty($patient['hn']),
            ],
            '1.3' => [ 
                'value' => $patient['cid'] ?? null,
                'passed' => !empty($patient['cid']) && strlen($patient['cid']) === 13,
            ],
            '1.4' => [ 
                'value' => $patient['birthdate'] ?? null,
                'passed' => !empty($patient['birthdate']),
            ],
            '1.5' => [ 
                'value' => trim(($patient['addrpart'] ?? '') . ' ' . ($patient['tmbpart'] ?? '') . ' ' . ($patient['amppart'] ?? '') . ' ' . ($patient['chwpart'] ?? '')),
                'passed' => !empty($patient['chwpart']) && !empty($patient['amppart']),
            ],
            '1.6' => [ 
                'value' => $visitData['pttype_name'] ?? $visitData['pttype'],
                'passed' => !empty($visitData['pttype']),
            ],
            '2.1' => [ 
                'value' => $visitData['chief_complaint'] ?? null,
                'passed' => !empty($visitData['chief_complaint']),
            ],
            '2.4' => [ 
                'value' => $patient['drugallergy'] ?? null,
                'passed' => isset($patient['drugallergy']),
            ],
            '3.1' => [ 
                'value' => ($vitalSigns['bp_systolic'] ?? '-') . '/' . ($vitalSigns['bp_diastolic'] ?? '-'),
                'passed' => !empty($vitalSigns['bp_systolic']) && !empty($vitalSigns['bp_diastolic']),
            ],
            '3.2' => [ 
                'value' => $vitalSigns['pulse'] ?? null,
                'passed' => !empty($vitalSigns['pulse']),
            ],
            '3.3' => [ 
                'value' => $vitalSigns['temperature'] ?? null,
                'passed' => !empty($vitalSigns['temperature']),
            ],
            '3.4' => [ 
                'value' => $vitalSigns['respiratory_rate'] ?? null,
                'passed' => !empty($vitalSigns['respiratory_rate']),
            ],
            '3.5' => [ 
                'value' => ($vitalSigns['weight'] ?? '-') . ' kg / ' . ($vitalSigns['height'] ?? '-') . ' cm',
                'passed' => !empty($vitalSigns['weight']),
            ],
            '4.1' => [ 
                'value' => $visitData['pdx'] ?? null,
                'passed' => !empty($visitData['pdx']),
            ],
            '8.2' => [ 
                'value' => ($visitData['vstdate'] ?? '-') . ' ' . ($visitData['vsttime'] ?? '-'),
                'passed' => !empty($visitData['vstdate']) && !empty($visitData['vsttime']),
            ],
        ];

        if (isset($checks[$criteriaCode])) {
            $check = $checks[$criteriaCode];
            
            // ถ้า passed เป็น null หมายถึงต้องตรวจด้วยตนเอง
            if ($check['passed'] === null) {
                return [
                    'passed' => null,
                    'value' => $check['value'],
                    'message' => 'ต้องตรวจสอบด้วยตนเอง',
                ];
            }
            
            return [
                'passed' => $check['passed'],
                'value' => $check['value'],
                'message' => $check['passed'] ? 'ผ่าน' : 'ไม่ผ่าน/ไม่มีข้อมูล',
            ];
        }

        return [
            'passed' => null,
            'value' => null,
            'message' => 'ต้องตรวจสอบด้วยตนเอง',
        ];
    }

    protected function firstFilled(mixed ...$values): ?string
    {
        foreach ($values as $value) {
            if ($value === null) {
                continue;
            }
            $text = trim((string) $value);
            if ($text !== '') {
                return $text;
            }
        }

        return null;
    }

    protected function firstNumeric(mixed ...$values): mixed
    {
        foreach ($values as $value) {
            if ($value === null || $value === '') {
                continue;
            }
            if (is_numeric($value) && (float) $value == 0.0) {
                // temperature=0 มักหมายถึงไม่ได้วัด
                continue;
            }
            if (is_numeric($value) || (is_string($value) && trim($value) !== '')) {
                return $value;
            }
        }

        return null;
    }

    protected function hasVital(mixed $value): bool
    {
        if ($value === null || $value === '') {
            return false;
        }
        if (is_numeric($value) && (float) $value == 0.0) {
            return false;
        }

        return true;
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

    /**
     * เก็บ HN เป็น string และเติมศูนย์ด้านหน้าให้ครบมาตรฐาน HOSxP
     * เพื่อไม่ให้ศูนย์นำหน้าหายตอนบันทึก/แสดงผล
     */
    public function normalizeHn(mixed $hn): string
    {
        $hn = trim((string) ($hn ?? ''));
        if ($hn === '') {
            return '';
        }

        // ตัดอักขระที่ไม่ใช่ตัวเลขออกเฉพาะตอนเช็คว่าควร pad หรือไม่
        if (preg_match('/^\d+$/', $hn) && strlen($hn) < self::HN_PAD_LENGTH) {
            return str_pad($hn, self::HN_PAD_LENGTH, '0', STR_PAD_LEFT);
        }

        return $hn;
    }

    private function notePatientLookup(): void
    {
        try {
            if (! app()->bound('request')) {
                return;
            }
            $request = request();
            app(\App\Services\Security\SecurityMonitor::class)->recordPatientLookup(
                (string) $request->ip(),
                $request->user()?->id,
            );
        } catch (\Throwable) {
            // ignore monitoring failures
        }
    }
}
