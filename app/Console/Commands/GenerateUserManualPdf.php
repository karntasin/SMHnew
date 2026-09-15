<?php

namespace App\Console\Commands;

use App\Data\UserGuideData;
use App\Models\SettingApp;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class GenerateUserManualPdf extends Command
{
    protected $signature = 'guide:pdf {--html-only : Generate HTML only without PDF conversion} {--skip-screenshots : Skip capturing screenshots}';

    protected $description = 'Generate user manual PDF with illustrations';

    public function handle(): int
    {
        $docsDir = public_path('docs');
        $storageDir = storage_path('app/docs');

        File::ensureDirectoryExists($docsDir);
        File::ensureDirectoryExists($storageDir);

        if (! $this->option('skip-screenshots')) {
            $this->info('Capturing screenshots from app...');
            $nodeScript = base_path('scripts/capture-guide-screenshots.mjs');
            $appUrl = config('app.url');
            $cmd = sprintf('node "%s"', $nodeScript);
            putenv('APP_URL='.$appUrl);
            exec($cmd, $shotOutput, $shotExit);
            foreach ($shotOutput as $line) {
                $this->line($line);
            }
            if ($shotExit !== 0) {
                $this->warn('Screenshot capture had errors — PDF will use fallback illustrations where needed.');
            }
        }

        $setting = SettingApp::first();
        $appName = $setting?->nama_app ?? UserGuideData::appName();
        $logoDataUri = null;

        if ($setting?->logo && file_exists(public_path('storage/'.$setting->logo))) {
            $logoPath = public_path('storage/'.$setting->logo);
            $mime = mime_content_type($logoPath) ?: 'image/png';
            $logoDataUri = 'data:'.$mime.';base64,'.base64_encode(file_get_contents($logoPath));
        }

        $modules = UserGuideData::modulesEnriched();
        $screenshotDir = storage_path('app/docs/screenshots');
        $screenshotCount = count(glob($screenshotDir.DIRECTORY_SEPARATOR.'*.png') ?: []);

        $dashboardShot = null;
        $dashPath = $screenshotDir.DIRECTORY_SEPARATOR.'dashboard.png';
        if (file_exists($dashPath)) {
            $dashboardShot = 'data:image/png;base64,'.base64_encode(file_get_contents($dashPath));
        }

        $galleryScreenshots = [
            ['name' => 'dashboard', 'label' => 'แดชบอร์ด', 'fallback' => 'dashboard'],
            ['name' => 'quality', 'label' => 'ศูนย์พัฒนาคุณภาพ', 'fallback' => 'dashboard'],
            ['name' => 'ic', 'label' => 'IC', 'fallback' => 'dashboard'],
            ['name' => 'mra', 'label' => 'MRA', 'fallback' => 'dashboard'],
            ['name' => 'maintenance', 'label' => 'แจ้งซ่อม', 'fallback' => 'dashboard'],
            ['name' => 'vehicles', 'label' => 'จองรถ', 'fallback' => 'dashboard'],
            ['name' => 'documents', 'label' => 'หนังสือราชการ', 'fallback' => 'dashboard'],
            ['name' => 'rooms', 'label' => 'จองห้อง', 'fallback' => 'dashboard'],
            ['name' => 'km', 'label' => 'ความรู้', 'fallback' => 'dashboard'],
            ['name' => 'elearning', 'label' => 'อบรม', 'fallback' => 'dashboard'],
            ['name' => 'hosxp-reports', 'label' => 'รายงาน HOSxP', 'fallback' => 'dashboard'],
            ['name' => 'admin-hub', 'label' => 'ธุรการ', 'fallback' => 'dashboard'],
            ['name' => 'env', 'label' => 'ENV', 'fallback' => 'dashboard'],
            ['name' => 'notifications', 'label' => 'แจ้งเตือน', 'fallback' => 'notification'],
            ['name' => 'users', 'label' => 'ผู้ใช้', 'fallback' => 'login'],
            ['name' => 'help', 'label' => 'คู่มือ', 'fallback' => 'sidebar'],
        ];

        $html = view('docs.user-manual', [
            'appName' => $appName,
            'logoDataUri' => $logoDataUri,
            'dashboardShot' => $dashboardShot,
            'screenshotCount' => $screenshotCount ?: '40+',
            'moduleCount' => count($modules),
            'galleryScreenshots' => $galleryScreenshots,
            'version' => '2.1',
            'generatedAt' => now()->timezone('Asia/Bangkok')->format('d/m/Y'),
            'quickStart' => UserGuideData::quickStart(),
            'categories' => UserGuideData::categories(),
            'modules' => $modules,
            'faq' => UserGuideData::faq(),
        ])->render();

        $htmlPath = $storageDir.DIRECTORY_SEPARATOR.'user-manual.html';
        $pdfPath = $docsDir.DIRECTORY_SEPARATOR.'SMH-คู่มือการใช้งาน.pdf';

        File::put($htmlPath, $html);
        $this->info("HTML saved: {$htmlPath}");

        if ($this->option('html-only')) {
            File::copy($htmlPath, $docsDir.DIRECTORY_SEPARATOR.'user-manual.html');
            $this->info('Done (HTML only).');

            return self::SUCCESS;
        }

        $chrome = $this->findChrome();
        if (! $chrome) {
            $this->error('Google Chrome not found. Install Chrome or use --html-only');
            $this->line('HTML file is available at: '.$htmlPath);

            return self::FAILURE;
        }

        $htmlUrl = 'file:///'.str_replace('\\', '/', $htmlPath);
        $cmd = sprintf(
            '"%s" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="%s" "%s" 2>&1',
            $chrome,
            $pdfPath,
            $htmlUrl
        );

        $this->info('Generating PDF with Chrome...');
        exec($cmd, $output, $exitCode);

        if ($exitCode !== 0 || ! File::exists($pdfPath)) {
            $this->error('PDF generation failed.');
            $this->line(implode("\n", $output));

            return self::FAILURE;
        }

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
