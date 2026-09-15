<?php

namespace App\Http\Controllers\Im;

use App\Http\Controllers\Controller;
use App\Models\Im\Risk;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RiskController extends Controller
{
    public function index(Request $request): Response
    {
        $year = (int) $request->query('year', date('Y') + 543);

        $risks = Risk::query()
            ->where('year', $year)
            ->with('previous:id,code')
            ->orderByDesc('score')
            ->get();

        $strategies = ['avoid', 'reduce', 'share', 'accept'];
        $matrix = collect($strategies)->mapWithKeys(fn ($s) => [
            $s => $risks->where('strategy', $s)->values(),
        ]);

        $withResidual = $risks->filter(fn ($r) => $r->residual_score !== null);

        return Inertia::render('Im/Risk', [
            'year' => $year,
            'years' => Risk::query()->distinct()->orderByDesc('year')->pluck('year'),
            'risks' => $risks,
            'matrix' => $matrix,
            'summary' => [
                'total' => $risks->count(),
                'high' => $risks->where('score', '>=', 15)->count(),
                'medium' => $risks->whereBetween('score', [8, 14])->count(),
                'low' => $risks->where('score', '<', 8)->count(),
                'avg_before' => $withResidual->count() ? round($withResidual->avg('score'), 1) : 0,
                'avg_after' => $withResidual->count() ? round($withResidual->avg('residual_score'), 1) : 0,
                'improved' => $withResidual->filter(fn ($r) => $r->residual_score < $r->score)->count(),
            ],
            'comparison' => $withResidual->map(fn ($r) => [
                'code' => $r->code,
                'description' => $r->description,
                'before' => $r->score,
                'after' => $r->residual_score,
            ])->values(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validateRisk($request);

        // บล็อกไม่ให้นำอุบัติการณ์ที่เกิดขึ้นแล้วมาประเมินความเสี่ยง
        if (! empty($data['is_incident'])) {
            throw ValidationException::withMessages([
                'is_incident' => 'ไม่สามารถประเมินความเสี่ยงจากอุบัติการณ์ที่เกิดขึ้นแล้วได้ ระบบนี้ใช้วิเคราะห์โอกาสเกิดในอนาคตเท่านั้น',
            ]);
        }

        $data['score'] = $data['likelihood'] * $data['impact'];
        if (isset($data['residual_likelihood'], $data['residual_impact'])) {
            $data['residual_score'] = $data['residual_likelihood'] * $data['residual_impact'];
        }
        $data['code'] = $data['code'] ?: $this->nextCode((int) $data['year']);
        $data['created_by'] = Auth::id();

        Risk::create($data);

        return back()->with('success', 'บันทึกความเสี่ยงเรียบร้อย');
    }

    public function update(Request $request, Risk $risk)
    {
        $data = $this->validateRisk($request);
        $data['score'] = $data['likelihood'] * $data['impact'];
        $data['residual_score'] = (isset($data['residual_likelihood'], $data['residual_impact']))
            ? $data['residual_likelihood'] * $data['residual_impact']
            : null;

        $risk->update($data);

        return back()->with('success', 'อัปเดตความเสี่ยงเรียบร้อย');
    }

    public function destroy(Risk $risk)
    {
        $risk->delete();

        return back()->with('success', 'ลบความเสี่ยงเรียบร้อย');
    }

    private function nextCode(int $year): string
    {
        $seq = Risk::where('year', $year)->count() + 1;

        return sprintf('RISK-%d-%03d', $year, $seq);
    }

    private function validateRisk(Request $request): array
    {
        return $request->validate([
            'code' => 'nullable|string|max:32',
            'year' => 'required|integer|min:2500|max:2600',
            'category' => 'nullable|string|max:255',
            'description' => 'required|string',
            'is_incident' => 'boolean',
            'likelihood' => 'required|integer|min:1|max:5',
            'impact' => 'required|integer|min:1|max:5',
            'strategy' => 'nullable|in:avoid,reduce,share,accept',
            'mitigation' => 'nullable|string',
            'residual_likelihood' => 'nullable|integer|min:1|max:5',
            'residual_impact' => 'nullable|integer|min:1|max:5',
            'pdca_round' => 'nullable|integer|min:1|max:10',
            'previous_risk_id' => 'nullable|exists:im_risks,id',
            'owner' => 'nullable|string|max:255',
            'status' => 'nullable|in:open,mitigating,closed',
        ]);
    }
}
