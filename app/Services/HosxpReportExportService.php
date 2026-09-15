<?php

namespace App\Services;

use Box\Spout\Common\Entity\Style\Color;
use Box\Spout\Writer\Common\Creator\Style\StyleBuilder;
use Box\Spout\Writer\Common\Creator\WriterEntityFactory;

class HosxpReportExportService
{
    public function __construct(
        private HosxpReportService $reports,
        private ThaiPdfService $pdf,
    ) {}

    /** @return array{path: string, row_count: int, format: string} */
    public function exportToStorage(string $reportId, array $params, string $format, string $directory): array
    {
        if (! is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        $ext = $format === 'pdf' ? 'pdf' : 'xlsx';
        $fileName = $reportId.'_'.date('Ymd_His').'.'.$ext;
        $path = rtrim($directory, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.$fileName;

        if ($format === 'pdf') {
            $rowCount = $this->writePdf($reportId, $params, $path);

            return ['path' => $path, 'row_count' => $rowCount, 'format' => 'pdf'];
        }

        $rowCount = $this->writeExcel($reportId, $params, $path);

        return ['path' => $path, 'row_count' => $rowCount, 'format' => 'xlsx'];
    }

    private function writeExcel(string $reportId, array $params, string $path): int
    {
        $writer = WriterEntityFactory::createXLSXWriter();
        $writer->openToFile($path);

        $titleStyle = (new StyleBuilder())->setFontBold()->setFontSize(12)->build();
        $headerStyle = (new StyleBuilder())->setFontBold()->setBackgroundColor(Color::rgb(219, 234, 254))->build();

        $writer->addRow(WriterEntityFactory::createRowFromArray(['รายงาน HOSxP: '.$this->reports->reportTitle($reportId)], $titleStyle));

        $isHeader = true;
        $rowCount = 0;
        foreach ($this->reports->exportRows($reportId, $params) as $row) {
            if ($isHeader) {
                $writer->addRow(WriterEntityFactory::createRowFromArray($row, $headerStyle));
                $isHeader = false;

                continue;
            }
            $writer->addRow(WriterEntityFactory::createRowFromArray($row));
            $rowCount++;
        }

        $writer->close();

        return $rowCount;
    }

    private function writePdf(string $reportId, array $params, string $path): int
    {
        $payload = $this->reports->exportPayload($reportId, $params, 500);
        [$fontRegularUri, $fontBoldUri] = $this->pdf->fontUris();

        $html = view('hosxp.report-pdf', [
            'title' => $this->reports->reportTitle($reportId),
            'headers' => $payload['headers'],
            'rows' => $payload['rows'],
            'startDate' => $params['start_date'] ?? '-',
            'endDate' => $params['end_date'] ?? '-',
            'total' => $payload['total'],
            'truncated' => $payload['truncated'],
            'generatedAt' => now()->timezone('Asia/Bangkok')->format('d/m/Y H:i:s'),
            'fontRegularUri' => $fontRegularUri,
            'fontBoldUri' => $fontBoldUri,
        ])->render();

        file_put_contents($path, $this->pdf->render($html));

        return count($payload['rows']);
    }
}
