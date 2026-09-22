<?php

namespace App\Services\Pharmacy;

use App\Models\Pharmacy\PharmacyItem;
use App\Models\Pharmacy\PharmacyLocation;
use App\Models\Pharmacy\PharmacyLot;
use App\Models\Pharmacy\PharmacyStockBalance;
use App\Models\Pharmacy\PharmacyStockMovement;
use App\Services\HosxpConnectionService;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PharmacyStockExcelService
{
    public const COLUMNS = [
        'icode' => ['index' => 1, 'col' => 'A', 'title' => 'รหัสรายการ (icode)', 'width' => 14],
        'name' => ['index' => 2, 'col' => 'B', 'title' => 'ชื่อยา / เวชภัณฑ์', 'width' => 42],
        'item_type' => ['index' => 3, 'col' => 'C', 'title' => 'ประเภทรายการ', 'width' => 22],
        'strength' => ['index' => 4, 'col' => 'D', 'title' => 'ขนาด / ความแรง', 'width' => 16],
        'unit' => ['index' => 5, 'col' => 'E', 'title' => 'หน่วยนับ', 'width' => 12],
        'location_code' => ['index' => 6, 'col' => 'F', 'title' => 'รหัสคลัง (location_code)', 'width' => 16],
        'location_name' => ['index' => 7, 'col' => 'G', 'title' => 'ชื่อสถานที่จัดเก็บ', 'width' => 22],
        'counted_qty' => ['index' => 8, 'col' => 'H', 'title' => 'จำนวนคงเหลือจริง *', 'width' => 22],
        'lot_no' => ['index' => 9, 'col' => 'I', 'title' => 'หมายเลข Lot (เว้นว่างได้)', 'width' => 22],
        'expires_at' => ['index' => 10, 'col' => 'J', 'title' => 'วันหมดอายุ (YYYY-MM-DD)', 'width' => 22],
        'unit_price' => ['index' => 11, 'col' => 'K', 'title' => 'ราคาต่อหน่วย (บาท)', 'width' => 18],
        'reorder_level' => ['index' => 12, 'col' => 'L', 'title' => 'ขั้นต่ำที่ต้องสั่งซื้อ (Reorder Level)', 'width' => 24],
        'notes' => ['index' => 13, 'col' => 'M', 'title' => 'หมายเหตุ', 'width' => 25],
    ];

    public function __construct(
        private readonly HosxpConnectionService $hosxp,
        private readonly PharmacyInventoryService $inventoryService
    ) {}

    /**
     * สร้างและดาวน์โหลด Template Excel (.xlsx) ที่ดึงข้อมูลยาและเวชภัณฑ์จากระบบและ HOSxP ไว้ล่วงหน้า
     */
    public function exportTemplate(?int $locationId = null, string $itemScope = 'all'): StreamedResponse
    {
        // 1. ตรวจสอบคลังจัดเก็บ
        $location = null;
        if ($locationId) {
            $location = PharmacyLocation::query()->find($locationId);
        }
        if (! $location) {
            $location = PharmacyLocation::query()->where('is_active', true)->orderBy('sort_order')->first()
                ?? PharmacyLocation::query()->firstOrCreate(
                    ['code' => 'WH-MAIN'],
                    ['name' => 'คลังยาหลัก', 'type' => 'warehouse', 'sort_order' => 1]
                );
        }

        // 2. ดึงรายการยาและเวชภัณฑ์
        $query = PharmacyItem::query()->where('is_active', true);
        if ($itemScope === 'drug') {
            $query->where('item_type', 'drug');
        } elseif ($itemScope === 'nondrug') {
            $query->where('item_type', 'nondrug');
        }
        $items = $query->orderBy('item_type')->orderBy('name')->get();

        // 3. ดึงยอดคงเหลือและขั้นต่ำที่ต้องสั่งซื้อเดิม (ถ้ามี)
        $balances = PharmacyStockBalance::query()
            ->where('location_id', $location->id)
            ->get()
            ->keyBy('item_id');

        // 4. ดึงราคาต่อหน่วยจาก HOSxP (ถ้าเชื่อมต่อได้)
        $hosxpPrices = [];
        try {
            $status = $this->hosxp->check(false);
            if ($status['connected'] ?? false) {
                // ยา
                $drugRows = DB::connection('hosxp')->table('drugitems')
                    ->select(['icode', 'unitcost', 'unitprice'])
                    ->get();
                foreach ($drugRows as $dr) {
                    $c = (float) ($dr->unitcost ?: 0);
                    $p = (float) ($dr->unitprice ?: 0);
                    $hosxpPrices[trim($dr->icode)] = $c > 0 ? $c : $p;
                }
                // เวชภัณฑ์มิใช่ยา
                $ndRows = DB::connection('hosxp')->table('nondrugitems')
                    ->where('income', '05')
                    ->select(['icode', 'price', 'unitcost'])
                    ->get();
                foreach ($ndRows as $nd) {
                    $c = (float) ($nd->unitcost ?: 0);
                    $p = (float) ($nd->price ?: 0);
                    $hosxpPrices[trim($nd->icode)] = $c > 0 ? $c : $p;
                }
            }
        } catch (\Throwable $e) {
            // ไม่บล็อก หาก HOSxP ไม่พร้อมใช้งาน
        }

        // 5. เริ่มสร้างไฟล์ Excel ด้วย PhpSpreadsheet
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('บันทึกสต็อกคงเหลือ');

        // ข้อมูลหัวเอกสาร
        $sheet->setCellValue('A1', 'โรงพยาบาลค่ายสุรสิงหนาท — แบบฟอร์มนำเข้ายอดสต็อกคงเหลือ (Inventory Balance Import)');
        $scopeText = match ($itemScope) {
            'drug' => 'เฉพาะยา (Drugs Only)',
            'nondrug' => 'เฉพาะค่าเวชภัณฑ์ที่มิใช่ยา (Non-Drug Medical Supplies)',
            default => 'รายการยาและเวชภัณฑ์ทั้งหมด (All Items)',
        };
        $sheet->setCellValue('A2', "สถานที่จัดเก็บ: {$location->name} ({$location->code}) | ขอบเขตข้อมูล: {$scopeText} | วันที่ออกเอกสาร: " . date('d/m/Y H:i'));

        // สไตล์ Header เอกสาร
        $sheet->mergeCells('A1:M1');
        $sheet->mergeCells('A2:M2');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FFFFFFFF'));
        $sheet->getStyle('A2')->getFont()->setSize(10)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FFCBD5E1'));
        $sheet->getStyle('A1:M2')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF0F172A'); // Slate-900
        $sheet->getStyle('A1:M2')->getAlignment()->setVertical(Alignment::VERTICAL_CENTER)->setIndent(1);
        $sheet->getRowDimension(1)->setRowHeight(32);
        $sheet->getRowDimension(2)->setRowHeight(22);
        $sheet->getRowDimension(3)->setRowHeight(10); // Spacing row

        // หัวตารางคอลัมน์ (แถวที่ 4)
        foreach (self::COLUMNS as $meta) {
            $cell = $meta['col'] . '4';
            $sheet->setCellValue($cell, $meta['title']);
            $sheet->getColumnDimension($meta['col'])->setWidth($meta['width']);
        }

        // จัดสไตล์หัวตารางแถวที่ 4
        $sheet->getRowDimension(4)->setRowHeight(28);

        // A4:G4 ข้อมูลจากระบบ (สีฟ้าอมเทา)
        $sheet->getStyle('A4:G4')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFE2E8F0');
        $sheet->getStyle('A4:G4')->getFont()->setBold(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF1E293B'));

        // H4 คอลัมน์สำคัญที่ผู้ใช้ต้องกรอก (สีส้ม Amber เด่นชัด)
        $sheet->getStyle('H4')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFF59E0B');
        $sheet->getStyle('H4')->getFont()->setBold(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FFFFFFFF'));

        // I4:J4 ข้อมูล Lot / วันหมดอายุ (สีส้มอ่อน)
        $sheet->getStyle('I4:J4')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFFEF3C7');
        $sheet->getStyle('I4:J4')->getFont()->setBold(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF78350F'));

        // K4:M4 ข้อมูลราคาและขั้นต่ำที่ต้องสั่งซื้อ
        $sheet->getStyle('K4:M4')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFF1F5F9');
        $sheet->getStyle('K4:M4')->getFont()->setBold(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF334155'));

        $sheet->getStyle('A4:M4')->getAlignment()->setVertical(Alignment::VERTICAL_CENTER)->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // ใส่ข้อมูลแถว
        $rowNum = 5;
        foreach ($items as $item) {
            $icode = trim($item->icode);
            $balance = $balances->get($item->id);
            $price = $hosxpPrices[$icode] ?? ($item->meta['price'] ?? ($item->meta['unitcost'] ?? 0));
            $reorder = $balance?->reorder_level ? (float) $balance->reorder_level : null;

            // A: icode (บังคับ format เป็น text เพื่อไม่ให้ศูนย์นำหน้าหาย)
            $sheet->setCellValueExplicit('A' . $rowNum, $icode, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            // B: name
            $sheet->setCellValue('B' . $rowNum, $item->name);
            // C: item_type
            $sheet->setCellValue('C' . $rowNum, $item->itemTypeLabel());
            // D: strength
            $sheet->setCellValue('D' . $rowNum, $item->strength ?: '-');
            // E: unit
            $sheet->setCellValue('E' . $rowNum, $item->baseUnitName());
            // F: location_code
            $sheet->setCellValueExplicit('F' . $rowNum, $location->code, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            // G: location_name
            $sheet->setCellValue('G' . $rowNum, $location->name);
            // H: counted_qty (เว้นว่างไว้ให้ผู้ใช้กรอก)
            // I: lot_no (เว้นว่างไว้ให้ผู้ใช้กรอก)
            // J: expires_at (เว้นว่างไว้ให้ผู้ใช้กรอก)
            // K: unit_price (ดึงจาก HOSxP หรือ meta)
            if ($price > 0) {
                $sheet->setCellValue('K' . $rowNum, $price);
            }
            // L: reorder_level
            if ($reorder !== null && $reorder > 0) {
                $sheet->setCellValue('L' . $rowNum, $reorder);
            }
            // M: notes (เว้นว่าง)

            // ไฮไลต์เซลล์ H สำหรับกรอกตัวเลข
            $sheet->getStyle('H' . $rowNum)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFFFFBEB');

            $rowNum++;
        }

        $lastDataRow = max(5, $rowNum - 1);

        // จัด Format ตัวเลขและข้อความ
        $sheet->getStyle("A5:A{$lastDataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("C5:E{$lastDataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("F5:F{$lastDataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("H5:H{$lastDataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet->getStyle("H5:H{$lastDataRow}")->getNumberFormat()->setFormatCode('#,##0.00');
        $sheet->getStyle("I5:J{$lastDataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("K5:L{$lastDataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet->getStyle("K5:K{$lastDataRow}")->getNumberFormat()->setFormatCode('#,##0.00');
        $sheet->getStyle("L5:L{$lastDataRow}")->getNumberFormat()->setFormatCode('#,##0');

        // เพิ่มเส้นขอบบาง
        $sheet->getStyle("A4:M{$lastDataRow}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FFE2E8F0'));

        // แช่แข็งแถวหัวตาราง (Freeze Panes แถวที่ 5 ลงไป)
        $sheet->freezePane('A5');

        // 6. ชีตที่ 2: คำแนะนำการใช้งาน
        $guideSheet = new Worksheet($spreadsheet, 'คำแนะนำการใช้งาน');
        $spreadsheet->addSheet($guideSheet, 1);

        $instructions = [
            ['โรงพยาบาลค่ายสุรสิงหนาท — คู่มือการนำเข้าข้อมูลยอดสต็อกยาและเวชภัณฑ์ด้วย Excel'],
            [''],
            ['หัวข้อ', 'คำอธิบายอย่างละเอียด'],
            ['1. ช่องที่ระบบดึงข้อมูลให้ (A - G)', 'รหัสยา (icode), ชื่อยา, ประเภท, ขนาดความแรง, หน่วยนับ, รหัสคลัง และชื่อคลัง ดึงจากระบบ/HOSxP โดยอัตโนมัติ — "ไม่ต้องแก้ไข"'],
            ['2. ช่องจำนวนคงเหลือจริง (คอลัมน์ H) *', 'กรอกจำนวนคงเหลือจริงที่ตรวจนับได้ (ตัวเลข >= 0) ตัวอย่างเช่น 100 หรือ 50.5'],
            ['', 'ข้อสำคัญ: แถวใดที่ไม่ได้ตรวจนับ หรือไม่มีรายการสต็อกคงเหลือ ให้ "ปล่อยว่างไว้" ระบบจะข้ามแถวนั้นโดยอัตโนมัติ ไม่นำเข้าเป็นศูนย์'],
            ['3. ช่องหมายเลข Lot (คอลัมน์ I)', 'ระบุหมายเลข Lot เช่น "LOT6801" หรือสามารถเว้นว่างได้ (ระบบจะไม่สร้างเลขสุ่มให้ เพื่อให้ท่านสแกนเข้าหรือระบุในภายหลัง)'],
            ['4. ช่องวันหมดอายุ (คอลัมน์ J)', 'ระบุวันหมดอายุในรูปแบบ ค.ศ. YYYY-MM-DD เช่น "2027-12-31" หรือเว้นว่างได้หากไม่ทราบ'],
            ['5. ช่องราคาต่อหน่วย (คอลัมน์ K)', 'ราคาต่อหน่วย (บาท) ระบบดึงจากฐานข้อมูล HOSxP ให้อัตโนมัติ สามารถแก้ไขตามมูลค่าจริงได้'],
            ['6. ช่องขั้นต่ำที่ต้องสั่งซื้อ (คอลัมน์ L)', 'กำหนดจำนวนคงเหลือขั้นต่ำที่ต้องเริ่มสั่งซื้อ (Reorder Level) สามารถแก้ไขหรือเว้นว่างได้'],
            ['7. ช่องหมายเหตุ (คอลัมน์ M)', 'บันทึกเพิ่มเติมสำหรับรายการแถวนั้น (เว้นว่างได้)'],
            [''],
            ['โหมดการนำเข้า (Import Modes)', ''],
            ['• โหมดแทนที่ยอดคงเหลือ (Replace)', 'ระบบจะปรับยอดคงเหลือในคลัง (qty_on_hand) ให้ตรงกับจำนวนที่ตรวจนับได้ในไฟล์ Excel เหมาะสำหรับ "การตรวจนับสต็อกประจำปี/ยกยอดเริ่มระบบ"'],
            ['• โหมดบวกเพิ่มสต็อก (Add to Stock)', 'ระบบจะนำจำนวนในไฟล์ Excel ไป "บวกเพิ่ม" จากยอดคงเหลือเดิมในคลัง เหมาะสำหรับการรับยาล็อตพิเศษที่ยังไม่ได้บันทึก'],
            [''],
            ['รหัส QR Code ประจำ Lot', 'ทุก Lot ที่นำเข้าสำเร็จ ระบบจะสร้าง QR Token (ULID) ให้อัตโนมัติ สามารถพิมพ์สติกเกอร์ฉลากยา หรือสแกนผ่านโทรศัพท์/เครื่องยิงบาร์โค้ดได้ทันที'],
        ];

        foreach ($instructions as $idx => $line) {
            $r = $idx + 1;
            $guideSheet->setCellValue('A' . $r, $line[0] ?? '');
            $guideSheet->setCellValue('B' . $r, $line[1] ?? '');
        }

        $guideSheet->getStyle('A1')->getFont()->setBold(true)->setSize(13)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF1E293B'));
        $guideSheet->getStyle('A3:B3')->getFont()->setBold(true);
        $guideSheet->getStyle('A3:B3')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFE2E8F0');
        $guideSheet->getColumnDimension('A')->setWidth(35);
        $guideSheet->getColumnDimension('B')->setWidth(85);

        // กลับไปหน้าแรก
        $spreadsheet->setActiveSheetIndex(0);

        $filename = "stock-import-template-{$location->code}-{$itemScope}-" . date('Ymd_His') . ".xlsx";

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
            $writer->save('php://output');
            $spreadsheet->disconnectWorksheets();
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * อ่านไฟล์ Excel ที่ผู้ใช้อัปโหลด ตรวจสอบความถูกต้อง และส่งกลับข้อมูล Preview
     *
     * @return array{token: string, stats: array<string, mixed>, preview_items: list<array<string, mixed>>, errors: list<array<string, mixed>>}
     */
    public function previewImport(UploadedFile $file, ?int $fallbackLocationId = null): array
    {
        $spreadsheet = IOFactory::load($file->getRealPath());
        $sheet = $spreadsheet->getActiveSheet();
        $rawRows = $sheet->toArray(null, true, false, false);

        if (empty($rawRows)) {
            throw new \InvalidArgumentException('ไฟล์ Excel ที่อัปโหลดไม่มีข้อมูล');
        }

        // ค้นหาแถวหัวตาราง (หาแถวที่มีคำว่า icode หรือ รหัส)
        $headerRowIndex = null;
        $headerColMap = [];

        foreach ($rawRows as $idx => $row) {
            foreach ($row as $colIdx => $val) {
                $cellStr = mb_strtolower(trim((string) $val));
                if (str_contains($cellStr, 'icode') || str_contains($cellStr, 'รหัสรายการ') || str_contains($cellStr, 'รหัสยา')) {
                    $headerRowIndex = $idx;
                    break 2;
                }
            }
        }

        if ($headerRowIndex === null) {
            throw new \InvalidArgumentException('ไม่พบคอลัมน์ "icode" หรือ "รหัสรายการ" ในไฟล์ Excel กรุณาใช้ไฟล์ Template ของระบบ');
        }

        // จับคู่คอลัมน์
        $headerRow = $rawRows[$headerRowIndex];
        foreach ($headerRow as $cIdx => $val) {
            $headerText = mb_strtolower(trim((string) $val));
            $headerText = preg_replace('/\s+/', '', $headerText) ?? $headerText;

            if (str_contains($headerText, 'location_code') || str_contains($headerText, 'รหัสคลัง')) {
                $headerColMap['location_code'] = $cIdx;
            } elseif (str_contains($headerText, 'location_name') || str_contains($headerText, 'ชื่อคลัง') || str_contains($headerText, 'ชื่อสถานที่') || str_contains($headerText, 'สถานที่จัดเก็บ')) {
                $headerColMap['location_name'] = $cIdx;
            } elseif ((str_contains($headerText, 'icode') || str_contains($headerText, 'รหัสรายการ') || str_contains($headerText, 'รหัสยา') || $headerText === 'รหัส') && ! str_contains($headerText, 'คลัง')) {
                $headerColMap['icode'] = $cIdx;
            } elseif ((str_contains($headerText, 'ชื่อยา') || str_contains($headerText, 'ชื่อรายการ') || str_contains($headerText, 'item_name') || str_contains($headerText, 'ชื่อ')) && ! str_contains($headerText, 'คลัง') && ! str_contains($headerText, 'สถานที่')) {
                $headerColMap['name'] = $cIdx;
            } elseif (str_contains($headerText, 'จำนวน') || str_contains($headerText, 'counted_qty') || str_contains($headerText, 'คงเหลือจริง') || str_contains($headerText, 'qty')) {
                $headerColMap['counted_qty'] = $cIdx;
            } elseif (str_contains($headerText, 'lot') || str_contains($headerText, 'ล็อต')) {
                $headerColMap['lot_no'] = $cIdx;
            } elseif (str_contains($headerText, 'หมดอายุ') || str_contains($headerText, 'expires_at') || str_contains($headerText, 'exp')) {
                $headerColMap['expires_at'] = $cIdx;
            } elseif (str_contains($headerText, 'ราคา') || str_contains($headerText, 'price') || str_contains($headerText, 'unit_price')) {
                $headerColMap['unit_price'] = $cIdx;
            } elseif (str_contains($headerText, 'ขั้นต่ำ') || str_contains($headerText, 'จุดสั่งซื้อ') || str_contains($headerText, 'reorder')) {
                $headerColMap['reorder_level'] = $cIdx;
            } elseif (str_contains($headerText, 'หมายเหตุ') || str_contains($headerText, 'notes') || str_contains($headerText, 'note')) {
                $headerColMap['notes'] = $cIdx;
            }
        }

        if (! isset($headerColMap['icode']) || ! isset($headerColMap['counted_qty'])) {
            throw new \InvalidArgumentException('ไฟล์ไม่มีคอลัมน์ รหัสรายการ (icode) หรือ จำนวนคงเหลือ (counted_qty)');
        }

        // แคช Item และ Location เพื่อประสิทธิภาพในการตรวจสอบ
        $itemsByIcode = PharmacyItem::all()->keyBy(fn ($i) => trim((string) $i->icode));
        $locationsByCode = PharmacyLocation::all()->keyBy(fn ($l) => strtolower(trim((string) $l->code)));
        $locationsById = PharmacyLocation::all()->keyBy('id');

        $defaultLocation = $fallbackLocationId ? $locationsById->get($fallbackLocationId) : null;
        if (! $defaultLocation) {
            $defaultLocation = PharmacyLocation::query()->where('is_active', true)->orderBy('sort_order')->first()
                ?? PharmacyLocation::query()->first();
        }

        $validRows = [];
        $skippedRows = [];
        $errorRows = [];
        $totalQty = 0;
        $totalValue = 0;

        $dataRows = array_slice($rawRows, $headerRowIndex + 1);

        foreach ($dataRows as $offset => $row) {
            $rowNum = $headerRowIndex + $offset + 2; // บรรทัดที่แท้จริงใน Excel (1-based)

            // ข้ามแถวว่าง
            $allEmpty = true;
            foreach ($row as $cell) {
                if (trim((string) $cell) !== '') {
                    $allEmpty = false;
                    break;
                }
            }
            if ($allEmpty) {
                continue;
            }

            $icode = trim((string) ($row[$headerColMap['icode']] ?? ''));
            $name = trim((string) ($row[$headerColMap['name'] ?? -1] ?? ''));
            $qtyRaw = $row[$headerColMap['counted_qty']] ?? null;

            if ($icode === '') {
                continue;
            }

            // ถ้าเว้นว่างจำนวนคงเหลือ = ข้าม ไม่นำเข้า
            if ($qtyRaw === null || trim((string) $qtyRaw) === '') {
                $skippedRows[] = [
                    'row' => $rowNum,
                    'icode' => $icode,
                    'name' => $name,
                    'reason' => 'เว้นว่างจำนวนคงเหลือ (ไม่ได้ตรวจนับ)',
                ];
                continue;
            }

            // ตรวจสอบความถูกต้องของจำนวน
            $cleanQtyStr = str_replace(',', '', trim((string) $qtyRaw));
            if (! is_numeric($cleanQtyStr) || (float) $cleanQtyStr < 0) {
                $errorRows[] = [
                    'row' => $rowNum,
                    'icode' => $icode,
                    'name' => $name,
                    'message' => "จำนวนคงเหลือ \"{$qtyRaw}\" ไม่ถูกต้อง (ต้องเป็นตัวเลข >= 0)",
                ];
                continue;
            }
            $countedQty = (float) $cleanQtyStr;

            // ค้นหารายการยา
            $item = $itemsByIcode->get($icode);
            if (! $item) {
                // ลอง resolve จาก HOSxP เผื่อเป็นรายการใหม่
                try {
                    $item = $this->inventoryService->resolveItemFromHosxp($icode);
                    $itemsByIcode->put($icode, $item);
                } catch (\Throwable $e) {
                    $errorRows[] = [
                        'row' => $rowNum,
                        'icode' => $icode,
                        'name' => $name,
                        'message' => "ไม่พบรหัสรายการ {$icode} ในฐานข้อมูลยาหรือ HOSxP",
                    ];
                    continue;
                }
            }

            // ค้นหาสถานที่จัดเก็บ
            $locCodeRaw = strtolower(trim((string) ($row[$headerColMap['location_code'] ?? -1] ?? '')));
            $location = $locationsByCode->get($locCodeRaw) ?? $defaultLocation;
            if (! $location) {
                $errorRows[] = [
                    'row' => $rowNum,
                    'icode' => $icode,
                    'name' => $item->name,
                    'message' => 'ไม่พบสถานที่จัดเก็บ กรุณาระบุรหัสคลังที่ถูกต้อง',
                ];
                continue;
            }

            // ตรวจสอบวันหมดอายุ (expires_at)
            $expiryRaw = $row[$headerColMap['expires_at'] ?? -1] ?? null;
            $expiresAt = $this->parseExcelDate($expiryRaw);

            // ตรวจสอบหมายเลข Lot
            $lotNo = trim((string) ($row[$headerColMap['lot_no'] ?? -1] ?? ''));

            // ตรวจสอบราคาต่อหน่วย
            $priceRaw = $row[$headerColMap['unit_price'] ?? -1] ?? null;
            $unitPrice = null;
            if ($priceRaw !== null && trim((string) $priceRaw) !== '') {
                $cleanPrice = str_replace(',', '', trim((string) $priceRaw));
                if (is_numeric($cleanPrice) && (float) $cleanPrice >= 0) {
                    $unitPrice = (float) $cleanPrice;
                }
            }

            // ขั้นต่ำที่ต้องสั่งซื้อ
            $reorderRaw = $row[$headerColMap['reorder_level'] ?? -1] ?? null;
            $reorderLevel = null;
            if ($reorderRaw !== null && trim((string) $reorderRaw) !== '') {
                $cleanReorder = str_replace(',', '', trim((string) $reorderRaw));
                if (is_numeric($cleanReorder) && (float) $cleanReorder >= 0) {
                    $reorderLevel = (float) $cleanReorder;
                }
            }

            $notes = trim((string) ($row[$headerColMap['notes'] ?? -1] ?? ''));

            $lineVal = $unitPrice !== null ? ($countedQty * $unitPrice) : 0;
            $totalQty += $countedQty;
            $totalValue += $lineVal;

            $validRows[] = [
                'row' => $rowNum,
                'item_id' => $item->id,
                'icode' => $item->icode,
                'item_name' => $item->name,
                'item_type' => $item->item_type,
                'item_type_label' => $item->itemTypeLabel(),
                'strength' => $item->strength,
                'unit' => $item->baseUnitName(),
                'location_id' => $location->id,
                'location_code' => $location->code,
                'location_name' => $location->name,
                'counted_qty' => $countedQty,
                'lot_no' => $lotNo ?: null,
                'expires_at' => $expiresAt,
                'unit_price' => $unitPrice,
                'reorder_level' => $reorderLevel,
                'notes' => $notes ?: null,
                'line_value' => $lineVal,
            ];
        }

        // บันทึกไฟล์พักไว้ชั่วคราวใน Storage เพื่อรอผู้ใช้กดยืนยัน (Commit)
        $token = (string) Str::uuid();
        $tempDir = storage_path('app/temp_stock_imports');
        if (! File::isDirectory($tempDir)) {
            File::makeDirectory($tempDir, 0755, true);
        }

        $summary = [
            'token' => $token,
            'filename' => $file->getClientOriginalName(),
            'created_at' => now()->toIso8601String(),
            'stats' => [
                'total_rows' => count($validRows) + count($skippedRows) + count($errorRows),
                'valid_count' => count($validRows),
                'skipped_count' => count($skippedRows),
                'error_count' => count($errorRows),
                'total_qty' => $totalQty,
                'total_value' => $totalValue,
            ],
            'valid_rows' => $validRows,
            'skipped_rows' => $skippedRows,
            'errors' => $errorRows,
        ];

        File::put($tempDir . '/' . $token . '.json', json_encode($summary, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

        return [
            'token' => $token,
            'filename' => $file->getClientOriginalName(),
            'stats' => $summary['stats'],
            'preview_items' => array_slice($validRows, 0, 50),
            'errors' => array_slice($errorRows, 0, 30),
            'skipped' => array_slice($skippedRows, 0, 20),
        ];
    }

    /**
     * บันทึกนำเข้าข้อมูลสต็อกจริงลงฐานข้อมูลตามผล Preview
     *
     * @param  string  $tempToken  Token ที่ได้จากขั้นตอน previewImport
     * @param  string  $mode  'replace' (ปรับยอดคงเหลือให้เท่ากับที่นับได้) หรือ 'add' (บวกเพิ่มจากสต็อกเดิม)
     * @param  int|null  $userId  ID ผู้ใช้งานที่ทำรายการ
     * @return array{success: bool, imported_count: int, mode: string, total_qty: float, total_lots: int}
     */
    public function commitImport(string $tempToken, string $mode = 'replace', ?int $userId = null): array
    {
        $filePath = storage_path("app/temp_stock_imports/{$tempToken}.json");
        if (! File::exists($filePath)) {
            throw new \RuntimeException('ข้อมูลการนำเข้าหมดอายุหรือไม่พบข้อมูล กรุณาอัปโหลดไฟล์ใหม่อีกครั้ง');
        }

        $content = json_decode(File::get($filePath), true);
        if (! is_array($content) || empty($content['valid_rows'])) {
            throw new \RuntimeException('ไม่พบรายการที่พร้อมนำเข้าในชุดข้อมูลนี้');
        }

        $validRows = $content['valid_rows'];
        $importedCount = 0;
        $totalQty = 0;
        $createdLotsCount = 0;

        DB::transaction(function () use ($validRows, $mode, $userId, $tempToken, &$importedCount, &$totalQty, &$createdLotsCount) {
            $todayStr = now()->toDateString();
            $batchTimeStr = now()->format('Ymd');

            foreach ($validRows as $idx => $row) {
                $itemId = (int) $row['item_id'];
                $locationId = (int) $row['location_id'];
                $countedQty = (float) $row['counted_qty'];
                $unitPrice = isset($row['unit_price']) && $row['unit_price'] !== null ? (float) $row['unit_price'] : null;
                $reorderLevel = isset($row['reorder_level']) && $row['reorder_level'] !== null ? (float) $row['reorder_level'] : null;
                $expiresAt = ! empty($row['expires_at']) ? Carbon::parse($row['expires_at'])->toDateString() : null;
                $notes = ! empty($row['notes']) ? (string) $row['notes'] : null;

                // กำหนดหมายเลข Lot (ถ้าเว้นว่างไว้ ไม่ต้องสุ่มเลข ให้เป็น null เพื่อให้ผู้ใช้สแกนเข้าหรือระบุภายหลัง)
                $lotNo = ! empty($row['lot_no'])
                    ? trim((string) $row['lot_no'])
                    : null;

                // 1. จัดการ PharmacyStockBalance
                $balance = PharmacyStockBalance::query()->firstOrCreate(
                    ['location_id' => $locationId, 'item_id' => $itemId],
                    ['qty_on_hand' => 0, 'qty_reserved' => 0, 'reorder_level' => 0, 'min_level' => 0]
                );

                $oldQty = (float) $balance->qty_on_hand;
                if ($mode === 'replace') {
                    $newQty = $countedQty;
                } else {
                    $newQty = $oldQty + $countedQty;
                }

                $balance->qty_on_hand = $newQty;
                if ($reorderLevel !== null) {
                    $balance->reorder_level = $reorderLevel;
                }
                $balance->save();

                // 2. สร้าง PharmacyLot พร้อมรหัส QR Code (ULID)
                $lot = PharmacyLot::query()->create([
                    'item_id' => $itemId,
                    'location_id' => $locationId,
                    'lot_no' => $lotNo,
                    'received_at' => $todayStr,
                    'expires_at' => $expiresAt,
                    'qty_received' => $countedQty,
                    'qty_remaining' => $countedQty,
                    'invoice_unit_price' => $unitPrice,
                    'invoice_total_price' => $unitPrice !== null ? ($countedQty * $unitPrice) : null,
                    'qr_token' => Str::lower((string) Str::ulid()),
                    'status' => 'active',
                    'received_by' => $userId,
                    'notes' => 'นำเข้ายอดยกมาผ่าน Excel' . ($notes ? " ({$notes})" : ''),
                ]);
                $createdLotsCount++;

                // 3. บันทึก PharmacyStockMovement
                PharmacyStockMovement::query()->create([
                    'type' => $mode === 'replace' ? 'adjust' : 'receive',
                    'item_id' => $itemId,
                    'lot_id' => $lot->id,
                    'to_location_id' => $locationId,
                    'qty' => $countedQty,
                    'balance_after' => $newQty,
                    'reference_type' => 'excel_import',
                    'reference_id' => $tempToken,
                    'user_id' => $userId,
                    'note' => 'นำเข้าสต็อกผ่าน Excel (โหมด: ' . ($mode === 'replace' ? 'ปรับยอดตรงตามที่ตรวจนับ' : 'บวกเพิ่มจากสต็อกเดิม') . ')' . ($notes ? " [{$notes}]" : ''),
                ]);

                $importedCount++;
                $totalQty += $countedQty;
            }
        });

        // ลบไฟล์ชั่วคราว
        try {
            File::delete($filePath);
        } catch (\Throwable $e) {
            // ละเว้น
        }

        return [
            'success' => true,
            'imported_count' => $importedCount,
            'mode' => $mode,
            'total_qty' => $totalQty,
            'total_lots' => $createdLotsCount,
        ];
    }

    /**
     * แปลงรูปแบบวันที่จาก Excel เป็น YYYY-MM-DD
     */
    private function parseExcelDate(mixed $raw): ?string
    {
        if ($raw === null || trim((string) $raw) === '') {
            return null;
        }

        // กรณีเป็นตัวเลขวันที่ของ Excel (Excel Serial Number)
        if (is_numeric($raw)) {
            try {
                $dt = ExcelDate::excelToDateTimeObject((float) $raw);

                return $dt->format('Y-m-d');
            } catch (\Throwable $e) {
                // ไปต่อรูปแบบสตริง
            }
        }

        $str = trim((string) $raw);

        // รองรับรูปแบบ DD/MM/YYYY หรือ DD-MM-YYYY
        if (preg_match('/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/', $str, $matches)) {
            $day = str_pad($matches[1], 2, '0', STR_PAD_LEFT);
            $month = str_pad($matches[2], 2, '0', STR_PAD_LEFT);
            $year = (int) $matches[3];
            // แปลงปี พ.ศ. เป็น ค.ศ. (ถ้าปี > 2400)
            if ($year > 2400) {
                $year -= 543;
            }

            return "{$year}-{$month}-{$day}";
        }

        // รองรับรูปแบบ YYYY-MM-DD หรือ YYYY/MM/DD
        if (preg_match('/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/', $str, $matches)) {
            $year = (int) $matches[1];
            if ($year > 2400) {
                $year -= 543;
            }
            $month = str_pad($matches[2], 2, '0', STR_PAD_LEFT);
            $day = str_pad($matches[3], 2, '0', STR_PAD_LEFT);

            return "{$year}-{$month}-{$day}";
        }

        // พยายาม parse ด้วย Carbon
        try {
            return Carbon::parse($str)->toDateString();
        } catch (\Throwable $e) {
            return null;
        }
    }
}
