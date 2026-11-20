<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class RcmAutoSyncAllCommand extends Command
{
    protected $signature = 'rcm:auto-sync-all
                            {--year= : ปี พ.ศ. สำหรับ SMT หรือ ค.ศ. สำหรับ e-Claim}
                            {--month= : เดือน 1-12 สำหรับ e-Claim}
                            {--force : บังคับดาวน์โหลดใหม่ทั้งหมด}';

    protected $description = 'ซิงค์ข้อมูล RCM ครบวงจรทุกสิทธิ (REP, STM ทุกกองทุน และเงินโอน SMT) รอบอัตโนมัติ';

    public function handle(): int
    {
        $params = [];
        if ($this->option('year')) {
            $params['--year'] = $this->option('year');
        }
        if ($this->option('month')) {
            $params['--month'] = $this->option('month');
        }
        if ($this->option('force')) {
            $params['--force'] = true;
        }

        return $this->call('finance:auto-sync-all', $params);
    }
}
