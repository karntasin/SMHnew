<?php

namespace App\Http\Controllers;

use App\Services\Risk\ThaiAscvdCalculator;
use Box\Spout\Writer\Common\Creator\WriterEntityFactory;
use Box\Spout\Common\Entity\Row;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CvRiskReportController extends Controller
{
    public function export(Request $request)
    {
        $startDate = $request->input('start_date', Carbon::now()->subMonths(12)->format('Y-m-d'));
        $endDate = $request->input('end_date', Carbon::now()->format('Y-m-d'));
        $riskLevel = $request->input('risk_level', 'all'); // all, high (>=20%), very_high (>=30%)
        
        $conn = DB::connection('hosxp');
        $calc = app(ThaiAscvdCalculator::class);
        
        $tcCodes = array_map('trim', config('thai_ascvd.lab_codes.tc', ['CHOL', 'TC']));
        $hdlCodes = array_map('trim', config('thai_ascvd.lab_codes.hdl', ['HDL', 'HDL-C']));
        $smokingCurrentIds = array_map('intval', config('thai_ascvd.smoking_current_ids', [3]));

        // Build base latest visit per patient
        $base = $conn->table('ovst as o')
            ->selectRaw('o.hn, MAX(o.vstdate) as last_vstdate')
            ->whereBetween('o.vstdate', [$startDate, $endDate])
            ->groupBy('o.hn');

        $baseRows = $conn->table(DB::raw("({$base->toSql()}) as b"))
            ->mergeBindings($base)
            ->join('ovst as o', function($j){ $j->on('o.hn','=','b.hn')->on('o.vstdate','=','b.last_vstdate'); })
            ->selectRaw('b.hn, b.last_vstdate, MAX(o.vn) as last_vn')
            ->groupBy('b.hn', 'b.last_vstdate')
            ->get();

        if ($baseRows->isEmpty()) {
            return response()->json(['message' => 'No data found'], 404);
        }

        $hns = $baseRows->pluck('hn')->unique()->values()->all();
        $vnByHn = $baseRows->keyBy('hn');

        // Fetch demographics
        $persons = $conn->table('patient as p')
            ->select('p.hn', 'p.cid', 'p.pname', 'p.fname', 'p.lname', 'p.sex', 'p.birthday', 'p.moopart', 'p.tmbpart', 'p.amppart', 'p.chwpart')
            ->whereIn('p.hn', $hns)
            ->get()
            ->keyBy('hn');

        // Fetch vitals
        $vns = $baseRows->pluck('last_vn')->unique()->values()->all();
        $screens = $conn->table('opdscreen as s')
            ->select('s.vn', 's.bps', 's.bpd', 's.smoking_type_id', 's.bw', 's.height')
            ->whereIn('s.vn', $vns)
            ->get()
            ->keyBy('vn');

        // Fetch latest labs for each HN (not just from latest VN)
        $dbName = $conn->getDatabaseName();
        $hasLor = $conn->table('information_schema.tables')
            ->where('table_schema', $dbName)
            ->where('table_name', 'lab_order_result')
            ->exists();

        // Get latest lab results for each HN
        $labByHn = [];
        foreach ($hns as $hn) {
            $labQuery = $conn->table('lab_head as lh')
                ->join('ovst as o', 'o.vn', '=', 'lh.vn')
                ->join('lab_order as lo', 'lo.lab_order_number', '=', 'lh.lab_order_number')
                ->join('lab_items as li', 'li.lab_items_code', '=', 'lo.lab_items_code')
                ->where('o.hn', $hn)
                ->where(function($q) use ($tcCodes, $hdlCodes){
                    $q->whereIn('li.lab_items_code', $tcCodes)->orWhereIn('li.lab_items_code', $hdlCodes);
                })
                ->orderBy('lh.report_date', 'desc')
                ->orderBy('lh.lab_order_number', 'desc')
                ->limit(50); // Get recent labs to find latest valid results

            if ($hasLor) {
                $labQuery = $labQuery
                    ->leftJoin('lab_order_result as lr', function($j){ 
                        $j->on('lr.lab_order_number','=','lo.lab_order_number')
                          ->on('lr.lab_items_code','=','lo.lab_items_code'); 
                    })
                    ->select('lh.report_date', 'li.lab_items_code as code', DB::raw('COALESCE(lr.lab_order_result, lo.lab_order_result) as result'));
            } else {
                $labQuery = $labQuery
                    ->select('lh.report_date', 'li.lab_items_code as code', 'lo.lab_order_result as result');
            }

            $labRows = $labQuery->get();
            
            // Find latest TC and HDL with dates
            $latestTc = null;
            $latestTcDate = null;
            $latestHdl = null;
            $latestHdlDate = null;
            
            foreach ($labRows as $lr) {
                $code = strtoupper(trim($lr->code));
                $val = is_numeric($lr->result) ? (float)$lr->result : null;
                if ($val === null || $val <= 0) continue;
                
                // Check if this is TC
                foreach ($tcCodes as $tcCode) {
                    if (strtoupper($tcCode) === $code && $latestTc === null) {
                        $latestTc = $val;
                        $latestTcDate = $lr->report_date;
                        break;
                    }
                }
                
                // Check if this is HDL
                foreach ($hdlCodes as $hdlCode) {
                    if (strtoupper($hdlCode) === $code && $latestHdl === null) {
                        $latestHdl = $val;
                        $latestHdlDate = $lr->report_date;
                        break;
                    }
                }
                
                // Stop if we have both
                if ($latestTc !== null && $latestHdl !== null) break;
            }
            
            if ($latestTc !== null || $latestHdl !== null) {
                $labByHn[$hn] = [
                    'tc' => $latestTc,
                    'tc_date' => $latestTcDate,
                    'hdl' => $latestHdl,
                    'hdl_date' => $latestHdlDate,
                ];
            }
        }

        // DM and HT from chronic
        $dmSet = [];
        $htSet = [];
        try {
            $hasChronic = $conn->table('information_schema.tables')
                ->where('table_schema', $dbName)
                ->where('table_name', 'chronic')
                ->exists();

            if ($hasChronic) {
                $chronic = $conn->table('chronic')
                    ->select('hn', 'clinic')
                    ->whereIn('hn', $hns)
                    ->get();
                foreach ($chronic as $c) {
                    $clinic = strtolower(trim($c->clinic ?? ''));
                    if (in_array($clinic, ['dm', 'ncd', 'dm/ht'])) {
                        $dmSet[$c->hn] = true;
                    }
                    if (in_array($clinic, ['ht', 'ncd', 'dm/ht'])) {
                        $htSet[$c->hn] = true;
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Could not read chronic table', ['error' => $e->getMessage()]);
        }

        // Calculate risks
        $results = [];
        foreach ($vnByHn as $hn => $info) {
            $vn = $info->last_vn;
            $date = $info->last_vstdate;

            $person = $persons->get($hn);
            if (!$person) continue;

            $sex = ((int)$person->sex === 1) ? 'male' : 'female';
            $age = (int) floor((strtotime($date) - strtotime($person->birthday)) / (365.25*24*3600));

            $scr = $screens->get($vn);
            $sbp = $scr && is_numeric($scr->bps) ? (float)$scr->bps : null;
            $dbp = $scr && is_numeric($scr->bpd) ? (float)$scr->bpd : null;
            $smoker = $scr && in_array((int)$scr->smoking_type_id, $smokingCurrentIds, true);
            $weight = ($scr && isset($scr->bw) && is_numeric($scr->bw)) ? (float)$scr->bw : null;
            $height = ($scr && isset($scr->height) && is_numeric($scr->height)) ? (float)$scr->height : null;

            // Get latest lab results for this HN within 3 months
            $labs = $labByHn[$hn] ?? [];
            $tc = null;
            $hdl = null;
            $tcDate = null;
            $hdlDate = null;
            
            // Check if TC is within 3 months from visit date
            if (isset($labs['tc']) && isset($labs['tc_date'])) {
                $daysDiff = (strtotime($date) - strtotime($labs['tc_date'])) / 86400;
                if ($daysDiff >= 0 && $daysDiff <= 90) { // Within 3 months (90 days)
                    $tc = $labs['tc'];
                    $tcDate = $labs['tc_date'];
                }
            }
            
            // Check if HDL is within 3 months from visit date
            if (isset($labs['hdl']) && isset($labs['hdl_date'])) {
                $daysDiff = (strtotime($date) - strtotime($labs['hdl_date'])) / 86400;
                if ($daysDiff >= 0 && $daysDiff <= 90) { // Within 3 months (90 days)
                    $hdl = $labs['hdl'];
                    $hdlDate = $labs['hdl_date'];
                }
            }

            $dm = isset($dmSet[$hn]);
            $onTx = isset($htSet[$hn]);

            $result = $calc->calculate([
                'sex' => $sex,
                'age' => $age,
                'sbp' => $sbp,
                'tc' => $tc,
                'hdl' => $hdl,
                'dm' => $dm,
                'smoker' => $smoker,
                'on_treatment' => $onTx,
            ]);

            if ($result === null) continue;

            $risk = $result['risk'];
            $tcUsed = $result['tc_used'];
            $tcEstimated = $result['tc_estimated'];
            $hdlUsed = $result['hdl_used'];
            $hdlEstimated = $result['hdl_estimated'];
            
            // Determine calculation method
            if ($tcEstimated && $hdlEstimated) {
                $calculationMethod = 'ไม่มีผล Lab (ใช้ค่าประมาณการ)';
            } elseif (!$tcEstimated && !$hdlEstimated) {
                $calculationMethod = 'มีผล Lab ครบถ้วน';
            } else {
                $calculationMethod = 'มีผล Lab บางส่วน';
            }

            // Filter by risk level
            if ($riskLevel === 'high' && $risk < 20) continue;
            if ($riskLevel === 'very_high' && $risk < 30) continue;

            // Determine risk category
            $category = 'Low';
            if ($risk >= 40) $category = 'Very High (>=40%)';
            elseif ($risk >= 30) $category = 'High (30-39%)';
            elseif ($risk >= 20) $category = 'Moderate High (20-29%)';
            elseif ($risk >= 10) $category = 'Moderate (10-19%)';

            $results[] = [
                'hn' => $hn,
                'cid' => $person->cid ?? '',
                'sex' => $sex === 'male' ? 'ชาย' : 'หญิง',
                'age' => $age,
                'visit_date' => $date,
                'sbp' => $sbp,
                'dbp' => $dbp,
                'tc' => $tc, // ค่าจริงจาก lab (อาจเป็น null)
                'tc_date' => $tcDate, // วันที่ตรวจจริง (อาจเป็น null)
                'hdl' => $hdl, // ค่าจริงจาก lab (อาจเป็น null)
                'hdl_date' => $hdlDate, // วันที่ตรวจจริง (อาจเป็น null)
                'tc_hdl_ratio' => ($tcUsed && $hdlUsed) ? round($tcUsed / $hdlUsed, 2) : null,
                'calculation_method' => $calculationMethod, // วิธีการคำนวณ
                'dm' => $dm ? 'Yes' : 'No',
                'smoker' => $smoker ? 'Yes' : 'No',
                'ht_treatment' => $onTx ? 'Yes' : 'No',
                'weight' => $weight,
                'height' => $height,
                'bmi' => ($weight && $height && $height > 0) ? round($weight / (($height/100) ** 2), 1) : null,
                'cv_risk_score' => $risk,
                'risk_category' => $category,
            ];
        }

        // Sort by risk score (highest first)
        usort($results, function($a, $b) {
            return $b['cv_risk_score'] <=> $a['cv_risk_score'];
        });

        $format = $request->input('format', 'excel');

        if ($format === 'json') {
            return response()->json([
                'total' => count($results),
                'start_date' => $startDate,
                'end_date' => $endDate,
                'risk_level_filter' => $riskLevel,
                'generated_at' => now()->toISOString(),
                'data' => $results,
            ]);
        }

        if ($format === 'csv') {
            return $this->exportCsv($results, $startDate, $endDate, $riskLevel);
        }

        // Default: Excel export
        return $this->exportExcel($results, $startDate, $endDate, $riskLevel);
    }

    /**
     * Export data as Excel file using Box\Spout
     */
    private function exportExcel(array $data, string $startDate, string $endDate, string $riskLevel)
    {
        $fileName = 'cv_risk_report_' . date('Ymd_His') . '.xlsx';

        $headers = [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"$fileName\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function() use ($data) {
            // Create XLSX writer
            $writer = WriterEntityFactory::createXLSXWriter();
            $writer->openToFile('php://output');

            // Add header row
            $headerCells = [
                WriterEntityFactory::createCell('HN'),
                WriterEntityFactory::createCell('เลขบัตรประชาชน'),
                WriterEntityFactory::createCell('เพศ'),
                WriterEntityFactory::createCell('อายุ'),
                WriterEntityFactory::createCell('วันที่มารักษา'),
                WriterEntityFactory::createCell('SBP (mmHg)'),
                WriterEntityFactory::createCell('DBP (mmHg)'),
                WriterEntityFactory::createCell('TC (mg/dL)'),
                WriterEntityFactory::createCell('วันที่ตรวจ TC'),
                WriterEntityFactory::createCell('HDL (mg/dL)'),
                WriterEntityFactory::createCell('วันที่ตรวจ HDL'),
                WriterEntityFactory::createCell('TC/HDL Ratio'),
                WriterEntityFactory::createCell('วิธีคำนวณ'),
                WriterEntityFactory::createCell('เบาหวาน'),
                WriterEntityFactory::createCell('สูบบุหรี่'),
                WriterEntityFactory::createCell('รับประทานยาความดัน'),
                WriterEntityFactory::createCell('น้ำหนัก (kg)'),
                WriterEntityFactory::createCell('ส่วนสูง (cm)'),
                WriterEntityFactory::createCell('BMI'),
                WriterEntityFactory::createCell('CV Risk Score (%)'),
                WriterEntityFactory::createCell('ระดับความเสี่ยง'),
            ];
            $headerRow = WriterEntityFactory::createRow($headerCells);
            $writer->addRow($headerRow);

            // Add data rows
            foreach ($data as $row) {
                $dataCells = [
                    WriterEntityFactory::createCell($row['hn']),
                    WriterEntityFactory::createCell($row['cid']),
                    WriterEntityFactory::createCell($row['sex']),
                    WriterEntityFactory::createCell($row['age']),
                    WriterEntityFactory::createCell($row['visit_date']),
                    WriterEntityFactory::createCell($row['sbp'] ?? ''),
                    WriterEntityFactory::createCell($row['dbp'] ?? ''),
                    WriterEntityFactory::createCell($row['tc'] ?? ''),
                    WriterEntityFactory::createCell($row['tc_date'] ?? ''),
                    WriterEntityFactory::createCell($row['hdl'] ?? ''),
                    WriterEntityFactory::createCell($row['hdl_date'] ?? ''),
                    WriterEntityFactory::createCell($row['tc_hdl_ratio'] ?? ''),
                    WriterEntityFactory::createCell($row['calculation_method']),
                    WriterEntityFactory::createCell($row['dm']),
                    WriterEntityFactory::createCell($row['smoker']),
                    WriterEntityFactory::createCell($row['ht_treatment']),
                    WriterEntityFactory::createCell($row['weight'] ?? ''),
                    WriterEntityFactory::createCell($row['height'] ?? ''),
                    WriterEntityFactory::createCell($row['bmi'] ?? ''),
                    WriterEntityFactory::createCell($row['cv_risk_score']),
                    WriterEntityFactory::createCell($row['risk_category']),
                ];
                $dataRow = WriterEntityFactory::createRow($dataCells);
                $writer->addRow($dataRow);
            }

            $writer->close();
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Export data as CSV file
     */
    private function exportCsv(array $results, string $startDate, string $endDate, string $riskLevel)
    {
        $filename = "cv_risk_report_" . date('Ymd_His') . ".csv";
        
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function() use ($results) {
            $file = fopen('php://output', 'w');
            
            // Add BOM for UTF-8
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));
            
            // CSV Headers
            fputcsv($file, [
                'HN',
                'Citizen ID',
                'Sex',
                'Age',
                'Visit Date',
                'SBP (mmHg)',
                'DBP (mmHg)',
                'TC (mg/dL)',
                'TC Lab Date',
                'HDL (mg/dL)',
                'HDL Lab Date',
                'TC/HDL Ratio',
                'Calculation Method',
                'Diabetes',
                'Smoker',
                'HT Treatment',
                'Weight (kg)',
                'Height (cm)',
                'BMI',
                'CV Risk Score (%)',
                'Risk Category',
            ]);

            // Data rows
            foreach ($results as $row) {
                fputcsv($file, [
                    $row['hn'],
                    $row['cid'],
                    $row['sex'],
                    $row['age'],
                    $row['visit_date'],
                    $row['sbp'],
                    $row['dbp'],
                    $row['tc'],
                    $row['tc_date'],
                    $row['hdl'],
                    $row['hdl_date'],
                    $row['tc_hdl_ratio'],
                    $row['calculation_method'],
                    $row['dm'],
                    $row['smoker'],
                    $row['ht_treatment'],
                    $row['weight'],
                    $row['height'],
                    $row['bmi'],
                    $row['cv_risk_score'],
                    $row['risk_category'],
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
