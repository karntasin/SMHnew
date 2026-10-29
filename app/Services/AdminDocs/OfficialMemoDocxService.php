<?php

namespace App\Services\AdminDocs;

use App\Data\OfficialMemoForms;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\SimpleType\Jc;
use PhpOffice\PhpWord\Style\Tab;
use PhpOffice\PhpWord\Style\Table;
use PhpOffice\PhpWord\Shared\Converter;

class OfficialMemoDocxService
{
    /** 6 พอยต์ ตามตัวอย่าง 1 Enter + Before 6 pt */
    private const GAP_BEFORE = 120;

    private const LABEL_GAP = '  ';

    /** @var array<string, mixed> */
    private array $layoutPage = [];

    /** @var array<string, array<string, mixed>> */
    private array $blockMap = [];

    /** @var array<int, array<string, mixed>> */
    private array $layoutBlocks = [];

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

        $this->cleanDocxArtifacts($tempFile);

        return response()->download($tempFile, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ])->deleteFileAfterSend(true);
    }

    /**
     * @param  array<string, array{enabled?: bool, value?: string}>  $sections
     */
    public function makeDocument(string $kind, bool $thaiDigits, array $sections): PhpWord
    {
        $layout = OfficialMemoForms::layoutOf($kind);
        $page = $layout['page'] ?? [];
        $this->layoutPage = $page;
        $this->layoutBlocks = $layout['blocks'] ?? [];
        $this->blockMap = [];
        foreach (($layout['blocks'] ?? []) as $block) {
            if (! is_array($block)) {
                continue;
            }
            if (! empty($block['field'])) {
                $this->blockMap['field_'.$block['field']] = $block;
                $this->blockMap[$block['field']] = $block;
            }
            if (! empty($block['role'])) {
                $this->blockMap['role_'.$block['role']] = $block;
            }
            if (! empty($block['id'])) {
                $this->blockMap['id_'.$block['id']] = $block;
                $this->blockMap[$block['id']] = $block;
            }
        }

        $fontFamily = ! empty($page['font_family']) ? (string) $page['font_family'] : 'TH Sarabun New';
        $fontSize = (int) ($page['font_size_pt'] ?? 16);
        $lineSpacing = (float) ($page['line_spacing'] ?? 1.0);
        $widthCm = (float) ($page['width_cm'] ?? 21.0);
        $heightCm = (float) ($page['height_cm'] ?? 29.7);
        $marginTop = (float) ($page['margin_top_cm'] ?? 1.5);
        $marginBottom = (float) ($page['margin_bottom_cm'] ?? 2.0);
        $marginLeft = (float) ($page['margin_left_cm'] ?? 3.0);
        $marginRight = (float) ($page['margin_right_cm'] ?? 2.0);
        $orientation = ($page['orientation'] ?? 'portrait') === 'landscape' ? 'landscape' : 'portrait';

        $phpWord = new PhpWord();
        $phpWord->setDefaultFontName($fontFamily);
        $phpWord->setDefaultFontSize($fontSize);
        $phpWord->setDefaultParagraphStyle([
            'spaceAfter' => 0,
            'spaceBefore' => 0,
            'lineHeight' => $lineSpacing,
        ]);

        $phpWord->getDocInfo()
            ->setTitle($this->raw($sections, 'subject') ?: 'หนังสือราชการ')
            ->setCreator((string) config('department_data.hospital_name'));

        $section = $phpWord->addSection([
            'orientation' => $orientation,
            'pageSizeW' => Converter::cmToTwip($widthCm),
            'pageSizeH' => Converter::cmToTwip($heightCm),
            'marginTop' => Converter::cmToTwip($marginTop),
            'marginBottom' => Converter::cmToTwip($marginBottom),
            'marginLeft' => Converter::cmToTwip($marginLeft),
            'marginRight' => Converter::cmToTwip($marginRight),
            'headerHeight' => Converter::cmToTwip($marginTop),
        ]);

        match ($kind) {
            'external' => $this->writeExternal($section, $thaiDigits, $sections),
            'order' => $this->writeOrder($section, $thaiDigits, $sections),
            default => $this->writeInternal($section, $thaiDigits, $sections),
        };

        $this->writeCustomBlocks($section, $thaiDigits);

        return $phpWord;
    }

    /**
     * บันทึกข้อความภายใน
     * @param  array<string, array{enabled?: bool, value?: string}>  $sections
     */
    private function writeInternal($section, bool $thaiDigits, array $sections): void
    {
        // ตารางหัวกระดาษ: ครุฑ 1.5 ซม. อยู่ซ้ายบน, คำว่า "บันทึกข้อความ" 29pt อยู่กึ่งกลางบรรทัดเดียวกัน ไม่ทับกัน
        $contentWidthCm = max(5.0, ($this->layoutPage['width_cm'] ?? 21.0) - ($this->layoutPage['margin_left_cm'] ?? 3.0) - ($this->layoutPage['margin_right_cm'] ?? 2.0));
        $sideColWidthCm = 2.5;
        $centerColWidthCm = max(1.0, $contentWidthCm - ($sideColWidthCm * 2));

        $table = $section->addTable([
            'cellMargin' => 0,
            'width' => Converter::cmToTwip($contentWidthCm),
            'unit' => 'dxa',
            'layout' => Table::LAYOUT_FIXED,
        ]);
        $table->addRow(Converter::cmToTwip(1.5));
        $leftCell = $table->addCell(Converter::cmToTwip($sideColWidthCm), $this->plainCell());
        $path = public_path('images/official/garuda.png');
        if (is_file($path)) {
            $leftCell->addImage($path, [
                'width' => Converter::cmToPoint(1.5),
                'height' => Converter::cmToPoint(1.5),
                'alignment' => Jc::LEFT,
            ]);
        }
        $centerCell = $table->addCell(Converter::cmToTwip($centerColWidthCm), $this->plainCell());
        $centerCell->addText('บันทึกข้อความ', $this->unitTitleFont(), $this->center(0));
        $table->addCell(Converter::cmToTwip($sideColWidthCm), $this->plainCell());

        if ($this->isOn($sections, 'agency')) {
            $this->addMeta($section, 'ส่วนราชการ', $this->raw($sections, 'agency'), null, 0, 'agency');
        }

        $this->addNumberAndDate($section, $thaiDigits, $sections, 'document_date');

        if ($this->isOn($sections, 'subject')) {
            $this->addMeta($section, 'เรื่อง', $this->raw($sections, 'subject'), null, self::GAP_BEFORE, 'subject');
        }

        if ($this->isOn($sections, 'addressee')) {
            $this->addMeta($section, 'เรียน', $this->raw($sections, 'addressee'), null, self::GAP_BEFORE, 'addressee');
        }

        $this->addOptionalMeta($section, 'internal', $sections, 'reference', 'อ้างถึง');
        $this->addOptionalMeta($section, 'internal', $sections, 'attachment', 'สิ่งที่ส่งมาด้วย');

        if ($this->shouldPrint('internal', $sections, 'body')) {
            $this->addParagraphs($section, $this->raw($sections, 'body'), 1.0, true, 'body');
        }

        if ($this->shouldPrint('internal', $sections, 'closing')) {
            $this->addParagraphs($section, $this->raw($sections, 'closing'), 1.0, true, 'closing');
        }

        $this->addSignature($section, $sections);
        $this->addCopies($section, 'สำเนาเรียน', $this->visibleText('internal', $sections, 'copies'));
        $this->addContact($section, 'internal', $sections);
    }

    /**
     * หนังสือภายนอก
     * @param  array<string, array{enabled?: bool, value?: string}>  $sections
     */
    private function writeExternal($section, bool $thaiDigits, array $sections): void
    {
        $contentWidthCm = max(5.0, ($this->layoutPage['width_cm'] ?? 21.0) - ($this->layoutPage['margin_left_cm'] ?? 3.0) - ($this->layoutPage['margin_right_cm'] ?? 2.0));

        // ตราครุฑ 3 ซม. วางตรงกลางด้านบนของเอกสารในตารางความสูงคงที่ 3.5 ซม. ป้องกันตัวอักษรทับตราครุฑ
        $path = public_path('images/official/garuda.png');
        if (is_file($path)) {
            $garudaTable = $section->addTable([
                'cellMargin' => 0,
                'width' => Converter::cmToTwip($contentWidthCm),
                'unit' => 'dxa',
                'layout' => Table::LAYOUT_FIXED,
            ]);
            $garudaTable->addRow(Converter::cmToTwip(3.5));
            $garudaCell = $garudaTable->addCell(Converter::cmToTwip($contentWidthCm), $this->plainCell());
            $garudaCell->addImage($path, [
                'height' => Converter::cmToPoint(3.0),
                'alignment' => Jc::CENTER,
            ]);
        }

        $documentNo = $this->isOn($sections, 'document_no')
            ? 'ที่'.self::LABEL_GAP.$this->numberText($sections, $thaiDigits)
            : '';
        $unit = $this->visibleText('external', $sections, 'unit_name');
        $address = $this->visibleText('external', $sections, 'address');
        $lines = $this->formatExternalAddress($address);
        $date = $this->isOn($sections, 'document_date')
            ? $this->dateText($sections, 'document_date', $thaiDigits)
            : '';

        $contentWidthCm = max(5.0, ($this->layoutPage['width_cm'] ?? 21.0) - ($this->layoutPage['margin_left_cm'] ?? 3.0) - ($this->layoutPage['margin_right_cm'] ?? 2.0));
        $leftColWidthCm = round($contentWidthCm * (7.5 / 16.0), 2);
        $rightColWidthCm = max(1.0, $contentWidthCm - $leftColWidthCm);

        if ($documentNo !== '' || $unit !== '' || $lines !== []) {
            $table = $section->addTable([
                'cellMargin' => 0,
                'width' => Converter::cmToTwip($contentWidthCm),
                'unit' => 'dxa',
                'layout' => Table::LAYOUT_FIXED,
            ]);
            $table->addRow();
            $leftCell = $table->addCell(Converter::cmToTwip($leftColWidthCm), $this->plainCell());
            $rightCell = $table->addCell(Converter::cmToTwip($rightColWidthCm), $this->plainCell());
            if ($documentNo !== '') {
                $leftCell->addText($this->applyTextTransform('document_no', $documentNo), $this->resolveFont('document_no'), $this->resolveParagraph('document_no', ['align' => 'right']));
            } else {
                $leftCell->addText('', $this->font(), $this->right());
            }
            if ($unit !== '') {
                $rightCell->addText($this->applyTextTransform('unit_name', $unit), $this->resolveFont('unit_name'), $this->resolveParagraph('unit_name', ['align' => 'left']));
            }
            foreach ($lines as $line) {
                $rightCell->addText($this->applyTextTransform('address', $line), $this->resolveFont('address'), $this->resolveParagraph('address', ['align' => 'left']));
            }
        }

        if ($date !== '') {
            $run = $section->addTextRun([
                'spaceAfter' => 0,
                'spaceBefore' => 0,
                'lineHeight' => 1.0,
                'tabs' => [
                    new Tab('left', Converter::cmToTwip($leftColWidthCm)),
                ],
            ]);
            $run->addText("\t".$this->applyTextTransform('document_date', $date), $this->resolveFont('document_date'));
        }

        if ($this->isOn($sections, 'subject')) {
            $this->addMeta($section, 'เรื่อง', $this->raw($sections, 'subject'), null, self::GAP_BEFORE, 'subject');
        }
        if ($this->isOn($sections, 'addressee')) {
            $this->addMeta($section, 'เรียน', $this->raw($sections, 'addressee'), null, self::GAP_BEFORE, 'addressee');
        }

        $this->addOptionalMeta($section, 'external', $sections, 'reference', 'อ้างถึง');
        $this->addOptionalMeta($section, 'external', $sections, 'attachment', 'สิ่งที่ส่งมาด้วย');

        if ($this->shouldPrint('external', $sections, 'body')) {
            $this->addParagraphs($section, $this->raw($sections, 'body'), 1.0, true, 'body');
        }

        $this->addSignature($section, $sections, $this->visibleText('external', $sections, 'closing'));
        $this->addOwnerBlock($section, $sections);
        $this->addCopies($section, 'สำเนาเรียน', $this->visibleText('external', $sections, 'copies'));
    }

    /**
     * คำสั่ง
     * @param  array<string, array{enabled?: bool, value?: string}>  $sections
     */
    private function writeOrder($section, bool $thaiDigits, array $sections): void
    {
        $contentWidthCm = max(5.0, ($this->layoutPage['width_cm'] ?? 21.0) - ($this->layoutPage['margin_left_cm'] ?? 3.0) - ($this->layoutPage['margin_right_cm'] ?? 2.0));

        // ตราครุฑ 3 ซม. วางตรงกลางด้านบนของเอกสารในตารางความสูงคงที่ 3.5 ซม. เพื่อป้องกันตัวอักษรทับตราครุฑ
        $path = public_path('images/official/garuda.png');
        if (is_file($path)) {
            $table = $section->addTable([
                'cellMargin' => 0,
                'width' => Converter::cmToTwip($contentWidthCm),
                'unit' => 'dxa',
                'layout' => Table::LAYOUT_FIXED,
            ]);
            $table->addRow(Converter::cmToTwip(3.5));
            $cell = $table->addCell(Converter::cmToTwip($contentWidthCm), $this->plainCell());
            $cell->addImage($path, [
                'height' => Converter::cmToPoint(3.0),
                'alignment' => Jc::CENTER,
            ]);
        }

        $unit = $this->visibleText('order', $sections, 'unit_name');
        $heading = 'คำสั่ง'.$unit;
        $headingStyle = $this->resolveParagraph('unit_name', [
            'align' => 'center',
            'lineHeight' => 2.0,
            'spaceBefore' => 0,
            'spaceAfter' => 0,
        ]);
        $section->addText($this->applyTextTransform('unit_name', $heading), $this->memoTitleFont(), $headingStyle);

        if ($this->isOn($sections, 'document_no')) {
            $pStyle = $this->resolveParagraph('document_no', ['align' => 'center', 'lineHeight' => 1.0]);
            $section->addText('ที่ '.self::LABEL_GAP.$this->numberText($sections, $thaiDigits), $this->resolveFont('document_no', ['bold' => true]), $pStyle);
        }

        if ($this->isOn($sections, 'subject')) {
            $pStyle = $this->resolveParagraph('subject', ['align' => 'center', 'lineHeight' => 1.0]);
            $section->addText('เรื่อง '.self::LABEL_GAP.$this->applyTextTransform('subject', $this->raw($sections, 'subject')), $this->resolveFont('subject', ['bold' => true]), $pStyle);
        }

        $section->addText(' ', ['name' => 'TH Sarabun New', 'size' => 8], [
            'alignment' => Jc::CENTER,
            'borderBottomSize' => 12,
            'borderBottomColor' => '000000',
            'spaceBefore' => 0,
            'spaceAfter' => 0,
            'lineHeight' => 1.0,
        ]);

        foreach (['body', 'authority', 'orders'] as $key) {
            if (! $this->shouldPrint('order', $sections, $key)) {
                continue;
            }
            $this->addParagraphs($section, $this->raw($sections, $key), 1.0, true, $key);
        }

        $effective = $this->visibleText('order', $sections, 'effective', $thaiDigits);
        if ($effective !== '') {
            $section->addText('ทั้งนี้ ตั้งแต่ '.self::LABEL_GAP.$effective, $this->font(), [
                'alignment' => Jc::LEFT,
                'spaceAfter' => 0,
                'spaceBefore' => self::GAP_BEFORE,
                'lineHeight' => 1.0,
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

        $contentWidthCm = max(5.0, ($this->layoutPage['width_cm'] ?? 21.0) - ($this->layoutPage['margin_left_cm'] ?? 3.0) - ($this->layoutPage['margin_right_cm'] ?? 2.0));
        $tabPosCm = round($contentWidthCm * (7.5 / 16.0), 2);

        $right = $showDate ? 'วันที่'.self::LABEL_GAP.$this->dateText($sections, $dateKey, $thaiDigits) : null;
        if ($showNo) {
            $this->addMeta($section, 'ที่', $this->numberText($sections, $thaiDigits), $right, 0, 'document_no', $tabPosCm);
            return;
        }

        $this->addMeta($section, 'วันที่', $this->dateText($sections, $dateKey, $thaiDigits), null, 0, $dateKey);
    }

    /**
     * @param  array<string, array{enabled?: bool, value?: string}>  $sections
     */
    private function addOptionalMeta($section, string $kind, array $sections, string $key, string $label): void
    {
        if (! $this->shouldPrint($kind, $sections, $key)) {
            return;
        }

        $this->addMeta($section, $label, $this->raw($sections, $key), null, self::GAP_BEFORE, $key);
    }

    private function addMeta($section, string $label, string $value, ?string $right = null, int $spaceBefore = 0, ?string $key = null, ?float $tabPosCm = null): void
    {
        $paragraph = $this->resolveParagraph($key, [
            'spaceBefore' => $spaceBefore,
            'spaceAfter' => 0,
            'lineHeight' => 1.0,
        ]);
        if ($right !== null && $right !== '') {
            $pos = $tabPosCm !== null ? $tabPosCm : 7.5;
            $paragraph['tabs'] = [
                new Tab('left', Converter::cmToTwip($pos)),
            ];
        }

        $font = $this->resolveFont($key);
        $transformed = $this->applyTextTransform($key, $value);

        $run = $section->addTextRun($paragraph);
        $run->addText($label.self::LABEL_GAP.$transformed, $font);
        if ($right !== null && $right !== '') {
            $run->addText("\t".$right, $this->resolveFont('document_date'));
        }
    }

    private function addParagraphs($section, string $text, float $lineHeight = 1.0, bool $gapBeforeFirst = true, ?string $key = null): void
    {
        $font = $this->resolveFont($key);
        $block = $key !== null ? ($this->blockMap[$key] ?? null) : null;
        $indentCm = isset($block['indent_cm']) ? (float) $block['indent_cm'] : 2.5;

        foreach ($this->lines($text) as $index => $line) {
            $paragraphStyle = $this->resolveParagraph($key, [
                'spaceBefore' => $gapBeforeFirst && $index === 0 ? self::GAP_BEFORE : 0,
                'spaceAfter' => 0,
                'lineHeight' => $lineHeight,
                'indent_cm' => $indentCm,
            ]);
            $transformed = $this->applyTextTransform($key, $line);
            $section->addText($transformed, $font, $paragraphStyle);
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

        $contentWidthCm = max(5.0, ($this->layoutPage['width_cm'] ?? 21.0) - ($this->layoutPage['margin_left_cm'] ?? 3.0) - ($this->layoutPage['margin_right_cm'] ?? 2.0));
        $leftColWidthCm = round($contentWidthCm * (7.5 / 16.0), 2);
        $rightColWidthCm = max(1.0, $contentWidthCm - $leftColWidthCm);

        $section->addTextBreak(1, $this->font());
        $table = $section->addTable([
            'cellMargin' => 0,
        ]);
        $table->addRow();
        $table->addCell(Converter::cmToTwip($leftColWidthCm), $this->plainCell());
        $cell = $table->addCell(Converter::cmToTwip($rightColWidthCm), $this->plainCell());
        $center = ['alignment' => Jc::CENTER, 'spaceAfter' => 0, 'spaceBefore' => 0];

        if ($closing !== '') {
            $cell->addText($this->applyTextTransform('closing', $closing), $this->resolveFont('closing'), $center);
            $cell->addTextBreak(2, $this->font());
        }

        if ($rank !== '') {
            $cell->addText($this->applyTextTransform('signer_rank', $rank), $this->resolveFont('signer_rank'), $center);
        }
        if ($name !== '') {
            $cell->addText($this->parenthesize($this->applyTextTransform('signer_name', $name)), $this->resolveFont('signer_name'), $center);
        }
        if ($position !== '') {
            $cell->addText($this->applyTextTransform('signer_position', $position), $this->resolveFont('signer_position'), $center);
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
     * ทำความสะอาดไฟล์ DOCX ในระดับ XML ก่อนส่งดาวน์โหลด
     * เพื่อให้มั่นใจว่าจะไม่มีเส้นกรอบรอบข้อความหรือตารางหลุดรอดไปใน Microsoft Word
     */
    private function cleanDocxArtifacts(string $filePath): void
    {
        if (! class_exists(\ZipArchive::class)) {
            return;
        }

        $zip = new \ZipArchive();
        if ($zip->open($filePath) !== true) {
            return;
        }

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if (! preg_match('/^word\/(document|header\d*|footer\d*)\.xml$/', $name)) {
                continue;
            }

            $xml = $zip->getFromIndex($i);
            if (! $xml) {
                continue;
            }

            // บังคับ stroked="f" และ filled="f" บน VML Shape ทั้งหมด
            $xml = preg_replace_callback('/<v:shape\b([^>]*)>/', function ($m) {
                $attrs = $m[1];
                if (strpos($attrs, 'stroked="') === false) {
                    $attrs .= ' stroked="f"';
                } else {
                    $attrs = preg_replace('/stroked="[^"]*"/', 'stroked="f"', $attrs);
                }
                if (strpos($attrs, 'filled="') === false) {
                    $attrs .= ' filled="f"';
                }
                return '<v:shape'.$attrs.'>';
            }, $xml);

            // ปิด stroke สำหรับ VML
            $xml = preg_replace('/<v:stroke\b[^>]*\/>/', '<v:stroke on="f"/>', $xml);

            // แปลงเส้นขอบตารางเดี่ยวที่เป็น 0 ให้เป็น w:val="none"
            $xml = preg_replace('/<w:(top|left|right|bottom|insideH|insideV)\b[^>]*w:val="single"[^>]*\/>/', '<w:$1 w:val="none"/>', $xml);
            $xml = preg_replace('/<w:tblBorders\b[^>]*>.*?<\/w:tblBorders>/s', '<w:tblBorders><w:top w:val="none"/><w:left w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/></w:tblBorders>', $xml);
            $xml = preg_replace('/<w:tcBorders\b[^>]*>.*?<\/w:tcBorders>/s', '<w:tcBorders><w:top w:val="none"/><w:left w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tcBorders>', $xml);

            $zip->addFromString($name, $xml);
        }

        $zip->close();
    }

    /**
     * @return list<string>
     */
    private function formatExternalAddress(string $address): array
    {
        $trimmed = trim($address);
        if ($trimmed === '') {
            return [];
        }

        $lines = preg_split("/\r\n|\n|\r/", $trimmed) ?: [];
        $lines = array_values(array_filter(array_map('trim', $lines), fn ($line) => $line !== ''));
        if (count($lines) <= 1) {
            $single = $lines[0] ?? $trimmed;
            $parts = preg_split('/(?=(?:ตำบล|ต\.|อำเภอ|อ\.|จังหวัด|จ\.))/u', $single) ?: [];
            $lines = array_values(array_filter(array_map('trim', $parts), fn ($line) => $line !== ''));
        }

        $postal = null;
        $normalized = [];
        foreach ($lines as $line) {
            if (preg_match('/^(.*?)(?:\s+)(\d{5})$/u', $line, $matches)) {
                $line = trim($matches[1]);
                $postal = $matches[2];
            } elseif (preg_match('/^(\d{5})$/u', $line)) {
                $postal = $line;
                continue;
            }
            $normalized[] = $line;
        }

        if ($postal !== null) {
            $provinceIndex = null;
            foreach ($normalized as $index => $line) {
                if (preg_match('/^(จังหวัด|จ\.)/u', $line)) {
                    $provinceIndex = $index;
                }
            }
            if ($provinceIndex !== null) {
                $normalized[$provinceIndex] = rtrim($normalized[$provinceIndex]).' '.$postal;
            } else {
                $normalized[] = $postal;
            }
        }

        return $normalized;
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
        return $this->resolveFont(null, [
            'name' => $this->layoutPage['font_family'] ?? 'TH Sarabun New',
            'size' => (int) ($this->layoutPage['font_size_pt'] ?? 16),
        ]);
    }

    /**
     * @return array<string, int|string|bool>
     */
    private function boldFont(): array
    {
        return $this->resolveFont(null, [
            'name' => $this->layoutPage['font_family'] ?? 'TH Sarabun New',
            'size' => (int) ($this->layoutPage['font_size_pt'] ?? 16),
            'bold' => true,
        ]);
    }

    /**
     * @return array<string, int|string|bool>
     */
    private function memoTitleFont(): array
    {
        return $this->resolveFont('title', [
            'name' => $this->layoutPage['font_family'] ?? 'TH Sarabun New',
            'size' => 20,
            'bold' => true,
        ]);
    }

    /**
     * @return array<string, int|string|bool>
     */
    private function unitTitleFont(): array
    {
        return $this->resolveFont('title', [
            'name' => $this->layoutPage['font_family'] ?? 'TH Sarabun New',
            'size' => 29,
            'bold' => true,
        ]);
    }

    /**
     * @param array<string, mixed> $defaults
     * @return array<string, mixed>
     */
    private function resolveFont(?string $key = null, array $defaults = []): array
    {
        $block = $key !== null ? ($this->blockMap[$key] ?? null) : null;
        $name = ! empty($block['font_family'])
            ? $block['font_family']
            : ($defaults['name'] ?? (! empty($this->layoutPage['font_family']) ? $this->layoutPage['font_family'] : 'TH Sarabun New'));
        $size = isset($block['font_pt'])
            ? (int) $block['font_pt']
            : ($defaults['size'] ?? (! empty($this->layoutPage['font_size_pt']) ? (int) $this->layoutPage['font_size_pt'] : 16));
        $bold = isset($block['bold']) ? (bool) $block['bold'] : ($defaults['bold'] ?? false);
        $italic = isset($block['italic']) ? (bool) $block['italic'] : ($defaults['italic'] ?? false);
        $underline = (isset($block['underline']) && $block['underline']) ? 'single' : ($defaults['underline'] ?? 'none');

        $font = [
            'name' => $name,
            'size' => $size,
        ];
        if ($bold) {
            $font['bold'] = true;
        }
        if ($italic) {
            $font['italic'] = true;
        }
        if ($underline !== 'none') {
            $font['underline'] = $underline;
        }

        return $font;
    }

    /**
     * @param array<string, mixed> $defaults
     * @return array<string, mixed>
     */
    private function resolveParagraph(?string $key = null, array $defaults = []): array
    {
        $block = $key !== null ? ($this->blockMap[$key] ?? null) : null;
        $align = $block['align'] ?? ($defaults['align'] ?? 'left');
        $alignment = match ($align) {
            'center' => Jc::CENTER,
            'right' => Jc::RIGHT,
            'justify' => Jc::BOTH,
            default => Jc::LEFT,
        };

        $lineHeight = isset($block['line_height'])
            ? (float) $block['line_height']
            : ($defaults['lineHeight'] ?? (isset($this->layoutPage['line_spacing']) ? (float) $this->layoutPage['line_spacing'] : 1.0));

        $spaceBefore = isset($block['space_before_pt']) && $block['space_before_pt'] > 0
            ? (int) Converter::pointToTwip($block['space_before_pt'])
            : ($defaults['spaceBefore'] ?? 0);

        $spaceAfter = isset($block['space_after_pt']) && $block['space_after_pt'] > 0
            ? (int) Converter::pointToTwip($block['space_after_pt'])
            : ($defaults['spaceAfter'] ?? 0);

        $p = [
            'alignment' => $alignment,
            'spaceBefore' => $spaceBefore,
            'spaceAfter' => $spaceAfter,
            'lineHeight' => $lineHeight,
        ];

        if (isset($block['indent_cm']) && $block['indent_cm'] > 0) {
            $p['indentation'] = ['firstLine' => Converter::cmToTwip($block['indent_cm'])];
        } elseif (isset($defaults['indent_cm']) && $defaults['indent_cm'] > 0) {
            $p['indentation'] = ['firstLine' => Converter::cmToTwip($defaults['indent_cm'])];
        }

        return $p;
    }

    private function applyTextTransform(?string $key, string $text): string
    {
        if ($key === null || $text === '') {
            return $text;
        }
        $block = $this->blockMap[$key] ?? null;
        $transform = $block['text_transform'] ?? 'none';
        return match ($transform) {
            'uppercase' => mb_strtoupper($text, 'UTF-8'),
            'lowercase' => mb_strtolower($text, 'UTF-8'),
            'capitalize' => mb_convert_case($text, MB_CASE_TITLE, 'UTF-8'),
            default => $text,
        };
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
    private function right(): array
    {
        return ['alignment' => Jc::RIGHT, 'spaceAfter' => 0, 'spaceBefore' => 0];
    }

    /**
     * @return array<string, int|string>
     */
    private function plainCell(): array
    {
        return [
            'borderTopStyle' => 'none',
            'borderRightStyle' => 'none',
            'borderBottomStyle' => 'none',
            'borderLeftStyle' => 'none',
        ];
    }

    /**
     * เขียนกล่องข้อความและเส้นคั่นเพิ่มเติมที่ผู้ใช้สร้างอิสระ
     * @param  \PhpOffice\PhpWord\Element\Section  $section
     */
    private function writeCustomBlocks($section, bool $thaiDigits): void
    {
        $customBlocks = array_filter($this->layoutBlocks, function ($b) {
            $role = $b['role'] ?? '';
            $id = $b['id'] ?? '';
            return ($role === 'static' && $id !== 'title') || $role === 'rule';
        });

        if (empty($customBlocks)) {
            return;
        }

        // เรียงตามแกน Y (y_cm) จากบนลงล่าง
        usort($customBlocks, fn ($a, $b) => ($a['y_cm'] ?? 0) <=> ($b['y_cm'] ?? 0));

        foreach ($customBlocks as $block) {
            if (($block['role'] ?? '') === 'rule') {
                $lineColor = str_replace('#', '', (string) ($block['color'] ?? '000000'));
                $lineWidth = max(6, (int) round(((float) ($block['line_width_pt'] ?? 1.0)) * 8));
                $section->addText(' ', ['name' => 'TH Sarabun New', 'size' => 4], [
                    'borderBottomSize' => $lineWidth,
                    'borderBottomColor' => $lineColor,
                    'spaceBefore' => Converter::pointToTwip((float) ($block['space_before_pt'] ?? 4)),
                    'spaceAfter' => Converter::pointToTwip((float) ($block['space_after_pt'] ?? 6)),
                ]);
                continue;
            }

            $rawText = trim((string) ($block['text'] ?? ''));
            if ($rawText === '') {
                continue;
            }

            $text = $thaiDigits ? $this->thaiDigits($rawText) : $rawText;
            $font = [
                'name' => (string) ($block['font_family'] ?? ($this->layoutPage['font_family'] ?? 'TH Sarabun New')),
                'size' => (int) ($block['font_pt'] ?? ($this->layoutPage['font_size_pt'] ?? 16)),
                'bold' => ! empty($block['bold']),
                'italic' => ! empty($block['italic']),
                'underline' => ! empty($block['underline']) ? 'single' : 'none',
            ];
            if (! empty($block['color'])) {
                $font['color'] = str_replace('#', '', (string) $block['color']);
            }

            $align = match ($block['align'] ?? 'left') {
                'center' => Jc::CENTER,
                'right' => Jc::RIGHT,
                'justify' => Jc::BOTH,
                default => Jc::LEFT,
            };

            $paragraph = [
                'alignment' => $align,
                'spaceBefore' => Converter::pointToTwip((float) ($block['space_before_pt'] ?? 0)),
                'spaceAfter' => Converter::pointToTwip((float) ($block['space_after_pt'] ?? 0)),
                'lineHeight' => (float) ($block['line_height'] ?? ($this->layoutPage['line_spacing'] ?? 1.0)),
            ];

            if (! empty($block['indent_cm'])) {
                $paragraph['indentation'] = ['firstLine' => Converter::cmToTwip((float) $block['indent_cm'])];
            }

            $lines = explode("\n", $text);
            foreach ($lines as $line) {
                $section->addText($line, $font, $paragraph);
            }
        }
    }
}
