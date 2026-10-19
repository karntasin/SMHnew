<?php

namespace App\Services\AdminDocs;

use App\Data\OfficialMemoForms;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\SimpleType\Jc;
use PhpOffice\PhpWord\Style\Tab;
use PhpOffice\PhpWord\Shared\Converter;

class OfficialMemoDocxService
{
    /** 6 พอยต์ ตามตัวอย่าง 1 Enter + Before 6 pt */
    private const GAP_BEFORE = 120;

    private const LABEL_GAP = '  ';
    /**
     * @param  array<string, array{enabled?: bool, value?: string}>  $sections
     */
    public function download(string $kind, bool $thaiDigits, array $sections)
    {
        $phpWord = $this->makeDocument($kind, $thaiDigits, $sections);
        $fileName = $this->downloadName($kind, $sections);
        $directory = storage_path('app/temp');

        if (! is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        $tempFile = $directory.DIRECTORY_SEPARATOR.uniqid('memo_', true).'.docx';
        IOFactory::createWriter($phpWord, 'Word2007')->save($tempFile);

        return response()->download($tempFile, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ])->deleteFileAfterSend(true);
    }

    /**
     * @param  array<string, array{enabled?: bool, value?: string}>  $sections
     */
    public function makeDocument(string $kind, bool $thaiDigits, array $sections): PhpWord
    {
        $phpWord = new PhpWord();
        $phpWord->setDefaultFontName('TH Sarabun New');
        $phpWord->setDefaultFontSize(16);
        $phpWord->setDefaultParagraphStyle([
            'spaceAfter' => 0,
            'spaceBefore' => 0,
            'lineHeight' => 1.0,
        ]);

        $phpWord->getDocInfo()
            ->setTitle($this->raw($sections, 'subject') ?: 'หนังสือราชการ')
            ->setCreator((string) config('department_data.hospital_name'));

        $garudaHeight = $kind === 'internal' ? 1.5 : 3.0;
        $section = $phpWord->addSection([
            'pageSizeW' => Converter::cmToTwip(21),
            'pageSizeH' => Converter::cmToTwip(29.7),
            'marginTop' => Converter::cmToTwip($kind === 'internal' ? 3.3 : 4.8),
            'marginBottom' => Converter::cmToTwip(2),
            'marginLeft' => Converter::cmToTwip(3),
            'marginRight' => Converter::cmToTwip(2),
            'headerHeight' => Converter::cmToTwip(1.5),
        ]);
        $this->addGaruda($section, $garudaHeight);

        match ($kind) {
            'external' => $this->writeExternal($section, $thaiDigits, $sections),
            'order' => $this->writeOrder($section, $thaiDigits, $sections),
            default => $this->writeInternal($section, $thaiDigits, $sections),
        };

        return $phpWord;
    }

    /**
     * @param  array<string, array{enabled?: bool, value?: string}>  $sections
     */
    private function writeInternal($section, bool $thaiDigits, array $sections): void
    {
        $section->addText('บันทึกข้อความ', $this->memoTitleFont(), $this->center(0));

        if ($this->isOn($sections, 'agency')) {
            $this->addMeta($section, 'ส่วนราชการ', $this->raw($sections, 'agency'));
        }

        $this->addNumberAndDate($section, $thaiDigits, $sections, 'document_date');

        if ($this->isOn($sections, 'subject')) {
            $this->addMeta($section, 'เรื่อง', $this->raw($sections, 'subject'), null, self::GAP_BEFORE);
        }

        if ($this->isOn($sections, 'addressee')) {
            $this->addMeta($section, 'เรียน', $this->raw($sections, 'addressee'), null, self::GAP_BEFORE);
        }

        $this->addOptionalMeta($section, 'internal', $sections, 'reference', 'อ้างถึง');
        $this->addOptionalMeta($section, 'internal', $sections, 'attachment', 'สิ่งที่ส่งมาด้วย');

        if ($this->shouldPrint('internal', $sections, 'body')) {
            $this->addParagraphs($section, $this->raw($sections, 'body'));
        }

        if ($this->shouldPrint('internal', $sections, 'closing')) {
            $this->addParagraphs($section, $this->raw($sections, 'closing'));
        }

        $this->addSignature($section, $sections);
        $this->addCopies($section, 'สำเนาเรียน', $this->visibleText('internal', $sections, 'copies'));
        $this->addContact($section, 'internal', $sections);
    }

    /**
     * @param  array<string, array{enabled?: bool, value?: string}>  $sections
     */
    private function writeExternal($section, bool $thaiDigits, array $sections): void
    {
        $unit = $this->visibleText('external', $sections, 'unit_name');
        if ($unit !== '') {
            $section->addText($unit, $this->unitTitleFont(), $this->center(0));
        }

        $address = $this->visibleText('external', $sections, 'address');
        if ($address !== '') {
            foreach ($this->lines($address) as $line) {
                $section->addText($line, $this->font(), $this->center(0));
            }
        }

        $this->addNumberAndDate($section, $thaiDigits, $sections, 'document_date');

        if ($this->isOn($sections, 'subject')) {
            $this->addMeta($section, 'เรื่อง', $this->raw($sections, 'subject'), null, self::GAP_BEFORE);
        }
        if ($this->isOn($sections, 'addressee')) {
            $this->addMeta($section, 'เรียน', $this->raw($sections, 'addressee'), null, self::GAP_BEFORE);
        }

        $this->addOptionalMeta($section, 'external', $sections, 'reference', 'อ้างถึง');
        $this->addOptionalMeta($section, 'external', $sections, 'attachment', 'สิ่งที่ส่งมาด้วย');

        if ($this->shouldPrint('external', $sections, 'body')) {
            $this->addParagraphs($section, $this->raw($sections, 'body'));
        }

        $this->addSignature($section, $sections, $this->visibleText('external', $sections, 'closing'));
        $this->addOwnerBlock($section, $sections);
        $this->addCopies($section, 'สำเนาเรียน', $this->visibleText('external', $sections, 'copies'));
    }

    /**
     * @param  array<string, array{enabled?: bool, value?: string}>  $sections
     */
    private function writeOrder($section, bool $thaiDigits, array $sections): void
    {
        $unit = $this->visibleText('order', $sections, 'unit_name');
        $heading = 'คำสั่ง'.$unit;
        $section->addText($heading, $this->memoTitleFont(), $this->spacedCenter(2.0));

        if ($this->isOn($sections, 'document_no')) {
            $section->addText('ที่ '.self::LABEL_GAP.$this->numberText($sections, $thaiDigits), $this->boldFont(), $this->spacedCenter(1.0));
        }

        if ($this->isOn($sections, 'subject')) {
            $section->addText('เรื่อง '.self::LABEL_GAP.$this->raw($sections, 'subject'), $this->boldFont(), $this->spacedCenter(1.0));
        }

        $section->addText(' ', ['name' => 'TH Sarabun New', 'size' => 8], [
            'alignment' => Jc::CENTER,
            'borderBottomSize' => 12,
            'borderBottomColor' => '000000',
            'spaceBefore' => 0,
            'spaceAfter' => 0,
            'lineHeight' => 1.0,
        ]);

        $startedBody = false;
        foreach (['body', 'authority', 'orders'] as $key) {
            if (! $this->shouldPrint('order', $sections, $key)) {
                continue;
            }
            $this->addParagraphs($section, $this->raw($sections, $key), 1.5, ! $startedBody);
            $startedBody = true;
        }

        $effective = $this->visibleText('order', $sections, 'effective', $thaiDigits);
        if ($effective !== '') {
            $section->addText('ทั้งนี้ ตั้งแต่ '.self::LABEL_GAP.$effective, $this->font(), [
                'alignment' => Jc::LEFT,
                'spaceAfter' => 0,
                'spaceBefore' => 0,
                'lineHeight' => 1.5,
                'indentation' => ['firstLine' => Converter::cmToTwip(2.5)],
            ]);
        }

        if ($this->isOn($sections, 'order_date')) {
            $date = $this->dateText($sections, 'order_date', $thaiDigits);
            $section->addText('สั่ง ณ วันที่ '.self::LABEL_GAP.$date, $this->font(), $this->spacedCenter(2.0));
        }

        $this->addSignature($section, $sections);
        $this->addCopies($section, 'สำเนาส่ง', $this->visibleText('order', $sections, 'copies'));
    }

    /**
     * @param  array<string, array{enabled?: bool, value?: string}>  $sections
     */
    private function addNumberAndDate($section, bool $thaiDigits, array $sections, string $dateKey): void
    {
        $showNo = $this->isOn($sections, 'document_no');
        $showDate = $this->isOn($sections, $dateKey);
        if (! $showNo && ! $showDate) {
            return;
        }

        $right = $showDate ? 'วันที่'.self::LABEL_GAP.$this->dateText($sections, $dateKey, $thaiDigits) : null;
        if ($showNo) {
            $this->addMeta($section, 'ที่', $this->numberText($sections, $thaiDigits), $right);
            return;
        }

        $this->addMeta($section, 'วันที่', $this->dateText($sections, $dateKey, $thaiDigits));
    }

    /**
     * @param  array<string, array{enabled?: bool, value?: string}>  $sections
     */
    private function addOptionalMeta($section, string $kind, array $sections, string $key, string $label): void
    {
        if (! $this->shouldPrint($kind, $sections, $key)) {
            return;
        }

        $this->addMeta($section, $label, $this->raw($sections, $key), null, self::GAP_BEFORE);
    }

    private function addMeta($section, string $label, string $value, ?string $right = null, int $spaceBefore = 0): void
    {
        $paragraph = [
            'spaceAfter' => 0,
            'spaceBefore' => $spaceBefore,
            'lineHeight' => 1.0,
        ];
        if ($right !== null && $right !== '') {
            $paragraph['tabs'] = [
                new Tab('left', Converter::cmToTwip(7.5)),
            ];
        }

        $run = $section->addTextRun($paragraph);
        $run->addText($label.self::LABEL_GAP.$value, $this->font());
        if ($right !== null && $right !== '') {
            $run->addText("\t".$right, $this->font());
        }
    }

    private function addGaruda($section, float $heightCm): void
    {
        $path = public_path('images/official/garuda.png');
        if (! is_file($path)) {
            return;
        }

        $header = $section->addHeader();
        $header->addImage($path, [
            'height' => $heightCm / 2.54 * 72,
            'alignment' => Jc::CENTER,
        ]);
    }

    private function addParagraphs($section, string $text, float $lineHeight = 1.0, bool $gapBeforeFirst = true): void
    {
        foreach ($this->lines($text) as $index => $line) {
            $section->addText($line, $this->font(), [
                'alignment' => Jc::LEFT,
                'indentation' => ['firstLine' => Converter::cmToTwip(2.5)],
                'spaceAfter' => 0,
                'spaceBefore' => $gapBeforeFirst && $index === 0 ? self::GAP_BEFORE : 0,
                'lineHeight' => $lineHeight,
            ]);
        }
    }

    /**
     * @param  array<string, array{enabled?: bool, value?: string}>  $sections
     */
    private function addSignature($section, array $sections, string $closing = ''): void
    {
        $rank = $this->isOn($sections, 'signer_rank') ? $this->raw($sections, 'signer_rank') : '';
        $name = $this->isOn($sections, 'signer_name') ? $this->raw($sections, 'signer_name') : '';
        $position = $this->isOn($sections, 'signer_position') ? $this->raw($sections, 'signer_position') : '';
        if ($rank === '' && $name === '' && $position === '' && $closing === '') {
            return;
        }

        $section->addTextBreak(1, $this->font());
        $table = $section->addTable([
            'borderSize' => 0,
            'borderColor' => 'FFFFFF',
            'cellMargin' => 0,
        ]);
        $table->addRow();
        $table->addCell(Converter::cmToTwip(7.5), $this->plainCell());
        $cell = $table->addCell(Converter::cmToTwip(8.5), $this->plainCell());
        $center = ['alignment' => Jc::CENTER, 'spaceAfter' => 0, 'spaceBefore' => 0];

        if ($closing !== '') {
            $cell->addText($closing, $this->font(), $center);
            $cell->addTextBreak(2, $this->font());
        }

        if ($rank !== '') {
            $cell->addText($rank, $this->font(), $center);
        }
        if ($name !== '') {
            $cell->addText($this->parenthesize($name), $this->font(), $center);
        }
        if ($position !== '') {
            $cell->addText($position, $this->font(), $center);
        }
    }

    /**
     * @param  array<string, array{enabled?: bool, value?: string}>  $sections
     */
    private function addOwnerBlock($section, array $sections): void
    {
        $lines = [];
        $owner = $this->visibleText('external', $sections, 'owner');
        $phone = $this->visibleText('external', $sections, 'phone');
        $fax = $this->visibleText('external', $sections, 'fax');
        $email = $this->visibleText('external', $sections, 'email');

        if ($owner !== '') {
            $lines[] = 'ส่วนราชการเจ้าของเรื่อง '.$owner;
        }
        if ($phone !== '') {
            $lines[] = 'โทร. '.$phone;
        }
        if ($fax !== '') {
            $lines[] = 'โทรสาร '.$fax;
        }
        if ($email !== '') {
            $lines[] = 'ไปรษณีย์อิเล็กทรอนิกส์ '.$email;
        }

        if ($lines === []) {
            return;
        }

        $section->addTextBreak(1, $this->font());
        foreach ($lines as $line) {
            $section->addText($line, $this->font(), $this->left());
        }
    }

    /**
     * @param  array<string, array{enabled?: bool, value?: string}>  $sections
     */
    private function addContact($section, string $kind, array $sections): void
    {
        $phone = $this->visibleText($kind, $sections, 'phone');
        $fax = $this->visibleText($kind, $sections, 'fax');
        if ($phone === '' && $fax === '') {
            return;
        }

        $section->addTextBreak(1, $this->font());
        if ($phone !== '') {
            $section->addText('โทร. '.$phone, $this->font(), $this->left());
        }
        if ($fax !== '') {
            $section->addText('โทรสาร '.$fax, $this->font(), $this->left());
        }
    }

    private function addCopies($section, string $label, string $text): void
    {
        $lines = $this->lines($text);
        if ($lines === []) {
            return;
        }

        $section->addTextBreak(1, $this->font());
        foreach ($lines as $index => $line) {
            $prefix = $index === 0 ? $label.' ' : '';
            $section->addText($prefix.$line, $this->font(), $this->left());
        }
    }

    /**
     * @param  array<string, array{enabled?: bool, value?: string}>  $sections
     */
    private function shouldPrint(string $kind, array $sections, string $key): bool
    {
        if (! $this->isOn($sections, $key)) {
            return false;
        }

        $field = OfficialMemoForms::field($kind, $key);
        $value = $this->raw($sections, $key);
        if ($value === '' && (($field['optional'] ?? false) || ($field['type'] ?? '') === 'textarea')) {
            return false;
        }

        return true;
    }

    /**
     * @param  array<string, array{enabled?: bool, value?: string}>  $sections
     */
    private function visibleText(string $kind, array $sections, string $key, bool $thaiDigits = false): string
    {
        if (! $this->shouldPrint($kind, $sections, $key)) {
            return '';
        }

        $value = $this->raw($sections, $key);
        if ($thaiDigits && $key === 'effective') {
            return $this->thaiDigits($value);
        }

        return $value;
    }

    /**
     * @param  array<string, array{enabled?: bool, value?: string}>  $sections
     */
    private function isOn(array $sections, string $key): bool
    {
        return ! empty($sections[$key]['enabled']);
    }

    /**
     * @param  array<string, array{enabled?: bool, value?: string}>  $sections
     */
    private function raw(array $sections, string $key): string
    {
        return trim((string) ($sections[$key]['value'] ?? ''));
    }

    /**
     * @param  array<string, array{enabled?: bool, value?: string}>  $sections
     */
    private function numberText(array $sections, bool $thaiDigits): string
    {
        $value = $this->raw($sections, 'document_no');

        return $thaiDigits ? $this->thaiDigits($value) : $value;
    }

    /**
     * @param  array<string, array{enabled?: bool, value?: string}>  $sections
     */
    private function dateText(array $sections, string $key, bool $thaiDigits): string
    {
        $formatted = $this->formatThaiDate($this->raw($sections, $key));

        return $thaiDigits ? $this->thaiDigits($formatted) : $formatted;
    }

    private function formatThaiDate(string $iso): string
    {
        if (! preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $iso, $matches)) {
            return $iso;
        }

        $months = [
            1 => 'มกราคม', 2 => 'กุมภาพันธ์', 3 => 'มีนาคม', 4 => 'เมษายน',
            5 => 'พฤษภาคม', 6 => 'มิถุนายน', 7 => 'กรกฎาคม', 8 => 'สิงหาคม',
            9 => 'กันยายน', 10 => 'ตุลาคม', 11 => 'พฤศจิกายน', 12 => 'ธันวาคม',
        ];
        $month = $months[(int) $matches[2]] ?? $matches[2];

        return ((int) $matches[3]).' '.$month.' '.(((int) $matches[1]) + 543);
    }

    private function thaiDigits(string $text): string
    {
        return strtr($text, [
            '0' => '๐', '1' => '๑', '2' => '๒', '3' => '๓', '4' => '๔',
            '5' => '๕', '6' => '๖', '7' => '๗', '8' => '๘', '9' => '๙',
        ]);
    }

    private function parenthesize(string $name): string
    {
        if (str_starts_with($name, '(') && str_ends_with($name, ')')) {
            return $name;
        }

        return '('.$name.')';
    }

    /**
     * @return list<string>
     */
    private function lines(string $text): array
    {
        if (trim($text) === '') {
            return [];
        }

        $lines = preg_split("/\r\n|\n|\r/", $text) ?: [];

        return array_values(array_filter(array_map('trim', $lines), fn ($line) => $line !== ''));
    }

    /**
     * @param  array<string, array{enabled?: bool, value?: string}>  $sections
     */
    private function downloadName(string $kind, array $sections): string
    {
        $labels = [
            'internal' => 'บันทึกข้อความ',
            'external' => 'หนังสือภายนอก',
            'order' => 'คำสั่ง',
        ];
        $subject = preg_replace('/[\\\\\\/:*?"<>|]+/u', '', $this->raw($sections, 'subject')) ?? '';
        $subject = trim(mb_substr($subject, 0, 40));
        $name = $labels[$kind] ?? 'หนังสือราชการ';
        if ($subject !== '') {
            $name .= '_'.$subject;
        }

        return $name.'.docx';
    }

    /**
     * @return array<string, int|string>
     */
    private function font(): array
    {
        return ['name' => 'TH Sarabun New', 'size' => 16];
    }

    /**
     * @return array<string, int|string|bool>
     */
    private function boldFont(): array
    {
        return ['name' => 'TH Sarabun New', 'size' => 16, 'bold' => true];
    }

    /**
     * @return array<string, int|string|bool>
     */
    private function memoTitleFont(): array
    {
        return ['name' => 'TH Sarabun New', 'size' => 20, 'bold' => true];
    }

    /**
     * @return array<string, int|string|bool>
     */
    private function unitTitleFont(): array
    {
        return ['name' => 'TH Sarabun New', 'size' => 29, 'bold' => true];
    }

    /**
     * @return array<string, int|float|string>
     */
    private function center(int $spaceAfter): array
    {
        return ['alignment' => Jc::CENTER, 'spaceAfter' => $spaceAfter, 'spaceBefore' => 0, 'lineHeight' => 1.0];
    }

    /**
     * @return array<string, int|float|string>
     */
    private function spacedCenter(float $lineHeight): array
    {
        return ['alignment' => Jc::CENTER, 'spaceAfter' => 0, 'spaceBefore' => 0, 'lineHeight' => $lineHeight];
    }

    /**
     * @return array<string, int|string>
     */
    private function left(): array
    {
        return ['alignment' => Jc::LEFT, 'spaceAfter' => 0, 'spaceBefore' => 0];
    }

    /**
     * @return array<string, int|string>
     */
    private function plainCell(): array
    {
        return [
            'borderTopSize' => 0,
            'borderRightSize' => 0,
            'borderBottomSize' => 0,
            'borderLeftSize' => 0,
            'borderTopColor' => 'FFFFFF',
            'borderRightColor' => 'FFFFFF',
            'borderBottomColor' => 'FFFFFF',
            'borderLeftColor' => 'FFFFFF',
        ];
    }
}
