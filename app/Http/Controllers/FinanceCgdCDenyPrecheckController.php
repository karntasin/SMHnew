<?php

namespace App\Http\Controllers;

use App\Services\Finance\CgdCDenyPrecheckService;
use App\Support\Finance\ClaimScheme;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FinanceCgdCDenyPrecheckController extends Controller
{
    public function __construct(
        protected readonly CgdCDenyPrecheckService $precheck,
    ) {}

    public function index(Request $request): Response
    {
        $visitDate = (string) $request->query('visit_date', now('Asia/Bangkok')->toDateString());
        if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $visitDate)) {
            $visitDate = now('Asia/Bangkok')->toDateString();
        }

        $severity = strtolower((string) $request->query('severity', 'all'));
        if (! in_array($severity, ['all', 'red', 'yellow', 'green'], true)) {
            $severity = 'all';
        }

        $result = $this->precheck->auditDay($visitDate);
        $visits = $result['visits'];
        if ($severity !== 'all') {
            $visits = array_values(array_filter(
                $visits,
                fn (array $row) => ($row['severity'] ?? '') === $severity
            ));
        }

        return Inertia::render('Finance/CgdClaim/CDenyPrecheck', [
            'module' => ClaimScheme::uiMeta('cgd'),
            'visit_date' => $result['visit_date'],
            'severity' => $severity,
            'hosxpReady' => $result['hosxp_ready'],
            'summary' => $result['summary'],
            'visits' => $visits,
            'references' => $result['references'],
            'catalogSource' => $result['catalog_source'],
            'stmInsights' => $result['stm_insights'] ?? ['total_error_rows' => 0, 'top_codes' => []],
        ]);
    }
}
