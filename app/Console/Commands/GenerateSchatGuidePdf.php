<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class GenerateSchatGuidePdf extends Command
{
    protected $signature = 'schat:guide-pdf {--html-only : Generate HTML only without PDF conversion}';

    protected $description = 'Generate S-Chat mobile user guide PDF (iOS + Android)';

    public function handle(): int
    {
        $docsDir = public_path('docs');
        $storageDir = storage_path('app/docs');
        $imageDir = storage_path('app/docs/schat-guide');

        // Fallback when Laravel CLI PHP is too old: node scripts/generate-schat-guide.mjs
        File::ensureDirectoryExists($docsDir);
        File::ensureDirectoryExists($storageDir);
        File::ensureDirectoryExists($imageDir);

        $logoPath = $imageDir.DIRECTORY_SEPARATOR.'logo.png';
        $logoDataUri = null;
        if (file_exists($logoPath)) {
            $logoDataUri = 'data:image/png;base64,'.base64_encode((string) file_get_contents($logoPath));
        }

        $imageKeys = [
            'android-install' => ['android-install.jpg', 'android-install.png'],
            'ios-install' => ['ios-install.jpg', 'ios-install.png'],
            'feature-groups' => ['feature-groups.jpg', 'feature-groups.png'],
            'feature-unsend' => ['feature-unsend.jpg', 'feature-unsend.png'],
            'feature-stickers' => ['feature-stickers.jpg', 'feature-stickers.png'],
        ];

        $images = [];
        foreach ($imageKeys as $key => $candidates) {
            foreach ($candidates as $filename) {
                $path = $imageDir.DIRECTORY_SEPARATOR.$filename;
                if (! file_exists($path)) {
                    continue;
                }
                $mime = str_ends_with(strtolower($filename), '.png') ? 'image/png' : 'image/jpeg';
                $images[$key] = 'data:'.$mime.';base64,'.base64_encode((string) file_get_contents($path));
                break;
            }
        }

        $chatUrl = rtrim((string) config('services.organization_chat.public_url', env('ORGANIZATION_CHAT_URL', '')), '/');
        if ($chatUrl === '') {
            $chatUrl = null;
        }

        $html = view('docs.schat-user-guide', [
            'logoDataUri' => $logoDataUri,
            'images' => $images,
            'version' => '1.1',
            'generatedAt' => now()->timezone('Asia/Bangkok')->format('d/m/Y'),
            'chatUrl' => $chatUrl,
        ])->render();

        $htmlPath = $storageDir.DIRECTORY_SEPARATOR.'schat-user-guide.html';
        $pdfAsciiPath = $docsDir.DIRECTORY_SEPARATOR.'S-Chat-user-guide.pdf';
        $pdfPath = $docsDir.DIRECTORY_SEPARATOR.'S-Chat-คู่มือการใช้งาน.pdf';

        File::put($htmlPath, $html);
        $this->info("HTML saved: {$htmlPath}");

        if ($this->option('html-only')) {
            File::copy($htmlPath, $docsDir.DIRECTORY_SEPARATOR.'schat-user-guide.html');
            $this->info('Done (HTML only).');

            return self::SUCCESS;
        }

        $chrome = $this->findChrome();
        if (! $chrome) {
            $this->error('Google Chrome not found. Install Chrome or use --html-only');
            $this->line('Or run: node scripts/generate-schat-guide.mjs');
            $this->line('HTML file is available at: '.$htmlPath);

            return self::FAILURE;
        }

        $htmlUrl = 'file:///'.str_replace('\\', '/', $htmlPath);
        $cmd = sprintf(
            '"%s" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="%s" "%s" 2>&1',
            $chrome,
            $pdfAsciiPath,
            $htmlUrl
        );

        $this->info('Generating PDF with Chrome...');
        exec($cmd, $output, $exitCode);

        if ($exitCode !== 0 || ! File::exists($pdfAsciiPath)) {
            $this->error('PDF generation failed.');
            $this->line(implode("\n", $output));
            $this->line('Fallback: node scripts/generate-schat-guide.mjs');

            return self::FAILURE;
        }

        File::copy($pdfAsciiPath, $pdfPath);
        $size = round(File::size($pdfPath) / 1024);
        $this->info("PDF created: {$pdfPath} ({$size} KB)");

        return self::SUCCESS;
    }

    private function findChrome(): ?string
    {
        $paths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            getenv('LOCALAPPDATA').'\\Google\\Chrome\\Application\\chrome.exe',
            '/usr/bin/google-chrome',
            '/usr/bin/chromium-browser',
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        ];

        foreach ($paths as $path) {
            if ($path && file_exists($path)) {
                return $path;
            }
        }

        return null;
    }
}
