<?php

namespace App\Console\Commands;

use App\Services\Finance\NhsoSmtPortalService;
use Illuminate\Console\Command;

class NhsoSmtAutoSyncCommand extends Command
{
    protected $signature = 'nhso:sync-smt 
                            {--year=2570 : ปีงบประมาณ (เช่น 2570)}
                            {--start= : วันที่เริ่มต้น ค.ศ. (Y-m-d) หรือ พ.ศ. (d/m/Y)}
                            {--end= : วันที่สิ้นสุด ค.ศ. (Y-m-d) หรือ พ.ศ. (d/m/Y)}
                            {--source= : กองทุน (เช่น LGO, UC, DSS, COVID หรือว่าง)}';

    protected $description = 'ดึงข้อมูลการโอนเงินชดเชยจากเว็บ SMT สปสช. (https://smt.nhso.go.th/) อัตโนมัติ';

    public function handle(NhsoSmtPortalService $service): int
    {
        $year = (string) $this->option('year');
        $beYear = (int) $year ?: 2570;
        $ceYear = $beYear - 543;
        $defaultFiscalStart = sprintf('%04d-10-01', $ceYear - 1);

        $start = (string) ($this->option('start') ?: $defaultFiscalStart);
        $end = (string) ($this->option('end') ?: date('Y-m-d'));
        $source = (string) $this->option('source');

        $this->info("กำลังดึงข้อมูลการโอนเงินจาก SMT สปสช. (ปีงบ {$year}, ช่วง {$start} ถึง {$end})...");

        try {
            $result = $service->syncTransfers([
                'zone_id' => '06',
                'province_id' => '27',
                'hcode' => '14689',
                'budget_year' => $year,
                'start_date' => $start,
                'end_date' => $end,
                'budget_source' => $source,
            ]);

            $this->info("บันทึกข้อมูลสำเร็จ {$result['synced_count']} รายการ");
            $this->info("ยอดเงินโอนรวม: ".number_format($result['total_amount'], 2)." บาท");
            $this->line("  - อปท. (LGO): ".number_format($result['summary']['total_lgo'], 2)." บาท ({$result['summary']['count_lgo']} รายการ)");
            $this->line("  - บัตรทอง (UC): ".number_format($result['summary']['total_uc'], 2)." บาท ({$result['summary']['count_uc']} รายการ)");
            $this->line("  - กองทุนไตวายเรื้อรัง (CKD): ".number_format($result['summary']['total_ckd'], 2)." บาท ({$result['summary']['count_ckd']} รายการ)");

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("เกิดข้อผิดพลาด: {$e->getMessage()}");
            return self::FAILURE;
        }
    }
}
