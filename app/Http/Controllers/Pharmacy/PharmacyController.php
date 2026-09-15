<?php

namespace App\Http\Controllers\Pharmacy;

use App\Http\Controllers\Controller;
use App\Services\Pharmacy\EgfrDrugAlertService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PharmacyController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Pharmacy/Index', [
            'channels' => [
                [
                    'key' => 'drug-alerts',
                    'title' => 'แจ้งเตือนการใช้ยา',
                    'hint' => 'ตรวจสั่งยาเบาหวานเทียบ eGFR ล่าสุด',
                    'href' => route('pharmacy.drug-alerts'),
                    'tone' => 'rose',
                    'stats_label' => 'เฝ้าระวังตาม guideline',
                ],
                [
                    'key' => 'inventory',
                    'title' => 'คลังยา / ห้องยา',
                    'hint' => 'รับเข้า · เบิก · lot/QR · ตัดจ่ายตาม HOSxP',
                    'href' => route('pharmacy.inventory.index'),
                    'tone' => 'violet',
                    'stats_label' => 'สต็อก + แจ้งเตือนต่ำ',
                ],
                [
                    'key' => 'rdu',
                    'title' => 'รายงาน RDU',
                    'hint' => 'ตัวชี้วัดการใช้ยาอย่างสมเหตุผล',
                    'href' => route('rdu.index'),
                    'tone' => 'emerald',
                    'stats_label' => 'Rational Drug Use',
                ],
                [
                    'key' => 'drug-usage',
                    'title' => 'รายงานยาและการใช้ยา',
                    'hint' => 'ภาพรวมและรายการจ่ายยาจาก HOSxP',
                    'href' => route('drug-usage.index'),
                    'tone' => 'cyan',
                    'stats_label' => 'Drug utilization',
                ],
            ],
        ]);
    }

    public function drugAlerts(Request $request, EgfrDrugAlertService $service): Response
    {
        $start = $request->query('start_date') ?: $request->input('start_date');
        $end = $request->query('end_date') ?: $request->input('end_date');
        $severity = $request->query('severity') ?: $request->input('severity');

        $start = is_string($start) && $start !== '' ? $start : null;
        $end = is_string($end) && $end !== '' ? $end : null;
        $severity = is_string($severity) && $severity !== '' && $severity !== 'all' ? $severity : null;

        $result = $service->scan($start, $end, $severity);

        return Inertia::render('Pharmacy/DrugAlerts', [
            'result' => $result,
            'catalog' => $service->catalogForUi(),
            'severityOptions' => [
                ['value' => 'all', 'label' => 'ทุกระดับ'],
                ['value' => 'contraindicated', 'label' => 'ห้ามใช้'],
                ['value' => 'alert', 'label' => 'ALERT'],
                ['value' => 'dose_exceeded', 'label' => 'ขนาดเกิน Max'],
                ['value' => 'missing_egfr', 'label' => 'ไม่มีค่า eGFR'],
            ],
        ]);
    }
}
