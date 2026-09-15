<?php

namespace App\Console\Commands;

use App\Models\Im\Incident;
use App\Models\QualityIndicator;
use App\Models\QualityIndicatorEntry;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SeedImIncidentsFromQi extends Command
{
    protected $signature = 'im:seed-incidents-from-qi {--fresh : ลบอุบัติการณ์ที่สร้างจากตัวชี้วัด IM-03/IM-04 ก่อนสร้างใหม่}';

    protected $description = 'สร้างอุบัติการณ์ Server/Internet ล่ม ตามจำนวนรายปีของตัวชี้วัด IM-03 และ IM-04 โดยสุ่มวันที่เกิดเหตุ';

    /** @var array<string, array{code: string, title: string, hait: string, pool: list<array{title: string, impact: string, root_cause: string, problem_action: string, severity: string, downtime: array{0: int, 1: int}}>}> */
    private array $catalog = [
        'IM-03' => [
            'code' => 'IM-03',
            'title' => 'อุบัติการณ์ระบบ Server ล่ม',
            'hait' => 'HAIT · IM-03 ระบบ Server',
            'pool' => [
                [
                    'title' => 'ระบบ Server HOSxP ล่ม ไม่สามารถเข้าใช้งานโปรแกรมได้',
                    'impact' => 'งานผู้ป่วยนอก/ในไม่สามารถบันทึกและเรียกดูเวชระเบียนได้ชั่วคราว ต้องใช้แบบฟอร์มสำรอง',
                    'root_cause' => 'ทรัพยากรเครื่องแม่ข่ายหลักเต็ม (CPU/RAM) จนบริการฐานข้อมูลหยุดตอบสนอง',
                    'problem_action' => 'เพิ่มทรัพยากร VM, ตั้งค่า alert utilization และทบทวนแผนสำรองเครื่องแม่ข่าย',
                    'severity' => 'critical',
                    'downtime' => [25, 90],
                ],
                [
                    'title' => 'Server ฐานข้อมูลหลักหยุดทำงานกะทันหัน',
                    'impact' => 'ระบบทะเบียนและระบบยาไม่สามารถเชื่อมฐานข้อมูลได้ กระทบการจ่ายยาและลงบันทึก',
                    'root_cause' => 'ชุดดิสก์ RAID ของเครื่องแม่ข่ายมี disk fail จนบริการฐานข้อมูลหยุด',
                    'problem_action' => 'เปลี่ยนดิสก์ Spare, ตรวจสอบ RAID health รายสัปดาห์ และสำรองข้อมูลนอกสถานที่',
                    'severity' => 'critical',
                    'downtime' => [40, 150],
                ],
                [
                    'title' => 'เครื่องแม่ข่าย Virtual Host รีสตาร์ทเอง',
                    'impact' => 'บริการในเครื่องลูก VM หลายระบบหยุดพร้อมกัน รวม HOSxP และไฟล์เซิร์ฟเวอร์',
                    'root_cause' => 'ระบบระบายความร้อนห้อง server ไม่เสถียร ทำให้อุณหภูมิสูงจน Host ป้องกันตัวรีสตาร์ท',
                    'problem_action' => 'บำรุงรักษาแอร์ห้อง server ตามแผน PM และติดตั้ง sensor อุณหภูมิพร้อมแจ้งเตือน',
                    'severity' => 'major',
                    'downtime' => [20, 70],
                ],
                [
                    'title' => 'ระบบไฟสำรอง UPS ห้อง server ตัดการทำงาน',
                    'impact' => 'เครื่องแม่ข่ายดับตามไฟบ้าน งานหน้างานใช้ระบบไม่ได้จนกว่าจะบูตและตรวจสอบบริการ',
                    'root_cause' => 'แบตเตอรี่ UPS เสื่อมสภาพ ไม่สามารถประคองโหลดช่วงไฟกระชากได้',
                    'problem_action' => 'เปลี่ยนแบตเตอรี่ UPS, ทดสอบโหลดรายไตรมาส และทบทวนสัญญาบำรุงรักษา',
                    'severity' => 'major',
                    'downtime' => [15, 60],
                ],
            ],
        ],
        'IM-04' => [
            'code' => 'IM-04',
            'title' => 'อุบัติการณ์ระบบ Internet ล่ม',
            'hait' => 'HAIT · IM-04 ระบบ Internet',
            'pool' => [
                [
                    'title' => 'วงจร Internet หลักของโรงพยาบาลขาดหาย',
                    'impact' => 'ไม่สามารถใช้อีเมล เว็บภายนอก และบริการที่ต้องเชื่อมอินเทอร์เน็ต เช่น อ้างอิงสิทธิ/เคลม',
                    'root_cause' => 'ผู้ให้บริการวงจร (ISP) มีเหตุขัดข้องด้านเครือข่ายแกนหลัก',
                    'problem_action' => 'เปิดใช้วงจรสำรองอัตโนมัติ (failover) และซ้อมสลับวงจรทุก 6 เดือน',
                    'severity' => 'major',
                    'downtime' => [12, 90],
                ],
                [
                    'title' => 'สัญญาณ Internet ภายในโรงพยาบาลใช้ไม่ได้หลายหน่วยงาน',
                    'impact' => 'งานหน้าบ้านค้นหาข้อมูลออนไลน์ไม่ได้ และระบบที่พึ่งพา DNS ภายนอกล่าช้า',
                    'root_cause' => 'อุปกรณ์ Router/Firewall หลัก hang หลังใช้งานต่อเนื่อง ไม่มี watchdog restart',
                    'problem_action' => 'ตั้งค่า HA ของ Firewall, เปิด SNMP monitor และกำหนดรอบ reboot บำรุงรักษา',
                    'severity' => 'major',
                    'downtime' => [10, 45],
                ],
                [
                    'title' => 'สายไฟเบอร์ Internet ขาเข้าชำรุด',
                    'impact' => 'เชื่อมต่อภายนอกไม่ได้ทั้งโรงพยาบาล จนกว่าจะซ่อมสายและทดสอบลิงก์',
                    'root_cause' => 'สายไฟเบอร์ขาเข้าถูกกระทบจากงานก่อสร้าง/สัตว์กัด ทำให้ลิงก์ลง',
                    'problem_action' => 'เดินสายสำรองคนละเส้นทาง และติดป้ายเตือนจุดเสี่ยงพร้อมตรวจสายรายเดือน',
                    'severity' => 'critical',
                    'downtime' => [30, 180],
                ],
                [
                    'title' => 'Gateway Internet ไม่สามารถเชื่อมต่อได้หลังปรับค่า',
                    'impact' => 'บางหน่วยงานเข้าเน็ตไม่ได้ ระบบอัปเดตและบริการคลาวด์ใช้งานไม่ได้ชั่วคราว',
                    'root_cause' => 'การปรับ routing/NAT ผิดพลาดโดยไม่มี peer review ก่อนนำขึ้นจริง',
                    'problem_action' => 'บังคับใช้ change control ก่อนปรับเครือข่าย และเก็บ backup config ก่อนเปลี่ยนทุกครั้ง',
                    'severity' => 'minor',
                    'downtime' => [8, 35],
                ],
            ],
        ],
    ];

    public function handle(): int
    {
        if ($this->option('fresh')) {
            Incident::query()
                ->where(function ($q) {
                    $q->where('incident_no', 'like', 'INC-IM03-%')
                        ->orWhere('incident_no', 'like', 'INC-IM04-%');
                })
                ->delete();
            $this->warn('ลบอุบัติการณ์เดิมที่สร้างจาก IM-03/IM-04 แล้ว');
        }

        $created = 0;
        $updated = 0;
        $skipped = 0;
        $table = [];

        DB::transaction(function () use (&$created, &$updated, &$skipped, &$table) {
            foreach ($this->catalog as $code => $meta) {
                $indicator = QualityIndicator::query()->where('code', $code)->first();
                if (! $indicator) {
                    $this->error('ไม่พบตัวชี้วัด '.$code);
                    continue;
                }

                $entries = QualityIndicatorEntry::query()
                    ->where('quality_indicator_id', $indicator->id)
                    ->orderBy('period_date')
                    ->get()
                    ->groupBy(fn (QualityIndicatorEntry $e) => (int) $e->period_date->year)
                    ->map->last()
                    ->values();

                foreach ($entries as $entry) {
                    $year = (int) $entry->period_date->year;
                    $count = max(0, (int) round((float) $entry->result_value));
                    $table[] = [$code, $year, $count, $indicator->name];

                    if ($count === 0) {
                        $skipped += Incident::query()
                            ->where('incident_no', 'like', $this->prefix($code).$year.'-%')
                            ->count();
                        continue;
                    }

                    $dates = $this->randomDatesInYear($year, $count, $code);
                    foreach ($dates as $index => $occurredAt) {
                        $seq = $index + 1;
                        $no = sprintf('%s%d-%02d', $this->prefix($code), $year, $seq);
                        $template = $this->pickTemplate($meta['pool'], $code, $year, $seq);
                        $downtime = $this->pickDowntime($template['downtime'], $code, $year, $seq);
                        $payload = [
                            'title' => $template['title'],
                            'hait_category' => $meta['hait'],
                            'occurred_at' => $occurredAt,
                            'downtime_minutes' => $downtime,
                            'severity' => $template['severity'],
                            'impact' => $template['impact'],
                            'root_cause' => $template['root_cause'],
                            'problem_action' => $template['problem_action'],
                            'status' => 'resolved',
                            'created_by' => User::query()->orderBy('id')->value('id'),
                        ];

                        $incident = Incident::query()->updateOrCreate(
                            ['incident_no' => $no],
                            $payload
                        );
                        $incident->created_at = $occurredAt;
                        $incident->updated_at = $occurredAt->copy()->addMinutes($downtime + 20);
                        $incident->save();

                        if ($incident->wasRecentlyCreated) {
                            $created++;
                        } else {
                            $updated++;
                        }
                    }
                }
            }
        });

        $this->info('สร้างใหม่ '.$created.' · อัปเดต '.$updated.' · ปีที่จำนวนเป็น 0 ไม่สร้างรายการ');
        $this->table(['รหัส', 'ปี', 'จำนวนครั้งตามตัวชี้วัด', 'ชื่อตัวชี้วัด'], $table);

        return self::SUCCESS;
    }

    private function prefix(string $code): string
    {
        return 'INC-'.str_replace('-', '', $code).'-';
    }

    /**
     * @param  list<array{title: string, impact: string, root_cause: string, problem_action: string, severity: string, downtime: array{0: int, 1: int}}>  $pool
     * @return array{title: string, impact: string, root_cause: string, problem_action: string, severity: string, downtime: array{0: int, 1: int}}
     */
    private function pickTemplate(array $pool, string $code, int $year, int $seq): array
    {
        return $pool[($seq - 1) % count($pool)];
    }

    /** @param array{0: int, 1: int} $range */
    private function pickDowntime(array $range, string $code, int $year, int $seq): int
    {
        $span = max(1, $range[1] - $range[0]);

        return $range[0] + (abs(crc32($code.'|'.$year.'|'.$seq.'|dt')) % ($span + 1));
    }

    /** @return list<Carbon> */
    private function randomDatesInYear(int $year, int $count, string $salt): array
    {
        $start = Carbon::create($year, 1, 1, 8, 0, 0);
        $end = Carbon::create($year, 12, 31, 18, 0, 0);
        if ($end->isFuture()) {
            $end = now()->copy()->subHours(2);
        }
        if ($start->gt($end)) {
            return [];
        }

        $days = max(1, (int) $start->copy()->startOfDay()->diffInDays($end->copy()->startOfDay()) + 1);
        $used = [];
        $dates = [];

        for ($i = 0; $i < $count; $i++) {
            $offset = abs(crc32($salt.'|'.$year.'|'.$i)) % $days;
            for ($walk = 0; $walk < $days; $walk++) {
                $day = ($offset + $walk) % $days;
                if (isset($used[$day])) {
                    continue;
                }
                $used[$day] = true;
                $hour = 7 + (abs(crc32($salt.'|h|'.$year.'|'.$i)) % 12);
                $minute = abs(crc32($salt.'|m|'.$year.'|'.$i)) % 60;
                $dt = $start->copy()->startOfDay()->addDays($day)->setTime($hour, $minute, 0);
                if ($dt->gt($end)) {
                    $dt = $end->copy();
                }
                $dates[] = $dt;
                break;
            }
        }

        usort($dates, fn (Carbon $a, Carbon $b) => $a->timestamp <=> $b->timestamp);

        return $dates;
    }
}
