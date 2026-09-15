<?php

namespace App\Http\Controllers;

use App\Models\Finance\StmImport;
use App\Services\Finance\StmFileImportService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class FinanceStmImportController extends Controller
{
    public function __construct(
        private readonly StmFileImportService $importer,
    ) {}

    public function index(): Response
    {
        $imports = StmImport::query()
            ->with('importer:id,name')
            ->latest()
            ->paginate(20)
            ->through(fn (StmImport $import) => $this->serializeImport($import));

        return Inertia::render('Finance/CgdClaim/StmImport', [
            'imports' => $imports,
            'filenamePrefix' => \App\Services\Finance\CgdClaimFilenameGuard::stmPrefix(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'stm_files' => ['required', 'array', 'min:1', 'max:20'],
            'stm_files.*' => ['file', 'max:51200'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $created = 0;
        $updated = 0;
        $failures = [];

        foreach ($data['stm_files'] as $file) {
            try {
                $result = $this->importer->import($file, $data['notes'] ?? null);
                if ($result['updated']) {
                    $updated++;
                } else {
                    $created++;
                }
            } catch (ValidationException $e) {
                $msg = collect($e->errors())->flatten()->first() ?: $e->getMessage();
                $failures[] = ($file->getClientOriginalName() ?: 'ไฟล์').' — '.$msg;
            } catch (\Throwable $e) {
                $failures[] = ($file->getClientOriginalName() ?: 'ไฟล์').' — '.$e->getMessage();
            }
        }

        $message = "นำเข้า STM เสร็จ · ใหม่ {$created} · อัปเดต {$updated}";
        if ($failures !== []) {
            $message .= ' · ไม่สำเร็จ '.count($failures).' ไฟล์';
        }

        return redirect()
            ->route('finance.cgd.stm.index')
            ->with('success', $message)
            ->with('import_failures', $failures);
    }

    public function show(StmImport $stm): Response
    {
        $stm->load('importer:id,name');

        $summaries = $stm->summaries()
            ->orderBy('rep_no')
            ->get()
            ->map(fn ($row) => [
                'id' => $row->id,
                'rep_no' => $row->rep_no,
                'period' => $row->period,
                'hcode' => $row->hcode,
                'count_total' => $row->count_total,
                'count_pass' => $row->count_pass,
                'count_fail' => $row->count_fail,
                'amount_claim' => (float) $row->amount_claim,
                'amount_act' => (float) $row->amount_act,
                'amount_room' => (float) $row->amount_room,
                'amount_organ' => (float) $row->amount_organ,
                'amount_drug' => (float) $row->amount_drug,
                'amount_treat' => (float) $row->amount_treat,
                'amount_transport' => (float) $row->amount_transport,
                'amount_wait' => (float) $row->amount_wait,
                'amount_other' => (float) $row->amount_other,
                'amount_paid_total' => (float) $row->amount_paid_total,
            ]);

        $details = $stm->details()
            ->orderBy('rep_no')
            ->orderBy('row_no')
            ->paginate(50)
            ->withQueryString()
            ->through(fn ($row) => [
                'id' => $row->id,
                'rep_no' => $row->rep_no,
                'row_no' => $row->row_no,
                'hn' => $row->hn,
                'pid' => $row->pid,
                'seq_no' => $row->seq_no,
                'patient_name' => $row->patient_name,
                'visit_date' => optional($row->visit_date)->format('Y-m-d'),
                'amount_claim' => (float) $row->amount_claim,
                'amount_approved' => (float) $row->amount_approved,
                'amount_treat' => (float) $row->amount_treat,
                'amount_drug' => (float) $row->amount_drug,
            ]);

        return Inertia::render('Finance/CgdClaim/StmShow', [
            'import' => $this->serializeImport($stm, true),
            'summaries' => $summaries,
            'details' => $details,
        ]);
    }

    public function destroy(StmImport $stm)
    {
        if ($stm->stored_path) {
            \Illuminate\Support\Facades\Storage::disk('local')->delete($stm->stored_path);
        }
        $stm->delete();

        return redirect()
            ->route('finance.cgd.stm.index')
            ->with('success', 'ลบชุด STM '.$stm->claim_submission_no.' แล้ว');
    }

    private function serializeImport(StmImport $import, bool $full = false): array
    {
        $data = [
            'id' => $import->id,
            'claim_submission_no' => $import->claim_submission_no,
            'filename' => $import->filename,
            'hcode' => $import->hcode,
            'hospital_name' => $import->hospital_name,
            'province' => $import->province,
            'channel' => $import->channel,
            'period_label' => $import->period_label,
            'reported_at' => optional($import->reported_at)->format('d/m/Y H:i'),
            'detail_count' => $import->detail_count,
            'summary_count' => $import->summary_count,
            'rep_count' => $import->rep_count,
            'total_claim' => (float) $import->total_claim,
            'total_approved' => (float) $import->total_approved,
            'visit_date_min' => optional($import->visit_date_min)->format('Y-m-d'),
            'visit_date_max' => optional($import->visit_date_max)->format('Y-m-d'),
            'sheet_names' => $import->sheet_names ?: [],
            'imported_by' => $import->importer?->name,
            'created_at' => optional($import->created_at)->format('d/m/Y H:i'),
            'updated_at' => optional($import->updated_at)->format('d/m/Y H:i'),
        ];

        if ($full) {
            $data['notes'] = $import->notes;
        }

        return $data;
    }
}
