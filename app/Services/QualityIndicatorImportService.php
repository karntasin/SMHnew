<?php

namespace App\Services;

use App\Models\Department;
use App\Models\QualityIndicator;
use App\Models\QualityIndicatorEntry;
use App\Models\QualityIndicatorImportLog;
use App\Models\TeamHa;
use Box\Spout\Common\Entity\Style\CellAlignment;
use Box\Spout\Common\Entity\Style\Color;
use Box\Spout\Reader\Common\Creator\ReaderEntityFactory;
use Box\Spout\Writer\Common\Creator\Style\StyleBuilder;
use Box\Spout\Writer\Common\Creator\WriterEntityFactory;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class QualityIndicatorImportService
{
    public const INDICATOR_HEADERS = [
        'code',
        'name',
        'category',
        'unit',
        'target_value',
        'target_operator',
        'frequency',
        'description',
        'formula_description',
        'is_active',
        'link_code',
    ];

    public const ENTRY_HEADERS = [
        'code',
        'period_date',
        'numerator',
        'denominator',
        'result_value',
        'notes',
    ];

    public function downloadTemplatePath(): string
    {
        $dir = storage_path('app/qi-templates');
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $path = $dir.DIRECTORY_SEPARATOR.'quality-indicators-import-template.xlsx';
        $this->writeTemplate($path);

        return $path;
    }

    public function writeTemplate(string $path): void
    {
        $writer = WriterEntityFactory::createXLSXWriter();
        $writer->openToFile($path);

        $titleStyle = (new StyleBuilder())
            ->setFontBold()
            ->setFontSize(16)
            ->setFontColor(Color::WHITE)
            ->setBackgroundColor(Color::rgb(6, 95, 70))
            ->build();

        $sectionStyle = (new StyleBuilder())
            ->setFontBold()
            ->setFontSize(12)
            ->setFontColor(Color::rgb(6, 95, 70))
            ->setBackgroundColor(Color::rgb(209, 250, 229))
            ->build();

        $labelStyle = (new StyleBuilder())
            ->setFontBold()
            ->setFontSize(11)
            ->setFontColor(Color::rgb(15, 23, 42))
            ->build();

        $requiredStyle = (new StyleBuilder())
            ->setFontBold()
            ->setFontColor(Color::rgb(185, 28, 28))
            ->build();

        $optionalStyle = (new StyleBuilder())
            ->setFontBold()
            ->setFontColor(Color::rgb(21, 128, 61))
            ->build();

        $mutedStyle = (new StyleBuilder())
            ->setFontSize(10)
            ->setFontColor(Color::rgb(71, 85, 105))
            ->build();

        $headerStyle = (new StyleBuilder())
            ->setFontBold()
            ->setFontSize(11)
            ->setFontColor(Color::WHITE)
            ->setBackgroundColor(Color::rgb(5, 150, 105))
            ->setCellAlignment(CellAlignment::CENTER)
            ->build();

        $descStyle = (new StyleBuilder())
            ->setFontSize(10)
            ->setFontItalic()
            ->setFontColor(Color::rgb(71, 85, 105))
            ->setBackgroundColor(Color::rgb(240, 253, 244))
            ->setShouldWrapText()
            ->build();

        $exampleStyle = (new StyleBuilder())
            ->setFontSize(10)
            ->setBackgroundColor(Color::rgb(254, 252, 232))
            ->build();

        // ── readme ──────────────────────────────────────────────
        $writer->getCurrentSheet()->setName('readme');

        $add = function (array $values, $style = null) use ($writer) {
            if ($style) {
                $writer->addRow(WriterEntityFactory::createRowFromArray($values, $style));
            } else {
                $writer->addRow(WriterEntityFactory::createRowFromArray($values));
            }
        };

        $add(['โรงพยาบาลค่ายสุรสิงหนาท — คู่มือเทมเพลตนำเข้าตัวชี้วัดคุณภาพ'], $titleStyle);
        $add(['ศูนย์พัฒนาคุณภาพ · ใช้กับหน้า /quality-indicators/import'], $mutedStyle);
        $add(['']);

        $add(['ขั้นตอนการใช้งาน'], $sectionStyle);
        $add(['1', 'ดาวน์โหลดเทมเพลตนี้จากระบบ']);
        $add(['2', 'เลือกปลายทางในระบบก่อนอัปโหลด: องค์กร / แผนก / ทีม HA (เลือกแผนกหรือทีมให้ตรง)']);
        $add(['3', 'กรอกชีต indicators และ/หรือ entries — อย่าเปลี่ยนชื่อชีตและชื่อหัวคอลัมน์แถวที่ 1']);
        $add(['4', 'แถวที่ 2 = คำอธิบาย (ระบบข้ามอัตโนมัติ) · แถวที่ 3 เป็นต้นไป = ข้อมูลจริง']);
        $add(['5', 'อัปโหลด → ตรวจตัวอย่าง → พิมพ์คำว่า "ยืนยัน" → ระบบเก็บ Log']);
        $add(['']);

        $add(['สัญลักษณ์ความจำเป็นของช่อง'], $sectionStyle);
        $writer->addRow(WriterEntityFactory::createRow([
            WriterEntityFactory::createCell('ต้องระบุ', $requiredStyle),
            WriterEntityFactory::createCell('จำเป็นต้องกรอก — ถ้าว่างระบบจะปฏิเสธแถวนั้น', $mutedStyle),
        ]));
        $writer->addRow(WriterEntityFactory::createRow([
            WriterEntityFactory::createCell('ไม่บังคับ', $optionalStyle),
            WriterEntityFactory::createCell('เว้นว่างได้ — ระบบจะใส่ค่าเริ่มต้นหรือข้ามตามที่ระบุ', $mutedStyle),
        ]));
        $add(['']);

        $add(['ชีต indicators — อธิบายทีละช่อง'], $sectionStyle);
        $add(['ชื่อช่อง (แถว 1)', 'ความจำเป็น', 'คำอธิบาย / ค่าที่ระบบรองรับ'], $headerStyle);
        foreach ([
            ['code', 'ต้องระบุ', 'รหัสตัวชี้วัด ไม่ซ้ำในระบบ ใช้จับคู่กับชีต entries เช่น QI-IC-001'],
            ['name', 'ต้องระบุ', 'ชื่อตัวชี้วัดภาษาไทยที่แสดงในระบบ'],
            ['category', 'ไม่บังคับ', 'หมวดหมู่/กลุ่ม เช่น Clinical, Administrative, HA-I-1 หรือข้อความอื่น'],
            ['unit', 'ไม่บังคับ', 'หน่วยนับ ว่างได้ (ค่าเริ่มต้น %) ตัวอย่าง: % , ครั้ง , คน , ราย , ต่อ 1000'],
            ['target_value', 'ไม่บังคับ', 'ค่าเป้าหมายตัวเลข ทศนิยมได้ เช่น 2.00 — ว่างได้ถ้ายังไม่กำหนดเป้า'],
            ['target_operator', 'ไม่บังคับ', 'เงื่อนไขเทียบเป้า ค่าว่างใช้ < · เลือกได้เฉพาะ: <   <=   >   >=   ='],
            ['frequency', 'ไม่บังคับ', 'ความถี่เก็บข้อมูล ค่าว่างใช้ Monthly · เลือกได้: Monthly (รายเดือน) | Quarterly (รายไตรมาส) | Yearly (รายปี)'],
            ['description', 'ไม่บังคับ', 'คำนิยาม/รายละเอียดตัวชี้วัด'],
            ['formula_description', 'ไม่บังคับ', 'สูตรการคำนวณแบบอ่านเข้าใจ เช่น (ตัวตั้ง/ตัวหาร) x 100'],
            ['is_active', 'ไม่บังคับ', 'สถานะใช้งาน ค่าว่าง=เปิดใช้ · 1/true/yes = Active · 0/false/no/inactive = ปิด'],
            ['link_code', 'ไม่บังคับ', 'รหัสตัวชี้วัดที่มีอยู่แล้วที่ต้องการใช้ข้อมูลชุดเดียวกัน (สร้างเป็นรหัสลูก)'],
        ] as $row) {
            $needStyle = $row[1] === 'ต้องระบุ' ? $requiredStyle : $optionalStyle;
            $writer->addRow(WriterEntityFactory::createRow([
                WriterEntityFactory::createCell($row[0], $labelStyle),
                WriterEntityFactory::createCell($row[1], $needStyle),
                WriterEntityFactory::createCell($row[2], $mutedStyle),
            ]));
        }
        $add(['']);

        $add(['ชีต entries — อธิบายทีละช่อง'], $sectionStyle);
        $add(['ชื่อช่อง (แถว 1)', 'ความจำเป็น', 'คำอธิบาย / ค่าที่ระบบรองรับ'], $headerStyle);
        foreach ([
            ['code', 'ต้องระบุ', 'รหัสตัวชี้วัด ต้องตรงกับ indicators ในไฟล์นี้ หรือที่มีอยู่แล้วในสังกัดที่เลือกนำเข้า'],
            ['period_date', 'ต้องระบุ', 'งวดข้อมูล รูปแบบ YYYY-MM-DD เช่น 2026-01-01 (แนะนำใช้วันที่ 1 ของเดือน) หรือวันที่จาก Excel'],
            ['numerator', 'ไม่บังคับ*', 'ตัวตั้ง (จำนวน) — *จำเป็นถ้าไม่กรอก result_value'],
            ['denominator', 'ไม่บังคับ*', 'ตัวหาร — *จำเป็นถ้าไม่กรอก result_value และต้องไม่เป็น 0'],
            ['result_value', 'ไม่บังคับ*', 'ผลลัพธ์ — *จำเป็นถ้าไม่กรอก numerator+denominator · ถ้าว่างระบบคำนวณให้อัตโนมัติตาม unit'],
            ['notes', 'ไม่บังคับ', 'หมายเหตุของงวดนั้น'],
        ] as $row) {
            $needStyle = str_starts_with($row[1], 'ต้องระบุ') ? $requiredStyle : $optionalStyle;
            $writer->addRow(WriterEntityFactory::createRow([
                WriterEntityFactory::createCell($row[0], $labelStyle),
                WriterEntityFactory::createCell($row[1], $needStyle),
                WriterEntityFactory::createCell($row[2], $mutedStyle),
            ]));
        }
        $add(['']);

        $add(['ค่าที่เลือกได้ในระบบ (อ้างอิง)'], $sectionStyle);
        $add(['หัวข้อ', 'ค่าที่ใช้กรอก', 'ความหมาย'], $headerStyle);
        foreach ([
            ['ปลายทางนำเข้า (เลือกในหน้าเว็บ)', 'organization', 'ระดับองค์กร'],
            ['ปลายทางนำเข้า (เลือกในหน้าเว็บ)', 'department', 'ระดับแผนก/ฝ่าย — ต้องเลือกแผนก'],
            ['ปลายทางนำเข้า (เลือกในหน้าเว็บ)', 'ha_team', 'ระดับทีม HA — ต้องเลือกทีม'],
            ['target_operator', '<', 'น้อยกว่า'],
            ['target_operator', '<=', 'น้อยกว่าหรือเท่ากับ'],
            ['target_operator', '>', 'มากกว่า'],
            ['target_operator', '>=', 'มากกว่าหรือเท่ากับ'],
            ['target_operator', '=', 'เท่ากับ'],
            ['frequency', 'Monthly', 'รายเดือน'],
            ['frequency', 'Quarterly', 'รายไตรมาส'],
            ['frequency', 'Yearly', 'รายปี'],
            ['is_active', '1', 'เปิดใช้งาน (Active)'],
            ['is_active', '0', 'ปิดใช้งาน (Inactive)'],
            ['การคำนวณ result_value', 'unit = %', '(numerator / denominator) x 100'],
            ['การคำนวณ result_value', 'unit มีคำว่า 1000', '(numerator / denominator) x 1000'],
            ['การคำนวณ result_value', 'หน่วยอื่น', 'numerator / denominator'],
        ] as $row) {
            $writer->addRow(WriterEntityFactory::createRow([
                WriterEntityFactory::createCell($row[0], $labelStyle),
                WriterEntityFactory::createCell($row[1]),
                WriterEntityFactory::createCell($row[2], $mutedStyle),
            ]));
        }
        $add(['']);

        $add(['กฎสำคัญ / ข้อควรระวัง'], $sectionStyle);
        $add(['•', 'ห้ามเปลี่ยนชื่อชีต: readme, indicators, entries และห้ามเปลี่ยนชื่อคอลัมน์แถวที่ 1']);
        $add(['•', 'แถวที่ 2 ของ indicators/entries เป็นคำอธิบาย — ห้ามลบแถวนี้ (ระบบข้ามให้อัตโนมัติ)']);
        $add(['•', 'เริ่มกรอกข้อมูลจริงตั้งแต่แถวที่ 3 — แทนที่แถวตัวอย่างได้เลย']);
        $add(['•', 'code เดียวกันแต่คนละแผนก/ทีมในระบบอยู่แล้ว จะถูกปฏิเสธ']);
        $add(['•', 'ถ้ามีข้อมูลงวด (period_date) เดิมของ code นั้นอยู่แล้ว ระบบจะอัปเดตแทนสร้างใหม่']);
        $add(['•', 'link_code ใช้สร้างรหัสลูกที่ชี้ข้อมูลชุดเดียวกับรหัสนั้น — แก้ที่ไหนมีผลทุกหัสที่เชื่อมกัน']);
        $add(['•', 'ตัวเลขแสดงผลในระบบเป็นทศนิยม 2 ตำแหน่ง']);
        $add(['']);
        $add(['โรงพยาบาลค่ายสุรสิงหนาท · ศูนย์พัฒนาคุณภาพ'], $mutedStyle);

        // ── indicators ──────────────────────────────────────────
        $writer->addNewSheetAndMakeItCurrent()->setName('indicators');
        $writer->addRow(WriterEntityFactory::createRowFromArray(self::INDICATOR_HEADERS, $headerStyle));
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            '[ต้องระบุ] รหัสไม่ซ้ำ เช่น QI-IC-001',
            '[ต้องระบุ] ชื่อตัวชี้วัด',
            '[ไม่บังคับ] หมวดหมู่ เช่น Clinical',
            '[ไม่บังคับ] หน่วย ค่าว่าง=% เช่น % / ครั้ง / คน / ต่อ 1000',
            '[ไม่บังคับ] ค่าเป้าตัวเลข เช่น 2.00',
            '[ไม่บังคับ] เงื่อนไข: < หรือ <= หรือ > หรือ >= หรือ = (ว่างใช้ <)',
            '[ไม่บังคับ] Monthly / Quarterly / Yearly (ว่างใช้ Monthly)',
            '[ไม่บังคับ] คำนิยาม/รายละเอียด',
            '[ไม่บังคับ] สูตรคำนวณ เช่น (ตัวตั้ง/ตัวหาร)x100',
            '[ไม่บังคับ] 1=เปิดใช้, 0=ปิด (ว่าง=เปิด)',
            '[ไม่บังคับ] รหัสแม่ที่ต้องการใช้ข้อมูลชุดเดียวกัน',
        ], $descStyle));
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'QI-DEMO-001',
            'อัตราการติดเชื้อในโรงพยาบาล',
            'Clinical',
            '%',
            '2.00',
            '<',
            'Monthly',
            'ตัวอย่าง — แทนที่หรือลบก่อนนำเข้าจริง',
            '(จำนวนผู้ป่วยติดเชื้อ / จำนวนผู้ป่วยทั้งหมด) x 100',
            '1',
            '',
        ], $exampleStyle));

        // ── entries ─────────────────────────────────────────────
        $writer->addNewSheetAndMakeItCurrent()->setName('entries');
        $writer->addRow(WriterEntityFactory::createRowFromArray(self::ENTRY_HEADERS, $headerStyle));
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            '[ต้องระบุ] รหัสเดียวกับ indicators',
            '[ต้องระบุ] งวด YYYY-MM-DD เช่น 2026-01-01',
            '[ไม่บังคับ*] ตัวตั้ง — จำเป็นถ้าไม่กรอก result_value',
            '[ไม่บังคับ*] ตัวหาร — จำเป็นถ้าไม่กรอก result_value',
            '[ไม่บังคับ*] ผลลัพธ์ — ว่างได้ถ้ามีตัวตั้ง+ตัวหาร (ระบบคำนวณให้)',
            '[ไม่บังคับ] หมายเหตุ',
        ], $descStyle));
        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'QI-DEMO-001',
            '2026-01-01',
            '2',
            '100',
            '2.00',
            'ตัวอย่างงวด ม.ค. — แทนที่หรือลบก่อนนำเข้าจริง',
        ], $exampleStyle));

        $writer->close();
    }

    /**
     * @return array{log: QualityIndicatorImportLog, preview: array}
     */
    public function preview(UploadedFile $file, string $type, ?int $departmentId, ?int $teamId): array
    {
        $this->assertOwnershipSelection($type, $departmentId, $teamId);

        $parsed = $this->parseWorkbook($file->getRealPath());
        $preview = $this->buildPreview($parsed, $type, $departmentId, $teamId);

        $log = QualityIndicatorImportLog::create([
            'user_id' => Auth::id(),
            'type' => $type,
            'department_id' => $type === 'department' ? $departmentId : null,
            'team_id' => $type === 'ha_team' ? $teamId : null,
            'original_filename' => $file->getClientOriginalName(),
            'status' => 'pending',
            'indicators_create' => $preview['counts']['indicators_create'],
            'indicators_update' => $preview['counts']['indicators_update'],
            'entries_create' => $preview['counts']['entries_create'],
            'entries_update' => $preview['counts']['entries_update'],
            'row_errors' => $preview['counts']['errors'],
            'summary' => [
                'owner_label' => $this->ownerLabel($type, $departmentId, $teamId),
                'indicator_rows' => count($parsed['indicators']),
                'entry_rows' => count($parsed['entries']),
                'blocking_errors' => $preview['counts']['errors'],
                'can_confirm' => $preview['can_confirm'],
            ],
            'payload' => [
                'indicators' => $preview['indicators'],
                'entries' => $preview['entries'],
                'errors' => $preview['errors'],
            ],
        ]);

        return [
            'log' => $log->fresh(['user:id,name', 'department:id,name', 'team:id,abbreviation,name_th']),
            'preview' => $preview,
        ];
    }

    public function confirm(QualityIndicatorImportLog $log): QualityIndicatorImportLog
    {
        if ($log->status !== 'pending') {
            throw ValidationException::withMessages([
                'import' => 'รายการนี้ไม่พร้อมยืนยัน (สถานะ: '.$log->status.')',
            ]);
        }

        if ((int) $log->user_id !== (int) Auth::id()) {
            abort(403);
        }

        $payload = $log->payload ?? [];
        $indicators = collect($payload['indicators'] ?? [])->where('action', '!=', 'error')->values();
        $entries = collect($payload['entries'] ?? [])->where('action', '!=', 'error')->values();
        $blocking = collect($payload['errors'] ?? [])->isNotEmpty()
            || collect($payload['indicators'] ?? [])->contains(fn ($r) => ($r['action'] ?? '') === 'error')
            || collect($payload['entries'] ?? [])->contains(fn ($r) => ($r['action'] ?? '') === 'error');

        if ($blocking) {
            throw ValidationException::withMessages([
                'import' => 'ยังมีแถวที่ผิดพลาด กรุณาแก้ไฟล์แล้วอัปโหลดใหม่',
            ]);
        }

        if ($indicators->isEmpty() && $entries->isEmpty()) {
            throw ValidationException::withMessages([
                'import' => 'ไม่มีข้อมูลที่สามารถนำเข้าได้',
            ]);
        }

        try {
            DB::transaction(function () use ($log, $indicators, $entries) {
                $codeMap = [];

                foreach ($indicators as $row) {
                    $data = $row['data'];
                    $attrs = [
                        'type' => $log->type,
                        'department_id' => $log->type === 'department' ? $log->department_id : null,
                        'team_id' => $log->type === 'ha_team' ? $log->team_id : null,
                        'code' => $data['code'],
                        'name' => $data['name'],
                        'category' => $data['category'],
                        'unit' => $data['unit'],
                        'target_value' => $data['target_value'],
                        'target_operator' => $data['target_operator'],
                        'frequency' => $data['frequency'],
                        'description' => $data['description'],
                        'formula_description' => $data['formula_description'],
                        'is_active' => $data['is_active'],
                    ];

                    $families = app(QualityIndicatorFamilyService::class);
                    unset($attrs['link_code']);

                    if (($row['action'] ?? '') === 'update' && ! empty($row['indicator_id'])) {
                        $indicator = QualityIndicator::query()->findOrFail($row['indicator_id']);
                        $this->assertSameOwner($indicator, $log->type, $log->department_id, $log->team_id);
                        $families->updateSharedAndLocal($indicator, $attrs);
                    } elseif (! empty($data['link_code'])) {
                        $source = QualityIndicator::query()
                            ->whereRaw('UPPER(code) = ?', [mb_strtoupper((string) $data['link_code'])])
                            ->firstOrFail();
                        $indicator = $families->createAlias($source, $attrs);
                    } else {
                        $indicator = $families->createStandalone($attrs);
                    }

                    $codeMap[mb_strtoupper((string) $data['code'])] = $indicator->id;
                }

                foreach ($entries as $row) {
                    $data = $row['data'];
                    $codeKey = mb_strtoupper((string) $data['code']);
                    $indicatorId = $codeMap[$codeKey]
                        ?? QualityIndicator::query()
                            ->where('type', $log->type)
                            ->when($log->type === 'department', fn ($q) => $q->where('department_id', $log->department_id))
                            ->when($log->type === 'ha_team', fn ($q) => $q->where('team_id', $log->team_id))
                            ->when($log->type === 'organization', fn ($q) => $q->whereNull('department_id')->whereNull('team_id'))
                            ->whereRaw('UPPER(code) = ?', [$codeKey])
                            ->value('id');

                    if (! $indicatorId) {
                        throw new \RuntimeException('ไม่พบตัวชี้วัดรหัส '.$data['code'].' ในสังกัดที่เลือก');
                    }

                    $entryIndicator = QualityIndicator::query()->findOrFail($indicatorId);
                    $indicatorId = app(QualityIndicatorFamilyService::class)->masterOf($entryIndicator)->id;

                    $payloadEntry = [
                        'numerator' => $data['numerator'],
                        'denominator' => $data['denominator'],
                        'result_value' => $data['result_value'],
                        'notes' => $data['notes'],
                        'created_by' => Auth::id(),
                    ];

                    $existing = QualityIndicatorEntry::query()
                        ->where('quality_indicator_id', $indicatorId)
                        ->whereDate('period_date', $data['period_date'])
                        ->first();

                    if ($existing) {
                        $existing->update($payloadEntry);
                    } else {
                        QualityIndicatorEntry::create([
                            'quality_indicator_id' => $indicatorId,
                            'period_date' => $data['period_date'],
                            ...$payloadEntry,
                        ]);
                    }
                }

                $log->update([
                    'status' => 'completed',
                    'confirmed_at' => now(),
                    'payload' => array_merge($log->payload ?? [], [
                        'applied_at' => now()->toDateTimeString(),
                    ]),
                ]);
            });
        } catch (\Throwable $e) {
            $log->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);
            throw $e;
        }

        return $log->fresh(['user:id,name', 'department:id,name', 'team:id,abbreviation,name_th']);
    }

    public function cancel(QualityIndicatorImportLog $log): QualityIndicatorImportLog
    {
        if ($log->status === 'pending') {
            $log->update(['status' => 'cancelled']);
        }

        return $log->fresh();
    }

    private function assertOwnershipSelection(string $type, ?int $departmentId, ?int $teamId): void
    {
        if (! in_array($type, ['organization', 'department', 'ha_team'], true)) {
            throw ValidationException::withMessages(['type' => 'ประเภทปลายทางไม่ถูกต้อง']);
        }

        if ($type === 'department') {
            if (! $departmentId || ! Department::query()->whereKey($departmentId)->exists()) {
                throw ValidationException::withMessages(['department_id' => 'กรุณาเลือกแผนก/หน่วยงาน']);
            }
        }

        if ($type === 'ha_team') {
            if (! $teamId || ! TeamHa::query()->whereKey($teamId)->exists()) {
                throw ValidationException::withMessages(['team_id' => 'กรุณาเลือกทีม HA']);
            }
        }
    }

    private function assertSameOwner(QualityIndicator $indicator, string $type, ?int $departmentId, ?int $teamId): void
    {
        if ($indicator->type !== $type) {
            throw new \RuntimeException('ตัวชี้วัด '.$indicator->code.' อยู่คนละระดับกับที่เลือกนำเข้า');
        }
        if ($type === 'department' && (int) $indicator->department_id !== (int) $departmentId) {
            throw new \RuntimeException('ตัวชี้วัด '.$indicator->code.' อยู่คนละแผนก');
        }
        if ($type === 'ha_team' && (int) $indicator->team_id !== (int) $teamId) {
            throw new \RuntimeException('ตัวชี้วัด '.$indicator->code.' อยู่คนละทีม');
        }
    }

    /**
     * @return array{indicators: list<array>, entries: list<array>}
     */
    private function parseWorkbook(string $path): array
    {
        // Uploaded files are stored as *.tmp — Spout's createReaderFromFile()
        // would fail on extension. Force XLSX reader instead.
        $reader = ReaderEntityFactory::createXLSXReader();
        $reader->open($path);

        $indicators = [];
        $entries = [];

        foreach ($reader->getSheetIterator() as $sheet) {
            $name = mb_strtolower(trim((string) $sheet->getName()));
            if (! in_array($name, ['indicators', 'entries'], true)) {
                continue;
            }

            $headers = null;
            $rowNum = 0;
            $skippedDescription = false;
            foreach ($sheet->getRowIterator() as $row) {
                $rowNum++;
                $cells = array_map(fn ($v) => $this->cellToString($v), $row->toArray());
                if ($headers === null) {
                    $headers = array_map(fn ($h) => mb_strtolower(trim((string) $h)), $cells);
                    continue;
                }

                if ($this->rowIsEmpty($cells)) {
                    continue;
                }

                // แถวที่ 2 ของเทมเพลต = คำอธิบายหัวตาราง (ข้าม)
                if (! $skippedDescription && $this->isDescriptionRow($cells)) {
                    $skippedDescription = true;
                    continue;
                }
                $skippedDescription = true;

                $assoc = $this->mapRow($headers, $cells);
                $assoc['_row'] = $rowNum;

                if ($name === 'indicators') {
                    $indicators[] = $assoc;
                } else {
                    $entries[] = $assoc;
                }
            }
        }

        $reader->close();

        if ($indicators === [] && $entries === []) {
            throw ValidationException::withMessages([
                'file' => 'ไม่พบข้อมูลในชีต indicators หรือ entries — ดาวน์โหลดเทมเพลตแล้วลองใหม่',
            ]);
        }

        return compact('indicators', 'entries');
    }

    /**
     * @param  array{indicators: list<array>, entries: list<array>}  $parsed
     * @return array{can_confirm: bool, counts: array, indicators: list<array>, entries: list<array>, errors: list<array>}
     */
    private function buildPreview(array $parsed, string $type, ?int $departmentId, ?int $teamId): array
    {
        $errors = [];
        $indicatorRows = [];
        $entryRows = [];
        $counts = [
            'indicators_create' => 0,
            'indicators_update' => 0,
            'entries_create' => 0,
            'entries_update' => 0,
            'errors' => 0,
            'skip' => 0,
        ];

        $seenCodes = [];

        foreach ($parsed['indicators'] as $raw) {
            $rowNo = (int) ($raw['_row'] ?? 0);
            $normalized = $this->normalizeIndicatorRow($raw);
            $rowErrors = $normalized['errors'];

            if ($normalized['data']['code'] !== '') {
                $key = mb_strtoupper($normalized['data']['code']);
                if (isset($seenCodes[$key])) {
                    $rowErrors[] = 'รหัส code ซ้ำในไฟล์ (แถว '.$seenCodes[$key].')';
                } else {
                    $seenCodes[$key] = $rowNo;
                }
            }

            $existing = null;
            if ($normalized['data']['code'] !== '' && $rowErrors === []) {
                $existing = QualityIndicator::query()
                    ->whereRaw('UPPER(code) = ?', [mb_strtoupper($normalized['data']['code'])])
                    ->first();

                if ($existing) {
                    $sameOwner = $existing->type === $type
                        && ($type !== 'department' || (int) $existing->department_id === (int) $departmentId)
                        && ($type !== 'ha_team' || (int) $existing->team_id === (int) $teamId)
                        && ($type !== 'organization' || ($existing->department_id === null && $existing->team_id === null));

                    if (! $sameOwner) {
                        $rowErrors[] = 'รหัสนี้มีอยู่แล้วในสังกัดอื่น ('.$this->ownerLabel($existing->type, $existing->department_id, $existing->team_id).')';
                    }
                }
            }

            $linkCode = $normalized['data']['link_code'] ?? '';
            if ($linkCode !== '' && $rowErrors === [] && ! $existing) {
                if (mb_strtoupper($linkCode) === mb_strtoupper($normalized['data']['code'])) {
                    $rowErrors[] = 'link_code ต้องเป็นรหัสอื่น ไม่ใช่รหัสของแถวนี้';
                } else {
                    $source = QualityIndicator::query()
                        ->whereRaw('UPPER(code) = ?', [mb_strtoupper($linkCode)])
                        ->first();
                    if (! $source) {
                        $rowErrors[] = 'ไม่พบตัวชี้วัดรหัส '.$linkCode.' สำหรับเชื่อมข้อมูล';
                    }
                }
            }

            if ($rowErrors !== []) {
                $counts['errors']++;
                $errors[] = ['sheet' => 'indicators', 'row' => $rowNo, 'messages' => $rowErrors];
                $indicatorRows[] = [
                    'row' => $rowNo,
                    'action' => 'error',
                    'messages' => $rowErrors,
                    'data' => $normalized['data'],
                ];
                continue;
            }

            $action = $existing ? 'update' : 'create';
            $counts[$action === 'create' ? 'indicators_create' : 'indicators_update']++;
            $indicatorRows[] = [
                'row' => $rowNo,
                'action' => $action,
                'indicator_id' => $existing?->id,
                'messages' => [],
                'data' => $normalized['data'],
            ];
        }

        foreach ($parsed['entries'] as $raw) {
            $rowNo = (int) ($raw['_row'] ?? 0);
            $normalized = $this->normalizeEntryRow($raw, $indicatorRows);
            $rowErrors = $normalized['errors'];
            $code = $normalized['data']['code'];
            $indicator = null;
            $fromFile = null;

            if ($code !== '' && $rowErrors === []) {
                $fromFile = collect($indicatorRows)
                    ->first(fn ($r) => ($r['action'] ?? '') !== 'error'
                        && mb_strtoupper((string) ($r['data']['code'] ?? '')) === mb_strtoupper($code));

                if ($fromFile) {
                    $indicator = ! empty($fromFile['indicator_id'])
                        ? QualityIndicator::query()->find($fromFile['indicator_id'])
                        : null;
                } else {
                    $indicator = QualityIndicator::query()
                        ->where('type', $type)
                        ->when($type === 'department', fn ($q) => $q->where('department_id', $departmentId))
                        ->when($type === 'ha_team', fn ($q) => $q->where('team_id', $teamId))
                        ->when($type === 'organization', fn ($q) => $q->whereNull('department_id')->whereNull('team_id'))
                        ->whereRaw('UPPER(code) = ?', [mb_strtoupper($code)])
                        ->first();

                    if (! $indicator) {
                        $elsewhere = QualityIndicator::query()
                            ->whereRaw('UPPER(code) = ?', [mb_strtoupper($code)])
                            ->first();
                        $rowErrors[] = $elsewhere
                            ? 'รหัสนี้มีอยู่แล้วในสังกัดอื่น'
                            : 'ไม่พบตัวชี้วัดรหัสนี้ในสังกัดที่เลือก (และไม่มีในชีต indicators)';
                    }
                }
            }

            if ($rowErrors !== []) {
                $counts['errors']++;
                $errors[] = ['sheet' => 'entries', 'row' => $rowNo, 'messages' => $rowErrors];
                $entryRows[] = [
                    'row' => $rowNo,
                    'action' => 'error',
                    'messages' => $rowErrors,
                    'data' => $normalized['data'],
                ];
                continue;
            }

            $existingEntry = null;
            $indicatorId = $indicator?->id ?? ($fromFile['indicator_id'] ?? null);
            if ($indicatorId) {
                $existingEntry = QualityIndicatorEntry::query()
                    ->where('quality_indicator_id', $indicatorId)
                    ->whereDate('period_date', $normalized['data']['period_date'])
                    ->first();
            }

            $action = $existingEntry ? 'update' : 'create';
            $counts[$action === 'create' ? 'entries_create' : 'entries_update']++;
            $entryRows[] = [
                'row' => $rowNo,
                'action' => $action,
                'indicator_id' => $indicatorId,
                'entry_id' => $existingEntry?->id,
                'messages' => [],
                'data' => $normalized['data'],
            ];
        }

        return [
            'can_confirm' => $counts['errors'] === 0
                && ($counts['indicators_create'] + $counts['indicators_update'] + $counts['entries_create'] + $counts['entries_update']) > 0,
            'counts' => $counts,
            'indicators' => $indicatorRows,
            'entries' => $entryRows,
            'errors' => $errors,
            'owner_label' => $this->ownerLabel($type, $departmentId, $teamId),
        ];
    }

    /**
     * @return array{data: array, errors: list<string>}
     */
    private function normalizeIndicatorRow(array $raw): array
    {
        $errors = [];
        $code = trim((string) ($raw['code'] ?? ''));
        $name = trim((string) ($raw['name'] ?? ''));
        $unit = trim((string) ($raw['unit'] ?? '')) ?: '%';
        $operator = trim((string) ($raw['target_operator'] ?? '')) ?: '<';
        $frequency = trim((string) ($raw['frequency'] ?? '')) ?: 'Monthly';
        $targetRaw = $raw['target_value'] ?? null;
        $activeRaw = $raw['is_active'] ?? '1';

        if ($code === '') {
            $errors[] = 'ต้องระบุ code';
        } elseif (mb_strlen($code) > 50) {
            $errors[] = 'code ยาวเกิน 50 ตัวอักษร';
        }

        $linkCode = trim((string) ($raw['link_code'] ?? ''));

        if ($name === '' && $linkCode === '') {
            $errors[] = 'ต้องระบุ name หรือ link_code ของตัวชี้วัดที่ต้องการใช้ข้อมูลชุดเดียวกัน';
        }

        if (! in_array($operator, ['<', '>', '<=', '>=', '='], true)) {
            $errors[] = 'target_operator ต้องเป็น < > <= >= =';
        }

        $target = null;
        if ($targetRaw !== null && $targetRaw !== '') {
            if (! is_numeric($targetRaw)) {
                $errors[] = 'target_value ต้องเป็นตัวเลข';
            } else {
                $target = round((float) $targetRaw, 2);
            }
        }

        $isActive = true;
        $activeStr = mb_strtolower(trim((string) $activeRaw));
        if (in_array($activeStr, ['0', 'false', 'no', 'n', 'inactive'], true)) {
            $isActive = false;
        }

        return [
            'data' => [
                'code' => $code,
                'name' => $name,
                'category' => $this->nullableString($raw['category'] ?? null),
                'unit' => $unit,
                'target_value' => $target,
                'target_operator' => $operator,
                'frequency' => $frequency,
                'description' => $this->nullableString($raw['description'] ?? null),
                'formula_description' => $this->nullableString($raw['formula_description'] ?? null),
                'is_active' => $isActive,
                'link_code' => $linkCode,
            ],
            'errors' => $errors,
        ];
    }

    /**
     * @param  list<array>  $indicatorRows
     * @return array{data: array, errors: list<string>}
     */
    private function normalizeEntryRow(array $raw, array $indicatorRows = []): array
    {
        $errors = [];
        $code = trim((string) ($raw['code'] ?? ''));
        $period = $this->parseDate($raw['period_date'] ?? null);
        $numerator = $this->parseDecimal($raw['numerator'] ?? null);
        $denominator = $this->parseDecimal($raw['denominator'] ?? null);
        $resultRaw = $this->parseDecimal($raw['result_value'] ?? null);

        if ($code === '') {
            $errors[] = 'ต้องระบุ code';
        }
        if ($period === null) {
            $errors[] = 'period_date ไม่ถูกต้อง (ใช้ YYYY-MM-DD)';
        }
        if ($numerator === false) {
            $errors[] = 'numerator ต้องเป็นตัวเลข';
            $numerator = null;
        }
        if ($denominator === false) {
            $errors[] = 'denominator ต้องเป็นตัวเลข';
            $denominator = null;
        }
        if ($resultRaw === false) {
            $errors[] = 'result_value ต้องเป็นตัวเลข';
            $resultRaw = null;
        }

        $unit = '%';
        if ($code !== '') {
            $fromFile = collect($indicatorRows)->first(
                fn ($r) => mb_strtoupper((string) ($r['data']['code'] ?? '')) === mb_strtoupper($code)
            );
            if ($fromFile) {
                $unit = (string) ($fromFile['data']['unit'] ?? '%');
            } else {
                $unit = (string) (QualityIndicator::query()
                    ->whereRaw('UPPER(code) = ?', [mb_strtoupper($code)])
                    ->value('unit') ?: '%');
            }
        }

        $result = $this->computeResult(
            is_float($numerator) || is_int($numerator) ? (float) $numerator : null,
            is_float($denominator) || is_int($denominator) ? (float) $denominator : null,
            is_float($resultRaw) || is_int($resultRaw) ? (float) $resultRaw : null,
            $unit
        );

        if ($result === null) {
            $errors[] = 'ต้องระบุ result_value หรือ numerator+denominator';
        }

        return [
            'data' => [
                'code' => $code,
                'period_date' => $period,
                'numerator' => $numerator !== null && $numerator !== false ? round((float) $numerator, 2) : null,
                'denominator' => $denominator !== null && $denominator !== false ? round((float) $denominator, 2) : null,
                'result_value' => $result,
                'notes' => $this->nullableString($raw['notes'] ?? null),
            ],
            'errors' => $errors,
        ];
    }

    private function parseDate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof \DateTimeInterface) {
            return Carbon::instance(\DateTimeImmutable::createFromInterface($value))->format('Y-m-d');
        }

        if (is_numeric($value)) {
            // Excel serial date
            try {
                $unix = ((int) $value - 25569) * 86400;

                return Carbon::createFromTimestampUTC($unix)->format('Y-m-d');
            } catch (\Throwable) {
                return null;
            }
        }

        $str = trim((string) $value);
        try {
            return Carbon::parse($str)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }

    private function parseDecimal(mixed $value): float|false|null
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_numeric($value)) {
            return (float) $value;
        }
        $str = str_replace([',', ' '], ['', ''], trim((string) $value));
        if ($str === '') {
            return null;
        }
        if (! is_numeric($str)) {
            return false;
        }

        return (float) $str;
    }

    private function nullableString(mixed $value): ?string
    {
        $str = trim((string) ($value ?? ''));

        return $str === '' ? null : $str;
    }

    private function cellToString(mixed $value): mixed
    {
        if ($value instanceof \DateTimeInterface) {
            return Carbon::instance(\DateTimeImmutable::createFromInterface($value))->format('Y-m-d');
        }

        return $value;
    }

    private function rowIsEmpty(array $cells): bool
    {
        foreach ($cells as $cell) {
            if (trim((string) ($cell ?? '')) !== '') {
                return false;
            }
        }

        return true;
    }

    /**
     * แถวคำอธิบายหัวตารางของเทมเพลต (บรรทัดที่ 2)
     */
    private function isDescriptionRow(array $cells): bool
    {
        $joined = mb_strtolower(implode(' ', array_map(fn ($c) => trim((string) ($c ?? '')), $cells)));

        if ($joined === '') {
            return false;
        }

        return str_contains($joined, '[ต้องระบุ]')
            || str_contains($joined, '[ไม่บังคับ]')
            || str_contains($joined, 'ต้องระบุ')
            || str_contains($joined, 'ไม่บังคับ');
    }

    /**
     * @param  list<string>  $headers
     * @param  list<mixed>  $cells
     */
    private function mapRow(array $headers, array $cells): array
    {
        $assoc = [];
        foreach ($headers as $i => $header) {
            if ($header === '') {
                continue;
            }
            $assoc[$header] = $cells[$i] ?? null;
        }

        return $assoc;
    }

    public function ownerLabel(string $type, ?int $departmentId, ?int $teamId): string
    {
        if ($type === 'department') {
            return Department::query()->whereKey($departmentId)->value('name') ?: 'แผนก';
        }

        if ($type === 'ha_team') {
            $team = TeamHa::query()->find($teamId);
            if (! $team) {
                return 'ทีม HA';
            }

            return trim(($team->abbreviation ? $team->abbreviation.' - ' : '').$team->name_th);
        }

        return 'ระดับองค์กร';
    }

    private function computeResult(?float $numerator, ?float $denominator, ?float $result, string $unit): ?float
    {
        if ($result !== null) {
            return round($result, 2);
        }

        if ($numerator === null || $denominator === null || (float) $denominator == 0.0) {
            return null;
        }

        $ratio = (float) $numerator / (float) $denominator;
        if ($unit === '%' || str_contains($unit, '%')) {
            return round($ratio * 100, 2);
        }
        if (str_contains($unit, '1000')) {
            return round($ratio * 1000, 2);
        }

        return round($ratio, 2);
    }
}
