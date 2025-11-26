<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Box\Spout\Writer\Common\Creator\WriterEntityFactory;
use Symfony\Component\HttpFoundation\StreamedResponse;

class HosxpReportController extends Controller
{
    public function index()
    {
        return Inertia::render('HosxpReports/Index', [
            'reports' => [
                ['id' => 'patient_list', 'name' => 'รายชื่อผู้ป่วย (Patient List)', 'description' => 'รายชื่อผู้ป่วยทั้งหมดที่ลงทะเบียน'],
                ['id' => 'opd_visit', 'name' => 'ผู้ป่วยนอก (OPD Visits)', 'description' => 'ข้อมูลการรับบริการผู้ป่วยนอก'],
                ['id' => 'diagnosis', 'name' => 'การวินิจฉัยโรค (Diagnosis)', 'description' => 'รายงานการวินิจฉัยโรคตาม ICD-10'],
                ['id' => 'lab_report', 'name' => 'รายงานผลแล็บ (Lab Report)', 'description' => 'ข้อมูลการสั่งและผลตรวจทางห้องปฏิบัติการ'],
                ['id' => 'drug_report', 'name' => 'รายงานการใช้ยา (Drug Usage)', 'description' => 'ข้อมูลการสั่งยาผู้ป่วยนอก'],
                ['id' => 'xray_report', 'name' => 'รายงาน X-ray (X-ray Report)', 'description' => 'ข้อมูลการส่งตรวจทางรังสีวิทยา'],
                ['id' => 'ipd_admission', 'name' => 'ผู้ป่วยใน (IPD Admissions)', 'description' => 'ข้อมูลการรับผู้ป่วยไว้รักษาในโรงพยาบาล'],
            ]
        ]);
    }

    public function generate(Request $request)
    {
        $request->validate([
            'report_id' => 'required|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'limit' => 'nullable|integer|min:1|max:10000',
            'has_lab' => 'nullable|boolean',
            'has_drug' => 'nullable|boolean',
            'lab_item_name' => 'nullable|string',
            'lab_result_max' => 'nullable|numeric',
            'drug_name' => 'nullable|string',
        ]);

        $reportId = $request->input('report_id');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $limit = $request->input('limit', 1000);
        $hasLab = $request->boolean('has_lab');
        $hasDrug = $request->boolean('has_drug');
        $labItemName = $request->input('lab_item_name');
        $labResultMax = $request->input('lab_result_max');
        $drugName = $request->input('drug_name');

        $fileName = $reportId . '_' . date('Ymd_His') . '.xlsx';

        return new StreamedResponse(function () use ($reportId, $startDate, $endDate, $limit, $hasLab, $hasDrug, $labItemName, $labResultMax, $drugName) {
            $writer = WriterEntityFactory::createXLSXWriter();
            $writer->openToFile('php://output');

            try {
                // Check connection
                try {
                    DB::connection('hosxp')->getPdo();
                } catch (\Exception $e) {
                    // Fallback for demo/testing if connection fails
                    $this->generateMockData($writer, $reportId);
                    $writer->close();
                    return;
                }

                switch ($reportId) {
                    case 'patient_list':
                        $this->exportPatientList($writer, $startDate, $endDate, $limit);
                        break;
                    case 'opd_visit':
                        $this->exportOpdVisits($writer, $startDate, $endDate, $limit, $hasLab, $hasDrug);
                        break;
                    case 'diagnosis':
                        $this->exportDiagnosis($writer, $startDate, $endDate, $limit);
                        break;
                    case 'lab_report':
                        $this->exportLabReport($writer, $startDate, $endDate, $limit, $labItemName, $labResultMax);
                        break;
                    case 'drug_report':
                        $this->exportDrugReport($writer, $startDate, $endDate, $limit, $drugName);
                        break;
                    case 'xray_report':
                        $this->exportXrayReport($writer, $startDate, $endDate, $limit);
                        break;
                    case 'ipd_admission':
                        $this->exportIpdAdmissions($writer, $startDate, $endDate, $limit);
                        break;
                    default:
                        $writer->addRow(WriterEntityFactory::createRowFromArray(['Error', 'Unknown Report ID']));
                }
            } catch (\Exception $e) {
                $writer->addRow(WriterEntityFactory::createRowFromArray(['Error', $e->getMessage()]));
            }

            $writer->close();
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
        ]);
    }

    private function generateMockData($writer, $reportId)
    {
        $writer->addRow(WriterEntityFactory::createRowFromArray(['Note', 'Database connection failed. Showing mock data.']));
        
        if ($reportId === 'patient_list') {
            $writer->addRow(WriterEntityFactory::createRowFromArray(['HN', 'CID', 'Name', 'Birthdate']));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['000001', '1234567890123', 'John Doe', '1980-01-01']));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['000002', '9876543210987', 'Jane Smith', '1990-05-15']));
        } elseif ($reportId === 'opd_visit') {
            $writer->addRow(WriterEntityFactory::createRowFromArray(['VN', 'HN', 'Date', 'Department', 'Symptom']));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['2401010001', '000001', '2024-01-01', 'OPD', 'Fever']));
        } elseif ($reportId === 'lab_report') {
            $writer->addRow(WriterEntityFactory::createRowFromArray(['VN', 'HN', 'Date', 'Lab Item', 'Result']));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['2401010001', '000001', '2024-01-01', 'FBS', '100']));
        } elseif ($reportId === 'drug_report') {
            $writer->addRow(WriterEntityFactory::createRowFromArray(['VN', 'HN', 'Date', 'Drug Name', 'Qty']));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['2401010001', '000001', '2024-01-01', 'Paracetamol', '20']));
        } else {
            $writer->addRow(WriterEntityFactory::createRowFromArray(['Column 1', 'Column 2']));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['Data 1', 'Data 2']));
        }
    }

    private function exportPatientList($writer, $startDate, $endDate, $limit)
    {
        $header = ['HN', 'CID', 'First Name', 'Last Name', 'Birthdate', 'Province', 'District', 'Subdistrict'];
        $writer->addRow(WriterEntityFactory::createRowFromArray($header));

        $query = DB::connection('hosxp')->table('patient')
            ->select('patient.hn', 'patient.cid', 'patient.fname', 'patient.lname', 'patient.birthdate', 
                     'thaiaddress.chwpart', 'thaiaddress.amppart', 'thaiaddress.tmbpart')
            ->leftJoin('thaiaddress', function($join) {
                $join->on('patient.chwpart', '=', 'thaiaddress.chwpart')
                     ->on('patient.amppart', '=', 'thaiaddress.amppart')
                     ->on('patient.tmbpart', '=', 'thaiaddress.tmbpart');
            });

        if ($startDate) {
            // Assuming we filter by registration date or similar if available, but patient table usually doesn't have a clear "created_at" for reporting range unless specified.
            // Let's assume we just dump all or limit. For safety, let's limit.
            $query->limit($limit);
        } else {
            $query->limit($limit);
        }

        foreach ($query->cursor() as $row) {
            $writer->addRow(WriterEntityFactory::createRowFromArray((array)$row));
        }
    }

    private function exportOpdVisits($writer, $startDate, $endDate, $limit, $hasLab, $hasDrug)
    {
        $header = ['VN', 'HN', 'Visit Date', 'Department', 'Symptom', 'BP Systolic', 'BP Diastolic'];
        $writer->addRow(WriterEntityFactory::createRowFromArray($header));

        $query = DB::connection('hosxp')->table('ovst')
            ->join('opdscreen', 'ovst.vn', '=', 'opdscreen.vn')
            ->select('ovst.vn', 'ovst.hn', 'ovst.vstdate', 'ovst.spclty', 'opdscreen.symptom', 'opdscreen.bpsys', 'opdscreen.bpdia');

        if ($startDate) {
            $query->whereDate('ovst.vstdate', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('ovst.vstdate', '<=', $endDate);
        }

        if ($hasLab) {
            $query->whereExists(function ($query) {
                $query->select(DB::raw(1))
                      ->from('lab_head')
                      ->whereColumn('lab_head.vn', 'ovst.vn');
            });
        }

        if ($hasDrug) {
            $query->whereExists(function ($query) {
                $query->select(DB::raw(1))
                      ->from('opitemrece')
                      ->whereColumn('opitemrece.vn', 'ovst.vn')
                      ->where('opitemrece.icode', 'like', '1%'); // Assuming drugs start with 1, adjust as per HOSxP structure
            });
        }
        
        $query->limit($limit);

        foreach ($query->cursor() as $row) {
            $writer->addRow(WriterEntityFactory::createRowFromArray((array)$row));
        }
    }

    private function exportDiagnosis($writer, $startDate, $endDate, $limit)
    {
        $header = ['VN', 'HN', 'Visit Date', 'ICD10', 'Diagnosis Type'];
        $writer->addRow(WriterEntityFactory::createRowFromArray($header));

        $query = DB::connection('hosxp')->table('ovstdiag')
            ->join('ovst', 'ovstdiag.vn', '=', 'ovst.vn')
            ->select('ovstdiag.vn', 'ovstdiag.hn', 'ovst.vstdate', 'ovstdiag.icd10', 'ovstdiag.diagtype');

        if ($startDate) {
            $query->whereDate('ovst.vstdate', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('ovst.vstdate', '<=', $endDate);
        }

        $query->limit($limit);

        foreach ($query->cursor() as $row) {
            $writer->addRow(WriterEntityFactory::createRowFromArray((array)$row));
        }
    }

    private function exportLabReport($writer, $startDate, $endDate, $limit, $labItemName = null, $labResultMax = null)
    {
        $header = ['VN', 'HN', 'Order Date', 'Lab Item Code', 'Lab Item Name', 'Lab Result', 'Normal Value'];
        $writer->addRow(WriterEntityFactory::createRowFromArray($header));

        $query = DB::connection('hosxp')->table('lab_order')
            ->join('lab_head', 'lab_order.lab_order_number', '=', 'lab_head.lab_order_number')
            ->leftJoin('lab_items', 'lab_order.lab_items_code', '=', 'lab_items.lab_items_code')
            ->select('lab_head.vn', 'lab_head.hn', 'lab_head.order_date', 'lab_order.lab_items_code', 'lab_items.lab_items_name', 'lab_order.lab_order_result', 'lab_items.lab_items_normal_value');

        if ($startDate) {
            $query->whereDate('lab_head.order_date', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('lab_head.order_date', '<=', $endDate);
        }

        if ($labItemName) {
            $query->where('lab_items.lab_items_name', 'like', '%' . $labItemName . '%');
        }

        if ($labResultMax !== null && $labResultMax !== '') {
            // Note: lab_order_result is often varchar, so numeric comparison might be tricky or require casting.
            // We'll attempt a simple comparison, but in real HOSxP this might need REGEXP or casting.
            // For safety/simplicity in this generic implementation, we'll use whereRaw with casting if possible, 
            // or just standard where if we assume it's numeric.
            // Let's try standard where first, but be aware of non-numeric results.
            $query->whereRaw('CAST(lab_order.lab_order_result AS DECIMAL(10,2)) <= ?', [$labResultMax]);
        }

        $query->limit($limit);

        foreach ($query->cursor() as $row) {
            $writer->addRow(WriterEntityFactory::createRowFromArray((array)$row));
        }
    }

    private function exportDrugReport($writer, $startDate, $endDate, $limit, $drugName = null)
    {
        $header = ['VN', 'HN', 'Date', 'Drug Code', 'Drug Name', 'Qty', 'Price'];
        $writer->addRow(WriterEntityFactory::createRowFromArray($header));

        $query = DB::connection('hosxp')->table('opitemrece')
            ->join('drugitems', 'opitemrece.icode', '=', 'drugitems.icode')
            ->select('opitemrece.vn', 'opitemrece.hn', 'opitemrece.vstdate', 'opitemrece.icode', 'drugitems.name', 'opitemrece.qty', 'opitemrece.sum_price');

        if ($startDate) {
            $query->whereDate('opitemrece.vstdate', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('opitemrece.vstdate', '<=', $endDate);
        }

        if ($drugName) {
            $query->where('drugitems.name', 'like', '%' . $drugName . '%');
        }

        $query->limit($limit);

        foreach ($query->cursor() as $row) {
            $writer->addRow(WriterEntityFactory::createRowFromArray((array)$row));
        }
    }

    private function exportXrayReport($writer, $startDate, $endDate, $limit)
    {
        $header = ['VN', 'HN', 'Date', 'X-ray Item', 'Result Note'];
        $writer->addRow(WriterEntityFactory::createRowFromArray($header));

        // Assuming standard HOSxP xray tables, might vary
        $query = DB::connection('hosxp')->table('xray_report')
            ->join('xray_items', 'xray_report.xray_items_code', '=', 'xray_items.xray_items_code')
            ->select('xray_report.vn', 'xray_report.hn', 'xray_report.report_date', 'xray_items.xray_items_name', 'xray_report.report_text');

        if ($startDate) {
            $query->whereDate('xray_report.report_date', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('xray_report.report_date', '<=', $endDate);
        }

        $query->limit($limit);

        foreach ($query->cursor() as $row) {
            $writer->addRow(WriterEntityFactory::createRowFromArray((array)$row));
        }
    }

    private function exportIpdAdmissions($writer, $startDate, $endDate, $limit)
    {
        $header = ['AN', 'HN', 'Admit Date', 'Discharge Date', 'Ward', 'Diagnosis'];
        $writer->addRow(WriterEntityFactory::createRowFromArray($header));

        $query = DB::connection('hosxp')->table('ipt')
            ->leftJoin('iptdiag', function($join) {
                $join->on('ipt.an', '=', 'iptdiag.an')
                     ->where('iptdiag.diagtype', '=', '1'); // Principal Diagnosis
            })
            ->select('ipt.an', 'ipt.hn', 'ipt.regdate', 'ipt.dchdate', 'ipt.ward', 'iptdiag.icd10');

        if ($startDate) {
            $query->whereDate('ipt.regdate', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('ipt.regdate', '<=', $endDate);
        }

        $query->limit($limit);

        foreach ($query->cursor() as $row) {
            $writer->addRow(WriterEntityFactory::createRowFromArray((array)$row));
        }
    }
}
