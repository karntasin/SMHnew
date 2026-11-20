<?php

namespace App\Http\Controllers\Ipd;

use App\Http\Controllers\Controller;
use App\Models\IpdAdmissionNote;
use App\Services\Hosxp\IpdHosxpService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class IpdDashboardController extends Controller
{
    public function __construct(
        protected IpdHosxpService $hosxpService
    ) {}

    /**
     * ตรวจสอบสิทธิ์เฉพาะ admin, boss, doctor, superUser
     */
    protected function checkRole(Request $request): void
    {
        $user = $request->user();
        if (!$user) {
            abort(401);
        }

        if (!$user->hasAnyRole(['admin', 'boss', 'doctor', 'superUser']) && !$user->can('ipd.index')) {
            abort(403, 'หน้านี้สงวนสิทธิ์เฉพาะบทบาท Admin, Boss และ Doctor เท่านั้น');
        }
    }

    /**
     * หน้าแดชบอร์ดระบบผู้ป่วยใน (IPD)
     */
    public function index(Request $request)
    {
        $this->checkRole($request);

        $notesCount = IpdAdmissionNote::count();
        $recentNotes = IpdAdmissionNote::with(['creator:id,name'])
            ->orderByDesc('id')
            ->limit(10)
            ->get();

        // ดึงเฉพาะผู้ป่วยในที่กำลัง Admit ปัจจุบันจาก HOSxP (Active IPD Census ที่มี AN แล้ว)
        $currentAdmissions = $this->hosxpService->searchAdmissions('', 25, 'ipd');

        return Inertia::render('IPD/Index', [
            'stats' => [
                'total_notes' => $notesCount,
                'active_ipd_census' => count($currentAdmissions),
            ],
            'recentNotes' => $recentNotes,
            'currentAdmissions' => $currentAdmissions,
        ]);
    }
}
