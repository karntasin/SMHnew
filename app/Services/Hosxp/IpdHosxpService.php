<?php

namespace App\Services\Hosxp;

use App\Models\Hosxp\Doctor;
use App\Models\Hosxp\Ipt;
use App\Models\Hosxp\OpdScreen;
use App\Models\Hosxp\Patient;
use App\Models\Hosxp\Pttype;
use App\Models\Hosxp\Ward;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Service สำหรับดึงข้อมูลงานผู้ป่วยใน (IPD) จากฐานข้อมูล HOSxP (Strictly Read-Only)
 */
class IpdHosxpService
{
    /**
     * ค้นหารายการผู้ป่วย (Visit วันนี้, ผู้ป่วยในที่กำลัง Admit, หรือค้นหาตาม HN / ชื่อ-สกุล)
     * รองรับทั้งผู้ป่วยที่มี AN แล้ว และผู้ป่วยที่ยังไม่มี AN พร้อมระบุแผนก (main_dep) ชัดเจน
     *
     * @param string $term คำค้นหา (HN, ชื่อ-สกุล, AN, หรือ VN)
     * @param int $limit จำนวนรายการสูงสุด
     * @param string $filter 'today' (มาวันนี้/วันที่ระบุ), 'ipd' (กำลัง Admit), หรือ 'all' (ค้นหาทั้งหมด)
     * @param string|null $date วันที่ต้องการค้นหา (รูปแบบ Y-m-d เช่น '2026-11-11')
     * @return array<int, array<string, mixed>>
     */
    public function searchAdmissions(string $term = '', int $limit = 35, string $filter = 'all', ?string $date = null): array
    {
        try {
            $conn = DB::connection('hosxp');
            $term = trim($term);

            // กรณีเลือกแท็บผู้ป่วยในกำลัง Admit โดยเฉพาะ (กรองเฉพาะผู้ป่วยที่มี AN แล้ว และยังไม่จำหน่าย)
            if ($filter === 'ipd') {
                $query = $conn->table('ipt as i')
                    ->join('patient as p', 'p.hn', '=', 'i.hn')
                    ->leftJoin('ward as w', 'w.ward', '=', 'i.ward')
                    ->leftJoin('pttype as pt', 'pt.pttype', '=', 'i.pttype')
                    ->leftJoin('ovst as o', 'o.an', '=', 'i.an')
                    ->leftJoin('kskdepartment as k', 'k.depcode', '=', 'o.main_dep')
                    ->whereNotNull('i.an')
                    ->where('i.an', '<>', '')
                    ->where(function ($q) {
                        $q->whereNull('i.dchdate')->orWhere('i.dchdate', '0000-00-00');
                    });

                if ($term !== '') {
                    if (ctype_digit($term)) {
                        $paddedHn = str_pad($term, 9, '0', STR_PAD_LEFT);
                        $query->where(function ($q) use ($term, $paddedHn) {
                            $q->where('i.an', $term)
                              ->orWhere('i.hn', $term)
                              ->orWhere('i.hn', $paddedHn)
                              ->orWhere('i.vn', $term);
                        });
                    } else {
                        $query->where(function ($q) use ($term) {
                            $q->where('p.fname', 'like', "{$term}%")
                              ->orWhere('p.lname', 'like', "{$term}%")
                              ->orWhere(DB::raw("CONCAT(COALESCE(p.pname,''), p.fname, ' ', p.lname)"), 'like', "%{$term}%");
                        });
                    }
                }

                $rows = $query->select([
                    'i.an',
                    'i.hn',
                    'i.vn',
                    'i.regdate',
                    'i.regtime',
                    'i.dchdate',
                    'i.ward',
                    'w.name as ward_name',
                    'pt.name as pttype_name',
                    'o.main_dep',
                    'k.department as main_dep_name',
                    'o.vstdate',
                    'o.vsttime',
                    'p.pname',
                    'p.fname',
                    'p.lname',
                    'p.sex',
                    'p.birthday',
                ])
                ->orderByDesc('i.regdate')
                ->orderByDesc('i.regtime')
                ->limit($limit)
                ->get();
            } else {
                // ค้นหาจาก ovst เป็นหลัก เพื่อให้ครอบคลุมทั้งผู้ป่วยนอก/ฉุกเฉินที่มาวันนี้ และเคสที่กำลังจะ Admit
                $query = $conn->table('ovst as o')
                    ->join('patient as p', 'p.hn', '=', 'o.hn')
                    ->leftJoin('kskdepartment as k', 'k.depcode', '=', 'o.main_dep')
                    ->leftJoin('pttype as pt', 'pt.pttype', '=', 'o.pttype')
                    ->leftJoin('ipt as i', 'i.an', '=', 'o.an')
                    ->leftJoin('ward as w', 'w.ward', '=', 'i.ward');

                if ($term !== '') {
                    if (ctype_digit($term)) {
                        $paddedHn = str_pad($term, 9, '0', STR_PAD_LEFT);
                        $query->where(function ($q) use ($term, $paddedHn) {
                            $q->where('o.hn', $term)
                              ->orWhere('o.hn', $paddedHn)
                              ->orWhere('o.an', $term)
                              ->orWhere('o.vn', $term);
                        });
                    } else {
                        $query->where(function ($q) use ($term) {
                            $q->where('p.fname', 'like', "{$term}%")
                              ->orWhere('p.lname', 'like', "{$term}%")
                              ->orWhere(DB::raw("CONCAT(COALESCE(p.pname,''), p.fname, ' ', p.lname)"), 'like', "%{$term}%");
                        });
                    }
                    if ($filter === 'today' && $date && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                        $query->where('o.vstdate', $date);
                    }
                    $query->orderByDesc('o.vstdate')->orderByDesc('o.vsttime');
                } else {
                    // หากไม่ระบุคำค้น ให้ดึงผู้ป่วยที่มารับบริการในวันนั้น (Today's Visits หรือวันที่เลือก)
                    $targetDate = ($date && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) ? $date : Carbon::today()->toDateString();
                    $query->where('o.vstdate', $targetDate)
                          ->orderByDesc('o.vsttime');
                }

                $rows = $query->select([
                    'o.vn',
                    'o.hn',
                    'o.an',
                    'o.vstdate',
                    'o.vsttime',
                    'o.main_dep',
                    'k.department as main_dep_name',
                    'p.pname',
                    'p.fname',
                    'p.lname',
                    'p.sex',
                    'p.birthday',
                    'pt.name as pttype_name',
                    'i.ward',
                    'w.name as ward_name',
                    'i.dchdate',
                    'i.regdate',
                    'i.regtime',
                ])
                ->limit($limit)
                ->get();
            }

            return $rows->map(function ($row) {
                $fullName = trim(($row->pname ?? '') . ($row->fname ?? '') . ' ' . ($row->lname ?? ''));
                $refDate = $row->regdate ?: $row->vstdate;
                $age = $this->calculateAge($row->birthday, $refDate);
                $hasAn = !empty($row->an);
                $isDischarged = $hasAn && !empty($row->dchdate) && $row->dchdate !== '0000-00-00';

                $mainDepName = trim($row->main_dep_name ?? '');
                $wardName = trim($row->ward_name ?? '');

                // กำหนดสถานะที่เข้าใจง่าย
                if ($hasAn) {
                    $status = $isDischarged ? 'จำหน่ายแล้ว' : 'กำลัง Admit (IPD)';
                } else {
                    $status = 'ผู้ป่วยนอก (ยังไม่มี AN / รอดำเนินการ Admit)';
                }

                return [
                    'vn' => (string) $row->vn,
                    'an' => (string) ($row->an ?? ''),
                    'hn' => (string) $row->hn,
                    'has_an' => $hasAn,
                    'patient_name' => $fullName,
                    'gender' => $row->sex === '1' ? 'ชาย' : ($row->sex === '2' ? 'หญิง' : ($row->sex ?: '-')),
                    'age' => $age,
                    'main_dep' => (string) ($row->main_dep ?? ''),
                    'main_dep_name' => $mainDepName ?: ($row->main_dep ? 'แผนก ' . $row->main_dep : 'ไม่ระบุแผนก'),
                    'ward' => $wardName ?: ($row->ward ?: ($mainDepName ?: 'ไม่ระบุหอ')),
                    'pttype' => $row->pttype_name ?: 'ไม่ระบุสิทธิ',
                    'vstdate' => $this->formatThaiDate($row->vstdate ?? $row->regdate),
                    'vstdate_raw' => $row->vstdate ?? $row->regdate,
                    'vsttime' => $row->vsttime ? substr($row->vsttime, 0, 5) : '',
                    'admit_date' => $this->formatThaiDate($row->regdate ?: $row->vstdate),
                    'admit_date_raw' => $row->regdate ?: $row->vstdate,
                    'admit_time' => $row->regtime ? substr($row->regtime, 0, 5) : ($row->vsttime ? substr($row->vsttime, 0, 5) : ''),
                    'status' => $status,
                ];
            })->all();

        } catch (\Throwable $e) {
            Log::error('IpdHosxpService searchAdmissions error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * ดึงประวัติการมารับบริการ (Visits) ย้อนหลังของผู้ป่วยตาม HN เพื่อให้แพทย์เลือกนำเข้าประวัติเก่าได้
     *
     * @param string $hn หมายเลข HN
     * @param int $limit จำนวน visit สูงสุดที่ต้องการดึง
     * @return array<int, array<string, mixed>>
     */
    public function getPatientVisitHistory(string $hn, int $limit = 20): array
    {
        try {
            $conn = DB::connection('hosxp');
            $cleanHn = trim($hn);
            if ($cleanHn === '') {
                return [];
            }
            $paddedHn = str_pad($cleanHn, 9, '0', STR_PAD_LEFT);

            $visits = $conn->table('ovst as o')
                ->leftJoin('kskdepartment as k', 'k.depcode', '=', 'o.main_dep')
                ->leftJoin('opdscreen as s', 's.vn', '=', 'o.vn')
                ->leftJoin('pttype as pt', 'pt.pttype', '=', 'o.pttype')
                ->leftJoin('ipt as i', 'i.an', '=', 'o.an')
                ->leftJoin('ward as w', 'w.ward', '=', 'i.ward')
                ->where(function ($q) use ($cleanHn, $paddedHn) {
                    $q->where('o.hn', $cleanHn)->orWhere('o.hn', $paddedHn);
                })
                ->select([
                    'o.vn',
                    'o.hn',
                    'o.an',
                    'o.vstdate',
                    'o.vsttime',
                    'o.main_dep',
                    'k.department as main_dep_name',
                    's.cc',
                    's.bps',
                    's.bpd',
                    's.pulse',
                    's.temperature',
                    'pt.name as pttype_name',
                    'i.ward',
                    'w.name as ward_name',
                ])
                ->orderByDesc('o.vstdate')
                ->orderByDesc('o.vsttime')
                ->limit($limit)
                ->get();

            $results = [];
            foreach ($visits as $v) {
                $hasAn = !empty($v->an);
                $bp = '';
                if (!empty($v->bps) && !empty($v->bpd)) {
                    $bp = "{$v->bps}/{$v->bpd}";
                }

                $vitalsSummary = [];
                if ($bp) $vitalsSummary[] = "BP: {$bp}";
                if (!empty($v->pulse)) $vitalsSummary[] = "PR: {$v->pulse}";
                if (!empty($v->temperature)) $vitalsSummary[] = "T: " . round((float) $v->temperature, 1) . "°C";

                $results[] = [
                    'vn' => (string) $v->vn,
                    'hn' => (string) $v->hn,
                    'an' => (string) ($v->an ?? ''),
                    'has_an' => $hasAn,
                    'vstdate' => $this->formatThaiDate($v->vstdate),
                    'vstdate_raw' => (string) $v->vstdate,
                    'vsttime' => $v->vsttime ? substr((string) $v->vsttime, 0, 5) : '',
                    'main_dep' => (string) ($v->main_dep ?? ''),
                    'main_dep_name' => (string) ($v->main_dep_name ?: 'ไม่ระบุแผนก'),
                    'cc' => trim((string) ($v->cc ?? '')),
                    'pttype' => (string) ($v->pttype_name ?? ''),
                    'ward' => (string) ($v->ward_name ?? ''),
                    'vitals_summary' => implode(' | ', $vitalsSummary),
                ];
            }

            return $results;
        } catch (\Throwable $e) {
            Log::error('IpdHosxpService getPatientVisitHistory error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * ดึงข้อมูลรายละเอียดการรับ Admit / การตรวจรักษาทั้งหมดเพื่อนำไปกรอกลง Admission Note อัตโนมัติ
     * รองรับการระบุด้วย AN, VN หรือ HN (ดึงข้อมูลสัญญาณชีพ opdscreen และแผนก main_dep ครบถ้วน)
     *
     * @param string $anOrVnOrHn AN, VN หรือ HN
     * @return array<string, mixed>|null
     */
    public function getAdmissionNotePrefill(string $anOrVnOrHn): ?array
    {
        try {
            $conn = DB::connection('hosxp');
            $anOrVnOrHn = trim($anOrVnOrHn);

            $ipt = null;
            $ovst = null;

            // 1. ลองค้นหาจาก ipt ด้วย an
            $ipt = $conn->table('ipt as i')->where('i.an', $anOrVnOrHn)->first();

            // 2. ถ้าไม่พบ ลองค้นด้วย vn ใน ipt
            if (!$ipt) {
                $ipt = $conn->table('ipt as i')->where('i.vn', $anOrVnOrHn)->first();
            }

            // 3. ถ้ายังไม่พบ ค้นหาจาก ovst โดยตรงด้วย vn
            if (!$ipt) {
                $ovst = $conn->table('ovst as o')->where('o.vn', $anOrVnOrHn)->first();
                if ($ovst && !empty($ovst->an)) {
                    $ipt = $conn->table('ipt as i')->where('i.an', $ovst->an)->first();
                }
            }

            // 4. ถ้ายังไม่พบ ค้นหาจาก HN
            if (!$ipt && !$ovst) {
                $paddedHn = str_pad($anOrVnOrHn, 9, '0', STR_PAD_LEFT);
                $ipt = $conn->table('ipt as i')
                    ->where(function ($q) use ($anOrVnOrHn, $paddedHn) {
                        $q->where('i.hn', $anOrVnOrHn)->orWhere('i.hn', $paddedHn);
                    })
                    ->orderByDesc('i.regdate')
                    ->orderByDesc('i.regtime')
                    ->first();

                $ovst = $conn->table('ovst as o')
                    ->where(function ($q) use ($anOrVnOrHn, $paddedHn) {
                        $q->where('o.hn', $anOrVnOrHn)->orWhere('o.hn', $paddedHn);
                    })
                    ->orderByDesc('o.vstdate')
                    ->orderByDesc('o.vsttime')
                    ->first();

                if ($ovst && !empty($ovst->an)) {
                    $ipt = $conn->table('ipt as i')->where('i.an', $ovst->an)->first() ?: $ipt;
                }
            }

            // ถ้ามี ipt แต่ยังไม่มี ovst ให้ค้น ovst ตาม an หรือ vn ของ ipt
            if ($ipt && !$ovst) {
                if (!empty($ipt->an)) {
                    $ovst = $conn->table('ovst as o')->where('o.an', $ipt->an)->first();
                }
                if (!$ovst && !empty($ipt->vn)) {
                    $ovst = $conn->table('ovst as o')->where('o.vn', $ipt->vn)->first();
                }
            }

            // ถ้าไม่พบทั้ง ipt และ ovst
            if (!$ipt && !$ovst) {
                return null;
            }

            $an = (string) ($ipt?->an ?: ($ovst?->an ?: ''));
            $hn = (string) ($ipt?->hn ?: $ovst?->hn);
            $vn = (string) ($ipt?->vn ?: ($ovst?->vn ?: ''));
            $refDate = $ipt?->regdate ?: $ovst?->vstdate;
            $refTime = $ipt?->regtime ?: $ovst?->vsttime;

            // 2. ข้อมูลผู้ป่วย (patient)
            $patient = $conn->table('patient')
                ->where('hn', $hn)
                ->first();

            $pname = $patient?->pname ?? '';
            $fname = $patient?->fname ?? '';
            $lname = $patient?->lname ?? '';
            $fullName = trim($pname . $fname . ' ' . $lname);
            $gender = ($patient?->sex === '1') ? 'ชาย' : (($patient?->sex === '2') ? 'หญิง' : ($patient?->sex ?: ''));
            $age = $this->calculateAge($patient?->birthday, $refDate);

            // 3. หอผู้ป่วย (ward) หรือ แผนกที่มารับบริการ (main_dep)
            $wardName = '';
            if ($ipt?->ward) {
                $wardRow = $conn->table('ward')->where('ward', $ipt->ward)->first();
                $wardName = $wardRow?->name ?? $ipt->ward;
            }

            $mainDepName = '';
            if ($ovst?->main_dep) {
                $depRow = $conn->table('kskdepartment')->where('depcode', $ovst->main_dep)->first();
                $mainDepName = $depRow?->department ?? $ovst->main_dep;
            }
            if (!$wardName && $mainDepName) {
                $wardName = $mainDepName;
            }

            // 4. สิทธิการรักษา (pttype)
            $pttypeCode = $ipt?->pttype ?: ($ovst?->pttype ?: null);
            $pttypeName = '';
            if ($pttypeCode) {
                $pttypeRow = $conn->table('pttype')->where('pttype', $pttypeCode)->first();
                $pttypeName = $pttypeRow?->name ?? $pttypeCode;
            }

            // 5. แพทย์ผู้รับตรวจ / Admit (doctor)
            $doctorName = '';
            $doctorLicense = '';
            $docCode = $ipt?->admdoctor ?: ($ipt?->incharge_doctor ?: ($ovst?->doctor ?: ($ovst?->command_doctor ?: null)));
            if ($docCode) {
                $docRow = $conn->table('doctor')->where('code', $docCode)->first();
                $doctorName = $docRow?->name ?? '';
                $doctorLicense = $docRow?->licenseno ?? '';
            }

            // 6. ประวัติแพ้ยา (opd_allergy + patient.drugallergy)
            $allergyList = [];
            if (Schema::connection('hosxp')->hasTable('opd_allergy')) {
                $allergies = $conn->table('opd_allergy')
                    ->where('hn', $hn)
                    ->get();
                foreach ($allergies as $alg) {
                    $item = trim($alg->agent ?? '');
                    if (!empty($alg->symptom)) {
                        $item .= ' (' . trim($alg->symptom) . ')';
                    }
                    if ($item !== '') {
                        $allergyList[] = $item;
                    }
                }
            }
            $drugAllergyText = trim($patient?->drugallergy ?? '');
            if ($drugAllergyText !== '' && !in_array($drugAllergyText, $allergyList, true)) {
                $allergyList[] = $drugAllergyText;
            }
            $hasAllergy = count($allergyList) > 0;
            $allergyDetail = implode(', ', $allergyList);

            // 7. ข้อมูลการซักประวัติและตรวจร่างกาย (opdscreen)
            $screen = null;
            if ($vn !== '') {
                $screen = $conn->table('opdscreen')->where('vn', $vn)->first();
            }
            if (!$screen) {
                // ค้นหา opdscreen ล่าสุดของ hn นี้
                $screen = $conn->table('opdscreen')
                    ->where('hn', $hn)
                    ->orderByDesc('vstdate')
                    ->orderByDesc('vsttime')
                    ->first();
            }

            // สูบบุหรี่
            $smokingOpt = 'no';
            $smokingDetail = '';
            if (!empty($screen->smoking_type_id)) {
                $smokeType = $conn->table('smoking_type')->where('smoking_type_id', $screen->smoking_type_id)->first();
                $sName = $smokeType?->smoking_type_name ?? '';
                if ($screen->smoking_type_id == 2 || str_contains($sName, 'สูบ')) {
                    $smokingOpt = 'yes';
                    $smokingDetail = $sName;
                }
            }

            // ดื่มสุรา
            $alcoholOpt = 'no';
            $alcoholDetail = '';
            if (!empty($screen->drinking_type_id)) {
                $drinkType = $conn->table('drinking_type')->where('drinking_type_id', $screen->drinking_type_id)->first();
                $dName = $drinkType?->drinking_type_name ?? '';
                if ($screen->drinking_type_id == 2 || str_contains($dName, 'ดื่ม')) {
                    $alcoholOpt = 'yes';
                    $alcoholDetail = $dName;
                }
            }

            // สัญญาณชีพ
            $bps = $screen->bps ?? ($screen->bpsys ?? null);
            $bpd = $screen->bpd ?? ($screen->bpdia ?? null);
            $bp = ($bps && $bpd) ? "{$bps}/{$bpd}" : ($bps ?: ($bpd ?: ''));
            $temperature = !empty($screen->temperature) ? (string) round((float) $screen->temperature, 1) : '';
            $pulse = $screen->pulse ?? ($screen->hr ?? '');
            $rr = $screen->rr ?? '';
            $spo2 = $screen->spo2 ?? ($screen->o2sat ?? '');
            $bw = !empty($screen->bw) ? (string) round((float) $screen->bw, 1) : '';
            $height = !empty($screen->height) ? (string) round((float) $screen->height, 0) : '';
            $bmi = !empty($screen->bmi) ? (string) round((float) $screen->bmi, 2) : '';
            if (!$bmi && $bw && $height && (float) $height > 0) {
                $hM = (float) $height / 100.0;
                $bmi = (string) round((float) $bw / ($hM * $hM), 2);
            }
            $painScore = isset($screen->pain_score) && $screen->pain_score !== '' ? (string) $screen->pain_score : '';

            // อาการสำคัญ & เจ็บป่วย
            $cc = trim($screen->cc ?? '');
            $hpi = trim($screen->hpi ?? '');
            if (!$hpi && !empty($screen->his_expand)) {
                $hpi = trim($screen->his_expand);
            }
            $pmh = trim($screen->pmh ?? '');
            $fh = trim($screen->fh ?? '');

            // การตรวจร่างกาย (Physical Examination)
            $peGa = trim($screen->pe_ga_text ?? '');
            $peHeent = trim($screen->pe_heent_text ?? '');
            $peChest = trim($screen->pe_chest_text ?? ($screen->pe_lung_text ?? ''));
            $peCvs = trim($screen->pe_heart_text ?? '');
            $peAb = trim($screen->pe_ab_text ?? '');
            $peExt = trim($screen->pe_ext_text ?? '');
            $peNeuro = trim($screen->pe_neuro_text ?? '');
            $generalPe = trim($screen->pe ?? '');

            // การวินิจฉัยโรค (Diagnosis)
            $provisionalList = [];
            if (!empty($ipt->provision_dx)) {
                $provisionalList[] = trim($ipt->provision_dx);
            }
            if (!empty($ipt->prediag)) {
                $provisionalList[] = trim($ipt->prediag);
            }

            // ตรวจหาจาก iptdiag ถ้ามี
            if (Schema::connection('hosxp')->hasTable('iptdiag')) {
                $diags = $conn->table('iptdiag as d')
                    ->leftJoin('icd101 as icd', 'icd.code', '=', 'd.icd10')
                    ->where('d.an', $an)
                    ->orderBy('d.diagtype')
                    ->select(['d.icd10', 'd.diagtype', 'icd.name as icd_name', 'icd.tname as icd_tname'])
                    ->get();

                foreach ($diags as $d) {
                    $dName = $d->icd_tname ?: ($d->icd_name ?: $d->icd10);
                    $line = $d->icd10 ? "{$d->icd10} : {$dName}" : $dName;
                    if (!in_array($line, $provisionalList, true)) {
                        $provisionalList[] = $line;
                    }
                }
            }

            // 8. แล็บสำคัญของ Visit นี้ (ถ้ามี)
            $labLines = [];
            try {
                if (Schema::connection('hosxp')->hasTable('lab_head') && Schema::connection('hosxp')->hasTable('lab_order')) {
                    $labOrders = $conn->table('lab_head as lh')
                        ->join('lab_order as lo', 'lo.lab_order_number', '=', 'lh.lab_order_number')
                        ->leftJoin('lab_items as li', 'li.lab_items_code', '=', 'lo.lab_items_code')
                        ->where(function ($q) use ($vn, $an) {
                            if ($vn !== '') $q->where('lh.vn', $vn);
                            if ($an !== '') $q->orWhere('lh.vn', $an);
                        })
                        ->whereNotNull('lo.lab_order_result')
                        ->where('lo.lab_order_result', '<>', '')
                        ->select([
                            'lh.form_name',
                            'li.lab_items_name',
                            'li.lab_items_unit',
                            'lo.lab_order_result',
                        ])
                        ->limit(30)
                        ->get();

                    foreach ($labOrders as $lo) {
                        $item = trim($lo->lab_items_name ?: 'Lab');
                        $res = trim($lo->lab_order_result);
                        $unit = trim($lo->lab_items_unit ?? '');
                        $labLines[] = "{$item} : {$res} {$unit}";
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('Cannot fetch lab orders: ' . $e->getMessage());
            }

            return [
                'hospital_name' => 'โรงพยาบาลค่ายสุรสิงหนาท',
                'admit_date' => $this->formatThaiDate($refDate),
                'admit_date_raw' => $refDate,
                'admit_time' => $refTime ? substr($refTime, 0, 5) : '',
                'patient_name' => $fullName,
                'age' => $age,
                'gender' => $gender,
                'hn' => $hn,
                'an' => $an,
                'vn' => $vn,
                'ward' => $wardName,
                'main_dep_name' => $mainDepName,
                'pttype' => $pttypeName,

                // ข้อมูลทางคลินิก
                'chief_complaint' => $cc,
                'present_illness' => $hpi,
                'prev_treatment_opt' => 'none',
                'prev_treatment_detail' => '',

                // ประวัติเดิม
                'allergy_opt' => $hasAllergy ? 'yes' : 'none',
                'allergy_detail' => $allergyDetail,
                'pmh_opt' => $pmh ? 'yes' : 'no',
                'pmh_detail' => $pmh,
                'surg_opt' => 'none',
                'surg_detail' => '',
                'med_opt' => 'no',
                'med_detail' => '',
                'smoke_opt' => $smokingOpt,
                'smoke_detail' => $smokingDetail,
                'alcohol_opt' => $alcoholOpt,
                'alcohol_detail' => $alcoholDetail,
                'fh_opt' => $fh ? 'yes' : 'no',
                'fh_detail' => $fh,
                'lmp_na' => true,
                'lmp_detail' => '-',
                'vac_na' => true,
                'vac_detail' => '-',

                // สัญญาณชีพ
                'vital_signs' => [
                    'temperature' => $temperature,
                    'pulse' => $pulse,
                    'rr' => $rr,
                    'spo2' => $spo2,
                    'bp' => $bp,
                    'bw' => $bw,
                    'height' => $height,
                    'bmi' => $bmi,
                    'pain_score' => $painScore,
                ],

                // การตรวจร่างกาย
                'pe' => [
                    'general_pe' => $generalPe,
                    'ga' => $peGa,
                    'heent' => $peHeent,
                    'chest' => $peChest,
                    'cvs' => $peCvs,
                    'ab' => $peAb,
                    'ext' => $peExt,
                    'neuro' => $peNeuro,
                ],

                // ผลแล็บ
                'labs_text' => implode("\n", $labLines),

                // ปัญหา & การวินิจฉัย
                'problem_list' => '',
                'provisional_diagnosis' => implode("\n", $provisionalList),
                'plan_of_management' => '',

                // แพทย์
                'doctor_name' => $doctorName,
                'doctor_license' => $doctorLicense,
            ];

        } catch (\Throwable $e) {
            Log::error('IpdHosxpService getAdmissionNotePrefill error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * คำนวณอายุเป็นจำนวนปีบริบูรณ์
     */
    private function calculateAge(?string $birthday, ?string $asOfDate = null): string
    {
        if (empty($birthday) || $birthday === '0000-00-00') {
            return '';
        }

        try {
            $birth = Carbon::parse($birthday);
            $target = $asOfDate && $asOfDate !== '0000-00-00' ? Carbon::parse($asOfDate) : Carbon::now();
            return (string) ((int) $birth->diffInYears($target));
        } catch (\Throwable $e) {
            return '';
        }
    }

    /**
     * แปลงรูปแบบวันที่เป็น วว/ดด/ปปปป (พ.ศ.)
     */
    private function formatThaiDate(?string $date): string
    {
        if (empty($date) || $date === '0000-00-00') {
            return '';
        }

        try {
            $c = Carbon::parse($date);
            $thaiYear = $c->year + 543;
            return sprintf('%02d/%02d/%04d', $c->day, $c->month, $thaiYear);
        } catch (\Throwable $e) {
            return (string) $date;
        }
    }

    /**
     * ดึงรายชื่อแพทย์จากตาราง doctor ใน HOSxP โดยกรองเฉพาะที่มีเลขใบอนุญาต (licenseno)
     *
     * @return array<int, array{code: string, name: string, licenseno: string, active: string, label: string}>
     */
    public function getDoctorsWithLicense(?string $search = null, int $limit = 150): array
    {
        try {
            $conn = DB::connection('hosxp');
            $query = $conn->table('doctor')
                ->where('position_id', '1')
                ->whereNotNull('licenseno')
                ->where('licenseno', '<>', '')
                ->whereRaw("TRIM(licenseno) <> ''");

            // กรองสถานะ active (เฉพาะแพทย์ที่ยังปฏิบัติงาน หรือไม่ระบุ)
            $query->where(function ($q) {
                $q->whereNull('active')->orWhere('active', 'Y');
            });

            if (!empty($search)) {
                $search = trim($search);
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('licenseno', 'like', "%{$search}%")
                      ->orWhere('code', 'like', "%{$search}%")
                      ->orWhere('fname', 'like', "%{$search}%")
                      ->orWhere('lname', 'like', "%{$search}%");
                });
            }

            $rows = $query->select([
                'code',
                'name',
                'licenseno',
                'active',
                'pname',
                'fname',
                'lname',
            ])
            ->orderBy('name', 'asc')
            ->limit($limit)
            ->get();

            return $rows->map(function ($row) {
                $displayName = trim($row->name ?: (($row->pname ?? '') . ($row->fname ?? '') . ' ' . ($row->lname ?? '')));
                $license = trim((string) ($row->licenseno ?? ''));

                return [
                    'code' => (string) $row->code,
                    'name' => $displayName,
                    'licenseno' => $license,
                    'active' => (string) ($row->active ?? 'Y'),
                    'label' => $license !== '' ? "{$displayName} ({$license})" : $displayName,
                ];
            })->values()->all();

        } catch (\Throwable $e) {
            Log::error('IpdHosxpService getDoctorsWithLicense error: ' . $e->getMessage());
            return [];
        }
    }
}
