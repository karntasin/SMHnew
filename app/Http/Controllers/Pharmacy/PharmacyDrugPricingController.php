<?php

namespace App\Http\Controllers\Pharmacy;

use App\Http\Controllers\Controller;
use App\Models\SettingApp;
use App\Services\Pharmacy\DrugPricingService;
use Box\Spout\Common\Entity\Style\Color;
use Box\Spout\Writer\Common\Creator\Style\StyleBuilder;
use Box\Spout\Writer\Common\Creator\WriterEntityFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PharmacyDrugPricingController extends Controller
{
    public function __construct(
        private DrugPricingService $pricingService,
    ) {}

    public function index(Request $request): Response
    {
        if (function_exists('set_time_limit')) {
            @set_time_limit(180);
        }

        $years = $this->pricingService->availableFiscalYears();
        $defaultYear = $years[1]['year'] ?? ($years[0]['year'] ?? 2567);

        $selectedYear = (int) $request->query('fy', $defaultYear);
        $discountPercent = max(0.0, min(100.0, (float) $request->query('discount', 0.0)));
        $discountScope = (string) $request->query('scope', 'all');
        $round = $request->boolean('round', true);

        $tiers = $this->pricingService->getTiers();
        $catalog = $this->pricingService->getDrugCatalogWithPricing($round);
        $projections = $this->pricingService->getFiscalYearProjections(
            $selectedYear,
            $discountPercent,
            $discountScope,
            $round,
        );

        $usageMap = $projections['dispensed_by_icode'] ?? [];
        $catalogItems = array_map(function ($item) use ($usageMap) {
            $icode = $item['icode'] ?? '';
            $u = $usageMap[$icode] ?? null;
            $item['fy_qty'] = (float) ($u['qty'] ?? 0);
            $item['fy_revenue_actual'] = (float) ($u['revenue'] ?? 0);
            $item['is_ed'] = ! ($item['is_ned'] ?? false);
            return $item;
        }, $catalog['items']);

        return Inertia::render('Pharmacy/DrugPricing/Index', [
            'available_years' => $years,
            'selected_year' => $selectedYear,
            'discount_percent' => $discountPercent,
            'discount_scope' => $discountScope,
            'round_price' => $round,
            'tiers' => $tiers,
            'catalog_summary' => $catalog['summary'],
            'catalog_items' => $catalogItems,
            'projections' => $projections,
        ]);
    }

    public function saveTiers(Request $request): RedirectResponse
    {
        $tiersData = $request->input('tiers', []);
        if (! is_array($tiersData) || empty($tiersData)) {
            return redirect()->back()->with('error', 'ข้อมูลเกณฑ์ช่วงราคาไม่ถูกต้อง');
        }

        $result = $this->pricingService->saveTiers($tiersData);

        return redirect()->back()->with('success', $result['message']);
    }

    public function resetTiers(): RedirectResponse
    {
        $result = $this->pricingService->resetToDefaultTiers();

        return redirect()->back()->with('success', $result['message']);
    }

    public function exportExcel(Request $request): StreamedResponse
    {
        if (function_exists('set_time_limit')) {
            @set_time_limit(300);
        }

        $years = $this->pricingService->availableFiscalYears();
        $defaultYear = $years[1]['year'] ?? ($years[0]['year'] ?? 2567);

        $selectedYear = (int) $request->query('fy', $defaultYear);
        $discountPercent = max(0.0, min(100.0, (float) $request->query('discount', 0.0)));
        $discountScope = (string) $request->query('scope', 'all');
        $round = $request->boolean('round', true);

        $tiers = $this->pricingService->getTiers();
        $projections = $this->pricingService->getFiscalYearProjections(
            $selectedYear,
            $discountPercent,
            $discountScope,
            $round,
        );
        $catalog = $this->pricingService->getDrugCatalogWithPricing($round);

        $fileName = 'drug_pricing_w111_fy'.$selectedYear.'_discount_'.$discountPercent.'pct.xlsx';

        return new StreamedResponse(function () use ($selectedYear, $discountPercent, $discountScope, $projections, $catalog, $tiers) {
            $writer = WriterEntityFactory::createXLSXWriter();
            $writer->openToFile('php://output');

            $titleStyle = (new StyleBuilder())->setFontBold()->setFontSize(14)->setFontColor(Color::WHITE)->setBackgroundColor('0F766E')->build();
            $headerStyle = (new StyleBuilder())->setFontBold()->setFontColor(Color::WHITE)->setBackgroundColor('134E4A')->build();
            $subHeaderStyle = (new StyleBuilder())->setFontBold()->setBackgroundColor('E6FFFA')->build();
            $zebraStyle = (new StyleBuilder())->setBackgroundColor('F8FAFC')->build();
            $footerStyle = (new StyleBuilder())->setFontBold()->setBackgroundColor('FEF3C7')->build();

            $setting = SettingApp::first();
            $hospitalName = $setting?->nama_app ?? 'โรงพยาบาลค่ายสุรสิงหนาท';

            // Sheet 1: สรุปประมาณการและจำลองส่วนลด
            $writer->getCurrentSheet()->setName('ประมาณการรายได้');
            $writer->addRow(WriterEntityFactory::createRowFromArray(['รายงานวิเคราะห์ราคายา เกณฑ์ระเบียบ ว.111 และประมาณการรายได้'], $titleStyle));
            $writer->addRow(WriterEntityFactory::createRowFromArray([$hospitalName]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['ปีงบประมาณที่นำมาประมาณการ', 'ปีงบประมาณ '.$selectedYear.' ('.$projections['fiscal_year']['start'].' ถึง '.$projections['fiscal_year']['end'].')']));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['การจำลองส่วนลด', $discountPercent.'% (ขอบเขต: '.$discountScope.')']));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['ออกรายงานเมื่อ', now()->timezone('Asia/Bangkok')->format('d/m/Y H:i:s')]));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['']));

            // Scenarios Summary Table
            $writer->addRow(WriterEntityFactory::createRowFromArray(['แบบจำลองรายได้ (Scenario)', 'รายได้รวม (บาท)', 'ต้นทุนรวม (บาท)', 'กำไรส่วนเกิน (บาท)', 'อัตรากำไร (%)'], $headerStyle));
            foreach ($projections['scenarios'] as $sc) {
                $writer->addRow(WriterEntityFactory::createRowFromArray([
                    $sc['label'],
                    $sc['revenue'],
                    $sc['cost'],
                    $sc['margin'],
                    $sc['margin_percent'].'%',
                ]));
            }

            $writer->addRow(WriterEntityFactory::createRowFromArray(['']));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['ผลกระทบต่อรายรับโรงพยาบาล (Revenue Impact)'], $subHeaderStyle));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['ส่วนต่างเทียบกับราคาขายปัจจุบัน', $projections['impact']['delta_vs_current'].' บาท ('.$projections['impact']['delta_percent_vs_current'].'%)']));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['ส่วนต่างเทียบกับรายได้จริงในอดีต', $projections['impact']['delta_vs_actual'].' บาท ('.$projections['impact']['delta_percent_vs_actual'].'%)']));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['ส่วนต่างเทียบกับเกณฑ์ ว.111', $projections['impact']['delta_vs_tier'].' บาท ('.$projections['impact']['delta_percent_vs_tier'].'%)']));
            $writer->addRow(WriterEntityFactory::createRowFromArray(['ผลกระทบต่อกำไรส่วนเกิน', $projections['impact']['margin_impact'].' บาท']));

            // Sheet 2: ยาที่ได้รับผลกระทบสูงสุด
            $writer->addNewSheetAndMakeItCurrent();
            $writer->getCurrentSheet()->setName('Top ยาที่ได้รับผลกระทบ');
            $writer->addRow(WriterEntityFactory::createRowFromArray(['รายการยาที่ได้รับผลกระทบสูงสุดจากการลดราคา (Top Affected Drugs)'], $titleStyle));
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                'รหัสยา', 'ชื่อยา', 'ความแรง', 'หน่วย', 'บัญชียา', 'ราคาทุน (บาท)', 'ราคาขายปัจจุบัน (บาท)', 'ราคาตามเกณฑ์ ว.111 (บาท)', 'ราคาหลังลด (บาท)', 'จำนวนจ่ายปีงบ', 'รายได้ปัจจุบัน (บาท)', 'รายได้หลังลด (บาท)', 'ผลกระทบส่วนต่าง (บาท)',
            ], $headerStyle));

            foreach ($projections['top_affected_drugs'] as $idx => $row) {
                $style = $idx % 2 === 1 ? $zebraStyle : null;
                $writer->addRow(WriterEntityFactory::createRowFromArray([
                    $row['icode'],
                    $row['name'],
                    $row['strength'],
                    $row['units'],
                    $row['drugaccount'],
                    $row['unitcost'],
                    $row['unitprice'],
                    $row['tier_price'],
                    $row['discounted_price'],
                    $row['qty'],
                    $row['current_revenue'],
                    $row['discounted_revenue'],
                    $row['delta_vs_current'],
                ], $style));
            }

            // Sheet 3: รายการยาทั้งหมด
            $writer->addNewSheetAndMakeItCurrent();
            $writer->getCurrentSheet()->setName('แค็ตตาล็อกยาทั้งหมด');
            $writer->addRow(WriterEntityFactory::createRowFromArray(['แค็ตตาล็อกยาทั้งหมดและการวิเคราะห์ราคาตามเกณฑ์ ว.111'], $titleStyle));
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                'รหัสยา', 'ชื่อยา', 'ความแรง', 'หน่วย', 'บัญชี', 'ราคาทุน', 'ราคาขายปัจจุบัน', 'ราคาตามเกณฑ์ ว.111', 'ส่วนต่าง vs เกณฑ์', 'อัตรากำไร Markup (%)', 'สถานะเทียบเกณฑ์',
            ], $headerStyle));

            foreach ($catalog['items'] as $idx => $item) {
                $style = $idx % 2 === 1 ? $zebraStyle : null;
                $statusLabel = match ($item['status']) {
                    'over' => 'สูงกว่าเกณฑ์',
                    'under' => 'ต่ำกว่าเกณฑ์',
                    'match' => 'ตามเกณฑ์',
                    default => 'ไม่มีราคาทุน',
                };

                $writer->addRow(WriterEntityFactory::createRowFromArray([
                    $item['icode'],
                    $item['name'],
                    $item['strength'],
                    $item['units'],
                    $item['drugaccount'],
                    $item['unitcost'],
                    $item['unitprice'],
                    $item['tier_price'],
                    $item['diff_vs_tier'],
                    $item['markup'].'%',
                    $statusLabel,
                ], $style));
            }

            // Sheet 4: เกณฑ์ช่วงราคา ว.111
            $writer->addNewSheetAndMakeItCurrent();
            $writer->getCurrentSheet()->setName('เกณฑ์ช่วงราคา ว.111');
            $writer->addRow(WriterEntityFactory::createRowFromArray(['ตารางเกณฑ์ช่วงราคายาตามระเบียบ ว.111 / ว.177'], $titleStyle));
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                'ลำดับ', 'ชื่อช่วงราคา', 'ราคาทุนต่ำสุด (บาท)', 'ราคาทุนสูงสุด (บาท)', 'ประเภทการคิดราคา', 'ราคาขายตั้งต้น (บาท)', 'จุดตัดส่วนเกิน (บาท)', 'เปอร์เซ็นต์ส่วนเกิน (%)',
            ], $headerStyle));

            foreach ($tiers as $tier) {
                $writer->addRow(WriterEntityFactory::createRowFromArray([
                    $tier->order,
                    $tier->name,
                    $tier->min_cost,
                    $tier->max_cost ?? 'ไม่จำกัด',
                    $tier->calc_type,
                    $tier->base_price,
                    $tier->base_cost,
                    $tier->multiplier_percent,
                ]));
            }

            $writer->close();
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$fileName.'"',
        ]);
    }

    public function drugDetail(Request $request): JsonResponse
    {
        $icode = (string) $request->query('icode', '');
        if ($icode === '') {
            return response()->json(['error' => 'กรุณาระบุรหัสยา (icode)'], 400);
        }

        $years = $this->pricingService->availableFiscalYears();
        $defaultYear = $years[1]['year'] ?? ($years[0]['year'] ?? 2567);

        $fiscalYear = (int) $request->query('fy', $defaultYear);
        $discountPercent = max(0.0, min(100.0, (float) $request->query('discount', 0.0)));
        $discountScope = (string) $request->query('scope', 'all');
        $round = $request->boolean('round', true);

        $detail = $this->pricingService->getDrugDetailBreakdown(
            $icode,
            $fiscalYear,
            $discountPercent,
            $discountScope,
            $round,
        );

        if (isset($detail['error'])) {
            return response()->json($detail, 404);
        }

        return response()->json($detail);
    }
}
