<?php

namespace App\Services\Rcm;

use App\Services\Finance\CgdEclaimNhsoPortalService;
use App\Services\Finance\CgdStmImportService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class RcmHistoricalSyncService
{
    private const THAI_MONTHS = [
        1 => 'มกราคม', 2 => 'กุมภาพันธ์', 3 => 'มีนาคม', 4 => 'เมษายน',
        5 => 'พฤษภาคม', 6 => 'มิถุนายน', 7 => 'กรกฎาคม', 8 => 'สิงหาคม',
        9 => 'กันยายน', 10 => 'ตุลาคม', 11 => 'พฤศจิกายน', 12 => 'ธันวาคม',
    ];

    private const THAI_SHORT_MONTHS = [
        1 => 'ม.ค.', 2 => 'ก.พ.', 3 => 'มี.ค.', 4 => 'เม.ย.',
        5 => 'พ.ค.', 6 => 'มิ.ย.', 7 => 'ก.ค.', 8 => 'ส.ค.',
        9 => 'ก.ย.', 10 => 'ต.ค.', 11 => 'พ.ย.', 12 => 'ธ.ค.',
    ];

    public function __construct(
        protected readonly CgdEclaimNhsoPortalService $portalService,
        protected readonly CgdStmImportService $stmImporter,
    ) {}

    /**
     * คำนวณจำนวนเดือนจาก baseDate ย้อนหลังกลับไปถึง มกราคม 2567 (2024-01-01) แบบไดนามิก
     */
    public static function getMonthsCountToJan2024(?Carbon $baseDate = null): int
    {
        $base = $baseDate ? $baseDate->copy() : now();
        return max(1, ($base->year - 2024) * 12 + $base->month);
    }

    /**
     * ดึงรายการรอบเดือนย้อนหลัง N เดือน (ค่าเริ่มต้น 6 เดือน) หรือระบุวันที่เริ่มต้น
     *
     * @return list<array{year: int, year_th: int, month: int, month_label: string, short_label: string, key: string}>
     */
    public function getMonthList(?Carbon $baseDate = null, int $monthsCount = 6, ?string $startDate = null): array
    {
        $base = $baseDate ? $baseDate->copy() : now();

        if ($startDate !== null) {
            $start = Carbon::parse($startDate)->startOfMonth();
            $monthsCount = max(1, ($base->year - $start->year) * 12 + ($base->month - $start->month) + 1);
        }

        $list = [];

        for ($i = 0; $i < $monthsCount; $i++) {
            $date = $base->copy()->subMonths($i);
            $year = (int) $date->year;
            $month = (int) $date->month;
            $yearTh = $year + 543;
            $shortYearTh = substr((string) $yearTh, -2);

            $list[] = [
                'year' => $year,
                'year_th' => $yearTh,
                'month' => $month,
                'month_label' => self::THAI_MONTHS[$month] . ' ' . $yearTh,
                'short_label' => self::THAI_SHORT_MONTHS[$month] . ' ' . $shortYearTh,
                'key' => sprintf('%04d-%02d', $year, $month),
            ];
        }

        return $list;
    }

    /**
     * ตรวจสอบและสแกนรายการไฟล์ Statement ย้อนหลัง (รองรับถึง 1 ม.ค. 67 / 35 เดือน)
     */
    public function verifyHistoricalMonths(string $scheme = 'cgd', int|string $monthsCount = 6, ?string $startDate = null): array
    {
        @set_time_limit(300);

        if ($monthsCount === 'since_jan_2567' || $startDate === '2024-01-01' || $startDate === '2024-01') {
            $monthsCount = self::getMonthsCountToJan2024();
            $startDate = '2024-01-01';
        } else {
            $monthsCount = (int) $monthsCount ?: 6;
        }

        $allowedSchemes = array_keys(config('claim_schemes', ['cgd' => [], 'lgo' => [], 'ucs' => []]));
        $scheme = in_array(strtolower($scheme), $allowedSchemes, true) ? strtolower($scheme) : 'cgd';
        $portal = $this->portalService->forScheme($scheme);

        if (! $portal->isConfigured()) {
            return [
                'success' => false,
                'requires_config' => true,
                'message' => 'ยังไม่ได้ตั้งค่า CGD_ECLAIM_USERNAME / PASSWORD ในไฟล์ .env',
            ];
        }

        // หากยังไม่ได้ authenticate ตรวจสอบและเริ่ม login อัตโนมัติเพื่อขอ OTP
        if (! $portal->isAuthenticated()) {
            try {
                $loginRes = $portal->startLogin(now()->year, now()->month);
                if (in_array($loginRes['status'] ?? '', ['awaiting_otp', 'configure_totp'])) {
                    return [
                        'success' => false,
                        'requires_otp' => true,
                        'message' => 'ระบบ e-Claim รอการยืนยันตัวตน 2FA กรุณากรอกรหัส OTP 6 หลัก',
                        'session' => $loginRes['session'] ?? null,
                    ];
                }
            } catch (\Throwable $loginEx) {
                return [
                    'success' => false,
                    'requires_otp' => true,
                    'message' => 'กรุณาเข้าสู่ระบบและยืนยันตัวตน e-Claim 2FA ก่อนเริ่มดึงข้อมูล: ' . $loginEx->getMessage(),
                ];
            }
        }

        $monthList = $this->getMonthList(null, (int) $monthsCount, $startDate);
        $scannedMonths = [];
        $totalFiles = 0;
        $totalDownloaded = 0;
        $totalPending = 0;
        $allPendingItems = [];

        foreach ($monthList as $m) {
            $year = $m['year'];
            $month = $m['month'];

            try {
                $cacheKey = "rcm_hist_scan_{$scheme}_{$year}_{$month}";
                if (Cache::has($cacheKey) && ($year < now()->year || ($year === now()->year && $month < now()->month))) {
                    $scanResult = Cache::get($cacheKey);
                } else {
                    $scanResult = $portal->scanFiles($year, $month);
                    if (($scanResult['new_files'] ?? 0) === 0 && ($scanResult['existing_files'] ?? 0) > 0) {
                        Cache::put($cacheKey, $scanResult, 86400); // แคช 1 วันสำหรับเดือนที่ดาวน์โหลดครบแล้ว
                    }
                }
                $files = $scanResult['files'] ?? [];
                $monthAllowed = count($files);
                $monthExisting = $scanResult['existing_files'] ?? 0;
                $monthNew = $scanResult['new_files'] ?? 0;

                $pendingFiles = [];
                foreach ($files as $f) {
                    if (empty($f['already_downloaded'])) {
                        $pendingFiles[] = $f;
                        $allPendingItems[] = [
                            'year' => $year,
                            'month' => $month,
                            'month_label' => $m['month_label'],
                            'filename' => $f['filename'],
                            'url' => $f['url'],
                        ];
                    }
                }

                $totalFiles += $monthAllowed;
                $totalDownloaded += $monthExisting;
                $totalPending += $monthNew;

                $scannedMonths[] = [
                    'year' => $year,
                    'year_th' => $m['year_th'],
                    'month' => $month,
                    'month_label' => $m['month_label'],
                    'short_label' => $m['short_label'],
                    'key' => $m['key'],
                    'total_files' => $monthAllowed,
                    'downloaded_files' => $monthExisting,
                    'pending_files' => $monthNew,
                    'status' => $monthAllowed === 0 ? 'empty' : ($monthNew === 0 ? 'complete' : 'pending'),
                    'files' => $files,
                ];
            } catch (\Throwable $e) {
                $msg = $e->getMessage();
                // หากติด OTP หรือ session หมดอายุ ให้ส่งสัญญาณแจ้งเตือนทันที
                if (
                    str_contains($msg, 'กรอก OTP') ||
                    str_contains($msg, 'login') ||
                    str_contains($msg, 'session การเชื่อมต่อ') ||
                    str_contains($msg, 'เข้าสู่ระบบ')
                ) {
                    return [
                        'success' => false,
                        'requires_otp' => true,
                        'message' => 'ระบบ e-Claim จำเป็นต้องยืนยันตัวตน 2FA กรุณากรอกรหัส OTP 6 หลัก',
                    ];
                }

                $scannedMonths[] = [
                    'year' => $year,
                    'year_th' => $m['year_th'],
                    'month' => $month,
                    'month_label' => $m['month_label'],
                    'short_label' => $m['short_label'],
                    'key' => $m['key'],
                    'total_files' => 0,
                    'downloaded_files' => 0,
                    'pending_files' => 0,
                    'status' => 'error',
                    'error' => $e->getMessage(),
                    'files' => [],
                ];
            }
        }

        $summary = [
            'scheme' => $scheme,
            'months_count' => $monthsCount,
            'total_files' => $totalFiles,
            'already_downloaded' => $totalDownloaded,
            'pending_download' => $totalPending,
            'months' => $scannedMonths,
            'scanned_at' => now()->toDateTimeString(),
        ];

        // บันทึกผลการสแกนลง Cache
        Cache::put($this->scanCacheKey($scheme), $summary, 1800);

        // กำหนดรายการคิวเริ่มต้นสำหรับการทยอยโหลด
        $queueState = [
            'scheme' => $scheme,
            'status' => $totalPending > 0 ? 'ready' : 'completed',
            'total_files' => count($allPendingItems),
            'processed_files' => 0,
            'percent' => $totalPending === 0 ? 100 : 0,
            'pending_items' => $allPendingItems,
            'completed_items' => [],
            'failed_items' => [],
            'current_file' => null,
            'current_month' => null,
            'started_at' => null,
            'updated_at' => now()->toIso8601String(),
        ];
        Cache::put($this->queueCacheKey($scheme), $queueState, 3600);

        return [
            'success' => true,
            'summary' => $summary,
            'queue' => [
                'total_files' => count($allPendingItems),
                'status' => $queueState['status'],
            ],
            'message' => ($startDate === '2024-01-01' || $monthsCount >= 35)
                ? "ตรวจสอบรายการย้อนหลังถึง 1 ม.ค. 67 ({$monthsCount} เดือน) สำเร็จ: พบทั้งหมด {$totalFiles} ไฟล์ (มีแล้ว {$totalDownloaded} ไฟล์, รอโหลด {$totalPending} ไฟล์)"
                : "ตรวจสอบรายการย้อนหลัง {$monthsCount} เดือนสำเร็จ: พบทั้งหมด {$totalFiles} ไฟล์ (มีแล้ว {$totalDownloaded} ไฟล์, รอโหลด {$totalPending} ไฟล์)",
        ];
    }

    /**
     * ดึงความคืบหน้าการทยอยดาวน์โหลด
     */
    public function getProgress(string $scheme = 'cgd'): array
    {
        $scheme = strtolower($scheme);
        $queue = Cache::get($this->queueCacheKey($scheme));
        $scan = Cache::get($this->scanCacheKey($scheme));

        if (! is_array($queue)) {
            return [
                'is_active' => false,
                'status' => 'idle',
                'percent' => 0,
                'total_files' => 0,
                'processed_files' => 0,
                'pending_files' => 0,
                'current_file' => null,
                'current_month' => null,
                'completed_items' => [],
                'failed_items' => [],
                'scan_summary' => $scan,
            ];
        }

        return array_merge($queue, [
            'is_active' => in_array($queue['status'] ?? '', ['running', 'ready']),
            'pending_files' => count($queue['pending_items'] ?? []),
            'scan_summary' => $scan,
        ]);
    }

    /**
     * เริ่มการทำงานของคิว
     */
    public function startSync(string $scheme = 'cgd'): array
    {
        $scheme = strtolower($scheme);
        $queue = Cache::get($this->queueCacheKey($scheme));

        if (! is_array($queue) || empty($queue['pending_items'])) {
            return [
                'success' => false,
                'message' => 'ไม่มีไฟล์ในคิวที่ต้องดาวน์โหลด กรุณาสแกนตรวจสอบ 6 เดือนย้อนหลังก่อน',
            ];
        }

        $queue['status'] = 'running';
        $queue['started_at'] = $queue['started_at'] ?? now()->toIso8601String();
        $queue['updated_at'] = now()->toIso8601String();
        Cache::put($this->queueCacheKey($scheme), $queue, 3600);

        return [
            'success' => true,
            'message' => 'เริ่มการทยอยดาวน์โหลดในเบื้องหลังเรียบร้อย',
            'progress' => $this->getProgress($scheme),
        ];
    }

    /**
     * ประมวลผลทีละ Chunk (ครั้งละ $batchSize ไฟล์)
     */
    public function processNextBatch(string $scheme = 'cgd', int $batchSize = 2): array
    {
        $scheme = strtolower($scheme);
        $queue = Cache::get($this->queueCacheKey($scheme));

        if (! is_array($queue) || empty($queue['pending_items'])) {
            return [
                'status' => 'completed',
                'percent' => 100,
                'message' => 'ดาวน์โหลดไฟล์ทั้งหมดในคิวเสร็จสมบูรณ์แล้ว',
                'progress' => $this->getProgress($scheme),
            ];
        }

        $portal = $this->portalService->forScheme($scheme);
        $pending = $queue['pending_items'];
        $chunk = array_splice($pending, 0, max(1, $batchSize));
        $completed = $queue['completed_items'] ?? [];
        $failed = $queue['failed_items'] ?? [];

        foreach ($chunk as $item) {
            $queue['current_file'] = $item['filename'];
            $queue['current_month'] = $item['month_label'] ?? "{$item['month']}/{$item['year']}";
            Cache::put($this->queueCacheKey($scheme), $queue, 3600);

            try {
                $notes = "RCM Historical Sync ({$item['filename']})";
                $importResult = $portal->downloadSingleFile($item, $this->stmImporter, $notes);

                $completed[] = [
                    'filename' => $item['filename'],
                    'month_label' => $item['month_label'] ?? '',
                    'document_no' => $importResult['document_no'] ?? '',
                    'row_count' => $importResult['row_count'] ?? 0,
                    'total_approved' => $importResult['total_approved'] ?? 0,
                    'downloaded_at' => now()->toDateTimeString(),
                ];
            } catch (\Throwable $e) {
                Log::warning("Historical sync file failed: {$item['filename']} - " . $e->getMessage());

                // ถ้า session e-Claim หลุด
                if (str_contains($e->getMessage(), 'กรอก OTP') || str_contains($e->getMessage(), 'login')) {
                    $queue['status'] = 'requires_otp';
                    $queue['updated_at'] = now()->toIso8601String();
                    Cache::put($this->queueCacheKey($scheme), $queue, 3600);

                    return [
                        'status' => 'requires_otp',
                        'requires_otp' => true,
                        'message' => 'Session e-Claim หมดอายุ กรุณายืนยันรหัส OTP เพื่อดาวน์โหลดต่อ',
                        'progress' => $this->getProgress($scheme),
                    ];
                }

                $failed[] = [
                    'filename' => $item['filename'],
                    'month_label' => $item['month_label'] ?? '',
                    'error' => $e->getMessage(),
                    'failed_at' => now()->toDateTimeString(),
                ];
            }
        }

        $queue['pending_items'] = array_values($pending);
        $queue['completed_items'] = $completed;
        $queue['failed_items'] = $failed;
        $queue['processed_files'] = count($completed) + count($failed);

        // Update scan_summary in cache dynamically per downloaded file
        $scan = Cache::get($this->scanCacheKey($scheme));
        if (is_array($scan) && ! empty($scan['months'])) {
            $deltaDownloaded = count($chunk) - (count($failed) - (isset($queue['prev_failed_count']) ? $queue['prev_failed_count'] : 0));
            foreach ($chunk as $item) {
                $y = (int) ($item['year'] ?? 0);
                $m = (int) ($item['month'] ?? 0);
                foreach ($scan['months'] as &$sm) {
                    if ((int) $sm['year'] === $y && (int) $sm['month'] === $m) {
                        $sm['downloaded_files'] = min($sm['total_files'], ($sm['downloaded_files'] ?? 0) + 1);
                        $sm['pending_files'] = max(0, ($sm['pending_files'] ?? 1) - 1);
                        if ($sm['pending_files'] === 0 && $sm['total_files'] > 0) {
                            $sm['status'] = 'complete';
                        }
                    }
                }
                unset($sm);
            }
            $scan['already_downloaded'] = min($scan['total_files'], ($scan['already_downloaded'] ?? 0) + count($chunk));
            $scan['pending_download'] = max(0, ($scan['pending_download'] ?? 0) - count($chunk));
            Cache::put($this->scanCacheKey($scheme), $scan, 1800);
        }

        $total = max(1, (int) ($queue['total_files'] ?? 1));
        $queue['percent'] = min(100, (int) round(($queue['processed_files'] / $total) * 100));

        if (empty($queue['pending_items'])) {
            $queue['status'] = 'completed';
            $queue['percent'] = 100;
            $queue['current_file'] = null;
            $queue['current_month'] = null;
        } else {
            $queue['status'] = 'running';
        }

        $queue['updated_at'] = now()->toIso8601String();
        Cache::put($this->queueCacheKey($scheme), $queue, 3600);

        return [
            'status' => $queue['status'],
            'percent' => $queue['percent'],
            'completed_count' => count($completed),
            'failed_count' => count($failed),
            'remaining_count' => count($queue['pending_items']),
            'progress' => $this->getProgress($scheme),
        ];
    }

    /**
     * หยุดการทำงานชั่วคราว
     */
    public function pauseSync(string $scheme = 'cgd'): array
    {
        $scheme = strtolower($scheme);
        $queue = Cache::get($this->queueCacheKey($scheme));

        if (is_array($queue)) {
            $queue['status'] = 'paused';
            $queue['updated_at'] = now()->toIso8601String();
            Cache::put($this->queueCacheKey($scheme), $queue, 3600);
        }

        return [
            'success' => true,
            'message' => 'หยุดการดาวน์โหลดชั่วคราวแล้ว',
            'progress' => $this->getProgress($scheme),
        ];
    }

    /**
     * ล้างคิวการทำงาน
     */
    public function resetSync(string $scheme = 'cgd'): array
    {
        $scheme = strtolower($scheme);
        Cache::forget($this->queueCacheKey($scheme));
        Cache::forget($this->scanCacheKey($scheme));

        return [
            'success' => true,
            'message' => 'ล้างสถานะและคิวการดาวน์โหลดเรียบร้อยแล้ว',
        ];
    }

    private function queueCacheKey(string $scheme): string
    {
        return 'rcm_historical_queue_' . strtolower($scheme) . '_' . (Auth::id() ?: 'guest');
    }

    private function scanCacheKey(string $scheme): string
    {
        return 'rcm_historical_scan_' . strtolower($scheme) . '_' . (Auth::id() ?: 'guest');
    }
}
