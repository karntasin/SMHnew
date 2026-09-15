<?php

namespace App\Http\Controllers\Im;

use App\Http\Controllers\Controller;
use App\Models\Im\ActionPlan;
use App\Models\Im\ChangeRequest;
use App\Models\Im\Incident;
use App\Models\Im\ItPlan;
use App\Models\Im\MrAudit;
use App\Models\Im\Policy;
use App\Models\Im\Risk;
use App\Models\Im\ServiceTicket;
use Inertia\Inertia;
use Inertia\Response;

class ImHubController extends Controller
{
    public function index(): Response
    {
        $year = (int) date('Y');

        return Inertia::render('Im/Index', [
            'stats' => [
                'plans' => ItPlan::count(),
                'action_plans' => ActionPlan::count(),
                'open_risks' => Risk::where('status', '!=', 'closed')->count(),
                'policies' => Policy::where('status', 'published')->count(),
                'open_tickets' => ServiceTicket::whereIn('status', ['open', 'in_progress'])->count(),
                'open_incidents' => Incident::where('status', '!=', 'resolved')->count(),
                'pending_changes' => ChangeRequest::where('status', 'pending')->count(),
                'mr_audits' => MrAudit::whereYear('audit_date', $year)->count(),
            ],
        ]);
    }

    public function manual(): Response
    {
        return Inertia::render('Im/Manual');
    }
}
