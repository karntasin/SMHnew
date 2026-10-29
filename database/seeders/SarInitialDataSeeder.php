<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SarCycle;
use App\Models\SarPart;
use App\Models\SarSection;
use App\Models\SarRevision;
use App\Models\Menu;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB;

class SarInitialDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $jsonPath = storage_path('app/sar_parsed_data.json');
        if (!File::exists($jsonPath)) {
            $this->command?->error("File not found: {$jsonPath}");
            return;
        }

        $data = json_decode(File::get($jsonPath), true);
        if (!$data) {
            $this->command?->error("Invalid JSON data");
            return;
        }

        DB::connection('mysql')->transaction(function () use ($data) {
            // 1. Create or update SarCycle
            $cycle = SarCycle::updateOrCreate(
                ['year' => $data['year']],
                [
                    'title' => $data['title'],
                    'hospital_name' => $data['hospital_name'],
                    'bed_count' => $data['bed_count'],
                    'status' => 'active',
                    'is_current' => true,
                ]
            );

            // 2. Loop through parts
            $partOrder = 1;
            foreach ($data['parts'] as $partData) {
                $part = SarPart::updateOrCreate(
                    [
                        'sar_cycle_id' => $cycle->id,
                        'part_number' => $partData['part_number'],
                    ],
                    [
                        'part_name' => $partData['part_name'],
                        'order' => $partOrder++,
                    ]
                );

                // 3. Loop through sections
                $sectionOrder = 1;
                foreach ($partData['sections'] as $sec) {
                    $section = SarSection::updateOrCreate(
                        [
                            'sar_part_id' => $part->id,
                            'code' => $sec['code'],
                        ],
                        [
                            'title' => $sec['title'],
                            'requirement' => $sec['requirement'],
                            'context' => $sec['context'],
                            'self_assessment_data' => $sec['self_assessment_data'],
                            'process_content' => $sec['process_content'],
                            'achievements' => $sec['achievements'],
                            'results_kpi_data' => $sec['results_kpi_data'],
                            'status' => 'completed',
                            'current_version' => 1,
                            'order' => $sectionOrder++,
                        ]
                    );

                    // Create initial revision if not exists
                    if ($section->revisions()->count() === 0) {
                        SarRevision::create([
                            'sar_section_id' => $section->id,
                            'version_number' => 1,
                            'change_summary' => 'นำเข้าข้อมูลตั้งต้นจากเอกสาร SAR 12 ต.ค. 69',
                            'snapshot_data' => $section->createSnapshot(),
                            'created_at' => now(),
                        ]);
                    }
                }
            }

            // 4. Create Menu for "งาน HA"
            // Check if top-level or under Quality
            $qualityMenu = Menu::where('route', '/quality')->orWhere('title', 'like', '%ศูนย์พัฒนาคุณภาพ%')->first();
            $parentId = $qualityMenu?->id;

            Menu::updateOrCreate(
                [
                    'route' => '/ha',
                ],
                [
                    'title' => 'งานพัฒนาคุณภาพ (HA)',
                    'icon' => 'Award',
                    'parent_id' => $parentId,
                    'order' => 1,
                    'permission_name' => null,
                ]
            );

            // Submenu SAR
            $haMenu = Menu::where('route', '/ha')->first();
            if ($haMenu) {
                Menu::updateOrCreate(
                    [
                        'route' => '/ha/sar',
                    ],
                    [
                        'title' => 'SAR (ประเมินตนเอง)',
                        'icon' => 'FileText',
                        'parent_id' => $haMenu->id,
                        'order' => 1,
                        'permission_name' => null,
                    ]
                );
            }
        });
    }
}
