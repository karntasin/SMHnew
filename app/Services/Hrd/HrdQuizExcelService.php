<?php

namespace App\Services\Hrd;

use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Symfony\Component\HttpFoundation\StreamedResponse;

class HrdQuizExcelService
{
    public const HEADERS = [
        'ประเภท',
        'คำถาม',
        'คะแนน',
        'ตัวเลือก1',
        'ตัวเลือก2',
        'ตัวเลือก3',
        'ตัวเลือก4',
        'คำตอบถูก',
        'คู่ซ้าย1',
        'คู่ขวา1',
        'คู่ซ้าย2',
        'คู่ขวา2',
        'คู่ซ้าย3',
        'คู่ขวา3',
    ];

    /**
     * @return array{questions: list<array<string, mixed>>, errors: list<string>}
     */
    public function parse(string $absolutePath): array
    {
        $spreadsheet = IOFactory::load($absolutePath);
        $sheet = $spreadsheet->getSheet(0);
        $rows = $sheet->toArray(null, true, true, false);

        if ($rows === []) {
            return ['questions' => [], 'errors' => ['ไฟล์ว่างเปล่า']];
        }

        $headerRow = array_shift($rows);
        $map = $this->mapHeaders($headerRow ?? []);
        if (! isset($map['ประเภท']) || ! isset($map['คำถาม'])) {
            return [
                'questions' => [],
                'errors' => ['ไม่พบคอลัมน์ "ประเภท" และ "คำถาม" — กรุณาใช้ไฟล์ต้นแบบ'],
            ];
        }

        $questions = [];
        $errors = [];
        $line = 1;

        foreach ($rows as $row) {
            $line++;
            if ($this->rowEmpty($row)) {
                continue;
            }

            try {
                $questions[] = $this->parseRow($row, $map, $line);
            } catch (\InvalidArgumentException $e) {
                $errors[] = $e->getMessage();
            }
        }

        return ['questions' => $questions, 'errors' => $errors];
    }

    public function downloadTemplate(): StreamedResponse
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('แบบทดสอบ');

        foreach (self::HEADERS as $i => $header) {
            $col = Coordinate::stringFromColumnIndex($i + 1);
            $sheet->setCellValue($col.'1', $header);
        }

        $headerRange = 'A1:'.Coordinate::stringFromColumnIndex(count(self::HEADERS)).'1';
        $sheet->getStyle($headerRange)->getFont()->setBold(true);
        $sheet->getStyle($headerRange)->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()->setRGB('D1FAE5');
        $sheet->getStyle($headerRange)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $examples = [
            ['ปรนัย', 'ข้อใดคือระบบปฏิบัติการ?', 1, 'Windows', 'Excel', 'Word', 'Chrome', '1', '', '', '', '', '', ''],
            ['ปรนัย', 'HTML ย่อมาจากอะไร?', 1, 'HyperText Markup Language', 'High Text', 'Home Tool', 'Hyper Transfer', 'A', '', '', '', '', '', ''],
            ['ถูก/ผิด', 'PHP เป็นภาษาฝั่งเซิร์ฟเวอร์', 1, '', '', '', '', 'ถูก', '', '', '', '', '', ''],
            ['เติมคำ', 'เมืองหลวงของประเทศไทยคือ', 1, '', '', '', '', 'กรุงเทพมหานคร', '', '', '', '', '', ''],
            ['จับคู่', 'จับคู่คำกับความหมาย', 1, '', '', '', '', '', 'CPU', 'หน่วยประมวลผล', 'RAM', 'หน่วยความจำ', 'HDD', 'ฮาร์ดดิสก์'],
        ];

        foreach ($examples as $r => $example) {
            foreach ($example as $c => $value) {
                $sheet->setCellValue(Coordinate::stringFromColumnIndex($c + 1).($r + 2), $value);
            }
        }

        foreach (range(1, count(self::HEADERS)) as $i) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($i))->setAutoSize(true);
        }

        $guide = new Worksheet($spreadsheet, 'คำอธิบาย');
        $spreadsheet->addSheet($guide, 1);
        $lines = [
            ['คู่มือนำเข้าแบบทดสอบ'],
            [''],
            ['ประเภทที่รองรับ', 'ปรนัย | ถูก/ผิด | เติมคำ | จับคู่'],
            ['คะแนน', 'ตัวเลข เช่น 1 (ว่างได้ ค่าเริ่มต้น = 1)'],
            ['ปรนัย', 'ใส่ตัวเลือก1-4 และระบุคำตอบถูกเป็น 1-4 หรือ A-D หรือข้อความตัวเลือก'],
            ['ถูก/ผิด', 'ใส่คำตอบถูกเป็น ถูก หรือ ผิด'],
            ['เติมคำ', 'ใส่คำตอบถูกเป็นข้อความที่ต้องกรอก'],
            ['จับคู่', 'ใช้คอลัมน์ คู่ซ้าย1/คู่ขวา1 ... ได้สูงสุด 3 คู่'],
            [''],
            ['หมายเหตุ', 'แถวตัวอย่างในชีต "แบบทดสอบ" สามารถลบแล้วใส่ข้อมูลจริงได้'],
            ['', 'นำเข้าแล้วระบบจะเพิ่มคำถามต่อท้ายรายการเดิม'],
        ];
        foreach ($lines as $i => $line) {
            $guide->setCellValue('A'.($i + 1), $line[0] ?? '');
            $guide->setCellValue('B'.($i + 1), $line[1] ?? '');
        }
        $guide->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $guide->getColumnDimension('A')->setWidth(22);
        $guide->getColumnDimension('B')->setWidth(70);

        $spreadsheet->setActiveSheetIndex(0);

        $filename = 'hrd-quiz-template.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
            $writer->save('php://output');
            $spreadsheet->disconnectWorksheets();
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * @param  list<mixed>  $headerRow
     * @return array<string, int>
     */
    private function mapHeaders(array $headerRow): array
    {
        $aliases = [
            'ประเภท' => 'ประเภท',
            'type' => 'ประเภท',
            'คำถาม' => 'คำถาม',
            'question' => 'คำถาม',
            'คะแนน' => 'คะแนน',
            'points' => 'คะแนน',
            'ตัวเลือก1' => 'ตัวเลือก1',
            'option1' => 'ตัวเลือก1',
            'ตัวเลือก2' => 'ตัวเลือก2',
            'option2' => 'ตัวเลือก2',
            'ตัวเลือก3' => 'ตัวเลือก3',
            'option3' => 'ตัวเลือก3',
            'ตัวเลือก4' => 'ตัวเลือก4',
            'option4' => 'ตัวเลือก4',
            'คำตอบถูก' => 'คำตอบถูก',
            'correct' => 'คำตอบถูก',
            'correct_answer' => 'คำตอบถูก',
            'คู่ซ้าย1' => 'คู่ซ้าย1',
            'คู่ขวา1' => 'คู่ขวา1',
            'คู่ซ้าย2' => 'คู่ซ้าย2',
            'คู่ขวา2' => 'คู่ขวา2',
            'คู่ซ้าย3' => 'คู่ซ้าย3',
            'คู่ขวา3' => 'คู่ขวา3',
            'left1' => 'คู่ซ้าย1',
            'right1' => 'คู่ขวา1',
            'left2' => 'คู่ซ้าย2',
            'right2' => 'คู่ขวา2',
            'left3' => 'คู่ซ้าย3',
            'right3' => 'คู่ขวา3',
        ];

        $map = [];
        foreach ($headerRow as $index => $raw) {
            $key = mb_strtolower(trim((string) $raw));
            $key = preg_replace('/\s+/', '', $key) ?? $key;
            if (isset($aliases[$key])) {
                $map[$aliases[$key]] = $index;
            } elseif (in_array((string) $raw, self::HEADERS, true)) {
                $map[(string) $raw] = $index;
            }
        }

        return $map;
    }

    /**
     * @param  list<mixed>  $row
     * @param  array<string, int>  $map
     * @return array<string, mixed>
     */
    private function parseRow(array $row, array $map, int $line): array
    {
        $typeRaw = $this->cell($row, $map['ประเภท'] ?? null);
        $questionText = $this->cell($row, $map['คำถาม'] ?? null);
        $points = (int) ($this->cell($row, $map['คะแนน'] ?? null) ?: 1);
        if ($points < 1) {
            $points = 1;
        }

        if ($questionText === '') {
            throw new \InvalidArgumentException("แถว {$line}: ไม่มีข้อความคำถาม");
        }

        $type = $this->normalizeType($typeRaw);
        if ($type === null) {
            throw new \InvalidArgumentException("แถว {$line}: ประเภท \"{$typeRaw}\" ไม่รองรับ");
        }

        $correctRaw = $this->cell($row, $map['คำตอบถูก'] ?? null);

        if ($type === 'multiple_choice') {
            $options = [];
            foreach (['ตัวเลือก1', 'ตัวเลือก2', 'ตัวเลือก3', 'ตัวเลือก4'] as $key) {
                $text = $this->cell($row, $map[$key] ?? null);
                if ($text !== '') {
                    $options[] = $text;
                }
            }
            if (count($options) < 2) {
                throw new \InvalidArgumentException("แถว {$line}: ปรนัยต้องมีตัวเลือกอย่างน้อย 2 ข้อ");
            }

            $correctIndex = $this->resolveCorrectIndex($correctRaw, $options);
            if ($correctIndex === null) {
                throw new \InvalidArgumentException("แถว {$line}: ไม่พบคำตอบถูกสำหรับปรนัย");
            }

            $answers = [];
            foreach ($options as $i => $text) {
                $answers[] = [
                    'answer_text' => $text,
                    'is_correct' => $i === $correctIndex,
                ];
            }

            // สุ่มตำแหน่งตัวเลือก เพื่อไม่ให้คำตอบถูกอยู่ข้อแรกเสมอ
            shuffle($answers);

            return [
                'question_text' => $questionText,
                'type' => 'multiple_choice',
                'points' => $points,
                'answers' => $answers,
            ];
        }

        if ($type === 'true_false') {
            $isTrue = $this->isTruthy($correctRaw);
            if ($correctRaw === '') {
                $isTrue = true;
            }

            $answers = [
                ['answer_text' => 'ถูก', 'is_correct' => $isTrue],
                ['answer_text' => 'ผิด', 'is_correct' => ! $isTrue],
            ];
            shuffle($answers);

            return [
                'question_text' => $questionText,
                'type' => 'true_false',
                'points' => $points,
                'answers' => $answers,
            ];
        }

        if ($type === 'fill_blank') {
            if ($correctRaw === '') {
                throw new \InvalidArgumentException("แถว {$line}: เติมคำต้องระบุคำตอบถูก");
            }

            return [
                'question_text' => $questionText,
                'type' => 'fill_blank',
                'points' => $points,
                'answers' => [
                    ['answer_text' => $correctRaw, 'is_correct' => true],
                ],
            ];
        }

        // matching
        $pairs = [];
        for ($i = 1; $i <= 3; $i++) {
            $left = $this->cell($row, $map['คู่ซ้าย'.$i] ?? null);
            $right = $this->cell($row, $map['คู่ขวา'.$i] ?? null);
            if ($left === '' && $right === '') {
                continue;
            }
            if ($left === '' || $right === '') {
                throw new \InvalidArgumentException("แถว {$line}: คู่ที่ {$i} ต้องมีทั้งซ้ายและขวา");
            }
            $pairs[] = [
                'answer_text' => $left,
                'matching_pair' => $right,
                'is_correct' => true,
            ];
        }

        if (count($pairs) < 2) {
            throw new \InvalidArgumentException("แถว {$line}: จับคู่ต้องมีอย่างน้อย 2 คู่");
        }

        return [
            'question_text' => $questionText,
            'type' => 'matching',
            'points' => $points,
            'answers' => $pairs,
        ];
    }

    private function normalizeType(string $raw): ?string
    {
        $value = mb_strtolower(trim($raw));
        $value = preg_replace('/\s+/', '', $value) ?? $value;

        return match ($value) {
            'ปรนัย', 'multiple_choice', 'multiplechoice', 'mcq', 'choice' => 'multiple_choice',
            'ถูก/ผิด', 'ถูกผิด', 'true_false', 'truefalse', 'tf', 'boolean' => 'true_false',
            'เติมคำ', 'fill_blank', 'fillblank', 'blank' => 'fill_blank',
            'จับคู่', 'matching', 'match' => 'matching',
            default => null,
        };
    }

    /**
     * @param  list<string>  $options
     */
    private function resolveCorrectIndex(string $correctRaw, array $options): ?int
    {
        $raw = trim($correctRaw);
        if ($raw === '') {
            return 0;
        }

        if (preg_match('/^[1-4]$/', $raw)) {
            $index = ((int) $raw) - 1;

            return isset($options[$index]) ? $index : null;
        }

        if (preg_match('/^[A-Da-d]$/', $raw)) {
            $index = ord(strtoupper($raw)) - ord('A');

            return isset($options[$index]) ? $index : null;
        }

        foreach ($options as $i => $text) {
            if (mb_strtolower(trim($text)) === mb_strtolower($raw)) {
                return $i;
            }
        }

        return null;
    }

    private function isTruthy(string $raw): bool
    {
        $value = mb_strtolower(trim($raw));

        return in_array($value, ['ถูก', 'จริง', 'true', 'yes', 'y', '1', 't'], true);
    }

    /**
     * @param  list<mixed>  $row
     */
    private function cell(array $row, ?int $index): string
    {
        if ($index === null || ! array_key_exists($index, $row)) {
            return '';
        }

        return trim((string) ($row[$index] ?? ''));
    }

    /**
     * @param  list<mixed>  $row
     */
    private function rowEmpty(array $row): bool
    {
        foreach ($row as $cell) {
            if (trim((string) $cell) !== '') {
                return false;
            }
        }

        return true;
    }
}
