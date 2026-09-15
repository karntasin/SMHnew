<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\StaffRosterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StaffRosterLookupController extends Controller
{
    public function __construct(
        private readonly StaffRosterService $rosterService,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'cid' => 'nullable|string|max:20',
        ]);

        $roster = $this->rosterService->findMatch(
            $data['first_name'] ?? null,
            $data['last_name'] ?? null,
            $data['cid'] ?? null,
        );

        if (! $roster) {
            return response()->json([
                'matched' => false,
                'message' => 'ไม่พบข้อมูลในระบบ กรุณาติดต่อเจ้าหน้าที่สารสนเทศเพื่อสร้างข้อมูลให้',
            ]);
        }

        return response()->json($this->rosterService->toLookupPayload($roster));
    }
}
