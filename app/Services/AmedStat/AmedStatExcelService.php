<?php

namespace App\Services\AmedStat;

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

class AmedStatExcelService
{
    protected string $templateDir;

    protected array $monthNamesThai = [
        1 => 'มกราคม', 2 => 'กุมภาพันธ์', 3 => 'มีนาคม',
        4 => 'เมษายน', 5 => 'พฤษภาคม', 6 => 'มิถุนายน',
        7 => 'กรกฎาคม', 8 => 'สิงหาคม', 9 => 'กันยายน',
        10 => 'ตุลาคม', 11 => 'พฤศจิกายน', 12 => 'ธันวาคม',
    ];

    public function __construct()
    {
        $this->templateDir = storage_path('app/amed_templates');
    }

    public function getMonthName(int $month): string
    {
        return $this->monthNamesThai[$month] ?? (string) $month;
    }

    /**
     * Generate an Excel file for a given report.
     */
    public function generateReport(string $formId, array $data, int $yearBe, int $month): Spreadsheet
    {
        $templatePath = $this->templateDir.'/'.$formId.'.xlsx';

        if (file_exists($templatePath)) {
            $spreadsheet = IOFactory::load($templatePath);
        } else {
            $spreadsheet = new Spreadsheet();
            $spreadsheet->getActiveSheet()->setTitle('Sheet1');
        }

        $sheet = $spreadsheet->getActiveSheet();
        $monthName = $this->getMonthName($month);

        // Update header for unit and period
        $periodLabel = $data['period_label'] ?? "ประจำเดือน : {$monthName} พ.ศ. {$yearBe}";
        if ($sheet->getCell('A2')->getValue()) {
            $sheet->setCellValue('A2', 'หน่วยงาน : โรงพยาบาลค่ายสุรสิงหนาท');
        }
        if ($sheet->getCell('A3')->getValue()) {
            $sheet->setCellValue('A3', $periodLabel);
        }

        match ($formId) {
            'A0101' => $this->fillA0101($sheet, $data),
            'A0102' => $this->fillA0102($sheet, $data),
            'A0103' => $this->fillA0103($sheet, $data),
            'A0104' => $this->fillA0104($sheet, $data),
            'A0105' => $this->fillA0105($sheet, $data),
            'A0106' => $this->fillA0106($sheet, $data),
            'A0108' => $this->fillA0108($sheet, $data),
            'A0109' => $this->fillA0109($sheet, $data),
            'A0110' => $this->fillA0110($sheet, $data),
            'E0101' => $this->fillE0101($sheet, $data),
            'E0102' => $this->fillE0102($sheet, $data),
            default => null,
        };

        return $spreadsheet;
    }

    /**
     * Download a single report as Excel (.xlsx).
     */
    public function downloadExcel(string $formId, array $data, int $yearBe, int $month): BinaryFileResponse
    {
        $spreadsheet = $this->generateReport($formId, $data, $yearBe, $month);

        $tempFile = tempnam(sys_get_temp_dir(), 'amed_excel_');
        $writer = new Xlsx($spreadsheet);
        $writer->setPreCalculateFormulas(false);
        $writer->save($tempFile);

        $filename = "{$formId}_{$yearBe}_{$month}.xlsx";

        return response()->download($tempFile, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Download all reports in a month as a Zip archive.
     */
    public function downloadAllZip(array $reportsData, int $yearBe, int $month): BinaryFileResponse
    {
        $zipFile = tempnam(sys_get_temp_dir(), 'amed_zip_');
        $zip = new ZipArchive();
        $zip->open($zipFile, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        foreach ($reportsData as $formId => $data) {
            try {
                $spreadsheet = $this->generateReport($formId, $data, $yearBe, $month);
                $singleTemp = tempnam(sys_get_temp_dir(), 'amed_single_');
                $writer = new Xlsx($spreadsheet);
                $writer->setPreCalculateFormulas(false);
                $writer->save($singleTemp);

                $reportCode = $data['report_code'] ?? $formId;
                $entryName = "{$formId}_{$reportCode}_{$yearBe}_{$month}.xlsx";
                $zip->addFile($singleTemp, $entryName);
            } catch (\Throwable $e) {
                // Skip if error on single
            }
        }

        $zip->close();
        $zipFilename = "AmedStat_Reports_{$yearBe}_{$month}.zip";

        return response()->download($zipFile, $zipFilename, [
            'Content-Type' => 'application/zip',
        ])->deleteFileAfterSend(true);
    }

    protected function fillA0101($sheet, array $data): void
    {
        $rows = $data['rows'] ?? [];

        $rowMap = [
            'g1' => 7, 'g2' => 8, 'g3' => 9, 'g4' => 10, 'g5' => 11,
            'k1' => 13, 'k2' => 14, 'k3' => 15, 'k4' => 16, 'k5' => 17,
            'c1' => 19, 'c2' => 20, 'c3' => 21, 'c4' => 22, 'c5' => 23, 'c6' => 24, 'c7' => 25, 'c8' => 26,
        ];

        foreach ($rowMap as $k => $rowNum) {
            $item = $rows[$k] ?? [];
            $sheet->setCellValue("C{$rowNum}", (int) ($item['opd_new'] ?? 0));
            $sheet->setCellValue("D{$rowNum}", (int) ($item['opd_visits'] ?? 0));
            $sheet->setCellValue("E{$rowNum}", (int) ($item['ipd_brought'] ?? 0));
            $sheet->setCellValue("F{$rowNum}", (int) ($item['ipd_new'] ?? 0));
            $sheet->setCellValue("H{$rowNum}", (int) ($item['ipd_discharge'] ?? 0));
            $sheet->setCellValue("I{$rowNum}", (int) ($item['ipd_stay_days'] ?? 0));
        }
    }

    protected function fillA0102($sheet, array $data): void
    {
        $items = $data['items'] ?? [];
        $startRow = 7;

        foreach ($items as $idx => $it) {
            $r = $startRow + $idx;
            $sheet->setCellValue("A{$r}", $idx + 1);
            $sheet->setCellValue("B{$r}", $it['category'] ?? '');
            $sheet->setCellValue("C{$r}", $it['icd10_1'] ?? '');
            $sheet->setCellValue("D{$r}", $it['icd10_2'] ?? '');
            $sheet->setCellValue("E{$r}", (int) ($it['brought_forward'] ?? 0));
            $sheet->setCellValue("F{$r}", (int) ($it['new_admit'] ?? 0));
            $sheet->setCellValue("G{$r}", "=E{$r}+F{$r}");
            $sheet->setCellValue("H{$r}", (int) ($it['dis_disability'] ?? 0));
            $sheet->setCellValue("I{$r}", (int) ($it['dis_death'] ?? 0));
            $sheet->setCellValue("J{$r}", (int) ($it['dis_other'] ?? 0));
            $sheet->setCellValue("K{$r}", "=SUM(H{$r}:J{$r})");
        }
    }

    protected function fillA0103($sheet, array $data): void
    {
        $items = $data['items'] ?? [];
        $startRow = 7;

        foreach ($items as $idx => $it) {
            $r = $startRow + $idx;
            $sheet->setCellValue("A{$r}", $idx + 1);
            $sheet->setCellValue("B{$r}", $it['name'] ?? '');
            $sheet->setCellValue("C{$r}", $it['category'] ?? '');
            $sheet->setCellValue("D{$r}", $it['unit'] ?? '');
            $sheet->setCellValue("E{$r}", $it['disease_name'] ?? '');
            $sheet->setCellValue("F{$r}", $it['icd10'] ?? '');
            $sheet->setCellValue("G{$r}", $it['law_rule'] ?? '');
            $sheet->setCellValue("H{$r}", $it['discharge_date'] ?? '');
            $sheet->setCellValue("I{$r}", $it['doctor1'] ?? '');
            $sheet->setCellValue("J{$r}", $it['doctor2'] ?? '');
            $sheet->setCellValue("K{$r}", $it['doctor3'] ?? '');
        }
    }

    protected function fillA0104($sheet, array $data): void
    {
        $items = $data['items'] ?? [];
        $startRow = 7;

        foreach ($items as $idx => $it) {
            $r = $startRow + $idx;
            $sheet->setCellValue("A{$r}", $idx + 1);
            $sheet->setCellValue("B{$r}", $it['pname'] ?? '');
            $sheet->setCellValue("C{$r}", $it['hn'] ?? '');
            $sheet->setCellValue("D{$r}", $it['an'] ?? '');
            $sheet->setCellValue("E{$r}", $it['category'] ?? '');
            $sheet->setCellValue("F{$r}", $it['unit'] ?? '');
            $sheet->setCellValue("G{$r}", $it['age_year'] ?? 0);
            $sheet->setCellValue("H{$r}", $it['disease_name'] ?? '');
            $sheet->setCellValue("I{$r}", $it['icd10_1'] ?? '');
            $sheet->setCellValue("J{$r}", $it['icd10_2'] ?? '');
            $sheet->setCellValue("K{$r}", $it['death_date'] ?? '');
        }
    }

    protected function fillA0105($sheet, array $data): void
    {
        $items = $data['items'] ?? [];
        $startRow = 7;

        foreach ($items as $idx => $it) {
            $r = $it['row'] ?? ($startRow + $idx);
            if ($r > 315) {
                break;
            }

            // Columns C to G: Group ก (ก1 to ก5)
            $sheet->setCellValue("C{$r}", (int) ($it['g1'] ?? 0));
            $sheet->setCellValue("D{$r}", (int) ($it['g2'] ?? 0));
            $sheet->setCellValue("E{$r}", (int) ($it['g3'] ?? 0));
            $sheet->setCellValue("F{$r}", (int) ($it['g4'] ?? 0));
            $sheet->setCellValue("G{$r}", (int) ($it['g5'] ?? 0));

            // Columns H to L: Group ข (ข1 to ข5)
            $sheet->setCellValue("H{$r}", (int) ($it['k1'] ?? 0));
            $sheet->setCellValue("I{$r}", (int) ($it['k2'] ?? 0));
            $sheet->setCellValue("J{$r}", (int) ($it['k3'] ?? 0));
            $sheet->setCellValue("K{$r}", (int) ($it['k4'] ?? 0));
            $sheet->setCellValue("L{$r}", (int) ($it['k5'] ?? 0));

            // Columns M to T: Group ค (ค1 to ค8)
            $sheet->setCellValue("M{$r}", (int) ($it['c1'] ?? 0));
            $sheet->setCellValue("N{$r}", (int) ($it['c2'] ?? 0));
            $sheet->setCellValue("O{$r}", (int) ($it['c3'] ?? 0));
            $sheet->setCellValue("P{$r}", (int) ($it['c4'] ?? 0));
            $sheet->setCellValue("Q{$r}", (int) ($it['c5'] ?? 0));
            $sheet->setCellValue("R{$r}", (int) ($it['c6'] ?? 0));
            $sheet->setCellValue("S{$r}", (int) ($it['c7'] ?? 0));
            $sheet->setCellValue("T{$r}", (int) ($it['c8'] ?? 0));

            // Column U: Total
            $sheet->setCellValue("U{$r}", "=SUM(C{$r}:T{$r})");
        }

        // Row 316: Summary Total Row
        $summaryCols = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U'];
        foreach ($summaryCols as $col) {
            $sheet->setCellValue("{$col}316", "=SUM({$col}7:{$col}315)");
        }
    }

    protected function fillA0106($sheet, array $data): void
    {
        $items = $data['items'] ?? [];
        $startRow = 7;

        foreach ($items as $idx => $it) {
            $r = $startRow + $idx;
            if ($r > 19) {
                break;
            }

            // Col A: ลำดับ
            $sheet->setCellValue("A{$r}", $idx + 1);
            // Col B: หน่วยรับการสนับสนุน (ชื่อหน่วย)
            $sheet->setCellValue("B{$r}", $it['unit_name'] ?? '');

            // Col C to G: กลุ่ม ก (ก1 to ก5)
            $sheet->setCellValue("C{$r}", (int) ($it['g1'] ?? 0));
            $sheet->setCellValue("D{$r}", (int) ($it['g2'] ?? 0));
            $sheet->setCellValue("E{$r}", (int) ($it['g3'] ?? 0));
            $sheet->setCellValue("F{$r}", (int) ($it['g4'] ?? 0));
            $sheet->setCellValue("G{$r}", (int) ($it['g5'] ?? 0));

            // Col H to L: กลุ่ม ข (ข1 to ข5)
            $sheet->setCellValue("H{$r}", (int) ($it['k1'] ?? 0));
            $sheet->setCellValue("I{$r}", (int) ($it['k2'] ?? 0));
            $sheet->setCellValue("J{$r}", (int) ($it['k3'] ?? 0));
            $sheet->setCellValue("K{$r}", (int) ($it['k4'] ?? 0));
            $sheet->setCellValue("L{$r}", (int) ($it['k5'] ?? 0));

            // Col M to O: กลุ่ม ค (ค1, ค3, ค4)
            $sheet->setCellValue("M{$r}", (int) ($it['c1'] ?? 0));
            $sheet->setCellValue("N{$r}", (int) ($it['c3'] ?? 0));
            $sheet->setCellValue("O{$r}", (int) ($it['c4'] ?? 0));

            // Col P: รวม
            $sheet->setCellValue("P{$r}", "=SUM(C{$r}:O{$r})");
        }

        // Row 20: รวมทั้งสิ้น
        $sheet->setCellValue('B20', 'รวมทั้งสิ้น');
        $cols = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
        foreach ($cols as $c) {
            $sheet->setCellValue("{$c}20", "=SUM({$c}7:{$c}19)");
        }
    }

    protected function fillA0108($sheet, array $data): void
    {
        $items = $data['items'] ?? [];
        $map = [
            'ก' => 7,
            'ข' => 8,
            'ค' => 9,
        ];

        foreach ($items as $it) {
            $code = $it['code'] ?? '';
            if (isset($map[$code])) {
                $r = $map[$code];
                $sheet->setCellValue("C{$r}", (int) ($it['opd'] ?? 0));
                $sheet->setCellValue("D{$r}", (int) ($it['ipd'] ?? 0));
                $sheet->setCellValue("E{$r}", "=C{$r}+D{$r}");
            }
        }
    }

    protected function fillA0109($sheet, array $data): void
    {
        $rows = $data['rows'] ?? [];

        $rowMap = [
            'g1' => 7, 'g2' => 8, 'g3' => 9, 'g4' => 10, 'g5' => 11,
            'k1' => 13, 'k2' => 14, 'k3' => 15, 'k4' => 16, 'k5' => 17,
            'c1' => 19, 'c2' => 20, 'c3' => 21, 'c4' => 22, 'c5' => 23, 'c6' => 24, 'c7' => 25, 'c8' => 26,
        ];

        foreach ($rowMap as $k => $rowNum) {
            $item = $rows[$k] ?? [];
            $sheet->setCellValue("C{$rowNum}", (int) ($item['new_patients'] ?? 0));
            $sheet->setCellValue("D{$rowNum}", (int) ($item['visits'] ?? 0));
        }
    }

    protected function fillA0110($sheet, array $data): void
    {
        $items = $data['items'] ?? [];
        $startRow = 6;

        foreach ($items as $idx => $it) {
            $r = $startRow + $idx;
            $sheet->setCellValue("C{$r}", (int) ($it['count'] ?? 0));
        }
    }

    protected function fillE0101($sheet, array $data): void
    {
        $items = $data['items'] ?? [];
        $startRow = 5;

        foreach ($items as $idx => $it) {
            $r = $startRow + $idx;
            if ($r > 23) {
                break;
            }
            $sheet->setCellValue("C{$r}", (int) ($it['service_count'] ?? 0));
            if (isset($it['qty'])) {
                $sheet->setCellValue("D{$r}", (int) $it['qty']);
            }
        }

        // Summary row 24
        $sheet->setCellValue('C24', '=SUM(C5:C23)');
        $sheet->setCellValue('D24', '=SUM(D5:D23)');
    }

    protected function fillE0102($sheet, array $data): void
    {
        $items = $data['items'] ?? [];
        $startRow = 5;

        foreach ($items as $idx => $it) {
            $r = $startRow + $idx;
            $sheet->setCellValue("C{$r}", (int) ($it['visits'] ?? 0));
        }
    }
}
