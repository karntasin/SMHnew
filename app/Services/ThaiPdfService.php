<?php

namespace App\Services;

class ThaiPdfService
{
    /** @return array{0: string, 1: string} */
    public function fontUris(string $family = 'sarabun'): array
    {
        [$regularPath, $boldPath] = $this->fontPaths($family);

        return [
            'file://'.str_replace('\\', '/', realpath($regularPath) ?: $regularPath),
            'file://'.str_replace('\\', '/', realpath($boldPath) ?: $boldPath),
        ];
    }

    public function render(string $html, string $orientation = 'landscape', bool|string $pageNumbers = false, string $fontFamily = 'sarabun'): string
    {
        if (! class_exists(\Dompdf\Dompdf::class)) {
            throw new \RuntimeException('PDF library not installed (dompdf/dompdf)');
        }

        $fontSourceDir = resource_path('fonts');
        $fontCacheDir = storage_path('fonts');

        foreach ([$fontSourceDir, $fontCacheDir] as $dir) {
            if (! is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        }

        [$regularPath, $boldPath] = $this->fontPaths($fontFamily);
        $family = $this->resolvedFamily($fontFamily);

        $options = new \Dompdf\Options();
        $options->set('isRemoteEnabled', false);
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isFontSubsettingEnabled', true);
        $options->set('defaultFont', $family);
        $options->set('dpi', $family === 'thsarabunnew' ? 96 : 84);
        $options->set('fontDir', $fontCacheDir);
        $options->set('fontCache', $fontCacheDir);
        $options->setChroot([base_path(), $fontSourceDir, $fontCacheDir]);

        $dompdf = new \Dompdf\Dompdf($options);
        $fontMetrics = $dompdf->getFontMetrics();
        $this->registerFont($fontMetrics, $regularPath, 'normal', $family);
        $this->registerFont($fontMetrics, $boldPath, 'bold', $family);

        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4', in_array($orientation, ['portrait', 'landscape'], true) ? $orientation : 'landscape');
        $dompdf->render();

        if ($pageNumbers === 'clerical') {
            $this->drawClericalPageNumbers($dompdf, $family);
        } elseif ($pageNumbers) {
            $canvas = $dompdf->getCanvas();
            $font = $fontMetrics->getFont($family, 'normal');
            $width = $canvas->get_width();
            $height = $canvas->get_height();
            $canvas->page_text(
                $width - 92,
                $height - 18,
                'หน้า {PAGE_NUM} จาก {PAGE_COUNT}',
                $font,
                8,
                [0.39, 0.45, 0.55]
            );
        }

        return $dompdf->output();
    }

    private function drawClericalPageNumbers(\Dompdf\Dompdf $dompdf, string $family): void
    {
        $canvas = $dompdf->getCanvas();
        $cm = 72 / 2.54;
        $digits = ['0' => '๐', '1' => '๑', '2' => '๒', '3' => '๓', '4' => '๔', '5' => '๕', '6' => '๖', '7' => '๗', '8' => '๘', '9' => '๙'];

        $canvas->page_script(function ($pageNumber, $pageCount, $pdf, $fontMetrics) use ($family, $cm, $digits) {
            if ((int) $pageNumber < 2) {
                return;
            }

            $label = strtr((string) $pageNumber, $digits);
            $font = $fontMetrics->getFont($family, 'normal');
            $size = 16;
            $textWidth = $pdf->get_text_width($label, $font, $size);
            $x = $pdf->get_width() - (2 * $cm) - $textWidth;
            $y = 1.2 * $cm;
            $pdf->text($x, $y, $label, $font, $size);
        });
    }

    /** @return array{0: string, 1: string} */
    private function fontPaths(string $family): array
    {
        $dir = resource_path('fonts');

        if (in_array($family, ['thsarabunnew', 'THSarabunNew', 'sarabunnew'], true)) {
            $regular = $dir.DIRECTORY_SEPARATOR.'THSarabunNew.ttf';
            $bold = $dir.DIRECTORY_SEPARATOR.'THSarabunNew-Bold.ttf';
            if (file_exists($regular) && file_exists($bold)) {
                return [$regular, $bold];
            }
        }

        $regular = $dir.DIRECTORY_SEPARATOR.'Sarabun-Regular.ttf';
        $bold = $dir.DIRECTORY_SEPARATOR.'Sarabun-Bold.ttf';

        if (! file_exists($regular) || ! file_exists($bold)) {
            throw new \RuntimeException('Thai fonts missing in resources/fonts');
        }

        return [$regular, $bold];
    }

    private function resolvedFamily(string $family): string
    {
        if (in_array($family, ['thsarabunnew', 'THSarabunNew', 'sarabunnew'], true)) {
            $dir = resource_path('fonts');
            if (file_exists($dir.DIRECTORY_SEPARATOR.'THSarabunNew.ttf')) {
                return 'thsarabunnew';
            }
        }

        return 'sarabun';
    }

    private function registerFont(\Dompdf\FontMetrics $fontMetrics, string $path, string $weight, string $family = 'sarabun'): void
    {
        $fontMetrics->registerFont(
            ['family' => $family, 'style' => 'normal', 'weight' => $weight],
            'file://'.str_replace('\\', '/', realpath($path) ?: $path)
        );
    }
}
