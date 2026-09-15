<?php

namespace App\Console\Commands;

use App\Models\HosxpScheduledReport;
use App\Notifications\HosxpScheduledReportReadyNotification;
use App\Services\HosxpReportExportService;
use App\Services\HosxpReportService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class RunScheduledHosxpReports extends Command
{
    protected $signature = 'hosxp:run-scheduled-reports';

    protected $description = 'สร้างรายงาน HOSxP ตามตารางที่ตั้งไว้';

    public function handle(HosxpReportService $reports, HosxpReportExportService $exporter): int
    {
        $due = HosxpScheduledReport::query()
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('next_run_at')->orWhere('next_run_at', '<=', now());
            })
            ->with('user')
            ->get();

        if ($due->isEmpty()) {
            $this->info('No scheduled reports due.');

            return self::SUCCESS;
        }

        $ran = 0;
        foreach ($due as $schedule) {
            try {
                $params = $this->resolveDateParams($schedule->params ?? [], $schedule->frequency);
                $params['report_id'] = $schedule->report_id;
                $params['limit'] = $params['limit'] ?? 10000;

                $dir = storage_path('app/hosxp-reports/'.$schedule->user_id);
                $result = $exporter->exportToStorage($schedule->report_id, $params, $schedule->format, $dir);

                $relative = 'hosxp-reports/'.$schedule->user_id.'/'.basename($result['path']);
                $schedule->update([
                    'last_run_at' => now(),
                    'last_file_path' => $relative,
                    'next_run_at' => $schedule->computeNextRun(),
                ]);

                $schedule->user?->notify(new HosxpScheduledReportReadyNotification(
                    $reports->reportTitle($schedule->report_id),
                    basename($result['path']),
                    route('hosxp-reports.download-scheduled', $schedule->id),
                ));

                $this->info("Generated #{$schedule->id} ({$result['row_count']} rows)");
                $ran++;
            } catch (\Throwable $e) {
                $this->error("Failed #{$schedule->id}: ".$e->getMessage());
                $schedule->update(['next_run_at' => $schedule->computeNextRun()]);
            }
        }

        $this->info("Completed {$ran} scheduled report(s).");

        return self::SUCCESS;
    }

    /** @param array<string, mixed> $params */
    private function resolveDateParams(array $params, string $frequency): array
    {
        if (! empty($params['start_date']) && ! empty($params['end_date'])) {
            return $params;
        }

        $now = Carbon::now('Asia/Bangkok');

        if ($frequency === 'daily') {
            $day = $now->copy()->subDay();

            return array_merge($params, [
                'start_date' => $day->toDateString(),
                'end_date' => $day->toDateString(),
            ]);
        }

        if ($frequency === 'weekly') {
            $end = $now->copy()->subDay();
            $start = $end->copy()->subDays(6);

            return array_merge($params, [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ]);
        }

        $start = $now->copy()->subMonth()->startOfMonth();
        $end = $now->copy()->subMonth()->endOfMonth();

        return array_merge($params, [
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
        ]);
    }
}
