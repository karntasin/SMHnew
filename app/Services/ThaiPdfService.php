<?php

namespace App\Services;

class ThaiPdfService
{
    /** @return array{0: string, 1: string} */
    public function fontUris(): array
    {
        $fontSourceDir = resource_path('fonts');
        $regularPath = $fontSourceDir.DIRECTORY_SEPARATOR.'Sarabun-Regular.ttf';
        $boldPath = $fontSourceDir.DIRECTORY_SEPARATOR.'Sarabun-Bold.ttf';

        if (! file_exists($regularPath) || ! file_exists($boldPath)) {
            throw new \RuntimeException('Thai fonts missing in resources/fonts');
        }

        return [
            'file://'.str_replace('\\', '/', realpath($regularPath) ?: $regularPath),
            'file://'.str_replace('\\', '/', realpath($boldPath) ?: $boldPath),
        ];
    }

    public function render(string $html): string
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

        $regularPath = $fontSourceDir.DIRECTORY_SEPARATOR.'Sarabun-Regular.ttf';
        $boldPath = $fontSourceDir.DIRECTORY_SEPARATOR.'Sarabun-Bold.ttf';

        $options = new \Dompdf\Options();
        $options->set('isRemoteEnabled', false);
        $options->set('defaultFont', 'sarabun');
        $options->set('fontDir', $fontCacheDir);
        $options->set('fontCache', $fontCacheDir);
        $options->setChroot([base_path(), $fontSourceDir, $fontCacheDir]);

        $dompdf = new \Dompdf\Dompdf($options);
        $fontMetrics = $dompdf->getFontMetrics();
        $this->registerFont($fontMetrics, $regularPath, 'normal');
        $this->registerFont($fontMetrics, $boldPath, 'bold');

        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4', 'landscape');
        $dompdf->render();

        return $dompdf->output();
    }

    private function registerFont(\Dompdf\FontMetrics $fontMetrics, string $path, string $weight): void
    {
        $fontMetrics->registerFont(
            ['family' => 'sarabun', 'style' => 'normal', 'weight' => $weight],
            'file://'.str_replace('\\', '/', realpath($path) ?: $path)
        );
    }
}
