<?php

namespace App\Services\Mra;

use App\Models\Mra\MraAudit;
use App\Models\Mra\MraAuditDetail;
use App\Models\Mra\MraCategory;
use App\Models\Mra\MraCriteria;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class MraExcelReportService
{
    private const HOSPITAL_NAME = 'โรงพยาบาลค่ายสุรสิงหนาท';
    private const FONT_FAMILY = 'TH SarabunPSK';

    /**
     * สร้าง Spreadsheet รายงาน MRA ที่มี 2 Sheet:
     * Sheet 1: IPD (ตามโครงสร้าง mra.xlsx)
     * Sheet 2: OPD-ER (ตามโครงสร้าง mra2.xlsx)
     */
    public function generateReport(string $fromDate, string $toDate): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $spreadsheet->removeSheetByIndex(0); // ลบ default sheet

        // 1. สร้าง Sheet ผู้ป่วยใน (IPD)
        $ipdSheet = $spreadsheet->createSheet();
        $ipdSheet->setTitle('IPD');
        $this->buildIpdSheet($ipdSheet, $fromDate, $toDate);

        // 2. สร้าง Sheet ผู้ป่วยนอก/ฉุกเฉิน (OPD-ER)
        $opdSheet = $spreadsheet->createSheet();
        $opdSheet->setTitle('OPD-ER');
        $this->buildOpdSheet($opdSheet, $fromDate, $toDate);

        // ให้เปิดที่หน้า IPD เสมอ
        $spreadsheet->setActiveSheetIndex(0);

        return $spreadsheet;
    }

    /**
     * สร้าง Sheet IPD ตามแบบ mra.xlsx
     */
    private function buildIpdSheet(Worksheet $sheet, string $fromDate, string $toDate): void
    {
        $fromCarbon = Carbon::parse($fromDate);
        $toCarbon = Carbon::parse($toDate);
        $buddhistYear = $toCarbon->year + 543;
        $periodText = $this->formatThaiDate($fromCarbon) . ' - ' . $this->formatThaiDate($toCarbon);

        // ดึงข้อมูลการตรวจ IPD ที่ตรวจเสร็จสิ้นในช่วงเวลาที่ระบุ (audited_at)
        $ipdAudits = MraAudit::where('audit_type', 'ipd')
            ->whereIn('status', ['audited', 'corrected'])
            ->whereDate('audited_at', '>=', $fromDate)
            ->whereDate('audited_at', '<=', $toDate)
            ->get();

        $ipdAuditIds = $ipdAudits->pluck('id')->toArray();
        $totalIpdCharts = count($ipdAuditIds);

        // ดึงรายละเอียดผลตรวจทั้งหมดของกลุ่มนี้
        $details = empty($ipdAuditIds)
            ? collect()
            : MraAuditDetail::whereIn('mra_audit_id', $ipdAuditIds)->get();

        // หมวดหมู่ IPD 12 หมวด
        $categories = MraCategory::active()
            ->forAuditType('ipd')
            ->orderBy('sort_order')
            ->with(['criteria' => function ($q) {
                $q->where('is_active', true)->orderBy('sort_order');
            }])
            ->get();

        // 1. หัวตาราง
        $sheet->mergeCells('A1:O1');
        $sheet->setCellValue('A1', 'รายงานสรุปผลการตรวจประเมินคุณภาพการบันทึกเวชระเบียน ผู้ป่วยใน (รวมคะแนนทุกแฟ้มที่รับตรวจ)');

        $sheet->mergeCells('A2:O2');
        $sheet->setCellValue('A2', "Medical Record Audit Report (IPD) ประจำปี {$buddhistYear} (ช่วงวันที่ {$periodText})");

        $sheet->mergeCells('A3:O3');
        $sheet->setCellValue('A3', 'ชื่อหน่วย รพ. ' . self::HOSPITAL_NAME);

        // กำหนดหัวคอลัมน์แถว 4 และ 5
        $sheet->mergeCells('A4:A5');
        $sheet->setCellValue('A4', 'No');

        $sheet->mergeCells('B4:B5');
        $sheet->setCellValue('B4', 'Content of medical record');

        $sheet->mergeCells('C4:K4');
        $sheet->setCellValue('C4', 'เกณฑ์ข้อที่ (คะแนน)');

        // แถว 5: เกณฑ์ข้อที่ 1-9
        for ($i = 1; $i <= 9; $i++) {
            $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(2 + $i); // C=3 ... K=11
            $sheet->setCellValue($colLetter . '5', $i);
        }

        $sheet->mergeCells('L4:L5');
        $sheet->setCellValue('L4', 'จำนวนแฟ้ม');

        $sheet->mergeCells('M4:M5');
        $sheet->setCellValue('M4', 'คะแนนเต็ม (Full score)');

        $sheet->mergeCells('N4:N5');
        $sheet->setCellValue('N4', 'คะแนนที่ได้ (Sum Score)');

        $sheet->mergeCells('O4:O5');
        $sheet->setCellValue('O4', 'ค่าเฉลี่ย(%)');

        // 2. เติมข้อมูลแถว 6 ถึง 17 (12 หมวด)
        $currentRow = 6;
        $totalFullScore = 0;
        $totalSumScore = 0;

        foreach ($categories as $index => $cat) {
            $catNum = $index + 1;
            $catCriteria = $cat->criteria->sortBy('sort_order')->values();
            $critIds = $catCriteria->pluck('id')->toArray();

            // รายละเอียดของหมวดนี้
            $catDetails = $details->whereIn('mra_criteria_id', $critIds);

            // จำนวนแฟ้มที่ตรวจประเมินหมวดนี้ (มีผลที่ไม่ใช่ na)
            $catChartsCount = $catDetails->where('result', '!=', 'na')
                ->pluck('mra_audit_id')
                ->unique()
                ->count();

            // ถ้าหมวดบังคับและมีแฟ้ม ให้ยึดจำนวนแฟ้มทั้งหมด
            if ($catChartsCount === 0 && $cat->is_required_section && $totalIpdCharts > 0) {
                $catChartsCount = $totalIpdCharts;
            }

            $catFullScore = (float) $catDetails->where('result', '!=', 'na')->sum('max_score');
            $catSumScore = (float) $catDetails->sum('obtained_score');
            $catPercent = $catFullScore > 0 ? round(($catSumScore / $catFullScore) * 100, 2) : 0;

            $totalFullScore += $catFullScore;
            $totalSumScore += $catSumScore;

            $sheet->setCellValue("A{$currentRow}", $catNum);
            $sheet->setCellValue("B{$currentRow}", $cat->name);

            // เกณฑ์ข้อที่ 1-9
            for ($k = 1; $k <= 9; $k++) {
                $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(2 + $k);
                if (isset($catCriteria[$k - 1])) {
                    $critId = $catCriteria[$k - 1]->id;
                    $itemScore = (float) $details->where('mra_criteria_id', $critId)->sum('obtained_score');
                    $sheet->setCellValue("{$colLetter}{$currentRow}", $itemScore == (int) $itemScore ? (int) $itemScore : $itemScore);
                } else {
                    $sheet->setCellValue("{$colLetter}{$currentRow}", '-');
                }
            }

            $sheet->setCellValue("L{$currentRow}", $catChartsCount);
            $sheet->setCellValue("M{$currentRow}", $catFullScore == (int) $catFullScore ? (int) $catFullScore : $catFullScore);
            $sheet->setCellValue("N{$currentRow}", $catSumScore == (int) $catSumScore ? (int) $catSumScore : $catSumScore);
            $sheet->setCellValue("O{$currentRow}", $catPercent > 0 ? number_format($catPercent, 2) : '0.00');

            $currentRow++;
        }

        // 3. แถวรวม (Summary Row)
        $summaryRow = $currentRow; // 18
        $sheet->mergeCells("A{$summaryRow}:K{$summaryRow}");
        $sheet->setCellValue("A{$summaryRow}", 'รวม');
        $sheet->setCellValue("L{$summaryRow}", $totalIpdCharts);
        $sheet->setCellValue("M{$summaryRow}", $totalFullScore);
        $sheet->setCellValue("N{$summaryRow}", $totalSumScore);
        $overallPercent = $totalFullScore > 0 ? round(($totalSumScore / $totalFullScore) * 100, 2) : 0;
        $sheet->setCellValue("O{$summaryRow}", number_format($overallPercent, 2));

        // 4. ส่วนลงลายมือชื่อ (ตรวจถูกต้อง, ช่องลงลายมือชื่อ, วันที่)
        $signStartRow = $summaryRow + 2; // 20
        $sheet->mergeCells("M" . ($signStartRow) . ":O" . ($signStartRow));
        $sheet->setCellValue("M" . ($signStartRow), 'ตรวจถูกต้อง');

        $sheet->mergeCells("M" . ($signStartRow + 1) . ":O" . ($signStartRow + 1));
        $sheet->setCellValue("M" . ($signStartRow + 1), '( ........................................ )');

        $sheet->mergeCells("M" . ($signStartRow + 2) . ":O" . ($signStartRow + 2));
        $sheet->setCellValue("M" . ($signStartRow + 2), 'วันที่ ........................................');

        // จัดการสไตล์และฟอนต์ทั้งชีต
        $this->applySheetStyling($sheet, 'O', $summaryRow, $signStartRow + 2);
    }

    /**
     * สร้าง Sheet OPD-ER ตามแบบ mra2.xlsx
     */
    private function buildOpdSheet(Worksheet $sheet, string $fromDate, string $toDate): void
    {
        $fromCarbon = Carbon::parse($fromDate);
        $toCarbon = Carbon::parse($toDate);
        $buddhistYear = $toCarbon->year + 543;
        $periodText = $this->formatThaiDate($fromCarbon) . ' - ' . $this->formatThaiDate($toCarbon);

        // ดึงข้อมูลการตรวจ OPD/ER ที่ตรวจเสร็จสิ้นในช่วงเวลาที่ระบุ (audited_at)
        $opdAudits = MraAudit::where('audit_type', 'opd')
            ->whereIn('status', ['audited', 'corrected'])
            ->whereDate('audited_at', '>=', $fromDate)
            ->whereDate('audited_at', '<=', $toDate)
            ->get();

        $opdAuditIds = $opdAudits->pluck('id')->toArray();
        $totalOpdCharts = count($opdAuditIds);

        $details = empty($opdAuditIds)
            ? collect()
            : MraAuditDetail::whereIn('mra_audit_id', $opdAuditIds)->get();

        // 1. หัวตาราง
        $sheet->mergeCells('A1:M1');
        $sheet->setCellValue('A1', 'รายงานสรุปผลการตรวจประเมินคุณภาพการบันทึกเวชระเบียน ผู้ป่วยนอก/ฉุกเฉิน (รวมคะแนนทุกแฟ้มที่รับการตรวจ)');

        $sheet->mergeCells('A2:M2');
        $sheet->setCellValue('A2', "Medical Record Audit Report (OPD/ER) ประจำปี {$buddhistYear} (ช่วงวันที่ {$periodText})");

        $sheet->mergeCells('A3:M3');
        $sheet->setCellValue('A3', 'ชื่อหน่วย รพ. ' . self::HOSPITAL_NAME);

        // หัวคอลัมน์แถว 4 และ 5 (13 คอลัมน์ A ถึง M)
        $sheet->mergeCells('A4:A5');
        $sheet->setCellValue('A4', 'No');

        $sheet->mergeCells('B4:B5');
        $sheet->setCellValue('B4', 'Content');

        $sheet->mergeCells('C4:I4');
        $sheet->setCellValue('C4', 'เกณฑ์ข้อที่ (คะแนน)');

        for ($i = 1; $i <= 7; $i++) {
            $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(2 + $i); // C=3 ... I=9
            $sheet->setCellValue($colLetter . '5', $i);
        }

        $sheet->mergeCells('J4:J5');
        $sheet->setCellValue('J4', 'จำนวนแฟ้ม');

        $sheet->mergeCells('K4:K5');
        $sheet->setCellValue('K4', 'คะแนนเต็ม (Full score)');

        $sheet->mergeCells('L4:L5');
        $sheet->setCellValue('L4', 'คะแนนที่ได้ (Sum score)');

        $sheet->mergeCells('M4:M5');
        $sheet->setCellValue('M4', 'ค่าเฉลี่ย(%)');

        // นิยามแถวของ OPD ตามแบบ mra2.xlsx (9 แถว: 1..4, 5 Follow up 1..3, 6 Operative note, 7 Informed consent)
        $categories = MraCategory::active()
            ->forAuditType('opd')
            ->with(['criteria' => function ($q) {
                $q->where('is_active', true)->orderBy('sort_order');
            }])
            ->get()
            ->keyBy('code');

        $opdRows = [
            [
                'no' => 1,
                'name' => "Patient's profile",
                'criteria' => $categories->get('OPD-01')?->criteria->sortBy('sort_order')->values() ?? collect(),
            ],
            [
                'no' => 2,
                'name' => 'History (1st visit)',
                'criteria' => $categories->get('OPD-02')?->criteria->sortBy('sort_order')->values() ?? collect(),
            ],
            [
                'no' => 3,
                'name' => 'Physical examination',
                'criteria' => $categories->get('OPD-03')?->criteria->sortBy('sort_order')->values() ?? collect(),
            ],
            [
                'no' => 4,
                'name' => 'Treatment / Investigation',
                'criteria' => $categories->get('OPD-04')?->criteria->sortBy('sort_order')->values() ?? collect(),
            ],
            [
                'no' => 5,
                'name' => 'Follow up ครั้งที่ 1',
                'criteria' => MraCriteria::where('mra_category_id', $categories->get('OPD-05')?->id ?? 5)
                    ->where('is_active', true)
                    ->where(fn($q) => $q->where('group_key', 'fu_visit_1')->orWhere('code', 'like', 'fu1_%'))
                    ->orderBy('sort_order')
                    ->get(),
            ],
            [
                'no' => '',
                'name' => 'Follow up ครั้งที่ 2',
                'criteria' => MraCriteria::where('mra_category_id', $categories->get('OPD-05')?->id ?? 5)
                    ->where('is_active', true)
                    ->where(fn($q) => $q->where('group_key', 'fu_visit_2')->orWhere('code', 'like', 'fu2_%'))
                    ->orderBy('sort_order')
                    ->get(),
            ],
            [
                'no' => '',
                'name' => 'Follow up ครั้งที่ 3',
                'criteria' => MraCriteria::where('mra_category_id', $categories->get('OPD-05')?->id ?? 5)
                    ->where('is_active', true)
                    ->where(fn($q) => $q->where('group_key', 'fu_visit_3')->orWhere('code', 'like', 'fu3_%'))
                    ->orderBy('sort_order')
                    ->get(),
            ],
            [
                'no' => 6,
                'name' => 'Operative note',
                'criteria' => $categories->get('OPD-06')?->criteria->sortBy('sort_order')->values() ?? collect(),
            ],
            [
                'no' => 7,
                'name' => 'Informed consent',
                'criteria' => $categories->get('OPD-07')?->criteria->sortBy('sort_order')->values() ?? collect(),
            ],
        ];

        $currentRow = 6;
        $totalFullScore = 0;
        $totalSumScore = 0;

        foreach ($opdRows as $row) {
            $critIds = $row['criteria']->pluck('id')->toArray();
            $rowDetails = $details->whereIn('mra_criteria_id', $critIds);

            $chartsCount = $rowDetails->where('result', '!=', 'na')
                ->pluck('mra_audit_id')
                ->unique()
                ->count();

            if ($chartsCount === 0 && in_array($row['no'], [1, 2, 3, 4], true) && $totalOpdCharts > 0) {
                $chartsCount = $totalOpdCharts;
            }

            $fullScore = (float) $rowDetails->where('result', '!=', 'na')->sum('max_score');
            $sumScore = (float) $rowDetails->sum('obtained_score');
            $percent = $fullScore > 0 ? round(($sumScore / $fullScore) * 100, 2) : 0;

            $totalFullScore += $fullScore;
            $totalSumScore += $sumScore;

            $sheet->setCellValue("A{$currentRow}", $row['no']);
            $sheet->setCellValue("B{$currentRow}", $row['name']);

            // เกณฑ์ข้อที่ 1-7
            for ($k = 1; $k <= 7; $k++) {
                $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(2 + $k);
                if (isset($row['criteria'][$k - 1])) {
                    $critId = $row['criteria'][$k - 1]->id;
                    $itemScore = (float) $details->where('mra_criteria_id', $critId)->sum('obtained_score');
                    $sheet->setCellValue("{$colLetter}{$currentRow}", $itemScore == (int) $itemScore ? (int) $itemScore : $itemScore);
                } else {
                    $sheet->setCellValue("{$colLetter}{$currentRow}", '-');
                }
            }

            $sheet->setCellValue("J{$currentRow}", $chartsCount);
            $sheet->setCellValue("K{$currentRow}", $fullScore == (int) $fullScore ? (int) $fullScore : $fullScore);
            $sheet->setCellValue("L{$currentRow}", $sumScore == (int) $sumScore ? (int) $sumScore : $sumScore);
            $sheet->setCellValue("M{$currentRow}", $percent > 0 ? number_format($percent, 2) : '0.00');

            $currentRow++;
        }

        // แถวรวม (Summary Row)
        $summaryRow = $currentRow; // 15
        $sheet->mergeCells("A{$summaryRow}:I{$summaryRow}");
        $sheet->setCellValue("A{$summaryRow}", 'รวม');
        $sheet->setCellValue("J{$summaryRow}", $totalOpdCharts);
        $sheet->setCellValue("K{$summaryRow}", $totalFullScore == (int) $totalFullScore ? (int) $totalFullScore : $totalFullScore);
        $sheet->setCellValue("L{$summaryRow}", $totalSumScore == (int) $totalSumScore ? (int) $totalSumScore : $totalSumScore);
        $overallPercent = $totalFullScore > 0 ? round(($totalSumScore / $totalFullScore) * 100, 2) : 0;
        $sheet->setCellValue("M{$summaryRow}", number_format($overallPercent, 2));

        // ส่วนลงลายมือชื่อ (ตรวจถูกต้อง, ช่องลงลายมือชื่อ, วันที่)
        $signStartRow = $summaryRow + 2; // 17
        $sheet->mergeCells("K" . ($signStartRow) . ":M" . ($signStartRow));
        $sheet->setCellValue("K" . ($signStartRow), 'ตรวจถูกต้อง');

        $sheet->mergeCells("K" . ($signStartRow + 1) . ":M" . ($signStartRow + 1));
        $sheet->setCellValue("K" . ($signStartRow + 1), '( ........................................ )');

        $sheet->mergeCells("K" . ($signStartRow + 2) . ":M" . ($signStartRow + 2));
        $sheet->setCellValue("K" . ($signStartRow + 2), 'วันที่ ........................................');

        $this->applySheetStyling($sheet, 'M', $summaryRow, $signStartRow + 2);
    }

    /**
     * จัดการสไตล์ตาราง ฟอนต์ เส้นขอบ และความกว้างคอลัมน์
     */
    private function applySheetStyling(Worksheet $sheet, string $lastCol, int $summaryRow, int $lastRow): void
    {
        // กำหนดฟอนต์ทั้งชีต
        $sheet->getParent()->getDefaultStyle()->getFont()->setName(self::FONT_FAMILY)->setSize(16);

        // หัวรายงาน แถว 1-3
        $sheet->getStyle("A1:{$lastCol}3")->getFont()->setName(self::FONT_FAMILY)->setSize(16)->setBold(true);
        $sheet->getStyle("A1:{$lastCol}3")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(1)->setRowHeight(26);
        $sheet->getRowDimension(2)->setRowHeight(24);
        $sheet->getRowDimension(3)->setRowHeight(24);

        // หัวตาราง แถว 4-5
        $sheet->getStyle("A4:{$lastCol}5")->getFont()->setName(self::FONT_FAMILY)->setSize(16)->setBold(true);
        $sheet->getStyle("A4:{$lastCol}5")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER)->setWrapText(true);
        $sheet->getRowDimension(4)->setRowHeight(24);
        $sheet->getRowDimension(5)->setRowHeight(24);

        // เส้นขอบตารางข้อมูลทั้งหมด (A4 ถึง lastCol + summaryRow)
        $tableRange = "A4:{$lastCol}{$summaryRow}";
        $sheet->getStyle($tableRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->setColor(new Color('FF000000'));

        $lastColIndex = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($lastCol);
        $colChartsLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($lastColIndex - 3);
        $colFullLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($lastColIndex - 2);

        // จัดตำแหน่งเนื้อหาในตาราง
        for ($r = 6; $r <= $summaryRow; $r++) {
            $sheet->getRowDimension($r)->setRowHeight(22);
            $sheet->getStyle("A{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
            $sheet->getStyle("B{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT)->setVertical(Alignment::VERTICAL_CENTER);

            // ตัวเลขเกณฑ์และจำนวนแฟ้ม (C ถึง colChartsLetter): จัดกึ่งกลาง
            $sheet->getStyle("C{$r}:{$colChartsLetter}{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);

            // คะแนนเต็ม, คะแนนที่ได้, ค่าเฉลี่ย: ชิดขวา
            $sheet->getStyle("{$colFullLetter}{$r}:{$lastCol}{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT)->setVertical(Alignment::VERTICAL_CENTER);
        }

        // แถวสรุปรวม (Summary Row)
        $sheet->getStyle("A{$summaryRow}:{$lastCol}{$summaryRow}")->getFont()->setBold(true);
        $sheet->getStyle("A{$summaryRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("{$colChartsLetter}{$summaryRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // ส่วนลายเซ็น
        $signRange = "A" . ($summaryRow + 1) . ":{$lastCol}{$lastRow}";
        $sheet->getStyle($signRange)->getFont()->setName(self::FONT_FAMILY)->setSize(16);
        for ($r = $summaryRow + 1; $r <= $lastRow; $r++) {
            $sheet->getRowDimension($r)->setRowHeight(22);
        }

        // ความกว้างคอลัมน์
        $sheet->getColumnDimension('A')->setWidth(6);
        $sheet->getColumnDimension('B')->setWidth(38);

        // คอลัมน์เกณฑ์ C เป็นต้นไป
        $lastColIndex = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($lastCol);
        for ($c = 3; $c <= $lastColIndex - 4; $c++) {
            $letter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($c);
            $sheet->getColumnDimension($letter)->setWidth(8);
        }

        // คอลัมน์สถิติ 4 ตัวท้าย
        $colCharts = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($lastColIndex - 3);
        $colFull = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($lastColIndex - 2);
        $colSum = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($lastColIndex - 1);
        $colAvg = $lastCol;

        $sheet->getColumnDimension($colCharts)->setWidth(13);
        $sheet->getColumnDimension($colFull)->setWidth(16);
        $sheet->getColumnDimension($colSum)->setWidth(16);
        $sheet->getColumnDimension($colAvg)->setWidth(12);

        // เปิดแสดง Gridlines เสมอ
        $sheet->setShowGridLines(true);
    }

    private function formatThaiDate(Carbon $dt): string
    {
        $months = [
            1 => 'ม.ค.', 2 => 'ก.พ.', 3 => 'มี.ค.', 4 => 'เม.ย.', 5 => 'พ.ค.', 6 => 'มิ.ย.',
            7 => 'ก.ค.', 8 => 'ส.ค.', 9 => 'ก.ย.', 10 => 'ต.ค.', 11 => 'พ.ย.', 12 => 'ธ.ค.',
        ];

        return $dt->day . ' ' . $months[(int) $dt->month] . ' ' . ($dt->year + 543);
    }
}
