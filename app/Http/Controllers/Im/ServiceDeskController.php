<?php

namespace App\Http\Controllers\Im;

use App\Http\Controllers\Controller;
use App\Models\Im\Incident;
use App\Models\Im\ServiceTicket;
use App\Models\Im\Timesheet;
use App\Models\User;
use App\Services\Im\GoogleTimesheetSyncService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class ServiceDeskController extends Controller
{
    public function index(Request $request): Response
    {
        $tickets = ServiceTicket::with('assignee:id,name')->latest()->take(200)->get();
        $incidents = Incident::with('creator:id,name')->latest('occurred_at')->take(500)->get();

        $tsYear = $request->filled('ts_year') ? $request->integer('ts_year') : null;
        $tsStaff = $request->query('ts_staff') ?: null;
        $tsSource = $request->query('ts_source') ?: null;
        $timesheetsQuery = Timesheet::query()->with('user:id,name');
        if ($tsYear) {
            $timesheetsQuery->whereYear('work_date', $tsYear);
        } else {
            $timesheetsQuery->whereBetween('work_date', [now()->subDays(30)->toDateString(), now()->toDateString()]);
        }
        if (is_string($tsStaff) && $tsStaff !== '') {
            $timesheetsQuery->where('staff_name', $tsStaff);
        }
        if (in_array($tsSource, ['google_sheet', 'manual'], true)) {
            $timesheetsQuery->where('source', $tsSource);
        }
        $timesheets = $timesheetsQuery->latest('work_date')->limit(2500)->get();
        $timesheetSync = app(GoogleTimesheetSyncService::class)->lastSync();

        $resolved = $tickets->whereIn('status', ['resolved', 'closed']);
        $withinSla = $resolved->filter(fn ($t) => ! $t->sla_breached)->count();

        return Inertia::render('Im/ServiceDesk', [
            'tickets' => $tickets,
            'incidents' => $incidents,
            'timesheets' => $timesheets,
            'staff' => User::orderBy('name')->get(['id', 'name']),
            'timesheetStaff' => Timesheet::query()
                ->whereNotNull('staff_name')
                ->distinct()
                ->orderBy('staff_name')
                ->pluck('staff_name')
                ->values(),
            'filters' => [
                'tab' => $request->query('tab'),
                'ts_year' => $tsYear,
                'ts_staff' => $tsStaff,
                'ts_source' => in_array($tsSource, ['google_sheet', 'manual'], true) ? $tsSource : null,
            ],
            'timesheetSync' => $timesheetSync,
            'googleSheet' => [
                'url' => config('im_timesheet.google.sheet_url'),
                'configured' => filled(config('im_timesheet.google.sheet_id')),
            ],
            'summary' => [
                'open_tickets' => $tickets->whereIn('status', ['open', 'in_progress'])->count(),
                'resolved_tickets' => $resolved->count(),
                'sla_rate' => $resolved->count() ? round($withinSla / $resolved->count() * 100) : 100,
                'incidents' => $incidents->count(),
                'downtime' => (int) $incidents->sum('downtime_minutes'),
                'timesheet_hours' => round($timesheets->sum('hours'), 1),
            ],
        ]);
    }

    public function storeTicket(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'requester' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:255',
            'priority' => 'required|in:low,medium,high,critical',
            'sla_hours' => 'required|integer|min:1',
            'assigned_to' => 'nullable|exists:users,id',
        ]);
        $data['ticket_no'] = 'TK-'.date('ymd').'-'.str_pad((string) (ServiceTicket::whereDate('created_at', today())->count() + 1), 3, '0', STR_PAD_LEFT);
        $data['status'] = 'open';
        $data['opened_at'] = now();

        ServiceTicket::create($data);

        return back()->with('success', 'เปิด Ticket เรียบร้อย');
    }

    public function updateTicket(Request $request, ServiceTicket $ticket)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'requester' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:255',
            'priority' => 'required|in:low,medium,high,critical',
            'sla_hours' => 'required|integer|min:1',
            'status' => 'required|in:open,in_progress,resolved,closed',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        if (in_array($data['status'], ['resolved', 'closed']) && ! $ticket->resolved_at) {
            $data['resolved_at'] = now();
        }
        if (in_array($data['status'], ['open', 'in_progress'])) {
            $data['resolved_at'] = null;
        }

        $ticket->update($data);

        return back()->with('success', 'อัปเดต Ticket เรียบร้อย');
    }

    public function destroyTicket(ServiceTicket $ticket)
    {
        $ticket->delete();

        return back()->with('success', 'ลบ Ticket เรียบร้อย');
    }

    public function storeIncident(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'hait_category' => 'nullable|string|max:255',
            'occurred_at' => 'required|date',
            'downtime_minutes' => 'nullable|integer|min:0',
            'severity' => 'required|in:minor,major,critical',
            'impact' => 'nullable|string',
            'root_cause' => 'nullable|string',
            'problem_action' => 'nullable|string',
            'status' => 'nullable|in:open,investigating,resolved',
        ]);
        $data['incident_no'] = 'INC-'.date('ymd').'-'.str_pad((string) (Incident::whereDate('created_at', today())->count() + 1), 3, '0', STR_PAD_LEFT);
        $data['created_by'] = Auth::id();

        Incident::create($data);

        return back()->with('success', 'บันทึกอุบัติการณ์เรียบร้อย');
    }

    public function updateIncident(Request $request, Incident $incident)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'hait_category' => 'nullable|string|max:255',
            'occurred_at' => 'required|date',
            'downtime_minutes' => 'nullable|integer|min:0',
            'severity' => 'required|in:minor,major,critical',
            'impact' => 'nullable|string',
            'root_cause' => 'nullable|string',
            'problem_action' => 'nullable|string',
            'status' => 'required|in:open,investigating,resolved',
        ]);
        $incident->update($data);

        return back()->with('success', 'อัปเดตอุบัติการณ์เรียบร้อย');
    }

    public function destroyIncident(Incident $incident)
    {
        $incident->delete();

        return back()->with('success', 'ลบอุบัติการณ์เรียบร้อย');
    }

    public function storeTimesheet(Request $request)
    {
        $data = $request->validate([
            'user_id' => 'nullable|exists:users,id',
            'staff_name' => 'nullable|string|max:255',
            'work_date' => 'required|date',
            'hours' => 'required|numeric|min:0|max:24',
            'category' => 'nullable|string|max:255',
            'activity' => 'required|string|max:255',
            'note' => 'nullable|string',
        ]);
        if (empty($data['user_id']) && empty($data['staff_name'])) {
            $data['user_id'] = Auth::id();
            $data['staff_name'] = Auth::user()?->name;
        }
        $data['source'] = 'manual';

        Timesheet::create($data);

        return back()->with('success', 'บันทึกกิจกรรมเรียบร้อย');
    }

    public function destroyTimesheet(Timesheet $timesheet)
    {
        if ($timesheet->source === GoogleTimesheetSyncService::SOURCE) {
            return back()->with('error', 'รายการจาก Google Sheet ลบที่ชีตต้นทาง แล้วกดซิงก์อีกครั้ง');
        }
        $timesheet->delete();

        return back()->with('success', 'ลบรายการเรียบร้อย');
    }

    public function syncTimesheets(Request $request, GoogleTimesheetSyncService $sync)
    {
        try {
            $result = $sync->sync(prune: $request->boolean('prune'));
        } catch (RuntimeException $e) {
            $sync->rememberError($e->getMessage());

            return back()->with('error', $e->getMessage());
        } catch (\Throwable $e) {
            $sync->rememberError($e->getMessage());

            return back()->with('error', 'ซิงก์ Google Sheet ไม่สำเร็จ');
        }

        return back()->with('success', sprintf(
            'ซิงก์ Timesheet จาก Google Sheet แล้ว · นำเข้า %d · อัปเดต %d',
            $result['imported'],
            $result['updated']
        ));
    }
}
