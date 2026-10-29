<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ClinicalTracer;
use App\Models\ClinicalTracerRevision;
use App\Models\Menu;
use App\Models\TeamHa;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB;

class ClinicalTracerInitialDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $jsonPath = storage_path('app/clinical_tracers_parsed.json');
        if (!File::exists($jsonPath)) {
            $this->command?->error("File not found: {$jsonPath}");
            return;
        }

        $tracers = json_decode(File::get($jsonPath), true);
        if (!$tracers) {
            $this->command?->error("Invalid JSON data");
            return;
        }

        DB::connection('mysql')->transaction(function () use ($tracers) {
            // Find Clinical Lead Team (PCT or similar) if exists
            $pctTeam = TeamHa::where('name_th', 'like', '%นำทางคลินิก%')
                ->orWhere('name_th', 'like', '%PCT%')
                ->orWhere('abbreviation', 'PCT')
                ->first();

            foreach ($tracers as $item) {
                $tracer = ClinicalTracer::updateOrCreate(
                    ['code' => $item['code']],
                    [
                        'title' => $item['title'],
                        'subtitle' => $item['subtitle'],
                        'category' => $item['category'],
                        'team_ha_id' => $pctTeam?->id,
                        'context' => $item['context'],
                        'key_issues' => $item['key_issues'],
                        'goals' => $item['goals'],
                        'processes' => $item['processes'],
                        'kpi_data' => $item['kpi_data'],
                        'results_analysis' => $item['results_analysis'],
                        'next_plans' => $item['next_plans'],
                        'status' => 'completed',
                        'current_version' => 1,
                        'order' => $item['order'],
                    ]
                );

                // Create initial revision if not exists
                if ($tracer->revisions()->count() === 0) {
                    ClinicalTracerRevision::create([
                        'clinical_tracer_id' => $tracer->id,
                        'version_number' => 1,
                        'change_summary' => 'นำเข้าข้อมูลตั้งต้นจากเอกสาร Clinical Tracer 15 ต.ค. 69',
                        'snapshot_data' => $tracer->createSnapshot(),
                        'created_at' => now(),
                    ]);
                }
            }

            // Create or update Menu under "งานพัฒนาคุณภาพ (HA)"
            $haMenu = Menu::where('route', '/ha')->first();
            if ($haMenu) {
                Menu::updateOrCreate(
                    [
                        'route' => '/ha/clinical-tracer',
                    ],
                    [
                        'title' => 'Clinical Tracer (ติดตามทางคลินิก)',
                        'icon' => 'Activity',
                        'parent_id' => $haMenu->id,
                        'order' => 2,
                        'permission_name' => null,
                    ]
                );
            }
        });
    }
}
