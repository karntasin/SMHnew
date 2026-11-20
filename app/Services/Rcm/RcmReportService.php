<?php

namespace App\Services\Rcm;

use App\Services\ThaiPdfService;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RcmReportService
{
    /**
     * สร้างรายงาน Excel ทั่วไป พร้อมรองรับฟอนต์และภาษาไทยสมบูรณ์
     */
    public function exportExcel(string $title, array $headers, array $data, string $filename): StreamedResponse
    {
        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('TH SarabunPSK')->setSize(15);

        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle(mb_substr($title, 0, 31, 'UTF-8'));

        $totalHeaders = count($headers);
        $maxColLetter = Coordinate::stringFromColumnIndex(max(1, $totalHeaders));

        // หัวรายงาน
        $sheet->mergeCells("A1:{$maxColLetter}1");
        $sheet->setCellValue('A1', $title);
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(16);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getRowDimension(1)->setRowHeight(26);

        // วันที่พิมพ์
        $sheet->mergeCells("A2:{$maxColLetter}2");
        $sheet->setCellValue('A2', 'พิมพ์เมื่อ: '.date('d/m/Y H:i:s'));
        $sheet->getStyle('A2')->getFont()->setSize(12)->setItalic(true);
        $sheet->getStyle('A2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet->getRowDimension(2)->setRowHeight(20);

        // Header Table
        $colIndex = 1;
        $textCols = [];
        foreach ($headers as $header) {
            $colLetter = Coordinate::stringFromColumnIndex($colIndex);
            $sheet->setCellValue($colLetter.'4', $header);
            $sheet->getStyle($colLetter.'4')->getFont()->setBold(true);
            $sheet->getStyle($colLetter.'4')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFE2E8F0');
            $sheet->getStyle($colLetter.'4')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // คอลัมน์ที่เป็นรหัส ตัวระบุ VN, AN, HN, CID, TMT, รหัสยา ฯลฯ ให้ฟอร์แมตเป็น Text 100%
            if (preg_match('/(VN|AN|HN|CID|TMT|Code|รหัส|เลข|บัตร|สิทธิ|โทร|วันที่|เวลา)/iu', (string) $header)) {
                $textCols[$colIndex] = true;
            }

            $colIndex++;
        }
        $sheet->getRowDimension(4)->setRowHeight(24);

        // Data Rows
        $rowIndex = 5;
        foreach ($data as $row) {
            $colIndex = 1;
            foreach ($row as $val) {
                $colLetter = Coordinate::stringFromColumnIndex($colIndex);
                $isTextCol = isset($textCols[$colIndex]);
                $valStr = (string) $val;

                // บังคับ DataType::TYPE_STRING สำหรับ VN/AN, HN, รหัสต่างๆ หรือตัวเลขยาว/ศูนย์นำหน้า ป้องกัน Excel เพี้ยนเป็น Scientific Notation
                if ($isTextCol || preg_match('/^0\d+$/', $valStr) || (is_numeric($valStr) && strlen($valStr) >= 9 && !str_contains($valStr, '.'))) {
                    $sheet->setCellValueExplicit($colLetter.$rowIndex, $valStr, DataType::TYPE_STRING);
                    $sheet->getStyle($colLetter.$rowIndex)->getNumberFormat()->setFormatCode(NumberFormat::FORMAT_TEXT);

                    if ($isTextCol && preg_match('/(VN|AN|HN|CID|TMT|Code|รหัส|วันที่)/iu', (string) ($headers[$colIndex - 1] ?? ''))) {
                        $sheet->getStyle($colLetter.$rowIndex)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    }
                } else {
                    $sheet->setCellValue($colLetter.$rowIndex, $val);
                }
                $colIndex++;
            }
            $sheet->getRowDimension($rowIndex)->setRowHeight(22);
            $rowIndex++;
        }

        for ($i = 1; $i <= $totalHeaders; $i++) {
            $colLetter = Coordinate::stringFromColumnIndex($i);
            $sheet->getColumnDimension($colLetter)->setAutoSize(true);
        }

        $response = new StreamedResponse(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        });

        $response->headers->set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $response->headers->set('Content-Disposition', 'attachment; filename="'.$filename.'.xlsx"; filename*=UTF-8\'\''.rawurlencode($filename.'.xlsx'));
        $response->headers->set('Cache-Control', 'max-age=0');

        return $response;
    }

    /**
     * สร้างรายงาน Excel สรุปเปรียบเทียบวงจรการเงิน RCM 6 มิติ (Financial Comparison Matrix)
     */
    public function exportFinancialComparisonExcel(array $summary, array $detailRows, string $filename): StreamedResponse
    {
        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('TH SarabunPSK')->setSize(15);

        // ------------------ Sheet 1: Financial Summary Matrix ------------------
        $sheet1 = $spreadsheet->getActiveSheet();
        $sheet1->setTitle('สรุปเปรียบเทียบวงจรการเงิน');

        // Header Hospital
        $sheet1->mergeCells('A1:H1');
        $sheet1->setCellValue('A1', 'โรงพยาบาลค่ายสุรสิงหนาท - Fort Surasinghanat Hospital');
        $sheet1->getStyle('A1')->getFont()->setBold(true)->setSize(16);
        $sheet1->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet1->getRowDimension(1)->setRowHeight(28);

        $sheet1->mergeCells('A2:H2');
        $sheet1->setCellValue('A2', 'รายงานเปรียบเทียบวงจรการเงินและการกระทบยอด STM (RCM Financial Reconciliation)');
        $sheet1->getStyle('A2')->getFont()->setBold(true)->setSize(14)->getColor()->setARGB('FF047857');
        $sheet1->getStyle('A2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet1->getRowDimension(2)->setRowHeight(24);

        $sheet1->mergeCells('A3:H3');
        $sheet1->setCellValue('A3', 'ช่วงเวลา: ' . ($summary['date_range']['label'] ?? 'ทั้งหมด') . ' | ข้อมูล ณ วันที่: ' . date('d/m/Y H:i:s'));
        $sheet1->getStyle('A3')->getFont()->setSize(12)->setItalic(true);
        $sheet1->getStyle('A3')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet1->getRowDimension(3)->setRowHeight(20);

        // 6 KPI Blocks
        $sheet1->setCellValue('A5', 'มิติทางการเงิน (Financial Dimension)');
        $sheet1->setCellValue('B5', 'จำนวนเคส');
        $sheet1->setCellValue('C5', 'ยอดเงิน (บาท)');
        $sheet1->setCellValue('D5', 'สัดส่วน (%)');
        $sheet1->getStyle('A5:D5')->getFont()->setBold(true);
        $sheet1->getStyle('A5:D5')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF1E293B');
        $sheet1->getStyle('A5:D5')->getFont()->getColor()->setARGB('FFFFFFFF');
        $sheet1->getRowDimension(5)->setRowHeight(24);

        $kpis = [
            ['1. ยอดเรียกเก็บรวม (Total Claimed)', $summary['total_cases'], $summary['total_claimed'], '100.00%'],
            ['2. ยอดที่ได้รับชดเชย (Approved Amount)', $summary['matched_full_count'] + $summary['matched_partial_count'], $summary['total_approved'], $summary['approval_rate'] . '%'],
            ['3. ยอดส่วนต่างถูกตัดเงิน (Shortfall Amount)', $summary['matched_partial_count'] + $summary['rejected_count'], $summary['total_shortfall'], (100 - $summary['approval_rate']) . '%'],
            ['4. ยอดที่ติด C / ถูกปฏิเสธจ่าย (C-Deny Amount)', $summary['rejected_count'], $summary['total_c_deny_amount'], ($summary['total_claimed'] > 0 ? round(($summary['total_c_deny_amount'] / $summary['total_claimed']) * 100, 2) : 0) . '%'],
            ['5. ยอดที่รออุทธรณ์ (Pending Appeal Amount)', $summary['pending_appeal_count'], $summary['total_pending_appeal_amount'], '-'],
            ['6. ยอดที่กู้คืนสำเร็จจากการอุทธรณ์ (Recovered Amount)', $summary['appeal_approved_count'], $summary['total_recovered_amount'], $summary['recovery_rate'] . '%'],
        ];

        $r = 6;
        foreach ($kpis as $row) {
            $sheet1->setCellValue("A{$r}", $row[0]);
            $sheet1->setCellValue("B{$r}", number_format($row[1]));
            $sheet1->setCellValue("C{$r}", number_format($row[2], 2));
            $sheet1->setCellValue("D{$r}", $row[3]);
            $sheet1->getStyle("A{$r}:D{$r}")->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);
            $sheet1->getStyle("B{$r}:D{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
            $sheet1->getRowDimension($r)->setRowHeight(22);
            $r++;
        }

        // Table 1: สรุปเปรียบเทียบตามกองทุน (Fund Matrix)
        $r += 2;
        $sheet1->mergeCells("A{$r}:H{$r}");
        $sheet1->setCellValue("A{$r}", 'ตารางที่ 1: สรุปเปรียบเทียบตามกองทุน (Fund Matrix Comparison)');
        $sheet1->getStyle("A{$r}")->getFont()->setBold(true)->setSize(14);
        $sheet1->getRowDimension($r)->setRowHeight(24);

        $r++;
        $fundHeaders = ['ลำดับ', 'กองทุน', 'จำนวนเคส', 'ยอดเรียกเก็บ (บาท)', 'ยอดที่ได้รับ (บาท)', 'ส่วนต่างที่ขาด (บาท)', 'ยอดติด C (บาท)', 'อัตราชดเชย (%)'];
        foreach ($fundHeaders as $idx => $fh) {
            $col = chr(65 + $idx);
            $sheet1->setCellValue("{$col}{$r}", $fh);
        }
        $sheet1->getStyle("A{$r}:H{$r}")->getFont()->setBold(true);
        $sheet1->getStyle("A{$r}:H{$r}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFE2E8F0');
        $sheet1->getRowDimension($r)->setRowHeight(24);

        $r++;
        $no = 1;
        foreach ($summary['fund_matrix'] as $fm) {
            $sheet1->setCellValue("A{$r}", $no++);
            $sheet1->setCellValue("B{$r}", $fm['fund_name']);
            $sheet1->setCellValue("C{$r}", number_format($fm['case_count']));
            $sheet1->setCellValue("D{$r}", number_format($fm['claimed'], 2));
            $sheet1->setCellValue("E{$r}", number_format($fm['approved'], 2));
            $sheet1->setCellValue("F{$r}", number_format($fm['shortfall'], 2));
            $sheet1->setCellValue("G{$r}", number_format($fm['c_deny_amount'], 2));
            $sheet1->setCellValue("H{$r}", $fm['approval_rate'] . '%');
            $sheet1->getStyle("C{$r}:H{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
            $sheet1->getRowDimension($r)->setRowHeight(22);
            $r++;
        }

        // Table 2: Top C-Deny
        $r += 2;
        $sheet1->mergeCells("A{$r}:H{$r}");
        $sheet1->setCellValue("A{$r}", 'ตารางที่ 2: สรุป 20 รหัสข้อผิดพลาด/ติด C สูงสุด (Top 20 C-Deny Analysis)');
        $sheet1->getStyle("A{$r}")->getFont()->setBold(true)->setSize(14);
        $sheet1->getRowDimension($r)->setRowHeight(24);

        $r++;
        $cHeaders = ['รหัส C', 'รายละเอียดข้อผิดพลาด', 'จำนวน SEQ รวม', 'แก้ได้แล้ว (เคส)', 'ยังรอแก้ (เคส)', 'ยอดเรียกเก็บ (บาท)', 'ส่วนต่างที่ขาด (บาท)', 'แนวทางแก้ไข'];
        foreach ($cHeaders as $idx => $ch) {
            $col = chr(65 + $idx);
            $sheet1->setCellValue("{$col}{$r}", $ch);
        }
        $sheet1->getStyle("A{$r}:H{$r}")->getFont()->setBold(true);
        $sheet1->getStyle("A{$r}:H{$r}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFFEE2E2');
        $sheet1->getRowDimension($r)->setRowHeight(24);

        $r++;
        foreach ($summary['top_c_deny'] as $cd) {
            $sheet1->setCellValue("A{$r}", 'C' . $cd['code']);
            $sheet1->setCellValue("B{$r}", $cd['title']);
            $sheet1->setCellValue("C{$r}", number_format($cd['count']));
            $sheet1->setCellValue("D{$r}", number_format($cd['settled_count'] ?? 0));
            $sheet1->setCellValue("E{$r}", number_format($cd['pending_count'] ?? 0));
            $sheet1->setCellValue("F{$r}", number_format($cd['total_claim'], 2));
            $sheet1->setCellValue("G{$r}", number_format($cd['shortfall'], 2));
            $sheet1->setCellValue("H{$r}", $cd['solution']);
            $sheet1->getStyle("C{$r}:G{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
            $sheet1->getRowDimension($r)->setRowHeight(22);
            $r++;
        }

        foreach (range('A', 'H') as $col) {
            $sheet1->getColumnDimension($col)->setAutoSize(true);
        }

        // ------------------ Sheet 2: Detail Cases ------------------
        $sheet2 = $spreadsheet->createSheet();
        $sheet2->setTitle('รายการเคสละเอียด');

        $detailHeaders = ['ลำดับ', 'ประเภท', 'Rep No.', 'Tran ID', 'HN', 'AN', 'ชื่อผู้ป่วย', 'วันที่รับบริการ', 'ยอดตั้งเบิก', 'ยอดอนุมัติ (STM)', 'ส่วนต่างขาดหาย', 'สถานะ', 'รหัสตัดเงิน', 'กองทุน'];
        foreach ($detailHeaders as $idx => $dh) {
            $col = chr(65 + $idx);
            $sheet2->setCellValue("{$col}1", $dh);
        }
        $sheet2->getStyle('A1:N1')->getFont()->setBold(true);
        $sheet2->getStyle('A1:N1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFE2E8F0');
        $sheet2->getRowDimension(1)->setRowHeight(24);

        $r = 2;
        $idx = 1;
        foreach (array_slice($detailRows, 0, 5000) as $row) {
            $sheet2->setCellValue("A{$r}", $idx++);
            $sheet2->setCellValue("B{$r}", $row['claim_type']);
            $sheet2->setCellValue("C{$r}", $row['rep_no']);
            $sheet2->setCellValue("D{$r}", $row['tran_id']);
            $sheet2->setCellValue("E{$r}", $row['raw_hn'] ?? $row['hn']);
            $sheet2->setCellValue("F{$r}", $row['an']);
            $sheet2->setCellValue("G{$r}", $row['patient_name']);
            $sheet2->setCellValue("H{$r}", $row['service_date']);
            $sheet2->setCellValue("I{$r}", $row['claim_amount']);
            $sheet2->setCellValue("J{$r}", $row['approved_amount']);
            $sheet2->setCellValue("K{$r}", $row['shortfall_amount']);
            $sheet2->setCellValue("L{$r}", $row['reconcile_status']);
            $sheet2->setCellValue("M{$r}", $row['denial_code']);
            $sheet2->setCellValue("N{$r}", $row['fund_codes']);
            $sheet2->getRowDimension($r)->setRowHeight(22);
            $r++;
        }

        foreach (range('A', 'N') as $col) {
            $sheet2->getColumnDimension($col)->setAutoSize(true);
        }

        $spreadsheet->setActiveSheetIndex(0);

        $response = new StreamedResponse(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        });

        $response->headers->set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $response->headers->set('Content-Disposition', 'attachment; filename="'.$filename.'.xlsx"; filename*=UTF-8\'\''.rawurlencode($filename.'.xlsx'));
        $response->headers->set('Cache-Control', 'max-age=0');

        return $response;
    }

    /**
     * สร้างรายงาน PDF สรุปเปรียบเทียบวงจรการเงิน RCM 6 มิติ (รองรับฟอนต์ Sarabun ภาษาไทยสมบูรณ์)
     */
    public function exportFinancialComparisonPdf(array $summary, string $filename): Response
    {
        $thaiPdf = app(ThaiPdfService::class);
        [$fontRegularUri, $fontBoldUri] = $thaiPdf->fontUris('sarabun');

        $dateLabel = htmlspecialchars($summary['date_range']['label'] ?? 'ทั้งหมด');
        $printDate = date('d/m/Y H:i:s');

        $totalClaimed = number_format($summary['total_claimed'], 2);
        $totalApproved = number_format($summary['total_approved'], 2);
        $totalShortfall = number_format($summary['total_shortfall'], 2);
        $totalCDeny = number_format($summary['total_c_deny_amount'], 2);
        $totalPending = number_format($summary['total_pending_appeal_amount'], 2);
        $totalRecovered = number_format($summary['total_recovered_amount'], 2);

        $fundHtml = '';
        foreach ($summary['fund_matrix'] as $f) {
            $fundHtml .= '<tr>
                <td style="font-weight:bold;">' . htmlspecialchars($f['fund_name']) . '</td>
                <td style="text-align:right;">' . number_format($f['case_count']) . '</td>
                <td style="text-align:right;">' . number_format($f['claimed'], 2) . '</td>
                <td style="text-align:right; color:#059669;">' . number_format($f['approved'], 2) . '</td>
                <td style="text-align:right; color:#e11d48; font-weight:bold;">' . number_format($f['shortfall'], 2) . '</td>
                <td style="text-align:right;">' . $f['approval_rate'] . '%</td>
            </tr>';
        }

        $cDenyHtml = '';
        foreach ($summary['top_c_deny'] as $c) {
            $settled = number_format($c['settled_count'] ?? 0);
            $pending = number_format($c['pending_count'] ?? 0);
            $pendingColor = ($c['pending_count'] ?? 0) > 0 ? '#b91c1c; font-weight:bold;' : '#64748b;';
            $cDenyHtml .= '<tr>
                <td style="font-weight:bold; color:#e11d48; text-align:center;">C' . htmlspecialchars($c['code']) . '</td>
                <td>' . htmlspecialchars($c['title']) . '</td>
                <td style="text-align:right;">' . number_format($c['count']) . '</td>
                <td style="text-align:right; color:#059669;">' . $settled . '</td>
                <td style="text-align:right; color:' . $pendingColor . '">' . $pending . '</td>
                <td style="text-align:right; color:#e11d48; font-weight:bold;">' . number_format($c['shortfall'], 2) . '</td>
                <td style="color:#475569;">' . htmlspecialchars($c['solution']) . '</td>
            </tr>';
        }

        $html = '<!DOCTYPE html>
        <html lang="th">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
            <style>
                @font-face {
                    font-family: "sarabun";
                    font-style: normal;
                    font-weight: normal;
                    src: url("' . $fontRegularUri . '") format("truetype");
                }
                @font-face {
                    font-family: "sarabun";
                    font-style: normal;
                    font-weight: bold;
                    src: url("' . $fontBoldUri . '") format("truetype");
                }
                @page { margin: 20px 24px; }
                * { box-sizing: border-box; font-family: "sarabun", sans-serif; }
                body { font-size: 11px; color: #1e293b; line-height: 1.35; }
                .header { text-align: center; margin-bottom: 12px; }
                .header h1 { margin: 0; font-size: 16px; color: #047857; font-weight: bold; }
                .header h2 { margin: 2px 0; font-size: 13px; color: #0f172a; }
                .header p { margin: 2px 0 0; font-size: 9.5px; color: #64748b; }
                .grid-kpi { width: 100%; border-collapse: separate; border-spacing: 6px; margin-bottom: 12px; }
                .grid-kpi td { width: 33.33%; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; background: #f8fafc; }
                .kpi-title { font-size: 9.5px; color: #64748b; font-weight: bold; }
                .kpi-val { font-size: 13px; font-weight: bold; margin-top: 2px; }
                .table-title { font-size: 12px; font-weight: bold; margin: 10px 0 4px; color: #047857; border-bottom: 2px solid #a7f3d0; padding-bottom: 2px; }
                table.data-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
                table.data-table th, table.data-table td { border: 1px solid #cbd5e1; padding: 4px 6px; font-size: 9.5px; }
                table.data-table th { background: #047857; color: #ffffff; font-weight: bold; text-align: center; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>โรงพยาบาลค่ายสุรสิงหนาท (Fort Surasinghanat Hospital)</h1>
                <h2>รายงานเปรียบเทียบวงจรการเงินและการกระทบยอด STM (RCM Financial Summary)</h2>
                <p>ช่วงเวลา: ' . $dateLabel . ' | ข้อมูลออกรายงาน ณ วันที่: ' . $printDate . '</p>
            </div>

            <table class="grid-kpi">
                <tr>
                    <td>
                        <div class="kpi-title">1. ยอดเรียกเก็บรวม (Total Claimed)</div>
                        <div class="kpi-val" style="color:#0f172a;">฿' . $totalClaimed . '</div>
                    </td>
                    <td>
                        <div class="kpi-title">2. ยอดที่ได้รับชดเชย (Approved)</div>
                        <div class="kpi-val" style="color:#059669;">฿' . $totalApproved . '</div>
                    </td>
                    <td>
                        <div class="kpi-title">3. ยอดที่ขาด / ถูกตัด (Shortfall)</div>
                        <div class="kpi-val" style="color:#e11d48;">฿' . $totalShortfall . '</div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div class="kpi-title">4. ยอดที่ติด C (C-Deny Amount)</div>
                        <div class="kpi-val" style="color:#b91c1c;">฿' . $totalCDeny . '</div>
                    </td>
                    <td>
                        <div class="kpi-title">5. ยอดที่รออุทธรณ์ (Pending Appeal)</div>
                        <div class="kpi-val" style="color:#7c3aed;">฿' . $totalPending . '</div>
                    </td>
                    <td>
                        <div class="kpi-title">6. ยอดที่กู้คืนสำเร็จ (Recovered)</div>
                        <div class="kpi-val" style="color:#047857;">฿' . $totalRecovered . '</div>
                    </td>
                </tr>
            </table>

            <div class="table-title">ตารางที่ 1: สรุปเปรียบเทียบตามกองทุน (Fund Matrix Comparison)</div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width:25%;">กองทุน</th>
                        <th style="width:12%;">จำนวนเคส</th>
                        <th style="width:18%;">ยอดเรียกเก็บ</th>
                        <th style="width:18%;">ยอดที่ได้รับ</th>
                        <th style="width:15%;">ส่วนต่างที่ขาด</th>
                        <th style="width:12%;">อัตราชดเชย</th>
                    </tr>
                </thead>
                <tbody>
                    ' . $fundHtml . '
                </tbody>
            </table>

            <div class="table-title">ตารางที่ 2: สรุป 20 รหัสข้อผิดพลาด / ติด C สูงสุด (Top 20 C-Deny Analysis)</div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width:8%;">รหัส</th>
                        <th style="width:28%;">รายละเอียดข้อผิดพลาด</th>
                        <th style="width:9%;">SEQ รวม</th>
                        <th style="width:8%;">แก้แล้ว</th>
                        <th style="width:8%;">รอแก้</th>
                        <th style="width:14%;">ส่วนต่างที่ขาด</th>
                        <th style="width:25%;">แนวทางแก้ไข</th>
                    </tr>
                </thead>
                <tbody>
                    ' . $cDenyHtml . '
                </tbody>
            </table>
        </body>
        </html>';

        $pdf = $thaiPdf->render($html, 'portrait', true, 'sarabun');

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $filename . '.pdf"; filename*=UTF-8\'\'' . rawurlencode($filename . '.pdf'),
        ]);
    }

    /**
     * สร้างรายงาน Excel สรุปเปรียบเทียบข้อมูลรายเดือน 3 ฝ่าย (HOSxP vs REP vs STM)
     */
    public function exportMonthly3WayExcel(array $comparisonData, string $filename): StreamedResponse
    {
        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('TH SarabunPSK')->setSize(14);

        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('เปรียบเทียบรายเดือน 3 ฝ่าย');

        $by = $comparisonData['budget_year'];
        $scheme = strtoupper($comparisonData['scheme']);
        $scope = $comparisonData['service_scope'] ?? 'all';
        $scopeLabel = match ($scope) {
            'hemodialysis' => 'เฉพาะผู้ป่วยไตเทียม (หน่วยไตเทียม)',
            'general' => 'ผู้ป่วยทั่วไป (ไม่รวมไตเทียม)',
            default => 'ผู้ป่วยทั้งหมด (รวมไตเทียม)',
        };

        // Header Title
        $sheet->mergeCells('A1:M1');
        $sheet->setCellValue('A1', "รายงานเปรียบเทียบข้อมูลรายเดือน 3 ฝ่าย (HOSxP vs e-Claim REP vs Statement STM) - โรงพยาบาลค่ายสุรสิงหนาท");
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(16);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet->mergeCells('A2:M2');
        $sheet->setCellValue('A2', "ปีงบประมาณ: {$by} | กองทุน: {$scheme} | กลุ่มบริการ: {$scopeLabel} | พิมพ์เมื่อ: " . date('d/m/Y H:i:s'));
        $sheet->getStyle('A2')->getFont()->setSize(12)->setItalic(true);
        $sheet->getStyle('A2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // Group Headers
        $sheet->mergeCells('A4:A5');
        $sheet->setCellValue('A4', 'เดือน/ปี');

        $sheet->mergeCells('B4:E4');
        $sheet->setCellValue('B4', '[1] ข้อมูลใน HOSxP (รพ.)');
        $sheet->getStyle('B4')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFE0F2FE');

        $sheet->mergeCells('F4:H4');
        $sheet->setCellValue('F4', '[2] ข้อมูลในไฟล์ REP (e-Claim)');
        $sheet->getStyle('F4')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FEFEF3C7');

        $sheet->mergeCells('I4:J4');
        $sheet->setCellValue('I4', '[3] ข้อมูลใน STM (โอนเงินจริง)');
        $sheet->getStyle('I4')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFD1FAE5');

        $sheet->mergeCells('K4:M4');
        $sheet->setCellValue('K4', '[4] เปรียบเทียบผลต่าง & สรุป');
        $sheet->getStyle('K4')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFF1F5F9');

        $sheet->getStyle('A4:M4')->getFont()->setBold(true);
        $sheet->getStyle('A4:M4')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // Sub Headers
        $subHeaders = [
            'A5' => 'เดือน/ปี',
            'B5' => 'เคส (HOSxP)',
            'C5' => 'ค่ารักษารวม (฿)',
            'D5' => 'ลูกหนี้สิทธิ (฿)',
            'E5' => 'เงินสดคนไข้ (฿)',
            'F5' => 'เคสส่งเบิก',
            'G5' => 'ยอดตั้งเบิก (฿)',
            'H5' => 'ยอดติด C (฿)',
            'I5' => 'เคสได้เงิน',
            'J5' => 'ยอดเงินโอน (฿)',
            'K5' => 'ค้างส่งเบิก (฿)',
            'L5' => 'รอโอน/ติดหัก (฿)',
            'M5' => '% ชดเชยจริง',
        ];

        foreach ($subHeaders as $cell => $text) {
            $sheet->setCellValue($cell, $text);
            $sheet->getStyle($cell)->getFont()->setBold(true);
            $sheet->getStyle($cell)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        }

        $r = 6;
        foreach ($comparisonData['rows'] as $row) {
            $sheet->setCellValue("A{$r}", $row['short_label_th'] ?? $row['full_label_th']);
            $sheet->setCellValue("B{$r}", number_format($row['hosxp_cases']));
            $sheet->setCellValue("C{$r}", number_format($row['hosxp_income'], 2));
            $sheet->setCellValue("D{$r}", number_format($row['hosxp_uc_money'], 2));
            $sheet->setCellValue("E{$r}", number_format($row['hosxp_cash'] ?? 0, 2));

            $sheet->setCellValue("F{$r}", number_format($row['rep_cases']));
            $sheet->setCellValue("G{$r}", number_format($row['rep_claim'], 2));
            $sheet->setCellValue("H{$r}", number_format($row['rep_c_deny_amount'], 2));

            $sheet->setCellValue("I{$r}", number_format($row['stm_cases']));
            $sheet->setCellValue("J{$r}", number_format($row['stm_approved'], 2));

            $sheet->setCellValue("K{$r}", number_format($row['diff_hosxp_rep'], 2));
            $sheet->setCellValue("L{$r}", number_format($row['diff_rep_stm'], 2));
            $sheet->setCellValue("M{$r}", $row['recovery_rate'] . '%');

            $sheet->getStyle("B{$r}:M{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
            $r++;
        }

        // Totals Row
        $tot = $comparisonData['totals'];
        $sheet->setCellValue("A{$r}", 'รวมทั้งสิ้น ปีงบประมาณ');
        $sheet->setCellValue("B{$r}", number_format($tot['hosxp_cases']));
        $sheet->setCellValue("C{$r}", number_format($tot['hosxp_income'], 2));
        $sheet->setCellValue("D{$r}", number_format($tot['hosxp_uc_money'], 2));
        $sheet->setCellValue("E{$r}", number_format($tot['hosxp_cash'] ?? 0, 2));

        $sheet->setCellValue("F{$r}", number_format($tot['rep_cases']));
        $sheet->setCellValue("G{$r}", number_format($tot['rep_claim'], 2));
        $sheet->setCellValue("H{$r}", number_format($tot['rep_c_deny_amount'], 2));

        $sheet->setCellValue("I{$r}", number_format($tot['stm_cases']));
        $sheet->setCellValue("J{$r}", number_format($tot['stm_approved'], 2));

        $sheet->setCellValue("K{$r}", number_format($tot['diff_hosxp_rep'], 2));
        $sheet->setCellValue("L{$r}", number_format($tot['diff_rep_stm'], 2));
        $sheet->setCellValue("M{$r}", $tot['recovery_rate'] . '%');

        $sheet->getStyle("A{$r}:M{$r}")->getFont()->setBold(true);
        $sheet->getStyle("A{$r}:M{$r}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFE2E8F0');
        $sheet->getStyle("B{$r}:M{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

        foreach (range('A', 'M') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $response = new StreamedResponse(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        });

        $response->headers->set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $response->headers->set('Content-Disposition', 'attachment; filename="'.$filename.'.xlsx"; filename*=UTF-8\'\''.rawurlencode($filename.'.xlsx'));
        $response->headers->set('Cache-Control', 'max-age=0');

        return $response;
    }

    /**
     * สร้างรายงาน PDF สรุปเปรียบเทียบข้อมูลรายเดือน 3 ฝ่าย (HOSxP vs REP vs STM)
     */
    public function exportMonthly3WayPdf(array $comparisonData, string $filename): Response
    {
        $thaiPdf = app(ThaiPdfService::class);
        [$fontRegularUri, $fontBoldUri] = $thaiPdf->fontUris('sarabun');

        $by = $comparisonData['budget_year'];
        $scheme = strtoupper($comparisonData['scheme']);
        $scope = $comparisonData['service_scope'] ?? 'all';
        $scopeLabel = match ($scope) {
            'hemodialysis' => 'เฉพาะผู้ป่วยไตเทียม (หน่วยไตเทียม)',
            'general' => 'ผู้ป่วยทั่วไป (ไม่รวมไตเทียม)',
            default => 'ผู้ป่วยทั้งหมด (รวมไตเทียม)',
        };

        $rowsHtml = '';
        foreach ($comparisonData['rows'] as $row) {
            $monthDisplay = $row['short_label_th'] ?? $row['full_label_th'];
            $rowsHtml .= '<tr>
                <td style="text-align:left; font-weight:bold;">' . htmlspecialchars($monthDisplay) . '</td>
                <td style="text-align:right;">' . number_format($row['hosxp_cases']) . '</td>
                <td style="text-align:right;">' . number_format($row['hosxp_uc_money'], 2) . '</td>
                <td style="text-align:right; color:#64748b;">' . number_format($row['hosxp_cash'] ?? 0, 2) . '</td>
                <td style="text-align:right;">' . number_format($row['rep_cases']) . '</td>
                <td style="text-align:right;">' . number_format($row['rep_claim'], 2) . '</td>
                <td style="text-align:right; color:#dc2626;">' . number_format($row['rep_c_deny_amount'], 2) . '</td>
                <td style="text-align:right;">' . number_format($row['stm_cases']) . '</td>
                <td style="text-align:right; font-weight:bold; color:#047857;">' . number_format($row['stm_approved'], 2) . '</td>
                <td style="text-align:right; color:' . ($row['diff_hosxp_rep'] > 0 ? '#b45309' : '#1e293b') . ';">' . number_format($row['diff_hosxp_rep'], 2) . '</td>
                <td style="text-align:right; color:' . ($row['diff_rep_stm'] > 0 ? '#dc2626' : '#047857') . ';">' . number_format($row['diff_rep_stm'], 2) . '</td>
                <td style="text-align:right; font-weight:bold;">' . $row['recovery_rate'] . '%</td>
            </tr>';
        }

        $tot = $comparisonData['totals'];
        $totalHtml = '<tr style="background-color:#f1f5f9; font-weight:bold;">
            <td style="text-align:left;">รวมทั้งสิ้น ปีงบประมาณ</td>
            <td style="text-align:right;">' . number_format($tot['hosxp_cases']) . '</td>
            <td style="text-align:right;">' . number_format($tot['hosxp_uc_money'], 2) . '</td>
            <td style="text-align:right; color:#64748b;">' . number_format($tot['hosxp_cash'] ?? 0, 2) . '</td>
            <td style="text-align:right;">' . number_format($tot['rep_cases']) . '</td>
            <td style="text-align:right;">' . number_format($tot['rep_claim'], 2) . '</td>
            <td style="text-align:right; color:#dc2626;">' . number_format($tot['rep_c_deny_amount'], 2) . '</td>
            <td style="text-align:right;">' . number_format($tot['stm_cases']) . '</td>
            <td style="text-align:right; color:#047857;">' . number_format($tot['stm_approved'], 2) . '</td>
            <td style="text-align:right;">' . number_format($tot['diff_hosxp_rep'], 2) . '</td>
            <td style="text-align:right;">' . number_format($tot['diff_rep_stm'], 2) . '</td>
            <td style="text-align:right;">' . $tot['recovery_rate'] . '%</td>
        </tr>';

        $html = '<!DOCTYPE html>
        <html lang="th">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
            <style>
                @font-face {
                    font-family: "sarabun";
                    font-style: normal;
                    font-weight: normal;
                    src: url("' . $fontRegularUri . '") format("truetype");
                }
                @font-face {
                    font-family: "sarabun";
                    font-style: normal;
                    font-weight: bold;
                    src: url("' . $fontBoldUri . '") format("truetype");
                }
                @page { margin: 18px 20px; }
                * { box-sizing: border-box; font-family: "sarabun", sans-serif; }
                body { font-size: 10px; color: #1e293b; line-height: 1.35; }
                .header { text-align: center; margin-bottom: 12px; }
                .header h2 { margin: 0; font-size: 15px; color: #047857; font-weight: bold; }
                .header p { margin: 2px 0 0; font-size: 9.5px; color: #64748b; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                th, td { border: 1px solid #cbd5e1; padding: 4px 5px; font-size: 8.5px; }
                th { background-color: #047857; color: #ffffff; font-weight: bold; text-align: center; }
                .sub-th { background-color: #f8fafc; color: #334155; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>รายงานเปรียบเทียบข้อมูลรายเดือน 3 ฝ่าย (HOSxP vs REP vs STM)</h2>
                <p>โรงพยาบาลค่ายสุรสิงหนาท | ปีงบประมาณ: ' . $by . ' | กองทุน: ' . $scheme . ' | กลุ่มบริการ: ' . $scopeLabel . ' | พิมพ์เมื่อ: ' . date('d/m/Y H:i:s') . '</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th rowspan="2" style="width:10%;">เดือน/ปี</th>
                        <th colspan="3" style="background-color:#0284c7;">[1] HOSxP (รพ.)</th>
                        <th colspan="3" style="background-color:#d97706;">[2] REP (e-Claim)</th>
                        <th colspan="2" style="background-color:#059669;">[3] STM (โอนจริง)</th>
                        <th colspan="3" style="background-color:#475569;">[4] เปรียบเทียบผลต่าง</th>
                    </tr>
                    <tr class="sub-th">
                        <th>เคส</th>
                        <th>ลูกหนี้สิทธิ</th>
                        <th>เงินสดคนไข้</th>
                        <th>เคส</th>
                        <th>ยอดตั้งเบิก</th>
                        <th>ยอดติด C</th>
                        <th>เคส</th>
                        <th>ยอดโอนจริง</th>
                        <th>ค้างส่งเบิก</th>
                        <th>รอโอน/ติดหัก</th>
                        <th>% ชดเชย</th>
                    </tr>
                </thead>
                <tbody>
                    ' . $rowsHtml . '
                    ' . $totalHtml . '
                </tbody>
            </table>
        </body>
        </html>';

        $pdf = $thaiPdf->render($html, 'landscape', true, 'sarabun');

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $filename . '.pdf"; filename*=UTF-8\'\'' . rawurlencode($filename . '.pdf'),
        ]);
    }

    /**
     * สร้างรายงาน PDF ทั่วไป (รองรับฟอนต์ Sarabun ภาษาไทยสมบูรณ์)
     */
    public function exportPdf(string $title, array $headers, array $data, string $filename): Response
    {
        $thaiPdf = app(ThaiPdfService::class);
        [$fontRegularUri, $fontBoldUri] = $thaiPdf->fontUris('sarabun');

        $html = '<!DOCTYPE html>
        <html lang="th">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
            <style>
                @font-face {
                    font-family: "sarabun";
                    font-style: normal;
                    font-weight: normal;
                    src: url("' . $fontRegularUri . '") format("truetype");
                }
                @font-face {
                    font-family: "sarabun";
                    font-style: normal;
                    font-weight: bold;
                    src: url("' . $fontBoldUri . '") format("truetype");
                }
                @page { margin: 20px 24px; }
                * { box-sizing: border-box; font-family: "sarabun", sans-serif; }
                body { font-size: 11px; color: #1e293b; line-height: 1.35; }
                .header { text-align: center; margin-bottom: 15px; }
                .header h2 { margin: 0; font-size: 16px; color: #047857; font-weight: bold; }
                .header p { margin: 3px 0 0; font-size: 10px; color: #64748b; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #cbd5e1; padding: 4px 6px; font-size: 9.5px; }
                th { background-color: #047857; color: #ffffff; font-weight: bold; text-align: center; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>' . htmlspecialchars($title) . '</h2>
                <p>โรงพยาบาลค่ายสุรสิงหนาท | พิมพ์เมื่อ: ' . date('d/m/Y H:i:s') . '</p>
            </div>
            <table>
                <thead>
                    <tr>';

        foreach ($headers as $header) {
            $html .= '<th>' . htmlspecialchars($header) . '</th>';
        }

        $html .= '</tr></thead><tbody>';

        foreach ($data as $row) {
            $html .= '<tr>';
            foreach ($row as $val) {
                $html .= '<td>' . htmlspecialchars((string) $val) . '</td>';
            }
            $html .= '</tr>';
        }

        $html .= '</tbody></table></body></html>';

        $pdf = $thaiPdf->render($html, 'landscape', true, 'sarabun');

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $filename . '.pdf"; filename*=UTF-8\'\'' . rawurlencode($filename . '.pdf'),
        ]);
    }

    /**
     * สร้างรายงาน Excel สรุปเปรียบเทียบไตเทียม 3 ฝ่าย (HOSxP 021 vs e-Claim REP vs NHSO SMT เงินโอนจริง)
     */
    public function exportDialysis3WayExcel(array $comparisonData, string $filename): StreamedResponse
    {
        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('TH SarabunPSK')->setSize(14);

        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('เปรียบเทียบไตเทียม 3 ฝ่าย');

        $by = $comparisonData['budget_year'];
        $scheme = strtoupper($comparisonData['scheme']);
        $serviceType = $comparisonData['service_type'] ?? 'all';
        $typeLabel = match ($serviceType) {
            'epo_drug' => 'เฉพาะค่ายา EPO / กระตุ้นเม็ดเลือด',
            'hd_fee' => 'เฉพาะค่าหัตถการฟอกเลือด',
            default => 'บริการไตเทียมทั้งหมด (รวมค่ายาและค่าฟอกเลือด)',
        };

        // Header Title
        $sheet->mergeCells('A1:L1');
        $sheet->setCellValue('A1', "รายงานเปรียบเทียบข้อมูลไตเทียม 3 ฝ่าย (HOSxP หน่วยไตเทียม vs e-Claim REP vs สปสช. SMT เงินโอนจริง) - โรงพยาบาลค่ายสุรสิงหนาท");
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(16);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet->mergeCells('A2:L2');
        $sheet->setCellValue('A2', "ปีงบประมาณ: {$by} | สิทธิ: {$scheme} | ประเภท: {$typeLabel} | พิมพ์เมื่อ: " . date('d/m/Y H:i:s'));
        $sheet->getStyle('A2')->getFont()->setSize(12)->setItalic(true);
        $sheet->getStyle('A2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // Group Headers
        $sheet->mergeCells('A4:A5');
        $sheet->setCellValue('A4', 'เดือน/ปี');

        $sheet->mergeCells('B4:D4');
        $sheet->setCellValue('B4', '[1] HOSxP ไตเทียม (แผนก 021)');
        $sheet->getStyle('B4')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFE0F2FE');

        $sheet->mergeCells('E4:G4');
        $sheet->setCellValue('E4', '[2] e-Claim / REP ไตเทียม');
        $sheet->getStyle('E4')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FEFEF3C7');

        $sheet->mergeCells('H4:I4');
        $sheet->setCellValue('H4', '[3] สปสช. SMT (เงินโอนจริง)');
        $sheet->getStyle('H4')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFD1FAE5');

        $sheet->mergeCells('J4:L4');
        $sheet->setCellValue('J4', '[4] เปรียบเทียบผลต่าง & สรุป');
        $sheet->getStyle('J4')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFF1F5F9');

        $sheet->getStyle('A4:L4')->getFont()->setBold(true);
        $sheet->getStyle('A4:L4')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // Sub Headers
        $subHeaders = [
            'A5' => 'เดือน/ปี',
            'B5' => 'ครั้งฟอกไต',
            'C5' => 'ลูกหนี้เรียกเก็บ (฿)',
            'D5' => 'ค่ายา EPO (฿)',
            'E5' => 'เคสส่งเบิก',
            'F5' => 'ยอดตั้งเบิก (฿)',
            'G5' => 'ยอดอนุมัติ (฿)',
            'H5' => 'งวดโอน SMT',
            'I5' => 'ยอดเงินโอนจริง (฿)',
            'J5' => 'ส่วนต่างส่งเบิก (฿)',
            'K5' => 'ส่วนต่างเงินโอน (฿)',
            'L5' => 'ได้เงินจริง (%)',
        ];

        foreach ($subHeaders as $cell => $text) {
            $sheet->setCellValue($cell, $text);
            $sheet->getStyle($cell)->getFont()->setBold(true);
            $sheet->getStyle($cell)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        }

        $rowIdx = 6;
        foreach ($comparisonData['rows'] as $row) {
            $monthDisplay = $row['short_label_th'] ?? $row['full_label_th'];
            $sheet->setCellValue("A{$rowIdx}", $monthDisplay);
            $sheet->setCellValue("B{$rowIdx}", $row['hosxp_cases']);
            $sheet->setCellValue("C{$rowIdx}", $row['hosxp_uc_money']);
            $sheet->setCellValue("D{$rowIdx}", $row['hosxp_drug_epo']);
            $sheet->setCellValue("E{$rowIdx}", $row['rep_cases']);
            $sheet->setCellValue("F{$rowIdx}", $row['rep_claim']);
            $sheet->setCellValue("G{$rowIdx}", $row['rep_approved']);
            $sheet->setCellValue("H{$rowIdx}", $row['smt_batches']);
            $sheet->setCellValue("I{$rowIdx}", $row['smt_total_transferred']);
            $sheet->setCellValue("J{$rowIdx}", $row['diff_hosxp_rep']);
            $sheet->setCellValue("K{$rowIdx}", $row['diff_hosxp_smt']);
            $sheet->setCellValue("L{$rowIdx}", $row['recovery_rate'] . '%');

            $sheet->getStyle("A{$rowIdx}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
            $sheet->getStyle("B{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0');
            $sheet->getStyle("C{$rowIdx}:D{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0.00');
            $sheet->getStyle("E{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0');
            $sheet->getStyle("F{$rowIdx}:G{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0.00');
            $sheet->getStyle("H{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0');
            $sheet->getStyle("I{$rowIdx}:K{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0.00');
            $sheet->getStyle("L{$rowIdx}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

            $rowIdx++;
        }

        // Row Total
        $tot = $comparisonData['totals'];
        $sheet->setCellValue("A{$rowIdx}", 'รวมทั้งสิ้น ปีงบประมาณ');
        $sheet->setCellValue("B{$rowIdx}", $tot['hosxp_cases']);
        $sheet->setCellValue("C{$rowIdx}", $tot['hosxp_uc_money']);
        $sheet->setCellValue("D{$rowIdx}", $tot['hosxp_drug_epo']);
        $sheet->setCellValue("E{$rowIdx}", $tot['rep_cases']);
        $sheet->setCellValue("F{$rowIdx}", $tot['rep_claim']);
        $sheet->setCellValue("G{$rowIdx}", $tot['rep_approved']);
        $sheet->setCellValue("H{$rowIdx}", $tot['smt_batches']);
        $sheet->setCellValue("I{$rowIdx}", $tot['smt_total_transferred']);
        $sheet->setCellValue("J{$rowIdx}", $tot['diff_hosxp_rep']);
        $sheet->setCellValue("K{$rowIdx}", $tot['diff_hosxp_smt']);
        $sheet->setCellValue("L{$rowIdx}", $tot['recovery_rate'] . '%');

        $totalRange = "A{$rowIdx}:L{$rowIdx}";
        $sheet->getStyle($totalRange)->getFont()->setBold(true);
        $sheet->getStyle($totalRange)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFF1F5F9');
        $sheet->getStyle("B{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0');
        $sheet->getStyle("C{$rowIdx}:D{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0.00');
        $sheet->getStyle("E{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0');
        $sheet->getStyle("F{$rowIdx}:G{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0.00');
        $sheet->getStyle("H{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0');
        $sheet->getStyle("I{$rowIdx}:K{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0.00');

        $borderStyle = [
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['argb' => 'FFCBD5E1'],
                ],
            ],
        ];
        $sheet->getStyle("A4:L{$rowIdx}")->applyFromArray($borderStyle);

        foreach (range('A', 'L') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename . '.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    /**
     * สร้างรายงาน PDF สรุปเปรียบเทียบไตเทียม 3 ฝ่าย (HOSxP 021 vs e-Claim REP vs NHSO SMT)
     */
    public function exportDialysis3WayPdf(array $comparisonData, string $filename): Response
    {
        $thaiPdf = app(ThaiPdfService::class);
        [$fontRegularUri, $fontBoldUri] = $thaiPdf->fontUris('sarabun');

        $by = $comparisonData['budget_year'];
        $scheme = strtoupper($comparisonData['scheme']);
        $serviceType = $comparisonData['service_type'] ?? 'all';
        $typeLabel = match ($serviceType) {
            'epo_drug' => 'เฉพาะค่ายา EPO / กระตุ้นเม็ดเลือด',
            'hd_fee' => 'เฉพาะค่าหัตถการฟอกเลือด',
            default => 'บริการไตเทียมทั้งหมด (รวมค่ายาและค่าฟอกเลือด)',
        };

        $rowsHtml = '';
        foreach ($comparisonData['rows'] as $row) {
            $monthDisplay = $row['short_label_th'] ?? $row['full_label_th'];
            $rowsHtml .= '<tr>
                <td style="text-align:left; font-weight:bold;">' . htmlspecialchars($monthDisplay) . '</td>
                <td style="text-align:right;">' . number_format($row['hosxp_cases']) . '</td>
                <td style="text-align:right;">' . number_format($row['hosxp_uc_money'], 2) . '</td>
                <td style="text-align:right; color:#0369a1;">' . number_format($row['hosxp_drug_epo'], 2) . '</td>
                <td style="text-align:right;">' . number_format($row['rep_cases']) . '</td>
                <td style="text-align:right;">' . number_format($row['rep_claim'], 2) . '</td>
                <td style="text-align:right;">' . number_format($row['rep_approved'], 2) . '</td>
                <td style="text-align:right;">' . number_format($row['smt_batches']) . '</td>
                <td style="text-align:right; font-weight:bold; color:#047857;">' . number_format($row['smt_total_transferred'], 2) . '</td>
                <td style="text-align:right; color:' . ($row['diff_hosxp_rep'] > 0 ? '#b45309' : '#1e293b') . ';">' . number_format($row['diff_hosxp_rep'], 2) . '</td>
                <td style="text-align:right; font-weight:bold;">' . $row['recovery_rate'] . '%</td>
            </tr>';
        }

        $tot = $comparisonData['totals'];
        $totalHtml = '<tr style="background-color:#f1f5f9; font-weight:bold;">
            <td style="text-align:left;">รวมทั้งสิ้น ปีงบประมาณ</td>
            <td style="text-align:right;">' . number_format($tot['hosxp_cases']) . '</td>
            <td style="text-align:right;">' . number_format($tot['hosxp_uc_money'], 2) . '</td>
            <td style="text-align:right; color:#0369a1;">' . number_format($tot['hosxp_drug_epo'], 2) . '</td>
            <td style="text-align:right;">' . number_format($tot['rep_cases']) . '</td>
            <td style="text-align:right;">' . number_format($tot['rep_claim'], 2) . '</td>
            <td style="text-align:right;">' . number_format($tot['rep_approved'], 2) . '</td>
            <td style="text-align:right;">' . number_format($tot['smt_batches']) . '</td>
            <td style="text-align:right; color:#047857;">' . number_format($tot['smt_total_transferred'], 2) . '</td>
            <td style="text-align:right;">' . number_format($tot['diff_hosxp_rep'], 2) . '</td>
            <td style="text-align:right;">' . $tot['recovery_rate'] . '%</td>
        </tr>';

        $html = '<!DOCTYPE html>
        <html lang="th">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
            <style>
                @font-face {
                    font-family: "sarabun";
                    font-style: normal;
                    font-weight: normal;
                    src: url("' . $fontRegularUri . '") format("truetype");
                }
                @font-face {
                    font-family: "sarabun";
                    font-style: normal;
                    font-weight: bold;
                    src: url("' . $fontBoldUri . '") format("truetype");
                }
                @page { margin: 18px 22px; }
                * { box-sizing: border-box; font-family: "sarabun", sans-serif; }
                body { font-size: 10.5px; color: #1e293b; line-height: 1.35; }
                .header { text-align: center; margin-bottom: 12px; }
                .header h2 { margin: 0; font-size: 15px; color: #0f766e; font-weight: bold; }
                .header p { margin: 3px 0 0; font-size: 10px; color: #64748b; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                th, td { border: 1px solid #cbd5e1; padding: 4px 5px; font-size: 9.5px; }
                th { background-color: #0f766e; color: #ffffff; font-weight: bold; text-align: center; }
                .sub-th-hosxp { background-color: #0284c7; color: #ffffff; }
                .sub-th-rep { background-color: #d97706; color: #ffffff; }
                .sub-th-smt { background-color: #059669; color: #ffffff; }
                .sub-th-summary { background-color: #475569; color: #ffffff; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>รายงานเปรียบเทียบข้อมูลไตเทียม 3 ฝ่าย (HOSxP 021 vs e-Claim REP vs สปสช. SMT เงินโอนจริง)</h2>
                <p>โรงพยาบาลค่ายสุรสิงหนาท | ปีงบประมาณ: ' . $by . ' | สิทธิ: ' . $scheme . ' | ประเภท: ' . $typeLabel . ' | พิมพ์เมื่อ: ' . date('d/m/Y H:i:s') . '</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th rowspan="2" style="width:11%;">เดือน/ปี</th>
                        <th colspan="3" class="sub-th-hosxp" style="width:27%;">[1] HOSxP ไตเทียม (021)</th>
                        <th colspan="3" class="sub-th-rep" style="width:25%;">[2] e-Claim / REP</th>
                        <th colspan="2" class="sub-th-smt" style="width:19%;">[3] SMT เงินโอนจริง</th>
                        <th colspan="2" class="sub-th-summary" style="width:18%;">[4] สรุป & KPIs</th>
                    </tr>
                    <tr>
                        <th class="sub-th-hosxp">ครั้งฟอก</th>
                        <th class="sub-th-hosxp">ลูกหนี้ (฿)</th>
                        <th class="sub-th-hosxp">ยา EPO (฿)</th>
                        <th class="sub-th-rep">เคสเบิก</th>
                        <th class="sub-th-rep">ตั้งเบิก (฿)</th>
                        <th class="sub-th-rep">อนุมัติ (฿)</th>
                        <th class="sub-th-smt">งวดโอน</th>
                        <th class="sub-th-smt">เงินโอนจริง (฿)</th>
                        <th class="sub-th-summary">ค้างส่ง (฿)</th>
                        <th class="sub-th-summary">ชดเชย (%)</th>
                    </tr>
                </thead>
                <tbody>
                    ' . $rowsHtml . '
                    ' . $totalHtml . '
                </tbody>
            </table>
        </body>
        </html>';

        $pdf = $thaiPdf->render($html, 'landscape', true, 'sarabun');

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $filename . '.pdf"; filename*=UTF-8\'\'' . rawurlencode($filename . '.pdf'),
        ]);
    }

    /**
     * ส่งออกรายงาน Excel สรุปเปรียบเทียบข้อมูลบัตรทอง (UC) 3 ฝ่าย
     */
    public function exportUc3WayExcel(array $comparisonData, string $filename): StreamedResponse
    {
        $spreadsheet = new Spreadsheet();
        $spreadsheet->getDefaultStyle()->getFont()->setName('TH SarabunPSK')->setSize(14);

        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('เปรียบเทียบบัตรทอง 3 ฝ่าย');

        $period = $comparisonData['period_mode'];
        $periodLabel = $period === 'since_jan_68' ? 'ย้อนหลังตั้งแต่ ม.ค.68 ถึงปัจจุบัน' : "ปีงบประมาณ {$period}";
        $subScheme = match ($comparisonData['sub_scheme'] ?? 'all') {
            'emergency' => 'บัตรทองฉุกเฉิน (04)',
            'camp_hospital' => 'บัตรทอง รพ.ค่ายฯ (03)',
            'soldier_civic' => 'พลทหารและวิวัฒน์พลเมือง (19)',
            default => 'สิทธิบัตรทองทั้งหมด (All UC - ไม่รวมไตเทียม)',
        };
        $claimType = match ($comparisonData['claim_type'] ?? 'all') {
            'opd' => 'ผู้ป่วยนอก (OPD)',
            'ipd' => 'ผู้ป่วยใน (IPD)',
            default => 'ทั้งหมด (OPD + IPD)',
        };

        // หัวตาราง
        $sheet->setCellValue('A1', 'รายงานเปรียบเทียบข้อมูลสิทธิบัตรทอง (UC) 3 ฝ่าย: HOSxP vs e-Claim REP vs e-Claim Statement (STM)');
        $sheet->setCellValue('A2', "โรงพยาบาลค่ายสุรสิงหนาท | ช่วงเวลา: {$periodLabel} | สิทธิย่อย: {$subScheme} | แผนก: {$claimType} | พิมพ์เมื่อ: " . date('d/m/Y H:i:s'));
        $sheet->mergeCells('A1:L1');
        $sheet->mergeCells('A2:L2');

        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(16)->getColor()->setARGB('FF047857');
        $sheet->getStyle('A2')->getFont()->setSize(12)->getColor()->setARGB('FF475569');

        // แถวหัวข้อหลัก (Row 4 & 5)
        $sheet->setCellValue('A4', 'เดือน/ปี');
        $sheet->mergeCells('A4:A5');

        $sheet->setCellValue('B4', '[1] HOSxP (บริการและลูกหนี้สิทธิ)');
        $sheet->mergeCells('B4:E4');
        $sheet->setCellValue('B5', 'จำนวนเคส');
        $sheet->setCellValue('C5', 'ค่ารักษา (฿)');
        $sheet->setCellValue('D5', 'ลูกหนี้สิทธิ UC (฿)');
        $sheet->setCellValue('E5', 'ชำระเงินสด (฿)');

        $sheet->setCellValue('F4', '[2] e-Claim / REP (การส่งเบิก)');
        $sheet->mergeCells('F4:H4');
        $sheet->setCellValue('F5', 'เคสส่งเบิก');
        $sheet->setCellValue('G5', 'ยอดตั้งเบิก (฿)');
        $sheet->setCellValue('H5', 'ยอดอนุมัติ (฿)');

        $sheet->setCellValue('I4', '[3] e-Claim STM (อนุมัติจ่ายจริง)');
        $sheet->mergeCells('I4:J4');
        $sheet->setCellValue('I5', 'งวด STM');
        $sheet->setCellValue('J5', 'ยอดอนุมัติจ่าย (฿)');

        $sheet->setCellValue('K4', '[4] เปรียบเทียบผลต่าง & KPIs');
        $sheet->mergeCells('K4:L4');
        $sheet->setCellValue('K5', 'ผลต่าง HOSxP vs STM (฿)');
        $sheet->setCellValue('L5', 'ชดเชย (%)');

        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF'], 'size' => 13],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FF94A3B8']]],
        ];

        $sheet->getStyle('A4:A5')->applyFromArray($headerStyle)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF047857');
        $sheet->getStyle('B4:E5')->applyFromArray($headerStyle)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF0284C7');
        $sheet->getStyle('F4:H5')->applyFromArray($headerStyle)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFD97706');
        $sheet->getStyle('I4:J5')->applyFromArray($headerStyle)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF059669');
        $sheet->getStyle('K4:L5')->applyFromArray($headerStyle)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF475569');

        $rowIdx = 6;
        foreach ($comparisonData['rows'] as $r) {
            $sheet->setCellValue("A{$rowIdx}", $r['full_label_th']);
            $sheet->setCellValue("B{$rowIdx}", $r['hosxp_cases']);
            $sheet->setCellValue("C{$rowIdx}", $r['hosxp_income']);
            $sheet->setCellValue("D{$rowIdx}", $r['hosxp_uc_money']);
            $sheet->setCellValue("E{$rowIdx}", $r['hosxp_cash']);

            $sheet->setCellValue("F{$rowIdx}", $r['rep_cases']);
            $sheet->setCellValue("G{$rowIdx}", $r['rep_claim']);
            $sheet->setCellValue("H{$rowIdx}", $r['rep_approved']);

            $sheet->setCellValue("I{$rowIdx}", $r['smt_batches']);
            $sheet->setCellValue("J{$rowIdx}", $r['smt_total_transferred']);

            $sheet->setCellValue("K{$rowIdx}", $r['diff_hosxp_smt']);
            $sheet->setCellValue("L{$rowIdx}", $r['recovery_rate']);

            $sheet->getStyle("A{$rowIdx}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
            $sheet->getStyle("B{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0');
            $sheet->getStyle("C{$rowIdx}:E{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0.00');
            $sheet->getStyle("F{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0');
            $sheet->getStyle("G{$rowIdx}:H{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0.00');
            $sheet->getStyle("I{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0');
            $sheet->getStyle("J{$rowIdx}:K{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0.00');
            $sheet->getStyle("L{$rowIdx}")->getNumberFormat()->setFormatCode('0.00"%"');

            $sheet->getStyle("A{$rowIdx}:L{$rowIdx}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setARGB('FFE2E8F0');
            $rowIdx++;
        }

        // แถวรวมทั้งหมด (Total Row)
        $t = $comparisonData['totals'];
        $sheet->setCellValue("A{$rowIdx}", 'รวมทั้งสิ้น');
        $sheet->setCellValue("B{$rowIdx}", $t['hosxp_cases']);
        $sheet->setCellValue("C{$rowIdx}", $t['hosxp_income']);
        $sheet->setCellValue("D{$rowIdx}", $t['hosxp_uc_money']);
        $sheet->setCellValue("E{$rowIdx}", $t['hosxp_cash']);

        $sheet->setCellValue("F{$rowIdx}", $t['rep_cases']);
        $sheet->setCellValue("G{$rowIdx}", $t['rep_claim']);
        $sheet->setCellValue("H{$rowIdx}", $t['rep_approved']);

        $sheet->setCellValue("I{$rowIdx}", $t['smt_batches']);
        $sheet->setCellValue("J{$rowIdx}", $t['smt_total_transferred']);

        $sheet->setCellValue("K{$rowIdx}", $t['diff_hosxp_smt']);
        $sheet->setCellValue("L{$rowIdx}", $t['recovery_rate']);

        $totalStyle = [
            'font' => ['bold' => true, 'size' => 13],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFF1F5F9']],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['argb' => 'FF64748B']]],
        ];
        $sheet->getStyle("A{$rowIdx}:L{$rowIdx}")->applyFromArray($totalStyle);
        $sheet->getStyle("B{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0');
        $sheet->getStyle("C{$rowIdx}:E{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0.00');
        $sheet->getStyle("F{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0');
        $sheet->getStyle("G{$rowIdx}:H{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0.00');
        $sheet->getStyle("I{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0');
        $sheet->getStyle("J{$rowIdx}:K{$rowIdx}")->getNumberFormat()->setFormatCode('#,##0.00');
        $sheet->getStyle("L{$rowIdx}")->getNumberFormat()->setFormatCode('0.00"%"');

        foreach (range('A', 'L') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, "{$filename}.xlsx", [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * ส่งออกรายงาน PDF สรุปเปรียบเทียบข้อมูลบัตรทอง (UC) 3 ฝ่าย
     */
    public function exportUc3WayPdf(array $comparisonData, string $filename): Response
    {
        $thaiPdf = app(ThaiPdfService::class);
        [$fontRegularUri, $fontBoldUri] = $thaiPdf->fontUris('sarabun');

        $period = $comparisonData['period_mode'];
        $periodLabel = $period === 'since_jan_68' ? 'ย้อนหลังตั้งแต่ ม.ค.68 ถึงปัจจุบัน' : "ปีงบประมาณ {$period}";
        $subScheme = match ($comparisonData['sub_scheme'] ?? 'all') {
            'emergency' => 'บัตรทองฉุกเฉิน (04)',
            'camp_hospital' => 'บัตรทอง รพ.ค่ายฯ (03)',
            'soldier_civic' => 'พลทหารและวิวัฒน์พลเมือง (19)',
            default => 'สิทธิบัตรทองทั้งหมด (All UC - ไม่รวมไตเทียม)',
        };
        $claimType = match ($comparisonData['claim_type'] ?? 'all') {
            'opd' => 'ผู้ป่วยนอก (OPD)',
            'ipd' => 'ผู้ป่วยใน (IPD)',
            default => 'ทั้งหมด (OPD + IPD)',
        };

        $rowsHtml = '';
        foreach ($comparisonData['rows'] as $r) {
            $rowsHtml .= '<tr>
                <td style="text-align:left; font-weight:bold;">' . htmlspecialchars($r['full_label_th']) . '</td>
                <td style="text-align:right;">' . number_format($r['hosxp_cases']) . '</td>
                <td style="text-align:right;">' . number_format($r['hosxp_uc_money'], 2) . '</td>
                <td style="text-align:right;">' . number_format($r['hosxp_cash'], 2) . '</td>
                <td style="text-align:right;">' . number_format($r['rep_cases']) . '</td>
                <td style="text-align:right;">' . number_format($r['rep_claim'], 2) . '</td>
                <td style="text-align:right;">' . number_format($r['rep_approved'], 2) . '</td>
                <td style="text-align:right;">' . number_format($r['smt_batches']) . '</td>
                <td style="text-align:right; font-weight:bold; color:#059669;">' . number_format($r['smt_total_transferred'], 2) . '</td>
                <td style="text-align:right;">' . number_format($r['diff_hosxp_smt'], 2) . '</td>
                <td style="text-align:center; font-weight:bold;">' . number_format($r['recovery_rate'], 1) . '%</td>
            </tr>';
        }

        $t = $comparisonData['totals'];
        $totalHtml = '<tr style="background-color:#f1f5f9; font-weight:bold;">
            <td style="text-align:left;">รวมทั้งสิ้น</td>
            <td style="text-align:right;">' . number_format($t['hosxp_cases']) . '</td>
            <td style="text-align:right;">' . number_format($t['hosxp_uc_money'], 2) . '</td>
            <td style="text-align:right;">' . number_format($t['hosxp_cash'], 2) . '</td>
            <td style="text-align:right;">' . number_format($t['rep_cases']) . '</td>
            <td style="text-align:right;">' . number_format($t['rep_claim'], 2) . '</td>
            <td style="text-align:right;">' . number_format($t['rep_approved'], 2) . '</td>
            <td style="text-align:right;">' . number_format($t['smt_batches']) . '</td>
            <td style="text-align:right; color:#059669;">' . number_format($t['smt_total_transferred'], 2) . '</td>
            <td style="text-align:right;">' . number_format($t['diff_hosxp_smt'], 2) . '</td>
            <td style="text-align:center;">' . number_format($t['recovery_rate'], 1) . '%</td>
        </tr>';

        $html = '<!DOCTYPE html>
        <html lang="th">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
            <style>
                @font-face {
                    font-family: "sarabun";
                    font-style: normal;
                    font-weight: normal;
                    src: url("' . $fontRegularUri . '") format("truetype");
                }
                @font-face {
                    font-family: "sarabun";
                    font-style: normal;
                    font-weight: bold;
                    src: url("' . $fontBoldUri . '") format("truetype");
                }
                @page { margin: 18px 22px; }
                * { box-sizing: border-box; font-family: "sarabun", sans-serif; }
                body { font-size: 10.5px; color: #1e293b; line-height: 1.35; }
                .header { text-align: center; margin-bottom: 12px; }
                .header h2 { margin: 0; font-size: 15px; color: #047857; font-weight: bold; }
                .header p { margin: 3px 0 0; font-size: 10px; color: #64748b; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                th, td { border: 1px solid #cbd5e1; padding: 4px 5px; font-size: 9.5px; }
                th { background-color: #047857; color: #ffffff; font-weight: bold; text-align: center; }
                .sub-th-hosxp { background-color: #0284c7; color: #ffffff; }
                .sub-th-rep { background-color: #d97706; color: #ffffff; }
                .sub-th-smt { background-color: #059669; color: #ffffff; }
                .sub-th-summary { background-color: #475569; color: #ffffff; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>รายงานเปรียบเทียบข้อมูลสิทธิบัตรทอง (UC) 3 ฝ่าย (HOSxP vs e-Claim REP vs e-Claim Statement STM)</h2>
                <p>โรงพยาบาลค่ายสุรสิงหนาท | ช่วงเวลา: ' . $periodLabel . ' | สิทธิย่อย: ' . $subScheme . ' | แผนก: ' . $claimType . ' | พิมพ์เมื่อ: ' . date('d/m/Y H:i:s') . '</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th rowspan="2" style="width:13%;">เดือน/ปี</th>
                        <th colspan="3" class="sub-th-hosxp" style="width:26%;">[1] HOSxP (สิทธิบัตรทอง)</th>
                        <th colspan="3" class="sub-th-rep" style="width:25%;">[2] e-Claim / REP</th>
                        <th colspan="2" class="sub-th-smt" style="width:18%;">[3] e-Claim STM (อนุมัติจ่าย)</th>
                        <th colspan="2" class="sub-th-summary" style="width:18%;">[4] สรุป & KPIs</th>
                    </tr>
                    <tr>
                        <th class="sub-th-hosxp">เคส</th>
                        <th class="sub-th-hosxp">ลูกหนี้สิทธิ (฿)</th>
                        <th class="sub-th-hosxp">เงินสด (฿)</th>
                        <th class="sub-th-rep">เคสเบิก</th>
                        <th class="sub-th-rep">ตั้งเบิก (฿)</th>
                        <th class="sub-th-rep">อนุมัติ (฿)</th>
                        <th class="sub-th-smt">งวด STM</th>
                        <th class="sub-th-smt">อนุมัติจ่าย (฿)</th>
                        <th class="sub-th-summary">ผลต่างรวม (฿)</th>
                        <th class="sub-th-summary">ชดเชย (%)</th>
                    </tr>
                </thead>
                <tbody>
                    ' . $rowsHtml . '
                    ' . $totalHtml . '
                </tbody>
            </table>
        </body>
        </html>';

        $pdf = $thaiPdf->render($html, 'landscape', true, 'sarabun');

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $filename . '.pdf"; filename*=UTF-8\'\'' . rawurlencode($filename . '.pdf'),
        ]);
    }
}
