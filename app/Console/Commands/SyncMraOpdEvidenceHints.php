<?php

namespace App\Console\Commands;

use App\Models\Mra\MraCriteria;
use Illuminate\Console\Command;

/**
 * อัปเดต hosxp_table / hosxp_field / data_type=both สำหรับเกณฑ์ OPD+IPD
 * ที่ดึงหลักฐานได้ โดยไม่ truncate ตาราง
 */
class SyncMraOpdEvidenceHints extends Command
{
    protected $signature = 'mra:sync-opd-evidence-hints {--channel=all : opd|ipd|all}';

    protected $description = 'Sync OPD/IPD MRA criteria HOSxP evidence metadata (data_type=both)';

    public function handle(): int
    {
        $channel = $this->option('channel') ?: 'all';
        $maps = [];
        if (in_array($channel, ['all', 'opd'], true)) {
            $maps['opd'] = config('mra_auto_check_opd.sources', []);
        }
        if (in_array($channel, ['all', 'ipd'], true)) {
            $maps['ipd'] = config('mra_auto_check_ipd.sources', []);
        }

        if ($maps === []) {
            $this->error('No channel selected');

            return self::FAILURE;
        }

        $updated = 0;
        foreach ($maps as $auditType => $sources) {
            foreach ($sources as $code => $meta) {
                $count = MraCriteria::query()
                    ->where('code', $code)
                    ->whereHas('category', fn ($q) => $q->where('audit_type', $auditType))
                    ->update([
                        'hosxp_table' => $meta['table'] ?? null,
                        'hosxp_field' => $meta['field'] ?? null,
                        'data_type' => 'both',
                    ]);
                $updated += $count;
            }
            $this->info(strtoupper($auditType).': synced '.count($sources).' codes');
        }

        $this->info("Updated {$updated} criteria rows for evidence hints.");

        return self::SUCCESS;
    }
}
